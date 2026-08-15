// LE RENDU D'UNE FICHE EN BLOCS — une seule fois, pour l'aperçu ET le PDF.
//
// core/fiche.js décide où va chaque chose, en millimètres. Ici on ne fait que
// dessiner ces items deux fois : en HTML positionné pour l'aperçu, en jsPDF
// pour le fichier. Les deux dessins lisent les MÊMES coordonnées — c'est la
// garantie que ce qu'on voit à l'écran est ce que sort l'imprimante.
//
// Ce module est partagé par la fiche d'un exercice (printQuestions) et la
// fiche d'un parcours (printParcours) : même papier, même trait, même bandeau.

import { A4 } from '../core/fiche.js';
// Les dessins de grilles vivent avec la fiche de grilles : un sudoku se dessine
// pareil qu'il occupe une page entière ou un bloc au milieu d'une évaluation.
import { RENDUS } from './printSheet.js';

/**
 * LE POLYCOPIÉ EN COULEUR, OU NON.
 *
 * Une salle des professeurs a une imprimante noir et blanc, et de l'encre
 * comptée. Une feuille dont la compréhension DÉPEND de la couleur devient
 * alors inutilisable — c'est pour cela que tout ce qui s'imprime ici porte
 * aussi une marque de forme (un symbole, une trame, une étiquette) : la
 * couleur ajoute du confort, elle ne porte jamais l'information à elle seule.
 *
 * Le choix est GLOBAL — mémorisé d'une fiche à l'autre, on ne le refait pas
 * dix fois — et RÉGLABLE FICHE PAR FICHE, puisque c'est le même sélecteur qui
 * l'affiche et le change.
 */
const CLE_COULEUR = 'mathbox-polycopie-couleur';
let couleurEnMemoire = null;

export function polycopieEnCouleur() {
    if (couleurEnMemoire !== null) return couleurEnMemoire;
    let v = null;
    try { v = window.localStorage.getItem(CLE_COULEUR); } catch (e) { v = null; }
    // Par défaut : NOIR ET BLANC. C'est ce qui sort de la photocopieuse de
    // l'établissement, et une feuille pensée pour elle marche partout.
    couleurEnMemoire = v === '1';
    return couleurEnMemoire;
}

export function reglerPolycopieCouleur(oui) {
    couleurEnMemoire = !!oui;
    try { window.localStorage.setItem(CLE_COULEUR, oui ? '1' : '0'); } catch (e) { /* privé */ }
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
    const re = avecFractions ? /(\d+)\s*\/\s*(\d+)|(\u2248)/g : /(\u2248)/g;
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
            const yTrait = y - o.taille * 0.34;
            pdf.text(m.num, x + (w - pdf.getTextWidth(m.num)) / 2, yTrait - o.taille * 0.22);
            pdf.text(m.den, x + (w - pdf.getTextWidth(m.den)) / 2, yTrait + o.taille * 1.02);
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
    const trouCls = 'fx-trou'
        + (opts.champs ? ' fx-trou--champ' : '')
        + (avecFractions ? ' fx-trou--frac' : '');
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
    let t = String(texte ?? '');
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
            html += `<div class="fx-bandeau" style="left:${it.x * k}px; top:${it.y * k}px;
                width:${it.w * k}px; height:${it.h * k}px; font-size:${o.taille * k * 1.02}px">
                <span>${echapper(titreExo(it))}</span>
                ${it.points ? `<span class="fx-points">… / ${it.points}</span>` : ''}
                ${roue}</div>`;
            continue;
        }
        if (it.type === 'consigne') {
            it.lignes.forEach((ligne, i) => {
                html += `<div class="fx-consigne" style="left:${(it.x + 1) * k}px;
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
            html += `<div class="fq-num" style="left:${it.x * k}px; top:${it.y * k}px; font-size:${o.taille * k}px">${it.n}.</div>`;
        }
        it.lignes.forEach((ligne, i) => {
            html += `<div class="fq-ligne" style="left:${it.texteX * k}px; top:${(it.y + (it.dy || 0) + i * o.interligne) * k}px;
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
            html += o.champs
                ? `<div class="fx-champ" style="left:${it.rep.x * k}px; top:${it.rep.champY * k}px;
                    width:${it.rep.w * k}px; height:${it.rep.h * k}px"></div>`
                : `<div class="fq-reponse" style="left:${it.rep.x * k}px; top:${it.rep.y * k}px; width:${it.rep.w * k}px"></div>`;
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
 * L'en-tête d'une page.
 *
 * DEUX LIGNES, PAS UNE. Le titre et l'identité se partageaient une ligne : un
 * titre un peu long — « Tout sur papier (72 exercices) — Interrogation » — et
 * le « Nom / Date » venait buter dans la case de la note. Le titre a
 * maintenant sa ligne, l'identité la sienne, et le filet s'arrête AVANT la
 * case : il la traversait, et la case débordait sous lui.
 *
 * @param {Object} [entete] - { champs: ['nom','date'], titre, sousTitre }
 */
export function apercuEntete(k, titre, sousTitre, note, page, entete = {}) {
    const P = page || A4;
    const droiteMm = P.w - P.marge - (note ? 30 : 0);
    const champs = champsDe(entete.champs, droiteMm - P.marge);
    // LA CASE DE LA NOTE. Sur une interrogation, elle est le premier endroit
    // que regarde l'élève et le dernier que remplit le professeur : elle mérite
    // un cadre à elle, en haut à droite, pas une mention perdue dans une ligne
    // de texte. Le total du barème y est imprimé — « … / 20 » — pour que la
    // note se pose sans avoir à chercher sur combien elle compte.
    const cadre = note ? `
        <div class="fp-note-case" style="right:${P.marge * k}px; top:${(P.marge + 0.5) * k}px;
            width:${26 * k}px; height:${13 * k}px; font-size:${4.4 * k}px">… / ${echapper(String(note.sur))}</div>` : '';
    const droite = P.marge + (note ? 30 : 0);
    const lignes = champs.map(c => `<span class="fp-champ"><i>${c.label} :</i>
        <u style="width:${c.large * k}px"></u></span>`).join('');
    return `
        <div class="fp-entete" style="left:${P.marge * k}px; right:${droite * k}px;
            top:${(P.marge + 1) * k}px; font-size:${4.6 * k}px">
            <b>${echapper(titre)}${sousTitre ? ' — ' + echapper(sousTitre) : ''}</b>
        </div>
        ${champs.length ? `<div class="fp-identite" style="left:${P.marge * k}px; right:${droite * k}px;
            top:${(P.marge + 7.4) * k}px; font-size:${3.3 * k}px; gap:${5 * k}px">${lignes}</div>` : ''}
        ${cadre}
        <div class="fp-ligne" style="left:${P.marge * k}px; right:${droite * k}px;
            top:${(P.marge + (champs.length ? 14 : 9)) * k}px;"></div>`;
}

// --- PDF ---------------------------------------------------------------------

export function entetePdf(pdf, titre, sousTitre, bareme, note, page, entete = {}) {
    const P = page || A4;
    const champs = champsDe(entete.champs, P.w - 2 * P.marge - (note ? 30 : 0));
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14.5);
    pdf.setTextColor(...ENCRE.texte);
    // LE TITRE A SA LIGNE. Il la partageait avec le « Nom / Date » : un titre
    // un peu long venait buter dans la case de la note, et les deux textes se
    // chevauchaient sans que rien ne l'empêche.
    const droite = P.w - P.marge - (note ? 30 : 0);
    pdf.splitTextToSize(pourPdf(`${titre}${sousTitre ? ' — ' + sousTitre : ''}`),
        droite - P.marge).slice(0, 1)
        .forEach(l => pdf.text(l, P.marge, P.marge + 5.6));

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
    if (note) {
        pdf.setDrawColor(...ENCRE.trait);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(P.w - P.marge - 26, P.marge + 0.5, 26, 13, 1.5, 1.5, 'S');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.setTextColor(...ENCRE.gris);
        pdf.text(`… / ${note.sur}`, P.w - P.marge - 13, P.marge + 8.6, { align: 'center' });
        pdf.setTextColor(...ENCRE.texte);
    }
    // LE FILET S'ARRÊTE AVANT LA CASE DE LA NOTE : il la traversait de part en
    // part, et la case, plus haute que lui, débordait dessous.
    pdf.setDrawColor(...ENCRE.trait);
    pdf.setLineWidth(0.4);
    const yFilet = P.marge + (champs.length ? 13.5 : 9);
    pdf.line(P.marge, yFilet, droite, yFilet);
    if (bareme) {
        pdf.setFontSize(8.6);
        pdf.setTextColor(...ENCRE.gris);
        pdf.text(pourPdf(bareme), P.marge, yFilet + 4.4);
    }
    pdf.setFontSize(6.5);
    pdf.setTextColor(160, 165, 175);
    pdf.text('Fiche générée par AtoutMath', P.w / 2, P.h - 4, { align: 'center' });
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
        if (it.n != null) pdf.text(`${it.n}.`, it.x, it.y + o.taille);
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
            else pointilles(pdf, it.rep.x, it.rep.y, it.rep.w);
        }
    }
}
