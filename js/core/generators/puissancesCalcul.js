// CALCULER AVEC DES PUISSANCES — les trois règles, et leur raison.
//
// Rémy : « calculer avec des puissances ». Sa fiche de quatrième y consacre une
// page entière — « Multiplier et diviser des puissances », « Puissance de
// puissance » —, et la consigne qu'il répète en rouge à chaque exercice dit
// tout : « TU ÉCRIRAS LE CALCUL ! » Il ne veut pas le résultat, il veut voir
// 10³ × 10² = 10³⁺² = 10⁵.
//
// TROIS RÈGLES, ET UNE SEULE RAISON DERRIÈRE LES TROIS : une puissance COMPTE
// des facteurs.
//
//     10⁵ × 10³   cinq dix suivis de trois dix, donc huit dix   → ON AJOUTE
//     10⁸ ÷ 10³   huit dix dont trois s'en vont, donc cinq      → ON SOUSTRAIT
//     (10⁴)³      trois paquets de quatre dix, donc douze       → ON MULTIPLIE
//
// LA FAUTE UNIVERSELLE : MULTIPLIER LES EXPOSANTS DANS UN PRODUIT. Elle a une
// cause précise, et ce n'est pas l'étourderie — c'est que le signe × est écrit
// sous les yeux de l'élève, et qu'il l'applique à ce qu'il voit. « 10⁵ × 10³ =
// 10¹⁵ » est donc le distracteur de CHAQUE question de la marche du produit,
// et son explication ne dit pas « faux » : elle dit que le signe de l'opération
// n'est pas celui qu'on fait sur les exposants.
//
// ET LA BASE DOIT ÊTRE LA MÊME. 2³ × 5³ ne se met pas sous la forme d'une seule
// puissance — c'est ce qui rend la règle vraie, et c'est ce qu'on oublie. La
// dernière marche pose donc des questions dont la réponse est « on ne peut pas
// ».
//
// Module pur : ni DOM, ni horloge. Il se teste sous Node.

import { makeItem, finalizeChoices } from '../items.js';
import { puissanceTexte, valeurPuissance, grouper } from '../puissances.js';
import {
    paramRepartition, rangMarcheCyclique, conseilProgression, totalDe
} from '../progression.js';

/**
 * UN NOMBRE AVEC LE VRAI SIGNE MOINS (U+2212), jamais le trait d'union du
 * clavier. Sur une marche où (−3)² et −3² se distinguent d'une parenthèse, un
 * « -9 » plus court que le « − » de l'énoncé casse le lien visuel entre la
 * question et sa réponse.
 */
const nb = (v) => String(v).replace('-', '−');

const SKILL = 'num.puissances.regles';
const PAR_MARCHE = 3;

const EXPOSANTS = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

/** « 2⁵ », « a³ » — une puissance de base quelconque, avec un vrai exposant. */
export const puissance = (base, n) =>
    `${base}${String(n).split('').map(c => EXPOSANTS[c]).join('')}`;

/** L'exposant écrit comme un calcul : « 10³⁺² », la trace que Rémy veut voir. */
export const puissanceCalcul = (base, a, op, b) =>
    `${base}${String(a).split('').map(c => EXPOSANTS[c]).join('')}`
    + (op === '+' ? '⁺' : op === '-' ? '⁻' : '˟')
    + `${String(b).split('').map(c => EXPOSANTS[c]).join('')}`;

/**
 * UN BOUCHE-TROU QUI RESSEMBLE AUX AUTRES.
 *
 * Les fautes de ce chapitre se rejoignent d'elles-mêmes : pour 10² × 10²,
 * ajouter et multiplier les exposants donnent tous deux 10⁴, et la question
 * n'avait plus que trois propositions — dont une qui se repérait au fait
 * qu'elle était seule de son espèce. On complète donc avec une puissance
 * VOISINE, qui ne dit aucune faute en particulier et qui ne se distingue de
 * rien.
 */
const voisine = (juste, base = 10) => (r) =>
    puissance(base, juste + r.int(1, 5) * (r.bool() ? 1 : -1));

/** Un exposant non nul, dans une plage — 10⁰ n'apprend rien sur une règle. */
const expo = (rng, min, max) => {
    for (let i = 0; i < 20; i++) {
        const v = rng.int(min, max);
        if (v !== 0) return v;
    }
    return min || 1;
};

// --- LES NEUF MARCHES ---------------------------------------------------------

export const ETAPES = [
    { id: 'valeur', rang: 1, temps: 'A', label: '1 · Combien vaut 2⁵ ?', resume: 'une puissance, c\'est un produit' },
    { id: 'carreNegatif', rang: 2, temps: 'A', label: '2 · (−3)² et −3²', resume: 'la parenthèse change tout' },
    { id: 'produit', rang: 3, temps: 'B', label: '3 · Multiplier : on AJOUTE', resume: '10⁵ × 10³ = 10⁸' },
    { id: 'quotient', rang: 4, temps: 'B', label: '4 · Diviser : on SOUSTRAIT', resume: '10⁸ ÷ 10³ = 10⁵' },
    { id: 'produitRelatif', rang: 5, temps: 'B', label: '5 · Avec des exposants négatifs', resume: '10⁻⁵ × 10³ = 10⁻²' },
    { id: 'quotientRelatif', rang: 6, temps: 'B', label: '6 · Diviser des exposants négatifs', resume: '10⁻¹² ÷ 10⁻⁵ = 10⁻⁷' },
    { id: 'puissanceDePuissance', rang: 7, temps: 'C', label: '7 · Puissance de puissance : on MULTIPLIE', resume: '(10⁴)³ = 10¹²' },
    { id: 'inverse', rang: 8, temps: 'C', label: '8 · L\'inverse d\'une puissance', resume: '1 / 10⁴ = 10⁻⁴' },
    { id: 'memeBase', rang: 9, temps: 'C', label: '9 · Il faut la MÊME base', resume: '2³ × 5³ ne se simplifie pas' }
];

export const ORDRE = ETAPES.map(e => e.id);
const PAR_ID = Object.fromEntries(ETAPES.map(e => [e.id, e]));

/** Les distracteurs d'une règle : l'opération voisine, et celle du signe écrit. */
function piegesRegle(a, b, juste, base = 10) {
    return [
        { value: puissance(base, a * b),
            why: 'Le signe × est écrit devant tes yeux, mais il porte sur les NOMBRES, pas '
                + 'sur les exposants. Dans un produit de puissances, on AJOUTE les exposants.' },
        { value: puissance(base, a - b),
            why: 'Soustraire les exposants, c\'est la règle du QUOTIENT. Ici c\'est un produit.' },
        { value: puissance(base, a + b),
            why: 'Ajouter les exposants, c\'est la règle du PRODUIT. Ici c\'est un quotient.' },
        { value: puissance(base, juste) }
    ];
}

const MARCHES = {
    /**
     * COMBIEN VAUT 2⁵ ? Avant toute règle, il faut savoir ce qu'une puissance
     * EST : un produit de facteurs tous égaux. Celui qui ne le sait pas
     * applique les trois règles suivantes sans jamais pouvoir les vérifier.
     */
    valeur(rng) {
        const base = rng.pick([2, 3, 5, 10]);
        const n = base === 10 ? rng.int(2, 5) : rng.int(2, base === 2 ? 6 : 4);
        const juste = base ** n;
        const ecrit = Array(n).fill(base).join(' × ');
        return {
            prompt: `Combien vaut ${puissance(base, n)} ?`,
            html: `<div class="game-question">Combien vaut <b>${puissance(base, n)}</b> ?</div>`,
            papier: `${puissance(base, n)} = `,
            answer: juste,
            choices: [
                { value: juste, label: grouper(String(juste)), correct: true },
                { value: base * n, label: grouper(String(base * n)),
                    why: `${puissance(base, n)}, ce n'est pas ${base} × ${n} : c'est ${ecrit}.` },
                { value: base ** (n + 1), label: grouper(String(base ** (n + 1))),
                    why: 'Un facteur de trop : l\'exposant dit COMBIEN de fois.' },
                { value: base ** (n - 1), label: grouper(String(base ** (n - 1))),
                    why: 'Un facteur de moins : compte bien.' }
            ],
            filler: (r) => base ** n + r.int(2, 20),
            hints: [`L'exposant dit combien de fois on écrit le nombre : ${puissance(base, n)} = ${ecrit}.`],
            explanation: `${puissance(base, n)} = ${ecrit} = ${grouper(String(juste))}. `
                + `L'exposant dit COMBIEN DE FOIS on écrit ${base} : il ne se multiplie pas `
                + `avec lui. ${puissance(base, n)} n'est donc pas ${base} × ${n}.`,
            difficulty: 1
        };
    },

    /**
     * (−3)² ET −3², et c'est la parenthèse qui décide.
     *
     * Le premier élève au carré le NOMBRE −3, donc +9. Le second met 3 au carré
     * puis change le signe, donc −9. Deux écritures qui se ressemblent, deux
     * résultats opposés, et rien d'autre entre les deux qu'une parenthèse.
     */
    carreNegatif(rng) {
        const a = rng.int(2, 9);
        const avec = rng.bool();
        const enonce = avec ? `(−${a})²` : `−${a}²`;
        const juste = avec ? a * a : -(a * a);
        return {
            prompt: `Combien vaut ${enonce} ?`,
            html: `<div class="game-question">Combien vaut <b>${enonce}</b> ?</div>`,
            papier: `${enonce} = `,
            answer: juste,
            choices: [
                { value: juste, label: nb(juste), correct: true },
                { value: -juste, label: nb(-juste),
                    why: avec
                        ? `La parenthèse dit que c'est le nombre −${a} qu'on élève au carré : `
                            + `(−${a}) × (−${a}) = ${a * a}, positif.`
                        : `Sans parenthèse, le carré ne porte que sur ${a} : on calcule ${a}² = ${a * a}, `
                            + `PUIS on change le signe.` },
                { value: avec ? -2 * a : 2 * a, label: nb(avec ? -2 * a : 2 * a),
                    why: 'Le carré est un PRODUIT, pas un double.' },
                { value: avec ? 3 * a : -3 * a, label: nb(avec ? 3 * a : -3 * a),
                    why: 'Le carré est un produit : le nombre par lui-même.' }
            ],
            filler: (r) => nb(juste + r.int(1, 9) * (r.bool() ? 1 : -1)),
            hints: ['Regarde la parenthèse : dit-elle que le SIGNE fait partie du nombre à '
                + 'élever au carré, ou seulement le chiffre ?'],
            explanation: avec
                ? `(−${a})² = (−${a}) × (−${a}) = ${a * a}. Deux facteurs négatifs donnent un `
                    + `résultat positif. Attention : −${a}² vaut −${a * a}.`
                : `−${a}² : le carré ne porte que sur ${a}. On calcule ${a}² = ${a * a}, puis on `
                    + `change le signe : −${a * a}. Attention : (−${a})² vaut ${a * a}.`,
            difficulty: 3
        };
    },

    produit(rng) {
        const a = rng.int(2, 9), b = rng.int(2, 9);
        const juste = a + b;
        return {
            prompt: `${puissanceTexte(a)} × ${puissanceTexte(b)} = ?`,
            html: `<div class="game-question"><b>${puissanceTexte(a)} × ${puissanceTexte(b)}</b> = ?</div>`,
            papier: `${puissanceTexte(a)} × ${puissanceTexte(b)} = `,
            answer: puissanceTexte(juste),
            choices: [
                { value: puissanceTexte(juste), correct: true },
                ...piegesRegle(a, b, juste).filter(p => p.why && p.value !== puissanceTexte(juste))
                    .slice(0, 2),
                { value: puissanceTexte(a), why: 'Le deuxième facteur ne disparaît pas.' }
            ],
            filler: voisine(juste),
            hints: [`${puissanceTexte(a)}, c'est ${a} dix ; ${puissanceTexte(b)}, c'est ${b} dix. `
                + 'Mis bout à bout, cela fait combien de dix ?'],
            explanation: `${puissanceTexte(a)} × ${puissanceTexte(b)} = ${puissanceCalcul(10, a, '+', b)} `
                + `= ${puissanceTexte(juste)}. Dans un PRODUIT, on AJOUTE les exposants : `
                + `${a} dix suivis de ${b} dix font ${juste} dix.`,
            difficulty: 2
        };
    },

    quotient(rng) {
        const b = rng.int(2, 6);
        const a = b + rng.int(1, 6);
        const juste = a - b;
        const ecrit = `${puissanceTexte(a)} ÷ ${puissanceTexte(b)}`;
        return {
            prompt: `${ecrit} = ?`,
            html: `<div class="game-question"><b>${ecrit}</b> = ?</div>`,
            papier: `${ecrit} = `,
            answer: puissanceTexte(juste),
            choices: [
                { value: puissanceTexte(juste), correct: true },
                { value: puissanceTexte(a + b),
                    why: 'Ajouter les exposants, c\'est la règle du PRODUIT. Ici on divise.' },
                { value: puissanceTexte(b - a),
                    why: `On retire le second au premier : ${a} − ${b}, pas l'inverse.` },
                { value: puissanceTexte(Math.round(a / b) || 1),
                    why: 'Le signe ÷ porte sur les nombres, pas sur les exposants : on les SOUSTRAIT.' }
            ],
            filler: voisine(juste),
            hints: [`${puissanceTexte(a)}, c'est ${a} dix. On en enlève ${b}. Il en reste combien ?`],
            explanation: `${ecrit} = ${puissanceCalcul(10, a, '-', b)} = ${puissanceTexte(juste)}. `
                + `Dans un QUOTIENT, on SOUSTRAIT les exposants : sur ${a} dix, ${b} s'en vont.`,
            difficulty: 2
        };
    },

    produitRelatif(rng) {
        const a = expo(rng, -8, -2), b = expo(rng, 2, 9);
        const juste = a + b;
        const gauche = rng.bool();
        const [x, y] = gauche ? [a, b] : [b, a];
        const ecrit = `${puissanceTexte(x)} × ${puissanceTexte(y)}`;
        return {
            prompt: `${ecrit} = ?`,
            html: `<div class="game-question"><b>${ecrit}</b> = ?</div>`,
            papier: `${ecrit} = `,
            answer: puissanceTexte(juste),
            choices: [
                { value: puissanceTexte(juste), correct: true },
                { value: puissanceTexte(Math.abs(x) + Math.abs(y)),
                    why: 'On ajoute les exposants AVEC leur signe : l\'un des deux est négatif.' },
                { value: puissanceTexte(x - y),
                    why: 'Soustraire, c\'est la règle du quotient. Ici c\'est un produit.' },
                { value: puissanceTexte(x * y),
                    why: 'Le signe × porte sur les nombres, pas sur les exposants : on les AJOUTE.' }
            ],
            filler: voisine(juste),
            hints: ['La règle ne change pas parce qu\'un exposant est négatif : on ajoute les '
                + 'deux exposants, comme deux relatifs.'],
            explanation: `${ecrit} = 10^(${x} + ${y}) = ${puissanceTexte(juste)}. Un exposant `
                + 'négatif n\'ajoute aucune règle : il applique celle du produit avec des relatifs.',
            difficulty: 3
        };
    },

    quotientRelatif(rng) {
        const a = expo(rng, -12, -4), b = expo(rng, -6, -2);
        const juste = a - b;
        const ecrit = `${puissanceTexte(a)} ÷ ${puissanceTexte(b)}`;
        return {
            prompt: `${ecrit} = ?`,
            html: `<div class="game-question"><b>${ecrit}</b> = ?</div>`,
            papier: `${ecrit} = `,
            answer: puissanceTexte(juste),
            choices: [
                { value: puissanceTexte(juste), correct: true },
                { value: puissanceTexte(a + b),
                    why: `On SOUSTRAIT : ${a} − (${b}), et soustraire un négatif revient à ajouter.` },
                { value: puissanceTexte(b - a), why: 'C\'est le premier moins le second, pas l\'inverse.' },
                { value: puissanceTexte(Math.abs(a) - Math.abs(b)),
                    why: 'On garde les signes des exposants : ils sont tous les deux négatifs.' }
            ],
            filler: voisine(juste),
            hints: [`On soustrait : ${a} − (${b}). Retirer un nombre négatif revient à l'ajouter.`],
            explanation: `${ecrit} = 10^(${a} − (${b})) = ${puissanceTexte(juste)}. Soustraire un `
                + 'exposant négatif revient à l\'ajouter — c\'est la règle des relatifs, appliquée '
                + 'aux exposants.',
            difficulty: 3
        };
    },

    puissanceDePuissance(rng) {
        const a = rng.int(2, 7), b = rng.int(2, 5);
        const negatif = rng.int(1, 3) === 1;
        const x = negatif ? -a : a;
        const juste = x * b;
        const ecrit = `(${puissanceTexte(x)})${String(b).split('').map(c => EXPOSANTS[c]).join('')}`;
        return {
            prompt: `${ecrit} = ?`,
            html: `<div class="game-question"><b>${ecrit}</b> = ?</div>`,
            papier: `${ecrit} = `,
            answer: puissanceTexte(juste),
            choices: [
                { value: puissanceTexte(juste), correct: true },
                { value: puissanceTexte(x + b),
                    why: 'Ajouter, c\'est la règle du PRODUIT. Une puissance de puissance MULTIPLIE.' },
                { value: puissanceTexte(x - b), why: 'Soustraire, c\'est la règle du quotient.' },
                { value: puissanceTexte(x ** 2), why: `Il y a ${b} paquets, pas 2.` }
            ],
            filler: voisine(juste),
            hints: [`(${puissanceTexte(x)})${String(b).split('').map(c => EXPOSANTS[c]).join('')}, `
                + `c'est ${b} paquets de ${x} dix. Combien de dix en tout ?`],
            explanation: `${ecrit} = ${puissanceCalcul(10, x, '×', b)} = ${puissanceTexte(juste)}. `
                + `Une PUISSANCE DE PUISSANCE MULTIPLIE les exposants : ${b} paquets de ${x}.`,
            difficulty: 3
        };
    },

    inverse(rng) {
        const n = rng.int(2, 8);
        const versNegatif = rng.bool();
        // ON DIT « L'INVERSE DE », ON N'ÉCRIT PAS « 1 / 10⁴ ».
        //
        // Sur le papier, une fraction s'écrit EN COLONNE — numérateur sur
        // dénominateur —, et la barre oblique est une commodité d'écran : une
        // feuille qui l'imprime enseigne le contraire du cours. Le mot
        // « inverse » est de toute façon celui du chapitre, et le poser dans
        // l'énoncé fait apprendre le vocabulaire en même temps que la règle.
        const depart = puissanceTexte(versNegatif ? n : -n);
        const ecrit = `l'inverse de ${depart}`;
        const juste = versNegatif ? -n : n;
        return {
            prompt: `Quel est ${ecrit} ?`,
            html: `<div class="game-question"><span class="pc-consigne">Quel est l'inverse de</span>`
                + `<span class="lit-expr">${depart}</span></div>`,
            papier: `L'inverse de ${depart} = `,
            answer: puissanceTexte(juste),
            choices: [
                { value: puissanceTexte(juste), correct: true },
                { value: puissanceTexte(-juste),
                    why: 'Prendre l\'inverse CHANGE le signe de l\'exposant : c\'est tout ce qu\'il fait.' },
                { value: `−${puissanceTexte(Math.abs(juste))}`,
                    why: 'Un exposant négatif ne donne jamais un nombre NÉGATIF : il donne un '
                        + 'nombre positif, simplement plus petit que 1.' },
                { value: valeurPuissance(juste),
                    why: 'On demande la réponse sous la forme 10ⁿ, pas sa valeur décimale.' }
            ],
            filler: voisine(juste),
            hints: ['L\'inverse, c\'est 1 divisé par le nombre — donc un quotient : 10⁰ ÷ 10ⁿ. '
                + 'On soustrait les exposants, et 0 − n vaut −n.'],
            explanation: `L'inverse de ${depart}, c'est 10⁰ ÷ ${depart} = ${puissanceTexte(juste)}. `
                + 'Prendre l\'inverse d\'une puissance de 10 revient à CHANGER LE SIGNE de son '
                + 'exposant.',
            difficulty: 3
        };
    },

    /**
     * IL FAUT LA MÊME BASE — et c'est la question dont la réponse est « on ne
     * peut pas ». 2³ × 5³ ne se met pas sous la forme d'une seule puissance :
     * la règle du produit compte des facteurs ÉGAUX, et ceux-là ne le sont pas.
     * Sans cette marche, l'élève applique « on ajoute les exposants » partout,
     * et le fait d'autant plus volontiers que les deux exposants sont ici les
     * mêmes.
     */
    memeBase(rng) {
        const memes = rng.bool();
        const base = rng.pick([2, 3, 5, 7]);
        const autre = rng.pick([2, 3, 5, 7].filter(x => x !== base));
        const a = rng.int(2, 6), b = rng.int(2, 6);
        const g = puissance(base, a);
        const d = puissance(memes ? base : autre, b);
        const juste = memes ? puissance(base, a + b) : 'On ne peut pas simplifier';
        return {
            prompt: `${g} × ${d} : peut-on l'écrire sous la forme d'UNE seule puissance ?`,
            html: `<div class="game-question"><span class="pc-consigne">Sous la forme d'UNE seule puissance</span>`
                + `<span class="lit-expr">${g} × ${d}</span></div>`,
            papier: `${g} × ${d} = `,
            answer: juste,
            choices: [
                { value: juste, correct: true },
                memes
                    ? { value: 'On ne peut pas simplifier',
                        why: `Les deux bases sont les MÊMES (${base}) : on peut ajouter les exposants.` }
                    : { value: puissance(base, a + b),
                        why: `Les bases sont DIFFÉRENTES (${base} et ${autre}) : on ne peut pas ajouter `
                            + 'les exposants. La règle compte des facteurs ÉGAUX.' },
                { value: puissance(base, a * b),
                    why: 'Multiplier les exposants, c\'est la règle de la puissance de puissance.' },
                { value: puissance(base * (memes ? 1 : autre), a + b),
                    why: 'On ne multiplie pas les bases entre elles.' }
            ],
            filler: (r) => puissance(base, a + b + r.int(1, 4)),
            hints: ['La règle « on ajoute les exposants » compte des facteurs TOUS ÉGAUX. '
                + 'Les deux bases sont-elles les mêmes ?'],
            explanation: memes
                ? `${g} × ${d} = ${juste} : même base, donc on ajoute les exposants.`
                : `${g} × ${d} ne se simplifie pas : ${base} et ${autre} sont des bases `
                    + 'DIFFÉRENTES. On ne peut ajouter des exposants que sur une même base.',
            difficulty: 3
        };
    }
};

/** La marche d'une question : celle qu'on a choisie, ou celle du rang. */
export function marchePour(etape, index, params, total = 0) {
    if (etape && etape !== 'progressif' && PAR_ID[etape]) return etape;
    const liste = ['A', 'B', 'C'].includes(etape)
        ? ETAPES.filter(e => e.temps === etape).map(e => e.id)
        : ORDRE;
    return liste[rangMarcheCyclique(index, liste.length, params, PAR_MARCHE, total)];
}

export const puissancesCalculGenerator = {
    id: 'num.puissances-calcul',
    label: 'Calculer avec des puissances',
    skills: [SKILL],
    answerKinds: ['choice'],
    ecrit: true,
    marches: (p) => {
        const choix = (p && p.etape) || 'progressif';
        if (['A', 'B', 'C'].includes(choix)) return ETAPES.filter(e => e.temps === choix).length;
        return choix === 'progressif' ? ORDRE.length : 1;
    },
    conseil: (p) => {
        const choix = (p && p.etape) || 'progressif';
        if (['A', 'B', 'C'].includes(choix)) {
            return conseilProgression(ETAPES.filter(e => e.temps === choix).length, p, PAR_MARCHE);
        }
        return choix === 'progressif' ? conseilProgression(ORDRE.length, p, PAR_MARCHE) : 6;
    },
    params: [
        {
            id: 'etape', type: 'select', label: 'Marche à travailler', default: 'progressif',
            echelle: true,
            aide: 'Le temps A installe ce QU\'EST une puissance — un produit de facteurs égaux — '
                + 'avant toute règle. Le temps B pose les deux règles qu\'on échange tout le '
                + 'temps : le produit AJOUTE les exposants, le quotient les SOUSTRAIT. Le temps '
                + 'C ajoute la puissance de puissance, l\'inverse, et la condition qu\'on oublie : '
                + 'il faut la MÊME base.',
            options: [
                { value: 'progressif', label: 'Tout en ordre, du plus simple au plus dur', court: 'Tout' },
                { value: 'A', label: 'A — ce qu\'est une puissance', court: 'A' },
                { value: 'B', label: 'B — multiplier et diviser', court: 'B' },
                { value: 'C', label: 'C — puissance de puissance, et la même base', court: 'C' },
                ...ETAPES.map(e => ({ value: e.id, label: e.label, court: String(e.rang) }))
            ]
        },
        paramRepartition({ marches: ORDRE.length })
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const marche = marchePour((params || {}).etape, ctx.index, params, totalDe(ctx, params));
        const q = MARCHES[marche](rng);
        return makeItem({
            seed: rng.seed,
            generatorId: 'num.puissances-calcul',
            skillId: SKILL,
            answerKind: 'choice',
            prompt: { text: q.prompt, html: q.html, papier: q.papier || q.prompt },
            answer: q.answer,
            // UN DISTRACTEUR NE DOIT JAMAIS VALOIR LA BONNE RÉPONSE. Les fautes
            // se rejoignent parfois d'elles-mêmes : pour 10² × 10², ajouter et
            // multiplier les exposants donnent tous deux 10⁴.
            choices: finalizeChoices(rng,
                q.choices.filter(c => c.correct || String(c.value) !== String(q.answer)),
                { count: 4, filler: q.filler }),
            hints: q.hints,
            explanation: q.explanation,
            difficulty: q.difficulty,
            meta: { etape: marche, temps: PAR_ID[marche].temps, rang: PAR_ID[marche].rang }
        });
    }
};

export default puissancesCalculGenerator;
