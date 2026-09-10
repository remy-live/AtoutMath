<?php
declare(strict_types=1);

/**
 * LA LISTE D'UNE CLASSE : une seule mise en œuvre, deux façons d'y accéder.
 *
 * Rémy : « en fait j'aimerai ne pas passer par admin et dans atout math sans
 * passer par la zone admin ».
 *
 * Il a raison, et cela pose une question qu'il faut trancher avant d'écrire une
 * ligne : la gestion des élèves va exister à DEUX endroits — les pages
 * `api/admin/`, qui marchent sans JavaScript sur le poste de l'établissement,
 * et l'application, où Rémy passe ses journées. Deux écrans, soit. Mais deux
 * IMPLÉMENTATIONS, jamais.
 *
 * `api/admin/eleves.php` le disait déjà de sa propre logique d'aperçu :
 *
 *     « Écrire deux fois cette logique — une version qui prédit, une version
 *       qui agit — c'est se garantir qu'elles finiront par diverger, et qu'un
 *       aperçu annoncera un jour autre chose que ce qui sera fait. »
 *
 * C'est vrai d'un aperçu contre un import ; c'est tout aussi vrai d'une page
 * PHP contre une route JSON. Le jour où les deux divergent, l'une des deux
 * abîme des données d'élèves — et on ne saura pas laquelle. Tout ce qui DÉCIDE
 * ou qui ÉCRIT vit donc ici, et les deux écrans ne font plus que présenter.
 *
 * CE QUI RESTE DANS LES PAGES : la mise en page, l'impression des billets, les
 * confirmations. Ce qui s'affiche n'a pas besoin d'être partagé ; ce qui touche
 * à la base, si.
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/coffre.php';
require_once __DIR__ . '/liste.php';

/**
 * CE QUI VA SE PASSER POUR CETTE LIGNE — la même décision à l'aperçu et à
 * l'import, écrite une seule fois.
 *
 * C'est exactement le genre de trahison qu'un aperçu ne peut pas se permettre :
 * il ne vaut que si l'on peut s'y fier les yeux fermés.
 *
 * @return array{sort:string,eleve:?array,dit:string}
 */
function sortDeLaLigne(array $l, string $classeId, string $profId): array
{
    // 1 — Cet identifiant existe-t-il déjà, ici ou ailleurs ?
    $s = db()->prepare('SELECT id, class_id, first_name FROM students WHERE login_key = ? LIMIT 1');
    $s->execute([empreinteLogin($l['login'])]);
    $parLogin = $s->fetchAll()[0] ?? null;

    if ($parLogin && $parLogin['class_id'] === $classeId) {
        return ['sort' => 'connu', 'eleve' => $parLogin,
                'dit' => 'déjà dans la liste — son code ne change pas'];
    }
    if ($parLogin) {
        // Dans une autre classe. Si c'est une des miennes, je peux le déplacer.
        $c = db()->prepare('SELECT name, teacher_id FROM classes WHERE id = ?');
        $c->execute([$parLogin['class_id']]);
        $autre = $c->fetchAll()[0] ?? null;
        if ($autre && $autre['teacher_id'] === $profId) {
            return ['sort' => 'deplace', 'eleve' => $parLogin,
                    'dit' => 'vient de « ' . $autre['name'] . ' » — sera déplacé ici avec son travail'];
        }
        return ['sort' => 'refuse', 'eleve' => null,
                'dit' => 'identifiant déjà pris — changez-le (par ex. en ajoutant une initiale)'];
    }

    // 2 — LE RATTACHEMENT, et c'est la correction qui compte. Un élève entré
    //     par le code de la classe n'a pas d'identifiant : on le reconnaît à
    //     son prénom, DANS CETTE CLASSE, et on lui donne le sien au lieu de
    //     créer un second élève qui n'aurait fait aucun exercice.
    $s = db()->prepare(
        'SELECT id, first_name, login, login_key FROM students
          WHERE class_id = ? AND first_name_key = ? LIMIT 1'
    );
    $s->execute([$classeId, empreintePrenom($l['nom'])]);
    $parPrenom = $s->fetchAll()[0] ?? null;
    if ($parPrenom && (string) $parPrenom['login_key'] === '') {
        return ['sort' => 'rattache', 'eleve' => $parPrenom,
                'dit' => 'entré par le code de la classe — il garde son travail et reçoit un billet'];
    }
    // MÊME NOM, IDENTIFIANT DIFFÉRENT. C'est le plus souvent la même personne
    // écrite dans l'autre sens — la liste disait « NGUYÊN ; Maëlle », elle dit
    // aujourd'hui « Maëlle Nguyên ». On ne crée pas un second élève, et on ne
    // change pas non plus son identifiant en douce : un billet est distribué.
    // On le dit, et le professeur tranche.
    if ($parPrenom) {
        return ['sort' => 'homonyme', 'eleve' => $parPrenom,
                'dit' => 'déjà dans la liste sous « ' . dechiffrer($parPrenom['login'])
                    . ' » — ignoré. Si c\'est un homonyme, donnez-lui un identifiant dans votre liste.'];
    }

    return ['sort' => 'nouveau', 'eleve' => null, 'dit' => 'nouvel élève'];
}

/** Le code à donner à cette ligne : celui de la liste, ou un tirage. */
function codeDeLaLigne(array $l): string
{
    return $l['code'] !== '' ? $l['code'] : codeEleve();
}

/**
 * L'APERÇU : ce qui se passera, sans rien écrire.
 *
 * @return array{lignes:array,ignorees:array,texte:string}|null null si l'on n'a
 *         rien reconnu du tout dans ce qu'on a donné.
 */
function apercuDeListe(string $texte, string $codeCommun, string $classeId, string $profId): ?array
{
    $lu = lireListe($texte, $codeCommun);
    if (!$lu['lignes']) {
        return null;
    }
    $lignes = [];
    foreach ($lu['lignes'] as $l) {
        $sort = sortDeLaLigne($l, $classeId, $profId);
        $lignes[] = $l + ['sort' => $sort['sort'], 'dit' => $sort['dit']];
    }
    // LE TEXTE NORMALISÉ EST LA PIÈCE MAÎTRESSE DE L'APERÇU : c'est LUI qu'on
    // renvoie à l'import, et non le collage d'origine. L'import ne redevine
    // donc rien — il ne peut pas comprendre autre chose que ce qui a été
    // montré, puisqu'il relit exactement ce qu'on a affiché.
    return ['lignes' => $lignes, 'ignorees' => $lu['ignorees'], 'texte' => ecrireListe($lu['lignes'])];
}

/**
 * L'IMPORT : on relit la liste normalisée de l'aperçu, et on écrit.
 *
 * @return array{ajoutes:int,connus:int,rattaches:int,deplaces:int,refus:string[]}
 */
function importerListe(string $listeNormalisee, string $classeId, string $profId): array
{
    $lu = lireListe($listeNormalisee);
    $bilan = ['ajoutes' => 0, 'connus' => 0, 'rattaches' => 0, 'deplaces' => 0, 'refus' => []];

    foreach ($lu['lignes'] as $l) {
        $sort = sortDeLaLigne($l, $classeId, $profId);

        if ($sort['sort'] === 'refuse' || $sort['sort'] === 'homonyme') {
            $bilan['refus'][] = $l['login'];
            continue;
        }
        if ($sort['sort'] === 'connu') {
            // Le nom peut avoir été corrigé ; le code, jamais. Un billet
            // distribué ne se périme pas parce qu'on recolle la liste.
            db()->prepare('UPDATE students SET first_name = ?, first_name_key = ? WHERE id = ?')
                ->execute([chiffrer($l['nom']), empreintePrenom($l['nom']), $sort['eleve']['id']]);
            $bilan['connus']++;
            continue;
        }
        if ($sort['sort'] === 'deplace') {
            db()->prepare('UPDATE students SET class_id = ?, first_name = ?, first_name_key = ? WHERE id = ?')
                ->execute([$classeId, chiffrer($l['nom']), empreintePrenom($l['nom']), $sort['eleve']['id']]);
            $bilan['deplaces']++;
            continue;
        }
        if ($sort['sort'] === 'rattache') {
            db()->prepare(
                'UPDATE students SET first_name = ?, first_name_key = ?, login = ?, login_key = ?,
                                     access_code = ? WHERE id = ?'
            )->execute([chiffrer($l['nom']), empreintePrenom($l['nom']),
                        chiffrer($l['login']), empreinteLogin($l['login']),
                        chiffrer(codeDeLaLigne($l)), $sort['eleve']['id']]);
            $bilan['rattaches']++;
            continue;
        }
        db()->prepare(
            'INSERT INTO students (id, class_id, first_name, first_name_key,
                                   login, login_key, access_code, token_hash)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([uuidv4(), $classeId, chiffrer($l['nom']), empreintePrenom($l['nom']),
                    chiffrer($l['login']), empreinteLogin($l['login']),
                    chiffrer(codeDeLaLigne($l)),
                    // Pas encore de jeton : il naîtra à la première connexion.
                    hash('sha256', uuidv4())]);
        $bilan['ajoutes']++;
    }
    return $bilan;
}

/** Le bilan d'un import, en une phrase de français. */
function phraseDImport(array $b): string
{
    $bouts = [];
    if ($b['ajoutes'])   $bouts[] = $b['ajoutes'] . " ajouté(s)";
    if ($b['rattaches']) $bouts[] = $b['rattaches'] . " rattaché(s) à leur travail";
    if ($b['deplaces'])  $bouts[] = $b['deplaces'] . " déplacé(s) depuis une autre classe";
    if ($b['connus'])    $bouts[] = $b['connus'] . " déjà là, code inchangé";
    if ($b['refus'])     $bouts[] = 'refusés : ' . implode(', ', array_slice($b['refus'], 0, 5));
    return $bouts ? ucfirst(implode(' · ', $bouts)) . '.' : 'Rien à faire.';
}

/**
 * LA LISTE D'UNE CLASSE, EN CLAIR, TRIÉE PAR PRÉNOM.
 *
 * Le tri se fait APRÈS déchiffrement : `ORDER BY` sur du texte chiffré trierait
 * des vecteurs d'initialisation tirés au hasard.
 */
function elevesDeLaClasse(string $classeId): array
{
    $s = db()->prepare('SELECT * FROM students WHERE class_id = ?');
    $s->execute([$classeId]);
    return trierParPrenom(array_map(function ($e) {
        $e['first_name'] = dechiffrer($e['first_name']);
        $e['login']      = dechiffrer($e['login']);
        $e['code']       = dechiffrer($e['access_code']);
        return $e;
    }, $s->fetchAll()));
}

/** Un nouveau code pour un élève. Rend faux s'il n'est pas dans cette classe. */
function nouveauCodePourEleve(string $eleveId, string $classeId): bool
{
    $s = db()->prepare('SELECT id FROM students WHERE id = ? AND class_id = ?');
    $s->execute([$eleveId, $classeId]);
    if (!$s->fetchAll()) {
        return false;
    }
    db()->prepare('UPDATE students SET access_code = ? WHERE id = ?')
        ->execute([chiffrer(codeEleve()), $eleveId]);
    return true;
}

/**
 * REFAIRE TOUS LES CODES D'UNE CLASSE.
 *
 * `$commun` vide : chacun le sien, tiré au hasard. `$commun` renseigné : le même
 * pour tout le monde — c'est ce que Rémy demandait (« je peux choisir un mdp
 * générique pour tous mes élèves »), et c'est ce qui rend une première séance
 * possible sans distribuer trente papiers.
 *
 * @return int combien de codes ont été refaits
 */
function refaireLesCodes(string $classeId, string $commun = ''): int
{
    $s = db()->prepare(
        'SELECT id FROM students WHERE class_id = ? AND login_key IS NOT NULL AND login_key <> \'\''
    );
    $s->execute([$classeId]);
    $tous = $s->fetchAll();
    $maj = db()->prepare('UPDATE students SET access_code = ? WHERE id = ?');
    foreach ($tous as $e) {
        $maj->execute([chiffrer($commun !== '' ? mb_strtoupper($commun) : codeEleve()), $e['id']]);
    }
    return count($tous);
}

/**
 * RETIRER UN ÉLÈVE, AVEC TOUT SON TRAVAIL.
 *
 * Les jetons, les événements, les mots, les déblocages partent avec lui : toutes
 * les tables le référencent en `ON DELETE CASCADE`. C'est ce qui rend vraie la
 * phrase « je détruirai la liste des élèves ».
 *
 * @return string le prénom de celui qu'on vient de retirer, ou '' s'il n'était
 *         pas dans cette classe.
 */
function retirerEleve(string $eleveId, string $classeId): string
{
    $s = db()->prepare('SELECT first_name FROM students WHERE id = ? AND class_id = ?');
    $s->execute([$eleveId, $classeId]);
    $qui = $s->fetchAll()[0] ?? null;
    if (!$qui) {
        return '';
    }
    db()->prepare('DELETE FROM students WHERE id = ?')->execute([$eleveId]);
    return dechiffrer($qui['first_name']);
}

/**
 * CE QUE CHACUN FAIT EN CE MOMENT.
 *
 * On remonte les quarante derniers événements et l'on répond à trois
 * questions, dans l'ordre où le professeur se les pose en marchant dans les
 * rangs : sur quel parcours est-il ? sur quel exercice ? et est-ce que ça
 * marche ?
 *
 * Quarante, et pas tout le journal : un élève qui travaille depuis une heure a
 * quelques centaines d'événements, et l'on relit cette fonction toutes les
 * vingt secondes pour trente élèves. Quarante suffisent largement à couvrir
 * l'exercice en cours, et bornent le coût de la page.
 */
function derniereActivite(string $eleveId): array
{
    $s = db()->prepare(
        'SELECT type, ts, payload FROM events WHERE student_id = ?
         ORDER BY seq DESC LIMIT 40'
    );
    $s->execute([$eleveId]);
    $lignes = $s->fetchAll();

    $exo = null; $parcours = null; $justes = 0; $total = 0; $quand = null;
    foreach ($lignes as $l) {
        $p = json_decode((string) dechiffrer($l['payload']), true) ?: [];
        $cet = $p['exerciseId'] ?? $p['exoId'] ?? null;
        if ($exo === null && $cet) {
            $exo = $cet;
            $quand = (int) $l['ts'];
        }
        if ($parcours === null && !empty($p['pathName'])) {
            $parcours = (string) $p['pathName'];
        }
        // On ne compte que l'exercice EN COURS : « 7 sur 10 » ne veut rien dire
        // s'il mélange l'exercice d'avant.
        if ($cet && $cet === $exo && $l['type'] === 'attempt') {
            $total++;
            if (!empty($p['correct'])) {
                $justes++;
            }
        }
    }
    return ['exo' => $exo, 'parcours' => $parcours, 'justes' => $justes,
            'total' => $total, 'quand' => $quand, 'combien' => count($lignes)];
}
