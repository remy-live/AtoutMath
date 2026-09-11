/**
 * games/jump/script.js
 * Math Jump : Version "Double Saut" & Accessible
 */

const JumpGame = {
    config: {
        gravity: 0.25,      // Gravité un peu plus légère
        jumpForce: 9,       // Saut normal
        boostForce: 11,     // Force du double saut
        speed: 6,           // Vitesse latérale
        platGap: 70         // Ecart réduit (beaucoup plus de plateformes !)
    },

    container: null,
    
    // Physique
    doodle: { x: 0, y: 0, vx: 0, vy: 0, w: 40, h: 40 },
    platforms: [],
    
    // État
    score: 0,
    cameraY: 0,
    isRunning: false,
    canDoubleJump: true, // Autorisation de sauter en l'air
    
    // Dimensions
    width: 300, 
    height: 600,

    // Inputs
    keys: { left: false, right: false, space: false },
    targetTable: 2,

    // --- 1. DÉMARRAGE ---
    start: function(container, options = {}) {
        this.stop();
        this.container = container;
        this.targetTable = options.table || 2;
        
        this.width = this.container.offsetWidth || 300;
        this.height = this.container.offsetHeight || 600;

        this.score = 0;
        this.cameraY = 0;
        this.isRunning = true;
        this.platforms = [];
        this.keys = { left: false, right: false, space: false };
        this.canDoubleJump = true;

        // Position de départ
        this.doodle = { 
            x: this.width / 2 - 20, 
            y: this.height - 150, 
            vx: 0, 
            vy: -this.config.jumpForce, 
            w: 40, h: 40 
        };

        if(window.GameSystem) {
            window.GameSystem.toggleLives(false);
            window.GameSystem.updateScore(0);
            window.GameSystem.toggleTimer(false);
        }

        this.createWorld();
        this.generateStartPlatforms();

        // Contrôles
        this.boundKeyDown = (e) => {
            if(e.key === 'ArrowLeft') this.keys.left = true;
            if(e.key === 'ArrowRight') this.keys.right = true;
            if(e.key === ' ' || e.key === 'ArrowUp') this.performDoubleJump();
        };
        this.boundKeyUp = (e) => {
            if(e.key === 'ArrowLeft') this.keys.left = false;
            if(e.key === 'ArrowRight') this.keys.right = false;
        };
        
        // Touch : Tap = Double saut, Gauche/Droite = Mouvement
        this.boundTouchStart = (e) => {
            const rect = this.container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            
            // Si on tape au milieu -> Saut
            if(x > this.width/3 && x < this.width*0.66) {
                this.performDoubleJump();
            } 
            // Sinon direction
            else if(x < this.width / 2) { 
                this.keys.left = true; this.keys.right = false; 
            } else { 
                this.keys.left = false; this.keys.right = true; 
            }
        };
        this.boundTouchEnd = () => { this.keys.left = false; this.keys.right = false; };

        document.addEventListener('keydown', this.boundKeyDown);
        document.addEventListener('keyup', this.boundKeyUp);
        this.container.addEventListener('pointerdown', this.boundTouchStart);
        document.addEventListener('pointerup', this.boundTouchEnd);

        requestAnimationFrame(() => this.gameLoop());
    },

    stop: function() {
        this.isRunning = false;
        if(this.boundKeyDown) {
            document.removeEventListener('keydown', this.boundKeyDown);
            document.removeEventListener('keyup', this.boundKeyUp);
            document.removeEventListener('pointerup', this.boundTouchEnd);
        }
        if(this.container) this.container.innerHTML = '';
    },

    // --- 2. MONDE ---
    createWorld: function() {
        this.container.innerHTML = `
            <div class="jump-container">
                <div class="jump-hud">Table de ${this.targetTable} <br><small>(Espace = Double Saut)</small></div>
                <div class="jump-doodle" id="doodle"></div>
            </div>
        `;
        this.doodleEl = document.getElementById('doodle');
        this.gameContainer = this.container.querySelector('.jump-container');
    },

    generateStartPlatforms: function() {
        // Base solide
        this.addPlatform(this.width / 2 - 40, this.height - 50, true);

        // Remplissage initial dense
        let y = this.height - 120;
        while (y > -100) {
            // Ecart réduit (70px)
            y -= this.config.platGap; 
            const x = Math.random() * (this.width - 80);
            this.addPlatform(x, y);
        }
    },

    addPlatform: function(x, y, forceSafe = false) {
        // Logique plus gentille : 70% de chance d'avoir une bonne réponse
        const isSafe = forceSafe || Math.random() > 0.3;
        let val;
        
        if(isSafe) {
            val = this.targetTable * (Math.floor(Math.random() * 10) + 1);
        } else {
            // Faux résultat
            val = (this.targetTable * (Math.floor(Math.random() * 10) + 1)) + 1;
        }

        const el = document.createElement('div');
        el.className = 'jump-plat';
        el.innerHTML = `<span>${val}</span>`;
        el.style.transform = `translate(${x}px, ${y}px)`;
        
        this.gameContainer.appendChild(el);

        this.platforms.push({
            el: el,
            x: x, y: y,
            w: 80, h: 15,
            val: val,
            isSafe: isSafe,
            broken: false
        });
    },

    // --- 3. MOTEUR ---
    gameLoop: function() {
        if(!this.isRunning) return;

        // 1. Mouvement Latéral
        if(this.keys.left) this.doodle.x -= this.config.speed;
        if(this.keys.right) this.doodle.x += this.config.speed;

        // Traversée des murs (Pacman)
        if(this.doodle.x < -20) this.doodle.x = this.width;
        if(this.doodle.x > this.width) this.doodle.x = -20;

        // 2. Gravité
        this.doodle.vy += this.config.gravity;
        this.doodle.y += this.doodle.vy;

        // 3. Caméra
        const limit = this.height * 0.5;
        if(this.doodle.y < limit) {
            const diff = limit - this.doodle.y;
            this.doodle.y = limit; 
            this.cameraY += diff;
            this.score += Math.floor(diff);
            this.recyclePlatforms();
        }

        // 4. Collisions (Rebond automatique)
        if(this.doodle.vy > 0) {
            this.checkCollisions();
        }

        // 5. Mort
        if(this.doodle.y > this.height) {
            this.gameOver();
            return;
        }

        // 6. Rendu
        this.render();

        if(window.GameSystem) window.GameSystem.updateScore(Math.floor(this.score / 10));

        requestAnimationFrame(() => this.gameLoop());
    },

    performDoubleJump: function() {
        if(this.canDoubleJump) {
            this.doodle.vy = -this.config.boostForce; // Gros saut
            this.canDoubleJump = false; // Consommé
            
            // Petit effet visuel
            this.doodleEl.style.filter = "brightness(1.5)";
            setTimeout(() => this.doodleEl.style.filter = "none", 200);
            
            if(window.ParticleSystem) window.ParticleSystem.burst(this.doodleEl, 10);
        }
    },

    checkCollisions: function() {
        const footX = this.doodle.x + 20;
        const footY = this.doodle.y + 40;
        const absoluteFootY = footY + this.cameraY;

        this.platforms.forEach(p => {
            if(p.broken) return;

            // Hitbox un peu plus large pour aider le joueur
            if(absoluteFootY >= p.y && absoluteFootY <= p.y + 25 &&
               footX >= p.x - 10 && footX <= p.x + p.w + 10) {
                
                if(p.isSafe) {
                    // REBOND RÉUSSI
                    this.doodle.vy = -this.config.jumpForce;
                    this.canDoubleJump = true; // On recharge le double saut !
                } else {
                    // PLATEFORME CASSÉE
                    p.broken = true;
                    p.el.classList.add('broken');
                }
            }
        });
    },

    recyclePlatforms: function() {
        const bottomLimit = this.cameraY + this.height;
        
        // Nettoyage
        for(let i = this.platforms.length - 1; i >= 0; i--) {
            if(this.platforms[i].y > bottomLimit) {
                this.platforms[i].el.remove();
                this.platforms.splice(i, 1);
            }
        }

        // Génération continue
        let highestY = bottomLimit;
        if(this.platforms.length > 0) {
            highestY = Math.min(...this.platforms.map(p => p.y));
        }

        while(highestY > this.cameraY - 100) { // On génère un peu plus haut que l'écran
            highestY -= this.config.platGap;
            
            // Astuce : On s'assure que la plateforme reste dans l'écran horizontalement
            const x = Math.random() * (this.width - 80);
            this.addPlatform(x, highestY);
        }
    },

    render: function() {
        this.doodleEl.style.transform = `translate(${this.doodle.x}px, ${this.doodle.y}px)`;
        
        // Animation CSS selon l'état du double saut
        if(!this.canDoubleJump) this.doodleEl.style.border = "3px solid white"; // Visuel "Boost utilisé"
        else this.doodleEl.style.border = "3px solid #27ae60";

        this.platforms.forEach(p => {
            const screenY = p.y - this.cameraY;
            p.el.style.transform = `translate(${p.x}px, ${screenY}px)`;
        });
    },

    gameOver: function() {
        this.isRunning = false;
        if(window.GameSystem) {
             window.GameSystem.showModal({
                 title: "PLOUF !", 
                 content: `Altitude : ${Math.floor(this.score / 10)}m`, 
                 actions: [
                    { label: "Rebondir", onClick: () => this.start(this.container, {table: this.targetTable}) },
                    { label: "Menu", onClick: () => window.GameSystem.stopGame() }
                 ]
             });
        }
    }
};

if (window.GameSystem) window.GameSystem.register('jump', JumpGame);