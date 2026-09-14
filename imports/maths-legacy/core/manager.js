/**
 * core/manager.js
 * Version Finale & Corrigée : Support Onglets + Code Prof + Progression Score Min
 */

const GameSystem = {
    content: null,
    installedGames: {},
    currentGame: null,
    
    // Données de session
    score: 0,
    currentMeta: null, // Pour stocker les conditions de victoire
    
    // Références DOM
    dom: {},

    start: function() {
        console.log("MathBox : Démarrage système...");
        
        // 1. Mise en cache du DOM
        this.dom = {
            loader: document.getElementById('system-overlay'),
            header: document.getElementById('main-header'),
            quickAccess: document.getElementById('quick-access-bar'),
            quickButtons: document.getElementById('quick-buttons'),
            
            // Vues
            menuView: document.getElementById('menu-view'),
            gameView: document.getElementById('game-view'),
            
            // Éléments Menu
            adventureContainer: document.getElementById('adventure-container'),
            freeContainer: document.getElementById('free-container'),
            menuTitle: document.getElementById('menu-title'),
            
            // Onglets
            btnTabAdv: document.getElementById('tab-adventure'),
            btnTabFree: document.getElementById('tab-free'),
            
            // Éléments Jeu
            gameCanvas: document.getElementById('game-canvas'),
            scoreDisplay: document.getElementById('display-score'),
            timerDisplay: document.getElementById('display-timer'),
            moduleTimer: document.getElementById('module-timer'),
            moduleLives: document.getElementById('module-lives'),
            backBtn: document.getElementById('btn-back'),
            
            // Prof
            btnLoadCode: document.getElementById('btn-load-code'),
            codeInput: document.getElementById('prof-code')
        };

        // 2. Listeners
        this.dom.backBtn.onclick = () => this.stopGame();
        if(this.dom.btnLoadCode) this.dom.btnLoadCode.onclick = () => this.loadTeacherCode(this.dom.codeInput.value);

        // Initialisation des onglets
        this.initTabs();

        // 3. Initialisation Données
        this.loadContent(); // Chargement du fichier JSON principal
    },

    // --- GESTION INTERFACE & ONGLETS ---
    initTabs: function() {
        // Clic sur "Parcours"
        this.dom.btnTabAdv.onclick = () => {
            this.dom.btnTabAdv.classList.add('active');
            this.dom.btnTabFree.classList.remove('active');
            
            this.dom.adventureContainer.style.display = 'block';
            this.dom.freeContainer.style.display = 'none'; 
            this.dom.menuTitle.innerText = "Mon Parcours";
        };

        // Clic sur "Libre"
        this.dom.btnTabFree.onclick = () => {
            this.dom.btnTabFree.classList.add('active');
            this.dom.btnTabAdv.classList.remove('active');
            
            this.dom.adventureContainer.style.display = 'none';
            this.dom.freeContainer.style.display = 'grid'; 
            this.dom.freeContainer.classList.remove('hidden'); 
            this.dom.menuTitle.innerText = "Entraînement Libre";
        };
    },

    setInterfaceState: function(state) {
        if (state === 'game') {
            this.dom.header.classList.add('hidden');
            this.dom.menuView.classList.add('hidden');
            this.dom.menuView.classList.remove('active');
            this.dom.gameView.classList.remove('hidden');
        } 
        else if (state === 'menu') {
            this.dom.header.classList.remove('hidden');
            this.dom.menuView.classList.remove('hidden');
            this.dom.menuView.classList.add('active');
            this.dom.gameView.classList.add('hidden');
        }
    },

    // --- CHARGEMENT DONNÉES ---
    loadContent: async function() {
        this.dom.loader.classList.remove('hidden');
        try {
            // On charge content.json (ou autre source si code prof)
            const req = await fetch('games/content.json');
            this.content = await req.json();
            
            // Une fois chargé, on affiche les deux onglets
            this.renderAdventure();
            this.renderFreeMode();

            // Par défaut, on active l'onglet Aventure
            this.dom.btnTabAdv.click();

        } catch(e) { 
            console.warn("Erreur chargement content.json", e);
            this.dom.adventureContainer.innerHTML = '<p class="error">Impossible de charger les jeux.</p>';
        }
        this.dom.loader.classList.add('hidden');
    },

    loadTeacherCode: async function(code) {
        if(!code) return;
        this.dom.loader.classList.remove('hidden');
        try {
            const req = await fetch(`games/custom/${code}.json`);
            if(!req.ok) throw new Error();
            this.content = await req.json();
            
            // Re-render avec les nouvelles données
            this.renderAdventure();
            this.renderFreeMode();
            this.dom.btnTabAdv.click(); // Reset vue
            
            alert(`Parcours "${code}" chargé !`);
        } catch(e) { alert("Code introuvable ou erreur fichier."); }
        this.dom.loader.classList.add('hidden');
    },

    // --- RENDU : AVENTURE ---
    renderAdventure: function() {
        const container = this.dom.adventureContainer;
        container.innerHTML = '';

        if(!this.content || !this.content.adventure || this.content.adventure.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">Aucun parcours défini.</p>';
            return;
        }

        // Récupérer progression (Niveau max atteint)
        const maxLevel = parseInt(localStorage.getItem('mathBox_progress')) || 0;

        this.content.adventure.forEach((step, index) => {
            const el = document.createElement('div');
            
            let status = 'locked';
            if (index < maxLevel) status = 'completed';
            else if (index === maxLevel) status = 'current';

            el.className = `level-card ${status}`;
            
            // Affichage du score cible
            const targetScore = step.winCondition ? step.winCondition.minScore : 0;
            const targetHtml = targetScore > 0 ? `<div style="margin-top:5px; font-weight:bold; color:#e67e22;">🏆 Objectif : ${targetScore} pts</div>` : '';

            el.innerHTML = `
                <div>
                    <h3 style="margin:0; font-size:1.2rem; color:#2c3e50;">${step.title}</h3>
                    <p style="margin:5px 0 0 0; color:#7f8c8d; font-size:0.9rem;">${step.description}</p>
                    ${targetHtml}
                    ${status === 'current' ? '<small style="color:#3498db; font-weight:bold; display:block; margin-top:5px;">À toi de jouer !</small>' : ''}
                </div>
            `;

            // Interaction
            if (status !== 'locked') {
                el.addEventListener('click', () => {
                    // Lancement en mode AVENTURE (sauvegarde possible)
                    this.prepareGame(step.gameId, step.config, { 
                        isAdventure: true, 
                        levelIndex: index, 
                        winCondition: step.winCondition // C'est ici que passe l'info du score min
                    });
                });
            }

            container.appendChild(el);
        });
    },

    // --- RENDU : LIBRE ---
    renderFreeMode: function() {
        const container = this.dom.freeContainer;
        container.innerHTML = '';

        const gamesList = this.content.freeMode || this.content; // Fallback

        if(!gamesList || !Array.isArray(gamesList)) return;

        gamesList.forEach(game => {
            const el = document.createElement('div');
            el.className = 'game-thumb';
            
            const icons = { 
                snake: '🐍', space: '🚀', memory: '🧠', dungeon: '🏰', 
                drop: '🧱', ninja: '🥷', mole: '🐹', flappy: '🐦', 
                divider: '🏭', bubble: '🔵', race: '🏎️', prio: '🤖'
            };
            const icon = icons[game.id] || '🎮';

            el.innerHTML = `
                <span class="game-icon">${icon}</span>
                <div style="font-weight:bold; color:#333;">${game.name}</div>
            `;

            el.addEventListener('click', () => {
                if(game.options && game.options.length > 1) {
                    this.showOptionsModal(game);
                } else {
                    const config = game.options && game.options.length > 0 ? game.options[0].config : {};
                    this.prepareGame(game.id, config, { isAdventure: false });
                }
            });

            container.appendChild(el);
        });
    },

    showOptionsModal: function(game) {
        const actions = game.options.map(opt => ({
            label: opt.label,
            onClick: () => this.prepareGame(game.id, opt.config, { isAdventure: false })
        }));
        actions.push({ label: "Annuler", onClick: null });
        this.showModal(game.name, "Choisis ton mode de jeu :", actions);
    },

    // --- MOTEUR DE JEU ---
    prepareGame: function(gameId, config, metaData = {}) {
        let gameInfo = null;
        if(this.content.freeMode) {
            gameInfo = this.content.freeMode.find(g => g.id === gameId);
        } else if(Array.isArray(this.content)) {
            gameInfo = this.content.find(g => g.id === gameId);
        }

        if(!gameInfo) {
            // Fallback si le jeu n'est pas dans la liste libre mais demandé par l'aventure
            // On essaie de deviner le chemin standard
            gameInfo = { id: gameId, folder: `games/${gameId}`, script: 'script.js' };
        }

        // On vérifie si le script est déjà chargé
        if(this.installedGames[gameId]) {
            this.launchGame(gameId, config, metaData);
        } else {
            this.loadScript(gameInfo, config, metaData);
        }
    },

    loadScript: function(info, config, metaData) {
        this.dom.loader.classList.remove('hidden');
        const s = document.createElement('script');
        s.src = `${info.folder}/${info.script}`;
        s.onload = () => {
            this.dom.loader.classList.add('hidden');
            this.launchGame(info.id, config, metaData);
        };
        s.onerror = () => {
            this.dom.loader.classList.add('hidden');
            alert("Erreur chargement du jeu.");
        };
        document.body.appendChild(s);
    },

    launchGame: function(gameId, config, metaData) {
        this.currentGame = this.installedGames[gameId];
        this.currentMeta = metaData; // IMPORTANT : On stocke les métadonnées (condition de victoire)
        
        // INTERFACE : ON PASSE EN MODE JEU
        this.setInterfaceState('game');

        // RESET UI
        this.toggleTimer(false);
        this.toggleLives(false);
        this.updateScore(0);
        this.dom.gameCanvas.innerHTML = '';
        
        // Notification Toast si objectif
        if(this.currentMeta && this.currentMeta.isAdventure && this.currentMeta.winCondition) {
            this.showToast(`🎯 Objectif : ${this.currentMeta.winCondition.minScore} points`);
        }

        // START
        this.currentGame.start(this.dom.gameCanvas, config);
        this.loop();
    },

    stopGame: function() {
        if(this.currentGame) {
            if(this.currentGame.stop) this.currentGame.stop();
        }

        // --- VERIFICATION DE LA VICTOIRE (NOUVEAU) ---
        let isSuccess = false;
        let targetScore = 0;

        if (this.currentMeta && this.currentMeta.isAdventure) {
            targetScore = this.currentMeta.winCondition ? this.currentMeta.winCondition.minScore : 0;
            if (this.score >= targetScore) {
                isSuccess = true;
                this.validateLevel(); // Sauvegarde progression
            }
        } else {
            isSuccess = true; // Mode libre = toujours "fini"
        }

        // Affichage du résultat
        this.showEndGameModal(isSuccess, targetScore);

        this.currentGame = null;
        this.currentMeta = null;
    },

    loop: function() {
        if(this.currentGame) {
            if(this.currentGame.update) this.currentGame.update();
            if(this.currentGame.draw && !this.currentGame.isRunning) this.currentGame.draw(); 
        }
    },

    // --- OUTILS UI ---
    updateScore: function(v) { 
        this.score = v;
        if(this.dom.scoreDisplay) this.dom.scoreDisplay.innerText = v; 
    },
    toggleTimer: function(show) { this.dom.moduleTimer.classList.toggle('hidden', !show); },
    toggleLives: function(show) { this.dom.moduleLives.classList.toggle('hidden', !show); },
    updateTimer: function(txt, alert) { 
        this.dom.timerDisplay.innerText = txt;
        this.dom.timerDisplay.classList.toggle('low-time', alert);
    },
    
    showToast: function(msg) {
        const t = document.createElement('div');
        t.innerText = msg;
        t.style.cssText = "position:fixed; top:20%; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); color:white; padding:10px 20px; border-radius:20px; z-index:2000; font-weight:bold;";
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2000);
    },

    // Modale générique
    showModal: function(titleOrObj, contentArg, actionsArg) {
        let title, content, actions;
        if (typeof titleOrObj === 'object' && titleOrObj !== null) {
            title = titleOrObj.title; content = titleOrObj.content; actions = titleOrObj.actions;
        } else {
            title = titleOrObj; content = contentArg; actions = actionsArg;
        }

        const div = document.createElement('div');
        div.className = 'modal-overlay';
        div.innerHTML = `
            <div class="modal-box">
                <h2>${title}</h2>
                <div style="margin-bottom:20px;">${content}</div>
                <div class="modal-actions"></div>
            </div>
        `;
        
        const actionBox = div.querySelector('.modal-actions');
        if (actions && Array.isArray(actions)) {
            actions.forEach(act => {
                const btn = document.createElement('button');
                btn.className = 'btn btn-primary';
                btn.style.margin = "0 5px";
                btn.innerText = act.label;
                btn.onclick = () => { 
                    if(act.onClick) act.onClick(); 
                    div.remove(); 
                };
                actionBox.appendChild(btn);
            });
        }
        document.body.appendChild(div);
    },

    // Modale Spéciale Fin de Jeu
    showEndGameModal: function(isSuccess, target) {
        const title = isSuccess ? "🎉 PARTIE TERMINÉE" : "😕 DOMMAGE";
        let content = `<div style="font-size:1.5rem; margin:10px 0;">Score : <strong>${this.score}</strong></div>`;
        
        if (this.currentMeta && this.currentMeta.isAdventure) {
            if (isSuccess) {
                content += `<div style="color:#27ae60;">Objectif (${target} pts) atteint ! Niveau suivant débloqué.</div>`;
            } else {
                content += `<div style="color:#c0392b;">Objectif non atteint (${target} pts). Réessaie !</div>`;
            }
        }

        this.showModal({
            title: title,
            content: content,
            actions: [
                { label: "Menu Principal", onClick: () => {
                    // Nettoyage complet
                    this.setInterfaceState('menu');
                    this.dom.gameCanvas.innerHTML = '';
                    this.renderAdventure(); // Mise à jour des cadenas
                }}
            ]
        });
    },

    register: function(id, mod) { this.installedGames[id] = mod; },
    
    // --- PERSISTANCE ---
    validateLevel: function() {
        if(this.currentMeta && this.currentMeta.isAdventure) {
            const currentLevelIndex = this.currentMeta.levelIndex;
            const maxLevel = parseInt(localStorage.getItem('mathBox_progress')) || 0;
            
            // Si on vient de finir le niveau max actuel, on débloque le suivant
            if(currentLevelIndex === maxLevel) {
                localStorage.setItem('mathBox_progress', maxLevel + 1);
            }
        }
    }
};

window.GameSystem = GameSystem;
document.addEventListener('DOMContentLoaded', () => GameSystem.start());