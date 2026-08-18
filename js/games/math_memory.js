import { regTimeout, regInterval } from '../core/timers.js';
import { BaseGame } from '../core/BaseGame.js';
import { createDemoGate, dureeDemo } from '../core/demoPointer.js';
import { generateMultFact } from '../core/generators.js';
import { getWeakTables } from '../core/stats.js';
import { meilleuresColonnes, mesurerCarte } from './memoryLayout.js';

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
                    justify-content: safe center;
                    background: var(--bg-app);
                    /* Marge du bas renforcée : le plateau remplit la hauteur,
                       et sans elle la dernière rangée passait sous la barre
                       basse de Safari (ou sous la palette de débogage). */
                    padding: clamp(6px, 2vmin, 20px);
                    padding-bottom: calc(clamp(6px, 2vmin, 20px) + env(safe-area-inset-bottom, 0px) + 14px);
                    box-sizing: border-box;
                    overflow: hidden;
                }
                /* Rangées souples plutôt que grille rigide : une dernière
                   rangée incomplète se retrouve CENTRÉE, ce qui la fait
                   paraître voulue au lieu d'oubliée à gauche. Largeur du
                   plateau, taille des cartes et du texte sont posées par
                   disposer() d'après le cadre réellement mesuré. */
                .memory-grid {
                    display: flex;
                    flex-wrap: wrap;
                    gap: var(--mem-gap, 10px);
                    justify-content: center;
                    align-content: center;
                    max-width: var(--mem-largeur-plateau, 100%);
                }
                .memory-card {
                    background: var(--bg-panel);
                    border: 2px solid var(--border);
                    border-radius: 12px;
                    flex: 0 0 auto;
                    width: var(--mem-w, 80px);
                    height: var(--mem-h, 64px);
                    box-sizing: border-box;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: var(--mem-font, 1.5rem);
                    font-weight: bold;
                    white-space: nowrap;   /* « 8 × 6 » ne se coupe jamais en deux */
                    color: var(--text-main);
                    cursor: pointer;
                    transition: transform 0.3s, background 0.3s, opacity 0.3s;
                    user-select: none;
                    -webkit-user-select: none;
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
                    transform: scale(0.4);
                    pointer-events: none;
                }
                .memory-particle {
                    position: fixed;
                    width: 10px; height: 10px;
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 10005;
                    animation: memoryBurst .7s ease-out forwards;
                }
                @keyframes memoryBurst {
                    0%   { opacity: 1; transform: translate(0, 0) scale(1); }
                    100% { opacity: 0; transform: translate(var(--px), var(--py)) scale(.3); }
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
            <div class="memory-arena" id="memory-arena">
                <div class="memory-grid" id="memory-grid"></div>
            </div>
        `;
        this.gridEl = this.container.querySelector('#memory-grid');
        this.arenaEl = this.container.querySelector('#memory-arena');

        // Rotation de l'appareil, ouverture du clavier, redimensionnement du
        // cadre d'aperçu : la disposition se recalcule à chaque fois.
        this.observer = new ResizeObserver(() => this.disposer());
        this.observer.observe(this.arenaEl);
    }

    /** Pose largeur du plateau, taille des cartes et du texte d'après le cadre réel. */
    disposer() {
        if (!this.gridEl || !this.arenaEl || !this.cards || !this.cards.length) return;
        const n = this.cards.length;
        const style = getComputedStyle(this.arenaEl);
        const largeur = this.arenaEl.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        const hauteur = this.arenaEl.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
        if (largeur <= 0 || hauteur <= 0) return;

        // Sur un cadre étroit (téléphone en portrait), un écart généreux mange
        // la place utile : il se resserre avec la largeur.
        const gap = Math.max(5, Math.min(14, largeur / 40));

        const cols = meilleuresColonnes(n, largeur, hauteur, gap);
        const { largeurCarte, hauteurCarte } = mesurerCarte(n, cols, largeur, hauteur, gap);

        this.gridEl.style.setProperty('--mem-gap', `${gap.toFixed(1)}px`);
        this.gridEl.style.setProperty('--mem-w', `${largeurCarte.toFixed(1)}px`);
        this.gridEl.style.setProperty('--mem-h', `${hauteurCarte.toFixed(1)}px`);
        // Le plateau est bridé à la largeur d'une rangée pleine : c'est ce qui
        // fait passer les cartes à la ligne au bon endroit, la dernière rangée
        // se centrant alors d'elle-même.
        this.gridEl.style.setProperty('--mem-largeur-plateau',
            `${(largeurCarte * cols + gap * (cols - 1)).toFixed(1)}px`);
        // Le texte suit la carte : « 10 × 10 » fait sept caractères, on vise
        // donc un peu moins du quart de la largeur, borné pour rester lisible.
        const police = Math.max(11, Math.min(30, Math.min(largeurCarte * 0.23, hauteurCarte * 0.42)));
        this.gridEl.style.setProperty('--mem-font', `${police.toFixed(1)}px`);
    }

    startGameLoop() {
        this.pairsFound = 0;
        this.targetPairs = Math.min(this.params.nbQuestions || 6, 12); // Max 12 pairs (24 cards) for space

        this.cards = [];
        this.firstPick = null;
        this.lockBoard = false;
        
        const weakTables = getWeakTables();
        const pairsData = [];
        // Jamais deux paires avec le MÊME résultat sur un plateau : « 3 × 4 »
        // retourné avec le 12 de « 2 × 6 » serait mathématiquement juste mais
        // compté faux — une erreur que l'élève ne peut pas comprendre.
        const answersUsed = new Set();
        for(let i = 0; i < this.targetPairs; i++) {
            let fact = null;
            for (let tries = 0; tries < 60; tries++) {
                const candidate = generateMultFact(this.params.tables, weakTables);
                if (!answersUsed.has(candidate.ans)) { fact = candidate; break; }
            }
            // Plus de résultat inédit disponible (tables trop restreintes) :
            // on arrête le plateau ici plutôt que d'introduire un doublon.
            if (!fact) break;
            answersUsed.add(fact.ans);
            const { t, m, ans, concept } = fact;
            const uid = i;

            pairsData.push({ type: 'question', text: `${t} × ${m}`, uid, t, m, ans, concept });
            pairsData.push({ type: 'answer', text: `${ans}`, uid, t, m, ans, concept });
        }
        this.targetPairs = pairsData.length / 2;
        
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

        this.disposer();
    }

    destroy() {

        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        if (this.observer) { this.observer.disconnect(); this.observer = null; }
        super.destroy();
    }

    runDemoSequence() {
        this.demoGate = createDemoGate(this.container);
        this.startGameLoop();

        let step = 0;
        const tour = () => {
            if (!this.isRunning || this.lockBoard || this.demoGate.paused) return;

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
            regTimeout(() => { if (this.isRunning) c2.el.click(); }, dureeDemo(950));
            step++;
        };

        // Un premier retournement tout de suite : le plateau démarre
        // entièrement face cachée, et attendre le premier tour d'intervalle
        // laissait trois secondes de cartes muettes — assez pour que la
        // vignette du catalogue ne montre jamais que des dos de cartes.
        regTimeout(tour, dureeDemo(350));
        regInterval(tour, dureeDemo(3600));
    }

    /**
     * Éclat de particules à l'endroit où la paire disparaît. En `position:
     * fixed` sur <body> : les cartes s'effacent, les particules leur survivent
     * le temps de l'animation, puis se retirent elles-mêmes.
     */
    spawnParticles(cardEl) {
        const rect = cardEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const colors = ['#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
        for (let i = 0; i < 14; i++) {
            const p = document.createElement('div');
            p.className = 'memory-particle';
            const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.5;
            const dist = 40 + Math.random() * 55;
            p.style.left = `${cx}px`;
            p.style.top = `${cy}px`;
            p.style.background = colors[i % colors.length];
            p.style.setProperty('--px', `${Math.cos(angle) * dist}px`);
            p.style.setProperty('--py', `${Math.sin(angle) * dist}px`);
            document.body.appendChild(p);
            regTimeout(() => p.remove(), 750);
        }
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
                this.spawnParticles(this.firstPick.el);
                this.spawnParticles(secondPick.el);
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
    return game;
}
