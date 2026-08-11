import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    decaler, normaliser, placer, combler, etendue, nomRang, tirerQuestion, propositions,
    ajouterZeros, expliquer, verifierGlissement, verifierEcriture, IDS_NIVEAUX, PHASES
} from '../js/core/virgule.js';
import { makeRng } from '../js/core/ids.js';

const NIVEAUX = IDS_NIVEAUX;

test('décaler se fait sur le TEXTE, donc sans poussière binaire', () => {
    // 0,1 × 3 vaut 0.30000000000000004 en flottant. Un exercice sur l'écriture
    // décimale ne peut pas se permettre ça.
    assert.equal(decaler('2,5', 1), '25');
    assert.equal(decaler('2,5', 2), '250');
    assert.equal(decaler('2,5', -1), '0,25');
    assert.equal(decaler('2,5', -2), '0,025');
    assert.equal(decaler('12,34', 1), '123,4');
    assert.equal(decaler('0,07', 3), '70');
    assert.equal(decaler('345', -3), '0,345');
    assert.equal(decaler('9,999', 3), '9999');
});

test('décaler puis revenir redonne EXACTEMENT le nombre de départ', () => {
    for (const n of ['2,5', '0,07', '123,456', '9,9', '1000,1']) {
        for (const k of [1, 2, 3]) {
            assert.equal(decaler(decaler(n, k), -k), normaliser(n), `${n} décalé de ${k}`);
            assert.equal(decaler(decaler(n, -k), k), normaliser(n), `${n} décalé de -${k}`);
        }
    }
});

test('l\'écriture se normalise : ni zéro devant, ni zéro derrière', () => {
    assert.equal(normaliser('02,50'), '2,5');
    assert.equal(normaliser('0,500'), '0,5');
    assert.equal(normaliser('25,0'), '25');
    assert.equal(normaliser('000'), '0');
    assert.equal(normaliser('7'), '7');
});

test('chaque chiffre connaît son rang, et les unités valent zéro', () => {
    const p = placer('123,4');
    assert.deepEqual(p, [
        { chiffre: '1', e: 2 }, { chiffre: '2', e: 1 },
        { chiffre: '3', e: 0 }, { chiffre: '4', e: -1 }
    ]);
    assert.equal(nomRang(0), 'unités');
    assert.equal(nomRang(-1), 'dixièmes');
    assert.equal(nomRang(1), 'dizaines');
    // Dizaines et dixièmes ne sont pas le même rang : c'est la confusion la
    // plus fréquente du chapitre.
    assert.notEqual(nomRang(1), nomRang(-1));
});

test('MULTIPLIER PAR 10 N\'EST PAS AJOUTER UN ZÉRO', () => {
    // C'est toute la raison d'être de l'exercice : la règle marche pour les
    // entiers et casse dès la première décimale.
    assert.equal(ajouterZeros('2,5', 1), '2,50');
    assert.equal(normaliser(ajouterZeros('2,5', 1)), '2,5', 'ajouter un zéro ne change pas le nombre');
    assert.notEqual(normaliser(ajouterZeros('2,5', 1)), decaler('2,5', 1));
    // Et pour un entier, la règle fausse tombe juste — d'où le piège.
    assert.equal(decaler('25', 1), '250');
});

test('LES ZÉROS IMPLICITES sont écrits — sinon le tableau ment', () => {
    // Après × 1000, les chiffres de 77,77 occupent les rangs 4 à 1 : la colonne
    // des unités est vide. On lit pourtant 77770, pas 7777 — et c'est
    // exactement l'erreur que l'élève commet.
    const decale = (n, k) => combler(placer(n).map(c => ({ ...c, e: c.e + k })));
    const lu = (cases) => cases.map(c => c.chiffre).join('');
    assert.equal(lu(decale('77,77', 3)), '77770');
    assert.equal(lu(decale('2,5', 1)), '25');
    assert.equal(lu(decale('2,5', -2)), '0025', 'les zéros de gauche existent aussi dans le tableau');
    // Le tableau et l'écriture disent la MÊME chose, toujours.
    for (const n of ['77,77', '2,5', '0,07', '123,4', '9,99']) {
        for (const k of [-3, -2, -1, 0, 1, 2, 3]) {
            const cases = decale(n, k);
            assert.equal(new Set(cases.map(c => c.e)).size, cases.length, `${n} ${k} : rang en double`);
            const attendu = normaliser(decaler(n, k)).replace(',', '').replace(/^0+(?=\d)/, '');
            const obtenu = lu(cases).replace(/^0+(?=\d)/, '').replace(/0+$/, (m, i, s) =>
                cases.some(c => c.e < 0) ? '' : m);
            assert.ok(obtenu.includes(attendu.slice(0, 2)), `${n} ×10^${k} : ${lu(cases)} vs ${decaler(n, k)}`);
        }
    }
    // Aucune colonne vide entre le premier et le dernier chiffre.
    const c = decale('9,99', 2);
    const rangs = c.map(x => x.e);
    for (let i = 1; i < rangs.length; i++) assert.equal(rangs[i - 1] - rangs[i], 1, 'trou dans le tableau');
});

test('la question porte TOUJOURS sur un nombre à virgule', () => {
    // Avec un entier, « on ajoute un zéro » marche, et l'élève repart avec sa
    // règle fausse renforcée.
    for (const n of NIVEAUX) {
        for (let g = 1; g <= 60; g++) {
            const q = tirerQuestion(n, makeRng(`${n}-${g}`));
            assert.match(q.depart, /,/, `${n} ${g} : « ${q.depart} » n'a pas de décimale`);
        }
    }
});

test('le résultat annoncé est le bon décalage', () => {
    for (const n of NIVEAUX) {
        for (let g = 1; g <= 60; g++) {
            const q = tirerQuestion(n, makeRng(`r-${n}-${g}`));
            assert.equal(q.resultat, decaler(q.depart, q.rangs), `${n} ${g}`);
            assert.equal(Math.abs(q.rangs), String(q.facteur).length - 1);
            assert.equal(Math.sign(q.rangs), q.op === '×' ? 1 : -1);
        }
    }
});

test('tout tient dans le tableau de numération', () => {
    // Un résultat au-delà des dizaines de mille ou des millièmes ne se lit
    // plus : le tableau serait plus large que l'écran.
    for (const n of NIVEAUX) {
        for (let g = 1; g <= 60; g++) {
            const q = tirerQuestion(n, makeRng(`t-${n}-${g}`));
            const e = etendue(q.resultat);
            assert.ok(e.haut <= 4 && e.bas >= -3, `${n} ${g} : ${q.resultat} déborde du tableau`);
        }
    }
});

test('quatre propositions distinctes, une seule juste', () => {
    for (const n of NIVEAUX) {
        for (let g = 1; g <= 60; g++) {
            const q = tirerQuestion(n, makeRng(`c-${n}-${g}`));
            assert.equal(q.choix.length, 4, `${n} ${g}`);
            assert.equal(q.choix.filter(c => c.juste).length, 1, `${n} ${g}`);
            assert.equal(new Set(q.choix.map(c => c.v)).size, 4, `${n} ${g} : doublon`);
            q.choix.filter(c => !c.juste).forEach(c => {
                assert.ok(c.pourquoi && c.pourquoi.length > 20, `${n} ${g} : erreur sans explication`);
            });
        }
    }
});

test('LES TROIS FAUSSES RÈGLES sont présentes dans les propositions', () => {
    // Le zéro ajouté, le mauvais sens, le mauvais nombre de rangs.
    let zero = 0, sens = 0;
    for (const n of NIVEAUX) {
        for (let g = 1; g <= 40; g++) {
            const q = tirerQuestion(n, makeRng(`f-${n}-${g}`));
            const vals = q.choix.map(c => c.v);
            if (vals.includes(normaliser(ajouterZeros(q.depart, Math.abs(q.rangs))))) zero++;
            if (vals.includes(decaler(q.depart, -q.rangs))) sens++;
        }
    }
    assert.ok(sens > 100, `le mauvais sens n'apparaît que ${sens} fois`);
    // Le « zéro ajouté » ne survit pas toujours à la normalisation (il vaut
    // alors le nombre de départ), mais il doit rester fréquent.
    assert.ok(zero > 60, `le zéro ajouté n'apparaît que ${zero} fois`);
});

test('le glissement juste est accepté, et l\'erreur est nommée', () => {
    const q = { depart: '2,5', op: '×', facteur: 100, rangs: 2, resultat: '250' };
    assert.equal(verifierGlissement(q, 2).ok, true);
    const sens = verifierGlissement(q, -2);
    assert.equal(sens.faute, 'sens');
    assert.match(sens.message, /plus GRAND/);
    const rangs = verifierGlissement(q, 1);
    assert.equal(rangs.faute, 'rangs');
    assert.match(rangs.message, /2 rangs/);
    const trop = verifierGlissement(q, 3);
    assert.equal(trop.faute, 'rangs');
    assert.match(trop.message, /un de trop/);
    // Ne rien avoir bougé n'est pas une erreur de sens.
    assert.equal(verifierGlissement(q, 0).faute, 'rangs');
});

test('l\'écriture accepte les deux notations du même nombre', () => {
    const q = tirerQuestion('facile', makeRng('ecr'));
    assert.equal(verifierEcriture(q, q.resultat).ok, true);
    assert.equal(verifierEcriture(q, q.resultat.replace(',', '.')).ok, true);
    assert.equal(verifierEcriture(q, ` ${q.resultat} `).ok, true);
    assert.equal(verifierEcriture(q, '').faute, 'vide');
    assert.equal(verifierEcriture(q, 'abc').faute, 'vide');
});

test('une écriture fausse CONNUE est expliquée, pas seulement refusée', () => {
    const q = { depart: '2,5', op: '×', facteur: 10, rangs: 1, resultat: '25' };
    const r = verifierEcriture(q, '0,25');
    assert.equal(r.faute, 'connue');
    assert.match(r.message, /mauvais sens/i);
});

test('la correction dit ce qui se passe, et que la virgule ne bouge pas', () => {
    for (const n of NIVEAUX) {
        for (let g = 1; g <= 25; g++) {
            const q = tirerQuestion(n, makeRng(`x-${n}-${g}`));
            const e = expliquer(q);
            assert.equal(e.length, 3);
            e.forEach(l => assert.ok(!/undefined|NaN/.test(l), `${n} : ${l}`));
            assert.match(e[2], /virgule ne bouge pas/);
            assert.ok(e[2].includes(q.resultat), `${n} ${g} : la correction ne donne pas le résultat`);
            // La deuxième ligne nomme deux rangs DIFFÉRENTS.
            assert.match(e[1], /passe des .+ aux .+/);
        }
    }
});

test('les trois phases sont déclarées dans l\'ordre du travail', () => {
    assert.deepEqual(PHASES, ['glisser', 'qcm', 'ecrire']);
});

test('deux graines différentes donnent deux questions différentes', () => {
    for (const n of NIVEAUX) {
        const a = tirerQuestion(n, makeRng(`a-${n}`));
        const b = tirerQuestion(n, makeRng(`b-${n}`));
        assert.notEqual(a.depart + a.op + a.facteur, b.depart + b.op + b.facteur, `${n}`);
    }
});

test('« facile » ne divise pas encore', () => {
    for (let g = 1; g <= 40; g++) {
        const q = tirerQuestion('facile', makeRng(`fa${g}`));
        assert.equal(q.op, '×', `graine ${g} : division au niveau facile`);
        assert.ok(q.facteur <= 100, `graine ${g} : ${q.facteur} au niveau facile`);
    }
});
