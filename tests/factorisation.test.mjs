// FACTORISER — SEPT BARREAUX, ET UNE VÉRIFICATION QUI NE CROIT PERSONNE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, photo d'une feuille à l'appui : « peux-tu faire des exercices du type
// seconde avec factorisation de x² − y² ? Je veux que ce soit hyper progressif
// pour arriver à cela en photo. »
//
// UNE FACTORISATION SE VÉRIFIE, et c'est ce qui rend ce fichier différent d'un
// test de mise en forme : on n'y compare pas mon code à mon idée de la réponse
// — on se tromperait deux fois. On ÉVALUE l'énoncé et la réponse en une
// trentaine de points. Si elles ne coïncident pas partout, la question est
// fausse, et aucune relecture n'aurait suffi à le voir.
//
// ET LES LEURRES, À L'ENVERS. Un leurre qui coïncide avec la réponse n'est pas
// un leurre : c'est une SECONDE bonne réponse, marquée fausse. L'élève qui la
// choisit a raison et perd son point. MESURÉ pendant l'écriture : douze cas,
// dans trois barreaux différents, tous invisibles à la lecture —
//
//   · barreau 3, n = 1 : le leurre « b² au lieu de b » est la bonne réponse,
//     puisque 1² = 1. Et n = 1 est justement la valeur qui donne (6 − 5x)² − 1,
//     la forme de la feuille ;
//   · barreau 5, u = 0 : deux leurres se confondent avec elle ;
//   · barreau 7, signes déjà positifs : le leurre « signes inversés »
//     n'inverse rien.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BARREAUX_POUR_ESSAI as B, factorisationGenerator }
    from '../js/core/generators/factorisation.js';
import { exercices } from '../js/data/catalog.js';
import { SKILLS } from '../js/data/skills.js';
import '../js/core/activities/index.js';
import { allGenerators, getGenerator } from '../js/core/registry.js';
import { codeCourt } from '../js/core/shortcodes.js';
import { makeRng } from '../js/core/ids.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const RANGS = [1, 2, 3, 4, 5, 6, 7];
// Pas de 0,25 : on tombe sur les entiers ET entre eux.
const POINTS = Array.from({ length: 81 }, (_, i) => (i - 40) / 4);

test('CHAQUE FACTORISATION VAUT SON ÉNONCÉ — évalué, pas relu', () => {
    let questions = 0, evaluations = 0;
    RANGS.forEach(rang => {
        for (let i = 0; i < 60; i++) {
            const q = B[rang].faire(makeRng(`t_${rang}_${i}`));
            questions++;
            POINTS.forEach(x => {
                evaluations++;
                assert.ok(Math.abs(q.evaluer(x) - q.evaluerReponse(x)) < 1e-9,
                    `barreau ${rang} : ${q.enonce} ≠ ${q.reponse} (en x = ${x})`);
            });
        }
    });
    assert.ok(questions >= 400 && evaluations >= 30000,
        `${questions} questions, ${evaluations} évaluations : l'échantillon a rétréci`);
});

test('ET AUCUN LEURRE N\'EST UNE SECONDE BONNE RÉPONSE', () => {
    RANGS.forEach(rang => {
        for (let i = 0; i < 60; i++) {
            const q = B[rang].faire(makeRng(`l_${rang}_${i}`));
            q.leurres.forEach(l => {
                // `memeValeur` marque les deux leurres qui VALENT la réponse
                // exprès : une expression juste mais pas factorisée. Ils sont
                // déclarés, donc assumés — voir leurs commentaires.
                if (l.memeValeur) return;
                const differe = POINTS.some(x =>
                    Math.abs(l.evaluer(x) - q.evaluerReponse(x)) > 1e-9);
                assert.ok(differe,
                    `barreau ${rang} : « ${l.texte} » vaut ${q.reponse} — c'est une `
                    + `seconde bonne réponse, marquée fausse`);
            });
        }
    });
});

test('QUATRE PROPOSITIONS, UNE SEULE JUSTE, AUCUNE EN DOUBLE', () => {
    ['1', '2', '3', '4', '5', '6', '7', 'revision', 'toutes'].forEach(barreau => {
        for (let i = 0; i < 40; i++) {
            const it = factorisationGenerator.generate({ barreau },
                { rng: makeRng(`c_${barreau}_${i}`) });
            assert.equal(it.choices.length, 4, `barreau ${barreau} : ${it.choices.length} choix`);
            assert.equal(it.choices.filter(c => c.correct).length, 1);
            const vues = it.choices.map(c => c.label);
            assert.equal(new Set(vues).size, 4,
                `barreau ${barreau} : deux propositions identiques — ${vues.join(' | ')}`);
            it.choices.filter(c => !c.correct).forEach(c =>
                assert.ok(c.why && c.why.length > 25, 'un leurre sans explication'));
        }
    });
});

test('AUCUN FACTEUR NE PERD SA CONSTANTE', () => {
    // « (x − 5)(x + 5)(3x) », « (x − 3)(x) » : justes, et que personne
    // n'écrirait ainsi — on écrit 3x(x − 5)(x + 5). Une bonne réponse qui ne
    // ressemble pas à une bonne réponse se fait éliminer par un élève qui
    // avait raison ; un leurre qui ne ressemble à rien se repère sans qu'on
    // ait rien compris, et n'enseigne donc rien.
    const bancal = /\((\d+|[−-]?\d*x)\)/;
    RANGS.forEach(rang => {
        for (let i = 0; i < 80; i++) {
            const q = B[rang].faire(makeRng(`d_${rang}_${i}`));
            [q.enonce, q.reponse, ...q.leurres.map(l => l.texte)].forEach(t =>
                assert.ok(!bancal.test(t), `barreau ${rang} : « ${t} »`));
        }
    });
});

test('LE BARREAU 3 S\'ÉCRIT COMME LA FEUILLE, ET LE 7 AUSSI', () => {
    // La cible de Rémy. Le 3 doit pouvoir produire la forme de A(x) —
    // constante en tête, comme (6 − 5x)² — et le 7 celles de B(x) et C(x).
    const formes3 = [], formes7 = [];
    for (let i = 0; i < 200; i++) {
        formes3.push(B[3].faire(makeRng(`f3_${i}`)).enonce);
        formes7.push(B[7].faire(makeRng(`f7_${i}`)).enonce);
    }
    // « (6 − 5x)² − 1 » : la constante devant, le carré, moins un nombre.
    assert.ok(formes3.some(e => /^\(\d+ − \d*x\)² − \d+$/.test(e)),
        'le barreau 3 ne produit jamais la forme de A(x)');
    // B(x) : (x² − n²)(…) − (x − n)(…) − (x − n)²
    assert.ok(formes7.some(e => /^\(x² − \d+\)\(.+\) − \(x − \d+\)\(.+\) − \(x − \d+\)²$/.test(e)),
        'le barreau 7 ne produit jamais la forme de B(x)');
    // C(x) : (x − r)²x − kx + kr + m(x − r)x
    assert.ok(formes7.some(e => /^\(x − \d+\)²x − \d*x \+ \d+ \+ \d\(x − \d+\)x$/.test(e)),
        'le barreau 7 ne produit jamais la forme de C(x)');
});

test('LA PROGRESSION EST LE PARCOURS — sept exercices, dans l\'ordre', () => {
    // « HYPER PROGRESSIF » NE SE RÈGLE PAS DANS UN GÉNÉRATEUR. Un curseur de
    // difficulté serait une loterie, où l'élève tombe sur le barreau 6 avant
    // d'avoir monté le 2. Sept exercices, que le professeur pose à la suite.
    const miens = exercices.filter(e => /^fac-/.test(e.id));
    assert.equal(miens.length, 8, 'sept barreaux plus la révision');
    for (let r = 1; r <= 7; r++) {
        const e = miens.find(x => x.id === `fac-${r}`);
        assert.ok(e, `barreau ${r} absent du catalogue`);
        assert.equal(e.params.barreau, String(r));
        assert.match(e.title, new RegExp(`^${r}\\.`), 'le titre ne porte pas son rang');
        assert.ok(e.instruction && e.instruction.length >= 10);
        // PAS DE I, PAS DE O, PAS DE Q : ces codes se DICTENT en classe.
        const c = codeCourt(e.id);
        assert.equal(c.length, 3, `${e.id} : code « ${c} »`);
        assert.ok(!/[IOQ]/.test(c), `${e.id} : ${c} contient une lettre qui s'entend mal`);
    }
});

test('LE GÉNÉRATEUR EST BRANCHÉ, ET SES COMPÉTENCES EXISTENT', () => {
    assert.ok(allGenerators().map(g => g.id).includes('lit.factorisation'));
    assert.ok(getGenerator('lit.factorisation'));
    ['lit.factoriser.identite', 'lit.factoriser.commun'].forEach(id => {
        assert.ok(SKILLS[id], `compétence absente : ${id}`);
        // UN PRÉREQUIS FANTÔME NE LÈVE AUCUNE ERREUR : il rend seulement la
        // remédiation muette, et l'élève en difficulté ne se voit jamais
        // proposer ce qui lui manque. J'avais écrit `lit.developper.simple`,
        // qui n'existe pas — la même faute que `num.relatifs.comparaison`.
        (SKILLS[id].prereqs || []).forEach(p =>
            assert.ok(SKILLS[p], `prérequis fantôme : ${p} (de ${id})`));
    });
    // Les quatre premiers barreaux travaillent l'identité, les trois derniers
    // le facteur commun : ce sont deux compétences, et le bilan doit les
    // distinguer.
    RANGS.forEach(r => {
        const it = factorisationGenerator.generate({ barreau: String(r) },
            { rng: makeRng(`s_${r}`) });
        assert.equal(it.skillId,
            r <= 4 ? 'lit.factoriser.identite' : 'lit.factoriser.commun');
    });
});

test('CHAQUE QUESTION PORTE SON SUPPORT VISUEL', () => {
    // « il faut toujours un support visuel ». Trois dessins selon ce qu'il y a
    // à montrer : le découpage du carré quand a et b sont des nombres,
    // l'identification des rôles quand ce sont des expressions, et le facteur
    // commun quand c'est lui le sujet.
    ['1', '2', '3', '4', '5', '6', '7'].forEach(barreau => {
        for (let i = 0; i < 12; i++) {
            const it = factorisationGenerator.generate({ barreau },
                { rng: makeRng(`v_${barreau}_${i}`) });
            assert.match(it.prompt.html, /fa-identite|<svg/,
                `barreau ${barreau} : pas de support visuel`);
            assert.match(it.prompt.html, /fa-expression/);
            assert.ok(it.explanation.length > 40);
            assert.equal(it.hints.length, 2);
        }
    });
    // Le barreau 1 porte le découpage géométrique : c'est la démonstration, et
    // elle vaut mieux qu'une règle apprise.
    const un = factorisationGenerator.generate({ barreau: '1' }, { rng: makeRng('g1') });
    assert.match(un.prompt.html, /<svg class="fa-figure"/);
});

test('ET LE SIGNE MOINS EST UN SIGNE MOINS', () => {
    // Même chapitre de Seconde que les intervalles, même exigence : `-3` et
    // `−3` ne sont pas le même caractère, et les deux se côtoieraient.
    const F = lire('js/core/generators/factorisation.js');
    assert.match(F, /const M = '−';/);
    RANGS.forEach(r => {
        const q = B[r].faire(makeRng(`m_${r}`));
        [q.enonce, q.reponse].forEach(t =>
            assert.ok(!/-/.test(t), `barreau ${r} : trait d'union dans « ${t} »`));
    });
});
