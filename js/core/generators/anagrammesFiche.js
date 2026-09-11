// LES ANAGRAMMES — sur le papier.
//
// Rémy, en revue : « tu pourrais faire un pdf ».
//
// À l'écran, on tape les lettres et le jeu dit si le mot existe. Sur la
// feuille, personne ne valide : on écrit le mot dans les cases, une lettre par
// case, et l'on s'engage. C'est la même différence qu'entre le mot caché à
// l'écran et sur papier — l'élève y met sa réponse au lieu de l'essayer.
//
// UNE CASE PAR LETTRE, ET LEUR NOMBRE EST DONNÉ. C'est ce qui rend l'exercice
// faisable : sans les cases, « RACER » peut aussi bien donner « CARRE » que
// « CRAER », et l'on ne sait pas si l'on a fini. Avec elles, la longueur est
// une contrainte de plus — et souvent la première piste.
//
// LA DÉFINITION EST DONNÉE, LA LETTRE INITIALE NON. Le jeu à l'écran dévoile
// progressivement le début du mot quand on sèche ; sur papier ce serait donner
// la réponse à tout le monde, y compris à ceux qui n'en avaient pas besoin.
// C'est le professeur qui souffle, s'il veut.
//
// LE MÉLANGE N'EST PAS UN MÉLANGE AU HASARD. `melanger` cherche l'arrangement
// LE PLUS LISIBLE — celui qui ressemble le plus à un mot sans en être un —
// parce qu'une suite de lettres qu'on ne peut pas prononcer se résout par
// épuisement au lieu de se lire.

import { makeItem } from '../items.js';
import { motsJouables, melanger, THEMES } from '../anagrammes.js';

export const anagrammesFicheGenerator = {
    id: 'voc.anagrammes-fiche',
    label: 'Anagrammes du vocabulaire',
    skills: ['voc.mathematique'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'theme', type: 'select', label: 'Vocabulaire', default: 'tout',
            options: Object.entries(THEMES).map(([value, label]) => ({ value, label }))
        },
        { id: 'nbMots', type: 'number', label: 'Nombre d\'anagrammes', default: 8, min: 4, max: 16 },
        {
            id: 'definition', type: 'checkbox', label: 'Donner la définition', default: true,
            aide: 'Sans elle, il ne reste que les lettres à remettre dans l\'ordre : c\'est un jeu de lettres. Avec elle, c\'est du vocabulaire.'
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const theme = THEMES[p.theme] ? p.theme : 'tout';
        const nbMots = Math.max(4, Math.min(16, Number(p.nbMots) || 8));
        const avecDef = p.definition !== false;

        // DOUZE LETTRES AU PLUS SUR PAPIER. « SUPPLEMENTAIRES » fait quinze
        // cases : la ligne n'a plus de place pour sa définition, et remettre
        // quinze lettres dans l'ordre sans pouvoir les déplacer relève de la
        // punition. À l'écran on peut essayer et effacer ; pas sur la feuille.
        const dispo = motsJouables({ theme, longueurMax: 12 });
        // On brasse la réserve, puis on prend les premiers : tirer au sort
        // avec remise donnerait deux fois le même mot sur une feuille de huit.
        const choisis = rng.shuffle(dispo).slice(0, nbMots);
        const lignes = choisis.map(m => ({
            mot: m.mot,
            def: m.def || '',
            // `melanger` rend le mélange LE PLUS LISIBLE, et jamais le mot
            // lui-même : c'est déjà toute la difficulté d'une anagramme.
            melange: melanger(m.mot, rng)
        }));

        return makeItem({
            seed: rng.seed,
            generatorId: 'voc.anagrammes-fiche',
            skillId: 'voc.mathematique',
            answerKind: 'grid',
            prompt: {
                text: `Retrouve ${lignes.length} mots de mathématiques.`,
                papier: `Retrouve ${lignes.length} mots de mathématiques.`,
                html: `<div class="game-question">${lignes.length} anagrammes</div>`
            },
            answer: lignes.map(l => l.mot).join(', '),
            explanation: lignes.map(l => `${l.melange} → ${l.mot}`).join(' ; ') + '.',
            difficulty: avecDef ? 1 : 2,
            meta: { lignes, avecDef, theme }
        });
    }
};
