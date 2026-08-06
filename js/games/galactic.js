// Galactic Gunner : le tir aux angles.
//
// Porté depuis l'ancien projet (imports/maths-legacy/games/galactic). Un
// ennemi se poste quelque part au-dessus d'un rapporteur géant ; on LIT son
// angle sur les graduations, on le tape au clavier, on tire. La progression
// est une leçon de lecture du rapporteur : graduations de 10 en 10, puis de
// 5 en 5, puis l'ÉCHELLE INVERSÉE (l'ennemi est sur la graduation 40 mais il
// faut tirer à 180 − 40), la précision au degré, et enfin la cible mouvante.
//
// Chaque tir est une tentative : réussite (points × niveau × combo) ou échec
// expliqué — c'est la compétence geo.angles.mesure qui s'alimente, la même
// qu'Angle Master. Le robot lit l'angle à voix haute, calcule l'inversion
// quand il le faut, tape sur le clavier et tire — pause et pas-à-pas compris.

import { BaseGame } from '../core/BaseGame.js';
import { regTimeout } from '../core/timers.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';

const SKILL = 'geo.angles.mesure';

class Galactic extends BaseGame {
    render() {
        this.score = 0;
        this.level = parseInt(this.params.startLevel) || 1;
        this.lives = parseInt(this.params.lives) || 3;
        this.saisie = '';
        this.combo = 0;
        this.shake = 0;
        this.verrouille = false;
        this.player = { x: 0, y: 0, angle: 90 };
        this.protractor = { r: 220 };
        this.enemy = { active: false, angle: 90, isReverse: false, moving: false, speed: 0, dist: 0, x: 0, y: 0, charge: 0, maxCharge: Infinity, hp: 1, size: 24, color: '#ff0055', type: 'normal' };
        this.asteroids = [];
        this.particles = [];
        this.playerLaser = { active: false };
        this.enemyLaser = { active: false };

        this.container.innerHTML = `
            <style>
                .gal-wrapper { position: relative; width: 100%; height: 100%; background: #02020c; overflow: hidden; font-family: 'Outfit', monospace; user-select: none; -webkit-user-select: none; }
                .gal-canvas { display: block; width: 100%; height: 100%; touch-action: none; }
                .gal-top { position: absolute; top: 10px; width: 100%; display: flex; justify-content: space-between; padding: 0 22px; box-sizing: border-box; pointer-events: none; z-index: 20; }
                .gal-box { text-align: center; }
                .gal-big { font-size: 1.5rem; font-weight: 900; color: #fff; }
                .gal-sub { font-size: 0.72rem; color: #aaa; letter-spacing: 1px; }
                .gal-lives { font-size: 1.5rem; color: #ff0055; letter-spacing: 2px; }
                .gal-combo { position: absolute; top: 70px; left: 22px; z-index: 20; text-align: center; opacity: 0; transition: opacity .3s; }
                .gal-combo-txt { font-size: 2rem; font-weight: 900; color: #ffaa00; text-shadow: 0 0 15px #ffaa00; font-style: italic; }
                .gal-msg { position: absolute; top: 64px; width: 100%; text-align: center; font-size: 1rem; color: #00ffaa; pointer-events: none; opacity: .85; text-shadow: 0 0 5px #00ffaa; }
                .gal-feedback { position: absolute; top: 38%; width: 100%; text-align: center; font-size: 2.6rem; font-weight: 900; text-shadow: 0 0 20px currentColor; opacity: 0; pointer-events: none; transition: .3s; z-index: 60; }
                .gal-deck { position: absolute; bottom: 0; left: 0; width: 100%; background: rgba(10,10,10,.97); border-top: 2px solid #333; display: flex; align-items: center; justify-content: center; gap: 14px; z-index: 100; padding: 10px 6px calc(10px + env(safe-area-inset-bottom, 0px)); box-sizing: border-box; flex-wrap: wrap; }
                .gal-lcd { background: #000; border: 2px solid #444; border-radius: 6px; width: 88px; height: 52px; display: flex; justify-content: center; align-items: center; font-size: 1.7rem; color: #00ffaa; font-family: monospace; text-shadow: 0 0 5px #00ffaa; }
                .gal-keys { display: flex; flex-direction: column; gap: 6px; }
                .gal-row { display: flex; gap: 6px; }
                .gal-key { width: 44px; height: 44px; background: linear-gradient(to bottom, #222, #111); border: 1px solid #555; border-radius: 6px; color: #fff; font-size: 1.25rem; font-weight: bold; display: flex; justify-content: center; align-items: center; cursor: pointer; box-shadow: 0 3px 0 #000; }
                .gal-key:active { transform: translateY(3px); box-shadow: none; }
                .gal-actions { display: flex; flex-direction: column; gap: 6px; }
                .gal-btn { height: 44px; width: 78px; border-radius: 6px; font-weight: 900; cursor: pointer; border: none; box-shadow: 0 3px 0 rgba(0,0,0,.5); font-size: 1.05rem; }
                .gal-btn:active { transform: translateY(3px); box-shadow: none; }
                .gal-clr { background: #333; color: #aaa; border: 1px solid #555; }
                .gal-fire { background: linear-gradient(to bottom, #ff0055, #990033); color: #fff; border: 1px solid #ff3377; }
                /* Écran étroit : le pavé passait à la ligne (LCD, puis touches,
                   puis CLR, puis FEU empilés) et occupait la moitié de la
                   hauteur — le rapporteur, tout l'intérêt du jeu, se retrouvait
                   dessous, invisible. Resserré, il tient sur une seule ligne. */
                /* Téléphone couché aussi : 720 px de large mais 390 de haut,
                   le pavé y mangeait 41 % de la hauteur du champ de tir. */
                @media (max-width: 620px), (max-height: 480px) {
                    .gal-deck { gap: 7px; padding: 7px 4px calc(7px + env(safe-area-inset-bottom, 0px)); flex-wrap: nowrap; }
                    .gal-lcd { width: 58px; height: 42px; font-size: 1.2rem; border-width: 1px; }
                    .gal-keys { gap: 4px; }
                    .gal-row { gap: 4px; }
                    .gal-key { width: 34px; height: 34px; font-size: 1rem; box-shadow: 0 2px 0 #000; }
                    .gal-actions { gap: 4px; }
                    .gal-btn { height: 34px; width: 54px; font-size: .82rem; box-shadow: 0 2px 0 rgba(0,0,0,.5); }
                }
            </style>
            <div class="gal-wrapper">
                <div class="gal-top">
                    <div class="gal-box"><div class="gal-sub">SCORE</div><div class="gal-big" data-score>0</div></div>
                    <div class="gal-box"><div class="gal-sub">NIVEAU</div><div class="gal-big" data-level>${this.level}</div></div>
                    <div class="gal-box"><div class="gal-sub">VIES</div><div class="gal-lives" data-lives></div></div>
                </div>
                <div class="gal-combo" data-combo><div class="gal-combo-txt" data-combo-txt>x2</div><div class="gal-sub">COMBO</div></div>
                <div class="gal-msg" data-msg></div>
                <div class="gal-feedback" data-feedback></div>
                <div class="gal-deck">
                    <div class="gal-lcd"><span data-input></span>°</div>
                    <div class="gal-keys">
                        <div class="gal-row">${[1, 2, 3, 4, 5].map(n => `<div class="gal-key" data-k="${n}">${n}</div>`).join('')}</div>
                        <div class="gal-row">${[6, 7, 8, 9, 0].map(n => `<div class="gal-key" data-k="${n}">${n}</div>`).join('')}</div>
                    </div>
                    <div class="gal-actions">
                        <button type="button" class="gal-btn gal-clr" data-clr>CLR</button>
                        <button type="button" class="gal-btn gal-fire" data-fire>FEU</button>
                    </div>
                </div>
                <canvas class="gal-canvas"></canvas>
            </div>`;

        this.canvas = this.container.querySelector('.gal-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ui = {
            score: this.container.querySelector('[data-score]'),
            level: this.container.querySelector('[data-level]'),
            lives: this.container.querySelector('[data-lives]'),
            input: this.container.querySelector('[data-input]'),
            msg: this.container.querySelector('[data-msg]'),
            feedback: this.container.querySelector('[data-feedback]'),
            combo: this.container.querySelector('[data-combo]'),
            comboTxt: this.container.querySelector('[data-combo-txt]')
        };

        this.dimensionner();
        this.onResize = () => this.dimensionner();
        window.addEventListener('resize', this.onResize);

        this.stars = Array.from({ length: 120 }, () => ({
            x: Math.random() * this.canvas.width, y: Math.random() * this.canvas.height,
            s: Math.random() * 2, sp: Math.random() * 2 + 0.5
        }));

        this.container.querySelectorAll('.gal-key').forEach(k => {
            k.addEventListener('click', () => this.kp(k.dataset.k));
        });
        this.container.querySelector('[data-clr]').onclick = () => { this.saisie = ''; this.majSaisie(); };
        this.container.querySelector('[data-fire]').onclick = () => this.fire();

        // Viser à la souris ou au doigt oriente la ligne pointillée d'aide ;
        // un appui la verrouille. C'est un guide visuel, le TIR reste au
        // clavier : on répond en degrés, pas en visant.
        const vise = (e) => {
            if (!this.isRunning || this.verrouille) return;
            const r = this.canvas.getBoundingClientRect();
            const src = e.touches && e.touches.length ? e.touches[0] : e;
            const dx = (src.clientX - r.left) * (this.canvas.width / r.width) - this.player.x;
            const dy = (src.clientY - r.top) * (this.canvas.height / r.height) - this.player.y;
            let deg = Math.atan2(-dy, dx) * 180 / Math.PI;
            this.player.angle = Math.max(0, Math.min(180, deg));
        };
        this.canvas.addEventListener('mousemove', vise);
        this.canvas.addEventListener('touchmove', vise, { passive: true });
        this.canvas.addEventListener('mousedown', () => { if (this.isRunning) this.verrouille = !this.verrouille; });

        this.majUI();
        this.majNiveau();
    }

    dimensionner() {
        if (!this.canvas) return;
        this.canvas.width = this.container.clientWidth || 800;
        this.canvas.height = this.container.clientHeight || 600;

        // Le pavé de saisie est POSÉ SUR le canevas : sa hauteur doit être
        // retranchée du terrain, sinon le rapporteur géant — tout l'intérêt du
        // jeu — se dessine dessous et reste invisible sur téléphone.
        const deck = this.container.querySelector('.gal-deck');
        this.hauteurDeck = deck ? deck.offsetHeight : 0;
        // 22 px de garde : les graduations 0 et 180 tombent au ras de la ligne
        // de base, et leurs libellés passaient sous le pavé en paysage.
        const garde = 22;
        const utile = Math.max(180, this.canvas.height - this.hauteurDeck - garde);

        // Le canon se pose au ras du pavé, et le rapporteur tient dans ce qui
        // reste au-dessus, en largeur comme en hauteur.
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height - this.hauteurDeck - garde;
        // 0,32 de la largeur et non 0,42 : l'ennemi doit tenir À CÔTÉ du
        // rapporteur même à 10°, où il part presque à l'horizontale.
        this.protractor.r = Math.max(64, Math.min(240,
            this.canvas.width * 0.32, utile * 0.62));
    }

    startGameLoop() {
        regTimeout(() => this.spawnEnemy(), 900);
        this.boucle();
    }

    kp(n) { if (this.saisie.length < 3) { this.saisie += n; this.majSaisie(); } }
    majSaisie() { this.ui.input.textContent = this.saisie; }

    majUI() {
        this.ui.score.textContent = this.score;
        this.ui.level.textContent = this.level;
        this.ui.lives.textContent = '❤'.repeat(Math.max(0, this.lives));
    }

    majCombo() {
        if (this.combo > 1) {
            this.ui.combo.style.opacity = 1;
            this.ui.comboTxt.textContent = 'x' + this.combo;
        } else this.ui.combo.style.opacity = 0;
    }

    majNiveau() {
        const noms = ['', 'NIV 1 : LECTURE (10 en 10)', 'NIV 2 : CHRONO (5 en 5)',
            'NIV 3 : ÉCHELLE INVERSÉE (180 − x)', 'NIV 4 : PRÉCISION (au degré)',
            'NIV 5 : INVERSÉ PRÉCIS', 'NIV 6+ : CIBLE MOUVANTE'];
        this.ui.msg.textContent = noms[Math.min(this.level, 6)];
    }

    spawnEnemy() {
        if (!this.isRunning) return;
        this.verrouille = false;
        const L = this.level;
        const step = L === 1 ? 10 : (L <= 3 ? 5 : 1);
        const e = this.enemy;
        e.isReverse = L === 3 || L === 5 || (L >= 6 && Math.random() > 0.5);
        e.moving = L >= 6;
        e.speed = e.moving ? (Math.random() > 0.5 ? 0.2 : -0.2) * (1 + (L - 6) * 0.1) : 0;
        e.angle = Math.floor(Math.random() * (160 / step) + 10 / step) * step;
        e.size = L >= 4 ? 16 : 24;
        e.maxCharge = L === 1 ? Infinity : Math.max(240, 1300 - L * 60);
        e.charge = 0;
        e.type = 'normal'; e.color = '#ff0055'; e.hp = 1;
        if (L >= 5 && Math.random() < 0.3) { e.type = 'armored'; e.hp = 2; e.color = '#ff8800'; }
        e.active = false;
        this.placerEnnemi();
        e.active = true;
        if (L >= 4 && Math.random() < 0.4) this.spawnAsteroid();
    }

    angleReel() {
        return this.enemy.isReverse ? 180 - this.enemy.angle : this.enemy.angle;
    }

    placerEnnemi() {
        const e = this.enemy;
        const rad = this.angleReel() * Math.PI / 180;
        const cos = Math.cos(-rad), sin = Math.sin(-rad);

        // Distance PLAFONNÉE PAR L'ANGLE : à 10° l'ennemi part presque à
        // l'horizontale et sortait du cadre sur un écran étroit. On borne
        // séparément en largeur et en hauteur, puis on garde le minimum.
        const marge = e.size + 14;
        const versBord = Math.abs(cos) > 1e-3
            ? (this.canvas.width / 2 - marge) / Math.abs(cos) : Infinity;
        const versHaut = Math.abs(sin) > 1e-3
            ? (this.player.y - marge - 46) / Math.abs(sin) : Infinity;

        const minD = this.protractor.r + 30;
        const maxD = Math.max(minD, Math.min(versBord, versHaut));
        if (!e.active) e.dist = minD + Math.random() * Math.max(0, maxD - minD);
        e.dist = Math.min(e.dist, maxD);

        e.x = this.player.x + cos * e.dist;
        e.y = this.player.y + sin * e.dist;
    }

    spawnAsteroid() {
        const gauche = Math.random() < 0.5;
        this.asteroids.push({
            x: gauche ? -50 : this.canvas.width + 50,
            y: this.player.y - 220 - Math.random() * 120,
            vx: gauche ? 1 + Math.random() : -1 - Math.random(),
            r: 14 + Math.random() * 18, angle: Math.random() * Math.PI
        });
    }

    fire() {
        if (!this.isRunning || this.saisie === '' || (this.isDemo && !this.demoTire)) return;
        const val = parseInt(this.saisie, 10);
        this.saisie = '';
        this.majSaisie();
        const tir = this.enemy.isReverse ? 180 - val : val;

        this.playerLaser = { active: true, w: 40, alpha: 1 };
        this.shake = 10;
        const rad = -tir * Math.PI / 180;
        this.playerLaser.sx = this.player.x; this.playerLaser.sy = this.player.y;
        this.playerLaser.ex = this.player.x + 2500 * Math.cos(rad);
        this.playerLaser.ey = this.player.y + 2500 * Math.sin(rad);

        regTimeout(() => {
            if (!this.isRunning) return;
            // Un astéroïde sur la trajectoire bloque le tir — sans pénalité de
            // lecture : ce n'est pas une erreur d'angle.
            for (let i = this.asteroids.length - 1; i >= 0; i--) {
                const a = this.asteroids[i];
                if (this.ligneCercle(this.playerLaser.sx, this.playerLaser.sy, this.playerLaser.ex, this.playerLaser.ey, a.x, a.y, a.r + 10)) {
                    this.explosion(a.x, a.y, '#888');
                    this.asteroids.splice(i, 1);
                    this.texte('BLOQUÉ', '#aaa');
                    this.combo = 0; this.majCombo();
                    return;
                }
            }

            const tolerance = this.level >= 4 ? 1.5 : 2.5;
            const reel = this.angleReel();
            if (this.enemy.active && Math.abs(tir - reel) <= tolerance) {
                this.enemy.hp--;
                this.explosion(this.enemy.x, this.enemy.y, this.enemy.color);
                if (this.enemy.hp <= 0) {
                    this.combo++;
                    this.majCombo();
                    const pts = 10 * this.level + (this.combo > 1 ? 5 * this.combo : 0);
                    this.score += pts;
                    if (this.score > this.level * 60) { this.level++; this.majNiveau(); }
                    this.texte(this.combo > 2 ? `COMBO x${this.combo} !` : 'BOOM !', '#00ffaa');
                    this.enemy.active = false;
                    this.shake = 26;
                    this.verrouille = false;
                    this.onCorrectAnswer(null, SKILL, {
                        points: pts,
                        questionText: this.enemy.isReverse
                            ? `Angle (échelle inversée) : graduation ${this.enemy.angle}` : `Angle : ${reel}°`,
                        given: val, expected: this.enemy.isReverse ? this.enemy.angle : reel
                    });
                    this.majUI();
                    regTimeout(() => this.spawnEnemy(), 1000);
                } else {
                    this.texte('TOUCHÉ', '#ffaa00');
                    this.shake = 14;
                }
            } else {
                this.texte('RATÉ', '#8899aa');
                this.combo = 0; this.majCombo();
                // Un tir à côté coûte un cœur, comme un tir encaissé : sans
                // ça, on pouvait balayer tous les angles de 0 à 180 sans rien
                // risquer, et le rapporteur ne servait plus à rien.
                this.lives--;
                this.majUI();
                this.onWrongAnswer(null, {
                    questionText: `Angle de l'ennemi`,
                    input: val,
                    expected: this.enemy.isReverse ? this.enemy.angle : reel,
                    concept: SKILL,
                    customMessage: this.enemy.isReverse
                        ? `Échelle inversée : l'ennemi est sur la graduation ${this.enemy.angle}, il fallait tirer ${this.enemy.angle} (le canon convertit en 180 − ${this.enemy.angle}).`
                        : `L'ennemi était à ${reel}° — regarde la graduation croisée par la ligne qui le rejoint.`
                });
                if (this.lives <= 0) this.plusDeVies();
            }
        }, 100);
    }

    /**
     * Cœurs épuisés : on recule d'un niveau et on repart avec une escadrille
     * neuve. Partagé entre le tir raté et le tir encaissé, sinon les deux
     * façons de perdre ne se terminaient pas de la même manière.
     */
    plusDeVies() {
        this.texte('GAME OVER', '#ff0055');
        this.enemy.active = false;
        this.verrouille = false;
        regTimeout(() => {
            if (!this.isRunning) return;
            this.lives = parseInt(this.params.lives) || 3;
            this.level = Math.max(1, this.level - 1);
            this.majUI(); this.majNiveau();
            this.spawnEnemy();
        }, 2400);
    }

    ligneCercle(x1, y1, x2, y2, cx, cy, r) {
        const num = Math.abs((y2 - y1) * cx - (x2 - x1) * cy + x2 * y1 - y2 * x1);
        const den = Math.hypot(y2 - y1, x2 - x1);
        return num / den < r;
    }

    enemyFires() {
        this.enemyLaser = { active: true, x: this.enemy.x, y: this.enemy.y, alpha: 1 };
        this.lives--;
        this.combo = 0; this.majCombo();
        this.shake = 36;
        this.explosion(this.player.x, this.player.y - 30, '#ff0055');
        this.texte('DÉGÂTS !', '#ff0055');
        this.enemy.active = false;
        this.verrouille = false;
        this.onWrongAnswer(null, {
            questionText: `Angle de l'ennemi`,
            input: '(trop lent)',
            expected: this.enemy.isReverse ? this.enemy.angle : this.angleReel(),
            concept: SKILL,
            customMessage: `Trop lent ! L'ennemi a chargé son tir. Il était à ${this.enemy.isReverse ? this.enemy.angle : this.angleReel()}${this.enemy.isReverse ? ' sur l\'échelle inversée' : '°'}.`
        });
        this.majUI();
        if (this.lives <= 0) this.plusDeVies();
        else regTimeout(() => this.spawnEnemy(), 1500);
    }

    texte(txt, col) {
        this.ui.feedback.textContent = txt;
        this.ui.feedback.style.color = col;
        this.ui.feedback.style.opacity = 1;
        regTimeout(() => { if (this.ui.feedback) this.ui.feedback.style.opacity = 0; }, 1200);
    }

    explosion(x, y, col) {
        for (let i = 0; i < 36; i++) {
            const a = Math.random() * 6.28, s = Math.random() * 13;
            this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, col, sz: Math.random() * 5 + 3 });
        }
    }

    // --- Boucle & dessin (fidèle à l'original, resserré) ---------------------

    boucle() {
        if (!this.isRunning) return;
        // Pause d'explication : image figée, mais toujours dessinée.
        if (this.gelDemo) {
            this.dessiner();
            this.rafId = requestAnimationFrame(() => this.boucle());
            return;
        }
        const e = this.enemy;
        if (e.active) {
            if (e.maxCharge !== Infinity && !this.isDemo) {
                e.charge++;
                if (e.charge >= e.maxCharge) this.enemyFires();
            }
            if (e.moving) {
                e.angle += e.speed;
                if (e.angle <= 10 || e.angle >= 170) e.speed *= -1;
                this.placerEnnemi();
            }
        }
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const a = this.asteroids[i];
            a.x += a.vx; a.angle += 0.05;
            if (a.x < -100 || a.x > this.canvas.width + 100) this.asteroids.splice(i, 1);
        }
        if (this.playerLaser.active) { this.playerLaser.w *= 0.8; this.playerLaser.alpha -= 0.05; if (this.playerLaser.alpha <= 0) this.playerLaser.active = false; }
        if (this.enemyLaser.active) { this.enemyLaser.alpha -= 0.05; if (this.enemyLaser.alpha <= 0) this.enemyLaser.active = false; }
        for (let i = this.particles.length - 1; i >= 0; i--) { const p = this.particles[i]; p.x += p.vx; p.y += p.vy; p.life -= 0.03; if (p.life <= 0) this.particles.splice(i, 1); }

        this.dessiner();
        this.rafId = requestAnimationFrame(() => this.boucle());
    }

    dessiner() {
        const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
        let dx = 0, dy = 0;
        if (this.shake > 0) { dx = (Math.random() - 0.5) * this.shake; dy = (Math.random() - 0.5) * this.shake; this.shake *= 0.9; if (this.shake < 1) this.shake = 0; }
        ctx.save(); ctx.translate(dx, dy); ctx.clearRect(-20, -20, W + 40, H + 40);
        ctx.fillStyle = '#02020c'; ctx.fillRect(-20, -20, W + 40, H + 40);

        ctx.fillStyle = 'white';
        for (const s of this.stars) { s.y += s.sp; if (s.y > H) s.y = 0; ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, 6.28); ctx.fill(); }

        // Secteur de visée + ligne pointillée
        const grad = -this.player.angle * Math.PI / 180;
        ctx.beginPath(); ctx.moveTo(this.player.x, this.player.y);
        ctx.arc(this.player.x, this.player.y, this.protractor.r - 20, 0, grad, true);
        ctx.lineTo(this.player.x, this.player.y);
        ctx.fillStyle = this.verrouille ? 'rgba(0,255,255,.35)' : 'rgba(255,170,0,.25)';
        ctx.fill();
        ctx.beginPath(); ctx.moveTo(this.player.x, this.player.y);
        ctx.lineTo(this.player.x + 2500 * Math.cos(grad), this.player.y + 2500 * Math.sin(grad));
        ctx.strokeStyle = this.verrouille ? '#00ffff' : '#ffaa00';
        ctx.lineWidth = 3; ctx.setLineDash([10, 5]); ctx.stroke(); ctx.setLineDash([]);

        for (const a of this.asteroids) this.dessinerAsteroide(a);
        if (this.enemy.active) this.dessinerEnnemi();
        if (this.enemyLaser.active) { ctx.beginPath(); ctx.moveTo(this.enemyLaser.x, this.enemyLaser.y); ctx.lineTo(this.player.x, this.player.y); ctx.lineWidth = 18; ctx.strokeStyle = `rgba(255,0,0,${this.enemyLaser.alpha})`; ctx.stroke(); }
        if (this.playerLaser.active) { ctx.beginPath(); ctx.moveTo(this.playerLaser.sx, this.playerLaser.sy); ctx.lineTo(this.playerLaser.ex, this.playerLaser.ey); ctx.lineWidth = this.playerLaser.w; ctx.strokeStyle = `rgba(0,255,170,${this.playerLaser.alpha})`; ctx.stroke(); }

        this.dessinerRapporteur();
        this.dessinerCanon();
        for (const p of this.particles) { ctx.globalAlpha = p.life; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.sz, 0, 6.28); ctx.fill(); }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    dessinerAsteroide(a) {
        const ctx = this.ctx;
        ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.angle);
        ctx.fillStyle = '#555'; ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(a.r, 0);
        for (let i = 1; i < 8; i++) { const ang = i / 8 * Math.PI * 2; const rv = a.r * (0.8 + (i % 3) * 0.13); ctx.lineTo(Math.cos(ang) * rv, Math.sin(ang) * rv); }
        ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }

    dessinerEnnemi() {
        const ctx = this.ctx, e = this.enemy, sz = e.size;
        ctx.save(); ctx.translate(e.x, e.y);
        ctx.rotate(Math.atan2(this.player.y - e.y, this.player.x - e.x) - Math.PI / 2);
        if (e.maxCharge !== Infinity && !this.isDemo) {
            const pct = e.charge / e.maxCharge;
            ctx.beginPath(); ctx.arc(0, 0, sz * 1.8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
            ctx.strokeStyle = e.color; ctx.lineWidth = 3; ctx.stroke();
        }
        if (e.type === 'armored') {
            ctx.fillStyle = '#aa4400'; ctx.fillRect(-sz, -sz, sz * 2, sz * 2);
            ctx.strokeStyle = '#ffaa00'; ctx.lineWidth = 3; ctx.strokeRect(-sz, -sz, sz * 2, sz * 2);
            ctx.beginPath(); ctx.arc(0, 0, sz * 0.6, 0, 6.28); ctx.fillStyle = '#331100'; ctx.fill();
        } else {
            ctx.beginPath(); ctx.moveTo(0, sz * 1.5); ctx.lineTo(sz, -sz); ctx.lineTo(0, -sz * 0.5); ctx.lineTo(-sz, -sz); ctx.closePath();
            ctx.fillStyle = e.color; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, sz * 0.3, 0, 6.28); ctx.fill();
        }
        ctx.restore();
    }

    dessinerCanon() {
        const ctx = this.ctx;
        ctx.save(); ctx.translate(this.player.x, this.player.y);
        ctx.rotate(-this.player.angle * Math.PI / 180 + Math.PI / 2);
        ctx.fillStyle = '#111'; ctx.fillRect(-13, -36, 26, 44);
        ctx.strokeStyle = '#fff'; ctx.strokeRect(-13, -36, 26, 44);
        ctx.beginPath(); ctx.arc(0, 0, 22, 0, 6.28); ctx.fillStyle = '#333'; ctx.fill();
        ctx.restore();
    }

    dessinerRapporteur() {
        const ctx = this.ctx, R = this.protractor.r;
        ctx.save(); ctx.translate(this.player.x, this.player.y);
        ctx.beginPath(); ctx.arc(0, 0, R, Math.PI, 0);
        ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-R - 18, 0); ctx.lineTo(R + 18, 0);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

        // Tout se règle sur le RAYON : sur un petit rapporteur de téléphone,
        // les nombres écrits tous les 10° se chevauchaient en une bouillie
        // (« 1211009080706050 »). On les espace jusqu'à ce qu'ils tiennent.
        const police = Math.max(8, Math.min(13, R * 0.11));
        const rayonTexte = R - police * 2.2;
        // Un nombre occupe environ 2,4 fois la police en largeur ; l'écart
        // angulaire nécessaire s'en déduit.
        const ecartMini = (police * 2.9) / Math.max(1, rayonTexte) * 180 / Math.PI;
        const pasTexte = [10, 20, 30, 45, 90].find(p => p >= ecartMini) || 90;

        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `bold ${police.toFixed(1)}px Outfit, sans-serif`;
        // La finesse des graduations SUIT le niveau : c'est la difficulté.
        for (let i = 0; i <= 180; i++) {
            if (this.level <= 2 && i % 10 !== 0) continue;
            if (this.level === 3 && i % 5 !== 0) continue;
            const r = -i * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
            const dix = i % 10 === 0, cinq = i % 5 === 0;
            const l = dix ? R * 0.13 : (cinq ? R * 0.09 : R * 0.05);
            ctx.beginPath(); ctx.moveTo((R - l) * c, (R - l) * s); ctx.lineTo(R * c, R * s);
            ctx.strokeStyle = `rgba(255,255,255,${dix ? 1 : cinq ? 0.9 : 0.75})`;
            ctx.lineWidth = dix ? 2 : 1;
            ctx.stroke();
            if (i % pasTexte === 0) {
                ctx.fillStyle = '#fff';
                ctx.fillText(i, rayonTexte * c, rayonTexte * s);
            }
        }
        ctx.restore();
    }

    // --- Robot : il lit l'angle, convertit si l'échelle est inversée, tape ---

    async runDemoSequence() {
        this.startGameLoop();
        const cursor = createDemoCursor();
        this.demoCursor = cursor;
        const gate = createDemoGate(this.container.querySelector('.gal-deck') || this.container);
        const fin = () => { cursor.hideBubble(); gate.destroy(); };

        if (!await cursor.pause(1400) || !this.isRunning) return fin();

        while (this.isRunning && this.isDemo) {
            if (!this.enemy.active) { await cursor.pause(600); continue; }
            if (!await gate.waitTurn() || !this.isRunning) return fin();

            const grad = this.enemy.isReverse ? this.enemy.angle : this.angleReel();
            const reponse = this.enemy.isReverse ? this.enemy.angle : this.angleReel();
            this.player.angle = this.angleReel();   // la ligne d'aide montre la visée
            cursor.say(this.enemy.isReverse
                ? `L'ennemi est sur la graduation ${grad}. Échelle INVERSÉE : je tape ${grad}, le canon tirera à 180 − ${grad} = ${180 - grad}°.`
                : `Je suis la ligne jusqu'à l'ennemi : elle croise la graduation ${grad}. Je tape ${grad}.`,
                this.container.querySelector('.gal-lcd'));
            if (!await cursor.pause(1900) || !this.isRunning) return fin();

            this.demoTire = true;
            for (const c of String(reponse)) {
                const btn = this.container.querySelector(`.gal-key[data-k="${c}"]`);
                if (!btn || !await cursor.tap(btn, 320)) { this.demoTire = false; return fin(); }
                this.kp(c);
            }
            const feu = this.container.querySelector('[data-fire]');
            if (!feu || !await cursor.tap(feu, 320)) { this.demoTire = false; return fin(); }
            this.fire();
            this.demoTire = false;
            if (!await cursor.pause(DEMO_SPEED.between + 600) || !this.isRunning) return fin();
        }
        fin();
    }

    destroy() {
        if (this.demoCursor) { this.demoCursor.destroy(); this.demoCursor = null; }
        window.removeEventListener('resize', this.onResize);
        super.destroy();
    }
}

export function engineGalactic(container, isDemo, params) {
    const game = new Galactic(container, isDemo, params, 'geo-galactic');
    game.start();
    return game;
}
