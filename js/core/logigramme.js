// LE LOGIGRAMME — déduire, et n'écrire que ce qu'on a le droit d'écrire.
//
// Quatre enfants, quatre parfums de glace, quatre âges, et une poignée
// d'indices : « Léa n'a pas pris la vanille », « celui qui a pris le chocolat
// a neuf ans ». On remplit une grille de croix et de ronds jusqu'à ce que tout
// soit déterminé. C'est le premier exercice de logique formelle qu'un élève de
// cycle 3 peut mener SEUL de bout en bout, et c'est pour ça qu'il compte : à
// aucun moment on n'a le droit de deviner, et à aucun moment on n'en a besoin.
//
// TROIS EXIGENCES ONT COMMANDÉ TOUT LE MODULE.
//
//   1. UNE SEULE SOLUTION, et atteignable SANS ESSAI-ERREUR. C'est la même
//      exigence : on ajoute des indices tant que la propagation logique ne
//      suffit pas à tout déterminer. Si le solveur y arrive par déduction
//      pure, alors la solution est unique — et un élève peut la trouver.
//   2. LE MINIMUM D'INDICES. Une fois le puzzle résoluble, on retire un à un
//      les indices dont on peut se passer. Un indice de trop, c'est une
//      déduction volée à l'élève.
//   3. AUCUN ÉNONCÉ GLAUQUE. Pas de vol, pas de disparition, pas d'enquête
//      policière — les thèmes sont un goûter, une médiathèque, un potager. Un
//      exercice de logique n'a pas besoin d'un cadavre pour être intéressant,
//      et une classe de sixième n'a pas besoin qu'on le lui raconte.
//
// Le solveur rend aussi le JOURNAL de ses déductions, dans l'ordre, avec la
// raison de chacune : c'est lui qui permet au robot d'expliquer, et à l'élève
// bloqué de recevoir l'indication suivante — pas la réponse, la déduction.

// --- Les thèmes -------------------------------------------------------------
//
// Une catégorie porte de quoi écrire des phrases correctes : le verbe à
// l'affirmative ET à la négative (le français ne les déduit pas l'un de
// l'autre), et, pour les catégories ordonnées, les comparatifs.

const PRENOMS = ['Léa', 'Tom', 'Inès', 'Noé', 'Jade', 'Malo', 'Zoé', 'Adam'];

export const THEMES = [
    {
        id: 'gouter',
        titre: 'Le goûter d\'anniversaire',
        decor: 'Quatre amis fêtent un anniversaire.',
        sujet: { id: 'enfant', label: 'Enfant', valeurs: PRENOMS },
        attributs: [
            {
                id: 'glace', label: 'Parfum',
                verbe: 'a pris', verbeNeg: 'n\'a pas pris',
                valeurs: ['la glace à la vanille', 'la glace au chocolat', 'la glace à la fraise',
                    'la glace au citron', 'la glace à la pistache'],
                courts: ['vanille', 'chocolat', 'fraise', 'citron', 'pistache']
            },
            {
                id: 'age', label: 'Âge', ordonnee: true,
                verbe: 'a', verbeNeg: 'n\'a pas',
                nombres: [8, 9, 10, 11, 12], unite: 'ans',
                comparatif: { moins: 'est plus jeune que', plus: 'est plus âgé que' },
                ecart: (d) => `a ${d} an${d > 1 ? 's' : ''} de plus que`
            }
        ]
    },
    {
        id: 'mediatheque',
        titre: 'À la médiathèque',
        decor: 'Des élèves empruntent chacun un livre.',
        sujet: { id: 'eleve', label: 'Élève', valeurs: PRENOMS },
        attributs: [
            {
                id: 'livre', label: 'Livre',
                verbe: 'a emprunté', verbeNeg: 'n\'a pas emprunté',
                valeurs: ['le roman', 'la bande dessinée', 'le documentaire',
                    'le recueil de poèmes', 'l\'atlas'],
                courts: ['roman', 'BD', 'documentaire', 'poèmes', 'atlas']
            },
            {
                id: 'pages', label: 'Pages', ordonnee: true,
                verbe: 'a lu', verbeNeg: 'n\'a pas lu',
                nombres: [20, 40, 60, 80, 100], unite: 'pages',
                comparatif: { moins: 'a lu moins de pages que', plus: 'a lu plus de pages que' },
                ecart: (d) => `a lu ${d} pages de plus que`
            }
        ]
    },
    {
        id: 'potager',
        titre: 'Le potager de l\'école',
        decor: 'Chacun s\'occupe d\'une planche du potager.',
        sujet: { id: 'jardinier', label: 'Jardinier', valeurs: PRENOMS },
        attributs: [
            {
                id: 'legume', label: 'Légume',
                verbe: 'cultive', verbeNeg: 'ne cultive pas',
                valeurs: ['des radis', 'des carottes', 'des haricots', 'des courgettes', 'des salades'],
                valeursNeg: ['de radis', 'de carottes', 'de haricots', 'de courgettes', 'de salades'],
                courts: ['radis', 'carottes', 'haricots', 'courgettes', 'salades']
            },
            {
                id: 'plants', label: 'Plants', ordonnee: true,
                verbe: 'a planté', verbeNeg: 'n\'a pas planté',
                nombres: [4, 6, 8, 10, 12], unite: 'plants',
                comparatif: { moins: 'a planté moins que', plus: 'a planté plus que' },
                ecart: (d) => `a planté ${d} plants de plus que`
            }
        ]
    },
    {
        id: 'kermesse',
        titre: 'La kermesse',
        decor: 'Chacun tient un stand de la kermesse.',
        sujet: { id: 'eleve', label: 'Élève', valeurs: PRENOMS },
        attributs: [
            {
                id: 'stand', label: 'Stand',
                verbe: 'tient', verbeNeg: 'ne tient pas',
                valeurs: ['la pêche aux canards', 'le chamboule-tout', 'la barbe à papa',
                    'le stand de maquillage', 'la loterie'],
                courts: ['canards', 'chamboule-tout', 'barbe à papa', 'maquillage', 'loterie']
            },
            {
                id: 'tickets', label: 'Tickets', ordonnee: true,
                verbe: 'a vendu', verbeNeg: 'n\'a pas vendu',
                nombres: [10, 15, 20, 25, 30], unite: 'tickets',
                comparatif: { moins: 'a vendu moins de tickets que', plus: 'a vendu plus de tickets que' },
                ecart: (d) => `a vendu ${d} tickets de plus que`
            }
        ]
    },
    {
        id: 'club',
        titre: 'Le club du mercredi',
        decor: 'Chacun s\'est inscrit à une activité.',
        sujet: { id: 'eleve', label: 'Élève', valeurs: PRENOMS },
        attributs: [
            {
                id: 'activite', label: 'Activité',
                verbe: 'fait', verbeNeg: 'ne fait pas',
                valeurs: ['de la natation', 'du judo', 'de l\'escalade', 'du théâtre', 'de la danse'],
                valeursNeg: ['de natation', 'de judo', 'd\'escalade', 'de théâtre', 'de danse'],
                courts: ['natation', 'judo', 'escalade', 'théâtre', 'danse']
            },
            {
                id: 'duree', label: 'Durée', ordonnee: true,
                verbe: 's\'entraîne', verbeNeg: 'ne s\'entraîne pas',
                nombres: [30, 45, 60, 75, 90], unite: 'minutes', prefixe: 'pendant ',
                comparatif: { moins: 's\'entraîne moins longtemps que', plus: 's\'entraîne plus longtemps que' },
                ecart: (d) => `s'entraîne ${d} minutes de plus que`
            }
        ]
    }
];

// --- Les niveaux ------------------------------------------------------------
//
// La difficulté d'un logigramme tient à trois choses, et à elles seules : le
// nombre de lignes de la grille, le nombre de catégories à croiser, et le type
// des indices. On les fait donc monter dans cet ordre — la taille en dernier,
// parce qu'une grille 5×5 avec des indices faciles reste longue mais simple,
// alors qu'une 3×3 avec des indices croisés fait déjà réfléchir.

export const NIVEAUX = [
    {
        id: 1, label: 'Découverte',
        entites: 3, categories: 2,
        types: ['egal', 'different'],
        aide: 'Une croix dans une case veut dire « ce n\'est pas lui ». Un rond veut dire « c\'est lui » — '
            + 'et alors toute la ligne et toute la colonne se remplissent de croix.'
    },
    {
        id: 2, label: 'Trois amis, deux listes',
        entites: 3, categories: 3,
        types: ['egal', 'different', 'lien'],
        aide: 'Un indice peut relier deux colonnes sans nommer personne : « celui qui a pris le chocolat a neuf ans ».'
    },
    {
        id: 3, label: 'Quatre à croiser',
        entites: 4, categories: 3,
        types: ['different', 'lien'],
        aide: 'Sans aucun indice qui donne directement une réponse : tout se déduit par élimination.'
    },
    {
        id: 4, label: 'Plus grand, plus petit',
        entites: 4, categories: 3,
        types: ['different', 'lien', 'ordre'],
        aide: 'Un indice de comparaison élimine des deux côtés : le plus jeune ne peut pas être le plus âgé, '
            + 'et celui qu\'on dépasse ne peut pas être le premier.'
    },
    {
        id: 5, label: 'L\'écart exact',
        entites: 4, categories: 3,
        types: ['different', 'lien', 'ordre', 'ecart'],
        aide: 'Un écart chiffré est l\'indice le plus fort : il ne laisse que les couples qui tombent juste.'
    },
    {
        id: 6, label: 'Cinq, et rien de donné',
        entites: 5, categories: 3,
        types: ['different', 'lien', 'ordre', 'ecart', 'parmi'],
        aide: 'Un « soit… soit… » ne donne rien tout seul : il faut d\'abord éliminer l\'une des deux branches.'
    }
];

export const niveauDe = (n) => NIVEAUX.find(x => x.id === Number(n)) || NIVEAUX[0];

// --- L'état de la grille ----------------------------------------------------
//
// Une case par couple de valeurs, pour chaque couple de catégories. Trois
// états, et c'est exactement ce qu'on écrit sur le papier : rien, une croix
// (impossible), un rond (certain).

export const INCONNU = 0, OUI = 1, NON = -1;

export const clefPaire = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function creerEtats(nbCategories, n) {
    const etats = {};
    for (let a = 0; a < nbCategories; a++) {
        for (let b = a + 1; b < nbCategories; b++) {
            etats[clefPaire(a, b)] = Array.from({ length: n }, () => new Array(n).fill(INCONNU));
        }
    }
    return etats;
}

/** Lit l'état du couple (catégorie a, valeur i) × (catégorie b, valeur j). */
export function lire(etats, a, i, b, j) {
    const m = etats[clefPaire(a, b)];
    if (!m) return INCONNU;
    return a < b ? m[i][j] : m[j][i];
}

function ecrire(etats, a, i, b, j, val) {
    const m = etats[clefPaire(a, b)];
    if (!m) return false;
    if (a < b) {
        if (m[i][j] === val) return false;
        if (m[i][j] !== INCONNU) throw new Error('contradiction');
        m[i][j] = val;
    } else {
        if (m[j][i] === val) return false;
        if (m[j][i] !== INCONNU) throw new Error('contradiction');
        m[j][i] = val;
    }
    return true;
}

// --- La propagation ---------------------------------------------------------

/**
 * Résout autant que la LOGIQUE PURE le permet, et raconte comment.
 *
 * Aucun essai-erreur, aucun retour en arrière : si cette fonction termine sur
 * une grille pleine, c'est qu'un élève peut y arriver en ne posant que des
 * déductions certaines. C'est le critère qui définit un bon logigramme, et
 * c'est pour cela que le générateur s'en sert comme juge.
 *
 * @returns {{complet:boolean, etats:Object, etapes:Array, contradiction:boolean}}
 */
export function resoudre(puzzle, opts = {}) {
    const { categories, indices } = puzzle;
    const n = categories[0].valeurs.length;
    const nc = categories.length;
    const etats = opts.etats || creerEtats(nc, n);
    const etapes = [];
    let contradiction = false;

    const poser = (a, i, b, j, val, raison) => {
        if (!ecrire(etats, a, i, b, j, val)) return false;
        etapes.push({ a, i, b, j, val, raison });
        return true;
    };

    try {
        let bouge = true;
        let tours = 0;
        while (bouge && tours < 200) {
            bouge = false;
            tours++;

            // 1. Un « oui » vide sa ligne et sa colonne.
            for (let a = 0; a < nc; a++) for (let b = a + 1; b < nc; b++) {
                for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
                    if (lire(etats, a, i, b, j) !== OUI) continue;
                    for (let k = 0; k < n; k++) {
                        if (k !== j && poser(a, i, b, k, NON,
                            'une valeur ne sert qu\'une fois : le reste de la ligne est éliminé')) bouge = true;
                        if (k !== i && poser(a, k, b, j, NON,
                            'une valeur ne sert qu\'une fois : le reste de la colonne est éliminé')) bouge = true;
                    }
                }
            }

            // 2. S'il ne reste qu'une case possible dans une ligne (ou une
            //    colonne), c'est elle. C'est LA déduction du logigramme.
            for (let a = 0; a < nc; a++) for (let b = a + 1; b < nc; b++) {
                for (let i = 0; i < n; i++) {
                    const libres = [];
                    let deja = false;
                    for (let j = 0; j < n; j++) {
                        const v = lire(etats, a, i, b, j);
                        if (v === OUI) deja = true;
                        if (v === INCONNU) libres.push(j);
                    }
                    if (!deja && libres.length === 1
                        && poser(a, i, b, libres[0], OUI, 'toutes les autres cases de la ligne sont barrées')) bouge = true;
                }
                for (let j = 0; j < n; j++) {
                    const libres = [];
                    let deja = false;
                    for (let i = 0; i < n; i++) {
                        const v = lire(etats, a, i, b, j);
                        if (v === OUI) deja = true;
                        if (v === INCONNU) libres.push(i);
                    }
                    if (!deja && libres.length === 1
                        && poser(a, libres[0], b, j, OUI, 'toutes les autres cases de la colonne sont barrées')) bouge = true;
                }
            }

            // 3. La transitivité : c'est elle qui fait qu'un logigramme n'est
            //    pas trois grilles côte à côte mais UNE seule énigme.
            for (let a = 0; a < nc; a++) for (let b = 0; b < nc; b++) for (let c = 0; c < nc; c++) {
                if (a === b || b === c || a === c) continue;
                for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
                    if (lire(etats, a, i, b, j) !== OUI) continue;
                    for (let k = 0; k < n; k++) {
                        const v = lire(etats, b, j, c, k);
                        if (v === INCONNU) continue;
                        if (poser(a, i, c, k, v,
                            v === OUI
                                ? 'les deux sont la même personne : ce qui vaut pour l\'une vaut pour l\'autre'
                                : 'les deux sont la même personne : ce qui est impossible pour l\'une l\'est pour l\'autre')) bouge = true;
                    }
                }
            }

            // 4. Les indices qui ne sont pas de simples faits : comparaisons,
            //    écarts, alternatives. On les repasse à chaque tour, car ils
            //    déduisent d'autant plus que la grille se remplit.
            for (const ind of indices) {
                if (appliquerIndice(ind, { etats, categories, n, poser })) bouge = true;
            }
        }
    } catch (e) {
        if (e.message !== 'contradiction') throw e;
        contradiction = true;
    }

    return { complet: !contradiction && estComplet(etats, nc, n), etats, etapes, contradiction };
}

function estComplet(etats, nc, n) {
    for (let a = 0; a < nc; a++) for (let b = a + 1; b < nc; b++) {
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
            if (lire(etats, a, i, b, j) === INCONNU) return false;
        }
    }
    return true;
}

/** Les valeurs encore possibles pour (catégorie a, valeur i) dans la catégorie o. */
function possibles(etats, a, i, o, n) {
    if (a === o) return [i];
    const out = [];
    for (let p = 0; p < n; p++) if (lire(etats, a, i, o, p) !== NON) out.push(p);
    return out;
}

function appliquerIndice(ind, ctx) {
    const { etats, categories, n, poser } = ctx;
    switch (ind.type) {
        case 'egal':
            return poser(ind.a, ind.i, ind.b, ind.j, OUI, 'l\'indice le dit directement');
        case 'different':
        case 'lien-non':
            return poser(ind.a, ind.i, ind.b, ind.j, NON, 'l\'indice l\'exclut');
        case 'lien':
            return poser(ind.a, ind.i, ind.b, ind.j, OUI, 'l\'indice relie ces deux colonnes');

        // « X est plus jeune que Y » : X ne peut pas prendre les âges les plus
        // élevés qui restent à Y, et Y ne peut pas prendre les plus bas de X.
        case 'ordre': {
            const o = ind.o;
            const nbs = categories[o].nombres;
            // On ramène toujours la comparaison à « le petit, puis le grand » :
            // sans cette normalisation, « X est plus âgé que Y » était propagé
            // comme « X est plus jeune que Y » — et la grille se remplissait à
            // l'envers, en silence.
            const [pa1, pi1, pb1, pj1] = ind.sens === '>'
                ? [ind.b, ind.j, ind.a, ind.i]
                : [ind.a, ind.i, ind.b, ind.j];
            const pa = possibles(etats, pa1, pi1, o, n);
            const pb = possibles(etats, pb1, pj1, o, n);
            if (!pa.length || !pb.length) return false;
            const maxB = Math.max(...pb.map(p => nbs[p]));
            const minA = Math.min(...pa.map(p => nbs[p]));
            let bouge = false;
            for (const p of pa) {
                if (nbs[p] >= maxB && poser(pa1, pi1, o, p, NON,
                    'la comparaison interdit cette valeur : elle serait trop grande')) bouge = true;
            }
            for (const p of pb) {
                if (nbs[p] <= minA && poser(pb1, pj1, o, p, NON,
                    'la comparaison interdit cette valeur : elle serait trop petite')) bouge = true;
            }
            return bouge;
        }

        // « A a 2 ans de plus que B » : ne restent que les couples qui tombent
        // exactement juste.
        case 'ecart': {
            const o = ind.o;
            const nbs = categories[o].nombres;
            const pa = possibles(etats, ind.a, ind.i, o, n);
            const pb = possibles(etats, ind.b, ind.j, o, n);
            let bouge = false;
            for (const p of pa) {
                if (!pb.some(q => nbs[p] === nbs[q] + ind.d)
                    && poser(ind.a, ind.i, o, p, NON, 'aucune valeur ne donnerait l\'écart annoncé')) bouge = true;
            }
            for (const q of pb) {
                if (!pa.some(p => nbs[p] === nbs[q] + ind.d)
                    && poser(ind.b, ind.j, o, q, NON, 'aucune valeur ne donnerait l\'écart annoncé')) bouge = true;
            }
            return bouge;
        }

        // « C'est soit l'un, soit l'autre » : ne sert que lorsqu'il n'en reste
        // qu'un — et c'est justement ce qui le rend difficile.
        case 'parmi': {
            const vivantes = ind.options.filter(op => lire(etats, ind.a, ind.i, op.b, op.j) !== NON);
            if (vivantes.length !== 1) return false;
            const seule = vivantes[0];
            return poser(ind.a, ind.i, seule.b, seule.j, OUI,
                'des deux possibilités annoncées, une seule tient encore');
        }
        default:
            return false;
    }
}

// --- Écrire les indices en français ----------------------------------------

/** Comment on désigne (catégorie a, valeur i) dans une phrase. */
function nommer(categories, a, i) {
    const cat = categories[a];
    if (a === 0) return cat.valeurs[i];
    return `celui qui ${cat.verbe} ${valeurTexte(cat, i)}`;
}

function valeurTexte(cat, i, negatif) {
    if (cat.nombres) return `${cat.prefixe || ''}${cat.nombres[i]} ${cat.unite}`;
    // « fait de la natation » mais « ne fait pas de natation » : après une
    // négation, le partitif tombe. Le français ne le déduit pas tout seul, on
    // le range donc avec la valeur.
    if (negatif && cat.valeursNeg) return cat.valeursNeg[i];
    return cat.valeurs[i];
}

/** Le libellé court d'une valeur, pour les en-têtes de la grille. */
export function etiquette(cat, i) {
    if (cat.nombres) return String(cat.nombres[i]);
    return (cat.courts && cat.courts[i]) || cat.valeurs[i];
}

export function direIndice(ind, categories) {
    const cats = categories;
    switch (ind.type) {
        case 'egal':
        case 'lien': {
            const sujet = nommer(cats, ind.a, ind.i);
            const cat = cats[ind.b];
            return majuscule(`${sujet} ${cat.verbe} ${valeurTexte(cat, ind.j)}.`);
        }
        case 'different':
        case 'lien-non': {
            const sujet = nommer(cats, ind.a, ind.i);
            const cat = cats[ind.b];
            return majuscule(`${sujet} ${cat.verbeNeg} ${valeurTexte(cat, ind.j, true)}.`);
        }
        case 'ordre': {
            const cat = cats[ind.o];
            const verbe = ind.sens === '<' ? cat.comparatif.moins : cat.comparatif.plus;
            return majuscule(`${nommer(cats, ind.a, ind.i)} ${verbe} ${nommer(cats, ind.b, ind.j)}.`);
        }
        case 'ecart': {
            const cat = cats[ind.o];
            return majuscule(`${nommer(cats, ind.a, ind.i)} ${cat.ecart(ind.d)} ${nommer(cats, ind.b, ind.j)}.`);
        }
        case 'parmi': {
            const cat = cats[ind.options[0].b];
            const liste = ind.options.map(op => valeurTexte(cat, op.j));
            return majuscule(`${nommer(cats, ind.a, ind.i)} ${cat.verbe} soit ${liste.join(', soit ')}.`);
        }
        default:
            return '';
    }
}

// « plus âgé que Adam » ne s'écrit pas : on élide, comme on le dirait.
const elider = (t) => t
    .replace(/\bque ([aeiouyâàéèêîôùûAEIOUYÀÂÉÈÊÎÔÙÛ])/g, 'qu\'$1')
    .replace(/\s+/g, ' ');

const majuscule = (t) => {
    const s = elider(t);
    return s.charAt(0).toUpperCase() + s.slice(1);
};

// --- La fabrication ---------------------------------------------------------

/** Tous les indices VRAIS pour cette solution, du type demandé. */
function candidats(categories, solution, types, n, rng) {
    const nc = categories.length;
    const out = [];
    const memeEntite = (a, i, b, j) => solution.findIndex(e => e[a] === i) === solution.findIndex(e => e[b] === j);

    for (let a = 0; a < nc; a++) for (let b = 0; b < nc; b++) {
        if (a === b) continue;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
            const ensemble = memeEntite(a, i, b, j);
            if (a === 0 && ensemble && types.includes('egal')) out.push({ type: 'egal', a, i, b, j });
            if (a === 0 && !ensemble && types.includes('different')) out.push({ type: 'different', a, i, b, j });
            if (a > 0 && b > 0 && ensemble && types.includes('lien')) out.push({ type: 'lien', a, i, b, j });
            if (a > 0 && b > 0 && !ensemble && types.includes('lien')) out.push({ type: 'lien-non', a, i, b, j });
        }
    }

    const o = categories.findIndex(c => c.ordonnee);
    if (o > 0) {
        const valeurDe = (a, i) => {
            const e = solution.find(x => x[a] === i);
            return categories[o].nombres[e[o]];
        };
        for (let a = 0; a < nc; a++) for (let b = 0; b < nc; b++) {
            if (a === o || b === o || a === b) continue;
            for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
                if (a === b && i === j) continue;
                const va = valeurDe(a, i), vb = valeurDe(b, j);
                if (va === vb) continue;
                if (types.includes('ordre')) {
                    out.push({ type: 'ordre', a, i, b, j, o, sens: va < vb ? '<' : '>' });
                }
                if (types.includes('ecart') && va > vb) {
                    out.push({ type: 'ecart', a, i, b, j, o, d: va - vb });
                }
            }
        }
    }

    if (types.includes('parmi')) {
        // « X a soit ceci soit cela » : une vraie et une fausse, dans le désordre.
        for (let b = 1; b < nc; b++) {
            for (let i = 0; i < n; i++) {
                const vrai = solution[i][b];
                const faux = [...Array(n).keys()].filter(j => j !== vrai);
                const autre = rng.pick(faux);
                const options = rng.shuffle([{ b, j: vrai }, { b, j: autre }]);
                out.push({ type: 'parmi', a: 0, i, options });
            }
        }
    }
    return out;
}

/**
 * Fabrique un logigramme résoluble par déduction pure, avec le minimum
 * d'indices.
 *
 * @param {Object} params  { niveau, theme }
 * @param {Object} rng     tirage reproductible
 */
export function genererLogigramme(params = {}, rng) {
    const niv = niveauDe(params.niveau);
    const theme = params.theme
        ? (THEMES.find(t => t.id === params.theme) || THEMES[0])
        : rng.pick(THEMES);
    const n = niv.entites;

    // Les catégories retenues : le sujet, puis autant d'attributs que demandé.
    const attributs = theme.attributs.slice(0, niv.categories - 1);
    const categories = [
        { ...theme.sujet, valeurs: rng.shuffle(theme.sujet.valeurs).slice(0, n) },
        ...attributs.map(at => ({
            ...at,
            valeurs: at.valeurs ? at.valeurs.slice(0, n) : null,
            courts: at.courts ? at.courts.slice(0, n) : null,
            nombres: at.nombres ? at.nombres.slice(0, n) : null
        }))
    ];

    // La solution : chaque entité reçoit une valeur de chaque catégorie.
    const perms = categories.map((c, k) => k === 0
        ? [...Array(n).keys()]
        : rng.shuffle([...Array(n).keys()]));
    const solution = [...Array(n).keys()].map(i => perms.map(p => p[i]));

    // On ajoute des indices jusqu'à ce que la déduction pure suffise…
    const pool = rng.shuffle(candidats(categories, solution, niv.types, n, rng));
    const indices = [];
    let bilan = resoudre({ categories, indices });
    for (const cand of pool) {
        if (bilan.complet) break;
        indices.push(cand);
        bilan = resoudre({ categories, indices });
        if (bilan.contradiction) { indices.pop(); bilan = resoudre({ categories, indices }); }
    }
    if (!bilan.complet) return genererLogigramme({ ...params, theme: theme.id }, rng);

    // … puis on retire tout ce dont on peut se passer : un indice de trop est
    // une déduction volée à l'élève.
    for (let k = indices.length - 1; k >= 0; k--) {
        const sans = indices.filter((_, x) => x !== k);
        if (resoudre({ categories, indices: sans }).complet) indices.splice(k, 1);
    }

    const final = resoudre({ categories, indices });
    return {
        theme: theme.id, titre: theme.titre, decor: theme.decor,
        niveau: niv.id, categories, solution,
        indices: indices.map(ind => ({ ...ind, texte: direIndice(ind, categories) })),
        etapes: final.etapes,
        etats: final.etats
    };
}

/**
 * La saisie de l'élève est-elle juste ? On ne compare qu'aux « ronds » : une
 * croix oubliée n'est pas une faute, c'est une case qu'on n'a pas eu besoin de
 * remplir.
 */
export function verifierSaisie(puzzle, saisie) {
    const { categories, solution } = puzzle;
    const n = categories[0].valeurs.length;
    const nc = categories.length;
    const attendu = (a, i, b, j) => {
        const ea = solution.findIndex(e => e[a] === i);
        const eb = solution.findIndex(e => e[b] === j);
        return ea === eb;
    };
    const fautes = [];
    let poses = 0;
    for (let a = 0; a < nc; a++) for (let b = a + 1; b < nc; b++) {
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
            const v = lire(saisie, a, i, b, j);
            if (v === INCONNU) continue;
            const vrai = attendu(a, i, b, j);
            if ((v === OUI) !== vrai) fautes.push({ a, i, b, j, mis: v });
            else if (v === OUI) poses++;
        }
    }
    // Il faut avoir posé TOUS les ronds : sinon la grille n'est pas finie.
    const attendus = (nc * (nc - 1) / 2) * n;
    return { ok: !fautes.length && poses === attendus, fautes, poses, attendus };
}
