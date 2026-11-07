// LA FICHE DE REPRISE — ce qui doit rester vrai d'une feuille à l'autre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, devant la maquette : « Oui c'est génial ». Vingt-six feuilles
// différentes, fabriquées depuis vingt-six journaux.
//
// CE QU'ON GARDE ICI N'EST PAS LA MISE EN PAGE — elle se regarde, et
// `tools/reprisesEnPdf.mjs` la rend en images. Ce sont les trois choses qui se
// perdent en silence, et qui font qu'une feuille de reprise se retourne contre
// l'élève :
//
//   · ON REPREND CE QU'ON A MESURÉ. Une notion vue deux fois n'est pas ratée,
//     elle est inconnue — et un élève absent recevrait une feuille sur des
//     notions qu'il n'a jamais ouvertes.
//   · ON N'ANNONCE QUE CE QU'ON PORTE. Une feuille qui promet « l'aire d'un
//     rectangle » et n'en porte aucune question dit à l'élève de reprendre
//     quelque chose qu'il ne trouvera nulle part.
//   · ET L'EXERCICE CHOISI SAIT S'IMPRIMER. C'est la cause du précédent, et
//     elle est invisible : `firstExerciseForSkill` rend un jeu d'écran une
//     fois sur deux.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { getExerciseById } from '../js/data/catalog.js';
import { generateurDeFiche } from '../js/core/registry.js';
import { exercicePourLaFeuille } from '../js/core/amelioration.js';
import {
    MAX_NOTIONS, erreurARappeler, notionsAReprendre, parcoursDeReprise,
    phraseDeReprise, reprisesDeLaClasse
} from '../js/core/reprise.js';

/** Un élève de bilan, réduit à ce que la reprise lit. */
const eleve = (o = {}) => ({
    id: 'e1', nom: 'Louis', questions: 40,
    competences: [
        { skillId: 'a', nom: 'Aire d\'un rectangle', taux: 0.2, essais: 8, fiable: true },
        { skillId: 'b', nom: 'Additionner des entiers', taux: 0.45, essais: 10, fiable: true },
        { skillId: 'c', nom: 'Diviser', taux: 0.5, essais: 7, fiable: true },
        { skillId: 'd', nom: 'Multiplier', taux: 0.55, essais: 9, fiable: true },
        { skillId: 'e', nom: 'Tout bon', taux: 0.95, essais: 12, fiable: true }
    ],
    ...o
});

const trouve = (id) => `exo-${id}`;

test('ON NE REPREND QUE CE QU\'ON A MESURÉ', () => {
    // UNE NOTION VUE DEUX FOIS N'EST PAS RATÉE, ELLE EST INCONNUE. `fiable`
    // est le drapeau que `core/bilan.js` pose quand il y a eu assez de
    // questions pour juger. Sans ce filtre, l'élève absent à la moitié de la
    // séance reçoit une feuille sur des notions qu'il n'a jamais ouvertes —
    // et il la lit comme un échec.
    const b = eleve({ competences: [
        { skillId: 'x', nom: 'Vue deux fois', taux: 0, essais: 2, fiable: false },
        { skillId: 'y', nom: 'Vraiment ratée', taux: 0.3, essais: 9, fiable: true }
    ] });
    const n = notionsAReprendre(b);
    assert.deepEqual(n.map(x => x.skillId), ['y']);
});

test('ET LA PLUS FRAGILE PASSE DEVANT', () => {
    const n = notionsAReprendre(eleve());
    assert.deepEqual(n.map(x => x.skillId), ['a', 'b', 'c']);
    assert.ok(n.length <= MAX_NOTIONS,
        'une feuille de six notions est une feuille qu\'on repousse');
    // Celle qui est réussie n'y est pas.
    assert.ok(!n.some(x => x.skillId === 'e'));
});

test('LA PHRASE DU HAUT DIT CE QU\'ON NE REPREND PAS', () => {
    // « Le reste est acquis » transforme une feuille de rattrapage en feuille
    // de finition. La différence tient en une proposition, et c'est elle qui
    // décide si l'élève la fait.
    const p = phraseDeReprise([{ nom: 'L\'aire' }, { nom: 'Les additions' }]);
    assert.match(p, /deux choses, et deux seulement/);
    assert.match(p, /L'aire et Les additions/);
    assert.match(p, /acquis/);
    // UNE SEULE NOTION NE S'ÉCRIT PAS « une choses ».
    assert.match(phraseDeReprise([{ nom: 'L\'aire' }]), /une seule chose : L'aire/);
    assert.equal(phraseDeReprise([]), '');
});

test('L\'ERREUR N\'EST RAPPELÉE QUE SI ELLE CONCERNE LA FEUILLE', () => {
    // Rappeler une erreur de géométrie en tête d'une feuille de calcul mental
    // n'aide personne, et donne l'impression d'une machine qui recopie.
    const tetu = { skillId: 'a', questionText: '12 m sur 4 m', given: '32 m',
        expected: '48 m²', count: 6 };
    const notions = [{ skillId: 'a' }];
    assert.ok(erreurARappeler({ tetu }, notions));
    assert.equal(erreurARappeler({ tetu }, [{ skillId: 'zzz' }]), null);
    // Et une erreur sans ce que l'élève avait répondu ne se rappelle pas : le
    // souvenir est dans les CHIFFRES, pas dans l'étiquette.
    assert.equal(erreurARappeler({ tetu: { ...tetu, given: '' } }, notions), null);
});

test('UNE NOTION SANS EXERCICE SORT DE LA FEUILLE', () => {
    // C'est le défaut qui s'est produit : la feuille annonçait « Aire d'un
    // rectangle » et ne portait que les additions. Mieux vaut une notion de
    // moins qu'une promesse sans question en face.
    const f = parcoursDeReprise(eleve(), (id) => (id === 'a' ? null : `exo-${id}`));
    assert.ok(!f.notions.some(n => n.skillId === 'a'));
    assert.match(f.phrase, /Additionner des entiers/);
    assert.ok(!/Aire/.test(f.phrase), 'la phrase promet une notion absente');
    // Et si AUCUNE notion n'a d'exercice, il n'y a pas de feuille du tout.
    assert.equal(parcoursDeReprise(eleve(), () => null), null);
});

test('CHAQUE ÉTAPE PORTE SA NOTION, POUR QUE LA FEUILLE SACHE CE QU\'ELLE DIT', () => {
    const f = parcoursDeReprise(eleve(), trouve);
    assert.equal(f.steps.length, f.notions.length);
    for (const s of f.steps) {
        assert.ok(s.notion, 'sans `notion`, la feuille ne peut pas recomposer sa phrase');
        assert.ok(s.nbItems > 0);
    }
    assert.deepEqual(f.steps.map(s => s.notion), f.notions.map(n => n.nom));
});

test('ET L\'ÉLÈVE QUI N\'A RIEN DÉPOSÉ N\'EST PAS CELUI QUI A TOUT RÉUSSI', () => {
    // Deux nouvelles différentes, et le professeur doit les distinguer : une
    // fonction qui ne rendrait que les feuilles faites laisserait croire que
    // la classe en compte autant.
    const classe = [
        eleve(),
        { id: 'e2', nom: 'Jade', questions: 30, competences: [
            { skillId: 'z', nom: 'Tout bon', taux: 0.95, essais: 9, fiable: true }] },
        { id: 'e3', nom: 'Ethan', questions: 0, competences: [] }
    ];
    const { fiches, ecartes } = reprisesDeLaClasse(classe, trouve);
    assert.equal(fiches.length, 1);
    assert.deepEqual(ecartes.map(e => `${e.nom} : ${e.pourquoi}`),
        ['Jade : rien à reprendre', 'Ethan : n\'a rien déposé']);
});

test('L\'EXERCICE D\'UNE FEUILLE SAIT S\'IMPRIMER', () => {
    // LE DÉFAUT ÉTAIT INVISIBLE : `firstExerciseForSkill` rend le premier venu,
    // ce qui est juste à l'écran. MESURÉ sur la feuille de Louis, « Aire d'un
    // rectangle » donnait `calc-arpenteurs`, un jeu d'écran — et la notion
    // disparaissait de la feuille sans un mot.
    for (const skill of ['mes.aire.rectangle', 'num.add.entiers', 'geo.repere.coord',
        'num.div.quotient']) {
        const id = exercicePourLaFeuille(skill);
        assert.ok(id, `${skill} : aucun exercice imprimable`);
        const exo = getExerciseById(id);
        assert.ok(exo, `${skill} → ${id} n'est pas au catalogue`);
        const gen = generateurDeFiche(exo);
        assert.ok((gen && gen.ecrit) || exo.printable,
            `${skill} → ${id} ne sait pas s'imprimer`);
    }
    assert.equal(exercicePourLaFeuille('skill.qui.nexiste.pas'), null);
    assert.equal(exercicePourLaFeuille(''), null);
});
