// TROIS JEUX À DEUX : la pipopipette, le puissance 4 et le sim.
//
// Rémy les a demandés l'un après l'autre. Ils n'ont l'air de rien et chacun
// cache une règle qui casse un moteur écrit trop vite :
//   · à la pipopipette, celui qui ferme un carré REJOUE — la main ne tourne
//     pas à chaque coup, et un négamax qui l'ignore joue contre lui-même ;
//   · au puissance 4, le jeton TOMBE — on ne choisit pas la case ;
//   · au sim, on PERD en fermant son triangle — le gagnant est l'autre.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import * as pipo from '../js/core/pipopipette.js';
import * as p4 from '../js/core/puissance4.js';
import * as sim from '../js/core/sim.js';
import { meilleurCoup } from '../js/core/ia.js';
import { makeRng } from '../js/core/ids.js';

// --- LA PIPOPIPETTE ----------------------------------------------------------

test('PIPOPIPETTE : fermer un carré le marque à son nom ET rend la main', () => {
    let p = pipo.creerPartie({ cols: 1, rows: 1 });
    // Trois côtés du carré unique, un par un : la main tourne à chaque fois.
    p = pipo.jouer(p, { t: 'h', x: 0, y: 0 }); assert.equal(p.trait, 'N');
    p = pipo.jouer(p, { t: 'h', x: 0, y: 1 }); assert.equal(p.trait, 'B');
    p = pipo.jouer(p, { t: 'v', x: 0, y: 0 }); assert.equal(p.trait, 'N');
    assert.equal(pipo.cotesPoses(p, 0, 0), 3);
    // Le quatrième ferme : N marque, et c'est ENCORE à N.
    p = pipo.jouer(p, { t: 'v', x: 1, y: 0 });
    assert.equal(p.cases[0][0], 'N');
    assert.deepEqual(p.score, { B: 0, N: 1 });
    assert.equal(p.trait, 'N', 'qui ferme rejoue');
    assert.deepEqual(pipo.terminee(p), { gagnant: 'N', raison: 'carrés' });
});

test('un trait peut fermer DEUX carrés d\'un coup', () => {
    let p = pipo.creerPartie({ cols: 1, rows: 2 });
    // On entoure les deux carrés en laissant le trait du milieu pour la fin.
    [{ t: 'h', x: 0, y: 0 }, { t: 'h', x: 0, y: 2 },
        { t: 'v', x: 0, y: 0 }, { t: 'v', x: 1, y: 0 },
        { t: 'v', x: 0, y: 1 }, { t: 'v', x: 1, y: 1 }].forEach(c => { p = pipo.jouer(p, c); });
    assert.equal(pipo.fermerait(p, { t: 'h', x: 0, y: 1 }).length, 2);
    const avant = p.trait;
    p = pipo.jouer(p, { t: 'h', x: 0, y: 1 });
    assert.equal(p.score[avant], 2);
});

test('un état n\'est jamais modifié : l\'IA peut explorer sans rien casser', () => {
    const p = pipo.creerPartie({ cols: 2, rows: 2 });
    const avant = JSON.stringify(p);
    pipo.jouer(p, { t: 'h', x: 0, y: 0 });
    pipo.jouer(p, { t: 'v', x: 1, y: 1 });
    assert.equal(JSON.stringify(p), avant);
});

test('LA PARTIE VA TOUJOURS À SON TERME, et tous les carrés trouvent preneur', () => {
    for (const taille of ['petit', 'moyen']) {
        const rng = makeRng(`pipo-${taille}`);
        let p = pipo.creerPartie({ taille });
        const total = p.cols * p.rows;
        let tours = 0;
        while (!pipo.terminee(p) && tours < 400) {
            const r = meilleurCoup(pipo.JEU, p, { profondeur: 2, rng });
            assert.ok(r, 'aucun coup alors que la partie n\'est pas finie');
            p = pipo.jouer(p, r.coup);
            tours++;
        }
        const fin = pipo.terminee(p);
        assert.ok(fin, `${taille} : la partie ne se termine pas`);
        assert.equal(p.score.B + p.score.N, total, `${taille} : des carrés sans propriétaire`);
        assert.equal(pipo.coups(p).length, 0, `${taille} : des traits restants`);
    }
});

test('L\'IA PREND UN CARRÉ QU\'ON LUI OFFRE — sinon elle n\'a rien compris', () => {
    // Un carré à trois côtés, et un autre trait neutre ailleurs : le bon coup
    // ne fait aucun doute. C'est le test qui échouait quand le négamax niait
    // le score d'un coup qui garde la main.
    let p = pipo.creerPartie({ cols: 3, rows: 1 });
    [{ t: 'h', x: 0, y: 0 }, { t: 'h', x: 0, y: 1 }, { t: 'v', x: 0, y: 0 }].forEach(c => {
        p = pipo.jouer(p, c);
    });
    p = { ...p, trait: 'B' };
    assert.equal(pipo.cotesPoses(p, 0, 0), 3);
    const r = meilleurCoup(pipo.JEU, p, { profondeur: 3, rng: makeRng('offre') });
    assert.deepEqual({ t: r.coup.t, x: r.coup.x, y: r.coup.y }, { t: 'v', x: 1, y: 0 },
        'l\'IA doit fermer le carré qu\'on lui tend');
});

test('une chaîne ouverte se compte : ce n\'est pas un carré qu\'on donne', () => {
    // Trois carrés en file, chacun à deux côtés : ouvrir la file les donne
    // tous les trois. C'est le calcul que le jeu demande.
    let p = pipo.creerPartie({ cols: 3, rows: 1 });
    // Les six traits horizontaux : chaque carré a son haut et son bas, donc
    // deux côtés. Aucun n'est encore donné.
    [{ t: 'h', x: 0, y: 0 }, { t: 'h', x: 1, y: 0 }, { t: 'h', x: 2, y: 0 },
        { t: 'h', x: 0, y: 1 }, { t: 'h', x: 1, y: 1 }, { t: 'h', x: 2, y: 1 }]
        .forEach(c => { p = pipo.jouer(p, c); });
    [0, 1, 2].forEach(x => assert.equal(pipo.cotesPoses(p, x, 0), 2));
    // Poser un trait à l'extrémité ouvre TOUTE la file : trois carrés d'un
    // coup, pas un. C'est le calcul que le jeu demande.
    assert.equal(pipo.longueurChaine(p, { t: 'v', x: 0, y: 0 }), 3);
    assert.equal(pipo.longueurChaine(p, { t: 'v', x: 3, y: 0 }), 3);
    // Et un trait au MILIEU ne sauve rien : il ouvre deux carrés d'un coup,
    // et le second ramassage rouvre le troisième. Dans une file de trois, il
    // n'y a aucun endroit où poser sans tout donner — c'est précisément ce
    // qu'un élève découvre en perdant la partie.
    assert.equal(pipo.longueurChaine(p, { t: 'v', x: 1, y: 0 }), 3);
});

// --- LE PUISSANCE 4 ----------------------------------------------------------

test('PUISSANCE 4 : le jeton tombe au fond de la colonne', () => {
    let p = p4.creerPartie();
    assert.equal(p4.chute(p, 3), p.rows - 1);
    p = p4.jouer(p, 3);
    assert.equal(p.grille[p.rows - 1][3], 'B');
    assert.equal(p4.chute(p, 3), p.rows - 2);
    assert.equal(p.trait, 'N');
});

test('une colonne pleine n\'est plus jouable', () => {
    let p = p4.creerPartie({ cols: 3, rows: 2 });
    p = p4.jouer(p, 0); p = p4.jouer(p, 0);
    assert.equal(p4.chute(p, 0), -1);
    assert.deepEqual(p4.coups(p), [1, 2]);
});

test('QUATRE ALIGNÉS GAGNENT — dans les quatre directions', () => {
    // Horizontal.
    let h = p4.creerPartie();
    [0, 0, 1, 1, 2, 2, 3].forEach(x => { h = p4.jouer(h, x); });
    assert.equal(p4.terminee(h).gagnant, 'B');
    assert.equal(h.alignement.cases.length, 4);
    // Vertical.
    let v = p4.creerPartie();
    [2, 3, 2, 3, 2, 3, 2].forEach(x => { v = p4.jouer(v, x); });
    assert.equal(p4.terminee(v).gagnant, 'B');
    // Diagonale montante.
    let d = p4.creerPartie();
    [0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3].forEach(x => { d = p4.jouer(d, x); });
    assert.equal(p4.terminee(d).gagnant, 'B');
});

test('une grille pleine sans alignement est une égalité', () => {
    // Deux colonnes de deux : aucun alignement de quatre n'est possible.
    let p = p4.creerPartie({ cols: 2, rows: 2 });
    [0, 0, 1, 1].forEach(x => { p = p4.jouer(p, x); });
    assert.deepEqual(p4.terminee(p), { gagnant: null, raison: 'grille pleine' });
    assert.deepEqual(p4.coups(p), []);
});

test('L\'IA VOIT LE COUP QUI GAGNE, et celui qu\'il faut empêcher', () => {
    // Trois jetons alignés pour B, à B de jouer : il complète.
    let p = p4.creerPartie();
    [0, 6, 1, 6, 2, 5].forEach(x => { p = p4.jouer(p, x); });
    assert.equal(p4.coupGagnant(p, 'B'), 3);
    const gagne = meilleurCoup(p4.JEU, p, { profondeur: 4, rng: makeRng('g') });
    assert.equal(gagne.coup, 3, 'l\'IA doit conclure');

    // Trois jetons alignés pour l'ADVERSAIRE, à moi de jouer : je bloque.
    let q = p4.creerPartie();
    [6, 0, 5, 1, 6, 2].forEach(x => { q = p4.jouer(q, x); });
    assert.equal(q.trait, 'B');
    assert.equal(p4.coupGagnant(q, 'N'), 3, 'N gagnerait en 3');
    const bloque = meilleurCoup(p4.JEU, q, { profondeur: 4, rng: makeRng('b') });
    assert.equal(bloque.coup, 3, 'l\'IA doit bloquer');
});

test('une partie complète entre deux IA se termine', () => {
    const rng = makeRng('p4');
    let p = p4.creerPartie();
    let tours = 0;
    while (!p4.terminee(p) && tours < 60) {
        const r = meilleurCoup(p4.JEU, p, { profondeur: 3, rng });
        assert.ok(r);
        p = p4.jouer(p, r.coup);
        tours++;
    }
    assert.ok(p4.terminee(p), 'la partie doit finir');
    assert.ok(tours <= p.cols * p.rows);
});

// --- LE SIM ------------------------------------------------------------------

test('SIM : quinze arêtes, vingt triangles', () => {
    assert.equal(sim.ARETES.length, 15);
    assert.equal(sim.TRIANGLES.length, 20);
    // Chaque triangle porte trois arêtes distinctes et existantes.
    sim.TRIANGLES.forEach(t => {
        assert.equal(new Set(t.aretes).size, 3);
        t.aretes.forEach(a => assert.ok(a >= 0 && a < 15));
    });
    assert.equal(sim.indiceArete(0, 1), sim.indiceArete(1, 0), 'l\'arête n\'a pas de sens');
});

test('ON PERD EN FERMANT SON PROPRE TRIANGLE — le gagnant est l\'autre', () => {
    let p = sim.creerPartie();
    const t = sim.TRIANGLES[0];
    // B prend les trois arêtes du triangle, N joue ailleurs entre-temps.
    const ailleurs = sim.ARETES.map((_, i) => i).filter(i => !t.aretes.includes(i));
    p = sim.jouer(p, t.aretes[0]);
    p = sim.jouer(p, ailleurs[0]);
    p = sim.jouer(p, t.aretes[1]);
    p = sim.jouer(p, ailleurs[1]);
    assert.equal(sim.terminee(p), null);
    p = sim.jouer(p, t.aretes[2]);
    const fin = sim.terminee(p);
    assert.equal(fin.gagnant, 'N', 'celui qui ferme son triangle PERD');
    assert.deepEqual(fin.triangle.points, t.points);
});

test('un triangle formé de deux couleurs ne tue personne', () => {
    let p = sim.creerPartie();
    const t = sim.TRIANGLES[0];
    p = sim.jouer(p, t.aretes[0]);   // B
    p = sim.jouer(p, t.aretes[1]);   // N
    p = sim.jouer(p, t.aretes[2]);   // B
    assert.equal(sim.terminee(p), null);
});

test('LES ARÊTES MORTELLES SE COMPTENT — c\'est le calcul du jeu', () => {
    let p = sim.creerPartie();
    const t = sim.TRIANGLES[0];
    const ailleurs = sim.ARETES.map((_, i) => i).filter(i => !t.aretes.includes(i));
    p = sim.jouer(p, t.aretes[0]);   // B
    p = sim.jouer(p, ailleurs[0]);   // N
    p = sim.jouer(p, t.aretes[1]);   // B
    // Pour B, la troisième arête du triangle est maintenant mortelle.
    assert.ok(sim.aretesMortelles({ ...p, trait: 'B' }).includes(t.aretes[2]));
    assert.ok(!sim.aretesMortelles({ ...p, trait: 'N' }).includes(t.aretes[2]));
});

test('RAMSEY : une partie de sim ne peut pas finir par un match nul', () => {
    // R(3,3) = 6 : sur les quinze arêtes d'un hexagone complet coloriées de
    // deux couleurs, un triangle monochrome est INÉVITABLE. Cent parties
    // jouées au hasard le constatent — et c'est un résultat qu'un élève peut
    // vérifier lui-même, quinze traits à la main.
    for (let g = 0; g < 100; g++) {
        const rng = makeRng(`sim${g}`);
        let p = sim.creerPartie();
        let tours = 0;
        while (!sim.terminee(p) && tours < 20) {
            const libres = sim.coups(p);
            p = sim.jouer(p, libres[Math.floor(rng.next() * libres.length)]);
            tours++;
        }
        const fin = sim.terminee(p);
        assert.ok(fin, `partie ${g} : pas de fin`);
        assert.notEqual(fin.gagnant, null, `partie ${g} : match nul, ce qui est impossible`);
        assert.equal(fin.raison, 'triangle');
    }
});

test('L\'IA NE SE SUICIDE PAS quand il lui reste un coup sûr', () => {
    // Une position où une seule arête est mortelle pour le joueur au trait.
    let p = sim.creerPartie();
    const t = sim.TRIANGLES[0];
    const ailleurs = sim.ARETES.map((_, i) => i).filter(i => !t.aretes.includes(i));
    p = sim.jouer(p, t.aretes[0]);   // B
    p = sim.jouer(p, ailleurs[0]);   // N
    p = sim.jouer(p, t.aretes[1]);   // B
    p = sim.jouer(p, ailleurs[1]);   // N — à B de jouer
    const mortelles = sim.aretesMortelles(p, 'B');
    assert.ok(mortelles.length && mortelles.length < sim.coups(p).length);
    const r = meilleurCoup(sim.JEU, p, { profondeur: 4, rng: makeRng('vie') });
    assert.ok(!mortelles.includes(r.coup), 'l\'IA a choisi une arête qui la tue');
});

test('une partie complète entre deux IA se termine par un triangle', () => {
    const rng = makeRng('simia');
    let p = sim.creerPartie();
    let tours = 0;
    while (!sim.terminee(p) && tours < 20) {
        const r = meilleurCoup(sim.JEU, p, { profondeur: 4, rng });
        assert.ok(r);
        p = sim.jouer(p, r.coup);
        tours++;
    }
    const fin = sim.terminee(p);
    assert.equal(fin.raison, 'triangle');
    assert.ok(fin.gagnant === 'B' || fin.gagnant === 'N');
});

test('les six points forment bien un hexagone régulier', () => {
    const pts = sim.positions(100, 0, 0);
    assert.equal(pts.length, 6);
    pts.forEach(p => assert.ok(Math.abs(Math.hypot(p.x, p.y) - 100) < 1e-6));
    // Deux points voisins sont à la même distance que le rayon : c'est la
    // propriété de l'hexagone régulier.
    const d = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    assert.ok(Math.abs(d - 100) < 1e-6);
});
