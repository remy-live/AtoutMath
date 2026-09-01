// LES FONCTIONS — la notation, et les deux mots qu'on inverse.
//
// Rémy : « et des exercices sur les fonctions ».
//
// CE CHAPITRE SE JOUE SUR DEUX MOTS. « f(3) = 11 » se lit « 11 est l'IMAGE de
// 3 », et donc « 3 est un ANTÉCÉDENT de 11 ». Les élèves les échangent, et ce
// n'est pas de l'étourderie : rien dans l'écriture ne dit lequel est lequel, il
// faut avoir compris que la fonction PART de x et ARRIVE à f(x). Tout le reste
// du chapitre — tableaux, courbes, programmes de calcul — s'écroule si ces deux
// mots ne sont pas tenus.
//
// D'OÙ UN TYPE DE QUESTION QUI NE CALCULE RIEN. « f(3) = 11. Quelle est l'image
// de 3 ? » n'a aucun calcul : la réponse est écrite. Elle vérifie seulement
// qu'on lit l'égalité dans le bon sens — et c'est là que les points se perdent.
//
// CHERCHER UN ANTÉCÉDENT, C'EST REMONTER LE PROGRAMME À L'ENVERS. C'est la
// deuxième idée du chapitre, et elle est plus profonde qu'elle n'en a l'air :
// calculer une image, c'est appliquer les opérations dans l'ordre ; chercher un
// antécédent, c'est les défaire dans l'ordre inverse, en remplaçant chacune par
// son contraire. On garde donc les fonctions AFFINES pour les antécédents — le
// carré en a deux, et « un antécédent » deviendrait ambigu.

import { makeItem } from '../items.js';

/**
 * LE MOINS EST TYPOGRAPHIQUE PARTOUT.
 *
 * Le clavier écrit un trait d'union : plus court que le signe moins, et posé
 * plus bas que la barre du plus. Tant qu'il est seul on ne le remarque pas ;
 * dès qu'il voisine un « − » dans la même ligne — « f(x) = −3x − 3. Calcule
 * f(-3). » — la différence saute aux yeux et l'énoncé a l'air bâclé. TOUT
 * nombre affiché passe donc par ici, y compris dans les indices et les
 * explications. La réponse attendue, elle, reste un nombre : l'élève tape ce
 * qu'il veut, c'est la valeur qui est comparée.
 */
const nb = (v) => String(v).replace('-', '−');
const fr = (x) => String(Math.round(x * 1000) / 1000).replace('.', ',').replace('-', '−');

/**
 * LES PROGRAMMES DE CALCUL, qui sont la porte d'entrée du chapitre en
 * quatrième. Chaque étape porte son opération DIRECTE et son opération
 * INVERSE : c'est cette paire qui permet de remonter, et c'est elle qu'on
 * montre dans l'explication.
 */
const ETAPES = {
    fois: (a) => ({
        dit: `multiplie par ${nb(a)}`, inverse: `divise par ${nb(a)}`,
        faire: (x) => x * a, defaire: (y) => y / a
    }),
    plus: (b) => ({
        dit: `ajoute ${nb(b)}`, inverse: `enlève ${nb(b)}`,
        faire: (x) => x + b, defaire: (y) => y - b
    }),
    moins: (b) => ({
        dit: `enlève ${nb(b)}`, inverse: `ajoute ${nb(b)}`,
        faire: (x) => x - b, defaire: (y) => y + b
    })
};

/** L'écriture d'une fonction affine, sans les « 1x » ni les « + −3 ». */
function ecrireAffine(a, b) {
    const partA = a === 1 ? 'x' : (a === -1 ? '−x' : `${a < 0 ? '−' : ''}${Math.abs(a)}x`);
    if (b === 0) return partA;
    return `${partA} ${b > 0 ? '+' : '−'} ${Math.abs(b)}`;
}

/** Le programme de calcul équivalent : ×a puis ±b, dans cet ordre. */
function programmeDe(a, b) {
    const out = [ETAPES.fois(a)];
    if (b > 0) out.push(ETAPES.plus(b));
    else if (b < 0) out.push(ETAPES.moins(-b));
    return out;
}

/** « 3 × (−2) » : un produit par un négatif se parenthèse, sinon on lit « 3 × − 2 ». */
const facteur = (x) => (x < 0 ? `(${nb(x)})` : nb(x));

export const fonctionsGenerator = {
    id: 'alg.fonctions',
    label: 'Les fonctions',
    skills: ['alg.fonction.image'],
    answerKinds: ['numeric'],
    ecrit: true,
    params: [
        {
            id: 'quoi', type: 'select', label: 'Ce qu\'on demande', default: 'melange',
            aide: 'LIRE ne demande aucun calcul : la réponse est écrite dans l\'énoncé, il '
                + 'faut seulement lire l\'égalité dans le bon sens. C\'est là que les points '
                + 'se perdent, et c\'est par là qu\'il faut commencer. Chercher un ANTÉCÉDENT '
                + 'est le plus dur : il faut remonter le programme à l\'envers.',
            options: [
                { value: 'lire', label: 'Lire une égalité (image ou antécédent ?)' },
                { value: 'image', label: 'Calculer une image' },
                { value: 'programme', label: 'Suivre un programme de calcul' },
                { value: 'tableau', label: 'Compléter un tableau de valeurs' },
                { value: 'antecedent', label: 'Chercher un antécédent' },
                { value: 'melange', label: 'Mélangé' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const quoi = ['lire', 'image', 'programme', 'tableau', 'antecedent'].includes(p.quoi)
            ? p.quoi
            // Le mélange fait revenir « lire » aussi souvent que les autres :
            // c'est la question qui ne se travaille jamais assez.
            : rng.pick(['lire', 'image', 'programme', 'tableau', 'antecedent', 'image', 'lire']);

        const a = rng.pick([2, 3, 4, 5, -2, -3, 2, 3]);
        const b = rng.pick([-9, -7, -5, -4, -3, -1, 1, 2, 3, 4, 5, 6, 8]);
        const f = (x) => a * x + b;
        const ecrit = `f(x) = ${ecrireAffine(a, b)}`;

        if (quoi === 'lire') return itemLire(rng, a, b, f, ecrit);
        if (quoi === 'antecedent') return itemAntecedent(rng, a, b, f, ecrit);
        if (quoi === 'programme') return itemProgramme(rng, a, b, f);
        if (quoi === 'tableau') return itemTableau(rng, a, b, f, ecrit);
        return itemImage(rng, a, b, f, ecrit);
    }
};

/** LIRE UNE ÉGALITÉ : aucun calcul, seulement le sens des deux mots. */
function itemLire(rng, a, b, f, ecrit) {
    const x = rng.int(2, 9);
    const y = f(x);
    const versImage = rng.bool();
    const texte = versImage
        ? `On sait que f(${x}) = ${nb(y)}. Quelle est l'image de ${x} par f ?`
        : `On sait que f(${x}) = ${nb(y)}. Donne un antécédent de ${nb(y)} par f.`;
    return item(rng, {
        quoi: 'lire', texte, reponse: versImage ? y : x,
        hints: [
            'Il n\'y a RIEN à calculer : la réponse est déjà écrite dans l\'énoncé. '
                + 'La seule question est de la lire dans le bon sens.',
            'Une fonction PART du nombre entre parenthèses et ARRIVE au résultat. Dans '
                + `f(${x}) = ${nb(y)}, on part de ${x} et on arrive à ${nb(y)}.`,
            versImage ? `L'image de ${x}, c'est ce qu'on obtient : ${nb(y)}.`
                : `Un antécédent de ${nb(y)}, c'est ce d'où l'on part : ${x}.`
        ],
        explanation: `f(${x}) = ${nb(y)} se lit : « ${nb(y)} est l'image de ${x} », et donc `
            + `aussi « ${x} est un antécédent de ${nb(y)} ». On part du nombre entre `
            + 'parenthèses, on arrive au résultat.',
        difficulty: 1
    });
}

/** CALCULER UNE IMAGE : on remplace x, on calcule. */
function itemImage(rng, a, b, f, ecrit) {
    const x = rng.pick([-3, -2, 0, 1, 2, 3, 4, 5, 6, 10]);
    const signe = b > 0 ? '+' : '−';
    return item(rng, {
        quoi: 'image', reponse: f(x),
        texte: `Soit la fonction ${ecrit}. Calcule f(${nb(x)}).`,
        hints: [
            `Calculer f(${nb(x)}), c'est REMPLACER x par ${nb(x)} dans l'écriture de f, `
                + 'puis calculer.',
            `f(${nb(x)}) = ${nb(a)} × ${facteur(x)} ${signe} ${Math.abs(b)}`,
            `f(${nb(x)}) = ${nb(a * x)} ${signe} ${Math.abs(b)} = ${nb(f(x))}`
        ],
        explanation: `On remplace x par ${nb(x)} : f(${nb(x)}) = ${nb(a)} × ${facteur(x)} `
            + `${signe} ${Math.abs(b)} = ${nb(f(x))}. Donc ${nb(f(x))} est l'image de ${nb(x)}.`,
        difficulty: 2
    });
}

/** SUIVRE UN PROGRAMME DE CALCUL — la porte d'entrée du chapitre. */
function itemProgramme(rng, a, b, f) {
    const x = rng.int(1, 9);
    const etapes = programmeDe(a, b);
    const liste = etapes.map((e, i) => `${i + 1}. ${e.dit}`).join(' ; ');
    let courant = x;
    const detail = etapes
        .map(e => { courant = e.faire(courant); return `${e.dit} → ${nb(courant)}`; })
        .join(', puis ');
    return item(rng, {
        quoi: 'programme', reponse: f(x),
        texte: `Programme de calcul : choisis un nombre ; ${liste}. Quel résultat obtient-on `
            + `en partant de ${x} ?`,
        hints: [
            'Fais les étapes DANS L\'ORDRE, une par une, en écrivant le résultat de chacune.',
            `On part de ${x}, on ${etapes[0].dit} : ${nb(etapes[0].faire(x))}.`,
            `Puis on continue : ${detail}.`
        ],
        explanation: `En partant de ${x} : ${detail}. Ce programme est la fonction `
            + `f(x) = ${ecrireAffine(a, b)}, et l'on vient de calculer f(${x}) = ${nb(f(x))}.`,
        difficulty: 2
    });
}

/** COMPLÉTER UN TABLEAU DE VALEURS : la fonction, vue comme une machine. */
function itemTableau(rng, a, b, f, ecrit) {
    const xs = rng.shuffle([-2, -1, 0, 1, 2, 3, 4, 5]).slice(0, 4).sort((u, v) => u - v);
    const trou = rng.int(0, xs.length - 1);
    const ligne = xs.map((x, i) => (i === trou ? '?' : nb(f(x))));
    const tableau = `x       : ${xs.map(x => nb(x).padStart(4)).join(' ')}\n`
        + `f(x)  : ${ligne.map(v => v.padStart(4)).join(' ')}`;
    const x0 = xs[trou];
    return item(rng, {
        quoi: 'tableau', reponse: f(x0),
        texte: `Soit ${ecrit}. Complète le tableau : quelle valeur remplace le « ? » ?\n${tableau}`,
        papier: `Soit ${ecrit}. Complète le tableau de valeurs.\n${tableau}`,
        hints: [
            'Un tableau de valeurs, c\'est une image par colonne : la ligne du haut donne x, '
                + 'celle du bas donne f(x).',
            `La colonne manquante est celle de x = ${nb(x0)}. Remplace x par ${nb(x0)}.`,
            `f(${nb(x0)}) = ${nb(a)} × ${facteur(x0)} ${b > 0 ? '+' : '−'} ${Math.abs(b)} `
                + `= ${nb(f(x0))}`
        ],
        explanation: `Chaque colonne est un couple (x ; f(x)). Ici x = ${nb(x0)}, donc `
            + `f(${nb(x0)}) = ${nb(f(x0))} : ${nb(f(x0))} est l'image de ${nb(x0)}.`,
        difficulty: 2
    });
}

/** CHERCHER UN ANTÉCÉDENT : remonter le programme à l'envers. */
function itemAntecedent(rng, a, b, f, ecrit) {
    // On part de l'antécédent pour que l'image tombe juste : chercher
    // l'antécédent de 7 quand la division ne tombe pas transformerait un
    // exercice de raisonnement en exercice de fractions.
    const x = rng.pick([-3, -2, 1, 2, 3, 4, 5, 6]);
    const y = f(x);
    const etapes = programmeDe(a, b);
    const remonte = [...etapes].reverse();
    let courant = y;
    const detail = remonte
        .map(e => { courant = e.defaire(courant); return `${e.inverse} → ${fr(courant)}`; })
        .join(', puis ');
    return item(rng, {
        quoi: 'antecedent', reponse: x,
        texte: `Soit ${ecrit}. Quel nombre a pour image ${nb(y)} ? (autrement dit : trouve un `
            + `antécédent de ${nb(y)})`,
        hints: [
            'Calculer une image, c\'est faire les opérations DANS L\'ORDRE. Chercher un '
                + 'antécédent, c\'est les DÉFAIRE dans l\'ordre inverse.',
            `Le programme de f est : ${etapes.map(e => e.dit).join(', puis ')}. `
                + 'Pour remonter, on fait le contraire, en commençant par la fin : '
                + `${remonte.map(e => e.inverse).join(', puis ')}.`,
            `On part de ${nb(y)} : ${detail}.`
        ],
        explanation: `On remonte le programme à l'envers. En partant de ${nb(y)} : ${detail}. `
            + `Vérification : f(${nb(x)}) = ${nb(y)}, donc ${nb(x)} est bien un antécédent `
            + `de ${nb(y)}.`,
        difficulty: 3
    });
}

function item(rng, { quoi, texte, papier, reponse, hints, explanation, difficulty }) {
    return makeItem({
        seed: rng.seed,
        generatorId: 'alg.fonctions',
        skillId: quoi === 'antecedent' ? 'alg.fonction.antecedent' : 'alg.fonction.image',
        answerKind: 'numeric',
        prompt: { text: texte, papier: papier || texte },
        answer: reponse,
        hints,
        explanation,
        difficulty,
        meta: { quoi, theme: `fonction-${quoi}` }
    });
}
