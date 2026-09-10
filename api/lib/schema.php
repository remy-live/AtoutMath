<?php
declare(strict_types=1);

/**
 * LE SCHÉMA, EN PHP PLUTÔT QU'EN .SQL.
 *
 * `schema.sql` disait le schéma en MySQL, et l'installation demandait de le
 * charger à la main avec le client `mysql`. Deux raisons de le déplacer ici.
 *
 * D'ABORD, DEUX MOTEURS. Le même schéma doit s'écrire en SQLite et en MySQL, et
 * les trois différences — le type d'une clé, l'auto-incrément, le « maintenant »
 * — se disent mieux dans un `if` que dans deux fichiers qu'on ferait diverger.
 *
 * ENSUITE, L'INSTALLATION. Rémy réserve son hébergement demain ; beaucoup
 * d'hébergements mutualisés ne donnent aucun accès en ligne de commande. Un
 * schéma qu'on applique depuis une page web est la seule installation possible
 * là-bas — et c'est aussi la plus simple partout ailleurs.
 *
 * `migrer()` est IDEMPOTENT : on peut l'appeler à chaque démarrage sans risque,
 * et c'est ce qu'on fait. Une mise à jour du logiciel qui ajoute une table
 * n'oblige alors à aucune manœuvre.
 */

require_once __DIR__ . '/db.php';

function migrer(?PDO $pdo = null): void
{
    $pdo = $pdo ?: db();
    $sqlite = dbPilote() === 'sqlite';

    // Le vocabulaire qui change d'un moteur à l'autre, dit une fois.
    $id      = $sqlite ? 'TEXT NOT NULL PRIMARY KEY' : 'CHAR(36) NOT NULL PRIMARY KEY';
    $ref     = $sqlite ? 'TEXT NOT NULL' : 'CHAR(36) NOT NULL';
    $refNull = $sqlite ? 'TEXT NULL' : 'CHAR(36) NULL';
    $txt     = $sqlite ? 'TEXT NOT NULL' : 'VARCHAR(190) NOT NULL';
    $txtNull = $sqlite ? 'TEXT NULL' : 'VARCHAR(190) NULL';
    $json    = $sqlite ? 'TEXT NOT NULL' : 'JSON NOT NULL';
    $date    = $sqlite ? "TEXT NOT NULL DEFAULT (datetime('now'))" : 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP';
    $dateN   = $sqlite ? 'TEXT NULL' : 'DATETIME NULL';
    $bool    = $sqlite ? 'INTEGER NOT NULL DEFAULT 0' : 'TINYINT(1) NOT NULL DEFAULT 0';
    $moteur  = $sqlite ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
    // Le curseur monotone de la synchro. En SQLite, seul un INTEGER PRIMARY KEY
    // s'auto-incrémente : `seq` devient donc la clé primaire, et l'UUID du
    // client garde son unicité par un index — ce qui suffit à `INSERT OR
    // IGNORE`, qui déclenche sur n'importe quelle contrainte d'unicité.
    $tables = [];

    $tables['teachers'] = "
        id            $id,
        display_name  $txt,
        email         " . ($sqlite ? 'TEXT NOT NULL UNIQUE' : 'VARCHAR(190) NOT NULL UNIQUE') . ",
        password_hash $txt,
        created_at    $date";

    $tables['classes'] = "
        id         $id,
        teacher_id $ref,
        name       $txt,
        join_code  " . ($sqlite ? 'TEXT NOT NULL UNIQUE' : 'VARCHAR(12) NOT NULL UNIQUE') . ",
        level      $txtNull,
        archived   $bool,
        -- LE VERROU DE LA CLASSE. Rémy : « verrouiller la partie élève pour
        -- qu'il n'ait accès qu'à ce que je leur donne ». Quand il est posé,
        -- l'élève ne voit que les parcours qu'on lui a assignés — pas le
        -- catalogue, pas le mode libre.
        locked     $bool,
        -- Le mot affiché à toute la classe, ou vide.
        notice     $txtNull,
        created_at $date,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE";

    // `first_name` est CHIFFRÉ (voir lib/coffre.php) ; `first_name_key` est son
    // index aveugle, seule façon de retrouver « l'élève qui s'appelle Léa »
    // sans pouvoir lire le prénom. En SQLite, TEXT ne borne rien, mais le
    // chiffré est plus long que le clair : en MySQL il faut de la place.
    //
    // LA LISTE FOURNIE PAR LE PROFESSEUR. Rémy : « pour la connexion, fais aussi
    // une connexion avec identifiant et code élève, je fournirai la liste. »
    //
    // Deux façons d'entrer coexistent, et elles ne protègent pas la même chose :
    //
    //   · CODE DE CLASSE + PRÉNOM — l'élève se déclare. Rien à préparer, mais
    //     n'importe qui connaissant le code peut se dire « Léa ».
    //   · IDENTIFIANT + CODE — le professeur a écrit la liste. Seul celui qui
    //     est dessus entre, et sous le nom qu'on lui a donné.
    //
    // `login` est un nom de personne : il est CHIFFRÉ comme le prénom, et cherché
    // par son index aveugle `login_key`.
    //
    // LE CODE EST CHIFFRÉ, PAS HACHÉ, et c'est un choix qu'il faut assumer.
    // Haché, il serait plus orthodoxe — mais alors PERSONNE ne pourrait le
    // relire, y compris Rémy, et un élève qui perd son billet au milieu de
    // l'heure obligerait à en tirer un neuf, ce qui invalide le billet qu'il
    // retrouvera dans sa poche cinq minutes plus tard. Un professeur doit
    // pouvoir RÉIMPRIMER sa liste.
    //
    // Le prix est faible et il est connu : celui qui tient la base ET la clé
    // lit les codes. Mais celui-là lit déjà les prénoms, les réponses et les
    // messages — il a tout, et un code d'entrée de plus ne change pas sa
    // situation. Ce que le chiffrement protège ici, c'est le fichier qui part
    // seul, et de ce danger-là le code est protégé comme le reste.
    $tables['students'] = "
        id             $id,
        class_id       $ref,
        first_name     " . ($sqlite ? 'TEXT NOT NULL' : 'VARCHAR(255) NOT NULL') . ",
        first_name_key " . ($sqlite ? 'TEXT NULL' : 'CHAR(64) NULL') . ",
        login          " . ($sqlite ? 'TEXT NULL' : 'VARCHAR(255) NULL') . ",
        login_key      " . ($sqlite ? 'TEXT NULL' : 'CHAR(64) NULL') . ",
        access_code    $txtNull,
        token_hash   $txt,
        -- Un élève peut être mis de côté sans être effacé : il ne peut plus
        -- se rattacher, mais son travail reste lisible jusqu'à la purge.
        blocked      $bool,
        created_at   $date,
        last_seen_at $dateN,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE";

    // UN ÉLÈVE, PLUSIEURS APPAREILS — et c'est le fond de l'affaire.
    //
    // Le jeton vivait dans une colonne de `students`. Se rattacher en
    // délivrait un neuf ET ÉCRASAIT LE PRÉCÉDENT : l'ordinateur de la salle
    // informatique cessait de synchroniser dès que l'élève ouvrait
    // l'application chez lui. Sans un mot — la synchro traite un 401 comme une
    // panne de réseau, donc « on réessaiera plus tard », donc jamais. Le
    // travail restait sur la machine de l'école et le professeur ne le voyait
    // pas arriver.
    //
    // Mesuré en essayant : deuxième rattachement du même prénom, et le premier
    // jeton répond 401 pour toujours.
    //
    // Une ligne par jeton répare cela sans rien coûter, et l'effacement d'un
    // élève les emporte tous en cascade — donc « je détruirai la liste des
    // élèves » reste vrai.
    $tables['student_tokens'] = "
        token_hash   " . ($sqlite ? 'TEXT NOT NULL PRIMARY KEY' : 'CHAR(64) NOT NULL PRIMARY KEY') . ",
        student_id   $ref,
        created_at   $date,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE";

    $tables['events'] = $sqlite ? "
        seq        INTEGER PRIMARY KEY AUTOINCREMENT,
        id         TEXT NOT NULL UNIQUE,
        student_id $ref,
        device_id  $txt,
        type       $txt,
        ts         INTEGER NOT NULL,
        payload    $json,
        created_at $date,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE" : "
        id         CHAR(36) NOT NULL PRIMARY KEY,
        seq        BIGINT NOT NULL AUTO_INCREMENT UNIQUE,
        student_id CHAR(36) NOT NULL,
        device_id  VARCHAR(64) NOT NULL,
        type       VARCHAR(32) NOT NULL,
        ts         BIGINT NOT NULL,
        payload    JSON NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE";

    $tables['paths'] = "
        id         $id,
        teacher_id $ref,
        name       $txt,
        data       $json,
        updated_at $date,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE";

    $tables['assignments'] = "
        id         $id,
        path_id    $ref,
        class_id   $refNull,
        student_id $refNull,
        due_at     $dateN,
        created_at $date,
        FOREIGN KEY (path_id) REFERENCES paths(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE";

    // --- Ce que Rémy a demandé en plus -----------------------------------

    // UN MOT À UN ÉLÈVE. « la possibilité d'envoyer un message
    // individuellement ». Le message est tiré par l'élève à sa prochaine
    // synchro ; `read_at` dit s'il l'a vu, ce qui évite au professeur de
    // répéter à voix haute ce qu'il vient d'écrire.
    $tables['messages'] = "
        id         $id,
        student_id $refNull,
        class_id   $refNull,
        body       TEXT NOT NULL,
        created_at $date,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE";

    // QUI A LU QUOI — une table séparée, et non une colonne `read_at` sur le
    // message. La colonne suffisait tant qu'un message allait à UN élève ; dès
    // qu'il va à la classe entière, elle ne sait plus dire « lu par 22 sur 24 »,
    // et le premier élève qui lit marquerait le message lu pour tous. Une ligne
    // par lecteur répond aux deux cas avec la même requête.
    $tables['message_reads'] = "
        message_id $ref,
        student_id $ref,
        read_at    $date,
        PRIMARY KEY (message_id, student_id),
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE";

    // LE DÉBLOCAGE D'UN EXERCICE. « pouvoir supprimer ou autoriser le saut d'un
    // exercice au cas où un exercice plante et empêche la progression ».
    //
    // Deux gestes différents, et c'est pour cela qu'il y a une colonne `mode` :
    //   · `saut`     — l'élève voit un bouton « passer cet exercice » ;
    //   · `retire`   — l'exercice disparaît du parcours, comme s'il n'y était
    //                  pas ; c'est le geste quand un exercice plante vraiment.
    // La portée est la classe (tout le monde) ou un élève (lui seul).
    $tables['overrides'] = "
        id          $id,
        class_id    $refNull,
        student_id  $refNull,
        exercise_id $txt,
        mode        $txt,
        created_at  $date,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE";

    foreach ($tables as $nom => $colonnes) {
        $pdo->exec("CREATE TABLE IF NOT EXISTS $nom ($colonnes)$moteur");
    }

    foreach ([
        'idx_students_class'   => 'students(class_id)',
        'idx_students_prenom'  => 'students(class_id, first_name_key)',
        // L'identifiant se cherche SANS code de classe : c'est tout l'intérêt
        // pour l'élève, deux champs au lieu de trois. L'index est donc global.
        'idx_students_login'   => 'students(login_key)',
        'idx_students_token'   => 'students(token_hash)',
        'idx_tokens_student'   => 'student_tokens(student_id)',
        'idx_events_student'   => 'events(student_id, seq)',
        'idx_events_type'      => 'events(student_id, type, ts)',
        'idx_paths_teacher'    => 'paths(teacher_id)',
        'idx_assign_class'     => 'assignments(class_id)',
        'idx_assign_student'   => 'assignments(student_id)',
        'idx_messages_student' => 'messages(student_id)',
        'idx_messages_class'   => 'messages(class_id)',
        'idx_reads_student'    => 'message_reads(student_id)',
        'idx_over_class'       => 'overrides(class_id)',
        'idx_over_student'     => 'overrides(student_id)',
    ] as $nom => $cible) {
        try {
            $pdo->exec("CREATE INDEX IF NOT EXISTS $nom ON $cible");
        } catch (Throwable $t) {
            // MySQL < 8.0.29 ne connaît pas « IF NOT EXISTS » sur un index :
            // l'index existe déjà, et c'est très bien.
        }
    }

    // Les colonnes ajoutées après coup, pour une base déjà installée. On
    // essaie, et l'échec veut dire « elle y est déjà ».
    foreach ([
        'classes'  => ['locked' => $bool, 'notice' => $txtNull],
        'students' => ['blocked' => $bool,
                       'first_name_key' => $sqlite ? 'TEXT NULL' : 'CHAR(64) NULL',
                       'login'          => $sqlite ? 'TEXT NULL' : 'VARCHAR(255) NULL',
                       'login_key'      => $sqlite ? 'TEXT NULL' : 'CHAR(64) NULL',
                       'access_code'    => $txtNull],
    ] as $table => $colonnes) {
        foreach ($colonnes as $col => $type) {
            try {
                $pdo->exec("ALTER TABLE $table ADD COLUMN $col $type");
            } catch (Throwable $t) { /* déjà là */ }
        }
    }
}
