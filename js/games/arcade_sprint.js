import { regTimeout } from '../core/timers.js';
import { state } from '../core/state.js';

export function engineArcadeSprint(canvas, isDemo, params = {}) {
    let op = '+';
    if (params.operations && params.operations.length > 0) {
        op = params.operations[Math.floor(Math.random() * params.operations.length)];
    }
    
    let a, b, target;
    
    if (params.forceQuestion && params.forceQuestion.a !== undefined) {
        a = params.forceQuestion.a;
        b = params.forceQuestion.b;
        target = params.forceQuestion.target;
        if (params.forceQuestion.op) op = params.forceQuestion.op;
    } else {
        if (op === '+') {
            a = Math.floor(Math.random() * 20) + 1;
            b = Math.floor(Math.random() * 20) + 1;
            target = a + b;
        } else if (op === '-') {
            a = Math.floor(Math.random() * 20) + 10;
            b = Math.floor(Math.random() * a); 
            target = a - b;
        } else if (op === '*') {
            const tables = params.tables || [2,3,4,5,6,7,8,9,10];
            a = tables[Math.floor(Math.random() * tables.length)];
            b = Math.floor(Math.random() * 9) + 2;
            target = a * b;
        }
    }
    
    let choices = [target];
    while(choices.length < 3) {
        let fake;
        if (op === '*') fake = target + (Math.floor(Math.random() * 5) + 1) * a * (Math.random() > 0.5 ? 1 : -1);
        else fake = target + (Math.floor(Math.random() * 10) + 1) * (Math.random() > 0.5 ? 1 : -1);
        
        if (fake >= 0 && !choices.includes(fake)) choices.push(fake);
    }
    choices = choices.sort(() => Math.random() - 0.5);

    const operatorSymbol = op === '*' ? '×' : op;

    canvas.innerHTML = `
        <div class="arcade-sprint-container">
            <div class="game-question" style="font-size: 4rem !important; margin-bottom: 2rem;">
                ${a} ${operatorSymbol} ${b} = ?
            </div>
            <div class="bubble-container">
                ${choices.map(c => `<div class="bubble sprint-bubble" data-val="${c}">${c}</div>`).join('')}
            </div>
        </div>
    `;

    if(isDemo) {
        regTimeout(() => {
            const el = canvas.querySelector(`.bubble[data-val="${target}"]`);
            if(el) {
                el.classList.add('demo-target');
                regTimeout(() => { el.click(); engineArcadeSprint(canvas, true, params); }, 800);
            }
        }, 1500);
    } else {
        canvas.querySelectorAll('.bubble').forEach(btn => {
            btn.onclick = () => {
                const userVal = parseInt(btn.dataset.val);
                if(userVal === target) {
                    btn.style.background = "var(--success)";
                    btn.style.color = "white";
                    state.celebrate(btn, 5);
                    if (state.activeSequenceRunner) {
                        state.activeSequenceRunner.onGameAction(true);
                        engineArcadeSprint(canvas, false, params);
                    }
                } else { 
                    btn.style.background = "var(--danger)";
                    btn.style.color = "white";
                    state.showFeedback(`Faux ! ${a} ${operatorSymbol} ${b} = ${target}`);
                    import('../core/errorSchema.js').then(schema => {
                        state.logError(state.activeExo, schema.createErrorSnapshot({
                            input: userVal,
                            expected: target,
                            questionText: `${a} ${operatorSymbol} ${b}`,
                            a: a,
                            b: b,
                            op: op,
                            target: target
                        }));
                    });
                    
                    if (state.activeSequenceRunner) {
                        state.activeSequenceRunner.onGameAction(false);
                        engineArcadeSprint(canvas, false, params);
                    }
                }
            };
        });
    }
}
