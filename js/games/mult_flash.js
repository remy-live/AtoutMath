import { regTimeout, regInterval } from '../core/timers.js';
import { state } from '../core/state.js';

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
    
    let choices = [ans];
    while(choices.length < 3) {
        let fake = (t * (Math.floor(Math.random() * 10) + 1));
        if(!choices.includes(fake)) choices.push(fake);
    }
    choices = choices.sort(() => Math.random() - 0.5);

    let html = `<div class="game-question">${t} &times; ${m} = ?</div><div class="bubble-container">`;
    choices.forEach(c => { html += `<div class="bubble" data-val="${c}">${c}</div>`; });
    html += `</div>`;
    canvas.innerHTML = html;

    if (isDemo) {
        regTimeout(() => {
            const el = canvas.querySelector(`.bubble[data-val="${ans}"]`);
            if(el) {
                el.classList.add('demo-target');
                regTimeout(() => { el.click(); engineMultFlash(canvas, true, params); }, 800);
            }
        }, 2000);
    } else {
        canvas.querySelectorAll('.bubble').forEach(b => {
            b.onclick = () => {
                const userVal = parseInt(b.dataset.val);
                if(userVal === ans) {
                    b.style.backgroundColor = "#dcfce7";
                    state.celebrate(b, 10);
                    regTimeout(() => { engineMultFlash(canvas, false, params); }, 1500);
                } else {
                    b.style.background = "var(--danger)";
                    state.showFeedback(`Faux ! ${t} × ${m} = ${ans}`);
                    import('../core/errorSchema.js').then(schema => {
                        state.logError(state.activeExo, schema.createErrorSnapshot({
                            input: userVal,
                            expected: ans,
                            questionText: `${t} × ${m}`,
                            t: t,
                            m: m,
                            ans: ans
                        }));
                    });
                }
            };
        });
    }
}
