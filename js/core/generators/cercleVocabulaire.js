// LE VOCABULAIRE DU CERCLE.
//
// Rémy : « j'aimerai bien un exercice sur le vocabulaire du cercle ».
//
// NEUF MOTS, ET HUIT CONFUSIONS. Ce chapitre ne se rate pas par manque de
// mémoire, il se rate par voisinage : le diamètre EST une corde (celle qui
// passe par le centre), l'arc et la corde joignent les deux mêmes points mais
// l'un est courbe et l'autre droit, la tangente et la sécante sont deux droites
// qui ne diffèrent que par le nombre de points de contact — et par-dessus tout,
// le CERCLE est une ligne quand le DISQUE est une surface. Chaque mot porte
// donc, en plus de sa définition, ce qu'on répond à l'élève qui l'a choisi par
// erreur : c'est cette phrase-là qui enseigne, pas la bonne réponse.
//
// DEUX SENS DE QUESTION, et ils ne travaillent pas la même chose :
//   · NOMMER — on surligne un trait, l'élève dit son nom. Il faut connaître les
//     mots et savoir lire une figure.
//   · TROUVER — plusieurs traits numérotés, l'élève désigne celui qui porte le
//     nom demandé. Il faut DISCRIMINER : c'est là que se joue « corde ou
//     diamètre ? », parce que les deux sont sous les yeux en même temps.

import { makeItem, finalizeChoices } from '../items.js';
import { tracesDe, cercleSvg } from '../cercleFigure.js';
import { figure as encadrer } from '../figures.js';

/**
 * LE VOCABULAIRE. `pourquoi` est la phrase du cours — celle qu'on relit après
 * s'être trompé. `contre` est ce qu'on répond à l'élève qui a choisi ce mot-là
 * par erreur : la petite différence qui compte.
 *
 * `avance` marque les mots de quatrième : tangente et sécante n'ont rien à
 * faire dans une série de sixième, où l'on veut d'abord séparer rayon,
 * diamètre, corde et arc.
 */
export const MOTS_CERCLE = [
    {
        id: 'centre', nom: 'le centre',
        pourquoi: 'c\'est le point qui est à la même distance de TOUS les points du cercle',
        contre: 'Le centre est un POINT, pas un trait.',
        tirer: () => ({ type: 'centre' })
    },
    {
        id: 'rayon', nom: 'un rayon',
        pourquoi: 'il va du CENTRE à un point du cercle',
        contre: 'Un rayon part du centre et s\'arrête sur le cercle : il ne traverse pas, '
            + 'et il ne joint pas deux points du cercle.',
        tirer: (rng) => ({ type: 'rayon', a: rng.int(0, 359) })
    },
    {
        id: 'diametre', nom: 'un diamètre',
        pourquoi: 'il joint deux points du cercle EN PASSANT PAR LE CENTRE — c\'est la '
            + 'plus longue des cordes, et elle vaut deux rayons',
        contre: 'Un diamètre passe par le CENTRE. Regarde si le trait le traverse vraiment.',
        tirer: (rng) => ({ type: 'diametre', a: rng.int(0, 179) })
    },
    {
        id: 'corde', nom: 'une corde',
        pourquoi: 'elle joint deux points DU CERCLE, en ligne droite',
        contre: 'Une corde joint deux points du cercle — mais un rayon, lui, a une '
            + 'extrémité au centre, et le centre n\'est pas sur le cercle.',
        tirer: (rng) => {
            const a = rng.int(0, 359);
            // Jamais 180° d'écart : ce serait un diamètre, et l'énoncé mentirait.
            return { type: 'corde', a, b: a + rng.pick([60, 80, 100, 120, 240, 260, 280, 300]) };
        }
    },
    {
        id: 'arc', nom: 'un arc de cercle',
        pourquoi: 'c\'est un MORCEAU DU CERCLE lui-même, entre deux de ses points — donc '
            + 'une ligne courbe',
        contre: 'Un arc est COURBE : il suit le cercle. Une corde, elle, coupe tout droit.',
        tirer: (rng) => {
            const a = rng.int(0, 359);
            return { type: 'arc', a, b: a + rng.pick([50, 70, 90, 110, 130]) };
        }
    },
    {
        id: 'cercle', nom: 'le cercle',
        pourquoi: 'le cercle est la LIGNE, le bord — la surface à l\'intérieur porte un '
            + 'autre nom',
        contre: 'Le cercle est la ligne, pas la surface. Ce qui est plein à l\'intérieur, '
            + 'c\'est le disque.',
        tirer: () => ({ type: 'cercle' })
    },
    {
        id: 'disque', nom: 'le disque',
        pourquoi: 'le disque est la SURFACE pleine, bord compris — sa bordure seule '
            + 's\'appelle le cercle',
        contre: 'Le disque est la surface pleine. Sa bordure seule, c\'est le cercle.',
        tirer: () => ({ type: 'disque' })
    },
    {
        id: 'tangente', nom: 'une tangente', avance: true,
        pourquoi: 'elle touche le cercle en UN SEUL point, et elle y est perpendiculaire '
            + 'au rayon',
        contre: 'Une tangente ne touche le cercle qu\'en UN point. Compte les points de '
            + 'rencontre : s\'il y en a deux, ce n\'est pas elle.',
        tirer: (rng) => ({ type: 'tangente', a: rng.int(0, 359) })
    },
    {
        id: 'secante', nom: 'une sécante', avance: true,
        pourquoi: 'elle COUPE le cercle, donc elle le rencontre en DEUX points',
        contre: 'Une sécante coupe le cercle en deux points. Une droite qui n\'en touche '
            + 'qu\'un s\'appelle autrement.',
        tirer: (rng) => {
            const a = rng.int(0, 359);
            return { type: 'secante', a, b: a + rng.pick([70, 90, 110, 130, 230, 250, 270]) };
        }
    }
];

const motDe = (id) => MOTS_CERCLE.find(m => m.id === id) || null;

/** Les mots qui ne se dessinent pas comme un trait : on ne les numérote pas. */
const GLOBAUX = new Set(['centre', 'cercle', 'disque']);

export const cercleVocabulaireGenerator = {
    id: 'geo.cercle-vocabulaire',
    label: 'Le vocabulaire du cercle',
    skills: ['geo.cercle.vocabulaire'],
    answerKinds: ['choice'],
    params: [
        {
            id: 'mots', type: 'multiselect', label: 'Les mots travaillés',
            aide: 'Rayon, diamètre, corde et arc suffisent en sixième — et c\'est déjà là '
                + 'que tout se joue, parce qu\'un diamètre EST une corde. Tangente et '
                + 'sécante arrivent en quatrième. Le couple cercle / disque, lui, se '
                + 'travaille à part : c\'est une ligne contre une surface.',
            options: MOTS_CERCLE.map(m => ({ value: m.id, label: m.nom })),
            default: MOTS_CERCLE.filter(m => !m.avance).map(m => m.id)
        },
        {
            id: 'sens', type: 'select', label: 'La question', default: 'les-deux',
            aide: 'NOMMER demande de connaître les mots ; TROUVER demande de les '
                + 'DISCRIMINER, parce que la corde et le diamètre sont alors sous les '
                + 'yeux en même temps. Les deux ensemble font le chapitre.',
            options: [
                { value: 'nommer', label: 'Nommer le trait surligné' },
                { value: 'trouver', label: 'Trouver le trait demandé' },
                { value: 'les-deux', label: 'Les deux, en alternance' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const choisis = (Array.isArray(p.mots) && p.mots.length ? p.mots.filter(motDe) : null)
            || MOTS_CERCLE.filter(m => !m.avance).map(m => m.id);
        const liste = choisis.map(motDe);
        // ON PARCOURT LA LISTE PLUTÔT QUE DE TIRER : sur une série de huit
        // questions, un tirage laisse presque toujours un mot de côté et en
        // donne trois fois un autre.
        const i = Number(ctx.index) || 0;
        const mot = liste[i % liste.length];
        const sens = p.sens === 'nommer' || p.sens === 'trouver' ? p.sens
            : (i % 2 === 0 ? 'nommer' : 'trouver');
        // « Trouver » suppose plusieurs traits sous les yeux : cela n'a pas de
        // sens pour le centre, le cercle ou le disque, qui sont la figure
        // entière. Ces mots-là se nomment.
        return (sens === 'trouver' && !GLOBAUX.has(mot.id))
            ? itemTrouver(rng, mot, liste)
            : itemNommer(rng, mot, liste);
    }
};

/** On surligne un trait, l'élève le nomme. */
function itemNommer(rng, mot, liste) {
    const spec = { elements: [mot.tirer(rng)], surligne: 0 };
    // Un décor : deux ou trois traits gris, pour que la figure ressemble à
    // celle du cours et non à un schéma isolé. Ils ne sont jamais surlignés.
    for (const d of decor(rng, mot, liste, 2)) spec.elements.push(d);
    // « LE PLUS PRÉCIS », et ce n'est pas une formule de politesse : un diamètre
    // EST une corde, donc « une corde » n'est pas faux devant un diamètre —
    // c'est seulement moins précis. Sans ce mot dans la question, l'exercice
    // serait injuste, et l'élève aurait raison de protester.
    const enonce = mot.id === 'disque'
        ? 'Comment s\'appelle la partie coloriée ?'
        : (mot.id === 'centre' ? 'Comment s\'appelle le point rouge ?'
            : 'Comment s\'appelle, le plus précisément possible, ce qui est tracé en rouge ?');
    const autres = MOTS_CERCLE.filter(m => m.id !== mot.id)
        .map(m => ({ value: m.nom, label: m.nom, why: contreDe(m, mot) }));
    return makeItem({
        seed: rng.seed,
        generatorId: 'geo.cercle-vocabulaire',
        skillId: 'geo.cercle.vocabulaire',
        answerKind: 'choice',
        prompt: {
            text: enonce,
            papier: enonce,
            html: `<div class="game-question">${enonce}</div>`
                + encadrer(cercleSvg(tracesDe(spec), { taille: 260 }))
        },
        answer: mot.nom,
        choices: finalizeChoices(rng, [
            { value: mot.nom, label: mot.nom, correct: true }, ...autres
        ], { count: Math.min(5, MOTS_CERCLE.length) }),
        hints: [
            'Regarde d\'abord OÙ commence et où finit le tracé : au centre ? sur le cercle ? '
                + 'des deux côtés du cercle ?',
            'Puis regarde s\'il est DROIT ou COURBE — c\'est ce qui sépare la corde de l\'arc.',
            `C'est ${mot.nom}.`
        ],
        explanation: `C'est ${mot.nom} : ${mot.pourquoi}.`,
        difficulty: mot.avance ? 3 : 2,
        // `reponse` voyage pour la FEUILLE DE SOLUTIONS : elle n'a pas accès
        // aux propositions, seulement à `meta`.
        meta: { mot: mot.id, sens: 'nommer', spec, reponse: mot.nom, theme: `cercle-${mot.id}` }
    });
}

/** Plusieurs traits numérotés, l'élève désigne celui qu'on nomme. */
function itemTrouver(rng, mot, liste) {
    // LES LEURRES SONT LES VOISINS, pas des traits au hasard : on met la corde
    // à côté du diamètre, l'arc à côté de la corde. C'est entre eux que l'élève
    // hésite, et une figure qui ne présente pas la confusion ne l'enseigne pas.
    // Les voisins RESTREINTS À LA SÉRIE : une tangente au milieu d'une série de
    // sixième est un objet que l'élève ne sait pas nommer, et qu'on ne lui a
    // pas demandé de savoir nommer.
    const permis = new Set(liste.map(m => m.id));
    const voisins = (VOISINS[mot.id] || MOTS_CERCLE.filter(m => m.id !== mot.id).map(m => m.id))
        .filter(id => permis.has(id) && !GLOBAUX.has(id));
    // ET JAMAIS UN DIAMÈTRE FACE À UNE CORDE. Un diamètre EST une corde : la
    // question « lequel est une corde ? » aurait alors deux bonnes réponses, et
    // l'élève qui désigne le diamètre aurait raison. Trois tracés au lieu de
    // quatre valent mieux qu'une question fausse.
    const compagnons = rng.shuffle(voisins.map(motDe).filter(Boolean)
        .filter(m => !(mot.id === 'corde' && m.id === 'diametre'))).slice(0, 3);
    const tous = rng.shuffle([mot, ...compagnons]);
    const spec = { elements: tous.map(m => m.tirer(rng)), numerote: true };
    const bon = tous.indexOf(mot) + 1;
    const enonce = `Sur cette figure, lequel de ces tracés est ${mot.nom} ?`;
    const autres = tous.map((m, i) => ({ index: i + 1, m }))
        .filter(o => o.m.id !== mot.id)
        .map(o => ({
            value: String(o.index), label: `Le tracé ${o.index}`,
            why: `Le tracé ${o.index}, c'est ${o.m.nom} : ${o.m.pourquoi}.`
        }));
    return makeItem({
        seed: rng.seed,
        generatorId: 'geo.cercle-vocabulaire',
        skillId: 'geo.cercle.vocabulaire',
        answerKind: 'choice',
        prompt: {
            text: enonce,
            papier: enonce,
            html: `<div class="game-question">${enonce}</div>`
                + encadrer(cercleSvg(tracesDe(spec), { taille: 260 }))
        },
        answer: String(bon),
        choices: finalizeChoices(rng, [
            { value: String(bon), label: `Le tracé ${bon}`, correct: true }, ...autres
        ], { count: tous.length }),
        hints: [
            `${mot.nom.charAt(0).toUpperCase()}${mot.nom.slice(1)} : ${mot.pourquoi}.`,
            'Élimine d\'abord ceux qui ne partent pas du bon endroit, puis regarde droit ou courbe.',
            `C'est le tracé ${bon}.`
        ],
        explanation: `Le tracé ${bon} est ${mot.nom} : ${mot.pourquoi}.`,
        difficulty: mot.avance ? 3 : 2,
        meta: { mot: mot.id, sens: 'trouver', spec, bon, reponse: mot.nom, theme: `cercle-trouver-${mot.id}` }
    });
}

/**
 * CE QU'ON RÉPOND À QUI A CHOISI CE MOT-LÀ — et le cas du diamètre est à part.
 *
 * « Une corde » devant un diamètre n'est PAS une erreur de vocabulaire : c'est
 * une réponse vraie mais imprécise. Lui répondre « une corde joint deux points
 * du cercle » serait absurde, puisque c'est exactement ce que fait le trait
 * qu'il regarde. On lui dit donc la vérité : il a raison, et il existe plus
 * précis.
 */
function contreDe(propose, bonne) {
    if (propose.id === 'corde' && bonne.id === 'diametre') {
        return 'Tu as raison, un diamètre EST une corde — mais c\'est la corde '
            + 'particulière qui passe par le centre, et celle-là porte un nom à elle : '
            + 'le diamètre. On donne toujours le nom le plus précis.';
    }
    if (propose.id === 'arc' && bonne.id === 'cercle') {
        return 'Un arc n\'est qu\'un MORCEAU du cercle. Ici c\'est la ligne entière.';
    }
    return propose.contre;
}

/** Qui se confond avec qui — c'est la carte des erreurs du chapitre. */
const VOISINS = {
    rayon: ['diametre', 'corde', 'arc'],
    diametre: ['corde', 'rayon', 'arc'],
    corde: ['diametre', 'rayon', 'arc'],
    arc: ['corde', 'diametre', 'rayon'],
    tangente: ['secante', 'corde', 'rayon'],
    secante: ['tangente', 'corde', 'diametre']
};

/**
 * Des traits gris qui meublent la figure, sans jamais imiter le surligné.
 *
 * ET PRIS DANS LA SÉRIE SEULEMENT. Le décor puisait dans tout le vocabulaire :
 * une série de sixième affichait des tangentes, c'est-à-dire un objet que
 * l'élève ne sait pas nommer et qu'on ne lui a pas demandé d'apprendre. Vu à
 * l'écran, corrigé.
 */
function decor(rng, mot, liste, combien) {
    const permis = new Set(liste.map(m => m.id));
    const possibles = MOTS_CERCLE.filter(m => permis.has(m.id) && !GLOBAUX.has(m.id) && m.id !== mot.id
        // Un décor qui porte le MÊME nom que la réponse rendrait l'énoncé faux :
        // « ce qui est tracé en rouge » n'aurait plus de réponse unique.
        && !(mot.id === 'corde' && m.id === 'diametre'));
    return rng.shuffle(possibles).slice(0, combien).map(m => m.tirer(rng));
}
