<?php
declare(strict_types=1);

/**
 * LE GUICHET DES MISES À JOUR : ouvert seulement quand on s'en sert.
 *
 * Rémy : « deposer.php n'est pas sécurisé ? »
 *
 * IL L'EST — ET C'ÉTAIT INSUFFISANT, ce qui n'est pas la même chose. Ce qui le
 * protégeait déjà : la connexion du professeur (vérifiée aussi contre une
 * requête envoyée à la main), un jeton anti-rejeu, le refus de tout chemin qui
 * remonte, et l'impossibilité d'écrire sur `api/config.php` ou `api/data/`.
 *
 * MAIS C'EST LA PAGE LA PLUS PUISSANTE DU SITE. Elle écrit des fichiers PHP :
 * qui la tient tient le serveur. Or toute sa sécurité reposait sur UN mot de
 * passe — le même que celui de l'administration. Ce mot de passe volé, on ne
 * perdait plus seulement les données des élèves : on perdait le site entier,
 * avec de quoi y installer n'importe quoi. Une porte n'a pas besoin d'être
 * fragile pour mériter un second tour de clef ; il lui suffit d'ouvrir sur
 * quelque chose d'important.
 *
 * D'OÙ UN GUICHET QUI RESTE FERMÉ. `deposer.php` ne fait plus rien tant que le
 * professeur ne l'a pas ouvert depuis l'administration — et il se referme tout
 * seul au bout d'une demi-heure. Une mise à jour dure deux minutes ; laisser
 * la porte ouverte les trois cent soixante-quatre autres jours de l'année n'a
 * jamais servi à personne.
 *
 * LE COÛT POUR RÉMY : deux clics avant de mettre à jour. LE GAIN : un mot de
 * passe volé ne suffit plus à réécrire le site, il faut le voler PENDANT les
 * trente minutes où le guichet est ouvert.
 *
 * ET L'ON GARDE TRACE. Chaque dépôt est inscrit — quand, quelle archive,
 * combien de fichiers. Ce n'est pas pour surveiller Rémy : c'est pour qu'il
 * voie, dans sa page Santé, un dépôt qu'il n'a pas fait.
 */

require_once __DIR__ . '/db.php';

const GUICHET_CLE = 'depot_ouvert_jusqu_a';
const GUICHET_DUREE = 1800;          // trente minutes
const GUICHET_JOURNAL = 'depots';

/** Le guichet est-il ouvert en ce moment ? */
function guichetOuvert(): bool
{
    try {
        $s = db()->prepare('SELECT valeur FROM reglages WHERE cle = ?');
        $s->execute([GUICHET_CLE]);
        $lignes = $s->fetchAll();
    } catch (Throwable $t) {
        // Pas de table `reglages` : c'est une base d'avant, ou pas de base du
        // tout. On ne bloque pas dans ce cas — `deposer.php` a d'autres
        // barrières, et refuser sur une erreur technique enfermerait dehors
        // celui qui vient justement réparer.
        return true;
    }
    if (!$lignes) {
        return false;
    }
    return (int) $lignes[0]['valeur'] > time();
}

/** Combien de minutes reste-t-il ? 0 si c'est fermé. */
function guichetMinutes(): int
{
    try {
        $s = db()->prepare('SELECT valeur FROM reglages WHERE cle = ?');
        $s->execute([GUICHET_CLE]);
        $lignes = $s->fetchAll();
    } catch (Throwable $t) {
        return 0;
    }
    if (!$lignes) {
        return 0;
    }
    $reste = (int) $lignes[0]['valeur'] - time();
    return $reste > 0 ? (int) ceil($reste / 60) : 0;
}

/** Ouvrir pour une demi-heure. */
function ouvrirGuichet(): void
{
    ecrireReglage(GUICHET_CLE, (string) (time() + GUICHET_DUREE));
}

/** Refermer tout de suite. */
function fermerGuichet(): void
{
    ecrireReglage(GUICHET_CLE, '0');
}

/** Écrire un réglage, qu'il existe déjà ou non. */
function ecrireReglage(string $cle, string $valeur): void
{
    try {
        $maj = db()->prepare('UPDATE reglages SET valeur = ? WHERE cle = ?');
        $maj->execute([$valeur, $cle]);
        if ($maj->rowCount() === 0) {
            db()->prepare(sqlInsereSansDoublon() . ' INTO reglages (cle, valeur) VALUES (?, ?)')
                ->execute([$cle, $valeur]);
        }
    } catch (Throwable $t) {
        // Rien à faire : le guichet restera fermé, ce qui est le bon défaut.
    }
}

/**
 * Inscrire un dépôt au journal.
 *
 * On garde les vingt derniers, pas davantage : ce journal sert à répondre à
 * « quelqu'un a-t-il touché au site cette semaine ? », pas à tenir la
 * comptabilité de deux ans de mises à jour.
 */
function inscrireDepot(string $archive, int $fichiers): void
{
    try {
        $s = db()->prepare('SELECT valeur FROM reglages WHERE cle = ?');
        $s->execute([GUICHET_JOURNAL]);
        $lignes = $s->fetchAll();
        $journal = $lignes ? (json_decode((string) $lignes[0]['valeur'], true) ?: []) : [];
    } catch (Throwable $t) {
        return;
    }
    array_unshift($journal, [
        'quand' => gmdate('Y-m-d H:i'),
        'quoi'  => mb_substr($archive, 0, 60),
        'n'     => $fichiers,
        // L'adresse de celui qui a déposé : c'est la seule chose qui
        // distingue « c'était moi » de « ce n'était pas moi ».
        'ou'    => mb_substr((string) ($_SERVER['REMOTE_ADDR'] ?? '?'), 0, 45),
    ]);
    ecrireReglage(GUICHET_JOURNAL, (string) json_encode(array_slice($journal, 0, 20)));
}

/** Les derniers dépôts, du plus récent au plus ancien. */
function derniersDepots(): array
{
    try {
        $s = db()->prepare('SELECT valeur FROM reglages WHERE cle = ?');
        $s->execute([GUICHET_JOURNAL]);
        $lignes = $s->fetchAll();
        return $lignes ? (json_decode((string) $lignes[0]['valeur'], true) ?: []) : [];
    } catch (Throwable $t) {
        return [];
    }
}
