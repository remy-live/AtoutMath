// LE PARCOURS DE RÉVISION DU BOUTON « M'AMÉLIORER ».
//
// RÉMY : « à la fin d'un parcours, lors du bilan envoyé à l'élève, il faut
// qu'il ait sur son écran un bouton M'améliorer où tu crées un parcours de
// révision, est ce clair ? »
//
// CE QUI SE VÉRIFIE ICI N'EST PAS LE BOUTON — `tools/boutonMAmeliorer.mjs` le
// regarde à l'écran, le clique et ouvre le parcours — MAIS CE QU'IL PROPOSE.
// Un bouton qui ouvre un parcours vide, ou qui propose de réviser un exercice
// que le professeur n'a pas choisi, est pire qu'absent : l'élève l'essaie une
// fois et ne le recliquera jamais.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { etapesDAmelioration, ilYAQuoiAmeliorer } from '../js/core/amelioration.js';

// DES IDENTIFIANTS RÉELS, ET C'EST `epreuveTombe.mjs` QUI L'A IMPOSÉ.
//
// Ma première version nommait la compétence « num.relatifs.oppose », qui
// n'existe pas : `exercisesForSkill` rendait une liste vide, donc le repli
// catalogue ne rendait RIEN, et deux épreuves passaient pour la mauvaise
// raison — dont celle qui prétend garder « la révision ne sort pas des
// exercices de la séance », alors qu'elle ne distinguait rien du tout.
//
// `num.prio.relatifs` est la compétence que `calc-oppose-regle` alimente
// vraiment, et le repli catalogue y rend `calc-prio-relatifs` — un AUTRE
// exercice. C'est exactement l'écart que la sonde avait trouvé, et l'épreuve
// peut enfin le voir.
const EXO = 'calc-oppose-regle';
const AUTRE = 'calc-add';
const COMPETENCE = 'num.prio.relatifs';
const DU_CATALOGUE = 'calc-prio-relatifs';

const ratee = (o = {}) => ({
    questionText: '−(+9) = ?', attendu: '−9', donne: '9',
    skillId: COMPETENCE, skillLabel: 'Priorités et relatifs',
    diagnostic: '', essais: 1, resolue: false,
    seed: 'graine-1', exerciseId: EXO, ...o
});

const competence = (o = {}) => ({
    skillId: COMPETENCE, label: 'Priorités et relatifs',
    questions: 4, credit: 2, reussies: 2, taux: 0.5, ...o
});

const bilan = (o = {}) => ({
    pathName: 'Avant les vacances', mode: 'entrainement',
    aRetravailler: [], parCompetence: [], ...o
});

test('UNE QUESTION RATÉE SE REJOUE À L\'IDENTIQUE, PUIS EN VARIANTE', () => {
    const steps = etapesDAmelioration(bilan({ aRetravailler: [ratee()] }));
    assert.equal(steps.length, 1);
    assert.equal(steps[0].exerciseId, EXO);
    // LA GRAINE EST TOUT L'INTÉRÊT : sans elle, « réviser » veut dire « refaire
    // une question du même exercice », et l'élève ne retrouve jamais celle
    // qu'il n'a pas comprise.
    assert.equal(steps[0].forceSeed, 'graine-1');
    assert.equal(steps[0].nbItems, 2);
});

test('UNE COMPÉTENCE QUI N\'A PAS TENU SUFFIT, MÊME SANS QUESTION RATÉE', () => {
    // Le cas qui n'était pas couvert, et c'est le plus fréquent : l'élève a
    // tout rattrapé au second essai, donc aucune question n'est « ratée », et
    // il sort avec une compétence à 50 %. L'ancien bouton ne paraissait pas.
    const steps = etapesDAmelioration(bilan({
        aRetravailler: [ratee({ resolue: true })],
        parCompetence: [competence()]
    }));
    assert.equal(steps.length, 1);
    assert.equal(steps[0].exerciseId, EXO);
    assert.equal(steps[0].forceSeed, null, 'pas de graine : on retravaille la notion');
    assert.equal(steps[0].nbItems, 5);
});

test('ET LA RÉVISION NE SORT PAS DES EXERCICES DE LA SÉANCE', () => {
    // Mesuré par la sonde avant cette règle : une séance de « la règle du
    // signe » ouvrait une révision de « Priorités et relatifs », que Rémy
    // n'avait pas mise dans sa séance. Le bilan sait sur quel exercice la
    // compétence a été vue ; on le lui demande.
    const steps = etapesDAmelioration(bilan({
        aRetravailler: [ratee({ resolue: true, exerciseId: EXO })],
        parCompetence: [competence()]
    }));
    assert.deepEqual(steps.map(s => s.exerciseId), [EXO]);
    assert.ok(!steps.some(s => s.exerciseId === DU_CATALOGUE),
        'et surtout pas celui que le catalogue aurait servi en premier');
});

test('UNE COMPÉTENCE FAIBLE RALLONGE L\'ÉTAPE, elle ne la double pas', () => {
    // Deux étapes du même exercice à la suite ne diraient que « encore » ;
    // deux questions ne suffisent pas pour une compétence à 50 %.
    const steps = etapesDAmelioration(bilan({
        aRetravailler: [ratee()],
        parCompetence: [competence()]
    }));
    assert.equal(steps.length, 1);
    assert.equal(steps[0].forceSeed, 'graine-1', 'la question ratée reste rejouée');
    assert.equal(steps[0].nbItems, 4);
    assert.equal(steps[0].threshold, 3);
});

test('DEUX QUESTIONS RATÉES DU MÊME EXERCICE NE FONT QU\'UNE ÉTAPE', () => {
    const steps = etapesDAmelioration(bilan({
        aRetravailler: [ratee(), ratee({ seed: 'graine-2' })]
    }));
    assert.equal(steps.length, 1);
});

test('mais deux exercices différents en font deux', () => {
    const steps = etapesDAmelioration(bilan({
        aRetravailler: [ratee(), ratee({ seed: 'g2', exerciseId: AUTRE, skillId: 'calc.add.entiers' })]
    }));
    assert.equal(steps.length, 2);
    assert.deepEqual(steps.map(s => s.exerciseId), [EXO, AUTRE]);
});

test('UN BILAN PARFAIT NE PROPOSE RIEN', () => {
    // « M'améliorer » sous un bilan sans faute ne dit pas « bravo », il dit
    // « ce n'était pas encore assez ». Même raisonnement que `peutRefaire`
    // dans core/runner.js.
    assert.equal(ilYAQuoiAmeliorer(bilan({
        parCompetence: [competence({ taux: 1, credit: 4, reussies: 4 })]
    })), 0);
    assert.equal(ilYAQuoiAmeliorer(bilan()), 0);
    assert.equal(ilYAQuoiAmeliorer(null), 0);
});

test('UNE COMPÉTENCE VUE UNE SEULE FOIS N\'EST NI ACQUISE NI PERDUE', () => {
    // Un taux sur une question est du bruit : la proposer à réviser ferait
    // dire au bouton n'importe quoi au premier coup de malchance.
    assert.equal(ilYAQuoiAmeliorer(bilan({
        parCompetence: [competence({ questions: 1, credit: 0, reussies: 0, taux: 0 })]
    })), 0);
});

test('et un parcours de révision ne dépasse pas huit étapes', () => {
    // Huit étapes de deux questions font déjà un quart d'heure ; au-delà,
    // l'élève ne révise plus, il recommence sa séance.
    const beaucoup = Array.from({ length: 20 }, (_, i) =>
        ratee({ seed: 'g' + i, exerciseId: i % 2 ? EXO : AUTRE, skillId: 'sk_' + i }));
    assert.ok(etapesDAmelioration(bilan({ aRetravailler: beaucoup })).length <= 8);
});

test('EN INTERROGATION AUSSI — « ça ne changera pas la note »', () => {
    // RÉMY a tranché, mot pour mot : « oui mais en interrogation ça ne changera
    // pas la note ».
    //
    // CETTE ÉPREUVE GARDE UNE ABSENCE, et c'est pour cela qu'elle existe. Il y a
    // une règle VOISINE et contraire sur le bilan d'ÉTAPE — « en mode
    // interrogation, il ne faut pas proposer à la fin de refaire l'exercice »,
    // voir `peutRefaire` dans core/runner.js — qui porte sur un bouton qui
    // rejoue l'épreuve NOTÉE. Celui-ci ouvre un parcours d'entraînement à part,
    // après la note. Sans cette épreuve, la prochaine main ajouterait
    // `bilan.mode !== 'evaluation'` en croyant appliquer l'autre règle, et
    // l'élève perdrait le bouton au moment où il a le plus de raisons de
    // vouloir reprendre.
    const b = bilan({
        mode: 'evaluation', note: 8, sur: 20,
        aRetravailler: [ratee()], parCompetence: [competence()]
    });
    assert.ok(ilYAQuoiAmeliorer(b) > 0, 'le bouton paraît');
    const steps = etapesDAmelioration(b);
    assert.equal(steps.length, 1);
    assert.equal(steps[0].forceSeed, 'graine-1', 'et la question du devoir se rejoue');
});
