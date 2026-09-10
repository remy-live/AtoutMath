<?php
declare(strict_types=1);

/**
 * LE COFFRE — ce qui est écrit sur le disque n'est pas lisible tel quel.
 *
 * Rémy : « est-ce que la base sera cryptée ? »
 *
 * SOYONS D'ABORD PRÉCIS SUR CE QUE CELA PROTÈGE, parce qu'un chiffrement mal
 * compris rassure plus qu'il ne défend.
 *
 * Ce que cela protège vraiment : LE FICHIER QUI PART SEUL. Un `.htaccess` que
 * l'hébergeur ignore, une sauvegarde automatique récupérée par quelqu'un, un
 * dossier `data/` dont l'indexation est restée ouverte, un disque de serveur
 * revendu. Dans tous ces cas, celui qui repart avec le fichier repart avec du
 * bruit : les prénoms, les réponses des élèves et les mots du professeur sont
 * du texte chiffré.
 *
 * Ce que cela NE protège PAS : quelqu'un qui peut lire `config.php` EN PLUS du
 * fichier de base. La clé y est, et il déchiffre tout. C'est inévitable — le
 * serveur doit pouvoir lire ses propres données pour afficher une console de
 * séance, donc la clé doit être à sa portée. Aucun chiffrement au repos ne
 * résout cela, ni ici ni ailleurs.
 *
 * Autrement dit : c'est la TROISIÈME couche du même mur. Le `.htaccess` et le
 * nom de fichier imprévisible empêchent le fichier de partir ; le chiffrement
 * est ce qui reste quand ces deux-là ont échoué. C'est précisément le rôle
 * d'une troisième couche, et c'est pour cela qu'elle vaut la peine.
 *
 * ET SI L'ON VEUT VRAIMENT SÉPARER LA CLÉ DU FICHIER : posez-la dans une
 * variable d'environnement, `SetEnv ATOUTMATH_CLE …` dans le `.htaccess` du
 * serveur, ou rangez `config.php` hors de la racine web (`ATOUTMATH_CONFIG`).
 * Alors le fichier de base et la clé ne voyagent plus ensemble.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *
 * COMMENT ON CHERCHE UN PRÉNOM QU'ON NE PEUT PAS LIRE.
 *
 * Le rattachement demande « l'élève qui s'appelle Léa, dans cette classe ». En
 * clair, c'est un `WHERE first_name = ?`. Chiffré, cela ne marche plus : le
 * chiffrement tire un vecteur d'initialisation au hasard, donc « Léa » écrit
 * deux fois donne deux résultats différents — ce qui est exactement la
 * propriété qu'on veut (sinon, compter les valeurs identiques révélerait déjà
 * beaucoup), mais qui rend la comparaison impossible.
 *
 * D'où l'INDEX AVEUGLE : à côté du prénom chiffré, on range une empreinte
 * HMAC du prénom normalisé. Elle est stable — donc on peut chercher dessus —
 * et à sens unique — donc elle ne rend pas le prénom. Sans la clé, elle ne dit
 * rien de plus que « ces deux lignes portent le même prénom ».
 *
 * L'EMPREINTE NORMALISE, et c'est un progrès en passant : « LÉA », « léa » et
 * « Léa » donnaient trois comptes distincts, et l'élève qui tapait son prénom
 * en minuscules à la maison ne retrouvait pas son travail de l'école.
 */

require_once __DIR__ . '/db.php';

const COFFRE_MARQUE = 'v1:';

/**
 * LA CLÉ, dans l'ordre de préférence :
 *   1. la variable d'environnement `ATOUTMATH_CLE` — la seule façon de ne pas
 *      la ranger dans le même dossier que la base ;
 *   2. `data_key` dans la configuration — ce qu'écrit `install.php` ;
 *   3. dérivée du secret applicatif — pour une installation faite avant que
 *      cette page existe, qui ne doit pas cesser de fonctionner.
 */
function cleDonnees(): string
{
    static $cle = null;
    if ($cle !== null) {
        return $cle;
    }
    $env = getenv('ATOUTMATH_CLE');
    if (is_string($env) && strlen($env) >= 32) {
        return $cle = hash('sha256', $env, true);
    }
    $c = config();
    if (!empty($c['data_key'])) {
        return $cle = hash('sha256', (string) $c['data_key'], true);
    }
    return $cle = hash_hmac('sha256', 'donnees', (string) ($c['app_secret'] ?? ''), true);
}

/**
 * AES-256-GCM. Le mode compte : GCM AUTHENTIFIE en plus de chiffrer, donc une
 * ligne modifiée dans la base ne se déchiffre pas silencieusement en autre
 * chose — elle se signale. Le vecteur d'initialisation est tiré au hasard à
 * chaque écriture et voyage avec le message, comme l'étiquette d'intégrité.
 */
function chiffrer(?string $clair): ?string
{
    if ($clair === null) {
        return null;
    }
    $iv = random_bytes(12);
    $etiquette = '';
    $chiffre = openssl_encrypt($clair, 'aes-256-gcm', cleDonnees(), OPENSSL_RAW_DATA, $iv, $etiquette, '', 16);
    if ($chiffre === false) {
        // Plutôt écrire en clair que perdre le travail d'un élève. Le cas ne
        // devrait pas se produire — `install.php` exige l'extension openssl —
        // et `dechiffrer()` relira ce texte sans broncher.
        return $clair;
    }
    return COFFRE_MARQUE . base64_encode($iv . $etiquette . $chiffre);
}

/**
 * CE QUI N'EST PAS CHIFFRÉ REVIENT TEL QUEL, et c'est délibéré.
 *
 * Une base installée avant le coffre contient du texte en clair ; une base
 * mixte doit continuer de s'afficher pendant que les nouvelles écritures
 * partent chiffrées. On reconnaît le coffre à sa marque, et l'on ne touche à
 * rien d'autre. La migration se fait ainsi toute seule, sans manœuvre et sans
 * risque de rendre illisible ce qui existait.
 */
function dechiffrer(?string $range): ?string
{
    if ($range === null || !str_starts_with($range, COFFRE_MARQUE)) {
        return $range;
    }
    $brut = base64_decode(substr($range, strlen(COFFRE_MARQUE)), true);
    if ($brut === false || strlen($brut) < 29) {
        return null;
    }
    $clair = openssl_decrypt(
        substr($brut, 28), 'aes-256-gcm', cleDonnees(), OPENSSL_RAW_DATA,
        substr($brut, 0, 12), substr($brut, 12, 16)
    );
    return $clair === false ? null : $clair;
}

/**
 * L'INDEX AVEUGLE d'un prénom : stable, cherchable, et qui ne rend rien.
 *
 * Une clé DIFFÉRENTE de celle du chiffrement (dérivée par un contexte), pour
 * qu'une faiblesse d'un côté ne se propage pas de l'autre.
 */
function empreintePrenom(string $prenom): string
{
    return hash_hmac('sha256', normaliserPrenom($prenom),
        hash_hmac('sha256', 'index', cleDonnees(), true));
}

/**
 * « LÉA », « léa » et «  Léa  » sont la même élève.
 *
 * On retire les accents, les majuscules et les espaces en trop. On ne va pas
 * plus loin : « Léa B. » reste distincte de « Léa », parce que c'est
 * précisément ainsi qu'un professeur sépare deux homonymes de sa classe.
 */
function normaliserPrenom(string $prenom): string
{
    $n = mb_strtolower(trim($prenom), 'UTF-8');
    $n = strtr($n, [
        'à' => 'a', 'â' => 'a', 'ä' => 'a', 'á' => 'a', 'ã' => 'a', 'å' => 'a',
        'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
        'î' => 'i', 'ï' => 'i', 'í' => 'i',
        'ô' => 'o', 'ö' => 'o', 'ó' => 'o', 'õ' => 'o',
        'ù' => 'u', 'û' => 'u', 'ü' => 'u', 'ú' => 'u',
        'ç' => 'c', 'ñ' => 'n', 'ÿ' => 'y', 'œ' => 'oe', 'æ' => 'ae',
    ]);
    return preg_replace('/\s+/u', ' ', $n) ?? $n;
}

/**
 * TRIER DES PRÉNOMS QU'ON VIENT DE DÉCHIFFRER.
 *
 * `ORDER BY first_name` ne veut plus rien dire sur du texte chiffré : il
 * trierait des vecteurs d'initialisation tirés au hasard, c'est-à-dire rien.
 * Le tri se fait donc ici, une fois les lignes lues — sur trente élèves, c'est
 * gratuit — et il trie enfin correctement les accents, ce que la base ne
 * faisait pas.
 */
function trierParPrenom(array $lignes, string $champ = 'first_name'): array
{
    usort($lignes, fn ($a, $b) => normaliserPrenom((string) ($a[$champ] ?? ''))
        <=> normaliserPrenom((string) ($b[$champ] ?? '')));
    return $lignes;
}

/** Une ligne `students` lue de la base, prénom rendu lisible. */
function eleveLisible(?array $ligne): ?array
{
    if (!$ligne) {
        return $ligne;
    }
    if (array_key_exists('first_name', $ligne)) {
        $ligne['first_name'] = dechiffrer($ligne['first_name']);
    }
    return $ligne;
}
