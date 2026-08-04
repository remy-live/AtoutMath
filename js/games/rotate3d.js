// Solides 3D : orienter un solide par quarts de tour.
//
// Porté depuis l'ancien projet (imports/maths-legacy/games/rotate) et
// modernisé. Un mur troué approche : le trou a la forme du solide dans UNE
// orientation précise (la silhouette en pointillés). Chaque bouton applique un
// quart de tour (90°) autour d'un axe — basculer, pivoter, tourner — et il
// faut superposer son solide à la silhouette avant l'impact. C'est de la
// vision dans l'espace pure : anticiper mentalement l'effet d'une rotation.
//
// Modernisations : rotations par quarts de tour animés (l'original tournait
// en continu, difficile à raisonner), et vérification par SUPERPOSITION des
// sommets — deux orientations visuellement identiques (symétrie du solide)
// sont toutes deux acceptées, là où l'original exigeait des angles exacts et
// refusait des solides pourtant bien alignés.
//
// Chaque impact est une tentative sur geo.espace.orientation : réussite si le
// solide passe, sinon une erreur expliquée (quels quarts de tour il fallait).
// Le robot lit la silhouette, annonce les rotations nécessaires et appuie sur
// les boutons — pause et pas-à-pas compris.

import { BaseGame } from '../core/BaseGame.js';
import { regTimeout } from '../core/timers.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';

const SKILL = 'geo.espace.orientation';

const FORMES = {
    pave: {
        nom: 'le pavé droit',
        v: [[-0.5, -1.5, -0.5], [0.5, -1.5, -0.5], [0.5, 1.5, -0.5], [-0.5, 1.5, -0.5],
            [-0.5, -1.5, 0.5], [0.5, -1.5, 0.5], [0.5, 1.5, 0.5], [-0.5, 1.5, 0.5]],
        f: [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [0, 3, 7, 4], [1, 2, 6, 5]]
    },
    pyramide: {
        nom: 'la pyramide',
        v: [[-1, 0.9, -1], [1, 0.9, -1], [1, 0.9, 1], [-1, 0.9, 1], [0, -1.1, 0]],
        f: [[0, 1, 2, 3], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]]
    },
    arche: {
        nom: 'la pièce en L',
        v: [[-0.7, -1.05, -0.5], [0.7, -1.05, -0.5], [0.7, -0.35, -0.5], [0, -0.35, -0.5], [0, 1.05, -0.5], [-0.7, 1.05, -0.5],
            [-0.7, -1.05, 0.5], [0.7, -1.05, 0.5], [0.7, -0.35, 0.5], [0, -0.35, 0.5], [0, 1.05, 0.5], [-0.7, 1.05, 0.5]],
        f: [[0, 1, 2, 3, 4, 5], [6, 7, 8, 9, 10, 11],
            [0, 1, 7, 6], [1, 2, 8, 7], [2, 3, 9, 8], [3, 4, 10, 9], [4, 5, 11, 10], [5, 0, 6, 11]]
    }
};

// Les gestes possibles : axe, sens, bouton associé et façon d'en parler.
const GESTES = {
    bas: { axe: 'x', signe: 1, icone: '⬇', phrase: 'un quart de tour en basculant vers l\'avant (⬇)' },
    haut: { axe: 'x', signe: -1, icone: '⬆', phrase: 'un quart de tour en basculant vers l\'arrière (⬆)' },
    horaire: { axe: 'z', signe: -1, icone: '↻', phrase: 'un quart de tour dans le sens des aiguilles (↻)' },
    antihoraire: { axe: 'z', signe: 1, icone: '↺', phrase: 'un quart de tour dans le sens inverse des aiguilles (↺)' },
    gauche: { axe: 'y', signe: 1, icone: '⬅', phrase: 'un quart de tour en pivotant vers la gauche (⬅)' },
    droite: { axe: 'y', signe: -1, icone: '➡', phrase: 'un quart de tour en pivotant vers la droite (➡)' }
};

// --- Petites matrices 3×3 ---------------------------------------------------

const M_ID = [1, 0, 0, 0, 1, 0, 0, 0, 1];

function matAxe(axe, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    if (axe === 'x') return [1, 0, 0, 0, c, -s, 0, s, c];
    if (axe === 'y') return [c, 0, s, 0, 1, 0, -s, 0, c];
    return [c, -s, 0, s, c, 0, 0, 0, 1];
}

function matMul(a, b) {
    const r = new Array(9);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
    }
    return r;
}

function matApp(m, v) {
    return [
        m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
        m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
        m[6] * v[0] + m[7] * v[1] + m[8] * v[2]
    ];
}

class Rotate3D extends BaseGame {
    render() {
        this.vitesse = parseInt(this.params.speed) || 1;
        this.choixForme = this.params.forme || 'toutes';
        this.score = 0;
        this.manche = 0;

        this.container.innerHTML = `
            <style>
                .rot-wrap { height: 100%; display: flex; flex-direction: column; background: #22303f; font-family: 'Outfit', sans-serif; overflow: auto; }
                .rot-hud { display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; color: #fff; font-weight: 700; flex-wrap: wrap; gap: 6px; }
                .rot-etat { font-weight: 900; letter-spacing: 1px; }
                .rot-scene { position: relative; flex: 1; min-height: 260px; display: flex; align-items: center; justify-content: center; }
                .rot-canvas { width: 100%; height: 100%; display: block; }
                .rot-pad { position: absolute; bottom: 12px; right: 12px; display: grid; grid-template-columns: repeat(3, 46px); gap: 6px; background: rgba(0,0,0,.35); padding: 10px; border-radius: 16px; }
                .rot-btn { width: 46px; height: 46px; border-radius: 50%; border: none; background: #fff; font-size: 1.25rem; cursor: pointer; box-shadow: 0 3px 0 #97a4b1; display: flex; align-items: center; justify-content: center; }
                .rot-btn:active { transform: translateY(3px); box-shadow: none; }
                .rot-hint { text-align: center; color: #8fa3b8; font-size: .82rem; padding: 4px 10px calc(6px + env(safe-area-inset-bottom, 0px)); }
                .rot-msg { position: absolute; top: 10px; left: 0; width: 100%; text-align: center; color: #fff; font-weight: 900; font-size: 1.3rem; text-shadow: 0 2px 8px rgba(0,0,0,.6); pointer-events: none; }
            </style>
            <div class="rot-wrap">
                <div class="rot-hud">
                    <span>Score : <b data-score>0</b></span>
                    <span class="rot-etat" data-etat>AJUSTE…</span>
                </div>
                <div class="rot-scene">
                    <canvas class="rot-canvas" width="600" height="400"></canvas>
                    <div class="rot-msg" data-msg></div>
                    <div class="rot-pad" data-pad>
                        <span></span><button type="button" class="rot-btn" data-geste="haut">⬆</button><span></span>
                        <button type="button" class="rot-btn" data-geste="gauche">⬅</button>
                        <button type="button" class="rot-btn" data-geste="bas">⬇</button>
                        <button type="button" class="rot-btn" data-geste="droite">➡</button>
                        <button type="button" class="rot-btn" data-geste="antihoraire">↺</button>
                        <span></span>
                        <button type="button" class="rot-btn" data-geste="horaire">↻</button>
                    </div>
                </div>
                <div class="rot-hint">Chaque bouton = un quart de tour (90°). Superpose ton solide à la silhouette avant l'impact ! Clavier : flèches (⬆⬇⬅➡).</div>
            </div>`;

        this.canvas = this.container.querySelector('.rot-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ui = {
            score: this.container.querySelector('[data-score]'),
            etat: this.container.querySelector('[data-etat]'),
            msg: this.container.querySelector('[data-msg]')
        };

        this.container.querySelectorAll('[data-geste]').forEach(b => {
            b.addEventListener('click', () => { if (!this.isDemo) this.tourner(b.dataset.geste); });
        });
        this.onKey = (e) => {
            if (this.isDemo) return;
            const carte = { ArrowUp: 'haut', ArrowDown: 'bas', ArrowLeft: 'gauche', ArrowRight: 'droite' };
            if (carte[e.key]) { e.preventDefault(); this.tourner(carte[e.key]); }
        };
        document.addEventListener('keydown', this.onKey);

        this.orient = M_ID;
        this.anim = null;
        this.enTransit = false;
        this.demoFonce = false;
    }

    startGameLoop() {
        this.nouvelleManche();
        this.boucle();
    }

    // --- Manches ------------------------------------------------------------

    nouvelleManche() {
        this.manche++;
        this.orient = M_ID;
        this.anim = null;
        this.murZ = 800;
        this.enTransit = false;
        this.demoFonce = false;

        const cles = this.choixForme !== 'toutes' && FORMES[this.choixForme]
            ? [this.choixForme] : Object.keys(FORMES);
        this.formeCle = cles[Math.floor(Math.random() * cles.length)];
        this.forme = FORMES[this.formeCle];

        // La cible : un ou deux quarts de tour, décrits pour pouvoir en parler
        // (au robot comme dans les explications d'erreur).
        const simples = ['bas', 'haut', 'horaire', 'antihoraire'];
        this.cibleSeq = [simples[Math.floor(Math.random() * simples.length)]];
        if (this.score >= 300 && Math.random() < 0.6) {
            const autres = simples.filter(g => GESTES[g].axe !== GESTES[this.cibleSeq[0]].axe);
            this.cibleSeq.push(autres[Math.floor(Math.random() * autres.length)]);
        }
        this.cibleMat = this.cibleSeq.reduce(
            (m, g) => matMul(matAxe(GESTES[g].axe, GESTES[g].signe * Math.PI / 2), m), M_ID);

        this.ui.msg.textContent = '';
    }

    descriptionCible() {
        return this.cibleSeq.map(g => GESTES[g].phrase).join(', puis ');
    }

    tourner(geste) {
        if (!this.isRunning || this.anim || this.enTransit) return;
        const g = GESTES[geste];
        this.anim = { axe: g.axe, signe: g.signe, depart: performance.now(), duree: 240 };
    }

    // Superposition : chaque sommet de la cible doit être recouvert par un
    // sommet du solide (à tolérance près). Deux orientations que l'œil ne
    // distingue pas — symétrie du solide — sont ainsi toutes deux justes.
    estAligne() {
        const joueur = this.forme.v.map(v => matApp(this.orient, v));
        const cible = this.forme.v.map(v => matApp(this.cibleMat, v));
        const libres = [...joueur];
        for (const c of cible) {
            const i = libres.findIndex(p =>
                Math.abs(p[0] - c[0]) + Math.abs(p[1] - c[1]) + Math.abs(p[2] - c[2]) < 0.2);
            if (i === -1) return false;
            libres.splice(i, 1);
        }
        return true;
    }

    // --- Boucle -------------------------------------------------------------

    boucle() {
        if (!this.isRunning) return;

        if (this.anim) {
            const t = (performance.now() - this.anim.depart) / this.anim.duree;
            if (t >= 1) {
                this.orient = matMul(matAxe(this.anim.axe, this.anim.signe * Math.PI / 2), this.orient);
                this.anim = null;
            }
        }

        const aligne = !this.anim && this.estAligne();
        this.ui.etat.textContent = aligne ? 'ALIGNÉ ✔' : 'AJUSTE…';
        this.ui.etat.style.color = aligne ? '#51cf66' : '#ffd43b';

        if (!this.enTransit) {
            if (this.isDemo) {
                if (this.demoFonce) this.murZ -= 14;
            } else {
                this.murZ -= this.vitesse * (1.4 + this.score / 800);
            }
            if (this.murZ <= 0) this.impact(aligne);
        }

        this.dessiner(aligne);
        this.rafId = requestAnimationFrame(() => this.boucle());
    }

    impact(aligne) {
        this.enTransit = true;
        if (aligne) {
            this.score += 100;
            this.ui.score.textContent = this.score;
            this.ui.msg.textContent = 'PASSÉ !';
            this.ui.msg.style.color = '#51cf66';
            this.onCorrectAnswer(null, SKILL, {
                points: 20,
                questionText: `Orienter ${this.forme.nom} comme la silhouette`,
                given: 'solide superposé à la cible', expected: this.descriptionCible()
            });
            regTimeout(() => { if (this.isRunning) this.nouvelleManche(); }, 1100);
        } else {
            this.ui.msg.textContent = 'CRASH !';
            this.ui.msg.style.color = '#ff6b6b';
            this.onWrongAnswer(null, {
                questionText: `Orienter ${this.forme.nom} comme la silhouette`,
                input: 'solide mal orienté', expected: this.descriptionCible(),
                concept: SKILL,
                customMessage: `Depuis la position de départ, il fallait ${this.descriptionCible()}. Compare ton solide à la silhouette en pointillés AVANT d'appuyer : imagine le mouvement dans ta tête, chaque bouton fait exactement un quart de tour (90°).`
            });
            regTimeout(() => { if (this.isRunning) this.nouvelleManche(); }, 1600);
        }
    }

    // --- Dessin -------------------------------------------------------------

    matriceCourante() {
        if (!this.anim) return this.orient;
        const t = Math.min(1, (performance.now() - this.anim.depart) / this.anim.duree);
        const angle = this.anim.signe * (Math.PI / 2) * t;
        return matMul(matAxe(this.anim.axe, angle), this.orient);
    }

    dessiner(aligne) {
        const ctx = this.ctx;
        ctx.fillStyle = '#22303f';
        ctx.fillRect(0, 0, 600, 400);

        const centre = { x: 300, y: 200 };
        const perspective = 1000 / (this.murZ + 200);

        // Le mur : un voile qui s'opacifie en approchant, et la silhouette
        // cible en pointillés, à l'échelle de la distance.
        ctx.fillStyle = `rgba(120, 137, 154, ${Math.min(0.85, perspective * 0.55)})`;
        ctx.fillRect(0, 0, 600, 400);
        ctx.strokeStyle = aligne ? '#51cf66' : '#fff';
        ctx.lineWidth = Math.min(6, 3 * perspective);
        ctx.setLineDash([10, 8]);
        this.tracer(ctx, this.cibleMat, centre, 100 * perspective);
        ctx.setLineDash([]);

        // Le solide du joueur.
        ctx.strokeStyle = '#4dabf7';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.fillStyle = 'rgba(77, 171, 247, 0.16)';
        this.tracer(ctx, this.matriceCourante(), centre, 100, true);
    }

    tracer(ctx, mat, centre, echelle, remplir) {
        for (const face of this.forme.f) {
            ctx.beginPath();
            face.forEach((iv, j) => {
                const v = matApp(mat, this.forme.v[iv]);
                const x = centre.x + v[0] * echelle;
                const y = centre.y + v[1] * echelle;
                if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
            ctx.closePath();
            if (remplir) ctx.fill();
            ctx.stroke();
        }
    }

    // --- Robot : il lit la silhouette et compte les quarts de tour ----------

    async runDemoSequence() {
        this.startGameLoop();
        const cursor = createDemoCursor();
        this.demoCursor = cursor;
        const gate = createDemoGate(this.container.querySelector('.rot-hint'));
        const fin = () => { cursor.hideBubble(); gate.destroy(); };

        if (!await cursor.pause(1400) || !this.isRunning) return fin();

        while (this.isRunning && this.isDemo) {
            if (this.enTransit || this.demoFonce) { await cursor.pause(500); continue; }
            if (!await gate.waitTurn() || !this.isRunning) return fin();

            const pad = this.container.querySelector('[data-pad]');
            cursor.say(`Je compare ${this.forme.nom} à la silhouette en pointillés : il faut ${this.descriptionCible()}.`, pad);
            if (!await cursor.pause(2600) || !this.isRunning) return fin();

            for (const geste of this.cibleSeq) {
                const btn = this.container.querySelector(`[data-geste="${geste}"]`);
                if (!btn || !await cursor.tap(btn, 300)) return fin();
                this.tourner(geste);
                if (!await cursor.pause(500) || !this.isRunning) return fin();
            }

            cursor.say(`Les arêtes se superposent : ALIGNÉ ✔. Le solide va passer dans le trou !`, pad);
            if (!await cursor.pause(1800) || !this.isRunning) return fin();
            cursor.hideBubble();
            this.demoFonce = true;
            if (!await cursor.pause(DEMO_SPEED.between + 1200) || !this.isRunning) return fin();
        }
        fin();
    }

    destroy() {
        if (this.demoCursor) { this.demoCursor.destroy(); this.demoCursor = null; }
        document.removeEventListener('keydown', this.onKey);
        super.destroy();
    }
}

export function engineRotate3D(container, isDemo, params) {
    const game = new Rotate3D(container, isDemo, params, 'geo-rotate3d');
    game.start();
    return game;
}
