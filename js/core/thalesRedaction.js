// LA RÉDACTION DE THALÈS — « Je sais que… Or… Donc… »
//
// Rémy l'a demandée deux fois, et la seconde en disant qu'elle manquait
// toujours. Il en a donné le plan, ligne à ligne :
//
//   Je sais que : [CD] et [EB] sont sécantes en A
//                 (DE)//(CB)
//   Or : d'après le théorème de Thalès
//        AD/AC = AE/AB = DE/BC
//        (on remplace par les valeurs <- ne le note pas)
//        On isole le produit en croix
//        On écrit le calcul
//   Donc AD = … cm
//   Calculatrice autorisée
//
// CE QUE CET EXERCICE TRAVAILLE, ET QUE LES AUTRES NE TRAVAILLENT PAS. Trouver
// la longueur, l'exercice de calcul le fait déjà. Ici on apprend à ÉCRIRE la
// démonstration, c'est-à-dire à distinguer ce qu'on SAIT (les hypothèses, qui
// viennent de l'énoncé), ce qu'on INVOQUE (le théorème, qui vient du cours) et
// ce qu'on en DÉDUIT (le calcul). C'est la forme que le professeur attend sur
// une copie, et c'est elle qui rapporte les points : un élève qui écrit le bon
// nombre sans la justifier ne démontre rien.
//
// « ON REMPLACE PAR LES VALEURS <- NE LE NOTE PAS ». La consigne est de Rémy et
// elle est fine : substituer est un geste MENTAL, pas une ligne de copie. On
// passe donc directement du théorème à l'isolement du produit en croix — la
// ligne intermédiaire n'apparaît nulle part, ni dans la rédaction attendue, ni
// dans le corrigé.
//
// Module pur : ni DOM, ni hasard propre.

import { longueurTexte, egaliteThales } from './thales.js';

// --- L'ÉGALITÉ TAPÉE --------------------------------------------------------
//
// Rémy : « il faudrait aussi pouvoir taper l'égalité ». Choisir parmi quatre
// écritures et l'écrire soi-même ne sont pas le même travail : dans le premier
// cas on reconnaît, dans le second on construit — et c'est construire qu'on
// demande sur une copie.

/** Les trois petits segments, et les trois grands, dans l'ordre des rapports. */
export const PETITS = ['AD', 'AE', 'DE'];
export const GRANDS = ['AC', 'AB', 'BC'];

/**
 * Les deux « restes », ceux avec lesquels on confond le tout. D est sur [AC],
 * donc le reste est [DC] ; E est sur [AB], donc le reste est [EB].
 */
export const RESTES = ['CD', 'BE'];

/**
 * UN SEGMENT SE LIT DANS LES DEUX SENS. [AD] et [DA] sont le même segment et la
 * même longueur : refuser « DA » serait corriger une faute qui n'en est pas
 * une. On range donc les deux lettres par ordre alphabétique, une fois, et tout
 * le reste du module compare des étiquettes rangées.
 */
export function canon(mot) {
    const s = String(mot || '').toUpperCase().replace(/[^A-Z]/g, '');
    return s.length === 2 ? [s[0], s[1]].sort().join('') : s;
}

/** Toutes les étiquettes qu'on peut proposer au doigt : les six vraies, les deux pièges. */
export const ETIQUETTES = [...PETITS, ...GRANDS, ...RESTES];

/**
 * L'ÉGALITÉ TAPÉE EST-ELLE UNE ÉGALITÉ DE THALÈS ?
 *
 * `cases` sont les six saisies, dans l'ordre : numérateur et dénominateur du
 * premier rapport, puis du deuxième, puis du troisième.
 *
 * ON N'IMPOSE NI L'ORDRE DES TROIS RAPPORTS NI LEUR SENS. « AE/AB = AD/AC =
 * DE/BC » est la même égalité que celle du cours, et « AC/AD = AB/AE = BC/DE »
 * aussi — c'est la même, retournée. Un élève qui écrit l'une des deux a
 * compris ; lui refuser sa version lui apprendrait à recopier, pas à écrire.
 * Ce qui est refusé, en revanche, est ce qui est FAUX, et le message dit
 * laquelle des quatre confusions ordinaires il vient de faire.
 *
 * @returns {{ok:boolean, raison?:string, sens?:1|-1}}
 */
export function verifierEgalite(cases) {
    const c = (cases || []).map(canon);
    if (c.length !== 6 || c.some(x => x.length !== 2)) {
        return { ok: false, raison: 'Il manque une longueur : chaque rapport a un '
            + 'numérateur et un dénominateur, et chacun s\'écrit avec deux lettres.' };
    }
    const rapports = [[c[0], c[1]], [c[2], c[3]], [c[4], c[5]]];
    const vus = [];
    let sens = 0;
    for (const [n, d] of rapports) {
        if (n === d) {
            return { ok: false, raison: `« ${n} sur ${d} » vaut 1 : un rapport de Thalès `
                + 'compare deux longueurs DIFFÉRENTES.' };
        }
        const petit = PETITS.indexOf(n), grand = GRANDS.indexOf(d);
        const petitBas = PETITS.indexOf(d), grandHaut = GRANDS.indexOf(n);
        let i = -1, s = 0;
        if (petit >= 0 && petit === grand) { i = petit; s = 1; }
        else if (petitBas >= 0 && petitBas === grandHaut) { i = petitBas; s = -1; }
        if (i < 0) return { ok: false, raison: pourquoiFaux(n, d) };
        if (sens && s !== sens) {
            return { ok: false, raison: 'Un de tes rapports est à l\'envers. Les trois vont '
                + 'tous dans le même sens : petit sur grand, ou grand sur petit, mais '
                + 'jamais mélangés.' };
        }
        sens = s;
        if (vus.includes(i)) {
            return { ok: false, raison: 'Tu as écrit deux fois le même rapport. Il y en a '
                + 'TROIS, un par paire de segments qui se correspondent.' };
        }
        vus.push(i);
    }
    return { ok: true, sens };
}

/** CE QU'UN RAPPORT FAUX TRAHIT — et c'est toujours l'une des trois mêmes choses. */
function pourquoiFaux(n, d) {
    if (RESTES.includes(n) || RESTES.includes(d)) {
        const reste = RESTES.includes(n) ? n : d;
        return `Tu as pris le RESTE (${reste}) au lieu du TOUT. Thalès compare chaque petit `
            + 'segment au segment ENTIER qui le contient, jamais au morceau qui reste.';
    }
    const deuxPetits = PETITS.includes(n) && PETITS.includes(d);
    const deuxGrands = GRANDS.includes(n) && GRANDS.includes(d);
    if (deuxPetits || deuxGrands) {
        return `« ${n} sur ${d} » compare les deux droites entre elles. Un rapport de Thalès `
            + 'compare chaque droite à ELLE-MÊME : un petit segment sur le grand qui le '
            + 'porte.';
    }
    if (PETITS.includes(n) && GRANDS.includes(d)) {
        const i = PETITS.indexOf(n);
        return `${n} ne va pas avec ${d} : il va avec ${GRANDS[i]}, le segment entier qui le `
            + 'contient. Suis le trait depuis A et regarde où il s\'arrête.';
    }
    return `« ${n} » et « ${d} » ne sont pas deux segments de cette figure.`;
}

// --- LES TROIS PARTIES ------------------------------------------------------

/**
 * LES HYPOTHÈSES : ce qu'on SAIT, et qui vient de l'énoncé.
 *
 * Elles ne se tapent pas, elles se RECONNAISSENT : le travail de cette partie
 * est de savoir lesquelles des choses vraies sur la figure sont celles que le
 * théorème réclame. « Le triangle est isocèle » peut être vrai et ne sert à
 * rien ; « (DE) et (CB) sont sécantes » est faux et sonne pareil.
 *
 * @returns {Array<{texte, vrai, pourquoi?}>}
 */
export function hypotheses() {
    return [
        { texte: 'Les droites (CD) et (BE) sont sécantes en A.', vrai: true },
        { texte: 'Les droites (DE) et (CB) sont parallèles.', vrai: true },
        {
            texte: 'Les droites (DE) et (CB) sont sécantes en A.',
            pourquoi: 'Non : (DE) et (CB) sont justement les deux PARALLÈLES. Ce sont les '
                + 'deux autres droites, celles qui portent les côtés, qui se coupent en A.'
        },
        {
            texte: 'Le triangle ABC est isocèle en A.',
            pourquoi: 'C\'est peut-être vrai sur le dessin, mais le théorème de Thalès ne le '
                + 'demande jamais — et une hypothèse dont on ne se sert pas n\'a rien à '
                + 'faire dans une démonstration.'
        },
        {
            texte: 'Les points A, D et C sont alignés.',
            pourquoi: 'C\'est vrai, mais c\'est déjà dit : « (CD) et (BE) sont sécantes en A » '
                + 'contient l\'alignement. On n\'écrit pas deux fois la même chose.'
        },
        {
            texte: 'Les longueurs AD et AE sont égales.',
            pourquoi: 'Rien ne le dit, et le théorème n\'en a pas besoin. Thalès n\'exige que '
                + 'deux choses : deux droites sécantes, et deux parallèles.'
        }
    ];
}

/**
 * L'ISOLEMENT DU PRODUIT EN CROIX — la ligne où tout se joue.
 *
 * De AD/AC = AE/AB on tire AD × AB = AE × AC, donc AD = AE × AC ÷ AB. Les
 * fausses formes ne sont pas des brouillages : ce sont les deux façons de se
 * tromper de place, et l'élève qui prend l'une des deux obtient un nombre
 * plausible que rien ne viendra corriger.
 *
 * @param {string} cherche la longueur demandée
 * @returns {Array<{texte, juste, pourquoi?}>}
 */
export function isolements(cherche) {
    const [a, b, c] = trio(cherche);
    return [
        { texte: `${cherche} = ${a} × ${c} ÷ ${b}`, juste: true },
        {
            texte: `${cherche} = ${b} × ${c} ÷ ${a}`,
            pourquoi: `Tu as échangé ${a} et ${b}. Dans le produit en croix, ${cherche} `
                + `multiplie ${b} : c'est donc par ${b} qu'on divise à la fin.`
        },
        {
            texte: `${cherche} = ${a} × ${b} ÷ ${c}`,
            pourquoi: `${b} et ${c} ne sont pas du même côté de l'égalité : ${b} est en face `
                + `de ${cherche}, il passe donc en bas, et ${c} reste en haut.`
        }
    ];
}

/**
 * Les trois longueurs qui entrent dans le calcul de `cherche` : celle qui la
 * multiplie en croix, celle par laquelle on divise, celle qui l'accompagne.
 *
 * C'est la même table que `calculThales`, et elle est ici pour la même raison :
 * chaque inconnue se tire d'une égalité de DEUX rapports, donc de trois
 * longueurs connues.
 */
export function trio(cherche) {
    const TRIOS = {
        AD: ['AE', 'AB', 'AC'],   // AD = AE × AC ÷ AB
        AE: ['AD', 'AC', 'AB'],
        DE: ['AE', 'AB', 'BC'],
        BC: ['DE', 'AE', 'AB'],
        AB: ['AE', 'AD', 'AC'],
        AC: ['AD', 'AE', 'AB']
    };
    return TRIOS[cherche] || TRIOS.AD;
}

/** La valeur cherchée, et la ligne de calcul telle qu'on l'écrit au cahier. */
export function calculEcrit(f, cherche) {
    const [a, b, c] = trio(cherche);
    const valeur = Math.round((f[a] * f[c]) / f[b] * 100) / 100;
    const L = longueurTexte;
    return {
        valeur,
        formule: `${cherche} = ${a} × ${c} ÷ ${b}`,
        chiffres: `${cherche} = ${L(f[a])} × ${L(f[c])} ÷ ${L(f[b])}`,
        conclusion: `${cherche} = ${L(valeur)} cm`
    };
}

/**
 * LA RÉDACTION ENTIÈRE, telle qu'elle doit finir sur la copie.
 *
 * Elle sert au corrigé et à la fiche : c'est le modèle qu'on montre quand
 * l'élève a fini, et il ne peut pas diverger de ce que l'exercice fait écrire,
 * puisqu'il est construit des mêmes morceaux.
 */
export function redactionComplete(f, cherche) {
    const calc = calculEcrit(f, cherche);
    return [
        { titre: 'Je sais que', lignes: hypotheses().filter(h => h.vrai).map(h => h.texte) },
        {
            titre: 'Or',
            lignes: ['d\'après le théorème de Thalès :', egaliteThales()]
        },
        { titre: 'Donc', lignes: [calc.formule, calc.chiffres, calc.conclusion] }
    ];
}
