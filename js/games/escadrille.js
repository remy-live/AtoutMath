// Escadrille des Tables : un shoot'em up vertical façon Tyrian.
//
// Une escadrille descend, chaque appareil portant un nombre. La consigne tient
// en une ligne : DÉTRUIS CE QUI N'EST PAS DANS LA TABLE. Les multiples sont
// des vaisseaux amis, on les laisse passer ; les autres sont des intrus, on
// les abat avant qu'ils n'atteignent la base.
//
// Ce n'est pas un jeu de réflexes déguisé en exercice. Le mouvement est lent
// et les nombres sont gros : la seule chose difficile, c'est de décider si 42
// est dans la table de 7 — et il faut décider VITE, ce qui est exactement ce
// qu'on cherche à automatiser. Deux façons de se tromper, symétriques et
// toutes deux enregistrées : tirer sur un ami, ou laisser passer un intrus.
//
// Un doigt suffit : le vaisseau suit le doigt, et une simple TAPE tire. Un
// appui qui bouge déplace, un appui qui ne bouge pas tire — c'est la même
// distinction que partout ailleurs, et elle évite un deuxième bouton.

import { BaseGame } from '../core/BaseGame.js';
import { regTimeout } from '../core/timers.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';

/** Cadence de descente : vitesse en pixels par image et intervalle d'apparition. */
const RYTHMES = {
    lent: { vitesse: 0.55, entre: 105 },
    normal: { vitesse: 0.8, entre: 78 },
    rapide: { vitesse: 1.15, entre: 56 }
};

const SEUIL_TAPE = 10;   // au-delà, l'appui est un déplacement, pas un tir

class Escadrille extends BaseGame {
    render() {
        this.table = Math.max(2, Math.min(12, parseInt(this.params.table) || 7));
        this.viesMax = parseInt(this.params.lives) || 3;
        this.rythme = RYTHMES[this.params.rythme] || RYTHMES.lent;

        this.vies = this.viesMax;
        this.score = 0;
        this.serie = 0;
        this.ennemis = [];
        this.tirs = [];
        this.particules = [];
        this.etoiles = [];
        this.frame = 0;
        this.secousse = 0;
        this.message = null;

        this.container.innerHTML = `
            <style>
                .esc-arene { position: absolute; inset: 0; overflow: hidden; touch-action: none;
                    user-select: none; -webkit-user-select: none;
                    background: radial-gradient(ellipse at 50% 0%, #1e1b4b 0%, #0b1020 60%, #05070f 100%); }
                .esc-canvas { position: absolute; inset: 0; display: block; }
                .esc-hud { position: absolute; top: 0; left: 0; right: 0; z-index: 5;
                    display: flex; align-items: center; gap: 10px; padding: 8px 12px;
                    pointer-events: none; font-family: 'Inter', system-ui, sans-serif; }
                .esc-mission { flex: 1; min-width: 0; color: #e0e7ff; font-weight: 800; font-size: .92rem;
                    text-shadow: 0 2px 6px rgba(0,0,0,.8); line-height: 1.25; }
                .esc-mission b { color: #fcd34d; font-size: 1.15em; }
                .esc-sous { display: block; font-weight: 600; color: #a5b4fc; font-size: .82em; }
                .esc-vies { color: #f87171; font-size: 1.15rem; letter-spacing: 1px; flex-shrink: 0; }
                .esc-score { color: #fcd34d; font-weight: 900; font-size: 1rem; flex-shrink: 0;
                    font-variant-numeric: tabular-nums; }
                .esc-aide { position: absolute; bottom: 8px; left: 0; right: 0; text-align: center;
                    color: #94a3b8; font-size: .78rem; z-index: 5; pointer-events: none;
                    font-family: 'Inter', system-ui, sans-serif; }
                @media (max-width: 620px) {
                    .esc-mission { font-size: .8rem; }
                    .esc-aide { font-size: .7rem; }
                }
            </style>
            <div class="esc-arene">
                <canvas class="esc-canvas"></canvas>
                <div class="esc-hud">
                    <div class="esc-mission">Abats ce qui n'est <b>PAS</b> dans la table de <b>${this.table}</b>
                        <span class="esc-sous">les multiples sont des amis</span></div>
                    <div class="esc-vies" data-vies></div>
                    <div class="esc-score" data-score>0</div>
                </div>
                <div class="esc-aide">Glisse pour piloter · tape pour tirer</div>
            </div>`;

        this.arene = this.container.querySelector('.esc-arene');
        this.canvas = this.container.querySelector('.esc-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ui = {
            vies: this.container.querySelector('[data-vies]'),
            score: this.container.querySelector('[data-score]')
        };
        this.dimensionner();
        this.onResize = () => this.dimensionner();
        window.addEventListener('resize', this.onResize);
        this.majVies();
    }

    dimensionner() {
        if (!this.canvas) return;
        const w = this.container.clientWidth || 800, h = this.container.clientHeight || 600;
        this.canvas.width = w; this.canvas.height = h;
        this.vaisseau = this.vaisseau || { x: w / 2, y: 0, cible: w / 2 };
        this.vaisseau.y = h - Math.max(56, h * 0.11);
        this.vaisseau.x = Math.min(Math.max(this.vaisseau.x, 30), w - 30);
        this.vaisseau.cible = this.vaisseau.x;
        // Le champ d'étoiles se refabrique à la taille : recalé, il donne la
        // sensation de vitesse sans coûter une image de fond.
        this.etoiles = Array.from({ length: 90 }, () => ({
            x: Math.random() * w, y: Math.random() * h,
            v: 0.3 + Math.random() * 1.5, r: Math.random() * 1.4 + 0.3
        }));
        this.baseY = h - 6;
    }

    majVies() {
        if (this.ui.vies) {
            this.ui.vies.textContent = '❤'.repeat(Math.max(0, this.vies))
                + '♡'.repeat(Math.max(0, this.viesMax - this.vies));
        }
    }
    majScore() { if (this.ui.score) this.ui.score.textContent = this.score; }

    // --- Contenu --------------------------------------------------------------

    /**
     * Fabrique un appareil.
     *
     * Un intrus sur deux environ, et surtout des intrus PROCHES d'un multiple
     * (42 quand la table est celle de 7, 48 aussi) : c'est là que la table se
     * joue. Tirer sur 100 quand la table est celle de 7 n'apprend rien.
     */
    creerEnnemi() {
        const t = this.table;
        const ami = Math.random() < 0.45;
        let valeur;
        if (ami) {
            valeur = t * (1 + Math.floor(Math.random() * 10));
        } else {
            const proche = t * (1 + Math.floor(Math.random() * 10));
            const ecarts = [1, 2, 3, -1, -2, -3, t - 1, 1 - t];
            valeur = proche + ecarts[Math.floor(Math.random() * ecarts.length)];
            if (valeur <= 0 || valeur % t === 0) valeur = proche + 1;
        }
        const taille = Math.max(30, Math.min(46, this.canvas.width * 0.1));
        return {
            x: taille + Math.random() * (this.canvas.width - 2 * taille),
            y: -taille,
            valeur, ami: valeur % t === 0, taille,
            // Une oscillation douce : de quoi rendre le vol vivant sans rendre
            // la visée difficile.
            phase: Math.random() * Math.PI * 2,
            amplitude: Math.random() * 22,
            vivant: true
        };
    }

    startGameLoop() {
        this.isRunning = true;
        this.brancherPilotage();
        this.boucle = this.boucle.bind(this);
        this.raf = requestAnimationFrame(this.boucle);
    }

    brancherPilotage() {
        const pos = (e) => {
            const r = this.canvas.getBoundingClientRect();
            return { x: (e.clientX - r.left) * (this.canvas.width / r.width),
                y: (e.clientY - r.top) * (this.canvas.height / r.height) };
        };
        let depart = null, bouge = 0;

        this.onDown = (e) => {
            if (!this.isRunning) return;
            e.preventDefault();
            depart = pos(e); bouge = 0;
            this.vaisseau.cible = depart.x;
        };
        this.onMove = (e) => {
            if (!this.isRunning || !depart) return;
            const p = pos(e);
            bouge = Math.max(bouge, Math.hypot(p.x - depart.x, p.y - depart.y));
            this.vaisseau.cible = p.x;
        };
        this.onUp = () => {
            if (!this.isRunning || !depart) return;
            // Un appui qui n'a pas bougé est un TIR : pas de second bouton à
            // viser, et le pouce ne quitte jamais l'écran.
            if (bouge < SEUIL_TAPE) this.tirer();
            depart = null;
        };
        this.arene.addEventListener('pointerdown', this.onDown);
        window.addEventListener('pointermove', this.onMove);
        window.addEventListener('pointerup', this.onUp);
        window.addEventListener('pointercancel', this.onUp);
    }

    tirer() {
        if (this.tirs.length > 4) return;      // pas de rafale : on vise
        this.tirs.push({ x: this.vaisseau.x, y: this.vaisseau.y - 18, v: 9 });
    }

    // --- Verdicts -------------------------------------------------------------

    /** Intrus abattu : c'est la bonne réponse. */
    abattre(e) {
        e.vivant = false;
        this.exploser(e.x, e.y, '#22d3ee');
        this.serie++;
        const pts = 10 + Math.min(20, this.serie * 2);
        this.score += pts;
        this.majScore();
        this.mot(`${e.valeur} n'est pas dans la table de ${this.table} !`, 'ok');
        this.onCorrectAnswer(null, `mult:${this.table}`, {
            points: pts,
            questionText: `${e.valeur} est-il dans la table de ${this.table} ?`,
            given: 'non', expected: 'non'
        });
    }

    /** Tir sur un ami : erreur, et on dit POURQUOI en donnant le quotient. */
    tirAmi(e) {
        e.vivant = false;
        this.exploser(e.x, e.y, '#f87171');
        this.serie = 0;
        this.secousse = 18;
        const q = e.valeur / this.table;
        this.mot(`${this.table} × ${q} = ${e.valeur} : c'était un ami !`, 'ko');
        this.onWrongAnswer(null, {
            questionText: `${e.valeur} est-il dans la table de ${this.table} ?`,
            input: 'tiré (donc « pas dans la table »)', expected: 'dans la table',
            concept: `mult:${this.table}`, silencieux: true,
            customMessage: `${e.valeur} EST dans la table de ${this.table} : ${this.table} × ${q} = ${e.valeur}. Il fallait le laisser passer.`
        });
        this.perdreUneVie();
    }

    /** Intrus qui atteint la base : erreur symétrique de la précédente. */
    intrusPasse(e) {
        e.vivant = false;
        this.exploser(e.x, this.baseY - 10, '#f59e0b');
        this.serie = 0;
        this.secousse = 22;
        this.mot(`${e.valeur} est passé ! Il n'est pas dans la table.`, 'ko');
        this.onWrongAnswer(null, {
            questionText: `${e.valeur} est-il dans la table de ${this.table} ?`,
            input: 'laissé passer (donc « dans la table »)', expected: 'PAS dans la table',
            concept: `mult:${this.table}`, silencieux: true,
            customMessage: `${e.valeur} n'est pas dans la table de ${this.table} : ${this.table} × ${Math.floor(e.valeur / this.table)} = ${this.table * Math.floor(e.valeur / this.table)}, et ${this.table} × ${Math.floor(e.valeur / this.table) + 1} = ${this.table * (Math.floor(e.valeur / this.table) + 1)}. Il fallait l'abattre.`
        });
        this.perdreUneVie();
    }

    perdreUneVie() {
        this.vies--;
        this.majVies();
        if (this.vies <= 0) {
            this.mot('Base touchée — on repart !', 'ko');
            this.vies = this.viesMax;
            this.ennemis = [];
            regTimeout(() => { if (this.isRunning) this.majVies(); }, 1200);
        }
    }

    /** Bandeau court DANS le jeu : une carte de correction masquerait le ciel. */
    mot(texte, ton) {
        this.message = { texte, ton, vie: 130 };
    }

    // --- Boucle ---------------------------------------------------------------

    boucle() {
        if (!this.isRunning || !this.canvas || !this.canvas.isConnected) return;
        this.frame++;
        this.avancer();
        this.dessiner();
        this.raf = requestAnimationFrame(this.boucle);
    }

    avancer() {
        const w = this.canvas.width;
        // Le vaisseau suit le doigt sans le coller : un peu d'inertie, et le
        // pilotage reste doux même quand le doigt saute.
        this.vaisseau.x += (this.vaisseau.cible - this.vaisseau.x) * 0.22;
        this.vaisseau.x = Math.min(Math.max(this.vaisseau.x, 26), w - 26);

        this.etoiles.forEach(s => {
            s.y += s.v; if (s.y > this.canvas.height) { s.y = -2; s.x = Math.random() * w; }
        });

        if (!this.isDemo && this.frame % this.rythme.entre === 0) this.ennemis.push(this.creerEnnemi());

        this.ennemis.forEach(e => {
            e.y += this.rythme.vitesse * 2.4;
            e.x += Math.sin((this.frame + e.phase * 40) / 55) * (e.amplitude / 55);
            if (e.vivant && e.y > this.baseY - e.taille / 2) {
                if (e.ami) { e.vivant = false; this.serie = Math.max(0, this.serie); }
                else this.intrusPasse(e);
            }
        });

        this.tirs.forEach(t => { t.y -= t.v; });
        this.tirs.forEach(t => {
            for (const e of this.ennemis) {
                if (!e.vivant || t.touche) continue;
                if (Math.hypot(t.x - e.x, t.y - e.y) < e.taille * 0.75) {
                    t.touche = true;
                    if (e.ami) this.tirAmi(e); else this.abattre(e);
                }
            }
        });

        this.tirs = this.tirs.filter(t => t.y > -20 && !t.touche);
        this.ennemis = this.ennemis.filter(e => e.vivant && e.y < this.canvas.height + 60);
        this.particules.forEach(p => { p.x += p.vx; p.y += p.vy; p.vie--; });
        this.particules = this.particules.filter(p => p.vie > 0);
        if (this.secousse > 0) this.secousse--;
        if (this.message && --this.message.vie <= 0) this.message = null;
    }

    exploser(x, y, couleur) {
        for (let i = 0; i < 16; i++) {
            const a = Math.random() * Math.PI * 2, v = 1 + Math.random() * 4;
            this.particules.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vie: 26, couleur });
        }
    }

    // --- Dessin ---------------------------------------------------------------

    dessiner() {
        const c = this.ctx, w = this.canvas.width, h = this.canvas.height;
        c.clearRect(0, 0, w, h);
        c.save();
        if (this.secousse > 0) c.translate((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7);

        c.fillStyle = '#fff';
        this.etoiles.forEach(s => {
            c.globalAlpha = 0.15 + s.v * 0.4;
            c.fillRect(s.x, s.y, s.r, s.r * 2.2);
        });
        c.globalAlpha = 1;

        // La base à défendre : une bande lumineuse en bas. Elle dit où « passer »
        // devient une faute, ce qu'un bord d'écran ne dirait pas.
        const grad = c.createLinearGradient(0, this.baseY - 26, 0, this.baseY);
        grad.addColorStop(0, 'rgba(56,189,248,0)');
        grad.addColorStop(1, 'rgba(56,189,248,.45)');
        c.fillStyle = grad; c.fillRect(0, this.baseY - 26, w, 26);
        c.strokeStyle = 'rgba(125,211,252,.8)'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(0, this.baseY); c.lineTo(w, this.baseY); c.stroke();

        this.ennemis.forEach(e => this.dessinerEnnemi(e));

        c.fillStyle = '#fde047';
        this.tirs.forEach(t => { c.fillRect(t.x - 2, t.y - 12, 4, 14); });

        this.particules.forEach(p => {
            c.globalAlpha = p.vie / 26; c.fillStyle = p.couleur;
            c.fillRect(p.x - 2, p.y - 2, 4, 4);
        });
        c.globalAlpha = 1;

        this.dessinerVaisseau();
        if (this.message) this.dessinerMessage();
        c.restore();
    }

    dessinerEnnemi(e) {
        const c = this.ctx, r = e.taille / 2;
        // Les deux camps se distinguent par la FORME autant que par la couleur :
        // un élève daltonien doit pouvoir jouer. Ami = disque, intrus = losange.
        c.save();
        c.translate(e.x, e.y);
        c.shadowColor = e.ami ? 'rgba(56,189,248,.8)' : 'rgba(248,113,113,.8)';
        c.shadowBlur = 14;
        c.fillStyle = e.ami ? '#0ea5e9' : '#e11d48';
        c.beginPath();
        if (e.ami) c.arc(0, 0, r, 0, Math.PI * 2);
        else { c.moveTo(0, -r); c.lineTo(r, 0); c.lineTo(0, r); c.lineTo(-r, 0); c.closePath(); }
        c.fill();
        c.shadowBlur = 0;
        c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2; c.stroke();
        c.fillStyle = '#fff';
        c.font = `900 ${Math.round(e.taille * 0.5)}px 'Inter', system-ui, sans-serif`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(String(e.valeur), 0, 1);
        c.restore();
    }

    dessinerVaisseau() {
        const c = this.ctx, x = this.vaisseau.x, y = this.vaisseau.y;
        c.save();
        c.translate(x, y);
        c.fillStyle = '#22d3ee'; c.shadowColor = 'rgba(34,211,238,.9)'; c.shadowBlur = 16;
        c.beginPath();
        c.moveTo(0, -20); c.lineTo(15, 14); c.lineTo(0, 7); c.lineTo(-15, 14);
        c.closePath(); c.fill();
        c.shadowBlur = 0;
        c.fillStyle = '#f8fafc';
        c.beginPath(); c.arc(0, -2, 4, 0, Math.PI * 2); c.fill();
        // Réacteur : la flamme vacille, c'est ce qui rend un vaisseau vivant.
        c.fillStyle = 'rgba(251,191,36,.9)';
        const f = 8 + Math.random() * 8;
        c.beginPath(); c.moveTo(-5, 12); c.lineTo(0, 12 + f); c.lineTo(5, 12); c.closePath(); c.fill();
        c.restore();
    }

    dessinerMessage() {
        const c = this.ctx, w = this.canvas.width;
        const m = this.message;
        c.save();
        c.globalAlpha = Math.min(1, m.vie / 26);
        c.font = `800 ${Math.max(13, Math.min(19, w * 0.042))}px 'Inter', system-ui, sans-serif`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        const lw = c.measureText(m.texte).width;
        const bw = Math.min(w - 20, lw + 30), bh = 34;
        const bx = (w - bw) / 2, by = this.vaisseau.y - 74;
        c.fillStyle = 'rgba(2,6,23,.86)';
        c.beginPath(); c.roundRect(bx, by, bw, bh, 10); c.fill();
        c.strokeStyle = m.ton === 'ok' ? '#22d3ee' : '#f87171'; c.lineWidth = 2; c.stroke();
        c.fillStyle = '#fff'; c.fillText(m.texte, w / 2, by + bh / 2);
        c.restore();
    }

    // --- Démonstration --------------------------------------------------------
    //
    // Le robot ne joue pas : il RAISONNE à voix haute sur deux appareils, un
    // ami et un intrus, en donnant le produit qui tranche. C'est ce produit
    // qu'il faut retenir, pas le geste.

    runDemoSequence() {
        this.startGameLoop();
        this.demoGate = createDemoGate(this.container);
        this.demoCursor = createDemoCursor();
        this.jouerDemo();
    }

    async jouerDemo() {
        const cur = this.demoCursor, gate = this.demoGate;
        const fin = () => { cur.hideBubble(); gate.destroy(); };
        const t = this.table;

        if (!await cur.pause(700) || !this.isRunning) return fin();
        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say(`Ma mission : abattre tout ce qui n'est PAS dans la table de ${t}.`, this.arene);
        if (!await cur.pause(2000) || !this.isRunning) return fin();

        // Un ami, puis un intrus, tous deux placés à la main pour que la
        // démonstration dise toujours la même chose.
        const ami = this.creerEnnemi();
        ami.valeur = t * 6; ami.ami = true; ami.x = this.canvas.width * 0.32; ami.y = 60;
        this.ennemis.push(ami);
        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say(`${ami.valeur} ? ${t} × 6 = ${ami.valeur}. C'est un ami : je NE TIRE PAS, je le laisse passer.`, this.arene);
        if (!await cur.pause(2600) || !this.isRunning) return fin();

        const intrus = this.creerEnnemi();
        intrus.valeur = t * 6 + 2; intrus.ami = false; intrus.x = this.canvas.width * 0.68; intrus.y = 40;
        this.ennemis.push(intrus);
        if (!await gate.waitTurn() || !this.isRunning) return fin();
        const q = Math.floor(intrus.valeur / t);
        cur.say(`${intrus.valeur} ? ${t} × ${q} = ${t * q} et ${t} × ${q + 1} = ${t * (q + 1)} : ${intrus.valeur} est entre les deux, il n'y est pas. Feu !`, this.arene);
        if (!await cur.pause(3000) || !this.isRunning) return fin();

        this.vaisseau.cible = intrus.x;
        if (!await cur.pause(600) || !this.isRunning) return fin();
        this.tirer();
        if (!await cur.pause(DEMO_SPEED.between + 1200) || !this.isRunning) return fin();
        cur.say(`Deux façons de se tromper : tirer sur un multiple de ${t}, ou laisser un intrus atteindre la base.`, this.arene);
        if (!await cur.pause(DEMO_SPEED.between + 1600) || !this.isRunning) return fin();
        fin();
    }

    pause() {
        if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
        super.pause();
    }

    destroy() {
        if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        window.removeEventListener('resize', this.onResize);
        window.removeEventListener('pointermove', this.onMove);
        window.removeEventListener('pointerup', this.onUp);
        window.removeEventListener('pointercancel', this.onUp);
        super.destroy();
    }
}

export function engineEscadrille(container, isDemo, params) {
    const jeu = new Escadrille(container, isDemo, params);
    jeu.start();
    return jeu;
}
