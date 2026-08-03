// L'écran de leçon du mode apprentissage.
//
// Il vit dans la couche interface, et non dans le catalogue, pour une raison
// précise : une règle se MONTRE. « L'origine d'une demi-droite s'écrit en
// premier » ne veut rien dire tant qu'on n'a pas vu les deux dessins côte à
// côte. Le catalogue décrit donc la figure qu'il veut (`figure: { type… }`),
// et c'est ici qu'on va la chercher — les données ne connaissent pas le SVG,
// et `figures.js` reste pur.

import { notationSvg } from '../core/figures.js';

/** Figures illustratives, nommées par le catalogue. */
const FIGURES = {
    // Un objet de géométrie tracé sur deux points : segment, droite ou
    // demi-droite. C'est le dessin qui distingue les trois, pas le nom.
    notation: ({ objet = 'segment', p = 'A', q = 'B' }) =>
        `<div class="lec-figure">${notationSvg({ objet, p, q })}</div>`
};

function illustration(regle) {
    if (regle.exemple) return `<div class="lec-exemple">${regle.exemple}</div>`;
    if (regle.figure && FIGURES[regle.figure.type]) return FIGURES[regle.figure.type](regle.figure);
    return '';
}

/**
 * @param {Object} lecon - { titre, intro, regles[], paliers[] }
 * @param {() => void} onCommencer
 * @returns {string} le HTML à poser dans le plateau
 */
export function leconHtml(lecon) {
    const regles = (lecon.regles || []).map((r, i) => `
        <li class="lec-regle">
            <span class="lec-num" aria-hidden="true">${i + 1}</span>
            <div class="lec-corps">
                <div class="lec-regle-titre">${r.titre}</div>
                ${r.texte ? `<p class="lec-regle-texte">${r.texte}</p>` : ''}
                ${illustration(r)}
            </div>
        </li>`).join('');

    // Les paliers annoncés d'avance : savoir que ça va monter, et jusqu'où,
    // change le rapport à l'échec du premier essai.
    const paliers = (lecon.paliers || []).length > 1
        ? `<div class="lec-paliers">
               ${lecon.paliers.map((t, i) => `<span class="lec-palier">${i + 1}. ${t}</span>`).join('')}
           </div>`
        : '';

    return `
        <div class="run-screen lec-screen">
            <div class="lec-chapeau">
                <span class="lec-badge" aria-hidden="true">🎓</span>
                <h2 class="run-screen-title">${lecon.titre}</h2>
            </div>
            ${lecon.intro ? `<p class="lec-intro">${lecon.intro}</p>` : ''}
            <ol class="lec-regles">${regles}</ol>
            ${paliers}
            <button id="btn-lecon-go" class="btn-toggle active run-screen-btn">J'ai compris, on commence</button>
        </div>`;
}
