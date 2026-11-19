// L'ÉDITEUR PYTHON NE REÇOIT QUE DES QUESTIONS OÙ L'ON TAPE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 19 novembre au soir, capture à l'appui : « je ne comprends pas ce que
// tu demandes ». Sur sa photo : « Que va afficher ce programme ? » — une
// question à choix — au-dessus du champ de saisie et des deux boutons de
// décalage de l'ÉDITEUR. Il n'y avait rien à taper ; il n'y avait pas de
// propositions non plus. Il a eu raison de ne pas comprendre.
//
// ── LA CAUSE ─────────────────────────────────────────────────────────────
//
// UN SEUL générateur déclarait les vingt-et-une marches, et DEUX exercices
// s'en servaient avec DEUX activités. Le catalogue limitait bien « à Toi de
// Taper » à ses cinq marches d'écriture — mais le PANNEAU DE RÉGLAGES est bâti
// par le générateur, qui proposait les vingt-et-une. Dès qu'on touche aux
// réglages — un élève, une séance, un parcours —, l'éditeur reçoit un QCM.
// Mesuré dans les deux sens : le pavé à choix recevait aussi les marches où
// l'on tape.
//
// La correction est structurelle : DEUX GÉNÉRATEURS, chacun avec sa liste.
// Cette épreuve garde la séparation.
//
// ── POURQUOI ELLE EST ÉTROITE, ET CE QU'ELLE NE DIT PAS ──────────────────
//
// J'ai d'abord écrit la version générale — « aucun exercice n'envoie à son
// activité un `answerKind` qu'elle refuse » — et elle accusait DIX-NEUF
// exercices qui marchent. Le catalogue s'appuie délibérément sur
// `isCompatible`, qui emploie `.some()` : un générateur n'a qu'à POUVOIR
// produire un genre que l'activité prend. Et plusieurs activités ADAPTENT :
// `numeric.js` a `clavierVoulu`, qui passe la main à un autre clavier quand la
// question en demande un. L'éditeur Python, lui, n'a rien de tel.
//
// Une épreuve large et fausse est pire qu'une épreuve étroite et vraie : elle
// se fait désactiver au premier rouge injustifié. Celle-ci ne garde donc que
// ce dont j'ai la preuve. La règle générale — « peut parfois marcher » lu
// comme « marche toujours » — est au journal des frictions, où elle attend un
// outil qui sache distinguer une activité qui adapte d'une activité qui subit.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { pythonPasAPasGenerator, pythonEcrireGenerator, ETAPES }
    from '../js/core/generators/pythonPasAPas.js';

/** Tous les genres de réponse qu'un générateur produit, réglé de toutes les façons. */
function genresProduits(g) {
    const vus = new Set();
    const param = (g.params || []).find((p) => Array.isArray(p.marches) && p.marches.length);
    const clef = param ? param.id : null;
    // Sans réglages — l'état où le générateur décide seul, et celui qu'une
    // séance ou un parcours laisse derrière lui.
    const jeux = [{}];
    // Puis CHAQUE option du panneau, une par une : c'est le panneau qui a
    // ouvert la porte, c'est donc lui qu'il faut parcourir en entier.
    if (param && clef) {
        for (const m of param.marches) {
            if (m && m.id !== undefined) jeux.push({ [clef]: [m.id] });
        }
    }
    for (const reglages of jeux) {
        for (let i = 0; i < 4; i++) {
            let it;
            try { it = g.generate(reglages, { rng: makeRng(`${g.id}/${i}/${JSON.stringify(reglages)}`),
                index: i, total: 4 }); } catch { break; }
            if (it && it.answerKind) vus.add(it.answerKind);
        }
    }
    return vus;
}

test('L’ÉDITEUR PYTHON NE PEUT RECEVOIR QU’UNE QUESTION OÙ L’ON TAPE', () => {
    const vus = [...genresProduits(pythonEcrireGenerator)];
    assert.deepEqual(vus, ['text'],
        'le générateur de « Python : à Toi de Taper » produit ' + vus.join(', ')
        + ' — un « choice » arrive dans l’éditeur sous la forme d’une question '
        + 'à laquelle il n’y a rien à répondre. C’est la capture de Rémy du '
        + '19 novembre : « je ne comprends pas ce que tu demandes ».');
});

test('ET LE PAVÉ À CHOIX NE PEUT RECEVOIR QU’UN QCM', () => {
    const vus = [...genresProduits(pythonPasAPasGenerator)];
    assert.deepEqual(vus, ['choice'],
        'le générateur de « Python Pas à Pas » produit ' + vus.join(', ')
        + ' — le même défaut, dans l’autre sens : une marche où il faut écrire '
        + 'un programme, posée avec quatre propositions.');
});

test('LES DEUX GÉNÉRATEURS SE PARTAGENT TOUTES LES MARCHES, SANS EN PERDRE', () => {
    // ── POURQUOI CETTE TROISIÈME ÉPREUVE ─────────────────────────────────
    //
    // Les deux premières resteraient vertes si l'un des générateurs ne servait
    // PLUS RIEN : un panneau vide ne produit aucun genre interdit. Or une
    // marche qui disparaît est un exercice qui disparaît, sans bruit.
    const offertes = (g) => {
        const p = (g.params || []).find((x) => Array.isArray(x.marches) && x.marches.length);
        return (p ? p.marches : []).map((m) => m.id);
    };
    const qcm = offertes(pythonPasAPasGenerator);
    const ecrire = offertes(pythonEcrireGenerator);
    assert.equal(qcm.length + ecrire.length, ETAPES.length,
        `${qcm.length} + ${ecrire.length} marches offertes pour ${ETAPES.length} écrites`);
    assert.deepEqual([...qcm, ...ecrire].sort(), ETAPES.map((e) => e.id).sort());
    // Et aucune des deux listes ne contient une marche de l'autre bord.
    assert.deepEqual(qcm.filter((id) => ETAPES.find((e) => e.id === id).ecrire), []);
    assert.deepEqual(ecrire.filter((id) => !ETAPES.find((e) => e.id === id).ecrire), []);
});
