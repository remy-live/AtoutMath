// Le bilan de classe : ce que le professeur lit, et ce qu'on refuse de lui dire.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    creerClasse, creerEleve, poserEleve, fusionnerEvenements, retirerEleve,
    renommerEleve, lireFichierEleve, normaliser, elevesTries
} from '../js/core/classes.js';
import { bilanEleve, bilanClasse, phraseDe, phraseClasse, nomCompetence } from '../js/core/bilan.js';
import { RELIABLE_MIN_ATTEMPTS } from '../js/core/mastery.js';

const JOUR = 86400000;
let n = 0;

/** Une tentative, telle que le journal l'enregistre. */
function essai(skillId, correct, { il_y_a = 0, attemptIndex = 0, given = '?', expected = '!' } = {}) {
    return {
        id: 'ev' + (++n), type: 'attempt', ts: Date.now() - il_y_a * JOUR,
        payload: {
            skillId, correct, attemptIndex, given, expected,
            // Un énoncé et un exercice PAR COMPÉTENCE : `computeErrors` range
            // les erreurs par (exercice, énoncé), et un énoncé commun ferait
            // effacer les fautes de l'une par les réussites de l'autre.
            questionText: 'Question ' + skillId, msElapsed: 4000, exerciseId: 'ex-' + skillId
        }
    };
}

/** `n` réussites d'affilée sur une compétence. */
const suite = (skillId, n, ok = true, opts) =>
    Array.from({ length: n }, () => essai(skillId, ok, opts));

// --- Le modèle de classe -----------------------------------------------------

test('une classe se crée, se remplit, se vide', () => {
    let c = creerClasse('  4ᵉ B  ', '4e');
    assert.equal(c.nom, '4ᵉ B');
    assert.equal(c.eleves.length, 0);
    assert.ok(c.id.startsWith('c_'));

    c = poserEleve(c, 'Emma', suite('num.add.entiers', 3));
    c = poserEleve(c, 'Lucas', suite('num.add.entiers', 2));
    assert.equal(c.eleves.length, 2);

    c = renommerEleve(c, c.eleves[0].id, 'Emma D.');
    assert.equal(c.eleves[0].nom, 'Emma D.');

    c = retirerEleve(c, c.eleves[1].id);
    assert.equal(c.eleves.length, 1);
    // Une classe sans nom n'est pas une classe sans titre.
    assert.equal(creerClasse('').nom, 'Ma classe');
    assert.equal(creerEleve('  ').nom, 'Élève');
});

test('redéposer le fichier d\'un élève le MET À JOUR au lieu de le dupliquer', () => {
    // C'est le geste qu'un professeur fera toutes les semaines : reprendre le
    // fichier d'Emma. Deux Emma dans la liste, ce serait la fin de l'outil.
    const semaine1 = suite('num.add.entiers', 4);
    let c = poserEleve(creerClasse('6ᵉ A'), 'Emma', semaine1);
    const semaine2 = [...semaine1, ...suite('num.mult.sens', 3)];
    c = poserEleve(c, 'Emma', semaine2);

    assert.equal(c.eleves.length, 1, 'un doublon a été créé');
    assert.equal(c.eleves[0].evenements.length, 7, 'les événements communs ont été recopiés');
});

test('le même prénom écrit autrement reste le même élève', () => {
    let c = poserEleve(creerClasse('6ᵉ A'), 'Émile', suite('num.add.entiers', 3));
    c = poserEleve(c, '  emile ', suite('num.mult.sens', 2));
    assert.equal(c.eleves.length, 1);
    assert.equal(c.eleves[0].evenements.length, 5);
    assert.equal(normaliser('  Émile  DUPONT '), 'emile dupont');
});

test('deux journaux fusionnent sans doublon et restent chronologiques', () => {
    const a = [essai('s', true, { il_y_a: 3 }), essai('s', true, { il_y_a: 1 })];
    const b = [a[1], essai('s', false, { il_y_a: 2 })];
    const f = fusionnerEvenements(a, b);
    assert.equal(f.evenements.length, 3);
    assert.equal(f.ajoutes, 1);
    const ts = f.evenements.map(e => e.ts);
    assert.deepEqual(ts, [...ts].sort((x, y) => x - y), 'les événements ne sont pas dans l\'ordre');
});

test('un fichier déposé dit pourquoi il ne convient pas', () => {
    assert.equal(lireFichierEleve(null).ok, false);
    assert.match(lireFichierEleve({ kind: 'parcours' }).raison, /pas une progression/);
    assert.match(lireFichierEleve({ kind: 'student_progress' }).raison, /aucun travail/);
    assert.match(lireFichierEleve({
        kind: 'student_progress', profile: { name: 'Léa' }, events: []
    }).raison, /Léa n'a encore rien fait/);

    const bon = lireFichierEleve({
        kind: 'student_progress', profile: { name: 'Léa' }, events: suite('s', 2)
    });
    assert.equal(bon.ok, true);
    assert.equal(bon.nom, 'Léa');
    assert.equal(bon.evenements.length, 2);
});

test('les élèves se rangent comme on les appelle', () => {
    let c = creerClasse('6ᵉ A');
    ['Zoé', 'émile', 'Ana'].forEach(nom => { c = poserEleve(c, nom, suite('s', 1)); });
    assert.deepEqual(elevesTries(c).map(e => e.nom), ['Ana', 'émile', 'Zoé']);
});

// --- La phrase de résumé -----------------------------------------------------

test('sans travail, on le dit — on n\'invente pas un bilan', () => {
    const b = bilanEleve([]);
    assert.equal(b.questions, 0);
    assert.equal(b.phrase, 'N\'a pas encore travaillé.');
});

test('sur trop peu de questions, on refuse de conclure', () => {
    // Le piège classique du tableau de bord : « 33 % de réussite » sur trois
    // questions est un chiffre juste et une conclusion fausse.
    const b = bilanEleve(suite('num.add.entiers', 3, false));
    assert.equal(b.assez, false);
    assert.match(b.phrase, /trop tôt/);
    assert.match(b.phrase, new RegExp(String(RELIABLE_MIN_ATTEMPTS)));
    assert.ok(!/%/.test(b.phrase), 'un pourcentage a été affirmé sur trop peu de questions');
});

test('la phrase nomme UNE force et UNE difficulté, avec leurs chiffres', () => {
    const evs = [
        ...suite('num.mult.table.7', 10),                       // solide
        ...suite('num.prio', 8, false)                          // en peine
    ];
    const b = bilanEleve(evs);
    assert.equal(b.assez, true);
    assert.match(b.phrase, /Solide sur/);
    assert.match(b.phrase, new RegExp(nomCompetence('num.mult.table.7')));
    assert.match(b.phrase, /Bute sur/);
    assert.match(b.phrase, new RegExp(nomCompetence('num.prio')));
    assert.match(b.phrase, /100 %/);
    assert.match(b.phrase, /0 %/);
    // Une seule de chaque : une phrase qui énumère ne se décide pas.
    assert.equal((b.phrase.match(/Solide sur/g) || []).length, 1);
});

test('quand tout est acquis, on invite à ouvrir autre chose', () => {
    const b = bilanEleve([...suite('num.add.entiers', 8), ...suite('num.mult.sens', 8)]);
    assert.equal(b.difficultes.length, 0);
    assert.match(b.phrase, /ouvrir de nouvelles notions/);
});

test('quand rien n\'est stabilisé, on nomme quand même par où reprendre', () => {
    // Six justes sur douze d'un côté, deux sur dix de l'autre : aucune n'est
    // acquise, mais l'une est bien plus proche — et c'est par là qu'on
    // recommence.
    const evs = [
        ...suite('num.add.entiers', 6), ...suite('num.add.entiers', 6, false),
        ...suite('num.prio', 2), ...suite('num.prio', 8, false)
    ];
    const b = bilanEleve(evs);
    assert.equal(b.forces.length, 0);
    assert.match(b.phrase, /Rien n'est encore stabilisé/);
    assert.match(b.phrase, /plus proche d'aboutir/);
    assert.match(b.phrase, new RegExp(nomCompetence('num.add.entiers')));
});

test('les chiffres du bilan sont ceux du journal', () => {
    const b = bilanEleve([...suite('num.add.entiers', 7), ...suite('num.add.entiers', 3, false)]);
    assert.equal(b.questions, 10);
    assert.equal(b.justes, 7);
    assert.equal(Math.round(b.reussite * 100), 70);
    assert.equal(b.joursDepuis, 0);
});

// --- Le bilan de classe ------------------------------------------------------

test('la classe fait remonter la notion où le plus d\'élèves sont en peine', () => {
    let c = creerClasse('5ᵉ C');
    // Trois élèves : tous bons en tables, tous perdus en priorités.
    for (const nom of ['Ana', 'Bilal', 'Chloé']) {
        c = poserEleve(c, nom, [
            ...suite('num.mult.table.7', 8),
            ...suite('num.prio', 8, false)
        ]);
    }
    const b = bilanClasse(c);
    assert.equal(b.eleves.length, 3);
    assert.equal(b.competences[0].skillId, 'num.prio', 'la notion qui bloque n\'est pas en tête');
    assert.equal(b.competences[0].niveaux.NA, 3);
    assert.equal(b.aReprendre[0].skillId, 'num.prio');
    assert.match(b.phrase, /À reprendre avec tout le monde/);
    assert.match(b.phrase, new RegExp(nomCompetence('num.prio')));
});

test('la classe compte ceux qui n\'ont rien déposé, et le dit', () => {
    let c = creerClasse('6ᵉ A');
    c = poserEleve(c, 'Ana', suite('num.add.entiers', 8));
    c = poserEleve(c, 'Bilal', []);
    c = poserEleve(c, 'Chloé', []);
    const b = bilanClasse(c);
    assert.equal(b.sansTravail, 2);
    assert.match(b.phrase, /2 élèves n'ont rien déposé/);
});

test('une classe vide, ou muette, ne fabrique pas de conclusion', () => {
    assert.match(bilanClasse(creerClasse('6ᵉ A')).phrase, /Aucun élève/);
    let c = poserEleve(creerClasse('6ᵉ A'), 'Ana', []);
    assert.match(bilanClasse(c).phrase, /Personne n'a encore travaillé/);
    assert.equal(phraseClasse([], []), 'Aucun élève dans cette classe pour l\'instant.');
});

test('une compétence vue par un seul élève ne devient pas un problème de classe', () => {
    // Sinon la première ligne de l'écran désignerait une notion que personne
    // d'autre n'a rencontrée — et le professeur reprendrait un cours pour rien.
    let c = creerClasse('6ᵉ A');
    c = poserEleve(c, 'Ana', suite('num.prio', 8, false));
    c = poserEleve(c, 'Bilal', suite('num.add.entiers', 8));
    const b = bilanClasse(c);
    assert.equal(b.aReprendre.length, 0);
    assert.match(b.phrase, /aucune notion ne bloque la classe entière/);
});

test('le détail reste disponible sous la phrase', () => {
    const evs = [
        ...suite('num.prio', 6, false, { given: '20', expected: '14' }),
        ...suite('num.mult.table.7', 8)
    ];
    const b = bilanEleve(evs);
    // Les compétences, triées de la plus sûre à la plus fragile.
    assert.ok(b.competences.length >= 2);
    assert.ok(b.competences[0].maitrise >= b.competences[b.competences.length - 1].maitrise);
    // Et les erreurs encore ouvertes, les plus répétées d'abord.
    assert.ok(b.aRevoir.length >= 1, 'aucune erreur à revoir n\'a été relevée');
    assert.ok(b.aRevoir[0].count >= 1);
});

test('phraseDe se suffit à elle-même — on peut la rejouer sur un bilan reconstruit', () => {
    const b = bilanEleve(suite('num.add.entiers', 8));
    assert.equal(phraseDe(b), b.phrase);
});
