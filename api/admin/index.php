<?php
declare(strict_types=1);

/**
 * L'ADMINISTRATION, EN UNE SEULE PAGE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RÉMY : « la zone admin n'a plus besoin de classe et est vieillotte, va à
 * l'essentiel avec des choses déroulantes », puis « j'aimerai en une seule page
 * même pour le déposer », puis, devant l'aperçu : « mets le déposer en haut et
 * la santé en dessous ».
 *
 * ── CE QUI A DISPARU, ET POURQUOI C'EST LA MOITIÉ DU TRAVAIL ────────────────
 *
 * LES CLASSES ONT QUITTÉ L'ADMINISTRATION. Il y avait ici la liste des classes,
 * leur création, la conduite de séance (`classe.php`, 408 lignes) et les listes
 * d'élèves (`eleves.php`, 386 lignes). Tout cela se fait maintenant DANS le
 * logiciel, et depuis un moment : `api/index.php` sert déjà l'espace Classes
 * par `lib/eleves.php`, qui est la MÊME mise en œuvre, pas une copie.
 *
 * L'administration en gardait donc une seconde version — forcément moins bonne,
 * forcément en retard, et à maintenir en double. Rémy : « je n'ai plus besoin
 * des classes ». Huit cents lignes s'en vont avec elles.
 *
 * SIX PAGES DEVIENNENT UNE. `sante.php`, `rapport.php` et `ranger.php` sont
 * devenues des SECTIONS de celle-ci — leur calcul n'a pas changé d'une ligne,
 * seul l'endroit où il s'affiche a bougé. Les trois fichiers restent, réduits à
 * une redirection : `deposer.php`, le README et les instructions du paquet
 * envoient vers eux depuis longtemps, et un lien qui tombe dans le vide le jour
 * d'une installation ratée est le pire moment pour découvrir qu'on l'a déplacé.
 *
 * ── L'ORDRE DES SECTIONS EST CELUI DE L'USAGE ───────────────────────────────
 *
 * Le DÉPÔT d'abord, et déplié : c'est ce qu'on vient faire. La SANTÉ ensuite,
 * repliée, mais son état se lit sur la pastille de sa section — et si un point
 * est grave, une ligne le dit tout en haut et la section s'ouvre d'elle-même.
 * Tout en vert, rien ne s'affiche : un bandeau « tout va bien » ne sert qu'à
 * repousser d'un cran ce pour quoi on est venu.
 */

require_once __DIR__ . '/_socle.php';
require_once __DIR__ . '/../lib/seance.php';
require_once __DIR__ . '/../lib/coffre.php';
require_once __DIR__ . '/../lib/sante.php';
require_once __DIR__ . '/../lib/guichet.php';
require_once __DIR__ . '/../lib/menage.php';

// LE DÉPOSEUR, CHARGÉ SANS SA PAGE. Il apporte `lireArchive`, `poserArchive`,
// `plafondTransfert`, `archivesPresentes` et `poids` — les règles qui refusent
// une archive piégée, éprouvées à leur place et appelées d'ici.
define('DEPOSER_SANS_PAGE', true);
require_once dirname(__DIR__, 2) . '/deposer.php';

demarrerSession();

if (isset($_GET['deconnexion'])) {
    $_SESSION = [];
    session_destroy();
    header('Location: index.php');
    exit;
}

// La base peut avoir été installée avant une mise à jour qui ajoute une table :
// on remet le schéma à niveau à chaque entrée. C'est idempotent et instantané.
try {
    migrer();
} catch (Throwable $t) {
    http_response_code(500);
    exit('Base de données injoignable. Avez-vous lancé api/install.php ?');
}

$erreur = '';

// --- Connexion -------------------------------------------------------------
if (empty($_SESSION['prof']) && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $email = trim((string) ($_POST['email'] ?? ''));
    $mdp   = (string) ($_POST['mdp'] ?? '');
    // DIX ESSAIS PAR MINUTE, COMME L'API — et cette page ne les comptait pas.
    //
    // `/teacher/login` est bornée depuis longtemps. Cette page-ci ouvre la
    // MÊME porte, avec le MÊME mot de passe, et ne comptait rien : elle se
    // contentait du `sleep(1)` plus bas, qui ne retarde que la requête en
    // cours et ne gêne pas celui qui en lance quarante à la fois. MESURÉ :
    // 40 essais en parallèle, 40 réponses 200 en dix secondes, et le bon mot
    // de passe passait encore juste après.
    //
    // Ce mot de passe n'ouvre pas que l'administration : il ouvre aussi
    // l'espace professeur et le dépôt de fichiers, c'est-à-dire l'écriture sur
    // le site. C'était la dernière porte non gardée.
    $tropDEssais = compterEtDepasse('admin_login_' . ($_SERVER['REMOTE_ADDR'] ?? 'x'), 10);
    // L'ADRESSE SE COMPARE SANS TENIR COMPTE DES MAJUSCULES.
    //
    // Rémy, enfermé dehors : « mon mail et code ne fonctionnent pas ». Une
    // adresse électronique ne distingue pas la casse — personne au monde ne
    // considère « Prof@College.fr » et « prof@college.fr » comme deux boîtes
    // différentes. Mais `WHERE email = ?` le faisait, et le message de refus
    // est le même dans les deux cas, exprès : impossible de comprendre qu'on
    // s'est simplement trompé de majuscule.
    $stmt = db()->prepare('SELECT * FROM teachers WHERE LOWER(email) = LOWER(?) LIMIT 1');
    $stmt->execute([$email]);
    $prof = $stmt->fetch();
    // LA MÊME PHRASE DANS LES DEUX CAS. Dire « cette adresse n'existe pas »
    // apprend à un inconnu quelles adresses existent.
    if (!$tropDEssais && $prof && password_verify($mdp, $prof['password_hash'])) {
        session_regenerate_id(true);
        $_SESSION['prof'] = $prof['id'];
        redirige('index.php');
    }
    // Une seconde d'attente : de quoi rendre l'essai en boucle inintéressant.
    sleep(1);
    // ON DIT QU'ON COMPTE, mais sans dire si l'adresse existe : le professeur
    // qui s'est trompé trois fois comprend qu'il doit souffler une minute,
    // l'inconnu n'apprend rien de plus qu'avant.
    $erreur = $tropDEssais
        ? 'Trop d\'essais. Attendez une minute avant de réessayer.'
        : 'Adresse ou mot de passe incorrect.';
}

if (empty($_SESSION['prof'])) {
    ?><!doctype html><html lang="fr"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>AtoutMath — connexion</title><style>
    body { font: 16px/1.5 system-ui, sans-serif; background: #f6f7fb; color: #1a202c;
           display: grid; place-items: center; min-height: 100vh; margin: 0; }
    form { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
           padding: 26px; width: min(400px, 92vw); }
    h1 { font-size: 1.3rem; margin: 0 0 18px; }
    label { display: block; font-weight: 600; font-size: .9rem; margin: 14px 0 4px; }
    input { width: 100%; padding: 9px 11px; border: 1px solid #cbd5e1;
            border-radius: 9px; font: inherit; box-sizing: border-box; }
    button { width: 100%; margin-top: 20px; font: inherit; font-weight: 700;
             padding: 11px; border: none; border-radius: 10px; background: #4f46e5; color: #fff; }
    .err { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b;
           border-radius: 9px; padding: 10px 12px; margin-top: 14px; font-size: .92rem; }
    </style></head><body>
    <form method="post">
        <h1>AtoutMath — administration</h1>
        <label>Adresse électronique<input type="email" name="email" required autofocus></label>
        <label>Mot de passe<input type="password" name="mdp" required></label>
        <?php if ($erreur): ?><div class="err"><?= h($erreur) ?></div><?php endif; ?>
        <button>Entrer</button>
    </form></body></html><?php
    exit;
}

$prof = profConnecte();

// LA PURGE PASSE ICI, une fois par jour au plus. Il n'y a pas de `cron` sur un
// hébergement mutualisé, et une conservation limitée qui dépend d'une tâche
// planifiée qu'on ne peut pas installer n'est pas une conservation limitée.
purgerSiNecessaire();

// ═══════════════════ CE QUE LES FORMULAIRES DEMANDENT ═══════════════════════
//
// TOUT LE TRAITEMENT EST ICI, ET L'AFFICHAGE EST AILLEURS. Les sections ne font
// que calculer et écrire ; elles ne changent rien. C'est ce qui permet de les
// lire — et de les réordonner — sans se demander laquelle a un effet de bord.
//
// CHAQUE ACTION REVIENT SUR SON ANCRE. Après avoir ouvert le guichet, on veut
// se retrouver devant le dépôt, pas en haut de la page : une redirection qui
// oublie l'ancre oblige à redéplier ce qu'on venait de déplier.

$apercu = null;        // ce que contient l'archive examinée
$pose = null;          // le résultat d'une pose
$erreurDepot = '';
$fait = null;          // le rangement de la base
$erreur = '';

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    exigerJeton();
    $action = (string) ($_POST['action'] ?? '');

    // --- Le guichet des mises à jour ---------------------------------------
    if (($_POST['guichet'] ?? '') === 'ouvrir') {
        // LE GUICHET DONNE LE SITE, PAS UNE CLASSE. Poser une archive écrit des
        // fichiers PHP : qui l'ouvre peut remplacer le logiciel, et lire par là
        // tout ce qui appartient aux autres professeurs. C'est donc un geste de
        // l'installation, comme créer un compte — il revient à celui qui a
        // installé le site. Voir `professeurFondateur` dans lib/db.php : le
        // modèle tient en une phrase, tous égaux devant leurs classes, un seul
        // responsable du serveur.
        if (!estLeFondateur($prof)) {
            redirige('index.php#depot', 'Seul le professeur qui a installé le site '
                . 'ouvre le guichet des mises à jour.');
        }
        ouvrirGuichet();
        redirige('index.php#depot', 'Guichet ouvert pour trente minutes.');
    }
    if (($_POST['guichet'] ?? '') === 'fermer') {
        fermerGuichet();
        redirige('index.php#depot', 'Guichet refermé.');
    }

    // --- Effacer install.php, d'un bouton ----------------------------------
    if ($action === 'effacer-installeur') {
        $ok = @unlink(dirname(__DIR__) . '/install.php');
        redirige('index.php#sante', $ok
            ? 'install.php est effacé.'
            : "Impossible de l'effacer : supprimez api/install.php par FTP.");
    }

    // --- Retirer les fichiers d'une version précédente ----------------------
    if ($action === 'menage') {
        $r = effacerFichiersPerimes(dirname(__DIR__, 2));
        $n = count($r['effaces']);
        redirige('index.php#sante', $r['restants']
            ? $n . ' retiré(s), mais ' . implode(', ', $r['restants'])
                . ' résiste(nt) : supprimez-les par FTP.'
            : ($n > 0
                ? $n . ' fichier' . ($n > 1 ? 's' : '') . ' d\'une version précédente retiré'
                    . ($n > 1 ? 's' : '') . '.'
                : 'Il n\'y en avait plus.'));
    }

    // --- Le dépôt d'une archive --------------------------------------------
    //
    // RIEN NE S'ÉCRIT TANT QUE LE GUICHET EST FERMÉ, et on le vérifie ICI plutôt
    // que dans l'affichage : une page qui cache un bouton mais accepte quand
    // même la requête ne protège rien du tout.
    if (in_array($action, ['televerser', 'apercu', 'poser'], true)) {
        if (!guichetOuvert()) {
            redirige('index.php#depot', 'Le guichet est fermé. Ouvrez-le d\'abord.');
        }
        $racine = dirname(__DIR__, 2);

        if ($action === 'televerser') {
            $f = $_FILES['archive'] ?? null;
            if (!$f || ($f['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
                $erreurDepot = 'Choisissez une archive.';
            } elseif (($f['error'] ?? 1) !== UPLOAD_ERR_OK) {
                // C'EST L'ERREUR QU'ON RENCONTRERA VRAIMENT sur un hébergement
                // mutualisé : le plafond de transfert de PHP y est souvent à
                // 2 Mo et l'archive en fait plus du double. On ne dit pas
                // « erreur 1 », on dit quoi faire.
                $erreurDepot = 'Le transfert a échoué. Le plafond de cet hébergement est de '
                    . poids(plafondTransfert()) . ' ; déposez plutôt l\'archive à la '
                    . 'racine du site avec l\'explorateur de votre hébergeur, puis '
                    . 'rechargez cette page.';
            } else {
                $nom = basename((string) $f['name']);
                if (!preg_match('/^[\w.-]+\.zip$/', $nom)) {
                    $erreurDepot = 'Ce fichier n\'est pas une archive .zip.';
                } elseif (!@move_uploaded_file($f['tmp_name'], $racine . '/' . $nom)) {
                    $erreurDepot = 'Impossible d\'écrire l\'archive à la racine du site. '
                        . 'Le dossier n\'est peut-être pas accessible en écriture.';
                } else {
                    $_POST['archive'] = $nom;
                    $action = 'apercu';   // reçue : on montre aussitôt ce qu'elle contient
                }
            }
        }

        if ($action === 'apercu' && $erreurDepot === '') {
            $nom = basename((string) ($_POST['archive'] ?? ''));
            $chemin = $racine . '/' . $nom;
            if ($nom === '' || !is_file($chemin)) {
                $erreurDepot = 'Archive introuvable.';
            } else {
                $apercu = lireArchive($chemin) + ['nom' => $nom, 'poids' => filesize($chemin)];
                if ($apercu['erreur'] !== '') {
                    $erreurDepot = (string) $apercu['erreur'];
                    $apercu = null;
                }
            }
        }

        if ($action === 'poser') {
            $nom = basename((string) ($_POST['archive'] ?? ''));
            $chemin = $racine . '/' . $nom;
            if ($nom === '' || !is_file($chemin)) {
                $erreurDepot = 'Archive introuvable.';
            } else {
                $pose = poserArchive($chemin);
                inscrireDepot($nom, (int) ($pose['ecrits'] ?? 0));
                if (($_POST['effacer'] ?? '') === 'oui' && empty($pose['erreurs'])) {
                    @unlink($chemin);
                }
            }
        }
    }

    // --- Ranger la base hors du dossier web --------------------------------
    if ($action === 'ranger') {
        require __DIR__ . '/rangerBase.php';   // calcule $fait ou $erreur
    }
}

enTete('Administration', $prof);

// LE VERDICT DE SANTÉ, CALCULÉ AVANT D'ÊTRE AFFICHÉ — parce qu'il se lit tout
// en haut alors que sa section est en bas. On ne peut donc pas se contenter de
// le sortir au fil de l'eau : on met la section de côté, et l'on écrit son
// verdict avant elle.
ob_start();
require __DIR__ . '/sections/sante.php';
$htmlSante = ob_get_clean();

if (($santeGraves ?? 0) > 0 || ($santeTiedes ?? 0) > 0) {
    $grave = ($santeGraves ?? 0) > 0;
    ?>
    <div class="avis<?= $grave ? ' avis--grave' : '' ?>">
        <span class="marque" aria-hidden="true"><?= $grave ? '✗' : '!' ?></span>
        <p><b><?= $grave
            ? (int) $santeGraves . ' point' . ($santeGraves > 1 ? 's' : '') . ' grave'
                . ($santeGraves > 1 ? 's' : '') . ' à corriger'
            : (int) $santeTiedes . ' point' . ($santeTiedes > 1 ? 's' : '') . ' à regarder' ?>
        dans la santé de l'installation.</b> <a href="#sante">Voir</a>.</p>
    </div>
    <?php
}
?>
<p class="rappel">Les classes, les élèves et la conduite de séance ont quitté
cette page : tout cela se fait dans le logiciel. Il ne reste ici que ce qui
touche au serveur.</p>
<?php

require __DIR__ . '/sections/depot.php';
echo $htmlSante;
require __DIR__ . '/sections/ranger.php';
require __DIR__ . '/sections/rapport.php';
require __DIR__ . '/sections/compte.php';

piedDePage();
