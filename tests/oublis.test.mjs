// OUBLIER UNE SÉANCE, SUR ORDRE DU PROFESSEUR — et rien d'autre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'ai créé un élève virtuel dans la classe puis je réinitialise la
// séance depuis mon poste comme s'il ne l'avait jamais commencée ».
//
// ── POURQUOI CES ÉPREUVES-LÀ SONT LES PLUS IMPORTANTES DU LOT ─────────────
//
// C'est le SEUL endroit du logiciel qui RETIRE des événements. Partout ailleurs
// le journal ne fait qu'ajouter, et c'est ce qui rend la synchronisation
// commutative et sans arbitrage. Une erreur ici n'abîme pas un affichage : elle
// efface du travail d'élève, définitivement, sur toutes ses machines.
//
// Les trois façons de se tromper, et elles sont toutes gardées plus bas :
//   · oublier TROP — le travail d'une autre séance part avec ;
//   · oublier TROP PEU — les tentatives restent, et le carnet d'erreurs cite
//     des questions d'une séance « jamais commencée » ;
//   · oublier TROP TARD — un ordre rejoué efface ce que l'élève vient de
//     refaire.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evenementsAOublier } from '../js/core/oublis.js';
import { EventTypes } from '../js/core/journal.js';
import { readFileSync } from 'node:fs';

/** Un journal lisible : [id, type, ts, payload]. */
const ev = (id, type, ts, payload) => ({ id, type, ts, payload, synced: true });

const JOURNAL = [
    ev('a1', EventTypes.PATH_ASSIGNED, 100, { pathId: 'P1', name: 'Lundi' }),
    ev('a2', EventTypes.RUN_STARTED, 110, { runId: 'r1', pathId: 'P1' }),
    // UNE TENTATIVE NE PORTE QUE SON RUN. C'est tout le piège de ce module.
    ev('a3', EventTypes.ATTEMPT_MADE, 120, { runId: 'r1', correct: true }),
    ev('a4', EventTypes.STEP_COMPLETED, 130, { runId: 'r1', pathId: 'P1', stepId: 's1' }),
    // Une AUTRE séance, qui ne doit pas bouger d'un pouce.
    ev('b1', EventTypes.RUN_STARTED, 140, { runId: 'r2', pathId: 'P2' }),
    ev('b2', EventTypes.ATTEMPT_MADE, 150, { runId: 'r2', correct: false }),
    ev('b3', EventTypes.STEP_COMPLETED, 160, { runId: 'r2', pathId: 'P2', stepId: 's9' })
];

const pris = (set) => [...set].sort().join(',');

test('ON OUBLIE LA SÉANCE DEMANDÉE, ENTIÈRE — Y COMPRIS SES TENTATIVES', () => {
    // ─────────────────────────────────────────────────────────────────────
    // OUBLIER TROP PEU est la faute la plus facile : une tentative ne porte
    // PAS le parcours, seulement son `runId`. Un filtre écrit sur `pathId`
    // laisserait toutes les réponses de l'élève derrière lui — et son carnet
    // d'erreurs continuerait de citer des questions d'une séance qu'il n'a
    // « jamais commencée ».
    const ids = evenementsAOublier(JOURNAL, [{ pathId: 'P1', le: 200 }]);
    assert.equal(pris(ids), 'a1,a2,a3,a4');
});

test('ET L\'AUTRE SÉANCE NE BOUGE PAS D\'UN POUCE', () => {
    // OUBLIER TROP efface du travail que personne n'a demandé d'effacer, et
    // rien ne le dira : l'élève verra simplement une séance redevenue vierge.
    const ids = evenementsAOublier(JOURNAL, [{ pathId: 'P1', le: 200 }]);
    ['b1', 'b2', 'b3'].forEach(id => assert.ok(!ids.has(id), `${id} a été emporté`));
});

test('CE QUI SUIT L\'ORDRE EST GARDÉ : L\'ÉLÈVE A RECOMMENCÉ', () => {
    // ─────────────────────────────────────────────────────────────────────
    // OUBLIER TROP TARD. Le professeur remet à zéro à 9 h 10 ; l'élève
    // recommence à 9 h 12 ; l'ordre parvient à son appareil à 9 h 15 — et les
    // ordres sont RENVOYÉS À CHAQUE SYNCHRO, donc celui-ci repassera toutes
    // les dix secondes. Sans la borne de temps, chaque passage effacerait ce
    // que l'élève vient de faire, indéfiniment.
    const apres = [...JOURNAL,
        ev('c1', EventTypes.RUN_STARTED, 300, { runId: 'r3', pathId: 'P1' }),
        ev('c2', EventTypes.ATTEMPT_MADE, 310, { runId: 'r3', correct: true })];
    const ids = evenementsAOublier(apres, [{ pathId: 'P1', le: 200 }]);
    assert.equal(pris(ids), 'a1,a2,a3,a4');
    assert.ok(!ids.has('c1') && !ids.has('c2'), 'le travail refait a été effacé');
});

test('UN RUN COMMENCÉ AVANT L\'ORDRE S\'OUBLIE ENTIER, MÊME S\'IL FINIT APRÈS', () => {
    // Garder la moitié d'un run donnerait un bilan qui compte des réponses
    // sans la séance qui les a posées. On borne donc sur le DÉBUT du run.
    const aCheval = [
        ev('d1', EventTypes.RUN_STARTED, 100, { runId: 'r9', pathId: 'P1' }),
        ev('d2', EventTypes.ATTEMPT_MADE, 500, { runId: 'r9', correct: true })];
    const ids = evenementsAOublier(aCheval, [{ pathId: 'P1', le: 200 }]);
    assert.equal(pris(ids), 'd1,d2');
});

test('DEUX REMISES À ZÉRO : LA PLUS RÉCENTE L\'EMPORTE', () => {
    // Elles ne se contredisent pas — la seconde englobe la première. Prendre
    // la plus ANCIENNE laisserait le travail d'entre les deux.
    const apres = [...JOURNAL,
        ev('c1', EventTypes.RUN_STARTED, 300, { runId: 'r3', pathId: 'P1' })];
    const ids = evenementsAOublier(apres,
        [{ pathId: 'P1', le: 200 }, { pathId: 'P1', le: 400 }]);
    assert.ok(ids.has('c1'), 'la remise à zéro la plus récente n\'a pas été prise');
});

test('SANS ORDRE, ON N\'OUBLIE RIEN — ET C\'EST LE CAS DE TOUTES LES SYNCHROS', () => {
    // La synchronisation tourne toutes les dix secondes chez chaque élève.
    // C'est le chemin de loin le plus fréquenté de cette fonction.
    assert.equal(evenementsAOublier(JOURNAL, []).size, 0);
    assert.equal(evenementsAOublier(JOURNAL, null).size, 0);
    assert.equal(evenementsAOublier(JOURNAL, [{ le: 999 }]).size, 0,
        'un ordre sans parcours a emporté quelque chose');
    assert.equal(evenementsAOublier(null, [{ pathId: 'P1', le: 200 }]).size, 0);
});

test('UN PARCOURS QUE CE JOURNAL NE CONNAÎT PAS N\'EMPORTE RIEN', () => {
    // L'ordre vaut pour l'élève, pas pour l'appareil : celui-ci n'a
    // peut-être jamais vu cette séance.
    assert.equal(evenementsAOublier(JOURNAL, [{ pathId: 'INCONNU', le: 999 }]).size, 0);
});

test('LE JOURNAL NE RETIRE QUE CE QUI EST DÉJÀ POUSSÉ AU SERVEUR', () => {
    // ─────────────────────────────────────────────────────────────────────
    // LA PRÉCAUTION QUI ÉVITE DE PERDRE DU TRAVAIL. Un élève qui a travaillé
    // HORS LIGNE pendant que le professeur remettait à zéro garde ce qu'il
    // vient de faire : le serveur ne l'a pas, donc l'effacement ne pouvait pas
    // le viser. Il montera à la synchro suivante, et le professeur verra que
    // l'élève a retravaillé depuis.
    //
    // La garde vit dans `Journal.oublier` — on la lit là où elle est écrite.
    const src = readFileSync(new URL('../js/core/journal.js', import.meta.url), 'utf8');
    const f = src.slice(src.indexOf('    oublier(estAOublier)'));
    const corps = f.slice(0, f.indexOf('\n    }'));
    assert.match(corps, /filter\(e => !\(e\.synced && estAOublier\(e\)\)\)/,
        'un travail fait hors ligne serait effacé avant d\'avoir été vu');
});

// ════════════════ LA CHAÎNE, D'UN BOUT À L'AUTRE ═════════════════════════════
//
// Le geste traverse deux machines : le professeur demande, le serveur efface ET
// pose un message, l'appareil de l'élève le lit et oublie à son tour. Chaque
// maillon manquant rend le geste silencieusement inutile — et c'est le genre de
// panne qu'on ne découvre qu'en classe.

const lire = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

test('LE SERVEUR EFFACE LES ÉVÉNEMENTS, ET SEULEMENT CEUX DE CET ÉLÈVE', () => {
    const api = lire('api/index.php');
    const route = api.slice(api.indexOf("if (($body['action'] ?? '') === 'reinitialiser')"));
    const corps = route.slice(0, 2600);
    // `AND student_id = ?` EST LA SEULE CHOSE QUI COMPTE : les identifiants
    // viennent du navigateur, donc de quelqu'un.
    assert.match(corps, /DELETE FROM events WHERE student_id = \? AND id IN/,
        'un identifiant deviné effacerait le travail d\'un autre élève');
    // ON NE PEUT PAS FILTRER EN SQL : `payload` est chiffré. On passe donc par
    // les runs, et un `step_completed` ne porte pas toujours le parcours.
    assert.match(corps, /\$r\['pathId'\] \?\? null\) === \$pathId/);
    assert.match(corps, /\$parRun \|\| \$parChemin/,
        'les tentatives resteraient : elles ne portent que leur run');
    // ET L'ORDRE EST POSÉ : sans lui, l'appareil de l'élève garderait tout.
    assert.match(corps, /INSERT INTO reinitialisations/,
        'le serveur efface sa part et ne prévient pas l\'appareil de l\'élève');
});

test('ET `/sync` PORTE L\'ORDRE JUSQU\'À L\'APPAREIL DE L\'ÉLÈVE', () => {
    const api = lire('api/index.php');
    assert.match(api, /'oublis' => oublisDeLEleve\(\$student\['id'\]\)/,
        'l\'ordre n\'arrive jamais chez l\'élève');
    assert.match(api, /function oublisDeLEleve/);
    // EN MILLISECONDES, comme tout ce que le journal manipule : la base garde
    // un `datetime('now')` en UTC, le navigateur ne connaît que des
    // horodatages. Convertir ailleurs qu'ici, c'est l'oublier quelque part.
    assert.match(api, /strtotime\(\(string\) \$r\['le'\] \. ' UTC'\) \* 1000/);
    const sync = lire('js/core/sync.js');
    assert.match(sync, /appliquerLesOublis\(journal, res\.oublis\)/,
        'le navigateur reçoit l\'ordre et n\'en fait rien');
});

test('LA TABLE EXISTE, ET LA MIGRATION PARTIRA TOUTE SEULE', () => {
    // La version du schéma est CALCULÉE à partir des définitions (crc32) : une
    // table de plus change le numéro, donc `migrerSiNecessaire` migre au
    // premier appel d'API. C'est ce qui évite de redemander à Rémy d'ouvrir
    // `install.php` — l'oubli qui avait coûté une heure de cours.
    const schema = lire('api/lib/schema.php');
    assert.match(schema, /\$tables\['reinitialisations'\] = "/);
    assert.match(schema, /REFERENCES students\(id\) ON DELETE CASCADE/);
});

test('LE BOUTON EXISTE CÔTÉ PROFESSEUR, ET IL DEMANDE AVANT', () => {
    const ui = lire('js/ui/parcoursClasses.js');
    assert.match(ui, /data-reinit-eleve/, 'plus de bouton pour remettre à zéro');
    assert.match(ui, /action: 'reinitialiser'/);
    // ON DEMANDE AVANT : c'est le seul geste du logiciel qui efface du travail
    // d'élève sans corbeille derrière. LA DEMANDE EST ÉCRITE UNE FOIS, dans
    // `remettreAZero`, et les deux écrans l'appellent — deux copies auraient
    // divergé au premier garde-fou ajouté.
    const f = ui.slice(ui.indexOf('function remettreAZero'));
    assert.match(f.slice(0, 2200), /showConfirm\(/,
        'on effacerait le travail d\'un élève sur un clic');
    assert.match(f.slice(0, 2200), /ne s\\?'annule pas/);
    // LES DEUX ÉCRANS PASSENT PAR LÀ : la liste des élèves d'une classe, et le
    // bilan d'un élève. Rémy : « je ne trouve pas ta flèche qui tourne » — elle
    // n'était que dans le premier.
    assert.match(ui, /function brancherRemisesAZero/);
    assert.match(ui, /remettre\.onclick = \(\) => remettreAZero\(contexte\.eleve/,
        'le bouton du bilan d\'un élève n\'est plus branché');
    // ET LA LISTE SE RECHARGE : `classe.eleves` porte les événements d'où le
    // bilan est calculé. Les garder afficherait le travail qu'on vient
    // d'effacer, et le bouton aurait l'air de n'avoir rien fait.
    assert.match(ui.slice(ui.indexOf('function brancherRemisesAZero'), 
        ui.indexOf('function brancherRemisesAZero') + 1400), /classe\.eleves = \[\];/);
    // PAS DE FENÊTRE NATIVE — « tu utilises des alert et prompt, on évite ! ».
    assert.doesNotMatch(f.slice(0, 2600), /(^|[^.\w])(alert|confirm|prompt)\s*\(/m);
    // ET IL NE DÉPEND PAS DU BILAN : mesuré, celui-ci ne s'affiche jamais sur
    // cet écran (la route « roster » ne porte pas les événements). Le bouton
    // était gardé par une information que l'écran ne possède pas.
    assert.match(ui, /\$\{info\.seance \? `<button type="button" class="pc-remettre pc-remettre--ligne"/,
        'le bouton redépend d\'un bilan que cet écran ne sait pas calculer');
});
