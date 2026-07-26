import { regTimeout, regInterval } from '../core/timers.js';
import { state } from '../core/state.js';

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
    
    let choices = [target, target-1, target+1].sort(() => Math.random() - 0.5);

    canvas.innerHTML = `<div class="game-question">${a} + ${b} = ?</div><div class="bubble-container">` + 
    choices.map(c => `<div class="bubble" data-val="${c}">${c}</div>`).join('') + `</div>`;

    if(isDemo) {
        regTimeout(() => {
            const el = canvas.querySelector(`.bubble[data-val="${target}"]`);
            if(el) {
                el.classList.add('demo-target');
                regTimeout(() => { el.click(); engineMental(canvas, true, params); }, 800);
            }
        }, 2000);
    } else {
        canvas.querySelectorAll('.bubble').forEach(btn => {
            btn.onclick = () => {
                const userVal = parseInt(btn.dataset.val);
                if(userVal === target) {
                    btn.style.background = "var(--success)";
                    state.celebrate(btn, 10);
                    regTimeout(() => engineMental(canvas, false, params), 1500);
                } else { 
                    btn.style.background = "var(--danger)"; 
                    state.showFeedback(`Faux ! ${a} + ${b} = ${target}`);
                    import('../core/errorSchema.js').then(schema => {
                        state.logError(state.activeExo, schema.createErrorSnapshot({
                            input: userVal,
                            expected: target,
                            questionText: `${a} + ${b}`,
                            a: a,
                            b: b,
                            target: target
                        }));
                    });
                }
            };
        });
    }
}
