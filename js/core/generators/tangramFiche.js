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
        },
        {
            // Rémy : « il faut demander si on veut à l'échelle ou non, car
            // parfois la figure ombrée ne permet pas d'accueillir toutes les
            // pièces ». C'était un vrai défaut de géométrie, pas une préférence :
            // chaque silhouette était agrandie pour remplir SON bloc, donc deux
            // figures de la même feuille n'étaient pas au même millimètre. Les
            // pièces découpées dans le carré ne pouvaient alors couvrir qu'une
            // silhouette sur deux.
            id: 'echelle', type: 'select', label: 'Taille des figures', default: 'commune',
            aide: 'À la même échelle, les pièces découpées dans le carré remplissent VRAIMENT '
                + 'chaque silhouette — c\'est indispensable dès qu\'on découpe. Ajustée, chaque '
                + 'figure remplit son cadre : plus grand à regarder, mais impossible à recouvrir.',
            options: [
                { value: 'commune', label: 'Toutes à la même échelle (pour découper)' },
                { value: 'ajustee', label: 'Chacune au plus grand dans son cadre' }
            ]
        }
    ],

    generate(params, ctx) {
        const i = Number(ctx && ctx.index) || 0;
        const avecCarre = (params && params.depart) !== 'silhouettes';
        const echelle = (params && params.echelle) === 'ajustee' ? 'ajustee' : 'commune';
        const commun = echelle === 'commune' ? encombrementMax() : null;
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
                    echelle, commun,
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
                echelle, commun,
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

/**
 * LE PLUS GRAND ENCOMBREMENT DE TOUT LE JEU DE FIGURES.
 *
 * En échelle commune, c'est lui qui fixe le millimètre : si la figure la plus
 * étalée tient dans son cadre, toutes les autres y tiennent — et elles sont
 * alors au même millimètre les unes que les autres, donc recouvrables par les
 * mêmes pièces.
 */
function encombrementMax() {
    let w = 0, h = 0;
    FIGURES.forEach(f => {
        const b = boite(f.silhouette);
        w = Math.max(w, b.x1 - b.x0);
        h = Math.max(h, b.y1 - b.y0);
    });
    return { w, h };
}
