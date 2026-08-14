// LE TABLEAU DE CONVERSION — le noyau : les colonnes, le nombre, la virgule.
//
// Convertir n'est pas multiplier par une puissance de dix apprise par cœur :
// c'est LIRE LE MÊME NOMBRE DANS UNE AUTRE COLONNE. Le tableau rend cela
// visible, et c'est pour ça qu'on le construit au lieu de le donner tout fait.
//
// L'exercice se fait en trois temps, et chacun isole une erreur différente :
//
//   1. PLACER LES UNITÉS. Une seule fois, au début : km, hm, dam, m, dm, cm,
//      mm dans l'ordre. Tant que cet ordre n'est pas su, tout le reste est du
//      hasard — et c'est là que se joue « hecto avant déca », qui se trompe
//      une fois sur deux.
//   2. PLACER LE NOMBRE. Le chiffre des unités va dans la colonne de SON
//      unité, et les autres suivent. C'est le geste que l'élève saute : il
//      écrit 3,45 collé à gauche du tableau et convertit un nombre qui n'est
//      pas le sien.
//   3. POSER LA VIRGULE, PUIS LES ZÉROS. La virgule se pose après la colonne
//      de l'unité demandée — jamais ailleurs — et l'on ne comble de zéros que
//      ce qui se trouve ENTRE les chiffres et cette virgule. Un zéro de trop à
//      droite ne change pas la valeur mais n'est pas la bonne écriture ; un
//      zéro manquant à gauche fait perdre un facteur dix.
//
// LE RANG EST ABSOLU, comme dans core/poser.js : le mètre vaut 0, le
// décimètre −1, le kilomètre 3. Un chiffre du nombre au rang décimal r, pour
// une unité de départ au rang u, tombe dans la colonne u + r. Toute la
// conversion tient dans cette addition.
//
// LES AIRES ET LES VOLUMES NE SONT PAS ICI. Leur tableau a deux (ou trois)
// sous-colonnes par unité, parce qu'on passe de m² à dm² en multipliant par
// cent. Les faire entrer dans ce moule-ci donnerait un mauvais compromis pour
// les deux : c'est un second tableau, pas un réglage.

import { chiffreAuRang, rangsDe, decimales } from './poser.js';

/**
 * Les familles d'unités à une colonne par unité — celles dont l'échelon vaut
 * dix. Le `rang` est la puissance de dix par rapport à l'unité de base.
 */
export const FAMILLES = {
    longueur: {
        id: 'longueur', nom: 'Longueurs', base: 'm',
        unites: [
            { symbole: 'km', nom: 'kilomètre', rang: 3 },
            { symbole: 'hm', nom: 'hectomètre', rang: 2 },
            { symbole: 'dam', nom: 'décamètre', rang: 1 },
            { symbole: 'm', nom: 'mètre', rang: 0 },
            { symbole: 'dm', nom: 'décimètre', rang: -1 },
            { symbole: 'cm', nom: 'centimètre', rang: -2 },
            { symbole: 'mm', nom: 'millimètre', rang: -3 }
        ]
    },
    masse: {
        id: 'masse', nom: 'Masses', base: 'g',
        unites: [
            { symbole: 'kg', nom: 'kilogramme', rang: 3 },
            { symbole: 'hg', nom: 'hectogramme', rang: 2 },
            { symbole: 'dag', nom: 'décagramme', rang: 1 },
            { symbole: 'g', nom: 'gramme', rang: 0 },
            { symbole: 'dg', nom: 'décigramme', rang: -1 },
            { symbole: 'cg', nom: 'centigramme', rang: -2 },
            { symbole: 'mg', nom: 'milligramme', rang: -3 }
        ]
    },
    capacite: {
        id: 'capacite', nom: 'Contenances', base: 'L',
        unites: [
            { symbole: 'hL', nom: 'hectolitre', rang: 2 },
            { symbole: 'daL', nom: 'décalitre', rang: 1 },
            { symbole: 'L', nom: 'litre', rang: 0 },
            { symbole: 'dL', nom: 'décilitre', rang: -1 },
            { symbole: 'cL', nom: 'centilitre', rang: -2 },
            { symbole: 'mL', nom: 'millilitre', rang: -3 }
        ]
    }
};

export const NOMS_FAMILLES = Object.keys(FAMILLES);

export const familleDe = (id) => FAMILLES[id] || FAMILLES.longueur;
export const uniteDe = (famille, symbole) =>
    familleDe(famille).unites.find(u => u.symbole === symbole) || null;

// --- Étape 1 : placer les unités ------------------------------------------------------

/**
 * Les étiquettes d'unités, mélangées — à replacer dans leurs colonnes.
 * On rend aussi les colonnes attendues : c'est la même liste, dans l'ordre.
 */
export function melangerUnites(famille, rng) {
    const f = familleDe(famille);
    return {
        etiquettes: rng.shuffle(f.unites.map(u => u.symbole)),
        colonnes: f.unites.map(u => u.rang)
    };
}

/**
 * `pose` : { rang: symbole }. Rend les colonnes fautives, pour les montrer.
 */
export function verifierUnites(famille, pose) {
    const f = familleDe(famille);
    const fautes = f.unites
        .filter(u => (pose || {})[u.rang] !== u.symbole)
        .map(u => ({ rang: u.rang, attendu: u.symbole, recu: (pose || {})[u.rang] ?? null }));
    return { ok: fautes.length === 0, fautes };
}

// --- Étape 2 : placer le nombre --------------------------------------------------------

/**
 * Où tombent les chiffres d'un nombre écrit dans une unité donnée.
 *
 * C'est l'addition qui porte toute la conversion : un chiffre au rang décimal
 * `r`, pour une unité au rang `u`, occupe la colonne `u + r`.
 */
export function chiffresDansLeTableau(valeur, famille, symbole) {
    const u = uniteDe(famille, symbole);
    if (!u) return [];
    return rangsDe(valeur).map(r => ({
        colonne: u.rang + r,
        chiffre: chiffreAuRang(valeur, r),
        // Le rang du chiffre DANS LE NOMBRE : c'est ce qui ne change pas quand
        // on fait glisser le nombre d'une colonne à l'autre.
        rangDansLeNombre: r
    }));
}

/**
 * L'APERÇU FANTÔME : où tomberaient les chiffres si l'on déposait le chiffre
 * des unités dans la colonne `colonneUnites`.
 *
 * C'est ce qui permet de montrer le nombre en transparence sous le doigt avant
 * de lâcher — et de dire, sans corriger, si la colonne visée est la bonne.
 */
export function apercuPlacement(valeur, colonneUnites) {
    return rangsDe(valeur).map(r => ({
        colonne: colonneUnites + r,
        chiffre: chiffreAuRang(valeur, r),
        rangDansLeNombre: r
    }));
}

/** Le placement proposé est-il le bon ? */
export function verifierNombre(valeur, famille, symbole, colonneUnitesProposee) {
    const u = uniteDe(famille, symbole);
    if (!u) return { ok: false, attendu: null };
    return {
        ok: colonneUnitesProposee === u.rang,
        attendu: u.rang,
        // De combien de colonnes on s'est trompé : c'est le facteur dix perdu.
        ecart: colonneUnitesProposee - u.rang
    };
}

// --- Étape 3 : la virgule, puis les zéros -------------------------------------------------

/**
 * Tout ce qu'il faut écrire pour lire le nombre dans l'unité demandée.
 *
 * @returns {{
 *   colonneVirgule:number, chiffres:Object, zeros:number[],
 *   colonneHaute:number, colonneBasse:number, valeur:number, texte:string,
 *   entier:boolean
 * }}
 */
export function convertir(valeur, famille, depart, arrivee) {
    const uD = uniteDe(famille, depart), uA = uniteDe(famille, arrivee);
    if (!uD || !uA) return null;

    const poses = chiffresDansLeTableau(valeur, famille, depart);
    const chiffres = {};
    poses.forEach(p => { chiffres[p.colonne] = p.chiffre; });
    const occupees = poses.map(p => p.colonne);
    const hautOccupe = Math.max(...occupees);
    const basOccupe = Math.min(...occupees);

    // LA VIRGULE SE POSE APRÈS LA COLONNE DE L'UNITÉ DEMANDÉE. C'est la seule
    // règle de l'étape, et elle ne souffre pas d'exception.
    const colonneVirgule = uA.rang;
    // Ce qu'on écrit s'étend au moins jusqu'à la virgule, des deux côtés :
    // sans cela il manquerait le « 0 » qui précède la virgule d'un 0,00345.
    const colonneHaute = Math.max(hautOccupe, colonneVirgule);
    const colonneBasse = Math.min(basOccupe, colonneVirgule);

    // LES ZÉROS À COMBLER : les colonnes vides de l'étendue écrite. Celles qui
    // sont au-delà, à droite, ne s'écrivent pas — un zéro final ne change pas
    // la valeur mais n'est pas la bonne écriture.
    const zeros = [];
    for (let c = colonneHaute; c >= colonneBasse; c--) {
        if (chiffres[c] === undefined) zeros.push(c);
    }

    const facteur = Math.pow(10, uD.rang - uA.rang);
    // On repasse par les décimales connues pour éviter les 0,30000000000004.
    const dec = Math.max(0, decimales(valeur) - (uD.rang - uA.rang));
    const converti = Number((valeur * facteur).toFixed(Math.min(10, dec)));

    return {
        colonneVirgule, chiffres, zeros,
        colonneHaute, colonneBasse,
        valeur: converti,
        entier: colonneBasse >= colonneVirgule,
        texte: `${String(converti).replace('.', ',')} ${arrivee}`
    };
}

/** La réponse attendue, seule — pour vérifier ce que l'élève écrit. */
export function reponse(valeur, famille, depart, arrivee) {
    const c = convertir(valeur, famille, depart, arrivee);
    return c ? c.valeur : null;
}

// --- Le tirage ---------------------------------------------------------------------------

/**
 * Un exercice de conversion.
 *
 * @param {Object} o
 * @param {Object} o.rng
 * @param {string} [o.famille]
 * @param {number} [o.ecart]      - de combien de colonnes on convertit au plus
 * @param {boolean} [o.decimales] - autoriser un nombre à virgule au départ
 */
export function tirerConversion({ rng, famille = 'longueur', ecart = 3, decimales: avecVirgule = false } = {}) {
    const f = familleDe(famille);
    const saut = Math.max(1, Math.min(f.unites.length - 1, ecart));

    for (let essai = 0; essai < 200; essai++) {
        const iD = rng.int(0, f.unites.length - 1);
        const iA = rng.int(Math.max(0, iD - saut), Math.min(f.unites.length - 1, iD + saut));
        if (iA === iD) continue;                       // convertir vers soi-même n'apprend rien
        const uD = f.unites[iD], uA = f.unites[iA];

        // Deux ou trois chiffres significatifs : au-delà, le tableau déborde de
        // l'écran d'un téléphone et l'on ne lit plus rien.
        const chiffres = rng.int(2, 3);
        let valeur = rng.int(Math.pow(10, chiffres - 1), Math.pow(10, chiffres) - 1);
        if (avecVirgule) valeur = valeur / Math.pow(10, rng.int(1, 2));

        const c = convertir(valeur, famille, uD.symbole, uA.symbole);
        if (!c) continue;
        // On écarte les résultats illisibles : 0,000345 se recopie mal et
        // n'apprend rien de plus que 0,0345.
        if (Math.abs(c.valeur) < 0.0001 || Math.abs(c.valeur) > 999999) continue;

        return {
            famille, valeur, depart: uD.symbole, arrivee: uA.symbole,
            enonce: `${String(valeur).replace('.', ',')} ${uD.symbole} = ……… ${uA.symbole}`,
            attendu: c.valeur,
            conversion: c,
            // Le sens du glissement : vers la droite on multiplie, vers la
            // gauche on divise. C'est ce que le tableau doit faire VOIR.
            sens: uD.rang > uA.rang ? 'multiplie' : 'divise',
            facteur: Math.pow(10, Math.abs(uD.rang - uA.rang))
        };
    }
    // Filet : la conversion la plus simple de la famille.
    const uD = f.unites[0], uA = f.unites[1];
    const c = convertir(1, famille, uD.symbole, uA.symbole);
    return {
        famille, valeur: 1, depart: uD.symbole, arrivee: uA.symbole,
        enonce: `1 ${uD.symbole} = ……… ${uA.symbole}`,
        attendu: c.valeur, conversion: c, sens: 'multiplie', facteur: 10
    };
}
