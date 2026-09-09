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
        // LA CONFIGURATION PEUT VIVRE AILLEURS QUE DANS `api/`.
        //
        // Deux usages, une seule ligne. D'abord l'hébergement prudent : poser
        // le fichier HORS de la racine web et l'indiquer par
        // `SetEnv ATOUTMATH_CONFIG /home/…/config.php` met le secret hors de
        // portée d'un serveur mal réglé, ceinture en plus des bretelles du
        // `.htaccess`. Ensuite les essais : `tools/testApi.php` fait tourner
        // l'API entière sur une base jetable sans toucher à l'installation
        // réelle — c'est ce qui permet de tester pour de bon avant de déployer.
        $path = getenv('ATOUTMATH_CONFIG') ?: __DIR__ . '/../config.php';
        if (!is_file($path)) {
            fail(500, 'config_missing', "Ouvrez api/install.php pour installer AtoutMath.");
        }
        $config = require $path;
    }
    return $config;
}

/**
 * DEUX MOTEURS, LE MÊME CODE : SQLite et MySQL.
 *
 * Rémy : « je réserverai l'espace web demain ». On ne sait pas ce que
 * l'hébergement offrira, et surtout : pour UNE classe et UNE séance, créer une
 * base MySQL, un utilisateur et un mot de passe est trois fois plus de travail
 * que le service rendu. SQLite est alors le bon choix — un fichier, rien à
 * administrer, et l'effacement des données tient en une suppression de fichier,
 * ce qui est exactement ce que Rémy veut pouvoir faire après sa séance.
 *
 * MySQL reste disponible et n'a rien perdu : c'est le même schéma, les mêmes
 * requêtes. On ne diverge que sur trois points, isolés ici — la façon de dire
 * « maintenant », celle d'ignorer un doublon, et le type d'une colonne.
 */
function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $c = config();
        try {
            if (dbPilote() === 'sqlite') {
                $pdo = new PDO('sqlite:' . $c['db_file'], null, null, [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                ]);
                // Les clés étrangères ne sont pas actives par défaut en SQLite,
                // et c'est d'elles que dépend l'effacement en cascade — donc le
                // « je détruirai la liste des élèves » de Rémy.
                $pdo->exec('PRAGMA foreign_keys = ON');
                // Le journal WAL : un élève qui écrit ne bloque pas le
                // professeur qui lit son tableau de bord pendant la séance.
                $pdo->exec('PRAGMA journal_mode = WAL');
                $pdo->exec('PRAGMA busy_timeout = 5000');
            } else {
                $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
                    $c['db_host'], $c['db_port'] ?? 3306, $c['db_name']);
                $pdo = new PDO($dsn, $c['db_user'], $c['db_pass'], [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]);
                // TOUT EN UTC, DES DEUX CÔTÉS. SQLite écrit `datetime('now')`,
                // qui est UTC ; MySQL écrit l'heure du serveur, qui ne l'est
                // pas forcément. Sans cette ligne, « vu il y a 3 min » se
                // trompait de deux heures sur un hébergement réglé à Paris —
                // et « en ligne » n'aurait jamais été vrai.
                $pdo->exec("SET time_zone = '+00:00'");
            }
        } catch (PDOException $e) {
            fail(500, 'db_unavailable', 'Base de données injoignable.');
        }
    }
    return $pdo;
}

/** « sqlite » ou « mysql ». Par défaut SQLite : rien à installer. */
function dbPilote(): string
{
    $c = config();
    return ($c['db_driver'] ?? 'sqlite') === 'mysql' ? 'mysql' : 'sqlite';
}

/** L'horodatage du moment, dans la syntaxe du moteur. */
function sqlMaintenant(): string
{
    return dbPilote() === 'sqlite' ? "datetime('now')" : 'NOW()';
}

/**
 * « Insère, et tais-toi si la ligne existe déjà. »
 *
 * C'est le cœur de l'idempotence de la synchro : le même événement renvoyé
 * deux fois ne doit rien casser. MySQL dit `INSERT IGNORE`, SQLite dit
 * `INSERT OR IGNORE` — la même chose, deux orthographes.
 */
function sqlInsereSansDoublon(): string
{
    return dbPilote() === 'sqlite' ? 'INSERT OR IGNORE' : 'INSERT IGNORE';
}

/**
 * « Insère, ou mets à jour la ligne qui existe déjà. »
 *
 * Sert à l'enregistrement d'un parcours : le professeur réenregistre le même
 * parcours dix fois pendant qu'il le construit, et c'est le même identifiant.
 * MySQL dit `ON DUPLICATE KEY UPDATE x = VALUES(x)`, SQLite dit
 * `ON CONFLICT(cle) DO UPDATE SET x = excluded.x`.
 */
function sqlSurConflit(string $cle, array $colonnes): string
{
    if (dbPilote() === 'sqlite') {
        $set = implode(', ', array_map(fn ($c) => "$c = excluded.$c", $colonnes));
        return "ON CONFLICT($cle) DO UPDATE SET $set";
    }
    $set = implode(', ', array_map(fn ($c) => "$c = VALUES($c)", $colonnes));
    return "ON DUPLICATE KEY UPDATE $set";
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
    // Le jeton se cherche dans `student_tokens` : un élève peut en avoir
    // plusieurs valides à la fois — l'ordinateur de l'école et celui de la
    // maison. Voir le commentaire de la table dans `schema.php`.
    $stmt = db()->prepare(
        'SELECT s.*, c.name AS class_name, c.join_code
         FROM student_tokens t
         JOIN students s ON s.id = t.student_id
         JOIN classes c ON c.id = s.class_id
         WHERE t.token_hash = ? LIMIT 1'
    );
    $stmt->execute([hashToken($token)]);
    $student = $stmt->fetch();
    if (!$student) {
        fail(401, 'bad_token', 'Jeton invalide.');
    }
    db()->prepare('UPDATE students SET last_seen_at = ' . sqlMaintenant() . ' WHERE id = ?')->execute([$student['id']]);
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
    // UN COMPTEUR PAR INSTALLATION, ET NON UN POUR TOUT LE SERVEUR.
    //
    // Le dossier était `atoutmath_rl` tout court, dans le répertoire temporaire
    // commun. Sur un hébergement mutualisé, deux installations d'AtoutMath —
    // ou la même relancée pour un essai — partagent ce répertoire : les
    // rattachements de l'une comptaient dans le quota de l'autre, et une classe
    // se voyait refuser l'entrée à cause du trafic d'un voisin. Mesuré en
    // lançant `tools/testApi.php` deux fois dans la même minute : la seconde
    // fois, plus personne ne pouvait se rattacher.
    //
    // Le secret de signature est propre à l'installation et n'a pas à se
    // montrer : on n'en garde qu'une empreinte courte, qui suffit à séparer.
    $tribu = substr(hash('sha256', (string) (config()['app_secret'] ?? '')), 0, 12);
    $dir = sys_get_temp_dir() . '/atoutmath_rl_' . $tribu;
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    // Un balayage de temps en temps : sans lui, ce dossier garde un fichier par
    // élève et par minute jusqu'à la fin des temps. Une chance sur cent, c'est
    // une fois par minute environ pour une classe entière.
    if (random_int(1, 100) === 1) {
        foreach (glob($dir . '/*') ?: [] as $vieux) {
            if (@filemtime($vieux) < time() - 3600) {
                @unlink($vieux);
            }
        }
    }
    $file = $dir . '/' . hash('sha256', $key) . '_' . date('YmdHi');
    $count = is_file($file) ? (int) file_get_contents($file) : 0;
    if ($count >= $maxPerMinute) {
        fail(429, 'rate_limited', 'Trop de requêtes, réessayez dans une minute.');
    }
    file_put_contents($file, (string) ($count + 1), LOCK_EX);
}
