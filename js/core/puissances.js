// LES PUISSANCES DE 10 ET L'ÉCRITURE SCIENTIFIQUE.
//
// Rémy : « Des exercices sur les puissances de 10 dont l'écriture scientifique,
// hyper progressif : déjà reconnaître, puis transformer. »
//
// C'EST CE MOT — « DÉJÀ RECONNAÎTRE » — QUI DICTE TOUT LE MODULE. La faute
// ordinaire, en quatrième, n'est pas de mal calculer : c'est d'écrire
// 34 × 10³ et de croire que c'est une écriture scientifique. L'élève sait
// transformer avant de savoir ce qu'il doit obtenir, et il transforme donc vers
// n'importe quoi. On lui apprend d'abord à RECONNAÎTRE — à dire d'un coup d'œil
// si une écriture est scientifique et, sinon, POURQUOI — et seulement ensuite à
// transformer. Sept marches, dans cet ordre.
//
// TOUT PASSE PAR LES ENTIERS, JAMAIS PAR LES FLOTTANTS. 0,1 + 0,2 ne fait pas
// 0,3 en JavaScript, et une écriture scientifique se juge au chiffre près :
// une comparaison ratée à cause d'un arrondi donnerait un exercice qui a tort
// contre un élève qui a raison. On garde donc la mantisse sous forme de chaîne
// de chiffres et l'exposant sous forme d'entier, et l'on n'écrit jamais un
// nombre décimal autrement qu'en déplaçant une virgule dans un texte.
//
// Module pur : ni DOM, ni hasard propre.

/** Les sept marches, de « reconnaître » à « calculer ». */
export const ETAPES_PUISSANCES = {
    lire: {
        id: 'lire', rang: 1, label: '1 · Lire une puissance de 10',
        resume: '10³ vaut combien ? et 10⁻² ?'
    },
    ecrire: {
        id: 'ecrire', rang: 2, label: '2 · Écrire un nombre en puissance de 10',
        resume: '1 000 = 10 puissance combien ?'
    },
    reconnaitre: {
        id: 'reconnaitre', rang: 3, label: '3 · Reconnaître une écriture scientifique',
        resume: 'Laquelle des quatre est scientifique ?'
    },
    pourquoi: {
        id: 'pourquoi', rang: 4, label: '4 · Dire POURQUOI ce n\'en est pas une',
        resume: 'Le nombre devant est-il trop grand, trop petit ?'
    },
    versScientifique: {
        id: 'versScientifique', rang: 5, label: '5 · Transformer en écriture scientifique',
        resume: '34 000 s\'écrit 3,4 × 10⁴'
    },
    versDecimale: {
        id: 'versDecimale', rang: 6, label: '6 · Revenir à l\'écriture décimale',
        resume: '5,2 × 10⁻³ vaut 0,0052'
    },
    comparer: {
        id: 'comparer', rang: 7, label: '7 · Comparer deux écritures scientifiques',
        resume: 'Le plus grand exposant gagne — sauf égalité'
    }
};

/** L'ordre des marches, du plus simple au plus difficile. */
export const ORDRE_ETAPES = Object.values(ETAPES_PUISSANCES)
    .sort((a, b) => a.rang - b.rang).map(e => e.id);

const EXPOSANTS = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

/** « 10⁻³ », avec de vrais exposants — lisibles partout, y compris sur papier. */
export const puissanceTexte = (n) =>
    `10${String(n).split('').map(c => EXPOSANTS[c]).join('')}`;

/**
 * LA VALEUR DE 10ⁿ, ÉCRITE À LA MAIN.
 *
 * `10 ** -7` donne 1.0000000000000001e-7 : on ne peut pas s'en servir pour
 * fabriquer un énoncé. On pose donc les zéros un par un.
 */
export function valeurPuissance(n) {
    if (n === 0) return '1';
    if (n > 0) return `1${'0'.repeat(n)}`;
    return `0,${'0'.repeat(-n - 1)}1`;
}

/**
 * UN NOMBRE DÉCIMAL À PARTIR D'UNE MANTISSE ET D'UN EXPOSANT, sans flottant.
 *
 * On prend les chiffres de la mantisse (« 34 » pour 3,4) et l'on place la
 * virgule là où l'exposant la met. C'est exactement le geste qu'on demande à
 * l'élève, et le faire ainsi garantit que l'énoncé et la correction sont
 * d'accord au dernier chiffre près.
 *
 * @param {string} chiffres  les chiffres significatifs, sans virgule (« 34 »)
 * @param {number} virgule   position de la virgule dans `chiffres` au départ
 * @param {number} n         l'exposant : la virgule se décale de n rangs à droite
 */
export function decimaleDe(chiffres, virgule, n) {
    let pos = virgule + n;
    let d = chiffres;
    // La virgule sort par la gauche : on rajoute des zéros devant.
    if (pos <= 0) { d = '0'.repeat(1 - pos) + d; pos += 1 - pos; }
    // Elle sort par la droite : on rajoute des zéros derrière.
    if (pos >= d.length) d += '0'.repeat(pos - d.length);
    const entiere = d.slice(0, pos).replace(/^0+(?=\d)/, '') || '0';
    const decimale = d.slice(pos).replace(/0+$/, '');
    return decimale ? `${entiere},${decimale}` : entiere;
}

/** La mantisse « 3,4 » à partir des chiffres « 34 ». */
export const mantisseTexte = (chiffres) =>
    (chiffres.length === 1 ? chiffres : `${chiffres[0]},${chiffres.slice(1).replace(/0+$/, '')}`)
        .replace(/,$/, '');

/** L'écriture scientifique complète : « 3,4 × 10⁴ ». */
export const scientifiqueTexte = (chiffres, n) =>
    `${mantisseTexte(chiffres)} × ${puissanceTexte(n)}`;

/**
 * UNE ÉCRITURE « a × 10ⁿ » EST-ELLE SCIENTIFIQUE ?
 *
 * La règle tient en une ligne — 1 ⩽ a < 10 — mais c'est la ligne que les
 * élèves ne retiennent pas, alors on ne se contente pas de dire oui ou non :
 * on dit LEQUEL des deux bords est franchi. « Trop grand » et « trop petit »
 * ne se corrigent pas dans le même sens, et l'élève qui décale sa virgule au
 * hasard est précisément celui qui n'a pas fait cette distinction.
 *
 * @param {string} a la mantisse telle qu'elle est écrite (« 34 », « 0,7 »)
 * @returns {{ok: boolean, quoi: 'ok'|'tropGrand'|'tropPetit'|'zero'}}
 */
export function jugerMantisse(a) {
    const texte = String(a).replace(',', '.');
    const v = Math.abs(Number(texte));
    if (!(v > 0)) return { ok: false, quoi: 'zero' };
    if (v >= 10) return { ok: false, quoi: 'tropGrand' };
    if (v < 1) return { ok: false, quoi: 'tropPetit' };
    return { ok: true, quoi: 'ok' };
}

/** La phrase qui va avec le verdict — c'est elle qu'on fait choisir à l'élève. */
export const RAISONS = {
    ok: 'C\'est une écriture scientifique.',
    tropGrand: 'Le nombre devant est TROP GRAND : il doit être plus petit que 10.',
    tropPetit: 'Le nombre devant est TROP PETIT : il doit être au moins 1.',
    zero: 'Le nombre devant ne peut pas être nul.'
};

/**
 * L'ÉCRITURE SCIENTIFIQUE D'UN DÉCIMAL ÉCRIT EN TOUTES LETTRES.
 *
 * On travaille sur le texte : on retire la virgule, on compte les rangs, on
 * enlève les zéros inutiles. Aucun flottant n'intervient, donc 0,0000001 ne
 * devient pas 1,0000000000000001 × 10⁻⁷.
 *
 * @param {string} texte un décimal français, « 0,0052 » ou « 34000 »
 * @returns {{chiffres: string, exposant: number}|null}
 */
export function versScientifique(texte) {
    const t = String(texte).trim().replace(/\s/g, '').replace('.', ',');
    if (!/^\d+(,\d+)?$/.test(t)) return null;
    const [ent, dec = ''] = t.split(',');
    const tous = ent + dec;
    const premier = tous.search(/[1-9]/);
    if (premier < 0) return null;                       // le nombre est nul
    const chiffres = tous.slice(premier).replace(/0+$/, '') || tous[premier];
    // La virgule est après `ent.length` chiffres ; le premier chiffre
    // significatif est au rang `premier`. L'exposant est la distance entre les
    // deux, moins un — parce que la mantisse en garde un devant sa virgule.
    return { chiffres, exposant: ent.length - premier - 1 };
}

/**
 * COMPARER DEUX ÉCRITURES SCIENTIFIQUES, sans jamais les convertir.
 *
 * C'est exactement le raisonnement qu'on veut enseigner : on regarde d'abord
 * les EXPOSANTS, et l'on ne compare les mantisses que s'ils sont égaux. Passer
 * par la valeur décimale marcherait aussi, mais donnerait un corrigé qui ne
 * ressemble pas à ce qu'on demande à l'élève d'écrire.
 *
 * @returns {-1|0|1} le signe de a − b
 */
export function comparerScientifiques(a, b) {
    if (a.exposant !== b.exposant) return a.exposant < b.exposant ? -1 : 1;
    // Mantisses : on compare chiffre à chiffre, en complétant par des zéros.
    const n = Math.max(a.chiffres.length, b.chiffres.length);
    const ga = a.chiffres.padEnd(n, '0'), gb = b.chiffres.padEnd(n, '0');
    return ga === gb ? 0 : (ga < gb ? -1 : 1);
}

/** Le produit de deux écritures scientifiques, remis sous forme scientifique. */
export function produitScientifique(a, b) {
    // Les mantisses sont des entiers déguisés : « 34 » c'est 3,4 avec une
    // décimale. On multiplie les entiers, puis on replace la virgule.
    const ea = a.chiffres.length - 1, eb = b.chiffres.length - 1;
    const produit = String(Number(a.chiffres) * Number(b.chiffres));
    const brut = decimaleDe(produit, produit.length - ea - eb, 0);
    const s = versScientifique(brut);
    return { chiffres: s.chiffres, exposant: s.exposant + a.exposant + b.exposant };
}

/**
 * UN NOMBRE GROUPÉ PAR TRANCHES DE TROIS, comme on l'écrit en français.
 *
 * 7850000 se lit mal, et cet exercice demande justement de COMPTER les rangs :
 * 7\u00a0850\u00a0000 se compte d'un coup d'œil. On groupe aussi la partie
 * décimale — 0,000\u00a01 — parce que c'est là qu'on compte le plus.
 *
 * L'espace est insécable : une tranche de milliers qui passe à la ligne
 * ressemble à deux nombres. Et cette écriture ne sert qu'à AFFICHER — jamais à
 * comparer ni à enregistrer une réponse.
 */
export function grouper(texte) {
    const [ent, dec] = String(texte).split(',');
    const e = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
    const d = dec ? dec.replace(/(\d{3})(?=\d)/g, '$1\u00a0') : null;
    return d ? `${e},${d}` : e;
}

/**
 * LES PRÉFIXES, ET C'EST UN TABLEAU DE COURS AVANT D'ÊTRE UNE DONNÉE.
 *
 * Rémy en a fait une colonne entière de sa fiche de quatrième : « Nombre /
 * Lecture-préfixe / 10ⁿ », de pico à trillion. Puis il l'a remise en jeu deux
 * pages plus loin, sur les résistances (× 10⁻² à × 10⁹) et dans un devoir
 * (« un cheveu fait 50 µm », « 8 To = 8 × 10¹² octets »).
 *
 * TROIS CHOSES DIFFÉRENTES, ET ON LES CONFOND :
 *   · le SYMBOLE — M, µ, n, T — celui qu'on lit sur un emballage ;
 *   · le PRÉFIXE — méga, micro, nano, téra — celui qu'on prononce ;
 *   · la PUISSANCE — 10⁶, 10⁻⁶, 10⁻⁹, 10¹² — celle avec laquelle on calcule.
 * Un élève sait souvent dire « méga, c'est un million » et reste bloqué sur
 * « 3 Mo = … octets », parce qu'il n'a jamais fait le troisième pas.
 *
 * `µ` EST LE MICRO DES SCIENCES, pas la lettre grecque mu — le caractère
 * U+00B5, celui des claviers et des étiquettes. Sur un exercice où le symbole
 * EST la réponse, les deux ne se valent pas.
 *
 * `usuel` marque les six que le programme de quatrième demande vraiment : les
 * autres existent pour lire un tableau, pas pour être récités.
 */
export const PREFIXES = [
    { n: 12, symbole: 'T', prefixe: 'téra', nom: 'un billion', usuel: true, exemple: 'un téraoctet (To) : 10¹² octets' },
    { n: 9, symbole: 'G', prefixe: 'giga', nom: 'un milliard', usuel: true, exemple: 'un gigaoctet (Go) : 10⁹ octets' },
    { n: 6, symbole: 'M', prefixe: 'méga', nom: 'un million', usuel: true, exemple: 'un mégawatt (MW) : 10⁶ watts' },
    { n: 3, symbole: 'k', prefixe: 'kilo', nom: 'mille', usuel: true, exemple: 'un kilogramme (kg) : 10³ grammes' },
    { n: 2, symbole: 'h', prefixe: 'hecto', nom: 'cent', exemple: 'un hectolitre (hL) : 10² litres' },
    { n: 1, symbole: 'da', prefixe: 'déca', nom: 'dix', exemple: 'un décamètre (dam) : 10 mètres' },
    { n: -1, symbole: 'd', prefixe: 'déci', nom: 'un dixième', exemple: 'un décilitre (dL) : 10⁻¹ litre' },
    { n: -2, symbole: 'c', prefixe: 'centi', nom: 'un centième', usuel: true, exemple: 'un centimètre (cm) : 10⁻² mètre' },
    { n: -3, symbole: 'm', prefixe: 'milli', nom: 'un millième', usuel: true, exemple: 'un millimètre (mm) : 10⁻³ mètre' },
    { n: -6, symbole: 'µ', prefixe: 'micro', nom: 'un millionième', usuel: true, exemple: 'un micromètre (µm) : le diamètre d\'un cheveu fait 50 µm' },
    { n: -9, symbole: 'n', prefixe: 'nano', nom: 'un milliardième', usuel: true, exemple: 'un nanomètre (nm) : 10⁻⁹ mètre' },
    { n: -12, symbole: 'p', prefixe: 'pico', nom: 'un billionième', exemple: 'une picoseconde (ps) : 10⁻¹² seconde' }
];

/** Le préfixe d'une puissance de 10, quand elle en a un. */
export const prefixeDe = (n) => PREFIXES.find(p => p.n === n) || null;

/** Le préfixe qui porte ce symbole — « µ » et « M » ne se confondent pas. */
export const prefixeDuSymbole = (s) => PREFIXES.find(p => p.symbole === s) || null;

/** Le nom d'une puissance de 10, quand elle en a un. */
export const nomPuissance = (n) => (prefixeDe(n) || {}).nom || null;

/**
 * CONVERTIR UNE MESURE D'UN PRÉFIXE À UN AUTRE, en exposant et non en flottant.
 *
 * « 5 µm en mètres » vaut 5 × 10⁻⁶ m, et l'on rend les deux morceaux séparés :
 * la valeur et l'exposant. Multiplier 5 par 1e-6 donnerait 0.000005000000001
 * dans un énoncé, ce qu'aucun professeur n'écrit.
 *
 * @returns {{valeur:number, exposant:number}} `valeur × 10^exposant`, dans
 *   l'unité d'arrivée.
 */
export function convertirPrefixe(valeur, de, vers) {
    const a = de === null || de === undefined ? 0 : de;
    const b = vers === null || vers === undefined ? 0 : vers;
    return { valeur, exposant: a - b };
}
