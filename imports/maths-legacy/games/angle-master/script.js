/**
 * games/angle-master/script.js
 * Angle Master - Intégration MathBox
 */

const AngleMasterGame = {
    container: null,
    canvas: null,
    ctx: null,
    
    // UI Elements
    ui: {},
    
    // STATE
    gameMode: 'measure', // 'measure' | 'construct'
    gamePhase: 'estimate', // 'estimate' | 'action'
    score: 0,
    round: 1,
    isFrozen: false,
    isCorrecting: false,
    isLoupeActive: false,
    
    // DATA
    targetAngle: 0,
    baseRotation: 0,
    anglePos: { x: 0, y: 0 },
    userConstructionAngle: 45,
    
    // TOOL
    protractor: { x: 0, y: 0, radius: 250, rotation: 0, isDragging: false, isRotating: false, visible: true },
    pointer: { x: 0, y: 0 },
    dragOffset: { x: 0, y: 0 },
    startRotationAngle: 0,
    isDraggingLeg: false,
    particles: [],
    
    animationId: null,

    start: function(container) {
        this.container = container;
        this.loadCSS();
        this.createInterface();
        
        // Init Canvas
        this.canvas = this.container.querySelector('#am-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.bindEvents();
        this.resizeCanvas();
        this.loop();
    },

    stop: function() {
        if(this.animationId) cancelAnimationFrame(this.animationId);
        // Clean listeners if needed, though replacing HTML clears most
    },

    loadCSS: function() {
        if (!document.getElementById('css-angle-master')) {
            const link = document.createElement('link');
            link.id = 'css-angle-master';
            link.rel = 'stylesheet';
            link.href = 'games/angle-master/style.css';
            document.head.appendChild(link);
        }
    },

    createInterface: function() {
        this.container.innerHTML = `
            <div class="am-game">
                <div id="am-start-screen" class="start-screen">
                    <div class="title-main">Angle Master</div>
                    <div class="subtitle">Maîtrise la mesure et la construction</div>
                    <div class="mode-cards">
                        <div class="card" id="btn-mode-measure">
                            <span class="card-icon">📐</span>
                            <div class="card-title">Mesurer</div>
                            <div class="card-desc">Trouve la valeur de l'angle</div>
                        </div>
                        <div class="card" id="btn-mode-construct">
                            <span class="card-icon">🏗️</span>
                            <div class="card-title">Construire</div>
                            <div class="card-desc">Crée l'angle demandé</div>
                        </div>
                    </div>
                </div>

                <div id="am-modal-error" class="modal-overlay">
                    <div class="modal-box">
                        <span class="modal-icon">🧐</span>
                        <div class="modal-title">Presque...</div>
                        <div class="modal-text" id="am-modal-msg">...</div>
                        <button class="btn-modal" id="am-btn-solution">Voir la solution</button>
                    </div>
                </div>

                <div class="sidebar">
                    <div class="header-row">
                        <h1>Angle Master</h1>
                        <button class="btn-home" id="am-btn-home">🏠 Menu</button>
                    </div>
                    
                    <div class="stat-container">
                        <div class="stat-box"><span class="stat-label">Score</span><div class="stat-value" id="am-score">0</div></div>
                        <div class="stat-box"><span class="stat-label">Défi</span><div class="stat-value" id="am-round">1</div></div>
                    </div>
                    
                    <div id="am-phase-display" class="phase-display">
                        <div class="phase-label">Étape</div>
                        <div class="phase-text" id="am-phase-text">Estimation</div>
                    </div>

                    <div id="am-feedback" class="feedback-area">...</div>

                    <div id="am-est-controls" class="control-group">
                        <button class="btn-est" id="btn-est-aigu">Aigu (< 90°)</button>
                        <button class="btn-est" id="btn-est-obtus">Obtus (> 90°)</button>
                    </div>

                    <div id="am-tool-controls" class="control-group disabled">
                        <button id="am-btn-loupe" class="btn">🔍 Loupe</button>
                        
                        <div id="am-measure-group">
                            <label>Valeur mesurée (°)</label>
                            <input type="number" id="am-angle-input" placeholder="?">
                        </div>

                        <div id="am-construct-group" style="display:none; text-align:center;">
                            <label>Angle à construire :</label>
                            <div style="font-size:2rem; font-weight:900; color:var(--accent);" id="am-target-val">--°</div>
                        </div>
                        
                        <div>
                            <label>Taille Rapporteur</label>
                            <input type="range" id="am-size-slider" min="150" max="350" value="250" style="width:100%">
                        </div>

                        <button id="am-btn-check" class="btn">Valider</button>
                    </div>
                    
                    <button id="am-btn-reset-tool" class="btn-home" style="margin-top:10px; width:100%">Recentrer le rapporteur</button>
                </div>

                <div id="am-canvas-container" class="canvas-container">
                    <canvas id="am-canvas"></canvas>
                </div>
            </div>
        `;

        // Cache UI references
        this.ui = {
            startScreen: this.container.querySelector('#am-start-screen'),
            score: this.container.querySelector('#am-score'),
            round: this.container.querySelector('#am-round'),
            phaseDiv: this.container.querySelector('#am-phase-display'),
            phaseText: this.container.querySelector('#am-phase-text'),
            feedback: this.container.querySelector('#am-feedback'),
            estControls: this.container.querySelector('#am-est-controls'),
            toolControls: this.container.querySelector('#am-tool-controls'),
            measureGroup: this.container.querySelector('#am-measure-group'),
            constructGroup: this.container.querySelector('#am-construct-group'),
            targetVal: this.container.querySelector('#am-target-val'),
            input: this.container.querySelector('#am-angle-input'),
            modal: this.container.querySelector('#am-modal-error'),
            modalMsg: this.container.querySelector('#am-modal-msg'),
            btnLoupe: this.container.querySelector('#am-btn-loupe'),
            canvasContainer: this.container.querySelector('#am-canvas-container')
        };
    },

    bindEvents: function() {
        // Menu
        this.container.querySelector('#btn-mode-measure').onclick = () => this.startGame('measure');
        this.container.querySelector('#btn-mode-construct').onclick = () => this.startGame('construct');
        this.container.querySelector('#am-btn-home').onclick = () => this.ui.startScreen.classList.remove('hidden');

        // Controls
        this.container.querySelector('#btn-est-aigu').onclick = () => this.checkEstimation('aigu');
        this.container.querySelector('#btn-est-obtus').onclick = () => this.checkEstimation('obtus');
        this.container.querySelector('#am-btn-check').onclick = () => this.validateRound();
        this.container.querySelector('#am-btn-solution').onclick = () => this.closeModalAndCorrect();
        this.container.querySelector('#am-btn-reset-tool').onclick = () => this.resetProtractor();
        this.ui.btnLoupe.onclick = () => this.toggleLoupe();
        
        this.container.querySelector('#am-size-slider').oninput = (e) => { this.protractor.radius = parseInt(e.target.value); };
        this.ui.input.onkeypress = (e) => { if(e.key === 'Enter') this.validateRound(); };

        // Canvas Events
        const c = this.canvas;
        c.addEventListener('mousedown', (e) => this.onPointerDown(e));
        c.addEventListener('mousemove', (e) => this.onPointerMove(e));
        window.addEventListener('mouseup', () => this.onPointerUp());
        
        // Touch support basic
        c.addEventListener('touchstart', (e) => { e.preventDefault(); this.onPointerDown(e.touches[0]); }, {passive: false});
        c.addEventListener('touchmove', (e) => { e.preventDefault(); this.onPointerMove(e.touches[0]); }, {passive: false});
        c.addEventListener('touchend', () => this.onPointerUp());

        // Resize Observer
        new ResizeObserver(() => this.resizeCanvas()).observe(this.ui.canvasContainer);
    },

    resizeCanvas: function() {
        if(!this.canvas) return;
        this.canvas.width = this.ui.canvasContainer.clientWidth;
        this.canvas.height = this.ui.canvasContainer.clientHeight;
        if(this.gameMode === 'construct') { // Recentre l'angle en mode construct si resize
            this.anglePos.x = this.canvas.width / 2;
            this.anglePos.y = this.canvas.height / 2;
        }
    },

    // --- LOGIQUE JEU ---

    startGame: function(mode) {
        this.gameMode = mode;
        this.ui.startScreen.classList.add('hidden');
        this.score = 0; this.round = 1;
        this.ui.score.innerText = 0; this.ui.round.innerText = 1;

        if (mode === 'measure') {
            this.ui.measureGroup.style.display = 'block';
            this.ui.constructGroup.style.display = 'none';
        } else {
            this.ui.measureGroup.style.display = 'none';
            this.ui.constructGroup.style.display = 'block';
        }
        this.newRound();
    },

    newRound: function() {
        this.isFrozen = false; this.isCorrecting = false; this.isDraggingLeg = false;
        this.ui.round.innerText = this.round;
        
        // Gen Angle (10° à 170°)
        this.targetAngle = Math.floor(Math.random() * 160) + 10;
        this.baseRotation = Math.random() * Math.PI * 2;

        // Position
        if (this.gameMode === 'construct') {
            this.anglePos.x = this.canvas.width / 2;
            this.anglePos.y = this.canvas.height / 2;
        } else {
            const margin = this.canvas.width * 0.2;
            this.anglePos.x = margin + Math.random() * (this.canvas.width - margin*2);
            this.anglePos.y = this.canvas.height * 0.3 + Math.random() * (this.canvas.height * 0.4);
        }

        this.userConstructionAngle = 45;
        this.ui.input.value = '';
        this.resetProtractor();

        if (this.gameMode === 'measure') this.setPhase('estimate');
        else {
            this.setPhase('action');
            this.ui.targetVal.innerText = this.targetAngle + "°";
            this.ui.feedback.innerText = "Utilise le trait rouge pour former l'angle.";
        }
    },

    setPhase: function(phase) {
        this.gamePhase = phase;
        if (phase === 'estimate') {
            this.ui.phaseText.innerText = "Estimation";
            this.ui.phaseText.style.color = "var(--warning)";
            this.ui.phaseDiv.style.borderColor = "var(--warning)";
            this.ui.feedback.innerText = "Regarde l'angle noir. Est-il Aigu ou Obtus ?";
            this.ui.estControls.style.display = 'flex';
            this.ui.toolControls.classList.add('disabled');
            this.protractor.visible = false;
        } else {
            this.ui.phaseText.innerText = (this.gameMode === 'measure') ? "Mesure" : "Construction";
            this.ui.phaseText.style.color = "var(--success)";
            this.ui.phaseDiv.style.borderColor = "var(--success)";
            this.ui.estControls.style.display = 'none';
            this.ui.toolControls.classList.remove('disabled');
            this.ui.feedback.innerText = (this.gameMode === 'measure') ? "Place le rapporteur et mesure." : `Construis un angle de ${this.targetAngle}°`;
            this.protractor.visible = true;
            if(this.gameMode === 'measure') this.ui.input.focus();
        }
    },

    checkEstimation: function(choice) {
        let isAcute = this.targetAngle < 90;
        let isCorrect = (choice === 'aigu' && isAcute) || (choice === 'obtus' && !isAcute);
        if (isCorrect) {
            this.ui.feedback.innerText = "Bien vu ! Maintenant, place aux outils.";
            this.setPhase('action');
        } else {
            this.ui.feedback.innerText = "Oups ! Regarde bien l'ouverture.";
            this.ui.feedback.style.color = "var(--error)";
            setTimeout(() => this.ui.feedback.style.color = "", 1500);
        }
    },

    validateRound: function() {
        if (this.isFrozen) return;
        let diff = 0, userVal = 0;

        if (this.gameMode === 'measure') {
            userVal = parseInt(this.ui.input.value);
            if (isNaN(userVal)) return;
            diff = Math.abs(userVal - this.targetAngle);
        } else {
            userVal = Math.round(this.userConstructionAngle);
            diff = Math.abs(userVal - this.targetAngle);
        }

        this.isFrozen = true;

        if (diff <= 3) {
            this.score += (10 - diff) * 10;
            this.ui.score.innerText = this.score;
            this.ui.feedback.innerHTML = `<span style="color:var(--success)">PARFAIT !</span> Cible: ${this.targetAngle}° | Toi: ${userVal}°`;
            this.spawnConfetti();
            setTimeout(() => { this.round++; this.newRound(); }, 2500);
        } else {
            let msg = (this.gameMode === 'measure') ? `Tu as lu <b>${userVal}°</b>, mais c'est <b>${this.targetAngle}°</b>.` : `Tu as fait <b>${userVal}°</b> au lieu de <b>${this.targetAngle}°</b>.`;
            this.ui.modalMsg.innerHTML = msg;
            this.ui.modal.classList.add('visible');
        }
    },

    closeModalAndCorrect: function() {
        this.ui.modal.classList.remove('visible');
        this.ui.feedback.innerText = "Correction automatique...";
        this.isCorrecting = true;
        this.animateCorrection();
    },

    animateCorrection: function() {
        const startX = this.protractor.x, startY = this.protractor.y, startRot = this.protractor.rotation;
        const endX = this.anglePos.x, endY = this.anglePos.y, endRot = this.baseRotation;
        const startLeg = this.userConstructionAngle, endLeg = this.targetAngle;
        let startTime = null; const duration = 2000;

        const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);

            this.protractor.x = startX + (endX - startX) * ease;
            this.protractor.y = startY + (endY - startY) * ease;
            this.protractor.rotation = startRot + (endRot - startRot) * ease;
            
            if(this.gameMode === 'construct') {
                this.userConstructionAngle = startLeg + (endLeg - startLeg) * ease;
            }

            if (progress < 1) requestAnimationFrame(step);
            else setTimeout(() => { this.round++; this.newRound(); }, 1000);
        };
        requestAnimationFrame(step);
    },

    resetProtractor: function() {
        this.protractor.x = this.canvas.width / 2;
        this.protractor.y = this.canvas.height * 0.8;
        this.protractor.rotation = 0;
    },

    toggleLoupe: function() {
        this.isLoupeActive = !this.isLoupeActive;
        this.ui.btnLoupe.classList.toggle('active');
        if(this.isLoupeActive) this.ui.canvasContainer.classList.add('loupe-active');
        else this.ui.canvasContainer.classList.remove('loupe-active');
    },

    // --- DRAWING ---
    loop: function() {
        this.draw();
        this.animationId = requestAnimationFrame(() => this.loop());
    },

    draw: function() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawGrid();
        this.drawAngle();
        if (this.protractor.visible) this.drawProtractor();
        if (this.isLoupeActive && !this.isFrozen && this.protractor.visible) this.drawRealLoupe();
        this.updateConfetti();
    },

    drawGrid: function() {
        this.ctx.save(); this.ctx.strokeStyle = '#cbd5e1'; this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        for (let x = 0; x < this.canvas.width; x += 40) { this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.canvas.height); }
        for (let y = 0; y < this.canvas.height; y += 40) { this.ctx.moveTo(0, y); this.ctx.lineTo(this.canvas.width, y); }
        this.ctx.stroke(); this.ctx.restore();
    },

    drawAngle: function() {
        this.ctx.save();
        this.ctx.translate(this.anglePos.x, this.anglePos.y);
        this.ctx.rotate(this.baseRotation);
        this.ctx.lineCap = 'round'; this.ctx.lineWidth = 3;
        const len = 300;

        // Base Line
        this.ctx.strokeStyle = '#0f172a';
        this.ctx.beginPath(); this.ctx.moveTo(0,0); this.ctx.lineTo(len, 0); this.ctx.stroke();

        // Second Line
        if (this.gameMode === 'measure') {
            this.ctx.beginPath(); this.ctx.moveTo(0,0); 
            this.ctx.rotate(-this.targetAngle * Math.PI / 180); 
            this.ctx.lineTo(len, 0); this.ctx.stroke();
        } else {
            this.ctx.strokeStyle = '#ef4444'; 
            this.ctx.beginPath(); this.ctx.moveTo(0,0); 
            this.ctx.rotate(-this.userConstructionAngle * Math.PI / 180); 
            this.ctx.lineTo(len, 0); this.ctx.stroke();
            // Handle
            this.ctx.beginPath(); this.ctx.arc(len, 0, 10, 0, Math.PI*2); this.ctx.fillStyle = '#ef4444'; this.ctx.fill();
            
            if(this.isCorrecting) {
                this.ctx.restore(); this.ctx.save();
                this.ctx.translate(this.anglePos.x, this.anglePos.y);
                this.ctx.rotate(this.baseRotation);
                this.ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
                this.ctx.beginPath(); this.ctx.moveTo(0,0); 
                this.ctx.rotate(-this.targetAngle * Math.PI / 180); 
                this.ctx.lineTo(len, 0); this.ctx.stroke();
            }
        }
        this.ctx.restore();
        this.ctx.beginPath(); this.ctx.arc(this.anglePos.x, this.anglePos.y, 5, 0, Math.PI*2); this.ctx.fillStyle = '#ef4444'; this.ctx.fill();
    },

    drawProtractor: function() {
        this.ctx.save();
        this.ctx.translate(this.protractor.x, this.protractor.y);
        this.ctx.rotate(this.protractor.rotation);
        const r = this.protractor.radius;

        // Body
        this.ctx.beginPath(); this.ctx.arc(0, 0, r, Math.PI, 0); this.ctx.lineTo(0, 0); this.ctx.closePath();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'; this.ctx.fill(); 
        this.ctx.lineWidth = 1; this.ctx.strokeStyle = '#64748b'; this.ctx.stroke();
        
        // Base Line & Target
        this.ctx.beginPath(); this.ctx.moveTo(-r, 0); this.ctx.lineTo(r, 0); this.ctx.lineWidth = 2; this.ctx.strokeStyle = '#0f172a'; this.ctx.stroke();
        this.ctx.beginPath(); this.ctx.moveTo(0, -15); this.ctx.lineTo(0, 15); this.ctx.moveTo(-15, 0); this.ctx.lineTo(15, 0);
        this.ctx.lineWidth = 2; this.ctx.strokeStyle = '#ef4444'; this.ctx.stroke();

        // Ticks
        this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
        const fs = r / 22;
        for(let i=0; i<=180; i++) {
            const rad = Math.PI + (i * Math.PI / 180);
            const cos = Math.cos(rad), sin = Math.sin(rad);
            const isMajor = (i % 10 === 0);
            let len = isMajor ? r*0.06 : (i%5===0 ? r*0.04 : r*0.02);
            
            this.ctx.beginPath(); this.ctx.moveTo(cos*r, sin*r); this.ctx.lineTo(cos*(r-len), sin*(r-len));
            this.ctx.lineWidth = isMajor ? 1.5 : 0.5; this.ctx.strokeStyle = '#334155'; this.ctx.stroke();

            if(isMajor) {
                this.ctx.font = `bold ${fs}px Inter`; this.ctx.fillStyle = '#0f172a';
                this.ctx.fillText(i, cos*(r*0.88), sin*(r*0.88));
                this.ctx.font = `normal ${fs*0.9}px Inter`; this.ctx.fillStyle = '#64748b';
                this.ctx.fillText(180-i, cos*(r*0.74), sin*(r*0.74));
            }
        }
        
        // Handles
        this.drawHandle(r + 35, 0); this.drawHandle(-(r + 35), 0);
        this.ctx.restore();
    },

    drawHandle: function(x, y) {
        this.ctx.beginPath(); this.ctx.arc(x, y, 16, 0, Math.PI*2);
        this.ctx.fillStyle = '#6366f1'; this.ctx.fill();
        this.ctx.strokeStyle = 'white'; this.ctx.lineWidth = 2; this.ctx.stroke();
        this.ctx.beginPath(); 
        if(x>0) { this.ctx.moveTo(x-35, 0); this.ctx.lineTo(x-16, 0); } else { this.ctx.moveTo(x+35, 0); this.ctx.lineTo(x+16, 0); }
        this.ctx.strokeStyle = '#94a3b8'; this.ctx.lineWidth = 2; this.ctx.stroke();
    },

    drawRealLoupe: function() {
        const zoom = 3; const r = 90; const lx = this.pointer.x; const ly = this.pointer.y;
        this.ctx.save();
        this.ctx.beginPath(); this.ctx.arc(lx, ly, r, 0, Math.PI*2); this.ctx.clip();
        this.ctx.fillStyle = 'white'; this.ctx.fill();
        this.ctx.translate(lx, ly); this.ctx.scale(zoom, zoom); this.ctx.translate(-this.pointer.x, -this.pointer.y);
        this.drawGrid(); this.drawAngle(); 
        if(this.protractor.visible) this.drawProtractor();
        this.ctx.restore();
        
        this.ctx.save();
        this.ctx.beginPath(); this.ctx.arc(lx, ly, r, 0, Math.PI*2); 
        this.ctx.lineWidth = 4; this.ctx.strokeStyle = '#cbd5e1'; this.ctx.stroke();
        this.ctx.lineWidth = 2; this.ctx.strokeStyle = '#22c55e'; this.ctx.stroke();
        this.ctx.beginPath(); this.ctx.moveTo(lx-15, ly); this.ctx.lineTo(lx+15, ly); this.ctx.moveTo(lx, ly-15); this.ctx.lineTo(lx, ly+15);
        this.ctx.lineWidth = 1; this.ctx.strokeStyle = 'red'; this.ctx.stroke();
        this.ctx.restore();
    },

    // --- INPUT ---
    getPointerPos: function(e) {
        const rect = this.canvas.getBoundingClientRect();
        return { 
            x: (e.clientX || e.clientX) - rect.left, 
            y: (e.clientY || e.clientY) - rect.top 
        };
    },

    onPointerDown: function(e) {
        if(this.isFrozen || this.gamePhase !== 'action') return;
        this.pointer = this.getPointerPos(e);
        
        // 1. Check Construction Leg
        if (this.gameMode === 'construct') {
            const len = 300;
            const legRad = (this.baseRotation - this.userConstructionAngle * Math.PI/180);
            const tipX = this.anglePos.x + Math.cos(legRad) * len;
            const tipY = this.anglePos.y + Math.sin(legRad) * len;
            const distTip = Math.sqrt(Math.pow(this.pointer.x - tipX, 2) + Math.pow(this.pointer.y - tipY, 2));
            if (distTip < 40) { this.isDraggingLeg = true; return; }
        }

        // 2. Check Protractor
        const dx = this.pointer.x - this.protractor.x;
        const dy = this.pointer.y - this.protractor.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const angleCurrent = Math.atan2(dy, dx);
        const angleLocal = angleCurrent - this.protractor.rotation;
        const localX = dist * Math.cos(angleLocal);
        const localY = dist * Math.sin(angleLocal);

        const distR = Math.sqrt(Math.pow(localX - (this.protractor.radius+35), 2) + Math.pow(localY, 2));
        const distL = Math.sqrt(Math.pow(localX - (-(this.protractor.radius+35)), 2) + Math.pow(localY, 2));

        if (distR < 30 || distL < 30) {
            this.protractor.isRotating = true;
            this.startRotationAngle = angleCurrent - this.protractor.rotation;
        } else if (dist <= this.protractor.radius) {
            this.protractor.isDragging = true;
            this.dragOffset.x = this.pointer.x - this.protractor.x;
            this.dragOffset.y = this.pointer.y - this.protractor.y;
            if(!this.isLoupeActive) this.canvas.style.cursor = 'grabbing';
        }
    },

    onPointerMove: function(e) {
        const pos = this.getPointerPos(e);
        if(!e.buttons && !e.touches) this.pointer = pos; // Just move
        else if(this.protractor.isDragging || this.protractor.isRotating || this.isLoupeActive || this.isDraggingLeg) {
             this.pointer = pos;
        }

        if(this.isFrozen) return;

        if (this.isDraggingLeg) {
            const dx = this.pointer.x - this.anglePos.x;
            const dy = this.pointer.y - this.anglePos.y;
            let mouseAngle = Math.atan2(dy, dx);
            let diff = this.baseRotation - mouseAngle;
            let deg = diff * 180 / Math.PI;
            while(deg < 0) deg += 360;
            while(deg > 360) deg -= 360;
            if (deg > 180) deg = 360 - deg;
            this.userConstructionAngle = deg;
            return;
        }

        if(this.protractor.isDragging) {
            let newX = this.pointer.x - this.dragOffset.x;
            let newY = this.pointer.y - this.dragOffset.y;
            // Snap to angle vertex
            const d = Math.sqrt(Math.pow(newX - this.anglePos.x, 2) + Math.pow(newY - this.anglePos.y, 2));
            if (d < 30) { newX = this.anglePos.x; newY = this.anglePos.y; }
            this.protractor.x = newX; this.protractor.y = newY;
        } else if(this.protractor.isRotating) {
            const dx = this.pointer.x - this.protractor.x;
            const dy = this.pointer.y - this.protractor.y;
            this.protractor.rotation = Math.atan2(dy, dx) - this.startRotationAngle;
        }
    },

    onPointerUp: function() {
        this.protractor.isDragging = false; 
        this.protractor.isRotating = false; 
        this.isDraggingLeg = false;
        if(!this.isLoupeActive) this.canvas.style.cursor = 'default';
    },

    spawnConfetti: function() {
        for(let i=0;i<80;i++) this.particles.push({x:this.canvas.width/2,y:this.canvas.height/2,vx:(Math.random()-0.5)*15,vy:(Math.random()-0.5)*15,color:`hsl(${Math.random()*360},100%,60%)`,life:60});
    },
    
    updateConfetti: function() {
        for(let i=0;i<this.particles.length;i++){
            let p=this.particles[i]; p.x+=p.vx; p.y+=p.vy; p.vy+=0.5; p.life--;
            this.ctx.fillStyle=p.color; this.ctx.fillRect(p.x,p.y,6,6);
        }
        this.particles=this.particles.filter(p=>p.life>0);
    }
};

if (window.GameSystem) window.GameSystem.register('angle-master', AngleMasterGame);