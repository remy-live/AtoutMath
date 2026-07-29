import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { DAY } from './helpers.mjs';
import { computeMastery, weakSkills, strongSkills, weakTables, dueSkills, recommendSkills, HALF_LIFE_DAYS } from '../js/core/mastery.js';

const NOW = 1_700_000_000_000;

function att(overrides = {}) {
    return {
        skillId: 'num.mult.table.7', correct: true, attemptIndex: 0,
        ts: NOW, msElapsed: 2000, exerciseId: 'calc-mult-flash', ...overrides
    };
}

test('une notion peu travaillée n\'est jamais déclarée acquise', () => {
    const m = computeMastery([att(), att()], NOW);
    const e = m.get('num.mult.table.7');
    assert.equal(e.successRate, 1);
    assert.ok(e.mastery < 0.7, 'deux réponses justes ne suffisent pas à conclure');
    assert.equal(e.reliable, false);
});

test('la maîtrise s\'estompe avec le temps', () => {
    const recent = computeMastery(Array.from({ length: 10 }, () => att()), NOW);
    const ancien = computeMastery(
        Array.from({ length: 10 }, () => att({ ts: NOW - 4 * HALF_LIFE_DAYS * DAY })),
        NOW
    );
    assert.ok(recent.get('num.mult.table.7').mastery > ancien.get('num.mult.table.7').mastery);
});

test('réussir au deuxième essai vaut moins que du premier coup', () => {
    const direct = computeMastery(Array.from({ length: 8 }, () => att()), NOW);
    const retente = computeMastery(Array.from({ length: 8 }, () => att({ attemptIndex: 1 })), NOW);
    assert.ok(direct.get('num.mult.table.7').mastery > retente.get('num.mult.table.7').mastery);
});

test('faible et fort sont correctement séparés', () => {
    const attempts = [
        ...Array.from({ length: 8 }, () => att({ skillId: 'num.mult.table.3' })),
        ...Array.from({ length: 8 }, (_, i) => att({ skillId: 'num.mult.table.7', correct: i < 2 }))
    ];
    const m = computeMastery(attempts, NOW);
    assert.deepEqual(strongSkills(m).map(s => s.skillId), ['num.mult.table.3']);
    assert.deepEqual(weakSkills(m).map(s => s.skillId), ['num.mult.table.7']);
    assert.deepEqual(weakTables(m), [7]);
});

test('les boîtes de Leitner espacent les révisions', () => {
    // Six réussites d'affilée : la compétence monte au dernier palier,
    // sa prochaine révision est repoussée de plus d'un mois.
    const attempts = Array.from({ length: 6 }, () => att());
    const m = computeMastery(attempts, NOW);
    const e = m.get('num.mult.table.7');
    assert.equal(e.box, 5);
    assert.ok(e.dueAt - NOW >= 30 * DAY);
    assert.equal(e.due, false);

    // Un échec fait redescendre d'un cran : elle revient plus tôt.
    const m2 = computeMastery([...attempts, att({ correct: false })], NOW);
    assert.equal(m2.get('num.mult.table.7').box, 4);
});

test('les révisions dues remontent quand la date est passée', () => {
    const m = computeMastery(
        Array.from({ length: 6 }, () => att({ ts: NOW - 60 * DAY, correct: true })),
        NOW
    );
    assert.ok(dueSkills(m, NOW).some(s => s.skillId === 'num.mult.table.7'));
});

test('la recommandation remonte au prérequis quand la notion échoue', () => {
    // L\'élève échoue sur les priorités, dont un prérequis est le sens de la
    // multiplication : c\'est ce prérequis qu\'il faut travailler d\'abord.
    const attempts = Array.from({ length: 8 }, (_, i) => att({ skillId: 'num.prio', correct: i < 2 }));
    const recos = recommendSkills(computeMastery(attempts, NOW), { limit: 5 });
    const remediation = recos.filter(r => r.reason === 'remediation').map(r => r.skillId);
    assert.ok(remediation.includes('num.mult.sens'), 'attend une remédiation sur le prérequis');
});
