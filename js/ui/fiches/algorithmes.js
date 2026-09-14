// ALGORITHMIQUE — le chat, les organigrammes, les tableaux croisés.
//
// Une tranche de `printSheet.js`, découpée par `tools/decouperPrintSheet.mjs`.
// Tout ce qui est ici n'est utilisé QUE par les exercices de cette famille ;
// ce qui sert à plusieurs vit dans `socle.js`.

import {
    ENCRE, POINTE, boiteDe, couperEnLignes, echapper, echapperSheet, rvbHex
} from './socle.js';
import { BANDE_NOM as BANDE_NOM_Q, CASE_H as CASE_H_Q, CASE_L as CASE_L_Q, COND_H as COND_H_Q, COND_L as COND_L_Q, COULEURS_FAMILLE as COULEURS_Q, COULEUR_BANDE as BANDE_Q, COULEUR_FIGURE as FIGURE_Q, FAMILLES as FAMILLES_Q, FLECHES as FLECHES_Q, PLAN_H as PLAN_H_Q, PLAN_L as PLAN_L_Q, POSITIONS as POSITIONS_Q, cleFleche as cleFlecheQ, codageDiagonales as codageDiagQ, coinsArrondis as coinsArrondisQ, pointeDe as pointeDeQ, posEtiquette as posEtiquetteQ, traitsDeCondition as traitsQ } from '../../core/quadrilateres.js';
import { U as UBLOC, gelule, largeurChamp, largeurTexte as largeurTexteBloc, silhouette, versPdf as blocVersPdf, versSvg as blocVersSvg } from '../../core/blocScratch.js';
import { ajusterAuRectangle } from '../../core/dominos.js';
import { encre, modePolycopie, polycopieEnCouleur, pourPdf } from '../ficheRendu.js';

// --- LE CHAT GÉOMÈTRE ----------------------------------------------------------
//
// Le programme à gauche, le quadrillage à droite. Un carreau vaut dix pas de
// chat : c'est ce qui permet de compter les côtés au lieu de les mesurer, et
// c'est pour cela que les figures n'avancent que par multiples de dix.
//
// Le chat de départ est un triangle posé sur le quadrillage, la pointe dans la
// direction où il regarde. Sans lui, « avancer de 40 » n'a pas d'origine.

function geoChat(item, slot) {
    const m = item.meta;
    const b = slot.boite;
    const ligneH = b.h * 0.1;
    const zone = b.h - ligneH;
    const progW = Math.max(42, Math.min(b.w * 0.42, 84));
    const cote = Math.max(20, Math.min(b.w - progW - 5, zone));
    return {
        m, b, cote, progW, ligneH,
        pas: cote / m.cases,
        x0: b.x + progW + 5, y0: b.y + (zone - cote) / 2,
        ligneY: b.y + zone
    };
}

/**
 * DE VRAIS BLOCS SCRATCH, pas des lignes de texte indentées.
 *
 * L'élève a le logiciel sous les yeux : des briques bleues « avancer de 50 pas »
 * empilées dans une brique jaune « répéter 4 fois » qui les enveloppe en C.
 * Recopier cela en texte indenté, c'est déjà une TRADUCTION — et la première
 * difficulté devient de retrouver le programme derrière le texte, alors que
 * l'exercice porte sur la figure.
 *
 * Les couleurs sont celles de Scratch 3 : Mouvement #4C97FF, Contrôle #FFAB19.
 * Elles restent lisibles en noir et blanc — le bleu tombe en gris moyen, le
 * jaune en gris clair —, et le texte est écrit en blanc sur le premier, en
 * noir sur le second, comme dans le logiciel.
 */
/**
 * LA VERSION NOIR ET BLANC DES BLOCS.
 *
 * Un bloc Scratch est un APLAT SATURÉ avec du texte blanc dessus. Passé à la
 * moulinette du mode « photocopie » — qui retranche la saturation, voir
 * `ui/ficheRendu.js` —, le bleu #4C97FF devient un gris très sombre : la brique
 * sort en noir et le texte blanc dessus est illisible. C'est la pire des
 * combinaisons sur une photocopieuse fatiguée, et c'est exactement ce qu'un
 * professeur imprime.
 *
 * En noir et blanc, on RENVERSE donc : fond blanc, contour noir, texte noir.
 * Ce sont alors les FORMES qui distinguent les familles — le chapeau arrondi de
 * l'événement, le C du contrôle —, comme dans un manuel imprimé.
 */
const BLOC_SCRATCH_NB = {
    mouvement: { fond: [255, 255, 255], bord: [40, 48, 62], encre: [26, 32, 44] },
    controle: { fond: [244, 246, 250], bord: [40, 48, 62], encre: [26, 32, 44] },
    evenement: { fond: [232, 236, 243], bord: [40, 48, 62], encre: [26, 32, 44] }
};

/** Les couleurs d'un genre de bloc, selon ce qui sortira de l'imprimante. */
const couleurBloc = (genre) => {
    const table = polycopieEnCouleur() ? BLOC_SCRATCH : BLOC_SCRATCH_NB;
    return table[genre] || table.mouvement;
};

const BLOC_SCRATCH = {
    mouvement: { fond: [76, 151, 255], bord: [60, 120, 210], encre: [255, 255, 255] },
    controle: { fond: [255, 171, 25], bord: [207, 139, 23], encre: [40, 30, 0] },
    // Le chapeau « quand ⚑ est cliqué » : c'est la famille Événements, un
    // jaune plus chaud que le Contrôle. Sans lui en tête, la pile de la feuille
    // n'est pas un programme Scratch — c'est une liste de briques.
    evenement: { fond: [255, 191, 0], bord: [207, 155, 0], encre: [40, 30, 0] }
};

/**
 * LA PILE DE BLOCS, EN UNITÉS D'ATELIER.
 *
 * Toute la forme vient de core/blocScratch.js — le même module que l'écran.
 * Ici on ne décide que de deux choses : COMBIEN de millimètres vaut une unité
 * d'atelier (`u`), et OÙ tombe chaque bloc de la pile. Le reste — tenon,
 * mortaise, coins, gélules — est commun aux trois rendus.
 *
 * Les blocs s'emboîtent, donc ils SE TOUCHENT : un bloc simple fait exactement
 * `U.ligne` de haut et le suivant commence là où il finit. C'est ce qui
 * manquait à l'ancienne pile, où un écart séparait deux briques censées être
 * accrochées l'une à l'autre.
 */
function geoBlocsChat(g) {
    // Le chapeau en tête, puis une ligne par bloc — sauf les barres de
    // fermeture, qui sont dessinées AVEC leur C et ne prennent pas de rang.
    const lignes = g.m.lignes;
    const hautTotale = UBLOC.chapeau + lignes.reduce(
        (n, l) => n + (l.fin ? UBLOC.basBoucle : UBLOC.ligne), 0);
    // UN « RÉPÉTER » EST AU MOINS AUSSI LARGE QUE CE QU'IL ENVELOPPE. Sans
    // cela, les briques bleues dépassaient du C par la droite : on voyait des
    // blocs posés SUR une brique jaune, pas dedans. On élargit donc de la fin
    // vers le début, pour qu'un C imbriqué soit déjà à sa taille définitive
    // quand celui qui le contient se mesure.
    const w = lignes.map(largeurBlocChat);
    for (let i = lignes.length - 1; i >= 0; i--) {
        if (lignes[i].fin || lignes[i].genre !== 'controle') continue;
        const j = lignes.findIndex((z, n) => n > i && z.fin && z.creux === lignes[i].creux);
        const fin = j < 0 ? lignes.length : j;
        for (let n = i + 1; n < fin; n++) {
            w[i] = Math.max(w[i], (lignes[n].creux - lignes[i].creux) * UBLOC.retrait + w[n]);
        }
    }
    // La pile tient dans la hauteur du quadrillage ET dans sa colonne : c'est
    // la plus contraignante des deux qui décide.
    const largeurUnites = Math.max(
        ...lignes.map((l, i) => l.creux * UBLOC.retrait + w[i]), 132);
    const u = Math.min(g.cote / hautTotale, g.progW / largeurUnites);
    // Les rangs, en unités : chaque bloc sait où il commence et ce qu'il ferme.
    const y = [];
    let curseur = UBLOC.chapeau;
    lignes.forEach((l) => { y.push(curseur); curseur += l.fin ? UBLOC.basBoucle : UBLOC.ligne; });
    return { lignes, u, y, w, hautTotale, largeurUnites, x: g.b.x, y0: g.y0 };
}

/** La largeur d'un bloc, en unités d'atelier : son texte et sa gélule. */
function largeurBlocChat(l) {
    if (l.fin) return 0;
    const morceaux = l.valeur === undefined
        ? largeurTexteBloc(l.texte)
        : largeurTexteBloc(l.avant) + largeurChamp(l.valeur) + largeurTexteBloc(l.apres) + 14;
    return Math.max(l.genre === 'controle' ? 132 : 108, UBLOC.margeG * 2 + morceaux);
}

/**
 * Où tombe chaque morceau d'un bloc : le texte d'avant, la gélule, le texte
 * d'après. En unités d'atelier, à partir du bord gauche du bloc.
 */
function morceauxBlocChat(l) {
    const out = [];
    let x = UBLOC.margeG;
    const poser = (t) => {
        if (!t) return;
        // LE DRAPEAU VERT N'EST PAS UNE LETTRE. Le caractère ⚑ n'existe pas
        // dans les polices d'un PDF : le bloc s'y écrivait « quand le drapeau
        // est cliqué » pendant que l'aperçu montrait l'icône — deux feuilles
        // différentes pour le même bloc. On le sort donc du texte, et chaque
        // rendu le DESSINE : un fanion, comme dans le logiciel.
        for (const bout of String(t).split('⚑')) {
            if (bout) {
                out.push({ texte: bout, x });
                x += largeurTexteBloc(bout) + 7;
            }
            out.push({ drapeau: true, x, w: 12 });
            x += 12 + 7;
        }
        out.pop();                        // un séparateur de trop, en fin de liste
        x -= 19;
    };
    if (l.valeur === undefined) { poser(l.texte); return { morceaux: out, fin: x }; }
    poser(l.avant.replace(/ $/, ''));
    const w = largeurChamp(l.valeur);
    out.push({ champ: String(l.valeur), x, w, h: UBLOC.champH });
    x += w + 7;
    poser(l.apres.replace(/^ /, ''));
    return { morceaux: out, fin: x };
}

/** La hauteur qu'enveloppe un « répéter », en unités : de sa bouche à sa barre. */
function boucheDe(bl, i) {
    const j = bl.lignes.findIndex((z, n) => n > i && z.fin && z.creux === bl.lignes[i].creux);
    const fin = j < 0 ? bl.hautTotale : bl.y[j];
    return Math.max(UBLOC.boucheVide, fin - bl.y[i] - UBLOC.ligne);
}

/** Un point du chat (en pas) vers le papier (en millimètres). */
/**
 * L'ORIGINE TOMBE SUR UNE INTERSECTION DU QUADRILLAGE.
 *
 * Rémy : « pour les figures de scratch pour le pdf, la figure que tu dessines
 * ne va pas tout à fait sur les lignes qui créent les carreaux. »
 *
 * Le tracé était centré sur `cote / 2`, le milieu géométrique du carré. Or les
 * lignes du quadrillage sont en `i × pas` : le milieu n'en est une que si le
 * nombre de carreaux est PAIR. Sur une grille impaire — onze carreaux, treize
 * carreaux — toute la figure se retrouvait décalée d'un demi-carreau, donc
 * AUCUN sommet ne tombait sur une intersection, et l'élève qui compte les
 * carreaux pour vérifier son tracé ne retrouvait jamais ses comptes.
 *
 * On arrondit donc l'origine à l'intersection la plus proche. Un carreau valant
 * dix pas (c'est la consigne de la feuille), tout déplacement multiple de dix
 * retombe alors exactement sur une ligne.
 */
function pointChat(g, p) {
    const centre = Math.round(g.m.cases / 2) * g.pas;
    return {
        x: g.x0 + centre + (p.x / 10) * g.pas,
        // L'axe du chat monte, celui du papier descend : on retourne.
        y: g.y0 + centre - (p.y / 10) * g.pas
    };
}

/** Les trois sommets du petit chat de départ, en millimètres. */
function trianguleChat(g) {
    const c = pointChat(g, g.m.depart);
    const rad = (g.m.depart.dir || 90) * Math.PI / 180;
    const r = g.pas * 0.42;
    const bout = { x: c.x + Math.sin(rad) * r, y: c.y - Math.cos(rad) * r };
    const cote = (s) => ({
        x: c.x + Math.sin(rad + s) * r * 0.72,
        y: c.y - Math.cos(rad + s) * r * 0.72
    });
    return [bout, cote(2.4), cote(-2.4)];
}

function chatPreviewHtml(item, slot, k, solution) {
    const g = geoChat(item, slot);
    const m = g.m;
    const T = (v) => (v * k).toFixed(2);
    // Le tracé est visible d'emblée quand c'est l'angle qu'on cherche : la
    // figure est alors une DONNÉE, pas la réponse.
    const montrer = solution || m.quoi === 'angle';

    let d = '';
    for (let i = 0; i <= m.cases; i++) {
        const p = i * g.pas;
        d += `<line x1="${T(g.x0)}" y1="${T(g.y0 + p)}" x2="${T(g.x0 + g.cote)}" y2="${T(g.y0 + p)}"
            stroke="#c9cfda" stroke-width="${T(0.18)}"/>
            <line x1="${T(g.x0 + p)}" y1="${T(g.y0)}" x2="${T(g.x0 + p)}" y2="${T(g.y0 + g.cote)}"
            stroke="#c9cfda" stroke-width="${T(0.18)}"/>`;
    }
    d += `<rect x="${T(g.x0)}" y="${T(g.y0)}" width="${T(g.cote)}" height="${T(g.cote)}"
        fill="none" stroke="#8a93a3" stroke-width="${T(0.34)}"/>`;

    if (montrer) {
        m.traces.forEach(trait => {
            if (trait.length < 2) return;
            const pts = trait.map(p => { const q = pointChat(g, p); return `${T(q.x)},${T(q.y)}`; });
            d += `<polyline points="${pts.join(' ')}" fill="none" stroke="#1a202c"
                stroke-width="${T(0.55)}" stroke-linejoin="round" stroke-linecap="round"/>`;
        });
    }
    const t = trianguleChat(g);
    d += `<polygon points="${t.map(p => `${T(p.x)},${T(p.y)}`).join(' ')}"
        fill="#e11d48" opacity="0.85"/>`;

    // LE PROGRAMME, EN BLOCS — les mêmes qu'à l'écran, tracés par le même
    // module. Le chapeau en tête, les briques emboîtées dessous, et le
    // « répéter » qui les enveloppe dans son C.
    const bl = geoBlocsChat(g);
    const mm = (v) => v * bl.u;                       // unités d'atelier → mm
    let textes = '';
    const poserContenu = (l, bx, by) => {
        const c = couleurBloc(l.genre);
        const { morceaux } = morceauxBlocChat(l);
        const milieu = l.genre === 'evenement'
            ? UBLOC.dome + (UBLOC.chapeau - UBLOC.dome) / 2
            : UBLOC.ligne / 2;
        morceaux.forEach((mo) => {
            if (mo.drapeau) {
                textes += `<div class="fx-ch-bloc fx-ch-drapeau" style="left:${(bx + mm(mo.x)) * k}px;
                    top:${(by + mm(milieu - UBLOC.ligne / 2)) * k}px; height:${mm(UBLOC.ligne) * k}px;
                    font-size:${mm(UBLOC.texte) * k}px">&#9873;</div>`;
                return;
            }
            if (mo.champ !== undefined) {
                d += `<path d="${blocVersSvg(gelule(mo.w, mo.h),
                    { x: (bx + mm(mo.x)) * k, y: (by + mm(milieu - mo.h / 2)) * k, u: mm(k) })}"
                    fill="#fff"/>`;
                textes += `<div class="fx-ch-champ" style="left:${(bx + mm(mo.x)) * k}px;
                    top:${(by + mm(milieu - mo.h / 2)) * k}px; width:${mm(mo.w) * k}px;
                    height:${mm(mo.h) * k}px;
                    font-size:${mm(UBLOC.texte) * k}px">${echapperSheet(mo.champ)}</div>`;
                return;
            }
            textes += `<div class="fx-ch-bloc" style="left:${(bx + mm(mo.x)) * k}px;
                top:${(by + mm(milieu - UBLOC.ligne / 2)) * k}px; height:${mm(UBLOC.ligne) * k}px;
                color:rgb(${c.encre.join(',')});
                font-size:${mm(UBLOC.texte) * k}px">${echapperSheet(mo.texte)}</div>`;
        });
    };
    const chapeau = { genre: 'evenement', texte: 'quand ⚑ est cliqué', creux: 0 };
    const pile = [{ l: chapeau, y: 0, forme: silhouette({ genre: 'chapeau', largeur: largeurBlocChat(chapeau) }) }];
    bl.lignes.forEach((l, i) => {
        if (l.fin) return;                 // la barre du bas est tracée avec son C
        pile.push({
            l, y: bl.y[i],
            forme: silhouette({
                genre: l.genre === 'controle' ? 'boucle' : 'simple',
                largeur: bl.w[i],
                bouche: l.genre === 'controle' ? boucheDe(bl, i) : undefined
            })
        });
    });
    pile.forEach(({ l, y: yu, forme }) => {
        const c = couleurBloc(l.genre);
        const bx = bl.x + mm(l.creux * UBLOC.retrait), by = bl.y0 + mm(yu);
        d += `<path d="${blocVersSvg(forme, { x: bx * k, y: by * k, u: mm(k) })}"
            fill="rgb(${c.fond.join(',')})" stroke="rgb(${c.bord.join(',')})"
            stroke-width="${T(0.15)}" stroke-linejoin="round"/>`;
        poserContenu(l, bx, by);
    });

    let html = `<svg class="fx-ch-svg" style="left:0; top:0; width:100%; height:100%">${d}</svg>${textes}`;

    const rep = m.quoi === 'angle'
        ? [`L'angle vaut`, solution ? `${m.angle}°` : '……… °']
        : ['La figure obtenue est', solution ? m.nom : '..................'];
    html += `<div class="fx-ch-ligne" style="left:${g.b.x * k}px; top:${g.ligneY * k}px;
        width:${g.b.w * k}px; height:${g.ligneH * k}px;
        font-size:${Math.min(g.ligneH * 0.42, 3.6) * k}px">
        <b>${rep[0]}</b><i>${echapperSheet(rep[1])}</i></div>`;
    return html;
}

function dessinerChatPdf(doc, item, slot, solution, champ) {
    const g = geoChat(item, slot);
    const m = g.m;
    const montrer = solution || m.quoi === 'angle';

    doc.setDrawColor(201, 207, 218);
    doc.setLineWidth(0.18);
    for (let i = 0; i <= m.cases; i++) {
        const p = i * g.pas;
        doc.line(g.x0, g.y0 + p, g.x0 + g.cote, g.y0 + p);
        doc.line(g.x0 + p, g.y0, g.x0 + p, g.y0 + g.cote);
    }
    doc.setDrawColor(138, 147, 163);
    doc.setLineWidth(0.34);
    doc.rect(g.x0, g.y0, g.cote, g.cote, 'S');

    if (montrer) {
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.55);
        m.traces.forEach(trait => {
            for (let i = 1; i < trait.length; i++) {
                const a = pointChat(g, trait[i - 1]), z = pointChat(g, trait[i]);
                doc.line(a.x, a.y, z.x, z.y);
            }
        });
    }
    const t = trianguleChat(g);
    doc.setFillColor(225, 29, 72);
    doc.triangle(t[0].x, t[0].y, t[1].x, t[1].y, t[2].x, t[2].y, 'F');

    // LE PROGRAMME, EN BLOCS — les mêmes qu'à l'écran, tracés par le même
    // module (core/blocScratch.js) : c'est tout l'intérêt.
    const bl = geoBlocsChat(g);
    const mm = (v) => v * bl.u;
    const chapeau = { genre: 'evenement', texte: 'quand ⚑ est cliqué', creux: 0 };
    const pile = [{ l: chapeau, y: 0, forme: silhouette({ genre: 'chapeau', largeur: largeurBlocChat(chapeau) }) }];
    bl.lignes.forEach((l, i) => {
        if (l.fin) return;               // la barre du bas est tracée avec son C
        pile.push({
            l, y: bl.y[i],
            forme: silhouette({
                genre: l.genre === 'controle' ? 'boucle' : 'simple',
                largeur: bl.w[i],
                bouche: l.genre === 'controle' ? boucheDe(bl, i) : undefined
            })
        });
    });
    pile.forEach(({ l, y: yu, forme }) => {
        const c = couleurBloc(l.genre);
        const bx = bl.x + mm(l.creux * UBLOC.retrait), by = bl.y0 + mm(yu);
        const t = blocVersPdf(forme, { x: bx, y: by, u: bl.u });
        doc.setFillColor(...c.fond);
        doc.setDrawColor(...c.bord);
        doc.setLineWidth(0.15);
        doc.lines(t.suite, t.x, t.y, [1, 1], 'FD', true);

        const { morceaux } = morceauxBlocChat(l);
        const milieu = l.genre === 'evenement'
            ? UBLOC.dome + (UBLOC.chapeau - UBLOC.dome) / 2
            : UBLOC.ligne / 2;
        doc.setFont('helvetica', 'bold');
        // 1 pt ≈ 0,3528 mm : le corps est donné en millimètres, comme le reste
        // du bloc, pour que l'aperçu et la feuille soient identiques.
        doc.setFontSize(mm(UBLOC.texte) / 0.3528);
        morceaux.forEach((mo) => {
            if (mo.drapeau) {
                // Le fanion : une hampe et un triangle vert, comme le bouton
                // « lancer » du logiciel.
                const fx = bx + mm(mo.x), fy = by + mm(milieu), t = mm(UBLOC.texte);
                doc.setDrawColor(60, 120, 60);
                doc.setLineWidth(t * 0.09);
                doc.line(fx, fy - t * 0.5, fx, fy + t * 0.45);
                doc.setFillColor(60, 160, 90);
                doc.triangle(fx, fy - t * 0.5, fx + t * 0.62, fy - t * 0.24,
                    fx, fy + t * 0.02, 'F');
                return;
            }
            if (mo.champ !== undefined) {
                // LA GÉLULE BLANCHE DU NOMBRE : c'est elle qui dit « ce nombre
                // se change », et c'est la première chose qu'on reconnaît d'un
                // bloc Scratch. Le PDF l'ignorait.
                const gx = bx + mm(mo.x), gy = by + mm(milieu - mo.h / 2);
                const gp = blocVersPdf(gelule(mo.w, mo.h), { x: gx, y: gy, u: bl.u });
                doc.setFillColor(255, 255, 255);
                doc.lines(gp.suite, gp.x, gp.y, [1, 1], 'F', true);
                doc.setTextColor(30, 41, 59);
                doc.text(pourPdf(mo.champ), gx + mm(mo.w) / 2, gy + mm(mo.h) * 0.7,
                    { align: 'center' });
                return;
            }
            doc.setTextColor(...c.encre);
            doc.text(pourPdf(mo.texte), bx + mm(mo.x), by + mm(milieu + UBLOC.texte * 0.36));
        });
    });

    const yl = g.ligneY + g.ligneH * 0.66;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(6.5, Math.min(g.ligneH * 1.2, 10)));
    // ON REDIT L'ENCRE : le dernier bloc du programme vient de la passer en
    // blanc, et la question s'imprimait en blanc sur blanc.
    doc.setTextColor(...ENCRE.texte);
    const etiquette = pourPdf(m.quoi === 'angle' ? 'L\'angle vaut' : 'La figure obtenue est');
    doc.text(etiquette, g.b.x, yl);
    const xr = g.b.x + doc.getTextWidth(etiquette) + 3;
    if (solution) {
        doc.text(pourPdf(m.quoi === 'angle' ? `${m.angle}°` : m.nom), xr, yl);
        return;
    }
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...ENCRE.gris);
    doc.text(m.quoi === 'angle' ? pourPdf('......... °') : '..................', xr, yl);
    if (champ) champ(xr, yl - g.ligneH * 0.55, g.b.x + g.b.w - xr, g.ligneH * 0.8);
}

// --- L'ORGANIGRAMME DES QUADRILATÈRES, SUR LE PAPIER --------------------------
//
// Rémy l'a demandé pour sa fiche : cinq cases de figures, treize flèches, et la
// liste des conditions à reporter. C'est la feuille qu'on colle dans le cahier
// de leçons — celle qu'on remplit une fois et qu'on relit toute l'année.
//
// LE PLAN VIENT DU NOYAU, pas d'ici : `POSITIONS`, `traceFleche` et
// `posEtiquette` sont les mêmes qu'à l'écran (voir core/quadrilateres.js). Un
// élève qui a la feuille sous les yeux et l'exercice sur la tablette doit
// reconnaître LA MÊME figure, au même endroit — sans quoi ce sont deux leçons.
//
// LA LISTE SE MET SOUS LE PLAN, sur deux colonnes. Neuf énoncés dont trois font
// deux lignes : en une colonne ils prennent la moitié de la page, en trois ils
// se coupent au milieu d'un mot.

/**
 * LA PLANCHE DE VIGNETTES, quand on l'a demandée — la page 3 de la fiche de Rémy.
 *
 * ELLE SE CALCULE À REBOURS DU PLAN, et c'est l'inverse de tout le reste de ce
 * fichier. Une vignette doit entrer DANS la case du plan — c'est là qu'on la
 * colle —, donc sa taille est celle des cases, donc elle dépend de la taille du
 * plan… qui dépend de la place que prend la planche. On essaie donc plusieurs
 * hauteurs de plan en descendant et l'on garde la plus grande où les treize
 * cartes tiennent dessous. Six essais suffisent : au-delà, on grignote des
 * dixièmes de millimètre qu'aucune photocopieuse ne rend.
 *
 * LES CARTES SE TOUCHENT. Rémy, à propos des dominos : « ce serait bien que les
 * dominos à découper soient collés car sinon c'est long à découper. » Treize
 * cartes séparées font cinquante-deux coups de ciseau ; collées, elles
 * partagent leurs traits et la planche se débite en huit coups droits.
 */
function planVignettes(b, m, RAPPORT) {
    const n = (m.vignettes || []).length;
    const TITRE = 4.2;
    let dernier = null;
    // ON PART DU PLUS GRAND PLAN POSSIBLE et l'on descend : les cartes ont la
    // taille des cases, donc un plan plus grand fait des cartes plus lisibles,
    // et c'est la seule chose qui compte ici. Le premier essai qui laisse la
    // place à la planche gagne.
    for (const part of [0.84, 0.80, 0.76, 0.72, 0.68, 0.64, 0.58, 0.52]) {
        const hUtile = b.h * part;
        const wUtile = Math.min(b.w, hUtile * RAPPORT);
        const h2 = wUtile / RAPPORT;
        const condW = wUtile * (COND_L_Q / PLAN_L_Q);
        const condH = h2 * (COND_H_Q / PLAN_H_Q);
        // DES RANGÉES ÉGALES PLUTÔT QU'UNE RANGÉE PLEINE ET UN RESTE. Neuf
        // cartes puis quatre laisse un décrochement en escalier au milieu de la
        // planche : on coupe droit dans le vide, et le dernier trait de ciseau
        // n'a plus rien à suivre. Sept et six se coupent d'un seul trait.
        const maxCols = Math.max(1, Math.floor(b.w / condW));
        const rangs = Math.ceil(n / maxCols);
        const cols = Math.ceil(n / rangs);
        const besoin = TITRE + rangs * condH;
        const dispo = b.h - h2 - 3;
        dernier = { hUtile: h2, wUtile, condW, condH, cols, rangs, besoin, TITRE };
        if (besoin <= dispo) return dernier;
    }
    return dernier;
}

/** Les treize cartes mesurées d'un coup, rangées par clé de flèche. */
function mesuresVignettes(m, planche) {
    const v = m.vignettes || [];
    const mesures = mesurerVignettes(v.map(x => x.texte), planche.condW, planche.condH);
    const out = {};
    v.forEach((x, i) => { out[x.cle] = mesures[i]; });
    return out;
}

/** Le plan de 100 × 140 du noyau, posé dans le bloc — et la place de la liste. */
function geoOrganigramme(item, slot) {
    const b = boiteDe(slot);
    const m = item.meta;
    const RAPPORT_PLAN = PLAN_L_Q / PLAN_H_Q;

    // La liste d'abord : c'est elle qui a une hauteur imposée par son texte.
    // Avec des vignettes, c'est la PLANCHE qui commande, et elle se calcule à
    // rebours du plan (voir `planVignettes`).
    const planche = m.vignettes ? planVignettes(b, m, RAPPORT_PLAN) : null;

    // LE PLAN GARDE LES PROPORTIONS DE CELUI DU NOYAU, et c'est la règle du
    // chapitre : un élève qui a la feuille sous les yeux et l'exercice sur la
    // tablette doit reconnaître LA MÊME figure.
    //
    // IL EST EN PORTRAIT depuis qu'on a repris la fiche de Rémy : huit rangées
    // qui alternent figures et conditions, du quadrilatère tout en haut au
    // carré tout en bas. C'est la seule forme où les treize conditions ont
    // chacune leur boîte — et c'est celle qu'il a dessinée à la main.
    // AVEC UNE PLANCHE, C'EST ELLE QUI A FIXÉ LA TAILLE DU PLAN — on la reprend
    // telle quelle plutôt que de la recalculer. Recalculer donnait un plan un
    // cheveu plus grand que celui sur lequel la planche s'était accordée, donc
    // des cases un cheveu plus grandes que les cartes : invisible à l'œil, et
    // faux là où c'est gênant — une carte doit entrer dans sa case, exactement.
    // LE PLAN PREND TOUTE LA LARGEUR DE LA FEUILLE, et la liste ce qui reste.
    //
    // Rémy : « je suis un peu déçu de l'organigramme. » Il tenait dans un tiers
    // de la page — cinquante millimètres de blanc de chaque côté — parce que la
    // largeur se déduisait de la hauteur laissée par la liste, elle-même
    // dimensionnée en premier. On prend le problème dans l'autre sens : le plan
    // s'étale sur la largeur (le format du noyau lui donne sa hauteur), et la
    // liste occupe le bas de la feuille.
    const RAPPORT = PLAN_L_Q / PLAN_H_Q;        // largeur / hauteur
    // LE PLAN PREND TOUTE LA HAUTEUR QUE LA LISTE LUI LAISSE, ET IL S'ÉTIRE.
    //
    // Rémy : « rends l'organigramme plus haut, car les flèches sont écrasées. »
    // Mesuré sur la feuille précédente : le plan tenait 135 mm de haut — la
    // largeur de la page divisée par les proportions du noyau — et il restait
    // CINQUANTE MILLIMÈTRES DE BLANC sous la légende. Les flèches, elles, ne
    // reliaient plus rien : entre deux rangées, le segment vertical faisait
    // moins de quatre millimètres, et les cases se touchaient presque.
    //
    // On garde donc la largeur pleine, et l'on prend en hauteur ce que la liste
    // n'utilise pas. Le plan cesse alors d'avoir les proportions exactes du
    // noyau — c'est un ÉTIREMENT, pas un agrandissement — et c'est acceptable
    // ici parce que rien de ce qui s'étire ne porte de sens géométrique : les
    // figures, elles, restent carrées (voir `fw`/`fh`, plus bas), et ce sont les
    // seules formes que l'élève lit comme des formes. Ce qui s'allonge, ce sont
    // les intervalles entre les rangées — c'est-à-dire les flèches — et les
    // cases de condition, qu'on remplit à la main : les deux y gagnent.
    //
    // L'étirement est BORNÉ : au-delà de la moitié, l'organigramme devient une
    // échelle, les cases s'éloignent et l'on perd la vue d'ensemble qui fait
    // tout l'intérêt de la carte.
    const ETIRE_MAX = 1.5;
    const besoinListe = Math.ceil((m.liste ? m.liste.length : 9) / 2) * PAS_LISTE_Q + 12;
    const wVoulue = planche ? planche.wUtile : b.w;
    const hNaturelle = wVoulue / RAPPORT;
    const wUtile = wVoulue;
    const hUtile = planche ? planche.hUtile
        : Math.max(hNaturelle, Math.min(b.h - besoinListe - 4, hNaturelle * ETIRE_MAX));
    const hListe = planche ? planche.besoin : Math.max(16, b.h - hUtile - 4);
    const x0 = b.x + (b.w - wUtile) / 2;
    const y0 = b.y;

    // LA CASE A LA MÊME TAILLE QU'À L'ÉCRAN — les deux constantes viennent du
    // noyau, comme le tracé des flèches et la place des étiquettes.
    const caseW = wUtile * (CASE_L_Q / PLAN_L_Q), caseH = hUtile * (CASE_H_Q / PLAN_H_Q);
    const condW = wUtile * (COND_L_Q / PLAN_L_Q), condH = hUtile * (COND_H_Q / PLAN_H_Q);

    // LE PLAN SE RÉTRÉCIT DE LA MOITIÉ D'UNE CASE, DE TOUS LES CÔTÉS. Une case
    // est CENTRÉE sur sa position, et le quadrilatère est à y = 4, le carré à
    // y = 97 : posés tels quels, ils débordaient du plan par le haut et par le
    // bas. Mesuré sur le premier PDF : la case « Carré » descendait sur la
    // liste des conditions et en couvrait la première ligne.
    // Le repère du noyau va de 0 à PLAN_L en x et de 0 à PLAN_H en y, et les
    // boîtes y tiennent déjà tout entières : il n'y a plus à rétrécir d'une
    // demi-case comme du temps où les positions étaient des CENTRES posés sur
    // les bords du plan.
    const px = (v) => x0 + (v / PLAN_L_Q) * wUtile;
    const py = (v) => y0 + (v / PLAN_H_Q) * hUtile;
    const P = (p) => ({ x: px(p.x), y: py(p.y) });
    return {
        b, m, x0, y0, wUtile, hUtile,
        P, caseW, caseH, condW, condH,
        // LA PETITE CASE OÙ S'ÉCRIT LA LETTRE — et elle est petite pour de bon.
        // Mesuré à 5,2 % de la largeur du plan : les trois cases du chemin
        // quadrilatère → parallélogramme, empilées dans un intervalle de dix
        // unités, se touchaient bord à bord et l'on ne savait plus laquelle
        // appartenait à quelle flèche. À 3,5 % elles font neuf millimètres —
        // largement de quoi écrire une lettre à la main — et il reste trois
        // unités de blanc entre deux.
        lettreW: Math.max(4.5, wUtile * 0.035),
        listeY: y0 + hUtile + 3,
        listeH: hListe,
        // LES MESURES, CALCULÉES UNE FOIS ET RANGÉES PAR CLÉ DE FLÈCHE. La même
        // carte est dessinée à deux endroits — sur la planche, et dans sa case
        // sur la feuille de solutions — et elle doit y être écrite à
        // l'identique : c'est ce qui permet de vérifier qu'on l'a bien collée
        // au bon endroit.
        mesures: planche ? mesuresVignettes(m, planche) : null,
        // LA PLANCHE, avec l'origine de sa grille : centrée sous le plan, parce
        // qu'un bloc de cartes collé au bord gauche se lit comme un débord.
        planche: planche && {
            ...planche,
            x: b.x + Math.max(0, (b.w - planche.cols * planche.condW) / 2),
            y: y0 + hUtile + 3 + planche.TITRE
        }
    };
}

// UN TRAIT PAR CONDITION, comme à l'écran depuis que l'organigramme est
// couché. En colonne il n'y avait la place que d'un trait par CHEMIN, avec les
// conditions échelonnées dessus ; l'élève ne pouvait pas compter les portes du
// regard. Ici les treize se dessinent, et le nombre de traits qui arrivent sur
// une case dit à lui seul de combien de façons on y accède.
const cheminsUniques = () => FLECHES_Q;

/**
 * LES TROIS TEINTES DE LA FICHE DE RÉMY, claires pour qu'on écrive dessus.
 *
 * Bleu ce qui parle des CÔTÉS, rouge ce qui parle des DIAGONALES, mauve les
 * deux raccourcis qui descendent directement du quadrilatère. Ce n'est pas de
 * la décoration : l'élève qui cherche ce qui manque au rectangle pour être un
 * carré sait qu'il y a une réponse bleue et une rouge, et que les deux disent
 * la même chose autrement.
 *
 * ELLES SONT PÂLES À DESSEIN. Sur la fiche de Rémy le fond est saturé et le
 * texte blanc ; photocopié en noir et blanc, cela donne trois gris qu'on ne
 * distingue plus, et la case ne se remplit pas au crayon. Ici la teinte est
 * assez claire pour qu'on écrive dedans et assez marquée pour qu'on la lise en
 * couleur.
 */
/**
 * TROIS TEINTES QUI SE DISTINGUENT AUSSI EN NOIR ET BLANC.
 *
 * Rémy imprime « noir et blanc — la photocopieuse ». Les trois teintes avaient
 * la même clarté : passées au gris, elles tombaient toutes sur le même
 * 88 % — treize cases d'un gris uniforme, et la couleur qui dit la famille ne
 * disait plus rien. On les échelonne donc en CLARTÉ autant qu'en teinte : le
 * bleu des côtés très clair, le rouge des diagonales à mi-chemin, le mauve des
 * raccourcis plus soutenu. En couleur on lit la teinte, en gris on lit la
 * clarté, et les deux disent la même chose.
 */
/**
 * LA COULEUR D'UNE FAMILLE DÉPEND DE CE QU'ON MET DANS L'IMPRIMANTE.
 *
 * En COULEUR, ce sont les teintes de la fiche de Rémy, relevées dans son PDF :
 * fond saturé et texte blanc pour les diagonales et les raccourcis, bleu pâle
 * et texte noir pour les côtés. C'est ce qui les sépare à trois mètres.
 *
 * EN NOIR ET BLANC, NON — et c'était le piège. Le rouge vif de sa fiche ne
 * devient pas un gris moyen : la conversion de la feuille tient compte de la
 * SATURATION autant que de la clarté (voir `encre` dans ui/ficheRendu.js), et
 * un rouge pur tombe sur un gris presque noir. Mesuré sur la première épreuve :
 * six cases sur treize sortaient en aplat noir. On donne donc au noir et blanc
 * trois gris CHOISIS — clair, moyen, foncé, texte noir sur les trois —, ce qui
 * dit la même chose sans vider la cartouche du photocopieur de la salle des
 * profs.
 */
// ET LES TROIS GRIS S'ÉCLAIRCISSENT AUSSI. Même raison que les couleurs : la
// case n'a plus de carré blanc au milieu, c'est ELLE qu'on remplit au crayon.
// Un gris à 61 % — celui des raccourcis — avale une écriture de crayon à
// papier ; à 78 %, elle se lit encore, et les trois marches restent nettes.
const GRIS_COND = {
    cotes: { fond: '#f1f1f1', encre: '#111111' },
    diagonales: { fond: '#dedede', encre: '#111111' },
    raccourci: { fond: '#c6c6c6', encre: '#111111' }
};

const paletteCond = () => (['couleur', 'intense'].includes(modePolycopie())
    ? COULEURS_Q : GRIS_COND);

const teinteCond = (f) => (paletteCond()[f] || paletteCond().cotes).fond;

const RVB_COND = new Proxy({}, { get: (_, f) => rvbHex(teinteCond(String(f))) });

const TEINTE_COND = new Proxy({}, { get: (_, f) => teinteCond(String(f)) });

/** L'encre du texte d'une carte : elle suit son fond. */
const ENCRE_COND = (f) => (paletteCond()[f] || paletteCond().cotes).encre;

/**
 * LA TAILLE DU NOM D'UNE FIGURE : celle qui tient dans sa case.
 *
 * « Parallélogramme » fait quinze lettres. Écrit à un sixième de la hauteur de
 * la case, il en débordait des deux côtés et s'asseyait sur le trait du bas —
 * ce qui se voyait d'autant plus que la case venait de grandir. La largeur
 * commande : le nom le plus long décide, et les cinq cases gardent la même
 * taille de police pour que l'une ne paraisse pas plus importante que l'autre.
 */
/**
 * LA CLEF DES COULEURS, dans l'ordre où on la lit.
 */
const LEGENDE_COND = [
    { famille: 'cotes', mot: 'les côtés' },
    { famille: 'diagonales', mot: 'les diagonales' },
    { famille: 'raccourci', mot: 'les raccourcis de 6ᵉ' }
];

/**
 * L'ÉCART ENTRE DEUX LIGNES DE LA LISTE, BORNÉ.
 *
 * La liste occupe le bas de la feuille, et depuis que le plan s'étale ce bas
 * est large : réparties dessus, cinq lignes se retrouvaient à dix-sept
 * millimètres l'une de l'autre — une liste de neuf conditions qui ressemblait
 * à un sommaire. Neuf millimètres suffisent pour deux lignes de texte, et le
 * blanc qui reste est du blanc, pas de l'espacement.
 */
/**
 * L'INTERLIGNE DE LA LISTE DES CONDITIONS.
 *
 * Neuf millimètres pour une phrase écrite en trois : Rémy, la feuille en main,
 * « essaie de ne pas laisser d'espace interligne entre les phrases et fais
 * l'organigramme plus haut ». Les deux vont ensemble — ce que la liste rend,
 * le plan le prend, et ce sont les flèches et les cases à remplir qui
 * s'allongent. Aucune condition ne se coupe en deux lignes : la plus longue —
 * « Qui a ses diagonales se croisant en leur milieu » — fait 69 mm dans une
 * colonne qui en offre 86.
 */
const PAS_LISTE_Q = 6.2;

const pasListe = (g, lignes) => Math.min(g.listeH / lignes, PAS_LISTE_Q);

function policeNomFigure(caseW, hBande) {
    const plusLong = Math.max(...FAMILLES_Q.map(f => f.nom.length));
    // 0,52 cadratin par lettre : c'est la largeur moyenne d'une capitale et
    // d'une bas-de-casse en Helvetica gras, mesurée sur les cinq noms.
    // La hauteur disponible est celle du BANDEAU, dont le nom occupe les deux
    // tiers : calculée sur la case entière, elle donnait un corps d'un
    // millimètre — un nom qu'il fallait deviner.
    return Math.min(hBande * 0.62, (caseW * 0.88) / (plusLong * 0.52));
}

/**
 * LES TROIS POINTS D'UNE POINTE DE FLÈCHE, en millimètres sur la feuille.
 *
 * Rémy : « celui que je t'ai donné était plus joli. » Sa fiche est tracée à la
 * flèche ; la nôtre l'était au trait. Un organigramme sans pointes ne dit plus
 * dans quel sens il se lit — or c'est précisément ce qu'il enseigne : on
 * DESCEND du général au particulier, et chaque flèche ajoute une condition.
 *
 * La pointe se pose au bout du trait et regarde dans le sens du dernier
 * segment (voir `pointeDe` dans le noyau). Elle est calculée ici en
 * millimètres pour que l'aperçu et le PDF la dessinent identique.
 */
function pointeMm(trait, g, taille) {
    const q = pointeDeQ(trait);
    if (!q) return null;
    const bout = g.P({ x: q.x, y: q.y });
    // Le vecteur du plan vers la feuille : les deux axes n'ont pas la même
    // échelle depuis que le plan s'étale, et une pointe calculée sur l'un
    // sortirait de travers sur l'autre.
    const kx = g.wUtile / PLAN_L_Q, ky = g.hUtile / PLAN_H_Q;
    const vx = q.ux * kx, vy = q.uy * ky;
    const n = Math.hypot(vx, vy) || 1;
    const ux = vx / n, uy = vy / n;
    const base = { x: bout.x - ux * taille, y: bout.y - uy * taille };
    const px = -uy * taille * 0.42, py = ux * taille * 0.42;
    return [bout, { x: base.x + px, y: base.y + py }, { x: base.x - px, y: base.y - py }];
}

function organigrammePreviewHtml(item, slot, k, solution) {
    const g = geoOrganigramme(item, slot);
    const T = (v) => (v * k).toFixed(2);
    let out = '';

    // DEUX TRAITS PAR CONDITION : ce qui y entre, ce qui en sort. Sur la fiche
    // de Rémy, la condition est une CASE sur le chemin — pas une étiquette
    // collée sur une flèche —, et c'est ce qui permet de la découper.
    const tailleP = Math.max(1.6, g.wUtile * 0.011);
    cheminsUniques().forEach(f => {
        const t = traitsQ(f);
        [t.entrant, t.sortant].forEach(seg => {
            // LES VIRAGES SONT ARRONDIS — Rémy : « j'aimerais des flèches
            // arrondies ». L'écran l'était depuis qu'il a dit « c'est pas beau
            // une flèche en escaliers » ; la feuille traçait encore ses angles
            // droits. Le rayon vient du noyau, pour que les deux supports
            // dessinent la même carte.
            const pts = coinsArrondisQ(seg).map(q => g.P(q))
                .map(q => `${T(q.x)},${T(q.y)}`).join(' ');
            out += `<polyline points="${pts}" fill="none" stroke="#5a6274"
                stroke-width="${(0.45 * k).toFixed(2)}" stroke-linejoin="round"/>`;
            const tri = pointeMm(seg, g, tailleP);
            if (tri) {
                out += `<path d="M${T(tri[0].x)} ${T(tri[0].y)} L${T(tri[1].x)} ${T(tri[1].y)}
                    L${T(tri[2].x)} ${T(tri[2].y)} Z" fill="#5a6274"/>`;
            }
        });
    });

    FAMILLES_Q.forEach(fam => {
        const c = g.P(POSITIONS_Q[fam.id]);
        const x = c.x - g.caseW / 2, y = c.y - g.caseH / 2;
        // LA CASE D'UNE FIGURE, COMME CHEZ RÉMY : le dessin en haut, et SOUS
        // lui un bandeau d'une autre couleur qui porte le nom. On lit la figure
        // d'abord, son nom ensuite — dans l'ordre du raisonnement — et le
        // bandeau reste vide quand c'est à l'élève de la nommer.
        const hb = g.caseH * BANDE_NOM_Q, hd = g.caseH - hb;
        out += `<rect x="${T(x)}" y="${T(y)}" width="${T(g.caseW)}" height="${T(g.caseH)}"
            rx="${T(1.4)}" fill="#ffffff" stroke="#1a202c" stroke-width="${(0.35 * k).toFixed(2)}"/>`;
        out += `<path d="M${T(x)} ${T(y + hd)} h${T(g.caseW)} v${T(hb - 1.4)}
            a${T(1.4)} ${T(1.4)} 0 0 1 ${T(-1.4)} ${T(1.4)} h${T(-(g.caseW - 2.8))}
            a${T(1.4)} ${T(1.4)} 0 0 1 ${T(-1.4)} ${T(-1.4)} Z"
            fill="${BANDE_Q}" stroke="#1a202c" stroke-width="${(0.3 * k).toFixed(2)}"/>`;
        // LA FIGURE RESTE CARRÉE. La case est plus large que haute depuis que le
        // plan s'est étalé ; une figure calculée en pourcentages de la case en
        // serait sortie aplatie — un carré qui n'est plus carré, sur la feuille
        // qui enseigne les quadrilatères.
        // ET ELLE EST PLUS GRANDE. Rémy : « fais les figures plus grandes dans
        // les cadres du poly ». À la moitié de la case, un carré de dix
        // millimètres portait un codage illisible ; il en fait dix-huit.
        // PUIS ENCORE PLUS GRANDE : « tu peux encore faire les figures un peu
        // plus grand ». La case est plus large que haute, et c'est la hauteur
        // qui bridait — la largeur, elle, restait en réserve. Le codage d'un
        // losange, quatre marques et deux arcs, se lit d'autant mieux qu'il est
        // grand : on passe de dix-huit millimètres à vingt-deux.
        const fw = Math.min(g.caseW * 0.86, hd * 1.06), fh = fw;
        const fx = c.x - fw / 2, fy = y + (hd - fh) / 2;
        const F = (pt) => ({ x: fx + (pt.x / 100) * fw, y: fy + (pt.y / 100) * fh });
        const d = fam.figure.map((pt, i) =>
            `${i ? 'L' : 'M'}${T(fx + (pt[0] / 100) * fw)} ${T(fy + (pt[1] / 100) * fh)}`).join(' ') + ' Z';
        out += `<path d="${d}" fill="${FIGURE_Q}" stroke="#1a202c" stroke-width="${(0.4 * k).toFixed(2)}"/>`;
        // LE CODAGE DES DIAGONALES — voir `codageDiagonales` dans le noyau.
        const cod = codageDiagQ(fam.figure, fam.id);
        if (cod) {
            const ep = (0.28 * k).toFixed(2);
            cod.diagonales.forEach(([a, b]) => {
                const p1 = F(a), p2 = F(b);
                out += `<line x1="${T(p1.x)}" y1="${T(p1.y)}" x2="${T(p2.x)}" y2="${T(p2.y)}"
                    stroke="#1a202c" stroke-width="${ep}" stroke-dasharray="${T(1.1)} ${T(0.9)}"/>`;
            });
            cod.marques.forEach(([a, b]) => {
                const p1 = F(a), p2 = F(b);
                out += `<line x1="${T(p1.x)}" y1="${T(p1.y)}" x2="${T(p2.x)}" y2="${T(p2.y)}"
                    stroke="#1a202c" stroke-width="${(0.34 * k).toFixed(2)}" stroke-linecap="round"/>`;
            });
            if (cod.droit) {
                const q = cod.droit.map(F);
                out += `<polyline points="${q.map(p => `${T(p.x)},${T(p.y)}`).join(' ')}"
                    fill="none" stroke="#1a202c" stroke-width="${ep}"/>`;
            }
        }
        const nom = (g.m.avecNoms || solution) ? fam.nom : '';
        const corpsNom = policeNomFigure(g.caseW, hb);
        out += `<text x="${T(c.x)}" y="${T(y + hd + hb / 2)}" text-anchor="middle"
            dominant-baseline="central"
            font-size="${T(corpsNom)}" font-weight="700" fill="#1a202c"
            font-family="Helvetica, Arial, sans-serif">${nom}</text>`;
    });

    FLECHES_Q.forEach(f => {
        const e = g.P(posEtiquetteQ(f));
        const w = g.condW, h = g.condH;
        // LA COULEUR DIT LA FAMILLE — l'idée de Rémy, reprise telle quelle :
        // bleu les côtés, rouge les diagonales, mauve les deux raccourcis.
        //
        // SAUF QUAND LA VIGNETTE LA PORTE. En mode découpage, c'est la CARTE
        // qui est teintée ; teinter aussi la case du plan donnerait la réponse
        // — il suffirait d'assortir les couleurs sans lire une seule phrase.
        const teinte = g.planche ? '#ffffff' : (TEINTE_COND[f.famille] || '#ffffff');
        out += `<rect x="${T(e.x - w / 2)}" y="${T(e.y - h / 2)}" width="${T(w)}" height="${T(h)}"
            rx="${T(1.6)}" fill="${teinte}" stroke="#1a202c" stroke-width="${(0.3 * k).toFixed(2)}"/>`;
        if (g.planche) {
            if (solution) {
                dessinerVignetteSvg(g.mesures[cleFlecheQ(f)], f.famille,
                    e.x - w / 2, e.y - h / 2, w, h, k, (html) => { out += html; });
            }
            return;
        }
        // ON ÉCRIT DANS LA CASE, PAS DANS UN CARRÉ DEDANS.
        //
        // Rémy : « ne mets pas les carrés d'écriture dans les propriétés, car
        // l'élève écrira dans les cases qui ont une couleur pastel. » Il y avait
        // un petit carré blanc au milieu de chaque case teintée, pour dire « la
        // lettre va ici ». Deux cadres emboîtés pour une seule réponse : la case
        // pastel suffit, elle est faite pour cela, et depuis que le plan s'étire
        // elle est deux fois plus haute qu'avant. Le carré, lui, contraignait
        // l'écriture à neuf millimètres au milieu d'un rectangle de trente.
        if (solution) {
            out += `<text x="${T(e.x)}" y="${T(e.y)}" text-anchor="middle"
                dominant-baseline="central" font-size="${T(Math.min(h * 0.62, 7))}" font-weight="700"
                fill="${ENCRE_COND(f.famille)}" font-family="Helvetica, Arial, sans-serif"
                >${g.m.parCle[cleFlecheQ(f)]}</text>`;
        }
    });

    if (g.planche) {
        // LA PLANCHE : on ne la répète pas sur la feuille de solutions. Le
        // corrigé montre le plan REMPLI ; treize cartes redessinées dessous ne
        // servent qu'à faire une deuxième page à photocopier par erreur.
        if (!solution) out += plancheVignettesSvg(g, k);
        return `<svg style="position:absolute; left:0; top:0; width:100%; height:100%;
            overflow:visible; pointer-events:none">${out}</svg>`;
    }

    // La liste, sur deux colonnes — et en entier, comme au PDF.
    const colW = g.b.w / 2;
    const lignes = Math.ceil(g.m.liste.length / 2);
    const pas = pasListe(g, lignes);
    g.m.liste.forEach((l, i) => {
        const col = Math.floor(i / lignes), rang = i % lignes;
        const x = g.b.x + col * colW;
        const y = g.listeY + rang * pas + 3;
        out += `<text x="${T(x)}" y="${T(y)}" font-size="${T(3)}" font-weight="700"
            fill="#2d3748" font-family="Helvetica, Arial, sans-serif">${l.lettre}.</text>`;
        couperEnLignes(l.texte, colW - 10, 3, (t, taille) => t.length * taille * 0.5)
            .forEach((t, j) => {
                out += `<text x="${T(x + 5.5)}" y="${T(y + j * 3.6)}" font-size="${T(3)}"
                    fill="#2d3748" font-family="Helvetica, Arial, sans-serif">${echapperXml(t)}</text>`;
            });
    });

    // LA CLEF DES COULEURS. C'est l'idée de Rémy — bleu les côtés, rouge les
    // diagonales, mauve les deux raccourcis de sixième — et elle ne servait à
    // rien tant que la feuille ne disait pas ce que les teintes veulent dire.
    let lx = g.b.x;
    const ly = g.listeY + lignes * pas + 4;
    LEGENDE_COND.forEach(({ famille, mot }) => {
        out += `<rect x="${T(lx)}" y="${T(ly - 2.4)}" width="${T(3.4)}" height="${T(3.4)}"
            rx="${T(0.6)}" fill="${TEINTE_COND[famille]}" stroke="#5a6274"
            stroke-width="${(0.25 * k).toFixed(2)}"/>`;
        out += `<text x="${T(lx + 4.6)}" y="${T(ly)}" font-size="${T(2.9)}" fill="#5a6274"
            font-family="Helvetica, Arial, sans-serif">${echapperXml(mot)}</text>`;
        lx += 6 + mot.length * 1.42;
    });

    return `<svg style="position:absolute; left:0; top:0; width:100%; height:100%;
        overflow:visible; pointer-events:none">${out}</svg>`;
}

/**
 * UNE VIGNETTE, EN SVG — teinte, cadre, et son texte replié.
 *
 * Le repli vient du noyau (`ajusterAuRectangle`), pas du navigateur : c'est ce
 * qui fait que l'aperçu coupe la phrase aux MÊMES endroits que le PDF. Un
 * aperçu qui replie autrement affiche trois lignes là où la feuille en aura
 * quatre, et cesse de dire la vérité sur ce qu'on va imprimer.
 */
/**
 * TOUTES LES CARTES À LA MÊME TAILLE — parce qu'une planche panachée se lit mal.
 *
 * Chaque carte prise à part accepterait sa plus grande police : « 4 côtés
 * égaux » en gros, « diagonales perpendiculaires » en tout petit. Le résultat
 * est une planche où la taille du texte semble vouloir dire quelque chose
 * — plus gros, plus important — alors qu'elle ne dit que la longueur du mot.
 * On prend donc la plus petite des tailles, et on la donne à toutes.
 *
 * AVEC UN PLANCHER, ET UNE EXCEPTION. Un seul mot très long — ici
 * « perpendiculaires » — tire toute la planche vers le bas : il ne se coupe
 * pas, il doit tenir sur une ligne, et il impose sa taille aux douze autres.
 * On refuse de descendre en dessous du plancher pour lui : les douze restent
 * lisibles, et lui seul s'écrit un cran plus petit. La différence ne se
 * remarque pas ; la planche entière écrite en corps 5, si.
 */
const PLANCHER_VIGNETTE = 2.4;   // mm d'œil — en dessous, on ne lit plus de loin

function mesurerVignettes(textes, w, h) {
    const util = { w: w - 1.6, h: h - 1.6 };
    const seules = textes.map(t => ajusterAuRectangle(t, util.w, util.h, { max: 4, min: 1.5 }));
    const commune = Math.max(PLANCHER_VIGNETTE, Math.min(...seules.map(m => m.taille)));
    return textes.map((t, i) => (seules[i].taille >= commune
        ? ajusterAuRectangle(t, util.w, util.h, { max: commune, min: commune })
        : seules[i]));
}

/**
 * UNE VIGNETTE, AU PDF — le pendant exact de `dessinerVignetteSvg`.
 *
 * LA TAILLE DE POLICE PASSE DES MILLIMÈTRES AUX POINTS. `ajusterAuRectangle`
 * raisonne dans l'unité qu'on lui donne — ici le millimètre, comme toute cette
 * feuille —, et jsPDF veut des points typographiques. Un point vaut 0,352 78 mm,
 * d'où le facteur. Sans lui, une carte calculée pour 4 mm d'œil recevait une
 * police de 4 points, soit un tiers de la taille voulue : le texte tenait, et
 * ne se lisait plus.
 */
function dessinerVignettePdf(doc, mesure, famille, x, y, w, h) {
    const { taille, lignes } = mesure;
    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.3);
    doc.setFillColor(...(RVB_COND[famille] || [255, 255, 255]));
    doc.roundedRect(x, y, w, h, 0.8, 0.8, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(taille / 0.352778);
    doc.setTextColor(...rvbHex(ENCRE_COND(famille)));
    const total = lignes.length * taille * 1.16;
    lignes.forEach((ligne, i) => {
        doc.text(pourPdf(ligne), x + w / 2, y + h / 2 - total / 2 + (i + 0.5) * taille * 1.16,
            { align: 'center', baseline: 'middle' });
    });
}

/** Les treize cartes, collées bord à bord, sous leur intertitre. */
function dessinerPlancheVignettes(doc, g) {
    const p = g.planche;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...ENCRE.texte);
    doc.text(pourPdf('À découper et à coller dans les cases'), g.b.x, g.listeY + 2.6);
    (g.m.vignettes || []).forEach((v, i) => {
        dessinerVignettePdf(doc, g.mesures[v.cle], v.famille,
            p.x + (i % p.cols) * p.condW,
            p.y + Math.floor(i / p.cols) * p.condH,
            p.condW, p.condH);
    });
}

const echapperXml = (t) => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function dessinerVignetteSvg(mesure, famille, x, y, w, h, k, ecrire) {
    const T = (v) => (v * k).toFixed(2);
    const { taille, lignes } = mesure;
    ecrire(`<rect x="${T(x)}" y="${T(y)}" width="${T(w)}" height="${T(h)}" rx="${T(0.8)}"
        fill="${TEINTE_COND[famille] || '#ffffff'}" stroke="#1a202c"
        stroke-width="${(0.3 * k).toFixed(2)}"/>`);
    const encre = ENCRE_COND(famille);
    const total = lignes.length * taille * 1.16;
    lignes.forEach((ligne, i) => {
        const yy = y + h / 2 - total / 2 + (i + 0.5) * taille * 1.16;
        ecrire(`<text x="${T(x + w / 2)}" y="${T(yy)}" text-anchor="middle"
            dominant-baseline="central" font-size="${T(taille)}" fill="${encre}"
            font-family="Helvetica, Arial, sans-serif">${echapperXml(ligne)}</text>`);
    });
}

/** Les treize cartes, collées bord à bord, sous leur intertitre. */
function plancheVignettesSvg(g, k) {
    const p = g.planche;
    const T = (v) => (v * k).toFixed(2);
    let out = `<text x="${T(g.b.x)}" y="${T(g.listeY + 2.6)}" font-size="${T(2.9)}"
        font-weight="700" fill="#2d3748" font-family="Helvetica, Arial, sans-serif"
        >À découper et à coller dans les cases</text>`;
    (g.m.vignettes || []).forEach((v, i) => {
        const x = p.x + (i % p.cols) * p.condW;
        const y = p.y + Math.floor(i / p.cols) * p.condH;
        dessinerVignetteSvg(g.mesures[v.cle], v.famille, x, y, p.condW, p.condH, k,
            (html) => { out += html; });
    });
    return out;
}

function dessinerOrganigrammePdf(doc, item, slot, solution) {
    const g = geoOrganigramme(item, slot);

    const tailleP = Math.max(1.6, g.wUtile * 0.011);
    doc.setDrawColor(90, 98, 116);
    doc.setFillColor(90, 98, 116);
    doc.setLineWidth(0.45);
    doc.setLineJoin('round');
    doc.setLineCap('round');
    cheminsUniques().forEach(f => {
        const t = traitsQ(f);
        [t.entrant, t.sortant].forEach(seg => {
            // Les mêmes virages arrondis qu'à l'aperçu et qu'à l'écran : le
            // noyau rend la ligne déjà découpée, les deux rendus n'ont plus qu'à
            // la projeter. Une courbe échantillonnée à huit segments s'écarte
            // d'un dixième de millimètre de la vraie — invisible au trait de
            // 0,45 mm dont elle est tracée.
            const pts = coinsArrondisQ(seg).map(q => g.P(q));
            for (let i = 1; i < pts.length; i++) {
                doc.line(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
            }
            const tri = pointeMm(seg, g, tailleP);
            if (tri) doc.triangle(tri[0].x, tri[0].y, tri[1].x, tri[1].y, tri[2].x, tri[2].y, 'F');
        });
    });

    FAMILLES_Q.forEach(fam => {
        const c = g.P(POSITIONS_Q[fam.id]);
        const x = c.x - g.caseW / 2, y = c.y - g.caseH / 2;
        const hb = g.caseH * BANDE_NOM_Q, hd = g.caseH - hb;
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.35);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, y, g.caseW, g.caseH, 1.4, 1.4, 'FD');
        // Le bandeau du nom, sous le dessin — voir l'aperçu.
        doc.setFillColor(...rvbHex(BANDE_Q));
        doc.setLineWidth(0.3);
        doc.rect(x, y + hd, g.caseW, hb - 1.4, 'FD');
        doc.roundedRect(x, y + hd, g.caseW, hb, 1.4, 1.4, 'FD');

        // LA FIGURE PREND LES DEUX TIERS DU HAUT, le nom le dernier tiers. La
        // case a rétréci en passant en portrait, et le nom, calé à 85 % de sa
        // hauteur avec une police plancher de 5 points, débordait dessous —
        // mesuré sur le premier PDF, « Parallélogramme » chevauchait le trait
        // qui descend vers la rangée suivante.
        const fw = Math.min(g.caseW * 0.86, hd * 1.06), fh = fw;   // voir l'aperçu
        const fx = c.x - fw / 2, fy = y + (hd - fh) / 2;
        const pts = fam.figure.map(pt => [fx + (pt[0] / 100) * fw, fy + (pt[1] / 100) * fh]);
        doc.setFillColor(...rvbHex(FIGURE_Q));
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.4);
        doc.lines(pts.slice(1).concat([pts[0]]).map((q, i) => {
            const a = i === 0 ? pts[0] : pts[i];
            return [q[0] - a[0], q[1] - a[1]];
        }), pts[0][0], pts[0][1], [1, 1], 'FD', true);

        // LE CODAGE DES DIAGONALES — les mêmes segments qu'à l'aperçu.
        const cod = codageDiagQ(fam.figure, fam.id);
        if (cod) {
            const F = (pt) => [fx + (pt.x / 100) * fw, fy + (pt.y / 100) * fh];
            doc.setDrawColor(...ENCRE.trait);
            doc.setLineWidth(0.28);
            doc.setLineDashPattern([1.1, 0.9], 0);
            cod.diagonales.forEach(([a, b]) => {
                const p1 = F(a), p2 = F(b);
                doc.line(p1[0], p1[1], p2[0], p2[1]);
            });
            doc.setLineDashPattern([], 0);
            doc.setLineWidth(0.34);
            doc.setLineCap('round');
            cod.marques.forEach(([a, b]) => {
                const p1 = F(a), p2 = F(b);
                doc.line(p1[0], p1[1], p2[0], p2[1]);
            });
            doc.setLineCap('butt');
            if (cod.droit) {
                doc.setLineWidth(0.28);
                const q = cod.droit.map(F);
                doc.line(q[0][0], q[0][1], q[1][0], q[1][1]);
                doc.line(q[1][0], q[1][1], q[2][0], q[2][1]);
            }
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(policeNomFigure(g.caseW, hb) / 0.352778);
        doc.setTextColor(...ENCRE.texte);
        if (g.m.avecNoms || solution) {
            doc.text(pourPdf(fam.nom), c.x, y + hd + hb / 2, { align: 'center', baseline: 'middle' });
        }
    });

    FLECHES_Q.forEach(f => {
        const e = g.P(posEtiquetteQ(f));
        const w = g.condW, h = g.condH;
        if (g.planche) {
            // EN MODE DÉCOUPAGE, LA CASE DU PLAN RESTE BLANCHE : c'est la CARTE
            // qui porte la couleur de sa famille. Teinter les deux reviendrait
            // à donner la réponse — il suffirait d'assortir les couleurs sans
            // lire une seule phrase.
            if (solution) {
                dessinerVignettePdf(doc, g.mesures[cleFlecheQ(f)], f.famille,
                    e.x - w / 2, e.y - h / 2, w, h);
            }
            else {
                doc.setDrawColor(...ENCRE.trait);
                doc.setLineWidth(0.3);
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(e.x - w / 2, e.y - h / 2, w, h, 0.8, 0.8, 'FD');
            }
            return;
        }
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.3);
        const teinte = RVB_COND[f.famille] || [255, 255, 255];
        doc.setFillColor(...teinte);
        doc.roundedRect(e.x - w / 2, e.y - h / 2, w, h, 1.6, 1.6, 'FD');
        // PAS DE CARRÉ D'ÉCRITURE DEDANS — voir l'aperçu : on écrit dans la case
        // teintée elle-même.
        if (solution) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(Math.min(h * 0.62, 7) / 0.352778);
            doc.setTextColor(...rvbHex(ENCRE_COND(f.famille)));
            doc.text(g.m.parCle[cleFlecheQ(f)], e.x, e.y, { align: 'center', baseline: 'middle' });
        }
    });

    if (g.planche) {
        // La planche ne se répète pas sur la feuille de solutions.
        if (!solution) dessinerPlancheVignettes(doc, g);
        return;
    }

    // LA LISTE, EN ENTIER — et c'était un vrai défaut.
    //
    // On repliait le libellé à la largeur de la colonne… puis on n'imprimait
    // que sa PREMIÈRE ligne. La feuille annonçait donc « Qui a ses côtés
    // opposés », « Qui a deux côtés consécutifs de », « Qui a ses diagonales » :
    // quatre conditions sur neuf s'arrêtaient au milieu d'une phrase, et
    // l'exercice devenait indevinable. On écrit maintenant toutes les lignes.
    const colW = g.b.w / 2;
    const lignes = Math.ceil(g.m.liste.length / 2);
    const pas = pasListe(g, lignes);
    doc.setFontSize(8.4);
    doc.setTextColor(...ENCRE.texte);
    g.m.liste.forEach((l, i) => {
        const col = Math.floor(i / lignes), rang = i % lignes;
        const x = g.b.x + col * colW;
        const y = g.listeY + rang * pas + 3;
        doc.setFont('helvetica', 'bold');
        doc.text(`${l.lettre}.`, x, y);
        doc.setFont('helvetica', 'normal');
        doc.splitTextToSize(pourPdf(l.texte), colW - 10)
            .forEach((t, j) => doc.text(t, x + 5.5, y + j * 3.6));
    });

    // La clef des couleurs — voir l'aperçu.
    let lx = g.b.x;
    const ly = g.listeY + lignes * pas + 4;
    doc.setFontSize(8.2);
    LEGENDE_COND.forEach(({ famille, mot }) => {
        doc.setFillColor(...RVB_COND[famille]);
        doc.setDrawColor(90, 98, 116);
        doc.setLineWidth(0.25);
        doc.roundedRect(lx, ly - 2.4, 3.4, 3.4, 0.6, 0.6, 'FD');
        doc.setTextColor(...ENCRE.gris);
        doc.text(pourPdf(mot), lx + 4.6, ly);
        lx += 6 + doc.getTextWidth(pourPdf(mot));
    });
    doc.setTextColor(...ENCRE.texte);
    doc.setFont('helvetica', 'normal');
}

// --- LE TABLEAU À DOUBLE ENTRÉE, SUR LE PAPIER --------------------------------
//
// Sa forme d'origine : Rémy est parti d'une fiche. L'énoncé au-dessus, le
// tableau dessous, les cases à trouver vides — c'est tout.
//
// LES COLONNES NE SONT PAS TOUTES DE LA MÊME LARGEUR. La colonne des libellés
// porte « Pains au chocolat », les autres portent un nombre à trois chiffres :
// leur donner la même largeur gâcherait la moitié du bloc ou couperait les
// mots. On mesure donc le libellé le plus long et on lui donne ce qu'il faut,
// le reste se partageant équitablement.

function geoTableauCroise(item, slot) {
    const b = boiteDe(slot);
    const m = item.meta;

    // L'ÉNONCÉ SE MESURE AVANT DE RÉSERVER SA PLACE. On réservait une hauteur
    // fixe : quand la phrase prenait deux lignes, la seconde se posait sur le
    // bord du tableau.
    // ET EN MODE « ÉNONCÉ », C'EST L'ÉNONCÉ QUI PORTE LES NOMBRES : il y en a
    // huit ou douze, écrits en toutes lettres, et le tableau part vide. Le
    // texte prend donc beaucoup plus de place — jusqu'à sept lignes, en plus
    // petit — et le tableau se contente de ce qui reste. Les faits s'enchaînent
    // en une seule phrase séparée par des points-virgules : douze puces sur un
    // bloc de huit centimètres ne tiendraient pas, et se liraient mal.
    const parEnonce = m.depart === 'enonce' && Array.isArray(m.donnees) && m.donnees.length;
    const texte = parEnonce
        ? `${m.phrase} On sait que : ${m.donnees.map(d => d.phrase).join(' ; ')}.`
        : m.phrase;

    // LE TABLEAU GARDE SA PLACE, C'EST LE TEXTE QUI RÉTRÉCIT. Mesuré : à corps
    // fixe, huit faits mangeaient les deux tiers du bloc et il ne restait que
    // quatre millimètres pour trois lignes de tableau — les libellés étaient
    // illisibles, et sur deux blocs le tableau avait entièrement disparu. On
    // réserve donc d'abord de quoi écrire dans les cases (5,2 mm par ligne,
    // le minimum où un nombre à trois chiffres reste lisible), et l'on cherche
    // le plus grand corps de texte qui tient dans ce qui reste.
    const hauteurMini = (m.R + 2) * 5.2;
    let corpsTexte = 5.6;
    let lignesTexte = couperEnLignes(texte, Math.floor(b.w / (corpsTexte * 0.46)), 2);
    if (parEnonce) {
        const place = Math.max(10, b.h - hauteurMini);
        for (const corps of [4.6, 4.2, 3.8, 3.4, 3.1, 2.8]) {
            corpsTexte = corps;
            lignesTexte = couperEnLignes(texte, Math.floor(b.w / (corps * 0.46)), 40);
            if (lignesTexte.length * corps * 1.25 + 1.8 <= place) break;
        }
    }
    const hEnonce = lignesTexte.length * corpsTexte * 1.25 + 1.8;
    const rh = Math.min(8.5, Math.max(4.4, (b.h - hEnonce) / (m.R + 2)));

    // LA COLONNE DES LIBELLÉS N'EST PAS COMME LES AUTRES. Elle porte « Pains au
    // chocolat » quand les autres portent trois chiffres. Mais lui donner un
    // tiers du bloc quand elle ne contient que « Gagnées » vole de la largeur
    // aux en-têtes, qui se touchent alors. Elle prend donc ce que réclame son
    // plus long libellé, entre un cinquième et un tiers du bloc.
    const libelles = [...m.lignes, 'Total'];
    const plusLong = libelles.reduce((a, l) => Math.max(a, l.length), 1);
    const wLib = Math.max(b.w * 0.2, Math.min(b.w * 0.34, plusLong * 3.1 + 1.6));
    const wCol = (b.w - wLib) / (m.C + 1);

    // CHAQUE TEXTE REÇOIT LA TAILLE QUI LE FAIT TENIR DANS SA CASE — en largeur
    // ET en hauteur. Le premier jet ne bornait que la largeur : les nombres
    // courts prenaient la taille maximale et dépassaient de leur ligne.
    // 0,52 DE LA LIGNE, ET NON 0,62. Rémy, sur une fiche de cinquième : « ça
    // déborde un peu, les chiffres font un peu gros ». Un caractère occupe en
    // hauteur bien plus que son corps — hampes hautes et jambages compris, à
    // peu près 1,2 fois —, si bien qu'un corps de 0,62 ligne remplissait la
    // case du haut en bas et venait toucher les traits.
    const haut = rh * 0.52;
    const corpsLib = Math.min(haut, tailleQuiRentre(libelles, wLib - 1.6, 8));
    // LES EN-TÊTES TROP LONGS S'ABRÈGENT au lieu de déborder.
    //
    // Rémy, sur le PDF : « Septembre », « Novembre », « Décembre » et
    // « Vendredi » mordaient sur la colonne voisine. `tailleQuiRentre` a un
    // plancher de 3 mm — en dessous on n'imprime plus, on tache — et son
    // commentaire disait déjà que le plancher « reste préférable à un
    // "Septembre" qui déborde ». C'était un choix par défaut, pas une
    // solution : à ce plancher, neuf lettres réclament 16,2 mm et la colonne
    // n'en fait pas toujours autant.
    //
    // Un tableau de vraie vie abrège : « Sept. », « Vend. ». On coupe donc au
    // nombre de lettres qui tient, et le point dit que le mot continue. Les
    // libellés courts — « Lundi », « 6e », « Total » — ne bougent pas.
    const teteQuiTient = (mot, corps) => {
        const large = (t) => t.length * corps * 0.6;
        if (large(mot) <= wCol - 0.8) return mot;
        const n = Math.max(2, Math.floor((wCol - 0.8) / (corps * 0.6)) - 1);
        return n < mot.length ? `${mot.slice(0, n)}.` : mot;
    };
    const corpsTete = Math.min(haut, tailleQuiRentre([...m.colonnes, 'Total'], wCol - 0.8, 8));
    const tetes = [...m.colonnes, 'Total'].map(t => teteQuiTient(String(t), corpsTete));
    const corpsNb = Math.min(haut, tailleQuiRentre(m.valeurs.flat().map(String), wCol - 1.4, 8));

    const x0 = b.x;
    const y0 = b.y + hEnonce;
    const xDe = (c) => x0 + wLib + c * wCol;    // c de 0 à C
    const yDe = (r) => y0 + rh + r * rh;        // la ligne d'en-tête est au-dessus
    return { b, m, rh, corpsLib, corpsTete, corpsNb, corpsTexte, lignesTexte,
        tetes, wLib, wCol, x0, y0, xDe, yDe, hEnonce };
}

/**
 * La plus grande taille de police (en mm) qui fait tenir TOUS ces textes dans
 * la largeur donnée.
 *
 * 0,60 ET NON 0,52. C'était le second morceau du débordement signalé par Rémy,
 * et c'est une erreur de mesure : ces textes-là sont écrits en GRAS, et un
 * chiffre d'Helvetica gras fait 0,556 cadratin de large — 0,52 le sous-estimait
 * donc de sept pour cent, sans compter la marge qu'on croyait garder. Un
 * nombre de trois chiffres dépassait ainsi sa case d'un demi-millimètre, ce qui
 * se voit ; un demi-point de police en moins ne se voit pas.
 */
function tailleQuiRentre(textes, largeur, corpsMax) {
    const plusLong = textes.reduce((a, t) => Math.max(a, String(t).length), 1);
    // Le plancher à 3 mm vaut environ 8,5 points : c'est petit, mais lisible à
    // l'impression — et cela reste préférable à un « Septembre » qui déborde
    // sur la colonne voisine.
    return Math.max(3, Math.min(corpsMax, largeur / (plusLong * 0.6)));
}

function tableauCroisePreviewHtml(item, slot, k, solution) {
    const g = geoTableauCroise(item, slot);
    const m = g.m;
    const T = (v) => (v * k).toFixed(2);
    // EN MODE « ÉNONCÉ », AUCUNE CASE N'EST IMPRIMÉE : les nombres connus sont
    // dans le texte, et les recopier dans le tableau supprimerait l'exercice.
    const connus = new Set(m.depart === 'enonce' ? [] : m.connus);
    let d = '';
    const centre = (x, y, s, corps, couleur) => `<text x="${T(x)}" y="${T(y)}" fill="${couleur || '#1a202c'}"
        font-weight="700" font-size="${(corps * k).toFixed(2)}" text-anchor="middle"
        dominant-baseline="central" font-family="Helvetica, Arial, sans-serif">${echapper(s)}</text>`;

    g.lignesTexte.forEach((ligne, i) => {
        d += `<text x="${T(g.b.x)}" y="${T(g.b.y + g.corpsTexte * (0.95 + i * 1.25))}" fill="#1a202c"
            font-size="${(g.corpsTexte * k).toFixed(2)}" font-family="Helvetica, Arial, sans-serif">${echapper(ligne)}</text>`;
    });

    for (let r = -1; r <= m.R; r++) {
        for (let c = -1; c <= m.C; c++) {
            const x = c < 0 ? g.x0 : g.xDe(c);
            const w = c < 0 ? g.wLib : g.wCol;
            const y = r < 0 ? g.y0 : g.yDe(r);
            d += `<rect x="${T(x)}" y="${T(y)}" width="${T(w)}" height="${T(g.rh)}" fill="none"
                stroke="#8a90a0" stroke-width="${(0.25 * k).toFixed(2)}"/>`;
        }
    }
    g.tetes.forEach((c, i) => { d += centre(g.xDe(i) + g.wCol / 2, g.y0 + g.rh / 2, c, g.corpsTete); });
    [...m.lignes, 'Total'].forEach((l, r) => {
        d += `<text x="${T(g.x0 + 0.8)}" y="${T(g.yDe(r) + g.rh / 2)}" fill="#1a202c" font-weight="700"
            font-size="${(g.corpsLib * k).toFixed(2)}" dominant-baseline="central"
            font-family="Helvetica, Arial, sans-serif">${echapper(l)}</text>`;
    });
    for (let r = 0; r <= m.R; r++) {
        for (let c = 0; c <= m.C; c++) {
            const donne = connus.has(`${r},${c}`);
            if (!donne && !solution) continue;
            d += centre(g.xDe(c) + g.wCol / 2, g.yDe(r) + g.rh / 2, String(m.valeurs[r][c]),
                g.corpsNb, donne ? '#1a202c' : '#8a90a0');
        }
    }
    return `<svg style="position:absolute; left:0; top:0; width:100%; height:100%;
        overflow:visible; pointer-events:none">${d}</svg>`;
}

function dessinerTableauCroisePdf(doc, item, slot, solution) {
    const g = geoTableauCroise(item, slot);
    const m = g.m;
    const connus = new Set(m.depart === 'enonce' ? [] : m.connus);
    // jsPDF compte en points, la géométrie en millimètres : 1 mm ≈ 2,835 pt,
    // et les fontes remplissent environ les trois quarts de leur corps.
    const pt = (mm) => mm * 2.6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(pt(g.corpsTexte));
    doc.setTextColor(...ENCRE.texte);
    g.lignesTexte.forEach((ligne, i) => {
        doc.text(pourPdf(ligne), g.b.x, g.b.y + g.corpsTexte * (0.95 + i * 1.25));
    });

    doc.setDrawColor(...ENCRE.grille);
    doc.setLineWidth(0.25);
    for (let r = -1; r <= m.R; r++) {
        for (let c = -1; c <= m.C; c++) {
            const x = c < 0 ? g.x0 : g.xDe(c);
            const w = c < 0 ? g.wLib : g.wCol;
            const y = r < 0 ? g.y0 : g.yDe(r);
            doc.rect(x, y, w, g.rh);
        }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(pt(g.corpsTete));
    g.tetes.forEach((c, i) => {
        doc.text(pourPdf(c), g.xDe(i) + g.wCol / 2, g.y0 + g.rh / 2, { align: 'center', baseline: 'middle' });
    });

    doc.setFontSize(pt(g.corpsLib));
    [...m.lignes, 'Total'].forEach((l, r) => {
        doc.text(pourPdf(l), g.x0 + 0.8, g.yDe(r) + g.rh / 2, { baseline: 'middle' });
    });

    doc.setFontSize(pt(g.corpsNb));
    for (let r = 0; r <= m.R; r++) {
        for (let c = 0; c <= m.C; c++) {
            const donne = connus.has(`${r},${c}`);
            if (!donne && !solution) continue;
            doc.setTextColor(...(donne ? ENCRE.texte : ENCRE.gris));
            doc.text(String(m.valeurs[r][c]), g.xDe(c) + g.wCol / 2, g.yDe(r) + g.rh / 2,
                { align: 'center', baseline: 'middle' });
        }
    }
    doc.setTextColor(...ENCRE.texte);
    doc.setFont('helvetica', 'normal');
}

export const RENDUS_ALGORITHMES = {
    'organigramme-quadri': {
        titre: 'L\'organigramme des quadrilatères',
        consigne: (items) => (items[0] && items[0].prompt && items[0].prompt.papier)
            || 'Reporte la lettre de chaque condition dans la case posée sur sa flèche.',
        previewGrille: organigrammePreviewHtml,
        pdfGrille: dessinerOrganigrammePdf,
        nomBloc: 'Organigramme', nomBlocs: 'organigrammes',
        // UN SEUL PAR PAGE, ET C'EST VOULU. Rémy : « l'organigramme des
        // quadrilatères est toujours le même » — c'est une hiérarchie, elle ne
        // se tire pas au sort. En mettre deux côte à côte donnerait deux fois la
        // même figure sur la même feuille. Ce qui change d'une copie à l'autre,
        // ce sont les lettres de la liste : deux voisins ne se recopient pas.
        disposition: { cols: 1, rows: 1, maxCols: 1, maxRows: 1 },
        parLigneDefaut: 1,
        unique: true,
        // LA FEUILLE ENTIÈRE, DEBOUT. Rémy : « je suis un peu déçu de
        // l'organigramme, celui que je t'ai donné était plus joli. »
        //
        // Le bloc était déclaré à 1,3 fois sa largeur, et la mise en page lui
        // donnait donc un carré de la moitié de la page ; le plan, plus haut
        // que large, s'y tassait dans un tiers de la largeur — cinquante
        // millimètres de blanc de chaque côté. Un organigramme qu'on colle dans
        // le cahier de leçons se donne la page entière : le plan s'étale sur
        // toute la largeur, la liste des conditions se range dessous.
        portrait: true,
        proportions: 'plein',
        titreAGauche: true
    },
    'tableau-croise': {
        titre: 'Tableaux à double entrée',
        // LA CONSIGNE DIT CE QU'ON DEMANDE VRAIMENT, et ce n'est pas la même
        // chose selon d'où viennent les nombres : quand le tableau part vide,
        // le premier travail est de RANGER l'énoncé, et c'est celui-là qu'on
        // rate. `consigne` reçoit les items : elle le lit sur eux.
        consigne: (items) => {
            const astuce = 'Astuce : cherche à chaque fois la ligne ou la colonne où il ne '
                + 'manque QU\'UNE SEULE information — celle-là, tu peux la boucler. Si la case '
                + 'qui manque est un total, tu additionnes ; si elle est dans le corps du '
                + 'tableau, tu pars du total et tu retires ce qui est déjà écrit. Le nombre que '
                + 'tu viens d\'écrire en ouvre alors d\'autres.';
            const parEnonce = (items || []).some(it => it.meta && it.meta.depart === 'enonce');
            // L'en-tête de la feuille coupe ce qui dépasse : la variante
            // « énoncé » ajoute une phrase, elle en retranche donc une autre.
            // Ce qu'on garde est ce qui ne se devine pas.
            return parEnonce
                ? 'REPORTE D\'ABORD LES INFORMATIONS DE L\'ÉNONCÉ dans le tableau — une phrase, '
                    + 'une case — puis complète les valeurs manquantes. Astuce : cherche à chaque '
                    + 'fois la ligne ou la colonne où il ne manque QU\'UNE SEULE information : '
                    + 'celle-là, tu peux la boucler.'
                : 'COMPLÈTE LES VALEURS MANQUANTES de chaque tableau. ' + astuce;
        },
        previewGrille: tableauCroisePreviewHtml,
        pdfGrille: dessinerTableauCroisePdf,
        nomBloc: 'Tableau', nomBlocs: 'tableaux',
        // Large et bas : un tableau se lit en largeur, et l'énoncé le surmonte.
        //
        // ET LA HAUTEUR SUIT LE NOMBRE DE LIGNES TIRÉES. Rémy, sur le PDF : un
        // tiers de page blanc entre deux rangées de tableaux. La proportion
        // était fixe — le bloc faisait toujours la largeur d'une demi-page en
        // hauteur, 91 mm —, alors qu'un tableau de trois lignes en occupe
        // quarante-cinq. Le reste était du blanc, réservé pour un tableau à
        // sept lignes qui n'était pas sur la feuille.
        //
        // Le compte : deux lignes de plus que les lignes de données — l'en-tête
        // et le total —, à 8,5 mm chacune au maximum, plus une quinzaine de
        // millimètres d'énoncé. Rapporté à la largeur d'un bloc à deux par
        // ligne (91 mm), cela fait le rapport ci-dessous. On garde un plancher :
        // sous 0,45, l'énoncé sur deux lignes ne tiendrait plus.
        proportions: (items) => {
            const lignes = Math.max(...(items || []).map(it => ((it.meta || {}).R ?? 2) + 2), 4);
            return { w: 1.6, h: Math.max(0.45, Math.min(1, (lignes * 8.5 + 16) / 91)) };
        },
        disposition: { cols: 2, rows: 3, maxCols: 2, maxRows: 4 },
        parLigneDefaut: 2
    },
    chat: {
        titre: 'Le chat géomètre — programmes de construction',
        consigne: () => 'UN CARREAU VAUT DIX PAS. Le chat rouge montre où il part et dans '
            + 'quelle direction il regarde. Lis le programme et trace la figure au crayon, '
            + 'côté par côté — rien ne s\'exécute ici, il faut prévoir. Un polygone régulier '
            + 'à n côtés se ferme en tournant à chaque sommet de 360 ÷ n.',
        previewGrille: chatPreviewHtml,
        pdfGrille: dessinerChatPdf,
        nomBloc: 'Programme',
        titreAGauche: true,
        disposition: { cols: 2, rows: 2, maxCols: 3, maxRows: 3 },
        parLigneDefaut: 2
    },
};
