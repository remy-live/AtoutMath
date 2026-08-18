// LA LOUPE SUR LA DROITE GRADUÉE — intercaler des décimaux.
//
// Entre 3 et 4, on place les dixièmes ; entre 3,5 et 3,6, les centièmes. C'est
// le même geste, à deux échelles, et c'est là que se joue une idée que le
// tableau de numération ne donne jamais : ENTRE DEUX DÉCIMAUX IL Y EN A
// TOUJOURS D'AUTRES. Un élève qui récite « dixièmes, centièmes, millièmes »
// peut très bien croire que 3,5 est suivi de 3,6 comme 5 est suivi de 6.
//
// La droite graduée le montre sans un mot : on s'approche, et l'intervalle
// qu'on croyait plein se rouvre en dix.
//
// DEUX PIÈGES SONT ENCODÉS :
//
//   1. COMPTER LES TRAITS AU LIEU DES INTERVALLES. Le troisième trait après 3
//      n'est pas 3,3 si la graduation commence au trait de 3 — il l'est, mais
//      l'élève qui compte le trait de départ trouve 3,2 ou 3,4. Les deux
//      voisins immédiats sont donc toujours proposés.
//
//   2. LE RANG PERDU. Entre 3,5 et 3,6, la réponse est 3,54 et non 3,4 ni
//      35,4 : l'élève qui a bien compté mais s'est trompé de zoom écrit un
//      nombre du bon aspect à la mauvaise échelle.
//
// Le générateur est pur. Le dessin de l'axe vit dans figures.js, partagé avec
// la fiche imprimée.

import { makeItem, finalizeChoices } from '../items.js';
import { axeSvg, figure } from '../figures.js';

/** Écriture française d'un décimal, sans traîne de virgule flottante. */
const fr = (x, rang) => x.toFixed(rang)
    .replace(/(\.\d*?)0+$/, '$1')   // 3,50 s'écrit 3,5
    .replace(/\.$/, '')             // 3, s'écrit 3
    .replace('.', ',');

/**
 * Les trois zooms du chapitre. `rang` est le nombre de décimales de la
 * réponse ; `pas` l'écart entre deux graduations voisines.
 */
const ZOOMS = [
    { id: 'unites', rang: 0, pas: 1, titre: 'de 1 en 1' },
    { id: 'dixiemes', rang: 1, pas: 0.1, titre: 'de 0,1 en 0,1' },
    { id: 'centiemes', rang: 2, pas: 0.01, titre: 'de 0,01 en 0,01' }
];

const zoomDe = (id) => ZOOMS.find(z => z.id === id) || ZOOMS[1];

/**
 * Un intervalle et le point à lire dedans.
 *
 * On tire un début « rond » à l'échelle du dessus : pour les dixièmes, un
 * entier ; pour les centièmes, un nombre à un chiffre après la virgule. C'est
 * ce qui fait qu'on RECONNAÎT le zoom au premier coup d'œil.
 */
function tirerLecture(rng, zoom) {
    const z = zoom;
    const debut = z.id === 'unites' ? rng.int(0, 12)
        : z.id === 'dixiemes' ? rng.int(0, 12)
            : Number((rng.int(0, 12) + rng.int(1, 8) / 10).toFixed(1));
    // Jamais le premier ni le dernier trait : « lis le point qui est sur 3 »
    // ne demande pas de compter.
    const crans = rng.int(2, 8);
    const valeur = Number((debut + crans * z.pas).toFixed(z.rang + 1));
    return { debut, fin: Number((debut + 10 * z.pas).toFixed(z.rang + 1)), crans, valeur };
}

export const graduationsGenerator = {
    id: 'num.graduations',
    label: 'Lire une graduation décimale',
    skills: ['num.dec.graduations'],
    answerKinds: ['numeric', 'choice'],
    ecrit: true,
    // Trois echelles a trois questions : neuf pour aller des unites aux
    // centiemes. Voir core/duree.js.
    conseil: (p) => (p && p.zoom === 'progressif') ? ZOOMS.length * 3 : 10,
    params: [
        {
            id: 'zoom', type: 'select', label: 'Le pas de la graduation', default: 'progressif',
            aide: 'De 1 en 1, on lit des entiers. De 0,1 en 0,1, on découvre que l\'intervalle entre '
                + 'deux entiers se coupe en dix. De 0,01 en 0,01, on refait le même geste UN CRAN plus '
                + 'bas — et c\'est là qu\'on comprend qu\'on pourrait continuer sans fin. '
                + '« Progressif » enchaîne les trois.',
            options: [
                { value: 'progressif', label: 'Progressif : 1, puis 0,1, puis 0,01' },
                { value: 'unites', label: 'De 1 en 1' },
                { value: 'dixiemes', label: 'De 0,1 en 0,1' },
                { value: 'centiemes', label: 'De 0,01 en 0,01' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const i = Number(ctx.index) || 0;
        // PROGRESSIF : trois questions par palier. Une seule question par
        // échelle ne laisse pas le temps de reconnaître le geste ; dix
        // enferment dans une routine.
        const zoom = p.zoom && p.zoom !== 'progressif'
            ? zoomDe(p.zoom)
            : ZOOMS[Math.min(ZOOMS.length - 1, Math.floor(i / 3))];

        const { debut, fin, crans, valeur } = tirerLecture(rng, zoom);
        const rang = zoom.rang;
        const label = (v) => fr(v, rang);

        // Les voisins immédiats : l'erreur de celui qui compte les TRAITS au
        // lieu des INTERVALLES. Puis le rang perdu, pour celui qui a bien
        // compté mais oublié à quelle échelle il regarde.
        const voisinBas = Number((valeur - zoom.pas).toFixed(rang));
        const voisinHaut = Number((valeur + zoom.pas).toFixed(rang));
        const rangPerdu = rang > 0
            ? Number((debut + crans * zoom.pas * 10).toFixed(Math.max(0, rang - 1)))
            : valeur * 10;

        return makeItem({
            seed: rng.seed,
            generatorId: 'num.graduations',
            skillId: 'num.dec.graduations',
            answerKind: 'numeric',
            prompt: {
                text: `Quelle est l'abscisse du point rouge ? (entre ${label(debut)} et ${label(fin)})`,
                html: `<div class="game-question">Quelle est l'abscisse du point rouge ?</div>`
                    + figure(axeSvg({ debut, fin, pas: zoom.pas, rang, point: valeur })),
                papier: `Sur l'axe ci-dessus, gradué ${zoom.titre}, écris l'abscisse du point.`
            },
            answer: valeur,
            choices: finalizeChoices(rng, [
                { value: valeur, label: label(valeur), correct: true },
                {
                    value: voisinBas, label: label(voisinBas),
                    why: 'Un cran trop bas : compte les INTERVALLES depuis le grand trait, pas les traits.'
                },
                {
                    value: voisinHaut, label: label(voisinHaut),
                    why: 'Un cran trop haut : le premier intervalle commence AU grand trait.'
                },
                {
                    value: rangPerdu, label: label(rangPerdu).replace(',', ','),
                    why: `Le compte est bon mais pas l'échelle : ici un intervalle vaut ${label(zoom.pas) || '0,01'}.`
                }
            ], { count: 4, filler: (r) => Number((debut + r.int(1, 9) * zoom.pas).toFixed(rang)) }),
            hints: [
                `Le grand trait de gauche est ${label(debut)}, celui de droite ${label(fin)} : entre les deux, il y a DIX intervalles.`,
                `Un intervalle vaut donc ${zoom.pas === 1 ? '1' : fr(zoom.pas, rang)}. Compte-les depuis ${label(debut)}.`
            ],
            explanation: `De ${label(debut)} à ${label(fin)}, l'axe est coupé en dix : un intervalle vaut `
                + `${zoom.pas === 1 ? '1' : fr(zoom.pas, rang)}. Le point est ${crans} intervalles après ${label(debut)}, `
                + `donc son abscisse est ${label(valeur)}.`,
            difficulty: rang + 1,
            meta: { zoom: zoom.id, debut, fin, crans, valeur, theme: `${zoom.id}-${debut}` }
        });
    }
};
