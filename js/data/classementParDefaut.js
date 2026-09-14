// Le classement livré avec l'application.
//
// CE QUE LE PROFESSEUR A RELU FINIT ICI, dans le dépôt. Tant que le classement
// ne vit que dans le stockage du navigateur, il est perdu sur un autre poste,
// perdu si l'on vide le cache, et invisible pour les élèves. Une soirée de
// relecture ne peut pas dépendre d'un cache.
//
// Le va-et-vient est simple : le professeur relit son tableau, exporte son
// classement, et le fichier devient ce fichier-ci. Il est alors la base pour
// TOUT LE MONDE, sur n'importe quel navigateur, sans rien à importer.
//
// Le stockage local ne garde plus, dès lors, que ce que le professeur a changé
// DEPUIS : il se superpose à cette base, case par case. Renvoyer un nouvel
// export remet les deux en phase.
//
// Format : { identifiantExercice: { identifiantChapitre: true | false } }
// `true` = rangé dans ce chapitre, `false` = proposition explicitement retirée.

export const CLASSEMENT_LIVRE = {};
