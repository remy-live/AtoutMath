// LE MIROIR JS ↔ PHP, MIS À L'ÉPREUVE PLUTÔT QU'AFFIRMÉ.
//
// `api/lib/projections.php` promet de calculer l'avancement avec exactement les
// mêmes règles que `js/core/avancement.js`. Jusqu'ici cette promesse n'était
// qu'un commentaire en tête de fichier — et les deux fichiers se modifient à
// des mois d'intervalle.
//
// CE QU'UNE DIVERGENCE COÛTERAIT. Le professeur lit l'avancement d'un élève
// dans Le direct ; l'élève lit le sien au-dessus de sa question. Les deux
// viennent de la même source — le journal — mais par deux chemins de code
// différents. Le jour où ils ne s'accordent plus, l'un des deux écrans ment et
// personne ne sait lequel : le professeur croit l'élève en retard, l'élève
// jure qu'il a fait le travail, et le tableau de bord perd sa seule valeur, qui
// est qu'on le croie.
//
// On donne donc LES MÊMES ÉVÉNEMENTS aux deux, et l'on compare les réponses
// champ par champ.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { computeRuns } from '../js/core/projections.js';
import { avancementDuRun } from '../js/core/avancement.js';

const T0 = 1_700_000_000_000;
const MAINTENANT = Math.floor((T0 + 600_000) / 1000);

const phpDisponible = spawnSync('php', ['-v'], { encoding: 'utf8' }).status === 0;

function parLePhp(events) {
    const r = spawnSync('php', ['tools/avancementPhp.php'], {
        input: JSON.stringify({ events, maintenant: MAINTENANT }),
        encoding: 'utf8'
    });
    assert.equal(r.status, 0, 'php a échoué : ' + (r.stderr || ''));
    return JSON.parse(r.stdout);
}

function parLeJs(events) {
    const run = computeRuns(events)[0] || null;
    return avancementDuRun(run, T0 + 600_000);
}

/** Les champs que les deux côtés doivent porter à l'identique. */
function comparables(a) {
    if (!a) return null;
    return {
        etat: a.etat, etapes: a.etapes, faites: a.faites, reussies: a.reussies,
        questions: a.questions, prevues: a.prevues, justes: a.justes,
        fraction: Math.round((a.fraction || 0) * 10000) / 10000,
        pathName: a.pathName,
        detailEtapes: a.detailEtapes || [],
        etapeEnCours: a.etapeEnCours ? {
            rang: a.etapeEnCours.rang, titre: a.etapeEnCours.titre,
            posees: a.etapeEnCours.posees, prevues: a.etapeEnCours.prevues,
            justes: a.etapeEnCours.justes
        } : null
    };
}

// ─────────────────────────────────────────────────── LES HISTOIRES ÉPROUVÉES ─

const plan = (n, questions = 10) => Array.from({ length: n }, (_, i) => ({
    rang: i, stepId: 'sc_' + i, titre: 'Étape ' + (i + 1),
    questions, requis: Math.ceil(questions * 0.7)
}));

const debut = (etapes = 5, questions = 10) => ({
    id: 'e0', type: 'run_started', ts: T0,
    payload: { runId: 'r1', pathId: 'p1', pathName: 'Devoir du mardi',
               mode: 'entrainement', stepCount: etapes, plan: plan(etapes, questions) }
});

const question = (stepId, i, correct = true, extra = {}) => ({
    id: `q${stepId}${i}`, type: 'attempt', ts: T0 + 1000 * i,
    payload: { runId: 'r1', stepId, itemSeed: `${stepId}:${i}`, correct,
               attemptIndex: 0, exerciseId: 'calc-add', ...extra }
});

const etape = (i, questions = 10, solved = 8) => ({
    id: 'sc' + i, type: 'step_completed', ts: T0 + 60_000 * (i + 1),
    payload: { runId: 'r1', pathId: 'p1', stepId: 'sc_' + i, title: 'Étape ' + (i + 1),
               questions, solved, required: 7, passed: solved >= 7 }
});

const fin = (aborted = false) => ({
    id: 'fin', type: 'run_finished', ts: T0 + 600_000,
    payload: { runId: 'r1', pathId: 'p1', aborted }
});

const HISTOIRES = {
    'à peine commencé': [debut(), question('sc_0', 0), question('sc_0', 1, false)],

    'au milieu du parcours': [
        debut(), etape(0), etape(1, 10, 9),
        question('sc_2', 0), question('sc_2', 1), question('sc_2', 2, false)
    ],

    'terminé avant le compte': [
        debut(), etape(0, 7, 7), etape(1, 7, 7), etape(2, 7, 7), etape(3, 7, 7),
        etape(4, 7, 7), fin()
    ],

    'quitté en route': [debut(), etape(0), question('sc_1', 0), fin(true)],

    'avec des seconds essais et des partiels': [
        debut(),
        question('sc_0', 0, false),
        { id: 'r2', type: 'attempt', ts: T0 + 500,
          payload: { runId: 'r1', stepId: 'sc_0', itemSeed: 'sc_0:0', correct: true, attemptIndex: 1 } },
        { id: 'p1', type: 'attempt', ts: T0 + 600,
          payload: { runId: 'r1', stepId: 'sc_0', itemSeed: 'sc_0:1:u', correct: true, partiel: true } },
        question('sc_0', 1)
    ],

    'un jeu sans graine': [
        debut(2),
        { id: 'j1', type: 'attempt', ts: T0 + 10,
          payload: { runId: 'r1', stepId: 'sc_0', correct: true, attemptIndex: 0 } },
        { id: 'j2', type: 'attempt', ts: T0 + 20,
          payload: { runId: 'r1', stepId: 'sc_0', correct: false, attemptIndex: 0 } },
        { id: 'j3', type: 'attempt', ts: T0 + 30,
          payload: { runId: 'r1', stepId: 'sc_0', correct: true, attemptIndex: 1 } }
    ],

    'plus de questions que prévu': [
        debut(1), ...Array.from({ length: 15 }, (_, i) => question('sc_0', i))
    ],

    'des étapes de longueurs très inégales': [
        { id: 'e0', type: 'run_started', ts: T0,
          payload: { runId: 'r1', pathId: 'p1', pathName: 'Inégal', stepCount: 2,
                     plan: [{ rang: 0, stepId: 'sc_0', titre: 'Longue', questions: 20, requis: 14 },
                            { rang: 1, stepId: 'sc_1', titre: 'Courte', questions: 3, requis: 2 }] } },
        ...Array.from({ length: 19 }, (_, i) => question('sc_0', i))
    ],

    // Le cas du serveur : la lecture bornée coupe le run avant son départ, il
    // n'y a donc pas de plan. Les deux côtés doivent se replier PAREIL.
    'sans son départ, donc sans plan': [
        etape(0), etape(1), question('sc_2', 0)
    ],

    'une étape ratée': [debut(), etape(0, 10, 9), etape(1, 10, 2)],

    'rien du tout': []
};

for (const [nom, events] of Object.entries(HISTOIRES)) {
    test(`LE SERVEUR ET L'ÉLÈVE DISENT LA MÊME CHOSE — ${nom}`, { skip: !phpDisponible && 'php absent' }, () => {
        const js = comparables(parLeJs(events));
        const php = comparables(parLePhp(events));
        assert.deepEqual(php, js,
            `\nJS  : ${JSON.stringify(js)}\nPHP : ${JSON.stringify(php)}`);
    });
}

test('l\'outil de comparaison compare vraiment quelque chose', () => {
    // Un miroir qui renverrait `null` des deux côtés passerait tous les essais
    // ci-dessus sans rien prouver.
    const js = comparables(parLeJs(HISTOIRES['au milieu du parcours']));
    assert.ok(js, 'le côté JS rend un avancement');
    assert.equal(js.faites, 2);
    assert.equal(js.etapeEnCours.posees, 3);
});
