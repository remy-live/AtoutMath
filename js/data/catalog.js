import { calculExercises } from './calcul.js';
import { numerationExercises } from './numeration.js';
import { fractionsExercises } from './fractions.js';
import { geometrieExercises } from './geometrie.js';
import { mesuresExercises } from './mesures.js';
import { donneesExercises } from './donnees.js';
import { getGenerator, getActivity } from '../core/registry.js';
import { matchSkills } from './skills.js';
import { STATUS } from './status.js';

export const exercices = [
    ...numerationExercises,
    ...calculExercises,
    ...fractionsExercises,
    ...geometrieExercises,
    ...mesuresExercises,
    ...donneesExercises
];

export const domaines = [...new Set(exercices.map(e => e.tags.chemin[0]))].sort();

// L'état de publication est une propriété du contenu, déclarée dans les
// fichiers de données et versionnée avec le code — pas un réglage local : ce
// qu'un élève a le droit de voir ne doit pas dépendre du poste sur lequel il
// travaille.
export { STATUS, STATUS_LABELS, STATUS_CYCLE } from './status.js';

/** Un exercice sans statut déclaré est considéré comme validé. */
export function statusOf(exo) {
    return (exo && exo.status) || STATUS.VALIDE;
}

/**
 * Filtre le catalogue. Fonction pure : c'est elle qui décide ce qui est
 * visible, et elle est testée séparément de l'interface.
 *
 * @param {Array} list
 * @param {Object} opts
 * @param {string} [opts.only]      - ne garder que ce statut ('tout' = pas de filtre)
 * @param {boolean} [opts.teacher]  - le mode professeur voit aussi les exercices en test
 */
export function filterByStatus(list, { only = 'tout', teacher = false } = {}) {
    if (only && only !== 'tout') return list.filter(e => statusOf(e) === only);
    // Sans filtre explicite : un brouillon reste caché, et un exercice en
    // test n'est proposé qu'au professeur.
    return list.filter(e => {
        const s = statusOf(e);
        if (s === STATUS.BROUILLON) return false;
        if (s === STATUS.TEST) return teacher;
        return true;
    });
}

export function countByStatus(list) {
    const counts = { [STATUS.VALIDE]: 0, [STATUS.TEST]: 0, [STATUS.BROUILLON]: 0 };
    list.forEach(e => { counts[statusOf(e)]++; });
    return counts;
}

// Anciens identifiants encore présents dans des parcours ou des liens partagés.
const legacyMap = {
    e1: 'calc-add', e2: 'geom-grid', e3: 'calc-prio', e4: 'calc-mult-flash', e5: 'calc-mult-missing'
};

/**
 * Un exercice se RÉVISE-T-IL ?
 *
 * Non pour les jeux de pure logique — sudoku, binairo, démineur. Y « rater une
 * question » n'a pas de sens : il n'y a pas de question, il y a une grille, et
 * la rejouer à l'identique reviendrait à redonner la même grille déjà résolue.
 * Ces jeux entraînent le raisonnement, pas une connaissance qu'on révise à la
 * demande — et leurs entrées noyaient un carnet qui doit se lire en dix
 * secondes.
 */
export function estRevisable(exoOuId) {
    const exo = typeof exoOuId === 'string' ? getExerciseById(exoOuId) : exoOuId;
    return !(exo && exo.sansRevision);
}

/**
 * « À deux » : il faut être DEUX devant le même écran pour y jouer.
 *
 * Ce n'est ni un domaine ni un niveau — c'est une condition matérielle, et
 * elle mérite sa propre marque : un élève seul qui ouvre un duel se retrouve
 * devant un jeu qu'il ne peut pas jouer, et le professeur qui cherche une
 * activité de fin d'heure ne sait pas lesquelles s'y prêtent.
 */
export function estADeux(exoOuId) {
    const exo = typeof exoOuId === 'string' ? getExerciseById(exoOuId) : exoOuId;
    return !!(exo && exo.deuxJoueurs);
}

export function getExerciseById(id) {
    return exercices.find(e => e.id === (legacyMap[id] || id)) || null;
}

/**
 * Compétences travaillées par un exercice. Déduites du générateur : le
 * catalogue n'a pas à les recopier, donc elles ne peuvent pas diverger.
 */
export function skillsOf(exo) {
    if (!exo) return [];
    if (exo.skills) return exo.skills.flatMap(matchSkills);
    const gen = exo.generatorId ? getGenerator(exo.generatorId) : null;
    return gen ? gen.resolvedSkills : [];
}

/**
 * Schéma de configuration d'un exercice : paramètres du générateur, puis de
 * l'activité. Un jeu autonome déclare encore son schéma en dur dans le
 * catalogue (`paramSchema`), faute de générateur pour le porter.
 */
export function paramSchemaOf(exo) {
    if (!exo) return [];
    if (exo.paramSchema) return exo.paramSchema;
    const gen = exo.generatorId ? getGenerator(exo.generatorId) : null;
    const act = exo.activityId ? getActivity(exo.activityId) : null;
    return [...((gen && gen.params) || []), ...((act && act.params) || [])];
}

/** Exercices permettant de travailler une compétence donnée. */
export function exercisesForSkill(skillId) {
    return exercices.filter(e => skillsOf(e).includes(skillId));
}
