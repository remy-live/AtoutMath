import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { anglesNommerGenerator as G, NOMS_ANGLES } from '../js/core/generators/anglesNommer.js';
import { mesureArc, boiteFigure, ancreArc } from '../js/core/anglesRemarquables.js';

const tirer = (params, i) => G.generate(params, { rng: makeRng('an' + i), index: i });

/** Les deux angles ont-ils le même sommet ? */
const memeSommet = (f) => Math.abs(f.arcs[0].x - f.arcs[1].x) < 1e-9
    && Math.abs(f.arcs[0].y - f.arcs[1].y) < 1e-9;

test('la figure montre bien la relation annoncée', () => {
    // C'est TOUT le contrat de l'exercice : on ne calcule rien, on lit une
    // position. Une figure qui ne montre pas ce que la réponse annonce est
    // une faute que l'élève ne peut pas repérer.
    for (let i = 0; i < 240; i++) {
        const m = tirer({}, i).meta;
        const f = m.figure;
        const [a, b] = f.arcs.map(mesureArc);
        const somme = a + b;
        if (m.famille === 'correspondants' || m.famille === 'alternes') {
            assert.ok(!memeSommet(f), `${m.famille} : les deux angles doivent être à DEUX croisements`);
            assert.equal(a, b, `${m.famille} : ces deux angles-là sont égaux`);
        } else {
            assert.ok(memeSommet(f), `${m.famille} : les deux angles partagent le sommet`);
        }
        if (m.famille === 'complementaires') assert.equal(somme, 90);
        if (m.famille === 'supplementaires') assert.equal(somme, 180);
        if (m.famille === 'opposes') assert.equal(a, b, 'opposés par le sommet : égaux');
    }
});

test('correspondants et alternes-internes sont là où leur DÉFINITION les met', () => {
    // C'est la seule différence entre les deux noms, et c'est exactement là que
    // les élèves se trompent : alternes-internes, tous les deux ENTRE les
    // parallèles et de part et d'autre de la sécante ; correspondants, du MÊME
    // côté de la sécante, l'un dedans et l'autre dehors.
    for (let i = 0; i < 60; i++) {
        for (const rel of ['correspondants', 'alternes']) {
            const m = G.generate({ familles: [rel] }, { rng: makeRng(rel + i), index: 0 }).meta;
            const [a, b] = m.figure.arcs;
            // La sécante va d'un sommet à l'autre : elle sert d'axe.
            const axe = { x: b.x - a.x, y: b.y - a.y };
            const pa = ancreArc(a), pb = ancreArc(b);
            const ua = { x: pa.x - a.x, y: pa.y - a.y }, ub = { x: pb.x - b.x, y: pb.y - b.y };
            const dedansA = ua.x * axe.x + ua.y * axe.y > 0;
            const dedansB = -(ub.x * axe.x + ub.y * axe.y) > 0;
            const memeCote = (axe.x * ua.y - axe.y * ua.x) * (axe.x * ub.y - axe.y * ub.x) > 0;
            if (rel === 'alternes') {
                assert.ok(dedansA && dedansB, 'alternes-INTERNES : les deux sont entre les parallèles');
                assert.ok(!memeCote, 'ALTERNES : de part et d\'autre de la sécante');
            } else {
                assert.ok(memeCote, 'correspondants : du même côté de la sécante');
                assert.ok(dedansA !== dedansB, 'correspondants : l\'un dedans, l\'autre dehors');
            }
        }
    }
});

test('« adjacents » ne cache jamais un nom plus précis', () => {
    // Deux angles adjacents dont la somme fait 90° sont COMPLÉMENTAIRES, et
    // l'élève qui répond « adjacents » a raison sur le fond. La figure ne doit
    // donc jamais poser cette question-là.
    for (let i = 0; i < 200; i++) {
        const m = G.generate({ familles: ['adjacents'] },
            { rng: makeRng('adj' + i), index: 0 }).meta;
        const somme = m.figure.arcs.reduce((s, a) => s + mesureArc(a), 0);
        assert.ok(![90, 180, 360].includes(somme),
            `une figure « adjacents » de ${somme}° a un nom plus précis`);
        assert.equal(m.figure.droit, null, 'pas d\'équerre : ce n\'est pas un angle droit');
    }
});

test('DEUX ANGLES SUPPLÉMENTAIRES SONT AUSSI ADJACENTS, ET ON LE DIT', () => {
    // Rémy, sur une figure d'angle plat partagé où il avait répondu
    // « adjacents » : « ces angles là sont adjacents et supplémentaires ».
    // L'application lui répondait « CE N'EST PAS ÇA — leur somme ne fait ici ni
    // 90°, ni 180° » sur une figure où elle faisait exactement 180°. Une phrase
    // fausse dite à un élève qui venait de lire la figure correctement.
    for (const rel of ['complementaires', 'supplementaires']) {
        for (let i = 0; i < 30; i++) {
            const it = G.generate({ familles: [rel] }, { rng: makeRng(rel + i), index: 0 });
            const adj = it.choices.find(c => c.value === 'adjacents');
            assert.ok(adj, 'le nom « adjacents » reste proposé');
            assert.match(adj.why, /c'est vrai|ils SONT adjacents/i,
                'on commence par dire à l\'élève qu\'il a raison');
            assert.doesNotMatch(adj.why, /ne fait ici ni/,
                'la phrase qui mentait sur la somme a disparu');
            // Et l'explication finale nomme les deux mots.
            assert.match(it.explanation, /aussi adjacents/);
        }
    }
});

test('LA QUESTION DEMANDE LE NOM LE PLUS PRÉCIS', () => {
    // Sans ce mot, la question aurait deux réponses justes sur trois figures
    // sur six, et n'en accepterait qu'une.
    const it = tirer({}, 0);
    assert.match(it.prompt.text, /le plus précis/);
    assert.match(it.prompt.papier, /le plus précis/);
});

test('sur une figure à DEUX sommets, « adjacents » est bien faux — et on le dit', () => {
    for (const rel of ['correspondants', 'alternes']) {
        const it = G.generate({ familles: [rel] }, { rng: makeRng(rel), index: 0 });
        const adj = it.choices.find(c => c.value === 'adjacents');
        assert.match(adj.why, /même sommet|deux croisements/);
        assert.doesNotMatch(adj.why, /c'est vrai/i);
    }
    // Opposés par le sommet : même sommet, mais aucun côté commun.
    const op = G.generate({ familles: ['opposes'] }, { rng: makeRng('op'), index: 0 });
    assert.match(op.choices.find(c => c.value === 'adjacents').why, /aucun côté commun/);
});

test('les deux angles sont numérotés 1 et 2, sans aucune mesure écrite', () => {
    for (let i = 0; i < 60; i++) {
        const m = tirer({}, i).meta;
        assert.deepEqual(m.figure.arcs.map(a => a.pas), [1, 2]);
    }
});

test('la série passe par toutes les relations demandées', () => {
    // Sur la fiche de Rémy, le tableau du bas a six cases et aucune ne reste
    // vide. Un tirage au hasard en oublie presque toujours une.
    const vus = Array.from({ length: 12 }, (_, i) => tirer({}, i).meta.famille);
    assert.equal(new Set(vus).size, NOMS_ANGLES.length, `manque : ${vus.join(', ')}`);
    // Et un réglage restreint est respecté.
    for (let i = 0; i < 20; i++) {
        const m = G.generate({ familles: ['alternes', 'correspondants'] },
            { rng: makeRng('r' + i), index: i }).meta;
        assert.ok(['alternes', 'correspondants'].includes(m.famille), m.famille);
    }
});

test('les six noms sont proposés, une seule fois chacun', () => {
    for (let i = 0; i < 40; i++) {
        const it = tirer({}, i);
        const labels = it.choices.map(c => c.label);
        assert.equal(labels.length, NOMS_ANGLES.length);
        assert.equal(new Set(labels).size, labels.length, `doublon : ${labels.join(', ')}`);
        assert.equal(it.choices.filter(c => c.correct).length, 1);
        assert.equal(it.choices.find(c => c.correct).label, it.meta.nom);
    }
});

test('la figure tient dans son cadre', () => {
    for (let i = 0; i < 120; i++) {
        const b = boiteFigure(tirer({}, i).meta.figure);
        assert.ok(Math.abs(b.xmin) <= 2.2 && Math.abs(b.xmax) <= 2.2
            && Math.abs(b.ymin) <= 2.2 && Math.abs(b.ymax) <= 2.2,
        `la figure sort du cadre (${b.xmin.toFixed(2)}…${b.xmax.toFixed(2)})`);
    }
});
