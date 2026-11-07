<?php
declare(strict_types=1);

/**
 * RANGER LA BASE HORS DU DOSSIER WEB — ce que fait le bouton.
 *
 * Inclus par index.php quand le formulaire de la section « Ranger » est envoyé.
 * Il vit à part parce que c'est la SEULE action de cette administration qui
 * touche à la configuration ET à la base en même temps : elle mérite d'être lue
 * d'un bloc, sans le reste de la page autour.
 *
 * L'ORDRE DES QUATRE ÉTAPES EST TOUT. On copie, on VÉRIFIE la copie, on fait
 * pointer la configuration dessus, et seulement alors on efface l'ancienne —
 * avec son journal, car un fichier `-wal` orphelin dans un dossier servi par
 * le web contient les dernières écritures en clair de tout ce qui n'est pas
 * chiffré. Inverser deux de ces étapes, c'est perdre le travail des classes.
 *
 * @var array $prof    le professeur connecté
 * @var ?array $fait   rempli si le rangement a réussi
 * @var string $erreur rempli si quelque chose l'a empêché
 */

require_once __DIR__ . '/../lib/sante.php';
require_once __DIR__ . '/rangerOutils.php';

$cfg = config();
$estSqlite = dbPilote() === 'sqlite';
$fichier = (string) ($cfg['db_file'] ?? '');

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

