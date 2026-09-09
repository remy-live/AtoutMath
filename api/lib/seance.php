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
    $s = $pdo->prepare('SELECT name, join_code, locked, notice FROM classes WHERE id = ?');
    $s->execute([$eleve['class_id']]);
    $classe = $s->fetch() ?: ['name' => '', 'join_code' => '', 'locked' => 0, 'notice' => null];

    // LES MESSAGES NON LUS, adressés à lui ou à sa classe. « Non lus » et pas
    // « récents » : un élève qui arrive en retard doit voir le mot qu'on a
    // envoyé à la classe il y a dix minutes.
    $s = $pdo->prepare(
        'SELECT m.id, m.body, m.created_at, m.student_id
           FROM messages m
           LEFT JOIN message_reads r ON r.message_id = m.id AND r.student_id = ?
          WHERE (m.student_id = ? OR m.class_id = ?) AND r.message_id IS NULL
          ORDER BY m.created_at ASC LIMIT 20'
    );
    $s->execute([$eleve['id'], $eleve['id'], $eleve['class_id']]);
    $messages = array_map(fn ($m) => [
        'id'    => $m['id'],
        'body'  => $m['body'],
        'ts'    => msDepuisSql($m['created_at']),
        'scope' => $m['student_id'] ? 'student' : 'class',
    ], $s->fetchAll());

    // LES EXERCICES DÉBLOQUÉS. Un réglage pour la classe et un réglage pour
    // l'élève peuvent viser le même exercice ; `retire` l'emporte sur `saut`,
    // parce que retirer est le geste du professeur qui a constaté que
    // l'exercice plante — il ne veut pas que l'élève retombe dessus.
    $s = $pdo->prepare(
        'SELECT exercise_id, mode FROM overrides
          WHERE class_id = ? OR student_id = ?'
    );
    $s->execute([$eleve['class_id'], $eleve['id']]);
    $saut = [];
    $retire = [];
    foreach ($s->fetchAll() as $o) {
        if ($o['mode'] === 'retire') {
            $retire[$o['exercise_id']] = true;
        } else {
            $saut[$o['exercise_id']] = true;
        }
    }
    $saut = array_diff_key($saut, $retire);

    return [
        'className' => $classe['name'],
        'classCode' => $classe['join_code'],
        'locked'    => (bool) $classe['locked'],
        'notice'    => $classe['notice'] !== null && $classe['notice'] !== '' ? $classe['notice'] : null,
        'blocked'   => (bool) ($eleve['blocked'] ?? 0),
        'messages'  => $messages,
        'skippable' => array_keys($saut),
        'removed'   => array_keys($retire),
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
