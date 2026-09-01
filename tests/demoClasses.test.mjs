// Les classes de démonstration — cinq classes, et des élèves qui ne se
// ressemblent pas.
//
// Rémy : « tu vas me créer des classes fictives avec des élèves fictifs
// (5 classes) et je vais pouvoir lancer des séances fictives et récupérer les
// résultats. »

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { classesDeDemo, CLASSES_DEMO, PROFILS } from '../js/core/demoClasses.js';
import { bilanEleve } from '../js/core/bilan.js';
import { computeMastery } from '../js/core/mastery.js';
import { computeAttempts, computeErrors } from '../js/core/projections.js';
import { EventTypes } from '../js/core/journal.js';

const CLASSES = classesDeDemo({ seed: 'test' });
const tous = CLASSES.flatMap(c => c.eleves);
const parProfil = (id) => tous.filter(e => e.profil === id);

test('CINQ CLASSES, ET DE QUOI REMPLIR UN ÉCRAN', () => {
    assert.equal(CLASSES.length, 5);
    CLASSES.forEach((c, i) => {
        assert.equal(c.nom, CLASSES_DEMO[i].nom);
        assert.equal(c.eleves.length, CLASSES_DEMO[i].eleves);
        assert.equal(c.demo, true, 'une classe de démonstration doit se reconnaître');
        // Deux élèves d'une même classe ne portent pas le même prénom : dans un
        // tableau, deux « Léa » sont indiscernables.
        const noms = c.eleves.map(e => e.nom);
        assert.equal(new Set(noms).size, noms.length, `${c.nom} : un prénom en double`);
        c.eleves.forEach(e => assert.equal(e.demo, true));
    });
    assert.ok(tous.length > 100, `seulement ${tous.length} élèves`);
});

test('LES MÊMES CLASSES À CHAQUE FOIS, POUR LA MÊME GRAINE', () => {
    // Sinon on ne sait jamais, en comparant deux versions d'un écran, si c'est
    // l'affichage qui a changé ou les élèves.
    const a = classesDeDemo({ seed: 'stable' });
    const b = classesDeDemo({ seed: 'stable' });
    assert.deepEqual(a.map(c => c.eleves.map(e => [e.nom, e.profil, e.evenements.length])),
        b.map(c => c.eleves.map(e => [e.nom, e.profil, e.evenements.length])));
    // Et une autre graine donne autre chose.
    const c = classesDeDemo({ seed: 'autre' });
    assert.notDeepEqual(a[0].eleves.map(e => e.nom), c[0].eleves.map(e => e.nom));
});

test('LES SEPT PROFILS SONT TOUS REPRÉSENTÉS', () => {
    // Chacun existe pour une question précise qu'on veut pouvoir poser au
    // tableau ; s'il manque, la question ne se pose plus.
    PROFILS.forEach(p => {
        assert.ok(parProfil(p.id).length > 0, `aucun élève « ${p.id} »`);
    });
    // Et la somme des parts fait bien un tout.
    const somme = PROFILS.reduce((n, p) => n + p.part, 0);
    assert.ok(Math.abs(somme - 1) < 1e-9, `les parts font ${somme}`);
});

test('LES DONNÉES SONT DES ÉVÉNEMENTS, PAS DES BILANS', () => {
    // C'est ce qui garantit qu'on regarde le vrai écran et pas une maquette :
    // maîtrise, notes et carnet d'erreurs sont recalculés par le code
    // ordinaire. Si une phrase est mal tournée ici, elle le sera aussi devant
    // une vraie classe.
    const e = parProfil('ordinaire')[0];
    const types = new Set(e.evenements.map(x => x.type));
    assert.ok(types.has(EventTypes.ATTEMPT), 'il faut des tentatives');
    e.evenements.forEach(x => {
        assert.ok(x.id && x.type && typeof x.ts === 'number' && x.payload,
            'un événement mal formé');
    });
    // Les tentatives se relisent par les projections ordinaires.
    const attempts = computeAttempts(e.evenements);
    assert.ok(attempts.length > 10);
    attempts.forEach(a => {
        assert.ok(a.skillId, 'une tentative sans compétence ne nourrit pas la maîtrise');
        assert.equal(typeof a.correct, 'boolean');
        assert.ok(a.msElapsed > 0);
    });
    assert.ok(computeMastery(attempts).size > 0, 'la maîtrise doit se calculer');
});

test('L\'ABSENT N\'A RIEN, ET C\'EST UNE INFORMATION', () => {
    // La question : est-ce qu'une ligne vide se voit du premier coup d'œil, ou
    // se confond-elle avec une ligne faible ?
    const absents = parProfil('absent');
    absents.forEach(e => assert.equal(e.evenements.length, 0));
    assert.match(bilanEleve(absents[0].evenements).phrase || '', /pas encore travaillé/i);
});

test('CELUI QUI ABANDONNE A MOINS D\'EXERCICES, PAS DE MOINS BONS RÉSULTATS', () => {
    // C'est la distinction la plus importante du tableau : « il a raté » et
    // « il n'a pas fini » sont deux situations opposées, qu'un pourcentage seul
    // mélange. On vérifie ici que les données les séparent — reste à l'écran de
    // le montrer.
    const abandons = parProfil('abandon');
    const entiers = parProfil('ordinaire');
    const competences = (e) => new Set(computeAttempts(e.evenements).map(a => a.skillId)).size;
    const moyAbandon = abandons.reduce((n, e) => n + competences(e), 0) / abandons.length;
    const moyEntier = entiers.reduce((n, e) => n + competences(e), 0) / entiers.length;
    assert.ok(moyAbandon < moyEntier - 1,
        `abandon : ${moyAbandon.toFixed(1)} compétences contre ${moyEntier.toFixed(1)}`);
});

test('CELUI QUI S\'ACCROCHE SE VOIT DANS LES ESSAIS, PAS DANS LE SCORE', () => {
    // Son score final ressemble à celui du rapide ; son chemin non. C'est
    // l'effort qu'on veut rendre visible.
    const accroches = parProfil('accroche');
    const rapides = parProfil('rapide');
    const secondsEssais = (e) => computeAttempts(e.evenements).filter(a => a.attemptIndex > 0).length;
    const indices = (e) => e.evenements.filter(x => x.type === EventTypes.HINT_USED).length;
    const moy = (list, f) => list.reduce((n, e) => n + f(e), 0) / list.length;
    assert.ok(moy(accroches, secondsEssais) > 3, 'il doit y avoir des seconds essais');
    assert.equal(moy(rapides, secondsEssais), 0, 'le rapide ne s\'y reprend jamais');
    assert.ok(moy(accroches, indices) > moy(rapides, indices) * 3,
        'celui qui s\'accroche prend nettement plus d\'indices');
});

test('LE DÉSÉQUILIBRÉ EST BON QUELQUE PART ET PERDU AILLEURS', () => {
    // C'est le SEUL cas qui justifie un bilan par compétence : sa moyenne est
    // correcte et ne dit rien, sa ligne de pastilles dit tout.
    parProfil('desequilibre').forEach(e => {
        const m = computeMastery(computeAttempts(e.evenements));
        const GEO = ['mes.aire.rectangle', 'geo.repere.coord'];
        const geo = [...m.values()].filter(x => GEO.includes(x.skillId));
        const autres = [...m.values()].filter(x => !GEO.includes(x.skillId));
        if (!geo.length || !autres.length) return;
        const moyGeo = geo.reduce((n, x) => n + x.successRate, 0) / geo.length;
        const moyAutres = autres.reduce((n, x) => n + x.successRate, 0) / autres.length;
        assert.ok(moyAutres - moyGeo > 0.3,
            `${e.nom} : géométrie ${(moyGeo * 100).toFixed(0)} % contre ${(moyAutres * 100).toFixed(0)} %`);
    });
});

test('L\'ERREUR RÉPÉTÉE PORTE SUR LA MÊME QUESTION', () => {
    // Sinon ce n'est pas une erreur répétée, c'est de l'inattention — et le
    // carnet d'erreurs n'a rien à en dire. C'est la seule faute qui vaille
    // qu'on s'arrête.
    parProfil('repete').forEach(e => {
        const erreurs = computeErrors(e.evenements);
        const recurrente = erreurs.find(x => (x.count || x.occurrences || 1) > 2
            || String(x.questionText || '').includes('revient'));
        assert.ok(recurrente, `${e.nom} : aucune erreur récurrente au carnet`);
    });
});

test('UNE SÉANCE FICTIVE RESSEMBLE À UNE HEURE DE COURS', () => {
    // Trente élèves qui démarrent à la même seconde ne ressemblent à aucune
    // heure de cours, et un tableau trié par l'heure de départ y perdrait tout
    // son sens.
    const c = CLASSES[0];
    const departs = c.eleves.filter(e => e.evenements.length).map(e => e.evenements[0].ts);
    assert.ok(new Set(departs).size > departs.length * 0.8, 'les départs doivent être étalés');
    // Et les événements d'un élève sont dans l'ordre du temps.
    c.eleves.forEach(e => {
        for (let i = 1; i < e.evenements.length; i++) {
            assert.ok(e.evenements[i].ts >= e.evenements[i - 1].ts,
                `${e.nom} : événements dans le désordre`);
        }
    });
});


// --- CE QUE LES CLASSES FICTIVES ONT RÉVÉLÉ -----------------------------------
//
// Ces trois-là ne sont pas des tests de la démonstration : ce sont les défauts
// du BILAN que les classes fictives ont fait apparaître, et qu'on garde
// corrigés. C'est à cela que sert un jeu d'essai réaliste — les trouver avant
// une vraie classe, pas après.

test('LA SÉANCE NON TERMINÉE SE DIT AVANT LE POURCENTAGE', () => {
    // Un élève arrêté au deuxième exercice sur six et un élève qui rate les six
    // affichent le même pourcentage. Ce sont deux situations opposées : l'un a
    // besoin qu'on l'aide à travailler, l'autre qu'on lui réexplique. Avant
    // correction, l'écran les lisait pareil.
    parProfil('abandon').forEach(e => {
        const b = bilanEleve(e.evenements);
        assert.equal(b.inacheve, true, `${e.nom} : l'abandon doit se voir`);
        assert.match(b.phrase, /^Séance non terminée/,
            `${e.nom} : l'arrêt doit se dire EN PREMIER — ${b.phrase}`);
    });
    // Et celui qui va au bout ne porte pas cette mention.
    parProfil('rapide').forEach(e => {
        const b = bilanEleve(e.evenements);
        assert.equal(b.inacheve, false, `${e.nom} est allé au bout`);
        assert.equal(/non terminée/.test(b.phrase), false);
    });
});

test('L\'ERREUR RÉCURRENTE REMONTE DANS LA PHRASE, avec sa question', () => {
    // Avant correction elle se noyait : le carnet identifie une erreur par le
    // couple exercice + graine, et la fabrique changeait d'exercice à chaque
    // étape — huit occurrences comptaient pour huit erreurs distinctes.
    parProfil('repete').forEach(e => {
        const b = bilanEleve(e.evenements);
        assert.ok(b.tetu, `${e.nom} : aucune erreur têtue repérée`);
        assert.ok(b.tetu.count >= 3, `${e.nom} : ${b.tetu.count} occurrences seulement`);
        assert.match(b.phrase, /La même erreur revient/);
        // Et le texte de la question est celui d'une vraie question, pas une
        // étiquette : c'est lui que le professeur lit pour savoir quoi reprendre.
        assert.ok(b.tetu.questionText && b.tetu.questionText.length > 5,
            `question peu parlante : « ${b.tetu.questionText} »`);
    });
});

test('L\'EFFORT SE DIT, ET SEULEMENT QUAND IL EST NET', () => {
    // Le score final de celui qui s'accroche ressemble à celui du rapide ; son
    // chemin non, et c'est le chemin qui dit s'il faut lui donner la suite.
    parProfil('accroche').forEach(e => {
        const b = bilanEleve(e.evenements);
        assert.ok(b.reprises > 0, `${e.nom} : aucune reprise`);
        assert.match(b.phrase, /s'accrochant/, `${e.nom} — ${b.phrase}`);
    });
    // Le rapide ne doit JAMAIS porter cette mention : ce serait lui prêter un
    // effort qu'il n'a pas fourni, et fausser la décision qui suit.
    parProfil('rapide').forEach(e => {
        assert.equal(/s'accrochant/.test(bilanEleve(e.evenements).phrase), false, e.nom);
    });
});

test('LES COMPÉTENCES SONT DE VRAIES COMPÉTENCES DU CATALOGUE', async () => {
    // Le premier jet en avait inventé : les bilans se calculaient, et l'écran
    // affichait « geo.aire » en en-tête de colonne au lieu de « Aire d'un
    // rectangle ». Une donnée d'essai qui ne ressemble pas à la vraie fait
    // croire à un défaut d'affichage qui n'en est pas un.
    const { SKILLS } = await import('../js/data/skills.js');
    const ids = new Set(tous.flatMap(e => e.evenements)
        .map(x => x.payload.skillId).filter(Boolean));
    assert.ok(ids.size >= 5, `seulement ${ids.size} compétences`);
    ids.forEach(id => assert.ok(SKILLS[id], `compétence inventée : ${id}`));
});
