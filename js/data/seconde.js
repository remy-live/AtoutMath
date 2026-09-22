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
    },
    {
        id: 'sec-ensembles',
        cree: '2026-09-22',
        title: 'Le plus petit ensemble de nombres',
        consignePapier: 'Entoure le plus petit ensemble auquel le nombre appartient.',
        colonnesPapier: 2,
        generatorId: 'nb.ensembles', activityId: 'buttons',
        // LE PIÈGE N'EST PAS LA DÉFINITION, C'EST LE CALCUL. √64 n'est pas un
        // irrationnel : il vaut 8. −18/3 n'est pas une fraction : il vaut −6.
        // L'élève qui répond à la forme ÉCRITE au lieu de la VALEUR se trompe
        // presque à tous les coups — et c'est exactement ce que le manuel de
        // Rémy (exercices 45 à 47) cherche à déclencher.
        params: { portee: 'tous' },
        motsClefs: ['ensemble', 'entier', 'naturel', 'relatif', 'décimal', 'rationnel',
            'réel', 'irrationnel', 'racine', 'fraction', 'seconde', 'lycée'],
        tags: { chemin: [D, ENS], niveaux: [SECONDE] },
        instruction: "Calcule d'abord, classe ensuite. √64 n'est pas un irrationnel : "
            + "il vaut 8, c'est un entier. Le dessin des cadres emboîtés rappelle que "
            + "chaque ensemble contient le précédent."
    },
    {
        id: 'sec-union-inter',
        cree: '2026-09-22',
        title: 'Union et intersection d\'intervalles',
        consignePapier: 'Écris l\'ensemble demandé.',
        colonnesPapier: 1,
        generatorId: 'nb.intervalles.ensemblistes', activityId: 'buttons',
        params: { operation: 'toutes', cas: 'tous' },
        motsClefs: ['union', 'intersection', 'intervalle', 'réunion', 'commun',
            'vide', 'crochet', 'seconde', 'lycée'],
        tags: { chemin: [D, ENS], niveaux: [SECONDE] },
        instruction: "Deux intervalles dessinés l'un sous l'autre, sur la même "
            + "graduation. ∩ garde ce qui est dans les DEUX, ∪ ce qui est dans l'un OU "
            + "l'autre. Regarde où les deux traits se superposent."
    },
    {
        id: 'sec-union-inter-vide',
        cree: '2026-09-22',
        title: 'Quand l\'intersection est vide',
        consignePapier: 'Écris l\'ensemble demandé.',
        colonnesPapier: 1,
        generatorId: 'nb.intervalles.ensemblistes', activityId: 'buttons',
        // LES DEUX CAS QU'ON NE VOIT JAMAIS VENIR, isolés pour être travaillés.
        // Mélangés aux autres ils sortent une fois sur cinq, et l'élève n'a
        // jamais l'occasion d'y réfléchir deux fois de suite : il répond « il
        // n'y a pas de réponse » ou bouche le trou, et passe à la suivante.
        params: { operation: 'toutes', cas: 'separes' },
        motsClefs: ['vide', 'ensemble vide', 'union', 'intersection', 'disjoint',
            'intervalle', 'seconde'],
        tags: { chemin: [D, ENS], niveaux: [SECONDE] },
        instruction: "Deux intervalles qui ne se croisent pas, ou qui se touchent "
            + "juste. L'intersection peut être VIDE — cela s'écrit ∅ — et l'union peut "
            + "rester en deux morceaux : on ne bouche pas le trou."
    }
];
