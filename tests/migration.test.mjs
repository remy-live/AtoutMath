// LA MIGRATION DE L'ANCIEN STOCKAGE — CENT VINGT-HUIT LIGNES QUI N'AVAIENT
// AUCUNE ÉPREUVE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// POURQUOI CELUI-LÀ D'ABORD. `js/core/migrate.js` lit les clés `atoutmath_*`
// d'une ancienne version et les convertit en événements de journal. Il tourne
// UNE SEULE FOIS par profil, sur des données qu'on ne reverra jamais, et son
// résultat devient l'historique de l'élève. Un défaut ici ne se rattrape pas :
// personne ne saura qu'il manque trois mois de tentatives, parce que personne
// n'a l'original pour comparer.
//
// C'est exactement la situation où une épreuve vaut le plus cher et où l'on en
// écrit le moins : le code a l'air simple, il est écrit une fois, et il
// s'exécute chez quelqu'un d'autre.
//
// CE QU'ON GARDE ICI, dans l'ordre de ce qu'on perdrait :
//
//   1. RIEN NE DISPARAÎT. Le fichier promet en tête « les anciennes clés ne
//      sont PAS supprimées, pour pouvoir revenir en arrière si besoin ». Une
//      promesse de ce genre ne tient que si quelque chose la garde : on relit
//      donc le stockage après la migration.
//   2. CHAQUE TENTATIVE DEVIENT UN ÉVÉNEMENT. C'est « l'historique le plus
//      précieux », dit le code ; on compte.
//   3. UNE ERREUR CORRIGÉE DONNE DEUX ÉVÉNEMENTS, et le second vient APRÈS le
//      premier. Il est posé à `timestamp + 1` : à égalité de date, le tri
//      pourrait les inverser et l'erreur serait résolue avant d'exister.
//   4. LE TEMPS NE SE COMPTE PAS DEUX FOIS. `timeTotal` est le total, et
//      `timePerGame` en est le détail : on ne reverse que la DIFFÉRENCE.
//   5. LE SCORE ARRIVE EN UN SEUL BONUS, parce qu'il n'est pas reconstituable
//      question par question.
//   6. UN STOCKAGE VIDE NE FABRIQUE RIEN. C'est le cas de l'immense majorité
//      des postes, et c'est celui où un événement inventé serait invisible.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { EventTypes as E } from '../js/core/journal.js';

// ─────────────────────────────────────────────────────────────────────────────
// UN FAUX `localStorage`, PARCE QUE C'EST CELUI QUE `migrate` LIT.
//
// `readLegacy` essaie `localforage` d'abord — absent sous Node — puis
// `window.localStorage.getItem` suivi d'un `JSON.parse`. On range donc des
// CHAÎNES, comme un vrai navigateur, et non les objets : un faux stockage qui
// rendrait l'objet directement laisserait passer un `JSON.parse` oublié.
// ─────────────────────────────────────────────────────────────────────────────

function monterStockage(donnees) {
    const brut = new Map(Object.entries(donnees).map(([k, v]) => [k, JSON.stringify(v)]));
    globalThis.window.localStorage = {
        getItem: (k) => (brut.has(k) ? brut.get(k) : null),
        setItem: (k, v) => brut.set(k, String(v)),
        removeItem: (k) => brut.delete(k),
        get length() { return brut.size; },
        _cles: () => [...brut.keys()]
    };
    return globalThis.window.localStorage;
}

/** Le module se charge une fois ; on le relit à chaque épreuve pour la lisibilité. */
const migrate = () => import('../js/core/migrate.js');

const DATE_BIDON = 1_700_000_000_000;   // un lundi de novembre 2023

test('UN STOCKAGE VIDE NE FABRIQUE AUCUN ÉVÉNEMENT', async () => {
    monterStockage({});
    const { hasLegacyData, buildMigrationEvents } = await migrate();

    assert.equal(await hasLegacyData(), false);

    const { events, content } = await buildMigrationEvents('p_1', 'd_1');
    assert.deepEqual(events, [], 'une migration de rien doit rendre rien');
    assert.deepEqual(content, { teacherPaths: [], teacherFolders: [], selectedNiveaux: [] });
});

test('UNE SEULE ANCIENNE CLÉ SUFFIT À DÉCLENCHER LA MIGRATION', async () => {
    const { hasLegacyData } = await migrate();

    monterStockage({ atoutmath_score: 120 });
    assert.equal(await hasLegacyData(), true, 'un score seul est une donnée à reprendre');

    // Et une clé QUI N'EST PAS DANS LA LISTE ne déclenche rien : on ne va pas
    // migrer le poste d'un élève parce qu'un autre logiciel écrit à côté.
    monterStockage({ autre_logiciel_truc: 3 });
    assert.equal(await hasLegacyData(), false);
});

test('CHAQUE ANCIENNE TENTATIVE DEVIENT UN ÉVÉNEMENT', async () => {
    monterStockage({
        atoutmath_attempts: [
            { exoId: 'calc-add', concept: 'addition', correct: true, timestamp: DATE_BIDON },
            { exoId: 'calc-add', concept: 'addition', correct: false, timestamp: DATE_BIDON + 1000 },
            { exoId: 'calc-mult', concept: 'mult:7', correct: true, timestamp: DATE_BIDON + 2000 }
        ]
    });
    const { buildMigrationEvents } = await migrate();
    const { events } = await buildMigrationEvents('p_1', 'd_1');

    const tentatives = events.filter(e => e.type === E.ATTEMPT);
    assert.equal(tentatives.length, 3, 'trois tentatives rangées, trois tentatives reprises');

    // La compétence est TRADUITE, pas recopiée : « addition » et « mult:7 » sont
    // d'anciennes clés ad hoc, et tout le reste du logiciel ne sait lire que les
    // identifiants du référentiel.
    assert.equal(tentatives[0].payload.skillId, 'num.add.entiers');
    assert.equal(tentatives[2].payload.skillId, 'num.mult.table.7');

    // Juste et faux ne se confondent pas — ce serait inverser une courbe de
    // progression entière.
    assert.deepEqual(tentatives.map(t => t.payload.correct), [true, false, true]);

    // La DATE de l'époque est conservée. Sans elle, trois mois de travail
    // arriveraient tous aujourd'hui et le modèle de maîtrise (qui pondère par
    // l'ancienneté) les croirait tout frais.
    assert.deepEqual(tentatives.map(t => t.ts), [DATE_BIDON, DATE_BIDON + 1000, DATE_BIDON + 2000]);

    // Chaque événement porte de quoi être attribué et dédoublonné.
    for (const t of tentatives) {
        assert.equal(t.profileId, 'p_1');
        assert.equal(t.deviceId, 'd_1');
        assert.equal(t.migrated, true, 'un événement migré doit se reconnaître');
        assert.equal(t.synced, false, 'et rester à envoyer au serveur');
        assert.ok(t.id, 'sans identifiant, la fusion de deux appareils ne peut pas dédoublonner');
    }
});

test('UNE ERREUR CORRIGÉE DONNE DEUX ÉVÉNEMENTS, DANS CET ORDRE', async () => {
    monterStockage({
        atoutmath_errors: [
            {
                exoId: 'calc-add', exoTitle: 'Additions',
                questionData: { questionText: '7 + 8', input: '14', expected: 15, concept: 'addition' },
                corrected: true, timestamp: DATE_BIDON
            },
            {
                exoId: 'calc-add',
                questionData: { questionText: '9 + 6', input: '14', expected: 15, concept: 'addition' },
                corrected: false, timestamp: DATE_BIDON + 5000
            }
        ]
    });
    const { buildMigrationEvents } = await migrate();
    const { events } = await buildMigrationEvents('p_1', 'd_1');

    const fausses = events.filter(e => e.type === E.ATTEMPT);
    assert.equal(fausses.length, 2);
    assert.ok(fausses.every(e => e.payload.correct === false),
        'une erreur du carnet est une tentative FAUSSE : la rejouer juste effacerait la faute');

    // Le contexte voyage : sans lui, le carnet d'erreurs affiche une ligne vide
    // et l'élève ne peut pas reprendre ce qu'il a raté.
    assert.equal(fausses[0].payload.questionText, '7 + 8');
    assert.equal(fausses[0].payload.given, '14');
    assert.equal(fausses[0].payload.expected, 15);
    assert.equal(fausses[0].payload.exerciseTitle, 'Additions');

    const resolues = events.filter(e => e.type === E.ERROR_RESOLVED);
    assert.equal(resolues.length, 1, 'une seule des deux erreurs était corrigée');
    assert.equal(resolues[0].payload.errorKey, 'calc-add|7 + 8');

    // ET LA RÉSOLUTION EST DATÉE APRÈS LA FAUTE, pas en même temps.
    //
    // ON A D'ABORD ÉCRIT CETTE LIGNE EN COMPARANT DES POSITIONS dans le tableau
    // — « la résolution arrive-t-elle après dans la liste ? » — et
    // `epreuveTombe.mjs` a montré qu'elle ne gardait RIEN : en retirant le
    // `+ 1` du code, l'épreuve restait verte. La cause est que le tri de V8 est
    // STABLE, donc à date égale l'ordre de poussée survit, et l'ordre de poussée
    // est déjà le bon ici.
    //
    // Ce n'est pas ce qu'on veut garder. Les événements de ce journal sont
    // FUSIONNÉS avec ceux d'un autre appareil, puis retriés : à date égale,
    // rien ne garantit plus quoi que ce soit, et une erreur se retrouve
    // résolue avant d'avoir été commise. Ce que le `+ 1` donne, c'est une date
    // STRICTEMENT postérieure — on mesure donc les dates.
    const fausse78 = events.find(e => e.type === E.ATTEMPT && e.payload.questionText === '7 + 8');
    assert.ok(resolues[0].ts > fausse78.ts,
        'la correction doit être datée après la faute, et pas seulement rangée après');
});

test('LE TEMPS PASSÉ NE SE COMPTE PAS DEUX FOIS', async () => {
    monterStockage({
        atoutmath_timeTotal: 1000,
        atoutmath_timePerGame: { 'calc-add': 400, 'calc-mult': 350 }
    });
    const { buildMigrationEvents } = await migrate();
    const { events } = await buildMigrationEvents('p_1', 'd_1');

    const temps = events.filter(e => e.type === E.TIME_SPENT);
    const total = temps.reduce((s, e) => s + e.payload.seconds, 0);
    assert.equal(total, 1000, 'la somme des événements doit valoir le total de l\'époque, pas 1 750');

    // Le détail est conservé par exercice, et le reste va dans un événement
    // sans exercice : c'est du temps réel, il ne faut pas le jeter.
    const parExercice = temps.filter(e => e.payload.exerciseId);
    assert.deepEqual(parExercice.map(e => [e.payload.exerciseId, e.payload.seconds]).sort(),
        [['calc-add', 400], ['calc-mult', 350]].sort());
    assert.equal(temps.find(e => e.payload.exerciseId === null).payload.seconds, 250);
});

test('UN DÉTAIL PLUS GROS QUE LE TOTAL N\'INVENTE PAS DE TEMPS NÉGATIF', async () => {
    // Ce cas EXISTE dans les anciennes données : `timeTotal` n'était pas remis à
    // jour à chaque partie. Un événement de −200 secondes traverserait tout le
    // logiciel sans un mot et fausserait le temps de travail affiché au
    // professeur.
    monterStockage({
        atoutmath_timeTotal: 100,
        atoutmath_timePerGame: { 'calc-add': 300 }
    });
    const { buildMigrationEvents } = await migrate();
    const { events } = await buildMigrationEvents('p_1', 'd_1');

    const temps = events.filter(e => e.type === E.TIME_SPENT);
    assert.equal(temps.length, 1, 'rien à reverser : le détail dépasse déjà le total');
    assert.ok(temps.every(e => e.payload.seconds > 0), 'aucune durée négative ne doit sortir d\'ici');
});

test('LE SCORE ARRIVE EN UN SEUL BONUS, ET ZÉRO N\'EN FABRIQUE PAS', async () => {
    const { buildMigrationEvents } = await migrate();

    monterStockage({ atoutmath_score: 1240 });
    let { events } = await buildMigrationEvents('p_1', 'd_1');
    const bonus = events.filter(e => e.type === E.BONUS);
    assert.equal(bonus.length, 1);
    assert.equal(bonus[0].payload.points, 1240);
    assert.equal(bonus[0].payload.reason, 'migration');
    assert.ok(bonus[0].payload.label, 'le bilan affiche ce libellé : sans lui, la ligne est muette');

    monterStockage({ atoutmath_score: 0 });
    ({ events } = await buildMigrationEvents('p_1', 'd_1'));
    assert.equal(events.filter(e => e.type === E.BONUS).length, 0,
        'un score nul ne mérite pas une ligne « Progression antérieure »');
});

test('LES BADGES ET LE PARCOURS ASSIGNÉ SUIVENT', async () => {
    monterStockage({
        atoutmath_badges: { premier_pas: DATE_BIDON, dix_sur_dix: DATE_BIDON + 60000 },
        atoutmath_studentPath: {
            steps: [{ exerciseId: 'calc-add' }, { exerciseId: 'calc-mult' }],
            completed: ['s1']
        }
    });
    const { buildMigrationEvents } = await migrate();
    const { events } = await buildMigrationEvents('p_1', 'd_1');

    const badges = events.filter(e => e.type === E.BADGE_GRANTED);
    assert.deepEqual(badges.map(b => b.payload.badgeId).sort(), ['dix_sur_dix', 'premier_pas']);
    assert.equal(badges.find(b => b.payload.badgeId === 'premier_pas').ts, DATE_BIDON,
        'un badge gagné en novembre ne doit pas se redater d\'aujourd\'hui');

    const assigne = events.filter(e => e.type === E.PATH_ASSIGNED);
    assert.equal(assigne.length, 1);
    assert.equal(assigne[0].payload.steps.length, 2);

    const faites = events.filter(e => e.type === E.STEP_COMPLETED);
    assert.equal(faites.length, 1);
    // L'étape faite doit désigner LE parcours qu'on vient de créer, sinon elle
    // ne se rattache à rien et l'élève refait une étape déjà terminée.
    assert.equal(faites[0].payload.pathId, assigne[0].payload.pathId);

    // Et le parcours est assigné AVANT que ses étapes soient faites : il est
    // posé une seconde plus tôt exprès.
    assert.ok(assigne[0].ts < faites[0].ts);
});

test('UN PARCOURS ASSIGNÉ VIDE NE S\'ASSIGNE PAS', async () => {
    monterStockage({ atoutmath_studentPath: { steps: [], completed: [] } });
    const { buildMigrationEvents } = await migrate();
    const { events } = await buildMigrationEvents('p_1', 'd_1');
    assert.equal(events.filter(e => e.type === E.PATH_ASSIGNED).length, 0,
        'un parcours sans étape afficherait à l\'élève une séance vide à faire');
});

test('LES PARCOURS ET DOSSIERS DU PROFESSEUR SORTENT À PART', async () => {
    // Ils ne sont pas des événements : ils ne décrivent pas ce qu'un élève a
    // fait, mais ce qu'un professeur a préparé. Les faire entrer dans le
    // journal les enverrait au serveur comme de l'activité d'élève.
    monterStockage({
        atoutmath_teacherPaths: [{ id: 'pa_1', name: 'Relatifs' }],
        atoutmath_teacherFolders: [{ id: 'do_1', name: '6e' }],
        atoutmath_selectedNiveaux: ['6e']
    });
    const { buildMigrationEvents } = await migrate();
    const { events, content } = await buildMigrationEvents('p_1', 'd_1');

    assert.equal(content.teacherPaths[0].name, 'Relatifs');
    assert.equal(content.teacherFolders[0].name, '6e');
    assert.deepEqual(content.selectedNiveaux, ['6e']);
    assert.equal(events.length, 0, 'préparer un parcours n\'est pas une activité d\'élève');
});

test('LA MIGRATION NE DÉTRUIT RIEN — ON PEUT REVENIR EN ARRIÈRE', async () => {
    // Le fichier le promet en tête. Une promesse pareille ne vaut que si
    // quelque chose la garde : le jour où l'on ajoutera un `removeItem` « pour
    // faire propre », c'est cette ligne-ci qui s'y opposera.
    const stockage = monterStockage({
        atoutmath_score: 500,
        atoutmath_attempts: [{ exoId: 'calc-add', correct: true, timestamp: DATE_BIDON }],
        atoutmath_teacherPaths: [{ id: 'pa_1', name: 'Relatifs' }]
    });
    const avant = stockage._cles().sort();

    const { buildMigrationEvents } = await migrate();
    await buildMigrationEvents('p_1', 'd_1');

    assert.deepEqual(stockage._cles().sort(), avant,
        'aucune ancienne clé ne doit disparaître : c\'est le seul filet de secours');
});

test('UN STOCKAGE QUI JETTE NE FAIT PAS ÉCHOUER LA MIGRATION', async () => {
    // Mode privé de Safari, quota dépassé, stockage désactivé par l'école :
    // `readLegacy` attrape et rend `null`. Un élève ne doit pas se retrouver
    // devant une page blanche parce que son ancien stockage est illisible.
    globalThis.window.localStorage = {
        getItem() { throw new Error('stockage refusé'); }
    };
    const { hasLegacyData, buildMigrationEvents } = await migrate();

    assert.equal(await hasLegacyData(), false);
    const { events, content } = await buildMigrationEvents('p_1', 'd_1');
    assert.deepEqual(events, []);
    assert.deepEqual(content.teacherPaths, []);
});

test('LES ÉVÉNEMENTS SORTENT EN ORDRE CHRONOLOGIQUE', async () => {
    // Les erreurs sont converties après les tentatives, les badges après tout
    // le monde, et un badge de 2023 arrivait donc après une tentative de 2024.
    // Le journal est rejoué dans l'ordre : une projection qui lit à l'envers
    // donne des totaux faux.
    monterStockage({
        atoutmath_attempts: [{ exoId: 'calc-add', correct: true, timestamp: DATE_BIDON + 10_000 }],
        atoutmath_errors: [{
            exoId: 'calc-add', questionData: { questionText: '2 + 2' },
            corrected: true, timestamp: DATE_BIDON
        }],
        atoutmath_badges: { premier_pas: DATE_BIDON + 5000 }
    });
    const { buildMigrationEvents } = await migrate();
    const { events } = await buildMigrationEvents('p_1', 'd_1');

    const dates = events.map(e => e.ts);
    assert.deepEqual(dates, [...dates].sort((a, b) => a - b),
        'le journal se rejoue dans l\'ordre : il doit sortir dans l\'ordre');
});
