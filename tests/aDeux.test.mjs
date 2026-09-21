// « À DEUX » POSAIT DEUX QUESTIONS À LA FOIS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// L'INCOHÉRENCE MESURÉE : la marque `deuxJoueurs` était posée sur cinq
// exercices, dont TROIS se jouent très bien tout seul — la pipopipette, le
// Puissance 4 et le Sim sont réglés sur « une partie contre l'ordinateur ». Et
// l'othello, les dames et les échecs, qui ont exactement le même réglage
// (`mode` : ia / deux / exercice), ne la portaient pas. Six jeux identiques,
// trois marqués, trois non.
//
// LA CAUSE N'ÉTAIT PAS UNE ÉTOURDERIE : la marque répondait à deux questions.
//
//   · « mon élève est seul devant l'écran — peut-il l'ouvrir ? »  → interdit
//   · « je cherche une activité pour un binôme — laquelle ? »     → propose
//
// Elles ne portent pas sur les mêmes exercices. Une marque unique devait donc
// se tromper sur l'une des deux, et elle se trompait sur les deux à la fois :
// `mesExercicesUI` retirait le Puissance 4 des récompenses d'un élève seul, qui
// pouvait parfaitement y jouer, tandis que le filtre du catalogue cachait les
// échecs à un professeur qui cherchait un jeu pour deux.
//
// LA SECONDE SE DÉDUIT, et c'est ce qui l'empêche de dériver : l'exercice qui
// offre « une partie à deux sur le même écran » dans son réglage `mode` se joue
// à deux. Mesuré : exactement les six jeux de plateau, sans liste à tenir.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { exercices, estADeux, seJoueAussiADeux, paramSchemaOf } from '../js/data/catalog.js';
import '../js/core/activities/index.js';
import { readFileSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const ids = (f) => exercices.filter(f).map(e => e.id).sort();

test('IL FAUT ÊTRE DEUX : seulement ceux qui ne savent rien faire d\'autre', () => {
    assert.deepEqual(ids(e => estADeux(e)), ['calc-arpenteurs', 'calc-duel']);
    // Ces deux-là n'ont même pas de réglage `mode` : il n'y a rien à choisir.
    for (const id of ['calc-arpenteurs', 'calc-duel']) {
        const exo = exercices.find(e => e.id === id);
        assert.ok(!(paramSchemaOf(exo) || []).some(p => p.id === 'mode'),
            `${id} ne doit pas avoir de réglage « mode » — sinon il est du second lot`);
    }
});

test('IL PEUT SE JOUER À DEUX : les six jeux de plateau, et eux seuls', () => {
    assert.deepEqual(ids(e => seJoueAussiADeux(e) && !estADeux(e)),
        ['logi-dames', 'logi-echecs', 'logi-othello', 'logi-pipopipette',
            'logi-puissance4', 'logi-sim']);
});

test('LA SECONDE MARQUE SE DÉDUIT, ELLE NE SE TIENT PAS', () => {
    // Une liste écrite à la main est exactement ce qui a produit
    // l'incohérence : trois marqués, trois oubliés. Celle-ci se relit dans le
    // réglage de l'exercice, donc un septième jeu de plateau sera marqué le
    // jour où on l'écrira, sans que personne y pense.
    const offrentDeux = ids(e => (paramSchemaOf(e) || []).some(p =>
        p.id === 'mode' && (p.options || []).some(o => o.value === 'deux')));
    assert.deepEqual(ids(e => seJoueAussiADeux(e) && !e.deuxJoueurs), offrentDeux);
    // Et le catalogue ne porte plus la marque en dur que sur les deux vrais.
    assert.deepEqual(ids(e => e.deuxJoueurs), ['calc-arpenteurs', 'calc-duel']);
});

test('RÉGLÉ SUR « À DEUX », IL FAUT ALORS ÊTRE DEUX', () => {
    // C'est le professeur qui décide, dans l'étape. Un Puissance 4 réglé sur
    // « à deux sur le même écran » demande bien deux élèves — et c'est l'étape
    // qui le dit, pas le catalogue.
    assert.equal(estADeux('logi-puissance4'), false, 'au catalogue : contre l\'ordinateur');
    assert.equal(estADeux('logi-puissance4', { mode: 'deux' }), true);
    assert.equal(estADeux('logi-puissance4', { mode: 'ia' }), false);
    assert.equal(estADeux('logi-echecs', { mode: 'exercice' }), false);
});

test('CHAQUE ENDROIT POSE LA QUESTION QUI EST LA SIENNE', () => {
    const nav = lire('js/ui/navigation.js');
    // Le filtre et le compteur du catalogue servent le professeur qui cherche
    // une activité de binôme : ils montrent les huit.
    assert.match(nav, /list = list\.filter\(e => seJoueAussiADeux\(e\)\);/);
    assert.match(nav, /\.filter\(e => seJoueAussiADeux\(e\)\)\.length;/);
    // La pastille, elle, distingue : l'élève seul doit savoir ce qu'il ne peut
    // pas ouvrir.
    assert.match(nav, /tag-duo--aussi/);

    // La recherche sert la même question que le filtre.
    const rech = lire('js/ui/rechercheUI.js');
    assert.match(rech, /seJoueAussiADeux\(exo\) \? 'deux joueurs duo a deux' : ''/);
    assert.match(rech, /duo: seJoueAussiADeux\(exo\)/);

    // Les récompenses d'un élève SEUL posent l'autre question : ce qu'il peut
    // ouvrir. Les six jeux de plateau y entrent désormais.
    const mes = lire('js/ui/mesExercicesUI.js');
    assert.match(mes, /estJeuCatalogue\(e\) && !estADeux\(e\)/);
});

test('UN ÉLÈVE SEUL NE SE VOIT PLUS REFUSER SIX JEUX', () => {
    // Le gain concret, et il se compte : six récompenses de plus, et aucune
    // qu'il ne puisse ouvrir — elles sont toutes réglées sur « contre
    // l'ordinateur » au catalogue.
    const pourUnSeul = exercices.filter(e => !estADeux(e));
    assert.equal(pourUnSeul.length, exercices.length - 2);
    for (const id of ['logi-puissance4', 'logi-sim', 'logi-pipopipette']) {
        const exo = exercices.find(e => e.id === id);
        assert.equal(exo.params.mode, 'ia',
            `${id} est réglé contre l'ordinateur : un élève seul le joue`);
    }
});
