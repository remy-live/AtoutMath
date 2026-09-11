/**
 * games/race/script.js
 * Math Racer Deluxe : Voies dynamiques + Bonus + Combos
 */

const RaceGame = {
    // Configuration avancée
    levels: {
        // lanes: Nombre de couloirs (2, 3, 4...)
        // items: Probabilité d'apparition d'un bonus (0 à 1)
        1: { speed: 3.0, lanes: 2, spawnDelay: 1500, items: 0.3, tables: [2,3,4,5,10], goal: 10 },
        2: { speed: 4.5, lanes: 3, spawnDelay: 1200, items: 0.4, tables: [3,4,5,6,7,8], goal: 20 },
        3: { speed: 6.0, lanes: 4, spawnDelay: 1000, items: 0.5, tables: [6,7,8,9,12], goal: 30 }
    },

    // État
    container: null,
    currentLevel: 1,
    laneCount: 3, // Défaut
    
    // Physique
    roadWidth: 300, 
    currentX: 50, 
    targetX: 50,  
    laneIndex: 1,

    speed: 0,
    baseSpeed: 0, // Vitesse de référence du niveau
    gatesPassed: 0,
    combo: 0, // Compteur de bonnes réponses d'affilée

    objects: [], // Portes ET Items mélangés
    roadLines: [],
    
    currentQuestion: null,
    isRunning: false,
    waitingForWave: false,
    
    // Listeners
    boundHandleKey: null, 
    boundHandleMouse: null,

    // --- 1. DÉMARRAGE ---
    start: function(container, options = {}) {
        this.stop();
        this.container = container;
        this.currentLevel = options.startLevel || 1;
        
        // Chargement config niveau
        const cfg = this.levels[this.currentLevel];
        this.laneCount = cfg.lanes || 3;
        this.baseSpeed = cfg.speed;
        this.speed = this.baseSpeed;

        // Reset
        this.currentX = 50;
        this.targetX = 50;
        this.laneIndex = Math.floor(this.laneCount / 2); // Départ au milieu
        this.objects = [];
        this.roadLines = [];
        this.gatesPassed = 0;
        this.combo = 0;
        this.waitingForWave = false;
        this.isRunning = true;

        if(window.GameSystem) {
            window.GameSystem.toggleLives(true);
            window.GameSystem.updateScore(0);
            window.GameSystem.toggleTimer(false);
        }

        this.createWorld();
        
        // Démarrage immédiat
        this.generateQuestion();
        this.spawnWave();
        
        // Contrôles
        this.boundHandleKey = this.handleKey.bind(this);
        document.addEventListener('keydown', this.boundHandleKey);

        this.boundHandleMouse = this.handleMouseMove.bind(this);
        this.container.addEventListener('pointermove', this.boundHandleMouse);

        requestAnimationFrame(() => this.gameLoop());
    },

    stop: function() {
        this.isRunning = false;
        if (this.boundHandleKey) document.removeEventListener('keydown', this.boundHandleKey);
        if (this.container) this.container.innerHTML = '';
    },

    // --- 2. MONDE DYNAMIQUE ---
    createWorld: function() {
        // Calcul de la largeur de la route selon le nombre de voies (100px par voie)
        this.roadWidth = this.laneCount * 100;

        this.container.innerHTML = `
            <div class="race-container">
                <div class="race-hud">
                    <div class="race-question" id="race-q">PRÊT ?</div>
                    <div id="race-info">Niv ${this.currentLevel}</div>
                </div>
                <div class="race-road" id="race-road" style="width: ${this.roadWidth}px">
                    <div class="race-player" id="race-player">
                        <div class="car-body"><div class="car-cabin"></div></div>
                    </div>
                </div>
            </div>
        `;
        this.roadEl = document.getElementById('race-road');
        this.playerEl = document.getElementById('race-player');
        this.hudQuestion = document.getElementById('race-q');
        this.hudInfo = document.getElementById('race-info');

        // Création des lignes de séparation (Il y en a nbVoies - 1)
        for(let i=1; i < this.laneCount; i++) {
            const pct = (i / this.laneCount) * 100;
            this.createRoadLine(pct);
        }
        
        this.playerEl.style.left = this.currentX + '%';
    },

    createRoadLine: function(leftPercent) {
        // On crée plusieurs segments pour l'effet de défilement
        for(let j=0; j<6; j++) {
            const line = document.createElement('div');
            line.className = 'road-line';
            line.style.left = leftPercent + '%';
            line.style.top = (j * 100) + 'px';
            this.roadEl.appendChild(line);
            this.roadLines.push({ el: line, y: j * 100 });
        }
    },

    // --- 3. MOTEUR ---
    gameLoop: function() {
        if(!this.isRunning) return;

        // Mouvement fluide
        const smoothness = 0.15;
        this.currentX += (this.targetX - this.currentX) * smoothness;
        this.playerEl.style.left = this.currentX + '%';

        // Retour à la vitesse normale progressivement (si bonus/malus)
        if(this.speed > this.baseSpeed) this.speed -= 0.01;
        if(this.speed < this.baseSpeed) this.speed += 0.005;

        this.updateRoad();
        this.updateObjects();
        
        requestAnimationFrame(() => this.gameLoop());
    },

    updateRoad: function() {
        this.roadLines.forEach(line => {
            line.y += this.speed * 1.5;
            if(line.y > this.roadEl.offsetHeight) line.y = -60;
            line.el.style.top = line.y + 'px';
        });
    },

    updateObjects: function() {
        const playerRect = this.playerEl.getBoundingClientRect();
        // Point de collision au centre de la voiture
        const cx = playerRect.left + playerRect.width / 2;
        const cy = playerRect.top + playerRect.height / 2;
        
        for(let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];
            obj.y += this.speed;
            obj.el.style.top = obj.y + 'px';

            if(!obj.hit) {
                const rect = obj.el.getBoundingClientRect();
                // Collision simple
                if(cy > rect.top && cy < rect.bottom && cx > rect.left && cx < rect.right) {
                   obj.hit = true;
                   if(obj.type === 'gate') this.checkAnswer(obj);
                   else this.checkBonus(obj);
                }
            }

            // Nettoyage hors écran
            if(obj.y > this.roadEl.offsetHeight + 100) {
                obj.el.remove();
                this.objects.splice(i, 1);
            }
        }
    },

    // --- 4. INPUTS ADAPTATIFS ---
    handleKey: function(e) {
        if(e.key === 'ArrowLeft' && this.laneIndex > 0) this.laneIndex--;
        else if(e.key === 'ArrowRight' && this.laneIndex < this.laneCount - 1) this.laneIndex++;
        
        // Calcul du % centre de la voie : (index + 0.5) / nbVoies
        const pct = ((this.laneIndex + 0.5) / this.laneCount) * 100;
        this.targetX = pct;
    },

    handleMouseMove: function(e) {
        const roadRect = this.roadEl.getBoundingClientRect();
        let relativeX = e.clientX - roadRect.left;
        const padding = 20;
        relativeX = Math.max(padding, Math.min(this.roadWidth - padding, relativeX));
        this.targetX = (relativeX / this.roadWidth) * 100;
    },

    // --- 5. LOGIQUE DE JEU ---
    
    spawnWave: function() {
        this.waitingForWave = false;
        
        // Chance de faire apparaître un BONUS au lieu d'une question
        const cfg = this.levels[this.currentLevel];
        if(Math.random() < cfg.items) {
            this.spawnBonus();
            // Si c'est un bonus, on relance une vague rapidement après
            setTimeout(() => { if(this.isRunning) this.spawnWave(); }, 1500);
            return;
        }

        // Sinon, c'est une QUESTION
        this.generateQuestion();
        let answers = [this.currentQuestion.res];
        
        // On génère assez de fausses réponses pour remplir les autres voies
        while(answers.length < this.laneCount) {
            let fake = this.currentQuestion.res + Math.floor(Math.random() * 12) - 6;
            if(fake > 0 && !answers.includes(fake)) answers.push(fake);
        }
        answers.sort(() => Math.random() - 0.5);

        for(let i=0; i < this.laneCount; i++) {
            const gateEl = document.createElement('div');
            gateEl.className = 'race-gate';
            const pct = ((i + 0.5) / this.laneCount) * 100;
            gateEl.style.left = `calc(${pct}% - 45px)`; // -45px = moitié largeur porte
            gateEl.innerText = answers[i];
            this.roadEl.appendChild(gateEl);
            
            this.objects.push({ 
                type: 'gate', el: gateEl, y: -150, 
                val: answers[i], hit: false 
            });
        }
    },

    spawnBonus: function() {
        // Types de bonus
        const types = [
            { icon: '🐌', effect: 'slow', color: '#2ecc71' },
            { icon: '🪙', effect: 'points', color: '#f1c40f' },
            { icon: '⚡', effect: 'boost', color: '#e74c3c' }
        ];
        const bonus = types[Math.floor(Math.random() * types.length)];
        
        // Choix d'une voie au hasard
        const lane = Math.floor(Math.random() * this.laneCount);
        const itemEl = document.createElement('div');
        itemEl.className = 'race-item';
        itemEl.innerText = bonus.icon;
        itemEl.style.color = bonus.color;
        
        const pct = ((lane + 0.5) / this.laneCount) * 100;
        itemEl.style.left = `calc(${pct}% - 25px)`;
        this.roadEl.appendChild(itemEl);

        this.objects.push({
            type: 'bonus', el: itemEl, y: -150,
            effect: bonus.effect, hit: false
        });
    },

    checkBonus: function(item) {
        if(window.ParticleSystem) window.ParticleSystem.burst(item.el, 15);
        item.el.style.transform = "scale(0)"; // Disparition
        
        if(item.effect === 'slow') {
            this.speed = this.speed * 0.5; // Ralenti de 50%
            this.hudQuestion.innerText = "RALENTI !";
        } 
        else if(item.effect === 'points') {
            if(window.GameSystem) window.GameSystem.updateScore(this.gatesPassed * 100 + 500);
            this.hudQuestion.innerText = "+500 PTS !";
        }
        else if(item.effect === 'boost') {
            this.speed = this.speed * 2.0; // Accélère fort ! (Malus ?)
            this.hudQuestion.innerText = "TURBO !!!";
        }
    },

    checkAnswer: function(gate) {
        if(gate.val === this.currentQuestion.res) {
            // BRAVO
            this.gatesPassed++;
            this.combo++;
            this.hudInfo.innerText = `Portes : ${this.gatesPassed}`;
            
            // Gestion Combo
            if(this.combo >= 3) this.playerEl.classList.add('combo');
            
            if(window.ParticleSystem) window.ParticleSystem.burst(gate.el, 30);
            // Score augmente avec le combo
            const pts = 100 * (1 + (this.combo * 0.5));
            if(window.GameSystem) window.GameSystem.updateScore(pts);
            
            this.checkLevelUp();

            // Next Wave
            if(!this.waitingForWave) {
                this.waitingForWave = true;
                const cfg = this.levels[this.currentLevel];
                setTimeout(() => { if(this.isRunning) this.spawnWave(); }, cfg.spawnDelay);
            }
        } else {
            // ERREUR
            gate.el.style.backgroundColor = '#e74c3c';
            this.container.classList.add('shake');
            setTimeout(() => this.container.classList.remove('shake'), 400);
            
            // Perte de combo
            this.combo = 0;
            this.playerEl.classList.remove('combo');
            this.speed = Math.max(1, this.speed - 3); // Gros freinage

            if(window.GameSystem) {
                 this.stop();
                 window.GameSystem.showModal({
                     title: "CRASH !", 
                     content: `La réponse était ${this.currentQuestion.res}`, 
                     actions: [
                        { label: "Réessayer", onClick: () => this.start(this.container, {startLevel: this.currentLevel}) },
                        { label: "Quitter", onClick: () => window.GameSystem.stopGame() }
                     ]
                 });
            }
        }
    },

    generateQuestion: function() {
        const cfg = this.levels[this.currentLevel];
        const tables = cfg.tables;
        const table = tables[Math.floor(Math.random() * tables.length)];
        const b = Math.floor(Math.random() * 9) + 2;
        this.currentQuestion = { txt: `${table} × ${b}`, res: table * b };
        this.hudQuestion.innerText = this.currentQuestion.txt;
    },

    checkLevelUp: function() {
        const cfg = this.levels[this.currentLevel];
        if(this.gatesPassed >= cfg.goal) {
            if(this.currentLevel < 3) {
                this.currentLevel++;
                
                // Transition visuelle
                this.hudQuestion.innerText = "NIVEAU SUIVANT !";
                this.speed = 8; // Boost de transition
                
                // Mise à jour config
                const newCfg = this.levels[this.currentLevel];
                this.laneCount = newCfg.lanes;
                this.baseSpeed = newCfg.speed;
                
                // Recréation du monde (pour changer la largeur de route)
                // Petit délai pour laisser passer l'animation
                setTimeout(() => {
                    if(this.isRunning) this.createWorld();
                }, 500);
                
            } else {
                this.stop();
                window.GameSystem.showModal({ title: "LÉGENDE !", content: "Tu es le roi de la piste !", actions: [{ label: "Menu", onClick: () => window.GameSystem.stopGame() }] });
            }
        }
    }
};

if (window.GameSystem) window.GameSystem.register('race', RaceGame);