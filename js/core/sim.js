// LE SIM — les règles, sans une ligne de DOM.
//
// Rémy : « et le sim : https://fr.wikipedia.org/wiki/Sim_(jeu) ».
//
// Six points en hexagone, les quinze segments qui les relient tous. Chacun son
// tour, on colorie un segment de SA couleur ; celui qui forme le premier un
// TRIANGLE de sa propre couleur A PERDU. C'est un jeu à éviter, pas à gagner —
// et cela suffit à le rendre déroutant : on cherche d'habitude à construire,
// ici on cherche à ne pas construire.
//
// POURQUOI C'EST UN JEU DE MATHÉMATIQUES, et pas seulement un jeu. Le théorème
// de Ramsey R(3,3) = 6 dit qu'en coloriant de deux couleurs toutes les arêtes
// d'un hexagone complet, il est IMPOSSIBLE de ne pas former de triangle
// monochrome. Autrement dit : le Sim ne peut pas finir par un match nul, et
// c'est démontrable — un des rares résultats de théorie des graphes qu'un
// élève de collège peut constater lui-même, quinze traits à la main. Le jeu
// est en outre gagné par le second joueur avec un jeu parfait, ce qui donne un
// second sujet d'étonnement.
//
// LE CONTRAT est celui de `core/ia.js`. Les états ne sont jamais modifiés.

export const POINTS = 6;

/** Les quinze arêtes, dans un ordre fixe : [i, j] avec i < j. */
export const ARETES = (() => {
    const t = [];
    for (let i = 0; i < POINTS; i++) for (let j = i + 1; j < POINTS; j++) t.push([i, j]);
    return t;
})();

/** L'indice de l'arête reliant deux points, quel que soit l'ordre donné. */
export function indiceArete(a, b) {
    const [i, j] = a < b ? [a, b] : [b, a];
    return ARETES.findIndex(e => e[0] === i && e[1] === j);
}

/** Les vingt triangles possibles, chacun donné par ses trois arêtes. */
export const TRIANGLES = (() => {
    const t = [];
    for (let a = 0; a < POINTS; a++) {
        for (let b = a + 1; b < POINTS; b++) {
            for (let c = b + 1; c < POINTS; c++) {
                t.push({
                    points: [a, b, c],
                    aretes: [indiceArete(a, b), indiceArete(a, c), indiceArete(b, c)]
                });
            }
        }
    }
    return t;
})();

export function creerPartie(options = {}) {
    return {
        // `couleurs[i]` : null, 'B' ou 'N' pour l'arête n° i.
        couleurs: new Array(ARETES.length).fill(null),
        trait: options.trait === 'N' ? 'N' : 'B',
        dernier: null,        // { arete, par }
        // Le triangle fatal, une fois formé : on le montre, on ne l'annonce pas.
        perdant: null,        // { couleur, triangle }
    };
}

const cloner = (p) => ({ ...p, couleurs: p.couleurs.slice() });

/** Les arêtes encore incolores. */
export function coups(p) {
    if (terminee(p)) return [];
    const out = [];
    p.couleurs.forEach((c, i) => { if (c === null) out.push(i); });
    return out;
}

/** Le premier triangle entièrement de cette couleur, s'il existe. */
export function triangleDe(p, couleur) {
    return TRIANGLES.find(t => t.aretes.every(a => p.couleurs[a] === couleur)) || null;
}

/**
 * Colorier une arête.
 *
 * ON PERD EN FERMANT SON PROPRE TRIANGLE : le gagnant est donc l'adversaire de
 * celui qui vient de jouer. C'est la seule règle du jeu, et c'est aussi la
 * seule chose que le moteur a besoin de savoir.
 */
export function jouer(p, arete) {
    if (p.couleurs[arete] !== null) return p;
    const n = cloner(p);
    n.couleurs[arete] = p.trait;
    n.dernier = { arete, par: p.trait };
    const fatal = triangleDe(n, p.trait);
    n.perdant = fatal ? { couleur: p.trait, triangle: fatal } : null;
    n.trait = p.trait === 'B' ? 'N' : 'B';
    return n;
}

/**
 * La fin.
 *
 * Le théorème de Ramsey garantit qu'elle arrive toujours par un triangle : sur
 * quinze arêtes coloriées de deux couleurs, un triangle monochrome est
 * inévitable. La grille pleine sans perdant est donc un cas IMPOSSIBLE — on le
 * traite quand même, parce qu'un moteur qui suppose un théorème et se trompe
 * boucle sans fin, et parce qu'un test doit pouvoir le constater.
 */
export function terminee(p) {
    if (p.perdant) {
        return { gagnant: p.perdant.couleur === 'B' ? 'N' : 'B', raison: 'triangle', triangle: p.perdant.triangle };
    }
    if (p.couleurs.every(c => c !== null)) return { gagnant: null, raison: 'impossible' };
    return null;
}

/**
 * Les arêtes qui feraient PERDRE tout de suite celui qui les prendrait.
 *
 * C'est le calcul central du jeu : une arête est mortelle si elle complète un
 * triangle dont les deux autres côtés sont déjà de ma couleur. Compter les
 * siennes et celles de l'adversaire, c'est comprendre où en est la partie.
 */
export function aretesMortelles(p, couleur = p.trait) {
    return coups(p).filter(a => TRIANGLES.some(t =>
        t.aretes.includes(a) && t.aretes.filter(x => x !== a).every(x => p.couleurs[x] === couleur)));
}

/**
 * L'ÉVALUATION, du point de vue du joueur au trait.
 *
 * Trois choses, dans cet ordre :
 *   · les coups qui me tueraient : moins j'en ai, mieux je respire ;
 *   · ceux qui tueraient l'autre : plus il y en a, plus il est acculé ;
 *   · les « presque triangles » de chacun, qui annoncent les précédents.
 * Un joueur dont TOUS les coups restants sont mortels a perdu, quoi qu'il
 * fasse : c'est la position qu'on cherche à imposer.
 */
export function evaluer(p) {
    const moi = p.trait, lui = moi === 'B' ? 'N' : 'B';
    const libres = coups(p);
    if (!libres.length) return 0;
    const mesMorts = aretesMortelles(p, moi).length;
    const sesMorts = aretesMortelles(p, lui).length;
    if (mesMorts === libres.length) return -900;   // acculé : tout me tue
    const paires = (couleur) => TRIANGLES.filter(t =>
        t.aretes.filter(a => p.couleurs[a] === couleur).length === 2
        && t.aretes.some(a => p.couleurs[a] === null)).length;
    return (sesMorts - mesMorts) * 12 + (paires(lui) - paires(moi)) * 2;
}

/** Les coups qui ne me tuent pas d'abord : l'élagage y gagne beaucoup. */
export function ordonner(liste, p) {
    if (!p) return liste;
    const mortelles = new Set(aretesMortelles(p, p.trait));
    return liste.slice().sort((a, b) => (mortelles.has(a) ? 1 : 0) - (mortelles.has(b) ? 1 : 0));
}

export const JEU = { coups, jouer, terminee, evaluer, ordonner };

/**
 * LES SIX POINTS EN HEXAGONE — les coordonnées, une fois pour toutes.
 *
 * Elles appartiennent au noyau et non au dessin : la fiche imprimée, l'écran
 * et l'explication du robot doivent placer les points AU MÊME ENDROIT, sinon
 * « le point d'en haut à droite » ne désigne pas la même chose selon où on le
 * lit.
 */
export function positions(rayon = 100, cx = 0, cy = 0) {
    return Array.from({ length: POINTS }, (_, i) => {
        // On part du haut et l'on tourne dans le sens des aiguilles : c'est
        // l'ordre dans lequel on numérote une figure au tableau.
        const angle = (-90 + i * 60) * Math.PI / 180;
        return { x: cx + rayon * Math.cos(angle), y: cy + rayon * Math.sin(angle) };
    });
}
