// L'ADVERSAIRE ARTIFICIEL — un seul cerveau pour tous les jeux de plateau.
//
// Négamax avec élagage alpha-bêta : l'algorithme des programmes d'échecs,
// réduit à ce qui se lit. Il ne connaît AUCUNE règle — il reçoit un jeu qui
// sait trois choses (les coups possibles, jouer un coup, évaluer une
// position) et il explore. C'est ce qui permet de servir Othello, les dames
// et les échecs avec les mêmes quarante lignes : chaque jeu apporte ses
// règles, l'IA apporte la profondeur.
//
// Le CONTRAT d'un jeu :
//   coups(etat)        -> tableau de coups (vide = la partie est finie)
//   jouer(etat, coup)  -> un NOUVEL état (l'ancien n'est jamais modifié)
//   terminee(etat)     -> null, ou { gagnant: 'B'|'N'|null, raison }
//   evaluer(etat)      -> score DU POINT DE VUE DU JOUEUR AU TRAIT
//   ordonner(coups)?   -> les coups prometteurs d'abord (l'élagage en dépend)
//
// LE TRAIT NE CHANGE PAS TOUJOURS DE MAIN. À la pipopipette, celui qui ferme
// un carré REJOUE — c'est toute la saveur du jeu, et c'est aussi ce qui casse
// un négamax écrit naïvement : nier le score d'un enfant où l'on est encore au
// trait revient à jouer contre soi-même, et l'IA se met à offrir des carrés
// pour « punir » son adversaire imaginaire. Un jeu à main tournante peut donc
// fournir `trait(etat)` ; on ne nie alors que lorsque la main a changé. Les
// jeux qui alternent strictement — Othello, dames, échecs — n'ont rien à
// déclarer, et le comportement ne bouge pas d'un iota pour eux.
//
// La DIFFICULTÉ se règle par deux boutons indépendants :
//   profondeur — combien de coups l'IA voit devant elle ;
//   fantaisie  — la probabilité qu'elle joue au hasard plutôt que le meilleur
//                coup. C'est elle qui fait un adversaire BATTABLE : une IA
//                profonde mais jamais faillible décourage, une IA qui se
//                trompe parfois s'apprend.

const MAT = 1e6;

/**
 * Le meilleur coup pour le joueur au trait — ou un coup fantaisiste.
 * À score égal, on tire au sort : un adversaire qui répond toujours la même
 * chose se contourne par cœur au lieu de se comprendre.
 */
export function meilleurCoup(jeu, etat, opts = {}) {
    const { profondeur = 2, fantaisie = 0, rng = { next: Math.random } } = opts;
    const coups = jeu.coups(etat);
    if (!coups.length) return null;
    if (coups.length === 1) return { coup: coups[0], score: 0 };
    if (fantaisie > 0 && rng.next() < fantaisie) {
        return { coup: coups[Math.floor(rng.next() * coups.length)], score: 0, hasard: true };
    }

    // À la racine, chaque coup est exploré à PLEINE fenêtre : une fenêtre
    // rétrécie par le meilleur score couperait court aux coups À ÉGALITÉ, et
    // c'est entre eux qu'on tire au sort. Le surcoût est marginal, l'élagage
    // fait son travail en dessous.
    const ordonnes = jeu.ordonner ? jeu.ordonner(coups.slice(), etat) : coups;
    let meilleur = -Infinity;
    let retenus = [];
    for (const coup of ordonnes) {
        const apres = jeu.jouer(etat, coup);
        const tourne = aTourne(jeu, etat, apres);
        const brut = negamax(jeu, apres, profondeur - 1, -Infinity, Infinity, 1);
        const score = tourne ? -brut : brut;
        if (score > meilleur + 1e-9) { meilleur = score; retenus = [coup]; }
        else if (score > meilleur - 1e-9) retenus.push(coup);
    }
    return { coup: retenus[Math.floor(rng.next() * retenus.length)], score: meilleur };
}

/** La main a-t-elle changé entre ces deux positions ? */
function aTourne(jeu, avant, apres) {
    if (!jeu.trait) return true;      // jeu à alternance stricte
    return jeu.trait(avant) !== jeu.trait(apres);
}

function negamax(jeu, etat, prof, alpha, beta, ply) {
    const t = jeu.terminee(etat);
    if (t) {
        if (t.gagnant === null) return 0;
        const moi = jeu.trait ? jeu.trait(etat) : etat.trait;
        // `MAT - ply` : un mat PROCHE vaut plus qu'un mat lointain, sinon
        // l'IA gagnante tourne en rond en repoussant une fin déjà acquise.
        return t.gagnant === moi ? (MAT - ply) : -(MAT - ply);
    }
    if (prof <= 0) return jeu.evaluer(etat);

    let coups = jeu.coups(etat);
    if (jeu.ordonner) coups = jeu.ordonner(coups, etat);
    let mieux = -Infinity;
    for (const c of coups) {
        const apres = jeu.jouer(etat, c);
        const tourne = aTourne(jeu, etat, apres);
        // Quand la main NE tourne PAS, l'enfant est exploré du même point de
        // vue : ni la fenêtre ni le score ne se retournent.
        const brut = tourne
            ? -negamax(jeu, apres, prof - 1, -beta, -alpha, ply + 1)
            : negamax(jeu, apres, prof - 1, alpha, beta, ply + 1);
        if (brut > mieux) mieux = brut;
        if (brut > alpha) alpha = brut;
        if (alpha >= beta) break;      // l'adversaire ne laissera jamais venir
    }
    return mieux;
}
