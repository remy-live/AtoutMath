import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    ETAPES, fmt, simplifiee, complete, tirerCouple, ecrituresPossibles,
    expliquer, leurres, relatifsAdditionGenerator as gen
} from '../js/core/generators/relatifsAddition.js';
import { makeRng } from '../js/core/ids.js';

const item = (params, index = 0, seed = 's') =>
    gen.generate(params, { index, rng: makeRng(`${seed}-${index}`) });

test('les nombres s\'écrivent à la française : virgule et vrai signe moins', () => {
    assert.equal(fmt(-3), '−3');
    assert.equal(fmt(4.5), '4,5');
    assert.equal(fmt(-2.7), '−2,7');
    assert.equal(fmt(0), '0');
    // Le tiret du clavier n'a rien à faire dans un chapitre où le signe EST
    // le sujet : il est plus court que le « − » des graduations.
    assert.ok(!fmt(-8).includes('-'));
});

test('l\'écriture simplifiée fait disparaître les parenthèses et le double signe', () => {
    assert.equal(complete(3, 5), '(+3) + (+5)');
    assert.equal(simplifiee(3, 5), '3 + 5');
    assert.equal(simplifiee(3, -5), '3 − 5');
    assert.equal(simplifiee(-3, 5), '−3 + 5');
    assert.equal(simplifiee(-3, -5), '−3 − 5');
    assert.equal(simplifiee(2.5, -1.2), '2,5 − 1,2');
});

test('les douze marches montent, et couvrent les trois temps', () => {
    assert.equal(ETAPES.length, 12);
    assert.deepEqual([...new Set(ETAPES.map(e => e.temps))], ['A', 'B', 'C']);
    // La difficulté monte À L'INTÉRIEUR d'un temps. Entre deux temps elle
    // redescend, et c'est voulu : B1 (les paires qui s'annulent) demande moins
    // de calcul que A4 (les décimaux), mais introduit l'idée neuve du
    // chapitre. On repart des pastilles pour la faire voir, pas pour occuper.
    for (const temps of ['A', 'B', 'C']) {
        const marches = ETAPES.filter(e => e.temps === temps);
        for (let i = 1; i < marches.length; i++) {
            assert.ok(marches[i].difficulte >= marches[i - 1].difficulte,
                `${marches[i].id} est plus facile que la marche précédente de son temps`);
        }
    }
    // Et chaque temps finit plus haut que le précédent.
    const finDe = (t) => ETAPES.filter(e => e.temps === t).slice(-1)[0].difficulte;
    assert.ok(finDe('B') > finDe('A'), 'le temps B doit finir plus haut que le temps A');
    assert.ok(finDe('C') > finDe('B'), 'le temps C doit finir plus haut que le temps B');
    // Chaque marche porte sa leçon : c'est ce que lira l'élève en mode
    // apprentissage, et ce que dira le robot.
    ETAPES.forEach(e => {
        assert.ok(e.lecon && e.lecon.length > 40, `${e.id} n'a pas de leçon`);
        assert.ok(e.aide && e.aide.length > 20, `${e.id} n'a pas d'aide`);
        assert.ok(e.titre, `${e.id} n'a pas de titre`);
    });
});

test('le temps A ne propose JAMAIS deux signes différents', () => {
    const rng = makeRng('A');
    for (const etape of ETAPES.filter(e => e.temps === 'A')) {
        for (let i = 0; i < 60; i++) {
            const { a, b } = tirerCouple(etape, rng);
            assert.equal((a >= 0), (b >= 0), `${etape.id} a sorti ${a} et ${b}`);
            if (etape.signes === 'positifs') assert.ok(a > 0 && b > 0);
            if (etape.signes === 'negatifs') assert.ok(a < 0 && b < 0);
        }
    }
});

test('le temps B ne propose QUE des signes différents — c\'est tout son objet', () => {
    const rng = makeRng('B');
    for (const etape of ETAPES.filter(e => e.temps === 'B')) {
        for (let i = 0; i < 60; i++) {
            const { a, b } = tirerCouple(etape, rng);
            assert.notEqual((a >= 0), (b >= 0), `${etape.id} a sorti ${a} et ${b}`);
        }
    }
});

test('les décimaux n\'ont qu\'un chiffre après la virgule, sans retenue ni emprunt', () => {
    const rng = makeRng('dec');
    for (const etape of ETAPES.filter(e => e.decimal)) {
        for (let i = 0; i < 200; i++) {
            const { a, b, total } = tirerCouple(etape, rng);
            for (const v of [a, b, total]) {
                const dixiemes = Math.abs(Math.round(v * 10));
                assert.equal(dixiemes % 1, 0, `${v} n'est pas un dixième rond`);
                assert.ok(Math.abs(v * 10 - Math.round(v * 10)) < 1e-9,
                    `${v} a plus d'un chiffre après la virgule`);
            }
            const da = Math.abs(Math.round(a * 10)) % 10;
            const db = Math.abs(Math.round(b * 10)) % 10;
            if ((a >= 0) === (b >= 0)) {
                assert.ok(da + db <= 9, `retenue sur les dixièmes : ${a} + ${b}`);
            } else {
                // Signes différents : le plus grand en distance à zéro doit
                // porter le plus grand chiffre des dixièmes, sinon il faut
                // emprunter — et l'emprunt n'est pas le sujet de cette marche.
                const grand = Math.abs(a) >= Math.abs(b) ? da : db;
                const petit = Math.abs(a) >= Math.abs(b) ? db : da;
                assert.ok(grand >= petit, `emprunt nécessaire : ${a} + ${b}`);
            }
        }
    }
});

test('le total est toujours exact, y compris avec des virgules', () => {
    const rng = makeRng('total');
    for (const etape of ETAPES) {
        for (let i = 0; i < 40; i++) {
            const { a, b, total } = tirerCouple(etape, rng);
            assert.equal(total, Math.round((a + b) * 10) / 10, `${a} + ${b}`);
        }
    }
});

test('les pastilles restent en nombre manipulable', () => {
    const rng = makeRng('past');
    for (const etape of ETAPES.filter(e => e.modele === 'pastilles')) {
        for (let i = 0; i < 60; i++) {
            const { a, b } = tirerCouple(etape, rng);
            assert.ok(Math.abs(a) <= 7 && Math.abs(b) <= 7,
                `${etape.id} demande de dessiner ${Math.abs(a)} et ${Math.abs(b)} pastilles`);
            assert.ok(Number.isInteger(a) && Number.isInteger(b), 'pas de pastille décimale');
        }
    }
});

test('les quatre écritures proposées sont distinctes et une seule est juste', () => {
    for (const [a, b] of [[3, 5], [-3, 5], [3, -5], [-3, -5], [2.5, -1.2]]) {
        const { juste, pieges } = ecrituresPossibles(a, b);
        assert.equal(juste, simplifiee(a, b));
        assert.ok(!pieges.includes(juste), 'un piège est identique à la bonne réponse');
        assert.equal(new Set(pieges).size, pieges.length, 'deux pièges identiques');
    }
});

test('la marche « simplifier » alterne vraiment écriture et calcul', () => {
    const params = { etape: 'a2-simplifier-meme' };
    const q0 = item(params, 0), q1 = item(params, 1);
    assert.equal(q0.meta.question, 'ecriture');
    assert.equal(q0.answerKind, 'choice');
    assert.match(q0.prompt.text, /plus simplement/);
    assert.equal(q1.meta.question, 'calcul');
});

test('une question d\'écriture a pour réponse une ÉCRITURE, pas un nombre', () => {
    const q = item({ etape: 'b2-simplifier-opposes' }, 0);
    assert.equal(typeof q.answer, 'string');
    assert.equal(q.choices.filter(c => c.correct).length, 1);
    assert.equal(q.choices.length, 4);
    assert.equal(q.choices.find(c => c.correct).value, q.answer);
});

test('une question de calcul a pour réponse le total, et des leurres qui parlent', () => {
    const q = item({ etape: 'b3-ecritures-opposes', reponse: 'choix' }, 1);
    assert.equal(q.answer, q.meta.a + q.meta.b);
    assert.equal(q.choices.filter(c => c.correct).length, 1);
    q.choices.filter(c => !c.correct).forEach(c =>
        assert.ok(c.why && c.why.length > 15, 'un leurre sans explication ne sert à rien'));
});

test('les leurres portent les erreurs classiques, et jamais la bonne réponse', () => {
    const l = leurres(-3, 5, 2);
    assert.ok(!l.some(d => d.value === 2), 'un leurre vaut la bonne réponse');
    assert.ok(l.some(d => d.value === 8), 'l\'erreur reine — additionner sans les signes');
    assert.ok(l.some(d => d.value === -2), 'le signe inversé');
    assert.equal(new Set(l.map(d => d.value)).size, l.length, 'deux leurres identiques');
});

test('en progressif, on parcourt les douze marches sans jamais reculer', () => {
    const vus = [];
    for (let i = 0; i < 24; i++) vus.push(item({ etape: 'progressif' }, i).meta.etape);
    assert.equal(vus[0], ETAPES[0].id);
    assert.equal(vus[23], ETAPES[11].id);
    const rangs = vus.map(id => ETAPES.findIndex(e => e.id === id));
    for (let i = 1; i < rangs.length; i++) assert.ok(rangs[i] >= rangs[i - 1], 'on est redescendu d\'une marche');
    assert.equal(new Set(vus).size, 12, 'les douze marches sont vues');
});

test('on peut ne travailler qu\'un temps', () => {
    for (const temps of ['A', 'B', 'C']) {
        for (let i = 0; i < 8; i++) {
            assert.equal(item({ etape: temps }, i).meta.temps, temps);
        }
    }
});

test('l\'explication refait le calcul au lieu d\'annoncer le résultat', () => {
    const a = -7, b = 3;
    const etape = ETAPES.find(e => e.id === 'b3-ecritures-opposes');
    const texte = expliquer(etape, a, b, -4);
    assert.match(texte, /signes sont différents/);
    assert.match(texte, /7 − 3 = 4/);
    assert.match(texte, /−4/);

    const past = ETAPES.find(e => e.id === 'b1-pastilles-opposes');
    const t2 = expliquer(past, 5, -3, 2);
    assert.match(t2, /3 paires/);
    assert.match(t2, /reste 2 pastilles rouges/);
});

test('chaque question porte sa leçon et son rang, pour l\'écran d\'apprentissage', () => {
    for (let i = 0; i < 24; i++) {
        const q = item({ etape: 'progressif' }, i);
        assert.ok(q.meta.texteLecon, 'leçon manquante');
        assert.ok(q.meta.titre, 'titre manquant');
        assert.ok(q.meta.rang >= 1 && q.meta.rang <= 12);
        assert.equal(q.meta.total_etapes, 12);
        assert.ok(q.hints.length >= 2, 'les aides montent d\'un cran à la fois');
        assert.ok(q.explanation.length > 30);
    }
});

test('l\'énoncé n\'utilise jamais le tiret du clavier', () => {
    for (let i = 0; i < 40; i++) {
        const q = item({ etape: 'progressif' }, i);
        assert.ok(!q.prompt.text.includes('-'), `« ${q.prompt.text} » contient un trait d'union`);
    }
});

test('la bonne écriture n\'est pas toujours la première proposée', () => {
    // Sans mélange, l'élève apprend à cliquer en haut à gauche au lieu de
    // lire les signes — et le score ne mesure plus rien.
    const positions = new Set();
    for (let i = 0; i < 30; i++) {
        const q = item({ etape: 'b2-simplifier-opposes' }, 0, `melange-${i}`);
        positions.add(q.choices.findIndex(c => c.correct));
    }
    assert.ok(positions.size >= 3, `la bonne réponse n'occupe que ${positions.size} position(s)`);
});

test('le rang annoncé situe l\'élève dans les DOUZE marches, même sur une seule étape', () => {
    const q = item({ etape: 'b3-ecritures-opposes' }, 0);
    assert.equal(q.meta.total_etapes, 12);
    assert.equal(q.meta.rang, ETAPES.findIndex(e => e.id === 'b3-ecritures-opposes') + 1);

    // Un temps isolé garde lui aussi le rang global.
    const t = item({ etape: 'C' }, 0);
    assert.equal(t.meta.total_etapes, 12);
    assert.ok(t.meta.rang >= 10, 'le temps C commence à la dixième marche');
});
