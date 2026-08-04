/**
 * games/memory/script.js
 * Jeu de paires - Version Corrigée & Finale
 */

const MemoryGame = {
    // --- CONFIGURATION ---
    config: {
        timeLimit: 60, 
        nbPairs: 10
    },

    // --- ÉTAT DU JEU ---
    container: null,
    cardsData: [],       // La liste des cartes (données)
    firstCard: null,     // La 1ère carte retournée { el, index }
    secondCard: null,    // La 2ème carte retournée { el, index }
    lockBoard: false,    // Empêche de cliquer pendant l'animation
    matchesFound: 0,
    score: 0,
    
    // Timer
    timer: null,
    timeLeft: 0,

    // --- 1. DÉMARRAGE ---
    start: function(container, options = {}) {
        this.container = container;
        
        // Configuration
        if (options.nbPairs) this.config.nbPairs = options.nbPairs;
        if (options.timeLimit !== undefined) this.config.timeLimit = options.timeLimit;

        // Reset total
        this.resetGame();

        // Gestion du Timer via le Manager
        if (this.config.timeLimit > 0) {
            window.GameSystem.toggleTimer(true);
            this.timeLeft = this.config.timeLimit;
            this.startTimer();
        } else {
            window.GameSystem.toggleTimer(false);
        }

        window.GameSystem.toggleLives(false); // Pas de vies pour le moment

        // IMPORTANT : L'ordre est crucial ici
        this.initData(); // 1. On crée les données
        this.render();   // 2. On affiche la grille
    },

    // --- 2. RESET ---
    resetGame: function() {
        this.matchesFound = 0;
        this.score = 0;
        this.cardsData = [];
        this.resetBoard(); // Remet firstCard/secondCard à null
        this.stopTimer(); 
        
        if(window.GameSystem) {
            window.GameSystem.updateScore(0);
            window.GameSystem.updateTimer("");
        }
    },

    resetBoard: function() {
        [this.firstCard, this.secondCard] = [null, null];
        this.lockBoard = false;
    },

    stop: function() {
        this.stopTimer();
    },

    // --- 3. GÉNÉRATION DES DONNÉES ---
    initData: function() {
        let pairs = [];
        let usedResults = new Set();
        
        // On génère autant de paires que demandé
        while(usedResults.size < this.config.nbPairs) {
            const a = Math.floor(Math.random() * 8) + 2; 
            const b = Math.floor(Math.random() * 9) + 2;
            const res = a * b;
            
            if(usedResults.has(res)) continue;
            usedResults.add(res);

            // IMPORTANT : On standardise les noms ici (content + pairId)
            pairs.push({ content: `${a} × ${b}`, pairId: res }); 
            pairs.push({ content: `${res}`, pairId: res });      
        }
        
        // Mélange
        pairs.sort(() => Math.random() - 0.5);
        this.cardsData = pairs;
    },

    // --- 4. AFFICHAGE (RENDER) ---
render: function() {
        if(!this.cardsData || this.cardsData.length === 0) return;
        this.container.innerHTML = '';
        const total = this.cardsData.length;

        // 1. On détecte l'orientation de l'écran
        // Est-ce que la zone de jeu est plus large que haute ?
        const isLandscape = this.container.clientWidth > this.container.clientHeight;

        // 2. Calcul optimisé des colonnes
        // On commence par la racine carrée
        let cols = Math.ceil(Math.sqrt(total));

        // Si on est sur un écran large (PC), on préfère avoir plus de colonnes
        if (isLandscape) {
             // On cherche un diviseur plus grand pour étaler en largeur
             // Ex: pour 12 cartes, au lieu de 4x3, on pourrait tenter 6x2 si c'est très large
             // Mais restons simple : on s'assure juste que cols >= rows
             while (total % cols !== 0) cols++;
        } else {
            // Si on est sur téléphone (Portrait), on préfère moins de colonnes (plus de lignes)
            // On inverse la logique : on veut rows >= cols
            let rows = Math.ceil(Math.sqrt(total));
            while (total % rows !== 0) rows++;
            cols = total / rows;
        }

        // 3. Création Grille
        const grid = document.createElement('div');
        grid.className = 'game-grid-layout';
        grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        
        // ... (Le reste est identique : boucle forEach sur this.cardsData ...)
        this.cardsData.forEach((item, index) => {
             const card = this.createCardElement(item, index);
             grid.appendChild(card);
        });
        this.container.appendChild(grid);
    },
    
    createCardElement: function(cardItem, index) {
        const cardEl = document.createElement('div');
        cardEl.className = 'flip-card';
        // On ne stocke pas de data complexe dans le DOM, juste l'index
        cardEl.dataset.index = index;

        const cardInner = document.createElement('div');
        cardInner.className = 'flip-card-inner';

        const cardFront = document.createElement('div');
        cardFront.className = 'card-face card-front';
        cardFront.innerText = '?'; 

        const cardBack = document.createElement('div');
        cardBack.className = 'card-face card-back';
        // Ici on utilise .content défini dans initData
        cardBack.innerText = cardItem.content; 

        cardInner.appendChild(cardFront);
        cardInner.appendChild(cardBack);
        cardEl.appendChild(cardInner);

        // Clic
        cardEl.onclick = () => this.handleCardClick(cardEl, index);

        return cardEl;
    },

    // --- 5. LOGIQUE DU JEU (INTERACTIONS) ---

    handleCardClick: function(cardEl, index) {
        // Bloquer si plateau verrouillé ou carte déjà retournée
        if (this.lockBoard || cardEl.classList.contains('flipped') || cardEl.classList.contains('matched')) return;

        // Retourner la carte
        cardEl.classList.add('flipped');

        if (!this.firstCard) {
            // Premier clic
            this.firstCard = { el: cardEl, index: index };
        } else {
            // Deuxième clic
            this.secondCard = { el: cardEl, index: index };
            this.checkMatch();
        }
    },

    checkMatch: function() {
        const card1 = this.cardsData[this.firstCard.index];
        const card2 = this.cardsData[this.secondCard.index];

        if (card1.pairId === card2.pairId) {
            // C'est une paire !
            // 1. On bloque le jeu pour éviter de cliquer ailleurs
            this.lockBoard = true; 
            
            // 2. On attend que l'animation de retournement (0.5s) soit finie
            // On laisse 800ms pour que le joueur ait le temps de voir les images
            setTimeout(() => {
                this.disableCards();
            }, 800);
            
        } else {
            // Pas une paire, on attend aussi avant de retourner
            this.unflipCards();
        }
    },

  disableCards: function() {
        // 1. Marquer les cartes comme trouvées
        this.firstCard.el.classList.add('matched');
        this.secondCard.el.classList.add('matched');

        // --- AJOUT DE L'EFFET DE PARTICULES ---
        // On vérifie si le système existe pour éviter les erreurs
        if (window.ParticleSystem) {
            // Explosion sur la 1ère carte
            window.ParticleSystem.burst(this.firstCard.el);
            // Explosion sur la 2ème carte
            window.ParticleSystem.burst(this.secondCard.el);
        }
        // --------------------------------------

        // Mise à jour du score
        this.score += 100;
        window.GameSystem.updateScore(this.score);

        // Vérification de victoire
        this.matchesFound++;
        if (this.matchesFound === this.cardsData.length / 2) {
            setTimeout(() => this.win(), 1000); // Un peu plus de délai pour savourer
        }

        this.resetBoard();
    },

    unflipCards: function() {
        this.lockBoard = true; // On bloque le clic

        setTimeout(() => {
            // On retourne les cartes après 1 seconde
            if(this.firstCard && this.firstCard.el) this.firstCard.el.classList.remove('flipped');
            if(this.secondCard && this.secondCard.el) this.secondCard.el.classList.remove('flipped');
            
            this.resetBoard();
        }, 1000);
    },

    // --- 6. TIMER ---
    startTimer: function() {
        this.updateTimerDisplay();
        this.stopTimer(); // Sécurité
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();

            if (this.timeLeft <= 0) {
                this.gameOver();
            }
        }, 1000);
    },

    stopTimer: function() {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
    },

    updateTimerDisplay: function() {
        if(!window.GameSystem) return;
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        const str = `${minutes}:${seconds < 10 ? '0'+seconds : seconds}`;
        window.GameSystem.updateTimer(str, this.timeLeft <= 10);
    },

    // --- 7. MODALES FINALES ---
    win: function() {
        this.stopTimer();
        window.GameSystem.showModal({
            title: "VICTOIRE !",
            content: `Bravo !<br>Score final : <strong>${this.score}</strong>`,
            actions: [
                { label: "REJOUER", onClick: () => this.start(this.container) },
                { label: "MENU", onClick: () => window.GameSystem.stopGame() }
            ]
        });
    },

    gameOver: function() {
        this.stopTimer();
        this.lockBoard = true; 
        window.GameSystem.showModal({
            title: "TEMPS ÉCOULÉ",
            content: "Dommage ! Le temps est écoulé.",
            actions: [
                { label: "RÉESSAYER", onClick: () => this.start(this.container) },
                { label: "MENU", onClick: () => window.GameSystem.stopGame() }
            ]
        });
    }
};

// Enregistrement dans le manager
if (window.GameSystem) window.GameSystem.register('memory', MemoryGame);