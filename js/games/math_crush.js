import { BaseGame } from '../core/BaseGame.js';
import { createDemoGate, dureeDemo } from '../core/demoPointer.js';
import { state } from '../core/state.js';
import { regTimeout } from '../core/timers.js';

export class MathCrush extends BaseGame {
    constructor(container, isDemo, params, gameId) {
        super(container, isDemo, params, gameId);

        this.cols = 6;
        this.rows = 7;
        this.mode = params?.mode || 'addition';
        this.difficulty = params?.difficulty || 'progressive';
        this.successCount = 0;
        this.hintPath = null;
        this.currentTargetPath = [];
        this.grid = []; 
        
        this.currentPath = [];
        this.targetValue = 0;
        this.isDragging = false;
        
        this.particles = [];
        this.scoreTexts = [];
        
        this.timeLeft = 60;
        this.lastTime = Date.now();
        this.score = 0;
        
        this.blockColors = [
            { bg: '#f43f5e', shadow: '#e11d48', text: '#fff' },
            { bg: '#8b5cf6', shadow: '#7c3aed', text: '#fff' },
            { bg: '#3b82f6', shadow: '#2563eb', text: '#fff' },
            { bg: '#10b981', shadow: '#059669', text: '#fff' },
            { bg: '#f59e0b', shadow: '#d97706', text: '#fff' },
            { bg: '#0ea5e9', shadow: '#0284c7', text: '#fff' }
        ];
        
        this.initGrid();
        this.generateTarget();
    }
    
    render() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.container.clientWidth || 800;
        this.canvas.height = this.container.clientHeight || 600;
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.display = 'block';
        this.ctx = this.canvas.getContext('2d');
        this.container.style.position = 'relative';
        // Un glisser sur le plateau est un geste de jeu, jamais une sélection :
        // sans cela, chaque tracé surlignait la page autour du canevas.
        ['userSelect', 'webkitUserSelect', 'webkitTouchCallout'].forEach(p => {
            this.container.style[p] = 'none';
            this.canvas.style[p] = 'none';
        });
        this.container.appendChild(this.canvas);
        
        this.helpBtn = document.createElement('button');
        this.helpBtn.innerHTML = '💡 Indice (-20)';
        this.helpBtn.style.position = 'absolute';
        this.helpBtn.style.top = '20px';
        this.helpBtn.style.right = '20px';
        this.helpBtn.style.zIndex = '10';
        this.helpBtn.style.padding = '8px 12px';
        this.helpBtn.style.borderRadius = '20px';
        this.helpBtn.style.background = '#f59e0b';
        this.helpBtn.style.color = 'white';
        this.helpBtn.style.border = 'none';
        this.helpBtn.style.fontWeight = 'bold';
        this.helpBtn.style.cursor = 'pointer';
        this.helpBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        
        // `pointerup` plutôt que `click` : le gestionnaire global de fin de
        // tracé (`touchend` sur window) neutralisait le clic synthétisé, et le
        // bouton restait muet sur téléphone et tablette.
        const useHint = (e) => {
            e.stopPropagation();
            if (this.score >= 20 && !this.hintPath && !this.isDemo) {
                this.score -= 20;
                // Eclaire seulement LA PREMIERE case de la solution
                if (this.currentTargetPath && this.currentTargetPath.length > 0) {
                    this.hintPath = [this.currentTargetPath[0]];
                }
            }
        };
        this.helpBtn.addEventListener('pointerup', useHint);
        this.container.appendChild(this.helpBtn);
        
        const onResize = () => {
            if (this.canvas && this.container) {
                this.canvas.width = this.container.clientWidth || 800;
                this.canvas.height = this.container.clientHeight || 600;
            }
        };
        window.addEventListener('resize', onResize);
        
        this.bindEvents();
        
        this.cleanupEventsResize = () => {
            window.removeEventListener('resize', onResize);
        };
    }
    
    startGameLoop() {
        this.running = true;
        this.lastTime = Date.now();
        this.loop();
    }
    
    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
        this.running = false;
        if (this.rafId) cancelAnimationFrame(this.rafId);
        if (this.cleanupEvents) this.cleanupEvents();
        if (this.cleanupEventsResize) this.cleanupEventsResize();
    }

    getRandomValue() {
        if (this.mode === 'multiplication') {
            let maxVal = 10;
            if (this.difficulty === 'progressive') {
                if (this.successCount < 2) maxVal = 5;
                else if (this.successCount < 5) maxVal = 7;
                else maxVal = 10;
            }
            const vals = [];
            for (let i = 2; i <= maxVal; i++) vals.push(i);
            return vals[Math.floor(Math.random() * vals.length)];
        } else {
            let maxVal = 9;
            if (this.difficulty === 'progressive') {
                if (this.successCount < 3) maxVal = 5;
                else if (this.successCount < 6) maxVal = 7;
            }
            return Math.floor(Math.random() * maxVal) + 1;
        }
    }

    getRandomColor() {
        return this.blockColors[Math.floor(Math.random() * this.blockColors.length)];
    }

    initGrid() {
        this.grid = [];
        for (let c = 0; c < this.cols; c++) {
            let col = [];
            for (let r = 0; r < this.rows; r++) {
                col.push({
                    val: this.getRandomValue(),
                    color: this.getRandomColor(),
                    x: 0, // will be computed in draw
                    y: -1000, // start high above to fall down initially
                    targetY: 0,
                    vy: 0,
                    id: Math.random().toString(36).substr(2, 9)
                });
            }
            this.grid.push(col);
        }
    }

    generateTarget() {
        this.hintPath = null;
        let minLen = 2;
        let maxLen = 5;
        if (this.difficulty === 'progressive') {
            if (this.successCount < 2) { minLen = 2; maxLen = 2; }
            else if (this.successCount < 5) { minLen = 2; maxLen = 3; }
            else if (this.successCount < 10) { minLen = 3; maxLen = 4; }
        }
        const pathLen = Math.floor(Math.random() * (maxLen - minLen + 1)) + minLen; 
        let c = Math.floor(Math.random() * this.cols);
        let r = Math.floor(Math.random() * this.rows);
        
        let sum = this.mode === 'addition' ? 0 : 1;
        let path = [{c, r}];
        
        if (this.mode === 'addition') {
            sum += this.grid[c][r].val;
        } else {
            sum *= this.grid[c][r].val;
        }

        // Try to walk randomly
        for(let i=1; i<pathLen; i++) {
            const neighbors = [];
            for(let dc = -1; dc <= 1; dc++) {
                for(let dr = -1; dr <= 1; dr++) {
                    // Only horizontal and vertical adjacent
                    if (Math.abs(dc) + Math.abs(dr) !== 1) continue;
                    
                    let nc = c + dc;
                    let nr = r + dr;
                    if (nc >= 0 && nc < this.cols && nr >= 0 && nr < this.rows) {
                        // Check if not already in path
                        if (!path.some(p => p.c === nc && p.r === nr)) {
                            neighbors.push({c: nc, r: nr});
                        }
                    }
                }
            }
            if (neighbors.length === 0) break;
            const next = neighbors[Math.floor(Math.random() * neighbors.length)];
            c = next.c; r = next.r;
            path.push({c, r});
            if (this.mode === 'addition') {
                sum += this.grid[c][r].val;
            } else {
                sum *= this.grid[c][r].val;
            }
        }
        
        this.targetValue = sum;
        this.currentTargetPath = path;
    }

    bindEvents() {
        this.canvas.style.touchAction = 'none';
        
        const handleStart = (e) => {
            if (this.isDemo || this.timeLeft <= 0) return;
            e.preventDefault();
            this.isDragging = true;
            this.currentPath = [];
            handleMove(e);
        };

        const handleMove = (e) => {
            if (!this.isDragging || this.isDemo || this.timeLeft <= 0) return;
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            let clientX, clientY;
            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            // Conversion en coordonnées INTERNES du canevas. Sa résolution est
            // prise sur `clientWidth` du plateau (padding compris) alors que sa
            // taille affichée (100 %) l'exclut : sans cette mise à l'échelle,
            // le doigt sélectionnait la case voisine sur téléphone.
            const px = (clientX - rect.left) * (this.canvas.width / rect.width);
            const py = (clientY - rect.top) * (this.canvas.height / rect.height);

            // Find block under cursor
            const coords = this.getGridCoords(px, py);
            const c = coords.c;
            const r = coords.r;
            if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
                // If path is empty, just add
                if (this.currentPath.length === 0) {
                    this.currentPath.push({c, r});
                } else {
                    const last = this.currentPath[this.currentPath.length - 1];
                    // Check if adjacent (including diagonal)
                    const dc = Math.abs(c - last.c);
                    // Only horizontal and vertical adjacent
                    if (Math.abs(last.c - c) + Math.abs(last.r - r) === 1) {
                        // Check if already in path
                        const idx = this.currentPath.findIndex(p => p.c === c && p.r === r);
                        if (idx === -1) {
                            this.currentPath.push({c, r});
                        } else if (idx === this.currentPath.length - 2) {
                            // Backtracking
                            this.currentPath.pop();
                        }
                    }
                }
            }
        };

        const handleEnd = (e) => {
            if (this.isDemo) return;
            // Ce gestionnaire écoute la fenêtre ENTIÈRE : ne neutraliser
            // l'événement que si un tracé était en cours. Un `preventDefault()`
            // systématique supprimait le clic synthétisé après chaque appui —
            // le bouton Indice et la croix de fermeture ne répondaient plus
            // au doigt.
            if (!this.isDragging) return;
            if (e.cancelable) e.preventDefault();
            this.isDragging = false;
            this.evaluatePath();
        };

        this.canvas.addEventListener('mousedown', handleStart);
        this.canvas.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);
        this.canvas.addEventListener('touchstart', handleStart, {passive: false});
        this.canvas.addEventListener('touchmove', handleMove, {passive: false});
        window.addEventListener('touchend', handleEnd);

        this.cleanupEvents = () => {
            this.canvas.removeEventListener('mousedown', handleStart);
            this.canvas.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            this.canvas.removeEventListener('touchstart', handleStart);
            this.canvas.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }

    getCurrentSum() {
        if (this.currentPath.length === 0) return 0;
        let sum = this.mode === 'addition' ? 0 : 1;
        this.currentPath.forEach(p => {
            const block = this.grid[p.c][p.r];
            if (block) {
                if (this.mode === 'addition') sum += block.val;
                else sum *= block.val;
            }
        });
        return sum;
    }

    evaluatePath() {
        if (this.currentPath.length === 0) return;
        const sum = this.getCurrentSum();
        
        if (sum === this.targetValue) {
            // Success !
            this.successCount++;
            const pts = this.currentPath.length * 10 * (this.mode === 'addition' ? 1 : 2);
            this.score += pts;
            this.timeLeft = Math.min(60, this.timeLeft + this.currentPath.length); // Add time
            
            // Spawn particles and remove blocks
            this.currentPath.forEach((p, idx) => {
                const block = this.grid[p.c][p.r];
                if (block) {
                    this.spawnParticles(block.x + this.blockSize/2, block.y + this.blockSize/2, block.color.bg);
                    if (idx === Math.floor(this.currentPath.length/2)) {
                        this.spawnScoreText(block.x + this.blockSize/2, block.y, `+${pts}`);
                    }
                    // Mark for deletion
                    block.delete = true;
                }
            });

            // Rebuild columns
            for (let c = 0; c < this.cols; c++) {
                // Filter out deleted
                this.grid[c] = this.grid[c].filter(b => !b.delete);
                // Add new blocks at the top (which is end of array)
                const needed = this.rows - this.grid[c].length;
                for (let i = 0; i < needed; i++) {
                    this.grid[c].push({
                        val: this.getRandomValue(),
                        color: this.getRandomColor(),
                        x: 0,
                        y: -(this.blockSize * (i + 1) + 200), // Spawn above
                        targetY: 0,
                        vy: 0,
                        id: Math.random().toString(36).substr(2, 9)
                    });
                }
            }
            
            if (!this.isDemo) {
                // Une seule remontée : `onCorrectAnswer` produit la tentative,
                // qui alimente à la fois le score, les statistiques et le
                // moteur de parcours. L'ancien code cumulait trois appels et
                // comptait donc la même réponse plusieurs fois.
                this.onCorrectAnswer(null, null, {
                    points: pts,
                    questionText: `Faire ${this.targetValue}`,
                    given: sum,
                    expected: this.targetValue
                });
            }
            this.generateTarget();
        } else {
            // Failed
            if (!this.isDemo) {
                this.timeLeft = Math.max(0, this.timeLeft - 2); // Pénalité de temps
                // Le message par défaut donnait « Faux ! Cible 7 = 7 » : il
                // répétait la cible deux fois et taisait le seul nombre qui
                // manquait — CE QUE LA CHAÎNE FAISAIT. On lisait donc une
                // contradiction là où il n'y avait qu'un écart.
                this.onWrongAnswer(null, {
                    questionText: `Faire ${this.targetValue}`,
                    input: sum,
                    expected: this.targetValue,
                    customMessage: `Ta chaîne ${this.mode === 'addition' ? 'fait' : 'donne'} ${sum} — il fallait ${this.targetValue}.`
                });
            }
        }
        
        this.currentPath = [];
    }

    spawnParticles(x, y, color) {
        for(let i=0; i<15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                color: color
            });
        }
    }

    spawnScoreText(x, y, text) {
        this.scoreTexts.push({ x, y, text, life: 1 });
    }

    getGridCoords(px, py) {
        if (!this.blockSize) return {c: -1, r: -1};
        const c = Math.floor((px - this.offsetX) / this.blockSize);
        // y is inverted in our array (r=0 is bottom)
        const gridY = py - this.offsetY;
        const rTopDown = Math.floor(gridY / this.blockSize);
        const r = (this.rows - 1) - rTopDown;
        return {c, r};
    }

    updatePhysics() {
        // Blocks gravity
        for (let c = 0; c < this.cols; c++) {
            for (let r = 0; r < this.rows; r++) {
                const block = this.grid[c][r];
                // r=0 is bottom. TopDown index is (this.rows - 1 - r)
                const targetY = this.offsetY + (this.rows - 1 - r) * this.blockSize;
                block.targetY = targetY;
                block.x = this.offsetX + c * this.blockSize;
                
                if (block.y < targetY) {
                    block.vy += 2.5; // Gravity
                    block.y += block.vy;
                    if (block.y >= targetY) {
                        block.y = targetY; 
                        block.vy *= -0.3; // Bounce
                        if (Math.abs(block.vy) < 2) block.vy = 0;
                    }
                } else if (block.y > targetY) {
                    block.y = targetY;
                    block.vy = 0;
                }
            }
        }

        // Particles
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.03;
        });
        this.particles = this.particles.filter(p => p.life > 0);

        // Score Texts
        this.scoreTexts.forEach(st => {
            st.y -= 2;
            st.life -= 0.02;
        });
        this.scoreTexts = this.scoreTexts.filter(st => st.life > 0);
    }

    draw() {
        if(!this.ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.ctx.clearRect(0, 0, w, h);

        // Compute layout
        const maxBlockW = w / this.cols;
        // Leave space at top for HUD (Target & Time) and margin at bottom
        const hudH = 100;
        const bottomMargin = 40;
        const maxBlockH = (h - hudH - bottomMargin) / this.rows;
        this.blockSize = Math.floor(Math.min(maxBlockW, maxBlockH));
        if (this.blockSize < 20) this.blockSize = 20;
        
        this.offsetX = (w - (this.blockSize * this.cols)) / 2;
        this.offsetY = hudH + (h - hudH - bottomMargin - (this.blockSize * this.rows)) / 2;

        this.updatePhysics();
        
        if (this.helpBtn) {
            if (this.score < 20 || this.hintPath || this.isDemo) {
                this.helpBtn.style.opacity = '0.5';
                this.helpBtn.style.cursor = 'not-allowed';
            } else {
                this.helpBtn.style.opacity = '1';
                this.helpBtn.style.cursor = 'pointer';
            }
        }

        // Get actual CSS color
        const rootStyle = getComputedStyle(document.documentElement);
        const textColorMain = rootStyle.getPropertyValue('--text-main').trim() || '#333';
        const textColorMuted = rootStyle.getPropertyValue('--text-muted').trim() || '#666';

        // Draw HUD
        this.ctx.fillStyle = textColorMain;
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Cible : ${this.targetValue}`, w/2, 40);
        
        const sum = this.getCurrentSum();
        this.ctx.font = 'bold 20px Arial';
        const isOver = (this.mode === 'addition' && sum > this.targetValue) || (this.mode === 'multiplication' && sum > this.targetValue);
        this.ctx.fillStyle = isOver ? '#ef4444' : '#3b82f6';
        if (this.currentPath.length > 0) {
            const op = this.mode === 'addition' ? 'Somme' : 'Produit';
            this.ctx.fillText(`${op} : ${sum}`, w/2, 75);
        } else {
            this.ctx.fillStyle = textColorMuted;
            this.ctx.fillText(`Score: ${this.score}  |  Temps: ${Math.ceil(this.timeLeft)}s`, w/2, 75);
        }

        // Draw Blocks
        for (let c = 0; c < this.cols; c++) {
            for (let r = 0; r < this.rows; r++) {
                const block = this.grid[c][r];
                const isSelected = this.currentPath.some(p => p.c === c && p.r === r);
                const isLast = this.currentPath.length > 0 && this.currentPath[this.currentPath.length-1].c === c && this.currentPath[this.currentPath.length-1].r === r;
                
                const margin = 4;
                const bs = this.blockSize - margin * 2;
                const bx = block.x + margin;
                const by = block.y + margin;
                const shadowDepth = 4;
                
                // Draw shadow
                this.ctx.fillStyle = isSelected ? block.color.bg : block.color.shadow;
                this.ctx.beginPath();
                this.ctx.roundRect(bx, by + shadowDepth, bs, bs, 8);
                this.ctx.fill();

                // Draw main block
                this.ctx.fillStyle = block.color.bg;
                this.ctx.beginPath();
                this.ctx.roundRect(bx, isSelected ? by + shadowDepth : by, bs, bs, 8);
                this.ctx.fill();
                
                // Outline if selected or hint
                if (isSelected) {
                    this.ctx.strokeStyle = isOver ? '#ef4444' : '#fff';
                    this.ctx.lineWidth = 4;
                    this.ctx.stroke();
                } else if (this.hintPath && this.hintPath.some(p => p.c === c && p.r === r)) {
                    this.ctx.strokeStyle = '#f59e0b';
                    this.ctx.lineWidth = 4;
                    this.ctx.stroke();
                }
                
                // Number
                this.ctx.fillStyle = block.color.text;
                this.ctx.font = `bold ${Math.floor(bs/2.2)}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(block.val, bx + bs/2, (isSelected ? by + shadowDepth : by) + bs/2);
            }
        }

        // Draw connecting line
        if (this.currentPath.length > 1) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = isOver ? '#ef4444' : '#fff';
            this.ctx.lineWidth = 8;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            
            this.currentPath.forEach((p, idx) => {
                const block = this.grid[p.c][p.r];
                const cx = block.x + this.blockSize/2;
                const cy = block.y + this.blockSize/2 + 4; // Shifted down for active state
                if (idx === 0) this.ctx.moveTo(cx, cy);
                else this.ctx.lineTo(cx, cy);
            });
            this.ctx.stroke();
        }

        // Draw Particles
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 6, 0, Math.PI*2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;

        // Draw Score Texts
        this.scoreTexts.forEach(st => {
            this.ctx.fillStyle = '#10b981';
            this.ctx.globalAlpha = st.life;
            this.ctx.font = 'bold 24px Arial';
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 3;
            this.ctx.strokeText(st.text, st.x, st.y);
            this.ctx.fillText(st.text, st.x, st.y);
        });
        this.ctx.globalAlpha = 1;

        // Draw Game Over overlay
        if (this.timeLeft <= 0 && !this.isDemo) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(0,0,w,h);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 40px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("Temps Écoulé !", w/2, h/2 - 20);
            this.ctx.font = 'bold 24px Arial';
            this.ctx.fillText(`Score Final : ${this.score}`, w/2, h/2 + 30);
        }
    }

    loop() {
        if (!this.running) return;
        
        // Timer logic
        if (!this.isDemo && this.timeLeft > 0) {
            const now = Date.now();
            const dt = (now - this.lastTime) / 1000;
            this.timeLeft -= dt;
            this.lastTime = now;
            if (this.timeLeft <= 0) {
                this.timeLeft = 0;
            }
        } else {
            this.lastTime = Date.now();
        }

        this.draw();
        
        if (this.timeLeft > 0 || this.isDemo) {
            this.rafId = requestAnimationFrame(() => this.loop());
        }
    }

    runDemoSequence() {
        this.startGameLoop();
        this.isDemo = true;
        // Pause et vitesse pour la démonstration, comme dans les autres jeux.
        this.demoGate = createDemoGate(this.container);
        let demoPhase = 0;
        let pIndex = 0;
        let targetPath = [];

        // Le robot trace le CHEMIN SOLUTION généré avec la cible
        // (`currentTargetPath`) — celui que l'indice éclaire. L'ancien code
        // cherchait une PAIRE de cases sommant à la cible : dès que la
        // difficulté passait aux chemins de 3-4 cases, aucune paire ne
        // convenait plus et le robot re-tirait des cibles en boucle sans
        // jamais jouer.
        //
        // `regTimeout` et non `setTimeout` : la chaîne doit s'arrêter avec
        // `clearEngines()` quand on ferme ou relance l'aperçu.
        const nextAction = () => {
            if (!this.running || !this.isDemo) return;
            // En pause, le robot patiente sans rien jouer.
            if (this.demoGate.paused) { regTimeout(nextAction, 220); return; }

            if (demoPhase === 0) {
                this.currentPath = [];
                targetPath = (this.currentTargetPath || []).slice();
                if (targetPath.length === 0) {
                    this.generateTarget();
                    regTimeout(nextAction, dureeDemo(700));
                    return;
                }
                demoPhase = 1;
                pIndex = 0;
                // Un temps d'arrêt sur la CIBLE avant de tracer : c'est le
                // moment où l'élève doit la lire, pas celui où le chemin
                // s'allume déjà.
                regTimeout(nextAction, dureeDemo(1100));
            } else if (demoPhase === 1) {
                if (pIndex < targetPath.length) {
                    this.currentPath.push(targetPath[pIndex]);
                    pIndex++;
                    regTimeout(nextAction, dureeDemo(650));
                } else {
                    demoPhase = 2;
                    regTimeout(nextAction, dureeDemo(700));
                }
            } else if (demoPhase === 2) {
                this.evaluatePath();
                demoPhase = 0;
                regTimeout(nextAction, dureeDemo(1800));
            }
        };
        nextAction();
    }
}

export function engineMathCrush(container, isDemo, params) {
    const exo = state.activeExo || { id: 'math_crush_add' };
    const game = new MathCrush(container, isDemo, params, exo.id);
    game.start();
    return game;
}
