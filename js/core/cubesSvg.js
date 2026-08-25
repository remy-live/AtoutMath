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
 * @param {{classe?: string}} [opts]
 */
export function cubesSvg(hauteurs, opts = {}) {
    const b = boiteDessin(hauteurs);
    const W = b.largeur + PAD * 2, H = b.hauteur + PAD * 2;
    const X = (v) => arr(v - b.xmin + PAD);
    const Y = (v) => arr(v - b.ymin + PAD);
    const poly = (pts, classe) =>
        `<polygon class="${classe}" points="${pts.map(p => `${X(p.x)},${Y(p.y)}`).join(' ')}"/>`;

    const d = cubesAPeindre(hauteurs).map(({ x, y, z }) => {
        const f = facesCube(x, y, z);
        // L'ordre compte DANS le cube aussi : la face de gauche est peinte
        // avant celle de droite, et le dessus par-dessus les deux — sinon un
        // trait d'arête disparaît sous la face voisine.
        return poly(f.gauche, 'cu-gauche') + poly(f.droite, 'cu-droite') + poly(f.dessus, 'cu-dessus');
    }).join('');

    return `<svg class="fig-svg cu-svg${opts.classe ? ` ${opts.classe}` : ''}"
        viewBox="0 0 ${arr(W)} ${arr(H)}" role="img"
        aria-label="Un empilement de cubes">${d}</svg>`;
}
