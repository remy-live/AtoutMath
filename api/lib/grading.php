<?php
declare(strict_types=1);

/**
 * Notation serveur — miroir de js/core/grading.js.
 *
 * La note d'un élève n'est jamais celle envoyée par son navigateur : elle est
 * recalculée ici, à partir des tentatives enregistrées. C'est la seule façon
 * d'avoir des notes fiables sans faire confiance au client.
 */

require_once __DIR__ . '/projections.php';

function defaultPolicyArray(): array
{
    return [
        'mode' => 'entrainement',
        'maxAttemptsPerItem' => 2,
        'hints' => true,
        'grading' => null,
    ];
}

function gradeRun(array $run, ?array $policyOverride = null): array
{
    $policy  = $policyOverride ?? $run['policy'] ?? defaultPolicyArray();
    $grading = $policy['grading'] ?? null;
    $rule    = $grading['rule'] ?? 'firstTry';

    // Regroupement par question : plusieurs tentatives sur le même item ne
    // comptent que pour une question.
    $items = [];
    foreach ($run['attempts'] as $a) {
        $key = $a['itemSeed'] ?? (($a['stepId'] ?? '') . '|' . ($a['questionText'] ?? ''));
        if (!isset($items[$key])) {
            $items[$key] = [
                'stepId' => $a['stepId'] ?? null,
                'skillId' => $a['skillId'] ?? null,
                'questionText' => $a['questionText'] ?? '',
                'expected' => $a['expected'] ?? null,
                'given' => $a['given'] ?? null,
                'misconception' => null,
                'tries' => 0, 'hintsUsed' => 0, 'msElapsed' => 0,
                'solved' => false, 'firstTry' => false,
            ];
        }
        $it = &$items[$key];
        $it['tries']++;
        $it['hintsUsed'] = max($it['hintsUsed'], (int) ($a['hintsUsed'] ?? 0));
        $it['msElapsed'] += (int) ($a['msElapsed'] ?? 0);
        if (!empty($a['correct'])) {
            $it['solved'] = true;
            if ((int) ($a['attemptIndex'] ?? 0) === 0) $it['firstTry'] = true;
        } else {
            $it['given'] = $a['given'] ?? $it['given'];
            if (!empty($a['misconception'])) $it['misconception'] = $a['misconception'];
        }
        unset($it);
    }

    $credit = function (array $it) use ($rule, $grading): float {
        if (!$it['solved']) return 0.0;
        if ($rule === 'ratio') return 1.0;
        if ($rule === 'ponderee') {
            $pen = $grading['penalties'] ?? [];
            $retry = max(0, $it['tries'] - 1) * (float) ($pen['retry'] ?? 0);
            $hint  = $it['hintsUsed'] * (float) ($pen['hint'] ?? 0);
            return max(0.0, 1.0 - $retry - $hint);
        }
        return ($it['firstTry'] && $it['hintsUsed'] === 0) ? 1.0 : 0.0;
    };

    // Agrégation par étape, pondérée.
    $stepWeights = $grading['stepWeights'] ?? [];
    $byStep = [];
    foreach ($items as $it) {
        $sid = $it['stepId'] ?? '_';
        $byStep[$sid][] = $it;
    }

    $parEtape = [];
    foreach ($byStep as $sid => $list) {
        $sum = 0.0;
        foreach ($list as $it) $sum += $credit($it);
        $weight = $stepWeights[$sid] ?? 1;
        foreach ($run['steps'] as $s) {
            if (($s['stepId'] ?? null) === $sid && isset($s['weight'])) $weight = (int) $s['weight'];
        }
        $parEtape[] = [
            'stepId' => $sid,
            'weight' => $weight,
            'questions' => count($list),
            'reussies' => count(array_filter($list, fn($i) => $i['solved'])),
            'credit' => $sum,
            'ratio' => count($list) ? $sum / count($list) : 0.0,
        ];
    }

    $totalWeight = array_sum(array_column($parEtape, 'weight')) ?: 1;
    $ratioPondere = 0.0;
    foreach ($parEtape as $e) $ratioPondere += $e['weight'] * $e['ratio'];
    $ratioPondere /= $totalWeight;

    // Bilan par compétence.
    $bySkill = [];
    foreach ($items as $it) {
        if (!$it['skillId']) continue;
        $bySkill[$it['skillId']] ??= ['skillId' => $it['skillId'], 'questions' => 0, 'credit' => 0.0, 'reussies' => 0];
        $bySkill[$it['skillId']]['questions']++;
        $bySkill[$it['skillId']]['credit'] += $credit($it);
        if ($it['solved']) $bySkill[$it['skillId']]['reussies']++;
    }
    $parCompetence = [];
    foreach ($bySkill as $s) {
        $taux = $s['questions'] ? $s['credit'] / $s['questions'] : 0.0;
        $parCompetence[] = $s + ['taux' => round($taux, 4), 'niveau' => levelFor($taux)];
    }
    usort($parCompetence, fn($a, $b) => $a['taux'] <=> $b['taux']);

    // Note.
    $note = null;
    $sur = null;
    if ($grading && !empty($grading['scale'])) {
        $sur = (int) $grading['scale'];
        $pas = (float) ($grading['arrondi'] ?? 0.5);
        $note = round(($ratioPondere * $sur) / $pas) * $pas;
        $note = max(0, min($sur, round($note, 2)));
    }

    $total = count($items);
    $reussies = count(array_filter($items, fn($i) => $i['solved']));

    return [
        'runId' => $run['runId'],
        'pathId' => $run['pathId'],
        'pathName' => $run['pathName'],
        'mode' => $policy['mode'] ?? 'entrainement',
        'note' => $note,
        'sur' => $sur,
        'regle' => $grading ? $rule : null,
        'ratio' => $total ? $reussies / $total : 0.0,
        'ratioPondere' => round($ratioPondere, 4),
        'totalQuestions' => $total,
        'totalReussies' => $reussies,
        'premierEssai' => count(array_filter($items, fn($i) => $i['firstTry'])),
        'tempsTotal' => (int) round(array_sum(array_column($items, 'msElapsed')) / 1000),
        'parEtape' => $parEtape,
        'parCompetence' => $parCompetence,
        'aRetravailler' => array_values(array_map(
            fn($i) => [
                'questionText' => $i['questionText'],
                'attendu' => $i['expected'],
                'donne' => $i['given'],
                'skillId' => $i['skillId'],
                'diagnostic' => $i['misconception'],
                'essais' => $i['tries'],
                'resolue' => $i['solved'],
            ],
            array_filter($items, fn($i) => !$i['solved'] || !$i['firstTry'])
        )),
    ];
}
