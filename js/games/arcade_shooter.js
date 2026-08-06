// Météorites Mathématiques — la tourelle.
//
// Troisième vie du jeu : le vaisseau est FIXE AU CENTRE et TOURNE vers le
// doigt ou la souris ; les météorites-réponses arrivent de tous les bords et
// CONVERGENT vers lui. On vise en déplaçant le doigt, on TIRE en tapant sur
// le vaisseau (ou Espace, ou le bouton TIR). Le but : détruire toutes les
// mauvaises réponses — et laisser la bonne arriver jusqu'au vaisseau, qui
// l'accueille : c'est le contact qui valide.
//
//   - tirer sur la bonne réponse est une ERREUR (« il fallait l'accueillir ») ;
//   - laisser une mauvaise réponse toucher le vaisseau est une erreur ;
//   - accueillir la bonne rapporte d'autant plus qu'on a détruit de mauvaises.

import { regTimeout, regInterval } from '../core/timers.js';
import { BaseGame } from '../core/BaseGame.js';
import { generateMultFact, multDistractors } from '../core/generators.js';
import { getWeakTables } from '../core/stats.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';

const METEOR_SIZE = 60;
const SHIP_SIZE = 64;
const ZONE_TIR = 80;          // rayon autour du vaisseau où le tap déclenche le tir

class ArcadeShooter extends BaseGame {
    render() {
        this.container.innerHTML = `
            <style>
                .shooter-arena {
                    position: relative; width: 100%; height: 100%;
                    background: radial-gradient(circle at center, #1e293b 0%, #0f172a 70%);
                    overflow: hidden; border-radius: 12px; color: white;
                    touch-action: none; cursor: crosshair;
                    user-select: none; -webkit-user-select: none;
                }
                .meteor {
                    position: absolute; width: ${METEOR_SIZE}px; height: ${METEOR_SIZE}px;
                    background: radial-gradient(circle at 30% 30%, #94a3b8, #475569);
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: bold; font-size: 1.2rem;
                    box-shadow: inset -5px -5px 10px rgba(0,0,0,0.5), 0 0 10px rgba(0,0,0,0.5);
                    pointer-events: none;
                }
                .meteor.demo-target { box-shadow: 0 0 15px 5px var(--primary); }
                .spaceship {
                    position: absolute; width: ${SHIP_SIZE}px; height: ${SHIP_SIZE}px;
                    transform: translate(-50%, -50%);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 10; pointer-events: none;
                    transition: none;
                }
                .spaceship svg { width: 100%; height: 100%; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5)); }
                .spaceship.catching svg { filter: drop-shadow(0 0 14px #22c55e); }
                .ship-zone {
                    position: absolute; width: ${ZONE_TIR * 2}px; height: ${ZONE_TIR * 2}px;
                    transform: translate(-50%, -50%); border-radius: 50%;
                    border: 2px dashed rgba(34, 211, 238, .25);
                    z-index: 4; pointer-events: none;
                }
                .shooter-question {
                    position: absolute; left: 50%; top: 14px; transform: translateX(-50%);
                    font-size: 1.4rem; font-weight: bold; color: #fff;
                    background: rgba(0,0,0,0.5); padding: 4px 14px; border-radius: 20px;
                    border: 1px solid rgba(255,255,255,0.2); text-shadow: 0 2px 4px rgba(0,0,0,0.5);
                    pointer-events: none; white-space: nowrap; z-index: 11;
                }
                .shooter-hud {
                    position: absolute; top: 12px; right: 16px; z-index: 12;
                    font-weight: bold; font-size: 1rem; background: rgba(0,0,0,0.4);
                    padding: 5px 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.15);
                    pointer-events: none;
                }
                .shooter-help {
                    position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%);
                    max-width: 92%; z-index: 12; font-size: 0.82rem; color: #cbd5e1;
                    background: rgba(0,0,0,0.35); padding: 5px 12px; border-radius: 14px;
                    pointer-events: none; transition: opacity 1s; text-align: center;
                }
                .laser {
                    position: absolute; width: 5px; height: 22px;
                    background: #22d3ee; box-shadow: 0 0 10px #22d3ee, 0 0 20px #22d3ee;
                    border-radius: 2px; z-index: 5;
                    transform-origin: center; pointer-events: none;
                }
                .mobile-fire-btn {
                    position: absolute; bottom: 18px; right: 18px;
                    width: 66px; height: 66px;
                    background: rgba(239, 68, 68, 0.7); border: 3px solid rgba(255, 255, 255, 0.4);
                    border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    color: white; font-weight: bold; font-size: 1.1rem; z-index: 20;
                    user-select: none; box-shadow: 0 4px 10px rgba(0,0,0,0.5); backdrop-filter: blur(5px);
                }
                .mobile-fire-btn:active { transform: scale(0.9); background: rgba(239, 68, 68, 0.9); }
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
                    position: absolute; transform: translateX(-50%);
                    font-weight: 900; font-size: 1.2rem; pointer-events: none; z-index: 15;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.6);
                    animation: shooterFloat 0.9s ease-out forwards;
                }
                @keyframes shooterFloat {
                    0% { opacity: 1; margin-top: 0; }
                    100% { opacity: 0; margin-top: -46px; }
                }
            </style>
            <div class="shooter-arena" id="shooter-arena">
                <div class="shooter-question" id="shooter-question">?</div>
                <div class="shooter-hud">⭐ <span id="shooter-score">0</span></div>
                <div class="shooter-help" id="shooter-help">🎯 Vise avec le doigt — 💥 tape le VAISSEAU pour tirer sur les mauvaises réponses — 🛸 laisse la BONNE venir à toi !</div>
                <div class="ship-zone" id="ship-zone"></div>
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
        this.shipZone = this.container.querySelector('#ship-zone');
        this.fireBtn = this.container.querySelector('#mobile-fire-btn');
        this.scoreEl = this.container.querySelector('#shooter-score');

        this.meteors = [];
        this.lasers = [];
        this.approche = this.params.difficulty === 'hard' ? 1.1 : (this.params.difficulty === 'easy' ? 0.5 : 0.75);
        this.laserSpeed = 11;
        this.score = 0;
        this.wrongDestroyed = 0;
        this.roundOver = false;
        this.angle = -Math.PI / 2;   // plein haut au départ

        this.centrer();
        this.onResize = () => this.centrer();
        window.addEventListener('resize', this.onResize);

        this.bindControls();

        regTimeout(() => {
            const help = this.container.querySelector('#shooter-help');
            if (help) help.style.opacity = '0';
        }, 7000);
    }

    destroy() {
        if (this.demoCursor) { this.demoCursor.destroy(); this.demoCursor = null; }
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        window.removeEventListener('resize', this.onResize);
        super.destroy();
        this.unbindControls();
    }

    centrer() {
        this.shipX = (this.arena.offsetWidth || 600) / 2;
        this.shipY = (this.arena.offsetHeight || 400) / 2;
        this.spaceship.style.left = this.shipX + 'px';
        this.spaceship.style.top = this.shipY + 'px';
        this.shipZone.style.left = this.shipX + 'px';
        this.shipZone.style.top = this.shipY + 'px';
        this.tourner();
    }

    tourner() {
        // Le triangle du SVG pointe vers le haut : +90° pour l'aligner sur l'angle.
        this.spaceship.style.transform =
            `translate(-50%, -50%) rotate(${this.angle * 180 / Math.PI + 90}deg)`;
    }

    viserVers(clientX, clientY) {
        const rect = this.arena.getBoundingClientRect();
        const dx = (clientX - rect.left) - this.shipX;
        const dy = (clientY - rect.top) - this.shipY;
        if (Math.hypot(dx, dy) < 12) return;   // trop près du centre : angle instable
        this.angle = Math.atan2(dy, dx);
        this.tourner();
    }

    bindControls() {
        this.handleKeyDown = (e) => {
            if (e.code === 'ArrowLeft') { this.angle -= 0.15; this.tourner(); }
            if (e.code === 'ArrowRight') { this.angle += 0.15; this.tourner(); }
            if (e.code === 'Space') { e.preventDefault(); this.fireLaser(); }
        };

        // Le doigt ou la souris ORIENTE le vaisseau…
        this.handlePointerMove = (e) => {
            if (e.target === this.fireBtn) return;
            if (e.cancelable) e.preventDefault();
            const src = e.touches && e.touches.length ? e.touches[0] : e;
            if (src.clientX === undefined) return;
            this.viserVers(src.clientX, src.clientY);
        };

        // … et un appui SUR le vaisseau (zone généreuse) déclenche le tir.
        this.handlePointerDown = (e) => {
            if (e.target === this.fireBtn) return;
            if (e.cancelable) e.preventDefault();
            const src = e.touches && e.touches.length ? e.touches[0] : e;
            const rect = this.arena.getBoundingClientRect();
            const dx = (src.clientX - rect.left) - this.shipX;
            const dy = (src.clientY - rect.top) - this.shipY;
            if (Math.hypot(dx, dy) <= ZONE_TIR) this.fireLaser();
            else this.viserVers(src.clientX, src.clientY);
        };

        this.handleFireBtn = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.fireLaser();
        };

        window.addEventListener('keydown', this.handleKeyDown);
        this.arena.addEventListener('mousemove', this.handlePointerMove);
        this.arena.addEventListener('touchmove', this.handlePointerMove, { passive: false });
        this.arena.addEventListener('mousedown', this.handlePointerDown);
        this.arena.addEventListener('touchstart', this.handlePointerDown, { passive: false });
        this.fireBtn.addEventListener('mousedown', this.handleFireBtn);
        this.fireBtn.addEventListener('touchstart', this.handleFireBtn, { passive: false });
    }

    unbindControls() {
        window.removeEventListener('keydown', this.handleKeyDown);
        this.arena.removeEventListener('mousemove', this.handlePointerMove);
        this.arena.removeEventListener('touchmove', this.handlePointerMove);
        this.arena.removeEventListener('mousedown', this.handlePointerDown);
        this.arena.removeEventListener('touchstart', this.handlePointerDown);
        this.fireBtn.removeEventListener('mousedown', this.handleFireBtn);
        this.fireBtn.removeEventListener('touchstart', this.handleFireBtn);
    }

    fireLaser() {
        if (!this.isRunning || (this.isDemo && !this.demoCanFire)) return;
        if (this.roundOver) return;
        const now = Date.now();
        if (this.lastFire && now - this.lastFire < 260) return;
        this.lastFire = now;

        const el = document.createElement('div');
        el.className = 'laser';
        const x = this.shipX + Math.cos(this.angle) * (SHIP_SIZE / 2);
        const y = this.shipY + Math.sin(this.angle) * (SHIP_SIZE / 2);
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.transform = `translate(-50%, -50%) rotate(${this.angle * 180 / Math.PI + 90}deg)`;
        this.arena.appendChild(el);

        this.lasers.push({
            el, x, y,
            vx: Math.cos(this.angle) * this.laserSpeed,
            vy: Math.sin(this.angle) * this.laserSpeed,
            destroyed: false
        });
    }

    startGameLoop() {
        this.newRound();
        regInterval(() => {
            if (!this.isRunning || this.gelDemo) return;
            this.tickPhysics();
        }, 20);
    }

    /** Physique commune au jeu réel et à la démonstration. */
    tickPhysics() {
        const w = this.arena.offsetWidth, h = this.arena.offsetHeight;

        this.lasers.forEach(l => {
            if (l.destroyed) return;
            l.x += l.vx; l.y += l.vy;
            l.el.style.left = l.x + 'px';
            l.el.style.top = l.y + 'px';
            if (l.x < -30 || l.x > w + 30 || l.y < -30 || l.y > h + 30) {
                l.destroyed = true;
                l.el.remove();
            }
        });

        // Les météorites CONVERGENT vers le vaisseau.
        this.meteors.forEach(m => {
            if (m.destroyed) return;
            m.dist -= m.vitesse;
            m.x = this.shipX + Math.cos(m.cap) * m.dist - METEOR_SIZE / 2;
            m.y = this.shipY + Math.sin(m.cap) * m.dist - METEOR_SIZE / 2;
            m.el.style.left = m.x + 'px';
            m.el.style.top = m.y + 'px';
        });

        this.checkLaserHits();
        this.checkShipContact();

        this.meteors = this.meteors.filter(m => !m.destroyed);
        this.lasers = this.lasers.filter(l => !l.destroyed);
    }

    checkLaserHits() {
        for (const l of this.lasers) {
            if (l.destroyed) continue;
            for (const m of this.meteors) {
                if (m.destroyed) continue;
                const mx = m.x + METEOR_SIZE / 2, my = m.y + METEOR_SIZE / 2;
                if (Math.hypot(mx - l.x, my - l.y) < METEOR_SIZE / 2 + 6) {
                    l.destroyed = true;
                    l.el.remove();
                    this.hitMeteor(m);
                    break;
                }
            }
        }
    }

    /** Contact vaisseau-météorite : accueil de la bonne, collision sinon. */
    checkShipContact() {
        if (this.roundOver) return;
        for (const m of this.meteors) {
            if (m.destroyed) continue;
            if (m.dist > (METEOR_SIZE + SHIP_SIZE) / 2 - 8) continue;

            m.destroyed = true;
            if (m.isCorrect) {
                this.catchCorrect(m);
            } else {
                m.el.style.animation = 'explode 0.4s forwards';
                regTimeout(() => m.el.remove(), 400);
                this.resolveRound(() => this.triggerError(m.ans,
                    `${m.ans} a percuté le vaisseau… Il fallait le détruire : la bonne réponse était ${this.currentAns}.`));
            }
            return;
        }
    }

    hitMeteor(m) {
        if (m.destroyed) return;
        m.destroyed = true;
        m.el.style.animation = 'explode 0.4s forwards';
        regTimeout(() => m.el.remove(), 400);

        if (m.isCorrect) {
            if (!this.roundOver) {
                this.resolveRound(() => this.triggerError(`tir sur ${m.ans}`,
                    `C'était la bonne réponse ! Il fallait la laisser arriver jusqu'au vaisseau, pas la détruire.`));
            }
        } else {
            this.wrongDestroyed++;
            this.addFloat(m.x + METEOR_SIZE / 2, m.y, '+5', '#f59e0b');
            this.setScore(this.score + 5);
        }
    }

    /** La bonne réponse rejoint le vaisseau : c'est la validation. */
    catchCorrect(m) {
        m.el.style.animation = 'absorb 0.35s forwards';
        regTimeout(() => m.el.remove(), 350);
        this.spaceship.classList.add('catching');
        regTimeout(() => this.spaceship.classList.remove('catching'), 600);

        const pts = 10 + this.wrongDestroyed * 5;
        this.addFloat(this.shipX, this.shipY - SHIP_SIZE, `+${pts}`, '#22c55e');
        this.setScore(this.score + pts);

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
                t: this.currentT, m: this.currentM, ans: this.currentAns,
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
        this.meteors.forEach(m => { if (m.el) m.el.remove(); });
        this.meteors = [];
        this.lasers.forEach(l => { if (l.el) l.el.remove(); });
        this.lasers = [];

        const answers = multDistractors(this.currentT, this.currentAns, 2);
        const w = this.arena.offsetWidth, h = this.arena.offsetHeight;
        const rayonDepart = Math.hypot(w, h) / 2 + METEOR_SIZE;

        // Caps répartis autour du cercle, puis mélangés d'un décalage commun :
        // les météorites arrivent de partout, jamais en paquet.
        const decalage = Math.random() * Math.PI * 2;
        answers.forEach((ans, i) => {
            const el = document.createElement('div');
            el.className = 'meteor';
            el.textContent = ans;
            this.arena.appendChild(el);

            const cap = decalage + (i / answers.length) * Math.PI * 2
                + (Math.random() - 0.5) * 0.5;
            const isCorrect = ans === this.currentAns;
            this.meteors.push({
                el, ans, isCorrect, destroyed: false,
                cap,
                dist: rayonDepart + Math.random() * 90,
                // La bonne réponse arrive un peu APRÈS : le temps de nettoyer.
                vitesse: this.approche * (isCorrect ? 0.72 : 1),
                x: 0, y: 0
            });
        });
    }

    /**
     * Une météorite est-elle DANS le champ ? Elles naissent au-delà du coin
     * de l'arène (`rayonDepart`) et convergent : pendant une bonne seconde
     * elles existent sans être visibles. Tout ce que la démonstration montre
     * doit se lire à l'écran, donc rien ne se joue avant ce test.
     */
    meteoriteVisible(m) {
        const w = this.arena.offsetWidth, h = this.arena.offsetHeight;
        const cx = m.x + METEOR_SIZE / 2, cy = m.y + METEOR_SIZE / 2;
        const marge = METEOR_SIZE * 0.6;
        return cx > marge && cx < w - marge && cy > marge && cy < h - marge;
    }

    /**
     * Démonstration : le robot montre les deux gestes — il ORIENTE le
     * vaisseau vers une mauvaise réponse, tape dessus pour tirer, puis
     * laisse la bonne arriver au contact. Le tout expliqué en bulles.
     */
    runDemoSequence() {
        this.newRound();
        this.demoCanFire = false;
        this.demoCursor = createDemoCursor();
        // Jeu continu : « Pause » y fige l'action entière — c'est ce qu'on
        // veut pour lire une explication sans que les météorites avancent.
        this.demoGate = createDemoGate(this.arena);
        let phase = 'annonce';
        let cadence = 0;
        let annonce = 0;

        this.demoCursor.pause(50).then(() => {
            if (this.isRunning && this.demoCursor) {
                this.demoCursor.say(
                    `${this.currentT} × ${this.currentM} = ${this.currentAns}. Je détruis toutes les AUTRES météorites, et je laisse ${this.currentAns} venir jusqu'à moi.`,
                    this.spaceship);
            }
        });

        regInterval(() => {
            if (!this.isRunning || this.demoGate.paused) return;
            this.tickPhysics();
            if (this.roundOver) { phase = 'annonce'; return; }
            cadence++;

            const vivantes = this.meteors.filter(m => !m.destroyed);
            const bonne = vivantes.find(m => m.isCorrect);
            const fausses = vivantes.filter(m => !m.isCorrect);
            if (!bonne) return;

            // On ne vise QUE ce que l'élève voit. Auparavant la chasse
            // démarrait au bout d'un délai fixe et prenait la première
            // mauvaise réponse de la liste : le vaisseau pivotait vers le
            // bord et tirait dans le vide, la météorite n'entrant en scène
            // qu'après. La plus proche des VISIBLES, et rien avant.
            const enVue = fausses.filter(m => this.meteoriteVisible(m))
                .sort((a, b) => a.dist - b.dist);
            const mauvaise = enVue[0];

            if (phase === 'annonce') {
                if (!mauvaise) return;
                phase = 'chasse';
                annonce = cadence;
                mauvaise.el.classList.add('demo-target');
                if (this.demoCursor) this.demoCursor.say(
                    `${mauvaise.ans} n'est pas ${this.currentT} × ${this.currentM} : je tourne le vaisseau vers elle et je tire.`,
                    mauvaise.el);
            }
            if (phase === 'chasse' && !fausses.length) {
                phase = 'accueil';
                bonne.el.classList.add('demo-target');
                if (this.demoCursor) this.demoCursor.say(
                    `${bonne.ans} = ${this.currentT} × ${this.currentM} : je ne tire PAS, je l'accueille.`, this.spaceship);
            }
            if (phase !== 'chasse' || !mauvaise) return;

            // Le vaisseau tourne doucement vers la mauvaise réponse visée.
            const cible = Math.atan2(
                (mauvaise.y + METEOR_SIZE / 2) - this.shipY,
                (mauvaise.x + METEOR_SIZE / 2) - this.shipX);
            let delta = cible - this.angle;
            while (delta > Math.PI) delta -= 2 * Math.PI;
            while (delta < -Math.PI) delta += 2 * Math.PI;
            this.angle += delta * 0.14;
            this.tourner();

            // Un demi-tour de canon prend le temps qu'il prend : on laisse
            // voir le pivotement avant la première salve.
            if (Math.abs(delta) < 0.06 && cadence - annonce > 16 && cadence % 22 === 0) {
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
