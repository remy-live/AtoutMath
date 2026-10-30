// LE KAKURO — des mots croisés dont les mots sont des sommes.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 26 octobre : « tu me les fais tous, avec des grilles faciles ».
//
// LA RÈGLE : chaque suite de cases blanches doit totaliser le nombre écrit
// dans la case noire qui la précède — à droite de la diagonale pour la ligne,
// en dessous pour la colonne. Et dans une même suite, **tous les chiffres sont
// différents**. On n'écrit que des chiffres de 1 à 9 ; le zéro n'existe pas.
//
// ── C'EST UNE MACHINE À DÉCOMPOSER ──────────────────────────────────────────
//
// Certaines sommes n'ont qu'une écriture, et ce sont elles qui ouvrent la
// grille : 3 en deux cases, c'est 1 + 2 et rien d'autre ; 16 en deux cases,
// c'est 7 + 9 ; 24 en trois cases, c'est 7 + 8 + 9. Un élève qui en fait
// quatre les connaît par cœur — et ce sont exactement les décompositions
// qu'on travaille au tableau.
//
// LES SOMMES EXTRÊMES SONT LES PLUS UTILES, et c'est contre l'intuition : une
// somme moyenne (10 en deux cases) a quatre écritures et ne décide rien ; une
// somme petite ou grande n'en a qu'une.
//
// ── COMMENT ON FABRIQUE UNE GRILLE ──────────────────────────────────────────
//
// Trois temps : on dessine les murs, on remplit les cases, on CALCULE les
// sommes. Puis on vérifie l'unicité en comptant les solutions — une grille de
// kakuro à deux solutions compterait faux un élève qui a raison.
//
// LA RÈGLE DU DESSIN : toute case blanche appartient à une suite horizontale
// d'au moins deux cases ET à une suite verticale d'au moins deux. Une case
// seule dans sa ligne porterait une « somme » d'un seul chiffre, qui donne la
// réponse au lieu de la demander.

import { makeItem } from '../items.js';

const SKILL = 'num.logique.kakuro';

export const FORMATS = {
    petit: { lignes: 4, colonnes: 4, nom: 'Petite — 4 × 4' },
    grand: { lignes: 5, colonnes: 5, nom: 'Grande — 5 × 5' }
};

/** La plus longue suite autorisée. Deux ou trois cases en facile. */
const LONGUEURS = { facile: 3, moyen: 4, difficile: 5 };

/**
 * CE QUE LA FABRICATION D'UNE GRILLE S'AUTORISE À EXPLORER, en nœuds de
 * recherche, TOUS ESSAIS CONFONDUS. Voir `compterKakuro` pour le défaut que ce
 * plafond corrige et pourquoi il compte des nœuds et non des millisecondes.
 *
 * LE CHIFFRE EST MESURÉ, PAS CHOISI : à 60 000 nœuds, les six combinaisons de
 * réglages tiennent toutes sous 120 ms par grille, pire cas compris, et le
 * filet ne se déclenche que sur la plus dure (5 × 5, suites de cinq) — où une
 * grille pleine est de toute façon ce que le réglage « difficile » promet.
 */
const PLAFOND_NOEUDS = 60000;

/** Ce qu'un remplissage s'autorise avant qu'on redécoupe. Voir `remplir`. */
const PLAFOND_REMPLIR = 12000;

/**
 * COMBIEN DE DÉCOUPES ON TIRE AVANT DE GARDER LA MEILLEURE. Voir `dessiner` :
 * on ne cherche plus la première acceptable, mais la plus dense — alors le
 * nombre de tirages décide de la QUALITÉ du dessin, pas seulement de la
 * chance de trouver.
 */
const TIRAGES_DESSIN = 200;

/**
 * LA PETITE GRILLE EN TIRE TROIS FOIS PLUS, parce qu'elle les paie trois fois
 * moins cher : un tirage coûte un parcours de la grille, mais chaque découpe
 * retenue coûte ensuite une PREUVE D'UNICITÉ, et c'est elle qui domine — elle
 * est bien plus lourde en 5 × 5 qu'en 4 × 4. On met donc l'effort là où il est
 * bon marché, et le 4 × 4 est justement le réglage par défaut.
 */
const TIRAGES_PETITE = 600;
const DIFFICULTE_ITEM = { facile: 1, moyen: 2, difficile: 3 };

/** Les suites d'une grille : chacune porte ses cases et sa direction. */
function suitesDe(blanc, L, C) {
    const suites = [];
    for (let r = 0; r < L; r++) {
        let k = [];
        for (let c = 0; c <= C; c++) {
            if (c < C && blanc[r][c]) k.push([r, c]);
            else { if (k.length) suites.push({ sens: 'h', cases: k }); k = []; }
        }
    }
    for (let c = 0; c < C; c++) {
        let k = [];
        for (let r = 0; r <= L; r++) {
            if (r < L && blanc[r][c]) k.push([r, c]);
            else { if (k.length) suites.push({ sens: 'v', cases: k }); k = []; }
        }
    }
    return suites;
}

/**
 * TOUTES LES FAÇONS DE DÉCOUPER UNE LIGNE DE `n` CASES en suites de 2 à
 * `maxSuite` cases blanches, séparées par des murs.
 *
 * ON LES ÉNUMÈRE AU LIEU DE TIRER AU SORT, et c'est la correction d'un défaut
 * mesuré : à 18 % de murs posés au hasard, une ligne de quatre cases donne
 * presque toujours une suite de 4 (trop longue en facile) ou une suite de 1
 * (interdite). Les trois cents tirages échouaient tous, le filet prenait la
 * main, et la grille sortait pleine — avec des suites de quatre là où le
 * réglage promettait deux ou trois.
 */
// ON NE LES RECALCULE PAS À CHAQUE DESSIN. Il n'y a que quatre couples
// (n, maxSuite) dans tout le logiciel, et `dessiner` était appelé jusqu'à cent
// quarante fois pour une seule grille : cent quarante énumérations identiques.
const MOTIFS = new Map();

function motifsDeLigne(n, maxSuite) {
    const cle = `${n}/${maxSuite}`;
    const deja = MOTIFS.get(cle);
    if (deja) return deja;
    const out = [];
    const faire = (reste, acc) => {
        if (!reste) { out.push(acc.slice()); return; }
        // Un mur.
        acc.push(false); faire(reste - 1, acc); acc.pop();
        // Une suite de k cases blanches, suivie d'un mur ou du bord.
        for (let k = 2; k <= Math.min(maxSuite, reste); k++) {
            for (let i = 0; i < k; i++) acc.push(true);
            if (k === reste) faire(0, acc);
            else { acc.push(false); faire(reste - k - 1, acc); acc.pop(); }
            for (let i = 0; i < k; i++) acc.pop();
        }
    };
    faire(n, []);
    MOTIFS.set(cle, out);
    return out;
}

/**
 * UN DESSIN DE MURS VALABLE, LE PLUS DENSE QU'ON TROUVE.
 *
 * ── POURQUOI « LE PLUS DENSE » ET NON « LE PREMIER QUI PASSE » ──────────────
 *
 * RÉMY, 27 octobre, deux captures côte à côte — la nôtre et une grille
 * téléchargée : « je préfère la deuxième images ». Comptées sur les deux
 * images : SEPT cases blanches sur vingt-cinq chez nous, DOUZE chez eux. La
 * nôtre se lisait comme une tache noire avec quelques cases dedans.
 *
 * La cause tenait en une ligne : on tirait des découpes au hasard et l'on
 * gardait LA PREMIÈRE qui dépassait un plancher de 45 %. Or une découpe tirée
 * au hasard est presque toujours trouée — le premier succès est donc, à peu
 * de chose près, le pire grille acceptable.
 *
 * ET MONTER LE PLANCHER NE MARCHE PAS, c'est mesuré : à 55 %, seize grilles
 * sur vingt tombaient dans le filet ; à 60 %, vingt sur vingt. Le plancher ne
 * fabrique pas de bonnes découpes, il refuse les mauvaises — et quand il les
 * refuse toutes il ne reste rien.
 *
 * ON GARDE DONC LA MEILLEURE DE TOUS LES TIRAGES. Même travail, même durée,
 * et c'est le maximum atteignable qu'on obtient au lieu du minimum acceptable.
 * Sur une grille de quatre par quatre à suites de trois cases, ce maximum est
 * de dix cases blanches sur seize, et il se démontre : chaque colonne de
 * quatre doit porter au moins un mur, sinon sa suite ferait quatre cases.
 */
function dessiner(rng, L, C, maxSuite, tirages = (L * C > 16 ? TIRAGES_DESSIN : TIRAGES_PETITE)) {
    const motifs = motifsDeLigne(C, maxSuite);
    if (!motifs.length) return null;
    // ASSEZ DENSE POUR S'ARRÊTER : inutile de faire les mille tirages quand on
    // tient déjà une grille aux trois quarts blanche.
    const vise = Math.round(L * C * 0.60);
    let meilleur = null;
    for (let essai = 0; essai < tirages; essai++) {
        // ── DEUX FAÇONS DE TIRER UNE DÉCOUPE, ET LA SECONDE EST CELLE QUI
        //    TROUVE ──────────────────────────────────────────────────────
        //
        // Tirer chaque rangée INDÉPENDAMMENT ne marche presque jamais : il
        // faut que les colonnes se découpent proprement AUSSI, et deux rangées
        // sans rapport n'ont aucune raison de s'accorder. En 5 × 5 à suites de
        // deux cases, la seule découpe valable est faite de quatre carrés de
        // deux sur deux ; sa probabilité en tirage indépendant est de l'ordre
        // d'une sur cent mille, et cinq cents tirages ne la rencontrent jamais.
        // Mesuré : le Kakuro tombait dans le filet, donc servait une grille
        // pleine, et la garde d'unicité le refusait.
        //
        // LES VRAIES GRILLES DE KAKURO RÉEMPLOIENT LEURS RANGÉES — c'est ce
        // qui leur donne cet air de blocs. On tire donc une fois sur deux dans
        // une PETITE PALETTE de deux ou trois motifs qu'on répète : les
        // colonnes ont alors toutes les chances de se découper comme les
        // lignes, puisqu'elles voient les mêmes murs aux mêmes endroits.
        let blanc;
        if (essai % 2 === 0) {
            blanc = Array.from({ length: L }, () => motifs[rng.int(0, motifs.length - 1)].slice());
        } else {
            const palette = Array.from({ length: rng.int(2, 3) },
                () => motifs[rng.int(0, motifs.length - 1)]);
            blanc = Array.from({ length: L }, () => palette[rng.int(0, palette.length - 1)].slice());
        }
        const suites = suitesDe(blanc, L, C);
        // Chaque case blanche doit tenir dans une suite de deux au moins, dans
        // les DEUX sens — sinon sa « somme » serait son propre chiffre.
        const compte = new Map();
        suites.forEach(s => s.cases.forEach(([r, c]) => {
            compte.set(`${r},${c}`, (compte.get(`${r},${c}`) || 0) + 1);
        }));
        const blanches = blanc.flat().filter(Boolean).length;
        const bon = suites.length > 0
            && suites.every(s => s.cases.length >= 2 && s.cases.length <= maxSuite)
            && [...compte.values()].every(v => v === 2);
        if (!bon) continue;

        // UNE RANGÉE ENTIÈREMENT NOIRE EST UNE RANGÉE PERDUE : une grille de
        // quatre sur quatre dont deux rangées sont noires est une grille de
        // deux sur quatre dans une boîte trop grande, et cela se voit tout de
        // suite sur la fiche imprimée.
        //
        // MAIS C'EST UNE PRÉFÉRENCE, PAS UNE RÈGLE, et la nuance est mesurée :
        // posée en règle, elle faisait tomber DIX-SEPT grilles sur vingt dans
        // le filet en 5 × 5 — les découpes valables y sont déjà rares, et en
        // exiger une de plus ne laissait presque rien. En pénalité, on prend
        // la rangée pleine quand elle existe et l'on s'en passe sinon.
        const vides = blanc.filter(l => !l.some(Boolean)).length
            + Array.from({ length: C }, (_, k) => blanc.some(l => l[k])).filter(v => !v).length;
        const note = blanches - vides * 3;
        if (!meilleur || note > meilleur.note) {
            meilleur = { blanc, suites, blanches, note };
            if (!vides && blanches >= vise) break;
        }
    }
    // ON NE REFUSE PLUS RIEN SUR LA DENSITÉ, et c'est une correction du même
    // jour : un plancher qui rend `null` fait descendre l'appelant de barreau
    // en barreau jusqu'au filet — et le filet, lui, sert une grille PLEINE.
    // Mesuré : quatorze grilles sur seize tombaient dans le filet en 5 × 5.
    // Une découpe un peu trouée mais vérifiée vaut toujours mieux qu'une
    // grille pleine dont personne n'a compté les solutions.
    return meilleur;
}

/**
 * Remplit les cases blanches : chiffres 1 à 9, tous différents par suite.
 *
 * PLAFONNÉ, COMME TOUTE RECHERCHE QUI PEUT ÉCHOUER ICI. Un découpage qui
 * n'admet aucun remplissage ne se démontre qu'en épuisant l'arbre, et ce
 * `false`-là coûte exactement aussi cher qu'un `true` cherché trop loin. La
 * leçon a été payée sur le Suguru : on y avait plafonné la preuve d'unicité,
 * le chronomètre n'avait pas bougé d'une milliseconde, et les sept secondes
 * étaient dans le remplissage. On redécoupe plutôt que de démontrer.
 */
function remplir(rng, L, C, blanc, suites, plafond = PLAFOND_REMPLIR) {
    const g = Array.from({ length: L }, () => Array(C).fill(0));
    const mesSuites = Array.from({ length: L }, () => Array(C).fill(null).map(() => []));
    suites.forEach(s => s.cases.forEach(([r, c]) => mesSuites[r][c].push(s)));
    const cells = [];
    for (let r = 0; r < L; r++) for (let c = 0; c < C; c++) if (blanc[r][c]) cells.push([r, c]);

    let noeuds = 0;
    const poser = (i) => {
        if (i === cells.length) return true;
        if (++noeuds > plafond) return false;
        const [r, c] = cells[i];
        for (const v of rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
            if (mesSuites[r][c].some(s => s.cases.some(([a, b]) => g[a][b] === v))) continue;
            g[r][c] = v;
            if (poser(i + 1)) return true;
            g[r][c] = 0;
            if (noeuds > plafond) return false;
        }
        return false;
    };
    return poser(0) ? g : null;
}

/** Les neuf chiffres, en masque de bits : le chiffre v occupe le bit v − 1. */
const TOUS = 0b111111111;

/** Combien de bits allumés — c'est-à-dire combien de chiffres encore permis. */
function combienDeBits(x) {
    let n = 0;
    while (x) { x &= x - 1; n++; }
    return n;
}

/**
 * POUR UN MASQUE DE CHIFFRES DÉJÀ VUS et `k` cases encore vides : la plus
 * petite et la plus grande somme qu'on puisse encore écrire dans la suite.
 *
 * ON LES TABULE. Il n'y a que cinq cent douze masques possibles et dix valeurs
 * de k, la table ne dépend d'AUCUNE grille, et elle se relit à chaque nœud du
 * comptage — là où l'ancien code reconstruisait deux tableaux et faisait deux
 * sommes pour chaque suite de chaque coup essayé.
 *
 * `Infinity` dit « k chiffres libres n'existent pas » : la suite est alors
 * impossible, et le test du minimum la rejette tout seul.
 */
const MINI = [], MAXI = [];
for (let m = 0; m <= TOUS; m++) {
    const libres = [];
    for (let v = 1; v <= 9; v++) if (!(m & (1 << (v - 1)))) libres.push(v);
    const mi = [0], ma = [0];
    for (let k = 1; k <= 9; k++) {
        mi.push(k <= libres.length ? mi[k - 1] + libres[k - 1] : Infinity);
        ma.push(k <= libres.length ? ma[k - 1] + libres[libres.length - k] : Infinity);
    }
    MINI.push(mi); MAXI.push(ma);
}

/**
 * COMPTE LES GRILLES QUI RESPECTENT TOUTES LES SOMMES. On s'arrête à `limite`.
 *
 * On choisit toujours la case la plus contrainte, et l'on élague sur chaque
 * suite : avec `restantes` cases encore vides, une suite ne peut plus
 * atteindre moins que son partiel augmenté des plus petits chiffres encore
 * libres, ni plus que des plus grands.
 *
 * ── DEUX CHOSES MESURÉES, ET CHACUNE A COÛTÉ CHER ───────────────────────────
 *
 * LES CHIFFRES VUS SONT UN MASQUE DE BITS, PAS UN `Set`. Choisir la case la
 * plus contrainte interrogeait neuf fois un `Set` par case et par suite, donc
 * quatre cent cinquante consultations pour UN seul coup joué. Un « ou » de
 * deux entiers et un comptage de bits les remplacent.
 *
 * ET LE COMPTAGE EST PLAFONNÉ EN NOMBRE DE NŒUDS (`budget`). Mesuré sur
 * quarante graines en 5 × 5 avec des suites de cinq cases : médiane 1 946 ms,
 * neuvième décile 7 140 ms, **pire cas 141 268 ms pour UNE grille**. C'est ce
 * qui faisait passer `npm test` de quatre minutes à plus de vingt-cinq.
 *
 * LE PLAFOND COMPTE DES NŒUDS, PAS DES MILLISECONDES, et ce n'est pas un
 * détail : une grille doit se refabriquer à l'identique depuis sa graine, sur
 * la tablette de l'élève comme ici. Un plafond en temps rendrait la grille
 * dépendante de la charge du processeur, donc deux élèves à la même graine
 * n'auraient pas la même grille.
 *
 * LE BUDGET EST PARTAGÉ PAR TOUS LES APPELS d'une même fabrication : un
 * plafond par appel ne bornerait rien, puisqu'on en fait jusqu'à mille. Quand
 * il tombe, on ne SAIT PLUS si la grille est unique : on le dit
 * (`budget.epuise`) au lieu de le deviner, et l'appelant passe à la suivante.
 */
export function compterKakuro(L, C, blanc, suites, cibles, limite = 2, budget = null) {
    const bourse = budget || { noeuds: Infinity, epuise: false };
    const g = Array.from({ length: L }, () => Array(C).fill(0));
    const mes = Array.from({ length: L }, () => Array(C).fill(null).map(() => []));
    suites.forEach((s, i) => s.cases.forEach(([r, c]) => mes[r][c].push(i)));

    // Les cases blanches une fois pour toutes : `choisir` les reparcourait
    // à travers toute la grille, murs compris, à chaque nœud.
    const cases = [];
    for (let r = 0; r < L; r++) for (let c = 0; c < C; c++) if (blanc[r][c]) cases.push([r, c]);

    const masque = suites.map(() => 0);
    const somme = suites.map(() => 0);
    const vides = suites.map(s => s.cases.length);

    let trouvees = 0;
    const choisir = () => {
        let best = -1, moins = 10;
        for (let i = 0; i < cases.length; i++) {
            const [r, c] = cases[i];
            if (g[r][c]) continue;
            let pris = 0;
            for (const s of mes[r][c]) pris |= masque[s];
            const n = combienDeBits(TOUS & ~pris);
            if (n < moins) { moins = n; best = i; if (!n) return best; }
        }
        return best;
    };

    const poser = (restantes) => {
        if (trouvees >= limite) return;
        if (--bourse.noeuds < 0) { bourse.epuise = true; return; }
        if (!restantes) { trouvees++; return; }
        const i = choisir();
        if (i < 0) return;
        const [r, c] = cases[i];
        const miennes = mes[r][c];
        let pris = 0;
        for (const s of miennes) pris |= masque[s];
        for (let v = 1; v <= 9; v++) {
            const bit = 1 << (v - 1);
            if (pris & bit) continue;
            g[r][c] = v;
            for (const s of miennes) { somme[s] += v; masque[s] |= bit; vides[s]--; }
            let ok = true;
            for (const s of miennes) {
                const reste = vides[s];
                if (!reste) { if (somme[s] !== cibles[s]) ok = false; }
                else if (somme[s] + MINI[masque[s]][reste] > cibles[s]
                    || somme[s] + MAXI[masque[s]][reste] < cibles[s]) ok = false;
                if (!ok) break;
            }
            if (ok) poser(restantes - 1);
            g[r][c] = 0;
            for (const s of miennes) { somme[s] -= v; masque[s] &= ~bit; vides[s]++; }
            if (trouvees >= limite || bourse.epuise) return;
        }
    };
    poser(cases.length);
    return trouvees;
}

export const kakuroGenerator = {
    id: 'logique.kakuro',
    label: 'Kakuro',
    skills: [SKILL],
    answerKinds: ['grid'],
    params: [
        {
            id: 'format', type: 'select', label: 'Taille de la grille', default: 'petit',
            options: Object.entries(FORMATS).map(([value, f]) => ({ value, label: f.nom }))
        },
        {
            id: 'difficulte', type: 'select', label: 'Difficulté', default: 'facile',
            aide: 'Elle change la LONGUEUR des suites. À deux ou trois cases, beaucoup de '
                + 'sommes n\'ont qu\'une seule écriture possible.',
            options: [
                { value: 'facile', label: 'Facile — suites de 2 ou 3 cases' },
                { value: 'moyen', label: 'Moyen — jusqu\'à 4 cases' },
                { value: 'difficile', label: 'Difficile — jusqu\'à 5 cases' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const f = FORMATS[p.format] || FORMATS.petit;
        const L = f.lignes, C = f.colonnes;
        const maxSuite = LONGUEURS[p.difficulte] || LONGUEURS.facile;

        // ── ON RACCOURCIT LES SUITES, ON NE LES RALLONGE PAS ────────────────
        //
        // Première écriture : quand aucune grille unique ne sortait en suites
        // de `maxSuite`, on s'autorisait UNE CASE DE PLUS, puis une autre,
        // jusqu'à la grille pleine. C'était le mauvais sens, et la mesure l'a
        // dit : en 5 × 5 avec des suites de cinq, trente-cinq grilles sur
        // quarante tombaient dans ce filet.
        //
        // POURQUOI C'ÉTAIT LE MAUVAIS SENS : plus une suite est longue, plus
        // elle a d'écritures, donc MOINS la grille est unique. Rallonger pour
        // s'en sortir, c'est courir vers le défaut qu'on fuit.
        //
        // ET LES ÉTIQUETTES L'AUTORISENT, mot pour mot : « jusqu'à 4 cases »,
        // « jusqu'à 5 cases ». Une grille dont la plus longue suite fait trois
        // cases tient donc la promesse de « difficile » ; une grille à deux
        // solutions, elle, ne tient aucune promesse — elle compte faux un élève
        // qui a raison. On descend.
        const barreaux = [];
        for (let m = Math.min(maxSuite, C); m >= 2; m--) barreaux.push(m);

        // DEUX BOUCLES, ET LA SECONDE EST CELLE QUI MANQUAIT. Le dessin décide
        // des FORMES ; le remplissage décide des SOMMES, et ce sont les sommes
        // qui font l'unicité — une même découpe admet des centaines de
        // remplissages, dont certains seulement sont uniques. Essayer huit
        // remplissages sur un même dessin coûte moins qu'un dessin neuf.
        let trouve = null;
        // UNE GRANDE GRILLE DEMANDE PLUS D'ESSAIS : mesuré, cinq sur vingt-cinq
        // tombaient encore dans le filet en 5 × 5.
        const tours = L * C > 16 ? 140 : 60;
        // CHAQUE BARREAU A SA PART DE LA BOURSE. Sans ce partage, le barreau du
        // haut — le plus long, donc le plus coûteux à prouver — dépenserait
        // tout, et l'on tomberait dans le filet sans avoir essayé les barreaux
        // du bas, qui sont justement ceux qui réussissent.
        const part = Math.round(PLAFOND_NOEUDS / barreaux.length);
        for (const m of barreaux) {
            const bourse = { noeuds: part, epuise: false };
            for (let essai = 0; essai < tours && !trouve && !bourse.epuise; essai++) {
                const dessin = dessiner(rng, L, C, m);
                if (!dessin) break;
                for (let pose = 0; pose < 8 && !trouve && !bourse.epuise; pose++) {
                    const g = remplir(rng, L, C, dessin.blanc, dessin.suites);
                    if (!g) break;
                    const cibles = dessin.suites.map(s =>
                        s.cases.reduce((a, [r, c]) => a + g[r][c], 0));
                    // UN COMPTAGE INTERROMPU NE PERMET PAS D'ACCEPTER : si la
                    // bourse s'est vidée en chemin, « une solution trouvée »
                    // veut dire « je n'ai pas fini de chercher », donc
                    // peut-être deux. On ne garde la grille que si le comptage
                    // est allé jusqu'au bout.
                    const n = compterKakuro(L, C, dessin.blanc, dessin.suites, cibles, 2, bourse);
                    if (n === 1 && !bourse.epuise) {
                        trouve = { ...dessin, g, cibles, dessine: true, plusLongue: m };
                    }
                }
            }
            if (trouve) break;
        }
        if (!trouve) {
            // LE FILET NE SERT PLUS UNE GRILLE NON VÉRIFIÉE. L'ancien servait
            // une grille PLEINE sans jamais compter ses solutions : sur les
            // trente-cinq grilles de « difficile » qui tombaient ici, personne
            // ne savait si elles étaient uniques. Une grille de kakuro à deux
            // solutions compte faux un élève qui a raison — c'est le défaut le
            // plus grave que ce fichier puisse produire.
            //
            // ON PREND DONC LE BARREAU LE PLUS BAS, deux cases, et l'on compte
            // SANS PLAFOND : une suite de deux cases n'a que quatre écritures
            // au plus, l'arbre est minuscule, et le comptage finit toujours.
            // Mesuré : on n'arrive ici que si `dessiner` lui-même échoue.
            for (let essai = 0; essai < 200 && !trouve; essai++) {
                const dessin = dessiner(rng, L, C, 2);
                if (!dessin) break;
                const g = remplir(rng, L, C, dessin.blanc, dessin.suites);
                if (!g) continue;
                const cibles = dessin.suites.map(s =>
                    s.cases.reduce((a, [r, c]) => a + g[r][c], 0));
                if (compterKakuro(L, C, dessin.blanc, dessin.suites, cibles, 2) === 1) {
                    trouve = { ...dessin, g, cibles, dessine: true, plusLongue: 2 };
                }
            }
        }
        if (!trouve) {
            // DERNIER RECOURS, et il reste UNE grille pleine faute de mieux :
            // mieux vaut un exercice jouable qu'un écran vide. On le DIT dans
            // le relevé (`meta.filet`), et une épreuve garde qu'on n'y tombe
            // jamais avec les réglages du catalogue.
            const blanc = Array.from({ length: L }, () => Array(C).fill(true));
            const suites = suitesDe(blanc, L, C);
            const g = remplir(rng, L, C, blanc, suites)
                || Array.from({ length: L }, (_, r) =>
                    Array.from({ length: C }, (_, c) => ((r + c) % 9) + 1));
            trouve = {
                blanc, suites, g, plusLongue: C,
                cibles: suites.map(s => s.cases.reduce((a, [r, c]) => a + g[r][c], 0))
            };
        }

        // ── LA GRILLE AFFICHÉE EST PLUS GRANDE D'UNE LIGNE ET D'UNE COLONNE ──
        //
        // Les sommes s'écrivent dans la case noire qui PRÉCÈDE la suite : il
        // faut donc une bande de cases noires en haut et à gauche, sinon les
        // suites qui commencent au bord n'auraient nulle part où poser leur
        // total. C'est la forme de toutes les grilles publiées.
        const lignes = L + 1, colonnes = C + 1;
        const cases = [];
        const indices = new Map();
        trouve.suites.forEach((s, i) => {
            const [r0, c0] = s.cases[0];
            const cle = s.sens === 'h' ? `${r0 + 1},${c0}` : `${r0},${c0 + 1}`;
            const d = indices.get(cle) || {};
            if (s.sens === 'h') d.droite = trouve.cibles[i];
            else d.bas = trouve.cibles[i];
            indices.set(cle, d);
        });

        const solution = Array.from({ length: lignes }, () => Array(colonnes).fill(0));
        for (let r = 0; r < lignes; r++) {
            for (let c = 0; c < colonnes; c++) {
                const blanche = r > 0 && c > 0 && trouve.blanc[r - 1][c - 1];
                if (blanche) {
                    cases.push({ r, c, type: 'vide' });
                    solution[r][c] = trouve.g[r - 1][c - 1];
                    continue;
                }
                const ind = indices.get(`${r},${c}`);
                cases.push(ind
                    ? { r, c, type: 'indice', droite: ind.droite || '', bas: ind.bas || '' }
                    : { r, c, type: 'mur' });
            }
        }

        const consigne = 'Chaque suite de cases blanches doit donner la somme écrite dans la '
            + 'case noire qui la précède. Les chiffres vont de 1 à 9, tous différents dans '
            + 'une même suite.';

        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.kakuro',
            skillId: SKILL,
            answerKind: 'grid',
            prompt: {
                text: consigne, papier: consigne,
                html: `<div class="game-question gn-consigne">${consigne}</div>`
            },
            answer: 'g' + solution.map(l => l.join(',')).join('/'),
            hints: [
                'CHERCHE LES SOMMES EXTRÊMES. 3 en deux cases, c\'est 1 + 2 et rien d\'autre ; '
                    + '17 en deux cases, c\'est 8 + 9. Ce sont elles qui ouvrent la grille — '
                    + 'pas les sommes moyennes, qui ont quatre écritures.',
                'Une case appartient à DEUX suites à la fois, une horizontale et une '
                    + 'verticale : un chiffre interdit par l\'une est éliminé pour l\'autre.',
                'Le zéro n\'existe pas ici : chaque case vaut au moins 1. Une suite de trois '
                    + 'cases vaut donc au moins 6 et au plus 24.'
            ],
            explanation: 'Chaque suite donne la somme annoncée, avec des chiffres tous '
                + 'différents.',
            difficulty: DIFFICULTE_ITEM[p.difficulte] || 1,
            meta: {
                lignes, colonnes, cases, solution,
                chiffres: { min: 1, max: 9 },
                titreCourt: 'Kakuro',
                // VRAI QUAND LE DESSIN A ÉCHOUÉ et qu'on a servi la grille
                // pleine : c'est une information pour le relevé, pas pour
                // l'élève.
                filet: !trouve.dessine,
                suites: trouve.suites.map(s => s.cases.length),
                texteLecon: 'Une suite de deux cases qui vaut 3 ne peut être que 1 + 2.'
            }
        });
    }
};

export default kakuroGenerator;
