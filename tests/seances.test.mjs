// Les séances — « ce parcours, à cette classe, ce jour-là ».
//
// Rémy : « je peux associer une classe à un parcours avec un code ou non et les
// élèves de cette classe ont accès au parcours mais il faudrait que le dernier
// en date soit facilement accessible. Sur LaboMEP, on se retrouve parfois avec
// beaucoup de parcours, on est perdu. »

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    ETATS, donnerSeance, etatSeance, clore, rouvrir, poserMot,
    seancesDe, seanceDuMoment, archivees, vivantes, comptePourLaNote, direSeance,
    donnerAuxClasses, classesDuNiveau, niveauxDe, memeLot, concerne, elevesDe, aRattraper
} from '../js/core/seances.js';
import { makePath, makeStep } from '../js/core/path.js';
import { creerClasse } from '../js/core/classes.js';

const CLASSE = creerClasse('6ᵉ A', '6e');
const AUTRE = creerClasse('5ᵉ B', '5e');
const PARCOURS = makePath('Fractions — séance 1', [
    makeStep('calc-poser'), makeStep('calc-poser-division')
]);

const JOUR = 86400000;

test('DONNER UN PARCOURS À UNE CLASSE NE CRÉE PAS UN PARCOURS DE PLUS', () => {
    // C'est la cause du désordre de LaboMEP : un même objet sert de modèle et
    // d'acte, donc la bibliothèque grossit avec l'emploi du temps. Ici la
    // séance est un objet À PART, qui référence sa classe et porte son titre.
    const s = donnerSeance(CLASSE, PARCOURS);
    assert.equal(s.classeId, CLASSE.id);
    assert.equal(s.classeNom, '6ᵉ A');
    assert.equal(s.titre, 'Fractions — séance 1');
    assert.equal(s.pathId, PARCOURS.id);
    assert.ok(s.id && s.id !== PARCOURS.id, 'la séance a sa propre identité');
    // Le même parcours donné à deux classes : deux séances, un seul modèle.
    const t = donnerSeance(AUTRE, PARCOURS);
    assert.notEqual(s.id, t.id);
    assert.equal(s.pathId, t.pathId);
});

test('LA SÉANCE PORTE UNE COPIE DU PARCOURS, PAS UNE RÉFÉRENCE', () => {
    // Le choix le moins évident du module, et le plus important : retoucher un
    // parcours ne doit RIEN changer aux séances déjà données. Les élèves ont
    // travaillé sur ce qu'ils ont eu sous les yeux, et un bilan qui désigne
    // d'autres exercices que ceux qui ont été faits ne veut plus rien dire.
    const modele = makePath('Séance', [makeStep('calc-poser')]);
    const s = donnerSeance(CLASSE, modele);
    assert.equal(s.path.steps.length, 1);

    modele.steps.push(makeStep('calc-poser-division'));
    modele.name = 'Renommé après coup';
    assert.equal(s.path.steps.length, 1, 'la séance a suivi le modèle !');
    assert.equal(s.titre, 'Séance', 'le titre de la séance a été réécrit !');
});

test('TROIS ÉTATS, ET PAS UN DE PLUS', () => {
    const t = Date.now();
    assert.equal(etatSeance(donnerSeance(CLASSE, PARCOURS), t), ETATS.EN_COURS);
    assert.equal(etatSeance(donnerSeance(CLASSE, PARCOURS, { ouvreLe: t + JOUR }), t), ETATS.A_VENIR);
    // Et une séance à venir devient en cours quand son heure arrive.
    const demain = donnerSeance(CLASSE, PARCOURS, { ouvreLe: t + JOUR });
    assert.equal(etatSeance(demain, t + JOUR + 1000), ETATS.EN_COURS);
    assert.equal(etatSeance(clore(demain, t + 2 * JOUR), t + 3 * JOUR), ETATS.CLOSE);
});

test('CLORE HORODATE, ET N\'INTERROMPT RIEN', () => {
    // La clôture ne coupe pas trente écrans à la seconde : elle pose une
    // frontière dans le temps. Une réponse arrivée en retard se range donc
    // toute seule du bon côté de l'heure — c'est ce qui rend le bilan
    // déterministe quel que soit l'ordre d'arrivée.
    const t = Date.now();
    const s = clore(donnerSeance(CLASSE, PARCOURS, { donneeLe: t - 3600000 }), t);
    assert.equal(s.closeLe, t);
    assert.equal(comptePourLaNote(s, t - 60000), true, 'avant la clôture : ça compte');
    assert.equal(comptePourLaNote(s, t + 60000), false, 'après : ça ne compte plus');
    // Le même verdict, que la réponse arrive à l'heure ou trois jours plus tard :
    // c'est l'horodatage de la RÉPONSE qui tranche, pas celui de l'arrivée.
    assert.equal(comptePourLaNote(s, t - 60000), comptePourLaNote(s, t - 60000));
    // Avant l'ouverture non plus.
    const datee = donnerSeance(CLASSE, PARCOURS, { ouvreLe: t });
    assert.equal(comptePourLaNote(datee, t - 1000), false);
});

test('CLORE NE VERROUILLE PAS — la séance reste ouverte à l\'entraînement', () => {
    // Sinon l'élève absent ce jour-là ne pourrait jamais la faire, et celui qui
    // veut réviser non plus. C'est la règle de toute l'application : on peut
    // toujours retravailler, on ne peut jamais rejouer sa note.
    const t = Date.now();
    const s = clore(donnerSeance(CLASSE, PARCOURS), t - 1000);
    assert.equal(etatSeance(s, t), ETATS.CLOSE);
    assert.match(direSeance(s, t), /entraînement/,
        'l\'écran doit dire que la séance reste faisable');
    // Et l'on peut rouvrir : une fin d'heure se décide vite, et parfois mal.
    assert.equal(etatSeance(rouvrir(s), t), ETATS.EN_COURS);
});

test('LE MOT DU PROFESSEUR SE POSE PENDANT LA SÉANCE, ÉLÈVE PAR ÉLÈVE', () => {
    // Rémy : « je ne peux taper une phrase pour chaque élève, mais pourquoi pas
    // personnaliser quand je peux pendant la séance. » D'où un mot au fil de
    // l'eau, et jamais un formulaire de fin d'heure.
    let s = donnerSeance(CLASSE, PARCOURS);
    assert.deepEqual(s.mots, {});
    s = poserMot(s, 'e1', '  Bravo, tu as tenu bon.  ');
    assert.equal(s.mots.e1, 'Bravo, tu as tenu bon.', 'le mot doit être nettoyé');
    s = poserMot(s, 'e2', 'Revois la division.');
    assert.equal(Object.keys(s.mots).length, 2);
    // Un mot vidé s'efface, il ne reste pas comme chaîne vide.
    s = poserMot(s, 'e1', '   ');
    assert.equal('e1' in s.mots, false);
});

test('LA PLUS RÉCENTE D\'ABORD, ET UNE SEULE EN GRAND', () => {
    // Rémy : « il faudrait que le dernier en date soit facilement accessible ».
    // Ce n'est pas « accessible » : c'est tout ce qu'il y a. Une liste, même
    // courte, oblige à choisir — et à choisir on se trompe.
    const t = Date.now();
    const vieille = donnerSeance(CLASSE, PARCOURS, { donneeLe: t - 10 * JOUR, titre: 'Vieille' });
    const recente = donnerSeance(CLASSE, PARCOURS, { donneeLe: t - JOUR, titre: 'Récente' });
    const ailleurs = donnerSeance(AUTRE, PARCOURS, { donneeLe: t, titre: 'Autre classe' });
    const toutes = [vieille, ailleurs, recente];

    assert.deepEqual(seancesDe(toutes, CLASSE.id).map(s => s.titre), ['Récente', 'Vieille']);
    assert.equal(seanceDuMoment(toutes, CLASSE.id, t).titre, 'Récente');
    // La séance d'une autre classe ne remonte jamais ici.
    assert.equal(seancesDe(toutes, CLASSE.id).some(s => s.titre === 'Autre classe'), false);
});

test('UNE SÉANCE À VENIR N\'EST PAS LA SÉANCE DU MOMENT', () => {
    // Même si c'est la plus récente : elle n'existe pas encore pour l'élève, et
    // la mettre en grand lui montrerait une porte fermée à la place de son
    // travail.
    const t = Date.now();
    const enCours = donnerSeance(CLASSE, PARCOURS, { donneeLe: t - JOUR, titre: 'Aujourd\'hui' });
    const plusTard = donnerSeance(CLASSE, PARCOURS,
        { donneeLe: t, ouvreLe: t + 2 * JOUR, titre: 'Vendredi' });
    assert.equal(seanceDuMoment([plusTard, enCours], CLASSE.id, t).titre, 'Aujourd\'hui');
    // Vendredi venu, elle prend la place.
    assert.equal(seanceDuMoment([plusTard, enCours], CLASSE.id, t + 3 * JOUR).titre, 'Vendredi');
});

test('UNE CLASSE SANS SÉANCE NE REND RIEN, sans se plaindre', () => {
    assert.equal(seanceDuMoment([], CLASSE.id), null);
    assert.deepEqual(seancesDe(null, CLASSE.id), []);
    assert.equal(etatSeance(null), null);
});

test('L\'ARCHIVAGE NE DEMANDE RIEN À PERSONNE', () => {
    // C'est le remède au désordre, et il tient en une ligne : personne ne
    // range, donc le rangement ne doit rien demander. Rien n'est supprimé.
    const t = Date.now();
    const vieille = clore(donnerSeance(CLASSE, PARCOURS, { donneeLe: t - 60 * JOUR }), t - 40 * JOUR);
    const fraiche = clore(donnerSeance(CLASSE, PARCOURS, { donneeLe: t - 2 * JOUR }), t - JOUR);
    const ouverte = donnerSeance(CLASSE, PARCOURS, { donneeLe: t - 90 * JOUR });
    const toutes = [vieille, fraiche, ouverte];

    assert.deepEqual(archivees(toutes, { maintenant: t }).map(s => s.id), [vieille.id]);
    // UNE SÉANCE JAMAIS CLOSE NE S'ARCHIVE PAS, si vieille soit-elle : elle est
    // encore le travail du moment de quelqu'un.
    assert.equal(vivantes(toutes, { maintenant: t }).some(s => s.id === ouverte.id), true);
    assert.equal(vivantes(toutes, { maintenant: t }).length, 2);
    // Et rien n'a disparu : l'archive se rouvre.
    assert.equal(toutes.length, 3);
});


// --- À QUI ON DONNE : niveau, classe, groupe ----------------------------------
//
// Rémy : « comment j'attribue mon parcours à un niveau (mes 2 sixièmes) ou à une
// classe ou à un groupe d'élèves ? »

const SIXA = creerClasse('6ᵉ A', '6e');
const SIXC = creerClasse('6ᵉ C', '6e');
const CINQ = creerClasse('5ᵉ B', '5e');
const MES_CLASSES = [SIXA, SIXC, CINQ];

test('UN NIVEAU, C\'EST UN GESTE — pas une portée', () => {
    // UNE SÉANCE PAR CLASSE, et non une séance pour deux : on n'a pas ses deux
    // sixièmes à la même heure, on ne clôt donc pas leur séance ensemble, et un
    // tableau de quarante-six lignes mêlant deux classes ne se balaie plus.
    const sixiemes = classesDuNiveau(MES_CLASSES, '6e');
    assert.deepEqual(sixiemes.map(c => c.nom), ['6ᵉ A', '6ᵉ C']);
    assert.deepEqual(niveauxDe(MES_CLASSES), ['5e', '6e']);

    const lot = donnerAuxClasses(sixiemes, PARCOURS);
    assert.equal(lot.length, 2, 'une séance par classe');
    assert.deepEqual(lot.map(s => s.classeNom), ['6ᵉ A', '6ᵉ C']);
    // Ce qui est commun, c'est le geste : elles le savent, et se retrouvent.
    assert.ok(lot[0].lotId && lot[0].lotId === lot[1].lotId);
    assert.equal(memeLot(lot, lot[0].lotId).length, 2);
    // Chacune garde sa vie propre : clore l'une ne clôt pas l'autre.
    const closeUne = clore(lot[0]);
    assert.ok(closeUne.closeLe && !lot[1].closeLe);
});

test('DONNER À UNE SEULE CLASSE NE CRÉE PAS DE LOT', () => {
    // Un lot d'un seul élément est un mensonge : il ferait croire à un geste
    // groupé, et proposerait « retirer les deux séances » là où il n'y en a
    // qu'une.
    const seul = donnerAuxClasses([SIXA], PARCOURS);
    assert.equal(seul.length, 1);
    assert.equal(seul[0].lotId, null);
    assert.deepEqual(memeLot(seul, null), []);
});

test('UN GROUPE DANS LA CLASSE — la différenciation', () => {
    // « Ces huit-là refont les fractions pendant que les autres avancent. »
    const classe = { ...SIXA, eleves: [
        { id: 'e1', nom: 'Léa' }, { id: 'e2', nom: 'Hugo' }, { id: 'e3', nom: 'Nina' }
    ] };
    const pourTous = donnerSeance(classe, PARCOURS);
    // SANS GROUPE, C'EST TOUTE LA CLASSE — et cela ne coûte rien à écrire :
    // `null` plutôt qu'une liste de trente identifiants à tenir à jour à chaque
    // inscription.
    assert.equal(pourTous.eleveIds, null);
    assert.equal(concerne(pourTous, 'e2'), true);
    assert.equal(elevesDe(pourTous, classe).length, 3);

    const pourDeux = donnerSeance(classe, PARCOURS, { eleveIds: ['e1', 'e3'] });
    assert.deepEqual(pourDeux.eleveIds, ['e1', 'e3']);
    assert.equal(concerne(pourDeux, 'e1'), true);
    assert.equal(concerne(pourDeux, 'e2'), false);
    assert.deepEqual(elevesDe(pourDeux, classe).map(e => e.nom), ['Léa', 'Nina']);
    // Une liste vide vaut « tout le monde » : c'est une case décochée, pas une
    // séance qui ne s'adresse à personne.
    assert.equal(donnerSeance(classe, PARCOURS, { eleveIds: [] }).eleveIds, null);
});

test('LE RATTRAPAGE DÉSIGNE CEUX QUI ONT RATÉ, pas ceux qui n\'ont rien fait', () => {
    // Leur problème n'est pas la notion, c'est qu'ils n'ont pas travaillé :
    // leur donner un rattrapage sur un chapitre qu'ils n'ont pas ouvert n'a
    // aucun sens, et gonflerait le groupe de moitié.
    const bilans = [
        { id: 'a', questions: 40, reussite: 0.35 },
        { id: 'b', questions: 40, reussite: 0.82 },
        { id: 'c', questions: 40, reussite: 0.55 },
        { id: 'd', questions: 0, reussite: 0 }
    ];
    assert.deepEqual(aRattraper(bilans), ['a', 'c']);
    assert.deepEqual(aRattraper(bilans, 0.9), ['a', 'b', 'c']);
    assert.deepEqual(aRattraper([]), []);
});
