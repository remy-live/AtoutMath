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
    // L'ÉCHELLE A ÉTÉ RENUMÉROTÉE — Rémy : « pour ton calcul de fractions il
    // faut être plus progressif ». Le « même dénominateur », qui manquait
    // complètement, est devenu le premier barreau, et les deux cas d'addition
    // qui suivent ont glissé d'un cran. Les promesses, elles, n'ont pas changé.
    const denoms = (t) => t.split(/ [+−] /).map(x => Number(x.split('/')[1] || 1));
    for (let i = 0; i < 300; i++) {
        // 1 — MÊME dénominateur : il n'y a rien à convertir, et c'est tout le
        // sujet. C'est là que se prend, ou ne se prend plus, la faute reine.
        const [m1, m2] = denoms(BARREAUX[1].faire(makeRng(`p0_${i}`)).texte);
        assert.equal(m1, m2,
            `barreau 1 : ${m1} et ${m2} — les dénominateurs devraient être les mêmes`);
        // 2 — l'un est multiple de l'autre : UNE seule conversion.
        const [a, b] = denoms(BARREAUX[2].faire(makeRng(`p1_${i}`)).texte);
        assert.ok(a !== b && (b % a === 0 || a % b === 0),
            `barreau 2 : ${a} et ${b} — l'un devrait être multiple de l'autre, sans être égal`);
        // 3 — ni l'un ni l'autre : il faut vraiment chercher le commun.
        const [c, d] = denoms(BARREAUX[3].faire(makeRng(`p2_${i}`)).texte);
        assert.ok(d % c !== 0 && c % d !== 0,
            `barreau 3 : ${c} et ${d} — l'un est multiple de l'autre, c'est le barreau 2`);
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

// UN CHAPITRE SUR LES FRACTIONS POSE DES FRACTIONS.
//
// MESURÉ AVANT LA CORRECTION, et c'est ce qui rendait l'échelle bancale
// autant que les marches manquantes : le barreau « un entier devant une
// parenthèse » posait 25,2 % de questions SANS AUCUNE FRACTION — « 5(2 − 1) »,
// « 4(3 − 3) » — et 6,1 % de réponses nulles. Celui des divisions écrivait
// « 1 ÷ 2 », celui des parenthèses « (5 − 1)(5/6 + 1) ».
//
// La cause était la même dans quatre barreaux : `fr(rng.int(2, 9), rng.int(2, 7))`
// paraît tirer une fraction, mais `fr` RÉDUIT — fr(4, 2) vaut 2. Une question
// sans fraction n'est pas une marche facile, c'est une marche absente.
test('CHAQUE BARREAU POSE DE VRAIES FRACTIONS', () => {
    for (let r = 1; r <= 12; r++) {
        let sans = 0, nul = 0;
        const N = 400;
        for (let i = 0; i < N; i++) {
            const it = G.generate({ barreau: String(r) }, { rng: makeRng(`vf_${r}_${i}`) });
            const e = it.prompt.text.replace(/^Calcule[^:]*: /, '');
            if (!/\d+\/\d+/.test(e)) sans++;
            if (it.choices.find(c => c.correct).texte === '0') nul++;
        }
        assert.ok(sans / N <= 0.005,
            `barreau ${r} : ${(100 * sans / N).toFixed(1)} % de questions sans fraction`);
        assert.ok(nul / N <= 0.01,
            `barreau ${r} : ${(100 * nul / N).toFixed(1)} % de réponses nulles`);
    }
});

// LES MARCHES DU BAS NE DEMANDENT QU'UNE CHOSE À LA FOIS.
//
// C'est la demande de Rémy, rendue vérifiable : les trois barreaux
// d'introduction d'une opération — fraction × entier, diviser par un entier —
// ne mettent qu'UNE fraction en jeu. Celui qui en met deux vient après.
test('LES MARCHES D\'INTRODUCTION NE POSENT QU\'UNE FRACTION', () => {
    const combien = (r) => {
        let total = 0;
        for (let i = 0; i < 200; i++) {
            const e = G.generate({ barreau: String(r) }, { rng: makeRng(`c_${r}_${i}`) })
                .prompt.text.replace(/^Calcule[^:]*: /, '');
            total += (e.match(/\d+\/\d+/g) || []).length;
        }
        return total / 200;
    };
    // 4 : fraction × entier — une seule fraction.  5 : fraction × fraction.
    assert.ok(combien(4) < 1.2, `barreau 4 : ${combien(4).toFixed(2)} fractions en moyenne`);
    assert.ok(combien(5) > combien(4), 'le barreau 5 devrait en poser plus que le 4');
    // 7 : diviser par un entier — une seule.  8 : diviser par une fraction.
    assert.ok(combien(7) < 1.2, `barreau 7 : ${combien(7).toFixed(2)} fractions en moyenne`);
    assert.ok(combien(8) > combien(7), 'le barreau 8 devrait en poser plus que le 7');
});

test('LES QUINZE EXERCICES SONT AU CATALOGUE, DANS L\'ORDRE', () => {
    const miens = exercices.filter(e => /^cf-/.test(e.id));
    assert.equal(miens.length, 15,
        'douze barreaux, l\'ensemble, la révision et le pas à pas');
    // LA CARTE « PAS À PAS » EST PRÊTE — Rémy : « c'est génial ton idée de
    // carte "pas à pas" prête ». Elle porte les huit premiers barreaux, les
    // seuls dont la chaîne est écrite.
    const pas = miens.find(e => e.id === 'cf-pas');
    assert.ok(pas, 'la carte « Fractions pas à pas » a disparu');
    assert.equal(pas.params.etapes, 'oui');
    assert.equal(pas.params.barreau, 'revision');
    for (let r = 1; r <= 12; r++) {
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
    // LA QUESTION DU DEVOIR A SON IDENTIFIANT PROPRE, et non un numéro de
    // barreau : elle ne monte pas d'un cran sur la précédente, elle demande
    // autre chose. Un numéro l'aurait rangée dans l'échelle, où elle n'est pas.
    const ens = miens.find(x => x.id === 'cf-ensemble');
    assert.ok(ens, 'l\'exercice « dire l\'ensemble » a disparu');
    assert.match(ens.consignePapier, /préciser le plus petit ensemble/);
    assert.ok(!/^\d/.test(ens.title), 'il ne porte pas de rang dans l\'échelle');
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

// ── LE PAS À PAS DES FRACTIONS ──────────────────────────────────────────────
//
// RÉMY : « oui fais les ». Trois gestes dans une somme de fractions — le
// dénominateur commun, les numérateurs, la simplification — et un « faux » sur
// le résultat ne dit pas lequel a lâché.

test('CHAQUE LIGNE VAUT L\'ÉNONCÉ, ET NE SE LAISSE PAS SAUTER', async () => {
    const { lireExacte, memeR } = await import('../js/core/maths/valeurExacte.js');
    const fx = await import('../js/core/maths/formule.js');
    let lignesVues = 0;
    for (let b = 1; b <= 8; b++) {
        for (let i = 0; i < 50; i++) {
            const it = G.generate({ barreau: String(b), etapes: 'oui' },
                { rng: makeRng(`cfc_${b}_${i}`) });
            assert.equal(it.meta.saisieSeule, true, `[b${b}] le clavier ne prend pas la main`);
            const etapes = it.meta.etapes || [];
            assert.ok(etapes.length >= 1, `[b${b}] aucune ligne alors qu'on les demande`);
            const attendu = lireExacte(it.reponsePapier, fx);
            assert.ok(attendu, `[b${b}] réponse illisible : ${it.reponsePapier}`);
            for (const e of etapes) {
                lignesVues += 1;
                const ligne = lireExacte(e.montrer, fx);
                assert.ok(ligne, `[b${b}] « ${e.montrer} » ne se lit pas`);
                assert.ok(memeR(ligne, attendu),
                    `[b${b}] « ${e.montrer} » ne vaut pas « ${it.reponsePapier} »`);
                assert.ok(e.verifie(e.montrer.replace(/\s+/g, '')).juste,
                    `[b${b}] « ${e.montrer} » refusée à son étape`);
                // LA RÉPONSE FINALE NE PASSE PAS À UNE ÉTAPE INTERMÉDIAIRE :
                // les deux sont égales, donc sans exigence de forme l'étape
                // serait sautable, c'est-à-dire inexistante.
                const v = e.verifie(it.reponsePapier.replace(/\s+/g, ''));
                assert.ok(v && !v.juste,
                    `[b${b}] « ${it.reponsePapier} » passe à l'étape « ${e.titre} »`);
                assert.ok(e.modele && /[□…]/.test(e.modele),
                    `[b${b}] l'étape « ${e.titre} » n'a pas de moule`);
            }
        }
    }
    assert.ok(lignesVues > 400, `seulement ${lignesVues} lignes jugées`);
});

test('LE PAVÉ SAIT TAPER CHAQUE LIGNE DES FRACTIONS', () => {
    for (let b = 1; b <= 8; b++) {
        for (let i = 0; i < 30; i++) {
            const it = G.generate({ barreau: String(b), etapes: 'oui' },
                { rng: makeRng(`cfp_${b}_${i}`) });
            const m = it.meta;
            assert.equal(m.lettre, null, `[b${b}] le pavé offre une lettre`);
            assert.equal(m.carre, false, `[b${b}] le pavé offre la touche ²`);
            assert.equal(m.fraction, true, `[b${b}] pas de barre de fraction`);
            const touches = ['+', '−', '/'];
            if (m.multiplication) touches.push('×');
            if (m.parentheses) touches.push('(', ')');
            if (m.racine) touches.push('√');
            touches.push(...'0123456789'.split(''));
            for (const e of [...(m.etapes || []), { montrer: it.reponsePapier }]) {
                const manque = new Set();
                for (const c of String(e.montrer).replace(/\s+/g, '')) {
                    if (!touches.includes(c)) manque.add(c);
                }
                assert.deepEqual([...manque], [],
                    `[b${b}] « ${e.montrer} » demande ${[...manque].join(' ')}, `
                    + 'que le pavé n\'a pas');
            }
        }
    }
});

test('UNE FRACTION NON RÉDUITE EST INACHEVÉE, PAS FAUSSE', () => {
    // La règle posée pour la factorisation : commencé n'est pas raté. 20/12
    // vaut 5/3, et la moitié difficile est faite.
    let vus = 0;
    for (let b = 1; b <= 8; b++) {
        for (let i = 0; i < 40; i++) {
            const it = G.generate({ barreau: String(b) },
                { rng: makeRng(`cfr_${b}_${i}`) });
            assert.equal(it.verifieTexte(it.reponsePapier).juste, true,
                `[b${b}] « ${it.reponsePapier} » refusée`);
            const m = it.reponsePapier.match(/^(\d+)\/(\d+)$/);
            if (!m) continue;
            const brut = `${Number(m[1]) * 3}/${Number(m[2]) * 3}`;
            const v = it.verifieTexte(brut);
            vus += 1;
            assert.equal(v.juste, false, `[b${b}] « ${brut} » passe pour fini`);
            assert.equal(v.inacheve, true,
                `[b${b}] « ${brut} » est compté FAUX : c'est égal, et pas réduit`);
        }
    }
    assert.ok(vus > 50, `seulement ${vus} fractions non réduites mesurées`);
});
