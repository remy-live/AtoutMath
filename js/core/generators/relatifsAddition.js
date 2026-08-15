// ADDITIONNER DES RELATIFS — la progression pas à pas.
//
// L'exercice d'addition existant partait déjà de situations concrètes, mais il
// franchissait d'un coup la marche qui compte : entre « il fait −3, il monte de
// 5 » et « (−3) + (+5) = ? », il y a une écriture à apprendre, et elle n'était
// travaillée nulle part. Cette progression-ci ne fait que ça, et lentement.
//
// Elle est bâtie en trois temps, et chaque temps monte les mêmes quatre
// marches :
//
//   A. TOUT DU MÊME SIGNE      — le cas où il n'y a rien à annuler. On installe
//                                l'écriture, les parenthèses, la simplification.
//   B. DES SIGNES DIFFÉRENTS   — les paires s'annulent, et la soustraction
//                                apparaît d'elle-même. C'est LE moment du
//                                chapitre.
//   C. LE MÉLANGE              — illustré, puis nu, puis avec une virgule.
//
// Les quatre marches d'un temps :
//   1. les pastilles, avec le calcul écrit à côté ;
//   2. simplifier une écriture, puis la calculer — une question sur deux ;
//   3. des écritures mêlées, avec ou sans parenthèses ;
//   4. des décimaux à un chiffre après la virgule, SANS retenue ni emprunt.
//
// Le module est pur : il se teste sous Node, sans navigateur.

import { makeItem } from '../items.js';
import { ecrire } from './relatifs.js';

const SKILL_SOMME = 'num.relatifs.somme';
const SKILL_ECRITURE = 'num.relatifs.sens';

/** Un nombre à la française : virgule décimale et vrai signe moins (U+2212). */
export function fmt(v) {
    return String(Math.round(v * 10) / 10).replace('-', '−').replace('.', ',');
}

/**
 * L'écriture SIMPLIFIÉE d'une somme : (+3) + (+5) devient 3 + 5, et
 * (+3) + (−5) devient 3 − 5.
 *
 * C'est l'écriture que l'élève rencontrera partout ensuite, et la seule chose
 * qui la sépare de la précédente est une convention — d'où l'intérêt de la
 * faire produire plutôt que de la déclarer.
 */
export function simplifiee(a, b) {
    const gauche = a < 0 ? `−${fmt(Math.abs(a))}` : fmt(a);
    return `${gauche} ${b < 0 ? '−' : '+'} ${fmt(Math.abs(b))}`;
}

/** L'écriture complète, avec ses parenthèses : (+3) + (−5). */
export function complete(a, b) {
    return `${ecrireDec(a)} + ${ecrireDec(b)}`;
}

/** `ecrire` du module voisin, étendu aux décimaux. */
function ecrireDec(n) {
    return Number.isInteger(n) ? ecrire(n) : `(${n < 0 ? '−' : '+'}${fmt(Math.abs(n))})`;
}

export const ETAPES = [
    // --- A. Tout du même signe ---------------------------------------------
    {
        id: 'a1-pastilles-positifs', temps: 'A', marche: 1, modele: 'pastilles',
        titre: 'Les pastilles, toutes du même côté',
        signes: 'positifs', mode: 'calcul', difficulte: 1,
        aide: 'Toutes les pastilles sont dans la même colonne : rien ne s\'annule. On les compte, tout simplement.',
        lecon: 'Une pastille rouge vaut +1, une pastille bleue vaut −1. Quand elles sont toutes de la même couleur, il n\'y a rien à annuler : on ajoute les quantités et le signe ne change pas.'
    },
    {
        id: 'a1-pastilles-negatifs', temps: 'A', marche: 1, modele: 'pastilles',
        titre: 'Les pastilles, toutes négatives',
        signes: 'negatifs', mode: 'calcul', difficulte: 1,
        aide: 'Toutes les pastilles sont bleues : on compte combien il y en a, et le résultat est négatif.',
        lecon: 'Cinq pastilles bleues et trois pastilles bleues font huit pastilles bleues : (−5) + (−3) = −8. On ajoute les quantités, on garde le signe.'
    },
    {
        id: 'a2-simplifier-meme', temps: 'A', marche: 2, modele: 'ecriture',
        titre: 'Simplifier, puis calculer (même signe)',
        signes: 'meme', mode: 'alterne', difficulte: 2,
        aide: 'Un « + » suivi d\'un « (+ » se réduit à un seul « + ». Les parenthèses ne servaient qu\'à séparer les deux signes.',
        lecon: 'On n\'écrit pas deux signes à la suite. (+3) + (+5) s\'écrit donc plus simplement 3 + 5, et (−3) + (−5) s\'écrit −3 − 5. Le calcul, lui, n\'a pas changé.'
    },
    {
        id: 'a3-ecritures-meme', temps: 'A', marche: 3, modele: 'ecriture',
        titre: 'Écritures mêlées (même signe)',
        signes: 'meme', mode: 'calcul', melangeEcriture: true, difficulte: 2,
        aide: 'Avec ou sans parenthèses, c\'est le même calcul : repère d\'abord le signe de chaque nombre.',
        lecon: 'Même signe : on ajoute les distances à zéro, et on garde le signe commun.'
    },
    {
        id: 'a4-decimaux-meme', temps: 'A', marche: 4, modele: 'ecriture',
        titre: 'Avec une virgule (même signe)',
        signes: 'meme', mode: 'calcul', decimal: true, melangeEcriture: true, difficulte: 3,
        aide: 'Ajoute les dixièmes entre eux, puis les unités entre elles : ici, il n\'y a jamais de retenue.',
        lecon: 'Une virgule ne change rien à la règle des signes. On ajoute les dixièmes, puis les unités.'
    },

    // --- B. Des signes différents -------------------------------------------
    {
        id: 'b1-pastilles-opposes', temps: 'B', marche: 1, modele: 'pastilles',
        titre: 'Les paires qui s\'annulent',
        signes: 'opposes', mode: 'calcul', difficulte: 2,
        aide: 'Une rouge et une bleue forment une paire qui vaut ZÉRO : on les retire toutes les deux. Ce qui reste est la réponse.',
        lecon: 'Une pastille rouge (+1) posée à côté d\'une pastille bleue (−1) : ensemble elles valent 0. On les élimine deux par deux, une de chaque côté, jusqu\'à ce qu\'il ne reste qu\'une seule couleur. C\'est exactement ce que fait une soustraction.'
    },
    {
        id: 'b2-simplifier-opposes', temps: 'B', marche: 2, modele: 'ecriture',
        titre: 'Simplifier, puis calculer (signes différents)',
        signes: 'opposes', mode: 'alterne', difficulte: 3,
        aide: 'Un « + » suivi d\'un « (− » se réduit à un seul « − ». C\'est de là que vient la soustraction.',
        lecon: 'Ajouter un nombre négatif, c\'est soustraire : (+7) + (−3) s\'écrit 7 − 3. La soustraction n\'est pas une nouvelle opération, c\'est une addition écrite plus court.'
    },
    {
        id: 'b3-ecritures-opposes', temps: 'B', marche: 3, modele: 'ecriture',
        titre: 'Écritures mêlées (signes différents)',
        signes: 'opposes', mode: 'calcul', melangeEcriture: true, difficulte: 3,
        aide: 'Cherche lequel des deux est le plus loin de zéro : c\'est son signe que gardera le résultat.',
        lecon: 'Signes différents : on retire la plus petite distance à zéro de la plus grande, et on garde le signe du nombre le plus éloigné de zéro.'
    },
    {
        id: 'b4-decimaux-opposes', temps: 'B', marche: 4, modele: 'ecriture',
        titre: 'Avec une virgule (signes différents)',
        signes: 'opposes', mode: 'calcul', decimal: true, melangeEcriture: true, difficulte: 4,
        aide: 'Retire les dixièmes, puis les unités : ici, il n\'y a jamais d\'emprunt à faire.',
        lecon: 'La règle des signes ne dépend pas de la virgule : on compare les distances à zéro exactement de la même façon.'
    },

    // --- C. Le mélange -------------------------------------------------------
    {
        id: 'c1-melange-pastilles', temps: 'C', marche: 1, modele: 'pastilles',
        titre: 'Tout mélangé, avec les pastilles',
        signes: 'tous', mode: 'calcul', difficulte: 3,
        aide: 'Regarde d\'abord s\'il y a des paires à éliminer. S\'il n\'y en a pas, il n\'y a qu\'à compter.',
        lecon: 'Un seul geste couvre les deux cas : on élimine les paires rouge-bleu, puis on compte ce qui reste.'
    },
    {
        id: 'c2-melange-nu', temps: 'C', marche: 2, modele: 'ecriture',
        titre: 'Tout mélangé, sans illustration',
        signes: 'tous', mode: 'calcul', melangeEcriture: true, difficulte: 4,
        aide: 'Même signe : on ajoute. Signes différents : on retire, et on garde le signe du plus éloigné de zéro.',
        lecon: 'Les pastilles ont disparu, la règle reste. Si tu bloques, redessine-les mentalement : c\'est ce qu\'elles servent à faire.'
    },
    {
        id: 'c3-melange-decimaux', temps: 'C', marche: 3, modele: 'ecriture',
        titre: 'Tout mélangé, avec une virgule',
        signes: 'tous', mode: 'calcul', decimal: true, melangeEcriture: true, difficulte: 5,
        aide: 'Rien de nouveau : la virgule ne touche pas aux signes.',
        lecon: 'Dernière marche : des relatifs décimaux, avec la même règle qu\'au début.'
    }
];

/** Le couple (a, b) d'une question, selon l'étape. */
export function tirerCouple(etape, rng) {
    const dec = !!etape.decimal;
    // On travaille en DIXIÈMES, en nombres entiers : 0,1 + 0,2 ne fait pas
    // 0,30000000000000004 quand on ne demande jamais au flottant de compter.
    const unite = dec ? 10 : 1;

    let signeA, signeB;
    if (etape.signes === 'positifs') { signeA = 1; signeB = 1; }
    else if (etape.signes === 'negatifs') { signeA = -1; signeB = -1; }
    else if (etape.signes === 'meme') { signeA = signeB = rng.bool() ? 1 : -1; }
    else if (etape.signes === 'opposes') { signeA = rng.bool() ? 1 : -1; signeB = -signeA; }
    else { signeA = rng.bool() ? 1 : -1; signeB = rng.bool() ? 1 : -1; }

    if (!dec) {
        const a = signeA * rng.int(1, etape.modele === 'pastilles' ? 7 : 9);
        const b = signeB * rng.int(1, etape.modele === 'pastilles' ? 7 : 9);
        return { a, b, total: a + b };
    }

    // Décimaux SANS RETENUE ni emprunt : c'est la demande, et c'est ce qui
    // permet de ne travailler QUE les signes à cette marche-là. Même signe :
    // les dixièmes s'ajoutent sans dépasser 9. Signes différents : le nombre
    // le plus éloigné de zéro a le plus grand chiffre des dixièmes, donc rien
    // à emprunter.
    const memeSigne = signeA === signeB;
    let da = rng.int(1, 8), db = rng.int(1, 9 - da);   // dixièmes
    let ua = rng.int(1, 8), ub = rng.int(1, 9 - ua);   // unités
    if (!memeSigne) {
        // Le plus grand en valeur absolue portera le plus grand dixième.
        if (db > da) { const t = da; da = db; db = t; }
        if (ub > ua) { const t = ua; ua = ub; ub = t; }
        // Et on s'assure que c'est bien le même nombre qui est le plus grand
        // des deux, sinon l'emprunt réapparaît.
        if (ua === ub) ua = Math.min(9, ub + 1);
    }
    const va = (ua * 10 + da), vb = (ub * 10 + db);
    const a = signeA * va / unite, b = signeB * vb / unite;
    const total = (signeA * va + signeB * vb) / unite;
    return { a, b, total: Math.round(total * 10) / 10 };
}

/** Les quatre écritures possibles d'une somme : une juste, trois pièges. */
export function ecrituresPossibles(a, b) {
    const juste = simplifiee(a, b);
    const pieges = [
        simplifiee(a, -b),      // le signe du second inversé
        simplifiee(-a, b),      // le signe du premier inversé
        simplifiee(-a, -b)      // les deux inversés
    ];
    return { juste, pieges: [...new Set(pieges)].filter(p => p !== juste) };
}

/** L'explication : elle REFAIT le calcul, elle ne l'annonce pas. */
export function expliquer(etape, a, b, total) {
    if (etape.mode === 'ecriture') return '';
    const memeSigne = (a >= 0) === (b >= 0);
    if (etape.modele === 'pastilles') {
        if (memeSigne) {
            const couleur = a >= 0 ? 'rouges' : 'bleues';
            return `Toutes les pastilles sont ${couleur} : aucune paire ne s'annule. `
                + `${Math.abs(a)} et ${Math.abs(b)} font ${Math.abs(a) + Math.abs(b)}, et la couleur ne change pas. `
                + `Résultat : ${fmt(total)}.`;
        }
        const paires = Math.min(Math.abs(a), Math.abs(b));
        const reste = Math.abs(total);
        return `On élimine ${paires} paire${paires > 1 ? 's' : ''} rouge-bleu, une de chaque côté : chacune vaut 0. `
            + (reste === 0
                ? 'Il ne reste plus rien : le résultat est 0.'
                : `Il reste ${reste} pastille${reste > 1 ? 's' : ''} ${total > 0 ? 'rouge' : 'bleue'}${reste > 1 ? 's' : ''}, donc ${fmt(total)}.`);
    }
    if (memeSigne) {
        return `${complete(a, b)} s'écrit ${simplifiee(a, b)}. Les deux nombres ont le même signe : `
            + `on ajoute les distances à zéro (${fmt(Math.abs(a))} + ${fmt(Math.abs(b))} = ${fmt(Math.abs(a) + Math.abs(b))}) `
            + `et on garde ce signe : ${fmt(total)}.`;
    }
    const grand = Math.abs(a) >= Math.abs(b) ? a : b;
    return `${complete(a, b)} s'écrit ${simplifiee(a, b)}. Les signes sont différents : `
        + `on retire la plus petite distance à zéro de la plus grande `
        + `(${fmt(Math.max(Math.abs(a), Math.abs(b)))} − ${fmt(Math.min(Math.abs(a), Math.abs(b)))} = ${fmt(Math.abs(total))}), `
        + `et on garde le signe de ${fmt(grand)}, le plus éloigné de zéro : ${fmt(total)}.`;
}

/** Trois réponses fausses, chacune porteuse d'une erreur reconnaissable. */
export function leurres(a, b, total) {
    const set = new Map();
    const ajouter = (v, why) => {
        const arrondi = Math.round(v * 10) / 10;
        if (arrondi !== total && Number.isFinite(arrondi) && !set.has(arrondi)) set.set(arrondi, why);
    };
    ajouter(Math.abs(a) + Math.abs(b), 'Tu as ajouté les nombres sans regarder les signes.');
    ajouter(-total, 'Le calcul est juste, mais le signe est inversé : regarde qui est le plus loin de zéro.');
    ajouter(Math.abs(Math.abs(a) - Math.abs(b)), 'Tu as soustrait, mais les deux nombres avaient le même signe.');
    ajouter(a - b, 'Tu as changé le signe du deuxième nombre.');
    return [...set.entries()].map(([value, why]) => ({ value, why }));
}

export const relatifsAdditionGenerator = {
    id: 'num.relatifs.addition',
    label: 'Additionner des relatifs, pas à pas',
    skills: [SKILL_SOMME, SKILL_ECRITURE],
    answerKinds: ['numeric', 'choice'],
    ecrit: true,
    params: [
        {
            id: 'etape', type: 'select', label: 'Étape',
            aide: 'En « progressif », les douze marches s\'enchaînent, deux questions chacune. Choisir une étape précise sert à reprendre un point qui coince.',
            options: [
                { value: 'progressif', label: 'Progressif (les 12 marches à la suite)' },
                { value: 'A', label: 'A — tout du même signe (marches 1 à 4)' },
                { value: 'B', label: 'B — des signes différents (marches 1 à 4)' },
                { value: 'C', label: 'C — le mélange (marches 1 à 3)' },
                ...ETAPES.map((e, i) => ({ value: e.id, label: `${i + 1}. ${e.titre}` }))
            ],
            default: 'progressif'
        },
        {
            id: 'reponse', type: 'select', label: 'Réponse',
            options: [
                { value: 'saisie', label: 'À saisir (pavé de nombres)' },
                { value: 'choix', label: 'À choisir parmi quatre' }
            ],
            default: 'saisie'
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const index = ctx.index ?? 0;
        const choix = params?.etape || 'progressif';

        // Deux questions par marche : le temps de s'installer avant de monter.
        let liste = ETAPES;
        if (choix === 'A' || choix === 'B' || choix === 'C') liste = ETAPES.filter(e => e.temps === choix);
        else if (choix !== 'progressif') liste = [ETAPES.find(e => e.id === choix) || ETAPES[0]];
        const rang = Math.min(liste.length - 1, Math.floor(index / 2));
        const etape = liste[rang];
        // Le rang annoncé est TOUJOURS celui des douze marches : « Marche 6 /
        // 12 » situe l'élève dans le chapitre, « Marche 1 / 1 » ne lui dit
        // rien du tout quand le professeur a isolé une étape.
        const rangGlobal = ETAPES.findIndex(e => e.id === etape.id);

        const { a, b, total } = tirerCouple(etape, rng);

        // Marche 2 : une question sur deux porte sur l'ÉCRITURE, l'autre sur le
        // calcul. C'est ce qui fait « on les simplifie, puis on calcule » —
        // sans quoi la simplification resterait une remarque de passage.
        const surLEcriture = etape.mode === 'alterne' && index % 2 === 0;

        if (surLEcriture) {
            const { juste, pieges } = ecrituresPossibles(a, b);
            // Sur la feuille, la consigne est écrite une fois en tête de
            // l'exercice : la répéter devant chaque calcul mange la place et
            // n'apprend rien de plus. À l'écran, en revanche, c'est elle qui
            // dit ce qu'on attend — la question y garde donc sa phrase.
            const enonce = `Écris ce calcul plus simplement : ${complete(a, b)}`;
            const enoncePapier = `${complete(a, b)} =`;
            const explication = `${complete(a, b)} : on n'écrit jamais deux signes à la suite. `
                + `Le « + » et le « ${b < 0 ? '−' : '+'} » du deuxième nombre se réduisent à un seul « ${b < 0 ? '−' : '+'} », `
                + `et les parenthèses ne servent plus à rien. On écrit donc ${juste}.`;
            return makeItem({
                seed: rng.seed,
                generatorId: 'num.relatifs.addition',
                skillId: SKILL_ECRITURE,
                answerKind: 'choice',
                prompt: {
                    text: enonce, papier: enoncePapier,
                    html: `<div class="game-question">${enonce}</div>`
                },
                answer: juste,
                // MÉLANGÉES : sans cela la bonne écriture serait toujours la
                // première proposée, et l'élève apprendrait à cliquer en haut
                // à gauche au lieu de lire les signes.
                choices: rng.shuffle([
                    { value: juste, label: juste, correct: true },
                    ...pieges.slice(0, 3).map(p => ({ value: p, label: p, correct: false, why: 'Regarde de près le signe de chaque nombre.' }))
                ]),
                hints: [etape.aide, explication],
                explanation: explication,
                difficulty: etape.difficulte,
                meta: {
                    modele: 'ecriture', question: 'ecriture', a, b, total,
                    etape: etape.id, titre: etape.titre, temps: etape.temps,
                    rang: rangGlobal + 1, total_etapes: ETAPES.length,
                    lecon: SKILL_SOMME, texteLecon: etape.lecon
                }
            });
        }

        const avecParentheses = !etape.melangeEcriture || rng.bool();
        const ecriture = avecParentheses ? complete(a, b) : simplifiee(a, b);
        // L'énoncé est le MÊME dans les deux modèles : c'est le tableau dessiné
        // à côté qui change, pas le calcul.
        const enonce = `${ecriture} = ?`;
        const explication = expliquer(etape, a, b, total);
        // SUR LE PAPIER, IL N'Y A PAS DE TABLEAU DE PASTILLES : l'énoncé est un
        // calcul écrit en chiffres, et une correction qui parle de paires
        // rouge-bleu envoie l'élève chercher un dessin qui n'existe pas. On y
        // écrit le raisonnement sur les signes et les distances à zéro.
        const explicationPapier = etape.modele === 'pastilles'
            ? expliquer({ ...etape, modele: 'ecriture' }, a, b, total) : '';
        const modeReponse = params?.reponse === 'choix' ? 'choice' : 'numeric';

        return makeItem({
            seed: rng.seed,
            generatorId: 'num.relatifs.addition',
            skillId: SKILL_SOMME,
            answerKind: modeReponse,
            prompt: { text: enonce, html: `<div class="game-question">${enonce}</div>` },
            answer: total,
            choices: modeReponse === 'choice'
                ? [{ value: total, label: fmt(total), correct: true },
                    ...leurres(a, b, total).slice(0, 3).map(d => ({ value: d.value, label: fmt(d.value), correct: false, why: d.why }))]
                    .sort((x, y) => x.value - y.value)
                : null,
            hints: [etape.aide, explication],
            explanation: explication,
            explicationPapier,
            difficulty: etape.difficulte,
            meta: {
                modele: etape.modele, question: 'calcul', a, b, total,
                decimal: !!etape.decimal, ecritureComplete: avecParentheses,
                simplifiee: simplifiee(a, b),
                etape: etape.id, titre: etape.titre, temps: etape.temps,
                rang: rangGlobal + 1, total_etapes: ETAPES.length,
                lecon: SKILL_SOMME, texteLecon: etape.lecon
            }
        });
    }
};

export default relatifsAdditionGenerator;
