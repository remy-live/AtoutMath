// LES GRENOUILLES — quatre vertes, quatre rouges, et un seul nénuphar libre.
//
// Rémy, avec la page de son « Coin des jeux mathématiques » : « Les grenouilles
// vertes ne peuvent aller qu'à droite et les rouges qu'à gauche. Une grenouille
// n'a le droit de sauter qu'au-dessus d'une seule grenouille. » Le but : que
// les deux groupes aient échangé leurs places.
//
// C'EST UN CASSE-TÊTE À SENS UNIQUE, et c'est ce qui le rend redoutable. On ne
// revient jamais en arrière — une verte n'ira jamais à gauche — donc une seule
// maladresse et la position est MORTE : plus aucun coup possible, alors qu'il
// reste des grenouilles à échanger. Le jeu ne se perd pas, il se BLOQUE, et
// c'est une expérience mathématique en soi.
//
// LA FAUTE QU'ON FAIT TOUS : avancer deux grenouilles de la même couleur à la
// suite. Deux vertes côte à côte devant une rouge, et plus personne ne passe —
// un saut ne franchit qu'UNE grenouille. La règle qui sauve : on alterne les
// couleurs, toujours.
//
// LE NOMBRE MINIMUM DE COUPS EST n² + 2n POUR n GRENOUILLES DE CHAQUE COULEUR.
// Quatre et quatre : 24 coups. Et ce nombre se démontre plutôt qu'il ne se
// compte : il y a n × n croisements à faire — chaque verte doit dépasser chaque
// rouge, et cela se fait par un SAUT —, plus 2n glissades, une par grenouille.
// C'est un joli exercice de dénombrement caché dans un jeu de maternelle.
//
// L'ÉTAT EST UN RUBAN : 'V', 'R' ou `null` pour le nénuphar libre.
//
// Module pur : ni DOM, ni hasard propre.

/** Les tailles proposées, et le nombre de coups qu'il faut. */
export const TAILLES_GRENOUILLES = {
    deux: { id: 'deux', label: '2 contre 2 — 8 coups', n: 2 },
    trois: { id: 'trois', label: '3 contre 3 — 15 coups', n: 3 },
    quatre: { id: 'quatre', label: '4 contre 4 — 24 coups', n: 4 },
    cinq: { id: 'cinq', label: '5 contre 5 — 35 coups', n: 5 }
};

/** n² + 2n : les n × n croisements, plus une glissade par grenouille. */
export const minimumGrenouilles = (n) => n * n + 2 * n;

/** Le départ : les vertes à gauche, le nénuphar libre au milieu, les rouges à droite. */
export const departGrenouilles = (n) => [
    ...new Array(n).fill('V'), null, ...new Array(n).fill('R')
];

/** L'arrivée : les deux groupes ont échangé leurs places. */
export const arriveeGrenouilles = (n) => [
    ...new Array(n).fill('R'), null, ...new Array(n).fill('V')
];

/**
 * TOUS LES COUPS POSSIBLES depuis une position.
 *
 * Une verte avance d'un cran si le nénuphar suivant est libre, ou saute
 * par-dessus UNE grenouille si celui d'après l'est. Les rouges font l'inverse.
 * Les deux ne peuvent jamais s'appliquer en même temps à la même grenouille —
 * glisser demande la case voisine libre, sauter la demande occupée — donc
 * CHAQUE GRENOUILLE A AU PLUS UN COUP. C'est ce qui permet, à l'écran, de
 * jouer en touchant simplement la bête.
 */
export function coupsPossibles(etat) {
    const vide = etat.indexOf(null);
    const coups = [];
    // On regarde depuis le nénuphar libre : qui peut venir s'y poser ?
    // Une verte vient de la gauche (d'un ou deux crans), une rouge de la droite.
    [[vide - 1, 'V'], [vide - 2, 'V'], [vide + 1, 'R'], [vide + 2, 'R']].forEach(([de, qui]) => {
        if (de < 0 || de >= etat.length || etat[de] !== qui) return;
        // Un saut ne franchit qu'une grenouille, et il en faut bien une.
        if (Math.abs(de - vide) === 2 && etat[(de + vide) / 2] === null) return;
        coups.push({ de, vers: vide, saut: Math.abs(de - vide) === 2, couleur: qui });
    });
    return coups;
}

/** Le coup joué, sur un nouveau ruban — l'ancien n'est jamais modifié. */
export function jouerGrenouille(etat, de) {
    const c = coupsPossibles(etat).find(x => x.de === de);
    if (!c) return etat;
    const suite = etat.slice();
    suite[c.vers] = suite[c.de];
    suite[c.de] = null;
    return suite;
}

/** Gagné quand les deux groupes ont échangé leurs places. */
export const estGagneGrenouilles = (etat, n) =>
    etat.every((v, i) => v === arriveeGrenouilles(n)[i]);

/** Bloqué : plus un seul coup, et l'échange n'est pas fait. */
export const estBloque = (etat, n) =>
    !coupsPossibles(etat).length && !estGagneGrenouilles(etat, n);

/**
 * LE CHEMIN LE PLUS COURT DEPUIS N'IMPORTE QUELLE POSITION.
 *
 * On explore en largeur : les positions sont peu nombreuses — pour cinq contre
 * cinq, onze nénuphars et deux couleurs font moins de trois mille rubans — et
 * la largeur d'abord donne LE plus court chemin, pas un chemin quelconque.
 *
 * C'est ce qui permet à l'indice de dire la vérité même après une maladresse :
 * il ne rejoue pas une solution apprise par cœur, il recalcule depuis là où
 * l'on est. Et quand il ne trouve rien, c'est que la position est morte — une
 * information autrement plus utile qu'un « essaie encore ».
 */
export function cheminLePlusCourt(etat, n) {
    const but = arriveeGrenouilles(n).join('');
    const cle = (e) => e.map(v => v || '.').join('');
    const depart = cle(etat);
    if (depart === but.replace(/null/g, '.')) return [];
    const vus = new Map([[depart, null]]);
    const file = [etat];
    while (file.length) {
        const ici = file.shift();
        for (const c of coupsPossibles(ici)) {
            const suite = jouerGrenouille(ici, c.de);
            const k = cle(suite);
            if (vus.has(k)) continue;
            vus.set(k, { avant: cle(ici), coup: c });
            if (estGagneGrenouilles(suite, n)) {
                // On remonte la piste jusqu'au départ.
                const chemin = [];
                let courant = k;
                while (vus.get(courant)) {
                    chemin.unshift(vus.get(courant).coup);
                    courant = vus.get(courant).avant;
                }
                return chemin;
            }
            file.push(suite);
        }
    }
    return null;
}

/** Le prochain coup du chemin le plus court, ou `null` si la position est morte. */
export function prochainCoupGrenouilles(etat, n) {
    const chemin = cheminLePlusCourt(etat, n);
    return chemin && chemin.length ? chemin[0] : null;
}

/**
 * LA PARTIE PARFAITE, POSITION PAR POSITION — pour la feuille de solutions.
 * Le départ, puis le ruban après chaque coup. Voir `etapesBrahma`.
 */
export function etapesGrenouilles(n) {
    let etat = departGrenouilles(n);
    const etapes = [etat];
    for (const c of (cheminLePlusCourt(etat, n) || [])) {
        etat = jouerGrenouille(etat, c.de);
        etapes.push(etat);
    }
    return etapes;
}

/** De quoi juger une partie : le compte, le minimum, et l'écart. */
export function qualiteGrenouilles(n, joues) {
    const mini = minimumGrenouilles(n);
    return {
        n, mini, joues,
        detours: Math.max(0, joues - mini),
        parfait: joues === mini,
        // Les n × n sauts sont les croisements : chaque verte doit dépasser
        // chaque rouge, et cela ne se fait qu'en sautant.
        sauts: n * n, glissades: 2 * n
    };
}
