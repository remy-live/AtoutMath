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
function etatDeSeance(array $eleve): array
{
    $pdo = db();

    // La classe : on la relit plutôt que de la faire porter par la jointure de
    // requireStudent(), pour que cette fonction soit utilisable seule (elle
    // l'est dans les tests, où l'on n'a pas de requête HTTP).
    $s = $pdo->prepare('SELECT id, name, join_code, locked, notice, impose_path_id,
                              impose_jusqu_a, chrono_fin, chrono_a_zero, bac_ferme,
                              bac_minutes
                         FROM classes WHERE id = ?');
    $s->execute([$eleve['class_id']]);
    $classe = $s->fetch() ?: ['id' => '', 'name' => '', 'join_code' => '', 'locked' => 0,
                              'notice' => null, 'impose_path_id' => null,
                              'impose_jusqu_a' => null, 'chrono_fin' => null,
                              'chrono_a_zero' => null, 'bac_ferme' => 0,
                              'bac_minutes' => null];
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
        'SELECT exercise_id, mode FROM overrides
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
        if ($o['mode'] === 'calculatrice') {
            $calculatrice[$o['exercise_id']] = true;
        } elseif ($o['mode'] === 'retire') {
            $retire[$o['exercise_id']] = true;
        } else {
            $saut[$o['exercise_id']] = true;
        }
    }
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
            $impose = ['pathId' => $p['id'], 'name' => $p['name'],
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

    return [
        'className' => $classe['name'],
        'classCode' => $classe['join_code'],
        'locked'    => (bool) $classe['locked'],
        'notice'    => $classe['notice'] !== null && $classe['notice'] !== '' ? $classe['notice'] : null,
        'blocked'   => (bool) ($eleve['blocked'] ?? 0),
        // LE BAC À SABLE : ouvert par défaut, et c'est délibéré. Une fonction
        // qu'il faut allumer pour la découvrir n'est jamais découverte.
        'bacFerme'  => (bool) ($classe['bac_ferme'] ?? 0),
        // COMBIEN DE TEMPS DURE LE BAC, en minutes, 0 = sans limite. Le compte
        // part quand l'élève l'ouvre — voir `resteDuBac` côté client.
        'bacMinutes' => (int) ($classe['bac_minutes'] ?? 0),
        'messages'  => $messages,
        'skippable' => array_keys($saut),
        'removed'   => array_keys($retire),
        // Les exercices où le professeur vient d'autoriser la calculatrice —
        // `*` valant pour toute la séance.
        'calculatrice' => array_keys($calculatrice),
        'impose'    => $impose,
        'chrono'    => $chrono,
        'maintenant' => time(),
    ];
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
function purgerSiNecessaire(): int
{
    $jours = (int) (config()['retention_days'] ?? 0);
    if ($jours <= 0) {
        return 0;
    }
    $temoin = dirname(__DIR__) . '/.derniere-purge';
    if (is_file($temoin) && trim((string) @file_get_contents($temoin)) === date('Y-m-d')) {
        return 0;
    }
    @file_put_contents($temoin, date('Y-m-d'));

    $limite = (int) ((time() - $jours * 86400) * 1000);
    $s = db()->prepare('DELETE FROM events WHERE ts < ?');
    $s->execute([$limite]);
    $combien = $s->rowCount();

    // Les mots envoyés se périment aussi : garder six mois de « reprends
    // l'exercice 3 » n'apporte rien à personne.
    db()->prepare('DELETE FROM messages WHERE created_at < ' . sqlIlYA($jours))->execute();

    return $combien;
}

/** « Il y a N jours », dans la syntaxe du moteur. */
function sqlIlYA(int $jours): string
{
    return dbPilote() === 'sqlite'
        ? "datetime('now', '-$jours days')"
        : "DATE_SUB(NOW(), INTERVAL $jours DAY)";
}
