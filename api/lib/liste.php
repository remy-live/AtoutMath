<?php
declare(strict_types=1);

/**
 * LIRE UNE LISTE D'ÉLÈVES — le déchiffrage, séparé de la page qui l'affiche.
 *
 * Rémy : « j'espère qu'on pourra importer des CSV et ou du presse-papier »,
 * « il faut qqch de confortable et facile ».
 *
 * CONFORTABLE VEUT DIRE : ON NE LUI DEMANDE PAS DE METTRE EN FORME. Un
 * professeur qui prépare sa séance a déjà sa liste quelque part — un export de
 * Pronote, un tableur, un copier-coller. Ces fichiers-là ne se ressemblent pas :
 * point-virgule ou virgule, une colonne ou trois, une ligne d'en-tête ou pas,
 * accents en UTF-8 ou en Windows-1252 selon l'humeur d'Excel. Lui demander de
 * normaliser d'abord, c'est lui demander de ne pas s'en servir.
 *
 * POURQUOI CE CODE VIT ICI ET NON DANS LA PAGE. Même raison que `sante.php` :
 * une devinette doit pouvoir être mise à l'épreuve. Ici, on lui donne quinze
 * formats de liste fabriqués — un export d'Excel français, un CSV anglais, deux
 * colonnes NOM/Prénom, des guillemets, un BOM — et on vérifie ce qu'il en tire.
 * Mêlé au HTML, on ne l'essaierait qu'à la main, une fois, avec sa propre liste.
 *
 * LA DEVINETTE QUI DEMANDE LE PLUS D'ATTENTION est la deuxième colonne. Elle
 * peut être un identifiant (`lea.durand`) ou la seconde moitié du nom
 * (`DURAND;Léa`, la forme de Pronote). On tranche sur la FORME : un identifiant
 * n'a ni majuscule, ni accent, ni espace. Et parce qu'aucune devinette n'est
 * sûre à cent pour cent, la page montre le résultat AVANT d'écrire quoi que ce
 * soit — c'est l'aperçu qui rend la devinette acceptable, pas sa finesse.
 */

require_once __DIR__ . '/coffre.php';

/**
 * Ramener n'importe quel texte de tableur en UTF-8.
 *
 * Excel français enregistre volontiers en Windows-1252 : « Léa » y tient sur un
 * seul octet, et arrive tel quel dans la base sous la forme « L?a ». On répare
 * ici plutôt que de refuser le fichier — refuser, ce serait renvoyer le
 * professeur vers un menu « Enregistrer sous » qu'il n'a pas à connaître.
 */
function enUtf8(string $texte): string
{
    // Le BOM d'Excel : trois octets invisibles qui collent au premier nom et
    // font de « Léa » un prénom qui ne ressemble à aucun autre.
    $texte = preg_replace('/^\xEF\xBB\xBF/', '', $texte) ?? $texte;
    if (!mb_check_encoding($texte, 'UTF-8')) {
        $texte = mb_convert_encoding($texte, 'UTF-8', 'Windows-1252');
    }
    return $texte;
}

/**
 * Le séparateur du fichier : celui qu'on voit le plus, sur l'ensemble du texte.
 *
 * On compte sur tout le texte et non sur la première ligne : une ligne
 * d'en-tête peut n'avoir qu'une colonne, et un nom composé « Jean-Luc, Martin »
 * n'est pas représentatif. Le point-virgule l'emporte à égalité — c'est celui
 * d'un tableur français, et le nôtre est un logiciel français.
 */
function separateurListe(string $texte): string
{
    $compte = [
        ';'  => substr_count($texte, ';'),
        "\t" => substr_count($texte, "\t"),
        ','  => substr_count($texte, ','),
    ];
    arsort($compte);
    $premier = array_key_first($compte);
    return $compte[$premier] > 0 ? (string) $premier : ';';
}

/**
 * Cette cellule est-elle un identifiant, ou la suite du nom ?
 *
 * `lea.durand` en est un ; `Léa`, `DURAND`, `Jean-Luc` n'en sont pas. La règle
 * tient en une phrase : un identifiant n'a ni majuscule, ni accent, ni espace —
 * puisque c'est nous qui les fabriquons, avec `identifiantDe()`.
 */
function ressembleAUnIdentifiant(string $cellule): bool
{
    return (bool) preg_match('/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/', $cellule);
}

/** Un code de billet : court, en capitales, sans ambiguïté possible. */
function ressembleAUnCode(string $cellule): bool
{
    return (bool) preg_match('/^[A-Z0-9]{3,12}$/', $cellule);
}

/**
 * Cette ligne est-elle l'en-tête du tableau plutôt qu'un élève ?
 *
 * On ne se fie pas au rang — certains exports commencent par deux lignes de
 * titre, d'autres par aucune — mais au vocabulaire. « Nom », « Prénom »,
 * « Élève », « Identifiant », « Login », « Classe » : personne ne s'appelle
 * ainsi, et un professeur qui aurait un élève nommé « Classe » a d'autres
 * soucis.
 */
function estUnEnTete(array $cellules): bool
{
    $premier = mb_strtolower(trim($cellules[0] ?? ''));
    $premier = strtr($premier, ['é' => 'e', 'è' => 'e', 'ê' => 'e']);
    return in_array($premier, [
        'nom', 'noms', 'nom de famille', 'eleve', 'eleves', 'prenom', 'prenoms',
        'identifiant', 'login', 'classe', 'nom prenom', 'prenom nom', 'name',
    ], true);
}

/**
 * Lire une liste entière.
 *
 * @return array{lignes: list<array{nom:string,login:string,code:string}>,
 *               ignorees: list<string>}
 */
function lireListe(string $texte, string $codeCommun = ''): array
{
    $texte = enUtf8($texte);
    $sep = separateurListe($texte);
    $lignes = [];
    $ignorees = [];
    $vus = [];

    foreach (preg_split('/\r\n|\r|\n/', $texte) ?: [] as $brut) {
        $brut = trim($brut);
        if ($brut === '' || str_starts_with($brut, '#')) {
            continue;
        }
        // `str_getcsv` plutôt qu'un découpage simple : un tableur entoure de
        // guillemets toute cellule contenant le séparateur, et « Martin, Jean »
        // doit rester un seul nom.
        $cellules = array_map(
            static fn ($c) => trim((string) $c, " \t\"'"),
            str_getcsv($brut, $sep, '"', '\\')
        );
        if (estUnEnTete($cellules)) {
            continue;
        }

        $nom = $cellules[0] ?? '';
        $deuxieme = $cellules[1] ?? '';
        $troisieme = $cellules[2] ?? '';

        // LA FORME DE PRONOTE : « DURAND ; Léa ». La deuxième cellule n'est pas
        // un identifiant, c'est la moitié du nom — on recolle, dans l'ordre où
        // c'est écrit, parce qu'on ne peut pas savoir lequel est le prénom.
        $login = '';
        if ($deuxieme !== '' && !ressembleAUnIdentifiant($deuxieme) && !ressembleAUnCode($deuxieme)) {
            $nom = trim($nom . ' ' . $deuxieme);
            $deuxieme = $troisieme;
            $troisieme = $cellules[3] ?? '';
        }
        if ($deuxieme !== '' && ressembleAUnIdentifiant($deuxieme)) {
            $login = identifiantDe($deuxieme);
        }

        $nom = trim(preg_replace('/\s+/u', ' ', $nom) ?? $nom);
        if ($nom === '') {
            continue;
        }
        if (mb_strlen($nom) > 80) {
            $nom = mb_substr($nom, 0, 80);
        }
        if ($login === '') {
            $login = identifiantDe($nom);
        }
        if ($login === '') {
            // Un nom qui ne donne aucune lettre latine — que des idéogrammes,
            // ou de la ponctuation. On le dit plutôt que de l'avaler.
            $ignorees[] = $brut;
            continue;
        }

        // UN MÊME IDENTIFIANT DEUX FOIS DANS LE MÊME COLLAGE : deux homonymes,
        // ou la même ligne collée deux fois. On numérote plutôt que d'écraser —
        // et l'aperçu le montre, donc le professeur voit `lea.durand2` avant
        // que ce soit écrit, et peut corriger sa liste.
        $base = $login;
        $n = 2;
        while (isset($vus[$login])) {
            $login = $base . $n++;
        }
        $vus[$login] = true;

        $code = strtoupper(trim($troisieme));
        if (!ressembleAUnCode($code)) {
            $code = '';
        }
        // Le code commun l'emporte : c'est un choix explicite du professeur,
        // fait dans le formulaire, après coup.
        if ($codeCommun !== '') {
            $code = strtoupper($codeCommun);
        }

        $lignes[] = ['nom' => $nom, 'login' => $login, 'code' => $code];
    }

    return ['lignes' => $lignes, 'ignorees' => $ignorees];
}

/**
 * Réécrire une liste sous sa forme normalisée, `nom;identifiant;code`.
 *
 * C'est ce qui voyage entre l'aperçu et la confirmation : relue, elle redonne
 * exactement les mêmes lignes — plus aucune devinette n'a lieu la seconde fois.
 */
function ecrireListe(array $lignes): string
{
    return implode("\n", array_map(
        static fn ($l) => $l['nom'] . ';' . $l['login'] . ';' . $l['code'],
        $lignes
    ));
}
