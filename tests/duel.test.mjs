import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    creerPartie, servir, repondre, manquer, pointSuivant, dureeVol, frappe,
    longueurReponse, tablesValides, VOL_DEPART, VOL_MINIMUM, ACCELERATION
} from '../js/core/duel.js';
import { makeRng } from '../js/core/ids.js';

const alea = (graine) => { const r = makeRng(graine); return () => r.next(); };

function partie(opts = {}, graine = 'd') {
    const p = creerPartie({ tables: [7], cible: 3, ...opts });
    return { p, rng: alea(graine) };
}

test('les tables données par le professeur sont nettoyées, jamais vides', () => {
    assert.deepEqual(tablesValides([7, 3, 7, 99, 'x', 5]), [3, 5, 7]);
    assert.deepEqual(tablesValides([]), [2, 3, 4, 5, 6, 7, 8, 9, 10]);
    assert.deepEqual(tablesValides(null), [2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('le service part vers l\'adversaire, jamais vers soi', () => {
    const { p, rng } = partie();
    p.serveur = 0;
    servir(p, 7, rng);
    assert.equal(p.defenseur, 1);
    assert.equal(p.phase, 'echange');
    assert.ok(p.balle && typeof p.balle.reponse === 'number');
});

test('une bonne réponse renvoie la balle à l\'autre : les deux calculent', () => {
    const { p, rng } = partie();
    servir(p, 7, rng);
    const cotes = [p.defenseur];
    for (let i = 0; i < 6; i++) {
        const r = repondre(p, p.balle.reponse, rng);
        assert.equal(r.bon, true);
        assert.equal(r.point, null);
        cotes.push(p.defenseur);
    }
    assert.deepEqual(cotes, [1, 0, 1, 0, 1, 0, 1], 'la balle doit alterner à chaque frappe');
    assert.equal(p.echange, 6);
});

test('chaque énoncé se calcule bien dans la table demandée', () => {
    for (const ops of [['mul'], ['div'], ['mul', 'div']]) {
        const { p, rng } = partie({ tables: [8], operations: ops }, 'o' + ops.join());
        servir(p, 8, rng);
        for (let i = 0; i < 40; i++) {
            const { texte, reponse } = p.balle;
            const m = texte.match(/^(\d+) ([×÷]) (\d+)$/);
            assert.ok(m, `énoncé illisible : ${texte}`);
            const [, g, signe, d] = m;
            const attendu = signe === '×' ? Number(g) * Number(d) : Number(g) / Number(d);
            assert.equal(reponse, attendu, `${texte} devrait valoir ${attendu}`);
            assert.ok(Number.isInteger(reponse) && reponse > 0, `réponse impossible : ${texte}`);
            repondre(p, reponse, rng);
        }
    }
});

test('jamais deux fois le même énoncé d\'affilée', () => {
    const { p, rng } = partie({ tables: [2] }, 'r');
    servir(p, 2, rng);
    let precedent = p.balle.texte;
    for (let i = 0; i < 60; i++) {
        repondre(p, p.balle.reponse, rng);
        assert.notEqual(p.balle.texte, precedent, 'un énoncé répété se recopie au lieu de se calculer');
        precedent = p.balle.texte;
    }
});

test('une réponse fausse donne le point à l\'attaquant, avec le détail de l\'erreur', () => {
    const { p, rng } = partie();
    servir(p, 7, rng);            // défenseur = 1
    const attendu = p.balle.reponse;
    const r = repondre(p, attendu + 1, rng);
    assert.equal(r.bon, false);
    assert.equal(r.point.pour, 0);
    assert.equal(r.point.contre, 1);
    assert.equal(r.point.raison, 'faux');
    assert.equal(r.point.attendu, attendu);
    assert.equal(r.point.donne, attendu + 1);
    assert.deepEqual(p.score, [1, 0]);
});

test('une balle non renvoyée à temps donne aussi le point', () => {
    const { p, rng } = partie();
    servir(p, 7, rng);
    const pt = manquer(p);
    assert.equal(pt.raison, 'trop lent');
    assert.equal(pt.pour, 0);
    assert.deepEqual(p.score, [1, 0]);
    assert.equal(manquer(p), null, 'un point ne se marque pas deux fois');
});

test('le perdant du point sert : le duel se rattrape', () => {
    const { p, rng } = partie();
    p.serveur = 0;
    servir(p, 7, rng);
    repondre(p, -1, rng);                     // le joueur 1 se trompe
    assert.equal(p.serveur, 1, 'le perdant reprend la main');
    pointSuivant(p);
    assert.equal(p.phase, 'service');
    servir(p, 7, rng);
    assert.equal(p.defenseur, 0);
});

test('la partie se termine au score cible, et rien ne bouge après', () => {
    const { p, rng } = partie({ cible: 2 });
    servir(p, 7, rng); manquer(p);
    pointSuivant(p); servir(p, 7, rng);
    // Le perdant sert : c'est donc le joueur 1 qui sert et le 0 qui défend.
    manquer(p);
    assert.deepEqual(p.score, [1, 1]);
    pointSuivant(p); servir(p, 7, rng); manquer(p);
    assert.equal(p.phase, 'fini');
    assert.ok(p.gagnant === 0 || p.gagnant === 1);
    assert.equal(p.score[p.gagnant], 2);
    const fige = [...p.score];
    servir(p, 7, rng);
    assert.deepEqual(p.score, fige, 'une partie finie ne se rejoue pas toute seule');
});

test('la balle accélère à chaque frappe, sans jamais devenir indevinable', () => {
    const { p, rng } = partie();
    servir(p, 7, rng);
    assert.equal(dureeVol(p), VOL_DEPART);
    const vols = [dureeVol(p)];
    for (let i = 0; i < 40; i++) { repondre(p, p.balle.reponse, rng); vols.push(dureeVol(p)); }
    for (let i = 1; i < vols.length; i++) {
        assert.ok(vols[i] <= vols[i - 1], 'la balle ne doit jamais ralentir dans un échange');
    }
    assert.equal(vols[1], Math.round(VOL_DEPART * ACCELERATION));
    assert.equal(vols[vols.length - 1], VOL_MINIMUM, 'le plancher doit être atteint et tenu');
});

test('le pavé sait combien de chiffres attendre', () => {
    const { p, rng } = partie({ tables: [10] }, 'L');
    servir(p, 10, rng);
    assert.equal(longueurReponse(p), String(p.balle.reponse).length);
    manquer(p);
    assert.equal(longueurReponse(p), 0, 'sans balle, rien à valider');
});

test('une réponse arrivée hors échange ne change rien', () => {
    const { p, rng } = partie();
    assert.deepEqual(repondre(p, 42, rng), { bon: false, point: null });
    assert.deepEqual(p.score, [0, 0]);
});

test('la table servie est toujours l\'une de celles autorisées', () => {
    const { p, rng } = partie({ tables: [3, 9] }, 't');
    servir(p, 7, rng);            // 7 n'est pas autorisée
    assert.ok([3, 9].includes(p.table));
    servir(p, 9, rng);
    assert.equal(p.table, 9);
});

test('même graine, même suite d\'énoncés', () => {
    const a = partie({}, 'z'), b = partie({}, 'z');
    servir(a.p, 7, a.rng); servir(b.p, 7, b.rng);
    for (let i = 0; i < 10; i++) {
        assert.equal(a.p.balle.texte, b.p.balle.texte);
        repondre(a.p, a.p.balle.reponse, a.rng);
        repondre(b.p, b.p.balle.reponse, b.rng);
    }
});

test('frappe respecte la table courante quelle que soit l\'opération', () => {
    const p = creerPartie({ tables: [6], operations: ['mul', 'div'] });
    p.table = 6;
    const rng = alea('f');
    for (let i = 0; i < 50; i++) {
        const f = frappe(p, rng);
        const [g, , d] = f.texte.split(' ');
        assert.ok(Number(g) % 6 === 0 || Number(g) === 6,
            `${f.texte} ne relève pas de la table de 6`);
        assert.ok(Number(d) === 6 || Number(g) === 6);
    }
});
