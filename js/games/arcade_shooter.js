// Météorites Mathématiques.
//
// Logique du jeu, revue : le vaisseau démarre au MILIEU de l'arène et suit la
// souris ou le doigt. Des météorites-réponses tombent du haut ; l'élève TIRE
// sur toutes les mauvaises réponses (chaque destruction rapporte un bonus) et
// ACCUEILLE la bonne avec son vaisseau — c'est le contact qui valide.
//
// Ce renversement change ce que le jeu travaille : détruire les mauvaises
// réponses demande de les reconnaître une à une (élimination), et attraper la
// bonne engage un choix positif — on ne gagne plus en mitraillant tout.
//
//   - tirer sur la bonne réponse est une ERREUR (« il fallait l'accueillir ») ;
//   - toucher une mauvaise réponse avec le vaisseau est une erreur ;
//   - laisser la bonne réponse s'échapper en bas est une erreur.

import { regTimeout, regInterval } from '../core/timers.js';
import { BaseGame } from '../core/BaseGame.js';
import { generateMultFact, multDistractors } from '../core/generators.js';
import { getWeakTables } from '../core/stats.js';

const METEOR_SIZE = 60;
const SHIP_SIZE = 60;

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
                    user-select: none;
                    -webkit-user-select: none;
                }
                .meteor {
                    position: absolute;
                    top: -60px;
                    width: ${METEOR_SIZE}px;
                    height: ${METEOR_SIZE}px;
                    background: radial-gradient(circle at 30% 30%, #94a3b8, #475569);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 1.2rem;
                    box-shadow: inset -5px -5px 10px rgba(0,0,0,0.5), 0 0 10px rgba(0,0,0,0.5);
                    user-select: none;
                    pointer-events: none;
                }
                .meteor.demo-target {
                    box-shadow: 0 0 15px 5px var(--primary);
                }
                .spaceship {
                    position: absolute;
                    width: ${SHIP_SIZE}px;
                    height: ${SHIP_SIZE}px;
                    transform: translate(-50%, -50%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10;
                    pointer-events: none;
                }
                .spaceship svg {
                    width: 100%;
                    height: 100%;
                    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
                }
                .spaceship.catching svg { filter: drop-shadow(0 0 14px #22c55e); }
                .shooter-question {
                    position: absolute;
                    transform: translate(-50%, -100%);
                    font-size: 1.4rem;
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
                .shooter-hud {
                    position: absolute;
                    top: 12px;
                    right: 16px;
                    z-index: 12;
                    font-weight: bold;
                    font-size: 1rem;
                    background: rgba(0,0,0,0.4);
                    padding: 5px 14px;
                    border-radius: 16px;
                    border: 1px solid rgba(255,255,255,0.15);
                    pointer-events: none;
                }
                .shooter-help {
                    position: absolute;
                    top: 12px;
                    left: 16px;
                    right: 110px;
                    z-index: 12;
                    font-size: 0.82rem;
                    color: #cbd5e1;
                    background: rgba(0,0,0,0.35);
                    padding: 5px 12px;
                    border-radius: 14px;
                    pointer-events: none;
                    transition: opacity 1s;
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
                    pointer-events: none;
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
                @keyframes absorb {
                    0% { transform: scale(1); opacity: 1; box-shadow: 0 0 20px #22c55e; }
                    100% { transform: scale(0.1); opacity: 0; box-shadow: 0 0 40px #22c55e; }
                }
                .shooter-float {
                    position: absolute;
                    transform: translateX(-50%);
                    font-weight: 900;
                    font-size: 1.2rem;
                    pointer-events: none;
                    z-index: 15;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.6);
                    animation: shooterFloat 0.9s ease-out forwards;
                }
                @keyframes shooterFloat {
                    0% { opacity: 1; margin-top: 0; }
                    100% { opacity: 0; margin-top: -46px; }
                }
            </style>
            <div class="shooter-arena" id="shooter-arena">
                <div class="shooter-help" id="shooter-help">🔫 Tire sur les MAUVAISES réponses — 🛸 attrape la BONNE avec ton vaisseau !</div>
                <div class="shooter-hud">⭐ <span id="shooter-score">0</span></div>
                <div class="shooter-question" id="shooter-question">?</div>
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
        this.scoreEl = this.container.querySelector('#shooter-score');

        this.meteors = [];
        this.lasers = [];
        this.fallSpeed = this.params.difficulty === 'hard' ? 2.4 : (this.params.difficulty === 'easy' ? 1 : 1.6);
        this.laserSpeed = 10;
        this.score = 0;
        this.wrongDestroyed = 0;   // bonus de la vague en cours
        this.roundOver = false;    // vague résolue : on attend la suivante

        // Le vaisseau démarre au MILIEU de l'arène.
        this.shipX = (this.arena.offsetWidth || 600) / 2;
        this.shipY = (this.arena.offsetHeight || 400) / 2;
        this.applyShipPos();
        this.keys = { left: false, right: false, up: false, down: false };

        this.bindControls();

        // Le rappel de consigne s'efface tout seul une fois la partie lancée.
        regTimeout(() => {
            const help = this.container.querySelector('#shooter-help');
            if (help) help.style.opacity = '0';
        }, 6000);
    }

    destroy() {
        super.destroy();
        this.unbindControls();
    }

    bindControls() {
        this.handleKeyDown = (e) => {
            if(e.code === 'ArrowLeft') this.keys.left = true;
            if(e.code === 'ArrowRight') this.keys.right = true;
            if(e.code === 'ArrowUp') { e.preventDefault(); this.keys.up = true; }
            if(e.code === 'ArrowDown') { e.preventDefault(); this.keys.down = true; }
            if(e.code === 'Space') {
                e.preventDefault();
                this.fireLaser();
            }
        };
        this.handleKeyUp = (e) => {
            if(e.code === 'ArrowLeft') this.keys.left = false;
            if(e.code === 'ArrowRight') this.keys.right = false;
            if(e.code === 'ArrowUp') this.keys.up = false;
            if(e.code === 'ArrowDown') this.keys.down = false;
        };

        // Le vaisseau SUIT le pointeur, en X et en Y.
        this.handlePointerMove = (e) => {
            if (e.target === this.fireBtn) return; // ignore movement on fire button
            if (e.cancelable) e.preventDefault(); // prevent scrolling on touch
            const rect = this.arena.getBoundingClientRect();
            let clientX = e.clientX, clientY = e.clientY;
            let isTouch = false;
            if (e.touches) {
                for (let i = 0; i < e.touches.length; i++) {
                    if (e.touches[i].target !== this.fireBtn) {
                        clientX = e.touches[i].clientX;
                        clientY = e.touches[i].clientY;
                        isTouch = true;
                        break;
                    }
                }
            }
            if (clientX === undefined) return;

            // Au doigt, le vaisseau vole un peu AU-DESSUS du point de contact :
            // sinon il est caché sous la main qui le pilote.
            this.setShipPos(clientX - rect.left, clientY - rect.top - (isTouch ? 55 : 0));
        };

        this.handlePointerDown = (e) => {
            if (e.target === this.fireBtn) return;
            if (e.cancelable) e.preventDefault();
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

    setShipPos(x, y) {
        const half = SHIP_SIZE / 2;
        const w = this.arena.offsetWidth;
        const h = this.arena.offsetHeight;
        this.shipX = Math.max(half, Math.min(x, w - half));
        this.shipY = Math.max(half + 40, Math.min(y, h - half));
        this.applyShipPos();
    }

    applyShipPos() {
        this.spaceship.style.left = this.shipX + 'px';
        this.spaceship.style.top = this.shipY + 'px';
        // L'énoncé accompagne le vaisseau : la question reste sous les yeux,
        // là où se joue la décision.
        this.questionDisplay.style.left = this.shipX + 'px';
        this.questionDisplay.style.top = (this.shipY - SHIP_SIZE / 2 - 6) + 'px';
    }

    fireLaser() {
        if (!this.isRunning || this.isDemo && !this.demoCanFire) return;
        if (this.roundOver) return;

        // Prevent spamming
        const now = Date.now();
        if (this.lastFire && now - this.lastFire < 300) return;
        this.lastFire = now;

        const laserEl = document.createElement('div');
        laserEl.className = 'laser';
        const y = this.shipY - SHIP_SIZE / 2 - 20;
        laserEl.style.left = this.shipX + 'px';
        laserEl.style.top = y + 'px';
        this.arena.appendChild(laserEl);

        this.lasers.push({ el: laserEl, x: this.shipX, y, destroyed: false });
    }

    startGameLoop() {
        this.newRound();

        // Main Gameloop
        regInterval(() => {
            if (!this.isRunning) return;

            // Keyboard Movement
            const K = 7;
            if (this.keys.left || this.keys.right || this.keys.up || this.keys.down) {
                this.setShipPos(
                    this.shipX + (this.keys.right ? K : 0) - (this.keys.left ? K : 0),
                    this.shipY + (this.keys.down ? K : 0) - (this.keys.up ? K : 0)
                );
            }

            this.tickPhysics();
        }, 20);
    }

    /** Physique commune au jeu réel et à la démonstration. */
    tickPhysics() {
        // Move Lasers (up)
        this.lasers.forEach(laser => {
            if (laser.destroyed) return;
            laser.y -= this.laserSpeed;
            laser.el.style.top = laser.y + 'px';
            if (laser.y < -20) {
                laser.destroyed = true;
                laser.el.remove();
            }
        });

        // Move Meteors (down)
        this.meteors.forEach(m => {
            if (m.destroyed) return;
            m.y += this.fallSpeed;
            m.el.style.top = m.y + 'px';

            if (m.y > this.arena.offsetHeight) {
                m.destroyed = true;
                m.el.remove();
                // Seule la bonne réponse qui s'échappe est une faute : une
                // mauvaise réponse qu'on laisse passer ne coûte que son bonus.
                if (m.isCorrect && !this.roundOver) {
                    this.resolveRound(() => this.triggerError('(échappée)',
                        'La bonne réponse s\'est échappée ! Il fallait l\'attraper avec le vaisseau.'));
                }
            }
        });

        this.checkLaserHits();
        this.checkShipCatches();

        // Clean up arrays
        this.meteors = this.meteors.filter(m => !m.destroyed);
        this.lasers = this.lasers.filter(l => !l.destroyed);
    }

    checkLaserHits() {
        for (let l of this.lasers) {
            if (l.destroyed) continue;
            for (let m of this.meteors) {
                if (m.destroyed) continue;
                const overlapX = l.x + 2 > m.x && l.x - 2 < m.x + METEOR_SIZE;
                const overlapY = l.y < m.y + METEOR_SIZE && l.y + 20 > m.y;
                if (overlapX && overlapY) {
                    l.destroyed = true;
                    l.el.remove();
                    this.hitMeteor(m);
                    break;
                }
            }
        }
    }

    /** Contact vaisseau-météorite : accueil de la bonne, collision sinon. */
    checkShipCatches() {
        if (this.roundOver) return;
        for (let m of this.meteors) {
            if (m.destroyed) continue;
            const mx = m.x + METEOR_SIZE / 2;
            const my = m.y + METEOR_SIZE / 2;
            const dist = Math.hypot(mx - this.shipX, my - this.shipY);
            if (dist > (METEOR_SIZE + SHIP_SIZE) / 2 - 8) continue;

            m.destroyed = true;
            if (m.isCorrect) {
                this.catchCorrect(m);
            } else {
                m.el.style.animation = 'explode 0.4s forwards';
                regTimeout(() => m.el.remove(), 400);
                this.resolveRound(() => this.triggerError(m.ans,
                    `Tu as foncé dans ${m.ans}… La bonne réponse était ${this.currentAns}.`));
            }
            return;
        }
    }

    hitMeteor(meteorObj) {
        if (meteorObj.destroyed) return;
        meteorObj.destroyed = true;

        if (meteorObj.isCorrect) {
            // Tirer sur la bonne réponse est l'erreur emblématique du nouveau
            // jeu : on détruit ce qu'on devait accueillir.
            meteorObj.el.style.animation = 'explode 0.4s forwards';
            regTimeout(() => meteorObj.el.remove(), 400);
            if (!this.roundOver) {
                this.resolveRound(() => this.triggerError(`tir sur ${meteorObj.ans}`,
                    `C'était la bonne réponse ! Il fallait l'accueillir avec le vaisseau, pas la détruire.`));
            }
        } else {
            // Mauvaise réponse détruite : c'est le but — bonus.
            meteorObj.el.style.animation = 'explode 0.4s forwards';
            regTimeout(() => meteorObj.el.remove(), 400);
            this.wrongDestroyed++;
            this.addFloat(meteorObj.x + METEOR_SIZE / 2, meteorObj.y, '+5', '#f59e0b');
            this.setScore(this.score + 5);
        }
    }

    /** La bonne réponse rejoint le vaisseau : c'est la validation. */
    catchCorrect(meteorObj) {
        meteorObj.el.style.animation = 'absorb 0.35s forwards';
        regTimeout(() => meteorObj.el.remove(), 350);
        this.spaceship.classList.add('catching');
        regTimeout(() => this.spaceship.classList.remove('catching'), 600);

        const pts = 10 + this.wrongDestroyed * 5;
        this.addFloat(this.shipX, this.shipY - SHIP_SIZE, `+${pts}`, '#22c55e');
        this.setScore(this.score + 10);

        this.resolveRound(() => {
            if (!this.isDemo) {
                this.onCorrectAnswer(null, this.currentConcept, {
                    points: pts,
                    questionText: `${this.currentT} × ${this.currentM}`,
                    given: this.currentAns,
                    expected: this.currentAns
                });
            }
        });
    }

    /**
     * Clôt la vague en cours : applique l'effet (réussite ou erreur), efface
     * ce qui reste à l'écran et relance une vague après un temps de lecture.
     */
    resolveRound(effet) {
        this.roundOver = true;
        effet();
        this.meteors.forEach(m => {
            if (!m.destroyed && m.el) {
                m.el.style.opacity = '0';
                m.destroyed = true;
                regTimeout(() => m.el.remove(), 300);
            }
        });
        regTimeout(() => {
            if (this.isRunning) this.newRound();
        }, 1200);
    }

    triggerError(inputVal, message) {
        if (!this.isDemo) {
            this.onWrongAnswer(null, {
                input: inputVal,
                expected: this.currentAns,
                questionText: `${this.currentT} × ${this.currentM}`,
                t: this.currentT,
                m: this.currentM,
                ans: this.currentAns,
                concept: this.currentConcept,
                customMessage: message
            });
        }
        this.arena.style.boxShadow = 'inset 0 0 50px rgba(239, 68, 68, 0.5)';
        regTimeout(() => { this.arena.style.boxShadow = 'none'; }, 300);
    }

    setScore(v) {
        this.score = v;
        if (this.scoreEl) this.scoreEl.textContent = this.score;
    }

    addFloat(x, y, texte, couleur) {
        const el = document.createElement('div');
        el.className = 'shooter-float';
        el.textContent = texte;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.color = couleur;
        this.arena.appendChild(el);
        regTimeout(() => el.remove(), 900);
    }

    newRound() {
        this.wrongDestroyed = 0;
        this.roundOver = false;
        this.generateQuestion();
        this.spawnMeteors();
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
            const sectionWidth = (arenaWidth - margin*2) / answers.length;
            // X is the left edge of meteor
            let x = margin + (i * sectionWidth) + (Math.random() * Math.max(0, sectionWidth - METEOR_SIZE));
            // Stagger Y
            let y = -METEOR_SIZE - (Math.random() * 150);

            el.style.left = x + 'px';
            el.style.top = y + 'px';

            this.arena.appendChild(el);

            this.meteors.push({ el, ans, isCorrect: ans === this.currentAns, destroyed: false, x, y });
        });
    }

    /**
     * Démonstration : le robot montre les DEUX gestes du jeu — il se place
     * sous une mauvaise réponse et la détruit, puis glisse sous la bonne et
     * l'accueille avec le vaisseau.
     */
    runDemoSequence() {
        this.newRound();
        this.demoCanFire = false;
        let phase = 'chasse';   // 'chasse' (tirer les mauvaises) puis 'accueil'

        regInterval(() => {
            if (!this.isRunning) return;
            this.tickPhysics();
            if (this.roundOver) return;

            const vivantes = this.meteors.filter(m => !m.destroyed);
            const bonne = vivantes.find(m => m.isCorrect);
            const mauvaise = vivantes.find(m => !m.isCorrect);
            if (!bonne) return;

            // Nouvelle vague (aucun bonus encaissé) : on repart en chasse.
            if (phase === 'accueil' && mauvaise && this.wrongDestroyed === 0) phase = 'chasse';
            if (phase === 'chasse' && !mauvaise) phase = 'accueil';
            const cible = phase === 'chasse' ? mauvaise : bonne;
            if (!cible) return;
            if (phase === 'accueil') cible.el.classList.add('demo-target');

            // Le vaisseau glisse vers sa cible ; il reste SOUS la mauvaise
            // réponse pour tirer, et va au CONTACT de la bonne.
            const cx = cible.x + METEOR_SIZE / 2;
            const cy = phase === 'chasse'
                ? Math.min(cible.y + 220, this.arena.offsetHeight - 80)
                : cible.y + METEOR_SIZE / 2;
            this.setShipPos(
                this.shipX + (cx - this.shipX) * 0.12,
                this.shipY + (cy - this.shipY) * 0.10
            );

            if (phase === 'chasse' && Math.abs(cx - this.shipX) < 8 && this.shipY > cible.y + METEOR_SIZE) {
                this.demoCanFire = true;
                this.fireLaser();
                this.demoCanFire = false;
            }
        }, 20);
    }
}

export function engineArcadeShooter(container, isDemo, params) {
    const game = new ArcadeShooter(container, isDemo, params, 'arcade-shooter');
    game.start();
    return game;
}
