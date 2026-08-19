// LES MOTS CROISÉS — sur le papier.
//
// Rémy, en revue : « on pourrait avoir un pdf ».
//
// C'est le format le plus naturel des trois : une grille de mots croisés EST
// un objet de papier, et l'écran n'en est qu'une transcription. La feuille
// retrouve donc la mise en page du journal — la grille d'un côté, les
// définitions rangées en « Horizontalement » et « Verticalement » de l'autre.
//
// AUCUNE AIDE SUR LA FEUILLE. À l'écran on peut demander une lettre par mot ;
// sur papier il n'y a personne pour la donner, et c'est très bien : les
// croisements SONT l'aide. Un mot trouvé en donne trois autres à moitié.
//
// LA GRILLE EST LA MÊME QU'À L'ÉCRAN, au générateur près : on réutilise
// `grilleOptimisee`, qui essaie plusieurs constructions et garde la plus
// dense. Une grille de mots croisés lâche — trois mots qui se touchent à
// peine — n'est pas un mots croisés, c'est une liste de définitions.

import { makeItem } from '../items.js';
import { grilleOptimisee, definitions } from '../motsCroises.js';
import { makeRng } from '../ids.js';
import { THEMES } from '../motsCaches.js';

export const motsCroisesFicheGenerator = {
    id: 'voc.mots-croises-fiche',
    label: 'Mots croisés du vocabulaire',
    skills: ['voc.mathematique'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'theme', type: 'select', label: 'Vocabulaire', default: 'angles',
            options: Object.entries(THEMES).map(([value, label]) => ({ value, label }))
        },
        { id: 'nbMots', type: 'number', label: 'Nombre de mots', default: 10, min: 5, max: 16 },
        {
            id: 'niveauMax', type: 'select', label: 'Difficulté du vocabulaire', default: 3,
            options: [
                { value: 1, label: 'Les mots les plus courants' },
                { value: 2, label: 'Courants et intermédiaires' },
                { value: 3, label: 'Tout le vocabulaire' }
            ]
        },
        {
            id: 'lettresDonnees', type: 'number', label: 'Lettres déjà placées', default: 0, min: 0, max: 6,
            aide: 'Quelques lettres écrites d\'avance donnent un point de départ — utile pour une classe qui découvre.'
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const theme = THEMES[p.theme] ? p.theme : 'angles';
        const nbMots = Math.max(5, Math.min(16, Number(p.nbMots) || 10));
        const niveauMax = [1, 2, 3].includes(Number(p.niveauMax)) ? Number(p.niveauMax) : 3;
        const donnees = Math.max(0, Math.min(6, Number(p.lettresDonnees) || 0));

        const g = grilleOptimisee({
            theme, niveauMax, nbMots, essais: 10,
            // Chaque essai a SA graine, dérivée de celle de la question : deux
            // essais partageant un générateur construiraient la même grille.
            rngPour: (i) => makeRng(`${rng.seed}-mcf-${i}`)
        });

        // LES LETTRES OFFERTES SONT TIRÉES DANS DES MOTS DIFFÉRENTS : six
        // lettres du même mot le donnent en entier et n'aident nulle part
        // ailleurs.
        const offertes = [];
        const motsMelanges = rng.shuffle(g.mots);
        for (let i = 0; i < donnees && i < motsMelanges.length; i++) {
            const m = motsMelanges[i];
            const k = Math.floor(rng.next() * m.mot.length);
            const x = m.dir === 'h' ? m.x + k : m.x;
            const y = m.dir === 'h' ? m.y : m.y + k;
            offertes.push({ x, y, lettre: m.mot[k] });
        }

        const defs = definitions(g);
        return makeItem({
            seed: rng.seed,
            generatorId: 'voc.mots-croises-fiche',
            skillId: 'voc.mathematique',
            answerKind: 'grid',
            prompt: {
                text: `Grille de ${g.mots.length} mots.`,
                papier: `Grille de ${g.mots.length} mots.`,
                html: `<div class="game-question">Mots croisés — ${g.largeur} × ${g.hauteur}</div>`
            },
            answer: g.mots.map(m => m.mot).join(', '),
            explanation: g.mots
                .map(m => `${m.num}${m.dir === 'h' ? ' horizontal' : ' vertical'} : ${m.mot}`)
                .join(' ; ') + '.',
            difficulty: niveauMax,
            meta: {
                largeur: g.largeur, hauteur: g.hauteur,
                cases: g.cases, mots: g.mots, offertes,
                horizontales: defs.horizontal, verticales: defs.vertical,
                // `numeroter` rend une LISTE ; la fiche interroge case par
                // case, et parcourir une liste de dix pour chacune des deux
                // cent soixante-dix cases d'une grille est un gâchis inutile.
                numeros: Object.fromEntries(g.numeros.map(n => [`${n.x},${n.y}`, n.num])),
                theme
            }
        });
    }
};
