// LE YOHAKU — une grille, ses totaux en marge, et rien d'autre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 26 octobre : « tu me les fais tous, avec des grilles faciles ».
//
// LA RÈGLE : chaque ligne et chaque colonne porte, en marge, sa SOMME (ou son
// PRODUIT). On écrit un chiffre de 1 à 9 dans chaque case vide pour que tous
// les totaux tombent juste. Les chiffres peuvent se répéter — ce n'est pas un
// sudoku.
//
// ── POURQUOI C'EST LE MEILLEUR RAPPORT MATHÉMATIQUES / EFFORT ───────────────
//
// La version MULTIPLICATIVE est une machine à factoriser : une ligne qui fait
// 36 et une colonne qui fait 24 n'ont qu'une poignée de solutions communes, et
// pour les trouver il faut décomposer les deux. Neuf cases, dix minutes de
// calcul mental dense, et aucune règle à apprendre.
//
// LA VERSION ADDITIVE est du calcul mental pur — compléments, soustractions
// en chaîne — et c'est elle qu'on donne par défaut : « des grilles faciles ».
//
// ── COMMENT ON FABRIQUE UNE GRILLE ──────────────────────────────────────────
//
// À L'ENVERS, comme toujours : on tire les chiffres, on CALCULE les totaux,
// puis on efface des cases. Partir des totaux demanderait de résoudre le
// problème ; partir de la grille le donne.
//
// ET L'ON VÉRIFIE L'UNICITÉ en comptant les solutions, ligne par ligne : pour
// chaque rangée on énumère ce qui peut tenir dans ses cases vides, et l'on
// élague dès qu'une colonne dépasse son total. Sans cela, une grille à deux
// solutions compterait faux un élève qui a raison.

import { makeItem } from '../items.js';

const SKILL = 'num.logique.yohaku';

/** Les deux opérations, et ce qu'elles font d'une rangée. */
const OPS = {
    somme: {
        mot: 'somme', signe: '+',
        total: (v) => v.reduce((a, b) => a + b, 0),
        // Pour élaguer : avec `restantes` cases encore vides, le total partiel
        // ne peut plus descendre en dessous de `partiel + restantes`, ni
        // monter au-dessus de `partiel + 9 × restantes`.
        // L'ÉLAGAGE N'A PAS BESOIN D'ÊTRE FIN POUR ÊTRE UTILE : il suffit
        // qu'il coupe tôt. Les bornes sont celles de n'importe quelle rangée
        // de nombres positifs d'au plus `plafond`.
        possible: (partiel, restantes, cible, plafond) =>
            partiel + restantes <= cible && partiel + plafond * restantes >= cible
    },
    produit: {
        mot: 'produit', signe: '×',
        total: (v) => v.reduce((a, b) => a * b, 1),
        possible: (partiel, restantes, cible, plafond) =>
            cible % partiel === 0 && partiel <= cible && partiel * plafond ** restantes >= cible
    }
};

/**
 * LES TAILLES. Trois sur trois est le format du jeu publié, et c'est déjà
 * assez : neuf cases, six totaux, et de quoi occuper dix minutes. Quatre sur
 * quatre existe pour ceux qui redemandent.
 */
export const FORMATS = {
    petit: { n: 3, nom: 'Petite — 3 × 3' },
    grand: { n: 4, nom: 'Grande — 4 × 4' }
};

/**
 * LA DIFFICULTÉ EST LE NOMBRE DE CASES VIDES, et rien d'autre.
 *
 * « Des grilles faciles », a-t-il demandé : le défaut laisse donc la moitié
 * des cases écrites. Une grille entièrement vide — le Yohaku publié — reste
 * au bout du réglage, pour ceux qui y arrivent.
 */
const VIDES = { facile: 0.45, moyen: 0.7, difficile: 1 };

const DIFFICULTE_ITEM = { facile: 1, moyen: 2, difficile: 3 };

/**
 * COMPTE LES GRILLES QUI SATISFONT TOUS LES TOTAUX. On s'arrête à `limite`.
 *
 * Rangée par rangée, en élaguant sur les colonnes : dès qu'une colonne a
 * dépassé son total, toute la branche est morte. C'est ce qui fait tenir le
 * compte en quelques millisecondes là où l'énumération brute des 9⁹ grilles
 * d'un 3 × 3 vide mettrait des minutes.
 */
export function compterGrilles(n, donnees, lignes, colonnes, op, limite = 2) {
    const O = OPS[op];
    const neutre = op === 'produit' ? 1 : 0;
    let trouvees = 0;
    const grille = donnees.map(l => l.slice());
    // CHAQUE NOMBRE DE 1 À n² UNE SEULE FOIS — c'est la règle du jeu publié,
    // et c'est elle qui rend une grille ENTIÈREMENT VIDE résoluble.
    //
    // MESURÉ SANS ELLE : sur un 3 × 3 où les chiffres peuvent se répéter, six
    // totaux pour neuf inconnues laissent une famille de solutions, et le
    // creusement s'arrêtait à UNE case vide. Une grille à une case vide n'est
    // pas un jeu.
    const haut = n * n;
    const pris = new Array(haut + 1).fill(false);
    donnees.flat().forEach(v => { if (v) pris[v] = true; });

    const parColonne = (c, jusqua) => {
        let v = neutre, vides = 0;
        for (let r = 0; r < jusqua; r++) {
            if (grille[r][c]) v = op === 'produit' ? v * grille[r][c] : v + grille[r][c];
            else vides++;
        }
        return { v, vides: vides + (n - jusqua) };
    };

    const rangee = (r) => {
        if (trouvees >= limite) return;
        if (r === n) { trouvees++; return; }
        const libres = [];
        for (let c = 0; c < n; c++) if (!donnees[r][c]) libres.push(c);
        // LA CIBLE EST CE QU'IL RESTE À ATTEINDRE, pas le total de la rangée.
        //
        // Le premier jet comparait la somme des cases LIBRES au total de la
        // ligne entière, cases données comprises : aucune branche ne tombait
        // juste, le compteur rendait zéro solution, et le creusement refusait
        // donc d'effacer la moindre case. Mesuré : zéro case vide sur les
        // quatre réglages — une grille déjà remplie.
        let fixe = neutre;
        for (let c = 0; c < n; c++) {
            if (donnees[r][c]) fixe = op === 'produit' ? fixe * donnees[r][c] : fixe + donnees[r][c];
        }
        const cible = op === 'produit'
            ? (lignes[r] % fixe ? -1 : lignes[r] / fixe)
            : lignes[r] - fixe;
        if (cible < 0) return;

        const poser = (k, partiel) => {
            if (trouvees >= limite) return;
            if (k === libres.length) {
                if (partiel !== cible) return;
                // La rangée est complète : les colonnes ont-elles encore une
                // chance ?
                for (let c = 0; c < n; c++) {
                    const { v, vides } = parColonne(c, r + 1);
                    if (!O.possible(v, vides, colonnes[c], haut)) return;
                    if (!vides && v !== colonnes[c]) return;
                }
                rangee(r + 1);
                return;
            }
            if (!O.possible(partiel, libres.length - k, cible, haut)) return;
            const c = libres[k];
            for (let v = 1; v <= haut; v++) {
                if (pris[v]) continue;
                grille[r][c] = v; pris[v] = true;
                poser(k + 1, op === 'produit' ? partiel * v : partiel + v);
                grille[r][c] = 0; pris[v] = false;
                if (trouvees >= limite) break;
            }
        };
        // Une rangée sans case vide doit déjà tomber juste.
        if (!libres.length) {
            if (fixe !== lignes[r]) return;
            for (let c = 0; c < n; c++) {
                const { v, vides } = parColonne(c, r + 1);
                if (!O.possible(v, vides, colonnes[c], haut)) return;
                if (!vides && v !== colonnes[c]) return;
            }
            rangee(r + 1);
            return;
        }
        poser(0, neutre);
    };
    rangee(0);
    return trouvees;
}

export const yohakuGenerator = {
    id: 'logique.yohaku',
    label: 'Yohaku',
    skills: [SKILL],
    answerKinds: ['grid'],
    params: [
        {
            // LE PRODUIT N'EXISTE QU'EN 3 × 3 : avec les nombres de 1 à 16,
            // une rangée de quatre dépasse le millier, et plus personne ne
            // décompose de tête.
            id: 'operation', type: 'select', label: 'Opération', default: 'somme',
            aide: 'En somme, c\'est du calcul mental. En produit, il faut décomposer chaque '
                + 'total en facteurs — c\'est bien plus difficile.',
            options: [
                { value: 'somme', label: 'Sommes (+)' },
                { value: 'produit', label: 'Produits (×)' }
            ]
        },
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
                { value: 'difficile', label: 'Difficile — grille entièrement vide' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const n = (FORMATS[p.format] || FORMATS.petit).n;
        const op = (OPS[p.operation] && n === 3) ? p.operation : 'somme';
        const O = OPS[op];
        const part = VIDES[p.difficulte] || VIDES.facile;

        // LES NOMBRES VONT DE 1 À n², CHACUN UNE SEULE FOIS. C'est la règle
        // du jeu publié, et c'est elle qui rend la grille entièrement vide
        // résoluble : neuf inconnues, six totaux, et l'interdiction de
        // répéter — c'est cette dernière qui ferme les solutions parasites.
        const haut = n * n;

        let sol = null, vide = null;
        for (let essai = 0; essai < 60 && !sol; essai++) {
            const sac = rng.shuffle(Array.from({ length: haut }, (_, i) => i + 1));
            const g = Array.from({ length: n }, (_, r) => sac.slice(r * n, (r + 1) * n));
            const lignes = g.map(l => O.total(l));
            const colonnes = Array.from({ length: n }, (_, c) => O.total(g.map(l => l[c])));

            // ON EFFACE DANS UN ORDRE TIRÉ, et l'on garde chaque effacement
            // tant que la grille reste à solution unique. C'est la façon
            // habituelle de creuser un sudoku, et elle vaut ici.
            const ordre = rng.shuffle(Array.from({ length: n * n }, (_, i) => i));
            const combien = Math.max(1, Math.round(n * n * part));
            const donnees = g.map(l => l.slice());
            let effacees = 0;
            for (const i of ordre) {
                if (effacees >= combien) break;
                const r = Math.floor(i / n), c = i % n;
                const garde = donnees[r][c];
                donnees[r][c] = 0;
                if (compterGrilles(n, donnees, lignes, colonnes, op, 2) === 1) effacees++;
                else donnees[r][c] = garde;
            }
            // ON GARDE LA MEILLEURE GRILLE VUE, pas la première qui passe un
            // seuil : le seuil rejetait des grilles parfaitement jouables, et
            // l'on retombait sur le filet à une seule case vide.
            if (!sol || effacees > sol.effacees) {
                sol = { g, lignes, colonnes, effacees };
                vide = donnees;
            }
            if (effacees >= combien) break;
        }
        if (!sol) {
            // Filet : une grille où l'on n'efface qu'une case est toujours
            // unique, et toujours jouable.
            const sac = rng.shuffle(Array.from({ length: haut }, (_, i) => i + 1));
            const g = Array.from({ length: n }, (_, r) => sac.slice(r * n, (r + 1) * n));
            sol = {
                g,
                lignes: g.map(l => O.total(l)),
                colonnes: Array.from({ length: n }, (_, c) => O.total(g.map(l => l[c])))
            };
            vide = g.map(l => l.slice());
            vide[0][0] = 0;
        }

        const cases = [];
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                cases.push(vide[r][c]
                    ? { r, c, type: 'donnee', valeur: vide[r][c] }
                    : { r, c, type: 'vide' });
            }
        }

        const consigne = `Écris un chiffre dans chaque case vide pour que chaque ligne et `
            + `chaque colonne donne le ${O.mot} écrit en marge.`;

        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.yohaku',
            skillId: SKILL,
            answerKind: 'grid',
            prompt: {
                text: consigne, papier: consigne,
                html: `<div class="game-question gn-consigne">${consigne}</div>`
            },
            answer: 'g' + sol.g.map(l => l.join(',')).join('/'),
            hints: [
                `Commence par la ligne ou la colonne où il ne manque qu'UNE case : son `
                    + `${O.mot} donne le chiffre d'un coup.`,
                op === 'produit'
                    ? 'Décompose le total en facteurs. Un total impair interdit tous les '
                        + 'chiffres pairs dans sa rangée : c\'est souvent le meilleur départ.'
                    : 'Une rangée dont le total est petit ne peut contenir que de petits '
                        + 'chiffres — et chaque case vaut au moins 1.',
                'Chaque case appartient à une ligne ET à une colonne : ce qu\'une rangée '
                    + 'autorise, l\'autre l\'interdit souvent.'
            ],
            explanation: `Chaque ligne et chaque colonne donne le ${O.mot} écrit en marge.`,
            difficulty: (DIFFICULTE_ITEM[p.difficulte] || 1) + (op === 'produit' ? 1 : 0),
            meta: {
                lignes: n, colonnes: n, cases,
                solution: sol.g,
                chiffres: { min: 1, max: haut },
                // LES TOTAUX SE LISENT À DROITE ET EN BAS, comme sur les
                // grilles publiées : on lit la ligne puis son total, dans le
                // sens de la lecture.
                marges: { droite: sol.lignes, bas: sol.colonnes },
                titreCourt: 'Yohaku',
                operation: op, totauxLignes: sol.lignes, totauxColonnes: sol.colonnes,
                texteLecon: `Chaque rangée donne le ${O.mot} écrit en marge.`
            }
        });
    }
};

export default yohakuGenerator;
