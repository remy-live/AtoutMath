<?php
declare(strict_types=1);

/**
 * Projections serveur — miroir de js/core/projections.js et js/core/mastery.js.
 *
 * Le serveur recalcule score, maîtrise et bilans à partir des mêmes événements
 * et avec les mêmes règles que le client. Il ne stocke ni ne fait confiance à
 * une valeur agrégée transmise par le navigateur : une note trafiquée côté
 * client n'a donc aucun effet.
 *
 * Toute modification d'une règle ici doit être répercutée dans le module JS
 * correspondant (et inversement) ; les tests JS servent de référence.
 */

const HALF_LIFE_DAYS = 21;
const RELIABLE_MIN_ATTEMPTS = 5;
const LEITNER_INTERVALS = [0, 1, 3, 7, 16, 35];
const DAY_MS = 86400000;

function attemptsOf(array $events): array
{
    $out = [];
    foreach ($events as $e) {
        if (($e['type'] ?? '') === 'attempt') {
            $p = $e['payload'];
            $p['ts'] = (int) $e['ts'];
            $out[] = $p;
        }
    }
    usort($out, fn($a, $b) => $a['ts'] <=> $b['ts']);
    return $out;
}

function scoreOf(array $events): int
{
    $score = 0;
    foreach ($events as $e) {
        $score += (int) ($e['payload']['points'] ?? 0);
    }
    return $score;
}

function timeOf(array $events): int
{
    $total = 0;
    foreach ($events as $e) {
        if (($e['type'] ?? '') === 'time_spent') {
            $total += (int) ($e['payload']['seconds'] ?? 0);
        }
    }
    return $total;
}

function levelFor(float $mastery): array
{
    if ($mastery >= 0.9) return ['key' => 'E', 'label' => 'Expert'];
    if ($mastery >= 0.7) return ['key' => 'A', 'label' => 'Acquis'];
    if ($mastery >= 0.4) return ['key' => 'EC', 'label' => "En cours d'acquisition"];
    return ['key' => 'NA', 'label' => 'Non acquis'];
}

/**
 * Maîtrise par compétence, pondérée par l'ancienneté (demi-vie de 21 jours) :
 * une notion non revue depuis longtemps compte moins qu'une réponse récente.
 */
function masteryOf(array $attempts, ?int $now = null): array
{
    $now = $now ?? (int) (microtime(true) * 1000);
    $map = [];

    foreach ($attempts as $a) {
        $skill = $a['skillId'] ?? null;
        if (!$skill) {
            continue;
        }
        if (!isset($map[$skill])) {
            $map[$skill] = [
                'skillId' => $skill, 'attempts' => 0, 'correct' => 0,
                'wSum' => 0.0, 'wCorrect' => 0.0, 'box' => 0,
                'lastTs' => (int) $a['ts'], 'msSum' => 0, 'msCount' => 0,
            ];
        }
        $e = &$map[$skill];
        $w = pow(0.5, ($now - (int) $a['ts']) / (HALF_LIFE_DAYS * DAY_MS));
        $correct = !empty($a['correct']);
        $firstTry = (int) ($a['attemptIndex'] ?? 0) === 0;

        $e['attempts']++;
        $e['wSum'] += $w;
        if ($correct) {
            $e['correct']++;
            $e['wCorrect'] += $w * ($firstTry ? 1.0 : 0.5);
            if ($firstTry) {
                $e['box'] = min(count(LEITNER_INTERVALS) - 1, $e['box'] + 1);
            }
        } else {
            $e['box'] = max(0, $e['box'] - 1);
        }
        $e['lastTs'] = max($e['lastTs'], (int) $a['ts']);
        if (!empty($a['msElapsed'])) {
            $e['msSum'] += (int) $a['msElapsed'];
            $e['msCount']++;
        }
        unset($e);
    }

    foreach ($map as $skill => $e) {
        $weighted = $e['wSum'] > 0 ? $e['wCorrect'] / $e['wSum'] : 0.0;
        $confidence = min(1.0, $e['wSum'] / RELIABLE_MIN_ATTEMPTS);
        $mastery = $weighted * $confidence;
        $map[$skill]['successRate'] = $e['attempts'] > 0 ? $e['correct'] / $e['attempts'] : 0.0;
        $map[$skill]['mastery'] = round($mastery, 4);
        $map[$skill]['reliable'] = $e['wSum'] >= RELIABLE_MIN_ATTEMPTS;
        $map[$skill]['level'] = levelFor($mastery);
        $map[$skill]['avgMs'] = $e['msCount'] > 0 ? (int) round($e['msSum'] / $e['msCount']) : 0;
        $map[$skill]['dueAt'] = $e['lastTs'] + LEITNER_INTERVALS[$e['box']] * DAY_MS;
        unset($map[$skill]['wSum'], $map[$skill]['wCorrect'], $map[$skill]['msSum'], $map[$skill]['msCount']);
    }

    uasort($map, fn($a, $b) => $a['mastery'] <=> $b['mastery']);
    return $map;
}

/** Regroupe les événements en sessions de travail (runs). */
function runsOf(array $events): array
{
    $runs = [];
    $ensure = function (string $runId) use (&$runs): void {
        if (!isset($runs[$runId])) {
            $runs[$runId] = [
                'runId' => $runId, 'pathId' => null, 'pathName' => '', 'mode' => 'entrainement',
                'policy' => null, 'startedAt' => null, 'finishedAt' => null,
                'aborted' => false, 'attempts' => [], 'steps' => [],
            ];
        }
    };

    foreach ($events as $e) {
        $p = $e['payload'] ?? [];
        $runId = $p['runId'] ?? null;
        switch ($e['type']) {
            case 'run_started':
                if (!$runId) break;
                $ensure($runId);
                $runs[$runId]['pathId']   = $p['pathId'] ?? null;
                $runs[$runId]['pathName'] = $p['pathName'] ?? '';
                $runs[$runId]['mode']     = $p['mode'] ?? 'entrainement';
                $runs[$runId]['policy']   = $p['policy'] ?? null;
                $runs[$runId]['startedAt'] = (int) $e['ts'];
                break;
            case 'run_finished':
                if (!$runId) break;
                $ensure($runId);
                $runs[$runId]['finishedAt'] = (int) $e['ts'];
                $runs[$runId]['aborted'] = !empty($p['aborted']);
                break;
            case 'attempt':
                if (!$runId) break;
                $ensure($runId);
                $p['ts'] = (int) $e['ts'];
                $runs[$runId]['attempts'][] = $p;
                break;
            case 'step_completed':
                if (!$runId) break;
                $ensure($runId);
                $runs[$runId]['steps'][] = $p;
                break;
        }
    }

    uasort($runs, fn($a, $b) => ($b['startedAt'] ?? 0) <=> ($a['startedAt'] ?? 0));
    return array_values($runs);
}

/** Erreurs encore ouvertes (mêmes règles que projections.computeErrors). */
function openErrorsOf(array $events): array
{
    $resolved = [];
    $dismissed = [];
    foreach ($events as $e) {
        if ($e['type'] === 'error_resolved')  $resolved[$e['payload']['errorKey'] ?? ''] = true;
        if ($e['type'] === 'error_dismissed') $dismissed[$e['payload']['errorKey'] ?? ''] = true;
    }

    $map = [];
    foreach ($events as $e) {
        if ($e['type'] !== 'attempt') continue;
        $p = $e['payload'];
        $key = ($p['exerciseId'] ?? '?') . '|' . ($p['itemSeed'] ?? ($p['questionText'] ?? '?'));
        if (empty($p['correct'])) {
            if (isset($map[$key])) {
                $map[$key]['count']++;
                $map[$key]['lastTs'] = (int) $e['ts'];
                $map[$key]['corrected'] = false;
            } else {
                $map[$key] = [
                    'key' => $key,
                    'skillId' => $p['skillId'] ?? null,
                    'questionText' => $p['questionText'] ?? '',
                    'given' => $p['given'] ?? null,
                    'expected' => $p['expected'] ?? null,
                    'misconception' => $p['misconception'] ?? null,
                    'count' => 1,
                    'lastTs' => (int) $e['ts'],
                    'corrected' => false,
                ];
            }
        } elseif (isset($map[$key]) && (int) ($p['attemptIndex'] ?? 0) === 0) {
            $map[$key]['corrected'] = true;
        }
    }

    $out = [];
    foreach ($map as $key => $err) {
        if (isset($dismissed[$key])) continue;
        if ($err['corrected'] || isset($resolved[$key])) continue;
        $out[] = $err;
    }
    usort($out, fn($a, $b) => $b['lastTs'] <=> $a['lastTs']);
    return $out;
}
