// LA CHUTE DES DÉCIMAUX — le noyau : une droite graduée, et une brique à poser.
//
// Rémy : « Je pensais à un jeu sympa, un [segment] en dessous séparé en 10,
// exemple 3 jusque 4, ça fait dix espaces. Des briques tombent du ciel et il
// faut les placer entre les graduations des axes. Exemple 3,15 le placer entre
// 3,1 et 3,2 ».
//
// C'EST L'ENCADREMENT, ET C'EST UNE DES CHOSES QUI RÉSISTENT LE PLUS.
//
// Un élève de sixième sait lire 3,15. Il sait beaucoup moins dire entre quels
// dixièmes il tombe, et il se trompe d'une façon très précise : il lit « 15 »
// après la virgule et le place vers 3,5 — plus loin que 3,2 — parce qu'il
// traite la partie décimale comme un entier. Ce jeu-là attaque exactement cette
// erreur : la brique ne peut se poser que dans un intervalle, et un intervalle
// se DÉSIGNE par ses deux bornes.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// TOUT EST EN ENTIERS, ET CE N'EST PAS UN DÉTAIL D'IMPLÉMENTATION.
//
// 3,1 + 0,1 ne fait pas 3,2 en virgule flottante : il fait
// 3.3000000000000003. Un jeu d'encadrement qui calcule ses graduations en
// flottants finit par afficher « 3,30000000000004 » au tableau, ou pire —
// refuser une réponse juste parce que la comparaison tombe du mauvais côté
// d'un milliardième. On compte donc en MILLIÈMES, en entiers, du début à la
// fin ; on ne divise qu'au dernier moment, pour écrire.

import { makeRng } from './ids.js';

/** L'unité de compte : tout est un nombre entier de millièmes. */
export const PAR_UNITE = 1000;

/**
 * ÉCRIRE UN NOMBRE COMME ON L'ÉCRIT EN FRANÇAIS.
 *
 * La virgule, pas le point — c'est le premier reproche qu'un professeur de
 * mathématiques français fait à un logiciel, et il a raison : l'élève recopie
 * ce qu'il voit sur sa feuille, et il y recopiera un point.
 *
 * ET PAS DE ZÉRO INUTILE : « 3,1 » et non « 3,100 ». Un zéro de remplissage
 * fait croire à une précision qui n'existe pas, et sur une graduation il rend
 * illisible ce qui doit se lire d'un coup d'œil.
 *
 * @param {number} millemes un entier
 */
export function ecrire(millemes) {
    const negatif = millemes < 0;
    const n = Math.abs(Math.round(millemes));
    const entier = Math.floor(n / PAR_UNITE);
    const reste = n % PAR_UNITE;
    let texte = String(entier);
    if (reste) {
        texte += ',' + String(reste).padStart(3, '0').replace(/0+$/, '');
    }
    return (negatif ? '−' : '') + texte;
}

/**
 * DANS QUEL INTERVALLE TOMBE CE NOMBRE ?
 *
 * Les intervalles sont [g0, g1[, [g1, g2[ … — fermés à gauche, ouverts à
 * droite. C'est la convention du collège, et elle décide d'un cas qui arrive
 * tout le temps : un nombre qui tombe PILE sur une graduation. 3,2 appartient à
 * [3,2 ; 3,3[, pas à [3,1 ; 3,2[.
 *
 * On ne pose d'ailleurs jamais de brique pile sur une graduation (voir
 * `genererChute`) : la question deviendrait un piège de convention au lieu
 * d'une question d'encadrement. Mais la règle doit exister, sans quoi deux
 * parties du code en inventeraient chacune une.
 *
 * @returns {number} l'indice de l'intervalle, ou -1 hors du segment
 */
export function intervalleDe(nombre, debut, pas, combien) {
    if (nombre < debut || nombre >= debut + pas * combien) return -1;
    return Math.floor((nombre - debut) / pas);
}

// ─────────────────────────────────────────────────────────── LES NIVEAUX ────
//
// Chacun change UNE chose. Un niveau qui change deux choses à la fois ne dit
// pas à l'élève laquelle il n'a pas comprise — ni au professeur.

export const NIVEAUX = [
    {
        id: 1,
        titre: 'Des dixièmes, entre 0 et 1',
        // Le segment tient entre deux entiers voisins, et l'on cherche un
        // centième. C'est le cas de Rémy, au plus simple.
        segment: () => ({ debut: 0, longueur: 1 * PAR_UNITE }),
        pas: 100,          // dixièmes
        precision: 10      // le nombre est au centième
    },
    {
        id: 2,
        titre: 'Des dixièmes, plus loin sur la droite',
        // Même travail, mais la partie entière n'est plus zéro : c'est là que
        // l'élève qui « oublie » la partie entière se trahit.
        segment: (rng) => ({ debut: rng.int(1, 12) * PAR_UNITE, longueur: 1 * PAR_UNITE }),
        pas: 100,
        precision: 10
    },
    {
        id: 3,
        titre: 'Des centièmes',
        // Le segment ne fait plus qu'un dixième de long, gradué de centième en
        // centième, et l'on cherche un millième. Même geste, un cran plus fin.
        segment: (rng) => ({
            debut: rng.int(0, 9) * PAR_UNITE + rng.int(0, 9) * 100,
            longueur: 100
        }),
        pas: 10,
        precision: 1
    },
    {
        id: 4,
        titre: 'Avec des nombres négatifs',
        // Le piège des relatifs : entre −3 et −2, c'est −2,7 qui est à DROITE
        // de −2,8. L'ordre se renverse pour qui lit la partie décimale seule.
        segment: (rng) => ({ debut: -rng.int(1, 9) * PAR_UNITE, longueur: 1 * PAR_UNITE }),
        pas: 100,
        precision: 10
    }
];

export function niveauDe(n) {
    return NIVEAUX.find(x => x.id === Number(n)) || NIVEAUX[0];
}

// ────────────────────────────────────────────────────── FABRIQUER UN TOUR ───

/**
 * UNE BRIQUE, ET LE SEGMENT OÙ ELLE DOIT TOMBER.
 *
 * ON NE POSE JAMAIS LA BRIQUE SUR UNE GRADUATION. « Où placer 3,2 ? » n'est pas
 * une question d'encadrement : c'est une question de convention (à gauche ou à
 * droite de la borne ?), et l'élève qui se trompe n'a rien appris sur les
 * décimaux. On tire donc strictement à l'intérieur d'un intervalle.
 *
 * @returns {{debut, longueur, pas, combien, graduations, nombre, bonIntervalle,
 *            bornes:{gauche:number, droite:number}, niveau}}
 */
export function genererChute(options = {}) {
    const rng = options.rng || makeRng(options.seed);
    const niveau = niveauDe(options.niveau);
    const { debut, longueur } = niveau.segment(rng);
    const pas = niveau.pas;
    const combien = Math.round(longueur / pas);

    // L'intervalle visé, puis un nombre STRICTEMENT dedans.
    const bonIntervalle = rng.int(0, combien - 1);
    const gauche = debut + bonIntervalle * pas;
    const droite = gauche + pas;
    // Les positions possibles à l'intérieur, bornes exclues.
    const dedans = [];
    for (let v = gauche + niveau.precision; v < droite; v += niveau.precision) dedans.push(v);
    const nombre = dedans.length ? rng.pick(dedans) : gauche + Math.round(pas / 2);

    const graduations = [];
    for (let i = 0; i <= combien; i++) graduations.push(debut + i * pas);

    return {
        niveau: niveau.id, titre: niveau.titre,
        debut, longueur, pas, combien, graduations,
        nombre, bonIntervalle,
        bornes: { gauche, droite }
    };
}

/**
 * LA RÉPONSE, ET CE QU'IL FAUT EN DIRE.
 *
 * On ne rend pas un booléen : on rend de quoi PARLER à l'élève. « C'est faux »
 * n'apprend rien ; « tu l'as posée trop à droite, regarde la partie entière »
 * est une correction. Le sens de l'erreur et sa nature se lisent ici, une fois,
 * plutôt que d'être redevinés par chaque écran.
 *
 * @param {object} tour  ce que `genererChute` a rendu
 * @param {number} pose  l'indice d'intervalle choisi par l'élève
 */
export function verifierPose(tour, pose) {
    const juste = pose === tour.bonIntervalle;
    if (juste) {
        return { juste: true, ecart: 0, sens: '', dire:
            `Oui : ${ecrire(tour.nombre)} est bien entre ${ecrire(tour.bornes.gauche)} `
            + `et ${ecrire(tour.bornes.droite)}.` };
    }
    const ecart = pose - tour.bonIntervalle;
    const sens = ecart > 0 ? 'droite' : 'gauche';

    // L'ERREUR LA PLUS FRÉQUENTE A UN NOM, et on la nomme.
    //
    // L'élève qui place 3,15 vers 3,5 lit « 15 » comme un entier et l'oublie
    // derrière la virgule. Elle se reconnaît : la brique part beaucoup trop à
    // droite, et d'autant plus que le nombre a de décimales. Lui répondre « tu
    // t'es trompé d'intervalle » serait exact et sans usage.
    const loin = Math.abs(ecart) >= 3;
    return {
        juste: false, ecart, sens,
        dire: loin && ecart > 0
            ? `Trop à droite. Après la virgule, ${ecrire(tour.nombre)} n'est pas « ${
                String(Math.abs(tour.nombre) % PAR_UNITE).padStart(3, '0').replace(/0+$/, '')
              } tout seul » : le premier chiffre après la virgule dit le DIXIÈME, `
              + `et c'est lui qui décide entre quelles graduations on tombe.`
            : `Pas tout à fait : c'est ${Math.abs(ecart)} intervalle${
                Math.abs(ecart) > 1 ? 's' : ''} trop à ${sens}. `
              + `${ecrire(tour.nombre)} tombe entre ${ecrire(tour.bornes.gauche)} et `
              + `${ecrire(tour.bornes.droite)}.`
    };
}

/**
 * L'AIDE : on ne donne pas l'intervalle, on donne la LECTURE.
 *
 * Trois degrés, et le troisième seulement si l'on insiste — recevoir la réponse
 * du premier coup n'apprend pas à la trouver.
 */
export function aider(tour, degre = 0) {
    const n = tour.nombre;
    const g = tour.bornes.gauche;
    if (degre <= 0) {
        return 'Regarde d\'abord la partie entière : elle dit dans quelle unité on est. '
            + 'Puis le premier chiffre après la virgule.';
    }
    if (degre === 1) {
        return `Le segment va de ${ecrire(tour.debut)} à `
            + `${ecrire(tour.debut + tour.longueur)}, en ${tour.combien} morceaux. `
            + `Compte combien de pas de ${ecrire(tour.pas)} il faut pour atteindre `
            + `${ecrire(n)}.`;
    }
    return `${ecrire(n)} est juste après ${ecrire(g)} : c'est là qu'elle se pose.`;
}
