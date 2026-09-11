/**
 * games/ninja/script.js
 * Math Ninja : Mode ZEN XXL (Grosses balles, Lent)
 */

const NinjaGame = {
    config: {
        gravity: 0.15,   // Gravité très faible (Effet ballon)
        spawnRate: 140,   // Apparition tranquille
    },

    container: null,
    canvas: null,
    ctx: null,
    
    objects: [], 
    mousePath: [], 
    currentNumber: 0,
    score: 0,
    lives: 3,
    isRunning: false,
    frameCount: 0,
    
    isMouseDown: false,
    lastMouse: { x: 0, y: 0 },

    // --- 1. DÉMARRAGE ---
    start: function(container, options = {}) {
        this.stop();
        this.container = container;
        
        this.objects = [];
        this.mousePath = [];
        this.score = 0;
        this.lives = 3;
        this.frameCount = 0;
        this.isRunning = true;

        if(window.GameSystem) {
            window.GameSystem.toggleLives(true);
            window.GameSystem.updateScore(0);
            window.GameSystem.toggleTimer(false);
            this.updateLivesUI();
        }

        this.createWorld();
        this.generateObjective();

        // Listeners
        this.boundMouseMove = this.handleMouseMove.bind(this);
        this.container.addEventListener('mousemove', this.boundMouseMove);
        
        this.container.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
        }, {passive: false});

        requestAnimationFrame(() => this.gameLoop());
    },

    stop: function() {
        this.isRunning = false;
        if(this.container) this.container.innerHTML = '';
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
            <div class="ninja-container">
                <div class="ninja-hud">
                    <div class="ninja-target" id="ninja-target">?</div>
                    <div class="ninja-info">Tranche les bons calculs !</div>
                </div>
                <canvas id="ninja-canvas"></canvas>
            </div>
        `;
        
        this.canvas = document.getElementById('ninja-canvas');
        this.ctx = this.canvas.getContext('2d');
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    },

    // --- 3. MOTEUR PHYSIQUE ---
    gameLoop: function() {
        if(!this.isRunning) return;
        this.frameCount++;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if(this.frameCount % this.config.spawnRate === 0) {
            this.throwObject();
        }

        this.updateObjects();
        this.drawTrail();

        requestAnimationFrame(() => this.gameLoop());
    },

    updateObjects: function() {
        const h = this.container.offsetHeight;
        const w = this.container.offsetWidth;

        for(let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];
            
            // Physique
            obj.x += obj.vx;
            obj.y += obj.vy;
            obj.vy += this.config.gravity;
            obj.rot += obj.vRot;
            
            obj.age++; 

            obj.el.style.transform = `translate(${obj.x}px, ${obj.y}px) rotate(${obj.rot}deg)`;

            // --- NETTOYAGE ---
            // On laisse plus de marge en bas (200px) car elles sont grosses
            const isOffScreen = 
                obj.y > h + 200 ||      
                obj.x < -200 ||         
                obj.x > w + 200 ||      
                obj.age > 800;

            if(isOffScreen) {
                // Si un BON fruit tombe sans être coupé
                if(obj.y > h && obj.type === 'good' && !obj.sliced && obj.age < 800) {
                    this.loseLife("Fruit raté !");
                }
                obj.el.remove();
                this.objects.splice(i, 1);
            }
        }
    },

    throwObject: function() {
        const w = this.container.offsetWidth;
        const h = this.container.offsetHeight;

        const isCorrect = Math.random() > 0.5;
        let txt, type;

        type = isCorrect ? 'good' : 'bad';
        if(isCorrect) {
            txt = this.makeEquation(this.currentNumber);
        } else {
            const fakeRes = this.currentNumber + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 5) + 1);
            txt = this.makeEquation(fakeRes);
        }

        const el = document.createElement('div');
        const colors = ['melon', 'orange', 'berry'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        el.className = `ninja-item ${color}`; 
        el.innerHTML = `<span>${txt}</span>`;
        
        this.container.querySelector('.ninja-container').appendChild(el);

        // Position de départ centrée un peu plus
        const startX = Math.random() * (w - 300) + 150; 
        
        this.objects.push({
            el: el,
            type: type,
            age: 0,
            x: startX,
            y: h,
            // Vitesse latérale très faible
            vx: (w/2 - startX) * 0.002 + (Math.random() - 0.5) * 0.5, 
            // Saut réduit (pour aller avec la faible gravité)
            vy: -(Math.random() * 3 + 11), 
            rot: 0,
            vRot: Math.random() * 0.6 - 0.3,
            sliced: false
        });
    },

    makeEquation: function(target) {
        const type = Math.random();
        if(type < 0.4) { 
            const a = Math.floor(Math.random() * target);
            return `${a} + ${target - a}`;
        } else if (type < 0.8) { 
            const a = target + Math.floor(Math.random() * 10) + 1;
            return `${a} - ${a - target}`;
        } else { 
             const div = this.getDivisors(target);
             if(div.length > 0) {
                 const d = div[Math.floor(Math.random() * div.length)];
                 return `${d} × ${target/d}`;
             }
             return `${target-1} + 1`;
        }
    },

    getDivisors: function(n) {
        let res = [];
        for(let i=2; i<=Math.sqrt(n); i++) {
            if(n%i===0) res.push(i);
        }
        return res;
    },

    generateObjective: function() {
        this.currentNumber = Math.floor(Math.random() * 15) + 5; 
        document.getElementById('ninja-target').innerText = this.currentNumber;
    },

    handleMouseMove: function(e) {
        const rect = this.container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.mousePath.push({ x, y, life: 8 }); 
        if(this.mousePath.length > 8) this.mousePath.shift(); 

        if(this.lastMouse.x !== 0) {
            this.checkSlice(this.lastMouse.x, this.lastMouse.y, x, y);
        }
        this.lastMouse = { x, y };
    },

    drawTrail: function() {
        if(this.mousePath.length < 2) return;
        
        this.ctx.beginPath();
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.lineWidth = 6;
        this.ctx.strokeStyle = '#fff';
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#00ffff';

        this.ctx.moveTo(this.mousePath[0].x, this.mousePath[0].y);
        for(let i=1; i<this.mousePath.length; i++) {
            this.ctx.lineTo(this.mousePath[i].x, this.mousePath[i].y);
        }
        this.ctx.stroke();
    },

    checkSlice: function(x1, y1, x2, y2) {
        const speed = Math.abs(x2-x1) + Math.abs(y2-y1);
        if(speed < 2) return; 

        for(let i=0; i<this.objects.length; i++) {
            const obj = this.objects[i];
            if(obj.sliced) continue;

            // Centre ajusté car la balle fait 120px (centre à 60px)
            const dx = obj.x + 60 - x2; 
            const dy = obj.y + 60 - y2;
            const dist = Math.sqrt(dx*dx + dy*dy);

            // Hitbox augmentée (70px de rayon)
            if(dist < 70) { 
                this.sliceObject(obj, i);
            }
        }
    },

    sliceObject: function(obj, index) {
        obj.sliced = true;
        
        this.createSliceDebris(obj, -1);
        this.createSliceDebris(obj, 1);
        
        obj.el.remove();
        this.objects.splice(index, 1);

        if(obj.type === 'bad') {
            this.score = Math.max(0, this.score - 50);
            if(window.GameSystem) window.GameSystem.updateScore(this.score);
            this.showFloatingText(obj.x, obj.y, "-50", "red");
        } else {
            this.score += 100;
            if(window.GameSystem) window.GameSystem.updateScore(this.score);
            this.showFloatingText(obj.x, obj.y, "+100", "gold");
            if(window.ParticleSystem) window.ParticleSystem.burst(obj.el, 20); // Plus de particules
            
            if(this.score % 500 === 0) {
                this.generateObjective();
                this.showFloatingText(this.container.offsetWidth/2, 200, "NOUVELLE CIBLE !", "#fff");
            }
        }
    },

    createSliceDebris: function(obj, dir) {
        const el = document.createElement('div');
        el.className = obj.el.className.replace('ninja-item', 'ninja-part');
        // Taille ajustée pour les moitiés (120 large, 60 haut)
        el.style.width = '120px'; el.style.height = '60px';
        el.style.borderRadius = dir === 1 ? '0 0 60px 60px' : '60px 60px 0 0';
        el.innerHTML = ''; 
        
        // Ajustement position Y pour coller les morceaux
        el.style.transform = `translate(${obj.x}px, ${obj.y + (dir===1?60:0)}px) rotate(${obj.rot}deg)`;
        
        this.container.querySelector('.ninja-container').appendChild(el);
        
        el.animate([
            { transform: `translate(${obj.x}px, ${obj.y}px) rotate(${obj.rot}deg)`, opacity: 1 },
            { transform: `translate(${obj.x + (dir*60)}px, ${obj.y + 120}px) rotate(${obj.rot + (dir*30)}deg)`, opacity: 0 }
        ], { duration: 600, fill: 'forwards' });
        
        setTimeout(() => el.remove(), 600);
    },

    showFloatingText: function(x, y, text, color) {
        const el = document.createElement('div');
        el.innerText = text;
        el.style.position = 'absolute';
        el.style.left = x + 'px'; el.style.top = y + 'px';
        el.style.color = color; el.style.fontWeight = 'bold'; el.style.fontSize = '2rem';
        el.style.pointerEvents = 'none'; el.style.textShadow = '2px 2px 0 #000';
        el.style.zIndex = 100;
        this.container.querySelector('.ninja-container').appendChild(el);
        el.animate([
            { transform: 'translateY(0) scale(1)', opacity: 1 },
            { transform: 'translateY(-50px) scale(1.5)', opacity: 0 }
        ], { duration: 800, fill: 'forwards' });
        setTimeout(() => el.remove(), 800);
    },

    loseLife: function(reason) {
        this.lives--;
        this.updateLivesUI();
        if(this.lives <= 0) {
            this.stop();
            if(window.GameSystem) {
                 window.GameSystem.showModal({
                     title: "GAME OVER", 
                     content: `${reason}<br>Score : ${this.score}`, 
                     actions: [{ label: "Rejouer", onClick: () => this.start(this.container) }, { label: "Quitter", onClick: () => window.GameSystem.stopGame() }]
                 });
            }
        }
    }
};

if (window.GameSystem) window.GameSystem.register('ninja', NinjaGame);