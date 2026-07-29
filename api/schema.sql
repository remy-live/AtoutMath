-- Schéma AtoutMath — MySQL 8 / MariaDB 10.4+
--
-- Le point central est la table `events` : un journal append-only, identique à
-- celui du navigateur. Aucun agrégat n'est stocké (ni score, ni note, ni taux
-- de réussite) : tout est recalculé à la lecture par les mêmes règles que
-- côté client (api/lib/projections.php et api/lib/grading.php).
--
-- Deux conséquences :
--   * la synchronisation multi-appareils est une simple union par UUID,
--     donc idempotente : rejouer un envoi ne fausse rien ;
--   * changer un barème régénère les notes passées, sans migration de données.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS teachers (
    id            CHAR(36)     NOT NULL PRIMARY KEY,
    display_name  VARCHAR(120) NOT NULL,
    email         VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS classes (
    id         CHAR(36)     NOT NULL PRIMARY KEY,
    teacher_id CHAR(36)     NOT NULL,
    name       VARCHAR(120) NOT NULL,
    -- Code court dicté à voix haute en classe ; c'est la seule information
    -- dont l'élève a besoin pour se rattacher.
    join_code  VARCHAR(12)  NOT NULL UNIQUE,
    level      VARCHAR(20)  NULL,
    archived   TINYINT(1)   NOT NULL DEFAULT 0,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_classes_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Données personnelles réduites au strict nécessaire : un prénom et une
-- classe. Pas d'e-mail, pas de nom de famille, pas de date de naissance.
CREATE TABLE IF NOT EXISTS students (
    id          CHAR(36)     NOT NULL PRIMARY KEY,
    class_id    CHAR(36)     NOT NULL,
    first_name  VARCHAR(80)  NOT NULL,
    token_hash  CHAR(64)     NOT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME    NULL,
    INDEX idx_students_class (class_id),
    INDEX idx_students_token (token_hash),
    CONSTRAINT fk_students_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Le journal. `id` est l'UUID généré par le client : c'est la clé primaire,
-- donc un INSERT IGNORE suffit à rendre la synchro idempotente.
-- `seq` est un curseur monotone propre au serveur, utilisé pour la pagination
-- des téléchargements ("donne-moi ce qui est arrivé depuis le curseur N").
CREATE TABLE IF NOT EXISTS events (
    id         CHAR(36)    NOT NULL PRIMARY KEY,
    seq        BIGINT      NOT NULL AUTO_INCREMENT UNIQUE,
    student_id CHAR(36)    NOT NULL,
    device_id  VARCHAR(64) NOT NULL,
    type       VARCHAR(32) NOT NULL,
    ts         BIGINT      NOT NULL,
    payload    JSON        NOT NULL,
    created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_events_student_seq (student_id, seq),
    INDEX idx_events_student_type_ts (student_id, type, ts),
    CONSTRAINT fk_events_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Parcours créés par le professeur, au format v2 (références + politique).
CREATE TABLE IF NOT EXISTS paths (
    id         CHAR(36)     NOT NULL PRIMARY KEY,
    teacher_id CHAR(36)     NOT NULL,
    name       VARCHAR(160) NOT NULL,
    data       JSON         NOT NULL,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_paths_teacher (teacher_id),
    CONSTRAINT fk_paths_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Attribution d'un parcours à une classe (ou à un élève précis).
CREATE TABLE IF NOT EXISTS assignments (
    id         CHAR(36)  NOT NULL PRIMARY KEY,
    path_id    CHAR(36)  NOT NULL,
    class_id   CHAR(36)  NULL,
    student_id CHAR(36)  NULL,
    due_at     DATETIME  NULL,
    created_at DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_assignments_class (class_id),
    INDEX idx_assignments_student (student_id),
    CONSTRAINT fk_assign_path FOREIGN KEY (path_id) REFERENCES paths(id) ON DELETE CASCADE,
    CONSTRAINT fk_assign_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    CONSTRAINT fk_assign_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
