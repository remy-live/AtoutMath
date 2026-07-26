import { regTimeout } from './timers.js';
import { state } from './state.js';

const defaultStyleFeedback = (el, isCorrect) => {
    if (isCorrect) {
        el.style.backgroundColor = '#dcfce7';
    } else {
        el.style.background = 'var(--danger)';
    }
};

/**
 * Rendu générique pour les jeux "question + choix cliquables" (bulles, cases,
 * boutons...). Factorise le rendu, le mode démo, la validation au clic et le
 * log d'erreur communs à la plupart des jeux de calcul mental. Chaque moteur
 * ne fournit que ce qui lui est propre : l'énoncé, les choix, le contexte
 * d'erreur à sauvegarder, et comment relancer une question.
 *
 * @param {HTMLElement} canvas
 * @param {Object} config
 * @param {boolean} config.isDemo
 * @param {string} config.questionHtml - contenu affiché au-dessus des choix
 * @param {string} [config.extraHtml] - contenu optionnel entre la question et les choix (ex: grille de contexte)
 * @param {{val: string|number, label: string|number, correct: boolean}[]} config.choices
 * @param {string} config.itemClass - classe CSS de chaque choix (ex: 'bubble', 'missing-cell', 'prio-btn')
 * @param {string} [config.containerClass] - classe CSS du conteneur des choix ; omis = pas de wrapper
 * @param {string} config.questionText - intitulé de la question pour le carnet d'erreurs
 * @param {string} [config.feedbackMessage] - message d'erreur custom (sinon "Faux ! {questionText} = {réponse}")
 * @param {Object} [config.errorContext] - champs additionnels fusionnés dans le snapshot d'erreur
 * @param {(nextIsDemo: boolean) => void} config.replay - relance une nouvelle question
 * @param {number} [config.points]
 * @param {(el: HTMLElement, isCorrect: boolean) => void} [config.styleFeedback] - retour visuel custom au clic
 */
export function renderChoiceQuestion(canvas, {
    isDemo,
    questionHtml,
    extraHtml = '',
    choices,
    itemClass,
    containerClass = '',
    questionText,
    feedbackMessage,
    errorContext = {},
    replay,
    points = 10,
    successDelay = 1500,
    demoDelay = 2000,
    demoClickDelay = 800,
    styleFeedback = defaultStyleFeedback
}) {
    const correctChoice = choices.find(c => c.correct);

    const itemsHtml = choices
        .map(c => `<div class="${itemClass}" data-val="${String(c.val).replace(/"/g, '&quot;')}">${c.label}</div>`)
        .join('');
    const choicesHtml = containerClass ? `<div class="${containerClass}">${itemsHtml}</div>` : itemsHtml;

    canvas.innerHTML = `${questionHtml}${extraHtml}${choicesHtml}`;

    const items = () => [...canvas.querySelectorAll(`.${itemClass}`)];

    if (isDemo) {
        regTimeout(() => {
            const el = items().find(e => e.dataset.val === String(correctChoice.val));
            if (el) {
                el.classList.add('demo-target');
                regTimeout(() => replay(true), demoClickDelay);
            }
        }, demoDelay);
    } else {
        items().forEach(el => {
            el.onclick = () => {
                const isCorrect = el.dataset.val === String(correctChoice.val);
                styleFeedback(el, isCorrect);

                if (isCorrect) {
                    state.celebrate(el, points);
                    regTimeout(() => replay(false), successDelay);
                } else {
                    state.showFeedback(feedbackMessage !== undefined ? feedbackMessage : `Faux ! ${questionText} = ${correctChoice.label}`);
                    import('./errorSchema.js').then(schema => {
                        state.logError(state.activeExo, schema.createErrorSnapshot({
                            input: el.dataset.val,
                            expected: String(correctChoice.val),
                            questionText,
                            ...errorContext
                        }));
                    });
                }
            };
        });
    }
}
