// L'ARBRE DES PHRASES — écrire un programme de construction sans clavier.
//
// Rémy : « sur le programme de construction je pense qu'il faut faire
// différemment. On pourrait cliquer sur "trace" ou "place", un arbre s'ouvre
// avec les mots possibles et ainsi de suite, tu comprends ? »
//
// CE QUI N'ALLAIT PAS DANS LA ZONE DE TEXTE. L'exercice demande de trouver la
// SUITE DES TRACÉS ; la zone de texte, elle, demandait en plus de taper la
// tournure exacte du chapitre — crochets, parenthèses, « passant par »,
// « d'origine ». Deux difficultés dans la même case, dont une seule est la
// leçon. L'élève qui savait quoi tracer se faisait refuser sa phrase pour une
// parenthèse, et celui qui ne savait pas restait devant une page blanche : dans
// les deux cas, ce qu'on mesure n'est pas ce qu'on voulait mesurer.
//
// L'ARBRE RÈGLE LES DEUX D'UN COUP. On part du verbe — « Place » ou « Trace »,
// il n'y en a pas d'autre —, on choisit ce qu'on trace, puis on désigne les
// points un par un. À chaque niveau, LES SEULS MOTS PROPOSÉS SONT CEUX QUI
// PEUVENT SUIVRE : la phrase produite est donc toujours bien écrite, et l'élève
// LIT la tournure autant de fois qu'il compose. On n'a rien retiré de la
// difficulté — quel objet, à partir de quels points, dans quel ordre — on a
// retiré la dactylographie.
//
// ET LES POINTS PROPOSÉS SONT CEUX QUI EXISTENT. C'est la deuxième leçon, et
// elle est gratuite ici : un programme est une SUITE, on ne trace pas [AB]
// avant d'avoir placé A et B. L'arbre ne propose donc que les points déjà
// posés — l'erreur d'ordre devient impossible au lieu d'être signalée après
// coup.
//
// LE CLAVIER RESTE SUR LE PAPIER. La fiche imprimée, elle, fait écrire la
// phrase entière à la main : c'est l'exercice du contrôle, et c'est là qu'il a
// sa place — sur une feuille, personne ne peut proposer les mots possibles.
//
// CE MODULE NE DESSINE RIEN. Il dit, pour un chemin en cours, quels mots
// peuvent suivre ; l'écran les met en boutons. C'est ce qui permet de le tester
// sans navigateur.

import { OPERATIONS, ORDRE_OPERATIONS, nomObjet } from './programmeConstruction.js';

/** Les deux seuls verbes d'un programme de construction. */
export const VERBES = ['Place', 'Trace'];

/**
 * Le verbe d'une opération : le premier mot de son gabarit.
 *
 * On ne le déclare nulle part, et c'est voulu : le gabarit EST la phrase, et
 * une opération ajoutée un jour apportera son verbe avec elle. Un tableau à
 * tenir à jour à côté finirait par ne plus dire la même chose.
 */
export function verbeDe(op) {
    const debut = String((op && op.gabarit && op.gabarit[0]) || '');
    const mot = debut.split(' ')[0];
    return VERBES.includes(mot) ? mot : 'Trace';
}

/**
 * LE SQUELETTE DE LA PHRASE, verbe retiré et trous montrés.
 *
 * « le segment [__] », « le cercle de centre _ passant par _ ». C'est ce qu'on
 * écrit sur le bouton : l'élève choisit une TOURNURE, pas un mot-clé, et il
 * voit les crochets avant de les avoir mérités.
 */
export function squeletteDe(op, trou = '_') {
    const bouts = (op && op.gabarit) || [];
    let texte = bouts.map(b => (typeof b === 'string' ? b : trou)).join('').trim();
    const verbe = verbeDe(op);
    if (texte.startsWith(`${verbe} `)) texte = texte.slice(verbe.length + 1);
    // « Place les points » n'a pas de trou dans son gabarit — sa phrase se
    // termine par une liste de lettres, pas par une case. Sans ce marqueur, le
    // bouton se lisait « les points » et rien n'annonçait la suite.
    return bouts.some(b => typeof b !== 'string') ? texte : `${texte} ${trou}`;
}

/**
 * La phrase en cours d'écriture, avec ce qui reste en pointillés.
 *
 * @param {{verbe: string|null, op: string|null, args: string[]}} chemin
 */
export function phraseEnCours(chemin) {
    if (!chemin || !chemin.verbe) return '';
    const op = chemin.op ? OPERATIONS[chemin.op] : null;
    if (!op) return `${chemin.verbe}…`;
    const args = chemin.args || [];
    // L'OPÉRATION « PLACER DES POINTS » N'A PAS DE TROUS DANS SON GABARIT : sa
    // phrase se construit à partir de la liste des lettres, et son libellé sait
    // déjà l'écrire — « Place 3 points A, B et C ».
    if (op.id === 'points') {
        return args.length ? op.libelle(args) : `${chemin.verbe} ${squeletteDe(op, '…')}`;
    }
    let i = -1;
    const texte = (op.gabarit || []).map(b => {
        if (typeof b === 'string') return b;
        i += 1;
        return args[i] !== undefined ? args[i] : '_';
    }).join('');
    return texte;
}

/** La phrase terminée, ou `null` si elle ne l'est pas. */
export function phraseFinie(chemin) {
    if (!chemin || !chemin.op) return null;
    const op = OPERATIONS[chemin.op];
    const args = chemin.args || [];
    if (!op) return null;
    if (op.id === 'points') return args.length ? op.libelle(args) : null;
    return args.length === (op.prend || []).length ? op.libelle(args) : null;
}

/**
 * CE QUI PEUT SUIVRE, ICI, MAINTENANT.
 *
 * @param {Object} chemin - { verbe, op, args }
 * @param {Object} ctx
 * @param {Object[]} ctx.operations - les opérations autorisées par les réglages
 * @param {Object} ctx.points - les points qui EXISTENT (nom → coordonnées)
 * @param {Object[]} ctx.objets - les tracés déjà obtenus
 * @param {string[]} ctx.lettres - les lettres que le niveau donne à placer
 * @returns {{genre: string, titre: string, choix: Array, fini: boolean}}
 */
export function branches(chemin, ctx = {}) {
    const operations = ctx.operations && ctx.operations.length
        ? ctx.operations : ORDRE_OPERATIONS.map(id => OPERATIONS[id]);
    const points = ctx.points || {};
    const objets = ctx.objets || [];
    const lettres = ctx.lettres || [];

    // 1. LE VERBE. On ne montre que les verbes qui mènent quelque part : sans
    // point posé, « Trace » n'a aucune suite possible, et un bouton qui ouvre
    // sur une liste vide est une impasse qu'on aurait pu éviter.
    if (!chemin || !chemin.verbe) {
        const utiles = operations.filter(op => estJouable(op, points, objets, lettres));
        const vus = [];
        VERBES.forEach(v => {
            if (utiles.some(op => verbeDe(op) === v)) vus.push({ valeur: v, mot: `${v}…` });
        });
        return { genre: 'verbe', titre: 'Par quel mot commence la phrase ?', choix: vus, fini: false };
    }

    // 2. CE QU'ON PLACE, OU CE QU'ON TRACE.
    if (!chemin.op) {
        const choix = operations
            .filter(op => verbeDe(op) === chemin.verbe && estJouable(op, points, objets, lettres))
            .map(op => ({ valeur: op.id, mot: squeletteDe(op), aide: op.bouton }));
        return { genre: 'objet', titre: `${chemin.verbe} quoi ?`, choix, fini: false };
    }

    const op = OPERATIONS[chemin.op];
    const args = chemin.args || [];

    // 3a. LES LETTRES À PLACER. On en prend autant qu'on veut, et la phrase se
    // termine quand on le dit : « Place 2 points A et B » est une seule phrase.
    if (op.id === 'points') {
        const reste = lettres.filter(l => !args.includes(l) && !points[l]);
        return {
            genre: 'lettres',
            titre: args.length ? 'Un autre point, ou c\'est tout ?' : 'Quels points ?',
            choix: reste.map(l => ({ valeur: l, mot: l })),
            fini: args.length > 0
        };
    }

    // 3b. LES ARGUMENTS, DANS L'ORDRE DU GABARIT.
    const prend = op.prend || [];
    if (args.length >= prend.length) {
        return { genre: 'complet', titre: '', choix: [], fini: true };
    }
    const sorte = prend[args.length];
    if (sorte === 'objet') {
        return {
            genre: 'objet-trace',
            titre: 'Quel tracé ?',
            choix: objets.map(o => nomObjet(o, points)).filter((n, i, t) => n && t.indexOf(n) === i)
                .map(n => ({ valeur: n, mot: n })),
            fini: false
        };
    }
    // DEUX FOIS LE MÊME POINT NE DÉFINIT RIEN. « Le segment [AA] » n'est pas un
    // segment, « le cercle de centre A passant par A » n'a pas de rayon : les
    // deux premiers arguments d'une opération désignent une direction, et une
    // direction demande deux points DISTINCTS. On retire donc le point déjà
    // choisi — plutôt que de le proposer et de refuser la phrase ensuite.
    //
    // Le troisième argument, lui, reste libre : « la perpendiculaire à (AB)
    // passant par A » est une phrase juste, et c'est même souvent celle qu'on
    // veut.
    const paire = args.length === 1 && prend[0] === 'point' && prend[1] === 'point';
    return {
        genre: 'point',
        titre: 'Quel point ?',
        choix: Object.keys(points).sort()
            .filter(n => !(paire && n === args[0]))
            .map(n => ({ valeur: n, mot: n })),
        fini: false
    };
}

/**
 * Cette opération peut-elle produire une phrase, ici et maintenant ?
 *
 * Deux points existants pour un segment, deux tracés pour une intersection, une
 * lettre encore à placer pour « Place les points ». Sans ce filtre, l'arbre
 * proposerait « Trace le cercle » sur une figure vide et l'élève tomberait sur
 * une liste de points vide, sans savoir ce qu'il a mal fait.
 */
function estJouable(op, points, objets, lettres) {
    if (!op) return false;
    if (op.id === 'points') return lettres.some(l => !points[l]);
    const prend = op.prend || [];
    const nbPoints = prend.filter(s => s !== 'objet').length;
    const nbObjets = prend.filter(s => s === 'objet').length;
    return Object.keys(points).length >= nbPoints && objets.length >= nbObjets;
}

/** Le chemin après un clic : on descend d'un cran. */
export function descendre(chemin, valeur) {
    const c = { verbe: null, op: null, args: [], ...(chemin || {}) };
    if (!c.verbe) return { verbe: valeur, op: null, args: [] };
    if (!c.op) return { verbe: c.verbe, op: valeur, args: [] };
    return { verbe: c.verbe, op: c.op, args: [...c.args, valeur] };
}

/** Le chemin après un « ← » : on remonte d'un cran. */
export function remonter(chemin) {
    const c = { verbe: null, op: null, args: [], ...(chemin || {}) };
    if (c.args.length) return { verbe: c.verbe, op: c.op, args: c.args.slice(0, -1) };
    if (c.op) return { verbe: c.verbe, op: null, args: [] };
    return { verbe: null, op: null, args: [] };
}
