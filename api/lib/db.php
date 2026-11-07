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
    // ON CHERCHE LE JETON À QUATRE ENDROITS, ET CE N'EST PAS DE LA PRUDENCE
    // EXCESSIVE : c'est le nombre d'endroits où Apache peut l'avoir rangé.
    //
    // Quand PHP tourne en CGI, FastCGI ou php-fpm — la quasi-totalité des
    // hébergements mutualisés —, Apache garde l'en-tête `Authorization` pour
    // son propre système d'authentification et ne le passe pas à PHP. Le
    // `.htaccess` de `api/` le recopie donc dans une variable d'environnement,
    // par deux chemins différents selon les modules disponibles ; l'un ressort
    // en `HTTP_AUTHORIZATION`, l'autre en `REDIRECT_HTTP_AUTHORIZATION`.
    //
    // CE QUE COÛTAIT L'OUBLI : on se connecte très bien — le mot de passe
    // voyage dans le corps de la requête —, on reçoit un jeton, et tout appel
    // suivant est refusé par 401. Le professeur lit « identifiez-vous » à la
    // seconde où il vient de s'identifier ; l'élève travaille et sa
    // synchronisation échoue sans un mot. Voir la sonde « l'en-tête
    // d'autorisation » de la page de Santé, qui le MESURE au lieu d'espérer.
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $auth = $headers['Authorization']
        ?? $headers['authorization']
        ?? ($_SERVER['HTTP_AUTHORIZATION']
        ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? ''));
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
    // ON REFERME LA LECTURE AVANT D'ÉCRIRE, et ce n'est pas de l'hygiène.
    //
    // Tant que le curseur reste ouvert, la connexion tient une lecture en
    // cours ; l'écriture qui suit doit alors la faire MONTER en écriture, et
    // SQLite refuse net — `SQLITE_BUSY_SNAPSHOT` — si une autre connexion a
    // écrit entre-temps, sans honorer `busy_timeout`. C'est la ligne exacte
    // qui tombait dans le journal quand trente élèves répondaient ensemble.
    $stmt->closeCursor();
    if (!$student) {
        fail(401, 'bad_token', 'Jeton invalide.');
    }
    // « VU À L'INSTANT » NE S'ÉCRIT PAS À CHAQUE REQUÊTE.
    //
    // C'était une écriture par requête et par élève — le battement de séance,
    // chaque réponse, chaque synchronisation. Trente élèves en classe, c'est
    // des centaines d'écritures par minute pour une donnée qui sert à dire
    // « vu il y a 3 min » : une précision à la seconde n'y change RIEN, et
    // c'est elle qui faisait la bousculade. Une fois toutes les vingt
    // secondes suffit, et le direct du professeur ne s'en aperçoit pas — il
    // bat lui-même toutes les dix.
    $vu = strtotime((string) ($student['last_seen_at'] ?? '') . ' UTC');
    if (!$vu || $vu < time() - 20) {
        ecrireMalgreLaRuee('UPDATE students SET last_seen_at = ' . sqlMaintenant()
            . ' WHERE id = ?', [$student['id']]);
    }
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

/**
 * LE PROFESSEUR FONDATEUR — celui qui a installé le site.
 *
 * Rémy : « Ce serait quoi idéalement pour toi, le modèle, un prof qui gère un
 * établissement, une équipe, on se répartit les classes ou quoi faire dans un
 * premier temps ».
 *
 * VOICI LE MODÈLE, ET IL TIENT EN UNE PHRASE : tous les professeurs sont égaux
 * DEVANT LEURS CLASSES — chacun ne voit que les siennes, personne ne touche à
 * celles d'un autre —, et UN SEUL est responsable de l'INSTALLATION.
 *
 * POURQUOI IL EN FAUT UN. Deux gestes ne concernent pas une classe mais le
 * serveur entier : créer ou retirer un compte de professeur, et ouvrir le
 * guichet des mises à jour — qui écrit des fichiers PHP, donc donne le site.
 * Les laisser à tout le monde, c'est n'avoir aucune porte : le collègue qu'on
 * ajoute aujourd'hui peut demain en ajouter dix, ou remplacer le logiciel.
 *
 * ON NE L'ÉCRIT PAS EN BASE, ON LE DÉDUIT : c'est le compte le plus ancien,
 * celui que `install.php` a créé — donc celui de la personne qui possède
 * l'hébergement. Rien à migrer, rien à régler, rien qui puisse se désaccorder
 * avec la réalité. Et il ne peut pas se perdre : on refuse de retirer le
 * dernier professeur, et seul le fondateur retire quelqu'un.
 */
function professeurFondateur(): ?string
{
    try {
        // `created_at` à la seconde ne départage pas deux comptes nés dans la
        // même : l'identifiant tranche, et il tranche toujours pareil.
        $q = db()->query('SELECT id FROM teachers ORDER BY created_at, id LIMIT 1');
        $id = $q->fetchColumn();
        return $id === false ? null : (string) $id;
    } catch (Throwable $t) {
        return null;
    }
}

/** Ce professeur est-il celui qui a installé le site ? */
function estLeFondateur(array $prof): bool
{
    $f = professeurFondateur();
    return $f !== null && $f === ($prof['id'] ?? null);
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
/**
 * Compter un essai, et dire si le quota de la minute est dépassé.
 *
 * SÉPARÉE DE `rateLimit` PARCE QU'IL Y A DEUX FAÇONS DE REFUSER. L'API répond
 * un 429 en JSON et s'arrête là ; l'administration, elle, est faite de pages
 * HTML ordinaires que Rémy ouvre depuis le fond de la classe — lui servir un
 * bloc JSON à la place de sa page de connexion, c'est le laisser devant un
 * écran qu'il ne peut pas lire. Une seule mécanique de comptage, deux façons
 * de le dire.
 */
function compterEtDepasse(string $key, int $maxPerMinute = 60): bool
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

    // LIRE, AJOUTER ET ÉCRIRE SOUS UN SEUL VERROU.
    //
    // La version d'avant lisait le compteur, décidait, puis écrivait —
    // `LOCK_EX` ne protégeait que l'écriture. Quarante requêtes lancées
    // ensemble lisent donc toutes la même valeur AVANT qu'aucune n'ait écrit,
    // et passent toutes. MESURÉ sur la page d'administration : quota de dix,
    // 24 essais passés sur 40 au lieu de 10.
    //
    // Ce n'est pas un détail de concurrence théorique : c'est exactement la
    // façon dont on force un mot de passe. On ouvre donc le fichier une fois,
    // on le verrouille, et on ne le lâche qu'après avoir écrit.
    $fh = @fopen($file, 'c+');
    if ($fh === false) {
        // Pas de compteur possible (disque plein, droits) : on laisse passer.
        // Enfermer toute une classe dehors parce qu'un fichier temporaire ne
        // s'ouvre pas serait un remède pire que le mal.
        return false;
    }
    try {
        if (!flock($fh, LOCK_EX)) {
            return false;
        }
        $count = (int) stream_get_contents($fh);
        if ($count >= $maxPerMinute) {
            return true;
        }
        rewind($fh);
        ftruncate($fh, 0);
        fwrite($fh, (string) ($count + 1));
        fflush($fh);
        return false;
    } finally {
        @flock($fh, LOCK_UN);
        @fclose($fh);
    }
}

/** La même chose, pour l'API : on refuse en JSON et l'on s'arrête. */
function rateLimit(string $key, int $maxPerMinute = 60): void
{
    if (compterEtDepasse($key, $maxPerMinute)) {
        fail(429, 'rate_limited', 'Trop de requêtes, réessayez dans une minute.');
    }
}

/**
 * EST-CE LA BOUSCULADE, OU UNE VRAIE ERREUR ?
 *
 * Les deux bases le disent avec leurs mots : SQLite « database is locked »,
 * MySQL « Lock wait timeout » ou « Deadlock found ». Dans les trois cas la
 * requête était BONNE — elle est seulement arrivée pendant qu'une autre
 * écrivait. C'est la seule famille d'échecs qu'on ait le droit de retenter.
 */
/**
 * UNE LIGNE, ET LE CURSEUR REFERMÉ DERRIÈRE SOI.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * C'EST LA MOITIÉ DE LA CORRECTION DU « podium incomplet » DE RÉMY, et la plus
 * contre-intuitive. Tant qu'une requête `SELECT` n'est pas refermée, la
 * connexion tient une LECTURE EN COURS. L'écriture qui suit doit alors la faire
 * monter en écriture — et SQLite refuse NET, `SQLITE_BUSY_SNAPSHOT`, si une
 * autre connexion a écrit entre-temps. `busy_timeout` n'y change rien : il fait
 * patienter une écriture qui attend un verrou, pas une lecture qui veut en
 * devenir une.
 *
 * MESURÉ : avec `ecrireMalgreLaRuee` et ses six essais, quatre scores sur
 * trente se perdaient encore — et ils se perdaient SIX FOIS CHACUN, parce que
 * la lecture restée ouverte était toujours là au sixième essai. Un réessai ne
 * peut rien contre un verrou qu'on tient soi-même.
 *
 * En PHP, une requête se referme quand on la détruit ou qu'on appelle
 * `closeCursor()`. Une variable locale qui vit jusqu'au bout de la fonction ne
 * se détruit pas : il faut le dire. D'où ce raccourci, pour que la bonne façon
 * soit aussi la plus courte à écrire.
 */
function lireUne(string $sql, array $valeurs = [])
{
    $s = db()->prepare($sql);
    $s->execute($valeurs);
    $ligne = $s->fetch();
    $s->closeCursor();
    return $ligne;
}

function estUneBousculade(Throwable $e): bool
{
    $dit = $e->getMessage();
    return str_contains($dit, 'database is locked')
        || str_contains($dit, 'database table is locked')
        || str_contains($dit, 'Lock wait timeout')
        || str_contains($dit, 'Deadlock found');
}

/**
 * ÉCRIRE MALGRÉ TRENTE ARDOISES QUI ÉCRIVENT EN MÊME TEMPS.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RÉMY, après avoir lancé le défi avec sa classe : « est ce normal que tous les
 * élèves n'aient pas eu le podium ? »
 *
 * NON, ET C'EST ICI QUE ÇA SE JOUAIT. `tools/trenteDUnCoup.mjs`, écrit pour
 * cette remarque, envoie trente scores DANS LA MÊME SECONDE — ce qu'aucune
 * autre mesure du dépôt ne faisait, parce que `testApi.php` interroge une
 * requête à la fois et que les sondes d'écran ouvrent un navigateur ou deux. Le
 * premier passage :
 *
 *     21 élèves sur 30 restés à la porte, 24 scores perdus,
 *     6 au classement, et dans le journal du serveur :
 *     PHP Fatal error: Uncaught PDOException: SQLSTATE[HY000]:
 *     General error: 5 database is locked
 *
 * `PRAGMA busy_timeout = 5000` ÉTAIT DÉJÀ POSÉ, et il ne suffit pas : il fait
 * patienter une écriture qui attend un verrou, mais PAS une lecture qui veut
 * DEVENIR une écriture alors qu'une autre connexion a écrit entre-temps.
 * SQLite rend alors `SQLITE_BUSY_SNAPSHOT` immédiatement, sans attendre une
 * seule milliseconde — et c'est très exactement ce que fait une requête
 * d'élève : elle lit son jeton, puis écrit `last_seen_at`.
 *
 * ON RETENTE DONC, COURT ET AVEC DU DÉSORDRE. Le désordre compte autant que
 * l'attente : trente ardoises qui patienteraient toutes 50 ms se retrouveraient
 * toutes 50 ms plus tard, et se bousculeraient de nouveau. Six essais, de 20 à
 * 360 ms, couvrent une classe entière ; au-delà c'est que la base a un vrai
 * problème, et on laisse l'erreur remonter plutôt que de faire attendre l'élève
 * sans fin.
 *
 * @param string $sql      la requête, avec ses points d'interrogation
 * @param array  $valeurs  ses valeurs
 * @return PDOStatement    la requête exécutée
 */
function ecrireMalgreLaRuee(string $sql, array $valeurs = []): PDOStatement
{
    $essais = 6;
    for ($n = 1; ; $n++) {
        try {
            $s = db()->prepare($sql);
            $s->execute($valeurs);
            return $s;
        } catch (PDOException $e) {
            if ($n >= $essais || !estUneBousculade($e)) {
                throw $e;
            }
            usleep(random_int(20000, 60000) * $n);
        }
    }
}
