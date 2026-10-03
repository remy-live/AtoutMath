// RETIRER UN EXERCICE DOIT ATTEINDRE CELUI QUI EST DESSUS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « il faut vraiment que pour la séance ce soit facile d'ajouter et
// d'enlever un exercice et surtout que ça s'actualise chez un élève. »
//
// CE QUI N'ALLAIT PAS, ET QUI NE SE VOYAIT PAS. Le filtre des étapes retirées
// (`filtrerEtapes`) ne s'applique QU'À LA CONSTRUCTION du meneur. Un élève
// déjà entré gardait donc l'exercice retiré jusqu'à ce qu'il relance —
// c'est-à-dire exactement l'élève qu'on voulait débloquer, et exactement le
// moment où le professeur vient de décider que cet exercice plante.
//
// C'est le même défaut que celui corrigé pour le SAUT, un cran plus loin :
// `majBoutonPasser` n'était appelé qu'à l'ouverture d'une étape, et le
// professeur débloquait quelqu'un qui restait bloqué. On l'avait réparé pour
// `saut` et pas pour `retire`, parce que `retire` passait par un autre chemin.
//
// ON N'ARRACHE PAS L'ÉCRAN : couper quelqu'un en pleine question pour le
// ramener à la carte lui ferait perdre ce qu'il vient de taper. On lui ouvre
// la porte, tout de suite, et il la franchit quand il veut.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SRC = readFileSync(new URL('../js/core/runner.js', import.meta.url), 'utf8');

test('UN EXERCICE RETIRÉ OUVRE LE BOUTON « PASSER », TOUT DE SUITE', () => {
    const bloc = SRC.slice(SRC.indexOf('majBoutonPasser(step, annoncer'));
    assert.match(bloc.slice(0, 2200), /const retireMaintenant = !!exoId && estRetire\(exoId\);/);
    assert.match(bloc.slice(0, 2200),
        /const permis = !!exoId && \(peutSauter\(exoId\) \|\| retireMaintenant\);/,
        'le retrait vaut permission de passer, comme le saut');
});

test('ET CELA PASSE PAR L\'ÉCOUTE DE LA SÉANCE, DONC SANS RECHARGER', () => {
    // Sans cet écouteur, le bouton n'arriverait qu'à l'étape suivante — celle
    // que l'élève ne peut pas atteindre, puisqu'il est bloqué sur celle-ci.
    assert.match(SRC, /this\._surSeance = \(\) => this\.majBoutonPasser\(this\.step, true\);/);
    assert.match(SRC, /document\.addEventListener\('seance_distante', this\._surSeance\);/);
});

test('ET LA PHRASE DIT LA VÉRITÉ : RETIRÉ N\'EST PAS « TU BUTES »', () => {
    // « Ton professeur a vu que celui-ci résiste » dit à l'élève qu'on l'a vu
    // buter. Sur un exercice RETIRÉ — souvent pour toute la classe d'un coup —
    // ce serait faux, et vexant pour celui qui ne butait pas.
    const bloc = SRC.slice(SRC.indexOf('majBoutonPasser(step, annoncer'));
    const corps = bloc.slice(0, 3600);
    assert.match(corps, /vient de retirer cet exercice de la séance/);
    assert.match(corps, /if \(apparait && annoncer && !this\.essai && retireMaintenant\)/,
        'la phrase du retrait passe AVANT celle du saut');
    // Et l'une n'ajoute pas l'autre : deux avis empilés pour un seul geste.
    assert.match(corps, /Tu peux passer à la suite[\s\S]{0,260}return;/);
});

test('ET ON NE SORT PERSONNE DE FORCE DE SON EXERCICE', () => {
    // La tentation serait de refermer l'exercice. L'élève perdrait ce qu'il
    // vient de taper, et sur un retrait décidé pour TOUTE la classe, trente
    // écrans se videraient d'un coup au milieu d'une question.
    const bloc = SRC.slice(SRC.indexOf('majBoutonPasser(step, annoncer'), 
                           SRC.indexOf('passerEtape() {'));
    assert.ok(!/this\.exit\(|this\.teardownStep\(\)/.test(bloc),
        'on ouvre une porte, on ne pousse personne dehors');
});
