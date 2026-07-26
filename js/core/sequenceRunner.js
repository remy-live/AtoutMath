import { state } from './state.js';
import { launchEngine } from '../games/engine.js';
import { clearEngines } from './timers.js';

export class SequenceRunner {
    constructor(sequenceConfig, deviceMode = 'mobile') {
        this.sequence = sequenceConfig;
        this.deviceMode = deviceMode;
        this.currentIndex = 0;
        this.stats = { totalCorrect: 0, totalErrors: 0, totalQuestions: 0 };
        this.startTime = 0;
    }

    start() {
        if (!this.sequence || this.sequence.length === 0) return;
        this.currentIndex = 0;
        this.stats = { totalCorrect: 0, totalErrors: 0, totalQuestions: 0 };
        this.startTime = Date.now();
        this.runCurrentStep();
    }

    runCurrentStep() {
        if (this.currentIndex >= this.sequence.length) {
            this.finishSequence();
            return;
        }

        const step = this.sequence[this.currentIndex];
        const canvas = document.getElementById('game-canvas') || document.getElementById('game-board');
        const overlay = document.getElementById('demo-overlay-banner');
        if (overlay) overlay.style.display = 'none';

        const titleEl = document.getElementById('game-title');
        if (titleEl) {
            if (step.isSingleExercise) {
                titleEl.textContent = step.title;
            } else {
                titleEl.textContent = `${step.title} (Activité ${this.currentIndex + 1}/${this.sequence.length})`;
            }
        }

        const gl = document.getElementById('game-layer');
        gl.classList.remove('device-simulator', 'tablet-simulator');
        if (this.deviceMode === 'tablet') gl.classList.add('tablet-simulator');
        else if (this.deviceMode === 'mobile') gl.classList.add('device-simulator');
        gl.style.display = 'flex';
        
        state.activeSequenceRunner = this;
        state.activeExo = step; // Fix: Set activeExo so the Demo button doesn't crash

        // Injected proxy params
        const runParams = step.currentParams ? { ...step.currentParams } : {};
        if (!runParams.nbQuestions && !runParams.timeLimit) runParams.nbQuestions = 5; 
        
        this.currentRunParams = runParams;
        this.stepStats = { correct: 0, errors: 0 };
        this.stepStartTime = Date.now();
        
        this.updateProgressUI();
        this.startTimer();

        launchEngine(step, canvas, false, runParams);
        
        // Remove manual next button if it exists
        const nextBtn = document.getElementById('seq-next-btn');
        if(nextBtn) nextBtn.style.display = 'none';
    }

    updateProgressUI() {
        const progressContainer = document.getElementById('game-progress-container');
        const progressBar = document.getElementById('game-progress-bar');
        const progressText = document.getElementById('game-progress-text');
        
        if (progressContainer && progressBar && progressText) {
            progressContainer.style.display = 'flex';
            
            const targetQ = this.currentRunParams.nbQuestions || Infinity;
            const reqSuccess = this.currentRunParams.successThreshold || (targetQ === Infinity ? this.currentRunParams.minScore || 1 : targetQ);
            
            // Limit displayed progress to the required threshold
            const displayedProgress = Math.min(this.stepStats.correct, reqSuccess);
            
            progressBar.style.width = `${(displayedProgress / reqSuccess) * 100}%`;
            progressText.textContent = `${displayedProgress} / ${reqSuccess}`;
            
            if (displayedProgress >= reqSuccess) {
                progressBar.style.background = 'var(--success)';
            } else {
                progressBar.style.background = 'linear-gradient(90deg, var(--primary), var(--accent))';
            }
        }
    }

    startTimer() {
        // Clear any existing timer UI
        let timerBarContainer = document.getElementById('game-timer-container');
        if (timerBarContainer) timerBarContainer.style.display = 'none';
        if (this.timerInterval) clearInterval(this.timerInterval);

        if (!this.currentRunParams.timeLimit) return;
        this.timeLeft = this.currentRunParams.timeLimit;
        
        const progressContainer = document.getElementById('game-progress-container');
        if (!timerBarContainer) {
            timerBarContainer = document.createElement('div');
            timerBarContainer.id = 'game-timer-container';
            timerBarContainer.style = 'position: fixed; top: 0; left: 0; width: 100%; height: 6px; background: rgba(239, 68, 68, 0.2); z-index: 99999; margin: 0; border-radius: 0; pointer-events: none;';
            
            const timerBar = document.createElement('div');
            timerBar.id = 'game-timer-bar';
            timerBar.style = 'width: 100%; height: 100%; background: var(--danger); transition: width 1s linear; box-shadow: 0 0 10px var(--danger);';
            
            timerBarContainer.appendChild(timerBar);
            document.body.appendChild(timerBarContainer);
        }
        timerBarContainer.style.display = 'block';
        
        // Reset bar width immediately (remove transition for the reset)
        const timerBar = document.getElementById('game-timer-bar');
        if (timerBar) {
            timerBar.style.transition = 'none';
            timerBar.style.width = '100%';
            // Force reflow
            void timerBar.offsetWidth;
            timerBar.style.transition = 'width 1s linear';
        }
        
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            if (timerBar) {
                const pct = Math.max(0, (this.timeLeft / this.currentRunParams.timeLimit) * 100);
                timerBar.style.width = `${pct}%`;
            }
            
            if (this.timeLeft <= 0) {
                clearInterval(this.timerInterval);
                this.forceEndStep();
            }
        }, 1000);
    }

    onGameAction(isSuccess) {
        if (isSuccess) this.stepStats.correct++;
        else this.stepStats.errors++;
        
        this.stats.totalQuestions++;
        
        this.updateProgressUI();

        const totalAnswers = this.stepStats.correct + this.stepStats.errors;
        const targetQ = this.currentRunParams.nbQuestions || Infinity;
        const reqSuccess = this.currentRunParams.successThreshold || (targetQ === Infinity ? this.currentRunParams.minScore || 1 : targetQ);
        
        if (totalAnswers >= targetQ && !this.currentRunParams.timeLimit) {
            // Fin de l'exercice (mode questions limitées)
            setTimeout(() => {
                this.forceEndStep();
            }, 1800);
        }
    }

    abort() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.stepStartTime) {
            const elapsed = Math.round((Date.now() - this.stepStartTime) / 1000);
            const stepId = this.sequence[this.currentIndex].id;
            state.addTime(stepId, elapsed);
            this.stepStartTime = null;
        }
        state.activeSequenceRunner = null;
    }

    forceEndStep() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        clearEngines();
        
        if (this.stepStartTime) {
            const elapsed = Math.round((Date.now() - this.stepStartTime) / 1000);
            const stepId = this.sequence[this.currentIndex].id;
            state.addTime(stepId, elapsed);
            this.stepStartTime = null;
        }

        const targetQ = this.currentRunParams.nbQuestions || Infinity;
        const reqSuccess = this.currentRunParams.successThreshold || (targetQ === Infinity ? this.currentRunParams.minScore || 1 : targetQ);
        
        if (this.stepStats.correct >= reqSuccess) {
            this.onStepComplete(this.stepStats);
        } else {
            this.onStepFailed(this.stepStats, reqSuccess);
        }
    }

    onStepFailed(stepStats, reqSuccess) {
        this.stats.totalErrors += stepStats.errors || 0;
        
        const canvas = document.getElementById('game-canvas') || document.getElementById('game-board');
        canvas.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center;">
                <h2 style="font-size: 2.5rem; color: var(--danger); margin-bottom: 20px;">Oups...</h2>
                <p style="font-size: 1.2rem; color: var(--text-main); margin-bottom: 30px;">Tu as obtenu ${stepStats.correct} bonnes réponses.<br>Il t'en faut ${reqSuccess} pour valider cette étape.</p>
                <button id="btn-retry-step" class="btn-toggle active" style="font-size: 1.5rem; padding: 15px 30px; background: var(--primary); color: white; border:none; border-radius:12px; cursor:pointer;">Réessayer 🔄</button>
            </div>
        `;
        document.getElementById('btn-retry-step').onclick = () => this.runCurrentStep();
    }

    onStepComplete(stepStats) {
        this.stats.totalCorrect += stepStats.correct || 0;
        this.stats.totalErrors += stepStats.errors || 0;

        if (this.isStudentPath) {
            const finishedStep = this.sequence[this.currentIndex];
            if (finishedStep && finishedStep.stepId) {
                state.markStudentPathStepCompleted(finishedStep.stepId);
            }
        }

        this.currentIndex++;
        
        const canvas = document.getElementById('game-canvas') || document.getElementById('game-board');
        canvas.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center;">
                <h2 style="font-size: 2.5rem; color: var(--success); margin-bottom: 20px;">Étape terminée !</h2>
                <button id="btn-next-step" class="btn-toggle active" style="font-size: 1.5rem; padding: 15px 30px; background: var(--primary); color: white; border:none; border-radius:12px; cursor:pointer;">Continuer ▶️</button>
            </div>
        `;
        document.getElementById('btn-next-step').onclick = () => this.runCurrentStep();
    }

    finishSequence() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        // Dispatch event for gamification engine to catch
        document.dispatchEvent(new CustomEvent('sequence_completed', {
            detail: {
                totalTime: (Date.now() - this.stats.startTime) / 1000,
                stepCount: this.sequence.length,
                totalErrors: this.stats.totalErrors,
                stats: this.stats
            }
        }));

        const oldModal = document.getElementById('seq-modal');
        if (oldModal) oldModal.remove();

        const modal = document.createElement('div');
        modal.id = 'seq-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content text-center">
                <h2 style="font-size: 2.5rem; color: var(--primary); margin-bottom: 15px;">Parcours Terminé ! 🎉</h2>
                <p style="font-size: 1.2rem; color: var(--text-main); margin-bottom: 25px;">Tu as terminé toutes les activités.</p>
                <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent); margin-bottom: 30px;">
                    Erreurs totales : ${this.stats.totalErrors}
                </div>
                <button id="btn-close-seq" class="btn-toggle active" style="font-size: 1.5rem; padding: 15px 30px;">Retour 🏠</button>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'flex';

        document.getElementById('btn-close-seq').onclick = () => {
            modal.remove();
            clearEngines();
            const gl = document.getElementById('game-layer');
            gl.classList.remove('device-simulator', 'tablet-simulator');
            gl.style.display = 'none';
            import('../ui/navigation.js').then(module => module.setTopNavMode(this.isStudentPath ? 'path' : 'grid'));
        };
    }
}
