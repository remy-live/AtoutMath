/**
 * games/math-arcade/script.js
 * Maths Arcade v11 - Intégration MathBox
 */

const MathArcadeGame = {
    container: null,
    
    // --- CONFIG ADMIN ---
    QUESTIONS_PER_LEVEL: 5,
    ENABLED_LEVELS: { 1:true, 2:true, 3:true, 4:true, 5:true, 6:true, 7:true, 8:true, 9:true, 10:true, 11:true, 12:true },
    IS_DEBUG_MODE: false,

    // --- VARIABLES D'ETAT ---
    currentLevel: 1,
    questionsSolved: 0,
    gameMode: 'visual',
    currentMultiplier: 10,
    isDivision: false,
    isDecimalDivision: false,
    isRushMode: false,
    
    startNumberVal: 0,
    targetValue: 0,
    digits: [],
    commaIndex: 0,
    userTypedString: "",
    
    score: 0,
    lives: 3,
    timerInterval: null,
    timeLeft: 0,
    TIME_LIMIT: 15,
    audioCtx: null,
    boundKeyDown: null, // Pour nettoyer l'event listener

    // --- INIT ---
    start: function(container) {
        this.container = container;
        this.loadCSS();
        this.createInterface();
        this.boundKeyDown = this.handleKeyDown.bind(this);
        document.addEventListener('keydown', this.boundKeyDown);
        
        // Audio Init (Click user interaction)
        this.container.addEventListener('click', () => {
             if(!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
             if(this.audioCtx.state === 'suspended') this.audioCtx.resume();
        }, {once:true});

        this.updateLevelButtons();
        this.setLevel(1);
    },

    stop: function() {
        if(this.timerInterval) clearInterval(this.timerInterval);
        document.removeEventListener('keydown', this.boundKeyDown);
        this.container.innerHTML = '';
        const existingCSS = document.getElementById('css-math-arcade');
        if(existingCSS) existingCSS.remove();
    },

    loadCSS: function() {
        if (!document.getElementById('css-math-arcade')) {
            const link = document.createElement('link');
            link.id = 'css-math-arcade';
            link.rel = 'stylesheet';
            link.href = 'games/math-arcade/style.css';
            document.head.appendChild(link);
        }
    },

    createInterface: function() {
        this.container.innerHTML = `
            <div class="ma-game">
                <div class="timer-container" id="ma-timerContainer"><div class="timer-bar" id="ma-timerBar"></div></div>
                
                <div class="hud-top">
                    <div class="lives-container" id="ma-livesContainer"></div>
                    <div class="score-box">
                        <div>Score: <span id="ma-scoreVal">0</span></div>
                        <div>Prog: <span id="ma-progressVal">0/5</span></div>
                    </div>
                </div>

                <div class="header-area">
                    <h1>Maths Arcade</h1>
                    <div class="level-badge" id="ma-levelBadge">Niveau 1</div>
                </div>

                <div class="game-console" id="ma-gameConsole">
                    <div class="left-panel">
                        <div class="equation-box" id="ma-equationDisplay">...</div>
                        <div class="input-display" id="ma-userTypingDisplay"></div>
                        <div id="ma-feedback"></div>
                    </div>

                    <div class="right-panel">
                        <div id="ma-visual-game-container" style="display:none;"></div>
                        <div class="visual-arrows" id="ma-visualControls" style="display:none;">
                            <button class="arrow-btn" id="btn-left">◀</button>
                            <button class="reset-btn" id="btn-reset" title="Reset">↺</button>
                            <button class="arrow-btn" id="btn-right">▶</button>
                        </div>
                        <button id="ma-checkBtnVisual" class="check-btn" style="display:none; max-width: 200px; margin-top:10px;">Vérifier</button>

                        <div class="numpad-wrapper" id="ma-numpadWrapper">
                            <div class="numpad" id="ma-numpad"></div>
                            <button id="ma-checkBtnType" class="check-btn">Vérifier</button>
                        </div>
                        <button id="ma-nextBtn" class="next-btn">Suivant ➜</button>
                    </div>
                </div>

                <div class="modal-overlay" id="ma-gameOverModal">
                    <div class="modal-content">
                        <h2 style="color:#e74c3c; font-size:3rem; margin:0;">GAME OVER</h2>
                        <p style="font-size:1.5rem; margin:20px 0;">Score : <span id="ma-finalScore">0</span></p>
                        <button class="restart-btn" id="ma-restartBtn">Rejouer</button>
                    </div>
                </div>

                <div class="level-bar-container">
                    <div class="level-bar-scroll" id="ma-levelButtonsContainer"></div>
                </div>
            </div>
        `;

        // Génération Pavé Numérique
        const numpad = this.container.querySelector('#ma-numpad');
        const keys = ['7','8','9','4','5','6','1','2','3',',','0','BS'];
        keys.forEach(k => {
            const btn = document.createElement('button');
            btn.className = 'key-btn';
            if(k==='BS') { btn.classList.add('backspace'); btn.innerText = '⌫'; }
            else if(k===',') { btn.classList.add('comma'); btn.innerText = ','; }
            else btn.innerText = k;
            
            btn.onclick = () => this.typeKey(k);
            numpad.appendChild(btn);
        });

        // Génération Boutons Niveaux
        const lvlContainer = this.container.querySelector('#ma-levelButtonsContainer');
        for(let i=1; i<=12; i++) {
            const btn = document.createElement('button');
            btn.className = 'lvl-btn';
            if(i>10) btn.classList.add('special');
            btn.id = `ma-lvl${i}-btn`;
            
            let label = i;
            if(i<=2) label += " (x10)";
            else if(i<=4) label += " (x100)";
            else if(i<=6) label += " (x0,1)";
            else if(i<=8) label += " (÷10)";
            else if(i<=10) label += " (÷0,1)";
            else if(i===11) label += " (Mix)";
            else label += " (Rush)";
            
            btn.innerText = label;
            btn.onclick = () => this.setLevel(i);
            lvlContainer.appendChild(btn);
        }

        // Bindings UI
        this.container.querySelector('#btn-left').onclick = () => this.moveComma(-1);
        this.container.querySelector('#btn-right').onclick = () => this.moveComma(1);
        this.container.querySelector('#btn-reset').onclick = () => this.initLevel(); // Reset visuel
        this.container.querySelector('#ma-checkBtnVisual').onclick = () => this.checkAnswer();
        this.container.querySelector('#ma-checkBtnType').onclick = () => this.checkAnswer();
        this.container.querySelector('#ma-nextBtn').onclick = () => this.nextStep();
        this.container.querySelector('#ma-restartBtn').onclick = () => this.restartGame();
    },

    // --- GAME LOGIC ---

    updateLevelButtons: function() {
        for (let i = 1; i <= 12; i++) {
            const btn = this.container.querySelector(`#ma-lvl${i}-btn`);
            if (btn) {
                if (!this.IS_DEBUG_MODE && this.ENABLED_LEVELS[i] === false) {
                    btn.classList.add('disabled');
                } else {
                    btn.classList.remove('disabled');
                }
            }
        }
    },

    setLevel: function(lvl) {
        if (!this.IS_DEBUG_MODE && this.ENABLED_LEVELS[lvl] === false) return;

        this.currentLevel = lvl;
        this.questionsSolved = 0;
        this.updateLevelButtons();
        
        const btns = this.container.querySelectorAll('.lvl-btn');
        btns.forEach(b => b.classList.remove('active'));
        const activeBtn = this.container.querySelector(`#ma-lvl${lvl}-btn`);
        if(activeBtn) activeBtn.classList.add('active');

        let title = "";
        if(lvl <= 2) title = "Niv " + lvl + " : Multiplier par 10";
        else if(lvl <= 4) title = "Niv " + lvl + " : Multiplier par 10, 100";
        else if(lvl <= 6) title = "Niv " + lvl + " : Multiplier par 0,1 etc.";
        else if(lvl <= 8) title = "Niv " + lvl + " : Divisions par 10, 100";
        else if(lvl <= 10) title = "Niv " + lvl + " : Divisions par 0,1 etc.";
        else if(lvl === 11) title = "Niv " + lvl + " : Mélange Total";
        else title = "Niv " + lvl + " : MODE RUSH 🔥";

        this.container.querySelector('#ma-levelBadge').innerText = title;
        
        this.gameMode = (lvl % 2 !== 0) ? 'visual' : 'type';

        const consoleEl = this.container.querySelector('#ma-gameConsole');
        const visualC = this.container.querySelector('#ma-visual-game-container');
        const visualCtrl = this.container.querySelector('#ma-visualControls');
        const checkVis = this.container.querySelector('#ma-checkBtnVisual');
        const numpadW = this.container.querySelector('#ma-numpadWrapper');
        const typeDisp = this.container.querySelector('#ma-userTypingDisplay');

        if (this.gameMode === 'visual') {
            consoleEl.className = 'game-console mode-visual';
            visualC.style.display = 'flex'; visualCtrl.style.display = 'flex'; checkVis.style.display = 'block'; 
            numpadW.style.display = 'none'; typeDisp.style.display = 'none'; typeDisp.classList.remove('active');
        } else {
            consoleEl.className = 'game-console mode-type';
            visualC.style.display = 'none'; visualCtrl.style.display = 'none'; checkVis.style.display = 'none';
            numpadW.style.display = 'flex'; typeDisp.style.display = 'flex'; typeDisp.classList.add('active');
        }

        this.initLevel();
    },

    initLevel: function() {
        if(this.lives <= 0) return;
        
        this.container.querySelector('#ma-progressVal').innerText = `${this.questionsSolved}/${this.QUESTIONS_PER_LEVEL}`;
        this.container.querySelector('#ma-scoreVal').innerText = this.score;
        this.updateLivesUI();

        const feed = this.container.querySelector('#ma-feedback');
        feed.innerText = "";
        
        const nextBtn = this.container.querySelector('#ma-nextBtn');
        nextBtn.style.display = "none";
        nextBtn.classList.remove('level-up');
        nextBtn.innerText = "Suivant ➜";
        
        if(this.gameMode === 'visual') this.container.querySelector('#ma-checkBtnVisual').style.display = 'block';
        else this.container.querySelector('#ma-checkBtnType').style.display = 'block';

        this.userTypedString = "";
        this.container.querySelector('#ma-userTypingDisplay').innerText = "";

        // Flags
        this.isDivision = false; this.isDecimalDivision = false; this.isRushMode = (this.currentLevel === 12);

        // Operateur
        let multipliers = [];
        if (this.currentLevel <= 2) multipliers = [10];
        else if (this.currentLevel <= 4) multipliers = [10, 100];
        else if (this.currentLevel <= 6) multipliers = [0.1, 0.01];
        else if (this.currentLevel <= 8) { multipliers = [0.1, 0.01]; this.isDivision = true; } 
        else if (this.currentLevel <= 10) { multipliers = [10, 100]; this.isDecimalDivision = true; } 
        else {
             let rnd = Math.random();
             if(rnd < 0.25) multipliers = [10, 100, 1000];
             else if(rnd < 0.5) multipliers = [0.1, 0.01, 0.001];
             else if(rnd < 0.75) { multipliers = [0.1, 0.01]; this.isDivision = true; }
             else { multipliers = [10, 100]; this.isDecimalDivision = true; }
        }

        this.currentMultiplier = multipliers[Math.floor(Math.random() * multipliers.length)];

        // Nombre
        let r = Math.random();
        let num;
        if (this.currentMultiplier < 1) { 
            if (r < 0.5) num = (Math.random() * 900 + 10).toFixed(1); 
            else num = (Math.random() * 50).toFixed(1); 
        } else { 
            if (r < 0.4) num = (Math.random() * 10).toFixed(1); 
            else if (r < 0.7) num = (Math.random() * 90 + 10).toFixed(1); 
            else num = (Math.random() * 10).toFixed(2); 
        }

        this.startNumberVal = parseFloat(num);
        this.targetValue = parseFloat((this.startNumberVal * this.currentMultiplier).toFixed(6)); 
        
        let startStr = this.startNumberVal.toString();
        if (!startStr.includes('.')) startStr += ".0";
        
        this.updateEquation(this.startNumberVal, "?");

        if (this.gameMode === 'visual') this.setupVisualBoard(startStr);
        
        clearInterval(this.timerInterval);
        this.container.querySelector('#ma-timerContainer').style.display = 'none';
        if(this.isRushMode) this.startTimer();
    },

    startTimer: function() {
        const bar = this.container.querySelector('#ma-timerBar');
        this.container.querySelector('#ma-timerContainer').style.display = 'block';
        this.timeLeft = this.TIME_LIMIT;
        this.updateTimerBar();
        
        this.timerInterval = setInterval(() => {
            this.timeLeft -= 0.1;
            this.updateTimerBar();
            if(this.timeLeft <= 0) {
                clearInterval(this.timerInterval);
                this.loseLife("Temps écoulé !");
            }
        }, 100);
    },
    
    updateTimerBar: function() {
        const bar = this.container.querySelector('#ma-timerBar');
        let pct = (this.timeLeft / this.TIME_LIMIT) * 100;
        bar.style.width = pct + "%";
        if(pct > 50) bar.style.backgroundColor = "#00b894";
        else if(pct > 20) bar.style.backgroundColor = "#e67e22";
        else bar.style.backgroundColor = "#d63031";
    },

    updateEquation: function(start, res) {
        let s = start.toString().replace('.', ',');
        let r = res.toString().replace('.', ',');
        let operatorStr = "";
        
        if (this.isDecimalDivision) {
            if (this.currentMultiplier === 10) operatorStr = "÷ 0,1";
            else if (this.currentMultiplier === 100) operatorStr = "÷ 0,01";
            else if (this.currentMultiplier === 1000) operatorStr = "÷ 0,001";
            else operatorStr = "x " + this.currentMultiplier;
        } 
        else if (this.isDivision) {
            if (Math.abs(this.currentMultiplier - 0.1) < 0.001) operatorStr = "÷ 10";
            else if (Math.abs(this.currentMultiplier - 0.01) < 0.001) operatorStr = "÷ 100";
            else if (Math.abs(this.currentMultiplier - 0.001) < 0.001) operatorStr = "÷ 1000";
            else operatorStr = "x " + this.currentMultiplier;
        } 
        else {
            let multStr = this.currentMultiplier.toString().replace('.', ',');
            if (this.currentMultiplier === 0.1) multStr = "0,1";
            if (this.currentMultiplier === 0.01) multStr = "0,01";
            if (this.currentMultiplier === 0.001) multStr = "0,001";
            operatorStr = "× " + multStr;
        }
        
        this.container.querySelector('#ma-equationDisplay').innerHTML = `${s} ${operatorStr} = <span class="equation-result">${r}</span>`;
    },

    setupVisualBoard: function(numStr) {
        const parts = numStr.split('.');
        this.digits = parts[0].split('').concat(parts[1].split(''));
        this.commaIndex = parts[0].length;
        this.renderVisualBoard();
    },

    renderVisualBoard: function() {
        const visualC = this.container.querySelector('#ma-visual-game-container');
        visualC.innerHTML = '';
        for (let i = 0; i < this.digits.length; i++) { 
            this.createSlot(i, visualC); 
            this.createDigit(this.digits[i], false, visualC); 
        }
        this.createSlot(this.digits.length, visualC);
    },

    createSlot: function(index, parent) {
        const slot = document.createElement('div'); slot.className = 'comma-slot';
        if (index === this.commaIndex) {
            const comma = document.createElement('div'); comma.className = 'comma-indicator'; comma.textContent = ','; slot.appendChild(comma);
        }
        parent.appendChild(slot);
    },

    createDigit: function(val, isNew, parent) {
        const box = document.createElement('div'); box.className = 'digit-box';
        if(isNew) box.classList.add('pop'); box.textContent = val; parent.appendChild(box);
    },

    moveComma: function(dir) {
        const nextBtn = this.container.querySelector('#ma-nextBtn');
        if (nextBtn.style.display !== "none") return;
        
        const newIndex = this.commaIndex + dir;
        const visualC = this.container.querySelector('#ma-visual-game-container');

        if (newIndex > this.digits.length) {
            this.digits.push('0'); this.commaIndex = newIndex; this.renderVisualBoard();
        } else if (newIndex < 0) {
            this.digits.unshift('0'); this.commaIndex = 0; this.renderVisualBoard();
        } else {
            this.commaIndex = newIndex; this.renderVisualBoard();
        }
    },

    typeKey: function(key) {
        const nextBtn = this.container.querySelector('#ma-nextBtn');
        if (nextBtn.style.display !== "none") return;
        
        if (key === 'BS') this.userTypedString = this.userTypedString.slice(0, -1);
        else if (this.userTypedString.length < 12) this.userTypedString += key;
        
        this.container.querySelector('#ma-userTypingDisplay').innerText = this.userTypedString;
    },

    handleKeyDown: function(e) {
        if(!this.container || !document.contains(this.container)) return;

        const nextBtn = this.container.querySelector('#ma-nextBtn');
        
        if (this.gameMode === 'type' && nextBtn.style.display === "none") {
            if (e.key >= '0' && e.key <= '9') this.typeKey(e.key);
            if (e.key === ',' || e.key === '.') this.typeKey(',');
            if (e.key === 'Backspace') this.typeKey('BS');
        }
        
        if (e.key === 'Enter') {
             const checkV = this.container.querySelector('#ma-checkBtnVisual');
             const checkT = this.container.querySelector('#ma-checkBtnType');
             
             if (checkT.style.display !== 'none' || checkV.style.display !== 'none') this.checkAnswer();
             else this.nextStep();
        }
        
        if (this.gameMode === 'visual' && nextBtn.style.display === "none") {
            if (e.key === "ArrowLeft") this.moveComma(-1);
            if (e.key === "ArrowRight") this.moveComma(1);
        }
    },

    checkAnswer: function() {
        if(this.lives <= 0) return;
        let userVal = 0;

        if (this.gameMode === 'visual') {
            let str = "";
            for(let i=0; i<this.digits.length; i++) { if (i === this.commaIndex) str += "."; str += this.digits[i]; }
            if (this.commaIndex === this.digits.length) str += ".";
            userVal = parseFloat(str);
        } else {
            let cleanStr = this.userTypedString.replace(',', '.');
            if (cleanStr === "") return;
            userVal = parseFloat(cleanStr);
        }

        if (Math.abs(userVal - this.targetValue) < 0.00001) {
            clearInterval(this.timerInterval);
            this.container.querySelector('#ma-feedback').innerHTML = "<span class='success'>Bravo ! 🎉</span>";
            this.updateEquation(this.startNumberVal, this.targetValue); 
            
            this.score += 10;
            if(this.isRushMode) this.score += Math.floor(this.timeLeft);
            this.container.querySelector('#ma-scoreVal').innerText = this.score;
            
            this.playTone(523.25, 'sine', 0.1); 
            setTimeout(() => this.playTone(659.25, 'sine', 0.1), 100);

            this.container.querySelector('#ma-checkBtnVisual').style.display = 'none';
            this.container.querySelector('#ma-checkBtnType').style.display = 'none';
            
            this.questionsSolved++;
            this.container.querySelector('#ma-progressVal').innerText = `${this.questionsSolved}/${this.QUESTIONS_PER_LEVEL}`;
            
            const nextBtn = this.container.querySelector('#ma-nextBtn');
            nextBtn.style.display = "inline-block";
            
            if (this.questionsSolved >= this.QUESTIONS_PER_LEVEL) {
                 nextBtn.innerText = "Niveau Suivant 🚀";
                 nextBtn.classList.add('level-up');
            } else {
                 nextBtn.innerText = "Suivant ➜";
                 nextBtn.classList.remove('level-up');
            }
            this.throwConfetti();
        } else {
            let displayVal = userVal.toString().replace('.', ',');
            let targetDisplay = this.targetValue.toString().replace('.', ',');
            this.loseLife(`Tu as mis ${displayVal}. <span class='correction'>Attendu : ${targetDisplay}</span>`);
        }
    },

    nextStep: function() {
        if (this.questionsSolved >= this.QUESTIONS_PER_LEVEL) {
            let nextLvl = this.currentLevel + 1;
            if (!this.IS_DEBUG_MODE) {
                while (nextLvl <= 12 && this.ENABLED_LEVELS[nextLvl] === false) { nextLvl++; }
            }
            if (nextLvl > 12) {
                if(window.GameSystem) window.GameSystem.showModal({
                    title: "Terminé !",
                    content: "Tu as fini tous les niveaux !",
                    actions: [{label:"Menu", onClick:()=>this.stop()}]
                });
            } else {
                this.setLevel(nextLvl);
            }
        } else {
            this.initLevel();
        }
    },

    loseLife: function(msg) {
        this.lives--; 
        this.playTone(150, 'sawtooth', 0.3);
        this.updateLivesUI();
        this.container.querySelector('#ma-feedback').innerHTML = `<span class='error'>${msg}</span>`;
        
        const consoleEl = this.container.querySelector('#ma-gameConsole');
        consoleEl.classList.remove('shake-anim');
        void consoleEl.offsetWidth;
        consoleEl.classList.add('shake-anim');

        if (this.lives <= 0) this.gameOver();
    },

    updateLivesUI: function() {
        const lc = this.container.querySelector('#ma-livesContainer');
        let heartsHTML = "";
        for(let i=0; i<3; i++) {
            if(i < this.lives) heartsHTML += "<span class='heart'>❤️</span>";
            else heartsHTML += "<span class='heart lost'>❤️</span>";
        }
        lc.innerHTML = heartsHTML;
    },

    gameOver: function() {
        clearInterval(this.timerInterval);
        this.container.querySelector('#ma-finalScore').innerText = this.score;
        this.container.querySelector('#ma-gameOverModal').style.display = 'flex';
    },

    restartGame: function() {
        this.lives = 3; this.score = 0;
        this.container.querySelector('#ma-scoreVal').innerText = "0";
        this.container.querySelector('#ma-gameOverModal').style.display = 'none';
        this.setLevel(1);
    },

    playTone: function(freq, type, duration) {
        if(!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator(); const gain = this.audioCtx.createGain();
        osc.type = type; osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
        osc.connect(gain); gain.connect(this.audioCtx.destination);
        osc.start(); osc.stop(this.audioCtx.currentTime + duration);
    },

    throwConfetti: function() {
        if(window.ParticleSystem) window.ParticleSystem.burst(this.container, 30);
    }
};

if (window.GameSystem) window.GameSystem.register('math-arcade', MathArcadeGame);