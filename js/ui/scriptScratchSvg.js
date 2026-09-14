// UN SCRIPT SCRATCH, DESSINÉ — pour qui a un programme à MONTRER.
//
// Rémy, banc d'essai de l'Automate : « les blocs sont très mal imbriqués pour
// les boucles, utilise des blocs scratch que l'on a déjà ».
//
// Il a raison sur les deux points. L'Automate se dessinait ses blocs lui-même,
// en CSS : des rectangles à tenon, et pour la boucle un faux C — une barre
// verticale à gauche, un petit pied en bas, et rien qui ferme la forme. Dans
// Scratch, une boucle est UNE SEULE PIÈCE qui ENVELOPPE ce qu'elle répète :
// c'est cette silhouette-là qui dit « tout ce qui est dedans se refait », et
// c'est exactement la notion qu'on veut faire voir. Une barre de couleur ne le
// dit pas — elle décore.
//
// Et le projet avait déjà la forme : `core/blocScratch.js` la donne en
// segments, l'atelier du Chat Géomètre en fait du SVG, la fiche imprimée en
// fait du PDF. En redessiner une troisième, c'était s'assurer qu'elles
// divergent. Ce module ne fait donc que POSER ces pièces les unes sous les
// autres — la forme vient d'ailleurs, comme partout ailleurs.
//
// IL NE DESSINE QU'À LIRE. Rien ici ne se glisse ni ne se dépose : c'est
// l'atelier qui sert à écrire un programme. Ici on en montre un, déjà écrit,
// et l'on veut pouvoir désigner un bloc — d'où le `data-bloc` sur chaque
// pièce, qui est tout ce dont l'appelant a besoin pour l'allumer.

import { U, silhouette, versSvg, largeurTexte } from '../core/blocScratch.js';

/** Les trois familles de Scratch, à leurs couleurs. */
export const COULEURS_BLOC = {
    mouvement: '#4c97ff',
    controle: '#ffab19',
    apparence: '#40bf4a',
    evenement: '#ffbf00'
};

const MARGE = U.margeG;
/** La place que prend le compteur de tours, à droite de l'en-tête d'une boucle. */
const PLACE_TOUR = 46;

/**
 * @param {Array} blocs  [{ id, texte, famille, corps? }] — `corps` fait une boucle
 * @param {Object} [opts]
 *   `u`      l'échelle (1 = l'unité de blocScratch, où une pièce fait 40 de haut)
 *   `classe` classe CSS posée sur le `<svg>`
 * @returns {string} le SVG complet, prêt à être inséré
 */
export function scriptScratchSvg(blocs, { u = 1, classe = 'sb-script' } = {}) {
    const mesures = blocs.map(mesurer);
    const largeur = Math.max(40, ...mesures.map(m => m.largeur));
    let y = 0;
    let d = '';
    blocs.forEach((b, i) => {
        d += dessiner(b, mesures[i], 0, y);
        y += mesures[i].hauteur;
    });
    // La hauteur totale compte le tenon du dernier bloc, qui dépasse.
    const h = y + 4;
    return `<svg class="${classe}" viewBox="0 0 ${arr(largeur + 2)} ${arr(h)}"
        width="${arr((largeur + 2) * u)}" height="${arr(h * u)}"
        role="img" aria-label="programme">${d}</svg>`;
}

/**
 * LA MESURE PRÉCÈDE LE DESSIN, et c'est ce que la version CSS ne faisait pas :
 * une boucle doit connaître la hauteur de ce qu'elle enveloppe AVANT de tracer
 * sa propre silhouette, puisque c'est cette hauteur qui creuse sa bouche.
 */
function mesurer(b) {
    const texte = Math.ceil(largeurTexte(b.texte)) + 2 * MARGE
        + (b.corps ? PLACE_TOUR : 0);
    if (!b.corps) return { largeur: texte, hauteur: U.ligne, enfants: [] };
    const enfants = b.corps.map(mesurer);
    const bouche = enfants.length
        ? enfants.reduce((s, e) => s + e.hauteur, 0)
        : U.boucheVide;
    return {
        largeur: Math.max(texte, U.retrait + Math.max(0, ...enfants.map(e => e.largeur))),
        hauteur: U.ligne + bouche + U.basBoucle,
        bouche, enfants
    };
}

function dessiner(b, m, x, y) {
    const famille = COULEURS_BLOC[b.famille] ? b.famille : 'mouvement';
    const forme = silhouette(b.corps
        ? { genre: 'boucle', largeur: m.largeur, bouche: m.bouche }
        : { genre: 'simple', largeur: m.largeur });

    let d = `<g class="sb-bloc sb-bloc--${famille}" data-bloc="${echapper(b.id)}">`
        + `<path d="${versSvg(forme, { x, y })}" fill="${COULEURS_BLOC[famille]}"/>`
        + `<text x="${arr(x + MARGE)}" y="${arr(y + U.ligne / 2)}" fill="#fff"
            font-size="${U.texte}" font-weight="700" dominant-baseline="central"
            font-family="Helvetica, Arial, sans-serif">${echapper(b.texte)}</text>`;

    if (b.corps) {
        // LE COMPTEUR DE TOURS, dans l'en-tête même de la boucle. C'est là
        // qu'on le cherche : « répéter 3 fois » et « tour 2 sur 3 » parlent de
        // la même chose, et les séparer obligerait à faire l'aller-retour.
        d += `<g class="sb-tour" data-tour="${echapper(b.id)}" style="visibility:hidden">`
            + `<rect x="${arr(x + m.largeur - PLACE_TOUR)}" y="${arr(y + 8)}"
                width="${arr(PLACE_TOUR - MARGE)}" height="${arr(U.ligne - 16)}" rx="9"
                fill="rgba(0,0,0,.3)"/>`
            + `<text x="${arr(x + m.largeur - PLACE_TOUR / 2 - MARGE / 2)}"
                y="${arr(y + U.ligne / 2)}" fill="#fff" font-size="${U.texte - 2}"
                font-weight="800" text-anchor="middle" dominant-baseline="central"
                font-family="Helvetica, Arial, sans-serif" data-tour-texte=""></text></g>`;
        d += '</g>';
        let yc = y + U.ligne;
        b.corps.forEach((c, i) => {
            d += dessiner(c, m.enfants[i], x + U.retrait, yc);
            yc += m.enfants[i].hauteur;
        });
        return d;
    }
    return d + '</g>';
}

const arr = (v) => Math.round(v * 100) / 100;
const echapper = (s) => String(s == null ? '' : s)
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
