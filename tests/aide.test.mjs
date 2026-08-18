import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { aideAuRang, reduireChoix, modeDe, affine, MODES } from '../js/core/aide.js';
import { finalizeChoices } from '../js/core/items.js';
import { makeRng } from '../js/core/ids.js';

// --- L'escalier --------------------------------------------------------------

test('le mode progressif monte : 2 propositions, puis 4, puis le clavier', () => {
    const p = { aide: 'progressive' };
    const marche = (r) => aideAuRang(p, r, 12);

    // Premier tiers (1 à 4 sur 12) : deux propositions.
    for (const r of [1, 2, 3, 4]) {
        assert.equal(marche(r).propositions, 2, `question ${r}`);
        assert.equal(marche(r).clavier, false, `question ${r}`);
    }
    // Ensuite quatre, tant qu'on choisit.
    for (const r of [5, 6, 7, 8, 9]) {
        assert.equal(marche(r).propositions, 4, `question ${r}`);
        assert.equal(marche(r).clavier, false, `question ${r}`);
    }
    // Dernier quart (au-delà de 9 sur 12) : on tape.
    for (const r of [10, 11, 12]) assert.equal(marche(r).clavier, true, `question ${r}`);
});

test('l\'escalier tient sur un exercice court comme sur un long', () => {
    // Trois questions : il reste UNE marche facile, et on finit au clavier.
    assert.equal(aideAuRang({ aide: 'progressive' }, 1, 3).propositions, 2);
    assert.equal(aideAuRang({ aide: 'progressive' }, 2, 3).propositions, 4);
    assert.equal(aideAuRang({ aide: 'progressive' }, 3, 3).clavier, true);
    // Cinquante questions : le tiers et le quart restent des proportions.
    assert.equal(aideAuRang({ aide: 'progressive' }, 17, 50).propositions, 2);
    assert.equal(aideAuRang({ aide: 'progressive' }, 18, 50).propositions, 4);
    assert.equal(aideAuRang({ aide: 'progressive' }, 39, 50).clavier, true);
    assert.equal(aideAuRang({ aide: 'progressive' }, 38, 50).clavier, false);
});

test('les autres modes ne bougent pas d\'un bout à l\'autre', () => {
    for (const r of [1, 5, 10]) {
        assert.deepEqual(aideAuRang({ aide: 'propositions' }, r, 10),
            { propositions: 4, clavier: false }, `propositions, question ${r}`);
        assert.deepEqual(aideAuRang({ aide: 'deux' }, r, 10),
            { propositions: 2, clavier: false }, `deux, question ${r}`);
        assert.equal(aideAuRang({ aide: 'clavier' }, r, 10).clavier, true, `clavier, question ${r}`);
        assert.equal(aideAuRang({ aide: 'toutes' }, r, 10).propositions, null, `toutes, question ${r}`);
    }
});

test('sans réglage, c\'est le mode progressif — et un mode inconnu n\'est pas une panne', () => {
    assert.equal(modeDe({}), 'progressive');
    assert.equal(modeDe({ aide: 'nimportequoi' }), 'progressive');
    assert.equal(aideAuRang({}, 1, 10).propositions, 2);
});

// --- Le réglage fin l'emporte, et se voit ------------------------------------

test('le professeur qui affine écrase le préréglage, sans casser le reste', () => {
    // Six propositions du début à la fin, mais on garde le passage au clavier
    // du mode progressif.
    const p = { aide: 'progressive', propositions: 6 };
    assert.equal(aideAuRang(p, 1, 12).propositions, 6);
    assert.equal(aideAuRang(p, 9, 12).propositions, 6);
    assert.equal(aideAuRang(p, 12, 12).clavier, true);

    // Et l'inverse : l'escalier des propositions, mais jamais de clavier.
    const q = { aide: 'progressive', saisie: 'jamais' };
    assert.equal(aideAuRang(q, 1, 12).propositions, 2);
    assert.equal(aideAuRang(q, 12, 12).clavier, false);
});

test('« affiné » se sait, pour que l\'interface puisse le dire', () => {
    assert.equal(affine({ aide: 'progressive' }), false);
    assert.equal(affine({ aide: 'progressive', propositions: 'auto', saisie: 'auto' }), false);
    assert.equal(affine({ aide: 'progressive', propositions: 6 }), true);
    assert.equal(affine({ saisie: 'moitie' }), true);
});

// --- La troncature garde ce qui explique -------------------------------------

test('réduire à deux garde la bonne réponse et le distracteur le plus instructif', () => {
    const rng = makeRng(7);
    const choix = finalizeChoices(rng, [
        { value: 12, correct: true },
        { value: 20, why: 'Tu as additionné.' },      // rang 0 : l'erreur du chapitre
        { value: 11, why: 'Un de moins.' },           // rang 1
        { value: 13, why: 'Un de plus.' }             // rang 2
    ], { count: 4 });
    assert.equal(choix.length, 4);

    const deux = reduireChoix(choix, 2);
    assert.equal(deux.length, 2);
    assert.ok(deux.some(c => c.correct), 'la bonne réponse a disparu');
    assert.equal(deux.find(c => !c.correct).value, 20,
        'ce n\'est pas le distracteur qui portait l\'explication');
});

test('la troncature ne rejoue pas le mélange : la bonne réponse garde sa place', () => {
    // Sans quoi elle finirait au même endroit à chaque question — et un élève
    // qui repère la place n'a plus rien à chercher.
    const positions = new Set();
    for (let s = 0; s < 40; s++) {
        const rng = makeRng(s);
        const choix = finalizeChoices(rng, [
            { value: 12, correct: true }, { value: 20 }, { value: 11 }, { value: 13 }
        ], { count: 4 });
        const deux = reduireChoix(choix, 2);
        // L'ordre relatif des survivants est celui du mélange.
        const avant = choix.filter(c => deux.includes(c));
        assert.deepEqual(deux, avant, 'l\'ordre affiché a été retouché');
        positions.add(deux.findIndex(c => c.correct));
    }
    assert.deepEqual([...positions].sort(), [0, 1], 'la bonne réponse tombe toujours du même côté');
});

test('réduire ne fait rien quand il n\'y a rien à réduire', () => {
    const trois = [{ value: 1, correct: true }, { value: 2, rang: 0 }, { value: 3, rang: 1 }];
    assert.equal(reduireChoix(trois, 4).length, 3);
    assert.equal(reduireChoix(trois, null).length, 3);
    assert.equal(reduireChoix([], 2).length, 0);
    assert.equal(reduireChoix(undefined, 2).length, 0);
    // Une liste sans bonne réponse est une anomalie ailleurs : on n'y touche pas.
    const sansBonne = [{ value: 1 }, { value: 2 }, { value: 3 }];
    assert.equal(reduireChoix(sansBonne, 2).length, 3);
});

test('les bouche-trous partent avant les distracteurs écrits à la main', () => {
    // `filler` complète la liste quand l'auteur n'en a pas fourni assez : ces
    // propositions-là ne portent aucune explication, ce sont elles qu'on retire.
    const rng = makeRng(3);
    const choix = finalizeChoices(rng, [
        { value: 50, correct: true },
        { value: 45, why: 'La retenue oubliée.' }
    ], { count: 4, filler: r => 50 + r.int(2, 20) });
    assert.equal(choix.length, 4);
    const trois = reduireChoix(choix, 3);
    assert.ok(trois.some(c => c.value === 45), 'le distracteur expliqué a été jeté');
});

test('tous les modes déclarés sont utilisables', () => {
    for (const nom of Object.keys(MODES)) {
        const r = aideAuRang({ aide: nom }, 1, 10);
        assert.ok(r.propositions === null || r.propositions >= 2, `${nom} : propositions invalides`);
        assert.equal(typeof r.clavier, 'boolean', `${nom} : clavier n'est pas un booléen`);
    }
});
