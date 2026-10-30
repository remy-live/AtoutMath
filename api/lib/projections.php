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
                'plan' => [], 'stepCount' => 0, 'bac' => false, 'dejaFaites' => [],
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
                $runs[$runId]['bac']       = !empty($p['bac']);
                $runs[$runId]['plan']      = is_array($p['plan'] ?? null) ? $p['plan'] : [];
                $runs[$runId]['stepCount'] = (int) ($p['stepCount'] ?? count($runs[$runId]['plan']));
                $runs[$runId]['dejaFaites'] = is_array($p['dejaFaites'] ?? null)
                    ? $p['dejaFaites'] : [];
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
                // L'HORODATAGE VOYAGE AVEC LA CLÔTURE, comme du côté JS
                // (`computeRuns` l'ajoute déjà). Sans lui, on ne peut pas
                // répondre à « cette étape a-t-elle été refermée APRÈS cette
                // tentative ? » — la question dont dépend `etapeEnTrain`.
                $p['ts'] = (int) $e['ts'];
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

/** LES CLÔTURES, UNE PAR ÉTAPE — miroir de `closesUneFois` (JS). */
function closesUneFoisPhp(array $finies): array
{
    $parId = [];
    $sansId = [];
    foreach ($finies as $s) {
        if (empty($s['stepId'])) { $sansId[] = $s; continue; }
        // LA DERNIÈRE CLÔTURE GAGNE, SANS CHANGER DE PLACE : affecter une clé
        // qui existe déjà ne la déplace pas dans un tableau PHP, exactement
        // comme `Map.set` en JS. `detailEtapes` garde donc son ordre.
        $parId[$s['stepId']] = $s;
    }
    return array_merge(array_values($parId), $sansId);
}

/**
 * L'ÉTAPE OÙ L'ÉLÈVE EST VRAIMENT — miroir de `etapeEnTrain` (JS).
 *
 * @return array{rang:int, entree:array, depuis:int, nomme:bool}|null
 */
function etapeEnTrainPhp(array $plan, array $finies, array $attempts, int $faites): ?array
{
    for ($i = count($attempts) - 1; $i >= 0; $i--) {
        $sid = $attempts[$i]['stepId'] ?? null;
        if (!$sid) continue;
        $ts = (int) ($attempts[$i]['ts'] ?? 0);
        $clotures = [];
        foreach ($finies as $s) if (($s['stepId'] ?? null) === $sid) $clotures[] = $s;
        $refermee = false;
        foreach ($clotures as $s) if ((int) ($s['ts'] ?? 0) >= $ts) { $refermee = true; break; }
        if ($refermee) break;
        $rang = -1;
        foreach ($plan as $r => $e) {
            if (($e['stepId'] ?? null) === $sid) { $rang = $r; break; }
        }
        if ($rang < 0) break;   // un plan devine n'a pas d'identifiants
        $depuis = 0;
        foreach ($clotures as $s) $depuis = max($depuis, (int) ($s['ts'] ?? 0));
        return ['rang' => $rang, 'entree' => $plan[$rang], 'depuis' => $depuis, 'nomme' => true];
    }
    $e = $plan[$faites] ?? null;
    return $e === null ? null
        : ['rang' => $faites, 'entree' => $e, 'depuis' => 0, 'nomme' => false];
}

/**
 * OÙ EN EST CE RUN — miroir exact de js/core/avancement.js.
 *
 * Rémy : « surtout il faut que la séance soit facilement visible l'avancement ».
 * Le professeur lit cette valeur-ci dans Le direct pendant que l'élève lit la
 * sienne au-dessus de sa question ; les deux doivent dire la même chose, donc
 * elles se calculent avec les mêmes règles. Toute modification ici se
 * répercute dans le module JS, et inversement — les essais JS font foi.
 */
function avancementDeRun(?array $run, ?int $maintenant = null): ?array
{
    if (!$run) return null;
    $maintenant = $maintenant ?? time();

    // LES CLÔTURES D'ABORD, DÉDOUBLONNÉES : le plan deviné se compte dessus.
    //
    // RÉMY : « quand on a fait 12/24 et bien la barre de progression qui est
    // dans les barres en haut est pleine alors qu'elle devrait être à la
    // moitié ». Une étape refaite — « Refaire pour m'améliorer » — écrivait une
    // SECONDE clôture, et tout ce qui se repérait au compte désignait l'étape
    // d'après. Mesuré par `tools/barreDeLEtape.mjs` ; le raisonnement complet
    // est dans js/core/avancement.js, dont ceci est le miroir.
    $finies = closesUneFoisPhp($run['steps'] ?? []);

    $plan = is_array($run['plan'] ?? null) ? $run['plan'] : [];
    if (!$plan) {
        // Un run amputé de son `run_started` — la lecture du serveur est bornée
        // à deux cents événements. On ne sait que le nombre d'étapes closes, et
        // l'on en ajoute une tant que le parcours n'est pas terminé : sans
        // cela un élève au milieu de son travail afficherait une barre PLEINE.
        $closes  = count($finies);
        $combien = (int) ($run['stepCount'] ?? 0) ?: $closes;
        if (empty($run['finishedAt'])) $combien = max($combien, $closes + 1);
        $plan = array_fill(0, max(0, $combien), ['questions' => 0, 'requis' => 0, 'titre' => '']);
    }
    // CE QUI ÉTAIT DÉJÀ FAIT AVANT CE RUN COMPTE AUSSI — voir le module JS.
    // Rémy : « j'ai Étape 1/12 alors que j'avais fait 3 exercices ». Reprendre
    // une séance ouvre un run NEUF ; sans son point de départ, cet écran-ci
    // repartait de zéro alors que l'élève reprenait à la bonne étape.
    $closIci = [];
    foreach ($finies as $s) if (!empty($s['stepId'])) $closIci[$s['stepId']] = true;
    $avant = [];
    foreach (array_unique($run['dejaFaites'] ?? []) as $id) {
        if ($id && !isset($closIci[$id])) $avant[] = $id;
    }

    $faites  = count($avant) + count($finies);
    // Une étape retenue dans `completed` est une étape VALIDÉE : elle compte
    // comme réussie.
    $reussies = count($avant);
    foreach ($finies as $s) if (($s['passed'] ?? true) !== false) $reussies++;

    $prevues = 0;
    foreach ($plan as $e) $prevues += (int) ($e['questions'] ?? 0);

    $idsFinis = [];
    foreach ($finies as $s) if (!empty($s['stepId'])) $idsFinis[$s['stepId']] = true;

    // L'ÉTAPE EN COURS SE NOMME, ELLE NE SE COMPTE PAS — voir `etapeEnTrainPhp`.
    $enTrain = etapeEnTrainPhp($plan, $finies, $run['attempts'] ?? [], $faites);
    $enPlan  = $enTrain['entree'] ?? null;
    $idEnCours = $enPlan['stepId'] ?? null;

    // SES TENTATIVES À ELLE, ET DEPUIS SA DERNIÈRE CLÔTURE. Sans l'identifiant,
    // on retombe sur l'ancienne règle — tout ce qui n'appartient à aucune étape
    // close — qui est ce qu'on peut dire d'un plan sans identifiants.
    $encore = [];
    foreach ($run['attempts'] ?? [] as $t) {
        $sid = $t['stepId'] ?? null;
        if ($idEnCours !== null) {
            if ($sid !== null && $sid !== '' && $sid !== $idEnCours) continue;
            if ((int) ($t['ts'] ?? 0) < (int) $enTrain['depuis']) continue;
        } elseif ($sid && isset($idsFinis[$sid])) {
            continue;
        }
        $encore[] = $t;
    }
    $poseesIci = questionsPoseesPhp($encore);
    $justesIci = 0;
    foreach ($encore as $t) {
        if (!empty($t['correct']) && empty($t['partiel']) && (int) ($t['attemptIndex'] ?? 0) === 0) $justesIci++;
    }

    $fini      = !empty($run['finishedAt']) && empty($run['aborted']);
    $abandonne = !empty($run['finishedAt']) && !empty($run['aborted']);
    // EN TRAIN DE TRAVAILLER : soit une étape est NOMMÉE par ses tentatives et
    // n'a pas été refermée — il y est, quoi que dise le compte —, soit le compte
    // désigne encore une étape du plan.
    $enCours = empty($run['finishedAt']) && $enTrain !== null
        && (!empty($enTrain['nomme']) || $faites < count($plan));

    $etapeEnCours = ($enCours && $enPlan !== null) ? [
        'rang'    => (int) $enTrain['rang'],
        'titre'   => (string) ($enPlan['titre'] ?? ''),
        'posees'  => $poseesIci,
        'prevues' => (int) ($enPlan['questions'] ?? 0),
        'justes'  => $justesIci,
    ] : null;

    // LES QUESTIONS D'AVANT SE LISENT DANS LE PLAN : elles ont été répondues
    // dans le run précédent. On ne sait PAS combien il en avait réussi —
    // `completed` ne retient que « validée » — et l'on ne l'invente pas.
    // ON LES CHERCHE PAR LEUR IDENTIFIANT, et par leur rang seulement à défaut :
    // `avant[i]` n'est l'étape de rang `i` que si l'élève a tout fait dans
    // l'ordre, ce que rien ne garantit.
    $questionsCloses = 0; $justesCloses = 0;
    foreach ($avant as $i => $id) {
        $trouve = null;
        foreach ($plan as $e) if (($e['stepId'] ?? null) === $id) { $trouve = $e; break; }
        if ($trouve === null) $trouve = $plan[$i] ?? [];
        $questionsCloses += (int) ($trouve['questions'] ?? 0);
    }
    foreach ($finies as $s) {
        $questionsCloses += (int) ($s['questions'] ?? 0);
        $justesCloses    += (int) ($s['solved'] ?? 0);
    }
    $questions = $questionsCloses + ($etapeEnCours ? $poseesIci : 0);
    $justes    = $justesCloses + ($etapeEnCours ? $justesIci : 0);

    // La fraction : en questions quand on connaît le total, en étapes sinon.
    // Un parcours terminé vaut 1 — même bouclé en moins de questions que prévu,
    // ce qui est le cas courant puisqu'une étape se valide dès son seuil.
    if ($fini)                 $fraction = 1.0;
    elseif (!count($plan))     $fraction = 0.0;
    elseif ($prevues > 0)      $fraction = min(1.0, $questions / $prevues);
    else                       $fraction = min(1.0, $faites / count($plan));

    return [
        'runId'     => $run['runId'] ?? null,
        'pathId'    => $run['pathId'] ?? null,
        'pathName'  => (string) ($run['pathName'] ?? ''),
        'etat'      => $fini ? 'fini' : ($abandonne ? 'abandonne' : 'en-cours'),
        'etapes'    => count($plan),
        'faites'    => $faites,
        'reussies'  => $reussies,
        // Étape par étape, réussie ou non : le fil de l'élève en a besoin, et
        // Le direct s'en sert pour montrer OÙ ça a coincé.
        'detailEtapes' => array_merge(
            array_fill(0, count($avant), true),
            array_map(fn($s) => ($s['passed'] ?? true) !== false, $finies)),
        'etapeEnCours' => $etapeEnCours,
        'questions' => $questions,
        'prevues'   => $prevues,
        'justes'    => $justes,
        'fraction'  => round($fraction, 4),
        'secondes'  => !empty($run['startedAt']) ? max(0, $maintenant - (int) round($run['startedAt'] / 1000)) : 0,
    ];
}

/**
 * COMBIEN DE QUESTIONS, ET NON COMBIEN DE FOIS ON A RÉPONDU.
 *
 * Une même question produit plusieurs tentatives — le second essai après une
 * erreur, et une tentative `partiel` par chiffre d'une opération posée. Les
 * compter toutes ferait dépasser le total, et l'élève le plus en difficulté
 * paraîtrait le plus avancé.
 */
function questionsPoseesPhp(array $tentatives): int
{
    $graines = []; $sansGraine = 0;
    foreach ($tentatives as $t) {
        if (!empty($t['partiel'])) continue;
        if (!empty($t['itemSeed'])) $graines[(string) $t['itemSeed']] = true;
        elseif ((int) ($t['attemptIndex'] ?? 0) === 0) $sansGraine++;
    }
    return count($graines) + $sansGraine;
}
