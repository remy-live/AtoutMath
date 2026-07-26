import { regTimeout, regInterval } from '../core/timers.js';
import { state } from '../core/state.js';

export function engineGrid(canvas, isDemo, params = {}) {
    let tx, ty;
    if (params.forceQuestion && params.forceQuestion.tx !== undefined) {
        tx = params.forceQuestion.tx;
        ty = params.forceQuestion.ty;
    } else {
        tx = Math.floor(Math.random() * 5) + 1;
        ty = Math.floor(Math.random() * 5) + 1;
    }

    let grid = '<div class="tactile-grid">';
    for(let y=5; y>=1; y--) { for(let x=1; x<=5; x++) { grid += `<div class="grid-cell" data-c="${x},${y}"></div>`; } }
    grid += '</div>';

    canvas.innerHTML = `<div class="game-question">Cible : (${tx} ; ${ty})</div>${grid}`;

    if(isDemo) {
        regTimeout(() => {
            const cell = canvas.querySelector(`.grid-cell[data-c="${tx},${ty}"]`);
            if(cell) {
                cell.classList.add('demo-target');
                regTimeout(() => { engineGrid(canvas, true, params); }, 800);
            }
        }, 2000);
    } else {
        canvas.querySelectorAll('.grid-cell').forEach(c => {
            c.onclick = () => {
                if(c.dataset.c === `${tx},${ty}`) {
                    c.style.backgroundColor = "var(--success)";
                    state.celebrate(c, 10);
                    regTimeout(() => engineGrid(canvas, false, params), 1500);
                } else { 
                    c.style.background = "#fee2e2"; 
                    state.showFeedback(`Faux ! Les coordonnées de cette case sont (${c.dataset.c.replace(',', ' ; ')}).`);
                    import('../core/errorSchema.js').then(schema => {
                        state.logError(state.activeExo, schema.createErrorSnapshot({
                            input: `(${c.dataset.c.replace(',', ';')})`,
                            expected: `(${tx};${ty})`,
                            questionText: `Coordonnées (${tx};${ty})`,
                            tx: tx,
                            ty: ty
                        }));
                    });
                }
            };
        });
    }
}
