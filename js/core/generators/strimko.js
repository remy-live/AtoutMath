// LE STRIMKO — un carré latin dont les régions sont des RUISSEAUX.
//
// RÉMY : « tu me fais le jeu strimko ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LA RÈGLE TIENT EN UNE LIGNE, ET C'EST CE QUI EN FAIT UN BON EXERCICE : chaque
// LIGNE, chaque COLONNE et chaque RUISSEAU portent les nombres de 1 à n, une
// fois chacun. Un ruisseau est une chaîne de cases qui se touchent — on la suit
// du doigt comme un cours d'eau, d'où le nom.
//
// CE QU'IL APPORTE ET QUE LE MATHDOKU N'A PAS. Le Mathdoku demande de calculer
// AVANT de déduire : une cage « 12× » occupe la tête pendant qu'on cherche où
// la poser. Le Strimko ne demande AUCUN calcul — il ne reste que la déduction,
// toute nue. C'est l'exercice de raisonnement le plus dépouillé qu'on puisse
// poser à un sixième, et c'est pour cela qu'il marche aussi bien avec ceux que
// le calcul encombre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LES TROIS CHOSES QUI PEUVENT RATER DANS UN GÉNÉRATEUR DE CE GENRE, et que ce
// fichier garde :
//
//   · UNE GRILLE À PLUSIEURS SOLUTIONS. L'élève en trouve une, le logiciel la
//     refuse. C'est le défaut qui fait abandonner un exercice pour de bon, et
//     il ne se voit qu'en comptant les solutions — jamais à l'œil.
//   · UN RUISSEAU QUI N'EN EST PAS. S'il n'est pas d'un seul tenant, on ne peut
//     pas le suivre du doigt, et le dessin ment sur la règle.
//   · UN RUISSEAU QUI PORTE DEUX FOIS LE MÊME NOMBRE. La grille n'a alors
//     aucune solution, et l'élève cherche une faute qui n'est pas la sienne.

import { makeItem } from '../items.js';

/**
 * UN CARRÉ LATIN TIRÉ AU SORT.
 *
 * Remplissage case par case avec retour en arrière : les valeurs sont
 * mélangées à chaque case, ce qui suffit à rendre le carré imprévisible sans
 * avoir à écrire un générateur savant.
 */
export function carreLatin(rng, n) {
    const g = Array.from({ length: n }, () => Array(n).fill(0));
    const lignes = Array.from({ length: n }, () => new Set());
    const colonnes = Array.from({ length: n }, () => new Set());
    const valeurs = Array.from({ length: n }, (_, k) => k + 1);

    const remplir = (i) => {
        if (i === n * n) return true;
        const r = Math.floor(i / n), c = i % n;
        for (const v of rng.shuffle(valeurs)) {
            if (lignes[r].has(v) || colonnes[c].has(v)) continue;
            g[r][c] = v; lignes[r].add(v); colonnes[c].add(v);
            if (remplir(i + 1)) return true;
            lignes[r].delete(v); colonnes[c].delete(v);
        }
        return false;
    };
    remplir(0);
    return g;
}

const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];

/**
 * DÉCOUPER LA GRILLE EN n RUISSEAUX DE n CASES.
 *
 * UN RUISSEAU EST UN CHEMIN, pas une tache. C'est ce qui permet de le dessiner
 * comme une chaîne de perles reliées, et donc de le SUIVRE : une région en
 * forme de L épais se regarde, une chaîne se parcourt. On fait donc croître
 * chaque ruisseau case par case, chacune voisine de la précédente.
 *
 * ET CHAQUE RUISSEAU PORTE n VALEURS DIFFÉRENTES, ce qui est la contrainte
 * qu'on ajoute au carré latin. On ne la vérifie pas après coup : on refuse
 * d'entrer dans une case dont la valeur est déjà dans le ruisseau, ce qui est
 * la même chose et évite de jeter des découpes entières.
 *
 * MESURÉ sur 200 grilles par taille, avant d'écrire la suite : réussi 200 fois
 * sur 200 de 4×4 à 7×7, en 773 pas au pire pour un 7×7. Le budget ci-dessous
 * est donc une sécurité, pas un plan B qu'on emprunte.
 *
 * @returns {Array<Array<{r:number,c:number}>>|null} les n chemins, ou `null`
 */
export function decouperEnRuisseaux(rng, n, solution, budget = 200000) {
    const pris = Array.from({ length: n }, () => Array(n).fill(false));
    const ruisseaux = [];
    let pas = 0;

    const premiereLibre = () => {
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) if (!pris[r][c]) return { r, c };
        }
        return null;
    };

    const grandir = (chemin, vues) => {
        if (++pas > budget) return false;
        if (chemin.length === n) { ruisseaux.push([...chemin]); return poser(); }
        const { r, c } = chemin[chemin.length - 1];
        for (const [dr, dc] of rng.shuffle(DIRS)) {
            const nr = r + dr, nc = c + dc;
            if (nr < 0 || nc < 0 || nr >= n || nc >= n || pris[nr][nc]) continue;
            const v = solution[nr][nc];
            if (vues.has(v)) continue;
            pris[nr][nc] = true; vues.add(v); chemin.push({ r: nr, c: nc });
            if (grandir(chemin, vues)) return true;
            chemin.pop(); vues.delete(v); pris[nr][nc] = false;
        }
        return false;
    };

    // ON PART TOUJOURS DE LA PREMIÈRE CASE LIBRE, dans l'ordre de lecture. Un
    // départ tiré au sort laisse des trous isolés qu'aucun chemin ne peut plus
    // atteindre, et le retour en arrière passe son temps à les redécouvrir.
    const poser = () => {
        const depart = premiereLibre();
        if (!depart) return true;
        pris[depart.r][depart.c] = true;
        const ok = grandir([depart], new Set([solution[depart.r][depart.c]]));
        if (!ok) { pris[depart.r][depart.c] = false; ruisseaux.pop(); }
        return ok;
    };

    return poser() ? ruisseaux : null;
}

/** Pour chaque case, le numéro de son ruisseau. */
export function carteDesRuisseaux(n, ruisseaux) {
    const carte = Array.from({ length: n }, () => Array(n).fill(-1));
    ruisseaux.forEach((ruisseau, i) => ruisseau.forEach(p => { carte[p.r][p.c] = i; }));
    return carte;
}

/**
 * COMBIEN DE SOLUTIONS, jusqu'à `limite` — et pas une de plus.
 *
 * ON S'ARRÊTE À DEUX, parce que c'est tout ce qu'on a besoin de savoir : une
 * grille à deux solutions est à jeter, qu'elle en ait deux ou deux cents.
 * Compter jusqu'au bout coûterait des minutes pour une information qu'on
 * n'utilise pas.
 *
 * LA CASE LA PLUS CONTRAINTE D'ABORD. Sans ce choix, un 7×7 à cinq indices
 * explore des millions de branches ; avec lui, quelques milliers.
 *
 * UNE LISTE DE RUISSEAUX VIDE COMPTE SANS EUX, et ce n'est pas une curiosité :
 * c'est le seul moyen de répondre à la question qui décide si ce jeu en est un
 * — « cette grille se résout-elle en IGNORANT les ruisseaux ? ». Si oui, ce
 * n'est pas un Strimko, c'est un sudoku à décor coloré. Voir l'épreuve
 * « LE RUISSEAU SERT VRAIMENT ».
 */
export function compterSolutions(n, ruisseaux, donnees, limite = 2) {
    const carte = carteDesRuisseaux(n, ruisseaux);
    const g = Array.from({ length: n }, () => Array(n).fill(0));
    const lignes = Array.from({ length: n }, () => new Set());
    const colonnes = Array.from({ length: n }, () => new Set());
    const cours = Array.from({ length: n }, () => new Set());

    // `carte[r][c]` vaut -1 quand la case n'a pas de ruisseau — ce qui arrive
    // si l'on passe une liste vide, exprès, pour compter sans eux.
    const cour = (r, c) => (carte[r][c] >= 0 ? cours[carte[r][c]] : null);

    for (const d of donnees) {
        const v = d.v;
        const k = cour(d.r, d.c);
        if (lignes[d.r].has(v) || colonnes[d.c].has(v) || (k && k.has(v))) return 0;
        g[d.r][d.c] = v;
        lignes[d.r].add(v); colonnes[d.c].add(v); if (k) k.add(v);
    }

    let trouvees = 0;
    const possibles = (r, c) => {
        const out = [];
        const k = cour(r, c);
        for (let v = 1; v <= n; v++) {
            if (!lignes[r].has(v) && !colonnes[c].has(v) && !(k && k.has(v))) out.push(v);
        }
        return out;
    };

    const resoudre = () => {
        let meilleure = null, choix = null;
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                if (g[r][c]) continue;
                const p = possibles(r, c);
                if (!p.length) return;                       // impasse
                if (!choix || p.length < choix.length) { meilleure = { r, c }; choix = p; }
                if (p.length === 1) break;
            }
        }
        if (!meilleure) { trouvees++; return; }
        for (const v of choix) {
            const { r, c } = meilleure;
            const k = cour(r, c);
            g[r][c] = v;
            lignes[r].add(v); colonnes[c].add(v); if (k) k.add(v);
            resoudre();
            g[r][c] = 0;
            lignes[r].delete(v); colonnes[c].delete(v); if (k) k.delete(v);
            if (trouvees >= limite) return;
        }
    };
    resoudre();
    return trouvees;
}

/**
 * SE FINIT-ELLE SANS JAMAIS ESSAYER ?
 *
 * On remplit les cases qui n'ont qu'UN candidat, et l'on recommence tant qu'il
 * y en a. Si la grille se termine ainsi, elle se résout par la seule phrase
 * qu'on enseigne — « barre ce qui est déjà dans la ligne, la colonne et le
 * ruisseau ; s'il ne reste qu'un nombre, il est forcé ». Sinon, il faut
 * raisonner par l'absurde ou essayer, ce qui est un autre exercice.
 *
 * C'EST LE VRAI LEVIER DE FACILITÉ, et il a remplacé le mauvais. J'avais fait
 * du palier « découverte » une grille PLUS AIDÉE — six indices au lieu de
 * quatre. Mesuré : avec six indices sur un 4 × 4, les lignes et les colonnes
 * suffisent presque toujours, et le ruisseau ne sert jamais. Le palier censé
 * faire COMPRENDRE la règle était précisément celui où elle ne servait pas.
 */
export function resoluParSingletons(n, ruisseaux, donnees) {
    const carte = carteDesRuisseaux(n, ruisseaux);
    const g = Array.from({ length: n }, () => Array(n).fill(0));
    for (const d of donnees) g[d.r][d.c] = d.v;

    let bouge = true, restantes = n * n - donnees.length;
    while (bouge && restantes > 0) {
        bouge = false;
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                if (g[r][c]) continue;
                const possibles = [];
                for (let v = 1; v <= n; v++) {
                    let pris = false;
                    for (let k = 0; k < n && !pris; k++) {
                        if (g[r][k] === v || g[k][c] === v) pris = true;
                    }
                    if (!pris && carte[r][c] >= 0) {
                        for (const p of ruisseaux[carte[r][c]]) {
                            if (g[p.r][p.c] === v) { pris = true; break; }
                        }
                    }
                    if (!pris) possibles.push(v);
                }
                if (possibles.length === 1) { g[r][c] = possibles[0]; restantes--; bouge = true; }
            }
        }
    }
    return restantes === 0;
}

/**
 * LES INDICES : on part de la grille PLEINE et l'on retire tant que ça tient.
 *
 * C'est l'inverse qu'on écrit d'instinct — poser des indices jusqu'à ce que ce
 * soit unique — et c'est un piège : rien ne garantit qu'on y arrive, et l'on
 * s'arrête alors sur une grille à deux solutions sans le savoir. En partant du
 * plein, la grille est unique À CHAQUE INSTANT, et l'on ne descend que d'un
 * cran à la fois. S'arrêter n'importe quand reste donc correct.
 *
 * `garder` est un PLANCHER, pas une cible atteinte : on s'arrête d'y descendre
 * si l'on y arrive, mais on ne descend jamais en dessous de ce que l'unicité
 * permet. MESURÉ : un 4 × 4 tombe à 4,2 indices en moyenne, un 5 × 5 à 6,8, un
 * 6 × 6 à 10,1 — le plancher ne mord donc que sur « découverte », qui demande
 * d'en garder SIX sur un 4 × 4, c'est-à-dire d'aider.
 */
export function choisirLesIndices(rng, n, solution, ruisseaux, garder,
    { essais = 24, sansEssai = false } = {}) {
    const cases = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) cases.push({ r, c, v: solution[r][c] });

    // ON TIRE PLUSIEURS JEUX D'INDICES, ET L'ON GARDE CELUI QUI EST UN STRIMKO.
    //
    // CE QUE J'AI FAILLI LIVRER : des grilles parfaitement valides, uniques,
    // et RÉSOLUBLES SANS JAMAIS REGARDER LES RUISSEAUX — c'est-à-dire des
    // sudokus à décor coloré. `epreuveTombe.mjs` l'a révélé en refusant une
    // épreuve : en retirant la contrainte de ruisseau DU SOLVEUR, rien ne
    // tombait. J'ai alors compté, et c'était massif : 23 grilles sur 25 au
    // palier découverte, 9 ou 10 sur 25 ailleurs.
    //
    // La cause tient en une ligne : le retrait d'indices ne vérifiait l'unicité
    // qu'AVEC les ruisseaux, donc il s'arrêtait volontiers sur un jeu qui était
    // déjà unique sans eux. Une seconde mesure suffit à trancher — compter les
    // solutions en passant une liste de ruisseaux VIDE — et il n'y a plus qu'à
    // retirer dans un autre ordre quand le premier essai donne un sudoku.
    let meilleur = null;
    for (let essai = 0; essai < essais; essai++) {
        const jeu = retirerTantQuePossible(rng, n, cases, ruisseaux, garder);
        // VRAIMENT UN STRIMKO : sans les ruisseaux, la grille est ambiguë. Donc
        // il FAUT s'en servir pour la finir.
        const vraiStrimko = compterSolutions(n, [], jeu, 2) > 1;
        // ET, QUAND ON LE DEMANDE, QUI SE FINIT SANS JAMAIS ESSAYER.
        const assezDoux = !sansEssai || resoluParSingletons(n, ruisseaux, jeu);
        if (vraiStrimko && assezDoux) return jeu;
        if (!meilleur || jeu.length < meilleur.length) meilleur = jeu;
    }
    // AUCUN ESSAI N'Y EST ARRIVÉ : on rend le plus maigre plutôt que rien. Ça
    // reste une grille juste et solvable — seulement, le ruisseau n'y aura pas
    // servi. Mieux vaut ça qu'un écran vide, et l'épreuve dit quelle part de
    // grilles se trouve dans ce cas.
    return meilleur;
}

/** Une passe de retrait, dans un ordre tiré au sort. */
function retirerTantQuePossible(rng, n, cases, ruisseaux, garder) {
    let donnees = [...cases];

    // UNE SEULE PASSE SUFFIT, ET JE L'AI MESURÉ APRÈS AVOIR ÉCRIT LE CONTRAIRE.
    //
    // J'avais mis une boucle « tant que ça descend », avec un raisonnement qui
    // se tient : retirer une case devrait en rendre d'autres retirables,
    // puisqu'elles ne portent plus l'unicité à deux. Les chiffres disent non —
    // sur 90 grilles de 4 × 4, 5 × 5 et 6 × 6, une seconde passe n'a JAMAIS
    // retiré quoi que ce soit, et les moyennes sont identiques au dixième près
    // (4,2 · 6,8 · 10,1).
    //
    // On ne garde donc pas la boucle : une ligne qui ne fait rien coûte la
    // confiance qu'on met dans les autres. On garde la mesure, pour que
    // personne — moi compris — ne la réécrive dans six mois.
    for (const cible of rng.shuffle(cases)) {
        if (donnees.length <= garder) break;
        const sans = donnees.filter(d => !(d.r === cible.r && d.c === cible.c));
        if (compterSolutions(n, ruisseaux, sans, 2) === 1) donnees = sans;
    }
    return donnees.sort((a, b) => (a.r - b.r) || (a.c - b.c));
}

/**
 * LES PALIERS.
 *
 * LA TAILLE EST LE PREMIER LEVIER, et le plus honnête : un 4×4 se tient dans la
 * tête, un 7×7 demande de noter. Le second est le nombre d'indices laissés —
 * `garder` est une CIBLE, pas une promesse : on ne descend jamais en dessous de
 * ce qui garde la solution unique, donc une grille peut en donner un ou deux de
 * plus. C'est le bon côté sur lequel se tromper.
 */
export const PALIERS = {
    'decouverte': {
        n: 4, garder: 3, sansEssai: true,
        label: '4 × 4 — se finit sans jamais essayer'
    },
    'facile': { n: 4, garder: 3, label: '4 × 4' },
    'moyen': { n: 5, garder: 4, label: '5 × 5' },
    'difficile': { n: 6, garder: 5, label: '6 × 6' },
    'expert': { n: 7, garder: 6, label: '7 × 7 — il faut noter les possibles' }
};

export const strimkoGenerator = {
    id: 'logique.strimko',
    label: 'Strimko',
    skills: ['num.logique.strimko'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'palier', type: 'select', label: 'La taille de la grille', default: 'facile',
            aide: 'Aucun calcul : seulement de la déduction. Chaque ligne, chaque colonne et '
                + 'chaque ruisseau portent les nombres une fois chacun.',
            options: Object.entries(PALIERS).map(([value, p]) => ({ value, label: p.label }))
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const P = PALIERS[(params || {}).palier] || PALIERS.facile;
        const n = P.n;

        // ON REDESSINE TOUTE LA GRILLE, ET PAS SEULEMENT L'ORDRE DE RETRAIT.
        //
        // `choisirLesIndices` essaie déjà plusieurs ordres de retrait pour
        // tomber sur un jeu d'indices où le ruisseau est INDISPENSABLE. Mesuré,
        // ça ne suffisait pas : 60 à 77 % seulement. La raison est que le
        // ruisseau sert ou ne sert pas selon le COUPLE (carré latin, découpe) —
        // pour certains couples, aucun ordre de retrait n'y change rien, et
        // l'on s'épuise à rebattre les cartes d'une main perdante.
        //
        // On rejoue donc la main entière : nouveau carré, nouvelle découpe,
        // nouveaux indices. Et l'on garde le premier vrai Strimko.
        //
        // (Le même tour de boucle couvre l'échec de découpage, qui est rare —
        // mesuré : jamais sur huit cents essais. Un autre carré latin vaut
        // mieux qu'une découpe rapiécée qui ne serait plus un chemin.)
        let solution = null, ruisseaux = null, donnees = null;
        let repli = null;
        for (let main = 0; main < 10; main++) {
            const sol = carreLatin(rng, n);
            const ru = decouperEnRuisseaux(rng, n, sol);
            if (!ru) continue;
            const ind = choisirLesIndices(rng, n, sol, ru, P.garder,
                { sansEssai: !!P.sansEssai });
            solution = sol; ruisseaux = ru; donnees = ind;
            if (compterSolutions(n, [], ind, 2) > 1) { repli = null; break; }
            // Celle-ci se résout sans les ruisseaux : on la garde sous le coude
            // au cas où aucune main ne donnerait mieux, et l'on retente.
            repli = { solution: sol, ruisseaux: ru, donnees: ind };
        }
        if (repli) { solution = repli.solution; ruisseaux = repli.ruisseaux; donnees = repli.donnees; }

        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.strimko',
            skillId: 'num.logique.strimko',
            answerKind: 'grid',
            prompt: {
                text: `Remplis la grille avec les nombres de 1 à ${n}.`
            },
            answer: solution.map(l => l.join('')).join('|'),
            // LA PHRASE QUI DIT LA RÈGLE DOIT ÊTRE DANS `hints`, PAS DANS
            // `prompt`.
            //
            // Elle était écrite `prompt.hint` — et RIEN dans tout le dépôt ne
            // lit `prompt.hint` (vérifié : zéro occurrence). Le conseil le plus
            // utile du jeu n'arrivait donc jamais sur l'écran de l'élève, sans
            // qu'aucune erreur ne le signale : une clef inventée dans un objet
            // est un silence, pas une panne.
            //
            // C'est l'épreuve « chaque exercice à générateur sait produire un
            // exemple complet » qui l'a dit — elle exige qu'un exercice à
            // générateur ait de quoi remplir l'onglet « Un exemple », et le
            // Strimko n'avait ni indice ni explication à y montrer.
            hints: [
                'Chaque ligne, chaque colonne et chaque RUISSEAU portent les '
                    + `${n} nombres, une fois chacun — le ruisseau est la chaîne `
                    + 'de perles reliées par un trait de couleur.',
                'Prends une case vide et barre dans ta tête tous les nombres '
                    + 'déjà présents dans sa ligne, dans sa colonne ET dans son '
                    + 'ruisseau. S\'il n\'en reste qu\'un, il est forcé.'
            ],
            explanation: 'On ne devine jamais : on cherche la case où il ne reste '
                + "qu'une seule possibilité, et chaque case remplie en débloque "
                + "d'autres.",
            meta: {
                n,
                ruisseaux,
                donnees,
                solution,
                palier: (params || {}).palier || 'facile'
            }
        });
    }
};
