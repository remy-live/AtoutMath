<?php
declare(strict_types=1);

/**
 * Connexion PDO et utilitaires HTTP.
 *
 * Volontairement sans framework : l'API se résume à quelques points d'entrée
 * JSON. Toutes les requêtes passent par des requêtes préparées ; aucune valeur
 * venant du client n'est concaténée dans du SQL.
 */

function config(): array
{
    static $config = null;
    if ($config === null) {
        $path = __DIR__ . '/../config.php';
        if (!is_file($path)) {
            fail(500, 'config_missing', "Copiez api/config.example.php vers api/config.php.");
        }
        $config = require $path;
    }
    return $config;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $c = config();
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $c['db_host'], $c['db_port'] ?? 3306, $c['db_name']);
        try {
            $pdo = new PDO($dsn, $c['db_user'], $c['db_pass'], [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            fail(500, 'db_unavailable', 'Base de données injoignable.');
        }
    }
    return $pdo;
}

function uuidv4(): string
{
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

/** Code de classe dictable : ni 0/O ni 1/I. */
function joinCode(int $length = 6): string
{
    $alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    $out = '';
    for ($i = 0; $i < $length; $i++) {
        $out .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    }
    return $out;
}

function jsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        fail(400, 'bad_json', 'Corps de requête JSON invalide.');
    }
    return $data;
}

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(int $status, string $code, string $message): void
{
    respond(['error' => $code, 'message' => $message], $status);
}

/** Jeton opaque : envoyé une fois au client, stocké haché côté serveur. */
function newToken(): string
{
    return bin2hex(random_bytes(32));
}

function hashToken(string $token): string
{
    return hash('sha256', $token);
}

function bearerToken(): ?string
{
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
    if (preg_match('/^Bearer\s+(\S+)$/i', (string) $auth, $m)) {
        return $m[1];
    }
    return null;
}

/** Élève authentifié par son jeton, ou 401. */
function requireStudent(): array
{
    $token = bearerToken();
    if ($token === null) {
        fail(401, 'no_token', 'Jeton manquant.');
    }
    $stmt = db()->prepare(
        'SELECT s.*, c.name AS class_name, c.join_code
         FROM students s JOIN classes c ON c.id = s.class_id
         WHERE s.token_hash = ? LIMIT 1'
    );
    $stmt->execute([hashToken($token)]);
    $student = $stmt->fetch();
    if (!$student) {
        fail(401, 'bad_token', 'Jeton invalide.');
    }
    db()->prepare('UPDATE students SET last_seen_at = NOW() WHERE id = ?')->execute([$student['id']]);
    return $student;
}

function requireTeacher(): array
{
    $token = bearerToken();
    if ($token === null) {
        fail(401, 'no_token', 'Jeton manquant.');
    }
    $stmt = db()->prepare('SELECT * FROM teachers WHERE password_hash IS NOT NULL AND id = ?');
    // Le jeton professeur encode l'identifiant : id.signature
    $parts = explode('.', $token, 2);
    if (count($parts) !== 2 || !hash_equals(signTeacher($parts[0]), $parts[1])) {
        fail(401, 'bad_token', 'Jeton invalide.');
    }
    $stmt->execute([$parts[0]]);
    $teacher = $stmt->fetch();
    if (!$teacher) {
        fail(401, 'bad_token', 'Jeton invalide.');
    }
    return $teacher;
}

function signTeacher(string $teacherId): string
{
    return hash_hmac('sha256', $teacherId, config()['app_secret']);
}

function applyCors(): void
{
    $origins = config()['allowed_origins'] ?? [];
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && in_array($origin, $origins, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
        header('Access-Control-Max-Age: 86400');
    }
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/**
 * Limitation de débit rudimentaire, par élève et par minute. Suffisant pour
 * empêcher qu'un client en boucle sature la base ; à remplacer par une vraie
 * solution si l'usage grandit.
 */
function rateLimit(string $key, int $maxPerMinute = 60): void
{
    $dir = sys_get_temp_dir() . '/atoutmath_rl';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    $file = $dir . '/' . hash('sha256', $key) . '_' . date('YmdHi');
    $count = is_file($file) ? (int) file_get_contents($file) : 0;
    if ($count >= $maxPerMinute) {
        fail(429, 'rate_limited', 'Trop de requêtes, réessayez dans une minute.');
    }
    file_put_contents($file, (string) ($count + 1), LOCK_EX);
}
