/**
 * games/snake/script.js
 * Math Snake : Version Améliorée (Effets + Zone de sécurité)
 */

const SnakeGame = {
    config: {
        gridSize: 15,
        speed: 150,
        mode: 'add',
        lives: 3
    },

    container: null,
    gridEl: null,
    hudEl: null,

    // État du jeu
    snake: [],
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    foodItems: [],
    currentQuestion: null,
    score: 0,
    lives: 3,
    gameLoopInterval: null,
    isGameOver: false,
    boundHandleKey: null,

    // --- 1. DÉMARRAGE ---
    start: function(container, options = {}) {
        this.stop();
        this.container = container;
        this.config.mode = options.mode || 'add';
        this.config.speed = options.speed || 150;
        this.config.gridSize = options.gridSize || 15;
        this.config.lives = options.lives || 3;

        this.score = 0;
        this.lives = this.config.lives;
        this.isGameOver = false;

        const mid = Math.floor(this.config.gridSize / 2);
        this.snake = [{x: mid, y: mid}, {x: mid-1, y: mid}, {x: mid-2, y: mid}];
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };

        if(window.GameSystem) {
            window.GameSystem.toggleLives(true);
            window.GameSystem.updateScore(0);
            window.GameSystem.toggleTimer(false);
            this.updateLivesUI();
        }

        this.createWorld();
        this.nextRound();
        
        this.boundHandleKey = this.handleKey.bind(this);
        document.addEventListener('keydown', this.boundHandleKey);

        this.gameLoopInterval = setInterval(() => this.tick(), this.config.speed);
    },

    stop: function() {
        clearInterval(this.gameLoopInterval);
        if (this.boundHandleKey) document.removeEventListener('keydown', this.boundHandleKey);
        if (this.container) this.container.innerHTML = '';
    },

    // --- 2. MONDE ---
    createWorld: function() {
        this.container.innerHTML = `
            <div class="snake-container">
                <div class="snake-hud" id="snake-q">Prêt ?</div>
                <div class="snake-grid" id="snake-grid"></div>
            </div>
        `;
        this.gridEl = document.getElementById('snake-grid');
        this.hudEl = document.getElementById('snake-q');

        this.gridEl.style.gridTemplateColumns = `repeat(${this.config.gridSize}, 30px)`;
        this.gridEl.style.gridTemplateRows = `repeat(${this.config.gridSize}, 30px)`;
    },

    updateLivesUI: function() {
        const container = document.getElementById('module-lives');
        if(!container) return;
        container.innerHTML = '';
        for(let i=0; i<3; i++) {
            const span = document.createElement('span');
            span.className = i < this.lives ? 'heart-icon' : 'heart-icon lost';
            span.innerText = '❤';
            span.style.margin = "0 2px";
            container.appendChild(span);
        }
    },

    // --- 3. MOTEUR ---
    tick: function() {
        if(this.isGameOver) return;

        this.direction = this.nextDirection;
        const head = this.snake[0];
        const newHead = { x: head.x + this.direction.x, y: head.y + this.direction.y };

        // 1. MORT INSTANTANÉE (Murs ou Queue)
        if (this.checkCollision(newHead)) {
            this.gameOver("Crash dans le mur !");
            return;
        }

        this.snake.unshift(newHead);

        // 2. NOURRITURE
        let ateFood = false;
        const foodIndex = this.foodItems.findIndex(f => f.x === newHead.x && f.y === newHead.y);

        if (foodIndex !== -1) {
            const food = this.foodItems[foodIndex];
            
            // Récupère la case HTML pour les effets visuels
            const cell = this.getCell(newHead.x, newHead.y);

            if (food.isCorrect) {
                // --- BONNE RÉPONSE ---
                ateFood = true; 
                this.score += 100;
                if(window.GameSystem) window.GameSystem.updateScore(this.score);
                
                // Effet visuel : Particules (Confettis)
                if(window.ParticleSystem && cell) window.ParticleSystem.burst(cell, 20);
                
                this.nextRound(); 
            } else {
                // --- MAUVAISE RÉPONSE ---
                this.lives--;
                this.score = Math.max(0, this.score - 50);
                if(window.GameSystem) window.GameSystem.updateScore(this.score);
                this.updateLivesUI();

                // NOUVEL EFFET : Explosion sur la mauvaise pomme
                if(window.ParticleSystem && cell) window.ParticleSystem.burst(cell, 15);

                this.snake.pop(); // Rétrécit
                
                // Feedback global (Secousse)
                this.container.classList.add('shake');
                setTimeout(() => this.container.classList.remove('shake'), 300);

                if(this.lives <= 0) {
                    this.gameOver("Plus de vies !");
                    return;
                }
                
                this.foodItems.splice(foodIndex, 1);
            }
        }

        if (!ateFood) {
            this.snake.pop();
        }

        this.render();
    },

    render: function() {
        this.gridEl.innerHTML = ''; 

        for (let y = 0; y < this.config.gridSize; y++) {
            for (let x = 0; x < this.config.gridSize; x++) {
                const cell = document.createElement('div');
                cell.className = 'snake-cell';
                cell.dataset.x = x; cell.dataset.y = y;
                this.gridEl.appendChild(cell);
            }
        }

        this.foodItems.forEach(f => {
            const cell = this.getCell(f.x, f.y);
            if(cell) {
                cell.classList.add('snake-food');
                cell.innerText = f.val;
            }
        });

        this.snake.forEach((segment, index) => {
            const cell = this.getCell(segment.x, segment.y);
            if(cell) {
                cell.classList.add(index === 0 ? 'snake-head' : 'snake-body');
            }
        });
    },

    // --- 4. LOGIQUE ---
    nextRound: function() {
        this.generateQuestion();
        this.spawnFood();
    },

    generateQuestion: function() {
        let a, b, op, res;
        if(this.config.mode === 'add') {
            a = Math.floor(Math.random() * 20) + 5;
            b = Math.floor(Math.random() * 20) + 5;
            op = "+"; res = a + b;
        } else {
            a = Math.floor(Math.random() * 9) + 2;
            b = Math.floor(Math.random() * 9) + 2;
            op = "×"; res = a * b;
        }
        this.currentQuestion = { txt: `${a} ${op} ${b} = ?`, res: res };
        this.hudEl.innerText = this.currentQuestion.txt;
    },

    // NOUVEAU : Génération des pommes avec marge de sécurité
    spawnFood: function() {
        this.foodItems = [];
        let answers = [this.currentQuestion.res];
        while(answers.length < 3) {
            let fake = this.currentQuestion.res + Math.floor(Math.random() * 10) - 5;
            if(fake > 0 && !answers.includes(fake)) answers.push(fake);
        }
        answers.sort(() => Math.random() - 0.5);

        // Marge de sécurité : 1 case
        const margin = 1;
        // Taille jouable réelle (ex: sur 15 cases, on joue sur les 13 centrales)
        const playableSize = this.config.gridSize - (margin * 2);

        answers.forEach(val => {
            let pos;
            do {
                // On génère une position dans la zone centrale uniquement
                pos = { 
                    x: Math.floor(Math.random() * playableSize) + margin, 
                    y: Math.floor(Math.random() * playableSize) + margin 
                };
            } while (!this.isValidSpawn(pos));

            this.foodItems.push({
                x: pos.x, y: pos.y, val: val,
                isCorrect: (val === this.currentQuestion.res)
            });
        });
    },

    isValidSpawn: function(pos) {
        const onSnake = this.snake.some(s => s.x === pos.x && s.y === pos.y);
        const onFood = this.foodItems.some(f => f.x === pos.x && f.y === pos.y);
        return !onSnake && !onFood;
    },

    checkCollision: function(pos) {
        if (pos.x < 0 || pos.x >= this.config.gridSize || pos.y < 0 || pos.y >= this.config.gridSize) return true;
        for(let i = 1; i < this.snake.length; i++) {
            if(this.snake[i].x === pos.x && this.snake[i].y === pos.y) return true;
        }
        return false;
    },

    handleKey: function(e) {
        if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) e.preventDefault();
        const d = this.direction;
        if (e.key === 'ArrowUp' && d.y === 0) this.nextDirection = { x: 0, y: -1 };
        else if (e.key === 'ArrowDown' && d.y === 0) this.nextDirection = { x: 0, y: 1 };
        else if (e.key === 'ArrowLeft' && d.x === 0) this.nextDirection = { x: -1, y: 0 };
        else if (e.key === 'ArrowRight' && d.x === 0) this.nextDirection = { x: 1, y: 0 };
    },

    getCell: function(x, y) {
        return this.gridEl.querySelector(`.snake-cell[data-x="${x}"][data-y="${y}"]`);
    },

    gameOver: function(reason) {
        this.isGameOver = true;
        clearInterval(this.gameLoopInterval);
        if(window.GameSystem) {
             window.GameSystem.showModal({
                 title: reason, 
                 content: `Score final : ${this.score}`, 
                 actions: [
                    { label: "Réessayer", onClick: () => this.start(this.container, this.config) },
                    { label: "Quitter", onClick: () => window.GameSystem.stopGame() }
                 ]
             });
        }
    }
};

if (window.GameSystem) window.GameSystem.register('snake', SnakeGame);