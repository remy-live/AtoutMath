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
import { evaluate, hintAt, schemaAt, toChoices } from './items.js';
import { state } from './state.js';
import { getWeakTables } from './stats.js';
import { defaultPolicy } from './policy.js';
import { etatDepart, apresReponse } from './aide.js';

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
     * @param {boolean} [cfg.sansTrace] - essai du professeur : rien au journal
     * @param {boolean} [cfg.frozen]  - aperçu immobile : la question est dessinée, rien ne se joue
     * @param {number} [cfg.nbItems]   - nombre de questions prévu pour l'étape
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
        // SANS TRACE : la session se joue normalement — on répond, on gagne des
        // points à l'écran, la correction s'affiche —, mais RIEN n'est écrit au
        // journal. C'est le mode d'essai du professeur, et ce n'est pas
        // `isDemo`, qui rend en plus la main au robot et gèle la saisie : un
        // essai se joue à la main, c'est tout son intérêt.
        this.sansTrace = !!cfg.sansTrace;
        // Une vignette de catalogue montre une question, pas une animation :
        // 45 démonstrations lancées en même temps rameraient sur une tablette.
        this.frozen = !!cfg.frozen;
        this.forceSeed = cfg.forceSeed || null;
        this.preferredKind = cfg.preferredKind || null;
        // Le nombre de questions prévu pour l'étape, quand on le connaît. La
        // session ne l'utilise pas elle-même — c'est le Runner qui arrête —,
        // mais une activité qui change de forme en cours de route en a besoin.
        this.nbItems = Number(cfg.nbItems) || null;

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
        // L'ESCALIER DE L'AIDE VIT SUR LA SESSION, pas sur l'activité.
        //
        // Il doit survivre au passage du QCM au pavé numérique — c'est même
        // tout l'intérêt : un élève qui bute deux fois en tapant doit pouvoir
        // récupérer ses propositions. Posé dans l'activité, l'état serait perdu
        // au moment précis où il sert. Mis à jour ici, il vaut pour toutes les
        // activités sans qu'aucune ait à y penser.
        this.escalier = etatDepart();
        // Posé par le meneur quand le quota de questions est atteint : voir
        // `next()`. Tant qu'il est faux, la session sert normalement.
        this.termine = false;
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
        // LA SÉRIE EST FINIE : ON NE POSE PLUS RIEN.
        //
        // Rémy : « au bout de 10 questions, s'il y en avait 10, il ne faut pas
        // en relancer une ». C'est exactement ce qui arrivait. Le meneur
        // programmait la conclusion 1,5 s après la dernière réponse, et
        // l'activité, elle, enchaînait dès que l'élève fermait la correction :
        // une onzième question s'affichait dans l'intervalle, et si elle était
        // répondue assez vite, le bilan comptait onze questions sur dix.
        //
        // Le garde-fou est ici plutôt que dans les quatorze activités qui
        // appellent `next()` : la question en cours reste affichée, verrouillée
        // (`locked` n'est pas relâché), donc rien ne peut plus être ni tiré ni
        // enregistré. Le temps que la conclusion arrive, l'écran montre la
        // dernière question et sa correction — ce qu'on voulait voir.
        if (this.termine) return this.item;

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
        // Le dessin de CET indice-ci, avant que l'index n'avance. L'écran le
        // pose sous le texte s'il y en a un (voir `wireHint`).
        this.schemaIndice = schemaAt(this.item, this.hintIndex);
        this.hintIndex++;
        if (!this.sansTrace) state.noteHintUsed();
        // L'indice reste affiché jusqu'à ce que l'élève le ferme : c'est un
        // texte à lire, pas une notification.
        this.lastFeedback = announce({ kind: 'hint', msg: h, schema: this.schemaIndice });
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

        if (!this.isDemo && !this.sansTrace) {
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
                // EN INTERROGATION, TROIS RÉGIMES (voir CORRECTIONS dans
                // policy.js). « reponse » donne la bonne réponse et se tait :
                // l'élève ne repart pas avec son erreur, mais on ne lui fait
                // pas cours pendant qu'on le mesure. « robot » ajoute
                // l'explication — c'est le devoir formatif que Rémy décrit :
                // « si c'est en mode interrogation il faut une explication de
                // la part du robot ».
                const sec = this.policy.correction === 'reponse'
                    ? `La bonne réponse était : ${this.item.answer}`
                    : (verdict.misconception || this.item.explanation);
                dismissed = announce({
                    kind: 'error',
                    isError: true,
                    msg: sec,
                    misconception: (this.policy.correction !== 'reponse' && verdict.misconception)
                        ? this.item.explanation : null
                });
            }
        }
        result.dismissed = dismissed;

        // L'escalier ne bouge qu'une fois la question CLOSE : une première
        // réponse fausse suivie d'une bonne au deuxième essai est un seul
        // verdict, pas deux — sinon un élève à deux essais descendrait puis
        // remonterait dans la même question.
        if (result.done && !this.isDemo) {
            this.escalier = apresReponse(this.escalier, {
                reussi: verdict.correct,
                duPremierCoup: isFirstTry,
                avecIndice: this.hintIndex > 0
            });
        }

        this.locked = result.done;
        this._fire('result', result);
        return result;
    }

    finish() {
        state.attemptContext = null;
        const bilan = {
            answered: this.answered,
            correct: this.correctCount,
            exerciseId: this.exercise ? this.exercise.id : null,
            exerciseTitle: this.exercise ? this.exercise.title : '',
            // La leçon de la dernière question : c'est elle qu'on redonnera si
            // l'exercice a été loupé, et c'est le générateur qui la connaît.
            lecon: (this.item && this.item.meta && this.item.meta.texteLecon) || '',
            // ON NE PROPOSE PAS DE REFAIRE UNE INTERROGATION. Le bilan de fin
            // d'exercice offrait « Recommencer avec le robot » quel que soit le
            // régime : après un devoir noté, c'est un contresens — et l'élève
            // qui voit le bouton en déduit, à raison, que sa note ne comptait
            // pas. Le régime voyage donc avec le bilan.
            evaluation: this.policy.mode === 'evaluation'
        };
        this._fire('finish', bilan);
        // Le noyau annonce, il n'affiche pas. L'interface décide s'il y a
        // quelque chose à dire — et l'aperçu du catalogue, qui termine lui
        // aussi des sessions sans qu'on y ait répondu, n'ouvre rien.
        if (!this.isDemo && !this.frozen) {
            document.dispatchEvent(new CustomEvent('session_finished', { detail: bilan }));
        }
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
