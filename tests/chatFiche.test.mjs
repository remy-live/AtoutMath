import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { chatFicheGenerator as G, ecrireProgramme } from '../js/core/generators/chatFiche.js';
import { executer } from '../js/core/scratchVM.js';

const tirer = (params, i) => G.generate(params, { rng: makeRng('cf' + i) });

test('le programme écrit dit exactement ce que le script fait', () => {
    const script = [{ type: 'repeter', valeur: 4, corps: [
        { type: 'avancer', valeur: 50 }, { type: 'droite', valeur: 90 }] }];
    // Le « genre » désigne la famille du bloc — Mouvement ou Contrôle : c'est
    // lui qui donne sa couleur à la fiche. Et le C d'un « répéter » se referme
    // par une barre, sans quoi on ne voit pas où la répétition s'arrête.
    assert.deepEqual(ecrireProgramme(script), [
        { creux: 0, texte: 'répéter 4 fois', genre: 'controle' },
        { creux: 1, texte: 'avancer de 50 pas', genre: 'mouvement' },
        { creux: 1, texte: 'tourner à droite de 90°', genre: 'mouvement' },
        { creux: 0, texte: '', genre: 'controle', fin: true }
    ]);
    // Le trou remplace LE NOMBRE, pas la ligne : on doit voir qu'il s'agit
    // d'un angle, et à quel endroit du programme.
    const creuse = ecrireProgramme(script, 90);
    assert.equal(creuse[2].texte, 'tourner à droite de ……°');
    assert.equal(creuse[1].texte, 'avancer de 50 pas', 'la longueur n\'est pas un angle');
});

test('la figure se referme : le chat revient à son point de départ', () => {
    for (let i = 0; i < 200; i++) {
        const m = tirer({ niveau: 'moyen' }, i).meta;
        if (m.figure === 'escalier') continue;      // un escalier ne se ferme pas
        const pts = m.traces.flat();
        const a = pts[0], z = pts[pts.length - 1];
        assert.ok(Math.abs(a.x - z.x) < 0.01 && Math.abs(a.y - z.y) < 0.01,
            `${m.nom} ne se referme pas : (${a.x}, ${a.y}) → (${z.x}, ${z.y})`);
    }
});

test('l\'angle annoncé est bien celui qui ferme la figure', () => {
    for (let i = 0; i < 200; i++) {
        const m = tirer({ quoi: 'angle', niveau: 'difficile' }, i).meta;
        // Un polygone régulier à n côtés se ferme en tournant de 360 ÷ n —
        // sauf l'étoile, qui fait deux tours (2 × 360 ÷ 5 = 144).
        const attendu = m.figure === 'etoile' ? 144
            : (m.figure === 'escalier' || m.figure === 'rectangle' ? 90 : 360 / m.n);
        assert.equal(m.angle, attendu, `${m.nom} : angle ${m.angle}°`);
        assert.equal(m.lignes.some(l => l.texte.includes('……')), true,
            'aucun trou dans le programme, il n\'y a rien à chercher');
    }
});

test('la figure tient dans le quadrillage annoncé', () => {
    for (let i = 0; i < 200; i++) {
        const m = tirer({ niveau: 'difficile' }, i).meta;
        const demi = (m.cases * 10) / 2;
        m.traces.flat().forEach(p => {
            assert.ok(Math.abs(p.x) <= demi + 0.01 && Math.abs(p.y) <= demi + 0.01,
                `${m.nom} sort du cadre de ${m.cases} carreaux : (${p.x}, ${p.y})`);
        });
        assert.ok(m.cases >= 6 && m.cases <= 20, `quadrillage aberrant : ${m.cases}`);
    }
});

test('les côtés tombent sur les lignes : tout est multiple de dix pas', () => {
    for (let i = 0; i < 120; i++) {
        const m = tirer({ niveau: 'difficile' }, i).meta;
        const longueurs = [];
        const chercher = (blocs) => blocs.forEach(b => {
            if (b.type === 'avancer') longueurs.push(b.valeur);
            if (b.corps) chercher(b.corps);
        });
        chercher(m.script);
        longueurs.forEach(l => assert.equal(l % 10, 0, `« avancer de ${l} » ne tombe pas sur un carreau`));
        // « % » rend -0 sur un multiple négatif, et -0 n'est pas 0 pour une
        // comparaison stricte : on teste la propriété, pas sa représentation.
        assert.ok(m.depart.x % 10 === 0, `départ x hors carreau : ${m.depart.x}`);
        assert.ok(m.depart.y % 10 === 0, `départ y hors carreau : ${m.depart.y}`);
    }
});

test('le tracé enregistré est bien celui du script joué depuis le départ', () => {
    for (let i = 0; i < 60; i++) {
        const m = tirer({}, i).meta;
        assert.deepEqual(m.traces, executer(m.script, m.depart).traces);
    }
});

test('« facile » ne sert ni étoile ni octogone', () => {
    const vus = new Set();
    for (let i = 0; i < 80; i++) vus.add(tirer({ niveau: 'facile' }, i).meta.figure);
    assert.ok(!vus.has('etoile') && !vus.has('octogone') && !vus.has('hexagone'), [...vus].join(', '));
    assert.ok(vus.size >= 2, 'toujours la même figure');
});
