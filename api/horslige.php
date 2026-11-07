<?php
declare(strict_types=1);

/**
 * LE PAQUET HORS LIGNE : TOUT CE QU'UNE TABLETTE DOIT GARDER, EN UN FICHIER.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RÉMY, pour les tablettes de sa sœur : « est ce que le logiciel serait capable
 * de produire soit un apk soit un zip que l tablette pourrait télécharger quand
 * elle est en ligne ? » Puis : « Oui je suis tes recommandations ».
 *
 * ── CE QUE ÇA REMPLACE, ET LA MESURE QUI L'A DÉCIDÉ ────────────────────────
 *
 * `?preparer` demandait les fichiers UN PAR UN. Mesuré sur une tablette neuve
 * qui ouvre l'adresse de préparation (`node tools/sondePreparation.mjs`) :
 *
 *                        sans le paquet      avec
 *     requêtes servies        599             38
 *     fichiers en mémoire     584            686
 *     modules de jeu           91             91
 *
 * LE GAIN EST EN ALLERS-RETOURS, PAS EN OCTETS, et il faut le dire ainsi : le
 * `.htaccess` active `mod_deflate` sur le JavaScript, donc les fichiers servis
 * un par un arrivent compressés eux aussi, et le ZIP pèse à peu près la somme
 * des deux. Mais sur le wifi d'une école, ce sont les allers-retours qui
 * coûtent — et vingt-cinq tablettes font 14 975 requêtes au lieu de 950.
 *
 * ET LE CACHE FINIT PLUS COMPLET : 686 fichiers contre 584. Le paquet embarque
 * ce que le site CONTIENT ; l'ancien chemin ne gardait que ce que la page
 * avait eu l'occasion de demander.
 *
 * ── CE QU'IL Y A DEDANS, ET CE QU'IL N'Y A PAS ─────────────────────────────
 *
 * `js/`, `css/`, `vendor/`, `icones/` — c'est-à-dire tout ce qu'un navigateur
 * télécharge pour jouer. MOINS LE NOYAU : `install` met déjà ces dix-neuf
 * fichiers-là en cache, et il les met sous leur adresse À QUESTION
 * (`css/base.css?v=NNN`). Les reprendre ici les poserait une seconde fois sous
 * une autre clé — 1,3 Mo de doublons que personne ne demanderait jamais.
 *
 * LA LISTE DU NOYAU SE LIT DANS `sw.js`, elle ne se recopie pas. Une liste
 * recopiée serait juste le jour où on l'écrit : c'est la règle de la maison, et
 * c'est elle qui a fait tenir la page de préparation.
 *
 * ── POURQUOI DANS `api/`, ALORS QUE ÇA NE TOUCHE PAS LA BASE ───────────────
 *
 * Parce que le service worker IGNORE `/api/` (voir `sw.js`). Posé à la racine,
 * ce ZIP serait lui-même mis en cache : 5,7 Mo gardés en double, à côté des
 * fichiers qu'il contient. C'est la seule raison, et elle suffit.
 *
 * ── LE ZIP S'ÉCRIT À LA MAIN, ET C'EST VOULU ───────────────────────────────
 *
 * Pas de `ZipArchive` : l'extension `zip` n'est pas garantie chez un hébergeur
 * mutualisé, et un paquet qui ne se fabrique pas est une tablette qu'on ne
 * prépare pas. Un ZIP est une suite d'en-têtes et de blocs `deflate` ; `crc32`
 * et `gzdeflate` sont dans le cœur de PHP et dans zlib, présents partout. Et
 * quand même `gzdeflate` manquerait, on stocke sans compresser : plus lourd,
 * mais ça marche.
 *
 * ── ET IL NE SE REFABRIQUE PAS À CHAQUE DEMANDE ────────────────────────────
 *
 * Vingt-cinq tablettes dans la même minute, c'est vingt-cinq fois la même
 * compression de 19 Mo. On garde donc le paquet dans `api/data/`, nommé par une
 * empreinte des fichiers eux-mêmes (nom, taille, date) : un fichier modifié
 * change l'empreinte, et le paquet se refait tout seul. Pas de rituel à penser,
 * pas de paquet périmé possible.
 */

// ── CE QU'ON EMBARQUE ───────────────────────────────────────────────────────
const RACINE = __DIR__ . '/..';
const DOSSIERS = ['js', 'css', 'vendor', 'icones'];
// Ce qu'un navigateur ne demande jamais, et qui traîne parfois dans ces
// dossiers : des cartes de source (lourdes, et inutiles hors développement).
const JAMAIS = '/(^|\/)\.|\.map$/';

/**
 * LES ADRESSES DU NOYAU, LUES DANS `sw.js`.
 *
 * On rend les chemins NUS (sans `./` ni `?v=`) : c'est sous cette forme qu'on
 * les compare aux fichiers du disque.
 *
 * @return array<string,true>
 */
function noyauDuWorker(): array
{
    $sw = @file_get_contents(RACINE . '/sw.js');
    if ($sw === false) return [];
    if (!preg_match('/const NOYAU = \[(.*?)\];/s', $sw, $m)) return [];
    $hors = [];
    if (preg_match_all('/[\'"]([^\'"]+)[\'"]/', $m[1], $t)) {
        foreach ($t[1] as $a) {
            $a = preg_replace('/\?.*$/', '', $a);
            $a = preg_replace('#^\./#', '', $a);
            if ($a !== '') $hors[$a] = true;
        }
    }
    return $hors;
}

/**
 * TOUS LES FICHIERS À EMBARQUER, chemin relatif à la racine du site.
 *
 * @return string[]
 */
function fichiersDuPaquet(): array
{
    $hors = noyauDuWorker();
    $liste = [];
    foreach (DOSSIERS as $d) {
        $base = RACINE . '/' . $d;
        if (!is_dir($base)) continue;
        $it = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($base, FilesystemIterator::SKIP_DOTS));
        foreach ($it as $f) {
            if (!$f->isFile()) continue;
            $rel = $d . '/' . str_replace('\\', '/',
                substr($f->getPathname(), strlen($base) + 1));
            if (preg_match(JAMAIS, $rel)) continue;
            if (isset($hors[$rel])) continue;
            $liste[] = $rel;
        }
    }
    sort($liste);
    return $liste;
}

/** Une empreinte qui change dès qu'un fichier change — sans les relire. */
function empreinte(array $liste): string
{
    $s = '';
    foreach ($liste as $rel) {
        $p = RACINE . '/' . $rel;
        $s .= $rel . ':' . (string) @filesize($p) . ':' . (string) @filemtime($p) . "\n";
    }
    return substr(hash('sha256', $s), 0, 16);
}

/**
 * ÉCRIT UN ZIP, À LA MAIN.
 *
 * Format minimal et universel : un en-tête local par fichier, puis le
 * répertoire central, puis sa fin. Pas de Zip64 — on est à 19 Mo, et la limite
 * est à 4 Go ; pas de descripteur de données — on connaît les tailles avant
 * d'écrire.
 */
function ecrireLeZip(array $liste, string $vers): bool
{
    $f = @fopen($vers, 'wb');
    if (!$f) return false;
    $peutCompresser = function_exists('gzdeflate');
    $central = '';
    $pos = 0;
    $combien = 0;
    foreach ($liste as $rel) {
        $brut = @file_get_contents(RACINE . '/' . $rel);
        if ($brut === false) continue;
        $crc = crc32($brut);
        $tailleBrute = strlen($brut);
        $corps = $peutCompresser ? gzdeflate($brut, 6) : false;
        // UN FICHIER DÉJÀ COMPRESSÉ (woff2, png) GROSSIT en deflate : on le
        // stocke tel quel dès que la « compression » ne gagne rien.
        if ($corps === false || strlen($corps) >= $tailleBrute) {
            $corps = $brut;
            $methode = 0;
        } else {
            $methode = 8;
        }
        $taille = strlen($corps);
        $nom = $rel;
        $local = "PK\x03\x04" . pack('v', 20) . pack('v', 0) . pack('v', $methode)
            . pack('v', 0) . pack('v', 0)          // heure et date : zéro, on s'en moque
            . pack('V', $crc) . pack('V', $taille) . pack('V', $tailleBrute)
            . pack('v', strlen($nom)) . pack('v', 0) . $nom;
        fwrite($f, $local);
        fwrite($f, $corps);
        $central .= "PK\x01\x02" . pack('v', 20) . pack('v', 20) . pack('v', 0)
            . pack('v', $methode) . pack('v', 0) . pack('v', 0)
            . pack('V', $crc) . pack('V', $taille) . pack('V', $tailleBrute)
            . pack('v', strlen($nom)) . pack('v', 0) . pack('v', 0)
            . pack('v', 0) . pack('v', 0) . pack('V', 0)
            . pack('V', $pos) . $nom;
        $pos += strlen($local) + $taille;
        $combien++;
    }
    $debutCentral = $pos;
    fwrite($f, $central);
    // ON COMPTE EN ÉCRIVANT, et non en cherchant la signature dans le
    // répertoire : un nom de fichier qui contiendrait ces quatre octets ferait
    // un ZIP que personne ne saurait relire, et rien ne le signalerait.
    $n = $combien;
    fwrite($f, "PK\x05\x06" . pack('v', 0) . pack('v', 0)
        . pack('v', $n) . pack('v', $n)
        . pack('V', strlen($central)) . pack('V', $debutCentral) . pack('v', 0));
    fclose($f);
    return true;
}

// ── LA RÉPONSE ──────────────────────────────────────────────────────────────

$liste = fichiersDuPaquet();
if (!$liste) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo "aucun fichier à embarquer : l'installation est incomplète.\n";
    exit;
}
$signe = empreinte($liste);

// LE PAQUET DÉJÀ FABRIQUÉ, S'IL EXISTE. `api/data/` est hors du dépôt et
// ignoré par git — c'est là que vivent les fichiers que l'installation
// fabrique pour elle-même.
// `api/data/` N'EST PAS UN DOSSIER COMME UN AUTRE : c'est là que vit la base
// SQLite, c'est-à-dire les données d'élèves réels. `install.php` y pose un
// `.htaccess` qui refuse tout et un `index.html` vide ; si l'on arrive ici sur
// une installation où il n'existe pas encore, on pose la même protection —
// créer ce dossier sans elle l'ouvrirait au premier robot venu. La règle est
// écrite dans `api/install.php` (`protegerDossier`), et c'est elle qui fait
// foi : on la recopie ici parce que ce fichier ne doit rien exiger d'autre.
$bac = __DIR__ . '/data';
if (!is_dir($bac)) {
    @mkdir($bac, 0750, true);
    @file_put_contents($bac . '/.htaccess',
        "Require all denied\n<IfModule !mod_authz_core.c>\n  Order allow,deny\n  Deny from all\n</IfModule>\n");
    @file_put_contents($bac . '/index.html', '');
}
$paquet = $bac . '/horslige-' . $signe . '.zip';

if (!is_file($paquet) || filesize($paquet) === 0) {
    // ON ÉCRIT À CÔTÉ PUIS ON RENOMME : deux tablettes qui demandent le paquet
    // en même temps écriraient sinon dans le même fichier, et la première à
    // finir servirait la moitié de l'autre.
    $temporaire = $paquet . '.' . getmypid() . '.part';
    if (!ecrireLeZip($liste, $temporaire)) {
        http_response_code(500);
        header('Content-Type: text/plain; charset=utf-8');
        echo "le paquet n'a pas pu être écrit : vérifier les droits de api/data/.\n";
        exit;
    }
    @rename($temporaire, $paquet);
    // LES PAQUETS DES VERSIONS PRÉCÉDENTES N'ONT PLUS DE RAISON D'ÊTRE : sans
    // ce ménage, chaque mise à jour laisserait 5,7 Mo de plus sur l'hébergement.
    foreach (glob($bac . '/horslige-*.zip') ?: [] as $vieux) {
        if ($vieux !== $paquet) @unlink($vieux);
    }
}

$taille = (int) @filesize($paquet);
header('Content-Type: application/zip');
header('Content-Length: ' . $taille);
header('Content-Disposition: inline; filename="atoutmath-horslige.zip"');
header('ETag: "' . $signe . '"');
// UNE JOURNÉE, ET PAS PLUS. L'empreinte est dans l'adresse de l'ETag, donc une
// tablette qui redemande reçoit 304 sans rien télécharger ; mais le paquet
// change à chaque dépôt, et un cache long le figerait chez un proxy d'école.
header('Cache-Control: public, max-age=86400');

if (trim((string) ($_SERVER['HTTP_IF_NONE_MATCH'] ?? ''), '"W/ ') === $signe) {
    http_response_code(304);
    exit;
}
readfile($paquet);
