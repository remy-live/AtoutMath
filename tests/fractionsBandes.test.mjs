// LES DEUX EXERCICES DE FRACTIONS, vus depuis leurs générateurs.
//
// Le noyau est éprouvé ailleurs (fractionsEquivalentes.test.mjs). Ce qu'on
// vérifie ici, c'est ce que l'écran reçoit : une question dont la réponse est
// celle qu'on attend, des fractions écrites de façon à ce que la fiche papier
// les mette EN COLONNES, et — le point que Rémy a demandé explicitement — une
// progression qui monte vraiment de marche en marche au fil de la série.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    fracEgaliteGenerator, fracSommeProgressiveGenerator
} from '../js/core/generators/fractionsEquivalentes.js';
import { NIVEAUX_SOMME, pgcd } from '../js/core/fractionsEquivalentes.js';
import { porteUneFraction } from '../js/core/fiche.js';
import { makeRng } from '../js/core/ids.js';
import { exercices } from '../js/data/catalog.js';
import { SKILLS } from '../js/data/skills.js';

const tirer = (gen, params = {}, i = 0, index = 0) =>
    gen.generate(params, { rng: makeRng(`${gen.id}_${i}`), index });

// --- Compléter une égalité ---------------------------------------------------

test('l\'égalité pose une question dont la réponse EST le nombre manquant', () => {
    for (let i = 0; i < 60; i++) {
        const item = tirer(fracEgaliteGenerator, {}, i);
        const e = item.meta.egalite;
        assert.equal(item.answerKind, 'numeric');
        assert.equal(item.answer, e.reponse);
        assert.equal(item.skillId, 'num.frac.equivalentes');
        // Le trou est bien un trou : la réponse ne se lit nulle part dans
        // l'énoncé, ni en texte ni en HTML.
        const marque = item.prompt.text.split('=')[1];
        assert.ok(marque.includes('?'), `pas de trou dans « ${item.prompt.text} »`);
        assert.ok(item.hints.length >= 3);
        assert.ok(item.explanation.includes(String(e.facteur)));
    }
});

test('LA RÉPONSE NE FUITE PAS DANS L\'ÉNONCÉ', () => {
    // Un énoncé qui contient déjà le nombre à trouver se répond sans réfléchir.
    // Le cas dangereux : la réponse égale par hasard un nombre de l'énoncé.
    for (let i = 0; i < 120; i++) {
        const item = tirer(fracEgaliteGenerator, {}, `fuite${i}`);
        const e = item.meta.egalite;
        const cote = item.prompt.text.split('=')[1];
        const nombres = (cote.match(/\d+/g) || []).map(Number);
        assert.ok(!nombres.includes(e.reponse) || e.reponse === e.visible,
            `« ${item.prompt.text} » laisse voir ${e.reponse}`);
    }
});

test('l\'écriture « n/d » permet à la fiche de composer les colonnes', () => {
    // `fractions: true` ne suffit pas : la fiche ne met en colonnes que si elle
    // RECONNAÎT une fraction dans le texte. Rémy : « toujours des fractions en
    // colonnes ».
    assert.ok(fracEgaliteGenerator.fractions);
    assert.ok(fracSommeProgressiveGenerator.fractions);
    for (let i = 0; i < 20; i++) {
        assert.ok(porteUneFraction(tirer(fracEgaliteGenerator, {}, i).prompt.text));
        assert.ok(porteUneFraction(tirer(fracSommeProgressiveGenerator, {}, i).prompt.text));
    }
});

test('les réglages de l\'égalité passent jusqu\'à la question', () => {
    for (let i = 0; i < 20; i++) {
        const a = tirer(fracEgaliteGenerator, { sens: 'simplifier' }, `s${i}`);
        assert.equal(a.meta.egalite.sens, 'simplifier');
        const b = tirer(fracEgaliteGenerator, { trou: 'denominateur' }, `t${i}`);
        assert.equal(b.meta.egalite.trou, 'denominateur');
        const c = tirer(fracEgaliteGenerator, { maxBase: 4, maxFacteur: 5 }, `m${i}`);
        assert.ok(c.meta.egalite.facteur <= 5);
    }
});

// --- L'addition progressive --------------------------------------------------

test('LA SÉRIE MONTE VRAIMENT LES QUATRE MARCHES', () => {
    // « Il faut que ce soit progressif » : sur dix questions, on doit voir les
    // quatre marches, dans l'ordre, et finir sur celle du PPCM.
    const marches = [];
    for (let index = 0; index < 10; index++) {
        marches.push(tirer(fracSommeProgressiveGenerator, {}, index, index).meta.marche);
    }
    assert.deepEqual([...new Set(marches)], NIVEAUX_SOMME.map(n => n.id));
    assert.equal(marches[0], 'meme');
    assert.equal(marches[9], 'ppcm');
    // Jamais en arrière.
    const rang = (m) => NIVEAUX_SOMME.findIndex(n => n.id === m);
    marches.forEach((m, i) => { if (i) assert.ok(rang(m) >= rang(marches[i - 1])); });
});

test('une marche fixée ne bouge plus, même à la dixième question', () => {
    NIVEAUX_SOMME.forEach(({ id }) => {
        for (let index = 0; index < 10; index++) {
            const item = tirer(fracSommeProgressiveGenerator, { niveau: id }, index, index);
            assert.equal(item.meta.marche, id);
        }
    });
});

test('la somme attendue est écrite sous forme irréductible', () => {
    for (let index = 0; index < 40; index++) {
        const item = tirer(fracSommeProgressiveGenerator, {}, index, index % 10);
        const s = item.meta.somme;
        assert.equal(item.answerKind, 'text');
        assert.equal(item.answer, `${s.reduit.n}/${s.reduit.d}`);
        assert.equal(pgcd(s.reduit.n, s.reduit.d), 1);
        // La correction papier ne parle pas des bandes : elle n'en a pas.
        assert.ok(item.explicationPapier.includes(`${s.a.n}/${s.a.d}`));
        assert.ok(!/bande/i.test(item.explicationPapier));
    }
});

test('la difficulté annoncée suit la marche', () => {
    const vus = NIVEAUX_SOMME.map(({ id }) =>
        tirer(fracSommeProgressiveGenerator, { niveau: id }, id).difficulty);
    vus.forEach((d, i) => { if (i) assert.ok(d > vus[i - 1]); });
});

test('l\'aide de la marche ouvre la liste des indices', () => {
    NIVEAUX_SOMME.forEach(({ id, aide }) => {
        const item = tirer(fracSommeProgressiveGenerator, { niveau: id }, `a${id}`);
        assert.equal(item.hints[0], aide);
        assert.ok(item.hints.length >= 3);
    });
});

// --- Le catalogue ------------------------------------------------------------

test('les deux exercices sont au catalogue et branchés sur leur écran', () => {
    const egal = exercices.find(e => e.id === 'frac-egalite');
    const somme = exercices.find(e => e.id === 'frac-somme-bandes');
    assert.ok(egal && somme);
    assert.equal(egal.generatorId, 'frac.egalite');
    assert.equal(egal.activityId, 'fraction-egalite');
    assert.equal(somme.generatorId, 'frac.somme-progressive');
    assert.equal(somme.activityId, 'fraction-somme');
    // Les compétences citées existent : sans cela l'exercice ne remonte dans
    // aucun bilan.
    [...fracEgaliteGenerator.skills, ...fracSommeProgressiveGenerator.skills]
        .forEach(s => assert.ok(SKILLS[s], `compétence inconnue : ${s}`));
});

test('LES RÉGLAGES PAR DÉFAUT GARDENT LA BANDE DESSINABLE', () => {
    // À 9 × 12, une bande de 81 parts n'est plus qu'un aplat gris : l'image
    // qui devait tout expliquer n'explique plus rien. Le catalogue part donc
    // plus bas que le générateur ne l'autorise.
    const egal = exercices.find(e => e.id === 'frac-egalite');
    for (let i = 0; i < 80; i++) {
        const item = tirer(fracEgaliteGenerator, egal.params, `def${i}`);
        const e = item.meta.egalite;
        const fin = Math.max(e.gauche.d, e.droite.d);
        const unites = Math.max(1, Math.ceil(e.gauche.n / e.gauche.d));
        assert.ok(fin * unites <= 120, `${fin} parts × ${unites} unités, illisible`);
    }
});
