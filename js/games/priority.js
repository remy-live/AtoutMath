import { regTimeout, regInterval } from '../core/timers.js';
import { state } from '../core/state.js';

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
    
    let btns = [right, wrong].sort(() => Math.random() - 0.5);
    
    canvas.innerHTML = `<div class="game-question">Priorité ?<br><span style="color:var(--primary)">${eq}</span></div>` + 
    btns.map(b => `<button class="prio-btn" data-val="${b}">${b}</button>`).join('');

    if(isDemo) {
        regTimeout(() => {
            const btn = canvas.querySelector(`.prio-btn[data-val="${right}"]`);
            if(btn) {
                btn.classList.add('demo-target');
                regTimeout(() => { enginePriority(canvas, true, params); }, 800);
            }
        }, 2000);
    } else {
        canvas.querySelectorAll('.prio-btn').forEach(btn => {
            btn.onclick = () => {
                if(btn.dataset.val === right) {
                    btn.style.borderColor = "var(--success)";
                    btn.style.backgroundColor = "#dcfce7";
                    state.celebrate(btn, 10);
                    regTimeout(() => { enginePriority(canvas, false, params); }, 1500);
                } else {
                    btn.style.borderColor = "var(--danger)";
                    state.showFeedback("Faux ! La multiplication est prioritaire sur l'addition.");
                    btn.classList.add('shake');
                    import('../core/errorSchema.js').then(schema => {
                        state.logError(state.activeExo, schema.createErrorSnapshot({
                            input: btn.dataset.val,
                            expected: right,
                            questionText: eq,
                            eq: eq,
                            right: right,
                            wrong: wrong
                        }));
                    });
                }
            };
        });
    }
}
