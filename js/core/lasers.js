// LE RAYON ET LES MIROIRS — poser des miroirs pour amener un rayon sur sa cible.
//
// Rémy, capture d'un jeu à l'appui : « j'aimerai bien un jeu dans ce style avec
// des lasers et des miroirs, je ne connais pas le nom. C'est un exercice bonus
// comme le sudoku. »
//
// CE QU'ON APPREND, ET POURQUOI ÇA NE SE RÉCITE PAS. Un miroir posé à 45°
// change un déplacement horizontal en déplacement vertical : c'est un QUART DE
// TOUR, et c'est la seule règle du jeu. Elle s'énonce en une phrase et ne
// s'applique correctement qu'après l'avoir vue jouer — « le rayon part vers la
// droite, il touche un miroir « / », il repart vers le haut » demande de tenir
// deux choses à la fois, la direction d'avant et l'orientation du miroir. Les
// élèves qui se trompent ne se trompent jamais sur la règle, ils se trompent
// sur la composition : deux miroirs de suite, et il faut refaire le
// raisonnement au lieu de le deviner.
//
// D'OÙ LE BUDGET, QUI EST TOUT LE JEU. Sans lui, on couvrirait la grille de
// miroirs jusqu'à ce que ça marche, et le raisonnement disparaîtrait derrière
// l'essai. Le nombre de miroirs est donc COMPTÉ, et c'est exactement celui
// qu'il faut : on ne peut plus tâtonner, il faut prévoir le trajet.
//
// LE TRAJET N'EST PAS COMPARÉ À UNE SOLUTION. Comme pour le circuit d'eau, la
// grille tirée n'est qu'UNE réponse possible ; refuser un trajet qui atteint la
// cible sous prétexte qu'il n'est pas celui qu'on avait en tête serait injuste
// et incompréhensible. On simule le rayon, et l'on regarde s'il arrive.
//
// CE MODULE NE DESSINE RIEN : il fait avancer un rayon dans une grille. C'est
// ce qui permet de le tester sans navigateur — et il le faut, parce qu'un
// rayon qui tourne du mauvais côté est une erreur qu'on ne voit pas en lisant.

/** Les quatre directions, en pas de grille. `y` descend, comme à l'écran. */
export const PAS = { E: [1, 0], O: [-1, 0], N: [0, -1], S: [0, 1] };
export const SENS = ['E', 'S', 'O', 'N'];

/** Ce qu'une case peut contenir. */
export const VIDE = '.';
export const MUR = '#';
export const MIROIRS = ['/', '\\'];

/**
 * LE REBOND, ET IL TIENT DANS DEUX LIGNES.
 *
 * Le miroir « / » va du coin bas-gauche au coin haut-droit : un rayon qui part
 * vers l'EST le frappe par en dessous et repart vers le NORD. Le miroir « \ »
 * est l'autre diagonale, et échange donc EST et SUD.
 *
 * On l'écrit comme une TABLE plutôt qu'avec des formules sur les composantes :
 * une table se lit, se vérifie du doigt, et ne peut pas se tromper de signe.
 */
const REBOND = {
    '/': { E: 'N', N: 'E', O: 'S', S: 'O' },
    '\\': { E: 'S', S: 'E', O: 'N', N: 'O' }
};

/** La direction après le miroir — ou la même s'il n'y en a pas. */
export function refleter(sens, contenu) {
    const table = REBOND[contenu];
    return table ? table[sens] : sens;
}

/**
 * FAIRE COURIR LE RAYON, ET DIRE OÙ IL S'ARRÊTE.
 *
 * Quatre fins possibles, et l'écran les distingue toutes : il touche la cible,
 * il sort de la grille, il se perd dans un mur, ou il tourne en rond. La
 * dernière n'arrive qu'avec quatre miroirs bien placés, mais elle arrive — et
 * sans le compteur de pas, la boucle serait infinie.
 *
 * @param {Object} g - { n, cases, source: {x, y, sens}, cible: {x, y} }
 * @returns {{chemin: Array, fin: string, touche: boolean}}
 *   `chemin` liste les segments parcourus : de quoi tracer le trait à l'écran.
 */
export function tracer(g) {
    const chemin = [];
    let sens = g.source.sens;
    let x = g.source.x;
    let y = g.source.y;
    const vus = new Set();
    // Une case peut être traversée deux fois — une fois à l'horizontale, une
    // fois à la verticale —, et ce n'est PAS une boucle. C'est le couple
    // (case, direction) qui doit rester unique.
    for (let pas = 0; pas < g.n * g.n * 4 + 8; pas++) {
        if (x < 0 || y < 0 || x >= g.n || y >= g.n) return { chemin, fin: 'sortie', touche: false };
        const cle = `${x},${y},${sens}`;
        if (vus.has(cle)) return { chemin, fin: 'boucle', touche: false };
        vus.add(cle);
        const i = y * g.n + x;
        const quoi = g.cases[i];
        if (quoi === MUR) return { chemin, fin: 'mur', touche: false };
        const avant = sens;
        sens = refleter(sens, quoi);
        chemin.push({ x, y, entre: avant, sort: sens });
        // LA CIBLE EST TOUCHÉE DÈS QU'ON Y ENTRE, avant tout rebond : un miroir
        // sur la cible n'aurait aucun sens, et la générer ainsi serait un
        // piège gratuit.
        if (g.cible && x === g.cible.x && y === g.cible.y) {
            return { chemin, fin: 'cible', touche: true };
        }
        const [dx, dy] = PAS[sens];
        x += dx; y += dy;
    }
    return { chemin, fin: 'boucle', touche: false };
}

/** Combien de miroirs l'élève a posés (les fixes ne comptent pas). */
export const miroirsPoses = (cases, fixes) =>
    cases.filter((c, i) => MIROIRS.includes(c) && !fixes[i]).length;

/**
 * LES CINQ NIVEAUX, ET CHACUN AJOUTE UNE SEULE CHOSE.
 *
 * Un miroir, deux, trois — puis les murs, qui interdisent le trajet évident, et
 * enfin des miroirs DÉJÀ POSÉS, qu'on ne peut pas bouger : il faut alors
 * composer avec le rebond d'un autre, ce qui est la vraie difficulté du genre.
 */
export const MARCHES_LASER = [
    { id: 'un', nom: 'Un miroir', n: 5, virages: 1, murs: 0, fixes: 0 },
    { id: 'deux', nom: 'Deux miroirs', n: 5, virages: 2, murs: 0, fixes: 0 },
    { id: 'trois', nom: 'Trois miroirs', n: 6, virages: 3, murs: 0, fixes: 0 },
    { id: 'murs', nom: 'Avec des murs', n: 6, virages: 3, murs: 4, fixes: 0 },
    { id: 'fixes', nom: 'Des miroirs déjà posés', n: 7, virages: 4, murs: 3, fixes: 1 }
];

/**
 * LE MIROIR QU'IL FAUT POUR TOURNER D'ICI VERS LÀ.
 *
 * C'est la table de rebond lue à l'envers, et c'est le générateur qui en a
 * besoin : il choisit d'abord le trajet, puis les miroirs qui le produisent.
 */
export function miroirPour(entre, sort) {
    for (const m of MIROIRS) if (REBOND[m][entre] === sort) return m;
    return null;
}

/**
 * TIRER UNE GRILLE — EN TRAÇANT LE TRAJET D'ABORD.
 *
 * On ne tire pas des miroirs au hasard en espérant qu'un trajet existe : on
 * DESSINE le trajet — droite, virage, droite, virage — et l'on en déduit les
 * miroirs. La grille est donc soluble par construction, et le budget est exact
 * puisqu'il vaut le nombre de virages.
 *
 * @returns {Object|null} la grille prête à jouer, ou `null` si le tirage a
 *   échoué (grille trop petite pour le nombre de virages demandé) — l'appelant
 *   réessaie, ce qui est plus simple qu'un algorithme qui ne rate jamais.
 */
export function tirerNiveau(rng, marche) {
    const n = marche.n;
    for (let essai = 0; essai < 60; essai++) {
        const g = unTirage(rng, marche, n);
        if (g) return g;
    }
    return null;
}

function unTirage(rng, marche, n) {
    // La source est sur un bord, et regarde vers l'intérieur.
    const bord = SENS[rng.int(0, 3)];
    let sens = { E: 'E', O: 'O', N: 'N', S: 'S' }[bord];
    let x = bord === 'E' ? 0 : bord === 'O' ? n - 1 : rng.int(1, n - 2);
    let y = bord === 'S' ? 0 : bord === 'N' ? n - 1 : rng.int(1, n - 2);
    if (bord === 'E' || bord === 'O') y = rng.int(0, n - 1);
    else x = rng.int(0, n - 1);

    const source = { x, y, sens };
    const cases = new Array(n * n).fill(VIDE);
    const surLeTrajet = new Set();
    const marques = [];

    for (let v = 0; v <= marche.virages; v++) {
        const dernier = v === marche.virages;
        // La longueur du segment : au moins un pas, et jamais jusqu'au bord —
        // un virage collé au bord laisse le rayon sortir au coup suivant.
        const place = jusquAuBord(x, y, sens, n);
        if (place < 1) return null;
        const long = rng.int(1, Math.min(place, dernier ? place : place - 1));
        for (let k = 0; k < long; k++) {
            surLeTrajet.add(`${x},${y}`);
            const [dx, dy] = PAS[sens];
            x += dx; y += dy;
        }
        if (x < 0 || y < 0 || x >= n || y >= n) return null;
        if (surLeTrajet.has(`${x},${y}`)) return null;      // le trajet se recoupe
        if (dernier) break;
        // Le virage : on tourne d'un quart de tour, à droite ou à gauche.
        const suivant = tourner(sens, rng.int(0, 1) ? 1 : -1);
        const m = miroirPour(sens, suivant);
        if (!m) return null;
        cases[y * n + x] = m;
        marques.push({ i: y * n + x, m });
        surLeTrajet.add(`${x},${y}`);
        sens = suivant;
    }

    const cible = { x, y };
    if (cible.x === source.x && cible.y === source.y) return null;

    // LES MURS SE POSENT HORS DU TRAJET, et l'un d'eux au moins doit BARRER la
    // ligne droite qui part de la source : sinon ils décorent au lieu de gêner.
    const cases2 = cases.slice();
    if (marche.murs) {
        const libres = [];
        for (let i = 0; i < n * n; i++) {
            const cx = i % n, cy = Math.floor(i / n);
            if (surLeTrajet.has(`${cx},${cy}`)) continue;
            if (cx === cible.x && cy === cible.y) continue;
            libres.push(i);
        }
        for (let k = 0; k < marche.murs && libres.length; k++) {
            cases2[libres.splice(rng.int(0, libres.length - 1), 1)[0]] = MUR;
        }
    }

    // Ce que l'élève trouve posé : rien, ou les premiers miroirs du trajet.
    const fixes = new Array(n * n).fill(false);
    const depart = cases2.slice();
    marques.forEach(({ i }) => { depart[i] = VIDE; });
    for (let k = 0; k < Math.min(marche.fixes, marques.length - 1); k++) {
        depart[marques[k].i] = marques[k].m;
        fixes[marques[k].i] = true;
    }

    const budget = marques.length - Math.min(marche.fixes, marques.length - 1);
    const grille = { n, cases: depart, fixes, source, cible, budget, solution: cases2 };
    // GARDE-FOU : la grille tirée DOIT se résoudre avec sa propre solution. Le
    // trajet a été construit pas à pas, mais un mur mal placé ou un virage au
    // ras du bord peuvent l'avoir cassé — mieux vaut le voir ici que devant un
    // élève.
    if (!tracer({ ...grille, cases: cases2 }).touche) return null;
    // Et le rayon ne doit PAS déjà toucher la cible sans rien poser, sauf s'il
    // n'y a rien à poser.
    if (budget > 0 && tracer(grille).touche) return null;
    return grille;
}

/** La distance au bord dans cette direction, en cases. */
function jusquAuBord(x, y, sens, n) {
    if (sens === 'E') return n - 1 - x;
    if (sens === 'O') return x;
    if (sens === 'S') return n - 1 - y;
    return y;
}

/** Un quart de tour : `+1` dans le sens des aiguilles, `−1` dans l'autre. */
export function tourner(sens, sens2) {
    const i = SENS.indexOf(sens);
    return SENS[(i + (sens2 > 0 ? 1 : 3)) % 4];
}

/**
 * POSER, TOURNER, RETIRER — un seul geste, et il tourne en rond.
 *
 * Vide → « / » → « \ » → vide. Trois états sur un seul appui : c'est le geste
 * du circuit d'eau, et il a la même vertu — rien à sélectionner d'abord, rien
 * à faire glisser, et l'on revient toujours en arrière du même doigt.
 *
 * @returns {{cases: Array, refus: string}|{cases: Array}}
 */
export function poserMiroir(g, i) {
    if (g.fixes[i]) return { cases: g.cases, refus: 'Ce miroir-là est vissé : il ne bouge pas.' };
    if (g.solution[i] === MUR || g.cases[i] === MUR) {
        return { cases: g.cases, refus: 'Un mur ne renvoie rien : le rayon s\'y perd.' };
    }
    if (i === g.source.y * g.n + g.source.x) {
        return { cases: g.cases, refus: 'C\'est la case de départ du rayon.' };
    }
    if (i === g.cible.y * g.n + g.cible.x) {
        return { cases: g.cases, refus: 'C\'est la cible : le rayon doit y arriver, pas y rebondir.' };
    }
    const cases = g.cases.slice();
    const suite = { [VIDE]: MIROIRS[0], [MIROIRS[0]]: MIROIRS[1], [MIROIRS[1]]: VIDE };
    const apres = suite[cases[i]] ?? VIDE;
    // LE BUDGET SE VÉRIFIE AVANT DE POSER, PAS APRÈS. Laisser poser puis
    // annoncer « trop de miroirs » ferait un état interdit qui existe quand
    // même, et l'élève devrait défaire lui-même.
    if (apres !== VIDE && cases[i] === VIDE
        && miroirsPoses(cases, g.fixes) >= g.budget) {
        return {
            cases,
            refus: `Tu n'as que ${g.budget} miroir${g.budget > 1 ? 's' : ''} : `
                + 'retires-en un avant d\'en poser un autre.'
        };
    }
    cases[i] = apres;
    return { cases };
}

/** Ce qu'on dit du trajet quand il n'arrive pas. */
export const DIT_LA_FIN = {
    sortie: 'Le rayon sort de la grille.',
    mur: 'Le rayon se perd dans un mur.',
    boucle: 'Le rayon tourne en rond : il ne sortira jamais de sa boucle.',
    cible: 'Le rayon atteint la cible.'
};

export const CONSIGNE = 'Pose les miroirs pour amener le rayon sur la cible.';
