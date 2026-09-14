/**
 * games/demo/script.js
 * Exemple de jeu compatible avec MathBox System
 */

const DemoGame = {
    // Variables du jeu
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    x: 0,
    speed: 5,

    // 1. DÉMARRAGE
    start: function(container) {
        // Création du Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        container.appendChild(this.canvas);

        // Gestion résolution (pour éviter le flou)
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.ctx = this.canvas.getContext('2d');
        this.x = 0;
        
        // Reset Score UI
        if(window.GameSystem) window.GameSystem.updateScore(0);
    },

    // 2. MISE A JOUR (Logique)
    update: function() {
        this.x += this.speed;
        if (this.x > this.width) {
            this.x = 0;
            // Exemple : Augmenter le score via le Système
            if(window.GameSystem) window.GameSystem.updateScore(Math.floor(Math.random() * 100));
        }
    },

    // 3. DESSIN
    draw: function() {
        // Fond noir
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Carré rouge
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fillRect(this.x, this.height / 2 - 25, 50, 50);

        // Texte
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px Arial';
        this.ctx.fillText("Jeu de Démo - Ça marche !", 50, 50);
    },

    // 4. ARRÊT (Optionnel)
    stop: function() {
        console.log("Jeu Démo arrêté.");
    }
};

// ENREGISTREMENT AU SYSTÈME
// C'est vital : le jeu dit au manager "Je suis là"
if (window.GameSystem) {
    window.GameSystem.register('demo', DemoGame);
}