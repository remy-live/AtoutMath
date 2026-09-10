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

// ON LIT LE FICHIER **ET SON JOURNAL WAL**.
//
// SQLite écrit d'abord dans un journal `-wal` à côté, et ne le replie dans le
// fichier principal que de temps en temps : ne regarder que le fichier
// principal ferait passer ce test pour de mauvaises raisons, puisque les
// écritures récentes n'y sont pas encore. Et surtout, celui qui récupère le
// dossier récupère les deux — c'est donc les deux qu'il faut fouiller.
//
// (On a d'abord essayé un `wal_checkpoint(TRUNCATE)` pour n'avoir qu'un
// fichier à lire. Mauvaise idée : le serveur d'essai tient la base ouverte en
// même temps, et le repli sous ses pieds lui rendait « database disk image is
// malformed ». Lire les deux fichiers ne touche à rien.)
$octets = (string) @file_get_contents($BAC . '/essai.sqlite')
        . (string) @file_get_contents($BAC . '/essai.sqlite-wal');

verifier('LE PRÉNOM N\'EST PAS LISIBLE DANS LE FICHIER',
    !str_contains($octets, 'Anastasia'), 'trouvé en clair');
verifier('LA RÉPONSE DE L\'ÉLÈVE N\'EST PAS LISIBLE',
    !str_contains($octets, 'quarante-deux-mille'), 'trouvée en clair');
verifier('LE MOT DU PROFESSEUR N\'EST PAS LISIBLE',
    !str_contains($octets, 'soustraction'), 'trouvé en clair');
verifier('le fichier porte bien des blocs chiffrés', str_contains($octets, 'v1:'));

// … mais l'application, elle, lit tout normalement.
$s = db()->prepare('SELECT first_name FROM students WHERE id = ?');
$s->execute([$eleveC['id']]);
verifier('le serveur relit le prénom sans peine',
    dechiffrer($s->fetch()['first_name']) === 'Anastasia');

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

db()->prepare('DELETE FROM classes WHERE id = ?')->execute([$classeCoffre]);

titre('9. La page de santé sait reconnaître une fuite');

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

titre('10. La conservation limitée');

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
verifier('et garde le récent',
    (int) db()->query('SELECT COUNT(*) c FROM events')->fetch()['c'] === 1);
verifier('elle ne repasse pas le même jour', purgerSiNecessaire() === 0);
@unlink($API . '/.derniere-purge');

// ------------------------------------------------------------ Le schéma -----

titre('11. Le schéma se remet à niveau sans rien casser');

$avant = (int) db()->query('SELECT COUNT(*) c FROM events')->fetch()['c'];
migrer();
migrer();
verifier('migrer() est idempotent', (int) db()->query('SELECT COUNT(*) c FROM events')->fetch()['c'] === $avant);

$tables = array_column(db()->query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
)->fetchAll(), 'name');
verifier('les dix tables sont là',
    $tables === ['assignments', 'classes', 'events', 'message_reads', 'messages',
                 'overrides', 'paths', 'student_tokens', 'students', 'teachers'],
    implode(', ', $tables));

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
