// LA MOSAÏQUE DES TRANSFORMATIONS — et la seule chose qu'on ne peut pas se
// permettre : une question dont la réponse est fausse.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « tu pourrais refaire ce pavage et poser différentes questions et si
// l'élève se trompe, lui compter faux mais aussi montrer la transformation ».
//
// « Lui compter faux » suppose qu'on ait raison. Si une seule des questions
// livrées annonçait la mauvaise pièce, un élève qui a juste se verrait compter
// une faute — et c'est la pire chose qu'un logiciel d'exercices puisse faire.
// Il a raison, l'écran lui dit qu'il a tort, et à partir de là plus rien de ce
// que l'écran annonce ne vaut.
//
// CE QU'ON GARDE ICI, et l'ordre est celui du risque :
//
//   1. CHAQUE QUESTION LIVRÉE EST VRAIE. On relit les 16 mosaïques du fichier
//      de données, relation par relation, en recalculant l'image. C'est la
//      même vérification que celle de l'outil qui les fabrique — on la refait,
//      parce qu'un fichier de données peut être retouché à la main un jour de
//      fatigue, et que rien d'autre ne le relirait.
//   2. CHAQUE QUESTION EST DISABLE. Un axe sans nom donnerait « la symétrie
//      d'axe (null) » dans la consigne, ce qui ne casse rien et rend l'énoncé
//      incompréhensible.
//   3. CHAQUE QUESTION A UNE SEULE RÉPONSE.
//   4. LA MOSAÏQUE SE TIENT : pièces qui ne se chevauchent pas, d'un seul
//      tenant, sans trou.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { MOSAIQUES } from '../js/data/mosaiques.js';
import {
    construireMosaique, verifierMosaique, direTransformation, cleCase
} from '../js/core/mosaique.js';
import { imageFigure, memeFigure } from '../js/core/transformations.js';
import { generator, lireMosaique, GENRES } from '../js/core/generators/pavageImage.js';
import { makeRng } from '../js/core/ids.js';

/** Une mosaïque du fichier de données, sous la forme que le noyau manipule. */
const lues = () => MOSAIQUES.map(lireMosaique);

test('CHAQUE QUESTION LIVRÉE ANNONCE LA BONNE PIÈCE', () => {
    // LE CŒUR DE TOUT. On recalcule l'image, et on exige qu'elle soit
    // EXACTEMENT la pièce annoncée — pas « une pièce de même forme », pas
    // « une pièce qui lui ressemble ».
    let questions = 0;
    for (const m of lues()) {
        const parNumero = new Map(m.pieces.map(p => [p.n, p]));
        for (const r of m.relations) {
            questions++;
            const depart = parNumero.get(r.depuis);
            const arrivee = parNumero.get(r.vers);
            assert.ok(depart, `${m.graine} : la pièce ${r.depuis} n'existe pas`);
            assert.ok(arrivee, `${m.graine} : la pièce ${r.vers} n'existe pas`);
            const image = imageFigure(depart.cases, r.t);
            assert.ok(memeFigure(image, arrivee.cases),
                `${m.graine} : ${direTransformation(r.t)} n'envoie PAS la pièce ${r.depuis} `
                + `sur la pièce ${r.vers}`);
        }
    }
    assert.ok(questions >= 100, `il faut de quoi tenir une année : ${questions} questions`);
});

test('UNE QUESTION N\'A JAMAIS DEUX RÉPONSES', () => {
    // Deux pièces identiques posées au même endroit ne peuvent pas arriver —
    // mais c'est exactement le genre de chose qu'on croit impossible jusqu'au
    // jour où un élève donne « l'autre » bonne réponse et se voit compter faux.
    for (const m of lues()) {
        const parNumero = new Map(m.pieces.map(p => [p.n, p]));
        for (const r of m.relations) {
            const image = imageFigure(parNumero.get(r.depuis).cases, r.t);
            const qui = m.pieces.filter(p => memeFigure(image, p.cases)).map(p => p.n);
            assert.deepEqual(qui, [r.vers],
                `${m.graine} : la pièce ${r.depuis} a ${qui.length} images par ${direTransformation(r.t)}`);
        }
    }
});

test('CHAQUE QUESTION SE DIT EN FRANÇAIS, AVEC DES POINTS NOMMÉS', () => {
    // UN ÉNONCÉ AVEC UN « null » DEDANS NE CASSE RIEN, et c'est bien le
    // problème : il s'affiche, l'élève ne comprend pas, et personne ne saura
    // jamais que l'exercice était cassé ce jour-là.
    for (const m of lues()) {
        const noms = new Set(m.sommets.map(s => s.nom));
        for (const r of m.relations) {
            const dit = direTransformation(r.t);
            assert.ok(!/null|undefined|NaN/.test(dit), `${m.graine} : « ${dit} »`);
            assert.ok(dit.length > 10, `${m.graine} : énoncé trop court « ${dit} »`);

            // Les points cités doivent EXISTER sur le dessin : un axe (GJ) dont
            // le J n'est nommé nulle part est introuvable pour l'élève.
            const cites = [r.t.nomCentre, ...(r.t.nomAxe || '').split(''), ...(r.t.nomVecteur || '').split('')]
                .filter(Boolean);
            for (const c of cites) {
                assert.ok(noms.has(c), `${m.graine} : le point ${c} est cité et n'est pas sur le dessin`);
            }
        }
    }
});

test('LES POINTS NOMMÉS SONT DES COINS DE LA MOSAÏQUE', () => {
    // Un point posé dans le vide à côté de la figure ne se trouve pas. La
    // première version les posait au bord de la boîte — l'élève cherchait un
    // point C qui ne touchait rien.
    for (const m of lues()) {
        const coins = new Set();
        for (const p of m.pieces) {
            for (const c of p.cases) {
                for (const dx of [-0.5, 0.5]) {
                    for (const dy of [-0.5, 0.5]) coins.add(`${c.x + dx},${c.y + dy}`);
                }
            }
        }
        for (const s of m.sommets) {
            assert.ok(coins.has(`${s.x},${s.y}`),
                `${m.graine} : le point ${s.nom} (${s.x} ; ${s.y}) ne touche aucune pièce`);
        }
    }
});

test('LES PIÈCES NE SE CHEVAUCHENT PAS, ET LA MOSAÏQUE EST D\'UN SEUL TENANT', () => {
    for (const m of lues()) {
        const occupe = new Map();
        for (const p of m.pieces) {
            assert.ok(p.cases.length >= 3, `${m.graine} : la pièce ${p.n} n'a que ${p.cases.length} case(s)`);
            for (const c of p.cases) {
                const k = cleCase(c);
                assert.ok(!occupe.has(k),
                    `${m.graine} : les pièces ${occupe.get(k)} et ${p.n} se chevauchent en ${k}`);
                occupe.set(k, p.n);
            }
        }
        // D'un seul tenant : on inonde depuis une case et l'on doit toutes les
        // atteindre. Une mosaïque en archipel ne se lit pas comme une figure.
        const cles = [...occupe.keys()];
        const vues = new Set([cles[0]]);
        const file = [cles[0]];
        while (file.length) {
            const [x, y] = file.pop().split(',').map(Number);
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const k = `${x + dx},${y + dy}`;
                if (occupe.has(k) && !vues.has(k)) { vues.add(k); file.push(k); }
            }
        }
        assert.equal(vues.size, cles.length, `${m.graine} : la mosaïque est en plusieurs morceaux`);
    }
});

test('LES NUMÉROS SE SUIVENT, SANS TROU NI DOUBLON', () => {
    // La réponse EST un numéro. Un numéro manquant, et l'élève cherche une
    // pièce qui n'existe pas ; un doublon, et deux pièces répondent au même nom.
    for (const m of lues()) {
        const ns = m.pieces.map(p => p.n).sort((a, b) => a - b);
        assert.deepEqual(ns, ns.map((_, i) => i + 1), `${m.graine} : numéros ${ns.join(',')}`);
    }
});

test('LES QUATRE TRANSFORMATIONS SONT REPRÉSENTÉES DANS LE LOT', () => {
    // Un lot qui ne contiendrait que des rotations ne servirait qu'à une seule
    // séance — et le réglage « seulement les symétries » du professeur rendrait
    // alors des rotations quand même.
    const genres = new Set();
    for (const m of MOSAIQUES) m.relations.forEach(r => genres.add(r.t.genre));
    assert.deepEqual([...genres].sort(), [...GENRES].sort());
});

test('LE GÉNÉRATEUR RESPECTE LES TRANSFORMATIONS DEMANDÉES', () => {
    // Le professeur décoche « rotation » pour sa sixième : il ne doit pas en
    // recevoir. C'est le réglage le plus utilisé de cet exercice, et un
    // générateur qui l'ignore propose à des élèves de sixième une notion de
    // quatrième.
    for (const genre of GENRES) {
        for (let i = 0; i < 25; i++) {
            const it = generator.generate({ genres: [genre] }, { rng: makeRng(`g-${genre}-${i}`) });
            assert.equal(it.meta.genre, genre,
                `demandé « ${genre} », reçu « ${it.meta.genre} »`);
        }
    }
});

test('LA RÉPONSE DU GÉNÉRATEUR EST CELLE DE LA MOSAÏQUE', () => {
    // L'aller-retour complet : on recalcule l'image à partir de ce que l'item
    // porte, et l'on exige qu'elle soit la pièce que `answer` annonce.
    for (let i = 0; i < 120; i++) {
        const it = generator.generate({}, { rng: makeRng(`r-${i}`) });
        const depart = it.meta.pieces.find(p => p.n === it.meta.depuis);
        const arrivee = it.meta.pieces.find(p => p.n === Number(it.answer));
        assert.ok(depart && arrivee, `item ${i} : pièce introuvable`);
        assert.ok(memeFigure(imageFigure(depart.cases, it.meta.transfo), arrivee.cases),
            `item ${i} : ${it.prompt.text} → ${it.answer} est faux`);
        assert.equal(String(it.meta.vers), String(it.answer));
    }
});

test('UN ITEM PORTE TOUT CE QUE L\'ÉCRAN DOIT DESSINER', () => {
    // L'activité ne va rien rechercher : elle dessine ce que l'item porte. Un
    // champ manquant fait une mosaïque vide, sans message.
    const it = generator.generate({}, { rng: makeRng('complet') });
    for (const champ of ['boite', 'pieces', 'sommets', 'depuis', 'vers', 'transfo', 'genre', 'montrer']) {
        assert.notEqual(it.meta[champ], undefined, `meta.${champ} manque`);
    }
    assert.equal(it.answerKind, 'piece');
    assert.ok(it.prompt.text.includes(String(it.meta.depuis)), 'la consigne doit nommer la pièce de départ');
    assert.ok(!it.prompt.text.includes(`pièce ${it.meta.vers} `) || it.meta.depuis === it.meta.vers,
        'la consigne ne doit PAS contenir la réponse');
    assert.ok(it.hints.length >= 2, 'un élève bloqué doit avoir de quoi repartir');
    assert.ok(it.explanation.includes(String(it.meta.vers)), 'l\'explication doit dire où la pièce tombe');
});

test('LE RÉGLAGE « montrer » ARRIVE JUSQU\'À L\'ÉCRAN', () => {
    // C'est la demande de Rémy, et c'est un réglage qui ne se voit pas dans une
    // capture d'écran : s'il se perdait en route, personne ne le remarquerait
    // avant qu'un élève se trompe et ne voie rien.
    assert.equal(generator.generate({}, { rng: makeRng('m1') }).meta.montrer, 'si-faux');
    assert.equal(generator.generate({ montrer: 'toujours' }, { rng: makeRng('m2') }).meta.montrer, 'toujours');
    assert.equal(generator.generate({ montrer: 'n\'importe quoi' }, { rng: makeRng('m3') }).meta.montrer, 'si-faux');
});

test('UN RÉGLAGE ABÎMÉ NE FAIT PAS TOMBER L\'EXERCICE', () => {
    // Le piège documenté dans `generators/transfoQuadrillage.js` : un réglage à
    // choix multiples qui arrive sous forme de CHAÎNE. `.filter` sur une chaîne
    // lève une TypeError, et l'exercice disparaît — ni à l'écran, ni sur la
    // feuille, sans le moindre message.
    for (const brut of ['axiale,rotation', 'axiale', '', null, undefined, 42, {}, ['bidule']]) {
        const it = generator.generate({ genres: brut }, { rng: makeRng('abime') });
        assert.ok(it && it.answer, `réglage ${JSON.stringify(brut)} : aucun item`);
        assert.ok(GENRES.includes(it.meta.genre));
    }
});

test('LE CONSTRUCTEUR REFUSE CE QU\'IL NE SAIT PAS BÂTIR', () => {
    // On lui donne une boîte minuscule : il doit rendre `null`, pas une
    // mosaïque bancale. C'est ce `null` qui permet à l'outil de relancer avec
    // un autre grain plutôt que de livrer n'importe quoi.
    const serre = construireMosaique({ graine: 'serre', largeur: 4, hauteur: 3, pieces: 15 });
    assert.ok(serre === null || verifierMosaique(serre).length === 0);
});

test('CE QUE LE CONSTRUCTEUR REND EST TOUJOURS VÉRIFIÉ BON', () => {
    // Cinquante grains, cinquante mosaïques relues. C'est l'épreuve qui dirait
    // qu'une modification du constructeur a cassé quelque chose, bien avant
    // qu'on refabrique le fichier de données.
    let bonnes = 0;
    for (let i = 0; i < 50; i++) {
        const m = construireMosaique({ graine: `v-${i}`, largeur: 11, hauteur: 9, pieces: 16 });
        if (!m) continue;
        bonnes++;
        assert.deepEqual(verifierMosaique(m), [], `grain ${i}`);
    }
    assert.ok(bonnes >= 20, `trop peu de mosaïques poussent : ${bonnes} sur 50`);
});

test('UN MÊME GRAIN DONNE TOUJOURS LA MÊME MOSAÏQUE', () => {
    // Sans cela, le fichier de données changerait à chaque fabrication et
    // `git diff` ne dirait plus rien — et surtout, une mosaïque qu'on a vérifiée
    // ne serait pas celle qu'on livre.
    const a = construireMosaique({ graine: 'stable', largeur: 11, hauteur: 9, pieces: 16 });
    const b = construireMosaique({ graine: 'stable', largeur: 11, hauteur: 9, pieces: 16 });
    assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
});
