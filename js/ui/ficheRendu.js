// LE RENDU D'UNE FICHE EN BLOCS — une seule fois, pour l'aperçu ET le PDF.
//
// core/fiche.js décide où va chaque chose, en millimètres. Ici on ne fait que
// dessiner ces items deux fois : en HTML positionné pour l'aperçu, en jsPDF
// pour le fichier. Les deux dessins lisent les MÊMES coordonnées — c'est la
// garantie que ce qu'on voit à l'écran est ce que sort l'imprimante.
//
// Ce module est partagé par la fiche d'un exercice (printQuestions) et la
// fiche d'un parcours (printParcours) : même papier, même trait, même bandeau.

import { A4, morceauxReponse, typographieFr } from '../core/fiche.js';
import { RE_FRACTION } from '../core/fiche.js';
// Les dessins de grilles vivent avec la fiche de grilles : un sudoku se dessine
// pareil qu'il occupe une page entière ou un bloc au milieu d'une évaluation.
import { RENDUS } from './printSheet.js';

/**
 * L'ENCRE DU POLYCOPIÉ — QUATRE MODES, UN SEUL FILTRE.
 *
 * Rémy : « je trouve que tu te sers peu de la couleur quand on demande le
 * polycopié en couleur. Mets 4 modes : couleur intense (beaucoup de couleur
 * mais tout en restant sobre et lisible), couleur, niveau de gris, noir et
 * blanc. »
 *
 * Le piège serait d'écrire quatre palettes. Il y a dans ces fiches une
 * cinquantaine de dessins, chacun avec ses teintes choisies pour lui ; les
 * quadrupler serait quatre fois plus de choses à garder d'accord, et trois
 * versions sur quatre finiraient fausses. On garde donc UNE palette — celle
 * qui est déjà écrite dans chaque rendu — et l'on pose un FILTRE devant
 * l'encre. Le mode ne change pas ce qu'on dessine, il change comment ça sort.
 *
 *   · COULEUR INTENSE — chaque teinte s'écarte de son propre gris. C'est la
 *     saturation, rien d'autre : les couleurs restent les leurs, elles
 *     s'affirment. Sobre par construction, puisqu'on ne change ni la teinte ni
 *     la clarté d'ensemble.
 *   · COULEUR — la palette telle qu'elle est écrite.
 *   · NIVEAU DE GRIS — chaque teinte tombe sur sa luminance. Les aplats
 *     restent, les couleurs partent : c'est une photocopie couleur.
 *   · NOIR ET BLANC — les aplats eux-mêmes ne sont plus dessinés. C'est le
 *     mode le plus ancien de cette maison, celui pour lequel chaque figure
 *     porte AUSSI une marque de forme (symbole, trame, étiquette) : la couleur
 *     ajoute du confort, elle ne porte jamais l'information à elle seule.
 *
 * PROPRIÉTÉ UTILE : le filtre ne touche que ce qui est réellement coloré. Un
 * gris a la même luminance que lui-même et ne s'écarte de rien — le cadre de
 * la feuille, les pointillés, le texte noir traversent les quatre modes sans
 * bouger. Seul change ce qui avait une couleur.
 *
 * Le choix est GLOBAL — mémorisé d'une fiche à l'autre, on ne le refait pas
 * dix fois — et RÉGLABLE FICHE PAR FICHE, puisque c'est le même sélecteur qui
 * l'affiche et le change.
 */
export const MODES_POLYCOPIE = [
    { id: 'intense', label: 'Couleur intense' },
    { id: 'couleur', label: 'Couleur' },
    { id: 'gris', label: 'Niveaux de gris' },
    { id: 'nb', label: 'Noir et blanc' }
];

/** Les quatre choix, prêts à poser dans un `<select>`. */
export function optionsPolycopie() {
    return MODES_POLYCOPIE
        .map(m => `<option value="${m.id}">${m.label}</option>`).join('');
}

const CLE_MODE = 'mathbox-polycopie-mode';
let modeEnMemoire = null;

export function modePolycopie() {
    if (modeEnMemoire !== null) return modeEnMemoire;
    let v = null;
    try { v = window.localStorage.getItem(CLE_MODE); } catch (e) { v = null; }
    // Par défaut : NOIR ET BLANC. C'est ce qui sort de la photocopieuse de
    // l'établissement, et une feuille pensée pour elle marche partout.
    modeEnMemoire = MODES_POLYCOPIE.some(m => m.id === v) ? v : 'nb';
    return modeEnMemoire;
}

export function reglerModePolycopie(id) {
    modeEnMemoire = MODES_POLYCOPIE.some(m => m.id === id) ? id : 'nb';
    try { window.localStorage.setItem(CLE_MODE, modeEnMemoire); } catch (e) { /* privé */ }
}

/**
 * DESSINE-T-ON LES APLATS ? C'est la seule question que les rendus se posent,
 * et elle ne se pose qu'en noir et blanc : les trois autres modes dessinent
 * tout, le filtre s'occupe du reste.
 */
export function polycopieEnCouleur() {
    return modePolycopie() !== 'nb';
}

// Les coefficients de la luminance sRGB — les mêmes que ceux des filtres CSS
// `grayscale()` et `saturate()`, pour que l'aperçu à l'écran et le PDF
// tombent sur la même nuance.
const LUM = [0.2126, 0.7152, 0.0722];
const borne = (v) => Math.max(0, Math.min(255, Math.round(v)));

/**
 * LE GRIS D'UNE COULEUR — pas sa luminance nue.
 *
 * La luminance seule ne marche pas, et cela se voit à la première fiche : le
 * jaune d'un angle donné (253, 224, 160) et le vert de celui qu'on cherche
 * (200, 236, 218) ont la MÊME clarté. Passés à la moulinette, ils tombent sur
 * le même gris et la figure devient illisible — deux teintes choisies pour
 * différer par la TEINTE ne peuvent pas se distinguer par la clarté.
 *
 * On retranche donc une part de la saturation : plus une couleur est franche,
 * plus elle pèse d'encre. C'est ce que fait une photocopieuse honnête, et cela
 * sépare deux pastels de même clarté sans toucher aux gris — un gris n'a pas
 * de saturation, il traverse le filtre inchangé.
 */
function grisDe(rvb) {
    const y = LUM[0] * rvb[0] + LUM[1] * rvb[1] + LUM[2] * rvb[2];
    const chroma = Math.max(...rvb.slice(0, 3)) - Math.min(...rvb.slice(0, 3));
    return borne(Math.max(25, y - chroma * 0.6));
}

/**
 * Filtre une couleur [r, v, b] selon le mode courant.
 *
 * CE QUI SÉPARE « NIVEAU DE GRIS » DE « NOIR ET BLANC » N'EST PAS ICI.
 * On avait essayé : en noir et blanc, effacer les aplats colorés et ne garder
 * que le trait. La règle est juste, mais elle est INDÉCIDABLE à partir de la
 * couleur seule — l'encre presque noire de la feuille (26, 32, 44) et le bleu
 * pâle d'un angle-relais (222, 226, 245) ont la même saturation, et l'une doit
 * rester quand l'autre doit partir. Les points d'une grille de slitherlink ont
 * disparu de la feuille avant qu'on s'en aperçoive.
 *
 * La distinction se décide donc là où l'on SAIT ce qu'on dessine : dans chaque
 * rendu, qui demande `polycopieEnCouleur()` et remplace alors son aplat par un
 * contour, une trame ou un symbole. C'est ce que font déjà la plupart d'entre
 * eux — c'est la règle de la maison depuis le début.
 */
export function encre(rvb, mode = modePolycopie()) {
    if (!Array.isArray(rvb) || rvb.length < 3) return rvb;
    if (mode === 'couleur') return rvb;
    if (mode === 'intense') {
        // La saturation, rien d'autre : chaque teinte s'écarte de son propre
        // gris, donc elle reste la sienne. Un gris ne s'écarte de rien.
        const y = LUM[0] * rvb[0] + LUM[1] * rvb[1] + LUM[2] * rvb[2];
        return [0, 1, 2].map(i => borne(y + (rvb[i] - y) * 1.45));
    }
    const g = grisDe(rvb);
    return [g, g, g];
}

/**
 * LE MÊME FILTRE, PASSÉ SUR L'APERÇU HTML.
 *
 * L'aperçu est fabriqué en une chaîne par chaque rendu, puis posé d'un coup
 * dans la page : cette chaîne EST la porte unique qu'on cherchait. On y
 * remplace chaque couleur écrite, quelle que soit sa forme — `#abc`, `#aabbcc`
 * ou `rgb(1, 2, 3)` —, et l'écran tombe alors exactement sur la nuance du PDF.
 * Un filtre CSS n'aurait pas suffi : `grayscale()` est linéaire, il ne sait
 * pas retrancher la saturation.
 */
const RE_COULEUR = /(#(?:[0-9a-f]{3}|[0-9a-f]{6})\b)|rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*([^)]*)\)/gi;

export function teindreHtml(html, mode = modePolycopie()) {
    if (mode === 'couleur' || typeof html !== 'string') return html;
    return html.replace(RE_COULEUR, (tout, hex, r, v, b, suite, index, chaine) => {
        const rvb = hex
            ? (hex.length === 4 ? [...hex.slice(1)].map(c => parseInt(c + c, 16))
                : [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)))
            : [+r, +v, +b];
        const t = encre(rvb, mode);
        if (hex) return '#' + t.map(x => x.toString(16).padStart(2, '0')).join('');
        const reste = (suite || '').replace(/^\s*,\s*/, '').trim();
        return reste ? `rgba(${t.join(', ')}, ${reste})` : `rgb(${t.join(', ')})`;
    });
}

/**
 * LE MÊME FILTRE, POSÉ SUR LE DOCUMENT PDF LUI-MÊME.
 *
 * jsPDF n'a que trois portes par où une couleur entre : le remplissage, le
 * trait et le texte. On les habille une fois, à la création du document, et
 * les quelque deux cents endroits qui posent une couleur n'ont rien à savoir
 * du mode choisi. C'est ce qui rend les quatre modes tenables.
 */
export function teindreDoc(doc) {
    if (!doc || doc.__teinte) return doc;
    doc.__teinte = true;
    ['setFillColor', 'setDrawColor', 'setTextColor'].forEach(nom => {
        const brut = doc[nom];
        if (typeof brut !== 'function') return;
        doc[nom] = function (...args) {
            if (args.length >= 3 && args.every(v => typeof v === 'number')) {
                return brut.apply(this, encre(args.slice(0, 3)).concat(args.slice(3)));
            }
            if (args.length === 1 && typeof args[0] === 'string' && /^#[0-9a-f]{6}$/i.test(args[0])) {
                const h = args[0].slice(1);
                const t = encre([0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)));
                return brut.call(this, '#' + t.map(v => v.toString(16).padStart(2, '0')).join(''));
            }
            return brut.apply(this, args);
        };
    });
    return doc;
}

/**
 * LE MÊME FILTRE POUR L'APERÇU, en une classe.
 *
 * L'aperçu est du HTML : ses couleurs sont écrites dans deux cents styles en
 * ligne, et il n'existe aucune porte unique où les intercepter. Mais le
 * navigateur en a une — `filter`. `saturate()` et `grayscale()` font
 * exactement le calcul ci-dessus, avec les mêmes coefficients : l'écran montre
 * donc la nuance que l'imprimante sortira.
 */
export function classeTeinte(mode = modePolycopie()) {
    return `fx-teinte fx-teinte--${mode}`;
}

/** Pose (ou remplace) la teinte courante sur un élément d'aperçu. */
export function poserTeinte(el) {
    if (!el || !el.classList) return;
    [...el.classList].forEach(c => { if (c.startsWith('fx-teinte')) el.classList.remove(c); });
    classeTeinte().split(' ').forEach(c => el.classList.add(c));
}

/**
 * PORTRAIT OU PAYSAGE, POUR LES FICHES À GRILLES.
 *
 * Elles sortaient toutes en paysage : c'est la bonne orientation pour six
 * pendules ou neuf rectangles, et la mauvaise pour un treillis de Garam, plus
 * haut que large. Rémy : « on ne pourrait pas choisir l'orientation ». Le
 * choix se retient, comme celui de la couleur — un professeur qui imprime en
 * portrait le fait pour une série de feuilles, pas pour une seule.
 */
const CLE_ORIENTATION = 'mathbox-fiche-portrait';
let portraitEnMemoire = null;

export function ficheEnPortrait() {
    if (portraitEnMemoire !== null) return portraitEnMemoire;
    let v = null;
    try { v = window.localStorage.getItem(CLE_ORIENTATION); } catch (e) { v = null; }
    portraitEnMemoire = v === '1';
    return portraitEnMemoire;
}

export function reglerFichePortrait(oui) {
    portraitEnMemoire = !!oui;
    try { window.localStorage.setItem(CLE_ORIENTATION, oui ? '1' : '0'); } catch (e) { /* privé */ }
}

export const ENCRE = {
    texte: [30, 41, 59],
    gris: [110, 118, 132],
    trait: [26, 32, 44],
    pointille: [168, 176, 191],
    bandeau: [238, 241, 245],
    bandeauTrait: [203, 210, 220]
};

/**
 * LE TEXTE TEL QUE LE PDF SAIT L'ÉCRIRE.
 *
 * Les polices standard d'un PDF (Helvetica et compagnie) n'ont qu'un jeu de
 * caractères : celui de Windows-1252. Dès qu'une chaîne contient AUTRE CHOSE,
 * jsPDF bascule la chaîne ENTIÈRE en UTF-16 — mais la police, elle, ne sait
 * pas la relire, et chaque caractère sort en deux glyphes de hasard. C'est
 * ainsi que « 5 + ? = 10 → 5 » s'imprimait « 5 + ? = 1 0 !' 5 » : un seul
 * caractère hors table, et toute la ligne était perdue.
 *
 * On remplace donc ces caractères par leur équivalent lisible AVANT de les
 * confier au PDF. Les symboles vraiment utiles à une fiche de mathématiques —
 * × ÷ ° ² ³ ½ « » — sont dans la table, eux, et passent intacts.
 */
const HORS_TABLE = {
    // L'ESPACE FINE INSÉCABLE des milliers (« 62 307 ») n'existe pas en
    // WinAnsi : elle sortait en « ? » au milieu de chaque grand nombre. On la
    // remplace par l'insécable ordinaire, qui, elle, y est — le nombre reste
    // d'un seul tenant, il respire seulement un peu plus.
    '\u202F': '\u00A0',
    '\u2212': '-',      // le vrai signe moins
    '\u2192': '->', '\u2190': '<-',
    '\u2248': '~',      // « à peu près égal »
    '\u22A5': '_|_',    // perpendiculaire
    '\u2260': '=/=', '\u2264': '<=', '\u2265': '>=',
    '\u2081': '1', '\u2082': '2', '\u2083': '3', '\u2084': '4', '\u2085': '5',
    '\u2086': '6', '\u2087': '7', '\u2088': '8', '\u2089': '9', '\u2080': '0',
    '\u1D49': 'e',      // le « e » de « 2ᵉ »
    '\u2610': '[ ]', '\u2611': '[x]',
    '\u2153': '1/3', '\u2154': '2/3', '\u00BC': '1/4', '\u00BE': '3/4',
    '\u2218': 'o', '\u2032': "'", '\u2033': '"',
    '\u2261': '=', '\u221A': 'V', '\u03C0': 'pi',
    // Les fl\u00E8ches de rotation du chat g\u00E9om\u00E8tre. \u00AB \u00E0 droite \u00BB est d\u00E9j\u00E0 \u00E9crit \u00E0
    // c\u00F4t\u00E9 : la fl\u00E8che est un ornement, et un \u00AB ? \u00BB au milieu d'un programme
    // de construction se lit comme une donn\u00E9e manquante.
    '\u21BB': '', '\u21BA': ''
};

/**
 * UNE LIGNE D'ÉNONCÉ, DÉCOUPÉE EN MORCEAUX QUI NE SE DESSINENT PAS PAREIL.
 *
 * Deux choses ne s'écrivent pas comme du texte ordinaire sur une fiche de
 * mathématiques :
 *
 *   · LA FRACTION. « 5/7 » n'est pas la façon dont on l'écrit à la main ni au
 *     tableau : le numérateur va au-dessus d'un trait, le dénominateur
 *     dessous. Un élève de sixième qui ne voit jamais que la barre oblique
 *     finit par croire que c'est une division déguisée.
 *   · LE SIGNE ≈. Il n'existe pas dans les polices standard d'un PDF : il en
 *     sortait une seule vaguelette. On le TRACE donc, deux vagues, à la main.
 *
 * Le découpage est commun à l'aperçu et au PDF pour que les deux tombent au
 * même endroit — c'est toute la raison d'être de ce module.
 */
export function morceauxLigne(ligne, avecFractions) {
    const out = [];
    // Le motif vient de core/fiche.js : l'aperçu, le PDF et la mesure des
    // colonnes doivent découper AU MÊME ENDROIT, sinon la fiche se compose sur
    // une largeur et s'imprime sur une autre.
    const re = avecFractions
        ? new RegExp(`${RE_FRACTION().source}|(\\u2248)`, 'g')
        : /(\u2248)/g;
    let dernier = 0, m;
    while ((m = re.exec(ligne))) {
        if (m.index > dernier) out.push({ texte: ligne.slice(dernier, m.index) });
        if (m[0] === '\u2248') out.push({ presque: true });
        else out.push({ num: m[1], den: m[2] });
        dernier = m.index + m[0].length;
    }
    if (dernier < ligne.length) out.push({ texte: ligne.slice(dernier) });
    return out.length ? out : [{ texte: ligne }];
}

/** Trace le signe « à peu près égal » : deux vagues, puisqu'on ne peut l'écrire. */
function signePresque(pdf, x, y, taille) {
    const l = taille * 0.9, h = taille * 0.2;
    pdf.setLineWidth(taille * 0.08);
    pdf.setDrawColor(...ENCRE.texte);
    for (const dy of [-taille * 0.58, -taille * 0.16]) {
        // Une vague, c'est une courbe en S : deux points de contrôle opposés.
        pdf.lines([[l * 0.3, -h * 2.2, l * 0.7, h * 2.2, l, 0]], x, y + dy, [1, 1], 'S', false);
    }
}

/** La largeur qu'occupera une fraction empilée. */
function largeurFraction(pdf, m) {
    return Math.max(pdf.getTextWidth(m.num), pdf.getTextWidth(m.den)) + 1.6;
}

/**
 * Une ligne d'énoncé dans le PDF, morceau par morceau. Rend l'abscisse
 * atteinte, ce qui permettrait d'enchaîner.
 */
function dessinerLigne(pdf, ligne, x0, y, o, avecFractions) {
    let x = x0;
    for (const m of morceauxLigne(ligne, avecFractions)) {
        if (m.texte !== undefined) {
            const t = pourPdf(m.texte);
            pdf.text(t, x, y);
            x += pdf.getTextWidth(t);
        } else if (m.presque) {
            signePresque(pdf, x + o.taille * 0.15, y, o.taille);
            x += o.taille * 1.25;
        } else {
            const w = largeurFraction(pdf, m);
            // LE TRAIT EST LA LIGNE D'ÉCRITURE. On le posait un tiers de corps
            // plus haut, et la fraction entière flottait au-dessus du texte :
            // le numéro de la question et le « + » paraissaient écrits une
            // ligne plus bas. Numérateur dessus, dénominateur dessous, à
            // distance égale du trait.
            const yTrait = y;
            pdf.text(m.num, x + (w - pdf.getTextWidth(m.num)) / 2, yTrait - o.taille * 0.28);
            pdf.text(m.den, x + (w - pdf.getTextWidth(m.den)) / 2, yTrait + o.taille * 0.98);
            pdf.setLineWidth(0.28);
            pdf.setDrawColor(...ENCRE.texte);
            pdf.line(x + 0.4, yTrait, x + w - 0.4, yTrait);
            x += w;
        }
    }
    return x;
}

/**
 * La même ligne en HTML, pour l'aperçu.
 *
 * LE TROU EST DESSINÉ DANS LA LIGNE, pas posé par-dessus. On le plaçait en
 * absolu, à l'abscisse calculée par la mise en page ; mais l'aperçu et la
 * fonction de mesure ne tombent jamais au pixel près sur une longue amorce, et
 * le trait dérivait vers la gauche à mesure que l'énoncé s'allongeait. Écrit à
 * sa place dans le texte, il ne peut plus dériver du tout.
 */
function ligneHtml(ligne, avecFractions, opts = {}) {
    // LE TROU RESTE SUR LA LIGNE D'ÉCRITURE, y compris entre deux fractions :
    // depuis que le trait de fraction s'y pose lui aussi, le signe attendu et
    // le trait sont à la même hauteur sans qu'on ait à relever le trou.
    const trouCls = 'fx-trou' + (opts.champs ? ' fx-trou--champ' : '');
    const texteHtml = (t) => echapper(t).replace(/ {3,}/g,
        (blanc) => `<span class="${trouCls}">${blanc}</span>`);
    return morceauxLigne(ligne, avecFractions).map(m => {
        if (m.texte !== undefined) return texteHtml(m.texte);
        if (m.presque) return '<span class="fx-presque">&#8776;</span>';
        return `<span class="fx-frac"><span class="fx-frac-n">${echapper(m.num)}</span>`
            + `<span class="fx-frac-d">${echapper(m.den)}</span></span>`;
    }).join('');
}

export function pourPdf(texte) {
    let t = typographieFr(texte);
    for (const [de, a] of Object.entries(HORS_TABLE)) t = t.split(de).join(a);
    // Filet de sécurité : tout ce qui reste au-dessus de la table y passe.
    // Un point d'interrogation vaut mieux qu'une ligne entière illisible.
    return t.replace(/[^\u0000-\u00FF\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u02C6\u02DC\u2013\u2014\u2018\u2019\u201A\u201C\u201D\u201E\u2020\u2021\u2022\u2026\u2030\u2039\u203A\u20AC\u2122]/g, '?');
}

export const echapper = (s) => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/** Largeur d'un texte en mm, métriques Helvetica (la police du PDF). */
export function mesureur() {
    const c = document.createElement('canvas').getContext('2d');
    return (texte, taille) => {
        c.font = `${taille * 100}px Helvetica, Arial, sans-serif`;
        return c.measureText(texte).width / 100;
    };
}

/** L'engrenage de l'aperçu — dessiné, pas un emoji : il doit rester net. */
const ROUE = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;

/** Le libellé d'un bandeau d'exercice. */
const titreExo = (it) => `Exercice ${it.n} — ${it.titre}${it.suite ? ' (suite)' : ''}`;

// --- Aperçu HTML -------------------------------------------------------------

/** Les items d'une page, en HTML positionné. `k` = pixels par millimètre. */
export function apercuItems(page, k, o) {
    let html = '';
    for (const it of page.items) {
        if (it.type === 'exo') {
            // L'ENGRENAGE N'EXISTE QUE DANS L'APERÇU.
            //
            // Les réglages d'un exercice — combien de questions, sur combien de
            // colonnes, numéroté ou non — vivaient dans une liste, à côté de la
            // feuille : on réglait d'un côté et l'on regardait de l'autre, en
            // cherchant à chaque fois quelle ligne de la liste correspondait au
            // bandeau qu'on avait sous les yeux. Le bouton est donc SUR le
            // bandeau.
            //
            // Il n'est posé que si l'appelant le demande (`o.reglable`), et
            // l'appelant, c'est l'aperçu : le PDF passe par `pdfItems`, qui ne
            // connaît pas ce bouton et ne peut donc pas l'imprimer.
            const roue = (o.reglable && it.id && !it.suite)
                ? `<button type="button" class="fx-roue" data-reglage="${echapper(it.id)}"
                     title="Réglages de cet exercice"
                     aria-label="Réglages de « ${echapper(it.titre)} »">${ROUE}</button>`
                : '';
            // LE TITRE SE RETOUCHE D'UN CLIC (dans l'aperçu seulement). Le
            // titre du catalogue est celui de l'exercice ; sur une feuille, le
            // professeur écrit ce qu'il veut — « Exercice 1 — Les tables »
            // n'est pas forcément le nom qu'a l'exercice dans l'application.
            const modifiable = o.retouchable && it.id && !it.suite;
            html += `<div class="fx-bandeau" style="left:${it.x * k}px; top:${it.y * k}px;
                width:${it.w * k}px; height:${it.h * k}px; font-size:${o.taille * k * 1.02}px">
                <span${modifiable ? ` class="fx-retouche" data-titre-exo="${echapper(it.id)}"`
                    + ' title="Cliquer pour changer le titre de cet exercice"' : ''}>${echapper(titreExo(it))}</span>
                ${it.points ? `<span class="fx-points">… / ${it.points}</span>` : ''}
                ${roue}</div>`;
            continue;
        }
        if (it.type === 'consigne') {
            const cons = (o.retouchable && it.id)
                ? `class="fx-consigne fx-retouche" data-consigne-exo="${echapper(it.id)}"`
                    + ' title="Cliquer pour changer la consigne"'
                : 'class="fx-consigne"';
            it.lignes.forEach((ligne, i) => {
                html += `<div ${cons} style="left:${(it.x + 1) * k}px;
                    top:${(it.y + i * o.tailleConsigne * 1.45) * k}px; width:${it.w * k}px;
                    font-size:${o.tailleConsigne * k}px">${echapper(ligne)}</div>`;
            });
            continue;
        }
        if (it.type === 'grille') {
            const r = RENDUS[it.cle];
            if (r) {
                // `n` vaut null quand le professeur a décoché la numérotation
                // de cet exercice : on n'écrit alors rien du tout.
                //
                // CERTAINS BLOCS PLACENT LEUR NUMÉRO EUX-MÊMES. Une cascade de
                // priorités s'écrit « 1. 2 × 6 + 7 − 2 » sur une seule ligne,
                // comme dans un cahier ; le numéro posé au-dessus lui faisait
                // perdre une ligne entière et cassait l'alignement. Le rendu le
                // reçoit alors dans son emplacement, et le pose où il veut.
                if (it.n != null && !r.numeroInterne) {
                    html += `<div class="fx-grille-num" style="left:${it.x * k}px; top:${(it.y - 3.4) * k}px;
                        font-size:${o.tailleConsigne * k}px">${it.n}.</div>`;
                }
                html += r.previewGrille(it.item,
                    { x: it.x, y: it.y, taille: it.taille, boite: it.boite,
                        numero: r.numeroInterne ? it.n : null },
                    k, !!o.solution, !!o.champs && !o.solution);
            }
            continue;
        }
        // type 'q'
        if (it.n != null) {
            // LE NUMÉRO EST SUR LA LIGNE DE L'ÉNONCÉ, pas au-dessus. Il était
            // posé à `y` quand le texte commençait à `y + dy` : dès qu'une
            // question réservait de la place pour une fraction, le « 6. » se
            // retrouvait un demi-interligne plus haut que sa phrase.
            html += `<div class="fq-num" style="left:${it.x * k}px; top:${(it.y + (it.dy || 0)) * k}px; font-size:${o.taille * k}px">${it.n}.</div>`;
        }
        // LES DEUX GESTES SUR UNE QUESTION, AU SURVOL.
        //
        // On ne retouche PAS le texte d'une question : sa réponse vient du
        // générateur, pas de l'énoncé. Réécrire « 7 × 8 = » en « 9 × 8 = »
        // laisserait la page des solutions écrire 56 — une fiche dont le
        // corrigé ment est pire que pas de fiche. On peut en revanche la
        // retirer, ou en retirer une autre au sort : les deux gardent l'énoncé
        // et sa réponse ensemble.
        //
        // Comme l'engrenage des exercices, ces boutons n'existent que dans
        // l'aperçu : le PDF passe par `pdfItems`, qui ne les connaît pas.
        // LA ZONE DE LA QUESTION EST AUSSI CE QU'ON CLIQUE POUR LA RÉCRIRE.
        //
        // Elle couvre exactement le texte, et elle est au-dessus de lui : deux
        // cibles superposées se voleraient les clics — l'une des deux gagne
        // toujours, et ce serait celle qu'on ne veut pas. Une seule zone,
        // donc : ses deux boutons d'abord, et le reste ouvre l'éditeur.
        if (o.reglable && it.exoId != null && it.iQ != null) {
            const recrire = o.retouchable
                ? ` fx-retouche" data-txt-exo="${echapper(it.exoId)}" data-txt-rang="${it.iQ}"`
                    + ' title="Cliquer pour récrire cette question'
                : '';
            html += `<div class="fx-qgestes${recrire}"
                style="left:${it.x * k}px; top:${it.y * k}px;
                width:${(it.texteW + (it.texteX - it.x)) * k}px; height:${Math.max(it.lignes.length * o.interligne, o.interligne) * k}px">
                <button type="button" class="fx-qgeste" data-q-neuf="${echapper(it.exoId)}" data-q-rang="${it.iQ}"
                    title="Retirer une autre question au sort à cette place"
                    aria-label="Remplacer la question ${it.n ?? it.iQ + 1}">🎲</button>
                <button type="button" class="fx-qgeste fx-qgeste--sup" data-q-sup="${echapper(it.exoId)}" data-q-rang="${it.iQ}"
                    title="Retirer cette question de la fiche"
                    aria-label="Supprimer la question ${it.n ?? it.iQ + 1}">✕</button>
            </div>`;
        }
        // ET L'ÉNONCÉ LUI-MÊME SE RETOUCHE. Rémy : « il faudrait aller sur le
        // texte et avoir la possibilité de changer la question ». C'était
        // refusé jusqu'ici parce qu'une question réécrite laisserait le
        // corrigé répondre à l'ancienne — une fiche dont les solutions mentent
        // est pire que pas de fiche. L'éditeur demande donc les DEUX : l'énoncé
        // et sa réponse, dans le même geste.
        it.lignes.forEach((ligne, i) => {
            html += `<div class="fq-ligne"
                style="left:${it.texteX * k}px; top:${(it.y + (it.dy || 0) + i * o.interligne) * k}px;
                width:${it.texteW * k}px; font-size:${o.taille * k}px">${ligneHtml(ligne, it.fractions, o)}</div>`;
        });
        if (it.choix) {
            html += `<div class="fq-choix" style="left:${it.texteX * k}px; top:${it.choixY * k}px;
                font-size:${o.taille * k * .9}px">${it.choix.map(c => '☐ ' + echapper(c)).join('&nbsp;&nbsp;')}</div>`;
        }
        if (it.rep && !it.rep.dansLeTexte) {
            // AVEC CHAMPS, la place à remplir est une boîte, pas un trait :
            // l'aperçu doit montrer ce que l'élève verra dans son lecteur PDF,
            // sinon le professeur découvre la différence à l'impression.
            if (o.champs) {
                html += `<div class="fx-champ" style="left:${it.rep.x * k}px; top:${it.rep.champY * k}px;
                    width:${it.rep.w * k}px; height:${it.rep.h * k}px"></div>`;
            } else {
                // Autant de traits que la fiche en réserve : on écrit SUR des
                // lignes, on n'écrit pas dans une marge.
                for (let i = 0; i < (it.rep.lignes || 1); i++) {
                    html += `<div class="fq-reponse" style="left:${it.rep.x * k}px;
                        top:${(it.rep.y + i * (it.rep.pas || 0)) * k}px; width:${it.rep.w * k}px"></div>`;
                }
            }
        }
    }
    return html;
}

/** L'en-tête d'une page d'aperçu (titre, Nom/Date, filet). */
/**
 * LES CHAMPS D'IDENTITÉ DE L'EN-TÊTE, et la place qu'il leur faut.
 *
 * Un « Nom » qui n'a que quatre centimètres de pointillés reçoit une écriture
 * tassée ou un nom coupé : la largeur est ici une donnée pédagogique, pas une
 * décoration. Le professeur choisit LESQUELS il imprime — une fiche
 * d'entraînement n'a pas besoin de la classe, un contrôle si.
 */
export const CHAMPS_ENTETE = {
    nom: { label: 'Nom', large: 44 },
    prenom: { label: 'Prénom', large: 36 },
    classe: { label: 'Classe', large: 18 },
    date: { label: 'Date', large: 24 }
};
export const CHAMPS_DEFAUT = ['nom', 'date'];

/**
 * Les champs demandés, dans l'ordre du modèle, AVEC LA LARGEUR QUI TIENT.
 *
 * Quatre champs demandent plus que la ligne n'offre une fois la case de la
 * note posée. On les rétrécit tous du même facteur plutôt que d'en laisser
 * tomber un : un professeur qui coche « Classe » et ne la voit pas imprimée
 * croit à un bogue — et c'en est un.
 *
 * Jamais sous douze millimètres : au-dessous, on n'écrit plus un prénom, on
 * l'entasse.
 */
function champsDe(liste, place) {
    const champs = (Array.isArray(liste) ? liste : CHAMPS_DEFAUT).filter(c => CHAMPS_ENTETE[c]);
    if (!champs.length || !place) return champs.map(c => ({ id: c, ...CHAMPS_ENTETE[c] }));
    // L'étiquette « Prénom : » et l'écart entre deux champs : mesurés au plus
    // juste, ils suffisent à ne pas promettre une place qui n'existe pas.
    const fixe = champs.reduce((s, c) => s + CHAMPS_ENTETE[c].label.length * 1.9 + 8, 0);
    const voulu = champs.reduce((s, c) => s + CHAMPS_ENTETE[c].large, 0);
    const k = Math.min(1, Math.max(0, place - fixe) / Math.max(1, voulu));
    return champs.map(c => ({
        id: c, label: CHAMPS_ENTETE[c].label,
        large: Math.max(12, CHAMPS_ENTETE[c].large * k)
    }));
}

/**
 * LE CARTOUCHE « NOTE / COMMENTAIRE » : un tableau à deux colonnes, sous
 * l'en-tête de la première page.
 *
 * La petite case « … / 20 » en haut à droite disait la note et rien d'autre.
 * Or ce qu'un professeur rend à un élève, ce n'est pas un chiffre : c'est un
 * chiffre ET une phrase. Sans place prévue, l'appréciation s'écrit en travers
 * de la première question, ou pas du tout.
 *
 * Les deux colonnes sont indépendantes : une fiche d'entraînement peut ne
 * vouloir que le commentaire, un contrôle rapide que la note.
 *
 *   { note: bool, commentaire: bool, sur: 20 }  →  null si aucune des deux.
 */
export const CARTOUCHE_H = 17;   // mm réservés à l'ensemble, air compris

export function cartoucheDe(entete = {}, interrogation = false) {
    const note = entete.note ?? interrogation;
    const com = entete.commentaire ?? false;
    if (!note && !com) return null;
    return { note: !!note, commentaire: !!com, sur: entete.noteSur || 20 };
}

/** La hauteur d'en-tête à réserver sur la PREMIÈRE page, cartouche compris. */
export function hauteurEntete1(page, cartouche) {
    return (page || A4).enteteH + (cartouche ? CARTOUCHE_H : 0);
}

/** Les deux colonnes du cartouche, en mm : [{x, w, label, valeur}]. */
function colonnesCartouche(P, c) {
    const L = P.w - 2 * P.marge;
    // La note tient dans trente millimètres ; tout le reste va au commentaire,
    // qui en a bien plus besoin — on n'écrit pas « Il faut apprendre les
    // tables de multiplication » dans deux centimètres.
    const noteW = c.commentaire ? 30 : L;
    const cols = [];
    if (c.note) cols.push({ x: 0, w: noteW, label: 'Note', valeur: `… / ${c.sur}` });
    if (c.commentaire) {
        cols.push({
            x: c.note ? noteW : 0, w: c.note ? L - noteW : L,
            label: 'Commentaire', valeur: ''
        });
    }
    return cols;
}

/**
 * L'en-tête d'une page.
 *
 * LE TITRE EST CENTRÉ, et il ne dit QUE le titre. Il portait autrefois une
 * mention « — Interrogation » ajoutée par le logiciel : c'est au professeur
 * d'écrire ce qu'est sa feuille, pas au générateur de le décider pour lui.
 *
 * Le titre a sa ligne, l'identité la sienne, et le cartouche — s'il est
 * demandé — vient sous le filet, sur toute la largeur.
 *
 * @param {Object} [entete] - { champs: ['nom','date'] }
 * @param {Object|null} note - le cartouche, sur la première page seulement.
 */
export function apercuEntete(k, titre, sousTitre, note, page, entete = {}) {
    const P = page || A4;
    const champs = champsDe(entete.champs, P.w - 2 * P.marge);
    const lignes = champs.map(c => `<span class="fp-champ"><i>${c.label} :</i>
        <u style="width:${c.large * k}px"></u></span>`).join('');
    const yFilet = P.marge + (champs.length ? 14 : 9);
    // Le cadre est haut de treize millimètres : deux lignes d'écriture adulte.
    const hCadre = CARTOUCHE_H - 4;
    const cadre = note ? colonnesCartouche(P, note).map(c => `
        <div class="fp-cart" style="left:${(P.marge + c.x) * k}px; top:${(yFilet + 2) * k}px;
             width:${c.w * k}px; height:${hCadre * k}px">
            <i style="font-size:${2.9 * k}px">${c.label}</i>
            <b style="font-size:${4.6 * k}px">${echapper(c.valeur)}</b>
        </div>`).join('') : '';
    // UN TITRE VIDE NE LAISSE PAS DE BANDEAU VIDE : la ligne disparaît, et
    // les champs d'identité remontent d'autant.
    const avecTitre = !!String(titre || '').trim() || !!sousTitre;
    return `
        ${avecTitre ? `<div class="fp-entete" style="left:${P.marge * k}px; right:${P.marge * k}px;
            top:${(P.marge + 1) * k}px; font-size:${4.8 * k}px">
            <b>${echapper(titre || '')}${sousTitre ? (titre ? ' — ' : '') + echapper(sousTitre) : ''}</b>
        </div>` : ''}
        ${champs.length ? `<div class="fp-identite" style="left:${P.marge * k}px; right:${P.marge * k}px;
            top:${(P.marge + 7.4) * k}px; font-size:${3.3 * k}px; gap:${5 * k}px">${lignes}</div>` : ''}
        <div class="fp-ligne" style="left:${P.marge * k}px; right:${P.marge * k}px;
            top:${yFilet * k}px;"></div>
        ${cadre}`;
}

// --- PDF ---------------------------------------------------------------------

export function entetePdf(pdf, titre, sousTitre, bareme, note, page, entete = {}) {
    const P = page || A4;
    const champs = champsDe(entete.champs, P.w - 2 * P.marge);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14.5);
    pdf.setTextColor(...ENCRE.texte);
    // LE TITRE A SA LIGNE, ET IL EST CENTRÉ : c'est le titre du devoir, pas une
    // étiquette de classeur. Il ne porte que ce que le professeur a écrit.
    const droite = P.w - P.marge;
    // Un titre vide ne laisse pas de ligne vide sur la feuille : on n'écrit
    // rien du tout. L'en-tête est facultatif, y compris au PDF.
    const ligneTitre = `${titre || ''}${sousTitre ? ((titre || '') ? ' — ' : '') + sousTitre : ''}`.trim();
    if (ligneTitre) {
        pdf.splitTextToSize(pourPdf(ligneTitre), droite - P.marge).slice(0, 1)
            .forEach(l => pdf.text(l, P.w / 2, P.marge + 5.6, { align: 'center' }));
    }

    // L'IDENTITÉ SUR SA PROPRE LIGNE, chaque champ avec sa longueur : un
    // « Nom » de quatre centimètres reçoit une écriture tassée ou un nom coupé.
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.6);
    pdf.setTextColor(...ENCRE.gris);
    let x = P.marge;
    champs.forEach(({ label, large }) => {
        const etiquette = pourPdf(`${label} :`);
        pdf.text(etiquette, x, P.marge + 10.6);
        x += pdf.getTextWidth(etiquette) + 1.5;
        pointilles(pdf, x, P.marge + 10.9, large);
        x += large + 5;
    });
    pdf.setTextColor(...ENCRE.texte);
    pdf.setDrawColor(...ENCRE.trait);
    pdf.setLineWidth(0.4);
    const yFilet = P.marge + (champs.length ? 13.5 : 9);
    pdf.line(P.marge, yFilet, droite, yFilet);

    // LE CARTOUCHE, sur toute la largeur : la note à gauche dans sa colonne
    // étroite, l'appréciation à droite dans tout ce qui reste. Un tableau, pas
    // deux cases posées côte à côte : le trait du milieu se partage.
    let yBas = yFilet;
    if (note) {
        const hCadre = CARTOUCHE_H - 4;
        const y0 = yFilet + 2;
        pdf.setLineWidth(0.5);
        colonnesCartouche(P, note).forEach((c) => {
            pdf.rect(P.marge + c.x, y0, c.w, hCadre, 'S');
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(7);
            pdf.setTextColor(...ENCRE.gris);
            pdf.text(pourPdf(c.label), P.marge + c.x + 1.8, y0 + 3.2);
            if (c.valeur) {
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(13);
                pdf.text(pourPdf(c.valeur), P.marge + c.x + c.w / 2, y0 + 9.6, { align: 'center' });
            }
        });
        pdf.setTextColor(...ENCRE.texte);
        yBas = y0 + hCadre;
    }
    if (bareme) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.6);
        pdf.setTextColor(...ENCRE.gris);
        pdf.text(pourPdf(bareme), P.marge, yBas + 4.4);
        pdf.setTextColor(...ENCRE.texte);
    }
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(160, 165, 175);
    pdf.text('Fiche générée par AtoutMath', P.w / 2, P.h - 4, { align: 'center' });
    // LA PAGINATION EST EN BAS, PAS DANS LE TITRE. « Contrôle n° 3 — page 2/4 »
    // au milieu d'un titre centré, c'est le titre qui n'est plus centré.
    if (entete.pagination) {
        pdf.text(pourPdf(entete.pagination), P.w - P.marge, P.h - 4, { align: 'right' });
    }
    pdf.setTextColor(...ENCRE.texte);
}

function pointilles(pdf, x, y, largeur) {
    pdf.setDrawColor(...ENCRE.pointille);
    pdf.setLineWidth(0.25);
    pdf.setLineDashPattern([0.7, 1.1], 0);
    pdf.line(x, y, x + largeur, y);
    pdf.setLineDashPattern([], 0);
}

/**
 * UN CHAMP DE SAISIE dans le PDF — un vrai champ de formulaire AcroForm, pas
 * un rectangle dessiné. L'élève ouvre le fichier, clique, tape sa réponse,
 * enregistre et rend le PDF : la fiche se remplit à l'écran sans imprimante.
 *
 * jsPDF fournit `AcroFormTextField` sur le module UMD (`window.jspdf`). S'il
 * manque — build allégé, version ancienne — on retombe sur les pointillés :
 * une fiche imprimable vaut mieux qu'une erreur au téléchargement.
 */
function champSaisie(pdf, rep, index) {
    const Champ = (typeof window !== 'undefined' && window.jspdf && window.jspdf.AcroFormTextField)
        || (pdf.AcroFormTextField);
    if (typeof Champ !== 'function' || typeof pdf.addField !== 'function') {
        pointilles(pdf, rep.x, rep.y, rep.w);
        return false;
    }
    const champ = new Champ();
    champ.Rect = [rep.x, rep.champY, rep.w, rep.h];
    // Le nom doit être UNIQUE dans le document : deux champs homonymes sont un
    // seul champ pour un lecteur PDF, et taper dans l'un remplit l'autre.
    champ.fieldName = rep.nom ? `${rep.nom}_${index}` : `reponse_${index}`;
    champ.fontSize = 10;
    champ.multiline = false;
    pdf.addField(champ);
    // Le champ lui-même n'a pas de bordure visible à l'impression : on pose un
    // trait sous lui, pour que la fiche imprimée reste utilisable au stylo.
    pointilles(pdf, rep.x, rep.champY + rep.h, rep.w);
    return true;
}

/**
 * UNE CASE DE GRILLE REMPLISSABLE.
 *
 * Une fiche remplissable qui s'arrête aux questions écrites laisse l'élève sur
 * ordinateur devant un sudoku qu'il ne peut pas remplir — c'est-à-dire devant
 * un dessin. Les grilles reçoivent donc les mêmes champs, une case à la fois,
 * et sans trait sous le champ : la case EST déjà le cadre.
 */
// UN COMPTEUR QUI NE REPART JAMAIS À ZÉRO. `pdfItems` est appelé une fois par
// PAGE : un compteur local rendait « case_1 » sur chaque page, et deux champs
// homonymes ne font qu'un seul champ pour un lecteur PDF — l'élève tapait dans
// une case du premier sudoku et voyait son chiffre apparaître dans le second.
let compteurChamps = 0;

function champCase(pdf, x, y, w, h, nom) {
    const Champ = (typeof window !== 'undefined' && window.jspdf && window.jspdf.AcroFormTextField)
        || (pdf.AcroFormTextField);
    if (typeof Champ !== 'function' || typeof pdf.addField !== 'function') return false;
    const champ = new Champ();
    champ.Rect = [x, y, w, h];
    champ.fieldName = nom;
    champ.fontSize = Math.max(6, Math.min(16, h * 2.2));
    champ.multiline = false;
    champ.textAlign = 'center';
    pdf.addField(champ);
    return true;
}

/** Les items d'une page, dans le PDF. */
export function pdfItems(pdf, page, o) {
    let nChamp = 0;
    for (const it of page.items) {
        if (it.type === 'exo') {
            pdf.setFillColor(...ENCRE.bandeau);
            pdf.setDrawColor(...ENCRE.bandeauTrait);
            pdf.setLineWidth(0.2);
            pdf.roundedRect(it.x, it.y, it.w, it.h, 1.2, 1.2, 'FD');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(o.taille * 2.9);
            pdf.setTextColor(...ENCRE.texte);
            pdf.text(pourPdf(titreExo(it)), it.x + 3, it.y + it.h / 2 + o.taille * 0.42);
            if (it.points) {
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(o.taille * 2.5);
                pdf.setTextColor(...ENCRE.gris);
                pdf.text(`… / ${it.points}`, it.x + it.w - 3, it.y + it.h / 2 + o.taille * 0.42, { align: 'right' });
            }
            continue;
        }
        if (it.type === 'consigne') {
            pdf.setFont('helvetica', 'italic');
            pdf.setFontSize(o.tailleConsigne * 2.83);
            pdf.setTextColor(...ENCRE.gris);
            it.lignes.forEach((ligne, i) => {
                pdf.text(pourPdf(ligne), it.x + 1, it.y + o.tailleConsigne + i * o.tailleConsigne * 1.45);
            });
            continue;
        }
        if (it.type === 'grille') {
            const r = RENDUS[it.cle];
            if (r) {
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(o.tailleConsigne * 2.83);
                pdf.setTextColor(...ENCRE.gris);
                if (it.n != null && !r.numeroInterne) pdf.text(`${it.n}.`, it.x, it.y - 1.2);
                // Le rendu de la grille appelle ce crayon pour chaque case
                // vide, quand la fiche est déclarée remplissable.
                const champ = (o.champs && !o.solution)
                    ? (x, y, w, h) => champCase(pdf, x, y, w, h, `case_${++compteurChamps}`)
                    : null;
                r.pdfGrille(pdf, it.item,
                    { x: it.x, y: it.y, taille: it.taille, boite: it.boite,
                        numero: r.numeroInterne ? it.n : null },
                    !!o.solution, champ);
            }
            continue;
        }
        pdf.setTextColor(...ENCRE.texte);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(o.taille * 2.83);
        // Sur la MÊME ligne de base que la première ligne de l'énoncé : voir
        // le commentaire de l'aperçu, plus haut.
        if (it.n != null) pdf.text(`${it.n}.`, it.x, it.y + (it.dy || 0) + o.taille);
        pdf.setFont('helvetica', 'normal');
        it.lignes.forEach((ligne, i) => {
            dessinerLigne(pdf, ligne, it.texteX, it.y + (it.dy || 0) + o.taille + i * o.interligne, o, it.fractions);
        });
        if (it.choix) {
            // LES CASES À COCHER SONT DESSINÉES, pas écrites. Le caractère ☐
            // n'existe pas dans les polices standard du PDF : il sortait en
            // deux glyphes de hasard, et emportait toute la ligne de choix
            // avec lui. Un carré tracé s'imprime partout et se coche mieux.
            pdf.setFontSize(o.taille * 2.5);
            const cote = o.taille * 0.82;
            let cx = it.texteX;
            for (const choix of it.choix) {
                const mot = pourPdf(String(choix));
                pdf.setDrawColor(...ENCRE.gris);
                pdf.setLineWidth(0.22);
                pdf.rect(cx, it.choixY + o.taille - cote, cote, cote, 'S');
                pdf.setTextColor(...ENCRE.gris);
                pdf.text(mot, cx + cote + 1.4, it.choixY + o.taille);
                cx += cote + 1.4 + pdf.getTextWidth(mot) + 4;
            }
            pdf.setTextColor(...ENCRE.texte);
        }
        if (it.rep) {
            if (o.champs) champSaisie(pdf, it.rep, ++nChamp);
            else {
                for (let i = 0; i < (it.rep.lignes || 1); i++) {
                    pointilles(pdf, it.rep.x, it.rep.y + i * (it.rep.pas || 0), it.rep.w);
                }
            }
        }
    }
}

/**
 * LA PAGE DES SOLUTIONS — en aperçu et en PDF, écrite une seule fois.
 *
 * Ces deux fonctions vivaient en double, une copie dans la fiche d'un exercice
 * et une dans la fiche d'un parcours. Corriger la présentation d'un corrigé
 * demandait donc de la corriger deux fois — et la seconde se corrigeait un
 * commit plus tard, ou pas du tout.
 *
 * LA RÉPONSE EST SOULIGNÉE. Sur un corrigé, ce qu'on cherche n'est pas la
 * ligne, c'est le nombre DANS la ligne : « 92 202 = 90 000 + 2 000 + 200 + 2 »
 * ne dit pas lequel des quatre nombres était la question. En gras ET souligné :
 * le gras seul se perd sur une photocopie grise, le trait seul se confond avec
 * la ligne à remplir d'un énoncé.
 */
export function apercuSolutions(page, k, o) {
    let html = '';
    for (const b of page.blocs) {
        b.lignes.forEach((ligne, i) => {
            const corps = morceauxReponse(ligne).map(m => {
                // LES FRACTIONS S'EMPILENT ICI AUSSI. Le corrigé les écrivait
                // « 5/7 » à la barre oblique, alors que la feuille de
                // questions, elle, les empile : deux écritures de la même
                // fraction dans le même document, et celle du corrigé n'est pas
                // celle qu'on demande à l'élève.
                const t = ligneHtml(m.texte, o.fractions, o);
                if (m.souligne) return `<u class="fq-soul">${t}</u>`;
                return m.reponse ? `<b class="fq-rep">${t}</b>` : t;
            }).join('');
            html += `<div class="fq-ligne" style="left:${b.x * k}px; top:${(b.y + i * o.interligne) * k}px;
                width:${b.largeur * k}px; font-size:${o.taille * k}px">${corps}</div>`;
        });
    }
    return html;
}

export function pdfSolutions(pdf, page, o) {
    pdf.setFontSize(o.taille * 2.83);
    pdf.setTextColor(...ENCRE.texte);
    for (const b of page.blocs) {
        b.lignes.forEach((ligne, i) => {
            const y = b.y + o.taille + i * o.interligne;
            let x = b.x;
            for (const m of morceauxReponse(ligne)) {
                // LE GRAS SUFFIT. La réponse portait en plus un trait dessous ;
                // en mode compact, où toute la ligne EST la réponse, la page
                // entière se retrouvait soulignée.
                pdf.setFont('helvetica', m.reponse ? 'bold' : 'normal');
                const depart = x;
                x = dessinerLigne(pdf, m.texte, x, y, o, o.fractions);
                // LE CALCUL PRIORITAIRE EST SOULIGNÉ. Le gras est déjà pris par
                // la réponse : il faut une seconde emphase, et c'est celle qu'on
                // trace au tableau sous l'opération qu'on va faire.
                if (m.souligne) {
                    pdf.setLineWidth(0.25);
                    pdf.setDrawColor(...ENCRE.texte);
                    pdf.line(depart, y + o.taille * 0.22, x, y + o.taille * 0.22);
                }
            }
        });
    }
    pdf.setFont('helvetica', 'normal');
}
