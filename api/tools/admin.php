<?php
declare(strict_types=1);

/**
 * Outils d'administration, à exécuter en ligne de commande uniquement.
 *
 *   php api/tools/admin.php create-teacher "Nom Prénom" prof@exemple.fr motdepasse
 *   php api/tools/admin.php purge                 (applique retention_days)
 *   php api/tools/admin.php export-class 6A2X9K   (export CSV des notes)
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("Cet outil ne s'exécute qu'en ligne de commande.\n");
}

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/projections.php';
require_once __DIR__ . '/../lib/grading.php';

$command = $argv[1] ?? '';

switch ($command) {
    case 'create-teacher':
        $name = $argv[2] ?? null;
        $email = $argv[3] ?? null;
        $password = $argv[4] ?? null;
        if (!$name || !$email || !$password) {
            exit("Usage : create-teacher \"Nom\" email motdepasse\n");
        }
        if (strlen($password) < 10) {
            exit("Mot de passe trop court (10 caractères minimum).\n");
        }
        $id = uuidv4();
        db()->prepare('INSERT INTO teachers (id, display_name, email, password_hash) VALUES (?, ?, ?, ?)')
            ->execute([$id, $name, $email, password_hash($password, PASSWORD_DEFAULT)]);
        echo "Professeur créé : $id\n";
        break;

    case 'purge':
        // Obligation de limitation de conservation : au-delà du délai
        // configuré, les événements sont supprimés définitivement.
        $days = (int) (config()['retention_days'] ?? 0);
        if ($days <= 0) {
            exit("Purge désactivée (retention_days = 0).\n");
        }
        $cutoff = (int) ((time() - $days * 86400) * 1000);
        $stmt = db()->prepare('DELETE FROM events WHERE ts < ?');
        $stmt->execute([$cutoff]);
        echo "Purge : {$stmt->rowCount()} événement(s) supprimé(s) (> $days jours).\n";
        break;

    case 'export-class':
        $code = strtoupper($argv[2] ?? '');
        $stmt = db()->prepare('SELECT * FROM classes WHERE join_code = ?');
        $stmt->execute([$code]);
        $class = $stmt->fetch();
        if (!$class) exit("Classe introuvable.\n");

        $stmt = db()->prepare('SELECT id, first_name FROM students WHERE class_id = ? ORDER BY first_name');
        $stmt->execute([$class['id']]);

        $out = fopen('php://output', 'w');
        fputcsv($out, ['Prénom', 'Parcours', 'Date', 'Note', 'Sur', 'Questions', 'Réussies']);
        foreach ($stmt->fetchAll() as $s) {
            $ev = db()->prepare('SELECT id, type, ts, payload FROM events WHERE student_id = ? ORDER BY ts');
            $ev->execute([$s['id']]);
            $events = array_map(fn($r) => [
                'id' => $r['id'], 'type' => $r['type'], 'ts' => (int) $r['ts'],
                'payload' => json_decode($r['payload'], true) ?: [],
            ], $ev->fetchAll());

            foreach (runsOf($events) as $run) {
                if (!$run['finishedAt'] || $run['aborted']) continue;
                $b = gradeRun($run);
                if ($b['note'] === null) continue;
                fputcsv($out, [
                    $s['first_name'], $b['pathName'],
                    date('Y-m-d', (int) ($run['finishedAt'] / 1000)),
                    $b['note'], $b['sur'], $b['totalQuestions'], $b['totalReussies'],
                ]);
            }
        }
        fclose($out);
        break;

    default:
        echo "Commandes : create-teacher, purge, export-class\n";
}
