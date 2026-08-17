// LE TANGRAM SUR LE PAPIER : un carré à découper, puis des silhouettes à remplir.
//
// Rémy : « PDF d'un tangram à découper (avec ou sans couleur) plus les
// silhouettes ». C'est exactement la façon dont le tangram se donne en classe —
// on découpe UNE fois, on garde les sept pièces dans une pochette, et l'on
// ressort les silhouettes à chaque séance. L'écran ne remplace pas le geste de
// tourner une pièce entre ses doigts pour voir si elle rentre.
//
// La première grille de la feuille est TOUJOURS le carré à découper ; les
// suivantes sont les figures, dans l'ordre de difficulté. Un professeur qui
// n'en veut qu'une descend le nombre de grilles ; un professeur qui a déjà fait
// découper met « Colonnes 3, Lignes 2 » et n'imprime que des silhouettes en
// changeant la première grille d'un clic.

import { makeItem } from '../items.js';
import { FIGURES, PIECES, piecesPlacees, boite } from '../tangram.js';

export const tangramFicheGenerator = {
    id: 'geo.tangram-fiche',
    label: 'Tangram (fiche)',
    answerKinds: ['numeric'],
    skills: ['geo.aires.tangram'],
    params: [
        {
            id: 'depart', type: 'select', label: 'Première grille', default: 'decouper',
            aide: 'Le carré à découper n\'est utile qu\'une fois : quand la classe a '
                + 'déjà ses pièces, la feuille ne porte que des silhouettes.',
            options: [
                { value: 'decouper', label: 'Le carré à découper, puis les silhouettes' },
                { value: 'silhouettes', label: 'Seulement des silhouettes' }
            ]
        }
    ],

    generate(params, ctx) {
        const i = Number(ctx && ctx.index) || 0;
        const avecCarre = (params && params.depart) !== 'silhouettes';
        // La grille 0 porte le carré à découper — sauf si le professeur n'en
        // veut pas.
        if (avecCarre && i === 0) {
            return makeItem({
                seed: (ctx.rng && ctx.rng.seed) || 0,
                generatorId: 'geo.tangram-fiche', skillId: 'geo.aires.tangram',
                answerKind: 'numeric',
                prompt: { text: 'Découpe le carré en sept pièces.', papier: 'Découpe le carré en sept pièces.' },
                answer: 7,
                difficulty: 1,
                meta: {
                    quoi: 'decouper',
                    // Le carré d'origine EST la première figure : ses sept
                    // placements sont les traits de découpe.
                    pieces: piecesPlacees(FIGURES[0]).map(p => ({
                        id: p.id, sommets: p.sommets,
                        couleur: (PIECES.find(x => x.id === p.id) || {}).couleur || '#94a3b8'
                    })),
                    boite: boite(FIGURES[0].silhouette),
                    theme: 'decouper'
                }
            });
        }
        const rang = (avecCarre ? i - 1 : i) % FIGURES.length;
        const f = FIGURES[rang];
        return makeItem({
            seed: (ctx.rng && ctx.rng.seed) || 0,
            generatorId: 'geo.tangram-fiche', skillId: 'geo.aires.tangram',
            answerKind: 'numeric',
            prompt: { text: `Remplis ${f.nom.toLowerCase()}.`, papier: `Remplis ${f.nom.toLowerCase()}.` },
            answer: 7,
            explanation: f.indice,
            difficulty: 1 + f.ordre,
            meta: {
                quoi: 'silhouette', nom: f.nom, indice: f.indice,
                silhouette: f.silhouette,
                // Le corrigé montre le découpage : c'est la seule correction
                // possible d'un pavage, et elle ne se devine pas.
                pieces: piecesPlacees(f).map(p => ({
                    id: p.id, sommets: p.sommets,
                    couleur: (PIECES.find(x => x.id === p.id) || {}).couleur || '#94a3b8'
                })),
                boite: boite(f.silhouette),
                theme: f.id
            }
        });
    }
};
