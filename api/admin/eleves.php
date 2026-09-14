<?php
declare(strict_types=1);

/**
 * LA LISTE DE LA CLASSE — coller ou déposer, voir, confirmer, imprimer.
 *
 * Rémy : « pour la connexion, fais aussi une connexion avec identifiant et code
 * élève, je fournirai la liste », puis « j'espère qu'on pourra importer des CSV
 * et ou du presse-papier et je peux choisir un mdp générique pour tous mes
 * élèves et je peux leur recréer un mdp », et enfin « il faut qqch de
 * confortable et facile ».
 *
 * L'APERÇU EST LA PIÈCE MAÎTRESSE, et c'est lui qui rend le reste confortable.
 * Lire une liste de professeur demande des devinettes — quel séparateur, y a-t-il
 * une ligne d'en-tête, cette deuxième colonne est-elle un identifiant ou la
 * moitié du nom. Aucune devinette n'est sûre. On montre donc CE QUI VA SE
 * PASSER, ligne par ligne, avant d'écrire quoi que ce soit : « nouveau »,
 * « déjà là, code inchangé », « rattaché à la Léa entrée par le code de la
 * classe ». Le professeur voit l'erreur avant qu'elle existe, au lieu de la
 * découvrir dans une liste de trente.
 *
 * TROIS BOGUES QUE CETTE PAGE CORRIGE, et le premier était grave :
 *
 *   1. L'ancienne page conseillait, pour les élèves entrés par le code de la
 *      classe : « ajoutez-les à la liste ci-dessus pour leur donner un
 *      identifiant. » Ce conseil CRÉAIT UN DOUBLON. Mesuré : une Léa entrée par
 *      le code, un import « Léa Durand », et l'on obtient deux Léa — le travail
 *      sur l'une, le billet sur l'autre. On rattache maintenant, par le prénom,
 *      dans la même classe.
 *   2. Un élève ne pouvait pas être retiré. Un départ en cours d'année, une
 *      faute de frappe qui crée un élève fantôme : rien à faire.
 *   3. Un élève déjà inscrit dans une AUTRE classe était refusé, sans recours.
 *      Il change de classe en janvier ; on le déplace, maintenant.
 */

require_once __DIR__ . '/_socle.php';
require_once __DIR__ . '/../lib/coffre.php';
require_once __DIR__ . '/../lib/liste.php';
// TOUT CE QUI DÉCIDE ET TOUT CE QUI ÉCRIT VIT DANS `lib/eleves.php`, et
// nulle part ailleurs : cette page et les routes JSON de l'application
// s'en servent toutes les deux. Deux écrans, une seule mise en œuvre —
// sans quoi l'un des deux abîmerait un jour des données d'élèves sans
// qu'on sache lequel.
require_once __DIR__ . '/../lib/eleves.php';

$prof = profConnecte();
$id = (string) ($_GET['id'] ?? '');

$stmt = db()->prepare('SELECT * FROM classes WHERE id = ? AND teacher_id = ?');
$stmt->execute([$id, $prof['id']]);
$classe = $stmt->fetch();
if (!$classe) {
    redirige('index.php', "Cette classe n'existe pas.");
}
$retour = 'eleves.php?id=' . urlencode($id);

// ---------------------------------------------------------------- Le décor --

$apercu = null;   // ['lignes' => [...], 'ignorees' => [...], 'texte' => '…']

// ------------------------------------------------------------------ Actions --
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    exigerJeton();
    $action = (string) ($_POST['action'] ?? '');

    // --- Lire (coller ou fichier) et MONTRER, sans rien écrire
    if ($action === 'apercu') {
        $texte = (string) ($_POST['liste'] ?? '');

        // LE FICHIER L'EMPORTE SUR LE COLLAGE : s'il en a déposé un, c'est de
        // lui qu'il parle. On ne mélange pas les deux — un import moitié
        // fichier moitié presse-papier serait impossible à relire.
        $f = $_FILES['fichier'] ?? null;
        if ($f && ($f['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK && is_uploaded_file($f['tmp_name'])) {
            if (($f['size'] ?? 0) > 512 * 1024) {
                redirige($retour, 'Ce fichier fait plus de 500 Ko : ce n\'est pas une liste de classe.');
            }
            $texte = (string) file_get_contents($f['tmp_name']);
        }
        if (trim($texte) === '') {
            redirige($retour, 'Collez une liste, ou choisissez un fichier.');
        }

        $commun = trim((string) ($_POST['code_commun'] ?? ''));
        if (($_POST['genre_code'] ?? '') !== 'commun') {
            $commun = '';
        } elseif (!preg_match('/^[A-Za-z0-9]{3,12}$/', $commun)) {
            redirige($retour, 'Le code commun doit faire de 3 à 12 lettres ou chiffres.');
        }

        $apercu = apercuDeListe($texte, $commun, $id, (string) $prof['id']);
        if (!$apercu) {
            redirige($retour, "Aucun élève reconnu dans ce que vous avez donné.");
        }
    }

    // --- Écrire pour de bon, à partir de la liste normalisée de l'aperçu
    if ($action === 'importer') {
        // On relit la liste normalisée : plus aucune devinette, et donc aucune
        // chance que l'import comprenne autre chose que ce qui a été montré.
        $bilan = importerListe((string) ($_POST['liste'] ?? ''), $id, (string) $prof['id']);
        redirige($retour, phraseDImport($bilan));
    }

    // --- Un nouveau code pour un élève
    if ($action === 'nouveau-code') {
        if (nouveauCodePourEleve((string) ($_POST['eleve'] ?? ''), $id)) {
            redirige($retour, "Nouveau code tiré. L'ancien billet ne vaut plus rien.");
        }
        redirige($retour);
    }

    // --- Un nouveau code pour TOUT LE MONDE, ou le même code pour tout le monde
    if ($action === 'codes-classe') {
        $commun = trim((string) ($_POST['code_commun'] ?? ''));
        $memeCode = ($_POST['genre_code'] ?? '') === 'commun';
        if ($memeCode && !preg_match('/^[A-Za-z0-9]{3,12}$/', $commun)) {
            redirige($retour, 'Le code commun doit faire de 3 à 12 lettres ou chiffres.');
        }
        $n = refaireLesCodes($id, $memeCode ? $commun : '');
        redirige($retour, $n . ' code(s) refaits. Réimprimez les billets : '
            . 'les anciens ne valent plus rien.');
    }

    // --- Retirer un élève de la liste
    if ($action === 'retirer') {
        $qui = retirerEleve((string) ($_POST['eleve'] ?? ''), $id);
        if ($qui !== '') {
            redirige($retour, $qui . ' a été retiré, avec tout son travail.');
        }
        redirige($retour);
    }

    if ($apercu === null) {
        redirige($retour);
    }
}

// ------------------------------------------------------------------ Lecture --
$eleves = elevesDeLaClasse($id);

$avecListe = array_values(array_filter($eleves, fn ($e) => (string) $e['login'] !== ''));
$sansListe = array_values(array_filter($eleves, fn ($e) => (string) $e['login'] === ''));

// Un code proposé d'avance dans le champ « le même pour toute la classe » :
// il n'a plus qu'à le garder. Confortable, c'est aussi n'avoir rien à inventer.
$propose = codeEleve(4);

enTete('Liste de ' . $classe['name'], $prof, 'classes');
?>
<h1>Liste de <?= h($classe['name']) ?></h1>
<p class="gris-clair"><a href="classe.php?id=<?= h($id) ?>">← Conduire la séance</a></p>

<?php if ($apercu): ?>
<!-- ============================================ L'APERÇU, avant d'écrire === -->
<div class="carte apercu">
    <h2>Voici ce qui va se passer</h2>
    <p class="gris-clair" style="margin-top:0">Rien n'est encore enregistré.
       Vérifiez, puis confirmez — ou revenez en arrière et corrigez votre liste.</p>
    <table>
        <tr><th>Élève</th><th>Identifiant</th><th>Code</th><th>Ce qui va se passer</th></tr>
        <?php foreach ($apercu['lignes'] as $l):
            // Le sort est DÉJÀ décidé — `apercuDeListe` l'a calculé avec la
            // fonction que l'import utilisera. Le recalculer ici rouvrirait
            // précisément la porte qu'on vient de fermer : deux décisions pour
            // une seule question.
            $sort = ['sort' => $l['sort'], 'dit' => $l['dit']]; ?>
        <tr class="sort-<?= h($sort['sort']) ?>">
            <td><b><?= h($l['nom']) ?></b></td>
            <td><code><?= h($l['login']) ?></code></td>
            <td><?php if (in_array($sort['sort'], ['connu', 'deplace', 'homonyme'], true)): ?>
                    <span class="gris-clair">inchangé</span>
                <?php elseif ($l['code'] !== ''): ?>
                    <span class="code-eleve"><?= h($l['code']) ?></span>
                <?php else: ?>
                    <span class="gris-clair">tiré au hasard</span>
                <?php endif; ?></td>
            <td class="gris-clair"><?= h($sort['dit']) ?></td>
        </tr>
        <?php endforeach; ?>
    </table>

    <?php if ($apercu['ignorees']): ?>
    <p class="gris-clair"><b><?= count($apercu['ignorees']) ?> ligne(s) non comprise(s)</b> —
       elles seront ignorées : <?= h(implode(' · ', array_slice($apercu['ignorees'], 0, 4))) ?></p>
    <?php endif; ?>

    <form method="post" style="margin-top:14px">
        <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
        <input type="hidden" name="action" value="importer">
        <input type="hidden" name="liste" value="<?= h($apercu['texte']) ?>">
        <button>Confirmer — <?= count($apercu['lignes']) ?> élève(s)</button>
        <a class="bouton gris-lien" href="<?= h($retour) ?>">Annuler</a>
    </form>
</div>
<?php endif; ?>

<!-- ================================================== AJOUTER DES ÉLÈVES === -->
<div class="carte">
    <h2>Ajouter des élèves</h2>
    <form method="post" enctype="multipart/form-data">
        <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
        <input type="hidden" name="action" value="apercu">

        <div class="deux">
            <div>
                <label for="liste">Coller la liste</label>
                <textarea id="liste" name="liste" rows="7"
                          placeholder="Léa Durand&#10;Tom Bernard&#10;Maëlle Nguyên"></textarea>
                <p class="gris-clair">Un élève par ligne. Le nom suffit — l'identifiant
                   se fabrique tout seul. Les formats de tableur passent aussi :</p>
                <pre class="exemple">DURAND;Léa
Tom Bernard;tom.bernard
Emma Dupont;emma.dupont;4KP2</pre>
            </div>
            <div>
                <label for="fichier">…ou déposer un fichier</label>
                <input id="fichier" type="file" name="fichier" accept=".csv,.txt,text/csv,text/plain">
                <p class="gris-clair">Un export de Pronote ou d'un tableur, tel quel.
                   Point-virgule ou virgule, ligne d'en-tête ou non, accents d'Excel :
                   c'est lu sans rien préparer.</p>

                <label>Le code des billets</label>
                <label class="choix"><input type="radio" name="genre_code" value="chacun" checked>
                    <span>Un code différent pour chaque élève <b>(conseillé)</b></span></label>
                <label class="choix"><input type="radio" name="genre_code" value="commun">
                    <span>Le même code pour toute la classe</span>
                    <input type="text" name="code_commun" maxlength="12"
                           value="<?= h($propose) ?>" class="petit-champ"></label>
                <p class="gris-clair prudence">Avec un code commun, un élève qui devine
                   l'identifiant d'un autre entre à sa place — ils sont prévisibles.
                   Commode pour une séance d'essai, à éviter pour un devoir noté.</p>
            </div>
        </div>
        <p><button>Voir ce qui sera ajouté</button></p>
    </form>
</div>

<?php if ($avecListe): ?>
<!-- ========================================================= LES BILLETS === -->
<div class="carte">
    <h2>Les billets <span class="gris-clair">(<?= count($avecListe) ?>)</span></h2>
    <p class="gris-clair" style="margin-top:0">Imprimez, découpez, distribuez.
    L'élève tape son identifiant et son code sur la page d'accueil du site.</p>
    <p class="a-lecran">
        <button type="button" class="bouton" onclick="window.print()">Imprimer les billets</button>
    </p>

    <table class="a-lecran">
        <tr><th>Élève</th><th>Identifiant</th><th>Code</th><th>Vu</th><th></th></tr>
        <?php foreach ($avecListe as $e): ?>
        <tr>
            <td><b><?= h($e['first_name']) ?></b></td>
            <td><code><?= h($e['login']) ?></code></td>
            <td><span class="code-eleve"><?= h($e['code']) ?></span></td>
            <td class="gris-clair"><?= h(depuis($e['last_seen_at'])) ?></td>
            <td style="text-align:right; white-space:nowrap">
                <form method="post" style="display:inline"
                      onsubmit="return confirm('Tirer un nouveau code pour <?= h($e['first_name']) ?> ? L\'ancien billet ne vaudra plus rien.')">
                    <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
                    <input type="hidden" name="action" value="nouveau-code">
                    <input type="hidden" name="eleve" value="<?= h($e['id']) ?>">
                    <button class="gris petit">Nouveau code</button>
                </form>
                <form method="post" style="display:inline"
                      onsubmit="return confirm('Retirer <?= h($e['first_name']) ?> de la classe ? Tout son travail sera effacé, et c\'est sans retour.')">
                    <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
                    <input type="hidden" name="action" value="retirer">
                    <input type="hidden" name="eleve" value="<?= h($e['id']) ?>">
                    <button class="gris petit">Retirer</button>
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

<!-- ================================= REFAIRE LES CODES DE TOUTE LA CLASSE === -->
<div class="carte a-lecran">
    <h2>Refaire tous les codes</h2>
    <p class="gris-clair" style="margin-top:0">Une classe qui s'est échangé les
       billets, un trimestre qui commence : on repart à neuf en une fois.
       <b>Les anciens billets cessent aussitôt de fonctionner</b> — il faudra
       réimprimer.</p>
    <form method="post"
          onsubmit="return confirm('Refaire le code de tous les élèves de la classe ? Les billets déjà distribués ne vaudront plus rien.')">
        <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
        <input type="hidden" name="action" value="codes-classe">
        <label class="choix"><input type="radio" name="genre_code" value="chacun" checked>
            <span>Un code différent pour chacun</span></label>
        <label class="choix"><input type="radio" name="genre_code" value="commun">
            <span>Le même code pour tous</span>
            <input type="text" name="code_commun" maxlength="12"
                   value="<?= h($propose) ?>" class="petit-champ"></label>
        <p><button class="gris">Refaire les codes</button></p>
    </form>
</div>
<?php endif; ?>

<?php if ($sansListe): ?>
<!-- ============================ ENTRÉS PAR LE CODE, SANS ÊTRE SUR LA LISTE === -->
<div class="carte a-lecran">
    <h2>Entrés par le code de la classe <span class="gris-clair">(<?= count($sansListe) ?>)</span></h2>
    <p class="gris-clair" style="margin-top:0">Ceux-là se sont déclarés eux-mêmes,
    avec le code <b><?= h($classe['join_code']) ?></b> et leur prénom. Ils n'ont pas
    de billet. Ajoutez-les à votre liste ci-dessus : <b>ils garderont leur
    travail</b>, l'aperçu vous le dira.</p>
    <table>
        <?php foreach ($sansListe as $e): ?>
        <tr>
            <td><b><?= h($e['first_name']) ?></b></td>
            <td class="gris-clair"><?= h(depuis($e['last_seen_at'])) ?></td>
            <td style="text-align:right">
                <form method="post" style="display:inline"
                      onsubmit="return confirm('Retirer <?= h($e['first_name']) ?> ? Tout son travail sera effacé, et c\'est sans retour.')">
                    <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
                    <input type="hidden" name="action" value="retirer">
                    <input type="hidden" name="eleve" value="<?= h($e['id']) ?>">
                    <button class="gris petit">Retirer</button>
                </form>
            </td>
        </tr>
        <?php endforeach; ?>
    </table>
</div>
<?php endif; ?>

<style>
.exemple { background: #f1f5f9; border-radius: 9px; padding: 10px 12px;
           font-family: ui-monospace, Menlo, Consolas, monospace; font-size: .84rem;
           line-height: 1.6; margin: 0; white-space: pre-wrap; }
.code-eleve { font-family: ui-monospace, Menlo, Consolas, monospace; font-weight: 800;
              letter-spacing: .12em; background: #eef2ff; color: #3730a3;
              padding: 3px 9px; border-radius: 7px; }
.deux { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
@media (max-width: 760px) { .deux { grid-template-columns: 1fr; } }
.choix { display: flex; align-items: center; gap: 9px; font-weight: 500;
         margin: 6px 0; font-size: .92rem; }
.choix input[type=radio] { width: auto; flex: 0 0 auto; margin: 0; }
.choix span { flex: 0 1 auto; }
.petit-champ { width: 7em !important; text-transform: uppercase;
               font-family: ui-monospace, Menlo, Consolas, monospace;
               letter-spacing: .1em; font-weight: 700; }
.prudence { border-left: 3px solid #fbbf24; padding-left: 10px; margin-top: 10px; }
input[type=file] { width: 100%; padding: 8px 0; }
.gris-lien { background: #e2e8f0; color: #1a202c; margin-left: 8px; }
/* L'aperçu se voit tout de suite : c'est la seule chose à lire sur la page. */
.apercu { border-color: #c7d2fe; box-shadow: 0 6px 22px rgba(79,70,229,.10); }
.apercu tr.sort-refuse td, .apercu tr.sort-homonyme td { background: #fff5f5; }
.apercu tr.sort-rattache td, .apercu tr.sort-deplace td { background: #f0fdf4; }
.billets { display: none; }
@media print {
    /* À L'IMPRESSION, IL NE RESTE QUE LES BILLETS. Le reste — l'en-tête, les
       formulaires, les tableaux — n'a rien à faire sur une feuille qu'on découpe. */
    /* `.mot` est le bandeau vert « 3 élèves ajoutés » : utile à l'écran,
       absurde en haut d'une feuille de billets qu'on va découper. */
    header, h1, main > p, .mot, .carte > h2, .carte > p, .carte > form, .exemple,
    .a-lecran, .apercu, .carte:not(:has(.billets)) { display: none !important; }
    body { background: #fff; }
    main { max-width: none; padding: 0; }
    .carte { border: none; padding: 0; margin: 0; box-shadow: none; }
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
