// LES INFOBULLES — les nôtres, et non celles du navigateur.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'aimerais que tu revoies les tooltips qui là sont vieux et propres
// au navigateur, rends-les plus modernes, fais attention qu'il ne soit pas
// recouvert ni coupé ni sortant de la zone visible. »
//
// CE QU'ON PERD AVEC `title`, ET CE N'EST PAS QUE L'ALLURE :
//   · IL NE S'AFFICHE PAS AU DOIGT. Sur un téléphone ou une tablette, il n'y a
//     pas de survol : la moitié des boutons de la barre du professeur sont des
//     icônes muettes dont le nom n'existe que dans un `title` que personne ne
//     verra jamais.
//   · IL MET UNE SECONDE ET DEMIE À VENIR, et repart tout seul au bout de
//     quelques-unes. On ne choisit ni l'un ni l'autre.
//   · IL SE POSE OÙ LE SYSTÈME VEUT — hors de la fenêtre pour un bouton du
//     bord, par-dessus ce qu'on survolait, et coupé dans une application en
//     plein écran.
//
// CE QU'ON MET À LA PLACE : une bulle dessinée par la page, donc au thème de la
// page, qui se pose CONTRE son bouton et se replie dans l'écran quand il n'y a
// pas la place. Elle vit dans une couche à elle, au-dessus de tout le reste,
// pour ne jamais passer dessous.
//
// LE `title` EST RETIRÉ, PAS SEULEMENT MASQUÉ : c'est le seul moyen d'empêcher
// la bulle du système de venir par-dessus la nôtre. On le range dans
// `data-infobulle` — et si l'élément n'avait que lui pour se nommer, on lui
// pose un `aria-label`, sans quoi on rendrait muet pour un lecteur d'écran ce
// qu'on vient de rendre visible pour l'œil.

import { poserContre } from './poserContre.js';

const ID_COUCHE = 'infobulle-couche';
const ECART = 10;      // entre le bouton et la bulle
const MARGE = 8;       // entre la bulle et le bord de l'écran
const DELAI = 380;     // avant d'apparaître, à la souris

let bulle = null;
let cible = null;
let minuteur = null;

/** La couche d'accueil, créée au premier besoin. */
function couche() {
    let c = document.getElementById(ID_COUCHE);
    if (!c) {
        c = document.createElement('div');
        c.id = ID_COUCHE;
        document.body.appendChild(c);
    }
    return c;
}

/**
 * LE TEXTE D'UN ÉLÉMENT, ET LE DÉMÉNAGEMENT DU `title`.
 *
 * On ne le fait qu'une fois par élément, au premier survol : parcourir la page
 * entière au démarrage coûterait un balayage de tout le document pour des
 * bulles dont la plupart ne serviront jamais.
 */
function texteDe(el) {
    if (el.dataset.infobulle) return el.dataset.infobulle;
    const t = el.getAttribute('title');
    if (!t) return '';
    el.dataset.infobulle = t;
    el.removeAttribute('title');
    // SON NOM NE DOIT PAS PARTIR AVEC. Beaucoup d'icônes n'ont que leur `title`
    // pour se nommer ; le retirer les rendrait muettes au lecteur d'écran.
    if (!el.getAttribute('aria-label') && !el.textContent.trim()) {
        el.setAttribute('aria-label', t);
    }
    return t;
}

/** Fermer, sans laisser de minuteur en route. */
export function fermerInfobulle() {
    if (minuteur) { clearTimeout(minuteur); minuteur = null; }
    if (bulle) { bulle.remove(); bulle = null; }
    cible = null;
}

/**
 * POSER LA BULLE CONTRE SON ÉLÉMENT, SANS SORTIR DE L'ÉCRAN.
 *
 * Trois règles, dans cet ordre :
 *   1. au-dessus si la place y est, sinon en dessous — c'est le repli qui sauve
 *      les boutons de la barre du haut comme ceux de la barre du bas ;
 *   2. centrée sur l'élément, puis ramenée entre les deux bords ;
 *   3. jamais plus large que l'écran moins ses marges — au-delà, elle se replie
 *      sur plusieurs lignes plutôt que de déborder.
 *
 * LE CALCUL EST PARTAGÉ avec les panneaux de la fiche (`poserContre`), et ce
 * n'est pas qu'une économie de lignes : ma première version de ce placement
 * portait EXACTEMENT le défaut que Rémy venait de signaler à l'autre bout du
 * logiciel — `Math.max(MARGE, y)` borne le haut de la bulle et jamais son bas.
 * Il ne se voyait pas ici parce qu'une infobulle est courte ; il se serait vu
 * au premier texte d'aide un peu long, sur un téléphone. Trois copies d'un même
 * calcul, c'est trois occasions de ne le corriger que deux fois.
 *
 * Ce qui reste PROPRE à la bulle : le sens qu'elle affiche (sa pointe en
 * dépend) et le décalage de cette pointe.
 */
function placer(el) {
    const r = el.getBoundingClientRect();
    const largeurAvant = bulle.getBoundingClientRect().width;
    const { x, dessous } = poserContre(bulle, r, {
        ecart: ECART, marge: MARGE,
        // Une bulle se pose AU-DESSUS quand elle peut : c'est la convention, et
        // au-dessous elle recouvre ce qu'on s'apprête à lire.
        dessousDabord: false,
        // Elle se replie sur plusieurs lignes, elle ne défile pas : une bulle
        // d'aide avec un ascenseur serait un aveu.
        borner: false,
        // Centrée sur l'élément : `poserContre` aligne sur le bord gauche.
        decalageX: r.width / 2 - largeurAvant / 2
    });

    bulle.dataset.sens = dessous ? 'dessous' : 'dessus';
    // LA POINTE SUIT L'ÉLÉMENT, PAS LA BULLE. Quand la bulle a été ramenée dans
    // l'écran, son milieu n'est plus celui du bouton : une pointe centrée sur
    // elle désignerait le vide.
    const largeur = bulle.getBoundingClientRect().width;
    const pointe = r.left + r.width / 2 - x;
    bulle.style.setProperty('--pointe',
        `${Math.round(Math.max(12, Math.min(largeur - 12, pointe)))}px`);
}

function montrer(el) {
    const texte = texteDe(el);
    if (!texte) return;
    fermerInfobulle();
    cible = el;
    bulle = document.createElement('div');
    bulle.className = 'infobulle';
    bulle.setAttribute('role', 'tooltip');
    bulle.textContent = texte;
    bulle.style.maxWidth = `${Math.min(320, window.innerWidth - 2 * MARGE)}px`;
    couche().appendChild(bulle);
    placer(el);
    // L'apparition se joue APRÈS le placement : une bulle qui grandit pendant
    // qu'on la déplace se voit sauter.
    requestAnimationFrame(() => bulle && bulle.classList.add('infobulle--vue'));
}

/** L'élément porteur d'une infobulle sous ce point, ou null. */
const porteur = (el) => (el && el.closest)
    ? el.closest('[title]:not([title=""]), [data-infobulle]') : null;

/**
 * BRANCHER LES INFOBULLES, une fois pour toutes.
 *
 * Par DÉLÉGATION, et c'est nécessaire : la moitié des boutons de cette
 * application sont créés en cours de route — les étapes d'un parcours, les
 * lignes du catalogue, les cartes d'une classe. Un balayage au démarrage n'en
 * verrait aucun.
 */
export function brancherInfobulles(doc = document) {
    if (doc.__infobulles) return;
    doc.__infobulles = true;

    doc.addEventListener('pointerover', (e) => {
        // AU DOIGT, ON N'OUVRE PAS AU SURVOL : le premier appui ouvrirait une
        // bulle au lieu d'actionner le bouton. Le tactile est servi par le
        // `focus` qui suit l'appui, et par `aria-label` pour la voix.
        if (e.pointerType === 'touch') return;
        const el = porteur(e.target);
        if (!el || el === cible) return;
        fermerInfobulle();
        minuteur = setTimeout(() => montrer(el), DELAI);
    });

    doc.addEventListener('pointerout', (e) => {
        const el = porteur(e.target);
        if (el && el === cible) fermerInfobulle();
        else if (el && minuteur) { clearTimeout(minuteur); minuteur = null; }
    });

    // AU CLAVIER, SANS DÉLAI : celui qui tabule cherche le nom du bouton, il ne
    // le survole pas par hasard.
    doc.addEventListener('focusin', (e) => {
        const el = porteur(e.target);
        if (el) montrer(el);
    });
    doc.addEventListener('focusout', fermerInfobulle);

    // TOUT CE QUI DÉPLACE LA PAGE DÉPLACE LA CIBLE : une bulle posée en
    // coordonnées d'écran resterait accrochée au vide.
    doc.addEventListener('scroll', fermerInfobulle, true);
    window.addEventListener('resize', fermerInfobulle);
    doc.addEventListener('pointerdown', fermerInfobulle, true);
    doc.addEventListener('keydown', (e) => { if (e.key === 'Escape') fermerInfobulle(); });
}
