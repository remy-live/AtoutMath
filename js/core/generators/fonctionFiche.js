// TRACER LA DROITE — la feuille, et c'est l'autre moitié de « les deux ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, quand je lui ai demandé si l'écran avait le droit de faire placer un
// point ou si le tracé devait rester sur la feuille : « les deux ».
//
// CETTE FEUILLE EST LA MOITIÉ QUI NE S'OUVRE PAS À L'ÉCRAN. L'élève y complète
// un tableau de valeurs, place ses croix, et TIRE LA DROITE À LA RÈGLE. Le
// logiciel n'en trace aucune : il imprime un repère gradué et s'arrête là.
// C'est la ligne rouge du dépôt, et ce n'est pas un pis-aller — tracer une
// droite affine à la règle est le geste du chapitre.
//
// ── CE QUE LA FEUILLE DONNE, ET CE QU'ELLE NE DONNE PAS ────────────────────
//
// Elle donne l'écriture de la fonction, le repère, et la LIGNE DES x du
// tableau. Elle ne donne pas les images : c'est tout le travail. Imprimer
// « A (−2 ; −7) » comme le fait la feuille de repérage vendrait la mèche —
// l'élève recopierait des couples au lieu de calculer.
//
// ── POURQUOI LES NOMBRES SONT CHOISIS AUSSI SERRÉS ─────────────────────────
//
// Tous les points doivent tomber DANS le repère. Un seul qui sort, et l'élève
// a juste sans pouvoir le placer — il cherche alors son erreur dans un calcul
// qui n'en a pas. On tire donc le coefficient d'abord, puis la plage des x,
// puis le nombre tout seul DANS l'intervalle qui garde les images à l'intérieur.
//
// Pur : aucune dépendance au DOM, il se teste sous Node.

import { makeItem } from '../items.js';
import { relatif } from '../signeMoins.js';
import { ecrireAffine } from './fonctionRepere.js';

const choisir = (liste, rng) => liste[rng.int(0, liste.length - 1)];

/**
 * UNE FONCTION DONT TOUTES LES IMAGES TOMBENT DANS LE REPÈRE.
 *
 * On préfère cinq valeurs de x ; quand le coefficient vaut 3, cinq valeurs
 * balaient 12 carreaux en hauteur, soit exactement la hauteur du repère — il
 * ne resterait alors qu'un seul `b` possible, et toutes les feuilles se
 * ressembleraient. Quatre valeurs rendent la liberté.
 */
function plagesDeX(a, max) {
    const trouvees = [];
    // CINQ VALEURS, QUATRE SINON, TROIS EN DERNIER RECOURS — ET ON NE S'ARRÊTE
    // PAS À LA PREMIÈRE LONGUEUR QUI MARCHE.
    //
    // Avec un repère de six, cinq images d'un coefficient 3 balaient DOUZE
    // carreaux pour douze disponibles : une seule plage existe, et un seul b
    // — zéro. S'arrêter là enfermerait le coefficient 3 dans la seule
    // fonction f(x) = 3x, pour toutes les feuilles. On collecte donc aussi
    // les plages plus courtes tant qu'on en a moins de quatre.
    //
    // ET LA DESCENTE S'ARRÊTE À TROIS. Deux points suffisent à tracer une
    // droite, ce qui dispense justement l'élève de la vérification qu'on veut
    // lui apprendre : les points doivent être ALIGNÉS.
    for (const combien of [5, 4, 3]) {
        for (let x0 = -4; x0 + combien - 1 <= 4; x0++) {
            const xs = Array.from({ length: combien }, (_, i) => x0 + i);
            const prod = xs.map(x => a * x);
            // `b` doit garder TOUTES les images entre −max et max. Les deux
            // bornes se lisent sur l'image la plus basse et la plus haute.
            const lo = Math.max(-5, -max - Math.min(...prod));
            const hi = Math.min(5, max - Math.max(...prod));
            if (lo <= hi) trouvees.push({ xs, lo, hi });
        }
        if (trouvees.length >= 4) break;
    }
    return trouvees;
}

export function tirerFiche(rng, max) {
    // C'EST LE REPLI À TROIS VALEURS QUI REND CE TIRAGE SÛR, et rien d'autre.
    //
    // Avec le réglage le plus serré — un repère de quatre — et un coefficient
    // de 3, aucune plage de QUATRE valeurs ne garde les images dedans : le
    // tirage rendait `undefined` et la feuille plantait sans un mot. L'épreuve
    // l'a trouvé avant la feuille.
    //
    // ON AVAIT D'ABORD ÉCRIT UN FILTRE ICI — ne tirer que parmi les
    // coefficients qui tiennent. `epreuveTombe` a montré qu'il ne gardait
    // rien : une fois le repli en place, tous les coefficients tiennent, et le
    // filtre était du code mort portant un commentaire qui s'attribuait la
    // correction. Deux façons de réparer la même chose, dont une seule
    // travaille, est exactement ce qui pourrit un fichier.
    const a = choisir([-3, -2, -1, 1, 2, 3], rng);
    const choix = choisir(plagesDeX(a, max), rng);
    const b = rng.int(choix.lo, choix.hi);
    return { a, b, xs: choix.xs };
}

export const fonctionFicheGenerator = {
    id: 'alg.fonction-fiche',
    label: 'Tracer la droite d\'une fonction',
    skills: ['alg.fonction.image', 'alg.fonction.graphique'],
    answerKinds: ['grid'],
    params: [
        { id: 'max', type: 'number', label: 'Graduation maximale', default: 6, min: 4, max: 8 }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const max = Math.max(4, Math.min(8, Number((params || {}).max) || 6));
        const { a, b, xs } = tirerFiche(rng, max);
        const points = xs.map(x => ({ x, y: a * x + b }));
        const ecriture = ecrireAffine(a, b);

        return makeItem({
            seed: rng.seed,
            generatorId: 'alg.fonction-fiche',
            skillId: 'alg.fonction.image',
            answerKind: 'grid',
            prompt: {
                text: `f(x) = ${ecriture} — complète le tableau, place les points, trace la droite.`,
                html: `<div class="game-question">f(x) = ${ecriture}</div>`
            },
            answer: points.map(p => `${p.x};${p.y}`).join('|'),
            // `relatif` ET NON `${p.x}` : l'expression de f s'écrit avec le vrai
            // signe moins, et un nombre nu rendrait le trait d'union dans la
            // même phrase. Voir `js/core/signeMoins.js`.
            explanation: `On remplace x par chaque valeur du tableau : ${points
                .map(p => `f(${relatif(p.x)}) = ${relatif(p.y)}`).join(', ')}. Les `
                + `${points.length} points sont `
                + 'ALIGNÉS — c\'est ce qui fait qu\'une règle suffit, et c\'est aussi la '
                + 'vérification : un point qui sort de l\'alignement signale un calcul faux.',
            difficulty: 3,
            meta: { a, b, xs, points, max, ecriture }
        });
    }
};

export default fonctionFicheGenerator;
