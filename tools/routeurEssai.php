<?php
declare(strict_types=1);

/**
 * LE SERVEUR D'ESSAI SERT LES MÊMES EN-TÊTES QUE L'HÉBERGEMENT.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RÉMY, capture à l'appui : « pourquoi j'ai cela ». Les trois volets de
 * l'Atelier affichaient « atout-math.fr refused to connect ». La politique de
 * sécurité disait `frame-ancestors 'none'` — personne n'encadre ce site, pas
 * même lui — et quatre fonctions s'encadrent elles-mêmes.
 *
 * AUCUNE SONDE DE CE DÉPÔT N'AURAIT PU LE DIRE. La politique vit dans
 * `.htaccess`, donc chez APACHE ; le serveur d'essai est le serveur intégré de
 * PHP, QUI N'APPLIQUE PAS `.htaccess`. Toutes les mesures tournaient sur un
 * site SANS ses en-têtes — elles mesuraient une configuration qui n'existe
 * nulle part. Ce fichier ferme ce trou-là, pour toutes les sondes à la fois.
 *
 * ── POURQUOI IL NE SERT LUI-MÊME QUE LES DOCUMENTS HTML ────────────────────
 *
 * MESURÉ : quand un routeur rend `false`, le serveur intégré sert la ressource
 * lui-même — et JETTE les en-têtes que le routeur avait posés. Ils ne survivent
 * que si le routeur écrit lui-même la réponse.
 *
 * Or `frame-ancestors` se lit sur la réponse du DOCUMENT encadré, pas sur ses
 * scripts ni ses feuilles de style. Il suffit donc de servir les `.html` à la
 * main, et de laisser le serveur faire le reste — ce qu'il fait très bien,
 * types MIME et `api/*.php` compris. Moins ce fichier en fait, moins il peut
 * mentir sur ce que Rémy aura.
 *
 * LA POLITIQUE N'EST PAS RECOPIÉE ICI : elle arrive par `ATOUTMATH_CSP`, que
 * `siteEssai.php` lit dans `.htaccess`. Une recopie aurait divergé au premier
 * `node tools/csp.mjs --ecrire`, et l'on mesurerait alors la politique d'hier.
 */

$chemin = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$racine = dirname(__DIR__);
$fichier = $racine . ($chemin === '/' ? '/index.html' : $chemin);

// `realpath` d'abord : sans lui, « /../api/config.php » sortirait du dossier.
// Le serveur d'essai ne voit que des requêtes de nos sondes, mais un garde-fou
// qu'on n'écrit que « quand c'est exposé » est un garde-fou qu'on oublie.
$vrai = realpath($fichier);
if ($vrai !== false && str_starts_with($vrai, $racine . DIRECTORY_SEPARATOR)
    && substr($vrai, -5) === '.html' && is_file($vrai)) {
    header('Content-Type: text/html; charset=UTF-8');
    $csp = getenv('ATOUTMATH_CSP');
    if ($csp) header('Content-Security-Policy: ' . $csp);
    // Les deux autres en-têtes que `.htaccess` pose sur les documents, pour la
    // même raison : ce qu'on mesure doit être ce qui sera servi.
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: same-origin');
    readfile($vrai);
    return true;
}

// Tout le reste — les modules, les styles, les images, et `api/*.php` que le
// serveur exécute — passe par le serveur intégré, inchangé.
return false;
