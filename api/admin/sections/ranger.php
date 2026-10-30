<?php
declare(strict_types=1);

/**
 * SECTION « RANGER LA BASE HORS DU DOSSIER WEB ».
 *
 * Tant que la base est dans `www/`, elle n'est protégée que par une RÈGLE — le
 * `.htaccess`. La règle tient aujourd'hui ; elle tiendra tant que l'hébergeur
 * l'appliquera. Rangée hors du dossier servi, elle n'est plus protégée par une
 * règle mais par l'absence de chemin.
 *
 * Inclus par index.php, qui a traité le POST : ici on calcule et on affiche.
 *
 * @var array $prof   le professeur connecté
 * @var ?array $fait  le résultat du rangement qui vient d'avoir lieu, ou null
 * @var string $erreur ce qui a empêché le rangement, ou ''
 */

$cfg = config();

$estSqlite = dbPilote() === 'sqlite';
$fichier = (string) ($cfg['db_file'] ?? '');
$dansLeWeb = $estSqlite && baseDansLeWeb();

// LES TROIS DÉCISIONS VIVENT AILLEURS : elles servent aussi à rangerBase.php,
// qui range pour de bon. Écrites ici ET là-bas, PHP s'arrêterait sur une
// fonction déclarée deux fois le jour où les deux fichiers se croisent.
require_once __DIR__ . '/../rangerOutils.php';

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

sectionDebut('ranger', 'Ranger la base hors du dossier web',
    'la seule chose qui protège vraiment le travail des élèves',
    $dansLeWeb ? 'à faire' : 'fait', $dansLeWeb ? 'attention' : '');
?>

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
    <p><a class="bouton" href="#sante">Revoir la santé</a></p>
</div>
<?php endif; ?>


<?php
sectionFin();
