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

// Cadence de descente : vitesse et intervalle d'apparition.
//
// Divisée par deux par rapport au premier réglage. Le jeu demande de DÉCIDER
// si 44 est dans la table de 7 ; à l'ancienne vitesse, on n'avait le temps que
// de réagir, ce qui est un autre exercice — et un exercice qu'on ne rate pas
// pour de mauvaises raisons. Un appareil doit traverser l'écran en une dizaine
// de secondes au premier niveau.
const RYTHMES = {
    lent: { vitesse: 0.26, entre: 190 },
    normal: { vitesse: 0.38, entre: 145 },
    rapide: { vitesse: 0.55, entre: 105 }
};

// Un décor par niveau : même règle, ciel neuf. C'est le décor qui récompense
// la progression, et il donne un repère — « j'en suis à la nébuleuse rouge ».
const DECORS = [
    { nom: 'Nébuleuse bleue', ciel: ['#1e1b4b', '#0b1020'], halo: 'rgba(99,102,241,.30)', etoile: '#e0e7ff' },
    { nom: 'Ceinture d\'astéroïdes', ciel: ['#292524', '#0c0a09'], halo: 'rgba(168,162,158,.26)', etoile: '#fef3c7' },
    { nom: 'Nuage rouge', ciel: ['#4c0519', '#1a0208'], halo: 'rgba(244,63,94,.26)', etoile: '#fecdd3' },
    { nom: 'Anneaux verts', ciel: ['#052e16', '#020c06'], halo: 'rgba(34,197,94,.26)', etoile: '#dcfce7' },
    { nom: 'Trou noir', ciel: ['#1e1b4b', '#000000'], halo: 'rgba(217,70,239,.28)', etoile: '#f5d0fe' }
];

/** Intrus à abattre pour passer au décor suivant. */
const PAR_NIVEAU = 6;

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
        this.niveau = 0;
        this.abattus = 0;
        // Le jeu s'ouvre sur la RÈGLE, en grand, puis un décompte.
        // Écrite en petit dans un coin, elle n'était jamais lue : on arrivait
        // dans une pluie de nombres sans savoir ce qu'on devait en faire.
        this.phase = 'briefing';
        this.compte = 0;

        this.container.innerHTML = `
            <style>
                .esc-arene { position: absolute; inset: 0; overflow: hidden; touch-action: none;
                    user-select: none; -webkit-user-select: none;
                    background: radial-gradient(ellipse at 50% 0%, #1e1b4b 0%, #0b1020 60%, #05070f 100%); }
                .esc-canvas { position: absolute; inset: 0; display: block; }
                .esc-hud { position: absolute; top: 0; left: 0; right: 0; z-index: 5;
                    display: flex; align-items: center; justify-content: space-between; gap: 10px;
                    padding: 8px 12px;
                    pointer-events: none; font-family: 'Inter', system-ui, sans-serif; }
                /* LA RÈGLE AU MILIEU, PAS DANS UN COIN. Rémy, sur iPhone :
                   « consigne pas claire et dans un coin ». Elle était écrite en
                   petit en haut à gauche, entre le niveau et les cœurs : dans
                   une pluie de nombres qui descendent, personne ne va la lire
                   là. Elle occupe maintenant sa propre ligne, centrée, sur un
                   fond assombri — et elle reste affichée toute la partie,
                   parce que c'est ELLE qu'on oublie au bout de trente secondes,
                   pas le score. */
                .esc-regle {
                    position: absolute; top: 34px; left: 0; right: 0; z-index: 5;
                    display: flex; justify-content: center; pointer-events: none;
                    font-family: 'Inter', system-ui, sans-serif;
                }
                .esc-regle span {
                    background: rgba(5, 7, 15, .62); border: 1px solid rgba(165,180,252,.28);
                    border-radius: 999px; padding: 5px 16px; max-width: 94%;
                    color: #e0e7ff; font-weight: 800; text-align: center; line-height: 1.25;
                    font-size: clamp(.85rem, 3.6vw, 1.1rem);
                    text-shadow: 0 2px 6px rgba(0,0,0,.8);
                }
                .esc-regle b { color: #fcd34d; }
                .esc-vies { color: #f87171; font-size: 1.15rem; letter-spacing: 1px; flex-shrink: 0; }
                .esc-score { color: #fcd34d; font-weight: 900; font-size: 1rem; flex-shrink: 0;
                    font-variant-numeric: tabular-nums; }
                .esc-niv { color: #a5b4fc; font-weight: 800; font-size: .82rem; flex-shrink: 0; }
                .esc-aide { position: absolute; bottom: 8px; left: 0; right: 0; text-align: center;
                    color: #94a3b8; font-size: .78rem; z-index: 5; pointer-events: none;
                    font-family: 'Inter', system-ui, sans-serif; }
                @media (max-width: 620px) {
                    .esc-aide { font-size: .7rem; }
                    .esc-regle { top: 30px; }
                    .esc-regle span { padding: 4px 12px; }
                }
            </style>
            <div class="esc-arene">
                <canvas class="esc-canvas"></canvas>
                <div class="esc-hud">
                    <div class="esc-niv" data-niv></div>
                    <div class="esc-vies" data-vies></div>
                    <div class="esc-score" data-score>0</div>
                </div>
                <div class="esc-regle"><span>Abats ce qui n'est <b>PAS</b> dans la table de <b>${this.table}</b></span></div>
                <div class="esc-aide">Glisse (ou bouge la souris) pour piloter · tape pour tirer</div>
            </div>`;

        this.arene = this.container.querySelector('.esc-arene');
        this.canvas = this.container.querySelector('.esc-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ui = {
            vies: this.container.querySelector('[data-vies]'),
            score: this.container.querySelector('[data-score]'),
            niv: this.container.querySelector('[data-niv]')
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

    get decor() { return DECORS[this.niveau % DECORS.length]; }

    majNiveau() {
        if (this.ui.niv) this.ui.niv.textContent = `Niv. ${this.niveau + 1} · ${this.decor.nom}`;
    }

    /** Décor suivant : on annonce le passage, on ne le subit pas. */
    monterDeNiveau() {
        this.niveau++;
        this.abattus = 0;
        this.majNiveau();
        this.mot(`Secteur dégagé — cap sur : ${this.decor.nom}`, 'ok');
        this.ennemis = [];
        this.frame = 0;
    }

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
        this.majNiveau();
        this.brancherPilotage();
        this.boucle = this.boucle.bind(this);
        this.raf = requestAnimationFrame(this.boucle);
        if (!this.isDemo) this.lancerBriefing();
    }

    /**
     * Règle en grand, puis 3 · 2 · 1 · GO.
     *
     * Trois secondes perdues au départ valent mieux qu'une partie entière
     * jouée sans avoir compris la consigne — et le décompte fait sa part :
     * on est prêt, doigt sur l'écran, quand les premiers appareils arrivent.
     */
    /**
     * Le briefing ATTEND l'élève.
     *
     * Il partait tout seul au bout de deux secondes et demie : le temps de
     * lire « Abats tout ce qui n'est PAS dans la table de 7 », le décompte
     * était lancé, et les élèves lents à lire — ceux à qui la règle sert le
     * plus — commençaient la partie sans l'avoir comprise. On ne devine pas
     * combien de temps il faut à quelqu'un pour lire : on lui demande.
     */
    lancerBriefing() {
        this.phase = 'briefing';
        this.compte = 0;
    }

    decompte(n) {
        if (!this.isRunning) return;
        this.phase = 'decompte';
        this.compte = n;
        if (n > 0) regTimeout(() => this.decompte(n - 1), 800);
        else regTimeout(() => { if (this.isRunning) { this.phase = 'jeu'; this.compte = 0; } }, 650);
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
            // Pendant le briefing, l'écran entier est le bouton « C'est parti »
            // : c'est la cible la plus facile à atteindre au doigt, et il n'y a
            // rien d'autre à faire à ce moment-là.
            if (this.phase === 'briefing') { this.decompte(3); return; }
            depart = pos(e); bouge = 0;
            this.vaisseau.cible = depart.x;
        };
        this.onMove = (e) => {
            if (!this.isRunning) return;
            const p = pos(e);
            if (depart) {
                bouge = Math.max(bouge, Math.hypot(p.x - depart.x, p.y - depart.y));
                this.vaisseau.cible = p.x;
                return;
            }
            // À LA SOURIS, LE VAISSEAU SUIT LE CURSEUR SANS QU'ON APPUIE.
            // Tenir le bouton enfoncé pour piloter n'a de sens qu'au doigt, où
            // il n'y a pas de survol ; à la souris, cela occupe la main qui
            // devrait tirer — on ne pouvait pas manœuvrer et tirer en même
            // temps, alors que c'est tout le jeu.
            if (e.pointerType !== 'mouse' || this.phase === 'briefing') return;
            if (p.x < 0 || p.x > this.canvas.width || p.y < 0 || p.y > this.canvas.height) return;
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
        if (++this.abattus >= PAR_NIVEAU) this.monterDeNiveau();
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
        // En pause de démonstration, on DESSINE mais on n'avance plus : le
        // monde se fige sous l'explication au lieu de continuer sans nous.
        if (!this.gelDemo) {
            this.frame++;
            this.avancer();
        }
        this.dessiner();
        this.raf = requestAnimationFrame(this.boucle);
    }

    avancer() {
        const w = this.canvas.width;
        // Pendant le briefing, le ciel défile mais rien ne descend : on lit.
        if (this.phase !== 'jeu' && !this.isDemo) {
            this.etoiles.forEach(s => {
                s.y += s.v; if (s.y > this.canvas.height) { s.y = -2; s.x = Math.random() * w; }
            });
            if (this.message && --this.message.vie <= 0) this.message = null;
            return;
        }
        // Le vaisseau suit le doigt sans le coller : un peu d'inertie, et le
        // pilotage reste doux même quand le doigt saute.
        this.vaisseau.x += (this.vaisseau.cible - this.vaisseau.x) * 0.22;
        this.vaisseau.x = Math.min(Math.max(this.vaisseau.x, 26), w - 26);

        this.etoiles.forEach(s => {
            s.y += s.v; if (s.y > this.canvas.height) { s.y = -2; s.x = Math.random() * w; }
        });

        if (!this.isDemo && this.phase === 'jeu' && this.frame % this.rythme.entre === 0) {
            this.ennemis.push(this.creerEnnemi());
        }

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

        // Le ciel du secteur : dégradé et halo changent à chaque niveau.
        const d = this.decor;
        const fond = c.createLinearGradient(0, 0, 0, h);
        fond.addColorStop(0, d.ciel[0]); fond.addColorStop(1, d.ciel[1]);
        c.fillStyle = fond; c.fillRect(0, 0, w, h);
        const halo = c.createRadialGradient(w / 2, h * 0.18, 10, w / 2, h * 0.18, w * 0.85);
        halo.addColorStop(0, d.halo); halo.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = halo; c.fillRect(0, 0, w, h);

        c.fillStyle = d.etoile;
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
        if (this.phase !== 'jeu' && !this.isDemo) this.dessinerBriefing();
        c.restore();
    }

    dessinerEnnemi(e) {
        const c = this.ctx, r = e.taille / 2;
        // TOUS les appareils sont identiques.
        //
        // La première version distinguait amis et intrus par la forme et la
        // couleur : il n'y avait alors plus rien à calculer, il suffisait de
        // viser les rouges. Le seul indice est le NOMBRE — c'est tout le jeu.
        c.save();
        c.translate(e.x, e.y);

        // Coque hexagonale À SOMMET PLAT, non déformée.
        //
        // L'ancienne écrasait la hauteur d'un facteur 0,82 et posait le nombre
        // dans une ellipse plus large que haute : deux déformations dans deux
        // sens, et un hublot où « 76 » ne tenait pas. Un hexagone régulier et
        // un hublot ROND se lisent comme un objet, pas comme un accident.
        c.shadowColor = 'rgba(148,163,184,.55)'; c.shadowBlur = 12;
        c.fillStyle = '#475569';
        c.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = i * Math.PI / 3;
            const px = Math.cos(a) * r, py = Math.sin(a) * r;
            i ? c.lineTo(px, py) : c.moveTo(px, py);
        }
        c.closePath(); c.fill();
        c.shadowBlur = 0;
        c.strokeStyle = 'rgba(203,213,225,.9)'; c.lineWidth = 2; c.stroke();

        // Le hublot porte le nombre : c'est la seule information du jeu, donc
        // le nombre commande, pas l'inverse. Le disque est celui du cercle
        // inscrit dans l'hexagone, et la police RÉTRÉCIT jusqu'à ce que le
        // nombre y tienne — un « 132 » ne doit pas déborder sur la coque.
        const hublot = r * 0.66;
        c.fillStyle = '#0f172a';
        c.beginPath(); c.arc(0, 0, hublot, 0, Math.PI * 2); c.fill();
        c.strokeStyle = 'rgba(148,163,184,.5)'; c.lineWidth = 1.5; c.stroke();

        const texte = String(e.valeur);
        let px = Math.round(e.taille * 0.44);
        c.font = `900 ${px}px 'Inter', system-ui, sans-serif`;
        while (px > 8 && c.measureText(texte).width > hublot * 1.68) {
            px -= 1;
            c.font = `900 ${px}px 'Inter', system-ui, sans-serif`;
        }
        c.fillStyle = '#e2e8f0';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(texte, 0, 0);
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

    /** Écran de mission : la règle en grand, puis 3 · 2 · 1 · GO. */
    dessinerBriefing() {
        const c = this.ctx, w = this.canvas.width, h = this.canvas.height;
        c.save();
        c.fillStyle = 'rgba(2,6,23,.78)'; c.fillRect(0, 0, w, h);
        c.textAlign = 'center'; c.textBaseline = 'middle';
        // Le texte est RAMENÉ à la largeur disponible : écrit sur une mesure
        // de l'écran, il sortait du cadre en portrait, et une règle tronquée
        // est pire qu'une règle absente.
        const dispo = w - 28;
        const T = (txt, y, taille, couleur, gras = 900) => {
            let px = Math.round(taille);
            c.font = `${gras} ${px}px 'Inter', system-ui, sans-serif`;
            while (px > 9 && c.measureText(txt).width > dispo) {
                px -= 1;
                c.font = `${gras} ${px}px 'Inter', system-ui, sans-serif`;
            }
            c.fillStyle = couleur;
            c.fillText(txt, w / 2, y);
        };
        const u = Math.min(w, h);

        if (this.phase === 'briefing') {
            T('MISSION', h * 0.28, u * 0.062, '#a5b4fc');
            T('Abats tout ce qui n\'est PAS', h * 0.38, u * 0.068, '#e2e8f0');
            T(`dans la table de ${this.table}`, h * 0.45, u * 0.068, '#e2e8f0');
            T(`Les multiples de ${this.table} sont des AMIS :`, h * 0.55, u * 0.046, '#fcd34d', 800);
            T('laisse-les passer.', h * 0.61, u * 0.046, '#fcd34d', 800);
            T('Glisse ou bouge la souris pour piloter · tape pour tirer', h * 0.68, u * 0.04, '#94a3b8', 700);

            // Le bouton : dessiné pour être vu, mais c'est tout l'écran qui
            // répond — on ne demande pas de viser à quelqu'un qui lit.
            const bw = Math.min(w - 60, u * 0.62), bh = u * 0.12;
            const bx = (w - bw) / 2, by = h * 0.80 - bh / 2;
            const pulse = 0.5 + 0.5 * Math.sin(this.frame / 18);
            c.fillStyle = '#22d3ee';
            c.shadowColor = 'rgba(34,211,238,.8)'; c.shadowBlur = 12 + pulse * 16;
            c.beginPath(); c.roundRect(bx, by, bw, bh, bh / 2); c.fill();
            c.shadowBlur = 0;
            c.fillStyle = '#042f2e';
            c.font = `900 ${Math.round(bh * 0.42)}px 'Inter', system-ui, sans-serif`;
            c.fillText('C\'EST PARTI !', w / 2, by + bh / 2);
        } else {
            const txt = this.compte > 0 ? String(this.compte) : 'GO !';
            // Le chiffre grossit et s'efface : on le voit même en clignant.
            T(txt, h * 0.46, u * (this.compte > 0 ? 0.26 : 0.18),
                this.compte > 0 ? '#e2e8f0' : '#22d3ee');
            T(`Table de ${this.table}`, h * 0.62, u * 0.05, '#a5b4fc', 800);
        }
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
        const fin = () => { cur?.hideBubble(); gate?.destroy(); };
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
