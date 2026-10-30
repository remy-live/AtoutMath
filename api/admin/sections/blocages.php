<?php
declare(strict_types=1);

/**
 * SECTION « LES BLOCAGES » — compter avant de décider des seuils.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RÉMY : « parfois un élève bloque complètement, que faire ? ». La réponse
 * demande trois seuils, et j'ai écrit le 11 octobre que je ne les fixerais pas
 * tout seul :
 *
 *   > « Tout chiffre que j'inventerais serait faux : 90 secondes de silence sur
 *   >   un calcul mental, c'est énorme ; sur "Rédiger une justification", c'est
 *   >   le travail. »
 *
 * Il ouvre cette page, il clique « Copier », il colle. Les seuils se décident
 * alors sur SES quatre séances, et non sur mon intuition.
 *
 * ── CE QUI NE SORT PAS D'ICI, et c'est la moitié du travail ─────────────────
 *
 * Aucun prénom, aucun identifiant d'élève, aucune réponse donnée, aucun énoncé.
 * Les élèves sont COMPTÉS, jamais nommés. Ce qui ressort : des nombres et des
 * identifiants du CATALOGUE — exercices, compétences, diagnostics — qui sont
 * publics, et sans lesquels les comptes ne s'interprètent pas.
 *
 * C'est la même règle que la section « Rapport », qui ne donne que des
 * longueurs de secrets : il doit pouvoir coller sans arrière-pensée.
 *
 * ── POURQUOI CETTE PAGE ET PAS UN SCRIPT ───────────────────────────────────
 *
 * `api/tools/admin.php` ne s'exécute qu'en ligne de commande, et Rémy est sur
 * un hébergement mutualisé. Un outil qu'il ne peut pas lancer ne mesure rien.
 *
 * @var array $prof  le professeur connecté
 */

require_once __DIR__ . '/../../lib/blocages.php';
require_once __DIR__ . '/../../lib/coffre.php';

$prof = profConnecte();

// LE PLAFOND EST ÉCRIT, ET IL EST DIT À L'ÉCRAN. Un journal de classe grandit
// sans cesse ; `events.payload` est CHIFFRÉ en base, donc chaque ligne demande
// un déchiffrement et aucun filtre ne peut se faire en SQL. Cinquante mille
// essais sont bien au-delà de quatre séances, et restent lisibles en une
// seconde sur un hébergement mutualisé.
const BLOCAGES_MAX = 50000;

$essais = [];
$lus = 0;
$illisibles = 0;
$premierTs = null;
$dernierTs = null;
$erreur = '';

try {
    // `type` n'est PAS chiffré — seule la charge utile l'est. Le filtre se fait
    // donc bien en SQL, et l'on ne déchiffre que les essais.
    $stmt = db()->prepare(
        'SELECT e.student_id, e.ts, e.payload
           FROM events e
           JOIN students s ON s.id = e.student_id
           JOIN classes  c ON c.id = s.class_id
          WHERE c.teacher_id = ? AND e.type = ?
          ORDER BY e.ts ASC
          LIMIT ' . BLOCAGES_MAX);
    $stmt->execute([$prof['id'], 'attempt']);
    // ON NE GARDE JAMAIS UN PDOStatement À MOITIÉ LU — la règle est écrite dans
    // `tools/testApi.php`, et elle a déjà coûté un « database is locked »
    // cinquante lignes plus loin.
    $lignes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($lignes as $r) {
        $lus++;
        $p = json_decode((string) dechiffrer($r['payload']), true);
        if (!is_array($p)) { $illisibles++; continue; }
        $ts = (int) $r['ts'];
        if ($premierTs === null || $ts < $premierTs) $premierTs = $ts;
        if ($dernierTs === null || $ts > $dernierTs) $dernierTs = $ts;
        // L'IDENTIFIANT D'ÉLÈVE NE SERT QU'À SÉPARER DEUX SUITES D'ESSAIS, et
        // il ne ressort nulle part. On le passe tel quel à la fonction de
        // comptage, qui ne rend que des nombres.
        $essais[] = [
            'eleve' => (string) $r['student_id'],
            'ts' => $ts,
            'exerciseId' => $p['exerciseId'] ?? null,
            // LE NOM DE L'EXERCICE, pour que la page dise « sur Additions
            // Mystères » et non « sur calc-add » : le second est le nom que je
            // lis dans le code, pas celui que Rémy lit dans son catalogue — qui
            // est en JavaScript, donc hors de portée du serveur. Le titre
            // voyage dans chaque essai, c'est la seule source qu'on ait.
            'exerciseTitle' => $p['exerciseTitle'] ?? '',
            'skillId' => $p['skillId'] ?? null,
            'itemSeed' => $p['itemSeed'] ?? null,
            'questionText' => $p['questionText'] ?? '',
            'correct' => $p['correct'] ?? false,
            'attemptIndex' => $p['attemptIndex'] ?? 0,
            'msElapsed' => $p['msElapsed'] ?? 0,
            'hintsUsed' => $p['hintsUsed'] ?? 0,
            'misconception' => $p['misconception'] ?? null,
            'partiel' => $p['partiel'] ?? false,
        ];
    }
} catch (Throwable $t) {
    $erreur = $t->getMessage();
}

$c = $essais ? comptesDesBlocages($essais) : null;

// --- Le bloc à copier -------------------------------------------------------

$l = [];
$l[] = 'COMPTES POUR LES SEUILS — aucun nom, aucune réponse, aucun énoncé.';
$l[] = str_repeat('=', 68);
$l[] = '';
if ($erreur !== '') {
    $l[] = 'La lecture a échoué : ' . $erreur;
} elseif (!$c) {
    $l[] = 'Aucun essai enregistré pour le moment.';
    $l[] = '';
    $l[] = 'Ce n\'est pas une panne : les comptes se remplissent dès que des';
    $l[] = 'élèves répondent à des questions. Revenez après une séance.';
} else {
    $jours = ($premierTs && $dernierTs)
        ? max(1, (int) round(($dernierTs - $premierTs) / 86400000)) : 1;
    $l[] = sprintf('Lu : %d essai(s)%s, %d élève(s), %d question(s), sur %d jour(s).',
        $lus, $lus >= BLOCAGES_MAX ? ' (plafond atteint)' : '',
        $c['eleves'], $c['questions'], $jours);
    if ($illisibles) $l[] = sprintf('  (%d ligne(s) illisible(s) — ignorées.)', $illisibles);
    $l[] = sprintf('Questions ratées au premier coup : %d (%s).',
        $c['echouees'], part($c['echouees'], $c['questions']));
    $l[] = '';

    $l[] = '1. LE MÊME DIAGNOSTIC, SUR DES QUESTIONS QUI SE SUIVENT';
    $l[] = '   (« C\'est la même chose qu\'à la question d\'avant » — faut-il le dire ?)';
    $l[] = sprintf('   questions portant un diagnostic : %d (%s)',
        $c['avecDiagnostic'], part($c['avecDiagnostic'], $c['questions']));
    $l[] = suite($c['diagnosticRepete']);
    $l[] = '';

    $l[] = '2. LES ÉCHECS QUI SE SUIVENT SUR LA MÊME COMPÉTENCE';
    $l[] = '   (le seuil de l\'indice poussé — deux ? trois ?)';
    $l[] = suite($c['echecRepete']);
    $l[] = '';

    $l[] = '3. LES INDICES, AUJOURD\'HUI DEMANDÉS';
    $l[] = sprintf('   questions avec au moins un indice : %d (%s)',
        $c['avecIndice'], part($c['avecIndice'], $c['questions']));
    $l[] = sprintf('   indices au total : %d', $c['indices']['total']);
    $l[] = sprintf('   par élève : médiane %s, maximum %d',
        rtrim(rtrim(number_format($c['indices']['medianeParEleve'], 1, ',', ' '), '0'), ','),
        $c['indices']['maxParEleve']);
    $l[] = sprintf('   élèves qui n\'en ont JAMAIS demandé : %d sur %d',
        $c['indices']['elevesSansIndice'], $c['eleves']);
    $l[] = '';

    $l[] = '4. LE TEMPS PAR QUESTION, EXERCICE PAR EXERCICE';
    $l[] = '   (le seuil du silence. On ne cherche pas une durée, on cherche un';
    $l[] = '    ÉCART : si le neuvième décile vaut déjà quatre fois la médiane,';
    $l[] = '    alors « quatre fois la médiane » ne désigne pas un élève arrêté,';
    $l[] = '    il désigne un élève sur dix.)';
    if (!$c['temps']) {
        $l[] = '   pas encore cinq questions sur un même exercice.';
    } else {
        $l[] = sprintf('   %-30s %5s %9s %9s %8s', 'exercice', 'n', 'médiane', 'p90', 'p90/méd');
        foreach ($c['temps'] as $t) {
            $l[] = sprintf('   %-30s %5d %8s s %8s s %8s',
                mb_substr((string) $t['exercice'], 0, 30),
                $t['n'],
                number_format((float) $t['medianeS'], 1, ',', ' '),
                number_format((float) $t['p90S'], 1, ',', ' '),
                $t['rapport'] === null ? '—' : number_format((float) $t['rapport'], 2, ',', ' '));
        }
    }
    $l[] = '';

    $l[] = '5. LES DIAGNOSTICS LES PLUS VUS';
    $l[] = '   (de quoi savoir si « nommer la répétition » vaut la peine, et sur quoi)';
    if (!$c['diagnosticsLesPlusVus']) {
        $l[] = '   aucun diagnostic enregistré.';
    } else {
        foreach ($c['diagnosticsLesPlusVus'] as $nom => $n) {
            $l[] = sprintf('   %-44s %5d', mb_substr((string) $nom, 0, 44), $n);
        }
    }
}
$texte = implode("\n", $l);

// LES PHRASES VIVENT DANS `api/lib/blocages.php`, ET C'EST VOULU.
//
// RÉMY : « je ne comprends pas les blocages en compte ». Ce qui le lui
// explique est donc la partie la plus importante de cette page — trop pour
// qu'elle vive au milieu du HTML, où rien ne peut l'éprouver sans monter un
// serveur et ouvrir une session. `phrasesDesBlocages` est pure : elle prend
// des comptes, elle rend des phrases, et `php tools/testApi.php` les lit.
extract(phrasesDesBlocages($c, $erreur));   // $dit, $propose, $aChoisir

// `part()` et `uneFoisSur()` vivent avec les phrases, dans
// `api/lib/blocages.php` : les déclarer ici aussi ferait tomber PHP sur une
// redéclaration, et les deux endroits les emploient.

/** Les quatre lignes d'une distribution de suites. */
function suite(array $s): string
{
    $d = $s['distribution'];
    $f = $s['franchissements'];
    return sprintf(
        "   suites de 2 : %d · de 3 : %d · de 4 et plus : %d   (total %d suites)\n"
        . "   le seuil serait franchi : %d fois à 2, %d fois à 3, %d fois à 4",
        $d['2'], $d['3'], $d['4+'], $s['suites'], $f['2'], $f['3'], $f['4']);
}

$combien = $c ? sprintf('%d question(s) · %d élève(s)', $c['questions'], $c['eleves'])
    : ($erreur !== '' ? 'lecture impossible' : 'rien encore');

sectionDebut('blocages', 'Les blocages, en comptes',
    'ce qu\'il faut savoir avant de régler un seuil', $combien,
    $erreur !== '' ? 'grave' : ($c ? 'neutre' : 'attention'));
?>
<p class="gris-clair">Quand un élève bloque, le logiciel peut lui tendre un
   indice tout seul, et vous signaler qu'il est arrêté. Reste à savoir
   <b>à partir de quand</b> — et cela ne se décide bien que sur ce qui s'est
   passé <b>dans vos classes</b>. Voici ce que vos séances disent.</p>

<div class="carte">
    <?php foreach ($dit as [$genre, $phrase]): ?>
        <?php if ($genre === 'titre'): ?>
            <h3 style="margin:18px 0 6px; font-size:1rem"><?= $phrase ?></h3>
        <?php elseif ($genre === 'fort'): ?>
            <p style="margin:0 0 4px"><b><?= $phrase ?></b></p>
        <?php elseif ($genre === 'gris'): ?>
            <p class="gris-clair"><?= $phrase ?></p>
        <?php else: ?>
            <p style="margin:0 0 6px"><?= $phrase ?></p>
        <?php endif; ?>
    <?php endforeach; ?>

    <?php if ($propose !== ''): ?>
        <!-- CE QUE JE PROPOSE, ET LA RAISON AVEC. Une page qui pose une
             question sans dire ce qu'elle en pense renvoie le travail à
             celui qui l'a demandée. Rémy tranche, mais il tranche sur un
             avis argumenté — pas sur un tableau de décimales. -->
        <div class="avis" style="margin-top:16px">
            <span class="marque" aria-hidden="true">?</span>
            <p><?= $propose ?><?php if ($aChoisir): ?><br>
               <span class="gris-clair">Dites-moi simplement « deux » ou « trois »,
               ou votre propre chiffre — c'est votre décision, pas la mienne.</span>
               <?php endif; ?></p>
        </div>
    <?php endif; ?>
</div>

<!-- LES CHIFFRES BRUTS RESTENT, MAIS REPLIÉS ET POUR MOI.
     Rémy : « je ne comprends pas les blocages en compte ». Cette page lui
     montrait « neuvième décile », « franchissements », « p90/méd » et lui
     demandait de me les recopier : je l'avais transformé en instrument de
     mesure pour une décision qui est la sienne. Ils ne disparaissent pas —
     ils servent le jour où une de mes phrases ci-dessus a l'air fausse. -->
<details style="margin-top:14px">
    <summary style="cursor:pointer">Les chiffres bruts, si on me les demande</summary>
    <div class="carte" style="margin-top:10px">
        <p>
            <button type="button" class="bouton" id="btn-copier-blocages">Copier les comptes</button>
            <span class="gris-clair" id="dit-copie-blocages" style="margin-left:10px"></span>
        </p>
        <textarea id="blocages" rows="24" readonly
                  style="font-family: ui-monospace, Menlo, Consolas, monospace; font-size:.82rem;
                         line-height:1.45; white-space:pre; overflow-x:auto"><?= h($texte) ?></textarea>
        <p class="gris-clair" style="margin-bottom:0">
            <b>Aucun nom n'en sort</b> — ni prénom, ni identifiant d'élève, ni réponse
            donnée, ni énoncé. Les élèves sont comptés, jamais nommés. Les seuls noms
            que vous lirez sont ceux des exercices et des compétences, qui sont dans
            le logiciel de tout le monde.
        </p>
    </div>
</details>

<script>
document.getElementById('btn-copier-blocages').onclick = async () => {
    const zone = document.getElementById('blocages');
    const dit = document.getElementById('dit-copie-blocages');
    try {
        await navigator.clipboard.writeText(zone.value);
        dit.textContent = 'Copié.';
    } catch {
        // `navigator.clipboard` demande HTTPS : sur un site encore en clair, il
        // n'existe pas. On sélectionne, et Ctrl+C marche partout.
        zone.select();
        dit.textContent = 'Sélectionné — faites Ctrl+C (ou ⌘C).';
    }
    setTimeout(() => { dit.textContent = ''; }, 4000);
};
</script>
<?php
sectionFin();
