import { renderChoiceQuestion } from '../core/choiceGame.js';

export function engineMultFlash(canvas, isDemo, params) {
    if (!params.tables || params.tables.length === 0) params.tables = [2, 3, 4, 5];

    let t, m, ans;
    if (params.forceQuestion && params.forceQuestion.t !== undefined) {
        t = params.forceQuestion.t;
        m = params.forceQuestion.m;
        ans = params.forceQuestion.ans;
    } else {
        t = params.tables[Math.floor(Math.random() * params.tables.length)];
        m = Math.floor(Math.random() * 10) + 1;
        ans = t * m;
    }

    let vals = [ans];
    while (vals.length < 3) {
        const fake = t * (Math.floor(Math.random() * 10) + 1);
        if (!vals.includes(fake)) vals.push(fake);
    }
    vals = vals.sort(() => Math.random() - 0.5);
    const choices = vals.map(v => ({ val: v, label: v, correct: v === ans }));

    renderChoiceQuestion(canvas, {
        isDemo,
        questionHtml: `<div class="game-question">${t} &times; ${m} = ?</div>`,
        choices,
        itemClass: 'bubble',
        containerClass: 'bubble-container',
        questionText: `${t} × ${m}`,
        errorContext: { t, m, ans },
        replay: (nextIsDemo) => engineMultFlash(canvas, nextIsDemo, params)
    });
}
