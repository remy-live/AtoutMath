import { state } from './state.js';
import { conceptToSkill } from './compat.js';

/**
 * Classe de base des jeux autonomes (Tetris, Course, Memory, Météorites,
 * Labyrinthe, Math Crush) : ceux qui portent leur propre logique de plateau et
 * ne consomment donc pas d'ItemSession.
 *
 * Leur seule obligation est de déclarer chaque réponse via `onCorrectAnswer` /
 * `onWrongAnswer`. Ces deux méthodes produisent des tentatives au même format
 * que les activités modernes, ce qui garantit qu'un jeu autonome alimente
 * identiquement les statistiques, le carnet d'erreurs et les notes.
 */
export class BaseGame {
    constructor(container, isDemo, params, gameId) {
        this.container = container;
        this.isDemo = isDemo;
        this.params = params || {};
        this.gameId = gameId;
        this.isRunning = false;
        // Gel de la démonstration. La barre du robot l'annonce ; à chaque jeu
        // de tester `this.gelDemo` là où il fait avancer son monde. Le rendu,
        // lui, continue : une image figée vaut mieux qu'un écran noir.
        this.gelDemo = false;
        this._surGelDemo = (e) => { this.gelDemo = !!e.detail; };
        document.addEventListener('demo_pause', this._surGelDemo);
    }

    /**
     * La séance est-elle une ÉVALUATION ? Le régime est posé par le moteur
     * dans `state.attemptContext` (voir `runner.js`). Hors parcours — un jeu
     * lancé depuis le catalogue — il n'y a pas d'évaluation du tout.
     */
    get enEvaluation() {
        return !!(state.attemptContext && state.attemptContext.evaluation);
    }

    start() {
        this.isRunning = true;
        this.container.innerHTML = '';
        this.render();
        if (this.isDemo) this.runDemoSequence();
        else this.startGameLoop();
    }

    /**
     * PASSER À LA QUESTION SUIVANTE — demandé par la barre d'auteur.
     *
     * Le saut ne faisait qu'avancer le compteur de l'étape : la barre affichait
     * « 3 / 10 » et l'écran gardait le même trajet, le même programme, la même
     * pizza. Bon à rien, donc : on saute justement pour ATTEINDRE une autre
     * question, pas pour voir le compteur bouger.
     *
     * Presque tous ces jeux portent déjà le bouton qui convient — « ↺ Autre
     * trajet », « ↺ Autre programme », « ↺ Autre commande » —, marqué
     * `[data-neuf]`. On appuie dessus. Un jeu qui n'en a pas (arcade sans fin)
     * n'a rien à changer, et le dit en renvoyant `false`.
     * @returns {boolean} vrai si quelque chose a effectivement changé
     */
    showNext() {
        const neuf = this.container && this.container.querySelector('[data-neuf]');
        if (!neuf || neuf.disabled) return false;
        neuf.click();
        return true;
    }

    destroy() {
        // Couper AVANT de vider : ces jeux ouvrent des minuteurs bruts que
        // `isRunning = false` ne suffit pas à faire taire. La course
        // rafraîchissait son tableau de bord une fois par seconde après la
        // sortie, cherchant des éléments que `innerHTML = ''` venait
        // d'effacer — une erreur par seconde, jusqu'au rechargement de la page.
        this.pause();
        this.isRunning = false;
        document.removeEventListener('demo_pause', this._surGelDemo);
        this.container.innerHTML = '';
    }

    /**
     * Gèle le jeu SANS effacer son écran — c'est ce qui distingue une vignette
     * de catalogue d'un `destroy()`.
     *
     * Ces jeux ouvrent leurs propres minuteurs : `setInterval` pour la boucle
     * de démonstration, `requestAnimationFrame` pour l'animation. Ni l'un ni
     * l'autre ne passent par `regInterval`, donc `clearEngines()` ne les voit
     * pas : une fois lancées, leurs vignettes tournaient indéfiniment. On coupe
     * ici ce que la classe de base peut nommer, et les drapeaux d'exécution
     * suffisent à faire taire le reste — toutes les boucles les testent.
     */
    pause() {
        this.isRunning = false;
        this.running = false;
        this.gameRunning = false;
        this.isDemo = false;
        // Certaines boucles ne surveillent pas `isRunning` mais leur propre fin
        // de partie : la déclarer terminée les fait taire aussi.
        this.isGameOver = true;
        // Le curseur du robot vit sur <body>, pas dans le conteneur : gelé
        // sans ça, une vignette laissait sa flèche (et sa bulle) à l'écran.
        if (this.demoCursor) { this.demoCursor.destroy(); this.demoCursor = null; }
        if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
        ['demoInterval', 'timerId', 'timerInterval', 'spawnInterval'].forEach(cle => {
            if (this[cle]) { clearInterval(this[cle]); this[cle] = null; }
        });
    }

    // --- Méthodes abstraites ---
    render() { console.warn('render() non implémenté'); }
    runDemoSequence() { console.warn('runDemoSequence() non implémenté'); }
    startGameLoop() { console.warn('startGameLoop() non implémenté'); }

    // --- Remontée des réponses ---

    /**
     * @param {HTMLElement} [el]
     * @param {string} [concept] - ancienne clé ("mult:7") ou id de compétence
     * @param {Object} [details] - { questionText, given, expected, points }
     */
    onCorrectAnswer(el, concept = null, details = {}) {
        if (this.isDemo) return;
        if (el) {
            el.style.backgroundColor = '#dcfce7';
            el.style.transform = 'scale(1.1)';
        }
        const points = details.points || 10;
        state.recordAttempt({
            correct: true,
            skillId: conceptToSkill(concept),
            points,
            questionText: details.questionText,
            given: details.given,
            expected: details.expected,
            attemptIndex: details.attemptIndex || 0,
            // UNE ÉTAPE N'EST PAS UNE QUESTION. Un chiffre juste dans une
            // multiplication posée nourrit les statistiques et le carnet
            // d'erreurs — c'est bien un fait de table réussi — mais il ne fait
            // pas avancer le compteur de questions : c'est l'OPÉRATION qui
            // compte, une fois finie. Voir `partiel` dans `runner.onAttempt`.
            partiel: !!details.partiel,
            itemSeed: details.itemSeed || null
        });
        // Pas de carte « Bonne réponse ! » ici.
        //
        // Ces jeux annoncent TOUS la réussite eux-mêmes, et mieux que ne le
        // ferait une carte générique : « EXACT ! +40 » dessiné dans le canevas
        // de la course, la météorite qui explose, les cases de Crush qui
        // éclatent, la paire du memory qui s'efface. Une seconde annonce
        // par-dessus se contredit visuellement plus qu'elle ne renforce.
        //
        // Deux de ces appels étaient même trompeurs : Tetris signale une
        // réussite depuis `quitGame()` — on voyait « Bonne réponse ! » en
        // QUITTANT la partie — et le labyrinthe depuis `nextLevel()`, où rien
        // ne vient d'être répondu. La tentative, elle, reste enregistrée
        // ci-dessus : c'est l'affichage qu'on supprime, pas la donnée.
        //
        // Les activités modernes ne passent pas par ici : leur retour vient
        // d'`itemSession`, qui sait de quelle question il parle.
    }

    /**
     * @param {HTMLElement} [el]
     * @param {Object} snapshot - { questionText, input, expected, concept, customMessage, silencieux }
     *
     * `silencieux` : la tentative est enregistrée, mais SANS carte de
     * correction. Réservé aux jeux d'arcade qui affichent eux-mêmes
     * l'explication dans leur décor — une carte pleine largeur posée sur une
     * partie qui continue de tourner est illisible.
     */
    onWrongAnswer(el, snapshot = {}) {
        if (this.isDemo) return;
        if (el) {
            el.style.backgroundColor = 'var(--danger)';
            el.style.transform = 'scale(0.95)';
        }
        // `operation` : nom de champ utilisé par les jeux les plus anciens.
        const questionText = snapshot.questionText || snapshot.operation || '';
        state.recordAttempt({
            correct: false,
            skillId: conceptToSkill(snapshot.concept),
            questionText,
            given: snapshot.input,
            expected: snapshot.expected,
            explanation: snapshot.customMessage || '',
            attemptIndex: snapshot.attemptIndex || 0,
            partiel: !!snapshot.partiel,
            itemSeed: snapshot.itemSeed || null
        });
        if (!snapshot.silencieux && (snapshot.customMessage || questionText)) {
            document.dispatchEvent(new CustomEvent('game_feedback', {
                detail: {
                    kind: 'error', isError: true,
                    msg: snapshot.customMessage || `Faux ! ${questionText} = ${snapshot.expected}`,
                    // Ces jeux tournent en temps réel (chute de blocs, course,
                    // chronomètre) : on ne peut pas les figer sur un clic.
                    // Le retour y reste donc éphémère.
                    blocking: false
                }
            }));
        }
    }

    /**
     * LA PARTIE EST FINIE — et le parcours doit l'apprendre.
     *
     * Rémy : « j'ai fait un jeu que j'ai bien réussi mais mon niveau sur le
     * parcours n'a pas été validé […] et pourquoi le menu n'est pas apparu. »
     *
     * Voici pourquoi. Le moteur de parcours ne sait qu'une chose : compter les
     * réponses. Un jeu de tables lui en envoie dix, il clôt l'étape. Mais un
     * jeu d'ÉCHECS n'envoie pas de réponses : il envoie une PARTIE, et celle-ci
     * ne se termine qu'une fois — au mat. Les six jeux comptés en parties
     * (échecs, dames, othello, puissance 4, Sim, pipopipette) annonçaient donc
     * « 🏆 Gagné ! » dans leur coin sans que personne d'autre ne l'apprenne :
     * l'étape restait ouverte pour toujours, le monde suivant restait éteint,
     * et l'élève qui avait gagné se retrouvait devant un plateau mort.
     *
     * Un jeu à fin franche appelle donc ceci, une fois, quand c'est joué. La
     * tentative est enregistrée — donc le carnet, les statistiques et la note
     * la voient — puis le parcours est prévenu qu'il peut clore l'étape.
     *
     * @param {Object} r
     * @param {boolean} r.gagne      - l'élève l'a-t-il emporté ?
     * @param {string}  [r.quoi]     - ce qui était demandé (« Gagner une partie d'othello »)
     * @param {string}  [r.obtenu]   - ce qui s'est passé (« victoire 34-30 »)
     * @param {string}  [r.concept]  - la compétence travaillée
     * @param {number}  [r.points]
     * @param {string}  [r.conseil]  - ce qu'on dira à l'élève qui a perdu
     */
    terminerPartie(r = {}) {
        if (this.isDemo) return;
        // UNE SEULE FOIS. Une partie d'othello se termine par un coup qui peut
        // être joué depuis deux endroits (le clic, la riposte de l'ordinateur) :
        // sans ce garde-fou, l'étape se validerait deux fois et le compteur de
        // questions afficherait « 2 / 1 ».
        if (this._partieClose) return;
        this._partieClose = true;

        const quoi = r.quoi || 'Gagner la partie';
        if (r.gagne) {
            this.onCorrectAnswer(null, r.concept || null, {
                questionText: quoi,
                expected: 'gagné', given: r.obtenu || 'gagné',
                points: r.points || 25
            });
        } else {
            this.onWrongAnswer(null, {
                concept: r.concept || null,
                questionText: quoi,
                input: r.obtenu || 'perdu', expected: 'gagné',
                customMessage: r.conseil || '',
                // Le jeu vient d'annoncer le résultat sur son propre plateau ;
                // une carte de correction par-dessus dirait la même chose en
                // moins bien.
                silencieux: true
            });
        }

        // Le parcours peut clore l'étape. Le délai laisse lire l'annonce du
        // jeu — « 🏆 Gagné ! » suivi d'un écran de bilan dans la même seconde
        // ne se lit pas, il clignote.
        const runner = state.activeSequenceRunner;
        if (runner && typeof runner.partieTerminee === 'function') {
            runner.partieTerminee({ gagne: !!r.gagne });
        }
    }

    // --- Utilitaires de tirage (jeux non encore portés sur les générateurs) ---

    getRandomTable() {
        const tables = this.params.tables && this.params.tables.length
            ? this.params.tables : [2, 3, 4, 5, 6, 7, 8, 9, 10];
        return tables[Math.floor(Math.random() * tables.length)];
    }

    getRandomMultiplier() {
        return Math.floor(Math.random() * 10) + 1;
    }
}
