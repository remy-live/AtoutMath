/**
 * games/rotate/script.js
 * Rotation 3D : Moteur 3D Wireframe léger & Jeu d'alignement
 */

const RotateGame = {
    config: { speed: 1, difficulty: 1 },
    
    container: null,
    canvas: null,
    ctx: null,
    
    // État 3D
    vertices: [], // Les points de l'objet
    faces: [],    // Les liens entre les points
    
    // État du jeu
    rotation: { x: 0, y: 0, z: 0 },
    targetRotation: { x: 0, y: 0, z: 0 }, // L'orientation requise
    wallZ: 1000, // Distance du mur (commence loin)
    score: 0,
    isGameOver: false,
    currentShapeName: '',

    // Formes disponibles (Points X, Y, Z)
    SHAPES: {
        cube: {
            v: [[-1,-1,-1], [1,-1,-1], [1, 1,-1], [-1, 1,-1], [-1,-1, 1], [1,-1, 1], [1, 1, 1], [-1, 1, 1]],
            f: [[0,1,2,3], [4,5,6,7], [0,1,5,4], [2,3,7,6], [0,3,7,4], [1,2,6,5]]
        },
        brick: { // Un pavé droit allongé
            v: [[-0.5,-1.5,-0.5], [0.5,-1.5,-0.5], [0.5, 1.5,-0.5], [-0.5, 1.5,-0.5], [-0.5,-1.5, 0.5], [0.5,-1.5, 0.5], [0.5, 1.5, 0.5], [-0.5, 1.5, 0.5]],
            f: [[0,1,2,3], [4,5,6,7], [0,1,5,4], [2,3,7,6], [0,3,7,4], [1,2,6,5]]
        }
    },

    start: function(container, options = {}) {
        this.container = container;
        this.config = { ...this.config, ...options };
        this.score = 0;
        this.isGameOver = false;

        this.createWorld();
        
        // Contrôles Clavier
        document.addEventListener('keydown', (e) => this.handleInput(e));
        
        // Contrôles Tactiles (Boutons virtuels)
        this.addTouchControls();

        this.nextLevel();
        requestAnimationFrame(() => this.loop());
    },

    stop: function() {
        this.isGameOver = true;
        this.container.innerHTML = '';
    },

    createWorld: function() {
        this.container.innerHTML = `
            <div class="rotate-ui">
                <div class="score">Score: <span id="rot-score">0</span></div>
                <div class="feedback" id="rot-feedback">ALIGNEMENT...</div>
            </div>
            <div class="canvas-wrap">
                <canvas id="rot-canvas" width="600" height="400"></canvas>
                </div>
            <div class="controls-hint">Utilise les Flèches et Espace</div>
        `;
        this.canvas = document.getElementById('rot-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.injectStyles();
    },

    nextLevel: function() {
        // Reset rotation
        this.rotation = { x: 0, y: 0, z: 0 };
        this.wallZ = 800; // Le mur repart au fond

        // Choix de la forme
        const keys = Object.keys(this.SHAPES);
        this.currentShapeName = keys[Math.floor(Math.random() * keys.length)];
        const shape = this.SHAPES[this.currentShapeName];
        
        // Copie profonde des points pour ne pas modifier l'original
        this.vertices = shape.v.map(p => [...p]); 
        this.faces = shape.f;

        // Définir une cible (Rotation aléatoire de 90° sur un axe)
        // Pour simplifier, on demande soit 0°, soit 90°
        const r = Math.random();
        if(r < 0.33) this.targetRotation = { x: Math.PI/2, y: 0, z: 0 };
        else if(r < 0.66) this.targetRotation = { x: 0, y: 0, z: Math.PI/2 };
        else this.targetRotation = { x: 0, y: 0, z: 0 };

        document.getElementById('rot-feedback').innerText = "Alignez la forme !";
        document.getElementById('rot-feedback').style.color = "#f1c40f";
    },

    // --- GAME LOOP ---
    loop: function() {
        if(this.isGameOver) return;
        
        this.update();
        this.draw();
        
        requestAnimationFrame(() => this.loop());
    },

    update: function() {
        // Le mur avance
        this.wallZ -= (2 + (this.score/500)); 

        // Vérification continue de l'alignement
        const aligned = this.checkAlignment();
        const fb = document.getElementById('rot-feedback');
        
        if (aligned) {
            fb.innerText = "PARFAIT !";
            fb.style.color = "#2ecc71";
        } else {
            fb.innerText = "AJUSTEZ...";
            fb.style.color = "#e74c3c";
        }

        // IMPACT
        if (this.wallZ <= 0) {
            if (aligned) {
                // Gagné la manche
                this.score += 100;
                if(window.GameSystem) window.GameSystem.updateScore(this.score);
                this.nextLevel();
            } else {
                // Perdu
                this.gameOver();
            }
        }
    },

    // --- MOTEUR 3D ---
    draw: function() {
        // Fond
        this.ctx.fillStyle = "#2c3e50";
        this.ctx.fillRect(0, 0, 600, 400);

        // 1. DESSIN DU MUR (Le trou)
        // On projette la "Target Rotation" pour dessiner le trou
        this.drawWallHole();

        // 2. DESSIN DE L'OBJET DU JOUEUR
        this.ctx.strokeStyle = "#3498db";
        this.ctx.lineWidth = 4;
        this.ctx.lineJoin = "round";

        const center = { x: 300, y: 200 };
        const scale = 100; // Zoom

        // Pour chaque face
        for (let i = 0; i < this.faces.length; i++) {
            const face = this.faces[i];
            
            this.ctx.beginPath();
            for (let j = 0; j < face.length; j++) {
                // Récupère le point 3D original
                let v = [...this.vertices[face[j]]];

                // Rotation du joueur
                v = this.rotatePoint(v, this.rotation.x, this.rotation.y, this.rotation.z);

                // Projection 3D -> 2D
                // Perspective simple : x2d = x * (focale / z)
                // Ici l'objet est fixe en Z=0 pour le joueur, c'est le mur qui bouge
                // Donc projection simple isométrique pour le jeu
                const x2d = center.x + (v[0] * scale);
                const y2d = center.y + (v[1] * scale);

                if (j === 0) this.ctx.moveTo(x2d, y2d);
                else this.ctx.lineTo(x2d, y2d);
            }
            this.ctx.closePath();
            this.ctx.stroke();
            
            // Remplissage léger pour effet volume
            this.ctx.fillStyle = "rgba(52, 152, 219, 0.2)";
            this.ctx.fill();
        }
    },

    drawWallHole: function() {
        // Le mur est un grand rectangle gris qui s'approche
        // Le trou est la forme de l'objet avec la targetRotation
        
        // Calcul de l'échelle du mur selon la distance (Perspective)
        // wallZ va de 800 à 0.
        // Facteur de zoom inversé
        const perspective = 1000 / (this.wallZ + 200); 
        const center = { x: 300, y: 200 };
        const holeScale = 100 * perspective;

        this.ctx.save();
        
        // On dessine d'abord un masque géant (le mur)
        this.ctx.fillStyle = `rgba(149, 165, 166, ${Math.min(1, perspective)})`; // Devient opaque en approchant
        this.ctx.beginPath();
        this.ctx.rect(0, 0, 600, 400); // Tout l'écran

        // On "découpe" le trou (Sub Path en sens inverse ou clip)
        // Pour simplifier l'affichage 2D canvas, on va dessiner le contour du trou en blanc épais
        // par dessus le gris si on n'utilise pas le mode 'destination-out'.
        
        // Dessinons la silhouette CIBLE (Target)
        // On prend les vertices, on applique targetRotation
        // On cherche l'enveloppe convexe (ou juste les points projetés)
        
        // Mode simplifié : On dessine juste le wireframe de la cible en pointillé
        this.ctx.fill(); // Affiche le mur gris
        
        this.ctx.strokeStyle = "#fff";
        this.ctx.lineWidth = 5 * perspective;
        this.ctx.setLineDash([10, 10]);
        
        for (let i = 0; i < this.faces.length; i++) {
            const face = this.faces[i];
            this.ctx.beginPath();
            for (let j = 0; j < face.length; j++) {
                let v = [...this.vertices[face[j]]];
                // Rotation CIBLE
                v = this.rotatePoint(v, this.targetRotation.x, this.targetRotation.y, this.targetRotation.z);
                const x2d = center.x + (v[0] * holeScale);
                const y2d = center.y + (v[1] * holeScale);
                if (j === 0) this.ctx.moveTo(x2d, y2d);
                else this.ctx.lineTo(x2d, y2d);
            }
            this.ctx.closePath();
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    },

    // --- MATHS 3D ---
    rotatePoint: function(p, rx, ry, rz) {
        let x = p[0], y = p[1], z = p[2];

        // Rotation X
        let cos = Math.cos(rx), sin = Math.sin(rx);
        let ny = y * cos - z * sin;
        let nz = z * cos + y * sin;
        y = ny; z = nz;

        // Rotation Y
        cos = Math.cos(ry); sin = Math.sin(ry);
        let nx = x * cos + z * sin;
        nz = z * cos - x * sin;
        x = nx; z = nz;

        // Rotation Z
        cos = Math.cos(rz); sin = Math.sin(rz);
        nx = x * cos - y * sin;
        ny = y * cos + x * sin;
        x = nx; y = ny;

        return [x, y, z];
    },

    // --- CONTROLE & LOGIQUE ---
    handleInput: function(e) {
        const step = Math.PI / 2; // On tourne par quart de tour, plus facile
        // Ou step = 0.1 pour fluide
        
        if (e.code === 'ArrowUp') this.rotation.x -= 0.1;
        if (e.code === 'ArrowDown') this.rotation.x += 0.1;
        if (e.code === 'ArrowLeft') this.rotation.y -= 0.1;
        if (e.code === 'ArrowRight') this.rotation.y += 0.1;
        if (e.code === 'Space') this.snapToGrid(); // Aide : aligner sur la grille
    },

    snapToGrid: function() {
        // Arrondit les angles au 90° le plus proche
        const snap = (val) => Math.round(val / (Math.PI/2)) * (Math.PI/2);
        this.rotation.x = snap(this.rotation.x);
        this.rotation.y = snap(this.rotation.y);
        this.rotation.z = snap(this.rotation.z);
    },

    checkAlignment: function() {
        // On normalise les angles entre 0 et 2PI
        const norm = (a) => {
            a = a % (Math.PI * 2);
            if (a < 0) a += Math.PI * 2;
            return a;
        };

        // Différence entre joueur et cible
        // Note: C'est simplifié. En vrai, un cube est identique à 0, 90, 180...
        // Pour ce mini-jeu, on demande juste d'être "proche" visuellement
        // Une astuce : on projette 3 points clés et on regarde s'ils sont proches des points cibles
        
        // Méthode simple : Check Angulaire avec tolérance
        // Problème : l'ambiguïté des formes (un cube a plein de solutions).
        // Solution robuste : Comparer la distance moyenne des sommets projetés.
        
        let error = 0;
        for(let v of this.vertices) {
             let pPlayer = this.rotatePoint(v, this.rotation.x, this.rotation.y, this.rotation.z);
             let pTarget = this.rotatePoint(v, this.targetRotation.x, this.targetRotation.y, this.targetRotation.z);
             
             // Distance entre le point joueur et le point cible
             let dist = Math.sqrt((pPlayer[0]-pTarget[0])**2 + (pPlayer[1]-pTarget[1])**2);
             error += dist;
        }
        
        // Si l'erreur cumulée est faible, c'est que la forme se superpose
        return error < 2.0; // Tolérance
    },

    addTouchControls: function() {
        const div = document.createElement('div');
        div.className = 'rotate-pad';
        div.innerHTML = `
            <button onmousedown="RotateGame.rotation.x-=0.2" ontouchstart="RotateGame.rotation.x-=0.2">⬆️</button>
            <div class="mid">
                <button onmousedown="RotateGame.rotation.y-=0.2" ontouchstart="RotateGame.rotation.y-=0.2">⬅️</button>
                <button onclick="RotateGame.snapToGrid()">🧲</button>
                <button onmousedown="RotateGame.rotation.y+=0.2" ontouchstart="RotateGame.rotation.y+=0.2">➡️</button>
            </div>
            <button onmousedown="RotateGame.rotation.x+=0.2" ontouchstart="RotateGame.rotation.x+=0.2">⬇️</button>
        `;
        this.container.appendChild(div);
    },

    gameOver: function() {
        this.isGameOver = true;
        this.ctx.fillStyle = "rgba(231, 76, 60, 0.8)";
        this.ctx.fillRect(0,0,600,400);
        this.ctx.fillStyle = "white";
        this.ctx.font = "40px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText("CRASH !", 300, 200);

        if(window.GameSystem) {
            setTimeout(() => {
                window.GameSystem.showModal({
                    title: "MUR HEURTÉ !",
                    content: `Score : ${this.score}`,
                    actions: [
                        { label: "Réessayer", onClick: () => this.start(this.container, this.config) },
                        { label: "Quitter", onClick: () => window.GameSystem.stopGame() }
                    ]
                });
            }, 1000);
        }
    },

    injectStyles: function() {
        if (document.getElementById('rot-style')) return;
        const css = `
            .rotate-ui { display: flex; justify-content: space-between; padding: 10px; color: #fff; font-weight: bold; background: #34495e; border-radius: 10px 10px 0 0; }
            .canvas-wrap { position: relative; border-bottom: 5px solid #2c3e50; }
            #rot-canvas { width: 100%; display: block; background: #2c3e50; }
            .controls-hint { text-align: center; color: #7f8c8d; font-size: 0.8rem; margin-top: 5px; }
            
            .rotate-pad { 
                position: absolute; bottom: 20px; right: 20px; display: flex; flex-direction: column; align-items: center; gap: 5px; 
                background: rgba(0,0,0,0.3); padding: 10px; border-radius: 50px;
            }
            .rotate-pad button { width: 40px; height: 40px; border-radius: 50%; border: none; background: #fff; font-size: 1.2rem; cursor: pointer; box-shadow: 0 4px 0 #bdc3c7; }
            .rotate-pad button:active { transform: translateY(2px); box-shadow: none; }
            .rotate-pad .mid { display: flex; gap: 5px; }
        `;
        const style = document.createElement('style');
        style.id = 'rot-style';
        style.innerHTML = css;
        document.head.appendChild(style);
    }
};

if (window.GameSystem) window.GameSystem.register('rotate', RotateGame);