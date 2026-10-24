// L'ÉNONCÉ NE S'ÉCRIT PAS DIX FOIS SUR LA MÊME FEUILLE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, sur `cf-ensemble` : « laisse de la place et ne remets pas l'énoncé à
// chaque question sur la version imprimé ».
//
// Ses dix questions s'écrivaient : « Calculer 1/9 ÷ 2, puis préciser le plus
// petit ensemble auquel le résultat appartient. » — dix fois la même queue de
// soixante signes, sous une consigne qui disait déjà la même chose en tête.
// Sur un cahier cela ne se fait pas : la consigne est donnée UNE fois, et les
// questions ne portent que ce qui les distingue. La place gagnée est celle où
// l'élève écrit.
//
// ── CE QUE CES ÉPREUVES TIENNENT ──────────────────────────────────────────
//
// Le découpage, qui est la partie dangereuse : couper trop court laisse une
// question vide, couper trop long lui retire ce qui la distinguait. Les deux
// donnent une feuille qu'on ne peut pas corriger, et aucune des deux ne se voit
// autrement qu'en lisant la feuille imprimée.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { degagerLePrefixe, consigneAvecPrefixe } from '../js/core/fiche.js';

test('LA QUEUE QUI SE RÉPÈTE S\'EN VA — le cas de Rémy', () => {
    const r = degagerLePrefixe([
        'Calculer 1/9 ÷ 2, puis préciser le plus petit ensemble auquel le résultat appartient.',
        'Calculer 12/7 − 8/9, puis préciser le plus petit ensemble auquel le résultat appartient.'
    ]);
    assert.equal(r.suffixe, 'puis préciser le plus petit ensemble auquel le résultat appartient.');
    assert.deepEqual(r.textes, ['Calculer 1/9 ÷ 2', 'Calculer 12/7 − 8/9']);
});

test('la tête qui se répète s\'en va aussi', () => {
    const r = degagerLePrefixe(['Simplifier : √64', 'Simplifier : √(9 + 16)']);
    assert.equal(r.prefixe, 'Simplifier :');
    assert.deepEqual(r.textes, ['√64', '√(9 + 16)']);
});

test('ON NE COUPE QU\'À UN VRAI SÉPARATEUR', () => {
    // Sans cette règle, deux questions commençant par « Simplifier : √ »
    // seraient réduites à « 64 » et « (9 + 16) » — la racine partie avec le
    // préfixe, et l'exercice avec elle.
    const r = degagerLePrefixe(['Simplifier : √64', 'Simplifier : √49']);
    assert.equal(r.prefixe, 'Simplifier :', 'on s\'arrête au « : », pas au « √ »');
    assert.deepEqual(r.textes, ['√64', '√49']);
});

test('un séparateur seul n\'est pas un énoncé', () => {
    // « Soit : », « Et : » — les hisser en tête ne gagnerait rien et priverait
    // la question du peu qu'elle disait.
    assert.equal(degagerLePrefixe(['Soit : 3', 'Soit : 4']).prefixe, '');
});

test('UNE QUESTION NE DEVIENT JAMAIS VIDE', () => {
    // Deux questions identiques au séparateur près se retrouveraient
    // numérotées devant une ligne blanche : le défaut qu'on répare, à l'envers.
    const r = degagerLePrefixe(['Calculer la somme :', 'Calculer la somme :']);
    assert.deepEqual(r.textes, ['Calculer la somme :', 'Calculer la somme :'],
        'rien n\'est dégagé si la question n\'y survit pas');
});

test('une question seule n\'est pas touchée', () => {
    // Un préfixe ne se « répète » pas à un exemplaire.
    const r = degagerLePrefixe(['Simplifier : √64']);
    assert.equal(r.prefixe, '');
    assert.deepEqual(r.textes, ['Simplifier : √64']);
});

test('DES QUESTIONS SANS RIEN DE COMMUN RESSORTENT INTACTES', () => {
    const avant = ['12 + 7', '8 × 9', 'La moitié de 30'];
    assert.deepEqual(degagerLePrefixe(avant).textes, avant);
});

test('LA CONSIGNE RECUEILLE CE QU\'ON A ÔTÉ, SANS BÉGAYER', () => {
    // Elle le disait déjà : on ne l'écrit pas deux fois.
    assert.equal(
        consigneAvecPrefixe(
            'Calculer, puis préciser le plus petit ensemble auquel appartient le résultat.',
            '', 'puis préciser le plus petit ensemble auquel le résultat appartient.'),
        'Calculer, puis préciser le plus petit ensemble auquel appartient le résultat.',
        'l\'ordre des mots change, la phrase est la même : on ne la répète pas');
    // Elle ne le disait pas : on l'ajoute.
    assert.equal(consigneAvecPrefixe('', 'Simplifier :', ''), 'Simplifier :');
    assert.equal(consigneAvecPrefixe('Écris ta réponse.', 'Simplifier :', ''),
        'Écris ta réponse. Simplifier :');
});

test('LE RENDU DE FICHE EMPLOIE BIEN LE DÉGAGEMENT', async () => {
    // Une règle que personne n'appelle ne garde rien. On vérifie que le chemin
    // de la fiche de parcours la traverse.
    const fs = await import('node:fs');
    const src = fs.readFileSync(new URL('../js/ui/printParcours.js', import.meta.url), 'utf8');
    assert.match(src, /degagerLePrefixe\(/, 'printParcours doit dégager l\'énoncé répété');
    assert.match(src, /consigneAvecPrefixe\(/, 'et le remettre dans la consigne');
});
