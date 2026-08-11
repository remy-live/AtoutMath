import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    MODES, analyserZeros, sansZerosInutiles, tirerNombre, tirerCalcul,
    creerPartie, genererVague, toucher, laisserPasser, laisserPasserGroupe, vagueFinie, resteAPrendre
} from '../js/core/tri.js';
import { makeRng } from '../js/core/ids.js';

const inutiles = (s) => analyserZeros(s).filter(o => o.inutile).map(o => o.i);

test('les zéros de tête sont inutiles, le dernier chiffre entier jamais', () => {
    assert.deepEqual(inutiles('011'), [0]);
    assert.deepEqual(inutiles('0071'), [0, 1]);
    assert.deepEqual(inutiles('0'), [], 'un zéro tout seul EST le nombre');
    assert.deepEqual(inutiles('0,5'), [], 'le zéro de 0,5 tient la partie entière');
    assert.deepEqual(inutiles('00,5'), [0], 'un seul des deux est de trop');
});

test('les zéros de queue sont inutiles, ceux du milieu jamais', () => {
    // Le piège du chapitre : le 0 de 1,05 dit qu'il n'y a pas de dixième.
    assert.deepEqual(inutiles('1,05'), []);
    assert.deepEqual(inutiles('1,050'), [4]);
    assert.deepEqual(inutiles('1,820'), [4]);
    assert.deepEqual(inutiles('1,800'), [3, 4]);
    assert.deepEqual(inutiles('12,00'), [3, 4]);
});

test('un nombre sans zéro inutile n\'en a aucun à trancher', () => {
    ['1,82', '345', '7,5', '10,5', '100'].forEach(n =>
        assert.deepEqual(inutiles(n), [], `${n} n'a rien à couper`));
});

test('le nombre nettoyé est celui qu\'on écrirait', () => {
    assert.equal(sansZerosInutiles('011,820'), '11,82');
    assert.equal(sansZerosInutiles('0,50'), '0,5');
    assert.equal(sansZerosInutiles('1,00'), '1', 'la virgule s\'en va avec sa partie décimale');
    assert.equal(sansZerosInutiles('007,100'), '7,1');
    assert.equal(sansZerosInutiles('1,05'), '1,05');
    assert.equal(sansZerosInutiles('340'), '340', 'le zéro des unités n\'est pas décoratif');
});

test('les nombres tirés ont toujours de quoi trancher, et de quoi se tromper', () => {
    const rng = makeRng('nombres');
    let avecPiege = 0;
    for (let i = 0; i < 200; i++) {
        const n = tirerNombre(rng);
        assert.match(n, /^0+\d+,\d+$/, `« ${n} » n'est pas de la forme attendue`);
        assert.ok(inutiles(n).length >= 2, `« ${n} » n'a pas assez de zéros à couper`);
        assert.notEqual(sansZerosInutiles(n), n);
        // Un zéro UTILE au milieu de la partie décimale : c'est le piège.
        if (analyserZeros(n).some(o => o.role === 'decimale' && o.c === '0' && !o.inutile)) avecPiege++;
    }
    assert.ok(avecPiege > 40, `seulement ${avecPiege} tirages sur 200 contiennent un zéro utile`);
});

test('un calcul tiré a le signe demandé, et jamais zéro', () => {
    const rng = makeRng('calculs');
    for (let i = 0; i < 150; i++) {
        assert.ok(tirerCalcul(rng, 'positif').valeur > 0);
        assert.ok(tirerCalcul(rng, 'negatif').valeur < 0);
    }
});

test('le texte du calcul correspond bien à sa valeur', () => {
    const rng = makeRng('coherence');
    for (let i = 0; i < 150; i++) {
        const c = tirerCalcul(rng, i % 2 ? 'positif' : 'negatif');
        const [g, op, d] = c.texte.split(' ');
        const a = Number(g.replace('−', '-'));
        const b = Number(d) * (op === '−' ? -1 : 1);
        assert.equal(a + b, c.valeur, `« ${c.texte} » ne vaut pas ${c.valeur}`);
    }
});

test('une vague contient TOUJOURS de quoi trier', () => {
    const rng = makeRng('vagues');
    for (const mode of ['negatifs', 'positifs']) {
        for (let i = 0; i < 60; i++) {
            const e = creerPartie({ mode, parVague: 5 });
            const v = genererVague(e, rng);
            assert.equal(v.objets.length, 5);
            const cibles = v.objets.filter(o => o.cible).length;
            assert.ok(cibles >= 1, 'aucun objet à prendre');
            assert.ok(cibles <= 4, 'aucun objet à laisser — rien à trier');
            // Le critère est bien le signe demandé.
            v.objets.forEach(o => assert.equal(o.cible, mode === 'positifs' ? o.valeur > 0 : o.valeur < 0));
        }
    }
});

test('en mode zéros, la vague est le nombre lui-même, chiffre par chiffre', () => {
    const e = creerPartie({ mode: 'zeros' });
    const v = genererVague(e, makeRng('z'));
    assert.equal(v.objets.map(o => o.texte).join(''), v.nombre);
    assert.equal(v.attendu, sansZerosInutiles(v.nombre));
    assert.ok(v.objets.some(o => o.cible), 'rien à trancher');
    assert.ok(v.objets.some(o => !o.cible), 'tout est à trancher');
});

test('toucher une cible marque des points, se tromper coûte une vie', () => {
    const e = creerPartie({ mode: 'negatifs', vies: 3 });
    const v = genererVague(e, makeRng('t'));
    const bonne = v.objets.find(o => o.cible);
    const mauvaise = v.objets.find(o => !o.cible);

    const r1 = toucher(e, bonne.id);
    assert.equal(r1.ok, true);
    assert.equal(e.score, 10);
    assert.equal(e.vies, 3, 'une bonne coupe ne coûte rien');

    const r2 = toucher(e, mauvaise.id);
    assert.equal(r2.ok, false);
    assert.equal(e.vies, 2);
    assert.match(r2.message, /n'est pas négatif/, 'l\'erreur doit DIRE ce qu\'il fallait voir');
    assert.match(r2.message, new RegExp(mauvaise.texte.replace(/[−+]/g, '.')));
});

test('un même objet ne compte qu\'une fois', () => {
    const e = creerPartie({ mode: 'positifs' });
    const v = genererVague(e, makeRng('u'));
    const bonne = v.objets.find(o => o.cible);
    toucher(e, bonne.id);
    const encore = toucher(e, bonne.id);
    assert.equal(encore.raison, 'inconnu');
    assert.equal(e.score, 10, 'le score n\'a pas doublé');
});

test('laisser filer un objet à prendre coûte une vie — sinon ne rien faire gagnerait', () => {
    const e = creerPartie({ mode: 'negatifs', vies: 3 });
    const v = genererVague(e, makeRng('l'));
    const bonne = v.objets.find(o => o.cible);
    const autre = v.objets.find(o => !o.cible);

    assert.equal(laisserPasser(e, autre.id).perdu, false, 'laisser passer ce qu\'il fallait laisser ne coûte rien');
    assert.equal(e.vies, 3);

    const r = laisserPasser(e, bonne.id);
    assert.equal(r.perdu, true);
    assert.equal(e.vies, 2);
    assert.ok(r.message.length > 20);
});

test('la partie se termine quand les vies sont épuisées, pas avant', () => {
    const e = creerPartie({ mode: 'positifs', vies: 2 });
    const v = genererVague(e, makeRng('f'));
    const mauvaises = v.objets.filter(o => !o.cible);
    toucher(e, mauvaises[0].id);
    assert.equal(e.fini, false);
    if (mauvaises[1]) {
        toucher(e, mauvaises[1].id);
        assert.equal(e.fini, true);
        assert.equal(toucher(e, v.objets.find(o => o.cible).id).raison, 'inactif');
    }
});

test('la vague est finie quand toutes les cibles sont prises, même s\'il reste des objets', () => {
    const e = creerPartie({ mode: 'negatifs' });
    const v = genererVague(e, makeRng('v'));
    assert.equal(vagueFinie(e), false);
    const cibles = v.objets.filter(o => o.cible);
    assert.equal(resteAPrendre(e), cibles.length);
    cibles.forEach(o => toucher(e, o.id));
    assert.equal(resteAPrendre(e), 0);
    assert.equal(vagueFinie(e), true);
    assert.ok(v.objets.some(o => !o.coupe), 'il reste bien des objets non touchés à l\'écran');
});

test('chaque mode annonce sa consigne et son rappel de règle', () => {
    for (const m of Object.values(MODES)) {
        assert.ok(m.consigne.length > 25, `${m.id} : consigne trop courte`);
        assert.ok(m.rappel.length > 40, `${m.id} : pas de rappel de la règle`);
        assert.ok(m.skill, `${m.id} : pas de compétence rattachée`);
        assert.ok(['trancher', 'tirer'].includes(m.geste));
    }
});

test('le message d\'erreur des zéros distingue le zéro utile du reste', () => {
    const e = creerPartie({ mode: 'zeros' });
    const v = genererVague(e, makeRng('zz'));
    const zeroUtile = v.objets.find(o => o.texte === '0' && !o.cible && o.role === 'decimale');
    if (zeroUtile) {
        const r = toucher(e, zeroUtile.id);
        assert.match(r.message, /UTILE/);
        assert.match(r.message, /rang/);
    }
    const chiffre = v.objets.find(o => o.texte !== '0' && o.texte !== ',' && !o.cible);
    if (chiffre) {
        assert.match(toucher(e, chiffre.id).message, /pas un zéro/);
    }
});

test('un nombre qui s\'échappe coûte UNE vie, pas une par chiffre manqué', () => {
    // Le cas signalé à l'usage : trois zéros à trancher, deux tranchés, le
    // nombre tombe — et on perdait trois cœurs d'un coup, c'est-à-dire tout,
    // pour quelqu'un qui avait presque tout juste.
    const e = creerPartie({ mode: 'zeros', vies: 3 });
    const v = genererVague(e, makeRng("nj-groupe"));
    const cibles = v.objets.filter(o => o.cible);
    assert.ok(cibles.length >= 2, 'il faut au moins deux zéros à trancher pour ce test');

    const avant = e.vies;
    const r = laisserPasserGroupe(e, v.objets.map(o => o.id));
    assert.equal(r.perdu, true, 'le nombre manqué doit bien coûter quelque chose');
    assert.equal(e.vies, avant - 1, `${cibles.length} zéros manqués n'ont coûté qu'une vie`);
});

test('un groupe entièrement tranché ne coûte rien en sortant', () => {
    const e = creerPartie({ mode: 'zeros', vies: 3 });
    const v = genererVague(e, makeRng("nj-groupe-2"));
    v.objets.filter(o => o.cible).forEach(o => toucher(e, o.id));
    const avant = e.vies;
    assert.equal(laisserPasserGroupe(e, v.objets.map(o => o.id)).perdu, false);
    assert.equal(e.vies, avant);
});
