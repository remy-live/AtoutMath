import { calculExercises } from './calcul.js';
import { geometrieExercises } from './geometrie.js';

// Combine all domains
export const exercices = [
    ...calculExercises,
    ...geometrieExercises
];

// Extract unique domains for UI filters
export const domaines = [...new Set(exercices.map(e => e.tags.chemin[0]))].sort();

// Helper functions for legacy IDs mapping (e1 -> calc-add)
const legacyMap = {
    'e1': 'calc-add',
    'e2': 'geom-grid',
    'e3': 'calc-prio',
    'e4': 'calc-mult-flash',
    'e5': 'calc-mult-missing'
};

export function getExerciseById(id) {
    // Map legacy ids if needed
    const realId = legacyMap[id] || id;
    return exercices.find(e => e.id === realId);
}
