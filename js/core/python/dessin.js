// DEUX DESSINS SE RESSEMBLENT-ILS ASSEZ ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 19 novembre : « on ne pourra faire des choses un peu ludique, aussi des
// fonctions et du dessin ». L'élève écrit un programme qui dessine, et il faut
// bien dire si sa figure est la bonne.
//
// ── ON NE COMPARE PAS DES PIXELS ─────────────────────────────────────────
//
// Deux programmes qui dessinent le même carré ne posent pas leurs traits aux
// mêmes pixels : l'anticrénelage étale un trait sur deux colonnes, et un
// `cos(72°)` arrondit autrement qu'un autre. Une comparaison pixel à pixel
// déclarerait fausse une figure juste, ce qui est la pire chose qu'un exercice
// de programmation puisse faire.
//
// Le bac à sable rend donc une GRILLE de 64 × 64 cases pleines ou vides (voir
// `bac-python.html`). Une case vaut six pixels : assez grossier pour absorber
// un trait qui déborde, assez fin pour qu'un carré de côté 100 ne passe pas
// pour un carré de côté 120.
//
// ── ET L'ON PARDONNE UN DÉCALAGE D'UNE CASE, PAS DAVANTAGE ───────────────
//
// Une figure juste peut être posée une case plus haut : la tortue part du
// centre, et un trait qui commence au pixel 200 ou 201 ne tombe pas dans la
// même case. On compte donc comme commune toute case pleine qui a une case
// pleine À CÔTÉ dans l'autre dessin. Au-delà, ce n'est plus un décalage, c'est
// une autre figure.

/** La finesse de la grille — la même des deux côtés (voir `bac-python.html`). */
export const COTE_GRILLE = 64;

/** Les cases pleines, voisinage d'une case compris. */
function voisinage(grille, cote) {
    const vu = new Set();
    for (let i = 0; i < grille.length; i++) {
        if (grille[i] !== '1') continue;
        const x = i % cote, y = Math.floor(i / cote);
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= cote || ny >= cote) continue;
                vu.add(ny * cote + nx);
            }
        }
    }
    return vu;
}

/**
 * COMBIEN LES DEUX DESSINS SE RECOUVRENT, ENTRE 0 ET 1.
 *
 * La mesure est SYMÉTRIQUE et punit les deux fautes séparément : du trait en
 * trop (l'élève a dessiné plus que le modèle) et du trait en moins (il en a
 * oublié). On rend donc la PLUS PETITE des deux couvertures — un dessin qui
 * contient le modèle ET le double en longueur ne doit pas passer pour juste.
 *
 * Deux dessins vides ne se ressemblent pas : ils n'existent pas. Rendre 1
 * reviendrait à déclarer juste un programme qui ne dessine rien.
 */
export function ressemblance(a, b, cote = COTE_GRILLE) {
    const na = (a || '').split('').filter((c) => c === '1').length;
    const nb = (b || '').split('').filter((c) => c === '1').length;
    if (!na || !nb) return 0;
    const prochesDeA = voisinage(a, cote);
    const prochesDeB = voisinage(b, cote);
    let aVuDansB = 0, bVuDansA = 0;
    for (let i = 0; i < a.length; i++) {
        if (a[i] === '1' && prochesDeB.has(i)) aVuDansB++;
        if (b[i] === '1' && prochesDeA.has(i)) bVuDansA++;
    }
    return Math.min(aVuDansB / na, bVuDansA / nb);
}

/**
 * LE SEUIL — au-dessus, c'est la même figure.
 *
 * MESURÉ dans le vrai bac à sable — `node tools/dessinPython.mjs` imprime le
 * tableau, et il faut le relire à chaque fois qu'on touche à la grille :
 *
 *   la même figure écrite autrement ............ 1,000
 *   la même, un côté plus long de 4 pixels ..... 1,000
 *   le même escalier écrit avec une fonction ... 1,000
 *   ─────────────────────────────────── le trou ───────────────────────────
 *   le modèle plus une diagonale en trop ....... 0,821
 *   un côté trop court d'un quart .............. 0,547
 *   un pentagone au lieu d'un hexagone ......... 0,509
 *   un triangle au lieu d'un carré ............. 0,436
 *   un carré tracé de l'autre côté ............. 0,385
 *   rien du tout ............................... 0,051
 *
 * Le seuil se pose dans le trou, et pas au milieu de nulle part.
 *
 * ET LE CARRÉ « TRACÉ DE L'AUTRE CÔTÉ » EST FAUX, C'EST UNE DÉCISION. C'est
 * bien un carré de côté 120, mais de l'autre côté du point de départ. Le
 * modèle est MONTRÉ à l'élève, à côté de son dessin : lui répondre « la même »
 * devant deux images qui ne se superposent pas serait incompréhensible. Il
 * voit immédiatement pourquoi, ce qui est la meilleure des corrections.
 */
export const SEUIL = 0.92;

/** La figure de l'élève est-elle celle du modèle ? */
export const memeFigure = (a, b) => ressemblance(a, b) >= SEUIL;
