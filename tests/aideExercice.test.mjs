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

test('un jeu propose « Le robot joue » à la place de « Un exemple »', () => {
    const jeu = ongletsPour({ exo: { activityId: 'sim' } });
    assert.deepEqual(jeu.map(o => o.id), ['consigne', 'exemple']);
    assert.equal(jeu[1].label, 'Le robot joue');
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

// ─────────────────────────────── LA FIGURE DE L'EXEMPLE ─────────────────────

test('UNE QUESTION QUI PARLE D\'UNE FIGURE EMPORTE LA FIGURE', () => {
    // ─────────────────────────────────────────────────────────────────────
    // RÉMY, capture de l'onglet « Un exemple » à l'appui : « dans l'aide j'ai
    // cela, mais il manque le schéma ». L'écran disait, en gros et au centre,
    // « Comment note-t-on cette figure ? » — et il n'y avait pas de figure.
    // Une question qui désigne un dessin absent est mot pour mot impossible à
    // résoudre, sur l'écran qui existe précisément pour expliquer.
    //
    // LA CAUSE : `prompt.text` est la phrase SEULE, le dessin est dans
    // `prompt.html`, et l'on prenait `text || html` — donc jamais le dessin,
    // puisque la phrase existe toujours.
    //
    // C'ÉTAIT LA DEUXIÈME FOIS. Rémy, alors sur le carnet d'erreurs : « quand
    // il y a quelque chose de visuel, il faut afficher ce visuel ».
    const exo = exercices.find(e => e.id === 'geo-notation');
    assert.ok(exo, 'geo-notation a disparu du catalogue');
    const gen = getGenerator(exo.generatorId);
    const item = gen.generate({ ...(exo.params || {}) },
        { rng: makeRng('epreuve-figure'), index: 0 });
    assert.match(item.prompt.html, /<svg/, 'ce générateur ne dessine plus rien');
    const ex = etapesExemple(item);
    assert.match(ex.figures, /<svg/,
        'l\'exemple de l\'aide parle d\'une figure sans la porter');
    // ET LA PHRASE RESTE LA PHRASE : on ajoute le dessin, on ne remplace pas
    // la question par du HTML — elle est échappée à l'affichage.
    assert.doesNotMatch(ex.question, /<svg/);
});

test('ET UN EXERCICE SANS FIGURE N\'EN INVENTE PAS', () => {
    // LE TÉMOIN. Sans lui, un `figures` toujours rempli — ne serait-ce que
    // d'une chaîne vide rendue comme un bloc — ferait passer l'épreuve
    // précédente au vert sur un panneau qui afficherait une boîte vide sous
    // chaque question de calcul.
    const exo = exercices.find(e => e.id === 'calc-add');
    const gen = getGenerator(exo.generatorId);
    const item = gen.generate({ ...(exo.params || {}) },
        { rng: makeRng('epreuve-sans-figure'), index: 0 });
    const ex = etapesExemple(item);
    assert.equal(ex.figures, '', 'une figure est apparue là où il n\'y en a pas');
});
