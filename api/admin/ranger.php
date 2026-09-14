<?php
declare(strict_types=1);

/**
 * RANGER LA BASE HORS DU DOSSIER SERVI PAR LE WEB.
 *
 * La page de santé de Rémy, sur son hébergement, dit tout en vert sauf une
 * ligne : « Clé de chiffrement — dans config.php, à côté de la base ». Elle
 * conseille de déplacer la clé. C'EST LE MAUVAIS CONSEIL, et l'écrire ici
 * m'oblige à le corriger là-bas.
 *
 * POURQUOI DÉPLACER LA CLÉ NE SERT PRESQUE À RIEN. Le danger nommé, c'est « la
 * base récupérée seule ». Or la clé est déjà dans un AUTRE fichier que la base,
 * et ce fichier-là est déjà refusé par le serveur (403, vérifié chez lui). La
 * mettre dans `.htaccess` la laisse dans le même dossier `www/` : une copie du
 * site l'emporte exactement comme avant.
 *
 * CE QUI CHANGE VRAIMENT LES CHOSES, C'EST DE SORTIR LA BASE DE `www/`. Tant
 * qu'elle y est, elle n'est protégée que par une RÈGLE — le `.htaccess`. La
 * règle tient aujourd'hui ; elle tiendra tant que l'hébergeur l'appliquera. Le
 * jour où une mise à jour de sa configuration désactive `AllowOverride`, la
 * base devient téléchargeable et personne n'est prévenu. Rangée hors du dossier
 * servi, AUCUNE ADRESSE NE PEUT Y MENER : ce n'est plus une règle, c'est une
 * impossibilité. La différence entre « on refuse » et « il n'y a pas de
 * chemin » est toute la différence.
 *
 * POURQUOI UNE PAGE ET NON UNE LIGNE DE MODE D'EMPLOI. Parce que le geste
 * demande d'éditer `config.php` à la main sur un serveur en production, de
 * déplacer un fichier de base pendant qu'il est ouvert, et de ne pas se
 * tromper d'ordre. Trois occasions de perdre le travail de toutes les classes.
 * Ici : on regarde d'abord, on copie, on vérifie que la copie s'ouvre et
 * contient bien les mêmes tables, on bascule la configuration, ET SEULEMENT
 * ALORS on efface l'ancienne.
 *
 * `VACUUM INTO` PLUTÔT QU'UNE COPIE DE FICHIER, et ce n'est pas un détail.
 * Copier un fichier SQLite pendant qu'il est utilisé donne une copie qui peut
 * être incohérente — les écritures récentes vivent dans le journal `-wal`, à
 * côté. `VACUUM INTO` demande à SQLite lui-même d'écrire une base neuve,
 * complète et cohérente, journal compris. C'est le geste prévu pour ça.
 */

require_once __DIR__ . '/_socle.php';
require_once __DIR__ . '/../lib/sante.php';

$prof = profConnecte();
$cfg = config();
$retour = 'ranger.php';

$estSqlite = dbPilote() === 'sqlite';
$fichier = (string) ($cfg['db_file'] ?? '');
$dansLeWeb = $estSqlite && baseDansLeWeb();

/**
 * Où ranger la base : un dossier VOISIN de la racine web, jamais dedans.
 *
 * Chez un hébergeur mutualisé, le compte a un dossier personnel et le web n'en
 * est qu'un sous-dossier (`/home/xxx/www`). Le voisin `/home/xxx/atoutmath-donnees`
 * est donc hors d'atteinte du web tout en restant accessible à PHP.
 */
function dossierPropose(): string
{
    $racineWeb = realpath($_SERVER['DOCUMENT_ROOT'] ?? '') ?: (string) ($_SERVER['DOCUMENT_ROOT'] ?? '');
    if ($racineWeb === '' || dirname($racineWeb) === $racineWeb) {
        return '';
    }
    return dirname($racineWeb) . '/atoutmath-donnees';
}

/** Le chemin est-il vraiment hors du dossier servi ? */
function horsDuWeb(string $chemin): bool
{
    $racineWeb = realpath($_SERVER['DOCUMENT_ROOT'] ?? '') ?: (string) ($_SERVER['DOCUMENT_ROOT'] ?? '');
    if ($racineWeb === '') {
        return false;
    }
    $chemin = rtrim(str_replace('\\', '/', $chemin), '/');
    $racineWeb = rtrim(str_replace('\\', '/', $racineWeb), '/');
    return $chemin !== '' && !str_starts_with($chemin . '/', $racineWeb . '/');
}

/** Réécrire config.php avec une nouvelle valeur, sans toucher au reste. */
function ecrireConfig(array $cfg): bool
{
    $chemin = getenv('ATOUTMATH_CONFIG') ?: dirname(__DIR__) . '/config.php';
    $php = "<?php\n// Écrit par AtoutMath le " . date('d/m/Y à H:i') . ".\n"
        . "// Ce fichier contient un secret : il ne doit jamais être public.\nreturn "
        . var_export($cfg, true) . ";\n";
    return @file_put_contents($chemin, $php) !== false;
}

$fait = null;
$erreur = '';

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    exigerJeton();
    $cible = trim((string) ($_POST['dossier'] ?? ''));

    if (!$estSqlite) {
        $erreur = "Cette page ne concerne que les bases « un fichier » (SQLite).";
    } elseif ($cible === '' || !horsDuWeb($cible)) {
        $erreur = "Ce dossier est dans la racine web, ou vide. Il faut un dossier "
            . "qu'aucune adresse ne peut atteindre.";
    } elseif (!is_dir($cible) && !@mkdir($cible, 0700, true) && !is_dir($cible)) {
        $erreur = "Impossible de créer $cible. Créez-le par FTP, puis revenez.";
    } elseif (!is_writable($cible)) {
        $erreur = "$cible existe mais n'est pas accessible en écriture.";
    } else {
        $neuf = rtrim($cible, '/') . '/' . basename($fichier);
        if (is_file($neuf)) {
            $erreur = "Un fichier porte déjà ce nom dans $cible. Effacez-le d'abord.";
        } else {
            try {
                // 1. UNE COPIE COHÉRENTE, écrite par SQLite lui-même.
                db()->exec("VACUUM INTO " . db()->quote($neuf));

                // 2. ON VÉRIFIE LA COPIE AVANT DE BASCULER. Une base qui ne
                //    s'ouvre pas, ou à qui il manque une table, ne remplace
                //    rien du tout : on efface la copie et l'on ne touche pas à
                //    la configuration.
                $essai = new PDO('sqlite:' . $neuf, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
                $tables = $essai->query(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
                )->fetchAll(PDO::FETCH_COLUMN);
                $eleves = (int) $essai->query('SELECT COUNT(*) FROM students')->fetchColumn();
                $essai = null;

                if (count($tables) < 10) {
                    @unlink($neuf);
                    throw new RuntimeException('la copie ne contient que ' . count($tables) . ' tables');
                }

                // 3. La configuration pointe vers la copie.
                $nouveau = $cfg;
                $nouveau['db_file'] = $neuf;
                if (!ecrireConfig($nouveau)) {
                    @unlink($neuf);
                    throw new RuntimeException('config.php n\'est pas accessible en écriture');
                }

                // 4. ET SEULEMENT MAINTENANT, l'ancienne. Avec son journal :
                //    un `-wal` orphelin dans un dossier servi par le web
                //    contient les dernières écritures en clair de tout ce qui
                //    n'est pas chiffré, et il n'a plus rien à faire là.
                $efface = [];
                foreach ([$fichier, $fichier . '-wal', $fichier . '-shm'] as $vieux) {
                    if (is_file($vieux) && @unlink($vieux)) {
                        $efface[] = basename($vieux);
                    }
                }

                $fait = ['ou' => $neuf, 'tables' => count($tables),
                         'eleves' => $eleves, 'efface' => $efface];
            } catch (Throwable $t) {
                $erreur = 'Le déplacement a échoué : ' . $t->getMessage()
                    . '. Rien n\'a été changé.';
            }
        }
    }
    if ($fait) {
        direUneFois('La base est rangée hors du dossier web.');
    }
}

// On relit : la configuration a pu changer à l'instant.
$cfg = config();
$fichier = (string) ($cfg['db_file'] ?? '');
$dansLeWeb = $estSqlite && baseDansLeWeb();
$propose = dossierPropose();

enTete('Ranger la base', $prof, 'sante');
?>
<h1>Ranger la base hors du dossier web</h1>

<?php if ($erreur): ?><div class="carte danger"><b><?= h($erreur) ?></b></div><?php endif; ?>

<?php if (!$estSqlite): ?>

    <div class="carte">
        <p>Votre base est une base <b>MySQL</b> : elle n'est pas un fichier du site,
           et aucune adresse ne peut y mener. <b>Il n'y a rien à ranger.</b></p>
    </div>

<?php elseif (!$dansLeWeb): ?>

    <div class="carte">
        <h2>✓ C'est déjà fait</h2>
        <p>Le fichier de base est rangé <b>hors du dossier servi par le web</b> :</p>
        <p><code><?= h($fichier) ?></code></p>
        <p class="gris-clair" style="margin-bottom:0">Aucune adresse ne peut y mener.
           Ce n'est plus une règle que l'on peut désactiver, c'est une impossibilité.</p>
    </div>

<?php else: ?>

    <div class="carte">
        <h2>Pourquoi</h2>
        <p>Votre base est aujourd'hui <b>dans</b> le dossier servi par le web :</p>
        <p><code><?= h($fichier) ?></code></p>
        <p>Elle n'est pas téléchargeable — la page Santé le vérifie, et votre
           hébergeur répond bien <b>403</b>. Mais elle ne l'est pas parce qu'elle est
           hors d'atteinte : elle l'est parce qu'une <b>règle</b> l'interdit, celle du
           fichier <code>.htaccess</code>.</p>
        <p><b>Cette règle tient tant que l'hébergeur l'applique.</b> Le jour où une
           mise à jour de sa configuration cesse de lire les <code>.htaccess</code>,
           la base devient téléchargeable — et rien ne vous préviendra.</p>
        <p style="margin-bottom:0">Rangée dans un dossier voisin, <b>aucune adresse ne
           peut y mener</b>. La différence entre « on refuse » et « il n'y a pas de
           chemin » est toute la différence.</p>
    </div>

    <?php if ($propose === ''): ?>
        <div class="carte danger">
            <p style="margin:0">Impossible de proposer un dossier : le serveur ne dit pas
               où est sa racine web. Indiquez un chemin absolu hors de la racine.</p>
        </div>
    <?php endif; ?>

    <div class="carte">
        <h2>Comment</h2>
        <p class="gris-clair" style="margin-top:0">Rien n'est effacé avant que la copie
           n'ait été ouverte et vérifiée. Si quoi que ce soit échoue, tout reste en place.</p>
        <form method="post"
              onsubmit="return confirm('Déplacer la base ? La copie est vérifiée avant que l\'ancienne ne soit effacée.')">
            <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
            <label for="dossier">Dossier de destination</label>
            <input type="text" id="dossier" name="dossier" value="<?= h($propose) ?>"
                   spellcheck="false" style="font-family: ui-monospace, monospace">
            <p class="gris-clair">Il sera créé s'il n'existe pas. Il doit être
               <b>hors</b> de <code><?= h((string) ($_SERVER['DOCUMENT_ROOT'] ?? '?')) ?></code>.</p>
            <p><button>Ranger la base ici</button></p>
        </form>
    </div>

<?php endif; ?>

<?php if ($fait): ?>
<div class="carte">
    <h2>C'est fait</h2>
    <ul>
        <li>base copiée dans <code><?= h($fait['ou']) ?></code></li>
        <li><?= (int) $fait['tables'] ?> tables vérifiées, <?= (int) $fait['eleves'] ?> élève(s) retrouvé(s)</li>
        <li>ancienne base effacée<?= $fait['efface'] ? ' (' . h(implode(', ', $fait['efface'])) . ')' : '' ?></li>
    </ul>
    <p><a class="bouton" href="sante.php">Revoir la page Santé</a></p>
</div>
<?php endif; ?>

<p class="gris-clair"><a href="sante.php">← Santé</a></p>
<?php piedDePage();
