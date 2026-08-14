import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { evaluate, sameAnswer, toChoices } from '../js/core/items.js';
import {
    additionGenerator, soustractionGenerator, multFactGenerator, multMissingGenerator,
    divisionGenerator, prioriteGenerator, mixteGenerator
} from '../js/core/generators/calcul.js';
import { fracCompareGenerator, fracAddGenerator, decCompareGenerator } from '../js/core/generators/fractions.js';
import { repereGenerator, perimetreGenerator, aireGenerator } from '../js/core/generators/geometrie.js';
import {
    chiffreRangGenerator, partiesGenerator, zerosGenerator, conversionGenerator,
    decompositionGenerator, lettresGenerator, ordreGrandeurGenerator,
    egypteGenerator, complementGenerator, pariteGenerator
} from '../js/core/generators/numeration.js';
import { SKILLS } from '../js/data/skills.js';

const ALL = [
    [additionGenerator, {}],
    [soustractionGenerator, {}],
    [multFactGenerator, { tables: [2, 7, 9] }],
    [multMissingGenerator, { tables: [3, 8] }],
    [divisionGenerator, { tables: [4, 6] }],
    [prioriteGenerator, { mode: 'operation' }],
    [prioriteGenerator, { mode: 'resultat' }],
    [mixteGenerator, { operations: ['+', '-', '*', '/'] }],
    [fracCompareGenerator, {}],
    [fracAddGenerator, {}],
    [decCompareGenerator, {}],
    [repereGenerator, { mode: "placer" }],
    [repereGenerator, { mode: "lire" }],
    [perimetreGenerator, {}],
    [aireGenerator, {}],
    [chiffreRangGenerator, { partie: 'les deux', decimales: 3 }],
    [partiesGenerator, {}],
    [zerosGenerator, {}],
    [conversionGenerator, { decimaux: 'oui' }],
    [decompositionGenerator, { sens: 'libre' }],
    [lettresGenerator, { max: 1000000, decimaux: 'oui' }],
    [ordreGrandeurGenerator, { decimaux: 'oui' }],
    [egypteGenerator, { max: 10000 }],
    [complementGenerator, { cible: [10, 100, 1000] }],
    [pariteGenerator, { max: 99 }]
];

test('tout générateur produit un item valide et cohérent', () => {
    for (const [gen, params] of ALL) {
        for (let i = 0; i < 40; i++) {
            const item = gen.generate(params, { rng: makeRng(`t_${gen.id}_${i}`), weakTables: [] });

            assert.ok(item.skillId, `${gen.id} : skillId manquant`);
            assert.ok(SKILLS[item.skillId], `${gen.id} : compétence inconnue « ${item.skillId} »`);
            assert.ok(item.prompt.text, `${gen.id} : énoncé vide`);
            assert.ok(item.answer !== undefined && item.answer !== null, `${gen.id} : réponse absente`);
            assert.ok(item.explanation, `${gen.id} : explication absente`);
            assert.ok(item.hints.length > 0, `${gen.id} : aucune aide graduée`);

            // La réponse annoncée doit être acceptée par l'évaluateur.
            assert.equal(evaluate(item, item.answer).correct, true, `${gen.id} : réponse correcte rejetée`);

            if (item.answerKind === 'choice') {
                const goods = item.choices.filter(c => c.correct);
                assert.equal(goods.length, 1, `${gen.id} : il faut exactement une bonne réponse`);
                assert.ok(sameAnswer(goods[0].value, item.answer), `${gen.id} : choix correct ≠ réponse`);
                const values = item.choices.map(c => String(c.value));
                assert.equal(new Set(values).size, values.length, `${gen.id} : choix en double`);
                assert.ok(item.choices.length >= 2, `${gen.id} : trop peu de propositions`);
            }
        }
    }
});

test('une même graine régénère exactement la même question', () => {
    for (const [gen, params] of ALL) {
        const a = gen.generate(params, { rng: makeRng('graine-fixe'), weakTables: [] });
        const b = gen.generate(params, { rng: makeRng('graine-fixe'), weakTables: [] });
        assert.equal(a.prompt.text, b.prompt.text, `${gen.id} : énoncé non reproductible`);
        assert.equal(String(a.answer), String(b.answer), `${gen.id} : réponse non reproductible`);
    }
});

test('les distracteurs portent un diagnostic exploitable', () => {
    // Au moins un distracteur typé par générateur de calcul : c'est ce qui
    // transforme « faux » en explication.
    for (const gen of [additionGenerator, soustractionGenerator, multFactGenerator, divisionGenerator]) {
        const item = gen.generate({ tables: [7] }, { rng: makeRng('diag'), weakTables: [] });
        const typed = item.choices.filter(c => !c.correct && c.why);
        assert.ok(typed.length > 0, `${gen.id} : aucun distracteur expliqué`);
        const wrong = typed[0];
        assert.equal(evaluate(item, wrong.value).misconception, wrong.why);
    }
});

test('le tirage se biaise vers les tables fragiles', () => {
    let cibleFaible = 0;
    for (let i = 0; i < 200; i++) {
        const item = multFactGenerator.generate(
            { tables: [2, 3, 4, 5, 6, 7, 8, 9] },
            { rng: makeRng('bias_' + i), weakTables: [7] }
        );
        if (item.meta.t === 7) cibleFaible++;
    }
    // Sans biais, on attendrait ~12 % ; le biais doit être nettement visible
    // sans pour autant enfermer l'élève sur une seule table.
    assert.ok(cibleFaible > 80, `attendu > 80 tirages sur 7, obtenu ${cibleFaible}`);
    assert.ok(cibleFaible < 180, `le tirage ne doit pas être exclusif (${cibleFaible})`);
});

test('un item numérique peut être présenté sous forme de choix', () => {
    const item = aireGenerator.generate({ max: 8 }, { rng: makeRng('conv'), weakTables: [] });
    const converted = toChoices({ ...item, choices: null }, makeRng('conv2'));
    assert.equal(converted.answerKind, 'choice');
    assert.equal(converted.choices.filter(c => c.correct).length, 1);
});

test('la comparaison de réponses tolère les formats usuels', () => {
    assert.ok(sameAnswer(12, '12'));
    assert.ok(sameAnswer(' 3,5 ', '3.5'));
    assert.ok(sameAnswer('>', '>'));
    assert.ok(!sameAnswer('12', '13'));
});

test('comparer des fractions : la méthode annoncée correspond à la situation', () => {
    // Régression : quand les deux dénominateurs sortaient identiques par
    // hasard en mode « libre », l'explication proposait quand même de réduire
    // au dénominateur commun d1×d2 — absurde, et contraire à la méthode à
    // enseigner dans ce cas.
    for (let i = 0; i < 300; i++) {
        const item = fracCompareGenerator.generate(
            { memeDenominateur: 'libre', maxDen: 12 },
            { rng: makeRng('frac_' + i) }
        );
        const { n1, d1, n2, d2, same } = item.meta;
        assert.equal(same, d1 === d2, 'le drapeau doit refléter les dénominateurs réels');

        if (d1 === d2) {
            assert.match(item.explanation, /Même dénominateur/,
                `dénominateurs égaux (${d1}) mais explication : ${item.explanation}`);
            // Comparer les numérateurs EST la bonne méthode ici : ce ne peut
            // pas être présenté comme une erreur.
            assert.ok(item.choices.every(c => !c.why), 'aucun distracteur ne doit blâmer la comparaison des numérateurs');
        } else {
            assert.match(item.explanation, /dénominateur commun/,
                `dénominateurs différents (${d1}, ${d2}) mais explication : ${item.explanation}`);
        }

        // L'énoncé et la réponse restent cohérents.
        const attendu = n1 / d1 > n2 / d2 ? '>' : (n1 / d1 < n2 / d2 ? '<' : '=');
        assert.equal(item.answer, attendu);
    }
});

// --- Ce que le robot désigne dans l'énoncé -----------------------------------
//
// Le premier indice d'une démonstration parle d'un MORCEAU de l'énoncé :
// « Commence par 8 × 6 » dans « 8 × 6 + 3 », « combien de fois 4 tient-il dans
// 24 » sur l'égalité « ? × 4 = 24 ». L'activité de choix cercle l'élément
// `data-vise` s'il existe ; ces tests garantissent qu'il existe, qu'il désigne
// la bonne chose, et qu'il ne change rien à ce que l'élève lit.

/** Le texte affiché, balises retirées — ce que l'élève voit vraiment. */
const texteVisible = (html) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

/** Le contenu du premier élément marqué `data-vise`. */
const partieVisee = (html) => (/<[a-z]+ data-vise[^>]*>([^<]*)</.exec(html) || [])[1];

test('priorités, mode résultat : le robot désigne l\'opération à faire d\'abord', () => {
    for (let i = 0; i < 200; i++) {
        const item = prioriteGenerator.generate({ mode: 'resultat' }, { rng: makeRng('prio_r_' + i) });
        const html = item.prompt.html;
        // Le morceau désigné est exactement l'opération prioritaire, celle dont
        // parle le premier indice.
        assert.equal(partieVisee(html), item.meta.right, html);
        assert.equal(item.hints[0], `Commence par ${item.meta.right}.`);
        // Et l'énoncé lu reste le même : le balisage ne souffle rien.
        assert.equal(texteVisible(html), `${item.meta.eq} = ?`);
    }
});

test('priorités, mode opération : on ne désigne jamais la réponse cherchée', () => {
    for (let i = 0; i < 200; i++) {
        const item = prioriteGenerator.generate({ mode: 'operation' }, { rng: makeRng('prio_o_' + i) });
        const vise = partieVisee(item.prompt.html);
        // Ici la bonne réponse EST l'opération prioritaire : le robot ne peut
        // désigner que l'expression entière, sous peine de tout donner.
        assert.equal(vise, item.meta.eq);
        assert.notEqual(vise, item.meta.right);
    }
});

test('facteur manquant : le robot désigne l\'égalité, pas le titre du jeu', () => {
    for (let i = 0; i < 100; i++) {
        const item = multMissingGenerator.generate({ tables: [3, 4, 8] }, { rng: makeRng('fm_' + i) });
        const vise = partieVisee(item.prompt.html);
        assert.ok(vise && /[×x]/.test(vise) && vise.includes('='),
            `le morceau désigné doit être l'égalité, reçu : ${vise}`);
        assert.ok(!/Facteur/.test(vise), 'le titre du jeu n\'est pas l\'énoncé');
    }
});
