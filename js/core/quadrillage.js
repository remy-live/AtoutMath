// DEUX AIDES DE QUADRILLAGE, PARTAGÉES PAR LES JEUX DE CASES.
//
// Elles vivaient dans `js/core/patchwork.js`, parce que Le Patchwork est le
// premier jeu qui en a eu besoin. Rémy a demandé le retrait du Patchwork le
// 28 septembre ; Les Serpents, eux, restent, et ils importaient ces deux
// fonctions-là. Les laisser dans un fichier nommé d'après un exercice disparu
// aurait été une fausse piste pour la prochaine lecture — et supprimer le
// fichier aurait cassé Les Serpents sans que rien ne le dise avant l'écran.
//
// ELLES NE SAVENT RIEN DU JEU QUI LES APPELLE : une grille, un nombre de
// lignes, un nombre de colonnes, des indices de cases. C'est ce qui les rend
// partageables, et c'est pourquoi elles n'ont jamais eu leur place dans un
// module d'exercice.

/** Les quatre voisines d'une case, dans une grille de `colonnes` colonnes. */
export function voisines(i, lignes, colonnes) {
    const r = Math.floor(i / colonnes), c = i % colonnes;
    const out = [];
    if (r > 0) out.push(i - colonnes);
    if (r < lignes - 1) out.push(i + colonnes);
    if (c > 0) out.push(i - 1);
    if (c < colonnes - 1) out.push(i + 1);
    return out;
}

/**
 * Les cases d'un morceau tiennent-elles en UN SEUL tenant ?
 *
 * Un parcours en profondeur depuis la première case : si l'on n'atteint pas
 * toutes les autres en ne passant que par des voisines du morceau, c'est qu'il
 * est en deux paquets.
 */
export function dUnSeulTenant(cases, lignes, colonnes) {
    if (!cases.length) return true;
    const dedans = new Set(cases);
    const vus = new Set([cases[0]]);
    const pile = [cases[0]];
    while (pile.length) {
        for (const v of voisines(pile.pop(), lignes, colonnes)) {
            if (dedans.has(v) && !vus.has(v)) { vus.add(v); pile.push(v); }
        }
    }
    return vus.size === cases.length;
}
