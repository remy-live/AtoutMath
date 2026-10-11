// QUELLE PRÉSENTATION, ET QUI DÉCIDE — le téléphone ou le réglage mémorisé.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture d'un iPhone : « quand j'ouvre le menu de gauche c'est le bazar
// en haut et surtout je n'arrive plus à le fermer. »
//
// LA CAUSE N'ÉTAIT PAS DANS LE MENU. La palette de test porte un bouton 📱 qui
// écrit `mathbox-device` dans le stockage local, et ce choix l'emportait
// ensuite sur la détection, POUR TOUJOURS :
//
//     state.isMobileView = choix ? choix === 'mobile' : telephonePortrait();
//
// Un appui — facile sur un téléphone, où la palette est large comme le pouce —
// épinglait donc son iPhone en présentation « ordinateur », sans retour
// possible pour qui ne connaît pas ce bouton.
//
// MESURÉ dans cet état exact, 390 × 844, tactile, professeur :
//
//     menu 250 px · page 140 px · aucune poignée de tiroir
//     le ☰ ne referme rien · « Prof » chevauche « Préparer » de 18 × 15 px
//
// C'est sa capture, au pixel près. Et tout le soin déjà pris pour cette barre
// est écrit sous `body.mobile-view` — deux rangées au lieu de trois, le plein
// écran retiré, les onglets qui gardent leur nom, le tiroir et sa poignée.
// Rien ne s'appliquait, pour cette seule raison.
//
// ── LES DEUX SENS NE SE VALENT PAS, ET C'EST TOUTE LA RÈGLE ─────────────────
//
// On pourrait croire le réglage symétrique. Il ne l'est pas :
//
//   · « mobile » sur un grand écran est UTILE — c'est ainsi qu'on regarde la
//     présentation du téléphone sans téléphone, et c'est pour cela que le
//     bouton existe. On l'honore toujours.
//   · « ordinateur » sur un téléphone en portrait ne rend AUCUN service : il
//     donne deux colonnes dont l'une fait cent quarante pixels. La détection
//     reprend la main.
//
// Autrement dit : le choix mémorisé peut AJOUTER une présentation que
// l'appareil n'aurait pas eue, jamais RETIRER celle dont il a besoin. Le
// réglage n'est pas effacé pour autant — il reprend effet dès que l'écran peut
// le porter, en paysage ou sur une tablette.
//
// LA RÈGLE VIT ICI ET NON DANS `app.js` parce qu'elle est subtile : une
// réécriture qui la rendrait symétrique paraîtrait plus propre et retirerait
// l'usage du bouton sans que personne ne s'en aperçoive. Ici, elle s'éprouve
// sans navigateur.

/**
 * Faut-il la présentation « téléphone » ?
 *
 * @param {?string} choix - ce que le réglage a mémorisé : 'mobile',
 *        'desktop', ou rien du tout.
 * @param {boolean} telephonePortrait - ce que l'appareil dit de lui-même :
 *        écran étroit ET pointeur grossier.
 * @returns {boolean}
 */
export function presentationMobile(choix, telephonePortrait) {
    // Un seul cas où le réglage l'emporte, et c'est celui qui AJOUTE.
    if (choix === 'mobile') return true;
    return !!telephonePortrait;
}
