import { regTimeout, regInterval } from '../core/timers.js';
import { BaseGame } from '../core/BaseGame.js';
import { generateMultFact, multDistractors } from '../core/generators.js';
import { getWeakTables } from '../core/stats.js';

class ArcadeShooter extends BaseGame {
    render() {
        this.container.innerHTML = `
            <style>
                .shooter-arena {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(to bottom, #0f172a, #1e293b);
                    overflow: hidden;
                    border-radius: 12px;
                    color: white;
                    touch-action: none; /* Prevent scrolling while playing */
                    cursor: crosshair;
                }
                .meteor {
                    position: absolute;
                    top: -60px;
                    width: 60px;
                    height: 60px;
                    background: radial-gradient(circle at 30% 30%, #94a3b8, #475569);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 1.2rem;
                    box-shadow: inset -5px -5px 10px rgba(0,0,0,0.5), 0 0 10px rgba(0,0,0,0.5);
                    user-select: none;
                }
                .meteor.demo-target {
                    box-shadow: 0 0 15px 5px var(--primary);
                }
                .spaceship {
                    position: absolute;
                    bottom: 20px;
                    left: 50%;
                    width: 60px;
                    height: 60px;
                    transform: translateX(-50%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10;
                    transition: transform 0.1s;
                }
                .spaceship svg {
                    width: 100%;
                    height: 100%;
                    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
                }
                .question-display {
                    position: absolute;
                    bottom: 85px;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 1.5rem;
                    font-weight: bold;
                    color: #fff;
                    background: rgba(0,0,0,0.5);
                    padding: 4px 12px;
                    border-radius: 20px;
                    border: 1px solid rgba(255,255,255,0.2);
                    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
                    pointer-events: none;
                    white-space: nowrap;
                    z-index: 11;
                }
                .laser {
                    position: absolute;
                    width: 4px;
                    height: 20px;
                    background: #22d3ee;
                    box-shadow: 0 0 10px #22d3ee, 0 0 20px #22d3ee;
                    border-radius: 2px;
                    z-index: 5;
                    transform: translateX(-50%);
                }
                .mobile-fire-btn {
                    position: absolute;
                    bottom: 20px;
                    right: 20px;
                    width: 70px;
                    height: 70px;
                    background: rgba(239, 68, 68, 0.7);
                    border: 3px solid rgba(255, 255, 255, 0.4);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 1.2rem;
                    z-index: 20;
                    user-select: none;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.5);
                    backdrop-filter: blur(5px);
                }
                .mobile-fire-btn:active {
                    transform: scale(0.9);
                    background: rgba(239, 68, 68, 0.9);
                }
                @keyframes explode {
                    0% { transform: scale(1); opacity: 1; filter: brightness(1); }
                    50% { transform: scale(1.5); opacity: 0.8; filter: brightness(2) hue-rotate(45deg); background: #ef4444; }
                    100% { transform: scale(2); opacity: 0; filter: brightness(3); }
                }
            </style>
            <div class="shooter-arena" id="shooter-arena">
                <div class="question-display" id="shooter-question">?</div>
                <div class="spaceship" id="spaceship">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2L2 22l10-4 10 4L12 2z" fill="rgba(34, 211, 238, 0.2)"/>
                    </svg>
                </div>
                <div class="mobile-fire-btn" id="mobile-fire-btn">TIR</div>
            </div>
        `;
        this.arena = this.container.querySelector('#shooter-arena');
        this.questionDisplay = this.container.querySelector('#shooter-question');
        this.spaceship = this.container.querySelector('#spaceship');
        this.fireBtn = this.container.querySelector('#mobile-fire-btn');
        
        this.meteors = [];
        this.lasers = [];
        this.fallSpeed = this.params.difficulty === 'hard' ? 3 : (this.params.difficulty === 'easy' ? 1 : 2);
        this.laserSpeed = 10;
        
        this.shipX = this.arena.offsetWidth / 2;
        this.keys = { left: false, right: false };
        
        this.bindControls();
    }
    
    destroy() {
        super.destroy();
        this.unbindControls();
    }

    bindControls() {
        this.handleKeyDown = (e) => {
            if(e.code === 'ArrowLeft') this.keys.left = true;
            if(e.code === 'ArrowRight') this.keys.right = true;
            if(e.code === 'Space') {
                e.preventDefault();
                this.fireLaser();
            }
        };
        this.handleKeyUp = (e) => {
            if(e.code === 'ArrowLeft') this.keys.left = false;
            if(e.code === 'ArrowRight') this.keys.right = false;
        };
        
        this.handlePointerMove = (e) => {
            if (e.target === this.fireBtn) return; // ignore movement on fire button
            e.preventDefault(); // prevent scrolling on touch
            const rect = this.arena.getBoundingClientRect();
            // Get clientX from either touch or mouse. 
            // For touches, find the one that is NOT on the fire button
            let clientX = e.clientX;
            if (e.touches) {
                for (let i = 0; i < e.touches.length; i++) {
                    if (e.touches[i].target !== this.fireBtn) {
                        clientX = e.touches[i].clientX;
                        break;
                    }
                }
            }
            if (clientX === undefined) return;
            
            let x = clientX - rect.left;
            this.setShipX(x);
        };
        
        this.handlePointerDown = (e) => {
            if (e.target === this.fireBtn) return;
            e.preventDefault();
            this.handlePointerMove(e);
            this.fireLaser();
        };
        
        this.handleFireBtn = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.fireLaser();
        };

        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        
        this.arena.addEventListener('mousemove', this.handlePointerMove);
        this.arena.addEventListener('touchmove', this.handlePointerMove, { passive: false });
        
        this.arena.addEventListener('mousedown', this.handlePointerDown);
        this.arena.addEventListener('touchstart', this.handlePointerDown, { passive: false });
        
        this.fireBtn.addEventListener('mousedown', this.handleFireBtn);
        this.fireBtn.addEventListener('touchstart', this.handleFireBtn, { passive: false });
    }

    unbindControls() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        this.arena.removeEventListener('mousemove', this.handlePointerMove);
        this.arena.removeEventListener('touchmove', this.handlePointerMove);
        this.arena.removeEventListener('mousedown', this.handlePointerDown);
        this.arena.removeEventListener('touchstart', this.handlePointerDown);
        this.fireBtn.removeEventListener('mousedown', this.handleFireBtn);
        this.fireBtn.removeEventListener('touchstart', this.handleFireBtn);
    }

    setShipX(x) {
        const halfWidth = this.spaceship.offsetWidth / 2;
        const maxW = this.arena.offsetWidth;
        if (x < halfWidth) x = halfWidth;
        if (x > maxW - halfWidth) x = maxW - halfWidth;
        this.shipX = x;
        this.spaceship.style.left = this.shipX + 'px';
        this.questionDisplay.style.left = this.shipX + 'px';
    }

    fireLaser() {
        if (!this.isRunning || this.isDemo) return;
        
        // Prevent spamming
        const now = Date.now();
        if (this.lastFire && now - this.lastFire < 300) return;
        this.lastFire = now;
        
        const laserEl = document.createElement('div');
        laserEl.className = 'laser';
        
        // Position laser at top of spaceship
        const shipRect = this.spaceship.getBoundingClientRect();
        const arenaRect = this.arena.getBoundingClientRect();
        
        const startY = arenaRect.bottom - shipRect.top; // from bottom
        
        laserEl.style.left = this.shipX + 'px';
        laserEl.style.bottom = startY + 'px';
        
        this.arena.appendChild(laserEl);
        
        this.lasers.push({
            el: laserEl,
            x: this.shipX,
            y: startY,
            destroyed: false
        });
    }

    startGameLoop() {
        this.generateQuestion();
        this.spawnMeteors();
        
        // Main Gameloop
        regInterval(() => {
            if (!this.isRunning) return;
            
            // Keyboard Movement
            if (this.keys.left) this.setShipX(this.shipX - 7);
            if (this.keys.right) this.setShipX(this.shipX + 7);
            
            // Move Lasers (up)
            this.lasers.forEach(laser => {
                if(laser.destroyed) return;
                laser.y += this.laserSpeed;
                laser.el.style.bottom = laser.y + 'px';
                
                if (laser.y > this.arena.offsetHeight) {
                    laser.destroyed = true;
                    laser.el.remove();
                }
            });
            
            // Move Meteors (down)
            this.meteors.forEach(m => {
                if (m.destroyed) return;
                m.y += this.fallSpeed;
                m.el.style.top = m.y + 'px';
                
                // If hits bottom
                if (m.y > this.arena.offsetHeight) {
                    m.destroyed = true;
                    m.el.remove();
                    if (m.isCorrect) {
                        this.triggerError('timeout');
                    }
                }
            });
            
            // Collision Detection
            this.checkCollisions();
            
            // Clean up arrays
            this.meteors = this.meteors.filter(m => !m.destroyed);
            this.lasers = this.lasers.filter(l => !l.destroyed);
            
        }, 20);
    }
    
    checkCollisions() {
        for(let l of this.lasers) {
            if (l.destroyed) continue;
            // Get laser rect relative to arena
            const laserTop = this.arena.offsetHeight - l.y - 20; // 20 is height
            const laserBottom = this.arena.offsetHeight - l.y;
            const laserLeft = l.x - 2;
            const laserRight = l.x + 2;
            
            for(let m of this.meteors) {
                if (m.destroyed) continue;
                
                const meteorTop = m.y;
                const meteorBottom = m.y + 60;
                const meteorLeft = m.x - 30; // 60px wide, x is center usually but here left is x
                const meteorRight = m.x + 30;
                
                // Note: m.x is left position, so m.x to m.x+60
                const mLeft = m.x;
                const mRight = m.x + 60;
                
                if (laserTop < meteorBottom && laserBottom > meteorTop && laserRight > mLeft && laserLeft < mRight) {
                    // HIT!
                    l.destroyed = true;
                    l.el.remove();
                    this.hitMeteor(m);
                    break; 
                }
            }
        }
    }

    hitMeteor(meteorObj) {
        meteorObj.destroyed = true;

        if (meteorObj.isCorrect) {
            meteorObj.el.style.animation = 'explode 0.4s forwards';
            this.onCorrectAnswer(null, this.currentConcept);
            
            // Destroy all other meteors visually
            this.meteors.forEach(m => {
                if(!m.destroyed && m.el) {
                    m.el.style.opacity = '0';
                    m.destroyed = true;
                }
            });
            
            regTimeout(() => {
                if(this.isRunning) {
                    this.generateQuestion();
                    this.spawnMeteors();
                }
            }, 1000);
            
        } else {
            meteorObj.el.style.background = '#ef4444'; // Red flash
            this.triggerError(meteorObj.ans);
        }
    }
    
    triggerError(inputVal) {
        this.onWrongAnswer(null, {
            input: inputVal,
            expected: this.currentAns,
            questionText: `${this.currentT} × ${this.currentM}`,
            t: this.currentT,
            m: this.currentM,
            ans: this.currentAns,
            concept: this.currentConcept
        });
        this.arena.style.boxShadow = 'inset 0 0 50px rgba(239, 68, 68, 0.5)';
        regTimeout(() => { this.arena.style.boxShadow = 'none'; }, 300);
        this.generateQuestion();
        this.spawnMeteors();
    }

    runDemoSequence() {
        this.generateQuestion();
        this.spawnMeteors();
        
        let demoTicks = 0;
        regInterval(() => {
            if (!this.isRunning) return;
            demoTicks++;
            
            this.meteors.forEach(m => {
                if (m.destroyed) return;
                m.y += this.fallSpeed;
                m.el.style.top = m.y + 'px';
            });
            
            // Auto click correct after some time
            if (demoTicks === 100) { // 2 seconds
                const correctMeteor = this.meteors.find(m => m.isCorrect);
                if (correctMeteor) {
                    correctMeteor.el.classList.add('demo-target');
                    // Move ship to meteor X
                    this.setShipX(correctMeteor.x + 30);
                    
                    regTimeout(() => {
                        if(!this.isRunning) return;
                        this.fireLaser();
                        // Fake a collision
                        regTimeout(() => {
                            this.hitMeteor(correctMeteor);
                            demoTicks = 0; // restart
                        }, 200);
                    }, 500);
                }
            }
        }, 20);
    }

    generateQuestion() {
        const { t, m, ans, concept } = generateMultFact(this.params.tables, getWeakTables());
        this.currentT = t;
        this.currentM = m;
        this.currentAns = ans;
        this.currentConcept = concept;
        this.questionDisplay.innerHTML = `${this.currentT} &times; ${this.currentM} = ?`;
    }

    spawnMeteors() {
        // Clear old
        this.meteors.forEach(m => { if(m.el) m.el.remove(); });
        this.meteors = [];
        this.lasers.forEach(l => { if(l.el) l.el.remove(); });
        this.lasers = [];

        const answers = multDistractors(this.currentT, this.currentAns, 2);

        const arenaWidth = this.arena.offsetWidth;
        const margin = 20;
        
        answers.forEach((ans, i) => {
            const el = document.createElement('div');
            el.className = 'meteor';
            el.textContent = ans;
            
            // Spread them across width
            const sectionWidth = (arenaWidth - margin*2) / 3;
            // X is the left edge of meteor
            let x = margin + (i * sectionWidth) + (Math.random() * (sectionWidth-60));
            // Stagger Y
            let y = -60 - (Math.random() * 150);
            
            el.style.left = x + 'px';
            el.style.top = y + 'px';
            
            this.arena.appendChild(el);
            
            this.meteors.push({ el, ans, isCorrect: ans === this.currentAns, destroyed: false, x, y });
        });
    }
}

export function engineArcadeShooter(container, isDemo, params) {
    const game = new ArcadeShooter(container, isDemo, params, 'arcade-shooter');
    game.start();
}
