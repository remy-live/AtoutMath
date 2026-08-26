// COLORIER EN GLISSANT — le geste qu'on fait sans y penser.
//
// Rémy, banc d'essai du Mac : « Le Symétrique aux Carreaux : ne fonctionne
// pas », « Tracer l'Image d'une Figure : ne fonctionne pas ». Les deux
// marchaient pourtant : un clic franc coloriait bien sa case, l'indice posait
// les siennes, « Valider » comptait juste. Ce qui ne marchait pas, c'est LE
// GESTE — appuyer sur une case et balayer les suivantes sans relâcher.
//
// Et ce n'était pas seulement « le glissé ne peint pas les cases suivantes » :
// il n'en peignait AUCUNE, pas même la première. Un `click` ne se déclenche
// que si l'appui et le relâchement tombent sur le MÊME élément ; en partant
// d'une case pour finir sur une autre, l'événement remonte au parent commun et
// personne ne l'écoute. On appuie, on balaye, on relâche : rien. Le jeu ne
// « ne fonctionne pas » qu'aux yeux de celui qui fait ce geste-là — mais c'est
// le geste naturel pour colorier, et Rémy le demandait déjà pour Tasuko : « on
// pourrait aussi cliquer sans relâcher et glisser ».
//
// LES DEUX COMPORTEMENTS COHABITENT, il n'y en a pas un qui remplace l'autre :
// un clic franc bascule sa case, un glissé peint tout ce qu'il touche.
//
// LE GLISSÉ PEINT, IL NE BASCULE PAS. C'est la différence qui compte : si le
// balayage basculait, repasser sur une case déjà peinte l'effacerait, et un
// aller-retour du doigt annulerait tout le travail. On décide donc du sens au
// PREMIER contact — la case de départ était-elle vide ? alors on peint ; était-
// elle pleine ? alors on efface — et l'on tient ce sens jusqu'au relâchement.

/**
 * Rend une grille peignable au glissé, à la souris comme au doigt.
 *
 * @param {Element} racine        - l'élément qui contient les cases
 * @param {Object}  opts
 * @param {string}  opts.selecteur - le sélecteur d'une case (ex. '.qd-hit')
 * @param {(el:Element)=>boolean} opts.estPleine - cette case est-elle déjà peinte ?
 * @param {(el:Element, peindre:boolean)=>void} opts.appliquer - peindre ou effacer
 * @param {()=>boolean} [opts.bloque] - le jeu est-il verrouillé ?
 * @returns {Function} de quoi tout débrancher
 */
export function peindreAuGlisse(racine, { selecteur, estPleine, appliquer, bloque }) {
    if (!racine) return () => { };
    let sens = null;              // true = on peint, false = on efface
    let derniere = null;          // pour ne pas retraiter la même case cent fois

    const caseSous = (ev) => {
        // `elementFromPoint` plutôt que `ev.target` : pendant un glissé, le
        // navigateur continue d'envoyer les événements à la case de DÉPART
        // (capture implicite du pointeur). Sans cela, on repeindrait toujours
        // la même.
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        return el && el.closest ? el.closest(selecteur) : null;
    };

    const traiter = (el) => {
        if (!el || el === derniere) return;
        derniere = el;
        if (sens === null) sens = !estPleine(el);
        // On n'applique que dans le sens choisi : repasser sur une case déjà
        // dans l'état voulu ne fait rien, et l'aller-retour ne détruit rien.
        if (estPleine(el) !== sens) appliquer(el, sens);
    };

    const debut = (ev) => {
        if (bloque && bloque()) return;
        // Bouton gauche seulement, et pas de sélection de texte en travers.
        if (ev.pointerType === 'mouse' && ev.button !== 0) return;
        const el = caseSous(ev);
        if (!el) return;
        ev.preventDefault();
        sens = null; derniere = null;
        traiter(el);
        racine.setPointerCapture && ev.pointerId != null && racine.setPointerCapture(ev.pointerId);
    };
    const bouge = (ev) => {
        if (sens === null && derniere === null) return;   // pas de glissé en cours
        traiter(caseSous(ev));
    };
    const fin = () => { sens = null; derniere = null; };

    racine.addEventListener('pointerdown', debut);
    racine.addEventListener('pointermove', bouge);
    // Sur `window` : relâcher hors de la grille doit terminer le geste, sinon
    // le prochain survol continuerait de peindre sans qu'on appuie.
    window.addEventListener('pointerup', fin);
    window.addEventListener('pointercancel', fin);

    return () => {
        racine.removeEventListener('pointerdown', debut);
        racine.removeEventListener('pointermove', bouge);
        window.removeEventListener('pointerup', fin);
        window.removeEventListener('pointercancel', fin);
    };
}
