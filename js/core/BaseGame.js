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
    }

    start() {
        this.isRunning = true;
        this.container.innerHTML = '';
        this.render();
        if (this.isDemo) this.runDemoSequence();
        else this.startGameLoop();
    }

    destroy() {
        // Couper AVANT de vider : ces jeux ouvrent des minuteurs bruts que
        // `isRunning = false` ne suffit pas à faire taire. La course
        // rafraîchissait son tableau de bord une fois par seconde après la
        // sortie, cherchant des éléments que `innerHTML = ''` venait
        // d'effacer — une erreur par seconde, jusqu'au rechargement de la page.
        this.pause();
        this.isRunning = false;
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
            attemptIndex: 0
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
            attemptIndex: 0
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
