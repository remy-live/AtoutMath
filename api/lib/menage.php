<?php
declare(strict_types=1);

/**
 * LES FICHIERS QU'UNE MISE À JOUR NE PEUT PAS EFFACER.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RÉMY, APRÈS LA REFONTE DE L'ADMINISTRATION : « donc je mets à jour comment ».
 * La question a fait apparaître un trou qu'on n'avait jamais eu à regarder :
 * NOS DEUX FAÇONS DE METTRE À JOUR N'EFFACENT RIEN.
 *
 *   · l'archive déposée ÉCRIT les fichiers qu'elle contient, et rien d'autre ;
 *   · la publication par SFTP tourne avec `delete_remote_files: false`, et ce
 *     n'est pas un réglage de confort — `api/config.php` et `api/data/` ne sont
 *     pas dans le dépôt, un transfert qui « fait le ménage » les prendrait pour
 *     des intrus et emporterait la clé de chiffrement ET la base, c'est-à-dire
 *     le travail de toutes les classes.
 *
 * Donc un fichier retiré du logiciel RESTE sur l'hébergement, indéfiniment. Ce
 * n'était jamais arrivé : jusqu'ici on ajoutait, on ne retirait pas. Le jour où
 * l'on a retiré la console de séance et les listes d'élèves de
 * l'administration, deux pages sont restées là-bas — vivantes, accessibles à
 * qui se connecte, et travaillant sur la base d'aujourd'hui avec le code
 * d'hier.
 *
 * ── CE QUE CE FICHIER FAIT, ET CE QU'IL NE FAIT PAS ─────────────────────────
 *
 * IL NE SUPPRIME RIEN TOUT SEUL. Une mise à jour qui efface en silence est
 * exactement ce que le réglage ci-dessus refuse. On se contente donc de NOMMER
 * ce qui devrait partir ; l'administration le montre, et c'est le professeur
 * qui appuie. Deux secondes de plus, et personne ne perd rien par surprise.
 *
 * ET LA LISTE EST ÉCRITE À LA MAIN, exprès. « Tout ce qui n'est pas dans
 * l'archive » serait une règle automatique et catastrophique : elle désignerait
 * `config.php`, la base, et les archives que Rémy a déposées à la racine.
 * Cette liste-ci ne contient que ce qu'on a retiré NOUS-MÊMES, en le sachant.
 */

/**
 * CE QUI N'A PLUS SA PLACE SUR UN SITE À JOUR.
 *
 * La clef est un chemin relatif à la racine du site ; la valeur dit pourquoi,
 * dans les mots du professeur — il doit pouvoir décider sans nous croire.
 *
 * ON GARDE LES ENTRÉES MÊME QUAND PLUS PERSONNE NE LES A. Elles ne coûtent
 * qu'une ligne et un `is_file`, et le site de quelqu'un qui saute trois
 * versions d'un coup a besoin de toutes.
 */
const FICHIERS_PERIMES = [
    'api/admin/classe.php' => 'la console de séance de l\'administration — elle se '
        . 'conduit maintenant dans le logiciel, depuis l\'espace Classes (v885)',
    'api/admin/eleves.php' => 'les listes d\'élèves de l\'administration — elles se '
        . 'collent maintenant dans le logiciel (v885)',
];

/**
 * CEUX QUI SONT ENCORE LÀ, avec leur raison.
 *
 * @return array<string,string> chemin relatif => pourquoi il doit partir
 */
function fichiersPerimesPresents(string $racine): array
{
    $vus = [];
    foreach (FICHIERS_PERIMES as $chemin => $pourquoi) {
        if (is_file($racine . '/' . $chemin)) {
            $vus[$chemin] = $pourquoi;
        }
    }
    return $vus;
}

/**
 * LES EFFACER, ET DIRE CE QUI A RÉSISTÉ.
 *
 * ON NE PASSE PAS PAR LA LISTE REÇUE DU NAVIGATEUR. Elle viendrait de
 * quelqu'un ; on efface ce que NOUS avons inscrit, et rien d'autre. Un
 * formulaire qui nomme le fichier à supprimer est un formulaire qui supprime
 * n'importe quoi.
 *
 * @return array{effaces:list<string>,restants:list<string>}
 */
function effacerFichiersPerimes(string $racine): array
{
    $effaces = [];
    $restants = [];
    foreach (array_keys(fichiersPerimesPresents($racine)) as $chemin) {
        if (@unlink($racine . '/' . $chemin)) {
            $effaces[] = $chemin;
        } else {
            $restants[] = $chemin;
        }
    }
    return ['effaces' => $effaces, 'restants' => $restants];
}
