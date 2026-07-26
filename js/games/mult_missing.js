import { renderChoiceQuestion } from '../core/choiceGame.js';

export function engineMultMissing(canvas, isDemo, params) {
    const tables = params.tables || [2,3,4,5,6,7,8,9,10];

    let targetFactor, missingFactor, product, isFirstMissing;
    if (params.forceQuestion && params.forceQuestion.targetFactor !== undefined) {
        targetFactor = params.forceQuestion.targetFactor;
        missingFactor = params.forceQuestion.missingFactor;
        product = params.forceQuestion.product;
        isFirstMissing = params.forceQuestion.isFirstMissing;
    } else {
        targetFactor = tables[Math.floor(Math.random() * tables.length)];
        missingFactor = Math.floor(Math.random() * 9) + 2; // 2 to 10
        product = targetFactor * missingFactor;
        isFirstMissing = Math.random() > 0.5;
    }
    const equationStr = isFirstMissing ? `? × ${targetFactor} = ${product}` : `${targetFactor} × ? = ${product}`;

    // Generate a 4x3 grid of choices (12 cells)
    let vals = [missingFactor];
    while (vals.length < 12) {
        const wrong = Math.floor(Math.random() * 12) + 1;
        if (!vals.includes(wrong)) vals.push(wrong);
    }
    vals = vals.sort(() => Math.random() - 0.5);
    const choices = vals.map(v => ({ val: v, label: v, correct: v === missingFactor }));

    renderChoiceQuestion(canvas, {
        isDemo,
        questionHtml: `<div class="game-question" style="margin-bottom:0;">Facteur Manquant</div><div style="font-size: 2.2rem; font-weight:bold; color: var(--primary);">${equationStr}</div>`,
        choices,
        itemClass: 'missing-cell',
        containerClass: 'missing-grid',
        questionText: isFirstMissing ? `... x ${targetFactor} = ${product}` : `${targetFactor} x ... = ${product}`,
        feedbackMessage: `Faux ! ${targetFactor} × ${missingFactor} = ${product}`,
        errorContext: { targetFactor, missingFactor, product, isFirstMissing },
        styleFeedback: (el, isCorrect) => {
            if (isCorrect) {
                el.style.borderColor = 'var(--success)';
                el.style.backgroundColor = '#dcfce7';
            } else {
                el.style.borderColor = 'var(--danger)';
                el.style.color = 'var(--danger)';
            }
        },
        replay: (nextIsDemo) => engineMultMissing(canvas, nextIsDemo, params)
    });
}
