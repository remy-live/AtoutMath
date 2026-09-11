// POINT À POINT — le noyau : le dessin, l'ordre, et les calculs.
//
// Le jeu d'enfance : on relie 1, 2, 3… et une image apparaît. Ici les numéros
// ne sont pas écrits — CHAQUE POINT PORTE UN CALCUL, et c'est son résultat qui
// donne son rang. « 3 × 4 » est le douzième point.
//
// CE QUI CHANGE TOUT PAR RAPPORT À UN EXERCICE DE CALCUL ORDINAIRE : on ne
// répond pas à une question, on CHERCHE parmi vingt calculs celui qui vaut
// treize. L'élève balaie donc tout le dessin en calculant de tête, encore et
// encore, sans que rien ne le lui demande — et il s'arrête quand l'image
// apparaît, pas quand la fiche est finie.
//
// LES RÉSULTATS SONT LES RANGS EUX-MÊMES, 1, 2, 3… Deux points ne peuvent donc
// pas valoir la même chose, et l'ordre est total : c'est ce qui rend la
// correction possible sans ambiguïté, et c'est aussi ce qui permet de dire
// « tu as sauté le 7 » plutôt qu'un « faux » sec.
//
// DEUX FAÇONS DE CORRIGER, et le choix n'est pas cosmétique :
//   · AU FUR ET À MESURE — un mauvais clic est refusé tout de suite. L'image
//     ne peut pas se déformer, l'élève ne s'enfonce pas.
//   · À LA FIN — tout est accepté, le tracé se fait, et l'on découvre à la fin
//     ce qui cloche. Plus dur, et plus proche d'un contrôle.

import { calculPour } from './skweek.js';

/**
 * Les dessins : une liste de sommets, dans l'ordre où on les relie.
 * Les coordonnées vivent dans un carré de 100 × 100 — l'affichage les met à
 * son échelle, et l'on peut ajouter un dessin sans toucher au reste.
 *
 * `ferme` : le dernier point se relie au premier. Un poisson se ferme, une
 * étoile filante non.
 */
export const DESSINS = {
    maison: {
        id: 'maison', nom: 'La maison', ferme: true,
        points: [[20, 90], [20, 50], [10, 50], [50, 15], [90, 50], [80, 50],
            [80, 90], [58, 90], [58, 62], [38, 62], [38, 90]]
    },
    poisson: {
        id: 'poisson', nom: 'Le poisson', ferme: true,
        points: [[15, 50], [35, 28], [60, 25], [80, 38], [92, 30], [92, 70],
            [80, 62], [60, 75], [35, 72]]
    },
    etoile: {
        id: 'etoile', nom: 'L\'étoile', ferme: true,
        points: [[50, 8], [61, 38], [93, 38], [67, 57], [77, 88], [50, 69],
            [23, 88], [33, 57], [7, 38], [39, 38]]
    },
    voilier: {
        id: 'voilier', nom: 'Le voilier', ferme: true,
        points: [[14, 76], [86, 76], [76, 92], [24, 92], [46, 76], [46, 60],
            [16, 60], [46, 14], [46, 52], [84, 52], [54, 60], [54, 76]]
    },
    fusee: {
        id: 'fusee', nom: 'La fusée', ferme: true,
        points: [[50, 6], [66, 34], [66, 62], [82, 82], [66, 78], [60, 92],
            [40, 92], [34, 78], [18, 82], [34, 62], [34, 34]]
    },
    chat: {
        id: 'chat', nom: 'Le chat', ferme: true,
        points: [[26, 40], [22, 14], [42, 28], [62, 28], [82, 14], [78, 40],
            [86, 58], [78, 82], [58, 92], [46, 92], [26, 82], [18, 58]]
    },
    cle: {
        id: 'cle', nom: 'La clé', ferme: true,
        points: [[22, 22], [38, 22], [38, 46], [86, 46], [86, 58], [78, 58],
            [78, 68], [70, 68], [70, 58], [58, 58], [58, 70], [50, 70],
            [50, 58], [38, 58], [38, 82], [22, 82]]
    }
};

export const NOMS_DESSINS = Object.keys(DESSINS);

/** Les segments à tracer : les couples de rangs consécutifs. */
export function segmentsDe(dessin) {
    const d = DESSINS[dessin] || DESSINS.maison;
    const n = d.points.length;
    const out = [];
    for (let i = 1; i < n; i++) out.push([i, i + 1]);
    if (d.ferme) out.push([n, 1]);
    return out;
}

// --- Les familles de calculs ------------------------------------------------------
//
// `calculPour` (core/skweek.js) sait déjà écrire une expression qui vaut un
// nombre donné : c'est exactement ce qu'il faut ici, et le partager évite deux
// listes de gabarits qui divergeraient.

export const FAMILLES = {
    melange: {
        id: 'melange', nom: 'Mélange',
        ecrire: (v, rng) => calculPour(v, rng)
    },
    addition: {
        id: 'addition', nom: 'Additions',
        ecrire: (v, rng) => {
            const a = rng.int(1, Math.max(1, v - 1));
            return `${a} + ${v - a}`;
        }
    },
    soustraction: {
        id: 'soustraction', nom: 'Soustractions',
        ecrire: (v, rng) => { const b = rng.int(1, 20); return `${v + b} − ${b}`; }
    },
    tables: {
        id: 'tables', nom: 'Tables de multiplication',
        // Tout rang n'est pas un produit de deux facteurs des tables : 13 ne
        // l'est pas. On retombe alors sur une somme plutôt que d'écarter le
        // point — un dessin à trous n'est plus un dessin.
        ecrire: (v, rng) => {
            const produits = [];
            for (let a = 2; a <= 10; a++) {
                if (v % a === 0 && v / a >= 2 && v / a <= 10) produits.push(`${a} × ${v / a}`);
            }
            if (produits.length) return rng.pick(produits);
            const a = rng.int(1, Math.max(1, v - 1));
            return `${a} + ${v - a}`;
        }
    },
    doubles: {
        id: 'doubles', nom: 'Doubles et moitiés',
        ecrire: (v, rng) => {
            // « la moitié de 2v » marche pour tout rang ; « le double de v/2 »
            // seulement quand v est pair.
            const choix = [`la moitié de ${v * 2}`];
            if (v % 2 === 0) choix.push(`le double de ${v / 2}`);
            return rng.pick(choix);
        }
    }
};

export const NOMS_FAMILLES = Object.keys(FAMILLES);

/**
 * Un exercice complet.
 *
 * @param {Object} o
 * @param {Object} o.rng
 * @param {string} [o.dessin]
 * @param {string} [o.famille]
 * @param {string} [o.verification] - 'immediate' ou 'fin'
 */
export function tirerPointAPoint({ rng, dessin = 'maison', famille = 'melange', verification = 'immediate' } = {}) {
    const d = DESSINS[dessin] || DESSINS.maison;
    const f = FAMILLES[famille] || FAMILLES.melange;

    const points = d.points.map(([x, y], i) => {
        const ordre = i + 1;
        return {
            ordre, x, y,
            // Le rang EST le résultat : « 3 × 4 » est le douzième point.
            valeur: ordre,
            texte: f.ecrire(ordre, rng)
        };
    });

    return {
        dessin: d.id, nom: d.nom, ferme: d.ferme,
        famille: f.id, verification,
        points, segments: segmentsDe(d.id),
        total: points.length
    };
}

// --- La partie ------------------------------------------------------------------

export function commencer(exercice) {
    return {
        exercice,
        // L'ordre dans lequel l'élève a cliqué. C'est la seule chose qui change.
        clics: [],
        fini: false
    };
}

/** Le rang attendu au prochain clic. */
export const attendu = (etat) => etat.clics.length + 1;

/**
 * Un clic sur un point.
 *
 * @returns {{ok:boolean, raison?:string, attendu?:number, trace?:boolean, fini?:boolean}}
 */
export function cliquer(etat, ordre) {
    const e = etat.exercice;
    if (etat.fini) return { ok: false, raison: 'fini' };
    if (etat.clics.includes(ordre)) return { ok: false, raison: 'deja' };

    const veut = attendu(etat);
    const juste = ordre === veut;

    if (!juste && e.verification === 'immediate') {
        // ON NE DIT PAS QUEL POINT C'ÉTAIT : chercher le calcul qui vaut le
        // bon nombre est l'exercice.
        return { ok: false, raison: 'pas-le-bon', attendu: veut };
    }

    etat.clics.push(ordre);
    const fini = etat.clics.length === e.total;
    if (fini) etat.fini = true;
    return { ok: true, trace: true, fini, juste };
}

/** Revenir en arrière — on efface le dernier trait. */
export function annuler(etat) {
    if (!etat.clics.length) return false;
    etat.clics.pop();
    etat.fini = false;
    return true;
}

/**
 * La correction, à la fin : les rangs cliqués dans le désordre.
 * Rend la liste des places fautives, pour les montrer sur le dessin.
 */
export function corriger(etat) {
    const fautes = [];
    etat.clics.forEach((ordre, i) => {
        if (ordre !== i + 1) fautes.push({ place: i + 1, clique: ordre, attendu: i + 1 });
    });
    return { ok: fautes.length === 0, fautes };
}

/**
 * Les traits déjà tracés, en couples de points.
 * On ne relie QUE des clics consécutifs — un dessin ne se ferme que si le
 * dernier point a été atteint.
 */
export function traits(etat) {
    const e = etat.exercice;
    const parOrdre = new Map(e.points.map(p => [p.ordre, p]));
    const out = [];
    for (let i = 1; i < etat.clics.length; i++) {
        out.push([parOrdre.get(etat.clics[i - 1]), parOrdre.get(etat.clics[i])]);
    }
    if (e.ferme && etat.fini) {
        out.push([parOrdre.get(etat.clics[etat.clics.length - 1]), parOrdre.get(etat.clics[0])]);
    }
    return out;
}
