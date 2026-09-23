// CALCULER AVEC DES FRACTIONS — NEUF BARREAUX, ET DEUX ARITHMÉTIQUES.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, photo du Devoir libre n°1 : « et pareil, des exercices très progressifs
// pour savoir calculer cela. » Son exercice 1 : « calculer puis préciser le
// plus petit ensemble auquel appartient le résultat ».
//
// TOUT SE CALCULE EN RATIONNELS EXACTS, et ce n'est pas un raffinement : la
// seconde question du devoir demande de distinguer 1/3 de 0,333… Un calcul
// mené en virgule flottante ne saurait PAS y répondre — il rendrait 0,3333333
// dans les deux cas.
//
// ET ON NE SE RELIT PAS, ON SE CONTREDIT. Le premier test recalcule chaque
// énoncé PAR UN AUTRE CHEMIN : il évalue le TEXTE de l'expression en nombres
// à virgule, et compare. Deux arithmétiques indépendantes qui tombent
// d'accord, c'est une preuve ; une arithmétique qui se relit elle-même n'en
// est pas une.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POUR_ESSAI as P, calculFractionsGenerator as G }
    from '../js/core/generators/calculFractions.js';
import { exercices } from '../js/data/catalog.js';
import { SKILLS } from '../js/data/skills.js';
import '../js/core/activities/index.js';
import { allGenerators } from '../js/core/registry.js';
import { codeCourt } from '../js/core/shortcodes.js';
import { makeRng } from '../js/core/ids.js';

const { BARREAUX, fr, txt, plusPetitEnsemble } = P;
const RANGS = [1, 2, 3, 4, 5, 6, 7, 8];
const val = (f) => f.n / f.d;

/** Le TEXTE de l'énoncé, évalué en flottant — l'autre chemin. */
function enFlottant(texte) {
    const js = texte
        .replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/')
        .replace(/(\d)\s*\(/g, '$1*(')
        .replace(/\)\s*\(/g, ')*(')
        .replace(/(\d+)\/(\d+)/g, '($1/$2)');
    return Function(`"use strict"; return (${js});`)();
}

test('LES DEUX ARITHMÉTIQUES TOMBENT D\'ACCORD', () => {
    let n = 0;
    RANGS.forEach(rang => {
        for (let i = 0; i < 120; i++) {
            const q = BARREAUX[rang].faire(makeRng(`x_${rang}_${i}`));
            n++;
            assert.ok(q.valeur, `barreau ${rang} : pas de valeur (division par zéro ?)`);
            assert.ok(Math.abs(enFlottant(q.texte) - val(q.valeur)) < 1e-9,
                `barreau ${rang} : ${q.texte} — exact ${txt(q.valeur)}, flottant ${enFlottant(q.texte)}`);
        }
    });
    assert.ok(n >= 900, `${n} questions : l'échantillon a rétréci`);
});

test('LE PLUS PETIT ENSEMBLE SE CALCULE, IL NE S\'APPROCHE PAS', () => {
    // C'est la seconde question du devoir, et elle exige l'arithmétique
    // exacte : une fraction réduite est décimale si son dénominateur ne garde
    // que des 2 et des 5. 7/20 oui, 1/3 jamais — et aucun flottant ne fait
    // la différence.
    [[4, 1, 'N'], [-4, 1, 'Z'], [0, 1, 'N'], [7, 20, 'D'], [1, 3, 'Q'],
        [91, 6, 'Q'], [171, 20, 'D'], [-10, 3, 'Q'], [3, 8, 'D'], [5, 6, 'Q']]
        .forEach(([n, d, attendu]) =>
            assert.equal(plusPetitEnsemble(fr(n, d)), attendu, `${n}/${d}`));
});

test('CHAQUE BARREAU TIENT SA PROMESSE', () => {
    // LE BARREAU 1 NE LA TENAIT PLUS. Il tire un dénominateur d puis un
    // multiple d×k — mais la réduction ramenait 2/6 à 1/3, et l'élève
    // recevait « 1/4 + 2/3 » : deux dénominateurs sans rapport, sur
    // l'exercice dont tout l'intérêt était que l'un soit multiple de l'autre.
    // Le barreau annonçait une chose et en travaillait une autre.
    //
    // ET LE 2 NON PLUS, pour une autre raison : le rattrapage « si d2 est un
    // multiple, je mets d1 + 3 » retombait sur un multiple une fois sur
    // treize. L'élève croyait monter d'un cran et refaisait le précédent.
    const denoms = (t) => t.split(/ [+−] /).map(x => Number(x.split('/')[1] || 1));
    for (let i = 0; i < 300; i++) {
        const [a, b] = denoms(BARREAUX[1].faire(makeRng(`p1_${i}`)).texte);
        assert.ok(b % a === 0 || a % b === 0,
            `barreau 1 : ${a} et ${b} — aucun n'est multiple de l'autre`);
        const [c, d] = denoms(BARREAUX[2].faire(makeRng(`p2_${i}`)).texte);
        assert.ok(d % c !== 0 && c % d !== 0,
            `barreau 2 : ${c} et ${d} — l'un est multiple de l'autre, c'est le barreau 1`);
    }
});

test('QUATRE PROPOSITIONS, TOUJOURS, ET UNE SEULE JUSTE', () => {
    // MESURÉ AVANT LA CORRECTION : sur 3 300 questions, 8 n'avaient qu'UNE
    // proposition — la bonne réponse toute seule — et 150 n'en avaient que
    // deux. Deux fautes différentes tombent parfois sur le même nombre, ou
    // sur le bon ; on les écarte alors, et il ne reste rien. Une question à
    // une proposition n'est pas difficile, elle est cassée — et rien ne le
    // signalait.
    const barreaux = ['1', '2', '3', '4', '5', '6', '7', '8', 'ensemble',
        'revision', 'toutes'];
    barreaux.forEach(barreau => {
        for (let i = 0; i < 60; i++) {
            const it = G.generate({ barreau }, { rng: makeRng(`q_${barreau}_${i}`) });
            assert.equal(it.choices.length, 4,
                `barreau ${barreau} : ${it.choices.length} proposition(s)`);
            assert.equal(it.choices.filter(c => c.correct).length, 1);
            const vues = it.choices.map(c => c.label);
            assert.equal(new Set(vues).size, 4, `barreau ${barreau} : deux fois la même`);
            it.choices.filter(c => !c.correct).forEach(c =>
                assert.ok(c.why && c.why.length > 25, 'un leurre sans explication'));
        }
    });
});

test('AUCUN LEURRE NE VAUT LA BONNE RÉPONSE', () => {
    // Un leurre qui vaut la réponse n'est pas un leurre : c'est une SECONDE
    // bonne réponse, marquée fausse. Ici on compare les VALEURS, pas les
    // étiquettes — deux écritures différentes du même nombre seraient le même
    // piège sous un autre nom.
    ['1', '2', '3', '4', '5', '6', '7', '8', 'toutes'].forEach(barreau => {
        for (let i = 0; i < 60; i++) {
            const it = G.generate({ barreau }, { rng: makeRng(`v_${barreau}_${i}`) });
            const lire = (s) => {
                const m = /<span class="fraction-num">(\d+)<\/span><span class="fraction-den">(\d+)/.exec(s);
                const signe = /^−/.test(s) ? -1 : 1;
                return m ? signe * Number(m[1]) / Number(m[2]) : Number(s.replace('−', '-'));
            };
            const bonne = lire(it.choices.find(c => c.correct).label);
            it.choices.filter(c => !c.correct).forEach(c =>
                assert.ok(Math.abs(lire(c.label) - bonne) > 1e-12,
                    `barreau ${barreau} : « ${c.label} » vaut la bonne réponse`));
        }
    });
});

test('LE NEUVIÈME BARREAU EST LA QUESTION DU DEVOIR', () => {
    // « calculer puis préciser le plus petit ensemble auquel appartient le
    // résultat ». La réponse est un ENSEMBLE, et l'on ne peut pas y répondre
    // sans avoir calculé : c'est tout l'intérêt de la poser ainsi.
    const vus = new Set();
    for (let i = 0; i < 120; i++) {
        const it = G.generate({ barreau: 'ensemble' }, { rng: makeRng(`e_${i}`) });
        assert.equal(it.skillId, 'nb.ensembles.appartenance');
        assert.equal(it.choices.length, 4);
        it.choices.forEach(c => assert.match(c.label, /^[ℕℤ𝔻ℚ] — les \p{L}/u, c.label));
        assert.match(it.prompt.papier, /préciser le plus petit ensemble/);
        vus.add(it.meta.ensemble);
    }
    // Les quatre ensembles doivent pouvoir sortir : si un seul sortait, la
    // question se devinerait sans calculer.
    assert.ok(vus.size >= 3, `seulement ${vus.size} ensemble(s) différent(s) : ${[...vus]}`);
});

test('LES DIX EXERCICES SONT AU CATALOGUE, DANS L\'ORDRE', () => {
    const miens = exercices.filter(e => /^cf-/.test(e.id));
    assert.equal(miens.length, 10, 'neuf barreaux plus la révision');
    for (let r = 1; r <= 9; r++) {
        const e = miens.find(x => x.id === `cf-${r}`);
        assert.ok(e, `barreau ${r} absent`);
        assert.match(e.title, new RegExp(`^${r}\\.`), 'le titre ne porte pas son rang');
        assert.ok(e.instruction && e.instruction.length >= 10);
        assert.equal(e.generatorId, 'nb.calculFractions');
        // PAS DE I, PAS DE O, PAS DE Q : ces codes se DICTENT en classe.
        const c = codeCourt(e.id);
        assert.equal(c.length, 3, `${e.id} : code « ${c} »`);
        assert.ok(!/[IOQ]/.test(c), `${e.id} : ${c} s'entend mal`);
    }
    // Le neuvième porte la consigne du devoir, mot pour mot.
    assert.match(miens.find(x => x.id === 'cf-9').consignePapier,
        /préciser le plus petit ensemble/);
});

test('ET PLUS AUCUN PRÉREQUIS FANTÔME, NULLE PART', () => {
    // QUATRE FOIS EN UNE SEMAINE : `num.relatifs.comparaison`,
    // `lit.developper.simple`, `frac.addition.denominateurs`… La cause est
    // toujours la même — j'invente un identifiant qui SONNE juste au lieu
    // d'ouvrir la liste. Et rien ne tombe : un prérequis fantôme ne lève
    // aucune erreur, il rend seulement la remédiation muette. L'élève en
    // difficulté ne se voit jamais proposer ce qui lui manque, et c'est
    // exactement ce qu'on ne verrait jamais.
    //
    // Ce test ne garde plus mes compétences : il garde TOUT le référentiel.
    const fantomes = [];
    Object.entries(SKILLS).forEach(([id, s]) =>
        (s.prereqs || []).forEach(p => {
            if (!SKILLS[p]) fantomes.push(`${p} (prérequis de ${id})`);
        }));
    assert.deepEqual(fantomes, []);
    // Et le générateur est branché.
    assert.ok(allGenerators().map(g => g.id).includes('nb.calculFractions'));
});
