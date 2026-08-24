import { test } from 'node:test';
import assert from 'node:assert/strict';
import { U, silhouette, gelule, versSvg, versPdf, largeurChamp } from '../js/core/blocScratch.js';

/** Tous les points d'ancrage d'un chemin (on ignore les points de contrôle). */
const ancres = (ch) => [ch.debut, ...ch.pas.map(s => (s[0] === 'L' ? [s[1], s[2]] : [s[5], s[6]]))];

test('un bloc simple tient dans sa boîte, cran compris', () => {
    const f = silhouette({ genre: 'simple', largeur: 120 });
    assert.equal(f.hauteur, U.ligne);
    const pts = ancres(f);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    assert.equal(Math.min(...xs), 0);
    assert.equal(Math.max(...xs), 120);
    assert.equal(Math.min(...ys), 0);
    // LE TENON DÉPASSE PAR LE BAS, et c'est exprès : c'est lui qui s'emboîte
    // dans le creux du bloc suivant. Huit unités exactement — la profondeur
    // du cran de Scratch, ni plus (il recouvrirait le texte de la brique d'en
    // dessous) ni moins (on ne verrait plus qu'elles s'accrochent).
    assert.equal(Math.max(...ys), U.ligne + 8);
});

test('une boucle enveloppe sa bouche et se referme par une barre', () => {
    const bouche = 80;
    const f = silhouette({ genre: 'boucle', largeur: 140, bouche });
    assert.equal(f.hauteur, U.ligne + bouche + U.basBoucle);
    // Le dos du C : la bouche est en retrait, jamais au bord gauche.
    const xs = ancres(f).map(p => p[0]);
    assert.ok(xs.includes(U.retrait), 'la bouche part du retrait');
    assert.equal(Math.max(...xs), 140);
});

test('le chapeau porte son dôme et n\'a pas de creux en haut', () => {
    const f = silhouette({ genre: 'chapeau', largeur: 160 });
    assert.equal(f.hauteur, U.chapeau);
    // Le chemin commence au bas du dôme, à gauche : rien au-dessus de zéro.
    assert.deepEqual(f.debut, [0, U.dome]);
    assert.ok(ancres(f).every(p => p[1] >= 0));
});

test('les deux rendus disent le même chemin', () => {
    // C'est toute la raison d'être du module : l'aperçu et le PDF ne peuvent
    // pas diverger, puisqu'ils lisent les mêmes segments.
    const f = silhouette({ genre: 'simple', largeur: 100 });
    const svg = versSvg(f, { x: 10, y: 20, u: 2 });
    const pdf = versPdf(f, { x: 10, y: 20, u: 2 });
    assert.ok(svg.startsWith('M 10.00 28.00'), svg.slice(0, 20));
    assert.equal(pdf.x, 10);
    assert.equal(pdf.y, 28);          // 20 + r × 2
    assert.equal(pdf.suite.length, f.pas.length);
    // Le cumul des segments relatifs retombe sur le dernier point absolu.
    let x = pdf.x, y = pdf.y;
    for (const s of pdf.suite) { x += s[s.length - 2]; y += s[s.length - 1]; }
    const dernier = ancres(f).at(-1);
    assert.ok(Math.abs(x - (10 + dernier[0] * 2)) < 1e-9);
    assert.ok(Math.abs(y - (20 + dernier[1] * 2)) < 1e-9);
});

test('la gélule d\'un nombre grandit avec lui, sans jamais se refermer', () => {
    assert.ok(largeurChamp('7') >= 30, 'un chiffre seul garde une gélule ronde');
    assert.ok(largeurChamp('144') > largeurChamp('7'));
    const g = gelule(60, U.champH);
    const ys = ancres(g).map(p => p[1]);
    assert.equal(Math.min(...ys), 0);
    assert.equal(Math.max(...ys), U.champH);
});
