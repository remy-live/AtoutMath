// POSER QUELQUE CHOSE CONTRE AUTRE CHOSE, SANS SORTIR DE L'ÉCRAN.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « sur le 9, 10, 11 les paramètres ne sont toujours pas accessibles.
// Depuis tout le temps ! »
//
// Le panneau de réglages s'ouvrait — il tombait simplement SOUS le bas de
// l'écran, et un panneau qu'on ne voit pas ne se distingue pas d'un bouton
// mort. MESURÉ sur une fenêtre de 1400 × 800, en balayant les huit engrenages
// d'une fiche (`tools/tmp/sondeRoue3.mjs`) :
//
//                        avant   après
//   portable 1400×800    5 / 8    0 / 8   panneaux hors de l'écran
//   grand écran 1920     4 / 8    0 / 8
//   paysage court 900×450 7 / 8    0 / 8
//
// Ce n'était donc pas propre aux exercices qu'il nomme : ils sont seulement
// ceux dont le panneau est le plus HAUT — leurs réglages sont des listes à
// cocher, 607 px contre 336 pour un exercice ordinaire —, donc les premiers à
// déborder. Cinq exercices sur huit étaient touchés.
//
// DEUX DÉFAUTS, ET LE SECOND ÉTAIT NÉ D'UNE CORRECTION.
//
//   1. LE REPLI NE BORNAIT QU'UN BORD. `Math.max(8, r.top - haut - 6)` garde le
//      HAUT du panneau dans l'écran et ne regarde jamais son BAS : quand la
//      place manque des deux côtés, il le colle en haut et le laisse déborder
//      par le bas d'autant qu'il est trop grand.
//
//   2. ON MESURAIT AVANT QUE TOUT SOIT LÀ. `brancherMarches` — ajouté quand
//      Rémy avait signalé que la frise de ces mêmes exercices ne s'affichait
//      pas — garnit le bloc du contenu APRÈS coup : mesuré, il le fait passer
//      de 265 à 340 px. Le placement calculait donc juste, sur une hauteur qui
//      n'existait plus une milliseconde après. Une correction en avait créé une
//      autre, et personne n'avait remesuré le placement.
//
// UNE SEULE FONCTION POUR TOUS LES FLOTTANTS. Le même calcul existait en trois
// exemplaires — les deux panneaux de la fiche, et la bulle d'aide écrite le
// jour même. Le troisième portait le même défaut sans qu'on le voie : une
// infobulle est courte, elle ne débordait pas encore. Trois copies, c'est trois
// occasions de corriger deux fois sur trois.

/** La marge qu'on garde entre le flottant et le bord de l'écran. */
export const MARGE_ECRAN = 8;

/**
 * @param {HTMLElement} flottant  posé en `position: fixed`
 * @param {HTMLElement|DOMRect} cible  ce contre quoi on le pose
 * @param {object} [opts]
 * @param {number} [opts.ecart]   entre la cible et le flottant
 * @param {number} [opts.marge]   entre le flottant et le bord
 * @param {boolean} [opts.borner] pose une `max-height` pour que le flottant
 *                                défile plutôt que de dépasser (défaut : oui)
 * @returns {{x:number, y:number, dessous:boolean}}
 */
export function poserContre(flottant, cible, opts = {}) {
    const ecart = opts.ecart === undefined ? 6 : opts.ecart;
    const marge = opts.marge === undefined ? MARGE_ECRAN : opts.marge;
    const r = typeof cible.getBoundingClientRect === 'function'
        ? cible.getBoundingClientRect() : cible;

    // PLUS HAUT QUE L'ÉCRAN : ALORS IL DÉFILE. Sans cela il faudrait choisir
    // quelle moitié on sacrifie — et c'est toujours celle qu'on voulait lire.
    // On borne AVANT de mesurer, pour lire la hauteur qu'il aura vraiment.
    if (opts.borner !== false) {
        flottant.style.maxHeight = `${window.innerHeight - 2 * marge}px`;
    }

    // LA LARGEUR SE POSE AVANT QUE LA HAUTEUR SE LISE. Tant que `left` n'est
    // pas écrit, un élément `position: fixed` reste à sa place statique et
    // prend toute la largeur qu'il veut : mesuré, un panneau fait 547 px ainsi
    // posé et 607 une fois ramené dans sa colonne — soixante pixels de texte
    // qui se replie, et une hauteur fausse pour tout le calcul qui suit.
    // ON MESURE AU RECTANGLE, ET NON À `offsetWidth`/`offsetHeight` : c'est la
    // même chose ici, mais le rectangle dit la vérité même sous une
    // transformation CSS — et la fiche vit dans un aperçu qui se met à
    // l'échelle. Une seule façon de mesurer, partout.
    const large = flottant.getBoundingClientRect().width;
    const x = Math.max(marge, Math.min(r.left + (opts.decalageX || 0),
        window.innerWidth - large - marge));
    flottant.style.left = `${Math.round(x)}px`;

    const haut = flottant.getBoundingClientRect().height;
    // DE QUEL CÔTÉ. On essaie le côté préféré, on bascule s'il n'y a pas la
    // place, et l'on garde le préféré quand aucun des deux ne convient — le
    // rabattage ci-dessous s'occupera du reste.
    //
    // Un PANNEAU pend sous son bouton : c'est le geste attendu d'un menu. Une
    // BULLE se pose au-dessus : en dessous, elle recouvre ce qu'on s'apprête à
    // lire.
    const tientDessous = r.bottom + ecart + haut <= window.innerHeight - marge;
    const tientDessus = r.top - haut - ecart >= marge;
    const dessous = opts.dessousDabord === false
        ? !tientDessus            // préfère au-dessus : ne descend que s'il le faut
        : tientDessous || !tientDessus;   // préfère en dessous

    let y = dessous ? r.bottom + ecart : r.top - haut - ecart;
    // ET DANS TOUS LES CAS RAMENÉ ENTRE LES DEUX BORDS. C'est la ligne qui
    // manquait : sans elle, un flottant trop grand pour l'espace choisi sort
    // par le bas, et il n'y a plus de réglage du tout.
    y = Math.max(marge, Math.min(y, window.innerHeight - haut - marge));

    flottant.style.top = `${Math.round(y)}px`;
    return { x, y, dessous };
}
