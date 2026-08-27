// MULTIPLIER DES NOMBRES RELATIFS.
//
// Rémy : « j'aimerais bien des exercices sur les produits de nombres
// relatifs ». Ce que ces tests gardent avant tout, c'est le contresens du
// chapitre : (−3) + (−4) = −7, mais (−3) × (−4) = +12. Ce n'est pas la même
// règle, et c'est la faute la plus universelle de la quatrième.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    produitComplet, produitSimple, negatifs, signeDuProduit, valeur, regle,
    ETAPES, question, relatifsProduitGenerator as G
} from '../js/core/generators/relatifsProduit.js';

const MOINS = '−';
const item = (params = {}, index = 0, cle = 'rp') =>
    G.generate(params, { rng: makeRng(`${cle}-${index}`), index });

// --- La règle des signes -----------------------------------------------------

test('DEUX NÉGATIFS DONNENT UN POSITIF — le contresens du chapitre', () => {
    assert.equal(signeDuProduit([-3, -4]), 'positif');
    assert.equal(valeur([-3, -4]), 12);
    assert.equal(signeDuProduit([-3, 4]), 'négatif');
    assert.equal(signeDuProduit([3, -4]), 'négatif');
    assert.equal(signeDuProduit([3, 4]), 'positif');
    // Et la phrase de la règle le DIT, au lieu de le laisser deviner.
    assert.match(regle([-3, -4]), /POSITIF/);
    assert.match(regle([-3, -4]), /pas la même règle/);
});

test('AU-DELÀ DE DEUX FACTEURS, ON NE RÉCITE PLUS : ON COMPTE', () => {
    assert.equal(signeDuProduit([-2, -3, -4]), 'négatif', 'trois négatifs : impair');
    assert.equal(signeDuProduit([-2, -3, -4, -5]), 'positif', 'quatre négatifs : pair');
    assert.equal(signeDuProduit([-2, 3, 4]), 'négatif');
    assert.equal(negatifs([-2, 3, -4, 5]), 2);
    assert.match(regle([-2, -3, -4]), /IMPAIR/);
    assert.match(regle([-2, -3, -4, -5]), /PAIR/);
});

test('UN FACTEUR NUL REND TOUT LE PRODUIT NUL', () => {
    // C'est le seul cas où compter les négatifs ne sert à rien, et l'oublier
    // fait dire « négatif » devant un résultat qui vaut zéro.
    assert.equal(signeDuProduit([-3, 0]), 'nul');
    assert.equal(signeDuProduit([-3, 0, -7]), 'nul');
    assert.equal(valeur([-3, 0, -7]), 0);
    assert.match(regle([-3, 0]), /vaut 0/);
});

// --- Les écritures -----------------------------------------------------------

test('ZÉRO N\'A PAS DE SIGNE', () => {
    // « (+0) » ne s'écrit nulle part, et le voir apprendrait une faute.
    assert.equal(produitComplet([-3, 0]), `(${MOINS}3) × 0`);
    assert.equal(produitComplet([-3, 4]), `(${MOINS}3) × (+4)`);
});

test('L\'ÉCRITURE SIMPLIFIÉE GARDE LES PARENTHÈSES QUI SONT OBLIGATOIRES', () => {
    // « 3 × −4 » ne s'écrit pas : deux signes ne se suivent jamais. Mais le
    // premier facteur, lui, n'en a pas besoin.
    assert.equal(produitSimple([-3, 4]), `${MOINS}3 × 4`);
    assert.equal(produitSimple([3, -4]), `3 × (${MOINS}4)`);
    assert.equal(produitSimple([-3, -4]), `${MOINS}3 × (${MOINS}4)`);
    // Et jamais le trait d'union du clavier : sur ce chapitre, le signe EST le
    // sujet.
    assert.ok(!produitSimple([-3, -4]).includes('-'));
    assert.ok(!produitComplet([-3, -4]).includes('-'));
});

// --- Les douze marches -------------------------------------------------------

test('LES CINQ PREMIÈRES MARCHES NE DEMANDENT PAS DE CALCULER', () => {
    // Séparer les deux gestes — trouver le signe, puis multiplier les distances
    // à zéro — est ce qui permet de travailler celui qui coince sans le noyer
    // dans l'autre.
    ETAPES.filter(e => e.temps === 'A').forEach(e => {
        for (let i = 0; i < 6; i++) {
            const q = question(e, makeRng(`signe-${e.id}-${i}`));
            assert.ok(['positif', 'négatif'].includes(q.reponse), `${e.id} : ${q.reponse}`);
            assert.match(q.question, /positif ou négatif/);
            assert.deepEqual(q.choix, ['positif', 'négatif']);
            // Et la réponse est le vrai signe du produit.
            assert.equal(q.reponse, signeDuProduit(q.facteurs));
        }
    });
});

test('chaque marche du temps A pose bien les signes qu\'elle annonce', () => {
    const cas = { 'signe-pp': [1, 1], 'signe-np': [-1, 1], 'signe-pn': [1, -1], 'signe-nn': [-1, -1] };
    Object.entries(cas).forEach(([id, signes]) => {
        const e = ETAPES.find(x => x.id === id);
        for (let i = 0; i < 8; i++) {
            const q = question(e, makeRng(`s-${id}-${i}`));
            assert.deepEqual(q.facteurs.map(v => Math.sign(v)), signes, `${id} : ${q.enonce}`);
        }
    });
});

test('LES RÉPONSES SONT JUSTES — recalculées, pas recopiées', () => {
    ETAPES.filter(e => e.temps !== 'A').forEach(e => {
        for (let i = 0; i < 10; i++) {
            const q = question(e, makeRng(`v-${e.id}-${i}`));
            assert.equal(q.reponse, valeur(q.facteurs), `${e.id} : « ${q.enonce} »`);
        }
    });
});

test('LES PRODUITS RESTENT CALCULABLES DE TÊTE', () => {
    // Ce qu'on travaille au temps C, c'est le COMPTE des facteurs négatifs.
    // « (−9) × (+8) × (+6) » remplace ce comptage par un calcul à trois
    // chiffres, et l'élève rate la question pour une raison qui n'est pas celle
    // du chapitre.
    ETAPES.filter(e => e.taille).forEach(e => {
        for (let i = 0; i < 20; i++) {
            const q = question(e, makeRng(`taille-${e.id}-${i}`));
            assert.equal(q.facteurs.length, e.taille);
            assert.ok(Math.abs(q.reponse) <= 300, `${e.id} : ${q.enonce} = ${q.reponse}`);
            assert.ok(negatifs(q.facteurs) >= 1, 'aucun facteur négatif : rien à compter');
        }
    });
});

test('LE CARRÉ D\'UN NÉGATIF, ET SA PARENTHÈSE', () => {
    // (−4)² = +16, mais −4² = −16 : deux écritures qui se ressemblent, deux
    // résultats opposés, et une parenthèse pour toute différence.
    const e = ETAPES.find(x => x.id === 'particuliers');
    let vu = false;
    for (let i = 0; i < 40 && !vu; i++) {
        const q = question(e, makeRng('carre-' + i));
        if (!q.enonce.endsWith('²')) continue;
        vu = true;
        assert.ok(q.reponse > 0, 'le carré d\'un négatif est positif');
        assert.equal(q.reponse, q.facteurs[0] * q.facteurs[0]);
        assert.ok(q.pieges.some(p => p.value === -q.reponse
            && /parenthèse/i.test(p.why)), 'le piège de la parenthèse manque');
        assert.match(q.pourquoi, /SANS parenthèse/);
    }
    assert.ok(vu, 'la marche des cas particuliers ne pose jamais de carré');
});

// --- Les distracteurs --------------------------------------------------------

test('CHAQUE MAUVAISE RÉPONSE DIT L\'ERREUR QU\'ELLE PIÈGE', () => {
    ETAPES.forEach(e => {
        for (let i = 0; i < 6; i++) {
            const q = question(e, makeRng(`p-${e.id}-${i}`));
            assert.ok(q.pieges.length >= 1, `${e.id} : aucun piège`);
            q.pieges.forEach(p => {
                assert.ok(p.why && p.why.length > 10, `${e.id} : piège muet (${p.value})`);
                assert.notEqual(String(p.value), String(q.reponse),
                    `${e.id} : un piège vaut la bonne réponse`);
            });
        }
    });
});

test('LE PIÈGE DU SIGNE EST TOUJOURS POSÉ quand on calcule', () => {
    // C'est la faute du chapitre : la valeur juste, le signe faux.
    ETAPES.filter(e => e.temps === 'B').forEach(e => {
        for (let i = 0; i < 8; i++) {
            const q = question(e, makeRng(`sg-${e.id}-${i}`));
            assert.ok(q.pieges.some(p => p.value === -q.reponse),
                `${e.id} : l'opposé n'est pas proposé`);
        }
    });
});

// --- Le générateur -----------------------------------------------------------

test('deux questions par marche, et les douze dans l\'ordre', () => {
    const marches = [];
    for (let i = 0; i < ETAPES.length * 2; i++) marches.push(item({}, i).meta.etape);
    ETAPES.forEach((e, k) => {
        assert.equal(marches[k * 2], e.id, `question ${k * 2} hors marche`);
        assert.equal(marches[k * 2 + 1], e.id, `question ${k * 2 + 1} hors marche`);
    });
});

test('LA MARCHE DU SIGNE ALIMENTE LA COMPÉTENCE DU SENS, pas celle du calcul', () => {
    // Elle ne travaille pas la multiplication : elle travaille ce que veut dire
    // un signe. Le modèle de maîtrise doit l'entendre ainsi.
    for (let i = 0; i < 10; i++) {
        const it = item({ etape: 'A' }, i);
        assert.equal(it.skillId, 'num.relatifs.sens');
        assert.equal(it.choices.length, 2, 'positif ou négatif : deux réponses, pas quatre');
    }
    for (let i = 0; i < 10; i++) {
        assert.equal(item({ etape: 'B' }, i).skillId, 'num.relatifs.produit');
    }
});

test('un item porte tout ce qu\'il faut pour jouer, corriger et imprimer', () => {
    for (let i = 0; i < 24; i++) {
        const it = item({}, i);
        assert.equal(it.answerKind, 'choice');
        assert.equal(it.choices.filter(c => c.correct).length, 1);
        assert.equal(it.choices.find(c => c.correct).value, it.answer);
        const vues = it.choices.map(c => String(c.value));
        assert.equal(new Set(vues).size, vues.length, 'deux propositions identiques');
        // LES ÉTIQUETTES PORTENT LE VRAI SIGNE MOINS : sur ce chapitre, un
        // « -12 » plus court que le « − » de l'énoncé casse le lien visuel.
        it.choices.forEach(c => assert.ok(!String(c.label).includes('-'),
            `étiquette au trait d'union : ${c.label}`));
        assert.ok(it.prompt.papier.length > 3, 'rien à imprimer');
        assert.ok(it.explanation.length > 20, 'corrigé muet');
        assert.ok(it.hints.length >= 2, 'pas d\'indice');
    }
});

test('isoler un temps, ou une marche, ne sort jamais de ce qu\'on a demandé', () => {
    ['A', 'B', 'C'].forEach(temps => {
        const attendues = new Set(ETAPES.filter(e => e.temps === temps).map(e => e.id));
        for (let i = 0; i < 12; i++) {
            assert.ok(attendues.has(item({ etape: temps }, i).meta.etape), `temps ${temps}`);
        }
    });
    for (let i = 0; i < 6; i++) {
        assert.equal(item({ etape: 'produit-nn' }, i).meta.etape, 'produit-nn');
    }
});

test('la même graine rend la même question', () => {
    const a = G.generate({}, { rng: makeRng('rejeu'), index: 11 });
    const b = G.generate({}, { rng: makeRng('rejeu'), index: 11 });
    assert.equal(a.prompt.text, b.prompt.text);
    assert.equal(a.answer, b.answer);
});
