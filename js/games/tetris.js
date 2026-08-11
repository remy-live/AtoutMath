import { BaseGame } from '../core/BaseGame.js';
import { state } from '../core/state.js';
import { createDemoGate, createDemoCursor, dureeDemo } from '../core/demoPointer.js';

export function engineTetris(container, isDemo, params) {
    const game = new Tetris(container, isDemo, params);
    game.start();
    return game;
}

const COLORS = [
    null,
    '#ff9ff3', // 1: Pink
    '#feca57', // 2: Yellow/Orange
    '#ff6b6b', // 3: Coral Red
    '#48dbfb', // 4: Cyan
    '#1dd1a1', // 5: Mint Green
    '#00d2d3', // 6: Teal
    '#54a0ff', // 7: Sky Blue
    '#5f27cd', // 8: Purple
    '#c8d6e5'  // 9: Light Slate
];

function drawRoundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

class Tetris extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params);
        
        // Une grille de 10 × 20, c'est la mesure du Tetris d'arcade — où les
        // cases sont des FORMES qu'on reconnaît de loin. Ici chaque case porte
        // un CHIFFRE qu'il faut lire, et deux cents cases sur un téléphone
        // donnaient des cases de 20 px : illisibles. 8 × 14, c'est presque
        // deux fois moins de cases, donc des cases presque deux fois plus
        // grandes — et il en reste largement assez pour manœuvrer.
        this.COLS = 8;
        this.ROWS = 14;
        this.BLOCK_SIZE = 30;      // recalculé par dimensionner()

        this.grid = [];
        this.score = 0;
        this.dropCounter = 0;
        this.dropInterval = this.params.speed || 1000;
        this.lastTime = 0;
        this.currentTarget = 12;
        this.gameRunning = false;
        
        this.player = { pos: {x: 0, y: 0}, matrix: null, score: 0 };
        this.nextPieceMatrix = null;
        this.particles = [];
        
        this.rafId = null;
        
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.loop = this.loop.bind(this);
    }

    render() {
        this.container.innerHTML = `
            <style>
                .tetris-wrapper {
                    position: absolute; inset: 0; display: flex;
                    background: var(--bg-app); color: var(--text-main); overflow: hidden; touch-action: none;
                    font-family: var(--font-main, 'Outfit', sans-serif);
                }
                /* Trois zones, une seule grille. Le plateau prend TOUT ce qui
                   reste : c'est lui qu'on regarde, pas les panneaux. */
                .tetris-container {
                    display: grid; flex: 1; min-width: 0; min-height: 0;
                    gap: 10px; padding: 10px; box-sizing: border-box;
                    grid-template-columns: minmax(0, 1fr) 168px;
                    grid-template-rows: minmax(0, 1fr) auto;
                    grid-template-areas: "plateau infos" "plateau pad";
                }
                .tetris-canvas-area {
                    grid-area: plateau; position: relative;
                    display: flex; align-items: center; justify-content: center;
                    min-width: 0; min-height: 0;
                }
                .tetris-canvas-area canvas {
                    display: block; border-radius: 12px;
                    background: var(--bg-panel);
                    border: 2px solid var(--border);
                    box-shadow: inset 0 4px 12px rgba(0,0,0,.06);
                }
                .tetris-infos {
                    grid-area: infos; display: flex; flex-direction: column; gap: 10px;
                    min-width: 0; min-height: 0;
                }
                .tetris-panel {
                    background: var(--bg-panel); padding: 10px 8px; border: 1px solid var(--border);
                    border-radius: 12px; text-align: center; box-shadow: var(--shadow-sm);
                }
                .tetris-panel h2 { margin: 0 0 2px 0; font-size: .72rem; color: var(--text-muted);
                    text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
                .tetris-value { font-size: 2rem; color: var(--primary); font-weight: 800; line-height: 1;
                    font-variant-numeric: tabular-nums; }
                #tetris-target-val { color: var(--warning); font-size: 2.8rem;
                    transition: transform .2s cubic-bezier(.175,.885,.32,1.275); }
                #tetris-next-cvs { display: block; margin: 0 auto; }

                /* Le pavé. Les boutons faisaient 26 × 34 px sur téléphone —
                   sous le seuil de ce qu'un doigt vise sans se tromper. Ils
                   remplissent maintenant la largeur qu'on leur donne, avec un
                   minimum de 48 px, et se répètent quand on reste appuyé. */
                .tetris-pad { grid-area: pad; display: flex; flex-direction: column; gap: 8px; }
                .tetris-pad-row { display: flex; gap: 8px; }
                .tetris-pad-btn {
                    flex: 1; min-width: 48px; height: 52px; border-radius: 12px;
                    background: var(--bg-panel); border: 2px solid var(--primary); color: var(--primary);
                    font-size: 1.4rem; font-weight: 900; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    user-select: none; -webkit-user-select: none; touch-action: manipulation;
                    box-shadow: 0 3px 0 color-mix(in srgb, var(--primary) 45%, #000 10%); font-family: inherit;
                }
                .tetris-pad-btn:active { background: var(--primary); color: #fff;
                    transform: translateY(3px); box-shadow: none; }
                .tetris-pad-btn--chute { font-size: 1.05rem; letter-spacing: .5px; }

                .tetris-overlay {
                    position: absolute; inset: 0; background: rgba(2,6,23,.9); backdrop-filter: blur(4px);
                    display: flex; flex-direction: column; justify-content: center; align-items: center;
                    z-index: 10; padding: 18px; text-align: center;
                }
                .tetris-start-btn {
                    background: var(--primary); color: #fff; border: none; padding: 14px 38px; border-radius: 30px;
                    font-weight: 800; font-size: 1.35rem; cursor: pointer; margin-top: 22px; transition: .2s;
                    box-shadow: 0 4px 15px rgba(0,0,0,.25); text-transform: uppercase; letter-spacing: 1px;
                    font-family: inherit;
                }
                .tetris-start-btn:hover { transform: scale(1.05); filter: brightness(1.1); }
                .tetris-hidden { display: none !important; }
                .tetris-regle { display: flex; align-items: center; gap: 10px; margin-top: 14px;
                    color: #e2e8f0; font-weight: 700; font-size: 1.05rem; }
                .tetris-demo-bloc {
                    width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center;
                    justify-content: center; font-weight: 900; font-size: 1.3rem; color: #1c2833;
                }

                /* Écran haut et étroit (téléphone) : la colonne de droite
                   passe au-dessus et au-dessous du plateau, et le pavé occupe
                   toute la largeur — là où est le pouce. */
                @media (max-width: 720px), (max-aspect-ratio: 3/4) {
                    .tetris-container {
                        grid-template-columns: minmax(0, 1fr);
                        grid-template-rows: auto minmax(0, 1fr) auto;
                        grid-template-areas: "infos" "plateau" "pad";
                        gap: 8px; padding: 8px;
                    }
                    .tetris-infos { flex-direction: row; align-items: stretch; }
                    .tetris-infos .tetris-panel { flex: 1; padding: 6px 4px; }
                    .tetris-panel h2 { font-size: .62rem; }
                    .tetris-value { font-size: 1.6rem; }
                    #tetris-target-val { font-size: 2rem; }
                }

                /* Téléphone couché : 390 px de haut pour un plateau, trois
                   panneaux et un pavé. La colonne de droite débordait — le
                   score passait sous l'écran et le pavé recouvrait l'aperçu.
                   Les panneaux se mettent côte à côte, et l'aperçu « suivant »
                   cède : c'est le seul dont on peut se passer. */
                @media (max-height: 520px) {
                    .tetris-container { grid-template-columns: minmax(0, 1fr) 200px; gap: 8px; padding: 8px; }
                    .tetris-infos { flex-direction: row; align-items: flex-start; }
                    .tetris-infos .tetris-panel { flex: 1; padding: 6px 4px; }
                    .tetris-panel--suivant { display: none; }
                    .tetris-panel h2 { font-size: .6rem; }
                    .tetris-value { font-size: 1.4rem; }
                    #tetris-target-val { font-size: 1.8rem; }
                    .tetris-pad-btn { height: 46px; }
                }
            </style>

            <div class="tetris-wrapper" id="tetris-wrapper">
                <div class="tetris-container">
                    <div class="tetris-canvas-area">
                        <canvas id="tetris-cvs"></canvas>
                    </div>

                    <div class="tetris-infos">
                        <div class="tetris-panel">
                            <h2>Cible</h2>
                            <div id="tetris-target-val" class="tetris-value">?</div>
                        </div>
                        <div class="tetris-panel tetris-panel--suivant">
                            <h2>Suivant</h2>
                            <canvas id="tetris-next-cvs" width="64" height="112"></canvas>
                        </div>
                        <div class="tetris-panel">
                            <h2>Score</h2>
                            <div id="tetris-score-val" class="tetris-value">0</div>
                        </div>
                    </div>

                    <div class="tetris-pad">
                        <div class="tetris-pad-row">
                            <button type="button" class="tetris-pad-btn" data-pad="left" aria-label="Déplacer à gauche">◀</button>
                            <button type="button" class="tetris-pad-btn" data-pad="rot" aria-label="Tourner la pièce">⟳</button>
                            <button type="button" class="tetris-pad-btn" data-pad="right" aria-label="Déplacer à droite">▶</button>
                        </div>
                        <div class="tetris-pad-row">
                            <button type="button" class="tetris-pad-btn tetris-pad-btn--chute" data-pad="chute"
                                    aria-label="Faire tomber la pièce d'un coup">▼ POSER ▼</button>
                        </div>
                    </div>

                    <div id="tetris-start-screen" class="tetris-overlay">
                        <h1 style="font-size: 2.4rem; color: var(--primary); margin: 0;">MATH TETRIS</h1>
                        <p style="font-size: 1.05rem; color: #fff; margin: 10px 0 0;">
                            Colle deux chiffres dont le PRODUIT fait la cible.</p>
                        <div class="tetris-regle">
                            <span class="tetris-demo-bloc" style="background:#48dbfb">3</span>
                            <span style="color:#94a3b8">×</span>
                            <span class="tetris-demo-bloc" style="background:#1dd1a1">4</span>
                            <span style="color:#94a3b8">=</span>
                            <span style="color: var(--warning); font-size: 1.5rem; font-weight: 900">12</span>
                        </div>
                        <p style="color:#94a3b8; margin: 12px 0 0; font-size: .9rem;">
                            Glisse la pièce du doigt · tape pour la tourner</p>
                        <button class="tetris-start-btn" id="tetris-btn-play">Jouer</button>
                    </div>

                    <div id="tetris-game-over" class="tetris-overlay tetris-hidden">
                        <h1 style="color: var(--danger); margin: 0;">PERDU !</h1>
                        <p style="font-size: 1.5rem; color: #fff;">Score : <span id="tetris-final-score">0</span></p>
                        <button class="tetris-start-btn" id="tetris-btn-replay">Rejouer</button>
                    </div>
                </div>
            </div>
        `;
    }

    startGameLoop() {
        this.cvs = this.container.querySelector('#tetris-cvs');
        this.ctx = this.cvs.getContext('2d');
        this.nextCvs = this.container.querySelector('#tetris-next-cvs');
        this.nextCtx = this.nextCvs.getContext('2d');

        this.dimensionner();
        this.onResize = () => { this.dimensionner(); this.draw(); this.drawNextPiece(); };
        window.addEventListener('resize', this.onResize);
        // La mise en page n'est pas encore stabilisée au montage : mesurée
        // trop tôt, la zone de jeu rendait une taille provisoire et le plateau
        // restait plus petit que la place réellement disponible. On observe le
        // cadre — il change aussi quand la barre du robot apparaît.
        if (typeof ResizeObserver === 'function') {
            this.observateur = new ResizeObserver(() => {
                if (!this.cvs || !this.cvs.isConnected) { this.observateur.disconnect(); return; }
                this.onResize();
            });
            this.observateur.observe(this.cvs.parentElement);
        }

        this.setupEventListeners();
    }

    /**
     * La taille d'une case se DÉDUIT de la place disponible.
     *
     * Le canevas était figé à 300 × 600, puis rétréci par la feuille de style :
     * sur un téléphone il finissait à 199 × 397 dans un écran de 390 × 844 —
     * moins d'un quart de la surface, des cases de 20 px, et une grande zone
     * vide en dessous. On mesure maintenant le cadre et on prend tout, en
     * gardant les cases carrées et le rendu net sur les écrans à haute densité.
     */
    dimensionner() {
        if (!this.cvs) return;
        const zone = this.cvs.parentElement;
        const dispo = zone.getBoundingClientRect();
        const largeur = Math.max(80, dispo.width - 4);
        const hauteur = Math.max(120, dispo.height - 4);
        const bs = Math.max(14, Math.floor(Math.min(largeur / this.COLS, hauteur / this.ROWS)));
        this.BLOCK_SIZE = bs;

        const dpr = Math.min(3, window.devicePixelRatio || 1);
        const w = bs * this.COLS, h = bs * this.ROWS;
        this.cvs.width = Math.round(w * dpr);
        this.cvs.height = Math.round(h * dpr);
        this.cvs.style.width = w + 'px';
        this.cvs.style.height = h + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.vueW = w; this.vueH = h;

        // L'aperçu « suivant » : petit sur un téléphone, où chaque pixel de
        // hauteur pris ici est un pixel de moins pour le plateau.
        if (this.nextCvs) {
            const etroit = window.innerWidth <= 720;
            const nw = etroit ? 40 : 60, nh = etroit ? 68 : 104;
            this.nextCvs.width = Math.round(nw * dpr);
            this.nextCvs.height = Math.round(nh * dpr);
            this.nextCvs.style.width = nw + 'px';
            this.nextCvs.style.height = nh + 'px';
            this.nextCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
            this.nextVue = { w: nw, h: nh };
        }
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', this.handleKeyDown);

        this.container.querySelector('#tetris-btn-play').onclick = () => this.startPlay();
        this.container.querySelector('#tetris-btn-replay').onclick = () => this.startPlay();

        // Pavé : `pointerdown` (et non `click`) pour une réponse immédiate au
        // doigt. Rester appuyé RÉPÈTE le geste — sans ça, traverser le plateau
        // demandait sept appuis distincts.
        this.repetitions = new Map();
        const agir = (geste) => {
            if (!this.gameRunning) return;
            if (geste === 'left') this.playerMove(-1);
            else if (geste === 'right') this.playerMove(1);
            else if (geste === 'rot') this.playerRotate();
            else if (geste === 'chute') this.playerHardDrop();
        };
        this.container.querySelectorAll('[data-pad]').forEach(btn => {
            const geste = btn.dataset.pad;
            const relacher = () => {
                const t = this.repetitions.get(btn);
                if (t) { clearTimeout(t.attente); clearInterval(t.rythme); this.repetitions.delete(btn); }
            };
            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                agir(geste);
                // La chute ne se répète pas : elle pose la pièce, un appui
                // maintenu enterrerait les trois suivantes d'affilée.
                if (geste === 'chute') return;
                const t = { attente: null, rythme: null };
                t.attente = setTimeout(() => {
                    t.rythme = setInterval(() => agir(geste), geste === 'rot' ? 260 : 90);
                }, 300);
                this.repetitions.set(btn, t);
            });
            ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev =>
                btn.addEventListener(ev, relacher));
        });

        // Le plateau se joue au DOIGT : on fait glisser la pièce colonne par
        // colonne, on tape pour la tourner, on balaie vers le bas pour la
        // poser. Avant, chaque appui était interprété selon l'endroit touché
        // par rapport à la pièce — il fallait deviner des zones invisibles.
        let geste = null;
        this.cvs.addEventListener('pointerdown', (e) => {
            if (!this.gameRunning) return;
            e.preventDefault();
            this.cvs.setPointerCapture(e.pointerId);
            geste = { x0: e.clientX, y0: e.clientY, colonne0: this.player.pos.x, bouge: 0, t0: performance.now() };
        });
        this.cvs.addEventListener('pointermove', (e) => {
            if (!geste || !this.gameRunning) return;
            const dx = e.clientX - geste.x0, dy = e.clientY - geste.y0;
            geste.bouge = Math.max(geste.bouge, Math.hypot(dx, dy));
            const pas = Math.round(dx / this.BLOCK_SIZE);
            const vise = geste.colonne0 + pas;
            // On vise une COLONNE absolue : le doigt et la pièce restent
            // solidaires, même si un mur a bloqué un déplacement en route.
            while (this.player.pos.x < vise && this.deplacementPossible(1)) this.player.pos.x++;
            while (this.player.pos.x > vise && this.deplacementPossible(-1)) this.player.pos.x--;
            if (dy > this.BLOCK_SIZE * 2.2 && Math.abs(dx) < this.BLOCK_SIZE * 1.5) {
                geste = null;
                this.playerHardDrop();
            }
        });
        const fin = (e) => {
            if (!geste) return;
            const bref = performance.now() - geste.t0 < 350;
            if (bref && geste.bouge < 10 && this.gameRunning) this.playerRotate();
            geste = null;
            if (e && e.pointerId != null && this.cvs.hasPointerCapture(e.pointerId)) {
                this.cvs.releasePointerCapture(e.pointerId);
            }
        };
        this.cvs.addEventListener('pointerup', fin);
        this.cvs.addEventListener('pointercancel', fin);
    }

    /** Le déplacement d'une colonne est-il libre ? (sans le jouer) */
    deplacementPossible(dir) {
        this.player.pos.x += dir;
        const bloque = this.collide(this.grid, this.player);
        this.player.pos.x -= dir;
        return !bloque;
    }

    /** La pièce tombe d'un coup à sa place définitive. */
    playerHardDrop() {
        if (!this.player.matrix) return;
        let chute = 0;
        while (!this.collide(this.grid, this.player)) { this.player.pos.y++; chute++; }
        this.player.pos.y--;
        if (chute > 1) this.score += chute - 1;
        this.merge(this.grid, this.player);
        this.checkMathMatches();
        this.playerReset();
        this.dropCounter = 0;
    }

    /**
     * La démonstration jouait AU HASARD : trois mouvements tirés à pile ou
     * face toutes les 400 ms, sans une phrase. On y voyait des blocs tomber
     * sans jamais comprendre pourquoi certains disparaissaient — c'est-à-dire
     * exactement ce qu'on cherche à expliquer.
     *
     * Le robot cherche maintenant un VRAI coup — une colonne où le chiffre du
     * bas rencontrera un voisin qui complète la cible — et dit à voix haute le
     * calcul qu'il vient de faire.
     */
    runDemoSequence() {
        this.demoGate = createDemoGate(this.container);
        this.demoCursor = createDemoCursor();
        this.startGameLoop();
        this.startPlay();
        this.dropInterval = 900;
        this.jouerDemo();
    }

    async jouerDemo() {
        const cur = this.demoCursor, gate = this.demoGate;
        const fin = () => { cur?.hideBubble(); if (this.demoInterval) clearInterval(this.demoInterval); };
        const vivant = () => this.gameRunning && !this.destroyed;

        if (!await cur.pause(600) || !vivant()) return fin();
        if (!await gate.waitTurn() || !vivant()) return fin();
        cur.say(`La CIBLE, en haut : ${this.currentTarget}. Je dois coller côte à côte deux chiffres dont le PRODUIT fait ${this.currentTarget}.`, this.container);
        if (!await cur.pause(2800) || !vivant()) return fin();

        if (!await gate.waitTurn() || !vivant()) return fin();
        cur.say('Le bloc pâle en bas montre où la pièce va se poser. Je n\'ai qu\'à choisir la colonne, et à la faire tomber.', this.container);
        if (!await cur.pause(2600) || !vivant()) return fin();

        // À partir d'ici le robot joue, et commente chaque coup réfléchi.
        if (!await gate.waitTurn() || !vivant()) return fin();
        cur.say('À moi de jouer : je cherche, pour le chiffre du bas de ma pièce, un voisin qui complète la cible.', this.container);
        this.demoInterval = setInterval(() => {
            if (!this.gameRunning || this.gelDemo) return;
            const coup = this.meilleurCoup();
            if (!coup) return;
            if (this.player.pos.x < coup.colonne) this.playerMove(1);
            else if (this.player.pos.x > coup.colonne) this.playerMove(-1);
            else {
                if (coup.calcul) cur.say(`${coup.calcul} = ${this.currentTarget} : je pose là.`, this.container);
                this.playerHardDrop();
            }
        }, dureeDemo(560));
        if (!await cur.pause(9000) || !vivant()) return fin();

        if (!await gate.waitTurn() || !vivant()) return fin();
        cur.say('Deux blocs qui font la cible disparaissent, la pile retombe et une nouvelle cible arrive. C\'est tout le jeu.', this.container);
        if (!await cur.pause(3000) || !vivant()) return fin();
        fin();
    }

    /**
     * Le coup que joue le robot : pour chaque colonne, on regarde où la pièce
     * se poserait et si le chiffre du bas y trouverait un voisin — dessous ou
     * sur les côtés — dont le produit fait la cible. À défaut, la pile la plus
     * basse, pour ne pas s'enterrer.
     */
    meilleurCoup() {
        const m = this.player.matrix;
        if (!m) return null;
        const bas = m[m.length - 1][0] || m[m.length - 1][m[0].length - 1];
        let repli = { colonne: 0, hauteur: this.ROWS + 1 }, trouve = null;

        for (let x = 0; x <= this.COLS - m[0].length; x++) {
            let y = 0;
            while (!this.collide(this.grid, { matrix: m, pos: { x, y: y + 1 } }) && y < this.ROWS) y++;
            if (this.collide(this.grid, { matrix: m, pos: { x, y } })) continue;
            const ligne = y + m.length - 1;          // ligne du chiffre du bas
            const voisins = [
                this.grid[ligne + 1] ? this.grid[ligne + 1][x] : 0,
                this.grid[ligne] ? this.grid[ligne][x - 1] : 0,
                this.grid[ligne] ? this.grid[ligne][x + 1] : 0
            ];
            const v = voisins.find(n => n && n * bas === this.currentTarget);
            if (v && !trouve) trouve = { colonne: x, calcul: `${bas} × ${v}` };
            if (ligne < repli.hauteur) repli = { colonne: x, hauteur: ligne };
        }
        // La pièce se suffit à elle-même : ses deux chiffres font la cible.
        if (!trouve && m.length === 2 && m[0][0] * m[1][0] === this.currentTarget) {
            return { colonne: repli.colonne, calcul: `${m[0][0]} × ${m[1][0]}` };
        }
        return trouve || { colonne: repli.colonne, calcul: null };
    }

    startPlay() {
        this.container.querySelector('#tetris-start-screen').classList.add('tetris-hidden');
        this.container.querySelector('#tetris-game-over').classList.add('tetris-hidden');
        
        this.grid = this.initGrid();
        this.score = 0;
        this.particles = [];
        this.container.querySelector('#tetris-score-val').innerText = '0';
        this.generateTarget();
        this.playerReset();
        
        this.gameRunning = true;
        this.lastTime = 0;
        this.dropCounter = 0;
        
        if(this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = requestAnimationFrame(this.loop);
    }

    quitGame() {
        this.gameRunning = false;
        if(this.rafId) cancelAnimationFrame(this.rafId);
        this.destroy();
        this.onCorrectAnswer(null); // Return to sequence/menu
    }

    initGrid() {
        return Array.from({length: this.ROWS}, () => Array(this.COLS).fill(0));
    }

    createPiece() {
        let val1, val2;
        if (Math.random() < 0.4) {
             let factors = [];
             for(let i=1; i<=9; i++) {
                 if (this.currentTarget % i === 0 && (this.currentTarget/i) <= 9) factors.push(i);
             }
             if (factors.length > 0) {
                 val1 = factors[Math.floor(Math.random() * factors.length)];
             } else {
                 val1 = Math.floor(Math.random() * 9) + 1;
             }
        } else {
            val1 = Math.floor(Math.random() * 9) + 1;
        }
        val2 = Math.floor(Math.random() * 9) + 1;
        return [[val1], [val2]];
    }

    generateTarget() {
        let possibleTargets = [];
        const tables = this.params.tables || [2,3,4,5,6,7,8,9,10];
        
        tables.forEach(t => {
            if (t <= 9) { // Tetris blocks only go up to 9
                for(let i=1; i<=9; i++) {
                    let prod = t * i;
                    // Exclude trivial products like 1*1=1, 2*1=2 to keep it interesting
                    if (prod > 3 && !possibleTargets.includes(prod)) {
                        possibleTargets.push(prod);
                    }
                }
            }
        });
        
        if(possibleTargets.length === 0) possibleTargets = [12, 18, 24, 36, 42];
        this.currentTarget = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
        
        const el = this.container.querySelector('#tetris-target-val');
        el.innerText = this.currentTarget;
        el.style.transform = "scale(1.5)";
        setTimeout(() => { if(el) el.style.transform = "scale(1)"; }, 200);
    }

    playerReset() {
        if (this.nextPieceMatrix === null) this.nextPieceMatrix = this.createPiece();
        
        this.player.matrix = this.nextPieceMatrix;
        this.nextPieceMatrix = this.createPiece();
        this.drawNextPiece();
        
        this.player.pos.y = 0;
        this.player.pos.x = (this.COLS / 2 | 0) - 1;

        if (this.collide(this.grid, this.player)) {
            this.gameOver();
        }
    }

    collide(arena, player) {
        const m = player.matrix;
        const o = player.pos;
        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 &&
                   (arena[y + o.y] &&
                    arena[y + o.y][x + o.x]) !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    merge(arena, player) {
        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    arena[y + player.pos.y][x + player.pos.x] = value;
                }
            });
        });
    }

    rotate(matrix) {
        const N = matrix.length;
        const M = matrix[0].length;
        let result = Array.from({length: M}, () => Array(N).fill(0));
        for (let i = 0; i < N; i++) {
            for (let j = 0; j < M; j++) {
                result[j][N - 1 - i] = matrix[i][j];
            }
        }
        return result;
    }

    playerRotate() {
        const pos = this.player.pos.x;
        let offset = 1;
        const originalMatrix = this.player.matrix;
        this.player.matrix = this.rotate(this.player.matrix);
        
        while (this.collide(this.grid, this.player)) {
            this.player.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > this.player.matrix[0].length) {
                this.player.matrix = originalMatrix; 
                this.player.pos.x = pos;
                return;
            }
        }
    }

    playerDrop() {
        this.player.pos.y++;
        if (this.collide(this.grid, this.player)) {
            this.player.pos.y--;
            this.merge(this.grid, this.player);
            this.checkMathMatches();
            this.playerReset();
        }
        this.dropCounter = 0;
    }

    playerMove(dir) {
        this.player.pos.x += dir;
        if (this.collide(this.grid, this.player)) {
            this.player.pos.x -= dir;
        }
    }

    handleKeyDown(event) {
        if (!this.gameRunning) return;
        if (event.keyCode === 37) this.playerMove(-1);
        else if (event.keyCode === 39) this.playerMove(1);
        else if (event.keyCode === 40) { event.preventDefault(); this.playerDrop(); }
        else if (event.keyCode === 38) { event.preventDefault(); this.playerRotate(); }
        else if (event.keyCode === 32) { event.preventDefault(); this.playerHardDrop(); }
    }

    destroy() {

        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        if (this.demoCursor) { this.demoCursor.hideBubble(); this.demoCursor = null; }
        this.gameRunning = false;
        super.destroy();
        document.removeEventListener('keydown', this.handleKeyDown);
        if (this.onResize) window.removeEventListener('resize', this.onResize);
        if (this.observateur) { this.observateur.disconnect(); this.observateur = null; }
        if (this.repetitions) {
            this.repetitions.forEach(t => { clearTimeout(t.attente); clearInterval(t.rythme); });
            this.repetitions.clear();
        }
        if(this.rafId) cancelAnimationFrame(this.rafId);
        if(this.demoInterval) clearInterval(this.demoInterval);
    }

    checkMathMatches() {
        if (!this.gameRunning || !this.container.querySelector('#tetris-score-val')) return;
        let matches = [];
        // Le Tetris ne remontait AUCUNE tentative : une partie entière
        // n'écrivait pas une ligne dans le bilan de l'élève, alors que chaque
        // paire posée est une multiplication trouvée.
        const paires = [];

        const check = (x1, y1, x2, y2) => {
            if (this.grid[y1][x1] === 0 || this.grid[y2][x2] === 0) return;
            if (this.grid[y1][x1] * this.grid[y2][x2] === this.currentTarget) {
                matches.push({x: x1, y: y1});
                matches.push({x: x2, y: y2});
                // Les valeurs sont relevées AVANT l'effacement : la boucle
                // ci-dessous met les cases à zéro, on ne saurait plus quelle
                // multiplication l'élève vient de réussir.
                paires.push([this.grid[y1][x1], this.grid[y2][x2]]);
            }
        };

        for (let y = 0; y < this.ROWS; y++) {
            for (let x = 0; x < this.COLS - 1; x++) check(x, y, x+1, y);
        }

        for (let y = 0; y < this.ROWS - 1; y++) {
            for (let x = 0; x < this.COLS; x++) check(x, y, x, y+1);
        }

        if (matches.length > 0) {
            let uniqueMatches = 0;
            matches.forEach(p => {
                if (this.grid[p.y][p.x] !== 0) {
                    const val = this.grid[p.y][p.x];
                    this.grid[p.y][p.x] = 0;
                    uniqueMatches++;
                    for(let i=0; i<8; i++) {
                        this.particles.push({
                            x: p.x * this.BLOCK_SIZE + this.BLOCK_SIZE/2,
                            y: p.y * this.BLOCK_SIZE + this.BLOCK_SIZE/2,
                            vx: (Math.random()-0.5)*10,
                            vy: (Math.random()-0.5)*10,
                            life: 1.0,
                            color: COLORS[val]
                        });
                    }
                }
            });

            if (uniqueMatches > 0) {
                this.score += uniqueMatches * 10 * uniqueMatches;
                this.container.querySelector('#tetris-score-val').innerText = this.score;

                const cible = this.currentTarget;
                paires.forEach(([a, b]) => this.onCorrectAnswer(null, `mult:${Math.max(a, b)}`, {
                    points: 10,
                    questionText: `${a} × ${b}`,
                    given: cible, expected: cible
                }));

                this.generateTarget();
                this.applyGravity();
            }
        }
    }

    applyGravity() {
        let moved = false;
        for (let x = 0; x < this.COLS; x++) {
            for (let y = this.ROWS - 1; y > 0; y--) {
                if (this.grid[y][x] === 0) {
                    for (let k = y - 1; k >= 0; k--) {
                        if (this.grid[k][x] !== 0) {
                            this.grid[y][x] = this.grid[k][x];
                            this.grid[k][x] = 0;
                            moved = true;
                            break;
                        }
                    }
                }
            }
        }
        if (moved) {
            setTimeout(() => { if(this.gameRunning) this.checkMathMatches(); }, 300);
        }
    }

    drawMatrix(matrix, offset, context, bs = this.BLOCK_SIZE) {
        const police = getComputedStyle(document.body).fontFamily;
        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const bx = (x + offset.x) * bs;
                    const by = (y + offset.y) * bs;
                    const r = Math.max(3, bs * 0.18);

                    context.fillStyle = COLORS[value];
                    drawRoundRect(context, bx + 1, by + 1, bs - 2, bs - 2, r);
                    context.fill();

                    context.fillStyle = 'rgba(255,255,255,0.22)';
                    drawRoundRect(context, bx + 1, by + 1, bs - 2, bs / 3, r);
                    context.fill();

                    context.fillStyle = 'rgba(0,0,0,0.1)';
                    drawRoundRect(context, bx + 1, by + bs - bs / 3 - 1, bs - 2, bs / 3, r);
                    context.fill();

                    // Le chiffre suit la case : figé à 20 px, il devenait
                    // minuscule dans une grande case et débordait d'une petite.
                    context.fillStyle = '#1c2833';
                    context.font = `900 ${Math.round(bs * 0.6)}px ${police}`;
                    context.textAlign = 'center';
                    context.textBaseline = 'middle';
                    context.fillText(value, bx + bs / 2, by + bs / 2 + bs * 0.04);
                }
            });
        });
    }

    drawNextPiece() {
        if (!this.nextCtx) return;
        const vue = this.nextVue || { w: this.nextCvs.width, h: this.nextCvs.height };
        this.nextCtx.clearRect(0, 0, vue.w, vue.h);
        if (!this.nextPieceMatrix) return;
        const m = this.nextPieceMatrix;
        // L'aperçu a sa PROPRE échelle : il partageait celle du plateau, si
        // bien qu'une grande case sur grand écran le faisait déborder de son
        // panneau.
        const bs = Math.floor(Math.min(vue.w / (m[0].length + 0.4), vue.h / (m.length + 0.4)));
        const ox = (vue.w / bs - m[0].length) / 2;
        const oy = (vue.h / bs - m.length) / 2;
        this.drawMatrix(m, { x: ox, y: oy }, this.nextCtx, bs);
    }

    /** Où la pièce se posera si on la lâche : le repère qui rend le jeu jouable. */
    positionFantome() {
        if (!this.player.matrix) return null;
        const y0 = this.player.pos.y;
        let y = y0;
        while (!this.collide(this.grid, { matrix: this.player.matrix, pos: { x: this.player.pos.x, y: y + 1 } })) y++;
        return y === y0 ? null : { x: this.player.pos.x, y };
    }

    draw() {
        if (!this.ctx) return;
        const bs = this.BLOCK_SIZE, W = bs * this.COLS, H = bs * this.ROWS;
        this.ctx.clearRect(0, 0, W, H);

        this.ctx.strokeStyle = 'rgba(100, 116, 139, 0.14)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= this.COLS; i++) {
            this.ctx.beginPath(); this.ctx.moveTo(i * bs, 0); this.ctx.lineTo(i * bs, H); this.ctx.stroke();
        }
        for (let i = 0; i <= this.ROWS; i++) {
            this.ctx.beginPath(); this.ctx.moveTo(0, i * bs); this.ctx.lineTo(W, i * bs); this.ctx.stroke();
        }

        this.drawMatrix(this.grid, { x: 0, y: 0 }, this.ctx);

        if (this.player.matrix) {
            const f = this.positionFantome();
            if (f) {
                this.ctx.save();
                this.ctx.globalAlpha = 0.26;
                this.player.matrix.forEach((row, y) => row.forEach((v, x) => {
                    if (!v) return;
                    this.ctx.fillStyle = COLORS[v];
                    drawRoundRect(this.ctx, (x + f.x) * bs + 2, (y + f.y) * bs + 2, bs - 4, bs - 4, Math.max(3, bs * 0.18));
                    this.ctx.fill();
                }));
                this.ctx.restore();
            }
            this.drawMatrix(this.player.matrix, this.player.pos, this.ctx);
        }

        // Draw & update particles
        for(let i = this.particles.length-1; i>=0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.03; // slightly slower fade
            if(p.life <= 0) {
                this.particles.splice(i, 1);
            } else {
                this.ctx.globalAlpha = p.life;
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, 4 + p.life*2, 0, Math.PI*2);
                this.ctx.fill();
                this.ctx.globalAlpha = 1.0;
            }
        }
    }

    loop(time = 0) {
        if (!this.gameRunning) return;
        
        const deltaTime = time - this.lastTime;
        this.lastTime = time;

        // Pause d'explication : la pièce cesse de tomber. Le temps continue
        // d'être lu (lastTime ci-dessus) pour qu'à la reprise elle ne
        // dégringole pas d'un coup de tout le temps écoulé.
        if (!this.gelDemo) {
            this.dropCounter += deltaTime;
            if (this.dropCounter > this.dropInterval) {
                this.playerDrop();
            }
        }

        this.draw();
        this.rafId = requestAnimationFrame(this.loop);
    }

    gameOver() {
        this.gameRunning = false;
        if(this.rafId) cancelAnimationFrame(this.rafId);
        this.container.querySelector('#tetris-final-score').innerText = this.score;
        this.container.querySelector('#tetris-game-over').classList.remove('tetris-hidden');
    }
}
