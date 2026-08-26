// ON RÈGLE LA FEUILLE SUR LA FEUILLE.
//
// Rémy : « on pourrait améliorer cela en passant par l'apercu plutôt que des
// options j'ai l'impression que pour la fiche de parcours on fait des
// doublons ».
//
// Le doublon n'était pas entre deux panneaux : il était entre le panneau et la
// FEUILLE. Ces tests gardent les deux bouts de la correction — l'aperçu porte
// bien les prises qu'il faut pour qu'on puisse toucher ce qu'on voit, et le
// PDF, lui, n'en sait rien : il ne doit jamais imprimer un placeholder ni un
// fantôme.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import './helpers.mjs';
import { apercuEntete, CHAMPS_ENTETE, CHAMPS_DEFAUT } from '../js/ui/ficheRendu.js';

const PAGE = { w: 297, h: 210, marge: 9, enteteH: 17, piedH: 6 };
const K = 2.4;
const fsLire = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

test('chaque champ d\'identité se nomme, pour qu\'on puisse le cliquer', () => {
    const html = apercuEntete(K, 'Contrôle', '', null, PAGE, { champs: ['nom', 'classe'] });
    assert.match(html, /data-fiche="champ"\s+data-champ="nom"/);
    assert.match(html, /data-fiche="champ"\s+data-champ="classe"/);
    assert.doesNotMatch(html, /data-champ="date"/, 'un champ non demandé ne se dessine pas');
    assert.doesNotMatch(html, /data-champ="prenom"/);
});

test('le titre porte sa prise, et sa place quand il est vide', () => {
    const ecrit = apercuEntete(K, 'Interro n°7', '', null, PAGE);
    assert.match(ecrit, /data-fiche="titre"/);
    assert.match(ecrit, /Interro n°7/);
    assert.doesNotMatch(ecrit, /fp-entete--vide/);

    // UN TITRE VIDE GARDE SA LIGNE, en gris : c'est la seule façon de savoir
    // qu'on peut en écrire un. Le CSS ne le montre que là où quelqu'un écoute,
    // et le PDF ne le connaît pas — il a son propre chemin.
    const vide = apercuEntete(K, '', '', null, PAGE);
    assert.match(vide, /fp-entete--vide/);
    assert.match(vide, /Titre de la feuille/);
});

test('la ligne d\'identité existe toujours : c\'est là que se posent les fantômes', () => {
    // Même sans aucun champ — sinon on n'aurait nulle part où proposer de les
    // remettre, et le réglage deviendrait irréversible.
    const html = apercuEntete(K, 'X', '', null, PAGE, { champs: [] });
    assert.match(html, /data-fiche="identite"/);
    assert.match(html, /fp-identite--vide/, 'sans champ, le filet remonte : la ligne suit');
});

test('les deux cases du cartouche se nomment séparément', () => {
    const html = apercuEntete(K, 'X', '', { note: true, commentaire: true, sur: 15 }, PAGE);
    assert.match(html, /data-fiche="cartouche"\s+data-case="note"/);
    assert.match(html, /data-fiche="cartouche"\s+data-case="commentaire"/);
    assert.match(html, /… \/ 15/, 'la note sur combien vient du parcours');

    const seule = apercuEntete(K, 'X', '', { note: true, commentaire: false, sur: 20 }, PAGE);
    assert.match(seule, /data-case="note"/);
    assert.doesNotMatch(seule, /data-case="commentaire"/);
});

test('un titre reste échappé : on l\'écrit à la main sur la feuille', () => {
    const html = apercuEntete(K, '<script>alert(1)</script>', '', null, PAGE);
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /&lt;script&gt;/);
});

test('les champs par défaut sont ceux qu\'on met sur une feuille de classe', () => {
    assert.deepEqual(CHAMPS_DEFAUT, ['nom', 'date']);
    assert.deepEqual(Object.keys(CHAMPS_ENTETE), ['nom', 'prenom', 'classe', 'date']);
    // Sans réglage, la feuille porte les deux : c'est ce qu'on écrit en haut
    // d'une copie depuis toujours.
    const html = apercuEntete(K, 'X', '', null, PAGE);
    assert.match(html, /data-champ="nom"/);
    assert.match(html, /data-champ="date"/);
});

test('LES SEPT COMMANDES ONT BIEN QUITTÉ LE PANNEAU DU PARCOURS', () => {
    // Le titre, les quatre champs d'identité, la case note et la case
    // commentaire se règlent sur la feuille. Les retrouver ici voudrait dire
    // qu'on a remis le doublon.
    const src = fsLire('../js/ui/printParcours.js');
    ['pp-titre', 'pp-c-nom', 'pp-c-prenom', 'pp-c-classe', 'pp-c-date', 'pp-c-note', 'pp-c-com']
        .forEach(id => assert.doesNotMatch(src, new RegExp(`id="${id}"`),
            `« ${id} » est revenu dans le panneau`));
    // Et ce qui reste, ce sont bien les choses qu'on ne peut PAS cliquer,
    // parce qu'elles ne sont pas dessinées sur la feuille.
    ['pp-orientation', 'pp-couleur', 'pp-champs', 'pp-sol-ou'].forEach(id =>
        assert.match(src, new RegExp(`id="${id}"`), `« ${id} » a disparu par erreur`));
    assert.match(src, /brancherFicheDirecte/);
});

test('LE PARCOURS DICTE SES RÉGLAGES À SA FICHE', () => {
    // L'autre doublon, et le plus coûteux : le professeur réglait son parcours
    // en « Évaluation », noté sur 20, et la fiche rouvrait le débat avec ses
    // propres défauts — un contrôle s'imprimait en fiche d'entraînement à
    // moins d'y repenser.
    const src = fsLire('../js/ui/printParcours.js');
    assert.match(src, /resolvePolicy\(chemin\.policy\)/);
    assert.match(src, /interro\.checked = politique\.mode === MODES\.EVALUATION/);
    assert.match(src, /politique\.grading\.scale/);
});


