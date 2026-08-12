// LES DOMINOS — une chaîne où chaque question touche sa réponse.
//
// Le domino scolaire ne ressemble au jeu de société que par sa forme. Une
// pièce porte DEUX MOITIÉS : à gauche la réponse d'une autre question, à
// droite une question. On les met bout à bout, et le pli entre deux pièces
// dit toujours la même chose : « voici une question, voici sa réponse ».
//
//     ┌────────┬────────┐┌────────┬────────┐┌────────┬────────┐
//     │ DÉPART │  7 × 8 ││   56   │ 9 × 4  ││   36   │ ARRIVÉE│
//     └────────┴────────┘└────────┴────────┘└────────┴────────┘
//
// TROIS CHOSES ONT COMMANDÉ CE MODULE.
//
//   1. IL EST AUTO-CORRECTIF. L'élève sait qu'il a fini sans qu'on le lui
//      dise : la dernière pièce porte ARRIVÉE, et il ne lui reste rien en
//      main. C'est ce qui fait la valeur de ce jeu en classe — le professeur
//      n'a pas à passer dans les rangs pour valider.
//   2. IL N'Y A QU'UNE FAÇON DE FINIR. Deux questions qui auraient la même
//      réponse rendraient la chaîne ambiguë : on pourrait intervertir deux
//      pièces et arriver au bout quand même. On exige donc des réponses
//      DEUX À DEUX DIFFÉRENTES, et c'est la seule contrainte du module.
//   3. IL NE FABRIQUE AUCUNE QUESTION. Les couples viennent des générateurs
//      qui existent déjà — les tables, les fractions, les périmètres, les
//      écritures d'un nombre. Un jeu de dominos par notion, sans écrire une
//      question de plus.

export const DEPART = 'DÉPART';
export const ARRIVEE = 'ARRIVÉE';

/** En dessous, ce n'est plus une chaîne ; au-dessus, ça ne tient plus sur une page. */
export const MIN_COUPLES = 3;
export const MAX_COUPLES = 15;

/**
 * Le texte d'une question tel qu'il s'écrit sur une moitié de domino.
 *
 * « 7 × 8 = ? » s'écrit « 7 × 8 » : la moitié d'à côté EST le « = ? ». Le
 * signe égal seul tombe pour la même raison — et parce que « quarante-trois
 * mille huit cent dix-sept = fait 43 817 » ne se lit pas.
 *
 * Le signe n'est retiré que s'il TERMINE la question : « 9 × ... = 63 » et
 * « 20 + ? = 100 » gardent tout, l'égalité y est l'énoncé.
 */
export function compacter(texte) {
    return String(texte ?? '').replace(/\s*=\s*\??\s*$/, '').trim();
}

/**
 * Rassemble des couples question/réponse tous différents.
 *
 * @param {() => ({q:string, r:string, item?:Object}|null)} tirer
 *        Un tirage ; il peut resservir une question déjà vue, c'est ici qu'on
 *        l'écarte.
 * @param {number} voulu   nombre de couples souhaité
 * @param {number} [essais] tirages autorisés avant d'abandonner
 * @returns {Array} les couples retenus — éventuellement MOINS que voulu : tous
 *        les générateurs n'ont pas dix réponses différentes à offrir (une
 *        division par une table n'en a que neuf), et une chaîne un peu plus
 *        courte vaut mieux qu'une chaîne ambiguë.
 */
export function rassemblerCouples(tirer, voulu, essais = 0) {
    const max = essais || Math.max(60, voulu * 25);
    const couples = [];
    const questions = new Set();
    const reponses = new Set();
    for (let k = 0; k < max && couples.length < voulu; k++) {
        const c = tirer();
        if (!c) break;
        const q = compacter(c.q);
        const r = String(c.r ?? '').trim();
        // Une réponse vide ne se pose pas ; une réponse déjà vue rendrait la
        // chaîne ambiguë ; une question déjà vue ferait un doublon visible.
        if (!q || !r || questions.has(q) || reponses.has(r)) continue;
        // « 56 » à droite ET « 56 » à gauche d'une autre pièce : l'élève ne
        // saurait plus si la moitié qu'il lit est une question ou une réponse.
        if (reponses.has(q) || questions.has(r) || q === r) continue;
        questions.add(q);
        reponses.add(r);
        couples.push({ q, r, item: c.item || null });
    }
    return couples;
}

/**
 * Monte la chaîne : n couples donnent n + 1 pièces.
 *
 * La première ne porte pas de réponse (c'est le départ), la dernière pas de
 * question (c'est l'arrivée). Entre les deux, chaque pièce porte la réponse de
 * la question précédente et une question neuve.
 */
export function construireChaine(couples) {
    const pieces = couples.map((c, i) => ({
        id: i,
        gauche: i === 0 ? DEPART : couples[i - 1].r,
        droite: c.q,
        // Ce que le joint de GAUCHE de cette pièce vérifie : rien pour la
        // première, sinon la question de la pièce d'avant.
        couple: i === 0 ? null : couples[i - 1]
    }));
    pieces.push({
        id: couples.length,
        gauche: couples.length ? couples[couples.length - 1].r : DEPART,
        droite: ARRIVEE,
        couple: couples.length ? couples[couples.length - 1] : null
    });
    return { couples, pieces };
}

/** L'identifiant de la pièce qui vient après les `posees` déjà en place. */
export const pieceSuivante = (chaine, posees) =>
    posees < chaine.pieces.length ? posees : null;

/** La moitié laissée ouverte à droite de la chaîne en cours. */
export function boutOuvert(chaine, posees) {
    if (posees <= 0) return null;
    const derniere = chaine.pieces[Math.min(posees, chaine.pieces.length) - 1];
    return derniere.droite;
}

/** Cette pièce est-elle celle qui doit venir maintenant ? */
export const posePossible = (chaine, posees, id) => id === pieceSuivante(chaine, posees);

/**
 * Ce que le robot dit — et ce qu'on répond à l'élève qui s'est trompé.
 * Jamais la réponse toute crue : la question qu'il faut se poser, puis le
 * calcul, puis la moitié qu'on va chercher.
 */
export function direJoint(chaine, id) {
    const piece = chaine.pieces[id];
    if (!piece || !piece.couple) return 'On commence par la pièce marquée DÉPART.';
    const { q, r } = piece.couple;
    return `Le bout ouvert demande « ${q} ». ${q} fait ${r} : je cherche donc la pièce qui porte ${r} à gauche.`;
}

/** La correction d'une pièce mal posée : pourquoi celle-là ne va pas. */
export function direErreur(chaine, posees, id) {
    const attendue = chaine.pieces[pieceSuivante(chaine, posees)];
    const jouee = chaine.pieces[id];
    const bout = boutOuvert(chaine, posees);
    if (!jouee || !attendue) return 'Cette pièce ne peut pas venir ici.';
    return `Le bout ouvert demande « ${bout} », et cette pièce porte ${jouee.gauche} à gauche. `
        + `Ce n'est pas la réponse de « ${bout} ».`;
}

/**
 * L'ordre dans lequel la réserve est présentée à l'élève : les pièces à poser,
 * mélangées. La pièce de DÉPART n'y est pas — elle est déjà sur la table, sans
 * quoi l'élève commencerait par chercher quelque chose qui ne se cherche pas.
 */
export function reserveMelangee(chaine, rng) {
    const ids = chaine.pieces.slice(1).map(p => p.id);
    return rng && rng.shuffle ? rng.shuffle(ids) : ids;
}

/** La chaîne, écrite en une ligne : de quoi corriger sur le papier. */
export const direChaine = (chaine) =>
    chaine.pieces.map(p => `${p.gauche} | ${p.droite}`).join('  →  ');
