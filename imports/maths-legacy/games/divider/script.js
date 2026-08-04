/**
 * games/divider/script.js
 * The Divider : L'usine à diviseurs
 */

const DividerGame = {
    config: {
        speed: 2,       // Vitesse des robots
        spawnRate: 150, // Distance entre robots
        options: [2, 3, 5, 10] // Les filtres disponibles
    },

    container: null,
    gateEl: null,
    gateValEl: null,
    
    // État
    walkers: [],
    gateIndex: 0, // Quel filtre est actif (0 = 2, 1 = 3...)
    currentGateVal: 2,
    score: 0,
    lives: 3,
    isRunning: false,
    frameCount: 0,

    // --- 1. DÉMARRAGE ---
    start: function(container, options = {}) {
        this.stop();
        this.container = container;
        
        this.walkers = [];
        this.score = 0;
        this.lives = 3;
        this.gateIndex = 0;
        this.currentGateVal = this.config.options[0];
        this.isRunning = true;

        if(window.GameSystem) {
            window.GameSystem.toggleLives(true);
            window.GameSystem.updateScore(0);
            window.GameSystem.toggleTimer(false);
            this.updateLivesUI();
        }

        this.createWorld();

        // Clic sur la porte
        this.boundClick = this.toggleGate.bind(this);
        this.container.addEventListener('pointerdown', this.boundClick);

        requestAnimationFrame(() => this.gameLoop());
    },

    stop: function() {
        this.isRunning = false;
        if(this.container) {
            this.container.removeEventListener('pointerdown', this.boundClick);
            this.container.innerHTML = '';
        }
    },

    updateLivesUI: function() {
        const div = document.getElementById('module-lives');
        if(div) {
            div.innerHTML = '';
            for(let i=0; i<3; i++) {
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
            <div class="div-container">
                <div class="div-bg"></div>
                <div class="div-hud">Score: <span id="div-score">0</span></div>
                
                <div class="div-lane"></div>
                
                <div class="div-gate" id="div-gate">
                    <div class="div-gate-val" id="gate-val">2</div>
                    <div class="div-gate-hint">Clic pour changer</div>
                </div>
            </div>
        `;
        this.gateEl = document.getElementById('div-gate');
        this.gateValEl = document.getElementById('gate-val');
        this.scoreEl = document.getElementById('div-score');
    },

    // --- 3. MOTEUR ---
    gameLoop: function() {
        if(!this.isRunning) return;
        this.frameCount++;

        // Spawn
        if(this.frameCount % this.config.spawnRate === 0) {
            this.spawnWalker();
        }

        this.updateWalkers();
        requestAnimationFrame(() => this.gameLoop());
    },

    toggleGate: function(e) {
        // On ne change que si on clique sur la moitié droite de l'écran ou la porte
        // (Pour l'accessibilité mobile, on peut dire "n'importe où")
        
        this.gateIndex = (this.gateIndex + 1) % this.config.options.length;
        this.currentGateVal = this.config.options[this.gateIndex];
        
        // Mise à jour visuelle
        this.gateValEl.innerText = this.currentGateVal;
        
        // Petit effet de couleur pour montrer le changement
        this.gateValEl.style.transform = "translateX(-50%) scale(1.2)";
        this.gateValEl.style.color = "#4ecca3";
        setTimeout(() => {
            this.gateValEl.style.transform = "translateX(-50%) scale(1)";
            this.gateValEl.style.color = "white";
        }, 100);
    },

    spawnWalker: function() {
        // On génère un nombre qui est divisible par au moins UN des filtres
        // Sinon c'est impossible pour le joueur
        const options = this.config.options;
        const targetDivisor = options[Math.floor(Math.random() * options.length)];
        
        // Exemple : si target est 5, on génère 5, 10, 15, 25...
        const factor = Math.floor(Math.random() * 10) + 1; // 1 à 10
        let val = targetDivisor * factor;

        // On évite les nombres trop gros pour la lecture rapide
        if(val > 50) val = targetDivisor * (Math.floor(Math.random() * 5) + 1);

        const el = document.createElement('div');
        el.className = 'div-walker';
        el.innerText = val;
        
        // Position départ (hors écran gauche)
        el.style.left = '-50px';
        
        this.container.querySelector('.div-container').appendChild(el);

        this.walkers.push({
            el: el,
            val: val,
            x: -50,
            checked: false, // Pour ne vérifier qu'une fois
            dead: false
        });
    },

    updateWalkers: function() {
        // Position X de la porte (fixe, mais relative à la largeur)
        // Dans le CSS : right 100px.
        const containerW = this.container.offsetWidth;
        const gateX = containerW - 100;

        for(let i = this.walkers.length - 1; i >= 0; i--) {
            const w = this.walkers[i];
            if(w.dead) continue; // En train de mourir

            w.x += this.config.speed;
            w.el.style.left = w.x + 'px';

            // --- COLLISION PORTE ---
            // On vérifie quand le robot passe la ligne de la porte
            if(!w.checked && w.x > gateX - 25) { // 25 = demi-largeur
                w.checked = true;
                
                // VERIFICATION MATHÉMATIQUE
                if(w.val % this.currentGateVal === 0) {
                    // SUCCÈS : Divisible !
                    this.score += 10;
                    this.scoreEl.innerText = this.score;
                    if(window.GameSystem) window.GameSystem.updateScore(this.score);
                    
                    w.el.classList.add('pass');
                    // Il continue sa route en disparaissant
                } else {
                    // ÉCHEC : Pas divisible -> ZAP
                    w.dead = true;
                    w.el.classList.add('zap');
                    this.loseLife();
                    
                    // On supprime l'élément après l'anim
                    setTimeout(() => {
                        if(w.el && w.el.parentNode) w.el.remove();
                    }, 400);
                }
            }

            // Nettoyage fin d'écran
            if(w.x > containerW + 50) {
                w.el.remove();
                this.walkers.splice(i, 1);
            }
        }
        
        // Nettoyage tableau des morts
        this.walkers = this.walkers.filter(w => !w.dead || (w.dead && w.el.parentNode)); 
    },

    loseLife: function() {
        this.lives--;
        this.updateLivesUI();
        
        // Flash rouge de l'écran
        const bg = this.container.querySelector('.div-bg');
        bg.style.backgroundColor = 'rgba(255,0,0,0.2)';
        setTimeout(() => bg.style.backgroundColor = 'transparent', 200);

        if(this.lives <= 0) {
            this.gameOver();
        }
    },

    gameOver: function() {
        this.isRunning = false;
        if(window.GameSystem) {
             window.GameSystem.showModal({
                 title: "COURT-CIRCUIT !", 
                 content: `Score Final : ${this.score}`, 
                 actions: [
                    { label: "Réparer", onClick: () => this.start(this.container) },
                    { label: "Quitter", onClick: () => window.GameSystem.stopGame() }
                 ]
             });
        }
    }
};

if (window.GameSystem) window.GameSystem.register('divider', DividerGame);