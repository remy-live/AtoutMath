// LE DESSIN D'UN EMPILEMENT DE CUBES.
//
// Séparé du noyau (core/cubes.js), qui ne connaît que des hauteurs : ici on ne
// décide rien, on montre. La feuille imprimée lit les MÊMES données et les
// redessine en jsPDF — c'est la garantie que ce qu'on voit à l'écran est ce
// qui sort de l'imprimante.
//
// TROIS CLARTÉS, PAS TROIS COULEURS. Le dessus est clair, la face de droite
// moyenne, celle de gauche foncée : c'est ce qui fait qu'on lit un VOLUME et
// pas un pavage de losanges. Trois valeurs bien séparées survivent à la
// photocopie, là où trois teintes deviendraient un même gris — et l'exercice
// tout entier consiste à voir ce qui est devant quoi.

import { cubesAPeindre, facesCube, boiteDessin } from './cubes.js';

const PAD = 0.35;
const arr = (v) => Math.round(v * 1000) / 1000;

/**
 * @param {number[][]} hauteurs
 * @param {Object} [opts]
 * @param {string} [opts.classe]  - une classe de plus sur le SVG
 * @param {boolean} [opts.etages] - une teinte par ÉTAGE (voir plus bas)
 * @param {number} [opts.jusqua]  - ne dessiner que les étages 1 à n
 * @param {boolean} [opts.miroir] - vu de l'autre coin
 */
export function cubesSvg(hauteurs, opts = {}) {
    const b = boiteDessin(hauteurs);
    const W = b.largeur + PAD * 2, H = b.hauteur + PAD * 2;
    const X = (v) => arr(v - b.xmin + PAD);
    const Y = (v) => arr(v - b.ymin + PAD);
    const poly = (pts, classe) =>
        `<polygon class="${classe}" points="${pts.map(p => `${X(p.x)},${Y(p.y)}`).join(' ')}"/>`;

    // UNE TEINTE PAR ÉTAGE, QUAND ON DEMANDE L'INDICE.
    //
    // Rémy : « couleurs par étage (via l'indice), bouton couche par couche ».
    // Compter des cubes, c'est compter des ÉTAGES et les ajouter : c'est la
    // méthode, et le dessin ne la montre pas — trois clartés qui disent le
    // volume, la même partout, du sol au sommet. En colorant chaque étage on
    // ne donne pas la réponse : on montre par où prendre le comptage. D'où sa
    // place dans l'indice, et nulle part ailleurs.
    //
    // LES TROIS CLARTÉS SURVIVENT. C'est la teinte qui change d'un étage à
    // l'autre, pas la lumière : le dessus reste clair, la droite moyenne, la
    // gauche foncée. Sans quoi on perdrait le volume en gagnant les étages.
    const teinte = (z) => (opts.etages ? ` cu-e${(z % 4) + 1}` : '');
    const jusqua = Number.isFinite(opts.jusqua) ? opts.jusqua : Infinity;

    const d = cubesAPeindre(hauteurs).filter(c => c.z < jusqua).map(({ x, y, z }) => {
        const f = facesCube(x, y, z);
        const t = teinte(z);
        // L'ordre compte DANS le cube aussi : la face de gauche est peinte
        // avant celle de droite, et le dessus par-dessus les deux — sinon un
        // trait d'arête disparaît sous la face voisine.
        return poly(f.gauche, `cu-gauche${t}`) + poly(f.droite, `cu-droite${t}`)
            + poly(f.dessus, `cu-dessus${t}`);
    }).join('');

    // VU DE L'AUTRE COIN. Rémy : « parfois en perspective ». Le dessin est
    // toujours pris du même angle, et l'on finit par lire l'IMAGE au lieu de
    // lire le volume — les mêmes escaliers, toujours montant vers la droite.
    // Un miroir horizontal donne la vue depuis l'autre côté : c'est le même
    // empilement, il ne se compte pas autrement, mais il faut de nouveau le
    // regarder. On ne retourne QUE le dessin, jamais les données.
    const corps = opts.miroir
        ? `<g transform="translate(${arr(W)},0) scale(-1,1)">${d}</g>` : d;

    return `<svg class="fig-svg cu-svg${opts.classe ? ` ${opts.classe}` : ''}"
        viewBox="0 0 ${arr(W)} ${arr(H)}" role="img"
        aria-label="Un empilement de cubes">${corps}</svg>`;
}
