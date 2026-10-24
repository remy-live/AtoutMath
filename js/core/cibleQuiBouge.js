// TOUCHER UNE CIBLE QUI BOUGE — et pourquoi `onclick` ne suffit pas.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, sur Les Amis de Dix : « pour les amis de 10, le clic est complexe car
// ca sélectionne le texte que de sélectionner la case qui bouge ».
//
// IL DÉCRIT DEUX DÉFAUTS DANS UNE SEULE PHRASE, et le premier ne se voit pas.
//
// UN `click` N'EST PAS DÉLIVRÉ À CE SUR QUOI ON A APPUYÉ. Le navigateur le
// délivre à l'ANCÊTRE COMMUN de l'élément de l'appui et de celui du
// RELÂCHEMENT. Tant que la cible est immobile, les deux sont le même élément
// et personne n'a jamais besoin de le savoir. Mais une carte qui dérive, un
// astéroïde qui avance, sortent de sous le doigt entre l'appui et le
// relâchement : l'ancêtre commun devient le plateau, et l'élève qui a
// parfaitement touché sa carte ne voit RIEN se passer.
//
// MESURÉ (tools/clicQuiBouge.mjs) : on pose le pointeur au centre d'une carte,
// on attend qu'elle ait quitté ce point, on relâche. Avec `onclick`, aucun tir,
// aucune carte prise. Le joueur, lui, a vu sa cible sous son doigt.
//
// ET PENDANT CE TEMPS, LE NAVIGATEUR SÉLECTIONNE. Un appui suivi d'un
// déplacement, sur un élément qui porte des caractères, c'est la définition
// d'un glisser de sélection — d'où le texte en surbrillance bleue que Rémy
// décrit, à la place du geste qu'il voulait faire.
//
// ─── LA RÈGLE ────────────────────────────────────────────────────────────────
//
// ON AGIT À L'APPUI. `pointerdown` se produit au moment où le doigt touche :
// la suite du mouvement ne peut plus rien lui enlever. Et son `preventDefault`
// coupe la sélection à la racine, avant même qu'elle ne commence.
//
// LE CLAVIER GARDE SON CHEMIN. Un bouton activé à Entrée ou à Espace émet un
// `click` SANS pointeur, que `detail === 0` distingue — c'est la seule façon
// de ne pas compter deux fois le geste à la souris tout en gardant le jeu
// jouable sans elle. Qui écoute `pointerdown` seul ferme la porte au clavier ;
// qui écoute les deux sans ce test fait tout deux fois.

/**
 * Fait agir cet élément À L'APPUI plutôt qu'au clic — pour une cible qui bouge.
 *
 * @param {Element} el     la cible
 * @param {(ev: Event) => void} faire  ce qu'on fait quand elle est touchée
 */
export function surAppui(el, faire) {
    if (!el) return;
    el.addEventListener('pointerdown', (ev) => {
        // `preventDefault` ET NON `stopPropagation` : on coupe la sélection et
        // le glisser natif, on ne cache pas l'événement au reste de la page —
        // le plateau peut avoir besoin de savoir qu'on a touché quelque chose.
        ev.preventDefault();
        faire(ev);
    });
    // Le clavier : `detail === 0` dit qu'aucun pointeur n'est en jeu.
    el.addEventListener('click', (ev) => { if (ev.detail === 0) faire(ev); });
}

/**
 * LES DÉCLARATIONS CSS QUI VONT AVEC, à poser sur la cible elle-même.
 *
 * `user-select: none` seul ne dit rien à WebKit, c'est-à-dire à l'iPad de la
 * classe — et c'est justement là que le geste se fait au doigt. On écrit les
 * deux, plus `-webkit-touch-callout` qui coupe la loupe et le menu surgissant
 * d'un appui long. Ce conteneur n'a que Chromium : on ne peut pas éprouver ici
 * l'effet de la forme préfixée, et c'est une raison de l'écrire, pas de
 * l'oublier.
 */
export const CSS_CIBLE_QUI_BOUGE = `
    user-select: none; -webkit-user-select: none;
    -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;`;
