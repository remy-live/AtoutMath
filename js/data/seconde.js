import { TAGS } from './tags.js';

// Chapitre « Ensembles et intervalles » — le premier de Seconde.
//
// Rémy : « on va faire des exercices de seconde. Premier type : placer des
// nombres dans le bon ensemble de nombres et aussi sur les intervalles, sur un
// axe, avec inégalité, union et intersection, il faut toujours un support
// visuel. » Puis : « il faut faire toutes les possibilités et aussi savoir
// écrire avec les signes inférieurs ou égal et le bon côté du crochet. »
//
// TROIS ENTRÉES POUR UN SEUL GÉNÉRATEUR, et c'est la façon de faire de la
// maison : les mêmes questions, réglées différemment. « Toutes les
// traductions » est celle qu'on donne en classe — c'est le mélange qui fait
// comprendre que l'inégalité, le dessin et l'intervalle sont trois écritures
// d'une même chose. Les deux autres existent pour le jour où l'on veut ne
// travailler qu'un geste : celui qui lit l'axe sans hésiter écrit encore
// ]2 ; 5[ pour [2 ; 5[.

const D = TAGS.DOMAINE.NUMERIQUE;
const ENS = TAGS.SOUS_DOMAINE.ENSEMBLES;
const SECONDE = TAGS.NIVEAU.SECONDE;

export const secondeExercises = [
    {
        id: 'sec-intervalles',
        cree: '2026-09-22',
        title: 'Intervalles : les trois écritures',
        consignePapier: 'Entoure la bonne réponse.',
        colonnesPapier: 1,
        generatorId: 'nb.intervalles', activityId: 'buttons',
        params: { sens: 'toutes', forme: 'les-deux' },
        motsClefs: ['intervalle', 'crochet', 'inégalité', 'droite graduée', 'axe',
            'borne', 'infini', 'inclus', 'exclu', 'seconde', 'lycée'],
        tags: { chemin: [D, ENS], niveaux: [SECONDE] },
        instruction: "Un même ensemble de nombres s'écrit de trois façons : une inégalité, "
            + "un dessin sur la droite graduée, un intervalle. On te montre l'une, tu "
            + "reconnais l'autre — dans les six sens."
    },
    {
        id: 'sec-intervalles-ecrire',
        cree: '2026-09-22',
        title: 'Le bon côté du crochet',
        consignePapier: 'Écris l\'intervalle correspondant.',
        colonnesPapier: 1,
        generatorId: 'nb.intervalles', activityId: 'buttons',
        // C'est la demande précise de Rémy : « savoir écrire […] le bon côté du
        // crochet ». On ne demande QUE l'écriture, et les leurres sont les
        // quatre fautes de crochet — c'est l'exercice de remédiation.
        params: { sens: 'intervalle', forme: 'les-deux' },
        motsClefs: ['crochet', 'intervalle', 'inclus', 'exclu', 'borne', 'seconde'],
        tags: { chemin: [D, ENS], niveaux: [SECONDE] },
        instruction: "Écris l'intervalle. Le crochet TOURNÉ VERS L'INTÉRIEUR prend la "
            + "borne ; tourné vers l'extérieur, il la laisse dehors." 
    },
    {
        id: 'sec-intervalles-demi',
        cree: '2026-09-22',
        title: 'Demi-droites et infini',
        consignePapier: 'Entoure la bonne réponse.',
        colonnesPapier: 1,
        generatorId: 'nb.intervalles', activityId: 'buttons',
        // LES DEMI-DROITES SEULES, parce que la faute qu'on y fait n'est pas la
        // même : ce n'est plus « quel crochet pour 5 ? », c'est « le crochet de
        // l'infini ». Mélangée aux intervalles bornés, elle passe une fois sur
        // trois et ne se travaille jamais.
        params: { sens: 'toutes', forme: 'demi' },
        motsClefs: ['infini', 'demi-droite', 'intervalle', 'crochet', 'seconde'],
        tags: { chemin: [D, ENS], niveaux: [SECONDE] },
        instruction: "Les demi-droites, celles qui vont jusqu'à l'infini. Le crochet de "
            + "l'infini est toujours ouvert : on ne l'atteint jamais." 
    }
];
