/**
 * games/mole/script.js
 * Math Mole : Tape-Taupe Mathématique
 */

const MoleGame = {
    // Config
    config: {
        mode: 'multiples', // 'multiples' ou 'operations'
        target: 2,         // Table de 2 par défaut
        speed: 1000,       // Temps d'apparition (ms)
        duration: 30       // Durée partie (s)
    },

    container: null,
    holes: [],
    moles: [],
    
    score: 0,
    isPlaying: false,
    gameTimer: null,
    spawnTimer: null,
    timeLeft: 30,
    
    currentRule: "", // Texte affiché (ex: "Multiples de 5")

    // --- 1. DÉMARRAGE ---
    start: function(container, options = {}) {
        this.stop();
        this.container = container;
        
        // Options
        this.config.mode = options.mode || 'multiples';
        this.config.target = options.target || 2;
        this.config.speed = options.speed || 1000;
        this.config.duration = options.duration || 30;
        
        this.score = 0;
        this.timeLeft = this.config.duration;
        this.isPlaying = true;

        if(window.GameSystem) {
            window.GameSystem.toggleLives(false);
            window.GameSystem.updateScore(0);
            window.GameSystem.toggleTimer(true);
            window.GameSystem.updateTimer(this.timeLeft);
        }

        this.setupRule();
        this.createWorld();
        
        // Boucle de jeu
        this.spawnTimer = setInterval(() => this.peep(), this.config.speed);
        this.gameTimer = setInterval(() => this.tick(), 1000);
    },

    stop: function() {
        this.isPlaying = false;
        clearInterval(this.spawnTimer);
        clearInterval(this.gameTimer);
        if(this.container) this.container.innerHTML = '';
    },

    setupRule: function() {
        if(this.config.mode === 'multiples') {
            this.currentRule = `Tape les multiples de ${this.config.target} !`;
        } else {
            this.currentRule = "Tape les nombres PAIRS !";
        }
    },

    // --- 2. MONDE ---
    createWorld: function() {
        this.container.innerHTML = `
            <div class="mole-container">
                <div class="mole-hud">${this.currentRule}</div>
                <div class="mole-grid" id="mole-grid"></div>
            </div>
        `;
        
        const grid = document.getElementById('mole-grid');
        this.holes = [];
        this.moles = [];

        // Création des 9 trous
        for(let i=0; i<9; i++) {
            const hole = document.createElement('div');
            hole.className = 'mole-hole';
            
            const mole = document.createElement('div');
            mole.className = 'mole-character';
            mole.innerHTML = `<div class="mole-face">🐹</div><div class="mole-sign">?</div>`;
            
            // Clic sur la taupe
            mole.onmousedown = (e) => this.bonk(e, i); // Utilise mousedown pour réactivité max
            
            hole.appendChild(mole);
            grid.appendChild(hole);
            
            this.holes.push(hole);
            this.moles.push({ el: mole, value: 0, active: false });
        }
    },

    // --- 3. LOGIQUE TAUPE ---
    peep: function() {
        if(!this.isPlaying) return;

        // Choisir un trou au hasard qui n'est pas déjà actif
        const availableMoles = this.moles.filter(m => !m.active);
        if(availableMoles.length === 0) return;

        const moleObj = availableMoles[Math.floor(Math.random() * availableMoles.length)];
        
        // Déterminer la valeur (Bonne ou Mauvaise réponse ?)
        // 40% de chance d'avoir une bonne réponse pour ne pas spammer
        const isCorrect = Math.random() < 0.4;
        let val;

        if(this.config.mode === 'multiples') {
            const t = this.config.target;
            if(isCorrect) {
                val = t * (Math.floor(Math.random() * 10) + 1); // Ex: 5 * 3 = 15
            } else {
                val = (t * (Math.floor(Math.random() * 10) + 1)) + (Math.random() > 0.5 ? 1 : -1); // Ex: 16
            }
        } else {
            // Mode Pair/Impair (exemple simple)
            val = Math.floor(Math.random() * 50);
            const isEven = val % 2 === 0;
            // Si on veut taper les pairs : isCorrect doit être égal à isEven
            if(isCorrect && !isEven) val++; // Rend pair
            if(!isCorrect && isEven) val++; // Rend impair
        }

        // Affichage
        moleObj.value = val;
        moleObj.active = true;
        moleObj.el.querySelector('.mole-sign').innerText = val;
        moleObj.el.classList.remove('hit', 'good');
        moleObj.el.classList.add('up');

        // La taupe redescend après un délai variable
        const time = Math.random() * 800 + 500; // Entre 0.5 et 1.3s
        setTimeout(() => {
            if(moleObj.active && !moleObj.el.classList.contains('hit')) {
                moleObj.el.classList.remove('up');
                moleObj.active = false;
                
                // Optionnel: Pénalité si on rate une bonne taupe ?
                // Pour l'instant non, pour garder le fun sans frustration
            }
        }, time);
    },

    bonk: function(e, index) {
        if(!e.isTrusted) return; // Anti-cheat basique
        const moleObj = this.moles[index];
        
        if(!moleObj.active) return; // Déjà rentrée
        if(moleObj.el.classList.contains('hit')) return; // Déjà tapée

        // Vérification Mathématique
        let isCorrect = false;
        if(this.config.mode === 'multiples') {
            isCorrect = (moleObj.value % this.config.target === 0);
        } else {
            isCorrect = (moleObj.value % 2 === 0);
        }

        if(isCorrect) {
            // BRAVO
            this.score += 100;
            moleObj.el.classList.add('hit', 'good');
            moleObj.el.querySelector('.mole-face').innerText = "😵";
            if(window.ParticleSystem) window.ParticleSystem.burst(moleObj.el, 10);
        } else {
            // AÏE
            this.score -= 50;
            moleObj.el.classList.add('hit'); // Rouge par défaut
            moleObj.el.querySelector('.mole-face').innerText = "👿";
            // Petit effet shake sur l'écran
            this.container.classList.add('shake');
            setTimeout(() => this.container.classList.remove('shake'), 200);
        }

        if(window.GameSystem) window.GameSystem.updateScore(this.score);

        // La taupe rentre vite après le coup
        setTimeout(() => {
            moleObj.el.classList.remove('up');
            moleObj.active = false;
            // Reset visage
            setTimeout(() => moleObj.el.querySelector('.mole-face').innerText = "🐹", 200);
        }, 300);
    },

    tick: function() {
        this.timeLeft--;
        if(window.GameSystem) window.GameSystem.updateTimer(this.timeLeft, this.timeLeft <= 5);

        if(this.timeLeft <= 0) {
            this.stop();
            window.GameSystem.showModal({
                title: "TEMPS ÉCOULÉ !",
                content: `Score final : <strong>${this.score}</strong>`,
                actions: [
                    { label: "Rejouer", onClick: () => this.start(this.container, this.config) },
                    { label: "Quitter", onClick: () => window.GameSystem.stopGame() }
                ]
            });
        }
    }
};

if (window.GameSystem) window.GameSystem.register('mole', MoleGame);