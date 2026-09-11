<?php
declare(strict_types=1);

/**
 * LE DIAGNOSTIC DE L'INSTALLATION — la décision, séparée de l'affichage.
 *
 * Pourquoi ces fonctions vivent ici plutôt que dans la page qui les montre :
 * PARCE QU'UN DÉTECTEUR DOIT ÊTRE ESSAYÉ DEVANT UNE VRAIE FUITE.
 *
 * Le contrôle demande au serveur d'aller chercher ses propres fichiers par le
 * web. Tant que ce raisonnement était mêlé au HTML de la page, on ne pouvait
 * l'essayer qu'en fabriquant un hébergement qui fuit — c'est-à-dire jamais. Ici,
 * on lui donne une réponse HTTP inventée et l'on regarde ce qu'il en conclut :
 * `tools/testApi.php` lui présente un fichier SQLite servi en 200, et vérifie
 * qu'il crie. Un détecteur qui ne détecte rien est pire que pas de détecteur du
 * tout — il rassure.
 *
 * ET IL DIT « JE NE SAIS PAS » QUAND IL NE SAIT PAS. Certains hébergements
 * interdisent au serveur de s'appeler lui-même ; la réponse est alors « je n'ai
 * pas pu vérifier », jamais « c'est protégé ». Un contrôle qui verdit par défaut
 * ne vaut rien.
 */

require_once __DIR__ . '/db.php';

/** Un constat : « ok » vert, « ! » orange, « x » rouge, « ? » indéterminé. */
function constat(string $etat, string $quoi, string $dit, string $quefaire = ''): array
{
    return ['etat' => $etat, 'quoi' => $quoi, 'dit' => $dit, 'faire' => $quefaire];
}

/** L'adresse publique du dossier `api/`, telle que le monde la voit. */
function adresseApi(): string
{
    $https = (($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $hote = $_SERVER['HTTP_HOST'] ?? 'localhost';
    // SCRIPT_NAME vaut « /…/api/admin/sante.php » : deux crans plus haut, c'est
    // le dossier `api/`.
    $dossier = rtrim(str_replace('\\', '/',
        dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/api/admin/x.php'))), '/');
    return ($https ? 'https' : 'http') . '://' . $hote . $dossier;
}

/** La page est-elle servie en HTTPS ? */
function enHttps(): bool
{
    return (($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

/**
 * Aller chercher une de ses propres adresses, comme le ferait un inconnu.
 *
 * @return array{code:int,corps:string,erreur:string}
 */
function allerVoir(string $url): array
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 6,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_FOLLOWLOCATION => false,
            // On ne cherche PAS à valider le certificat : la question posée est
            // « ce fichier est-il servi ? », pas « le certificat est-il bon ».
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => 0,
            // 4 Ko suffisent : on veut reconnaître un début de fichier, pas
            // rapatrier une base de données entière dans une page web.
            CURLOPT_RANGE          => '0-4095',
            CURLOPT_USERAGENT      => 'AtoutMath/controle',
        ]);
        $corps = curl_exec($ch);
        $err = curl_error($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return ['code' => $code, 'corps' => (string) $corps, 'erreur' => $err];
    }
    $ctx = stream_context_create([
        'http' => ['timeout' => 6, 'ignore_errors' => true],
        'ssl'  => ['verify_peer' => false, 'verify_peer_name' => false],
    ]);
    $corps = @file_get_contents($url, false, $ctx, 0, 4096);
    $code = 0;
    foreach ($http_response_header ?? [] as $l) {
        if (preg_match('#^HTTP/\S+\s+(\d{3})#', $l, $m)) {
            $code = (int) $m[1];
        }
    }
    return ['code' => $code, 'corps' => (string) $corps,
            'erreur' => $corps === false ? 'requête impossible' : ''];
}

/**
 * S'INTERROGER SOI-MÊME AVEC UN JETON, et regarder s'il arrive.
 *
 * C'est la seule façon de savoir, sur CE serveur-ci, si l'en-tête
 * `Authorization` parvient jusqu'à PHP. On ne peut pas le déduire de la version
 * d'Apache ni de celle de PHP : cela dépend du module qui les relie et des
 * réglages de l'hébergeur. Alors on essaie pour de bon.
 *
 * @return array{code:int,corps:string,erreur:string}
 */
function allerVoirAvecJeton(string $url, string $jeton, array $corpsJson = []): array
{
    if (!function_exists('curl_init')) {
        // `file_get_contents` sait poser un en-tête, mais pas lire le code de
        // retour proprement partout. Sans curl on ne mesure pas — et l'on dit
        // « je ne sais pas » plutôt que d'inventer un verdict.
        return ['code' => 0, 'corps' => '', 'erreur' => 'curl absent'];
    }
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($corpsJson, JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json',
                                   'Authorization: Bearer ' . $jeton],
        CURLOPT_TIMEOUT        => 6,
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
        CURLOPT_USERAGENT      => 'AtoutMath/controle',
    ]);
    $corps = curl_exec($ch);
    $err = curl_error($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'corps' => (string) $corps, 'erreur' => $err];
}

/**
 * L'EN-TÊTE D'AUTORISATION ARRIVE-T-IL ?
 *
 * LA PANNE QUI NE SE VOIT NULLE PART. Quand PHP tourne en CGI, FastCGI ou
 * php-fpm — la quasi-totalité des hébergements mutualisés —, Apache garde
 * l'en-tête `Authorization` pour lui et ne le transmet pas. On se connecte
 * alors parfaitement — le mot de passe voyage dans le CORPS de la requête —, on
 * reçoit un jeton, et tout appel suivant est refusé.
 *
 * CE QUE LE PROFESSEUR VOIT : « identifiez-vous » à la seconde où il vient de
 * s'identifier, ses classes introuvables, et — bien pire, parce que silencieux —
 * les élèves qui travaillent sans que rien ne remonte jamais.
 *
 * On ne pouvait pas le deviner : aucune page n'était en échec, aucun journal ne
 * disait rien. D'où cette sonde, qui ESSAIE plutôt que de supposer.
 */
function verdictAutorisation(array $r): array
{
    if ($r['code'] === 200) {
        return constat('ok', "L'en-tête d'autorisation",
            'il parvient jusqu\'à PHP — professeurs et élèves peuvent se connecter');
    }
    if ($r['code'] === 401 || $r['code'] === 403) {
        return constat('x', "L'en-tête d'autorisation",
            'il est perdu en route (réponse ' . $r['code'] . ')',
            "C'est Apache qui le garde pour lui, ce qu'il fait par défaut quand PHP tourne en "
            . "CGI ou php-fpm. Conséquence : vous vous connectez, puis tout vous est refusé — "
            . "et les élèves travaillent sans que rien ne remonte. Le fichier api/.htaccess "
            . "livré avec cette version le répare (trois règles, selon ce que votre hébergeur "
            . "autorise) : vérifiez qu'il est bien présent et à jour. S'il l'est déjà et que "
            . "ce constat reste rouge, demandez à l'hébergeur d'activer « CGIPassAuth » ou de "
            . "transmettre l'en-tête Authorization.");
    }
    if ($r['erreur'] !== '' || $r['code'] === 0) {
        return constat('?', "L'en-tête d'autorisation",
            'vérification impossible (' . ($r['erreur'] ?: 'pas de réponse') . ')',
            "Le serveur n'arrive pas à s'interroger lui-même ; cela n'a rien à voir avec le "
            . "site vu de l'extérieur.");
    }
    return constat('!', "L'en-tête d'autorisation",
        'réponse inattendue (' . $r['code'] . ')',
        "Ni un refus ni un accord : regardez ce que répond /api/teacher/classes.");
}

/** Le fichier de base est-il rangé DANS le dossier servi par le web ? */
function baseDansLeWeb(): bool
{
    if (dbPilote() !== 'sqlite') {
        return false;
    }
    $fichier = realpath((string) (config()['db_file'] ?? ''))
        ?: (string) (config()['db_file'] ?? '');
    $api = realpath(dirname(__DIR__)) ?: dirname(__DIR__);
    return $fichier !== '' && str_starts_with($fichier, $api . DIRECTORY_SEPARATOR);
}

/**
 * LA QUESTION QUI COMPTE VRAIMENT : peut-on télécharger la base ?
 *
 * @param array $r         la réponse rendue par allerVoir()
 * @param string $url      l'adresse essayée, à répéter à l'utilisateur
 * @param bool $dansLeWeb  la base est-elle rangée sous le dossier `api/` ?
 */
function verdictBase(array $r, string $url, bool $dansLeWeb = true): array
{
    $quoi = 'Le fichier de base est-il téléchargeable ?';

    // Rangée hors de la racine web : aucune adresse ne peut y mener. C'est la
    // meilleure situation, et il faut le dire pour la BONNE raison — sinon un
    // « 404 » se lirait comme « protégé » alors qu'il veut dire « ailleurs ».
    if (!$dansLeWeb) {
        return constat('ok', $quoi,
            'non — la base est rangée hors du dossier servi par le web');
    }
    if ($r['code'] === 0) {
        return constat('?', $quoi,
            "impossible de vérifier — le serveur n'a pas pu s'appeler lui-même"
            . ($r['erreur'] ? ' (' . $r['erreur'] . ')' : ''),
            "Beaucoup d'hébergements interdisent cela, et ce n'est pas un défaut. "
            . "Vérifiez-le vous-même : ouvrez <code>" . htmlspecialchars($url, ENT_QUOTES) . "</code> "
            . "dans un navigateur. Vous devez obtenir une erreur, jamais un téléchargement.");
    }
    if (in_array($r['code'], [401, 403, 404], true)) {
        return constat('ok', $quoi, 'non — le serveur répond ' . $r['code']);
    }
    // La signature d'un fichier SQLite. C'est le constat qui ne pardonne pas.
    if (str_starts_with($r['corps'], 'SQLite format 3')) {
        return constat('x', $quoi,
            "OUI. N'IMPORTE QUI PEUT REPARTIR AVEC LA BASE.",
            "C'est le seul défaut vraiment grave de cette page. Le contenu est chiffré, "
            . "donc les prénoms restent illisibles — mais cela ne doit pas rester ainsi. "
            . "Votre hébergeur n'applique pas le fichier <code>api/data/.htaccess</code>. "
            . "Sous Nginx, ajoutez <code>location ~ /api/data/ { deny all; }</code>. "
            . "Sous Apache, demandez <code>AllowOverride All</code>. En attendant, "
            . "déplacez la base hors de la racine web (<code>db_file</code> dans config.php).");
    }
    return constat('!', $quoi,
        'le serveur répond ' . $r['code'] . ' — ni un refus, ni le fichier',
        'Ouvrez <code>' . htmlspecialchars($url, ENT_QUOTES) . '</code> pour voir ce qui est servi.');
}

/**
 * La configuration porte le secret de signature et la clé de chiffrement.
 *
 * TROIS ISSUES, ET LA NUANCE DU MILIEU EST LA PLUS UTILE. Un 200 ne veut pas
 * dire « fuite » : quand PHP exécute `config.php`, celui-ci se contente de
 * rendre un tableau et n'affiche rien — le corps revient vide. Ce n'est donc
 * pas une fuite aujourd'hui, mais le `.htaccess` ne refuse pas le fichier, et
 * le jour où PHP cesserait de s'exécuter le secret partirait. Cela mérite un
 * orange, pas un vert et pas un rouge.
 */
function verdictConfig(array $r, string $url): array
{
    $quoi = 'La configuration est-elle lisible ?';
    if ($r['code'] === 0) {
        return constat('?', $quoi, 'impossible de vérifier depuis le serveur',
            'Ouvrez <code>' . htmlspecialchars($url, ENT_QUOTES) . '</code> : la page doit être '
            . 'refusée, ou vide. Si vous y voyez du code PHP, arrêtez tout et prévenez '
            . 'votre hébergeur.');
    }
    if (in_array($r['code'], [401, 403, 404], true)) {
        return constat('ok', $quoi, 'non — le serveur répond ' . $r['code']);
    }
    if (str_contains($r['corps'], '<?php') || str_contains($r['corps'], 'app_secret')) {
        return constat('x', $quoi,
            'OUI, ET SON CODE EST SERVI EN CLAIR — le secret et la clé sont exposés.',
            "PHP ne s'exécute pas sur ce dossier. Changez immédiatement le secret et la clé, "
            . "et prévenez votre hébergeur.");
    }
    return constat('!', $quoi,
        "atteignable (code {$r['code']}) mais sans rien rendre — PHP l'exécute",
        "Ce n'est pas une fuite aujourd'hui : PHP consomme le fichier et n'affiche rien. "
        . "Mais le <code>.htaccess</code> ne le refuse pas, donc le jour où PHP cesserait "
        . "de s'exécuter, le secret partirait. Demandez <code>AllowOverride All</code>, ou "
        . "rangez config.php hors de la racine web (<code>ATOUTMATH_CONFIG</code>).");
}

/** Les fichiers d'inclusion : aucun secret, mais rien à servir non plus. */
function verdictInterne(array $r): array
{
    $quoi = 'Les fichiers internes sont-ils servis ?';
    if ($r['code'] === 0) {
        return constat('?', $quoi, 'impossible de vérifier');
    }
    if (in_array($r['code'], [401, 403, 404], true)) {
        return constat('ok', $quoi, 'non — le serveur répond ' . $r['code']);
    }
    if (str_contains($r['corps'], '<?php')) {
        return constat('!', $quoi, 'le code source de api/lib/ est lisible',
            "Aucun secret ne s'y trouve, mais PHP ne s'exécute manifestement pas partout. "
            . "Vérifiez le point précédent en priorité.");
    }
    return constat('ok', $quoi, 'ils ne rendent rien (code ' . $r['code'] . ')');
}
