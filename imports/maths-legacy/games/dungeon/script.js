/**
 * games/dungeon/script.js
 * Math Dungeon : Version Complète (Chrono + Taille Configurable)
 */

const DungeonGame = {
    // Configuration par défaut
    config: {
        gridSize: 5,      
        lives: 3,         
        difficulty: 1,
        timeLimit: 0 // 0 = Pas de chrono (Mode Zen)
    },

    // État
    container: null,
    grid: [],
    playerPos: { x: 0, y: 0 },
    score: 0,
    currentObjective: null, 
    livesLeft: 0,
    isGameOver: false,
    
    // Timer
    timer: null,
    timeLeft: 0,

    // --- 1. DÉMARRAGE ---
 // --- 1. DÉMARRAGE ---
    start: function(container, options = {}) {
        // CORRECTIF : On nettoie toujours l'ancienne partie avant d'en lancer une nouvelle
        this.stop(); 

        this.container = container;
        this.isGameOver = false;
        
        // Options
        if (options.gridSize) this.config.gridSize = options.gridSize;
        if (options.lives) this.config.lives = options.lives;
        if (options.difficulty) this.config.difficulty = options.difficulty;
        this.config.timeLimit = (options.timeLimit !== undefined) ? options.timeLimit : 0;

        // HUD
        this.livesLeft = this.config.lives;
        
        if(window.GameSystem) {
            window.GameSystem.toggleLives(true);  
            window.GameSystem.updateScore(0);
            
            if (this.config.timeLimit > 0) {
                window.GameSystem.toggleTimer(true);
                this.timeLeft = this.config.timeLimit;
                this.startTimer();
            } else {
                window.GameSystem.toggleTimer(false);
                this.stopTimer();
            }
        }
        
        this.updateLivesUI();
        this.initGameData();
        this.render();
        
        // Clavier
        this.boundHandleInput = this.handleKey.bind(this);
        document.addEventListener('keydown', this.boundHandleInput);
    },

    stop: function() {
        this.stopTimer();
        document.removeEventListener('keydown', this.boundHandleInput);
    },

    // --- 2. TIMER (NOUVEAU) ---
    startTimer: function() {
        this.updateTimerDisplay(); // Affichage initial
        this.stopTimer(); // Sécurité
        
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();

            if (this.timeLeft <= 0) {
                this.gameOver("Temps écoulé !");
            }
        }, 1000);
    },

    stopTimer: function() {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
    },

    updateTimerDisplay: function() {
        if(!window.GameSystem) return;
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        const str = `${minutes}:${seconds < 10 ? '0'+seconds : seconds}`;
        // Alerte rouge si moins de 10 secondes
        window.GameSystem.updateTimer(str, this.timeLeft <= 10);
    },

    // --- 3. LOGIQUE JEU ---
    initGameData: function() {
        this.score = 0;
        this.playerPos = { x: 0, y: 0 };
        this.grid = [];
        const size = this.config.gridSize;

        // Grille vide
        for(let y=0; y<size; y++) {
            let row = [];
            for(let x=0; x<size; x++) { row.push({ x, y, val: null, op: null }); }
            this.grid.push(row);
        }

        // Drunkard's Walk
        let cx = 0, cy = 0;
        this.grid[0][0].val = " -> ";
        let steps = 0;
        const maxSteps = size * size * 3; // On augmente un peu la limite pour les grandes grilles

        while((cx < size-1 || cy < size-1) && steps < maxSteps) {
            steps++;
            const moves = [];
            if(cx < size-1) moves.push({dx:1, dy:0});
            if(cy < size-1) moves.push({dx:0, dy:1});
            if(moves.length === 0) break;

            const move = moves[Math.floor(Math.random() * moves.length)];
            const math = this.generateMath();
            
            this.grid[cy][cx].op = math.txt; 
            this.grid[cy][cx].solution = math.res;

            cx += move.dx; cy += move.dy;
            this.grid[cy][cx].val = math.res;
        }
        this.grid[size-1][size-1].val = " -> ";

        // Leurres
        for(let y=0; y<size; y++) {
            for(let x=0; x<size; x++) {
                if(this.grid[y][x].val === null) {
                    this.grid[y][x].val = Math.floor(Math.random() * 80) + 4;
                }
            }
        }
        this.currentObjective = this.grid[0][0].op; 
    },

    generateMath: function() {
        // Difficulté 1: Tables 2-5
        // Difficulté 2: Tables 2-9
        // Difficulté 3: Tables 5-12 + Additions complexes ? (Ici on reste sur Multiplications)
        let min = 2, max = 5;
        if(this.config.difficulty >= 2) max = 9;
        if(this.config.difficulty >= 3) { min = 3; max = 12; }

        const a = Math.floor(Math.random() * (max - min + 1)) + min;
        const b = Math.floor(Math.random() * (max - min + 1)) + min;
        return { txt: `${a} × ${b}`, res: a * b };
    },

    // --- 4. RENDU ---
    render: function() {
        this.container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'dungeon-container';

        this.questionBox = document.createElement('div');
        this.questionBox.className = 'dungeon-question-box';
        this.questionBox.innerText = this.currentObjective || "GO !";
        wrapper.appendChild(this.questionBox);

        this.gridEl = document.createElement('div');
        this.gridEl.className = 'dungeon-grid';
        // CONFIGURATION CSS GRID DYNAMIQUE
        this.gridEl.style.gridTemplateColumns = `repeat(${this.config.gridSize}, 1fr)`;
        
        for(let y=0; y<this.config.gridSize; y++) {
            for(let x=0; x<this.config.gridSize; x++) {
                const cellData = this.grid[y][x];
                const cellEl = document.createElement('div');
                cellEl.className = 'dungeon-cell';
                
                if(x===0 && y===0) cellEl.classList.add('start');
                if(x===this.config.gridSize-1 && y===this.config.gridSize-1) cellEl.classList.add('end');

                const span = document.createElement('span');
                span.innerText = cellData.val;
                cellEl.appendChild(span);
                
                cellEl.onclick = () => this.tryMove(x, y);
                cellData.el = cellEl; 
                this.gridEl.appendChild(cellEl);
            }
        }
        wrapper.appendChild(this.gridEl);
        this.container.appendChild(wrapper);
        this.drawHero();
    },

    drawHero: function() {
        const oldHero = document.querySelector('.dungeon-hero');
        if(oldHero) oldHero.remove();
        const oldActive = document.querySelector('.dungeon-cell.active-pos');
        if(oldActive) oldActive.classList.remove('active-pos');

        const cell = this.grid[this.playerPos.y][this.playerPos.x].el;
        if(cell) {
            cell.classList.add('active-pos');
            const hero = document.createElement('div');
            hero.className = 'dungeon-hero';
            cell.appendChild(hero);
        }
    },

    updateLivesUI: function() {
        const heartsContainer = document.getElementById('module-lives');
        if(heartsContainer) {
             heartsContainer.innerHTML = ''; 
             for(let i=0; i<this.config.lives; i++) {
                 const span = document.createElement('span');
                 span.className = 'heart-icon' + (i < this.livesLeft ? '' : ' lost');
                 span.innerText = '❤';
                 heartsContainer.appendChild(span);
             }
        }
    },

    // --- 5. INPUT & WIN/LOSE ---
    handleKey: function(e) {
        if(this.isGameOver) return;
        let dx = 0, dy = 0;
        if(e.key === "ArrowUp") dy = -1; else if(e.key === "ArrowDown") dy = 1;
        else if(e.key === "ArrowLeft") dx = -1; else if(e.key === "ArrowRight") dx = 1;
        else return;
        this.tryMove(this.playerPos.x + dx, this.playerPos.y + dy);
    },

    tryMove: function(x, y) {
        if(this.isGameOver) return;
        const dist = Math.abs(x - this.playerPos.x) + Math.abs(y - this.playerPos.y);
        if(dist !== 1) return; 

        const size = this.config.gridSize;
        if(x < 0 || x >= size || y < 0 || y >= size) return;

        const currentCell = this.grid[this.playerPos.y][this.playerPos.x];
        const targetCell = this.grid[y][x];
        
        // VICTOIRE (Arrivée)
        if(x === size-1 && y === size-1) {
            this.moveHero(x, y);
            this.win();
            return;
        }

        // VERIFICATION
        if(targetCell.val === currentCell.solution) {
            // Bonne réponse
            this.moveHero(x, y);
            this.currentObjective = targetCell.op;
            this.questionBox.innerText = this.currentObjective;
            if(window.ParticleSystem) window.ParticleSystem.burst(targetCell.el, 30);
            this.score += 50;
            if(window.GameSystem) window.GameSystem.updateScore(this.score);
        } else {
            // Mauvaise réponse
            targetCell.el.classList.add('shake');
            setTimeout(() => targetCell.el.classList.remove('shake'), 400);
            this.livesLeft--;
            this.updateLivesUI();
            if(this.livesLeft <= 0) this.gameOver("Plus de vies !");
        }
    },

    moveHero: function(x, y) {
        this.playerPos = {x, y};
        this.drawHero();
    },

    win: function() {
        this.isGameOver = true;
        this.stopTimer(); // Arrêt chrono
        this.score += 500 + (this.livesLeft * 100) + (this.timeLeft * 10); // Bonus Temps !
        if(window.GameSystem) window.GameSystem.updateScore(this.score);
        
        if(window.ParticleSystem) {
             const heroEl = document.querySelector('.dungeon-hero');
             if(heroEl) window.ParticleSystem.burst(heroEl, 100);
        }

        setTimeout(() => {
            window.GameSystem.showModal({
                title: "VICTOIRE !",
                content: `Donjon terminé !<br>Score : <strong>${this.score}</strong>`,
                actions: [
                    { label: "Rejouer", onClick: () => this.start(this.container, this.config) },
                    { label: "Quitter", onClick: () => window.GameSystem.stopGame() }
                ]
            });
        }, 500);
    },

    gameOver: function(reason) {
        this.isGameOver = true;
        this.stopTimer();
        window.GameSystem.showModal({
            title: "PERDU...",
            content: reason || "Dommage, retente ta chance !",
            actions: [
                { label: "Réessayer", onClick: () => this.start(this.container, this.config) },
                { label: "Quitter", onClick: () => window.GameSystem.stopGame() }
            ]
        });
    }
};

if (window.GameSystem) window.GameSystem.register('dungeon', DungeonGame);