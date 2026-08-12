// Registre des générateurs et des activités.
//
// Remplace l'ancienne résolution par nom de fichier
// (`import('./' + exo.gameType + '.js')` puis « premier export commençant par
// engine »). Ici chaque brique se déclare avec un manifeste explicite : ce
// qu'elle sait faire, ce qu'elle accepte, comment on la charge.
//
// Bénéfices concrets :
//  - le moteur peut vérifier AVANT lancement qu'un générateur et une activité
//    sont compatibles, au lieu d'échouer dans la console ;
//  - le constructeur de parcours peut proposer « cette notion, dans ce jeu » ;
//  - plus de rechargement de module à chaque partie (l'ancien `?v=Date.now()`).

import { matchSkills } from '../data/skills.js';

/** @type {Map<string, Object>} */
const generators = new Map();
/** @type {Map<string, Object>} */
const activities = new Map();

/**
 * @param {Object} def
 * @param {string} def.id
 * @param {string} def.label
 * @param {string[]} def.skills        - ids ou motifs ('num.mult.table.*')
 * @param {string[]} def.answerKinds
 * @param {Array} [def.params]         - schéma de configuration
 * @param {boolean} [def.ecrit]        - voir ci-dessous
 * @param {(params:Object, ctx:Object)=>Object} def.generate
 *
 * `ecrit` : cette question se pose TELLE QUELLE sur une feuille, sans rien
 * d'autre que son texte. C'est le générateur qui le sait, et lui seul —
 * « 7 × 8 = ? » se photocopie, « Quelle heure est-il ? » ne veut rien dire
 * sans le cadran, « Place le point B (4 ; 1) » sans le repère non plus. Le
 * drapeau commande le bouton « Travailler sur papier » : sans lui, l'élève
 * recevrait une fiche de questions auxquelles il manque l'essentiel.
 */
export function registerGenerator(def) {
    if (!def || !def.id) throw new Error('[registry] générateur sans id');
    if (typeof def.generate !== 'function') throw new Error(`[registry] ${def.id}: generate() manquant`);
    generators.set(def.id, {
        params: [],
        answerKinds: ['choice'],
        skills: [],
        ...def,
        resolvedSkills: (def.skills || []).flatMap(matchSkills)
    });
    return def.id;
}

/**
 * @param {Object} def
 * @param {string} def.id
 * @param {string} def.label
 * @param {string[]} def.accepts       - genres de réponse rendus ('choice', 'numeric'…)
 * @param {Object} [def.supports]      - { timed, autonomous, demo }
 * @param {Array} [def.params]
 * @param {()=>Promise<Object>} def.load - import dynamique du module de rendu
 */
export function registerActivity(def) {
    if (!def || !def.id) throw new Error('[registry] activité sans id');
    activities.set(def.id, {
        accepts: [],
        params: [],
        supports: { timed: false, autonomous: false, demo: true },
        ...def
    });
    return def.id;
}

export function getGenerator(id) {
    return generators.get(id) || null;
}

export function getActivity(id) {
    return activities.get(id) || null;
}

export function allGenerators() {
    return [...generators.values()];
}

export function allActivities() {
    return [...activities.values()];
}

/** Générateurs capables de travailler une compétence donnée. */
export function generatorsForSkill(skillId) {
    return allGenerators().filter(g => g.resolvedSkills.includes(skillId));
}

/**
 * Une activité peut-elle présenter les questions de ce générateur ?
 * Les activités autonomes (Tetris, Course…) gèrent leur propre contenu :
 * elles ne se combinent pas avec un générateur externe.
 */
export function isCompatible(generatorId, activityId) {
    const g = getGenerator(generatorId);
    const a = getActivity(activityId);
    if (!g || !a) return false;
    if (a.supports.autonomous) return false;
    return g.answerKinds.some(k => a.accepts.includes(k));
}

/** Toutes les activités où ce générateur peut tourner. */
export function activitiesFor(generatorId) {
    return allActivities().filter(a => isCompatible(generatorId, a.id));
}

/**
 * Diagnostic de cohérence du catalogue, appelé au démarrage en développement.
 * Signale les exercices qui référencent une brique inexistante ou une
 * combinaison incompatible — plutôt que d'échouer silencieusement en jeu.
 */
export function validateCatalog(exercises) {
    const problems = [];
    for (const exo of exercises) {
        if (exo.activityId && !getActivity(exo.activityId)) {
            problems.push(`${exo.id}: activité inconnue "${exo.activityId}"`);
            continue;
        }
        if (exo.generatorId) {
            const act0 = getActivity(exo.activityId);
            if (!getGenerator(exo.generatorId)) {
                problems.push(`${exo.id}: générateur inconnu "${exo.generatorId}"`);
            } else if (exo.activityId && !isCompatible(exo.generatorId, exo.activityId)
                && !(act0 && act0.supports.autonomous)) {
                // UNE ACTIVITÉ AUTONOME NE CONSOMME PAS SON GÉNÉRATEUR.
                //
                // La rédaction géométrique porte les deux : à l'écran elle mène
                // son propre jeu, et le générateur ne sert qu'à IMPRIMER la
                // même notion sur une feuille. Exiger qu'ils soient compatibles
                // reviendrait à interdire d'imprimer les activités autonomes —
                // alors que rédiger une justification est précisément ce qui
                // gagne le plus à sortir de l'écran.
                problems.push(`${exo.id}: "${exo.generatorId}" ne peut pas s'afficher dans "${exo.activityId}"`);
            }
        }
        const act = getActivity(exo.activityId);
        if (act && !act.supports.autonomous && !exo.generatorId) {
            problems.push(`${exo.id}: l'activité "${exo.activityId}" attend un générateur`);
        }
    }
    return problems;
}
