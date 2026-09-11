/**
 * core/particles.js
 * Moteur de particules léger pour le feedback visuel
 */
const ParticleSystem = {
    canvas: null,
    ctx: null,
    particles: [],
    isActive: false,

    // Couleurs du thème (Orange, Bleu, Jaune, Blanc)
    colors: ['#e67e22', '#2c3e50', '#f1c40f', '#ecf0f1'],

    init: function() {
        // Création du Canvas s'il n'existe pas
        if (this.canvas) return;
        
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'particle-canvas';
        
        // Style pour se superposer au jeu sans bloquer les clics
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none'; // Laisse passer les clics
        this.canvas.style.zIndex = '999'; // Par-dessus le jeu
        
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },

    resize: function() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },

    // Déclenche une explosion au centre d'un élément HTML (ex: une carte)
    burst: function(element, amount = 30) {
        if (!this.canvas) this.init();
        
        // On trouve la position exacte de la carte sur l'écran
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        for (let i = 0; i < amount; i++) {
            this.particles.push(this.createParticle(x, y));
        }

        if (!this.isActive) {
            this.isActive = true;
            this.loop();
        }
    },

    createParticle: function(x, y) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2; // Vitesse d'explosion
        
        return {
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2, // Légère poussée vers le haut
            life: 1, // Durée de vie (1 = 100%)
            decay: Math.random() * 0.02 + 0.01, // Vitesse de disparition
            color: this.colors[Math.floor(Math.random() * this.colors.length)],
            size: Math.random() * 6 + 4,
            gravity: 0.2
        };
    },

    loop: function() {
        // Si plus de particules, on arrête la boucle pour économiser le CPU
        if (this.particles.length === 0) {
            this.isActive = false;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        }

        requestAnimationFrame(() => this.loop());

        // Nettoyage de l'écran (avec légère traînée si on voulait, ici clean)
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // Physique
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity; // Gravité
            p.life -= p.decay;

            // Dessin
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            
            // Forme : Carrés (style pixel/rétro)
            this.ctx.fillRect(p.x, p.y, p.size, p.size);
            
            this.ctx.fill();

            // Suppression des particules mortes
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
};

// Initialisation au chargement
window.ParticleSystem = ParticleSystem;