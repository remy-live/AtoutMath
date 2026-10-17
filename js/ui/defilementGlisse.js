// DÉFILER PENDANT QU'ON GLISSE — sinon on ne peut déposer que ce qu'on voit.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « On ne peut pas dragger tout en bas ou tout en haut juste avec les
// éléments visible à l'écran. »
//
// C'est vrai des deux côtés du geste, et pour la même raison : rien ne fait
// défiler pendant qu'on tient quelque chose.
//
//   · on prend un exercice au BAS du catalogue et l'on veut le déposer en
//     PREMIÈRE position d'un parcours de douze étapes : la première étape est
//     hors de l'écran, et le parcours ne remonte pas ;
//   · on prend une étape en HAUT du parcours pour la mettre à la fin : même
//     mur, dans l'autre sens.
//
// On ne peut donc réarranger un parcours qu'à l'intérieur d'une hauteur
// d'écran. Au-delà, il faut lâcher, faire défiler à la main, reprendre — et
// comme lâcher DÉPOSE, il faut d'abord déposer au mauvais endroit.
//
// CE QUE FAIT CE MODULE. Tant qu'un glissement dure, on regarde où est le
// pointeur : s'il approche du haut ou du bas d'une zone qui peut défiler, on la
// fait défiler, d'autant plus vite qu'on est près du bord. C'est le geste
// qu'on connaît de tous les gestionnaires de fichiers, et personne n'a besoin
// qu'on le lui explique.
//
// UN SEUL MODULE POUR LES DEUX GESTES. Le glisser-déposer de la souris (API
// HTML5, événements `drag*`) et celui du doigt (Pointer Events, refait à la
// main) n'ont rien en commun sauf CELA : un pointeur, une position, et une
// zone à faire défiler. Deux implémentations finiraient par diverger — l'une
// réglée, l'autre oubliée.

/**
 * LA BANDE SENSIBLE, en pixels depuis le bord.
 *
 * Assez large pour qu'on la trouve sans viser — on a déjà un doigt ou une
 * souris occupés à tenir quelque chose —, assez étroite pour qu'on puisse
 * déposer sur la première et la dernière ligne sans que ça parte tout seul.
 * Elle se borne au quart de la hauteur : sur une zone courte, 90 px prendraient
 * les deux tiers de l'écran et il n'y aurait plus nulle part où se poser.
 */
const BANDE = 90;

/** Les pixels par seconde au bord même. Au milieu de la bande, la moitié. */
const VITESSE_MAX = 900;

let boucle = null;
let vise = null;      // { zone, vitesse }

/** La zone qui peut défiler sous ce point, ou `null`. */
function zoneDefilante(x, y) {
    let el = document.elementFromPoint(x, y);
    while (el && el !== document.body && el !== document.documentElement) {
        const st = getComputedStyle(el);
        const peut = /auto|scroll|overlay/.test(st.overflowY);
        if (peut && el.scrollHeight > el.clientHeight + 2) return el;
        el = el.parentElement;
    }
    // Faute de mieux, la page elle-même : sur téléphone, c'est elle qui défile.
    const doc = document.scrollingElement || document.documentElement;
    return doc.scrollHeight > doc.clientHeight + 2 ? doc : null;
}

function tourner() {
    if (!vise) { boucle = null; return; }
    const { zone, vitesse } = vise;
    zone.scrollTop += vitesse / 60;
    boucle = requestAnimationFrame(tourner);
}

/**
 * DIRE OÙ EN EST LE POINTEUR. À appeler à chaque mouvement du glissement.
 *
 * @param {number} x
 * @param {number} y
 */
export function pendantLeGlissement(x, y) {
    const zone = zoneDefilante(x, y);
    if (!zone) return arreterLeDefilement();

    // La zone visible, en coordonnées d'écran. Pour la page entière,
    // `getBoundingClientRect` rend la hauteur du DOCUMENT et non celle de la
    // fenêtre : on prend donc la fenêtre dans ce cas.
    const doc = document.scrollingElement || document.documentElement;
    const r = zone === doc
        ? { top: 0, bottom: window.innerHeight, height: window.innerHeight }
        : zone.getBoundingClientRect();

    const bande = Math.min(BANDE, r.height / 4);
    let vitesse = 0;
    if (y < r.top + bande) {
        const p = (r.top + bande - y) / bande;         // 0 au bord de la bande, 1 au bord
        vitesse = -VITESSE_MAX * Math.min(1, p);
    } else if (y > r.bottom - bande) {
        const p = (y - (r.bottom - bande)) / bande;
        vitesse = VITESSE_MAX * Math.min(1, p);
    }

    // ON NE DÉFILE PAS DANS LE VIDE : arrivé en butée, la boucle tournerait
    // sans rien faire, et le pointeur resterait coincé dans la bande sensible
    // sans qu'on comprenne pourquoi rien ne bouge.
    const enHaut = zone.scrollTop <= 0;
    const enBas = zone.scrollTop >= zone.scrollHeight - zone.clientHeight - 1;
    if ((vitesse < 0 && enHaut) || (vitesse > 0 && enBas)) vitesse = 0;

    if (!vitesse) return arreterLeDefilement();
    vise = { zone, vitesse };
    if (!boucle) boucle = requestAnimationFrame(tourner);
}

/** Le glissement est fini — ou n'a jamais commencé. */
export function arreterLeDefilement() {
    vise = null;
    if (boucle) { cancelAnimationFrame(boucle); boucle = null; }
}

/**
 * BRANCHER LE GLISSER-DÉPOSER DE LA SOURIS, une fois pour toutes.
 *
 * L'API HTML5 n'envoie `dragover` qu'aux éléments qui l'acceptent ; on écoute
 * donc sur le DOCUMENT, en capture, ce qui attrape tout glissement où qu'il
 * passe. `dragend` et `drop` arrêtent — et `dragleave` non : il part aussi
 * quand on survole un enfant, et l'on s'arrêterait au milieu du geste.
 */
export function brancherDefilementGlisse(doc = document) {
    if (doc.__defilementGlisse) return;
    doc.__defilementGlisse = true;
    doc.addEventListener('dragover', (e) => pendantLeGlissement(e.clientX, e.clientY), true);
    doc.addEventListener('dragend', arreterLeDefilement, true);
    doc.addEventListener('drop', arreterLeDefilement, true);
}
