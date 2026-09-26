// L'AVANCEMENT — où en est un élève dans sa séance.
//
// Rémy : « surtout il faut que la séance soit facilement visible l'avancement »,
// et avant cela : « je ne peux pas avoir un aperçu en temps réel de la
// progression des élèves ».
//
// CE QUI SE VÉRIFIE ICI N'EST PAS LA BARRE, C'EST CE QU'ELLE PROMET.
//
// Une barre de progression est une promesse arithmétique : « tu as fait cette
// fraction-là du travail ». Une barre qui dépasse, qui recule, ou qui donne le
// plus avancé à celui qui s'est le plus trompé, est pire que pas de barre — le
// professeur cesse d'y croire, et il a raison. Les trois pièges sont éprouvés
// un par un.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    avancementDuRun, avancementDeClasse, questionsPosees, enBref, depuisCombien
} from '../js/core/avancement.js';

const T0 = 1_700_000_000_000;

const plan = (n, questions = 10) => Array.from({ length: n }, (_, i) => ({
    rang: i, stepId: 'sc_' + i, titre: 'Étape ' + (i + 1), questions, requis: Math.ceil(questions * 0.7)
}));

const essai = (stepId, i, correct = true, extra = {}) => ({
    stepId, itemSeed: stepId + ':' + i, correct, attemptIndex: 0, ...extra
});

const unRun = (o = {}) => ({
    runId: 'r1', pathId: 'p1', pathName: 'Devoir du mardi',
    startedAt: T0, finishedAt: null, aborted: false,
    plan: plan(o.etapes ?? 5), stepCount: o.etapes ?? 5,
    steps: o.steps || [], attempts: o.attempts || [],
    ...o
});

const etapeFinie = (i, questions = 10, solved = 8) => ({
    stepId: 'sc_' + i, title: 'Étape ' + (i + 1), questions, solved, required: 7, passed: solved >= 7
});

// ────────────────────────────────────── COMPTER DES QUESTIONS, PAS DES CLICS ──

test('UNE QUESTION RETENTÉE RESTE UNE QUESTION', () => {
    // Le piège : compter les tentatives. L'élève qui se trompe deux fois par
    // question paraîtrait DEUX FOIS PLUS AVANCÉ que celui qui réussit du
    // premier coup — l'exact contraire de ce que la barre doit montrer.
    const t = [
        essai('sc_0', 1, false),
        { stepId: 'sc_0', itemSeed: 'sc_0:1', correct: true, attemptIndex: 1 },
        essai('sc_0', 2, true)
    ];
    assert.equal(questionsPosees(t), 2);
});

test('les tentatives « partiel » d\'une opération posée ne comptent pas', () => {
    // Une soustraction posée écrit une tentative PAR CHIFFRE : elles nourrissent
    // le carnet d'erreurs, jamais le compteur de questions.
    const t = [
        essai('sc_0', 1),
        { stepId: 'sc_0', itemSeed: 'sc_0:1:u', correct: true, partiel: true },
        { stepId: 'sc_0', itemSeed: 'sc_0:1:d', correct: true, partiel: true }
    ];
    assert.equal(questionsPosees(t), 1);
});

test('un jeu sans graine se compte quand même, sur le premier essai', () => {
    // Nova, le labyrinthe, Tetris : pas de session d'items, donc pas
    // d'`itemSeed`. Ne rien compter ferait une barre immobile pendant dix
    // minutes de jeu.
    const t = [
        { correct: true, attemptIndex: 0 }, { correct: false, attemptIndex: 0 },
        { correct: true, attemptIndex: 1 }
    ];
    assert.equal(questionsPosees(t), 2);
});

// ───────────────────────────────────────────────────────── LA FRACTION ───────

test('LA BARRE NE DÉPASSE JAMAIS, MÊME SI L\'ÉLÈVE EN FAIT PLUS QUE PRÉVU', () => {
    // Un exercice à seuil laisse répondre au-delà du compte : quinze questions
    // sur dix prévues donneraient 150 %.
    const run = unRun({
        etapes: 1,
        attempts: Array.from({ length: 15 }, (_, i) => essai('sc_0', i))
    });
    const a = avancementDuRun(run, T0 + 60_000);
    assert.ok(a.fraction <= 1, 'fraction = ' + a.fraction);
});

test('UNE BARRE PLEINE VEUT DIRE FINI, ET RIEN D\'AUTRE', () => {
    // Le cas COURANT, pas un cas limite : une étape se valide dès son seuil, un
    // parcours se termine donc presque toujours en moins de questions que
    // prévu. Compté bêtement, un devoir terminé afficherait « 72 % » — et
    // l'élève irait se plaindre d'un travail qu'il a pourtant rendu entier.
    const run = unRun({
        etapes: 5,
        steps: [0, 1, 2, 3, 4].map(i => etapeFinie(i, 7, 7)),
        finishedAt: T0 + 600_000
    });
    const a = avancementDuRun(run, T0 + 600_000);
    assert.equal(a.etat, 'fini');
    assert.equal(a.fraction, 1);
});

test('on compte en QUESTIONS, pas en étapes — et ce n\'est pas cosmétique', () => {
    // Deux étapes, l'une de vingt questions, l'autre de trois. Comptée en
    // étapes, la barre reste à zéro pendant dix-neuf questions puis saute à la
    // moitié : l'élève le plus courageux est celui qui paraît ne rien faire.
    const run = unRun({
        plan: [
            { rang: 0, stepId: 'sc_0', titre: 'Longue', questions: 20, requis: 14 },
            { rang: 1, stepId: 'sc_1', titre: 'Courte', questions: 3, requis: 2 }
        ],
        stepCount: 2,
        attempts: Array.from({ length: 19 }, (_, i) => essai('sc_0', i))
    });
    const a = avancementDuRun(run, T0);
    assert.equal(a.prevues, 23);
    assert.equal(a.questions, 19);
    assert.ok(a.fraction > 0.8, 'fraction = ' + a.fraction);
});

test('sans plan, on répond en étapes plutôt que de ne rien dire', () => {
    // Un run tronqué par la limite de lecture du serveur arrive sans son
    // `run_started`. Moins précis, pas faux.
    const run = unRun({ plan: [], stepCount: 4, steps: [etapeFinie(0), etapeFinie(1)] });
    const a = avancementDuRun(run, T0);
    assert.equal(a.etapes, 4);
    assert.equal(a.faites, 2);
    assert.equal(a.prevues, 0);
    assert.equal(a.fraction, 0.5);
});

// ──────────────────────────────────────────────────── OÙ EN EST-IL ? ─────────

test('l\'étape en cours est celle qui SUIT les étapes terminées', () => {
    const run = unRun({
        steps: [etapeFinie(0), etapeFinie(1)],
        attempts: [...Array.from({ length: 20 }, (_, i) => essai('sc_' + (i % 2), i)),
                   essai('sc_2', 0), essai('sc_2', 1, false)]
    });
    const a = avancementDuRun(run, T0);
    assert.equal(a.faites, 2);
    assert.equal(a.etapeEnCours.rang, 2);
    assert.equal(a.etapeEnCours.titre, 'Étape 3');
    assert.equal(a.etapeEnCours.posees, 2, 'les questions des étapes closes ne recomptent pas');
    assert.equal(a.etapeEnCours.justes, 1);
});

test('LES QUESTIONS DES ÉTAPES CLOSES NE SE RECOMPTENT PAS', () => {
    // Le piège : un élève qui recommence une étape verrait son avancement
    // enfler sans rien faire de neuf. On lit le décompte que le meneur a
    // arrêté en fermant l'étape, pas les tentatives qui traînent.
    const run = unRun({
        steps: [etapeFinie(0, 10, 9)],
        attempts: Array.from({ length: 10 }, (_, i) => essai('sc_0', i))
    });
    const a = avancementDuRun(run, T0);
    assert.equal(a.questions, 10);
    assert.equal(a.justes, 9);
});

test('une étape ratée est faite sans être réussie', () => {
    // La distinction porte : Rémy veut savoir qui AVANCE et qui RÉUSSIT, et ce
    // ne sont pas les mêmes élèves.
    const run = unRun({ steps: [etapeFinie(0, 10, 9), etapeFinie(1, 10, 2)] });
    const a = avancementDuRun(run, T0);
    assert.equal(a.faites, 2);
    assert.equal(a.reussies, 1);
});

test('un parcours quitté en route se voit, et il ne se voit pas comme fini', () => {
    const run = unRun({ steps: [etapeFinie(0)], finishedAt: T0 + 120_000, aborted: true });
    const a = avancementDuRun(run, T0 + 120_000);
    assert.equal(a.etat, 'abandonne');
    assert.ok(a.fraction < 1);
    assert.match(enBref(a), /Arrêté à l'étape 2 sur 5/);
});

// ───────────────────────────────────────────────────────── LA PHRASE ─────────

test('la phrase dit une chose, et c\'est celle qu\'on cherche', () => {
    const run = unRun({ steps: [etapeFinie(0)], attempts: [essai('sc_1', 0), essai('sc_1', 1)] });
    assert.equal(enBref(avancementDuRun(run, T0)), 'Étape 2 sur 5 — 2 / 10');
    assert.equal(enBref(null), 'Pas commencé');
});

test('« 4 min » et « 1 h 05 », jamais « 3847 secondes »', () => {
    assert.equal(depuisCombien(10), 'à l\'instant');
    assert.equal(depuisCombien(240), '4 min');
    assert.equal(depuisCombien(3900), '1 h 05');
});

// ───────────────────────────────────────────────────── TOUTE LA CLASSE ───────

test('LA CLASSE : CE QUI DÉCIDE EST COMBIEN N\'ONT PAS COMMENCÉ', () => {
    const fini = avancementDuRun(unRun({
        etapes: 2, steps: [etapeFinie(0), etapeFinie(1)], finishedAt: T0 + 1
    }), T0 + 1);
    const enCours = avancementDuRun(unRun({
        etapes: 2, attempts: Array.from({ length: 5 }, (_, i) => essai('sc_0', i))
    }), T0);
    const c = avancementDeClasse([fini, enCours, null, null]);
    assert.equal(c.combien, 4);
    assert.equal(c.finis, 1);
    assert.equal(c.enCours, 1);
    assert.equal(c.pasCommence, 2);
});

test('UNE CLASSE DONT LA MOITIÉ N\'A PAS COMMENCÉ N\'EST PAS À MI-PARCOURS', () => {
    // Le piège de la moyenne : ne moyenner que ceux qui travaillent donnerait
    // 100 % à une classe où un seul élève a fini et vingt-neuf n'ont rien
    // ouvert. C'est le chiffre que Rémy regarderait pour décider de passer à la
    // suite, et il l'enverrait dans le mur.
    const fini = avancementDuRun(unRun({
        etapes: 1, steps: [etapeFinie(0)], finishedAt: T0 + 1
    }), T0 + 1);
    const c = avancementDeClasse([fini, null]);
    assert.equal(c.fraction, 0.5);
    assert.equal(avancementDeClasse([]).fraction, 0);
});

// ──────────────── REPRENDRE UNE SÉANCE : LE COMPTE NE REPART PAS À ZÉRO ──────
//
// Rémy : « quand je clique sur un élève qui a déjà fait 3 exercices, j'ai
// Étape 1/12 […] je redémarre au 3 et lui me dit étape 1/12 ».
//
// REPRENDRE OUVRE UN RUN NEUF, avec un identifiant neuf et aucune étape close à
// son actif. L'élève, lui, reprend bien à la bonne étape : le parcours assigné
// garde ses étapes validées d'une fois sur l'autre. Le défaut était donc dans
// ce qu'on RACONTE, pas dans ce qu'on fait — et c'est le pire des deux, parce
// qu'on décide sur ce qu'on lit.

const planDeDouze = Array.from({ length: 12 }, (_, i) => ({
    stepId: 'sc_' + i, titre: 'Étape ' + (i + 1), questions: 10, requis: 7
}));

const runRepris = (deja, steps = [], attempts = []) => ({
    runId: 'r2', pathId: 'p1', pathName: 'Devoir du mardi',
    plan: planDeDouze, stepCount: 12, dejaFaites: deja,
    startedAt: 1000, finishedAt: null, aborted: false,
    steps, attempts
});

test('TROIS EXERCICES FAITS, PUIS REPRIS : ON EST À L\'ÉTAPE 4, PAS À LA 1', () => {
    const a = avancementDuRun(runRepris(['sc_0', 'sc_1', 'sc_2']), 2000);
    assert.equal(a.faites, 3, 'trois étapes derrière lui');
    assert.equal(a.etapes, 12);
    // `rang` compte les étapes closes : la courante est la quatrième.
    assert.equal(a.etapeEnCours.rang, 3);
    assert.equal(a.etapeEnCours.titre, 'Étape 4');
});

test('LES CASES DÉJÀ FAITES SONT PLEINES, pas vides', () => {
    // Une étape retenue dans `completed` est une étape VALIDÉE : la montrer
    // « à venir » ferait croire à l'élève qu'il doit la refaire.
    const a = avancementDuRun(runRepris(['sc_0', 'sc_1', 'sc_2']), 2000);
    assert.deepEqual(a.detailEtapes, [true, true, true]);
    assert.equal(a.reussies, 3);
});

test('ET LA BARRE NE REPART PAS À ZÉRO', () => {
    // Trente questions répondues sur cent vingt : un quart. Avant, la barre
    // d'un élève qui reprenait se vidait sous ses yeux.
    const a = avancementDuRun(runRepris(['sc_0', 'sc_1', 'sc_2']), 2000);
    assert.equal(a.prevues, 120);
    assert.equal(a.questions, 30);
    assert.equal(a.fraction, 0.25);
});

test('ON NE COMPTE PAS DEUX FOIS UNE ÉTAPE REPRISE ET REFERMÉE', () => {
    // Elle apparaît dans les deux listes — celle du départ et celle de ce
    // run — et c'est l'identifiant qui tranche. Sans cela, un parcours de
    // douze étapes en afficherait treize faites.
    const a = avancementDuRun(runRepris(['sc_0', 'sc_1'], [
        { stepId: 'sc_1', questions: 10, solved: 9, passed: true }
    ]), 2000);
    assert.equal(a.faites, 2, 'deux, et non trois');
    assert.equal(a.detailEtapes.length, 2);
});

test('un run sans point de départ se comporte comme avant', () => {
    // La compatibilité compte : les runs déjà enregistrés n'ont pas ce champ,
    // et ils doivent continuer de se lire exactement pareil.
    const a = avancementDuRun(runRepris(undefined), 2000);
    assert.equal(a.faites, 0);
    assert.equal(a.etapeEnCours.rang, 0);
    assert.deepEqual(a.detailEtapes, []);
});
