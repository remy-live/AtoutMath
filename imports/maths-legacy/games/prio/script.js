/**
 * games/prio/script.js
 * Prio-Bot : Le maître des priorités opératoires
 * Version Corrigée (Fix: Index passed to checkPriority)
 */

const PrioGame = {
    config: {
        difficulty: 1 // 1=Sans parenthèses
    },

    container: null,
    expContainer: null,
    
    // État
    tokens: [], // Tableau d'objets {type: 'num'|'op', val: 5}
    score: 0,
    lives: 3,
    
    // --- 1. DÉMARRAGE ---
    start: function(container, options = {}) {
        this.container = container;
        this.config.difficulty = options.difficulty || 1;
        this.score = 0;
        this.lives = 3;

        if(window.GameSystem) {
            window.GameSystem.toggleLives(true);
            window.GameSystem.updateScore(0);
            window.GameSystem.toggleTimer(false);
            this.updateLivesUI();
        }

        this.createWorld();
        this.newRound();
    },

    stop: function() {
        this.container.innerHTML = '';
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
            <div class="prio-container">
                <div class="prio-hud">Désactive le programme !</div>
                <div class="prio-expression" id="prio-exp"></div>
            </div>
        `;
        this.expContainer = document.getElementById('prio-exp');
    },

    // --- 3. LOGIQUE JEU ---
    newRound: function() {
        // Génération d'une expression : A op B op C op D
        const length = 3 + Math.floor(Math.random() * 2); // 3 ou 4 opérateurs
        this.tokens = [];
        
        // Premier nombre
        this.tokens.push({ type: 'num', val: Math.floor(Math.random()*10)+1 });

        for(let i=0; i<length; i++) {
            // Opérateur (Plus de chance d'avoir × pour forcer la priorité)
            const op = Math.random() > 0.4 ? '×' : (Math.random()>0.5 ? '+' : '-');
            
            this.tokens.push({ type: 'op', val: op });
            
            // Nombre suivant
            this.tokens.push({ type: 'num', val: Math.floor(Math.random()*10)+1 });
        }

        this.renderExpression();
    },

    renderExpression: function() {
        this.expContainer.innerHTML = '';

        this.tokens.forEach((t, index) => {
            const el = document.createElement('div');
            el.className = t.type === 'num' ? 'prio-item prio-num' : 'prio-item prio-op';
            el.innerText = t.val;
            
            if(t.type === 'op') {
                // CORRECTION ICI : On passe bien l'index
                el.onclick = () => this.handleOpClick(index, t.val);
            }
            
            this.expContainer.appendChild(el);
        });
    },

    handleOpClick: function(index, op) {
        // CORRECTION ICI : On passe l'index à checkPriority
        if(this.checkPriority(index, op)) {
            // BONNE RÉPONSE !
            this.resolveOperation(index);
        } else {
            // MAUVAISE RÉPONSE
            const el = this.expContainer.children[index];
            el.classList.add('wrong');
            setTimeout(() => el.classList.remove('wrong'), 400);
            this.loseLife();
        }
    },

    checkPriority: function(index, clickedOp) {
        // 1. Définir les rangs : × et ÷ (rang 2) > + et - (rang 1)
        
        // Trouver le rang MAX présent dans toute l'expression
        let maxRank = 0;
        this.tokens.forEach(t => {
            if(t.type === 'op') {
                const rank = (t.val === '×' || t.val === '÷') ? 2 : 1;
                if(rank > maxRank) maxRank = rank;
            }
        });

        // 2. Vérifier le rang de l'opérateur cliqué
        const clickedRank = (clickedOp === '×' || clickedOp === '÷') ? 2 : 1;
        
        // Si je clique sur un "+" (rang 1) alors qu'il y a un "×" (rang 2) ailleurs -> FAUX
        if(clickedRank < maxRank) return false; 

        // 3. Règle Gauche-Droite : 
        // Si plusieurs opérateurs ont le même rang max, on doit faire le premier à gauche.
        
        // On cherche l'index du tout premier opérateur qui a le maxRank
        const firstMaxIndex = this.tokens.findIndex(t => {
            if(t.type !== 'op') return false;
            const r = (t.val === '×' || t.val === '÷') ? 2 : 1;
            return r === maxRank;
        });

        // Est-ce que l'index cliqué est bien celui du premier prioritaire ?
        return index === firstMaxIndex;
    },

    resolveOperation: function(opIndex) {
        // tokens[opIndex] est l'opérateur
        // tokens[opIndex-1] est le nombre gauche
        // tokens[opIndex+1] est le nombre droite

        const left = this.tokens[opIndex-1].val;
        const right = this.tokens[opIndex+1].val;
        const op = this.tokens[opIndex].val;
        let res = 0;

        if(op === '+') res = left + right;
        if(op === '-') res = left - right;
        if(op === '×') res = left * right;

        // Animation Visuelle
        const children = this.expContainer.children;
        if(children[opIndex-1]) children[opIndex-1].classList.add('solved');
        if(children[opIndex]) children[opIndex].classList.add('solved');
        if(children[opIndex+1]) children[opIndex+1].classList.add('solved');

        // Délai pour laisser l'anim se faire
        setTimeout(() => {
            // Remplacer les 3 tokens par le résultat dans le tableau
            this.tokens.splice(opIndex-1, 3, { type: 'num', val: res });
            
            // Score
            this.score += 50;
            if(window.GameSystem) window.GameSystem.updateScore(this.score);

            // Vérifier si fini (il ne reste qu'un seul token : le résultat final)
            if(this.tokens.length === 1) {
                this.score += 200; // Bonus fin de manche
                if(window.GameSystem) window.GameSystem.updateScore(this.score);
                this.newRound();
            } else {
                this.renderExpression();
            }
        }, 500);
    },

    loseLife: function() {
        this.lives--;
        this.updateLivesUI();
        if(this.lives <= 0) {
            this.stop();
            if(window.GameSystem) {
                 window.GameSystem.showModal({
                     title: "SYSTÈME CRITIQUE", 
                     content: `Score Final : ${this.score}`, 
                     actions: [
                        { label: "Réessayer", onClick: () => this.start(this.container) },
                        { label: "Quitter", onClick: () => window.GameSystem.stopGame() }
                     ]
                 });
            }
        }
    }
};

if (window.GameSystem) window.GameSystem.register('prio', PrioGame);