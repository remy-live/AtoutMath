// ItemSession : le runtime qui relie un générateur, une politique pédagogique
// et l'enregistrement de la progression.
//
// C'est l'unique interface que voient les activités (les « jeux »). Une
// activité ne génère jamais de question, ne décide jamais si une réponse est
// juste, n'écrit jamais dans le journal : elle appelle `next()`, affiche
// l'item, et transmet la réponse à `submit()`. Tout le reste — nombre d'essais
// autorisés, aides, points, diagnostic, traçabilité — est ici, donc identique
// dans tous les jeux.

import { makeRng, randomSeed } from './ids.js';
import { evaluate, hintAt, toChoices } from './items.js';
import { state } from './state.js';
import { getWeakTables } from './stats.js';
import { defaultPolicy } from './policy.js';

export class ItemSession {
    /**
     * @param {Object} cfg
     * @param {Object} cfg.generator   - définition issue du registre
     * @param {Object} cfg.params      - paramètres de l'exercice
     * @param {Object} [cfg.policy]    - politique pédagogique (voir policy.js)
     * @param {Object} [cfg.exercise]  - descripteur du catalogue
     * @param {string} [cfg.runId]
     * @param {string} [cfg.stepId]
     * @param {boolean} [cfg.isDemo]
     * @param {boolean} [cfg.frozen]  - aperçu immobile : la question est dessinée, rien ne se joue
     * @param {string} [cfg.forceSeed] - rejoue exactement une question passée
     * @param {'choice'|'numeric'|'point'} [cfg.preferredKind] - genre attendu par l'activité
     */
    constructor(cfg) {
        this.generator = cfg.generator;
        this.params = cfg.params || {};
        this.policy = { ...defaultPolicy(), ...(cfg.policy || {}) };
        this.exercise = cfg.exercise || null;
        this.runId = cfg.runId || null;
        this.stepId = cfg.stepId || null;
        this.isDemo = !!cfg.isDemo;
        // Une vignette de catalogue montre une question, pas une animation :
        // 45 démonstrations lancées en même temps rameraient sur une tablette.
        this.frozen = !!cfg.frozen;
        this.forceSeed = cfg.forceSeed || null;
        this.preferredKind = cfg.preferredKind || null;

        this.item = null;
        this.attemptIndex = 0;
        this.hintIndex = 0;
        this.eliminated = new Set();
        this.answered = 0;
        this.correctCount = 0;
        this.locked = false;
        // Graines des questions déjà posées, dans l'ordre : permet de revenir
        // en arrière et de rejouer une question à l'identique.
        this.history = [];
        this._listeners = { item: [], result: [], finish: [] };
    }

    on(event, fn) {
        if (this._listeners[event]) this._listeners[event].push(fn);
        return this;
    }

    _fire(event, payload) {
        (this._listeners[event] || []).forEach(fn => {
            try { fn(payload); } catch (e) { console.error('[session]', event, e); }
        });
    }

    /**
     * Revient à la question précédente. Les graines sont conservées, donc la
     * question est régénérée à l'identique — c'est ce qui permet au professeur
     * de revenir en arrière pendant un test.
     * @returns {boolean} false s'il n'y a pas de question antérieure
     */
    rewind() {
        if (this.history.length < 2) return false;
        this.history.pop();                    // la question courante
        this.forceSeed = this.history.pop();   // celle d'avant, rejouée telle quelle
        return true;
    }

    /** Génère (ou régénère) la question suivante. */
    next() {
        const seed = this.forceSeed || randomSeed();
        this.forceSeed = null; // le rejeu ne vaut que pour la première question
        this.history.push(seed);
        const rng = makeRng(seed);

        let item = this.generator.generate(this.params, {
            rng,
            weakTables: this.policy.adaptive ? getWeakTables() : [],
            difficulty: this.params.difficulty || null,
            // Rang de la question dans la série, à partir de 0.
            //
            // La plupart des générateurs tirent au sort et n'en ont que faire.
            // Mais un générateur qui porte une PROGRESSION — Le Chat Géomètre
            // enchaîne douze figures dans un ordre choisi — a besoin de savoir
            // où l'on en est, sinon il repose éternellement la première.
            // `history` contient déjà la graine de la question en cours.
            index: Math.max(0, this.history.length - 1),
            // Certains générateurs posent une question différente selon ce que
            // l'activité sait afficher (placer un point vs lire ses coordonnées).
            preferredKind: this.preferredKind
        });

        // Une activité qui ne sait afficher que des choix peut quand même
        // présenter un item numérique : on fabrique les propositions.
        if (this.preferredKind === 'choice' && item.answerKind !== 'choice') {
            item = toChoices(item, rng);
        }

        this.item = item;
        this.attemptIndex = 0;
        this.hintIndex = 0;
        this.eliminated = new Set();
        this.locked = false;
        this.startedAt = Date.now();
        // Point de départ du prochain INTERVALLE. Chaque tentative rapporte le
        // temps écoulé depuis la précédente, pas depuis le début de la
        // question : sans cela, une question trouvée au troisième essai
        // comptait trois fois sa durée réelle dans le temps de séance.
        this.dernierEssaiAt = this.startedAt;

        // Contexte lu par state.recordAttempt (y compris pour les jeux
        // historiques qui appellent encore state.celebrate directement).
        state.attemptContext = {
            runId: this.runId,
            stepId: this.stepId,
            exerciseId: this.exercise ? this.exercise.id : null,
            exerciseTitle: this.exercise ? this.exercise.title : '',
            generatorId: this.generator.id,
            activityId: this.exercise ? this.exercise.activityId : null,
            skillId: item.skillId,
            itemSeed: item.seed,
            questionText: item.prompt.text,
            expected: item.answer,
            startedAt: this.startedAt,
            hintsUsed: 0
        };

        this._fire('item', item);
        return item;
    }

    get current() {
        return this.item;
    }

    /** Nombre d'essais restants sur l'item courant. */
    get attemptsLeft() {
        return Math.max(0, this.policy.maxAttemptsPerItem - this.attemptIndex);
    }

    get hintsAvailable() {
        return this.policy.hints && this.item && this.hintIndex < (this.item.hints || []).length;
    }

    /**
     * Demande l'aide suivante. En mode évaluation, les aides sont désactivées
     * par la politique ; en entraînement elles sont gratuites mais tracées
     * (elles pèsent sur la note si la politique le prévoit).
     */
    hint() {
        if (!this.policy.hints || !this.item) return null;
        const h = hintAt(this.item, this.hintIndex);
        if (h === null) return null;
        this.hintIndex++;
        state.noteHintUsed();
        // L'indice reste affiché jusqu'à ce que l'élève le ferme : c'est un
        // texte à lire, pas une notification.
        this.lastFeedback = announce({ kind: 'hint', msg: h });
        return h;
    }

    /**
     * Soumet une réponse.
     * @returns {{correct:boolean, expected:*, misconception:?string,
     *            explanation:string, revealed:boolean, done:boolean, attemptsLeft:number}}
     */
    submit(given, opts = {}) {
        if (!this.item || this.locked) {
            return { correct: false, ignored: true, done: false, attemptsLeft: this.attemptsLeft };
        }

        const verdict = evaluate(this.item, given);
        // Diagnostic calculé par l'ACTIVITÉ.
        //
        // `evaluate` ne sait diagnostiquer que les items à propositions : il
        // lit le « pourquoi » attaché au distracteur choisi. Une activité qui
        // juge elle-même — le Chat Géomètre compare un tracé à une figure —
        // sait dire bien mieux ce qui ne va pas (« il te manque un côté »)
        // qu'une explication générique. Elle le passe ici.
        if (opts.misconception && !verdict.correct) verdict.misconception = opts.misconception;
        const isFirstTry = this.attemptIndex === 0;

        // Barème des points : plein tarif au premier essai, réduit ensuite,
        // et amputé si l'élève a demandé de l'aide.
        let points = 0;
        if (verdict.correct && !this.isDemo) {
            const base = this.policy.pointsPerItem;
            const retryFactor = isFirstTry ? 1 : Math.max(0.3, 1 - 0.35 * this.attemptIndex);
            const hintFactor = Math.max(0.3, 1 - this.policy.hintPenalty * this.hintIndex);
            points = Math.max(1, Math.round(base * retryFactor * hintFactor));
        }

        const maintenant = Date.now();
        const intervalle = maintenant - (this.dernierEssaiAt || this.startedAt);
        this.dernierEssaiAt = maintenant;

        if (!this.isDemo) {
            state.recordAttempt({
                correct: verdict.correct,
                given,
                expected: this.item.answer,
                questionText: this.item.prompt.text,
                skillId: this.item.skillId,
                itemSeed: this.item.seed,
                generatorId: this.generator.id,
                attemptIndex: this.attemptIndex,
                msElapsed: intervalle,
                hintsUsed: this.hintIndex,
                misconception: verdict.misconception,
                explanation: this.item.explanation,
                points
            });
        }

        this.answered++;
        if (verdict.correct) this.correctCount++;
        else {
            this.attemptIndex++;
            this.eliminated.add(String(given));
        }

        const exhausted = !verdict.correct && this.attemptIndex >= this.policy.maxAttemptsPerItem;
        const result = {
            ...verdict,
            points,
            attemptIndex: this.attemptIndex,
            attemptsLeft: this.attemptsLeft,
            revealed: exhausted,
            done: verdict.correct || exhausted,
            element: opts.element || null
        };

        // Retour didactique : le diagnostic prime sur l'explication générique.
        // `dismissed` est résolu quand l'élève a fermé le retour ; les
        // activités s'en servent pour enchaîner, au lieu d'un minuteur.
        let dismissed = Promise.resolve();
        if (!this.isDemo) {
            if (verdict.correct) {
                dismissed = announce({ kind: 'success', points, element: opts.element });
            } else if (this.policy.showCorrection) {
                dismissed = announce({
                    kind: 'error',
                    isError: true,
                    msg: verdict.misconception || this.item.explanation,
                    misconception: verdict.misconception ? this.item.explanation : null
                });
            }
        }
        result.dismissed = dismissed;

        this.locked = result.done;
        this._fire('result', result);
        return result;
    }

    finish() {
        state.attemptContext = null;
        this._fire('finish', { answered: this.answered, correct: this.correctCount });
    }
}

/**
 * Émet un retour visuel et renvoie une promesse résolue à sa fermeture.
 *
 * Le rendu vit dans la couche interface (js/ui/gameFeedbackUI.js) ; le noyau
 * ne l'importe pas. Le rendu signale sa prise en charge via `handled`, ce qui
 * permet de résoudre immédiatement quand personne n'écoute — en test, ou dans
 * la vignette d'aperçu du catalogue, où rien ne doit rester bloqué.
 */
function announce(detail) {
    let resolve;
    const promise = new Promise(r => { resolve = r; });
    const payload = { ...detail, handled: false, dismiss: resolve };
    document.dispatchEvent(new CustomEvent('game_feedback', { detail: payload }));
    if (!payload.handled) resolve();
    return promise;
}
