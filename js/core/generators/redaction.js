// RÉDIGER UN RAISONNEMENT — la version qui va sur le papier.
//
// L'exercice se joue à l'écran en quatre temps (js/games/redaction.js) ; ce
// générateur-ci n'en produit que la MATIÈRE, pour qu'une figure et ses trois
// lignes puissent aussi s'imprimer. C'est l'exercice qui gagne le plus à
// passer sur feuille : rédiger une justification, c'est écrire à la main.
//
// La figure et les phrases viennent de core/redaction.js — le même modèle que
// le jeu. On ne recopie rien : une propriété corrigée d'un côté l'est des deux.

import { makeItem } from '../items.js';
import { PROPRIETES, proprieteDe, tirerFigure, donnees, conclusion } from '../redaction.js';

export const redactionGenerator = {
    id: 'geo.redaction',
    label: 'Rédiger : parallèles et perpendiculaires',
    // La compétence s'appelle `geo.para-perp` au référentiel, sans le segment
    // « redaction » : déclarée sous un nom inexistant, elle ne rattachait rien.
    skills: ['geo.para-perp'],
    answerKinds: ['text'],
    // Pas de `ecrit: true` : cet exercice ne se pose pas en question à trou
    // dans une colonne. Il occupe un BLOC — figure plus trois lignes — et
    // c'est `printable` qui l'y envoie.
    params: [
        {
            id: 'propriete', label: 'Propriété travaillée', type: 'select',
            default: 'para-perp',
            options: Object.values(PROPRIETES).map(p => ({ value: p.id, label: p.titre }))
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const prop = proprieteDe(params && params.propriete);
        const figure = tirerFigure(rng, prop.id);
        const [d1, d2] = donnees(figure);
        const c = conclusion(figure);

        return makeItem({
            seed: rng.seed,
            generatorId: 'geo.redaction',
            skillId: 'geo.para-perp',
            answerKind: 'text',
            prompt: {
                text: c.relation === '//'
                    ? `Justifie que (${c.gauche}) et (${c.droite}) sont parallèles.`
                    : `Justifie que (${c.gauche}) est perpendiculaire à (${c.droite}).`
            },
            answer: `(${c.gauche}) ${c.relation} (${c.droite})`,
            hints: [
                'Commence par ce que la figure te DONNE : deux droites parallèles, et une perpendiculaire à l\'une des deux.',
                'La propriété est écrite dans la consigne : recopie-la en entier à la ligne « Or ».'
            ],
            explanation: `Je sais que ${d1.dit} et ${d2.dit}. Or ${prop.enonce} Donc ${c.dit}.`,
            difficulty: 2,
            meta: {
                figure,
                propriete: prop.id,
                noms: figure.noms,
                // Les trois lignes, déjà rédigées : la feuille de solutions
                // n'a plus qu'à les poser.
                lignes: [
                    { etiquette: 'Je sais que', texte: `${d1.dit} et ${d2.dit}.` },
                    { etiquette: 'Or', texte: prop.enonce },
                    { etiquette: 'Donc', texte: `${c.dit}.` }
                ]
            }
        });
    }
};
