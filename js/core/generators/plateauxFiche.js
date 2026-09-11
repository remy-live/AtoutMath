// LES PLATEAUX À JOUER SUR PAPIER — puissance 4, sim et pipopipette.
//
// Rémy, en revue : « on pourrait avoir un pdf de grille vide » (puissance 4),
// « on pourrait avoir un pdf de jeu vide » (sim), « on pourrait faire le pdf »
// (la pipopipette).
//
// Ce ne sont pas des exercices à corriger : ce sont des SUPPORTS. On imprime,
// on distribue, deux élèves jouent au crayon. Le générateur ne tire donc rien
// au sort — il n'y a rien à tirer — et la « réponse » n'existe pas. Ce qu'il
// produit, c'est le nombre de plateaux par page et leurs dimensions.
//
// POURQUOI CES DEUX JEUX MÉRITENT DU PAPIER, et pas les autres. Le puissance 4
// et le sim se jouent À DEUX, sans matériel, avec deux couleurs de crayon —
// c'est exactement ce qu'on donne en fin d'heure ou à emporter. Les échecs
// aussi, et ils ont déjà leur fiche. Un sudoku, lui, se joue seul et se
// corrige : ce n'est pas le même objet.
//
// LE SIM SE JOUE AU CRAYON DE COULEUR, et la feuille le dit : sans les deux
// couleurs, on ne distingue plus qui a tracé quoi, et le jeu n'a plus de sens.
//
// ET LA PIPOPIPETTE EST NÉE SUR LE PAPIER. Édouard Lucas l'a publiée en 1889
// sous ce nom, et depuis on y joue au dos des cahiers : une grille de points,
// deux crayons. C'est le seul des trois dont la version écran soit la copie,
// et non l'inverse — la feuille lui rend son support d'origine.

import { makeItem } from '../items.js';

const NOMS = {
    puissance4: 'Grille de puissance 4',
    sim: 'Plateau du Sim',
    pipopipette: 'Grille de pipopipette'
};

export const plateauxPapierGenerator = {
    id: 'jeux.plateaux-fiche',
    label: 'Plateaux de jeux à imprimer',
    skills: [],
    answerKinds: ['grid'],
    // Rien à écrire tel quel dans une liste de questions : c'est un plateau,
    // pas un énoncé. Le drapeau `ecrit` reste donc faux ; c'est `printable` sur
    // le descripteur qui donne la fiche.
    params: [
        {
            id: 'jeu', type: 'select', label: 'Le jeu', default: 'puissance4',
            options: [
                { value: 'puissance4', label: 'Puissance 4' },
                { value: 'sim', label: 'Le Sim' },
                { value: 'pipopipette', label: 'La pipopipette' }
            ]
        },
        {
            id: 'colonnes', type: 'number', label: 'Colonnes', default: 7, min: 3, max: 10,
            aide: 'Puissance 4 : sept colonnes et six rangées, le plateau du commerce. '
                + 'Pipopipette : le nombre de CARRÉS, cinq sur quatre par défaut — il y a '
                + 'toujours un point de plus que de carrés dans chaque sens. Sans effet sur le sim, '
                + 'dont l\'hexagone est le jeu.'
        },
        {
            id: 'rangees', type: 'number', label: 'Rangées', default: 6, min: 3, max: 8
        }
    ],

    generate(params) {
        const p = params || {};
        const jeu = NOMS[p.jeu] ? p.jeu : 'puissance4';
        // LA PIPOPIPETTE COMPTE EN CARRÉS, pas en points : cinq colonnes de
        // carrés font six colonnes de points. C'est la mesure du jeu — « une
        // grille de 5 sur 4 » —, et c'est celle du noyau (voir `TAILLES`).
        const cols = jeu === 'pipopipette'
            ? Math.max(3, Math.min(10, Number(p.colonnes) || 5))
            : Math.max(5, Math.min(10, Number(p.colonnes) || 7));
        const rows = jeu === 'pipopipette'
            ? Math.max(3, Math.min(8, Number(p.rangees) || 4))
            : Math.max(4, Math.min(8, Number(p.rangees) || 6));
        const REGLES = {
            puissance4: 'Chacun son tour, on choisit une COLONNE et l\'on marque la case libre la plus '
                + 'basse. Le premier qui aligne quatre jetons de sa couleur — en ligne, en '
                + 'colonne ou en diagonale — a gagné.',
            sim: 'Chacun son tour, on colorie un segment entre deux points, de SA couleur. '
                + 'Celui qui forme le premier un triangle entièrement de sa propre couleur '
                + 'A PERDU. Sur quinze segments de deux couleurs, un tel triangle est '
                + 'inévitable : le match nul est impossible, c\'est un théorème.',
            pipopipette: 'Chacun son tour, on trace UN trait entre deux points VOISINS — '
                + 'jamais en diagonale. Celui qui ferme un carré écrit son initiale dedans '
                + 'et REJOUE aussitôt : c\'est là que se gagnent les parties, un bon coup '
                + 'en enchaîne dix. Quand tous les traits sont tracés, celui qui a le plus '
                + 'de carrés a gagné.'
        };
        const regle = REGLES[jeu];

        return makeItem({
            seed: '0',
            generatorId: 'jeux.plateaux-fiche',
            skillId: null,
            answerKind: 'grid',
            prompt: {
                text: NOMS[jeu],
                papier: NOMS[jeu],
                html: `<div class="game-question">${NOMS[jeu]}</div>`
            },
            // Pas de réponse : personne ne corrige une partie.
            answer: '',
            explanation: regle,
            difficulty: 1,
            meta: { jeu, cols, rows, regle }
        });
    }
};
