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
                { value: 'phrase', label: 'Compléter la phrase (… est l\'image de …)' },
                { value: 'image', label: 'Calculer une image' },
                { value: 'programme', label: 'Suivre un programme de calcul' },
                { value: 'tableau', label: 'Compléter un tableau de valeurs' },
                { value: 'tableau-complet', label: 'Remplir TOUT le tableau' },
                { value: 'antecedent', label: 'Chercher un antécédent' },
                { value: 'melange', label: 'Mélangé' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        // POUR QUI ON ÉCRIT — et cela change le mélange, voir MELANGE ci-dessous.
        const papier = !!(ctx && ctx.papier);
        const quoi = ['lire', 'phrase', 'image', 'programme', 'tableau', 'tableau-complet',
            'antecedent'].includes(p.quoi)
            ? p.quoi
            : rng.pick(papier ? MELANGE_PAPIER : MELANGE_ECRAN);

        const a = rng.pick([2, 3, 4, 5, -2, -3, 2, 3]);
        const b = rng.pick([-9, -7, -5, -4, -3, -1, 1, 2, 3, 4, 5, 6, 8]);
        const f = (x) => a * x + b;
        const ecrit = `f(x) = ${ecrireAffine(a, b)}`;

        if (quoi === 'lire') return itemLire(rng, a, b, f, ecrit);
        if (quoi === 'phrase') return itemPhrase(rng, a, b, f, ecrit, papier);
        if (quoi === 'tableau-complet') return itemTableauComplet(rng, a, b, f, ecrit);
        if (quoi === 'antecedent') return itemAntecedent(rng, a, b, f, ecrit);
        if (quoi === 'programme') return itemProgramme(rng, a, b, f);
        if (quoi === 'tableau') return itemTableau(rng, a, b, f, ecrit);
        return itemImage(rng, a, b, f, ecrit);
    }
};

/**
 * DEUX MÉLANGES, PARCE QU'UN ÉCRAN ET UNE FEUILLE NE POSENT PAS LA MÊME QUESTION.
 *
 * Rémy, en regardant le PDF : « question trop triviale ».
 *
 * À L'ÉCRAN, une question facile n'est pas une question perdue : elle arrive
 * dans une série chronométrée, où reconnaître d'un coup d'œil de quel côté de
 * l'égalité on part EST l'exercice — c'est même le seul endroit où l'on peut
 * s'entraîner à ce réflexe-là. La PHRASE revient donc souvent, et « calcule
 * f(3) » sert de respiration entre deux.
 *
 * SUR LA FEUILLE, il n'y a ni chronomètre ni série : l'élève a le temps, il
 * relit, il vérifie. Une question qui ne demande que de lire l'énoncé dans le
 * bon sens ne lui coûte rien — c'est une ligne de plus à recopier. La feuille
 * garde donc ce qui demande un CALCUL ou un RAISONNEMENT : le tableau complet
 * (quatre images à la suite, où les fautes de signe reviennent en série),
 * l'antécédent (remonter le programme à l'envers), et la phrase — mais celle
 * dont le nombre manquant n'est écrit nulle part.
 *
 * Ce qui disparaît du papier : « lire une égalité », qui n'y demande rien, et
 * le tableau à UN trou, qui est une image habillée en tableau et que le tableau
 * complet fait quatre fois mieux.
 */
const MELANGE_ECRAN = ['phrase', 'image', 'programme', 'tableau', 'antecedent',
    'image', 'phrase', 'tableau-complet'];
const MELANGE_PAPIER = ['phrase', 'tableau-complet', 'antecedent', 'phrase',
    'image', 'antecedent', 'tableau-complet', 'programme'];

/**
 * L'ÉNONCÉ D'UNE FONCTION TIENT SUR DEUX LIGNES.
 *
 * Rémy : « pour les fonctions, tu vois, écris "soit f(x) = 3x + 5" puis va à
 * la ligne. » La DÉFINITION de la fonction et la QUESTION qu'on pose dessus
 * sont deux choses. La définition, on la relit à chaque étape du calcul ;
 * collée en tête de la question, il faut aller la rechercher au milieu d'une
 * phrase à chaque fois. Au tableau, personne n'écrit autrement : la fonction
 * sur une ligne, ce qu'on demande sur la suivante.
 *
 * (Et « Soit f(x) = … » suffit : « Soit la fonction f(x) = … » ajoute trois
 * mots que la notation dit déjà.)
 */
const enonceFonction = (ecrit, question) => `Soit ${ecrit}.\n${question}`;

/** Le même énoncé pour l'écran, où le retour à la ligne se dit `<br>`. */
const enonceFonctionHtml = (ecrit, question) =>
    `<div class="game-question">Soit <b>${ecrit}</b>.<br>${question}</div>`;

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

/**
 * COMPLÉTER LA PHRASE — et c'est Rémy qui a dit pourquoi elle manquait.
 *
 * « Fais des phrases du genre : f(3) = 1 … est l'image de … par la fonction f.
 * Ou … est un antécédent de … par la fonction f. Car là tes questions sont
 * faciles. »
 *
 * IL A RAISON, ET LE DÉFAUT ÉTAIT DE FORME. « On sait que f(3) = 1, quelle est
 * l'image de 3 ? » se répond sans avoir compris : la réponse est l'un des deux
 * nombres écrits juste au-dessus, et le hasard en donne un sur deux. La PHRASE,
 * elle, oblige à ranger les deux nombres — et c'est exactement le geste qu'on
 * rate en contrôle, parce qu'« image » et « antécédent » se disent dans le même
 * souffle et se rangent à l'envers l'un de l'autre.
 *
 * DEUX FAÇONS DE LA POSER, ET LA SECONDE FERME LA PORTE AU HASARD :
 *
 *   · ON DONNE L'ÉGALITÉ. « f(3) = 1. Complète : … est l'image de 3 par f. »
 *     Les deux nombres sont sous les yeux ; il n'y a qu'à les ranger. C'est la
 *     forme de Rémy, et c'est la première marche.
 *   · ON DONNE LA FONCTION. « Soit f(x) = 3x + 5. Complète : … est un
 *     antécédent de 17 par f. » Le nombre manquant n'est écrit nulle part : il
 *     faut le CALCULER, et il faut d'abord avoir compris de quel côté on part.
 *     Deviner ne sert plus à rien.
 *
 * ET LES QUATRE COMBINAISONS SONT TIRÉES : image ou antécédent, trou à gauche
 * ou à droite. Un élève qui a retenu « la réponse est toujours le résultat » se
 * fait prendre à la première phrase où le trou est de l'autre côté.
 */
function itemPhrase(rng, a, b, f, ecrit, papier) {
    const x = rng.pick([-3, -2, 1, 2, 3, 4, 5, 6]);
    const y = f(x);
    const versImage = rng.bool();          // « … est l'image de … » ou « … est un antécédent de … »
    const trouAGauche = rng.bool();        // quel pointillé porte la réponse
    // ON DONNE f(x) = y, OU SEULEMENT f. Sur la feuille, deux fois sur trois on
    // ne donne QUE la fonction : avec l'égalité sous les yeux, il n'y a qu'à
    // ranger deux nombres déjà écrits, et l'élève qui a le temps de réfléchir
    // n'a rien à réfléchir. L'écran, lui, garde l'équilibre : c'est là qu'on
    // s'entraîne au réflexe de lecture, pas ici.
    const avecEgalite = papier ? rng.pick([false, false, true]) : rng.bool();

    // Dans « A est l'image de B », A est le résultat et B le départ.
    // Dans « A est un antécédent de B », c'est l'inverse.
    const gauche = versImage ? y : x;
    const droite = versImage ? x : y;
    const dit = versImage ? 'est l\'image de' : 'est un antécédent de';
    const phrase = trouAGauche
        ? `. . . . . ${dit} ${nb(droite)} par la fonction f.`
        : `${nb(gauche)} ${dit} . . . . . par la fonction f.`;
    // SUR LE PAPIER, LE TROU EST UN BLANC, PAS DES POINTS.
    //
    // Rémy : « des lignes en pointillé qui ne servent à rien ». Elles venaient
    // de là : la feuille reconnaît un trou dans un énoncé à une SUITE
    // D'ESPACES — elle y pose alors la ligne à remplir, à l'endroit exact où
    // l'on écrit. Des points de suspension écrits à la main ne sont pas un
    // trou pour elle : elle imprimait donc la phrase telle quelle, ET deux
    // lignes de pointillés dessous. Deux endroits pour une seule réponse.
    const blanc = '            ';
    const phrasePapier = trouAGauche
        ? `${blanc}${dit} ${nb(droite)} par la fonction f.`
        : `${nb(gauche)} ${dit}${blanc}par la fonction f.`;
    const reponse = trouAGauche ? gauche : droite;

    // CE QU'ON DONNE EN TÊTE. Avec l'égalité, tout est là et il n'y a qu'à
    // ranger ; sans elle, le nombre manquant se calcule.
    const tete = avecEgalite ? `On sait que f(${nb(x)}) = ${nb(y)}.` : `Soit ${ecrit}.`;
    const question = `Complète la phrase :\n${phrase}`;
    const htmlPhrase = `<div class="game-question">${avecEgalite
        ? `On sait que <b>f(${nb(x)}) = ${nb(y)}</b>.`
        : `Soit <b>${ecrit}</b>.`}<br>Complète la phrase :<br>
        <span class="fn-phrase">${trouAGauche
        ? `<u>&nbsp;&nbsp;?&nbsp;&nbsp;</u> ${dit} ${nb(droite)} par la fonction f.`
        : `${nb(gauche)} ${dit} <u>&nbsp;&nbsp;?&nbsp;&nbsp;</u> par la fonction f.`}</span></div>`;

    // L'aide ne donne jamais le nombre : elle donne le SENS de la marche.
    const sens = 'Une fonction PART du nombre entre parenthèses et ARRIVE au résultat : dans '
        + `f(${nb(x)}) = ${nb(y)}, on part de ${nb(x)} et l'on arrive à ${nb(y)}.`;
    const rangement = versImage
        ? 'Dans « A est l\'image de B », A est ce qu\'on OBTIENT et B ce d\'où l\'on PART.'
        : 'Dans « A est un antécédent de B », A est ce d\'où l\'on PART et B ce qu\'on OBTIENT.';
    const calcul = avecEgalite
        ? `Les deux nombres sont écrits : f(${nb(x)}) = ${nb(y)}. Il n'y a qu'à les ranger `
            + `dans le bon ordre — la réponse est ${nb(reponse)}.`
        : (versImage === trouAGauche
            ? `Il faut calculer : f(${nb(x)}) = ${nb(a)} × ${facteur(x)} `
                + `${b > 0 ? '+' : '−'} ${Math.abs(b)} = ${nb(y)}.`
            : `Il faut remonter : quel nombre a pour image ${nb(y)} ? C'est ${nb(x)}.`);

    return item(rng, {
        quoi: versImage ? 'phrase' : 'phrase-antecedent',
        reponse,
        texte: `${tete} ${question}`,
        html: htmlPhrase,
        papier: `${tete}\nComplète la phrase :\n${phrasePapier}`,
        hints: [rangement, sens, calcul],
        explanation: `f(${nb(x)}) = ${nb(y)} se lit dans les deux sens : « ${nb(y)} est `
            + `l'image de ${nb(x)} par f » et « ${nb(x)} est un antécédent de ${nb(y)} par f ». `
            + `Ici la phrase demandait ${nb(reponse)}.`,
        difficulty: avecEgalite ? 2 : 3
    });
}

/**
 * REMPLIR TOUT LE TABLEAU — Rémy : « tu peux demander de remplir tout le
 * tableau si on donne la fonction ».
 *
 * Le tableau à un seul trou pose UNE image, habillée en tableau. Le tableau
 * complet en pose quatre, et il enseigne autre chose : à la troisième colonne,
 * l'élève ne réécrit plus le calcul, il l'automatise — et c'est là qu'on voit
 * les fautes de signe, parce qu'elles reviennent en série. C'est aussi le
 * format du contrôle, et celui de la feuille : quatre colonnes vides sous une
 * fonction donnée.
 *
 * À L'ÉCRAN, ON DEMANDE UNE COLONNE À LA FOIS. Le pavé numérique rend UN
 * nombre : on remplit donc les trois premières colonnes pour l'élève et on lui
 * demande la dernière — la même question, avec trois exemples déjà faits sous
 * les yeux. Sur le papier, où l'on écrit ce qu'on veut, le tableau est vide en
 * entier, et la correction donne les quatre valeurs.
 */
function itemTableauComplet(rng, a, b, f, ecrit) {
    const xs = rng.shuffle([-3, -2, -1, 0, 1, 2, 3, 4, 5, 6]).slice(0, 4).sort((u, v) => u - v);
    const ys = xs.map(f);
    const cellules = (lot) => lot.map(v => `<td>${v}</td>`).join('');
    // LE TABLEAU DE LA FEUILLE — dessiné, pas écrit. Une case vide est une case
    // à remplir : c'est la mise en page qui trace le quadrillage, et c'est elle
    // qui décide de ne poser aucun pointillé dessous, puisque la place pour
    // répondre est DANS le tableau.
    const tableauPapier = {
        lignes: [['x', ...xs.map(nb)], ['f(x)', ...xs.map(() => '')]]
    };
    // À l'écran, les trois premières sont données : c'est la dernière qu'on demande.
    const montrees = ys.map((y, i) => (i === ys.length - 1 ? '?' : nb(y)));
    const html = enonceFonctionHtml(ecrit, 'Complète le tableau de valeurs.')
        + `<table class="fn-valeurs"><tbody>
            <tr><th>x</th>${cellules(xs.map(nb))}</tr>
            <tr><th>f(x)</th>${cellules(montrees)}</tr>
        </tbody></table>`;
    const dernier = xs[xs.length - 1];
    const detail = xs.map((x, i) => `f(${nb(x)}) = ${nb(ys[i])}`).join(' ; ');

    return item(rng, {
        quoi: 'tableau-complet', reponse: ys[ys.length - 1],
        texte: enonceFonction(ecrit,
            `Complète le tableau de valeurs.\nx : ${xs.map(nb).join(' | ')}\n`
            + `f(x) : ${montrees.join(' | ')}`),
        html,
        papier: enonceFonction(ecrit, 'Complète TOUT le tableau de valeurs.'),
        tableau: tableauPapier,
        // LE CORRIGÉ DOIT DONNER LES QUATRE. La feuille pose quatre cases,
        // l'écran n'en demande qu'une — sans cela, le corrigé imprimait la
        // dernière valeur, seule, en face d'une question qui en posait quatre.
        reponsePapier: xs.map((v, i) => `f(${nb(v)}) = ${nb(ys[i])}`).join(' ; '),
        hints: [
            'Une colonne à la fois : on remplace x par le nombre du haut, on calcule, '
                + 'on écrit le résultat en dessous.',
            `Pour la dernière colonne, x = ${nb(dernier)}.`,
            `f(${nb(dernier)}) = ${nb(a)} × ${facteur(dernier)} ${b > 0 ? '+' : '−'} `
                + `${Math.abs(b)} = ${nb(ys[ys.length - 1])}`
        ],
        explanation: `Chaque colonne est un couple (x ; f(x)) : ${detail}.`,
        difficulty: 3
    });
}

/** CALCULER UNE IMAGE : on remplace x, on calcule. */
function itemImage(rng, a, b, f, ecrit) {
    const x = rng.pick([-3, -2, 0, 1, 2, 3, 4, 5, 6, 10]);
    const signe = b > 0 ? '+' : '−';
    return item(rng, {
        quoi: 'image', reponse: f(x),
        texte: enonceFonction(ecrit, `Calcule f(${nb(x)}).`),
        html: enonceFonctionHtml(ecrit, `Calcule f(${nb(x)}).`),
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

/**
 * COMPLÉTER UN TABLEAU DE VALEURS : la fonction, vue comme une machine.
 *
 * LE TABLEAU EST UN VRAI TABLEAU, et il a fallu que Rémy le voie pour qu'on
 * s'en aperçoive. Il était écrit en texte, aligné à coups d'espaces — ce qui
 * marche dans un terminal et nulle part ailleurs : l'écran replie les espaces
 * et avale les retours à la ligne, et l'énoncé arrivait en une bouillie,
 * « x : −2 2 3 5 f(x) : ? 7 9 13 ». Or c'est précisément LIRE UN TABLEAU qu'on
 * travaille ici : une colonne, un couple.
 */
function itemTableau(rng, a, b, f, ecrit) {
    const xs = rng.shuffle([-2, -1, 0, 1, 2, 3, 4, 5]).slice(0, 4).sort((u, v) => u - v);
    const trou = rng.int(0, xs.length - 1);
    const ligne = xs.map((x, i) => (i === trou ? '?' : nb(f(x))));
    // SUR LE PAPIER, DES BARRES PLUTÔT QUE DES ESPACES. La feuille n'aligne pas
    // en colonnes non plus — c'est du texte suivi —, mais une barre verticale
    // sépare les cases sans ambiguïté, quelle que soit la police.
    const tableau = `x : ${xs.map(nb).join(' | ')}\nf(x) : ${ligne.join(' | ')}`;
    // Sur la feuille, le même tableau se DESSINE, et la case manquante est vide
    // plutôt que marquée d'un « ? » : un point d'interrogation dans une case
    // qu'on doit remplir se retrouve barré ou entouré par la réponse.
    const tableauPapier = {
        lignes: [['x', ...xs.map(nb)], ['f(x)', ...xs.map((v, i) => (i === trou ? '' : nb(f(v))))]]
    };
    const x0 = xs[trou];
    const cellules = (lot) => lot.map(v => `<td>${v}</td>`).join('');
    // ESPACE INSÉCABLE DEVANT LE DEUX-POINTS : sans lui, il se retrouve seul en
    // tête de la deuxième ligne quand l'énoncé se replie.
    const html = enonceFonctionHtml(ecrit, 'Complète le tableau : quelle valeur remplace le « ? » ?')
        + `<table class="fn-valeurs"><tbody>
            <tr><th>x</th>${cellules(xs.map(nb))}</tr>
            <tr><th>f(x)</th>${cellules(ligne)}</tr>
        </tbody></table>`;
    return item(rng, {
        quoi: 'tableau', reponse: f(x0),
        texte: enonceFonction(ecrit, `Complète le tableau : quelle valeur remplace le « ? » ?\n${tableau}`),
        html,
        papier: enonceFonction(ecrit, 'Complète le tableau de valeurs.'),
        tableau: tableauPapier,
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
        texte: enonceFonction(ecrit, `Quel nombre a pour image ${nb(y)} ? `
            + `(autrement dit : trouve un antécédent de ${nb(y)})`),
        html: enonceFonctionHtml(ecrit, `Quel nombre a pour image ${nb(y)} ? `
            + `(autrement dit : trouve un antécédent de ${nb(y)})`),
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

function item(rng, { quoi, texte, html, papier, tableau, reponse, reponsePapier,
    hints, explanation, difficulty }) {
    return makeItem({
        seed: rng.seed,
        generatorId: 'alg.fonctions',
        // « phrase-antecedent » compte lui aussi dans la compétence
        // « antécédent » : c'est le même geste, posé autrement. Un `===` nu
        // l'aurait rangé dans « image », et le bilan aurait menti.
        skillId: quoi.includes('antecedent') ? 'alg.fonction.antecedent' : 'alg.fonction.image',
        answerKind: 'numeric',
        // `html` n'existe que là où l'énoncé porte un DESSIN — ici le tableau de
        // valeurs. Ailleurs, `text` suffit et l'écran l'habille lui-même.
        prompt: {
            text: texte, papier: papier || texte,
            // Le tableau ne concerne QUE la feuille : l'écran, lui, en pose un
            // vrai en HTML, qui se met en forme tout seul.
            ...(tableau ? { tableau } : {}),
            ...(html ? { html } : {})
        },
        answer: reponse,
        reponsePapier: reponsePapier || '',
        hints,
        explanation,
        difficulty,
        meta: { quoi, theme: `fonction-${quoi}` }
    });
}
