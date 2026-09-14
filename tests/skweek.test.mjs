// Skweek : on peut toujours tout repeindre sans marcher sur une erreur.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    TROU, BLEUE, ROSE, CASSEE, REGLES, regleDe, NIVEAUX, niveauDe,
    calculPour, genererNiveau, caseDe, praticable, deplacer, avancerEnnemis,
    toucheJoueur, tirer, avancerTirs, avancement, accessibles, viser
} from '../js/core/skweek.js';
import { makeRng } from '../js/core/ids.js';

test('chaque calcul d\'une dalle vaut bien ce qu\'il annonce', () => {
    // Une dalle qui mentirait sur sa valeur rendrait le tri impossible : c'est
    // la promesse de base du sol.
    const rng = makeRng('calc');
    for (let v = 2; v <= 60; v++) {
        for (let k = 0; k < 4; k++) {
            const texte = calculPour(v, rng);
            const [, a, op, b] = /^(\d+) ([+×−]) (\d+)$/.exec(texte) || [];
            assert.ok(a, `écriture illisible : « ${texte} »`);
            const calc = op === '+' ? Number(a) + Number(b)
                : op === '×' ? Number(a) * Number(b) : Number(a) - Number(b);
            assert.equal(calc, v, `« ${texte} » ne vaut pas ${v}`);
        }
    }
});

test('une dalle à peindre vérifie la règle, une dalle piégée ne la vérifie pas', () => {
    for (const niv of NIVEAUX) {
        const e = genererNiveau({ niveau: niv.id }, makeRng(`r${niv.id}`));
        const regle = regleDe(niv.regle);
        e.cases.forEach((c, i) => {
            if (c.etat === TROU) return;
            assert.equal(regle.test(c.valeur), !!c.bonne,
                `niveau ${niv.id}, case ${i} : ${c.calcul} = ${c.valeur} et bonne=${c.bonne}`);
        });
    }
});

test('les dalles à repeindre forment UNE région, atteignable depuis le départ', () => {
    // C'est l'exigence qui rend le jeu jouable : un élève prudent peut finir
    // sans casser une seule dalle. Un îlot séparé rendrait le niveau perdu
    // d'avance.
    for (const niv of NIVEAUX) {
        for (let g = 0; g < 4; g++) {
            const e = genererNiveau({ niveau: niv.id }, makeRng(`c${niv.id}-${g}`));
            assert.ok(e.aRepeindre > 10, `niveau ${niv.id} : trop peu de dalles`);
            // Skweek a déjà peint la dalle sous ses pieds ; tout le reste
            // doit être atteignable sans traverser une seule mauvaise dalle.
            assert.equal(accessibles(e).length, e.aRepeindre - e.repeintes,
                `niveau ${niv.id}, graine ${g} : région coupée en deux`);
        }
    }
});

test('marcher sur une bonne dalle la repeint, une seule fois', () => {
    const e = genererNiveau({ niveau: 1 }, makeRng('peint'));
    // On cherche une bonne dalle voisine du départ.
    const voisines = ['droite', 'gauche', 'haut', 'bas'];
    const dir = voisines.find(d => {
        const dd = { droite: [1, 0], gauche: [-1, 0], haut: [0, -1], bas: [0, 1] }[d];
        const c = caseDe(e, e.joueur.x + dd[0], e.joueur.y + dd[1]);
        return c && c.bonne && c.etat === BLEUE;
    });
    assert.ok(dir, 'le départ doit toucher au moins une dalle à repeindre');
    const avant = e.repeintes;
    const r1 = deplacer(e, dir);
    assert.ok(r1.bouge && r1.peint);
    assert.equal(e.repeintes, avant + 1);
    assert.equal(r1.case.etat, ROSE);
    // On revient, on repasse : la dalle est déjà rose, rien ne s'ajoute.
    const inverse = { droite: 'gauche', gauche: 'droite', haut: 'bas', bas: 'haut' }[dir];
    deplacer(e, inverse);
    const r2 = deplacer(e, dir);
    assert.ok(r2.bouge && !r2.peint);
    assert.equal(e.repeintes, avant + 1, 'une dalle ne compte qu\'une fois');
});

test('marcher sur une mauvaise dalle la casse, et Skweek ne tombe pas dedans', () => {
    const e = genererNiveau({ niveau: 2 }, makeRng('casse'));
    // Une dalle piégée voisine : on la cherche en promenant Skweek.
    let trouve = null;
    for (let x = 0; x < e.cols && !trouve; x++) for (let y = 0; y < e.lignes && !trouve; y++) {
        const c = caseDe(e, x, y);
        if (!c || c.etat !== BLEUE || c.bonne) continue;
        for (const [d, dd] of Object.entries({ droite: [1, 0], gauche: [-1, 0], haut: [0, -1], bas: [0, 1] })) {
            if (praticable(e, x - dd[0], y - dd[1])) { trouve = { x: x - dd[0], y: y - dd[1], dir: d, cible: c }; break; }
        }
    }
    assert.ok(trouve, 'un niveau doit avoir des dalles piégées');
    e.joueur.x = trouve.x; e.joueur.y = trouve.y;
    const r = deplacer(e, trouve.dir);
    assert.ok(r.casse);
    assert.equal(trouve.cible.etat, CASSEE);
    assert.equal(e.joueur.x, trouve.x, 'Skweek reste où il était');
    assert.equal(e.joueur.y, trouve.y);
    assert.ok(!praticable(e, trouve.cible === caseDe(e, e.joueur.x, e.joueur.y) ? -1 : e.joueur.x, -1));
});

test('on ne marche ni hors du terrain ni dans un trou', () => {
    const e = genererNiveau({ niveau: 1 }, makeRng('mur'));
    e.joueur.x = 0; e.joueur.y = 0;
    const r = deplacer(e, 'gauche');
    assert.ok(!r.bouge && r.mur);
    assert.equal(e.joueur.x, 0);
});

test('le niveau se gagne quand toutes les bonnes dalles sont roses', () => {
    // On repeint tout à la main : le drapeau de victoire doit tomber à la
    // dernière, pas avant.
    const e = genererNiveau({ niveau: 1 }, makeRng('gagne'));
    let gagne = e.repeintes >= e.aRepeindre;
    e.cases.forEach(c => {
        if (!c.bonne || c.etat === ROSE) return;
        c.etat = ROSE;
        e.repeintes++;
        if (e.repeintes >= e.aRepeindre) gagne = true;
        else assert.ok(!gagne);
    });
    assert.ok(gagne);
    assert.equal(avancement(e), 100);
});

test('pas de blobs sans le réglage : c\'est le défaut demandé', () => {
    const e = genererNiveau({ niveau: 6 }, makeRng('enn'));
    assert.equal(e.ennemis.length, 0);
});

test('les ennemis restent sur le terrain praticable', () => {
    const e = genererNiveau({ niveau: 6, ennemis: 'oui' }, makeRng('enn'));
    const rng = makeRng('pas');
    assert.ok(e.ennemis.length >= 2);
    for (let t = 0; t < 500; t++) {
        avancerEnnemis(e, rng);
        e.ennemis.forEach(en => assert.ok(praticable(e, en.x, en.y),
            `ennemi hors piste en ${en.x},${en.y}`));
    }
});

test('un tir file tout droit et retire l\'ennemi touché', () => {
    const e = genererNiveau({ niveau: 3, ennemis: 'oui' }, makeRng('tir'));
    // On place un ennemi juste à droite, dans une ligne praticable.
    let x = e.joueur.x;
    while (praticable(e, x + 1, e.joueur.y) && x < e.joueur.x + 3) x++;
    assert.ok(x > e.joueur.x, 'il faut de la place à droite');
    e.ennemis = [{ x, y: e.joueur.y, dx: 0, dy: 0 }];
    e.joueur.dir = 'droite';
    tirer(e);
    let touches = 0;
    for (let k = 0; k < 6 && !touches; k++) touches += avancerTirs(e);
    assert.equal(touches, 1);
    assert.equal(e.ennemis.length, 0);
});

test('un ennemi sur Skweek se voit', () => {
    const e = genererNiveau({ niveau: 2 }, makeRng('touche'));
    assert.ok(!toucheJoueur(e), 'les ennemis démarrent loin');
    e.ennemis.push({ x: e.joueur.x, y: e.joueur.y, dx: 0, dy: 0 });
    assert.ok(toucheJoueur(e));
});

test('six niveaux, des règles toutes différentes', () => {
    assert.equal(NIVEAUX.length, 6);
    assert.equal(new Set(NIVEAUX.map(n => n.regle)).size, 6);
    NIVEAUX.forEach(n => assert.ok(regleDe(n.regle).consigne.length > 5));
    assert.equal(niveauDe(99).id, 1, 'niveau inconnu : on repart du premier');
    // Chaque règle sait trier.
    REGLES.forEach(r => assert.equal(typeof r.test(12), 'boolean'));
});

test('le même tirage donne le même niveau', () => {
    const a = genererNiveau({ niveau: 4 }, makeRng('st'));
    const b = genererNiveau({ niveau: 4 }, makeRng('st'));
    assert.deepEqual(a.cases.map(c => c.calcul), b.cases.map(c => c.calcul));
    assert.deepEqual(a.joueur, b.joueur);
});

// --- Viser sans avancer -----------------------------------------------------

test('VISER TOURNE LA TÊTE ET NE FAIT PAS UN PAS', () => {
    // C'est toute la raison d'être du geste : on choisit sa direction de tir
    // sans repeindre au passage une dalle qu'on n'avait pas décidé de trier.
    const e = genererNiveau({ niveau: 1, cols: 8, lignes: 8 }, makeRng('vise'));
    const avant = { ...e.joueur };
    const peintes = e.repeintes;
    assert.equal(viser(e, 'haut'), true);
    assert.equal(e.joueur.dir, 'haut');
    assert.equal(e.joueur.x, avant.x, 'le peintre a bougé en visant');
    assert.equal(e.joueur.y, avant.y, 'le peintre a bougé en visant');
    assert.equal(e.repeintes, peintes, 'une dalle a été repeinte en visant');
    // Et le tir part bien dans la direction visée, pas dans celle du dernier pas.
    tirer(e);
    assert.deepEqual([e.tirs[0].dx, e.tirs[0].dy], [0, -1]);
});

test('une direction inconnue ne vise rien', () => {
    const e = genererNiveau({ niveau: 1, cols: 8, lignes: 8 }, makeRng('vise2'));
    const dir = e.joueur.dir;
    assert.equal(viser(e, 'nulle-part'), false);
    assert.equal(e.joueur.dir, dir);
});
