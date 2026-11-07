// 3,5 = 35/10, ET 35/10 = 3,5 — le même nombre, deux écritures.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, après une séance : « on a fait des exercices où il faut convertir 3,5
// en 35/10 etc et inversement ». Le catalogue n'avait rien : neuf exercices de
// fractions, cinq de décimaux, et pas un seul qui dise que ce sont les MÊMES
// nombres.
//
// TROIS PROMESSES, ET AUCUNE NE SE VOIT EN JOUANT UNE PARTIE :
//
// · L'ÉGALITÉ EST JUSTE À CHAQUE TIRAGE. Une question fausse sur cinquante ne
//   se remarque qu'en classe, et c'est l'élève qui a raison qu'on corrige.
// · LE CALCUL NE PASSE PAS PAR LES FLOTTANTS. 305 / 100 vaut
//   3.0500000000000003 sur une machine : la réponse attendue serait fausse
//   d'un cheveu, et l'élève qui écrit 3,05 aurait tort.
// · LA TOUCHE VIRGULE SUIT LA QUESTION. `meta.decimal` la fait apparaître. Un
//   pavé sans virgule là où l'on attend 7,49 rend la question IMPOSSIBLE — et
//   le défaut se verrait au pavé, loin d'ici.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { fractionDecimaleGenerator } from '../js/core/generators/fractionDecimale.js';

/** Cent tirages, tous réglages ouverts : c'est la classe entière d'une heure. */
function cent(params = {}) {
    const items = [];
    for (let i = 0; i < 100; i++) {
        const rng = makeRng('frac-dec-' + i);
        items.push(fractionDecimaleGenerator.generate({
            sens: 'les-deux', trou: 'les-deux',
            rangs: ['dixiemes', 'centiemes', 'milliemes'],
            maxEntier: 9, piegeZero: true, ...params
        }, { rng, index: i }));
    }
    return items;
}

test('CHAQUE ÉGALITÉ TIRÉE EST JUSTE', () => {
    for (const it of cent()) {
        const { sens, rang, trou } = it.meta;
        const den = { dixiemes: 10, centiemes: 100, milliemes: 1000 }[rang];
        const m = /^(-?[\d,]+) = \?\/(\d+)$/.exec(it.meta.enonce)
            || /^(-?[\d,]+) = (\d+)\/\?$/.exec(it.meta.enonce)
            || /^(\d+)\/(\d+) = \?$/.exec(it.meta.enonce);
        assert.ok(m, `énoncé illisible : « ${it.meta.enonce} »`);

        if (sens === 'vers-virgule') {
            // ON REFAIT LE CALCUL AUTREMENT que le générateur ne l'a fait :
            // relire sa propre sortie ne prouve rien.
            assert.equal(Number(it.answer), Number(m[1]) / Number(m[2]),
                `${it.meta.enonce} attend ${it.answer}, or ${m[1]}/${m[2]} ne fait pas cela.`);
        } else {
            const dec = Number(String(m[1]).replace(',', '.'));
            const numerateur = trou === 'numerateur' ? Number(it.answer) : Number(m[2]);
            const denominateur = trou === 'denominateur' ? Number(it.answer) : den;
            assert.ok(Math.abs(dec * denominateur - numerateur) < 1e-9,
                `${it.meta.enonce} attend ${it.answer} : `
                + `${dec} × ${denominateur} ne fait pas ${numerateur}.`);
        }
    }
});

test('LE NOMBRE A AUTANT DE DÉCIMALES QUE LE DÉNOMINATEUR A DE ZÉROS', () => {
    // C'EST LA RÈGLE QU'ON ENSEIGNE, et une question qui la contredit punit
    // l'élève qui l'applique. « 3,5 = ?/100 » a beau être vrai — 350/100 — la
    // règle du cours donne 35, et l'élève consciencieux est marqué faux.
    //
    // Cela arrive dès qu'un tirage pose un ZÉRO EN DERNIÈRE POSITION : 3,50
    // s'écrit 3,5, et la question garde pourtant son dénominateur 100. Le
    // générateur l'évite ; cette épreuve garde qu'il continue.
    //
    // (Ici se trouvait une épreuve sur les flottants. Elle ne gardait RIEN :
    // la division par une puissance de dix est exacte sur les 300 000
    // numérateurs que cet exercice peut tirer — essayé un par un. On ne garde
    // pas un danger qu'on a supposé.)
    const zeros = { dixiemes: 1, centiemes: 2, milliemes: 3 };
    for (const it of cent()) {
        const ecriture = it.meta.sens === 'vers-virgule'
            ? String(it.answer).replace('.', ',')
            : /^(-?[\d,]+) =/.exec(it.meta.enonce)[1];
        const apres = (String(ecriture).split(',')[1] || '').length;
        assert.equal(apres, zeros[it.meta.rang],
            `« ${it.meta.enonce} » : ${ecriture} a ${apres} décimale(s) mais le `
            + `dénominateur en annonce ${zeros[it.meta.rang]}. L'élève qui compte les `
            + 'chiffres après la virgule, comme on le lui apprend, sera marqué faux.');
    }
});

test('LA TOUCHE VIRGULE SUIT CE QU\'ON DEMANDE', () => {
    for (const it of cent()) {
        const attenduDecimal = it.meta.sens === 'vers-virgule';
        assert.equal(!!it.meta.decimal, attenduDecimal,
            `« ${it.meta.enonce} » demande ${attenduDecimal ? 'un décimal' : 'un entier'} `
            + `et annonce decimal: ${it.meta.decimal}. Le pavé montrera la mauvaise touche.`);
        // Un numérateur ou un dénominateur est un ENTIER : si la réponse en
        // sens « vers-fraction » portait une virgule, le pavé ne pourrait même
        // pas la saisir.
        if (!attenduDecimal) {
            assert.ok(Number.isInteger(Number(it.answer)),
                `« ${it.meta.enonce} » attend ${it.answer}, qui n'est pas un entier.`);
        }
    }
});

test('LE ZÉRO QUI TIENT LE RANG EST VRAIMENT POSÉ', () => {
    // C'EST LA QUESTION DU CHAPITRE — 7/100 fait 0,07 et non 0,7 — et elle ne
    // sort presque jamais d'un tirage uniforme. Une épreuve qui ne la compte
    // pas laisserait le réglage devenir décoratif sans que rien ne rougisse.
    const avec = cent().filter(it => it.meta.avecZero);
    assert.ok(avec.length >= 10,
        `le zéro qui tient le rang ne sort que ${avec.length} fois sur cent : `
        + 'le piège du chapitre est devenu une curiosité.');
    for (const it of avec) {
        const ecriture = it.meta.sens === 'vers-virgule'
            ? String(it.answer) : /^(-?[\d,]+) =/.exec(it.meta.enonce)[1];
        assert.match(String(ecriture).replace('.', ','), /,0/,
            `« ${it.meta.enonce} » est annoncé comme piège du zéro, `
            + `mais ${ecriture} n'en porte pas.`);
    }
});

test('ON PEUT FIGER UN SEUL SENS POUR UNE REMÉDIATION', () => {
    // Le réglage existe pour dix minutes de remédiation. S'il cessait d'être
    // lu, le professeur croirait travailler un sens et en poserait deux.
    for (const sens of ['vers-virgule', 'vers-fraction']) {
        for (const it of cent({ sens })) {
            assert.equal(it.meta.sens, sens,
                `réglé sur « ${sens} », le générateur a tiré « ${it.meta.sens} ».`);
        }
    }
});
