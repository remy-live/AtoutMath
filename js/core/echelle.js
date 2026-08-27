// LES RÉGLAGES QUI FORMENT UNE ÉCHELLE.
//
// Rémy : « je pensais à qqch, un slider de paramètres (exemple sur 10
// questions), et 3 slides (si 3 modes) un pour 2 propositions, un pour 4, puis
// libre (si le jeu le permet) ».
//
// Un menu déroulant traite ses options comme des ÉTIQUETTES : « + », « − »,
// « × », « ÷ » n'ont pas d'ordre, et c'est très bien. Mais certains réglages
// n'ont que ça, de l'ordre : deux propositions, quatre propositions, le
// clavier, c'est une seule et même chose qu'on demande de plus en plus. Le
// menu la casse en quatre lignes indépendantes ; on ne voit ni qu'il y a une
// progression, ni où l'on se trouve dessus.
//
// D'où la glissière : la position DIT le niveau d'exigence, et on le change
// d'un geste au lieu d'ouvrir une liste et de lire quatre phrases.
//
// POURQUOI `echelle: true` ET PAS UNE DEVINETTE. On pourrait tenter de
// reconnaître une échelle — « les valeurs sont des nombres croissants, donc
// c'est une échelle ». Ce serait faux la moitié du temps : « Nombre de côtés :
// 3, 4, 5, 6 » est une liste de FORMES, pas une difficulté croissante, et
// « Thème : boulangerie, cirque, football » n'a évidemment aucun ordre. Une
// échelle est une affirmation de l'auteur du réglage sur le SENS de ses
// options ; elle se déclare, elle ne se devine pas.
//
// Les nombres bornés, eux, sont une échelle par nature : entre `min` et `max`,
// il n'y a rien d'autre à comprendre que « plus » et « moins ». Ils n'ont donc
// rien à déclarer — sauf à être trop larges (voir plus bas).

/**
 * Au-delà de ce nombre de crans, la glissière ment.
 *
 * Sur « Nombre maximum : 20 à 999 », un cran vaut moins d'un pixel de rail :
 * viser 250 devient impossible, et surtout le geste ne PROMET plus rien —
 * on croit régler, on tire au sort. Ces réglages-là gardent le champ qu'on
 * tape, qui est le bon outil quand la plage est vaste.
 */
export const CRANS_MAX = 50;

/** Une option de schéma : valeur brute, ou `{ value, label, court }`. */
const val = (o) => (o && typeof o === 'object') ? o.value : o;
const lib = (o) => (o && typeof o === 'object') ? o.label : String(o);
const crt = (o) => (o && typeof o === 'object' && o.court) ? String(o.court) : null;

/**
 * L'échelle d'un réglage, ou `null` s'il n'en forme pas une.
 *
 * @returns {{nombre: boolean, valeurs: Array, libelles: string[], courts: ?string[]}|null}
 *   `valeurs` sont les valeurs D'ORIGINE, avec leur type : le DOM ne rend que
 *   des chaînes, et « 2 » (nombre de propositions) ne doit pas revenir en
 *   texte au générateur.
 */
export function echelleDe(param) {
    if (!param) return null;

    if (param.type === 'number') {
        const min = Number(param.min);
        const max = Number(param.max);
        if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
        const crans = max - min;
        // Deux crans, c'est un interrupteur : la glissière n'apporte rien de
        // plus que les deux boutons − / +, et son rail vide fait croire à des
        // valeurs intermédiaires qui n'existent pas.
        if (crans < 2 || crans > CRANS_MAX) return null;
        const valeurs = [];
        for (let v = min; v <= max; v++) valeurs.push(v);
        return { nombre: true, valeurs, libelles: valeurs.map(String) };
    }

    if (param.type === 'select' && param.echelle && (param.options || []).length >= 3) {
        // LES NOMS DES CRANS, S'ILS SONT TOUS DÉCLARÉS.
        //
        // Rémy, pour le format de réponse : « un triple slider —
        // Qcm 2 · Qcm 4 · Libre — O———O———O ». Le rail ne montrait que le cran
        // COURANT, sous la forme d'une phrase entière ; on ne voyait donc ni
        // les autres positions, ni le sens de la progression, et il fallait
        // traîner la poignée pour découvrir ce qu'il y avait à côté.
        //
        // TOUS OU AUCUN, ET DÉCLARÉS. Trois libellés courts sur cinq laisseraient
        // des trous sur l'axe ; et raccourcir automatiquement « Progressive : 2,
        // puis 4, puis le clavier (recommandé) » donnerait « Progressive : 2… »,
        // c'est-à-dire un mensonge tronqué. Le nom court est une deuxième
        // affirmation de l'auteur, comme `echelle` elle-même.
        const courts = param.options.map(crt);
        return {
            nombre: false,
            valeurs: param.options.map(val),
            libelles: param.options.map(lib),
            courts: courts.every(Boolean) ? courts : null
        };
    }

    return null;
}

/**
 * Le cran où poser le curseur pour une valeur donnée.
 *
 * Une valeur hors échelle — un réglage enregistré avant qu'une option
 * disparaisse, un nombre au-delà des bornes — ne doit pas renvoyer −1 : le
 * curseur se collerait à gauche et le professeur croirait avoir réglé le
 * minimum. On rend le cran le plus proche pour un nombre, et le premier pour
 * une valeur inconnue.
 */
export function rangDans(ech, valeur) {
    if (!ech || !ech.valeurs.length) return 0;
    const i = ech.valeurs.findIndex(v => String(v) === String(valeur));
    if (i >= 0) return i;
    if (!ech.nombre) return 0;
    const n = Number(valeur);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(ech.valeurs.length - 1, Math.round(n) - ech.valeurs[0]));
}
