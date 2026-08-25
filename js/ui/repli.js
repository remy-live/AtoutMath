// LES RÉGLAGES QU'ON NE RÈGLE QU'UNE FOIS SE RANGENT.
//
// Rémy, devant le panneau d'une fiche : « tu trouves pas que c'est indigeste,
// qu'il y a tellement d'options ». Quinze réglages avant même de voir la
// feuille, oui.
//
// Ils ne se valent pourtant pas. Certains se décident POUR CETTE FICHE-LÀ —
// est-ce une interrogation, quel titre, avec ou sans corrigé — et l'on y
// revient à chaque fois. Les autres sont des habitudes de maison : le format
// du papier, la couleur de l'imprimante, les cases de l'en-tête, la façon de
// numéroter. On les règle une fois en septembre et on n'y touche plus de
// l'année. Les mettre au même niveau, c'est faire payer à chaque fiche le prix
// d'un choix déjà fait.
//
// D'où ce repli : les premiers restent en vue, les seconds attendent derrière
// un titre qu'on ouvre quand on en a besoin — ET QUI SE SOUVIENT. Un
// professeur qui aime tout voir ouvre une fois ; le panneau restera ouvert.
//
// C'est un `<details>` du navigateur, pas un accordéon fait à la main : il
// s'ouvre au clavier, il s'annonce aux lecteurs d'écran, et il fonctionne même
// si ce fichier n'est jamais chargé.

const PREFIXE = 'mathbox-repli-';

/**
 * Retient l'état d'un repli d'une session à l'autre.
 *
 * @param {HTMLDetailsElement} details - le bloc repliable
 * @param {string} cle - son nom, unique dans l'application
 * @param {boolean} [ouvertParDefaut] - à la toute première ouverture
 */
export function retenirRepli(details, cle, ouvertParDefaut = false) {
    if (!details) return;
    let memoire = null;
    try { memoire = window.localStorage.getItem(PREFIXE + cle); } catch (e) { memoire = null; }
    details.open = memoire === null ? !!ouvertParDefaut : memoire === '1';
    details.addEventListener('toggle', () => {
        try { window.localStorage.setItem(PREFIXE + cle, details.open ? '1' : '0'); } catch (e) { /* privé */ }
    });
}
