/**
 * games/defense/script.js
 * Math Defense : Tower Defense basé sur la divisibilité
 */

const DefenseGame = {
    config: { startMoney: 150, waveCount: 5, enemySpeed: 1 },
    
    container: null,
    canvas: null,
    ctx: null,
    
    // État du jeu
    money: 0,
    wave: 0,
    lives: 10,
    score: 0,
    
    // Entités
    path: [], // Le chemin des ennemis
    enemies: [],
    towers: [],
    projectiles: [],
    
    // Interface
    selectedTowerType: null,
    frameCount: 0,
    isWaveActive: false,
    waveQueue: [],

    // Types de Tours
    towerTypes: {
        'even': { name: "Pair", cost: 50, color: '#3498db', range: 100, damage: 20, speed: 40, check: (n) => n % 2 === 0 },
        'odd':  { name: "Impair", cost: 50, color: '#e74c3c', range: 100, damage: 20, speed: 40, check: (n) => n % 2 !== 0 },
        'five': { name: "Multi 5", cost: 100, color: '#f1c40f', range: 150, damage: 50, speed: 80, check: (n) => n % 5 === 0 }, // Tire lentement, fait mal
    },

    start: function(container, options = {}) {
        this.container = container;
        this.config = { ...this.config, ...options };
        
        this.money = this.config.startMoney;
        this.lives = 5;
        this.score = 0;
        this.wave = 0;
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        
        this.createWorld();
        this.definePath();
        
        // UI
        this.updateHUD();
        this.startNextWave();

        requestAnimationFrame(() => this.loop());
    },

    stop: function() {
        this.container.innerHTML = '';
        this.enemies = []; // Stop memory leak
    },

    // --- 1. INITIALISATION ---
    createWorld: function() {
        this.container.innerHTML = `
            <div class="defense-wrapper">
                <div class="defense-header">
                    <div class="stat">❤️ <span id="def-lives">${this.lives}</span></div>
                    <div class="stat">💰 <span id="def-money">${this.money}</span></div>
                    <div class="stat">Vague: <span id="def-wave">0</span>/${this.config.waveCount}</div>
                </div>
                <div class="canvas-container" style="position:relative;">
                    <canvas id="def-canvas"></canvas>
                </div>
                <div class="defense-shop" id="def-shop"></div>
                <button id="btn-next-wave" style="display:none; width:100%; padding:10px; margin-top:10px; background:#2ecc71; border:none; color:white; border-radius:5px; cursor:pointer;">Lancer la Vague Suivante</button>
            </div>
        `;

        this.canvas = document.getElementById('def-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Taille fixe interne pour faciliter le pathfinding, affiché en 100% CSS
        this.canvas.width = 600;
        this.canvas.height = 400;

        // Génération du Shop
        const shop = document.getElementById('def-shop');
        for (const [key, type] of Object.entries(this.towerTypes)) {
            const btn = document.createElement('div');
            btn.className = 'shop-item';
            btn.innerHTML = `
                <div class="icon" style="background:${type.color}"></div>
                <div class="info">
                    <strong>${type.name}</strong>
                    <small>${type.cost}💰</small>
                </div>
            `;
            btn.onclick = () => this.selectTower(key, btn);
            shop.appendChild(btn);
        }

        // Clic pour poser tour
        this.canvas.addEventListener('click', (e) => this.placeTower(e));

        document.getElementById('btn-next-wave').onclick = () => this.startNextWave();
        
        this.injectStyles();
    },

    definePath: function() {
        // Un chemin en forme de U simple
        // Départ (0, 50) -> (500, 50) -> (500, 350) -> (100, 350) -> Base
        this.path = [
            {x: 0, y: 80},
            {x: 520, y: 80},
            {x: 520, y: 320},
            {x: 80, y: 320}, // Base
        ];
    },

    // --- 2. GAME LOOP ---
    loop: function() {
        if (!this.ctx) return; // Sécurité stop

        this.frameCount++;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawPath();
        this.spawnEnemies();
        this.updateEnemies();
        this.updateTowers();
        this.updateProjectiles();
        
        // Gestion fin de vague
        if (this.isWaveActive && this.enemies.length === 0 && this.waveQueue.length === 0) {
            this.isWaveActive = false;
            const btn = document.getElementById('btn-next-wave');
            if(this.wave < this.config.waveCount) {
                if(btn) { btn.style.display = 'block'; btn.innerText = "Vague Suivante ▶"; }
            } else {
                this.endGame(true);
            }
        }

        requestAnimationFrame(() => this.loop());
    },

    // --- 3. LOGIQUE DE JEU ---
    
    startNextWave: function() {
        this.wave++;
        document.getElementById('btn-next-wave').style.display = 'none';
        this.updateHUD();
        
        this.waveQueue = [];
        const count = 5 + (this.wave * 2);
        
        // Génération intelligente des nombres selon la vague
        for(let i=0; i<count; i++) {
            let val;
            if (this.wave === 1) val = Math.floor(Math.random() * 10) + 1; // Random
            else if (this.wave === 2) val = (Math.floor(Math.random() * 5) + 1) * 2; // Pairs
            else if (this.wave === 3) val = (Math.floor(Math.random() * 5) * 2) + 1; // Impairs
            else if (this.wave === 4) val = (Math.floor(Math.random() * 4) + 1) * 5; // Multi 5
            else val = Math.floor(Math.random() * 50) + 1; // Mixte dur

            this.waveQueue.push({
                val: val,
                hp: 10 + (this.wave * 5),
                maxHp: 10 + (this.wave * 5),
                speed: (1 + (this.wave * 0.1)) * this.config.enemySpeed
            });
        }
        this.isWaveActive = true;
    },

    spawnEnemies: function() {
        // Apparition toutes les 60 frames (1sec environ)
        if (this.waveQueue.length > 0 && this.frameCount % 60 === 0) {
            const data = this.waveQueue.shift();
            this.enemies.push({
                ...data,
                pathIdx: 0,
                x: this.path[0].x,
                y: this.path[0].y,
                frozen: 0
            });
        }
    },

    updateEnemies: function() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            
            // Mouvement vers le prochain point
            const target = this.path[e.pathIdx + 1];
            if (!target) {
                // Arrivé à la base !
                this.lives--;
                this.enemies.splice(i, 1);
                this.updateHUD();
                if(this.lives <= 0) this.endGame(false);
                continue;
            }

            const dx = target.x - e.x;
            const dy = target.y - e.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < e.speed) {
                e.pathIdx++; // Point atteint
                e.x = target.x; 
                e.y = target.y;
            } else {
                e.x += (dx / dist) * e.speed;
                e.y += (dy / dist) * e.speed;
            }

            // Dessin
            this.drawEnemy(e);
        }
    },

    updateTowers: function() {
        this.towers.forEach(t => {
            // Dessin tour
            this.drawTower(t);
            
            // Tir
            if (t.cooldown > 0) t.cooldown--;
            else {
                // Chercher cible
                const target = this.enemies.find(e => {
                    const dist = Math.sqrt((e.x - t.x)**2 + (e.y - t.y)**2);
                    // LA RÈGLE MATHÉMATIQUE EST ICI : t.typeDef.check(e.val)
                    return dist <= t.range && t.typeDef.check(e.val);
                });

                if (target) {
                    // Tirer
                    this.projectiles.push({
                        x: t.x, y: t.y,
                        target: target,
                        speed: 10,
                        damage: t.typeDef.damage,
                        color: t.typeDef.color
                    });
                    t.cooldown = t.typeDef.speed;
                }
            }
        });
    },

    updateProjectiles: function() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            // Si la cible est morte entre temps
            if (!this.enemies.includes(p.target)) {
                this.projectiles.splice(i, 1);
                continue;
            }

            const dx = p.target.x - p.x;
            const dy = p.target.y - p.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < p.speed) {
                // Touché
                p.target.hp -= p.damage;
                if (p.target.hp <= 0) {
                    const idx = this.enemies.indexOf(p.target);
                    if (idx > -1) {
                        this.enemies.splice(idx, 1);
                        this.money += 15;
                        this.score += 50;
                        this.updateHUD();
                    }
                }
                this.projectiles.splice(i, 1);
            } else {
                p.x += (dx / dist) * p.speed;
                p.y += (dy / dist) * p.speed;
            }
            
            // Dessin projectile
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
            this.ctx.fill();
        }
    },

    // --- 4. INTERACTION ---

    selectTower: function(key, btnElement) {
        // Gestion visuelle sélection
        document.querySelectorAll('.shop-item').forEach(el => el.classList.remove('selected'));
        
        if (this.selectedTowerType === key) {
            this.selectedTowerType = null; // Désélection
        } else {
            this.selectedTowerType = key;
            btnElement.classList.add('selected');
        }
    },

    placeTower: function(e) {
        if (!this.selectedTowerType) return;

        const rect = this.canvas.getBoundingClientRect();
        // Correction d'échelle (car canvas affiché en CSS % vs taille réelle)
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const typeDef = this.towerTypes[this.selectedTowerType];

        if (this.money >= typeDef.cost) {
            // Vérifier collision (pas sur le chemin, pas sur une autre tour)
            // Pour simplifier ici : on autorise partout sauf trop près du chemin
            let onPath = false;
            // Algo très simple : vérifier distance avec chaque point du chemin
            // (Pour une version pro, faudrait vérifier les segments)
            // Ici on simplifie : on pose.
            
            this.towers.push({
                x: x, y: y,
                type: this.selectedTowerType,
                typeDef: typeDef,
                range: typeDef.range,
                cooldown: 0
            });
            this.money -= typeDef.cost;
            this.updateHUD();
            this.selectedTowerType = null;
            document.querySelectorAll('.shop-item').forEach(el => el.classList.remove('selected'));
        } else {
            alert("Pas assez d'argent !");
        }
    },

    // --- 5. DESSIN ---
    
    drawPath: function() {
        this.ctx.strokeStyle = "#ecf0f1";
        this.ctx.lineWidth = 40;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";
        this.ctx.beginPath();
        this.ctx.moveTo(this.path[0].x, this.path[0].y);
        for(let i=1; i<this.path.length; i++) this.ctx.lineTo(this.path[i].x, this.path[i].y);
        this.ctx.stroke();
        
        // Base
        const end = this.path[this.path.length-1];
        this.ctx.fillStyle = "#e74c3c";
        this.ctx.beginPath();
        this.ctx.arc(end.x, end.y, 20, 0, Math.PI*2);
        this.ctx.fill();
        this.ctx.fillStyle = "white";
        this.ctx.font = "20px Arial";
        this.ctx.fillText("🏠", end.x-10, end.y+7);
    },

    drawEnemy: function(e) {
        this.ctx.fillStyle = "#2c3e50";
        this.ctx.beginPath();
        this.ctx.arc(e.x, e.y, 15, 0, Math.PI*2);
        this.ctx.fill();
        
        // Le Nombre
        this.ctx.fillStyle = "white";
        this.ctx.font = "bold 14px Arial";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(e.val, e.x, e.y);
        
        // Barre de vie
        const hpPct = e.hp / e.maxHp;
        this.ctx.fillStyle = "red";
        this.ctx.fillRect(e.x - 10, e.y - 22, 20, 4);
        this.ctx.fillStyle = "#2ecc71";
        this.ctx.fillRect(e.x - 10, e.y - 22, 20 * hpPct, 4);
    },

    drawTower: function(t) {
        // Portée (au survol ou pose - ici tout le temps pour debug/visuel)
        // this.ctx.strokeStyle = "rgba(0,0,0,0.05)";
        // this.ctx.beginPath(); this.ctx.arc(t.x, t.y, t.range, 0, Math.PI*2); this.ctx.stroke();

        // Socle
        this.ctx.fillStyle = "#95a5a6";
        this.ctx.fillRect(t.x - 15, t.y - 15, 30, 30);
        
        // Tourelle
        this.ctx.fillStyle = t.typeDef.color;
        this.ctx.beginPath();
        this.ctx.arc(t.x, t.y, 12, 0, Math.PI*2);
        this.ctx.fill();
    },

    updateHUD: function() {
        document.getElementById('def-money').innerText = this.money;
        document.getElementById('def-lives').innerText = this.lives;
        document.getElementById('def-wave').innerText = this.wave;
        if(window.GameSystem) window.GameSystem.updateScore(this.score);
    },

    endGame: function(win) {
        if(window.GameSystem) {
             window.GameSystem.showModal({
                 title: win ? "VICTOIRE !" : "DÉFAITE", 
                 content: `Score Final : ${this.score}`, 
                 actions: [
                    { label: "Rejouer", onClick: () => this.start(this.container, this.config) },
                    { label: "Quitter", onClick: () => window.GameSystem.stopGame() }
                 ]
             });
        }
    },

    injectStyles: function() {
        if (document.getElementById('def-style')) return;
        const css = `
            .defense-wrapper { max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', sans-serif; }
            .defense-header { display: flex; justify-content: space-between; margin-bottom: 10px; background: #fff; padding: 10px; border-radius: 8px; font-weight: bold; }
            .canvas-container { background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
            #def-canvas { width: 100%; height: auto; display: block; background: #ecf0f1; cursor: crosshair; }
            
            .defense-shop { display: flex; gap: 10px; margin-top: 10px; overflow-x: auto; padding-bottom: 5px; }
            .shop-item { 
                flex: 1; background: #fff; border: 2px solid #bdc3c7; border-radius: 8px; 
                padding: 10px; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.2s;
            }
            .shop-item:hover { transform: translateY(-2px); }
            .shop-item.selected { border-color: #3498db; background: #ebf5fb; }
            .shop-item .icon { width: 30px; height: 30px; border-radius: 50%; }
            .shop-item .info { display: flex; flex-direction: column; font-size: 0.9rem; }
        `;
        const style = document.createElement('style');
        style.id = 'def-style';
        style.innerHTML = css;
        document.head.appendChild(style);
    }
};

if (window.GameSystem) window.GameSystem.register('defense', DefenseGame);