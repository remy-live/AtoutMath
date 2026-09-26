// LES DEUX NOMBRES — deux lectures qui se chevauchent d'un chiffre.
//
// Rémy, quatre pages d'un magazine de jeux à l'appui : « j'aimerais bien ces
// jeux en français et en rapport avec les maths ». Le quatrième s'appelait
// « A 1-Off Puzzle » : chaque ligne y cache deux mots, dont les lettres se
// chevauchent — « RABT » cache BAR et TAB, qui partagent le A et le B.
//
// CE QUE J'EN AI GARDÉ, ET CE QUE J'AI JETÉ. J'ai dit à Rémy que c'était le
// plus faible des quatre côté mathématiques — c'est un jeu de lettres, et le
// catalogue en a déjà deux. Il a répondu « fais les tous ». J'ai donc gardé
// l'IDÉE, qui est bonne : deux lectures d'une même suite, qui se chevauchent.
// Les lettres sont devenues des CHIFFRES, et les deux mots deux NOMBRES liés
// par une phrase — « celui de droite est le double de celui de gauche ».
//
// CE QUE ÇA TRAVAILLE. Lire un nombre dans une suite de chiffres, d'abord :
// « 2 4 8 » contient 24, 48, 2, 4, 8 et rien d'autre — pas 28, parce que les
// chiffres ne se sautent pas. Puis la relation elle-même, qu'il faut vérifier
// de tête sur chaque candidat. C'est du calcul mental EN SITUATION : on ne
// demande pas « combien fait le double de 24 », on demande « où sont les deux
// nombres qui vont ensemble ».
//
// LE CHEVAUCHEMENT D'UN CHIFFRE EST CE QUI FAIT LE JEU. Sans lui, les deux
// nombres seraient côte à côte et se liraient d'un coup d'œil. Avec lui, un
// chiffre sert deux fois, et il faut accepter de le compter deux fois — ce qui
// est exactement ce qui dérange, et donc ce qui s'apprend.

import { makeRng } from './ids.js';

/**
 * LES RELATIONS — la phrase qui lie les deux nombres.
 *
 * Chacune sait se dire ET se vérifier, au même endroit : une phrase qui
 * s'écrirait ici et se vérifierait ailleurs finirait par mentir.
 */
export const RELATIONS = {
    double: {
        texte: 'Le nombre de droite est le DOUBLE de celui de gauche.',
        court: 'droite = 2 × gauche',
        tient: (a, b) => b === 2 * a,
        deA: (a) => 2 * a
    },
    triple: {
        texte: 'Le nombre de droite est le TRIPLE de celui de gauche.',
        court: 'droite = 3 × gauche',
        tient: (a, b) => b === 3 * a,
        deA: (a) => 3 * a
    },
    plusDix: {
        texte: 'Le nombre de droite vaut celui de gauche PLUS DIX.',
        court: 'droite = gauche + 10',
        tient: (a, b) => b === a + 10,
        deA: (a) => a + 10
    },
    plusCent: {
        texte: 'Le nombre de droite vaut celui de gauche PLUS CENT.',
        court: 'droite = gauche + 100',
        tient: (a, b) => b === a + 100,
        deA: (a) => a + 100
    }
};

/** Les paliers : la longueur des nombres, et les relations permises. */
export const PALIERS_DEUX_NOMBRES = {
    decouverte: { label: 'Deux chiffres, le double', chiffres: 2, relations: ['double'], bruit: 1 },
    facile: { label: 'Deux chiffres, le double ou le triple', chiffres: 2,
        relations: ['double', 'triple'], bruit: 1 },
    moyen: { label: 'Deux chiffres, trois relations', chiffres: 2,
        relations: ['double', 'triple', 'plusDix'], bruit: 2 },
    difficile: { label: 'Trois chiffres', chiffres: 3,
        relations: ['double', 'plusCent'], bruit: 2 }
};

const chiffresDe = (n) => String(n).split('');

/**
 * UNE LIGNE DE CHIFFRES QUI CACHE DEUX NOMBRES.
 *
 * On tire le nombre de gauche, on en déduit celui de droite par la relation, et
 * l'on exige qu'ils se CHEVAUCHENT : le dernier chiffre de l'un est le premier
 * de l'autre. La ligne est alors leur collage, moins le chiffre partagé.
 *
 * PUIS ON AJOUTE DU BRUIT AUX DEUX BOUTS. Sans lui, la ligne commencerait
 * toujours par le nombre de gauche et finirait par celui de droite : il n'y
 * aurait rien à chercher. Le bruit ne rend pas le jeu injuste — il le rend
 * possible.
 */
export function genererDeuxNombres({ rng = makeRng('deux'), chiffres = 2,
    relations = ['double'], bruit = 1 } = {}) {
    for (let essai = 0; essai < 600; essai++) {
        const cle = rng.pick(relations);
        const R = RELATIONS[cle];
        const min = Math.pow(10, chiffres - 1), max = Math.pow(10, chiffres) - 1;
        const a = rng.int(min, max);
        const b = R.deA(a);
        if (b < min || b > max) continue;
        const ca = chiffresDe(a), cb = chiffresDe(b);
        if (ca[ca.length - 1] !== cb[0]) continue;   // il faut un chiffre partagé

        const coeur = [...ca, ...cb.slice(1)];
        const gauche = Array.from({ length: rng.int(0, bruit) }, () => String(rng.int(0, 9)));
        const droite = Array.from({ length: bruit - gauche.length }, () => String(rng.int(0, 9)));
        const ligne = [...gauche, ...coeur, ...droite];

        return {
            ligne,
            relation: cle,
            texte: R.texte,
            court: R.court,
            chiffres,
            // La solution du fabricant — une parmi d'autres, pour le robot.
            solution: { a, b, debutA: gauche.length, debutB: gauche.length + ca.length - 1 }
        };
    }
    return null;
}

/** Toutes les places où ce nombre se lit dans la ligne, d'affilée. */
export function placesDe(ligne, n) {
    const cible = String(n);
    const places = [];
    for (let i = 0; i + cible.length <= ligne.length; i++) {
        if (ligne.slice(i, i + cible.length).join('') === cible) places.push(i);
    }
    return places;
}

/**
 * CES DEUX NOMBRES SONT-ILS UNE RÉPONSE ?
 *
 * Trois questions, dans l'ordre où l'on veut les apprendre :
 *   · chacun se lit-il dans la ligne, d'affilée ? (« 28 » n'est pas dans
 *     « 2 4 8 » : les chiffres ne se sautent pas) ;
 *   · se chevauchent-ils d'EXACTEMENT un chiffre ?
 *   · la phrase est-elle vraie ?
 *
 * ON N'EXIGE PAS LA SOLUTION DU FABRICANT. Une ligne peut cacher deux paires
 * qui marchent ; refuser la seconde serait une faute d'énoncé.
 */
export function verifierDeuxNombres(grille, a, b) {
    const problemes = [];
    const dit = (genre, message) => problemes.push({ genre, message });
    const na = Number(a), nb = Number(b);
    const lu = grille.ligne.join(' ');

    if (!String(a).length || !String(b).length || !Number.isInteger(na) || !Number.isInteger(nb)) {
        dit('vide', 'Écris les deux nombres.');
        return { ok: false, problemes };
    }
    const pa = placesDe(grille.ligne, a), pb = placesDe(grille.ligne, b);
    if (!pa.length) {
        dit('absent', `${a} ne se lit pas dans ${lu} : les chiffres doivent se suivre, `
            + 'on n\'en saute aucun.');
        return { ok: false, problemes };
    }
    if (!pb.length) {
        dit('absent', `${b} ne se lit pas dans ${lu} : les chiffres doivent se suivre, `
            + 'on n\'en saute aucun.');
        return { ok: false, problemes };
    }

    const R = RELATIONS[grille.relation];
    if (!R.tient(na, nb)) {
        dit('relation', `${R.court} n\'est pas vrai pour ${a} et ${b}.`);
        return { ok: false, problemes };
    }

    // LE CHEVAUCHEMENT, vérifié sur TOUTES les places possibles : un nombre
    // peut se lire à deux endroits de la ligne, et il suffit qu'UNE paire de
    // places se chevauche d'un chiffre pour que la réponse tienne.
    const la = String(a).length;
    const bon = pa.some(ia => pb.some(ib => ib === ia + la - 1));
    if (!bon) {
        const colles = pa.some(ia => pb.some(ib => ib === ia + la));
        dit('chevauchement', colles
            ? `${a} et ${b} se suivent sans se chevaucher : il leur faut UN chiffre en commun.`
            : `${a} et ${b} ne partagent pas un chiffre : le dernier de l\'un doit être `
              + 'le premier de l\'autre.');
    }
    return { ok: problemes.length === 0, problemes };
}
