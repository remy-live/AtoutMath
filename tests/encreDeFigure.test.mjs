// UN DESSIN AUSSI A UN THÈME.
//
// Rémy, capture d'iPhone en thème sombre : « il faut faire attention aux
// contrastes selon les modes si on a pris mode nuit ou non ». Sur son écran, le
// cercle et les lettres A, B, C, D, O de « Le Vocabulaire du Cercle » sont
// invisibles.
//
// LA CAUSE : `ENCRE_FIG = '#1a202c'`, un noir écrit en dur, peint sur le bleu
// nuit du plateau. MESURÉ, contraste de l'encre sur le fond, dans les cinq
// thèmes :
//
//     avant : clair 16,32 · SOMBRE 1,14 · océan 16,32 · forêt 16,32 · couchant 16,32
//     après : clair 17,85 · sombre 13,66 · océan 9,46 · forêt 9,11 · couchant 9,07
//
// UN SEUL THÈME SUR CINQ, et c'est tout le sujet de sa remarque : une mesure
// qui ne regarde qu'un thème ne voit pas ce défaut, et quatre lignes sur cinq
// disaient que tout allait bien.
//
// `currentColor` EST LA SEULE VALEUR QU'UN ATTRIBUT DE PRÉSENTATION SVG SAIT
// FAIRE SUIVRE — `var()` n'y est pas admis. La feuille pose la couleur sur le
// SVG, et tout le dessin la prend : les traits, les croix et les lettres.
//
// ET LES DISQUES PLEINS SUIVENT AVEC. C'étaient des pastilles claires écrites
// en dur ; sous une encre devenue blanche, la lettre posée dessus aurait
// disparu à son tour — on aurait déplacé le défaut au lieu de le corriger. Ils
// se mélangent maintenant au plateau, donc ils s'assombrissent avec lui.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const FIG = readFileSync(new URL('../js/core/cercleFigure.js', import.meta.url), 'utf8');
const CSS = readFileSync(new URL('../css/modules.css', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');

test('L\'ENCRE DE LA FIGURE N\'EST PAS UNE COULEUR ÉCRITE EN DUR', () => {
    const m = /export const ENCRE_FIG = '([^']*)';/.exec(FIG);
    assert.ok(m, 'l\'encre de la figure doit être nommée une seule fois');
    assert.equal(m[1], 'currentColor',
        'un attribut de présentation SVG n\'admet pas var() : currentColor est la '
        + 'seule valeur qui suive le thème');
});

test('ET LA FEUILLE DÉCIDE DE CETTE COULEUR', () => {
    // Sans cette ligne, `currentColor` prendrait ce qui traîne dans l'héritage —
    // c'est-à-dire n'importe quoi selon l'écran où la figure est posée.
    assert.match(CSS, /\.fig-cercle \{ color: var\(--text-main\); \}/,
        'la figure doit recevoir l\'encre du thème, nommément');
    assert.match(FIG, /<svg class="fig-cercle"/,
        'et le SVG doit porter cette classe, sinon la règle ne l\'atteint pas');
});

test('LES DISQUES PLEINS S\'ASSOMBRISSENT AVEC LE PLATEAU', () => {
    // LE DERNIER, PAS LE PREMIER : la même condition apparaît deux fois — une
    // pour le CALQUE DE CAPTURE, invisible et transparent, une pour le dessin.
    // La première version de cette épreuve lisait le calque et déclarait
    // l'absence d'une couleur qui n'a jamais eu à s'y trouver.
    const i = FIG.lastIndexOf('t.k === \'cercle\' && t.plein');
    assert.ok(i > 0, 'le cas du disque plein doit exister');
    const bloc = FIG.slice(i, i + 700);
    assert.match(bloc, /style="fill: color-mix\(in srgb, \$\{t\.fort \? 'var\(--danger\) 20%' : 'var\(--primary\) 12%'\}, var\(--bg-plateau\)\)"/,
        'un disque clair écrit en dur sous une encre devenue blanche ferait '
        + 'disparaître la lettre : il doit se mélanger au plateau');
    // `style` ET NON UN ATTRIBUT : c'est le seul endroit où var() est admis.
    assert.doesNotMatch(bloc, /fill="\$\{t\.fort \? '#/,
        'les deux teintes écrites en dur ne doivent pas revenir');
});
