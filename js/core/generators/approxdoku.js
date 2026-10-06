// L'APPROXDOKU — le carré latin où les égalités sont FAUSSES DE UN.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « et un approxdoku », puis la page d'Erich Friedman en capture, qui
// donne la règle mot pour mot :
//
//   « Write the digits 1 through 5 in the circles so that each number occurs
//     once in each row and column. The horizontal and vertical equations should
//     be approximately true: both sides will evaluate to positive integers that
//     differ by 1. »
//
// Donc : un carré latin, et par-dessus des CHAÎNES de cases reliées par des
// opérateurs, dont l'une des places porte « ≈ ». Les deux côtés du « ≈ » valent
// des entiers positifs qui diffèrent de 1 — jamais égaux, jamais plus loin.
//
// L'exemple résolu de sa page, qui a servi à vérifier chaque règle avant
// d'écrire une ligne : « 2+3+1 ≈ 5 » (6 et 5), « 3 ≈ 4×1 » (3 et 4),
// « 2÷1 ≈ 5−4 » (2 et 1), « 4÷2 ≈ 1 » (2 et 1).
//
// ET IL N'Y A AUCUN INDICE DONNÉ. Toutes les cases sont vides au départ : ce
// sont les équations seules qui pincent une grille et une seule.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LES PRIORITÉS S'APPLIQUENT, ET C'EST UN CHOIX QUI SE DISCUTE.
//
// La page de Friedman ne dit pas comment lire « a+b×c ». De gauche à droite, ou
// avec les priorités ? On a tranché pour LES PRIORITÉS — × et ÷ avant + et − —
// pour une raison qui n'est pas mathématique mais scolaire : « priorités
// opératoires » est un chapitre de la 6ᵉ de Rémy, et un exercice qui lirait
// « 2+3×4 » comme 20 enseignerait à ses élèves le contraire de ce qu'il leur
// demande partout ailleurs. Un exercice ne contredit pas le cours.
//
// ET LE PALIER DÉCOUVERTE N'A PAS À TRANCHER : il n'autorise qu'UN opérateur
// par côté du « ≈ », donc la question ne s'y pose jamais. C'est là que commence
// un élève de sixième qui n'a pas encore vu les priorités.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// TOUTE ÉTAPE DOIT RENDRE UN ENTIER POSITIF, pas seulement le résultat.
//
// Friedman écrit « both sides will evaluate to positive integers ». On est plus
// strict d'un cran : CHAQUE étape doit rendre un entier positif. Autrement un
// côté comme « 1−5+6 » vaudrait 2 en passant par −4, et l'élève qui vérifie son
// travail de gauche à droite — c'est-à-dire tout élève de sixième, qui n'a pas
// encore vu les relatifs — trouverait un nombre qui n'a pas de sens pour lui et
// croirait s'être trompé. La division, elle, doit tomber juste : 5÷2 ne vaut
// rien ici.

import { makeItem } from '../items.js';
import { carreLatin } from './strimko.js';

/** Les quatre opérations. Le signe « − » est le vrai, celui qu'on affiche. */
export const OPERATEURS = ['+', '−', '×', '÷'];
export const APPROX = '≈';

/**
 * UN CÔTÉ DU « ≈ », AVEC LES PRIORITÉS.
 *
 * Deux passes : on replie d'abord les × et les ÷ de gauche à droite, puis les +
 * et les −. Chaque étape doit rendre un entier positif (voir l'en-tête) ; sinon
 * ce côté n'existe pas, et l'on rend `null` plutôt que `NaN` ou un flottant —
 * un `null` se teste, un `NaN` se propage sans bruit.
 *
 * @param {number[]} vals  les valeurs des cases, dans l'ordre
 * @param {string[]} ops   les opérateurs entre elles (longueur = vals − 1)
 * @returns {number|null}
 */
export function evaluerCote(vals, ops) {
    if (!vals.length) return null;
    // Passe 1 : × et ÷. `morceaux` porte ce qui reste à additionner/soustraire.
    const morceaux = [vals[0]];
    const signes = [];
    for (let i = 0; i < ops.length; i++) {
        const op = ops[i], suivant = vals[i + 1];
        if (op === '×' || op === '÷') {
            const gauche = morceaux[morceaux.length - 1];
            const r = op === '×' ? gauche * suivant : gauche / suivant;
            if (!Number.isInteger(r) || r < 1) return null;
            morceaux[morceaux.length - 1] = r;
        } else {
            signes.push(op);
            morceaux.push(suivant);
        }
    }
    // Passe 2 : + et −, de gauche à droite.
    let total = morceaux[0];
    for (let i = 0; i < signes.length; i++) {
        total = signes[i] === '+' ? total + morceaux[i + 1] : total - morceaux[i + 1];
        if (!Number.isInteger(total) || total < 1) return null;
    }
    // ON VÉRIFIE LE TOTAL MÊME QUAND IL N'Y A EU AUCUNE OPÉRATION.
    //
    // Sans cette ligne, un côté d'UNE SEULE CASE n'était jamais contrôlé : la
    // boucle ci-dessus ne tourne pas, et l'on rendait la valeur telle quelle.
    // Conséquence mesurée : `evaluerCote([0], [])` valait 0, donc
    // `equationJuste(['≈'], [0, 1])` répondait VRAI — parce que 0 et 1 se
    // suivent. Une chaîne « ? ≈ 1 » dont la case est vide se serait donc lue
    // comme juste.
    //
    // CE N'ÉTAIT PAS ENCORE UN DÉFAUT VISIBLE, et c'est pour ça qu'on le note :
    // l'activité écarte aujourd'hui toute chaîne qui a un trou avant de la
    // juger (`vals.some(v => !v)`). Le jour où cette garde-là bouge — un
    // vérificateur plus fin, une aide qui évalue en cours de route —, le défaut
    // sort tout seul. Une case vide vaut `0` dans `grille`, et 0 n'est pas un
    // entier POSITIF : le dire ici, c'est le dire une fois pour toutes.
    if (!Number.isInteger(total) || total < 1) return null;
    return total;
}

/** La place du « ≈ » dans une suite d'opérateurs. */
export const placeDuTilde = (ops) => ops.indexOf(APPROX);

/**
 * CETTE ÉQUATION EST-ELLE « APPROXIMATIVEMENT VRAIE » ?
 *
 * Les deux côtés valent des entiers positifs, et ils diffèrent de UN. Pas de
 * zéro : « 3 ≈ 3 » est faux ici, c'est le piège de la règle et c'est ce qui
 * rend le jeu intéressant — on ne cherche pas l'égalité, on cherche à la rater
 * d'exactement un.
 */
export function equationJuste(ops, vals) {
    const k = placeDuTilde(ops);
    if (k < 0) return false;
    const gauche = evaluerCote(vals.slice(0, k + 1), ops.slice(0, k));
    const droite = evaluerCote(vals.slice(k + 1), ops.slice(k + 1));
    return gauche !== null && droite !== null && Math.abs(gauche - droite) === 1;
}

/**
 * TOUTES LES RÉPARTITIONS D'OPÉRATEURS QUI RENDENT CETTE CHAÎNE VRAIE.
 *
 * On essaie, pour chaque place, les quatre opérations et le « ≈ » — un seul
 * « ≈ » par chaîne. `maxOpsParCote` borne le nombre d'opérations de chaque
 * côté : à 1, aucune question de priorité ne se pose (voir l'en-tête).
 *
 * @returns {string[][]} une entrée par répartition acceptable
 */
export function operateursPossibles(vals, maxOpsParCote) {
    const L = vals.length, trouves = [];
    const ops = [];
    const essayer = (i) => {
        if (i === L - 1) {
            if (placeDuTilde(ops) >= 0 && equationJuste(ops, vals)) trouves.push([...ops]);
            return;
        }
        for (const op of [...OPERATEURS, APPROX]) {
            if (op === APPROX && placeDuTilde(ops) >= 0) continue;
            ops.push(op);
            const k = placeDuTilde(ops);
            const gauche = k < 0 ? ops.length : k;
            const droite = k < 0 ? 0 : ops.length - k - 1;
            if (gauche <= maxOpsParCote && droite <= maxOpsParCote) essayer(i + 1);
            ops.pop();
        }
    };
    essayer(0);
    return trouves;
}

/** Les n! permutations de 1..n — les lignes possibles d'un carré latin. */
export function permutations(n) {
    const out = [];
    const rec = (reste, acc) => {
        if (!reste.length) { out.push([...acc]); return; }
        for (let i = 0; i < reste.length; i++) {
            acc.push(reste[i]);
            rec([...reste.slice(0, i), ...reste.slice(i + 1)], acc);
            acc.pop();
        }
    };
    rec(Array.from({ length: n }, (_, k) => k + 1), []);
    return out;
}

/**
 * COMPTER LES GRILLES POSSIBLES — LIGNE PAR LIGNE, PAS CASE PAR CASE.
 *
 * C'EST LA MESURE QUI A RENDU CE JEU GÉNÉRABLE SUR UNE TABLETTE. Un comptage
 * case par case, dans l'ordre de lecture, explorait 1,8 seconde au pire pour un
 * 5×5 : les équations VERTICALES ne se vérifient qu'à leur dernière ligne, donc
 * l'élagage n'arrive qu'à la toute fin et l'on parcourt tout l'arbre pour rien.
 *
 * Une ligne de carré latin est une PERMUTATION, et il n'y en a que n! — 120 à
 * 5×5. On filtre donc d'abord, une fois pour toutes, les permutations qui
 * satisfont les équations HORIZONTALES de chaque ligne : l'élagage a lieu avant
 * que la recherche commence. Mesuré après : 13 ms en médiane, 39 ms au pire.
 *
 * LE BUDGET PLAFONNE L'EFFORT, ET IL PENCHE DU CÔTÉ PRUDENT. Épuisé, on rend
 * `limite` — c'est-à-dire « ce n'est pas unique ». Les deux endroits qui
 * appellent cette fonction s'en trouvent du bon côté : celui qui ajoute des
 * équations en ajoute une de plus, celui qui en retire en garde une de trop.
 * On perd un peu d'élégance dans la grille, jamais sa justesse. Mesuré à 20 000
 * pas : aucune main perdue, le pire cas tombe de 1 824 ms à 34 ms.
 */
export function compterSolutions(n, equations, limite = 2, perms = null, budget = 20000) {
    const toutes = perms || permutations(n);
    const horizontales = Array.from({ length: n }, () => []);
    const verticalesFinies = Array.from({ length: n }, () => []);
    for (const eq of equations) {
        if (eq.sens === 'h') horizontales[eq.cases[0].r].push(eq);
        else verticalesFinies[eq.cases[eq.cases.length - 1].r].push(eq);
    }
    const permsOk = horizontales.map(eqs => (eqs.length
        ? toutes.filter(p => eqs.every(eq => equationJuste(eq.ops, eq.cases.map(({ c }) => p[c]))))
        : toutes));

    const posees = [];
    let trouves = 0, pas = 0;
    const poser = (r) => {
        if (r === n) { trouves++; return trouves >= limite; }
        for (const p of permsOk[r]) {
            if (++pas > budget) { trouves = limite; return true; }
            let ok = true;
            for (let c = 0; c < n && ok; c++) {
                for (let k = 0; k < r; k++) if (posees[k][c] === p[c]) { ok = false; break; }
            }
            if (!ok) continue;
            posees.push(p);
            for (const eq of verticalesFinies[r]) {
                if (!equationJuste(eq.ops, eq.cases.map(({ r: rr, c }) => posees[rr][c]))) {
                    ok = false;
                    break;
                }
            }
            if (ok && poser(r + 1)) return true;
            posees.pop();
        }
        return false;
    };
    poser(0);
    return trouves;
}

/**
 * SE DÉDUIT-ELLE SANS JAMAIS DEVINER ?
 *
 * ─────────────────────────────────────────────────────────────────────────
 *
 * UNE GRILLE UNIQUE N'EST PAS UNE GRILLE TROUVABLE, et c'est la deuxième fois
 * en deux jeux que la mesure le rappelle — le Strimko a eu exactement le même
 * piège. L'unicité dit qu'une seule réponse existe ; elle ne dit rien sur le
 * chemin pour y arriver, et une grille qu'on ne finit qu'en essayant n'est pas
 * un exercice de raisonnement, c'est une punition.
 *
 * ON PROPAGE DONC COMME UN ÉLÈVE PROPAGE, et rien de plus savant :
 *
 *   · une valeur posée sort des candidats de sa ligne et de sa colonne ;
 *   · une valeur qui n'a plus qu'une seule place dans une ligne (ou une
 *     colonne) s'y pose ;
 *   · et pour chaque équation, une valeur qui ne figure dans AUCUNE
 *     combinaison satisfaisant l'équation sort des candidats de sa case.
 *
 * On recommence tant que quelque chose bouge. Si tout est posé à la fin, la
 * grille se déduit.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *
 * CE QU'ELLE A MESURÉ, ET QUI A REFAIT LES PALIERS : les chaînes COURTES
 * rendent la grille plus dure, pas plus facile. Un 5×5 à chaînes de trois cases
 * et un seul opérateur par côté — ce que j'avais choisi comme palier « moyen »,
 * par analogie avec « plus c'est court, plus c'est simple » — ne se déduit que
 * 5 fois sur 150. La raison se comprend après coup : une chaîne courte contient
 * peu d'information, la grille repose alors sur le croisement de beaucoup de
 * contraintes faibles, et croiser demande d'essayer. Les chaînes longues, au
 * contraire, pincent leurs propres cases et se propagent toutes seules :
 * 103 sur 150 à chaînes de quatre.
 */
export function deduitSansDeviner(n, equations) {
    const candidats = Array.from({ length: n }, () => Array.from({ length: n },
        () => new Set(Array.from({ length: n }, (_, k) => k + 1))));
    let bouge = true, tours = 0;

    while (bouge && tours++ < 60) {
        bouge = false;

        // Une valeur posée sort de sa ligne et de sa colonne.
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                if (candidats[r][c].size !== 1) continue;
                const v = [...candidats[r][c]][0];
                for (let k = 0; k < n; k++) {
                    if (k !== c && candidats[r][k].delete(v)) bouge = true;
                    if (k !== r && candidats[k][c].delete(v)) bouge = true;
                }
            }
        }

        // Une valeur qui n'a plus qu'une place dans sa ligne (ou sa colonne).
        for (let r = 0; r < n; r++) {
            for (let v = 1; v <= n; v++) {
                const places = [];
                for (let c = 0; c < n; c++) if (candidats[r][c].has(v)) places.push(c);
                if (places.length === 1 && candidats[r][places[0]].size > 1) {
                    candidats[r][places[0]] = new Set([v]);
                    bouge = true;
                }
            }
        }
        for (let c = 0; c < n; c++) {
            for (let v = 1; v <= n; v++) {
                const places = [];
                for (let r = 0; r < n; r++) if (candidats[r][c].has(v)) places.push(r);
                if (places.length === 1 && candidats[places[0]][c].size > 1) {
                    candidats[places[0]][c] = new Set([v]);
                    bouge = true;
                }
            }
        }

        // Les équations. Une chaîne tient dans une ligne ou dans une colonne :
        // ses cases portent donc des valeurs DEUX À DEUX DIFFÉRENTES, et le
        // dire ici élague autant que l'équation elle-même.
        for (const eq of equations) {
            const L = eq.cases.length;
            const listes = eq.cases.map(({ r, c }) => [...candidats[r][c]]);
            const vivants = listes.map(() => new Set());
            const combinaison = new Array(L);
            const parcourir = (i) => {
                if (i === L) {
                    if (new Set(combinaison).size !== L) return;
                    if (!equationJuste(eq.ops, combinaison)) return;
                    for (let k = 0; k < L; k++) vivants[k].add(combinaison[k]);
                    return;
                }
                for (const v of listes[i]) { combinaison[i] = v; parcourir(i + 1); }
            };
            parcourir(0);
            eq.cases.forEach(({ r, c }, k) => {
                for (const v of [...candidats[r][c]]) {
                    if (!vivants[k].has(v)) { candidats[r][c].delete(v); bouge = true; }
                }
            });
        }
    }

    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) if (candidats[r][c].size !== 1) return false;
    }
    return true;
}

/** Deux chaînes du même sens ne doivent pas se partager une case. */
export const seChevauchent = (a, b) => a.sens === b.sens
    && a.cases.some(x => b.cases.some(y => y.r === x.r && y.c === x.c));

/**
 * TOUTES LES CHAÎNES VRAIES SUR CETTE GRILLE — l'étagère où l'on puise.
 *
 * Une chaîne est une suite de cases CONTIGUËS d'une même ligne ou d'une même
 * colonne, de deux cases au moins. On garde, pour chacune, toutes les
 * répartitions d'opérateurs qui la rendent vraie sur la solution.
 */
export function chainesPossibles(n, solution, longueurMax, maxOpsParCote) {
    const out = [];
    const ajouter = (sens, cases) => {
        const vals = cases.map(({ r, c }) => solution[r][c]);
        for (const ops of operateursPossibles(vals, maxOpsParCote)) out.push({ sens, cases, ops });
    };
    for (let L = 2; L <= longueurMax; L++) {
        for (let r = 0; r < n; r++) {
            for (let c = 0; c + L <= n; c++) {
                ajouter('h', Array.from({ length: L }, (_, k) => ({ r, c: c + k })));
            }
        }
        for (let c = 0; c < n; c++) {
            for (let r = 0; r + L <= n; r++) {
                ajouter('v', Array.from({ length: L }, (_, k) => ({ r: r + k, c })));
            }
        }
    }
    return out;
}

// LA PRÉFÉRENCE POUR LES CHAÎNES LONGUES, ET POURQUOI ELLE EST DOUCE.
//
// Les chaînes de deux cases — « a ≈ b » — sont les plus nombreuses de loin, et
// les plus pauvres : elles ne disent qu'« à un près ». Tirées uniformément,
// elles tapissaient la grille. On retranche donc un peu de la clef de tri par
// case supplémentaire.
//
// MESURÉ, ET C'EST POUR ÇA QUE LE CHIFFRE EST PETIT : à 0,45 la préférence
// devient un ordre, et TOUTES les chaînes sortaient à la longueur maximale —
// une grille d'une régularité de papier peint. À 0,12, le mélange ressemble aux
// grilles de Friedman : surtout des quatre et des cinq, quelques trois, de
// loin en loin un deux.
const PREFERENCE_LONGUEUR = 0.12;

// AU-DELÀ, ON ARRÊTE D'AJOUTER. Jamais atteint sur les cinq paliers (le pire
// palier en demande dix) : c'est une sécurité contre une main qui ne
// convergerait pas, pas un plan de secours qu'on emprunte.
const PLAFOND_EQUATIONS = 20;

/**
 * UNE GRILLE : un carré latin, puis des équations jusqu'à ce qu'elle soit
 * unique, puis on retire tout ce qui ne sert pas.
 *
 * ON NE COMPTE PAS AVANT D'AVOIR POSÉ `depart` ÉQUATIONS. Les premiers
 * comptages se font sur une grille à peine contrainte, où la recherche explore
 * tout : ils coûtaient à eux seuls l'essentiel du temps, pour une réponse qu'on
 * connaît d'avance (« non, ce n'est pas encore unique »).
 */
function uneMain(rng, n, P, perms) {
    const solution = carreLatin(rng, n);
    const etagere = chainesPossibles(n, solution, P.longueurMax, P.maxOpsParCote)
        .map(eq => ({ eq, clef: rng.next() - eq.cases.length * PREFERENCE_LONGUEUR }))
        .sort((a, b) => a.clef - b.clef)
        .map(x => x.eq);

    const prises = [];
    for (const eq of etagere) {
        if (prises.length >= PLAFOND_EQUATIONS) break;
        if (prises.some(p => seChevauchent(p, eq))) continue;
        prises.push(eq);
        if (prises.length < P.depart) continue;
        if (compterSolutions(n, prises, 2, perms) === 1) break;
    }
    if (compterSolutions(n, prises, 2, perms) !== 1) return null;

    // ON RETIRE TOUT CE QUI NE SERT PAS. Une équation dont l'absence laisse la
    // grille unique est une équation que l'élève lira, vérifiera, et dont il ne
    // tirera rien — c'est-à-dire du travail qu'on lui demande pour rien.
    for (let i = prises.length - 1; i >= 0; i--) {
        const sans = prises.filter((_, k) => k !== i);
        if (compterSolutions(n, sans, 2, perms) === 1) prises.splice(i, 1);
    }
    return { solution, equations: prises };
}

/**
 * LES PALIERS, REFAITS APRÈS MESURE.
 *
 * `longueurMax` est la longueur des chaînes, `maxOpsParCote` le nombre
 * d'opérations de chaque côté du « ≈ » — à 1, la question des priorités ne se
 * pose pas, et c'est par là qu'on commence en sixième.
 *
 * ATTENTION : `maxOpsParCote` N'EST ACTIF QU'AU PALIER DIFFICILE, et je ne
 * m'en étais pas aperçu en l'écrivant. Une chaîne de L cases porte L−1
 * opérateurs, dont un « ≈ » : il en reste L−2 à répartir, donc AUCUN côté ne
 * peut en porter plus de L−2 quoi qu'on demande. À `longueurMax: 3`, cela fait
 * 1 — la borne de Découverte est donc vraie mais inerte, et c'est la LONGUEUR
 * qui garantit l'absence de priorités. Même chose pour Facile, Moyen et Expert.
 * Seul Difficile (5 cases, donc jusqu'à 3 d'un côté, borné à 2) s'en sert.
 *
 * C'est `epreuveTombe.mjs` qui l'a dit, en refusant de faire tomber l'épreuve
 * du palier Découverte quand on déréglait cette borne. On garde le réglage —
 * il distingue Difficile d'Expert, et il dit l'intention —, mais on écrit ici
 * ce qu'il fait VRAIMENT, pour que personne ne s'appuie dessus là où il dort.
 *
 * DEUX PALIERS QUE J'AVAIS PRÉVUS N'EXISTENT PAS, et leur absence est mesurée :
 *
 *   · 5×5 à chaînes de trois, un opérateur par côté : 5 grilles sur 150 se
 *     déduisent sans deviner. C'est le palier que j'appelais « moyen » avant de
 *     mesurer ;
 *   · 6×6 : 28 mains sur 60 n'aboutissent pas, et la médiane monte à 1 244 ms.
 *     Les 720 permutations d'une ligne ne sont pas le problème ; c'est qu'une
 *     chaîne de quatre cases dans une grille de six en laisse deux libres, et
 *     la grille reste molle.
 *
 * Les cinq qui restent : 60 mains sur 60, 74 ms au pire, toutes déductibles.
 */
export const PALIERS = {
    decouverte: { n: 4, longueurMax: 3, maxOpsParCote: 1, depart: 3,
        label: 'Découverte — 4 × 4, une seule opération de chaque côté' },
    facile: { n: 4, longueurMax: 4, maxOpsParCote: 2, depart: 3,
        label: 'Facile — 4 × 4' },
    moyen: { n: 5, longueurMax: 4, maxOpsParCote: 2, depart: 6,
        label: 'Moyen — 5 × 5, chaînes de quatre cases' },
    difficile: { n: 5, longueurMax: 5, maxOpsParCote: 2, depart: 6,
        label: 'Difficile — 5 × 5, chaînes de cinq cases' },
    expert: { n: 5, longueurMax: 5, maxOpsParCote: 3, depart: 6,
        label: 'Expert — 5 × 5, jusqu\'à trois opérations par côté' }
};

// ON REJOUE LA MAIN ENTIÈRE TANT QUE LA GRILLE NE SE DÉDUIT PAS — même remède
// qu'au Strimko, et pour la même raison : ce n'est pas l'ORDRE des équations
// qui décide, c'est le COUPLE (carré latin, étagère). Rebattre les cartes d'une
// main perdante ne sert à rien. Mesuré : 1,3 à 2,6 mains selon le palier.
const MAINS = 40;

export const approxdokuGenerator = {
    id: 'logique.approxdoku',
    skills: ['num.logique.approxdoku'],
    answerKind: 'grid',
    params: [
        {
            id: 'palier', type: 'select', label: 'Difficulté',
            aide: 'La taille de la grille et la longueur des chaînes. Au palier '
                + 'Découverte, chaque côté du « ≈ » n\'a qu\'une seule opération : '
                + 'les priorités opératoires n\'y entrent pas en jeu.',
            options: Object.entries(PALIERS).map(([value, p]) => ({ value, label: p.label })),
            default: 'facile'
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const nom = (params || {}).palier;
        const P = PALIERS[nom] || PALIERS.facile;
        const n = P.n;
        const perms = permutations(n);

        // LE REPLI NE DOIT PAS ÊTRE SILENCIEUX.
        //
        // Si aucune des quarante mains ne donne de grille déductible, on en
        // livre une quand même — mieux vaut une grille qui demande d'essayer que
        // pas de grille du tout. Mais sans marque, PERSONNE ne le saurait :
        // l'élève recevrait une grille qu'on ne finit qu'en devinant, et le
        // dépôt continuerait d'annoncer le contraire. Mesuré aujourd'hui :
        // 40 grilles sur 40 déductibles sur les cinq paliers, donc ce repli ne
        // sert jamais — et c'est précisément pour qu'on s'en aperçoive le jour
        // où il servirait qu'il laisse une trace.
        let grille = null, deduite = false;
        for (let main = 0; main < MAINS; main++) {
            const essai = uneMain(rng, n, P, perms);
            if (!essai) continue;
            if (deduitSansDeviner(n, essai.equations)) { grille = essai; deduite = true; break; }
            // On la garde sous le coude : une grille unique qui demande d'essayer
            // vaut mieux que pas de grille du tout, mais on continue à chercher.
            grille = grille || essai;
        }

        const { solution, equations } = grille;
        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.approxdoku',
            skillId: 'num.logique.approxdoku',
            answerKind: 'grid',
            prompt: {
                text: `Écris les nombres de 1 à ${n} : chacun une fois par ligne et par colonne.`
            },
            answer: solution.map(l => l.join('')).join('|'),
            hints: [
                'Les deux côtés du « ≈ » diffèrent de UN — jamais zéro, jamais deux. '
                    + 'Une égalité parfaite est donc FAUSSE ici.',
                'Commence par la chaîne la plus longue : plus elle a de cases, moins '
                    + 'elle laisse de possibilités. Cherche celle où une seule '
                    + 'combinaison tient debout.'
            ],
            explanation: 'Chaque côté doit tomber sur un entier positif — une division '
                + 'juste, jamais de soustraction qui passe sous zéro — et les deux '
                + 'résultats se suivent.',
            meta: { n, solution, equations, palier: nom || 'facile', deduite }
        });
    }
};
