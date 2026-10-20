// LA RÉCIPROQUE DU THÉORÈME DE PYTHAGORE — niveau quatrième.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, progression de quatrième : « Réciproque du théorème de Pythagore ».
// Mesuré avant d'écrire : les SIX niveaux de l'exercice « Le Théorème de
// Pythagore » vont de « montrer l'hypoténuse » à « rédiger en entier », et
// TOUS SONT DU CALCUL — on connaît deux côtés d'un triangle rectangle, on
// cherche le troisième. « Ce triangle est-il rectangle ? » n'y est nulle part.
//
// ── LES DEUX THÉORÈMES NE SE RESSEMBLENT QUE DE LOIN ───────────────────────
//
// C'est la décision qui commande ce fichier, et c'est aussi ce que les élèves
// confondent le plus.
//
//   LE THÉORÈME dit : je SAIS que le triangle est rectangle, j'en DÉDUIS une
//   longueur. On part d'une propriété, on arrive à un nombre.
//
//   LA RÉCIPROQUE dit : je SAIS trois longueurs, j'en DÉDUIS que le triangle
//   est rectangle — ou qu'il ne l'est pas. On part de trois nombres, on arrive
//   à une propriété.
//
// Un élève qui applique le théorème là où il faut la réciproque écrit « donc
// BC = 10 » alors qu'on lui donnait BC. Il ne lui manque pas un calcul : il
// lui manque de savoir ce qu'il cherche. C'est pourquoi la première marche ne
// calcule rien du tout.
//
// ── ET LE CÔTÉ LE PLUS LONG EST UNE MARCHE À LUI SEUL ──────────────────────
//
// Parce que c'est là que ça se joue. La réciproque compare le carré du PLUS
// GRAND côté à la somme des carrés des deux autres — et l'élève qui prend les
// côtés dans l'ordre de l'énoncé compare n'importe quoi à n'importe quoi. Il
// obtient « non rectangle » sur un triangle qui l'est, sans qu'aucun de ses
// calculs soit faux.
//
// Pur : aucune dépendance au DOM, il se teste sous Node.

import { makeItem, finalizeChoices } from '../items.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

const S_RECIPROQUE = 'geo.pythagore.reciproque';

const choisir = (liste, rng) => liste[rng.int(0, liste.length - 1)];

/**
 * LES TRIPLETS QUI DONNENT UN TRIANGLE RECTANGLE.
 *
 * Ils sont écrits : un triplet pythagoricien ne se tire pas au hasard, et les
 * nombres d'un énoncé de quatrième doivent rester des longueurs qu'on peut
 * imaginer — 7, 24, 25 passe, 20, 99, 101 non.
 */
export const RECTANGLES = [
    [3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17],
    [12, 16, 20], [7, 24, 25], [15, 20, 25], [10, 24, 26], [20, 21, 29],
    [9, 40, 41], [12, 35, 37]
];

/**
 * LES TRIPLETS QUI N'EN DONNENT PAS — ET QUI EXISTENT QUAND MÊME.
 *
 * ── LA CONDITION QU'ON OUBLIE, ET QUI REND L'ÉNONCÉ FAUX ───────────────────
 *
 * Trois longueurs ne font pas toujours un triangle : il faut que la plus
 * grande soit INFÉRIEURE à la somme des deux autres. « AB = 3, AC = 4,
 * BC = 9 » ne décrit aucune figure — les deux petits côtés ne se rejoignent
 * pas —, et demander s'il est rectangle n'a aucun sens.
 *
 * Chaque triplet ci-dessous est donc un vrai triangle, et une épreuve le
 * revérifie. Ils sont aussi PROCHES d'un triplet pythagoricien : la question
 * ne doit pas se répondre à l'œil.
 */
export const PRESQUE = [
    [3, 4, 6], [6, 8, 11], [5, 12, 14], [9, 12, 14], [8, 15, 16],
    [12, 16, 19], [7, 24, 26], [10, 24, 25], [5, 6, 8], [9, 10, 13]
];

/** Les noms de sommets, pour que deux questions de suite ne se ressemblent pas. */
const NOMS = [['A', 'B', 'C'], ['E', 'F', 'G'], ['M', 'N', 'P'], ['R', 'S', 'T']];

/** Une case à remplir — voir `aTrous` dans core/activities/numeric.js. */
const trou = (i) => `<u class="np-trou" data-trou="${i}">&nbsp;?&nbsp;</u>`;

/**
 * UN TRIANGLE NOMMÉ, AVEC SES TROIS CÔTÉS DANS LE DÉSORDRE.
 *
 * LES LONGUEURS NE SONT PAS ÉCRITES DANS L'ORDRE CROISSANT, et c'est tout
 * l'exercice : si le plus grand côté était toujours le dernier nommé, la
 * marche « quel est le plus long ? » s'apprendrait par cœur en deux questions,
 * et l'élève appliquerait la réciproque sans jamais regarder les nombres.
 */
function triangle(liste, rng) {
    const [p, m, g] = choisir(liste, rng);
    const [X, Y, Z] = choisir(NOMS, rng);
    // Les trois côtés, chacun avec son nom et sa longueur, puis mélangés.
    const cotes = rng.shuffle([
        { nom: `${X}${Y}`, lg: p }, { nom: `${X}${Z}`, lg: m }, { nom: `${Y}${Z}`, lg: g }
    ]);
    const plusLong = cotes.reduce((a, b) => (b.lg > a.lg ? b : a));
    const autres = cotes.filter(c => c !== plusLong);
    // LE SOMMET DE L'ANGLE DROIT est celui qui n'appartient PAS au plus long
    // côté : l'angle droit est en face de l'hypoténuse.
    const sommet = [X, Y, Z].find(s => !plusLong.nom.includes(s));
    return {
        nom: `${X}${Y}${Z}`, cotes, plusLong, autres, sommet,
        carreLong: plusLong.lg * plusLong.lg,
        sommeCarres: autres[0].lg * autres[0].lg + autres[1].lg * autres[1].lg
    };
}

/** « AB = 3 cm, AC = 4 cm et BC = 5 cm » — l'énoncé des trois côtés. */
const direLesCotes = (t) =>
    `${t.cotes.slice(0, 2).map(c => `${c.nom} = ${c.lg} cm`).join(', ')} et `
    + `${t.cotes[2].nom} = ${t.cotes[2].lg} cm`;

// ── LES SIX MARCHES ────────────────────────────────────────────────────────

export const ETAPES = [
    { id: 'le-plus-long', temps: 'A', titre: 'Quel côté est le plus long ?', skill: S_RECIPROQUE },
    { id: 'les-deux-carres', temps: 'A', titre: 'Les deux nombres à comparer', skill: S_RECIPROQUE },
    { id: 'conclure-donne', temps: 'B', titre: 'Conclure, les carrés donnés', skill: S_RECIPROQUE },
    { id: 'conclure', temps: 'B', titre: 'Ce triangle est-il rectangle ?', skill: S_RECIPROQUE },
    { id: 'le-sommet', temps: 'B', titre: 'Rectangle en quel sommet ?', skill: S_RECIPROQUE },
    { id: 'probleme', temps: 'C', titre: 'Problème : est-ce bien d\'équerre ?', skill: S_RECIPROQUE }
];

const TEMPS = {
    A: 'A — avant de conclure',
    B: 'B — conclure',
    C: 'C — s\'en servir'
};

/** Une question d'une marche. */
export function question(etape, rng) {

    // ── TEMPS A : AVANT DE CONCLURE ────────────────────────────────────────

    if (etape.id === 'le-plus-long') {
        // ON NE CALCULE RIEN ICI, ET C'EST VOULU. La réciproque compare le
        // carré du PLUS GRAND côté à la somme des deux autres : l'élève qui
        // prend les côtés dans l'ordre de l'énoncé compare n'importe quoi, et
        // trouve « non rectangle » sur un triangle qui l'est — sans qu'aucun de
        // ses calculs soit faux.
        const t = triangle(rng.int(0, 1) ? RECTANGLES : PRESQUE, rng);
        return {
            enonce: `Dans le triangle ${t.nom}, ${direLesCotes(t)}.`,
            question: 'Quel est le côté le plus long ?',
            // PAS DE CHAMP `papier` ICI. Vu sur le PDF : « Dans le triangle
            // MNP, MN = 20 cm… Dans le triangle MNP, MN = 20 cm… Quel est le
            // côté le plus long ? » — l'énoncé écrit DEUX FOIS. La feuille
            // compose `papier` comme « énoncé + question » ; un `papier` qui
            // porte déjà l'énoncé se le voit donc ajouter une seconde fois.
            // À l'écran rien ne paraît, puisque l'écran lit `enonce` et
            // `question` séparément.
            kind: 'choice', reponse: t.plusLong.nom, choix: t.cotes.map(c => c.nom),
            pourquoi: `${t.plusLong.nom} mesure ${t.plusLong.lg} cm, c'est le plus grand. `
                + 'C\'est LUI qu\'on met au carré d\'un côté de la comparaison ; les deux '
                + 'autres vont ensemble de l\'autre côté.',
            aide: 'ON COMPARE TOUJOURS LE PLUS GRAND AUX DEUX AUTRES. Le nom du côté ne dit '
                + 'rien : il faut regarder les longueurs, pas l\'ordre de l\'énoncé.'
        };
    }

    if (etape.id === 'les-deux-carres') {
        const t = triangle(rng.int(0, 1) ? RECTANGLES : PRESQUE, rng);
        return {
            enonce: `Dans le triangle ${t.nom}, ${direLesCotes(t)}.`,
            question: `Calcule ${t.plusLong.nom}² d'une part, et ${t.autres[0].nom}² + `
                + `${t.autres[1].nom}² d'autre part.`,
            // « et », ET SURTOUT PAS UN POINT MÉDIAN. Sur un écran de
            // mathématiques, « · » est un signe de MULTIPLICATION : l'élève
            // lirait « ? × AB² ». La même faute avait été trouvée sur la
            // feuille du PGCD le matin même.
            htmlReponse: `<span class="pp-ecriture">${t.plusLong.nom}² = ${trou(0)}`
                + ` &nbsp;et&nbsp; ${t.autres[0].nom}² + ${t.autres[1].nom}² = ${trou(1)}</span>`,
            kind: 'numeric', reponse: `${t.carreLong}|${t.sommeCarres}`, cases: 2,
            pourquoi: `${t.plusLong.nom}² = ${t.plusLong.lg}² = ${t.carreLong}. Et `
                + `${t.autres[0].nom}² + ${t.autres[1].nom}² = ${t.autres[0].lg}² + `
                + `${t.autres[1].lg}² = ${t.autres[0].lg * t.autres[0].lg} + `
                + `${t.autres[1].lg * t.autres[1].lg} = ${t.sommeCarres}.`,
            aide: 'DEUX NOMBRES, ET RIEN D\'AUTRE POUR L\'INSTANT : le carré du plus grand '
                + 'côté, et la somme des carrés des deux autres. On les comparera après.'
        };
    }

    // ── TEMPS B : CONCLURE ─────────────────────────────────────────────────

    if (etape.id === 'conclure-donne') {
        // LES DEUX NOMBRES SONT DONNÉS : il ne reste QUE la conclusion. C'est
        // la marche qui sépare « savoir calculer » de « savoir conclure », et
        // beaucoup d'élèves ratent la seconde en réussissant la première.
        const estRectangle = rng.int(0, 1) === 1;
        const t = triangle(estRectangle ? RECTANGLES : PRESQUE, rng);
        const egaux = t.carreLong === t.sommeCarres;
        return {
            enonce: `Dans le triangle ${t.nom}, on a calculé ${t.plusLong.nom}² = `
                + `${t.carreLong} et ${t.autres[0].nom}² + ${t.autres[1].nom}² = `
                + `${t.sommeCarres}.`,
            question: `Le triangle ${t.nom} est-il rectangle ?`,
            kind: 'choice', reponse: egaux ? 'oui' : 'non', choix: ['oui', 'non'],
            pourquoi: egaux
                ? `Les deux nombres sont ÉGAUX : d'après la réciproque du théorème de `
                    + `Pythagore, ${t.nom} est rectangle en ${t.sommet}.`
                : `Les deux nombres sont DIFFÉRENTS (${t.carreLong} et ${t.sommeCarres}) : `
                    + `${t.nom} n'est pas rectangle. On ne peut rien dire de plus — il n'est `
                    + 'ni « presque rectangle », ni rectangle ailleurs.',
            aide: 'LA RÉPONSE TIENT EN UN MOT : les deux nombres sont-ils ÉGAUX ? S\'ils le '
                + 'sont, le triangle est rectangle. Sinon, il ne l\'est pas — et il n\'y a '
                + 'pas de « presque ».'
        };
    }

    if (etape.id === 'conclure') {
        const estRectangle = rng.int(0, 1) === 1;
        const t = triangle(estRectangle ? RECTANGLES : PRESQUE, rng);
        const egaux = t.carreLong === t.sommeCarres;
        return {
            enonce: `Dans le triangle ${t.nom}, ${direLesCotes(t)}.`,
            question: `Le triangle ${t.nom} est-il rectangle ?`,
            kind: 'choice', reponse: egaux ? 'oui' : 'non', choix: ['oui', 'non'],
            pourquoi: `Le plus long côté est ${t.plusLong.nom}. ${t.plusLong.nom}² = `
                + `${t.carreLong}, et ${t.autres[0].nom}² + ${t.autres[1].nom}² = `
                + `${t.sommeCarres}. ` + (egaux
                    ? `Les deux sont égaux : d'après la réciproque du théorème de Pythagore, `
                        + `${t.nom} est rectangle en ${t.sommet}.`
                    : 'Les deux sont différents : le triangle n\'est pas rectangle.'),
            aide: 'TROIS GESTES, DANS CET ORDRE : repérer le plus long côté, calculer son '
                + 'carré d\'un côté et la somme des deux autres carrés de l\'autre, puis '
                + 'comparer.'
        };
    }

    if (etape.id === 'le-sommet') {
        // L'ANGLE DROIT EST EN FACE DE L'HYPOTÉNUSE, et c'est la moitié de la
        // conclusion qu'on oublie d'écrire. « Il est rectangle » ne suffit pas
        // au contrôle : il faut dire OÙ.
        const t = triangle(RECTANGLES, rng);
        const sommets = t.nom.split('');
        return {
            enonce: `Dans le triangle ${t.nom}, ${direLesCotes(t)}. `
                + 'On a montré qu\'il est rectangle.',
            question: `En quel sommet le triangle ${t.nom} est-il rectangle ?`,
            kind: 'choice', reponse: t.sommet, choix: sommets,
            pourquoi: `Le plus long côté est ${t.plusLong.nom} : c'est l'hypoténuse. L'angle `
                + `droit est EN FACE, donc au sommet qui n'est pas sur ce côté — ${t.sommet}.`,
            aide: 'L\'ANGLE DROIT EST TOUJOURS EN FACE DU PLUS LONG CÔTÉ. On repère '
                + 'l\'hypoténuse, puis on cherche le sommet qui n\'est pas dessus.'
        };
    }

    // 'probleme'
    //
    // À QUOI SERT LA RÉCIPROQUE, EN UNE PHRASE : à vérifier un angle droit
    // qu'on ne peut pas mesurer, avec un mètre et rien d'autre. C'est le métier
    // qui l'emploie — un menuisier, un maçon —, et c'est ce qui la rend moins
    // abstraite qu'un triangle nommé ABC.
    // CHAQUE MÉTIER PORTE SON PRONOM ET SON ARTICLE. Lu sur la sortie : « Une
    // jardinière veut vérifier […] IL mesure », et « vérifier que UNE dalle est
    // bien rectangulaire ». Deux fautes dans une phrase qu'on demande de lire
    // avec attention.
    const METIERS = [
        // DEUX GENRES PAR LIGNE, ET ILS NE SONT PAS LE MÊME. `il` est celui de
        // la PERSONNE (« Elle mesure »), `ceGenre` celui de l'OBJET (« Cette
        // dalle est-ELLE »). Les confondre donne « Cette dalle est-il bien
        // rectangulaire ? » — un maçon masculin qui déteint sur sa dalle.
        { qui: 'Un menuisier', il: 'Il', ce: 'ce cadre', ceGenre: 'm',
            etat: 'd\'équerre' },
        { qui: 'Un maçon', il: 'Il', ce: 'cette dalle', ceGenre: 'f',
            etat: 'bien rectangulaire' },
        { qui: 'Une jardinière', il: 'Elle', ce: 'ce carré de potager', ceGenre: 'm',
            etat: 'd\'équerre' }
    ];
    const h = choisir(METIERS, rng);
    const estRectangle = rng.int(0, 1) === 1;
    const [p, m, g] = choisir(estRectangle ? RECTANGLES : PRESQUE, rng);
    // ON PASSE EN DÉCIMÈTRES : un cadre de 6 cm sur 8 cm ne se fabrique pas.
    //
    // ET LA LONGUEUR EST LA PLUS GRANDE DES DEUX. Lu sur la sortie : « la
    // longueur : 80 cm, la largeur : 150 cm » — les triplets sont écrits dans
    // l'ordre croissant, mais rien ne dit que le premier soit la longueur.
    const A = Math.max(p, m) * 10, B = Math.min(p, m) * 10, C = g * 10;
    const egaux = C * C === A * A + B * B;
    const estIl = h.ceGenre === 'f' ? 'est-elle' : 'est-il';
    return {
        enonce: `${h.qui} veut vérifier que ${h.ce} est ${h.etat}. ${h.il} mesure la `
            + `longueur : ${A} cm, la largeur : ${B} cm, et la diagonale : ${C} cm.`,
        question: `${h.ce.charAt(0).toUpperCase()}${h.ce.slice(1)} ${estIl} ${h.etat} ?`,
        kind: 'choice', reponse: egaux ? 'oui' : 'non', choix: ['oui', 'non'],
        pourquoi: `La diagonale est le plus long côté : ${C}² = ${C * C}. Et ${A}² + ${B}² = `
            + `${A * A} + ${B * B} = ${A * A + B * B}. ` + (egaux
                ? 'Les deux sont égaux, donc l\'angle est droit : c\'est bien d\'équerre.'
                : 'Les deux sont différents, donc l\'angle n\'est pas droit.'),
        aide: 'LA DIAGONALE JOUE LE RÔLE DE L\'HYPOTÉNUSE : c\'est elle qui est en face de '
            + 'l\'angle qu\'on veut vérifier, et c\'est donc elle qu\'on met au carré toute '
            + 'seule.'
    };
}

const MOT = 'marche';
const LISTE_MARCHES = ETAPES.map((e, i) => ({ id: e.id, nom: `${i + 1}. ${e.titre}`, groupe: e.temps }));
const DIFFICULTE = { A: 1, B: 2, C: 3 };

export const pythagoreReciproqueGenerator = {
    id: 'geo.pythagore-reciproque',
    label: 'La Réciproque de Pythagore',
    skills: [S_RECIPROQUE],
    answerKinds: ['numeric', 'choice'],
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE_MARCHES).length),
    params: [paramMarches({ marches: LISTE_MARCHES, groupes: TEMPS, mot: MOT })],

    generate(params, ctx) {
        const rng = ctx.rng;
        const id = marcheAuRang(ctx.index ?? 0, marchesCochees(params, LISTE_MARCHES),
            totalDe(ctx, params), params);
        const etape = ETAPES.find(e => e.id === id) || ETAPES[0];
        const q = question(etape, rng);
        const choix = q.kind === 'choice'
            ? finalizeChoices(rng, q.choix.map(c => ({
                value: c,
                label: c === 'oui' ? 'Oui' : c === 'non' ? 'Non' : String(c),
                correct: c === q.reponse
            })), { count: q.choix.length })
            : null;

        const enonce = q.enonce || '';
        return makeItem({
            seed: rng.seed,
            generatorId: 'geo.pythagore-reciproque',
            skillId: etape.skill,
            answerKind: q.kind,
            prompt: {
                text: `${enonce} ${q.question}`.trim(),
                papier: `${enonce} ${q.papier || q.question}`.trim(),
                html: '<div class="game-question ap-probleme">'
                    + (enonce ? `<span class="ap-situation">${enonce}</span>` : '')
                    + `<span class="ap-question">${q.question}</span>`
                    + (q.htmlReponse ? `<span class="pp-reponse">${q.htmlReponse}</span>` : '')
                    + '</div>'
            },
            answer: q.reponse,
            choices: choix,
            hints: [
                q.aide,
                'LE THÉORÈME ET SA RÉCIPROQUE NE SERVENT PAS À LA MÊME CHOSE. Le théorème '
                    + 'part d\'un triangle rectangle et donne une longueur ; la réciproque '
                    + 'part de trois longueurs et dit s\'il est rectangle.'
            ],
            explanation: q.pourquoi,
            difficulty: DIFFICULTE[etape.temps] || 2,
            meta: {
                marche: etape.id, temps: etape.temps, titre: etape.titre,
                decimal: false,
                ...(q.cases ? { cases: q.cases } : {})
            }
        });
    }
};

export default pythagoreReciproqueGenerator;
