<?php
declare(strict_types=1);

/**
 * API AtoutMath — routeur unique.
 *
 * Surface volontairement réduite :
 *
 *   POST /join                 rattacher un appareil à une classe (élève)
 *   POST /login                identifiant + code élève (liste du professeur)
 *   POST /sync                 pousser/tirer des événements (élève)
 *   POST /session              l'état de séance seul (verrou, mot, déblocages)
 *   POST /messages/read        « j'ai lu ce mot »
 *   POST /signalement          « ça ne marche pas » (élève), avec sa photo
 *   POST /teacher/login        connexion professeur
 *   POST /teacher/classes      créer/lister des classes
 *   POST /teacher/paths        enregistrer/lister des parcours
 *   POST /teacher/assign       assigner un parcours à une classe
 *   POST /teacher/report       bilan d'une classe (notes recalculées)
 *   POST /teacher/student      détail d'un élève
 *   POST /teacher/class        conduire une classe : renommer, verrouiller,
 *                              consigne, vider, supprimer
 *   POST /teacher/roster       la liste : lire, aperçu, importer, codes, retirer
 *   POST /teacher/live         qui travaille en ce moment, et sur quoi
 *   POST /teacher/message      un mot à la classe ou à un élève
 *   POST /teacher/signup       lister, créer, retirer un professeur
 *   POST /teacher/override     autoriser le saut d'un exercice, ou le retirer
 *   POST /teacher/signalements ce que les élèves ont signalé
 *
 * LES CINQ DERNIÈRES ONT ÉTÉ AJOUTÉES POUR L'APPLICATION. Rémy : « j'aimerai
 * ne pas passer par admin et dans atout math sans passer par la zone admin ».
 * Il ne pouvait pas : tous les gestes qui ÉCRIVENT n'existaient que dans les
 * pages `api/admin/`, derrière un cookie de session que le jeton de
 * l'application n'ouvre pas. L'API savait créer une classe, et rien d'autre.
 *
 * ELLES NE DUPLIQUENT AUCUNE LOGIQUE : ce qui décide et ce qui écrit vit dans
 * `lib/eleves.php`, et les pages d'administration s'en servent désormais aussi.
 * Deux écrans, une seule mise en œuvre — voir l'en-tête de ce fichier-là.
 *
 * Tout est en POST/JSON pour éviter la mise en cache intempestive des GET par
 * les proxys d'établissement, fréquents en milieu scolaire.
 */

require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/projections.php';
require_once __DIR__ . '/lib/grading.php';
require_once __DIR__ . '/lib/seance.php';
require_once __DIR__ . '/lib/coffre.php';
require_once __DIR__ . '/lib/eleves.php';
require_once __DIR__ . '/lib/schema.php';
// `lireReglage` / `ecrireReglage` : le magasin clé/valeur du site.
require_once __DIR__ . '/lib/guichet.php';

// CE QU'UN SIGNALEMENT A LE DROIT DE PESER.
//
// Les trois bornes sont ici, ensemble, parce qu'elles se lisent ensemble : un
// signalement complet tient au pire en 420 ko, dont 400 de photo. Trente élèves
// en envoyant chacun un, c'est douze mégaoctets — ce qu'une classe produit en
// une heure de journal ordinaire. Au-delà, ce n'est plus un signalement, c'est
// un dépôt de fichiers, et ce n'est pas ce qu'on construit ici.
//
// LE CORPS EST COURT EXPRÈS. Mille signes, c'est un gros paragraphe. Ce qui
// aide le professeur à reproduire la panne n'est pas la longueur du récit,
// c'est le CONTEXTE — qui, lui, part tout seul.
const SIGNAL_CORPS_MAX    = 1000;
const SIGNAL_CONTEXTE_MAX = 4000;
const SIGNAL_IMAGE_MAX    = 400000;

applyCors();

// LA BASE SE MET À JOUR TOUTE SEULE, AU PREMIER APPEL APRÈS UN DÉPÔT.
//
// Elle ne le faisait pas : `migrer()` n'était appelé que par `install.php`,
// `motdepasse.php` et les pages d'administration — jamais par l'API que
// l'application utilise. Une mise à jour qui ajoutait une colonne laissait donc
// la base en arrière, et la première requête qui nommait cette colonne partait
// en erreur SQL. Le serveur répondait 500, et l'élève lisait « Connexion
// impossible pour l'instant. Préviens ton professeur. » Rémy l'a eu en classe,
// avec ses élèves devant lui.
//
// Le coût est d'une lecture d'une ligne par requête : voir
// `migrerSiNecessaire()`, qui ne migre que si la version stockée a changé.
//
// SI LA MIGRATION ÉCHOUE, ON NE FAIT PAS TOMBER L'API. Une base sans droit
// d'ALTER sur un hébergement bridé doit continuer à servir ce qu'elle sait
// servir, plutôt que de refuser tout le monde à l'entrée.
try { migrerSiNecessaire(); } catch (Throwable $t) { /* on sert quand même */ }

// LA PURGE NE TOURNAIT QUE SI L'ON OUVRAIT L'ADMINISTRATION.
//
// `purgerSiNecessaire()` n'était appelée que depuis `admin/index.php`. Or
// Rémy travaille désormais depuis l'espace professeur de l'application, qui
// passe entièrement par ici : il pouvait conduire sa classe toute l'année
// sans jamais déclencher l'effacement — pendant que la page Santé affichait
// « conservation limitée à N jours ». Une promesse écrite à l'écran que le
// code ne tenait pas.
//
// Le coût est nul : la fonction se garde elle-même par un témoin quotidien
// (`api/.derniere-purge`) et rend la main aussitôt les autres fois. Et elle
// ne doit jamais faire tomber l'API : effacer de vieux événements est moins
// urgent que servir la classe qui est en train de travailler.
//
// CE QU'ELLE N'EFFACE TOUJOURS PAS : la table `students`, donc les prénoms.
// Ce n'est pas un oubli à réparer en passant — c'est une politique à décider
// (au bout de combien de temps un élève parti cesse-t-il d'exister ?), et
// c'est à Rémy de la fixer, pas à moi.
try { purgerSiNecessaire(); } catch (Throwable $t) { /* la classe passe avant */ }

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/');
$route = '/' . trim(substr($path, strlen($base)), '/');

switch ($route) {
    case '/join':            handleJoin(); break;
    case '/login':           handleLogin(); break;
    case '/sync':            handleSync(); break;
    case '/session':         handleSession(); break;
    case '/messages/read':   handleMessagesRead(); break;
    case '/signalement':     handleSignalement(); break;
    case '/defi/score':      handleDefiScore(); break;
    case '/teacher/login':   handleTeacherLogin(); break;
    case '/teacher/classes': handleTeacherClasses(); break;
    case '/teacher/paths':   handleTeacherPaths(); break;
    case '/teacher/assign':  handleTeacherAssign(); break;
    case '/teacher/report':  handleTeacherReport(); break;
    case '/teacher/student': handleTeacherStudent(); break;
    case '/teacher/class':   handleTeacherClass(); break;
    case '/teacher/roster':  handleTeacherRoster(); break;
    case '/teacher/live':    handleTeacherLive(); break;
    case '/teacher/message': handleTeacherMessage(); break;
    case '/teacher/signup':  handleTeacherSignup(); break;
    case '/teacher/override': handleTeacherOverride(); break;
    case '/teacher/signalements': handleTeacherSignalements(); break;
    case '/teacher/connexions':  handleTeacherConnexions(); break;
    // LES RÉGLAGES DU SITE. En lecture, la route est PUBLIQUE — et il le faut :
    // le mode libre décide de ce qu'un visiteur voit sur la porte d'entrée,
    // c'est-à-dire avant qu'il ait le moindre jeton. En écriture, il faut être
    // professeur.
    case '/reglages':         handleReglages(); break;
    case '/teacher/reglages': handleTeacherReglages(); break;
    case '/health':          respond(['ok' => true]); break;
    default:                 fail(404, 'not_found', 'Route inconnue : ' . $route);
}

// ---------------------------------------------------------------- Élève ----

/**
 * Rattachement d'un appareil à une classe.
 *
 * Un élève qui saisit le même prénom dans la même classe retrouve son compte :
 * c'est ce qui permet de travailler à l'école puis à la maison sans mot de
 * passe. Le compromis est assumé — deux élèves homonymes dans une classe
 * doivent utiliser des prénoms distincts (« Camille B. »).
 */
function handleJoin(): void
{
    $body = jsonBody();
    $code = strtoupper(trim((string) ($body['classCode'] ?? '')));
    $name = trim((string) ($body['firstName'] ?? ''));

    // ON NE COMPTE PLUS PAR ADRESSE, ET C'EST UNE CORRECTION, PAS UN CONFORT.
    //
    // Une salle informatique sort par UNE adresse publique. À vingt entrées par
    // minute, le vingt et unième élève d'une classe de trente était refusé — et
    // le message lui disait qu'il avait fait trop d'essais, ce qui était faux :
    // c'était son premier. Le professeur, lui, voyait un élève bloqué sans
    // raison, et rien à l'écran ne pouvait le lui expliquer.
    //
    // Ce qu'on protège vraiment, c'est l'essai EN BOUCLE sur un seul code : on
    // compte donc par code de classe. La borne par adresse reste, mais large —
    // elle ne sert plus qu'à arrêter une machine devenue folle, pas une classe.
    rateLimit('join_ip_' . ($_SERVER['REMOTE_ADDR'] ?? 'x'), 300);

    if ($code === '' || $name === '') {
        fail(400, 'missing_fields', 'Code de classe et prénom obligatoires.');
    }
    rateLimit('join_code_' . $code, 60);
    if (mb_strlen($name) > 80) {
        fail(400, 'name_too_long', 'Prénom trop long.');
    }

    $stmt = db()->prepare('SELECT * FROM classes WHERE join_code = ? AND archived = 0 LIMIT 1');
    $stmt->execute([$code]);
    $class = $stmt->fetch();
    if (!$class) {
        fail(404, 'class_not_found', 'Aucune classe avec ce code.');
    }

    // On cherche sur l'INDEX AVEUGLE, pas sur le prénom : le prénom est chiffré
    // et ne se compare pas. Voir `lib/coffre.php`.
    $empreinte = empreintePrenom($name);
    $stmt = db()->prepare('SELECT * FROM students WHERE class_id = ? AND first_name_key = ? LIMIT 1');
    $stmt->execute([$class['id'], $empreinte]);
    $student = $stmt->fetch();

    // L'ÉLÈVE MIS DE CÔTÉ NE SE RATTACHE PLUS. C'est le seul endroit où l'on
    // refuse vraiment : ailleurs on se contente de dire au client de se tenir
    // tranquille. Ici, refuser est la seule façon d'empêcher qu'un jeton neuf
    // soit délivré à quelqu'un que le professeur vient d'écarter.
    if ($student && !empty($student['blocked'])) {
        fail(403, 'student_blocked', "Ton professeur a mis ton accès en pause. Préviens-le.");
    }

    // ── L'INSCRIPTION LIBRE EST FERMÉE PAR DÉFAUT ────────────────────────────
    //
    // RÉMY, en découvrant cet écran : « à quoi sert rejoindre ma classe ? »…
    // puis « je pense qu'il faut le fermer, mais permettre la réouverture ».
    //
    // CETTE PORTE CRÉE DES ÉLÈVES. C'est ce qu'elle est faite pour faire, et
    // c'est utile au professeur qui n'a pas de liste : il annonce un code au
    // tableau et la classe se peuple. Mais quand la liste vient de Pronote,
    // elle devient un piège. L'empreinte du prénom est tolérante — accents,
    // casse et ordre des mots ne comptent pas, « Maëlle Nguyên » retrouve bien
    // « NGUYÊN Maëlle » — mais le NOMBRE DE MOTS compte : la liste dit
    // « BOSSE Cassandre », Cassandre tape « Cassandre », et voilà une seconde
    // Cassandre, vierge de tout travail, à côté de la vraie.
    //
    // FERMÉE, LA PORTE NE CRÉE PLUS RIEN. Un élève déjà dans la liste peut
    // encore entrer par là — il ne fabrique personne, et cela dépanne celui
    // dont le billet est resté à la maison. C'est l'inscription qu'on ferme,
    // pas la classe.
    //
    // Réglage de SITE, comme le catalogue en libre accès : même écran, même
    // interrupteur, et un seul endroit à regarder pour savoir ce qui est
    // ouvert.
    if (!$student && lireReglage('site.inscriptionLibre', '0') !== '1') {
        fail(403, 'inscription_fermee',
            "Cette classe ne s'ouvre qu'avec le billet donné par ton professeur. "
            . 'Demande-lui le tien.');
    }

    $token = newToken();
    if ($student) {
        db()->prepare('UPDATE students SET token_hash = ?, last_seen_at = ' . sqlMaintenant() . ' WHERE id = ?')
            ->execute([hashToken($token), $student['id']]);
        $studentId = $student['id'];
    } else {
        $studentId = uuidv4();
        db()->prepare('INSERT INTO students (id, class_id, first_name, first_name_key, token_hash)
                       VALUES (?, ?, ?, ?, ?)')
            ->execute([$studentId, $class['id'], chiffrer($name), $empreinte, hashToken($token)]);
    }
    // LE JETON S'AJOUTE, IL NE REMPLACE PAS. Se rattacher à la maison ne doit
    // pas faire taire l'ordinateur de l'école, qui aurait encore du travail à
    // remonter. Voir la table `student_tokens` dans `lib/schema.php`.
    db()->prepare(sqlInsereSansDoublon() . ' INTO student_tokens (token_hash, student_id) VALUES (?, ?)')
        ->execute([hashToken($token), $studentId]);
    elaguerJetons($studentId);

    respond([
        'studentId' => $studentId,
        'token' => $token,
        'classCode' => $class['join_code'],
        'className' => $class['name'],
        // L'état de séance dès le rattachement : si la classe est déjà
        // verrouillée, l'élève ne doit pas voir le catalogue une seule seconde.
        'session' => etatDeSeance(['id' => $studentId, 'class_id' => $class['id'], 'blocked' => 0]),
    ]);
}

/**
 * CONNEXION PAR IDENTIFIANT ET CODE — la liste du professeur.
 *
 * Rémy : « pour la connexion, fais aussi une connexion avec identifiant et code
 * élève, je fournirai la liste. »
 *
 * DEUX CHAMPS, PAS TROIS. On ne demande pas le code de la classe : l'identifiant
 * suffit à retrouver l'élève, puisque le professeur les a écrits lui-même et
 * qu'ils sont uniques. C'est une frappe de moins pour un élève de sixième, et
 * une dictée de moins pour le professeur.
 *
 * CE QUE CELA CHANGE PAR RAPPORT AU CODE DE CLASSE. Avec `/join`, l'élève se
 * DÉCLARE : qui connaît le code de la classe peut se dire « Léa ». Ici, seul
 * celui qui est sur la liste entre, et sous le nom qu'on lui a donné. C'est la
 * bonne porte quand le travail compte.
 *
 * LE MESSAGE D'ÉCHEC EST LE MÊME DANS LES DEUX CAS — identifiant inconnu ou
 * code faux. Distinguer apprendrait à un curieux quels identifiants existent,
 * c'est-à-dire la liste de la classe.
 */
function handleLogin(): void
{
    $body = jsonBody();
    $login = trim((string) ($body['login'] ?? ''));
    $code  = strtoupper(trim((string) ($body['code'] ?? '')));

    // MÊME RAISON QUE POUR `join` : trente élèves derrière une seule adresse,
    // c'est une classe, pas une attaque. Le compte se fait par IDENTIFIANT —
    // douze essais par minute sur un billet donné, ce qui laisse largement de
    // quoi se tromper deux fois et ne laisse rien pour forcer quatre signes.
    rateLimit('login_ip_' . ($_SERVER['REMOTE_ADDR'] ?? 'x'), 300);

    if ($login === '' || $code === '') {
        fail(400, 'missing_fields', 'Identifiant et code obligatoires.');
    }
    rateLimit('login_eleve_' . mb_strtolower($login), 12);

    $stmt = db()->prepare(
        'SELECT s.*, c.name AS class_name, c.join_code, c.archived
         FROM students s JOIN classes c ON c.id = s.class_id
         WHERE s.login_key = ? LIMIT 1'
    );
    $stmt->execute([empreinteLogin($login)]);
    $student = $stmt->fetch();

    // Une seconde d'attente sur l'échec : de quoi rendre l'essai en boucle
    // inintéressant, sans que l'élève qui se trompe une fois le remarque.
    // `hash_equals` et non `===` : la comparaison ne doit pas s'arrêter au
    // premier signe qui diffère, sinon le TEMPS de la réponse dit combien de
    // signes étaient bons.
    $attendu = $student ? (string) dechiffrer($student['access_code']) : '';
    if (!$student || $attendu === '' || !hash_equals(strtoupper($attendu), $code)) {
        sleep(1);
        fail(401, 'bad_login', "Identifiant ou code incorrect. Vérifie ton billet, ou demande à ton professeur.");
    }
    if (!empty($student['blocked'])) {
        fail(403, 'student_blocked', "Ton professeur a mis ton accès en pause. Préviens-le.");
    }
    if (!empty($student['archived'])) {
        fail(403, 'class_archived', "Cette classe est fermée.");
    }

    $token = newToken();
    db()->prepare('UPDATE students SET token_hash = ?, last_seen_at = ' . sqlMaintenant() . ' WHERE id = ?')
        ->execute([hashToken($token), $student['id']]);
    db()->prepare(sqlInsereSansDoublon() . ' INTO student_tokens (token_hash, student_id) VALUES (?, ?)')
        ->execute([hashToken($token), $student['id']]);
    elaguerJetons($student['id']);

    // ON ÉCRIT QU'IL EST ENTRÉ, ET D'OÙ — voir `noterLaConnexion` dans
    // api/lib/seance.php. Rémy : « J'aimerai aussi que tu enregistres les
    // connexions que je puisse suivre ce qu'ils font ».
    //
    // APRÈS L'ÉTAT, ET NON AVANT : c'est l'état qui dit s'il y avait une
    // séance imposée ou une porte fermée, et c'est cela qui l'intéresse.
    $session = etatDeSeance($student);
    noterLaConnexion($student, $session);

    respond([
        'studentId' => $student['id'],
        'token' => $token,
        'classCode' => $student['join_code'],
        'className' => $student['class_name'],
        'firstName' => dechiffrer($student['first_name']),
        'session' => $session,
    ]);
}

/**
 * ON N'EN GARDE QUE CINQ.
 *
 * Sans borne, chaque rattachement laisserait une ligne pour toujours : un élève
 * qui saisit son prénom vingt fois dans l'année en aurait vingt valides, et
 * chacune est une clé qui ouvre son compte. Cinq couvre largement le cas réel —
 * l'ordinateur de la salle, la tablette de la classe, celui de la maison — et
 * le sixième rattachement fait tomber le plus ancien, c'est-à-dire l'appareil
 * dont on ne se sert plus.
 */
function elaguerJetons(string $studentId, int $garde = 5): void
{
    $stmt = db()->prepare(
        'SELECT token_hash FROM student_tokens WHERE student_id = ?
         ORDER BY created_at DESC, token_hash DESC'
    );
    $stmt->execute([$studentId]);
    $tous = array_column($stmt->fetchAll(), 'token_hash');
    $trop = array_slice($tous, $garde);
    if (!$trop) {
        return;
    }
    $del = db()->prepare('DELETE FROM student_tokens WHERE token_hash = ?');
    foreach ($trop as $t) {
        $del->execute([$t]);
    }
}

/**
 * Synchronisation : union d'événements.
 *
 * L'insertion est idempotente (INSERT IGNORE sur l'UUID client), donc renvoyer
 * deux fois le même lot est sans effet. Le client reçoit en retour les
 * événements de ses autres appareils, au-delà du curseur qu'il a transmis.
 */
function handleSync(): void
{
    $student = requireStudent();
    rateLimit('sync_' . $student['id'], 120);

    $body = jsonBody();
    $incoming = is_array($body['events'] ?? null) ? $body['events'] : [];
    $cursor = (int) ($body['cursor'] ?? 0);
    $deviceId = substr((string) ($body['deviceId'] ?? 'unknown'), 0, 64);

    if (count($incoming) > 1000) {
        fail(413, 'too_many_events', 'Envoyez au maximum 1000 événements par requête.');
    }

    $accepted = [];
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $insert = $pdo->prepare(
            sqlInsereSansDoublon() . ' INTO events (id, student_id, device_id, type, ts, payload) VALUES (?, ?, ?, ?, ?, ?)'
        );
        foreach ($incoming as $e) {
            $id = (string) ($e['id'] ?? '');
            $type = (string) ($e['type'] ?? '');
            if (!preg_match('/^[0-9a-f-]{16,36}$/i', $id) || $type === '') {
                continue; // événement malformé : ignoré, jamais fatal
            }
            $insert->execute([
                $id,
                $student['id'],
                substr((string) ($e['deviceId'] ?? $deviceId), 0, 64),
                substr($type, 0, 32),
                (int) ($e['ts'] ?? 0),
                // LA CHARGE EST CHIFFRÉE : c'est là que vivent les réponses de
                // l'élève, ses erreurs et ses hésitations.
                chiffrer(json_encode($e['payload'] ?? [], JSON_UNESCAPED_UNICODE)),
            ]);
            // Accusé de réception même si la ligne existait déjà : dans les deux
            // cas le serveur détient l'événement, le client peut l'oublier.
            $accepted[] = $id;
        }
        $pdo->commit();
    } catch (Throwable $t) {
        $pdo->rollBack();
        fail(500, 'sync_failed', 'Enregistrement impossible.');
    }

    // Renvoi des événements des AUTRES appareils uniquement : inutile de
    // retourner à un appareil ce qu'il vient d'envoyer.
    $stmt = $pdo->prepare(
        'SELECT id, seq, device_id, type, ts, payload FROM events
         WHERE student_id = ? AND seq > ? AND device_id <> ?
         ORDER BY seq ASC LIMIT 1000'
    );
    $stmt->execute([$student['id'], $cursor, $deviceId]);

    $events = [];
    $maxSeq = $cursor;
    foreach ($stmt->fetchAll() as $row) {
        $maxSeq = max($maxSeq, (int) $row['seq']);
        $events[] = [
            'id' => $row['id'],
            'type' => $row['type'],
            'ts' => (int) $row['ts'],
            'deviceId' => $row['device_id'],
            'payload' => json_decode((string) dechiffrer($row['payload']), true) ?: [],
        ];
    }

    respond([
        'accepted' => $accepted,
        'events' => $events,
        'cursor' => $maxSeq,
        'assignments' => assignmentsFor($student),
        // CE QUE LE PROFESSEUR A DEMANDÉ D'OUBLIER.
        //
        // Rémy : « je réinitialise la séance depuis mon poste comme s'il ne
        // l'avait jamais commencée ». Effacer au serveur ne suffit pas :
        // l'appareil garde SON journal, et c'est lui qui dessine l'écran.
        //
        // ON LES ENVOIE TOUTES, À CHAQUE FOIS, et c'est voulu : une remise à
        // zéro doit atteindre un élève qui n'ouvre son poste que trois jours
        // plus tard, et un appareil qui aurait manqué le message. Oublier ce
        // qu'on a déjà oublié ne coûte rien — c'est l'intérêt d'un ordre
        // idempotent. Quelques lignes par élève et par an.
        'oublis' => oublisDeLEleve($student['id']),
        // L'ÉTAT DE SÉANCE VOYAGE AVEC LA SYNCHRO, et non dans une requête à
        // part. Le client synchronise déjà toutes les cinq minutes et à chaque
        // rafale de réponses : lui faire demander le verrou séparément
        // doublerait le trafic d'une classe entière pour la même information.
        'session' => etatDeSeance($student),
        'serverTs' => (int) (microtime(true) * 1000),
    ]);
}

/**
 * L'état de séance seul.
 *
 * La synchro le porte déjà, mais elle est débrayée pendant huit secondes après
 * chaque réponse et ne part pas si le journal est vide. Quand le professeur
 * verrouille sa classe au milieu de l'heure, il veut que ça se voie tout de
 * suite : le client interroge donc cette route-ci, qui ne touche à rien.
 */
function handleSession(): void
{
    $student = requireStudent();
    rateLimit('session_' . $student['id'], 120);
    // ET IL DIT CE QU'IL A SOUS LES YEUX, EN PASSANT.
    //
    // Rémy : « on ne peut jamais vraiment voir l'écran de l'élève, juste son
    // exercice, car c'est créé de façon aléatoire. » Le relevé porte la graine,
    // qui rend la question reproductible — et il voyage ICI, dans une requête
    // qui partait le corps vide toutes les dix secondes. Aucune requête de plus
    // pour une classe entière ; voir `js/core/ecran.js` pour ce qui a été refusé
    // (un événement de journal par question, qui aurait mangé l'historique).
    //
    // ON N'ÉCRIT QUE SI LE CLIENT A PARLÉ. `array_key_exists`, et non `??` :
    // une version ancienne de l'application n'envoie pas de champ `ecran` du
    // tout, et effacer le relevé à chaque battement de la sienne reviendrait à
    // ne jamais rien montrer d'un élève qui n'a pas encore rechargé sa page.
    $corps = jsonBody();
    if (array_key_exists('ecran', $corps)) {
        noterLEcran((string) $student['id'], $corps['ecran']);
    }
    respond(['session' => etatDeSeance($student)]);
}

/**
 * « ÇA NE MARCHE PAS. » — l'élève signale un problème.
 *
 * Rémy : « un bouton désactivable ou non qui permet à l'élève d'envoyer un bug
 * et de prendre une photo d'écran ».
 *
 * LE RÉGLAGE EST VÉRIFIÉ ICI AUSSI, et pas seulement dans le bouton. Cacher le
 * bouton empêche l'élève d'appuyer ; cela n'empêche personne d'appeler la route
 * à la main. Un réglage qui ne vit que dans l'interface n'est pas un réglage,
 * c'est une décoration.
 *
 * SIX PAR MINUTE ET PAR ÉLÈVE — le compteur du dépôt ne sait compter qu'à la
 * minute, et c'est très bien ici : écrire un signalement prend plus de temps que
 * ça. Le chiffre a été mesuré plutôt que choisi. À TROIS, le harnais d'essai
 * tombait — il en envoie quatre d'affilée pour éprouver les bornes —, et un
 * essai qui tombe sur le quota dit exactement ce qu'un élève vivrait : deux
 * tentatives ratées (une photo trop lourde, un champ vide) et le troisième
 * message, le bon, refusé. Six laisse la place aux essais maladroits et ferme
 * quand même la porte à un appui resté enfoncé.
 */
function handleSignalement(): void
{
    $student = requireStudent();
    if (lireReglage('site.signalement', '0') !== '1') {
        fail(403, 'signalement_ferme',
            'Votre professeur n\'a pas ouvert le signalement de problèmes.');
    }
    rateLimit('signal_' . $student['id'], 6);
    $body = jsonBody();

    $corps = trim((string) ($body['corps'] ?? ''));
    if ($corps === '') fail(400, 'vide', 'Dis en un mot ce qui ne va pas.');
    // ON COUPE PLUTÔT QUE DE REFUSER. Un élève qui a écrit trop long a quand
    // même quelque chose à dire, et lui rendre son texte avec « c'est trop
    // long » au moment où il signale une panne, c'est une deuxième panne.
    $corps = mb_substr($corps, 0, SIGNAL_CORPS_MAX);

    // LE CONTEXTE VIENT DU CLIENT, DONC ON NE LE CROIT PAS SUR PAROLE. On le
    // range tel quel après l'avoir borné : c'est du JSON qu'on ne relira que
    // pour l'afficher, jamais pour décider de quoi que ce soit.
    $contexte = null;
    if (isset($body['contexte']) && is_array($body['contexte'])) {
        $json = json_encode($body['contexte'], JSON_UNESCAPED_UNICODE);
        if (is_string($json) && strlen($json) <= SIGNAL_CONTEXTE_MAX) $contexte = $json;
    }

    // LA PHOTO EST FACULTATIVE ET BORNÉE. Le client la rétrécit déjà (voir
    // `js/core/signalement.js`) ; cette borne-ci est celle qui compte, parce
    // qu'elle est la seule que l'élève ne peut pas contourner. Une photo trop
    // lourde est ÉCARTÉE, pas refusée : le texte et le contexte — qui valent
    // plus qu'elle — arrivent quand même.
    $image = null;
    $brut = (string) ($body['image'] ?? '');
    if ($brut !== '' && strlen($brut) <= SIGNAL_IMAGE_MAX
        && preg_match('#^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$#', $brut)) {
        $image = $brut;
    }

    db()->prepare(
        'INSERT INTO signalements (id, student_id, class_id, corps, contexte, image) '
        . 'VALUES (?, ?, ?, ?, ?, ?)'
    )->execute([uuidv4(), $student['id'], $student['class_id'],
        chiffrer($corps), chiffrer($contexte), chiffrer($image)]);

    respond(['ok' => true, 'photo' => $image !== null]);
}

/** « J'ai lu le mot. » */
function handleMessagesRead(): void
{
    $student = requireStudent();
    $body = jsonBody();
    $ids = is_array($body['ids'] ?? null) ? $body['ids'] : [];
    respond(['read' => marquerLus($student, $ids)]);
}

function assignmentsFor(array $student): array
{
    $stmt = db()->prepare(
        'SELECT a.id, a.due_at, a.path_identity, p.id AS path_id, p.name, p.data
         FROM assignments a JOIN paths p ON p.id = a.path_id
         WHERE a.class_id = ? OR a.student_id = ?
         ORDER BY a.created_at DESC LIMIT 20'
    );
    $stmt->execute([$student['class_id'], $student['id']]);
    return array_map(fn($r) => [
        'assignmentId' => $r['id'],
        'pathId' => $r['path_id'],
        // L'IDENTITÉ FIGÉE AU MOMENT OÙ LA SÉANCE A ÉTÉ DONNÉE — voir la
        // colonne `path_identity` dans api/lib/schema.php. Sans elle, deux
        // élèves de la même classe rangeaient leur travail sous deux noms dès
        // que le professeur complétait sa séance, et le bilan en perdait un.
        'pathIdentity' => $r['path_identity'] ?? null,
        'name' => $r['name'],
        'dueAt' => $r['due_at'],
        'path' => json_decode($r['data'], true),
    ], $stmt->fetchAll());
}

// ----------------------------------------------------------- Professeur ----

function handleTeacherLogin(): void
{
    $body = jsonBody();
    $email = trim((string) ($body['email'] ?? ''));
    $password = (string) ($body['password'] ?? '');
    rateLimit('login_' . ($_SERVER['REMOTE_ADDR'] ?? 'x'), 10);

    // L'ADRESSE SE COMPARE SANS TENIR COMPTE DES MAJUSCULES.
    //
    // Rémy, enfermé dehors : « mon mail et code ne fonctionnent pas ». Une
    // adresse électronique ne distingue pas la casse — personne au monde ne
    // considère « Prof@College.fr » et « prof@college.fr » comme deux boîtes
    // différentes. Mais `WHERE email = ?` le faisait, et le message de refus
    // est le même dans les deux cas, exprès : impossible de comprendre qu'on
    // s'est simplement trompé de majuscule.
    //
    // `LOWER()` des deux côtés : la comparaison suit enfin ce que tout le
    // monde croit qu'elle fait.
    $stmt = db()->prepare('SELECT * FROM teachers WHERE LOWER(email) = LOWER(?) LIMIT 1');
    $stmt->execute([$email]);
    $teacher = $stmt->fetch();

    // Message identique dans les deux cas : ne pas révéler quels e-mails existent.
    if (!$teacher || !password_verify($password, $teacher['password_hash'])) {
        fail(401, 'bad_credentials', 'Identifiants incorrects.');
    }

    respond([
        'teacherId' => $teacher['id'],
        'displayName' => $teacher['display_name'],
        'token' => $teacher['id'] . '.' . signTeacher($teacher['id']),
    ]);
}

function handleTeacherClasses(): void
{
    $teacher = requireTeacher();
    $body = jsonBody();

    // UNE ACTION INCONNUE N'EST PAS UNE LISTE. Mesuré : `{action:"delete"}`
    // rendait 200 avec la liste des classes, et la classe existait toujours —
    // un écran qui croirait supprimer afficherait « supprimé » sans que rien ne
    // le soit. On refuse ce qu'on ne sait pas faire, et l'on dit où aller.
    $action = (string) ($body['action'] ?? 'list');
    if (!in_array($action, ['list', 'create'], true)) {
        fail(400, 'bad_action', 'Action inconnue : ' . $action
            . '. Renommer, mettre en pause, vider ou supprimer une classe se '
            . 'fait sur /teacher/class.');
    }

    $creee = null;
    if ($action === 'create') {
        $name = trim((string) ($body['name'] ?? 'Nouvelle classe'));
        $id = uuidv4();
        // Boucle courte : collision de code improbable mais pas impossible.
        for ($i = 0; $i < 5; $i++) {
            try {
                db()->prepare('INSERT INTO classes (id, teacher_id, name, join_code, level) VALUES (?, ?, ?, ?, ?)')
                    ->execute([$id, $teacher['id'], $name, joinCode(), $body['level'] ?? null]);
                break;
            } catch (PDOException $e) {
                if ($i === 4) fail(500, 'code_collision', 'Impossible de générer un code de classe.');
            }
        }
        // ON REND LA CLASSE QU'ON VIENT DE CRÉER, EXPRESSÉMENT.
        //
        // L'appelant la cherchait en tête de la liste, triée par date de
        // création décroissante. Mesuré : deux classes créées dans la même
        // seconde se départagent au hasard, et l'écran ouvre la mauvaise —
        // c'est ainsi qu'un essai a collé trente élèves dans la classe d'à
        // côté. Une seconde de précision ne suffit pas à identifier quelque
        // chose ; un identifiant, si.
        $q = db()->prepare('SELECT * FROM classes WHERE id = ?');
        $q->execute([$id]);
        $creee = $q->fetch() ?: null;
        if ($creee) $creee['student_count'] = 0;
    }

    $stmt = db()->prepare(
        'SELECT c.*, (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) AS student_count
         FROM classes c WHERE c.teacher_id = ? ORDER BY c.created_at DESC'
    );
    $stmt->execute([$teacher['id']]);
    respond(['classes' => $stmt->fetchAll(), 'creee' => $creee]);
}

function handleTeacherPaths(): void
{
    $teacher = requireTeacher();
    $body = jsonBody();

    $action = (string) ($body['action'] ?? 'list');

    if ($action === 'save') {
        $path = $body['path'] ?? null;
        if (!is_array($path) || empty($path['name'])) {
            fail(400, 'bad_path', 'Parcours invalide.');
        }
        $id = (string) ($path['id'] ?? uuidv4());

        // UN IDENTIFIANT DE PARCOURS N'EST PAS UN DROIT D'ÉCRITURE DESSUS.
        //
        // Mesuré (tools/testApi.php, « B n'écrase pas le parcours de A ») : le
        // professeur B envoyait `save` avec l'identifiant d'un parcours de A,
        // et l'`ON CONFLICT(id) DO UPDATE` réécrivait le nom et le contenu —
        // la colonne `teacher_id`, elle, ne bougeait pas, si bien que A gardait
        // la propriété d'un parcours dont B avait remplacé les étapes. Rien ne
        // le lui aurait dit : ses élèves auraient simplement reçu autre chose.
        //
        // Le conflit ne portait que sur l'identifiant, jamais sur le
        // propriétaire. On regarde donc AVANT d'écrire : un parcours qui existe
        // et qui n'est pas à nous n'est pas un conflit à résoudre, c'est une
        // porte fermée.
        $dejaLa = db()->prepare('SELECT teacher_id FROM paths WHERE id = ?');
        $dejaLa->execute([$id]);
        $proprietaire = $dejaLa->fetchColumn();
        if ($proprietaire !== false && $proprietaire !== $teacher['id']) {
            fail(403, 'path_not_yours', "Ce parcours appartient à un autre professeur.");
        }

        // LE DOSSIER VOYAGE À CÔTÉ DU PARCOURS, et non dedans : `data` est le
        // parcours lui-même, celui que l'élève reçoit, et le rangement de la
        // bibliothèque n'a rien à y faire. Une colonne pour une donnée de
        // rangement, c'est aussi ce qui permet de la lire sans décoder le JSON.
        $dossier = trim((string) ($body['folderId'] ?? $path['folderId'] ?? ''));
        if ($dossier === '' || $dossier === 'root') $dossier = null;
        if ($dossier !== null && mb_strlen($dossier) > 64) $dossier = null;

        db()->prepare(
            'INSERT INTO paths (id, teacher_id, name, data, folder_id) VALUES (?, ?, ?, ?, ?) '
            . sqlSurConflit('id', ['name', 'data', 'folder_id'])
        )->execute([$id, $teacher['id'], $path['name'],
            json_encode($path, JSON_UNESCAPED_UNICODE), $dossier]);
        respond(['pathId' => $id]);
    }

    // ─── LA LISTE DES DOSSIERS ────────────────────────────────────────────
    //
    // ELLE N'A PAS DE TABLE À ELLE, et c'est un choix mesuré : un dossier
    // porte un nom, un rang et un pli — rien qu'on interroge, rien qu'on
    // joigne. Une table de plus aurait demandé une route de plus, une
    // migration de plus et une résolution de conflit de plus pour trois
    // champs qui voyagent toujours ensemble. Le réglage est rangé SOUS
    // L'IDENTIFIANT DU PROFESSEUR : un second professeur sur ce serveur
    // n'héritera pas des dossiers du premier.
    if ($action === 'dossiers') {
        $liste = [];
        foreach ((array) ($body['dossiers'] ?? []) as $d) {
            if (!is_array($d) || empty($d['id']) || !isset($d['name'])) continue;
            $liste[] = [
                'id' => mb_substr((string) $d['id'], 0, 64),
                'name' => mb_substr((string) $d['name'], 0, 120),
                'timestamp' => (int) ($d['timestamp'] ?? 0),
                'replie' => !empty($d['replie']),
            ];
            // ON BORNE, comme partout : une liste sans fin arrivant d'un
            // navigateur n'est pas une liste, c'est une surface d'attaque.
            if (count($liste) >= 200) break;
        }
        ecrireReglage('prof.' . $teacher['id'] . '.dossiers',
            json_encode($liste, JSON_UNESCAPED_UNICODE));
        respond(['ok' => true, 'combien' => count($liste)]);
    }

    // ─── LA CORBEILLE ─────────────────────────────────────────────────────
    //
    // Rémy : « supprimer en bloc, mettre dans la corbeille ».
    //
    // CE QUI MANQUAIT N'ÉTAIT PAS L'ÉCRAN, C'ÉTAIT CETTE ROUTE. Mesuré avant
    // (`tools/parcoursSupprime.mjs`) : on supprimait un parcours, on rechargeait
    // la page, IL REVENAIT. Le navigateur effaçait sa copie locale, le serveur
    // gardait la sienne, et `ramenerLaBibliotheque()` la redescendait au
    // démarrage suivant. Le bouton « Supprimer définitivement » ne supprimait
    // rien au-delà d'un rechargement, et personne ne pouvait le voir sans
    // essayer exactement cela.
    //
    // ON NE SUPPRIME JAMAIS DIRECTEMENT, et ce n'est pas de la prudence de
    // principe : `assignments.path_id` est en ON DELETE CASCADE. Un vrai
    // `DELETE` emporterait la trace des séances données avec ce parcours.
    // Rémy : « on prévient, et on garde le bilan ».
    //
    // LES TROIS GESTES PRENNENT UNE LISTE, parce que le geste qu'il demande est
    // « en bloc » : trente parcours à jeter, c'est UNE requête, pas trente.
    if (in_array($action, ['corbeille', 'restaurer'], true)) {
        $ids = [];
        foreach ((array) ($body['ids'] ?? []) as $x) {
            $x = trim((string) $x);
            if ($x !== '' && mb_strlen($x) <= 64) $ids[] = $x;
        }
        $ids = array_values(array_unique($ids));
        if (!$ids) fail(400, 'no_ids', 'Aucun parcours désigné.');
        // ON BORNE, comme partout ailleurs : une liste sans fin arrivant d'un
        // navigateur n'est pas une liste, c'est une surface d'attaque.
        $ids = array_slice($ids, 0, 200);
        $trous = implode(',', array_fill(0, count($ids), '?'));
        // `AND teacher_id = ?` EST LA SEULE CHOSE QUI COMPTE ICI : sans elle,
        // un identifiant deviné jetterait le parcours d'un collègue.
        $q = db()->prepare(
            'UPDATE paths SET supprime_le = ' . ($action === 'corbeille' ? sqlMaintenant() : 'NULL')
            . " WHERE teacher_id = ? AND id IN ($trous)"
        );
        $q->execute(array_merge([$teacher['id']], $ids));
        respond(['ok' => true, 'combien' => $q->rowCount()]);
    }

    // VIDER LA CORBEILLE — le seul endroit du logiciel qui efface un parcours
    // pour de bon, et il faut l'avoir demandé deux fois : mettre à la
    // corbeille, puis vider.
    if ($action === 'vider') {
        $q = db()->prepare('DELETE FROM paths WHERE teacher_id = ? AND supprime_le IS NOT NULL');
        $q->execute([$teacher['id']]);
        respond(['ok' => true, 'combien' => $q->rowCount()]);
    }

    // ON NE REND QUE LES VIVANTS, et la corbeille À PART.
    //
    // Les deux listes partent ensemble, et c'est voulu : le navigateur a besoin
    // des deux au même instant. Sans la seconde, une machine qui détient encore
    // un parcours jeté depuis un AUTRE poste n'aurait aucun moyen de l'
    // apprendre — elle le garderait, et le remonterait.
    // `donne` : COMBIEN DE FOIS CE PARCOURS A DÉJÀ ÉTÉ DONNÉ.
    //
    // Rémy : « on prévient, et on garde le bilan ». Prévenir demande de savoir,
    // et l'écran ne savait que pour le parcours OUVERT — c'est-à-dire presque
    // jamais au moment de gérer. On demandait sinon une requête par parcours,
    // soit trente allers-retours pour une fenêtre qui s'ouvre : la liste les
    // porte donc toutes, en une jointure comptée.
    $stmt = db()->prepare('SELECT p.id, p.name, p.data, p.updated_at, p.folder_id,
                               (SELECT COUNT(*) FROM assignments a WHERE a.path_id = p.id) AS donne
                            FROM paths p
                            WHERE p.teacher_id = ? AND p.supprime_le IS NULL
                            ORDER BY p.updated_at DESC');
    $stmt->execute([$teacher['id']]);
    // `array_merge` ET SURTOUT PAS `+`, ET C'EST TOUTE L'HISTOIRE DE CE BOGUE.
    //
    // Rémy : « le parcours que j'ai créé au collège sur mon compte, je ne l'ai
    // pas sur mon mac chez moi !!!! »
    //
    // On écrivait `$r + ['data' => json_decode(...)]`. L'opérateur `+` sur deux
    // tableaux PHP NE REMPLACE PAS une clef que la gauche porte déjà : la ligne
    // sortie de la base a une colonne `data`, donc le tableau décodé était
    // calculé puis JETÉ, et la route rendait la chaîne JSON BRUTE sous le même
    // nom. Rien ne protestait : le champ existait, il avait le bon nom, et il
    // contenait bien le parcours — en texte.
    //
    // CE QUE ÇA CASSAIT, EN SILENCE, DEPUIS LE DÉBUT : côté navigateur,
    // `ramenerLaBibliotheque()` fait `const p = ligne.data; if (!p || !p.id)
    // continue;`. Sur une chaîne, `p.id` est `undefined` — donc TOUTES les
    // lignes étaient sautées, et la bibliothèque du serveur ne redescendait
    // JAMAIS. MESURÉ (tools/deuxPostes.mjs) : « 0 ramené(s) » sur un poste
    // neuf dont le serveur portait pourtant trois parcours.
    // ET LA CORBEILLE, avec la date : l'écran doit pouvoir dire « il reste
    // 23 jours », sans quoi « 30 jours » n'est qu'une promesse.
    $c = db()->prepare('SELECT id, name, supprime_le FROM paths
                         WHERE teacher_id = ? AND supprime_le IS NOT NULL
                         ORDER BY supprime_le DESC');
    $c->execute([$teacher['id']]);
    respond([
        'paths' => array_map(
            fn ($r) => array_merge($r, ['data' => json_decode($r['data'], true)]),
            $stmt->fetchAll()
        ),
        'corbeille' => $c->fetchAll(),
        // LES DOSSIERS DESCENDENT AVEC LA BIBLIOTHÈQUE, parce qu'ils ne
        // servent qu'à la ranger : deux appels pour deux moitiés du même
        // écran, c'est une moitié qui arrive sans l'autre un jour sur dix.
        'dossiers' => json_decode(
            lireReglage('prof.' . $teacher['id'] . '.dossiers', '[]') ?? '[]', true
        ) ?: [],
        // COMBIEN DE JOURS ELLE GARDE, dit par le serveur et non recopié dans
        // l'écran : deux nombres à tenir d'accord finissent toujours par
        // diverger, et c'est celui qui EFFACE qui a raison.
        'joursCorbeille' => JOURS_CORBEILLE
    ]);
}

function handleTeacherAssign(): void
{
    $teacher = requireTeacher();
    $body = jsonBody();
    $pathId = (string) ($body['pathId'] ?? '');
    $classId = $body['classId'] ?? null;

    // LIRE LES SÉANCES D'UNE CLASSE — ce qu'on ne pouvait pas faire.
    //
    // Rémy : « quand je clique sur une classe, il faut pouvoir voir la liste
    // des séances attitrées, je trouve que c'est un peu confus ». Il avait
    // raison, et la raison était simple : on savait DONNER un parcours à une
    // classe, on ne savait pas dire lesquels elle avait reçus. L'information
    // était en base depuis le début, sans porte pour la lire.
    //
    // ON REND AUSSI CE QUE LES ÉLÈVES EN ONT FAIT — combien l'ont ouvert, et
    // combien l'ont terminé. Une liste de séances sans cela est un carnet de
    // textes ; avec, c'est un tableau de bord.
    // L'AUTRE SENS : À QUI CE PARCOURS A-T-IL ÉTÉ DONNÉ ?
    //
    // Rémy, sur l'explorateur de parcours : « une flèche pour avoir plus
    // d'info », et à la question « le contenu, ou les classes ? » — « les
    // deux ». Le contenu, on l'a sous la main ; les classes, il fallait la
    // route. C'est la même table lue par l'autre bout.
    if (($body['action'] ?? '') === 'list' && $pathId !== '') {
        $q = db()->prepare('SELECT id, name FROM paths WHERE id = ? AND teacher_id = ?');
        $q->execute([$pathId, $teacher['id']]);
        if (!$q->fetch()) fail(404, 'path_not_found', 'Parcours introuvable.');

        $s = db()->prepare(
            'SELECT a.id, a.class_id, a.due_at, a.created_at, c.name,
                    (SELECT COUNT(*) FROM students st WHERE st.class_id = c.id) AS effectif
               FROM assignments a JOIN classes c ON c.id = a.class_id
              WHERE a.path_id = ? AND c.teacher_id = ?
              ORDER BY a.created_at DESC'
        );
        $s->execute([$pathId, $teacher['id']]);
        $lesClasses = array_map(fn ($a) => [
            'id'       => $a['class_id'],
            'nom'      => $a['name'],
            'effectif' => (int) $a['effectif'],
            'donneeLe' => $a['created_at'],
            'pourLe'   => $a['due_at'],
        ], $s->fetchAll());

        // ET LES ÉLÈVES NOMMÉS, dans la même réponse.
        //
        // Rémy : « il faudrait pouvoir, en cliquant sur la classe, ne le donner
        // qu'à certains élèves ». L'écran doit alors savoir QUI l'a déjà — et
        // cette vérité est ici, pas dans le navigateur du professeur. Une
        // seconde requête pour la moitié de la même question ferait deux
        // réponses à tenir d'accord ; la question est une, la réponse aussi.
        $e = db()->prepare(
            'SELECT a.student_id, a.created_at, a.due_at, st.first_name, st.class_id
               FROM assignments a
               JOIN students st ON st.id = a.student_id
               JOIN classes c ON c.id = st.class_id
              WHERE a.path_id = ? AND c.teacher_id = ?
              ORDER BY a.created_at DESC'
        );
        $e->execute([$pathId, $teacher['id']]);
        respond(['classes' => $lesClasses, 'eleves' => array_map(fn ($x) => [
            'id'       => $x['student_id'],
            'nom'      => dechiffrer($x['first_name']),
            'classeId' => $x['class_id'],
            'donneeLe' => $x['created_at'],
            'pourLe'   => $x['due_at'],
        ], $e->fetchAll())]);
    }

    if (($body['action'] ?? '') === 'list') {
        if ($classId === null || $classId === '') fail(400, 'no_class', 'Quelle classe ?');
        $q = db()->prepare('SELECT id FROM classes WHERE id = ? AND teacher_id = ?');
        $q->execute([$classId, $teacher['id']]);
        if (!$q->fetch()) fail(404, 'class_not_found', 'Classe introuvable.');

        // LES SÉANCES DE LA CLASSE, ET CELLES DONNÉES À QUELQUES-UNS DE SES
        // ÉLÈVES. Sans la seconde moitié, un travail donné à trois élèves
        // n'apparaîtrait nulle part chez le professeur — exactement le genre de
        // séance fantôme qu'on vient de passer la journée à supprimer.
        $s = db()->prepare(
            'SELECT a.id, a.path_id, a.due_at, a.created_at, a.student_id,
                    p.name, p.updated_at, p.data, st.first_name
               FROM assignments a
               JOIN paths p ON p.id = a.path_id
          LEFT JOIN students st ON st.id = a.student_id
              WHERE a.class_id = ?
                 OR a.student_id IN (SELECT id FROM students WHERE class_id = ?)
              ORDER BY a.created_at DESC'
        );
        $s->execute([$classId, $classId]);

        $seances = [];
        foreach ($s->fetchAll() as $a) {
            // LE PARCOURS EST RANGÉ ENTIER, ENVELOPPE COMPRISE.
            //
            // `handleTeacherPaths` enregistre l'objet reçu tel quel — donc
            // `{ id, name, data: { steps… } }` — et non le seul parcours. Les
            // étapes sont un niveau plus bas que là où on les cherche
            // naturellement, et les lire au mauvais endroit donnait « 0 étape ·
            // 0 question » sur des parcours qui en ont douze. On lit les deux
            // formes plutôt que de parier sur une : le jour où l'enveloppe
            // disparaît, cette ligne ne cassera pas.
            $brut = json_decode((string) $a['data'], true) ?: [];
            $parcours = is_array($brut['data'] ?? null) ? $brut['data'] : $brut;
            $etapes = is_array($parcours['steps'] ?? null) ? $parcours['steps'] : [];
            $seances[] = [
                'id'       => $a['id'],
                'pathId'   => $a['path_id'],
                'nom'      => $a['name'],
                // À QUI : null pour toute la classe, le prénom sinon. L'écran
                // doit pouvoir dire « à Léa » plutôt que de laisser croire que
                // toute la classe l'a reçu.
                'pour'     => $a['student_id'] ? dechiffrer($a['first_name']) : null,
                'eleveId'  => $a['student_id'] ?: null,
                'donneeLe' => $a['created_at'],
                'pourLe'   => $a['due_at'],
                'etapes'   => count($etapes),
                // CE QU'IL Y A DEDANS, ET PAS SEULEMENT COMBIEN.
                //
                // Rémy : « il faut vraiment que pour la séance ce soit facile
                // d'ajouter et d'enlever un exercice ». Pour en RETIRER un
                // depuis l'écran de la classe, il faut pouvoir les lui
                // proposer — et le compte ne le permet pas. Le serveur ne
                // connaît pas le catalogue, il rend donc les identifiants ;
                // c'est le navigateur qui les nomme.
                //
                // `array_values` ET NON `array_filter` SEUL : un tableau PHP
                // aux clés trouées se sérialise en OBJET JSON, et le
                // navigateur recevrait { "1": "calc-sub" } au lieu d'une
                // liste. Le défaut n'apparaîtrait que sur une séance dont une
                // étape est cassée — donc jamais dans nos essais.
                'exercices' => array_values(array_filter(array_map(
                    fn ($e) => isset($e['exerciseId']) ? (string) $e['exerciseId'] : null,
                    $etapes))),
                'questions' => array_sum(array_map(
                    fn ($e) => (int) ($e['nbItems'] ?? 0), $etapes)),
                'mode'     => $parcours['policy']['mode'] ?? 'entrainement',
            ];
        }
        respond(['seances' => $seances]);
    }

    // RETIRER UNE SÉANCE — ce qu'on ne savait pas faire non plus.
    //
    // On savait donner, on ne savait pas reprendre : décocher une classe dans
    // « À qui ce parcours est donné » effaçait la séance du navigateur du
    // professeur et laissait l'assignation en base. Les élèves auraient
    // continué de recevoir un travail que leur professeur croit avoir repris.
    //
    // ON N'EFFACE QUE L'ASSIGNATION, JAMAIS LE TRAVAIL. Le journal des élèves
    // est ailleurs et n'est pas touché : la séance quitte leur liste, le bilan
    // reste lisible.
    if (($body['action'] ?? '') === 'retirer') {
        if ($pathId === '') fail(400, 'no_path', 'Quel parcours ?');
        $pourQui = (string) ($body['studentId'] ?? '');

        // ON REPREND À QUI L'ON A DONNÉ, et pas plus. Rémy : « pour l'instant on
        // ne peut donner une séance qu'à une classe, ni à un groupe ni à un
        // élève spécifique ». Une fois qu'on peut donner à l'un, il faut
        // pouvoir reprendre à l'un : retirer la séance de la classe entière
        // parce qu'on décoche un élève serait le pire des malentendus.
        if ($pourQui !== '') {
            $q = db()->prepare(
                'SELECT s.id FROM students s JOIN classes c ON c.id = s.class_id
                 WHERE s.id = ? AND c.teacher_id = ?'
            );
            $q->execute([$pourQui, $teacher['id']]);
            if (!$q->fetch()) fail(404, 'student_not_found', 'Élève introuvable.');

            $d = db()->prepare('DELETE FROM assignments WHERE path_id = ? AND student_id = ?');
            $d->execute([$pathId, $pourQui]);
            respond(['ok' => true, 'retirees' => $d->rowCount()]);
        }

        if ($classId === null || $classId === '') fail(400, 'no_class', 'Quelle classe ?');
        $q = db()->prepare('SELECT id FROM classes WHERE id = ? AND teacher_id = ?');
        $q->execute([$classId, $teacher['id']]);
        if (!$q->fetch()) fail(404, 'class_not_found', 'Classe introuvable.');

        // RETIRER À LA CLASSE NE RETIRE PAS AUX ÉLÈVES NOMMÉS. Ce sont deux
        // gestes distincts : « je ne le donne plus à toute la 4C » ne veut pas
        // dire « j'enlève aussi le rattrapage de Léa ». On borne donc au
        // `class_id`, et l'écran montre les deux séparément.
        $d = db()->prepare('DELETE FROM assignments WHERE path_id = ? AND class_id = ?');
        $d->execute([$pathId, $classId]);
        respond(['ok' => true, 'retirees' => $d->rowCount()]);
    }

    $stmt = db()->prepare('SELECT id FROM paths WHERE id = ? AND teacher_id = ?');
    $stmt->execute([$pathId, $teacher['id']]);
    if (!$stmt->fetch()) fail(404, 'path_not_found', 'Parcours introuvable.');

    // ON VÉRIFIAIT LE PARCOURS, PAS CEUX À QUI ON LE DONNE — et c'est le
    // mauvais côté de la barrière.
    //
    // Mesuré : le professeur B envoyait `assign` avec SON parcours et
    // l'identifiant d'une classe de A ; le serveur répondait 200, et les élèves
    // de A recevaient à leur prochaine synchronisation un travail donné par
    // quelqu'un qui n'est pas leur professeur. Rémy demandait « un prof qui
    // gère un établissement, une équipe, on se répartit les classes » : c'est
    // exactement le jour où cette porte compte. Aujourd'hui il est seul sur son
    // serveur, donc personne n'en a souffert — ce n'est pas une raison de la
    // laisser ouverte, c'est la raison de la fermer maintenant, pendant qu'il
    // n'y a rien à réparer derrière.
    //
    // Les deux cibles sont vérifiées, et par la même règle : la classe doit
    // être à nous, l'élève doit être dans une de nos classes.
    $studentId = $body['studentId'] ?? null;
    if ($classId !== null && $classId !== '') {
        $q = db()->prepare('SELECT id FROM classes WHERE id = ? AND teacher_id = ?');
        $q->execute([$classId, $teacher['id']]);
        if (!$q->fetch()) fail(404, 'class_not_found', 'Classe introuvable.');
    }
    if ($studentId !== null && $studentId !== '') {
        $q = db()->prepare(
            'SELECT s.id FROM students s JOIN classes c ON c.id = s.class_id
             WHERE s.id = ? AND c.teacher_id = ?'
        );
        $q->execute([$studentId, $teacher['id']]);
        if (!$q->fetch()) fail(404, 'student_not_found', 'Élève introuvable.');
    }
    // Une assignation qui ne vise NI classe NI élève ne vise personne : elle
    // resterait en base sans jamais être servie. On la refuse plutôt que de
    // laisser croire qu'un travail a été donné.
    if (($classId === null || $classId === '') && ($studentId === null || $studentId === '')) {
        fail(400, 'no_target', 'Il faut désigner une classe ou un élève.');
    }

    // DONNER DEUX FOIS NE DONNE PAS DEUX FOIS.
    //
    // La case à cocher du panneau se décoche et se recoche ; chaque coche
    // insérait une ligne de plus. L'élève recevait alors le même travail en
    // deux exemplaires dans sa liste, et le professeur, en retirant, n'en
    // enlevait qu'un — l'autre restait, invisible et actif.
    //
    // On met donc à jour l'existante plutôt que d'en ajouter une : c'est la
    // même séance, avec peut-être un nouvel horaire.
    //
    // ET L'ON N'ÉCRIT PAS « class_id IS ? ». SQLite accepte `IS` avec un
    // paramètre lié — c'est sa comparaison qui traite NULL comme une valeur
    // ordinaire —, MySQL le refuse : son `IS` ne prend que TRUE, FALSE, NULL
    // ou UNKNOWN. Cette API tourne sur les deux moteurs ; la requête serait
    // passée verte dans tous les essais, qui sont en SQLite, et aurait échoué
    // chez Rémy. On écrit donc les deux cas, où le NULL est écrit en dur.
    if ($classId !== null && $classId !== '') {
        $vue = db()->prepare(
            'SELECT id FROM assignments WHERE path_id = ? AND class_id = ? AND student_id IS NULL');
        $vue->execute([$pathId, $classId]);
    } else {
        $vue = db()->prepare(
            'SELECT id FROM assignments WHERE path_id = ? AND student_id = ? AND class_id IS NULL');
        $vue->execute([$pathId, $studentId]);
    }
    $identite = trim((string) ($body['pathIdentity'] ?? ''));

    $deja = $vue->fetchColumn();
    if ($deja !== false) {
        // ON NE RÉÉCRIT PAS L'IDENTITÉ D'UNE SÉANCE DÉJÀ DONNÉE : c'est tout
        // son intérêt. Redonner le même parcours à la même classe — ce qui
        // arrive à chaque fois que le professeur retouche puis renvoie — ne
        // doit pas débaptiser le travail que les élèves ont déjà fait. On ne
        // la pose que si elle manque, c'est-à-dire pour les séances données
        // avant que cette colonne n'existe.
        db()->prepare('UPDATE assignments SET due_at = ?,
                              path_identity = COALESCE(path_identity, ?) WHERE id = ?')
            ->execute([$body['dueAt'] ?? null, $identite !== '' ? $identite : null, $deja]);
        respond(['ok' => true, 'deja' => true]);
    }

    db()->prepare('INSERT INTO assignments (id, path_id, class_id, student_id, due_at, path_identity)
                   VALUES (?, ?, ?, ?, ?, ?)')
        ->execute([uuidv4(), $pathId, $classId ?: null, $studentId ?: null,
                   $body['dueAt'] ?? null, $identite !== '' ? $identite : null]);

    respond(['ok' => true]);
}

/**
 * Bilan d'une classe : pour chaque élève, sa maîtrise par compétence et la
 * note de ses sessions évaluées — recalculées ici à partir des événements.
 */
function handleTeacherReport(): void
{
    $teacher = requireTeacher();
    $body = jsonBody();
    $classId = (string) ($body['classId'] ?? '');

    $stmt = db()->prepare('SELECT * FROM classes WHERE id = ? AND teacher_id = ?');
    $stmt->execute([$classId, $teacher['id']]);
    $class = $stmt->fetch();
    if (!$class) fail(404, 'class_not_found', 'Classe introuvable.');

    // ── LE PONT ENTRE DEUX NOMS DE LA MÊME SÉANCE ─────────────────────────
    //
    // RÉMY, capture de son onglet « Par séance » à l'appui : « aucun retour
    // sur cette page ». Trente élèves, huit colonnes, PAS UNE CASE REMPLIE.
    //
    // MESURÉ (`tools/bilanParSeance.mjs`) : l'écran cherchait
    // `path_1792150030223_UWJ9` — l'identifiant du parcours du PROFESSEUR,
    // celui d'`assignments.path_id` — et le serveur avait rangé le travail
    // sous `path_cCLAVVV`, l'empreinte du CONTENU que l'élève enregistre en
    // ouvrant une séance IMPOSÉE (`ouvrirLaSeanceImposee`, js/ui/leMoment.js).
    // Les deux ne peuvent pas se rencontrer, et imposer est exactement la
    // façon dont Rémy travaille en classe : le tableau était vide à chaque
    // heure.
    //
    // ON NE TOUCHE À AUCUNE DES DEUX IDENTITÉS, et surtout pas à celle de
    // l'élève : c'est elle qui porte son travail fait (`computeAssignedPath`
    // filtre les étapes terminées dessus), et la changer remettrait la classe
    // à zéro — le défaut d'hier, « ça a remis à zéro tous les élèves ».
    //
    // LE PONT EXISTE DÉJÀ EN BASE : `assignments.path_identity` porte
    // l'empreinte du contenu, figée quand la séance a été donnée, et
    // `lib/eleves.php` s'en sert déjà pour le direct. On lit la table une
    // fois, et l'on range le travail sous le nom que l'écran demande.
    $pont = [];
    $qa = db()->prepare('SELECT path_id, path_identity FROM assignments
                         WHERE class_id = ? AND path_identity IS NOT NULL');
    $qa->execute([$classId]);
    foreach ($qa->fetchAll() as $a) {
        $ident = (string) ($a['path_identity'] ?? '');
        if ($ident !== '') $pont[$ident] = (string) $a['path_id'];
    }

    $stmt = db()->prepare('SELECT id, first_name, last_seen_at FROM students WHERE class_id = ?');
    $stmt->execute([$classId]);
    // Le tri se fait après déchiffrement : `ORDER BY` sur du texte chiffré
    // trierait des vecteurs d'initialisation tirés au hasard.
    $students = trierParPrenom(array_map('eleveLisible', $stmt->fetchAll()));

    $rows = [];
    foreach ($students as $s) {
        $events = eventsOfStudent($s['id']);
        $attempts = attemptsOf($events);
        $mastery = masteryOf($attempts);
        $runs = runsOf($events);

        $graded = [];
        foreach ($runs as $run) {
            if (!$run['finishedAt'] || $run['aborted']) continue;
            $bilan = gradeRun($run);
            if ($bilan['note'] !== null) $graded[] = $bilan;
        }

        $weak = array_slice(array_values(array_filter($mastery, fn($m) => $m['reliable'] && $m['mastery'] < 0.7)), 0, 5);

        // ── ET CE QUI TIENT ───────────────────────────────────────────────
        //
        // RÉMY : « au début du bilan, mettre ce qu'il faut revoir ET CE QUI A
        // ÉTÉ COMPRIS pour la classe ».
        //
        // La route n'envoyait que les notions fragiles, depuis toujours :
        // l'écran ne POUVAIT donc dire que la moitié sombre, même en le
        // voulant. Les solides sont déjà calculées — c'est la même carte de
        // maîtrise, lue par l'autre bout —, et `masteryOf` la rend triée par
        // maîtrise CROISSANTE : les plus solides sont à la fin, d'où le
        // `array_reverse`.
        //
        // MÊME SEUIL ET MÊME PLAFOND QUE LE CLIENT (`mastery.strongSkills`,
        // `LEVELS.A.min` = 0,7, cinq notions) : les deux moitiés de
        // l'application doivent dire le même mot sur le même élève.
        $strong = array_slice(array_reverse(array_values(array_filter(
            $mastery, fn($m) => $m['reliable'] && $m['mastery'] >= 0.7))), 0, 5);

        // ── LE DÉTAIL PAR EXERCICE, QUI NE DEMANDE AUCUNE DONNÉE NOUVELLE ─
        //
        // RÉMY : « permettre aussi d'avoir le détail avec un tableau des
        // exercices (double entrée donc) et leur détail de réussite par
        // exercice », puis, le lendemain : « pour le 4 colonne séance
        // choisie ».
        //
        // TOUT ÉTAIT DÉJÀ EN BASE. Chaque tentative porte son `exerciseId` —
        // `runner.js` et `itemSession.js` le posent — et son `runId` ; le run
        // porte le parcours. On croise les deux ICI, dans la boucle qui relit
        // déjà tous les événements de cet élève : le tableau à double entrée
        // ne coûte donc pas une requête de plus, et il n'a RIEN demandé de
        // nouveau aux élèves.
        //
        // ON COMPTE LES QUESTIONS, PAS LES TENTATIVES. Un élève qui se trompe
        // puis se reprend produit deux tentatives et une réussite : « 50 % »
        // dirait qu'il a raté la moitié des questions, alors qu'il les a
        // toutes trouvées. On compte donc comme « Sans faute » compte : une
        // question POSÉE (`attemptIndex` à zéro), juste du PREMIER COUP, ou
        // RATTRAPÉE après une erreur. Les trois nombres partent, et c'est
        // l'écran qui décide de la phrase.
        //
        // CLASSÉ PAR PARCOURS, parce que le même exercice revient dans
        // plusieurs séances : mélanger celle de lundi avec celle de novembre
        // ferait un tableau que personne ne peut lire. Les tentatives d'un run
        // SANS parcours — un entraînement libre, un jeu — n'entrent dans
        // aucune colonne, et c'est juste : elles n'appartiennent à aucune
        // séance.
        //
        // ET LA CLÉ EST CELLE DE LA SÉANCE, PAS CELLE DU RUN. Voir `$pont`
        // plus haut : une séance imposée arrive sous l'empreinte de son
        // contenu, une séance donnée sous l'identifiant du parcours. Les deux
        // désignent le même travail, et l'écran n'en connaît qu'un. On
        // traduit ici, une fois, plutôt que dans chaque écran qui lira ce
        // tableau — un même travail rangé sous deux noms finit toujours par en
        // perdre un.
        $parSeance = [];
        foreach ($runs as $run) {
            $pid = (string) ($run['pathId'] ?? '');
            if ($pid === '') continue;
            $pid = $pont[$pid] ?? $pid;
            foreach ($run['attempts'] as $a) {
                $ex = (string) ($a['exerciseId'] ?? '');
                if ($ex === '') continue;
                if (!isset($parSeance[$pid][$ex])) {
                    $parSeance[$pid][$ex] = ['posees' => 0, 'justes' => 0, 'reprises' => 0];
                }
                // `attemptIndex` ABSENT VAUT ZÉRO, comme dans `masteryOf` :
                // une activité qui ne numérote pas ses essais compte alors
                // chaque tentative comme une question, ce qui est son ancien
                // comportement et non une régression.
                $premier = (int) ($a['attemptIndex'] ?? 0) === 0;
                $juste = !empty($a['correct']);
                if ($premier) $parSeance[$pid][$ex]['posees']++;
                if ($juste && $premier) $parSeance[$pid][$ex]['justes']++;
                elseif ($juste) $parSeance[$pid][$ex]['reprises']++;
            }
        }

        // LES ERREURS JAMAIS REPRISES, ET LES NOTIONS QU'ELLES DÉSIGNENT.
        //
        // RÉMY, devant la colonne des conseils : « il faut plutôt préciser en
        // quoi ça doit être retravaillé ». Sa classe affichait « 67 erreurs
        // jamais reprises » sur sept élèves d'affilée : un nombre qui ne dit
        // pas QUOI reprendre, et c'est la seule chose qu'on demande là.
        //
        // TROIS NOTIONS AU PLUS, la plus fournie d'abord : au-delà ce n'est
        // plus un conseil mais un inventaire, et l'on ne reprend pas six
        // notions avec un élève.
        $ouvertes = openErrorsOf($events);
        $parNotion = [];
        foreach ($ouvertes as $err) {
            $sk = (string) ($err['skillId'] ?? '');
            if ($sk === '') continue;
            $parNotion[$sk] = ($parNotion[$sk] ?? 0) + (int) ($err['count'] ?? 1);
        }
        arsort($parNotion);
        $notionsOuvertes = [];
        foreach (array_slice($parNotion, 0, 3, true) as $sk => $n) {
            $notionsOuvertes[] = ['skillId' => $sk, 'count' => $n];
        }

        $rows[] = [
            'studentId' => $s['id'],
            'firstName' => $s['first_name'],
            // En secondes, comme partout ailleurs dans l'API : voir `instantDe`.
            'lastSeenAt' => instantDe($s['last_seen_at']),
            'totalQuestions' => count($attempts),
            'successRate' => count($attempts)
                ? round(count(array_filter($attempts, fn($a) => !empty($a['correct']))) / count($attempts), 3)
                : null,
            'timeSeconds' => timeOf($events),
            'openErrors' => count($ouvertes),
            // LES NOTIONS DE CES ERREURS, ET NON LEUR SEUL NOMBRE.
            //
            // RÉMY, devant la colonne des conseils : « il faut plutôt préciser
            // en quoi ça doit être retravaillé ». Sa classe affichait « 67
            // erreurs jamais reprises : les revoir avec lui ou elle » sur sept
            // élèves d'affilée — un nombre qui ne dit pas QUOI reprendre, et
            // c'est la seule chose qu'on demande à cette phrase.
            //
            // TROIS AU PLUS, triées par nombre d'erreurs : au-delà, ce n'est
            // plus un conseil mais un inventaire, et l'on ne reprend pas six
            // notions avec un élève.
            'openSkills' => $notionsOuvertes,
            'weakSkills' => array_map(fn($m) => ['skillId' => $m['skillId'], 'mastery' => $m['mastery'], 'level' => $m['level']], $weak),
            'strongSkills' => array_map(fn($m) => ['skillId' => $m['skillId'], 'mastery' => $m['mastery'], 'level' => $m['level']], $strong),
            // UN TABLEAU PHP VIDE SE SÉRIALISE EN `[]`, ET NON EN `{}`. Le
            // navigateur reçoit donc une liste là où il attend une table pour
            // l'élève qui n'a rien fait. Ce n'est pas un défaut ici — `[]['x']`
            // vaut `undefined` comme `{}['x']` —, mais ça se dit, parce que
            // c'est la deuxième fois que cette règle de PHP coûte une heure
            // dans ce fichier (voir `exercices` dans `handleTeacherPaths`).
            'parSeance' => $parSeance,
            'lastNote' => $graded ? ['note' => $graded[0]['note'], 'sur' => $graded[0]['sur'], 'pathName' => $graded[0]['pathName']] : null,
            'notes' => array_map(fn($b) => [
                'runId' => $b['runId'], 'pathName' => $b['pathName'],
                'note' => $b['note'], 'sur' => $b['sur'], 'ratio' => $b['ratio'],
            ], array_slice($graded, 0, 10)),
        ];
    }

    // Compétences les plus fragiles à l'échelle de la classe : c'est
    // l'information qui décide de la prochaine séance collective.
    $classSkills = [];
    foreach ($rows as $r) {
        foreach ($r['weakSkills'] as $w) {
            $classSkills[$w['skillId']] = ($classSkills[$w['skillId']] ?? 0) + 1;
        }
    }
    arsort($classSkills);

    respond([
        'class' => ['id' => $class['id'], 'name' => $class['name'], 'joinCode' => $class['join_code']],
        'students' => $rows,
        'classWeakSkills' => array_slice(
            array_map(fn($k, $v) => ['skillId' => $k, 'studentCount' => $v], array_keys($classSkills), $classSkills),
            0, 8
        ),
    ]);
}

function handleTeacherStudent(): void
{
    $teacher = requireTeacher();
    $body = jsonBody();
    $studentId = (string) ($body['studentId'] ?? '');

    $stmt = db()->prepare(
        'SELECT s.* FROM students s JOIN classes c ON c.id = s.class_id
         WHERE s.id = ? AND c.teacher_id = ? LIMIT 1'
    );
    $stmt->execute([$studentId, $teacher['id']]);
    // `fetch()` rend `false`, jamais `null`, quand il n'y a pas de ligne — et
    // `eleveLisible(?array)` en mode strict refuse `false` : la requête d'un
    // professeur sur un élève qui n'est pas le sien rendait 500, c'est-à-dire
    // « le serveur est cassé », là où il fallait lire « cet élève n'existe pas
    // pour vous ». Mesuré : code 500 sur l'élève d'un autre professeur.
    $ligne = $stmt->fetch() ?: null;
    if (!$ligne) fail(404, 'student_not_found', 'Élève introuvable.');
    $student = eleveLisible($ligne);

    $events = eventsOfStudent($studentId);
    $runs = runsOf($events);

    // ─── REMETTRE CET ÉLÈVE À ZÉRO SUR UNE SÉANCE ─────────────────────────
    //
    // RÉMY : « j'ai créé un élève virtuel dans la classe puis je réinitialise
    // la séance depuis mon poste comme s'il ne l'avait jamais commencée ».
    //
    // DEUX MOITIÉS, ET AUCUNE NE SUFFIT SEULE.
    //
    //   · LE SERVEUR OUBLIE : on efface les événements de cet élève qui
    //     appartiennent à ce parcours. Sans cela le bilan garderait son
    //     travail, et `/sync` le renverrait au premier appareil neuf.
    //   · ON LE DIT À SON APPAREIL : son journal local est ce qui dessine son
    //     écran, et comme ses événements sont DÉJÀ synchronisés il ne les
    //     repousse pas — mais il ne les oublie pas non plus. La ligne dans
    //     `reinitialisations` est le message, et `/sync` la lui rend.
    //
    // ON NE PEUT PAS FILTRER EN SQL, ET C'EST LA CONTRAINTE QUI DESSINE TOUT :
    // `events.payload` est CHIFFRÉ en base. Le parcours d'un événement ne se
    // lit qu'après déchiffrement. On relit donc les événements de cet élève —
    // ce que la route fait déjà pour son bilan — et l'on efface par
    // identifiant.
    if (($body['action'] ?? '') === 'reinitialiser') {
        $pathId = trim((string) ($body['pathId'] ?? ''));
        if ($pathId === '') fail(400, 'no_path', 'Quelle séance ?');

        // LES RUNS DE CE PARCOURS. Un `step_completed` ne porte pas toujours le
        // parcours ; il porte toujours son run, et le run porte le parcours.
        $siens = [];
        foreach ($runs as $r) {
            if (($r['pathId'] ?? null) === $pathId) $siens[$r['runId']] = true;
        }

        $aEffacer = [];
        foreach ($events as $e) {
            $p = $e['payload'] ?? [];
            $parRun = isset($p['runId']) && isset($siens[$p['runId']]);
            $parChemin = ($p['pathId'] ?? null) === $pathId;
            if ($parRun || $parChemin) $aEffacer[] = $e['id'];
        }

        $efface = 0;
        if ($aEffacer) {
            // PAR PAQUETS DE CENT : une liste de mille marqueurs dans un
            // `IN (...)` dépasse les limites de certains serveurs, et une
            // séance de trente exercices écrit vite des centaines
            // d'événements.
            foreach (array_chunk($aEffacer, 100) as $paquet) {
                $trous = implode(',', array_fill(0, count($paquet), '?'));
                // `AND student_id = ?` EST LA SEULE CHOSE QUI COMPTE ICI :
                // les identifiants viennent du navigateur, donc de quelqu'un.
                $q = db()->prepare("DELETE FROM events WHERE student_id = ? AND id IN ($trous)");
                $q->execute(array_merge([$studentId], $paquet));
                $efface += $q->rowCount();
            }
        }

        db()->prepare('INSERT INTO reinitialisations (id, student_id, path_id) VALUES (?, ?, ?)')
            ->execute([uuidv4(), $studentId, $pathId]);

        respond(['ok' => true, 'efface' => $efface,
                 'dit' => $efface
                    ? "Séance remise à zéro : $efface trace(s) effacée(s)."
                    : 'Séance remise à zéro : cet élève n\'avait rien commencé.']);
    }

    respond([
        'student' => ['id' => $student['id'], 'firstName' => $student['first_name']],
        'mastery' => array_values(masteryOf(attemptsOf($events))),
        'openErrors' => array_slice(openErrorsOf($events), 0, 30),
        'runs' => array_map(fn($r) => gradeRun($r), array_slice($runs, 0, 15)),
        'score' => scoreOf($events),
        'timeSeconds' => timeOf($events),
    ]);
}

/**
 * LA CLASSE DONT ON PARLE, ET LA PREUVE QU'ELLE EST À NOUS.
 *
 * Toutes les routes qui suivent commencent par là, et aucune ne s'en dispense :
 * l'identifiant vient du navigateur, donc de quelqu'un — on ne le croit pas.
 * Voir la section « Deux professeurs sur le même serveur » de
 * `tools/testApi.php` : c'est exactement cette vérification-là qui manquait à
 * `/teacher/assign`, et le collègue posait du travail dans la classe d'à côté.
 */
function classeDuProf(array $teacher, array $body): array
{
    $classId = (string) ($body['classId'] ?? '');
    $stmt = db()->prepare('SELECT * FROM classes WHERE id = ? AND teacher_id = ?');
    $stmt->execute([$classId, $teacher['id']]);
    $classe = $stmt->fetch() ?: null;
    if (!$classe) fail(404, 'class_not_found', 'Classe introuvable.');
    return $classe;
}

/**
 * CONDUIRE UNE CLASSE — renommer, verrouiller, poser une consigne, vider,
 * supprimer.
 *
 * Une seule route pour cinq gestes, et c'est délibéré : ils portent tous sur la
 * même chose, ils demandent tous la même vérification d'appartenance, et cinq
 * adresses différentes n'auraient rien clarifié — elles auraient seulement
 * multiplié par cinq les endroits où oublier `classeDuProf()`.
 */
function handleTeacherClass(): void
{
    $teacher = requireTeacher();
    $body = jsonBody();
    $classe = classeDuProf($teacher, $body);
    $action = (string) ($body['action'] ?? '');

    if ($action === 'rename') {
        $nom = trim((string) ($body['name'] ?? ''));
        if ($nom === '') fail(400, 'bad_name', 'Il faut un nom.');
        db()->prepare('UPDATE classes SET name = ?, level = ? WHERE id = ?')
            ->execute([mb_substr($nom, 0, 80),
                       ($body['level'] ?? null) ?: null, $classe['id']]);
        respond(['ok' => true, 'dit' => 'Classe renommée.']);
    }

    if ($action === 'lock') {
        $on = !empty($body['locked']) ? 1 : 0;
        db()->prepare('UPDATE classes SET locked = ? WHERE id = ?')->execute([$on, $classe['id']]);
        respond(['ok' => true, 'locked' => (bool) $on, 'dit' => $on
            ? 'Classe en pause : les élèves ne voient plus que ce que vous leur donnez.'
            : 'Classe rouverte : les élèves retrouvent tout le catalogue.']);
    }

    // ── FERMÉ EN DEHORS D'UNE SÉANCE IMPOSÉE ────────────────────────────────
    //
    // RÉMY : « j'aimerai aussi le fait de bloquer les élèves chez eux. C'est à
    // dire que juste la séance imposée fonctionne mais par contre si il se
    // connecte, on leur dit que pour l'instant ce n'est disponible qu'au
    // collège (je peux mettre le message de mon choix) », puis : « Je peux
    // choisir qu'il ne puisse avoir accès à rien à la maison pour la simple
    // raison que pour le moment je veux suivre ce qu'ils font et voir le
    // debug ».
    //
    // LE MOT EST LE SIEN, et le défaut n'est là que pour celui qui coche sans
    // écrire : une case cochée qui n'afficherait rien laisserait l'élève
    // devant un écran muet, ce qui est le contraire de ce qu'on veut.
    if ($action === 'maison') {
        $on = !empty($body['ferme']) ? 1 : 0;
        $mot = trim((string) ($body['mot'] ?? ''));
        // ── CE QU'ON LAISSE PASSER MALGRÉ LA PORTE FERMÉE ──────────────────
        //
        // RÉMY : « je peux laisser libre qqs exercices que j'aurais défini mais
        // attention c'est la seule chose qu'il peut faire », puis « si
        // j'empêche l'accès pour une classe, je peux autoriser des exercices
        // spécifiquement pour cette classe ».
        //
        // ON NE L'ÉCRIT QUE SI ON LA REÇOIT. L'écran du direct envoie l'état
        // complet (case + mot) sans connaître cette liste : écrire un tableau
        // vide par défaut effacerait les exercices choisis dès qu'on
        // réenregistre le message depuis l'autre écran. Absent veut donc dire
        // « ne touche pas », et un tableau vide explicite veut dire « plus
        // aucun ».
        $garderLaListe = !array_key_exists('exos', $body);
        $exos = [];
        foreach ((array) ($body['exos'] ?? []) as $x) {
            $x = trim((string) $x);
            // UN IDENTIFIANT DU CATALOGUE N'A NI VIRGULE NI ESPACE : la colonne
            // les sépare par des virgules, et l'on refuse donc ce qui la
            // casserait plutôt que de ranger une liste qu'on ne saura pas
            // relire.
            if ($x !== '' && !preg_match('/[,\s]/', $x)) $exos[] = $x;
        }
        $exos = array_slice(array_values(array_unique($exos)), 0, 24);
        if ($garderLaListe) {
            db()->prepare('UPDATE classes SET hors_seance = ?, hors_seance_mot = ? WHERE id = ?')
                ->execute([$on, $mot !== '' ? mb_substr($mot, 0, 300) : null, $classe['id']]);
            $exos = listeDIdentifiants($classe['hors_seance_exos'] ?? null);
        } else {
            db()->prepare('UPDATE classes SET hors_seance = ?, hors_seance_mot = ?,
                                  hors_seance_exos = ? WHERE id = ?')
                ->execute([$on, $mot !== '' ? mb_substr($mot, 0, 300) : null,
                           $exos ? implode(',', $exos) : null, $classe['id']]);
        }
        $combien = count($exos);
        respond(['ok' => true, 'ferme' => (bool) $on, 'mot' => $mot, 'exos' => $exos,
            'dit' => $on
            ? ($combien
                ? 'Fermé hors séance, sauf ' . $combien . ' exercice'
                    . ($combien > 1 ? 's' : '') . ' laissé'
                    . ($combien > 1 ? 's' : '') . ' libre' . ($combien > 1 ? 's' : '') . '.'
                : 'Fermé hors séance : vos élèves ne peuvent travailler que lorsque vous imposez une séance.')
            : 'Rouvert : vos élèves peuvent travailler même sans séance imposée.']);
    }

    // ── METTRE TOUTE LA CLASSE EN PAUSE, MAINTENANT ─────────────────────────
    //
    // RÉMY : « je n'ai pas réussi à mettre toute la classe en pause ».
    //
    // CE GESTE N'EXISTAIT PAS. Le voile de pause — celui qui couvre l'écran de
    // l'élève en lui gardant son travail dessous — ne pouvait être déclenché
    // que par un compte à rebours arrivé à zéro. Pour reprendre la parole
    // maintenant, il fallait lancer une minuterie et l'attendre finir.
    //
    // ET IL EXISTE DÉJÀ UN BOUTON QUI S'APPELLE « Mettre en pause » : c'est
    // `lock`, qui ferme le CATALOGUE. Deux choses sous le même mot, dont
    // aucune ne faisait ce qu'il demandait. `lock` est donc renommé à ce qu'il
    // fait, et ce geste-ci prend le nom.
    //
    // ON N'ARRACHE RIEN, ON COUVRE. C'est la règle écrite dans `ui/leMoment.js`
    // le jour où le compte à rebours a eu sa pause : « quand il rend la main,
    // l'élève doit retrouver sa question exactement où elle était. Une pause
    // qui perd le travail en cours n'est pas une pause, c'est une punition. »
    if ($action === 'pause') {
        $mot = trim((string) ($body['mot'] ?? ''));
        $on = !empty($body['on']);
        if (!$on) {
            db()->prepare('UPDATE classes SET pause_mot = NULL WHERE id = ?')
                ->execute([$classe['id']]);
            respond(['ok' => true, 'pause' => null, 'dit' => 'La classe reprend.']);
        }
        // UN VOILE MUET SE LIT COMME UNE PANNE : il y a donc un défaut, et
        // c'est la phrase qui dit à l'élève ce qui se passe et quoi faire.
        if ($mot === '') $mot = 'On s\'arrête un instant : écoutez.';
        db()->prepare('UPDATE classes SET pause_mot = ? WHERE id = ?')
            ->execute([mb_substr($mot, 0, 300), $classe['id']]);
        respond(['ok' => true, 'pause' => ['mot' => $mot],
                 'dit' => 'Toute la classe est en pause. Leur travail est gardé.']);
    }

    if ($action === 'notice') {
        $mot = trim((string) ($body['notice'] ?? ''));
        db()->prepare('UPDATE classes SET notice = ? WHERE id = ?')
            ->execute([$mot !== '' ? mb_substr($mot, 0, 300) : null, $classe['id']]);
        respond(['ok' => true, 'dit' => $mot === ''
            ? 'Consigne retirée.' : 'Consigne affichée à toute la classe.']);
    }

    // IMPOSER LA SÉANCE. Rémy : « est-ce qu'il ne serait pas possible que
    // lorsque les élèves se connectent, j'impose la séance, comme cela ils
    // n'ont rien à lancer ».
    //
    // ON VÉRIFIE QUE LE PARCOURS EST À NOUS. Sans cela, un identifiant de
    // parcours suffirait à faire travailler la classe d'un collègue sur le
    // sien — la même porte qu'on a fermée sur /teacher/assign, et elle doit
    // être fermée ici aussi.
    if ($action === 'imposer') {
        $pathId = trim((string) ($body['pathId'] ?? ''));
        // LE PLEIN ÉCRAN VOYAGE AVEC LA SÉANCE IMPOSÉE, et s'éteint avec elle.
        //
        // Rémy : « après peut être vaut il mieux le mettre en paramètre ». Un
        // drapeau qui survivrait à la séance qu'il accompagne serait un piège :
        // la séance du mardi s'éteint toute seule à la fin de la journée (voir
        // `impose_jusqu_a`), et le plein écran reviendrait tout seul la
        // semaine suivante sur une séance pour laquelle il ne l'a pas demandé.
        $pleinEcran = !empty($body['pleinEcran']) ? 1 : 0;
        // ── CHANGER DE SÉANCE ÉTEINT LE COMPTE À REBOURS DE LA PRÉCÉDENTE ───
        //
        // RÉMY : « Les élèves ont fait une nouvelle séance. Certains étaient
        // déjà connectés et malgré la nouvelle séance c'était donné temps
        // écoulé ».
        //
        // Le compte à rebours est une donnée de CLASSE, et rien ne l'effaçait
        // quand il tombait à zéro — à dessein : « on ne l'annonce qu'à ceux qui
        // l'ont vu courir » (voir `tempsRestant`, js/core/seanceDistante.js),
        // et cette mémoire-là est sur l'appareil, parce que trente élèves
        // interrogent la même classe et que le premier à constater zéro
        // l'effacerait pour les vingt-neuf qui le regardent. Elle protège donc
        // celui qui se connecte APRÈS, et elle ne protège pas celui qui ne
        // s'est JAMAIS déconnecté : lui gardait « Temps écoulé · On s'arrête
        // là » en travers de sa séance neuve.
        //
        // CE N'EST PAS UNE QUESTION DE DURÉE — un délai de grâce ne sait pas
        // distinguer les cinq minutes d'interclasse d'une vraie fin d'heure —,
        // c'est une question de QUELLE SÉANCE, exactement comme pour les
        // permissions (`reglageEnVigueur`) : ce qui a été réglé pour l'heure
        // d'avant ne vaut plus pour celle-ci. Et c'est ici que la séance
        // change, une seule fois, pour toute la classe à la fois.
        //
        // SEULEMENT SI ELLE CHANGE VRAIMENT. La case « plein écran » repasse
        // par cette même action avec la MÊME séance (js/ui/espaceClasses.js,
        // branche `d.ecranSeance`) : effacer à chaque appel ferait disparaître
        // le compte à rebours de l'heure en cours parce qu'on a coché une case
        // au milieu de l'heure.
        //
        // ↔ `js/core/seanceDistante.js`, `tempsRestant` — l'autre moitié de
        //   cette règle, et celle qui dit pourquoi le chrono ne s'efface pas
        //   depuis l'ardoise. Les deux se lisent ensemble.
        $changeDeSeance = (string) ($classe['impose_path_id'] ?? '') !== $pathId;
        $eteindreLeChrono = function () use ($classe, $changeDeSeance) {
            if (!$changeDeSeance) return;
            db()->prepare('UPDATE classes SET chrono_fin = NULL, chrono_a_zero = NULL
                           WHERE id = ?')->execute([$classe['id']]);
        };
        if ($pathId === '') {
            db()->prepare('UPDATE classes SET impose_path_id = NULL, impose_jusqu_a = NULL,
                                  impose_plein_ecran = 0
                           WHERE id = ?')->execute([$classe['id']]);
            // « PLUS DE SÉANCE » EST LA FIN DE L'HEURE, pas une heure qui
            // continue sans séance : le compte à rebours s'en va avec elle.
            $eteindreLeChrono();
            respond(['ok' => true, 'impose' => null, 'jusqua' => null, 'pleinEcran' => false,
                     'dit' => 'La séance n\'est plus imposée : chacun choisit.']);
        }
        $q = db()->prepare('SELECT id, name FROM paths WHERE id = ? AND teacher_id = ?');
        $q->execute([$pathId, $teacher['id']]);
        $p = $q->fetch();
        if (!$p) fail(404, 'path_not_found', 'Parcours introuvable.');
        // APRÈS LA VÉRIFICATION D'APPARTENANCE, et pas avant : un identifiant
        // de parcours inventé ne doit pas pouvoir éteindre le compte à rebours
        // d'une classe qui travaille.
        $eteindreLeChrono();
        // ELLE S'ÉTEINT TOUTE SEULE À LA FIN DE LA JOURNÉE.
        //
        // Rémy : « si je ne clos pas une séance, à la maison l'élève aura
        // toujours la séance en cours non ? » — oui, et sans fin. Une séance
        // posée un mardi matin et oubliée s'ouvrait encore toute seule le
        // samedi. Voir `finDeLaJourneeScolaire` : elle vaut jusqu'à trois
        // heures du matin, pour ne pas se refermer au milieu d'une question
        // chez l'élève qui finit à 23 h 50.
        $jusqua = finDeLaJourneeScolaire();
        db()->prepare('UPDATE classes SET impose_path_id = ?, impose_jusqu_a = ?,
                              impose_plein_ecran = ? WHERE id = ?')
            ->execute([$pathId, $jusqua, $pleinEcran, $classe['id']]);
        respond(['ok' => true, 'impose' => $pathId, 'jusqua' => $jusqua,
                 'pleinEcran' => (bool) $pleinEcran,
                 'dit' => '« ' . $p['name'] . ' » s\'ouvre tout seul chez vos élèves '
                        . 'jusqu\'à demain matin'
                        . ($pleinEcran ? ', en plein écran.' : '.')]);
    }

    // ── LE DÉFI CHRONOMÉTRÉ DE LA CLASSE ────────────────────────────────────
    //
    // RÉMY : « je peux lancer un challenge chronométré, le plus de calcul et
    // toute la classe participe et au bout du challenge, un tableau de High
    // score […] et on reprend la suite des exercices normalement ».
    //
    // DEUX INSTANTS, ÉCRITS PAR LE SERVEUR. C'est la règle du compte à rebours,
    // et elle vaut doublement ici : l'ardoise qui interroge deux secondes plus
    // tard aurait deux secondes de plus que celle du voisin, et le classement
    // comparerait des minutes de longueurs différentes.
    //
    // ET UNE GRAINE, POUR QUE LA SÉRIE SOIT LA MÊME CHEZ TOUT LE MONDE. Sans
    // elle, chaque ardoise tirerait ses propres questions : on classerait
    // trente épreuves différentes. Les générateurs sont déjà déterministes —
    // il suffit de leur donner le même point de départ.
    if ($action === 'defi') {
        $secondes = (int) ($body['secondes'] ?? 0);
        if ($secondes <= 0) {
            db()->prepare('UPDATE classes SET defi_exo = NULL, defi_graine = NULL,
                                  defi_mode = NULL, defi_debut = NULL, defi_fin = NULL
                           WHERE id = ?')->execute([$classe['id']]);
            respond(['ok' => true, 'defi' => null, 'dit' => 'Défi arrêté.']);
        }
        // DIX SECONDES AU MOINS, CINQ MINUTES AU PLUS. En deçà, personne n'a le
        // temps de lire la première question ; au-delà, ce n'est plus un défi,
        // c'est un exercice — et il en existe déjà.
        if ($secondes < 10 || $secondes > 300) {
            fail(400, 'duree', 'Entre 10 secondes et 5 minutes.');
        }
        $exo = trim((string) ($body['exo'] ?? ''));
        if ($exo === '' || !preg_match('/^[a-z0-9._-]{2,64}$/i', $exo)) {
            fail(400, 'exo', 'Il faut choisir un exercice.');
        }
        $mode = ($body['mode'] ?? 'qcm') === 'saisie' ? 'saisie' : 'qcm';
        // LA GRAINE EST TIRÉE ICI, PAS PAR L'ÉCRAN : c'est la seule façon
        // qu'elle soit la même pour tous, et personne ne peut la choisir pour
        // retomber sur une série qu'il connaît déjà.
        $graine = bin2hex(random_bytes(6));
        // ── LE DÉFI S'ANNONCE AVANT DE COMMENCER ────────────────────────────
        //
        // RÉMY : « ça se lance pareil pour tout le monde ? au même moment ? ».
        //
        // NON, ET CE N'ÉTAIT PAS VRAI SANS CECI. L'ardoise de l'élève interroge
        // le serveur toutes les DIX SECONDES ; celle qui vient de le faire
        // apprend le défi dix secondes après celle du voisin. Avec une fin
        // commune, elle avait dix secondes de moins — sur une minute, un
        // sixième du défi, et le classement ne comparait plus la même épreuve.
        //
        // ON ANNONCE DONC LE DÉPART DOUZE SECONDES PLUS TARD. Toutes les
        // ardoises l'ont reçu avant qu'il commence ; chacune affiche le compte
        // à rebours de l'annonce, et toutes démarrent À LA MÊME SECONDE. Douze
        // et non dix : il faut que la plus en retard ait reçu le défi, pas
        // qu'elle le reçoive pile à l'instant du départ.
        $debut = time() + 12;
        db()->prepare('UPDATE classes SET defi_exo = ?, defi_graine = ?, defi_mode = ?,
                              defi_debut = ?, defi_fin = ? WHERE id = ?')
            ->execute([$exo, $graine, $mode, $debut, $debut + $secondes, $classe['id']]);
        respond(['ok' => true,
                 'defi' => ['exo' => $exo, 'graine' => $graine, 'mode' => $mode,
                            'debut' => $debut, 'fin' => $debut + $secondes],
                 'dit' => 'Défi annoncé : départ dans 12 secondes, puis '
                        . $secondes . ' secondes pour toute la classe.']);
    }

    // LE COMPTE À REBOURS, ET SES DEUX ISSUES. Rémy : « pour le compte à
    // rebours c'est pour terminer la séance ou mettre en pause (pour faire un
    // peu de cours par exemple ou pour parler) ».
    //
    // ON ENREGISTRE L'INSTANT DE FIN, jamais une durée. Une durée commence à
    // vieillir dès qu'elle est écrite ; un élève qui arrive en retard, ou dont
    // l'appareil se réveille, doit voir le temps qui reste VRAIMENT — pas celui
    // qui restait quand le professeur a cliqué.
    if ($action === 'chrono') {
        $minutes = (int) ($body['minutes'] ?? 0);
        if ($minutes <= 0) {
            db()->prepare('UPDATE classes SET chrono_fin = NULL, chrono_a_zero = NULL WHERE id = ?')
                ->execute([$classe['id']]);
            respond(['ok' => true, 'chrono' => null, 'dit' => 'Compte à rebours arrêté.']);
        }
        if ($minutes > 180) fail(400, 'trop_long', 'Trois heures au plus.');
        $aZero = ($body['aZero'] ?? 'terminer') === 'pause' ? 'pause' : 'terminer';
        $fin = time() + $minutes * 60;
        db()->prepare('UPDATE classes SET chrono_fin = ?, chrono_a_zero = ? WHERE id = ?')
            ->execute([$fin, $aZero, $classe['id']]);
        respond(['ok' => true, 'chrono' => ['finAt' => $fin, 'aZero' => $aZero],
                 'dit' => $minutes . ' min — à zéro, on ' .
                     ($aZero === 'pause' ? 'met la classe en pause.' : 'termine la séance.')]);
    }

    // LE BAC À SABLE DE CEUX QUI ONT FINI.
    //
    // Rémy : « un élève qui a fini peut avoir une zone bac à sable avec des
    // jeux ». Il est OUVERT par défaut : une fonction qu'il faut allumer pour
    // la découvrir n'est jamais découverte. Ce geste-ci sert à le FERMER, pour
    // les heures où celui qui a fini doit relire ou aider son voisin.
    if ($action === 'bac') {
        $ferme = !empty($body['ferme']);
        // ET COMBIEN DE TEMPS IL DURE. Rémy : « un temps, réglé par vous ». Le
        // compte part quand l'élève OUVRE le bac ; zéro veut dire « pas de
        // limite », et c'est le défaut. On borne à deux heures : au-delà, le
        // chiffre ne veut plus rien dire dans une heure de cours.
        $minutes = array_key_exists('minutes', $body)
            ? max(0, min(120, (int) $body['minutes'])) : null;

        // CE QU'IL Y A DEDANS. Rémy : « pour le bac à sable j'aimerai quand
        // même bien pouvoir éditer le contenu ».
        //
        // TROIS ÉTATS, ET ILS NE DISENT PAS LA MÊME CHOSE :
        //   · la clef absente — on ne touche pas au contenu (c'est le cas
        //     quand on ouvre ou ferme le bac, ou qu'on règle sa durée) ;
        //   · une liste VIDE — le professeur a tout retiré, et son bac doit
        //     rester vide plutôt que de se remplir tout seul de ce qu'il vient
        //     d'enlever ;
        //   · une liste — c'est elle qu'on sert.
        //
        // ON BORNE À VINGT. Le module du bac le dit depuis le début : « un
        // élève à qui il reste sept minutes et qui doit CHOISIR parmi deux
        // cents passe ses sept minutes à choisir ».
        $jeux = null;
        if (array_key_exists('jeux', $body)) {
            $liste = is_array($body['jeux']) ? $body['jeux'] : [];
            $propres = [];
            foreach ($liste as $x) {
                $x = trim((string) $x);
                // L'ALPHABET D'UN IDENTIFIANT DE CATALOGUE, et rien d'autre :
                // cette chaîne repartira vers trente navigateurs d'élèves.
                if ($x !== '' && preg_match('/^[a-z0-9-]{2,60}$/', $x)
                    && !in_array($x, $propres, true)) {
                    $propres[] = $x;
                }
            }
            $jeux = implode(',', array_slice($propres, 0, 20));
        }

        // ON N'ÉCRIT QUE CE QU'ON NOUS A DONNÉ. Trois requêtes auraient été
        // trois façons d'oublier un cas ; on compose la liste des colonnes.
        $colonnes = ['bac_ferme = ?'];
        $valeurs = [$ferme ? 1 : 0];
        if ($minutes !== null) { $colonnes[] = 'bac_minutes = ?'; $valeurs[] = $minutes ?: null; }
        if ($jeux !== null)    { $colonnes[] = 'bac_jeux = ?';    $valeurs[] = $jeux; }
        $valeurs[] = $classe['id'];
        db()->prepare('UPDATE classes SET ' . implode(', ', $colonnes) . ' WHERE id = ?')
            ->execute($valeurs);

        $combien = $jeux === null ? null : ($jeux === '' ? 0 : count(explode(',', $jeux)));
        $dit = $ferme ? 'Bac à sable fermé.'
            : ($combien !== null
                ? ($combien ? "Bac à sable : $combien jeu(x) choisi(s)."
                            : 'Bac à sable vidé : plus aucun jeu proposé.')
                : ($minutes ? "Bac à sable ouvert, $minutes minutes par élève."
                            : 'Bac à sable ouvert.'));
        respond(['ok' => true, 'ferme' => $ferme, 'minutes' => $minutes ?: 0,
                 'jeux' => $jeux === null ? null : ($jeux === '' ? [] : explode(',', $jeux)),
                 'dit' => $dit]);
    }

    // LES DEUX GESTES SANS RETOUR DEMANDENT LE MOT ÉCRIT, comme dans les pages
    // d'administration. Une fenêtre « êtes-vous sûr ? » se clique sans lire ;
    // taper EFFACER demande de s'arrêter une seconde, et c'est tout ce qu'on
    // veut : pas empêcher, faire réfléchir.
    if ($action === 'empty' || $action === 'delete') {
        if (trim((string) ($body['confirmation'] ?? '')) !== 'EFFACER') {
            fail(400, 'confirmation', 'Écrivez EFFACER pour confirmer.');
        }
        $s = db()->prepare('SELECT COUNT(*) AS n FROM students WHERE class_id = ?');
        $s->execute([$classe['id']]);
        $n = (int) ($s->fetch()['n'] ?? 0);
        // La cascade emporte événements, jetons, mots et déblocages : c'est ce
        // qui rend vraie la phrase « je détruirai la liste des élèves ».
        db()->prepare('DELETE FROM students WHERE class_id = ?')->execute([$classe['id']]);
        if ($action === 'delete') {
            db()->prepare('DELETE FROM classes WHERE id = ?')->execute([$classe['id']]);
            // « et ses 0 élève(s) » se lit mal, et se lit souvent : on supprime
            // le plus souvent une classe qu'on vient de vider.
            respond(['ok' => true, 'supprimee' => true,
                     'dit' => 'La classe « ' . $classe['name'] . ' » a été effacée'
                        . ($n ? ', avec ses ' . $n . ' élève(s)' : '') . '.']);
        }
        respond(['ok' => true, 'dit' => $n . ' élève(s) effacés. La classe reste, vide.']);
    }

    fail(400, 'bad_action', 'Action inconnue : ' . $action);
}

/**
 * LA LISTE D'UNE CLASSE — lire, prévoir, importer, refaire les codes, retirer.
 *
 * Rémy : « j'espère qu'on pourra importer des CSV et ou du presse papier et je
 * peux choisir un mdp générique pour tous mes élèves et je peux leur recréer un
 * mdp ». Tout cela existait dans `api/admin/eleves.php` ; ici, c'est la MÊME
 * mise en œuvre appelée depuis l'application — `lib/eleves.php`, pas une copie.
 */
function handleTeacherRoster(): void
{
    $teacher = requireTeacher();
    $body = jsonBody();
    $classe = classeDuProf($teacher, $body);
    $action = (string) ($body['action'] ?? 'list');

    if ($action === 'apercu') {
        // RIEN N'EST ÉCRIT ICI, et c'est tout l'intérêt : le professeur voit
        // d'abord ce qui va se passer, ligne par ligne, puis confirme.
        $apercu = apercuDeListe(
            (string) ($body['texte'] ?? ''),
            trim((string) ($body['codeCommun'] ?? '')),
            $classe['id'], (string) $teacher['id']
        );
        if (!$apercu) fail(400, 'rien_compris', "Aucun élève reconnu dans ce que vous avez donné.");
        respond(['apercu' => $apercu]);
    }

    if ($action === 'importer') {
        // On relit la liste NORMALISÉE rendue par l'aperçu, jamais le collage
        // d'origine : l'import ne peut donc pas comprendre autre chose que ce
        // qui a été montré.
        $bilan = importerListe((string) ($body['liste'] ?? ''), $classe['id'], (string) $teacher['id']);
        respond(['bilan' => $bilan, 'dit' => phraseDImport($bilan),
                 'eleves' => rosterLisible($classe['id'])]);
    }

    // RENOMMER UN ÉLÈVE. Rémy : « j'aimerais aussi pouvoir modifier le pseudo
    // d'un élève et son mot de passe », puis « il faut que ce soit simple ».
    // Une action, un champ, une phrase en retour — et le refus est une phrase
    // lui aussi, parce qu'« identifiant déjà pris » se répare tout seul quand
    // on le lit, alors qu'une erreur 409 muette fait écrire un message.
    if ($action === 'prenom') {
        $bilan = renommerLePrenom((string) ($body['studentId'] ?? ''), $classe['id'],
                                  (string) ($body['prenom'] ?? ''));
        if (!$bilan['ok']) fail(400, 'bad_prenom', $bilan['dit']);
        respond(['ok' => true, 'dit' => $bilan['dit'],
                 'eleves' => rosterLisible($classe['id'])]);
    }

    if ($action === 'pseudo') {
        $bilan = renommerEleve((string) ($body['studentId'] ?? ''), $classe['id'],
                               (string) ($body['pseudo'] ?? ''));
        if (!$bilan['ok']) fail(400, 'bad_login', $bilan['dit']);
        respond(['ok' => true, 'dit' => $bilan['dit'],
                 'eleves' => rosterLisible($classe['id'])]);
    }

    if ($action === 'code') {
        // LE CODE CHOISI PASSE PAR LE MÊME CONTRÔLE QUE LE CODE COMMUN, et ce
        // n'est pas de la symétrie pour la symétrie : c'est le même objet, qui
        // se dicte et se recopie sur un billet photocopié. Un code avec un
        // espace ou un accent se perd entre le tableau et le clavier.
        // LE POINT EST ACCEPTÉ, ET LE TIRET, ET LE SOULIGNÉ.
        //
        // RÉMY : « que ça accepte aussi le point ». L'ancienne règle,
        // `[A-Za-z0-9]`, refusait tout le reste — un professeur qui donne
        // « 6e.2 » comme code à sa classe se faisait renvoyer un message
        // d'erreur sans comprendre lequel des signes gênait.
        //
        // CES TROIS-LÀ ET PAS D'AUTRES, parce qu'un code se DICTE et se
        // RECOPIE depuis un billet photocopié : le point, le tiret et le
        // souligné se nomment en un mot et s'écrivent sans ambiguïté. Une
        // apostrophe ou une espace, non — et l'espace casserait en plus le
        // collage d'une liste, où elle sépare les colonnes.
        $choisi = trim((string) ($body['codeChoisi'] ?? ''));
        if ($choisi !== '' && !preg_match('/^[A-Za-z0-9._-]{3,12}$/', $choisi)) {
            fail(400, 'bad_code',
                 'Le code doit faire de 3 à 12 signes : des lettres, des chiffres, '
                 . 'et si besoin un point, un tiret ou un souligné.');
        }
        if (!nouveauCodePourEleve((string) ($body['studentId'] ?? ''), $classe['id'], $choisi)) {
            fail(404, 'student_not_found', 'Élève introuvable.');
        }
        respond(['ok' => true,
                 'dit' => $choisi !== ''
                    ? 'Son code est maintenant « ' . mb_strtoupper($choisi)
                        . ' ». L\'ancien billet ne vaut plus rien.'
                    : "Nouveau code tiré. L'ancien billet ne vaut plus rien.",
                 // UN TIRAGE NEUF POUR LA FENÊTRE SUIVANTE. Elle pré-remplit
                 // son champ avec lui ; sans cette ligne, deux élèves changés
                 // à la suite recevraient le MÊME code proposé, et chacun
                 // pourrait entrer chez l'autre.
                 'codePropose' => codeEleve(4),
                 'eleves' => rosterLisible($classe['id'])]);
    }

    if ($action === 'codes') {
        // MÊME ALPHABET QUE LE CODE D'UN SEUL ÉLÈVE — voir plus haut. Deux
        // règles pour le même objet finissent toujours par diverger, et c'est
        // le professeur qui paie la différence : « 6e.2 » accepté ici, refusé
        // là, sans que rien ne l'explique.
        $commun = trim((string) ($body['codeCommun'] ?? ''));
        if ($commun !== '' && !preg_match('/^[A-Za-z0-9._-]{3,12}$/', $commun)) {
            fail(400, 'bad_code',
                 'Le code commun doit faire de 3 à 12 signes : des lettres, des chiffres, '
                 . 'et si besoin un point, un tiret ou un souligné.');
        }
        $n = refaireLesCodes($classe['id'], $commun);
        respond(['ok' => true, 'eleves' => rosterLisible($classe['id']),
                 'dit' => $n . ' code(s) refaits. Réimprimez les billets : les anciens '
                    . 'ne valent plus rien.']);
    }

    if ($action === 'retirer') {
        $qui = retirerEleve((string) ($body['studentId'] ?? ''), $classe['id']);
        if ($qui === '') fail(404, 'student_not_found', 'Élève introuvable.');
        respond(['ok' => true, 'dit' => $qui . ' a été retiré, avec tout son travail.',
                 'eleves' => rosterLisible($classe['id'])]);
    }

    if ($action === 'bloquer') {
        $on = !empty($body['blocked']) ? 1 : 0;
        db()->prepare('UPDATE students SET blocked = ? WHERE id = ? AND class_id = ?')
            ->execute([$on, (string) ($body['studentId'] ?? ''), $classe['id']]);
        respond(['ok' => true, 'eleves' => rosterLisible($classe['id']),
                 'dit' => $on ? 'Élève mis de côté : il ne peut plus se rattacher.'
                              : 'Élève réactivé.']);
    }

    if ($action !== 'list') fail(400, 'bad_action', 'Action inconnue : ' . $action);

    respond([
        'classe' => [
            'id' => $classe['id'], 'name' => $classe['name'],
            'joinCode' => $classe['join_code'], 'level' => $classe['level'],
            'locked' => (bool) $classe['locked'], 'notice' => $classe['notice'],
            // LE MOMENT EN COURS, pour que l'écran s'ouvre sur ce qui est
            // VRAIMENT posé — et non sur des champs vides qu'il faudrait
            // deviner. Un écran de réglages qui ne montre pas l'état actuel
            // fait reposer deux fois le même réglage.
            // ON RELIT PAR LA MÊME PORTE QUE L'ÉLÈVE. Rendre la colonne brute
            // ferait dire « en cours » à l'écran du professeur pour une séance
            // que ses élèves ne reçoivent plus depuis ce matin.
            'impose_path_id' => imposeEncoreValide($classe),
            'impose_jusqu_a' => $classe['impose_jusqu_a'] ?? null,
            // LA CASE DOIT MONTRER SON ÉTAT, sinon le professeur la recoche à
            // chaque heure sans savoir si elle l'était déjà — c'est la leçon
            // écrite deux lignes plus haut, et elle vaut pour tout réglage.
            'impose_plein_ecran' => (bool) ($classe['impose_plein_ecran'] ?? 0),
            // FERMÉ HORS SÉANCE, et le mot qu'on lit alors. Même raison que
            // ci-dessus : une case qui ne montre pas son état se recoche.
            'hors_seance' => (bool) ($classe['hors_seance'] ?? 0),
            'hors_seance_mot' => (string) ($classe['hors_seance_mot'] ?? ''),
            // CE QU'ON LAISSE PASSER MALGRÉ LA PORTE FERMÉE. L'écran du direct
            // doit pouvoir montrer la liste pour la modifier, et surtout la
            // RENVOYER telle quelle : sans elle, enregistrer le message
            // effacerait les exercices choisis.
            'hors_seance_exos' => listeDIdentifiants($classe['hors_seance_exos'] ?? null),
            'chrono_fin' => $classe['chrono_fin'] ?? null,
            'chrono_a_zero' => $classe['chrono_a_zero'] ?? null,
            'bac_ferme' => (bool) ($classe['bac_ferme'] ?? 0),
            // Combien de temps dure le bac chez eux, en minutes. 0 = sans
            // limite. L'écran doit l'afficher, sinon le professeur repose le
            // même quart d'heure à chaque heure sans savoir s'il y est déjà.
            'bac_minutes' => (int) ($classe['bac_minutes'] ?? 0),
            // ET CE QU'IL Y A DEDANS, pour que l'écran puisse dire l'état avant
            // qu'on clique. NULL veut dire « au choix du logiciel » et la
            // chaîne vide « tout retiré » : l'écran distingue les deux, on lui
            // rend donc la colonne telle quelle plutôt qu'un tableau qui les
            // confondrait.
            'bac_jeux' => $classe['bac_jeux'] ?? null,
        ],
        'eleves' => rosterLisible($classe['id']),
        // Un code proposé d'avance pour « le même pour toute la classe » : il
        // n'a plus qu'à le garder. Confortable, c'est aussi n'avoir rien à
        // inventer devant trente élèves qui attendent.
        'codePropose' => codeEleve(4),
    ]);
}

/**
 * LA LISTE TELLE QUE L'APPLICATION LA MONTRE.
 *
 * On ne rend QUE ce qui s'affiche : prénom, identifiant, code, dernière venue,
 * mise de côté. Le jeton, l'empreinte du prénom et celle de l'identifiant
 * restent au serveur — ils ne servent à rien à l'écran, et ce qui ne sort pas
 * ne fuit pas.
 */
function rosterLisible(string $classeId): array
{
    return array_map(fn ($e) => [
        'id' => $e['id'],
        'prenom' => $e['first_name'],
        'login' => $e['login'],
        'code' => $e['code'],
        'vu' => instantDe($e['last_seen_at']),
        'ecarte' => !empty($e['blocked']),
        // Un élève entré par le code de la classe n'a pas de billet : c'est
        // exactement ceux-là que le professeur cherche quand il recolle sa
        // liste, puisque l'import va les rattacher à leur travail.
        'sansBillet' => (string) $e['login'] === '',
    ], elevesDeLaClasse($classeId));
}

/**
 * LE DIRECT : qui travaille en ce moment, et sur quoi.
 *
 * C'est `derniereActivite()` — la même que la page d'administration, descendue
 * dans `lib/` pour que les deux écrans disent la même chose. Quarante
 * événements par élève, pas tout le journal : la page se rafraîchit toutes les
 * vingt secondes pour trente élèves, et il faut que cela reste gratuit.
 */
function handleTeacherLive(): void
{
    $teacher = requireTeacher();
    $body = jsonBody();
    $classe = classeDuProf($teacher, $body);

    // L'IDENTITÉ DE LA SÉANCE EN COURS, s'il y en a une imposée.
    //
    // RÉMY : « quand je mets une nouvelle séance en cours, pour le direct, ce
    // sont les progressions de la séance d'avant qui apparaissent ». On la
    // passe à `derniereActivite`, qui ne retient alors que le travail de CETTE
    // séance — voir le commentaire qui l'explique, dans lib/eleves.php.
    //
    // ELLE VIENT DE `assignments`, pas d'un calcul : c'est le navigateur qui
    // sait fabriquer une identité de parcours, et il l'a déposée là en donnant
    // la séance. Une séance donnée avant que cette colonne n'existe n'en a pas,
    // et l'on ne filtre alors rien plutôt que de tout cacher.
    $identiteSeance = null;
    $nomSeance = null;
    $imposeId = imposeEncoreValide($classe);
    if ($imposeId) {
        $q = db()->prepare('SELECT path_identity FROM assignments
                            WHERE path_id = ? AND class_id = ? AND student_id IS NULL');
        $q->execute([$imposeId, $classe['id']]);
        $identiteSeance = ($q->fetchColumn() ?: null);
        // ET SON NOM, qui ne change pas quand on complète la séance en route —
        // voir `derniereActivite`, qui dit pourquoi il faut les deux.
        $qn = db()->prepare('SELECT name FROM paths WHERE id = ?');
        $qn->execute([$imposeId]);
        $nomSeance = ($qn->fetchColumn() ?: null);
    }

    $rangs = [];
    $maintenant = time();
    foreach (elevesDeLaClasse($classe['id']) as $e) {
        $a = derniereActivite($e['id'], $identiteSeance, $nomSeance);
        $rangs[] = [
            'id' => $e['id'],
            'prenom' => $e['first_name'],
            'vu' => instantDe($e['last_seen_at']),
            'ecarte' => !empty($e['blocked']),
            'exo' => $a['exo'],
            'parcours' => $a['parcours'],
            'justes' => $a['justes'],
            'total' => $a['total'],
            'quand' => $a['quand'],
            // OÙ IL EN EST DE SA SÉANCE — calculé avec les mêmes règles que
            // chez l'élève (api/lib/projections.php ↔ js/core/avancement.js),
            // sans quoi les deux écrans diraient deux choses du même élève à la
            // même seconde.
            'avancement' => $a['avancement'],
            // ET CE QU'IL A SOUS LES YEUX, À LA MINUTE. `null` dès que le relevé
            // a passé trois minutes : le professeur préfère « il n'est sur aucun
            // exercice » à une question d'il y a un quart d'heure, qui l'enverrait
            // conseiller à côté. C'est la GRAINE qui compte le plus ici — elle
            // rouvre la question chez lui, à l'identique.
            'ecran' => ecranDeLEleve($e, $maintenant),
        ];
    }
    // LE MOMENT EN COURS VOYAGE AVEC LE DIRECT, et c'est ce qui empêche
    // l'alarme d'inactivité de sonner trente fois pendant que le professeur
    // parle au tableau : en pause, personne ne répond — c'est le but.
    $chronoFin = $classe['chrono_fin'] ?? null;
    respond([
        'classe' => ['id' => $classe['id'], 'name' => $classe['name'],
                     'locked' => (bool) $classe['locked'], 'notice' => $classe['notice']],
        'chrono' => $chronoFin ? ['finAt' => (int) $chronoFin,
                                  'aZero' => $classe['chrono_a_zero'] ?: 'terminer'] : null,
        // LA PAUSE DE CLASSE VOYAGE AVEC LE DIRECT, comme le compte à rebours :
        // c'est l'écran où le professeur la pose et la lève, et un bouton qui
        // ne dit pas son état se presse deux fois.
        'pause' => trim((string) ($classe['pause_mot'] ?? '')) !== ''
            ? ['mot' => (string) $classe['pause_mot']] : null,
        // L'HEURE DU SERVEUR, ET NON CELLE DU NAVIGATEUR. « en ligne » se
        // décide en comparant deux instants ; s'ils viennent de deux horloges
        // différentes, une tablette mal réglée fait disparaître toute la classe.
        'maintenant' => time(),
        'eleves' => $rangs,
        // LE DÉFI ET SON CLASSEMENT ENTIER. Rémy a choisi « podium + ta place »
        // pour les élèves ; lui voit tout, parce que c'est avec ce tableau-là
        // qu'il parlera à la classe ensuite.
        'defi' => defiEnCours($classe) ?: (($classe['defi_debut'] ?? 0) ? [
            'exo' => (string) ($classe['defi_exo'] ?? ''),
            'fini' => true,
            'debut' => (int) $classe['defi_debut'],
            'fin' => (int) ($classe['defi_fin'] ?? 0),
        ] : null),
        'classement' => classementDuDefi($classe),
    ]);
}

/**
 * LE SCORE D'UN ÉLÈVE À LA FIN DU DÉFI.
 *
 * L'ardoise l'envoie une fois la minute écoulée. Tout le contrôle est dans
 * `enregistrerScoreDefi` : c'est le serveur qui sait quel défi est ouvert, et
 * personne d'autre.
 */
function handleDefiScore(): void
{
    $eleve = requireStudent();
    $body = jsonBody();
    $r = enregistrerScoreDefi(
        $eleve,
        (int) ($body['bonnes'] ?? 0),
        (int) ($body['total'] ?? 0),
        (int) ($body['ms'] ?? 0)
    );
    respond($r);
}

/**
 * UN MOT À LA CLASSE, OU À UN ÉLÈVE.
 *
 * Cinq cents signes au plus : c'est un mot au tableau, pas un courrier. Et
 * l'accusé de lecture voyage avec, parce que la question que le professeur se
 * pose vraiment est « l'a-t-il vu ? ».
 */
function handleTeacherMessage(): void
{
    $teacher = requireTeacher();
    $body = jsonBody();
    $classe = classeDuProf($teacher, $body);

    if (($body['action'] ?? 'send') === 'list') {
        $s = db()->prepare(
            'SELECT m.*, st.first_name,
                    (SELECT COUNT(*) FROM message_reads r WHERE r.message_id = m.id) AS lus
             FROM messages m
             LEFT JOIN students st ON st.id = m.student_id
             WHERE m.class_id = ? OR m.student_id IN (SELECT id FROM students WHERE class_id = ?)
             ORDER BY m.created_at DESC LIMIT 12'
        );
        $s->execute([$classe['id'], $classe['id']]);
        respond(['messages' => array_map(fn ($m) => [
            'id' => $m['id'],
            'corps' => dechiffrer($m['body']),
            'genre' => ($m['genre'] ?? '') === 'indice' ? 'indice' : 'mot',
            'pour' => $m['student_id'] ? dechiffrer($m['first_name']) : null,
            'lus' => (int) $m['lus'],
            'quand' => $m['created_at'],
        ], $s->fetchAll())]);
    }

    $corps = trim((string) ($body['body'] ?? ''));
    if ($corps === '') fail(400, 'vide', 'Le mot est vide.');
    $pour = (string) ($body['studentId'] ?? '');
    // MOT OU INDICE — deux façons d'arriver chez l'élève, pas deux tables. Le
    // mot prend l'écran et demande un « J'ai lu » ; l'indice se pose à côté de
    // la question sans rien interrompre. Tout le reste est identique, y compris
    // l'accusé de lecture : le professeur veut savoir s'il a été vu.
    $genre = ($body['genre'] ?? 'mot') === 'indice' ? 'indice' : 'mot';

    if ($pour === '') {
        // UN INDICE NE S'ENVOIE PAS À TOUTE LA CLASSE. Souffler la même chose à
        // trente élèves dont vingt-cinq n'ont pas de difficulté, c'est leur
        // donner la réponse — et le professeur qui voulait aider Léo aurait
        // gâché l'exercice pour les autres. Ce geste-là s'appelle une consigne,
        // et il existe déjà.
        if ($genre === 'indice') {
            fail(400, 'indice_classe',
                'Un indice s\'adresse à un élève. Pour toute la classe, écrivez une consigne.');
        }
        db()->prepare('INSERT INTO messages (id, class_id, body, genre) VALUES (?, ?, ?, ?)')
            ->execute([uuidv4(), $classe['id'], chiffrer(mb_substr($corps, 0, 500)), $genre]);
        respond(['ok' => true, 'dit' => 'Mot envoyé à toute la classe.']);
    }

    // L'identifiant vient du navigateur : on vérifie que l'élève est bien de
    // cette classe avant de lui écrire.
    $s = db()->prepare('SELECT first_name FROM students WHERE id = ? AND class_id = ?');
    $s->execute([$pour, $classe['id']]);
    $eleve = $s->fetch() ?: null;
    if (!$eleve) fail(404, 'student_not_found', 'Élève introuvable.');
    db()->prepare('INSERT INTO messages (id, student_id, body, genre) VALUES (?, ?, ?, ?)')
        ->execute([uuidv4(), $pour, chiffrer(mb_substr($corps, 0, 500)), $genre]);
    respond(['ok' => true, 'dit' => ($genre === 'indice' ? 'Indice soufflé à ' : 'Mot envoyé à ')
        . dechiffrer($eleve['first_name']) . '.']);
}

/**
 * CE QUE LES ÉLÈVES ONT SIGNALÉ — lire, classer, effacer.
 *
 * TOUTES CLASSES CONFONDUES, et c'est le point. Un signalement parle du
 * LOGICIEL, pas de la classe : « le clavier recouvre l'énoncé » arrive des 5eB
 * comme des 4eA, et obliger Rémy à regarder dans six classes pour trouver six
 * fois le même défaut, c'est lui faire faire le tri que la machine sait faire.
 * Les mots, eux, restent par classe : ils s'adressent à des élèves, pas à un
 * logiciel.
 *
 * LA PHOTO NE VOYAGE PAS AVEC LA LISTE. Quatre cents kilo-octets par
 * signalement, vingt signalements : huit mégaoctets pour un écran qui en montre
 * peut-être une. Chaque ligne dit seulement SI elle en a une, et la route la
 * sert à la demande.
 */
/**
 * LE JOURNAL DES CONNEXIONS D'UNE CLASSE.
 *
 * RÉMY : « J'aimerai aussi que tu enregistres les connexions que je puisse
 * suivre ce qu'ils font ».
 *
 * ON REND LES DEUX CENTS DERNIÈRES, du plus récent au plus ancien. Deux cents
 * couvre une semaine d'une classe de trente ; au-delà, ce n'est plus un journal
 * qu'on lit, c'est une archive — et l'écran qui la lirait ne saurait pas quoi
 * en faire.
 *
 * L'APPARTENANCE SE VÉRIFIE DANS LA REQUÊTE, pas après : la jointure sur
 * `classes.teacher_id` fait que la connexion d'une autre classe n'existe tout
 * simplement pas pour ce professeur-ci.
 *
 * LE PRÉNOM EST DÉCHIFFRÉ ICI, comme partout ailleurs — il est rangé chiffré,
 * et c'est cette route qui a le droit de le lire.
 */
function handleTeacherConnexions(): void
{
    $teacher = requireTeacher();
    $body = jsonBody();
    $classId = (string) ($body['classId'] ?? '');

    $q = db()->prepare('SELECT id FROM classes WHERE id = ? AND teacher_id = ?');
    $q->execute([$classId, $teacher['id']]);
    if (!$q->fetch()) fail(404, 'class_not_found', 'Classe introuvable.');

    // UNE TABLE QUI N'EXISTE PAS N'EST PAS UNE PANNE : une base d'avant cette
    // version n'a pas encore migré, et l'écran doit dire « rien pour l'instant »
    // plutôt que « le serveur a refusé ».
    $lignes = [];
    try {
        $st = db()->prepare(
            'SELECT x.id, x.le, x.contexte, s.first_name
               FROM connexions x JOIN students s ON s.id = x.student_id
              WHERE x.class_id = ?
              ORDER BY x.le DESC, x.id DESC
              LIMIT 200'
        );
        $st->execute([$classId]);
        foreach ($st->fetchAll() as $l) {
            $lignes[] = [
                'id'       => $l['id'],
                'quand'    => $l['le'],
                'contexte' => (string) ($l['contexte'] ?? 'libre'),
                'prenom'   => dechiffrer($l['first_name']),
            ];
        }
    } catch (Throwable $t) { $lignes = []; }

    respond(['connexions' => $lignes]);
}

function handleTeacherSignalements(): void
{
    $teacher = requireTeacher();
    $body = jsonBody();
    $action = (string) ($body['action'] ?? 'list');

    // L'APPARTENANCE SE VÉRIFIE DANS LA REQUÊTE, PAS APRÈS. La jointure sur
    // `classes.teacher_id` fait que le signalement d'un autre professeur
    // n'existe tout simplement pas pour celui-ci — y compris quand il en donne
    // l'identifiant exact.
    $aLui = 'JOIN classes c ON c.id = s.class_id AND c.teacher_id = ?';

    if ($action === 'photo') {
        $st = db()->prepare("SELECT s.image FROM signalements s $aLui WHERE s.id = ?");
        $st->execute([$teacher['id'], (string) ($body['id'] ?? '')]);
        $l = $st->fetch() ?: null;
        if (!$l) fail(404, 'introuvable', 'Ce signalement n\'existe pas.');
        respond(['image' => dechiffrer($l['image'])]);
    }

    if ($action === 'traite' || $action === 'supprimer') {
        // DEUX REQUÊTES ET NON UNE : `UPDATE ... JOIN` ne s'écrit pas pareil en
        // SQLite et en MySQL, et ce dépôt sert les deux. On cherche d'abord ce
        // qui nous appartient, on agit ensuite sur ce qu'on a trouvé.
        $st = db()->prepare("SELECT s.id FROM signalements s $aLui WHERE s.id = ?");
        $st->execute([$teacher['id'], (string) ($body['id'] ?? '')]);
        $l = $st->fetch() ?: null;
        if (!$l) fail(404, 'introuvable', 'Ce signalement n\'existe pas.');
        if ($action === 'supprimer') {
            db()->prepare('DELETE FROM signalements WHERE id = ?')->execute([$l['id']]);
        } else {
            $vers = !empty($body['traite']) ? 1 : 0;
            db()->prepare('UPDATE signalements SET traite = ? WHERE id = ?')
                ->execute([$vers, $l['id']]);
        }
        respond(['ok' => true]);
    }

    $st = db()->prepare(
        "SELECT s.id, s.corps, s.contexte, s.traite, s.created_at, s.class_id,
                c.name AS classe, st.first_name,
                CASE WHEN s.image IS NULL THEN 0 ELSE 1 END AS aPhoto
         FROM signalements s $aLui
         LEFT JOIN students st ON st.id = s.student_id
         ORDER BY s.traite ASC, s.created_at DESC LIMIT 60"
    );
    $st->execute([$teacher['id']]);
    respond(['signalements' => array_map(function ($l) {
        // LE CONTEXTE EST RENDU DÉPLIÉ. Il est parti du client en JSON, il a été
        // rangé en JSON ; le renvoyer en chaîne obligerait l'écran du professeur
        // à le relire lui-même, et à décider quoi faire d'un JSON illisible —
        // une décision qui se prend mieux ici, une fois.
        $ctx = $l['contexte'] === null ? null : json_decode((string) dechiffrer($l['contexte']), true);
        return [
            'id' => $l['id'],
            'corps' => dechiffrer($l['corps']),
            'contexte' => is_array($ctx) ? $ctx : null,
            'classe' => $l['classe'],
            'classId' => $l['class_id'],
            'qui' => $l['first_name'] ? dechiffrer($l['first_name']) : null,
            'photo' => (bool) $l['aPhoto'],
            'traite' => (bool) $l['traite'],
            'quand' => $l['created_at'],
        ];
    }, $st->fetchAll())]);
}

/**
 * CRÉER UN SECOND PROFESSEUR.
 *
 * Rémy : « oui j'ai un compte admin mais pas un compte professeur, comment
 * j'ajoute un prof » — puis « que je puisse créer un professeur ».
 *
 * IL N'Y AVAIT AUCUN CHEMIN. `install.php` refuse de tourner une seconde fois
 * (et c'est bien : il fabriquerait une clé de chiffrement neuve, donc rendrait
 * la base illisible), `motdepasse.php` dépanne un compte mais n'en crée pas, et
 * `tools/admin.php` exige la ligne de commande — que l'hébergement mutualisé
 * d'un professeur n'offre pas.
 *
 * QUI A LE DROIT ? UN PROFESSEUR DÉJÀ EN PLACE, et c'est la seule règle qui
 * tienne sans inventer des rôles dont personne n'a besoin aujourd'hui. Le
 * premier compte naît à l'installation ; les suivants naissent de la main d'un
 * collègue qui est déjà entré. Il n'y a pas d'inscription libre : un serveur de
 * classe n'est pas un service en ligne, et une page qui crée des comptes sans
 * rien demander est une porte ouverte, pas une fonctionnalité.
 *
 * ET LES CLOISONS TIENNENT ENSUITE : le professeur créé ne voit que ses propres
 * classes, ne peut ni lire ni modifier celles des autres (voir la section
 * « Deux professeurs sur le même serveur » de `tools/testApi.php`). Créer un
 * collègue, ce n'est pas lui donner les clés de sa propre classe.
 */
function handleTeacherSignup(): void
{
    $parrain = requireTeacher();
    $body = jsonBody();
    $action = (string) ($body['action'] ?? 'create');

    // CRÉER ET RETIRER UN PROFESSEUR REGARDENT LE SERVEUR, PAS UNE CLASSE.
    //
    // C'était ouvert à tout professeur, donc sans fin : le collègue ajouté
    // hier ajoutait le compte de demain, qui ajoutait le suivant. Ces deux
    // gestes-là appartiennent à celui qui a installé le site — voir
    // `professeurFondateur`, qui le déduit du compte le plus ancien plutôt que
    // de l'écrire dans une colonne qui pourrait se désaccorder.
    //
    // LISTER RESTE OUVERT À TOUS, et c'est voulu : savoir qui d'autre travaille
    // sur ce serveur n'est pas un pouvoir, c'est une politesse.
    if (($action === 'create' || $action === 'remove') && !estLeFondateur($parrain)) {
        fail(403, 'pas_le_fondateur',
            "Seul le professeur qui a installé le site ajoute ou retire des comptes.");
    }

    // ── LISTER ────────────────────────────────────────────────────────────────
    //
    // On ne rend QUE ce qui s'affiche : le nom, l'adresse, la date d'arrivée et
    // le nombre de classes. Jamais l'empreinte du mot de passe — elle ne sert à
    // rien à l'écran, et ce qui ne sort pas ne fuit pas.
    if ($action === 'list') {
        $q = db()->query(
            'SELECT t.id, t.display_name, t.email, t.created_at,
                    (SELECT COUNT(*) FROM classes c WHERE c.teacher_id = t.id) AS classes
             FROM teachers t ORDER BY t.created_at'
        );
        $fondateur = professeurFondateur();
        respond([
            // L'ÉCRAN DOIT SAVOIR CE QU'IL PEUT OFFRIR. Montrer « + Ajouter un
            // professeur » à qui recevra un refus, c'est promettre pour rien.
            'vousEtesLeFondateur' => $fondateur !== null && $fondateur === $parrain['id'],
            'professeurs' => array_map(fn ($t) => [
            'id' => $t['id'],
            'nom' => $t['display_name'],
            'email' => $t['email'],
            'depuis' => instantDe($t['created_at']),
            'classes' => (int) $t['classes'],
            // « c'est vous » : l'écran doit pouvoir empêcher de se retirer
            // soi-même AVANT de faire le voyage jusqu'au serveur.
            'moi' => $t['id'] === $parrain['id'],
            'fondateur' => $t['id'] === $fondateur,
        ], $q->fetchAll())]);
    }

    // ── RETIRER ───────────────────────────────────────────────────────────────
    //
    // UNE PORTE QUI S'OUVRE DOIT POUVOIR SE REFERMER. Créer un collègue était
    // possible et le défaire ne l'était pas : la seule issue passait par la
    // ligne de commande, qu'un hébergement mutualisé n'offre pas. Un compte
    // créé par erreur — une adresse mal tapée — restait donc là pour toujours,
    // avec le droit d'en créer d'autres.
    if ($action === 'remove') {
        $id = (string) ($body['teacherId'] ?? '');
        if ($id === $parrain['id']) {
            fail(400, 'pas_soi_meme', 'On ne se retire pas soi-même : il faudrait '
                . 'qu\'un collègue le fasse.');
        }
        $q = db()->prepare('SELECT * FROM teachers WHERE id = ?');
        $q->execute([$id]);
        $qui = $q->fetch() ?: null;
        if (!$qui) fail(404, 'inconnu', "Ce professeur n'existe pas.");

        // ON NE VIDE JAMAIS LE SERVEUR DE SES PROFESSEURS. Il resterait des
        // classes et des élèves que plus personne ne pourrait ouvrir.
        if ((int) db()->query('SELECT COUNT(*) AS n FROM teachers')->fetch()['n'] <= 1) {
            fail(400, 'dernier', 'C\'est le dernier professeur du serveur.');
        }

        $s = db()->prepare('SELECT COUNT(*) AS n FROM classes WHERE teacher_id = ?');
        $s->execute([$id]);
        $combien = (int) ($s->fetch()['n'] ?? 0);

        // SES CLASSES NE DISPARAISSENT PAS AVEC LUI, SAUF SI ON LE DIT.
        //
        // C'est le cas d'un collègue qui part : on reprend ses classes, avec
        // les élèves et leur travail. Les effacer demande le mot écrit, comme
        // partout ailleurs — trente élèves et une année de travail ne partent
        // pas sur un clic.
        $quoi = (string) ($body['classes'] ?? 'reprendre');
        if ($combien && $quoi === 'effacer') {
            if (trim((string) ($body['confirmation'] ?? '')) !== 'EFFACER') {
                fail(400, 'confirmation', 'Écrivez EFFACER pour effacer ses '
                    . $combien . ' classe(s) et leurs élèves.');
            }
            db()->prepare('DELETE FROM classes WHERE teacher_id = ?')->execute([$id]);
        } elseif ($combien) {
            db()->prepare('UPDATE classes SET teacher_id = ? WHERE teacher_id = ?')
                ->execute([$parrain['id'], $id]);
        }
        // Ses parcours suivent ses classes : ils ne valent rien tout seuls, et
        // les laisser derrière ferait grossir la base d'objets sans propriétaire.
        db()->prepare('UPDATE paths SET teacher_id = ? WHERE teacher_id = ?')
            ->execute([$parrain['id'], $id]);
        db()->prepare('DELETE FROM teachers WHERE id = ?')->execute([$id]);

        respond(['ok' => true, 'dit' => $qui['display_name'] . ' a été retiré'
            . ($combien
                ? ($quoi === 'effacer'
                    ? ", avec ses $combien classe(s) et leurs élèves."
                    : " ; vous reprenez ses $combien classe(s).")
                : '.')]);
    }

    if ($action !== 'create') fail(400, 'bad_action', 'Action inconnue : ' . $action);

    // UNE IDENTITÉ NE SE CRÉE PAS À LA CHAÎNE. C'est la seule route du serveur
    // qui fabrique un compte, et c'était la seule sans limite de débit — /join,
    // /login, /sync et /teacher/login en ont toutes une.
    //
    // ELLE NE PORTE QUE SUR LA CRÉATION. Lister n'est qu'une lecture, et
    // retirer est déjà borné par le fondateur ; les compter ici aurait fermé la
    // porte au professeur qui range ses comptes de fin d'année.
    rateLimit('signup_' . ($_SERVER['REMOTE_ADDR'] ?? 'x'), 10);

    $nom = trim((string) ($body['displayName'] ?? ''));
    $email = mb_strtolower(trim((string) ($body['email'] ?? '')));
    $mdp = (string) ($body['password'] ?? '');

    if ($nom === '') fail(400, 'bad_name', 'Il faut un nom à afficher.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        fail(400, 'bad_email', "Cette adresse ne ressemble pas à une adresse de courriel.");
    }
    // DOUZE SIGNES, comme partout ailleurs dans ce logiciel. Ce mot de passe
    // ouvre l'administration ET l'espace professeur de l'application : il n'y
    // en a qu'un, il vaut la peine d'être long.
    if (mb_strlen($mdp) < 12) {
        fail(400, 'bad_password', 'Le mot de passe doit faire au moins douze caractères.');
    }

    // La comparaison est insensible à la casse : c'est ce qui avait enfermé
    // Rémy dehors quand il tapait son adresse avec une majuscule.
    $s = db()->prepare('SELECT id FROM teachers WHERE LOWER(email) = LOWER(?)');
    $s->execute([$email]);
    if ($s->fetch()) fail(409, 'deja_pris', 'Un professeur utilise déjà cette adresse.');

    $id = uuidv4();
    db()->prepare('INSERT INTO teachers (id, display_name, email, password_hash) VALUES (?, ?, ?, ?)')
        ->execute([$id, mb_substr($nom, 0, 80), $email, password_hash($mdp, PASSWORD_DEFAULT)]);

    respond(['ok' => true, 'teacherId' => $id,
             'dit' => $nom . ' peut maintenant se connecter avec ' . $email . '.',
             'parrain' => $parrain['display_name']]);
}

/**
 * AUTORISER LE SAUT D'UN EXERCICE, OU LE RETIRER DU PARCOURS.
 *
 * C'était le DERNIER geste de séance enfermé dans les pages d'administration :
 * tout le reste — la pause, la consigne, les mots, la liste, les codes — avait
 * sa route, celui-ci non. Un professeur qui voulait débloquer un élève coincé
 * devait donc quitter l'application et retaper son mot de passe, pour un geste
 * qui se fait en marchant dans les rangs.
 *
 * DEUX MODES, ET ILS NE DISENT PAS LA MÊME CHOSE :
 *   · `saut`   — l'exercice reste, un bouton « passer » apparaît. L'élève qui
 *                s'y casse les dents continue, et l'étape ne compte ni pour ni
 *                contre lui : elle n'a aucune tentative, donc aucun poids ;
 *   · `retire` — l'exercice sort du parcours. Personne ne le voit plus.
 *
 * L'un ou l'autre vise TOUTE LA CLASSE ou UN SEUL ÉLÈVE — c'est la
 * différenciation, et c'est le cas courant : « toi, tu peux sauter celui-là ».
 */
/**
 * LES RÉGLAGES DU SITE, EN LECTURE — sans jeton, pour tout le monde.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * POURQUOI PUBLIQUE. Le mode libre décide de ce que montre la PORTE D'ENTRÉE :
 * une quatrième porte « Explorer les exercices », ou non. Un visiteur qui
 * arrive n'a aucun jeton — il n'en aura un qu'après être entré. Une route
 * protégée ne pourrait donc jamais répondre à la seule question qu'on lui pose.
 *
 * CE QU'ELLE DIT, ET RIEN D'AUTRE. Un booléen. Elle ne révèle ni classe, ni
 * élève, ni professeur : savoir que le catalogue est ouvert, c'est exactement ce
 * qu'on apprend en regardant l'écran d'accueil.
 */
function handleReglages(): void
{
    respond(['reglages' => [
        'modeLibre' => lireReglage('site.modeLibre', '0') === '1',
        // L'INSCRIPTION LIBRE — « Rejoindre ma classe ». Publique pour la même
        // raison que le mode libre : elle décide d'une PORTE de l'écran
        // d'accueil, et un visiteur n'a pas encore de jeton pour la demander.
        'inscriptionLibre' => lireReglage('site.inscriptionLibre', '0') === '1',
        // LE SIGNALEMENT — « un bouton désactivable ou non qui permet à l'élève
        // d'envoyer un bug ». Public pour la même raison que les deux autres :
        // il décide d'un BOUTON de l'écran de l'élève, et l'application doit
        // savoir s'il faut le dessiner avant même d'avoir ouvert un exercice.
        // Savoir que le bouton existe n'apprend rien à personne ; c'est ce qu'on
        // voit en regardant l'écran.
        'signalement' => lireReglage('site.signalement', '0') === '1',
        // LE DÉCOR DU MOMENT — Rémy, au choix proposé : « Les deux : un
        // réglage global, et l'élève peut encore jouer. »
        //
        // PUBLIC POUR LA MÊME RAISON QUE LES TROIS AUTRES : il décide de
        // l'allure de l'écran de l'élève, et l'application doit le savoir
        // avant d'avoir ouvert quoi que ce soit. Savoir qu'on est en décor de
        // Noël n'apprend rien à personne — c'est ce qu'on voit en regardant.
        //
        // UN RÉGLAGE DE SITE ET NON DE SÉANCE, et c'est tout l'intérêt : il
        // s'applique aux séances DÉJÀ DONNÉES, sans en rouvrir aucune. C'est
        // ce que Rémy a demandé mot pour mot — « sans avoir à ouvrir chacune ».
        // Une séance qui impose son décor l'emporte quand même : voir
        // `decorDeLaSeance`.
        'decorDuMoment' => lireReglage('site.decorDuMoment', '') ?: '',
    ]]);
}

/**
 * LES RÉGLAGES DU SITE, EN ÉCRITURE — professeur exigé.
 *
 * Rémy : « le mode libre, mets-le en bouton dans ma zone prof (qui est admin
 * aussi du coup) ».
 *
 * TOUT PROFESSEUR PEUT LE CHANGER, et il faut le dire. C'est un réglage de
 * SITE, pas de classe : l'allumer ouvre le catalogue aux élèves de tout le
 * monde. Sur ce serveur-ci il n'y a qu'un professeur, et c'est lui l'admin —
 * mais le jour où il y en aura trois, ce bouton sera à trois mains. La vraie
 * réponse serait un rôle « fondateur », qui existe déjà pour les professeurs
 * (`vousEtesLeFondateur`) ; on ne l'impose pas ici parce que cela enfermerait
 * dehors un Rémy qui aurait créé son compte en second.
 */
function handleTeacherReglages(): void
{
    // `requireTeacher()` ET PAS `estLeFondateur()` : C'EST UN CHOIX, PAS UN OUBLI.
    //
    // Ces deux réglages sont des réglages de SITE, pas de classe. N'importe
    // quel professeur peut donc allumer `inscriptionLibre` pour tout le
    // serveur — et allumée, quiconque connaît un code de classe crée un élève
    // dedans, dans n'importe quelle classe.
    //
    // Un audit l'a signalé en septembre 2026 et la correction tient en une
    // ligne. Rémy a tranché de ne pas la poser : « mes tests seront que pour
    // moi et mes classes ». Un seul professeur sur ce serveur, donc aucun
    // risque, et la friction — appeler le fondateur pour allumer un réglage —
    // serait payée pour rien.
    //
    // CE QUI FAIT REVENIR LA QUESTION : le jour où `/teacher/signup` crée un
    // SECOND professeur. La décision vaut pour une installation à un seul
    // professeur, pas pour un établissement. Voir `docs/architecture.md` §11
    // bis avant de la reprendre dans un sens ou dans l'autre.
    requireTeacher();
    $body = jsonBody();
    if (array_key_exists('modeLibre', $body)) {
        ecrireReglage('site.modeLibre', $body['modeLibre'] ? '1' : '0');
    }
    if (array_key_exists('inscriptionLibre', $body)) {
        ecrireReglage('site.inscriptionLibre', $body['inscriptionLibre'] ? '1' : '0');
    }
    if (array_key_exists('signalement', $body)) {
        ecrireReglage('site.signalement', $body['signalement'] ? '1' : '0');
    }
    // LE DÉCOR DU MOMENT. La liste est écrite ICI et non reprise du navigateur :
    // un réglage qu'on accepte sans le lire est un réglage qui finit par porter
    // ce qu'un autre a voulu. Une valeur inconnue efface le décor plutôt que de
    // s'installer — « je ne sais pas » vaut mieux que « n'importe quoi ».
    if (array_key_exists('decorDuMoment', $body)) {
        $d = (string) $body['decorDuMoment'];
        $connus = ['noel', 'halloween', 'paques', 'robot'];
        ecrireReglage('site.decorDuMoment', in_array($d, $connus, true) ? $d : '');
    }
    respond(['ok' => true, 'reglages' => [
        'modeLibre' => lireReglage('site.modeLibre', '0') === '1',
        'inscriptionLibre' => lireReglage('site.inscriptionLibre', '0') === '1',
        'signalement' => lireReglage('site.signalement', '0') === '1',
        'decorDuMoment' => lireReglage('site.decorDuMoment', '') ?: '',
    ]]);
}

function handleTeacherOverride(): void
{
    $teacher = requireTeacher();
    $body = jsonBody();
    $classe = classeDuProf($teacher, $body);
    $action = (string) ($body['action'] ?? 'add');

    if ($action === 'cancel') {
        // RETIRER TOUT UN GENRE, SANS AVOIR À NOMMER CHAQUE LIGNE.
        //
        // « Je retire la calculatrice » est UN geste de fin d'exercice, et il ne
        // doit pas demander au professeur de retrouver les sept lignes qu'il a
        // posées — une pour la classe, six pour des élèves. Sans identifiant,
        // on supprime donc tout ce genre-là dans cette classe.
        if (($body['overrideId'] ?? '') === '' && ($body['mode'] ?? '') !== '') {
            $genre = (string) $body['mode'];
            $q = db()->prepare(
                'DELETE FROM overrides WHERE mode = ? AND (class_id = ? OR student_id IN
                 (SELECT id FROM students WHERE class_id = ?))'
            );
            $q->execute([$genre, $classe['id'], $classe['id']]);
            respond(['ok' => true, 'reglages' => overridesDeLaClasse($classe['id']),
                     'dit' => $genre === 'calculatrice'
                        ? 'La calculatrice est retirée.'
                        : 'Réglages retirés.']);
        }
        // On borne la suppression à NOS réglages : l'identifiant vient du
        // navigateur, donc de quelqu'un.
        $q = db()->prepare(
            'DELETE FROM overrides WHERE id = ? AND (class_id = ? OR student_id IN
             (SELECT id FROM students WHERE class_id = ?))'
        );
        $q->execute([(string) ($body['overrideId'] ?? ''), $classe['id'], $classe['id']]);
        respond(['ok' => true, 'dit' => 'Réglage retiré : l\'exercice redevient obligatoire.',
                 'reglages' => overridesDeLaClasse($classe['id'])]);
    }

    if ($action === 'list') {
        respond(['reglages' => overridesDeLaClasse($classe['id'])]);
    }

    // `*` N'EST PAS UN EXERCICE, C'EST « PARTOUT ».
    //
    // Rémy, sur la calculatrice : « pourrait-on autoriser dans les options
    // l'utilisation de la calculatrice ou le permettre en direct à un groupe ou
    // aux élèves », et il veut les deux portées — « les deux au choix ». Pour
    // cet exercice-ci, on nomme l'exercice ; pour toute l'heure, `*`. La table
    // n'a pas besoin d'une colonne de plus : elle dit déjà « ce réglage vaut
    // pour cet exercice », et `*` est l'exercice « tous ».
    $exo = trim((string) ($body['exerciseId'] ?? ''));
    if ($exo === '') fail(400, 'bad_exercise', 'Il faut désigner un exercice.');
    $mode = in_array($body['mode'] ?? 'saut', ['saut', 'retire', 'calculatrice'], true)
        ? (string) $body['mode'] : 'saut';
    // ── « TOUT DÉBLOQUER », MAIS POUR QUELQU'UN ──────────────────────────────
    //
    // RÉMY : « il faudrait aussi pouvoir mais seulement pour le direct
    // permettre de débloquer tous les exercices (et aussi au cas par cas pour
    // l'élève) quand on clique dessus », et, interrogé sur la portée : « Pour
    // la séance en cours ».
    //
    // LA GARDE D'ORIGINE RESTE, ET ELLE AVAIT RAISON : sauter tous les
    // exercices POUR LA CLASSE, ce n'est pas un réglage, c'est annuler la
    // séance — et cela se fait en la retirant, pas en la vidant. Un clic,
    // trente séances perdues.
    //
    // POUR UN ÉLÈVE NOMMÉ, c'est autre chose : c'est le geste qu'on fait
    // debout, à côté de lui, quand il est coincé et que l'heure avance. On
    // n'annule rien, on lui ouvre la route. La distinction est donc le
    // DESTINATAIRE, pas le mode.
    $pourDesEleves = !empty($body['studentIds']) || ($body['studentId'] ?? '') !== '';
    if ($exo === '*' && $mode !== 'calculatrice' && !$pourDesEleves) {
        fail(400, 'bad_exercise',
            'Tout débloquer d\'un coup ne s\'accorde qu\'à un élève : pour la classe, '
          . 'c\'est la séance qu\'il faut retirer.');
    }

    // UN GESTE, PLUSIEURS ÉLÈVES. Rémy : « on pourrait le donner que pour
    // certains élèves », « on pourrait sélectionner dans le direct ». Cocher
    // quatre noms puis attendre quatre allers-retours, c'est quatre occasions
    // qu'un seul échoue et que le professeur ne sache pas lesquels ont reçu.
    $ids = $body['studentIds'] ?? null;
    if (!is_array($ids)) $ids = [];
    $un = (string) ($body['studentId'] ?? '');
    if ($un !== '') $ids[] = $un;
    $ids = array_values(array_unique(array_filter(array_map('strval', $ids), fn ($i) => $i !== '')));
    if (count($ids) > 200) fail(400, 'too_many', 'Trop d\'élèves d\'un coup.');

    foreach ($ids as $id) {
        $q = db()->prepare('SELECT id FROM students WHERE id = ? AND class_id = ?');
        $q->execute([$id, $classe['id']]);
        if (!$q->fetch()) fail(404, 'student_not_found', 'Élève introuvable.');
    }

    // ON NE SUPERPOSE PAS DEUX FOIS LE MÊME RÉGLAGE : rappuyer sur le bouton
    // ajoutait une ligne de plus, invisible, et « retirer » n'en enlevait
    // qu'une. Le geste est donc idempotent.
    $vide = db()->prepare(
        'DELETE FROM overrides WHERE mode = ? AND exercise_id = ?
           AND (' . ($ids ? 'student_id = ?' : 'class_id = ?') . ')'
    );

    // ── LE SAUT EST UN GESTE DE L'HEURE, ET IL S'ÉTEINT AVEC ELLE ───────────
    //
    // RÉMY : « est ce possible si sur un parcours, j'ai autorisé à passer
    // l'exercice, sur un autre parcours, cette même exercice peut se passer
    // aussi ». Oui, c'était mesuré. Puis, le soir même, il s'est repris :
    // « attache le à la séance, pour le parcours on a déjà des sauts
    // optionnels ».
    //
    // ET IL A RAISON DEUX FOIS. D'abord parce qu'un parcours a DÉJÀ ses étapes
    // « non obligatoires », réglées en le construisant : rattacher la
    // permission au parcours aurait fait deux mécanismes pour une seule idée.
    // Ensuite parce que ce qu'il fait au direct n'est pas une propriété du
    // parcours : c'est « laisse tomber celui-là, on avance », dit à un élève
    // coincé, pendant CETTE heure.
    //
    // LE SERVEUR SAIT SEUL CE QU'EST « LA SÉANCE », et c'est pour cela qu'il
    // l'écrit lui-même plutôt que de le demander à l'écran : la séance imposée
    // porte une échéance que le navigateur ne lit pas, et elle peut tomber
    // entre le clic et la question suivante.
    //
    // DEUX ÉCHELLES, PARCE QU'IL Y A DEUX FAÇONS DE FINIR UNE SÉANCE :
    //   · on en impose une autre — `seance_id` ne correspond plus, la
    //     permission tombe ;
    //   · ou l'heure passe et personne ne touche à rien — `expire_le` la ferme
    //     à la fin de la journée scolaire, exactement comme la séance imposée.
    // Sans la seconde, une classe qui travaille sans séance imposée garderait
    // ses permissions pour toujours, ce qui était le défaut du départ.
    //
    // « RETIRER » NE S'ÉTEINT PAS, ET C'EST VOULU : c'est le geste du
    // professeur qui a constaté que l'exercice PLANTE. Il ne veut pas que
    // l'élève retombe dessus demain matin.
    // LA CALCULATRICE AUSSI, ET C'EST SA DEMANDE DU SOIR. « pour une séance
    // nouvelle, il faut réinitialiser les exercices que j'ai autorisé à
    // passer » — capture à l'appui, où trois vignettes se suivaient : deux
    // calculatrices « pour toute la séance » accordées un autre jour, et un
    // saut déjà mort. « Pour toute la séance » doit vouloir dire CETTE
    // séance ; sans échéance, la permission traversait les vacances.
    //
    // « RETIRER » NE S'ÉTEINT TOUJOURS PAS : c'est le geste du professeur qui
    // a constaté que l'exercice PLANTE, et il ne veut pas que l'élève retombe
    // dessus demain matin. Il reste dans la liste, avec sa croix pour
    // l'annuler.
    $deLHeure = $mode === 'saut' || $mode === 'calculatrice';
    $laSeance = $deLHeure ? imposeEncoreValide($classe) : null;
    $jusqua = $deLHeure ? finDeLaJourneeScolaire() : null;
    $insert = db()->prepare(
        'INSERT INTO overrides (id, class_id, student_id, exercise_id, mode, seance_id, expire_le)
         VALUES (?, ?, ?, ?, ?, ?, ?)');
    $court = mb_substr($exo, 0, 80);
    if ($ids) {
        foreach ($ids as $id) {
            $vide->execute([$mode, $court, $id]);
            $insert->execute([uuidv4(), null, $id, $court, $mode, $laSeance, $jusqua]);
        }
    } else {
        $vide->execute([$mode, $court, $classe['id']]);
        $insert->execute([uuidv4(), $classe['id'], null, $court, $mode, $laSeance, $jusqua]);
    }

    $aQui = $ids ? (count($ids) === 1 ? 'à cet élève' : 'à ' . count($ids) . ' élèves')
                 : 'à toute la classe';
    respond(['ok' => true, 'reglages' => overridesDeLaClasse($classe['id']),
             'dit' => $mode === 'retire'
                ? "L'exercice « $exo » est retiré du parcours."
                : ($mode === 'calculatrice'
                    ? ($exo === '*'
                        ? "La calculatrice est autorisée $aQui, pour toute la séance."
                        : "La calculatrice est autorisée $aQui, sur « $exo ».")
                    : "Le saut de « $exo » est autorisé : un bouton « passer » apparaîtra.")]);
}

/**
 * Les réglages d'exercice EN VIGUEUR dans cette classe, du plus récent au plus
 * ancien.
 *
 * EN VIGUEUR, ET NON « TOUS » : c'est la demande de Rémy, capture à l'appui —
 * « pour une séance nouvelle, il faut réinitialiser les exercices que j'ai
 * autorisé à passer ». Le serveur éteignait déjà ces permissions-là pour
 * l'élève (voir `reglageEnVigueur`), mais l'écran du professeur les listait
 * TOUTES : il lisait donc, sur la séance du jour, des vignettes qui ne
 * valaient plus rien, sans qu'aucune ne dise lesquelles. Les deux écrans
 * appellent maintenant la même règle.
 */
function overridesDeLaClasse(string $classeId): array
{
    $s = db()->prepare(
        'SELECT o.*, st.first_name FROM overrides o
         LEFT JOIN students st ON st.id = o.student_id
         WHERE o.class_id = ? OR o.student_id IN (SELECT id FROM students WHERE class_id = ?)
         ORDER BY o.created_at DESC'
    );
    $s->execute([$classeId, $classeId]);
    $q = db()->prepare('SELECT * FROM classes WHERE id = ?');
    $q->execute([$classeId]);
    $classe = $q->fetch() ?: [];
    $imposeId = $classe ? imposeEncoreValide($classe) : null;
    $vivants = array_filter($s->fetchAll(), fn ($o) => reglageEnVigueur($o, $imposeId));
    return array_map(fn ($o) => [
        'id' => $o['id'],
        'exerciseId' => $o['exercise_id'],
        'mode' => $o['mode'],
        'pour' => $o['student_id'] ? dechiffrer($o['first_name']) : null,
        // L'IDENTIFIANT, PAS SEULEMENT LE PRÉNOM. La fiche d'un élève doit
        // savoir si c'est LUI qui a la calculatrice — et il y a deux Lucas
        // dans la classe de Rémy. Un prénom ne désigne personne.
        'pourId' => $o['student_id'] ?: null,
        'quand' => instantDe($o['created_at']),
    ], array_values($vivants));
}

/**
 * LES REMISES À ZÉRO DEMANDÉES POUR CET ÉLÈVE.
 *
 * Une ligne par séance remise à zéro, avec l'heure. L'appareil de l'élève
 * oublie, dans son propre journal, tout ce qui concerne ce parcours et qui
 * précède cette heure — voir `appliquerLesOublis` côté navigateur.
 *
 * `le` EST RENDU EN MILLISECONDES, comme tout ce que le journal manipule. La
 * base garde un `datetime('now')` en UTC ; le navigateur, lui, ne connaît que
 * des horodatages. Convertir ICI évite que chaque lecteur s'en charge — et
 * qu'un seul l'oublie.
 */
function oublisDeLEleve(string $studentId): array
{
    $stmt = db()->prepare('SELECT path_id, le FROM reinitialisations WHERE student_id = ?
                           ORDER BY le ASC LIMIT 200');
    $stmt->execute([$studentId]);
    return array_map(fn($r) => [
        'pathId' => $r['path_id'],
        'le' => (int) (strtotime((string) $r['le'] . ' UTC') * 1000),
    ], $stmt->fetchAll());
}

function eventsOfStudent(string $studentId): array
{
    $stmt = db()->prepare('SELECT id, type, ts, device_id, payload FROM events WHERE student_id = ? ORDER BY ts ASC');
    $stmt->execute([$studentId]);
    return array_map(fn($r) => [
        'id' => $r['id'],
        'type' => $r['type'],
        'ts' => (int) $r['ts'],
        'deviceId' => $r['device_id'],
        'payload' => json_decode((string) dechiffrer($r['payload']), true) ?: [],
    ], $stmt->fetchAll());
}
