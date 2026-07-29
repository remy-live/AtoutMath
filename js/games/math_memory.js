import { regTimeout, regInterval } from '../core/timers.js';
import { BaseGame } from '../core/BaseGame.js';
import { generateMultFact } from '../core/generators.js';
import { getWeakTables } from '../core/stats.js';

class MathMemory extends BaseGame {
    render() {
        this.container.innerHTML = `
            <style>
                .memory-arena {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg-app);
                    padding: 20px;
                    box-sizing: border-box;
                }
                .memory-grid {
                    display: grid;
                    gap: 15px;
                    max-width: 800px;
                    width: 100%;
                }
                .memory-card {
                    background: var(--bg-panel);
                    border: 2px solid var(--border);
                    border-radius: 12px;
                    height: 80px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    font-weight: bold;
                    color: var(--text-main);
                    cursor: pointer;
                    transition: transform 0.3s, background 0.3s, opacity 0.3s;
                    user-select: none;
                    box-shadow: var(--shadow-sm);
                    transform-style: preserve-3d;
                }
                .memory-card.hidden {
                    background: var(--primary);
                    color: transparent;
                    border-color: var(--primary-hover);
                    background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px);
                }
                .memory-card.matched {
                    opacity: 0;
                    pointer-events: none;
                }
                .memory-card.error {
                    background: var(--danger);
                    color: white;
                    animation: shake 0.4s;
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
            </style>
            <div class="memory-arena">
                <div class="memory-grid" id="memory-grid"></div>
            </div>
        `;
        this.gridEl = this.container.querySelector('#memory-grid');
    }

    startGameLoop() {
        this.pairsFound = 0;
        this.targetPairs = Math.min(this.params.nbQuestions || 6, 12); // Max 12 pairs (24 cards) for space
        
        // Setup Grid CSS
        const cols = this.targetPairs > 8 ? 6 : (this.targetPairs > 4 ? 4 : 3);
        this.gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        
        this.cards = [];
        this.firstPick = null;
        this.lockBoard = false;
        
        const weakTables = getWeakTables();
        const pairsData = [];
        for(let i = 0; i < this.targetPairs; i++) {
            const { t, m, ans, concept } = generateMultFact(this.params.tables, weakTables);
            const uid = i;

            pairsData.push({ type: 'question', text: `${t} × ${m}`, uid, t, m, ans, concept });
            pairsData.push({ type: 'answer', text: `${ans}`, uid, t, m, ans, concept });
        }
        
        // Shuffle
        pairsData.sort(() => Math.random() - 0.5);
        
        this.gridEl.innerHTML = '';
        pairsData.forEach((data, index) => {
            const el = document.createElement('div');
            el.className = 'memory-card hidden';
            el.dataset.index = index;
            // The text is stored in dataset but not displayed because color is transparent in .hidden
            el.textContent = data.text; 
            
            el.onclick = () => this.handleCardClick(el, data);
            
            this.gridEl.appendChild(el);
            this.cards.push({ el, data, isMatched: false });
        });
    }

    runDemoSequence() {
        this.startGameLoop();

        let step = 0;
        const tour = () => {
            if (!this.isRunning || this.lockBoard) return;

            const hiddenCards = this.cards.filter(c => !c.isMatched && c.el.classList.contains('hidden'));
            if (hiddenCards.length < 2) return;

            // Une paire trouvée de temps en temps : une démonstration qui
            // n'associe jamais rien ne montre pas à quoi sert le jeu.
            let c1 = hiddenCards[0];
            let c2 = hiddenCards[1];
            if (step % 3 === 0) {
                c2 = hiddenCards.find(c => c !== c1 && c.data.uid === c1.data.uid) || hiddenCards[1];
            }

            c1.el.click();
            regTimeout(() => { if (this.isRunning) c2.el.click(); }, 600);
            step++;
        };

        // Un premier retournement tout de suite : le plateau démarre
        // entièrement face cachée, et attendre le premier tour d'intervalle
        // laissait trois secondes de cartes muettes — assez pour que la
        // vignette du catalogue ne montre jamais que des dos de cartes.
        regTimeout(tour, 250);
        regInterval(tour, 2600);
    }

    handleCardClick(el, data) {
        if (this.lockBoard) return;
        if (el === this.firstPick?.el) return;
        if (el.classList.contains('matched')) return;
        
        // Reveal
        el.classList.remove('hidden');
        
        if (!this.firstPick) {
            this.firstPick = { el, data };
            return;
        }
        
        // Second pick
        const secondPick = { el, data };
        this.lockBoard = true;
        
        if (this.firstPick.data.uid === secondPick.data.uid) {
            // Match!
            this.onCorrectAnswer(null, this.firstPick.data.concept); // Register generic correct answer
            
            regTimeout(() => {
                if(!this.isRunning) return;
                this.firstPick.el.classList.add('matched');
                secondPick.el.classList.add('matched');
                this.firstPick = null;
                this.lockBoard = false;
                
                this.pairsFound++;
                if (this.pairsFound >= this.targetPairs) {
                    // Win board
                    regTimeout(() => this.startGameLoop(), 1000); // Reload a new board if sequence allows it
                }
            }, 1000);
            
        } else {
            // Wrong
            this.firstPick.el.classList.add('error');
            secondPick.el.classList.add('error');
            
            // In a memory game, a mismatch is an error. We log it.
            // But what is the exact math error? It's just a memory error. We can log the first card's expected vs actual picked.
            this.onWrongAnswer(null, {
                input: secondPick.data.text,
                expected: this.firstPick.data.ans,
                questionText: this.firstPick.data.text,
                t: this.firstPick.data.t,
                m: this.firstPick.data.m,
                ans: this.firstPick.data.ans,
                concept: this.firstPick.data.concept
            });
            
            regTimeout(() => {
                if(!this.isRunning) return;
                this.firstPick.el.classList.remove('error');
                secondPick.el.classList.remove('error');
                this.firstPick.el.classList.add('hidden');
                secondPick.el.classList.add('hidden');
                this.firstPick = null;
                this.lockBoard = false;
            }, 1500);
        }
    }
}

export function engineMathMemory(container, isDemo, params) {
    const game = new MathMemory(container, isDemo, params, 'math-memory');
    game.start();
}
