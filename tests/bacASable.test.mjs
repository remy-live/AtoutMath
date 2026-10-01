// LE BAC À SABLE — ce qu'on fait quand on a fini avant les autres.
//
// Rémy : « un élève qui a fini peut avoir une zone bac à sable avec des jeux ».
//
// CE QUI SE VÉRIFIE ICI EST LA PORTE, PAS LES JEUX.
//
// Un bac à sable trop facile à ouvrir fait bâcler le travail : si la récompense
// de finir est plus attrayante que le travail, l'élève clique au hasard jusqu'à
// ce que l'étape passe, et l'on a construit une machine à expédier les
// exercices. Tous les essais ci-dessous portent donc sur les moments où la
// porte doit rester FERMÉE.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bacOuvert, jeuxDuBac, PAR_DEFAUT } from '../js/core/bacASable.js';
import '../js/core/activities/index.js';
import { getExerciseById } from '../js/data/catalog.js';

const fini = { etat: 'fini', etapes: 3, faites: 3, fraction: 1 };
const enCours = { etat: 'en-cours', etapes: 3, faites: 1, fraction: 0.3 };

// ──────────────────────────────────────────────────────── LA PORTE ──────────

test('IL NE S\'OUVRE QU\'UNE FOIS LA SÉANCE FINIE, pas « bien avancée »', () => {
    // La seule règle qui ne se négocie pas : c'est elle qui empêche le bac à
    // sable d'être une porte de sortie.
    assert.equal(bacOuvert(fini).ouvert, true);
    assert.equal(bacOuvert(enCours).ouvert, false);
    assert.equal(bacOuvert({ etat: 'en-cours', etapes: 3, faites: 2, fraction: 0.97 }).ouvert, false);
    assert.equal(bacOuvert({ etat: 'abandonne', etapes: 3, faites: 2 }).ouvert, false);
    assert.equal(bacOuvert(null).ouvert, false);
});

test('ON DIT TOUJOURS POURQUOI, ET CE QU\'IL RESTE À FAIRE', () => {
    // Un bouton qui n'apparaît pas laisse croire qu'il n'y a rien. Une phrase
    // dit quoi faire pour l'ouvrir — et c'est exactement l'effet qu'on veut.
    assert.match(bacOuvert(enCours).dire, /Encore 2 étapes/);
    assert.match(bacOuvert({ etat: 'en-cours', etapes: 3, faites: 2 }).dire, /Encore une étape/);
    assert.ok(bacOuvert(null).dire.length > 10);
    assert.ok(bacOuvert(fini).dire.length > 10);
});

test('LE PROFESSEUR PEUT LE FERMER, et cela prime sur tout le reste', () => {
    // Il y a des heures où celui qui a fini doit relire, ou aider son voisin.
    const r = bacOuvert(fini, { ferme: true });
    assert.equal(r.ouvert, false);
    assert.equal(r.pourquoi, 'ferme-par-le-prof');
});

test('LE TEMPS ÉCOULÉ FERME LE BAC', () => {
    // Le compte à rebours est à zéro sur « terminer » : le professeur ramasse
    // les copies. Ouvrir des jeux à cet instant ferait jouer toute la classe
    // pendant qu'il parle.
    const r = bacOuvert(fini, { chrono: { reste: 0, aZero: 'terminer' } });
    assert.equal(r.ouvert, false);
    assert.equal(r.pourquoi, 'temps-ecoule');
});

test('UNE PAUSE FERME LE BAC AUSSI', () => {
    // C'est le moment où le professeur explique quelque chose au tableau.
    const r = bacOuvert(fini, { chrono: { reste: 0, aZero: 'pause' } });
    assert.equal(r.ouvert, false);
    assert.equal(r.pourquoi, 'en-pause');
});

test('un chrono qui tourne encore ne ferme rien', () => {
    assert.equal(bacOuvert(fini, { chrono: { reste: 420, aZero: 'terminer' } }).ouvert, true);
});

// ─────────────────────────────────────────────────────── LES JEUX ───────────

test('TOUS LES JEUX DU BAC EXISTENT VRAIMENT AU CATALOGUE', () => {
    // Un identifiant qui a changé de nom — cela arrive, le catalogue bouge —
    // produirait une tuile qui ne s'ouvre pas, et un élève qui clique trois
    // fois avant d'appeler le professeur. C'est le genre de panne qu'aucune
    // relecture ne trouve et qu'un essai trouve tout de suite.
    const manquants = PAR_DEFAUT.filter(id => !getExerciseById(id));
    assert.deepEqual(manquants, [], 'introuvables au catalogue : ' + manquants.join(', '));
});

test('le bac n\'est pas vide, et il n\'est pas le catalogue entier', () => {
    // Vide, il ne sert à rien ; entier, ce n'est plus un choix — et l'élève
    // qui a fini passerait son temps à chercher au lieu de jouer.
    const jeux = jeuxDuBac(getExerciseById);
    assert.ok(jeux.length >= 10, jeux.length + ' jeu(x)');
    assert.ok(jeux.length <= 24, jeux.length + ' jeux, c\'est un catalogue');
});

test('le professeur peut donner sa propre liste', () => {
    const jeux = jeuxDuBac(getExerciseById, ['calc-tetris', 'calc-sudoku']);
    assert.deepEqual(jeux.map(j => j.id), ['calc-tetris', 'calc-sudoku']);
});

test('LA LISTE ABSENTE RETOMBE SUR CELLE PAR DÉFAUT — LA LISTE VIDE, NON', () => {
    // ─────────────────────────────────────────────────────────────────────
    // CETTE ÉPREUVE DISAIT L'INVERSE, ET VOICI POURQUOI ELLE A CHANGÉ.
    //
    // Elle gardait « une liste vide retombe sur celle par défaut, plutôt que
    // sur rien », avec un argument juste : « un bac vide se lit comme une
    // panne ». Il tenait tant que PERSONNE ne pouvait composer la liste — une
    // liste vide ne pouvait alors être qu'un oubli du logiciel.
    //
    // Rémy : « pour le bac à sable j'aimerai quand même bien pouvoir éditer le
    // contenu ». À partir de là, une liste vide n'est plus un oubli : c'est un
    // professeur qui a tout retiré, et lui remettre les valeurs par défaut lui
    // rend exactement ce qu'il vient d'enlever.
    //
    // L'ARGUMENT, LUI, N'A PAS DISPARU : il se tient maintenant à l'écran,
    // dans `ouvrirLeBac`, par une phrase — « ton professeur n'a mis aucun jeu
    // dans le bac à sable pour cette fois » — au lieu d'une fenêtre vide. Le
    // reste de la chaîne est gardé par `tests/bacDuProf.test.mjs`.
    assert.ok(jeuxDuBac(getExerciseById, null).length >= 10,
        'un bac jamais réglé doit rester garni');
    assert.ok(jeuxDuBac(getExerciseById, undefined).length >= 10,
        'et une clef absente vaut « jamais réglé »');
    assert.deepEqual(jeuxDuBac(getExerciseById, []), [],
        'un bac vidé exprès se remplit de ce que le professeur vient d\'enlever');
});

test('ET UN BAC VIDE SE DIT, AU LIEU DE S\'OUVRIR SUR RIEN', () => {
    // La moitié de la décision ci-dessus vit dans l'écran, pas dans le noyau :
    // sans cette phrase, vider le bac ouvrirait une fenêtre blanche, et c'est
    // précisément ce que l'ancienne règle voulait éviter.
    const UI = readFileSync(new URL('../js/ui/bacASable.js', import.meta.url), 'utf8');
    assert.match(UI, /if \(!groupes\.length\) \{/,
        'rien ne regarde le cas où il n\'y a aucun jeu à montrer');
    assert.match(UI, /aucun jeu dans le bac à sable/,
        'une fenêtre vide ne dit pas ce qui s\'est passé');
});

test('un identifiant inconnu est ignoré, il ne casse pas le bac', () => {
    const jeux = jeuxDuBac(getExerciseById, ['calc-tetris', 'jeu-qui-nexiste-pas', 'calc-nova']);
    assert.deepEqual(jeux.map(j => j.id), ['calc-tetris', 'calc-nova']);
});

test('un même jeu deux fois ne s\'affiche qu\'une', () => {
    const jeux = jeuxDuBac(getExerciseById, ['calc-tetris', 'calc-tetris']);
    assert.equal(jeux.length, 1);
});
