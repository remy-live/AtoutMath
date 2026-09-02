// PRIORITÉS × NOMBRES RELATIFS — ce qu'on vérifie et pourquoi.
//
// Rémy : « on va coupler deux exercices, celui de priorités opératoires et
// aussi les nombres relatifs. Tu le rajoutes en exercice à part. »
//
// TROIS CHOSES PEUVENT CASSER ICI, et aucune ne se voit à l'œil nu.
//
// 1. L'ÉCRITURE. « 4 × −2 » ne s'écrit nulle part : deux signes qui se suivent
//    ne se lisent pas. Il faut « 4 × (−2) », et il faut que la machine sache
//    RELIRE ce qu'elle a écrit — sinon la cascade se croit devant une
//    parenthèse qui groupe un calcul, n'y trouve pas d'opération, et déclare
//    insoluble le calcul le plus banal du chapitre.
//
// 2. LE TIRAGE. Un exercice qui s'appelle « et nombres relatifs » et qui sert
//    quatre expressions de positifs sur cinq ne porte pas sur ce qu'il annonce.
//
// 3. LES DISTRACTEURS. Chacun doit être un raisonnement COMPLET mené à partir
//    d'une règle manquante — pas un nombre voisin. C'est ce qui les rend
//    instructifs : l'élève qui reconnaît SA réponse apprend où il a dérapé.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    nombre, operateur, ecrire, lire, calculer, valeurFinale, tirerExpression
} from '../js/core/priorites.js';
import {
    prioritesRelatifsGenerator, sansSigneDuProduit, moinsQuiNeSAnnulePas, fragmentsDe
} from '../js/core/generators/prioritesRelatifs.js';

const REL = { relatifs: true };
const exp = (...parts) => parts.map(p =>
    (typeof p === 'number' ? nombre(p) : operateur(p)));

// --- L'écriture des négatifs ------------------------------------------------

test('un négatif qui suit une opération prend ses parenthèses', () => {
    assert.equal(ecrire(exp(4, '×', -2)), '4 × (−2)');
    assert.equal(ecrire(exp(5, '-', 3, '×', -2)), '5 − 3 × (−2)');
    // En tête, rien : « −3 + 4 » s'écrit comme au tableau.
    assert.equal(ecrire(exp(-3, '+', 4)), '−3 + 4');
});

test('ce qui s\'écrit se relit — et se relit comme UN nombre', () => {
    for (const jetons of [exp(4, '×', -2), exp(5, '-', 3, '×', -2), exp(-3, '+', 4),
        exp(-4, '+', 6, '÷', -2)]) {
        const relu = lire(ecrire(jetons));
        assert.deepEqual(relu, jetons, ecrire(jetons));
    }
    // « (−2) » est UN jeton, pas trois : sinon la cascade y cherche une
    // opération et bloque.
    assert.equal(lire('5 − 3 × (−2)').length, 5);
});

// --- Le calcul --------------------------------------------------------------

test('la soustraction ne descend sous zéro que si on le lui permet', () => {
    assert.equal(calculer(3, '-', 8), null);
    assert.equal(calculer(3, '-', 8, REL), -5);
    // Soustraire un négatif ajoute — c'est toute la leçon.
    assert.equal(calculer(5, '-', -6, REL), 11);
    // La division reste exacte, négatif ou pas.
    assert.equal(calculer(6, '÷', -2, REL), -3);
    assert.equal(calculer(7, '÷', -2, REL), null);
});

test('le calcul qui surprend tout le monde la première fois', () => {
    assert.equal(valeurFinale(lire('5 − 3 × (−2)'), REL), 11);
    assert.equal(valeurFinale(lire('−4 + 6 ÷ (−2)'), REL), -7);
});

// --- Le tirage --------------------------------------------------------------

test('chaque expression tirée porte au moins un nombre négatif', () => {
    for (let s = 1; s <= 60; s++) {
        const e = tirerExpression({ rng: makeRng(s), niveau: 2, relatifs: true, plafond: 200 });
        assert.ok(e.jetons.some(j => j.type === 'n' && j.valeur < 0),
            `graine ${s} : ${e.texte} n'a aucun négatif`);
        // Et la cascade que la machine annonce est bien celle qui mène au
        // résultat qu'elle annonce.
        assert.equal(valeurFinale(e.jetons, REL), e.resultat, e.texte);
        assert.ok(e.etapes >= 2, `graine ${s} : ${e.texte} n'a qu'une étape`);
    }
});

test('l\'exercice de priorités PURES continue de refuser les négatifs', () => {
    // La leçon des priorités s'apprend AVANT les relatifs : un résultat
    // négatif en cours de route y brouille tout. Le couplage ne doit pas
    // avoir déteint dessus.
    for (let s = 1; s <= 40; s++) {
        const e = tirerExpression({ rng: makeRng(s), niveau: 2 });
        assert.ok(e.resultat >= 0, `graine ${s} : ${e.texte} = ${e.resultat}`);
        assert.ok(!e.jetons.some(j => j.type === 'n' && j.valeur < 0), e.texte);
        assert.ok(!e.texte.includes('(−'), e.texte);
    }
});

// --- Les trois fautes du chapitre -------------------------------------------

test('les distracteurs sont trois raisonnements complets, pas trois voisins', () => {
    const jetons = lire('5 − 3 × (−2)');
    // Celui qui oublie le signe du produit : 3 × 2 = 6, donc 5 − 6 = −1.
    assert.equal(sansSigneDuProduit(jetons), -1);
    // Celui qui ne voit pas que les deux moins s'annulent : 5 − 6 = −1 aussi
    // ici — et c'est justement pourquoi le générateur dédoublonne.
    assert.equal(moinsQuiNeSAnnulePas(jetons), -1);
    // Sur une expression où les deux fautes divergent, elles divergent.
    const autre = lire('−4 + 6 ÷ (−2)');
    assert.equal(sansSigneDuProduit(autre), -1);
    assert.equal(moinsQuiNeSAnnulePas(autre), -7);
});

test('les morceaux « a op b » sont ceux qu\'on peut proposer', () => {
    const f = fragmentsDe(lire('5 − 3 × (−2)'));
    assert.deepEqual(f.map(x => x.texte), ['5 − 3', '3 × (−2)']);
});

// --- Le générateur ----------------------------------------------------------

const faire = (params, index = 0, seed = 7) =>
    prioritesRelatifsGenerator.generate(params, { rng: makeRng(seed), index });

test('la bonne réponse est la valeur de l\'expression, et elle est proposée', () => {
    for (let s = 1; s <= 40; s++) {
        const it = faire({ mode: 'resultat', niveau: 3, progressif: false }, 8, s);
        const attendu = valeurFinale(lire(it.meta.eq), REL);
        assert.equal(it.answer, attendu, it.meta.eq);
        const bonnes = it.choices.filter(c => c.correct);
        assert.equal(bonnes.length, 1, it.meta.eq);
        assert.equal(bonnes[0].value, it.answer, it.meta.eq);
    }
});

test('aucun distracteur ne vaut la bonne réponse, et aucun ne se répète', () => {
    for (let s = 1; s <= 40; s++) {
        const it = faire({ mode: 'resultat', niveau: 2, progressif: false }, 4, s);
        const vals = it.choices.map(c => c.value);
        assert.equal(new Set(vals).size, vals.length, `${it.meta.eq} : ${vals.join(', ')}`);
        assert.equal(vals.filter(v => v === it.answer).length, 1, it.meta.eq);
    }
});

test('les distracteurs peuvent être négatifs — sinon le signe se devine', () => {
    // Sur un exercice de relatifs, ne proposer que des positifs révélerait la
    // réponse sans qu'on ait rien calculé. On vérifie donc qu'au moins une
    // série tirée sort un choix négatif.
    let vus = 0;
    for (let s = 1; s <= 40; s++) {
        const it = faire({ mode: 'resultat', niveau: 2, progressif: false }, 4, s);
        if (it.choices.some(c => c.value < 0)) vus++;
    }
    assert.ok(vus > 20, `seulement ${vus} séries sur 40 offrent un choix négatif`);
});

test('les propositions s\'écrivent avec le VRAI signe moins', () => {
    // La valeur reste un nombre — c'est elle qu'on compare et qu'on tape au
    // pavé quand l'aide passe au clavier — mais l'étiquette porte le « − » de
    // l'expression. Sur ce chapitre, le même signe doit s'écrire pareil des
    // deux côtés de l'écran.
    let negatifs = 0;
    for (let s = 1; s <= 40; s++) {
        const it = faire({ mode: 'resultat', niveau: 2, progressif: false }, 4, s);
        for (const c of it.choices) {
            assert.equal(typeof c.value, 'number', it.meta.eq);
            assert.ok(!String(c.label).includes('-'), `${it.meta.eq} : « ${c.label} »`);
            if (c.value < 0) { negatifs++; assert.ok(String(c.label).startsWith('\u2212')); }
        }
    }
    assert.ok(negatifs > 0, 'aucune proposition négative en 40 tirages');
});

test('en mode « opération », on désigne un morceau de l\'expression', () => {
    for (let s = 1; s <= 30; s++) {
        const it = faire({ mode: 'operation', niveau: 2, progressif: false }, 4, s);
        const morceaux = fragmentsDe(lire(it.meta.eq)).map(x => x.texte);
        for (const c of it.choices) {
            assert.ok(morceaux.includes(c.value), `${it.meta.eq} : « ${c.value} »`);
        }
        // Chaque mauvais choix dit POURQUOI il n'est pas le bon.
        for (const c of it.choices.filter(x => !x.correct)) {
            assert.ok(c.why && c.why.length > 10, `${it.meta.eq} : « ${c.value} » sans raison`);
        }
    }
});

test('« commencer plus facile » monte d\'un cran toutes les quatre questions', () => {
    // La longueur de l'expression est le témoin le plus simple : à la première
    // question elle reste à trois nombres, plus loin elle grandit.
    const debut = faire({ mode: 'resultat', niveau: 4, progressif: true }, 0, 3);
    const fin = faire({ mode: 'resultat', niveau: 4, progressif: true }, 12, 3);
    assert.ok(lire(debut.meta.eq).length <= lire(fin.meta.eq).length,
        `${debut.meta.eq} vs ${fin.meta.eq}`);
});

test('l\'exercice sait ce qu\'il enseigne', () => {
    const it = faire({ mode: 'resultat' }, 0);
    assert.equal(it.skillId, 'num.prio.relatifs');
    assert.equal(it.generatorId, 'calc.priorites-relatifs');
    // Le corrigé papier montre la cascade, pas seulement le résultat.
    assert.ok(it.explicationPapier.includes(' = '), it.explicationPapier);
});
