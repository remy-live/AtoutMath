// Écriture des nombres en toutes lettres (français).
//
// Fonction pure, isolée dans son module parce qu'elle porte à elle seule
// l'essentiel des pièges de l'orthographe des nombres : « et » de vingt et un,
// soixante-dix, quatre-vingts et son « s », « cent » qui s'accorde ou non,
// « mille » invariable. Un générateur qui poserait des questions dessus en se
// trompant serait pire qu'inutile — d'où un module testé pour lui-même.
//
// Orthographe traditionnelle (celle de la fiche de cours) : traits d'union à
// l'intérieur des dizaines composées, espaces ailleurs.

import { espacerMilliers } from './nombres.js';

const UNITS = [
    'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
    'dix-sept', 'dix-huit', 'dix-neuf'
];

const TENS = {
    20: 'vingt', 30: 'trente', 40: 'quarante',
    50: 'cinquante', 60: 'soixante', 80: 'quatre-vingt'
};

/** Nombres de 0 à 99. */
function belowHundred(n) {
    if (n < 20) return UNITS[n];

    // 70-79 et 90-99 se disent « soixante-dix » et « quatre-vingt-dix » :
    // la dizaine de base est 60 ou 80, le reste va jusqu'à 19.
    const base = (n >= 70 && n < 80) ? 60 : (n >= 90 ? 80 : Math.floor(n / 10) * 10);
    const rest = n - base;
    const tens = TENS[base];

    if (rest === 0) return base === 80 ? 'quatre-vingts' : tens;   // le « s » de quatre-vingts
    if (rest === 1 && base !== 80) return `${tens} et un`;         // vingt et un, mais quatre-vingt-un
    if (rest === 11 && (base === 60 || base === 20 || base === 30 ||
        base === 40 || base === 50)) return `${tens} et onze`;     // soixante et onze
    return `${tens}-${UNITS[rest]}`;
}

/** Nombres de 0 à 999. */
function belowThousand(n) {
    if (n < 100) return belowHundred(n);
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    // « cent » ne prend un s que multiplié ET non suivi d'un autre nombre :
    // deux cents, mais deux cent trois.
    const head = hundreds === 1 ? 'cent' : `${UNITS[hundreds]} cent${rest === 0 ? 's' : ''}`;
    return rest === 0 ? head : `${head} ${belowHundred(rest)}`;
}

/**
 * Écrit un entier en toutes lettres.
 * @param {number} n - entier positif, jusqu'aux milliards
 * @returns {string}
 */
export function spellInteger(n) {
    n = Math.floor(Math.abs(n));
    if (n === 0) return 'zéro';
    if (n < 1000) return belowThousand(n);

    const parts = [];
    const scales = [
        { value: 1e9, one: 'un milliard', many: 'milliards' },
        { value: 1e6, one: 'un million', many: 'millions' },
        { value: 1e3, one: 'mille', many: 'mille' }   // « mille » est invariable
    ];

    let rest = n;
    for (const s of scales) {
        const count = Math.floor(rest / s.value);
        if (count === 0) continue;
        rest -= count * s.value;
        if (count === 1) {
            parts.push(s.one);
        } else {
            // « cent » et « quatre-vingt » perdent leur s devant MILLE, qui est
            // un mot-nombre : deux cent mille, quatre-vingt mille. Ils le
            // gardent devant « millions » et « milliards », qui sont des noms :
            // deux cents millions.
            const head = belowThousand(count);
            parts.push(`${s.many === 'mille' ? dropPluralS(head) : head} ${s.many}`);
        }
    }
    if (rest > 0) parts.push(belowThousand(rest));
    return parts.join(' ');
}

function dropPluralS(text) {
    return text.replace(/(cent|quatre-vingt)s$/, '$1');
}

const DECIMAL_RANKS = [
    { label: 'dixième', factor: 0.1, digits: 1 },
    { label: 'centième', factor: 0.01, digits: 2 },
    { label: 'millième', factor: 0.001, digits: 3 }
];

/**
 * Écrit un décimal sous la forme « trois dixièmes », « deux cent douze
 * centièmes » — la formulation de l'exercice 19 de la fiche.
 * @param {number} count - le nombre d'unités du rang
 * @param {number} rank  - 1 = dixièmes, 2 = centièmes, 3 = millièmes
 */
export function spellDecimalRank(count, rank) {
    const r = DECIMAL_RANKS[rank - 1];
    return `${spellInteger(count)} ${r.label}${count > 1 ? 's' : ''}`;
}

/** Valeur d'un nombre exprimé en unités d'un rang : 212 centièmes = 2,12. */
export function valueOfRank(count, rank) {
    return Number((count * DECIMAL_RANKS[rank - 1].factor).toFixed(rank));
}

/** Nom du rang d'un chiffre : 0 = unités, 1 = dizaines… négatif = décimales. */
export const RANK_NAMES = {
    '-3': 'millièmes', '-2': 'centièmes', '-1': 'dixièmes',
    0: 'unités', 1: 'dizaines', 2: 'centaines',
    3: 'unités de mille', 4: 'dizaines de mille', 5: 'centaines de mille',
    6: 'millions'
};

/**
 * Chiffre occupant un rang donné dans un nombre.
 * @param {number} value
 * @param {number} rank - 0 = unités, 1 = dizaines, -1 = dixièmes…
 */
export function digitAtRank(value, rank) {
    // On travaille sur la chaîne pour éviter les erreurs de virgule flottante :
    // (0.1 * 3) ne vaut pas exactement 0,3 en binaire.
    const [intPart, decPart = ''] = value.toFixed(6).split('.');
    if (rank >= 0) {
        const s = intPart.padStart(rank + 1, '0');
        return Number(s[s.length - 1 - rank]);
    }
    const i = -rank - 1;
    return Number(decPart[i] || 0);
}

/**
 * Format français : espace fine INSÉCABLE tous les 3 chiffres, virgule décimale.
 *
 * L'espace était une espace ORDINAIRE : « 123 456 » se coupait en fin de ligne
 * et l'on croyait lire deux nombres. Et la partie décimale n'était pas groupée
 * du tout, alors que les rangs se comptent depuis la virgule dans les deux
 * sens — 3,141 592 6, pas 3,1415926.
 *
 * La règle vit désormais dans core/nombres.js, une seule fois : l'écran, la
 * saisie et la fiche imprimée ne peuvent plus en appliquer trois versions.
 */
export function formatFr(value, decimals = null) {
    const fixed = decimals === null ? String(value) : value.toFixed(decimals);
    return espacerMilliers(fixed.replace('.', ','));
}

/** Retire les zéros inutiles : 040,0 → 40 ; 0001,120 → 1,12. */
export function stripUselessZeros(text) {
    let [i, d = ''] = String(text).replace(',', '.').split('.');
    i = i.replace(/^0+/, '') || '0';
    d = d.replace(/0+$/, '');
    return d ? `${i},${d}` : i;
}
