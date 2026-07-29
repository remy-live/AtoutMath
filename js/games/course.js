import { BaseGame } from '../core/BaseGame.js';
import { state } from '../core/state.js';

export function engineCourse(container, isDemo, params) {
    const game = new Course(container, isDemo, params);
    game.start();
    return game;
}

const biomes = [
    { bg: [244, 241, 234], line: [220, 220, 220], gate: [255,255,255], gateB: [44, 62, 80] }, // 0: Campagne
    { bg: [245, 230, 202], line: [224, 208, 176], gate: [255,255,255], gateB: [139, 69, 19] }, // 1: Désert
    { bg: [200, 220, 230], line: [230, 240, 250], gate: [255,255,255], gateB: [100, 149, 237] }, // 2: Glacier
    { bg: [34, 139, 34],   line: [60, 179, 113],  gate: [255,255,255], gateB: [139, 69, 19] }, // 3: Jungle
    { bg: [44, 62, 80],    line: [52, 73, 94],    gate: [52, 73, 94],  gateB: [236, 240, 241] }, // 4: Nuit Ville
    { bg: [150, 40, 27],   line: [70, 70, 70],    gate: [255,255,255], gateB: [0, 0, 0] }, // 5: Lave
    { bg: [135, 206, 250], line: [240, 220, 130], gate: [255,255,255], gateB: [139, 69, 19] }, // 6: Plage
    { bg: [210, 105, 30],  line: [184, 134, 11],  gate: [255,255,255], gateB: [139, 69, 19] }, // 7: Automne
    { bg: [10, 10, 30],    line: [50, 50, 80],    gate: [50, 50, 80],  gateB: [255, 255, 255] }, // 8: Espace
    { bg: [255, 192, 203], line: [255, 255, 0],   gate: [255,255,255], gateB: [255, 0, 0] } // 9: Arc-en-ciel
];

// Décor : chaque biome a ses silhouettes ET ses couleurs. Auparavant tout le
// décor était tracé d'un même gris pâle, ce qui donnait des arbres en sucettes
// grises sur un bas-côté de la même teinte que la route — autant dire rien.
const DECORS = {
    tree:         { corps: '#6b4423', feuille: '#2e7d32' },
    bush:         { corps: '#4e7a2f', feuille: '#66a03f' },
    cloud:        { corps: '#ffffff', feuille: '#ffffff' },
    haystack:     { corps: '#c9a227', feuille: '#e0bb3a' },
    fence:        { corps: '#8d6e63', feuille: '#a1887f' },
    flower:       { corps: '#4caf50', feuille: '#ec407a' },
    cactus:       { corps: '#2e7d32', feuille: '#43a047' },
    rock:         { corps: '#8d8d8d', feuille: '#a8a8a8' },
    ice_shard:    { corps: '#b3e5fc', feuille: '#e1f5fe' },
    penguin:      { corps: '#263238', feuille: '#ffffff' },
    vine:         { corps: '#1b5e20', feuille: '#388e3c' },
    leaf_cluster: { corps: '#2e7d32', feuille: '#66bb6a' },
    building:     { corps: '#37474f', feuille: '#ffd54f' },
    volcano:      { corps: '#4e342e', feuille: '#ff5722' },
    lava_rock:    { corps: '#3e2723', feuille: '#ff7043' },
    palm:         { corps: '#8d6e63', feuille: '#43a047' },
    shell:        { corps: '#ffab91', feuille: '#fff3e0' },
    mushroom:     { corps: '#efebe9', feuille: '#d84315' },
    leaf_pile:    { corps: '#bf5f1f', feuille: '#e8871e' },
    planet:       { corps: '#7e57c2', feuille: '#b39ddb' },
    meteor:       { corps: '#546e7a', feuille: '#ff8a65' },
    balloon:      { corps: '#e91e63', feuille: '#f8bbd0' },
    confetti:     { corps: '#ffca28', feuille: '#26c6da' }
};

// Bas-côté : la bande de couleur de part et d'autre de la route. Sans elle,
// hors piste et piste avaient la même teinte, et la route n'existait pas.
const BAS_COTES = [
    '#8bc34a', '#d7b377', '#dceef5', '#1b5e20', '#1a2531',
    '#5d1a12', '#f2d492', '#a1541f', '#05050f', '#f8bbd0'
];

/**
 * Véhicules.
 *
 * `dessin` reçoit le contexte déjà centré sur le véhicule : chacun se dessine
 * en coordonnées locales, ce qui permet d'en ajouter un sans toucher au reste.
 */
const VEHICULES = [
    {
        id: 'fusee', yeux: { dx: 15, dy: 30 }, nom: 'Fusée', carrosserie: '#e17055', detail: '#ffffff',
        dessin(c) {
            c.fillStyle = this.carrosserie;
            drawRound(c, -30, 0, 60, 100, 20); c.fill();
            c.fillStyle = this.detail; c.fillRect(-5, 0, 10, 100);
            c.fillStyle = '#2c3e50'; c.fillRect(-25, 50, 50, 20);
        }
    },
    {
        id: 'bolide', yeux: { dx: 13, dy: 34 }, nom: 'Bolide', carrosserie: '#e74c3c', detail: '#ffd93d',
        dessin(c) {
            c.fillStyle = this.carrosserie;
            drawRound(c, -26, 0, 52, 100, 26); c.fill();
            c.fillStyle = '#2c3e50';
            drawRound(c, -34, 18, 14, 26, 5); c.fill();
            drawRound(c, 20, 18, 14, 26, 5); c.fill();
            drawRound(c, -34, 62, 14, 26, 5); c.fill();
            drawRound(c, 20, 62, 14, 26, 5); c.fill();
            c.fillStyle = this.detail; c.fillRect(-6, 6, 12, 88);
        }
    },
    {
        id: 'tracteur', yeux: { dx: 9, dy: 27 }, nom: 'Tracteur', carrosserie: '#27ae60', detail: '#f1c40f',
        dessin(c) {
            c.fillStyle = this.carrosserie;
            drawRound(c, -24, 8, 48, 84, 10); c.fill();
            c.fillStyle = '#2c3e50';
            c.beginPath(); c.arc(-28, 74, 18, 0, Math.PI * 2); c.fill();
            c.beginPath(); c.arc(28, 74, 18, 0, Math.PI * 2); c.fill();
            c.beginPath(); c.arc(-26, 26, 11, 0, Math.PI * 2); c.fill();
            c.beginPath(); c.arc(26, 26, 11, 0, Math.PI * 2); c.fill();
            c.fillStyle = this.detail; drawRound(c, -16, 16, 32, 26, 6); c.fill();
        }
    },
    {
        id: 'soucoupe', yeux: { dx: 9, dy: 34 }, nom: 'Soucoupe', carrosserie: '#9b59b6', detail: '#7ef9ff',
        dessin(c) {
            c.fillStyle = this.detail;
            c.beginPath(); c.ellipse(0, 34, 24, 24, 0, Math.PI, 0); c.fill();
            c.fillStyle = this.carrosserie;
            c.beginPath(); c.ellipse(0, 52, 42, 20, 0, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#ffffff';
            [-22, 0, 22].forEach(dx => { c.beginPath(); c.arc(dx, 58, 4, 0, Math.PI * 2); c.fill(); });
        }
    },
    {
        id: 'chat', yeux: { dx: 11, dy: 46 }, nom: 'Chat-mobile', carrosserie: '#f39c12', detail: '#ffffff',
        dessin(c) {
            c.fillStyle = this.carrosserie;
            c.beginPath(); c.moveTo(-26, 22); c.lineTo(-14, -2); c.lineTo(-4, 22); c.fill();
            c.beginPath(); c.moveTo(26, 22); c.lineTo(14, -2); c.lineTo(4, 22); c.fill();
            drawRound(c, -28, 14, 56, 80, 22); c.fill();
            c.fillStyle = this.detail; drawRound(c, -16, 54, 32, 34, 14); c.fill();
            c.strokeStyle = '#2c3e50'; c.lineWidth = 2;
            c.beginPath(); c.moveTo(-30, 62); c.lineTo(-46, 56); c.moveTo(30, 62); c.lineTo(46, 56); c.stroke();
        }
    },
    {
        id: 'sousmarin', yeux: null, nom: 'Sous-marin', carrosserie: '#2980b9', detail: '#f1c40f',
        dessin(c) {
            c.fillStyle = this.carrosserie;
            drawRound(c, -28, 6, 56, 92, 28); c.fill();
            c.fillStyle = '#1a5276'; drawRound(c, -10, -8, 20, 22, 6); c.fill();
            c.fillStyle = this.detail;
            c.beginPath(); c.arc(0, 40, 13, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#154360';
            c.beginPath(); c.arc(0, 40, 7, 0, Math.PI * 2); c.fill();
        }
    }
];

const CLE_VEHICULE = 'mathbox-course-vehicule';

/**
 * Le véhicule choisi survit à la partie : c'est ce qui fait la différence
 * entre « choisir une couleur » et « avoir SON véhicule ». Stocké en clair
 * dans le stockage local — un goût, pas une donnée d'élève.
 */
function chargerVehicule() {
    try {
        const id = localStorage.getItem(CLE_VEHICULE);
        const i = VEHICULES.findIndex(v => v.id === id);
        return i >= 0 ? i : 0;
    } catch (e) { return 0; }
}

function enregistrerVehicule(index) {
    try { localStorage.setItem(CLE_VEHICULE, VEHICULES[index].id); } catch (e) { /* navigation privée */ }
}

function drawRound(ctx, x, y, w, h, r) {
    if(ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x,y,w,h,r); return; }
    if (w < 2 * r) r = w / 2; if (h < 2 * r) r = h / 2;
    ctx.beginPath(); ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r); ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r); ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
}
/** Dessine un véhicule, contexte déjà centré et non mis à l'échelle. */
function dessinerVehicule(c, index) {
    const v = VEHICULES[index] || VEHICULES[0];
    c.save();
    v.dessin(c);
    c.restore();
    if (!v.yeux) return;
    // Deux yeux : c'est ce qui transforme une forme en personnage, et c'est la
    // raison pour laquelle l'élève s'attache à « son » véhicule.
    const { dx, dy } = v.yeux;
    c.save();
    [-dx, dx].forEach(x => {
        c.fillStyle = '#fff'; c.beginPath(); c.arc(x, dy, 8, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#000'; c.beginPath(); c.arc(x, dy, 3, 0, Math.PI * 2); c.fill();
    });
    c.restore();
}

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpColor(c1, c2, t) {
    return [Math.round(lerp(c1[0], c2[0], t)), Math.round(lerp(c1[1], c2[1], t)), Math.round(lerp(c1[2], c2[2], t))];
}

class Course extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params);
        this.records = { survival: 0, chrono: 0, sprint: 0 };
        this.gameState = 'menu';
        
        this.mode = 'survival';
        this.laneCount = 3;
        this.speedBase = 3;
        this.currentSpeed = 3;
        this.retryList = [];
        this.isRetrying = false;
        
        this.lanesX = []; this.laneW = 0; 
        this.p = { lane: 1, x:0, y:0, targetX:0 };
        this.objects = []; this.scenery = []; this.history = []; 
        this.score = 0; this.lives = 3; this.question = null;
        this.combo = 0; this.multiplier = 1; this.shield = false; this.timeLeft = 0;
        // Comptes à rebours en images : les bonus temporaires s'épuisent dans
        // `update()`, donc au rythme réel du jeu et non à celui d'une horloge
        // qui continuerait de tourner en pause.
        this.bonusX2 = 0; this.ralenti = 0;
        this.vehicule = chargerVehicule();
        this.feedback = { active:false, text:'', color:'', scale:0, life:0 };
        this.shake = 0; this.biome = 0;
        this.col = JSON.parse(JSON.stringify(biomes[0]));
        this.lastFailedOp = null; this.errorTriageCount = 0;
        
        this.rafId = null;
        this.timerId = null;
        this.keys = {Up:false};
        
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.loop = this.loop.bind(this);
    }

    render() {
        this.container.innerHTML = `
            <style>
                .course-wrapper { position: relative; width: 100%; height: 100%; display: flex; justify-content: center; background: var(--bg-app); font-family: 'Outfit', Courier, monospace; color: var(--text-main); overflow: hidden; touch-action: none; }
                .course-wrapper #course-cvs { background: transparent; border-left: 2px solid var(--border); border-right: 2px solid var(--border); max-width: 750px; width: 100%; height: 100%; display: block; }
                .course-hud { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 750px; height: 100%; pointer-events: none; display: none; flex-direction: column; z-index:5; }
                .course-hud.active { display: flex; }
                .course-hud-top { display: flex; justify-content: space-between; align-items: center; padding: 15px; background: rgba(255,255,255,0.9); border-bottom: 2px solid var(--border); }
                .course-hud-info { display: flex; gap: 15px; font-weight: bold; font-size: 1.2rem; align-items: center; color: var(--text-main); }
                .course-combo-container { width: 100%; height: 10px; background: #ddd; position: relative; }
                .course-combo-fill { width: 0%; height: 100%; background: linear-gradient(90deg, orange, red); transition: width 0.2s; }
                .course-combo-text { position: absolute; top: 15px; right: 10px; font-weight: 900; font-size: 1.5rem; color: var(--warning); transform: rotate(-5deg); display: none; text-shadow: 2px 2px 0 #fff; }
                .course-question-box { position: absolute; top: 120px; width: 100%; text-align: center; }
                .course-q-text { background: var(--text-main); color: var(--bg-app); padding: 15px 30px; font-size: 2rem; font-weight: bold; display: inline-block; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.2); }
                
                .course-screen { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--bg-app); z-index: 10; display: none; flex-direction: column; align-items: center; justify-content: flex-start; overflow-y: auto; padding: 20px; box-sizing: border-box; }
                .course-screen.active { display: flex; }
                .course-screen h1 { font-size: 2.5rem; margin-bottom: 15px; text-align: center; color: var(--primary); }
                .course-panel { border: 1px solid var(--border); padding: 15px; width: 100%; max-width: 550px; background: var(--bg-panel); border-radius: 12px; box-shadow: var(--shadow-md); margin-bottom: 15px; position: relative; }
                .course-panel-title { text-align:center; margin-bottom:10px; font-weight:bold; border-bottom: 1px solid var(--border); padding-bottom: 5px; color: var(--text-muted); }
                
                .course-btn { pointer-events: auto; background: var(--primary); color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; }
                .course-btn:hover { background: var(--primary-hover); transform: translateY(-2px); }
                .course-btn.outline { background: transparent; border: 2px solid var(--primary); color: var(--primary); }
                .course-btn.outline:hover { background: var(--primary); color: #fff; }
                
                .course-selector-row { display: flex; gap: 10px; justify-content: center; margin-bottom: 15px; }
                .course-sel-btn { flex: 1; padding: 10px; border: 2px solid var(--border); border-radius: 8px; background: var(--bg-app); font-weight: bold; cursor: pointer; color: var(--text-muted); transition: 0.2s; }
                .course-sel-btn.selected { background: var(--primary); color: #fff; border-color: var(--primary); box-shadow: var(--shadow-sm); }
                
                .course-config-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; text-align: left; font-size: 0.95rem;}
                .course-check-row { display: flex; align-items: center; gap: 5px; cursor: pointer; color: var(--text-main); }
                .course-slider-container { padding: 5px; margin-bottom: 10px; display: flex; align-items: center; gap: 15px;}
                .course-slider-container input[type=range] { flex: 1; accent-color: var(--primary); }
                
                .course-res-row { border-bottom: 1px dashed var(--border); padding: 8px 0; display: flex; justify-content: space-between; color: var(--text-main); }
                .course-garage-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
                .course-garage-item { border: 2px solid var(--border); border-radius: 12px; background: var(--bg-app);
                    padding: 8px; cursor: pointer; display: flex; flex-direction: column; align-items: center;
                    gap: 6px; font-weight: bold; color: var(--text-muted); transition: 0.2s; pointer-events: auto; }
                .course-garage-item:hover { transform: translateY(-3px); box-shadow: var(--shadow-sm); }
                .course-garage-item.selected { border-color: var(--primary); color: var(--primary); background: var(--bg-panel); }
                .course-garage-item canvas { width: 74px; height: 84px; }
                .course-ink-splat { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; background: radial-gradient(circle, rgba(0,0,0,0.9) 10%, transparent 60%); opacity: 0; transition: opacity 0.5s; mix-blend-mode: multiply; z-index: 4; }
            </style>

            <div class="course-wrapper" id="course-wrapper">
                <canvas id="course-cvs"></canvas>
                <div class="course-ink-splat" id="course-ink-splat"></div>

                <div class="course-hud" id="course-hud">
                    <div class="course-hud-top">
                        <div style="display:flex; gap:8px;">
                            <button class="course-btn outline" id="course-btn-quit" style="pointer-events: auto;">II PAUSE</button>
                            <button class="course-btn outline" id="course-btn-garage" style="pointer-events: auto;"
                                    title="Changer de véhicule" aria-label="Changer de véhicule">🚗</button>
                        </div>
                        <div class="course-hud-info">
                            <span id="course-disp-lives">❤️ x3</span>
                            <span id="course-disp-timer" style="display:none">60s</span>
                            <span id="course-disp-shield" style="display:none">🛡️ ACTIF</span>
                            <span>PTS: <span id="course-hud-score">0</span></span>
                        </div>
                    </div>
                    <div class="course-combo-container"><div class="course-combo-fill" id="course-combo-fill"></div></div>
                    <div class="course-combo-text" id="course-combo-text">FEVER x2</div>
                    <div class="course-question-box"><div class="course-q-text" id="course-hud-q">PRÊT ?</div></div>
                </div>

                <div id="course-screen-menu" class="course-screen active">
                    <h1>MATH RACER</h1>
                    <div class="course-panel">
                        <div class="course-panel-title">MODE DE JEU</div>
                        <div class="course-selector-row" id="course-mode-sel">
                            <button class="course-sel-btn selected" data-mode="survival">☠️ SURVIE</button>
                            <button class="course-sel-btn" data-mode="chrono">⏱️ CHRONO</button>
                            <button class="course-sel-btn" data-mode="sprint">🏁 SPRINT</button>
                        </div>
                        <div style="text-align:center; font-size:0.85rem; color:var(--text-muted); margin-bottom:10px;">
                            MEILLEUR SCORE : <span id="course-best-score-disp" style="font-weight:bold; color:var(--text-main)">0</span>
                        </div>

                        <div class="course-panel-title">RÉGLAGES</div>
                        <div class="course-slider-container">
                            <span style="width: 60px; color: var(--text-main);">VOIES</span>
                            <input type="range" id="course-lane-slider" min="3" max="5" value="3">
                            <span style="font-weight:bold; width: 20px; text-align:right; color: var(--text-main);" id="course-lane-val">3</span>
                        </div>
                        <div class="course-slider-container">
                            <span style="width: 60px; color: var(--text-main);">VITESSE</span>
                            <input type="range" id="course-speed-slider" min="2" max="8" value="3">
                            <span style="font-weight:bold; width: 20px; text-align:right; color: var(--text-main);" id="course-speed-val">3</span>
                        </div>

                        <div class="course-panel-title" style="margin-top:10px;">MATHS</div>
                        <div class="course-config-grid">
                            <label class="course-check-row"><input type="checkbox" class="course-op" value="+9"> +9/-9</label>
                            <label class="course-check-row"><input type="checkbox" class="course-op" value="mul" checked> Tables</label>
                            <label class="course-check-row"><input type="checkbox" class="course-op" value="c10"> Cpl.10</label>
                            <label class="course-check-row"><input type="checkbox" class="course-op" value="div"> Div.</label>
                            <label class="course-check-row"><input type="checkbox" class="course-op" value="rel"> Relat.</label>
                            <label class="course-check-row"><input type="checkbox" class="course-op" value="dec"> Décim.</label>
                        </div>
                    </div>
                    <button class="course-btn" id="course-btn-start" style="font-size: 1.4rem; padding: 15px 40px; width:100%; max-width:550px;">DÉMARRER</button>
                </div>

                <div id="course-screen-garage" class="course-screen">
                    <h1>GARAGE</h1>
                    <div class="course-panel">
                        <div class="course-panel-title">CHOISIS TON VÉHICULE</div>
                        <div class="course-garage-grid" id="course-garage-grid"></div>
                    </div>
                    <button class="course-btn" id="course-btn-garage-ok" style="width:100%; max-width:550px;">EN PISTE !</button>
                </div>

                <div id="course-screen-end" class="course-screen">
                    <h1>BILAN</h1>
                    <div class="course-panel">
                        <div style="text-align:center; margin-bottom:5px; color:var(--text-muted);" id="course-end-title">SCORE FINAL</div>
                        <div style="font-size:3.5rem; text-align:center; color:var(--primary); font-weight:bold;" id="course-end-score">0</div>
                        <button id="course-btn-retry-err" class="course-btn" style="width:100%; margin-top:10px; display:none;">↺ REJOUER MES ERREURS</button>
                    </div>
                    <div class="course-panel" id="course-res-list" style="max-height: 250px; overflow-y:auto;"></div>
                    <button class="course-btn outline" id="course-btn-menu" style="width:100%; max-width:550px; margin-top:10px;">CONTINUER</button>
                </div>
            </div>
        `;
    }

    startGameLoop() {
        this.cvs = this.container.querySelector('#course-cvs');
        this.ctx = this.cvs.getContext('2d');
        
        this.loadRecords();
        this.setupEventListeners();
        
        if (this.params.showInternalMenu) {
            this.showScreen('course-screen-menu');
        } else {
            this.setupGame(false, this.params);
        }
    }

    runDemoSequence() {
        this.startGameLoop();
        this.setupGame(false, this.params);
        this.demoInterval = setInterval(() => {
            if (this.gameState === 'race') {
                this.p.lane = Math.floor(Math.random() * this.laneCount);
            }
        }, 1000);
    }

    setupEventListeners() {
        window.addEventListener('resize', this.handleResize);
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        
        const wrapper = this.container.querySelector('#course-wrapper');
        
        this.handlePointerDown = this.handlePointerDown.bind(this);
        wrapper.addEventListener('pointerdown', this.handlePointerDown);
        
        const laneSlider = this.container.querySelector('#course-lane-slider');
        const laneVal = this.container.querySelector('#course-lane-val');
        if (laneSlider) laneSlider.oninput = () => laneVal.innerText = laneSlider.value;
        
        const speedSlider = this.container.querySelector('#course-speed-slider');
        const speedVal = this.container.querySelector('#course-speed-val');
        if (speedSlider) speedSlider.oninput = () => speedVal.innerText = speedSlider.value;

        this.container.querySelectorAll('.course-sel-btn').forEach(btn => {
            btn.onclick = () => {
                this.container.querySelectorAll('.course-sel-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.updateRecordsUI(btn.dataset.mode);
            };
        });

        this.container.querySelector('#course-btn-start').onclick = () => this.setupGame(false);
        this.container.querySelector('#course-btn-quit').onclick = () => this.quitGame();
        this.container.querySelector('#course-btn-garage').onclick = () => this.ouvrirGarage();
        this.container.querySelector('#course-btn-garage-ok').onclick = () => this.fermerGarage();
        this.container.querySelector('#course-btn-retry-err').onclick = () => this.setupGame(true);
        this.container.querySelector('#course-btn-menu').onclick = () => {
            if (this.params.showInternalMenu) {
                this.showScreen('course-screen-menu');
            } else {
                this.destroy();
                this.onCorrectAnswer(null); // finish game
            }
        };
        
        this.handleResize();
    }

    handleResize() {
        if(!this.cvs) return;
        const rect = this.cvs.getBoundingClientRect();
        this.cvs.width = rect.width; this.cvs.height = rect.height;
        this.w = this.cvs.width; this.h = this.cvs.height;
        // Les voies n'occupent plus toute la largeur : on réserve un bas-côté
        // de chaque côté. Sans cette marge, la route n'avait pas de bord — le
        // décor était dessiné sur le bitume et les bandes de bas-côté, calées
        // sur le bord des voies, avaient une largeur nulle.
        this.marge = Math.min(96, Math.max(38, this.w * 0.11));
        const routeW = this.w - this.marge * 2;
        this.laneW = routeW / (this.laneCount || 3);
        this.lanesX = [];
        for(let i=0; i<(this.laneCount||3); i++) this.lanesX.push(this.marge + this.laneW * i + this.laneW/2);
        this.screenCenter = this.w / 2;
    }

    handleKeyDown(e) {
        if(this.gameState !== 'race') return;
        if(e.code==='ArrowLeft') this.move(-1); 
        if(e.code==='ArrowRight') this.move(1); 
        if(e.code==='ArrowUp') this.keys.Up=true;
    }

    handleKeyUp(e) {
        if(e.code==='ArrowUp') this.keys.Up=false;
    }

    handlePointerDown(e) {
        if(this.gameState !== 'race') return;
        const rect = this.cvs.getBoundingClientRect();
        const x = e.clientX - rect.left;
        
        let closestLane = 0;
        let minDiff = Infinity;
        for(let i=0; i<this.laneCount; i++) {
            let diff = Math.abs(x - this.lanesX[i]);
            if (diff < minDiff) { minDiff = diff; closestLane = i; }
        }
        this.p.lane = closestLane;
    }

    move(dir) {
        if(dir === -1 && this.p.lane > 0) this.p.lane--;
        if(dir === 1 && this.p.lane < this.laneCount - 1) this.p.lane++;
    }

    destroy() {
        super.destroy();
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        const wrapper = this.container.querySelector('#course-wrapper');
        if (wrapper) wrapper.removeEventListener('pointerdown', this.handlePointerDown);
        if(this.rafId) cancelAnimationFrame(this.rafId);
        if(this.timerId) clearInterval(this.timerId);
        if(this.demoInterval) clearInterval(this.demoInterval);
    }
    /**
     * Garage.
     *
     * Ouvert depuis la course, il la met en pause : on ne change pas de
     * véhicule pendant que la route défile. Le choix est enregistré tout de
     * suite — il vaut pour cette partie comme pour les suivantes.
     */
    ouvrirGarage() {
        this.etatAvantGarage = this.gameState;
        this.gameState = 'garage';
        this.container.querySelector('#course-hud').classList.remove('active');
        this.dessinerGarage();
        this.showScreen('course-screen-garage');
    }

    fermerGarage() {
        this.showScreen(null);
        if (this.etatAvantGarage === 'race') {
            this.container.querySelector('#course-hud').classList.add('active');
            this.gameState = 'race';
        } else {
            this.gameState = this.etatAvantGarage || 'menu';
            if (this.gameState === 'menu') this.showScreen('course-screen-menu');
        }
    }

    dessinerGarage() {
        const grille = this.container.querySelector('#course-garage-grid');
        grille.innerHTML = '';
        VEHICULES.forEach((v, i) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'course-garage-item' + (i === this.vehicule ? ' selected' : '');
            item.setAttribute('aria-pressed', String(i === this.vehicule));

            const vignette = document.createElement('canvas');
            vignette.width = 74; vignette.height = 84;
            const cc = vignette.getContext('2d');
            // Le modèle se dessine dans son propre repère : on le recentre et
            // on le réduit, plutôt que de tenir une seconde version « miniature »
            // qui finirait par diverger de celle qui roule.
            cc.translate(37, 6); cc.scale(0.66, 0.66); cc.translate(0, -4);
            dessinerVehicule(cc, i);

            const nom = document.createElement('span');
            nom.textContent = v.nom;
            item.append(vignette, nom);
            item.onclick = () => {
                this.vehicule = i;
                enregistrerVehicule(i);
                this.dessinerGarage();
            };
            grille.appendChild(item);
        });
    }

    showScreen(id) {
        this.container.querySelectorAll('.course-screen').forEach(s => s.classList.remove('active'));
        if(id) this.container.querySelector('#'+id).classList.add('active');
        this.updateRecordsUI();
    }

    loadRecords() {
        try {
            const s = localStorage.getItem('atoutMathCourseRecords');
            if(s) this.records = JSON.parse(s);
        } catch(e) {}
        this.updateRecordsUI();
    }

    checkRecord(mode, score) {
        let isNew = false;
        if(mode === 'sprint') {
            if(score > 0 && (this.records.sprint === 0 || score < this.records.sprint)) { this.records.sprint = score; isNew = true; }
        } else {
            if(score > this.records[mode]) { this.records[mode] = score; isNew = true; }
        }
        if(isNew) {
            localStorage.setItem('atoutMathCourseRecords', JSON.stringify(this.records));
            this.updateRecordsUI();
        }
        return isNew;
    }

    updateRecordsUI(forcedMode = null) {
        const mode = forcedMode || this.mode || 'survival';
        let val = this.records[mode];
        if(mode === 'sprint') val = val > 0 ? val + 's' : '--';
        const el = this.container.querySelector('#course-best-score-disp');
        if(el) el.innerText = val;
    }

    setupGame(isRetrying, overrideParams) {
        this.isRetrying = isRetrying;
        
        if (overrideParams) {
            this.mode = overrideParams.mode || 'survival';
            this.laneCount = overrideParams.lanes || 3;
            this.speedBase = overrideParams.speed || 3;
            this.operations = overrideParams.operations || ['mul'];
        } else if (!this.isRetrying) {
            const selBtn = this.container.querySelector('#course-mode-sel .selected');
            this.mode = selBtn ? selBtn.dataset.mode : 'survival';
            this.laneCount = parseInt(this.container.querySelector('#course-lane-slider').value);
            this.speedBase = parseInt(this.container.querySelector('#course-speed-slider').value);
            this.operations = Array.from(this.container.querySelectorAll('.course-op:checked')).map(c => c.value);
            if(this.operations.length === 0) this.operations = ['mul'];
        }
        
        this.handleResize(); 
        this.objects = []; this.scenery = []; this.history = []; this.score = 0;
        this.currentSpeed = this.speedBase;
        this.p.lane = Math.floor(this.laneCount / 2); 
        this.p.y = this.h - 150; this.p.x = this.lanesX[this.p.lane];
        
        this.combo = 0; this.multiplier = 1; this.shield = false; this.biome = 0;
        this.bonusX2 = 0; this.ralenti = 0;
        this.col = JSON.parse(JSON.stringify(biomes[0])); 
        this.lastFailedOp = null; this.errorTriageCount = 0;

        if(this.mode === 'survival' || this.mode === 'sprint') this.lives = 3; else this.lives = 999;
        if(this.mode === 'chrono') this.timeLeft = 60; else this.timeLeft = 0;

        this.showScreen(null); 
        this.container.querySelector('#course-hud').classList.add('active');
        this.updateHUD();
        this.updateComboUI();
        this.updateShieldUI(false);
        
        this.gameState = 'race';
        this.spawnQ();
        
        if (this.timerId) clearInterval(this.timerId);
        this.timerId = setInterval(() => {
            if(this.gameState === 'race') {
                if(this.mode === 'chrono') {
                    this.timeLeft--; if(this.timeLeft <= 0) this.endGame();
                } else if(this.mode === 'sprint') {
                    this.timeLeft++; 
                }
                this.updateHUD();
            }
        }, 1000);
        
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.loop();
    }

    quitGame() {
        this.gameState = 'menu';
        this.container.querySelector('#course-hud').classList.remove('active');
        if (this.params.showInternalMenu) {
            this.showScreen('course-screen-menu');
        } else {
            this.destroy();
            this.onCorrectAnswer(null); // finish game
        }
    }

    endGame() {
        this.gameState = 'end'; 
        this.container.querySelector('#course-hud').classList.remove('active');
        this.showScreen('course-screen-end');
        
        let finalVal = this.score;
        let isNew = false;
        let successRatio = 0;
        if(this.history.length > 0) {
            successRatio = this.history.filter(h => h.ok).length / this.history.length;
        }

        if(this.mode === 'sprint') {
             if(this.lives > 0) {
                 this.container.querySelector('#course-end-title').textContent = "TEMPS TOTAL";
                 finalVal = this.timeLeft;
                 this.container.querySelector('#course-end-score').textContent = finalVal + "s";
                 isNew = this.checkRecord('sprint', finalVal);
             } else {
                 this.container.querySelector('#course-end-title').textContent = "ECHEC";
                 this.container.querySelector('#course-end-score').textContent = "---";
             }
        } else {
             this.container.querySelector('#course-end-title').textContent = "SCORE FINAL";
             this.container.querySelector('#course-end-score').textContent = finalVal;
             isNew = this.checkRecord(this.mode, finalVal);
        }

        const errors = this.history.filter(h => !h.ok);
        const btnRetry = this.container.querySelector('#course-btn-retry-err');
        if(errors.length > 0) {
            btnRetry.style.display = 'block'; this.retryList = errors.map(e => ({q:e.qText, r:e.r, op: e.op}));
        } else { btnRetry.style.display = 'none'; }

        this.container.querySelector('#course-res-list').innerHTML = this.history.map(h => `
            <div class="course-res-row"><span>${h.q}</span>${h.ok ? '<span style="color:var(--success);">OK</span>' : `<span style="color:var(--danger);text-decoration:line-through">${h.u}</span>`}</div>
        `).join('');
        
        if (successRatio > 0.7 && this.mode !== 'sprint' && this.history.length >= 5) {
            this.onCorrectAnswer(null);
        } else if (successRatio > 0.7 && this.mode === 'sprint' && this.lives > 0) {
            this.onCorrectAnswer(null);
        }
    }
    updateHUD() {
        this.container.querySelector('#course-hud-score').textContent = this.score;
        const lEl = this.container.querySelector('#course-disp-lives');
        const tEl = this.container.querySelector('#course-disp-timer');
        if(this.mode === 'chrono') {
            lEl.style.display = 'none'; tEl.style.display = 'inline-block'; tEl.textContent = this.timeLeft + 's';
        } else if (this.mode === 'sprint') {
            lEl.style.display = 'inline'; tEl.style.display = 'inline-block'; lEl.textContent = '❤️ x'+this.lives; tEl.textContent = this.timeLeft+'s';
        } else {
            lEl.style.display = 'inline'; tEl.style.display = 'none'; lEl.textContent = '❤️ x'+this.lives;
        }
    }

    updateComboUI() {
        const fill = this.container.querySelector('#course-combo-fill');
        const txt = this.container.querySelector('#course-combo-text');
        let pct = (this.combo / 20) * 100; if(pct > 100) pct = 100;
        fill.style.width = pct + '%';
        if(this.multiplier > 1) {
            txt.style.display = 'block'; txt.innerText = "FEVER x" + this.multiplier;
            txt.style.color = this.multiplier>=4 ? 'var(--danger)' : 'var(--warning)';
            fill.style.background = this.multiplier>=4 ? 'red' : 'orange';
        } else {
            txt.style.display = 'none'; fill.style.background = '#ddd';
        }
    }

    updateShieldUI(active) {
        this.container.querySelector('#course-disp-shield').style.display = active ? 'inline' : 'none';
    }

    getDecoys(t, count) {
        let ds = [], s=String(t).includes('.')?0.1:1;
        for(let i=0; i<count; i++) {
            let d; do{ d=t+(Math.random()>.5?s:-s)*Math.floor(Math.random()*5+1); if(s<1)d=parseFloat(d.toFixed(1)); } while(d==t || ds.includes(d));
            ds.push(d);
        }
        return ds;
    }

    spawnQ() {
        if(this.mode === 'survival' && this.lives <= 0) { this.endGame(); return; }
        if(this.mode === 'sprint') {
            if(this.lives <= 0) { this.endGame(); return; }
            if(this.history.length >= 20) { this.endGame(); return; } 
        }
        if(this.isRetrying && this.history.length >= this.retryList.length) { this.endGame(); return; }

        const nextBiomeIndex = Math.floor(this.score / 500);
        if (nextBiomeIndex < biomes.length) this.biome = nextBiomeIndex;

        const decoyNeeded = this.laneCount - 1;
        
        let qData;
        if(this.isRetrying) {
            const err = this.retryList[this.history.length];
            qData = { q: err.q, r: err.r, decoys: this.getDecoys(err.r, decoyNeeded), op: err.op || 'mul' }; 
        } else {
            let opList = [];
            if (this.multiplier >= 4) {
                 opList = ['rel', 'dec', 'mul', '+9']; 
            } else if (this.errorTriageCount > 0 && this.lastFailedOp) {
                 opList = [this.lastFailedOp]; 
                 this.errorTriageCount--;
            } else {
                 opList = this.operations;
            }
            if(!opList || !opList.length) opList=['mul'];
            const op = opList[Math.floor(Math.random()*opList.length)];
            const r = (min,max)=>Math.floor(Math.random()*(max-min+1))+min;
            let q, res;
            
            if(op==='+9'){let n=r(10,80);res=n+9;q=`${n} + 9`; if(Math.random()>.5){res=n-9;q=`${n} - 9`;}}
            else if(op==='mul'){
                let a = this.getRandomMultiplier();
                let b = this.getRandomTable();
                if(Math.random()>0.5) { let temp=a; a=b; b=temp; }
                res=a*b;q=`${a} x ${b}`;
            }
            else if(op==='c10'){let a=r(1,9);res=10-a;q=`? + ${a} = 10`;}
            else if(op==='div'){let b=r(2,9),a=r(2,9);res=a;q=`${a*b} ÷ ${b}`;}
            else if(op==='rel'){let a=r(-9,9),b=r(-9,9);res=a+b;q=`${a<0?'('+a+')':a} + ${b<0?'('+b+')':b}`;}
            else if(op==='dec'){let a=r(10,90);res=a*10;q=`${a} x 10`; if(Math.random()>.5){res=a/10;q=`${a} x 0,1`;}}
            
            if(String(res).includes('.')) res=parseFloat(res.toFixed(1));
            qData = {q:q.replace('.',','), r:res, decoys:this.getDecoys(res, decoyNeeded), op: op};
        }
        
        this.question = qData; this.question.qText = qData.q;
        this.container.querySelector('#course-hud-q').textContent = qData.q;
        
        const correctIdx = Math.floor(Math.random()*this.laneCount);
        let dIdx = 0; const startY = -300;

        for(let i=0; i<this.laneCount; i++) {
            const isGood = (i===correctIdx);
            const val = isGood ? this.question.r : this.question.decoys[dIdx++];
            this.objects.push({ lane: i, y: startY, val: val, good: isGood, type: 'gate', hit: false });
        }

        if(Math.random()>0.45) {
            const bonusLane = Math.floor(Math.random()*this.laneCount);
            const typeRoll = Math.random();
            let type = 'star';
            if (typeRoll > 0.80) type = 'bonus_shield';
            else if (typeRoll > 0.68) type = 'bonus_x2';
            else if (typeRoll > 0.58) type = 'bonus_slow';
            else if (typeRoll > 0.50) type = 'bonus_life';
            else if (typeRoll > 0.42 && this.mode==='chrono') type = 'bonus_time';
            this.objects.push({ lane: bonusLane, y: startY - 350, type: type, hit: false });
        }
        if(Math.random()>0.3) {
            this.objects.push({ lane: Math.floor(Math.random()*this.laneCount), y: startY + 150, type: 'star', hit: false });
        }

        // Obstacles : ils n'apparaissent qu'à partir du deuxième paysage, et se
        // densifient ensuite. Le début de partie reste donc un pur exercice de
        // calcul ; le pilotage ne s'ajoute qu'une fois la mécanique acquise.
        // Jamais sur la voie de la bonne réponse : on ne punit pas un élève qui
        // a juste, et un obstacle infranchissable serait exactement cela.
        const risque = Math.min(0.55, (this.biome - 1) * 0.14);
        // Trois voies au minimum : à deux, la seule voie disponible pour le
        // plot est celle de la mauvaise réponse. L'élève qui se trompe serait
        // puni deux fois, celui qui a juste ne le croiserait jamais — dans les
        // deux cas l'obstacle ne veut plus rien dire.
        if(this.biome >= 1 && this.laneCount >= 3 && Math.random() < risque) {
            let voie = Math.floor(Math.random()*this.laneCount);
            if(voie === correctIdx) voie = (voie + 1) % this.laneCount;
            this.objects.push({ lane: voie, y: startY + 480, type: 'obstacle', hit: false });
        }
    }
    /**
     * Résout une couleur pour le CANEVAS.
     *
     * Le canevas ne comprend pas `var(--success)` : affecter une couleur
     * invalide à `fillStyle` ne fait RIEN, l'ancienne valeur est conservée. Le
     * bandeau de réussite se remplissait donc de la dernière couleur utilisée —
     * du blanc — et le texte blanc par-dessus devenait invisible : on voyait un
     * cadre vide en trouvant la bonne réponse.
     */
    couleurCanevas(valeur) {
        if (typeof valeur !== 'string' || !valeur.startsWith('var(')) return valeur;
        const cle = valeur.slice(4, -1).trim();
        const resolue = getComputedStyle(document.documentElement).getPropertyValue(cle).trim();
        return resolue || '#34495e';
    }

    triggerFeedback(t,c) {
        this.feedback={active:true,text:t,color:this.couleurCanevas(c),scale:0.5,life:60};
    }

    handleCollision(o) {
        if(o.type === 'star') {
            const gain = 50 * this.multiplier * (this.bonusX2 > 0 ? 2 : 1);
            this.score += gain;
            this.triggerFeedback(`+${gain}`, "#f1c40f");
            this.updateHUD(); return;
        }
        if(o.type === 'bonus_shield') { this.shield=true; this.updateShieldUI(true); this.triggerFeedback("BOUCLIER", "#3498db"); return; }
        if(o.type === 'bonus_life') { this.lives++; this.updateHUD(); this.triggerFeedback("VIE +1", "var(--danger)"); return; }
        if(o.type === 'bonus_time') {
            if(this.mode==='chrono') { this.timeLeft+=10; this.triggerFeedback("+10s", "#16a085"); }
            return;
        }
        // Points doublés : récompense la prise de risque sans jamais punir.
        if(o.type === 'bonus_x2') {
            this.bonusX2 = 900;                       // ~15 s à 60 images/s
            this.triggerFeedback("POINTS x2", "#8e44ad");
            this.updateHUD(); return;
        }
        // Ralenti : le bonus le plus utile pédagogiquement. Il ne donne pas de
        // points, il donne du TEMPS POUR CALCULER — de quoi aider l'élève qui
        // décroche sans lui retirer l'exercice.
        if(o.type === 'bonus_slow') {
            this.ralenti = 480;                       // ~8 s
            this.triggerFeedback("RALENTI", "#00b894");
            return;
        }
        // Obstacle : le seul élément qui coûte quelque chose sans être une
        // erreur de calcul. Il oblige à regarder la route en plus de la
        // question, et c'est là qu'est le challenge.
        if(o.type === 'obstacle') {
            if(this.shield) {
                this.shield = false; this.updateShieldUI(false);
                this.triggerFeedback("SAUVÉ !", "#3498db");
                return;
            }
            this.shake = 22;
            this.combo = 0; this.multiplier = 1; this.updateComboUI();
            if(this.mode === 'chrono') {
                this.timeLeft = Math.max(0, this.timeLeft - 3);
                this.triggerFeedback("OBSTACLE -3s", "var(--danger)");
            } else {
                this.lives--;
                this.triggerFeedback("OBSTACLE !", "var(--danger)");
                if(this.lives<=0) setTimeout(()=>this.endGame(),500);
            }
            this.updateHUD(); return;
        }

        this.objects.filter(obj=>obj.type==='gate').forEach(g=>g.hit=true);
        
        if(o.good) {
            const pts = 100 * this.multiplier * (this.bonusX2 > 0 ? 2 : 1);
            this.score += pts; 
            this.history.push({q:this.question.qText,r:this.question.r,ok:true});
            this.triggerFeedback(`EXACT! +${pts}`, "var(--success)");
            this.combo++;
            if(this.combo > 5) this.multiplier = 2;
            if(this.combo > 10) this.multiplier = 4;
            if(this.combo > 20) this.multiplier = 8;
            this.updateComboUI();
            this.errorTriageCount = 0;
            this.onCorrectAnswer(null); // Just visual feedback handled internally here
        } else {
            if(this.shield) {
                this.shield = false; this.updateShieldUI(false);
                this.triggerFeedback("SAUVÉ!", "#3498db");
            } else {
                this.history.push({q:this.question.qText,r:this.question.r,ok:false,u:o.val});
                this.shake=20;
                this.combo = 0; this.multiplier = 1; this.updateComboUI();
                
                this.lastFailedOp = this.question.op;
                this.errorTriageCount = 3; 

                if(this.mode === 'chrono') {
                    this.timeLeft = Math.max(0, this.timeLeft - 5);
                    this.updateHUD();
                    this.triggerFeedback("-5s", "var(--danger)");
                } else {
                    this.lives--;
                    this.triggerFeedback("FAUX!", "var(--danger)");
                    if(this.lives<=0) setTimeout(()=>this.endGame(),500);
                }
                // Record error with BaseGame
                this.onWrongAnswer(null, { input: o.val, expected: this.question.r, operation: this.question.qText });
            }
        }
        this.updateHUD();
    }

    spawnScenery() {
        // Le décor pousse DANS le bas-côté, pas au hasard sur la largeur : il
        // atterrissait auparavant sur la route ou hors du canevas.
        const m = this.marge || 60;
        const side = Math.random()>.5 ? 'left' : 'right';
        const x = side=='left'
            ? m * (0.25 + Math.random() * 0.5)
            : this.w - m * (0.25 + Math.random() * 0.5);
        let type = 'tree';

        if(this.biome === 1) { type = Math.random()>.5 ? 'cactus' : 'rock'; }
        else if(this.biome === 2) { type = Math.random()>.5 ? 'ice_shard' : 'penguin'; }
        else if(this.biome === 3) { type = Math.random()>.5 ? 'vine' : 'leaf_cluster'; }
        else if(this.biome === 4) { type = 'building'; }
        else if(this.biome === 5) { type = Math.random()>.5 ? 'volcano' : 'lava_rock'; }
        else if(this.biome === 6) { type = Math.random()>.5 ? 'palm' : 'shell'; }
        else if(this.biome === 7) { type = Math.random()>.5 ? 'mushroom' : 'leaf_pile'; }
        else if(this.biome === 8) { type = Math.random()>.5 ? 'planet' : 'meteor'; }
        else if(this.biome === 9) { type = Math.random()>.5 ? 'balloon' : 'confetti'; }
        else {
            const campagne = ['tree','tree','bush','haystack','fence','flower','cloud'];
            type = campagne[Math.floor(Math.random()*campagne.length)];
        }

        this.scenery.push({ x:x, y: -150, type: type, scale: 0.6+Math.random()*0.4, depthFactor: 1.0 });
    }

    update() {
        if(this.gameState !== 'race') return;
        
        const tgt = biomes[this.biome];
        const ease = 0.02;
        this.col.bg = lerpColor(this.col.bg, tgt.bg, ease);
        this.col.line = lerpColor(this.col.line, tgt.line, ease);
        this.col.gate = lerpColor(this.col.gate, tgt.gate, ease);
        this.col.gateB = lerpColor(this.col.gateB, tgt.gateB, ease);

        if(this.bonusX2 > 0) this.bonusX2--;
        if(this.ralenti > 0) this.ralenti--;

        let targetSpeed = this.speedBase;
        // La montée en difficulté était très douce (+1 tous les 3000 points,
        // soit une trentaine de bonnes réponses). Elle suit maintenant les
        // paliers de biome, si bien que changer de paysage veut dire quelque
        // chose : chaque décor est un cran de plus.
        if(this.mode === 'survival') targetSpeed += this.biome * 0.45;
        if(this.ralenti > 0) targetSpeed *= 0.55;
        if(this.keys.Up) targetSpeed *= 2.5;
        this.currentSpeed += (targetSpeed - this.currentSpeed) * 0.1;

        this.p.targetX = this.lanesX[this.p.lane];
        this.p.x += (this.p.targetX - this.p.x) * 0.2;

        if(Math.random()<0.06) this.spawnScenery();
        this.scenery.forEach(s=>{
            const distanceFromCenter = Math.abs(s.x - this.screenCenter);
            s.depthFactor = 1.0 - (distanceFromCenter / this.w) * 0.5;
            s.y += this.currentSpeed * s.depthFactor;
        });
        this.scenery=this.scenery.filter(s=>s.y<this.h+100);

        let allGatesGone = true, hasGates = false;
        this.objects.forEach(o => {
            o.y += this.currentSpeed; 
            if(o.type==='gate') hasGates=true;

            if(!o.hit && o.y+30 > this.p.y && o.y < this.p.y+80 && this.p.lane === o.lane) {
                o.hit = true;
                this.handleCollision(o);
            }
            if(o.y < this.h+100 && o.type==='gate') allGatesGone = false;
        });
        this.objects = this.objects.filter(o => o.y < this.h+200);
        
        if(allGatesGone && hasGates) return; 
        if(this.objects.filter(o=>o.type==='gate').length === 0) this.spawnQ();

        if(this.feedback.active) { this.feedback.scale+=(1-this.feedback.scale)*0.2; this.feedback.life--; if(this.feedback.life<=0)this.feedback.active=false; }
        if(this.shake>0)this.shake--;
    }

    draw() {
        const c=this.ctx, w=this.w, h=this.h, lw=this.laneW;
        if(!c) return;
        c.save(); if(this.shake>0)c.translate(Math.random()*10-5,Math.random()*10-5);
        
        const bgC = `rgb(${this.col.bg[0]},${this.col.bg[1]},${this.col.bg[2]})`;
        const lineC = `rgb(${this.col.line[0]},${this.col.line[1]},${this.col.line[2]})`;
        const gBC = `rgb(${this.col.gateB[0]},${this.col.gateB[1]},${this.col.gateB[2]})`;
        
        c.fillStyle=bgC; c.fillRect(0,0,w,h);
        this.container.querySelector('#course-wrapper').style.backgroundColor = bgC;

        // Bas-côtés : deux bandes qui délimitent la route. Sans elles, le hors
        // piste avait exactement la teinte de la piste, et il n'y avait pas de
        // route à proprement parler — juste un fond uni traversé de pointillés.
        const borduresC = BAS_COTES[this.biome] || BAS_COTES[0];
        const bordG = Math.max(0, this.lanesX[0] - lw / 2);
        const bordD = Math.min(w, this.lanesX[this.laneCount - 1] + lw / 2);
        c.fillStyle = borduresC;
        c.fillRect(0, 0, bordG, h);
        c.fillRect(bordD, 0, w - bordD, h);
        c.fillStyle = 'rgba(0,0,0,.12)';
        c.fillRect(bordG - 6, 0, 6, h);
        c.fillRect(bordD, 0, 6, h);

        // Le décor est PEINT, plus seulement tracé : il était entièrement en
        // gris pâle, ce qui donnait des arbres en sucettes sur un bas-côté
        // invisible. Chaque silhouette prend les couleurs de son biome.
        this.scenery.forEach(s=>{
            const pal = DECORS[s.type] || DECORS.tree;
            c.save(); c.translate(s.x,s.y); c.scale(s.scale,s.scale);
            c.lineCap = 'round'; c.lineJoin = 'round';
            c.strokeStyle = pal.corps; c.fillStyle = pal.feuille; c.lineWidth = 6;

            if(s.type=='tree'){
                c.beginPath(); c.moveTo(0,50); c.lineTo(0,0); c.stroke();
                c.beginPath(); c.arc(0,-20,30,0,Math.PI*2); c.fill();
                c.fillStyle='rgba(255,255,255,.18)'; c.beginPath(); c.arc(-9,-30,12,0,Math.PI*2); c.fill();
            }
            else if(s.type=='bush'){
                c.beginPath(); c.arc(0,0,20,0,Math.PI*2); c.arc(15,5,15,0,Math.PI*2); c.arc(-15,5,15,0,Math.PI*2); c.fill();
            }
            else if(s.type=='cloud'){
                c.beginPath(); c.arc(0,0,30,Math.PI,0); c.arc(25,0,25,Math.PI,0); c.arc(-25,0,25,Math.PI,0); c.fill();
            }
            else if(s.type=='haystack'){
                c.beginPath(); c.ellipse(0,20,28,22,0,0,Math.PI*2); c.fill();
                c.strokeStyle=pal.corps; c.lineWidth=3;
                c.beginPath(); c.moveTo(-24,14); c.lineTo(24,14); c.moveTo(-20,26); c.lineTo(20,26); c.stroke();
            }
            else if(s.type=='fence'){
                c.lineWidth=5;
                c.beginPath(); c.moveTo(-20,50); c.lineTo(-20,0); c.moveTo(20,50); c.lineTo(20,0);
                c.moveTo(-32,14); c.lineTo(32,14); c.moveTo(-32,32); c.lineTo(32,32); c.stroke();
            }
            else if(s.type=='flower'){
                c.lineWidth=4; c.beginPath(); c.moveTo(0,40); c.lineTo(0,6); c.stroke();
                for(let i=0;i<5;i++){ c.beginPath(); c.arc(Math.cos(i*1.257)*11, Math.sin(i*1.257)*11, 8, 0, Math.PI*2); c.fill(); }
                c.fillStyle='#ffd54f'; c.beginPath(); c.arc(0,0,6,0,Math.PI*2); c.fill();
            }
            else if(s.type=='cactus'){
                c.lineWidth=12; c.beginPath();
                c.moveTo(0,50); c.lineTo(0,-6); c.moveTo(0,22); c.lineTo(18,10); c.moveTo(0,34); c.lineTo(-18,22); c.stroke();
            }
            else if(s.type=='rock'){
                c.beginPath(); c.moveTo(-22,26); c.lineTo(-12,-2); c.lineTo(10,-8); c.lineTo(24,20); c.closePath();
                c.fillStyle=pal.corps; c.fill();
                c.fillStyle=pal.feuille; c.beginPath(); c.moveTo(-8,4); c.lineTo(6,-2); c.lineTo(10,12); c.closePath(); c.fill();
            }
            else if(s.type=='ice_shard'){
                c.beginPath(); c.moveTo(0,-30); c.lineTo(16,34); c.lineTo(-16,34); c.closePath(); c.fill();
                c.strokeStyle='#4fc3f7'; c.lineWidth=3; c.stroke();
            }
            else if(s.type=='penguin'){
                c.fillStyle=pal.corps; c.beginPath(); c.ellipse(0,16,17,22,0,0,Math.PI*2); c.fill();
                c.fillStyle=pal.feuille; c.beginPath(); c.ellipse(0,20,10,15,0,0,Math.PI*2); c.fill();
                c.fillStyle='#fbc02d'; c.beginPath(); c.moveTo(-5,2); c.lineTo(5,2); c.lineTo(0,9); c.closePath(); c.fill();
            }
            else if(s.type=='vine'){
                c.strokeStyle=pal.corps; c.lineWidth=5;
                c.beginPath(); c.moveTo(0,-10); c.quadraticCurveTo(14,20,0,50); c.stroke();
                c.fillStyle=pal.feuille;
                [0,20,40].forEach(dy=>{ c.beginPath(); c.ellipse(8,dy,10,6,0.6,0,Math.PI*2); c.fill(); });
            }
            else if(s.type=='leaf_cluster'){
                c.beginPath(); c.arc(0,0,20,0,Math.PI*2); c.arc(16,6,14,0,Math.PI*2); c.arc(-14,8,12,0,Math.PI*2); c.fill();
            }
            else if(s.type=='building'){
                c.fillStyle=pal.corps; c.fillRect(-22,-30,44,110);
                c.fillStyle=pal.feuille;
                for(let ry=-20; ry<70; ry+=22) for(let rx=-14; rx<16; rx+=16)
                    if((rx+ry)%3!==0) c.fillRect(rx,ry,9,12);
            }
            else if(s.type=='volcano'){
                c.fillStyle=pal.corps; c.beginPath(); c.moveTo(0,-14); c.lineTo(-34,54); c.lineTo(34,54); c.closePath(); c.fill();
                c.fillStyle=pal.feuille; c.beginPath(); c.moveTo(0,-20); c.lineTo(-11,10); c.lineTo(11,10); c.closePath(); c.fill();
            }
            else if(s.type=='lava_rock'){
                c.fillStyle=pal.corps; c.beginPath(); c.moveTo(-18,28); c.lineTo(-8,0); c.lineTo(14,4); c.lineTo(20,28); c.closePath(); c.fill();
                c.strokeStyle=pal.feuille; c.lineWidth=3; c.beginPath(); c.moveTo(-8,24); c.lineTo(2,10); c.lineTo(12,22); c.stroke();
            }
            else if(s.type=='palm'){
                c.strokeStyle=pal.corps; c.lineWidth=8;
                c.beginPath(); c.moveTo(0,54); c.quadraticCurveTo(-8,20,2,-6); c.stroke();
                c.fillStyle=pal.feuille;
                [[-1,-0.5],[1,-0.5],[-1,0.3],[1,0.3]].forEach(([sx,sy])=>{
                    c.beginPath(); c.ellipse(2+sx*22, -6+sy*22, 22, 8, sy*0.9*sx, 0, Math.PI*2); c.fill();
                });
            }
            else if(s.type=='shell'){
                c.fillStyle=pal.corps; c.beginPath(); c.arc(0,10,16,Math.PI,0); c.closePath(); c.fill();
                c.strokeStyle=pal.feuille; c.lineWidth=2;
                [-8,0,8].forEach(dx=>{ c.beginPath(); c.moveTo(0,10); c.lineTo(dx,-5); c.stroke(); });
            }
            else if(s.type=='mushroom'){
                c.fillStyle=pal.corps; drawRound(c,-8,10,16,34,6); c.fill();
                c.fillStyle=pal.feuille; c.beginPath(); c.arc(0,12,20,Math.PI,0); c.closePath(); c.fill();
                c.fillStyle='#fff'; [-9,0,9].forEach(dx=>{ c.beginPath(); c.arc(dx,4,3.5,0,Math.PI*2); c.fill(); });
            }
            else if(s.type=='leaf_pile'){
                c.fillStyle=pal.corps; c.beginPath(); c.arc(-8,4,15,0,Math.PI*2); c.arc(10,0,13,0,Math.PI*2); c.fill();
                c.fillStyle=pal.feuille; c.beginPath(); c.arc(2,10,11,0,Math.PI*2); c.fill();
            }
            else if(s.type=='planet'){
                c.fillStyle=pal.corps; c.beginPath(); c.arc(0,0,28,0,Math.PI*2); c.fill();
                c.strokeStyle=pal.feuille; c.lineWidth=5;
                c.beginPath(); c.ellipse(0,4,42,11,-0.35,0,Math.PI*2); c.stroke();
            }
            else if(s.type=='meteor'){
                c.fillStyle=pal.corps; c.beginPath(); c.arc(0,0,15,0,Math.PI*2); c.fill();
                c.fillStyle=pal.feuille; c.beginPath(); c.moveTo(-6,-12); c.lineTo(6,-12); c.lineTo(0,-46); c.closePath(); c.fill();
            }
            else if(s.type=='balloon'){
                c.fillStyle=pal.corps; c.beginPath(); c.ellipse(0,0,18,22,0,0,Math.PI*2); c.fill();
                c.strokeStyle=pal.feuille; c.lineWidth=2; c.beginPath(); c.moveTo(0,22); c.lineTo(0,48); c.stroke();
            }
            else if(s.type=='confetti'){
                [[0,0,pal.corps],[12,10,pal.feuille],[-10,16,'#ef5350']].forEach(([dx,dy,col])=>{
                    c.save(); c.translate(dx,dy); c.rotate(dx+dy); c.fillStyle=col; c.fillRect(-4,-3,8,6); c.restore();
                });
            }
            c.restore();
        });

        c.strokeStyle = lineC; c.lineWidth=4; c.setLineDash([40,30]); 
        c.lineDashOffset=-Date.now()*(this.currentSpeed/30)%70;
        c.beginPath();
        // Les séparateurs partent du bord de la ROUTE, pas du bord du canevas :
        // depuis que les bas-côtés existent, la première voie ne commence plus
        // à zéro, et les pointillés tombaient au milieu des voies.
        for(let i=1; i<this.laneCount; i++) {
            const x = bordG + lw * i;
            c.moveTo(x, 0); c.lineTo(x, h);
        }
        c.stroke(); c.setLineDash([]);

        c.font="bold 28px 'Courier New'"; c.textAlign="center"; c.textBaseline="middle";
        this.objects.forEach(o=>{
            if(o.hit)return; const x=this.lanesX[o.lane], y=o.y;
            if(o.type==='gate'){
                const gw=this.laneW*0.8; 
                const gC = `rgb(${this.col.gate[0]},${this.col.gate[1]},${this.col.gate[2]})`;
                const gbC = `rgb(${this.col.gateB[0]},${this.col.gateB[1]},${this.col.gateB[2]})`;
                
                c.fillStyle= gC; c.strokeStyle= gbC; c.lineWidth=3; 
                c.beginPath(); drawRound(c,x-gw/2, y, gw, 80, 10); c.fill(); c.stroke();
                c.fillStyle= gbC; c.fillText(String(o.val).replace('.',','), x, y+40);
            } 
            else if(o.type==='star') {
                 c.fillStyle='#f1c40f'; c.beginPath(); 
                 const rot = Date.now()/200;
                 for(let i=0;i<5;i++) c.lineTo(Math.cos(rot+i*Math.PI*0.4)*20+x, Math.sin(rot+i*Math.PI*0.4)*20+y+20);
                 c.fill();
            }
            else if(o.type==='bonus_shield') { c.fillStyle='#3498db'; c.beginPath(); c.arc(x,y+30,25,0,Math.PI*2); c.fill(); c.fillStyle='#fff'; c.fillText("🛡️", x, y+30); }
            else if(o.type==='bonus_life') { c.fillStyle='#e74c3c'; c.beginPath(); c.arc(x,y+30,25,0,Math.PI*2); c.fill(); c.fillStyle='#fff'; c.fillText("❤️", x, y+30); }
            else if(o.type==='bonus_time') { c.fillStyle='#9b59b6'; c.beginPath(); c.arc(x,y+30,25,0,Math.PI*2); c.fill(); c.fillStyle='#fff'; c.fillText("⏳", x, y+30); }
            else if(o.type==='bonus_x2') { c.fillStyle='#8e44ad'; c.beginPath(); c.arc(x,y+30,25,0,Math.PI*2); c.fill(); c.fillStyle='#fff'; c.font="900 22px 'Outfit', sans-serif"; c.fillText("x2", x, y+30); }
            else if(o.type==='bonus_slow') { c.fillStyle='#00b894'; c.beginPath(); c.arc(x,y+30,25,0,Math.PI*2); c.fill(); c.fillStyle='#fff'; c.fillText("🐢", x, y+30); }
            else if(o.type==='obstacle') {
                // Un plot de chantier : reconnaissable au premier coup d'œil,
                // ce qui est indispensable pour un élément qu'on doit éviter en
                // même temps qu'on calcule.
                c.fillStyle='#2c3e50'; drawRound(c, x-32, y+46, 64, 12, 4); c.fill();
                c.fillStyle='#e67e22';
                c.beginPath(); c.moveTo(x, y-4); c.lineTo(x+26, y+48); c.lineTo(x-26, y+48); c.closePath(); c.fill();
                c.fillStyle='#ffffff'; c.fillRect(x-17, y+20, 34, 9);
            }
        });

        const cx=this.p.x, cy=this.p.y;
        // Ombre portée, puis le véhicule CHOISI : sa carrosserie n'est plus
        // écrite en dur ici, chaque modèle sait se dessiner.
        c.fillStyle='rgba(0,0,0,0.22)';
        c.beginPath(); c.ellipse(cx, cy+96, 34, 12, 0, 0, Math.PI*2); c.fill();

        c.save(); c.translate(cx, cy);
        dessinerVehicule(c, this.vehicule);
        c.restore();

        if(this.shield) { c.strokeStyle='#3498db'; c.lineWidth=3; c.beginPath(); c.arc(cx,cy+50,60,0,Math.PI*2); c.stroke(); }
        if(this.bonusX2 > 0) {
            c.strokeStyle='#8e44ad'; c.lineWidth=3; c.setLineDash([8,6]);
            c.beginPath(); c.arc(cx,cy+50,70,0,Math.PI*2); c.stroke(); c.setLineDash([]);
        }

        if(this.currentSpeed > this.speedBase * 1.5) {
            c.fillStyle = '#fff'; c.beginPath(); c.moveTo(cx-10, cy+100); c.lineTo(cx, cy+130+Math.random()*20); c.lineTo(cx+10, cy+100); c.fill();
        }

        if(this.feedback.active){
            c.save(); c.translate(w/2,h/2); c.scale(this.feedback.scale,this.feedback.scale); c.rotate(-0.1);
            c.fillStyle=this.feedback.color; c.strokeStyle='#fff'; c.lineWidth=5; c.shadowColor='rgba(0,0,0,0.3)'; c.shadowBlur=20;
            c.beginPath(); drawRound(c,-250,-60,500,120,10); c.fill(); c.stroke();
            c.fillStyle='#fff'; c.shadowBlur=0; c.font="900 50px 'Courier New'"; c.fillText(this.feedback.text,0,5); c.restore();
        }
        c.restore();
    }
    
    loop() {
        if (!this.isRunning || !this.container.querySelector('#course-wrapper')) {
            if (this.rafId) cancelAnimationFrame(this.rafId);
            return;
        }
        this.update();
        this.draw();
        this.rafId = requestAnimationFrame(this.loop);
    }
}
