// LE PARKING — huit voitures, une seule voie, et une place pour se ranger.
//
// Rémy, avec « Le jeu de fin de semaine » de son Coin des jeux mathématiques :
// « Le but du jeu est de déplacer les véhicules pour que tous les véhicules de
// gauche se retrouvent à droite et ceux de droite à gauche. Les véhicules se
// déplacent case par case sachant qu'une voiture ne peut pas SAUTER au-dessus
// d'une autre ! »
//
// LE PLATEAU N'EST PAS UN RECTANGLE, ET C'EST TOUT LE PROBLÈME. Deux parkings
// de quatre places, reliés par une voie unique de trois cases — et, sous le
// milieu de cette voie, UNE case de plus. Cette case-là est le sujet du jeu :
// c'est la seule où une voiture peut se ranger pour en laisser passer une
// autre. Sans elle, rien ne se croise et rien n'est possible.
//
//     ·  ·  ·  ·  ·        colonne de gauche : les bleues
//     G  R  R  R  D        la voie unique
//     ·  ·  P  ·  ·        la place de dégagement
//     ·  ·  ·  ·  ·        colonne de droite : les rouges
//
// PAS DE SENS IMPOSÉ, contrairement aux grenouilles : une voiture recule si
// elle veut. Le blocage ne vient donc pas d'un sens interdit mais de la PLACE —
// il n'y a que quatre cases libres pour huit voitures, et une voie où l'on ne
// se double pas. C'est un tout autre raisonnement, et c'est pour cela que les
// deux jeux se complètent au lieu de se répéter.
//
// LE PLATEAU EST UN GRAPHE, ET LE JEU TIENT DANS UNE TABLE. Les positions sont
// peu nombreuses — les voitures d'une même couleur étant interchangeables, il y
// en a 34 650 pour le plateau de la revue —, alors on calcule UNE FOIS la
// distance au but de chacune, et tout se lit dedans : le minimum, ce qu'il
// reste, et le bon coup. Le minimum se démontre au lieu de se raconter, et il
// est plus grand qu'on ne croit : 104 coups pour le jeu de Rémy. C'est bien
// « le jeu de fin de semaine ».
//
// Module pur : ni DOM, ni hasard propre.

/** Les plateaux proposés. Celui de la revue est le « moyen ». */
export const TAILLES_PARKING = {
    // Les minimums ne sont pas écrits à la main : ils sortent de la table de
    // distances, et un test les refige à chaque fois qu'on touche au plateau.
    minuscule: { id: 'minuscule', label: '2 contre 2 — pour découvrir (36 coups)', n: 2 },
    petit: { id: 'petit', label: '3 contre 3 (62 coups)', n: 3 },
    moyen: { id: 'moyen', label: '4 contre 4 — le jeu de la revue (104 coups)', n: 4 },
    grand: { id: 'grand', label: '5 contre 5 — le grand parking (146 coups)', n: 5 }
};

/**
 * LE PLATEAU, EN CASES ET EN VOISINAGES.
 *
 * `mid` est la rangée où passe la voie : celle du milieu, arrondie vers le
 * haut. Pour quatre voitures, c'est la deuxième rangée — exactement le dessin
 * de la revue.
 */
export function plateauParking(n) {
    const mid = Math.floor((n - 1) / 2);
    const cases = [];
    const ajouter = (x, y, zone) => { cases.push({ x, y, zone, id: cases.length }); };
    for (let y = 0; y < n; y++) ajouter(0, y, 'gauche');
    for (let x = 1; x <= 3; x++) ajouter(x, mid, 'voie');
    ajouter(2, mid + 1, 'place');
    for (let y = 0; y < n; y++) ajouter(4, y, 'droite');

    const parXY = new Map(cases.map(c => [`${c.x},${c.y}`, c.id]));
    const voisins = cases.map(c => [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .map(([dx, dy]) => parXY.get(`${c.x + dx},${c.y + dy}`))
        .filter(v => v !== undefined));
    return { n, mid, cases, voisins, largeur: 5, hauteur: Math.max(n, mid + 2) };
}

/** Au départ : les bleues à gauche, les rouges à droite, la voie libre. */
export const departParking = (p) =>
    p.cases.map(c => (c.zone === 'gauche' ? 'B' : c.zone === 'droite' ? 'R' : null));

/** À l'arrivée : elles ont échangé de parking, et la voie est libre. */
export const arriveeParking = (p) =>
    p.cases.map(c => (c.zone === 'gauche' ? 'R' : c.zone === 'droite' ? 'B' : null));

/**
 * TOUS LES COUPS POSSIBLES : une voiture glisse sur une case voisine LIBRE.
 *
 * « Une voiture ne peut pas sauter au-dessus d'une autre » se traduit
 * exactement par là — on ne va que sur du vide, et seulement à côté.
 */
export function coupsPossiblesParking(p, etat) {
    const coups = [];
    etat.forEach((v, i) => {
        if (!v) return;
        p.voisins[i].forEach(j => { if (!etat[j]) coups.push({ de: i, vers: j, couleur: v }); });
    });
    return coups;
}

/** Le coup joué, sur un nouvel état — l'ancien n'est jamais modifié. */
export function jouerParking(p, etat, de, vers) {
    if (!etat[de] || etat[vers] || !p.voisins[de].includes(vers)) return etat;
    const suite = etat.slice();
    suite[vers] = suite[de];
    suite[de] = null;
    return suite;
}

/**
 * GAGNÉ QUAND LES DEUX PARKINGS ONT ÉCHANGÉ.
 *
 * L'ordre à l'intérieur d'un parking ne compte pas : deux voitures bleues sont
 * deux voitures bleues. Exiger un ordre précis multiplierait la difficulté par
 * vingt-quatre sans rien apprendre de plus.
 */
export const estGagneParking = (p, etat) =>
    p.cases.every((c, i) => (c.zone === 'gauche' ? etat[i] === 'R'
        : c.zone === 'droite' ? etat[i] === 'B' : etat[i] === null));

const cle = (etat) => etat.map(v => v || '.').join('');

/**
 * LA DISTANCE AU BUT DE **TOUTES** LES POSITIONS, calculée une seule fois.
 *
 * La première version cherchait le plus court chemin à chaque coup, par un
 * parcours en largeur depuis la position courante. C'était juste, et
 * inutilisable : le compteur « il en reste N » se redemande à chaque
 * redessin, et sur le grand parking — deux cent cinquante mille positions —
 * cela faisait deux secondes par clic.
 *
 * On retourne donc le problème : UN SEUL parcours, en partant de l'ARRIVÉE et
 * en remontant. Comme un coup se défait toujours (une voiture qui a glissé sur
 * une case libre peut revenir), les voisins en arrière sont les mêmes qu'en
 * avant, et la distance obtenue est bien celle du plus court chemin vers le
 * but. Ensuite, tout se lit dans la table :
 *
 *   · le minimum du jeu, c'est la distance de la position de départ ;
 *   · ce qu'il reste au plus court, c'est la distance d'où l'on est ;
 *   · le bon coup, c'est celui qui mène à une distance d'un de moins.
 *
 * La table est gardée en mémoire par taille de plateau : on la paie une fois.
 */
const tables = new Map();
export function tableDistances(n) {
    if (tables.has(n)) return tables.get(n);
    const p = plateauParking(n);
    const but = arriveeParking(p);
    const dist = new Map([[cle(but), 0]]);
    let file = [but];
    let d = 0;
    while (file.length) {
        d++;
        const suivante = [];
        for (const ici of file) {
            for (const c of coupsPossiblesParking(p, ici)) {
                const suite = jouerParking(p, ici, c.de, c.vers);
                const k = cle(suite);
                if (dist.has(k)) continue;
                dist.set(k, d);
                suivante.push(suite);
            }
        }
        file = suivante;
    }
    tables.set(n, dist);
    return dist;
}

/**
 * COMBIEN DE COUPS IL RESTE AU PLUS COURT, ou `null` si la position ne mène
 * nulle part. Sur ce jeu-ci, `null` ne devrait jamais arriver — tout coup se
 * défait, donc on peut toujours revenir sur ses pas — mais le dire coûte une
 * ligne et évite de l'affirmer sans preuve.
 */
export function restantsParking(p, etat) {
    const d = tableDistances(p.n).get(cle(etat));
    return d === undefined ? null : d;
}

/**
 * LE PROCHAIN COUP DU PLUS COURT CHEMIN : celui qui fait descendre la distance
 * d'exactement un. Il y en a souvent plusieurs ; le premier fait l'affaire.
 */
export function prochainCoupParking(p, etat) {
    const dist = tableDistances(p.n);
    const ici = dist.get(cle(etat));
    if (ici === undefined || ici === 0) return null;
    for (const c of coupsPossiblesParking(p, etat)) {
        const suite = jouerParking(p, etat, c.de, c.vers);
        if (dist.get(cle(suite)) === ici - 1) return c;
    }
    return null;
}

/** Le chemin complet, coup par coup — pour le robot et pour les tests. */
export function cheminLePlusCourtParking(p, etat) {
    if (restantsParking(p, etat) === null) return null;
    const chemin = [];
    let ici = etat;
    for (let garde = 0; garde < 400 && !estGagneParking(p, ici); garde++) {
        const c = prochainCoupParking(p, ici);
        if (!c) return null;
        chemin.push(c);
        ici = jouerParking(p, ici, c.de, c.vers);
    }
    return chemin;
}

/** Le minimum du jeu : la distance de la position de départ. */
export function minimumParking(n) {
    const p = plateauParking(n);
    return restantsParking(p, departParking(p));
}

/** De quoi juger une partie : le compte, le minimum, et l'écart. */
export function qualiteParking(n, joues) {
    const mini = minimumParking(n);
    return { n, mini, joues, detours: Math.max(0, joues - mini), parfait: joues === mini };
}
