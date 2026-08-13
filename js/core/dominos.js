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

// Le TYPE d'une moitié. C'est lui qui fait la règle du jeu, et il la rend
// symétrique : deux moitiés se touchent quand l'une est une question et
// l'autre SA réponse — peu importe laquelle est à gauche. C'est exactement la
// règle des vrais dominos (deux moitiés se touchent quand elles portent le
// même nombre de points), et c'est ce qui autorise à retourner une pièce.
export const QUESTION = 'question';
export const REPONSE = 'reponse';
export const BOUT = 'bout';          // DÉPART et ARRIVÉE ne se marient à rien

/**
 * Monte la chaîne : n couples donnent n + 1 pièces.
 *
 * La première ne porte pas de réponse (c'est le départ), la dernière pas de
 * question (c'est l'arrivée). Entre les deux, chaque pièce porte la réponse de
 * la question précédente et une question neuve.
 */
export function construireChaine(couples) {
    const bout = (texte) => ({ texte, type: BOUT, couple: -1 });
    const question = (k) => ({ texte: couples[k].q, type: QUESTION, couple: k });
    const reponse = (k) => ({ texte: couples[k].r, type: REPONSE, couple: k });

    const pieces = couples.map((c, i) => ({
        id: i,
        demis: [i === 0 ? bout(DEPART) : reponse(i - 1), question(i)]
    }));
    pieces.push({
        id: couples.length,
        demis: [couples.length ? reponse(couples.length - 1) : bout(DEPART), bout(ARRIVEE)]
    });
    // `gauche`, `droite` et `couple` restent lisibles tels quels : c'est ce que
    // regardent l'impression et les explications.
    pieces.forEach(p => {
        p.gauche = p.demis[0].texte;
        p.droite = p.demis[1].texte;
        p.couple = p.demis[0].couple >= 0 ? couples[p.demis[0].couple] : null;
    });
    return { couples, pieces };
}

/** La moitié qui se présente à gauche (0) ou à droite (1) d'une pièce posée. */
export const demiDe = (piece, cote, retourne) => piece.demis[retourne ? 1 - cote : cote];

/** Ces deux moitiés peuvent-elles se toucher ? */
export const seMarient = (a, b) =>
    !!a && !!b && a.type !== BOUT && b.type !== BOUT
    && a.couple === b.couple && a.type !== b.type;

/**
 * L'état d'un plateau : les pièces posées, chacune avec son sens.
 * Le plateau commence VIDE — on pose la première pièce où l'on veut, puis la
 * chaîne s'allonge des deux côtés. C'est ce qui donne un sens à retourner une
 * pièce : sans deuxième bout, on ne retourne jamais rien.
 */
export const plateauVide = () => ({ posees: [] });

/** Les deux moitiés exposées du plateau : celle de gauche, celle de droite. */
export function boutsLibres(chaine, etat) {
    if (!etat.posees.length) return { gauche: null, droite: null };
    const p = etat.posees;
    return {
        gauche: demiDe(chaine.pieces[p[0].id], 0, p[0].retourne),
        droite: demiDe(chaine.pieces[p[p.length - 1].id], 1, p[p.length - 1].retourne)
    };
}

/**
 * Cette pièce peut-elle se poser de ce côté, et dans quel sens ?
 * @returns {{retourne:boolean}|null}
 */
export function poseAdmise(chaine, etat, id, cote) {
    const piece = chaine.pieces[id];
    if (!piece || etat.posees.some(x => x.id === id)) return null;
    if (!etat.posees.length) return { retourne: false };   // la première va où elle veut
    const bouts = boutsLibres(chaine, etat);
    const cible = cote === 'gauche' ? bouts.gauche : bouts.droite;
    for (const retourne of [false, true]) {
        // Posée à GAUCHE, c'est sa moitié de droite qui touche la chaîne.
        const mienne = demiDe(piece, cote === 'gauche' ? 1 : 0, retourne);
        if (seMarient(cible, mienne)) return { retourne };
    }
    return null;
}

/** Pose la pièce, si elle a le droit. Renvoie un NOUVEL état, ou null. */
export function poserPiece(chaine, etat, id, cote) {
    const sens = poseAdmise(chaine, etat, id, cote);
    if (!sens) return null;
    const posees = etat.posees.slice();
    if (!posees.length || cote === 'droite') posees.push({ id, retourne: sens.retourne });
    else posees.unshift({ id, retourne: sens.retourne });
    return { posees };
}

/**
 * POSER SANS CONTRÔLE — le contrôle se fait à la fin.
 *
 * Refuser une pièce au moment où l'élève la pose, c'est corriger à sa place :
 * il apprend que le jeu l'empêche de se tromper, et il essaie les pièces une à
 * une jusqu'à ce que ça passe. En laissant poser, on lui demande de DÉCIDER —
 * et la vérification finale montre exactement quelle jointure ne va pas.
 */
export function poserLibre(etat, id, cote, retourne = false) {
    if (etat.posees.some(x => x.id === id)) return etat;
    const posees = etat.posees.slice();
    const p = { id, retourne: !!retourne };
    if (!posees.length || cote === 'droite') posees.push(p);
    else posees.unshift(p);
    return { posees };
}

/** Retourne une pièce déjà posée, sans la déplacer. */
export function retournerPosee(etat, id) {
    return { posees: etat.posees.map(p => (p.id === id ? { ...p, retourne: !p.retourne } : p)) };
}

/** Reprend une pièce du plateau : elle retourne dans la réserve. */
export function retirerPosee(etat, id) {
    return { posees: etat.posees.filter(p => p.id !== id) };
}

/**
 * LE CONTRÔLE DE FIN. Chaque jointure doit marier une question et sa réponse ;
 * la chaîne doit commencer par DÉPART et finir par ARRIVÉE. On renvoie les
 * jointures fautives par l'indice de la pièce de GAUCHE, pour que le jeu
 * puisse les entourer une par une.
 */
export function verifierChaine(chaine, etat) {
    const p = etat.posees;
    const fautes = [];
    for (let i = 0; i + 1 < p.length; i++) {
        const droite = demiDe(chaine.pieces[p[i].id], 1, p[i].retourne);
        const gauche = demiDe(chaine.pieces[p[i + 1].id], 0, p[i + 1].retourne);
        if (!seMarient(droite, gauche)) fautes.push(i);
    }
    const complet = p.length === chaine.pieces.length;
    const premier = p.length ? demiDe(chaine.pieces[p[0].id], 0, p[0].retourne) : null;
    const dernier = p.length
        ? demiDe(chaine.pieces[p[p.length - 1].id], 1, p[p.length - 1].retourne) : null;
    const bouts = !!premier && !!dernier && premier.type === BOUT && dernier.type === BOUT;
    return { fautes, complet, bouts, ok: complet && bouts && fautes.length === 0 };
}

/** Le côté où cette pièce peut aller, s'il n'y en a qu'un. */
export function coteNaturel(chaine, etat, id) {
    const d = poseAdmise(chaine, etat, id, 'droite');
    const g = poseAdmise(chaine, etat, id, 'gauche');
    if (d && !g) return 'droite';
    if (g && !d) return 'gauche';
    return d ? 'droite' : null;
}

/** Toutes les pièces sont-elles posées ? */
export const plateauFini = (chaine, etat) => etat.posees.length === chaine.pieces.length;

/**
 * La prochaine pièce jouable, et de quel côté. C'est ce que suit le robot, et
 * ce que l'aide raconte. Il peut y en avoir deux (une à chaque bout) : on rend
 * la première trouvée, l'ordre de la chaîne n'ayant aucune importance.
 */
export function prochainePose(chaine, etat) {
    if (!etat.posees.length) {
        // Le plateau est vide : on commence par la pièce DÉPART, la seule qui
        // ne demande aucun calcul.
        return { id: 0, cote: 'droite' };
    }
    for (const cote of ['droite', 'gauche']) {
        for (const piece of chaine.pieces) {
            if (poseAdmise(chaine, etat, piece.id, cote)) return { id: piece.id, cote };
        }
    }
    return null;
}

/**
 * Ce que le robot dit — et ce que reçoit l'élève qui demande de l'aide.
 * Jamais la réponse toute crue : la question qu'il faut se poser, le calcul,
 * puis la moitié qu'on va chercher.
 */
export function direJoint(chaine, etat, pose) {
    if (!pose) return 'Toutes les pièces sont posées.';
    if (!etat.posees.length) {
        return 'Le plateau est vide : on commence par la pièce marquée DÉPART, '
            + 'la seule qui ne demande aucun calcul.';
    }
    const bouts = boutsLibres(chaine, etat);
    const bout = pose.cote === 'gauche' ? bouts.gauche : bouts.droite;
    const cote = pose.cote === 'gauche' ? 'à gauche' : 'à droite';
    if (bout.type === QUESTION) {
        const c = chaine.couples[bout.couple];
        return `Le bout ouvert ${cote} demande « ${c.q} ». ${c.q} fait ${c.r} : `
            + `je cherche donc la pièce qui porte ${c.r}.`;
    }
    const c = chaine.couples[bout.couple];
    return `Le bout ouvert ${cote} porte ${c.r}. Ce n'est pas une question, c'est une réponse : `
        + `je cherche la pièce dont la question fait ${c.r} — c'est « ${c.q} ».`;
}

/** La correction d'une pièce mal posée : pourquoi celle-là ne va pas. */
export function direErreur(chaine, etat, id) {
    const jouee = chaine.pieces[id];
    if (!jouee) return 'Cette pièce ne peut pas venir ici.';
    if (!etat.posees.length) return 'Le plateau est vide : commence par la pièce DÉPART.';
    const bouts = boutsLibres(chaine, etat);
    const dire = (d) => d ? (d.type === BOUT ? `« ${d.texte} »` : `« ${d.texte} »`) : 'rien';
    return `Aucun bout de cette pièce ne va avec la chaîne. À gauche elle attend ${dire(bouts.gauche)}, `
        + `à droite ${dire(bouts.droite)} — et cette pièce porte ${dire(jouee.demis[0])} `
        + `et ${dire(jouee.demis[1])}.`;
}

/**
 * L'ordre dans lequel la réserve est présentée à l'élève : toutes les pièces,
 * mélangées. Aucune n'est posée d'avance — le plateau part vide, et c'est ce
 * qui donne deux bouts à la chaîne au lieu d'un.
 */
export function reserveMelangee(chaine, rng) {
    const ids = chaine.pieces.map(p => p.id);
    return rng && rng.shuffle ? rng.shuffle(ids) : ids;
}

/** La chaîne, écrite en une ligne : de quoi corriger sur le papier. */
export const direChaine = (chaine) =>
    chaine.pieces.map(p => `${p.gauche} | ${p.droite}`).join('  →  ');

/**
 * La fraction du carré que peut faire la police pour que `texte` y entre.
 * Deux contraintes, essayées en descendant : le plus long mot tient sur une
 * ligne, et toutes les lignes tiennent en hauteur. 0,62 : la largeur moyenne
 * d'un caractère gras rapportée à sa taille.
 */
export function ajusterAuCarre(texte) {
    const t = String(texte ?? '');
    const mots = t.split(/\s+/).filter(Boolean);
    const plusLong = Math.max(1, ...mots.map(m => m.length));
    const tient = (f) => {
        // 0,68 : la largeur d'un caractère GRAS rapportée à sa taille, mesurée
        // large — mieux vaut une police un cran plus petite qu'un mot coupé.
        const parLigne = Math.floor(0.92 / (f * 0.68));
        if (plusLong > parLigne) return false;
        // On remplit les lignes mot par mot, comme le fera le navigateur.
        let lignes = 1, courante = 0;
        for (const m of mots) {
            const largeur = (courante ? courante + 1 : 0) + m.length;
            if (largeur <= parLigne) { courante = largeur; }
            else { lignes++; courante = m.length; }
        }
        return lignes * f * 1.18 <= 0.92;
    };
    for (let f = 0.34; f > 0.1; f -= 0.02) if (tient(f)) return f;
    return 0.1;
}
