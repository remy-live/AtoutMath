// Compatibilité : ancienne API `new SequenceRunner(steps, deviceMode)`.
//
// Le moteur réel est js/core/runner.js, qui travaille sur un parcours
// (référence + politique) et non sur un tableau d'exercices copiés. Ce module
// convertit l'ancien appel et disparaîtra une fois tous les appelants migrés.

import { Runner } from './runner.js';
import { normalizePath } from './path.js';
import { defaultPolicy } from './policy.js';

export class SequenceRunner {
    constructor(steps, deviceMode = 'mobile', options = {}) {
        this.path = normalizePath(Array.isArray(steps) ? steps : (steps.steps || []), options.name || 'Parcours');
        if (options.policy) this.path.policy = options.policy;
        else this.path.policy = defaultPolicy();
        this.deviceMode = deviceMode === 'none' ? 'none' : deviceMode;
        this.isStudentPath = false;
        this.options = options;
        this.runner = null;
    }

    start() {
        this.runner = new Runner({
            path: this.path,
            deviceMode: this.deviceMode,
            isStudentPath: this.isStudentPath,
            onExit: this.options.onExit || null
        });
        return this.runner.start();
    }

    abort() {
        if (this.runner) this.runner.abort();
    }

    onAttempt(payload) {
        if (this.runner) this.runner.onAttempt(payload);
    }

    onGameAction(isSuccess) {
        if (this.runner) this.runner.onGameAction(isSuccess);
    }
}
