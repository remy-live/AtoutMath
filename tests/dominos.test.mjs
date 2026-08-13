// Les dominos : une seule façon d'arriver au bout.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    DEPART, ARRIVEE, QUESTION, REPONSE, BOUT, compacter, rassemblerCouples,
    construireChaine, cheminSerpentin, cellulesDe, boiteDe, plateauVide, casePiece,
    poserEnCase, retirerDeCase, retournerCase, plateauFini, verifierPlateau,
    prochaineCase, seMarient, demiDe, direJoint, reserveMelangee, direChaine,
    insecable, ajusterAuCarre, largeurTexte, LIMITE_INSECABLE, MIN_COUPLES
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

test('deux moitiés se touchent quand l\'une est la réponse de l\'autre', () => {
    // C'est la règle des vrais dominos, et elle est SYMÉTRIQUE : c'est elle
    // qui autorise à retourner une pièce.
    const ch = construireChaine(rassemblerCouples(tirageSimple(), 4));
    const q0 = ch.pieces[0].demis[1];         // la question du couple 0
    const r0 = ch.pieces[1].demis[0];         // sa réponse
    assert.equal(q0.type, QUESTION);
    assert.equal(r0.type, REPONSE);
    assert.ok(seMarient(q0, r0));
    assert.ok(seMarient(r0, q0), 'la règle ne doit pas dépendre du sens');
    // Deux questions ne se touchent pas, deux réponses non plus.
    assert.ok(!seMarient(q0, ch.pieces[1].demis[1]));
    assert.ok(!seMarient(r0, ch.pieces[2].demis[0]));
    // DÉPART et ARRIVÉE ne se marient à rien : ce sont les extrémités.
    assert.equal(ch.pieces[0].demis[0].type, BOUT);
    assert.ok(!seMarient(ch.pieces[0].demis[0], ch.pieces[ch.pieces.length - 1].demis[1]));
});

test('retourner une pièce échange ses deux moitiés', () => {
    const ch = construireChaine(rassemblerCouples(tirageSimple(), 3));
    const p = ch.pieces[1];
    assert.equal(demiDe(p, 0, false), p.demis[0]);
    assert.equal(demiDe(p, 0, true), p.demis[1]);
    assert.equal(demiDe(p, 1, true), p.demis[0]);
});

test('le serpentin ne se coupe jamais, et ne se marche jamais dessus', () => {
    // Deux propriétés font toute la planche : chaque case touche la suivante
    // (sinon la jointure ne veut rien dire) et aucune cellule ne sert deux
    // fois (sinon deux pièces se recouvrent à l'écran).
    for (const parRangee of [2, 3, 4, 5, 6]) {
        for (const n of [4, 7, 9, 13, 16]) {
            const ch = cheminSerpentin(n, parRangee);
            assert.equal(ch.cases.length, n, `${n}/${parRangee} : il manque des emplacements`);
            const cellules = ch.cases.flatMap(cellulesDe);
            assert.equal(new Set(cellules.map(c => c.join(','))).size, cellules.length,
                `${n}/${parRangee} : deux emplacements se recouvrent`);
            for (let i = 0; i + 1 < n; i++) {
                const a = cellulesDe(ch.cases[i])[1];
                const b = cellulesDe(ch.cases[i + 1])[0];
                assert.equal(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]), 1,
                    `${n}/${parRangee} : rupture entre ${i} et ${i + 1}`);
            }
            // Et tout tient dans le cadre annoncé, sans coordonnée négative.
            cellules.forEach(([x, y]) => {
                assert.ok(x >= 0 && x < ch.colonnes, `abscisse ${x} hors du plateau`);
                assert.ok(y >= 0 && y < ch.lignes, `ordonnée ${y} hors du plateau`);
            });
        }
    }
});

test('une case couchée fait deux cellules de large, une case debout deux de haut', () => {
    const ch = cheminSerpentin(9, 3);
    ch.cases.forEach((c, i) => {
        const b = boiteDe(c);
        assert.equal(b.l * b.h, 2, `case ${i} : un domino occupe deux cellules`);
        assert.ok((b.l === 2 && b.h === 1) || (b.l === 1 && b.h === 2));
        // Le retour de serpentin traverse la case à l'envers : c'est alors sa
        // seconde moitié qui se dessine en premier.
        assert.equal(b.inverse, c.dir === 'hl' || c.dir === 'vu', `case ${i}`);
    });
    assert.ok(ch.cases.some(c => c.dir === 'vd'), 'un serpentin sans virage n\'en est pas un');
    assert.ok(ch.cases.some(c => c.dir === 'hl'), 'et il doit revenir dans l\'autre sens');
});

test('le plateau part vide, et n\'importe quelle pièce entre n\'importe où', () => {
    // ON POSE, ON NE JUGE PAS : refuser au moment de la pose, c'est corriger à
    // la place de l'élève. La sanction vient à la vérification.
    const ch = construireChaine(rassemblerCouples(tirageSimple(), 5));
    let etat = plateauVide(ch.pieces.length);
    assert.equal(etat.cases.length, 6);
    assert.ok(!plateauFini(etat));
    assert.equal(casePiece(etat, 3), -1);

    etat = poserEnCase(etat, 4, 0);            // le DÉPART tout au bout : admis
    assert.equal(casePiece(etat, 0), 4);
    assert.equal(etat.cases[4].id, 0);
    // Une pièce déjà posée se DÉPLACE au lieu de se dédoubler.
    etat = poserEnCase(etat, 1, 0);
    assert.equal(etat.cases[4], null);
    assert.equal(casePiece(etat, 0), 1);
    assert.equal(etat.cases.filter(Boolean).length, 1);

    etat = retournerCase(etat, 1);
    assert.equal(etat.cases[1].retourne, true);
    etat = retirerDeCase(etat, 1);
    assert.equal(casePiece(etat, 0), -1);
});

test('la vérification entoure la jointure fautive, pas la planche entière', () => {
    const ch = construireChaine(rassemblerCouples(tirageSimple(), 5));
    // La bonne planche : chaque pièce à sa place, dans l'ordre du serpentin.
    let juste = plateauVide(ch.pieces.length);
    ch.pieces.forEach((p, i) => { juste = poserEnCase(juste, i, p.id); });
    const bon = verifierPlateau(ch, juste);
    assert.ok(bon.ok && bon.complet && bon.bouts);
    assert.deepEqual(bon.fautes, []);

    // Deux pièces interverties : DEUX jointures cassent autour de chacune.
    let faux = poserEnCase(poserEnCase(juste, 1, 2), 2, 1);
    const bilan = verifierPlateau(ch, faux);
    assert.ok(!bilan.ok);
    assert.ok(bilan.complet, 'la planche est pleine : c\'est bien la LECTURE qui cloche');
    assert.deepEqual(bilan.fautes, [0, 1, 2], 'les trois jointures autour de l\'échange');

    // Une planche incomplète n'est pas fausse pour autant : on ne gronde pas
    // un élève qui n'a pas fini.
    const partiel = retirerDeCase(juste, 3);
    const b2 = verifierPlateau(ch, partiel);
    assert.ok(!b2.ok && !b2.complet);
    assert.deepEqual(b2.fautes, [], 'un trou ne fabrique pas de fautes');
});

test('la planche se lit aussi à l\'envers — c\'est un domino, pas une dictée', () => {
    // Poser la chaîne en commençant par ARRIVÉE, chaque pièce retournée, donne
    // une planche tout aussi juste. Refuser celle-là serait arbitraire.
    const ch = construireChaine(rassemblerCouples(tirageSimple(), 4));
    let etat = plateauVide(ch.pieces.length);
    ch.pieces.slice().reverse().forEach((p, i) => { etat = poserEnCase(etat, i, p.id, true); });
    assert.ok(verifierPlateau(ch, etat).ok);
});

test('le robot avance le long du serpentin, case par case', () => {
    const ch = construireChaine(rassemblerCouples(tirageSimple(), 6));
    let etat = plateauVide(ch.pieces.length);
    let garde = 0, pose;
    const vues = [];
    while ((pose = prochaineCase(ch, etat)) && garde++ < 40) {
        vues.push(pose.index);
        etat = poserEnCase(etat, pose.index, pose.id, pose.retourne);
    }
    assert.ok(plateauFini(etat), 'le robot doit remplir toute la planche');
    assert.deepEqual(vues, ch.pieces.map((_, i) => i), 'et la remplir dans l\'ordre');
    assert.ok(verifierPlateau(ch, etat).ok, 'ce que pose le robot doit être juste');
    assert.equal(prochaineCase(ch, etat), null);
});

test('le robot explique le chemin, il ne donne pas la pièce', () => {
    const ch = construireChaine(rassemblerCouples(tirageSimple(), 4));
    let etat = plateauVide(ch.pieces.length);
    // Plateau vide : on commence par le DÉPART, et on dit pourquoi.
    assert.match(direJoint(ch, etat, prochaineCase(ch, etat)), /DÉPART/);
    etat = poserEnCase(etat, 0, 0);
    const dit = direJoint(ch, etat, prochaineCase(ch, etat));
    assert.match(dit, /emplacement d'avant/);
    assert.ok(dit.length > 40, 'une correction d\'un mot n\'apprend rien');
    // Et jamais le numéro de la pièce à prendre : seulement ce qu'on cherche.
    assert.ok(!/pièce numéro/i.test(dit));
});

test('la réserve porte TOUTES les pièces, mélangées', () => {
    // Le plateau part vide : aucune pièce n'est posée d'avance, sinon la
    // chaîne n'aurait qu'un seul bout ouvert.
    const ch = construireChaine(rassemblerCouples(tirageSimple(), 8));
    const reserve = reserveMelangee(ch, makeRng('mel'));
    assert.equal(reserve.length, ch.pieces.length);
    assert.deepEqual([...reserve].sort((a, b) => a - b), ch.pieces.map(p => p.id));
    assert.notDeepEqual(reserve, ch.pieces.map(p => p.id), 'mélangée pour de bon');
    assert.deepEqual(reserve, reserveMelangee(ch, makeRng('mel')), 'et reproductible');
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
        assert.equal(it.meta.reserve.length, it.meta.pieces.length,
            'la planche imprimée porte toutes les pièces, mélangées');
        assert.ok(!/undefined|NaN/.test(it.explanation));
        assert.match(it.explanation, /ARRIVÉE/);
    }
});

test('un calcul court ne se coupe pas en deux lignes', () => {
    // « 10 × 3 » écrit « 10 × » au-dessus de « 3 » se lit deux fois : d'abord
    // comme deux morceaux, ensuite comme un calcul. Sur une moitié de domino
    // qu'on reconnaît d'un coup d'œil, c'est un temps de trop.
    const NBSP = '\u00A0';
    assert.equal(insecable('10 × 3'), `10${NBSP}×${NBSP}3`);
    assert.equal(insecable('8 × 4'), `8${NBSP}×${NBSP}4`);
    assert.equal(insecable('10 × 10'), `10${NBSP}×${NBSP}10`);
    // Et l'ajustement le voit comme UN seul mot : la police descend jusqu'à
    // ce que la ligne entière tienne, au lieu de replier le calcul.
    const soude = insecable('10 × 3');
    const f = ajusterAuCarre(soude);
    assert.ok(largeurTexte(soude) * f <= 0.92,
        'la police doit laisser tenir tout le calcul sur une ligne');

    // Une vraie phrase continue de se replier : elle se lit ligne à ligne,
    // et la souder donnerait une police illisible.
    const phrase = 'Périmètre d\'un rectangle de 11 cm sur 6 cm';
    assert.equal(insecable(phrase), phrase);
    assert.ok(phrase.length > LIMITE_INSECABLE);
    const fp = ajusterAuCarre(phrase);
    assert.ok(largeurTexte(phrase) * fp > 0.92,
        'une phrase se replie sur plusieurs lignes, elle ne se réduit pas à rien');
    assert.ok(fp > 0.1, 'et elle reste lisible');

    // Et une espace ne coûte pas un chiffre : « 10 × 10 » doit rester plus
    // grand que « 1010101 », qui occupe vraiment sept caractères pleins.
    assert.ok(ajusterAuCarre(insecable('10 × 10')) > ajusterAuCarre('1010101'));
});
