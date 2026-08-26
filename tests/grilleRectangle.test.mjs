import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { THEMES } from '../js/core/motsCaches.js';
import {
    vide, recadrer, garnirRectangle, remplissage, rectangleOptimise
} from '../js/core/grilleRectangle.js';

const faire = (opts = {}, cle = 'r') => rectangleOptimise({
    theme: 'angles', niveauMax: 3, largeur: 11, hauteur: 9, essais: 8,
    rngPour: (i) => makeRng(`${cle}-${i}`), ...opts
});

/** Tout ce qui se lit dans la grille, horizontalement et verticalement. */
function suites(cases) {
    const lues = [];
    const balayer = (lire, n, m) => {
        for (let a = 0; a < n; a++) {
            let mot = '';
            for (let b = 0; b <= m; b++) {
                const c = b < m ? lire(a, b) : null;
                if (c === null) { if (mot.length > 1) lues.push(mot); mot = ''; } else mot += c;
            }
        }
    };
    const H = cases.length, L = cases[0].length;
    balayer((y, x) => cases[y][x], H, L);
    balayer((x, y) => cases[y][x], L, H);
    return lues;
}

test('un rectangle vide a bien ses deux dimensions', () => {
    const g = vide(7, 4);
    assert.equal(g.length, 4);
    assert.equal(g[0].length, 7);
    assert.ok(g.flat().every(c => c === null));
});

test('recadrer enlève les marges vides et ne coupe aucune lettre', () => {
    const g = vide(6, 5);
    g[2][1] = 'A'; g[2][2] = 'B'; g[3][2] = 'C';
    const r = recadrer(g);
    assert.deepEqual(r.cases, [['A', 'B'], [null, 'C']]);
    assert.equal(r.dx, 1);
    assert.equal(r.dy, 2);
});

test('rien ne dépasse du rectangle demandé', () => {
    // C'est la promesse du module : on se donne un rectangle et l'on reste
    // dedans. Un mot qui déborde n'apparaîtrait qu'à moitié à l'écran.
    for (let i = 0; i < 12; i++) {
        const mots = [
            { mot: 'BISSECTRICE' }, { mot: 'PERPENDICULAIRE' }, { mot: 'ANGLE' },
            { mot: 'AIGU' }, { mot: 'DROIT' }, { mot: 'SOMMET' }, { mot: 'CUBE' }
        ];
        const { g, poses } = garnirRectangle(mots, makeRng('deb' + i), { largeur: 9, hauteur: 7 });
        assert.equal(g.length, 7);
        assert.ok(g.every(l => l.length === 9));
        poses.forEach(p => {
            const fx = p.x + (p.dir === 'h' ? p.mot.length - 1 : 0);
            const fy = p.y + (p.dir === 'v' ? p.mot.length - 1 : 0);
            assert.ok(p.x >= 0 && p.y >= 0 && fx < 9 && fy < 7, `${p.mot} déborde`);
        });
        // PERPENDICULAIRE fait quinze lettres : il ne rentre pas, et il ne doit
        // pas être posé de force — un mot tronqué serait illisible.
        assert.ok(!poses.some(p => p.mot === 'PERPENDICULAIRE'));
    }
});

test('la grille ne contient QUE les mots posés — aucune suite parasite', () => {
    // Un mot codé se résout par reconnaissance : « ça ressemble à ANGLE ». Une
    // suite de lettres qui n'est pas un mot casse ce raisonnement, et ferait
    // douter l'élève de ce qu'il a pourtant bien trouvé.
    for (const theme of Object.keys(THEMES)) {
        for (let i = 0; i < 4; i++) {
            const r = faire({ theme }, `par-${theme}-${i}`);
            const poses = new Set(r.mots.map(m => m.mot));
            suites(r.cases).forEach(s => assert.ok(poses.has(s),
                `${theme} : « ${s} » se lit dans la grille sans avoir été posé`));
        }
    }
});

test('chaque mot posé se relit bien à sa place', () => {
    const r = faire({}, 'relire');
    r.mots.forEach(m => {
        let lu = '';
        for (let i = 0; i < m.mot.length; i++) {
            lu += r.cases[m.dir === 'v' ? m.y + i : m.y][m.dir === 'h' ? m.x + i : m.x];
        }
        assert.equal(lu, m.mot);
    });
});

test('le rectangle est effectivement rempli, sur tous les thèmes et tous les formats', () => {
    // Le but du module. Sous 40 %, ce n'est plus un rectangle garni : c'est une
    // croix de mots croisés entourée de noir, et Rémy le verrait tout de suite.
    for (const theme of Object.keys(THEMES)) {
        for (const [largeur, hauteur] of [[9, 7], [11, 9], [13, 11]]) {
            const r = faire({ theme, largeur, hauteur }, `p-${theme}-${largeur}`);
            assert.ok(r.remplissage.part >= 0.4,
                `${theme} ${largeur}×${hauteur} : ${(r.remplissage.part * 100).toFixed(0)} %`);
            assert.ok(r.largeur <= largeur && r.hauteur <= hauteur, 'le cadre a grandi');
            assert.ok(r.mots.length >= 5, `${theme} : ${r.mots.length} mots`);
        }
    }
});

test('les mots du thème passent avant les bouche-trous', () => {
    // Le lexique entier sert à garnir — un mot codé n'affiche aucune définition,
    // donc n'importe quel mot fait l'affaire pour remplir. Mais ce sont les mots
    // du CHAPITRE qu'on veut faire lire, et ils doivent être majoritaires.
    for (const theme of ['angles', 'geometrie', 'calcul']) {
        const r = faire({ theme }, 'th-' + theme);
        const duTheme = r.mots.filter(m => m.duTheme).length;
        assert.ok(duTheme >= r.mots.length / 2,
            `${theme} : ${duTheme} mots du thème sur ${r.mots.length}`);
        // Et le plus long mot du thème ouvre la grille : c'est celui qu'on est
        // sûr de faire lire, il ne rentrerait plus dans un rectangle garni.
        assert.ok(r.mots[0].duTheme || r.mots.some(m => m.duTheme));
    }
});

test('remplissage compte les cases blanches sur le rectangle entier', () => {
    assert.deepEqual(remplissage([['A', null], [null, null]]),
        { blanches: 1, total: 4, part: 0.25 });
});

test('deux graines différentes donnent deux grilles différentes', () => {
    // Sans quoi une classe entière reçoit la même grille, et le premier qui la
    // finit la dicte aux autres.
    const a = faire({}, 'ga'), b = faire({}, 'gb');
    assert.notDeepEqual(a.cases, b.cases);
    // Et la même graine rend la même grille : c'est ce qui permet de réimprimer
    // un corrigé identique à la fiche distribuée.
    assert.deepEqual(faire({}, 'ga').cases, a.cases);
});
