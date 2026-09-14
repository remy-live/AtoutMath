/**
 * games/multi/script.js
 * Multi-Trainer : Apprentissage des tables avec Progression, Mémoire d'erreurs et Effets "Juicy"
 */

const MultiGame = {
    config: {
        tables: [2, 3, 4, 5], 
        totalQuestions: 20
    },

    container: null,
    
    // État du jeu
    queue: [],         // File d'attente des questions
    initialCount: 0,   // Pour la barre de progression
    score: 0,
    combo: 0,
    maxCombo: 0,
    
    // Question actuelle
    currentCard: null,
    inputBuffer: "",

    // --- 1. DÉMARRAGE ---
    start: function(container, options = {}) {
        this.container = container;
        
        // Configuration
        if(options.tables && Array.isArray(options.tables)) this.config.tables = options.tables;
        if(options.totalQuestions) this.config.totalQuestions = parseInt(options.totalQuestions);

        // Reset variables
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.inputBuffer = "";
        this.container.classList.remove('on-fire');

        // Génération & CSS
        this.generateDeck();
        this.injectStyles();
        
        // Lancement
        this.nextQuestion();
    },

    // --- 2. MOTEUR (Génération & Progression) ---
    generateDeck: function() {
        this.queue = [];
        let pool = [];

        // Création du pool de calculs
        this.config.tables.forEach(t => {
            for(let i=2; i<=9; i++) { 
                pool.push({ a: t, b: i, res: t*i, mistakes: 0 });
            }
        });

        // Mélange
        pool.sort(() => Math.random() - 0.5);

        // Remplissage de la file
        while(this.queue.length < this.config.totalQuestions) {
            if(pool.length === 0) {
                // Si pool vide, on recharge
                this.config.tables.forEach(t => {
                    for(let i=2; i<=9; i++) pool.push({ a: t, b: i, res: t*i, mistakes: 0 });
                });
                pool.sort(() => Math.random() - 0.5);
            }
            this.queue.push({ ...pool.pop() });
        }
        
        this.initialCount = this.queue.length;
    },

    nextQuestion: function() {
        if (this.queue.length === 0) {
            this.endGame();
            return;
        }

        this.currentCard = this.queue.shift();
        this.inputBuffer = "";

        // LOGIQUE ADAPTATIVE
        // Calcul avancement (0.0 à 1.0)
        const progress = 1 - (this.queue.length / this.initialCount);
        let format = 'input';

        if (this.currentCard.mistakes > 0) {
            // Révision d'erreur = Aide (4 choix)
            format = 'quad'; 
        } else {
            // Progression normale
            if (progress < 0.3) format = 'duo';       // Début : 2 Choix
            else if (progress < 0.6) format = 'quad'; // Milieu : 4 Choix
            else format = 'input';                    // Fin : Clavier
        }

        this.currentCard.format = format;
        this.renderUI();
    },

    // --- 3. INTERFACE ---
    renderUI: function() {
        const { a, b, format } = this.currentCard;
        
        // Barre de progression
        let pct = ((this.initialCount - this.queue.length) / this.initialCount) * 100;
        if(pct > 100) pct = 98; // Plafond visuel

        let contentHTML = '';

        if (format === 'duo' || format === 'quad') {
            const nbChoices = format === 'duo' ? 2 : 4;
            const answers = this.generateDistractors(this.currentCard.res, nbChoices);
            contentHTML = `
                <div class="multi-grid ${format}">
                    ${answers.map(ans => `
                        <button class="multi-btn" onclick="MultiGame.checkAnswer(this, ${ans})">${ans}</button>
                    `).join('')}
                </div>`;
        } else {
            contentHTML = `
                <div class="input-area">
                    <div class="screen" id="input-screen">?</div>
                    <button class="validate-btn" onclick="MultiGame.validateInput()">OK</button>
                </div>
                <div class="numpad">
                    ${[1,2,3,4,5,6,7,8,9].map(n => `<button onclick="MultiGame.typeNum(${n})">${n}</button>`).join('')}
                    <button class="red" onclick="MultiGame.backspace()">⌫</button>
                    <button onclick="MultiGame.typeNum(0)">0</button>
                </div>`;
        }

        this.container.innerHTML = `
            <div class="multi-wrapper">
                <div class="multi-header">
                    <div class="progress-bar"><div class="fill" style="width:${pct}%"></div></div>
                    <div class="score-badge">Score: ${this.score}</div>
                </div>

                <div class="question-card">
                    <div class="math-eq">${a} × ${b}</div>
                </div>
                ${contentHTML}
            </div>
        `;
    },

    // --- 4. GESTION DU RÉSULTAT (C'est ici le FUN) ---
    
    handleResult: function(isCorrect, btnElement = null) {
        if (isCorrect) {
            // === SUCCÈS ===
            
            // 1. Particules (Au clic ou au centre)
            const rect = btnElement ? btnElement.getBoundingClientRect() : null;
            const x = rect ? (rect.left + rect.width/2) : (window.innerWidth/2);
            const y = rect ? (rect.top + rect.height/2) : (window.innerHeight/2);
            this.spawnParticles(x, y);

            // 2. Combo & Score
            this.combo++;
            this.maxCombo = Math.max(this.combo, this.maxCombo);
            
            // Points : Base 50 + Bonus Combo
            const points = 50 + (this.combo * 10);
            this.score += points;
            this.showFloatingText(x, y - 50, `+${points}`, '#f1c40f');
            
            // 3. Mode FEU
            if (this.combo >= 5) {
                this.container.classList.add('on-fire');
                this.showComboFeedback(`COMBO x${this.combo} ! 🔥`);
            } else if (this.combo > 1) {
                this.showComboFeedback(`${this.combo} suite !`);
            }

            // 4. Feedback Visuel Bouton/Écran
            if(btnElement) btnElement.classList.add('correct');
            else if(document.getElementById('input-screen')) {
                const s = document.getElementById('input-screen');
                s.style.color = "#2ecc71";
                s.style.borderColor = "#2ecc71";
                s.style.transform = "scale(1.1)";
            }

            if(window.GameSystem) window.GameSystem.updateScore(this.score);
            
            setTimeout(() => {
                this.nextQuestion();
            }, 800);

        } else {
            // === ERREUR ===
            
            // 1. Shake Screen
            this.container.classList.add('shake');
            setTimeout(() => this.container.classList.remove('shake'), 400);
            
            // 2. Reset Combo
            this.combo = 0;
            this.container.classList.remove('on-fire');
            this.showComboFeedback("DOMMAGE...", true);

            if(btnElement) btnElement.classList.add('wrong');
            
            // 3. Correction & Pénalité
            this.showFeedback(`Non ! ${this.currentCard.a} × ${this.currentCard.b} = ${this.currentCard.res}`);
            this.score = Math.max(0, this.score - 20);
            
            // 4. MÉMOIRE : On remet la carte dans la file !
            this.currentCard.mistakes++;
            // On la glisse 2 à 4 places plus loin
            const insertIndex = Math.min(this.queue.length, Math.floor(Math.random() * 2) + 2);
            this.queue.splice(insertIndex, 0, this.currentCard);

            setTimeout(() => this.nextQuestion(), 2500); 
        }
    },

    // --- 5. INPUT & UTILITAIRES ---

    checkAnswer: function(btn, value) {
        // Anti-spam clic
        const btns = this.container.querySelectorAll('.multi-btn');
        btns.forEach(b => b.disabled = true);
        this.handleResult(value === this.currentCard.res, btn);
    },

    typeNum: function(n) { 
        if(this.inputBuffer.length < 4) { this.inputBuffer += n; this.updateScreen(); } 
    },
    backspace: function() { 
        this.inputBuffer = this.inputBuffer.slice(0, -1); this.updateScreen(); 
    },
    updateScreen: function() { 
        document.getElementById('input-screen').innerText = this.inputBuffer || "?"; 
    },
    validateInput: function() {
        const val = parseInt(this.inputBuffer);
        this.handleResult(val === this.currentCard.res);
    },

    generateDistractors: function(correct, count) {
        let choices = new Set([correct]);
        while(choices.size < count) {
            let fake = correct + (Math.floor(Math.random() * 10) - 5) * (Math.random()>0.5?2:1);
            if(fake > 0 && fake !== correct) choices.add(fake);
        }
        return Array.from(choices).sort(() => Math.random() - 0.5);
    },

    // --- 6. EFFETS VISUELS (Juice) ---

    showFeedback: function(msg) {
        const overlay = document.createElement('div');
        overlay.className = 'feedback-overlay';
        overlay.innerHTML = `<span>${msg}</span>`;
        this.container.appendChild(overlay);
    },

    showFloatingText: function(x, y, txt, color) {
        const el = document.createElement('div');
        el.innerText = txt;
        el.style.cssText = `position: fixed; left:${x}px; top:${y}px; color:${color}; font-weight:bold; font-size:1.5rem; pointer-events:none; z-index:100; text-shadow: 1px 1px 0 #000; transition: all 0.8s;`;
        document.body.appendChild(el);
        requestAnimationFrame(() => { el.style.transform = "translateY(-50px) scale(1.2)"; el.style.opacity = "0"; });
        setTimeout(() => el.remove(), 800);
    },

    showComboFeedback: function(txt, isBad = false) {
        const el = document.createElement('div');
        el.className = isBad ? 'combo-pop bad' : 'combo-pop';
        el.innerText = txt;
        this.container.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    },

    spawnParticles: function(x, y) {
        const colors = ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6'];
        for(let i=0; i<15; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.left = x + 'px'; p.style.top = y + 'px';
            p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 60 + 20;
            p.style.setProperty('--tx', `${Math.cos(angle) * velocity}px`);
            p.style.setProperty('--ty', `${Math.sin(angle) * velocity}px`);
            
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 600);
        }
    },

    endGame: function() {
        // Bilan Étoiles
        let stars = 1;
        const avgScore = this.config.totalQuestions * 80; // Cible théorique
        if (this.score > avgScore) stars = 3;
        else if (this.score > avgScore * 0.6) stars = 2;

        const starStr = "⭐".repeat(stars);

        if(window.GameSystem) {
             window.GameSystem.showModal({
                 title: `TERMINÉ ! ${starStr}`, 
                 content: `
                    <div style="font-size:2rem; margin:10px;">Score : <strong>${this.score}</strong></div>
                    <div>Meilleur Combo : <strong>x${this.maxCombo}</strong> 🔥</div>
                    <div style="color:#7f8c8d; margin-top:10px;">Tables maîtrisées !</div>
                 `, 
                 actions: [
                    { label: "Rejouer", onClick: () => this.start(this.container, this.config) },
                    { label: "Quitter", onClick: () => window.GameSystem.stopGame() }
                 ]
             });
        }
    },

    // --- 7. STYLES CSS ---
    injectStyles: function() {
        if (document.getElementById('multi-style')) return;
        const css = `
            .multi-wrapper { max-width: 450px; margin: 0 auto; font-family: 'Segoe UI', sans-serif; position: relative; }
            .multi-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
            .progress-bar { flex: 1; height: 10px; background: #eee; border-radius: 5px; margin-right: 15px; }
            .fill { height: 100%; background: #3498db; border-radius: 5px; transition: width 0.3s; }
            .score-badge { font-weight: bold; color: #2c3e50; min-width:80px; text-align:right; }
            
            .question-card { 
                background: #fff; padding: 25px; border-radius: 15px; text-align: center; margin-bottom: 25px; 
                box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 3px solid #ecf0f1; transition: all 0.2s;
            }
            .math-eq { font-size: 3.5rem; font-weight: 800; color: #2c3e50; }
            
            /* MODE FEU */
            .on-fire .question-card { border-color: #f1c40f; box-shadow: 0 0 20px rgba(241, 196, 15, 0.4); animation: pulseFire 1s infinite; }
            @keyframes pulseFire { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }

            /* SHAKE */
            .shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
            @keyframes shake { 10%, 90% { transform: translate3d(-2px, 0, 0); } 20%, 80% { transform: translate3d(4px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-6px, 0, 0); } 40%, 60% { transform: translate3d(6px, 0, 0); } }

            /* QCM */
            .multi-grid { display: grid; gap: 15px; }
            .multi-grid.duo { grid-template-columns: 1fr 1fr; }
            .multi-grid.quad { grid-template-columns: 1fr 1fr; }
            .multi-btn { 
                padding: 20px; font-size: 2rem; border: none; border-radius: 12px; background: #fff; 
                border: 2px solid #bdc3c7; color: #34495e; cursor: pointer; font-weight: bold; transition: transform 0.1s;
                box-shadow: 0 4px 0 #95a5a6;
            }
            .multi-btn:active { transform: translateY(4px); box-shadow: none; }
            .multi-btn.correct { background: #2ecc71; border-color: #27ae60; color: white; box-shadow: 0 4px 0 #219150; }
            .multi-btn.wrong { background: #e74c3c; border-color: #c0392b; color: white; box-shadow: 0 4px 0 #96281b; }

            /* CLAVIER */
            .input-area { display: flex; gap: 10px; margin-bottom: 15px; }
            .screen { 
                flex: 1; background: #fff; border: 3px solid #3498db; border-radius: 10px; 
                font-size: 2rem; padding: 10px; text-align: center; font-weight: bold; transition: all 0.2s;
            }
            .validate-btn { background: #3498db; color: white; border: none; border-radius: 10px; font-size: 1.2rem; padding: 0 20px; cursor: pointer; }
            .numpad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
            .numpad button { 
                padding: 15px; font-size: 1.5rem; background: #fff; border: 2px solid #bdc3c7; 
                border-radius: 8px; font-weight: bold; color: #2c3e50; cursor: pointer; box-shadow: 0 3px 0 #95a5a6;
            }
            .numpad button:active { transform: translateY(3px); box-shadow: none; }
            .numpad button.red { color: #e74c3c; border-color: #e74c3c; }

            /* FEEDBACK */
            .feedback-overlay {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(231, 76, 60, 0.95); display: flex; align-items: center; justify-content: center;
                border-radius: 10px; animation: fadeIn 0.2s; z-index: 50;
            }
            .feedback-overlay span { color: white; font-size: 2rem; font-weight: bold; text-align: center; padding: 20px; }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

            /* PARTICULES & TEXTE FLOTTANT */
            .particle {
                position: fixed; width: 8px; height: 8px; border-radius: 2px;
                pointer-events: none; z-index: 999;
                animation: particleAnim 0.6s forwards ease-out;
            }
            @keyframes particleAnim {
                0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
                100% { transform: translate(var(--tx), var(--ty)) rotate(720deg); opacity: 0; }
            }
            .combo-pop {
                position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%);
                font-size: 3rem; font-weight: 900; color: rgba(255,255,255,0.2);
                z-index: 0; pointer-events: none; animation: zoomFade 0.5s forwards;
            }
            .combo-pop.bad { color: rgba(192, 57, 43, 0.3); font-size: 2rem; }
            @keyframes zoomFade { 
                0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(1.5); }
            }
        `;
        const style = document.createElement('style');
        style.id = 'multi-style';
        style.innerHTML = css;
        document.head.appendChild(style);
    }
};

if (window.GameSystem) window.GameSystem.register('multi', MultiGame);