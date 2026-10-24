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
                // LE NOM DE L'EXERCICE, ET NON SON IDENTIFIANT. La page disait
                // « sur calc-add, la moitié de vos élèves… » : c'est le nom que
                // je lis dans le code, pas celui que Rémy lit dans son
                // catalogue. Le titre voyage dans la charge utile de chaque
                // essai (`exerciseTitle`), et le serveur n'a pas d'autre moyen
                // de le connaître — le catalogue est en JavaScript.
                'titre' => (string) ($e['exerciseTitle'] ?? ''),
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
    $titreDe = [];
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
            if ($q['ms'] > 0) {
                $tempsParExercice[$q['exercice']][] = $q['ms'];
                if ($q['titre'] !== '') $titreDe[$q['exercice']] = $q['titre'];
            }

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
            'nom' => $titreDe[$exo] ?? $exo,
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

/** « 37 % », ou « — » quand le dénominateur est nul. */
function part(int $n, int $sur): string
{
    return $sur > 0 ? round($n * 100 / $sur) . ' %' : '—';
}

/** « une fois sur 14 », ou rien quand on ne peut pas le dire. */
function uneFoisSur(int $combien, int $sur): string
{
    if ($combien <= 0 || $sur <= 0) return '';
    $n = (int) round($sur / $combien);
    return $n >= 2 ? ', soit une fois sur ' . $n . ' questions' : '';
}

/**
 * CE QUE LES COMPTES VEULENT DIRE, EN FRANÇAIS.
 *
 * RÉMY : « je ne comprends pas les blocages en compte ».
 *
 * IL AVAIT RAISON, ET LE DÉFAUT ÉTAIT ENTIÈREMENT DANS LA PAGE. Elle affichait
 * mes chiffres de travail — « neuvième décile », « franchissements »,
 * « p90/méd » — et lui demandait de me les recopier. Je l'avais transformé en
 * instrument de mesure, pour une décision qui est la SIENNE.
 *
 * Une page qui pose une question doit la poser en entier : ce qu'on a compté,
 * ce que cela veut dire, et ce que je propose. Les chiffres bruts restent,
 * repliés, pour le jour où une de ces phrases a l'air fausse.
 *
 * ELLE EST PURE, et c'est ce qui permet de l'éprouver : ni base, ni session, ni
 * HTML. `php tools/testApi.php` lui donne des comptes et lit ses phrases.
 *
 * @param ?array $c       ce que rend `comptesDesBlocages`, ou null
 * @param string $erreur  le message de lecture, s'il y en a eu une
 * @return array{dit: array, propose: string, aChoisir: bool}
 */
function phrasesDesBlocages(?array $c, string $erreur = ''): array
{
    // --- CE QUE TOUT CELA VEUT DIRE, EN FRANÇAIS ------------------------------
    //
    // RÉMY : « je ne comprends pas les blocages en compte ».
    //
    // IL A RAISON, ET LE DÉFAUT EST ENTIÈREMENT DANS CETTE PAGE. Elle affichait
    // mes chiffres de travail — « neuvième décile », « franchissements »,
    // « p90/méd » — et lui demandait de me les recopier. Je l'avais transformé en
    // instrument de mesure, pour une décision qui est la SIENNE.
    //
    // Une page qui pose une question doit la poser en entier : ce qu'on a compté,
    // ce que cela veut dire, et ce que je propose. Les chiffres bruts restent —
    // repliés, et pour moi.
    //
    // (`uneFoisSur` et `part` sont au-dessus, hors de cette fonction. Déclarées
    //  DEDANS, PHP les redéclarait au second appel et la page mourait d'un
    //  « Cannot redeclare function » — un fatal que le serveur d'essai avale,
    //  si bien que la section s'affichait entièrement VIDE. C'est le journal du
    //  serveur qui l'a dit, pas l'écran.)

    $dit = [];
    $propose = '';
    // Y A-T-IL VRAIMENT UN CHOIX À FAIRE ? Quand le seuil ne se déclencherait
    // jamais sur ces séances, lui demander « deux ou trois ? » est du bruit : il
    // n'y a rien à trancher tant qu'on n'a pas mesuré autre chose. La page le dit,
    // et se tait sur le choix.
    $aChoisir = false;
    if ($erreur !== '') {
        $dit[] = ['gris', 'La lecture a échoué : ' . $erreur];
    } elseif (!$c || $c['questions'] === 0) {
        $dit[] = ['gris', 'Aucune question répondue n\'est encore enregistrée ici. '
            . 'Ce n\'est pas une panne : les comptes se remplissent tout seuls dès '
            . 'qu\'une classe travaille. Revenez après une séance.'];
        $dit[] = ['gris', 'Attention tout de même : le site ne garde les réponses '
            . 'que pendant un temps réglé dans sa configuration (trente jours par '
            . 'défaut). Passé ce délai, elles s\'effacent toutes seules.'];
    } else {
        $qs = $c['questions'];
        $deux = $c['echecRepete']['franchissements']['2'] ?? 0;
        $trois = $c['echecRepete']['franchissements']['3'] ?? 0;
        $diag = $c['diagnosticRepete']['franchissements']['2'] ?? 0;

        $dit[] = ['fort', sprintf(
            'Vos élèves ont répondu à %d question%s. %d ont été ratées au premier '
            . 'coup, soit %s.',
            $qs, $qs > 1 ? 's' : '', $c['echouees'], part($c['echouees'], $qs))];

        // LA QUESTION QUE CETTE PAGE EXISTE POUR POSER.
        $dit[] = ['titre', 'Après combien d\'échecs faut-il lui pousser un indice ?'];
        $dit[] = ['', sprintf(
            'Un élève a raté <b>deux questions de suite sur la même compétence</b> '
            . '%d fois%s. C\'est à ce moment-là que le logiciel lui tendrait son '
            . 'premier indice, sans qu\'il le demande et sans que ça lui coûte de '
            . 'points.',
            $deux, uneFoisSur($deux, $qs))];
        $dit[] = ['', sprintf(
            'Si l\'on attend <b>trois</b> échecs de suite, cela n\'arrive plus que '
            . '%d fois%s.',
            $trois, uneFoisSur($trois, $qs))];
    // ZÉRO SE DIT AUTREMENT. « cela n'arrive plus que 0 fois » se lit mal, et
    // surtout ne dit pas ce qui compte : à trois, le geste ne partirait jamais.
    if ($trois === 0) {
        $dit[count($dit) - 1] = ['', 'Si l\'on attend <b>trois</b> échecs de '
            . 'suite, cela n\'arriverait <b>jamais</b> sur ces séances.'];
    }

        // ET CE QUE J'EN PENSE, AVEC LA RAISON. Un seuil se juge sur sa FRÉQUENCE :
        // trop souvent, l'aide devient du papier peint qu'on ne lit plus ; trop
        // rare, elle n'arrive jamais à celui qui en a besoin. Les bornes sont
        // dites, pour qu'il puisse ne pas être d'accord en connaissance de cause.
        $partDeux = $qs > 0 ? $deux * 100 / $qs : 0;
        if ($deux === 0) {
            $propose = 'Sur ces séances, personne n\'a raté deux questions de suite '
                . 'sur la même compétence : l\'indice poussé ne se déclencherait '
                . 'jamais. Soit ces séances étaient faciles, soit il faut en '
                . 'mesurer d\'autres avant de choisir.';
        } elseif ($partDeux > 20) {
            $aChoisir = true;
            $propose = sprintf('Je propose <b>trois</b> échecs de suite. À deux, '
                . 'l\'indice arriverait sur %s des questions : à cette fréquence '
                . 'il devient du papier peint, et un avis qui revient tout le '
                . 'temps cesse d\'être lu.', part($deux, $qs));
        } else {
            $aChoisir = true;
            $propose = sprintf('Je propose <b>deux</b> échecs de suite. L\'indice '
                . 'arriverait sur %s des questions — assez rare pour qu\'on le '
                . 'remarque, assez fréquent pour atteindre celui qui bute.',
                part($deux, $qs));
        }

        // L'ARGUMENT POUR LE POUSSER : ils ne le demandent pas.
        $sans = $c['indices']['elevesSansIndice'];
        $dit[] = ['titre', 'Pourquoi le pousser plutôt que l\'attendre'];
        $dit[] = ['', sprintf(
            'Le bouton « Un indice » existe déjà, et il est peu employé : %s des '
            . 'questions seulement, et <b>%d élève%s sur %d n\'en %s jamais demandé '
            . 'un seul</b>. Celui qui bloque est précisément celui qui ne le '
            . 'demande pas.',
            part($c['avecIndice'], $qs), $sans, $sans > 1 ? 's' : '', $c['eleves'],
            $sans > 1 ? 'ont' : 'a')];

        // NOMMER LA RÉPÉTITION — déjà en place, et voici ce que cela touche.
        $dit[] = ['titre', 'La phrase « c\'est la même chose qu\'à la question d\'avant »'];
        $dit[] = ['', $diag > 0
            ? sprintf('Elle est déjà en place. Sur ces séances, le même diagnostic '
                . 'revenait sur deux questions qui se suivent <b>%d fois</b>%s : '
                . 'autant de moments où l\'élève lisait deux fois la même phrase '
                . 'neutre sans que rien ne signale qu\'il recommençait.',
                $diag, uneFoisSur($diag, $qs))
            : 'Elle est déjà en place. Sur ces séances, aucun élève n\'a refait la '
                . 'même erreur exacte sur deux questions qui se suivent — elle ne '
                . 'se serait donc jamais affichée.'];

        // LE SILENCE : un écart, pas une durée.
        $dit[] = ['titre', 'Au bout de combien de silence vous dire qu\'un élève est arrêté'];
        if (!$c['temps']) {
            $dit[] = ['gris', 'Pas encore assez de questions sur un même exercice '
                . 'pour le dire (il en faut cinq).'];
        } else {
            $t = $c['temps'][0];
            $dit[] = ['', sprintf(
                'Cela ne peut pas être une durée fixe : sur « %s », la moitié de vos '
                . 'élèves répondent en moins de %s secondes, et un sur dix met plus '
                . 'de %s secondes%s. Un élève lent n\'est pas un élève arrêté. Le '
                . 'logiciel comparera donc chacun <b>à sa propre classe, sur la même '
                . 'question</b> — il n\'y a aucun nombre à choisir.',
                htmlspecialchars((string) ($t['nom'] ?? $t['exercice']), ENT_QUOTES, 'UTF-8'),
                number_format((float) $t['medianeS'], 0, ',', ' '),
                number_format((float) $t['p90S'], 0, ',', ' '),
                $t['rapport'] ? sprintf(' — %s fois plus longtemps',
                    number_format((float) $t['rapport'], 1, ',', ' ')) : '')];
        }
    }

    return ['dit' => $dit, 'propose' => $propose, 'aChoisir' => $aChoisir];
}
