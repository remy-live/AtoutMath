// L'ÉCRITURE SCIENTIFIQUE EN DEUX TEMPS — les règles, sans une ligne de DOM.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 26 novembre : « J'aimerais bien un exercice dans les puissances du
// genre : on a 134 × 10⁵, on met d'abord 134 sous forme scientifique en
// laissant le 10⁵, puis après on applique la règle des puissances pour avoir à
// la fin 1,34 × 10⁷. »
//
//     134 × 10⁵  =  1,34 × 10² × 10⁵  =  1,34 × 10⁷
//                   ─────────────────    ───────────
//                   premier temps        second temps
//
// DEUX TEMPS, ET C'EST TOUT L'OBJET. Le calcul tient en une ligne pour qui le
// sait faire ; mais l'élève qui le fait d'un coup écrit 1,34 × 10⁵ — il a
// déplacé la virgule sans compter ce que ça coûte. En lui faisant ÉCRIRE la
// ligne du milieu, on rend visible le 10² que la virgule a fabriqué, et la
// règle des puissances n'a plus qu'à le ranger avec l'autre.
//
// CE QUI N'EXISTAIT PAS. « Multiplier par une puissance de 10 » fait déjà le
// produit (3 × 10⁴) × (2 × 10⁻⁶), mais en QCM, et sur deux écritures déjà
// scientifiques. « Puissances de 10 — écriture scientifique » transforme un
// nombre SEUL. Le cas de Rémy — un nombre qui n'est pas entre 1 et 10, déjà
// multiplié par une puissance — est celui qu'on rencontre au bout de chaque
// calcul de physique, et il n'était nulle part.
//
// RIEN N'EST CALCULÉ EN VIRGULE FLOTTANTE : 0,045 × 10⁶ se fabrique à partir
// des chiffres « 45 » et des rangs, comme le reste du chapitre (voir
// `decimaleDe` dans puissances.js).

import { decimaleDe, mantisseTexte, puissanceTexte, jugerMantisse, grouper } from './puissances.js';

/**
 * LES CINQ MARCHES, dans l'ordre où elles se travaillent. La première est
 * l'exemple même de Rémy ; chacune n'ajoute qu'une difficulté.
 */
export const MARCHES_DEUX_TEMPS = [
    { id: 'entier', nom: '1. Un entier devant : 134 × 10⁵' },
    { id: 'decimal', nom: '2. Un décimal devant : 52,7 × 10³' },
    { id: 'petit', nom: '3. Plus petit que 1 devant : 0,045 × 10⁶' },
    { id: 'negatif', nom: '4. Un exposant négatif : 3 200 × 10⁻⁷' },
    { id: 'tout', nom: '5. Les deux à la fois : 0,08 × 10⁻³' }
];

/** Un relatif écrit avec le VRAI signe moins — le tiret de clavier n'en est pas un. */
export const relatif = (n) => (n < 0 ? `−${-n}` : String(n));

/** Des chiffres significatifs : le premier et le dernier ne sont jamais nuls. */
function tirerChiffres(rng, combien) {
    let s = String(rng.int(1, 9));
    for (let i = 1; i < combien; i++) s += String(i === combien - 1 ? rng.int(1, 9) : rng.int(0, 9));
    return s;
}

/**
 * FABRIQUER UNE QUESTION D'UNE MARCHE.
 *
 * On choisit d'abord ce qu'on veut obtenir — les chiffres de la mantisse et
 * l'exposant `p` qu'elle fabrique —, puis l'on écrit le nombre de départ en
 * déplaçant la virgule. Le nombre devant n'est donc JAMAIS déjà entre 1 et 10 :
 * il n'y aurait pas de premier temps.
 *
 * @returns {{ a: string, n: number, mantisse: string, p: number, final: number, chiffres: string }}
 */
export function fabriquer(rng, marche) {
    for (let essai = 0; essai < 60; essai++) {
        let chiffres, p, n;
        if (marche === 'entier') {
            // 134 × 10⁵ : un entier de trois à cinq chiffres, sans virgule, et
            // au plus trois chiffres significatifs — l'exemple de Rémy, pas
            // « 35 937 », où l'on recopierait des chiffres au lieu de compter.
            p = rng.int(2, 4);
            chiffres = tirerChiffres(rng, rng.int(2, 3));
            n = rng.int(2, 8);
        } else if (marche === 'decimal') {
            // 52,7 × 10³ : un décimal plus grand que 10, la virgule déjà là —
            // donc au moins un chiffre après elle, et pas plus de quatre en tout.
            p = rng.int(1, 2);
            chiffres = tirerChiffres(rng, p + 2 + (p === 1 && rng.bool() ? 1 : 0));
            n = rng.int(2, 7);
        } else if (marche === 'petit') {
            // 0,045 × 10⁶ : le nombre devant est plus petit que 1, donc p < 0.
            p = -rng.int(1, 3);
            chiffres = tirerChiffres(rng, rng.int(1, 3));
            n = rng.int(3, 9);
        } else if (marche === 'negatif') {
            // 3 200 × 10⁻⁷ : l'exposant de départ est négatif.
            p = rng.int(1, 4);
            chiffres = tirerChiffres(rng, rng.int(1, Math.min(3, p + 1)));
            n = -rng.int(2, 9);
        } else {
            // 0,08 × 10⁻³ : les deux signes à la fois.
            p = -rng.int(1, 3);
            chiffres = tirerChiffres(rng, rng.int(1, 2));
            n = -rng.int(2, 7);
        }
        const final = p + n;
        // UN RÉSULTAT QUI NE TRAHIT PAS UNE FAUTE. Si 2 + 2 = 2 × 2, l'élève
        // qui MULTIPLIE les exposants tomberait juste ; si le résultat est 10⁰,
        // la ligne finale se lit mal. On retire ces cas plutôt que de les
        // laisser enseigner une règle fausse.
        // ET DEUX EXPOSANTS ÉGAUX — 5 800 × 10³ = 5,8 × 10³ × 10³ — rendent la
        // faute de Rémy indiscernable : « tu as gardé 10³ » ne dit plus lequel.
        // Vu par la sonde.
        if (final === 0 || p * n === final || final === n || final === -n || p === n || p === -n) continue;
        const a = decimaleDe(chiffres, 1, p);
        return { a, n, mantisse: mantisseTexte(chiffres), p, final, chiffres };
    }
    return { a: '134', n: 5, mantisse: '1,34', p: 2, final: 7, chiffres: '134' };
}

/** « 134 × 10⁵ », avec les espaces de milliers : 3 200 se lit d'un coup d'œil. */
export const departTexte = (q) => `${grouper(q.a)} × ${puissanceTexte(q.n)}`;

/** La chaîne entière, comme au tableau : « 134 × 10⁵ = 1,34 × 10² × 10⁵ = 1,34 × 10⁷ ». */
export const chaineTexte = (q) => `${departTexte(q)} = ${q.mantisse} × ${puissanceTexte(q.p)} × `
    + `${puissanceTexte(q.n)} = ${q.mantisse} × ${puissanceTexte(q.final)}`;

/**
 * CE QUE L'ÉLÈVE A TAPÉ, REMIS AU PROPRE : « 1,340 » est « 1,34 », « −2 »
 * est −2 quel que soit le tiret employé. On juge le nombre écrit, pas la
 * manière de taper.
 */
export function normaliserMantisse(texte) {
    let t = String(texte || '').trim().replace(/\s/g, '').replace('.', ',');
    if (!/^\d+(,\d*)?$/.test(t)) return t;
    let [ent, dec = ''] = t.split(',');
    ent = ent.replace(/^0+(?=\d)/, '');
    dec = dec.replace(/0+$/, '');
    return dec ? `${ent},${dec}` : ent;
}

export function normaliserExposant(texte) {
    const t = String(texte || '').trim().replace(/[−–‐]/g, '-');
    return /^-?\d+$/.test(t) ? String(Number(t)) : t;
}

/** La réponse, sous la forme qu'on compare : « 1,34|2|7 ». */
export const reponseDe = (q) => `${q.mantisse}|${q.p}|${q.final}`;
export const saisieDe = ({ mantisse, p, final }) =>
    `${normaliserMantisse(mantisse)}|${normaliserExposant(p)}|${normaliserExposant(final)}`;

/**
 * CE QUI NE VA PAS, NOMMÉ — LIGNE PAR LIGNE, et dans l'ordre où on l'écrit.
 *
 * Les fautes de cet exercice ne sont pas la même erreur, et un « faux »
 * unique les confondrait :
 *
 *   · LIGNE 2, LE NOMBRE DEVANT n'est pas entre 1 et 10 — on n'a pas fait
 *     l'écriture scientifique ; ou il l'est, mais ses chiffres ont changé —
 *     on a recopié de travers ;
 *   · LIGNE 2, L'EXPOSANT a le mauvais signe — la faute qui coûte le plus,
 *     et la seule qui se corrige par une question : le nombre était-il plus
 *     grand ou plus petit que 1 ? — ou le mauvais nombre de rangs ;
 *   · LIGNE 3, L'EXPOSANT FINAL est resté celui du départ — la faute que Rémy
 *     décrit, 1,34 × 10⁵ —, ou l'on a MULTIPLIÉ les exposants parce que le
 *     signe × est écrit entre les deux puissances.
 *
 * UNE LIGNE 3 COHÉRENTE AVEC UNE LIGNE 2 FAUSSE n'est pas une seconde faute :
 * l'élève a bien appliqué la règle à ce qu'il avait écrit. On le lui dit.
 *
 * @returns {{ juste: boolean, ligne: 0|2|3, pourquoi: string }}
 */
export function juger(q, saisie) {
    const m = normaliserMantisse(saisie.mantisse);
    const p = Number(normaliserExposant(saisie.p));
    const f = Number(normaliserExposant(saisie.final));
    const a = grouper(q.a);
    const ligne2 = (pourquoi) => ({ juste: false, ligne: 2, pourquoi });

    if (m !== q.mantisse) {
        const v = jugerMantisse(m);
        if (v.quoi === 'tropGrand') {
            return ligne2(`Ligne 2 : ${m} n'est pas entre 1 et 10. On garde UN SEUL chiffre avant la virgule — le premier qui n'est pas zéro.`);
        }
        if (v.quoi === 'tropPetit' || v.quoi === 'zero') {
            return ligne2(`Ligne 2 : ${m} est plus petit que 1. La virgule se place juste après le premier chiffre qui n'est pas zéro.`);
        }
        return ligne2(`Ligne 2 : les chiffres de ${a} ne changent pas, seule la virgule bouge. On attend ${q.mantisse}.`);
    }
    if (p !== q.p) {
        if (p === -q.p) {
            return ligne2(q.p > 0
                ? `Ligne 2 : ${a} est plus GRAND que 1 — pour l'écrire ${q.mantisse}, on l'a divisé, il faut donc le remultiplier : l'exposant est positif.`
                : `Ligne 2 : ${a} est plus PETIT que 1 — pour l'écrire ${q.mantisse}, on l'a multiplié, il faut donc compenser : l'exposant est négatif.`);
        }
        const rangs = Math.abs(q.p);
        return ligne2(`Ligne 2 : compte les rangs. De ${a} à ${q.mantisse}, la virgule a bougé de ${rangs} rang${rangs > 1 ? 's' : ''}.`);
    }
    if (f !== q.final) {
        const ligne3 = (pourquoi) => ({ juste: false, ligne: 3, pourquoi });
        const somme = `${relatif(q.p)} + ${q.n < 0 ? `(${relatif(q.n)})` : q.n} = ${relatif(q.final)}`;
        if (f === q.n) {
            return ligne3(`Ligne 3 : tu as gardé ${puissanceTexte(q.n)}. Il faut y ranger aussi le ${puissanceTexte(q.p)} de la ligne 2 : ${somme}.`);
        }
        if (f === q.p * q.n) {
            return ligne3(`Ligne 3 : un produit de puissances AJOUTE les exposants, il ne les multiplie pas : ${somme}.`);
        }
        if (f === q.p - q.n || f === q.n - q.p) {
            return ligne3(`Ligne 3 : c'est un produit, donc on ajoute les exposants : ${somme}.`);
        }
        return ligne3(`Ligne 3 : ${puissanceTexte(q.p)} × ${puissanceTexte(q.n)} — on ajoute les exposants : ${somme}.`);
    }
    return { juste: true, ligne: 0, pourquoi: '' };
}

/** Les trois indices, du plus léger au plus explicite. */
export function indices(q) {
    const a = grouper(q.a);
    const sens = q.p > 0 ? `plus grand que 1 : l'exposant est positif` : `plus petit que 1 : l'exposant est négatif`;
    return [
        `D'abord ${a} tout seul, sans toucher au ${puissanceTexte(q.n)} : place la virgule après le premier chiffre qui n'est pas zéro. ${a} est ${sens}.`,
        `${a} = ${q.mantisse} × ${puissanceTexte(q.p)}. On garde ${puissanceTexte(q.n)} à côté : ${q.mantisse} × ${puissanceTexte(q.p)} × ${puissanceTexte(q.n)}.`,
        `${puissanceTexte(q.p)} × ${puissanceTexte(q.n)} : un produit de puissances de 10 ajoute les exposants, ${relatif(q.p)} + ${q.n < 0 ? `(${relatif(q.n)})` : q.n} = ${relatif(q.final)}.`
    ];
}
