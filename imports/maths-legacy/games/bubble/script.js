/**
 * games/bubble/script.js
 * Bubble Shooter Math : Vise 10 !
 */

const BubbleGame = {
    config: {
        cols: 7,            // Nombre de bulles par ligne
        bubbleSize: 48,     // Taille de grille (pas visuel)
        speed: 12           // Vitesse du tir
    },

    container: null,
    
    // État
    grid: [],           // Liste des bulles statiques {x, y, val, el}
    projectile: null,   // Bulle en vol {x, y, vx, vy, val, el}
    nextVal: 5,         // Valeur de la bulle dans le canon
    angle: 0,
    score: 0,
    isRunning: false,
    width: 0, height: 0,

    // --- 1. DÉMARRAGE ---
    start: function(container, options = {}) {
        this.stop();
        this.container = container;
        
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;

        this.grid = [];
        this.projectile = null;
        this.score = 0;
        this.isRunning = true;
        this.nextVal = Math.floor(Math.random() * 9) + 1;

        if(window.GameSystem) {
            window.GameSystem.toggleLives(false);
            window.GameSystem.updateScore(0);
            window.GameSystem.toggleTimer(false);
        }

        this.createWorld();
        this.initGrid(); // Remplir le début
        this.updateCannonDisplay();

        // Listeners
        this.boundMove = this.handleMouseMove.bind(this);
        this.boundClick = this.shoot.bind(this);
        
        this.container.addEventListener('mousemove', this.boundMove);
        this.container.addEventListener('pointerdown', this.boundClick);

        requestAnimationFrame(() => this.gameLoop());
    },

    stop: function() {
        this.isRunning = false;
        if(this.container) {
            this.container.removeEventListener('mousemove', this.boundMove);
            this.container.removeEventListener('pointerdown', this.boundClick);
            this.container.innerHTML = '';
        }
    },

    // --- 2. MONDE ---
    createWorld: function() {
        this.container.innerHTML = `
            <div class="bubble-container">
                <div class="bubble-hud">Objectif: Somme = 10</div>
                <div class="bubble-line"></div>
                <div class="bubble-cannon-barrel" id="barrel"></div>
                <div class="bubble-cannon-base"></div>
            </div>
        `;
        this.gameArea = this.container.querySelector('.bubble-container');
        this.barrel = document.getElementById('barrel');
    },

    initGrid: function() {
        // Remplir 4 lignes au hasard
        for(let r=0; r<4; r++) {
            for(let c=0; c<this.config.cols; c++) {
                // Décalage une ligne sur deux pour effet hexagonal
                const offsetX = (r % 2 === 0) ? 0 : this.config.bubbleSize / 2;
                const x = c * this.config.bubbleSize + offsetX + 25; // +25 marge
                const y = r * this.config.bubbleSize + 25;
                
                // On ne remplit pas tout pour laisser des trous
                if(Math.random() > 0.1) {
                    this.addBubbleToGrid(x, y, Math.floor(Math.random()*9)+1);
                }
            }
        }
    },

    addBubbleToGrid: function(x, y, val) {
        const el = document.createElement('div');
        el.className = `bubble bub-${val}`;
        el.innerText = val;
        el.style.left = (x - 22) + 'px'; // Centrer (44/2)
        el.style.top = (y - 22) + 'px';
        this.gameArea.appendChild(el);
        
        this.grid.push({ x: x, y: y, val: val, el: el });
    },

    updateCannonDisplay: function() {
        // Créer ou mettre à jour la bulle "prête"
        let ready = document.getElementById('ready-bubble');
        if(!ready) {
            ready = document.createElement('div');
            ready.id = 'ready-bubble';
            this.gameArea.appendChild(ready);
        }
        ready.className = `bubble ready bub-${this.nextVal}`;
        ready.innerText = this.nextVal;
        
        // Positionner au bas du canon
        ready.style.bottom = '20px';
        ready.style.left = '50%';
        ready.style.transform = 'translateX(-50%)';
    },

    // --- 3. MOTEUR ---
    gameLoop: function() {
        if(!this.isRunning) return;

        if(this.projectile) {
            this.updateProjectile();
        }

        requestAnimationFrame(() => this.gameLoop());
    },

    handleMouseMove: function(e) {
        const rect = this.container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Centre du canon
        const cannonX = this.width / 2;
        const cannonY = this.height - 40;

        // Calcul angle
        const dx = mouseX - cannonX;
        const dy = mouseY - cannonY;
        this.angle = Math.atan2(dy, dx);
        
        // Limiter l'angle (ne pas tirer vers le bas)
        if(this.angle > 0) this.angle = -Math.PI/2; 

        // Rotation visuelle du canon (+90deg car par défaut il est vertical)
        this.barrel.style.transform = `translateX(-50%) rotate(${this.angle * (180/Math.PI) + 90}deg)`;
    },

    shoot: function() {
        if(this.projectile) return; // Une seule balle à la fois

        const startX = this.width / 2;
        const startY = this.height - 60;
        
        // Créer l'élément visuel
        const el = document.createElement('div');
        el.className = `bubble bub-${this.nextVal}`;
        el.innerText = this.nextVal;
        this.gameArea.appendChild(el);

        // Init projectile
        this.projectile = {
            x: startX,
            y: startY,
            vx: Math.cos(this.angle) * this.config.speed,
            vy: Math.sin(this.angle) * this.config.speed,
            val: this.nextVal,
            el: el
        };

        // Préparer la suivante
        this.nextVal = Math.floor(Math.random() * 9) + 1;
        this.updateCannonDisplay();
    },

    updateProjectile: function() {
        const p = this.projectile;
        
        // Mouvement
        p.x += p.vx;
        p.y += p.vy;

        // Rebond murs
        if(p.x < 22 || p.x > this.width - 22) {
            p.vx *= -1;
            p.x = Math.max(22, Math.min(this.width - 22, p.x));
        }

        // Plafond (ça colle)
        if(p.y < 22) {
            this.snapProjectile();
            return;
        }

        // Collision avec autres bulles
        // On check la distance simple
        for(let b of this.grid) {
            const dx = p.x - b.x;
            const dy = p.y - b.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if(dist < 40) { // Un peu moins que la taille (44) pour contact
                this.handleHit(b);
                return;
            }
        }

        // Mise à jour visuelle
        p.el.style.left = (p.x - 22) + 'px';
        p.el.style.top = (p.y - 22) + 'px';
    },

    handleHit: function(targetBubble) {
        // Règle Mathématique : SOMME = 10 ?
        if(this.projectile.val + targetBubble.val === 10) {
            // BOUM !
            // Effets
            this.createPopEffect(targetBubble);
            this.createPopEffect(this.projectile);

            // Suppression du projectile
            this.projectile.el.remove();
            this.projectile = null;

            // Suppression de la cible de la grille
            const idx = this.grid.indexOf(targetBubble);
            if(idx > -1) {
                targetBubble.el.remove();
                this.grid.splice(idx, 1);
            }

            // Score
            this.score += 100;
            if(window.GameSystem) window.GameSystem.updateScore(this.score);

            // Check Victoire (grille vide) ?
            if(this.grid.length === 0) {
                this.gameOver("VICTOIRE !");
            }

        } else {
            // Pas 10 : Ça colle !
            this.snapProjectile();
        }
    },

    snapProjectile: function() {
        // Transforme le projectile en bulle statique
        const p = this.projectile;
        
        // On l'ajoute à la grille
        this.grid.push({ x: p.x, y: p.y, val: p.val, el: p.el });
        
        // Check défaite (Ligne rouge)
        if(p.y > this.height - 120) {
            this.gameOver("TROP BAS !");
        }
        
        this.projectile = null;
    },
    
    createPopEffect: function(bubbleObj) {
        // Petit burst de particules si possible, sinon animation CSS
        if(window.ParticleSystem) {
             window.ParticleSystem.burst(bubbleObj.el, 15);
        } else {
             // Fallback CSS (pas vraiment besoin car on remove, mais bon)
        }
    },

    gameOver: function(msg) {
        this.isRunning = false;
        if(window.GameSystem) {
             window.GameSystem.showModal({
                 title: msg, 
                 content: `Score : ${this.score}`, 
                 actions: [
                    { label: "Rejouer", onClick: () => this.start(this.container) },
                    { label: "Menu", onClick: () => window.GameSystem.stopGame() }
                 ]
             });
        }
    }
};

if (window.GameSystem) window.GameSystem.register('bubble', BubbleGame);