/**
 * games/space/script.js
 * Math Invaders : Ultimate Edition (Niveaux + PowerUps)
 */

const SpaceGame = {
    // Configuration des Niveaux
    levels: {
        1: { speed: 1.5, spawnRate: 120, tables: [2,5,10], goal: 500 }, // Facile
        2: { speed: 2.5, spawnRate: 90,  tables: [3,4], goal: 1500 },   // Moyen
        3: { speed: 4.0, spawnRate: 70,  tables: [6,7,8,9], goal: 9999 } // Enfer
    },

    container: null,
    shipEl: null,
    hudEl: null,

    // État
    currentLevel: 1,
    shipX: 50,
    shipTilt: 0,
    bullets: [],
    objects: [], 
    currentQuestion: null,
    score: 0,
    lives: 3,
    isRunning: false,
    frameCount: 0,
    canShoot: true,
    
    // Power-Ups
    weaponLevel: 1, // 1 = Normal, 2 = Triple
    hasShield: false,
    bonusTimer: null,

    // --- 1. DÉMARRAGE ---
    start: function(container, options = {}) {
        this.stop();
        this.container = container;
        
        // Reset global
        this.currentLevel = 1;
        this.shipX = 50;
        this.shipTilt = 0;
        this.bullets = [];
        this.objects = [];
        this.score = 0;
        this.lives = 3;
        this.frameCount = 0;
        this.isRunning = true;
        this.canShoot = true;
        
        // Reset PowerUps
        this.weaponLevel = 1;
        this.hasShield = false;

        if(window.GameSystem) {
            window.GameSystem.toggleLives(true);
            window.GameSystem.updateScore(0);
            window.GameSystem.toggleTimer(false);
            this.updateLivesUI();
        }

        this.createWorld();
        this.generateQuestion();
        this.showLevelUp(1);

        this.boundHandleKey = this.handleKey.bind(this);
        this.boundHandleMouse = this.handleMouseMove.bind(this);
        this.boundHandleClick = this.shoot.bind(this);

        document.addEventListener('keydown', this.boundHandleKey);
        this.boundHandleKeyUp = (e) => { if(['ArrowLeft','ArrowRight'].includes(e.key)) this.shipTilt = 0; };
        document.addEventListener('keyup', this.boundHandleKeyUp);
        
        this.container.addEventListener('mousemove', this.boundHandleMouse);
        this.container.addEventListener('mousedown', this.boundHandleClick);

        requestAnimationFrame(() => this.gameLoop());
    },

    stop: function() {
        this.isRunning = false;
        clearTimeout(this.bonusTimer);
        if (this.boundHandleKey) {
            document.removeEventListener('keydown', this.boundHandleKey);
            document.removeEventListener('keyup', this.boundHandleKeyUp);
        }
        if (this.container) this.container.innerHTML = '';
    },

    updateLivesUI: function() {
        const div = document.getElementById('module-lives');
        if(div) {
            div.innerHTML = '';
            // Si on a un bouclier, on ajoute une icône spéciale ou juste +1 visuel
            const total = this.hasShield ? this.lives + 1 : this.lives;
            
            for(let i=0; i<3; i++) { // Max 3 coeurs affichés + Shield
                const span = document.createElement('span');
                span.className = i < this.lives ? 'heart-icon' : 'heart-icon lost';
                span.innerText = '❤';
                div.appendChild(span);
            }
        }
    },

    // --- 2. MONDE ---
    createWorld: function() {
        this.container.innerHTML = `
            <div class="space-container">
                <div class="screen-flash" id="space-flash"></div>
                <div class="impact-zone"></div>
                <div class="space-hud" id="space-q">Prêt ?</div>
                <div class="space-ship" id="space-ship">
                    <div class="ship-body"></div>
                    <div class="ship-cockpit"></div>
                    <div class="ship-wing-left"></div>
                    <div class="ship-wing-right"></div>
                    <div class="ship-engine"></div>
                </div>
            </div>
        `;
        this.shipEl = document.getElementById('space-ship');
        this.hudEl = document.getElementById('space-q');
        this.updateShipPos();
    },

    // --- 3. MOTEUR ---
    gameLoop: function() {
        if(!this.isRunning) return;
        this.frameCount++;

        // Spawn Rate dépend du niveau
        const cfg = this.levels[this.currentLevel];
        if(this.frameCount % cfg.spawnRate === 0) {
            this.spawnObject();
        }

        this.updateShipPos(); 
        this.updateBullets();
        this.updateObjects();
        this.checkLevelProgress();

        requestAnimationFrame(() => this.gameLoop());
    },

    updateShipPos: function() {
        this.shipX = Math.max(5, Math.min(95, this.shipX));
        this.shipEl.style.left = `calc(${this.shipX}% - 25px)`;
        this.shipEl.style.transform = `rotate(${this.shipTilt}deg)`;
    },

    shoot: function(e) {
        if(e && e.button !== 0) return;
        if(!this.canShoot) return;
        
        const shipRect = this.shipEl.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        const startX = shipRect.left - containerRect.left + (shipRect.width / 2) - 2;
        const startY = shipRect.top - containerRect.top;

        // TIR SIMPLE
        this.createBullet(startX, startY, 0);

        // TIR TRIPLE (Power-Up)
        if(this.weaponLevel >= 2) {
            this.createBullet(startX - 15, startY + 10, -0.5); // Gauche
            this.createBullet(startX + 15, startY + 10, 0.5);  // Droite
        }

        this.canShoot = false;
        setTimeout(() => this.canShoot = true, 200);
    },

    createBullet: function(x, y, dx) {
        const laser = document.createElement('div');
        laser.className = this.weaponLevel >= 2 ? 'space-laser triple' : 'space-laser';
        laser.style.left = x + 'px';
        laser.style.top = y + 'px';
        this.container.querySelector('.space-container').appendChild(laser);
        // dx permet de tirer en éventail
        this.bullets.push({ el: laser, x: x, y: y, dx: dx || 0 });
    },

    updateBullets: function() {
        for(let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.y -= 15; // Vitesse balle
            b.x += b.dx * 5; // Déplacement latéral éventuel
            b.el.style.top = b.y + 'px';
            b.el.style.left = b.x + 'px';

            const hitIndex = this.checkBulletCollision(b);
            if(hitIndex !== -1) {
                this.bulletHitObject(hitIndex, b);
                b.el.remove();
                this.bullets.splice(i, 1);
            }
            else if(b.y < -30) {
                b.el.remove();
                this.bullets.splice(i, 1);
            }
        }
    },

    updateObjects: function() {
        const containerHeight = this.container.offsetHeight;
        const shipRect = this.shipEl.getBoundingClientRect();
        const cfg = this.levels[this.currentLevel];

        for(let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];
            obj.y += cfg.speed;
            obj.el.style.top = obj.y + 'px';

            // 1. Collision Vaisseau (Collecte)
            if(!obj.hit && !obj.destroyed) {
                if(this.rectIntersect(shipRect, obj.el.getBoundingClientRect())) {
                    if(obj.type === 'bonus') this.collectBonus(i);
                    else this.shipHitObject(i);
                    
                    obj.hit = true; 
                    obj.el.remove();
                    this.objects.splice(i, 1);
                    continue;
                }
            }

            // 2. Sol
            if(obj.y > containerHeight - 50) {
                if(obj.type === 'asteroid' && !obj.isCorrect) {
                    this.triggerMegaCrash(obj.el);
                    this.loseLife("Impact !");
                }
                obj.el.remove();
                this.objects.splice(i, 1);
            }
        }
    },

    // --- 4. LOGIQUE BONUS & NIVEAUX ---

    spawnObject: function() {
        // Chance d'avoir un bonus (5%)
        if(Math.random() < 0.05) {
            this.spawnBonus();
            return;
        }

        if(!this.currentQuestion) return;
        const isCorrect = Math.random() > 0.6; 
        let val;
        
        if(isCorrect) {
            val = this.currentQuestion.res;
        } else {
            val = this.currentQuestion.res + Math.floor(Math.random() * 10) - 5;
            if(val === this.currentQuestion.res) val++;
        }

        const el = document.createElement('div');
        el.className = 'space-asteroid'; 
        el.innerText = val;
        
        const posXPercent = 10 + Math.random() * 80;
        const containerWidth = this.container.offsetWidth;
        const posXPixels = (posXPercent / 100) * containerWidth;

        el.style.left = posXPercent + '%';
        el.style.top = '-70px';
        this.container.querySelector('.space-container').appendChild(el);

        this.objects.push({ 
            type: 'asteroid', el: el, x: posXPixels, y: -70, 
            val: val, isCorrect: (val === this.currentQuestion.res)
        });
    },

    spawnBonus: function() {
        const type = Math.random() > 0.5 ? 'weapon' : 'shield';
        const icon = type === 'weapon' ? '⚡' : '🛡️';
        
        const el = document.createElement('div');
        el.className = 'space-bonus';
        el.innerText = icon;
        
        const posXPercent = 10 + Math.random() * 80;
        const posXPixels = (posXPercent / 100) * this.container.offsetWidth;

        el.style.left = posXPercent + '%';
        el.style.top = '-70px';
        this.container.querySelector('.space-container').appendChild(el);

        this.objects.push({ type: 'bonus', bonusType: type, el: el, x: posXPixels, y: -70 });
    },

    collectBonus: function(index) {
        const obj = this.objects[index];
        if(window.ParticleSystem) window.ParticleSystem.burst(this.shipEl, 20);
        this.triggerAlert(this.shipX, null, obj.bonusType === 'weapon' ? "TRIPLE TIR !" : "BOUCLIER ACTIF !");
        
        if(obj.bonusType === 'weapon') {
            this.weaponLevel = 2;
            // Retour à la normale après 10s
            clearTimeout(this.bonusTimer);
            this.bonusTimer = setTimeout(() => { 
                this.weaponLevel = 1; 
                this.triggerAlert(this.shipX, null, "Arme épuisée");
            }, 10000);
        } else {
            this.activateShield();
        }
    },

    activateShield: function() {
        if(this.hasShield) return; // Déjà actif
        this.hasShield = true;
        
        // Ajout visuel
        const shield = document.createElement('div');
        shield.className = 'ship-shield';
        shield.id = 'active-shield';
        this.shipEl.appendChild(shield);
    },

    checkLevelProgress: function() {
        const cfg = this.levels[this.currentLevel];
        if(this.score >= cfg.goal && this.currentLevel < 3) {
            this.currentLevel++;
            this.showLevelUp(this.currentLevel);
        }
    },

    showLevelUp: function(lvl) {
        const txt = document.createElement('div');
        txt.className = 'level-up-text';
        txt.innerText = `NIVEAU ${lvl}`;
        this.container.querySelector('.space-container').appendChild(txt);
        setTimeout(() => txt.remove(), 2500);
    },

    // --- 5. COLLISIONS ---

    checkBulletCollision: function(bullet) {
        for(let i=0; i < this.objects.length; i++) {
            const o = this.objects[i];
            const dx = Math.abs(bullet.x - (o.x + 32)); 
            const dy = Math.abs(bullet.y - (o.y + 32));
            if(dx < 32 && dy < 32) return i;
        }
        return -1;
    },

    rectIntersect: function(r1, r2) {
        const padding = 15;
        return !(r2.left + padding > r1.right - padding || 
                 r2.right - padding < r1.left + padding || 
                 r2.top + padding > r1.bottom - padding || 
                 r2.bottom - padding < r1.top + padding);
    },

    bulletHitObject: function(index, bullet) {
        const obj = this.objects[index];
        if(obj.type === 'bonus') return; // On ne détruit pas les bonus au tir

        if(obj.isCorrect) {
            if(window.ParticleSystem) window.ParticleSystem.burst(obj.el, 15);
            this.triggerAlert(obj.x, obj.y, "NE TIRE PAS !");
            this.loseLife("Tir ami !");
        } else {
            if(window.ParticleSystem) window.ParticleSystem.burst(obj.el, 30);
            this.score += 50;
            if(window.GameSystem) window.GameSystem.updateScore(this.score);
        }
        obj.el.remove();
        this.objects.splice(index, 1);
    },

    shipHitObject: function(index) {
        const obj = this.objects[index];

        if(obj.isCorrect) {
            // VICTOIRE COLLECTE
            this.triggerVictoryEffect();
            this.score += 200; 
            if(window.GameSystem) window.GameSystem.updateScore(this.score);
            this.clearObjects();
            this.generateQuestion();
        } else {
            // COLLISION
            if(this.hasShield) {
                // Le bouclier absorbe le coup
                if(window.ParticleSystem) window.ParticleSystem.burst(this.shipEl, 20);
                this.triggerAlert(this.shipX, null, "Bouclier cassé !");
                this.hasShield = false;
                const shieldEl = document.getElementById('active-shield');
                if(shieldEl) shieldEl.remove();
            } else {
                if(window.ParticleSystem) window.ParticleSystem.burst(this.shipEl, 20);
                this.triggerAlert(this.shipX, null, "COLLISION !");
                this.loseLife("Coque percée !");
            }
        }
    },

    generateQuestion: function() {
        const cfg = this.levels[this.currentLevel];
        const tables = cfg.tables;
        const table = tables[Math.floor(Math.random() * tables.length)];
        const b = Math.floor(Math.random() * 9) + 2;
        this.currentQuestion = { txt: `${table} × ${b}`, res: table * b };
        this.hudEl.innerText = `CAPTURE : ${this.currentQuestion.txt}`;
    },
    
    // --- UTILITAIRES FX (Identiques préc.) ---
    triggerVictoryEffect: function() {
        const flash = document.getElementById('space-flash');
        flash.className = 'screen-flash green';
        flash.style.opacity = '1';
        setTimeout(() => flash.style.opacity = '0', 200);

        const ring = document.createElement('div');
        ring.className = 'victory-ring';
        ring.style.left = this.shipX + '%';
        ring.style.top = 'calc(100% - 60px)';
        this.container.querySelector('.space-container').appendChild(ring);
        setTimeout(() => ring.remove(), 600);

        const txt = document.createElement('div');
        txt.className = 'floating-score';
        txt.innerText = "+200";
        txt.style.left = this.shipX + '%';
        txt.style.top = 'calc(100% - 80px)';
        this.container.querySelector('.space-container').appendChild(txt);
        setTimeout(() => txt.remove(), 1200);
    },

    triggerAlert: function(x, y, text) {
        const flash = document.getElementById('space-flash');
        flash.className = 'screen-flash red';
        flash.style.opacity = '1';
        setTimeout(() => flash.style.opacity = '0', 200);
        
        const label = document.createElement('div');
        label.className = 'warning-text';
        label.innerText = text;
        if(y) label.style.top = y + 'px'; else { label.style.top = '50%'; label.style.left = '50%'; }
        if(x && y) label.style.left = x + 'px';
        this.container.querySelector('.space-container').appendChild(label);
        setTimeout(() => label.remove(), 1000);
    },

    triggerMegaCrash: function(el) {
        const flash = document.getElementById('space-flash');
        flash.className = 'screen-flash white';
        flash.style.opacity = '1';
        setTimeout(() => flash.style.opacity = '0', 150);

        const explosion = document.createElement('div');
        explosion.className = 'ground-explosion';
        explosion.style.left = el.style.left;
        this.container.querySelector('.space-container').appendChild(explosion);
        setTimeout(() => explosion.remove(), 600);

        const container = this.container.querySelector('.space-container');
        container.classList.remove('shake');
        void container.offsetWidth; 
        container.classList.add('shake'); 
        setTimeout(() => container.classList.remove('shake'), 500);
    },

    loseLife: function(reason) {
        this.lives--;
        this.updateLivesUI();
        this.shipEl.style.opacity = '0.5';
        setTimeout(() => this.shipEl.style.opacity = '1', 300);
        if(this.lives <= 0) this.gameOver(reason);
    },

    clearObjects: function() {
        this.objects.forEach(o => o.el.remove());
        this.objects = [];
    },

    handleKey: function(e) {
        if(e.key === 'ArrowLeft') { this.shipX -= 4; this.shipTilt = -20; }
        if(e.key === 'ArrowRight') { this.shipX += 4; this.shipTilt = 20; }
        if(e.key === ' ' || e.key === 'ArrowUp') this.shoot();
        this.updateShipPos();
    },

    handleMouseMove: function(e) {
        const rect = this.container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const newX = (x / rect.width) * 100;
        const diff = newX - this.shipX;
        this.shipTilt = Math.max(-25, Math.min(25, diff * 5));
        this.shipX = newX;
        this.updateShipPos();
    },

    gameOver: function(reason) {
        this.isRunning = false;
        if(window.GameSystem) {
             window.GameSystem.showModal({
                 title: "GAME OVER", content: `${reason}<br>Score : ${this.score}`, 
                 actions: [{ label: "Rejouer", onClick: () => this.start(this.container) }, { label: "Quitter", onClick: () => window.GameSystem.stopGame() }]
             });
        }
    }
};

if (window.GameSystem) window.GameSystem.register('space', SpaceGame);