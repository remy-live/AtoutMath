import test from 'node:test';
import assert from 'node:assert/strict';

import {
    phrases, decouperConsigne, etapesExemple, peutMontrerUnExemple, leconsDe, ongletsPour
} from '../js/core/aideExercice.js';
import { exercices } from '../js/data/catalog.js';
import '../js/core/activities/index.js';
import { getGenerator } from '../js/core/registry.js';
import { makeRng } from '../js/core/ids.js';

// --- Couper une consigne ----------------------------------------------------

test('un texte vide ne donne aucune phrase', () => {
    assert.deepEqual(phrases(''), []);
    assert.deepEqual(phrases(null), []);
});

test('les phrases se coupent sur la ponctuation forte', () => {
    assert.deepEqual(phrases('Lis le nombre. Écris-le en chiffres. Valide !'),
        ['Lis le nombre.', 'Écris-le en chiffres.', 'Valide !']);
});

test('un nombre décimal ne coupe pas la phrase en deux', () => {
    assert.deepEqual(phrases('Le résultat vaut 3.5 exactement.'), ['Le résultat vaut 3.5 exactement.']);
});

test('une phrase qui commence par un guillemet français est bien détachée', () => {
    const p = phrases('Saisis le nombre. « Jusqu\'à » monte au million.');
    assert.equal(p.length, 2);
    assert.equal(p[1], '« Jusqu\'à » monte au million.');
});

test('la première phrase porte l\'essentiel, le reste est du détail', () => {
    const d = decouperConsigne('Lis le nombre écrit en toutes lettres et saisis-le en chiffres. '
        + 'Le réglage « Jusqu\'à » monte jusqu\'au million. « Rangs décimaux » ajoute les dixièmes.');
    assert.match(d.essentiel, /^Lis le nombre/);
    assert.equal(d.details.length, 2);
});

test('une première phrase trop courte s\'adjoint la suivante', () => {
    // Quatre mots en gros caractères tout en haut d'un panneau n'aident personne.
    const d = decouperConsigne('Trace un trait. Il prend ta couleur. Celui qui ferme un triangle perd.');
    assert.equal(d.essentiel, 'Trace un trait. Il prend ta couleur.');
    assert.equal(d.details.length, 1);
});

test('une consigne d\'une seule phrase n\'a pas de détail', () => {
    const d = decouperConsigne('Additionne les deux nombres proposés et donne le résultat exact.');
    assert.equal(d.details.length, 0);
    assert.ok(d.essentiel.length > 0);
});

test('une consigne absente ne casse rien', () => {
    assert.deepEqual(decouperConsigne(''), { essentiel: '', details: [] });
});

// --- L'exemple --------------------------------------------------------------

const item = {
    prompt: { text: '10 × 6 = ?' },
    answer: 60,
    hints: ['10 × 6, c\'est 6 paquets de 10.', 'Appuie-toi sur 10 × 5 = 50, puis ajoute 10.', '10 × 6 = 60.'],
    explanation: '10 × 6 = 60.'
};

test('l\'exemple reprend la question, les étapes et la réponse', () => {
    const e = etapesExemple(item);
    assert.equal(e.question, '10 × 6 = ?');
    assert.equal(e.reponse, '60');
    assert.equal(e.explication, '10 × 6 = 60.');
});

test('le dernier indice ne redit pas l\'explication', () => {
    assert.equal(etapesExemple(item).etapes.length, 2);
    assert.ok(!etapesExemple(item).etapes.includes('10 × 6 = 60.'));
});

test('un dernier indice qui apporte autre chose est gardé', () => {
    const e = etapesExemple({ ...item, hints: [...item.hints.slice(0, 2), 'Vérifie avec la table de 6.'] });
    assert.equal(e.etapes.length, 3);
});

test('un exercice sans indice donne quand même sa question et sa réponse', () => {
    const e = etapesExemple({ prompt: { text: '2 + 2 = ?' }, answer: 4, hints: [], explanation: '' });
    assert.deepEqual(e.etapes, []);
    assert.equal(e.reponse, '4');
});

test('une réponse valant zéro n\'est pas prise pour une absence', () => {
    assert.equal(etapesExemple({ prompt: { text: 'x = ?' }, answer: 0 }).reponse, '0');
});

test('pas de question, pas d\'exemple', () => {
    assert.equal(etapesExemple(null), null);
});

// --- Les onglets ------------------------------------------------------------

test('un exercice à générateur peut montrer un exemple', () => {
    assert.equal(peutMontrerUnExemple({ generatorId: 'num.lettres' }), true);
    assert.equal(peutMontrerUnExemple({ activityId: 'sim' }), false);
});

test('un jeu propose « Voir jouer » à la place de « Un exemple »', () => {
    const jeu = ongletsPour({ exo: { activityId: 'sim' } });
    assert.deepEqual(jeu.map(o => o.id), ['consigne', 'exemple']);
    assert.equal(jeu[1].label, 'Voir jouer');
    const exo = ongletsPour({ exo: { generatorId: 'num.lettres' } });
    assert.equal(exo[1].label, 'Un exemple');
});

test('l\'onglet leçon n\'apparaît que s\'il y a une leçon', () => {
    assert.equal(ongletsPour({ exo: {}, lecons: [] }).length, 2);
    assert.equal(ongletsPour({ exo: {}, lecons: ['Poser la multiplication'] }).length, 3);
});

test('les leçons se dédoublonnent et se bornent', () => {
    assert.deepEqual(leconsDe(['a', 'a', 'b']), ['a', 'b']);
    assert.equal(leconsDe(['a', 'b', 'c', 'd', 'e']).length, 3);
    assert.deepEqual(leconsDe(['  ', null, 'a']), ['a']);
});

// --- Sur le vrai catalogue --------------------------------------------------

test('toute consigne du catalogue se découpe et garde son essentiel', () => {
    exercices.forEach(e => {
        const d = decouperConsigne(e.instruction);
        assert.ok(d.essentiel.length >= 10, `${e.id} : essentiel trop court « ${d.essentiel} »`);
        // Rien ne se perd au découpage.
        const rendu = [d.essentiel, ...d.details].join(' ').replace(/\s+/g, ' ');
        const source = String(e.instruction).replace(/\s+/g, ' ').trim();
        assert.equal(rendu, source, `${e.id} : le découpage a perdu du texte`);
    });
});

test('chaque exercice à générateur sait produire un exemple complet', () => {
    const sans = [];
    exercices.filter(e => e.generatorId).forEach(e => {
        const g = getGenerator(e.generatorId);
        if (!g) return;
        const item = g.generate({ ...(e.params || {}) },
            { rng: makeRng('exemple'), weakTables: [], difficulty: null, index: 0 });
        const ex = etapesExemple(item);
        assert.ok(ex, e.id);
        assert.ok(ex.question.length, `${e.id} : pas de question`);
        // Un exemple sans la moindre étape ni explication n'apprend rien.
        if (!ex.etapes.length && !ex.explication) sans.push(e.id);
    });
    assert.deepEqual(sans, [], 'ces exercices n\'ont ni indice ni explication à montrer');
});
