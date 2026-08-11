// MULTIPLIER ET DIVISER PAR 10, 100, 1000 — et la virgule qui ne bouge pas.
//
// « Pour multiplier par 10, on décale la virgule d'un rang vers la droite. »
// La phrase est partout, et elle est fausse — ou plutôt, elle décrit ce qu'on
// voit sans dire ce qui se passe. Elle produit deux erreurs qui durent des
// années :
//
//   « ON AJOUTE UN ZÉRO ». Vrai pour les entiers, faux dès la première
//   décimale : 2,5 × 10 ne fait pas 2,50 — qui est le même nombre.
//   LA VIRGULE MOBILE. Un objet qui se promène dans le nombre n'a aucun sens :
//   la virgule marque la frontière entre les unités et les dixièmes, et cette
//   frontière ne bouge jamais.
//
// Ce qui se passe réellement, on peut le VOIR dans un tableau de numération :
// chaque chiffre CHANGE DE RANG. Multiplier par 10, c'est faire glisser tous
// les chiffres d'une colonne vers la gauche — chacun vaut alors dix fois plus.
// La virgule, elle, reste à sa place. C'est ce glissement que l'exercice fait
// manipuler avant de demander quoi que ce soit.
//
// Ce module ne connaît ni le DOM ni l'animation. Il tient les nombres SOUS
// FORME DE TEXTE — jamais de flottants : 0.1 × 3 vaut 0.30000000000000004 en
// binaire, et un exercice sur les décimaux ne peut pas se permettre ça.

/** Les rangs, du plus grand au plus petit. La clé est l'exposant de 10. */
export const RANGS = [
    { e: 4, nom: 'dizaines de mille', court: 'd. mille' },
    { e: 3, nom: 'unités de mille', court: 'mille' },
    { e: 2, nom: 'centaines', court: 'cent.' },
    { e: 1, nom: 'dizaines', court: 'diz.' },
    { e: 0, nom: 'unités', court: 'unités' },
    { e: -1, nom: 'dixièmes', court: 'dixièmes' },
    { e: -2, nom: 'centièmes', court: 'centièmes' },
    { e: -3, nom: 'millièmes', court: 'millièmes' }
];

/** Le nom d'un rang, au singulier quand on parle d'un seul chiffre. */
export function nomRang(e) {
    return (RANGS.find(r => r.e === e) || {}).nom || `10^${e}`;
}

/** Découpe un nombre écrit en partie entière et partie décimale. */
function parties(texte) {
    const [ent, dec = ''] = String(texte).replace('.', ',').split(',');
    return [ent || '0', dec];
}

/** Écriture normalisée : sans zéros inutiles devant ni derrière. */
export function normaliser(texte) {
    let [ent, dec] = parties(texte);
    ent = ent.replace(/^0+(?=\d)/, '') || '0';
    dec = dec.replace(/0+$/, '');
    return dec ? `${ent},${dec}` : ent;
}

/**
 * DÉCALE LES CHIFFRES de k rangs — c'est toute l'opération.
 *
 * k > 0 : chaque chiffre monte d'un rang (× 10 par cran).
 * k < 0 : chaque chiffre descend (÷ 10 par cran).
 *
 * Tout se fait sur le TEXTE, chiffre par chiffre. Passer par un flottant
 * introduirait des poussières binaires (0,1 × 3 = 0,30000000000000004) dans un
 * exercice dont le sujet est précisément l'écriture décimale.
 */
export function decaler(texte, k) {
    let [ent, dec] = parties(normaliser(texte));
    let n = k;
    while (n > 0) { ent += dec[0] ?? '0'; dec = dec.slice(1); n--; }
    while (n < 0) { dec = (ent.slice(-1) || '0') + dec; ent = ent.slice(0, -1); n++; }
    return normaliser(`${ent || '0'},${dec}`);
}

/**
 * Où se trouve chaque chiffre du nombre, dans le tableau de numération.
 * Le rang du dernier chiffre entier est 0 (les unités) — c'est la définition.
 */
export function placer(texte) {
    const [ent, dec] = parties(normaliser(texte));
    const out = [];
    [...ent].forEach((c, i) => out.push({ chiffre: c, e: ent.length - 1 - i }));
    [...dec].forEach((c, i) => out.push({ chiffre: c, e: -1 - i }));
    return out;
}

/**
 * LES ZÉROS QU'IL FAUT ÉCRIRE, et qu'on oublie.
 *
 * Après × 1000, les chiffres de 77,77 occupent les rangs 4 à 1 : la colonne des
 * unités est VIDE. Or on lit 77770, pas 7777. Un tableau de numération qui
 * laisserait ce trou mentirait — et c'est exactement le trou dans lequel
 * l'élève tombe quand il écrit 7777.
 *
 * Même chose de l'autre côté : 0,25 a un zéro aux unités, qui n'est pas
 * décoratif. On complète donc jusqu'à la colonne des unités, toujours.
 */
export function combler(cases) {
    if (!cases.length) return cases;
    const occupes = new Map(cases.map(c => [c.e, c]));
    // On va toujours JUSQU'AUX UNITÉS, dans un sens comme dans l'autre : c'est
    // la colonne qui ancre le nombre, et celle qu'on n'a pas le droit de
    // laisser vide.
    const haut = Math.max(0, ...cases.map(c => c.e));
    const bas = Math.min(0, ...cases.map(c => c.e));
    const out = [];
    for (let e = haut; e >= bas; e--) {
        out.push(occupes.has(e) ? { ...occupes.get(e) } : { chiffre: '0', e, implicite: true });
    }
    return out;
}

/** Les rangs occupés, du plus haut au plus bas. */
export function etendue(texte) {
    const p = placer(texte);
    return { haut: Math.max(...p.map(x => x.e)), bas: Math.min(...p.map(x => x.e)) };
}

// --- Les questions ---------------------------------------------------------------

const FACTEURS = { 10: 1, 100: 2, 1000: 3 };

const NIVEAUX = {
    facile: { facteurs: [10, 100], operateurs: ['×'], decimales: [1, 2], entier: [1, 99] },
    moyen: { facteurs: [10, 100, 1000], operateurs: ['×', '÷'], decimales: [1, 2], entier: [1, 999] },
    difficile: { facteurs: [10, 100, 1000], operateurs: ['×', '÷'], decimales: [1, 2, 3], entier: [1, 999] }
};

export const IDS_NIVEAUX = Object.keys(NIVEAUX);
export const PHASES = ['glisser', 'qcm', 'ecrire'];

/**
 * Tire une question.
 *
 * Le nombre de départ a TOUJOURS une partie décimale. Avec des entiers, « ×10 =
 * on ajoute un zéro » marche, et l'élève repart avec sa règle fausse
 * renforcée : c'est précisément le cas qu'il ne faut pas proposer.
 */
export function tirerQuestion(niveau, rng) {
    const N = NIVEAUX[niveau] || NIVEAUX.facile;
    const facteur = rng.pick(N.facteurs);
    const k = FACTEURS[facteur];
    const op = rng.pick(N.operateurs);

    for (let essai = 0; essai < 60; essai++) {
        const nd = rng.pick(N.decimales);
        const ent = rng.int(N.entier[0], N.entier[1]);
        let dec = '';
        for (let i = 0; i < nd; i++) dec += rng.int(0, 9);
        dec = dec.replace(/0+$/, '');
        if (!dec) continue;                        // il FAUT une partie décimale
        const depart = normaliser(`${ent},${dec}`);
        const rangs = op === '×' ? k : -k;
        const resultat = decaler(depart, rangs);
        // Un résultat démesuré ne se lit plus dans un tableau de numération.
        const e = etendue(resultat);
        if (e.haut > 4 || e.bas < -3) continue;

        return {
            depart, op, facteur, rangs, resultat, niveau,
            choix: propositions(depart, op, k, resultat, rng),
            etapes: expliquer({ depart, op, facteur, rangs, resultat })
        };
    }
    // Filet : un cas simple, toujours valable.
    const depart = '2,5';
    return {
        depart, op: '×', facteur: 10, rangs: 1, resultat: '25', niveau,
        choix: propositions(depart, '×', 1, '25', rng),
        etapes: expliquer({ depart, op: '×', facteur: 10, rangs: 1, resultat: '25' })
    };
}

/**
 * Les quatre propositions — dont les TROIS ERREURS QUI COMPTENT.
 *
 * Une distractrice tirée au hasard ne sert qu'à faire rater. Celles-ci sont le
 * résultat exact de chacune des trois fausses règles : le zéro ajouté, le
 * décalage dans le mauvais sens, et le décalage du mauvais nombre de rangs.
 * On peut donc dire à l'élève ce qu'il a fait, et pas seulement qu'il s'est
 * trompé.
 */
export function propositions(depart, op, k, resultat, rng) {
    const sens = op === '×' ? 1 : -1;
    const cand = [
        { v: resultat, juste: true },
        {
            v: normaliser(depart + '0'.repeat(k) === depart ? depart : ajouterZeros(depart, k)),
            pourquoi: `« Ajouter un zéro » ne marche que pour les entiers. ${depart} et ${ajouterZeros(depart, k)} sont le MÊME nombre — on n'a rien multiplié.`
        },
        {
            v: decaler(depart, -sens * k),
            pourquoi: op === '×'
                ? 'Décalage dans le mauvais sens : multiplier rend le nombre plus GRAND.'
                : 'Décalage dans le mauvais sens : diviser rend le nombre plus PETIT.'
        },
        {
            v: decaler(depart, sens * (k === 1 ? 2 : k - 1)),
            pourquoi: `Ce n'est pas le bon nombre de rangs : ${op === '×' ? 'multiplier' : 'diviser'} par ${k === 1 ? 10 : Math.pow(10, k)} décale de ${k} rang${k > 1 ? 's' : ''}.`
        }
    ];

    const vus = new Set();
    const gardes = [];
    for (const c of cand) {
        const v = normaliser(c.v);
        if (vus.has(v)) continue;
        vus.add(v);
        gardes.push({ ...c, v });
    }
    // S'il manque des propositions (deux erreurs tombant sur la même valeur),
    // on complète par des décalages voisins plutôt que par du hasard.
    let extra = 1;
    while (gardes.length < 4 && extra < 5) {
        const v = normaliser(decaler(depart, sens * (k + extra)));
        if (!vus.has(v)) {
            vus.add(v);
            gardes.push({ v, pourquoi: `Trop de rangs : ${op} ${Math.pow(10, k)} en décale ${k}.` });
        }
        extra++;
    }
    return rng ? rng.shuffle(gardes.slice(0, 4)) : gardes.slice(0, 4);
}

/** « 2,5 » avec k zéros collés au bout : le même nombre, écrit plus long. */
export function ajouterZeros(texte, k) {
    const [ent, dec] = parties(normaliser(texte));
    return `${ent},${dec}${'0'.repeat(k)}`;
}

/** La correction, une ligne par idée. */
export function expliquer(q) {
    const k = Math.abs(q.rangs);
    const sens = q.rangs > 0 ? 'la gauche' : 'la droite';
    const p = placer(q.depart);
    const premier = p[0];
    const arrivee = premier.e + q.rangs;
    return [
        `${q.op} ${q.facteur}, c'est faire glisser chaque chiffre de ${k} rang${k > 1 ? 's' : ''} vers ${sens}.`,
        `Le ${premier.chiffre} passe des ${nomRang(premier.e)} aux ${nomRang(arrivee)}.`,
        `La virgule ne bouge pas : elle reste entre les unités et les dixièmes. On lit ${q.resultat}.`
    ];
}

/** Le glissement proposé est-il celui qu'il fallait ? */
export function verifierGlissement(q, rangsFaits) {
    if (rangsFaits === q.rangs) return { ok: true };
    const trop = Math.abs(rangsFaits) > Math.abs(q.rangs);
    const bonSens = Math.sign(rangsFaits) === Math.sign(q.rangs) || rangsFaits === 0;
    if (!bonSens) {
        return {
            ok: false, faute: 'sens',
            message: q.op === '×'
                ? 'Mauvais sens : multiplier rend le nombre plus GRAND, donc les chiffres montent vers la gauche.'
                : 'Mauvais sens : diviser rend le nombre plus PETIT, donc les chiffres descendent vers la droite.'
        };
    }
    return {
        ok: false, faute: 'rangs',
        message: `${q.op} ${q.facteur} décale de ${Math.abs(q.rangs)} rang${Math.abs(q.rangs) > 1 ? 's' : ''}, tu en as fait ${Math.abs(rangsFaits)}${trop ? ' — un de trop' : ''}.`
    };
}

/** La valeur écrite est-elle la bonne ? Deux écritures du même nombre passent. */
export function verifierEcriture(q, texte) {
    const t = String(texte ?? '').trim();
    if (!t || !/^\d+([.,]\d+)?$/.test(t)) {
        return { ok: false, faute: 'vide', message: 'Écris le résultat — la virgule est acceptée.' };
    }
    const donne = normaliser(t);
    if (donne === normaliser(q.resultat)) return { ok: true };
    // Le zéro inutile : « 25,0 » est le bon nombre mal écrit. On l'accepte en
    // le disant, plutôt que de refuser une réponse juste.
    const mauvaise = propositions(q.depart, q.op, Math.abs(q.rangs), q.resultat, null)
        .find(c => !c.juste && c.v === donne);
    return {
        ok: false,
        faute: mauvaise ? 'connue' : 'autre',
        message: mauvaise ? mauvaise.pourquoi
            : `Ce n'est pas ça. Repose le nombre dans le tableau et fais glisser les chiffres.`
    };
}
