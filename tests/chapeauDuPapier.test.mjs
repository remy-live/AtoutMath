// LE CHAPEAU DES ANGLES ARRIVE JUSQU'À LA FEUILLE IMPRIMÉE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 19 novembre : « on met des accents circonflexes sur les angles ». Puis,
// quand je lui ai dit que le PDF ne savait pas composer et qu'il faudrait
// embarquer une police : « tu me fais les deux ».
//
// ── CE QUI SE GARDE ICI, ET POURQUOI AUCUNE AUTRE ÉPREUVE NE LE DIT ──────
//
// `tests/caracteresDuPapier.test.mjs` vérifie que rien ne sort en « ? » sur
// la feuille. Il a d'ailleurs attrapé le premier jet, et c'est lui qui m'a
// appris le problème. Mais il ne sait pas dire que le chapeau est ARRIVÉ :
// l'effacer purement et simplement le rendait vert aussi, et c'est ce que
// j'avais fait la veille.
//
// TROIS CHOSES, DONC, ET LA TROISIÈME EST UNE RÉGRESSION QUE J'AI VRAIMENT
// FAITE :
//
//   1. le diacritique traverse `pourPdf` au lieu d'être remplacé par « ? » ;
//   2. une majuscule à chapeau PRÉCOMPOSÉE le traverse aussi — sept des douze
//      (Ĉ Ĝ Ĥ Ĵ Ŝ Ŵ Ŷ) n'existent pas dans le jeu de caractères des polices
//      standard d'un PDF, et « Ŝ » sortait en « ? » : la feuille disait « On
//      connaît l'angle ? ». Vu sur la feuille rendue, pas déduit ;
//   3. le français, lui, n'est pas touché : « Île » garde son Î.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pourPdf, ECRITS } from '../js/ui/ficheRendu.js';
import { avecChapeau } from '../js/core/trigonometrie.js';

const CHAPEAU = '̂';

test('LE DIACRITIQUE ARRIVE SUR LA FEUILLE, il n’est pas remplacé par « ? »', () => {
    const t = pourPdf(`sin(${avecChapeau('B')}) = AB / AC`);
    assert.ok(t.includes(CHAPEAU), `le chapeau a disparu : « ${t} »`);
    assert.ok(!t.includes('?'), `quelque chose sort en « ? » : « ${t} »`);
});

test('ET LES VINGT-SIX LETTRES Y ONT DROIT', () => {
    // Sept des douze majuscules à chapeau précomposé ne sont pas dans le jeu
    // de caractères du PDF. Si `avecChapeau` revenait à normaliser en NFC —
    // ce qu'il faisait, et ce qui semblait propre —, ces sept-là ressortiraient
    // en « ? » sans qu'aucune autre épreuve ne le dise.
    for (const lettre of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
        const t = pourPdf(`l’angle ${avecChapeau(lettre)} mesure 30°`);
        assert.ok(!t.includes('?'),
            `la lettre ${lettre} chapeautée sort en « ? » : « ${t} »`);
        assert.ok(t.includes(CHAPEAU),
            `la lettre ${lettre} perd son chapeau : « ${t} »`);
    }
});

test('LE DIACRITIQUE EMPRUNTE LE CHEMIN QUI SAIT LE DESSINER', () => {
    // `ECRITS` décide si une ligne passe par `ecrireSymboles` — celui qui
    // dessine — ou par le chemin rapide de jsPDF, qui ne sait pas. Sans le
    // diacritique dans ce motif, « sin(B̂) » passait tout droit.
    assert.ok(ECRITS.test(CHAPEAU), 'le chapeau ne déclenche pas le tracé');
    // Et les douze précomposées aussi, sans quoi « Î » sortirait du glyphe de
    // la police tandis que « M̂ » serait dessiné : deux écritures du même objet
    // sur la même page. Vu sur la feuille rendue.
    for (const c of 'ÂĈÊĜĤÎĴÔŜÛŴŶ') {
        assert.ok(ECRITS.test(c), `${c} ne déclenche pas le tracé`);
    }
});

test('LE FRANÇAIS N’EST PAS UN ANGLE', () => {
    // Un nom d’angle est une majuscule SEULE. « Île » et « Êtes-vous » sont des
    // mots : leur accent reste celui de la police, et surtout rien n’y est
    // remplacé par « ? ».
    for (const mot of ['Île-de-France', 'Êtes-vous prêt ?', 'Ôte ton manteau']) {
        const t = pourPdf(mot);
        assert.ok(!t.replace(/\?$/, '').includes('?'),
            `« ${mot} » s’abîme sur la feuille : « ${t} »`);
        assert.ok(!t.includes(CHAPEAU),
            `« ${mot} » n’a aucune raison de porter un diacritique combinant`);
    }
});

test('UN ANGLE S’ÉCRIT D’UNE SEULE FAÇON DANS TOUT LE LOGICIEL', () => {
    // Deux écritures d’un même angle — précomposée ici, décomposée là — feraient
    // échouer la moindre comparaison de chaînes, et le carnet d’erreurs les
    // compterait comme deux fautes différentes. On garde donc TOUJOURS la forme
    // décomposée, pour les vingt-six.
    for (const lettre of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
        const a = avecChapeau(lettre);
        assert.equal(a.length, 2, `${lettre} ne s’écrit pas en deux caractères : ${[...a].length}`);
        assert.equal(a[1], CHAPEAU);
        assert.equal(a, a.normalize('NFD'), `${lettre} n’est pas sous forme décomposée`);
    }
});
