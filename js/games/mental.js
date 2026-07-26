import { renderChoiceQuestion } from '../core/choiceGame.js';

export function engineMental(canvas, isDemo, params = {}) {
    let a, b, target;
    if (params.forceQuestion && params.forceQuestion.a !== undefined) {
        a = params.forceQuestion.a;
        b = params.forceQuestion.b;
        target = params.forceQuestion.target;
    } else {
        a = Math.floor(Math.random() * 10) + 1;
        b = Math.floor(Math.random() * 10) + 1;
        target = a + b;
    }

    const choices = [target, target - 1, target + 1]
        .sort(() => Math.random() - 0.5)
        .map(v => ({ val: v, label: v, correct: v === target }));

    renderChoiceQuestion(canvas, {
        isDemo,
        questionHtml: `<div class="game-question">${a} + ${b} = ?</div>`,
        choices,
        itemClass: 'bubble',
        containerClass: 'bubble-container',
        questionText: `${a} + ${b}`,
        errorContext: { a, b, target },
        replay: (nextIsDemo) => engineMental(canvas, nextIsDemo, params)
    });
}
