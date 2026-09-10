<?php
declare(strict_types=1);

/**
 * L'ESSAI DE BOUT EN BOUT DU SERVEUR.
 *
 *     php tools/testApi.php
 *
 * Rémy : « Il faut que tu vérifies et teste tout cela, que tout soit prêt,
 * parfait, contrôlable, facile. Je réserverai l'espace web demain. »
 *
 * CE QUE CE FICHIER FAIT, ET POURQUOI IL EXISTE.
 *
 * Le reste du logiciel est vérifié par `npm test` — mais `npm test` fait
 * tourner du JavaScript, et rien de tout cela n'existe côté serveur : les
 * pages d'administration sont du PHP qui parle à une base. Une page qui
 * s'affiche sans erreur ne prouve rien du tout ; ce qu'il faut prouver, c'est
 * que LE GESTE DU PROFESSEUR ARRIVE JUSQU'À L'ÉLÈVE. Verrouiller la classe →
 * l'élève le voit. Envoyer un mot → l'élève le reçoit, et l'accusé de lecture
 * revient. Retirer un exercice → il disparaît du parcours.
 *
 * On lance donc un VRAI serveur PHP sur une base SQLite jetable, et l'on tape
 * dessus par HTTP comme le feraient le navigateur du professeur et celui de
 * l'élève — cookies de session et jeton anti-rejeu compris. Rien n'est
 * simulé : si un formulaire perd son jeton, l'essai échoue ici et pas devant
 * une classe.
 *
 * RIEN N'EST TOUCHÉ DE L'INSTALLATION RÉELLE : la configuration jetable est
 * désignée par la variable d'environnement `ATOUTMATH_CONFIG` (voir
 * `config()` dans `api/lib/db.php`), et tout est effacé à la fin.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("Cet essai ne s'exécute qu'en ligne de commande.\n");
}

$RACINE = dirname(__DIR__);
$API    = $RACINE . '/api';
$BAC    = sys_get_temp_dir() . '/atoutmath-essai-' . bin2hex(random_bytes(4));
$PORT   = 8300 + random_int(0, 400);
$BASE   = "http://127.0.0.1:$PORT";

@mkdir($BAC, 0700, true);

$CONFIG = $BAC . '/config.php';
file_put_contents($CONFIG, "<?php\nreturn " . var_export([
    'db_driver'       => 'sqlite',
    'db_file'         => $BAC . '/essai.sqlite',
    'app_secret'      => bin2hex(random_bytes(32)),
    'data_key'        => bin2hex(random_bytes(32)),
    'allowed_origins' => [],
    'retention_days'  => 30,
], true) . ";\n");
putenv('ATOUTMATH_CONFIG=' . $CONFIG);

// ---------------------------------------------------------------- Le décor --

require_once $API . '/lib/schema.php';
require_once $API . '/lib/seance.php';
require_once $API . '/lib/coffre.php';
require_once $API . '/lib/sante.php';

migrer();

$profId = uuidv4();
db()->prepare('INSERT INTO teachers (id, display_name, email, password_hash) VALUES (?, ?, ?, ?)')
    ->execute([$profId, 'Rémy Devoddere', 'prof@essai.test', password_hash('motdepassetreslong', PASSWORD_DEFAULT)]);

// Le serveur de développement de PHP : un seul processus, donc une requête à
// la fois — largement suffisant pour un essai séquentiel, et cela évite
// d'installer quoi que ce soit.
$serveur = proc_open(
    [PHP_BINARY, '-S', "127.0.0.1:$PORT", '-t', $API],
    [1 => ['file', $BAC . '/serveur.log', 'a'], 2 => ['file', $BAC . '/serveur.log', 'a']],
    $tuyaux,
    $API,
    // On ne passe que des chaînes : `$_SERVER` contient `argv`, un tableau,
    // et `proc_open` s'en plaint bruyamment.
    // PLUSIEURS OUVRIERS, et c'est indispensable ici : la page de santé
    // interroge le serveur SUR LUI-MÊME. Avec un seul processus, cette requête
    // attendrait la fin de celle qui l'a lancée — c'est-à-dire pour toujours.
    ['ATOUTMATH_CONFIG' => $CONFIG, 'PATH' => getenv('PATH') ?: '/usr/bin:/bin',
     'PHP_CLI_SERVER_WORKERS' => '4']
);

register_shutdown_function(function () use (&$serveur, $BAC) {
    if (is_resource($serveur)) {
        proc_terminate($serveur);
        proc_close($serveur);
    }
    // ON GARDE LE BAC QUAND QUELQUE CHOSE A ÉCHOUÉ. Le journal du serveur y est,
    // et c'est souvent la seule trace d'une erreur fatale — une page qui rend
    // 200 avec un corps vide ne dit rien d'autre.
    global $echecs;
    if (!empty($echecs)) {
        echo "\n(bac conservé pour examen : $BAC)\n";
        return;
    }
    foreach (glob($BAC . '/*') ?: [] as $f) {
        @unlink($f);
    }
    @rmdir($BAC);
    // Le compteur de débit vit dans le répertoire temporaire, sous un nom
    // dérivé du secret de l'installation : cet essai a le sien, on le ramasse.
    foreach (glob(sys_get_temp_dir() . '/atoutmath_rl_*') ?: [] as $d) {
        if (@filemtime($d) >= time() - 600) {
            foreach (glob($d . '/*') ?: [] as $f) {
                @unlink($f);
            }
            @rmdir($d);
        }
    }
});

// On attend que le port réponde plutôt que de dormir un temps fixe : sur une
// machine chargée, une seconde ne suffit pas toujours, et sur une machine
// vide c'est une seconde perdue à chaque essai.
$pret = false;
for ($i = 0; $i < 100 && !$pret; $i++) {
    $c = @fsockopen('127.0.0.1', $PORT, $e, $m, 0.2);
    if ($c) { $pret = true; fclose($c); } else { usleep(100000); }
}
if (!$pret) {
    exit("Le serveur d'essai n'a pas démarré sur le port $PORT.\n");
}

// ------------------------------------------------------- L'outillage d'essai

$reussis = 0;
$echecs  = [];

function verifier(string $quoi, bool $vrai, string $detail = ''): void
{
    global $reussis, $echecs;
    if ($vrai) {
        $reussis++;
        echo "  \033[32m✓\033[0m $quoi\n";
    } else {
        $echecs[] = $quoi . ($detail ? " — $detail" : '');
        echo "  \033[31m✗\033[0m $quoi" . ($detail ? " — $detail" : '') . "\n";
    }
}

function titre(string $t): void
{
    echo "\n\033[1m$t\033[0m\n";
}

/** Un appel JSON, comme le ferait l'application de l'élève. */
function json(string $chemin, array $corps = [], ?string $jeton = null): array
{
    global $BASE;
    $ch = curl_init($BASE . $chemin);
    $entetes = ['Content-Type: application/json'];
    if ($jeton !== null) {
        $entetes[] = 'Authorization: Bearer ' . $jeton;
    }
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($corps, JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER     => $entetes,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
    ]);
    $rep = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'json' => json_decode((string) $rep, true) ?: [], 'brut' => (string) $rep];
}

/** Une page d'administration, comme le ferait le navigateur du professeur. */
function page(string $chemin, ?array $post = null): array
{
    global $BASE, $BAC;
    $ch = curl_init($BASE . $chemin);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_COOKIEJAR      => $BAC . '/cookies.txt',
        CURLOPT_COOKIEFILE     => $BAC . '/cookies.txt',
        CURLOPT_TIMEOUT        => 10,
    ]);
    if ($post !== null) {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($post));
    }
    $rep = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'html' => (string) $rep];
}

/**
 * LE JETON ANTI-REJEU, LU DANS LA PAGE.
 *
 * On ne le fabrique pas et on ne le contourne pas : on le lit dans le
 * formulaire, exactement comme le navigateur. C'est ce qui fait que cet essai
 * PROUVE quelque chose — si un jour un formulaire perd son champ `jeton`, la
 * lecture échoue ici, et pas devant une classe.
 */
/**
 * LE FICHIER DE BASE TEL QU'ON L'EMPORTERAIT — copie comprise du journal.
 *
 * DEUX RAISONS DE COPIER AVANT DE LIRE.
 *
 * La bonne : le danger qu'on veut prouver, c'est le fichier QU'ON EMPORTE. On
 * lit donc une copie, comme celui qui récupère un dossier de sauvegarde. Et il
 * emporte AUSSI le journal `-wal` : SQLite y garde les écritures récentes, et
 * ne regarder que le fichier principal ferait passer l'essai pour de mauvaises
 * raisons.
 *
 * La nécessaire : lire le fichier VIVANT, avec son journal, pendant que deux
 * processus l'utilisent, laisse la connexion dans un état où l'écriture
 * suivante rend « database disk image is malformed ». Mesuré — l'essai mourait
 * trois sections plus loin, sur une insertion parfaitement banale, et l'on
 * cherchait le défaut dans l'administration.
 */
function octetsDeLaBase(): string
{
    global $BAC;
    // On replie d'abord le journal DANS le fichier, par le geste prévu pour
    // cela — un point de contrôle « FULL », qui n'efface rien et laisse la base
    // utilisable. Puis on lit le fichier seul.
    return (string) @file_get_contents($BAC . '/essai.sqlite');
}

function jetonDe(string $html): string
{
    return preg_match('/name="jeton" value="([a-f0-9]+)"/', $html, $m) ? $m[1] : '';
}

echo "\n\033[1mAtoutMath — essai du serveur\033[0m  ($BASE, base jetable)\n";

// ------------------------------------------------------------------ L'API ---

titre('1. Le serveur répond');

$r = json('/health');
verifier('/health répond 200 et ok', $r['code'] === 200 && ($r['json']['ok'] ?? false) === true, "code {$r['code']}");

$r = json('/inconnue');
verifier('une route inconnue répond 404', $r['code'] === 404, "code {$r['code']}");

// --------------------------------------------------------- L'administration -

titre("2. L'administration du professeur");

$p = page('/admin/');
verifier("la page de connexion s'affiche", $p['code'] === 200 && str_contains($p['html'], 'AtoutMath — professeur'));

$p = page('/admin/', ['email' => 'prof@essai.test', 'mdp' => 'faux']);
verifier('un mauvais mot de passe est refusé', str_contains($p['html'], 'Adresse ou mot de passe incorrect'));

$p = page('/admin/', ['email' => 'prof@essai.test', 'mdp' => 'motdepassetreslong']);
verifier('le bon mot de passe ouvre la liste des classes',
    str_contains($p['html'], 'Mes classes') && !str_contains($p['html'], 'incorrect'));

$jeton = jetonDe($p['html']);
verifier('le formulaire porte un jeton anti-rejeu', $jeton !== '');

$p = page('/admin/index.php', ['action' => 'creer', 'nom' => '6e B', 'niveau' => '6e']);
verifier('créer une classe SANS jeton est refusé', str_contains($p['html'], 'Formulaire expiré'));

$p = page('/admin/');
$jeton = jetonDe($p['html']);
$p = page('/admin/index.php', ['jeton' => $jeton, 'action' => 'creer', 'nom' => '6e B', 'niveau' => '6e']);
verifier('la classe est créée et le code annoncé', str_contains($p['html'], '6e B'));

$classe = db()->query("SELECT * FROM classes WHERE name = '6e B'")->fetch();
verifier('la classe existe en base', (bool) $classe);
$code = $classe['join_code'] ?? '';
verifier('le code fait six signes sans 0/O ni 1/I',
    (bool) preg_match('/^[2-9A-HJ-NP-Z]{6}$/', $code), "code « $code »");

// -------------------------------------------------------------- Les élèves --

titre('3. Les élèves se rattachent');

$r = json('/join', ['classCode' => $code, 'firstName' => 'Léa']);
verifier('Léa se rattache', $r['code'] === 200 && !empty($r['json']['token']), $r['brut']);
$lea = $r['json']['token'] ?? '';
$leaId = $r['json']['studentId'] ?? '';

$r = json('/join', ['classCode' => $code, 'firstName' => 'Sacha']);
$sacha = $r['json']['token'] ?? '';
verifier('Sacha se rattache', $sacha !== '');

$r = json('/join', ['classCode' => 'ZZZZZZ', 'firstName' => 'Personne']);
verifier('un code inconnu est refusé', $r['code'] === 404);

$r = json('/join', ['classCode' => $code, 'firstName' => 'Léa']);
verifier('Léa qui revient retrouve son compte',
    ($r['json']['studentId'] ?? '') === $leaId);

// L'ÉCOLE ET LA MAISON EN MÊME TEMPS. Le second rattachement délivre un
// deuxième jeton ; le premier doit rester valable, sans quoi l'ordinateur de
// la salle informatique cesse de remonter le travail sans rien dire.
$leaMaison = $r['json']['token'];
verifier('le deuxième appareil a un autre jeton', $leaMaison !== $lea);
verifier('LE PREMIER APPAREIL CONTINUE DE FONCTIONNER',
    json('/session', [], $lea)['code'] === 200);
verifier('et le second aussi', json('/session', [], $leaMaison)['code'] === 200);

// Mais on n'en garde pas une collection : au-delà de cinq, le plus ancien tombe.
$jetons = [];
for ($i = 0; $i < 6; $i++) {
    $jetons[] = json('/join', ['classCode' => $code, 'firstName' => 'Léa'])['json']['token'];
    // `created_at` a la seconde pour précision : sans cette pause, les six
    // rattachements portent la même et l'ordre d'élagage devient arbitraire.
    sleep(1);
}
verifier('au-delà de cinq appareils, le plus ancien est oublié',
    json('/session', [], $lea)['code'] === 401);
verifier('les cinq derniers valent toujours',
    json('/session', [], $jetons[5])['code'] === 200
    && json('/session', [], $jetons[1])['code'] === 200);
$lea = $jetons[5];

$r = json('/session', [], 'jeton-invente');
verifier('un jeton inventé est refusé', $r['code'] === 401);

// ------------------------------------------------------------- La synchro ---

titre('4. Le travail remonte');

$evenements = [];
for ($i = 0; $i < 5; $i++) {
    $evenements[] = [
        'id' => sprintf('%08x-1111-4222-8333-%012x', $i, $i),
        'type' => 'attempt',
        'ts' => (int) (microtime(true) * 1000),
        'payload' => ['exerciseId' => 'num-rang', 'skillId' => 'num.rang',
                      'correct' => $i < 3, 'runId' => 'run-1'],
    ];
}
$r = json('/sync', ['deviceId' => 'essai', 'cursor' => 0, 'events' => $evenements], $lea);
verifier('les cinq événements sont acceptés', count($r['json']['accepted'] ?? []) === 5);
verifier('la réponse porte un état de séance', isset($r['json']['session']));

// LA CLÉ DE TOUTE LA SYNCHRO : renvoyer deux fois le même lot ne double rien.
$r = json('/sync', ['deviceId' => 'essai', 'cursor' => 0, 'events' => $evenements], $lea);
$combien = (int) db()->query("SELECT COUNT(*) c FROM events")->fetch()['c'];
verifier('renvoyer le même lot ne crée pas de doublon', $combien === 5, "$combien en base");

$r = json('/sync', ['deviceId' => 'essai', 'cursor' => 0, 'events' => [
    ['id' => 'pas-un-uuid', 'type' => 'attempt', 'ts' => 1, 'payload' => []],
]], $lea);
verifier('un événement malformé est ignoré sans casser la synchro', $r['code'] === 200);

// --------------------------------------------------- Ce que le prof pilote --

titre('5. Le professeur conduit la séance');

$url = '/admin/classe.php?id=' . urlencode($classe['id']);
$p = page($url);
verifier('la console de séance s\'ouvre', str_contains($p['html'], 'Le verrou'));
verifier('elle montre les deux élèves',
    str_contains($p['html'], 'Léa') && str_contains($p['html'], 'Sacha'));
// ATTENTION AU FAUX POSITIF : « num-rang » est aussi le texte d'exemple du
// champ de déblocage. On cherche donc le bouton cliquable du rang de l'élève,
// qui, lui, n'existe que si le serveur a vraiment vu Léa travailler dessus.
verifier('elle montre ce que Léa fait en ce moment',
    str_contains($p['html'], 'data-exo="num-rang"'));

// --- Le verrou
$jeton = jetonDe($p['html']);
page($url, ['jeton' => $jeton, 'action' => 'verrou', 'verrou' => 'on']);
$r = json('/session', [], $lea);
verifier('LE VERROU ARRIVE JUSQU\'À L\'ÉLÈVE', ($r['json']['session']['locked'] ?? null) === true);

// --- La consigne
$p = page($url);
$jeton = jetonDe($p['html']);
page($url, ['jeton' => $jeton, 'action' => 'consigne', 'notice' => 'Aujourd\'hui : les fractions.']);
$r = json('/session', [], $lea);
verifier('LA CONSIGNE ARRIVE JUSQU\'À L\'ÉLÈVE',
    ($r['json']['session']['notice'] ?? '') === "Aujourd'hui : les fractions.");

// --- Le mot individuel
$p = page($url);
$jeton = jetonDe($p['html']);
page($url, ['jeton' => $jeton, 'action' => 'message', 'pour' => $leaId,
            'corps' => 'Reprends l\'exercice 3, tu confonds dizaines et dixièmes.']);

$r = json('/session', [], $lea);
$mots = $r['json']['session']['messages'] ?? [];
verifier('LE MOT ARRIVE À LÉA', count($mots) === 1 && str_contains($mots[0]['body'] ?? '', 'dixièmes'));
verifier('le mot est marqué « pour elle »', ($mots[0]['scope'] ?? '') === 'student');

$r2 = json('/session', [], $sacha);
verifier('SACHA NE VOIT PAS LE MOT DE LÉA', count($r2['json']['session']['messages'] ?? []) === 0);

// --- L'accusé de lecture
$idMot = $mots[0]['id'];
$r = json('/messages/read', ['ids' => [$idMot]], $lea);
verifier('Léa accuse réception', ($r['json']['read'] ?? 0) === 1);
$r = json('/session', [], $lea);
verifier('le mot lu ne revient plus', count($r['json']['session']['messages'] ?? []) === 0);

$p = page($url);
verifier('le professeur voit la coche', str_contains($p['html'], '✓ lu'));

// --- Le mot à toute la classe
$jeton = jetonDe($p['html']);
page($url, ['jeton' => $jeton, 'action' => 'message', 'pour' => 'classe',
            'corps' => 'On se retrouve tous sur l\'exercice 5.']);
$a = json('/session', [], $lea)['json']['session']['messages'] ?? [];
$b = json('/session', [], $sacha)['json']['session']['messages'] ?? [];
verifier('LE MOT À LA CLASSE ARRIVE AUX DEUX', count($a) === 1 && count($b) === 1);
verifier('c\'est bien le même mot', ($a[0]['id'] ?? 'x') === ($b[0]['id'] ?? 'y'));
verifier('il est marqué « à la classe »', ($a[0]['scope'] ?? '') === 'class');

json('/messages/read', ['ids' => [$a[0]['id']]], $lea);
$b = json('/session', [], $sacha)['json']['session']['messages'] ?? [];
verifier('LÉA QUI LIT NE LIT PAS POUR SACHA', count($b) === 1);

$p = page($url);
verifier('le professeur voit « 1 / 2 »', str_contains($p['html'], '1 / 2'));

// --- Un élève ne peut pas marquer lu ce qui ne lui est pas destiné
$autreProf = uuidv4();
db()->prepare('INSERT INTO teachers (id, display_name, email, password_hash) VALUES (?, ?, ?, ?)')
    ->execute([$autreProf, 'Autre', 'autre@essai.test', password_hash('x', PASSWORD_DEFAULT)]);
$autreClasse = uuidv4();
db()->prepare('INSERT INTO classes (id, teacher_id, name, join_code) VALUES (?, ?, ?, ?)')
    ->execute([$autreClasse, $autreProf, 'Ailleurs', 'AILLRS']);
$motAilleurs = uuidv4();
db()->prepare('INSERT INTO messages (id, class_id, body) VALUES (?, ?, ?)')
    ->execute([$motAilleurs, $autreClasse, 'Pas pour vous.']);
$r = json('/messages/read', ['ids' => [$motAilleurs]], $lea);
verifier('un élève ne marque pas lu le mot d\'une autre classe', ($r['json']['read'] ?? 1) === 0);
$r = json('/session', [], $lea);
verifier('et il ne le reçoit pas non plus',
    !in_array($motAilleurs, array_column($r['json']['session']['messages'] ?? [], 'id'), true));

// ------------------------------------------------- L'exercice qui bloque ----

titre('6. Un exercice plante et bloque la progression');

$p = page($url);
$jeton = jetonDe($p['html']);
page($url, ['jeton' => $jeton, 'action' => 'exercice', 'exercice' => 'num-egypte',
            'pour' => 'classe', 'mode' => 'saut']);
$s = json('/session', [], $lea)['json']['session'];
verifier('LE SAUT EST AUTORISÉ POUR TOUTE LA CLASSE', in_array('num-egypte', $s['skippable'], true));
$s2 = json('/session', [], $sacha)['json']['session'];
verifier('Sacha aussi', in_array('num-egypte', $s2['skippable'], true));

$p = page($url);
$jeton = jetonDe($p['html']);
page($url, ['jeton' => $jeton, 'action' => 'exercice', 'exercice' => 'geo-thales',
            'pour' => $leaId, 'mode' => 'retire']);
$s = json('/session', [], $lea)['json']['session'];
verifier('L\'EXERCICE EST RETIRÉ, POUR LÉA SEULE', in_array('geo-thales', $s['removed'], true));
$s2 = json('/session', [], $sacha)['json']['session'];
verifier('et Sacha le garde', !in_array('geo-thales', $s2['removed'], true));

// « retire » l'emporte sur « saut » : le professeur qui retire a constaté que
// l'exercice plante, il ne veut pas que l'élève retombe dessus.
$p = page($url);
$jeton = jetonDe($p['html']);
page($url, ['jeton' => $jeton, 'action' => 'exercice', 'exercice' => 'num-egypte',
            'pour' => $leaId, 'mode' => 'retire']);
$s = json('/session', [], $lea)['json']['session'];
verifier('« retiré » l\'emporte sur « saut autorisé »',
    in_array('num-egypte', $s['removed'], true) && !in_array('num-egypte', $s['skippable'], true));

// --- Annuler un réglage
$p = page($url);
$over = db()->query("SELECT id FROM overrides WHERE exercise_id = 'geo-thales'")->fetch();
$jeton = jetonDe($p['html']);
page($url, ['jeton' => $jeton, 'action' => 'exercice-annuler', 'over' => $over['id']]);
$s = json('/session', [], $lea)['json']['session'];
verifier('annuler un réglage rend l\'exercice obligatoire',
    !in_array('geo-thales', $s['removed'], true));

// ------------------------------------------------------- Mettre de côté -----

titre('7. Mettre un élève de côté, puis tout effacer');

$p = page($url);
$jeton = jetonDe($p['html']);
page($url, ['jeton' => $jeton, 'action' => 'eleve-bloquer', 'eleve' => $leaId, 'bloque' => 'on']);

$r = json('/join', ['classCode' => $code, 'firstName' => 'Léa']);
verifier('L\'ÉLÈVE ÉCARTÉ NE SE RATTACHE PLUS', $r['code'] === 403, "code {$r['code']}");

$s = json('/session', [], $lea)['json']['session'];
verifier('son application le sait', ($s['blocked'] ?? null) === true);
verifier('mais son travail n\'est pas perdu',
    (int) db()->query('SELECT COUNT(*) c FROM events')->fetch()['c'] === 5);

$p = page($url);
$jeton = jetonDe($p['html']);
page($url, ['jeton' => $jeton, 'action' => 'eleve-bloquer', 'eleve' => $leaId, 'bloque' => 'off']);
$r = json('/join', ['classCode' => $code, 'firstName' => 'Léa']);
verifier('réactivé, il se rattache de nouveau', $r['code'] === 200);
$lea = $r['json']['token'];

// --- Le professeur d'à côté ne voit rien
$p = page('/admin/index.php?deconnexion=1');
$p = page('/admin/', ['email' => 'autre@essai.test', 'mdp' => 'x']);
$p = page($url);
verifier('UN AUTRE PROFESSEUR N\'OUVRE PAS CETTE CLASSE',
    !str_contains($p['html'], 'Le verrou'));

$p = page('/admin/index.php?deconnexion=1');
$p = page('/admin/', ['email' => 'prof@essai.test', 'mdp' => 'motdepassetreslong']);

// --- Effacer, avec la confirmation écrite
$p = page($url);
$jeton = jetonDe($p['html']);
page($url, ['jeton' => $jeton, 'action' => 'vider', 'confirmation' => 'oui']);
verifier('sans écrire EFFACER, rien n\'est effacé',
    (int) db()->query('SELECT COUNT(*) c FROM students')->fetch()['c'] === 2);

$p = page($url);
$jeton = jetonDe($p['html']);
page($url, ['jeton' => $jeton, 'action' => 'vider', 'confirmation' => 'EFFACER']);
verifier('EFFACER efface les élèves',
    (int) db()->query('SELECT COUNT(*) c FROM students')->fetch()['c'] === 0);
verifier('LA CASCADE EMPORTE LEUR TRAVAIL',
    (int) db()->query('SELECT COUNT(*) c FROM events')->fetch()['c'] === 0);
verifier('et leurs messages', (int) db()->query(
    "SELECT COUNT(*) c FROM messages WHERE student_id IS NOT NULL")->fetch()['c'] === 0);

$r = json('/sync', ['deviceId' => 'essai', 'cursor' => 0, 'events' => []], $lea);
verifier('le jeton d\'un élève effacé ne vaut plus rien', $r['code'] === 401);

// --- Supprimer la classe
$p = page($url);
$jeton = jetonDe($p['html']);
page($url, ['jeton' => $jeton, 'action' => 'supprimer-classe', 'confirmation' => 'EFFACER']);
verifier('la classe est supprimée',
    (int) db()->query("SELECT COUNT(*) c FROM classes WHERE name = '6e B'")->fetch()['c'] === 0);

// ------------------------------------------------------------- La purge -----

titre('8. Le coffre : ce qui est écrit sur le disque');

// LA VÉRIFICATION QUI COMPTE, ET LA SEULE QUI PROUVE QUELQUE CHOSE : on ouvre
// le fichier de base avec un éditeur de texte, comme le ferait celui qui l'a
// récupéré, et l'on cherche les prénoms. S'ils y sont, tout le reste du
// chiffrement est décoratif.
$eleveCoffre = uuidv4();
$classeCoffre = uuidv4();
db()->prepare('INSERT INTO classes (id, teacher_id, name, join_code) VALUES (?, ?, ?, ?)')
    ->execute([$classeCoffre, $profId, 'Coffre', 'COFFRE']);
$r = json('/join', ['classCode' => 'COFFRE', 'firstName' => 'Anastasia']);
$jetonCoffre = $r['json']['token'] ?? '';
verifier('une élève se rattache à la classe d\'essai', $jetonCoffre !== '');

json('/sync', ['deviceId' => 'd', 'cursor' => 0, 'events' => [[
    'id' => uuidv4(), 'type' => 'attempt', 'ts' => (int) (microtime(true) * 1000),
    'payload' => ['exerciseId' => 'num-rang', 'reponseEleve' => 'quarante-deux-mille'],
]]], $jetonCoffre);

$eleveC = db()->query("SELECT id FROM students WHERE first_name_key IS NOT NULL
                       AND class_id = '$classeCoffre'")->fetch();
db()->prepare('INSERT INTO messages (id, student_id, body) VALUES (?, ?, ?)')
    ->execute([uuidv4(), $eleveC['id'], chiffrer('Anastasia, revois la soustraction posée.')]);

// … mais l'application, elle, lit tout normalement.
// UN CURSEUR OUVERT GÈLE LA BASE POUR TOUT LE MONDE — le piège de cet essai.
//
// On écrivait ici `$s->fetch()` et l'on gardait `$s` en vie. Une seule ligne
// lue, curseur non épuisé : SQLite tient alors une transaction de lecture sur
// cette connexion, et TOUT CE QU'ON ÉCRIT ENSUITE cesse d'être visible aux
// autres processus. Le serveur d'essai continuait donc de voir une classe
// effacée et pas une classe créée — trois quarts d'heure à chercher un bug
// dans l'administration qui n'y était pas.
//
// `fetchAll()` épuise le curseur et referme la lecture. La règle vaut pour tout
// ce fichier : on ne garde jamais un `PDOStatement` à moitié lu.
$s = db()->prepare('SELECT first_name FROM students WHERE id = ?');
$s->execute([$eleveC['id']]);
$lu = $s->fetchAll();
verifier('le serveur relit le prénom sans peine',
    dechiffrer($lu[0]['first_name'] ?? '') === 'Anastasia');

$msg = json('/session', [], $jetonCoffre)['json']['session']['messages'] ?? [];
verifier('et l\'élève reçoit le mot en clair',
    str_contains($msg[0]['body'] ?? '', 'soustraction'), json_encode($msg));

// L'index aveugle : on retrouve l'élève sans savoir lire son prénom, et les
// majuscules et les accents ne créent plus de doublons.
$r = json('/join', ['classCode' => 'COFFRE', 'firstName' => 'ANASTASIA']);
verifier('« ANASTASIA » RETROUVE LE COMPTE DE « Anastasia »',
    ($r['json']['studentId'] ?? '') === $eleveC['id']);
$r = json('/join', ['classCode' => 'COFFRE', 'firstName' => '  anastasia ']);
verifier('les espaces en trop et la casse aussi',
    ($r['json']['studentId'] ?? '') === $eleveC['id']);
verifier('et cela n\'a créé qu\'une seule élève',
    (int) db()->query("SELECT COUNT(*) c FROM students WHERE class_id = '$classeCoffre'")
        ->fetch()['c'] === 1);

$r = json('/join', ['classCode' => 'COFFRE', 'firstName' => 'Anastasia B.']);
verifier('mais « Anastasia B. » reste une autre élève',
    ($r['json']['studentId'] ?? '') !== $eleveC['id']);

// Une clé qui change ne doit pas rendre du charabia lisible.
verifier('un bloc modifié ne se déchiffre pas silencieusement',
    dechiffrer('v1:' . base64_encode(random_bytes(60))) === null);
verifier('un texte en clair d\'avant le coffre se relit tel quel',
    dechiffrer('Léa') === 'Léa');

titre('9. La liste du professeur : identifiant et code');

// Rémy : « pour la connexion, fais aussi une connexion avec identifiant et code
// élève, je fournirai la liste. » On colle la liste, on ouvre avec un billet.
$classeL = uuidv4();
db()->prepare('INSERT INTO classes (id, teacher_id, name, join_code) VALUES (?, ?, ?, ?)')
    ->execute([$classeL, $profId, 'Liste', 'LISTE1']);
$uL = '/admin/eleves.php?id=' . urlencode($classeL);

$p = page($uL);
verifier('la page de liste s\'ouvre', str_contains($p['html'], 'Coller la liste'));
$jeton = jetonDe($p['html']);
page($uL, ['jeton' => $jeton, 'action' => 'importer',
    'liste' => "Léa Durand\nJean-Luc Martin ; jeanluc.martin\nEmma Dupont ; emma.dupont ; 4KP2"]);

$s = db()->prepare('SELECT first_name, login, access_code FROM students WHERE class_id = ?');
$s->execute([$classeL]);
$liste = [];
foreach ($s->fetchAll() as $e) {
    $liste[(string) dechiffrer($e['login'])] = [dechiffrer($e['first_name']), dechiffrer($e['access_code'])];
}
verifier('trois élèves sont entrés dans la liste', count($liste) === 3, implode(', ', array_keys($liste)));
verifier('L\'IDENTIFIANT SE FABRIQUE DEPUIS LE NOM',
    isset($liste['lea.durand']), implode(', ', array_keys($liste)));
verifier('un identifiant donné à la main est respecté', isset($liste['jeanluc.martin']));
verifier('un code donné à la main aussi', ($liste['emma.dupont'][1] ?? '') === '4KP2');
verifier('les codes fabriqués font quatre signes dictables',
    (bool) preg_match('/^[2-9A-HJ-NP-Z]{4}$/', $liste['lea.durand'][1] ?? ''), $liste['lea.durand'][1] ?? '');

// --- La connexion
$r = json('/login', ['login' => 'emma.dupont', 'code' => '4KP2']);
verifier('LE BILLET OUVRE', $r['code'] === 200 && !empty($r['json']['token']), $r['brut']);
verifier('et le serveur rend le prénom de la LISTE, pas un prénom déclaré',
    ($r['json']['firstName'] ?? '') === 'Emma Dupont', $r['json']['firstName'] ?? '');
$jetonEmma = $r['json']['token'];
verifier('le jeton obtenu vaut pour la synchro',
    json('/session', [], $jetonEmma)['code'] === 200);

verifier('la casse ne compte pas — ni pour l\'identifiant ni pour le code',
    json('/login', ['login' => 'EMMA.Dupont', 'code' => '4kp2'])['code'] === 200);

$mauvais = json('/login', ['login' => 'emma.dupont', 'code' => 'ZZZZ']);
$inconnu = json('/login', ['login' => 'personne.ici', 'code' => '4KP2']);
verifier('un mauvais code est refusé', $mauvais['code'] === 401);
verifier('un identifiant inconnu aussi', $inconnu['code'] === 401);
verifier('LES DEUX ÉCHECS DISENT EXACTEMENT LA MÊME CHOSE',
    ($mauvais['json']['message'] ?? 'a') === ($inconnu['json']['message'] ?? 'b'),
    'sinon on apprend quels identifiants existent');

// --- Recoller la liste ne périme pas les billets distribués
$p = page($uL);
$jeton = jetonDe($p['html']);
page($uL, ['jeton' => $jeton, 'action' => 'importer',
    'liste' => "Léa Durand\nEmma Dupont\nTom Bernard"]);
verifier('RECOLLER LA LISTE NE CHANGE PAS LES CODES DÉJÀ DONNÉS',
    json('/login', ['login' => 'emma.dupont', 'code' => '4KP2'])['code'] === 200);
$s->execute([$classeL]);
verifier('et le nouveau venu est ajouté', count($s->fetchAll()) === 4);

// --- Un élève écarté ne se connecte plus
$idEmma = json('/login', ['login' => 'emma.dupont', 'code' => '4KP2'])['json']['studentId'];
db()->prepare('UPDATE students SET blocked = 1 WHERE id = ?')->execute([$idEmma]);
verifier('un élève mis de côté ne se connecte plus avec son billet',
    json('/login', ['login' => 'emma.dupont', 'code' => '4KP2'])['code'] === 403);
db()->prepare('UPDATE students SET blocked = 0 WHERE id = ?')->execute([$idEmma]);

// --- Un nouveau code invalide l'ancien billet
$p = page($uL);
$jeton = jetonDe($p['html']);
page($uL, ['jeton' => $jeton, 'action' => 'nouveau-code', 'eleve' => $idEmma]);
verifier('un nouveau code périme l\'ancien billet',
    json('/login', ['login' => 'emma.dupont', 'code' => '4KP2'])['code'] === 401);

titre('10. La page de santé sait reconnaître une fuite');

// CETTE PAGE EST UN DÉTECTEUR, et un détecteur qui ne détecte rien est pire
// qu'aucun détecteur : il rassure. On le met donc devant une vraie fuite.
//
// Le serveur d'essai est le serveur intégré de PHP : il ne lit aucun
// `.htaccess` et sert donc TOUT, fichier de base compris. C'est exactement le
// cas d'un hébergement mal réglé — et la page doit le dire en rouge.
$p = page('/admin/sante.php');
verifier('la page de santé s\'ouvre', str_contains($p['html'], 'Santé de l\'installation'));
verifier('elle rend compte du chiffrement', str_contains($p['html'], 'AES-256-GCM actif'));
verifier('elle voit que la page d\'installation n\'est pas là',
    str_contains($p['html'], 'effacée'));

// ── ON MET LE DÉTECTEUR DEVANT DE VRAIES FUITES ──────────────────────────
//
// Fabriquer un hébergement mal réglé pour de bon coûterait un serveur de plus
// à chaque essai. On donne donc au raisonnement la réponse HTTP qu'un tel
// serveur rendrait, et l'on regarde ce qu'il en conclut. C'est possible parce
// que la décision vit dans `lib/sante.php`, séparée de la page qui l'affiche.

$fuite = verdictBase(['code' => 200, 'corps' => "SQLite format 3\0…", 'erreur' => ''], 'http://x/data/b.sqlite');
verifier('UNE BASE SERVIE EN 200 EST CRIÉE EN ROUGE',
    $fuite['etat'] === 'x' && str_contains($fuite['dit'], 'REPARTIR AVEC LA BASE'), $fuite['etat']);

$refus = verdictBase(['code' => 403, 'corps' => '', 'erreur' => ''], 'http://x/data/b.sqlite');
verifier('un 403 est vert', $refus['etat'] === 'ok');

$muet = verdictBase(['code' => 0, 'corps' => '', 'erreur' => 'timeout'], 'http://x/data/b.sqlite');
verifier('UNE VÉRIFICATION IMPOSSIBLE NE VERDIT PAS', $muet['etat'] === '?', $muet['etat']);
verifier('et elle dit à l\'utilisateur comment vérifier lui-même',
    str_contains($muet['faire'], 'dans un navigateur'));

$ailleurs = verdictBase([], '', false);
verifier('une base rangée hors du web est verte, et pour la bonne raison',
    $ailleurs['etat'] === 'ok' && str_contains($ailleurs['dit'], 'hors du dossier'));

$source = verdictConfig(['code' => 200, 'corps' => "<?php\nreturn ['app_secret'…", 'erreur' => ''], 'http://x/config.php');
verifier('UNE CONFIGURATION SERVIE EN SOURCE EST CRIÉE EN ROUGE', $source['etat'] === 'x');

$execute = verdictConfig(['code' => 200, 'corps' => '', 'erreur' => ''], 'http://x/config.php');
verifier('une configuration exécutée par PHP est orange, ni verte ni rouge',
    $execute['etat'] === '!', $execute['etat']);

$bloque = verdictConfig(['code' => 403, 'corps' => '', 'erreur' => ''], 'http://x/config.php');
verifier('une configuration refusée est verte', $bloque['etat'] === 'ok');

verifier('le code source d\'une bibliothèque servie est signalé',
    verdictInterne(['code' => 200, 'corps' => '<?php declare', 'erreur' => ''])['etat'] === '!');

// Et elle est bien derrière la connexion : c'est une carte des faiblesses.
page('/admin/index.php?deconnexion=1');
$p = page('/admin/sante.php');
verifier('SANS ÊTRE CONNECTÉ, ON NE LA VOIT PAS',
    !str_contains($p['html'], 'Le fichier de base est-il téléchargeable'));
page('/admin/', ['email' => 'prof@essai.test', 'mdp' => 'motdepassetreslong']);

titre('11. La conservation limitée');

$vieux = uuidv4();
$eleveTest = uuidv4();
db()->prepare('INSERT INTO classes (id, teacher_id, name, join_code) VALUES (?, ?, ?, ?)')
    ->execute([$vieux, $profId, 'Purge', 'PURGE1']);
db()->prepare('INSERT INTO students (id, class_id, first_name, token_hash) VALUES (?, ?, ?, ?)')
    ->execute([$eleveTest, $vieux, 'Ancien', hash('sha256', 'x')]);
db()->prepare('INSERT INTO events (id, student_id, device_id, type, ts, payload) VALUES (?, ?, ?, ?, ?, ?)')
    ->execute([uuidv4(), $eleveTest, 'd', 'attempt', (int) ((time() - 400 * 86400) * 1000), '{}']);
db()->prepare('INSERT INTO events (id, student_id, device_id, type, ts, payload) VALUES (?, ?, ?, ?, ?, ?)')
    ->execute([uuidv4(), $eleveTest, 'd', 'attempt', (int) (time() * 1000), '{}']);

@unlink($API . '/.derniere-purge');
$efface = purgerSiNecessaire();
verifier('la purge supprime le vieil événement', $efface === 1, "$efface supprimé(s)");
$s = db()->prepare('SELECT COUNT(*) c FROM events WHERE student_id = ?');
$s->execute([$eleveTest]);
verifier('et garde le récent', (int) $s->fetchAll()[0]['c'] === 1);
verifier('elle ne repasse pas le même jour', purgerSiNecessaire() === 0);
@unlink($API . '/.derniere-purge');

// ------------------------------------------------------------ Le schéma -----

titre('12. Le schéma se remet à niveau sans rien casser');

$avant = (int) db()->query('SELECT COUNT(*) c FROM events')->fetch()['c'];
migrer();
migrer();
verifier('migrer() est idempotent', (int) db()->query('SELECT COUNT(*) c FROM events')->fetch()['c'] === $avant);

$tables = array_column(db()->query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
)->fetchAll(), 'name');
verifier('les onze tables sont là',
    $tables === ['assignments', 'classes', 'events', 'message_reads', 'messages',
                 'overrides', 'paths', 'reglages', 'student_tokens', 'students', 'teachers'],
    implode(', ', $tables));

titre('12 bis. La liste : lire un vrai fichier de professeur');

// Rémy : « j'espère qu'on pourra importer des CSV et ou du presse-papier et je
// peux choisir un mdp générique pour tous mes élèves et je peux leur recréer un
// mdp », « il faut qqch de confortable et facile ».
//
// CONFORTABLE, ÇA SE PROUVE AVEC DE VRAIS FORMATS. On ne lui donne pas une
// liste écrite pour l'occasion : on lui donne ce que crachent Pronote et Excel,
// point-virgule, en-tête, guillemets, BOM et accents Windows-1252 compris.

require_once $API . '/lib/liste.php';

$formats = [
    'un nom par ligne'          => ["Léa Durand\nTom Bernard", ['lea.durand', 'tom.bernard']],
    'la forme de Pronote'       => ["NOM;Prénom\nDURAND;Léa\nBERNARD;Tom", ['durand.lea', 'bernard.tom']],
    'un CSV anglais à virgules' => ["name,login\nLea Durand,lea.durand", ['lea.durand']],
    'des tabulations'           => ["Léa Durand\tlea.durand\t4KP2", ['lea.durand']],
    'une cellule entre guillemets' => ["\"Martin, Jean\";jean.martin", ['jean.martin']],
    'un BOM et des accents Excel'  => ["\xEF\xBB\xBFL\xE9a Durand", ['lea.durand']],
    'des lignes vides et un commentaire' => ["# ma classe\n\nLéa Durand\n\n", ['lea.durand']],
];
foreach ($formats as $quoi => [$texte, $attendus]) {
    $lu = lireListe($texte);
    verifier("elle lit $quoi",
        array_column($lu['lignes'], 'login') === $attendus,
        implode(', ', array_column($lu['lignes'], 'login')));
}
verifier("l'en-tête n'entre pas dans la classe comme un élève",
    array_column(lireListe("Élève\nLéa Durand")['lignes'], 'login') === ['lea.durand']);
verifier('deux fois le même nom donnent deux identifiants distincts',
    array_column(lireListe("Léa Durand\nLéa Durand")['lignes'], 'login') === ['lea.durand', 'lea.durand2']);

// L'ALLER-RETOUR DE L'APERÇU. Ce qui est montré est réécrit sous forme
// normalisée, puis relu à la confirmation : si les deux lectures divergeaient,
// l'aperçu mentirait — il annoncerait une chose et l'import en ferait une autre.
$a = lireListe("NOM;Prénom\nDURAND;Léa\nBERNARD;Tom")['lignes'];
verifier("CE QUE L'APERÇU MONTRE EST EXACTEMENT CE QUI SERA ÉCRIT",
    lireListe(ecrireListe($a))['lignes'] === $a);

// --- Par la page, maintenant : l'aperçu n'écrit rien, la confirmation écrit.
$classeF = uuidv4();
db()->prepare('INSERT INTO classes (id, teacher_id, name, join_code) VALUES (?, ?, ?, ?)')
    ->execute([$classeF, $profId, 'Fichiers', 'FICHI1']);
$uF = '/admin/eleves.php?id=' . urlencode($classeF);
$compteF = function () use ($classeF) {
    $s = db()->prepare('SELECT COUNT(*) c FROM students WHERE class_id = ?');
    $s->execute([$classeF]);
    return (int) $s->fetchAll()[0]['c'];
};

$jeton = jetonDe(page($uF)['html']);
// DES NOMS QUI N'EXISTENT NULLE PART AILLEURS dans cet essai — la section 9 a
// déjà une Léa Durand dans une autre classe, et l'aperçu proposerait alors de
// la déplacer. C'est le bon comportement, mais ce n'est pas ce qu'on mesure ici.
$p = page($uF, ['jeton' => $jeton, 'action' => 'apercu', 'liste' => "Élise Vasseur\nNoé Perrin"]);
verifier("L'APERÇU MONTRE AVANT D'ÉCRIRE", str_contains($p['html'], 'Voici ce qui va se passer'));
verifier("et il n'a rien écrit", $compteF() === 0);
verifier('il annonce les deux élèves comme nouveaux',
    substr_count($p['html'], 'nouvel élève') === 2,
    'vu ' . substr_count($p['html'], 'nouvel élève') . ' fois');

page($uF, ['jeton' => $jeton, 'action' => 'importer', 'liste' => "Élise Vasseur;elise.vasseur;\nNoé Perrin;noe.perrin;"]);
verifier('la confirmation écrit les deux élèves', $compteF() === 2);

// --- LE DOUBLON D'AUTREFOIS. Une élève entrée par le code de la classe, puis
//     ajoutée à la liste : l'ancienne page en faisait DEUX, le travail sur
//     l'une et le billet sur l'autre. Mesuré à l'époque, vérifié ici.
$r = json('/join', ['classCode' => 'FICHI1', 'firstName' => 'Maëlle Nguyên']);
$idMaelle = $r['json']['studentId'] ?? '';
json('/sync', ['events' => [['id' => uuidv4(), 'type' => 'ATTEMPT', 'ts' => time() * 1000,
    'deviceId' => 'pc', 'payload' => ['exerciseId' => 'x', 'correct' => true]]]], $r['json']['token']);
verifier('une élève entre par le code de la classe et travaille', $compteF() === 3);

$jeton = jetonDe(page($uF)['html']);
$p = page($uF, ['jeton' => $jeton, 'action' => 'apercu', 'liste' => 'Maëlle Nguyên']);
verifier("L'APERÇU ANNONCE LE RATTACHEMENT, pas une création",
    str_contains($p['html'], 'il garde son travail'), 'sinon on recrée un doublon');
page($uF, ['jeton' => $jeton, 'action' => 'importer', 'liste' => "Maëlle Nguyên;maelle.nguyen;"]);
verifier('ELLE N\'EST PAS DÉDOUBLÉE', $compteF() === 3);
$s = db()->prepare('SELECT id, login FROM students WHERE class_id = ? AND first_name_key = ?');
$s->execute([$classeF, empreintePrenom('Maëlle Nguyên')]);
$m = $s->fetchAll();
verifier('c\'est bien LA MÊME élève qui reçoit le billet',
    count($m) === 1 && $m[0]['id'] === $idMaelle);
$s = db()->prepare('SELECT COUNT(*) c FROM events WHERE student_id = ?');
$s->execute([$idMaelle]);
verifier('et son travail est toujours là', (int) $s->fetchAll()[0]['c'] >= 1);

// --- LE CODE COMMUN. Rémy : « je peux choisir un mdp générique pour tous mes
//     élèves ». Il l'a demandé, il l'a — avec un mot de prudence dans la page.
$jeton = jetonDe(page($uF)['html']);
page($uF, ['jeton' => $jeton, 'action' => 'apercu', 'genre_code' => 'commun',
    'code_commun' => 'sixieme', 'liste' => "Sacha Roy\nYanis Ferrand"]);
page($uF, ['jeton' => $jeton, 'action' => 'importer',
    'liste' => "Sacha Roy;sacha.roy;SIXIEME\nYanis Ferrand;yanis.ferrand;SIXIEME"]);
verifier('LE CODE COMMUN OUVRE POUR L\'UN', json('/login', ['login' => 'sacha.roy', 'code' => 'SIXIEME'])['code'] === 200);
verifier('et pour l\'autre', json('/login', ['login' => 'yanis.ferrand', 'code' => 'sixieme'])['code'] === 200);
verifier('la page prévient de ce que cela coûte',
    str_contains(page($uF)['html'], 'entre à sa place'));

// --- REFAIRE TOUS LES CODES D'UN COUP.
$jeton = jetonDe(page($uF)['html']);
page($uF, ['jeton' => $jeton, 'action' => 'codes-classe', 'genre_code' => 'chacun']);
verifier('REFAIRE LES CODES PÉRIME TOUS LES ANCIENS BILLETS',
    json('/login', ['login' => 'sacha.roy', 'code' => 'SIXIEME'])['code'] === 401);
$s = db()->prepare('SELECT access_code FROM students WHERE class_id = ? AND login_key IS NOT NULL AND login_key <> \'\'');
$s->execute([$classeF]);
$codes = array_map(fn ($e) => dechiffrer($e['access_code']), $s->fetchAll());
verifier('et « un code différent pour chacun » en donne bien autant que d\'élèves',
    count(array_unique($codes)) === count($codes), implode(' ', $codes));

$jeton = jetonDe(page($uF)['html']);
page($uF, ['jeton' => $jeton, 'action' => 'codes-classe', 'genre_code' => 'commun', 'code_commun' => 'CLASSE6']);
verifier('« le même pour tous » donne bien le même à tous',
    json('/login', ['login' => 'sacha.roy', 'code' => 'CLASSE6'])['code'] === 200
    && json('/login', ['login' => 'yanis.ferrand', 'code' => 'CLASSE6'])['code'] === 200);

// --- RETIRER UN ÉLÈVE. Impossible avant : un départ en cours d'année restait
//     dans la liste pour toujours.
$idSacha = json('/login', ['login' => 'sacha.roy', 'code' => 'CLASSE6'])['json']['studentId'];
$avant = $compteF();
$jeton = jetonDe(page($uF)['html']);
page($uF, ['jeton' => $jeton, 'action' => 'retirer', 'eleve' => $idSacha]);
verifier('UN ÉLÈVE PEUT ÊTRE RETIRÉ', $compteF() === $avant - 1);
verifier('et son billet ne vaut plus rien',
    json('/login', ['login' => 'sacha.roy', 'code' => 'CLASSE6'])['code'] === 401);
$s = db()->prepare('SELECT COUNT(*) c FROM student_tokens WHERE student_id = ?');
$s->execute([$idSacha]);
verifier('ses jetons sont partis avec lui', (int) $s->fetchAll()[0]['c'] === 0);

// --- DÉPLACER UN ÉLÈVE D'UNE CLASSE À L'AUTRE. Refusé sans recours avant.
$classeG = uuidv4();
db()->prepare('INSERT INTO classes (id, teacher_id, name, join_code) VALUES (?, ?, ?, ?)')
    ->execute([$classeG, $profId, 'Cinquième', 'CINQU1']);
$uG = '/admin/eleves.php?id=' . urlencode($classeG);
$jeton = jetonDe(page($uG)['html']);
$p = page($uG, ['jeton' => $jeton, 'action' => 'apercu', 'liste' => 'Yanis Ferrand;yanis.ferrand']);
verifier('L\'APERÇU PROPOSE DE DÉPLACER, il ne refuse plus',
    str_contains($p['html'], 'sera déplacé ici'), 'sinon un changement de classe est sans issue');
page($uG, ['jeton' => $jeton, 'action' => 'importer', 'liste' => 'Yanis Ferrand;yanis.ferrand;']);
$s = db()->prepare('SELECT class_id FROM students WHERE login_key = ?');
$s->execute([empreinteLogin('yanis.ferrand')]);
$ou = $s->fetchAll();
verifier('et il change bien de classe, sans doublon',
    count($ou) === 1 && $ou[0]['class_id'] === $classeG);
verifier('son billet marche toujours après le déplacement',
    json('/login', ['login' => 'yanis.ferrand', 'code' => 'CLASSE6'])['code'] === 200);

titre('12 septies. Le guichet des mises à jour reste fermé');

// Rémy : « deposer.php n'est pas sécurisé ? »
//
// Il l'était — et c'était insuffisant. Cette page écrit des fichiers PHP :
// qui la tient tient le serveur. Toute sa sécurité reposait sur UN mot de
// passe, le même que celui de l'administration. Volé, on ne perdait plus
// seulement les données des élèves : on perdait le site, avec de quoi y
// installer n'importe quoi.

require_once $API . '/lib/guichet.php';

fermerGuichet();
verifier('par défaut, le guichet est FERMÉ', !guichetOuvert(),
    'une porte ouverte toute l\'année n\'a jamais servi à personne');
verifier('et il ne reste aucune minute', guichetMinutes() === 0);

ouvrirGuichet();
verifier('le professeur peut l\'ouvrir', guichetOuvert());
$m = guichetMinutes();
verifier('pour une demi-heure, pas davantage', $m > 25 && $m <= 30, (string) $m);

// LE TEMPS QUI PASSE LE REFERME. C'est la moitié de l'intérêt : on oublie
// toujours de refermer, et une porte qu'on oublie n'est plus une porte.
ecrireReglage(GUICHET_CLE, (string) (time() - 10));
verifier('IL SE REFERME TOUT SEUL quand l\'heure est passée', !guichetOuvert());

ouvrirGuichet();
fermerGuichet();
verifier('et l\'on peut le refermer à la main', !guichetOuvert());

// LE JOURNAL. Il ne sert pas à surveiller Rémy : il sert à ce qu'il VOIE un
// dépôt qu'il n'a pas fait.
inscrireDepot('atoutmath-maj-v679.zip', 14);
$j = derniersDepots();
verifier('chaque dépôt laisse une trace',
    count($j) >= 1 && ($j[0]['quoi'] ?? '') === 'atoutmath-maj-v679.zip'
    && (int) ($j[0]['n'] ?? 0) === 14);
verifier('avec l\'adresse d\'où il vient — la seule chose qui distingue « moi » de « pas moi »',
    ($j[0]['ou'] ?? '') !== '');

for ($i = 0; $i < 25; $i++) {
    inscrireDepot("essai-$i.zip", $i);
}
verifier('le journal ne garde que les vingt derniers', count(derniersDepots()) === 20,
    (string) count(derniersDepots()));

// ET DEPOSER.PHP EN TIENT COMPTE. On relit le fichier plutôt que de le
// charger : il s'exécute entièrement, et l'on veut vérifier la RÈGLE, pas
// jouer la page.
$depose = (string) file_get_contents(dirname(__DIR__) . '/deposer.php');
verifier('deposer.php consulte le guichet',
    str_contains($depose, 'guichetOuvert()')
    && str_contains($depose, '($connecte && $guichet)'),
    'sinon le second tour de clef ne sert à rien');
verifier('et il inscrit ce qu\'il a posé', str_contains($depose, 'inscrireDepot('));

fermerGuichet();

titre('12 sexies. Se connecter, et rentrer quand on est enfermé dehors');

// Rémy, enfermé dehors sur son propre site : « mon mail et code ne
// fonctionnent pas ».

// LA CASSE DE L'ADRESSE. Personne au monde ne considère « Prof@College.fr » et
// « prof@college.fr » comme deux boîtes différentes — mais `WHERE email = ?` le
// faisait. Et comme le refus dit la même phrase dans les deux cas, exprès, il
// était impossible de comprendre qu'on s'était trompé de majuscule.
$r = json('/teacher/login', ['email' => 'prof@essai.test', 'password' => 'motdepassetreslong']);
verifier('la connexion du professeur fonctionne', $r['code'] === 200, $r['brut']);
$r = json('/teacher/login', ['email' => 'PROF@Essai.TEST', 'password' => 'motdepassetreslong']);
verifier('L\'ADRESSE NE DISTINGUE PLUS LES MAJUSCULES', $r['code'] === 200, $r['brut']);
$r = json('/teacher/login', ['email' => 'prof@essai.test', 'password' => 'MOTDEPASSETRESLONG']);
verifier('mais le mot de passe, lui, les distingue toujours', $r['code'] === 401);

// LA PAGE DE DÉPANNAGE. Elle ne fait rien tant qu'un fichier témoin n'est pas
// posé À LA MAIN dans api/ — ce qui demande le FTP, donc les identifiants de
// l'hébergement. Celui qui les a peut déjà tout écrire sur ce site : on
// n'ouvre aucune porte qui ne le soit déjà pour lui.
$temoin = $API . '/MOTDEPASSE-OUI';
@unlink($temoin);
$p = page('/motdepasse.php');
verifier('SANS LE TÉMOIN, la page de dépannage ne montre aucun compte',
    !str_contains($p['html'], 'Le compte à dépanner')
    && str_contains($p['html'], 'Prouvez d\'abord'));
verifier('et elle prévient du piège qui détruirait la base',
    str_contains($p['html'], 'Cela détruirait tout'),
    '« effacez config.php et réinstallez » perd la clé, donc toutes les données');

// Une tentative de changement SANS témoin ne doit rien changer.
$s = db()->prepare('SELECT password_hash FROM teachers WHERE id = ?');
$s->execute([$profId]);
$avant = (string) $s->fetchAll()[0]['password_hash'];
page('/motdepasse.php', ['prof' => $profId, 'mdp' => 'pirate123456', 'mdp2' => 'pirate123456']);
$s->execute([$profId]);
verifier('ET UNE DEMANDE ENVOYÉE À LA MAIN NE CHANGE RIEN NON PLUS',
    (string) $s->fetchAll()[0]['password_hash'] === $avant);

// Avec le témoin, en revanche, on peut se dépanner.
touch($temoin);
$p = page('/motdepasse.php');
verifier('avec le témoin, la page propose les comptes',
    str_contains($p['html'], 'Le compte à dépanner')
    && str_contains($p['html'], 'prof@essai.test'));
page('/motdepasse.php', ['prof' => $profId, 'mdp' => 'unmotdepasseneuf', 'mdp2' => 'unmotdepasseneuf']);

verifier('LE NOUVEAU MOT DE PASSE OUVRE',
    json('/teacher/login', ['email' => 'prof@essai.test', 'password' => 'unmotdepasseneuf'])['code'] === 200);
verifier('et l\'ancien ne vaut plus rien',
    json('/teacher/login', ['email' => 'prof@essai.test', 'password' => 'motdepassetreslong'])['code'] === 401);
verifier('LE TÉMOIN EST EFFACÉ — la porte se referme derrière soi',
    !is_file($temoin), 'sinon elle resterait entrebâillée et l\'on n\'y penserait plus');

// Ce qui compte le plus : la clé n'a pas bougé, donc les données se relisent.
$s = db()->prepare('SELECT first_name FROM students WHERE class_id = ? LIMIT 1');
$s->execute([$classeL]);
$prenom = $s->fetchAll()[0]['first_name'] ?? '';
verifier('ET LES DONNÉES SE DÉCHIFFRENT TOUJOURS',
    $prenom !== '' && dechiffrer($prenom) !== null,
    'un dépannage qui perd la clé rend la base illisible pour toujours');

// On remet le mot de passe d'origine : les sections suivantes s'en servent.
db()->prepare('UPDATE teachers SET password_hash = ? WHERE id = ?')
    ->execute([password_hash('motdepassetreslong', PASSWORD_DEFAULT), $profId]);

titre('12 quinquies. Le rapport ne dit aucun secret');

// Rémy : « fais une page avec toutes les infos dont tu as besoin ».
//
// UN RAPPORT DE DIAGNOSTIC EST FAIT POUR ÊTRE ENVOYÉ — par courriel, dans une
// conversation, peut-être à quelqu'un d'autre un jour. C'est précisément ce qui
// le rend dangereux : la page la plus utile du logiciel est aussi celle qui,
// mal écrite, publierait la clé de chiffrement en un clic.
//
// On ne relit donc pas le code pour s'en assurer : on OUVRE LA PAGE et l'on
// cherche les secrets dedans. La configuration d'essai porte des valeurs
// reconnaissables, et un élève au prénom improbable est en base.

$p = page('/admin/rapport.php');
verifier('la page de rapport s\'ouvre', str_contains($p['html'], 'RAPPORT ATOUTMATH'),
    'code ' . $p['code']);

$secret = (string) (config()['app_secret'] ?? '');
$cle    = (string) (config()['data_key'] ?? '');
verifier('LE SECRET DE SIGNATURE N\'Y EST PAS',
    $secret !== '' && !str_contains($p['html'], $secret));
verifier('LA CLÉ DE CHIFFREMENT N\'Y EST PAS',
    $cle === '' || !str_contains($p['html'], $cle));
verifier('mais leur LONGUEUR y est — c\'est ce qu\'on veut savoir',
    (bool) preg_match('/app_secret\s*:\s*\d+ signes/', $p['html']));

// Un prénom d'élève : le rapport compte, il ne nomme pas.
$r = json('/join', ['classCode' => 'FICHI1', 'firstName' => 'Zéphyrin Kwiatkowski']);
verifier('un élève au prénom reconnaissable est en base', ($r['json']['studentId'] ?? '') !== '');
$p = page('/admin/rapport.php');
verifier('AUCUN PRÉNOM D\'ÉLÈVE N\'Y EST',
    !str_contains($p['html'], 'Zéphyrin') && !str_contains($p['html'], 'Kwiatkowski'));
verifier('mais le NOMBRE d\'élèves y est',
    (bool) preg_match('/élèves\s*:\s*\d+/u', $p['html']));

// Le nom du fichier de base est tiré au hasard EXPRÈS : l'écrire dans un
// rapport qu'on colle quelque part annulerait cette précaution.
$fichier = basename((string) (config()['db_file'] ?? ''));
verifier('LE NOM DU FICHIER DE BASE N\'Y EST PAS',
    $fichier === '' || !str_contains($p['html'], $fichier), $fichier);

// Et ce qu'on lui demande vraiment doit y être.
foreach (['PHP', 'upload_max_filesize', 'pdo_sqlite', 'racine web', 'moteur de base'] as $attendu) {
    verifier("le rapport dit « $attendu »", str_contains($p['html'], $attendu));
}

// La page est réservée au professeur : la liste des extensions et des chemins
// d'un serveur est ce qu'un intrus regarde en premier.
$avant = $BAC . '/cookies.txt';
$garde = @file_get_contents($avant);
@unlink($avant);
$anonyme = page('/admin/rapport.php');
verifier('SANS CONNEXION, ON N\'OBTIENT PAS LE RAPPORT',
    !str_contains($anonyme['html'], 'RAPPORT ATOUTMATH'));
if ($garde !== false) {
    file_put_contents($avant, $garde);
}

titre('12 quater. La mise à jour répare une base déjà installée');

// L'EMPREINTE DU PRÉNOM A CHANGÉ DE DÉFINITION — elle trie les mots, pour que
// « NGUYÊN Maëlle » et « Maëlle Nguyên » désignent la même élève. Les
// empreintes DÉJÀ ÉCRITES, elles, ont été calculées autrement.
//
// Sans réparation, une base installée avant la mise à jour se retrouve avec des
// empreintes que plus aucune recherche ne retrouve : l'élève qui se rattache
// avec son prénom n'est pas reconnu, et l'on crée un second compte vierge à
// côté de celui qui a travaillé. C'est le bogue du doublon, ressuscité par sa
// propre correction — et cette fois sur les données réelles.

$classeM = uuidv4();
db()->prepare('INSERT INTO classes (id, teacher_id, name, join_code) VALUES (?, ?, ?, ?)')
    ->execute([$classeM, $profId, 'Migration', 'MIGRE1']);

// L'ancienne empreinte : la même, SANS le tri des mots.
$ancienne = static fn (string $nom): string => hash_hmac(
    'sha256', normaliserPrenom($nom),
    hash_hmac('sha256', 'index', cleDonnees(), true)
);

$idsM = [];
foreach (['Léa Durand', 'Tom Bernard', 'Maëlle Nguyên'] as $nom) {
    $idsM[$nom] = uuidv4();
    db()->prepare('INSERT INTO students (id, class_id, first_name, first_name_key, token_hash)
                   VALUES (?, ?, ?, ?, ?)')
        ->execute([$idsM[$nom], $classeM, chiffrer($nom), $ancienne($nom), hash('sha256', uuidv4())]);
}
// On efface la marque : la base redevient « celle d'avant la mise à jour ».
db()->prepare('DELETE FROM reglages WHERE cle = ?')->execute(['empreintes_prenom_triees']);

$retrouve = static function (string $nom) use ($classeM): int {
    $s = db()->prepare('SELECT COUNT(*) c FROM students WHERE class_id = ? AND first_name_key = ?');
    $s->execute([$classeM, empreintePrenom($nom)]);
    return (int) $s->fetchAll()[0]['c'];
};

verifier('AVANT, une base d\'hier a des empreintes introuvables',
    $retrouve('Léa Durand') === 0, 'sinon cet essai ne prouve rien');

migrer();   // c'est ce que fait la mise à jour, à la première visite

verifier('LA MISE À JOUR RÉPARE LES EMPREINTES', $retrouve('Léa Durand') === 1);
verifier('et les autres avec', $retrouve('Tom Bernard') === 1 && $retrouve('Maëlle Nguyên') === 1);
verifier('L\'ORDRE DES MOTS NE COMPTE PLUS — c\'était tout l\'objet',
    $retrouve('NGUYÊN Maëlle') === 1, 'la forme de Pronote doit retrouver l\'élève');

$s = db()->prepare('SELECT COUNT(*) c FROM students WHERE class_id = ?');
$s->execute([$classeM]);
verifier('aucun élève n\'a été dédoublé', (int) $s->fetchAll()[0]['c'] === 3);

// La réparation ne doit pas se rejouer : recalculer trente empreintes à chaque
// visite de l'administration serait du gaspillage, et la marque est là pour ça.
$s = db()->prepare('SELECT valeur FROM reglages WHERE cle = ?');
$s->execute(['empreintes_prenom_triees']);
verifier('la marque dit que c\'est fait, et combien', ($s->fetchAll()[0]['valeur'] ?? '') !== '');

migrer(); migrer();
$s = db()->prepare('SELECT COUNT(*) c FROM students WHERE class_id = ?');
$s->execute([$classeM]);
verifier('DEUX MIGRATIONS DE PLUS NE CASSENT RIEN', (int) $s->fetchAll()[0]['c'] === 3,
    'une migration doit pouvoir se rejouer sans fin');

titre('12 ter. Le dépôt d\'archive : ce qu\'il refuse d\'écrire');

// Rémy : « sur ovh j'ai une interface web pour le transfert de fichiers ? »
//
// `deposer.php` existe pour qu'un seul fichier passe par cette interface au
// lieu de cinq cents. Il écrit donc des fichiers PHP sur un site public — ce
// qu'un intrus rêve de trouver. Ses refus sont la seule chose qui le rende
// acceptable, et ils se vérifient ici plutôt que dans un navigateur.
//
// `DEPOSER_ESSAI` charge ses décisions sans afficher la page : un fichier qui
// ne s'exécute que tout entier ne se met pas à l'épreuve.
define('DEPOSER_ESSAI', true);
require_once dirname(__DIR__) . '/deposer.php';

$acceptes = [
    'index.html'               => 'index.html',
    'js/ui/fiches/nombres.js'  => 'js/ui/fiches/nombres.js',
    './api/index.php'          => 'api/index.php',
];
foreach ($acceptes as $donne => $attendu) {
    verifier("il accepte $donne", cheminSur($donne) === $attendu, (string) cheminSur($donne));
}

// LA FAILLE DITE « ZIP SLIP » : une entrée d'archive dont le nom remonte hors
// du dossier prévu. Elle a déjà servi à déposer des fichiers dans des dossiers
// système par de simples archives.
$refuses = [
    'la remontée par ../'        => '../../../etc/passwd',
    'un chemin absolu'           => '/etc/passwd',
    'une lettre de lecteur'      => 'C:\\windows\\x',
    'la remontée déguisée'       => 'a/../../b',
    'la remontée au milieu'      => 'api/../config.php',
    'LA CLÉ DE CHIFFREMENT'      => 'api/config.php',
    'LA BASE DES ÉLÈVES'         => 'api/data/atoutmath-1234.sqlite',
    'un nom vide'                => '',
];
foreach ($refuses as $quoi => $donne) {
    verifier("il refuse $quoi", cheminSur($donne) === null, (string) cheminSur($donne));
}

// Et il le fait aussi À L'ÉCRITURE, pas seulement à la lecture : on pose une
// vraie archive piégée dans un vrai dossier, et l'on regarde les dégâts.
if (class_exists('ZipArchive')) {
    $bacDepot = $BAC . '/depot';
    @mkdir($bacDepot . '/api/data', 0777, true);
    file_put_contents($bacDepot . '/api/config.php', 'LA VRAIE CONFIG');
    file_put_contents($bacDepot . '/api/data/base.sqlite', 'LA VRAIE BASE');

    $piege = $BAC . '/piege.zip';
    $z = new ZipArchive();
    $z->open($piege, ZipArchive::CREATE | ZipArchive::OVERWRITE);
    $z->addFromString('../evasion.txt', 'je suis sorti');
    $z->addFromString('api/config.php', 'volé');
    $z->addFromString('api/data/base.sqlite', 'écrasée');
    $z->addFromString('legitime.txt', 'ok');
    $z->close();

    $lu = lireArchive($piege);
    verifier("l'aperçu ne retient qu'une entrée sur quatre",
        count($lu['fichiers']) === 1 && count($lu['refuses']) === 3,
        count($lu['fichiers']) . ' gardée(s), ' . count($lu['refuses']) . ' refusée(s)');

    // `poserArchive` écrit dans RACINE_SITE, qui est le dépôt lui-même : on ne
    // peut donc pas la lancer telle quelle ici. On rejoue la même boucle, avec
    // la même fonction de décision — c'est elle qui protège, et c'est elle
    // qu'on met à l'épreuve.
    $z = new ZipArchive();
    $z->open($piege);
    $ecrits = 0;
    for ($i = 0; $i < $z->numFiles; $i++) {
        $sur = cheminSur((string) $z->getNameIndex($i));
        if ($sur === null) {
            continue;
        }
        @mkdir(dirname($bacDepot . '/' . $sur), 0777, true);
        file_put_contents($bacDepot . '/' . $sur, (string) $z->getFromIndex($i));
        $ecrits++;
    }
    $z->close();

    verifier('un seul fichier est écrit', $ecrits === 1, (string) $ecrits);
    verifier("AUCUNE ÉVASION hors du dossier", !is_file(dirname($bacDepot) . '/evasion.txt'));
    verifier('LA CLÉ DE CHIFFREMENT EST INTACTE',
        file_get_contents($bacDepot . '/api/config.php') === 'LA VRAIE CONFIG');
    verifier('LA BASE DES ÉLÈVES EST INTACTE',
        file_get_contents($bacDepot . '/api/data/base.sqlite') === 'LA VRAIE BASE');
    verifier('et le fichier légitime, lui, est bien écrit',
        is_file($bacDepot . '/legitime.txt'));
}

// Une archive qui n'en est pas une ne doit pas faire tomber la page.
file_put_contents($BAC . '/pasunzip.zip', 'ceci est du texte');
$lu = lireArchive($BAC . '/pasunzip.zip');
verifier("une archive abîmée est refusée avec une phrase, pas une erreur",
    $lu['erreur'] !== '' && $lu['fichiers'] === [], $lu['erreur']);

titre('12 octies. Deux professeurs sur le même serveur');

// LA CLOISON ENTRE COLLÈGUES, ET POURQUOI ELLE SE VÉRIFIE MAINTENANT.
//
// Rémy : « Ce serait quoi idéalement pour toi, le modèle, un prof qui gère un
// établissement, une équipe, on se répartit les classes ou quoi faire dans un
// premier temps ». Il est seul sur son serveur aujourd'hui. Le jour où un
// collègue s'y installe, la question devient : que peut-il voir, et que
// peut-il changer, de ce qui n'est pas à lui ?
//
// TROIS PORTES ÉTAIENT OUVERTES, mesurées sur ce serveur-ci :
//   · `/teacher/assign` vérifiait que le PARCOURS était à nous, jamais la
//     CLASSE ni l'ÉLÈVE à qui on le donnait — donc B pouvait poser du travail
//     dans la classe de A, et les élèves de A l'auraient reçu à la synchro
//     suivante sans que personne ne puisse dire d'où il venait ;
//   · `/teacher/paths` en `save` faisait un `ON CONFLICT(id) DO UPDATE` qui ne
//     regardait que l'identifiant : B, connaissant l'identifiant d'un parcours
//     de A, en réécrivait le contenu — et `teacher_id` ne bougeant pas, A
//     restait propriétaire d'un parcours qui n'était plus le sien ;
//   · `/teacher/student` rendait 500 (et non 404) sur l'élève d'un autre :
//     `fetch()` rend `false`, que `eleveLisible(?array)` refuse en mode strict.
//     Rien ne fuyait, mais « le serveur est cassé » n'est pas la réponse à
//     « cet élève n'est pas le vôtre ».
//
// Ces vérifications ne coûtent rien à un professeur seul. Elles coûteraient
// très cher à ne pas avoir le premier jour où ils sont deux.

$autreId = uuidv4();
db()->prepare('INSERT INTO teachers (id, display_name, email, password_hash) VALUES (?, ?, ?, ?)')
    ->execute([$autreId, 'Collègue', 'collegue@essai.test',
               password_hash('unautremotdepasse', PASSWORD_DEFAULT)]);

// LE COMPTEUR DE DÉBIT N'EST PAS CE QU'ON MESURE ICI. `/teacher/login` est
// limité à dix appels par minute et par adresse (api/index.php), et les
// sections précédentes en ont déjà usé — dont trois exprès avec de mauvais mots
// de passe. Sans ce coup d'éponge, les deux connexions ci-dessous rendaient 429
// et toute la section échouait pour une raison qui n'a rien à voir avec les
// cloisons. On remet donc le compteur à zéro, et on le laisse compter la suite.
$tribu = substr(hash('sha256', (string) (config()['app_secret'] ?? '')), 0, 12);
foreach (glob(sys_get_temp_dir() . '/atoutmath_rl_' . $tribu . '/*') ?: [] as $f) {
    @unlink($f);
}

$jetonNotre = json('/teacher/login',
    ['email' => 'prof@essai.test', 'password' => 'motdepassetreslong'])['json']['token'] ?? '';
$jetonAutre = json('/teacher/login',
    ['email' => 'collegue@essai.test', 'password' => 'unautremotdepasse'])['json']['token'] ?? '';
verifier('les deux professeurs obtiennent chacun leur jeton',
    $jetonNotre !== '' && $jetonAutre !== '');

// Le décor : une classe et un parcours à NOUS, un parcours à LUI.
$notreClasse = json('/teacher/classes',
    ['action' => 'create', 'name' => 'Classe à garder'], $jetonNotre)['json']['classes'][0]['id'] ?? '';
$notreParcours = json('/teacher/paths', ['action' => 'save',
    'path' => ['name' => 'Parcours à garder', 'version' => 2, 'steps' => []]],
    $jetonNotre)['json']['pathId'] ?? '';
$sonParcours = json('/teacher/paths', ['action' => 'save',
    'path' => ['name' => 'Parcours du collègue', 'version' => 2, 'steps' => []]],
    $jetonAutre)['json']['pathId'] ?? '';
verifier('le décor est planté (une classe, deux parcours)',
    $notreClasse !== '' && $notreParcours !== '' && $sonParcours !== '');

verifier('le collègue ne lit pas le bilan de notre classe',
    json('/teacher/report', ['classId' => $notreClasse], $jetonAutre)['code'] === 404);

verifier('le collègue ne donne pas de travail à notre classe',
    json('/teacher/assign',
        ['pathId' => $sonParcours, 'classId' => $notreClasse], $jetonAutre)['code'] === 404);

// L'élève existe vraiment : c'est le sien qu'on protège, pas une ligne vide.
$eleveATester = db()->query(
    "SELECT s.id FROM students s LIMIT 1")->fetchColumn();
if ($eleveATester) {
    verifier('le collègue ne lit pas le détail d\'un de nos élèves',
        json('/teacher/student', ['studentId' => $eleveATester], $jetonAutre)['code'] === 404);
    verifier('le collègue ne donne pas de travail à un de nos élèves',
        json('/teacher/assign',
            ['pathId' => $sonParcours, 'studentId' => $eleveATester], $jetonAutre)['code'] === 404);
}

// L'écrasement par identifiant : la porte la plus discrète des trois.
json('/teacher/paths', ['action' => 'save',
    'path' => ['id' => $notreParcours, 'name' => 'ÉCRASÉ', 'version' => 2, 'steps' => []]],
    $jetonAutre);
$s = db()->prepare('SELECT name, teacher_id FROM paths WHERE id = ?');
$s->execute([$notreParcours]);
$apres = $s->fetch() ?: [];
verifier('le collègue n\'écrase pas notre parcours par son identifiant',
    ($apres['name'] ?? '') === 'Parcours à garder', 'nom en base : ' . ($apres['name'] ?? '?'));

// Et l'on vérifie que la fermeture n'a rien cassé pour le professeur légitime.
verifier('nous, en revanche, donnons bien du travail à notre classe',
    json('/teacher/assign',
        ['pathId' => $notreParcours, 'classId' => $notreClasse], $jetonNotre)['code'] === 200);
verifier('et nous modifions bien notre propre parcours',
    json('/teacher/paths', ['action' => 'save',
        'path' => ['id' => $notreParcours, 'name' => 'Parcours retouché',
                   'version' => 2, 'steps' => []]], $jetonNotre)['code'] === 200);

// Une assignation qui ne vise personne n'a jamais servi à rien : elle restait
// en base sans jamais être lue, et l'écran disait pourtant « donné ».
verifier('une assignation sans classe ni élève est refusée',
    json('/teacher/assign', ['pathId' => $notreParcours], $jetonNotre)['code'] === 400);

titre('12 nonies. L\'espace professeur, depuis l\'application');

// TOUT CE QUI SE FAISAIT DANS `api/admin/` SE FAIT MAINTENANT AUSSI D'ICI.
//
// Rémy : « en fait j'aimerai ne pas passer par admin et dans atout math sans
// passer par la zone admin ». Il ne le pouvait pas : les pages
// d'administration s'ouvrent avec un cookie de session PHP, que le jeton de
// l'application n'obtient pas — et surtout, TOUS les gestes qui écrivent
// n'existaient que là-bas. L'API savait créer une classe, et rien d'autre.
//
// CE QUI COMPTE ICI N'EST PAS QUE LES ROUTES RÉPONDENT : c'est qu'elles
// répondent LA MÊME CHOSE que les pages. Elles appellent les mêmes fonctions —
// `lib/eleves.php` — et ces vérifications-là sont ce qui empêchera qu'un jour
// l'une des deux se mette à faire autrement.

// ON PREND LA CLASSE QUE LE SERVEUR DIT AVOIR CRÉÉE, et non la première de la
// liste : le tri se fait sur une date à la seconde, et deux classes créées dans
// la même seconde se départagent au hasard. Mesuré ici même — l'essai collait
// ses trente élèves dans la classe d'une section précédente.
$cl = json('/teacher/classes', ['action' => 'create', 'name' => 'Classe de l\'app'],
    $jetonNotre)['json']['creee'] ?? [];
$idApp = $cl['id'] ?? '';
verifier('l\'application crée une classe et reçoit son code', $idApp !== '' && !empty($cl['join_code']));

// --- La liste : coller, prévoir, écrire ---
$r = json('/teacher/roster', ['classId' => $idApp, 'action' => 'list'], $jetonNotre);
verifier('la liste part vide, avec un code proposé d\'avance',
    $r['code'] === 200 && $r['json']['eleves'] === [] && !empty($r['json']['codePropose']));

$colle = "DUPONT;Emma\nNGUYÊN;Maëlle\nBernard Tom;tom.b;7777\n";
$ap = json('/teacher/roster',
    ['classId' => $idApp, 'action' => 'apercu', 'texte' => $colle], $jetonNotre)['json']['apercu'] ?? [];
verifier('l\'aperçu lit les trois lignes et fabrique les identifiants',
    count($ap['lignes'] ?? []) === 3
    && ($ap['lignes'][0]['login'] ?? '') !== '' && ($ap['lignes'][0]['sort'] ?? '') === 'nouveau');
verifier('L\'APERÇU N\'ÉCRIT RIEN',
    json('/teacher/roster', ['classId' => $idApp, 'action' => 'list'], $jetonNotre)['json']['eleves'] === []);

$r = json('/teacher/roster',
    ['classId' => $idApp, 'action' => 'importer', 'liste' => $ap['texte']], $jetonNotre);
$listeApp = $r['json']['eleves'] ?? [];
verifier('l\'import écrit les trois élèves, chacun avec son billet',
    count($listeApp) === 3
    && !array_filter($listeApp, fn ($e) => $e['login'] === '' || $e['code'] === ''),
    $r['json']['dit'] ?? '');
verifier('le code écrit dans la liste est respecté',
    (bool) array_filter($listeApp, fn ($e) => $e['login'] === 'tom.b' && $e['code'] === '7777'));

// Recoller la même liste : c'est le geste qu'un professeur fait sans y penser,
// et il ne doit rien casser — ni doubler les élèves, ni refaire leurs codes.
$ap2 = json('/teacher/roster',
    ['classId' => $idApp, 'action' => 'apercu', 'texte' => $colle], $jetonNotre)['json']['apercu'];
verifier('recoller la même liste annonce « déjà là » pour les trois',
    count(array_filter($ap2['lignes'], fn ($l) => $l['sort'] === 'connu')) === 3);

$avant = $listeApp[0]['code'];
$r = json('/teacher/roster',
    ['classId' => $idApp, 'action' => 'code', 'studentId' => $listeApp[0]['id']], $jetonNotre);
verifier('un nouveau code pour un seul élève',
    (($r['json']['eleves'][0]['code'] ?? '') !== $avant));

$r = json('/teacher/roster',
    ['classId' => $idApp, 'action' => 'codes', 'codeCommun' => 'RENTREE'], $jetonNotre);
verifier('le même code pour toute la classe — « un mdp générique pour tous mes élèves »',
    count(array_unique(array_column($r['json']['eleves'], 'code'))) === 1
    && $r['json']['eleves'][0]['code'] === 'RENTREE');
verifier('un code commun impossible est refusé',
    json('/teacher/roster',
        ['classId' => $idApp, 'action' => 'codes', 'codeCommun' => 'a b'], $jetonNotre)['code'] === 400);

verifier('retirer un élève le retire vraiment',
    count(json('/teacher/roster',
        ['classId' => $idApp, 'action' => 'retirer', 'studentId' => $listeApp[2]['id']],
        $jetonNotre)['json']['eleves']) === 2);

// --- Conduire la classe ---
verifier('renommer une classe',
    json('/teacher/class',
        ['classId' => $idApp, 'action' => 'rename', 'name' => 'Classe renommée'], $jetonNotre)['code'] === 200);
verifier('mettre la classe en pause',
    json('/teacher/class',
        ['classId' => $idApp, 'action' => 'lock', 'locked' => true], $jetonNotre)['json']['locked'] === true);
verifier('poser une consigne',
    json('/teacher/class',
        ['classId' => $idApp, 'action' => 'notice', 'notice' => 'Exercice 3 page 42'], $jetonNotre)['code'] === 200);
$r = json('/teacher/roster', ['classId' => $idApp, 'action' => 'list'], $jetonNotre);
verifier('et tout cela se relit',
    ($r['json']['classe']['name'] ?? '') === 'Classe renommée'
    && ($r['json']['classe']['locked'] ?? null) === true
    && ($r['json']['classe']['notice'] ?? '') === 'Exercice 3 page 42');

// --- Le direct et les mots ---
$r = json('/teacher/live', ['classId' => $idApp], $jetonNotre);
verifier('le direct rend les rangs ET l\'heure du serveur',
    // L'heure vient du SERVEUR et non du navigateur : « en ligne » se décide en
    // comparant deux instants, et une tablette mal réglée ferait autrement
    // disparaître toute la classe de l'écran.
    $r['code'] === 200 && count($r['json']['eleves'] ?? []) === 2
    && ($r['json']['maintenant'] ?? 0) > 1000000000);

$resteApp = json('/teacher/roster', ['classId' => $idApp, 'action' => 'list'], $jetonNotre)['json']['eleves'];
verifier('un mot à toute la classe',
    json('/teacher/message', ['classId' => $idApp, 'body' => 'On commence page 42.'], $jetonNotre)['code'] === 200);
verifier('un mot à un seul élève',
    json('/teacher/message',
        ['classId' => $idApp, 'studentId' => $resteApp[0]['id'], 'body' => 'Viens me voir.'], $jetonNotre)['code'] === 200);
verifier('les mots se relisent, avec pour qui ils étaient',
    count(json('/teacher/message', ['classId' => $idApp, 'action' => 'list'], $jetonNotre)['json']['messages']) === 2);
verifier('un mot vide est refusé',
    json('/teacher/message', ['classId' => $idApp, 'body' => '   '], $jetonNotre)['code'] === 400);

// --- Ce qu'un autre professeur ne peut pas faire de ces routes-là non plus ---
verifier('le collègue ne lit pas la liste de cette classe',
    json('/teacher/roster', ['classId' => $idApp, 'action' => 'list'], $jetonAutre)['code'] === 404);
verifier('le collègue ne voit pas son direct',
    json('/teacher/live', ['classId' => $idApp], $jetonAutre)['code'] === 404);
verifier('le collègue ne lui écrit pas',
    json('/teacher/message', ['classId' => $idApp, 'body' => 'coucou'], $jetonAutre)['code'] === 404);
verifier('le collègue ne la supprime pas',
    json('/teacher/class',
        ['classId' => $idApp, 'action' => 'delete', 'confirmation' => 'EFFACER'], $jetonAutre)['code'] === 404);

// --- Les deux gestes sans retour demandent le mot écrit ---
verifier('vider sans écrire EFFACER est refusé',
    json('/teacher/class', ['classId' => $idApp, 'action' => 'empty'], $jetonNotre)['code'] === 400);
verifier('avec le mot écrit, la classe se vide et reste',
    json('/teacher/class',
        ['classId' => $idApp, 'action' => 'empty', 'confirmation' => 'EFFACER'], $jetonNotre)['code'] === 200
    && json('/teacher/roster', ['classId' => $idApp, 'action' => 'list'], $jetonNotre)['json']['eleves'] === []);
verifier('et la supprimer la fait disparaître',
    (json('/teacher/class',
        ['classId' => $idApp, 'action' => 'delete', 'confirmation' => 'EFFACER'],
        $jetonNotre)['json']['supprimee'] ?? false) === true
    && json('/teacher/roster', ['classId' => $idApp, 'action' => 'list'], $jetonNotre)['code'] === 404);

// UNE ACTION INCONNUE N'EST PAS UNE LISTE. Mesuré avant correction :
// `{action:"delete"}` sur /teacher/classes rendait 200 avec la liste, et la
// classe existait toujours. Un écran qui aurait cru supprimer aurait affiché
// « supprimé » sans que rien ne le soit.
verifier('une action inconnue sur /teacher/classes est refusée, pas avalée',
    json('/teacher/classes', ['action' => 'delete'], $jetonNotre)['code'] === 400);

titre('12 decies. Créer un second professeur');

// Rémy : « oui j'ai un compte admin mais pas un compte professeur, comment
// j'ajoute un prof », puis « que je puisse créer un professeur ».
//
// IL N'Y AVAIT AUCUN CHEMIN : `install.php` refuse de tourner deux fois,
// `motdepasse.php` dépanne mais ne crée pas, `tools/admin.php` veut la ligne de
// commande. Le droit d'en créer un appartient à un professeur DÉJÀ en place :
// pas d'inscription libre sur un serveur de classe.

verifier('sans jeton, personne ne crée de professeur',
    json('/teacher/signup',
        ['displayName' => 'X', 'email' => 'x@y.fr', 'password' => 'douzecaracteres'])['code'] === 401);
verifier('un mot de passe de moins de douze signes est refusé',
    json('/teacher/signup',
        ['displayName' => 'Alice', 'email' => 'alice@essai.test', 'password' => 'court'],
        $jetonNotre)['code'] === 400);
verifier('une adresse qui n\'en est pas une est refusée',
    json('/teacher/signup',
        ['displayName' => 'Alice', 'email' => 'pas-une-adresse', 'password' => 'douzecaracteres'],
        $jetonNotre)['code'] === 400);
verifier('le professeur est créé',
    json('/teacher/signup',
        ['displayName' => 'Alice Martin', 'email' => 'Alice@Essai.TEST', 'password' => 'douzecaracteres'],
        $jetonNotre)['code'] === 200);
verifier('la même adresse, écrite autrement, est refusée ensuite',
    json('/teacher/signup',
        ['displayName' => 'Bis', 'email' => 'alice@essai.test', 'password' => 'douzecaracteres'],
        $jetonNotre)['code'] === 409);
$jetonAlice = json('/teacher/login',
    ['email' => 'alice@essai.test', 'password' => 'douzecaracteres'])['json']['token'] ?? '';
verifier('et il se connecte avec son adresse, quelle qu\'en soit la casse', $jetonAlice !== '');
verifier('le professeur créé commence avec zéro classe',
    json('/teacher/classes', ['action' => 'list'], $jetonAlice)['json']['classes'] === []);

titre('13. Le fichier tel qu\'on l\'emporterait');

// LA VÉRIFICATION QUI COMPTE, ET LA SEULE QUI PROUVE QUELQUE CHOSE : on ouvre le
// fichier de base avec un éditeur de texte, comme le ferait celui qui l'a
// récupéré, et l'on cherche ce qui devrait être illisible. Si on le trouve,
// tout le chiffrement est décoratif.
//
// ELLE PASSE EN DERNIER, ET C'EST NÉCESSAIRE. Lire le fichier pendant que deux
// processus l'utilisent laisse la connexion dans un état où l'écriture suivante
// rend « database disk image is malformed » — mesuré, l'essai mourait trois
// sections plus loin sur une insertion banale, et l'on cherchait le défaut dans
// l'administration. Ici, plus personne n'écrit : on peut regarder.
$octets = (string) @file_get_contents($BAC . '/essai.sqlite')
        . (string) @file_get_contents($BAC . '/essai.sqlite-wal');

verifier('le fichier porte bien des blocs chiffrés', str_contains($octets, 'v1:'));
foreach ([
    'un prénom d\'élève'          => 'Anastasia',
    'la réponse d\'un élève'      => 'quarante-deux-mille',
    'un mot du professeur'        => 'soustraction',
    'un identifiant de la liste'  => 'emma.dupont',
    'un code de billet'           => '4KP2',
] as $quoi => $mot) {
    verifier("$quoi n'est pas lisible dans le fichier", !str_contains($octets, $mot),
        "« $mot » trouvé en clair");
}

// --------------------------------------------------------------- Le bilan ---

echo "\n" . str_repeat('─', 60) . "\n";
if ($echecs) {
    echo "\033[31m" . count($echecs) . " échec(s)\033[0m sur " . ($reussis + count($echecs)) . " vérifications :\n";
    foreach ($echecs as $e) {
        echo "  · $e\n";
    }
    echo "\nJournal du serveur : " . $BAC . "/serveur.log\n";
    exit(1);
}
echo "\033[32mTout passe\033[0m — $reussis vérifications.\n";
exit(0);
