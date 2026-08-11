// Moteur de parcours.
//
// Remplace SequenceRunner. Différences structurantes :
//
//  - il ne compte plus « des bonnes réponses » mais des QUESTIONS, chacune
//    tracée individuellement (essais, temps, aide, diagnostic) — sans quoi
//    aucune note ni aucun bilan par compétence n'est possible ;
//  - il applique une POLITIQUE (entraînement / évaluation) au lieu d'un
//    comportement unique codé en dur ;
//  - il produit un run identifié dans le journal, donc rejouable, notable et
//    synchronisable.

import { state } from './state.js';
import { journal, EventTypes } from './journal.js';
import { clearEngines, regTimeout } from './timers.js';
import { getActivity, getGenerator } from './registry.js';
import { ItemSession } from './itemSession.js';
import { resolvePolicy, isEvaluation, isApprentissage, describePolicy } from './policy.js';
import { skillsOf } from '../data/catalog.js';
import { getSkill } from '../data/skills.js';
import { hydratePath } from './path.js';
import { gradeRun } from './grading.js';
import { computeRuns } from './projections.js';
import { uuid } from './ids.js';
import { destroyAllDemoCursors } from './demoPointer.js';

export class Runner {
    /**
     * @param {Object} cfg
     * @param {Object} cfg.path       - parcours (n'importe quelle version)
     * @param {string} [cfg.deviceMode] - 'mobile' | 'tablet' | 'none'
     * @param {boolean} [cfg.isStudentPath] - valide les étapes du parcours assigné
     * @param {number} [cfg.startIndex]
     * @param {boolean} [cfg.allowStepNavigation] - affiche les flèches ◀ ▶ permettant
     *        de sauter d'une activité à l'autre. Réservé au test d'un parcours par le
     *        professeur : un élève doit valider chaque étape pour passer à la suivante.
     */
    constructor(cfg) {
        const { path, steps, missing } = hydratePath(cfg.path);
        this.path = path;
        this.steps = steps;
        this.missing = missing;
        this.policy = resolvePolicy(path.policy);
        this.deviceMode = cfg.deviceMode || 'none';
        this.isStudentPath = !!cfg.isStudentPath;
        this.allowStepNavigation = !!cfg.allowStepNavigation;
        this.index = cfg.startIndex || 0;
        // En mode apprentissage, chaque étape s'ouvre sur un écran leçon +
        // robot. `skipIntro` le saute UNE fois : posé quand on revient d'une
        // démonstration (l'élève vient de voir le robot, inutile de re-proposer).
        this._skipIntro = !!cfg.skipIntro;
        this.runId = 'run_' + uuid();
        this.startedAt = 0;
        this.handle = null;
        this.session = null;
        this.timerInterval = null;
        this.onExit = cfg.onExit || null;
    }

    // --- Cycle de vie -------------------------------------------------------

    start() {
        if (!this.steps.length) {
            console.warn('[runner] parcours vide', this.missing);
            return false;
        }
        this.startedAt = Date.now();

        // UN SEUL parcours vivant à la fois.
        //
        // Rien n'interdisait d'en lancer un second par-dessus : l'ancien
        // restait `activeSequenceRunner` le temps que le nouveau se mette en
        // place, continuait de recevoir les tentatives et de peindre SA barre
        // de progression. On se retrouvait avec l'en-tête d'un exercice
        // au-dessus d'un autre. Le précédent est donc abandonné proprement —
        // ses minuteurs arrêtés, son étape close, sa session terminée.
        const precedent = state.activeSequenceRunner;
        if (precedent && precedent !== this) {
            try { precedent.finish(true); } catch (e) { console.warn('[runner] abandon du parcours précédent', e); }
        }
        state.activeSequenceRunner = this;

        // On part d'un écran propre : une démonstration lancée juste avant a
        // pu laisser sa flèche, sa bulle ou sa barre de commandes. Elle n'est
        // tenue par aucun parcours, donc personne d'autre ne les enlève.
        destroyAllDemoCursors();

        // Le titre est posé DÈS MAINTENANT et pas seulement dans `runStep` :
        // en évaluation, un écran de consignes s'intercale, et il portait
        // encore le nom de l'exercice d'avant.
        const titreEl = document.getElementById('game-title');
        const premiere = this.steps[Math.min(this.index, this.steps.length - 1)];
        if (titreEl && premiere) titreEl.textContent = premiere.title;

        journal.emit(EventTypes.RUN_STARTED, {
            runId: this.runId,
            pathId: this.path.id,
            pathName: this.path.name,
            mode: this.policy.mode,
            policy: this.policy,
            stepCount: this.steps.length
        });

        if (this.missing.length) {
            console.warn('[runner] étapes ignorées, exercice introuvable :', this.missing);
        }

        this.showLayer();
        this.setupStepNavigation();
        if (isEvaluation(this.policy)) this.showBriefing();
        else this.runStep();
        return true;
    }

    // --- Navigation entre activités (test professeur) -----------------------

    setupStepNavigation() {
        const nav = document.getElementById('preview-step-nav');
        const navQ = document.getElementById('preview-question-nav');
        if (nav) nav.hidden = !this.allowStepNavigation;
        if (navQ) navQ.hidden = !this.allowStepNavigation;
        // L'en-tête change de plan quand ces deux navigations s'ajoutent :
        // sur un téléphone, les commandes ne tiennent plus à côté du titre et
        // débordaient — la croix de fermeture et l'aide sortaient de l'écran.
        // La feuille de style a besoin de le savoir AVANT de mesurer.
        const couche = document.getElementById('game-layer');
        if (couche) couche.classList.toggle('avec-nav-prof', !!this.allowStepNavigation);
        if (!this.allowStepNavigation) return;

        document.getElementById('btn-preview-prev').onclick = () => this.goToStep(this.index - 1);
        document.getElementById('btn-preview-next').onclick = () => this.goToStep(this.index + 1);

        // Passer d'une question à l'autre sans répondre : indispensable pour
        // relire une série sans devoir la jouer. Rien n'est enregistré.
        document.getElementById('btn-preview-next-q').onclick = () => this.goToQuestion(1);
        document.getElementById('btn-preview-prev-q').onclick = () => this.goToQuestion(-1);

        this.updateStepNavigation();
    }

    /**
     * @param {number} sens +1 question suivante, -1 précédente
     */
    goToQuestion(sens) {
        if (!this.allowStepNavigation || !this.handle) return;
        if (sens > 0 && this.handle.showNext) this.handle.showNext();
        else if (sens < 0 && this.handle.showPrevious) this.handle.showPrevious();
        // Le chrono par question repart avec la nouvelle question.
        if (this.currentTimeLimit && this.timerScope === 'question') {
            this.runTimerCycle(this.currentTimeLimit);
        }
        this.updateStepNavigation();
    }

    updateStepNavigation() {
        if (!this.allowStepNavigation) return;
        const label = document.getElementById('preview-step-label');
        const prev = document.getElementById('btn-preview-prev');
        const next = document.getElementById('btn-preview-next');
        if (!label || !prev || !next) return;

        const position = Math.min(this.index, this.steps.length - 1);
        label.textContent = `${position + 1} / ${this.steps.length}`;
        prev.disabled = position <= 0;
        next.disabled = position >= this.steps.length - 1;

        // Un jeu autonome gère lui-même son contenu : on ne peut pas y
        // naviguer question par question.
        const navQ = document.getElementById('preview-question-nav');
        if (!navQ) return;
        navQ.hidden = !this.session;
        if (!this.session) return;

        // Position de la question AFFICHÉE, distincte de la barre de
        // progression qui compte les questions résolues : en parcourant sans
        // répondre, celle-ci reste à 0 et on ne sait plus où l'on est.
        const vue = this.session.history.length;
        const total = this.step ? this.step.nbItems : vue;
        const labelQ = document.getElementById('preview-question-label');
        if (labelQ) labelQ.textContent = `${Math.min(vue, total)} / ${total}`;

        const prevQ = document.getElementById('btn-preview-prev-q');
        const nextQ = document.getElementById('btn-preview-next-q');
        if (prevQ) prevQ.disabled = vue < 2;
        if (nextQ) nextQ.disabled = vue >= total;
    }

    /**
     * Saute directement à une activité. Contrairement à `endStep()`, aucune
     * étape n'est validée et rien n'est marqué comme réussi : le professeur
     * parcourt son parcours, il ne le joue pas.
     */
    goToStep(index) {
        if (!this.allowStepNavigation) return;
        const target = Math.max(0, Math.min(index, this.steps.length - 1));
        if (target === this.index && this.step) return;
        this.index = target;
        this.runStep();
    }

    hideStepNavigation() {
        ['preview-step-nav', 'preview-question-nav'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.hidden = true;
        });
        const couche = document.getElementById('game-layer');
        if (couche) couche.classList.remove('avec-nav-prof');
    }

    showLayer() {
        const gl = document.getElementById('game-layer');
        gl.classList.remove('device-simulator', 'tablet-simulator');
        if (this.deviceMode === 'tablet') gl.classList.add('tablet-simulator');
        else if (this.deviceMode === 'mobile') gl.classList.add('device-simulator');
        gl.style.display = 'flex';
        const banner = document.getElementById('demo-overlay-banner');
        if (banner) banner.style.display = 'none';
    }

    get canvas() {
        return document.getElementById('game-canvas') || document.getElementById('game-board');
    }

    /**
     * Écran d'annonce avant une évaluation. Une évaluation qui démarre sans
     * prévenir n'est pas honnête : l'élève doit savoir qu'il n'a qu'un essai
     * et que cela compte.
     */
    showBriefing() {
        const total = this.steps.reduce((s, st) => s + st.nbItems, 0);
        const bareme = this.policy.grading && this.policy.grading.scale
            ? `<div class="run-briefing-note">Noté sur ${this.policy.grading.scale}</div>` : '';
        this.canvas.innerHTML = `
            <div class="run-screen">
                <div class="run-screen-icon" aria-hidden="true">📝</div>
                <h2 class="run-screen-title">${escapeHtml(this.path.name)}</h2>
                <p class="run-screen-text">${describePolicy(this.policy)}</p>
                <p class="run-screen-text">${this.steps.length} activité${this.steps.length > 1 ? 's' : ''} • ${total} questions</p>
                ${bareme}
                <button id="btn-run-begin" class="btn-toggle active run-screen-btn">Commencer</button>
            </div>`;
        document.getElementById('btn-run-begin').onclick = () => this.runStep();
    }

    // --- Étapes -------------------------------------------------------------

    async runStep() {
        this.teardownStep();

        if (this.index >= this.steps.length) return this.finish();

        const step = this.steps[this.index];
        this.step = step;
        this.stepStartedAt = Date.now();
        this.itemsResolved = new Set();
        this.itemsSolved = new Set();
        this.autonomousCounter = 0;

        const titleEl = document.getElementById('game-title');
        if (titleEl) {
            titleEl.textContent = this.steps.length > 1
                ? `${step.title} (${this.index + 1}/${this.steps.length})`
                : step.title;
        }

        state.activeExo = step.exercise;
        this.updateProgress();
        this.updateStepNavigation();

        // Mode apprentissage : on découvre la notion AVANT de jouer — rappel
        // de cours et démonstration du robot proposés à chaque étape. Le
        // chronomètre n'est pas encore lancé : une leçon ne se lit pas contre
        // la montre.
        if (isApprentissage(this.policy) && !this._skipIntro) {
            this.showLearningIntro(step);
            return;
        }
        this._skipIntro = false;

        this.startTimer(
            step.timeLimit || step.params.timeLimit || null,
            step.timerScope || 'etape'
        );

        const activity = getActivity(step.exercise.activityId);
        if (!activity) {
            this.ecranBrique('activité', step.exercise.activityId);
            return;
        }

        const mod = await activity.load();

        if (activity.supports.autonomous) {
            // Jeu autonome : il gère son contenu, mais ses tentatives passent
            // par state.recordAttempt et arrivent donc dans onAttempt().
            state.attemptContext = {
                runId: this.runId, stepId: step.stepId,
                exerciseId: step.exercise.id, exerciseTitle: step.exercise.title,
                activityId: activity.id, startedAt: Date.now()
            };
            const fn = mod[activity.legacyExport] || Object.values(mod).find(v => typeof v === 'function');
            this.canvas.innerHTML = '';
            const jeu = fn ? fn(this.canvas, false, { ...step.params, nbQuestions: step.nbItems }) : null;
            // On GARDE l'instance. Le gestionnaire fabriqué ici se contentait
            // de vider l'écran, et l'instance était jetée : ces jeux ouvrent
            // leurs propres `setInterval`, qui continuaient donc de tourner
            // après la sortie — la course rafraîchissait un tableau de bord
            // effacé, une erreur par seconde jusqu'au rechargement de la page.
            this.handle = {
                jeu,
                // Le saut d'auteur passe par le jeu lui-même : sans ce relais,
                // il ne touchait que le compteur et l'écran ne bougeait pas.
                showNext: () => (jeu && typeof jeu.showNext === 'function') ? jeu.showNext() : false,
                destroy: () => {
                    if (jeu && typeof jeu.destroy === 'function') jeu.destroy();
                    else if (jeu && typeof jeu.pause === 'function') jeu.pause();
                    this.canvas.innerHTML = '';
                }
            };
            return;
        }

        const generator = getGenerator(step.exercise.generatorId);
        if (!generator) {
            this.ecranBrique('générateur', step.exercise.generatorId);
            return;
        }

        this.session = new ItemSession({
            generator,
            params: step.params,
            policy: this.policy,
            exercise: step.exercise,
            runId: this.runId,
            stepId: step.stepId,
            forceSeed: step.forceSeed || null,
            preferredKind: activity.accepts[0]
        });

        // Le compteur suit toute nouvelle question, d'où qu'elle vienne :
        // réponse de l'élève, saut du professeur, retour en arrière.
        this.session.on('item', () => this.updateStepNavigation());

        this.handle = mod.mount(this.canvas, this.session, activity.mountOptions || {});
        // La session n'existe qu'ici : c'est seulement maintenant qu'on sait
        // si la navigation question par question est possible.
        this.updateStepNavigation();
    }

    /**
     * Écran d'accueil d'une étape en mode apprentissage : la leçon (rappels de
     * cours des compétences travaillées), la consigne, et le choix — regarder
     * d'abord le robot faire, ou se lancer tout de suite.
     */
    /**
     * Brique manquante : écran d'impasse, transformé en écran d'action.
     *
     * Ce message ne signifie presque jamais que l'exercice est cassé : il
     * signifie que le navigateur a gardé un ancien module en cache alors que
     * le catalogue, lui, est à jour. L'élève ne peut pas deviner ça — et
     * « recharger » ne suffit pas toujours, il faut vider le cache. Le bouton
     * le fait.
     */
    ecranBrique(genre, id) {
        this.canvas.innerHTML = `
            <div class="run-screen">
                <div class="run-screen-icon">🧩</div>
                <p class="run-screen-text">${genre === 'activité' ? 'Activité' : 'Générateur'}
                    « ${escapeHtml(id)} » introuvable.</p>
                <p class="run-screen-sub">C'est presque toujours une version en cache :
                    l'application a été mise à jour, mais ton navigateur garde un ancien morceau.</p>
                <button type="button" class="btn-toggle active run-screen-btn" data-vider-cache>Mettre à jour et recharger</button>
            </div>`;
        const btn = this.canvas.querySelector('[data-vider-cache]');
        if (btn) btn.onclick = async () => {
            btn.disabled = true;
            btn.textContent = 'Mise à jour…';
            try {
                if (self.caches) {
                    const cles = await caches.keys();
                    await Promise.all(cles.map(k => caches.delete(k)));
                }
                if (navigator.serviceWorker) {
                    const rs = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(rs.map(r => r.unregister()));
                }
            } catch { /* rien à vider : on recharge quand même */ }
            location.reload();
        };
    }

    showLearningIntro(step) {
        const exo = step.exercise;
        const lecons = [...new Set(
            skillsOf(exo).map(id => (getSkill(id) || {}).lesson).filter(Boolean)
        )].slice(0, 2);

        const consigne = exo.instruction
            ? `<p class="run-screen-text">${escapeHtml(exo.instruction)}</p>` : '';
        const blocsLecon = lecons.map(l =>
            `<div class="learn-lesson">📖 ${escapeHtml(l)}</div>`).join('');

        this.canvas.innerHTML = `
            <div class="run-screen run-screen--learn">
                <div class="run-screen-icon" aria-hidden="true">🌱</div>
                <h2 class="run-screen-title">${escapeHtml(step.title)}</h2>
                ${consigne}
                ${blocsLecon}
                <div class="learn-actions">
                    <button id="btn-learn-watch" class="btn-toggle glass-btn">👀 Regarder le robot d'abord</button>
                    <button id="btn-learn-go" class="btn-toggle active">🚀 C'est parti !</button>
                </div>
            </div>`;

        // « Regarder le robot » réutilise le bouton de démonstration de
        // l'en-tête : il capture le parcours en cours et, au retour, reprend
        // cette étape sans repasser par cet écran.
        const watch = document.getElementById('btn-learn-watch');
        if (watch) watch.onclick = () => {
            this._skipIntro = true;
            const demoBtn = document.getElementById('btn-toggle-demo');
            if (demoBtn) demoBtn.click();
        };
        const go = document.getElementById('btn-learn-go');
        if (go) go.onclick = () => {
            this._skipIntro = true;
            this.runStep();
        };
    }

    /**
     * Appelé par state.recordAttempt pour chaque réponse, quelle que soit son
     * origine (activité moderne ou jeu autonome).
     */
    onAttempt(payload) {
        if (!this.step) return;

        const key = payload.itemSeed || `auto_${this.autonomousCounter}`;
        const maxTries = this.policy.maxAttemptsPerItem;
        const resolved = payload.correct || (payload.attemptIndex + 1) >= maxTries;

        if (resolved) {
            this.itemsResolved.add(key);
            if (!payload.itemSeed) this.autonomousCounter++;
            if (payload.correct) this.itemsSolved.add(key);
        }

        this.updateProgress();

        // Un chrono « par question » ne pilote pas la fin d'étape : c'est
        // toujours le nombre de questions qui l'arrête.
        const chronoPiloteLEtape = this.currentTimeLimit && this.timerScope !== 'question';
        if (!chronoPiloteLEtape && this.itemsResolved.size >= this.step.nbItems) {
            regTimeout(() => this.endStep(), 1500);
        } else if (resolved && this.timerScope === 'question') {
            // Nouvelle question : le compte à rebours repart.
            this.runTimerCycle(this.currentTimeLimit);
        }
    }

    /**
     * Outil d'auteur : passer la question en cours sans y répondre.
     *
     * Mettre au point la dixième question d'un exercice supposait de jouer les
     * neuf précédentes — et de les jouer JUSTE, sinon la série s'arrête avant.
     * Le saut fait donc avancer la barre de progression sans rien enregistrer :
     * la question est comptée « vue », jamais « réussie », et aucune tentative
     * ne part dans le journal. Le profil de l'élève reste propre.
     *
     * Sur un jeu autonome, `showNext` appuie sur le bouton « ↺ Autre … » du
     * jeu : c'est bien un nouveau trajet, un nouveau programme, une nouvelle
     * commande qui s'affiche. Le compteur avançait auparavant tout seul, en
     * laissant le même écran — un saut qui ne saute rien.
     * @returns {boolean} faux si aucun exercice n'est en cours
     */
    sauterQuestion() {
        if (!this.step) return false;
        const item = this.session && this.session.item;
        const cle = (item && item.seed) || `saut_${this.itemsResolved.size}_${this.autonomousCounter++}`;
        this.itemsResolved.add(cle);
        this.updateProgress();

        if (this.itemsResolved.size >= this.step.nbItems) { this.endStep(); return true; }
        if (this.handle && this.handle.showNext) this.handle.showNext();
        if (this.currentTimeLimit && this.timerScope === 'question') {
            this.runTimerCycle(this.currentTimeLimit);
        }
        this.updateStepNavigation();
        return true;
    }

    /**
     * REVENIR SUR LA QUESTION PRÉCÉDENTE — outil d'auteur, pendant du saut.
     *
     * Sauter d'un cran de trop obligeait à relancer l'exercice depuis le début
     * pour revoir la question qu'on cherchait. Le recul s'appuie sur le
     * `showPrevious` des activités, qui rembobine la session : les jeux
     * autonomes n'en ont pas, et le disent plutôt que de ne rien faire.
     * @returns {boolean} faux si l'exercice en cours ne sait pas reculer
     */
    revenirQuestion() {
        if (!this.step || !this.handle || typeof this.handle.showPrevious !== 'function') return false;
        this.handle.showPrevious();
        // Le compteur de progression suit : sans quoi la barre annoncerait
        // « 5 / 10 » sur la quatrième question.
        const cle = [...this.itemsResolved].pop();
        if (cle !== undefined) this.itemsResolved.delete(cle);
        this.updateProgress();
        if (this.currentTimeLimit && this.timerScope === 'question') {
            this.runTimerCycle(this.currentTimeLimit);
        }
        this.updateStepNavigation();
        return true;
    }

    /** Compatibilité : anciens moteurs appelant runner.onGameAction(bool). */
    onGameAction(isSuccess) {
        this.onAttempt({ correct: !!isSuccess, attemptIndex: 0, itemSeed: null });
    }

    endStep() {
        if (!this.step) return;
        const step = this.step;
        this.teardownStep();
        // L'étape est CLOSE. Sans cette ligne, `this.step` restait défini une
        // fois le bilan affiché : une tentative en retard — ou un saut de
        // question — continuait d'alimenter le compteur, qui affichait des
        // « 12 / 3 » impossibles.
        this.step = null;

        const solved = this.itemsSolved.size;
        const required = Math.min(step.threshold, step.nbItems);
        const passed = solved >= required;

        journal.emit(EventTypes.STEP_COMPLETED, {
            runId: this.runId,
            pathId: this.path.id,
            stepId: step.stepId,
            title: step.title,
            weight: step.weight,
            exerciseId: step.exercise.id,
            questions: this.itemsResolved.size,
            solved,
            required,
            passed
        });

        if (this.isStudentPath && passed) {
            state.markStudentPathStepCompleted(step.stepId, { runId: this.runId });
        }

        if (passed || !this.policy.allowRetryStep) {
            this.index++;
            this.showStepResult(passed, solved, required);
        } else {
            this.showStepResult(false, solved, required);
        }
    }

    showStepResult(passed, solved, required) {
        const last = this.index >= this.steps.length;
        const icon = passed ? '🎉' : '💪';
        const title = passed ? 'Étape validée !' : 'Presque…';
        const detail = passed
            ? `${solved} bonne${solved > 1 ? 's' : ''} réponse${solved > 1 ? 's' : ''} sur ${this.itemsResolved.size}.`
            : `Tu as ${solved} bonne${solved > 1 ? 's' : ''} réponse${solved > 1 ? 's' : ''}, il en faut ${required}.`;

        const btnLabel = passed ? (last ? 'Voir mon bilan' : 'Continuer') : 'Réessayer';

        this.canvas.innerHTML = `
            <div class="run-screen">
                <div class="run-screen-icon" aria-hidden="true">${icon}</div>
                <h2 class="run-screen-title ${passed ? 'run-screen-title--ok' : 'run-screen-title--ko'}">${title}</h2>
                <p class="run-screen-text">${detail}</p>
                <button id="btn-run-next" class="btn-toggle active run-screen-btn">${btnLabel}</button>
            </div>`;

        document.getElementById('btn-run-next').onclick = () => {
            if (passed) this.runStep();
            else this.runStep(); // l'index n'a pas avancé : on rejoue l'étape
        };
    }

    // --- Chronomètre --------------------------------------------------------
    //
    // Deux portées possibles :
    //   'etape'    un seul compte à rebours pour l'ensemble des questions ;
    //   'question' il repart à chaque question, et une question laissée sans
    //              réponse est comptée fausse — c'est un exercice de rapidité,
    //              pas une élimination.
    //
    // Il s'affiche dans l'en-tête, à côté de la progression : un filet de 6 px
    // collé au bord de la fenêtre ne se voit pas.

    startTimer(seconds, scope = 'etape') {
        this.stopTimer();
        this.currentTimeLimit = seconds || null;
        this.timerScope = scope;

        const box = document.getElementById('game-timer');
        if (!box) return;
        if (!seconds) { box.hidden = true; return; }

        box.hidden = false;
        const label = document.getElementById('game-timer-scope');
        if (label) label.textContent = scope === 'question' ? 'par question' : '';

        this.runTimerCycle(seconds);
    }

    /** Lance (ou relance) un compte à rebours de `seconds`. */
    runTimerCycle(seconds) {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timeLeft = seconds;
        this.paintTimer(seconds);

        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.paintTimer(seconds);
            if (this.timeLeft <= 0) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
                if (this.timerScope === 'question') this.onQuestionTimeout();
                else this.endStep();
            }
        }, 1000);
    }

    paintTimer(total) {
        const value = document.getElementById('game-timer-value');
        const fill = document.querySelector('#game-timer .timer-ring-fill');
        const box = document.getElementById('game-timer');
        if (!value || !fill || !box) return;

        const reste = Math.max(0, this.timeLeft);
        value.textContent = reste;
        const circonference = 2 * Math.PI * 15.5;
        fill.style.strokeDasharray = String(circonference);
        fill.style.strokeDashoffset = String(circonference * (1 - reste / total));
        box.classList.toggle('timer--urgent', reste <= 5);
    }

    /**
     * Temps écoulé sur une question : elle est comptée fausse, la correction
     * s'affiche, puis on passe à la suivante. L'étape continue.
     */
    onQuestionTimeout() {
        if (!this.session || !this.session.current) return;
        const result = this.session.submit(null, {});
        const suite = () => {
            if (!this.step) return;
            if (this.itemsResolved.size >= this.step.nbItems) return this.endStep();
            if (this.handle && this.handle.showNext) this.handle.showNext();
            this.runTimerCycle(this.currentTimeLimit);
        };
        if (result && result.dismissed) result.dismissed.then(suite);
        else suite();
    }

    stopTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = null;
        const box = document.getElementById('game-timer');
        if (box) box.hidden = true;
    }

    // --- Progression --------------------------------------------------------

    updateProgress() {
        const box = document.getElementById('game-progress-container');
        const bar = document.getElementById('game-progress-bar');
        const text = document.getElementById('game-progress-text');
        if (!box || !bar || !text || !this.step) return;

        const total = this.step.nbItems;
        // Une seule question, aucune progression à montrer : « 0 / 1 » au-dessus
        // de l'atelier libre annonçait un décompte là où il n'y a rien à
        // compter, et faisait passer un espace de dessin pour un contrôle.
        if (total <= 1) { box.style.display = 'none'; return; }
        box.style.display = 'flex';
        const done = this.itemsResolved.size;
        const solved = this.itemsSolved.size;

        bar.style.width = `${Math.min(100, (done / total) * 100)}%`;
        text.textContent = `${done} / ${total}`;
        // En évaluation, on n'affiche pas le score en direct : cela induit une
        // pression inutile et modifie le comportement de l'élève.
        bar.style.background = isEvaluation(this.policy)
            ? 'linear-gradient(90deg, var(--text-muted), var(--primary))'
            : (solved >= Math.min(this.step.threshold, total)
                ? 'var(--success)'
                : 'linear-gradient(90deg, var(--primary), var(--accent))');
    }

    // --- Fin ----------------------------------------------------------------

    teardownStep() {
        this.stopTimer();
        if (this.handle && this.handle.destroy) this.handle.destroy();
        this.handle = null;
        if (this.session) this.session.finish();
        this.session = null;
        clearEngines();
        state.attemptContext = null;

        if (this.stepStartedAt && this.step) {
            const elapsed = Math.round((Date.now() - this.stepStartedAt) / 1000);
            if (elapsed > 0) state.addTime(this.step.exercise.id, elapsed);
            this.stepStartedAt = null;
        }
    }

    finish(aborted = false) {
        this.teardownStep();
        this.step = null;
        this.hideStepNavigation();
        state.activeSequenceRunner = null;

        journal.emit(EventTypes.RUN_FINISHED, {
            runId: this.runId,
            pathId: this.path.id,
            aborted,
            durationSeconds: Math.round((Date.now() - this.startedAt) / 1000)
        });

        if (aborted) return;

        // Le bilan est recalculé depuis le journal, pas depuis des compteurs
        // internes : c'est exactement ce que verra le professeur.
        const run = computeRuns(journal.all()).find(r => r.runId === this.runId);
        const bilan = gradeRun(run, this.policy);

        document.dispatchEvent(new CustomEvent('sequence_completed', {
            detail: {
                runId: this.runId,
                totalTime: Math.round((Date.now() - this.startedAt) / 1000),
                stepCount: this.steps.length,
                totalErrors: bilan.totalQuestions - bilan.totalReussies,
                bilan,
                stats: { totalQuestions: bilan.totalQuestions, totalCorrect: bilan.totalReussies }
            }
        }));

        import('../ui/reportUI.js').then(m => m.showRunReport(bilan, {
            onClose: () => this.exit()
        }));
    }

    abort() {
        this.finish(true);
    }

    exit() {
        clearEngines();
        const gl = document.getElementById('game-layer');
        gl.classList.remove('device-simulator', 'tablet-simulator');
        gl.style.display = 'none';
        if (this.onExit) return this.onExit();
        import('../ui/navigation.js').then(m => m.setTopNavMode(this.isStudentPath ? 'path' : 'grid'));
    }
}

function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
