// LA LEÇON, HABILLÉE — le pendant visible de `core/lecon.js`.
//
// Rémy : « quand tu vois l'explication, ça donne pas envie de lire, il faut une
// belle mise en page, du retour à la ligne, de la couleur ».
//
// Le découpage vit dans le noyau, où il se teste sans navigateur ; ce fichier
// ne fait que poser des balises dessus. La séparation n'est pas de la
// coquetterie : c'est elle qui permet d'affirmer, par un test, qu'aucune leçon
// ne perd un mot en chemin — ce qu'on ne pourrait pas vérifier sur du HTML.

import { decouperLecon } from '../core/lecon.js';

const echapper = (t) => String(t).replace(/[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Les morceaux d'un paragraphe : texte ordinaire, mot fort, calcul. */
const morceauxHtml = (liste) => liste.map(m => {
    if (m.genre === 'fort') return `<b class="lc-fort">${echapper(m.texte)}</b>`;
    if (m.genre === 'calcul') return `<span class="lc-calc">${echapper(m.texte)}</span>`;
    return echapper(m.texte);
}).join('');

/**
 * La leçon en HTML.
 *
 * UN CAS PORTE SON NOM COMME UN INTERTITRE. « MÊME SIGNE », « SIGNES
 * DIFFÉRENTS » : c'est exactement la question que l'élève se pose devant son
 * exercice — « je suis dans quel cas ? » —, et la réponse doit se trouver en
 * balayant la page, sans lire la phrase qui précède.
 *
 * @param {string} texte  la leçon telle qu'elle est écrite dans `data/skills.js`
 * @returns {string} du HTML, ou une chaîne vide s'il n'y a rien à dire
 */
export function leconHtml(texte) {
    const blocs = decouperLecon(texte);
    if (!blocs.length) return '';
    return `<div class="lc">${blocs.map(b => (b.genre === 'cas'
        ? `<div class="lc-cas"><span class="lc-cas-nom">${echapper(b.titre)}</span>
             <span class="lc-cas-corps">${morceauxHtml(b.morceaux)}</span></div>`
        : `<p class="lc-p">${morceauxHtml(b.morceaux)}</p>`)).join('')}</div>`;
}
