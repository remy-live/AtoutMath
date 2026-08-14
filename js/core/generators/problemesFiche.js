// HISTOIRES EN PAGAILLE — sur le papier.
//
// C'est l'exercice qui appelle le plus la feuille : un problème se relit, se
// souligne, se schématise dans la marge. À l'écran on choisit parmi quatre
// propositions ; sur le papier on écrit, et c'est plus exigeant — reconnaître
// la bonne réponse dans une liste n'est pas la trouver.
//
// LA FAMILLE N'EST JAMAIS NOMMÉE SUR LA FEUILLE. « Réunir deux quantités (+) »
// donnerait l'opération avant la lecture, et c'est exactement ce que la
// pagaille des familles cherche à empêcher : l'élève doit décider lui-même si
// c'est une addition ou une division.

import { makeItem } from '../items.js';
import { famillesDe, tirerProbleme, direReponse } from '../problemes.js';

export const problemesFicheGenerator = {
    id: 'num.problemes-fiche',
    label: 'Problèmes en une ou deux étapes',
    skills: ['num.problemes'],
    answerKinds: ['numeric'],
    ecrit: true,
    // La famille « fraction d'une quantité » écrit « les 2/5 sont abîmés » :
    // sur le papier, cela se compose en colonne, numérateur sur dénominateur.
    // La barre oblique est une commodité d'écran.
    fractions: true,
    params: [
        {
            id: 'niveau', type: 'select', label: 'Familles proposées', default: 'tout',
            options: [
                { value: 'tout', label: 'Toutes les familles' },
                { value: 'CM2', label: 'CM2 — réunir, changer, comparer, grouper' },
                { value: '6ème', label: '6ème' },
                { value: '5ème', label: '5ème — proportionnalité, durées, deux étapes' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = (params || {});
        const choisies = (Array.isArray(p.familles) && p.familles.length)
            ? p.familles
            : famillesDe(p.niveau === 'tout' ? null : p.niveau);
        // Un filet : une famille inconnue ne doit pas vider la fiche.
        const dispo = choisies.length ? choisies : famillesDe(null);

        let pb = null;
        for (let essai = 0; essai < 12 && !pb; essai++) {
            pb = tirerProbleme(rng.pick(dispo), rng);
        }
        if (!pb) pb = tirerProbleme(famillesDe(null)[0], rng);

        const texte = `${pb.enonce} ${pb.question}`;
        return makeItem({
            seed: rng.seed,
            generatorId: 'num.problemes-fiche',
            skillId: pb.skill || 'num.problemes',
            answerKind: 'numeric',
            prompt: { text: texte, papier: texte, html: `<div class="game-question">${texte}</div>` },
            answer: direReponse(pb, pb.reponse),
            choices: pb.choix.map(c => ({ value: direReponse(pb, c.v), correct: !!c.juste })),
            explanation: `Réponse : ${direReponse(pb, pb.reponse)}.`,
            difficulty: pb.etapes === 2 ? 3 : 2,
            meta: { famille: pb.famille, unite: pb.unite || '', reponse: pb.reponse }
        });
    }
};
