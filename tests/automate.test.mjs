import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    derouler, jugerGeste, jugerArrivee, tirerProgramme, tailleProgramme,
    direBloc, CAPS, tourner
} from '../js/core/automate.js';
import { makeRng } from '../js/core/ids.js';

const G = { cols: 5, rows: 5 };
const DEPART = { x: 2, y: 2, cap: 'N' };

test('un programme sans boucle se déroule pas à pas, dans l\'ordre', () => {
    const prog = [{ type: 'avance', n: 2 }, { type: 'droite' }, { type: 'avance', n: 1 }];
    const d = derouler(prog, DEPART, G);
    assert.equal(d.pas.length, 3);
    // Nord = vers le haut : y diminue.
    assert.deepEqual({ x: d.pas[0].apres.x, y: d.pas[0].apres.y }, { x: 2, y: 0 });
    assert.equal(d.pas[1].apres.cap, 'E');
    assert.deepEqual({ x: d.fin.x, y: d.fin.y, cap: d.fin.cap }, { x: 3, y: 0, cap: 'E' });
    assert.equal(d.hors, false);
});

test('une boucle produit AUTANT de pas que de tours, pas un de plus', () => {
    // Le cœur de l'exercice : « répéter 3 fois » ne recopie pas le corps plus
    // bas, il y revient. Trois tours de deux blocs, c'est six pas.
    const prog = [{ type: 'repete', n: 3, corps: [{ type: 'avance', n: 1 }, { type: 'droite' }] }];
    const d = derouler(prog, DEPART, G);
    assert.equal(d.pas.length, 6);
    assert.equal(tailleProgramme(prog), 3, 'trois blocs ÉCRITS, six pas exécutés');
    // Et le compteur de tours suit.
    assert.deepEqual(d.pas.map(p => p.tours[0].tour), [1, 1, 2, 2, 3, 3]);
    assert.deepEqual(d.pas.map(p => p.tours[0].total), [3, 3, 3, 3, 3, 3]);
});

test('chaque pas sait de QUEL bloc il vient', () => {
    const prog = [
        { type: 'avance', n: 1 },
        { type: 'repete', n: 2, corps: [{ type: 'droite' }, { type: 'avance', n: 1 }] }
    ];
    const d = derouler(prog, DEPART, G);
    assert.deepEqual(d.pas.map(p => p.chemin), [[0], [1, 0], [1, 1], [1, 0], [1, 1]]);
    // Le bloc de tête n'est dans aucune boucle.
    assert.deepEqual(d.pas[0].tours, []);
});

test('un carré se referme : quatre fois « avance puis tourne » ramène au départ', () => {
    const prog = [{ type: 'repete', n: 4, corps: [{ type: 'avance', n: 1 }, { type: 'droite' }] }];
    const d = derouler(prog, { x: 2, y: 2, cap: 'N' }, G);
    assert.deepEqual({ x: d.fin.x, y: d.fin.y, cap: d.fin.cap }, { x: 2, y: 2, cap: 'N' });
});

test('sortir de la grille est signalé, pas rattrapé en douce', () => {
    // Rattraper (« le robot se cogne et s'arrête ») inventerait une règle que
    // l'élève n'a pas apprise : il aurait tort en ayant raison.
    const d = derouler([{ type: 'avance', n: 9 }], DEPART, G);
    assert.equal(d.hors, true);
});

test('poser deux fois au même endroit ne fait qu\'une pastille', () => {
    const prog = [{ type: 'pose' }, { type: 'pose' }, { type: 'avance', n: 1 }, { type: 'pose' }];
    const d = derouler(prog, DEPART, G);
    assert.equal(d.fin.marques.length, 2);
});

test('le bon geste est accepté, à chaque type de bloc', () => {
    const prog = [{ type: 'avance', n: 2 }, { type: 'gauche' }, { type: 'pose' }];
    const d = derouler(prog, DEPART, G);
    assert.equal(jugerGeste(d, 0, { type: 'case', x: 2, y: 0 }).ok, true);
    assert.equal(jugerGeste(d, 1, { type: 'gauche' }).ok, true);
    assert.equal(jugerGeste(d, 2, { type: 'pose' }).ok, true);
    assert.equal(jugerGeste(d, 3, {}).fini, true);
});

test('la bonne direction mais le mauvais compte est nommé comme tel', () => {
    const d = derouler([{ type: 'avance', n: 2 }], DEPART, G);
    const r = jugerGeste(d, 0, { type: 'case', x: 2, y: 1 });   // une case au lieu de deux
    assert.equal(r.ok, false);
    assert.equal(r.faute, 'mauvais-compte');
    assert.match(r.message, /2 cases/);
    assert.match(r.message, /compté 1/);
});

test('avancer de côté, c\'est ne pas avoir vu où regarde le robot', () => {
    const d = derouler([{ type: 'avance', n: 2 }], DEPART, G);
    const r = jugerGeste(d, 0, { type: 'case', x: 4, y: 2 });   // à droite, alors qu'il vise le nord
    assert.equal(r.faute, 'mauvaise-direction');
    assert.match(r.message, /le haut du plan/);
});

test('confondre sa gauche et celle de l\'écran porte un nom', () => {
    // Robot qui DESCEND : sa gauche est à l'est, donc à droite de l'écran.
    const d = derouler([{ type: 'gauche' }], { x: 2, y: 2, cap: 'S' }, G);
    const r = jugerGeste(d, 0, { type: 'droite' });
    assert.equal(r.faute, 'miroir');
    assert.match(r.message, /le bas du plan/);
    assert.match(r.message, /à sa place/);
});

test('tourner quand le bloc dit d\'avancer est une erreur de LECTURE', () => {
    const d = derouler([{ type: 'avance', n: 1 }], DEPART, G);
    const r = jugerGeste(d, 0, { type: 'droite' });
    assert.equal(r.faute, 'mauvais-geste');
    assert.match(r.message, /avancer de 1 case/);
});

test('la prédiction juge la case d\'arrivée, et distingue « tout près »', () => {
    const prog = [{ type: 'repete', n: 2, corps: [{ type: 'avance', n: 1 }, { type: 'droite' }] }];
    const d = derouler(prog, DEPART, G);
    assert.equal(jugerArrivee(d, { x: d.fin.x, y: d.fin.y }).ok, true);
    const proche = jugerArrivee(d, { x: d.fin.x + 1, y: d.fin.y });
    assert.equal(proche.ok, false);
    assert.match(proche.message, /Tout près/);
    const loin = jugerArrivee(d, { x: 0, y: 4 });
    assert.match(loin.message, /boucle/);
});

// --- Le tirage ------------------------------------------------------------------

test('un programme tiré ne sort JAMAIS de la grille', () => {
    for (const niveau of ['facile', 'moyen', 'difficile']) {
        for (let g = 1; g <= 40; g++) {
            const t = tirerProgramme(niveau, makeRng(`${niveau}-${g}`));
            assert.equal(t.deroule.hors, false, `${niveau} graine ${g} : sortie de grille`);
            for (const p of t.deroule.pas) {
                assert.ok(p.apres.x >= 0 && p.apres.x < t.grille.cols
                    && p.apres.y >= 0 && p.apres.y < t.grille.rows,
                    `${niveau} graine ${g} : pas hors grille`);
            }
        }
    }
});

test('un programme tiré fait VRAIMENT quelque chose', () => {
    for (const niveau of ['facile', 'moyen', 'difficile']) {
        for (let g = 1; g <= 25; g++) {
            const t = tirerProgramme(niveau, makeRng(`fait-${niveau}-${g}`));
            assert.ok(t.deroule.pas.length >= 3, `${niveau} ${g} : trop court`);
            assert.ok(t.deroule.pas.length <= 18, `${niveau} ${g} : trop long`);
            const bouge = t.deroule.fin.x !== t.depart.x || t.deroule.fin.y !== t.depart.y;
            assert.ok(bouge || t.deroule.fin.marques.length, `${niveau} ${g} : rien ne se passe`);
        }
    }
});

test('« facile » n\'a pas de boucle, les autres en ont une', () => {
    for (let g = 1; g <= 20; g++) {
        const f = tirerProgramme('facile', makeRng(`f${g}`));
        assert.ok(!f.programme.some(b => b.type === 'repete'), 'boucle en niveau facile');
        for (const niveau of ['moyen', 'difficile']) {
            const t = tirerProgramme(niveau, makeRng(`${niveau}${g}`));
            const boucles = t.programme.filter(b => b.type === 'repete');
            assert.equal(boucles.length, 1, `${niveau} ${g} : il faut exactement une boucle`);
            // Une boucle sans virage se lit comme un simple « avancer de n » :
            // elle n'apprendrait rien.
            assert.ok(boucles[0].corps.some(b => b.type === 'droite' || b.type === 'gauche'),
                `${niveau} ${g} : boucle sans virage`);
            assert.ok(boucles[0].corps.some(b => b.type === 'avance'),
                `${niveau} ${g} : boucle sans déplacement`);
        }
    }
});

test('suivre le déroulé à la lettre est TOUJOURS accepté', () => {
    // La vérification qui compte : on rejoue chaque pas à travers le juge, et
    // aucun ne doit être refusé. Sinon un élève qui a raison aurait tort.
    for (const niveau of ['facile', 'moyen', 'difficile']) {
        for (let g = 1; g <= 30; g++) {
            const t = tirerProgramme(niveau, makeRng(`rejeu-${niveau}-${g}`));
            t.deroule.pas.forEach((p, k) => {
                const geste = p.bloc.type === 'avance'
                    ? { type: 'case', x: p.apres.x, y: p.apres.y }
                    : { type: p.bloc.type };
                const r = jugerGeste(t.deroule, k, geste);
                assert.ok(r.ok, `${niveau} ${g} pas ${k} (${direBloc(p.bloc)}) refusé : ${r.message}`);
            });
        }
    }
});

test('les blocs se disent en français, avec les accords', () => {
    assert.equal(direBloc({ type: 'avance', n: 1 }), 'avancer de 1 case');
    assert.equal(direBloc({ type: 'avance', n: 3 }), 'avancer de 3 cases');
    assert.equal(direBloc({ type: 'repete', n: 4 }), 'répéter 4 fois');
    assert.equal(direBloc({ type: 'gauche' }), 'tourner à gauche');
    assert.equal(direBloc({ type: 'pose' }), 'poser une pastille');
});

test('quatre quarts de tour du même côté ramènent au cap de départ', () => {
    CAPS.forEach(c => {
        let d = c;
        for (let i = 0; i < 4; i++) d = tourner(d, 'droite');
        assert.equal(d, c);
    });
});
