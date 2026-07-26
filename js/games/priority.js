import { renderChoiceQuestion } from '../core/choiceGame.js';

export function enginePriority(canvas, isDemo, params = {}) {
    let eq, right, wrong;
    if (params.forceQuestion && params.forceQuestion.eq !== undefined) {
        eq = params.forceQuestion.eq;
        right = params.forceQuestion.right;
        wrong = params.forceQuestion.wrong;
    } else {
        eq = "10 + 2 × 3";
        right = "2 × 3";
        wrong = "10 + 2";
    }

    const choices = [right, wrong]
        .sort(() => Math.random() - 0.5)
        .map(v => ({ val: v, label: v, correct: v === right }));

    renderChoiceQuestion(canvas, {
        isDemo,
        questionHtml: `<div class="game-question">Priorité ?<br><span style="color:var(--primary)">${eq}</span></div>`,
        choices,
        itemClass: 'prio-btn',
        questionText: eq,
        feedbackMessage: "Faux ! La multiplication est prioritaire sur l'addition.",
        errorContext: { eq, right, wrong },
        styleFeedback: (el, isCorrect) => {
            if (isCorrect) {
                el.style.borderColor = 'var(--success)';
                el.style.backgroundColor = '#dcfce7';
            } else {
                el.style.borderColor = 'var(--danger)';
                el.classList.add('shake');
            }
        },
        replay: (nextIsDemo) => enginePriority(canvas, nextIsDemo, params)
    });
}
