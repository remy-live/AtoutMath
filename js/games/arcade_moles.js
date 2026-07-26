import { regTimeout, clearEngines } from '../core/timers.js';
import { state } from '../core/state.js';

export function engineArcadeMoles(canvas, isDemo, params = {}) {
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

    const operatorSymbol = op === '*' ? '×' : op;

    let html = `
        <div class="arcade-moles-container" style="display: flex; flex-direction: column; align-items: center; width: 100%; height: 100%;">
            <div class="game-question" style="font-size: 3rem; margin-bottom: 20px;">
                Cible : <span style="color: var(--primary);">${a} ${operatorSymbol} ${b}</span>
            </div>
            <div class="moles-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; width: 100%; max-width: 400px; margin: auto;">
    `;
    
    for(let i=0; i<9; i++) {
        html += `
            <div class="mole-hole" data-index="${i}" style="aspect-ratio: 1; background: #e5e7eb; border-radius: 50%; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 5px 10px rgba(0,0,0,0.1); cursor: pointer;">
                <div class="mole" style="width: 80%; height: 80%; background: var(--accent); border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: bold; transform: translateY(150%); transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);"></div>
            </div>
        `;
    }
    
    html += `
            </div>
        </div>
    `;
    
    canvas.innerHTML = html;

    const holes = canvas.querySelectorAll('.mole-hole');
    let activeMoleIndex = -1;
    let moleInterval;

    function popMole() {
        if (activeMoleIndex !== -1) {
            const oldMole = holes[activeMoleIndex].querySelector('.mole');
            oldMole.style.transform = 'translateY(150%)'; // hide
        }

        activeMoleIndex = Math.floor(Math.random() * 9);
        const newMole = holes[activeMoleIndex].querySelector('.mole');
        
        // 50% chance to be the correct answer
        const isCorrect = Math.random() > 0.5;
        let moleVal = target;
        
        if (!isCorrect) {
            if (op === '*') moleVal = target + (Math.floor(Math.random() * 5) + 1) * a * (Math.random() > 0.5 ? 1 : -1);
            else moleVal = target + (Math.floor(Math.random() * 10) + 1) * (Math.random() > 0.5 ? 1 : -1);
            if (moleVal < 0) moleVal = target + 1; // prevent negative fakes if not wanted
        }
        
        newMole.dataset.val = moleVal;
        newMole.textContent = moleVal;
        newMole.style.transform = 'translateY(0)'; // show
        newMole.style.background = 'var(--accent)';
        
        if (isDemo && isCorrect) {
            regTimeout(() => {
                newMole.style.background = 'var(--success)';
                holes[activeMoleIndex].click();
            }, 800);
        }

        // Schedule next pop
        if (!isDemo) {
            const nextPopTime = 1000 + Math.random() * 1000; // between 1s and 2s
            moleInterval = regTimeout(popMole, nextPopTime);
        }
    }

    if (isDemo) {
        regTimeout(popMole, 1000);
    } else {
        popMole();
        
        holes.forEach((hole, idx) => {
            hole.onclick = () => {
                if (idx !== activeMoleIndex) return; // not the active mole
                const mole = hole.querySelector('.mole');
                const userVal = parseInt(mole.dataset.val);
                
                if (userVal === target) {
                    mole.style.background = "var(--success)";
                    state.celebrate(hole, 5);
                    if (state.activeSequenceRunner) {
                        state.activeSequenceRunner.onGameAction(true);
                        engineArcadeMoles(canvas, false, params);
                    }
                } else {
                    mole.style.background = "var(--danger)";
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
                        engineArcadeMoles(canvas, false, params);
                    }
                }
            };
        });
    }
}
