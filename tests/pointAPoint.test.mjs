import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    DESSINS, NOMS_DESSINS, FAMILLES, NOMS_FAMILLES, segmentsDe,
    tirerPointAPoint, commencer, attendu, cliquer, annuler, corriger, traits
} from '../js/core/pointAPoint.js';

// --- Les dessins ------------------------------------------------------------------

test('chaque dessin a des points distincts et tient dans le cadre', () => {
    for (const nom of NOMS_DESSINS) {
        const d = DESSINS[nom];
        assert.ok(d.points.length >= 8, `« ${d.nom} » : ${d.points.length} points, c'est trop court`);
        assert.ok(d.points.length <= 30, `« ${d.nom} » : trop de points pour un enfant`);
        // DEUX PASTILLES AU MÊME ENDROIT SONT INJOUABLES : on ne saurait pas
        // laquelle on vient de cliquer.
        const uniques = new Set(d.points.map(p => p.join(',')));
        assert.equal(uniques.size, d.points.length, `« ${d.nom} » repasse par un même point`);
        d.points.forEach(([x, y]) => {
            assert.ok(x >= 0 && x <= 100 && y >= 0 && y <= 100,
                `« ${d.nom} » : point hors cadre (${x}, ${y})`);
        });
    }
});

test('les segments relient les rangs consécutifs, et referment si besoin', () => {
    const s = segmentsDe('maison');
    const n = DESSINS.maison.points.length;
    assert.equal(s.length, n, 'un dessin fermé a autant de traits que de points');
    assert.deepEqual(s[0], [1, 2]);
    assert.deepEqual(s[s.length - 1], [n, 1], 'le dessin fermé ne se referme pas');
});

// --- Les calculs -------------------------------------------------------------------

test('LE CALCUL D\'UN POINT VAUT SON RANG — c\'est toute la règle', () => {
    for (const fam of NOMS_FAMILLES) {
        for (const nom of NOMS_DESSINS) {
            const e = tirerPointAPoint({ rng: makeRng(`${fam}_${nom}`), dessin: nom, famille: fam });
            e.points.forEach((p, i) => {
                assert.equal(p.ordre, i + 1);
                assert.equal(p.valeur, p.ordre, `${fam} : le point ${p.ordre} ne vaut pas son rang`);
                assert.ok(p.texte && p.texte.length > 0, `${fam} : point ${p.ordre} sans calcul`);
            });
        }
    }
});

test('chaque calcul écrit vaut bien ce qu\'il annonce', () => {
    // On relit l'expression et l'on recalcule : une étiquette qui ment ferait
    // chercher un point qui n'existe pas.
    const lire = (t) => {
        let m = /^(\d+) \+ (\d+)$/.exec(t);
        if (m) return Number(m[1]) + Number(m[2]);
        m = /^(\d+) − (\d+)$/.exec(t);
        if (m) return Number(m[1]) - Number(m[2]);
        m = /^(\d+) × (\d+)$/.exec(t);
        if (m) return Number(m[1]) * Number(m[2]);
        m = /^la moitié de (\d+)$/.exec(t);
        if (m) return Number(m[1]) / 2;
        m = /^le double de (\d+)$/.exec(t);
        if (m) return Number(m[1]) * 2;
        return null;
    };
    for (const fam of NOMS_FAMILLES) {
        for (let i = 0; i < 12; i++) {
            const e = tirerPointAPoint({ rng: makeRng(`v_${fam}_${i}`), dessin: 'cle', famille: fam });
            e.points.forEach(p => {
                const v = lire(p.texte);
                assert.notEqual(v, null, `expression illisible : « ${p.texte} »`);
                assert.equal(v, p.ordre, `« ${p.texte} » ne vaut pas ${p.ordre}`);
            });
        }
    }
});

test('la famille « tables » sert des produits dès qu\'elle le peut', () => {
    const e = tirerPointAPoint({ rng: makeRng('t'), dessin: 'cle', famille: 'tables' });
    // 12 se factorise (3 × 4, 2 × 6) ; 13 non, et retombe sur une somme —
    // mieux qu'un dessin à trous.
    assert.match(e.points[11].texte, /×/, 'le douzième point devrait être un produit');
    assert.ok(e.points.filter(p => /×/.test(p.texte)).length >= 6);
});

// --- La partie ---------------------------------------------------------------------

test('on relie dans l\'ordre, et le dessin se referme à la fin', () => {
    const e = tirerPointAPoint({ rng: makeRng('jeu'), dessin: 'poisson' });
    const p = commencer(e);
    assert.equal(attendu(p), 1);
    for (let k = 1; k <= e.total; k++) {
        const r = cliquer(p, k);
        assert.equal(r.ok, true, `le point ${k} est refusé`);
        assert.equal(r.fini, k === e.total);
    }
    assert.equal(p.fini, true);
    // Un dessin fermé a un trait de plus : le retour au premier point.
    assert.equal(traits(p).length, e.total);
    assert.deepEqual(corriger(p), { ok: true, fautes: [] });
    assert.equal(cliquer(p, 1).raison, 'fini');
});

test('en correction immédiate, un mauvais point est refusé sans rien souffler', () => {
    const e = tirerPointAPoint({ rng: makeRng('im'), dessin: 'etoile', verification: 'immediate' });
    const p = commencer(e);
    const r = cliquer(p, 4);
    assert.equal(r.ok, false);
    assert.equal(r.raison, 'pas-le-bon');
    assert.equal(r.attendu, 1, 'on dit le RANG cherché, pas le point');
    // Rien n'est tracé : l'image ne peut pas se déformer.
    assert.equal(p.clics.length, 0);
    assert.equal(traits(p).length, 0);
});

test('en correction à la fin, tout passe — et la faute se voit au bout', () => {
    const e = tirerPointAPoint({ rng: makeRng('fin'), dessin: 'etoile', verification: 'fin' });
    const p = commencer(e);
    // On intervertit deux points au milieu.
    const ordre = [1, 2, 4, 3, 5, 6, 7, 8, 9, 10];
    ordre.forEach(k => assert.equal(cliquer(p, k).ok, true, `${k} refusé`));
    assert.equal(p.fini, true);
    const c = corriger(p);
    assert.equal(c.ok, false);
    assert.deepEqual(c.fautes.map(f => f.place), [3, 4]);
    assert.deepEqual(c.fautes[0], { place: 3, clique: 4, attendu: 3 });
});

test('un point déjà relié ne se reclique pas', () => {
    const e = tirerPointAPoint({ rng: makeRng('dbl'), dessin: 'maison', verification: 'fin' });
    const p = commencer(e);
    cliquer(p, 1);
    assert.equal(cliquer(p, 1).raison, 'deja');
    assert.equal(p.clics.length, 1);
});

test('on peut revenir en arrière, et le trait s\'efface', () => {
    const e = tirerPointAPoint({ rng: makeRng('undo'), dessin: 'maison' });
    const p = commencer(e);
    cliquer(p, 1); cliquer(p, 2); cliquer(p, 3);
    assert.equal(traits(p).length, 2);
    assert.equal(annuler(p), true);
    assert.equal(traits(p).length, 1);
    assert.equal(attendu(p), 3, 'on repart du point annulé');
    annuler(p); annuler(p);
    assert.equal(annuler(p), false, 'rien à annuler');
});

test('les traits relient les points cliqués, dans l\'ordre des clics', () => {
    const e = tirerPointAPoint({ rng: makeRng('tr'), dessin: 'maison' });
    const p = commencer(e);
    cliquer(p, 1); cliquer(p, 2);
    const t = traits(p);
    assert.equal(t.length, 1);
    assert.equal(t[0][0].ordre, 1);
    assert.equal(t[0][1].ordre, 2);
    // Les coordonnées voyagent avec : l'affichage n'a rien à recalculer.
    assert.deepEqual([t[0][0].x, t[0][0].y], DESSINS.maison.points[0]);
});

test('la même graine redonne les mêmes calculs', () => {
    const a = tirerPointAPoint({ rng: makeRng('g'), dessin: 'chat', famille: 'melange' });
    const b = tirerPointAPoint({ rng: makeRng('g'), dessin: 'chat', famille: 'melange' });
    assert.deepEqual(a.points.map(p => p.texte), b.points.map(p => p.texte));
});
