// LE BILAN D'UNE CLASSE — ce qu'il faut reprendre, et avec qui.
//
// La route du serveur existait depuis longtemps ; aucun écran de l'application
// ne l'appelait. Mais la brancher ne suffisait pas : un tableau de trente
// lignes de chiffres est la MATIÈRE d'un bilan, pas un bilan.
//
// CE QUI SE VÉRIFIE ICI EST LE RETOURNEMENT. On a trente élèves avec chacun
// leurs notions faibles ; la question du professeur qui prépare lundi est
// l'inverse — quelles notions, et pour combien d'élèves. Les deux arithmétiques
// ci-dessous sont celles qui donnent des chiffres faux quand on les fait à la
// légère : un taux de classe calculé en moyennant des moyennes, et un « 0 % »
// affiché là où il n'y a simplement rien à dire.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    notionsAReprendre, resumeDeClasse, ordreDuBilan, enHeures
} from '../js/core/bilanClasse.js';

const eleve = (o = {}) => ({
    studentId: o.id || 'e1',
    firstName: o.prenom || 'Léo',
    lastSeenAt: o.vu === undefined ? 1_700_000_000 : o.vu,
    totalQuestions: o.questions === undefined ? 20 : o.questions,
    successRate: o.taux === undefined ? 0.8 : o.taux,
    timeSeconds: o.temps === undefined ? 600 : o.temps,
    openErrors: o.erreurs === undefined ? 2 : o.erreurs,
    weakSkills: o.faibles || []
});

const faible = (skillId, mastery = 0.4) => ({ skillId, mastery, level: 'fragile' });

// ────────────────────────────────────── LE RETOURNEMENT DU TABLEAU ──────────

test('ON RETOURNE LE TABLEAU : DES ÉLÈVES AUX NOTIONS', () => {
    // C'est tout l'objet du module. Trente lignes d'élèves ne disent pas quoi
    // reprendre lundi ; les mêmes données lues par notion le disent.
    const n = notionsAReprendre([
        eleve({ id: 'a', prenom: 'Amel', faibles: [faible('num.dec.encadrer'), faible('calc.div')] }),
        eleve({ id: 'b', prenom: 'Bilal', faibles: [faible('num.dec.encadrer')] }),
        eleve({ id: 'c', prenom: 'Chloé', faibles: [faible('num.dec.encadrer')] })
    ]);
    assert.equal(n[0].skillId, 'num.dec.encadrer');
    assert.equal(n[0].combien, 3);
    assert.deepEqual(n[0].eleves.map(e => e.firstName), ['Amel', 'Bilal', 'Chloé']);
    assert.equal(n[1].skillId, 'calc.div');
    assert.equal(n[1].combien, 1);
});

test('UNE NOTION FAIBLE POUR DOUZE PASSE AVANT UNE NOTION FAIBLE POUR UN', () => {
    // La première appelle une leçon, la seconde un accompagnement. Le tri est
    // donc une décision pédagogique, pas un tri par commodité.
    const douze = Array.from({ length: 12 }, (_, i) =>
        eleve({ id: 'e' + i, faibles: [faible('geo.aire', 0.55)] }));
    const un = eleve({ id: 'z', faibles: [faible('calc.prio', 0.05)] });
    const n = notionsAReprendre([...douze, un]);
    assert.equal(n[0].skillId, 'geo.aire', 'douze élèves passent devant, même moins fragiles');
    assert.equal(n[0].combien, 12);
});

test('à nombre égal, la plus fragile passe devant', () => {
    const n = notionsAReprendre([
        eleve({ id: 'a', faibles: [faible('A', 0.6), faible('B', 0.2)] }),
        eleve({ id: 'b', faibles: [faible('A', 0.6), faible('B', 0.2)] })
    ]);
    assert.equal(n[0].skillId, 'B');
});

test('une classe sans difficulté ne fabrique pas de difficulté', () => {
    assert.deepEqual(notionsAReprendre([eleve(), eleve({ id: 'b' })]), []);
    assert.deepEqual(notionsAReprendre([]), []);
    assert.deepEqual(notionsAReprendre(null), []);
});

// ──────────────────────────────────── LES DEUX PIÈGES ARITHMÉTIQUES ─────────

test('LE TAUX DE CLASSE N\'EST PAS UNE MOYENNE DE MOYENNES', () => {
    // Un élève a fait 3 questions et les a toutes réussies ; un autre en a fait
    // 60 et en a réussi 30. La moyenne des taux donne 75 % — un chiffre qui
    // ferait croire à une classe qui va bien. Le vrai taux est 33/63 = 52 %.
    const r = resumeDeClasse([
        eleve({ id: 'a', questions: 3, taux: 1 }),
        eleve({ id: 'b', questions: 60, taux: 0.5 })
    ]);
    assert.equal(r.questions, 63);
    assert.equal(r.justes, 33);
    assert.ok(Math.abs(r.reussite - 33 / 63) < 0.001, r.reussite);
    assert.ok(r.reussite < 0.6, 'une moyenne de moyennes aurait donné 0,75');
});

test('PERSONNE N\'A RIEN FAIT N\'EST PAS « 0 % »', () => {
    // « 0 % de réussite » se lit comme « tout est faux ». La vérité est qu'il
    // n'y a rien à dire, et un écran qui reçoit `null` peut l'écrire.
    const r = resumeDeClasse([eleve({ questions: 0, taux: null })]);
    assert.equal(r.reussite, null);
    assert.equal(r.actifs, 0);
    assert.equal(resumeDeClasse([]).reussite, null);
});

test('le résumé compte ceux qui ne sont jamais venus', () => {
    // C'est le premier chiffre que regarde un professeur qui distribue des
    // billets : combien n'ont pas réussi à entrer.
    const r = resumeDeClasse([
        eleve({ id: 'a' }), eleve({ id: 'b', vu: null }), eleve({ id: 'c', vu: null })
    ]);
    assert.equal(r.eleves, 3);
    assert.equal(r.jamaisVenus, 2);
});

test('le temps et les erreurs s\'additionnent', () => {
    const r = resumeDeClasse([eleve({ temps: 600, erreurs: 2 }), eleve({ id: 'b', temps: 1200, erreurs: 5 })]);
    assert.equal(r.secondes, 1800);
    assert.equal(r.erreurs, 7);
});

// ──────────────────────────────────────────── L'ORDRE DE LECTURE ────────────

test('CELUI QUI N\'A RIEN FAIT EST EN HAUT, PAS À LA LETTRE Z', () => {
    // Un bilan qu'on lit de haut en bas doit commencer par ce qui demande un
    // geste, et le premier geste est pour celui qui n'a rien fait. Rangé par
    // ordre alphabétique, il serait en bas de page et on ne le verrait pas.
    const l = ordreDuBilan([
        eleve({ id: 'a', prenom: 'Amel', questions: 20, taux: 0.9 }),
        eleve({ id: 'z', prenom: 'Zoé', questions: 0, taux: null }),
        eleve({ id: 'b', prenom: 'Bilal', questions: 20, taux: 0.3 })
    ]);
    assert.deepEqual(l.map(x => x.firstName), ['Zoé', 'Bilal', 'Amel']);
});

test('à réussite égale, on range par prénom', () => {
    const l = ordreDuBilan([
        eleve({ id: 'z', prenom: 'Zoé', taux: 0.8 }),
        eleve({ id: 'a', prenom: 'Amel', taux: 0.8 })
    ]);
    assert.deepEqual(l.map(x => x.firstName), ['Amel', 'Zoé']);
});

test('l\'ordre ne modifie pas la liste qu\'on lui donne', () => {
    // Le tableau vient du serveur et sert à plusieurs écrans : le trier sur
    // place changerait ce que voient les autres.
    const source = [eleve({ id: 'z', prenom: 'Zoé', taux: 0.1 }), eleve({ id: 'a', prenom: 'Amel', taux: 0.9 })];
    ordreDuBilan(source);
    assert.equal(source[0].firstName, 'Zoé');
});

// ────────────────────────────────────────────────────── LES DURÉES ──────────

test('« 3 h 12 » pour une classe, jamais « 11520 secondes »', () => {
    assert.equal(enHeures(11520), '3 h 12');
    assert.equal(enHeures(600), '10 min');
    assert.equal(enHeures(30), 'moins d\'une minute');
    // ZÉRO N'EST PAS « MOINS D'UNE MINUTE ». Une classe qui a répondu à
    // quatre cents questions et qui afficherait « moins d'une minute de
    // travail » se lit comme une panne — c'est du temps qu'on n'a pas
    // enregistré, pas du temps qu'on n'a pas passé.
    assert.equal(enHeures(0), '—');
    assert.equal(enHeures(null), '—');
});
