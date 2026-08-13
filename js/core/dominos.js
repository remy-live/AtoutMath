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
 * LE PLATEAU EST DESSINÉ AVANT LA PREMIÈRE PIÈCE.
 *
 * Une chaîne qui se construit au fur et à mesure ne montre rien : l'élève ne
 * sait ni combien de pièces il pose, ni où cela finit. Le vrai jeu de dominos
 * scolaire — celui qu'on découpe et qu'on distribue — donne une PLANCHE : le
 * serpentin est tracé, les emplacements sont vides, et l'on voit d'un coup
 * d'œil la forme de ce qu'il faut reconstituer.
 *
 * Le serpentin descend rangée par rangée, chaque virage étant un domino
 * DEBOUT : c'est ce qui fait tenir douze pièces sur un écran de téléphone.
 *
 *     ┌───┬───┐┌───┬───┐┌───┐
 *     │   │   ││   │   ││   │
 *     └───┴───┘└───┴───┘├───┤
 *     ┌───┬───┐┌───┬───┐│   │
 *     │   │   ││   │   ││   │
 *     └───┴───┘└───┴───┘└───┘
 *
 * Une case connaît sa position en CELLULES (une moitié de domino = une
 * cellule) et son sens : 'hr' vers la droite, 'hl' vers la gauche, 'vd' vers
 * le bas, 'vu' vers le haut. Deux cases qui se suivent sur le chemin se
 * touchent toujours par une arête : c'est là que se lit la jointure.
 */
export function cheminSerpentin(n, parRangee = 3) {
    const k = Math.max(1, Math.floor(parRangee));
    const maxW = k * 2;                 // l'abscisse du virage, en cellules
    const cases = [];
    let x = 0, y = 0, sens = 1;
    for (let i = 0; i < n; i++) {
        const dernier = i === n - 1;
        const auBord = (sens === 1 && x >= maxW) || (sens === -1 && x <= 0);
        if (!dernier && auBord) {
            cases.push({ x, y, dir: 'vd' });
            y += 2; sens *= -1;
        } else {
            cases.push({ x, y, dir: sens === 1 ? 'hr' : 'hl' });
            x += sens * 2;
        }
    }
    return normaliserChemin(cases);
}

/** Les deux cellules qu'occupe une case, DANS L'ORDRE DU CHEMIN. */
export function cellulesDe(c) {
    if (c.dir === 'hr') return [[c.x, c.y], [c.x + 1, c.y]];
    if (c.dir === 'hl') return [[c.x, c.y], [c.x - 1, c.y]];
    if (c.dir === 'vd') return [[c.x, c.y], [c.x, c.y + 1]];
    return [[c.x, c.y], [c.x, c.y - 1]];
}

/**
 * Recale le chemin sur l'origine et donne la taille du plateau. Les modèles
 * qui remontent ('vu') ou reviennent ('hl') produisent des coordonnées
 * négatives : sans ce recalage, une partie du plateau sortirait du cadre.
 */
export function normaliserChemin(cases) {
    const cells = cases.flatMap(cellulesDe);
    const minX = Math.min(...cells.map(c => c[0]));
    const minY = Math.min(...cells.map(c => c[1]));
    const bouge = cases.map(c => ({ ...c, x: c.x - minX, y: c.y - minY }));
    const apres = bouge.flatMap(cellulesDe);
    return {
        cases: bouge,
        colonnes: Math.max(...apres.map(c => c[0])) + 1,
        lignes: Math.max(...apres.map(c => c[1])) + 1
    };
}

/** Le coin haut-gauche d'une case et sa taille, en cellules. */
export function boiteDe(c) {
    const [a, b] = cellulesDe(c);
    return {
        x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]),
        l: a[0] === b[0] ? 1 : 2, h: a[1] === b[1] ? 1 : 2,
        // Le chemin peut traverser une case à l'envers ('hl', 'vu') : c'est
        // alors sa SECONDE moitié qui se dessine en premier à l'écran.
        inverse: a[0] > b[0] || a[1] > b[1]
    };
}

/**
 * L'état du plateau : un emplacement par case, vide ou occupé.
 * Le plateau part vide — toutes les pièces sont en réserve.
 */
export const plateauVide = (n) => ({ cases: Array(n).fill(null) });

/** Où se trouve cette pièce sur le plateau, ou −1. */
export const casePiece = (etat, id) => etat.cases.findIndex(c => c && c.id === id);

/**
 * POSE LIBRE : aucun emplacement ne refuse une pièce.
 *
 * Refuser au moment où l'élève pose, c'est corriger à sa place : il essaie les
 * pièces une à une jusqu'à ce que ça passe, et n'a rien décidé. Ici il pose ce
 * qu'il veut où il veut — et « Vérifier » lui montre ensuite quelles jointures
 * ne collent pas.
 */
export function poserEnCase(etat, index, id, retourne = false) {
    if (index < 0 || index >= etat.cases.length) return etat;
    const cases = etat.cases.map(c => (c && c.id === id ? null : c));
    cases[index] = { id, retourne: !!retourne };
    return { cases };
}

/** Retire la pièce d'un emplacement : elle repart en réserve. */
export function retirerDeCase(etat, index) {
    const cases = etat.cases.slice();
    cases[index] = null;
    return { cases };
}

/** Retourne la pièce d'un emplacement, sans la déplacer. */
export function retournerCase(etat, index) {
    const cases = etat.cases.slice();
    if (cases[index]) cases[index] = { ...cases[index], retourne: !cases[index].retourne };
    return { cases };
}

/** Tous les emplacements sont-ils occupés ? */
export const plateauFini = (etat) => etat.cases.every(Boolean);

/**
 * LE CONTRÔLE DE FIN. Chaque jointure du serpentin doit marier une question et
 * sa réponse ; la planche doit commencer par un bout et finir par l'autre. On
 * rend les jointures fautives par l'indice de la case de GAUCHE, pour que le
 * jeu puisse les entourer une par une : l'élève doit pouvoir relire CE
 * joint-là, pas chercher lequel.
 */
export function verifierPlateau(chaine, etat) {
    const c = etat.cases;
    const demi = (k, cote) => (c[k] ? demiDe(chaine.pieces[c[k].id], cote, c[k].retourne) : null);
    const fautes = [];
    for (let i = 0; i + 1 < c.length; i++) {
        if (!c[i] || !c[i + 1]) continue;
        if (!seMarient(demi(i, 1), demi(i + 1, 0))) fautes.push(i);
    }
    const complet = plateauFini(etat);
    const premier = demi(0, 0);
    const dernier = demi(c.length - 1, 1);
    const bouts = !!premier && !!dernier && premier.type === BOUT && dernier.type === BOUT;
    return { fautes, complet, bouts, ok: complet && bouts && fautes.length === 0 };
}

/**
 * La prochaine case à remplir, et par quelle pièce. C'est ce que suit le
 * robot, et ce que l'aide raconte : on avance le long du serpentin, chaque
 * case se déduisant de celle d'avant.
 */
export function prochaineCase(chaine, etat) {
    const c = etat.cases;
    let index = c.findIndex((v, i) => !v && (i === 0 || c[i - 1]));
    if (index < 0) index = c.findIndex(v => !v);
    if (index < 0) return null;
    const avant = index > 0 ? c[index - 1] : null;
    const cible = avant ? demiDe(chaine.pieces[avant.id], 1, avant.retourne) : null;
    for (const piece of chaine.pieces) {
        if (casePiece(etat, piece.id) >= 0) continue;
        if (!cible) {
            // Première case : on commence par la pièce qui ne demande aucun
            // calcul — celle qui porte DÉPART.
            if (piece.demis[0].type === BOUT) return { index, id: piece.id, retourne: false };
            if (piece.demis[1].type === BOUT) return { index, id: piece.id, retourne: true };
            continue;
        }
        for (const retourne of [false, true]) {
            if (seMarient(cible, demiDe(piece, 0, retourne))) return { index, id: piece.id, retourne };
        }
    }
    return null;
}

/**
 * Ce que le robot dit — et ce que reçoit l'élève qui demande de l'aide.
 * Jamais la réponse toute crue : la moitié qui attend, le calcul, puis ce
 * qu'on va chercher.
 */
export function direJoint(chaine, etat, pose) {
    if (!pose) return 'Toutes les pièces sont posées.';
    const avant = pose.index > 0 ? etat.cases[pose.index - 1] : null;
    if (!avant) {
        return 'Le plateau est vide : on commence par le premier emplacement, avec la '
            + 'pièce marquée DÉPART — la seule qui ne demande aucun calcul.';
    }
    const bout = demiDe(chaine.pieces[avant.id], 1, avant.retourne);
    const couple = chaine.couples[bout.couple];
    if (!couple) {
        return 'L\'emplacement d\'avant se termine par un bout de la planche : '
            + 'cherche la pièce qui la prolonge.';
    }
    if (bout.type === QUESTION) {
        return `L'emplacement d'avant se termine par « ${couple.q} ». ${couple.q} fait `
            + `${couple.r} : je cherche donc la pièce qui porte ${couple.r}.`;
    }
    return `L'emplacement d'avant se termine par ${couple.r}. Ce n'est pas une question, `
        + `c'est une réponse : je cherche la pièce dont la question fait ${couple.r} — `
        + `c'est « ${couple.q} ».`;
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
