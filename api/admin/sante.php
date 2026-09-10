<?php
declare(strict_types=1);

/**
 * LA SANTÉ DE L'INSTALLATION — vérifiée SUR VOTRE hébergement.
 *
 * Pourquoi cette page existe, et c'est une question d'honnêteté.
 *
 * Le `.htaccess` qui refuse l'accès au fichier de base a été essayé sous un
 * vrai Apache : les chemins sensibles répondent bien 403. Mais cet essai a eu
 * lieu SUR UNE AUTRE MACHINE QUE LA VÔTRE. Un hébergeur qui n'autorise pas les
 * `.htaccess` (`AllowOverride None`), un serveur Nginx qui ne les lit pas du
 * tout, un transfert FTP qui a sauté les fichiers commençant par un point —
 * chacun de ces trois cas rend la base téléchargeable, et rien dans
 * l'application ne s'en apercevrait.
 *
 * Cette page le demande donc AU SERVEUR LUI-MÊME : elle va chercher ses propres
 * fichiers par le web, comme le ferait un inconnu, et regarde ce qui revient.
 * C'est la seule vérification qui vaille, parce que c'est la seule qui ait lieu
 * là où les élèves travailleront.
 *
 * ET QUAND ELLE NE SAIT PAS, ELLE LE DIT. Certains hébergements interdisent au
 * serveur de s'appeler lui-même. Dans ce cas la réponse est « je n'ai pas pu
 * vérifier », jamais « c'est protégé » : un contrôle qui verdit par défaut est
 * pire que pas de contrôle du tout.
 */

require_once __DIR__ . '/_socle.php';
require_once __DIR__ . '/../lib/seance.php';
require_once __DIR__ . '/../lib/coffre.php';
require_once __DIR__ . '/../lib/sante.php';
require_once __DIR__ . '/../lib/guichet.php';

$prof = profConnecte();

// --- Effacer install.php, d'un bouton ---------------------------------------
if (($_POST['action'] ?? '') === 'effacer-installeur') {
    exigerJeton();
    $ok = @unlink(dirname(__DIR__) . '/install.php');
    redirige('sante.php', $ok
        ? "install.php est effacé."
        : "Impossible de l'effacer : supprimez api/install.php par FTP.");
}

// --- Le guichet des mises à jour ------------------------------------------
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    exigerJeton();
    if (($_POST['guichet'] ?? '') === 'ouvrir') {
        // LE GUICHET DONNE LE SITE, PAS UNE CLASSE. `deposer.php` écrit des
        // fichiers PHP : qui l'ouvre peut remplacer le logiciel, et lire par là
        // tout ce qui appartient aux autres professeurs. C'est donc un geste de
        // l'installation, comme créer un compte — il revient à celui qui a
        // installé le site. Voir `professeurFondateur` dans lib/db.php : le
        // modèle tient en une phrase, tous égaux devant leurs classes, un seul
        // responsable du serveur.
        if (!estLeFondateur($prof)) {
            redirige('sante.php', "Seul le professeur qui a installé le site "
                . "ouvre le guichet des mises à jour.");
        }
        ouvrirGuichet();
        redirige('sante.php', 'Guichet ouvert pour trente minutes.');
    }
    if (($_POST['guichet'] ?? '') === 'fermer') {
        fermerGuichet();
        redirige('sante.php', 'Guichet refermé.');
    }
    redirige('sante.php');
}

$api = adresseApi();
$constats = [];

// ------------------------------------------------------- Ce qu'on sait ici --

$constats[] = PHP_VERSION_ID >= 80100
    ? constat('ok', 'Version de PHP', PHP_VERSION)
    : constat(PHP_VERSION_ID >= 80000 ? '!' : 'x', 'Version de PHP', PHP_VERSION,
        'PHP 8.1 ou plus récent est préférable. Le panneau de votre hébergeur permet en général de changer de version.');

$constats[] = enHttps()
    ? constat('ok', 'HTTPS', 'la page est servie en HTTPS')
    : constat('x', 'HTTPS', 'la page est servie en clair',
        "Les mots de passe et les jetons des élèves voyagent en clair. Activez le certificat "
        . "(gratuit chez tous les hébergeurs) et forcez la redirection vers HTTPS.");

$constats[] = extension_loaded('openssl')
    ? constat('ok', 'Chiffrement des données', 'AES-256-GCM actif (prénoms, réponses, messages)')
    : constat('x', 'Chiffrement des données', 'extension openssl absente',
        'Sans elle, les prénoms et le travail des élèves sont écrits en clair dans la base.');

// La clé est-elle rangée ailleurs que dans le dossier de la base ?
$cleDehors = is_string(getenv('ATOUTMATH_CLE')) && strlen((string) getenv('ATOUTMATH_CLE')) >= 32;
$constats[] = $cleDehors
    ? constat('ok', 'Clé de chiffrement', "hors de config.php (variable d'environnement)")
    : constat('!', 'Clé de chiffrement', 'dans config.php, à côté de la base',
        // LE CONSEIL D'AVANT ÉTAIT LE MAUVAIS, et le rapport de Rémy l'a montré :
        // tout en vert, sauf cette ligne, qui l'envoyait déplacer la clé dans
        // `SetEnv ATOUTMATH_CLE`. Or ce fichier-là vit dans `www/` lui aussi —
        // une copie du site emporte la clé exactement comme avant. Ce qui change
        // vraiment les choses, c'est de sortir LA BASE du dossier servi.
        "Cela suffit contre un fichier de base récupéré seul : la clé est dans un autre "
        . "fichier, et ce fichier est refusé par le serveur. "
        . "<b>Ce qui protégerait vraiment, c'est de ranger la base hors du dossier web</b> — "
        . "elle n'y serait plus protégée par une règle, mais par l'absence de chemin. "
        . "<a href=\"ranger.php\">Le faire en un clic</a>.");

// L'installeur traîne-t-il encore ?
$installeur = is_file(dirname(__DIR__) . '/install.php');
$constats[] = $installeur
    ? constat('!', 'Page d\'installation', 'api/install.php est encore présent',
        "Elle refuse de tourner tant que config.php existe, donc personne ne peut "
        . "créer un compte chez vous. Mais elle n'a plus rien à faire là — le bouton "
        . "ci-dessous l'efface. (Une republication du site la remet : c'est normal, "
        . "elle sert aux nouvelles installations.)")
    : constat('ok', 'Page d\'installation', 'effacée');

// La purge
$jours = (int) (config()['retention_days'] ?? 0);
$temoin = dirname(__DIR__) . '/.derniere-purge';
$quand = is_file($temoin) ? trim((string) @file_get_contents($temoin)) : null;
$constats[] = $jours > 0
    ? constat('ok', 'Conservation limitée',
        "les données de plus de $jours jours sont effacées"
        . ($quand ? " — dernier passage le " . date('d/m/Y', (int) strtotime($quand)) : ' — pas encore passée'))
    : constat('!', 'Conservation limitée', 'désactivée (retention_days = 0)',
        'Rien ne sera effacé automatiquement.');

// ----------------------------------------- Ce qu'on va demander au serveur --

// On n'essaie une adresse que si la base est VRAIMENT sous le dossier web :
// rangée ailleurs, un 404 se lirait « protégé » alors qu'il veut dire
// « introuvable », ce qui n'est pas le même constat.
$dbFichier = baseDansLeWeb() ? basename((string) (config()['db_file'] ?? '')) : '';

$essais = [];
if ($dbFichier !== '') {
    $essais['base'] = $api . '/data/' . rawurlencode($dbFichier);
}
$essais['config'] = $api . '/config.php';
$essais['lib']    = $api . '/lib/db.php';

$reponses = [];
foreach ($essais as $cle => $url) {
    $reponses[$cle] = allerVoir($url);
}

// --- Les trois verdicts. Le raisonnement vit dans `lib/sante.php`, où il est
// mis à l'épreuve devant de vraies fuites fabriquées (voir tools/testApi.php).
if ($dbFichier !== '') {
    $constats[] = verdictBase($reponses['base'], $essais['base'], true);
} else {
    $constats[] = verdictBase([], '', false);
}
$constats[] = verdictConfig($reponses['config'], $essais['config']);
$constats[] = verdictInterne($reponses['lib']);

$graves = count(array_filter($constats, fn ($c) => $c['etat'] === 'x'));
$tiedes = count(array_filter($constats, fn ($c) => $c['etat'] === '!'));
$flous  = count(array_filter($constats, fn ($c) => $c['etat'] === '?'));

enTete('Santé de l\'installation', $prof, 'sante');
?>
<h1>Santé de l'installation</h1>
<p class="gris-clair">Ces contrôles ont lieu <b>sur votre hébergement</b>, maintenant.
Le serveur va chercher ses propres fichiers par le web, comme le ferait un inconnu,
et regarde ce qui revient.</p>

<div class="carte <?= $graves ? 'danger' : '' ?>">
    <h2 style="margin-bottom:6px">
    <?php if ($graves): ?>
        ✗ <?= $graves ?> point<?= $graves > 1 ? 's' : '' ?> grave<?= $graves > 1 ? 's' : '' ?> à corriger
    <?php elseif ($tiedes || $flous): ?>
        ✓ Rien de grave<?= $tiedes ? ", $tiedes point" . ($tiedes > 1 ? 's' : '') . ' à regarder' : '' ?><?= $flous ? " ($flous non vérifiable" . ($flous > 1 ? 's' : '') . ')' : '' ?>
    <?php else: ?>
        ✓ Tout est en ordre
    <?php endif; ?>
    </h2>
    <table>
        <?php foreach ($constats as $c): ?>
        <tr>
            <td style="width:26px; font-weight:800; font-size:1.05rem; vertical-align:top; color:<?=
                ['ok' => '#16a34a', '!' => '#d97706', 'x' => '#dc2626', '?' => '#64748b'][$c['etat']] ?>">
                <?= ['ok' => '✓', '!' => '!', 'x' => '✗', '?' => '?'][$c['etat']] ?></td>
            <td>
                <b><?= h($c['quoi']) ?></b><br>
                <span class="gris-clair"><?= h($c['dit']) ?></span>
                <?php if ($c['faire']): ?>
                    <div class="gris-clair" style="margin-top:5px; line-height:1.45"><?= $c['faire'] ?></div>
                <?php endif; ?>
            </td>
        </tr>
        <?php endforeach; ?>
    </table>
    <p style="margin-bottom:0"><a class="bouton" href="sante.php">Revérifier</a></p>
</div>

<?php if ($installeur): ?>
<div class="carte">
    <h2>Effacer la page d'installation</h2>
    <p class="gris-clair" style="margin-top:0">Elle ne sert qu'une fois. Tant que
    <code>config.php</code> existe elle refuse de tourner, mais autant qu'elle ne
    soit plus là du tout.</p>
    <form method="post">
        <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
        <input type="hidden" name="action" value="effacer-installeur">
        <button class="rouge">Effacer api/install.php</button>
    </form>
</div>
<?php endif; ?>

<div class="carte <?= guichetOuvert() ? '' : '' ?>">
    <h2>Mises à jour par le navigateur</h2>
    <?php $reste = guichetMinutes(); ?>
    <?php if ($reste > 0): ?>
        <p><b>Guichet ouvert</b> — il se referme dans <?= (int) $reste ?> minute<?= $reste > 1 ? 's' : '' ?>.
           <a href="../../deposer.php">Aller déposer l'archive</a>.</p>
        <form method="post">
            <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
            <input type="hidden" name="guichet" value="fermer">
            <button class="gris">Refermer tout de suite</button>
        </form>
    <?php else: ?>
        <p class="gris-clair" style="margin-top:0"><code>deposer.php</code> écrit des
        fichiers sur le site : <b>qui l'obtient obtient le serveur</b>. Il reste donc
        fermé, et votre mot de passe seul ne suffit pas à l'ouvrir — il faut aussi
        ce bouton, et le guichet se referme de lui-même après trente minutes.</p>
        <form method="post">
            <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
            <input type="hidden" name="guichet" value="ouvrir">
            <button>Ouvrir pour trente minutes</button>
        </form>
    <?php endif; ?>

    <?php $depots = derniersDepots(); ?>
    <?php if ($depots): ?>
        <p class="gris-clair" style="margin-top:14px"><b>Derniers dépôts.</b>
           Si l'un d'eux n'est pas de vous, changez votre mot de passe.</p>
        <table>
            <tr><th>Quand (UTC)</th><th>Archive</th><th>Fichiers</th><th>Depuis</th></tr>
            <?php foreach (array_slice($depots, 0, 6) as $d): ?>
            <tr><td class="gris-clair"><?= h((string) ($d['quand'] ?? '')) ?></td>
                <td><?= h((string) ($d['quoi'] ?? '')) ?></td>
                <td><?= (int) ($d['n'] ?? 0) ?></td>
                <td class="gris-clair"><?= h((string) ($d['ou'] ?? '')) ?></td></tr>
            <?php endforeach; ?>
        </table>
    <?php endif; ?>
</div>

<div class="carte">
    <h2>Mettre le site à jour</h2>
    <p class="gris-clair" style="margin-top:0">Les mises à jour partent du dépôt :
    on pousse le code, et le site se republie tout seul par SFTP — voir
    <code>.github/workflows/deploiement.yml</code>. Rien à transférer à la main.</p>
    <p class="gris-clair">Une mise à jour qui ajoute une table à la base s'applique
    d'elle-même : le schéma se remet à niveau à chaque fois que vous ouvrez cette
    administration. Et <b>ni <code>config.php</code> ni le dossier <code>data/</code>
    ne sont touchés</b> par une republication : ils ne sont pas dans le dépôt.</p>
</div>
<?php piedDePage();
