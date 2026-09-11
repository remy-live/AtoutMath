// PYTHAGORE COMME ITEM — l'énoncé qui se pose sur une feuille.
//
// L'exercice à l'écran (js/games/pythagore.js) mène sa progression en six
// niveaux ; ce générateur n'écrit que les énoncés de CALCUL — ceux qui font
// une bonne fiche : « ABC est rectangle en A, AB = 6 cm, AC = 8 cm. Calcule
// BC. » La correction déroule les trois lignes du cahier.

import { makeItem } from '../items.js';
import {
    tirerTriangle, cotesDe, direTriangle, etapesCalcul, niveauDe, correctionPapier,
    ligneEnTexte, NIVEAUX
} from '../pythagore.js';

export const pythagoreGenerator = {
    id: 'geo.pythagore',
    label: 'Théorème de Pythagore',
    skills: ['geo.pythagore'],
    answerKinds: ['numeric'],
    ecrit: true,
    // Les six marches de l'exercice A L'ECRAN demandent douze questions —
    // deux chacune. Le conseil vit ici parce que l'activite « pythagore-
    // theoreme » est autonome et n'a pas de generateur a elle ; c'est bien
    // du reglage `niveau` de l'exercice qu'il parle, pas de `chercher`.
    conseil: (p) => (p && p.niveau === 'progressif') ? NIVEAUX.length * 2 : 10,
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
        },
        // TEXTE OU SCHÉMA, AU CHOIX. Lire un énoncé et lire une figure codée ne
        // s'apprennent pas ensemble : au collège, le même exercice se donne
        // tantôt d'une façon, tantôt de l'autre, et c'est au professeur de dire
        // laquelle il travaille aujourd'hui.
        {
            id: 'presentation', type: 'select', label: 'Énoncé', default: 'texte',
            aide: 'En toutes lettres, en figure codée — l\'angle droit marqué, les '
                + 'longueurs connues portées sur les côtés et un « ? » sur celui qu\'on '
                + 'cherche —, ou les deux : le texte, et la figure dessous.',
            options: [
                { value: 'texte', label: 'En toutes lettres' },
                { value: 'schema', label: 'Une figure codée' },
                // LE TEXTE ET LA FIGURE. Rémy : « pour le théorème de Pythagore,
                // on pourrait avoir le choix ou non d'avoir les figures (qui ne
                // sont pas forcément à l'échelle). » C'était l'un OU l'autre :
                // la figure remplaçait l'énoncé. Or lire un énoncé PUIS le
                // traduire en figure est justement le premier geste du chapitre,
                // et le professeur veut pouvoir donner les deux — quitte à
                // prévenir, sur la feuille, que le dessin n'est pas à l'échelle.
                { value: 'les-deux', label: 'Le texte ET la figure' }
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
            explanation: calc.lignes.map(ligneEnTexte).join(' ; ')
                + `, donc ${calc.cherche} = ${calc.resultat} cm.`,
            // SUR LE PAPIER, ON CORRIGE EN CALCULANT. Rémy : « ne récite pas le
            // théorème, fais les calculs détaillés. » Un corrigé qui répond
            // « 15 » ne dit rien ; un corrigé qui redit le théorème non plus.
            // Ce que l'élève compare à sa copie, ce sont les ÉTAPES — une par
            // ligne, du carré au résultat.
            explicationPapier: correctionPapier(t, chercher).join('\n'),
            difficulty: versHypo ? 2 : 3,
            meta: {
                triangle: t, chercher, niveau: niveauDe(versHypo ? 4 : 5).id,
                presentation: ['schema', 'les-deux'].includes((params || {}).presentation)
                    ? params.presentation : 'texte'
            }
        });
    }
};
