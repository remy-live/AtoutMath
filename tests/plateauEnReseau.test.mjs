// CE QUI FAIT QUE TRENTE ARDOISES VOIENT LE MÊME TERRAIN.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « Fais tout ». Le plateau des nombres se joue maintenant par une
// classe entière. La mesure qui le dit vraiment ouvre trois navigateurs
// (`tools/plateauEnClasse.mjs`) et prend quatre minutes ; ces épreuves-ci
// gardent, en quelques millisecondes, les quatre décisions SANS LESQUELLES ce
// jeu diverge — et une divergence ne se voit pas comme un défaut : elle se voit
// comme un élève qui court vers un nombre que personne d'autre ne voit.
//
// POURQUOI DES ÉPREUVES SUR LA SOURCE ET NON SUR LE COMPORTEMENT : ces quatre
// décisions vivent dans un module qui a besoin d'un `document`, d'un serveur et
// de trente joueurs pour s'exécuter. On garde donc la DÉCISION à l'endroit où
// elle est écrite, et le comportement par la sonde. Chacune de ces épreuves a
// été vue tomber (`tools/epreuveTombe.mjs`).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const PLATEAU = readFileSync('js/ui/plateauUI.js', 'utf8');
const VEILLE = readFileSync('js/ui/jeuDeClasseUI.js', 'utf8');
const SEANCE = readFileSync('api/lib/seance.php', 'utf8');
const JEU = readFileSync('api/lib/jeu.php', 'utf8');

test('LE CARRÉ NEUF SE TIRE DE LA PRISE, ET NON DE SON RANG', () => {
    // AU RANG, deux ardoises servies dans un ordre différent dessineraient deux
    // terrains différents : la vingtième prise chez l'une est la vingt-et-unième
    // chez l'autre. À l'identifiant de la prise, le terrain ne dépend plus que
    // de l'ENSEMBLE des prises, et l'ordre ne compte plus.
    const bloc = PLATEAU.slice(PLATEAU.indexOf('const appliquerUnePrise'),
        PLATEAU.indexOf('const appliquerLesPrises'));
    assert.ok(bloc.length > 200, 'appliquerUnePrise introuvable');
    assert.match(bloc, /graine: `\$\{graine\}-\$\{cle\}`/,
        'la graine du carré neuf doit porter l\'identifiant de la prise');
    assert.doesNotMatch(bloc, /graine: `\$\{graine\}-\$\{prises\.length\}`/,
        'au rang des prises, les trente terrains divergent');
});

test('ET SON IDENTIFIANT NE SE TIRE PAS DE LA LONGUEUR DE LA LISTE', () => {
    // `plateau.cibles.length` vaut 21 chez qui a reçu vingt prises et 22 chez
    // qui en a reçu vingt-et-une : les deux réclameraient alors DEUX carrés
    // différents sous le même nom, et le serveur en refuserait un au hasard.
    const bloc = PLATEAU.slice(PLATEAU.indexOf('const appliquerUnePrise'),
        PLATEAU.indexOf('const appliquerLesPrises'));
    assert.doesNotMatch(bloc, /i: plateau\.cibles\.length/,
        'l\'identifiant d\'un carré neuf ne peut pas dépendre de ce qu\'on a déjà reçu');
    assert.match(bloc, /makeRng\(`cible-\$\{cle\}`\)/,
        'il se condense depuis la prise, pour rester court et identique partout');
});

test('ON NE REGARDE PAS OÙ SONT LES PIONS POUR POSER UN CARRÉ NEUF', () => {
    // Les positions des vingt-neuf autres datent du dernier battement, donc
    // elles DIFFÈRENT d'une ardoise à l'autre : un carré refusé chez l'un et
    // accepté chez l'autre, c'est la même divergence par un autre chemin.
    const bloc = PLATEAU.slice(PLATEAU.indexOf('const appliquerUnePrise'),
        PLATEAU.indexOf('const appliquerLesPrises'));
    assert.doesNotMatch(bloc, /pions\.some/,
        'la place d\'un carré neuf ne peut dépendre que de ce que tous voient');
});

test('LES PRISES S\'APPLIQUENT DANS N\'IMPORTE QUEL ORDRE', () => {
    // La prise d'un carré NÉ d'une autre prise ne peut s'appliquer qu'après
    // elle. Le serveur ne promet aucun ordre — et on ne veut pas qu'il en
    // promette un : `rowid` n'existe pas en MySQL, que ce dépôt sert aussi.
    const bloc = PLATEAU.slice(PLATEAU.indexOf('const appliquerLesPrises'),
        PLATEAU.indexOf('const annoncerDeLoin'));
    assert.ok(bloc.length > 100, 'appliquerLesPrises introuvable');
    assert.match(bloc, /while \(encore\)/,
        'il faut repasser tant que ça avance, sinon une prise se perd');
    assert.match(JEU, /FROM jeu_prises WHERE class_id = \? AND jeu_debut = \?'/,
        'la requete des prises ne demande aucun ordre : rowid n existe pas en MySQL');
});

test('EN RÉSEAU, UNE PRISE EST RÉCLAMÉE ET NON ENCAISSÉE', () => {
    // Deux élèves recouvrent le même 56 dans la même demi-seconde : c'est la
    // situation NORMALE à trente. Si chaque ardoise encaissait de son côté, les
    // deux croiraient l'avoir eu et le tableau compterait deux fois les points.
    const bloc = PLATEAU.slice(PLATEAU.indexOf('const verifierLesPrises'),
        PLATEAU.indexOf('const reclames'));
    assert.match(bloc, /if \(lien\) \{/, 'le mode réseau doit se distinguer ici');
    assert.match(bloc, /prise\.pions\.includes\(moi\)/,
        'on ne réclame que les prises où l\'on est : les autres sont vues en retard');
    const avant = bloc.indexOf('if (lien) {');
    assert.ok(bloc.indexOf('encaisser(cible, prise)') > avant,
        'encaisser ne doit rester que pour la démonstration');
});

test('EN RÉSEAU, AUCUN PION N\'EST TENU PAR L\'ORDINATEUR', () => {
    // Les vingt-neuf autres sont de vrais élèves. Un pion de l'ordinateur en
    // plus, et il serait tenu par les trente ardoises à la fois, chacune le
    // faisant jouer de son côté.
    assert.match(PLATEAU, /const pionsDeLOrdinateur = lien \? 0 : combienDeRobots/,
        'les pions de l\'ordinateur n\'existent qu\'en démonstration');
    assert.match(PLATEAU, /i < pionsDeLOrdinateur/,
        'et c\'est ce nombre-là que la boucle doit lire');
});

test('MON ÉQUIPE VIENT DU SERVEUR, ET L\'ÉCRAN L\'ATTEND', () => {
    // Une ardoise ne peut pas deviner son équipe : c'est le serveur qui
    // répartit les trente. Ouvrir avec « Bleu » par défaut, c'est donner un
    // nombre à la mauvaise équipe pendant la seconde qui suit.
    assert.match(VEILLE, /monEquipe: monde\.moi \? monde\.moi\.equipe : 0/,
        'l\'équipe doit venir de la première réponse du serveur');
    assert.ok(VEILLE.indexOf('const ouvrir = (monde)') < VEILLE.indexOf('fil = ouvrirLeLien'),
        'le fil s\'ouvre après la fonction qui ouvrira le terrain à sa réponse');
});

test('ET MA PLACE DE DÉPART NE DÉPEND QUE DE MON IDENTIFIANT', () => {
    // Chaque ardoise se croit première de son équipe : elle ne connaît pas
    // encore les autres au moment où elle se place. Quinze Bleus démarreraient
    // sur la MÊME case, empilés, et deux d'entre eux pourraient prendre un
    // nombre sans avoir fait un geste.
    assert.match(PLATEAU, /makeRng\(`place-\$\{o\.monId\}`\)/,
        'le rang de départ se tire de l\'identifiant, stable au rechargement');
});

test('L\'ÉTAT DE SÉANCE LIT LES CINQ COLONNES DU JEU', () => {
    // LE DÉFAUT QUE CETTE ÉPREUVE GARDE A ÉTÉ MESURÉ : le serveur lançait la
    // partie, `/teacher/live` la voyait, `/jeu` la servait, 581 vérifications
    // d'API passaient — et aucune ardoise ne l'apprenait, parce que ce SELECT-ci
    // ne nommait pas les colonnes. Une ligne sans `jeu_fin` veut dire « aucune
    // partie » : le défaut rend exactement la même réponse que le repos.
    const requete = SEANCE.slice(SEANCE.indexOf('SELECT id, name, join_code'),
        SEANCE.indexOf('FROM classes WHERE id = ?'));
    assert.ok(requete.length > 100, 'la requête de classe est introuvable');
    for (const col of ['jeu_type', 'jeu_graine', 'jeu_debut', 'jeu_fin', 'jeu_reglages']) {
        assert.ok(requete.includes(col),
            `${col} manque : l'ardoise n'apprendra jamais qu'un jeu a commencé`);
    }
    assert.match(SEANCE, /'jeu' *=> jeuEnCours\(\$classe\)/,
        'et l\'état de séance doit porter le jeu en cours');
});

test('LA VEILLE N\'OUVRE QUE LES JEUX QU\'ELLE SAIT JOUER EN RÉSEAU', () => {
    // Les trois jeux vifs remettent leur terrain en place au hasard LOCAL :
    // trente ardoises tireraient trente terrains différents. Mieux vaut ne rien
    // ouvrir qu'ouvrir un jeu qui ne serait pas le même pour tous.
    assert.match(VEILLE, /const EN_RESEAU = \['plateau'\]/,
        'la liste des jeux jouables en réseau doit être explicite');
    assert.match(VEILLE, /if \(!EN_RESEAU\.includes\(j\.type\)\) return/,
        'et un jeu absent de la liste ne doit rien ouvrir du tout');
});

test('LE MALUS NE REDESCEND PAS, ET AUCUN SCORE NE PASSE SOUS ZÉRO', () => {
    // Une punition qu'on efface en rechargeant sa page n'est pas une punition —
    // la même règle que le gel. Et « −60 » au tableau devant la classe n'est
    // pas un score.
    assert.match(JEU, /\$malus = max\(\$malus, max\(0, min\(400,/,
        'le serveur garde le plus grand des deux malus');
    assert.match(JEU, /\$scores\[0\] = max\(0, \$scores\[0\]\)/,
        'et aucun score d\'équipe ne descend sous zéro');
});
