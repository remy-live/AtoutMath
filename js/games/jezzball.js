// JEZZBALL — à l'écran.
//
// Le noyau (core/jezzball.js) porte la grille, les balles et les murs ; ici on
// dessine sur un canvas, on cadence, et on garde au premier plan ce que ce jeu
// enseigne sans le dire : LE POURCENTAGE D'AIRE. La jauge est le score, la
// cible est 75 %, et le robot raconte les coupes en proportions — « couper au
// milieu du reste rapporte moitié moins à chaque fois ».
//
// Un clic (ou un doigt) lance un mur ; le bouton d'orientation dit dans quel
// sens il poussera — pas de clic droit, il n'existe pas sur une tablette.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    creerPartie, avancerBalle, lancerMur, pousserMur, murTouche, casserMur, pourcentage
} from '../core/jezzball.js';

const COMPETENCE = 'mes.aire.proportion';
const CIBLE = 75;

class JezzBall extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'jezzball');
        this.rng = makeRng(this.params.seed);
        this.viesDepart = Number(this.params.vies) || 4;
        this.niveau = 1;
        this.vertical = true;
        this.rafId = null;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .jz-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    width: 100%; height: 100%; padding: 8px; box-sizing: border-box;
                    color: var(--text-main); overflow-y: auto; container-type: inline-size;
                }
                .jz-tete { display: flex; gap: 14px; align-items: center; flex-wrap: wrap;
                    justify-content: center; font-size: .92rem; }
                .jz-jauge { width: min(60cqw, 300px); height: 14px; border: 1.5px solid var(--text-main);
                    border-radius: 999px; overflow: hidden; position: relative; background: var(--bg-panel); }
                .jz-jauge > div { height: 100%; background: var(--primary); transition: width .3s ease; }
                .jz-jauge::after {
                    content: ''; position: absolute; top: -2px; bottom: -2px; left: ${CIBLE}%;
                    width: 2.5px; background: var(--danger, #dc2626);
                }
                .jz-pc { font-weight: 900; min-width: 3.2em; text-align: right; }
                canvas.jz-toile {
                    border: 2.5px solid var(--text-main); border-radius: 10px;
                    width: min(94cqw, 640px); touch-action: none; cursor: crosshair;
                    background: var(--bg-panel); display: block;
                }
                .jz-barre { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; align-items: center; }
                .jz-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700; padding: 7px 13px;
                }
                .jz-btn--sens { border-color: var(--primary); min-width: 130px; }
                .jz-note { min-height: 2.4em; text-align: center; font-size: .88rem;
                    color: var(--text-muted); max-width: 620px; }
                .jz-note--ok { color: var(--success, #16a34a); font-weight: 700; }
                .jz-note--ko { color: var(--danger, #dc2626); font-weight: 600; }
            </style>
            <div class="jz-wrap">
                <div class="jz-tete">
                    <span>Niveau <b data-niveau>1</b></span>
                    <span data-vies></span>
                    <div class="jz-jauge"><div data-jauge></div></div>
                    <span class="jz-pc" data-pc>0 %</span>
                </div>
                <canvas class="jz-toile" data-toile></canvas>
                <div class="jz-barre">
                    <button type="button" class="jz-btn jz-btn--sens" data-sens></button>
                    <button type="button" class="jz-btn" data-neuf>↺ Recommencer</button>
                </div>
                <div class="jz-note" data-note></div>
            </div>`;
        this.toile = this.container.querySelector('[data-toile]');
        this.ctx = this.toile.getContext('2d');
        this.noteEl = this.container.querySelector('[data-note]');
        this.sensEl = this.container.querySelector('[data-sens]');
        this.sensEl.onclick = () => { this.vertical = !this.vertical; this.majSens(); };
        this.container.querySelector('[data-neuf]').onclick = () => { this.niveau = 1; this.poser(); };
        this.toile.onpointerdown = (e) => this.cliquer(e);
        this.majSens();
    }

    majSens() {
        this.sensEl.textContent = this.vertical ? '↕ Mur vertical' : '↔ Mur horizontal';
    }

    startGameLoop() {
        this.vies = this.viesDepart;
        this.poser();
        this.boucle();
    }

    poser() {
        // Le terrain grandit peu, le nombre de balles surtout : c'est lui qui
        // fait la difficulté.
        this.p = creerPartie(26, 17, Math.min(6, 1 + this.niveau), this.rng);
        this.majTete();
        this.note(`Coupe le terrain : il faut conquérir ${CIBLE} % de l'aire. `
            + 'Chaque région fermée SANS balle est gagnée.');
        return true;
    }

    majTete() {
        const pc = pourcentage(this.p);
        this.container.querySelector('[data-niveau]').textContent = String(this.niveau);
        this.container.querySelector('[data-vies]').textContent =
            '❤️'.repeat(Math.max(0, this.vies)) + '🖤'.repeat(Math.max(0, this.viesDepart - this.vies));
        this.container.querySelector('[data-jauge]').style.width = `${pc}%`;
        this.container.querySelector('[data-pc]').textContent = `${pc} %`;
    }

    cliquer(e) {
        if (this.isDemo || !this.p || this.finie) return;
        const r = this.toile.getBoundingClientRect();
        const x = Math.floor((e.clientX - r.left) / r.width * this.p.cols);
        const y = Math.floor((e.clientY - r.top) / r.height * this.p.lignes);
        lancerMur(this.p, x, y, this.vertical);
    }

    // --- La cadence -----------------------------------------------------------

    boucle() {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        let dernierPas = 0;
        const pas = (t) => {
            this.rafId = requestAnimationFrame(pas);
            if (!this.isRunning || !this.p || this.finie) return;
            if (t - dernierPas < 24) return;
            dernierPas = t;
            this.p.balles.forEach(b => avancerBalle(this.p, b));
            // Le mur pousse une case sur deux pas : la balle a sa chance.
            this.compteur = (this.compteur || 0) + 1;
            const mur = this.p.murs[0];
            if (mur) {
                if (murTouche(this.p, mur)) {
                    casserMur(this.p, mur);
                    this.vies--;
                    this.majTete();
                    this.note('💥 Une balle a touché le mur pendant qu\'il poussait : il est perdu, et une vie avec.', 'ko');
                    if (this.vies <= 0) return this.perdu();
                } else if (this.compteur % 2 === 0) {
                    const etat = pousserMur(this.p, mur);
                    if (etat === 'fini') this.apresMur();
                }
            }
            this.dessiner();
        };
        this.rafId = requestAnimationFrame(pas);
    }

    apresMur() {
        const pc = pourcentage(this.p);
        this.majTete();
        if (pc >= CIBLE) {
            this.note(`✅ ${pc} % conquis : c'est plus que les ${CIBLE} % demandés. Niveau suivant !`, 'ok');
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: `Conquérir ${CIBLE} % de l'aire (niveau ${this.niveau})`,
                expected: `≥ ${CIBLE} %`, given: `${pc} %`,
                points: 8 + this.niveau * 3
            });
            this.niveau++;
            setTimeout(() => { if (this.isRunning) this.poser(); }, 1600);
        } else {
            this.note(`${pc} % conquis — il en faut ${CIBLE}. Encore ${CIBLE - pc} points à gagner.`);
        }
    }

    perdu() {
        this.note(`Plus de vies. Tu avais conquis ${pourcentage(this.p)} % — on repart au niveau 1.`, 'ko');
        this.onWrongAnswer(null, {
            concept: COMPETENCE,
            questionText: `Conquérir ${CIBLE} % de l'aire`,
            input: `${pourcentage(this.p)} %`,
            expected: `${CIBLE} %`,
            customMessage: 'Lance tes murs LOIN des balles : un mur touché pendant qu\'il pousse est perdu.',
            silencieux: true
        });
        this.vies = this.viesDepart;
        this.niveau = 1;
        setTimeout(() => { if (this.isRunning) this.poser(); }, 1800);
    }

    // --- Le dessin --------------------------------------------------------------

    dessiner() {
        const p = this.p;
        const W = 640, H = Math.round(640 * p.lignes / p.cols);
        if (this.toile.width !== W) { this.toile.width = W; this.toile.height = H; }
        const cw = W / p.cols, ch = H / p.lignes;
        const cs = getComputedStyle(this.container);
        this.ctx.clearRect(0, 0, W, H);
        // Le territoire conquis.
        this.ctx.fillStyle = 'rgba(99, 102, 241, .28)';
        for (let i = 0; i < p.cellules.length; i++) {
            if (!p.cellules[i]) continue;
            this.ctx.fillRect((i % p.cols) * cw, Math.floor(i / p.cols) * ch, cw + 0.5, ch + 0.5);
        }
        // Le mur en construction.
        const mur = p.murs[0];
        if (mur) {
            this.ctx.fillStyle = '#f59e0b';
            mur.faites.forEach(c => this.ctx.fillRect(c.x * cw, c.y * ch, cw + 0.5, ch + 0.5));
        }
        // Les balles.
        this.ctx.fillStyle = cs.getPropertyValue('--text-main') || '#1a202c';
        p.balles.forEach(b => {
            this.ctx.beginPath();
            this.ctx.arc(b.x * cw, b.y * ch, b.rayon * cw, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.majTete();
    }

    showNext() { this.niveau = 1; return this.poser(); }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'jz-note' + (ton ? ` jz-note--${ton}` : '');
    }

    // --- La démonstration ---------------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.p) this.poser();
        if (!await cur.pause(600) || !this.isRunning) return fin();
        cur.say(`La jauge est un POURCENTAGE d'aire : la part du terrain déjà conquise. `
            + `Le trait rouge marque la cible, ${CIBLE} %.`, this.container.querySelector('.jz-jauge'));
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Je lance un mur LOIN des balles : il pousse des deux côtés, et s\'il arrive au bout '
            + 'sans être touché, toute région sans balle est conquise.', this.toile);
        // Un mur dans le tiers le plus vide.
        const x = this.p.balles.every(b => b.x > this.p.cols / 2) ? 4 : this.p.cols - 5;
        lancerMur(this.p, x, Math.floor(this.p.lignes / 2), true);
        if (!await cur.pause(2600) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        const pc = pourcentage(this.p);
        cur.say(`${pc} % : chaque coupe se lit en proportion. Couper le reste en deux rapporte `
            + `la moitié de ce qui reste — c'est pour ça que la fin est plus dure que le début.`,
            this.container.querySelector('[data-pc]'));
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineJezzBall(container, isDemo, params) {
    const jeu = new JezzBall(container, isDemo, params);
    jeu.start();
    return jeu;
}
