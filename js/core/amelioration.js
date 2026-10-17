// LE PARCOURS DE RÉVISION D'UN BILAN — « M'améliorer », et rien d'autre.
//
// RÉMY : « à la fin d'un parcours, lors du bilan envoyé à l'élève, il faut
// qu'il ait sur son écran un bouton M'améliorer où tu crées un parcours de
// révision, est ce clair ? » — oui.
//
// POURQUOI UN MODULE À PART DE `remediation.js`, QUI PORTE DÉJÀ LES TROIS
// AUTRES PORTES DE RÉVISION. Deux raisons, et la seconde a décidé :
//
//   · `remediation.js` importe `core/state.js`, qui a besoin d'un `document` :
//     il ne s'importe donc PAS dans node, et aucune épreuve ne pouvait lire
//     cette règle. Mesuré en le chargeant à la main depuis node : « document is
//     not defined ». Ici, rien que le catalogue et `makeStep` ;
//   · et le BILAN de l'élève n'a plus à charger tout le modèle de maîtrise
//     pour savoir s'il doit afficher un bouton.
//
// `remediation.js` s'en sert et garde le lancement, qui monte un meneur.

import { makeStep } from './path.js';
import { exercisesForSkill, getExerciseById } from '../data/catalog.js';

// COMBIEN D'ÉTAPES AU PLUS DANS UN PARCOURS DE RÉVISION. Huit questions ratées
// font huit étapes de deux questions : c'est déjà un quart d'heure, et au-delà
// l'élève ne révise plus, il recommence sa séance.
const AU_PLUS_DETAPES = 8;
// LE SEUIL D'UNE COMPÉTENCE À CONSOLIDER — le même que `ACQUIS` dans
// core/grading.js, qui décide déjà du mot « c'est acquis » sous la note. Deux
// seuils différents pour la même idée feraient dire au bilan « c'est acquis »
// au-dessus d'un bouton qui propose de le retravailler.
const A_CONSOLIDER = 0.8;
// Et sous ce nombre de questions, un taux ne veut rien dire : une compétence
// vue une seule fois n'est ni acquise ni perdue.
const ASSEZ_DE_QUESTIONS = 2;

/**
 * LES ÉTAPES D'UN PARCOURS DE RÉVISION, TIRÉES D'UN BILAN.
 *
 * ── LA DEMANDE DE RÉMY, MOT POUR MOT ───────────────────────────────────────
 *
 * « à la fin d'un parcours, lors du bilan envoyé à l'élève, il faut qu'il ait
 * sur son écran un bouton M'améliorer où tu crées un parcours de révision, est
 * ce clair ? » — oui.
 *
 * ── DEUX SOURCES, ET IL FAUT LES DEUX ──────────────────────────────────────
 *
 * LES QUESTIONS RATÉES D'ABORD, à l'identique puis en variante : c'est la règle
 * de ce module depuis le début, et c'est la plus précise qu'on ait — on ne
 * révise pas « les fractions », on révise CETTE question-là, celle qu'on vient
 * de manquer.
 *
 * PUIS LES COMPÉTENCES QUI N'ONT PAS TENU, et c'est ce qui manquait. Un élève
 * peut finir une séance sans AUCUNE question définitivement ratée — il les a
 * toutes rattrapées au second essai — et sortir avec une compétence à 60 %. Le
 * bouton lui aurait répondu « rien à réviser », ce qui est faux et décourage
 * exactement celui qui venait demander. On prend alors les plus basses, un
 * exercice chacune, cinq questions : de quoi reprendre, pas de quoi refaire la
 * séance.
 *
 * ON NE PREND PAS DEUX FOIS LE MÊME EXERCICE : l'élève qui a raté deux
 * questions de la Pizzeria n'a pas besoin de deux étapes de Pizzeria — la
 * première porte déjà sa graine, et la seconde ne dirait que « encore ».
 *
 * @param {object} bilan tel que `gradeRun` le rend
 * @returns {Array} les étapes, dans l'ordre où l'élève les traversera
 */
export function etapesDAmelioration(bilan) {
    const steps = [];
    const vus = new Set();

    // ON RESTE DANS LES EXERCICES DE LA SÉANCE, et c'est une correction que la
    // sonde a imposée : la première version appelait `firstExerciseForSkill`
    // pour une compétence faible, et le parcours de révision d'une séance de
    // « la règle du signe » s'ouvrait sur « Priorités et relatifs » — un
    // exercice que Rémy n'avait pas mis dans sa séance, et qui demande plus
    // que ce qu'il venait de travailler. Le bilan sait sur quel exercice chaque
    // compétence a été vue : on le lui demande, et le catalogue ne sert plus
    // qu'en dernier recours.
    const parCompetenceVue = new Map();
    for (const q of ((bilan && bilan.aRetravailler) || [])) {
        if (q && q.skillId && q.exerciseId && !parCompetenceVue.has(q.skillId)
            && getExerciseById(q.exerciseId)) {
            parCompetenceVue.set(q.skillId, q.exerciseId);
        }
    }

    const parExo = new Map();
    for (const q of ((bilan && bilan.aRetravailler) || []).filter(x => x && !x.resolue)) {
        if (steps.length >= AU_PLUS_DETAPES) break;
        const exoId = exerciseForQuestion(q);
        if (!exoId || vus.has(exoId)) continue;
        vus.add(exoId);
        parExo.set(exoId, steps.length);
        steps.push(makeStep(exoId, {}, {
            nbItems: 2,        // la question ratée, puis une similaire
            threshold: 2,
            forceSeed: q.seed || null,
            titre: q.skillLabel || ''
        }));
    }

    const faibles = ((bilan && bilan.parCompetence) || [])
        .filter(c => c && c.skillId && Number(c.questions) >= ASSEZ_DE_QUESTIONS
            && Number(c.taux) < A_CONSOLIDER)
        .slice()
        .sort((a, b) => a.taux - b.taux);
    for (const c of faibles) {
        if (steps.length >= AU_PLUS_DETAPES) break;
        const exoId = parCompetenceVue.get(c.skillId) || firstExerciseForSkill(c.skillId);
        if (!exoId) continue;
        // L'EXERCICE Y EST DÉJÀ ? ON RALLONGE SON ÉTAPE PLUTÔT QUE D'EN AJOUTER
        // UNE SECONDE. Deux questions suffisent à vérifier qu'une question
        // ratée est comprise ; elles ne suffisent pas pour une compétence à
        // 60 %, et deux étapes du même exercice à la suite ne diraient que
        // « encore ».
        if (vus.has(exoId)) {
            const i = parExo.get(exoId);
            if (i !== undefined && steps[i].nbItems < 4) {
                steps[i].nbItems = 4;
                steps[i].threshold = 3;
            }
            continue;
        }
        vus.add(exoId);
        steps.push(makeStep(exoId, {}, { nbItems: 5, threshold: 4, titre: c.label || '' }));
    }
    return steps;
}

/**
 * Y A-T-IL QUELQUE CHOSE À AMÉLIORER ? — ce qui décide si le bouton paraît.
 *
 * UN « M'AMÉLIORER » SOUS UN BILAN PARFAIT NE DIT PAS « bravo », il dit « ce
 * n'était pas encore assez ». C'est le même raisonnement que `peutRefaire` dans
 * core/runner.js, et il vaut ici pour la même raison.
 */
export function ilYAQuoiAmeliorer(bilan) {
    return etapesDAmelioration(bilan).length;
}

// --- Quel exercice pour quoi ------------------------------------------------
//
// CES DEUX-LÀ VIVENT ICI PARCE QU'ILS NE DEMANDENT QUE LE CATALOGUE, et qu'ils
// servent des deux côtés. Ils étaient dans `remediation.js` ; les RECOPIER
// aurait été la quatrième occurrence d'une règle écrite deux fois dans ce dépôt
// — voir `docs/frictions.md`. On les déplace, et `remediation.js` les importe.

export function firstExerciseForSkill(skillId) {
    if (!skillId) return null;
    const list = exercisesForSkill(skillId);
    if (!list.length) return null;
    // On privilégie un exercice non chronométré : en remédiation, la pression
    // temporelle nuit à la compréhension.
    const calm = list.find(e => !(e.params && e.params.timeLimit));
    return (calm || list[0]).id;
}

export function exerciseForQuestion(q) {
    if (q.exerciseId && getExerciseById(q.exerciseId)) return q.exerciseId;
    return firstExerciseForSkill(q.skillId);
}
