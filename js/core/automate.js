// L'AUTOMATE — l'élève n'écrit pas le programme, il l'EXÉCUTE.
//
// Partout ailleurs, on demande à un enfant de produire un script pour faire
// bouger un personnage. Ici on renverse : le programme est déjà écrit, en blocs
// façon Scratch, et c'est l'élève qui tient le rôle de la machine. Il lit un
// bloc, il fait ce qu'il dit, il passe au suivant.
//
// Ce renversement n'est pas un gadget. Un élève qui empile des blocs jusqu'à ce
// que « ça marche » peut réussir sans jamais avoir compris ce qu'exécute
// l'ordinateur. Trois choses ne s'apprennent que du côté de la machine :
//
//   LE COMPTEUR ORDINAL.  À tout instant, l'exécution est QUELQUE PART dans le
//                         programme. Ce « quelque part » est une notion, et on
//                         ne la voit jamais quand on se contente d'écrire.
//   LA BOUCLE.            « répéter 3 fois » ne recopie pas le corps trois fois
//                         plus bas : le compteur REMONTE. C'est le premier
//                         saut arrière qu'un enfant rencontre, et la source
//                         d'erreur numéro un.
//   LE REPÈRE RELATIF.    « tourner à gauche », c'est la gauche du robot. Quand
//                         il descend, sa gauche est à DROITE de l'écran.
//
// Le module ne connaît ni le DOM ni les blocs dessinés : il tient le programme,
// le déroule, et juge un geste. Tout est donc vérifiable sans navigateur — ce
// qui compte, parce qu'un programme mal déroulé donnerait tort à un élève qui a
// raison.

import { CAPS, tourner, devant, nomCap } from './cardinal.js';

export { CAPS, tourner, devant, nomCap };

/** Les blocs du langage. Volontairement peu nombreux. */
export const BLOCS = {
    avance: { cat: 'mvt', libelle: 'avancer de', unite: 'case' },
    droite: { cat: 'mvt', libelle: 'tourner à droite' },
    gauche: { cat: 'mvt', libelle: 'tourner à gauche' },
    pose: { cat: 'action', libelle: 'poser une pastille' },
    repete: { cat: 'ctrl', libelle: 'répéter', unite: 'fois', corps: true }
};

/** Le texte d'un bloc, tel qu'on le lit à voix haute. */
export function direBloc(b) {
    if (b.type === 'avance') return `avancer de ${b.n} case${b.n > 1 ? 's' : ''}`;
    if (b.type === 'repete') return `répéter ${b.n} fois`;
    return BLOCS[b.type]?.libelle || b.type;
}

const copie = (e) => ({ x: e.x, y: e.y, cap: e.cap, marques: e.marques.map(m => ({ ...m })) });
const dansLaGrille = (g, x, y) => x >= 0 && y >= 0 && x < g.cols && y < g.rows;

/**
 * DÉROULE LE PROGRAMME, et garde la trace de chaque pas.
 *
 * Un « pas » est une action élémentaire : avancer, tourner, poser. `répéter`
 * n'en est pas un — c'est lui qui fabrique les autres, plusieurs fois. Chaque
 * pas sait d'où il vient (`chemin` : le bloc dans l'arbre) et à quel tour de
 * boucle (`tours`), et c'est exactement ce qu'il faut pour allumer le bon bloc
 * à l'écran et afficher « tour 2 sur 3 ».
 *
 * `hors` signale une sortie de grille. On ne « bloque » pas le robot au bord :
 * un programme qui sort est un programme mal tiré, et c'est au tirage de le
 * refuser — pas à l'élève de deviner une règle de bord qu'on ne lui a pas dite.
 */
export function derouler(programme, depart, grille) {
    const etat = { x: depart.x, y: depart.y, cap: depart.cap, marques: [] };
    const pas = [];
    let hors = false;

    const appliquer = (b) => {
        if (b.type === 'avance') {
            for (let i = 0; i < b.n; i++) {
                const n = devant(etat.x, etat.y, etat.cap);
                if (!dansLaGrille(grille, n.x, n.y)) { hors = true; return; }
                etat.x = n.x; etat.y = n.y;
            }
        } else if (b.type === 'droite' || b.type === 'gauche') {
            etat.cap = tourner(etat.cap, b.type);
        } else if (b.type === 'pose') {
            if (!etat.marques.some(m => m.x === etat.x && m.y === etat.y)) {
                etat.marques.push({ x: etat.x, y: etat.y });
            }
        }
    };

    const jouer = (blocs, chemin, tours) => {
        for (let i = 0; i < (blocs || []).length; i++) {
            if (hors) return;
            const b = blocs[i];
            const ici = [...chemin, i];
            if (b.type === 'repete') {
                for (let t = 1; t <= b.n && !hors; t++) {
                    jouer(b.corps, ici, [...tours, { tour: t, total: b.n }]);
                }
                continue;
            }
            const avant = copie(etat);
            appliquer(b);
            if (hors) return;
            pas.push({ bloc: b, chemin: ici, tours: tours.map(t => ({ ...t })), avant, apres: copie(etat) });
        }
    };

    jouer(programme, [], []);
    return { pas, fin: copie(etat), hors };
}

/** Le nombre de blocs élémentaires écrits (la boucle comptée une seule fois). */
export function tailleProgramme(blocs) {
    return (blocs || []).reduce((s, b) => s + 1 + (b.corps ? tailleProgramme(b.corps) : 0), 0);
}

// --- Le jugement d'un geste ----------------------------------------------------

/**
 * L'élève a fait un geste : est-ce celui que le bloc demandait ?
 *
 * On renvoie de quoi EXPLIQUER, pas seulement de quoi sanctionner. Trois
 * erreurs se distinguent, et elles n'appellent pas la même phrase :
 *
 *   MAUVAIS GESTE.  On tourne alors que le bloc dit d'avancer. L'élève ne lit
 *                   pas le bloc — ou il a perdu le fil du compteur.
 *   MAUVAIS COMPTE. La bonne direction, le mauvais nombre de cases. Il a lu le
 *                   bloc mais pas son nombre.
 *   MIROIR.         Il tourne du côté de l'ÉCRAN au lieu du côté du robot.
 *                   C'est l'erreur de fond, et la seule qui se corrige d'une
 *                   phrase — à condition de la nommer.
 */
export function jugerGeste(deroule, k, geste) {
    const p = deroule.pas[k];
    if (!p) return { fini: true };
    const b = p.bloc;

    if (b.type === 'avance') {
        if (geste.type !== 'case') {
            return {
                ok: false, faute: 'mauvais-geste',
                message: `Le bloc allumé dit « ${direBloc(b)} » : touche la case où le robot arrive.`
            };
        }
        if (geste.x === p.apres.x && geste.y === p.apres.y) return { ok: true };
        // Est-ce au moins dans la bonne direction ?
        const [dx, dy] = [geste.x - p.avant.x, geste.y - p.avant.y];
        const droitDevant = (dx === 0 || dy === 0)
            && CAPS.find(c => {
                const v = devant(p.avant.x, p.avant.y, c);
                return Math.sign(v.x - p.avant.x) === Math.sign(dx)
                    && Math.sign(v.y - p.avant.y) === Math.sign(dy);
            }) === p.avant.cap;
        if (droitDevant) {
            const combien = Math.abs(dx) + Math.abs(dy);
            return {
                ok: false, faute: 'mauvais-compte',
                message: `La direction est bonne, mais le bloc dit ${b.n} case${b.n > 1 ? 's' : ''} — tu en as compté ${combien}.`
            };
        }
        return {
            ok: false, faute: 'mauvaise-direction',
            message: `Le robot regarde vers ${nomCap(p.avant.cap)}. « Avancer », c'est tout droit devant LUI : il ne tourne pas tout seul.`
        };
    }

    if (b.type === 'droite' || b.type === 'gauche') {
        if (geste.type !== 'droite' && geste.type !== 'gauche') {
            return {
                ok: false, faute: 'mauvais-geste',
                message: `Le bloc allumé dit « ${direBloc(b)} » : utilise le bouton qui tourne.`
            };
        }
        if (geste.type === b.type) return { ok: true };
        // Tourner du mauvais côté quand le robot ne monte pas, c'est presque
        // toujours avoir raisonné sur l'écran plutôt que sur le robot.
        const miroir = p.avant.cap !== 'N';
        return {
            ok: false, faute: miroir ? 'miroir' : 'mauvais-sens',
            message: miroir
                ? `Le robot roule vers ${nomCap(p.avant.cap)} : sa ${b.type} n'est pas de ce côté de l'écran. Mets-toi à sa place.`
                : `Le bloc dit « ${direBloc(b)} ».`
        };
    }

    if (b.type === 'pose') {
        if (geste.type === 'pose') return { ok: true };
        return {
            ok: false, faute: 'mauvais-geste',
            message: 'Le bloc allumé dit « poser une pastille » : le robot ne bouge pas, il pose.'
        };
    }
    return { ok: false, faute: 'inconnu', message: '' };
}

/** En mode prédiction : la case cliquée est-elle celle de l'arrivée ? */
export function jugerArrivee(deroule, geste) {
    const f = deroule.fin;
    if (geste.x === f.x && geste.y === f.y) return { ok: true };
    const loin = Math.abs(geste.x - f.x) + Math.abs(geste.y - f.y);
    return {
        ok: false,
        message: loin <= 1
            ? 'Tout près : reprends le programme bloc par bloc, il manque un pas.'
            : 'Refais le programme dans ta tête, en pointant du doigt le bloc où tu en es — surtout dans la boucle.'
    };
}

// --- Le tirage des programmes ---------------------------------------------------

const NIVEAUX = {
    // Sept réglages au lieu de trois : c'est le NOMBRE de formes de programme
    // qui fait la variété, pas la taille de la grille. Quatre programmes
    // d'affilée « avance, tourne, avance » se ressemblent tous, même tirés au
    // hasard — et l'élève cesse de lire dès qu'il a reconnu la forme.
    decouverte: { cols: 5, rows: 5, blocs: [2, 3], boucle: null, avance: [1, 2], pose: false },
    facile: { cols: 5, rows: 5, blocs: [3, 4], boucle: null, avance: [1, 2], pose: false },
    poser: { cols: 5, rows: 5, blocs: [4, 5], boucle: null, avance: [1, 2], pose: true },
    boucleSimple: { cols: 5, rows: 5, blocs: [0, 1], boucle: { tours: [2, 3], corps: 2 }, avance: [1, 2], pose: false },
    moyen: { cols: 5, rows: 5, blocs: [1, 2], boucle: { tours: [2, 4], corps: 2 }, avance: [1, 2], pose: true },
    long: { cols: 6, rows: 6, blocs: [2, 3], boucle: { tours: [2, 3], corps: 3 }, avance: [1, 3], pose: true },
    difficile: { cols: 6, rows: 6, blocs: [1, 2], boucle: { tours: [3, 4], corps: 3 }, avance: [1, 3], pose: true },
    // Deux boucles dans le même programme : l'allumage remonte deux fois, à
    // deux endroits différents. C'est là qu'on voit qui a compris.
    deuxBoucles: { cols: 6, rows: 6, blocs: [0, 1], boucle: { tours: [2, 3], corps: 2 }, boucles: 2, avance: [1, 2], pose: true }
};

export const TAILLES_NIVEAU = NIVEAUX;

/**
 * LES PALIERS — le jeu conduit l'élève au lieu de le laisser au même endroit.
 *
 * Trois réglages figés dans un menu, c'est un choix de professeur, pas une
 * progression : l'élève qui ouvre le jeu reste toute la séance sur la même
 * marche. Ici les paliers s'enchaînent, et surtout LE CHANGEMENT SE DIT — on
 * annonce qu'on éteint le surligneur avant de l'éteindre. Une aide qui
 * disparaît sans prévenir se lit comme une panne.
 *
 * UNE SEULE IDÉE NEUVE PAR PALIER, et la boucle arrive VITE : elle est le
 * cœur de l'exercice — c'est elle qui fait remonter l'allumage dans le
 * programme, et c'est cela qu'un enfant qui empile des blocs jusqu'à ce que
 * « ça marche » n'a jamais vu. Les deux paliers qui la précèdent ne durent
 * donc qu'un programme chacun : le temps de comprendre qu'on exécute, pas
 * qu'on écrit. La boucle est là au troisième, et ne repart plus.
 */
export const PALIERS = [
    {
        id: 'p1', titre: 'Bloc à bloc', niveau: 'decouverte',
        surligneur: true, prediction: false, questions: 1,
        annonce: 'Le bloc allumé dit ce qu\'il faut faire. Tu l\'exécutes, il passe au suivant.'
    },
    {
        id: 'p2', titre: 'Poser des pastilles', niveau: 'poser',
        surligneur: true, prediction: false, questions: 1,
        annonce: 'Un nouveau bloc : « poser une pastille ». Le robot ne bouge pas, il marque la case.'
    },
    {
        id: 'p3', titre: 'La boucle', niveau: 'boucleSimple',
        surligneur: true, prediction: false, questions: 3,
        annonce: 'Voici « répéter ». Regarde bien : l\'allumage va REMONTER dans le programme.'
    },
    {
        id: 'p4', titre: 'À toi de suivre', niveau: 'moyen',
        surligneur: false, prediction: false, questions: 3,
        annonce: 'Plus rien ne s\'allume. C\'est à toi de savoir où tu en es dans le programme — pointe-le du doigt si besoin.'
    },
    {
        id: 'p5', titre: 'Un long programme', niveau: 'long',
        surligneur: false, prediction: false, questions: 3,
        annonce: 'Plus long, toujours sans surligneur. Compte les tours de boucle avant de bouger.'
    },
    {
        id: 'p6', titre: 'Dans ta tête', niveau: 'difficile',
        surligneur: false, prediction: true, questions: 3,
        annonce: 'Cette fois, ne bouge pas le robot : lis TOUT le programme dans ta tête, puis touche la case où il arrive.'
    },
    {
        id: 'p7', titre: 'Deux boucles', niveau: 'deuxBoucles',
        surligneur: false, prediction: true, questions: 4,
        annonce: 'Deux boucles dans le même programme. Toujours de tête : où arrive-t-il ?'
    }
];

/** Le palier en cours d'après le nombre de programmes déjà réussis. */
export function palierPour(reussis) {
    let reste = Math.max(0, reussis);
    for (let i = 0; i < PALIERS.length; i++) {
        if (reste < PALIERS[i].questions) return { palier: PALIERS[i], index: i, dans: reste };
        reste -= PALIERS[i].questions;
    }
    // Au-delà du dernier, on y reste : le jeu ne s'arrête pas, il se corse.
    return { palier: PALIERS[PALIERS.length - 1], index: PALIERS.length - 1, dans: reste };
}

/**
 * Tire un programme JOUABLE : il tient dans la grille, et il a de quoi occuper.
 *
 * La contrainte de bord n'est pas cosmétique. Un programme qui sort de la
 * grille obligerait à inventer une règle (« le robot se cogne et s'arrête »)
 * que personne n'aurait apprise, et l'élève aurait tort en ayant raison. On
 * tire donc, on déroule, et on jette ce qui sort.
 */
export function tirerProgramme(niveau, rng) {
    const N = NIVEAUX[niveau] || NIVEAUX.moyen;
    const grille = { cols: N.cols, rows: N.rows };
    const entre = ([a, b]) => rng.int(a, b);

    for (let essai = 0; essai < 400; essai++) {
        const depart = {
            x: rng.int(1, grille.cols - 2),
            y: rng.int(1, grille.rows - 2),
            cap: rng.pick(CAPS)
        };
        const bloc = () => {
            const r = rng.next();
            if (r < 0.45) return { type: 'avance', n: entre(N.avance) };
            if (r < 0.72) return { type: rng.bool() ? 'droite' : 'gauche' };
            if (N.pose && r < 0.86) return { type: 'pose' };
            return { type: 'avance', n: entre(N.avance) };
        };

        // Un corps de boucle contient TOUJOURS un virage et une avance : sans
        // virage, « répéter 3 fois avancer de 2 » se lit « avancer de 6 » et
        // la boucle n'apprend rien ; sans avance, le robot tourne sur place.
        const corpsDeBoucle = () => {
            const corps = [];
            for (let i = 0; i < N.boucle.corps; i++) corps.push(bloc());
            if (!corps.some(b => b.type === 'droite' || b.type === 'gauche')) {
                corps[corps.length - 1] = { type: rng.bool() ? 'droite' : 'gauche' };
            }
            if (!corps.some(b => b.type === 'avance')) corps[0] = { type: 'avance', n: entre(N.avance) };
            return corps;
        };

        const programme = [];
        const avant = entre(N.blocs);
        for (let i = 0; i < avant; i++) programme.push(bloc());
        if (N.boucle) {
            const combien = N.boucles || 1;
            for (let b = 0; b < combien; b++) {
                programme.push({ type: 'repete', n: entre(N.boucle.tours), corps: corpsDeBoucle() });
                // Entre deux boucles, un bloc ou deux : sans quoi elles se
                // touchent et se lisent comme une seule.
                const entreDeux = b < combien - 1 ? rng.int(1, 2) : rng.int(0, 1);
                for (let i = 0; i < entreDeux; i++) programme.push(bloc());
            }
        }

        const d = derouler(programme, depart, grille);
        if (d.hors) continue;
        if (d.pas.length < 3 || d.pas.length > 18) continue;
        // Un programme qui ne déplace jamais le robot ne se voit pas.
        if (d.fin.x === depart.x && d.fin.y === depart.y && !d.fin.marques.length) continue;
        return { grille, depart, programme, deroule: d };
    }

    // Filet de sécurité : un carré, qui tient dans n'importe quelle grille.
    const depart = { x: 1, y: grille.rows - 2, cap: 'N' };
    const programme = [{ type: 'repete', n: 3, corps: [{ type: 'avance', n: 2 }, { type: 'droite' }] }];
    return { grille, depart, programme, deroule: derouler(programme, depart, grille) };
}
