// « Autoriser le clavier » ne s'affiche que là où il peut agir.
//
// Rémy : « dans le mot juste, dans les réglages, le clavier est proposé mais le
// jeu ne propose jamais le clavier non ? »
//
// L'activité à propositions offre ce réglage à ses SOIXANTE-DIX exercices. Le
// pavé numérique, lui, ne prend la main que si la réponse est un NOMBRE — ou si
// l'item se déclare composable. Dans VINGT ET UN exercices, aucune question ne
// peut jamais y arriver : « somme », « oui », « [AB) » ne se tapent pas sur un
// pavé de chiffres. Le professeur y décochait un réglage pour protéger une
// classe qui découvre, et croyait avoir agi.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { exercices, paramSchemaOf } from '../js/data/catalog.js';
import { getGenerator } from '../js/core/registry.js';
import { makeRng } from '../js/core/ids.js';
import {
    itemPeutAllerAuClavier, reglageClavierAgit, itemPeutEtreChoisi,
    clavierPossible, propositionsPossibles
} from '../js/core/aide.js';
import { readFileSync } from 'node:fs';
import '../js/core/activities/index.js';

test('la règle du pavé : un nombre, ou rien', () => {
    assert.equal(itemPeutAllerAuClavier({ answer: 42 }), true);
    assert.equal(itemPeutAllerAuClavier({ answer: '7' }), true);
    assert.equal(itemPeutAllerAuClavier({ answer: -3.5 }), true);
    // Un mot ne se tape pas sur un pavé de chiffres.
    assert.equal(itemPeutAllerAuClavier({ answer: 'somme' }), false);
    assert.equal(itemPeutAllerAuClavier({ answer: '[AB)' }), false);
    assert.equal(itemPeutAllerAuClavier({ answer: '' }), false);
    assert.equal(itemPeutAllerAuClavier({ answer: null }), false);
    assert.equal(itemPeutAllerAuClavier(null), false);
    // Une expression composable, si : elle a son propre clavier.
    assert.equal(itemPeutAllerAuClavier({ answer: '2x + 3', meta: { composable: 'litteral' } }), true);
    // `saisieSeule` y va DÈS la première question : l'escalier n'y est pour
    // rien, et le réglage ne le retient pas.
    assert.equal(itemPeutAllerAuClavier({ answer: '[AB)', meta: { saisieSeule: true } }), false);
});

test('DANS LE DOUTE, ON MONTRE LE RÉGLAGE', () => {
    // Cacher une commande sur un soupçon, c'est retirer au professeur une
    // décision qu'il avait. Générateur absent, générateur qui jette : on montre.
    assert.equal(clavierPossible({}, null, makeRng), true);
    assert.equal(clavierPossible({}, { generate: () => { throw new Error('bing'); } }, makeRng), true);
    assert.equal(clavierPossible({}, { generate: () => ({ answer: 'mot' }) }, null), true);
    // Et quand le générateur répond clairement, on le croit.
    assert.equal(clavierPossible({}, { generate: () => ({ answer: 'mot' }) }, makeRng), false);
    assert.equal(clavierPossible({}, { generate: () => ({ answer: 12 }) }, makeRng), true);
});

test('LE RÉGLAGE NE SURVIT QUE LÀ OÙ IL AGIT, et on le demande au générateur', () => {
    const offrent = exercices.filter(e =>
        (paramSchemaOf(e) || []).some(c => c && c.id === 'clavier'));
    assert.ok(offrent.length > 40, 'le réglage doit être offert largement');

    const muets = offrent.filter(e =>
        !clavierPossible(e, e.generatorId ? getGenerator(e.generatorId) : null, makeRng));

    // ON N'ÉCRIT PAS « il y en a exactement 21 » : le catalogue grandit, et un
    // test qui compte devient faux le jour où l'on ajoute un exercice de
    // vocabulaire. On garde en revanche les DEUX TÉMOINS de la découverte.
    assert.ok(muets.length > 0, 'la mesure du 28 septembre en trouvait 21');

    const id = (x) => x.id;
    assert.ok(muets.map(id).includes('frac-add'),
        'Addition de Fractions répond « 3/4 », qui ne se tape pas sur un pavé');
    assert.ok(muets.map(id).includes('geo-notations'),
        'Segment, Droite, Demi-droite répond « [AB) »');

    // ET LE TÉMOIN INVERSE : un exercice dont la réponse est un nombre garde
    // son réglage. Sans lui, cacher TOUT ferait passer ce test.
    const addition = exercices.find(e => e.id === 'calc-add');
    assert.ok(addition, 'calc-add doit exister');
    assert.equal(clavierPossible(addition, getGenerator(addition.generatorId), makeRng), true);

    // « Le Mot Juste », l'exemple de Rémy, est un cas à part et il mérite d'être
    // écrit : un de ses six volets se chiffre (double, triple, moitié), les cinq
    // autres sont du vocabulaire. Le réglage y agit donc VRAIMENT, mais une
    // question sur six seulement — ce qui explique qu'on ne voie jamais le pavé.
    const motJuste = exercices.find(e => e.id === 'num-vocabulaire');
    assert.ok(motJuste, 'num-vocabulaire doit exister');
    assert.equal(clavierPossible(motJuste, getGenerator(motJuste.generatorId), makeRng), true);
});

test('LE RÉGLAGE N\'A PAS PRISE SUR UNE QUESTION QUI VA D\'EMBLÉE AU CLAVIER', () => {
    // LA DISTINCTION QUI M'A ÉCHAPPÉ D'ABORD, et qui a fait cacher le réglage
    // au mauvais endroit. Relire l'ordre des lignes de `moduleVoulu` :
    //
    //     if (m.saisieSeule) return compose || null;   // le réglage n'est PAS lu
    //     if (!aideIci.clavier) return null;           // ici, il décide
    //
    // Une question « pas à pas » est `saisieSeule` ET `composable` : le clavier
    // y est parfaitement possible, et le réglage parfaitement muet.
    const pasAPas = { answer: '2x + 3', meta: { saisieSeule: true, composable: 'litteral' } };
    assert.equal(itemPeutAllerAuClavier(pasAPas), true, 'le clavier EST possible');
    assert.equal(reglageClavierAgit(pasAPas), false, 'mais le réglage ne décide pas');
    assert.equal(itemPeutEtreChoisi(pasAPas), false, 'et l\'on ne choisit jamais');

    const ordinaire = { answer: 12 };
    assert.equal(reglageClavierAgit(ordinaire), true);
    assert.equal(itemPeutEtreChoisi(ordinaire), true);
});

test('L\'ESCALIER D\'AIDE DISPARAÎT LÀ OÙ L\'ON NE CHOISIT JAMAIS', () => {
    const gen = (exo) => (exo.generatorId ? getGenerator(exo.generatorId) : null);
    // Les cinq « pas à pas » : chaque question va droit au clavier, donc
    // « Toujours 2 propositions » ne veut rien dire.
    ['dev-pas', 'fac-pas', 'cf-pas', 'rc-pas', 'num-puissances-calcul-pas'].forEach(id => {
        const exo = exercices.find(e => e.id === id);
        assert.ok(exo, id + ' doit exister');
        assert.equal(propositionsPossibles(exo, gen(exo), makeRng), false, id);
        assert.equal(clavierPossible(exo, gen(exo), makeRng), false,
            id + ' : le clavier arrive quoi qu\'on coche');
    });
    // Et un exercice ordinaire garde les deux.
    const add = exercices.find(e => e.id === 'calc-add');
    assert.equal(propositionsPossibles(add, gen(add), makeRng), true);
    assert.equal(clavierPossible(add, gen(add), makeRng), true);
});

test('LE PANNEAU APPLIQUE LE FILTRE — sinon la mesure ne sert à rien', () => {
    // Un test qui vérifie la RÈGLE et pas son EMPLOI laisse passer la refonte
    // qui emporte le filtre. On lit donc le panneau.
    const panneau = readFileSync('js/games/configUI.js', 'utf8');
    assert.match(panneau, /formesPossibles\(/, 'le panneau doit interroger les formes possibles');
    assert.match(panneau, /c\.id === 'clavier'/, 'et filtrer la case du clavier');
    assert.match(panneau, /c\.id !== 'aide'/, 'et le rail de l\'aide');
    // LA RÉPARTITION EST LE CHAMP CACHÉ DU MÊME ESCALIER, et c'est LUI qui
    // tenait l'aperçu à l'écran : retirer le rail sans le retirer laissait la
    // frise « Comment l'élève répondra » au-dessus d'un exercice où l'on ne
    // choisit jamais. Mesuré dans le navigateur avant et après.
    assert.match(panneau, /c\.id === 'repartition'/,
        'et le champ caché de la répartition, sans quoi l\'aperçu reste');
    // Le cran « Directement au clavier » ne doit pas survivre là où il est muet.
    assert.match(panneau, /o\.value !== 'clavier'/,
        'le cran du clavier doit être retiré du rail quand le pavé est impossible');
});
