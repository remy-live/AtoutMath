/**
 * games/galactic/script.js
 * Galactic Gunner - Combo Edition
 * Adapté pour le framework MathBox
 */

const GalacticGame = {
    config: { startLevel: 1, lives: 3 },
    container: null,
    canvas: null,
    ctx: null,
    
    // État du jeu
    isRunning: false,
    score: 0,
    level: 1,
    lives: 3,
    shake: 0,
    currentInput: "",
    isAngleLocked: false,
    comboCount: 0,
    
    // Entités
    player: { x: 0, y: 0, angle: 90 },
    protractor: { r: 260 },
    enemy: { active: false, x:0, y:0, angle:0, charge:0, maxCharge:200, hp: 1, size: 20, color: '#ff3366', type:'normal', moving: false, speed: 0, dist: 0 },
    asteroids: [],
    playerLaser: { active: false, angle:0, w:0, alpha:0, startX:0, startY:0, endX:0, endY:0 },
    enemyLaser: { active: false, x:0, y:0, alpha:0 },
    particles: [],
    stars: [],

    // Références DOM internes
    ui: {},

    start: function(container, options = {}) {
        this.container = container;
        this.config = { ...this.config, ...options };
        
        // Init état
        this.score = 0;
        this.level = parseInt(this.config.startLevel) || 1;
        this.lives = parseInt(this.config.lives) || 3;
        this.isRunning = true;
        this.currentInput = "";
        this.asteroids = [];
        this.particles = [];
        this.comboCount = 0;
        
        // Création DOM + Canvas
        this.createWorld();
        
        // Init Stars
        this.stars = [];
        for(let i=0; i<150; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                s: Math.random() * 2,
                sp: Math.random() * 2 + 0.5
            });
        }
        
        // Démarrage
        this.updateUI();
        this.updateComboUI();
        this.updateLevelMsg();
        
        // Lancer le premier ennemi après un court délai
        setTimeout(() => this.spawnEnemy(), 1000);
        
        // Boucle
        requestAnimationFrame(() => this.loop());
    },

    stop: function() {
        this.isRunning = false;
        this.container.innerHTML = ''; // Nettoyage
    },

    // --- CONSTRUCTION DU MONDE ---
    createWorld: function() {
        // Injection CSS
        this.injectStyles();

        // Structure HTML
        this.container.innerHTML = `
            <div class="galactic-wrapper">
                <div class="top-ui">
                    <div class="ui-box"><div class="sub-text">SCORE</div><div class="big-text" id="g-score">0</div></div>
                    <div class="ui-box"><div class="sub-text">NIVEAU</div><div class="big-text" id="g-level">${this.level}</div></div>
                    <div class="ui-box"><div class="sub-text">VIES</div><div id="g-lives"></div></div>
                </div>

                <div id="g-combo-container" class="combo-container">
                    <div id="g-combo-text" class="combo-text">x2</div>
                    <div class="combo-label">COMBO</div>
                </div>

                <div id="g-center-msg" class="center-msg"></div>
                <div id="g-feedback" class="feedback"></div>

                <div id="g-control-deck" class="control-deck">
                    <div class="lcd-screen"><span id="g-input"></span>°</div>
                    <div class="keypad-grid">
                        <div class="keys-row">
                            <div class="key" data-k="1">1</div><div class="key" data-k="2">2</div><div class="key" data-k="3">3</div><div class="key" data-k="4">4</div><div class="key" data-k="5">5</div>
                        </div>
                        <div class="keys-row">
                            <div class="key" data-k="6">6</div><div class="key" data-k="7">7</div><div class="key" data-k="8">8</div><div class="key" data-k="9">9</div><div class="key" data-k="0">0</div>
                        </div>
                    </div>
                    <div class="actions-col">
                        <button class="btn-action btn-clear" id="btn-clr">CLR</button>
                        <button class="btn-action btn-fire" id="btn-fire">FEU</button>
                    </div>
                </div>
                
                <canvas id="g-canvas"></canvas>
            </div>
        `;

        // Références
        this.canvas = this.container.querySelector('#g-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Adaptation taille
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;

        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height - 220; // Un peu plus haut pour laisser place au clavier

        // UI Refs
        this.ui = {
            score: this.container.querySelector('#g-score'),
            level: this.container.querySelector('#g-level'),
            lives: this.container.querySelector('#g-lives'),
            input: this.container.querySelector('#g-input'),
            msg: this.container.querySelector('#g-center-msg'),
            feedback: this.container.querySelector('#g-feedback'),
            combo: this.container.querySelector('#g-combo-container'),
            comboText: this.container.querySelector('#g-combo-text')
        };

        // Listeners
        this.container.querySelectorAll('.key').forEach(k => {
            k.addEventListener('click', () => this.kp(k.dataset.k));
        });
        this.container.querySelector('#btn-clr').addEventListener('click', () => this.clearInput());
        this.container.querySelector('#btn-fire').addEventListener('click', () => this.fire());
        
        // Mouse Move pour viser
        this.canvas.addEventListener('mousemove', (e) => {
            if(!this.isRunning || this.isAngleLocked) return;
            const r = this.canvas.getBoundingClientRect();
            let dx = e.clientX - r.left - this.player.x;
            let dy = e.clientY - r.top - this.player.y;
            let deg = Math.atan2(-dy, dx) * (180/Math.PI);
            if(deg < 0) deg = 0; if(deg > 180) deg = 180;
            this.player.angle = deg;
        });

        // Click to Lock
        this.canvas.addEventListener('mousedown', () => {
             if(this.isRunning) this.isAngleLocked = !this.isAngleLocked;
        });
    },

    // --- LOGIQUE JEU ---
    kp: function(n) { if(this.currentInput.length < 3) this.currentInput += n; this.updateDisplay(); },
    clearInput: function() { this.currentInput = ""; this.updateDisplay(); },
    updateDisplay: function() { this.ui.input.innerText = this.currentInput; },

    updateUI: function() {
        this.ui.score.innerText = this.score;
        this.ui.level.innerText = this.level;
        this.ui.lives.innerText = "❤".repeat(this.lives);
        if(window.GameSystem) window.GameSystem.updateScore(this.score);
    },

    updateComboUI: function() {
        if(this.comboCount > 1) {
            this.ui.combo.style.opacity = 1;
            this.ui.comboText.innerText = "x" + this.comboCount;
            this.ui.comboText.style.transform = "scale(1.5)";
            setTimeout(() => this.ui.comboText.style.transform = "scale(1)", 100);
        } else {
            this.ui.combo.style.opacity = 0;
        }
    },

    updateLevelMsg: function() {
        let txt = "";
        if(this.level === 1) txt = "NIV 1 : ENTRAÎNEMENT (0°)";
        else if(this.level === 2) txt = "NIV 2 : TIMER ACTIVÉ (0°)";
        else if(this.level === 3) txt = "NIV 3 : INVERSION (180°)";
        else if(this.level === 4) txt = "NIV 4 : PRÉCISION (0°)";
        else if(this.level === 5) txt = "NIV 5 : INVERSÉ PRÉCIS (180°)";
        else if(this.level >= 6) txt = "NIV 6 : CIBLE MOUVANTE";
        this.ui.msg.innerText = txt;
    },

    spawnEnemy: function() {
        if(!this.isRunning) return;
        this.isAngleLocked = false; 
        this.updateUI();

        let isReverse = false, isPrecise = false, isMoving = false, step = 5;
        if(this.level === 1) { step = 10; isReverse = false; }
        else if(this.level === 2) { step = 5; isReverse = false; }
        else if(this.level === 3) { step = 5; isReverse = true; }
        else if(this.level === 4) { step = 1; isReverse = false; isPrecise = true; }
        else if(this.level === 5) { step = 1; isReverse = true; isPrecise = true; }
        else if(this.level >= 6) { step = 1; isReverse = (Math.random()>0.5); isPrecise = true; isMoving = true; }

        let minAngle = 10, range = 160;
        let visualAngle = Math.floor(Math.random() * (range/step) + (minAngle/step)) * step;
        
        this.enemy.angle = visualAngle; 
        this.enemy.isReverse = isReverse;
        this.enemy.moving = isMoving;
        this.enemy.speed = isMoving ? (Math.random() > 0.5 ? 0.2 : -0.2) * (1 + (this.level-6)*0.1) : 0;

        this.updateEnemyPosition();

        this.enemy.size = isPrecise ? 18 : 28;
        // Ici pour la rapidité
        this.enemy.maxCharge = (this.level === 1) ? Infinity : Math.max(150, 1200 - (this.level*50));
        this.enemy.charge = 0; 
        
        this.enemy.type = 'normal'; this.enemy.color = '#ff0055'; this.enemy.hp = 1;
        if(this.level >= 5 && Math.random() < 0.3) { this.enemy.type = 'armored'; this.enemy.hp = 2; this.enemy.color = '#ff8800'; }
        if(this.level >= 3 && Math.random() < 0.2) { this.enemy.type = 'jammer'; this.enemy.color = '#00ccff'; }

        this.enemy.active = true;
        if(this.level >= 4 && Math.random() < 0.4) this.spawnAsteroid();
    },

    updateEnemyPosition: function() {
        let realAngle = this.enemy.isReverse ? (180 - this.enemy.angle) : this.enemy.angle;
        let minDist = this.protractor.r + 100; 
        let maxDist = Math.min(this.canvas.width/2 - 50, this.canvas.height - 300); 
        if(maxDist < minDist) maxDist = minDist + 50;
        
        if(!this.enemy.active) { this.enemy.dist = minDist + Math.random() * (maxDist - minDist); }

        let rad = realAngle * (Math.PI/180); 
        this.enemy.x = this.player.x + Math.cos(-rad) * this.enemy.dist;
        this.enemy.y = this.player.y + Math.sin(-rad) * this.enemy.dist;
    },

    spawnAsteroid: function() {
        let startSide = Math.random() < 0.5 ? 'left' : 'right';
        let yPos = this.player.y - 300 - Math.random() * 150; 
        this.asteroids.push({
            x: startSide==='left' ? -50 : this.canvas.width+50, y: yPos,
            vx: startSide==='left' ? 1 + Math.random() : -1 - Math.random(),
            r: 15 + Math.random()*20, angle: Math.random() * Math.PI
        });
    },

    fire: function() {
        if(!this.isRunning || this.currentInput === "") return;
        const val = parseInt(this.currentInput);
        let firingAngle = this.enemy.isReverse ? (180 - val) : val;

        this.playerLaser.active = true; this.playerLaser.angle = firingAngle; this.playerLaser.w = 50; this.playerLaser.alpha = 1; this.shake = 10;
        let rad = -firingAngle * (Math.PI/180);
        this.playerLaser.startX = this.player.x; this.playerLaser.startY = this.player.y;
        this.playerLaser.endX = this.player.x + 2500*Math.cos(rad);
        this.playerLaser.endY = this.player.y + 2500*Math.sin(rad);

        setTimeout(() => {
            let hitAsteroid = false;
            for(let i=this.asteroids.length-1; i>=0; i--) {
                let a = this.asteroids[i];
                if(this.lineCircleCollide(this.player.x, this.player.y, this.playerLaser.endX, this.playerLaser.endY, a.x, a.y, a.r + 10)) {
                    this.createExplosion(a.x, a.y, '#888'); this.asteroids.splice(i, 1);
                    hitAsteroid = true; this.showText("BLOCAGE", "#aaa"); 
                    this.comboCount = 0; this.updateComboUI();
                    break;
                }
            }
            
            let tolerance = (this.level >= 4) ? 1.5 : 2.5;
            let currentRealAngle = this.enemy.isReverse ? (180 - this.enemy.angle) : this.enemy.angle;

            if(!hitAsteroid && this.enemy.active && Math.abs(firingAngle - currentRealAngle) <= tolerance) {
                this.enemy.hp--;
                this.createExplosion(this.enemy.x, this.enemy.y, this.enemy.color);
                if(this.enemy.hp <= 0) {
                    // COMBO BOOST
                    this.comboCount++;
                    this.updateComboUI();
                    
                    let basePoints = 100 * this.level;
                    let comboBonus = (this.comboCount > 1) ? basePoints * (this.comboCount * 0.5) : 0;
                    this.score += basePoints + comboBonus;

                    if(this.score > this.level * 500) { this.level++; this.updateLevelMsg(); }
                    
                    let txt = "BOOM !";
                    if(this.comboCount > 2) txt = "COMBO x" + this.comboCount + " !";
                    this.showText(txt, "#00ffaa");
                    
                    this.enemy.active = false; this.shake = 30; this.isAngleLocked = false; 
                    this.updateUI(); setTimeout(() => this.spawnEnemy(), 1000);
                } else { this.showText("TOUCHÉ", "#ffaa00"); this.shake = 15; }
            } else if(!hitAsteroid) { 
                this.showText("RATÉ", "#555"); 
                this.comboCount = 0; this.updateComboUI();
            }
            this.clearInput();
        }, 100);
    },

    lineCircleCollide: function(x1, y1, x2, y2, cx, cy, r) {
        let num = Math.abs((y2-y1)*cx - (x2-x1)*cy + x2*y1 - y2*x1);
        let den = Math.sqrt(Math.pow(y2-y1, 2) + Math.pow(x2-x1, 2)); return (num/den) < r;
    },

    enemyFires: function() {
        this.enemyLaser.active=true; this.enemyLaser.x=this.enemy.x; this.enemyLaser.y=this.enemy.y; this.enemyLaser.alpha=1;
        this.lives--; this.comboCount = 0; this.updateComboUI();
        this.updateUI(); this.shake=40;
        this.createExplosion(this.player.x, this.player.y-30, '#ff0055'); this.showText("DÉGÂTS !", "#ff0055");
        this.enemy.active = false; this.isAngleLocked = false; this.updateUI();
        if(this.lives<=0) { 
            this.endGame(); 
        } else {
            setTimeout(() => this.spawnEnemy(), 1500);
        }
    },

    endGame: function() {
        this.isRunning = false;
        if(window.GameSystem) window.GameSystem.stopGame();
    },

    // --- GAME LOOP & DESSIN ---
    loop: function() {
        if(!this.isRunning) return;

        // UPDATE
        if(this.enemy.active) {
            if(this.enemy.maxCharge !== Infinity) { this.enemy.charge++; if(this.enemy.charge >= this.enemy.maxCharge) this.enemyFires(); }
            if(this.enemy.moving) {
                this.enemy.angle += this.enemy.speed;
                if(this.enemy.angle <= 10 || this.enemy.angle >= 170) this.enemy.speed *= -1;
                this.updateEnemyPosition();
            }
        }
        for(let i=this.asteroids.length-1; i>=0; i--) {
            let a = this.asteroids[i]; a.x += a.vx; a.angle += 0.05; if(a.x < -100 || a.x > this.canvas.width+100) this.asteroids.splice(i, 1);
        }
        if(this.playerLaser.active) { this.playerLaser.w*=0.8; this.playerLaser.alpha-=0.05; if(this.playerLaser.alpha<=0) this.playerLaser.active=false; }
        if(this.enemyLaser.active) { this.enemyLaser.alpha-=0.05; if(this.enemyLaser.alpha<=0) this.enemyLaser.active=false; }
        for(let i=this.particles.length-1;i>=0;i--){let p=this.particles[i]; p.x+=p.vx; p.y+=p.vy; p.life-=0.03; if(p.life<=0)this.particles.splice(i,1);}

        // DRAW
        let dx=0,dy=0; if(this.shake>0){dx=(Math.random()-0.5)*this.shake;dy=(Math.random()-0.5)*this.shake;this.shake*=0.9;if(this.shake<1)this.shake=0;}
        this.ctx.save(); this.ctx.translate(dx,dy); this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
        
        this.ctx.fillStyle="white"; 
        for(let s of this.stars){
            s.y+=s.sp; if(s.y>this.canvas.height)s.y=0; 
            this.ctx.beginPath();this.ctx.arc(s.x,s.y,s.s,0,6.28);this.ctx.fill();
        }

        let grad = -this.player.angle*(Math.PI/180); // Utiliser l'angle fantôme (ici simplifié au joueur)
        let isReverseMode = (this.level === 3 || this.level === 5 || (this.level === 6 && this.enemy.isReverse));

        this.ctx.beginPath(); this.ctx.moveTo(this.player.x, this.player.y);
        if(isReverseMode) this.ctx.arc(this.player.x, this.player.y, this.protractor.r - 20, -Math.PI, grad, false);
        else this.ctx.arc(this.player.x, this.player.y, this.protractor.r - 20, 0, grad, true);
        
        this.ctx.lineTo(this.player.x, this.player.y);
        this.ctx.fillStyle = this.isAngleLocked ? "rgba(0, 255, 255, 0.4)" : "rgba(255, 170, 0, 0.3)"; 
        this.ctx.fill();

        this.ctx.beginPath(); this.ctx.moveTo(this.player.x, this.player.y);
        this.ctx.lineTo(this.player.x + 2500*Math.cos(grad), this.player.y + 2500*Math.sin(grad));
        this.ctx.strokeStyle = this.isAngleLocked ? "#00ffff" : "#ffaa00"; 
        this.ctx.lineWidth = 3; this.ctx.setLineDash([10, 5]); 
        this.ctx.shadowBlur = 10; this.ctx.shadowColor = this.ctx.strokeStyle; this.ctx.stroke(); this.ctx.setLineDash([]); this.ctx.shadowBlur = 0;

        for(let a of this.asteroids) this.drawAsteroid(a);
        if(this.enemy.active) this.drawEnemy();
        if(this.enemyLaser.active){this.ctx.beginPath();this.ctx.moveTo(this.enemyLaser.x,this.enemyLaser.y);this.ctx.lineTo(this.player.x,this.player.y);this.ctx.lineWidth=20;this.ctx.strokeStyle=`rgba(255,0,0,${this.enemyLaser.alpha})`;this.ctx.stroke();}
        if(this.playerLaser.active){this.ctx.beginPath();this.ctx.moveTo(this.playerLaser.startX,this.playerLaser.startY);this.ctx.lineTo(this.playerLaser.endX,this.playerLaser.endY);this.ctx.lineWidth=this.playerLaser.w;this.ctx.strokeStyle=`rgba(0,255,170,${this.playerLaser.alpha})`;this.ctx.shadowBlur=30;this.ctx.shadowColor="#00ffaa";this.ctx.stroke();this.ctx.shadowBlur=0;}

        this.drawProtractor(); this.drawPlayer();
        for(let p of this.particles){this.ctx.globalAlpha=p.life;this.ctx.fillStyle=p.col;this.ctx.beginPath();this.ctx.arc(p.x,p.y,p.sz,0,6.28);this.ctx.fill();}
        this.ctx.globalAlpha=1; this.ctx.restore(); 

        requestAnimationFrame(() => this.loop());
    },

    // --- DRAW HELPERS ---
    drawAsteroid: function(a) {
        this.ctx.save(); this.ctx.translate(a.x, a.y); this.ctx.rotate(a.angle);
        this.ctx.fillStyle = "#555"; this.ctx.strokeStyle = "#888"; this.ctx.lineWidth = 2;
        this.ctx.beginPath(); this.ctx.moveTo(a.r, 0);
        for(let i=1; i<8; i++) { let ang = (i/8)*Math.PI*2; let rVar = a.r * (0.8 + Math.random()*0.4); this.ctx.lineTo(Math.cos(ang)*rVar, Math.sin(ang)*rVar); }
        this.ctx.closePath(); this.ctx.fill(); this.ctx.stroke(); this.ctx.restore();
    },

    drawEnemy: function(){
        this.ctx.save(); this.ctx.translate(this.enemy.x,this.enemy.y);
        let angleToPlayer = Math.atan2(this.player.y - this.enemy.y, this.player.x - this.enemy.x);
        this.ctx.rotate(angleToPlayer - Math.PI/2); 
        
        let col = this.enemy.color;
        let sz = this.enemy.size;
        
        if(this.enemy.maxCharge !== Infinity) {
            let pct=this.enemy.charge/this.enemy.maxCharge;
            this.ctx.beginPath();this.ctx.arc(0,0,sz*1.8,-Math.PI/2,(-Math.PI/2)+(Math.PI*2*pct));this.ctx.strokeStyle=col;this.ctx.lineWidth=3;this.ctx.stroke();
        }

        this.ctx.fillStyle = "#111"; 
        if(this.enemy.type === 'normal') {
            this.ctx.beginPath(); this.ctx.moveTo(0, sz*1.5); this.ctx.lineTo(sz, -sz); this.ctx.lineTo(0, -sz*0.5); this.ctx.lineTo(-sz, -sz); this.ctx.closePath();
            this.ctx.fill(); this.ctx.fillStyle = col; this.ctx.fill(); this.ctx.strokeStyle = "#fff"; this.ctx.lineWidth = 2; this.ctx.stroke();
            this.ctx.fillStyle = "#fff"; this.ctx.beginPath(); this.ctx.arc(0,0,sz*0.3,0,Math.PI*2); this.ctx.fill();
        } else if(this.enemy.type === 'jammer') {
            this.ctx.beginPath(); this.ctx.moveTo(0, sz*1.5); this.ctx.lineTo(sz*0.8, sz*0.5); this.ctx.lineTo(sz, -sz); this.ctx.lineTo(sz*0.4, -sz*1.2); this.ctx.lineTo(-sz*0.4, -sz*1.2); this.ctx.lineTo(-sz, -sz); this.ctx.lineTo(-sz*0.8, sz*0.5); this.ctx.closePath();
            this.ctx.fill(); this.ctx.fillStyle = "#005577"; this.ctx.fill(); this.ctx.strokeStyle = "#00ffff"; this.ctx.lineWidth = 2; this.ctx.stroke();
            this.ctx.fillStyle = "#fff"; this.ctx.font=(sz)+"px Arial"; this.ctx.textAlign="center"; this.ctx.textBaseline="middle"; this.ctx.fillText("⚡", 0, 0);
        } else if(this.enemy.type === 'armored') {
            this.ctx.beginPath(); this.ctx.rect(-sz, -sz, sz*2, sz*2); this.ctx.fill(); this.ctx.fillStyle = "#aa4400"; this.ctx.fill(); this.ctx.strokeStyle = "#ffaa00"; this.ctx.lineWidth = 3; this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.arc(0,0,sz*0.6,0,Math.PI*2); this.ctx.fillStyle="#331100"; this.ctx.fill();
            this.ctx.beginPath(); this.ctx.moveTo(-sz*0.2, 0); this.ctx.lineTo(-sz*0.1, sz*1.5); this.ctx.lineTo(sz*0.1, sz*1.5); this.ctx.lineTo(sz*0.2, 0); this.ctx.fillStyle="#fff"; this.ctx.fill();
        }
        this.ctx.restore();
    },

    drawPlayer: function(){
        this.ctx.save();
        this.ctx.translate(this.player.x,this.player.y);
        this.ctx.rotate((-this.player.angle*(Math.PI/180))+Math.PI/2);
        this.ctx.fillStyle="#111";this.ctx.fillRect(-15,-40,30,50);
        this.ctx.strokeStyle="#fff";this.ctx.strokeRect(-15,-40,30,50);
        this.ctx.beginPath();this.ctx.arc(0,0,25,0,6.28);this.ctx.fillStyle="#333";this.ctx.fill();
        this.ctx.restore();
    },

    drawProtractor: function(){
        this.ctx.save(); this.ctx.translate(this.player.x,this.player.y);
        this.ctx.beginPath();this.ctx.arc(0,0,this.protractor.r,Math.PI,0);
        this.ctx.fillStyle="rgba(255, 255, 255, 0.05)"; this.ctx.fill();
        this.ctx.strokeStyle="rgba(255, 255, 255, 0.6)"; this.ctx.lineWidth=1; this.ctx.stroke();
        this.ctx.beginPath();this.ctx.moveTo(-this.protractor.r-20,0);this.ctx.lineTo(this.protractor.r+20,0);this.ctx.strokeStyle="white";this.ctx.lineWidth=2;this.ctx.stroke();
        
        this.ctx.font="bold 12px Arial"; this.ctx.fillStyle="#aaa";
        this.ctx.fillText("180°", -this.protractor.r+15, -10); this.ctx.fillText("0°", this.protractor.r-10, -10);

        this.ctx.textAlign="center";this.ctx.textBaseline="middle";this.ctx.font="bold 14px Arial";this.ctx.fillStyle="#ffffff"; 
        
        for(let i=0;i<=180;i++){
            if (this.level <= 2 && i % 10 !== 0) continue;
            if (this.level === 3 && i % 5 !== 0) continue;

            let r=-i*(Math.PI/180),c=Math.cos(r),s=Math.sin(r);
            let isTen = (i%10===0); let isFive = (i%5===0);
            let l = isTen ? 15 : (isFive ? 10 : 6);

            this.ctx.beginPath();this.ctx.moveTo((this.protractor.r-l)*c,(this.protractor.r-l)*s);this.ctx.lineTo(this.protractor.r*c,this.protractor.r*s);
            if (isTen) { this.ctx.strokeStyle = "rgba(255, 255, 255, 1.0)"; this.ctx.lineWidth = 2; } 
            else if (isFive) { this.ctx.strokeStyle = "rgba(255, 255, 255, 0.9)"; this.ctx.lineWidth = 1.5; } 
            else { this.ctx.strokeStyle = "rgba(255, 255, 255, 0.8)"; this.ctx.lineWidth = 1; }
            this.ctx.stroke();
            
            if(isTen) { this.ctx.fillText(i, (this.protractor.r-30)*c, (this.protractor.r-30)*s); }
        }
        this.ctx.restore();
    },

    // --- UTILITAIRES ---
    showText: function(txt,col){
        this.ui.feedback.innerText=txt;
        this.ui.feedback.style.color=col;
        this.ui.feedback.style.opacity=1;
        this.ui.feedback.style.transform="scale(1.2)";
        setTimeout(()=>{this.ui.feedback.style.opacity=0;this.ui.feedback.style.transform="scale(1)"},1200);
    },
    createExplosion: function(x,y,col){
        for(let i=0;i<40;i++){
            let a=Math.random()*6.28,s=Math.random()*15;
            this.particles.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,col:col,sz:Math.random()*6+3});
        }
    },

    injectStyles: function() {
        if(document.getElementById('galactic-style')) return;
        const css = `
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
            .galactic-wrapper { position: relative; width: 100%; height: 100%; background: #02020c; overflow: hidden; font-family: 'Orbitron', sans-serif; user-select: none; }
            #g-canvas { display: block; width: 100%; height: 100%; }
            
            .top-ui { position: absolute; top: 15px; width: 100%; display: flex; justify-content: space-between; padding: 0 30px; box-sizing: border-box; pointer-events: none; z-index: 20; }
            .ui-box { text-align: center; text-shadow: 0 0 10px rgba(255, 255, 255, 0.3); }
            .big-text { font-size: 1.8rem; font-weight: 900; color: #fff; }
            .sub-text { font-size: 0.8rem; color: #aaa; letter-spacing: 1px; }
            #g-lives { font-size: 1.8rem; color: #ff0055; letter-spacing: 2px; }

            .combo-container { position: absolute; top: 80px; left: 30px; z-index: 20; display: flex; flex-direction: column; align-items: center; opacity: 0; transition: opacity 0.3s; }
            .combo-text { font-size: 2.5rem; font-weight: 900; color: #ffaa00; text-shadow: 0 0 15px #ffaa00; font-style: italic; transition: transform 0.1s; }
            .combo-label { font-size: 0.8rem; color: #fff; letter-spacing: 2px; }

            .center-msg { position: absolute; top: 120px; width: 100%; text-align: center; font-size: 1.2rem; color: #00ffaa; pointer-events: none; opacity: 0.8; text-shadow: 0 0 5px #00ffaa;}
            .feedback { position: absolute; top: 40%; width: 100%; text-align: center; font-size: 3rem; font-weight: 900; text-shadow: 0 0 20px currentColor; opacity: 0; pointer-events: none; transition: 0.3s; z-index: 60; }

            .control-deck { position: absolute; bottom: 0; left: 0; width: 100%; height: 140px; background: rgba(10, 10, 10, 0.98); border-top: 2px solid #333; display: flex; align-items: center; justify-content: center; gap: 20px; z-index: 100; }
            .lcd-screen { background: #000; border: 2px solid #444; border-radius: 6px; width: 100px; height: 60px; display: flex; justify-content: center; align-items: center; font-size: 2rem; color: #00ffaa; font-family: monospace; box-shadow: inset 0 0 10px rgba(0, 255, 170, 0.2); text-shadow: 0 0 5px #00ffaa; }
            .keypad-grid { display: flex; flex-direction: column; gap: 8px; }
            .keys-row { display: flex; gap: 8px; }
            .key { width: 50px; height: 50px; background: linear-gradient(to bottom, #222, #111); border: 1px solid #555; border-radius: 6px; color: #fff; font-size: 1.5rem; font-weight: bold; display: flex; justify-content: center; align-items: center; cursor: pointer; box-shadow: 0 4px 0 #000; transition: transform 0.05s; }
            .key:active { transform: translateY(4px); box-shadow: none; }
            .actions-col { display: flex; flex-direction: column; gap: 8px; }
            .btn-action { height: 50px; border-radius: 6px; font-family: 'Orbitron', sans-serif; font-weight: 900; cursor: pointer; border: none; box-shadow: 0 4px 0 rgba(0,0,0,0.5); font-size: 1.2rem; }
            .btn-action:active { transform: translateY(4px); box-shadow: none; }
            .btn-clear { width: 80px; background: #333; color: #aaa; border: 1px solid #555; }
            .btn-fire { width: 80px; background: linear-gradient(to bottom, #ff0055, #990033); color: white; border: 1px solid #ff3377; }
        `;
        const s = document.createElement('style');
        s.id = 'galactic-style';
        s.innerHTML = css;
        document.head.appendChild(s);
    }
};

if(window.GameSystem) window.GameSystem.register('galactic', GalacticGame);