// UN BOUTON QU'ON DÉSACTIVE EMPORTE LE FOYER AVEC LUI — et le clavier s'éteint.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'ai un petit bug sur enlever les parenthèses, parfois le bouton
// valider est inactif ».
//
// ── LA CHAÎNE, MESURÉE EN ENTIER ────────────────────────────────────────────
//
// `tools/boutonValiderInactif.mjs` joue l'exercice au clavier, puis
// `tools/tmp/ouVaLeFoyer.mjs` relève `document.activeElement` tous les dixièmes
// de seconde. Ce qu'on voit :
//
//   1. à l'ouverture, le foyer est sur le conteneur de l'activité : on tape,
//      ça s'écrit, le bouton « Valider » s'allume ;
//   2. l'élève CLIQUE « Valider » — le foyer passe au bouton. Les frappes
//      marchent encore : l'événement remonte du bouton au conteneur ;
//   3. l'étape suivante s'ouvre, le champ se vide, et le code fait
//      `btnValider.disabled = true` ;
//   4. **UN ÉLÉMENT DÉSACTIVÉ NE PEUT PAS GARDER LE FOYER.** Le navigateur le
//      lui retire, et comme rien ne le reprend, il tombe sur `<body>` — hors du
//      conteneur. Relevé mot pour mot : « focusout de ls-valider vers (aucun) ».
//   5. l'écoute du clavier vit sur le CONTENEUR : elle ne voit plus rien.
//      L'élève tape sa ligne suivante, RIEN NE S'ÉCRIT, donc le champ reste
//      vide, donc le bouton reste éteint. Il est bloqué.
//
// ── POURQUOI « PARFOIS » ÉTAIT LE MOT JUSTE ─────────────────────────────────
//
// Le défaut n'apparaît qu'à partir de la DEUXIÈME ligne d'une question
// découpée, seulement au clavier physique — au doigt, les touches du pavé ont
// leur `onclick` et se moquent du foyer —, et **une seule touche du pavé remet
// tout en marche**, puisqu'elle est dans le conteneur. Trois conditions, dont
// une qui se répare toute seule : c'est exactement la forme d'un défaut qu'on
// ne reproduit pas en le cherchant.
//
// ── POURQUOI CE FICHIER, ET NON TROIS LIGNES DANS CHAQUE ÉCRAN ──────────────
//
// PARCE QUE LA FORME EST PARTAGÉE, ET QU'ON L'A MESURÉE AILLEURS. Quatre
// activités posent un `[data-valider]` qu'elles désactivent et écoutent le
// clavier sur leur conteneur :
//
//   · `litteralSaisie.js`   — MESURÉ CASSÉ. Le défaut de Rémy.
//   · `fractionsBandes.js`  — MESURÉ CASSÉ aussi : sur « L'Égalité à Compléter »,
//                             après « Valider », foyer sur BODY et le clavier
//                             muet. Il ne l'avait pas encore signalé.
//   · `fractionsPose.js`    — MESURÉ SAIN aujourd'hui : le foyer retombe sur une
//                             touche `.fa-touche`, qui est dans le conteneur. Il
//                             n'en est pas pour autant protégé : le jour où
//                             cette touche sera désactivée à son tour, il
//                             tombera comme les autres.
//   · `notationSaisie.js`   — même forme.
//
// Trois corrections écrites séparément auraient divergé, et c'est la quatrième
// fois en trois jours qu'on paye ce motif : la corbeille des parcours, la carte
// du monde, le « + » facultatif. **Une correction posée sur un seul des chemins
// qui mènent au même endroit ne ferme rien.**
//
// ── CE QU'ON NE FAIT PAS ────────────────────────────────────────────────────
//
// ON NE DÉPLACE PAS L'ÉCOUTE SUR `document`. Ce serait la correction d'une
// ligne, et elle attraperait les frappes destinées à un autre écran — une boîte
// de dialogue, un champ de recherche, l'espace du professeur ouvert par-dessus.
// On rend le foyer à celui qui doit l'avoir, ce qui est la question réelle.

/**
 * RENDRE LE FOYER AU CONTENEUR D'UNE ACTIVITÉ, s'il s'en est échappé.
 *
 * @param {HTMLElement} conteneur  celui qui porte l'écoute du clavier
 * @param {object} [opts]
 * @param {boolean} [opts.force]   le rendre même si le foyer semble encore
 *   dedans. À passer quand on vient de désactiver l'élément qui l'avait :
 *   selon le navigateur, le retrait du foyer peut n'être pas encore arrivé, et
 *   l'on ne veut pas dépendre de cet ordre-là.
 * @param {boolean} [opts.occupe]  vrai quand un autre écran a la main — une
 *   bannière de correction qui attend « J'ai compris », par exemple. Lui voler
 *   le foyer rendrait SON bouton inatteignable au clavier : on aurait déplacé
 *   le défaut au lieu de le corriger.
 * @returns {boolean} vrai si le foyer a été rendu.
 */
export function rendreLeFoyer(conteneur, { force = false, occupe = false } = {}) {
    if (!conteneur || occupe) return false;
    // `document.activeElement` vaut `<body>` quand personne ne l'a — c'est le
    // cas qu'on corrige — et il peut valoir `null` sur un document qui se
    // démonte. `contains` répond donc faux dans les deux cas, ce qui est juste.
    if (!force && conteneur.contains(document.activeElement)) return false;
    // UN ÉLÉMENT SANS `tabindex` N'EST PAS FOCUSABLE, et `focus()` y échoue en
    // SILENCE : c'est la façon dont cette correction aurait pu ne rien corriger
    // du tout. On le pose donc ici, et non seulement à la fin du montage.
    if (!conteneur.hasAttribute('tabindex')) conteneur.tabIndex = -1;
    // `preventScroll` : sans lui, rendre le foyer fait sauter la page au
    // conteneur, et sur un téléphone l'énoncé disparaît sous la ligne de
    // flottaison à chaque étape.
    conteneur.focus({ preventScroll: true });
    return true;
}

/**
 * LE CAS COURANT, EN UN APPEL : on désactive un bouton, et l'on garde le foyer.
 *
 * Elle existe parce que les quatre écrans écrivaient tous la même suite de
 * trois lignes — lire qui a le foyer, désactiver, le rendre — et que c'est
 * l'ORDRE de ces trois lignes qui est piégeux : lire APRÈS avoir désactivé ne
 * dit plus rien.
 *
 * @param {HTMLElement} bouton      celui qu'on active ou désactive
 * @param {boolean} eteint          vrai pour le désactiver
 * @param {HTMLElement} conteneur   celui qui porte l'écoute du clavier
 * @param {boolean} [occupe]        un autre écran a la main
 */
export function eteindreSansPerdreLeFoyer(bouton, eteint, conteneur, occupe = false) {
    if (!bouton) return;
    const ilAvaitLeFoyer = document.activeElement === bouton;
    bouton.disabled = !!eteint;
    if (eteint && ilAvaitLeFoyer) rendreLeFoyer(conteneur, { force: true, occupe });
    else rendreLeFoyer(conteneur, { occupe });
}
