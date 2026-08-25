// LE NOM DE LA RELATION — l'exercice 8 de la fiche de Rémy.
//
// « Classe les angles. Le tableau est en dessous. » Douze figures, deux angles
// colorés dans chacune, et six cases où les ranger : adjacents, opposés par le
// sommet, correspondants, alternes-internes, complémentaires, supplémentaires.
//
// C'EST L'AUTRE MOITIÉ DU CHAPITRE, et la première dans l'ordre : « La Valeur
// Manquante » demande de calculer une mesure à partir d'une relation, celui-ci
// demande de RECONNAÎTRE la relation. Un élève qui ne sait pas nommer ne peut
// pas calculer — c'est là que le chapitre se joue, et c'est là qu'il se perd.
//
// RIEN À MESURER, DONC AUCUNE MESURE ÉCRITE. Les deux angles portent un numéro,
// 1 et 2, pas une valeur : la réponse est entièrement dans leur POSITION l'un
// par rapport à l'autre. Le numéro plutôt que la couleur, parce qu'un numéro
// survit à une photocopie en noir et blanc — et parce qu'un chiffre ordinaire
// s'imprime partout, là où un « ① » dépend de la police.

import { makeItem, finalizeChoices } from '../items.js';
import {
    figureSecantes, figurePartage, figureParalleles, pencheEtale
} from '../anglesRemarquables.js';
import { figureAnglesSvg } from '../anglesRemarquablesSvg.js';
import { figure as encadrer } from '../figures.js';

/**
 * LES SIX NOMS, chacun avec sa figure et sa définition.
 *
 * `pourquoi` est la phrase du cours : c'est elle qui sert d'explication, et
 * c'est elle qu'on relit quand on s'est trompé. `contre` est ce qu'on répond à
 * l'élève qui a choisi ce nom-là par erreur — la petite différence qui compte.
 */
export const NOMS_ANGLES = [
    {
        id: 'adjacents', nom: 'adjacents',
        pourquoi: 'ils ont le même sommet, un côté commun, et ils sont de part et '
            + 'd\'autre de ce côté',
        contre: 'Deux angles adjacents partagent un sommet ET un côté — mais leur somme '
            + 'ne fait ici ni 90°, ni 180°, sinon ils auraient un nom plus précis.',
        // Ni 90° ni 180° ni 360° : sinon ils mériteraient un nom plus précis.
        figure: (rng) => {
            const ouverture = rng.pick([65, 70, 75, 80, 100, 110, 120, 130, 140, 150, 160]);
            const angle = rng.int(25, ouverture - 25);
            return (penche) => figurePartage({ ouverture, angle, penche });
        }
    },
    {
        id: 'opposes', nom: 'opposés par le sommet',
        pourquoi: 'ils ont le même sommet, et les côtés de l\'un sont dans le '
            + 'PROLONGEMENT des côtés de l\'autre',
        contre: 'Opposés par le sommet, deux angles se touchent seulement par la pointe : '
            + 'ils n\'ont aucun côté commun.',
        figure: (rng) => {
            const angle = rng.int(25, 75) + (rng.bool() ? 0 : 90);
            return (penche) => figureSecantes({ angle, penche });
        }
    },
    {
        id: 'correspondants', nom: 'correspondants',
        pourquoi: 'la sécante coupe deux parallèles, et ces deux angles occupent la '
            + 'MÊME position aux deux croisements — du même côté de la sécante',
        contre: 'Correspondants, deux angles occupent le même coin aux deux croisements : '
            + 'ils sont du MÊME côté de la sécante.',
        figure: (rng) => {
            const angle = rng.int(30, 75);
            return (penche) => figureParalleles({ angle, penche, relation: 'correspondants' });
        }
    },
    {
        id: 'alternes', nom: 'alternes-internes',
        pourquoi: 'la sécante coupe deux parallèles, et ces deux angles sont de PART ET '
            + 'D\'AUTRE de la sécante, tous les deux entre les parallèles',
        contre: 'Alternes-internes, deux angles sont de part et d\'autre de la sécante et '
            + 'tous les deux ENTRE les parallèles.',
        figure: (rng) => {
            const angle = rng.int(30, 75);
            return (penche) => figureParalleles({ angle, penche, relation: 'alternes' });
        }
    },
    {
        id: 'complementaires', nom: 'complémentaires',
        pourquoi: 'ensemble ils forment un angle DROIT : leur somme fait 90°',
        contre: 'Complémentaires, deux angles font 90° à eux deux : il faut voir le petit '
            + 'carré de l\'angle droit.',
        figure: (rng) => {
            const angle = rng.int(20, 70);
            return (penche) => figurePartage({ ouverture: 90, angle, penche });
        }
    },
    {
        id: 'supplementaires', nom: 'supplémentaires',
        pourquoi: 'ensemble ils forment un angle PLAT : leur somme fait 180°',
        contre: 'Supplémentaires, deux angles font 180° à eux deux : leurs côtés extérieurs '
            + 'forment une droite.',
        figure: (rng) => {
            const angle = rng.int(25, 155);
            return (penche) => figurePartage({ ouverture: 180, angle, penche });
        }
    }
];

const nomDe = (id) => NOMS_ANGLES.find(n => n.id === id);

export const anglesNommerGenerator = {
    id: 'geo.angles-nommer',
    label: 'Le nom des angles — classe les relations',
    skills: ['geo.angles.relations'],
    answerKinds: ['choice'],
    ecrit: true,
    params: [
        {
            id: 'familles', type: 'multiselect', label: 'Les relations travaillées',
            aide: 'Les trois premières se lisent sur UN croisement, les deux suivantes '
                + 'demandent de repérer les parallèles, et « complémentaires » et '
                + '« supplémentaires » se reconnaissent à l\'angle droit ou plat. Une '
                + 'série qui ne mélange pas les deux moitiés ne trie rien.',
            options: NOMS_ANGLES.map(n => ({ value: n.id, label: n.nom })),
            default: NOMS_ANGLES.map(n => n.id)
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const choisis = (Array.isArray(p.familles) && p.familles.length
            ? p.familles.filter(id => nomDe(id)) : NOMS_ANGLES.map(n => n.id));
        const liste = (choisis.length ? choisis : NOMS_ANGLES.map(n => n.id)).map(nomDe);
        // ON PARCOURT LA LISTE PLUTÔT QUE DE TIRER : sur une fiche de douze
        // figures, un tirage laisse presque toujours une relation de côté et en
        // donne trois fois une autre. Le tableau du bas serait à moitié vide.
        const i = Number(ctx.index) || 0;
        return itemNommer(rng, liste[i % liste.length], liste);
    }
};

function itemNommer(rng, n, liste) {
    const figure = pencheEtale(n.figure(rng), rng.int(0, 359));
    // Les deux angles portent leur numéro, et rien d'autre : c'est la position
    // qu'on lit, pas la mesure.
    figure.arcs[0].pas = 1;
    figure.arcs[1].pas = 2;
    const enonce = 'Comment s\'appellent les angles 1 et 2 ?';
    // LES LEURRES SONT LES AUTRES NOMS DU TABLEAU, pas des mots inventés :
    // c'est entre eux que l'élève hésite, et chacun dit pourquoi ce n'est pas
    // lui. On les prend dans TOUTE la liste du chapitre, même si la série ne
    // travaille qu'une relation — sinon la bonne réponse serait la seule.
    const autres = NOMS_ANGLES.filter(a => a.id !== n.id)
        .map(a => ({ value: a.nom, label: a.nom, why: a.contre }));
    return makeItem({
        seed: rng.seed,
        generatorId: 'geo.angles-nommer',
        skillId: 'geo.angles.relations',
        answerKind: 'choice',
        prompt: {
            text: enonce,
            papier: enonce,
            html: `<div class="game-question">${enonce}</div>`
                + encadrer(figureAnglesSvg(figure, { mesures: 'aucune' }))
        },
        answer: n.nom,
        // LES SIX NOMS, TOUJOURS — c'est le tableau de la fiche. Combien
        // l'élève en voit vraiment est l'affaire du réglage « L'aide » de
        // l'activité, qui monte de deux à quatre au fil de la série ; ce
        // n'était pas au générateur de le décider une seconde fois.
        choices: finalizeChoices(rng, [
            { value: n.nom, label: n.nom, correct: true },
            ...autres
        ], { count: NOMS_ANGLES.length }),
        hints: [
            'Commence par le sommet : les deux angles ont-ils le MÊME sommet, ou deux '
                + 'sommets différents ?',
            'Deux sommets différents, c\'est une sécante qui coupe deux parallèles : '
                + 'regarde de quel côté de la sécante ils sont. Un seul sommet : regarde '
                + 's\'ils ont un côté commun, et ce que fait leur somme.',
            `Ces deux angles sont ${n.nom}.`
        ],
        explanation: `Ces deux angles sont ${n.nom} : ${n.pourquoi}.`,
        // Reconnaître se travaille avant de calculer : ces figures ouvrent le
        // chapitre, elles ne le concluent pas.
        difficulty: liste.length > 3 ? 2 : 1,
        meta: {
            famille: n.id, relation: n.id, nom: n.nom, figure,
            theme: `nommer-${n.id}`
        }
    });
}
