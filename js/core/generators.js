// Compatibilité : ancienne API de génération de questions.
//
// Les jeux autonomes encore en place (Memory, Météorites) consomment ces
// fonctions. Elles délèguent désormais aux générateurs du registre pour que
// le contenu reste identique partout — un seul endroit décide de ce qu'est
// « une question de table de 7 », distracteurs et explication compris.
//
// À supprimer quand ces deux jeux auront été portés sur le contrat Item.

import { makeRng } from './ids.js';
import { multFactGenerator, additionGenerator, multMissingGenerator, prioriteGenerator } from './generators/calcul.js';

const rng = () => makeRng();

export function pickDistractors(correct, candidateFn, count) {
    const vals = [correct];
    let guard = 0;
    while (vals.length < count + 1 && guard++ < 300) {
        const c = candidateFn();
        if (!vals.includes(c)) vals.push(c);
    }
    return vals.sort(() => Math.random() - 0.5);
}

export function pickTableWeighted(allowedTables, weakTables = []) {
    const tables = allowedTables && allowedTables.length ? allowedTables : [2, 3, 4, 5, 6, 7, 8, 9, 10];
    const usable = (weakTables || []).filter(t => tables.includes(t));
    if (usable.length && Math.random() < 0.6) return usable[Math.floor(Math.random() * usable.length)];
    return tables[Math.floor(Math.random() * tables.length)];
}

export function generateAdditionFact() {
    const item = additionGenerator.generate({ max: 10 }, { rng: rng() });
    return { a: item.meta.a, b: item.meta.b, target: item.answer, concept: 'addition', skillId: item.skillId, seed: item.seed };
}

export function additionDistractors(target) {
    return [target, target - 1, target + 1].sort(() => Math.random() - 0.5);
}

export function additionExplanation(a, b, target) {
    return `Rappel : ${a} + ${b} = ${target}.`;
}

export function generateMultFact(tables, weakTables = []) {
    const item = multFactGenerator.generate({ tables }, { rng: rng(), weakTables });
    const { t, m, ans } = item.meta;
    return { t, m, ans, concept: `mult:${t}`, skillId: item.skillId, seed: item.seed };
}

export function multDistractors(t, ans, count = 2) {
    return pickDistractors(ans, () => t * (Math.floor(Math.random() * 10) + 1), count);
}

export function multExplanation(t, m, ans) {
    return `Rappel : ${t} × ${m} = ${ans}.`;
}

export function generateMultMissing(tables, weakTables = []) {
    const item = multMissingGenerator.generate({ tables }, { rng: rng(), weakTables });
    const { known, missing, product, firstMissing } = item.meta;
    return {
        targetFactor: known, missingFactor: missing, product,
        isFirstMissing: firstMissing, concept: `mult:${known}`, skillId: item.skillId, seed: item.seed
    };
}

export function multMissingDistractors(missingFactor, count = 11) {
    return pickDistractors(missingFactor, () => Math.floor(Math.random() * 12) + 1, count);
}

export function multMissingExplanation(targetFactor, missingFactor, product) {
    return `Astuce : ${product} ÷ ${targetFactor} = ${missingFactor}.`;
}

export function generatePriorityQuestion() {
    const item = prioriteGenerator.generate({ mode: 'operation' }, { rng: rng() });
    return { ...item.meta, concept: 'priority', skillId: item.skillId, seed: item.seed };
}

export function priorityExplanation(right) {
    return `Faux ! La multiplication est prioritaire sur l'addition et la soustraction : on calcule d'abord ${right}.`;
}
