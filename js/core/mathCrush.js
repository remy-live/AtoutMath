// MATH CRUSH — ce qui se calcule, sans une ligne de dessin.
//
// Rémy, banc d'essai : « C'est bizarre comment apparaît le plateau. Je trouve
// les chiffres non centrés dans les cases. Pour la cible, on ne sait pas si on
// doit additionner ou multiplier. J'aimerais bien un jeu plus visuel et plus
// joli. »
//
// Trois des quatre reproches sont des reproches de DESSIN, et le dessin vit
// dans le jeu. Mais deux choses qu'on redessine méritent d'être calculées
// ailleurs et vérifiées :
//
//   · L'OPÉRATION, qu'on ne devinait pas. « Cible : 7 » ne dit pas s'il faut
//     additionner ou multiplier — et sur un plateau de nombres, les deux
//     paraissent également plausibles. On écrit donc l'opération partout où
//     elle se lit : dans le bandeau, dans l'expression en cours, et entre deux
//     cases de la chaîne. C'est le rôle d'`OPERATIONS` et d'`expressionChaine`.
//
//   · LA DISPOSITION DU PLATEAU, qui « apparaissait bizarrement ». Le bandeau
//     faisait cent pixels quelle que soit la hauteur : sur un écran bas il
//     mangeait le tiers du plateau, sur un grand il flottait. On le calcule
//     donc en proportion, et l'on rend un plateau CENTRÉ dans ce qui reste.

/**
 * LES DEUX OPÉRATIONS, et tous les mots qu'on emploie pour les dire.
 *
 * Le `neutre` n'est pas une coquetterie : c'est ce qui permet d'écrire
 * `valeurChaine` une seule fois pour les deux modes.
 */
export const OPERATIONS = {
    addition: {
        signe: '+', nom: 'somme', verbe: 'Additionne', neutre: 0,
        consigne: 'Additionne des cases voisines',
        applique: (a, b) => a + b
    },
    multiplication: {
        signe: '×', nom: 'produit', verbe: 'Multiplie', neutre: 1,
        consigne: 'Multiplie des cases voisines',
        applique: (a, b) => a * b
    }
};

export function operationDe(mode) {
    return OPERATIONS[mode] || OPERATIONS.addition;
}

/** Ce que vaut une chaîne de cases. Une chaîne vide ne vaut rien du tout. */
export function valeurChaine(valeurs, mode) {
    if (!valeurs || !valeurs.length) return 0;
    const op = operationDe(mode);
    return valeurs.reduce((acc, v) => op.applique(acc, v), op.neutre);
}

/**
 * L'EXPRESSION ÉCRITE, « 3 + 4 + 5 = 12 ».
 *
 * C'est la réponse directe au reproche : on ne montre plus un total nu mais le
 * CALCUL, signe compris. L'élève voit ce qu'il est en train de faire pendant
 * qu'il le fait, ce qui est aussi ce qu'on lui demande d'apprendre.
 */
export function expressionChaine(valeurs, mode) {
    if (!valeurs || !valeurs.length) return '';
    const op = operationDe(mode);
    return valeurs.join(` ${op.signe} `) + ` = ${valeurChaine(valeurs, mode)}`;
}

/**
 * A-T-ON DÉPASSÉ LA CIBLE ?
 *
 * Les deux opérations ne croissent que par des valeurs ≥ 1 : une chaîne trop
 * grande ne redescendra jamais, et le dire tout de suite évite de continuer
 * pour rien. On ne le dit qu'à partir de DEUX cases : une première case seule
 * plus grande que la cible arrive tout le temps, et la peindre en rouge dès le
 * premier doigt posé ferait clignoter le plateau pour rien.
 */
export function depasse(valeurs, cible, mode) {
    return (valeurs || []).length >= 2 && valeurChaine(valeurs, mode) > cible;
}

/**
 * LA DISPOSITION DU PLATEAU.
 *
 * Tout en proportion de la boîte, avec des bornes : un bandeau de cent pixels
 * fixes mange le tiers d'un écran de téléphone en paysage et flotte au milieu
 * d'un écran de bureau. Le plateau, lui, est CENTRÉ dans ce qui reste — c'est
 * ce qui manquait, et ce qui donnait l'impression qu'il « apparaissait
 * bizarrement ».
 */
export function disposerPlateau(largeur, hauteur, colonnes, lignes) {
    const bandeau = Math.round(Math.max(64, Math.min(hauteur * 0.19, 128)));
    const bas = Math.round(Math.max(10, Math.min(hauteur * 0.05, 34)));
    const cotes = Math.round(Math.max(8, Math.min(largeur * 0.04, 30)));
    const dispoW = Math.max(1, largeur - cotes * 2);
    const dispoH = Math.max(1, hauteur - bandeau - bas);
    const cote = Math.max(18, Math.floor(Math.min(dispoW / colonnes, dispoH / lignes)));
    const w = cote * colonnes, h = cote * lignes;
    // CENTRÉ, MAIS PAS À TOUT PRIX. Sur un téléphone, la largeur décide de la
    // taille des cases et il reste beaucoup de hauteur : centrer à la lettre
    // ouvrait un trou de cent pixels entre la cible et le plateau, et l'on ne
    // savait plus que l'une parlait de l'autre. On plafonne donc le décalage à
    // un demi-carreau : le plateau reste accroché sous son bandeau.
    const reste = Math.max(0, (dispoH - h) / 2);
    return {
        bandeau, cote, w, h,
        x: Math.round((largeur - w) / 2),
        y: Math.round(bandeau + Math.min(reste, cote * 0.6))
    };
}
