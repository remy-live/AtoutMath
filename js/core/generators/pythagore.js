// PYTHAGORE COMME ITEM — l'énoncé qui se pose sur une feuille.
//
// L'exercice à l'écran (js/games/pythagore.js) mène sa progression en six
// niveaux ; ce générateur n'écrit que les énoncés de CALCUL — ceux qui font
// une bonne fiche : « ABC est rectangle en A, AB = 6 cm, AC = 8 cm. Calcule
// BC. » La correction déroule les trois lignes du cahier.

import { makeItem } from '../items.js';
import { tirerTriangle, cotesDe, direTriangle, etapesCalcul, niveauDe } from '../pythagore.js';

export const pythagoreGenerator = {
    id: 'geo.pythagore',
    label: 'Théorème de Pythagore',
    skills: ['geo.pythagore'],
    answerKinds: ['numeric'],
    ecrit: true,
    // Le paramètre s'appelle « chercher », PAS « niveau » : l'exercice à
    // l'écran a le sien (les six marches), et deux réglages homonymes qui ne
    // parlent pas de la même chose finissent toujours par se marcher dessus.
    params: [
        {
            id: 'chercher', type: 'select', label: 'Chercher', default: 'melange',
            options: [
                { value: 'hypotenuse', label: 'L\'hypoténuse (on additionne)' },
                { value: 'cote', label: 'Un côté de l\'angle droit (on soustrait)' },
                { value: 'melange', label: 'Mélangé' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const demande = (params && params.chercher)
            // L'exercice à l'écran passe son « niveau » quand on imprime
            // depuis sa fenêtre de réglages : 4 cherche l'hypoténuse, 5 un
            // côté, tout le reste mélange.
            || (Number(params && params.niveau) === 4 ? 'hypotenuse'
                : Number(params && params.niveau) === 5 ? 'cote' : 'melange');
        const versHypo = demande === 'hypotenuse' || (demande === 'melange' && rng.bool(0.5));
        const t = tirerTriangle(rng);
        const { hypo, cathetes } = cotesDe(t);
        const chercher = versHypo ? null : rng.pick(cathetes).nom;
        const calc = etapesCalcul(t, chercher);

        const donnees = versHypo
            ? `${cathetes[0].nom} = ${cathetes[0].longueur} cm et ${cathetes[1].nom} = ${cathetes[1].longueur} cm`
            : `${hypo.nom} = ${hypo.longueur} cm et `
                + `${cathetes.find(x => x.nom !== chercher).nom} = ${cathetes.find(x => x.nom !== chercher).longueur} cm`;

        return makeItem({
            seed: rng.seed,
            generatorId: 'geo.pythagore',
            skillId: 'geo.pythagore',
            answerKind: 'numeric',
            prompt: {
                text: `${direTriangle(t)}, avec ${donnees}. Calcule ${calc.cherche}.`,
                papier: `${direTriangle(t)}, avec ${donnees}. Calcule ${calc.cherche}, en cm.`
            },
            answer: calc.resultat,
            hints: [
                `L'hypoténuse est le côté en face de l'angle droit : ici, c'est [${hypo.nom}].`,
                versHypo
                    ? 'Pour l\'hypoténuse, on ADDITIONNE les deux carrés, puis on prend la racine.'
                    : 'Pour un côté de l\'angle droit, on SOUSTRAIT le carré connu du carré de l\'hypoténuse.'
            ],
            explanation: calc.lignes.map(l => l.texte.replace(/ = $/, '')).join(' ; ')
                + ` = ${calc.resultat}, donc ${calc.cherche} = ${calc.resultat} cm.`,
            difficulty: versHypo ? 2 : 3,
            meta: { triangle: t, chercher, niveau: niveauDe(versHypo ? 4 : 5).id }
        });
    }
};
