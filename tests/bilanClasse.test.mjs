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
    notionsAReprendre, resumeDeClasse, ordreDuBilan, enHeures,
    elevesPourLesFeuilles, SEUIL_DU_SERVEUR
} from '../js/core/bilanClasse.js';
// DEUX FONCTIONS PORTENT LE MÊME NOM, ET CE N'EST PAS UN ACCIDENT : celle du
// bilan de classe retourne le tableau (quelles notions, pour combien d'élèves),
// celle de la reprise choisit ce que CET élève-là refait. On renomme la seconde
// ici pour que l'épreuve dise laquelle elle mesure.
import { notionsAReprendre as notionsDUneFeuille } from '../js/core/reprise.js';

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

// ─────────────────────────────────────────────────────────────────────────────
// LES LIGNES DU SERVEUR, DANS LA FORME QUE LES FEUILLES LISENT.
//
// RÉMY, 4 novembre : « ah oui mais du coup on n'a pas fait la page parent ».
// Elle était faite — sur l'écran des classes LOCALES. Ses classes à lui sont
// sur le serveur, et les deux moitiés du logiciel ne parlent pas la même
// langue : `competences` d'un côté, `weakSkills`/`strongSkills` de l'autre.
// `elevesPourLesFeuilles` est le pont, et un pont se garde aux deux bouts.

test('LE NIVEAU DU SERVEUR EST UN OBJET, ET IL FAUT EN SORTIR LA LETTRE', () => {
    // `levelFor` (api/lib/projections.php) rend `{key, label}`, non une lettre.
    // Recopié tel quel, `niveau` vaudrait `[object Object]` : la page parents
    // rangerait TOUTES les notions dans aucune des trois colonnes, et les
    // trois colonnes seraient vides sur vingt-trois pages, sans un mot.
    const [e] = elevesPourLesFeuilles([{
        studentId: 'e1', firstName: 'Tom', totalQuestions: 45, successRate: 0.49,
        weakSkills: [{ skillId: 'num.add.entiers', mastery: 0.42,
            level: { key: 'EC', label: 'En cours d\'acquisition' } }],
        strongSkills: [{ skillId: 'num.div.quotient', mastery: 0.91,
            level: { key: 'E', label: 'Expert' } }]
    }]);
    assert.deepEqual(e.competences.map(c => c.niveau), ['EC', 'E']);
    // ET LES DEUX LISTES ARRIVENT. Oublier `strongSkills` laisserait la colonne
    // « c'est acquis » vide pour toujours — une page parents qui ne sait dire
    // que ce qui ne va pas.
    assert.deepEqual(e.competences.map(c => c.skillId),
        ['num.add.entiers', 'num.div.quotient']);
    // TOUT CE QUI ARRIVE EST FIABLE : le serveur a déjà écarté les notions vues
    // trop peu de fois. Sans ce drapeau, les feuilles jettent tout.
    assert.ok(e.competences.every(c => c.fiable));
    assert.equal(e.nom, 'Tom');
    assert.equal(e.questions, 45);
});

test('ET LA REPRISE REPREND BIEN CE QUE L\'ÉCRAN A DIT FRAGILE', () => {
    // L'écran écrit « à reprendre » sous ce que le serveur a rangé dans
    // `weakSkills` — c'est-à-dire sous 0,7 de maîtrise. La feuille de reprise,
    // elle, compare à son propre seuil. Si les deux divergent, le professeur
    // lit « à reprendre » à l'écran et reçoit une feuille qui ne le reprend
    // pas : il doute alors des deux.
    const [e] = elevesPourLesFeuilles([{
        studentId: 'e1', firstName: 'Tom', totalQuestions: 45,
        // 0,65 : fragile pour le serveur (< 0,7), acquis pour le seuil local
        // de `core/reprise.js` (0,6). C'est exactement l'écart qui compte.
        weakSkills: [{ skillId: 'num.add.entiers', mastery: 0.65, level: { key: 'EC' } }],
        strongSkills: []
    }]);
    const prises = notionsDUneFeuille(e, { seuil: SEUIL_DU_SERVEUR });
    assert.deepEqual(prises.map(n => n.skillId), ['num.add.entiers'],
        'l\'écran dit « à reprendre » et la feuille ne la reprend pas');
});

test('ET CELUI QUI N\'A RIEN DÉPOSÉ RESTE RECONNAISSABLE', () => {
    // « Rien à reprendre » et « n'a rien déposé » sont deux nouvelles très
    // différentes, et c'est `questions` qui les sépare. Une traduction qui
    // laisserait tomber ce nombre ferait disparaître la seconde.
    const [e] = elevesPourLesFeuilles([{
        studentId: 'e9', firstName: 'Lucas', totalQuestions: 0,
        weakSkills: [], strongSkills: []
    }]);
    assert.equal(e.questions, 0);
    assert.equal(e.competences.length, 0);
});
