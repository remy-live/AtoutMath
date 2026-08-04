/**
 * games/drop/script.js
 * Number Drop : Empile pour faire 10 !
 */

const DropGame = {
    // Config de la grille
    ROWS: 10,
    COLS: 6,
    speed: 800, // Vitesse de chute (ms)

    container: null,
    gridEl: null,
    
    // État
    grid: [], // Tableau 2D [y][x]
    activePiece: null, // {x, y, val}
    score: 0,
    gameTimer: null,
    isRunning: false,
    
    // --- 1. DÉMARRAGE ---
    start: function(container, options = {}) {
        this.stop();
        this.container = container;
        
        // Options de vitesse
        this.speed = options.speed || 800;

        // Init Grille vide (0 = vide)
        this.grid = [];
        for(let r=0; r<this.ROWS; r++) {
            this.grid[r] = new Array(this.COLS).fill(0);
        }

        this.score = 0;
        this.isRunning = true;
        this.activePiece = null;

        if(window.GameSystem) {
            window.GameSystem.toggleLives(false);
            window.GameSystem.updateScore(0);
            window.GameSystem.toggleTimer(false);
        }

        this.createWorld();
        this.spawnPiece();
        this.draw();

        // Contrôles Clavier
        this.boundKeyDown = this.handleKey.bind(this);
        document.addEventListener('keydown', this.boundKeyDown);

        // Contrôles Tactiles (Zones de l'écran)
        this.boundTouch = this.handleTouch.bind(this);
        this.container.addEventListener('pointerdown', this.boundTouch);

        // Boucle de chute
        this.gameTimer = setInterval(() => this.tick(), this.speed);
    },

    stop: function() {
        this.isRunning = false;
        clearInterval(this.gameTimer);
        document.removeEventListener('keydown', this.boundKeyDown);
        if(this.container) this.container.innerHTML = '';
    },

    // --- 2. MONDE ---
    createWorld: function() {
    this.container.innerHTML = `
            <div class="drop-container">
                <div class="drop-hud">
                    <span>OBJECTIF: 10</span>
                    <span id="drop-score">0</span>
                </div>
                <div class="drop-rules">
                    Règle : Associe deux blocs qui se touchent pour faire 10 (ex: 6+4) !
                </div>
                <div class="drop-grid" id="drop-grid"></div>
                <div class="drop-controls-hint">Flèches pour bouger • Bas pour accélérer</div>
            </div>
        `;
        this.gridEl = document.getElementById('drop-grid');
        this.scoreEl = document.getElementById('drop-score');

        // Création des div pour chaque case
        for(let r=0; r<this.ROWS; r++) {
            for(let c=0; c<this.COLS; c++) {
                const cell = document.createElement('div');
                cell.className = 'drop-cell';
                cell.dataset.r = r;
                cell.dataset.c = c;
                this.gridEl.appendChild(cell);
            }
        }
    },

    // --- 3. LOGIQUE JEU ---
    spawnPiece: function() {
        // Chiffre aléatoire entre 1 et 9
        // On favorise les chiffres qui aident à faire 10 (ex: beaucoup de 5, de 3, de 7)
        const val = Math.floor(Math.random() * 9) + 1;
        
        this.activePiece = {
            x: Math.floor(this.COLS / 2) - 1, // Milieu
            y: 0,
            val: val
        };

        // Game Over si la case de départ est prise
        if(this.grid[0][this.activePiece.x] !== 0) {
            this.gameOver();
        }
    },

    tick: function() {
        if(!this.isRunning || !this.activePiece) return;
        
        // Essayer de descendre
        if(this.canMove(0, 1)) {
            this.activePiece.y++;
            this.draw();
        } else {
            // Touche le fond ou un bloc
            this.lockPiece();
        }
    },

    canMove: function(dx, dy) {
        const nx = this.activePiece.x + dx;
        const ny = this.activePiece.y + dy;

        // Limites Grille
        if(nx < 0 || nx >= this.COLS || ny >= this.ROWS) return false;
        
        // Collision avec bloc existant
        if(this.grid[ny][nx] !== 0) return false;

        return true;
    },

    lockPiece: function() {
        const p = this.activePiece;
        this.grid[p.y][p.x] = p.val;
        this.activePiece = null;
        
        // Vérifier les combinaisons (Faire 10)
        const matches = this.checkMatches(p.x, p.y);
        
        if(matches) {
            // Petit délai pour l'animation
            setTimeout(() => {
                this.applyGravity(); // Faire tomber les blocs qui flottent
                this.spawnPiece();
                this.draw();
            }, 300);
        } else {
            this.spawnPiece();
            this.draw();
        }
    },

    checkMatches: function(x, y) {
        let hasMatch = false;
        const val = this.grid[y][x];
        const target = 10 - val;

        // Vérifier les 4 voisins (Haut, Bas, Gauche, Droite)
        const neighbors = [
            {r: y-1, c: x}, {r: y+1, c: x},
            {r: y, c: x-1}, {r: y, c: x+1}
        ];

        neighbors.forEach(n => {
            if(n.r >= 0 && n.r < this.ROWS && n.c >= 0 && n.c < this.COLS) {
                if(this.grid[n.r][n.c] === target) {
                    // BINGO !
                    this.clearBlock(y, x);
                    this.clearBlock(n.r, n.c);
                    hasMatch = true;
                    this.score += 100;
                    
                    // FX Sonore ou visuel global ici
                }
            }
        });

        if(hasMatch) {
            if(window.GameSystem) window.GameSystem.updateScore(this.score);
            this.scoreEl.innerText = this.score;
        }

        return hasMatch;
    },

    clearBlock: function(r, c) {
        this.grid[r][c] = 0;
        // Animation CSS
        const cell = this.getCell(r, c);
        if(cell) {
            cell.classList.add('pop');
            if(window.ParticleSystem) window.ParticleSystem.burst(cell, 15);
            setTimeout(() => cell.classList.remove('pop'), 300);
        }
    },

    applyGravity: function() {
        // Faire tomber les blocs flottants (comme Columns ou Candy Crush)
        for(let c=0; c<this.COLS; c++) {
            // Pour chaque colonne, on rempile vers le bas
            let stack = [];
            for(let r=0; r<this.ROWS; r++) {
                if(this.grid[r][c] !== 0) stack.push(this.grid[r][c]);
            }
            
            // On vide la colonne
            for(let r=0; r<this.ROWS; r++) this.grid[r][c] = 0;

            // On remplit par le bas
            let rowIndex = this.ROWS - 1;
            while(stack.length > 0) {
                this.grid[rowIndex][c] = stack.pop();
                rowIndex--;
            }
        }
    },

    // --- 4. AFFICHAGE ---
// --- 4. AFFICHAGE (Corrigé) ---
    draw: function() {
        // 1. On nettoie TOUTE la grille d'abord
        for(let r=0; r<this.ROWS; r++) {
            for(let c=0; c<this.COLS; c++) {
                const cell = this.getCell(r, c);
                const val = this.grid[r][c];
                
                // RESET TOTAL : Classes + Texte + Style inline (C'est ça qui manquait !)
                cell.className = 'drop-cell';
                cell.innerText = '';
                cell.removeAttribute('style'); // Supprime les bordures blanches résiduelles

                // Si la case de la grille contient un bloc figé
                if(val !== 0) {
                    cell.classList.add('filled', `val-${val}`);
                    cell.innerText = val;
                }
            }
        }

        // 2. Dessiner la pièce active par dessus
        if(this.activePiece) {
            const p = this.activePiece;
            const cell = this.getCell(p.y, p.x);
            // Vérification de sécurité si la pièce est hors grille (ex: game over)
            if(cell) {
                cell.classList.add('filled', `val-${p.val}`);
                cell.innerText = p.val;
                // On ajoute la bordure blanche via le style
                cell.style.border = "2px solid white";
                cell.style.zIndex = "10"; // Pour être sûr qu'elle passe au dessus
            }
        }
    },

    getCell: function(r, c) {
        // Les cellules sont dans l'ordre du DOM (index = r * COLS + c)
        return this.gridEl.children[r * this.COLS + c];
    },

    // --- 5. INPUTS ---
    handleKey: function(e) {
        if(!this.isRunning || !this.activePiece) return;

        if(e.key === 'ArrowLeft') {
            if(this.canMove(-1, 0)) { this.activePiece.x--; this.draw(); }
        } else if(e.key === 'ArrowRight') {
            if(this.canMove(1, 0)) { this.activePiece.x++; this.draw(); }
        } else if(e.key === 'ArrowDown') {
            // Accélérer
            this.tick();
        }
    },

    handleTouch: function(e) {
        // Zones tactiles simples
        const rect = this.container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;

        if(x < width / 3) {
            // Gauche
            if(this.canMove(-1, 0)) { this.activePiece.x--; this.draw(); }
        } else if (x > width * 0.66) {
            // Droite
            if(this.canMove(1, 0)) { this.activePiece.x++; this.draw(); }
        } else {
            // Milieu = Bas
            this.tick();
        }
    },

    gameOver: function() {
        this.isRunning = false;
        clearInterval(this.gameTimer);
        if(window.GameSystem) {
             window.GameSystem.showModal({
                 title: "GRILLE PLEINE !", 
                 content: `Score Final : ${this.score}`, 
                 actions: [
                    { label: "Réessayer", onClick: () => this.start(this.container, {speed: this.speed}) },
                    { label: "Menu", onClick: () => window.GameSystem.stopGame() }
                 ]
             });
        }
    }
};

if (window.GameSystem) window.GameSystem.register('drop', DropGame);