// MAT EN UN, MAT EN DEUX — le noyau : chercher, vérifier, nommer.
//
// Le moteur d'échecs du projet (core/echecs.js) est validé au perft : il
// connaît TOUTES les règles, roque et prise en passant comprises. On peut donc
// chercher un mat par force brute et avoir confiance dans le résultat — ce qui
// change tout, parce qu'un problème d'échecs annoncé « mat en un » qui n'en
// est pas est bien pire qu'un exercice absent.
//
// CE QUE « MAT EN UN » VEUT DIRE, EXACTEMENT : il existe un coup des Blancs
// après lequel les Noirs n'ont AUCUN coup légal et sont en échec. Pas « le roi
// est attaqué », pas « les Noirs sont perdus » : aucun coup légal, et en
// échec. C'est une définition qui se programme, et c'est elle qu'on vérifie.
//
// MAT EN DEUX : il existe un premier coup blanc tel que, POUR TOUTE réponse
// noire, les Blancs ont un mat en un. Le « pour toute » est l'essentiel — un
// problème où l'on n'examine qu'une défense n'est pas un problème d'échecs,
// c'est une devinette.
//
// L'UNICITÉ EST UNE PROPRIÉTÉ VÉRIFIÉE, PAS UNE ESPÉRANCE. Un bon problème
// n'a qu'une solution : sinon l'élève qui trouve « une autre » a raison, et la
// correction lui donne tort. Chaque position de la bibliothèque est passée au
// solveur par les tests, qui exigent une solution et une seule.

import { coups, jouer, enEchec, fenVersEtat, terminee } from './echecs.js';

const FICHIER = 'abcdefgh';
export const nomCase = (i) => `${FICHIER[i % 8]}${8 - Math.floor(i / 8)}`;
export const indiceDe = (nom) => (8 - Number(nom[1])) * 8 + FICHIER.indexOf(nom[0]);

/** Les Noirs sont-ils mat ? (au trait, sans coup légal, et en échec) */
export function estMat(etat) {
    const fin = terminee(etat);
    return !!fin && fin.raison === 'échec et mat';
}

/** Les coups qui matent immédiatement. Vide si le mat en un n'existe pas. */
export function matsEnUn(etat) {
    return coups(etat).filter(c => estMat(jouer(etat, c)));
}

/**
 * Les premiers coups qui forcent le mat en `n` coups.
 *
 * Recherche exhaustive : on essaie tous les coups blancs, et pour chacun on
 * exige que TOUTE réponse noire laisse un mat en n − 1. Les positions de
 * problème comptent une poignée de pièces ; la profondeur 2 y coûte quelques
 * milliers de nœuds, soit rien du tout.
 */
export function matsEn(etat, n) {
    if (n <= 1) return matsEnUn(etat);
    return coups(etat).filter(c => {
        const apres = jouer(etat, c);
        // Un coup qui mate TOUT DE SUITE ne résout pas un « mat en deux » : le
        // problème demande deux coups, et l'accepter changerait l'énoncé.
        if (estMat(apres)) return false;
        const reponses = coups(apres);
        // Pat : les Noirs n'ont plus de coup et ne sont pas en échec. Ce n'est
        // pas un mat, c'est une nulle — le pire résultat quand on gagne.
        if (!reponses.length) return false;
        return reponses.every(r => matsEn(jouer(apres, r), n - 1).length > 0);
    });
}

/**
 * La notation d'un coup, à la française : Dh5, Cf7, e4, Txf6, O-O.
 *
 * Elle sert à écrire la solution — sur l'écran comme sur la fiche. On garde la
 * lettre de la pièce en français (T C F D R) parce que c'est celle du cours,
 * et parce que les symboles Unicode des pièces n'existent pas dans la police
 * du PDF.
 */
const LETTRE = { K: 'R', Q: 'D', R: 'T', B: 'F', N: 'C', P: '' };

export function nommerCoup(etat, coup) {
    if (coup.roque === 'R') return 'O-O';
    if (coup.roque === 'D') return 'O-O-O';
    const piece = etat.cases[coup.de].toUpperCase();
    const prise = !!etat.cases[coup.vers] || coup.enPassant;
    const arrivee = nomCase(coup.vers);
    let texte;
    if (piece === 'P') {
        // Un pion qui prend annonce sa colonne de départ : « exd5 ».
        texte = (prise ? `${FICHIER[coup.de % 8]}x` : '') + arrivee;
        if (coup.promotion) texte += `=${LETTRE[coup.promotion]}`;
    } else {
        // LA DÉSAMBIGUÏSATION : si deux pièces du même type peuvent aller sur
        // la même case, on précise la colonne (ou la rangée) de départ. Sans
        // cela, « Tf8 » peut désigner deux coups, et la solution est fausse
        // pour l'un des deux.
        const rivales = coups(etat).filter(c => c.vers === coup.vers
            && c.de !== coup.de && etat.cases[c.de] === etat.cases[coup.de]);
        let precision = '';
        if (rivales.length) {
            const memeColonne = rivales.some(c => c.de % 8 === coup.de % 8);
            precision = memeColonne
                ? String(8 - Math.floor(coup.de / 8))
                : FICHIER[coup.de % 8];
        }
        texte = LETTRE[piece] + precision + (prise ? 'x' : '') + arrivee;
    }
    const apres = jouer(etat, coup);
    if (estMat(apres)) return texte + '#';
    if (enEchec(apres, apres.trait)) return texte + '+';
    return texte;
}


/**
 * POURQUOI CE COUP NE MATE PAS — la critique, en mots.
 *
 * Dire « faux » n'apprend rien. Ce qui apprend, c'est de nommer CE QUI
 * MANQUE : le roi n'est pas attaqué du tout ; il l'est mais il s'échappe par
 * g8 ; il l'est mais une pièce s'interpose ; ou bien il n'a plus de coup mais
 * n'est pas en échec, et c'est un pat — la nulle, le pire résultat quand on
 * gagnait.
 *
 * @param {Object} etat
 * @param {Object} coup
 * @param {number} [attendus] - la longueur du problème (1 ou 2)
 * @returns {{raison:string, detail?:string}}
 */
export function critiquer(etat, coup, attendus = 1) {
    const apres = jouer(etat, coup);
    const echec = enEchec(apres, apres.trait);
    const reponses = coups(apres);

    if (!echec && !reponses.length) {
        return { raison: 'pat' };
    }
    if (attendus > 1) {
        if (estMat(apres)) return { raison: 'mate-trop-tot' };
        // La défense qui tient : celle après laquelle il n'y a plus de mat.
        const survit = reponses.find(r => matsEnUn(jouer(apres, r)).length === 0);
        if (survit) return { raison: 'defense', detail: nommerCoup(apres, survit) };
        return { raison: 'bon' };
    }
    if (!echec) return { raison: 'pas-echec' };
    if (!reponses.length) return { raison: 'bon' };

    const roi = apres.trait === 'B' ? 'K' : 'k';
    const fuite = reponses.find(r => apres.cases[r.de] === roi);
    if (fuite) return { raison: 'fuite', detail: nomCase(fuite.vers) };
    return { raison: 'parade', detail: nommerCoup(apres, reponses[0]) };
}

// --- LA BIBLIOTHÈQUE DE PROBLÈMES -----------------------------------------------
//
// Des positions simples, choisies pour NOMMER un motif : le baiser de la dame,
// le couloir, l'étouffé. Chacune est vérifiée par les tests — solution unique,
// longueur annoncée exacte —, et c'est la seule raison pour laquelle on peut
// les écrire à la main sans risque.
//
// Les FEN sont réduites au nécessaire : position, trait, roques, en passant.

export const PROBLEMES = [
    // --- MAT EN UN --------------------------------------------------------------
    {
        id: 'couloir-tour', coups: 1, theme: 'Le mat du couloir',
        fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - -',
        lecon: 'Le roi noir est enfermé par ses propres pions : il ne peut pas monter. Une '
            + 'pièce qui contrôle toute la rangée du fond le prend au piège — c\'est le mat '
            + 'du couloir, le premier que tout joueur apprend, et celui qu\'on subit le plus.'
    },
    {
        id: 'berger', coups: 1, theme: 'Le mat du berger',
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq -',
        lecon: 'La case f7 n\'est défendue que par le roi : c\'est le point faible de toute '
            + 'position de départ. Une dame qui s\'y installe AVEC un fou pour la protéger '
            + 'termine la partie au quatrième coup. À savoir pour le faire — et surtout pour '
            + 'ne pas le subir.'
    },
    {
        id: 'baiser-dame', coups: 1, theme: 'Le baiser de la dame',
        fen: 'k1K5/7Q/8/8/8/8/8/8 w - -',
        lecon: 'La dame seule ne mate pas : il faut que le roi lui tienne la main. Collée au '
            + 'roi adverse et protégée par son propre roi, elle lui ôte toutes les cases à la '
            + 'fois. Sans la protection, le roi la prendrait.'
    },
    {
        id: 'etouffe', coups: 1, theme: 'Le mat étouffé',
        fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - -',
        lecon: 'Le roi est étouffé par ses propres pièces : plus une seule case libre autour '
            + 'de lui. Seul le cavalier peut alors mater, parce qu\'il SAUTE — rien ne peut '
            + 's\'interposer devant un cavalier, et c\'est ce qui le rend unique.'
    },
    {
        id: 'arabe', coups: 1, theme: 'Le mat arabe',
        fen: 'K6k/R7/5N2/8/8/8/8/8 w - -',
        lecon: 'La tour donne l\'échec de tout près, le cavalier bouche la seule fuite. Deux '
            + 'pièces suffisent quand le roi est dans un coin : ce n\'est pas la valeur du '
            + 'matériel qui mate, c\'est le nombre de cases qu\'il reste au roi.'
    },
    {
        id: 'escalier', coups: 1, theme: 'L\'escalier des tours',
        fen: 'k7/2R5/4R3/K7/8/8/8/8 w - -',
        lecon: 'Deux tours travaillent en escalier : l\'une interdit une rangée, l\'autre '
            + 'donne l\'échec sur la suivante. Aucune n\'a besoin d\'être protégée — elles se '
            + 'couvrent par la distance, et c\'est pour cela que la manœuvre marche toujours.'
    },
    {
        id: 'dame-colonne', coups: 1, theme: 'La dame en bout de rangée',
        fen: 'k7/pp6/8/8/8/8/8/K5Q1 w - -',
        lecon: 'Les pions noirs n\'ont pas bougé : le roi n\'a aucune case de fuite. Un échec '
            + 'sur la rangée du fond suffit — et la dame peut le donner de très loin.'
    },
    // --- MAT EN DEUX ------------------------------------------------------------
    {
        id: 'cage-dame', coups: 2, theme: 'Rétrécir la cage (dame)',
        fen: '2k5/8/K2Q4/8/8/8/8/8 w - -',
        lecon: 'Avec une dame, on ne donne pas l\'échec tout de suite : on RÉTRÉCIT la cage. '
            + 'Le premier coup n\'attaque rien — il enlève des cases. Le mat n\'est que la '
            + 'dernière case qu\'on retire.'
    },
    {
        id: 'cage-tour', coups: 2, theme: 'Rétrécir la cage (tour)',
        fen: '1k6/8/K2R4/8/8/8/8/8 w - -',
        lecon: 'Une tour seule ne mate jamais : c\'est le roi blanc qui fait le travail, la '
            + 'tour ne fait que donner le dernier échec. Le premier coup place la tour en '
            + 'BARRIÈRE, pour que le roi noir ne puisse plus reculer.'
    },
    {
        id: 'escalier-deux', coups: 2, theme: 'L\'escalier, en deux temps',
        fen: 'k7/2R5/8/1R6/8/K7/8/8 w - -',
        lecon: 'Une tour barre déjà une colonne. La seconde vient se placer sur la rangée où '
            + 'le roi va être obligé d\'aller : on prépare AVANT de donner l\'échec, et le roi '
            + 'n\'a plus qu\'une case — celle qu\'on lui a laissée exprès.'
    }
];

/**
 * Les problèmes qui conviennent, et un tirage stable.
 * @param {Object} o
 * @param {Object} o.rng
 * @param {number} [o.coups] - 1, 2, ou 0 pour les deux
 */
export function tirerProbleme({ rng, coups: n = 1, exclus = [] } = {}) {
    const utiles = PROBLEMES.filter(p => (!n || p.coups === n) && !exclus.includes(p.id));
    const liste = utiles.length ? utiles : PROBLEMES.filter(p => !n || p.coups === n);
    const p = rng ? rng.pick(liste) : liste[0];
    return preparer(p);
}

/** Un problème prêt à jouer : l'état, la solution, et son écriture. */
export function preparer(probleme) {
    const etat = fenVersEtat(probleme.fen);
    const solutions = matsEn(etat, probleme.coups);
    return {
        ...probleme,
        etat,
        solutions,
        // La notation de chaque premier coup gagnant. Un problème bien fait n'en
        // a qu'un ; on rend la liste quand même, parce que c'est elle qui permet
        // aux tests de le VÉRIFIER au lieu de le supposer.
        notations: solutions.map(c => nommerCoup(etat, c))
    };
}

/**
 * La meilleure défense noire : celle qui fait durer le plus longtemps.
 *
 * Dans un mat en deux, toutes les réponses perdent — mais on ne joue pas
 * n'importe laquelle : on prend celle qui a le plus de coups légaux ensuite,
 * pour que l'élève voie une défense qui se tient plutôt qu'un abandon.
 */
export function defense(etat, rng) {
    const possibles = coups(etat);
    if (!possibles.length) return null;
    let meilleures = [], score = -1;
    for (const c of possibles) {
        const n = coups(jouer(etat, c)).length;
        if (n > score) { score = n; meilleures = [c]; }
        else if (n === score) meilleures.push(c);
    }
    return rng ? rng.pick(meilleures) : meilleures[0];
}

/** Les pièces posées, pour l'affichage et la fiche. */
export function piecesDe(etat) {
    const out = [];
    etat.cases.forEach((p, i) => {
        if (!p) return;
        out.push({
            type: p.toUpperCase(),
            noir: p === p.toLowerCase(),
            x: i % 8, y: Math.floor(i / 8),
            case: nomCase(i)
        });
    });
    return out;
}
