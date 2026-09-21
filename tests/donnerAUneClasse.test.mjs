// COCHER LA CLASSE COCHE LES ÉLÈVES, ET L'ON PEUT DÉCOCHER.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « quand on sélectionne une classe, ça sélectionne tous les élèves et
// on peut décocher. »
//
// C'ÉTAIT L'INVERSE, ET C'ÉTAIT UN CHOIX — écrit dans le module : « cocher
// trente cases qu'on ne peut pas décocher une à une serait un mensonge poli ».
// Le raisonnement tenait à la base : une assignation vise une CLASSE ou un
// ÉLÈVE, jamais « la classe sauf lui ». Les cases étaient donc grisées.
//
// Sauf que le mensonge est venu par l'autre bout. Sur sa capture : « Toute la
// classe l'a reçu : chacun l'a déjà » écrit AU-DESSUS de quatre cases
// décochées — la phrase lisait la séance LOCALE, les cases lisaient le SERVEUR.
//
// MESURÉ contre un vrai serveur, classe de six (`tools/tmp/sondeDonner.mjs`) :
//
//                                    avant                  après
//   après avoir coché la classe      0 cochée, 6 grisées    6 cochées, 0 grisée
//   décocher un élève                impossible             5 élèves au serveur
//
// ON CONVERTIT AU MOMENT OÙ L'ON DÉCOCHE : on retire la ligne de classe et
// l'on en pose une par élève restant. La séance locale, elle, reste — vingt-huit
// sur vingt-neuf, c'est encore la séance de la classe, et c'est d'elle que vient
// le bilan.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const PC = readFileSync(new URL('../js/ui/parcoursClasses.js', import.meta.url), 'utf8');

test('LES CASES DES ÉLÈVES NE SONT PLUS GRISÉES', () => {
    // C'est la demande, en une ligne de gabarit.
    assert.ok(!/\$\{toute \? ' disabled' : ''\}/.test(PC),
        'plus de case grisée : on doit pouvoir décocher');
    assert.match(PC, /const sien = toute \|\| \(info\.nommes \|\| new Set\(\)\)\.has\(e\.id\);/);
});

test('« QUI L\'A » SE LIT AU SERVEUR, PAS DANS LA BIBLIOTHÈQUE LOCALE', () => {
    // La capture de Rémy montrait les deux sources en désaccord dans le même
    // cadre. `info.donnee` dit ce que le professeur a rangé chez lui ;
    // `classesServies` dit ce que le serveur distribue. Pour savoir qui a le
    // travail, il faut demander à qui le donne.
    assert.match(PC, /let classesServies = new Set\(\);/);
    assert.match(PC, /classesServies = new Set\(\(d\.classes \|\| \[\]\)\.map\(c => c\.id\)\);/);
    assert.match(PC, /info\.servieAuServeur = classesServies\.has\(classe\.id\);/);
    assert.match(PC, /const toute = info\.servieAuServeur;/);
});

test('DÉCOCHER UN ÉLÈVE CONVERTIT L\'ASSIGNATION', () => {
    // La base ne sait pas écrire « la classe sauf lui » : on retire la ligne de
    // classe et l'on en pose une par élève restant.
    assert.match(PC, /async function convertirEnNominatif\(classe, exclu\)/);
    assert.match(PC, /const autres = \(classe\.eleves \|\| \[\]\)\.filter\(e => e\.id !== exclu\);/);
    assert.match(PC, /await retirerDuServeur\(parcours, classe\.id\);/);
    // Et le choix du chemin : classe servie → conversion, sinon retrait simple.
    assert.match(PC, /classesServies\.has\(classe\.id\)\s*\n\s*\? await convertirEnNominatif\(classe, id\)/);
});

test('UN PAR UN, ET NON EN PARALLÈLE — C\'EST MESURÉ, PAS SUPPOSÉ', () => {
    // J'avais écrit un `Promise.all`, pour ne pas faire attendre. MESURÉ contre
    // un vrai serveur sur une classe de six : cinq assignations lancées
    // ensemble en posaient 4, puis 2, puis 4 — et sans jamais rendre d'erreur.
    // Chaque appel MONTE le parcours avant d'assigner, et cinq montées
    // simultanées du même parcours se marchent dessus.
    //
    // Un résultat qui change d'une fois sur l'autre est un résultat faux. Ce
    // test garde la boucle séquentielle, parce qu'un `Promise.all` se remet
    // tout seul le jour où quelqu'un trouve que c'est lent.
    assert.ok(!/Promise\.all\(autres\.map/.test(PC),
        'les assignations se posent une à une : en parallèle, elles se perdent');
    assert.match(PC, /for \(const e of autres\) \{\s*\n\s*const un = await donnerAuServeur/);
});

test('ON DIT CE QUI N\'EST PAS PARTI', () => {
    // Un « c'est fait » sur vingt-huit réussites et deux échecs est exactement
    // le mensonge qu'on passe ses journées à débusquer.
    assert.match(PC, /let rates = 0;/);
    assert.match(PC, /if \(un && un\.erreur\) rates\+\+;/);
    assert.match(PC, /n'\$\{rates > 1 \? 'ont' : 'a'\} pas `/);
});

test('APRÈS CHAQUE GESTE, ON RELIT LE SERVEUR', () => {
    // La conversion vient de poser vingt-huit lignes et d'en retirer une :
    // deviner cet état de tête, ce serait recommencer l'incohérence qu'on
    // corrige. Des deux côtés — la case d'un élève ET celle de la classe.
    const casesEleves = PC.slice(PC.indexOf('function brancherLesCasesEleves'));
    assert.match(casesEleves.slice(0, 2500), /await relireLesNommes\(\);/);
    const basculer = PC.slice(PC.indexOf('async function basculer'),
        PC.indexOf('async function basculer') + 4200);
    assert.match(basculer, /await relireLesNommes\(\);\s*\n\s*dessiner\(\);/);
});

test('LA PHRASE DIT COMBIEN, ET NE PROMET PLUS « CHACUN L\'A DÉJÀ »', () => {
    assert.ok(!/chacun l\\'a déjà/.test(PC), 'la phrase qui contredisait les cases');
    assert.match(PC, /Toute la classe l\\'a reçu\. '\s*\n\s*\+ 'Décochez ceux à qui vous ne le donnez pas\./);
    assert.match(PC, /élève\$\{combien > 1 \? 's' : ''\} sur `/);
});
