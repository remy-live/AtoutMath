/**
 * games/vault/script.js
 * Le Coffre-Fort : Jeu de logique et d'estimation (Plus/Moins)
 */

const VaultGame = {
    config: {
        maxNumber: 100,
        attempts: 10
    },

    container: null,
    
    // État du jeu
    secretCode: 0,
    currentInput: "",
    history: [],
    attemptsLeft: 0,
    isGameOver: false,
    score: 0,

    start: function(container, options = {}) {
        this.container = container;
        if(options.maxNumber) this.config.maxNumber = parseInt(options.maxNumber);
        if(options.attempts) this.config.attempts = parseInt(options.attempts);

        this.resetGame();
        this.createWorld();
        this.updateScreen("ENTRER CODE");
    },

    resetGame: function() {
        this.secretCode = Math.floor(Math.random() * this.config.maxNumber) + 1;
        console.log("Secret (Chut!) : " + this.secretCode); // Pour tester
        this.currentInput = "";
        this.history = [];
        this.attemptsLeft = this.config.attempts;
        this.isGameOver = false;
        this.score = 0;
    },

    createWorld: function() {
        this.injectStyles();
        this.container.innerHTML = `
            <div class="vault-wrapper">
                <div class="vault-header">
                    <div class="led-attempts">Essais: <span id="vault-lives">${this.attemptsLeft}</span></div>
                    <div class="led-range">1 - ${this.config.maxNumber}</div>
                </div>

                <div class="vault-screen" id="vault-screen">
                    <div class="main-display" id="display-val">_</div>
                    <div class="sub-display" id="display-msg">PRÊT</div>
                </div>

                <div class="history-log" id="history-log">
                    </div>

                <div class="vault-pad">
                    ${[1,2,3,4,5,6,7,8,9].map(n => `<button onclick="VaultGame.type('${n}')">${n}</button>`).join('')}
                    <button class="yellow" onclick="VaultGame.backspace()">⌫</button>
                    <button onclick="VaultGame.type('0')">0</button>
                    <button class="green" onclick="VaultGame.validate()">OK</button>
                </div>
            </div>
        `;
    },

    // --- LOGIQUE ---

    type: function(char) {
        if(this.isGameOver) return;
        if(this.currentInput.length < 4) {
            this.currentInput += char;
            this.updateScreen(this.currentInput);
        }
    },

    backspace: function() {
        if(this.isGameOver) return;
        this.currentInput = this.currentInput.slice(0, -1);
        this.updateScreen(this.currentInput || "_");
    },

    validate: function() {
        if(this.isGameOver || this.currentInput === "") return;

        const guess = parseInt(this.currentInput);
        this.processGuess(guess);
        this.currentInput = "";
    },

    processGuess: function(guess) {
        this.attemptsLeft--;
        document.getElementById('vault-lives').innerText = this.attemptsLeft;

        let msg = "";
        let type = "neutral"; // neutral, higher, lower, win

        if (guess === this.secretCode) {
            // VICTOIRE
            this.gameWin();
            return;
        } 
        else if (guess < this.secretCode) {
            msg = "C'EST PLUS (+)";
            type = "higher";
        } 
        else {
            msg = "C'EST MOINS (-)";
            type = "lower";
        }

        // Feedback
        this.updateScreen("_", msg);
        this.addToHistory(guess, type);

        // Game Over ?
        if (this.attemptsLeft <= 0) {
            this.gameLose();
        } else {
            // Indice mathématique si on galère (tous les 3 essais ratés)
            const triesDone = this.config.attempts - this.attemptsLeft;
            if (triesDone % 3 === 0) {
                this.giveMathHint();
            }
        }
    },

    giveMathHint: function() {
        let hint = "";
        // Indice 1 : Parité
        if (this.secretCode % 2 === 0) hint = "Indice : C'est un nombre PAIR";
        else hint = "Indice : C'est un nombre IMPAIR";
        
        // Indice 2 (si on est loin) : Multiple
        if (this.config.maxNumber > 50 && Math.random() > 0.5) {
            if (this.secretCode % 5 === 0) hint = "Indice : Multiple de 5";
            else if (this.secretCode % 3 === 0) hint = "Indice : Multiple de 3";
        }

        setTimeout(() => {
            this.updateScreen("_", hint);
        }, 1500);
    },

    // --- UI ---

    updateScreen: function(main, sub = "") {
        document.getElementById('display-val').innerText = main;
        if(sub) document.getElementById('display-msg').innerText = sub;
    },

    addToHistory: function(val, type) {
        const log = document.getElementById('history-log');
        const item = document.createElement('div');
        
        let icon = "➖";
        let colorClass = "";
        if(type === 'higher') { icon = "⬆️ Plus grand"; colorClass = "blue"; }
        if(type === 'lower') { icon = "⬇️ Plus petit"; colorClass = "orange"; }

        item.className = `log-item ${colorClass}`;
        item.innerHTML = `<span>${val}</span> <small>${icon}</small>`;
        
        log.insertBefore(item, log.firstChild);
    },

    // --- FIN DE JEU ---

    gameWin: function() {
        this.isGameOver = true;
        this.updateScreen(this.secretCode, "CODE CORRECT !");
        document.getElementById('vault-screen').classList.add('success');

        // Calcul du score : Plus on trouve vite, plus on gagne
        // Base 500 + 100 par essai restant
        this.score = 500 + (this.attemptsLeft * 100);
        if(window.GameSystem) window.GameSystem.updateScore(this.score);

        setTimeout(() => {
            if(window.GameSystem) {
                window.GameSystem.showModal({
                    title: "COFFRE OUVERT ! 🔓",
                    content: `Tu as trouvé le code <strong>${this.secretCode}</strong>.<br>Score : ${this.score}`,
                    actions: [
                        { label: "Niveau Suivant (Plus dur)", onClick: () => this.restartHarder() },
                        { label: "Quitter", onClick: () => window.GameSystem.stopGame() }
                    ]
                });
            }
        }, 1500);
    },

    gameLose: function() {
        this.isGameOver = true;
        this.updateScreen(this.secretCode, "ÉCHEC...");
        document.getElementById('vault-screen').classList.add('error');

        setTimeout(() => {
            if(window.GameSystem) {
                window.GameSystem.showModal({
                    title: "ALARME DÉCLENCHÉE ! 🚨",
                    content: `Le code était <strong>${this.secretCode}</strong>.`,
                    actions: [
                        { label: "Réessayer", onClick: () => this.start(this.container, this.config) },
                        { label: "Quitter", onClick: () => window.GameSystem.stopGame() }
                    ]
                });
            }
        }, 1500);
    },

    restartHarder: function() {
        // On augmente la difficulté dynamiquement
        this.config.maxNumber *= 2; 
        this.config.attempts += 2;
        this.start(this.container, this.config);
    },

    stop: function() {
        this.container.innerHTML = '';
    },

    // --- STYLES ---
 injectStyles: function() {
        if (document.getElementById('vault-style')) return;
        const css = `
            /* Conteneur principal figé */
            .vault-wrapper { 
                width: 100%; 
                max-width: 400px; 
                margin: 0 auto; 
                background: #2c3e50; 
                padding: 20px; 
                border-radius: 20px; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.5); 
                font-family: 'Courier New', monospace; 
                border: 4px solid #34495e;
                box-sizing: border-box; /* Important pour la stabilité */
            }
            
            .vault-header { display: flex; justify-content: space-between; color: #7f8c8d; margin-bottom: 15px; font-weight: bold; font-size: 0.9rem; }
            
            /* Écran */
            .vault-screen { 
                background: #000; border: 4px solid #555; border-radius: 10px; padding: 15px; 
                margin-bottom: 20px; text-align: center; color: #2ecc71; text-shadow: 0 0 10px #2ecc71;
                transition: all 0.3s;
                height: 100px; /* Hauteur fixe pour éviter les sauts */
                display: flex; flex-direction: column; justify-content: center;
            }
            .vault-screen.success { background: #2ecc71; color: #fff; text-shadow: none; border-color: #fff; }
            .vault-screen.error { background: #c0392b; color: #fff; text-shadow: none; border-color: #e74c3c; }

            .main-display { font-size: 3rem; font-weight: bold; letter-spacing: 5px; line-height: 1; }
            .sub-display { font-size: 1rem; margin-top: 10px; min-height: 20px; }

            /* Historique */
            .history-log { 
                background: rgba(0,0,0,0.2); height: 100px; overflow-y: auto; margin-bottom: 20px; 
                border-radius: 5px; padding: 5px; border: 1px solid #444;
            }
            .log-item { display: flex; justify-content: space-between; padding: 5px 10px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #fff; }
            .log-item.blue small { color: #3498db; }
            .log-item.orange small { color: #e67e22; }

            /* Clavier */
            .vault-pad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
            .vault-pad button { 
                padding: 15px; font-size: 1.5rem; background: #ecf0f1; border: none; 
                border-bottom: 4px solid #bdc3c7; /* Effet 3D */
                border-radius: 8px; cursor: pointer; color: #2c3e50; font-weight: bold;
                transition: all 0.1s;
                height: 60px; /* Hauteur fixe */
            }
            
            /* Animation d'enfoncement corrigée */
            .vault-pad button:active { 
                border-bottom: 0px solid #bdc3c7; 
                transform: translateY(4px); /* On descend de 4px pour compenser la bordure */
            }
            
            .vault-pad button.green { background: #2ecc71; border-color: #27ae60; color: white; }
            .vault-pad button.yellow { background: #f1c40f; border-color: #f39c12; color: white; }
        `;
        const style = document.createElement('style');
        style.id = 'vault-style';
        style.innerHTML = css;
        document.head.appendChild(style);
    }
};

if (window.GameSystem) window.GameSystem.register('vault', VaultGame);