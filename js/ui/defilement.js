// « IL Y EN A ENCORE À CÔTÉ » — signaler qu'un conteneur défile.
//
// Un tableau plus large que l'écran se coupe net au bord droit. Rien ne dit
// qu'il continue : on croit avoir tout vu, et on répond sur la moitié des
// données. Le cas se produit sur le tableau de proportionnalité à cinq
// colonnes, sur le tableau de numération, sur la barre des ingrédients.
//
// Le signal est un simple fondu du bord — mais il ne doit apparaître QUE
// lorsqu'il y a vraiment quelque chose au-delà, sinon il ment dans l'autre
// sens et on cherche un contenu qui n'existe pas. D'où cet observateur : il
// mesure, et il écrit le côté concerné dans un attribut que le CSS lit.

const OBSERVES = new WeakMap();

function majOmbre(el) {
    const marge = 2;                       // tolérance d'arrondi des sous-pixels
    const gauche = el.scrollLeft > marge;
    const droite = el.scrollLeft + el.clientWidth < el.scrollWidth - marge;
    const cote = gauche && droite ? 'deux' : gauche ? 'gauche' : droite ? 'droite' : '';
    if (cote) el.dataset.suite = cote;
    else delete el.dataset.suite;
}

/**
 * Marque un conteneur défilant horizontalement.
 *
 * On observe le REDIMENSIONNEMENT autant que le défilement : une rotation
 * d'écran ou un panneau qui s'ouvre change la largeur disponible sans qu'on
 * ait touché à la barre, et l'indication doit suivre.
 */
export function suivreDefilement(el) {
    if (!el || OBSERVES.has(el)) return;
    el.classList.add('defile-x');
    const maj = () => majOmbre(el);
    el.addEventListener('scroll', maj, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(maj) : null;
    if (ro) { ro.observe(el); if (el.firstElementChild) ro.observe(el.firstElementChild); }
    OBSERVES.set(el, { maj, ro });
    maj();
    // Le contenu peut arriver après (police chargée, image décodée) : une
    // seconde mesure au tour suivant évite un fondu absent au premier affichage.
    requestAnimationFrame(maj);
}

/** Recalcule après un changement de contenu fait à la main. */
export function rafraichirDefilement(el) {
    if (el && OBSERVES.has(el)) OBSERVES.get(el).maj();
}
