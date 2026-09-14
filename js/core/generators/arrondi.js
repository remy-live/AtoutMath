// GÉNÉRATEUR DE L'ARRONDI — par défaut, par excès, arrondi.
//
// Rémy : « tu feras un exercice d'arrondi avec valeur par excès, valeur par
// défaut, valeur approchée (au dixième, centième, millième). »
//
// LE MÉLANGE EST L'EXERCICE. Poser vingt fois « arrondis au centième » apprend
// un geste ; poser les trois questions sur le même encadrement oblige à LIRE
// laquelle on demande, et c'est là que les points se perdent. Les trois sortes
// se décochent quand même — une classe qui vient de voir la troncature peut
// travailler « par défaut » seul pendant dix minutes.
//
// TOUT LE CALCUL VIT DANS core/arrondi.js, chiffre par chiffre : un arrondi
// calculé en flottants se trompe exactement là où l'exercice regarde.

import { makeItem } from '../items.js';
import {
    MARCHES_ARRONDI, SORTES, ORDRE_SORTES,
    tirerArrondi, enonceDe, reponseDe, encadrementDe, indicesDe, expliquer, leurresDe,
    ecrire, valeur
} from '../arrondi.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe,
    valeurParMarche
} from '../progression.js';

const SKILL = 'num.arrondi';
const MOT = 'étape';

/** Le rang monte, et le mélange est le plus dur : c'est là qu'il faut choisir. */
const DIFFICULTE = { unite: 1, dixieme: 2, centieme: 3, millieme: 3, melange: 4 };

/** L'exemple du cours — jamais le nombre posé. Voir `outils` plus bas. */
const RAPPEL_MOTS_HTML = `<div class="arr-mots">
    <p>Tout nombre est pris entre deux voisins du rang demandé. Au centième :</p>
    <p class="arr-mots-enc">3,14 &lt; <b>3,1416</b> &lt; 3,15</p>
    <ul>
        <li><b>Par défaut</b> : celui de <b>gauche</b> — 3,14. On garde ce qu’il y
            a devant, on coupe le reste.</li>
        <li><b>Par excès</b> : celui de <b>droite</b> — 3,15.</li>
        <li><b>Arrondi</b> : celui des deux dont le nombre est le plus
            <b>proche</b> — ici 3,14, parce que le chiffre suivant est 1.</li>
    </ul>
    <p>Arrondir n’est pas couper : cela ne tombe pareil qu’une fois sur deux.</p>
</div>`;

export const arrondiGenerator = {
    id: 'num.arrondi',
    label: 'Valeur approchée : par défaut, par excès, arrondie',
    skills: [SKILL],
    answerKinds: ['numeric', 'choice'],
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, MARCHES_ARRONDI).length),
    params: [
        paramMarches({ marches: MARCHES_ARRONDI, mot: MOT }),
        {
            id: 'sortes', type: 'multiselect', deroulant: true,
            label: 'Les questions posées',
            default: ORDRE_SORTES,
            aide: 'Les trois mots portent sur le MÊME encadrement, et c\'est en les mélangeant '
                + 'qu\'on voit qui coupe au lieu d\'arrondir. Décoche pour travailler un mot '
                + 'seul juste après la leçon.',
            options: ORDRE_SORTES.map(id => ({ value: id, label: SORTES[id].mot.replace(/DÉFAUT|EXCÈS|ARRONDIE/, m => m.toLowerCase()) }))
        },
        {
            id: 'reponse', type: 'select', label: 'Réponse', papier: false,
            parMarche: true,
            // (Le « ? » dit ce que le réglage CHANGE, en deux phrases : ce qui
            // suit — pourquoi les propositions déplacent le travail du calcul
            // vers le vocabulaire — appartient à ce commentaire-ci. En
            // propositions, les trois valeurs de l'encadrement sont côte à
            // côte : l'élève reconnaît le mot au lieu de produire le nombre.)
            aide: 'À saisir, l\'élève écrit son nombre. En propositions, il reconnaît la bonne '
                + 'valeur parmi les trois de l\'encadrement.',
            options: [
                { value: 'saisie', label: 'À saisir (clavier de nombres)', court: 'Clavier', clavier: true },
                { value: 'choix', label: 'À choisir parmi quatre', court: '4' }
            ],
            default: 'saisie'
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const id = marcheAuRang(ctx.index ?? 0, marchesCochees(params, MARCHES_ARRONDI),
            totalDe(ctx, params), params);
        const sortes = Array.isArray(p.sortes) && p.sortes.length ? p.sortes : ORDRE_SORTES;
        const t = tirerArrondi(rng, id, { sortes });

        const rep = reponseDe(t);
        const juste = valeur(rep);
        const auChoix = valeurParMarche(params, 'reponse', id, 'saisie') === 'choix';
        const leurres = leurresDe(t);
        const enonce = enonceDe(t);

        return makeItem({
            seed: rng.seed, generatorId: 'num.arrondi', skillId: SKILL,
            answerKind: auChoix ? 'choice' : 'numeric',
            prompt: {
                text: enonce,
                papier: enonce,
                html: `<div class="game-question">${enonce}</div>`
            },
            answer: juste,
            choices: auChoix ? [
                { value: juste, label: ecrire(rep), correct: true },
                ...leurres.slice(0, 3).map(l => ({
                    value: l.value, label: l.texte, correct: false, why: l.why
                }))
            ] : null,
            // À LA SAISIE AUSSI, L'ERREUR SE NOMME. Les trois mots sont les
            // bonnes réponses les uns des autres : celui qui tape la valeur par
            // défaut quand on demandait l'arrondi ne s'est pas trompé de
            // calcul, il s'est trompé de mot, et « faux » ne le lui dit pas.
            diagnostics: auChoix ? null : leurres.map(l => ({ value: l.value, why: l.why })),
            hints: indicesDe(t),
            explanation: expliquer(t),
            difficulty: DIFFICULTE[id] || 2,
            meta: {
                marche: id, titre: (MARCHES_ARRONDI.find(m => m.id === id) || {}).nom,
                rang: t.rang, sorte: t.sorte, nombre: ecrire(t.n),
                encadrement: encadrementDe(t),
                // L'ÉLÈVE ÉCRIT UN NOMBRE À VIRGULE — sauf à l'unité, où il n'y
                // en a plus. Une touche virgule inutilisable laisserait croire
                // qu'on attend des décimales là où l'on demande un entier.
                decimal: t.decimales > 0,
                // LE RAPPEL DU VOCABULAIRE, à portée de pouce.
                //
                // SUR UN AUTRE NOMBRE QUE CELUI DE LA QUESTION, et c'est tout
                // le soin à prendre ici : l'encadrement du nombre posé DONNE
                // deux des trois réponses — « 3,14 < 3,1416 < 3,15 » répond
                // à « par défaut » et à « par excès » sans qu'on ait rien
                // cherché. Le bouton serait un bouton « tricher ». Il montre
                // donc la règle sur un exemple fixe, celui du cours.
                outils: [{ id: 'mots', label: '📏 Les trois mots', html: RAPPEL_MOTS_HTML }]
            }
        });
    }
};
