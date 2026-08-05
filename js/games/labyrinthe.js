import { regTimeout, regInterval } from '../core/timers.js';
import { BaseGame } from '../core/BaseGame.js';
import { createDemoGate } from '../core/demoPointer.js';

// Un DÉCOR par niveau : même règle, ambiance neuve — c'est le décor qui
// récompense la progression, pas des objets à ramasser.
const DECORS = [
    { nom: 'Forêt', emoji: '🌲', fond: 'linear-gradient(160deg, #ecfdf5, #d1fae5)', casebg: '#f0fdf4', accent: '#059669', mur: '#a7f3d0' },
    { nom: 'Océan', emoji: '🌊', fond: 'linear-gradient(160deg, #eff6ff, #dbeafe)', casebg: '#f0f9ff', accent: '#0284c7', mur: '#bae6fd' },
    { nom: 'Désert', emoji: '🏜️', fond: 'linear-gradient(160deg, #fffbeb, #fef3c7)', casebg: '#fffdf5', accent: '#d97706', mur: '#fde68a' },
    { nom: 'Volcan', emoji: '🌋', fond: 'linear-gradient(160deg, #fef2f2, #fee2e2)', casebg: '#fff5f5', accent: '#dc2626', mur: '#fecaca' },
    { nom: 'Espace', emoji: '🌌', fond: 'linear-gradient(160deg, #1e1b4b, #312e81)', casebg: '#3730a3', accent: '#a78bfa', mur: '#4c1d95', sombre: true },
    { nom: 'Banquise', emoji: '❄️', fond: 'linear-gradient(160deg, #f0fdfa, #ccfbf1)', casebg: '#f0fdff', accent: '#0d9488', mur: '#99f6e4' }
];

class Labyrinthe extends BaseGame {
    render() {
        this.container.innerHTML = `
            <style>
                .laby-arena { position: absolute; inset: 0; background: var(--laby-fond, var(--bg-app)); display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; touch-action: none; font-family: 'Inter', sans-serif; transition: background .6s; }
                .laby-float-gain { position: absolute; color: #10b981; font-weight: 900; font-size: 1.3rem; pointer-events: none; animation: floatUp 1s ease-out forwards; z-index: 20; text-shadow: 0 2px 4px rgba(0,0,0,0.4); transform: translateX(-50%); }
                .laby-header { position: absolute; top: 10px; left: 0; right: 0; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; z-index: 10; gap: 10px; }
                .laby-stats { background: rgba(255,255,255,0.8); backdrop-filter: blur(5px); padding: 5px 15px; border-radius: 20px; font-weight: bold; font-size: 0.9rem; color: var(--text-main); border: 1px solid var(--border); box-shadow: var(--shadow-sm); flex-shrink: 0; }
                
                .laby-timer-container { position: relative; flex: 1; max-width: 150px; height: 30px; background: rgba(0,0,0,0.05); border-radius: 15px; overflow: hidden; border: 1px solid var(--border); box-shadow: inset 0 2px 4px rgba(0,0,0,0.1); }
                .laby-timer-bar { position: absolute; left: 0; top: 0; bottom: 0; width: 100%; background: #10b981; transition: width 1s linear, background-color 0.3s; }
                .laby-timer-bar.warning { background: #f59e0b; }
                .laby-timer-bar.danger { background: #ef4444; }
                .laby-timer-text { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem; color: var(--text-main); z-index: 1; text-shadow: 0 1px 2px rgba(255,255,255,0.8); }
                
                .laby-calc { position: absolute; top: 70px; left: 50%; transform: translateX(-50%); font-size: 1.5rem; font-weight: bold; background: var(--laby-accent, var(--primary)); color: white; padding: 10px 30px; border-radius: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); z-index: 10; text-align: center; white-space: nowrap; transition: 0.2s; }
                .laby-calc.success { background: #10b981; box-shadow: 0 4px 15px rgba(16,185,129,0.3); transform: translateX(-50%) scale(1.1); }
                .laby-calc.error { background: #ef4444; box-shadow: 0 4px 15px rgba(239,68,68,0.3); animation: shake 0.4s; }
                
                .laby-board { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; background: var(--laby-mur, var(--border)); border: 6px solid var(--laby-mur, var(--border)); border-radius: 12px; padding: 4px; box-shadow: var(--shadow-md); margin-top: 80px; width: 90vw; max-width: 450px; aspect-ratio: 1/1; position: relative; transition: background .6s, border-color .6s; }
                .laby-cell { background: var(--laby-case, var(--bg-panel)); border-radius: 6px; display: flex; align-items: center; justify-content: center; position: relative; cursor: pointer; user-select: none; transition: 0.2s; }
                .laby-cell.lit { background: rgba(79, 70, 229, 0.08); box-shadow: inset 0 0 0 2px var(--laby-accent, rgba(79, 70, 229, 0.3)); }
                .laby-cell.visited { background: rgba(16, 185, 129, 0.15); }
                .laby-arena.laby-sombre .laby-door { color: #e0e7ff; }
                .laby-arena.laby-sombre .laby-cell.lit .laby-door { color: #fff; }
                
                .laby-door { font-size: 1.1rem; font-weight: 700; color: var(--text-muted); opacity: 0.15; transition: 0.3s; z-index: 2; pointer-events: none; }
                .laby-cell.lit .laby-door { opacity: 1; color: var(--text-main); }
                
                .laby-start { background: rgba(79,70,229,0.05); }
                .laby-end { background: rgba(16,185,129,0.05); }
                .laby-end::after { content: ''; position: absolute; width: 45%; height: 45%; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2310b981' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'%3E%3C/path%3E%3Cpolyline points='16 17 21 12 16 7'%3E%3C/polyline%3E%3Cline x1='21' y1='12' x2='9' y2='12'%3E%3C/line%3E%3C/svg%3E"); background-size: contain; background-repeat: no-repeat; background-position: center; opacity: 0.7; pointer-events: none; z-index: 1; }
                
                .laby-hero { position: absolute; background: var(--laby-accent, var(--primary)); border-radius: 50%; box-shadow: 0 4px 10px rgba(0,0,0,0.35); z-index: 3; transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); pointer-events: none; display: flex; align-items: center; justify-content: center; left: 0; top: 0; }
                .laby-hero::after { content: ''; width: 40%; height: 40%; background: rgba(255,255,255,0.8); border-radius: 50%; }
                
                .laby-msg { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); font-size: 0.9rem; color: var(--text-muted); text-align: center; }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(-50%); }
                    25% { transform: translateX(calc(-50% - 5px)); }
                    75% { transform: translateX(calc(-50% + 5px)); }
                }
                
                .laby-float-loss { position: absolute; color: #ef4444; font-weight: 900; font-size: 1.5rem; pointer-events: none; animation: floatUp 1s ease-out forwards; z-index: 20; text-shadow: 0 2px 4px rgba(0,0,0,0.5); transform: translateX(-50%); }
                @keyframes floatUp {
                    0% { opacity: 1; transform: translate(-50%, 0) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -50px) scale(1.5); }
                }
                
                html[data-theme="dark"] .laby-stats { background: rgba(30,41,59,0.8); color: #f8fafc; border-color: #334155; }
                html[data-theme="dark"] .laby-timer-container { background: rgba(0,0,0,0.3); border-color: #334155; }
                html[data-theme="dark"] .laby-timer-text { text-shadow: 0 1px 2px rgba(0,0,0,0.8); color: #fff; }
                html[data-theme="dark"] .laby-calc { color: #fff; }
                html[data-theme="dark"] .laby-board { background: #334155; border-color: #334155; }
                html[data-theme="dark"] .laby-cell { background: #1e293b; }
                html[data-theme="dark"] .laby-cell.lit { background: rgba(99, 102, 241, 0.15); box-shadow: inset 0 0 0 2px rgba(99, 102, 241, 0.4); }
                html[data-theme="dark"] .laby-cell.visited { background: rgba(16, 185, 129, 0.2); }
                html[data-theme="dark"] .laby-door { color: #cbd5e1; }
            </style>
            <div class="laby-arena">
                <div class="laby-header">
                    <div class="laby-stats"><span id="laby-decor">🌲</span> Niv. <span id="laby-lvl">1</span></div>
                    <div class="laby-timer-container">
                        <div class="laby-timer-bar" id="laby-timer-bar"></div>
                        <div class="laby-timer-text"><span id="laby-time">0</span>s</div>
                    </div>
                    <div class="laby-stats">⭐️ <span id="laby-score">0</span></div>
                </div>
                <div id="laby-calc" class="laby-calc">START</div>
                <div id="laby-board" class="laby-board"></div>
                <div class="laby-msg">Utilisez les flèches ou touchez une case adjacente</div>
            </div>
        `;
    }

    /**
     * Démonstration.
     *
     * Elle se contentait de lancer la partie : le plateau s'affichait, le
     * chronomètre tournait, et le héros ne bougeait jamais — le mode robot ne
     * montrait rien du jeu. Le robot prend donc la décision qu'on demande à
     * l'élève : parmi les quatre cases voisines, choisir celle qui porte la
     * réponse du calcul affiché.
     */
    runDemoSequence() {
        this.startGameLoop();
        this.demoGate = createDemoGate(this.container);

        const VOISINS = [{ dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 0, dy: -1 }];

        const pas = () => {
            if (this.isGameOver || this.demoGate.paused) return;
            const ici = this.grid[this.playerPos.y][this.playerPos.x];
            const bonne = VOISINS
                .map(d => ({ x: this.playerPos.x + d.dx, y: this.playerPos.y + d.dy }))
                .filter(p => p.x >= 0 && p.x < this.boardSize && p.y >= 0 && p.y < this.boardSize)
                .find(p => this.grid[p.y][p.x].displayedNumber == ici.correctAnswer);
            if (bonne) this.tryMoveTo(bonne.x, bonne.y);
        };

        // Un premier pas rapide pour que la vignette du catalogue montre déjà
        // un héros en mouvement, puis un rythme lisible.
        regTimeout(pas, 450);
        // Rangé dans `demoInterval` : c'est le nom que `pause()` sait couper.
        this.demoInterval = regInterval(pas, 1100);
    }

    startGameLoop() {
        this.boardSize = 6;
        this.boardEl = this.container.querySelector('#laby-board');
        this.calcEl = this.container.querySelector('#laby-calc');
        this.timeEl = this.container.querySelector('#laby-time');
        this.timerBar = this.container.querySelector('#laby-timer-bar');
        
        this.level = 1;
        this.baseTime = this.params.timeLimit || 60;
        this.timeReduction = this.params.timeReduction || 5;
        this.currentMaxTime = this.baseTime;
        this.timeLeft = this.currentMaxTime;
        this.timeEl.textContent = this.timeLeft;
        this.updateTimerVisuals();
        
        this.score = 0;
        this.container.querySelector('#laby-score').textContent = this.score;
        this.container.querySelector('#laby-lvl').textContent = this.level;
        
        this.playerPos = { x: 0, y: 0 };
        this.grid = [];
        this.isGameOver = false;
        
        this.initLevel();
        
        // Timer
        this.timerInterval = regInterval(() => {
            if(this.timeLeft > 0 && !this.isGameOver) {
                this.timeLeft--;
                this.timeEl.textContent = this.timeLeft;
                this.updateTimerVisuals();
                if(this.timeLeft <= 0) {
                    this.gameOver(false);
                }
            }
        }, 1000);
        
        // Keyboard controls
        this.handleKey = (e) => this.onKeyDown(e);
        document.addEventListener('keydown', this.handleKey);
    }
    
    updateTimerVisuals() {
        if (!this.timerBar) return;
        let pct = (this.timeLeft / this.currentMaxTime) * 100;
        pct = Math.max(0, Math.min(100, pct));
        this.timerBar.style.width = pct + '%';
        
        if (pct < 25) {
            this.timerBar.className = 'laby-timer-bar danger';
        } else if (pct < 50) {
            this.timerBar.className = 'laby-timer-bar warning';
        } else {
            this.timerBar.className = 'laby-timer-bar';
        }
    }
    
    generateQuestion() {
        const ops = this.params.operations || ['+', '-'];
        const op = ops[Math.floor(Math.random() * ops.length)];
        let a, b, res;
        
        if (op === '*') {
            const tables = this.params.tables || [2,3,4,5,6,7,8,9,10];
            a = tables[Math.floor(Math.random() * tables.length)];
            b = Math.floor(Math.random() * 9) + 2;
            res = a * b;
        } else if (op === '+') {
            a = Math.floor(Math.random() * 40) + 10;
            b = Math.floor(Math.random() * 40) + 10;
            res = a + b;
        } else if (op === '-') {
            b = Math.floor(Math.random() * 30) + 5;
            res = Math.floor(Math.random() * 30) + 5;
            a = b + res;
        } else if (op === '/') {
            b = Math.floor(Math.random() * 9) + 2;
            res = Math.floor(Math.random() * 9) + 2;
            a = b * res;
        }
        return { text: `${a} ${op === '*' ? '×' : op === '/' ? '÷' : op} ${b}`, result: res };
    }

    initLevel() {
        this.grid = [];
        this.boardEl.innerHTML = '';
        this.playerPos = { x: 0, y: 0 };
        this.calcEl.innerText = "Trouve le chemin !";
        
        // 1. Structure vide
        for (let y = 0; y < this.boardSize; y++) {
            let row = [];
            for (let x = 0; x < this.boardSize; x++) {
                row.push({
                    x: x, y: y,
                    isPath: false,
                    equation: null,
                    correctAnswer: null,
                    displayedNumber: null
                });
            }
            this.grid.push(row);
        }

        // 2. Générer chemin valide
        this.generatePath(0, 0);

        // 3. Remplir les leurres (bug corrigé : pas de leurre égal à la bonne réponse adjacente)
        this.fillDecoys();

        // 4. Décor du niveau, puis rendu
        this.appliquerDecor();
        this.renderBoard();
        this.updateUI();
    }

    /** Chaque niveau a son AMBIANCE : fond, cases, murs et héros changent. */
    appliquerDecor() {
        const decor = DECORS[(this.level - 1) % DECORS.length];
        const arena = this.container.querySelector('.laby-arena');
        arena.style.setProperty('--laby-fond', decor.fond);
        arena.style.setProperty('--laby-case', decor.casebg);
        arena.style.setProperty('--laby-accent', decor.accent);
        arena.style.setProperty('--laby-mur', decor.mur);
        arena.classList.toggle('laby-sombre', !!decor.sombre);
        const badge = this.container.querySelector('#laby-decor');
        if (badge) badge.textContent = decor.emoji;
        this.calcEl.title = decor.nom;
    }

    generatePath(startX, startY) {
        let cx = startX;
        let cy = startY;
        this.grid[cy][cx].isPath = true;
        this.pathCells = [{ x: cx, y: cy }];

        while (cx < this.boardSize - 1 || cy < this.boardSize - 1) {
            let moves = [];
            if (cx < this.boardSize - 1) moves.push({dx: 1, dy: 0});
            if (cy < this.boardSize - 1) moves.push({dx: 0, dy: 1});
            
            let move = moves[Math.floor(Math.random() * moves.length)];
            
            let currentCell = this.grid[cy][cx];
            cx += move.dx;
            cy += move.dy;
            let nextCell = this.grid[cy][cx];
            nextCell.isPath = true;
            this.pathCells.push({ x: cx, y: cy });

            let eq = this.generateQuestion();
            currentCell.equation = eq.text;
            nextCell.displayedNumber = eq.result; 
            currentCell.correctAnswer = eq.result;
        }
        this.grid[this.boardSize-1][this.boardSize-1].equation = "SORTIE";
    }
    
    fillDecoys() {
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                let cell = this.grid[y][x];
                if (cell.displayedNumber === null) {
                    // Trouver tous les voisins qui ont ce point comme destination potentielle
                    let neighborAnswers = [];
                    this.getNeighbors(x, y).forEach(n => {
                        if (this.grid[n.y][n.x].correctAnswer !== null) {
                            neighborAnswers.push(this.grid[n.y][n.x].correctAnswer);
                        }
                    });
                    
                    // Générer un nombre aléatoire qui N'EST PAS dans neighborAnswers
                    let decoy;
                    do {
                        decoy = Math.floor(Math.random() * 100) + 1; // Ajustement selon la difficulté
                    } while (neighborAnswers.includes(decoy));
                    
                    cell.displayedNumber = decoy;
                }
                if (!cell.equation) cell.equation = "???"; 
            }
        }
        this.grid[0][0].displayedNumber = ""; 
    }
    
    renderBoard() {
        this.boardEl.innerHTML = '';
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                let cellData = this.grid[y][x];
                let div = document.createElement('div');
                div.className = 'laby-cell';
                if (x === 0 && y === 0) div.classList.add('laby-start');
                if (x === this.boardSize - 1 && y === this.boardSize - 1) div.classList.add('laby-end');

                let span = document.createElement('span');
                span.className = 'laby-door';
                span.innerText = cellData.displayedNumber;
                div.appendChild(span);

                // Touch interaction for mobile
                div.onclick = () => this.tryMoveTo(x, y);
                
                this.boardEl.appendChild(div);
            }
        }
        
        // Setup Hero
        this.heroEl = document.createElement('div');
        this.heroEl.className = 'laby-hero';
        this.boardEl.appendChild(this.heroEl);
        
        // Wait for next frame to set initial position properly
        setTimeout(() => this.drawHero(), 10);
    }
    
    drawHero() {
        const index = this.playerPos.y * this.boardSize + this.playerPos.x;
        const cellDiv = this.boardEl.children[index];
        // Calculate position relative to board
        if(cellDiv) {
            // Set dynamic size based on cell
            const size = cellDiv.offsetWidth * 0.55;
            this.heroEl.style.width = size + 'px';
            this.heroEl.style.height = size + 'px';
            
            this.heroEl.style.left = cellDiv.offsetLeft + (cellDiv.offsetWidth - size)/2 + 'px';
            this.heroEl.style.top = cellDiv.offsetTop + (cellDiv.offsetHeight - size)/2 + 'px';
            
            // Add visited class to current cell
            cellDiv.classList.add('laby-visited', 'visited');
        }
    }
    
    updateUI() {
        const currentCell = this.grid[this.playerPos.y][this.playerPos.x];
        
        if (this.playerPos.x === this.boardSize-1 && this.playerPos.y === this.boardSize-1) {
            this.calcEl.innerText = "NIVEAU RÉUSSI !";
            this.calcEl.classList.add('success');
            setTimeout(() => this.calcEl.classList.remove('success'), 1000);
            
            // Next level logic
            setTimeout(() => this.nextLevel(), 1000);
        } else {
            this.calcEl.innerText = currentCell.equation;
        }

        // Light up neighbors
        this.boardEl.querySelectorAll('.laby-cell').forEach(el => el.classList.remove('lit'));
        this.boardEl.children[this.playerPos.y * this.boardSize + this.playerPos.x].classList.add('lit');
        
        this.getNeighbors(this.playerPos.x, this.playerPos.y).forEach(n => {
            const index = n.y * this.boardSize + n.x;
            this.boardEl.children[index].classList.add('lit');
        });
    }
    
    getNeighbors(x, y) {
        let n = [];
        if (x > 0) n.push({x: x-1, y: y});
        if (x < this.boardSize-1) n.push({x: x+1, y: y});
        if (y > 0) n.push({x: x, y: y-1});
        if (y < this.boardSize-1) n.push({x: x, y: y+1});
        return n;
    }
    
    onKeyDown(e) {
        if (this.isGameOver) return;

        let dx = 0, dy = 0;
        if (e.key === "ArrowUp") dy = -1;
        else if (e.key === "ArrowDown") dy = 1;
        else if (e.key === "ArrowLeft") dx = -1;
        else if (e.key === "ArrowRight") dx = 1;
        else return;

        const newX = this.playerPos.x + dx;
        const newY = this.playerPos.y + dy;

        this.tryMoveTo(newX, newY);
    }
    
    tryMoveTo(newX, newY) {
        if (this.isGameOver) return;
        
        // Ensure it's an adjacent cell
        const dx = Math.abs(newX - this.playerPos.x);
        const dy = Math.abs(newY - this.playerPos.y);
        if (dx + dy !== 1) return; // Must be exactly 1 step away (up, down, left, right)
        
        if (newX < 0 || newX >= this.boardSize || newY < 0 || newY >= this.boardSize) return;

        const currentCell = this.grid[this.playerPos.y][this.playerPos.x];
        const targetCell = this.grid[newY][newX];
        
        if (targetCell.displayedNumber == currentCell.correctAnswer) {
            // Correct move
            this.playerPos = { x: newX, y: newY };
            this.score += 10;
            this.container.querySelector('#laby-score').textContent = this.score;

            this.drawHero();
            this.updateUI();
        } else {
            // Wrong move
            this.calcEl.classList.add('error');
            setTimeout(() => this.calcEl.classList.remove('error'), 400);
            
            // Floating -3s penalty
            const targetCellDiv = this.boardEl.children[newY * this.boardSize + newX];
            if (targetCellDiv) {
                const floatLoss = document.createElement('div');
                floatLoss.textContent = '-3s';
                floatLoss.className = 'laby-float-loss';
                floatLoss.style.left = (targetCellDiv.offsetLeft + targetCellDiv.offsetWidth/2) + 'px';
                floatLoss.style.top = (targetCellDiv.offsetTop) + 'px';
                this.boardEl.appendChild(floatLoss);
                setTimeout(() => floatLoss.remove(), 1000);
            }
            
            // Penalize time or score
            this.score = Math.max(0, this.score - 5);
            this.container.querySelector('#laby-score').textContent = this.score;
            
            this.timeLeft = Math.max(0, this.timeLeft - 3);
            this.timeEl.textContent = this.timeLeft;
            this.updateTimerVisuals();
            
            // Visual feedback on the board (flash red)
            this.boardEl.style.borderColor = "#ef4444";
            setTimeout(() => this.boardEl.style.borderColor = "", 300);
        }
    }
    
    /** Texte flottant au-dessus d'une case (gain ou perte). */
    floatText(x, y, texte, classe) {
        const cellDiv = this.boardEl.children[y * this.boardSize + x];
        if (!cellDiv) return;
        const el = document.createElement('div');
        el.textContent = texte;
        el.className = classe;
        el.style.left = (cellDiv.offsetLeft + cellDiv.offsetWidth / 2) + 'px';
        el.style.top = cellDiv.offsetTop + 'px';
        this.boardEl.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    }

    nextLevel() {
        this.level++;
        this.score += 50; // Level complete bonus
        
        // Register success for SequenceRunner and stats tracking
        this.onCorrectAnswer(null);
        
        this.container.querySelector('#laby-score').textContent = this.score;
        this.container.querySelector('#laby-lvl').textContent = this.level;
        
        // Reduce time for next level
        this.currentMaxTime = Math.max(15, this.baseTime - (this.level - 1) * this.timeReduction);
        this.timeLeft = this.currentMaxTime;
        this.timeEl.textContent = this.timeLeft;
        
        // Force reset visual instantly
        this.timerBar.style.transition = 'none';
        this.updateTimerVisuals();
        setTimeout(() => this.timerBar.style.transition = 'width 1s linear, background-color 0.3s', 50);
        
        this.initLevel();
    }
    
    gameOver(completed) {
        this.isGameOver = true;
        this.calcEl.innerText = `GAME OVER — Score : ${this.score}`;
        this.calcEl.style.background = "#ef4444";
        // `endGame()` n'existait pas : la fin de partie levait une exception
        // et l'écran restait figé. La partie s'arrête ici, proprement — les
        // réponses ont déjà été comptées coup par coup.
    }

    destroy() {
        // `super.destroy()` coupe les minuteurs et vide l'écran ; sans lui, le
        // chronomètre du labyrinthe continuait de tourner après la sortie.
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        document.removeEventListener('keydown', this.handleKey);
        window.removeEventListener('resize', this.handleResize);
        super.destroy();
    }
}

// Ensure hero stays properly positioned if window resizes
Labyrinthe.prototype.handleResize = function() {
    if(!this.isGameOver) this.drawHero();
}

export const engineLabyrinthe = (container, isDemo, params) => {
    const game = new Labyrinthe(container, isDemo, params);
    game.start();
    // Bind resize
    game.handleResize = game.handleResize.bind(game);
    window.addEventListener('resize', game.handleResize);
    
    // Un objet, et non la seule fonction de nettoyage : le moteur doit pouvoir
    // GELER une vignette — l'arrêter sans effacer son écran — et pas seulement
    // la démonter. Sous sa forme précédente, ce jeu était le seul dont l'aperçu
    // continuait de tourner indéfiniment dans le catalogue.
    return {
        pause: () => game.pause(),
        // `game.destroy()` et non l'inexistant `game.cleanup()` : l'écouteur
        // clavier et les minuteurs survivaient à la fermeture du jeu.
        destroy: () => game.destroy()
    };
};
