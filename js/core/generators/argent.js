// COMPTER L'ARGENT — et écrire 0,07 quand on a sept centimes.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'aimerai bien aussi un exercice où il faut compter l'argent et par
// exemple si j'ai 7 centimes, il faut marquer 0,07 ».
//
// CE N'EST PAS UN EXERCICE SUR L'ARGENT, C'EST UN EXERCICE SUR LES RANGS
// DÉCIMAUX — et l'euro en est le meilleur support qui existe. Il a exactement
// deux décimales, la pièce de 1 centime EST le centième, et l'élève a déjà
// tenu ces pièces dans sa main. « Sept centimes » s'écrit 0,07 parce qu'il faut
// cent pièces pour faire un euro ; écrire 0,7 reviendrait à dire qu'il en faut
// dix.
//
// TROIS GESTES QU'ON CONFOND, ET QU'IL FAUT SÉPARER :
//
//     7 centimes         →  0,07 €     la faute : 0,7
//     70 centimes        →  0,70 €     la faute : 0,07
//     2 € et 5 centimes  →  2,05 €     la faute : 2,5
//
// Le deuxième est le PIÈGE INVERSE du premier, et c'est pour cela qu'il a sa
// marche : un élève qui a retenu « les centimes, ça commence par zéro virgule
// zéro » écrit 0,07 pour soixante-dix centimes.
//
// ── ET L'ON COMPTE DE VRAIES PIÈCES ───────────────────────────────────────
//
// « Compter l'argent », c'est ce qu'il a demandé, et le dernier temps le fait
// pour de bon : un tas de pièces dessiné, et le total à écrire. On ne dit plus
// le nombre de centimes, il faut le trouver. C'est aussi la seule façon de
// travailler les pièces qui n'existent pas en nombre rond — 20 c, 2 c — et
// qu'un énoncé écrit ne fait jamais rencontrer.
//
// Tout ce fichier est pur : aucune dépendance au DOM, il se teste sous Node.

import { makeItem } from '../items.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

const SKILL = 'num.decimal.argent';

// LES PIÈCES ET LES BILLETS, EN CENTIMES. On ne range que ce qui existe
// vraiment : un exercice qui ferait rendre 30 centimes avec trois pièces de 10
// apprendrait à compter, pas à payer.
export const PIECES = [1, 2, 5, 10, 20, 50, 100, 200];
export const BILLETS = [500, 1000, 2000, 5000];

/** Le montant écrit comme on l'écrit : 0,07 — toujours deux décimales. */
export function enEuros(centimes) {
    const signe = centimes < 0 ? '−' : '';
    const n = Math.abs(centimes);
    return `${signe}${Math.floor(n / 100)},${String(n % 100).padStart(2, '0')}`;
}

/** Ce que vaut le montant, pour le comparer à ce que l'élève a tapé. */
export const enNombre = (centimes) => Math.round(centimes) / 100;

/** « 7 centimes », « 2 € et 5 centimes » — l'énoncé en toutes lettres. */
export function enMots(centimes) {
    const e = Math.floor(centimes / 100);
    const c = centimes % 100;
    if (!e) return `${c} centime${c > 1 ? 's' : ''}`;
    if (!c) return `${e} euro${e > 1 ? 's' : ''}`;
    return `${e} euro${e > 1 ? 's' : ''} et ${c} centime${c > 1 ? 's' : ''}`;
}

/** Le nom d'une pièce, pour le lecteur d'écran et pour l'épreuve. */
export const nomDe = (v) => (v >= 100
    ? `${v / 100} euro${v > 100 ? 's' : ''}`
    : `${v} centime${v > 1 ? 's' : ''}`);

// ── LE DESSIN ──────────────────────────────────────────────────────────────
//
// RÉMY : « il faut que les billets et les pièces soit super réalistes stp ».
//
// DEUX ÉCHELLES, ET C'EST UN CHOIX QUI SE MESURE. À l'échelle vraie, un billet
// de 50 € fait 140 mm pour les 16 mm d'une pièce de 1 centime : côte à côte
// sur un téléphone, la pièce devient un point de huit pixels où plus rien ne
// se lit — photographié, c'est exactement ce qu'on a vu. Les billets sont donc
// dessinés à une échelle plus serrée que les pièces. LES TAILLES RESTENT
// JUSTES DANS CHAQUE FAMILLE — les pièces entre elles, les billets entre eux —
// et c'est de cela que l'élève se sert pour les reconnaître.
const PAR_MM = 1.8;           // les pièces : 1,8 unité de dessin par millimètre
const PAR_MM_BILLET = 0.78;   // les billets, plus serrés (voir ci-dessus)

// LES DIAMÈTRES RÉELS, EN MILLIMÈTRES.
//
// ET CE N'EST PAS UNE COQUETTERIE : la pièce de 5 centimes est PLUS GRANDE que
// celle de 10, et celle de 1 euro plus petite que celle de 2. Un élève qui
// reconnaît les pièces à leur taille — tous les élèves — trébucherait sur un
// dessin qui dit le contraire, et il aurait raison contre le logiciel.
const DIAMETRES = { 1: 16.25, 2: 18.75, 5: 21.25, 10: 19.75, 20: 22.25, 50: 24.25,
                    100: 23.25, 200: 25.75 };

/** Le rayon dessiné d'une pièce, en unités du dessin. */
export const rayonDe = (v) => (DIAMETRES[v] || 20) * PAR_MM / 2;

// LES TROIS MÉTAUX DE L'EURO, et l'élève les reconnaît avant de lire le
// chiffre : cuivre pour 1, 2 et 5 centimes ; « or nordique » pour 10, 20 et
// 50 ; deux métaux pour les pièces en euros — et dans l'autre sens pour
// chacune. 1 € a l'ANNEAU doré et le cœur argenté, 2 € l'inverse. C'est la
// façon la plus sûre de les distinguer de loin, et elle est gratuite à dessiner.
const CUIVRE = { clair: '#f0b48c', moyen: '#c87941', fonce: '#7d4418' };
const OR = { clair: '#f7e4a0', moyen: '#d4a843', fonce: '#8f6a17' };
const ARGENT = { clair: '#f6f8fb', moyen: '#c3c9d2', fonce: '#7d848e' };

const metalDe = (v) => (v >= 100 ? null : (v >= 10 ? OR : CUIVRE));
const anneauDe = (v) => (v === 100 ? OR : ARGENT);
const coeurDe = (v) => (v === 100 ? ARGENT : OR);

/** Le dégradé d'un métal : une pièce plate ne ressemble à rien. */
function reflet(id, m) {
    return `<radialGradient id="${id}" cx="34%" cy="28%" r="78%">`
        + `<stop offset="0%" stop-color="${m.clair}"/>`
        + `<stop offset="58%" stop-color="${m.moyen}"/>`
        + `<stop offset="100%" stop-color="${m.fonce}"/></radialGradient>`;
}

/** La tranche cannelée, qu'on voit sur toutes les pièces d'euro. */
function cannelures(cx, cy, r, n, couleur) {
    let t = '';
    const e = Math.max(1, r * 0.09);
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const x1 = cx + Math.cos(a) * (r - e);
        const y1 = cy + Math.sin(a) * (r - e);
        const x2 = cx + Math.cos(a) * r;
        const y2 = cy + Math.sin(a) * r;
        t += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" `
            + `y2="${y2.toFixed(1)}" stroke="${couleur}" stroke-width=".7" opacity=".5"/>`;
    }
    return t;
}

/**
 * LES DOUZE ÉTOILES DE L'UNION, en couronne.
 *
 * Elles sont sur la face commune de TOUTES les pièces d'euro, du centime aux
 * deux euros — c'est même ce qui fait reconnaître une pièce d'euro d'un coup
 * d'œil. On les dessine en vraies étoiles à cinq branches : des ronds, à cette
 * taille, se lisaient comme des rivets.
 */
function etoiles(cx, cy, r, couleur, taille) {
    let t = '';
    for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        t += etoile(cx + Math.cos(a) * r, cy + Math.sin(a) * r, taille, couleur);
    }
    return t;
}

/** Une étoile à cinq branches, pointe en haut. */
function etoile(cx, cy, r, couleur) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 ? r * 0.42 : r;
        pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
    }
    return `<polygon points="${pts.join(' ')}" fill="${couleur}" opacity=".85"/>`;
}

/** Les dégradés dont une pièce a besoin — déclarés UNE fois par dessin. */
function defsPiece(valeur, cle) {
    const id = `m${cle}${valeur}`;
    const simple = metalDe(valeur);
    return simple ? reflet(id, simple)
        : reflet(`${id}a`, anneauDe(valeur)) + reflet(`${id}c`, coeurDe(valeur));
}

/**
 * LE CORPS D'UNE PIÈCE, sans ses dégradés : eux sont déclarés à part, parce
 * qu'un tas porte souvent deux fois la même pièce et que deux fois le même
 * `id` dans un SVG, c'est un `id` qui ne désigne plus rien de sûr.
 *
 * @param {number} valeur   en centimes : 1, 2, 5, 10, 20, 50, 100 ou 200
 */
function corpsPiece(valeur, x, y, cle = '') {
    const r = rayonDe(valeur);
    const id = `m${cle}${valeur}`;
    const simple = metalDe(valeur);
    const anneau = anneauDe(valeur);
    const coeur = coeurDe(valeur);
    const dit = valeur >= 100 ? String(valeur / 100) : String(valeur);
    const sous = valeur >= 100 ? 'EURO' : 'CENT';
    // Le champ où s'écrit la valeur : toute la pièce pour un centime, le seul
    // cœur pour une pièce en euros — sur la vraie, le chiffre n'empiète jamais
    // sur l'anneau.
    const champ = simple ? r : r * 0.60;
    const encre = simple ? simple.fonce : coeur.fonce;
    const corps = simple
        ? `<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="url(#${id})" `
            + `stroke="${simple.fonce}" stroke-width=".9"/>`
        : `<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="url(#${id}a)" `
            + `stroke="${anneau.fonce}" stroke-width=".9"/>`
            + `<circle cx="${x}" cy="${y}" r="${champ.toFixed(1)}" fill="url(#${id}c)" `
            + `stroke="${coeur.fonce}" stroke-width=".7"/>`;
    // LE LISERÉ DU BORD : c'est lui qui donne le relief. Sans cet anneau clair
    // juste en dedans de la tranche, le disque reste une gommette.
    const lisere = `<circle cx="${x}" cy="${y}" r="${(r * 0.90).toFixed(1)}" fill="none" `
        + `stroke="${(simple || anneau).clair}" stroke-width="${(r * 0.07).toFixed(1)}" `
        + 'opacity=".45"/>';
    return corps + lisere
        + cannelures(x, y, r, valeur >= 100 ? 48 : 36, (simple || anneau).fonce)
        + etoiles(x, y, simple ? r * 0.80 : r * 0.80, (simple || anneau).fonce,
            Math.max(1.2, r * 0.09))
        + `<text x="${x}" y="${(y + champ * 0.26).toFixed(1)}" text-anchor="middle" `
        + `font-size="${(champ * 0.86).toFixed(1)}" font-weight="900" fill="${encre}" `
        + `font-family="Georgia, serif">${dit}</text>`
        + `<text x="${x}" y="${(y + champ * 0.72).toFixed(1)}" text-anchor="middle" `
        + `font-size="${Math.max(4, champ * 0.28).toFixed(1)}" font-weight="700" `
        + `fill="${encre}" opacity=".85" letter-spacing=".4">${sous}</text>`;
}

/** Une pièce seule, dégradés compris — pour l'afficher hors d'un tas. */
export function pieceSvg(valeur, x, y, cle = '') {
    if (valeur >= 500) return billetSvg(valeur, x, y, cle);
    return `<defs>${defsPiece(valeur, cle)}</defs>${corpsPiece(valeur, x, y, cle)}`;
}

// LES BILLETS : LEURS COULEURS SONT LEUR IDENTITÉ. Gris pour le 5, rouge pour
// le 10, bleu pour le 20, orange pour le 50 — c'est à cela qu'on les reconnaît
// dans un portefeuille, bien avant de lire le chiffre. Les dimensions sont les
// vraies, en millimètres, et elles GRANDISSENT avec la valeur comme sur les
// vrais billets.
const BILLETS_LOOK = {
    500: { mm: [120, 62], fond: '#b9bcc0', trait: '#5f656b', clair: '#eceef0' },
    1000: { mm: [127, 67], fond: '#dd8870', trait: '#9c4530', clair: '#f9d8cd' },
    2000: { mm: [133, 72], fond: '#76a4d8', trait: '#35628f', clair: '#d6e5f6' },
    5000: { mm: [140, 77], fond: '#eba85a', trait: '#a9671a', clair: '#fbe3bd' }
};

const lookBillet = (v) => BILLETS_LOOK[v] || BILLETS_LOOK[500];
export const largeurBillet = (v) => lookBillet(v).mm[0] * PAR_MM_BILLET;
export const hauteurBillet = (v) => lookBillet(v).mm[1] * PAR_MM_BILLET;

/** Les dégradés d'un billet — même raison que pour les pièces. */
function defsBillet(valeur, cle) {
    const b = lookBillet(valeur);
    const id = `b${cle}${valeur}`;
    return `<linearGradient id="${id}" x1="0" y1="0" x2=".8" y2="1">`
        + `<stop offset="0%" stop-color="${b.clair}"/>`
        + `<stop offset="48%" stop-color="${b.fond}"/>`
        + `<stop offset="100%" stop-color="${b.trait}" stop-opacity=".92"/></linearGradient>`
        + `<linearGradient id="${id}h" x1="0" y1="0" x2="1" y2="1">`
        + '<stop offset="0%" stop-color="#ffffff" stop-opacity=".85"/>'
        + '<stop offset="45%" stop-color="#d9dde3" stop-opacity=".7"/>'
        + '<stop offset="100%" stop-color="#ffffff" stop-opacity=".85"/></linearGradient>';
}

/**
 * LE CORPS D'UN BILLET.
 *
 * CE QU'ON DESSINE EST CE QU'ON REGARDE. Sur un vrai billet en euros, quatre
 * choses se voient à un mètre et ce sont celles-là qui le nomment : la
 * COULEUR, le grand CHIFFRE, la PORTE en arche — le motif d'architecture de
 * toute la série —, et le DRAPEAU bleu aux douze étoiles. On ajoute la bande
 * holographique argentée, qui est ce que les élèves regardent en premier
 * quand on leur en met un dans la main.
 */
function corpsBillet(valeur, x, y, cle = '') {
    const b = lookBillet(valeur);
    const id = `b${cle}${valeur}`;
    const L = largeurBillet(valeur);
    const H = hauteurBillet(valeur);
    const gx = x - L / 2;
    const gy = y - H / 2;

    // LE DRAPEAU, en haut à gauche : bleu outremer et douze étoiles d'or.
    const fx = gx + L * 0.05;
    const fy = gy + H * 0.09;
    const fl = L * 0.15;
    const fh = fl * 0.66;
    let drapeau = `<rect x="${fx.toFixed(1)}" y="${fy.toFixed(1)}" width="${fl.toFixed(1)}" `
        + `height="${fh.toFixed(1)}" fill="#0b3b8f" rx="1"/>`;
    drapeau += etoiles(fx + fl / 2, fy + fh / 2, fh * 0.32, '#ffd34d', fh * 0.11);

    // LA PORTE EN ARCHE, au centre : un rectangle que coiffe un demi-cercle.
    const pw = L * 0.19;
    const ph = H * 0.58;
    const px = gx + L * 0.38;
    const py = gy + H * 0.20;
    const rr = pw / 2;
    const porte = `<path d="M ${px.toFixed(1)} ${(py + ph).toFixed(1)} `
        + `L ${px.toFixed(1)} ${(py + rr).toFixed(1)} `
        + `A ${rr.toFixed(1)} ${rr.toFixed(1)} 0 0 1 ${(px + pw).toFixed(1)} `
        + `${(py + rr).toFixed(1)} L ${(px + pw).toFixed(1)} ${(py + ph).toFixed(1)} Z" `
        + `fill="${b.clair}" stroke="${b.trait}" stroke-width=".8" opacity=".92"/>`
        + `<line x1="${(px + pw / 2).toFixed(1)}" y1="${(py + rr).toFixed(1)}" `
        + `x2="${(px + pw / 2).toFixed(1)}" y2="${(py + ph).toFixed(1)}" `
        + `stroke="${b.trait}" stroke-width=".6" opacity=".5"/>`
        + `<line x1="${px.toFixed(1)}" y1="${(py + ph * 0.58).toFixed(1)}" `
        + `x2="${(px + pw).toFixed(1)}" y2="${(py + ph * 0.58).toFixed(1)}" `
        + `stroke="${b.trait}" stroke-width=".6" opacity=".5"/>`;

    // LA BANDE HOLOGRAPHIQUE, à droite.
    const hx = gx + L * 0.86;
    const holo = `<rect x="${hx.toFixed(1)}" y="${(gy + 2.5).toFixed(1)}" `
        + `width="${(L * 0.09).toFixed(1)}" height="${(H - 5).toFixed(1)}" rx="1.5" `
        + `fill="url(#${id}h)" stroke="${b.trait}" stroke-width=".5" opacity=".9"/>`;

    return `<rect x="${gx.toFixed(1)}" y="${gy.toFixed(1)}" width="${L.toFixed(1)}" `
        + `height="${H.toFixed(1)}" rx="3" fill="url(#${id})" stroke="${b.trait}" `
        + 'stroke-width="1.2"/>'
        + `<rect x="${(gx + 2.5).toFixed(1)}" y="${(gy + 2.5).toFixed(1)}" `
        + `width="${(L - 5).toFixed(1)}" height="${(H - 5).toFixed(1)}" rx="2" fill="none" `
        + `stroke="${b.clair}" stroke-width=".6" opacity=".6"/>`
        + drapeau + porte + holo
        // LE GRAND CHIFFRE EN BAS À GAUCHE, et un petit en haut à droite : les
        // deux places où il figure sur le vrai billet.
        + `<text x="${(gx + L * 0.05).toFixed(1)}" y="${(gy + H * 0.88).toFixed(1)}" `
        + `font-size="${(H * 0.40).toFixed(1)}" font-weight="900" fill="${b.trait}" `
        + `font-family="Georgia, serif">${valeur / 100}</text>`
        + `<text x="${(gx + L * 0.83).toFixed(1)}" y="${(gy + H * 0.28).toFixed(1)}" `
        + `text-anchor="end" font-size="${(H * 0.20).toFixed(1)}" font-weight="900" `
        + `fill="${b.trait}" font-family="Georgia, serif">${valeur / 100}</text>`
        + `<text x="${(gx + L * 0.83).toFixed(1)}" y="${(gy + H * 0.86).toFixed(1)}" `
        + `text-anchor="end" font-size="${(H * 0.14).toFixed(1)}" font-weight="800" `
        + `fill="${b.trait}" opacity=".9" letter-spacing=".6">EURO</text>`;
}

/** Un billet seul, dégradés compris. */
export function billetSvg(valeur, x, y, cle = '') {
    return `<defs>${defsBillet(valeur, cle)}</defs>${corpsBillet(valeur, x, y, cle)}`;
}

// ── LE TAS ─────────────────────────────────────────────────────────────────

const LARGEUR_TAS = 320;   // la largeur du dessin, en unités
const ECART = 9;           // ce qui sépare deux objets posés côte à côte

const largeurDe = (v) => (v >= 500 ? largeurBillet(v) : rayonDe(v) * 2);
const hauteurDe = (v) => (v >= 500 ? hauteurBillet(v) : rayonDe(v) * 2);

/**
 * LE TAS, RANGÉ DE LA PLUS GROSSE À LA PLUS PETITE.
 *
 * ON NE MÉLANGE PAS L'ORDRE : compter un tas en désordre est un exercice
 * d'attention, pas de numération — et c'est celui qui fait échouer l'élève
 * pour une raison qui n'est pas celle du chapitre. Rangées, les pièces se
 * groupent d'elles-mêmes : les billets d'abord, puis les euros, puis les
 * centimes.
 *
 * ET LE RANGEMENT SE FAIT SUR LES VRAIES LARGEURS. Une grille à pas fixe —
 * ce qu'il y avait ici — posait un billet de 110 unités dans une case de 58 :
 * photographié, le billet passait sous les pièces et le tas devenait
 * illisible. Une case n'a pas de largeur ; un objet, si.
 */
export function tasSvg(pieces) {
    const liste = [...pieces].sort((a, b) => b - a);

    // Un premier passage range les objets en lignes, sans rien dessiner.
    const lignes = [];
    let ligne = [];
    let large = 0;
    for (const v of liste) {
        const l = largeurDe(v);
        if (ligne.length && large + ECART + l > LARGEUR_TAS) {
            lignes.push(ligne); ligne = []; large = 0;
        }
        large += (ligne.length ? ECART : 0) + l;
        ligne.push(v);
    }
    if (ligne.length) lignes.push(ligne);

    // LA PLANCHE SE SERRE SUR CE QU'ELLE PORTE. Un tas de deux pièces dans
    // une planche de 320 unités se dessinait au quart de la largeur
    // disponible, et les pièces sortaient minuscules sur le téléphone : ce
    // n'est pas la planche qui commande la taille, c'est la ligne la plus
    // large. Vu sur la photo, invisible dans le code.
    const LARGEUR = Math.max(160, ...lignes.map(l =>
        l.reduce((s, v) => s + largeurDe(v), 0) + ECART * (l.length - 1)));

    // Le second les pose, chacun centré sur la hauteur de SA ligne.
    let y = ECART;
    let dessins = '';
    for (const l of lignes) {
        const h = Math.max(...l.map(hauteurDe));
        const totale = l.reduce((s, v) => s + largeurDe(v), 0) + ECART * (l.length - 1);
        let x = (LARGEUR - totale) / 2;
        for (const v of l) {
            const w = largeurDe(v);
            dessins += v >= 500
                ? corpsBillet(v, x + w / 2, y + h / 2)
                : corpsPiece(v, x + w / 2, y + h / 2);
            x += w + ECART;
        }
        y += h + ECART;
    }

    // LES DÉGRADÉS, UNE SEULE FOIS PAR VALEUR. Deux pièces de 2 centimes
    // déclaraient deux fois le même identifiant.
    const defs = [...new Set(liste)]
        .map(v => (v >= 500 ? defsBillet(v, '') : defsPiece(v, ''))).join('');

    return `<svg class="arg-tas" viewBox="0 0 ${Math.round(LARGEUR)} ${Math.round(y)}" `
        + `width="100%" style="max-width:${Math.round(LARGEUR * 1.6)}px" role="img" `
        + `aria-label="${liste.length} ${liste.some(v => v >= 500) ? 'pièces et billets' : 'pièces'} : ${liste.map(nomDe).join(', ')}">`
        + `<defs>${defs}</defs>${dessins}</svg>`;
}

/**
 * LE TABLEAU DES RANGS, avec le chiffre à sa place.
 *
 * C'EST LE DESSIN QUI RÉPOND À LA QUESTION, et il la répond sans une phrase :
 * sept centimes, c'est sept CENTIÈMES, donc le 7 va dans la colonne des
 * centièmes — et la colonne des dixièmes reste vide, donc on y écrit 0.
 *
 * LES COLONNES SONT LARGES PARCE QUE « DIXIÈMES » EST UN LONG MOT. Serrées à
 * 58 unités, les deux titres se touchaient et se lisaient « dixièmescentièmes »
 * — vu sur la photo, invisible dans le code.
 */
export function rangsSvg(centimes) {
    const e = Math.floor(centimes / 100);
    const d = Math.floor((centimes % 100) / 10);
    const c = centimes % 10;
    const L = 70;
    const col = (x, titre, chiffre, fort) =>
        `<rect x="${x}" y="28" width="${L}" height="48" fill="${fort
            ? 'color-mix(in srgb, var(--warning) 30%, var(--bg-panel))' : 'var(--bg-panel)'}" `
        + 'stroke="currentColor" stroke-width="1.5" opacity=".9"/>'
        + `<text x="${x + L / 2}" y="21" text-anchor="middle" font-size="12" `
        + `font-weight="700" fill="currentColor">${titre}</text>`
        + `<text x="${x + L / 2}" y="64" text-anchor="middle" font-size="27" `
        + `font-weight="900" fill="currentColor">${chiffre}</text>`;
    return '<svg class="arg-rangs" viewBox="0 0 252 90" width="100%" '
        + 'style="max-width:300px" role="img" '
        + `aria-label="${e} euros, ${d} dixièmes, ${c} centièmes">`
        + col(4, 'euros', e, false)
        + '<text x="80" y="66" text-anchor="middle" font-size="27" font-weight="900" '
        + 'fill="currentColor">,</text>'
        + col(90, 'dixièmes', d, d === 0)
        + col(174, 'centièmes', c, true)
        + '</svg>';
}

// ── LES MARCHES ────────────────────────────────────────────────────────────

export const ETAPES = [
    { id: 'centimes-petits', temps: 'A', titre: 'De 1 à 9 centimes', min: 1, max: 9 },
    { id: 'centimes-dizaines', temps: 'A', titre: 'Des dizaines de centimes', dizaines: true },
    { id: 'centimes-melange', temps: 'A', titre: 'Les centimes, au hasard', min: 1, max: 99 },
    { id: 'euros-petits', temps: 'B', titre: 'Des euros et peu de centimes', euros: true, min: 1, max: 9 },
    { id: 'euros-dizaines', temps: 'B', titre: 'Des euros et des dizaines', euros: true, dizaines: true },
    { id: 'euros-melange', temps: 'B', titre: 'Euros et centimes, au hasard', euros: true, min: 1, max: 99 },
    { id: 'tas-centimes', temps: 'C', titre: 'Compter un tas de pièces', tas: 'centimes' },
    { id: 'tas-euros', temps: 'C', titre: 'Des euros dans le tas', tas: 'euros' },
    { id: 'tas-complet', temps: 'C', titre: 'Pièces et billets', tas: 'tout' }
];

const TEMPS = {
    A: 'A — écrire des centimes',
    B: 'B — des euros et des centimes',
    C: 'C — compter un tas'
};

/** Le montant d'une question, en centimes. */
export function montant(etape, rng) {
    const cents = etape.dizaines ? rng.int(1, 9) * 10 : rng.int(etape.min || 1, etape.max || 99);
    return (etape.euros ? rng.int(1, 9) * 100 : 0) + cents;
}

/**
 * UN TAS QUI FAIT UN COMPTE RÉALISTE.
 *
 * ON PART DU MONTANT ET ON LE REND EN PIÈCES, comme une caisse : c'est la
 * seule façon d'obtenir un tas qu'on peut vraiment avoir dans la poche. Tirer
 * des pièces au hasard donnerait des tas de douze pièces de 2 centimes.
 */
/** Le rendu le plus court : ce que donnerait une caisse. */
function auPlusCourt(centimes, dispo) {
    const tas = [];
    let reste = centimes;
    for (const v of [...dispo].sort((a, b) => b - a)) {
        while (reste >= v) { tas.push(v); reste -= v; }
    }
    return tas;
}

export function rendreEnPieces(centimes, rng, avecBillets = false) {
    const dispo = avecBillets ? [...BILLETS, ...PIECES] : PIECES;
    const tas = [];
    let reste = centimes;
    for (const v of [...dispo].sort((a, b) => b - a)) {
        // UN PEU DE HASARD, SINON C'EST TOUJOURS LE MÊME TAS : on ne prend pas
        // systématiquement le maximum de grosses pièces, sans quoi l'élève
        // apprend le tas et non le compte. Mais jamais plus de trois d'une
        // même sorte : au-delà, ce n'est plus un porte-monnaie.
        let combien = Math.floor(reste / v);
        if (combien > 0 && rng.int(1, 3) === 1) combien = Math.max(1, combien - 1);
        combien = Math.min(combien, 3);
        for (let i = 0; i < combien; i++) tas.push(v);
        reste -= combien * v;
    }
    // CE QUI RESTE SE PAIE EXACTEMENT, ET SANS HASARD.
    //
    // MESURÉ : la version d'avant payait le reste en pièces de 1 centime et
    // s'arrêtait à quatorze objets. Sur 9800 montants, SEPT rendaient un
    // centime de moins que demandé — et un tas de dix-huit pièces arrivait
    // quand même à l'écran, parce que le plafond ne portait que sur la fin.
    // Un second passage franchement glouton rend toujours le compte juste.
    for (const v of [...dispo].sort((a, b) => b - a)) {
        while (reste >= v) { tas.push(v); reste -= v; }
    }
    // ET UN TAS SE COMPTE À L'ŒIL. Mesuré sur 9800 montants : le hasard le
    // faisait monter jusqu'à DIX-NEUF objets, ce qui n'est plus un
    // porte-monnaie mais une corvée — et l'élève y échoue par fatigue, pas
    // faute de savoir. Au-delà de douze, on retombe sur le rendu le plus
    // court, celui d'une caisse.
    return tas.length <= 12 ? tas : auPlusCourt(centimes, dispo);
}

export function question(etape, rng) {
    // --- Temps C : LE TAS ---------------------------------------------------
    if (etape.tas) {
        const base = etape.tas === 'centimes' ? rng.int(12, 98)
            : (etape.tas === 'euros' ? rng.int(120, 980) : rng.int(600, 7800));
        const tas = rendreEnPieces(base, rng, etape.tas === 'tout');
        const total = tas.reduce((s, v) => s + v, 0);
        return {
            centimes: total,
            question: 'Combien y a-t-il, en euros ?',
            montantDit: enMots(total),
            dessin: tasSvg(tas),
            pourquoi: `${tas.length} pièces, ${total} centimes en tout : ${enEuros(total)} €.`,
            tas
        };
    }
    // --- Temps A et B : L'ÉNONCÉ EN TOUTES LETTRES --------------------------
    const c = montant(etape, rng);
    return {
        centimes: c,
        question: `Écris ${enMots(c)} en euros.`,
        montantDit: enMots(c),
        dessin: '',
        pourquoi: `${enMots(c)} = ${enEuros(c)} €.`,
        tas: null
    };
}

const MOT = 'marche';
const LISTE_MARCHES = ETAPES.map((e, i) => ({ id: e.id, nom: `${i + 1}. ${e.titre}`, groupe: e.temps }));

export const argentGenerator = {
    id: 'num.argent',
    label: 'Compter l\'argent',
    skills: [SKILL],
    answerKinds: ['numeric'],
    // LA FEUILLE NE PEUT PAS PORTER LE TAS : les pièces sont un dessin, et la
    // version papier n'en a pas. Les deux premiers temps s'impriment très bien.
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE_MARCHES).length),
    params: [paramMarches({ marches: LISTE_MARCHES, groupes: TEMPS, mot: MOT })],

    generate(params, ctx) {
        const rng = ctx.rng;
        const id = marcheAuRang(ctx.index ?? 0, marchesCochees(params, LISTE_MARCHES),
            totalDe(ctx, params), params);
        const etape = ETAPES.find(e => e.id === id) || ETAPES[0];
        const q = question(etape, rng);
        const c = q.centimes;
        const cent = c % 100;

        return makeItem({
            seed: rng.seed,
            generatorId: 'num.argent',
            skillId: SKILL,
            answerKind: 'numeric',
            prompt: {
                text: q.question,
                // SUR LA FEUILLE, LE TAS S'ÉCRIT. Le dessin n'y est pas — la
                // fiche ne porte pas de figure —, mais « 2 € + 1 € + 20 c +
                // 5 c = » demande exactement la même chose et se lit tout
                // seul. La première version imprimait « 8 pièces : 200 + 100
                // + 20 centimes = », ce qui fait travailler des centimes
                // entiers et non des euros : la feuille posait une AUTRE
                // question que l'écran.
                papier: q.tas
                    ? `${q.tas.map(v => (v >= 100 ? `${v / 100} €` : `${v} c`)).join(' + ')} =`
                    : `${enMots(c)} =`,
                // DEUX MISES EN PAGE, PARCE QU'IL Y A DEUX ÉNONCÉS.
                //
                // Quand le tas est là, C'EST LUI l'énoncé : la phrase passe
                // dessous, en petit, et elle ne change jamais. Quand il n'y a
                // pas de dessin, c'est le MONTANT qu'on doit voir de loin —
                // d'où la consigne en petit par-dessus, comme pour le calcul
                // littéral. Rémy, la veille : « tes phrases sont tellement
                // longues et compliquées, elles ne seront pas lues ».
                html: q.tas
                    ? `<div class="game-question">${q.dessin}`
                        + `<span class="rel-q">${q.question}</span></div>`
                    : '<div class="game-question"><span class="lit-consigne">Écris ce '
                        + 'montant en euros</span>'
                        + `<span class="lit-expr">${q.montantDit}</span></div>`
            },
            answer: enNombre(c),
            hints: [
                // CINQ MOTS : c'est la règle, et elle suffit.
                'Il faut CENT centimes pour faire un euro.',
                // LE SECOND INDICE DIT LE RANG, PAS LA RÉPONSE.
                //
                // ET « DEUX CHIFFRES APRÈS LA VIRGULE » EST UNE RÈGLE
                // D'ÉCRITURE, PAS UNE RÈGLE DE CALCUL : 0,7 € et 0,70 € sont
                // le MÊME prix, et la réponse 0,7 est donc acceptée pour
                // soixante-dix centimes. Ce serait une faute de la refuser —
                // le piège de cette marche est 0,07, pas l'absence du zéro
                // final.
                // ET IL S'ACCORDE. « 1 centimes, c'est 1 centièmes » : vu sur
                // la photo de la carte d'indice, invisible partout ailleurs.
                // Un indice qui écrit mal la langue perd la confiance de
                // l'élève sur le reste de ce qu'il dit.
                cent < 10 && cent > 0
                    ? `${cent} centime${cent > 1 ? 's' : ''}, c'est ${cent} `
                        + `centième${cent > 1 ? 's' : ''} : le ${cent} va après le zéro.`
                    : 'Un prix s\'écrit sur deux chiffres après la virgule : les dixièmes, '
                        + 'puis les centièmes.'
            ],
            // LE DESSIN RÉPOND SANS UNE PHRASE : le chiffre à sa colonne, et la
            // colonne vide qui reçoit un zéro.
            schemas: ['', rangsSvg(c)],
            explanation: q.pourquoi,
            difficulty: etape.temps === 'A' ? 1 : etape.temps === 'B' ? 2 : 3,
            meta: {
                marche: etape.id, temps: etape.temps, titre: etape.titre,
                centimes: c, tas: q.tas,
                // LE PAVÉ DOIT PORTER LA VIRGULE : sans elle, la réponse
                // attendue n'est pas saisissable.
                decimal: true
            }
        });
    }
};

export default argentGenerator;
