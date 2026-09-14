// MATH CRUSH — le plateau, les gemmes et le bandeau.
//
// Rémy, banc d'essai : « C'est bizarre comment apparaît le plateau. Je trouve
// les chiffres non centrés dans les cases. Pour la cible, on ne sait pas si on
// doit additionner ou multiplier. J'aimerais bien un jeu plus visuel et plus
// joli. » Quatre reproches, quatre réponses.
//
// LE PLATEAU APPARAISSAIT BIZARREMENT parce que les gemmes tombaient de mille
// pixels au-dessus d'un canevas qui n'avait pas de bord : on les voyait
// traverser tout l'écran, en désordre, avant de se ranger. Le plateau a
// maintenant un CADRE — un panneau sombre aux coins arrondis — et l'on dessine
// les gemmes DEDANS, à la découpe : elles surgissent du haut du panneau, en
// cascade colonne par colonne, comme dans n'importe quel jeu d'alignement.
//
// LES CHIFFRES N'ÉTAIENT PAS CENTRÉS, et ce n'était pas une illusion :
// `textBaseline = 'middle'` centre la BOÎTE D'EM de la police, pas l'encre du
// chiffre — un « 4 » et un « 8 » n'y tombent pas au même endroit. On mesure
// donc l'encre elle-même (`actualBoundingBoxAscent/Descent`) et l'on centre
// dessus. À cela s'ajoutait le relief : le chiffre était posé au milieu de la
// FACE alors que l'œil centre sur la gemme ENTIÈRE, ombre comprise.
//
// ON NE SAVAIT PAS S'IL FALLAIT ADDITIONNER OU MULTIPLIER. C'était vrai, et
// c'était grave : « Cible : 7 » sur un plateau de nombres se lit aussi bien
// dans un sens que dans l'autre. L'opération se dit maintenant TROIS fois — un
// jeton coloré à côté de la cible, l'expression en cours écrite en toutes
// lettres (« 3 + 4 = 7 »), et le signe posé ENTRE deux gemmes de la chaîne
// pendant qu'on la trace.

// ET CE N'EST PAS UN EXERCICE : C'EST UN JEU.
//
// Rémy, plus tard : « pour le Math Crush, c'est un jeu, ne mets pas la solution
// des opérations 🙂 on peut plutôt faire un certain temps avec des vies et le
// but c'est de faire un méga score. »
//
// LE BOUTON « INDICE » DONNAIT LA PREMIÈRE CASE DE LA SOLUTION. Il coûtait
// vingt points, ce qui avait l'air d'un prix ; en vérité il retirait au jeu la
// seule chose qu'on y fasse — CHERCHER. Un élève bloqué qui reçoit la case de
// départ ne cherche plus une chaîne, il suit une piste. On l'a donc enlevé, et
// rien ne le remplace : quand on ne trouve pas, on regarde ailleurs sur le
// plateau, et c'est précisément le calcul mental qu'on veut voir travailler.
//
// À LA PLACE, TROIS VIES ET UN ENCHAÎNEMENT. Le chronomètre seul faisait une
// partie sans enjeu : se tromper coûtait deux secondes, autant dire rien, et la
// meilleure stratégie était de tracer au hasard jusqu'à tomber juste. Trois
// cœurs rendent l'erreur chère sans la punir, et le multiplicateur
// d'enchaînement — ×1, ×1,5, ×2… jusqu'à ×5 — récompense la partie jouée avec
// attention plutôt que la partie jouée vite. Voir `core/tableauScores.js`.

import { BaseGame } from '../core/BaseGame.js';
import { createDemoGate, dureeDemo } from '../core/demoPointer.js';
import { state } from '../core/state.js';
import { regTimeout } from '../core/timers.js';
import {
    operationDe, valeurChaine, expressionChaine, depasse, disposerPlateau
} from '../core/mathCrush.js';
import { pointsChaine, multiplicateur } from '../core/tableauScores.js';
import { enregistrerScore } from '../core/scoresLocaux.js';

export class MathCrush extends BaseGame {
    constructor(container, isDemo, params, gameId) {
        super(container, isDemo, params, gameId);

        this.cols = 6;
        this.rows = 7;
        this.mode = params?.mode || 'addition';
        this.difficulty = params?.difficulty || 'progressive';
        this.successCount = 0;
        this.currentTargetPath = [];
        // TROIS VIES, ET UN ENCHAÎNEMENT QUI SE CASSE. `combo` compte les
        // réussites d'affilée ; il retombe à zéro à la première erreur, ce qui
        // fait qu'une erreur coûte bien plus que le cœur qu'elle prend.
        this.vies = 3;
        this.combo = 0;
        this.meilleurCombo = 0;
        this.tableau = [];
        this.finEnvoyee = false;
        this.grid = []; 
        
        this.currentPath = [];
        this.targetValue = 0;
        this.isDragging = false;
        
        this.particles = [];
        this.scoreTexts = [];
        
        this.timeLeft = 60;
        this.lastTime = Date.now();
        this.score = 0;
        
        // TROIS TONS PAR GEMME, et non un seul : le clair pour le haut, le
        // plein pour le bas, le sombre pour le socle. C'est ce dégradé qui
        // donne du volume — un aplat de couleur reste un carré, une gemme
        // éclairée par le haut est un objet.
        this.blockColors = [
            { bg: '#f43f5e', haut: '#fda4af', shadow: '#be123c', text: '#fff' },
            { bg: '#8b5cf6', haut: '#c4b5fd', shadow: '#6d28d9', text: '#fff' },
            { bg: '#3b82f6', haut: '#93c5fd', shadow: '#1d4ed8', text: '#fff' },
            { bg: '#10b981', haut: '#6ee7b7', shadow: '#047857', text: '#fff' },
            { bg: '#f59e0b', haut: '#fcd34d', shadow: '#b45309', text: '#fff' },
            { bg: '#0ea5e9', haut: '#7dd3fc', shadow: '#0369a1', text: '#fff' }
        ];
        this.op = operationDe(this.mode);
        
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
                    x: 0,
                    // `null` veut dire « pas encore née » : la hauteur de
                    // départ dépend de la taille des cases, qu'on ne connaît
                    // qu'au premier dessin. `chute` est cette hauteur, en
                    // cases — décalée par colonne pour que le plateau se
                    // remplisse en CASCADE plutôt qu'en bloc.
                    y: null, chute: 1.4 + r * 0.35 + c * 0.5,
                    targetY: 0,
                    vy: 0,
                    id: Math.random().toString(36).substr(2, 9)
                });
            }
            this.grid.push(col);
        }
    }

    generateTarget() {
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
            if (this.isDemo || this.finie()) return;
            e.preventDefault();
            this.isDragging = true;
            this.currentPath = [];
            handleMove(e);
        };

        const handleMove = (e) => {
            if (!this.isDragging || this.isDemo || this.finie()) return;
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

    /** Les valeurs de la chaîne en cours, dans l'ordre où on les a prises. */
    valeursChaine() {
        return this.currentPath
            .map(p => this.grid[p.c] && this.grid[p.c][p.r])
            .filter(Boolean)
            .map(b => b.val);
    }

    getCurrentSum() {
        return valeurChaine(this.valeursChaine(), this.mode);
    }

    evaluatePath() {
        if (this.currentPath.length === 0) return;
        const valeurs = this.valeursChaine();
        const sum = valeurChaine(valeurs, this.mode);
        
        if (sum === this.targetValue) {
            // Success !
            this.successCount++;
            // LE MÉGA SCORE — voir `pointsChaine` dans core/tableauScores.js.
            // La longueur compte au CARRÉ, et l'enchaînement multiplie : c'est
            // ce qui fait chercher le grand tracé plutôt que le premier venu.
            const pts = pointsChaine({
                longueur: this.currentPath.length, combo: this.combo, mode: this.mode
            });
            this.score += pts;
            this.combo++;
            this.meilleurCombo = Math.max(this.meilleurCombo, this.combo);
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
                        y: null, chute: 1.1 + i * 0.9,
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
                // UNE ERREUR COÛTE UN CŒUR, ET L'ENCHAÎNEMENT. Deux secondes de
                // chronomètre ne coûtaient rien : la meilleure stratégie était
                // de tracer au hasard jusqu'à tomber juste, ce qui n'est plus
                // du calcul mental. Le cœur donne son poids à l'erreur ;
                // l'enchaînement cassé lui donne son vrai prix, puisqu'il
                // faut trois réussites pour le reconstruire.
                this.vies = Math.max(0, this.vies - 1);
                this.combo = 0;
                this.timeLeft = Math.max(0, this.timeLeft - 2); // Pénalité de temps
                // Le message par défaut donnait « Faux ! Cible 7 = 7 » : il
                // répétait la cible deux fois et taisait le seul nombre qui
                // manquait — CE QUE LA CHAÎNE FAISAIT. On lisait donc une
                // contradiction là où il n'y avait qu'un écart.
                this.onWrongAnswer(null, {
                    questionText: `Faire ${this.targetValue}`,
                    input: sum,
                    expected: this.targetValue,
                    // ON RÉÉCRIT LE CALCUL EN ENTIER. « Ta chaîne fait 9 » ne
                    // dit pas OÙ l'on s'est trompé ; « 4 + 5 = 9 — il fallait
                    // 12 » se relit, et l'écart se voit.
                    customMessage: `${expressionChaine(valeurs, this.mode)} — il fallait `
                        + `${this.targetValue}.`
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
                // Née juste au-dessus du panneau : la découpe la cache jusqu'à
                // ce qu'elle y entre, et l'on ne la voit pas traverser l'écran.
                if (block.y === null) {
                    block.y = this.offsetY - this.blockSize * block.chute - this.blockSize;
                }

                // LA PESANTEUR SE MESURE EN CASES, PAS EN PIXELS. À 2,5 pixels
                // par image, une gemme de téléphone (30 px) tombait comme une
                // pierre et une gemme de bureau (80 px) flottait : le jeu
                // n'avait pas le même toucher d'un écran à l'autre.
                const g = this.blockSize * 0.035;
                if (block.y < targetY || block.vy < 0) {
                    block.vy += g;
                    block.y += block.vy;
                    if (block.y >= targetY && block.vy > 0) {
                        block.y = targetY;
                        // UN VRAI REBOND, et non un arrêt net : une gemme qui
                        // touche le fond et remonte d'un cheveu a du poids.
                        if (block.vy > g * 3) {
                            block.vy = -block.vy * 0.26;
                            block.y = targetY - 0.5;
                        } else {
                            block.vy = 0;
                        }
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

    /**
     * UN TEXTE VRAIMENT CENTRÉ SUR SON POINT.
     *
     * `textBaseline = 'middle'` centre la boîte d'em de la police — celle qui
     * contient les accents et les jambages —, pas l'encre du glyphe. Sur un
     * chiffre, qui n'a ni l'un ni l'autre, cela le pose visiblement trop haut :
     * c'est le « chiffres non centrés » de Rémy. On mesure donc le haut et le
     * bas de l'ENCRE, et l'on centre là-dessus.
     */
    texteCentre(txt, cx, cy, police, couleur) {
        const ctx = this.ctx;
        ctx.font = police;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        const m = ctx.measureText(txt);
        const haut = m.actualBoundingBoxAscent || 0;
        const bas = m.actualBoundingBoxDescent || 0;
        ctx.fillStyle = couleur;
        ctx.fillText(txt, cx, cy + (haut - bas) / 2);
    }

    /**
     * UNE GEMME : un socle sombre, une face en dégradé, un reflet en haut.
     *
     * Le relief tient en trois traits et c'est ce qui fait qu'on voit un objet
     * posé et non un carré peint. Sélectionnée, la gemme S'ENFONCE — elle vient
     * s'asseoir sur son socle — et le chiffre descend avec elle : c'est le
     * geste d'un bouton qu'on presse, et il se comprend sans légende.
     */
    dessinerGemme(block, choisie, trop) {
        const ctx = this.ctx;
        const marge = Math.max(2, Math.round(this.blockSize * 0.07));
        const cote = this.blockSize - marge * 2;
        const socle = Math.max(3, Math.round(this.blockSize * 0.09));
        const bx = block.x + marge;
        const by = block.y + marge + (choisie ? socle : 0);
        const rayon = Math.max(4, Math.round(cote * 0.22));

        // Le socle : la même forme, décalée vers le bas.
        ctx.fillStyle = block.color.shadow;
        ctx.beginPath();
        ctx.roundRect(bx, block.y + marge + socle, cote, cote, rayon);
        ctx.fill();

        // La face, éclairée par le haut.
        const g = ctx.createLinearGradient(0, by, 0, by + cote);
        g.addColorStop(0, block.color.haut);
        g.addColorStop(0.55, block.color.bg);
        g.addColorStop(1, block.color.bg);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(bx, by, cote, cote, rayon);
        ctx.fill();

        // Le reflet : une bande claire sur le tiers supérieur, à peine visible.
        ctx.fillStyle = 'rgba(255,255,255,.22)';
        ctx.beginPath();
        ctx.roundRect(bx + cote * 0.12, by + cote * 0.1, cote * 0.76, cote * 0.26,
            rayon * 0.7);
        ctx.fill();

        if (choisie) {
            ctx.strokeStyle = trop ? '#ef4444' : '#ffffff';
            ctx.lineWidth = Math.max(3, this.blockSize * 0.06);
            ctx.beginPath();
            ctx.roundRect(bx, by, cote, cote, rayon);
            ctx.stroke();
        }

        this.texteCentre(String(block.val), bx + cote / 2, by + cote / 2,
            `900 ${Math.round(cote * 0.52)}px Outfit, Arial, sans-serif`,
            block.color.text);
    }

    /**
     * LA CHAÎNE, ET SON SIGNE ENTRE CHAQUE GEMME.
     *
     * C'est la réponse la plus directe au « on ne sait pas si on doit
     * additionner ou multiplier » : pendant qu'on trace, le signe est POSÉ sur
     * le trait, entre les deux cases qu'il relie. On ne peut plus se tromper
     * d'opération, on la voit se faire.
     */
    centresChaine() {
        const socle = Math.max(3, Math.round(this.blockSize * 0.09));
        return this.currentPath.map(p => {
            const b = this.grid[p.c][p.r];
            return { x: b.x + this.blockSize / 2, y: b.y + this.blockSize / 2 + socle };
        });
    }

    /**
     * LE LIEN SE DESSINE SOUS LES GEMMES, LES SIGNES PAR-DESSUS.
     *
     * Un trait posé sur les gemmes barrait les chiffres qu'on vient justement
     * d'additionner. Sous elles, il ne se voit que dans les interstices — ce
     * qui suffit largement à lire le chemin — et les chiffres restent lisibles.
     * Les signes, eux, doivent rester au-dessus : ils sont l'information.
     */
    dessinerLien(trop) {
        if (this.currentPath.length < 2) return;
        const ctx = this.ctx;
        const centres = this.centresChaine();
        ctx.beginPath();
        ctx.strokeStyle = trop ? 'rgba(239,68,68,.95)' : 'rgba(255,255,255,.95)';
        ctx.lineWidth = Math.max(6, this.blockSize * 0.22);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        centres.forEach((c, i) => (i ? ctx.lineTo(c.x, c.y) : ctx.moveTo(c.x, c.y)));
        ctx.stroke();
    }

    dessinerSignes(trop) {
        if (this.currentPath.length < 2) return;
        const ctx = this.ctx;
        const centres = this.centresChaine();
        const rayon = Math.max(10, this.blockSize * 0.21);
        for (let i = 1; i < centres.length; i++) {
            const mx = (centres[i - 1].x + centres[i].x) / 2;
            const my = (centres[i - 1].y + centres[i].y) / 2;
            ctx.fillStyle = trop ? '#ef4444' : '#ffffff';
            ctx.beginPath();
            ctx.arc(mx, my, rayon, 0, Math.PI * 2);
            ctx.fill();
            this.texteCentre(this.op.signe, mx, my,
                `900 ${Math.round(rayon * 1.5)}px Outfit, Arial, sans-serif`,
                trop ? '#ffffff' : '#0f172a');
        }
    }

    /**
     * LE BANDEAU : l'opération, la cible, le calcul en cours et le temps.
     *
     * L'OPÉRATION EST DANS UN JETON, à gauche de la cible, de la couleur du
     * mode : elle se lit avant même le nombre. Et sous la cible on n'écrit plus
     * un total nu mais le CALCUL — « 3 + 4 = 7 » —, qui dit du même coup ce
     * qu'on est en train de faire et où l'on en est.
     */
    dessinerBandeau(w, P, panneau, valeurs, sum, trop) {
        const ctx = this.ctx;
        const teinte = this.mode === 'multiplication' ? '#7c3aed' : '#2563eb';
        const hb = P.bandeau;

        // LA JAUGE DE TEMPS COURT SUR TOUT LE HAUT. Un chiffre qui décroît se
        // lit ; une barre qui se vide se SENT, et c'est ce qu'on veut d'un jeu
        // à chronomètre. Elle rougit dans les dix dernières secondes.
        const part = Math.max(0, Math.min(1, this.timeLeft / 60));
        const hj = Math.max(5, Math.round(hb * 0.07));
        const yj = Math.round(hj * 0.6);
        ctx.fillStyle = 'rgba(148,163,184,.25)';
        ctx.beginPath();
        ctx.roundRect(panneau.x, yj, panneau.w, hj, hj / 2);
        ctx.fill();
        ctx.fillStyle = this.timeLeft <= 10 ? '#ef4444' : '#10b981';
        ctx.beginPath();
        ctx.roundRect(panneau.x, yj, Math.max(hj, panneau.w * part), hj, hj / 2);
        ctx.fill();

        // LES CŒURS À GAUCHE, LE MULTIPLICATEUR À DROITE, sur la ligne de la
        // jauge. Deux informations qui ne se lisent pas, elles se REPÈRENT :
        // on ne compte pas ses vies, on voit d'un coup d'œil s'il en reste. Ils
        // partagent donc la ligne du chronomètre, la seule qu'on regarde en
        // jouant, et ne prennent pas une ligne à eux.
        const hCoeur = Math.round(hb * 0.20);
        const yCoeur = yj + hj + Math.round(hCoeur * 0.75);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = `${hCoeur}px Outfit, Arial, sans-serif`;
        for (let i = 0; i < 3; i++) {
            ctx.globalAlpha = i < this.vies ? 1 : 0.22;
            ctx.fillText(i < this.vies ? '❤️' : '🤍',
                panneau.x + i * hCoeur * 1.15, yCoeur);
        }
        ctx.globalAlpha = 1;
        // LE MULTIPLICATEUR NE S'AFFICHE QU'À PARTIR DE ×1,5. À ×1, il ne dit
        // rien — c'est l'état ordinaire — et un « ×1 » permanent apprendrait
        // au joueur à ne plus le regarder, justement au moment où il commence
        // à vouloir dire quelque chose.
        const mult = multiplicateur(this.combo);
        if (mult > 1) {
            ctx.textAlign = 'right';
            const txt = `×${String(mult).replace('.', ',')}`;
            ctx.font = `900 ${Math.round(hCoeur * 0.95)}px Outfit, Arial, sans-serif`;
            ctx.fillStyle = mult >= 3 ? '#f59e0b' : '#10b981';
            ctx.fillText(txt, panneau.x + panneau.w, yCoeur);
        }
        ctx.textAlign = 'left';

        const yPastille = yj + hj + Math.round(hb * 0.26);
        const rP = Math.round(hb * 0.21);
        const titre = `Fais ${this.targetValue}`;
        const policeTitre = `900 ${Math.round(rP * 1.35)}px Outfit, Arial, sans-serif`;
        ctx.font = policeTitre;
        const largeurTitre = ctx.measureText(titre).width;
        const ecart = rP * 0.55;
        const total = rP * 2 + ecart + largeurTitre;
        const xJeton = Math.round(w / 2 - total / 2 + rP);

        ctx.fillStyle = teinte;
        ctx.beginPath();
        ctx.arc(xJeton, yPastille, rP, 0, Math.PI * 2);
        ctx.fill();
        this.texteCentre(this.op.signe, xJeton, yPastille,
            `900 ${Math.round(rP * 1.5)}px Outfit, Arial, sans-serif`, '#ffffff');

        const encre = getComputedStyle(document.documentElement)
            .getPropertyValue('--text-main').trim() || '#0f172a';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.font = policeTitre;
        const m = ctx.measureText(titre);
        ctx.fillStyle = encre;
        ctx.fillText(titre, xJeton + rP + ecart,
            yPastille + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);

        // LA LIGNE DU DESSOUS SE POSE SOUS LE JETON, à un écart fixe : au
        // milieu de l'espace libre, elle s'éloignait de la cible dès qu'il y
        // avait de la hauteur à perdre, et l'on ne lisait plus les deux
        // ensemble. Elle ne descend jamais sur le plateau.
        const ySous = Math.round(Math.min(yPastille + rP * 1.7, panneau.y - rP * 0.35));
        const petite = `700 ${Math.round(rP * 0.72)}px Outfit, Arial, sans-serif`;
        if (valeurs.length) {
            this.texteCentre(expressionChaine(valeurs, this.mode), w / 2, ySous,
                `800 ${Math.round(rP * 0.85)}px Outfit, Arial, sans-serif`,
                trop ? '#ef4444' : teinte);
        } else {
            this.texteCentre(`${this.op.consigne} · ${this.score} pts`, w / 2, ySous,
                petite, 'rgba(100,116,139,.95)');
        }
    }

    draw() {
        if(!this.ctx) return;
        // LE CANEVAS DOIT AVOIR LA FORME DE SA BOÎTE.
        //
        // Sa taille interne était fixée UNE SEULE FOIS au montage, puis étirée
        // en CSS à 100 % : dès que le conteneur changeait de proportions — ce
        // qu'il fait toujours, la mise en page se terminant après le montage —,
        // l'image se déformait et les cases CARRÉES s'affichaient en
        // rectangles. Rémy, sur iPhone : « cases pas carrées ». On
        // resynchronise juste avant de dessiner : c'est le seul moment où la
        // taille réellement affichée est connue.
        const large = Math.round(this.canvas.clientWidth || this.container.clientWidth || 800);
        const haut = Math.round(this.canvas.clientHeight || this.container.clientHeight || 600);
        if (large > 0 && haut > 0 && (this.canvas.width !== large || this.canvas.height !== haut)) {
            this.canvas.width = large;
            this.canvas.height = haut;
        }
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.ctx.clearRect(0, 0, w, h);

        const P = disposerPlateau(w, h, this.cols, this.rows);
        this.blockSize = P.cote;
        this.offsetX = P.x;
        this.offsetY = P.y;

        this.updatePhysics();

        const valeurs = this.valeursChaine();
        const sum = valeurChaine(valeurs, this.mode);
        const trop = depasse(valeurs, this.targetValue, this.mode);

        // LE PANNEAU, ET LA DÉCOUPE. Tout le plateau se dessine à l'intérieur :
        // une gemme qui tombe n'existe qu'à partir du moment où elle entre dans
        // le cadre, et c'est ce qui remplace la pluie de carrés d'avant.
        const pad = Math.round(P.cote * 0.14);
        const panneau = { x: P.x - pad, y: P.y - pad, w: P.w + pad * 2, h: P.h + pad * 2 };
        const rayon = Math.round(P.cote * 0.28);

        // Le bandeau se dessine EN CONNAISSANT le panneau : il cale sa jauge sur
        // sa largeur et sa ligne du bas juste au-dessus de son bord, au lieu de
        // venir s'asseoir dessus.
        this.dessinerBandeau(w, P, panneau, valeurs, sum, trop);

        const fond = this.ctx.createLinearGradient(0, panneau.y, 0, panneau.y + panneau.h);
        fond.addColorStop(0, '#1e293b');
        fond.addColorStop(1, '#0f172a');
        this.ctx.fillStyle = fond;
        this.ctx.beginPath();
        this.ctx.roundRect(panneau.x, panneau.y, panneau.w, panneau.h, rayon);
        this.ctx.fill();

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.roundRect(panneau.x, panneau.y, panneau.w, panneau.h, rayon);
        this.ctx.clip();

        this.dessinerLien(trop);
        for (let c = 0; c < this.cols; c++) {
            for (let r = 0; r < this.rows; r++) {
                const block = this.grid[c][r];
                const choisie = this.currentPath.some(p => p.c === c && p.r === r);
                this.dessinerGemme(block, choisie, trop);
            }
        }
        this.dessinerSignes(trop);
        this.ctx.restore();

        // Le liseré du panneau se pose APRÈS la découpe : par-dessus les
        // gemmes, il rattrape le coin arrondi qu'elles débordent.
        this.ctx.strokeStyle = 'rgba(148,163,184,.35)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.roundRect(panneau.x, panneau.y, panneau.w, panneau.h, rayon);
        this.ctx.stroke();

        // Draw Particles
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 6, 0, Math.PI*2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;

        // Les points gagnés, qui montent en s'effaçant. Le contour blanc les
        // détache du plateau sombre comme des gemmes.
        this.scoreTexts.forEach(st => {
            this.ctx.globalAlpha = st.life;
            this.ctx.font = '900 26px Outfit, Arial, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'alphabetic';
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 4;
            this.ctx.strokeText(st.text, st.x, st.y);
            this.ctx.fillStyle = '#10b981';
            this.ctx.fillText(st.text, st.x, st.y);
        });
        this.ctx.globalAlpha = 1;

        // LA FIN DE PARTIE EST UNE CARTE, pas un voile noir avec du texte dessus.
        if (this.finie() && !this.isDemo) this.dessinerFin(w, h);
    }

    /**
     * LA CARTE DE FIN, AVEC LE TABLEAU DES MEILLEURS SCORES.
     *
     * Rémy : « le but c'est de faire un méga score. ET on pourrait faire un
     * tableau de Top Score dans toute la base de données d'un établissement. »
     *
     * LE TABLEAU D'ÉTABLISSEMENT N'EXISTE PAS ENCORE — il suppose un serveur et
     * des comptes, que l'application n'a pas — et l'écran ne fait donc pas
     * semblant : il dit « sur cet appareil ». C'est une différence qui compte
     * pour un élève, qui croirait sinon battre toute sa classe.
     *
     * SA LIGNE À LUI EST SURLIGNÉE. Un tableau de dix noms où l'on doit
     * chercher le sien n'est pas un tableau des records, c'est une liste.
     */
    dessinerFin(w, h) {
        const ctx = this.ctx;
        const parTemps = this.timeLeft <= 0;
        const lignes = (this.tableau || []).slice(0, 5);
        ctx.fillStyle = 'rgba(15,23,42,.72)';
        ctx.fillRect(0, 0, w, h);

        const hLigne = Math.min(24, h * 0.045);
        const cw = Math.min(w * 0.86, 420);
        const ch = Math.min(h * 0.86, 210 + lignes.length * hLigne);
        const cx = (w - cw) / 2, cy = (h - ch) / 2;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(cx, cy, cw, ch, 22);
        ctx.fill();

        let y = cy + ch * 0.10;
        this.texteCentre(parTemps ? '⏳' : '💔', w / 2, y,
            '400 34px Outfit, Arial, sans-serif', '#0f172a');
        y += ch * 0.13;
        this.texteCentre(parTemps ? 'Temps écoulé' : 'Plus de vies', w / 2, y,
            '900 26px Outfit, Arial, sans-serif', '#0f172a');
        y += ch * 0.13;
        this.texteCentre(`${this.score} points`, w / 2, y,
            '900 30px Outfit, Arial, sans-serif', '#7c3aed');
        y += ch * 0.09;
        // LE MEILLEUR ENCHAÎNEMENT SE DIT, parce que c'est LUI qu'on rejouera
        // pour battre son score — pas le nombre de chaînes trouvées.
        const dit = this.record ? '🏆 Nouveau record personnel !'
            : `Meilleur enchaînement : ×${String(multiplicateur(this.meilleurCombo)).replace('.', ',')}`;
        this.texteCentre(dit, w / 2, y,
            `700 ${Math.round(hLigne * 0.62)}px Outfit, Arial, sans-serif`,
            this.record ? '#f59e0b' : '#64748b');

        if (!lignes.length) return;
        y += ch * 0.10;
        this.texteCentre('Meilleurs scores sur cet appareil', w / 2, y,
            `800 ${Math.round(hLigne * 0.55)}px Outfit, Arial, sans-serif`, '#94a3b8');
        y += hLigne * 0.9;

        const xg = cx + cw * 0.12, xd = cx + cw * 0.88;
        const police = `700 ${Math.round(hLigne * 0.66)}px Outfit, Arial, sans-serif`;
        lignes.forEach((e, i) => {
            const moi = i + 1 === this.rang;
            if (moi) {
                ctx.fillStyle = 'rgba(124,58,237,.12)';
                ctx.beginPath();
                ctx.roundRect(xg - 8, y - hLigne * 0.5, xd - xg + 16, hLigne, 8);
                ctx.fill();
            }
            ctx.font = police;
            ctx.fillStyle = moi ? '#7c3aed' : '#334155';
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'left';
            ctx.fillText(`${i + 1}. ${e.qui}`, xg, y);
            ctx.textAlign = 'right';
            ctx.fillText(String(e.score), xd, y);
            y += hLigne;
        });
        ctx.textAlign = 'left';
    }

    /**
     * LA PARTIE S'ARRÊTE À DEUX CONDITIONS, ET C'EST VOULU.
     *
     * Le chronomètre borne la séance — un jeu de récompense ne doit pas manger
     * l'heure de cours. Les vies bornent l'à-peu-près : sans elles, tracer au
     * hasard jusqu'à tomber juste restait payant.
     */
    finie() {
        return this.timeLeft <= 0 || this.vies <= 0;
    }

    loop() {
        if (!this.running) return;
        
        // Timer logic
        if (!this.isDemo && !this.finie()) {
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

        // LE TABLEAU SE CHARGE UNE SEULE FOIS, à la fin. `finEnvoyee` garde ce
        // rendez-vous : la boucle passe soixante fois par seconde, et sans lui
        // on écrirait soixante scores identiques.
        //
        // ET C'EST L'ARRIVÉE DU TABLEAU QUI REDESSINE LA CARTE, une fois. La
        // boucle s'arrête à la fin de la partie — rien n'y bouge plus, la faire
        // tourner pour rien userait la batterie d'une tablette posée sur un
        // coin de table pendant toute la récréation. Mais le stockage répond
        // plus tard, et la carte serait restée sans tableau.
        if (!this.isDemo && this.finie() && !this.finEnvoyee) {
            this.finEnvoyee = true;
            enregistrerScore('math-crush', this.score)
                .then(r => {
                    this.tableau = r.table; this.rang = r.rang; this.record = r.record;
                    if (this.running) this.draw();
                })
                .catch(() => { /* on affiche la carte sans tableau */ });
        }

        if (!this.finie() || this.isDemo) {
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
        // (`currentTargetPath`), le même que celui de la cible. L'ancien code
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
