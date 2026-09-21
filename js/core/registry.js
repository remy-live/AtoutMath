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
        // CE QUE COMPTE LE COMPTEUR.
        //
        // Rémy, à propos des Amis de Dix : « est-ce qu'on considère qu'on a
        // répondu à une question quand on a relié deux cartes, ou toutes les
        // cartes présentées ? Une vraie question pour la plupart des
        // exercices. » Elle l'est : « 3 / 10 » au-dessus d'un plateau de six
        // paires, d'une grille de sudoku ou d'une partie de dames ne dit pas
        // la même chose à chaque fois, et rien à l'écran ne tranchait.
        //
        // Le compteur ne change pas — c'est bien une paire, une grille, une
        // partie qu'il compte, et c'est la bonne unité de travail. Ce qui
        // manquait, c'est de le DIRE : chaque activité nomme son unité, et le
        // bandeau affiche « 3 / 10 paires ».
        unite: 'question',
        // COMBIEN D'UNITÉS FONT UNE SÉANCE.
        //
        // Rémy, dès que le bandeau s'est mis à nommer l'unité : « mais du coup
        // 10 paires c'est très court ». Évidemment — dix était le nombre de
        // QUESTIONS, et il valait pour tout le monde tant que personne ne
        // regardait ce qu'il comptait. Dix paires, c'est deux tables des Amis
        // de Dix ; dix grilles de sudoku, c'est une heure et demie ; dix
        // parties d'échecs, c'est une soirée.
        //
        // Chaque activité dit donc son compte naturel, et c'est ce nombre-là
        // que proposent le jeu libre, le panneau de réglages et le
        // constructeur de parcours. Le professeur le change quand il veut :
        // c'est un DÉFAUT, pas une règle.
        parDefaut: 10,
        ...def
    });
    return def.id;
}

/**
 * L'unité de travail d'une activité, accordée en nombre.
 * @param {string} id - identifiant d'activité
 * @param {number} n  - le nombre à accorder
 */
export function uniteDe(id, n = 1) {
    const a = activities.get(id);
    const mot = (a && a.unite) || 'question';
    if (n <= 1) return mot;
    // LE PLURIEL FRANÇAIS N'EST PAS TOUJOURS UN « S ». L'en-tête affichait
    // « 0 / 4 tableaus » — un mot en -eau, -eu ou -au prend un X. C'est trois
    // lignes, et c'est ce que lit un élève à chaque question.
    if (/[sxz]$/.test(mot)) return mot;
    if (/(eau|au|eu)$/.test(mot)) return `${mot}x`;
    if (/al$/.test(mot)) return `${mot.slice(0, -2)}aux`;
    return `${mot}s`;
}

/** Le nombre d'unités d'une séance pour cette activité (10 par défaut). */
export function parDefautDe(id) {
    const a = activities.get(id);
    return (a && a.parDefaut) || 10;
}

// --- CETTE ACTIVITÉ PRODUIT-ELLE UNE NOTE ? ---------------------------------
//
// RÉMY : « est-ce que tous les exercices sont vraiment évaluables ? »
//
// NON, ET IL FAUT POUVOIR LE DIRE. Une note est un compte de questions
// ratées ; une activité qui ne peut RIEN rater n'en produit pas — elle rend 20
// à qui la traverse, quoi qu'il fasse. MESURÉ en cherchant, dans chaque module,
// une tentative fausse qui ne soit pas marquée `partiel`
// (`tools/tmp/notable3.mjs`) : 28 exercices sur 172 sont dans ce cas.
//
// Ils ne sont pas ratés pour autant — ce sont des CONSTRUCTIONS et des
// RÉFLEXIONS : un organigramme qu'on bâtit jusqu'à ce qu'il tienne, un
// pousseur qu'on recommence, une partie contre l'ordinateur. Leur réussite
// n'est pas un compte de bonnes réponses, et vouloir leur en tirer une note
// donnerait justement le 20 de participation qu'on veut éviter.
//
// LE MARQUAGE SE LIT EN UN SEUL ENDROIT — voir `activities/index.js`. Le
// disperser sur vingt-huit déclarations rendrait la liste illisible, et un test
// la redérive du code pour qu'elle ne dérive pas.
//
// ET IL PEUT DÉPENDRE DES RÉGLAGES : les échecs, les dames et l'othello notent
// en « mat en un, mat en deux » — un coup faux est un coup faux — mais pas en
// « partie contre l'ordinateur », où il n'y a pas de bonne réponse, seulement
// un vainqueur. La marque accepte donc une fonction des paramètres.
export function declarerSansNote(id, quand = false) {
    const a = activities.get(id);
    if (!a) throw new Error(`[registry] activité inconnue : ${id}`);
    a.notable = quand;
}

/**
 * @param {string} id       identifiant d'activité
 * @param {Object} [params] les réglages de CET exercice
 */
export function activiteNotable(id, params = {}) {
    const a = activities.get(id);
    if (!a || a.notable === undefined) return true;
    return typeof a.notable === 'function' ? !!a.notable(params || {}) : !!a.notable;
}

export function getGenerator(id) {
    return generators.get(id) || null;
}

/**
 * LE GÉNÉRATEUR DE LA FICHE — un seul endroit qui le sait.
 *
 * Un exercice peut IMPRIMER AUTRE CHOSE qu'il ne joue : le repérage pose un
 * point à l'écran et six sur la feuille, la virgule se fait glisser à l'écran
 * et s'écrit sur le papier. C'est `printGeneratorId` qui le dit.
 *
 * La règle était appliquée dans la modale d'impression seulement, et quatre
 * autres endroits décidaient encore « cet exercice a-t-il une fiche ? » en
 * regardant `generatorId` tout court : le bouton n'apparaissait donc jamais
 * pour les exercices qui n'existent qu'à l'écran ET ont une fiche dédiée. Une
 * seule fonction, et la question ne peut plus recevoir deux réponses.
 */
export function generateurDeFiche(exo) {
    if (!exo) return null;
    return getGenerator(exo.printGeneratorId || exo.generatorId);
}

/** Cet exercice a-t-il une fiche papier — grille dessinée ou questions écrites ? */
export function aUneFichePapier(exo) {
    const g = generateurDeFiche(exo);
    return !!(exo && (exo.printable || (g && g.ecrit)));
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
