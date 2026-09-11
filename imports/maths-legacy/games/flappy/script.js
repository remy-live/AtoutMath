/**
 * games/flappy/script.js
 * Flappy Math : Version FINALE (Optimisée, Procédurale & Dégradés)
 */

const FlappyGame = {
    config: {
        gravity: 0.25,
        jump: -5.5,
        baseSpeed: 2.5,
        baseSpawnRate: 160,
        baseGap: 220
    },

    container: null,
    birdEl: null,
    hudEl: null,
    
    // Références décors
    bgCloudsContainer: null,
    bgHillsContainer: null,
    bgGround: null,
    
    // Physique
    bird: { y: 0, vy: 0, w: 40, h: 34, x: 50 },
    obstacles: [],
    clouds: [], 
    hills: [],
    bgPos: { ground: 0 },
    
    // État
    score: 0,
    currentQuestion: null,
    isRunning: false,
    spawnStep: 0,
    lastHillY: 0,
    
    // Variables dynamiques
    currentSpeed: 2.5,
    currentSpawnRate: 160,
    currentGap: 220,
    
    // --- 1. DÉMARRAGE ---
    start: function(container, options = {}) {
        this.stop();
        this.container = container;
        
        this.score = 0;
        this.isRunning = true;
        this.obstacles = [];
        this.clouds = [];
        this.hills = [];
        this.bird.y = 200; 
        this.bird.vy = 0;
        this.spawnStep = 0;
        this.bgPos = { ground: 0 };
        this.lastHillY = 100; // Hauteur initiale
        
        // Reset difficulté
        this.currentSpeed = this.config.baseSpeed;
        this.currentSpawnRate = this.config.baseSpawnRate;
        this.currentGap = this.config.baseGap;
        
        this.frameCount = this.currentSpawnRate - 20; 

        if(window.GameSystem) {
            window.GameSystem.toggleLives(false);
            window.GameSystem.updateScore(0);
            window.GameSystem.toggleTimer(false);
        }

        this.createWorld();
        this.initClouds();     
        this.initHills(); 
        this.generateQuestion();

        this.boundInput = this.flap.bind(this);
        document.addEventListener('keydown', (e) => { if(e.code === 'Space') this.flap(); });
        this.container.addEventListener('pointerdown', this.boundInput);

        requestAnimationFrame(() => this.gameLoop());
    },

    stop: function() {
        this.isRunning = false;
        if(this.container) this.container.innerHTML = '';
    },

    // --- 2. MONDE ---
    createWorld: function() {
        this.container.innerHTML = `
            <div class="flappy-container">
                <div class="flappy-bg-clouds" id="bg-clouds"></div>
                <div class="flappy-bg-hills" id="bg-hills"></div>
                <div class="flappy-ground" id="bg-ground"></div>

                <div class="flappy-hud" id="flappy-q">Prêt ?</div>
                <div class="flappy-bird" id="flappy-bird">
                    <div class="flappy-beak"></div>
                    <div class="flappy-wing"></div>
                </div>
            </div>
        `;
        this.birdEl = document.getElementById('flappy-bird');
        this.hudEl = document.getElementById('flappy-q');
        this.bgCloudsContainer = document.getElementById('bg-clouds');
        this.bgHillsContainer = document.getElementById('bg-hills');
        this.bgGround = document.getElementById('bg-ground');
    },

    // --- 3. MOTEUR ---
    gameLoop: function() {
        if(!this.isRunning) return;

        // Physique
        this.bird.vy += this.config.gravity;
        this.bird.y += this.bird.vy;
        const rot = Math.min(Math.max(this.bird.vy * 5, -25), 45);
        this.birdEl.style.transform = `translate(${this.bird.x}px, ${this.bird.y}px) rotate(${rot}deg)`;

        // Décor (Sol)
        this.bgPos.ground -= this.currentSpeed;
        this.bgGround.style.backgroundPositionX = this.bgPos.ground + 'px';

        this.manageClouds();
        this.manageHills();

        // Obstacles
        this.frameCount = (this.frameCount || 0) + 1;
        if(this.frameCount >= this.currentSpawnRate) {
            this.spawnSequence();
            this.frameCount = 0;
        }
        this.updateObstacles();

        // Limites
        const h = this.container.offsetHeight;
        if(this.bird.y < 0 || this.bird.y + this.bird.h > h - 20) {
            this.gameOver();
        }

        requestAnimationFrame(() => this.gameLoop());
    },

    flap: function() {
        if(!this.isRunning) return;
        this.bird.vy = this.config.jump;
    },

    increaseDifficulty: function() {
        if (this.score > 0 && this.score % 300 === 0) {
            this.currentSpeed = Math.min(6, this.currentSpeed + 0.5);
            this.currentSpawnRate = Math.max(90, this.currentSpawnRate - 10);
            this.currentGap = Math.max(160, this.currentGap - 15);
            
            this.hudEl.style.color = "#ffeb3b";
            setTimeout(() => this.hudEl.style.color = "white", 500);
        }
    },

    generateQuestion: function() {
        let min = 2, max = 5;
        if (this.score >= 300) { max = 9; }
        if (this.score >= 800) { min = 3; max = 12; }

        const a = Math.floor(Math.random() * (max - min + 1)) + min;
        const b = Math.floor(Math.random() * (max - min + 1)) + min;
        this.currentQuestion = { txt: `${a} × ${b}`, res: a * b };
        this.hudEl.innerText = this.currentQuestion.txt;
    },

    // --- NUAGES ---
    initClouds: function() {
        for(let i=0; i<5; i++) { this.spawnCloud(Math.random() * this.container.offsetWidth); }
    },
    spawnCloud: function(forceX = null) {
        const cloudEl = document.createElement('div');
        cloudEl.className = 'gen-cloud';
        
        const scale = 0.8 + Math.random() * 1.2;
        cloudEl.style.transform = `scale(${scale})`;
        cloudEl.style.top = (Math.random() * (this.container.offsetHeight * 0.6)) - 50 + 'px'; 
        
        let x = forceX !== null ? forceX : this.container.offsetWidth + 100;
        
        const puffCount = 2 + Math.floor(Math.random() * 3);
        const mainPuff = document.createElement('div');
        mainPuff.className = 'cloud-puff';
        mainPuff.style.width = '80px'; mainPuff.style.height = '50px';
        cloudEl.appendChild(mainPuff);

        for(let i=0; i<puffCount; i++) {
            const p = document.createElement('div');
            p.className = 'cloud-puff';
            const size = 40 + Math.random() * 30;
            p.style.width = size + 'px'; p.style.height = size + 'px';
            p.style.left = (Math.random() * 60 - 20) + 'px';
            p.style.top = (Math.random() * 30 - 15) + 'px';
            cloudEl.appendChild(p);
        }
        this.bgCloudsContainer.appendChild(cloudEl);
        
        this.clouds.push({
            el: cloudEl,
            x: x,
            speed: (this.currentSpeed * 0.1) + (Math.random() * 0.2) 
        });
    },
    manageClouds: function() {
        for(let i = this.clouds.length - 1; i >= 0; i--) {
            const c = this.clouds[i];
            c.x -= c.speed;
            c.el.style.left = c.x + 'px';
            if(c.x < -250) { c.el.remove(); this.clouds.splice(i, 1); }
        }
        if(this.clouds.length < 8 && Math.random() < 0.01) this.spawnCloud();
    },

    // --- COLLINES ---
    initHills: function() {
        let currentX = 0;
        while(currentX < this.container.offsetWidth) {
            const segmentWidth = 300 + Math.random() * 200;
            this.spawnHill(currentX, segmentWidth);
            currentX += segmentWidth;
        }
    },
    spawnHill: function(startX, width) {
        const height = this.container.offsetHeight * 0.6;
        const segment = document.createElement('div');
        segment.className = 'gen-hill';
        segment.style.width = width + 'px';
        segment.style.height = height + 'px';
        segment.style.left = startX + 'px';
        
        const startY = height - this.lastHillY;
        let pathData = `M 0 ${height} L 0 ${startY} `;
        
        // Courbe de Bézier
        const endHillY = Math.max(50, Math.min(250, this.lastHillY + (Math.random() - 0.5) * 100));
        const endY = height - endHillY;
        const controlX = width / 2;
        const maxH = Math.max(this.lastHillY, endHillY);
        const controlY = height - (maxH + 50 + Math.random() * 100); 
        
        pathData += `Q ${controlX} ${controlY} ${width} ${endY} `;
        pathData += `L ${width} ${height} Z`;

        this.lastHillY = endHillY;

        // Dégradé SVG
        const gradId = 'hill-grad-' + Math.random().toString(36).substr(2, 9);
        segment.innerHTML = `
            <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="${gradId}" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#81c784" stop-opacity="0.95" />
                        <stop offset="100%" stop-color="#2e7d32" stop-opacity="1" />
                    </linearGradient>
                </defs>
                <path d="${pathData}" fill="url(#${gradId})" />
            </svg>
        `;

        this.bgHillsContainer.appendChild(segment);
        this.hills.push({
            el: segment,
            x: startX,
            width: width,
            speed: this.currentSpeed * 0.2 
        });
    },
    manageHills: function() {
        let rightMostX = 0;
        for(let i = this.hills.length - 1; i >= 0; i--) {
            const h = this.hills[i];
            h.speed = this.currentSpeed * 0.2; 
            h.x -= h.speed;
            h.el.style.left = h.x + 'px';
            rightMostX = Math.max(rightMostX, h.x + h.width);
            if(h.x + h.width < -100) { h.el.remove(); this.hills.splice(i, 1); }
        }
        if (rightMostX < this.container.offsetWidth + 100) {
            this.spawnHill(rightMostX - 1, 300 + Math.random() * 200);
        }
    },

    // --- OBSTACLES ---
    spawnSequence: function() {
        if (this.spawnStep === 0) { this.spawnPipes(); this.spawnStep = 1; } 
        else { this.spawnTargets(); this.spawnStep = 0; }
    },
    spawnPipes: function() {
        const gapSize = this.currentGap; 
        const h = this.container.offsetHeight;
        const minMargin = 80;
        const availableHeight = h - gapSize - (minMargin*2);
        const gapCenter = Math.random() * availableHeight + (gapSize/2) + minMargin;
        const container = this.container.querySelector('.flappy-container');
        const topH = gapCenter - gapSize/2;
        const topPipe = document.createElement('div');
        topPipe.className = 'flappy-wall top';
        topPipe.style.height = topH + 'px';
        topPipe.style.left = '100%'; topPipe.style.top = '0';
        container.appendChild(topPipe);
        const botH = h - gapCenter - gapSize/2 - 20;
        const botPipe = document.createElement('div');
        botPipe.className = 'flappy-wall bottom';
        botPipe.style.height = botH + 'px';
        botPipe.style.left = '100%'; botPipe.style.bottom = '20px';
        container.appendChild(botPipe);
        this.obstacles.push({ type: 'wall', x: container.offsetWidth, topPipe: topPipe, botPipe: botPipe });
    },
    spawnTargets: function() {
        if(!this.currentQuestion) return;
        const isTopCorrect = Math.random() > 0.5;
        const correctVal = this.currentQuestion.res;
        const wrongVal = correctVal + (Math.random()>0.5?1:-1) * (Math.floor(Math.random()*5)+1);
        const container = this.container.querySelector('.flappy-container');
        const h = this.container.offsetHeight - 20; 
        const topY = h * 0.25; 
        const botY = h * 0.75;
        const topTarget = document.createElement('div');
        topTarget.className = 'flappy-target';
        topTarget.innerText = isTopCorrect ? correctVal : wrongVal;
        topTarget.style.left = container.offsetWidth + 'px';
        topTarget.style.top = (topY - 30) + 'px'; 
        container.appendChild(topTarget);
        const botTarget = document.createElement('div');
        botTarget.className = 'flappy-target';
        botTarget.innerText = isTopCorrect ? wrongVal : correctVal;
        botTarget.style.left = container.offsetWidth + 'px';
        botTarget.style.top = (botY - 30) + 'px';
        container.appendChild(botTarget);
        this.obstacles.push({ type: 'target', x: container.offsetWidth, topTarget: topTarget, botTarget: botTarget, correctIsTop: isTopCorrect, passed: false });
    },
    updateObstacles: function() {
        const bx = this.bird.x + 5; 
        const by = this.bird.y + 5;
        const bw = this.bird.w - 10;
        const bh = this.bird.h - 10;
        for(let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.x -= this.currentSpeed; 
            if (obs.type === 'wall') {
                obs.topPipe.style.left = obs.x + 'px';
                obs.botPipe.style.left = obs.x + 'px';
                const pipeW = 64;
                const topH = parseInt(obs.topPipe.style.height);
                const botH = parseInt(obs.botPipe.style.height);
                const groundY = this.container.offsetHeight - 20;
                if(this.rectIntersect(bx, by, bw, bh, obs.x, 0, pipeW, topH)) { this.gameOver(); return; }
                if(this.rectIntersect(bx, by, bw, bh, obs.x, groundY - botH, pipeW, botH)) { this.gameOver(); return; }
                if(obs.x < -100) { obs.topPipe.remove(); obs.botPipe.remove(); }
            } else if (obs.type === 'target') {
                obs.topTarget.style.left = obs.x + 'px';
                obs.botTarget.style.left = obs.x + 'px';
                const targetSize = 60;
                const topTargetY = parseInt(obs.topTarget.style.top);
                const botTargetY = parseInt(obs.botTarget.style.top);
                if(this.rectIntersect(bx, by, bw, bh, obs.x, topTargetY, targetSize, targetSize)) { this.resolveHit(obs, true); return; }
                if(this.rectIntersect(bx, by, bw, bh, obs.x, botTargetY, targetSize, targetSize)) { this.resolveHit(obs, false); return; }
                if(obs.x < -100) { obs.topTarget.remove(); obs.botTarget.remove(); }
            }
            if(obs.x < -100) { this.obstacles.splice(i, 1); }
        }
    },
    rectIntersect: function(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x2 < x1 + w1 && x2 + w2 > x1 && y2 < y1 + h1 && y2 + h2 > y1;
    },
    resolveHit: function(obs, hitTop) {
        if(obs.passed) return;
        const isCorrect = (hitTop && obs.correctIsTop) || (!hitTop && !obs.correctIsTop);
        if(isCorrect) {
            obs.passed = true;
            this.score += 100;
            if(window.GameSystem) window.GameSystem.updateScore(this.score);
            this.increaseDifficulty();
            const target = hitTop ? obs.topTarget : obs.botTarget;
            target.style.transform = "scale(1.5)"; target.style.opacity = "0"; target.style.transition = "all 0.2s";
            this.generateQuestion();
        } else {
            this.gameOver();
        }
    },
    gameOver: function() {
        this.isRunning = false;
        if(window.GameSystem) {
             window.GameSystem.showModal({
                 title: "PLOUF !", 
                 content: `Score Final : ${this.score}`, 
                 actions: [
                    { label: "Rejouer", onClick: () => this.start(this.container) },
                    { label: "Quitter", onClick: () => window.GameSystem.stopGame() }
                 ]
             });
        }
    }
};

if (window.GameSystem) window.GameSystem.register('flappy', FlappyGame);