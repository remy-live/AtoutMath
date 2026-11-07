// LE SUGURU (ou Tectonic) — des zones, et des nombres qui ne se touchent pas.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 26 octobre : « tu me les fais tous, avec des grilles faciles ».
//
// LA RÈGLE TIENT EN DEUX LIGNES, et c'est tout son intérêt :
//
//   · une zone de n cases contient les nombres de 1 à n, une fois chacun ;
//   · deux nombres ÉGAUX ne se touchent jamais — même en diagonale.
//
// UN CM2 Y ENTRE SEUL. C'est le compagnon naturel du Shikaku : même geste de
// zones, raisonnement tout différent. Et la seconde règle fait travailler une
// notion que le sudoku ignore — le VOISINAGE au sens large, les huit cases
// autour, diagonales comprises.
//
// ── COMMENT ON FABRIQUE UNE GRILLE ──────────────────────────────────────────
//
// Trois temps, dans cet ordre, et chacun peut échouer sans conséquence :
//   1. on découpe la grille en zones connexes de une à cinq cases ;
//   2. on la remplit par essais successifs, en respectant les deux règles ;
//   3. on efface des cases tant que la solution reste UNIQUE.
//
// SI LE REMPLISSAGE ÉCHOUE, on redécoupe : certaines découpes n'admettent
// aucune solution (une zone de cinq cases en croix, entourée d'une zone de
// cinq, ne laisse pas toujours de place). C'est moins cher de retirer que de
// démontrer à l'avance qu'une découpe est bonne.

import { makeItem } from '../items.js';

const SKILL = 'num.logique.suguru';

export const FORMATS = {
    petit: { lignes: 5, colonnes: 5, nom: 'Petite — 5 × 5' },
    grand: { lignes: 6, colonnes: 6, nom: 'Grande — 6 × 6' }
};

/** La part des cases qu'on cherche à effacer. « Des grilles faciles ». */
const VIDES = { facile: 0.5, moyen: 0.68, difficile: 0.82 };

/**
 * CE QU'UNE GRILLE S'AUTORISE À EXPLORER POUR PROUVER SON UNICITÉ, en nœuds de
 * recherche, TOUS EFFACEMENTS CONFONDUS. Voir `compterSuguru` pour le défaut
 * que ce plafond corrige et pourquoi il compte des nœuds, pas des
 * millisecondes.
 */
const PLAFOND_NOEUDS = 200000;

/**
 * CE QU'UN REMPLISSAGE S'AUTORISE AVANT DE RENDRE LA MAIN. Voir `remplir` : une
 * découpe sans solution se démontre en épuisant tout l'arbre, et c'est là que
 * partaient les sept secondes. On redécoupe plutôt que de démontrer.
 */
const PLAFOND_REMPLIR = 12000;
const DIFFICULTE_ITEM = { facile: 1, moyen: 2, difficile: 3 };

/** Les huit voisins d'une case — diagonales comprises, c'est toute la règle. */
function voisins(r, c, lignes, colonnes) {
    const out = [];
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            const a = r + dr, b = c + dc;
            if (a >= 0 && b >= 0 && a < lignes && b < colonnes) out.push([a, b]);
        }
    }
    return out;
}

/**
 * DÉCOUPE EN ZONES CONNEXES DE CINQ CASES AU PLUS.
 *
 * On part d'une case libre et l'on fait grandir la zone en s'accrochant aux
 * cases VOISINES PAR UN CÔTÉ — pas en diagonale : une zone qui ne tient que
 * par un coin ne se lit pas comme une zone.
 *
 * LES ZONES D'UNE SEULE CASE SONT RECOLLÉES quand c'est possible : un « 1 »
 * tout seul donne sa réponse, et une grille qui en est pleine se remplit
 * d'elle-même.
 */
function decouperZones(rng, lignes, colonnes) {
    const zone = Array.from({ length: lignes }, () => Array(colonnes).fill(-1));
    const tailles = [];
    const cotes = (r, c) => [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
        .filter(([a, b]) => a >= 0 && b >= 0 && a < lignes && b < colonnes);

    for (let r = 0; r < lignes; r++) {
        for (let c = 0; c < colonnes; c++) {
            if (zone[r][c] !== -1) continue;
            const z = tailles.length;
            const but = rng.int(4, 5);
            const dedans = [[r, c]];
            zone[r][c] = z;
            while (dedans.length < but) {
                const bords = [];
                dedans.forEach(([a, b]) => cotes(a, b).forEach(([x, y]) => {
                    if (zone[x][y] === -1) bords.push([x, y]);
                }));
                if (!bords.length) break;
                const [x, y] = bords[rng.int(0, bords.length - 1)];
                zone[x][y] = z;
                dedans.push([x, y]);
            }
            tailles.push(dedans.length);
        }
    }
    // Les zones d'une case rejoignent la plus petite zone voisine qui peut
    // encore les accueillir.
    for (let r = 0; r < lignes; r++) {
        for (let c = 0; c < colonnes; c++) {
            const z = zone[r][c];
            if (tailles[z] !== 1) continue;
            const candidats = cotes(r, c)
                .map(([a, b]) => zone[a][b])
                .filter(v => v !== z && tailles[v] < 5)
                .sort((a, b) => tailles[a] - tailles[b]);
            if (!candidats.length) continue;
            zone[r][c] = candidats[0];
            tailles[candidats[0]]++;
            tailles[z] = 0;
        }
    }
    return { zone, tailles };
}

/**
 * REMPLIT LA GRILLE — ou rend `null` si cette découpe n'admet rien, OU si l'on
 * a cherché trop longtemps sans conclure.
 *
 * On avance dans l'ordre de lecture, et à chaque case on essaie les valeurs
 * encore libres dans sa zone, en écartant celles qui touchent une égale.
 *
 * ── C'EST ICI QUE LES SEPT SECONDES ÉTAIENT, ET LA MESURE A MIS DU TEMPS ────
 *
 * On a d'abord plafonné la PREUVE D'UNICITÉ, qui est l'endroit où une
 * explosion est plausible, et le chronomètre n'a pas bougé d'une
 * milliseconde : 35 s avant, 35 s après. La mesure suivante, graine par
 * graine, a nommé le coupable — la graine 4000 coûtait 26 743 ms à elle
 * seule, et toutes les grilles atteignaient pourtant leurs dix-huit cases
 * vides. Le plafond ne servait donc à rien : le temps partait AVANT.
 *
 * CERTAINES DÉCOUPES N'ADMETTENT AUCUNE SOLUTION — une zone de cinq cases en
 * croix, entourée d'une autre zone de cinq, ne laisse pas toujours de place.
 * Le démontrer demande d'épuiser tout l'arbre, et sur 6 × 6 cet arbre est
 * immense. Or on n'a aucun besoin de la démonstration : on veut seulement
 * savoir s'il faut redécouper. Au bout du plafond, on redécoupe.
 *
 * LA LEÇON, ET ELLE SE PAIE DEUX FOIS DANS CE FICHIER : **on plafonne la
 * recherche qui peut échouer, pas seulement celle qui peut réussir longtemps.**
 * Un `false` renvoyé après un arbre épuisé coûte exactement aussi cher qu'un
 * `true` cherché trop loin.
 */
function remplir(rng, lignes, colonnes, zone, tailles, plafond = PLAFOND_REMPLIR) {
    const g = Array.from({ length: lignes }, () => Array(colonnes).fill(0));
    const vus = tailles.map(() => new Set());
    const autour = voisinagesDe(lignes, colonnes);
    let noeuds = 0;
    const poser = (i) => {
        if (i === lignes * colonnes) return true;
        if (++noeuds > plafond) return false;
        const r = Math.floor(i / colonnes), c = i % colonnes;
        const z = zone[r][c];
        for (const v of rng.shuffle(Array.from({ length: tailles[z] }, (_, k) => k + 1))) {
            if (vus[z].has(v)) continue;
            const a = autour[r][c];
            let touche = false;
            for (let k = 0; k < a.length && !touche; k++) {
                if (g[a[k][0]][a[k][1]] === v) touche = true;
            }
            if (touche) continue;
            g[r][c] = v; vus[z].add(v);
            if (poser(i + 1)) return true;
            g[r][c] = 0; vus[z].delete(v);
            if (noeuds > plafond) return false;
        }
        return false;
    };
    return poser(0) ? g : null;
}

/**
 * LES VOISINAGES, UNE FOIS PAR FORMAT. Ils ne dépendent que de la taille de la
 * grille, et le compteur est appelé une fois par case effacée : les recalculer
 * à chaque appel, c'était trente-six fois trois cent vingt petits tableaux
 * alloués pour rien, par grille.
 */
const VOISINAGES = new Map();
function voisinagesDe(lignes, colonnes) {
    const cle = `${lignes}x${colonnes}`;
    let v = VOISINAGES.get(cle);
    if (!v) {
        v = Array.from({ length: lignes }, (_, r) =>
            Array.from({ length: colonnes }, (_, c) => voisins(r, c, lignes, colonnes)));
        VOISINAGES.set(cle, v);
    }
    return v;
}

/**
 * COMBIEN DE GRILLES COMPLÈTES RESPECTENT LES DEUX RÈGLES ? On s'arrête à
 * `limite`.
 *
 * ── CE QUI EST TENU À JOUR AU LIEU D'ÊTRE RECALCULÉ ─────────────────────────
 *
 * `occupe[z]` est un masque de bits : les nombres déjà posés dans la zone z.
 * `combien[r][c][v]` compte les VOISINS de (r, c) qui portent déjà v — et c'est
 * ce comptage qui remplace la boucle sur les huit voisins. Savoir si un nombre
 * est permis quelque part devient deux lectures au lieu de neuf.
 *
 * MESURÉ : la case la plus contrainte se cherche à chaque nœud, et la chercher
 * coûtait trente-six cases × cinq nombres × huit voisins, soit mille quatre
 * cent quarante consultations POUR UN SEUL COUP. C'est ce qui faisait tenir
 * une grille 6 × 6 en sept secondes.
 *
 * ── ET LE COMPTAGE EST PLAFONNÉ EN NŒUDS (`budget`) ─────────────────────────
 *
 * Mesuré : une grille 6 × 6 demandait **sept secondes**, les trois réglages de
 * difficulté confondus — donc le coût n'était pas dans ce qu'on efface mais
 * dans la preuve elle-même. En nœuds et non en millisecondes, pour la même
 * raison que partout ailleurs : une grille doit se refabriquer à l'identique
 * depuis sa graine, sur la tablette de l'élève comme ici.
 *
 * QUAND LE PLAFOND TOMBE, « une seule solution » veut dire « je n'ai pas fini
 * de chercher ». On le dit (`budget.epuise`) et l'appelant REMET la case qu'il
 * voulait effacer : une case de plus donnée rend la grille plus facile, jamais
 * fausse.
 */
export function compterSuguru(lignes, colonnes, zone, tailles, donnees, limite = 2,
    budget = null) {
    const bourse = budget || { noeuds: Infinity, epuise: false };
    const g = donnees.map(l => l.slice());
    const autour = voisinagesDe(lignes, colonnes);

    const occupe = tailles.map(() => 0);
    const combien = Array.from({ length: lignes }, () =>
        Array.from({ length: colonnes }, () => new Int8Array(7)));
    const mettre = (r, c, v, sens) => {
        if (sens > 0) occupe[zone[r][c]] |= 1 << v;
        else occupe[zone[r][c]] &= ~(1 << v);
        const a = autour[r][c];
        for (let k = 0; k < a.length; k++) combien[a[k][0]][a[k][1]][v] += sens;
    };
    for (let r = 0; r < lignes; r++) {
        for (let c = 0; c < colonnes; c++) if (g[r][c]) mettre(r, c, g[r][c], 1);
    }

    const peut = (r, c, v) => !(occupe[zone[r][c]] & (1 << v)) && combien[r][c][v] === 0;

    /**
     * LA CASE LA PLUS CONTRAINTE D'ABORD — celle à qui il reste le moins de
     * nombres possibles. C'est la même idée que « commence par les cases où un
     * seul chiffre est encore possible », appliquée à la machine.
     */
    const choisir = () => {
        let bestR = -1, bestC = -1, moins = 99;
        for (let r = 0; r < lignes; r++) {
            for (let c = 0; c < colonnes; c++) {
                if (g[r][c]) continue;
                const t = tailles[zone[r][c]];
                let n = 0;
                for (let v = 1; v <= t; v++) if (peut(r, c, v)) n++;
                if (n < moins) {
                    moins = n; bestR = r; bestC = c;
                    if (!n) return [r, c];
                }
            }
        }
        return bestR < 0 ? null : [bestR, bestC];
    };

    let trouvees = 0;
    const poser = (restantes) => {
        if (trouvees >= limite) return;
        if (--bourse.noeuds < 0) { bourse.epuise = true; return; }
        if (!restantes) { trouvees++; return; }
        const ou = choisir();
        if (!ou) { trouvees++; return; }
        const [r, c] = ou;
        const t = tailles[zone[r][c]];
        for (let v = 1; v <= t; v++) {
            if (!peut(r, c, v)) continue;
            g[r][c] = v; mettre(r, c, v, 1);
            poser(restantes - 1);
            g[r][c] = 0; mettre(r, c, v, -1);
            if (trouvees >= limite || bourse.epuise) return;
        }
    };
    let vides = 0;
    for (let r = 0; r < lignes; r++) for (let c = 0; c < colonnes; c++) if (!g[r][c]) vides++;
    poser(vides);
    return trouvees;
}

export const suguruGenerator = {
    id: 'logique.suguru',
    label: 'Suguru',
    skills: [SKILL],
    answerKinds: ['grid'],
    params: [
        {
            id: 'format', type: 'select', label: 'Taille de la grille', default: 'petit',
            options: Object.entries(FORMATS).map(([value, f]) => ({ value, label: f.nom }))
        },
        {
            id: 'difficulte', type: 'select', label: 'Difficulté', default: 'facile',
            aide: 'Elle change le nombre de cases déjà écrites. En facile, la moitié de la '
                + 'grille est donnée.',
            options: [
                { value: 'facile', label: 'Facile — la moitié des cases est donnée' },
                { value: 'moyen', label: 'Moyen' },
                { value: 'difficile', label: 'Difficile' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const f = FORMATS[p.format] || FORMATS.petit;
        const { lignes, colonnes } = f;
        const part = VIDES[p.difficulte] || VIDES.facile;

        let zone = null, tailles = null, sol = null;
        for (let essai = 0; essai < 40 && !sol; essai++) {
            const d = decouperZones(rng, lignes, colonnes);
            const g = remplir(rng, lignes, colonnes, d.zone, d.tailles);
            if (g) { zone = d.zone; tailles = d.tailles; sol = g; }
        }
        if (!sol) {
            // Filet : des bandes horizontales de cinq, qui se remplissent
            // toujours. Moins joli, jamais impossible.
            zone = Array.from({ length: lignes }, (_, r) =>
                Array.from({ length: colonnes }, (_, c) => r * colonnes + Math.floor(c / 5)));
            const max = lignes * Math.ceil(colonnes / 5);
            tailles = Array.from({ length: max }, (_, k) => {
                const reste = colonnes - (k % Math.ceil(colonnes / 5)) * 5;
                return Math.min(5, reste);
            });
            sol = remplir(rng, lignes, colonnes, zone, tailles)
                || Array.from({ length: lignes }, (_, r) =>
                    Array.from({ length: colonnes }, (_, c) => (c % 5) + 1));
        }

        // ON EFFACE TANT QUE LA SOLUTION RESTE UNIQUE.
        //
        // UNE SEULE BOURSE POUR TOUTE LA SÉRIE D'EFFACEMENTS : trente-six
        // preuves plafonnées chacune ne borneraient rien. Et s'arrêter tôt est
        // SANS DANGER ICI, contrairement au Kakuro : on garde simplement une
        // case de plus écrite, ce qui rend la grille plus facile — jamais
        // fausse, puisque chaque effacement retenu a été prouvé jusqu'au bout.
        const donnees = sol.map(l => l.slice());
        const ordre = rng.shuffle(Array.from({ length: lignes * colonnes }, (_, i) => i));
        const but = Math.round(lignes * colonnes * part);
        const bourse = { noeuds: PLAFOND_NOEUDS, epuise: false };
        let effacees = 0;
        for (const i of ordre) {
            if (effacees >= but || bourse.epuise) break;
            const r = Math.floor(i / colonnes), c = i % colonnes;
            const garde = donnees[r][c];
            donnees[r][c] = 0;
            const n = compterSuguru(lignes, colonnes, zone, tailles, donnees, 2, bourse);
            // UNE PREUVE INTERROMPUE N'EST PAS UNE PREUVE : si la bourse s'est
            // vidée en chemin, « une solution » veut dire « je n'ai pas fini de
            // chercher », donc peut-être deux. On remet la case.
            if (n === 1 && !bourse.epuise) effacees++;
            else donnees[r][c] = garde;
        }

        const cases = [];
        for (let r = 0; r < lignes; r++) {
            for (let c = 0; c < colonnes; c++) {
                cases.push(donnees[r][c]
                    ? { r, c, type: 'donnee', valeur: donnees[r][c], zone: zone[r][c] }
                    : { r, c, type: 'vide', zone: zone[r][c] });
            }
        }

        const maxZone = Math.max(...tailles.filter(Boolean));
        const consigne = 'Une zone de n cases contient les nombres de 1 à n. '
            + 'Deux nombres égaux ne se touchent jamais, même en diagonale.';

        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.suguru',
            skillId: SKILL,
            answerKind: 'grid',
            prompt: {
                text: consigne, papier: consigne,
                html: `<div class="game-question gn-consigne">${consigne}</div>`
            },
            answer: 'g' + sol.map(l => l.join(',')).join('/'),
            hints: [
                'Commence par les zones les plus PETITES : une zone de deux cases ne contient '
                    + 'que 1 et 2, il n\'y a que deux façons de les poser.',
                'Un nombre interdit les HUIT cases autour de lui, diagonales comprises. '
                    + 'Repère un 1 déjà posé : aucune des huit cases voisines n\'en portera.',
                'Quand il ne reste qu\'une place possible pour un nombre dans sa zone, c\'est là.'
            ],
            explanation: `Chaque zone porte les nombres de 1 à sa taille (ici jusqu'à `
                + `${maxZone}), et deux égaux ne se touchent jamais.`,
            difficulty: DIFFICULTE_ITEM[p.difficulte] || 1,
            meta: {
                lignes, colonnes, cases, solution: sol,
                chiffres: { min: 1, max: maxZone },
                zones: true,
                titreCourt: 'Suguru',
                texteLecon: 'Une zone de n cases contient 1 à n, et deux égaux ne se touchent pas.'
            }
        });
    }
};

export default suguruGenerator;
