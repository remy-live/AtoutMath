// État de publication d'un exercice.
//
// Module séparé pour que les fichiers de catalogue puissent l'importer sans
// dépendre de catalog.js, qui les importe lui-même.

export const STATUS = {
    VALIDE: 'valide',       // prêt pour les élèves
    TEST: 'test',           // en cours de mise au point : visible du professeur seul
    BROUILLON: 'brouillon'  // gardé pour plus tard : invisible sauf filtre explicite
};

export const STATUS_LABELS = {
    [STATUS.VALIDE]: 'Validé',
    [STATUS.TEST]: 'En test',
    [STATUS.BROUILLON]: 'Non validé'
};

/** Ordre d'affichage du filtre, « tout » compris. */
export const STATUS_CYCLE = ['tout', STATUS.TEST, STATUS.VALIDE, STATUS.BROUILLON];
