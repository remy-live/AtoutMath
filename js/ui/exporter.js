// SORTIR UN TEXTE DE L'APPLICATION : le presse-papiers, ou un fichier.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// POURQUOI CE MODULE EXISTE. Le dépôt copie dans le presse-papiers à neuf
// endroits, et chacun réécrit le même repli de six lignes : `navigator.clipboard`
// est REFUSÉ hors HTTPS et sur certains navigateurs, et quand il refuse il faut
// montrer le texte dans une zone sélectionnable — sinon le bouton ne fait rien
// et l'on croit que le logiciel est cassé.
//
// Les deux ateliers ajoutés ici auraient été le dixième et le onzième. On écrit
// le repli une fois.
//
// ON NE RÉÉCRIT PAS LES NEUF AUTRES dans la même passe : ils marchent, et
// toucher neuf fichiers pour une refonte cosmétique est le genre de diff qu'on
// ne relit pas. Ils viendront quand on passera dessus pour une autre raison.

/**
 * COPIER UN TEXTE, en disant sur le bouton lui-même que c'est fait.
 *
 * Le bouton EST le retour : un `showToast` passe en haut de l'écran pendant
 * qu'on regarde le bas, et un atelier est un écran chargé. Mesuré sur l'export
 * des verdicts du quotidien, qui fait déjà ainsi.
 *
 * @param {HTMLElement} bouton
 * @param {string} texte
 * @param {string} libelle  ce que le bouton dit au repos
 */
export async function copierDans(bouton, texte, libelle) {
    try {
        await navigator.clipboard.writeText(texte);
        bouton.textContent = '✓ Copié';
    } catch (e) {
        bouton.textContent = '⚠ Copie refusée — le texte est sélectionné';
        // LE TEXTE RESTE ATTEIGNABLE QUAND LE PRESSE-PAPIERS REFUSE. On ne
        // fabrique pas une zone de plus : s'il y en a déjà une à côté — les deux
        // ateliers en montrent une —, c'est celle-là qu'on sélectionne.
        const zone = bouton.closest('.dgl-panneau, .atq-panneau, .modal-panel-lg')
            ?.querySelector('textarea[data-export]');
        if (zone) { zone.value = texte; zone.focus(); zone.select(); }
    }
    setTimeout(() => { bouton.textContent = libelle; }, 2600);
}

/**
 * TÉLÉCHARGER UN TEXTE SOUS UN NOM DE FICHIER.
 *
 * Rémy travaille aussi depuis son téléphone, où le presse-papiers d'une
 * application web se perd d'un onglet à l'autre : un fichier, lui, atterrit dans
 * « Téléchargements » et s'envoie par courriel.
 */
export function telechargerTexte(nom, texte, type = 'application/json') {
    const a = document.createElement('a');
    const url = URL.createObjectURL(new Blob([texte], { type: `${type};charset=utf-8` }));
    a.href = url;
    a.download = nom;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // On libère l'objet, mais pas tout de suite : Safari annule le
    // téléchargement si l'URL meurt avant qu'il ne l'ait lue.
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return nom;
}

/** La date du jour en ISO court, pour nommer un fichier sans y penser. */
export function jourPourFichier() {
    const d = new Date();
    const p = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
