// LA PETITE LIGNE SOUS UNE ÉTAPE DU PARCOURS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « sur le plan ca écrite 14 q. par exemple écris 14 questions ».
// Puis, dans la foulée : « on pourrait écrire la réussite aussi non ? ».
//
// DEUX VUES MONTRAIENT LA MÊME ÉTAPE ET N'EN DISAIENT PAS LA MÊME CHOSE : la
// carte écrivait « 14 q. • 4 pts » sous ses pastilles de 124 px, la liste
// « 14 questions • sur 4 pts » sur toute la largeur. L'élève qui change de vue
// — c'est un bouton — lisait deux phrases différentes du même parcours.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sousLaPastille } from '../js/core/ligneDEtape.js';

const etape = (sur = {}) => ({ stepId: 's1', nbItems: 14, timeLimit: null, ...sur });

test('ON ÉCRIT « QUESTIONS », JAMAIS « q. »', () => {
    assert.equal(sousLaPastille(etape()), '14 questions');
    // L'abréviation ne doit revenir par aucun chemin.
    const toutes = [
        sousLaPastille(etape()),
        sousLaPastille(etape({ timeLimit: 20 })),
        sousLaPastille(etape(), { bareme: new Map([['s1', 4]]) }),
        sousLaPastille(etape(), { bareme: new Map([['s1', 4]]) }, { sur: true })
    ];
    toutes.forEach(l => assert.ok(!/\bq\./.test(l), `abréviation revenue : « ${l} »`));
});

test('UNE SEULE QUESTION NE PREND PAS DE S', () => {
    assert.equal(sousLaPastille(etape({ nbItems: 1 })), '1 question');
});

test('CE QU\'IL Y A À FAIRE : questions, chronomètre, barème', () => {
    assert.equal(
        sousLaPastille(etape({ timeLimit: 20 }), { bareme: new Map([['s1', 4]]) }),
        '14 questions • 20s • 4 pts');
    // La liste écrit « sur 4 pts » : c'est sa formulation d'origine, et elle a
    // la place. Les deux vues disent la même chose, pas forcément d'un ton
    // identique.
    assert.equal(
        sousLaPastille(etape({ timeLimit: 20 }), { bareme: new Map([['s1', 4]]) }, { sur: true }),
        '14 questions • 20s • sur 4 pts');
});

test('PAS DE POINTS HORS ÉVALUATION NOTÉE — en afficher serait mentir', () => {
    assert.equal(sousLaPastille(etape(), { bareme: new Map() }), '14 questions');
    assert.equal(sousLaPastille(etape(), {}), '14 questions');
});

test('UNE ÉTAPE TERMINÉE DIT CE QU\'IL EN A FAIT, pas ce qu\'il y avait à faire', () => {
    // RÉMY : « on pourrait écrire la réussite aussi non ? ». L'élève le sait
    // déjà, qu'il y avait quatorze questions : il vient de les faire.
    const opts = { resultats: { s1: { solved: 12, questions: 14, passed: true } } };
    assert.equal(sousLaPastille(etape(), opts), '12 sur 14');
});

test('LE NOMBRE POSÉ L\'EMPORTE SUR LE NOMBRE PRÉVU — le chronomètre peut couper', () => {
    // LE PIÈGE, ET C'EST LE MÊME QUE CELUI DU BILAN DE FIN D'ÉTAPE. Une étape
    // chronométrée s'arrête quand le temps tombe : l'élève n'a vu que huit des
    // quatorze questions. Compter sur quatorze lui ferait lire six erreurs
    // qu'il n'a pas faites.
    const opts = { resultats: { s1: { solved: 8, questions: 8, passed: true } } };
    assert.equal(sousLaPastille(etape({ nbItems: 14, timeLimit: 60 }), opts), '8 sur 8');
});

test('ET LA NOTE OBTENUE, PAS LE BARÈME — l\'épreuve a eu lieu', () => {
    // « sur 4 pts » sous une étape finie annonce une épreuve qui n'aura pas
    // lieu. On dit ce qu'elle a rapporté.
    const opts = {
        bareme: new Map([['s1', 4]]),
        resultats: { s1: { solved: 7, questions: 14, passed: true } }
    };
    assert.equal(sousLaPastille(etape(), opts), '7 sur 14 • 2 sur 4 pts');
    // ET LE CHRONOMÈTRE DISPARAÎT : une durée qui ne court plus n'apprend rien.
    assert.ok(!sousLaPastille(etape({ timeLimit: 20 }), opts).includes('20s'));
});

test('UN RÉSULTAT VIDE OU ABÎMÉ NE FAIT PAS DISPARAÎTRE LA LIGNE', () => {
    // `resultats` vient du journal, qui vient du serveur : il peut arriver
    // incomplet. Une ligne vide sous une pastille serait pire que la ligne
    // d'avant — l'élève ne saurait plus combien de questions l'attendent.
    assert.equal(sousLaPastille(etape(), { resultats: {} }), '14 questions');
    assert.equal(sousLaPastille(etape(), { resultats: { s1: {} } }), '14 questions');
    assert.equal(sousLaPastille(etape(), { resultats: { s1: { questions: 0 } } }), '14 questions');
    // Et un `solved` aberrant est ramené dans ses bornes plutôt que d'écrire
    // « 99 sur 14 ».
    assert.equal(
        sousLaPastille(etape(), { resultats: { s1: { solved: 99, questions: 14 } } }),
        '14 sur 14');
    assert.equal(
        sousLaPastille(etape(), { resultats: { s1: { solved: -3, questions: 14 } } }),
        '0 sur 14');
});

test('LES DEUX VUES APPELLENT LA MÊME FONCTION', () => {
    // LE TÉMOIN DU CORRECTIF. Deux vues qui écrivent chacune leur version de
    // la même phrase finissent toujours par en dire deux — c'est exactement
    // comme ça que « q. » a survécu à « questions ».
    const SRC = readFileSync(new URL('../js/ui/pathView.js', import.meta.url), 'utf8');
    const appels = SRC.match(/sousLaPastille\(step, opts/g) || [];
    assert.equal(appels.length, 2, `${appels.length} vue(s) passent par la fonction, il en faut 2`);
    // Et plus personne ne fabrique la phrase à la main.
    assert.ok(!/\$\{step\.nbItems\} q(uestions)?\./.test(SRC),
        'une vue réécrit la ligne dans son coin');
});
