// Les dominos : une seule façon d'arriver au bout.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    DEPART, ARRIVEE, compacter, rassemblerCouples, construireChaine,
    pieceSuivante, boutOuvert, posePossible, direJoint, direErreur,
    reserveMelangee, direChaine, MIN_COUPLES
} from '../js/core/dominos.js';
import { makeRng } from '../js/core/ids.js';

/** Un tirage de laboratoire : des questions numérotées, réponses distinctes. */
const tirageSimple = () => {
    let k = 0;
    return () => { k++; return { q: `${k} × 10 = ?`, r: String(k * 10) }; };
};

test('une moitié de domino ne porte pas « = ? »', () => {
    // La moitié d'à côté EST le « = ? » : l'écrire une deuxième fois, c'est
    // écrire deux fois la même chose.
    assert.equal(compacter('7 × 8 = ?'), '7 × 8');
    assert.equal(compacter('  19 − 12 = ?  '), '19 − 12');
    // Le signe égal seul tombe aussi : « quarante-trois mille = fait 43 000 »
    // ne se lit pas.
    assert.equal(compacter('quarante-trois mille huit cent dix-sept ='),
        'quarante-trois mille huit cent dix-sept');
    assert.equal(compacter('00085,7900 ='), '00085,7900');
    // Mais l'égalité qui EST l'énoncé reste entière.
    assert.equal(compacter('9 × ... = 63'), '9 × ... = 63');
    assert.equal(compacter('20 + ? = 100'), '20 + ? = 100');
    assert.equal(compacter('39 701 = 30 000 + 9 000 + ? + 1'), '39 701 = 30 000 + 9 000 + ? + 1');
    assert.equal(compacter('Périmètre d\'un rectangle de 11 cm sur 6 cm ?'),
        'Périmètre d\'un rectangle de 11 cm sur 6 cm ?');
});

test('n couples donnent n + 1 pièces, du DÉPART à l\'ARRIVÉE', () => {
    const couples = rassemblerCouples(tirageSimple(), 6);
    const ch = construireChaine(couples);
    assert.equal(couples.length, 6);
    assert.equal(ch.pieces.length, 7);
    assert.equal(ch.pieces[0].gauche, DEPART);
    assert.equal(ch.pieces[6].droite, ARRIVEE);
    // Et le contrat du jeu : à chaque pli, la question touche sa réponse.
    for (let i = 0; i < couples.length; i++) {
        assert.equal(ch.pieces[i].droite, couples[i].q, `pli ${i} : la question`);
        assert.equal(ch.pieces[i + 1].gauche, couples[i].r, `pli ${i} : la réponse`);
    }
});

test('deux questions ne peuvent pas avoir la même réponse', () => {
    // C'est TOUTE la difficulté du jeu : si « 6 × 4 » et « 8 × 3 » sont dans la
    // même chaîne, on peut intervertir deux pièces et arriver au bout quand
    // même. La chaîne aurait deux solutions, donc plus aucune valeur.
    let k = 0;
    const tirage = () => { k++; return { q: `question ${k}`, r: k % 2 ? '12' : String(k) }; };
    const couples = rassemblerCouples(tirage, 8);
    const reps = couples.map(c => c.r);
    assert.equal(new Set(reps).size, reps.length, 'une réponse revient deux fois');
    const qs = couples.map(c => c.q);
    assert.equal(new Set(qs).size, qs.length, 'une question revient deux fois');
});

test('une moitié n\'est jamais à la fois une question et une réponse', () => {
    // « 56 » écrit à droite d'une pièce et à gauche d'une autre : l'élève ne
    // sait plus si ce qu'il lit est à calculer ou déjà calculé.
    let k = 0;
    const tirage = () => { k++; return k === 1 ? { q: '50', r: '7' } : { q: `q${k}`, r: '50' }; };
    const couples = rassemblerCouples(tirage, 4, 40);
    couples.forEach(c => {
        assert.ok(!couples.some(autre => autre.q === c.r), `« ${c.r} » est aussi une question`);
    });
});

test('quand le générateur n\'a pas assez de réponses, la chaîne raccourcit', () => {
    // Une division par une table n'a que neuf quotients possibles : demander
    // douze pièces n'a pas de sens. Mieux vaut une chaîne courte qu'une chaîne
    // ambiguë — ou qu'une erreur en pleine séance.
    let k = 0;
    const tirage = () => { k++; return { q: `q${k}`, r: String(k % 5) }; };
    const couples = rassemblerCouples(tirage, 12);
    assert.equal(couples.length, 5);
    assert.ok(couples.length >= MIN_COUPLES);
    // Et un tirage tari ne fait pas tourner la boucle indéfiniment.
    assert.deepEqual(rassemblerCouples(() => null, 10), []);
});

test('à chaque instant, une seule pièce peut être posée', () => {
    const ch = construireChaine(rassemblerCouples(tirageSimple(), 5));
    for (let posees = 1; posees < ch.pieces.length; posees++) {
        const bonnes = ch.pieces.filter(p => posePossible(ch, posees, p.id));
        assert.equal(bonnes.length, 1, `${posees} pièces posées : ${bonnes.length} choix`);
        assert.equal(bonnes[0].id, pieceSuivante(ch, posees));
        // Et cette pièce porte bien à gauche la réponse du bout ouvert.
        assert.equal(bonnes[0].gauche, ch.couples[posees - 1].r);
    }
    // Chaîne finie : plus rien à poser.
    assert.equal(pieceSuivante(ch, ch.pieces.length), null);
});

test('le bout ouvert est toujours la dernière moitié droite', () => {
    const ch = construireChaine(rassemblerCouples(tirageSimple(), 4));
    assert.equal(boutOuvert(ch, 0), null);
    assert.equal(boutOuvert(ch, 1), ch.couples[0].q);
    assert.equal(boutOuvert(ch, 3), ch.couples[2].q);
    assert.equal(boutOuvert(ch, ch.pieces.length), ARRIVEE);
});

test('le robot explique le chemin, il ne donne pas la pièce', () => {
    const ch = construireChaine(rassemblerCouples(tirageSimple(), 4));
    const dit = direJoint(ch, 2);
    assert.match(dit, /bout ouvert/);
    assert.match(dit, new RegExp(ch.couples[1].q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(dit, /à gauche/, 'il doit dire OÙ chercher, pas seulement quoi');
    // Le départ ne se cherche pas.
    assert.match(direJoint(ch, 0), /DÉPART/);
});

test('une pièce mal posée reçoit sa raison, pas un simple « faux »', () => {
    const ch = construireChaine(rassemblerCouples(tirageSimple(), 5));
    const raison = direErreur(ch, 2, 4);
    assert.match(raison, /bout ouvert/);
    assert.match(raison, /à gauche/);
    assert.ok(raison.length > 40, 'une correction d\'un mot n\'apprend rien');
});

test('la réserve est mélangée, la pièce de départ n\'y est pas', () => {
    const ch = construireChaine(rassemblerCouples(tirageSimple(), 8));
    const reserve = reserveMelangee(ch, makeRng('mel'));
    assert.equal(reserve.length, ch.pieces.length - 1);
    assert.ok(!reserve.includes(0), 'la pièce DÉPART est déjà sur la table');
    assert.deepEqual([...reserve].sort((a, b) => a - b), ch.pieces.slice(1).map(p => p.id));
    // Mélangée pour de bon : l'ordre du tirage n'est pas l'ordre de la chaîne.
    assert.notDeepEqual(reserve, ch.pieces.slice(1).map(p => p.id));
    // Et reproductible : même graine, même réserve.
    assert.deepEqual(reserve, reserveMelangee(ch, makeRng('mel')));
});

test('la chaîne se relit en une ligne pour la correction', () => {
    const ch = construireChaine(rassemblerCouples(tirageSimple(), 3));
    const ligne = direChaine(ch);
    assert.match(ligne, /^DÉPART \| /);
    assert.match(ligne, /ARRIVÉE$/);
    assert.equal(ligne.split('→').length, ch.pieces.length);
});

// --- Branché sur les vrais générateurs --------------------------------------

import { allGenerators } from '../js/core/registry.js';
import '../js/core/activities/index.js';
import { SOURCES, chaineDepuisGenerateur } from '../js/core/generators/dominos.js';

test('chaque source annoncée tient sa promesse', () => {
    // Le professeur choisit une notion dans une liste. Si l'une d'elles ne
    // sait pas fournir dix réponses différentes, il obtient une chaîne
    // rabougrie sans comprendre pourquoi : la liste doit être vérifiée, pas
    // supposée.
    for (const src of SOURCES) {
        const gen = allGenerators().find(g => g.id === src.id);
        assert.ok(gen, `source inconnue : ${src.id}`);
        assert.ok(gen.ecrit, `${src.id} : cette question ne s'écrit pas toute seule sur une pièce`);
        const ch = chaineDepuisGenerateur(src.id, src.params || {}, 10, makeRng(`src-${src.id}`));
        assert.equal(ch.couples.length, 10, `${src.id} : seulement ${ch.couples.length} couples`);
        const reps = ch.couples.map(c => c.r);
        assert.equal(new Set(reps).size, 10, `${src.id} : deux réponses identiques`);
        ch.pieces.forEach(p => {
            // Une pièce se lit d'un coup d'œil, dans la main : la réponse tient
            // sur un mot, la question sur deux lignes au plus.
            assert.ok(String(p.gauche).length <= 24,
                `${src.id} : réponse trop longue — « ${p.gauche} »`);
            assert.ok(String(p.droite).length <= 56,
                `${src.id} : question trop longue pour une pièce — « ${p.droite} »`);
        });
    }
});

test('le même tirage donne le même jeu de dominos', () => {
    const a = chaineDepuisGenerateur('calc.mult.fact', {}, 8, makeRng('stable'));
    const b = chaineDepuisGenerateur('calc.mult.fact', {}, 8, makeRng('stable'));
    assert.deepEqual(a.pieces.map(p => [p.gauche, p.droite]), b.pieces.map(p => [p.gauche, p.droite]));
});

import { dominosGenerator } from '../js/core/generators/dominos.js';

test('le générateur pose une planche complète sur la feuille', () => {
    for (let g = 1; g <= 8; g++) {
        const it = dominosGenerator.generate(
            { source: 'calc.addition', pieces: 9 }, { rng: makeRng(`pap${g}`), index: g });
        assert.ok(it.meta.pieces.length >= 4, 'la planche voyage avec l\'item');
        assert.equal(it.meta.pieces.length, it.meta.couples.length + 1);
        assert.ok(it.meta.reserve.length === it.meta.pieces.length - 1);
        assert.ok(!/undefined|NaN/.test(it.explanation));
        assert.match(it.explanation, /ARRIVÉE/);
    }
});
