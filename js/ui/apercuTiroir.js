// L'APERÇU DU CATALOGUE — celui qui reste quand on le lui demande.
//
// Un relecteur de Rémy, sur la vignette de survol : « premier point de friction
// avec l'aperçu, si tu décale le curseur l'aperçu se ferme, et de plus la
// taille de la vignette est pas toujours adaptée au jeu affiché. […] Au clic
// sur la vignette, l'aperçu (bien dimensionné) doit rester actif (sauf si tu
// ferme l'aperçu via la croix) pour un test rapide. »
//
// ─────────────────────────────────────────────────────────────────────────────
//
// DEUX GESTES, DEUX INTENTIONS — et c'est le seul endroit où je m'écarte de la
// proposition. Remplacer le survol par le clic transformerait le balayage d'un
// catalogue de 172 exercices en 172 clics. On garde donc les deux :
//
//   · SURVOLER = jeter un œil. La vignette monte après une demi-seconde et
//     s'efface quand on s'en va. C'est ce qui permet de descendre une liste.
//   · CLIQUER = s'installer. La vignette s'ÉPINGLE : elle ne part plus qu'à la
//     croix, et surtout elle devient CLIQUABLE — on y joue pour de vrai.
//
// TROIS DÉFAUTS MESURÉS, TROIS RÉPONSES :
//
//   1. « si tu décale le curseur l'aperçu se ferme ». Mesuré : déplacer la
//      souris VERS la vignette la fermait. Le CSS posait `pointer-events: none`
//      dessus — on ne pouvait donc RIEN y cliquer, jamais, épinglée ou pas — et
//      le `mouseleave` de la rangée partait dès que le curseur franchissait les
//      vingt pixels de vide qui les séparent. On rend la boîte cliquable et
//      l'on accorde un DÉLAI DE GRÂCE : le temps de traverser le vide.
//
//   2. « la taille de la vignette n'est pas adaptée au jeu ». Mesuré : la boîte
//      fait 340 × 280 pour tout le monde, et la toile 850 × 600 réduite à 40 %.
//      Sur douze jeux, QUATRE débordent — « Le Symétrique aux Carreaux » occupe
//      240 % de la boîte, on en voit donc moins de la moitié. On mesure le
//      contenu et l'on taille la fenêtre dessus.
//
//   3. Aucune croix. Une fenêtre qui ne se ferme pas est une fenêtre dont on a
//      peur.

import { launchPreview } from '../games/engine.js';
import { clearEngines } from '../core/timers.js';
import { destroyAllDemoCursors } from '../core/demoPointer.js';

/**
 * LES BORNES DE LA VIGNETTE.
 *
 * Un maximum, parce qu'une vignette qui couvre l'écran n'est plus une vignette
 * mais un plein écran qu'on n'a pas demandé — et le plein écran existe déjà,
 * c'est l'œil. Un minimum, parce qu'une boîte de la taille de son contenu,
 * quand ce contenu est une seule opération, donne un timbre-poste.
 */
export const BORNES = { maxL: 460, maxH: 430, minL: 280, minH: 200 };

/**
 * LE DÉLAI DE GRÂCE, en millisecondes.
 *
 * Entre la rangée et la vignette il y a vingt pixels de vide : les traverser
 * fait partir le `mouseleave` de la rangée avant que le `mouseenter` de la
 * vignette n'arrive. Sans ce délai, la vignette se ferme DANS le geste qui
 * allait la chercher. 260 ms est le temps d'un mouvement de poignet ; plus long
 * et la vignette s'attarde après qu'on l'a quittée pour de bon.
 */
const GRACE = 260;

let instance = null;      // le jeu qui tourne dans la vignette
let jeton = 0;            // celui qui passe vite : l'aperçu arrivé trop tard meurt
let epingle = false;
let minuteurSortie = null;
let exoAffiche = null;

const boite = () => document.getElementById('hover-demo-box');
const toile = () => document.getElementById('hover-demo-canvas');

/** L'exercice actuellement épinglé, ou null. Sert aux essais et au débogage. */
export function apercuEpingle() {
    return epingle ? exoAffiche : null;
}

/**
 * TUER LE JEU, PAS SEULEMENT SES MINUTEURS.
 *
 * `clearEngines()` ne coupe que les minuteurs déclarés par `regInterval` ; les
 * jeux historiques ouvrent les leurs directement et y survivaient. On quittait
 * une rangée, la vignette se cachait, et la course continuait de rafraîchir un
 * tableau de bord que la vignette suivante venait d'effacer : une erreur par
 * seconde dans la console, jusqu'au rechargement de la page.
 */
function tuerLInstance() {
    jeton++;
    const h = instance;
    instance = null;
    if (h && typeof h.destroy === 'function') {
        try { h.destroy(); } catch (e) { /* déjà démonté */ }
    }
    clearEngines();
    destroyAllDemoCursors();
}

/** Ferme la vignette. `force` passe outre l'épinglage — c'est la croix. */
export function fermerApercu(opts = {}) {
    if (epingle && !opts.force) return false;
    clearTimeout(minuteurSortie);
    minuteurSortie = null;
    epingle = false;
    exoAffiche = null;
    const b = boite();
    if (b) {
        b.style.display = 'none';
        b.classList.remove('hd-epingle');
    }
    tuerLInstance();
    return true;
}

/**
 * LE CURSEUR A QUITTÉ LA RANGÉE — on ne ferme pas tout de suite.
 *
 * Il est peut-être en route vers la vignette. C'est `mouseenter` sur la boîte
 * qui annulera ce minuteur ; sinon, la vignette s'efface.
 */
export function laisserPartir() {
    if (epingle) return;
    clearTimeout(minuteurSortie);
    minuteurSortie = setTimeout(() => fermerApercu(), GRACE);
}

/** Le curseur est revenu (sur la rangée ou sur la vignette) : on annule la sortie. */
export function retenir() {
    clearTimeout(minuteurSortie);
    minuteurSortie = null;
}

/**
 * TAILLER LA FENÊTRE SUR LE CONTENU, et non l'inverse.
 *
 * ON MESURE SANS TRANSFORMATION, et c'est le point délicat. La toile est
 * déclarée `container-type: size` : les jeux qui interrogent le conteneur
 * `plateau` se dessinent d'après SES dimensions. Si l'on changeait sa taille
 * pour l'ajuster, la mise en page se referait, le contenu changerait de
 * dimensions, et la mesure suivante dirait autre chose — deux passes qui se
 * poursuivent sans jamais se rejoindre.
 *
 * On laisse donc la toile à ses 850 × 600 logiques — le jeu se dessine
 * exactement comme avant — et l'on ne change que la FENÊTRE qu'on ouvre
 * dessus : son échelle, et le coin par lequel on regarde.
 */
function ajusterAuContenu() {
    const b = boite(), t = toile();
    if (!b || !t) return;

    const avant = t.style.transform;
    t.style.transform = 'none';
    const base = t.getBoundingClientRect();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    t.querySelectorAll('*').forEach(e => {
        const r = e.getBoundingClientRect();
        if (!r.width || !r.height) return;
        x0 = Math.min(x0, r.x - base.x); y0 = Math.min(y0, r.y - base.y);
        x1 = Math.max(x1, r.right - base.x); y1 = Math.max(y1, r.bottom - base.y);
    });
    if (x0 === Infinity) { t.style.transform = avant || 'scale(0.4)'; return; }

    // LE CONTENU COMMENCE SOUVENT AVANT LA TOILE, et il ne faut surtout pas le
    // ramener à zéro. J'avais d'abord écrit `x0 = Math.max(0, x0)`, en me
    // disant qu'un jeu débordant de son propre plateau n'avait pas à faire
    // grandir la vignette. La sonde a dit le contraire : « Le Symétrique aux
    // Carreaux » commence à x = −331 et Garam à y = −62, parce que la toile
    // centre ses enfants et qu'un enfant plus large qu'elle déborde des DEUX
    // côtés. Couper à zéro, c'était couper le côté gauche du quadrillage.
    //
    // On prend donc l'étendue telle qu'elle est, négatifs compris : c'est la
    // seule qui décrive ce que le jeu dessine vraiment.
    const l = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);

    // Jamais d'agrandissement : un jeu tenant dans 300 px reste net à 300 px.
    const ech = Math.min(BORNES.maxL / l, BORNES.maxH / h, 1);

    t.style.transformOrigin = 'top left';
    t.style.transform = `scale(${ech}) translate(${-x0}px, ${-y0}px)`;

    const cadre = b.querySelector('.hd-canvas-wrap');
    b.style.width = `${Math.max(BORNES.minL, Math.round(l * ech))}px`;
    if (cadre) cadre.style.height = `${Math.max(BORNES.minH, Math.round(h * ech))}px`;
    // La hauteur totale se déduit du cadre et de l'en-tête : la fixer ici
    // ferait mentir l'un des deux.
    b.style.height = 'auto';
}

/**
 * POSER LA VIGNETTE À CÔTÉ DE SA RANGÉE, sans sortir de l'écran.
 *
 * Après `ajusterAuContenu`, donc : la boîte connaît alors sa vraie hauteur, et
 * l'on cesse de la caler sur les 280 px qu'elle n'a plus.
 */
function placer(ancre) {
    const b = boite();
    if (!b || !ancre) return;
    const r = ancre.getBoundingClientRect();
    const h = b.getBoundingClientRect().height || BORNES.minH;
    const l = b.getBoundingClientRect().width || BORNES.minL;

    let haut = r.top - 20;
    if (haut + h > window.innerHeight - 12) haut = window.innerHeight - h - 12;
    if (haut < 12) haut = 12;

    // À DROITE DE LA RANGÉE, ou à gauche s'il n'y a plus la place. Le tiroir
    // vit à gauche de l'écran, donc c'est presque toujours à droite ; presque
    // n'est pas toujours, et une vignette moitié hors de l'écran ne montre rien.
    let gauche = r.right + 20;
    if (gauche + l > window.innerWidth - 12) gauche = Math.max(12, r.left - l - 20);

    b.style.top = `${Math.round(haut)}px`;
    b.style.left = `${Math.round(gauche)}px`;
}

/**
 * MONTRER L'APERÇU D'UN EXERCICE.
 *
 * @param {object} exo      l'exercice du catalogue
 * @param {Element} ancre   la rangée à côté de laquelle poser la vignette
 * @param {object} [opts]   { epingler } — le clic épingle, le survol non
 * @returns {Promise<void>}
 */
export async function montrerApercu(exo, ancre, opts = {}) {
    const b = boite(), t = toile();
    if (!b || !t) return;
    retenir();

    // ÉPINGLER CE QUI EST DÉJÀ LÀ NE LE REDÉMARRE PAS. Cliquer sur la rangée
    // qu'on survolait depuis deux secondes relançait le jeu depuis zéro : on
    // perdait justement la partie qu'on était en train de regarder.
    if (epingle && exoAffiche && exoAffiche.id === exo.id) return;
    const memeSurvol = !epingle && exoAffiche && exoAffiche.id === exo.id && instance;
    if (memeSurvol && opts.epingler) {
        epingle = true;
        b.classList.add('hd-epingle');
        majTitre(exo);
        return;
    }

    tuerLInstance();
    exoAffiche = exo;
    epingle = !!opts.epingler;
    b.classList.toggle('hd-epingle', epingle);
    majTitre(exo);

    t.innerHTML = '';
    // On repart de la taille par défaut : sans cela, la vignette d'un jeu large
    // resterait large pour le suivant, et la mesure se ferait dans une boîte
    // que le jeu précédent a taillée.
    b.style.width = '';
    b.style.height = '';
    const cadre = b.querySelector('.hd-canvas-wrap');
    if (cadre) cadre.style.height = '';
    t.style.transform = 'scale(0.4)';
    b.style.display = 'flex';
    placer(ancre);

    const monJeton = ++jeton;
    let h = null;
    try {
        h = await launchPreview(exo, t, opts.params || null, { muet: true });
    } catch (e) {
        // Un jeu qui refuse de démarrer ne doit pas laisser une boîte vide en
        // travers de l'écran.
        if (monJeton === jeton) fermerApercu({ force: true });
        return;
    }
    if (monJeton !== jeton) {
        if (h && typeof h.destroy === 'function') { try { h.destroy(); } catch (e) { /* démonté */ } }
        return;
    }
    instance = h;

    // ON MESURE DEUX FOIS, ET PAS UNE DE PLUS.
    //
    // Ce n'est pas le rognage que la seconde passe corrige — celui-là venait
    // d'ailleurs, et la mesure le dit : à une seule passe comme à deux, les
    // douze jeux essayés tiennent entiers. C'est la FORME de la fenêtre.
    // « Le Symétrique aux Carreaux » continue de déplier son quadrillage
    // après sa première image : mesuré à 260 ms seulement, il obtient une
    // boîte de 280 × 492 remplie à 83 % — haute, étroite, et pleine de vide.
    // Remesuré à 960 ms, il obtient 460 × 262 remplie à 100 %.
    //
    // DEUX, et non « jusqu'à ce que ça se stabilise » : un jeu où quelque chose
    // tombe grandit indéfiniment, et la vignette rétrécirait à chaque image
    // sous les yeux du professeur. Deux passes attrapent ce qui se met en
    // place ; elles laissent de côté ce qui bouge pour toujours.
    for (const delai of [260, 700]) {
        await new Promise(r => setTimeout(r, delai));
        if (monJeton !== jeton) return;
        ajusterAuContenu();
        placer(ancre);
    }
}

function majTitre(exo) {
    const titre = document.getElementById('hd-title');
    if (titre) titre.textContent = exo.title;
}

/**
 * BRANCHER LA CROIX ET LA ZONE SENSIBLE, une fois pour toutes.
 *
 * Appelé au démarrage. La boîte est unique dans la page : lui recoller ses
 * écouteurs à chaque survol en aurait empilé un par rangée du catalogue.
 */
export function initApercuTiroir() {
    const b = boite();
    if (!b || b.dataset.branche) return;
    b.dataset.branche = '1';

    const croix = b.querySelector('.hd-fermer');
    if (croix) croix.onclick = (e) => { e.stopPropagation(); fermerApercu({ force: true }); };

    // LE CURSEUR QUI ARRIVE SUR LA VIGNETTE L'A CHOISIE. C'est le geste que le
    // relecteur décrivait : on va vers l'aperçu pour le regarder de près.
    b.addEventListener('mouseenter', retenir);
    b.addEventListener('mouseleave', laisserPartir);

    // ÉCHAP FERME, même épinglée. Une fenêtre sans sortie au clavier est une
    // fenêtre où l'on s'est fait enfermer.
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && b.style.display !== 'none') fermerApercu({ force: true });
    });
}
