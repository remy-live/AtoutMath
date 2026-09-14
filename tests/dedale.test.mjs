import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    FORMES, NOMS_FORMES, DESSINS, NOMS_DESSINS, cle, arete, VOISINS,
    cellulesDeForme, creerDedale, creerDedaleDessin, cellulesDeDessin,
    traitSimple, boiteDessin, ouvert, sorties, chemin, laPlusLoin, avancer, partDessin
} from '../js/core/dedale.js';

/**
 * L'INVARIANT CENTRAL : le graphe des passages est un ARBRE couvrant.
 * Autant d'arêtes que de cases moins une, et tout se rejoint. Sans cela, il
 * existe un second chemin — donc un raccourci qui saute le dessin.
 */
function estUnArbre(e, message) {
    const n = e.dans.size;
    assert.equal(e.passages.size, n - 1,
        `${message} : ${e.passages.size} passages pour ${n} cases (il en faut ${n - 1})`);
    // Et tout est atteignable depuis le départ : arêtes + connexité = arbre.
    const vus = new Set([cle(e.depart[0], e.depart[1])]);
    const pile = [e.depart];
    while (pile.length) {
        const c = pile.pop();
        for (const s of sorties(e, c)) {
            const k = cle(s[0], s[1]);
            if (vus.has(k)) continue;
            vus.add(k); pile.push(s);
        }
    }
    assert.equal(vus.size, n, `${message} : ${n - vus.size} case(s) inaccessibles`);
}

// --- Les formes -------------------------------------------------------------------

test('chaque forme retient des cases, et elles se tiennent toutes', () => {
    for (const nom of NOMS_FORMES) {
        const dans = cellulesDeForme(nom, 15, 15);
        assert.ok(dans.size > 30, `${nom} : seulement ${dans.size} cases`);
        assert.ok(dans.size <= 225);
        // D'UN SEUL TENANT : une étoile laisse des îlots que le masque retient
        // mais qu'aucun chemin n'atteint. On ne garde que le gros morceau.
        const dep = [...dans][0].split(',').map(Number);
        const vus = new Set([cle(dep[0], dep[1])]);
        const pile = [dep];
        while (pile.length) {
            const [x, y] = pile.pop();
            for (const [dx, dy] of VOISINS) {
                const k = cle(x + dx, y + dy);
                if (!dans.has(k) || vus.has(k)) continue;
                vus.add(k); pile.push([x + dx, y + dy]);
            }
        }
        assert.equal(vus.size, dans.size, `${nom} : la forme est en morceaux`);
    }
});

test('les formes ne se ressemblent pas — le masque sert vraiment', () => {
    const tailles = NOMS_FORMES.map(n => cellulesDeForme(n, 15, 15).size);
    assert.equal(cellulesDeForme('rectangle', 15, 15).size, 225);
    // Un rond, un losange et une étoile n'occupent pas la même surface.
    assert.ok(new Set(tailles).size >= 4, `des formes identiques : ${tailles}`);
    assert.ok(cellulesDeForme('losange', 15, 15).size < cellulesDeForme('rond', 15, 15).size);
});

// --- Le dédale de forme -------------------------------------------------------------

test('un dédale de forme est un labyrinthe PARFAIT', () => {
    for (const nom of NOMS_FORMES) {
        for (let i = 0; i < 8; i++) {
            const e = creerDedale({ rng: makeRng(`d_${nom}_${i}`), forme: nom, cols: 15, lignes: 15 });
            estUnArbre(e, `${nom} #${i}`);
        }
    }
});

test('le départ et l\'arrivée sont les deux cases les plus éloignées', () => {
    for (let i = 0; i < 20; i++) {
        const e = creerDedale({ rng: makeRng('loin' + i), forme: 'rond', cols: 15, lignes: 15 });
        // Un labyrinthe qui se finit en trois pas n'est pas un labyrinthe.
        assert.ok(e.solution.length > 10, `solution de ${e.solution.length} cases`);
        // Et rien n'est plus loin du départ que l'arrivée.
        assert.equal(laPlusLoin(e, e.depart).distance, e.solution.length - 1);
    }
});

test('la solution est un vrai chemin : des cases voisines, et des passages ouverts', () => {
    const e = creerDedale({ rng: makeRng('sol'), forme: 'coeur', cols: 17, lignes: 15 });
    for (let i = 1; i < e.solution.length; i++) {
        const a = e.solution[i - 1], b = e.solution[i];
        assert.equal(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]), 1, 'un saut dans la solution');
        assert.ok(ouvert(e, a, b), 'la solution traverse un mur');
    }
});

// --- Les dessins ----------------------------------------------------------------------

test('AUCUN DESSIN NE SE RECOUPE — sinon la solution ne serait plus unique', () => {
    // Un trait qui repasse sur une case déjà tracée ferait un cycle : le
    // labyrinthe cesserait d'être un arbre, et l'on pourrait « finir » par un
    // raccourci sans avoir dessiné.
    for (const nom of NOMS_DESSINS) {
        assert.equal(traitSimple(nom), true, `« ${DESSINS[nom].nom} » se recoupe`);
    }
});

test('chaque dessin avance de case en case, sans saut', () => {
    for (const nom of NOMS_DESSINS) {
        const cases = cellulesDeDessin(nom);
        assert.ok(cases.length >= 12, `« ${nom} » est trop court : ${cases.length} cases`);
        for (let i = 1; i < cases.length; i++) {
            const d = Math.abs(cases[i][0] - cases[i - 1][0]) + Math.abs(cases[i][1] - cases[i - 1][1]);
            assert.equal(d, 1, `« ${nom} » saute entre ${cases[i - 1]} et ${cases[i]}`);
        }
    }
});

test('les dessins tiennent dans une grille jouable', () => {
    for (const nom of NOMS_DESSINS) {
        const b = boiteDessin(nom);
        assert.ok(b.x1 - b.x0 <= 20 && b.y1 - b.y0 <= 16,
            `« ${nom} » déborde : ${b.x1 - b.x0 + 1} × ${b.y1 - b.y0 + 1}`);
    }
});

// --- Le dédale qui dessine --------------------------------------------------------------

test('LE CHEMIN UNIQUE EST EXACTEMENT LE DESSIN', () => {
    // C'est toute la promesse du jeu : arriver au bout, c'est avoir dessiné.
    for (const nom of NOMS_DESSINS) {
        for (let i = 0; i < 10; i++) {
            const e = creerDedaleDessin({ rng: makeRng(`dd_${nom}_${i}`), dessin: nom });
            estUnArbre(e, `dessin ${nom} #${i}`);
            assert.deepEqual(e.solution, e.dessin.cases,
                `« ${DESSINS[nom].nom} » : la solution n'est pas le dessin`);
        }
    }
});

test('le dessin est entouré d\'impasses : il ne se lit pas d\'un coup d\'œil', () => {
    for (let i = 0; i < 10; i++) {
        const e = creerDedaleDessin({ rng: makeRng('marge' + i), dessin: 'zigzag', marge: 2 });
        // Il y a nettement plus de cases que de dessin — le reste, ce sont les
        // fausses pistes.
        assert.ok(e.dans.size > e.dessin.cases.length * 1.6,
            `${e.dans.size} cases pour un dessin de ${e.dessin.cases.length}`);
        // Et ces cases-là sont bien des impasses : elles ne raccourcissent rien.
        assert.equal(chemin(e, e.depart, e.arrivee).length, e.dessin.cases.length);
    }
});

test('la marge se règle, et zéro marge donne le dessin nu', () => {
    const nu = creerDedaleDessin({ rng: makeRng('nu'), dessin: 'marches', marge: 0 });
    assert.deepEqual(nu.solution, nu.dessin.cases);
    const large = creerDedaleDessin({ rng: makeRng('large'), dessin: 'marches', marge: 3 });
    assert.ok(large.dans.size > nu.dans.size);
});

// --- Le déplacement -----------------------------------------------------------------------

test('on ne traverse pas les murs, et l\'arrivée est annoncée', () => {
    const e = creerDedaleDessin({ rng: makeRng('pas'), dessin: 'marches' });
    let pos = e.depart;
    let murs = 0;
    // On suit la solution : chaque pas doit passer.
    for (let i = 1; i < e.solution.length; i++) {
        const [dx, dy] = [e.solution[i][0] - pos[0], e.solution[i][1] - pos[1]];
        const sens = dx === 1 ? 'd' : dx === -1 ? 'g' : dy === 1 ? 'b' : 'h';
        const r = avancer(e, pos, sens);
        assert.equal(r.ok, true, `pas ${i} refusé`);
        pos = r.position;
        if (i === e.solution.length - 1) assert.equal(r.arrive, true, 'arrivée non annoncée');
        else assert.ok(!r.arrive, 'arrivée annoncée trop tôt');
    }
    // LE MUR EST LA RÈGLE, PAS UNE STATISTIQUE : depuis n'importe quelle case,
    // une direction passe si et seulement si le passage y est ouvert.
    // (J'avais d'abord exigé que le départ soit un couloir étroit — c'est faux
    // ET c'est dommage : des impasses greffées dès la première case rendent le
    // tout premier choix réel au lieu d'être forcé.)
    for (const c of e.solution) {
        for (const [sens, [dx, dy]] of Object.entries(
            { d: [1, 0], g: [-1, 0], h: [0, -1], b: [0, 1] })) {
            const n = [c[0] + dx, c[1] + dy];
            const permis = e.dans.has(cle(n[0], n[1])) && ouvert(e, c, n);
            assert.equal(avancer(e, c, sens).ok, permis,
                `en ${c} vers ${sens} : le passage et le pas ne disent pas la même chose`);
            if (!permis) murs++;
        }
    }
    assert.ok(murs > 0, 'aucun mur dans tout le labyrinthe');
    assert.equal(avancer(e, e.depart, 'x').ok, false, 'une direction inconnue passe');
});

test('la part de dessin parcourue se compte', () => {
    const e = creerDedaleDessin({ rng: makeRng('part'), dessin: 'marches' });
    assert.equal(partDessin(e, new Set()), 0);
    const combien = Math.round(e.dessin.cases.length / 2);
    const moitie = new Set(e.dessin.cases.slice(0, combien).map(c => cle(c[0], c[1])));
    assert.equal(partDessin(e, moitie),
        Math.round((combien / e.dessin.cases.length) * 100));
    assert.equal(partDessin(e, new Set(e.dessin.cases.map(c => cle(c[0], c[1])))), 100);
    // Un dédale de forme n'a pas de dessin : la part vaut zéro, pas « NaN ».
    assert.equal(partDessin(creerDedale({ rng: makeRng('f'), forme: 'rond' }), new Set()), 0);
});

test('la même graine redonne exactement le même dédale', () => {
    const a = creerDedale({ rng: makeRng('g'), forme: 'etoile', cols: 15, lignes: 15 });
    const b = creerDedale({ rng: makeRng('g'), forme: 'etoile', cols: 15, lignes: 15 });
    assert.deepEqual([...a.passages].sort(), [...b.passages].sort());
    assert.deepEqual(a.depart, b.depart);
    assert.deepEqual(a.solution, b.solution);
});

test('l\'arête s\'écrit pareil dans les deux sens', () => {
    assert.equal(arete([1, 2], [1, 3]), arete([1, 3], [1, 2]));
    assert.notEqual(arete([1, 2], [1, 3]), arete([1, 2], [2, 2]));
});
