// COLORIER PAR LES NOMBRES, SUR LE PAPIER.
//
// Rémy : « pour colorier par les nombres, on ne pourrait pas faire un pdf ».
//
// C'EST L'EXERCICE QUI DEMANDE LE PLUS LE PAPIER. À l'écran, on tapote une case
// et elle se colorie ; sur la feuille, on colorie au crayon, on BARRE ce qu'on
// sait blanc, on gomme, on recommence — et c'est précisément le geste que la
// méthode réclame. Une croix vaut autant qu'une case coloriée : elle interdit
// des placements et fait avancer la déduction. À l'écran on l'oublie, sur le
// papier elle vient toute seule.
//
// LA GRILLE EST CELLE DU JEU, AU MÊME NOYAU. `genererGrille` garantit ce qui ne
// se voit pas : que la grille se termine par DÉDUCTION SEULE, sans jamais avoir
// à essayer pour voir. Un nonogramme tiré au hasard n'a pas cette propriété, et
// un élève qui bloque dessus ne bloque pas sur une notion — il bloque sur une
// grille mal faite.

import { makeItem } from '../items.js';
import { genererGrille, PALIERS, totalDe } from '../colorierNombres.js';

export const colorierNombresGenerator = {
    id: 'logique.colorier-nombres',
    label: 'Colorier par les nombres',
    skills: ['num.logique.colorier'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'palier', type: 'select', label: 'Grille', default: 'decouverte',
            options: Object.entries(PALIERS).map(([value, p]) => ({ value, label: p.label }))
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const palier = PALIERS[params && params.palier] ? params.palier : 'decouverte';
        const g = genererGrille({ rng, palier });
        const n = g.enonce.largeur;

        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.colorier-nombres',
            skillId: 'num.logique.colorier',
            answerKind: 'grid',
            prompt: {
                text: `Grille ${n} × ${g.enonce.hauteur} — ${g.total} cases à colorier.`
            },
            // La réponse est la grille lue ligne par ligne : c'est la même
            // écriture que les autres grilles du catalogue.
            answer: 'g' + g.solution.map(l => l.join('')).join('/'),
            explanation: g.sujet
                ? `La grille dessine ${g.sujet}.`
                : `${g.total} cases coloriées en tout.`,
            difficulty: palier === 'image' ? 4 : (palier === 'simple' ? 3 : 2),
            meta: {
                palier,
                sujet: g.sujet,
                enonce: g.enonce,
                solution: g.solution,
                total: g.total,
                // Le nombre d'indices le plus long décide de la largeur des
                // marges — la feuille en a besoin avant de dessiner.
                margeLignes: Math.max(...g.enonce.lignes.map(x => x.length)),
                margeColonnes: Math.max(...g.enonce.colonnes.map(x => x.length))
            }
        });
    }
};

/** Le total annoncé en haut d'une grille — repris tel quel par la fiche. */
export const totalDeLaGrille = (enonce) => totalDe(enonce.lignes);
