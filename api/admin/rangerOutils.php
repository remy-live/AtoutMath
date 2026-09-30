<?php
declare(strict_types=1);

/**
 * LES TROIS DÉCISIONS DU RANGEMENT DE LA BASE, mises à part.
 *
 * Elles servent à DEUX endroits — `rangerBase.php`, qui range, et
 * `sections/ranger.php`, qui affiche où l'on en est. Les écrire dans les deux
 * les ferait déclarer deux fois, et PHP s'arrête là-dessus ; n'en garder qu'un
 * et faire dépendre l'affichage de l'action rangerait la base à chaque fois
 * qu'on ouvre la page.
 */

/**
 * Où ranger la base : un dossier VOISIN de la racine web, jamais dedans.
 *
 * Chez un hébergeur mutualisé, le compte a un dossier personnel et le web n'en
 * est qu'un sous-dossier (`/home/xxx/www`). Le voisin
 * `/home/xxx/atoutmath-donnees` est donc hors d'atteinte du web tout en
 * restant accessible à PHP.
 */
function dossierPropose(): string
{
    $racineWeb = realpath($_SERVER['DOCUMENT_ROOT'] ?? '') ?: (string) ($_SERVER['DOCUMENT_ROOT'] ?? '');
    if ($racineWeb === '' || dirname($racineWeb) === $racineWeb) {
        return '';
    }
    return dirname($racineWeb) . '/atoutmath-donnees';
}

/** Le chemin est-il vraiment hors du dossier servi ? */
function horsDuWeb(string $chemin): bool
{
    $racineWeb = realpath($_SERVER['DOCUMENT_ROOT'] ?? '') ?: (string) ($_SERVER['DOCUMENT_ROOT'] ?? '');
    if ($racineWeb === '') {
        return false;
    }
    $chemin = rtrim(str_replace('\\', '/', $chemin), '/');
    $racineWeb = rtrim(str_replace('\\', '/', $racineWeb), '/');
    return $chemin !== '' && !str_starts_with($chemin . '/', $racineWeb . '/');
}

/** Réécrire config.php avec une nouvelle valeur, sans toucher au reste. */
function ecrireConfig(array $cfg): bool
{
    $chemin = getenv('ATOUTMATH_CONFIG') ?: dirname(__DIR__) . '/config.php';
    $php = "<?php\n// Écrit par AtoutMath le " . date('d/m/Y à H:i') . ".\n"
        . "// Ce fichier contient un secret : il ne doit jamais être public.\nreturn "
        . var_export($cfg, true) . ";\n";
    return @file_put_contents($chemin, $php) !== false;
}
