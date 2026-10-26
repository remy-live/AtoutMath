// LES GRATTE-CIEL — combien d'immeubles voit-on depuis la rue ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 26 octobre : « tu me les fais tous, avec des grilles faciles ».
//
// LA RÈGLE : chaque case porte la HAUTEUR d'un immeuble, de 1 à n. Une hauteur
// par ligne et par colonne — un carré latin. Les nombres écrits tout autour de
// la grille disent COMBIEN d'immeubles on voit depuis ce bord : un immeuble
// cache tous ceux qui sont derrière et moins hauts que lui.
//
// ── CE QUE ÇA TRAVAILLE ─────────────────────────────────────────────────────
//
// Un raisonnement qu'aucun autre jeu du catalogue ne demande : « plus grand
// que tous les précédents ». Et deux déductions qui se lisent sans calcul :
//
//   · un 1 au bord veut dire que le plus haut est juste là — il cache tout ;
//   · un n au bord impose l'ordre croissant, toute la ligne d'un coup.
//
// C'est aussi le seul jeu d'ici où l'on raisonne sur un ORDRE plutôt que sur
// une somme, et il se dessine très bien : on peut imaginer la rue.

import { makeItem } from '../items.js';

const SKILL = 'num.logique.gratte-ciel';

export const FORMATS = {
    petit: { n: 4, nom: 'Petite — 4 × 4' },
    grand: { n: 5, nom: 'Grande — 5 × 5' }
};

/** La part des indices de bord qu'on cherche à effacer. */
const VIDES = { facile: 0, moyen: 0.3, difficile: 0.5 };
const DIFFICULTE_ITEM = { facile: 1, moyen: 2, difficile: 3 };

/** Combien d'immeubles voit-on en regardant cette file dans cet ordre ? */
export function combienVus(file) {
    let haut = 0, vus = 0;
    for (const h of file) if (h > haut) { haut = h; vus++; }
    return vus;
}

/** Un carré latin tiré au sort, par essais successifs. */
function carreLatin(rng, n) {
    const g = Array.from({ length: n }, () => Array(n).fill(0));
    const poser = (i) => {
        if (i === n * n) return true;
        const r = Math.floor(i / n), c = i % n;
        for (const v of rng.shuffle(Array.from({ length: n }, (_, k) => k + 1))) {
            let ok = true;
            for (let k = 0; k < n && ok; k++) {
                if (g[r][k] === v || g[k][c] === v) ok = false;
            }
            if (!ok) continue;
            g[r][c] = v;
            if (poser(i + 1)) return true;
            g[r][c] = 0;
        }
        return false;
    };
    poser(0);
    return g;
}

/** Les quatre familles d'indices d'une grille remplie. */
export function indicesDe(g) {
    const n = g.length;
    const colonne = (c) => g.map(l => l[c]);
    return {
        gauche: g.map(l => combienVus(l)),
        droite: g.map(l => combienVus(l.slice().reverse())),
        haut: Array.from({ length: n }, (_, c) => combienVus(colonne(c))),
        bas: Array.from({ length: n }, (_, c) => combienVus(colonne(c).slice().reverse()))
    };
}

/**
 * COMPTE LES GRILLES QUI RESPECTENT LES INDICES. On s'arrête à `limite`.
 *
 * Rangée par rangée, chaque rangée étant une permutation de 1 à n. On élague
 * dès qu'une colonne répète un nombre, et l'on vérifie les indices de gauche
 * et de droite sitôt la rangée posée — attendre la fin multiplierait le
 * travail par vingt-quatre à chaque ligne.
 */
export function compterGratteCiel(n, ind, limite = 2) {
    const perms = [];
    const faire = (reste, acc) => {
        if (!reste.length) { perms.push(acc.slice()); return; }
        reste.forEach((v, i) => {
            acc.push(v);
            faire(reste.filter((_, k) => k !== i), acc);
            acc.pop();
        });
    };
    faire(Array.from({ length: n }, (_, k) => k + 1), []);

    const bonnesRangees = perms.filter((p, i) => { void i; return true; });
    let trouvees = 0;
    const g = [];
    const poser = (r) => {
        if (trouvees >= limite) return;
        if (r === n) {
            for (let c = 0; c < n; c++) {
                const col = g.map(l => l[c]);
                if (ind.haut[c] != null && combienVus(col) !== ind.haut[c]) return;
                if (ind.bas[c] != null && combienVus(col.slice().reverse()) !== ind.bas[c]) return;
            }
            trouvees++;
            return;
        }
        for (const p of bonnesRangees) {
            if (ind.gauche[r] != null && combienVus(p) !== ind.gauche[r]) continue;
            if (ind.droite[r] != null && combienVus(p.slice().reverse()) !== ind.droite[r]) continue;
            let ok = true;
            for (let c = 0; c < n && ok; c++) {
                for (let k = 0; k < r && ok; k++) if (g[k][c] === p[c]) ok = false;
            }
            if (!ok) continue;
            g.push(p);
            poser(r + 1);
            g.pop();
            if (trouvees >= limite) return;
        }
    };
    poser(0);
    return trouvees;
}

export const gratteCielGenerator = {
    id: 'logique.gratte-ciel',
    label: 'Gratte-ciel',
    skills: [SKILL],
    answerKinds: ['grid'],
    params: [
        {
            id: 'format', type: 'select', label: 'Taille de la grille', default: 'petit',
            options: Object.entries(FORMATS).map(([value, f]) => ({ value, label: f.nom }))
        },
        {
            id: 'difficulte', type: 'select', label: 'Difficulté', default: 'facile',
            aide: 'Elle change le nombre d\'indices donnés au bord. En facile, les quatre '
                + 'côtés sont complets.',
            options: [
                { value: 'facile', label: 'Facile — tous les indices sont donnés' },
                { value: 'moyen', label: 'Moyen' },
                { value: 'difficile', label: 'Difficile — peu d\'indices' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const n = (FORMATS[p.format] || FORMATS.petit).n;
        const part = VIDES[p.difficulte] ?? VIDES.facile;

        let sol = null, ind = null;
        for (let essai = 0; essai < 30 && !sol; essai++) {
            const g = carreLatin(rng, n);
            const i0 = indicesDe(g);
            if (compterGratteCiel(n, i0, 2) === 1) { sol = g; ind = i0; }
        }
        if (!sol) {
            sol = carreLatin(rng, n);
            ind = indicesDe(sol);
        }

        // ON EFFACE DES INDICES tant que la solution reste unique. En facile,
        // on n'en efface aucun : « des grilles faciles ».
        if (part > 0) {
            const tous = [];
            ['gauche', 'droite', 'haut', 'bas'].forEach(sens => {
                for (let i = 0; i < n; i++) tous.push([sens, i]);
            });
            const but = Math.round(tous.length * part);
            let efface = 0;
            for (const [sens, i] of rng.shuffle(tous)) {
                if (efface >= but) break;
                const garde = ind[sens][i];
                ind[sens][i] = null;
                if (compterGratteCiel(n, ind, 2) === 1) efface++;
                else ind[sens][i] = garde;
            }
        }

        const cases = [];
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) cases.push({ r, c, type: 'vide' });
        }

        const consigne = `Écris la hauteur de chaque immeuble, de 1 à ${n}, une seule fois `
            + 'par ligne et par colonne. Les nombres au bord disent combien d\'immeubles '
            + 'on voit depuis ce côté.';

        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.gratte-ciel',
            skillId: SKILL,
            answerKind: 'grid',
            prompt: {
                text: consigne, papier: consigne,
                html: `<div class="game-question gn-consigne">${consigne}</div>`
            },
            answer: 'g' + sol.map(l => l.join(',')).join('/'),
            hints: [
                `UN 1 AU BORD : le plus haut immeuble est juste là, contre le bord — il cache `
                    + 'tous les autres.',
                `UN ${n} AU BORD : on les voit tous, donc ils montent dans l'ordre — `
                    + `1, 2, … ${n} en partant de ce côté. Toute la rangée d'un coup.`,
                'Un 2 au bord veut dire qu\'on voit le premier puis le plus haut : le plus '
                    + 'haut n\'est jamais en première position.'
            ],
            explanation: `Chaque hauteur de 1 à ${n} apparaît une fois par ligne et par `
                + 'colonne, et les indices comptent les immeubles visibles depuis leur bord.',
            difficulty: DIFFICULTE_ITEM[p.difficulte] || 1,
            meta: {
                lignes: n, colonnes: n, cases, solution: sol,
                chiffres: { min: 1, max: n },
                marges: { gauche: ind.gauche, droite: ind.droite, haut: ind.haut, bas: ind.bas },
                titreCourt: 'Gratte-ciel',
                texteLecon: 'Un immeuble cache ceux qui sont derrière et moins hauts que lui.'
            }
        });
    }
};

export default gratteCielGenerator;
