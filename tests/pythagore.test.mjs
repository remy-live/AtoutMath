// Pythagore : chaque marche est un niveau, et chaque calcul tombe juste.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    THEOREME, TRIPLETS, NIVEAUX, niveauDe, niveauProgressif, niveauPour,
    tirerTriangle, cotesDe, direTriangle,
    egaliteDe, verifierEgalite, etapesCalcul, groupesMelanges, verifierPhrase,
    redactionComplete
} from '../js/core/pythagore.js';
import { makeRng } from '../js/core/ids.js';

test('tous les triplets sont pythagoriciens', () => {
    // C'est la promesse du module : la racine tombe TOUJOURS juste. Un seul
    // triplet faux et un élève rencontre √145 au milieu du niveau 4.
    for (const [a, b, c] of TRIPLETS) {
        assert.equal(a * a + b * b, c * c, `${a}² + ${b}² ≠ ${c}²`);
    }
});

test('l\'hypoténuse est en face de l\'angle droit, et c\'est la plus longue', () => {
    for (let g = 0; g < 30; g++) {
        const t = tirerTriangle(makeRng(`h${g}`));
        const { hypo, cathetes, sommetDroit } = cotesDe(t);
        // Elle ne touche pas le sommet de l'angle droit.
        assert.ok(!hypo.nom.includes(sommetDroit),
            `l'hypoténuse ${hypo.nom} touche l'angle droit ${sommetDroit}`);
        // Les cathètes en partent toutes les deux.
        cathetes.forEach(c => assert.ok(c.nom.includes(sommetDroit)));
        // Et elle domine.
        assert.ok(hypo.longueur > cathetes[0].longueur && hypo.longueur > cathetes[1].longueur);
    }
});

test('l\'angle droit change de sommet : la définition, pas la place', () => {
    const vus = new Set();
    for (let g = 0; g < 40; g++) vus.add(tirerTriangle(makeRng(`a${g}`)).angleDroit);
    assert.equal(vus.size, 3, 'l\'angle droit doit visiter les trois sommets');
});

test('l\'égalité se vérifie dans les deux sens, l\'erreur est nommée', () => {
    const t = tirerTriangle(makeRng('eg'), { triplet: [3, 4, 5] });
    const e = egaliteDe(t);
    assert.ok(verifierEgalite(t, e.gauche, e.droits[0], e.droits[1]).juste);
    // L'addition est commutative : l'autre ordre vaut autant.
    assert.ok(verifierEgalite(t, e.gauche, e.droits[1], e.droits[0]).juste);
    // Une cathète à gauche : l'erreur dit QUOI relire — l'hypoténuse.
    const faux = verifierEgalite(t, e.droits[0], e.gauche, e.droits[1]);
    assert.ok(!faux.juste);
    assert.match(faux.message, /HYPOTÉNUSE/);
});

test('le calcul de l\'hypoténuse additionne, celui d\'une cathète soustrait', () => {
    const t = tirerTriangle(makeRng('calc'), { triplet: [6, 8, 10] });
    const { hypo, cathetes } = cotesDe(t);

    const versHypo = etapesCalcul(t);
    assert.equal(versHypo.resultat, 10);
    assert.equal(versHypo.lignes[1].attendu, 100);
    assert.match(versHypo.lignes[2].texte, /√100/);

    const versCote = etapesCalcul(t, cathetes[0].nom);
    assert.equal(versCote.resultat, cathetes[0].longueur);
    assert.equal(versCote.lignes[1].attendu, hypo.longueur ** 2 - cathetes[1].longueur ** 2);
    assert.match(versCote.lignes[1].texte, /−/, 'chercher une cathète, c\'est soustraire');
});

test('la phrase se mélange et se corrige au premier mot faux', () => {
    const m = groupesMelanges(makeRng('mel'));
    assert.notDeepEqual(m, THEOREME.groupes);
    assert.deepEqual([...m].sort(), [...THEOREME.groupes].sort());
    assert.ok(verifierPhrase(THEOREME.groupes).juste);
    const faute = verifierPhrase([THEOREME.groupes[1], THEOREME.groupes[0], ...THEOREME.groupes.slice(2)]);
    assert.ok(!faute.juste);
    assert.equal(faute.premierFaux, 0, 'la correction pointe le PREMIER rang faux');
});

test('la rédaction complète a ses trois lignes, et aucun trou', () => {
    for (let g = 0; g < 12; g++) {
        const t = tirerTriangle(makeRng(`rc${g}`));
        const { cathetes } = cotesDe(t);
        for (const chercher of [null, cathetes[0].nom]) {
            const lignes = redactionComplete(t, chercher);
            assert.equal(lignes.length, 3);
            assert.match(lignes[0], /^Je sais que/);
            assert.match(lignes[1], /^Or Si un triangle est rectangle/);
            assert.match(lignes[2], /^Donc/);
            assert.ok(!lignes.join(' ').includes('undefined'));
            assert.match(lignes[2], / cm\.$/, 'la réponse finale porte son unité');
        }
    }
});

test('six niveaux, du doigt vers la rédaction', () => {
    assert.equal(NIVEAUX.length, 6);
    assert.equal(niveauDe(1).cle, 'hypotenuse');
    assert.equal(niveauDe(6).cle, 'redaction');
    assert.equal(niveauDe(99).cle, 'hypotenuse', 'niveau inconnu : on repart du début');
    assert.match(direTriangle(tirerTriangle(makeRng('d'))), /rectangle en [A-Z]/);
});

// --- Sur le papier ------------------------------------------------------------

import { pythagoreGenerator } from '../js/core/generators/pythagore.js';

test('le générateur écrit des énoncés complets pour la feuille', () => {
    for (let g = 1; g <= 10; g++) {
        const it = pythagoreGenerator.generate({ chercher: (g % 2) ? 'hypotenuse' : 'cote' }, { rng: makeRng(`p${g}`), index: g });
        assert.match(it.prompt.text, /rectangle en/);
        assert.match(it.prompt.text, /cm/);
        assert.ok(Number(it.answer) > 0);
        assert.ok(!/undefined|NaN/.test(it.explanation));
        assert.match(it.explanation, /√/, 'la correction montre la racine');
    }
});

// --- Les six marches à la suite ---------------------------------------------

test('en progressif, l\'escalier monte du doigt à la rédaction', () => {
    // Douze questions, six marches : deux questions chacune.
    const vus = [];
    for (let r = 1; r <= 12; r++) vus.push(niveauProgressif(r, 12).id);
    assert.deepEqual(vus, [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);

    // On commence toujours par montrer l'hypoténuse et on finit par rédiger,
    // quelle que soit la longueur.
    for (const n of [6, 10, 12, 20, 30]) {
        assert.equal(niveauProgressif(1, n).id, 1, `${n} questions : ne commence pas au niveau 1`);
        assert.equal(niveauProgressif(n, n).id, NIVEAUX.length, `${n} questions : ne finit pas à la rédaction`);
    }
});

test('un exercice trop court pour six marches ne les saute pas dans le désordre', () => {
    // Trois questions : une marche par question, et l'escalier reste croissant.
    const ids = [1, 2, 3].map(r => niveauProgressif(r, 3).id);
    assert.deepEqual(ids, [...ids].sort((a, b) => a - b), 'l\'escalier redescend');
    assert.equal(ids[0], 1);
});

test('un niveau fixé reste fixé, et un réglage absent ne plante pas', () => {
    for (const r of [1, 5, 20]) {
        assert.equal(niveauPour({ niveau: 4 }, r, 20).id, 4, `question ${r}`);
        assert.equal(niveauPour({ niveau: '4' }, r, 20).id, 4, `question ${r} (chaîne)`);
    }
    assert.equal(niveauPour({}, 1, 10).id, 1);
    assert.equal(niveauPour(null, 1, 10).id, 1);
});
