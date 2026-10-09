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
let ancreAffichee = null; // la rangée à côté de laquelle la vignette est posée
let enGlissement = false; // un exercice est en train d'être déposé dans le parcours

/**
 * PENDANT QU'ON GLISSE UN EXERCICE, PAS D'APERÇU.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RÉMY : « l'aperçu ne s'éteint pas quand on prend l'exercice pour le dragger
 * et le dropper du coup c'est bloquant ».
 *
 * CE QUI SE PASSAIT, DANS L'ORDRE. Le curseur entre sur la rangée : un minuteur
 * de 500 ms est armé. Avant qu'il n'ait sonné, le professeur appuie et tire —
 * `dragstart` ferme la vignette, ce qui ne sert à rien puisqu'elle n'est pas
 * encore ouverte, ET NE DÉSARME PAS LE MINUTEUR. Or pendant un glisser-déposer
 * HTML5 le navigateur cesse d'envoyer les événements de souris : le
 * `mouseleave` de la rangée n'arrive jamais. À 500 ms la vignette s'ouvre donc
 * EN PLEIN GLISSER, posée à droite de la rangée — c'est-à-dire par-dessus la
 * colonne du parcours — et plus rien ne la referme, puisque c'est `mouseleave`
 * qui s'en chargeait.
 *
 * Elle est `z-index: 10000` et `pointer-events: auto` : le dépôt lui arrive
 * dessus, elle n'en fait rien, et l'exercice n'entre pas dans le parcours.
 * « Bloquant » est le mot juste.
 *
 * D'OÙ UN INTERRUPTEUR PLUTÔT QU'UNE FERMETURE DE PLUS. Fermer à `dragstart`
 * ne suffit pas : ce qu'il faut, c'est que rien ne puisse OUVRIR tant que le
 * geste dure. C'est le seul endroit d'où l'on tienne les deux — le minuteur de
 * survol comme le clic qui épingle.
 */
export function glissementEnCours(oui) {
    enGlissement = !!oui;
    if (enGlissement) fermerApercu({ force: true });
}

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
        b.style.visibility = '';
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
 * LE MOT QUE PORTE LE BOUTON DE RELANCE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RÉMY : « dans les aperçus […] on a que une question et on ne peut pas
 * naviguer dans les questions en tant que prof ».
 *
 * MESURÉ, et c'est écrit dans le code depuis le début : `isDemo` « rend la main
 * au robot et GÈLE LA SAISIE ». Un aperçu montre donc UNE question, tirée au
 * hasard, et l'on ne peut ni y répondre ni passer à la suivante. Or c'est
 * exactement ce qu'un professeur vient y chercher : un générateur tire des
 * questions différentes, et juger l'exercice sur un seul tirage, c'est juger
 * sur un échantillon de un.
 *
 * ON NE DÉGÈLE PAS LA SAISIE — ce serait un autre sujet, et un aperçu jouable
 * a déjà son écran (l'œil, plein écran). ON RELANCE : un nouveau tirage, une
 * nouvelle question. C'est le geste que Rémy décrit, et il marche pour les
 * vingt-huit activités sans en toucher une seule.
 *
 * DEUX MOTS, PARCE QU'IL Y A DEUX CHOSES. Un exercice à générateur pose des
 * questions : « Question suivante ». Un jeu du catalogue — Hanoï, Le Pousseur —
 * n'en pose aucune, il distribue une partie : « Relancer ». Écrire
 * « question suivante » sur la Tour de Hanoï serait faux.
 */
export const motDeRelance = (exo) => (exo && exo.generatorId)
    ? 'Question suivante' : 'Relancer';

/** Deux longueurs à six pour cent près — voir `proche`, ci-dessous. */
const presqueEgal = (a, b) => Math.abs(a - b) / Math.max(1e-6, Math.abs(b)) < 0.06;

/**
 * COMBIEN DE TEMPS ON ATTEND LA PREMIÈRE IMAGE, en millisecondes.
 *
 * Mesuré : les jeux du catalogue dessinent quelque chose en moins de 50 ms,
 * soit deux ou trois images. Ce plafond n'est donc pas un délai qu'on subit,
 * c'est un abandon : passé ce temps, le jeu ne dessinera rien du tout et mieux
 * vaut montrer un cadre vide qu'un cadre caché pour toujours.
 */
const PLAFOND_PREMIERE_IMAGE = 600;

/** Quand on remesure, pour les jeux qui se déplient après leur première image. */
const RETOUCHE = 700;

const surLaProchaineImage = (fn) => (typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame(fn)
    : setTimeout(() => fn(Date.now()), 16));

/**
 * NE RIEN MONTRER TANT QUE CE N'EST PAS À LA BONNE TAILLE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RÉMY : « dans le choisi un exercice c'est tout gros et après ça prend la
 * bonne taille, idem pour l'aperçu quand on passe la souris ».
 *
 * MESURÉ, et il a raison deux fois. Dans la fenêtre de choix, le jeu s'affiche
 * à sa taille logique dans un cadre de 358 × 300 : « La Chasse aux Zéros »
 * occupe 358 × 763, soit DEUX FOIS ET DEMIE le cadre, et il reste ainsi 240 ms
 * avant de se ranger. Dans la vignette de survol, c'est l'inverse — le jeu part
 * à 40 % (324 × 224) et saute à 460 × 318 au bout d'un quart de seconde. Deux
 * symptômes, une seule cause : ON MONTRAIT AVANT D'AVOIR MESURÉ.
 *
 * La mesure attendait 260 ms parce que je l'avais posée sur un `setTimeout`
 * rond, sans vérifier quand le jeu dessine vraiment. Il dessine en moins de
 * 50 ms. On n'avait donc aucune raison d'attendre : on regarde à chaque image
 * si quelque chose est dessiné, on pose l'échelle dès que oui, et l'on révèle.
 *
 * LA SECONDE MESURE RESTE, parce qu'elle sert : « Le Symétrique aux Carreaux »
 * continue de déplier son quadrillage après sa première image. Mais elle ne
 * repose l'échelle que si elle a trouvé autre chose (voir `proche`) — sinon
 * elle ne fait rien, et rien ne saute.
 *
 * @param {object} o
 * @param {Function} o.ajuster  () => mesure|null — pose l'échelle, rend la mesure
 * @param {Function} o.montrer  () => void — révèle le cadre, une fois ajusté
 * @param {Function} [o.vivant] () => boolean — est-ce toujours cet aperçu-là ?
 *                              Un professeur qui descend sa liste en ouvre dix
 *                              en deux secondes ; sans cette garde, le neuvième
 *                              se ferait redimensionner par le troisième.
 */
export function ajusterDesQueDessine({ ajuster, montrer, vivant = () => true }) {
    let revelee = false;
    let debut = null;
    let premiere = null;
    const reveler = () => {
        if (revelee) return;
        revelee = true;
        try { montrer(); } catch (e) { /* le cadre est déjà parti */ }
    };

    const essai = (t) => {
        if (!vivant()) return;
        if (debut === null) debut = t;
        premiere = ajuster();
        if (premiere) { reveler(); return; }
        if (t - debut < PLAFOND_PREMIERE_IMAGE) { surLaProchaineImage(essai); return; }
        reveler();
    };
    surLaProchaineImage(essai);

    setTimeout(() => {
        if (!vivant()) return;
        ajuster(premiere);
        reveler();
    }, RETOUCHE);
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
/**
 * METTRE UN JEU À L'ÉCHELLE DE LA BOÎTE QUI L'ACCUEILLE.
 *
 * Mesure l'étendue RÉELLE de ce qui est dessiné — pas la taille de la toile,
 * qui ne veut rien dire tant que le jeu n'a pas fini de se poser — puis pose
 * une mise à l'échelle et un décalage pour que tout tienne.
 *
 * Exportée parce que deux endroits en ont besoin : la vignette du catalogue et
 * l'onglet « Aperçu » des réglages d'une étape. Deux copies de vingt lignes de
 * géométrie finissent toujours par ne plus se comporter pareil.
 *
 * `proche` EST CE QUI EMPÊCHE LE SOUBRESAUT. On remesure une seconde fois pour
 * les jeux qui se déplient — mais la plupart ne se déplient pas, et leur
 * seconde mesure ne diffère de la première que de quelques pixels. Reposer une
 * échelle pour trois pour cent, c'est faire sauter la vignette sous les yeux du
 * professeur pour rien. Si la nouvelle mesure ressemble à l'ancienne, on remet
 * la transformation d'avant et l'on rend l'ancienne mesure : rien n'a bougé.
 *
 * @returns {{l:number,h:number,ech:number}|null} l'étendue et l'échelle posées,
 *          ou `null` si le jeu n'a encore rien dessiné.
 */
export function adapterAuContenu(t, { maxL, maxH, centrerDans = null, proche = null }) {
    if (!t) return null;
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
    if (x0 === Infinity) { t.style.transform = avant || 'scale(0.4)'; return null; }

    // LE CONTENU COMMENCE SOUVENT AVANT LA TOILE, et il ne faut surtout pas le
    // ramener à zéro — voir la note ci-dessous, gardée telle quelle : elle dit
    // pourquoi, et deux jeux l'ont prouvé.
    const l = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
    // Jamais d'agrandissement : un jeu tenant dans 300 px reste net à 300 px.
    const ech = Math.min(maxL / l, maxH / h, 1);

    // SIX POUR CENT : au-dessous, l'œil ne verrait pas la correction, il ne
    // verrait que le saut. Au-dessus, c'est que le jeu a vraiment fini de se
    // déplier — et là, la nouvelle taille est la bonne, sauter vaut mieux que
    // rester faux.
    if (proche && presqueEgal(ech, proche.ech) && presqueEgal(l, proche.l)
        && presqueEgal(h, proche.h)) {
        t.style.transform = avant;
        return proche;
    }

    t.style.transformOrigin = 'top left';
    // CENTRER, QUAND LA BOÎTE EST PLUS GRANDE QUE LE JEU. Sans cela, un jeu
    // deux fois moins haut que son cadre se colle en haut à gauche et laisse un
    // grand vide sous lui — ce qui, dans une fenêtre de réglages, se lit comme
    // « il manque quelque chose ». Le décalage est posé AVANT la mise à
    // l'échelle, donc en pixels d'écran : c'est la boîte qu'on vise, pas le jeu.
    const c = centrerDans
        ? `translate(${Math.max(0, (centrerDans.l - l * ech) / 2)}px, `
            + `${Math.max(0, (centrerDans.h - h * ech) / 2)}px) `
        : '';
    t.style.transform = `${c}scale(${ech}) translate(${-x0}px, ${-y0}px)`;
    return { l, h, ech };
}

function ajusterAuContenu(proche = null) {
    const b = boite(), t = toile();
    if (!b || !t) return null;

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
    const m = adapterAuContenu(t, { maxL: BORNES.maxL, maxH: BORNES.maxH, proche });
    if (!m) return null;
    if (proche && m === proche) return m;   // rien n'a changé : on ne retaille rien
    const { l, h, ech } = m;

    const cadre = b.querySelector('.hd-canvas-wrap');
    b.style.width = `${Math.max(BORNES.minL, Math.round(l * ech))}px`;
    if (cadre) cadre.style.height = `${Math.max(BORNES.minH, Math.round(h * ech))}px`;
    // La hauteur totale se déduit du cadre et de l'en-tête : la fixer ici
    // ferait mentir l'un des deux.
    b.style.height = 'auto';
    return m;
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
    // Le geste en cours n'est pas « regarder », c'est « déplacer ». Une vignette
    // qui s'ouvre au milieu se met en travers du dépôt — voir `glissementEnCours`.
    if (enGlissement) return;
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
    ancreAffichee = ancre;
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
    // ON L'OUVRE SANS LA MONTRER. `visibility` et non `display` : une boîte
    // `display: none` n'a pas de dimensions, et c'est justement ce qu'on vient
    // mesurer. Elle prend donc sa place, le jeu s'y dessine, on la taille — et
    // elle n'apparaît qu'ensuite, à la bonne taille du premier coup d'œil.
    b.style.visibility = 'hidden';
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
    // La PREMIÈRE arrive dès que le jeu a dessiné quelque chose — deux ou trois
    // images, moins de 50 ms — et c'est elle qui décide de la taille. La boîte
    // n'apparaît qu'à ce moment-là : elle n'est jamais vue de travers.
    //
    // La SECONDE arrive à 700 ms, pour ce qui se déplie : « Le Symétrique aux
    // Carreaux » continue d'ouvrir son quadrillage après sa première image, et
    // sans elle il resterait dans une boîte haute et étroite, pleine de vide.
    // Elle ne repose l'échelle que si elle a trouvé autre chose.
    //
    // DEUX, et non « jusqu'à ce que ça se stabilise » : un jeu où quelque chose
    // tombe grandit indéfiniment, et la vignette rétrécirait à chaque image
    // sous les yeux du professeur.
    ajusterDesQueDessine({
        vivant: () => monJeton === jeton,
        ajuster: (proche) => { const m = ajusterAuContenu(proche); placer(ancre); return m; },
        montrer: () => { b.style.visibility = ''; }
    });
}

function majTitre(exo) {
    const titre = document.getElementById('hd-title');
    if (titre) titre.textContent = exo.title;
    const relance = document.getElementById('hd-rejouer');
    if (relance) relance.textContent = motDeRelance(exo);
}

/**
 * REPRENDRE LA MÊME VIGNETTE AVEC UN AUTRE TIRAGE.
 *
 * On passe par `montrerApercu`, qui sait déjà tout faire — tuer le jeu
 * précédent, remettre la boîte à sa taille par défaut, mesurer, révéler. Il
 * faut seulement lui faire oublier ce qu'il montre, sans quoi ses deux gardes
 * (« c'est déjà épinglé », « c'est le même qu'au survol ») le feraient
 * renoncer : elles sont là pour ne pas redémarrer la partie qu'on regarde, et
 * ici c'est précisément ce qu'on demande.
 */
export function rejouerApercu() {
    if (!exoAffiche) return false;
    const exo = exoAffiche;
    const ancre = ancreAffichee;
    const etaitEpingle = epingle;
    epingle = false;
    exoAffiche = null;
    montrerApercu(exo, ancre, { epingler: etaitEpingle });
    return true;
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

    const relance = b.querySelector('#hd-rejouer');
    if (relance) relance.onclick = (e) => { e.stopPropagation(); rejouerApercu(); };

    // LE CURSEUR QUI ARRIVE SUR LA VIGNETTE L'A CHOISIE. C'est le geste que le
    // relecteur décrivait : on va vers l'aperçu pour le regarder de près.
    b.addEventListener('mouseenter', retenir);
    b.addEventListener('mouseleave', laisserPartir);

    // LE FILET DE SÉCURITÉ DU GLISSER. `dragend` sur la rangée d'origine suffit
    // en temps normal ; on l'écoute aussi sur le document, et `drop` avec, parce
    // qu'un interrupteur resté coincé sur « on » supprimerait les aperçus
    // jusqu'au rechargement de la page — une panne bien pire que celle qu'on
    // répare.
    document.addEventListener('dragend', () => glissementEnCours(false), true);
    document.addEventListener('drop', () => glissementEnCours(false), true);

    // ÉCHAP FERME, même épinglée. Une fenêtre sans sortie au clavier est une
    // fenêtre où l'on s'est fait enfermer.
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && b.style.display !== 'none') fermerApercu({ force: true });
    });
}
