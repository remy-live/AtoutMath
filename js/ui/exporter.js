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
 * SORTIR UN TEXTE SANS JAMAIS DÉPENDRE DU PRESSE-PAPIERS.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *
 * RÉMY : « j'ai mis copier les verdicts, ça ne copie rien, et j'ai tout trié
 * dans tout le quotidien, je ne veux pas que mon travail soit supprimé. »
 *
 * Deux cents entrées triées une par une, et le bouton qui les sort ne rend
 * rien. Mesuré au navigateur sur ce dépôt : le presse-papiers RÉUSSIT —
 * l'épreuve passe. Elle passe parce qu'elle mesure Chromium, en contexte sûr,
 * la fenêtre au premier plan. Rien de tout cela n'est garanti chez lui :
 * `navigator.clipboard` n'existe PAS hors HTTPS, Safari refuse l'écriture si
 * le geste n'est plus « récent », et un presse-papiers d'application web se
 * perd d'un onglet à l'autre sur iPhone.
 *
 * UN BOUTON QUI PEUT NE RIEN FAIRE N'EST PAS UN BOUTON. Celui-ci fait TOUJOURS
 * quelque chose de visible : il pose le texte dans une zone à l'écran, et le
 * presse-papiers n'est qu'un bonus par-dessus. On ne peut plus cliquer et ne
 * rien obtenir.
 *
 * @param {HTMLElement} bouton   celui qu'on vient de toucher
 * @param {string} texte         ce qu'on veut sortir
 * @param {string} libelle       ce que le bouton dit au repos
 * @param {HTMLElement} [apres]  l'élément après lequel poser la zone
 */
export async function copierOuMontrer(bouton, texte, libelle, apres) {
    const hote = apres || bouton.parentElement;
    let zone = hote.parentElement && hote.parentElement.querySelector('[data-sortie-texte]');
    if (!zone) {
        zone = document.createElement('textarea');
        zone.className = 'sortie-texte';
        zone.readOnly = true;
        zone.setAttribute('data-sortie-texte', '');
        zone.setAttribute('aria-label', 'Le texte à m\'envoyer');
        hote.after(zone);
    }
    zone.value = texte;
    // ON SÉLECTIONNE, TOUJOURS. Même quand le presse-papiers a marché : c'est
    // le dernier recours si la copie s'est perdue entre deux applications, et
    // il ne coûte rien.
    zone.focus();
    zone.select();
    try {
        await navigator.clipboard.writeText(texte);
        bouton.textContent = '✓ Copié — et le texte est ci-dessous';
    } catch (e) {
        bouton.textContent = '⚠ Copie refusée — le texte est ci-dessous, sélectionné';
    }
    setTimeout(() => { bouton.textContent = libelle; }, 3600);
    return zone;
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
