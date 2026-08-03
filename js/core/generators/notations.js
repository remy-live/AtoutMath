// Notations de la géométrie plane : (AB), [AB], [AB) et AB.
//
// C'est un point de vocabulaire où l'élève de 6ᵉ se trompe de façon très
// régulière, et toujours de la même manière :
//   — il confond le SYMBOLE et l'OBJET (les crochets ferment, les parenthèses
//     laissent filer) ;
//   — il oublie que l'origine d'une demi-droite s'écrit EN PREMIER, donc [AB)
//     et [BA) lui paraissent interchangeables — ce sont deux lignes opposées ;
//   — il lit AB comme « la droite AB » alors que c'est une LONGUEUR, un nombre.
// Chaque distracteur ci-dessous vise exactement une de ces trois erreurs, et
// porte son diagnostic.
//
// Trois questions sur la même compétence, symétriques :
//   figure   — on montre le tracé, l'élève choisit l'écriture ;
//   ecriture — on décrit l'objet en toutes lettres, l'élève choisit l'écriture ;
//   lecture  — on montre l'écriture, l'élève dit ce que c'est.

import { makeItem, finalizeChoices } from '../items.js';
import { notationSvg, figure } from '../figures.js';

// Les noms de points changent d'une question à l'autre : avec toujours A et B,
// on finit par retenir « la réponse est [AB) » sans lire la question.
const PAIRES = [
    ['A', 'B'], ['M', 'N'], ['E', 'F'], ['R', 'S'],
    ['I', 'J'], ['U', 'V'], ['C', 'D'], ['K', 'L']
];

const SENS = ['figure', 'ecriture', 'lecture'];

/**
 * Les quatre (ou cinq) objets que l'on peut construire sur deux points.
 * `dessinable` : une longueur est un nombre, elle ne se trace pas.
 */
function objetsDe(p, q) {
    return {
        droite: {
            ecriture: `(${p}${q})`, nature: 'Droite', dessinable: true,
            phrase: `la droite passant par ${p} et ${q}`,
            pourquoi: `Les parenthèses ( ) désignent la DROITE : elle passe par ${p} et ${q} et se prolonge sans fin des deux côtés.`
        },
        segment: {
            ecriture: `[${p}${q}]`, nature: 'Segment', dessinable: true,
            phrase: `le segment d'extrémités ${p} et ${q}`,
            pourquoi: `Les crochets [ ] ferment aux deux bouts : c'est le SEGMENT, il s'arrête en ${p} et en ${q}.`
        },
        demi_pq: {
            ecriture: `[${p}${q})`, nature: `Demi-droite d'origine ${p}`, dessinable: true,
            phrase: `la demi-droite d'origine ${p} passant par ${q}`,
            pourquoi: `[${p}${q}) part de ${p} : le crochet ferme du côté de l'origine, la parenthèse laisse filer de l'autre.`
        },
        demi_qp: {
            ecriture: `[${q}${p})`, nature: `Demi-droite d'origine ${q}`, dessinable: true,
            phrase: `la demi-droite d'origine ${q} passant par ${p}`,
            pourquoi: `[${q}${p}) part de ${q}, pas de ${p} : l'origine d'une demi-droite s'écrit toujours en premier.`
        },
        longueur: {
            ecriture: `${p}${q}`, nature: 'Longueur', dessinable: false,
            phrase: `la longueur du segment [${p}${q}]`,
            pourquoi: `${p}${q}, sans crochet ni parenthèse, c'est la LONGUEUR du segment [${p}${q}] : un nombre, pas une ligne.`
        }
    };
}

// Ordre de présentation des distracteurs : le plus instructif d'abord, car
// `finalizeChoices` ne garde que les premiers. Face à une demi-droite, la
// question qui compte est celle de l'origine — donc l'autre demi-droite passe
// avant tout le reste.
const CONCURRENTS = {
    droite: ['segment', 'demi_pq', 'longueur', 'demi_qp'],
    segment: ['droite', 'demi_pq', 'longueur', 'demi_qp'],
    demi_pq: ['demi_qp', 'segment', 'droite', 'longueur'],
    demi_qp: ['demi_pq', 'droite', 'segment', 'longueur'],
    longueur: ['segment', 'droite', 'demi_pq', 'demi_qp']
};

export const notationsGenerator = {
    id: 'geo.notations',
    label: 'Segment, droite, demi-droite',
    skills: ['geo.notation.objets'],
    answerKinds: ['choice'],
    params: [
        {
            id: 'sens', type: 'select', label: 'Type de question',
            options: [
                { value: 'mixte', label: 'Mélangé' },
                { value: 'figure', label: 'Lire une figure' },
                { value: 'ecriture', label: 'Écrire la notation' },
                { value: 'lecture', label: 'Déchiffrer une notation' }
            ],
            default: 'mixte'
        },
        {
            id: 'longueur', type: 'select', label: 'Piège de la longueur (AB)',
            options: [{ value: 'oui', label: 'oui' }, { value: 'non', label: 'non' }],
            default: 'oui'
        }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const [p, q] = rng.pick(PAIRES);
        const objets = objetsDe(p, q);
        const avecLongueur = params.longueur !== 'non';
        const sens = params.sens && params.sens !== 'mixte' && SENS.includes(params.sens)
            ? params.sens
            : rng.pick(SENS);

        // Une figure ne peut pas montrer une longueur : on ne la tire comme
        // bonne réponse que dans les questions écrites.
        const candidats = Object.keys(objets)
            .filter(k => (sens === 'figure' ? objets[k].dessinable : true))
            .filter(k => (k === 'longueur' ? avecLongueur : true));
        const cle = rng.pick(candidats);
        const bon = objets[cle];

        const distracteurs = CONCURRENTS[cle]
            .filter(k => (k === 'longueur' ? avecLongueur : true))
            .map(k => objets[k]);

        // En lecture, la réponse est la NATURE de l'objet ; ailleurs, son
        // écriture. Les propositions suivent, forcément : mélanger une écriture
        // et une nature dans la même liste ne voudrait rien dire.
        const valeur = o => (sens === 'lecture' ? o.nature : o.ecriture);

        const choices = finalizeChoices(rng, [
            { value: valeur(bon), correct: true },
            ...distracteurs.map(o => ({ value: valeur(o), why: o.pourquoi }))
        ], { count: 4 });

        const enonce = {
            figure: {
                text: `Quelle écriture désigne cette figure ? (points ${p} et ${q})`,
                html: `<div class="game-question">Quelle est la bonne écriture&nbsp;?</div>
                       ${figure(notationSvg({ objet: cle, p, q }))}`
            },
            ecriture: {
                text: `Comment note-t-on ${bon.phrase} ?`,
                html: `<div class="game-question">Comment note-t-on<br><span class="not-cible">${bon.phrase}</span>&nbsp;?</div>`
            },
            lecture: {
                text: `Que désigne ${bon.ecriture} ?`,
                html: `<div class="game-question">Que désigne <span class="not-ecriture">${bon.ecriture}</span>&nbsp;?</div>`
            }
        }[sens];

        return makeItem({
            seed: rng.seed,
            generatorId: 'geo.notations',
            skillId: 'geo.notation.objets',
            answerKind: 'choice',
            prompt: enonce,
            answer: valeur(bon),
            choices,
            hints: [
                'Un crochet ferme la ligne, une parenthèse la laisse filer.',
                `[${p}${q}] s'arrête aux deux bouts, (${p}${q}) file des deux côtés, [${p}${q}) s'arrête d'un seul côté : celui de l'origine.`,
                `Ici, ${bon.phrase} s'écrit ${bon.ecriture}.`
            ],
            explanation: `${bon.ecriture} désigne ${bon.phrase}.`,
            difficulty: (cle === 'droite' || cle === 'segment') ? 2 : 3,
            meta: { p, q, sens, objet: cle, ecriture: bon.ecriture }
        });
    }
};
