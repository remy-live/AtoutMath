// LE JEU DES ALLUMETTES — une stratégie qui se DÉMONTRE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 26 octobre : « tu me les fais tous, avec des grilles faciles ».
//
// LA RÈGLE : un tas d'allumettes, deux joueurs. Chacun son tour, on en retire
// une, deux ou trois. **Celui qui prend la dernière gagne.**
//
// ── CE N'EST PAS UN JEU DE CALCUL, C'EST UN JEU DE DÉMONSTRATION ────────────
//
// Il y a une stratégie gagnante, elle tient en une phrase, et c'est l'élève
// qui doit la trouver :
//
//   « Laisse toujours à ton adversaire un MULTIPLE DE QUATRE. »
//
// Pourquoi elle marche, et c'est là que les mathématiques entrent : quoi que
// l'adversaire retire — 1, 2 ou 3 —, je peux toujours compléter à 4. Le tas
// descend donc de quatre en quatre, et il arrive à zéro APRÈS mon coup. Le
// reste dans la division par 4 est le seul chiffre qui compte, et il se lit
// sur le tas.
//
// RIEN DE TEL DANS LE CATALOGUE : Puissance 4, Othello et les Dames sont des
// jeux de stratégie, mais aucun ne se résout par une division euclidienne.
//
// ── CE QUE FABRIQUE CE GÉNÉRATEUR ───────────────────────────────────────────
//
// Une PARTIE, pas une grille. Le tas de départ n'est jamais un multiple de
// quatre : sinon c'est le second joueur qui gagne, et l'élève — qui commence —
// perdrait quoi qu'il fasse. Une partie qu'on ne peut pas gagner n'apprend
// rien ; elle apprend même le contraire.

import { makeItem } from '../items.js';

const SKILL = 'num.logique.allumettes';

/** Ce qu'on peut retirer en un coup. Trois est la règle classique. */
export const PRISE_MAX = 3;

export const FORMATS = {
    court: { min: 9, max: 15, nom: 'Court — une dizaine d\'allumettes' },
    long: { min: 17, max: 23, nom: 'Long — une vingtaine d\'allumettes' }
};

/**
 * LE COUP DU GAGNANT : ramener le tas à un multiple de quatre.
 *
 * Quand c'est impossible — le tas EST déjà un multiple de quatre, donc on est
 * en position perdante —, on retire une seule allumette : c'est ce qui laisse
 * le plus de coups à l'adversaire pour se tromper.
 */
export function meilleurCoup(tas, priseMax = PRISE_MAX) {
    const reste = tas % (priseMax + 1);
    if (reste === 0) return 1;
    return Math.min(reste, tas);
}

export const allumettesGenerator = {
    id: 'logique.allumettes',
    label: 'Le Jeu des Allumettes',
    skills: [SKILL],
    answerKinds: ['grid'],
    params: [
        {
            id: 'format', type: 'select', label: 'Taille du tas', default: 'court',
            options: Object.entries(FORMATS).map(([value, f]) => ({ value, label: f.nom }))
        },
        {
            id: 'robot', type: 'select', label: 'Comment joue la machine', default: 'apprend',
            aide: 'En « elle apprend », la machine ne joue parfaitement qu\'une fois sur deux : '
                + 'on peut gagner sans connaître la règle, et la chercher ensuite.',
            options: [
                { value: 'apprend', label: 'Elle apprend — elle se trompe une fois sur deux' },
                { value: 'parfait', label: 'Elle joue parfaitement' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const f = FORMATS[p.format] || FORMATS.court;

        // LE TAS N'EST JAMAIS UN MULTIPLE DE QUATRE. C'est l'élève qui
        // commence : si le tas l'était, il perdrait quoi qu'il joue, et une
        // partie qu'on ne peut pas gagner n'apprend rien.
        let tas = rng.int(f.min, f.max);
        if (tas % (PRISE_MAX + 1) === 0) tas += 1;

        const consigne = `Il y a ${tas} allumettes. Chacun son tour, tu en retires 1, 2 ou 3. `
            + 'Celui qui prend la DERNIÈRE a gagné.';

        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.allumettes',
            skillId: SKILL,
            answerKind: 'grid',
            prompt: {
                text: consigne, papier: consigne,
                html: `<div class="game-question gn-consigne">${consigne}</div>`
            },
            // LA RÉPONSE EST LE RÉSULTAT DE LA PARTIE : on gagne, ou on ne
            // gagne pas. L'activité envoie « gagne » quand l'élève prend la
            // dernière allumette.
            answer: 'gagne',
            hints: [
                'Compte ce qu\'il reste APRÈS ton coup, pas avant. Y a-t-il un nombre que tu '
                    + 'aimerais laisser à la machine ?',
                'Quoi que la machine retire — 1, 2 ou 3 —, tu peux toujours compléter à 4. '
                    + 'Le tas descend alors de quatre en quatre.',
                `LA RÈGLE : laisse toujours un MULTIPLE DE 4. Avec ${tas} allumettes, ton `
                    + `premier coup est donc d'en retirer ${tas % 4}.`
            ],
            explanation: 'Celui qui laisse un multiple de 4 gagne à coup sûr : quoi que '
                + 'l\'autre retire, il complète à 4, et le tas arrive à zéro après SON coup. '
                + 'Tout se lit dans le reste de la division par 4.',
            difficulty: 2,
            meta: {
                tas, priseMax: PRISE_MAX,
                robot: p.robot === 'parfait' ? 'parfait' : 'apprend',
                titreCourt: 'Les Allumettes',
                texteLecon: 'Laisse toujours un multiple de 4 : c\'est le reste de la division '
                    + 'par 4 qui décide.'
            }
        });
    }
};

export default allumettesGenerator;
