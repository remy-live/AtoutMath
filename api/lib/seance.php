<?php
declare(strict_types=1);

/**
 * CE QUE LE PROFESSEUR PILOTE PENDANT LA SÉANCE.
 *
 * Rémy, en une phrase : « verrouiller la partie élève pour qu'il n'ait accès
 * qu'à ce que je leur donne, la possibilité d'envoyer un message
 * individuellement, d'avoir un vrai contrôle sur ce qu'ils font, pouvoir
 * supprimer ou autoriser le saut d'un exercice au cas où un exercice plante et
 * empêche la progression. »
 *
 * Quatre demandes, un seul objet : l'ÉTAT DE SÉANCE. Le client le reçoit à
 * chaque synchronisation et s'y conforme. Il tient dans un petit JSON, et c'est
 * délibéré : pendant une heure de cours, trente navigateurs le demandent en
 * boucle, et il doit coûter une requête, pas dix.
 *
 * LE CLIENT S'Y CONFORME, IL N'EST PAS CONTRAINT PAR LUI. Un élève qui ouvre
 * les outils de développement peut ignorer le verrou — comme il peut retourner
 * sa copie pendant un devoir. Ce verrou-là sert à ce que la classe travaille
 * sur ce qu'on lui a donné, pas à résister à un adversaire. Ce qui est vraiment
 * protégé, c'est le SERVEUR : un élève écarté ne peut pas se rattacher, et
 * personne ne peut lire les données d'un autre. Le reste est de la conduite de
 * classe, et la conduite de classe se fait avec les élèves, pas contre eux.
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/coffre.php';
// `jeuEnCours` vit dans jeu.php, et `etatDeSeance` l'appelle : c'est par ce
// battement-ci qu'une ardoise APPREND qu'une partie a commencé.
require_once __DIR__ . '/jeu.php';

/** Un horodatage de la base (UTC) vers des millisecondes, comme le journal. */
function msDepuisSql(?string $quand): ?int
{
    if (!$quand) {
        return null;
    }
    $t = strtotime($quand . ' UTC');
    return $t === false ? null : $t * 1000;
}

/**
 * LE FUSEAU DE L'ÉTABLISSEMENT.
 *
 * « La fin de la journée » n'a de sens que quelque part. Le serveur, lui,
 * compte volontiers en UTC : à minuit à Paris il est encore 22 h la veille pour
 * lui l'été, et la séance s'éteindrait deux heures trop tard. On nomme donc le
 * fuseau plutôt que de laisser l'hébergeur le deviner, et on le laisse
 * réglable : ce logiciel n'est pas réservé à la métropole.
 */
function fuseauDeLEcole(): DateTimeZone
{
    $c = function_exists('config') ? config() : [];
    try {
        return new DateTimeZone((string) ($c['timezone'] ?? 'Europe/Paris'));
    } catch (Throwable $t) {
        return new DateTimeZone('Europe/Paris');
    }
}

/**
 * JUSQU'À QUAND UNE SÉANCE S'IMPOSE — la règle, en un seul endroit.
 *
 * Rémy : « si je ne clos pas une séance, à la maison l'élève aura toujours la
 * séance en cours non ? » La réponse était oui, et sans fin : la séance en
 * cours était une propriété de la classe qui ne périmait jamais. Posée un mardi
 * matin et oubliée, elle s'ouvrait encore toute seule le samedi.
 *
 * TROIS HEURES DU MATIN, ET NON MINUIT. C'est le seul détail qui demande une
 * justification, et elle tient en un cas : l'élève qui finit son devoir à
 * 23 h 50. À minuit pile, sa séance se refermerait au milieu d'une question.
 * Trois heures est une frontière que personne ne traverse en travaillant, et
 * elle garde la propriété qu'on veut : une séance vaut pour SA journée, et
 * le lendemain matin la classe repart libre.
 *
 * ON NE MET PAS « FIN DU COURS », parce que le serveur ne sait pas quand le
 * cours finit — et parce que le compte à rebours existe déjà pour ça.
 */
function finDeLaJourneeScolaire(?int $maintenant = null): int
{
    $t = $maintenant ?? time();
    $d = (new DateTimeImmutable('@' . $t))->setTimezone(fuseauDeLEcole());
    $trois = $d->setTime(3, 0, 0);
    // Posée après 3 h (le cas ordinaire), elle vaut jusqu'au lendemain 3 h ;
    // posée entre minuit et 3 h — un professeur qui prépare tard — elle vaut
    // jusqu'à 3 h le jour même, c'est-à-dire dans quelques heures : la journée
    // de classe qui commence est bien celle qu'il prépare.
    if ($d >= $trois) $trois = $trois->modify('+1 day');
    return $trois->getTimestamp();
}

/**
 * LA SÉANCE IMPOSÉE EST-ELLE ENCORE DE MISE ? Rend son identifiant, ou null.
 *
 * ET L'ON EFFACE CE QUI A EXPIRÉ, plutôt que de l'ignorer à chaque lecture.
 * Une base qui garde une valeur périmée ment à tout le monde sauf à la
 * fonction qui sait la filtrer : l'écran du professeur, lui, afficherait
 * encore « en cours » pour une séance que ses élèves ne reçoivent plus.
 *
 * @param array $classe une ligne `classes`
 */
/**
 * CE QU'ON A ACCORDÉ EN DIRECT MEURT AVEC L'HEURE — LES TROIS GESTES.
 *
 * ── CE QU'IL FAUT SAVOIR AVANT DE LIRE ───────────────────────────────────
 *
 * RÉMY, première fois, sur le saut : « est ce possible si sur un parcours, j'ai
 * autorisé à passer l'exercice, sur un autre parcours, cette même exercice peut
 * se passer aussi, j'ai l'impression que c'est ce qui est arrivé d'une séance
 * sur l'autre ? » C'était mesuré : oui. Puis : « attache le à la séance ».
 *
 * RÉMY, deuxième fois, capture à l'appui : « pour une séance nouvelle, il faut
 * réinitialiser les exercices que j'ai autorisé à passer ». La règle n'était
 * posée QUE SUR LE SAUT : la calculatrice accordée « pour toute la séance » et
 * l'exercice retiré pour tous survivaient aux vacances. Or son écran les
 * montrait tous les trois côte à côte, et rien ne distinguait le vivant du
 * mort. La règle est donc la même pour les trois.
 *
 * ON FILTRE ICI PLUTÔT QUE CHEZ L'ÉLÈVE : l'ardoise ne sait ni quand la séance
 * imposée expire, ni laquelle est en cours. Et l'écran du professeur appelle
 * la MÊME fonction (`overridesDeLaClasse`), sans quoi il listerait des
 * permissions que personne n'a plus.
 *
 *   · l'heure est passée — `expire_le` est derrière nous ;
 *   · ou l'on a changé de séance — `seance_id` ne désigne plus celle qui est
 *     imposée (ni aucune, si plus rien n'est imposé).
 *
 * UNE LIGNE SANS SÉANCE NI ÉCHÉANCE VAUT ENCORE : ce sont celles d'avant cette
 * règle, et celles qu'on accorde hors séance. Les éteindre d'un coup
 * retirerait à une classe une permission qu'elle est en train d'utiliser.
 */
function reglageEnVigueur(array $o, ?string $imposeId, ?int $maintenant = null): bool
{
    $maintenant = $maintenant ?? time();
    $quand = (int) ($o['expire_le'] ?? 0);
    if ($quand > 0 && $quand <= $maintenant) return false;
    $sienne = ($o['seance_id'] ?? '') !== '' ? (string) $o['seance_id'] : null;
    if ($sienne !== null && $sienne !== $imposeId) return false;
    return true;
}

function imposeEncoreValide(array $classe, ?int $maintenant = null): ?string
{
    $id = $classe['impose_path_id'] ?? null;
    if (!$id) return null;
    $jusqua = (int) ($classe['impose_jusqu_a'] ?? 0);
    // SANS ÉCHÉANCE, ON LA LAISSE. C'est le cas des séances posées avant que
    // cette règle existe : les périmer d'un coup, à la mise à jour, retirerait
    // à une classe le travail qu'elle est en train de faire.
    if ($jusqua <= 0) return (string) $id;
    if (($maintenant ?? time()) < $jusqua) return (string) $id;

    db()->prepare('UPDATE classes SET impose_path_id = NULL, impose_jusqu_a = NULL WHERE id = ?')
        ->execute([$classe['id']]);
    return null;
}

/**
 * L'état de séance d'un élève : le verrou, la consigne, ses messages non lus,
 * et les exercices que le professeur a débloqués.
 *
 * @param array $eleve la ligne `students` enrichie par requireStudent()
 */
/**
 * UNE COLONNE D'IDENTIFIANTS SÉPARÉS PAR DES VIRGULES, en tableau.
 *
 * `null` et la chaîne vide rendent la même chose — un tableau vide. C'est la
 * différence avec `bac_jeux`, où `null` veut dire « la liste par défaut » :
 * ici, rien d'autorisé veut dire porte close, qui est le comportement d'avant.
 */
function listeDIdentifiants($brut): array
{
    $t = trim((string) ($brut ?? ''));
    if ($t === '') return [];
    $out = [];
    foreach (explode(',', $t) as $x) {
        $x = trim($x);
        if ($x !== '') $out[] = $x;
    }
    return array_values(array_unique($out));
}

/**
 * ON ÉCRIT QU'IL EST ENTRÉ, ET D'OÙ.
 *
 * RÉMY : « J'aimerai aussi que tu enregistres les connexions que je puisse
 * suivre ce qu'ils font ».
 *
 * UNE LIGNE PAR IDENTIFICATION, jamais par battement : le battement frappe
 * toutes les dix secondes, et en écrire une ligne ferait un journal qu'on ne
 * lit pas. Voir la table `connexions` dans api/lib/schema.php, qui explique
 * aussi pourquoi l'on ne range AUCUNE adresse réseau.
 *
 * ET ON NE LAISSE JAMAIS LE JOURNAL EMPÊCHER D'ENTRER : une table manquante —
 * base d'avant cette colonne, migration en retard — ne doit pas refuser sa
 * classe à un élève. On avale, c'est tout.
 */
function noterLaConnexion(array $student, array $session): void
{
    $contexte = !empty($session['impose']) ? 'seance'
        : (!empty($session['horsSeance']) ? 'maison' : 'libre');
    try {
        db()->prepare('INSERT INTO connexions (id, student_id, class_id, le, contexte)
                       VALUES (?, ?, ?, ' . sqlMaintenant() . ', ?)')
            ->execute([uuidv4(), $student['id'], $student['class_id'] ?? null, $contexte]);
    } catch (Throwable $t) { /* le journal ne ferme la porte à personne */ }
}

function etatDeSeance(array $eleve): array
{
    $pdo = db();

    // La classe : on la relit plutôt que de la faire porter par la jointure de
    // requireStudent(), pour que cette fonction soit utilisable seule (elle
    // l'est dans les tests, où l'on n'a pas de requête HTTP).
    //
    // ── CETTE LISTE DE COLONNES EST TENUE À LA MAIN, ET ELLE A DÉJÀ MENTI ──
    //
    // LES CINQ COLONNES `jeu_*` MANQUAIENT, et le défaut était invisible de
    // partout. Le serveur lançait bien la partie, `/teacher/live` la voyait,
    // `/jeu` la servait, et `tools/testApi.php` la trouvait juste en 581
    // vérifications — mais AUCUNE ARDOISE NE L'APPRENAIT, parce que c'est ce
    // battement-ci qui l'annonce et que ce SELECT ne lisait pas les colonnes.
    // Rien ne criait : `jeuEnCours` recevait une ligne sans `jeu_fin`, et une
    // ligne sans `jeu_fin` veut dire « aucune partie ».
    //
    // MESURÉ PAR `tools/plateauEnClasse.mjs`, ET PAR RIEN D'AUTRE : trois vrais
    // navigateurs, l'annonce reçue par 0 sur 3. C'est le même piège que la
    // boucle d'`ALTER TABLE` de `schema.php` a fermé pour les colonnes — une
    // liste qu'il faut penser à allonger — et il se reproduit ici, dans un
    // SELECT, où aucune boucle ne peut le fermer.
    //
    // D'OÙ LA RÈGLE, ÉCRITE UNE FOIS POUR TOUTES : qui ajoute un champ à
    // `etatDeSeance` ajoute sa colonne ci-dessous, et le vérifie dans un
    // NAVIGATEUR — l'API, elle, répondra juste.
    $s = $pdo->prepare('SELECT id, name, join_code, locked, notice, impose_path_id,
                              hors_seance_exos,
                              impose_jusqu_a, impose_plein_ecran, chrono_fin, chrono_a_zero,
                              pause_mot, bac_ferme, bac_minutes, bac_jeux,
                              hors_seance, hors_seance_mot,
                              defi_exo, defi_graine, defi_mode, defi_debut, defi_fin,
                              defi_manches, defi_duree, defi_but, defi_equipes, defi_malus,
                              defi_params,
                              jeu_type, jeu_graine, jeu_debut, jeu_fin, jeu_reglages
                         FROM classes WHERE id = ?');
    $s->execute([$eleve['class_id']]);
    $classe = $s->fetch() ?: ['id' => '', 'name' => '', 'join_code' => '', 'locked' => 0,
                              'notice' => null, 'impose_path_id' => null,
                              'impose_jusqu_a' => null, 'impose_plein_ecran' => 0,
                              'chrono_fin' => null,
                              'chrono_a_zero' => null, 'bac_ferme' => 0,
                              'bac_minutes' => null, 'bac_jeux' => null];
    // LA SÉANCE IMPOSÉE A UNE FIN, et c'est ici qu'on la fait respecter : c'est
    // la porte par laquelle TOUS les élèves la reçoivent.
    $imposeId = imposeEncoreValide($classe);

    // LES MESSAGES NON LUS, adressés à lui ou à sa classe. « Non lus » et pas
    // « récents » : un élève qui arrive en retard doit voir le mot qu'on a
    // envoyé à la classe il y a dix minutes.
    $s = $pdo->prepare(
        'SELECT m.id, m.body, m.genre, m.created_at, m.student_id
           FROM messages m
           LEFT JOIN message_reads r ON r.message_id = m.id AND r.student_id = ?
          WHERE (m.student_id = ? OR m.class_id = ?) AND r.message_id IS NULL
          ORDER BY m.created_at ASC LIMIT 20'
    );
    $s->execute([$eleve['id'], $eleve['id'], $eleve['class_id']]);
    $messages = array_map(fn ($m) => [
        'id'    => $m['id'],
        'body'  => dechiffrer($m['body']),
        'ts'    => msDepuisSql($m['created_at']),
        'scope' => $m['student_id'] ? 'student' : 'class',
        // Un message sans genre est un MOT : c'est ce qu'ils étaient tous
        // avant l'indice, et l'absence doit se lire comme l'ancien
        // comportement plutôt que comme une valeur manquante.
        'genre' => ($m['genre'] ?? '') === 'indice' ? 'indice' : 'mot',
    ], $s->fetchAll());

    // LES RÉGLAGES D'EXERCICE EN VIGUEUR POUR LUI : ce qu'il peut sauter, ce
    // qui est retiré de son parcours, et où la calculatrice lui est accordée.
    // Un réglage pour la classe et un réglage pour l'élève peuvent viser le
    // même exercice ; `retire` l'emporte sur `saut`,
    // parce que retirer est le geste du professeur qui a constaté que
    // l'exercice plante — il ne veut pas que l'élève retombe dessus.
    $s = $pdo->prepare(
        'SELECT exercise_id, mode, seance_id, expire_le FROM overrides
          WHERE class_id = ? OR student_id = ?'
    );
    $s->execute([$eleve['class_id'], $eleve['id']]);
    $saut = [];
    $retire = [];
    // LA CALCULATRICE ACCORDÉE EN DIRECT. Rémy : « pourrait-on autoriser dans
    // les options l'utilisation de la calculatrice ou le permettre en direct à
    // un groupe ou aux élèves ». L'exercice `*` veut dire « toute la séance ».
    $calculatrice = [];
    foreach ($s->fetchAll() as $o) {
        if (!reglageEnVigueur($o, $imposeId)) continue;
        if ($o['mode'] === 'calculatrice') {
            $calculatrice[$o['exercise_id']] = true;
        } elseif ($o['mode'] === 'retire') {
            $retire[$o['exercise_id']] = true;
        } else {
            $saut[$o['exercise_id']] = true;
        }
    }
    // « Retiré » l'emporte toujours sur « saut autorisé » : inutile d'offrir de
    // passer un exercice qui a déjà disparu du parcours.
    $saut = array_diff_key($saut, $retire);

    // LA SÉANCE IMPOSÉE. Rémy : « est-ce qu'il ne serait pas possible que
    // lorsque les élèves se connectent, j'impose la séance, comme cela ils
    // n'ont rien à lancer ».
    //
    // ON ENVOIE LE PARCOURS ENTIER, pas seulement son identifiant. L'élève doit
    // pouvoir l'ouvrir SANS deuxième aller-retour : au moment où il arrive en
    // classe, trente appareils demandent la même chose en même temps, et le
    // travail doit commencer, pas attendre.
    $impose = null;
    if ($imposeId) {
        $q = $pdo->prepare('SELECT id, name, data FROM paths WHERE id = ?');
        $q->execute([$imposeId]);
        $p = $q->fetch();
        if ($p) {
            // L'IDENTITÉ DU TRAVAIL VOYAGE AVEC LA SÉANCE, ELLE NE SE
            // RECALCULE PLUS CHEZ CHAQUE ÉLÈVE.
            //
            // RÉMY, capture de l'onglet « Par séance » : « aucun retour sur
            // cette page ». Mesuré (`tools/bilanParSeance.mjs`) : l'élève
            // rangeait son travail sous une empreinte qu'il calculait
            // lui-même à la réception, et l'écran du professeur cherchait
            // l'identifiant du parcours. Rien ne pouvait se rencontrer.
            //
            // C'EST LE MÊME DÉFAUT QUE CELUI DÉJÀ CORRIGÉ SUR LES SÉANCES
            // DONNÉES, et pour la même raison : « Tom path_cDPF7NX, Emma
            // path_cK8LZGE, même séance, même contenu » (voir
            // `path_identity` dans api/lib/schema.php). Une identité qu'on
            // recalcule n'est pas une identité. On rend donc celle qui a été
            // FIGÉE quand la séance a été donnée.
            //
            // NULL QUAND ON NE L'A PAS — une séance imposée sans avoir été
            // donnée, ou donnée avant que la colonne n'existe. L'élève
            // retombe alors sur son calcul d'avant : rien de neuf ne casse.
            $qi = $pdo->prepare('SELECT path_identity FROM assignments
                                 WHERE path_id = ? AND class_id = ? AND student_id IS NULL');
            $qi->execute([$imposeId, $classe['id']]);
            $identite = $qi->fetchColumn();

            $impose = ['pathId' => $p['id'], 'name' => $p['name'],
                       'identite' => $identite !== false && $identite !== null
                           ? (string) $identite : null,
                       // LE PLEIN ÉCRAN VOYAGE DANS LA SÉANCE IMPOSÉE, et non à
                       // côté d'elle : c'est elle que l'élève reçoit, et un
                       // drapeau rangé ailleurs serait à retrouver au bon
                       // moment. Rémy : « oui si la séance est imposée ».
                       'pleinEcran' => (bool) ($classe['impose_plein_ecran'] ?? 0),
                       'path' => json_decode($p['data'], true)];
        }
    }

    // LE COMPTE À REBOURS. Deux issues, parce que Rémy en voulait deux : « pour
    // terminer la séance ou mettre en pause (pour faire un peu de cours par
    // exemple ou pour parler) ».
    //
    // ON ENVOIE L'INSTANT DE FIN, PAS LE NOMBRE DE SECONDES QUI RESTENT. Une
    // durée se périme entre le serveur et l'écran ; un instant, non. Chaque
    // appareil décompte tout seul ensuite, et tous affichent la même chose même
    // si leurs horloges diffèrent — on envoie aussi l'heure du serveur pour
    // qu'ils puissent corriger l'écart.
    $chrono = null;
    if (!empty($classe['chrono_fin'])) {
        $chrono = [
            'finAt'  => (int) $classe['chrono_fin'],
            'aZero'  => $classe['chrono_a_zero'] === 'pause' ? 'pause' : 'terminer',
        ];
    }

    // ── LA CLASSE EST-ELLE EN PAUSE, MAINTENANT ? ───────────────────────────
    //
    // RÉMY : « je n'ai pas réussi à mettre toute la classe en pause ».
    //
    // ON ENVOIE LA CONCLUSION, PAS LE RÉGLAGE, comme pour « fermé hors séance »
    // et pour le compte à rebours : `null` veut dire « travaille », un objet
    // veut dire « arrête-toi, et voici pourquoi ». L'ardoise n'a aucune règle à
    // appliquer — trente ardoises qui en appliqueraient une finiraient par
    // diverger du serveur.
    //
    // ET LE MOT A UN DÉFAUT : un voile muet se lit comme une panne. C'est la
    // même leçon que `hors_seance_mot`.
    $enPause = trim((string) ($classe['pause_mot'] ?? '')) !== ''
        ? ['mot' => (string) $classe['pause_mot']]
        : null;

    return [
        'className' => $classe['name'],
        'classCode' => $classe['join_code'],
        'locked'    => (bool) $classe['locked'],
        'pause'     => $enPause,
        'notice'    => $classe['notice'] !== null && $classe['notice'] !== '' ? $classe['notice'] : null,
        'blocked'   => (bool) ($eleve['blocked'] ?? 0),
        // ── FERMÉ HORS SÉANCE, ET CE QU'ON LIT ALORS ────────────────────────
        //
        // RÉMY : « j'aimerai aussi le fait de bloquer les élèves chez eux.
        // C'est à dire que juste la séance imposée fonctionne mais par contre
        // si il se connecte, on leur dit que pour l'instant ce n'est disponible
        // qu'au collège (je peux mettre le message de mon choix) ».
        //
        // LE SERVEUR TRANCHE, L'ÉCRAN OBÉIT. On n'envoie pas le réglage brut
        // pour que le navigateur en déduise quelque chose : on envoie la
        // CONCLUSION — « c'est fermé pour toi, en ce moment ». C'est la même
        // raison que pour le compte à rebours : une règle recalculée sur trente
        // appareils finit par diverger de celle du serveur.
        'horsSeance' => !empty($classe['hors_seance']) && !$imposeId,
        'horsSeanceMot' => trim((string) ($classe['hors_seance_mot'] ?? '')) !== ''
            ? (string) $classe['hors_seance_mot']
            : 'Pour l\'instant, AtoutMath ne s\'ouvre qu\'au collège, '
                . 'pendant le cours. À tout à l\'heure !',
        // CE QU'ON LAISSE PASSER MALGRÉ LA PORTE FERMÉE.
        //
        // RÉMY : « je peux laisser libre qqs exercices que j'aurais défini mais
        // attention c'est la seule chose qu'il peut faire, il ne peut pas aller
        // sur son profil ou autre ».
        //
        // ON NE L'ENVOIE QUE QUAND LA PORTE EST FERMÉE. Hors de ce moment-là,
        // la liste ne veut rien dire — tout est ouvert — et l'envoyer quand
        // même inviterait le navigateur à en déduire quelque chose. Même règle
        // que pour `horsSeance` juste au-dessus : le serveur tranche, l'écran
        // obéit.
        'horsSeanceExos' => (!empty($classe['hors_seance']) && !$imposeId)
            ? listeDIdentifiants($classe['hors_seance_exos'] ?? null) : [],
        // LE BAC À SABLE : ouvert par défaut, et c'est délibéré. Une fonction
        // qu'il faut allumer pour la découvrir n'est jamais découverte.
        'bacFerme'  => (bool) ($classe['bac_ferme'] ?? 0),
        // COMBIEN DE TEMPS DURE LE BAC, en minutes, 0 = sans limite. Le compte
        // part quand l'élève l'ouvre — voir `resteDuBac` côté client.
        'bacMinutes' => (int) ($classe['bac_minutes'] ?? 0),
        // CE QU'IL Y A DEDANS, quand le professeur l'a choisi. Rémy : « pour le
        // bac à sable j'aimerai quand même bien pouvoir éditer le contenu ».
        //
        // `null` VEUT DIRE « LA LISTE PAR DÉFAUT », et c'est différent du
        // tableau vide : vide, c'est un professeur qui a tout retiré, et le bac
        // de ses élèves doit alors rester vide. Le noyau fait déjà cette
        // distinction — `jeuxDuBac(trouver, liste)` ne retombe sur ses valeurs
        // sûres que si la liste est absente.
        'bacJeux' => ($classe['bac_jeux'] ?? null) === null
            ? null
            : (((string) $classe['bac_jeux']) === ''
                ? [] : explode(',', (string) $classe['bac_jeux'])),
        'messages'  => $messages,
        'skippable' => array_keys($saut),
        'removed'   => array_keys($retire),
        // Les exercices où le professeur vient d'autoriser la calculatrice —
        // `*` valant pour toute la séance.
        'calculatrice' => array_keys($calculatrice),
        'impose'    => $impose,
        'chrono'    => $chrono,
        // ── LE DÉFI, ET LE TABLEAU QUI LE SUIT ──────────────────────────────
        //
        // DEUX CHAMPS ET NON UN, parce que ce sont deux moments : pendant, on
        // répond ; après, on regarde. Un seul champ obligerait l'écran à
        // deviner lequel des deux il tient, et il le devinerait en comparant
        // des horloges — celle du serveur et la sienne.
        'defi'        => defiEnCours($classe),
        // LE JEU DE CLASSE PASSE PAR LA MÊME PORTE QUE LE DÉFI.
        //
        // RÉMY : « Fais tout ». C'est ce champ-ci qui fait qu'une ardoise
        // APPREND qu'une partie a commencé — et c'est pour cela que le départ
        // est annoncé douze secondes à l'avance : ce battement-ci passe toutes
        // les dix secondes. Une fois le jeu connu, l'écran ouvre un second
        // fil, à la seconde, qui ne porte que le monde (`/jeu`).
        'jeu'         => jeuEnCours($classe),
        // ── CE QUE LA CLASSE A MARQUÉ ENSEMBLE, EN DIRECT ────────────────
        //
        // RÉMY : « Le défi ca cartonne, des idées dans ce style ». La barre de
        // la classe et les deux équipes ont besoin du total de TOUT LE MONDE
        // pendant que le défi tourne — alors que chacun n'envoyait le sien
        // qu'à la fin.
        //
        // ON N'AJOUTE AUCUNE REQUÊTE : le total part dans la réponse du
        // battement, qui passait de toute façon. C'est la même décision que
        // pour l'écran de l'élève, qui voyage lui aussi dans cette requête-ci
        // plutôt que dans une route à part.
        //
        // ET ON NE LE CALCULE QUE PENDANT UN DÉFI : hors défi, c'est une
        // lecture de plus toutes les dix secondes pour rien, multipliée par
        // trente ardoises.
        'defiCumul'   => defiEnCours($classe) ? array_merge(
            cumulDuDefi($classe),
            [
                'moi' => equipeDeLEleve((string) $classe['id'], (string) $eleve['id']),
                'noms' => EQUIPES,
                // LE RECORD À BATTRE, et il ne compte PAS le défi en cours :
                // on ne bat pas un record qu'on est en train d'établir.
                'record' => recordDeLaClasse($classe, (string) ($classe['defi_exo'] ?? ''),
                    (int) ($classe['defi_debut'] ?? 0))
            ]
        ) : null,
        'defiTableau' => tableauDuDefi($classe, $eleve['id']),
        'maintenant' => time(),
    ];
}

/**
 * LE DÉFI EN COURS, ou rien.
 *
 * RÉMY : « je lance le défi. Et là tous les élèves reçoivent des calculs ».
 *
 * ON NE RENVOIE QUE CE QUI EST VIVANT : un défi dont la fin est passée n'est
 * plus un défi, c'est un tableau de scores. L'ardoise n'a donc aucune règle à
 * appliquer — elle reçoit l'un ou l'autre, jamais les deux.
 */
/**
 * LA PAUSE ENTRE DEUX MANCHES, en secondes.
 *
 * VINGT SECONDES : assez pour dire une phrase à la classe — « regardez le
 * troisième, c'est le piège du chapitre » —, trop peu pour que l'attention
 * retombe. C'est le même ordre de grandeur que les douze secondes d'annonce,
 * et pour la même raison : un temps mort de classe se compte en souffles, pas
 * en minutes.
 */
const DEFI_PAUSE = 20;

/**
 * CE QUE COÛTE UNE FAUTE PAR DÉFAUT, en bonnes réponses.
 *
 * RÉMY : « j'ai un élève qui a cliqué n'importe quoi en qcm et aue plein de
 * point, il faudrait faire qqch ».
 *
 * UNE FAUTE ANNULE UNE BONNE RÉPONSE. Avec quatre propositions, une réponse au
 * hasard rapporte alors (1/4 × 1) − (3/4 × 1) = −0,5 point : marteler devient
 * perdant tout seul, sans qu'on ait rien à interdire ni personne à exclure.
 * Celui qui cherche, lui, ne perd presque rien — il se trompe peu.
 *
 * C'EST LE DÉFAUT ET NON UN RÉGLAGE OBLIGATOIRE : le professeur peut le mettre
 * à zéro avant un défi où il veut qu'on ose.
 */
const DEFI_MALUS_PAR_DEFAUT = 1;

function defiEnCours(array $classe): ?array
{
    $fin = (int) ($classe['defi_fin'] ?? 0);
    if (!$fin || $fin <= time() || empty($classe['defi_exo'])) {
        return null;
    }
    return [
        'exo'    => (string) $classe['defi_exo'],
        // LA GRAINE : la MÊME série pour tout le monde. Sans elle, on
        // classerait trente épreuves différentes.
        'graine' => (string) $classe['defi_graine'],
        'mode'   => ($classe['defi_mode'] ?? 'qcm') === 'saisie' ? 'saisie' : 'qcm',
        'debut'  => (int) $classe['defi_debut'],
        // LES MANCHES ET LA DURÉE DE CHACUNE. L'ardoise en déduit dans quelle
        // manche elle est et combien il lui reste — elle ne le devine pas, et
        // elle ne le décide pas : c'est la même horloge pour les trente.
        // ── COMMENT ON COMPTE : classement, but commun, ou deux équipes ──
        //
        // Les trois sortent de la MÊME addition (`cumulDuDefi`) et ne diffèrent
        // que par ce qu'on en montre. `but` à zéro veut dire « pas de but » :
        // c'est le défi ordinaire, avec son classement.
        'but'     => max(0, (int) ($classe['defi_but'] ?? 0)),
        'equipes' => !empty($classe['defi_equipes']),
        // CE QUE COÛTE UNE FAUTE, en bonnes réponses. Voir `defi_malus` dans
        // le schéma : NULL veut dire « le défaut », et non « sans pénalité ».
        'malus'   => $classe['defi_malus'] === null
            ? DEFI_MALUS_PAR_DEFAUT : max(0, min(2, (int) $classe['defi_malus'])),
        // LES RÉGLAGES DE L'EXERCICE POUR CE DÉFI — la marche choisie, le plus
        // souvent. Rémy : « quand ce sont des exercices à pas, je ne peux
        // choisir le pas ». Vide veut dire « ceux de l'exercice ».
        'params'  => (function () use ($classe) {
            $p = json_decode((string) ($classe['defi_params'] ?? ''), true);
            return is_array($p) ? $p : [];
        })(),
        'manches' => max(1, (int) ($classe['defi_manches'] ?? 1)),
        'duree'   => max(1, (int) ($classe['defi_duree'] ?? 0)) ?: null,
        'pause'   => DEFI_PAUSE,
        'fin'    => $fin,
    ];
}

/**
 * LE TABLEAU DE SCORES, pendant les cinq minutes qui suivent le défi.
 *
 * RÉMY, sur ce que chacun doit voir : « podium + ta place à toi ». Afficher
 * les trente prénoms classés devant toute la classe, c'est désigner le dernier
 * à chaque défi — et ce sont justement les élèves dont on parle depuis deux
 * jours. Le professeur, lui, a le classement entier sur son écran.
 *
 * LE SCORE EST LE NOMBRE DE BONNES RÉPONSES — SAUF QUAND ON ESTIME. Rémy :
 * « le plus de calcul », et la rapidité ne départage qu'à égalité, parce que
 * compter des points de vitesse récompenserait la frappe et pas le calcul.
 * MAIS UN DÉFI D'ESTIMATION NE COMPTE PAS DES RÉPONSES JUSTES — « plus il est
 * proche, plus il a de points » —, d'où la colonne `points`, qui vaut les
 * bonnes réponses partout ailleurs.
 */
function tableauDuDefi(array $classe, string $eleveId): ?array
{
    $fin = (int) ($classe['defi_fin'] ?? 0);
    $debut = (int) ($classe['defi_debut'] ?? 0);
    // CINQ MINUTES, PUIS IL S'EFFACE : « on reprend la suite des exercices
    // normalement ». Un tableau qui resterait à l'écran toute l'heure
    // empêcherait exactement ce qu'il demande.
    if (!$fin || !$debut || time() < $fin || time() > $fin + 300) {
        return null;
    }
    $s = db()->prepare(
        // LE MÊME ORDRE QUE LE CLASSEMENT DU PROFESSEUR, et c'est une
        // obligation : deux tris différents feraient qu'un élève se voit
        // deuxième sur son ardoise et troisième au tableau.
        //
        // `COALESCE` PARCE QUE `points` PEUT ÊTRE VIDE : une ligne écrite avant
        // que la colonne n'existe, ou par une ardoise qui n'a pas la mise à
        // jour. Les points valent alors les bonnes réponses, ce qui est juste
        // pour tout défi qui n'est pas une estimation — et sans ce repli, ces
        // lignes passeraient toutes derrière, podium compris.
        'SELECT d.student_id, d.bonnes, d.ms,
                COALESCE(d.points, d.bonnes) AS points, e.first_name
           FROM defi_scores d JOIN students e ON e.id = d.student_id
          WHERE d.class_id = ? AND d.defi_debut = ?
          ORDER BY COALESCE(d.points, d.bonnes) DESC, d.ms ASC'
    );
    $s->execute([$classe['id'], $debut]);
    $lignes = $s->fetchAll();
    $podium = [];
    $moi = null;
    foreach ($lignes as $i => $l) {
        if ($i < 3) {
            $podium[] = [
                'prenom' => dechiffrer($l['first_name']),
                'bonnes' => (int) $l['bonnes'],
                'points' => (int) $l['points'],
            ];
        }
        if ($l['student_id'] === $eleveId) {
            $moi = [
                'rang' => $i + 1,
                'bonnes' => (int) $l['bonnes'],
                'points' => (int) $l['points'],
            ];
        }
    }
    // ── CE QUE LA CLASSE A FAIT ENSEMBLE, ET LE RECORD ───────────────────
    //
    // RÉMY : « Le défi ca cartonne, des idées dans ce style ». Le tableau de
    // fin doit pouvoir dire « GAGNÉ, 312 sur 300 » et « NOUVEAU RECORD » — donc
    // porter le total de la classe, le but qu'on visait, et le record d'avant.
    //
    // ON LES MET ICI PLUTÔT QUE DE LES GARDER DANS L'ARDOISE : un élève qui
    // recharge sa page pendant les cinq minutes d'affichage doit lire la même
    // chose que son voisin, et une valeur gardée en mémoire aurait disparu.
    $cumul = cumulDuDefi($classe);
    return [
        'debut' => $debut,
        'exo' => (string) ($classe['defi_exo'] ?? ''),
        'podium' => $podium,
        'moi' => $moi,
        'participants' => count($lignes),
        'total' => $cumul['points'],
        'equipesPoints' => $cumul['equipes'],
        'maEquipe' => equipeDeLEleve((string) $classe['id'], $eleveId),
        'noms' => EQUIPES,
        'but' => max(0, (int) ($classe['defi_but'] ?? 0)),
        'parEquipes' => !empty($classe['defi_equipes']),
        // LE RECORD D'AVANT CE DÉFI : c'est lui qu'on vient de battre, ou non.
        'record' => recordDeLaClasse($classe, (string) ($classe['defi_exo'] ?? ''), $debut),
    ];
}

/**
 * DANS QUELLE ÉQUIPE EST CET ÉLÈVE ?
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RÉMY : « Le défi ca cartonne, des idées dans ce style ». Deux équipes, c'est
 * le tiers chemin entre le classement — qui récompense les rapides — et le but
 * commun, où personne ne se mesure : la compétition reste, mais elle se joue
 * entre GROUPES, et l'élève lent y pousse sa couleur comme les autres.
 *
 * ── RIEN À RÉGLER, ET C'EST LE POINT ──────────────────────────────────────
 *
 * Demander au professeur de répartir trente élèves, c'est lui demander deux
 * minutes qu'il n'a pas — et le défi existe précisément pour tenir en une.
 * Le serveur partage donc la classe lui-même, UNE LIGNE SUR DEUX dans l'ordre
 * des identifiants : exactement équilibré, et stable d'un défi à l'autre
 * puisque l'ordre ne bouge pas. L'élève retrouve sa couleur chaque fois.
 *
 * ON NE RANGE RIEN EN BASE pour autant : une colonne « équipe » serait une
 * seconde vérité à tenir d'accord avec la liste de la classe, et elle se
 * déréglerait au premier élève ajouté en cours d'année.
 *
 * @return int 0 ou 1
 */
function equipeDeLEleve(string $classeId, string $eleveId): int
{
    static $cache = [];
    if (!isset($cache[$classeId])) {
        $s = db()->prepare('SELECT id FROM students WHERE class_id = ? ORDER BY id');
        $s->execute([$classeId]);
        $cache[$classeId] = array_column($s->fetchAll(), 'id');
    }
    $rang = array_search($eleveId, $cache[$classeId], true);
    return $rang === false ? 0 : ($rang % 2);
}

/** Les deux noms, au même endroit : l'écran de l'élève et celui du professeur. */
const EQUIPES = [0 => 'Les Bleus', 1 => 'Les Orange'];

/**
 * CE QUE LA CLASSE A MARQUÉ ENSEMBLE, PENDANT QUE LE DÉFI TOURNE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * UNE SEULE LECTURE POUR LES TROIS FAÇONS DE JOUER : la barre de la classe lit
 * `points`, les deux équipes lisent `equipes`, et le classement ordinaire n'en
 * lit aucune. Trois additions séparées auraient fini par ne plus dire la même
 * chose — c'est la règle qui a déjà servi trois fois cette semaine.
 *
 * ELLE COÛTE UNE LIGNE PAR ÉLÈVE, et rien de plus : les scores sont déjà là,
 * écrits par le battement de chaque ardoise. On ne demande pas aux élèves de
 * dire où ils en sont, on regarde ce qu'ils ont déjà dit.
 */
function cumulDuDefi(array $classe): array
{
    $debut = (int) ($classe['defi_debut'] ?? 0);
    $vide = ['points' => 0, 'participants' => 0, 'equipes' => [0, 0]];
    if (!$debut) {
        return $vide;
    }
    $s = db()->prepare(
        'SELECT student_id, COALESCE(points, bonnes) AS points
           FROM defi_scores WHERE class_id = ? AND defi_debut = ?'
    );
    $s->execute([$classe['id'], $debut]);
    $lignes = $s->fetchAll();
    $out = $vide;
    foreach ($lignes as $l) {
        $p = (int) $l['points'];
        $out['points'] += $p;
        $out['participants']++;
        $out['equipes'][equipeDeLEleve((string) $classe['id'], (string) $l['student_id'])] += $p;
    }
    return $out;
}

/**
 * LE RECORD DE LA CLASSE SUR CET EXERCICE — le meilleur total d'un défi passé.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RÉMY : « Le défi ca cartonne, des idées dans ce style ». Le record fait
 * revenir, et il ne désigne personne : c'est la classe contre elle-même, de
 * semaine en semaine. C'est aussi, de toutes les idées de cette série, la seule
 * où l'élève lent n'a rien à perdre.
 *
 * ── ON LE CALCULE, ON NE LE RANGE PAS ─────────────────────────────────────
 *
 * Un record n'est qu'une LECTURE de ce qu'on a déjà : la somme des scores d'un
 * même défi, le meilleur de tous. Une table de records serait une seconde
 * vérité à tenir d'accord — et elle se tromperait le jour où un score arrive
 * en retard, ce qui arrive à chaque défi.
 *
 * ET LE DÉFI EN COURS NE COMPTE PAS : on ne bat pas un record qu'on est en
 * train d'établir. Il entrera dans la liste au défi suivant, c'est-à-dire
 * quand il sera devenu un record à battre.
 *
 * @return array{points:int, le:?string}|null
 */
function recordDeLaClasse(array $classe, string $exo, int $saufDebut = 0): ?array
{
    if ($exo === '') {
        return null;
    }
    $s = db()->prepare(
        'SELECT defi_debut, SUM(COALESCE(points, bonnes)) AS total,
                MAX(created_at) AS quand
           FROM defi_scores
          WHERE class_id = ? AND exo = ? AND defi_debut <> ?
          GROUP BY defi_debut
          ORDER BY total DESC
          LIMIT 1'
    );
    $s->execute([$classe['id'], $exo, $saufDebut]);
    $l = $s->fetch();
    if (!$l || (int) $l['total'] <= 0) {
        return null;
    }
    return ['points' => (int) $l['total'], 'le' => $l['quand'] ?: null];
}

/**
 * LE BUT COMMUN, CALCULÉ PAR LE SERVEUR QUAND ON LUI LAISSE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * C'EST LE SEUL ENDROIT DU LOGICIEL OÙ LE SERVEUR CHOISIT UN RÉGLAGE à la place
 * du professeur, et il y a une raison : Rémy, debout devant trente élèves, n'a
 * pas trois secondes pour calculer un but — et un but tiré au hasard est soit
 * gagné en vingt secondes, soit hors de portée. Dans les deux cas la barre ne
 * sert plus à rien, ce qui est pire que de ne pas l'avoir.
 *
 * LE RECORD + 10 %, ET RIEN D'AUTRE. C'est la seule base qui se tienne : elle
 * est MESURÉE sur cette classe-là, sur cet exercice-là, et elle vaut aussi bien
 * pour un défi de calcul (un point par bonne réponse) que pour un défi
 * d'estimation (jusqu'à cent points par question) — alors qu'une règle du genre
 * « cinq points par élève » serait juste pour l'un et absurde pour l'autre.
 *
 * ── ET SANS RECORD, PAS DE BUT ────────────────────────────────────────────
 *
 * On ne devine pas. Le premier défi sur un exercice est celui qui ÉTABLIT le
 * record — l'écran de fin le dit à la classe en ces mots —, et le but se
 * calcule tout seul au suivant. Le professeur qui veut un but dès la première
 * fois en choisit un dans la liste ; c'est son métier, pas une devinette.
 */
function butDuDefi(array $classe, string $exo): int
{
    $record = recordDeLaClasse($classe, $exo);
    if (!$record || $record['points'] <= 0) {
        return 0;
    }
    // AU MOINS UN POINT DE PLUS QUE LE RECORD : sur un petit record, dix pour
    // cent arrondis pourraient ne rien ajouter du tout, et la classe
    // « gagnerait » en égalant ce qu'elle avait déjà fait.
    return min(50000, max($record['points'] + 1, (int) ceil($record['points'] * 1.1)));
}

/**
 * LE SCORE D'UN ÉLÈVE, rangé une fois pour toutes.
 *
 * ON N'ACCEPTE QUE LE DÉFI EN COURS OU CELUI QUI VIENT DE FINIR, et c'est la
 * seule garde qui compte : sans elle, un élève pourrait réécrire son score
 * d'un défi passé — ou en inventer un pour un défi qui n'a jamais eu lieu.
 *
 * ET ON GARDE LE MEILLEUR. Une ardoise qui perd le réseau renvoie son score en
 * se reconnectant ; le renvoi doit être sans effet, pas destructeur.
 */
function enregistrerScoreDefi(array $eleve, int $bonnes, int $total, int $ms,
                              ?int $points = null): array
{
    // `lireUne` ET NON UN `prepare` GARDÉ SOUS LE COUDE : la lecture se referme
    // avant l'écriture qui suit. Sans cela, l'INSERT plus bas doit faire MONTER
    // cette lecture en écriture, et SQLite refuse net dès qu'une autre ardoise a
    // écrit entre-temps — ce qui, dans un défi, est le cas par construction.
    $classe = lireUne('SELECT id, defi_debut, defi_fin, defi_exo FROM classes WHERE id = ?',
        [$eleve['class_id']]);
    $debut = (int) ($classe['defi_debut'] ?? 0);
    $fin = (int) ($classe['defi_fin'] ?? 0);
    if (!$debut || time() > $fin + 300) {
        return ['ok' => false, 'dit' => 'Aucun défi en cours.'];
    }
    $bonnes = max(0, min(999, $bonnes));
    $total = max($bonnes, min(999, $total));
    $ms = max(0, min(3600000, $ms));
    // LES POINTS VALENT LES BONNES RÉPONSES QUAND ON N'EN ENVOIE PAS. Une
    // ardoise qui n'a pas encore reçu la mise à jour continue d'envoyer
    // `{bonnes, total, ms}` : elle doit rester classable, et au même rang
    // qu'avant. Un classement qui trie sur une colonne vide mettrait tous les
    // anciens clients derniers, sans que rien ne le dise.
    $points = $points === null ? $bonnes : max(0, min(99999, $points));
    // L'EXERCICE VOYAGE AVEC LE SCORE — c'est lui qui rend le record possible,
    // et il ne peut venir que d'ici : le client ne le dit pas, et il n'a pas à
    // le dire. Voir `recordDeLaClasse`.
    $exo = trim((string) ($classe['defi_exo'] ?? ''));

    $deja = lireUne('SELECT id, COALESCE(points, bonnes) AS points FROM defi_scores
                      WHERE class_id = ? AND defi_debut = ? AND student_id = ?',
        [$eleve['class_id'], $debut, $eleve['id']]);
    if ($deja) {
        // ON GARDE LE MEILLEUR, ET SUR LES POINTS : c'est la colonne qui classe.
        if ((int) $deja['points'] >= $points) {
            return ['ok' => true, 'dit' => 'Score déjà enregistré.'];
        }
        ecrireMalgreLaRuee('UPDATE defi_scores SET bonnes = ?, total = ?, ms = ?, points = ?,
                                  exo = ? WHERE id = ?',
            [$bonnes, $total, $ms, $points, $exo, $deja['id']]);
        return ['ok' => true, 'dit' => 'Score mis à jour.'];
    }
    ecrireMalgreLaRuee('INSERT INTO defi_scores
                     (id, class_id, student_id, defi_debut, bonnes, total, ms, points, exo)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), $eleve['class_id'], $eleve['id'], $debut,
            $bonnes, $total, $ms, $points, $exo]);
    return ['ok' => true, 'dit' => 'Score enregistré.'];
}

/**
 * LE CLASSEMENT ENTIER, pour le professeur seul.
 *
 * Rémy a choisi « podium + ta place » pour les élèves ; lui voit tout, parce
 * que c'est avec ce tableau-là qu'il parlera à la classe ensuite.
 */
function classementDuDefi(array $classe): array
{
    $debut = (int) ($classe['defi_debut'] ?? 0);
    if (!$debut) {
        return [];
    }
    $s = db()->prepare(
        // ON TRIE SUR LES POINTS, et le temps départage encore les égalités.
        // Pour un défi de calcul les points valent les bonnes réponses, donc
        // l'ordre est exactement celui d'avant ; pour un défi d'estimation,
        // c'est le seul ordre qui ait un sens. `COALESCE` : voir
        // `tableauDuDefi`, et c'est le MÊME tri — obligatoirement.
        'SELECT d.bonnes, d.total, d.ms,
                COALESCE(d.points, d.bonnes) AS points, e.first_name
           FROM defi_scores d JOIN students e ON e.id = d.student_id
          WHERE d.class_id = ? AND d.defi_debut = ?
          ORDER BY COALESCE(d.points, d.bonnes) DESC, d.ms ASC'
    );
    $s->execute([$classe['id'], $debut]);
    return array_map(fn ($l) => [
        'prenom' => dechiffrer($l['first_name']),
        'bonnes' => (int) $l['bonnes'],
        'total'  => (int) $l['total'],
        'points' => (int) $l['points'],
    ], $s->fetchAll());
}

/**
 * « Je l'ai lu. » Le client l'appelle quand l'élève ferme le message ; le
 * professeur voit alors une coche dans sa console, ce qui lui évite de répéter
 * à voix haute ce qu'il vient d'écrire.
 *
 * On n'accepte que des messages qui LUI étaient destinés : sans ce filtre, un
 * élève pourrait marquer lus les messages de toute la classe.
 */
function marquerLus(array $eleve, array $ids): int
{
    $ids = array_values(array_filter(array_map('strval', $ids), fn ($i) => $i !== ''));
    if (!$ids) {
        return 0;
    }
    $ids = array_slice($ids, 0, 50);
    $trous = implode(',', array_fill(0, count($ids), '?'));

    $s = db()->prepare(
        "SELECT id FROM messages
          WHERE id IN ($trous) AND (student_id = ? OR class_id = ?)"
    );
    $s->execute([...$ids, $eleve['id'], $eleve['class_id']]);

    $insere = db()->prepare(
        sqlInsereSansDoublon() . ' INTO message_reads (message_id, student_id) VALUES (?, ?)'
    );
    $combien = 0;
    foreach ($s->fetchAll() as $m) {
        $insere->execute([$m['id'], $eleve['id']]);
        $combien++;
    }
    return $combien;
}

/**
 * LA PURGE, SANS TÂCHE PLANIFIÉE.
 *
 * `retention_days` existait déjà, mais il fallait une ligne de `cron` pour
 * l'appliquer — et un hébergement mutualisé n'en offre pas toujours, quand il
 * ne cache pas la case tout au fond d'un panneau. Rémy dit : « je ferai une
 * séance unique et après je détruirai la liste des élèves ». Une purge qui
 * dépend d'une manœuvre qu'il n'a pas les moyens de faire n'est pas une purge.
 *
 * Elle tourne donc ici, à l'entrée de l'administration, une fois par jour au
 * plus : un fichier témoin porte la date du dernier passage. Coût réel, mesuré
 * sur une base de séance : une requête `DELETE` indexée.
 */
/**
 * COMBIEN DE JOURS LA CORBEILLE GARDE UN PARCOURS.
 *
 * Rémy : « il y reste 30 jours, puis part tout seul ».
 *
 * ELLE VIT ICI, À CÔTÉ DE CE QUI EFFACE, et le serveur la rend à l'écran dans
 * la réponse de `/teacher/paths` plutôt que de la laisser se recopier dans le
 * navigateur : deux nombres à tenir d'accord finissent toujours par diverger,
 * et c'est celui qui efface qui a raison.
 */
const JOURS_CORBEILLE = 30;

function purgerSiNecessaire(): int
{
    $jours = (int) (config()['retention_days'] ?? 0);
    $temoin = dirname(__DIR__) . '/.derniere-purge';
    if (is_file($temoin) && trim((string) @file_get_contents($temoin)) === date('Y-m-d')) {
        return 0;
    }
    @file_put_contents($temoin, date('Y-m-d'));

    // LA CORBEILLE DES PARCOURS SE VIDE SEULE, ET D'ABORD.
    //
    // Rémy : « il y reste 30 jours, puis part tout seul ». C'est le choix qui
    // évite qu'une corbeille devienne une seconde bibliothèque à gérer — celle
    // qu'on n'ouvre jamais et qui grossit.
    //
    // ELLE NE DÉPEND PAS DE `retention_days`, et c'est pour cela que le test
    // d'arrêt ci-dessous a été DÉPLACÉ après elle. `retention_days` règle la
    // conservation des DONNÉES D'ÉLÈVES, que Rémy peut vouloir à zéro — « je
    // ferai une séance unique et après je détruirai la liste des élèves ». La
    // corbeille d'un professeur n'a rien à voir avec cela, et son compte à
    // rebours doit tourner même quand l'autre est arrêté.
    //
    // C'EST LE SEUL ENDROIT DU LOGICIEL QUI EFFACE UN PARCOURS SANS QU'ON LE
    // DEMANDE. On accepte ici que l'`ON DELETE CASCADE` d'`assignments`
    // emporte la trace des séances données avec : après trente jours à la
    // corbeille, c'est le sens même du geste. Le travail des élèves, lui, vit
    // dans `events` et ne bouge pas.
    db()->prepare('DELETE FROM paths WHERE supprime_le IS NOT NULL AND supprime_le < '
        . sqlIlYA(JOURS_CORBEILLE))->execute();

    if ($jours <= 0) {
        return 0;
    }

    $limite = (int) ((time() - $jours * 86400) * 1000);
    $s = db()->prepare('DELETE FROM events WHERE ts < ?');
    $s->execute([$limite]);
    $combien = $s->rowCount();

    // Les mots envoyés se périment aussi : garder six mois de « reprends
    // l'exercice 3 » n'apporte rien à personne.
    db()->prepare('DELETE FROM messages WHERE created_at < ' . sqlIlYA($jours))->execute();

    // LES SIGNALEMENTS AUSSI, ET CEUX-LÀ PÈSENT. Un mot fait deux lignes ; un
    // signalement peut porter une photo de quatre cents kilo-octets, plus le
    // relevé de ce que l'élève avait sous les yeux — donc son travail du moment.
    // Le garder six mois après que le défaut a été corrigé, c'est garder une
    // donnée d'élève qui ne sert plus à rien.
    db()->prepare('DELETE FROM signalements WHERE created_at < ' . sqlIlYA($jours))->execute();

    return $combien;
}

/** « Il y a N jours », dans la syntaxe du moteur. */
function sqlIlYA(int $jours): string
{
    return dbPilote() === 'sqlite'
        ? "datetime('now', '-$jours days')"
        : "DATE_SUB(NOW(), INTERVAL $jours DAY)";
}
