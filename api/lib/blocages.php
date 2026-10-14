<?php
declare(strict_types=1);

/**
 * COMPTER AVANT DE DÉCIDER DES SEUILS — « et d'abord, mesurer ».
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RÉMY, après quatre séances : « parfois un élève bloque complètement, que
 * faire ? ». La réponse demande trois seuils, et c'est là que tout se joue :
 *
 *   · après combien d'échecs de suite pousser le premier indice ? deux ? trois ?
 *   · au bout de combien de silence dire au professeur « il est arrêté » ?
 *     90 secondes ? 4 minutes ?
 *   · le même diagnostic revient-il assez souvent pour qu'il vaille la peine
 *     de le nommer ?
 *
 * ET J'AI ÉCRIT, LE 11 OCTOBRE, QUE JE NE LES FIXERAIS PAS TOUT SEUL :
 *
 *   > « Tout chiffre que j'inventerais serait faux : 90 secondes de silence sur
 *   >   un calcul mental, c'est énorme ; sur "Rédiger une justification", c'est
 *   >   le travail. »
 *
 * Ce fichier ne décide rien. Il COMPTE, sur les séances réelles de Rémy, ce que
 * l'application garde déjà — et c'est tout ce qu'il fait.
 *
 * ── CE QUI NE SORT PAS D'ICI ────────────────────────────────────────────────
 *
 * Aucun prénom, aucun identifiant d'élève, aucune réponse donnée, aucun énoncé.
 * Les élèves sont comptés, jamais nommés ; leur identifiant ne sert qu'à SÉPARER
 * deux suites d'essais, et il ne figure dans aucun résultat. Ce qui ressort :
 * des nombres, des identifiants du CATALOGUE (exercices, compétences,
 * diagnostics) — ce qui est public, et sans quoi les comptes ne s'interprètent
 * pas.
 *
 * C'est la même règle que la section « Rapport » de l'administration, qui ne
 * donne que des longueurs de secrets : Rémy doit pouvoir copier et coller sans
 * arrière-pensée.
 *
 * ── UNE QUESTION N'EST PAS UNE TENTATIVE ────────────────────────────────────
 *
 * Le journal garde une ligne par TENTATIVE : trois essais sur la même question
 * font trois lignes. Compter « les échecs d'affilée » sur les tentatives
 * compterait donc trois échecs là où l'élève n'a buté qu'une fois. On regroupe
 * d'abord par question — même clé que `api/lib/grading.php`, et pour la même
 * raison.
 *
 * ET LES ÉTAPES NE COMPTENT PAS. Un essai `partiel` est une étape d'un geste —
 * l'alignement d'une opération posée, un bloc d'un chantier. C'est le défaut que
 * Rémy a signalé le 13 octobre (« ils ont fait 2 opérations et ont eu 5/5 ») :
 * les compter ici referait la même faute, sur une mesure qui sert à régler un
 * seuil.
 */

/**
 * Regroupe des tentatives en QUESTIONS, dans l'ordre, par élève.
 *
 * @param array $essais liste de charges utiles d'essais, chacune portant au
 *        moins `eleve` (une clé quelconque, jamais rendue) et `ts`.
 * @return array<string, array<int, array>> par élève, ses questions en ordre
 */
function questionsParEleve(array $essais): array
{
    usort($essais, fn($a, $b) => ((int) ($a['ts'] ?? 0)) <=> ((int) ($b['ts'] ?? 0)));

    $parEleve = [];
    foreach ($essais as $e) {
        if (!empty($e['partiel'])) continue;          // une étape, pas une question
        $eleve = (string) ($e['eleve'] ?? '?');
        $cle = ($e['exerciseId'] ?? '?') . '|'
            . ($e['itemSeed'] ?? ($e['questionText'] ?? '?'));

        if (!isset($parEleve[$eleve])) $parEleve[$eleve] = ['ordre' => [], 'vues' => []];
        $rang = $parEleve[$eleve]['vues'][$cle] ?? null;
        if ($rang === null) {
            $parEleve[$eleve]['vues'][$cle] = count($parEleve[$eleve]['ordre']);
            $parEleve[$eleve]['ordre'][] = [
                'exercice' => (string) ($e['exerciseId'] ?? '?'),
                'competence' => (string) ($e['skillId'] ?? ''),
                'diagnostic' => '',
                'essais' => 0,
                'indices' => 0,
                'ms' => 0,
                'reussie' => false,
                'duPremierCoup' => false,
            ];
            $rang = $parEleve[$eleve]['vues'][$cle];
        }
        $q = &$parEleve[$eleve]['ordre'][$rang];
        $q['essais']++;
        $q['indices'] = max($q['indices'], (int) ($e['hintsUsed'] ?? 0));
        $q['ms'] += (int) ($e['msElapsed'] ?? 0);
        if (!empty($e['correct'])) {
            $q['reussie'] = true;
            if ((int) ($e['attemptIndex'] ?? 0) === 0) $q['duPremierCoup'] = true;
        } elseif (!empty($e['misconception'])) {
            // LE DERNIER DIAGNOSTIC L'EMPORTE, comme dans `grading.php` : c'est
            // celui qui décrit où l'élève en est resté.
            $q['diagnostic'] = (string) $e['misconception'];
        }
        unset($q);
    }

    $sortie = [];
    foreach ($parEleve as $eleve => $d) $sortie[$eleve] = $d['ordre'];
    return $sortie;
}

/**
 * La longueur des suites, comptée en « 2 fois », « 3 fois », « 4 et plus ».
 *
 * UNE SUITE DE LONGUEUR 3 CONTIENT DEUX FOIS « DEUX DE SUITE », et c'est le
 * piège de ce comptage : si l'on ne compte que la longueur MAXIMALE de chaque
 * suite, on sous-estime le nombre de moments où le seuil « deux » serait
 * franchi. On rend donc les deux : la distribution des longueurs, ET combien de
 * fois chaque seuil est atteint.
 */
function longueursDesSuites(array $suites): array
{
    $dist = ['2' => 0, '3' => 0, '4+' => 0];
    $seuils = ['2' => 0, '3' => 0, '4' => 0];
    foreach ($suites as $n) {
        if ($n < 2) continue;
        if ($n === 2) $dist['2']++;
        elseif ($n === 3) $dist['3']++;
        else $dist['4+']++;
        // Combien de FOIS le seuil est franchi dans cette suite : une suite de
        // quatre franchit « deux de suite » trois fois.
        $seuils['2'] += max(0, $n - 1);
        $seuils['3'] += max(0, $n - 2);
        $seuils['4'] += max(0, $n - 3);
    }
    // LA PLUS LONGUE, À PART. Les trois paniers ci-dessus regroupent « 4 et
    // plus », ce qui suffit à lire une distribution mais pas à éprouver un
    // comptage : un essai qui attend « une suite de cinq » ne peut pas se
    // vérifier sur un panier. Et à l'écran, elle répond à une question que
    // Rémy posera forcément — jusqu'où ça va.
    $plusLongue = 0;
    foreach ($suites as $n) {
        if ($n >= 2 && $n > $plusLongue) $plusLongue = $n;
    }
    return ['distribution' => $dist, 'franchissements' => $seuils,
            'plusLongue' => $plusLongue,
            'suites' => count(array_filter($suites, fn($n) => $n >= 2))];
}

/** Le quantile d'une liste triée de nombres, par interpolation simple. */
function quantile(array $tries, float $p): float
{
    $n = count($tries);
    if ($n === 0) return 0.0;
    if ($n === 1) return (float) $tries[0];
    $i = $p * ($n - 1);
    $bas = (int) floor($i);
    $haut = (int) ceil($i);
    if ($bas === $haut) return (float) $tries[$bas];
    return $tries[$bas] + ($tries[$haut] - $tries[$bas]) * ($i - $bas);
}

/**
 * TOUS LES COMPTES, à partir des tentatives brutes.
 *
 * @param array $essais charges utiles d'essais, portant `eleve` et `ts`
 * @return array
 */
function comptesDesBlocages(array $essais): array
{
    $parEleve = questionsParEleve($essais);

    $suitesDiagnostic = [];
    $suitesEchec = [];
    $parDiagnostic = [];
    $indicesParEleve = [];
    $questions = 0;
    $avecDiagnostic = 0;
    $avecIndice = 0;
    $echouees = 0;
    $tempsParExercice = [];

    foreach ($parEleve as $qs) {
        $indicesParEleve[] = array_sum(array_map(fn($q) => $q['indices'], $qs));

        // --- Les suites, dans l'ordre où l'élève a travaillé ---------------
        $diagCourant = null; $longDiag = 0;
        $compCourante = null; $longEchec = 0;
        foreach ($qs as $q) {
            $questions++;
            if ($q['diagnostic'] !== '') {
                $avecDiagnostic++;
                $parDiagnostic[$q['diagnostic']] = ($parDiagnostic[$q['diagnostic']] ?? 0) + 1;
            }
            if ($q['indices'] > 0) $avecIndice++;
            // ÉCHOUÉE VEUT DIRE « PAS DU PREMIER COUP ». C'est la définition
            // que le logiciel emploie déjà pour la maîtrise, et c'est aussi
            // celle qui compte ici : l'élève qui finit par trouver après trois
            // essais a buté, et c'est ce moment qu'on cherche à voir venir.
            $rate = !$q['duPremierCoup'];
            if ($rate) $echouees++;
            if ($q['ms'] > 0) $tempsParExercice[$q['exercice']][] = $q['ms'];

            // Le même diagnostic, deux questions de suite.
            if ($q['diagnostic'] !== '' && $q['diagnostic'] === $diagCourant) {
                $longDiag++;
            } else {
                if ($longDiag >= 2) $suitesDiagnostic[] = $longDiag;
                $diagCourant = $q['diagnostic'] !== '' ? $q['diagnostic'] : null;
                $longDiag = $diagCourant === null ? 0 : 1;
            }

            // Des échecs de suite SUR LA MÊME COMPÉTENCE — c'est le seuil du
            // point 3 (« pousser le premier indice »). Une réussite remet le
            // compteur à zéro, et un changement de compétence aussi : deux
            // échecs sur deux compétences différentes ne sont pas un blocage,
            // ce sont deux questions difficiles.
            if ($rate && $q['competence'] !== '' && $q['competence'] === $compCourante) {
                $longEchec++;
            } else {
                if ($longEchec >= 2) $suitesEchec[] = $longEchec;
                $compCourante = ($rate && $q['competence'] !== '') ? $q['competence'] : null;
                $longEchec = $compCourante === null ? 0 : 1;
            }
        }
        if ($longDiag >= 2) $suitesDiagnostic[] = $longDiag;
        if ($longEchec >= 2) $suitesEchec[] = $longEchec;
    }

    // --- Le temps par exercice, pour le seuil du silence -------------------
    //
    // ON NE CHERCHE PAS UNE DURÉE, ON CHERCHE UN ÉCART. « Nettement plus
    // longtemps que les autres sur cette même question » est la seule
    // référence honnête, et elle demande de savoir ce que vaut l'écart
    // ORDINAIRE : si le neuvième décile vaut déjà quatre fois la médiane,
    // alors « quatre fois la médiane » ne désigne pas un élève arrêté, il
    // désigne un élève sur dix.
    $temps = [];
    foreach ($tempsParExercice as $exo => $liste) {
        if (count($liste) < 5) continue;         // trop peu pour un quantile
        sort($liste);
        $med = quantile($liste, 0.5);
        $p90 = quantile($liste, 0.9);
        $temps[] = [
            'exercice' => $exo,
            'n' => count($liste),
            'medianeS' => round($med / 1000, 1),
            'p90S' => round($p90 / 1000, 1),
            'rapport' => $med > 0 ? round($p90 / $med, 2) : null,
        ];
    }
    usort($temps, fn($a, $b) => $b['n'] <=> $a['n']);

    sort($indicesParEleve);
    arsort($parDiagnostic);

    return [
        'eleves' => count($parEleve),
        'questions' => $questions,
        'echouees' => $echouees,
        'avecDiagnostic' => $avecDiagnostic,
        'avecIndice' => $avecIndice,
        'diagnosticRepete' => longueursDesSuites($suitesDiagnostic),
        'echecRepete' => longueursDesSuites($suitesEchec),
        'diagnosticsLesPlusVus' => array_slice($parDiagnostic, 0, 12, true),
        'indices' => [
            'total' => array_sum($indicesParEleve),
            'medianeParEleve' => $indicesParEleve ? quantile($indicesParEleve, 0.5) : 0,
            'maxParEleve' => $indicesParEleve ? max($indicesParEleve) : 0,
            'elevesSansIndice' => count(array_filter($indicesParEleve, fn($n) => $n === 0)),
        ],
        'temps' => $temps,
    ];
}
