// La session d'items : ce qu'elle sert, et surtout QUAND ELLE S'ARRÊTE.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { ItemSession } from '../js/core/itemSession.js';
import { makeItem } from '../js/core/items.js';

/** Un générateur minimal : une addition dont la réponse est le double du tirage. */
function genTest() {
    return {
        id: 'test.somme',
        label: 'Somme de test',
        answerKinds: ['numeric'],
        resolvedSkills: ['num.add.entiers'],
        params: [],
        generate(params, ctx) {
            const a = ctx.rng.int(1, 9);
            return makeItem({
                seed: ctx.rng.seed,
                generatorId: 'test.somme',
                skillId: 'num.add.entiers',
                answerKind: 'numeric',
                prompt: { text: `${a} + ${a} = ?`, html: `<p>${a} + ${a}</p>` },
                answer: a * 2,
                explanation: `${a} + ${a} = ${a * 2}`
            });
        }
    };
}

test('chaque appel sert une nouvelle question', () => {
    const s = new ItemSession({ generator: genTest(), params: {}, isDemo: true });
    const q1 = s.next();
    const q2 = s.next();
    assert.ok(q1 && q2);
    assert.equal(s.history.length, 2);
    // Les graines diffèrent : deux questions de suite ne sont pas la même.
    assert.notEqual(s.history[0], s.history[1]);
});

test('une série finie ne pose plus de question', () => {
    // Rémy : « au bout de 10 questions, s'il y en avait 10, il ne faut pas en
    // relancer une ». C'est exactement ce qui arrivait : le meneur programmait
    // la conclusion 1,5 s après la dernière réponse, et l'activité enchaînait
    // dès que l'élève fermait la correction — une onzième question s'affichait
    // dans l'intervalle, et si elle était répondue assez vite, le bilan
    // comptait onze questions sur dix.
    const s = new ItemSession({ generator: genTest(), params: {}, isDemo: true });
    s.next();
    const derniere = s.next();

    s.termine = true;
    const encore = s.next();
    assert.equal(encore, derniere, 'une nouvelle question a été tirée après la fin');
    assert.equal(s.history.length, 2, 'une graine de trop est entrée dans l\'historique');
    // Et on peut le demander autant de fois qu'on veut : c'est toujours la même.
    assert.equal(s.next(), derniere);
    assert.equal(s.history.length, 2);
});

test('après la fin, la question reste verrouillée', () => {
    // `next()` ne relâche plus `locked` : la dernière question est à l'écran
    // avec sa correction, mais plus rien ne peut y être répondu ni enregistré.
    const s = new ItemSession({ generator: genTest(), params: {}, isDemo: true });
    const item = s.next();
    s.submit(String(item.answer));       // la question se ferme
    assert.equal(s.locked, true);

    s.termine = true;
    s.next();
    assert.equal(s.locked, true, 'la session s\'est rouverte après la fin');
    assert.equal(s.submit('123').ignored, true, 'une réponse a été acceptée après la fin');
});

test('sans le drapeau, rien ne change au comportement d\'avant', () => {
    const s = new ItemSession({ generator: genTest(), params: {}, isDemo: true });
    const q1 = s.next();
    s.submit(String(q1.answer));
    const q2 = s.next();
    assert.notEqual(q1, q2);
    assert.equal(s.locked, false, 'la question suivante doit être jouable');
});
