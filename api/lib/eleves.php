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
require_once __DIR__ . '/projections.php';

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

/**
 * L'INSTANT OÙ ON L'A VU, EN SECONDES — et non le texte que la base range.
 *
 * `last_seen_at` est écrit par `datetime('now')` : c'est une CHAÎNE
 * « 2026-09-11 02:31:05 », en UTC. La caster en entier donne 2026 — l'année —,
 * ce qui, comparé à une heure UNIX, place tous les élèves au premier janvier
 * 1970 et éteint définitivement la pastille « en ligne ».
 *
 * Mesuré exactement ainsi, sur l'essai de bout en bout : le direct montrait
 * bien Léo sur son exercice avec 2 sur 2, et le disait absent.
 *
 * Les pages d'administration font déjà cette conversion de leur côté
 * (`strtotime($quand . ' UTC')`) ; on la fait ici une fois pour toutes, pour
 * que les routes JSON ne rendent que des secondes — le navigateur n'a alors
 * plus rien à deviner du format de la base.
 */
function instantDe(?string $quand): ?int
{
    if ($quand === null || $quand === '') {
        return null;
    }
    $t = strtotime($quand . ' UTC');
    return $t === false ? null : $t;
}

/**
 * RENOMMER UN ÉLÈVE — changer l'identifiant avec lequel il se connecte.
 *
 * RÉMY : « j'aimerais aussi pouvoir modifier le pseudo d'un élève et son mot
 * de passe », et aussitôt après : « il faut que ce soit simple de le
 * renommer ». Donc pas de cérémonie ici : on vérifie ce qu'il faut, on écrit,
 * on rend une phrase de français.
 *
 * TROIS CHOSES À SAVOIR, ET AUCUNE NE SE DEVINE EN LISANT L'APPEL.
 *
 * · L'IDENTIFIANT EST UNIQUE DANS TOUTE LA BASE, pas seulement dans la
 *   classe : « login_key » est l'index aveugle sur lequel « /login » cherche,
 *   et deux élèves qui le partageraient feraient entrer l'un chez l'autre.
 *   On refuse donc, et on le DIT — « déjà pris » est une information utile,
 *   « impossible » n'en est pas une.
 * · L'ÉLÈVE QUI PORTE DÉJÀ CE PSEUDO PEUT ÊTRE LUI-MÊME. Renommer « marie.d »
 *   en « Marie.D » ne doit pas échouer : « identifiantDe » met en minuscules
 *   et range la ponctuation, donc l'empreinte est la même. On compare les
 *   identifiants de LIGNE, pas les empreintes.
 * · LE CODE NE CHANGE PAS. Un billet distribué ne se périme pas parce qu'on
 *   corrige une faute de frappe dans un prénom. C'est la règle que l'import
 *   suit déjà (« Le nom peut avoir été corrigé ; le code, jamais »).
 *
 * @return array{ok:bool,dit:string,login:string}
 */
function renommerEleve(string $eleveId, string $classeId, string $nouveau): array
{
    $voulu = identifiantDe($nouveau);
    if ($voulu === '') {
        return ['ok' => false, 'login' => '',
                'dit' => 'Un identifiant vide ne permet de se connecter à rien.'];
    }

    $s = db()->prepare('SELECT id FROM students WHERE id = ? AND class_id = ? LIMIT 1');
    $s->execute([$eleveId, $classeId]);
    if (!$s->fetchAll()) {
        return ['ok' => false, 'login' => '', 'dit' => 'Cet élève n\'est pas dans cette classe.'];
    }

    // DÉJÀ PRIS, ET PAR QUI ? On ne nomme pas l'autre élève — il peut être
    // dans la classe d'un collègue, et son prénom ne regarde personne.
    $s = db()->prepare('SELECT id FROM students WHERE login_key = ? LIMIT 1');
    $s->execute([empreinteLogin($voulu)]);
    $occupant = $s->fetchAll()[0] ?? null;
    if ($occupant && (string) $occupant['id'] !== $eleveId) {
        return ['ok' => false, 'login' => '',
                'dit' => '« ' . $voulu . ' » est déjà pris. Ajoutez une initiale, '
                       . 'par exemple « ' . $voulu . '.2 ».'];
    }

    db()->prepare('UPDATE students SET login = ?, login_key = ? WHERE id = ?')
        ->execute([chiffrer($voulu), empreinteLogin($voulu), $eleveId]);
    return ['ok' => true, 'login' => $voulu,
            'dit' => 'Il se connecte maintenant avec « ' . $voulu . ' ». Son code n\'a pas changé.'];
}

/**
 * CORRIGER LE PRÉNOM D'UN ÉLÈVE.
 *
 * RÉMY : « il faudrait aussi pouvoir changer le nom et le mdp avec un double
 * clic ». Le NOM, cette fois — et c'était le seul des trois champs de la ligne
 * que rien ne changeait : il fallait recoller toute la liste de la classe pour
 * corriger une faute de frappe sur un prénom.
 *
 * DEUX CHOSES, ET LA SECONDE EST LA RAISON D'ÊTRE DE CETTE FONCTION.
 *
 * · `first_name_key` DOIT SUIVRE. C'est l'index aveugle sur lequel l'import
 *   reconnaît un élève déjà là (« entré par le code de la classe — il garde
 *   son travail »). Le laisser derrière, c'est préparer un doublon au prochain
 *   collage de liste : l'élève ne serait plus reconnu, et l'on créerait un
 *   second compte qui n'aurait fait aucun exercice.
 * · AUCUNE UNICITÉ N'EST EXIGÉE, à la différence de l'identifiant. Deux Lucas
 *   dans une classe, cela existe ; c'est l'identifiant qui les distingue, et
 *   lui seul sert à se connecter.
 *
 * @return array{ok:bool,dit:string,prenom:string}
 */
function renommerLePrenom(string $eleveId, string $classeId, string $nouveau): array
{
    $voulu = trim(preg_replace('/\s+/u', ' ', $nouveau) ?? $nouveau);
    if ($voulu === '') {
        return ['ok' => false, 'prenom' => '', 'dit' => 'Un prénom vide ne désigne personne.'];
    }
    if (mb_strlen($voulu) > 60) {
        return ['ok' => false, 'prenom' => '', 'dit' => 'Ce prénom est trop long (60 signes au plus).'];
    }

    $s = db()->prepare('SELECT id FROM students WHERE id = ? AND class_id = ? LIMIT 1');
    $s->execute([$eleveId, $classeId]);
    if (!$s->fetchAll()) {
        return ['ok' => false, 'prenom' => '', 'dit' => 'Cet élève n\'est pas dans cette classe.'];
    }

    db()->prepare('UPDATE students SET first_name = ?, first_name_key = ? WHERE id = ?')
        ->execute([chiffrer($voulu), empreintePrenom($voulu), $eleveId]);
    return ['ok' => true, 'prenom' => $voulu,
            'dit' => 'Il s\'appelle maintenant ' . $voulu
                   . '. Son identifiant et son code n\'ont pas changé.'];
}

/**
 * Un nouveau code pour un élève. Rend faux s'il n'est pas dans cette classe.
 *
 * `$choisi` VIDE : on tire au hasard, comme avant. RENSEIGNÉ : le professeur
 * pose le code qu'il veut — Rémy : « modifier […] son mot de passe ». Un élève
 * qui a oublié le sien repart ainsi avec celui que son professeur lui dicte,
 * au lieu d'un tirage qu'il faut réimprimer.
 *
 * MIS EN MAJUSCULES POUR LE BILLET, et pas pour la connexion — c'est la
 * correction d'une affirmation que j'avais écrite ici sans la vérifier.
 * `/login` compare `strtoupper($attendu)` au code tapé : un code rangé en
 * minuscules laisse donc TRÈS BIEN entrer. Les deux mises en majuscules sont
 * redondantes, et `tools/epreuveTombe.mjs` l'a prouvé en retirant chacune
 * tour à tour sans faire tomber la moindre épreuve.
 *
 * La vraie raison tient en une ligne : le code est IMPRIMÉ. Il s'affiche sur
 * la ligne de l'élève et sur son billet, à côté de ceux de ses camarades qui
 * sont tous en majuscules. Un « zb7k » au milieu de vingt-neuf « 4KP2 » se
 * recopie de travers.
 */
function nouveauCodePourEleve(string $eleveId, string $classeId, string $choisi = ''): bool
{
    $s = db()->prepare('SELECT id FROM students WHERE id = ? AND class_id = ?');
    $s->execute([$eleveId, $classeId]);
    if (!$s->fetchAll()) {
        return false;
    }
    $choisi = trim($choisi);
    db()->prepare('UPDATE students SET access_code = ? WHERE id = ?')
        ->execute([chiffrer($choisi !== '' ? mb_strtoupper($choisi) : codeEleve()), $eleveId]);
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
 * CE QUE CHACUN FAIT EN CE MOMENT, ET OÙ IL EN EST.
 *
 * On remonte les derniers événements et l'on répond à quatre questions, dans
 * l'ordre où le professeur se les pose en marchant dans les rangs : sur quel
 * parcours est-il ? sur quel exercice ? est-ce que ça marche ? et — celle que
 * Rémy réclamait — OÙ EN EST-IL DE SA SÉANCE ?
 *
 * DEUX CENTS, ET PAS TOUT LE JOURNAL. Un élève qui travaille depuis une heure
 * a quelques centaines d'événements, et l'on relit cette fonction toutes les
 * dix secondes pour trente élèves. Deux cents couvrent largement la séance en
 * cours — un parcours de cinq étapes à dix questions en produit une soixantaine,
 * le double avec les seconds essais — et bornent le coût de la page.
 *
 * ET C'EST LA MÊME LECTURE QUI SERT AUX DEUX. L'avancement aurait pu se
 * calculer à part ; ce serait une seconde requête par élève, soixante au lieu
 * de trente à chaque battement, pour des lignes qu'on vient de déchiffrer.
 */
function derniereActivite(string $eleveId, ?string $identiteSeance = null,
                          ?string $nomSeance = null): array
{
    // CE QUI FAIT QU'UN TRAVAIL APPARTIENT À LA SÉANCE EN COURS.
    //
    // DEUX CLEFS, ET LA SECONDE N'EST PAS UN LUXE. L'identité est une empreinte
    // du CONTENU : dès que le professeur complète la séance en route — « + un
    // exercice », qu'il fait en pleine heure —, le parcours change, et l'élève
    // qui l'ouvre APRÈS en calcule une autre. L'identité rangée dans
    // `assignments` est figée exprès (le bilan doit continuer de compter le
    // même travail), si bien que les deux ne se rejoignent plus et que l'élève
    // arrivé après l'ajout passerait pour n'ayant rien commencé.
    //
    // LE NOM, LUI, NE BOUGE PAS quand on ajoute un exercice. Deux séances
    // homonymes se confondraient — c'est le seul faux positif, et il rend
    // alors le comportement d'avant, qui montrait n'importe quel travail.
    $deLaSeance = function (array $r) use ($identiteSeance, $nomSeance): bool {
        if ($identiteSeance === null && $nomSeance === null) return true;
        if ($identiteSeance !== null && (string) ($r['pathId'] ?? '') === $identiteSeance) return true;
        if ($nomSeance !== null && $nomSeance !== ''
            && (string) ($r['pathName'] ?? '') === $nomSeance) return true;
        return false;
    };
    $s = db()->prepare(
        'SELECT type, ts, payload FROM events WHERE student_id = ?
         ORDER BY seq DESC LIMIT 200'
    );
    $s->execute([$eleveId]);
    $lignes = $s->fetchAll();

    // Les événements remis À L'ENDROIT pour la projection : `runsOf` lit une
    // histoire, pas une pile.
    $pourLeRun = [];
    foreach ($lignes as $l) {
        $pourLeRun[] = ['type' => $l['type'], 'ts' => (int) $l['ts'],
                        'payload' => json_decode((string) dechiffrer($l['payload']), true) ?: []];
    }

    // LE RUN LE PLUS RÉCENT, ET LUI SEUL. `runsOf` les rend déjà du plus récent
    // au plus ancien. Un run coupé en deux par la limite de deux cents
    // événements se lit sans son `run_started` : il n'a alors pas de plan, et
    // l'avancement le dit en étapes plutôt qu'en questions — c'est moins
    // précis, ce n'est pas faux.
    // ON SAUTE LES PARTIES DU BAC À SABLE. Une partie de Tetris ouverte après
    // un devoir rendu est plus RÉCENTE que le devoir ; sans ce filtre, le
    // professeur verrait « Étape 1 sur 1 » remplacer « Terminé — 18 / 24
    // justes » et croirait sa classe repartie au travail.
    $runs = runsOf(array_reverse($pourLeRun));
    $duTravail = null;
    foreach ($runs as $r) {
        if (!empty($r['bac'])) continue;
        // ET SI UNE SÉANCE EST IMPOSÉE, C'EST D'ELLE QU'ON PARLE.
        //
        // RÉMY : « quand je mets une nouvelle séance en cours, pour le direct,
        // ce sont les progressions de la séance d'avant qui apparaissent,
        // toutes les élèves devraient être à 0 ».
        //
        // Il avait raison, et la cause tient en une ligne : on prenait le run
        // le PLUS RÉCENT, sans regarder à quel travail il appartient. Un élève
        // qui n'a pas encore ouvert la séance d'aujourd'hui montrait donc son
        // devoir d'hier — « Terminé, 18 / 24 » — sur le tableau de bord de
        // l'heure en cours. Le professeur lit cet écran debout, au fond de la
        // salle, pour décider s'il peut passer à la suite : c'est exactement
        // la décision qu'une progression d'hier fausse.
        //
        // ON COMPARE LA MÊME CHOSE QUE LE BILAN DE SÉANCE : l'identité DE
        // CONTENU du parcours (`identiteDeParcours` côté navigateur), écrite
        // dans `assignments.path_identity` au moment où la séance est donnée,
        // et portée par chaque `run_started`. Le serveur ne sait pas la
        // calculer — il n'a pas à connaître cette définition —, il la lit.
        // Miroir exact de `runsDeLaSeance` dans js/core/bilanSeance.js.
        //
        // SANS IDENTITÉ CONNUE, ON NE FILTRE RIEN : une séance d'avant cette
        // colonne, ou une classe sans séance imposée, garde l'ancien
        // comportement — le dernier travail en date.
        if (!$deLaSeance($r)) continue;
        $duTravail = $r;
        break;
    }
    $avancement = avancementDeRun($duTravail);

    // ── CE QU'IL FAIT EN CE MOMENT, DANS LA SÉANCE EN COURS ────────────────
    //
    // RÉMY, deuxième passe, capture à l'appui : « tjs un bug pour la séance en
    // cours il me montre l'ancienne ». La barre disait bien « Pas commencé » —
    // le filtre posé la veille marchait — mais la colonne d'à côté montrait
    // encore « Nova · 2 / 6 », c'est-à-dire l'exercice ET le score d'HIER,
    // pour un élève vu « hier ». Une ligne qui raconte deux séances à la fois
    // ne se lit pas : on y voit la seule chose qu'on cherchait à éviter.
    //
    // J'AVAIS LAISSÉ CETTE MOITIÉ EXPRÈS, et j'avais tort. Le raisonnement
    // était « l'exercice en cours, c'est ce qu'il fait VRAIMENT, même hors
    // séance » ; mais devant trente lignes, l'oeil lit la ligne entière comme
    // un seul état, et deux séances mêlées sur une ligne mentent.
    //
    // CE QUI RESTE VISIBLE POUR L'ÉLÈVE PARTI AILLEURS : l'heure de sa
    // dernière venue (« hier », « il y a 21 min ») et, s'il est devant son
    // écran, le relevé de ce qu'il a sous les yeux — qui, lui, ne vit que
    // trois minutes et ne peut donc pas dater d'hier.
    $gardes = null;
    if ($identiteSeance !== null || ($nomSeance !== null && $nomSeance !== '')) {
        $gardes = [];
        foreach ($runs as $r) {
            if ($deLaSeance($r)) $gardes[(string) $r['runId']] = true;
        }
    }
    $exo = null; $parcours = null; $justes = 0; $total = 0; $quand = null;
    foreach ($pourLeRun as $e) {             // du plus récent au plus ancien
        $p = $e['payload'];
        if ($gardes !== null && empty($gardes[(string) ($p['runId'] ?? '')])) continue;
        $cet = $p['exerciseId'] ?? $p['exoId'] ?? null;
        if ($exo === null && $cet) {
            $exo = $cet;
            $quand = (int) $e['ts'];
        }
        if ($parcours === null && !empty($p['pathName'])) {
            $parcours = (string) $p['pathName'];
        }
        // On ne compte que l'exercice EN COURS : « 7 sur 10 » ne veut rien dire
        // s'il mélange l'exercice d'avant.
        if ($cet && $cet === $exo && $e['type'] === 'attempt') {
            $total++;
            if (!empty($p['correct'])) {
                $justes++;
            }
        }
    }

    return ['exo' => $exo, 'parcours' => $parcours, 'justes' => $justes,
            'total' => $total, 'quand' => $quand, 'combien' => count($lignes),
            'avancement' => $avancement];
}

/**
 * CE QUE L'ÉLÈVE A SOUS LES YEUX — combien de temps ça vaut encore.
 *
 * MIROIR EXACT de `ECRAN_FRAIS_MS` dans `js/core/ecran.js`, et le chiffre se
 * déduit des rythmes en place, pas du goût : l'élève parle toutes les dix
 * secondes quand son onglet est devant lui, toutes les SOIXANTE quand il est
 * derrière — et un élève qui lit son cahier a son onglet derrière. Un seuil plus
 * court ferait clignoter l'écran de celui qui réfléchit : montrer faux est pire
 * que ne rien montrer.
 */
const ECRAN_FRAIS_S = 180;

/**
 * NOTER CE QU'IL A SOUS LES YEUX. Une ligne, écrasée — jamais un journal.
 *
 * Rémy : « on ne peut jamais vraiment voir l'écran de l'élève, juste son
 * exercice, car c'est créé de façon aléatoire. » Le relevé porte LA GRAINE, qui
 * est ce qui manquait : avec elle, le professeur régénère chez lui exactement la
 * question de l'élève.
 *
 * TOUT CE QUI ARRIVE ICI VIENT D'UN CLIENT, DONC RIEN N'EST CRU. On borne chaque
 * champ, on jette le reste, et un relevé mal formé vaut « rien à l'écran » — pas
 * une erreur : un élève dont le navigateur bafouille ne doit pas cesser de
 * synchroniser son travail pour autant.
 *
 * @param string $eleveId
 * @param array|null $ecran ce que l'élève dit voir, ou null (il ne voit rien)
 * @return bool vrai si quelque chose a été noté
 */
function noterLEcran(string $eleveId, $ecran): bool
{
    $court = function ($v, int $max): ?string {
        if (!is_string($v) && !is_numeric($v)) return null;
        $s = trim((string) $v);
        if ($s === '') return null;
        return mb_substr($s, 0, $max);
    };

    $exo = is_array($ecran) ? $court($ecran['exerciseId'] ?? null, 80) : null;
    if ($exo === null) {
        // IL NE VOIT RIEN, ET IL FAUT L'ÉCRIRE. Laisser l'ancien relevé
        // vieillir trois minutes, c'est laisser le professeur croire son élève
        // sur une question qu'il a quittée.
        db()->prepare('UPDATE students SET ecran = NULL, ecran_ts = NULL WHERE id = ?')
            ->execute([$eleveId]);
        return false;
    }

    $entier = function ($v): ?int {
        return (is_int($v) || (is_string($v) && ctype_digit($v))) ? (int) $v : null;
    };
    // SES RÉGLAGES À LUI — Rémy : « le même exercice avec les mêmes paramètres
    // que l'élève ». La graine ne rejoue une question qu'à réglages ÉGAUX : le
    // générateur lit les deux, et changer un palier change les nombres tirés.
    //
    // ON NE CROIT TOUJOURS RIEN. Le client a déjà taillé (voir
    // `reglagesQuiVoyagent`), mais rien n'oblige un client à être le nôtre : on
    // retaille ici, aux mêmes bornes. Valeurs simples et tableaux de valeurs
    // simples, quarante clefs, et l'on jette tout si l'ensemble dépasse — un
    // relevé trop gros vaut « pas de réglages », jamais une erreur.
    $reglages = null;
    if (is_array($ecran['reglages'] ?? null)) {
        $simple = fn($v) => is_string($v) || is_int($v) || is_float($v) || is_bool($v);
        $r = [];
        foreach ($ecran['reglages'] as $cle => $v) {
            if (count($r) >= 40) break;
            if (!is_string($cle) || mb_strlen($cle) > 60) continue;
            if ($v === null || $simple($v)) { $r[$cle] = is_string($v) ? mb_substr($v, 0, 120) : $v; continue; }
            if (is_array($v) && $v === array_values($v)) {
                $liste = [];
                foreach (array_slice($v, 0, 40) as $x) {
                    if ($simple($x)) $liste[] = is_string($x) ? mb_substr($x, 0, 120) : $x;
                }
                if ($liste) $r[$cle] = $liste;
            }
        }
        if ($r && mb_strlen((string) json_encode($r, JSON_UNESCAPED_UNICODE)) <= 900) $reglages = $r;
    }

    $propre = [
        'exerciseId' => $exo,
        'graine'   => $court($ecran['graine'] ?? null, 64),
        'question' => $court($ecran['question'] ?? null, 240),
        'etape'    => $court($ecran['etape'] ?? null, 120),
        'fait'     => $entier($ecran['fait'] ?? null),
        'total'    => $entier($ecran['total'] ?? null),
        'reglages' => $reglages,
    ];

    // L'HORODATAGE EST CELUI DU SERVEUR, PAS CELUI DE LA TABLETTE. Une horloge
    // mal réglée de dix minutes rendrait le relevé éternellement frais, ou
    // éternellement périmé ; c'est la panne qu'on a déjà payée une fois sur
    // « en ligne », et le direct s'était mis à envoyer `maintenant` pour la
    // même raison.
    db()->prepare('UPDATE students SET ecran = ?, ecran_ts = ' . sqlMaintenant() . ' WHERE id = ?')
        ->execute([chiffrer(json_encode($propre, JSON_UNESCAPED_UNICODE)), $eleveId]);
    return true;
}

/**
 * RELIRE LE RELEVÉ D'UNE LIGNE `students`, s'il vaut encore quelque chose.
 *
 * Rend `null` dès que le relevé a dépassé son âge : le professeur préfère « il
 * n'est sur aucun exercice » à une question d'il y a un quart d'heure, qui
 * l'enverrait conseiller à côté.
 */
function ecranDeLEleve(?array $ligne, ?int $maintenant = null): ?array
{
    if (!$ligne || empty($ligne['ecran'])) return null;
    // L'INSTANT SE LIT COMME TOUS LES AUTRES DE CETTE API — voir `instantDe`.
    // La colonne porte une date, parce que `sqlMaintenant()` en écrit une ;
    // écrire un entier ici aurait demandé une seconde façon de dire l'heure.
    $quand = instantDe($ligne['ecran_ts'] ?? null);
    if ($quand === null) return null;
    $maintenant = $maintenant ?? time();
    if ($maintenant - $quand >= ECRAN_FRAIS_S) return null;
    $clair = dechiffrer((string) $ligne['ecran']);
    if ($clair === null || $clair === '') return null;
    $lu = json_decode($clair, true);
    if (!is_array($lu)) return null;
    $lu['ts'] = $quand;
    return $lu;
}
