import { regTimeout, regInterval } from '../core/timers.js';
import { state } from '../core/state.js';

export function engineMultMissing(canvas, isDemo, params) {
    const tables = params.tables || [2,3,4,5,6,7,8,9,10];
    
    let targetFactor, missingFactor, product, isFirstMissing, equationStr;
    if (params.forceQuestion && params.forceQuestion.targetFactor !== undefined) {
        targetFactor = params.forceQuestion.targetFactor;
        missingFactor = params.forceQuestion.missingFactor;
        product = params.forceQuestion.product;
        isFirstMissing = params.forceQuestion.isFirstMissing;
        equationStr = isFirstMissing ? `? × ${targetFactor} = ${product}` : `${targetFactor} × ? = ${product}`;
    } else {
        targetFactor = tables[Math.floor(Math.random() * tables.length)]; 
        missingFactor = Math.floor(Math.random() * 9) + 2; // 2 to 10
        product = targetFactor * missingFactor;
        isFirstMissing = Math.random() > 0.5;
        equationStr = isFirstMissing ? `? × ${targetFactor} = ${product}` : `${targetFactor} × ? = ${product}`;
    }
    
    // Generate a 4x3 grid of choices (12 cells)
    let gridChoices = [missingFactor];
    while(gridChoices.length < 12) {
        let wrong = Math.floor(Math.random() * 12) + 1;
        if(!gridChoices.includes(wrong)) gridChoices.push(wrong);
    }
    gridChoices = gridChoices.sort(() => Math.random() - 0.5);

    let gridHtml = '<div class="missing-grid">';
    gridChoices.forEach(c => {
        gridHtml += `<div class="missing-cell" data-val="${c}">${c}</div>`;
    });
    gridHtml += '</div>';

    canvas.innerHTML = `
        <div class="game-question" style="margin-bottom:0;">Facteur Manquant</div>
        <div style="font-size: 2.2rem; font-weight:bold; color: var(--primary);">${equationStr}</div>
        ${gridHtml}
    `;

    if (isDemo) {
        regTimeout(() => {
            const el = canvas.querySelector(`.missing-cell[data-val="${missingFactor}"]`);
            if(el) {
                el.classList.add('demo-target');
                regTimeout(() => { engineMultMissing(canvas, true, params); }, 800);
            }
        }, 2000);
    } else {
        canvas.querySelectorAll('.missing-cell').forEach(cell => {
            cell.onclick = () => {
                const userVal = parseInt(cell.dataset.val);
                if(userVal === missingFactor) {
                    cell.style.borderColor = "var(--success)";
                    cell.style.backgroundColor = "#dcfce7";
                    state.celebrate(cell, 10);
                    regTimeout(() => { engineMultMissing(canvas, false, params); }, 1500);
                } else {
                    cell.style.borderColor = "var(--danger)";
                    cell.style.color = "var(--danger)";
                    state.showFeedback(`Faux ! ${targetFactor} × ${missingFactor} = ${product}`);
                    import('../core/errorSchema.js').then(schema => {
                        state.logError(state.activeExo, schema.createErrorSnapshot({
                            input: userVal,
                            expected: missingFactor,
                            questionText: isFirstMissing ? `... x ${targetFactor} = ${product}` : `${targetFactor} x ... = ${product}`,
                            targetFactor: targetFactor,
                            missingFactor: missingFactor,
                            product: product,
                            isFirstMissing: isFirstMissing
                        }));
                    });
                }
            };
        });
    }
}
