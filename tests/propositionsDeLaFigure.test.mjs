// LES QUATRE AFFIRMATIONS SOUS LA FIGURE, SUR UNE FEUILLE ÉTROITE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture d'écran à l'appui :
//
//   « pour l'impression du milieu d'un segment, les lettres se superposent »
//
// Sa feuille est une FICHE DE PARCOURS EN A4 PORTRAIT. Deux colonnes sur 210 mm
// de large, donc des blocs de 92 mm, donc des demi-colonnes de 43 mm pour une
// phrase comme « V n'est pas le milieu de [GS] » — vingt-neuf caractères. Elle
// ne tient pas sur une ligne, et c'est là que tout s'est joué.
//
// ── DEUX RENDUS, DEUX FAÇONS DE RATER LA MÊME CHOSE ────────────────────────
//
// La hauteur d'un rang valait `taille × 1,75` — c'est-à-dire UN RANG, et non le
// nombre de LIGNES que ce rang occupe. De là, deux défauts opposés :
//
//   L'APERÇU coupait la phrase (le navigateur le fait tout seul) mais gardait
//   la hauteur d'une ligne et demie : la seconde ligne tombait SUR la
//   proposition d'en dessous, lettre pour lettre. C'est ce que Rémy a vu.
//
//   LE PDF ne coupait pas du tout — `doc.text` n'a jamais coupé une phrase — et
//   la laissait déborder sur la colonne d'à côté : « T n'est pas le milieu de
//   [MZ]☐V est le milieu de [MT] ». Invisible en paysage, où les blocs sont
//   larges, donc invisible dans toutes les mesures d'avant.
//
// ── POURQUOI CES DEUX ÉPREUVES-LÀ ──────────────────────────────────────────
//
// On ne mesure pas une hauteur, on mesure un ÉCART MINIMAL : la plus petite
// distance entre deux lignes écrites dans la même colonne doit valoir au moins
// un interligne. C'est la définition même de « ne pas se superposer », elle ne
// dépend d'aucune constante recopiée ici, et l'interligne se LIT dans l'aperçu
// — qui l'écrit en clair — au lieu d'être recalculé.
//
// Et la seconde épreuve confronte les deux rendus sur le NOMBRE de lignes : un
// PDF qui écrirait la phrase entière d'un seul `doc.text` a toujours moins de
// lignes que l'aperçu. C'est la forme exacte du défaut du PDF, et c'est aussi
// la seule qui le voie sans ouvrir un fichier.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import { elementsGeometrieGenerator as G } from '../js/core/generators/elementsGeometrie.js';
import {
    elementsGeoPreviewHtml, dessinerElementsGeoPdf
} from '../js/ui/fiches/elementsGeo.js';

// ── LE DÉCOR ────────────────────────────────────────────────────────────────

// LE BLOC DE SA FEUILLE, ET PAS UN AUTRE. A4 portrait, deux colonnes, quatre
// figures par page : c'est la seule largeur où le défaut se voit, et une
// épreuve posée sur un bloc large ne mesurerait rien du tout.
const PORTRAIT = { boite: { x: 12, y: 20, w: 92, h: 106 } };

const unItem = (notion, i) => G.generate({ notion },
    { rng: makeRng('prop' + notion + i), index: i, total: 6, papier: true, themesExclus: [] });

/** Un faux jsPDF qui note les ordres : on regarde les ORDRES, pas un fichier. */
function faussePage() {
    const vu = { textes: [], rects: [] };
    const rien = () => {};
    return {
        vu,
        setDrawColor: rien, setFillColor: rien, setTextColor: rien,
        setLineWidth: rien, setLineCap: rien, setFont: rien, setFontSize: rien,
        circle: rien, line: rien,
        rect: (x, y, w, h) => vu.rects.push({ x, y, w, h }),
        text: (t, x, y) => vu.textes.push({ t, x, y })
    };
}

/** Le réglage « marque des points » là où les deux rendus le lisent. */
function avecLeReglage(faire) {
    const avait = typeof globalThis.document !== 'undefined';
    if (!avait) globalThis.document = { documentElement: { dataset: {} } };
    const ancien = globalThis.document.documentElement.dataset.point;
    globalThis.document.documentElement.dataset.point = 'croix';
    try { return faire(); } finally {
        if (!avait) delete globalThis.document;
        else globalThis.document.documentElement.dataset.point = ancien;
    }
}

/**
 * LES NOMBRES DE LA MISE EN PAGE, LUS DANS L'APERÇU.
 *
 * L'aperçu écrit `top`, `width`, `font-size` et `line-height` en clair, un jeu
 * par proposition, à l'échelle 1 (donc en millimètres de page). On les LIT
 * plutôt que de les recalculer : une épreuve qui recopie la formule ne mesure
 * que sa propre copie — le dépôt a déjà payé cette leçon deux fois.
 */
function plantLu(item) {
    const html = avecLeReglage(() => elementsGeoPreviewHtml(item, PORTRAIT, 1, false));
    const jeux = [...html.matchAll(
        /top:([\d.]+)px;\s*width:([\d.]+)px; font-size:([\d.]+)px;\s*line-height:([\d.]+)px/g)]
        .map(m => ({
            top: Number(m[1]), colW: Number(m[2]),
            taille: Number(m[3]), interligne: Number(m[4])
        }));
    return { html, jeux, nowrap: (html.match(/white-space:\s*nowrap/g) || []).length };
}

/**
 * LES LIGNES DE PROPOSITION DU PDF, RANGÉES PAR COLONNE.
 *
 * On les reconnaît à leur abscisse : chaque ligne est écrite à `côté de la
 * case + 0,8`, et les cases sont les seuls rectangles de ce rendu. Les lettres
 * des points, elles, tombent n'importe où sur la figure.
 */
function lignesDuPdf(item, cote) {
    const doc = faussePage();
    avecLeReglage(() => dessinerElementsGeoPdf(doc, item, PORTRAIT, false));
    assert.equal(doc.vu.rects.length, (item.choices || []).length,
        `${doc.vu.rects.length} case(s) tracée(s) pour ${(item.choices || []).length} propositions`);
    const colonnes = [...new Set(doc.vu.rects.map(r => Number((r.x + cote + 0.8).toFixed(2))))];
    const dans = (x) => colonnes.findIndex(c => Math.abs(c - x) < 0.01);
    const out = colonnes.map(() => []);
    doc.vu.textes.forEach(t => {
        const i = dans(Number(t.x.toFixed(2)));
        if (i >= 0) out[i].push(t);
    });
    return { doc, colonnes, parColonne: out };
}

/** Le côté de la case, écrit lui aussi dans l'aperçu. */
const coteLu = (html) => Number(/width:([\d.]+)px;\s*height:\1px; border:/.exec(html)[1]);

// ── L'ÉPREUVE DE RÉMY ───────────────────────────────────────────────────────

test('AUCUNE PROPOSITION NE S\'ÉCRIT SUR LA SUIVANTE, MÊME EN A4 PORTRAIT', () => {
    // « les lettres se superposent », dans sa forme mesurable : deux lignes
    // d'une même colonne ne sont jamais séparées de MOINS d'un interligne.
    //
    // MESURÉ AVANT, sur ce bloc de 92 mm : écart minimal 1,36 mm pour un
    // interligne de 4,59 mm — la seconde ligne tombait au tiers de la hauteur
    // de la proposition suivante. APRÈS : 4,59 mm, c'est-à-dire exactement un
    // interligne, l'écart le plus serré qu'on puisse avoir sans superposition.
    let vuesCoupees = 0;
    for (const notion of ['milieu', 'codage', 'appartenance']) {
        for (let i = 0; i < 10; i++) {
            const item = unItem(notion, i);
            if (!(item.choices || []).length) continue;
            const { html, jeux } = plantLu(item);
            if (!jeux.length) continue;
            const { interligne } = jeux[0];
            const { parColonne } = lignesDuPdf(item, coteLu(html));
            parColonne.forEach((lignes, col) => {
                if (lignes.length > (item.choices.length / parColonne.length)) vuesCoupees++;
                const y = [...new Set(lignes.map(l => Number(l.y.toFixed(2))))]
                    .sort((a, b) => a - b);
                for (let j = 1; j < y.length; j++) {
                    assert.ok(y[j] - y[j - 1] >= interligne - 0.01,
                        `${notion} ${i}, colonne ${col} : deux lignes à `
                        + `${(y[j] - y[j - 1]).toFixed(2)} mm l'une de l'autre pour un `
                        + `interligne de ${interligne.toFixed(2)} mm — elles se superposent`);
                }
            });
            // ET AUCUNE AFFIRMATION TRONQUÉE. `couperEnLignes` coupe au
            // troisième retour en posant « … » : une affirmation dont la fin
            // manque ne se coche pas, elle se devine.
            parColonne.flat().forEach(l => assert.ok(!l.t.includes('…'),
                `${notion} ${i} : « ${l.t} » est tronquée sur la feuille`));
        }
    }
    // UNE MESURE QUI NE VOIT AUCUNE PHRASE COUPÉE NE MESURE RIEN. Si un jour
    // les affirmations raccourcissent — ou si le bloc s'élargit —, cette
    // épreuve passerait au vert sans avoir rien gardé, et c'est précisément
    // l'assurance qui n'existe pas qu'on cherche à ne plus acheter.
    assert.ok(vuesCoupees >= 5,
        `${vuesCoupees} colonne(s) à plus d'une ligne par proposition : le bloc `
        + 'est trop large pour que cette épreuve garde quoi que ce soit');
});

test('L\'APERÇU ET LE PDF COUPENT AUX MÊMES ENDROITS, ET AUX MÊMES HAUTEURS', () => {
    // LE DÉFAUT DU PDF, dans sa forme exacte : `doc.text` ne coupe pas, donc un
    // PDF qui écrit la phrase entière d'un seul ordre a MOINS de lignes que
    // l'aperçu, qui en écrit une par ligne comptée. Le compte est donc la
    // mesure — et il n'y a pas d'autre façon de le voir sans ouvrir le fichier.
    //
    // ET LES HAUTEURS AVEC : le `top` de l'aperçu et le coin de la case du PDF
    // sortent du même `yDeRang`. Deux rendus qui se croient d'accord sans
    // qu'on les confronte, ce dépôt l'a payé pour la racine carrée puis pour
    // la pointe de flèche de l'axe.
    for (const notion of ['milieu', 'codage']) {
        for (let i = 0; i < 6; i++) {
            const item = unItem(notion, i);
            const { html, jeux } = plantLu(item);
            if (!jeux.length) continue;
            const { doc, parColonne } = lignesDuPdf(item, coteLu(html));
            const lignesPdf = parColonne.flat().length;
            const { nowrap } = plantLu(item);
            assert.equal(lignesPdf, nowrap,
                `${notion} ${i} : ${lignesPdf} ligne(s) au PDF pour ${nowrap} à `
                + 'l\'aperçu — les deux rendus ne coupent pas aux mêmes endroits');
            assert.equal(jeux.length, doc.vu.rects.length,
                `${notion} ${i} : ${jeux.length} propositions à l'aperçu pour `
                + `${doc.vu.rects.length} cases au PDF`);
            jeux.forEach((j, n) => assert.ok(Math.abs(j.top - doc.vu.rects[n].y) < 0.01,
                `${notion} ${i}, proposition ${n} : l'aperçu la pose à `
                + `${j.top.toFixed(2)} mm et le PDF à ${doc.vu.rects[n].y.toFixed(2)} mm`));
        }
    }
});
