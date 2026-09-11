// L'ÉNONCÉ SE RÈGLE SUR SA LONGUEUR.
//
// Rémy, banc du Mac : « globalement les énoncés ont une police énorme ».
//
// LA MÊME TAILLE POUR « 7 × 8 » ET POUR UNE PHRASE EST FORCÉMENT FAUSSE POUR
// L'UNE DES DEUX. Un calcul mental est un objet qu'on lit d'un coup d'œil : il
// doit dominer l'écran, et à 2,9 rem c'est parfait. « Par rapport à quoi la
// pièce A est-elle le symétrique de la pièce C ? » fait soixante-dix
// caractères : à la même taille, cela prend deux lignes de quarante-six pixels
// de haut, soit le tiers supérieur de l'écran — et la FIGURE, qui est ce qu'il
// faut vraiment regarder, se retrouve reléguée en dessous, plus petite que la
// question qui la commente.
//
// La question doit dominer, pas régner. On la range donc en quatre paliers de
// longueur : plus elle est longue, plus elle se calme, et plus elle laisse de
// place à ce dont elle parle.
//
// POURQUOI UN OBSERVATEUR ET NON UN APPEL DANS CHAQUE ACTIVITÉ. `.game-question`
// est écrite par une trentaine d'endroits — les activités, les jeux
// historiques, les générateurs qui rendent leur propre HTML. Ajouter un appel
// dans chacun, c'est en oublier un aujourd'hui et trois demain. Un observateur
// posé une fois sur la zone de jeu les attrape tous, y compris ceux qui
// n'existent pas encore.
//
// LA LONGUEUR SE MESURE SUR LE TEXTE, pas sur le HTML : un énoncé qui met un
// nombre en valeur porte des balises, et les compter le ferait passer pour
// long alors qu'il tient en trois mots.

/**
 * Les paliers, du plus court au plus long. Le premier sans classe : c'est la
 * taille de base, celle du calcul mental, et elle ne change pas.
 */
export const PALIERS_ENONCE = [
    { jusqua: 14, classe: '' },
    { jusqua: 34, classe: 'game-question--moyen' },
    { jusqua: 72, classe: 'game-question--long' },
    { jusqua: Infinity, classe: 'game-question--tres-long' }
];

const CLASSES = PALIERS_ENONCE.map(p => p.classe).filter(Boolean);

/** Le palier d'un énoncé, à sa longueur en caractères. */
export function palierEnonce(texte) {
    const n = String(texte || '').replace(/\s+/g, ' ').trim().length;
    return (PALIERS_ENONCE.find(p => n <= p.jusqua) || PALIERS_ENONCE[PALIERS_ENONCE.length - 1]).classe;
}

/** Pose le bon palier sur un élément d'énoncé. */
export function ajusterEnonce(el) {
    if (!el || !el.classList) return;
    const voulu = palierEnonce(el.textContent);
    CLASSES.forEach(c => el.classList.toggle(c, c === voulu));
}

/** Tous les énoncés d'un sous-arbre. */
export function ajusterEnonces(racine) {
    if (!racine || !racine.querySelectorAll) return;
    if (racine.classList && racine.classList.contains('game-question')) ajusterEnonce(racine);
    racine.querySelectorAll('.game-question').forEach(ajusterEnonce);
}

/**
 * Surveille une zone : tout énoncé qui y apparaît est réglé à sa longueur.
 *
 * On ne réagit qu'aux AJOUTS de nœuds, pas aux changements de classe — sans
 * quoi la classe qu'on pose relancerait l'observateur, qui la reposerait, à
 * l'infini.
 */
export function surveillerEnonces(racine) {
    if (!racine || racine._enoncesSurveilles || typeof MutationObserver === 'undefined') return;
    racine._enoncesSurveilles = true;
    ajusterEnonces(racine);
    new MutationObserver((mutations) => {
        for (const m of mutations) {
            m.addedNodes.forEach(n => { if (n.nodeType === 1) ajusterEnonces(n); });
        }
    }).observe(racine, { childList: true, subtree: true });
}
