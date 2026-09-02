// Le bilan borné à une séance — « ce qu'ils ont compris cette heure-là ».
//
// Rémy : « et donc pour le moment le bilan par classe, c'est tout ce qu'ils ont
// fait donc ça pourra être très lourd ».

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { EventTypes as A } from '../js/core/journal.js';
import { donnerSeance, clore } from '../js/core/seances.js';
import { bilanClasse } from '../js/core/bilan.js';
import {
    exercicesDe, runsDeLaSeance, evenementsDeLaSeance, aTravaille,
    bilanEleveSeance, bilanSeance
} from '../js/core/bilanSeance.js';

const H = 3600000;
const T0 = Date.parse('2026-03-10T08:00:00Z');

const parcours = {
    id: 'p_geo', name: 'Les angles',
    steps: [
        { stepId: 'a', exerciseId: 'geo-angles-nommer' },
        { stepId: 'b', exerciseId: 'geo-angles-manquants' }
    ]
};

/** Un run complet : démarrage, quelques réponses, fin. */
function run({ runId, pathId, debut, skill, exerciseId, justes, faux }) {
    const ev = [];
    let ts = debut;
    ev.push({ id: runId + '_s', type: A.RUN_STARTED, ts, payload: { runId, pathId } });
    for (let i = 0; i < justes + faux; i++) {
        ts += 30000;
        ev.push({
            id: `${runId}_a${i}`, type: A.ATTEMPT, ts,
            payload: {
                runId, exerciseId, skillId: skill, itemSeed: 'q' + i,
                correct: i < justes, attemptIndex: 0, msElapsed: 12000
            }
        });
    }
    ev.push({ id: runId + '_f', type: A.RUN_FINISHED, ts: ts + 1000, payload: { runId, pathId } });
    return ev;
}

/** Une classe de deux élèves, chacun avec son journal. */
function classeDeux(evA, evB) {
    return {
        id: 'c1', nom: '5eB', niveau: '5e',
        eleves: [
            { id: 'e1', nom: 'Ana', evenements: evA },
            { id: 'e2', nom: 'Bruno', evenements: evB }
        ]
    };
}

test('LE BILAN DE SÉANCE IGNORE CE QUI A ÉTÉ FAIT AVANT ET APRÈS', () => {
    // C'EST LA DEMANDE, MOT POUR MOT : sans cette coupe, le tableau de mars
    // contient encore les fractions d'octobre, et l'on ne voit plus l'heure
    // qu'on vient de faire.
    const seance = donnerSeance({ id: 'c1', nom: '5eB' }, parcours,
        { ouvreLe: T0, donneeLe: T0 });

    const avant = run({
        runId: 'r_octobre', pathId: 'p_geo', debut: T0 - 90 * 24 * H,
        skill: 'geo.angles.mesure', exerciseId: 'geo-angles-nommer', justes: 0, faux: 10
    });
    const pendant = run({
        runId: 'r_seance', pathId: 'p_geo', debut: T0 + H,
        skill: 'geo.angles.mesure', exerciseId: 'geo-angles-nommer', justes: 9, faux: 1
    });

    const tout = [...avant, ...pendant];
    const coupe = evenementsDeLaSeance(seance, tout);

    assert.equal(coupe.length, pendant.length, 'la séance ne garde que son propre run');
    const b = bilanEleveSeance(seance, { id: 'e1', nom: 'Ana', evenements: tout });
    assert.equal(b.questions, 10);
    assert.ok(b.reussite > 0.8, `réussite ${b.reussite} — octobre s'est invité`);

    // Et le bilan GÉNÉRAL, lui, voit bien les vingt questions : on n'a rien
    // effacé, on a seulement cadré.
    assert.equal(bilanEleveSeance({ ...seance, ouvreLe: null }, { evenements: tout }).questions, 20);
});

test('UN AUTRE PARCOURS PENDANT L\'HEURE NE COMPTE PAS', () => {
    // L'élève qui a fini et qui s'entraîne aux fractions en attendant les
    // autres ne doit pas faire remonter une colonne « fractions » dans le
    // bilan d'une séance de géométrie.
    const seance = donnerSeance({ id: 'c1' }, parcours, { ouvreLe: T0 });
    const geo = run({
        runId: 'r1', pathId: 'p_geo', debut: T0 + H,
        skill: 'geo.angles.mesure', exerciseId: 'geo-angles-nommer', justes: 8, faux: 0
    });
    const frac = run({
        runId: 'r2', pathId: 'p_fractions', debut: T0 + H + 1800000,
        skill: 'num.frac.simplifier', exerciseId: 'frac-simplifier', justes: 1, faux: 7
    });

    const b = bilanEleveSeance(seance, { evenements: [...geo, ...frac] });
    assert.equal(b.questions, 8);
    assert.equal(b.competences.some(c => c.skillId === 'num.frac.simplifier'), false,
        'les fractions se sont invitées dans le bilan de géométrie');
});

test('LE RUN NE SE COUPE PAS EN DEUX — sinon « fini » devient « abandonné »', () => {
    // LE PIÈGE DU DÉCOUPAGE PAR HORODATAGE. Si l'on filtrait événement par
    // événement, un élève qui commence à moins cinq et termine après la
    // clôture perdrait son RUN_FINISHED : le bilan le compterait « arrêté en
    // chemin » alors qu'il a tout fait. On décide sur le run, pas sur l'événement.
    let seance = donnerSeance({ id: 'c1' }, parcours, { ouvreLe: T0 });
    seance = clore(seance, T0 + H);

    const tardif = run({
        runId: 'r_tardif', pathId: 'p_geo', debut: T0 + H - 60000,
        skill: 'geo.angles.mesure', exerciseId: 'geo-angles-nommer', justes: 6, faux: 0
    });
    // Ses dernières réponses tombent APRÈS la clôture.
    assert.ok(tardif[tardif.length - 1].ts > seance.closeLe);

    const coupe = evenementsDeLaSeance(seance, tardif);
    assert.equal(coupe.length, tardif.length, 'le run a été amputé');
    assert.equal(coupe.some(e => e.type === A.RUN_FINISHED), true);
    assert.equal(bilanEleveSeance(seance, { evenements: tardif }).inacheve, false,
        'le run tronqué se lirait « arrêté en chemin »');

    // En revanche, celui qui S'Y MET après la clôture ne compte pas : il
    // s'entraîne, il ne fait plus la séance.
    const apres = run({
        runId: 'r_apres', pathId: 'p_geo', debut: T0 + 3 * H,
        skill: 'geo.angles.mesure', exerciseId: 'geo-angles-nommer', justes: 6, faux: 0
    });
    assert.equal(evenementsDeLaSeance(seance, apres).length, 0);
});

test('LA SÉANCE DONNÉE À UN GROUPE N\'AFFICHE QUE CE GROUPE', () => {
    // Huit élèves sur vingt-six, et dix-huit lignes vides feraient croire à
    // dix-huit absents. La différenciation doit se lire, pas s'excuser.
    const evA = run({
        runId: 'r1', pathId: 'p_geo', debut: T0 + H,
        skill: 'geo.angles.mesure', exerciseId: 'geo-angles-nommer', justes: 5, faux: 3
    });
    const classe = classeDeux(evA, []);
    const seance = donnerSeance(classe, parcours, { ouvreLe: T0, eleveIds: ['e1'] });

    const b = bilanSeance(seance, classe);
    assert.equal(b.attendus, 1);
    assert.deepEqual(b.eleves.map(e => e.nom), ['Ana']);

    // Sans groupe, toute la classe.
    const pleine = donnerSeance(classe, parcours, { ouvreLe: T0 });
    assert.equal(bilanSeance(pleine, classe).attendus, 2);
});

test('LE BILAN DIT COMBIEN ONT COMMENCÉ, ce qui n\'est pas combien ont répondu', () => {
    // Ouvrir sans rien valider et ne pas ouvrir du tout sont deux situations
    // différentes : l'une est un blocage, l'autre une absence.
    const evA = run({
        runId: 'r1', pathId: 'p_geo', debut: T0 + H,
        skill: 'geo.angles.mesure', exerciseId: 'geo-angles-nommer', justes: 4, faux: 4
    });
    // Bruno a ouvert la séance et n'a rien répondu.
    const evB = [{ id: 'x', type: A.RUN_STARTED, ts: T0 + H, payload: { runId: 'r2', pathId: 'p_geo' } }];

    const classe = classeDeux(evA, evB);
    const seance = donnerSeance(classe, parcours, { ouvreLe: T0 });
    const b = bilanSeance(seance, classe);

    assert.equal(b.attendus, 2);
    assert.equal(b.commences, 2, 'Bruno a bien ouvert');
    assert.equal(b.sansTravail, 1, 'Bruno n\'a rien répondu');
});

test('LES EXERCICES DE LA SÉANCE VIENNENT DE SA COPIE DU PARCOURS', () => {
    // La séance porte une COPIE : retoucher le parcours ensuite ne doit pas
    // réécrire ce que la classe a eu sous les yeux.
    const seance = donnerSeance({ id: 'c1' }, parcours, { ouvreLe: T0 });
    parcours.steps.push({ stepId: 'c', exerciseId: 'geo-pythagore' });

    assert.deepEqual([...exercicesDe(seance)].sort(),
        ['geo-angles-manquants', 'geo-angles-nommer']);
    parcours.steps.pop();
});

test('« A-T-IL TRAVAILLÉ » DÉCIDE D\'AFFICHER UN LIEN BILAN', () => {
    const seance = donnerSeance({ id: 'c1' }, parcours, { ouvreLe: T0 });
    assert.equal(aTravaille(seance, []), false);
    assert.equal(runsDeLaSeance(seance, []).size, 0);
    const ev = run({
        runId: 'r1', pathId: 'p_geo', debut: T0 + H,
        skill: 'geo.angles.mesure', exerciseId: 'geo-angles-nommer', justes: 2, faux: 0
    });
    assert.equal(aTravaille(seance, ev), true);

    // Un journal vide ne fait rien planter, et un `seance` absent non plus.
    assert.equal(aTravaille(null, ev), false);
    assert.deepEqual(evenementsDeLaSeance(null, ev), []);
});

test('LE MOT DU PROFESSEUR SUIT L\'ÉLÈVE DANS SON BILAN', () => {
    // Rémy pose le mot pendant la séance ; il n'a d'intérêt que là où on relit
    // l'élève.
    const evA = run({
        runId: 'r1', pathId: 'p_geo', debut: T0 + H,
        skill: 'geo.angles.mesure', exerciseId: 'geo-angles-nommer', justes: 7, faux: 1
    });
    const classe = classeDeux(evA, []);
    let seance = donnerSeance(classe, parcours, { ouvreLe: T0 });
    seance = { ...seance, mots: { e1: 'Beaucoup mieux qu\'à la rentrée.' } };

    const b = bilanSeance(seance, classe);
    assert.equal(b.eleves.find(e => e.id === 'e1').mot, 'Beaucoup mieux qu\'à la rentrée.');
    assert.equal(b.eleves.find(e => e.id === 'e2').mot, null);
    assert.equal(bilanEleveSeance(seance, classe.eleves[0]).mot,
        'Beaucoup mieux qu\'à la rentrée.');
});

test('LE TABLEAU DE SÉANCE EST COURT — c\'est tout l\'intérêt', () => {
    // MESURÉ, ET C'EST LA RAISON D'ÊTRE DU MODULE : le même élève, deux
    // colonnes dans sa séance et sept dans son année.
    const seance = donnerSeance({ id: 'c1', nom: '5eB' }, parcours, { ouvreLe: T0 });
    const annee = [];
    // Les quinze jours qui précèdent, cinq notions sans rapport avec l'heure du jour.
    const familles = ['num.add.entiers', 'num.mult.sens', 'num.div.quotient',
        'mes.aire.rectangle', 'geo.repere.coord'];
    familles.forEach((sk, i) => {
        annee.push(...run({
            runId: 'vieux' + i, pathId: 'p_autre', debut: T0 - (3 + i * 2) * 24 * H,
            skill: sk, exerciseId: 'ex' + i, justes: 6, faux: 2
        }));
    });
    const jour = [
        ...run({
            runId: 'j1', pathId: 'p_geo', debut: T0 + H,
            skill: 'geo.angles.mesure', exerciseId: 'geo-angles-nommer', justes: 6, faux: 2
        }),
        ...run({
            runId: 'j2', pathId: 'p_geo', debut: T0 + H + 1200000,
            skill: 'geo.angles.relations', exerciseId: 'geo-angles-manquants', justes: 3, faux: 5
        })
    ];

    const classe = {
        id: 'c1', nom: '5eB', niveau: '5e',
        eleves: [{ id: 'e1', nom: 'Ana', evenements: [...annee, ...jour] }]
    };

    // ON FIGE « MAINTENANT » AU LENDEMAIN DE LA SÉANCE : la maîtrise
    // s'émousse avec le temps, et un test qui lit l'horloge réelle raconterait
    // autre chose dans six mois.
    const apres = T0 + 24 * H;
    const large = bilanClasse(classe, apres);
    const court = bilanSeance(seance, classe, apres);
    assert.ok(large.competences.length >= 7, `année : ${large.competences.length} colonnes`);
    assert.equal(court.competences.length, 2, `séance : ${court.competences.length} colonnes`);
    assert.deepEqual(court.competences.map(c => c.skillId).sort(),
        ['geo.angles.mesure', 'geo.angles.relations']);
});


// --- LE RATTRAPAGE NE MÉLANGE PAS SES COMPTES -------------------------------
//
// Rémy : « ceux qui ont raté refont ça pendant que les autres avancent ». Le
// rattrapage porte une COPIE du parcours avec un identifiant neuf, et c'est
// cette copie qui rend ses comptes lisibles : un rattrapage qui partagerait le
// `pathId` de la séance d'origine ramasserait le travail de celle-ci et
// afficherait comme « refait » ce qui n'a jamais été refait. C'est exactement
// la mesure sur laquelle le professeur décide qui il revoit jeudi.

test('LE BILAN D\'UN RATTRAPAGE NE RAMASSE PAS LE TRAVAIL DE LA SÉANCE D\'ORIGINE', () => {
    const origine = donnerSeance({ id: 'c1', nom: '5e B' }, parcours);
    // Le travail de la séance d'origine : deux justes, six faux.
    const eleve = { id: 'e1', nom: 'Zoé', evenements: run({
        runId: 'r1', pathId: parcours.id, debut: T0 + H,
        skill: 'num.prio', exerciseId: 'geo-angles-nommer', justes: 2, faux: 6
    }) };

    // Le rattrapage : même contenu, identifiant neuf.
    const copie = { ...parcours, id: 'p_rattrapage', name: 'Les angles — rattrapage' };
    const rattrapage = donnerSeance({ id: 'c1', nom: '5e B' }, copie, { eleveIds: ['e1'] });

    // Rien n'a encore été refait : le bilan du rattrapage doit être VIDE.
    assert.equal(aTravaille(rattrapage, eleve.evenements), false);
    assert.equal(bilanEleveSeance(rattrapage, eleve).questions, 0);
    // Et celui de l'origine, lui, compte bien ses huit questions.
    assert.equal(bilanEleveSeance(origine, eleve).questions, 8);

    // L'élève refait le travail : c'est le rattrapage qui bouge, pas l'origine.
    eleve.evenements = [...eleve.evenements, ...run({
        runId: 'r2', pathId: copie.id, debut: T0 + 48 * H,
        skill: 'num.prio', exerciseId: 'geo-angles-nommer', justes: 7, faux: 1
    })];
    assert.equal(bilanEleveSeance(rattrapage, eleve).questions, 8);
    assert.equal(bilanEleveSeance(rattrapage, eleve).reussite, 7 / 8);
    assert.equal(bilanEleveSeance(origine, eleve).questions, 8);
    assert.equal(bilanEleveSeance(origine, eleve).reussite, 2 / 8);
});
