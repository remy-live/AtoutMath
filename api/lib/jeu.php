<?php
// LES JEUX DE CLASSE, JOUÉS POUR DE VRAI — à trente ardoises.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « Fais tout ». Les quatre jeux — le plateau des nombres, le chat
// perché, la ruée, la pluie — n'existaient qu'en mode démonstration, un seul
// navigateur contre des pions de l'ordinateur. Ce fichier est ce qui les fait
// jouer par une classe entière.
//
// ── CE QUE LE SERVEUR TIENT, ET CE QU'IL NE TIENT PAS ─────────────────────
//
// IL NE CONNAÎT PAS LES RÈGLES DU JEU, et c'est une décision, pas un oubli.
// Il ne sait pas ce qu'est un carré parfait, ni que 7 × 8 font 56, ni ce que
// vaut une prise à trois. Tout cela vit dans `js/core/plateau.js` et
// `js/core/consignes.js`, qui sont PURS et éprouvés sans navigateur — et
// réécrire ces règles en PHP, ce serait en faire une seconde vérité, qui
// finirait par ne plus dire la même chose que la première. Ce dépôt a payé
// cette leçon quatre fois cette semaine.
//
// IL TIENT DEUX CHOSES, ET ELLES SONT EXACTEMENT CELLES QU'UNE ARDOISE SEULE
// NE PEUT PAS TENIR :
//
//   1. OÙ EST TOUT LE MONDE. Trente positions, relues trente fois par seconde.
//   2. QUI EST ARRIVÉ LE PREMIER. Deux élèves ramassent le même nombre dans la
//      même demi-seconde — c'est la situation NORMALE d'un jeu à trente — et
//      il faut que l'un l'ait et l'autre non. C'est l'index d'unicité de
//      `jeu_prises` qui tranche, tout seul, sans course possible.
//
// ── CE QUE LE TERRAIN NE COÛTE PAS ────────────────────────────────────────
//
// RIEN. La graine suffit à le reconstruire : les nombres posés, leurs places,
// et la suite des consignes se recalculent à l'identique sur les trente
// ardoises. Le serveur ne range que ce qui CHANGE. C'est la décision déjà
// prise pour les questions du défi.

/** Les quatre jeux, et rien d'autre. */
const JEUX_DE_CLASSE = ['plateau', 'chat', 'ruee', 'pluie'];

/**
 * LE JEU EN COURS DANS CETTE CLASSE, ou rien.
 *
 * ON NE REND QUE CE QUI EST VIVANT : une partie dont la fin est passée n'est
 * plus une partie. L'ardoise n'a donc aucune règle à appliquer — elle reçoit
 * un jeu, ou elle n'en reçoit pas.
 */
function jeuEnCours(array $classe): ?array
{
    $fin = (int) ($classe['jeu_fin'] ?? 0);
    $type = (string) ($classe['jeu_type'] ?? '');
    if (!$fin || $fin <= time() || !in_array($type, JEUX_DE_CLASSE, true)) {
        return null;
    }
    $reglages = json_decode((string) ($classe['jeu_reglages'] ?? ''), true);
    return [
        'type' => $type,
        'graine' => (string) ($classe['jeu_graine'] ?? ''),
        'debut' => (int) ($classe['jeu_debut'] ?? 0),
        'fin' => $fin,
        'reglages' => is_array($reglages) ? $reglages : [],
        // CE QUI RESTE, en secondes. L'ardoise ne compte pas toute seule : un
        // onglet mis en arrière-plan fige les minuteurs du navigateur, et deux
        // élèves finiraient à dix secondes d'écart.
        'reste' => max(0, $fin - time()),
        'avant' => max(0, ((int) ($classe['jeu_debut'] ?? 0)) - time()),
    ];
}

/**
 * LANCER UNE PARTIE.
 *
 * ON ANNONCE LE DÉPART DOUZE SECONDES PLUS TARD, exactement comme le défi, et
 * pour exactement la même raison : l'ardoise n'apprend qu'un jeu a commencé
 * QU'À SON BATTEMENT DE SÉANCE, qui passe toutes les dix secondes. Celle qui
 * vient de battre l'apprendrait dix secondes trop tard.
 *
 * J'AVAIS ÉCRIT HUIT, en me disant que le battement du jeu est à la seconde.
 * C'était faux : le battement à la seconde ne commence QU'UNE FOIS LE JEU
 * CONNU. C'est le battement lent qui l'annonce, et c'est donc lui qui commande
 * ce nombre-là.
 */
function lancerLeJeu(array $classe, string $type, int $secondes, array $reglages): array
{
    if (!in_array($type, JEUX_DE_CLASSE, true)) {
        return ['ok' => false, 'dit' => 'Ce jeu n\'existe pas.'];
    }
    $secondes = max(30, min(600, $secondes));
    $debut = time() + 12;
    $fin = $debut + $secondes;
    // LA GRAINE EST TIRÉE ICI, PAS PAR L'ÉCRAN : c'est la seule façon que le
    // terrain soit le même pour les trente, et personne ne peut la choisir
    // pour retomber sur un terrain qu'il connaît déjà.
    $graine = bin2hex(random_bytes(6));
    ecrireMalgreLaRuee(
        'UPDATE classes SET jeu_type = ?, jeu_graine = ?, jeu_debut = ?, jeu_fin = ?,
                jeu_reglages = ? WHERE id = ?',
        [$type, $graine, $debut, $fin, json_encode($reglages), $classe['id']]
    );
    // ON EFFACE CE QUI RESTAIT DE LA PARTIE D'AVANT. Sans cela, une prise de
    // la partie précédente porterait le même `quoi` qu'une cible de celle-ci
    // et paraîtrait déjà prise — un nombre invisible sur le terrain, et
    // personne pour comprendre pourquoi.
    ecrireMalgreLaRuee('DELETE FROM jeu_pions WHERE class_id = ?', [$classe['id']]);
    ecrireMalgreLaRuee('DELETE FROM jeu_prises WHERE class_id = ?', [$classe['id']]);
    return ['ok' => true, 'jeu' => [
        'type' => $type, 'graine' => $graine, 'debut' => $debut, 'fin' => $fin,
        'reglages' => $reglages,
    ]];
}

/** Arrêter la partie en cours. Le terrain s'efface avec elle. */
function arreterLeJeu(array $classe): array
{
    ecrireMalgreLaRuee(
        'UPDATE classes SET jeu_type = NULL, jeu_debut = NULL, jeu_fin = NULL WHERE id = ?',
        [$classe['id']]
    );
    return ['ok' => true, 'dit' => 'Jeu arrêté.'];
}

/**
 * OÙ EN EST CHAQUE JOUEUR, ET CE QUI A ÉTÉ PRIS.
 *
 * ── POURQUOI LES PRÉNOMS VOYAGENT, ET POURQUOI C'EST SANS DANGER ──────────
 *
 * Un élève voit les prénoms de SA classe, qu'il connaît déjà — il est assis
 * à côté d'eux. Rien d'autre ne descend : ni score individuel nommé, ni
 * historique. Et l'écran ne les montre que si le professeur l'a demandé.
 */
function mondeDuJeu(array $classe, string $eleveId): array
{
    $debut = (int) ($classe['jeu_debut'] ?? 0);
    $s = db()->prepare(
        'SELECT p.student_id, p.x, p.y, p.nombre, p.points, p.fige, p.malus, e.first_name
           FROM jeu_pions p JOIN students e ON e.id = p.student_id
          WHERE p.class_id = ? AND p.jeu_debut = ?'
    );
    $s->execute([$classe['id'], $debut]);
    $lignes = $s->fetchAll();
    $maintenant = time();
    $pions = [];
    $scores = [0, 0];
    $moi = null;
    foreach ($lignes as $l) {
        $equipe = equipeDeLEleve((string) $classe['id'], (string) $l['student_id']);
        // LES POSITIONS SONT RANGÉES EN MILLIÈMES DE CASE : on les rend en
        // cases, comme l'écran les attend.
        $pion = [
            'id' => $l['student_id'],
            'prenom' => dechiffrer($l['first_name']),
            'equipe' => $equipe,
            'x' => ((int) $l['x']) / 1000,
            'y' => ((int) $l['y']) / 1000,
            'nombre' => (int) $l['nombre'],
            'fige' => max(0, ((int) $l['fige']) - $maintenant),
        ];
        $scores[$equipe] += (int) $l['points'];
        // CE QU'IL A FAIT PERDRE À SON ÉQUIPE. Rémy : « si on ne trompe on a une
        // pénalité ». La pénalité en points est COLLECTIVE au plateau — c'est
        // son choix, et c'est ce qui rend l'erreur chère : on joue en équipe.
        $scores[$equipe] -= (int) $l['malus'];
        $pions[] = $pion;
        if ($l['student_id'] === $eleveId) {
            $moi = ['equipe' => $equipe, 'fige' => $pion['fige'], 'points' => (int) $l['points']];
        }
    }
    // ON NE REND AUCUN ORDRE, ET L'ARDOISE N'EN DEMANDE AUCUN.
    //
    // J'avais d'abord écrit `ORDER BY rowid` : l'ardoise fait réapparaître un
    // nombre ailleurs à chaque prise, et si cette place se calculait depuis le
    // RANG de la prise, deux ardoises servies dans un ordre différent
    // dessineraient deux terrains différents. Mais `rowid` n'existe pas en
    // MySQL, que ce dépôt sert aussi — la requête aurait rendu un 500 le jour
    // où Rémy changerait de base, et personne n'aurait relié les deux.
    //
    // CORRIGÉ DU BON CÔTÉ : la place du nombre neuf se calcule depuis la graine
    // ET L'IDENTIFIANT DE LA PRISE (`plateauUI.js`), jamais depuis son rang. Le
    // terrain ne dépend alors que de l'ENSEMBLE des prises, et deux ardoises
    // convergent même servies à l'envers. Une contrainte qu'on n'a plus besoin
    // de tenir vaut mieux qu'une contrainte qu'on tient bien.
    $q = db()->prepare(
        'SELECT quoi, equipe, points FROM jeu_prises WHERE class_id = ? AND jeu_debut = ?'
    );
    $q->execute([$classe['id'], $debut]);
    $prises = [];
    foreach ($q->fetchAll() as $l) {
        $prises[] = (string) $l['quoi'];
        $e = (int) $l['equipe'];
        $pts = (int) $l['points'];
        // L'ÉQUIPE −1 VEUT DIRE « PARTAGÉE ». C'est la règle de Rémy au
        // plateau : « Si c'est un rouge et un bleu qui se rejoignent les
        // points sont partagés » — la moitié à CHACUNE, et non la moitié à
        // l'une et rien à l'autre.
        if ($e < 0) {
            $scores[0] += intdiv($pts, 2);
            $scores[1] += intdiv($pts, 2);
        } elseif ($e === 0 || $e === 1) {
            $scores[$e] += $pts;
        }
    }
    if ($moi === null) {
        $moi = ['equipe' => equipeDeLEleve((string) $classe['id'], $eleveId),
                'fige' => 0, 'points' => 0];
    }
    // UN SCORE D'ÉQUIPE NE DESCEND PAS SOUS ZÉRO. C'est la règle déjà écrite
    // dans `scoreApresPenalite` côté règles ; elle vaut ici aussi, sans quoi
    // une équipe qui se trompe trois fois avant sa première prise afficherait
    // « −60 » au tableau devant la classe.
    $scores[0] = max(0, $scores[0]);
    $scores[1] = max(0, $scores[1]);
    return ['pions' => $pions, 'prises' => $prises, 'scores' => $scores, 'moi' => $moi];
}

/**
 * JE POSE MON PION, ET JE DIS CE QUE J'AI MARQUÉ TOUT SEUL.
 *
 * ── CE QUE LE SERVEUR CROIT L'ÉLÈVE SUR PAROLE, ET POURQUOI ───────────────
 *
 * Sa position et ses points NON EXCLUSIFS — les secondes passées perché, au
 * chat perché — lui sont crus. Le serveur ne peut pas les vérifier sans
 * rejouer le jeu, c'est-à-dire sans le réécrire en PHP, ce qu'on refuse.
 *
 * CE N'EST PAS UN TROU DE SÉCURITÉ, C'EST UN CHOIX DE PÉRIMÈTRE : ces parties
 * durent trois minutes dans une salle de classe, devant le professeur, et
 * l'enjeu est un nombre au tableau. Ce qui COMPTE — qu'un nombre ne soit pris
 * qu'une fois — est arbitré pour de bon, plus bas. Et les points d'un pion
 * sont BORNÉS : un score qui ne peut pas dépasser le temps écoulé ferme la
 * porte aux bêtises visibles sans prétendre à autre chose.
 */
function poserMonPion(array $eleve, array $classe, array $corps): void
{
    $debut = (int) ($classe['jeu_debut'] ?? 0);
    if (!$debut) {
        return;
    }
    $maintenant = time();
    // EN MILLIÈMES DE CASE, et bornées à un terrain plausible : une position
    // absurde ferait dessiner un rond hors de l'écran chez les vingt-neuf
    // autres.
    $x = max(0, min(30000, (int) round(((float) ($corps['x'] ?? 0)) * 1000)));
    $y = max(0, min(30000, (int) round(((float) ($corps['y'] ?? 0)) * 1000)));
    $nombre = max(0, min(999, (int) ($corps['nombre'] ?? 0)));
    // LE PLAFOND DES POINTS LIBRES : une seconde perché vaut un point, donc
    // le temps écoulé est la borne naturelle. Elle est large — on ne cherche
    // pas à mesurer, on cherche à ce qu'un chiffre impossible ne s'affiche
    // pas au tableau devant la classe.
    $plafond = max(0, $maintenant - $debut) + 10;
    $points = max(0, min($plafond, (int) ($corps['points'] ?? 0)));

    $deja = lireUne('SELECT id, fige, malus FROM jeu_pions
                      WHERE class_id = ? AND jeu_debut = ? AND student_id = ?',
        [$classe['id'], $debut, $eleve['id']]);
    // LA PÉNALITÉ EST TENUE PAR LE SERVEUR, et elle ne fait que MONTER : une
    // punition qu'on efface en rechargeant sa page n'est pas une punition.
    $fige = (int) ($deja['fige'] ?? 0);
    $pour = max(0, min(30, (int) ($corps['figePour'] ?? 0)));
    if ($pour > 0) {
        $fige = max($fige, $maintenant + $pour);
    }
    // ET LE MALUS NON PLUS NE REDESCEND PAS. L'ardoise envoie ce qu'elle a
    // cumulé depuis le début de la partie, pas l'erreur du moment : un
    // battement perdu dans le réseau effacerait sinon la punition. On garde le
    // plus grand des deux, comme pour `fige`. Le plafond vaut quatre cents, soit
    // vingt erreurs à vingt points — au-delà, c'est une bêtise, pas une partie.
    $malus = (int) ($deja['malus'] ?? 0);
    $malus = max($malus, max(0, min(400, (int) ($corps['malus'] ?? 0))));
    if ($deja) {
        ecrireMalgreLaRuee(
            'UPDATE jeu_pions SET x = ?, y = ?, nombre = ?, points = ?, fige = ?,
                    malus = ?, maj = ? WHERE id = ?',
            [$x, $y, $nombre, $points, $fige, $malus, $maintenant, $deja['id']]
        );
        return;
    }
    ecrireMalgreLaRuee(
        'INSERT INTO jeu_pions (id, class_id, student_id, jeu_debut, x, y, nombre,
                                points, fige, malus, maj)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), $classe['id'], $eleve['id'], $debut, $x, $y, $nombre,
         $points, $fige, $malus, $maintenant]
    );
}

/**
 * JE RÉCLAME UNE PRISE — et le premier arrivé l'emporte.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * C'EST LE SEUL ENDROIT OÙ LE SERVEUR ARBITRE VRAIMENT, et il le fait sans
 * connaître une seule règle du jeu : il regarde si ce `quoi`-là a déjà été
 * réclamé dans cette partie. L'index d'unicité de `jeu_prises` répond tout
 * seul — le second INSERT échoue, et c'est la réponse.
 *
 * ON N'INTERROGE PAS AVANT D'INSÉRER. « Est-ce déjà pris ? » puis « alors
 * j'insère » laisse passer les DEUX quand les deux requêtes s'entrelacent — et
 * elles s'entrelacent plusieurs fois par minute à trente joueurs. On insère, et
 * l'échec EST le refus.
 */
function reclamerUnePrise(array $eleve, array $classe, array $prise): array
{
    $debut = (int) ($classe['jeu_debut'] ?? 0);
    $quoi = trim((string) ($prise['quoi'] ?? ''));
    if (!$debut || $quoi === '' || strlen($quoi) > 60) {
        return ['ok' => false];
    }
    $equipe = (int) ($prise['equipe'] ?? 0);
    if ($equipe < -1 || $equipe > 1) {
        $equipe = 0;
    }
    // LES POINTS D'UNE PRISE SONT BORNÉS. Le plafond vaut le double du plus
    // gros carré du plateau (81 × 2 = 162, à trois pions) ; les jeux vifs
    // comptent par dizaines. Au-delà, c'est une faute de frappe ou une bêtise.
    $points = max(0, min(200, (int) ($prise['points'] ?? 0)));
    try {
        ecrireMalgreLaRuee(
            'INSERT INTO jeu_prises (id, class_id, student_id, jeu_debut, quoi, equipe, points)
             VALUES (?, ?, ?, ?, ?, ?, ?)',
            [uuidv4(), $classe['id'], $eleve['id'], $debut, $quoi, $equipe, $points]
        );
        return ['ok' => true, 'quoi' => $quoi];
    } catch (Throwable $t) {
        // L'UNICITÉ A PARLÉ : quelqu'un l'a pris avant. Ce n'est pas une
        // erreur, c'est le jeu.
        return ['ok' => false, 'quoi' => $quoi, 'dit' => 'Déjà pris.'];
    }
}

/**
 * CE QUE LE PROFESSEUR VOIT DE LA PARTIE, sur son écran du direct.
 *
 * Trois nombres : le score des deux équipes et combien d'élèves y sont. C'est
 * ce qu'il annonce à voix haute pendant que ça joue.
 */
function resumeDuJeu(array $classe): ?array
{
    $j = jeuEnCours($classe);
    if (!$j) {
        return null;
    }
    $debut = (int) ($classe['jeu_debut'] ?? 0);
    $n = lireUne('SELECT COUNT(*) AS n FROM jeu_pions WHERE class_id = ? AND jeu_debut = ?',
        [$classe['id'], $debut]);
    $monde = mondeDuJeu($classe, '');
    return [
        'type' => $j['type'],
        'reste' => $j['reste'],
        'avant' => $j['avant'],
        'joueurs' => (int) ($n['n'] ?? 0),
        'scores' => $monde['scores'],
        'prises' => count($monde['prises']),
    ];
}
