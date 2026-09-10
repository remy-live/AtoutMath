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
 *   POST /teacher/signup       créer un second professeur (par le premier)
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

applyCors();

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/');
$route = '/' . trim(substr($path, strlen($base)), '/');

switch ($route) {
    case '/join':            handleJoin(); break;
    case '/login':           handleLogin(); break;
    case '/sync':            handleSync(); break;
    case '/session':         handleSession(); break;
    case '/messages/read':   handleMessagesRead(); break;
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

    rateLimit('join_' . ($_SERVER['REMOTE_ADDR'] ?? 'x'), 20);

    if ($code === '' || $name === '') {
        fail(400, 'missing_fields', 'Code de classe et prénom obligatoires.');
    }
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

    rateLimit('login_eleve_' . ($_SERVER['REMOTE_ADDR'] ?? 'x'), 30);

    if ($login === '' || $code === '') {
        fail(400, 'missing_fields', 'Identifiant et code obligatoires.');
    }

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

    respond([
        'studentId' => $student['id'],
        'token' => $token,
        'classCode' => $student['join_code'],
        'className' => $student['class_name'],
        'firstName' => dechiffrer($student['first_name']),
        'session' => etatDeSeance($student),
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
    respond(['session' => etatDeSeance($student)]);
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
        'SELECT a.id, a.due_at, p.id AS path_id, p.name, p.data
         FROM assignments a JOIN paths p ON p.id = a.path_id
         WHERE a.class_id = ? OR a.student_id = ?
         ORDER BY a.created_at DESC LIMIT 20'
    );
    $stmt->execute([$student['class_id'], $student['id']]);
    return array_map(fn($r) => [
        'assignmentId' => $r['id'],
        'pathId' => $r['path_id'],
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

    if (($body['action'] ?? 'list') === 'save') {
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

        db()->prepare(
            'INSERT INTO paths (id, teacher_id, name, data) VALUES (?, ?, ?, ?) '
            . sqlSurConflit('id', ['name', 'data'])
        )->execute([$id, $teacher['id'], $path['name'], json_encode($path, JSON_UNESCAPED_UNICODE)]);
        respond(['pathId' => $id]);
    }

    $stmt = db()->prepare('SELECT id, name, data, updated_at FROM paths WHERE teacher_id = ? ORDER BY updated_at DESC');
    $stmt->execute([$teacher['id']]);
    respond(['paths' => array_map(fn($r) => $r + ['data' => json_decode($r['data'], true)], $stmt->fetchAll())]);
}

function handleTeacherAssign(): void
{
    $teacher = requireTeacher();
    $body = jsonBody();
    $pathId = (string) ($body['pathId'] ?? '');
    $classId = $body['classId'] ?? null;

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

    db()->prepare('INSERT INTO assignments (id, path_id, class_id, student_id, due_at) VALUES (?, ?, ?, ?, ?)')
        ->execute([uuidv4(), $pathId, $classId ?: null, $studentId ?: null, $body['dueAt'] ?? null]);

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

        $rows[] = [
            'studentId' => $s['id'],
            'firstName' => $s['first_name'],
            'lastSeenAt' => $s['last_seen_at'],
            'totalQuestions' => count($attempts),
            'successRate' => count($attempts)
                ? round(count(array_filter($attempts, fn($a) => !empty($a['correct']))) / count($attempts), 3)
                : null,
            'timeSeconds' => timeOf($events),
            'openErrors' => count(openErrorsOf($events)),
            'weakSkills' => array_map(fn($m) => ['skillId' => $m['skillId'], 'mastery' => $m['mastery'], 'level' => $m['level']], $weak),
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

    if ($action === 'notice') {
        $mot = trim((string) ($body['notice'] ?? ''));
        db()->prepare('UPDATE classes SET notice = ? WHERE id = ?')
            ->execute([$mot !== '' ? mb_substr($mot, 0, 300) : null, $classe['id']]);
        respond(['ok' => true, 'dit' => $mot === ''
            ? 'Consigne retirée.' : 'Consigne affichée à toute la classe.']);
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

    if ($action === 'code') {
        if (!nouveauCodePourEleve((string) ($body['studentId'] ?? ''), $classe['id'])) {
            fail(404, 'student_not_found', 'Élève introuvable.');
        }
        respond(['ok' => true, 'dit' => "Nouveau code tiré. L'ancien billet ne vaut plus rien.",
                 'eleves' => rosterLisible($classe['id'])]);
    }

    if ($action === 'codes') {
        $commun = trim((string) ($body['codeCommun'] ?? ''));
        if ($commun !== '' && !preg_match('/^[A-Za-z0-9]{3,12}$/', $commun)) {
            fail(400, 'bad_code', 'Le code commun doit faire de 3 à 12 lettres ou chiffres.');
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
        'vu' => $e['last_seen_at'] ? (int) $e['last_seen_at'] : null,
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

    $rangs = [];
    foreach (elevesDeLaClasse($classe['id']) as $e) {
        $a = derniereActivite($e['id']);
        $rangs[] = [
            'id' => $e['id'],
            'prenom' => $e['first_name'],
            'vu' => $e['last_seen_at'] ? (int) $e['last_seen_at'] : null,
            'ecarte' => !empty($e['blocked']),
            'exo' => $a['exo'],
            'parcours' => $a['parcours'],
            'justes' => $a['justes'],
            'total' => $a['total'],
            'quand' => $a['quand'],
        ];
    }
    respond([
        'classe' => ['id' => $classe['id'], 'name' => $classe['name'],
                     'locked' => (bool) $classe['locked'], 'notice' => $classe['notice']],
        // L'HEURE DU SERVEUR, ET NON CELLE DU NAVIGATEUR. « en ligne » se
        // décide en comparant deux instants ; s'ils viennent de deux horloges
        // différentes, une tablette mal réglée fait disparaître toute la classe.
        'maintenant' => time(),
        'eleves' => $rangs,
    ]);
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
            'pour' => $m['student_id'] ? dechiffrer($m['first_name']) : null,
            'lus' => (int) $m['lus'],
            'quand' => $m['created_at'],
        ], $s->fetchAll())]);
    }

    $corps = trim((string) ($body['body'] ?? ''));
    if ($corps === '') fail(400, 'vide', 'Le mot est vide.');
    $pour = (string) ($body['studentId'] ?? '');

    if ($pour === '') {
        db()->prepare('INSERT INTO messages (id, class_id, body) VALUES (?, ?, ?)')
            ->execute([uuidv4(), $classe['id'], chiffrer(mb_substr($corps, 0, 500))]);
        respond(['ok' => true, 'dit' => 'Mot envoyé à toute la classe.']);
    }

    // L'identifiant vient du navigateur : on vérifie que l'élève est bien de
    // cette classe avant de lui écrire.
    $s = db()->prepare('SELECT first_name FROM students WHERE id = ? AND class_id = ?');
    $s->execute([$pour, $classe['id']]);
    $eleve = $s->fetch() ?: null;
    if (!$eleve) fail(404, 'student_not_found', 'Élève introuvable.');
    db()->prepare('INSERT INTO messages (id, student_id, body) VALUES (?, ?, ?)')
        ->execute([uuidv4(), $pour, chiffrer(mb_substr($corps, 0, 500))]);
    respond(['ok' => true, 'dit' => 'Mot envoyé à ' . dechiffrer($eleve['first_name']) . '.']);
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
