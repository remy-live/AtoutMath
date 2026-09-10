<?php
declare(strict_types=1);

/**
 * L'INSTALLATION, EN UNE PAGE.
 *
 * Rémy : « crée donc moi tout ce qu'il faut niveau php, pour une installation
 * […] que tout soit prêt, parfait, contrôlable, facile. Je réserverai l'espace
 * web demain. »
 *
 * L'installation d'avant tenait en six commandes shell — créer la base, charger
 * le schéma, copier la configuration, tirer un secret au hasard, l'éditer,
 * créer le professeur. C'est six occasions de se tromper, et sur un hébergement
 * mutualisé il n'y a souvent aucun terminal pour les taper.
 *
 * Ici : on dépose le dossier, on ouvre `install.php`, on remplit trois champs.
 *
 * DEUX SÛRETÉS, parce qu'une page qui crée un compte administrateur est
 * exactement ce qu'on ne veut pas laisser traîner :
 *
 *   · elle REFUSE de tourner si `config.php` existe déjà — donc une fois
 *     l'installation faite, elle ne fait plus rien, même si on oublie de
 *     l'effacer ;
 *   · elle propose de s'effacer elle-même à la fin, et dit quoi faire si le
 *     serveur ne lui en donne pas le droit.
 *
 * Et elle VÉRIFIE AVANT DE PROMETTRE : version de PHP, extensions, droits
 * d'écriture. Un diagnostic clair vaut mieux qu'une page blanche.
 */

const RACINE = __DIR__;
const CONFIG = RACINE . '/config.php';
const DONNEES = RACINE . '/data';

/**
 * METTRE UN DOSSIER HORS DE PORTÉE DU WEB.
 *
 * Un fichier SQLite posé dans un dossier servi par Apache SE TÉLÉCHARGE : il
 * suffit d'en connaître l'adresse, et l'on repart avec les prénoms de la classe
 * et tout son travail. C'est le seul vrai danger de l'installation « un
 * fichier », et il se règle en trois couches, parce qu'aucune ne suffit seule :
 *
 *   1. UN `.htaccess` QUI REFUSE TOUT. Marche sous Apache — le cas de la
 *      quasi-totalité des hébergements mutualisés français. Ne marche pas sous
 *      Nginx, qui ne lit pas ces fichiers.
 *   2. UN NOM IMPRÉVISIBLE. Le fichier s'appelle `atoutmath-<16 signes au
 *      hasard>.sqlite`. Celle-là ne dépend d'aucune configuration de serveur :
 *      même servi en clair, le fichier n'est pas trouvable sans l'adresse
 *      exacte, et l'adresse exacte n'est écrite que dans `config.php`, qui est
 *      lui-même refusé.
 *   3. UN `index.html` VIDE, pour qu'un dossier dont l'indexation est restée
 *      ouverte n'affiche pas la liste de son contenu.
 */
function protegerDossier(string $dossier): void
{
    if (!is_dir($dossier)) {
        @mkdir($dossier, 0750, true);
    }
    // « Require » est la syntaxe d'Apache 2.4, « Deny » celle de 2.2 : les deux
    // cohabitent sans se gêner, et l'on ne sait pas laquelle tourne en face.
    @file_put_contents($dossier . '/.htaccess',
        "Require all denied\n<IfModule !mod_authz_core.c>\n  Order allow,deny\n  Deny from all\n</IfModule>\n");
    @file_put_contents($dossier . '/index.html', '');
}

$deja = is_file(CONFIG);
$erreurs = [];
$fait = false;
$resume = [];

/** Ce dont l'installation a besoin, et ce que le serveur offre vraiment. */
function diagnostics(): array
{
    $out = [];
    $out[] = [
        'quoi' => 'PHP 8.0 ou plus récent',
        'ok'   => PHP_VERSION_ID >= 80000,
        'dit'  => PHP_VERSION,
    ];
    // `openssl` est REQUIS, et non pas « souhaitable » : c'est lui qui chiffre
    // les prénoms et le travail des élèves dans la base (voir lib/coffre.php).
    // Sans lui, l'installation écrirait en clair sans le dire, ce qui est
    // exactement le genre de silence qu'on ne veut pas.
    foreach (['pdo' => 'PDO', 'json' => 'JSON', 'mbstring' => 'mbstring',
              'openssl' => 'openssl (chiffrement)'] as $ext => $nom) {
        $out[] = ['quoi' => "Extension $nom", 'ok' => extension_loaded($ext), 'dit' => extension_loaded($ext) ? 'présente' : 'absente'];
    }
    $sqlite = extension_loaded('pdo_sqlite');
    $mysql  = extension_loaded('pdo_mysql');
    $out[] = [
        'quoi' => 'Un moteur de base de données',
        'ok'   => $sqlite || $mysql,
        'dit'  => trim(($sqlite ? 'SQLite ' : '') . ($mysql ? 'MySQL' : '')) ?: 'aucun',
    ];
    $out[] = [
        'quoi' => 'Dossier accessible en écriture',
        'ok'   => is_writable(RACINE),
        'dit'  => is_writable(RACINE) ? RACINE : 'lecture seule : ' . RACINE,
    ];
    return $out;
}

$diag = diagnostics();
$bloquant = array_filter($diag, fn ($d) => !$d['ok']);

if (!$deja && !$bloquant && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $nom   = trim((string) ($_POST['nom'] ?? ''));
    $email = trim((string) ($_POST['email'] ?? ''));
    $mdp   = (string) ($_POST['mdp'] ?? '');
    $mdp2  = (string) ($_POST['mdp2'] ?? '');
    $moteur = ($_POST['moteur'] ?? 'sqlite') === 'mysql' ? 'mysql' : 'sqlite';
    $origine = trim((string) ($_POST['origine'] ?? ''));

    if ($nom === '')                    $erreurs[] = "Donnez votre nom : c'est celui qui s'affichera dans l'administration.";
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $erreurs[] = "L'adresse électronique n'est pas valide.";
    // Douze caractères : c'est la seule barrière entre le tableau de bord et
    // n'importe qui. Un mot de passe court sur une page publique n'en est pas un.
    if (mb_strlen($mdp) < 12)           $erreurs[] = 'Le mot de passe doit faire au moins douze caractères.';
    if ($mdp !== $mdp2)                 $erreurs[] = 'Les deux mots de passe ne sont pas identiques.';

    $config = [
        'db_driver'       => $moteur,
        // Le nom porte seize signes au hasard : voir protegerDossier().
        'db_file'         => DONNEES . '/atoutmath-' . bin2hex(random_bytes(8)) . '.sqlite',
        'db_host'         => trim((string) ($_POST['db_host'] ?? 'localhost')),
        'db_port'         => (int) ($_POST['db_port'] ?? 3306),
        'db_name'         => trim((string) ($_POST['db_name'] ?? '')),
        'db_user'         => trim((string) ($_POST['db_user'] ?? '')),
        'db_pass'         => (string) ($_POST['db_pass'] ?? ''),
        'app_secret'      => bin2hex(random_bytes(32)),
        // LA CLÉ QUI CHIFFRE LES DONNÉES D'ÉLÈVES. Séparée du secret de
        // signature pour qu'elle puisse être déplacée seule — dans une
        // variable d'environnement `ATOUTMATH_CLE`, par exemple, et alors le
        // fichier de base et sa clé ne voyagent plus ensemble.
        'data_key'        => bin2hex(random_bytes(32)),
        'allowed_origins' => array_values(array_filter(array_map('trim', explode(',', $origine)))),
        'retention_days'  => max(1, (int) ($_POST['retention'] ?? 30)),
    ];
    if ($moteur === 'mysql' && $config['db_name'] === '') {
        $erreurs[] = 'Donnez le nom de la base MySQL.';
    }

    if (!$erreurs && $moteur === 'sqlite') {
        protegerDossier(DONNEES);
        if (!is_dir(DONNEES) || !is_writable(DONNEES)) {
            $erreurs[] = "Impossible de créer le dossier " . DONNEES . " en écriture.";
        }
    }

    if (!$erreurs) {
        // On ÉCRIT LA CONFIGURATION D'ABORD, puis on s'en sert : c'est elle
        // qui dit au reste du code quel moteur ouvrir, et l'on veut échouer
        // ici — où l'on sait l'expliquer — plutôt qu'à la première requête.
        $php = "<?php\n// Écrit par install.php le " . date('d/m/Y à H:i') . ".\n"
            . "// Ce fichier contient un secret : il ne doit jamais être public.\nreturn "
            . var_export($config, true) . ";\n";
        if (@file_put_contents(CONFIG, $php) === false) {
            $erreurs[] = "Impossible d'écrire config.php dans " . RACINE . '.';
        }
    }

    if (!$erreurs) {
        try {
            require_once RACINE . '/lib/schema.php';
            migrer();
            $id = uuidv4();
            db()->prepare('INSERT INTO teachers (id, display_name, email, password_hash) VALUES (?, ?, ?, ?)')
                ->execute([$id, $nom, $email, password_hash($mdp, PASSWORD_DEFAULT)]);
            $fait = true;
            $resume = [
                'moteur'  => $moteur === 'sqlite'
                    ? 'SQLite — api/data/' . basename($config['db_file'])
                    : 'MySQL, base ' . $config['db_name'],
                'sqlite'  => $moteur === 'sqlite',
                'prof'    => $nom . ' — ' . $email,
                'purge'   => $config['retention_days'] . ' jours',
            ];
        } catch (Throwable $t) {
            @unlink(CONFIG);   // pour pouvoir recommencer proprement
            $erreurs[] = 'Base de données : ' . $t->getMessage();
        }
    }
}

// Après coup : le bouton qui efface cette page.
if ($deja && ($_POST['effacer'] ?? '') === 'oui') {
    @unlink(__FILE__);
    header('Location: admin/');
    exit;
}

?><!doctype html>
<html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>AtoutMath — installation</title>
<style>
:root { color-scheme: light; }
body { font: 16px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; margin: 0;
       background: #f6f7fb; color: #1a202c; }
main { max-width: 620px; margin: 0 auto; padding: 28px 20px 60px; }
h1 { font-size: 1.6rem; margin: 0 0 4px; }
p.sous { color: #5a6478; margin: 0 0 24px; }
.carte { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin-bottom: 18px; }
h2 { font-size: 1.05rem; margin: 0 0 12px; }
label { display: block; font-weight: 600; margin: 14px 0 4px; font-size: .92rem; }
input[type=text], input[type=email], input[type=password], input[type=number] {
    width: 100%; padding: 9px 11px; border: 1px solid #cbd5e1; border-radius: 9px;
    font: inherit; box-sizing: border-box; }
small { color: #6b7484; display: block; margin-top: 3px; }
button { font: inherit; font-weight: 700; padding: 11px 20px; border-radius: 10px;
         border: none; background: #4f46e5; color: #fff; cursor: pointer; margin-top: 20px; }
button.gris { background: #e2e8f0; color: #1a202c; }
ul.diag { list-style: none; padding: 0; margin: 0; }
ul.diag li { display: flex; gap: 10px; padding: 5px 0; border-bottom: 1px solid #f1f5f9; }
ul.diag li:last-child { border: none; }
.ok::before { content: "✓"; color: #16a34a; font-weight: 800; }
.ko::before { content: "✗"; color: #dc2626; font-weight: 800; }
.dit { margin-left: auto; color: #6b7484; font-size: .88rem; }
.erreur { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b;
          border-radius: 10px; padding: 12px 14px; margin-bottom: 16px; }
.bien { background: #f0fdf4; border: 1px solid #bbf7d0; color: #14532d;
        border-radius: 10px; padding: 14px 16px; }
.radio { display: flex; gap: 12px; margin-top: 6px; }
.radio label { display: flex; align-items: flex-start; gap: 8px; font-weight: 500;
               border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; flex: 1; margin: 0; }
code { background: #f1f5f9; padding: 1px 5px; border-radius: 5px; font-size: .9em; }
</style></head><body><main>

<h1>AtoutMath — installation</h1>
<p class="sous">Trois champs, et c'est prêt. Rien à taper dans un terminal.</p>

<?php if ($fait): ?>
    <div class="bien">
        <b>C'est installé.</b>
        <ul>
            <li>Base : <?= htmlspecialchars($resume['moteur']) ?></li>
            <li>Professeur : <?= htmlspecialchars($resume['prof']) ?></li>
            <li>Purge automatique après <?= htmlspecialchars($resume['purge']) ?></li>
            <li>Prénoms, réponses et messages <b>chiffrés</b> dans la base (AES-256-GCM)</li>
        </ul>
        <?php if (!empty($resume['sqlite'])): ?>
        <p><small><b>Le fichier de base est protégé</b> par un <code>.htaccess</code>
           qui refuse tout, et son nom porte seize signes tirés au hasard : même si
           votre serveur ignorait le <code>.htaccess</code>, personne ne peut deviner
           son adresse. <b>Sous Nginx</b>, ajoutez tout de même :
           <code>location ~ /api/data/ { deny all; }</code>.</small></p>
        <?php endif; ?>
        <p><small><b>Et son contenu est chiffré</b> : les prénoms, les réponses
           des élèves et vos messages sont écrits en AES-256-GCM. Un fichier de
           base qui partirait quand même ne rendrait rien de lisible — sauf à
           emporter <code>config.php</code> avec, puisque la clé y est. Pour les
           séparer pour de bon, déplacez la valeur <code>data_key</code> dans une
           variable d'environnement <code>ATOUTMATH_CLE</code>.</small></p>
        <p>Il reste UNE chose à faire : effacer cette page, pour que personne
           d'autre ne puisse l'ouvrir.</p>
        <form method="post"><input type="hidden" name="effacer" value="oui">
            <button>Effacer install.php et aller à l'administration</button></form>
        <p><small>Si l'effacement échoue (hébergement en lecture seule), supprimez
           <code>api/install.php</code> par FTP. Tant que <code>config.php</code>
           existe, cette page ne fait de toute façon plus rien.</small></p>
    </div>

<?php elseif ($deja): ?>
    <div class="carte">
        <h2>Déjà installé</h2>
        <p>Un fichier <code>config.php</code> existe : l'installation a déjà eu
           lieu, et cette page refuse de la refaire — c'est ce qui empêche
           quelqu'un d'autre de créer un compte professeur chez vous.</p>
        <p>Pour repartir de zéro, effacez <code>api/config.php</code> (et le
           fichier de base si vous voulez aussi perdre les données).</p>
        <form method="post"><input type="hidden" name="effacer" value="oui">
            <button>Effacer cette page et aller à l'administration</button></form>
    </div>

<?php else: ?>
    <div class="carte">
        <h2>Ce que votre hébergement offre</h2>
        <ul class="diag">
        <?php foreach ($diag as $d): ?>
            <li class="<?= $d['ok'] ? 'ok' : 'ko' ?>"><span><?= htmlspecialchars($d['quoi']) ?></span>
                <span class="dit"><?= htmlspecialchars($d['dit']) ?></span></li>
        <?php endforeach; ?>
        </ul>
    </div>

    <?php if ($bloquant): ?>
        <div class="erreur">Il manque de quoi installer. Corrigez les lignes marquées ✗
            ci-dessus, puis rechargez cette page.</div>
    <?php else: ?>
        <?php foreach ($erreurs as $e): ?><div class="erreur"><?= htmlspecialchars($e) ?></div><?php endforeach; ?>
        <form method="post">
        <div class="carte">
            <h2>Votre compte professeur</h2>
            <label>Nom affiché<input type="text" name="nom" required value="<?= htmlspecialchars((string)($_POST['nom'] ?? '')) ?>"></label>
            <label>Adresse électronique<input type="email" name="email" required value="<?= htmlspecialchars((string)($_POST['email'] ?? '')) ?>"></label>
            <label>Mot de passe<input type="password" name="mdp" required minlength="12">
                <small>Douze caractères au minimum : c'est la seule barrière entre
                       votre tableau de bord et le reste d'internet.</small></label>
            <label>Le même, pour vérifier<input type="password" name="mdp2" required minlength="12"></label>
        </div>

        <div class="carte">
            <h2>Où ranger les données</h2>
            <div class="radio">
                <label><input type="radio" name="moteur" value="sqlite" checked>
                    <span><b>Un fichier</b> — rien à créer, rien à configurer.
                    Pour une classe, c'est le bon choix ; et tout effacer, c'est
                    supprimer un fichier.</span></label>
                <label><input type="radio" name="moteur" value="mysql">
                    <span><b>MySQL</b> — si votre hébergement en fournit une et
                    que vous préférez.</span></label>
            </div>
            <div id="mysql" hidden>
                <label>Serveur<input type="text" name="db_host" value="localhost"></label>
                <label>Base<input type="text" name="db_name"></label>
                <label>Utilisateur<input type="text" name="db_user"></label>
                <label>Mot de passe<input type="password" name="db_pass"></label>
            </div>
            <label>Effacer les données au bout de
                <input type="number" name="retention" value="30" min="1" max="1095"> jours
                <small>Rémy : « je ferai une séance unique et après je détruirai
                       la liste des élèves ». Trente jours par défaut ; vous
                       pouvez aussi tout effacer d'un bouton dans l'administration.</small></label>
            <label>Adresse du site élève (pour l'autoriser à parler au serveur)
                <input type="text" name="origine" placeholder="https://mon-site.fr">
                <small>Séparez par des virgules s'il y en a plusieurs. Laissez vide
                       si l'application et l'API sont sur le même domaine.</small></label>
        </div>
        <button>Installer</button>
        </form>
        <script>
        document.querySelectorAll('input[name=moteur]').forEach(r => r.addEventListener('change', () => {
            document.getElementById('mysql').hidden = document.querySelector('input[name=moteur]:checked').value !== 'mysql';
        }));
        </script>
    <?php endif; ?>
<?php endif; ?>
</main></body></html>
