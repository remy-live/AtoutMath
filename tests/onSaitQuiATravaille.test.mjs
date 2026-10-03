// « PERSONNE N'A COMMENCÉ » N'EST PAS « JE N'EN SAIS RIEN ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// `aTravaille` répond NON de deux façons qu'on ne distingue pas : « il n'a rien
// fait » et « je n'ai pas son journal ». Les deux sortent `false`, et tout
// écran qui s'y fie prend le second pour le premier.
//
// MESURÉ (`tools/reinitialiserUnEleve.mjs`) : le panneau « Donner à une
// classe » lit sa liste par la route « roster », qui rend des noms et des
// codes, PAS les événements. Toute la classe s'y affichait « n'a pas
// commencé » — y compris un élève qui venait de finir sa séance.
//
// ── ET CE N'ÉTAIT PAS QU'UN AFFICHAGE ───────────────────────────────────────
//
// C'est la moitié qu'on n'avait pas vue. Retirer une séance depuis ce panneau
// prenait TOUJOURS la branche « personne n'a encore commencé » — celle qui
// SUPPRIME la séance de la bibliothèque au lieu de la retirer, et le bilan de
// cette séance avec elle.
//
// Un professeur qui retirait une séance travaillée perdait son bilan, sur la
// foi d'une phrase que l'écran n'avait aucun moyen de savoir vraie. C'est le
// même défaut que la flèche de remise à zéro, qui ne paraissait jamais pour la
// même raison — mais celui-ci EFFAÇAIT.
//
// LA RÈGLE QUI EN SORT, et elle vaut au-delà de cet écran : **une condition
// qui décide d'effacer ne se contente pas d'un `false` ; elle demande d'abord
// si l'on sait.**

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { onSaitQuiATravaille } from '../js/core/bilanSeance.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('UN JOURNAL VIDE EST UNE INFORMATION ; UN JOURNAL ABSENT N\'EN EST PAS UNE', () => {
    // LA DISTINCTION, EN DEUX LIGNES. Le tableau vide dit « il n'a rien
    // fait » ; le champ manquant dit « je n'ai rien reçu ».
    assert.equal(onSaitQuiATravaille({ eleves: [{ id: 'a', evenements: [] }] }), true);
    assert.equal(onSaitQuiATravaille({ eleves: [{ id: 'a' }] }), false);
});

test('CE QUE REND LA ROUTE « ROSTER » — des noms et des codes', () => {
    // La forme exacte que `elevesDeLaClasse` fabrique : id, nom, login, code.
    // Aucun journal. C'est l'écran de Rémy, et il doit se reconnaître ignorant.
    const classe = { eleves: [
        { id: 'a', nom: 'Maëlle', login: 'maelle.d', code: '4KP2' },
        { id: 'b', nom: 'Lucas', login: 'lucas.m', code: 'X7Y9' }
    ] };
    assert.equal(onSaitQuiATravaille(classe), false);
});

test('IL SUFFIT D\'UN ÉLÈVE DONT ON SAIT QUELQUE CHOSE', () => {
    // Une classe où un seul journal est arrivé est une classe sur laquelle on
    // peut raisonner : les autres sont alors de vrais « rien fait ».
    assert.equal(onSaitQuiATravaille({ eleves: [{ id: 'a' }, { id: 'b', evenements: [] }] }), true);
});

test('UNE CLASSE VIDE N\'APPREND RIEN', () => {
    // Zéro élève, zéro journal : « on ne sait pas » est la seule réponse
    // honnête, et c'est la prudente.
    assert.equal(onSaitQuiATravaille({ eleves: [] }), false);
    assert.equal(onSaitQuiATravaille({}), false);
    assert.equal(onSaitQuiATravaille(null), false);
    assert.equal(onSaitQuiATravaille({ eleves: null }), false);
    // Et un élève abîmé ne fait pas tomber l'écran.
    assert.doesNotThrow(() => onSaitQuiATravaille({ eleves: [null, undefined] }));
    assert.equal(onSaitQuiATravaille({ eleves: [null] }), false);
});

test('DANS LE DOUTE, ON RETIRE — ON NE SUPPRIME PAS', () => {
    // LA RAISON D'ÊTRE DE TOUT CE FICHIER. Retirer n'efface rien, supprimer
    // efface tout. Le pire du côté prudent est une séance que personne n'a
    // ouverte qui reste dans la liste, marquée « retirée » ; le pire de
    // l'autre côté est un bilan de classe perdu. Ce n'est pas un arbitrage.
    const SRC = lire('js/ui/parcoursClasses.js');
    assert.match(SRC, /if \(info\.travaille \|\| !info\.onSait\) \{/);
    assert.match(SRC, /onSait: onSaitQuiATravaille\(classe\),/);

    // ET LA BRANCHE QUI SUPPRIME EXISTE TOUJOURS : on ne l'a pas murée, on l'a
    // rendue inatteignable tant qu'on ne sait pas. Le jour où cet écran
    // recevra les journaux, elle reprendra son travail sans rien réécrire.
    assert.match(SRC, /seances = seances\.filter\(x => x\.id !== info\.seance\.id\);/);
});

test('ET L\'ÉCRAN NE DIT PLUS « N\'A PAS COMMENCÉ » À QUI IL NE CONNAÎT PAS', () => {
    // Une fausse phrase se croit ; un blanc se remarque et se demande.
    const SRC = lire('js/ui/parcoursClasses.js');
    const i = SRC.indexOf('function elevesHtml');
    const bloc = SRC.slice(i, SRC.indexOf('\n}', SRC.indexOf('.join(\'\');', i)));
    assert.ok(bloc.length > 400, 'tranche vide : le test ne vérifierait rien');
    const nu = bloc.split('\n').map(l => l.replace(/^\s*\/\/.*$/, '')).join('\n');
    assert.ok(!/pc-rien/.test(nu),
        'l\'écran affirme encore que l\'élève n\'a pas commencé');
    // Et il dit OÙ le travail se lit, au lieu de laisser chercher.
    assert.match(nu, /onglet <b>Les bilans<\/b>/);
});
