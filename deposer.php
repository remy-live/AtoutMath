<?php
declare(strict_types=1);

/**
 * POSER LE SITE SANS CLIENT FTP — un seul fichier à transférer à la main.
 *
 * Rémy : « sur ovh j'ai une interface web pour le transfert de fichiers ? »
 *
 * LE PROBLÈME N'EST PAS D'AVOIR UNE INTERFACE, C'EST D'Y PASSER 536 FICHIERS.
 * Un explorateur de fichiers dans un panneau d'hébergeur sait très bien
 * transférer un fichier ; il sait mal en transférer cinq cents, répartis en
 * quarante dossiers, sans en perdre un en route — et un fichier perdu au milieu
 * de `js/ui/fiches/` ne se voit pas, il se découvre en cours.
 *
 * Alors on renverse : UN seul fichier passe par l'interface web (ce fichier-ci),
 * l'archive passe par le même chemin, et c'est le serveur qui fait le reste.
 * Deux transferts au lieu de cinq cents, et aucun risque d'oubli — une archive
 * est complète ou ne s'ouvre pas.
 *
 * CE FICHIER EST VOLONTAIREMENT SEUL AU MONDE : aucun `require`, aucune
 * dépendance à `api/`. C'est la condition pour qu'il fonctionne AVANT que le
 * site existe — au tout premier transfert, il est le seul fichier présent.
 *
 * QUI A LE DROIT DE S'EN SERVIR, et c'est la question qui compte, puisqu'un
 * script qui écrit des fichiers PHP sur un site public est exactement ce qu'un
 * intrus rêve de trouver :
 *
 *   · SITE DÉJÀ INSTALLÉ (api/config.php existe) → il faut être connecté comme
 *     professeur. Sinon, la page ne fait rien d'autre que renvoyer vers la
 *     connexion. C'est le cas courant : les mises à jour.
 *   · SITE ENCORE VIDE → la page fonctionne sans connexion, parce qu'il n'y a
 *     personne à qui demander de se connecter. La fenêtre de risque est alors
 *     EXACTEMENT la même que celle d'`install.php`, qui est ouverte au même
 *     moment et pour la même raison : le premier qui trouve l'adresse d'un site
 *     vide peut s'y installer. C'est pourquoi la marche à suivre dit, en
 *     capitales, d'installer TOUT DE SUITE.
 *
 * CE QU'IL REFUSE D'ÉCRIRE, quoi qu'il y ait dans l'archive :
 *   · tout chemin qui remonte (`../`), absolu, ou porteur d'une lettre de
 *     lecteur — la faille dite « zip slip », par laquelle une archive piégée
 *     écrit hors du dossier prévu ;
 *   · `api/config.php` — la clé de chiffrement du site ;
 *   · `api/data/` — la base, c'est-à-dire le travail de toutes les classes.
 * Nos archives ne contiennent rien de tout cela ; la règle existe pour l'archive
 * qui ne vient pas de nous.
 */

// `DEPOSER_ESSAI` permet aux essais de charger les décisions de ce fichier sans
// afficher la page — voir tools/testApi.php. Un fichier qui s'exécute tout seul
// ne se met pas à l'épreuve, et les règles ci-dessus méritent de l'être.
if (!defined('DEPOSER_ESSAI')) {
    define('DEPOSER_ESSAI', false);
}

const RACINE_SITE = __DIR__;

/**
 * LE CHEMIN D'UNE ENTRÉE D'ARCHIVE, RENDU SÛR — ou refusé.
 *
 * @return string|null le chemin relatif accepté, ou null s'il est refusé
 */
function cheminSur(string $nom): ?string
{
    $nom = str_replace('\\', '/', trim($nom));
    if ($nom === '' || $nom[0] === '/' || preg_match('#^[A-Za-z]:#', $nom)) {
        return null;
    }
    $bouts = [];
    foreach (explode('/', $nom) as $b) {
        if ($b === '' || $b === '.') {
            continue;
        }
        if ($b === '..') {
            return null;   // zip slip
        }
        $bouts[] = $b;
    }
    if (!$bouts) {
        return null;
    }
    $chemin = implode('/', $bouts);

    // CE QUI APPARTIENT AU SITE, ET NON AU LOGICIEL. Une mise à jour remplace
    // le logiciel ; elle ne touche jamais à la clé ni à la base. C'est ce qui
    // rend une republication sans danger — et il ne suffit pas que nos archives
    // en soient dépourvues, il faut que ce soit impossible.
    if ($chemin === 'api/config.php' || str_starts_with($chemin, 'api/data/')) {
        return null;
    }
    return $chemin;
}

/** Les archives posées à côté de ce fichier. */
function archivesPresentes(): array
{
    $l = glob(RACINE_SITE . '/*.zip') ?: [];
    usort($l, fn ($a, $b) => filemtime($b) <=> filemtime($a));
    return $l;
}

/** « 4,7 Mo » plutôt que « 4766938 ». */
function poids(int $octets): string
{
    if ($octets >= 1048576) {
        return number_format($octets / 1048576, 1, ',', ' ') . ' Mo';
    }
    return number_format($octets / 1024, 0, ',', ' ') . ' Ko';
}

/** Le plus petit des deux plafonds de transfert que PHP applique. */
function plafondTransfert(): int
{
    $lire = static function (string $v): int {
        $v = trim($v);
        if ($v === '') {
            return 0;
        }
        $n = (int) $v;
        return match (strtolower(substr($v, -1))) {
            'g' => $n * 1073741824,
            'm' => $n * 1048576,
            'k' => $n * 1024,
            default => $n,
        };
    };
    $a = $lire((string) ini_get('upload_max_filesize'));
    $b = $lire((string) ini_get('post_max_size'));
    $plafonds = array_filter([$a, $b]);
    return $plafonds ? (int) min($plafonds) : 0;
}

/**
 * Lire une archive : ce qui sera écrit, ce qui sera refusé, et quelle version.
 *
 * @return array{fichiers:list<string>,refuses:list<string>,version:string,erreur:string}
 */
function lireArchive(string $zipf): array
{
    if (!class_exists('ZipArchive')) {
        return ['fichiers' => [], 'refuses' => [], 'version' => '',
                'erreur' => "L'extension ZIP de PHP n'est pas active sur cet hébergement. "
                    . 'Il faudra passer par un client FTP (FileZilla).'];
    }
    $zip = new ZipArchive();
    if ($zip->open($zipf) !== true) {
        return ['fichiers' => [], 'refuses' => [], 'version' => '',
                'erreur' => "Cette archive ne s'ouvre pas : elle est incomplète ou abîmée. "
                    . 'Retransférez-la.'];
    }
    $fichiers = [];
    $refuses = [];
    $version = '';
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $nom = (string) $zip->getNameIndex($i);
        if (str_ends_with($nom, '/')) {
            continue;   // les dossiers, on les recrée nous-mêmes
        }
        $sur = cheminSur($nom);
        if ($sur === null) {
            $refuses[] = $nom;
            continue;
        }
        $fichiers[] = $sur;
        if ($sur === 'index.html' && $version === '') {
            $debut = (string) $zip->getFromIndex($i, 8192);
            $version = (preg_match('/\?v=(\d+)/', $debut, $m) ? $m[1] : '');
        }
    }
    $zip->close();
    return ['fichiers' => $fichiers, 'refuses' => $refuses,
            'version' => $version, 'erreur' => ''];
}

/**
 * Écrire l'archive sur le disque.
 *
 * ON ÉCRIT PAR FLUX, entrée par entrée, plutôt que d'appeler `extractTo()`.
 * `extractTo()` prend l'archive telle quelle : la vérification des chemins
 * faite plus haut ne servirait à rien, puisqu'il ne la consulterait pas.
 *
 * @return array{ecrits:int,erreurs:list<string>}
 */
function poserArchive(string $zipf): array
{
    $zip = new ZipArchive();
    if ($zip->open($zipf) !== true) {
        return ['ecrits' => 0, 'erreurs' => ["l'archive ne s'ouvre pas"]];
    }
    $ecrits = 0;
    $erreurs = [];
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $nom = (string) $zip->getNameIndex($i);
        if (str_ends_with($nom, '/')) {
            continue;
        }
        $sur = cheminSur($nom);
        if ($sur === null) {
            continue;
        }
        $cible = RACINE_SITE . '/' . $sur;
        $dossier = dirname($cible);
        if (!is_dir($dossier) && !@mkdir($dossier, 0755, true) && !is_dir($dossier)) {
            $erreurs[] = $sur . ' (dossier impossible à créer)';
            continue;
        }
        $flux = $zip->getStream($nom);
        if (!$flux) {
            $erreurs[] = $sur . ' (illisible dans l\'archive)';
            continue;
        }
        $sortie = @fopen($cible, 'wb');
        if (!$sortie) {
            fclose($flux);
            $erreurs[] = $sur . ' (écriture refusée)';
            continue;
        }
        stream_copy_to_stream($flux, $sortie);
        fclose($sortie);
        fclose($flux);
        $ecrits++;
    }
    $zip->close();
    return ['ecrits' => $ecrits, 'erreurs' => $erreurs];
}

if (DEPOSER_ESSAI) {
    return;   // les essais n'ont besoin que des fonctions ci-dessus
}

// ---------------------------------------------------------------- La page ---

$installe = is_file(RACINE_SITE . '/api/config.php');

session_set_cookie_params([
    'lifetime' => 0, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax',
    'secure' => (($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off'),
]);
session_name('atoutmath_prof');
session_start();
$connecte = !empty($_SESSION['prof']);

if (empty($_SESSION['jeton_depot'])) {
    $_SESSION['jeton_depot'] = bin2hex(random_bytes(16));
}
$jeton = (string) $_SESSION['jeton_depot'];

function e(?string $s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}

$mot = '';
$erreur = '';
$apercu = null;
$fait = null;
$choisie = '';

if (!$installe || $connecte) {
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
        if (!hash_equals($jeton, (string) ($_POST['jeton'] ?? ''))) {
            $erreur = 'Formulaire expiré. Rechargez la page.';
        } else {
            $action = (string) ($_POST['action'] ?? '');

            // --- Recevoir l'archive par le navigateur
            if ($action === 'televerser') {
                $f = $_FILES['archive'] ?? null;
                if (!$f || ($f['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
                    $erreur = 'Choisissez une archive.';
                } elseif (($f['error'] ?? 1) !== UPLOAD_ERR_OK) {
                    // C'EST L'ERREUR QU'ON RENCONTRERA VRAIMENT sur un
                    // hébergement mutualisé : le plafond de transfert de PHP
                    // est souvent à 2 Mo, l'archive en fait plus du double. On
                    // ne dit pas « erreur 1 », on dit quoi faire.
                    $erreur = 'Le transfert a échoué. Le plafond de cet hébergement est de '
                        . poids(plafondTransfert()) . ' ; déposez plutôt l\'archive '
                        . 'à côté de ce fichier avec l\'explorateur de votre hébergeur, '
                        . 'puis rechargez cette page.';
                } else {
                    $nom = basename((string) $f['name']);
                    if (!preg_match('/^[\w.-]+\.zip$/', $nom)) {
                        $erreur = 'Ce fichier n\'est pas une archive .zip.';
                    } elseif (!@move_uploaded_file($f['tmp_name'], RACINE_SITE . '/' . $nom)) {
                        $erreur = 'Impossible d\'écrire l\'archive ici. Le dossier n\'est '
                            . 'peut-être pas accessible en écriture.';
                    } else {
                        $choisie = $nom;
                        $mot = 'Archive reçue.';
                    }
                }
            }

            if ($action === 'apercu' || ($choisie !== '' && $erreur === '')) {
                $nom = $choisie !== '' ? $choisie : basename((string) ($_POST['archive'] ?? ''));
                $chemin = RACINE_SITE . '/' . $nom;
                if (!is_file($chemin)) {
                    $erreur = 'Archive introuvable.';
                } else {
                    $apercu = lireArchive($chemin) + ['nom' => $nom, 'poids' => filesize($chemin)];
                    if ($apercu['erreur'] !== '') {
                        $erreur = $apercu['erreur'];
                        $apercu = null;
                    }
                }
            }

            if ($action === 'poser') {
                $nom = basename((string) ($_POST['archive'] ?? ''));
                $chemin = RACINE_SITE . '/' . $nom;
                if (!is_file($chemin)) {
                    $erreur = 'Archive introuvable.';
                } else {
                    $fait = poserArchive($chemin);
                    if (($_POST['effacer'] ?? '') === 'oui' && !$fait['erreurs']) {
                        @unlink($chemin);
                    }
                    // L'installation a pu naître de ce dépôt : on relit.
                    $installe = is_file(RACINE_SITE . '/api/config.php');
                }
            }
        }
    }
}

$archives = archivesPresentes();
?><!doctype html>
<html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Poser AtoutMath</title>
<style>
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { font: 15px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; margin: 0;
       background: #f6f7fb; color: #1a202c; }
main { max-width: 720px; margin: 0 auto; padding: 34px 18px 80px; }
h1 { font-size: 1.5rem; margin: 0 0 6px; }
h2 { font-size: 1.05rem; margin: 0 0 10px; }
.sous { color: #64748b; margin: 0 0 22px; }
.carte { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
         padding: 18px; margin-bottom: 16px; }
.mot { background: #f0fdf4; border: 1px solid #bbf7d0; color: #14532d;
       border-radius: 10px; padding: 11px 14px; margin-bottom: 16px; font-weight: 600; }
.erreur { background: #fff5f5; border: 1px solid #fecaca; color: #7f1d1d;
          border-radius: 10px; padding: 11px 14px; margin-bottom: 16px; font-weight: 600; }
button, .bouton { font: inherit; font-weight: 700; padding: 10px 17px; border-radius: 9px;
       border: none; background: #4f46e5; color: #fff; cursor: pointer;
       text-decoration: none; display: inline-block; }
button.gris { background: #e2e8f0; color: #1a202c; }
input[type=file] { width: 100%; padding: 9px 0; }
.gris-clair { color: #64748b; font-size: .9rem; }
ul { margin: 8px 0; padding-left: 20px; }
li { margin: 3px 0; }
code { font-family: ui-monospace, Menlo, Consolas, monospace; background: #eef2ff;
       color: #3730a3; padding: 2px 6px; border-radius: 6px; font-size: .9rem; }
.marche { counter-reset: pas; list-style: none; padding: 0; }
.marche li { counter-increment: pas; margin: 10px 0 10px 34px; position: relative; }
.marche li::before { content: counter(pas); position: absolute; left: -34px; top: 0;
    width: 24px; height: 24px; border-radius: 50%; background: #4f46e5; color: #fff;
    font-weight: 800; font-size: .82rem; display: grid; place-items: center; }
.urgent { border-color: #fbbf24; background: #fffbeb; }
</style></head><body><main>

<h1>Poser AtoutMath</h1>
<p class="sous">Un fichier à transférer, et le serveur fait le reste.</p>

<?php if ($mot): ?><div class="mot"><?= e($mot) ?></div><?php endif; ?>
<?php if ($erreur): ?><div class="erreur"><?= e($erreur) ?></div><?php endif; ?>

<?php if ($installe && !$connecte): ?>

    <div class="carte">
        <h2>Connectez-vous d'abord</h2>
        <p>Ce site est déjà installé. Poser une archive remplace les fichiers du
           logiciel : c'est réservé au professeur.</p>
        <p><a class="bouton" href="api/admin/index.php">Aller à l'administration</a></p>
        <p class="gris-clair">Revenez ensuite sur cette page.</p>
    </div>

<?php elseif ($fait !== null): ?>

    <div class="carte">
        <h2><?= $fait['erreurs'] ? 'Posé, mais pas entièrement' : "C'est posé" ?></h2>
        <p><b><?= (int) $fait['ecrits'] ?></b> fichiers écrits.</p>
        <?php if ($fait['erreurs']): ?>
            <p class="gris-clair">Ces fichiers n'ont pas pu être écrits — le dossier
               n'est probablement pas accessible en écriture :</p>
            <ul class="gris-clair"><?php foreach (array_slice($fait['erreurs'], 0, 8) as $x): ?>
                <li><?= e($x) ?></li><?php endforeach; ?></ul>
        <?php endif; ?>
    </div>

    <?php if (!$installe): ?>
    <div class="carte urgent">
        <h2>Maintenant, tout de suite</h2>
        <p>Le site est en ligne mais <b>personne n'en est encore le professeur</b>.
           Tant que l'installation n'est pas faite, qui trouve cette adresse peut
           s'installer à votre place.</p>
        <p><a class="bouton" href="api/install.php">Installer maintenant</a></p>
    </div>
    <?php else: ?>
    <div class="carte">
        <h2>Le contrôle</h2>
        <p>Vérifiez que rien n'est téléchargeable de l'extérieur.</p>
        <p><a class="bouton" href="api/admin/sante.php">Ouvrir la page de santé</a></p>
    </div>
    <?php endif; ?>

<?php elseif ($apercu !== null): ?>

    <div class="carte">
        <h2>Voici ce qui va être posé</h2>
        <p class="gris-clair" style="margin-top:0">Rien n'est encore écrit.</p>
        <ul>
            <li><b><?= count($apercu['fichiers']) ?></b> fichiers
                — <?= e(poids((int) $apercu['poids'])) ?>
                <?= $apercu['version'] !== '' ? ' — version ' . e($apercu['version']) : '' ?></li>
            <li>ils remplaceront les fichiers du même nom, et laisseront les autres
                en place</li>
            <li><code>api/config.php</code> et <code>api/data/</code> ne seront
                <b>pas</b> touchés</li>
        </ul>
        <?php if ($apercu['refuses']): ?>
            <p class="gris-clair"><b><?= count($apercu['refuses']) ?> entrée(s) refusée(s)</b>
               — chemins dangereux ou protégés :
               <?= e(implode(' · ', array_slice($apercu['refuses'], 0, 5))) ?></p>
        <?php endif; ?>
        <form method="post">
            <input type="hidden" name="jeton" value="<?= e($jeton) ?>">
            <input type="hidden" name="action" value="poser">
            <input type="hidden" name="archive" value="<?= e($apercu['nom']) ?>">
            <p class="gris-clair">
                <label><input type="checkbox" name="effacer" value="oui" checked>
                Effacer l'archive du serveur une fois posée</label>
            </p>
            <p><button>Poser <?= count($apercu['fichiers']) ?> fichiers</button>
               <a class="bouton gris" href="deposer.php">Annuler</a></p>
        </form>
    </div>

<?php else: ?>

    <?php if ($archives): ?>
    <div class="carte">
        <h2>Archive trouvée sur le serveur</h2>
        <?php foreach ($archives as $a): ?>
        <form method="post" style="margin-bottom:8px">
            <input type="hidden" name="jeton" value="<?= e($jeton) ?>">
            <input type="hidden" name="action" value="apercu">
            <input type="hidden" name="archive" value="<?= e(basename($a)) ?>">
            <button><?= e(basename($a)) ?> — <?= e(poids((int) filesize($a))) ?></button>
        </form>
        <?php endforeach; ?>
    </div>
    <?php endif; ?>

    <div class="carte">
        <h2>Envoyer l'archive depuis cet ordinateur</h2>
        <form method="post" enctype="multipart/form-data">
            <input type="hidden" name="jeton" value="<?= e($jeton) ?>">
            <input type="hidden" name="action" value="televerser">
            <input type="file" name="archive" accept=".zip,application/zip" required>
            <p class="gris-clair">Plafond de cet hébergement :
               <b><?= e(poids(plafondTransfert())) ?></b>.
               Si l'archive est plus lourde, déposez-la à côté de
               <code>deposer.php</code> avec l'explorateur de fichiers de votre
               hébergeur, puis rechargez cette page : elle apparaîtra ci-dessus.</p>
            <p><button>Envoyer</button></p>
        </form>
    </div>

    <div class="carte">
        <h2>La marche à suivre</h2>
        <ol class="marche">
            <li>Transférer <code>deposer.php</code> et l'archive dans <code>www/</code>
                — deux fichiers, par l'explorateur de votre hébergeur.</li>
            <li>Ouvrir cette page et poser l'archive.</li>
            <li>Ouvrir <code>api/install.php</code> <b>tout de suite</b>.</li>
            <li>Ouvrir <code>api/admin/sante.php</code>.</li>
        </ol>
        <p class="gris-clair">Pour les mises à jour suivantes, seule l'archive
           change : cette page reste, et demandera votre connexion.</p>
    </div>

<?php endif; ?>

</main></body></html>
