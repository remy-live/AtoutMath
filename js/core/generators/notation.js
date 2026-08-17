// SEGMENT, DROITE, DEMI-DROITE — lire et écrire la notation.
//
// [AB], (AB), [AB) : trois objets qui ne diffèrent que par ce qui se passe
// AU-DELÀ des deux points, et une notation qui code exactement cela. Le
// crochet est un mur, la parenthèse laisse filer. [AB] s'arrête aux deux
// bouts, (AB) ne s'arrête jamais, [AB) part de A et continue après B.
//
// C'est une notation, donc cela ne se devine pas — et c'est pour cela qu'on
// la perd. Des points partent chaque année sur « (AB) » écrit à la place de
// « [AB] », dans des copies où la construction est juste. Aucun exercice de
// l'application ne la travaillait.
//
// TROIS SENS DE LECTURE, parce qu'en savoir un ne donne pas les autres :
//   · le dessin est là, comment l'écrit-on ?
//   · l'écriture est là, quel dessin lui correspond ?
//   · l'écriture est là, comment se LIT-elle à voix haute ?
//
// Et un piège porté par le troisième objet : [AB) et [BA) sont deux
// demi-droites différentes. Le premier point nommé est l'ORIGINE — celui où
// le trait s'arrête, pas celui vers lequel il va.

import { makeItem, finalizeChoices } from '../items.js';
import { traceSvg, figure } from '../figures.js';

const LETTRES = ['A', 'B', 'C', 'D', 'E', 'F', 'I', 'J', 'K', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V'];

const TYPES = [
    {
        id: 'segment', nom: 'le segment', article: 'un segment',
        ecrire: (a, b) => `[${a}${b}]`,
        dire: (a, b) => `le segment [${a}${b}]`,
        quoi: 'il s\'arrête aux deux points : deux crochets fermants.'
    },
    {
        id: 'droite', nom: 'la droite', article: 'une droite',
        ecrire: (a, b) => `(${a}${b})`,
        dire: (a, b) => `la droite (${a}${b})`,
        quoi: 'elle ne s\'arrête jamais : deux parenthèses.'
    },
    {
        id: 'demi-droite', nom: 'la demi-droite', article: 'une demi-droite',
        ecrire: (a, b) => `[${a}${b})`,
        dire: (a, b) => `la demi-droite [${a}${b})`,
        quoi: 'elle part de son origine et ne s\'arrête plus : un crochet, puis une parenthèse.'
    }
];

const typeDe = (id) => TYPES.find(t => t.id === id);

/** Deux lettres distinctes, dans l'ordre où on les nommera. */
function deuxLettres(rng) {
    const a = rng.pick(LETTRES);
    let b = rng.pick(LETTRES);
    let garde = 0;
    while (b === a && garde++ < 20) b = rng.pick(LETTRES);
    return [a, b === a ? 'Z' : b];
}

/**
 * Les écritures qu'on peut confondre avec la bonne, chacune avec l'erreur
 * qu'elle dénonce. On en propose plus qu'il n'en faut : le tri final écarte
 * les doublons et garde les plus instructives.
 */
function ecrituresVoisines(t, a, b) {
    const toutes = [
        {
            valeur: `[${a}${b}]`, pour: 'segment',
            why: `[${a}${b}] est le SEGMENT : il s'arrête en ${a} et en ${b}.`
        },
        {
            valeur: `(${a}${b})`, pour: 'droite',
            why: `(${a}${b}) est la DROITE : elle dépasse des deux côtés.`
        },
        {
            valeur: `[${a}${b})`, pour: 'demi-droite',
            why: `[${a}${b}) est la demi-droite d'origine ${a} : elle part de ${a} et continue après ${b}.`
        },
        {
            valeur: `[${b}${a})`, pour: 'demi-droite-inverse',
            why: `[${b}${a}) part de ${b}, pas de ${a} : le premier point nommé est l'ORIGINE.`
        },
        {
            valeur: `(${a}${b}]`, pour: 'batard',
            why: 'Cette écriture n\'existe pas : on n\'ouvre pas d\'un côté pour fermer de l\'autre.'
        }
    ];
    const bonne = t.ecrire(a, b);
    return toutes.filter(e => e.valeur !== bonne);
}

// --- Les trois sens de lecture ----------------------------------------------

/** Le dessin est là : comment l'écrit-on ? */
function questionEcrire(rng, t, a, b) {
    return {
        skill: 'geo.notation.ecrire',
        texte: 'Comment note-t-on cette figure ?',
        html: `<div class="game-question">Comment note-t-on cette figure ?</div>`
            + figure(traceSvg({ type: t.id, a, b })),
        papier: `Note la figure ci-dessus : ……`,
        bon: t.ecrire(a, b),
        choix: [
            { value: t.ecrire(a, b), label: t.ecrire(a, b), correct: true },
            ...ecrituresVoisines(t, a, b).map(e => ({ value: e.valeur, label: e.valeur, why: e.why }))
        ],
        explication: `C'est ${t.dire(a, b)} : ${t.quoi}`,
        indices: [
            'Regarde ce qui se passe APRÈS les deux croix : le trait s\'arrête, ou il continue ?',
            'Le crochet ferme, la parenthèse laisse filer.'
        ]
    };
}

/** L'écriture est là : quel dessin lui correspond ? */
function questionDessin(rng, t, a, b) {
    const ecriture = t.ecrire(a, b);
    // Les propositions sont des DESSINS. C'est le seul sens qui oblige
    // vraiment à lire les crochets : dans les deux autres, un élève peut
    // reconnaître un mot sans avoir compris ce qu'il décrit.
    const dessin = (type, x, y) => traceSvg({ type, a: x, b: y, echelle: 0.92 });
    const candidats = [
        // `texte` dit en mots ce que le dessin montre : « Montre-moi » et le
        // carnet d'erreurs ne peuvent pas afficher un SVG.
        { value: `${t.id}-${a}${b}`, label: dessin(t.id, a, b), texte: t.dire(a, b), correct: true },
        ...TYPES.filter(o => o.id !== t.id).map(o => ({
            value: `${o.id}-${a}${b}`, label: dessin(o.id, a, b),
            why: `Ce dessin est ${o.dire(a, b)}, qui s'écrit ${o.ecrire(a, b)}.`
        }))
    ];
    // LA MÊME DEMI-DROITE PRISE À L'ENVERS, toujours. Face à une demi-droite,
    // c'est le piège du chapitre — l'origine est le premier point nommé ; face
    // à un segment ou à une droite, c'est la quatrième proposition, et elle
    // reste un dessin qu'il faut vraiment regarder.
    candidats.push({
        value: `demi-droite-${b}${a}`, label: dessin('demi-droite', b, a),
        why: `Cette demi-droite part de ${b} : elle s'écrit [${b}${a}).`
    });
    return {
        skill: 'geo.notation.lire',
        texte: `Quel dessin représente ${ecriture} ?`,
        html: `<div class="game-question">Quel dessin représente <b>${ecriture}</b> ?</div>`,
        papier: `Dessine ${ecriture}.`,
        bon: `${t.id}-${a}${b}`,
        choix: candidats,
        explication: `${ecriture} se lit « ${t.dire(a, b)} » : ${t.quoi}`,
        indices: [
            'Le crochet est un mur : le trait s\'arrête. La parenthèse le laisse continuer.',
            t.id === 'demi-droite'
                ? `Dans [${a}${b}), le premier point, ${a}, est l'ORIGINE : c'est là que le trait s'arrête.`
                : 'Compte de quel côté le trait dépasse des croix.'
        ]
    };
}

/** L'écriture est là : comment se lit-elle à voix haute ? */
function questionDire(rng, t, a, b) {
    const ecriture = t.ecrire(a, b);
    const choix = [
        { value: t.dire(a, b), label: t.dire(a, b), correct: true },
        ...TYPES.filter(o => o.id !== t.id).map(o => ({
            value: o.dire(a, b), label: o.dire(a, b),
            why: `${o.dire(a, b).charAt(0).toUpperCase() + o.dire(a, b).slice(1)} s'écrit ${o.ecrire(a, b)}.`
        }))
    ];
    // La demi-droite inverse complète toujours les quatre propositions, et
    // rappelle au passage que [AB) et [BA) ne se lisent pas pareil.
    choix.push({
        value: `la demi-droite [${b}${a})`, label: `la demi-droite [${b}${a})`,
        why: `Celle-là part de ${b} : le premier point nommé est l'ORIGINE.`
    });
    return {
        skill: 'geo.notation.dire',
        texte: `${ecriture}, ça se lit…`,
        html: `<div class="game-question"><b>${ecriture}</b>, ça se lit…</div>`,
        papier: `Écris en toutes lettres ce que désigne ${ecriture}.`,
        bon: t.dire(a, b),
        choix,
        explication: `${ecriture} se lit « ${t.dire(a, b)} » : ${t.quoi}`,
        indices: [
            'Deux crochets fermants : un segment. Deux parenthèses : une droite.',
            'Un crochet puis une parenthèse : une demi-droite, qui part du premier point nommé.'
        ]
    };
}

const SENS = ['ecrire', 'dessin', 'dire'];
const FABRIQUES = { ecrire: questionEcrire, dessin: questionDessin, dire: questionDire };

export const notationGenerator = {
    id: 'geo.notation',
    label: 'Segment, droite ou demi-droite',
    skills: ['geo.notation'],
    answerKinds: ['choice'],
    ecrit: true,
    params: [
        {
            id: 'objets', type: 'multiselect', label: 'Les objets proposés',
            aide: 'La demi-droite est la plus difficile des trois : elle seule a une ORIGINE, '
                + 'et [AB) ne désigne pas la même chose que [BA). On peut commencer par le '
                + 'segment et la droite, puis l\'ajouter.',
            options: [
                { value: 'segment', label: 'Le segment [AB]' },
                { value: 'droite', label: 'La droite (AB)' },
                { value: 'demi-droite', label: 'La demi-droite [AB)' }
            ],
            default: ['segment', 'droite', 'demi-droite']
        },
        {
            id: 'sens', type: 'multiselect', label: 'Ce qu\'on demande',
            aide: 'Savoir écrire ne donne pas savoir lire. Le sens « quel dessin ? » est celui '
                + 'qui oblige vraiment à interpréter les crochets ; les deux autres peuvent se '
                + 'jouer sur la reconnaissance d\'un mot.',
            options: [
                { value: 'ecrire', label: 'Le dessin est là : comment l\'écrire ?' },
                { value: 'dessin', label: 'L\'écriture est là : quel dessin ?' },
                { value: 'dire', label: 'L\'écriture est là : comment la lire ?' }
            ],
            default: SENS
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const objets = (Array.isArray(p.objets) && p.objets.length
            ? p.objets.filter(o => TYPES.some(t => t.id === o)) : TYPES.map(t => t.id));
        const sens = (Array.isArray(p.sens) && p.sens.length
            ? p.sens.filter(s => SENS.includes(s)) : SENS);
        const listeObjets = objets.length ? objets : TYPES.map(t => t.id);
        const listeSens = sens.length ? sens : SENS;

        // Les deux réglages TOURNENT, à des rythmes premiers entre eux : sur
        // neuf questions, les trois objets rencontrent les trois sens.
        const i = Number(ctx.index) || 0;
        const t = typeDe(listeObjets[i % listeObjets.length]);
        const quoi = listeSens[i % listeSens.length];
        const [a, b] = deuxLettres(rng);
        const q = FABRIQUES[quoi](rng, t, a, b);

        return makeItem({
            seed: rng.seed,
            generatorId: 'geo.notation',
            skillId: q.skill,
            answerKind: 'choice',
            prompt: { text: q.texte, html: q.html, papier: q.papier },
            answer: q.bon,
            choices: finalizeChoices(rng, q.choix.map(c => ({ correct: false, ...c })), { count: 4 }),
            hints: q.indices,
            explanation: q.explication,
            difficulty: t.id === 'demi-droite' ? 3 : 2,
            meta: { objet: t.id, sens: quoi, a, b, theme: `${t.id}-${quoi}` }
        });
    }
};
