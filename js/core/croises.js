// LES CROISÉS DU CALCUL — deux égalités qui se croisent sur un chiffre.
//
// Rémy, quatre pages d'un magazine de jeux à l'appui : « j'aimerais bien ces
// jeux en français et en rapport avec les maths ». Celui-ci s'appelait « Cross
// Wits » : on y place des lettres dans une petite croix pour former deux mots,
// un horizontal et un vertical, qui se définissent l'un l'autre.
//
// EN MATHÉMATIQUES, LES LETTRES DEVIENNENT DES CHIFFRES, et les mots des
// ÉGALITÉS. On donne une poignée de chiffres ; il faut les placer pour que la
// ligne ET la colonne soient vraies. Les deux se croisent sur une case : le
// chiffre qui s'y trouve appartient aux deux calculs à la fois, et c'est
// exactement ce qui fait le jeu.
//
// CE QUE ÇA TRAVAILLE, ET POURQUOI CE N'EST PAS UN EXERCICE DE CALCUL. Un
// exercice de calcul demande « combien font 3 + 4 ? » et l'élève répond. Ici il
// n'y a pas de question : il y a une contrainte, et l'on cherche ce qui la
// satisfait. On essaie, on voit que ça ne tombe pas, on recommence ailleurs —
// c'est du raisonnement par essais ORGANISÉS, et c'est la première marche vers
// les systèmes d'équations.
//
// TOUS LES NOMBRES TIENNENT SUR UN CHIFFRE, et ce n'est pas une paresse : une
// case, un signe. Dès qu'un nombre en occupe deux, la croix cesse d'être une
// croix — les longueurs ne correspondent plus, et le croisement peut tomber au
// milieu d'un nombre, ce qui ne veut rien dire.

import { makeRng } from './ids.js';

/** Les paliers : ce qu'on a le droit d'employer comme opérations. */
export const PALIERS_CROISES = {
    decouverte: { label: 'Additions seulement', operations: ['+'], donne: 1 },
    facile: { label: 'Additions et soustractions', operations: ['+', '−'], donne: 1 },
    moyen: { label: 'Additions, soustractions, multiplications', operations: ['+', '−', '×'], donne: 1 },
    difficile: { label: 'Les trois opérations, aucun chiffre donné',
        operations: ['+', '−', '×'], donne: 0 }
};

/** Les cases d'un calcul : chiffre, signe, chiffre, égal, chiffre. */
export const RANGS_CHIFFRES = [0, 2, 4];

/** Toutes les égalités vraies a op b = c, avec trois chiffres de 1 à 9. */
export function egalites(operations) {
    const out = [];
    for (const op of operations) {
        for (let a = 1; a <= 9; a++) {
            for (let b = 1; b <= 9; b++) {
                const c = op === '+' ? a + b : (op === '−' ? a - b : a * b);
                // TOUT DOIT TENIR SUR UN CHIFFRE, y compris le résultat : une
                // case, un signe. Et l'on écarte le zéro, qui ferait des
                // égalités vraies mais vides (« 5 − 5 = 0 »).
                if (c >= 1 && c <= 9) out.push({ a, op, b, c });
            }
        }
    }
    return out;
}

/** Le calcul, case par case : [a, op, b, '=', c]. */
export const enCases = (e) => [String(e.a), e.op, String(e.b), '=', String(e.c)];

/**
 * UNE CROIX.
 *
 * On tire une égalité horizontale, puis une verticale qui partage un CHIFFRE
 * avec elle, à un croisement tiré au sort. Les deux calculs occupent cinq cases
 * chacun ; le croisement tombe sur une case de chiffre des deux côtés — jamais
 * sur un signe, qui n'appartiendrait à personne.
 *
 * @returns {{rangee:number, colonne:number, h:object, v:object,
 *   cases:Map<number,string>, aTrouver:number[], jetons:string[]}}
 */
export function genererCroise({ rng = makeRng('croises'), operations = ['+', '−'],
    donne = 1 } = {}) {
    const toutes = egalites(operations);
    for (let essai = 0; essai < 300; essai++) {
        const h = rng.pick(toutes);
        const rangee = rng.pick(RANGS_CHIFFRES);     // quelle case de la VERTICALE est partagée
        const colonne = rng.pick(RANGS_CHIFFRES);    // quelle case de l'HORIZONTALE est partagée
        const casesH = enCases(h);
        const partage = casesH[colonne];
        // La verticale doit porter ce même chiffre à la case partagée.
        const candidates = toutes.filter(e => enCases(e)[rangee] === partage);
        if (!candidates.length) continue;
        const v = rng.pick(candidates);
        const casesV = enCases(v);

        // La croix, dans une grille de 5 sur 5.
        const cases = new Map();
        casesH.forEach((x, c) => cases.set(rangee * 5 + c, x));
        casesV.forEach((x, r) => cases.set(r * 5 + colonne, x));

        // CE QU'ON EFFACE : les chiffres, jamais les signes. Un jeu qui
        // demanderait de retrouver le « + » serait un autre jeu — et surtout,
        // un jeu où l'on ne peut pas commencer.
        const chiffres = [...cases.keys()].filter(i => /^[1-9]$/.test(cases.get(i)));
        const aTrouver = rng.shuffle([...chiffres]).slice(0, Math.max(0, chiffres.length - donne));
        if (aTrouver.length < 3) continue;

        return {
            rangee, colonne, h, v, cases,
            aTrouver: [...aTrouver].sort((a, b) => a - b),
            // LES JETONS SONT MÉLANGÉS, et c'est tout le jeu : rangés, il
            // suffirait de les poser dans l'ordre.
            jetons: rng.shuffle(aTrouver.map(i => cases.get(i)))
        };
    }
    return null;
}

/**
 * CE QUI NE VA PAS DANS CE PLACEMENT.
 *
 * ON NE COMPARE PAS À LA SOLUTION DU FABRICANT. Plusieurs placements peuvent
 * rendre les deux égalités vraies — « 3 + 4 = 7 » et « 4 + 3 = 7 » emploient
 * les mêmes jetons —, et refuser celui de l'élève parce qu'il n'est pas le
 * nôtre serait une faute d'énoncé. On relit les deux lignes, et l'on juge.
 *
 * @param {object} grille ce que rend `genererCroise`
 * @param {Map<number,string>|object} pose ce que l'élève a mis, par case
 */
export function verifierCroise(grille, pose) {
    const lire = (i) => {
        const p = pose instanceof Map ? pose.get(i) : pose[i];
        return p !== undefined && p !== null && p !== '' ? String(p) : null;
    };
    const problemes = [];
    const dit = (genre, message, cases) => problemes.push({ genre, message, cases });

    const vides = grille.aTrouver.filter(i => lire(i) === null);
    if (vides.length) {
        dit('vides', vides.length === 1
            ? 'Il reste une case vide.'
            : `Il reste ${vides.length} cases vides.`, vides);
        return { ok: false, problemes };
    }

    // La valeur de chaque case : celle qu'on a posée, ou celle qui était là.
    const valeur = (i) => (grille.aTrouver.includes(i) ? lire(i) : grille.cases.get(i));

    const lignes = [
        { nom: 'la ligne', cases: [0, 1, 2, 3, 4].map(c => grille.rangee * 5 + c) },
        { nom: 'la colonne', cases: [0, 1, 2, 3, 4].map(r => r * 5 + grille.colonne) }
    ];
    for (const l of lignes) {
        const [a, op, b, , c] = l.cases.map(valeur);
        const na = Number(a), nb = Number(b), nc = Number(c);
        const vaut = op === '+' ? na + nb : (op === '−' ? na - nb : na * nb);
        if (vaut !== nc) {
            dit('faux', `${l.nom} dit ${a} ${op} ${b} = ${c}, et ${a} ${op} ${b} font ${vaut}.`,
                l.cases);
        }
    }
    return { ok: problemes.length === 0, problemes };
}

/** La solution du fabricant — une parmi d'autres, pour le robot. */
export function solutionCroise(grille) {
    const out = {};
    grille.aTrouver.forEach(i => { out[i] = grille.cases.get(i); });
    return out;
}
