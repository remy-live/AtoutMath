// LA MOSAÏQUE DES TRANSFORMATIONS — plusieurs questions, un seul dessin.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, dans sa revue du catalogue : il voulait « un imprimé avec plusieurs
// questions pour un même tableau de mosaïque ».
//
// MESURÉ AVANT : la feuille écrivait « Quelle est l'image de la pièce 10 par la
// symétrie de centre K ? » suivi d'un pointillé, et RIEN d'autre — ni mosaïque,
// ni pièces, ni point K. Insoluble, et occupant quand même sa place.
//
// ── CE QUI REND LE PARTAGE POSSIBLE, ET QUE CES ÉPREUVES TIENNENT ─────────
//
// Une question dit « d'axe (OD) », « de centre G », « de vecteur IB ». Ces
// lettres sont celles des SOMMETS, qui sont dessinés. Si une seule manquait au
// dessin, la question correspondante deviendrait insoluble — et ce serait
// invisible : la feuille sortirait, les autres questions marcheraient, et un
// élève sur quatre resterait bloqué sans savoir pourquoi.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mosaiqueFicheGenerator } from '../js/core/generators/mosaiqueFiche.js';
import { makeRng } from '../js/core/ids.js';

const tirer = (params = {}, i = 0, total = 2) => mosaiqueFicheGenerator.generate(params,
    { rng: makeRng(), index: i, total, papier: true, themesExclus: [] });

test('TOUTE LETTRE CITÉE PAR UNE QUESTION EST TRACÉE SUR LA MOSAÏQUE', () => {
    // C'est l'épreuve qui autorise tout le reste : sans elle, rien ne garantit
    // qu'on puisse poser plusieurs questions sur un seul dessin.
    for (let i = 0; i < 25; i++) {
        const m = tirer({ parMosaique: '6' }, i, 25).meta;
        const noms = new Set(m.sommets.map(s => s.nom));
        m.questions.forEach(q => {
            const t = q.transfo;
            const cite = t.nomAxe || t.nomVecteur || t.nomCentre || '';
            [...cite].forEach(lettre => {
                assert.ok(noms.has(lettre),
                    `« ${q.texte} » cite ${lettre}, qui n'est pas sur le dessin`);
            });
        });
    }
});

test('TOUTES LES QUESTIONS PORTENT SUR LA MÊME MOSAÏQUE', () => {
    // C'est la demande de Rémy, mot pour mot : « plusieurs questions pour un
    // même tableau ». Les pièces, les sommets et la boîte sont communs — il n'y
    // a qu'un dessin, et c'est ce qui permet de l'imprimer en grand.
    const m = tirer({ parMosaique: '4' }).meta;
    assert.ok(m.pieces.length > 4, `${m.pieces.length} pièces`);
    assert.ok(m.sommets.length > 2, `${m.sommets.length} sommets`);
    assert.ok(m.boite && Number.isFinite(m.boite.x1));
    // Et chaque question désigne des pièces QUI EXISTENT sur ce dessin-là.
    const numeros = new Set(m.pieces.map(p => p.n));
    m.questions.forEach(q => {
        assert.ok(numeros.has(q.depuis), `la pièce ${q.depuis} n'est pas sur la mosaïque`);
        assert.ok(numeros.has(q.vers), `la pièce ${q.vers} n'est pas sur la mosaïque`);
    });
});

test('LE RÉGLAGE « QUESTIONS PAR MOSAÏQUE » EST SUIVI', () => {
    // Un réglage qui ne change rien est un réglage qui ment au professeur.
    for (const combien of ['2', '3', '4', '6']) {
        const m = tirer({ parMosaique: combien }).meta;
        assert.equal(m.questions.length, Number(combien),
            `${m.questions.length} questions pour ${combien} demandées`);
    }
});

test('AVEC UN SEUL GENRE, LA FEUILLE SERT LE MIEUX DISPONIBLE — ET TOUJOURS LE MÊME', () => {
    // MESURÉ AVANT : avec la seule « symétrie axiale » cochée et six questions
    // demandées, le professeur en recevait UNE, DEUX ou QUATRE selon le tirage.
    // Aucune mosaïque ne porte six symétries axiales, et le repli tirait au
    // hasard parmi toutes celles qui en ont au moins une : sa feuille sortait
    // avec un bloc à une question et un autre à quatre, sans que rien ne le
    // dise.
    //
    // On ne peut pas inventer des relations qui n'existent pas. On peut servir
    // le MIEUX disponible, et surtout le servir de façon STABLE : deux blocs de
    // la même feuille doivent porter le même nombre de questions, sans quoi la
    // page est bancale et le professeur croit à un bogue.
    for (const genres of [['axiale'], ['centrale'], ['translation'], ['rotation']]) {
        const comptes = new Set();
        for (let i = 0; i < 12; i++) {
            comptes.add(tirer({ genres, parMosaique: '6' }, i, 12).meta.questions.length);
        }
        assert.equal(comptes.size, 1,
            `« ${genres[0]} » donne ${[...comptes].sort().join(', ')} questions selon le tirage`);
        assert.ok([...comptes][0] >= 3,
            `« ${genres[0]} » ne donne que ${[...comptes][0]} question(s)`);
    }
});

test('DEUX QUESTIONS NE SE RÉPÈTENT PAS SUR LA MÊME FEUILLE', () => {
    // Poser deux fois « l'image de la pièce 3 par la symétrie de centre A »
    // sur le même dessin, c'est donner une question pour deux.
    for (let i = 0; i < 12; i++) {
        const m = tirer({ parMosaique: '6' }, i, 12).meta;
        const vues = m.questions.map(q => q.texte);
        assert.equal(new Set(vues).size, vues.length,
            `une question se répète : ${vues.find((v, j) => vues.indexOf(v) !== j)}`);
    }
});

test('LE GENRE DÉCOCHÉ NE SORT PAS', () => {
    // Le professeur qui n'a pas encore fait les rotations ne doit pas en
    // trouver sur sa feuille.
    for (const genres of [['axiale'], ['centrale', 'translation']]) {
        for (let i = 0; i < 8; i++) {
            const m = tirer({ genres, parMosaique: '3' }, i, 8).meta;
            m.questions.forEach(q => assert.ok(genres.includes(q.genre),
                `« ${q.genre} » sort alors que seuls ${genres.join(', ')} sont cochés`));
        }
    }
});

test('CHAQUE PIÈCE PORTE UN NUMÉRO ET DES CASES', () => {
    // Une pièce sans cases ne se dessine pas, et une pièce sans numéro ne se
    // nomme pas : les deux rendent la feuille incorrigible.
    const m = tirer().meta;
    m.pieces.forEach(p => {
        assert.ok(Number.isFinite(p.n), 'une pièce sans numéro');
        assert.ok(p.cases.length > 0, `la pièce ${p.n} n'a aucune case`);
        p.cases.forEach(c => {
            assert.ok(Number.isFinite(c.x) && Number.isFinite(c.y),
                `la pièce ${p.n} a une case sans coordonnées`);
        });
    });
    const numeros = m.pieces.map(p => p.n);
    assert.equal(new Set(numeros).size, numeros.length, 'deux pièces portent le même numéro');
});

test('LE CATALOGUE BRANCHE L\'EXERCICE SUR CE GÉNÉRATEUR', async () => {
    const { exercices } = await import('../js/data/catalog.js');
    const e = exercices.find(x => x.id === 'geo-mosaique');
    assert.equal(e.printable, 'mosaique');
    assert.equal(e.printGeneratorId, 'geo.mosaique-fiche');
    // `colonnesPapier` forcerait la mise en colonnes de questions écrites —
    // ce n'est plus ça : c'est un DESSIN avec ses questions à côté.
    assert.equal(e.colonnesPapier, undefined,
        'colonnesPapier écraserait la disposition du rendu');
});
