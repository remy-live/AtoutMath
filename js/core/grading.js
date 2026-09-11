// Notation : fonction pure (run, policy) -> bilan.
//
// Rien de tout cela n'est stocké. La note est recalculée à partir des
// tentatives du journal, ce qui a trois conséquences utiles :
//  - modifier un barème régénère les notes des runs passés, sans migration ;
//  - le serveur PHP recalcule la même note à partir des mêmes événements et
//    n'a donc jamais à faire confiance à une note envoyée par le navigateur ;
//  - la fonction se teste sans navigateur (voir tests/grading.test.mjs).
//
// Le bilan par compétence est volontairement mis au même niveau que la note :
// dans un outil didactique, « 12/20 » dit moins que « tables de 7 et 8 non
// acquises, priorités acquises ».

import { resolvePolicy } from './policy.js';
import { LEVELS, levelFor } from './mastery.js';
import { skillLabel } from '../data/skills.js';

/**
 * Au-delà de cinq minutes sur une seule question, ce n'est plus du travail :
 * c'est un onglet resté ouvert. On plafonne pour que le temps de séance reste
 * une information et non le reflet des allées et venues de l'élève.
 */
export const PAUSE_MAX_MS = 5 * 60 * 1000;

/**
 * @param {Object} run - sortie de projections.computeRuns()
 * @param {Object} [policyOverride]
 * @returns {Object} bilan complet
 */
export function gradeRun(run, policyOverride = null) {
    const policy = resolvePolicy(policyOverride || (run && run.policy) || null);
    const attempts = (run && run.attempts) || [];
    const grading = policy.grading;
    const rule = (grading && grading.rule) || 'firstTry';

    // Une question = un itemSeed (ou, à défaut, son énoncé). Plusieurs
    // tentatives sur le même item ne comptent que pour une question.
    const items = new Map();
    for (const a of attempts) {
        const key = a.itemSeed || `${a.stepId || ''}|${a.questionText || ''}`;
        if (!items.has(key)) {
            items.set(key, {
                key, stepId: a.stepId || null, skillId: a.skillId || null,
                itemSeed: a.itemSeed || null, exerciseId: a.exerciseId || null,
                questionText: a.questionText || '', expected: a.expected,
                tries: 0, hintsUsed: 0, solved: false, firstTry: false,
                msElapsed: 0, given: a.given, misconception: null
            });
        }
        const it = items.get(key);
        it.tries++;
        it.hintsUsed = Math.max(it.hintsUsed, a.hintsUsed || 0);
        // `msElapsed` est un INTERVALLE — le temps écoulé depuis la tentative
        // précédente — et les intervalles s'additionnent. Il est en plus borné
        // : un onglet laissé ouvert pendant la récréation ne doit pas gonfler
        // le temps de la séance de vingt minutes de rien du tout.
        it.msElapsed += Math.min(Math.max(0, a.msElapsed || 0), PAUSE_MAX_MS);
        if (a.correct) {
            it.solved = true;
            if ((a.attemptIndex || 0) === 0) it.firstTry = true;
        } else {
            it.given = a.given;
            if (a.misconception) it.misconception = a.misconception;
        }
    }
    const itemList = [...items.values()];

    // --- Crédit par question, selon la règle du barème ---
    const creditOf = (it) => {
        if (!it.solved) return 0;
        switch (rule) {
            case 'ratio':
                return 1; // résolue = acquise, quel que soit le nombre d'essais
            case 'ponderee': {
                const pen = grading.penalties || {};
                const retry = Math.max(0, (it.tries - 1)) * (pen.retry || 0);
                const hint = (it.hintsUsed || 0) * (pen.hint || 0);
                return Math.max(0, 1 - retry - hint);
            }
            case 'firstTry':
            default:
                return it.firstTry && it.hintsUsed === 0 ? 1 : 0;
        }
    };

    // --- Agrégation par étape, avec pondération ---
    // Le poids d'une étape vient du barème s'il est déclaré, sinon de l'étape
    // elle-même, sinon 1 (toutes les étapes comptent pareil).
    const declaredWeights = (grading && grading.stepWeights) || {};

    const parEtape = [];
    const byStep = new Map();
    for (const it of itemList) {
        const sid = it.stepId || '_';
        if (!byStep.has(sid)) byStep.set(sid, []);
        byStep.get(sid).push(it);
    }
    for (const [stepId, list] of byStep) {
        const credit = list.reduce((s, it) => s + creditOf(it), 0);
        const stepInfo = (run.steps || []).find(s => s.stepId === stepId);
        // UN JEU DE RÉCOMPENSE NE SE NOTE PAS. Il est là pour être joué, et
        // les points qu'on y marque n'ont rien à voir avec ce qu'on a compris :
        // les compter reviendrait à noter le plaisir.
        if (stepInfo && stepInfo.bonus) continue;
        parEtape.push({
            stepId,
            title: (stepInfo && stepInfo.title) || '',
            weight: declaredWeights[stepId] || (stepInfo && stepInfo.weight) || 1,
            questions: list.length,
            reussies: list.filter(it => it.solved).length,
            premierEssai: list.filter(it => it.firstTry).length,
            credit,
            ratio: list.length ? credit / list.length : 0
        });
    }

    const totalWeight = parEtape.reduce((s, e) => s + e.weight, 0) || 1;
    const ratioPondere = parEtape.reduce((s, e) => s + e.weight * e.ratio, 0) / totalWeight;

    // --- Bilan par compétence ---
    const bySkill = new Map();
    for (const it of itemList) {
        if (!it.skillId) continue;
        if (!bySkill.has(it.skillId)) {
            bySkill.set(it.skillId, { skillId: it.skillId, label: skillLabel(it.skillId), questions: 0, credit: 0, reussies: 0 });
        }
        const s = bySkill.get(it.skillId);
        s.questions++;
        s.credit += creditOf(it);
        if (it.solved) s.reussies++;
    }
    const parCompetence = [...bySkill.values()].map(s => {
        const taux = s.questions ? s.credit / s.questions : 0;
        return { ...s, taux, niveau: levelFor(taux) };
    }).sort((a, b) => a.taux - b.taux);

    // --- Note ---
    //
    // TROIS RÉGIMES, et ils ne se ressemblent pas (voir NOTES dans policy.js) :
    // la note s'affiche, ou bien elle est calculée pour le professeur SANS être
    // montrée à l'élève, ou bien on ne note pas du tout. Rémy : « à la fin on a
    // une option pour donner la note ou non ».
    //
    // Le calcul se fait dans les deux premiers cas — un bilan de classe sans
    // note serait inutilisable —, et c'est `noteCachee` qui dit à l'interface
    // de la taire. Ne pas la calculer du tout serait perdre l'information sans
    // rien gagner.
    const regimeNote = (grading && grading.note) || 'affichee';
    let note = null, sur = null;
    if (grading && grading.scale && regimeNote !== 'aucune') {
        sur = grading.scale;
        const brut = ratioPondere * sur;
        const pas = grading.arrondi || 0.5;
        note = Math.round(brut / pas) * pas;
        note = Math.max(0, Math.min(sur, Number(note.toFixed(2))));
    }

    const totalQuestions = itemList.length;
    const totalReussies = itemList.filter(it => it.solved).length;
    const tempsTotal = Math.round(itemList.reduce((s, it) => s + it.msElapsed, 0) / 1000);

    return {
        // Détail du calcul, pour pouvoir montrer à l'élève (et au professeur)
        // d'où sort la note plutôt que de la présenter comme un verdict.
        calcul: buildCalcul({ grading, rule, parEtape, totalWeight, ratioPondere, note, sur }),
        // Le professeur décide si l'élève voit le détail (activé par défaut :
        // une note dont on ignore l'origine n'apprend rien).
        // Et le détail du calcul suit la note : montrer d'où sort un nombre
        // qu'on ne montre pas n'aurait pas de sens.
        afficherCalcul: !!grading && grading.showCalculation !== false && regimeNote === 'affichee',
        runId: run ? run.runId : null,
        pathId: run ? run.pathId : null,
        pathName: run ? run.pathName : '',
        mode: policy.mode,
        note, sur,
        // L'élève ne verra pas cette note : elle n'est là que pour le
        // professeur et le bilan de classe.
        noteCachee: regimeNote === 'enregistree',
        regle: (grading && grading.rule) || null,
        ratio: totalQuestions ? totalReussies / totalQuestions : 0,
        ratioPondere,
        totalQuestions,
        totalReussies,
        premierEssai: itemList.filter(it => it.firstTry).length,
        aidesUtilisees: itemList.reduce((s, it) => s + it.hintsUsed, 0),
        tempsTotal,
        tempsMoyenParQuestion: totalQuestions ? Math.round(tempsTotal / totalQuestions) : 0,
        parEtape,
        parCompetence,
        // Les questions ratées, avec leur diagnostic : c'est la partie que
        // le professeur lit en premier.
        aRetravailler: itemList
            .filter(it => !it.solved || !it.firstTry)
            .map(it => ({
                questionText: it.questionText,
                attendu: it.expected,
                donne: it.given,
                skillId: it.skillId,
                skillLabel: it.skillId ? skillLabel(it.skillId) : '',
                diagnostic: it.misconception,
                essais: it.tries,
                resolue: it.solved,
                // De quoi régénérer exactement la question pour la rejouer.
                seed: it.itemSeed,
                exerciseId: it.exerciseId
            }))
    };
}

const REGLE_LABELS = {
    firstTry: 'Une question rapporte 1 point si elle est réussie du premier coup, sans indice. Sinon 0.',
    ratio: 'Une question rapporte 1 point dès qu\'elle est résolue, quel que soit le nombre d\'essais.',
    ponderee: 'Une question rapporte 1 point, diminué à chaque essai supplémentaire et à chaque indice utilisé.'
};

/**
 * Construit le détail du calcul de la note, étape par étape.
 * Séparé de gradeRun pour rester lisible, et pur comme le reste.
 */
function buildCalcul({ grading, rule, parEtape, totalWeight, ratioPondere, note, sur }) {
    if (!grading || !grading.scale) return null;

    const lignes = parEtape.map(e => ({
        stepId: e.stepId,
        titre: e.title || 'Activité',
        questions: e.questions,
        credit: arrondi2(e.credit),
        ratio: arrondi2(e.ratio),
        poids: e.weight,
        contribution: arrondi2(e.weight * e.ratio)
    }));

    const sommeContributions = arrondi2(lignes.reduce((s, l) => s + l.contribution, 0));
    const pondere = arrondi2(ratioPondere);

    return {
        regle: rule,
        regleLabel: REGLE_LABELS[rule] || REGLE_LABELS.firstTry,
        penalites: rule === 'ponderee' ? (grading.penalties || {}) : null,
        lignes,
        totalPoids: totalWeight,
        sommeContributions,
        ratioPondere: pondere,
        pourcentage: Math.round(pondere * 100),
        sur,
        arrondi: grading.arrondi || 0.5,
        note,
        // Écrit tel qu'on l'écrirait au tableau.
        formule: `(${sommeContributions} ÷ ${totalWeight}) × ${sur} = ${arrondi2(pondere * sur)}`,
        formuleArrondie: `arrondi au ${formatPas(grading.arrondi || 0.5)} → ${note}/${sur}`,
        pluriEtapes: lignes.length > 1
    };
}

function arrondi2(n) {
    return Math.round(n * 100) / 100;
}

function formatPas(pas) {
    if (pas === 0.5) return 'demi-point';
    if (pas === 1) return 'point entier';
    if (pas === 0.25) return 'quart de point';
    return `${pas} point`;
}

/** Appréciation textuelle, pour l'élève comme pour le bulletin. */
export function appreciation(bilan) {
    const r = bilan.ratioPondere;
    if (r >= 0.9) return 'Maîtrise solide. Tu peux passer à la suite.';
    if (r >= 0.7) return 'Objectif atteint. Quelques points restent à consolider.';
    if (r >= 0.5) return 'En cours d\'acquisition : reprends les questions ratées.';
    return 'Notion à retravailler. Refais les exercices d\'entraînement avant l\'évaluation.';
}

/** Niveau global de compétence (NA / EC / A / E) pour un bilan. */
export function niveauGlobal(bilan) {
    return levelFor(bilan.ratioPondere) || LEVELS.NA;
}

/**
 * LE BARÈME, ÉTAPE PAR ÉTAPE — annoncé AVANT de composer.
 *
 * Rémy : « dans la carte parcours, on voit le barème de chaque exercice ».
 * C'est le pendant nécessaire de la note : on ne peut pas noter sans dire sur
 * quoi. Un élève qui sait qu'une étape pèse six points sur vingt sait où passer
 * son temps — et c'est une compétence de devoir, pas une faveur.
 *
 * Le poids d'une étape est celui que le professeur lui a donné (`weight`,
 * 1 par défaut) ; les points en découlent par simple proportion. Les jeux de
 * récompense sont hors barème, comme ils sont hors note.
 *
 * @param {Array} steps   - étapes hydratées du parcours
 * @param {Object} policy - politique du parcours
 * @returns {Map<string, number>|null} stepId → points, ou null si non noté
 */
export function baremeParEtape(steps, policy) {
    const p = resolvePolicy(policy);
    const g = p.grading;
    if (!g || !g.scale || (g.note || 'affichee') === 'aucune') return null;
    const comptees = (steps || []).filter(s => !s.bonus);
    const total = comptees.reduce((s, e) => s + (e.weight || 1), 0);
    if (!total) return null;
    const bareme = new Map();
    comptees.forEach(e => {
        const pts = (g.scale * (e.weight || 1)) / total;
        // Au dixième de point : « 6,7 / 20 » se lit, « 6,666666 » non.
        bareme.set(e.stepId, Math.round(pts * 10) / 10);
    });
    return bareme;
}

/** « 6,5 pts » — l'écriture française, et le pluriel qui va avec. */
export function direBareme(points) {
    const n = String(Math.round(points * 10) / 10).replace('.', ',');
    return `${n} pt${points >= 2 ? 's' : ''}`;
}
