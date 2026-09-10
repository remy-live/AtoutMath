<?php
declare(strict_types=1);

/**
 * LA LISTE DE LA CLASSE — identifiants et codes.
 *
 * Rémy : « pour la connexion, fais aussi une connexion avec identifiant et code
 * élève, je fournirai la liste. »
 *
 * ON COLLE LA LISTE, ON IMPRIME LES BILLETS. C'est tout le geste, et il devait
 * l'être : un professeur qui prépare sa séance a déjà sa liste quelque part —
 * dans un tableur, dans Pronote, dans un fichier texte. Lui demander de saisir
 * trente élèves un par un dans un formulaire, c'est lui demander de ne pas s'en
 * servir.
 *
 * L'IMPORT NE CHANGE JAMAIS UN CODE DÉJÀ DONNÉ. Recoller la même liste — parce
 * qu'on a ajouté deux élèves, parce qu'on a corrigé une faute — ne doit pas
 * périmer trente billets déjà distribués. Seuls les nouveaux venus reçoivent un
 * code ; les autres gardent le leur.
 *
 * DEUX PORTES COEXISTENT, ET C'EST VOULU. Rémy a dit « fais AUSSI » : le
 * « code de classe + prénom » reste, c'est le mode sans préparation, bon pour un
 * essai ou un remplacement. La liste s'ajoute à côté, pour les séances où l'on
 * veut savoir exactement qui travaille.
 */

require_once __DIR__ . '/_socle.php';
require_once __DIR__ . '/../lib/coffre.php';

$prof = profConnecte();
$id = (string) ($_GET['id'] ?? '');

$stmt = db()->prepare('SELECT * FROM classes WHERE id = ? AND teacher_id = ?');
$stmt->execute([$id, $prof['id']]);
$classe = $stmt->fetch();
if (!$classe) {
    redirige('index.php', "Cette classe n'existe pas.");
}
$retour = 'eleves.php?id=' . urlencode($id);

/**
 * LIRE UNE LIGNE DE LA LISTE.
 *
 * On accepte ce qu'un professeur a sous la main, sans lui demander de mettre en
 * forme : un nom seul, ou un nom suivi de l'identifiant, ou les trois champs.
 * Le séparateur est le point-virgule, la virgule ou la tabulation — celui d'un
 * tableur français, celui d'un tableur anglais, et celui d'un copier-coller.
 *
 *   Léa Durand
 *   Léa Durand ; lea.durand
 *   Léa Durand ; lea.durand ; 4KP2
 */
function lireLigne(string $ligne): ?array
{
    $ligne = trim($ligne);
    if ($ligne === '' || str_starts_with($ligne, '#')) {
        return null;
    }
    $parts = array_map('trim', preg_split('/[;\t,]/', $ligne) ?: []);
    $nom = $parts[0] ?? '';
    if ($nom === '') {
        return null;
    }
    $login = ($parts[1] ?? '') !== '' ? identifiantDe($parts[1]) : identifiantDe($nom);
    $code = strtoupper($parts[2] ?? '');
    if ($login === '') {
        return null;
    }
    return ['nom' => mb_substr($nom, 0, 80), 'login' => $login,
            'code' => preg_match('/^[A-Z0-9]{3,12}$/', $code) ? $code : ''];
}

$rapport = null;

// ------------------------------------------------------------------ Actions
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    exigerJeton();
    $action = (string) ($_POST['action'] ?? '');

    if ($action === 'importer') {
        $lignes = preg_split('/\r\n|\r|\n/', (string) ($_POST['liste'] ?? '')) ?: [];
        $ajoutes = 0; $connus = 0; $refus = [];

        foreach ($lignes as $brut) {
            $l = lireLigne($brut);
            if (!$l) {
                continue;
            }
            $empreinte = empreinteLogin($l['login']);

            // Cet identifiant existe-t-il déjà — ici, ou dans une autre classe ?
            $s = db()->prepare('SELECT id, class_id FROM students WHERE login_key = ? LIMIT 1');
            $s->execute([$empreinte]);
            $deja = $s->fetch();

            if ($deja && $deja['class_id'] !== $id) {
                $refus[] = $l['login'] . " (déjà dans une autre classe)";
                continue;
            }
            if ($deja) {
                // IL GARDE SON CODE. Un billet distribué ne se périme pas parce
                // qu'on recolle la liste.
                db()->prepare('UPDATE students SET first_name = ?, first_name_key = ? WHERE id = ?')
                    ->execute([chiffrer($l['nom']), empreintePrenom($l['nom']), $deja['id']]);
                $connus++;
                continue;
            }
            $code = $l['code'] !== '' ? $l['code'] : codeEleve();
            db()->prepare(
                'INSERT INTO students (id, class_id, first_name, first_name_key,
                                       login, login_key, access_code, token_hash)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            )->execute([uuidv4(), $id, chiffrer($l['nom']), empreintePrenom($l['nom']),
                        chiffrer($l['login']), $empreinte, chiffrer($code),
                        // Pas encore de jeton : il naîtra à la première connexion.
                        hash('sha256', uuidv4())]);
            $ajoutes++;
        }
        $mot = "$ajoutes élève(s) ajouté(s)"
            . ($connus ? ", $connus déjà présent(s) — leur code n'a pas changé" : '')
            . ($refus ? '. Refusés : ' . implode(', ', array_slice($refus, 0, 5)) : '.');
        redirige($retour, $mot);
    }

    if ($action === 'nouveau-code') {
        $s = db()->prepare('SELECT id FROM students WHERE id = ? AND class_id = ?');
        $s->execute([(string) ($_POST['eleve'] ?? ''), $id]);
        if ($s->fetch()) {
            db()->prepare('UPDATE students SET access_code = ? WHERE id = ?')
                ->execute([chiffrer(codeEleve()), (string) $_POST['eleve']]);
            redirige($retour, "Nouveau code tiré. L'ancien billet ne vaut plus rien.");
        }
        redirige($retour);
    }

    redirige($retour);
}

// ------------------------------------------------------------------ Lecture
$s = db()->prepare('SELECT * FROM students WHERE class_id = ?');
$s->execute([$id]);
$eleves = trierParPrenom(array_map(function ($e) {
    $e['first_name'] = dechiffrer($e['first_name']);
    $e['login']      = dechiffrer($e['login']);
    $e['code']       = dechiffrer($e['access_code']);
    return $e;
}, $s->fetchAll()));

$avecListe = array_values(array_filter($eleves, fn ($e) => (string) $e['login'] !== ''));
$sansListe = array_values(array_filter($eleves, fn ($e) => (string) $e['login'] === ''));

enTete('Liste de ' . $classe['name'], $prof, 'classes');
?>
<h1>Liste de <?= h($classe['name']) ?></h1>
<p class="gris-clair"><a href="classe.php?id=<?= h($id) ?>">← Conduire la séance</a></p>

<div class="carte">
    <h2>Coller la liste</h2>
    <p class="gris-clair" style="margin-top:0">Un élève par ligne. Le nom suffit —
    l'identifiant et le code se fabriquent tout seuls. Vous pouvez aussi les
    donner vous-même, séparés par un point-virgule :</p>
    <pre class="exemple">Léa Durand
Jean-Luc Martin ; jeanluc.martin
Emma Dupont ; emma.dupont ; 4KP2</pre>
    <p class="gris-clair"><b>Recoller la liste ne change aucun code déjà donné.</b>
    Seuls les élèves nouveaux en reçoivent un — les billets déjà distribués
    restent valables.</p>
    <form method="post">
        <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
        <input type="hidden" name="action" value="importer">
        <textarea name="liste" rows="8" placeholder="Léa Durand&#10;Tom Bernard&#10;…"></textarea>
        <p><button>Importer</button></p>
    </form>
</div>

<?php if ($avecListe): ?>
<div class="carte">
    <h2>Les billets <span class="gris-clair">(<?= count($avecListe) ?>)</span></h2>
    <p class="gris-clair" style="margin-top:0">Imprimez, découpez, distribuez.
    L'élève tape son identifiant et son code sur la page d'accueil du site.</p>
    <p><button type="button" class="bouton" onclick="window.print()">Imprimer les billets</button></p>

    <table class="a-lecran">
        <tr><th>Élève</th><th>Identifiant</th><th>Code</th><th>Vu</th><th></th></tr>
        <?php foreach ($avecListe as $e): ?>
        <tr>
            <td><b><?= h($e['first_name']) ?></b></td>
            <td><code><?= h($e['login']) ?></code></td>
            <td><span class="code-eleve"><?= h($e['code']) ?></span></td>
            <td class="gris-clair"><?= h(depuis($e['last_seen_at'])) ?></td>
            <td style="text-align:right">
                <form method="post" style="display:inline"
                      onsubmit="return confirm('Tirer un nouveau code pour <?= h($e['first_name']) ?> ? L\'ancien billet ne vaudra plus rien.')">
                    <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
                    <input type="hidden" name="action" value="nouveau-code">
                    <input type="hidden" name="eleve" value="<?= h($e['id']) ?>">
                    <button class="gris petit">Nouveau code</button>
                </form>
            </td>
        </tr>
        <?php endforeach; ?>
    </table>

    <!-- LES BILLETS, POUR L'IMPRIMANTE. Ils n'existent qu'à l'impression :
         à l'écran, le tableau ci-dessus dit la même chose en plus compact. -->
    <div class="billets">
        <?php foreach ($avecListe as $e): ?>
        <div class="billet">
            <div class="billet-nom"><?= h($e['first_name']) ?></div>
            <div class="billet-ligne">identifiant <b><?= h($e['login']) ?></b></div>
            <div class="billet-ligne">code <b class="billet-code"><?= h($e['code']) ?></b></div>
            <div class="billet-pied"><?= h($_SERVER['HTTP_HOST'] ?? 'AtoutMath') ?></div>
        </div>
        <?php endforeach; ?>
    </div>
</div>
<?php endif; ?>

<?php if ($sansListe): ?>
<div class="carte">
    <h2>Entrés par le code de la classe <span class="gris-clair">(<?= count($sansListe) ?>)</span></h2>
    <p class="gris-clair" style="margin-top:0">Ceux-là se sont déclarés eux-mêmes,
    avec le code <b><?= h($classe['join_code']) ?></b> et leur prénom. Ils n'ont pas
    d'identifiant : ajoutez-les à la liste ci-dessus pour leur en donner un.</p>
    <table>
        <?php foreach ($sansListe as $e): ?>
        <tr><td><b><?= h($e['first_name']) ?></b></td>
            <td class="gris-clair"><?= h(depuis($e['last_seen_at'])) ?></td></tr>
        <?php endforeach; ?>
    </table>
</div>
<?php endif; ?>

<style>
.exemple { background: #f1f5f9; border-radius: 9px; padding: 12px 14px;
           font-family: ui-monospace, Menlo, Consolas, monospace; font-size: .88rem;
           line-height: 1.6; margin: 0 0 14px; white-space: pre-wrap; }
.code-eleve { font-family: ui-monospace, Menlo, Consolas, monospace; font-weight: 800;
              letter-spacing: .12em; background: #eef2ff; color: #3730a3;
              padding: 3px 9px; border-radius: 7px; }
.billets { display: none; }
@media print {
    /* À L'IMPRESSION, IL NE RESTE QUE LES BILLETS. Le reste — l'en-tête, le
       formulaire, le tableau — n'a rien à faire sur une feuille qu'on découpe. */
    header, h1, main > p, .carte > h2, .carte > p, .carte > form, .exemple,
    table.a-lecran, .carte:not(:has(.billets)) { display: none !important; }
    body { background: #fff; }
    main { max-width: none; padding: 0; }
    .carte { border: none; padding: 0; margin: 0; }
    .billets { display: grid !important; grid-template-columns: 1fr 1fr;
               gap: 6mm; padding: 8mm; }
    .billet { border: 1px dashed #94a3b8; border-radius: 3mm; padding: 5mm 6mm;
              break-inside: avoid; }
    .billet-nom { font-size: 1.1rem; font-weight: 800; margin-bottom: 2mm; }
    .billet-ligne { font-size: .95rem; line-height: 1.7; }
    .billet-code { font-family: ui-monospace, monospace; letter-spacing: .18em;
                   font-size: 1.15rem; }
    .billet-pied { margin-top: 3mm; font-size: .78rem; color: #64748b; }
}
</style>
<?php piedDePage();
