// LA CALCULATRICE : QUI L'AUTORISE, ET QUAND.
//
// RÉMY : « pourrait-on autoriser dans les options l'utilisation de la
// calculatrice ou le permettre en direct à un groupe ou aux élèves (on pourrait
// sélectionner dans le direct) », puis, interrogé sur la portée : « les deux au
// choix mais on pourrait le donner que pour certains élèves », et sur
// l'évaluation : « prévenir, sans empêcher ».
//
// AVANT, ELLE ÉTAIT ÉCRITE EN DUR. `calculatrice: true` sur QUATRE exercices du
// catalogue, sur plus de deux cents. Le professeur ne pouvait ni l'accorder à un
// exercice qui ne l'avait pas, ni la retirer à un exercice qui l'avait, ni la
// donner en pleine heure à l'élève qui coince.
//
// TROIS PORTES, ET L'ORDRE COMPTE :
//   1. le direct l'emporte sur tout — c'est le professeur qui est dans la salle ;
//   2. puis le réglage de l'étape, qui peut aussi la RETIRER ;
//   3. puis le catalogue, qui reste le défaut.
//
// MESURÉ dans le navigateur, sur « Additions Mystères » qui ne l'autorise pas :
// case cochée dans les réglages → le bouton est là et bat ; sans la case → il
// reste caché. Et à deux onglets, professeur d'un côté, élève de l'autre : un
// clic sur « Autoriser » dans Le direct, et le bouton apparaît chez l'élève SANS
// changer d'exercice — mesuré en une seconde, garanti en dix (le sondage de
// séance).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { readFileSync } from 'node:fs';
import { calculatricePermise } from '../js/core/calculatrice.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const sansCommentaires = (s) => s
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('LE DIRECT L\'EMPORTE SUR TOUT', () => {
    // « Vous pouvez prendre la calculatrice » se dit à voix haute, en pleine
    // heure. Rien d'écrit la veille ne doit contredire le professeur qui est
    // dans la salle — pas même une case qu'il avait lui-même décochée.
    assert.equal(calculatricePermise({ accordee: true }), true);
    assert.equal(calculatricePermise({
        exercice: { calculatrice: false }, params: { calculatrice: false }, accordee: true
    }), true);
});

test('LE RÉGLAGE DE L\'ÉTAPE PEUT DONNER, ET AUSSI RETIRER', () => {
    // Donner sur un exercice qui ne l'offrait pas.
    assert.equal(calculatricePermise({ exercice: { calculatrice: false },
        params: { calculatrice: true } }), true);
    // ET RETIRER sur un exercice qui l'offrait : c'est ce que veut dire une
    // case qu'on décoche. Sans cela, le réglage ne saurait qu'ajouter, et la
    // case décochée mentirait.
    assert.equal(calculatricePermise({ exercice: { calculatrice: true },
        params: { calculatrice: false } }), false);
});

test('« PAS RÉGLÉE » N\'EST PAS « DÉCOCHÉE »', () => {
    // Les confondre ferait disparaître la calculatrice de la trigonométrie dès
    // qu'on ouvre ses réglages sans y toucher.
    assert.equal(calculatricePermise({ exercice: { calculatrice: true }, params: {} }), true);
    assert.equal(calculatricePermise({ exercice: { calculatrice: true },
        params: { autreChose: 3 } }), true);
    assert.equal(calculatricePermise({ exercice: { calculatrice: true },
        params: { calculatrice: undefined } }), true);
    // Et rien du tout ne l'offre pas.
    assert.equal(calculatricePermise(), false);
    assert.equal(calculatricePermise({}), false);
    assert.equal(calculatricePermise({ exercice: {} }), false);
});

test('QUATRE EXERCICES L\'AVAIENT EN DUR, ET ILS LA GARDENT', async () => {
    // Le catalogue reste le défaut : un exercice de trigonométrie n'a pas de
    // sens sans elle, et personne ne doit avoir à la rallumer.
    const { exercices } = await import('../js/data/catalog.js');
    const nes = exercices.filter(e => e.calculatrice);
    assert.ok(nes.length >= 4, `${nes.length} exercice(s) l'autorisent par nature`);
    nes.forEach(e => assert.equal(calculatricePermise({ exercice: e }), true, e.id));
});

test('LE MENEUR PASSE LES TROIS PORTES, ET LE BOUTON NE DÉCIDE RIEN', () => {
    const MENEUR = sansCommentaires(lire('js/core/runner.js'));
    // Le meneur donne les trois entrées ; c'est le noyau qui tranche.
    assert.match(MENEUR, /accordee: calculatriceAccordee\(step\.exercise && step\.exercise\.id\)/);
    assert.match(MENEUR, /params: step\.params,/);
    // Et le bouton ne refait pas la règle pour son compte.
    const BOUTON = sansCommentaires(lire('js/ui/calculatrice.js'));
    assert.ok(!/exo && exo\.calculatrice/.test(BOUTON),
        'le bouton juge encore tout seul : deux règles peuvent diverger');
    assert.match(BOUTON, /calculatricePermise\(/);
});

test('ACCORDÉE PENDANT L\'EXERCICE, ELLE APPARAÎT PENDANT L\'EXERCICE', () => {
    // Sans cette écoute, le bouton n'arrivait qu'au changement d'étape :
    // l'élève cherchait sur son écran ce que le professeur venait de lui
    // promettre à voix haute, et en concluait que ça ne marche pas.
    const BOUTON = sansCommentaires(lire('js/ui/calculatrice.js'));
    assert.match(BOUTON, /addEventListener\('seance_distante'/);
    assert.match(BOUTON, /enCours = exo \? \{ exo, params: opts\.params \|\| null \} : null;/);
});

test('L\'ÉLÈVE LIT « TOUTE LA SÉANCE » COMME UNE ÉTOILE', async () => {
    const { calculatriceAccordee, appliquerEtat } = await import('../js/core/seanceDistante.js');
    appliquerEtat({ calculatrice: [] });
    assert.equal(calculatriceAccordee('calc-add'), false);
    appliquerEtat({ calculatrice: ['calc-add'] });
    assert.equal(calculatriceAccordee('calc-add'), true);
    assert.equal(calculatriceAccordee('calc-sub'), false);
    // `*` n'est pas un exercice : c'est le « vous pouvez prendre la
    // calculatrice » qu'on ne répète pas à chaque exercice.
    appliquerEtat({ calculatrice: ['*'] });
    assert.equal(calculatriceAccordee('calc-sub'), true);
    assert.equal(calculatriceAccordee(''), true);
    appliquerEtat({ calculatrice: [] });
});

test('LE RÉGLAGE VOYAGE DANS LE CODE À DICTER', async () => {
    // Un parcours se donne aussi par un code dicté. Un réglage que le code
    // perd est un réglage qui marche chez le professeur et pas chez l'élève.
    const { Shortcodes } = await import('../js/core/shortcodes.js');
    const { makeStep, makePath } = await import('../js/core/path.js');
    const { defaultPolicy } = await import('../js/core/policy.js');
    const p = makePath('Essai', [makeStep('calc-add', { calculatrice: true }, { nbItems: 6 })],
        defaultPolicy());
    const relu = Shortcodes.decodePath(Shortcodes.encodePath(p));
    assert.ok(relu, 'le code ne se relit pas');
    assert.equal(relu.steps[0].overrides.calculatrice, true);
});
