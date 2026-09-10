<?php
declare(strict_types=1);

/**
 * UN SITE ATOUTMATH COMPLET, JETABLE, POUR L'ESSAI DE BOUT EN BOUT.
 *
 * L'application ET son API sur le même serveur — donc la même origine, comme
 * chez Rémy —, une base SQLite neuve, un professeur, une classe déjà peuplée
 * et quelques événements pour que le direct ait quelque chose à montrer.
 *
 * POURQUOI UN SEUL SERVEUR PHP POUR LES DEUX. Le serveur intégré de PHP sert
 * les fichiers statiques ET exécute `api/*.php` : c'est exactement la
 * disposition d'un hébergement mutualisé, et c'est la seule qui permette à
 * l'application de déduire l'adresse de son API comme elle le fait en vrai
 * (`adresseApiDeduite`). Servir l'un sur un port et l'autre sur un autre
 * mesurerait un montage qui n'existe nulle part.
 *
 * RIEN N'EST TOUCHÉ DANS `api/` : la configuration jetable est passée par la
 * variable d'environnement `ATOUTMATH_CONFIG`, comme dans `tools/testApi.php`.
 *
 * Usage :  php tools/siteEssai.php [port]
 * Il écrit une ligne JSON (port, bac, identifiants) puis attend qu'on le tue.
 */

$RACINE = dirname(__DIR__);
$PORT   = (int) ($argv[1] ?? 8456);
$BAC    = sys_get_temp_dir() . '/atoutmath-site-' . bin2hex(random_bytes(4));

@mkdir($BAC, 0700, true);
$CONFIG = $BAC . '/config.php';
file_put_contents($CONFIG, "<?php\nreturn " . var_export([
    'db_driver' => 'sqlite', 'db_file' => $BAC . '/essai.sqlite',
    'app_secret' => bin2hex(random_bytes(32)), 'data_key' => bin2hex(random_bytes(32)),
    'allowed_origins' => [], 'retention_days' => 30,
], true) . ";\n");
putenv('ATOUTMATH_CONFIG=' . $CONFIG);

require_once $RACINE . '/api/lib/schema.php';
require_once $RACINE . '/api/lib/eleves.php';
migrer();

$prof = uuidv4();
db()->prepare('INSERT INTO teachers (id, display_name, email, password_hash) VALUES (?,?,?,?)')
    ->execute([$prof, 'Rémy Devoddere', 'remy@essai.test',
               password_hash('motdepassetreslong', PASSWORD_DEFAULT)]);

// Une classe déjà peuplée, pour que l'écran ait quelque chose à montrer.
$classe = uuidv4();
db()->prepare('INSERT INTO classes (id, teacher_id, name, join_code, level) VALUES (?,?,?,?,?)')
    ->execute([$classe, $prof, '6e B', 'K3M7PQ', '6e']);
importerListe("DUPONT;Emma\nNGUYÊN;Maëlle\nBernard Tom;tom.b;7777\nMARTIN;Lucas\nPETIT;Zoé\n",
    $classe, $prof);

// Un élève entré par le code de la classe, sans billet : c'est le cas que
// l'écran doit savoir montrer à part.
$sans = uuidv4();
db()->prepare('INSERT INTO students (id, class_id, first_name, first_name_key, token_hash, last_seen_at)
               VALUES (?,?,?,?,?,?)')
    ->execute([$sans, $classe, chiffrer('Noé Sansliste'), empreintePrenom('Noé Sansliste'),
               hash('sha256', uuidv4()), time() - 20]);

// Deux élèves « en ligne », et un événement pour chacun : le direct doit dire
// sur quoi ils sont.
$s = db()->prepare('SELECT id FROM students WHERE class_id = ? LIMIT 2');
$s->execute([$classe]);
$seq = 1;
foreach ($s->fetchAll() as $i => $e) {
    db()->prepare('UPDATE students SET last_seen_at = ? WHERE id = ?')
        ->execute([time() - ($i * 10), $e['id']]);
    foreach ([true, true, false, true] as $k => $juste) {
        db()->prepare('INSERT INTO events (id, student_id, device_id, type, ts, seq, payload)
                       VALUES (?,?,?,?,?,?,?)')
            ->execute([uuidv4(), $e['id'], 'essai', 'attempt', time() - 60 + $k, $seq++,
                       chiffrer(json_encode(['exerciseId' => 'calc-add', 'correct' => $juste,
                                             'pathName' => 'Devoir de lundi']))]);
    }
}

// Une seconde classe, vide : la grille doit en montrer deux.
$c2 = uuidv4();
db()->prepare('INSERT INTO classes (id, teacher_id, name, join_code, level) VALUES (?,?,?,?,?)')
    ->execute([$c2, $prof, '5e A', 'W8DT4N', '5e']);

$serveur = proc_open(
    [PHP_BINARY, '-S', "127.0.0.1:$PORT", '-t', $RACINE],
    [1 => ['file', $BAC . '/log', 'a'], 2 => ['file', $BAC . '/log', 'a']], $t, $RACINE,
    ['ATOUTMATH_CONFIG' => $CONFIG, 'PATH' => getenv('PATH') ?: '/usr/bin:/bin',
     'PHP_CLI_SERVER_WORKERS' => '4']);

for ($i = 0; $i < 100; $i++) {
    $c = @fsockopen('127.0.0.1', $PORT, $e, $m, .2);
    if ($c) { fclose($c); break; }
    usleep(60000);
}

echo json_encode([
    'port' => $PORT, 'bac' => $BAC, 'classe' => $classe,
    'email' => 'remy@essai.test', 'mdp' => 'motdepassetreslong',
], JSON_UNESCAPED_UNICODE) . "\n";
flush();

// On tient tant qu'on ne nous tue pas.
while (true) { sleep(3600); }
