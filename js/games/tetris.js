import { BaseGame } from '../core/BaseGame.js';
import { state } from '../core/state.js';

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
        
        this.COLS = 10;
        this.ROWS = 20;
        this.BLOCK_SIZE = 30;
        
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
                    position: relative; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; 
                    background: var(--bg-app); color: var(--text-main); overflow: hidden; touch-action: none;
                    font-family: var(--font-main, 'Outfit', sans-serif);
                }
                .tetris-container {
                    display: flex; flex-direction: row; gap: 25px; padding: 25px; 
                    background: var(--bg-panel); border: 1px solid var(--border);
                    border-radius: 16px; box-shadow: var(--shadow-lg); 
                    max-width: 100%; max-height: 100%; align-items: stretch;
                }
                .tetris-canvas-area {
                    display: flex; align-items: center; justify-content: center;
                    background: var(--bg-app); border: 2px solid var(--border); border-radius: 12px;
                    box-shadow: inset 0 4px 10px rgba(0,0,0,0.05);
                    padding: 5px;
                }
                .tetris-canvas-area canvas {
                    background-color: transparent; display: block;
                }
                .tetris-sidebar {
                    display: flex; flex-direction: column; width: 150px; text-align: center; justify-content: flex-start; gap: 15px;
                }
                .tetris-panel {
                    background: var(--bg-app); padding: 15px 10px; border: 1px solid var(--border); border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                }
                .tetris-panel h2 { margin: 0 0 5px 0; font-size: 1rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; font-weight: 600;}
                .tetris-value { font-size: 2.5rem; color: var(--primary); font-weight: 800; line-height: 1; }
                #tetris-target-val { color: var(--warning); font-size: 3.5rem; transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                .tetris-mobile-controls {
                    position: absolute; bottom: 20px; left: 0; width: 100%; display: none; justify-content: center; gap: 15px; pointer-events: none; z-index: 5;
                }
                .tetris-btn-ctrl {
                    width: 60px; height: 60px; background: var(--bg-panel); border: 2px solid var(--primary); color: var(--primary);
                    border-radius: 50%; pointer-events: auto; display: flex; align-items: center; justify-content: center; font-size: 24px;
                    user-select: none; box-shadow: 0 4px 12px rgba(0,0,0,0.15); opacity: 0.9; transition: all 0.1s;
                }
                .tetris-btn-ctrl:active { background: var(--primary); color: #fff; transform: scale(0.95); }
                .tetris-overlay {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); backdrop-filter: blur(4px);
                    display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 10; border-radius: 16px;
                }
                .tetris-start-btn {
                    background: var(--primary); color: #fff; border: none; padding: 15px 40px; border-radius: 30px; font-weight: 800;
                    font-size: 1.5rem; cursor: pointer; margin-top: 25px; transition: 0.2s; box-shadow: 0 4px 15px rgba(0,0,0,0.2); text-transform: uppercase; letter-spacing: 1px;
                }
                .tetris-start-btn:hover { transform: scale(1.05); filter: brightness(1.1); }
                .tetris-hidden { display: none !important; }
                @media (max-width: 768px) {
                    .tetris-wrapper { align-items: flex-start; padding-top: 10px; }
                    .tetris-container {
                        flex-direction: row; padding: 10px; gap: 10px; width: 95%; height: auto; align-items: flex-start;
                        box-shadow: none; border: none; background: transparent; padding-bottom: 20px; justify-content: center;
                    }
                    .tetris-sidebar {
                        width: 90px; gap: 10px;
                    }
                    .tetris-panel { padding: 5px; }
                    .tetris-panel h2 { font-size: 0.7rem; }
                    .tetris-value { font-size: 1.5rem; }
                    #tetris-target-val { font-size: 1.8rem; }
                    .tetris-canvas-area { width: auto; flex: 1; max-width: 250px; }
                    .tetris-canvas-area canvas { width: 100%; height: auto; max-height: 60vh; object-fit: contain; }
                }
            </style>
            
            <div class="tetris-wrapper" id="tetris-wrapper">
                <div class="tetris-container">
                    <div class="tetris-canvas-area">
                        <canvas id="tetris-cvs" width="300" height="600"></canvas>
                    </div>

                    <div class="tetris-sidebar">
                        <div class="tetris-panel">
                            <h2>CIBLE</h2>
                            <div id="tetris-target-val" class="tetris-value">?</div>
                        </div>
                        <div class="tetris-panel">
                            <h2>SUIVANT</h2>
                            <canvas id="tetris-next-cvs" width="80" height="120"></canvas>
                        </div>
                        <div class="tetris-panel">
                            <h2>SCORE</h2>
                            <div id="tetris-score-val" class="tetris-value">0</div>
                        </div>
                    </div>

                    <div id="tetris-start-screen" class="tetris-overlay">
                        <h1 style="font-size: 3rem; color: var(--primary); margin: 0; text-align:center;">MATH TETRIS</h1>
                        <p style="font-size: 1.2rem; color: #fff; text-align:center; padding: 0 20px;">Combine les blocs pour faire le produit !</p>
                        <p style="color: var(--warning); text-align:center;">Exemple: Si Cible = 12, colle 3 et 4.</p>
                        <button class="tetris-start-btn" id="tetris-btn-play">JOUER</button>
                    </div>

                    <div id="tetris-game-over" class="tetris-overlay tetris-hidden">
                        <h1 style="color: var(--danger);">PERDU !</h1>
                        <p style="font-size: 2rem; color: #fff;">Score Final: <span id="tetris-final-score">0</span></p>
                        <button class="tetris-start-btn" id="tetris-btn-replay">REJOUER</button>
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
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', this.handleKeyDown);
        
        this.container.querySelector('#tetris-btn-play').onclick = () => this.startPlay();
        this.container.querySelector('#tetris-btn-replay').onclick = () => this.startPlay();

        // Canvas touch/click controls
        this.cvs.addEventListener('pointerdown', (e) => {
            if (!this.gameRunning) return;
            e.preventDefault();
            const rect = this.cvs.getBoundingClientRect();
            const scaleX = this.cvs.width / rect.width;
            const scaleY = this.cvs.height / rect.height;
            const clickX = (e.clientX - rect.left) * scaleX;
            const clickY = (e.clientY - rect.top) * scaleY;
            
            const p = this.player;
            if(!p || !p.matrix) return;
            const pCenterX = (p.pos.x + p.matrix[0].length / 2) * this.BLOCK_SIZE;
            const pBottomY = (p.pos.y + p.matrix.length) * this.BLOCK_SIZE;
            
            if (clickY > pBottomY + this.BLOCK_SIZE) {
                this.playerDrop();
            } else if (clickX < pCenterX - this.BLOCK_SIZE) {
                this.playerMove(-1);
            } else if (clickX > pCenterX + this.BLOCK_SIZE) {
                this.playerMove(1);
            } else {
                this.playerRotate();
            }
        });
    }

    runDemoSequence() {
        this.startGameLoop();
        this.startPlay();
        this.dropInterval = 400; // fast
        this.demoInterval = setInterval(() => {
            if(!this.gameRunning) return;
            const r = Math.random();
            if(r < 0.3) this.playerMove(-1);
            else if(r < 0.6) this.playerMove(1);
            else if(r < 0.8) this.playerRotate();
        }, 400);
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
    }

    destroy() {
        this.gameRunning = false;
        super.destroy();
        document.removeEventListener('keydown', this.handleKeyDown);
        if(this.rafId) cancelAnimationFrame(this.rafId);
        if(this.demoInterval) clearInterval(this.demoInterval);
    }

    checkMathMatches() {
        if (!this.gameRunning || !this.container.querySelector('#tetris-score-val')) return;
        let matches = [];
        
        const check = (x1, y1, x2, y2) => {
            if (this.grid[y1][x1] === 0 || this.grid[y2][x2] === 0) return;
            if (this.grid[y1][x1] * this.grid[y2][x2] === this.currentTarget) {
                matches.push({x: x1, y: y1});
                matches.push({x: x2, y: y2});
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

    drawMatrix(matrix, offset, context) {
        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const bx = (x + offset.x) * this.BLOCK_SIZE;
                    const by = (y + offset.y) * this.BLOCK_SIZE;
                    const bs = this.BLOCK_SIZE;

                    // Draw rounded block
                    context.fillStyle = COLORS[value];
                    drawRoundRect(context, bx + 1, by + 1, bs - 2, bs - 2, 6);
                    context.fill();
                    
                    // Subtle highlight on top
                    context.fillStyle = 'rgba(255,255,255,0.2)';
                    drawRoundRect(context, bx + 1, by + 1, bs - 2, bs/3, 6);
                    context.fill();

                    // Subtle shadow on bottom
                    context.fillStyle = 'rgba(0,0,0,0.1)';
                    drawRoundRect(context, bx + 1, by + bs - bs/3 - 1, bs - 2, bs/3, 6);
                    context.fill();

                    // Text
                    context.fillStyle = '#1c2833'; // Dark readable text
                    context.font = '900 20px ' + getComputedStyle(document.body).fontFamily;
                    context.textAlign = 'center';
                    context.textBaseline = 'middle';
                    context.fillText(
                        value,
                        bx + bs/2,
                        by + bs/2 + 2
                    );
                }
            });
        });
    }
    
    drawNextPiece() {
        if(!this.nextCtx) return;
        this.nextCtx.clearRect(0,0, this.nextCvs.width, this.nextCvs.height);
        if (this.nextPieceMatrix) {
            const offsetX = (this.nextCvs.width/this.BLOCK_SIZE - this.nextPieceMatrix[0].length) / 2;
            const offsetY = (this.nextCvs.height/this.BLOCK_SIZE - this.nextPieceMatrix.length) / 2;
            this.drawMatrix(this.nextPieceMatrix, {x: offsetX, y: offsetY}, this.nextCtx);
        }
    }

    draw() {
        if(!this.ctx) return;
        this.ctx.clearRect(0, 0, this.cvs.width, this.cvs.height);

        // Draw faint grid background
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
        this.ctx.lineWidth = 1;
        for(let i=0; i<=this.COLS; i++) {
            this.ctx.beginPath(); this.ctx.moveTo(i*this.BLOCK_SIZE, 0); this.ctx.lineTo(i*this.BLOCK_SIZE, this.cvs.height); this.ctx.stroke();
        }
        for(let i=0; i<=this.ROWS; i++) {
            this.ctx.beginPath(); this.ctx.moveTo(0, i*this.BLOCK_SIZE); this.ctx.lineTo(this.cvs.width, i*this.BLOCK_SIZE); this.ctx.stroke();
        }

        this.drawMatrix(this.grid, {x: 0, y: 0}, this.ctx);
        if (this.player.matrix) {
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

        this.dropCounter += deltaTime;
        if (this.dropCounter > this.dropInterval) {
            this.playerDrop();
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
