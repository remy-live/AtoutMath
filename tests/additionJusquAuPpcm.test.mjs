// « IL N'Y A PAS D'ADDITION DE FRACTION AVEC DÉNOMINATEUR MULTIPLE OU PPCM ? »
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « il n'y a pas d'addition de fraction avec dénominateur multiple ou
// ppcm non ? »
//
// Il y en avait — « Poser une Addition de Fractions » —, mais pas en QCM, et
// pas sous le titre où il l'a cherchée. Mesuré dans la fenêtre de choix : en
// tapant « addition de fractions », le PREMIER résultat est « Addition de
// Fractions », qui ne faisait QUE le même dénominateur, pour toujours, sans
// réglage.
//
// CE QUE CETTE ÉPREUVE GARDE, et qu'on ne retrouverait pas en relisant :
//
//   1. Les quatre marches existent ET DIFFÈRENT VRAIMENT. Un tirage qui rendrait
//      3 et 4 à la marche du PPCM n'apprendrait rien de plus que la marche
//      d'avant : c'est la propriété qu'on vérifie, pas le nom.
//   2. LES DEUX FRACTIONS DE DÉPART SONT IRRÉDUCTIBLES. C'est la règle la plus
//      chère du lot : posée « 3/6 + 4/10 », la question a DEUX réponses justes,
//      et celle de l'élève qui simplifie d'abord n'est pas sur les boutons.
//   3. Le dénominateur commun tient dans une bulle.
//   4. Une séance préparée AVANT ce jour ne change pas de difficulté.
//   5. La compétence suit la marche : additionner des huitièmes entre eux et
//      trouver que 4 et 6 se rencontrent à 12 ne sont pas le même savoir-faire.

import test from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';

import { fracAddGenerator } from '../js/core/generators/fractions.js';
import { pgcd, ppcm, estIrreductible } from '../js/core/fractionsEquivalentes.js';
import { exercices } from '../js/data/catalog.js';
import { makeRng } from '../js/core/ids.js';

/** Trente questions d'une marche, pour juger sur des tirages et non sur un. */
const tirer = (marche, n = 30, params = {}) => Array.from({ length: n }, (_, i) =>
    fracAddGenerator.generate(
        { marches: [marche], maxDen: 12, ...params },
        { rng: makeRng(`add-${marche}-${i}`), index: i, total: n }));

test('LES QUATRE MARCHES EXISTENT, ET CHACUNE POSE SON PROBLÈME', () => {
    for (const it of tirer('meme')) {
        assert.equal(it.meta.d1, it.meta.d2, `${it.prompt.text} : les deux parts doivent avoir la même taille`);
    }
    for (const it of tirer('multiple')) {
        const { d1, d2 } = it.meta;
        const [petit, grand] = d1 < d2 ? [d1, d2] : [d2, d1];
        assert.notEqual(d1, d2, `${it.prompt.text} : ce n’est plus la marche du même dénominateur`);
        assert.equal(grand % petit, 0,
            `${it.prompt.text} : à cette marche, UNE SEULE fraction change — le plus grand `
            + 'dénominateur est déjà le commun');
    }
    for (const it of tirer('premiers')) {
        const { d1, d2 } = it.meta;
        assert.equal(pgcd(d1, d2), 1, `${it.prompt.text} : aucun diviseur commun`);
        assert.equal(it.meta.commun, d1 * d2,
            `${it.prompt.text} : leur premier rendez-vous dans les tables est leur produit`);
    }
    for (const it of tirer('ppcm')) {
        const { d1, d2, commun } = it.meta;
        assert.ok(commun < d1 * d2,
            `${it.prompt.text} : le PPCM ne se mérite QUE s’il est strictement plus petit que `
            + `le produit (${d1} × ${d2}), sinon on retombe sur la marche d’avant`);
        assert.notEqual(Math.max(d1, d2) % Math.min(d1, d2), 0,
            `${it.prompt.text} : un dénominateur multiple de l’autre est la marche 2`);
    }
});

test('LES DEUX FRACTIONS DE DÉPART SONT IRRÉDUCTIBLES', () => {
    // POSÉE « 3/6 + 4/10 », LA QUESTION A DEUX RÉPONSES JUSTES. L'élève qui
    // simplifie d'abord calcule 1/2 + 2/5 et trouve 9/10 ; celui qui ne
    // simplifie pas trouve 27/30. Même valeur, pas la même écriture — et 9/10
    // n'est sur aucun bouton. Le premier aurait eu tout bon et le logiciel lui
    // dirait qu'il a eu faux. C'est exactement ce que Rémy a signalé hier sur
    // l'Échelle des Tailles, et `core/fractionsEquivalentes.js` l'avait déjà
    // écrit pour l'addition posée : « IL A RAISON ».
    for (const marche of ['meme', 'multiple', 'premiers', 'ppcm']) {
        for (const it of tirer(marche, 40)) {
            const { n1, n2, d1, d2 } = it.meta;
            assert.ok(estIrreductible(n1, d1),
                `${it.prompt.text} : ${n1}/${d1} se simplifie, et l’élève qui le fait trouve `
                + 'un autre dénominateur commun que celui qu’on attend');
            assert.ok(estIrreductible(n2, d2), `${it.prompt.text} : ${n2}/${d2} se simplifie`);
        }
    }
});

test('LE DÉNOMINATEUR COMMUN TIENT DANS UNE BULLE', () => {
    // 7/9 + 1/10 demande des 90èmes : juste au tableau, illisible dans un rond,
    // et hors de portée d'une réponse qu'on ne pose pas sur le papier.
    for (const marche of ['multiple', 'premiers', 'ppcm']) {
        for (const it of tirer(marche, 40)) {
            assert.ok(it.meta.commun <= 40,
                `${it.prompt.text} : dénominateur commun ${it.meta.commun}`);
        }
    }
});

test('LA BONNE RÉPONSE EST JUSTE, ET ELLE EST SUR UN BOUTON', () => {
    for (const marche of ['meme', 'multiple', 'premiers', 'ppcm']) {
        for (const it of tirer(marche, 25)) {
            const { n1, n2, d1, d2, commun } = it.meta;
            const attendu = n1 * (commun / d1) + n2 * (commun / d2);
            assert.equal(commun, ppcm(d1, d2), `${it.prompt.text} : le commun n’est pas le PPCM`);
            assert.equal(it.answer, `${attendu}|${commun}`, `${it.prompt.text} : réponse fausse`);
            const bonnes = it.choices.filter(c => c.correct);
            assert.equal(bonnes.length, 1, `${it.prompt.text} : une seule bonne proposition`);
            assert.equal(bonnes[0].value, it.answer,
                `${it.prompt.text} : la proposition cochée doit porter EXACTEMENT ce que le `
                + 'pavé enverra, sinon la cliquer serait compté faux');
            // ET AUCUN LEURRE N'EST JUSTE. Un distracteur qui VAUT la bonne
            // réponse sous une autre écriture compterait faux un élève qui a
            // raison — le défaut d'hier, par une autre porte.
            for (const c of it.choices.filter(x => !x.correct)) {
                const [n, d] = String(c.value).split('|').map(Number);
                assert.notEqual(n * commun, attendu * d,
                    `${it.prompt.text} : le leurre ${c.value} VAUT la bonne réponse`);
            }
        }
    }
});

test('UNE SÉANCE PRÉPARÉE AVANT NE CHANGE PAS DE DIFFICULTÉ', () => {
    // Le défaut reste le même dénominateur : une séance enregistrée avant ce
    // jour n'a pas de réglage « marches », et il ne faut pas qu'elle se mette à
    // poser des PPCM dans le dos du professeur, au milieu d'une heure préparée
    // pour autre chose.
    const exo = exercices.find(e => e.id === 'frac-add');
    assert.ok(exo, 'l’exercice doit être au catalogue');
    assert.deepEqual(exo.params.marches, ['meme'],
        'le catalogue doit cocher la seule marche du même dénominateur');
    // ET LE PANNEAU, LUI, MONTRE LES QUATRE. Ce n'est pas une contradiction :
    // le `default` du schéma remplit le panneau — et un exercice à progression
    // offre la sienne en entier, c'est la règle du dépôt, gardée par
    // `tests/progression.test.mjs` —, tandis que le catalogue dit ce que vaut
    // CET exercice-là quand on l'ajoute. Les deux se sont déjà contredits : un
    // défaut à une seule marche faisait tomber la règle des treize autres.
    const param = fracAddGenerator.params.find(p => p.id === 'marches');
    assert.ok(param, 'le réglage des marches doit exister');
    assert.deepEqual(param.default, ['meme', 'multiple', 'premiers', 'ppcm'],
        'le panneau doit offrir les quatre marches : une progression cachée ne se '
        + 'découvre que par hasard, et c’est exactement ce que Rémy a signalé');
    // VIEILLE SÉANCE : des réglages sans « marches » du tout.
    for (let i = 0; i < 20; i++) {
        const it = fracAddGenerator.generate({ maxDen: 12 },
            { rng: makeRng(`vieux-${i}`), index: i, total: 20 });
        assert.equal(it.meta.d1, it.meta.d2,
            `${it.prompt.text} : une séance d’avant doit rester au même dénominateur`);
    }
});

test('LA COMPÉTENCE SUIT LA MARCHE', () => {
    for (const it of tirer('meme', 10)) {
        assert.equal(it.skillId, 'num.frac.add-meme-denom', it.prompt.text);
    }
    for (const marche of ['multiple', 'premiers', 'ppcm']) {
        for (const it of tirer(marche, 10)) {
            assert.equal(it.skillId, 'num.frac.denominateur-commun',
                `${it.prompt.text} : chercher un dénominateur commun n’est pas la même `
                + 'compétence qu’additionner des huitièmes entre eux — le carnet d’erreurs '
                + 'doit les séparer');
        }
    }
    assert.ok(fracAddGenerator.skills.includes('num.frac.denominateur-commun'),
        'le générateur doit déclarer les deux compétences');
});

test('ET L’EXERCICE SE TROUVE PAR CE QU’IL SAIT FAIRE', () => {
    // Mesuré avant : en cherchant « ppcm » dans la fenêtre de choix, cet
    // exercice n'était pas dans les résultats. La recherche lit les mots clefs,
    // et il n'en avait aucun.
    const exo = exercices.find(e => e.id === 'frac-add');
    const mots = (exo.motsClefs || []).map(m => m.toLowerCase());
    for (const attendu of ['ppcm', 'dénominateur commun']) {
        assert.ok(mots.includes(attendu),
            `« ${attendu} » doit être un mot clef, sinon l’exercice reste introuvable `
            + 'par ce qu’il sait faire');
    }
});
