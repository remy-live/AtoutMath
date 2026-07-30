// Fiches à imprimer.
//
// Certains exercices valent autant sur papier qu'à l'écran — les grilles en
// tête : on y rature, on note ses candidats dans les coins, on gomme. Ce
// module fabrique une fiche (énoncés, puis solutions sur une page séparée) et
// ouvre la fenêtre d'impression du navigateur : « Enregistrer en PDF » y est
// intégré partout, aucune bibliothèque à charger, et le but final des parents
// est de toute façon le papier.
//
// Le cas par cas est assumé : imprimer a du sens pour une grille ou un calcul
// posé, aucun pour un glisser-déposer ou une course. Un exercice s'inscrit en
// déclarant `printable: '<cle>'` dans le catalogue, et en fournissant ici le
// rendu de SES énoncés — le gabarit (page, en-tête, coupures, solutions) est
// commun.

import { getGenerator } from '../core/registry.js';
import { makeRng } from '../core/ids.js';

// --- Gabarit commun ---------------------------------------------------------

const STYLE_FICHE = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Outfit', 'Segoe UI', sans-serif; color: #1a202c; padding: 10mm 12mm; }
    header { display: flex; justify-content: space-between; align-items: baseline;
             border-bottom: 2px solid #1a202c; padding-bottom: 4mm; margin-bottom: 6mm; }
    header h1 { font-size: 17pt; }
    header .identite { font-size: 10pt; }
    header .identite span { display: inline-block; min-width: 34mm; border-bottom: 1px dotted #555; }
    .consigne { font-size: 10.5pt; margin-bottom: 6mm; }
    .grilles { display: flex; flex-wrap: wrap; gap: 8mm; justify-content: space-between; }
    .bloc { break-inside: avoid; }
    .bloc h2 { font-size: 10.5pt; margin-bottom: 2mm; font-weight: 700; }
    .solutions { page-break-before: always; }
    .solutions h1 { font-size: 14pt; margin-bottom: 5mm; border-bottom: 2px solid #1a202c; padding-bottom: 2mm; }
    footer { margin-top: 8mm; font-size: 8pt; color: #718096; text-align: center; }
    @page { size: A4 portrait; margin: 8mm; }
`;

/**
 * Ouvre la fiche dans un nouvel onglet et lance l'impression.
 *
 * Le document est écrit d'un bloc : pas de scripts, pas de ressources
 * externes — une page morte, exactement ce qu'un document imprimé doit être.
 */
function ouvrirFiche({ titre, consigne, styleExercice, blocsEnonces, blocsSolutions }) {
    const w = window.open('', '_blank');
    if (!w) return false; // bloqueur de fenêtres : signalé à l'appelant

    w.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${titre} — fiche à imprimer</title>
<style>${STYLE_FICHE}${styleExercice || ''}</style>
</head>
<body>
    <header>
        <h1>${titre}</h1>
        <div class="identite">Nom : <span></span>&nbsp;&nbsp;Date : <span></span></div>
    </header>
    <p class="consigne">${consigne}</p>
    <div class="grilles">${blocsEnonces.join('')}</div>
    <section class="solutions">
        <h1>Solutions</h1>
        <div class="grilles">${blocsSolutions.join('')}</div>
    </section>
    <footer>Fiche générée par AtoutMath</footer>
</body>
</html>`);
    w.document.close();
    // L'impression part une fois la page posée ; l'onglet reste ouvert pour
    // relancer ou ajuster les réglages d'impression.
    w.addEventListener('load', () => w.print());
    return true;
}

// --- Mathdoku ---------------------------------------------------------------

const STYLE_MATHDOKU = `
    .kkp { border-collapse: collapse; }
    .kkp td { border: 0.4pt solid #b8bec9; text-align: center; vertical-align: middle;
              position: relative; font-weight: 700; }
    .kkp .bt { border-top: 2pt solid #1a202c; } .kkp .br { border-right: 2pt solid #1a202c; }
    .kkp .bb { border-bottom: 2pt solid #1a202c; } .kkp .bl { border-left: 2pt solid #1a202c; }
    .kkp .etiquette { position: absolute; top: 0.6mm; left: 1.1mm; font-size: 7pt;
                      font-weight: 700; color: #4a5568; }
    .kkp .donnee { background: #eef0fa; }
    .kkp-enonce td { width: 13mm; height: 13mm; font-size: 13pt; }
    .kkp-solution td { width: 7mm; height: 7mm; font-size: 8.5pt; }
    .kkp-solution .etiquette { font-size: 4.5pt; }
`;

/**
 * Une grille en tableau HTML statique — même dessin des cages que le jeu
 * (bordures épaisses aux frontières), sans aucune interactivité.
 * @param {Object} item - produit par le générateur logique.mathodu
 * @param {boolean} solution - grille résolue (page des solutions)
 */
function grilleMathdokuHtml(item, solution) {
    const { n, cages, solution: sol } = item.meta;
    const cageDe = Array.from({ length: n }, () => Array(n).fill(-1));
    cages.forEach((cage, i) => cage.cells.forEach(p => { cageDe[p.r][p.c] = i; }));

    let html = `<table class="kkp ${solution ? 'kkp-solution' : 'kkp-enonce'}">`;
    for (let r = 0; r < n; r++) {
        html += '<tr>';
        for (let c = 0; c < n; c++) {
            const ci = cageDe[r][c];
            const cage = cages[ci];
            const bords = [
                r === 0 || cageDe[r - 1][c] !== ci ? 'bt' : '',
                c === n - 1 || cageDe[r][c + 1] !== ci ? 'br' : '',
                r === n - 1 || cageDe[r + 1][c] !== ci ? 'bb' : '',
                c === 0 || cageDe[r][c - 1] !== ci ? 'bl' : ''
            ].join(' ');
            const premiere = cage.cells[0].r === r && cage.cells[0].c === c;
            const donnee = cage.op === null;
            const valeur = solution || donnee ? sol[r][c] : '';
            html += `<td class="${bords}${donnee ? ' donnee' : ''}">
                ${premiere ? `<span class="etiquette">${cage.label}</span>` : ''}${valeur}</td>`;
        }
        html += '</tr>';
    }
    return html + '</table>';
}

/**
 * Fiche Mathdoku : `nbGrilles` grilles fraîches avec les réglages courants
 * (chiffres, opérations, difficulté), solutions en page séparée.
 */
function imprimerMathdoku(exo, params, nbGrilles) {
    const generator = getGenerator(exo.generatorId);
    if (!generator) return false;

    const items = [];
    for (let i = 0; i < nbGrilles; i++) {
        // Graine fraîche par grille : la fiche est différente à chaque fois.
        items.push(generator.generate(params, { rng: makeRng() }));
    }

    const lo = items[0].meta.lo, hi = items[0].meta.hi;
    return ouvrirFiche({
        titre: 'Mathdoku',
        consigne: `Chaque chiffre de ${lo} à ${hi} apparaît une seule fois par ligne et par colonne.
            Les cases d'une zone doivent donner le résultat écrit dans son coin, avec l'opération indiquée.`,
        styleExercice: STYLE_MATHDOKU,
        blocsEnonces: items.map((item, i) =>
            `<div class="bloc"><h2>Grille ${i + 1}</h2>${grilleMathdokuHtml(item, false)}</div>`),
        blocsSolutions: items.map((item, i) =>
            `<div class="bloc"><h2>Grille ${i + 1}</h2>${grilleMathdokuHtml(item, true)}</div>`)
    });
}

// --- Répartition ------------------------------------------------------------

const IMPRIMEURS = {
    mathdoku: imprimerMathdoku
};

/** Lance la fiche de l'exercice, ou explique pourquoi elle n'est pas partie. */
export function imprimerFiche(exo, params, nbGrilles) {
    const imprimeur = IMPRIMEURS[exo.printable];
    if (!imprimeur) return false;
    return imprimeur(exo, params, Math.max(1, Math.min(12, nbGrilles || 6)));
}
