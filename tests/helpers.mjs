// Utilitaires de test.
//
// Les modules du noyau sont écrits pour le navigateur mais ne dépendent du DOM
// que par `document.dispatchEvent`. On fournit ici le strict minimum pour les
// charger sous Node, ce qui permet de tester les fonctions pures sans
// navigateur ni outil de build.

if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
        addEventListener() { },
        dispatchEvent() { return true; },
        getElementById() { return null; },
        querySelectorAll() { return []; },
        createElement() { return { style: {}, classList: { add() { }, remove() { }, toggle() { } }, appendChild() { } }; }
    };
}
if (typeof globalThis.CustomEvent === 'undefined') {
    globalThis.CustomEvent = class CustomEvent {
        constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
    };
}
if (typeof globalThis.window === 'undefined') {
    globalThis.window = { addEventListener() { }, location: { origin: '', pathname: '' } };
}

let counter = 0;

/** Fabrique un événement de tentative, avec des valeurs par défaut sensées. */
export function attempt(overrides = {}) {
    counter++;
    return {
        id: `ev_${counter}`,
        type: 'attempt',
        ts: overrides.ts ?? Date.now(),
        profileId: 'p_test',
        deviceId: 'd_test',
        payload: {
            runId: 'run_1',
            stepId: 's1',
            exerciseId: 'calc-mult-flash',
            exerciseTitle: 'Flash Mult',
            skillId: 'num.mult.table.7',
            itemSeed: `seed_${counter}`,
            questionText: '7 × 8',
            given: '56',
            expected: 56,
            correct: true,
            attemptIndex: 0,
            msElapsed: 2000,
            hintsUsed: 0,
            points: 10,
            ...overrides
        }
    };
}

export function event(type, payload = {}, ts = Date.now()) {
    counter++;
    return { id: `ev_${counter}`, type, ts, profileId: 'p_test', deviceId: 'd_test', payload };
}

export const DAY = 86400000;
