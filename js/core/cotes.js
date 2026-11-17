// LES COTES D'UNE FIGURE — le cadre, les traits de mesure, les étiquettes.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CE MODULE EST NÉ D'UNE RÈGLE PAYÉE SUR LES VOLUMES, le 16 novembre : un
// dessin coté ne doit JAMAIS deviner son cadre. Les volumes l'avaient d'abord
// posé en dur — 300 × 230 — et le « h = 8 cm » du cylindre sortait à droite,
// amputé de sa dernière lettre, pendant que le prisme débordait par le haut.
// Rien ne le disait : un SVG qui déborde ne lève aucune erreur, il coupe.
//
// Les aires en ont eu besoin à leur tour, et une règle écrite à deux endroits
// finit par diverger — c'est ce que dit déjà `deDevant` dans `core/accord.js`.
// On la met donc ici, une fois.

/**
 * LE CADRE SE CALCULE, IL NE SE DEVINE PAS.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *
 * La première version posait un `viewBox` fixe de 300 × 230 et plaçait les
 * solides dedans à la main. Regardé : le « h = 8 cm » du cylindre sortait à
 * droite, amputé de sa dernière lettre, et le prisme débordait en haut. Rien
 * ne le disait — un SVG qui déborde ne lève aucune erreur, il coupe.
 *
 * On accumule donc TOUS les points, ceux des traits comme les coins des
 * textes, et le `viewBox` se déduit de leur boîte englobante. Un dessin ne
 * peut alors plus sortir de son cadre, quelles que soient les dimensions
 * tirées — et c'est une classe entière de défauts qui disparaît, pas une
 * occurrence.
 *
 * LA LARGEUR D'UN TEXTE EST ESTIMÉE, et c'est assez : à 15 px de corps, un
 * chiffre fait un peu moins de 9 px. On majore à 9, ce qui laisse de l'air
 * plutôt que d'en manquer — une étiquette un peu au large ne se voit pas, une
 * étiquette coupée se voit tout de suite.
 */
export const CADRE_L = 460;
export const CADRE_H = 162;

export function boite(P, marge = 14, minL = CADRE_L, minH = CADRE_H) {
    const xs = P.map(p => p[0]), ys = P.map(p => p[1]);
    let x = Math.min(...xs) - marge, y = Math.min(...ys) - marge;
    let w = Math.max(...xs) + marge - x, h = Math.max(...ys) + marge - y;
    // ── UNE TAILLE MINIMALE, ET ELLE A ÉTÉ PAYÉE DEUX FOIS ───────────────
    //
    // D'ABORD DANS UN SENS. Recadrer au plus juste a réglé les débordements et
    // créé l'inverse : un cube de 3 cm s'affichait PLUS GROS qu'un pavé de 12,
    // parce qu'un petit dessin recadré au plus juste est ensuite étiré à la
    // largeur de son emplacement. L'élève voyait donc un cube géant et un pavé
    // minuscule, dans un chapitre dont toute la leçon est qu'un volume grandit
    // vite. Le cadre a donc un plancher, et les petits solides flottent dedans.
    //
    // PUIS DANS L'AUTRE, ET C'EST LE PLANCHER LUI-MÊME QUI ÉTAIT FAUX. Rémy,
    // capture à l'appui : « le rectangle est petit », puis « idem » sur le pavé
    // droit. MESURÉ dans le navigateur, et c'est la mesure qui a tout dit :
    //
    //     emplacement .............. 538 × 189 px   (paysage, rapport 2,85)
    //     cadre minimum ............ 320 × 260      (PORTRAIT, rapport 1,23)
    //     dessin dans le cadre ..... 224 × 112
    //     rectangle à l'écran ...... 81 px de haut, dans 189 disponibles
    //
    // UN SVG S'INSCRIT EN ENTIER DANS SA PLACE : un cadre portrait dans un
    // emplacement paysage est bridé par la HAUTEUR, et les 306 pixels de
    // largeur qui restent ne servent à personne. Le plancher ne bourrait pas
    // seulement de vide — il bourrait du vide DANS LE MAUVAIS SENS.
    //
    // Le plancher a donc désormais la FORME de son emplacement (2,84 contre
    // 2,85), et il garde sa fonction : une aire comparable à l'ancien, donc la
    // même leçon sur les tailles relatives. Le rectangle passe de 81 à 131 px
    // de haut sans qu'une seule règle de la feuille ne change.
    //
    // Un dessin qui DÉPASSE le plancher l'élargit toujours, et n'est jamais
    // coupé : c'était le défaut d'avant l'avant.
    if (w < minL) { x -= (minL - w) / 2; w = minL; }
    if (h < minH) { y -= (minH - h) / 2; h = minH; }
    return { x, y, w, h };
}

/** Les quatre coins qu'occupera un texte, selon son ancrage. */
export function coinsTexte(x, y, texte, ancre) {
    const w = String(texte).length * 9;
    const g = ancre === 'end' ? x - w : ancre === 'start' ? x : x - w / 2;
    return [[g, y - 13], [g + w, y + 5]];
}

export const pt = (x, y) => `${x.toFixed(1)},${y.toFixed(1)}`;

/**
 * Une cote : un trait fin entre deux points, et le nombre posé à côté.
 * Pousse dans `P` ce qu'elle occupe, pour que le cadre en tienne compte.
 */
export function cote(P, x1, y1, x2, y2, texte, { dx = 0, dy = 0, ancre = 'middle' } = {}) {
    const tx = (x1 + x2) / 2 + dx, ty = (y1 + y2) / 2 + dy;
    P.push([x1, y1], [x2, y2], ...coinsTexte(tx, ty, texte, ancre));
    return `<line class="fig-cote" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}"
            x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>
        <text class="fig-nb" x="${tx.toFixed(1)}" y="${ty.toFixed(1)}"
            text-anchor="${ancre}">${texte}</text>`;
}

/** Un nombre seul, sans trait de cote. */
export function etiquette(P, x, y, texte, ancre = 'start') {
    P.push(...coinsTexte(x, y, texte, ancre));
    return `<text class="fig-nb" x="${x.toFixed(1)}" y="${y.toFixed(1)}"
        text-anchor="${ancre}">${texte}</text>`;
}

const cadre = (contenu, P) => {
    const b = boite(P);
    return `
    <svg class="fig-svg vol-svg" viewBox="${b.x.toFixed(1)} ${b.y.toFixed(1)}
         ${b.w.toFixed(1)} ${b.h.toFixed(1)}" role="img"
         aria-label="Un solide coté, dont il faut calculer le volume">
        ${contenu}
    </svg>`;
};


/**
 * LE `<svg>` AUTOUR DU DESSIN, avec son cadre calculé.
 *
 * `P` est la liste de TOUS les points occupés — traits et coins d'étiquettes.
 * `minL` et `minH` donnent au cadre un plancher : sans lui, un petit dessin
 * recadré au plus juste est ensuite étiré à la largeur de son emplacement, et
 * s'affiche PLUS GROS qu'un grand. Mesuré sur les volumes : un cube de 3 cm
 * écrasait un pavé de 12.
 */
export function cadreSvg(contenu, P, { classe = '', aria = '', minL = CADRE_L, minH = CADRE_H } = {}) {
    const b = boite(P, 14, minL, minH);
    return `
    <svg class="fig-svg ${classe}" viewBox="${b.x.toFixed(1)} ${b.y.toFixed(1)}
         ${b.w.toFixed(1)} ${b.h.toFixed(1)}" role="img" aria-label="${aria}">
        ${contenu}
    </svg>`;
}
