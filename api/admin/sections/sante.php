<?php
declare(strict_types=1);

/**
 * SECTION « SANTÉ DE L'INSTALLATION ».
 *
 * Ces contrôles ont lieu SUR L'HÉBERGEMENT DE RÉMY, maintenant : le serveur va
 * chercher ses propres fichiers par le web, comme le ferait un inconnu, et
 * regarde ce qui revient. C'est la seule vérification qui vaille, parce que
 * c'est la seule qui ait lieu là où les élèves travailleront.
 *
 * ELLE ÉTAIT UNE PAGE, ELLE EST UNE SECTION. Rémy : « la zone admin n'a plus
 * besoin de classe et est vieillotte, va à l'essentiel avec des choses
 * déroulantes ». Le calcul n'a pas changé d'une ligne — seul l'endroit où il
 * s'affiche a bougé.
 *
 * Ce fichier est inclus par index.php, qui a déjà chargé le socle, ouvert la
 * session et traité les POST. Il ne fait que CALCULER et AFFICHER.
 *
 * @var array $prof  le professeur connecté, fourni par index.php
 */

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
        . "<a href=\"#ranger\">Le faire en un clic</a>.");

// L'installeur traîne-t-il encore ?
$installeur = is_file(dirname(__DIR__) . '/install.php');
$constats[] = $installeur
    ? constat('!', 'Page d\'installation', 'api/install.php est encore présent',
        "Elle refuse de tourner tant que config.php existe, donc personne ne peut "
        . "créer un compte chez vous. Mais elle n'a plus rien à faire là — le bouton "
        . "ci-dessous l'efface. (Une republication du site la remet : c'est normal, "
        . "elle sert aux nouvelles installations.)")
    : constat('ok', 'Page d\'installation', 'effacée');

// LES FICHIERS QU'UNE MISE À JOUR NE PEUT PAS EFFACER.
//
// Rémy : « donc je mets à jour comment ». La question a fait apparaître un trou
// qu'on n'avait jamais eu à regarder : ni l'archive déposée ni la publication
// par SFTP n'effacent quoi que ce soit — et c'est voulu, sans quoi elles
// emporteraient `config.php` et la base. Un fichier RETIRÉ du logiciel reste
// donc sur l'hébergement, vivant, accessible, travaillant sur la base
// d'aujourd'hui avec le code d'hier. Voir `lib/menage.php`.
$perimes = fichiersPerimesPresents(dirname(__DIR__, 3));
$constats[] = $perimes
    ? constat('!', 'Fichiers d\'une version précédente',
        count($perimes) . ' fichier' . (count($perimes) > 1 ? 's' : '')
        . ' que le logiciel n\'utilise plus',
        'Une mise à jour écrit les fichiers, elle n\'en efface aucun — c\'est ce '
        . 'qui l\'empêche d\'emporter votre configuration et votre base. Ceux-ci '
        . 'restent donc de l\'ancienne version ; le bouton ci-dessous les retire.')
    : constat('ok', 'Fichiers d\'une version précédente', 'aucun');

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

// LA SONDE QUI ESSAIE POUR DE BON. On se fabrique un jeton de professeur — le
// nôtre, celui de la session en cours — et l'on s'interroge soi-même avec. Si
// la réponse est 200, l'en-tête `Authorization` traverse ; si c'est 401, il est
// perdu en route, et rien de ce qui demande un jeton ne peut fonctionner : ni
// vos classes, ni la synchronisation des élèves.
//
// C'EST LA SEULE FAÇON DE SAVOIR. Cela ne se déduit ni de la version d'Apache
// ni de celle de PHP : cela dépend du module qui les relie et des réglages de
// l'hébergeur. On essaie donc, plutôt que de supposer.
$constats[] = verdictAutorisation(allerVoirAvecJeton(
    $api . '/teacher/classes',
    $prof['id'] . '.' . signTeacher((string) $prof['id']),
    ['action' => 'list']
));

$graves = count(array_filter($constats, fn ($c) => $c['etat'] === 'x'));
$tiedes = count(array_filter($constats, fn ($c) => $c['etat'] === '!'));
$flous  = count(array_filter($constats, fn ($c) => $c['etat'] === '?'));

// L'ÉTAT SE LIT SANS DÉPLIER : index.php en a besoin pour la pastille et pour
// la ligne d'avertissement du haut, écrite AVANT cette section.
$santeGraves = $graves;
$santeTiedes = $tiedes;
$santeFlous  = $flous;

sectionDebut('sante', 'Santé de l\'installation',
    'PHP, HTTPS, chiffrement, fichiers refusés aux inconnus',
    etiquetteSante($graves, $tiedes, $flous), tonSante($graves, $tiedes),
    // ON L'OUVRE QUAND ÇA VA MAL, et seulement alors : une section dépliée qui
    // dit « tout va bien » occupe un écran pour ne rien apprendre.
    $graves > 0);
?>
<p class="gris-clair" style="margin-top:0">Ces contrôles ont lieu <b>sur votre
hébergement</b>, maintenant. Le serveur va chercher ses propres fichiers par le
web, comme le ferait un inconnu, et regarde ce qui revient.</p>

<?php // LE VERDICT NE S'ÉCRIT PLUS ICI. Il l'était du temps où cette page
      // était seule ; il est maintenant dit DEUX fois avant qu'on arrive à ce
      // tableau — sur la pastille de la section, et tout en haut de la page
      // quand il y a lieu. Vu à l'écran : « 1 point grave » trois fois sur le
      // même écran, ce qui ne renseigne pas trois fois plus. ?>
<div class="carte <?= $graves ? 'danger' : '' ?>">
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
    <p style="margin-bottom:0"><a class="bouton" href="index.php#sante">Revérifier</a></p>
</div>

<?php if ($installeur): ?>
<h3 style="font-size:.95rem; margin:18px 0 7px">Effacer la page d'installation</h3>
<p class="gris-clair" style="margin-top:0">Elle ne sert qu'une fois. Tant que
<code>config.php</code> existe elle refuse de tourner, mais autant qu'elle ne
soit plus là du tout.</p>
<form method="post">
    <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
    <input type="hidden" name="action" value="effacer-installeur">
    <button class="rouge">Effacer api/install.php</button>
</form>
<?php endif; ?>

<?php if ($perimes): ?>
<h3 style="font-size:.95rem; margin:18px 0 7px">Retirer les fichiers d'une version précédente</h3>
<p class="gris-clair" style="margin-top:0">Ils ne servent plus, et ils travaillent
sur votre base d'aujourd'hui avec le code d'hier.</p>
<ul class="gris-clair" style="margin-top:0">
    <?php foreach ($perimes as $chemin => $pourquoi): ?>
        <li><code><?= h($chemin) ?></code> — <?= h($pourquoi) ?></li>
    <?php endforeach; ?>
</ul>
<form method="post">
    <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
    <input type="hidden" name="action" value="menage">
    <?php // ON NE DIT PAS AU SERVEUR QUOI EFFACER. La liste vit dans
          // lib/menage.php ; un formulaire qui nomme le fichier à supprimer est
          // un formulaire qui supprime n'importe quoi. ?>
    <button class="rouge">Retirer ces <?= count($perimes) ?> fichier<?= count($perimes) > 1 ? 's' : '' ?></button>
</form>
<?php endif; ?>
<?php
sectionFin();
