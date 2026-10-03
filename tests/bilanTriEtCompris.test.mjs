// LE BILAN SE RANGE PAR NOM, ET IL DIT AUSSI CE QUI TIENT.
//
// DEUX DEMANDES DE LA MÊME PHRASE, et c'est la même phrase qui les lie —
// RÉMY : « dans le bilan pouvoir trier par nom […] et au début du bilan, mettre
// ce qu'il faut revoir et ce qui a été compris pour la classe ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CE QUI SE VÉRIFIE ICI, ET QUI NE SE VOIT PAS À L'ŒIL :
//
//   · QUE LE TRI PAR NOM SOIT STABLE. Il y a deux Lucas dans la classe de
//     Rémy. Sans départage, `localeCompare` rend 0 et l'ordre des deux lignes
//     retombe sur celui du serveur — c'est le défaut qu'on a déjà payé sur le
//     mur, « le tri n'arrête pas de changer ».
//   · QUE « CE QUI EST COMPRIS » NE DISE PAS « LA CLASSE SAIT » D'UNE CLASSE
//     COUPÉE EN DEUX. Une notion acquise par douze élèves et fragile pour
//     trois appartient bien aux deux listes, et les deux font agir. Mais
//     acquise par deux et fragile pour deux, elle ne doit PAS être annoncée
//     comme comprise : c'est sur cette phrase qu'on décide de ne pas reprendre
//     la leçon, et l'on rayerait de lundi ce dont la moitié de la classe a
//     besoin.
//
// LES DEUX SONT DES RÈGLES DE DÉCISION, pas d'affichage : elles se mesurent
// donc ici, sans navigateur.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    ordreParNom, ORDRES_DU_BILAN, trieurDuBilan, notionsComprises, ordreDuBilan
} from '../js/core/bilanClasse.js';
import { trierParNom } from '../js/core/vigilance.js';

const eleve = (o = {}) => ({
    studentId: o.id || 'e1',
    firstName: o.prenom || 'Léo',
    lastSeenAt: 1_700_000_000,
    totalQuestions: o.questions === undefined ? 20 : o.questions,
    successRate: o.taux === undefined ? 0.8 : o.taux,
    timeSeconds: 600,
    openErrors: 0,
    weakSkills: o.faibles || [],
    strongSkills: o.solides || []
});

const notion = (skillId, mastery) => ({ skillId, mastery, level: 'x' });

// ──────────────────────────────────────────── L'ORDRE PAR NOM ───────────────

test('PAR NOM, LA RÉUSSITE NE DÉCIDE PLUS DE LA PLACE', () => {
    // C'est tout l'objet du second ordre : on y vient avec un prénom en tête
    // — un parent qui écrit, un mot dans le carnet — et non avec une question
    // sur la classe.
    const l = ordreParNom([
        eleve({ id: 'z', prenom: 'Zoé', questions: 0, taux: null }),
        eleve({ id: 'm', prenom: 'Maëlle', taux: 0.1 }),
        eleve({ id: 'a', prenom: 'Amel', taux: 0.95 })
    ]);
    assert.deepEqual(l.map(x => x.firstName), ['Amel', 'Maëlle', 'Zoé']);
});

test('« ÉMILE » SE RANGE AVEC LES E, PAS APRÈS LE Z', () => {
    // CE QUI LE FAIT EST `localeCompare`, et rien d'autre. J'avais écrit — ici
    // et dans `vigilance.js` — que l'option `sensitivity: 'base'` s'en
    // chargeait ; l'épreuve m'a démenti, elle restait verte sans elle. Le vrai
    // défaut est la comparaison par codes de caractères, qui donne « Dylan,
    // Fatou, Émile » et envoie Émile en bas de page.
    const l = ordreParNom([
        eleve({ id: 'f', prenom: 'Fatou' }),
        eleve({ id: 'e', prenom: 'Émile' }),
        eleve({ id: 'd', prenom: 'Dylan' })
    ]);
    assert.deepEqual(l.map(x => x.firstName), ['Dylan', 'Émile', 'Fatou']);
});

test('« LUCAS 2 » PASSE AVANT « LUCAS 10 »', () => {
    // C'est ce que fait `numeric: true`, et seul lui : dans l'ordre des mots,
    // « Lucas 10 » passe devant parce que le 1 précède le 2.
    const l = ordreParNom([
        eleve({ id: 'b', prenom: 'Lucas 10' }),
        eleve({ id: 'a', prenom: 'Lucas 2' })
    ]);
    assert.deepEqual(l.map(x => x.firstName), ['Lucas 2', 'Lucas 10']);
});

test('LE BILAN RANGE EXACTEMENT COMME LE MUR', () => {
    // DEUX COMPARAISONS PRESQUE IDENTIQUES FINISSENT TOUJOURS PAR DIFFÉRER sur
    // un cas qu'on ne verra pas venir — et c'est le professeur qui le verra, en
    // passant du mur au bilan et en ne retrouvant pas ses élèves au même rang.
    // L'épreuve compare donc les deux ordres au lieu de les décrire.
    //
    // LES PRÉNOMS SONT CHOISIS POUR CE QU'ILS METTENT EN JEU : un accent
    // (« Émile »), un numéro (« Lucas 10 »), une casse et un accent oubliés
    // (« leo », « Léo ») — c'est-à-dire chacune des trois options, plus le
    // départage par identifiant.
    const gens = [
        { id: 'i5', prenom: 'Lucas 10' }, { id: 'i1', prenom: 'Fatou' },
        { id: 'i4', prenom: 'Lucas 2' }, { id: 'i2', prenom: 'Émile' },
        { id: 'i6', prenom: 'Léo' }, { id: 'i7', prenom: 'leo' },
        { id: 'i3', prenom: 'Dylan' }
    ];
    const surLeMur = trierParNom(gens, 1_700_000_000_000, {}).map(v => v.eleve.id);
    const dansLeBilan = ordreParNom(gens.map(g =>
        eleve({ id: g.id, prenom: g.prenom }))).map(l => l.studentId);
    assert.deepEqual(dansLeBilan, surLeMur);
});

test('LES DEUX LUCAS NE PERMUTENT PAS D\'UN AFFICHAGE À L\'AUTRE', () => {
    // Il y en a deux dans la classe de Rémy. `localeCompare` rend 0 pour eux
    // deux, et sans départage l'ordre retombe sur celui du tableau reçu —
    // c'est-à-dire sur celui du serveur, qui change. On range donc par
    // identifiant, qui ne change pas.
    const a = eleve({ id: 'id-aaa', prenom: 'Lucas' });
    const b = eleve({ id: 'id-zzz', prenom: 'Lucas' });
    assert.deepEqual(ordreParNom([a, b]).map(x => x.studentId), ['id-aaa', 'id-zzz']);
    assert.deepEqual(ordreParNom([b, a]).map(x => x.studentId), ['id-aaa', 'id-zzz'],
        'le même ordre quel que soit celui qu\'envoie le serveur');
});

test('l\'ordre par nom ne modifie pas la liste qu\'on lui donne', () => {
    // Le tableau vient du serveur et sert à plusieurs blocs du même écran : le
    // trier sur place changerait ce que voient les autres.
    const source = [eleve({ id: 'z', prenom: 'Zoé' }), eleve({ id: 'a', prenom: 'Amel' })];
    ordreParNom(source);
    assert.equal(source[0].firstName, 'Zoé');
});

test('ordreParNom supporte le vide et le cassé', () => {
    assert.deepEqual(ordreParNom([]), []);
    assert.deepEqual(ordreParNom(null), []);
    assert.equal(ordreParNom([{}, { firstName: 'A' }]).length, 2);
});

// ───────────────────────────────── LES DEUX ORDRES, ET LE DÉFAUT ────────────

test('LE DÉFAUT DU BILAN RESTE L\'URGENCE, CONTRAIREMENT AU MUR', () => {
    // Le mur est devenu alphabétique parce qu'il BOUGE sous le doigt. Le bilan
    // ne bouge pas, et la raison d'être de l'écran — « qu'est-ce que je
    // reprends lundi » — demande ce qui appelle un geste en tête.
    assert.equal(ORDRES_DU_BILAN[0].cle, 'geste');
    assert.equal(trieurDuBilan(undefined), ordreDuBilan);
    assert.equal(trieurDuBilan('n\'importe quoi'), ordreDuBilan,
        'un réglage inconnu ne casse pas l\'écran');
    assert.equal(trieurDuBilan('nom'), ordreParNom);
});

test('les deux ordres portent un mot lisible', () => {
    // L'écran ne choisit pas ses propres mots : ils sont nommés une fois, là
    // où l'on décide de ce que les ordres veulent dire.
    for (const o of ORDRES_DU_BILAN) {
        assert.ok(o.mot && o.mot.length > 2, o.cle);
        assert.equal(typeof o.trier, 'function');
    }
});

// ─────────────────────────────────────────── CE QUI EST COMPRIS ─────────────

test('ON RETOURNE AUSSI LE TABLEAU DANS L\'AUTRE SENS', () => {
    // « À reprendre » existait depuis le premier jour ; rien ne disait ce qui
    // tenait, et l'on ne pouvait donc rien RAYER de la leçon de lundi.
    const n = notionsComprises([
        eleve({ id: 'a', prenom: 'Amel', solides: [notion('calc.add', 0.9), notion('geo.aire', 0.8)] }),
        eleve({ id: 'b', prenom: 'Bilal', solides: [notion('calc.add', 0.95)] }),
        eleve({ id: 'c', prenom: 'Chloé', solides: [notion('calc.add', 0.85)] })
    ]);
    assert.equal(n[0].skillId, 'calc.add');
    assert.equal(n[0].combien, 3);
    assert.deepEqual(n[0].eleves.map(e => e.firstName), ['Amel', 'Bilal', 'Chloé']);
    assert.equal(n[1].skillId, 'geo.aire');
});

test('UNE NOTION FRAGILE POUR AUTANT D\'ÉLÈVES N\'EST PAS « COMPRISE »', () => {
    // C'est la règle qui empêche l'écran de se contredire. Deux élèves l'ont
    // acquise, deux l'ont fragile : la classe est coupée en deux, et de ces
    // deux lectures c'est « à reprendre » qui fait agir.
    const lignes = [
        eleve({ id: 'a', solides: [notion('num.rel', 0.9)] }),
        eleve({ id: 'b', solides: [notion('num.rel', 0.9)] }),
        eleve({ id: 'c', faibles: [notion('num.rel', 0.3)] }),
        eleve({ id: 'd', faibles: [notion('num.rel', 0.3)] })
    ];
    assert.deepEqual(notionsComprises(lignes), []);

    // Un élève de plus du bon côté, et elle y entre — en disant pour combien
    // elle ne tient pas encore.
    const n = notionsComprises([...lignes, eleve({ id: 'e', solides: [notion('num.rel', 0.9)] })]);
    assert.equal(n.length, 1);
    assert.equal(n[0].combien, 3);
    assert.equal(n[0].fragilePour, 2);
});

test('ON DIT POUR COMBIEN ÇA NE TIENT PAS ENCORE', () => {
    // Sans ce nombre, « Les relatifs : 18 élèves » se lit « la classe sait »,
    // et l'on raye une leçon dont sept élèves ont encore besoin.
    const n = notionsComprises([
        ...Array.from({ length: 18 }, (_, i) =>
            eleve({ id: 's' + i, solides: [notion('num.rel', 0.9)] })),
        ...Array.from({ length: 7 }, (_, i) =>
            eleve({ id: 'f' + i, faibles: [notion('num.rel', 0.3)] }))
    ]);
    assert.equal(n[0].combien, 18);
    assert.equal(n[0].fragilePour, 7);
});

test('la plus largement acquise d\'abord, puis la mieux maîtrisée', () => {
    const n = notionsComprises([
        eleve({ id: 'a', solides: [notion('A', 0.75), notion('B', 0.99)] }),
        eleve({ id: 'b', solides: [notion('A', 0.75)] })
    ]);
    assert.deepEqual(n.map(x => x.skillId), ['A', 'B'], 'deux élèves passent devant un');

    const egal = notionsComprises([
        eleve({ id: 'a', solides: [notion('A', 0.72), notion('B', 0.98)] })
    ]);
    assert.deepEqual(egal.map(x => x.skillId), ['B', 'A'], 'à nombre égal, la mieux tenue');
});

test('une classe qui n\'a encore rien acquis ne fabrique rien', () => {
    assert.deepEqual(notionsComprises([eleve(), eleve({ id: 'b' })]), []);
    assert.deepEqual(notionsComprises([]), []);
    assert.deepEqual(notionsComprises(null), []);
    // Un serveur d'avant cette route rendait des lignes SANS `strongSkills` :
    // l'écran doit alors taire le bloc, pas tomber.
    assert.deepEqual(notionsComprises([{ studentId: 'a', firstName: 'A' }]), []);
});

test('notionsComprises supporte des notions cassées', () => {
    const n = notionsComprises([
        eleve({ id: 'a', solides: [null, { mastery: 0.9 }, notion('ok', 0.9)] }),
        { studentId: 'b', firstName: 'B', strongSkills: null, weakSkills: null }
    ]);
    assert.deepEqual(n.map(x => x.skillId), ['ok']);
});
