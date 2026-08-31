// L'HEXAGRILLE SUR LE PAPIER — la fiche dit-elle la même chose que l'écran ?
//
// Rémy : « Pas de pdf ». Deux choses seulement doivent être vraies, et elles
// suffisent : la grille imprimée est RÉSOLUBLE et sa solution est celle qu'on
// annonce ; et la FIGURE est la même que celle du jeu, parce qu'elle est
// calculée au même endroit.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { hexagrilleFicheGenerator } from '../js/core/generators/hexagrilleFiche.js';
import { CASES, FILES, estResolue } from '../js/core/hexagrille.js';
import { centre, cadreHexagrille, repereFleche, SOMMETS, R }
    from '../js/core/hexagrilleFigure.js';

const faire = (params, graine) => hexagrilleFicheGenerator.generate(params || {},
    { rng: makeRng(graine || 'hx'), index: 0 });

test('LA GRILLE IMPRIMÉE SE RÉSOUT, ET SA SOLUTION EST CELLE QU\'ON ANNONCE', () => {
    // Une fiche ne doit jamais poser une grille impossible ni annoncer une
    // correction qui n'en est pas une : c'est le professeur qui la relit, et
    // il n'a pas le solveur sous la main.
    for (const niveau of ['facile', 'moyen', 'difficile']) {
        for (let i = 0; i < 8; i++) {
            const it = faire({ niveau }, `${niveau}-${i}`);
            const p = it.meta.puzzle;
            // Les neuf chiffres, chacun une fois.
            assert.deepEqual([...p.solution].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9],
                `${niveau} ${i} : ce ne sont pas les chiffres de 1 à 9`);
            // Chaque file tombe sur sa somme.
            p.fleches.forEach(f => assert.equal(
                f.cases.reduce((t, k) => t + p.solution[k], 0), f.somme,
                `${niveau} ${i} : la file ${f.id} ne fait pas ${f.somme}`));
            assert.ok(estResolue(p.solution, p), `${niveau} ${i} : la solution ne résout pas`);
            // Et les cases données sont bien celles de la solution.
            p.donnees.forEach((v, k) => { if (v) assert.equal(v, p.solution[k]); });
            // La réponse enregistrée, celle du corrigé, est la grille lue.
            assert.equal(it.answer, p.solution.join(' '));
        }
    }
});

test('LE NIVEAU DÉCIDE DU NOMBRE DE CASES DONNÉES', () => {
    const donnees = (niveau) => faire({ niveau }, `n-${niveau}`)
        .meta.puzzle.donnees.filter(v => v !== 0).length;
    assert.ok(donnees('facile') > donnees('difficile'),
        'une grille facile doit donner plus de cases qu\'une difficile');
    assert.equal(donnees('difficile'), 0, 'en difficile, aucune case n\'est écrite');
});

test('LA FIGURE DE LA FEUILLE EST CELLE DE L\'ÉCRAN', () => {
    // Le placement vient d'un seul module : recopié dans `printSheet.js`, il
    // aurait fini par diverger du jeu. On vérifie ici ce qui le caractérise.
    //
    // Un hexagone à SOMMET PLAT : six sommets, tous à la distance R du centre,
    // et le premier posé plein est à droite.
    assert.equal(SOMMETS.length, 6);
    SOMMETS.forEach(([x, y]) => assert.ok(Math.abs(Math.hypot(x, y) - R) < 1e-9,
        'un sommet n\'est pas sur le cercle de rayon R'));
    assert.ok(Math.abs(SOMMETS[0][0] - R) < 1e-9 && Math.abs(SOMMETS[0][1]) < 1e-9,
        'le premier sommet est celui de droite');

    // Les colonnes se chevauchent d'un quart de largeur et descendent en
    // biais : c'est ce qui fait le losange plutôt qu'un damier.
    const a = centre(0, 0), b = centre(1, 0);
    assert.ok(b.x - a.x > 0 && b.x - a.x < 2 * R, 'les colonnes doivent se chevaucher');
    assert.ok(b.y > a.y, 'une colonne de droite descend');

    // Deux cases distinctes ne partagent jamais leur centre.
    const vus = new Set(CASES.map(({ c, r }) => {
        const o = centre(c, r);
        return `${o.x.toFixed(3)},${o.y.toFixed(3)}`;
    }));
    assert.equal(vus.size, CASES.length, 'deux cases se superposent');
});

test('LE CADRE CONTIENT LES ÉTIQUETTES, PAS SEULEMENT LES CASES', () => {
    // Une constante écrite à la main laissait sortir la somme de la première
    // colonne dès qu'elle passait à deux chiffres. Le cadre se calcule.
    const fleches = FILES.map(f => ({ ...f, somme: 15 }));
    const cadre = cadreHexagrille(fleches);
    fleches.forEach(f => {
        const q = repereFleche(f);
        assert.ok(q.ex >= cadre.x && q.ex <= cadre.x + cadre.w,
            `l'étiquette de ${f.id} sort du cadre en abscisse`);
        assert.ok(q.ey >= cadre.y && q.ey <= cadre.y + cadre.h,
            `l'étiquette de ${f.id} sort du cadre en ordonnée`);
    });
    // Et les hexagones aussi, bien sûr.
    CASES.forEach(({ c, r }) => {
        const o = centre(c, r);
        assert.ok(o.x - R >= cadre.x && o.x + R <= cadre.x + cadre.w,
            `la case ${c},${r} sort du cadre`);
    });
    // Le cadre d'une grille sans flèche est plus petit : il ne contient que
    // les cases.
    assert.ok(cadreHexagrille([]).w < cadre.w, 'le cadre doit suivre les étiquettes');
});
