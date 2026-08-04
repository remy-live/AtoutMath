/**
 * games/fractions/script.js
 * Le Samouraï des Fractions - Intégration MathBox
 */

const FractionGame = {
    container: null,
    
    // --- CONFIGURATION ---
    levels: {
        1: { name: "L'Apprenti", mode: "simple", factors: [2, 5, 10], multiSteps: true, traps: false, timer: false },
        2: { name: "Le Forgeron", mode: "decompose", factors: [2, 3, 4, 5, 6, 8, 9], multiSteps: true, traps: false, timer: false },
        3: { name: "Le Voyageur", mode: "decompose", factors: [6, 8, 9, 10, 12, 15, 20], multiSteps: true, traps: false, timer: false },
        4: { name: "Le Gardien", mode: "decompose", factors: [3, 4, 5, 6, 7, 8, 9], multiSteps: true, traps: true, timer: false },
        5: { name: "Maître Samouraï", mode: "decompose", factors: [2, 3, 4, 5, 6, 7, 8, 9, 11, 12], multiSteps: true, traps: true, timer: true }
    },

    // --- ETAT ---
    currentLvlId: 1,
    score: 0,
    currentNum: 0,
    currentDen: 0,
    commonFactor: 0,
    isIrreducible: false,
    slashedCount: 0,
    timerInterval: null,
    
    // --- LIFECYCLE ---
    start: function(container) {
        this.container = container;
        this.loadCSS();
        this.createInterface();
        this.showMenu();
        
        // Gestion de la touche Entrée globalement pour le jeu
        this.boundKeyPress = this.handleKeyPress.bind(this);
        document.addEventListener("keypress", this.boundKeyPress);
    },

    stop: function() {
        clearInterval(this.timerInterval);
        document.removeEventListener("keypress", this.boundKeyPress);
        this.container.innerHTML = '';
    },

    loadCSS: function() {
        if (!document.getElementById('css-fractions')) {
            const link = document.createElement('link');
            link.id = 'css-fractions';
            link.rel = 'stylesheet';
            link.href = 'games/fractions/style.css';
            document.head.appendChild(link);
        }
    },

    createInterface: function() {
        this.container.innerHTML = `
            <div class="frac-game">
                <div id="frac-menu" class="menu-screen">
                    <h1>Le Samouraï des Fractions</h1>
                    <p class="subtitle">Objectif : Rendre la fraction irréductible !</p>
                    <div class="level-grid" id="frac-level-grid"></div>
                </div>

                <div id="frac-game-screen" class="game-screen">
                    <div class="top-bar">
                        <button class="btn-back" id="frac-btn-back">⬅ Menu</button>
                        <span id="frac-level-title">Niveau X</span>
                        <span>Score: <span id="frac-score">0</span></span>
                    </div>

                    <div id="frac-timer-wrap" class="timer-wrap"><div id="frac-timer-bar" class="timer-bar"></div></div>

                    <div class="game-card" id="frac-card">
                        <div id="frac-content"></div>
                        <div id="frac-message" class="message-box"></div>
                        <div class="action-area" id="frac-controls"></div>
                    </div>
                </div>
            </div>
        `;

        // Génération des boutons de niveaux
        const grid = this.container.querySelector('#frac-level-grid');
        const icons = ["🟢", "🔵", "🟠", "🟣", "🔴"];
        const descs = [
            "Tables simples (2, 5, 10)<br>Trouve le diviseur",
            "Toutes tables<br>Écris la décomposition",
            "Grands Nombres<br>Plusieurs étapes !",
            "Attention aux pièges !<br>Utilise le bouclier 🛡️",
            "Chrono + Pièges<br>Rapidité !"
        ];

        for(let i=1; i<=5; i++) {
            const card = document.createElement('div');
            card.className = `level-card lc-${i}`;
            card.innerHTML = `
                <span class="lvl-icon">${icons[i-1]}</span>
                <span class="lvl-title">${this.levels[i].name}</span>
                <span class="lvl-desc">${descs[i-1]}</span>
            `;
            card.onclick = () => this.startLevel(i);
            grid.appendChild(card);
        }

        this.container.querySelector('#frac-btn-back').onclick = () => this.showMenu();
    },

    // --- NAVIGATION ---
    showMenu: function() {
        clearInterval(this.timerInterval);
        this.container.querySelector("#frac-menu").style.display = "flex";
        this.container.querySelector("#frac-game-screen").style.display = "none";
    },

    startLevel: function(id) {
        this.currentLvlId = id;
        this.score = 0;
        this.container.querySelector("#frac-score").innerText = "0";
        this.container.querySelector("#frac-level-title").innerText = this.levels[id].name;
        
        this.container.querySelector("#frac-menu").style.display = "none";
        this.container.querySelector("#frac-game-screen").style.display = "flex";
        
        const timerWrap = this.container.querySelector("#frac-timer-wrap");
        timerWrap.style.display = this.levels[id].timer ? "block" : "none";

        this.generateFraction();
    },

    // --- MOTEUR DE JEU ---
    generateFraction: function() {
        this.resetUI();
        const config = this.levels[this.currentLvlId];
        this.isIrreducible = false;

        // Logique Piège
        if (config.traps && Math.random() < 0.3) {
            this.isIrreducible = true;
            const primes = [2, 3, 5, 7, 11, 13, 17, 19];
            let p1 = primes[Math.floor(Math.random()*primes.length)];
            let p2 = primes[Math.floor(Math.random()*primes.length)];
            while(p1 === p2) p2 = primes[Math.floor(Math.random()*primes.length)];
            
            if(Math.random() > 0.5) { p1 = Math.floor(Math.random()*15)+4; p2 = p1 + 1; }
            this.currentNum = p1; this.currentDen = p2;
        } else {
            const f = config.factors[Math.floor(Math.random() * config.factors.length)];
            let m1 = Math.floor(Math.random() * 9) + 2;
            let m2 = Math.floor(Math.random() * 9) + 2;
            while (m1 === m2) m2 += 1;
            if (Math.random() > 0.6) { m1 *= 2; m2 *= 2; } // Force gros nombres

            this.currentNum = f * m1;
            this.currentDen = f * m2;
        }
        
        if(this.currentNum > this.currentDen) [this.currentNum, this.currentDen] = [this.currentDen, this.currentNum];

        this.renderGame();
        if (config.timer) this.startTimer();
    },

    renderGame: function() {
        const config = this.levels[this.currentLvlId];
        const content = this.container.querySelector("#frac-content");
        const controls = this.container.querySelector("#frac-controls");

        let html = `
            <div class="equation-row">
                <div class="fraction-group">
                    <div class="numerator">${this.currentNum}</div>
                    <div class="bar"></div>
                    <div class="denominator">${this.currentDen}</div>
                </div>
        `;

        if (config.mode === "simple") {
            html += `</div>`;
            content.innerHTML = html;
            controls.innerHTML = `
                <input type="number" class="simple-input" id="frac-input-simple" placeholder="?" autocomplete="off">
                <button class="btn-action btn-ok" id="frac-btn-cut">Couper</button>
            `;
            this.container.querySelector('#frac-btn-cut').onclick = () => this.checkSimple();
            setTimeout(()=> this.container.querySelector("#frac-input-simple")?.focus(), 50);

        } else {
            html += `<div class="equals-sign">=</div>`;
            html += `
                <div class="fraction-group">
                    <div class="numerator">
                        <input class="mini-input" id="frac-n1" type="number">
                        <span class="times">×</span>
                        <input class="mini-input" id="frac-n2" type="number">
                    </div>
                    <div class="bar"></div>
                    <div class="denominator">
                        <input class="mini-input" id="frac-d1" type="number">
                        <span class="times">×</span>
                        <input class="mini-input" id="frac-d2" type="number">
                    </div>
                </div>
            </div>`;
            content.innerHTML = html;

            controls.innerHTML = `<button class="btn-action btn-ok" id="frac-btn-check">Vérifier</button>`;
            if (config.traps) {
                controls.innerHTML += `<button class="btn-action btn-shield" id="frac-btn-shield">🛡️ Irréductible</button>`;
            }
            
            this.container.querySelector('#frac-btn-check').onclick = () => this.checkDecompose();
            if(config.traps) this.container.querySelector('#frac-btn-shield').onclick = () => this.useShield();
            
            setTimeout(()=> this.container.querySelector("#frac-n1")?.focus(), 50);
        }
    },

    // --- VALIDATION ---
    checkSimple: function() {
        const inp = this.container.querySelector("#frac-input-simple");
        const val = parseInt(inp.value);
        if(!val) return;
        
        if (this.currentNum % val === 0 && this.currentDen % val === 0 && val > 1) {
            this.commonFactor = val;
            this.triggerSlashPhase(val, this.currentNum/val, val, this.currentDen/val);
        } else {
            this.feedback("Impossible ! Ce n'est pas un diviseur commun.", "msg-wrong");
            this.shake();
            inp.value = ''; inp.focus();
        }
    },

    checkDecompose: function() {
        if (this.isIrreducible) {
            this.feedback("Piège ! Elle est déjà irréductible !", "msg-wrong");
            this.score = Math.max(0, this.score - 5); this.updateScore(); this.shake(); return;
        }

        const n1 = parseInt(this.container.querySelector("#frac-n1").value);
        const n2 = parseInt(this.container.querySelector("#frac-n2").value);
        const d1 = parseInt(this.container.querySelector("#frac-d1").value);
        const d2 = parseInt(this.container.querySelector("#frac-d2").value);

        if (!n1 || !n2 || !d1 || !d2) return;

        if (n1*n2 !== this.currentNum || d1*d2 !== this.currentDen) {
            this.feedback("Erreur de calcul dans la multiplication.", "msg-wrong"); this.shake(); return;
        }

        let f = null;
        if (n1===d1) f=n1; else if(n1===d2) f=n1;
        else if(n2===d1) f=n2; else if(n2===d2) f=n2;

        if (f && f > 1) {
            this.commonFactor = f;
            this.triggerSlashPhase(n1, n2, d1, d2);
        } else {
            this.feedback("Calcul juste, mais rien à barrer (pas de facteur commun) !", "msg-wrong"); this.shake();
        }
    },

    useShield: function() {
        if (this.isIrreducible) {
            this.feedback("Bien vu ! Fraction irréductible !", "msg-correct");
            this.successEffect(true);
        } else {
            this.feedback("Non, on peut encore simplifier !", "msg-wrong");
            this.shake(); this.score = Math.max(0, this.score - 5); this.updateScore();
        }
    },

    // --- ANIMATION COUPURE ---
    triggerSlashPhase: function(n1, n2, d1, d2) {
        clearInterval(this.timerInterval);
        this.container.querySelector("#frac-controls").innerHTML = ""; 
        this.feedback("Coupe les chiffres identiques !", "msg-correct");

        // Rendu spécifique pour les facteurs cliquables
        const render = (v, id) => v === this.commonFactor ? 
            `<span class="factor slash-target" data-id="${id}">${v}</span>` : 
            `<span class="factor static">${v}</span>`;

        this.container.querySelector("#frac-content").innerHTML = `
            <div class="equation-row">
                <div class="fraction-group" style="opacity:0.5">
                    <div class="numerator">${this.currentNum}</div><div class="bar"></div><div class="denominator">${this.currentDen}</div>
                </div>
                <div class="equals-sign">=</div>
                <div class="fraction-group">
                    <div class="numerator">${render(n1, 'n1')}<span class="times">×</span>${render(n2, 'n2')}</div>
                    <div class="bar"></div>
                    <div class="denominator">${render(d1, 'd1')}<span class="times">×</span>${render(d2, 'd2')}</div>
                </div>
            </div>
        `;
        
        // Attacher les events aux éléments à barrer
        this.slashedCount = 0;
        this.container.querySelectorAll('.slash-target').forEach(el => {
            el.onclick = () => this.doSlash(el);
        });
    },

    doSlash: function(el) {
        if(el.classList.contains("slashed")) return;
        el.classList.add("slashed");
        this.slashedCount++;
        if(this.slashedCount >= 2) setTimeout(() => this.finalizeRound(), 600);
    },

    finalizeRound: function() {
        this.currentNum /= this.commonFactor;
        this.currentDen /= this.commonFactor;
        
        const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
        const isFinished = gcd(this.currentNum, this.currentDen) === 1;
        const config = this.levels[this.currentLvlId];

        if (isFinished) {
            this.feedback(`Terminé ! Fraction irréductible : ${this.currentNum}/${this.currentDen}`, "msg-correct");
            this.successEffect(false);
        } else {
            this.feedback("Bien ! Mais ce n'est pas fini, simplifie encore !", "msg-info");
            setTimeout(() => {
                this.renderGame(); 
                if(config.timer) this.startTimer();
            }, 1500);
        }
    },

    // --- UTILITAIRES UI ---
    resetUI: function() {
        const msg = this.container.querySelector("#frac-message");
        msg.innerText = ""; msg.className = "message-box";
        this.container.querySelector("#frac-controls").innerHTML = "";
    },

    feedback: function(txt, cls) {
        const el = this.container.querySelector("#frac-message");
        el.innerText = txt; el.className = "message-box " + cls;
    },

    updateScore: function() { this.container.querySelector("#frac-score").innerText = this.score; },
    
    shake: function() {
        const c = this.container.querySelector("#frac-card");
        c.style.transform = "translateX(10px)";
        setTimeout(()=>c.style.transform="translateX(-10px)",50);
        setTimeout(()=>c.style.transform="translateX(0)",100);
    },

    successEffect: function(isShield) {
        this.score += isShield ? 15 : 10;
        this.updateScore();
        if(window.ParticleSystem) window.ParticleSystem.burst(this.container.querySelector("#frac-card"), 20);
        this.container.querySelector("#frac-card").style.border = "3px solid var(--success)";
        setTimeout(() => {
            this.container.querySelector("#frac-card").style.border = "none";
            this.generateFraction();
        }, 1500);
    },

    startTimer: function() {
        const bar = this.container.querySelector("#frac-timer-bar");
        let w = 100;
        bar.style.width = "100%";
        this.timerInterval = setInterval(() => {
            w -= 0.2; 
            bar.style.width = w + "%";
            if(w <= 0) {
                clearInterval(this.timerInterval);
                this.feedback("Temps écoulé !", "msg-wrong");
                setTimeout(() => this.generateFraction(), 1500);
            }
        }, 50);
    },

    handleKeyPress: function(e) {
        if(e.key === "Enter") {
            // Clic sur le bouton d'action principal disponible
            const btn = this.container.querySelector(".btn-ok");
            if(btn) btn.click();
        }
    }
};

if (window.GameSystem) window.GameSystem.register('fractions', FractionGame);