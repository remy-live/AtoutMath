// L'AFFICHAGE — contraste, couleurs, texte aéré, figures : les règles, sans écran.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 27 novembre : « peux-tu mettre une option contraste fort pour les élèves
// et pour moi aussi, sur certains ordis c'est pâle, d'ailleurs il faudrait une
// petite roue d'option qui permette les couleurs et le contraste (avec slide) ».
// Puis, devant la maquette : « pour les figures en option ».
//
// CE QUI PÂLIT, MESURÉ AVANT D'ÉCRIRE. Le texte gris (`--text-muted`) passe
// déjà l'exigence AA — 5,74 sur un panneau blanc. Ce qui disparaît sur un écran
// médiocre, ce sont les BORDURES : `--border` #e2e8f0 sur blanc donne 1,23,
// quand une limite de bouton ou de case en demande 3 (règle 1.4.11) ; les
// quatre autres thèmes font de 1,34 à 1,56. Un champ de saisie qu'on ne voit
// plus est un champ où l'on ne pense pas à taper. À fond, mesuré thème par
// thème : de 7,11 (océan) à 9,85 (sombre) — `tests/affichage.test.mjs`.
//
// LE CURSEUR EST CONTINU, PAS UN INTERRUPTEUR. Rémy a dit « avec slide » : un
// écran un peu pâle demande un cran, un vidéoprojecteur fatigué en demande dix.
// On MÉLANGE donc chaque teinte du thème vers une encre (noir en clair, blanc en
// sombre) dans la proportion choisie — c'est la même opération que le
// `color-mix` du navigateur, faite ici pour qu'elle se mesure dans une épreuve.
//
// ON NE TOUCHE QU'AUX TEINTES QUI PORTENT UNE LIMITE OU UN TEXTE. Le fond des
// pages, les couleurs d'action, les pastilles de réussite gardent leur dessin :
// ils passent déjà, et les foncer changerait l'allure du logiciel sans rien
// rendre plus lisible.

/** Les thèmes, dans l'ordre où la roue les montre. Le noyau ne dessine rien. */
export const THEMES = [
    { id: 'light', nom: 'Clair', sombre: false },
    { id: 'dark', nom: 'Sombre', sombre: true },
    { id: 'ocean', nom: 'Océan', sombre: false },
    { id: 'forest', nom: 'Forêt', sombre: false },
    { id: 'sunset', nom: 'Couchant', sombre: false }
];

/** Où chaque réglage se range dans le navigateur. Le thème et le texte aéré
 *  gardent leurs clés d'avant : un élève qui les avait réglés les retrouve. */
export const CLES = {
    theme: 'mathbox-theme',
    aere: 'atoutmath-aere',
    contraste: 'atoutmath-contraste',
    figures: 'atoutmath-figures-fortes',
    // Les teintes calculées, pour que l'amorce de `index.html` les pose AVANT
    // le premier dessin : sans elles, la page s'afficherait pâle une seconde
    // puis foncerait sous les yeux de celui qui a justement du mal à lire.
    encre: 'atoutmath-encre'
};

/**
 * LES TEINTES QUE LE CURSEUR FONCE, et l'encre vers laquelle chacune va.
 *
 * Les bordures ne vont pas jusqu'au noir : un cadre noir autour de chaque carte
 * ferait un tableau de cases, et 7,6 contre 1,23 suffit largement à les voir.
 */
export const TEINTES = {
    clair: {
        '--text-main': '#000000', '--text-sidebar': '#000000',
        '--text-muted': '#1e293b', '--text-sidebar-muted': '#1e293b',
        '--border': '#475569', '--border-sidebar': '#475569'
    },
    sombre: {
        '--text-main': '#ffffff', '--text-sidebar': '#ffffff',
        '--text-muted': '#e2e8f0', '--text-sidebar-muted': '#e2e8f0',
        '--border': '#cbd5e1', '--border-sidebar': '#cbd5e1'
    }
};

/** Un réglage de contraste, ramené entre 0 et 100 par crans de 5. */
export function bornerContraste(v) {
    const n = Math.round(Number(v) / 5) * 5;
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
}

/** Le mot qu'on lit à côté du curseur. Un nombre ne dirait rien à un élève. */
export function motDuContraste(v) {
    const n = bornerContraste(v);
    if (n === 0) return 'Normal';
    if (n >= 100) return 'Fort';
    return n >= 50 ? 'Renforcé' : 'Un peu plus';
}

/** « #e2e8f0 », « #fff », « rgb(226, 232, 240) » → [226, 232, 240], ou null. */
export function lireCouleur(texte) {
    const t = String(texte || '').trim().toLowerCase();
    let m = t.match(/^#([0-9a-f]{3})$/);
    if (m) return m[1].split('').map(c => parseInt(c + c, 16));
    m = t.match(/^#([0-9a-f]{6})$/);
    if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
    m = t.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
    if (m) return [m[1], m[2], m[3]].map(Number);
    return null;
}

const enHex = (rgb) => '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v)))
    .toString(16).padStart(2, '0')).join('');

/** `a` mélangé à `b`, `t` étant la part de `b` (0 → a, 1 → b). */
export function melanger(a, b, t) {
    const x = lireCouleur(a), y = lireCouleur(b);
    if (!x || !y) return null;
    const k = Math.max(0, Math.min(1, Number(t) || 0));
    return enHex(x.map((v, i) => v + (y[i] - v) * k));
}

/** Le rapport de contraste WCAG entre deux couleurs (1 à 21). */
export function rapportDeContraste(a, b) {
    const lum = (c) => {
        const [r, g, bl] = lireCouleur(c).map(v => {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
    };
    const [l1, l2] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (l1 + 0.05) / (l2 + 0.05);
}

/**
 * LES TEINTES À POSER pour un contraste donné.
 *
 * @param {Object<string,string>} bases   la teinte du thème pour chaque jeton
 *                                         (ce que le navigateur calcule sans
 *                                         réglage : `getComputedStyle`)
 * @param {number} contraste               0 à 100
 * @param {boolean} sombre                 un thème sombre fonce vers le blanc
 * @returns {Object<string,string>}        jeton → couleur ; vide à 0
 */
export function teintesRenforcees(bases, contraste, sombre = false) {
    const t = bornerContraste(contraste) / 100;
    if (!t) return {};
    const encres = sombre ? TEINTES.sombre : TEINTES.clair;
    const sortie = {};
    for (const [jeton, encre] of Object.entries(encres)) {
        const base = bases && bases[jeton];
        const m = base && melanger(base, encre, t);
        if (m) sortie[jeton] = m;
    }
    return sortie;
}

/**
 * LES FIGURES, EN OPTION — et c'est Rémy qui l'a voulu ainsi : foncer un
 * triangle rend la figure lisible au vidéoprojecteur, mais retire leurs nuances
 * aux jeux qui parlent par la couleur (fractions, pentaminos).
 *
 * ON PASSE PAR UNE COURBE GAMMA ET NON PAR `contrast()`. Mesuré à la main sur
 * le gris d'un quadrillage (#e2e8f0, 89 % de clarté) : `contrast(1.5)` l'envoie
 * à 100 % — il ÉCLAIRCIT ce qui était pâle, l'inverse du but. Une puissance
 * v^γ garde le blanc blanc et le noir noir, et fonce tout l'entre-deux :
 * 0,89³ ≈ 0,70. Sur les figures, c'est le blanc du fond qu'il faut garder.
 *
 * @returns {number} l'exposant ; 1 veut dire « rien ».
 */
export function gammaDesFigures(contraste, figures) {
    if (!figures) return 1;
    return 1 + 2 * (bornerContraste(contraste) / 100);
}

/** Le thème rangé, ou le clair s'il est inconnu. */
export function themeConnu(id) {
    return THEMES.find(t => t.id === id) || THEMES[0];
}

/**
 * TOUS LES RÉGLAGES, LUS D'UN COUP dans un stockage qui peut se refuser
 * (navigation privée) : on rend alors les valeurs d'origine.
 */
export function lireReglages(stockage) {
    const lire = (cle) => {
        try { return stockage ? stockage.getItem(cle) : null; } catch (e) { return null; }
    };
    return {
        theme: themeConnu(lire(CLES.theme)).id,
        aere: lire(CLES.aere) === '1',
        contraste: bornerContraste(lire(CLES.contraste) || 0),
        figures: lire(CLES.figures) === '1'
    };
}

/** Les réglages d'origine — ce que « Remettre comme avant » rétablit. */
export const ORIGINE = Object.freeze({ theme: 'light', aere: false, contraste: 0, figures: false });
