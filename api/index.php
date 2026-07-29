<?php
declare(strict_types=1);

/**
 * API AtoutMath — routeur unique.
 *
 * Surface volontairement réduite :
 *
 *   POST /join                 rattacher un appareil à une classe (élève)
 *   POST /sync                 pousser/tirer des événements (élève)
 *   POST /teacher/login        connexion professeur
 *   POST /teacher/classes      créer/lister des classes
 *   POST /teacher/paths        enregistrer/lister des parcours
 *   POST /teacher/assign       assigner un parcours à une classe
 *   POST /teacher/report       bilan d'une classe (notes recalculées)
 *   POST /teacher/student      détail d'un élève
 *
 * Tout est en POST/JSON pour éviter la mise en cache intempestive des GET par
 * les proxys d'établissement, fréquents en milieu scolaire.
 */

require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/projections.php';
require_once __DIR__ . '/lib/grading.php';

applyCors();

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/');
$route = '/' . trim(substr($path, strlen($base)), '/');

switch ($route) {
    case '/join':            handleJoin(); break;
    case '/sync':            handleSync(); break;
    case '/teacher/login':   handleTeacherLogin(); break;
    case '/teacher/classes': handleTeacherClasses(); break;
    case '/teacher/paths':   handleTeacherPaths(); break;
    case '/teacher/assign':  handleTeacherAssign(); break;
    case '/teacher/report':  handleTeacherReport(); break;
    case '/teacher/student': handleTeacherStudent(); break;
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

    $stmt = db()->prepare('SELECT * FROM students WHERE class_id = ? AND first_name = ? LIMIT 1');
    $stmt->execute([$class['id'], $name]);
    $student = $stmt->fetch();

    $token = newToken();
    if ($student) {
        db()->prepare('UPDATE students SET token_hash = ?, last_seen_at = NOW() WHERE id = ?')
            ->execute([hashToken($token), $student['id']]);
        $studentId = $student['id'];
    } else {
        $studentId = uuidv4();
        db()->prepare('INSERT INTO students (id, class_id, first_name, token_hash) VALUES (?, ?, ?, ?)')
            ->execute([$studentId, $class['id'], $name, hashToken($token)]);
    }

    respond([
        'studentId' => $studentId,
        'token' => $token,
        'classCode' => $class['join_code'],
        'className' => $class['name'],
    ]);
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
            'INSERT IGNORE INTO events (id, student_id, device_id, type, ts, payload) VALUES (?, ?, ?, ?, ?, ?)'
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
                json_encode($e['payload'] ?? [], JSON_UNESCAPED_UNICODE),
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
            'payload' => json_decode($row['payload'], true) ?: [],
        ];
    }

    respond([
        'accepted' => $accepted,
        'events' => $events,
        'cursor' => $maxSeq,
        'assignments' => assignmentsFor($student),
        'serverTs' => (int) (microtime(true) * 1000),
    ]);
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

    $stmt = db()->prepare('SELECT * FROM teachers WHERE email = ? LIMIT 1');
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

    if (($body['action'] ?? 'list') === 'create') {
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
    }

    $stmt = db()->prepare(
        'SELECT c.*, (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) AS student_count
         FROM classes c WHERE c.teacher_id = ? ORDER BY c.created_at DESC'
    );
    $stmt->execute([$teacher['id']]);
    respond(['classes' => $stmt->fetchAll()]);
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
        db()->prepare(
            'INSERT INTO paths (id, teacher_id, name, data) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE name = VALUES(name), data = VALUES(data)'
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

    db()->prepare('INSERT INTO assignments (id, path_id, class_id, student_id, due_at) VALUES (?, ?, ?, ?, ?)')
        ->execute([uuidv4(), $pathId, $classId, $body['studentId'] ?? null, $body['dueAt'] ?? null]);

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

    $stmt = db()->prepare('SELECT id, first_name, last_seen_at FROM students WHERE class_id = ? ORDER BY first_name');
    $stmt->execute([$classId]);
    $students = $stmt->fetchAll();

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
    $student = $stmt->fetch();
    if (!$student) fail(404, 'student_not_found', 'Élève introuvable.');

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

function eventsOfStudent(string $studentId): array
{
    $stmt = db()->prepare('SELECT id, type, ts, device_id, payload FROM events WHERE student_id = ? ORDER BY ts ASC');
    $stmt->execute([$studentId]);
    return array_map(fn($r) => [
        'id' => $r['id'],
        'type' => $r['type'],
        'ts' => (int) $r['ts'],
        'deviceId' => $r['device_id'],
        'payload' => json_decode($r['payload'], true) ?: [],
    ], $stmt->fetchAll());
}
