// LE PENDU MATHÉMATIQUE — on cherche un mot, pas une suite de lettres.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 27 octobre : « J aimerai bien aussi un pendu mathématiques avec des
// mots mathématiques ».
//
// LA RÈGLE EST CONNUE DE TOUS, et c'est son plus grand avantage : il n'y a
// rien à expliquer à un élève. On ne la complique donc pas.
//
// ── CE QUI EN FAIT UN EXERCICE DE MATHÉMATIQUES ─────────────────────────────
//
// LA DÉFINITION. Sans elle, le pendu ne travaille que l'orthographe : on
// essaie E, puis A, puis S, et l'on gagne sans avoir pensé une seule fois aux
// mathématiques. Avec elle — « coupe un segment en son milieu,
// perpendiculairement » —, l'élève cherche un MOT qu'il connaît ou qu'il ne
// connaît pas, et les lettres ne servent qu'à confirmer.
//
// C'est la même idée que les Anagrammes du Vocabulaire, écrites en septembre :
// « la définition sert de filet — et c'est ELLE qu'on lit vraiment, puisque
// les lettres, on les a déjà. »
//
// ── LE LEXIQUE N'EST PAS RÉÉCRIT ICI ────────────────────────────────────────
//
// Cent treize mots avec leur définition, leur thème et leur niveau vivent déjà
// dans `motsCaches.js`, et trois exercices s'en servent — les Mots Cachés, les
// Anagrammes, le Mot Codé. Un deuxième vocabulaire qui dériverait du premier,
// ce serait deux endroits à corriger le jour où un mot est mal défini, et deux
// jugements différents sur le niveau d'un mot dans le même logiciel.
//
// ── CE QU'ON DESSINE QUAND ON SE TROMPE ─────────────────────────────────────
//
// « Pendu » dit une potence et un pendu. Dans un logiciel pour des élèves de
// onze ans, cela se discute — et c'est un choix de DESSIN, donc exactement ce
// sur quoi Rémy demande des propositions avant qu'on se lance. On en offre
// donc trois, on les lui montre, et c'est lui qui tranche lequel reste par
// défaut. Les trois comptent six erreurs : six est le nombre classique, et
// c'est assez pour qu'un mot long reste gagnable.

import { makeItem } from '../items.js';
import { motsDisponibles, THEMES } from '../motsCaches.js';

const SKILL = 'num.logique.pendu';

export { THEMES };

/** Six erreurs : le compte classique, et six traits se dessinent bien. */
export const ERREURS_MAX = 6;

export const DECORS = {
    bonhomme: 'Le bonhomme de neige qui fond',
    fusee: 'La mèche de la fusée',
    potence: 'La potence (le pendu classique)'
};

export const NIVEAUX = {
    1: 'Sixième — les mots de base',
    2: 'Cinquième et quatrième',
    3: 'Tout le vocabulaire, troisième comprise'
};

/**
 * LES LETTRES D'UN MOT, sans doublon et dans l'ordre d'apparition.
 *
 * Elles servent à savoir quand le mot est trouvé : toutes vues, c'est gagné.
 */
export function lettresDe(mot) {
    const out = [];
    for (const c of mot) if (!out.includes(c)) out.push(c);
    return out;
}

/**
 * CE QU'ON VOIT DU MOT, les lettres trouvées en place et le reste en tirets.
 *
 * UNE LETTRE TROUVÉE SE MONTRE PARTOUT À LA FOIS — c'est la règle du jeu, et
 * c'est elle qui rend les mots à lettres répétées plus faciles : il n'y a
 * aucune raison de la changer.
 */
export function motVu(mot, trouvees) {
    return [...mot].map(c => (trouvees.includes(c) ? c : '·')).join('');
}

export const penduGenerator = {
    id: 'logique.pendu',
    label: 'Le Pendu Mathématique',
    skills: [SKILL],
    answerKinds: ['grid'],
    params: [
        {
            id: 'theme', type: 'select', label: 'Le vocabulaire', default: 'tout',
            options: Object.entries(THEMES).map(([value, label]) => ({ value, label }))
        },
        {
            id: 'niveau', type: 'select', label: 'Les mots en jeu', default: '1',
            options: Object.entries(NIVEAUX).map(([value, label]) => ({ value, label }))
        },
        {
            id: 'indice', type: 'select', label: 'La définition', default: 'toujours',
            aide: 'Sans la définition, le pendu ne travaille que l\'orthographe : on essaie '
                + 'E, puis A, et l\'on gagne sans avoir pensé aux mathématiques.',
            options: [
                { value: 'toujours', label: 'Toujours affichée' },
                { value: 'apres', label: 'À partir de la deuxième erreur' },
                { value: 'jamais', label: 'Jamais — seulement les lettres' }
            ]
        },
        {
            id: 'decor', type: 'select', label: 'Le dessin des erreurs', default: 'bonhomme',
            options: Object.entries(DECORS).map(([value, label]) => ({ value, label }))
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const theme = THEMES[p.theme] ? p.theme : 'tout';
        const niveauMax = Number(p.niveau) >= 1 && Number(p.niveau) <= 3 ? Number(p.niveau) : 1;
        const decor = DECORS[p.decor] ? p.decor : 'bonhomme';
        const indice = ['toujours', 'apres', 'jamais'].includes(p.indice) ? p.indice : 'toujours';

        const dispo = motsDisponibles({ theme, niveauMax });
        // LE LEXIQUE NE SE VIDE JAMAIS — mais un thème étroit à un niveau bas
        // peut n'avoir que trois mots, et il vaut mieux le dire que servir un
        // écran vide. `motsDisponibles` rend au minimum le niveau 1 du thème,
        // et le filet remonte au vocabulaire entier.
        const liste = dispo.length ? dispo : motsDisponibles({ theme: 'tout', niveauMax: 3 });
        const choisi = liste[rng.int(0, liste.length - 1)];

        const mot = choisi.mot;
        const lettres = lettresDe(mot);

        const consigne = 'Trouve le mot en proposant des lettres. '
            + `${ERREURS_MAX} erreurs, et c'est perdu.`;

        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.pendu',
            skillId: SKILL,
            answerKind: 'grid',
            prompt: {
                text: consigne,
                papier: consigne,
                html: `<div class="game-question pd-consigne">${consigne}</div>`
            },
            // LA RÉPONSE EST LE MOT LUI-MÊME. L'activité l'envoie quand toutes
            // ses lettres sont sorties ; à la sixième erreur elle envoie ce
            // qu'on voyait encore, qui ne peut pas être le mot.
            answer: mot,
            hints: [
                indice === 'jamais'
                    ? `Le mot a ${mot.length} lettres et commence par ${mot[0]}.`
                    : 'Relis la définition : c\'est elle qui donne le mot, pas les lettres.',
                `Il y a ${lettres.filter(c => 'AEIOUY'.includes(c)).length} voyelles `
                    + 'différentes dans ce mot. Les voyelles coûtent peu et découpent le mot.',
                `Le mot commence par ${mot[0]} et finit par ${mot[mot.length - 1]}.`
            ],
            explanation: `${mot} — ${choisi.def}`,
            difficulty: choisi.niveau,
            meta: {
                mot, definition: choisi.def,
                theme: choisi.theme, niveau: choisi.niveau,
                lettres, erreursMax: ERREURS_MAX,
                decor, indice,
                titreCourt: 'Le Pendu',
                texteLecon: 'La définition donne le mot ; les lettres ne font que le confirmer.'
            }
        });
    }
};

export default penduGenerator;
