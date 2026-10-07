// L'ATELIER DES DINGBATS, VERSION D'ESSAI — on dessine, on ne dépose plus.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « fais-moi à part l'atelier, on l'intégrera après. Pour créer une
// flèche, un rectangle, on clique on relâche. Idem pour le mot. Double-clic
// pour éditer. Fais-moi quelque chose de plus moderne, plus facile, plus
// sympa. On essaie d'abord puis on l'intègre. »
//
// ── LE GESTE, ET CE QU'IL REMPLACE ─────────────────────────────────────────
//
// L'atelier intégré a une RÉSERVE : on prend une pièce, on la pose, elle arrive
// à sa taille par défaut, et on la règle ensuite sur des curseurs. C'est sûr, et
// c'est un geste de deux temps.
//
// Ici il n'y en a plus qu'un : ON PREND UN OUTIL ET ON DESSINE. On appuie, on
// tire, on relâche — le rectangle a la taille qu'on vient de tracer. C'est le
// geste de tous les logiciels de dessin, et c'est pour ça qu'il n'a pas besoin
// d'être expliqué.
//
// « ON CLIQUE ON RELÂCHE » EST PRIS AU MOT, ET C'EST LA MOITIÉ DU TRAVAIL : un
// appui suivi d'un relâché AU MÊME ENDROIT crée quand même la forme, à une
// taille raisonnable. Sans cela, un doigt qui ne glisse pas d'un pixel ne
// fabrique rien — et l'on croit que l'outil est cassé alors qu'on a « trop bien »
// cliqué. C'est le cas le plus fréquent sur un écran tactile.
//
// L'OUTIL REVIENT À LA MAIN APRÈS UNE FORME. On dessine, et l'on est tout de
// suite en train de la déplacer, de la tourner, de la colorer. Dessiner dix
// rectangles d'affilée est rare ; vouloir ajuster celui qu'on vient de tracer
// est systématique.
//
// ── CE QUI EST PARTAGÉ AVEC L'ATELIER INTÉGRÉ ──────────────────────────────
//
// LE MODÈLE, ENTIÈREMENT : `core/dingbatLibre.js`. Ce qu'on compose ici est déjà
// un dingbat jouable, son JSON se colle dans `js/data/dingbats.js` sans
// traduction, et les épreuves qui gardent le format le gardent aussi pour cette
// page. C'est ce qui permet de JETER cette page sans rien perdre si le geste ne
// plaît pas — ou de jeter l'autre, si c'est celui-ci qui gagne.
//
// LA RÉCOLTE EST RANGÉE À PART, exprès : un essai qui abîmerait la récolte de
// l'atelier intégré coûterait plus cher que le temps qu'il fait gagner.
//
// ── CE QUI EST NEUF, ET POURQUOI ───────────────────────────────────────────
//
//   · DOUBLE-CLIC POUR ÉDITER, sur place et à la bonne taille. Un champ dans une
//     colonne oblige à faire l'aller-retour des yeux entre ce qu'on tape et ce
//     qu'on voit ; ici les deux sont au même endroit.
//   · DES POIGNÉES qui tournent et redimensionnent. L'atelier intégré n'en a
//     pas — j'avais écrit qu'une poignée de dix pixels est intenable au doigt, et
//     c'était vrai à dix pixels. Elles font vingt-deux pixels ici, et les
//     curseurs restent dans la barre pour le réglage fin.
//   · DES REPÈRES D'ALIGNEMENT qui apparaissent quand deux centres se trouvent.
//     C'est ce qui fait qu'un dessin fait en trente secondes a l'air soigné.
//   · ANNULER, parce qu'on ose essayer quand on peut revenir.

import {
    TOILE, COULEURS, FORMES_LIBRES, elementNeuf, dessinerElement, validerLibre,
    enigmeEnTexte, lotEnTexte, lireUnLot, direLibre, pourcentDeTeinte
} from '../core/dingbatLibre.js';
import { dessiner, THEMES, NIVEAUX, juste, attendues } from '../core/dingbat.js';
import { nettoyerSvg } from '../core/svgSobre.js';

const CLE = 'atoutmath.atelier.essai';

const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const q = (s) => document.querySelector(s);

// ── LES OUTILS ──────────────────────────────────────────────────────────────

/**
 * UN OUTIL, UN GESTE.
 *
 * L'ordre n'est pas décoratif : la main d'abord (c'est l'état de repos), le mot
 * ensuite (c'est lui l'énigme), puis les formes qui l'entourent, puis les traits
 * qui la traversent.
 */
const OUTILS = [
    { id: 'select', nom: 'Choisir', touche: 'V' },
    { id: 'mot', nom: 'Mot', touche: 'T' },
    ...FORMES_LIBRES.map(f => ({ id: f.id, nom: f.nom, forme: f.id })),
    { id: 'trait', nom: 'Trait' },
    { id: 'fleche', nom: 'Flèche' }
];

/** L'aperçu d'un outil : le VRAI rendu, en petit. Un aperçu à part mentirait. */
function apercuDOutil(o) {
    if (o.id === 'select') {
        return '<svg viewBox="0 0 24 24" aria-hidden="true" class="ae-picto">'
            + '<path d="M5 3.5 18.5 12 12 13.2 9.4 19.3z" fill="currentColor"/></svg>';
    }
    let el;
    if (o.id === 'mot') el = { type: 'mot', texte: 'Aa', x: 30, y: 21, taille: 17, couleur: 'encre' };
    else if (o.id === 'trait' || o.id === 'fleche') {
        el = { type: 'trait', x1: 9, y1: 21, x2: 51, y2: 21, epaisseur: 3, couleur: 'encre', fleche: o.id === 'fleche' };
    } else {
        el = { type: 'forme', forme: o.forme, x: 30, y: 21, largeur: 36, hauteur: 25, epaisseur: 2.5, couleur: 'encre' };
    }
    return `<svg viewBox="0 0 60 42" aria-hidden="true">${dessinerElement(el)}</svg>`;
}

// ── L'ÉTAT ──────────────────────────────────────────────────────────────────

function vierge() {
    return {
        id: '', theme: 'maths', niveau: 1, reponse: '', variantes: [],
        aides: [], explication: '', elements: []
    };
}

let lot = [vierge()];
let courant = 0;
let enigme = lot[0];
let outil = 'select';
let sel = -1;
let magnetisme = true;
let commeEleve = false;

/**
 * LES DESSINS IMPORTÉS SUIVENT-ILS L'ENCRE DU THÈME ? Oui, et c'est le défaut
 * qui protège : l'application a cinq thèmes, et un dessin au trait noir importé
 * tel quel DISPARAÎT sur le sombre — que personne ne verra, puisqu'on compose en
 * clair. Celui qui veut garder les couleurs d'origine d'une illustration le dira.
 */
let teinterLesImports = true;
/** Un compte qui ne redescend pas : il sert à ne jamais répéter un identifiant. */
let compteurDImport = 1;

/** L'historique, pour annuler. Cinquante pas : au-delà on refait, on n'annule pas. */
let pile = [];
let refaits = [];
const PROFONDEUR = 50;

function instantane() { return JSON.stringify({ lot, courant }); }
function pousser() {
    pile.push(instantane());
    if (pile.length > PROFONDEUR) pile.shift();
    refaits.length = 0;
}
function restaurer(texte) {
    const b = JSON.parse(texte);
    lot = b.lot.map(remettreEnForme);
    courant = Math.min(b.courant, lot.length - 1);
    enigme = lot[courant];
    sel = -1;
}
function annuler() {
    if (!pile.length) return false;
    refaits.push(instantane());
    restaurer(pile.pop());
    toutPeindre();
    return true;
}
function refaire() {
    if (!refaits.length) return false;
    pile.push(instantane());
    restaurer(refaits.pop());
    toutPeindre();
    return true;
}

function remettreEnForme(x) {
    return {
        ...vierge(), ...x,
        elements: Array.isArray(x.elements) ? x.elements : [],
        variantes: Array.isArray(x.variantes) ? x.variantes : [],
        // Les cent neuf énigmes du jeu n'écrivent qu'un indice, nommé `aide` au
        // singulier. On les fait monter de version sans rien perdre.
        aides: Array.isArray(x.aides) ? x.aides : (x.aide ? [x.aide] : [])
    };
}

// ── CE QUI SE SAUVE ─────────────────────────────────────────────────────────

let minuterie = 0;
function garder() {
    try { localStorage.setItem(CLE, JSON.stringify({ lot, courant })); }
    catch (e) {
        dire('Cet appareil refuse d\'enregistrer — exporte avant de fermer l\'onglet.', true);
        return;
    }
    const el = q('#ae-sauve');
    el.classList.add('ae-sauve--frais');
    clearTimeout(minuterie);
    minuterie = setTimeout(() => el.classList.remove('ae-sauve--frais'), 900);
}

function relire() {
    try {
        const b = JSON.parse(localStorage.getItem(CLE) || 'null');
        if (b && Array.isArray(b.lot) && b.lot.length) {
            lot = b.lot.map(remettreEnForme);
            courant = Math.min(Math.max(0, Number(b.courant) || 0), lot.length - 1);
        }
    } catch (e) { /* on repart d'une toile neuve */ }
    enigme = lot[courant];
}

// ── LA GÉOMÉTRIE ────────────────────────────────────────────────────────────

const rad = (deg) => (Number(deg) || 0) * Math.PI / 180;
const accrocher = (v) => (magnetisme ? Math.round(v / 5) * 5 : Math.round(v));

/** Les unités de la toile, depuis un événement de pointeur. */
function enUnites(svg, ev) {
    const r = svg.getBoundingClientRect();
    return {
        x: (ev.clientX - r.left) / (r.width || 1) * TOILE.largeur,
        y: (ev.clientY - r.top) / (r.height || 1) * TOILE.hauteur
    };
}

/**
 * LA BOÎTE D'UN ÉLÉMENT, dans son propre repère : centre, largeur, hauteur, angle.
 *
 * Pour un MOT, la largeur ne se calcule pas — elle dépend de la police, de la
 * graisse et de l'espacement. On la MESURE sur le dessin : `getBBox()` d'un
 * `<text>` rend sa boîte AVANT sa propre rotation, ce qui est exactement le
 * repère local qu'on cherche.
 */
function boiteDe(svg, i) {
    const el = enigme.elements[i];
    if (!el) return null;
    if (el.type === 'forme') {
        const def = FORMES_LIBRES.find(f => f.id === el.forme) || FORMES_LIBRES[0];
        const l = Math.abs(Number(el.largeur) || 0);
        return { cx: el.x, cy: el.y, l, h: def.egal ? l : Math.abs(Number(el.hauteur) || 0), a: Number(el.angle) || 0 };
    }
    if (el.type === 'mot') {
        const n = svg.querySelector(`[data-el="${i}"] text`);
        let b = { width: 60, height: 30 };
        try { if (n) b = n.getBBox(); } catch (e) { /* non rendu */ }
        return { cx: el.x, cy: el.y, l: b.width, h: b.height, a: Number(el.angle) || 0 };
    }
    return null;   // un trait n'a pas de boîte : il a deux bouts
}

/** Le coin qui sert de clou quand on tire celui d'en face. */
function coinOppose(b, coin) {
    const noms = ['no', 'ne', 'se', 'so'];
    const i = noms.indexOf(coin);
    if (i < 0) return null;
    // Les coins se font face deux à deux : no↔se, ne↔so. C'est exactement un
    // demi-tour dans la liste.
    return coinsDe(b)[(i + 2) % 4];
}

/** Les quatre coins d'une boîte tournée, dans l'ordre no, ne, se, so. */
function coinsDe(b) {
    const c = Math.cos(rad(b.a)), s = Math.sin(rad(b.a));
    const u = { x: c, y: s }, v = { x: -s, y: c };
    const pt = (sl, sh) => ({
        x: b.cx + u.x * (sl * b.l / 2) + v.x * (sh * b.h / 2),
        y: b.cy + u.y * (sl * b.l / 2) + v.y * (sh * b.h / 2)
    });
    return [pt(-1, -1), pt(1, -1), pt(1, 1), pt(-1, 1)];
}

// ── LE DESSIN ───────────────────────────────────────────────────────────────

/** Ce que les repères d'alignement montrent pendant un déplacement. */
let reperes = [];

function peindreToile() {
    const cadre = q('#ae-toile-cadre');

    if (commeEleve) {
        let html;
        try { html = dessiner({ ...enigme, forme: 'libre' }); }
        catch (e) { html = `<p class="ae-rate">${esc(e.message)}</p>`; }
        cadre.innerHTML = `<div class="dg-cadre ae-cadre-eleve">${html}</div>`;
        return;
    }

    const corps = enigme.elements.map((e, i) => {
        let dedans;
        try { dedans = dessinerElement(e); } catch (err) { dedans = ''; }
        return `<g class="ae-el" data-el="${i}">${dedans}</g>`;
    }).join('');

    const grille = magnetisme ? `<g class="ae-grille">${
        Array.from({ length: Math.floor(TOILE.largeur / 20) }, (_, k) =>
            `<line x1="${(k + 1) * 20}" y1="0" x2="${(k + 1) * 20}" y2="${TOILE.hauteur}"/>`).join('')}${
        Array.from({ length: Math.floor(TOILE.hauteur / 20) }, (_, k) =>
            `<line x1="0" y1="${(k + 1) * 20}" x2="${TOILE.largeur}" y2="${(k + 1) * 20}"/>`).join('')}</g>` : '';

    const vide = enigme.elements.length ? '' :
        `<text class="ae-toile-vide" x="${TOILE.largeur / 2}" y="${TOILE.hauteur / 2}"
            text-anchor="middle" dominant-baseline="central">Prends un outil, puis trace ici</text>`;

    cadre.innerHTML = `<svg class="ae-toile" id="ae-toile" tabindex="0"
        viewBox="0 0 ${TOILE.largeur} ${TOILE.hauteur}"
        aria-label="La toile — ${esc(direLibre(enigme))}">
        <rect class="ae-fond" x="0" y="0" width="${TOILE.largeur}" height="${TOILE.hauteur}"/>
        ${grille}${vide}${corps}
        <g class="ae-reperes" id="ae-reperes"></g>
        <g class="ae-poignees" id="ae-poignees"></g></svg>`;

    const svg = q('#ae-toile');
    posersLesPrises(svg);
    majPoignees(svg);
    brancherLaToile(svg);
    majBarre();
}

/**
 * UNE ZONE DE PRISE AUTOUR DE CHAQUE ÉLÉMENT.
 *
 * Un `<text>` SVG ne se laisse attraper que sur le tracé de ses lettres : sans
 * cela on clique entre le R et le A et il ne se passe rien, ce qui ressemble
 * exactement à un atelier cassé. Payé une fois dans l'atelier intégré.
 */
function poserLaPrise(g) {
    g.querySelectorAll('.ae-prise').forEach(x => x.remove());
    let b;
    try { b = g.getBBox(); } catch (e) { return; }
    if (!b || (!b.width && !b.height)) return;
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('x', String(b.x - 8));
    r.setAttribute('y', String(b.y - 8));
    r.setAttribute('width', String(b.width + 16));
    r.setAttribute('height', String(b.height + 16));
    r.setAttribute('class', 'ae-prise');
    g.insertBefore(r, g.firstChild);
}
function posersLesPrises(svg) { svg.querySelectorAll('[data-el]').forEach(poserLaPrise); }

/**
 * REDESSINER UN SEUL ÉLÉMENT, SANS REMPLACER LA TOILE.
 *
 * On ne remplace jamais le `<svg>` pendant un geste continu : ce serait tuer, à
 * chaque pixel, le gestionnaire qui suit le doigt. L'atelier intégré l'a payé —
 * l'élément n'avançait que d'un pas de souris sur huit.
 */
function rafraichirUn(svg, i) {
    const g = svg.querySelector(`[data-el="${i}"]`);
    const el = enigme.elements[i];
    if (!g || !el) return;
    try { g.innerHTML = dessinerElement(el); } catch (e) { g.innerHTML = ''; }
    poserLaPrise(g);
}

/**
 * POSER LE NŒUD D'UN ÉLÉMENT NEUF, sans toucher au reste de la toile.
 *
 * Il se glisse AVANT le groupe des repères, pour que les repères d'alignement et
 * les poignées restent au-dessus du dessin — sinon on tire une poignée cachée
 * sous la forme qu'elle commande.
 */
function ajouterLeNoeud(svg, i) {
    const invite = svg.querySelector('.ae-toile-vide');
    if (invite) invite.remove();
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'ae-el');
    g.setAttribute('data-el', String(i));
    svg.insertBefore(g, svg.querySelector('#ae-reperes'));
    rafraichirUn(svg, i);
    majPoignees(svg);
    majBarre();
}

/** Les poignées de la sélection : quatre coins, une rotation, ou deux bouts. */
function majPoignees(svg) {
    const boite = svg.querySelector('#ae-poignees');
    if (!boite) return;
    const el = enigme.elements[sel];
    if (!el || commeEleve) { boite.innerHTML = ''; return; }

    // AU MOMENT DE L'APPUI, IL N'Y A QU'UN POINT. Rémy : « il ne devrait juste
    // afficher qu'un point ». La figure a une taille nulle tant qu'on n'a pas
    // tiré — elle ne dessine donc rien —, et un cadre de sélection autour de
    // rien ferait croire à une figure invisible. On montre le point d'appui, et
    // il disparaît au premier millimètre de glissé.
    const minuscule = (el.type === 'forme' && Math.abs(Number(el.largeur) || 0) < 2)
        || (el.type === 'trait' && Math.hypot(el.x2 - el.x1, el.y2 - el.y1) < 2);
    if (minuscule) {
        const px = el.type === 'trait' ? el.x1 : el.x;
        const py = el.type === 'trait' ? el.y1 : el.y;
        boite.innerHTML = `<circle class="ae-point" cx="${px}" cy="${py}" r="3"/>`;
        return;
    }

    if (el.type === 'trait') {
        boite.innerHTML =
            `<line class="ae-contour-trait" x1="${el.x1}" y1="${el.y1}" x2="${el.x2}" y2="${el.y2}"/>`
            + `<circle class="ae-poignee ae-bout" data-poignee="b1" cx="${el.x1}" cy="${el.y1}" r="9"/>`
            + `<circle class="ae-poignee ae-bout" data-poignee="b2" cx="${el.x2}" cy="${el.y2}" r="9"/>`;
        return;
    }

    const b = boiteDe(svg, sel);
    if (!b) { boite.innerHTML = ''; return; }
    const coins = coinsDe(b);
    const noms = ['no', 'ne', 'se', 'so'];
    // LA POIGNÉE DE ROTATION EST AU-DESSUS, dans le repère TOURNÉ de l'objet :
    // elle suit l'objet quand il tourne, sinon on la cherche.
    const v = { x: -Math.sin(rad(b.a)), y: Math.cos(rad(b.a)) };
    const pivot = { x: b.cx - v.x * (b.h / 2 + 26), y: b.cy - v.y * (b.h / 2 + 26) };
    const hautMilieu = { x: (coins[0].x + coins[1].x) / 2, y: (coins[0].y + coins[1].y) / 2 };

    boite.innerHTML =
        `<polygon class="ae-contour" points="${coins.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}"/>`
        + `<line class="ae-tige" x1="${hautMilieu.x.toFixed(1)}" y1="${hautMilieu.y.toFixed(1)}"
                x2="${pivot.x.toFixed(1)}" y2="${pivot.y.toFixed(1)}"/>`
        + coins.map((p, k) => `<rect class="ae-poignee" data-poignee="${noms[k]}"
                x="${(p.x - 7).toFixed(1)}" y="${(p.y - 7).toFixed(1)}" width="14" height="14" rx="3"/>`).join('')
        + `<circle class="ae-poignee ae-pivot" data-poignee="rot"
                cx="${pivot.x.toFixed(1)}" cy="${pivot.y.toFixed(1)}" r="8"/>`;
}

function majReperes(svg) {
    const g = svg.querySelector('#ae-reperes');
    if (!g) return;
    g.innerHTML = reperes.map(r => r.vertical
        ? `<line class="ae-repere" x1="${r.a}" y1="0" x2="${r.a}" y2="${TOILE.hauteur}"/>`
        : `<line class="ae-repere" x1="0" y1="${r.a}" x2="${TOILE.largeur}" y2="${r.a}"/>`).join('');
}

// ── LES GESTES SUR LA TOILE ─────────────────────────────────────────────────

/** L'élément neuf qu'un outil fabrique, à partir du point d'appui. */
function elementDOutil(id, x, y) {
    if (id === 'mot') return elementNeuf('mot', { x, y, texte: '' });
    if (id === 'trait' || id === 'fleche') {
        return elementNeuf('trait', { x1: x, y1: y, x2: x, y2: y, fleche: id === 'fleche' });
    }
    return elementNeuf('forme', { forme: id, x, y, largeur: 0, hauteur: 0 });
}

/** La taille qu'on donne quand le geste n'a pas tiré : « on clique on relâche ». */
/**
 * LA TAILLE QU'ON DONNE QUAND LE GESTE N'A PAS TIRÉ — et OÙ on la pose.
 *
 * RÉMY : « au rectangle dessiné, cela ne dessine pas depuis le coin supérieur
 * gauche, cela dessine depuis le centre ».
 *
 * Il a raison, et c'était ce cas-ci : TIRER donnait bien un rectangle de coin à
 * coin, mais un simple CLIC posait la figure CENTRÉE sur le point cliqué. En
 * cliquant près du bord, la moitié de la figure partait hors de la toile — ce
 * qu'on voit sur sa capture.
 *
 * LE POINT CLIQUÉ EST DONC LE COIN SUPÉRIEUR GAUCHE, comme quand on tire : un
 * outil ne doit pas changer de sens selon qu'on a bougé la main ou non.
 *
 * ET LA FIGURE RESTE DANS LA TOILE : cliquer à trois unités du bord droit
 * donnerait sinon un rectangle dont on ne verrait qu'un trait.
 */
function tailleParDefaut(el) {
    if (el.type === 'forme') {
        const def = FORMES_LIBRES.find(f => f.id === el.forme) || FORMES_LIBRES[0];
        const L = 150, H = def.egal ? 150 : 110;
        const dans = (v, demi, total) => Math.min(Math.max(demi, v), total - demi);
        el.x = dans(el.x + L / 2, L / 2, TOILE.largeur);
        el.y = dans(el.y + H / 2, H / 2, TOILE.hauteur);
        el.largeur = L;
        el.hauteur = H;
    } else if (el.type === 'trait') {
        // UN TRAIT N'A PAS DE CENTRE, IL A DEUX BOUTS — et ma première version
        // lisait `el.x`, qui n'existe que sur un mot ou une forme. Le trait
        // sortait avec des coordonnées `NaN`, c'est-à-dire invisible.
        // LE POINT CLIQUÉ EST SON DÉBUT, pour la même raison que ci-dessus.
        const x = el.x1, y = el.y1;
        el.x1 = Math.min(x, TOILE.largeur - 140);
        el.x2 = el.x1 + 140;
        el.y1 = y; el.y2 = y;
    }
}

function brancherLaToile(svg) {
    let geste = null;

    svg.addEventListener('pointerdown', (ev) => {
        if (commeEleve) return;
        fermerLaSaisie();
        const p = enUnites(svg, ev);
        try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* sans capture */ }
        ev.preventDefault();

        // LA BARRE S'EFFACE PENDANT LE GESTE, ET C'EST UNE CORRECTION.
        //
        // Elle flotte AU-DESSUS de la toile : tant qu'elle est là, elle peut
        // recouvrir une poignée. Après une rotation d'un quart de tour, la barre
        // restait à sa place d'avant — plus personne ne la replaçait — et tombait
        // pile sur le coin « se ». Le redimensionnement ne partait jamais, et
        // rien ne le disait : `elementFromPoint` sur la poignée rendait « ae-barre ».
        //
        // ELLE NE FLOTTE PLUS SUR LA TOILE, DONC ELLE NE MASQUE PLUS RIEN :
        // c'est la correction, et elle rend inutile le contournement que j'avais
        // écrit ici (l'effacer pendant le geste). Voir `atelier-dingbats.html`.

        // 1. UN OUTIL EN MAIN : on dessine, et rien d'autre.
        if (outil !== 'select') {
            pousser();
            const el = elementDOutil(outil, accrocher(p.x), accrocher(p.y));
            enigme.elements.push(el);
            sel = enigme.elements.length - 1;
            geste = { quoi: 'creation', depart: p, outil };
            // ON AJOUTE LE NŒUD, ON NE RECONSTRUIT PAS LA TOILE.
            //
            // `peindreToile()` REMPLACE le `<svg>` — c'est-à-dire le nœud même
            // depuis lequel on est en train d'écouter. Appelée ici, elle tue la
            // capture du pointeur à l'instant où le tracé commence : le
            // rectangle restait à 0×0 et le relâché n'arrivait jamais.
            //
            // C'EST LA TROISIÈME FOIS QUE JE PAYE CE PIÈGE dans ce dépôt, et la
            // deuxième fois APRÈS l'avoir écrit dans le journal des frictions.
            // La règle, elle, n'a pas changé : un geste continu ne redessine que
            // ce qui bouge, jamais son conteneur.
            ajouterLeNoeud(svg, sel);
            return;
        }

        // 2. UNE POIGNÉE : on redimensionne, on tourne, ou on tire un bout.
        const poignee = ev.target.closest('[data-poignee]');
        if (poignee && enigme.elements[sel]) {
            pousser();
            const boite = boiteDe(svg, sel);
            geste = {
                quoi: 'poignee', coin: poignee.dataset.poignee, depart: p,
                copie: JSON.parse(JSON.stringify(enigme.elements[sel])),
                boite,
                // LE CLOU : le coin OPPOSÉ à celui qu'on tire, figé une fois pour
                // toutes au début du geste. Le recalculer à chaque mouvement le
                // ferait dériver, puisque la boîte, elle, change.
                clou: boite ? coinOppose(boite, poignee.dataset.poignee) : null
            };
            return;
        }

        // 3. UN ÉLÉMENT : on le choisit, et l'on commence à le déplacer.
        const g = ev.target.closest('[data-el]');
        if (!g) { sel = -1; majPoignees(svg); majBarre(); return; }
        const i = Number(g.dataset.el);
        if (i !== sel) { sel = i; majPoignees(svg); majBarre(); }
        pousser();
        geste = {
            quoi: 'deplacement', depart: p,
            copie: JSON.parse(JSON.stringify(enigme.elements[sel]))
        };
    });

    svg.addEventListener('pointermove', (ev) => {
        if (!geste) return;
        const p = enUnites(svg, ev);
        const el = enigme.elements[sel];
        if (!el) return;

        if (geste.quoi === 'creation') {
            tirerLaCreation(el, geste.depart, p);
        } else if (geste.quoi === 'poignee') {
            tirerUnePoignee(el, geste, p);
        } else {
            deplacer(el, geste.copie, p.x - geste.depart.x, p.y - geste.depart.y);
        }
        rafraichirUn(svg, sel);
        majPoignees(svg);
        majReperes(svg);
    });

    const finir = () => {
        if (!geste) { majBarre(); return; }
        const el = enigme.elements[sel];
        const etait = geste;
        geste = null;
        reperes = [];
        majReperes(svg);
        // LA BARRE REVIENT, À LA PLACE QUE L'OBJET OCCUPE MAINTENANT.
        majBarre();

        if (etait.quoi === 'creation' && el) {
            // « ON CLIQUE ON RELÂCHE » : un geste qui n'a pas tiré fabrique quand
            // même la forme, à une taille raisonnable. Sans cela, un doigt qui ne
            // glisse pas d'un pixel ne crée rien, et l'on croit l'outil cassé.
            const petit = (el.type === 'forme' && Math.abs(el.largeur) < 12)
                || (el.type === 'trait' && Math.hypot(el.x2 - el.x1, el.y2 - el.y1) < 12);
            if (petit) tailleParDefaut(el);
            // L'OUTIL RESTE EN MAIN, ET C'EST RÉMY QUI A TRANCHÉ : « l'outil
            // sélectionné reste par défaut ».
            //
            // J'avais fait l'inverse — revenir à la main après chaque figure —
            // en me disant qu'on veut ajuster ce qu'on vient de tracer. Mais on
            // compose un dingbat en posant TROIS traits et DEUX carrés : devoir
            // reprendre l'outil entre chacun, c'est un geste sur deux pour rien.
            //
            // POUR REVENIR À LA MAIN : la touche Échap, ou l'outil « Choisir ».
            // La consigne sous la toile le dit, parce que personne ne le devine.
            // UN MOT NEUF EST VIDE : on ouvre la saisie tout de suite, sinon il
            // faudrait deviner qu'un double-clic l'ouvre.
            if (el.type === 'mot') { enregistrer(); ouvrirLaSaisie(); return; }
        }
        enregistrer();
    };
    svg.addEventListener('pointerup', finir);
    svg.addEventListener('pointercancel', finir);

    // DOUBLE-CLIC POUR ÉDITER — la demande, mot pour mot.
    svg.addEventListener('dblclick', (ev) => {
        const g = ev.target.closest('[data-el]');
        // UN MOT SÉLECTIONNÉ EST RECOUVERT PAR SES PROPRES POIGNÉES : le premier
        // clic le choisit, les poignées se posent dessus, et le second clic — donc
        // la cible du double-clic — tombe sur une poignée, qui n'appartient à
        // aucun élément. Mesuré : le double-clic n'ouvrait jamais rien.
        //
        // Quand la cible ne désigne pas d'élément, on prend CELUI QUI EST
        // SÉLECTIONNÉ : c'est forcément celui qu'on vient de cliquer deux fois.
        const i = g ? Number(g.dataset.el) : sel;
        if (enigme.elements[i] && enigme.elements[i].type === 'mot') {
            sel = i;
            majPoignees(svg);
            majBarre();
            ouvrirLaSaisie();
        }
    });

    svg.addEventListener('keydown', surLeClavier);
}

/** Le tracé en cours : la forme suit le coin opposé au point d'appui. */
/**
 * LE TRACÉ EN COURS — ET POURQUOI IL NE DOIT PLUS TREMBLER.
 *
 * RÉMY : « c'est bizarre au début, quand on trace les figures, ça tremble ».
 *
 * Ma première version accrochait TROIS choses à la grille : le coin de départ,
 * le coin courant, et LE CENTRE calculé comme leur moyenne. Or la moyenne de
 * deux multiples de 5 tombe une fois sur deux sur un multiple de 2,5 — que le
 * troisième accrochage renvoyait tantôt en haut, tantôt en bas. La figure
 * sautait d'un demi-pas en avant puis en arrière PENDANT qu'on la tirait, sans
 * jamais s'arrêter : exactement un tremblement.
 *
 * ON N'ACCROCHE PLUS QUE LES DEUX COINS, et le centre se DÉDUIT. Deux coins sur
 * la grille donnent un centre parfaitement déterminé — même s'il tombe sur un
 * demi — et la figure ne bouge plus qu'aux pas de la grille, dans un seul sens.
 *
 * ACCROCHER UNE VALEUR DÉJÀ DÉDUITE D'AUTRES VALEURS ACCROCHÉES LA FAIT TREMBLER.
 * C'est la règle, et elle vaut pour tout ce qui se tire au doigt.
 */
function tirerLaCreation(el, depart, p) {
    if (el.type === 'mot') return;
    const x0 = accrocher(depart.x), y0 = accrocher(depart.y);
    const x1 = accrocher(p.x), y1 = accrocher(p.y);
    if (el.type === 'trait') {
        el.x1 = x0; el.y1 = y0;
        el.x2 = x1; el.y2 = y1;
        return;
    }
    const def = FORMES_LIBRES.find(f => f.id === el.forme) || FORMES_LIBRES[0];
    if (def.egal) {
        // UN CARRÉ ET UN CERCLE N'ONT QU'UN CÔTÉ : on prend le plus grand des
        // deux écarts, et on le pose DANS LE SENS OÙ LA MAIN VA — ancré sur le
        // coin de départ, qui ne bouge pas. Centrer la moyenne, comme avant,
        // faisait glisser la figure sous le doigt.
        const cote = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        const sx = (x1 < x0) ? -1 : 1, sy = (y1 < y0) ? -1 : 1;
        el.largeur = cote;
        el.hauteur = cote;
        el.x = x0 + sx * cote / 2;
        el.y = y0 + sy * cote / 2;
        return;
    }
    el.largeur = Math.abs(x1 - x0);
    el.hauteur = Math.abs(y1 - y0);
    el.x = (x0 + x1) / 2;
    el.y = (y0 + y1) / 2;
}

/** Une poignée tirée : coin, rotation, ou bout de trait. */
function tirerUnePoignee(el, geste, p) {
    if (el.type === 'trait') {
        if (geste.coin === 'b1') { el.x1 = accrocher(p.x); el.y1 = accrocher(p.y); }
        else { el.x2 = accrocher(p.x); el.y2 = accrocher(p.y); }
        return;
    }
    const b = geste.boite;
    if (!b) return;

    if (geste.coin === 'rot') {
        // L'ANGLE SE CALE SUR LES CRANS DE CINQ DEGRÉS, et SAUTE sur les droits :
        // à la main, « droit » ne tombe jamais exactement sur zéro, et un mot à
        // 2° a l'air d'une faute plutôt que d'un choix.
        let a = Math.atan2(p.y - b.cy, p.x - b.cx) * 180 / Math.PI + 90;
        a = Math.round(a / 5) * 5;
        [0, 90, 180, -90, -180].forEach(d => { if (Math.abs(a - d) <= 5) a = d; });
        el.angle = ((a + 180) % 360 + 360) % 360 - 180;
        return;
    }

    // LE COIN OPPOSÉ NE BOUGE PAS, ET C'EST LA DEMANDE DE RÉMY : « que le
    // ragrandissement ne se fasse pas centré, que le coin supérieur gauche reste
    // fixe ». C'est aussi la convention de tous les logiciels de dessin : on tire
    // un coin, celui d'en face sert de clou.
    //
    // Ma première version grossissait DEPUIS LE CENTRE : les quatre coins
    // partaient à la fois, et l'objet semblait fuir la main qui le tire.
    //
    // ON MESURE DONC TOUT DEPUIS LE CLOU, dans le repère TOURNÉ de l'objet — ce
    // qui fait qu'un rectangle penché s'élargit dans SON sens et non dans celui
    // de l'écran — puis l'on replace le centre pour que le clou retombe
    // exactement où il était.
    const c = Math.cos(rad(b.a)), s = Math.sin(rad(b.a));
    const u = { x: c, y: s }, v = { x: -s, y: c };
    const F = geste.clou;
    if (!F) return;
    const dx = p.x - F.x, dy = p.y - F.y;
    const surU = dx * u.x + dy * u.y;
    const surV = dx * v.x + dy * v.y;
    // LE SENS DANS LEQUEL ON S'ÉLOIGNE DU CLOU : sans lui, tirer un coin
    // au-delà du clou retournerait l'objet au lieu de l'agrandir.
    const sU = surU < 0 ? -1 : 1, sV = surV < 0 ? -1 : 1;

    let l, h;
    if (el.type === 'mot') {
        // UN MOT NE S'ÉTIRE PAS : il GROSSIT. Étirer une lettre dans un seul sens
        // la rend illisible, et un dingbat se lit. On prend donc UN seul rapport,
        // celui des diagonales, et la boîte suit proportionnellement.
        const avant = Math.hypot(b.l, b.h) || 1;
        const rapport = Math.hypot(surU, surV) / avant;
        const taille = Math.min(90, Math.max(10, Math.round((geste.copie.taille || 34) * rapport)));
        el.taille = taille;
        const vrai = taille / (geste.copie.taille || 34);
        l = b.l * vrai; h = b.h * vrai;
    } else {
        const def = FORMES_LIBRES.find(f => f.id === el.forme) || FORMES_LIBRES[0];
        l = Math.max(10, Math.round(Math.abs(surU)));
        h = Math.max(10, Math.round(Math.abs(surV)));
        if (def.egal) { l = h = Math.max(l, h); }
        el.largeur = l;
        if (!def.egal) el.hauteur = h;
    }

    // LE CLOU RETOMBE OÙ IL ÉTAIT : le centre est à une demi-boîte de lui, dans
    // le sens où la main est partie.
    el.x = F.x + u.x * (sU * l / 2) + v.x * (sV * h / 2);
    el.y = F.y + u.y * (sU * l / 2) + v.y * (sV * h / 2);
}

/**
 * DÉPLACER, AVEC DES REPÈRES D'ALIGNEMENT.
 *
 * Quand le centre de l'objet arrive à moins de trois unités du centre d'un
 * autre — ou du centre de la toile —, on s'y colle et l'on montre le trait. Deux
 * lignes de code, et c'est ce qui fait qu'un dessin composé en trente secondes a
 * l'air soigné au lieu d'avoir l'air approximatif.
 */
function deplacer(el, copie, dx, dy) {
    reperes = [];
    const centres = { x: [TOILE.largeur / 2], y: [TOILE.hauteur / 2] };
    enigme.elements.forEach((o, k) => {
        if (k === sel) return;
        if (o.type === 'trait') { centres.x.push((o.x1 + o.x2) / 2); centres.y.push((o.y1 + o.y2) / 2); }
        else { centres.x.push(o.x); centres.y.push(o.y); }
    });

    const coller = (valeur, liste, vertical) => {
        for (const c of liste) {
            if (Math.abs(valeur - c) <= 3) { reperes.push({ a: c, vertical }); return c; }
        }
        return accrocher(valeur);
    };

    if (el.type === 'trait') {
        const mx = (copie.x1 + copie.x2) / 2 + dx, my = (copie.y1 + copie.y2) / 2 + dy;
        const cx = coller(mx, centres.x, true), cy = coller(my, centres.y, false);
        const ex = cx - (copie.x1 + copie.x2) / 2, ey = cy - (copie.y1 + copie.y2) / 2;
        el.x1 = Math.round(copie.x1 + ex); el.y1 = Math.round(copie.y1 + ey);
        el.x2 = Math.round(copie.x2 + ex); el.y2 = Math.round(copie.y2 + ey);
        return;
    }
    el.x = coller(copie.x + dx, centres.x, true);
    el.y = coller(copie.y + dy, centres.y, false);
}

// ── LA SAISIE SUR PLACE ─────────────────────────────────────────────────────

let saisieOuverte = false;

/**
 * OÙ LE MOT COMMENCE — et il n'en bouge plus.
 *
 * RÉMY : « le mot ne se centre pas, il garde la position du curseur ».
 *
 * Le modèle, lui, reste CENTRÉ : `x` est le milieu du mot, comme pour les cent
 * neuf énigmes du jeu, et l'on ne touche pas au format du JSON pour une
 * question d'ergonomie. Ce qu'on change, c'est le GESTE : on retient le bord
 * GAUCHE une fois pour toutes, et après chaque lettre on replace le centre à une
 * demi-largeur de ce bord. Le mot pousse alors vers la droite, comme un texte
 * qu'on tape — au lieu de s'écarter des deux côtés sous le curseur.
 */
let ancreDuMot = null;

/** Replace le centre du mot pour que son bord gauche reste sur l'ancre. */
function calerLeMot() {
    const el = enigme.elements[sel];
    const svg = q('#ae-toile');
    if (!el || el.type !== 'mot' || !svg || !ancreDuMot) return;
    const t = svg.querySelector(`[data-el="${sel}"] text`);
    if (!t) return;
    let b;
    try { b = t.getBBox(); } catch (e) { return; }
    el.x = Math.round((ancreDuMot.x + b.width / 2) * 100) / 100;
    rafraichirUn(svg, sel);
}

/** Ouvre le champ PAR-DESSUS le mot, à sa place et à sa taille. */
/**
 * ON ÉCRIT DIRECTEMENT SUR LA TOILE — il n'y a plus de cadre.
 *
 * RÉMY : « pour le texte, j'aimerais que l'on puisse écrire directement sur le
 * canvas sans cadre autour ».
 *
 * COMMENT ON FAIT DISPARAÎTRE LE CHAMP SANS PERDRE LE CLAVIER. Le champ est
 * toujours là — c'est lui qui reçoit les frappes, la correction automatique du
 * téléphone, le copier-coller —, mais il est rendu INVISIBLE : son texte est
 * transparent, son fond et sa bordure n'existent pas. Ce qu'on voit, c'est le
 * VRAI texte du dessin, qui se réécrit à chaque lettre.
 *
 * IL NE RESTE QUE LE CURSEUR, et c'est tout ce qu'il faut pour savoir où l'on
 * tape. Pour qu'il tombe au bon endroit, le champ copie les mesures du mot :
 * même police, même corps, même graisse, même écart entre les lettres, même
 * centre — et il TOURNE avec lui, sinon un mot à l'envers se taperait à
 * l'endroit, au-dessus de lui.
 *
 * LE CURSEUR VA À LA FIN, PAS SUR TOUT LE MOT. Sélectionner le mot entier était
 * commode tant que le champ se voyait ; maintenant qu'il est invisible, une
 * sélection invisible fait disparaître le mot à la première frappe sans qu'on
 * comprenne pourquoi.
 */
/** Le champ invisible, posé exactement sur le mot — appelé à chaque lettre. */
function placerLaSaisie() {
    const el = enigme.elements[sel];
    const svg = q('#ae-toile');
    if (!el || el.type !== 'mot' || !svg) return;
    const champ = q('#ae-saisie');
    const zone = q('.ae-toile-zone');
    const r = svg.getBoundingClientRect();
    const z = zone.getBoundingClientRect();
    const echelle = r.width / TOILE.largeur;

    champ.style.left = `${r.left - z.left + el.x * echelle}px`;
    champ.style.top = `${r.top - z.top + el.y / TOILE.hauteur * r.height}px`;
    champ.style.fontSize = `${Math.max(12, (el.taille || 34) * echelle)}px`;
    champ.style.fontWeight = el.gras === false ? '600' : '800';
    champ.style.letterSpacing = `${(Number(el.espacement) || 0) * echelle}px`;
    champ.style.transform = `translate(-50%, -50%) rotate(${Number(el.angle) || 0}deg)`
        + (el.miroir ? ' scaleX(-1)' : '');
    // LA LARGEUR SUIT LE MOT : le curseur d'un champ centré se place par rapport
    // à SA boîte. Trop étroite, le texte défilerait ; trop large, rien ne change
    // puisqu'elle est transparente — mais elle doit rester dans la toile.
    const large = Math.min(r.width - 8,
        Math.max(90, (el.texte || '').length * (el.taille || 34) * echelle * 0.8 + 40));
    champ.style.width = `${large}px`;
}

function ouvrirLaSaisie() {
    const el = enigme.elements[sel];
    const svg = q('#ae-toile');
    if (!el || el.type !== 'mot' || !svg) return;
    const champ = q('#ae-saisie');

    champ.value = el.texte || '';
    champ.hidden = false;
    placerLaSaisie();

    // L'ANCRE EST LE BORD GAUCHE ACTUEL DU MOT, et ce calcul vaut dans les deux
    // cas : sur un mot neuf, la boîte est vide et le bord gauche EST le point
    // qu'on vient de cliquer ; sur un mot qu'on rouvre, c'est son bord gauche
    // d'aujourd'hui. Une seule règle, pas de cas particulier.
    const t = svg.querySelector(`[data-el="${sel}"] text`);
    let largeurActuelle = 0;
    try { if (t) largeurActuelle = t.getBBox().width; } catch (e) { /* non rendu */ }
    ancreDuMot = { x: el.x - largeurActuelle / 2, y: el.y };

    saisieOuverte = true;
    champ.focus();
    const n2 = champ.value.length;
    champ.setSelectionRange(n2, n2);
    dire('Écris : le mot se forme sur la toile. Entrée pour poser, Échap pour annuler.');
}

function fermerLaSaisie(garderLeTexte = true) {
    ancreDuMot = null;
    if (!saisieOuverte) return;
    const champ = q('#ae-saisie');
    saisieOuverte = false;
    champ.hidden = true;
    const el = enigme.elements[sel];
    if (!el || el.type !== 'mot') return;
    if (garderLeTexte) el.texte = champ.value;
    // UN MOT RESTÉ VIDE S'EN VA. On vient de le créer d'un clic : le laisser
    // serait laisser un élément invisible qu'on déplacerait sans le voir — le
    // défaut même que `validerLibre` dénonce.
    if (!String(el.texte || '').trim()) {
        enigme.elements.splice(sel, 1);
        sel = -1;
    }
    enregistrer();
    dire('');
}

// ── LA BARRE CONTEXTUELLE ───────────────────────────────────────────────────

/**
 * ELLE SUIT LA SÉLECTION AU LIEU DE VIVRE DANS UNE COLONNE.
 *
 * Ce qu'on règle est alors à côté de ce qu'on regarde, et l'œil ne fait plus
 * l'aller-retour. Elle ne porte QUE ce qui se règle d'un coup d'œil — la
 * couleur, deux ou trois bascules, dupliquer, supprimer ; le réglage fin
 * (l'angle au degré, la taille au pixel) reste sur des poignées, qui sont plus
 * directes encore.
 */
function majBarre() {
    const barre = q('#ae-barre');
    const el = enigme.elements[sel];
    if (!el || commeEleve) {
        // ELLE GARDE SA PLACE, ET ELLE DIT QUOI FAIRE. Une barre qui disparaît
        // fait sauter la toile de quarante pixels à chaque sélection, et une
        // barre vide ne dit rien à qui ouvre la page pour la première fois.
        barre.className = 'ae-barre ae-barre--vide';
        barre.textContent = outil === 'select'
            ? 'Rien n\u2019est choisi — touche un élément de la toile, ou prends un outil ci-dessus.'
            : 'Trace sur la toile : appuie, tire, relâche.';
        return;
    }

    const pastilles = COULEURS.map(c =>
        `<button type="button" class="ae-pastille${c.id === (el.couleur || 'encre') ? ' ae-pastille--choisie' : ''}"
            data-couleur="${c.id}" title="${esc(c.nom)}" aria-label="${esc(c.nom)}"
            style="background: var(${c.jeton})"></button>`).join('');

    /** Une réglette avec son nom et sa valeur : on règle en voyant le chiffre. */
    const reglette = (id, nom, valeur, min, max, pas, unite) =>
        `<label class="ae-reglette"><span class="ae-etiq">${esc(nom)}</span>
            <input type="range" data-reg="${id}" min="${min}" max="${max}" step="${pas}"
                   value="${valeur}" aria-label="${esc(nom)}">
            <output>${valeur}${unite}</output></label>`;

    const nomDuGenre = { mot: 'Le mot', trait: 'Le trait', forme: 'La forme', dessin: 'Le dessin' };

    // LES RÉGLAGES QUI MANQUAIENT. L'épaisseur d'un trait, la taille d'un mot et
    // l'opacité d'un remplissage n'étaient réglables NULLE PART dans cet essai :
    // la barre ne portait que des bascules. Rémy : « pour la teinte, on n'a pas
    // l'opacité » — et c'était vrai des trois.
    let propres = '';
    if (el.type === 'mot') {
        propres = reglette('taille', 'Taille', Math.round(el.taille || 34), 10, 90, 1, ' px')
            + reglette('espacement', 'Écart', Math.round(el.espacement || 0), -6, 30, 1, '')
            + `<button type="button" class="ae-mini" data-bascule="gras"
                    aria-pressed="${el.gras !== false}" title="Gras"><b>G</b></button>
               <button type="button" class="ae-mini" data-bascule="miroir"
                    aria-pressed="${!!el.miroir}" title="Miroir">⇄</button>
               <button type="button" class="ae-mini" data-editer title="Modifier le mot (double-clic)">Aa</button>`;
    } else if (el.type === 'trait') {
        propres = reglette('epaisseur', 'Épaisseur', Math.round(el.epaisseur || 3), 1, 14, 1, ' px')
            + `<button type="button" class="ae-mini" data-bascule="fleche"
                    aria-pressed="${!!el.fleche}" title="Flèche">→</button>
               <button type="button" class="ae-mini" data-bascule="pointille"
                    aria-pressed="${!!el.pointille}" title="Pointillés">┄</button>`;
    } else if (el.type === 'forme') {
        propres = reglette('epaisseur', 'Épaisseur', Math.round(el.epaisseur || 3), 1, 14, 1, ' px')
            + reglette('remplissage', 'Remplissage', pourcentDeTeinte(el.remplissage), 0, 100, 5, ' %');
    } else {
        propres = '<span class="ae-etiq">Les poignées le redimensionnent et le tournent.</span>';
    }

    barre.innerHTML = `<span class="ae-groupe">
            <span class="ae-etiq ae-etiq--titre">${nomDuGenre[el.type] || 'L\u2019élément'}</span></span>
        <span class="ae-sep"></span>
        <span class="ae-groupe"><span class="ae-etiq">Couleur</span>
            <span class="ae-pastilles">${pastilles}</span></span>
        <span class="ae-sep"></span>
        <span class="ae-groupe">${propres}</span>
        <span class="ae-pousse"></span>
        <span class="ae-groupe">
            <button type="button" class="ae-mini" data-dupliquer title="Dupliquer (Ctrl+D)">⧉</button>
            <button type="button" class="ae-mini" data-devant title="Mettre devant">▲</button>
            <button type="button" class="ae-mini" data-derriere title="Mettre derrière">▼</button>
            <button type="button" class="ae-mini ae-mini--danger" data-supprimer
                title="Supprimer (Suppr)">🗑</button></span>`;
    barre.className = 'ae-barre';
    brancherLaBarre();
}

function brancherLaBarre() {
    const barre = q('#ae-barre');
    const el = () => enigme.elements[sel];
    barre.querySelectorAll('[data-couleur]').forEach(b => {
        b.onclick = () => { pousser(); el().couleur = b.dataset.couleur; enregistrer(); peindreToile(); };
    });
    barre.querySelectorAll('[data-bascule]').forEach(b => {
        b.onclick = () => {
            pousser();
            const nom = b.dataset.bascule;
            const e = el();
            // `gras` EST VRAI PAR DÉFAUT : son absence veut dire « gras », pas
            // « maigre ». Le basculer naïvement aurait rendu un premier clic sans
            // effet visible.
            e[nom] = nom === 'gras' ? (e.gras === false) : !e[nom];
            enregistrer();
            peindreToile();
        };
    });

    // LES RÉGLETTES NE REDESSINENT PAS LA BARRE, et c'est tout le sujet : la
    // reconstruire à chaque pixel du curseur arracherait la réglette qu'on est en
    // train de tirer. On met à jour la toile et le chiffre affiché, rien d'autre.
    barre.querySelectorAll('[data-reg]').forEach(ch => {
        let commence = false;
        ch.oninput = () => {
            if (!commence) { pousser(); commence = true; }
            const e = el();
            if (!e) return;
            e[ch.dataset.reg] = Number(ch.value);
            const sortie = ch.parentElement.querySelector('output');
            if (sortie) {
                const unite = ch.dataset.reg === 'remplissage' ? ' %'
                    : ch.dataset.reg === 'espacement' ? '' : ' px';
                sortie.textContent = ch.value + unite;
            }
            const svg = q('#ae-toile');
            if (svg) { rafraichirUn(svg, sel); majPoignees(svg); }
            enregistrer();
        };
        // UN SEUL PAS D'ANNULATION PAR GLISSÉ : sans ce drapeau, tirer une
        // réglette d'un bout à l'autre empilerait quatre-vingt-dix annulations,
        // et Ctrl+Z ne reviendrait plus nulle part.
        ch.onchange = () => { commence = false; };
    });
    const brancher = (sel2, faire) => {
        const b = barre.querySelector(sel2);
        if (b) b.onclick = faire;
    };
    brancher('[data-editer]', () => ouvrirLaSaisie());
    brancher('[data-dupliquer]', dupliquer);
    brancher('[data-supprimer]', supprimer);
    brancher('[data-devant]', () => empiler(1));
    brancher('[data-derriere]', () => empiler(-1));
}

// ── LES ACTIONS ─────────────────────────────────────────────────────────────

function dupliquer() {
    const el = enigme.elements[sel];
    if (!el) return;
    pousser();
    const c = JSON.parse(JSON.stringify(el));
    if (c.type === 'trait') { c.x1 += 12; c.y1 += 12; c.x2 += 12; c.y2 += 12; }
    else { c.x += 12; c.y += 12; }
    enigme.elements.splice(sel + 1, 0, c);
    sel += 1;
    enregistrer();
    peindreToile();
}

function supprimer() {
    if (sel < 0) return;
    pousser();
    enigme.elements.splice(sel, 1);
    sel = -1;
    enregistrer();
    peindreToile();
}

function empiler(pas) {
    const j = sel + pas;
    if (sel < 0 || j < 0 || j >= enigme.elements.length) return;
    pousser();
    const [el] = enigme.elements.splice(sel, 1);
    enigme.elements.splice(j, 0, el);
    sel = j;
    enregistrer();
    peindreToile();
}

function choisirOutil(id) {
    outil = id;
    document.querySelectorAll('[data-outil]').forEach(b => {
        const actif = b.dataset.outil === id;
        b.classList.toggle('ae-outil--actif', actif);
        b.setAttribute('aria-pressed', String(actif));
    });
    const toile = q('#ae-toile');
    if (toile) {
        // LE CURSEUR DIT CE QUI VA SE PASSER. Rémy : « quand on prend l'outil
        // mot, le curseur de la souris devrait prendre la forme d'un curseur ».
        // Une croix annonce un tracé ; une barre de texte annonce qu'on va
        // écrire. Ce sont deux gestes différents, et la main doit le savoir
        // AVANT d'appuyer.
        toile.classList.toggle('ae-toile--trace', id !== 'select' && id !== 'mot');
        toile.classList.toggle('ae-toile--texte', id === 'mot');
    }
    dire(id === 'select' ? ''
        : id === 'mot'
            ? 'Clique à l\u2019endroit où le mot doit COMMENCER, puis écris. '
              + 'L\u2019outil reste en main — Échap pour revenir à la flèche.'
            : `Trace ton ${OUTILS.find(o => o.id === id).nom.toLowerCase()} sur la toile : appuie, tire, relâche. `
              + 'Un simple clic en pose un depuis ce coin. '
              + 'L\u2019outil reste en main — Échap pour revenir à la flèche.');
}

function surLeClavier(ev) {
    if (saisieOuverte) return;
    const dans = ev.target && ev.target.closest && ev.target.closest('input, textarea, select');
    if (dans && ev.target.id !== 'ae-toile') return;

    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
        ev.preventDefault();
        (ev.shiftKey ? refaire : annuler)();
        return;
    }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'd') {
        ev.preventDefault(); dupliquer(); return;
    }
    if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); supprimer(); return; }
    if (ev.key === 'Escape') { sel = -1; choisirOutil('select'); peindreToile(); return; }
    // LES RACCOURCIS D'OUTIL : V pour choisir, T pour taper du texte. Ce sont
    // ceux de tous les logiciels de dessin ; les inventer autrement serait
    // demander d'apprendre.
    if (ev.key.toLowerCase() === 'v') { choisirOutil('select'); return; }
    if (ev.key.toLowerCase() === 't') { choisirOutil('mot'); return; }

    const el = enigme.elements[sel];
    if (!el) return;
    const pas = ev.shiftKey ? 10 : 1;
    const d = { ArrowLeft: [-pas, 0], ArrowRight: [pas, 0], ArrowUp: [0, -pas], ArrowDown: [0, pas] }[ev.key];
    if (!d) return;
    ev.preventDefault();
    pousser();
    if (el.type === 'trait') { el.x1 += d[0]; el.y1 += d[1]; el.x2 += d[0]; el.y2 += d[1]; }
    else { el.x += d[0]; el.y += d[1]; }
    enregistrer();
    peindreToile();
}

// ── LA RÉCOLTE ──────────────────────────────────────────────────────────────

function peindreBande() {
    const bande = q('#ae-bande');
    bande.innerHTML = lot.map((d, i) => {
        let dessin = '';
        try { dessin = dessiner({ ...d, forme: 'libre' }); } catch (e) { dessin = ''; }
        const nom = String(d.reponse || '').trim() || 'sans solution';
        return `<div class="ae-vignette${i === courant ? ' ae-vignette--courante' : ''}">
            <button type="button" class="ae-vignette-btn" data-aller="${i}"
                aria-current="${i === courant}" title="Reprendre « ${esc(nom)} »">
                <span class="ae-vignette-dessin">${dessin || '<span class="ae-vignette-vide">vide</span>'}</span>
                <span class="ae-vignette-nom">${esc(nom)}</span></button>
            <button type="button" class="ae-vignette-x" data-jeter="${i}"
                aria-label="Jeter « ${esc(nom)} »">✕</button></div>`;
    }).join('') + `<button type="button" class="ae-vignette-neuve" id="ae-neuve"
            title="Commencer une nouvelle énigme">＋<span>Nouvelle</span></button>`;

    bande.querySelectorAll('[data-aller]').forEach(b => {
        b.onclick = () => allerA(Number(b.dataset.aller));
    });
    bande.querySelectorAll('[data-jeter]').forEach(b => {
        b.onclick = () => {
            pousser();
            lot.splice(Number(b.dataset.jeter), 1);
            if (!lot.length) lot.push(vierge());
            allerA(Math.min(courant, lot.length - 1));
            dire('Jetée. Ctrl+Z la remet.');
        };
    });
    q('#ae-neuve').onclick = () => { pousser(); lot.push(vierge()); allerA(lot.length - 1); };
}

function allerA(i) {
    courant = Math.min(Math.max(0, i), lot.length - 1);
    enigme = lot[courant];
    sel = -1;
    choisirOutil('select');
    remplirLaFiche();
    enregistrer();
    toutPeindre();
}

// ── LA FICHE ────────────────────────────────────────────────────────────────

function peindreAides() {
    const boite = q('#ae-aides');
    const aides = enigme.aides || (enigme.aides = []);
    if (!aides.length) {
        boite.innerHTML = '<p class="ae-note">Aucun indice écrit. Le logiciel en donnera quand même '
            + 'deux : ce qu\'il faut voir, puis la première lettre de la réponse.</p>';
        return;
    }
    boite.innerHTML = aides.map((a, i) => `<div class="ae-aide-ligne">
        <span class="ae-aide-n">${i + 1}</span>
        <input type="text" data-aide="${i}" maxlength="140" value="${esc(a)}"
            placeholder="Regarde ce qui entoure le mot." aria-label="Indice ${i + 1}">
        <button type="button" class="ae-mini ae-mini--danger" data-aide-jeter="${i}"
            aria-label="Enlever l'indice ${i + 1}">✕</button></div>`).join('');
    // ON NE REDESSINE PAS LA LISTE À CHAQUE FRAPPE : on y perdrait le foyer, et
    // l'on taperait un indice une lettre à la fois.
    boite.querySelectorAll('[data-aide]').forEach(ch => {
        ch.oninput = () => { enigme.aides[Number(ch.dataset.aide)] = ch.value; enregistrer(); peindreAvis(); peindreJson(); };
    });
    boite.querySelectorAll('[data-aide-jeter]').forEach(b => {
        b.onclick = () => {
            pousser();
            enigme.aides.splice(Number(b.dataset.aideJeter), 1);
            enregistrer(); peindreAides(); peindreAvis(); peindreJson();
        };
    });
}

function peindreAvis() {
    const boite = q('#ae-avis');
    const avis = validerLibre(enigme).map(a => a.dit);
    if (String(enigme.reponse || '').trim()) {
        for (const e of attendues(enigme)) {
            if (!juste(e, enigme)) avis.push(`Le juge refuserait « ${e} », qui est pourtant une de tes réponses.`);
        }
    }
    if (!avis.length) {
        boite.className = 'ae-avis ae-avis--ok';
        boite.textContent = '✓ Rien à signaler : l\'énigme se dessine et sa réponse est acceptée.';
        return;
    }
    boite.className = 'ae-avis ae-avis--attention';
    boite.innerHTML = `<strong>À regarder :</strong><ul>${avis.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
}

function identifiantPropose(reponse) {
    const nu = String(reponse || '').toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return nu ? `dg-${nu}` : '';
}
const aExporter = (d) => ({ ...d, id: String(d.id || '').trim() || identifiantPropose(d.reponse) });

function peindreJson() {
    const zone = q('#ae-json');
    if (document.activeElement === zone) return;
    zone.value = q('#ae-tout').checked
        ? lotEnTexte(lot.map(aExporter))
        : enigmeEnTexte(aExporter(enigme));
}

function remplirLaFiche() {
    q('#ae-reponse').value = enigme.reponse || '';
    q('#ae-variantes').value = (enigme.variantes || []).join(', ');
    q('#ae-explication').value = enigme.explication || '';
    q('#ae-theme').value = enigme.theme || 'maths';
    q('#ae-niveau').value = String(enigme.niveau || 1);
    q('#ae-id').value = enigme.id || '';
}

// ── LE CHEF D'ORCHESTRE ─────────────────────────────────────────────────────

/** Tout ce qui change passe par là : on enregistre, on remet les comptes à jour. */
function enregistrer() {
    garder();
    peindreBande();
    peindreAvis();
    peindreJson();
}

function toutPeindre() {
    peindreBande();
    peindreToile();
    peindreAides();
    peindreAvis();
    peindreJson();
}

/** Un mot de conduite, à sa place — et jamais une fenêtre native. */
function dire(texte, alerte = false) {
    const el = q('#ae-consigne');
    el.textContent = texte || '';
    el.classList.toggle('ae-consigne--alerte', !!alerte);
    el.classList.toggle('ae-consigne--active', !!texte);
}

function demarrer() {
    // Les outils. ON INSÈRE AU DÉBUT au lieu de remplacer : la boîte porte déjà
    // le bouton d'import, qui est dans le HTML parce qu'il contient un champ de
    // fichier — et un `innerHTML =` l'aurait effacé sans un mot. (C'est
    // exactement ce qui est arrivé : `doitExister` l'a vu disparaître.)
    q('#ae-outils').insertAdjacentHTML('afterbegin', OUTILS.map(o => `
        <button type="button" class="ae-outil" data-outil="${o.id}"
                title="${esc(o.nom)}${o.touche ? ` (${o.touche})` : ''}"
                aria-label="${esc(o.nom)}" aria-pressed="false">
            ${apercuDOutil(o)}<span class="ae-outil-nom">${esc(o.nom)}</span></button>`).join(''));
    document.querySelectorAll('[data-outil]').forEach(b => {
        b.onclick = () => choisirOutil(b.dataset.outil);
    });

    q('#ae-theme').innerHTML = THEMES.map(t => `<option value="${t.id}">${esc(t.label)}</option>`).join('');
    q('#ae-niveau').innerHTML = NIVEAUX.map(n => `<option value="${n.id}">${esc(n.nom)}</option>`).join('');

    relire();
    remplirLaFiche();
    choisirOutil('select');
    toutPeindre();

    // Les champs de la fiche. Ils ne redessinent jamais la toile ni eux-mêmes :
    // redessiner reprendrait le foyer au champ en train d'être rempli.
    const lier = (sel2, quoi, lecture = (v) => v) => {
        const ch = q(sel2);
        ch.oninput = () => { enigme[quoi] = lecture(ch.value); enregistrer(); };
        if (ch.tagName === 'SELECT') ch.onchange = ch.oninput;
    };
    lier('#ae-reponse', 'reponse');
    lier('#ae-variantes', 'variantes', (v) => String(v).split(',').map(x => x.trim()).filter(Boolean));
    lier('#ae-explication', 'explication');
    lier('#ae-theme', 'theme');
    lier('#ae-niveau', 'niveau', (v) => Number(v));
    lier('#ae-id', 'id');

    q('#ae-aide-plus').onclick = () => {
        (enigme.aides || (enigme.aides = [])).push('');
        enregistrer();
        peindreAides();
        const dernier = document.querySelector(`[data-aide="${enigme.aides.length - 1}"]`);
        if (dernier) dernier.focus();
    };

    q('#ae-magnetisme').onchange = (e) => { magnetisme = e.target.checked; peindreToile(); };
    q('#ae-eleve').onchange = (e) => { commeEleve = e.target.checked; sel = -1; peindreToile(); };
    q('#ae-annuler').onclick = () => { if (!annuler()) dire('Il n\'y a rien à annuler.'); };
    q('#ae-refaire').onclick = () => { if (!refaire()) dire('Il n\'y a rien à refaire.'); };
    q('#ae-tout').onchange = peindreJson;

    const champ = q('#ae-saisie');
    champ.addEventListener('keydown', (ev) => {
        ev.stopPropagation();
        if (ev.key === 'Enter') { ev.preventDefault(); fermerLaSaisie(true); peindreToile(); }
        if (ev.key === 'Escape') { ev.preventDefault(); fermerLaSaisie(false); peindreToile(); }
    });
    // ON ÉCRIT ET L'ON VOIT : le mot se redessine à chaque lettre, sans que le
    // champ ne perde le foyer — il n'est pas DANS ce qu'on redessine.
    champ.addEventListener('input', () => {
        const el = enigme.elements[sel];
        if (!el) return;
        el.texte = champ.value;
        const svg = q('#ae-toile');
        if (!svg) return;
        // On dessine, PUIS on mesure, PUIS on recale : la largeur d'un mot ne se
        // calcule pas, elle se mesure sur le dessin.
        rafraichirUn(svg, sel);
        calerLeMot();
        majPoignees(svg);
        // LE CHAMP SUIT LE MOT : il est invisible, mais c'est lui qui porte le
        // curseur. S'il restait en place pendant que le mot pousse à droite, le
        // curseur se décalerait peu à peu du bout du texte.
        placerLaSaisie();
    });
    champ.addEventListener('blur', () => { fermerLaSaisie(true); peindreToile(); });

    q('#ae-copier').onclick = async () => {
        const b = q('#ae-copier');
        try { await navigator.clipboard.writeText(q('#ae-json').value); b.textContent = '✓ Copié'; }
        catch (e) { b.textContent = '⚠ Copie refusée'; q('#ae-json').select(); }
        setTimeout(() => { b.textContent = '📋 Copier'; }, 2400);
    };
    q('#ae-fichier').onclick = () => {
        const tout = q('#ae-tout').checked;
        const a = document.createElement('a');
        const url = URL.createObjectURL(new Blob([q('#ae-json').value], { type: 'application/json;charset=utf-8' }));
        a.href = url;
        a.download = tout ? `dingbats-${lot.length}.json`
            : `${identifiantPropose(enigme.reponse) || 'dingbat'}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        dire(tout ? `Tes ${lot.length} dingbats sont dans tes téléchargements.` : 'Le JSON est téléchargé.');
    };
    q('#ae-relire').onclick = () => {
        let venues;
        try { venues = lireUnLot(q('#ae-json').value); }
        catch (e) { dire('Je n\'arrive pas à relire ce texte : ' + e.message, true); return; }
        if (!venues.length) { dire('Ce texte ne porte aucune composition.', true); return; }
        pousser();
        const avant = lot.length;
        venues.forEach(d => lot.push(remettreEnForme(d)));
        allerA(avant);
        dire(`${venues.length} composition(s) ajoutée(s) à ta récolte.`);
    };

    // LE CLAVIER EST ÉCOUTÉ SUR LA PAGE, pas seulement sur la toile : on vient de
    // cliquer un bouton de la barre, le foyer y est resté, et « Suppr » ne
    // faisait rien. On ignore les champs de saisie, évidemment.
    // L'IMPORT D'UN SVG. Rémy : « il faudrait pouvoir importer des svg ».
    q('#ae-import').onchange = async (ev) => {
        const f = ev.target.files && ev.target.files[0];
        ev.target.value = '';   // pour pouvoir réimporter le MÊME fichier
        if (!f) return;
        let texte;
        try { texte = await f.text(); }
        catch (e) { dire('Je n\u2019arrive pas à lire ce fichier.', true); return; }

        let propre;
        try {
            // LE PRÉFIXE EST UNIQUE PAR IMPORT : deux dessins portent souvent
            // tous deux `id="a"`, et le second volerait le dégradé du premier.
            propre = nettoyerSvg(texte, { prefixe: `dg${compteurDImport++}-`, encre: teinterLesImports });
        } catch (e) {
            dire(`Ce SVG est refusé : ${e.message}`, true);
            return;
        }

        pousser();
        // ON GARDE LES PROPORTIONS DU DESSIN : un logo étiré est un logo abîmé,
        // et personne ne pense à le rétablir après coup. La plus grande
        // dimension tient dans la moitié de la toile.
        const [, , vl, vh] = propre.vueBoite;
        const rapport = (vh > 0 ? vh / vl : 1);
        const large = Math.min(TOILE.largeur / 2, 160);
        enigme.elements.push(elementNeuf('dessin', {
            contenu: propre.contenu, vueBoite: propre.vueBoite,
            x: TOILE.largeur / 2, y: TOILE.hauteur / 2,
            largeur: Math.round(large), hauteur: Math.round(large * rapport)
        }));
        sel = enigme.elements.length - 1;
        enregistrer();
        peindreToile();
        dire(propre.retires.length
            ? `Dessin importé. J\u2019en ai retiré : ${propre.retires.join(', ')}.`
            : 'Dessin importé.');
    };

    document.addEventListener('keydown', surLeClavier);

    // POUR LA SONDE : de quoi lire l'état sans passer par l'écran.
    window.__atelierEssai = {
        etat: () => ({ lot, courant, sel, outil }),
        // LES COINS DE CE QUI EST CHOISI, rotation comprise. La sonde ne peut pas
        // les recalculer de son côté : la boîte d'un MOT se mesure sur le dessin
        // (`getBBox`), pas sur ses champs. Sans ce crochet, on ne pourrait pas
        // vérifier que le coin opposé ne bouge pas — c'est-à-dire la demande.
        coins: () => {
            const svg = q('#ae-toile');
            if (sel < 0 || !svg) return null;
            const b = boiteDe(svg, sel);
            return b ? coinsDe(b).map(p => ({ x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 })) : null;
        },
        choisirOutil, annuler, refaire
    };
    document.documentElement.dataset.atelierEssai = 'pret';
}

demarrer();
