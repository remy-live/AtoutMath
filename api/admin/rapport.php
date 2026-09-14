<?php
declare(strict_types=1);

/**
 * LE RAPPORT — tout ce qu'il faut savoir sur cet hébergement, en un bloc.
 *
 * Rémy : « fais une page avec toutes les infos dont tu as besoin ».
 *
 * POURQUOI CETTE PAGE EXISTE. Chaque fois qu'une chose ne marche pas sur son
 * hébergement, la conversation prend le même tour : quelle version de PHP ?
 * l'extension zip est-elle là ? le `.htaccess` s'applique-t-il ? quel est le
 * plafond d'envoi ? Six questions, six allers-retours, et le temps que la
 * réponse arrive, on a oublié pourquoi on demandait. Ici, il ouvre la page, il
 * clique « Copier », il colle. Une fois.
 *
 * CE QU'ELLE NE CONTIENT PAS, ET C'EST LA MOITIÉ DU TRAVAIL. Un rapport de
 * diagnostic est fait pour être envoyé — par courriel, dans une conversation,
 * peut-être à quelqu'un d'autre un jour. Il ne doit donc porter AUCUN secret :
 *
 *   · ni `app_secret`, ni `data_key`, ni mot de passe de base : on n'en dit
 *     que la LONGUEUR, ce qui suffit à savoir s'ils ont été fabriqués
 *     correctement et ne permet pas de les deviner ;
 *   · aucun prénom d'élève, aucun identifiant, aucun code de billet : on n'en
 *     donne que le NOMBRE ;
 *   · le nom du fichier de base est réduit à sa forme (`atoutmath-….sqlite`),
 *     parce que ce nom est tiré au hasard exprès — l'écrire dans un rapport
 *     qu'on colle quelque part annulerait cette précaution.
 *
 * Un test le vérifie en fabriquant une configuration aux secrets reconnaissables
 * et en cherchant leurs traces dans le rapport rendu.
 *
 * ELLE EST DERRIÈRE LA CONNEXION DU PROFESSEUR, évidemment : la liste des
 * extensions et des chemins d'un serveur est ce qu'un intrus regarde en
 * premier. Avant l'installation, c'est `install.php` qui fait ce travail — il a
 * ses propres diagnostics, et il n'y a alors rien à protéger.
 */

require_once __DIR__ . '/_socle.php';
require_once __DIR__ . '/../lib/sante.php';
require_once __DIR__ . '/../lib/coffre.php';

$prof = profConnecte();
$cfg = config();

/** La longueur d'un secret, jamais sa valeur. */
function mesureSecret($v): string
{
    $s = (string) $v;
    if ($s === '') {
        return 'ABSENT';
    }
    return strlen($s) . ' signes' . (strlen($s) >= 32 ? '' : '  ⚠ court');
}

/**
 * Aligner une étiquette, EN CARACTÈRES ET NON EN OCTETS.
 *
 * `sprintf('%-18s')` compte des octets : « élèves » et « événements » pèsent
 * deux octets par accent en UTF-8, et leur colonne partait de travers dans un
 * rapport dont toute la lisibilité tient à ses colonnes. Mesuré à l'écran, pas
 * deviné.
 */
function etiquette(string $mot, int $large = 18): string
{
    $n = mb_strlen($mot, 'UTF-8');
    return $mot . str_repeat(' ', max(1, $large - $n));
}

/** Une valeur de php.ini, telle quelle. */
function ini(string $cle): string
{
    $v = ini_get($cle);
    return $v === false || $v === '' ? '(non défini)' : (string) $v;
}

// --- Ce que le serveur dit de lui-même ------------------------------------

$extensions = [];
foreach (['pdo_sqlite', 'pdo_mysql', 'curl', 'openssl', 'mbstring', 'zip',
          'json', 'session', 'fileinfo'] as $e) {
    $extensions[$e] = extension_loaded($e);
}

$racineWeb = realpath($_SERVER['DOCUMENT_ROOT'] ?? '') ?: (string) ($_SERVER['DOCUMENT_ROOT'] ?? '');
$dossierApi = realpath(dirname(__DIR__)) ?: dirname(__DIR__);

// La version du logiciel, lue là où elle est écrite.
$version = '(index.html introuvable)';
$indexHtml = dirname($dossierApi) . '/index.html';
if (is_file($indexHtml)) {
    $debut = (string) file_get_contents($indexHtml, false, null, 0, 8192);
    $version = preg_match('/\?v=(\d+)/', $debut, $m) ? 'v' . $m[1] : '(illisible)';
}

// --- Ce que la base contient, en nombres seulement -------------------------

$compte = [];
foreach (['teachers' => 'professeurs', 'classes' => 'classes', 'students' => 'élèves',
          'events' => 'événements', 'paths' => 'parcours', 'messages' => 'messages'] as $t => $nom) {
    try {
        $compte[$nom] = (int) db()->query("SELECT COUNT(*) FROM $t")->fetchColumn();
    } catch (Throwable $e) {
        $compte[$nom] = -1;
    }
}

// --- Ce qu'un inconnu voit, demandé au serveur lui-même --------------------

$api = adresseApi();
$dbFichier = baseDansLeWeb() ? basename((string) ($cfg['db_file'] ?? '')) : '';
$essais = [];
if ($dbFichier !== '') {
    $essais['la base'] = $api . '/data/' . rawurlencode($dbFichier);
}
$essais['config.php'] = $api . '/config.php';
$essais['api/lib/'] = $api . '/lib/db.php';
// Une sonde SUR UN FICHIER QUI N'EXISTE PAS : c'est le seul moyen de savoir si
// la règle du .htaccess s'applique sans publier le nom du vrai fichier. 403 =
// le serveur refuse avant de chercher ; 404 = il a cherché, donc la règle ne
// s'applique pas, donc le vrai fichier serait servi.
$essais['sonde api/data/'] = $api . '/data/sonde-de-controle.sqlite';

$vus = [];
foreach ($essais as $quoi => $url) {
    $r = allerVoir($url);
    $vus[$quoi] = $r['code'] === 0
        ? 'non vérifiable (' . ($r['erreur'] ?: 'le serveur ne peut pas s\'appeler') . ')'
        : 'code ' . $r['code'] . (str_starts_with($r['corps'], 'SQLite format 3') ? '  ⚠ LE FICHIER EST SERVI' : '')
            . (str_contains($r['corps'], '<?php') ? '  ⚠ CODE SOURCE SERVI' : '');
}

// --- Le rapport, en texte, prêt à coller ----------------------------------

$lignes = [];
$lignes[] = 'RAPPORT ATOUTMATH — ' . date('d/m/Y à H:i');
$lignes[] = str_repeat('=', 56);
$lignes[] = '';
$lignes[] = '-- Le logiciel';
$lignes[] = '   version            : ' . $version;
$lignes[] = '   adresse publique   : ' . (enHttps() ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? '?');
$lignes[] = '   adresse de l\'API   : ' . $api;
$lignes[] = '';
$lignes[] = '-- Le serveur';
$lignes[] = '   PHP                : ' . PHP_VERSION . ' (' . PHP_SAPI . ')';
$lignes[] = '   logiciel serveur   : ' . ($_SERVER['SERVER_SOFTWARE'] ?? '(inconnu)');
$lignes[] = '   système            : ' . PHP_OS_FAMILY;
$lignes[] = '   HTTPS              : ' . (enHttps() ? 'oui' : 'NON');
$lignes[] = '   fuseau horaire     : ' . ini('date.timezone');
$lignes[] = '';
$lignes[] = '-- Extensions PHP';
foreach ($extensions as $e => $la) {
    $lignes[] = '   ' . etiquette($e) . ' : ' . ($la ? 'oui' : 'NON');
}
$lignes[] = '';
$lignes[] = '-- Limites (elles décident de ce qui passe par le navigateur)';
$lignes[] = '   upload_max_filesize: ' . ini('upload_max_filesize');
$lignes[] = '   post_max_size      : ' . ini('post_max_size');
$lignes[] = '   memory_limit       : ' . ini('memory_limit');
$lignes[] = '   max_execution_time : ' . ini('max_execution_time');
$lignes[] = '';
$lignes[] = '-- Chemins';
$lignes[] = '   racine web         : ' . $racineWeb;
$lignes[] = '   dossier api/       : ' . $dossierApi;
$lignes[] = '   api sous la racine : ' . ($racineWeb && str_starts_with($dossierApi, $racineWeb) ? 'oui' : 'non');
$lignes[] = '   base sous la racine: ' . (baseDansLeWeb() ? 'OUI (protégée par .htaccess)' : 'non (mieux)');
$lignes[] = '';
$lignes[] = '-- Configuration (aucune valeur secrète n\'est écrite ici)';
$lignes[] = '   moteur de base     : ' . dbPilote();
$lignes[] = '   fichier de base    : ' . ($dbFichier !== '' ? 'atoutmath-….sqlite (nom au hasard)' : '(hors racine web, ou MySQL)');
$lignes[] = '   app_secret         : ' . mesureSecret($cfg['app_secret'] ?? '');
$lignes[] = '   data_key           : ' . mesureSecret($cfg['data_key'] ?? (getenv('ATOUTMATH_CLE') ?: ''));
$lignes[] = '   clé hors config    : ' . (getenv('ATOUTMATH_CLE') ? 'oui' : 'non');
$lignes[] = '   conservation       : ' . (int) ($cfg['retention_days'] ?? 0) . ' jours';
$lignes[] = '   origines autorisées: ' . (count((array) ($cfg['allowed_origins'] ?? [])) ?: 'toutes');
$lignes[] = '';
$lignes[] = '-- Contenu (des nombres, jamais des noms)';
foreach ($compte as $nom => $n) {
    $lignes[] = '   ' . etiquette($nom) . ' : ' . ($n < 0 ? '(illisible)' : $n);
}
$lignes[] = '';
$lignes[] = '-- Ce qu\'un inconnu obtient (le serveur s\'interroge lui-même)';
foreach ($vus as $quoi => $r) {
    $lignes[] = '   ' . etiquette($quoi) . ' : ' . $r;
}
$lignes[] = '';
$lignes[] = '-- Fichiers présents à la racine';
foreach (['index.html', 'sw.js', 'manifest.webmanifest', 'deposer.php', '.htaccess'] as $f) {
    $lignes[] = '   ' . etiquette($f, 20) . ' : '
        . (is_file(dirname($dossierApi) . '/' . $f) ? 'oui' : 'NON');
}
foreach (['install.php', '.htaccess', 'config.php'] as $f) {
    $lignes[] = '   ' . etiquette('api/' . $f, 20) . ' : '
        . (is_file($dossierApi . '/' . $f) ? 'oui' : 'NON');
}

$texte = implode("\n", $lignes);

enTete('Rapport', $prof, 'rapport');
?>
<h1>Rapport</h1>
<p class="gris-clair">Tout ce qu'il faut savoir sur cet hébergement, en un bloc.
   Cliquez sur <b>Copier</b>, puis collez-le où on vous le demande.</p>

<div class="carte">
    <p>
        <button type="button" class="bouton" id="btn-copier">Copier le rapport</button>
        <span class="gris-clair" id="dit-copie" style="margin-left:10px"></span>
    </p>
    <textarea id="rapport" rows="30" readonly
              style="font-family: ui-monospace, Menlo, Consolas, monospace; font-size:.82rem;
                     line-height:1.45; white-space:pre; overflow-x:auto"><?= h($texte) ?></textarea>
    <p class="gris-clair" style="margin-bottom:0">
        <b>Ce rapport ne contient aucun secret</b> — ni la clé de chiffrement, ni le
        secret de signature, ni aucun prénom d'élève. Des longueurs et des nombres,
        rien de plus. Vous pouvez le coller sans arrière-pensée.
    </p>
</div>

<script>
document.getElementById('btn-copier').onclick = async () => {
    const zone = document.getElementById('rapport');
    const dit = document.getElementById('dit-copie');
    try {
        await navigator.clipboard.writeText(zone.value);
        dit.textContent = 'Copié.';
    } catch {
        // `navigator.clipboard` demande HTTPS et une page au premier plan : sur un
        // site encore en clair, il n'existe pas. On sélectionne alors le texte,
        // et l'utilisateur fait Ctrl+C — ce qui marche partout, depuis toujours.
        zone.select();
        dit.textContent = 'Sélectionné — faites Ctrl+C (ou ⌘C).';
    }
    setTimeout(() => { dit.textContent = ''; }, 4000);
};
</script>
<?php piedDePage();
