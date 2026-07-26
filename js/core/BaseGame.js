import { regTimeout, regInterval } from './timers.js';
import { state } from './state.js';

export class BaseGame {
    constructor(container, isDemo, params, gameId) {
        this.container = container;
        this.isDemo = isDemo;
        this.params = params || {};
        this.gameId = gameId;
        this.isRunning = false;
    }

    start() {
        this.isRunning = true;
        this.container.innerHTML = '';
        this.render();
        if (this.isDemo) {
            this.runDemoSequence();
        } else {
            this.startGameLoop();
        }
    }

    destroy() {
        this.isRunning = false;
        this.container.innerHTML = '';
    }

    // --- Méthodes Abstraites (à surcharger) ---
    render() {
        console.warn('render() not implemented in subclass');
    }
    
    runDemoSequence() {
        console.warn('runDemoSequence() not implemented in subclass');
    }
    
    startGameLoop() {
        console.warn('startGameLoop() not implemented in subclass');
    }

    // --- Outils Communs ---
    
    onCorrectAnswer(el) {
        if (el) {
            el.style.backgroundColor = "#dcfce7";
            el.style.transform = "scale(1.1)";
        }
        state.celebrate(el || this.container, 10);
    }

    onWrongAnswer(el, errorSnapshot) {
        if (el) {
            el.style.backgroundColor = "var(--danger)";
            el.style.transform = "scale(0.95)";
        }
        
        // Log error which auto-updates SequenceRunner with a failure
        import('./errorSchema.js').then(schema => {
            const snap = schema.createErrorSnapshot(errorSnapshot);
            state.logError(state.activeExo, snap);
        });
    }

    getRandomTable() {
        const tables = this.params.tables && this.params.tables.length > 0 ? this.params.tables : [2, 3, 4, 5, 6, 7, 8, 9, 10];
        return tables[Math.floor(Math.random() * tables.length)];
    }

    getRandomMultiplier() {
        return Math.floor(Math.random() * 10) + 1; // 1 to 10
    }
}
