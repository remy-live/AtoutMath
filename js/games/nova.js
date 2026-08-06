// NOVA — shoot'em up vertical, façon Tyrian.
//
// Un vrai jeu d'arcade, pas un exercice déguisé : tir automatique, vagues
// d'ennemis en formation, tirs adverses à esquiver, explosions, bonus. On
// joue pour jouer.
//
// Le calcul arrive par les PORTES. Toutes les vingt secondes environ, un mur
// blindé barre le secteur avec trois ouvertures numérotées, et une question
// s'affiche en grand : « 7 × 8 = ? ». Il faut franchir la bonne. C'est le
// point d'équilibre du jeu — la question ne coupe rien, elle se répond en
// pilotant, et on ne peut pas l'éviter puisque le mur barre tout le passage.
//
// Pourquoi ce choix plutôt que des ennemis porteurs de nombres : parce qu'un
// shmup demande de tirer sur tout ce qui bouge, et qu'une seconde d'hésitation
// y est mortelle. Séparer les deux — l'action aux ennemis, le calcul aux
// portes — laisse au calcul le temps d'être un calcul.
//
// Tout est dessiné au canevas : ni image ni son à charger, donc rien à
// attendre et rien à casser hors ligne.

import { BaseGame } from '../core/BaseGame.js';
import { regTimeout } from '../core/timers.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';

// --- Secteurs : un décor par niveau -----------------------------------------
const SECTEURS = [
    { nom: 'Nébuleuse d\'Orion', ciel: ['#1e1b4b', '#070b1c'], teinte: '#6366f1', astre: '#a5b4fc' },
    { nom: 'Ceinture de Vesta', ciel: ['#2b2118', '#0c0906'], teinte: '#f59e0b', astre: '#fde68a' },
    { nom: 'Brume écarlate', ciel: ['#4c0519', '#160207'], teinte: '#f43f5e', astre: '#fecdd3' },
    { nom: 'Anneaux d\'Émeraude', ciel: ['#052e16', '#020c06'], teinte: '#22c55e', astre: '#bbf7d0' },
    { nom: 'Horizon du Vide', ciel: ['#2e1065', '#000000'], teinte: '#d946ef', astre: '#f5d0fe' }
];

const SEUIL_TAPE = 12;

class Nova extends BaseGame {

    // --- Mise en place -------------------------------------------------------

    render() {
        const p = this.params || {};
        this.tables = (Array.isArray(p.tables) && p.tables.length ? p.tables : [2, 3, 4, 5, 6, 7, 8, 9, 10])
            .map(Number).filter(n => n >= 2 && n <= 12);
        this.viesMax = parseInt(p.lives) || 3;
        this.entrePortes = Math.max(8, Math.min(40, parseInt(p.entrePortes) || 18)) * 60;

        this.vies = this.viesMax;
        this.score = 0;
        this.niveau = 0;
        this.frame = 0;
        this.secousse = 0;
        this.phase = 'briefing';
        this.compte = 0;

        this.ennemis = [];
        this.tirs = [];
        this.tirsEnnemis = [];
        this.particules = [];
        this.bonus = [];
        this.couches = [];
        this.porte = null;
        this.message = null;
        this.bouclier = 0;
        this.puissance = 1;
        // Le compromis du tir.
        //
        // Le canon de base reste AUTOMATIQUE : on ne demande pas à un élève de
        // penser à tirer, le doigt sert à piloter et la tête au calcul. Mais un
        // tir gratuit rend le jeu trop facile, alors la PUISSANCE se mérite :
        // garder le doigt posé charge un tir lourd, et pendant qu'on charge le
        // canon ordinaire ralentit de moitié. Rester appuyé pour frapper fort,
        // c'est s'exposer ; relâcher pour esquiver, c'est renoncer au coup.
        // Un seul doigt, aucun bouton de plus, et un vrai arbitrage.
        this.charge = 0;
        this.doigtPose = false;
        this.rayon = 0;

        this.container.innerHTML = `
            <style>
                .nv-arene { position: absolute; inset: 0; overflow: hidden; touch-action: none;
                    user-select: none; -webkit-user-select: none; background: #05070f; }
                .nv-canvas { position: absolute; inset: 0; display: block; }
                .nv-hud { position: absolute; top: 0; left: 0; right: 0; z-index: 5;
                    display: flex; align-items: center; gap: 10px; padding: 8px 12px;
                    pointer-events: none; font-family: 'Inter', system-ui, sans-serif; }
                .nv-secteur { flex: 1; min-width: 0; color: #c7d2fe; font-weight: 800; font-size: .82rem;
                    text-shadow: 0 2px 6px rgba(0,0,0,.9); overflow: hidden; text-overflow: ellipsis;
                    white-space: nowrap; }
                .nv-vies { color: #f87171; font-size: 1.15rem; letter-spacing: 1px; flex-shrink: 0; }
                .nv-score { color: #fcd34d; font-weight: 900; font-size: 1rem; flex-shrink: 0;
                    font-variant-numeric: tabular-nums; }
            </style>
            <div class="nv-arene">
                <canvas class="nv-canvas"></canvas>
                <div class="nv-hud">
                    <div class="nv-secteur" data-secteur></div>
                    <div class="nv-vies" data-vies></div>
                    <div class="nv-score" data-score>0</div>
                </div>
            </div>`;

        this.arene = this.container.querySelector('.nv-arene');
        this.canvas = this.container.querySelector('.nv-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ui = {
            vies: this.container.querySelector('[data-vies]'),
            score: this.container.querySelector('[data-score]'),
            secteur: this.container.querySelector('[data-secteur]')
        };
        this.dimensionner();
        this.onResize = () => this.dimensionner();
        window.addEventListener('resize', this.onResize);
        this.majHud();
    }

    get secteur() { return SECTEURS[this.niveau % SECTEURS.length]; }

    dimensionner() {
        if (!this.canvas) return;
        const w = this.container.clientWidth || 800, h = this.container.clientHeight || 600;
        this.canvas.width = w; this.canvas.height = h;
        this.vaisseau = this.vaisseau || { x: w / 2, y: 0, cible: w / 2, roulis: 0 };
        this.vaisseau.y = h - Math.max(64, h * 0.13);
        this.vaisseau.x = Math.min(Math.max(this.vaisseau.x, 30), w - 30);
        this.vaisseau.cible = this.vaisseau.x;

        // Trois couches d'étoiles à des vitesses différentes : c'est la
        // parallaxe qui donne la profondeur, pas le nombre d'étoiles.
        this.couches = [
            this.semer(Math.round(w * h / 9000), 0.25, 0.9, 0.30),
            this.semer(Math.round(w * h / 14000), 0.7, 1.5, 0.55),
            this.semer(Math.round(w * h / 26000), 1.5, 2.4, 0.95)
        ];
        // Décor de fond : nuages diffus, planètes à anneaux, débris qui
        // tournent. Trois échelles, trois vitesses — c'est ce qui donne
        // l'impression de traverser QUELQUE CHOSE plutôt que du vide noir.
        this.astres = Array.from({ length: 3 }, () => ({
            x: Math.random() * w, y: Math.random() * h,
            r: 26 + Math.random() * (w * 0.16), v: 0.06 + Math.random() * 0.1
        }));
        this.planetes = Array.from({ length: 2 }, () => ({
            x: Math.random() * w, y: Math.random() * h * 1.6 - h * 0.3,
            r: Math.min(w, h) * (0.07 + Math.random() * 0.08), v: 0.14 + Math.random() * 0.16,
            anneau: Math.random() < 0.6, incline: (Math.random() - 0.5) * 0.9
        }));
        this.debris = Array.from({ length: 14 }, () => ({
            x: Math.random() * w, y: Math.random() * h,
            r: 3 + Math.random() * 9, v: 0.5 + Math.random() * 1.1,
            a: Math.random() * 6.28, va: (Math.random() - 0.5) * 0.05
        }));
    }

    semer(n, vmin, vmax, alpha) {
        const w = this.canvas.width, h = this.canvas.height;
        return {
            alpha,
            etoiles: Array.from({ length: Math.max(20, n) }, () => ({
                x: Math.random() * w, y: Math.random() * h,
                v: vmin + Math.random() * (vmax - vmin),
                r: 0.6 + Math.random() * 1.5
            }))
        };
    }

    majHud() {
        if (this.ui.vies) {
            this.ui.vies.textContent = '❤'.repeat(Math.max(0, this.vies))
                + '♡'.repeat(Math.max(0, this.viesMax - this.vies));
        }
        if (this.ui.score) this.ui.score.textContent = this.score;
        if (this.ui.secteur) this.ui.secteur.textContent = `Secteur ${this.niveau + 1} · ${this.secteur.nom}`;
    }

    // --- Départ ---------------------------------------------------------------

    startGameLoop() {
        this.isRunning = true;
        this.brancherPilotage();
        this.boucle = this.boucle.bind(this);
        this.raf = requestAnimationFrame(this.boucle);
        if (!this.isDemo) this.lancerBriefing();
        else this.phase = 'jeu';
    }

    lancerBriefing() {
        this.phase = 'briefing';
        regTimeout(() => { if (this.isRunning) this.decompte(3); }, 2800);
    }

    decompte(n) {
        if (!this.isRunning) return;
        this.phase = 'decompte';
        this.compte = n;
        if (n > 0) regTimeout(() => this.decompte(n - 1), 780);
        else regTimeout(() => { if (this.isRunning) { this.phase = 'jeu'; this.compte = 0; this.frame = 0; } }, 620);
    }

    brancherPilotage() {
        const pos = (e) => {
            const r = this.canvas.getBoundingClientRect();
            return {
                x: (e.clientX - r.left) * (this.canvas.width / r.width),
                y: (e.clientY - r.top) * (this.canvas.height / r.height)
            };
        };
        let depart = null, bouge = 0;
        this.onDown = (e) => {
            if (!this.isRunning) return;
            e.preventDefault();
            depart = pos(e); bouge = 0;
            this.vaisseau.cible = depart.x;
            this.doigtPose = true;
        };
        this.onMove = (e) => {
            if (!this.isRunning || !depart) return;
            const p = pos(e);
            bouge = Math.max(bouge, Math.abs(p.x - depart.x));
            this.vaisseau.cible = p.x;
        };
        this.onUp = () => {
            depart = null;
            this.doigtPose = false;
            if (this.charge >= 1) this.lacherRayon();
            this.charge = 0;
        };
        this.arene.addEventListener('pointerdown', this.onDown);
        window.addEventListener('pointermove', this.onMove);
        window.addEventListener('pointerup', this.onUp);
        window.addEventListener('pointercancel', this.onUp);
    }

    // --- Contenu --------------------------------------------------------------

    /**
     * Une vague, et sa CHORÉGRAPHIE.
     *
     * C'est ce qui sépare un shmup d'une pluie de cibles : les appareils
     * entrent en formation et suivent une figure — une descente en zigzag, une
     * boucle qui les ramène d'où ils viennent, un carrousel, un piqué. Chaque
     * chorégraphie est une fonction du temps qui rend une position ; l'appareil
     * ne « tombe » pas, il VOLE quelque part.
     *
     * Le décalage `retard` entre appareils d'une même vague fait le serpent :
     * ils passent tous au même endroit, mais pas au même instant.
     */
    lancerVague() {
        const w = this.canvas.width, h = this.canvas.height;
        const figures = ['descente', 'zigzag', 'boucle', 'carrousel', 'pique', 'serpent'];
        const figure = figures[Math.floor(Math.random() * figures.length)];
        const n = figure === 'carrousel' ? 6 : 3 + Math.floor(Math.random() * 3);
        const taille = Math.max(22, Math.min(34, w * 0.075));
        const marge = taille * 1.8;
        const large = w - 2 * marge;
        const sens = Math.random() < 0.5 ? 1 : -1;
        const vitesse = 0.9 + this.niveau * 0.1;
        const base = marge + Math.random() * large;

        for (let i = 0; i < n; i++) {
            const part = n === 1 ? 0.5 : i / (n - 1);
            const retard = figure === 'serpent' ? i * 26 : figure === 'carrousel' ? 0 : i * 8;
            this.ennemis.push({
                figure, part, sens, retard, taille, base, large, marge,
                t: -retard,
                pv: 1 + Math.floor(this.niveau / 2),
                vitesse,
                x: base, y: -taille,
                tir: 110 + Math.floor(Math.random() * 200),
                vivant: true
            });
        }
    }

    /** Position d'un appareil selon sa chorégraphie et son âge. */
    placerEnnemi(e) {
        const w = this.canvas.width, h = this.canvas.height;
        const t = e.t * e.vitesse;
        const col = e.marge + e.part * e.large;
        switch (e.figure) {
            case 'zigzag':
                e.x = col + Math.sin(t / 34) * (e.large * 0.22) * e.sens;
                e.y = -e.taille + t;
                break;
            case 'boucle': {
                // Une descente, puis un cercle, puis la descente reprend :
                // la figure la plus reconnaissable de Tyrian.
                const debut = 130, tour = 150;
                if (t < debut) { e.x = col; e.y = -e.taille + t; }
                else if (t < debut + tour) {
                    const a = (t - debut) / tour * Math.PI * 2;
                    const r = e.large * 0.16;
                    e.x = col + Math.sin(a) * r * e.sens;
                    e.y = -e.taille + debut + (1 - Math.cos(a)) * r;
                } else { e.x = col; e.y = -e.taille + debut + (t - debut - tour); }
                break;
            }
            case 'carrousel': {
                // Six appareils en ronde autour d'un centre qui descend.
                const a = t / 46 + e.part * Math.PI * 2;
                const r = Math.min(w, h) * 0.17;
                e.x = w / 2 + Math.cos(a) * r * e.sens;
                e.y = -e.taille + t * 0.55 + Math.sin(a) * r * 0.5;
                break;
            }
            case 'pique': {
                // Formation en V qui plonge vers le joueur puis se redresse.
                const creux = Math.abs(e.part - 0.5) * 90;
                e.x = col + Math.sin(t / 80) * 26 * e.sens;
                e.y = -e.taille - creux + t * (t < 150 ? 1.7 : 0.55);
                break;
            }
            case 'serpent':
                // Tous sur le même chemin, décalés dans le temps.
                e.x = w / 2 + Math.sin(t / 42) * (e.large * 0.42) * e.sens;
                e.y = -e.taille + t * 0.9;
                break;
            default:
                e.x = col; e.y = -e.taille + t;
        }
    }

    /**
     * Le mur de portes : là où le calcul entre dans le jeu.
     *
     * Trois ouvertures, une seule bonne. Les leurres sont des erreurs
     * PLAUSIBLES — le produit voisin (7 × 7 au lieu de 7 × 8), la somme au
     * lieu du produit — pas des nombres au hasard : c'est ce qui distingue
     * une question d'un tirage.
     */
    lancerPorte() {
        const w = this.canvas.width;
        const t = this.tables[Math.floor(Math.random() * this.tables.length)];
        const m = 2 + Math.floor(Math.random() * 9);
        const bon = t * m;
        const leurres = new Set();
        [t * (m - 1), t * (m + 1), t + m, bon + t, bon - t, bon + 1]
            .filter(v => v > 0 && v !== bon).forEach(v => leurres.add(v));
        const choix = [...leurres].sort(() => Math.random() - 0.5).slice(0, 2);
        const valeurs = [bon, ...choix].sort(() => Math.random() - 0.5);

        this.porte = {
            y: -90, h: 74, question: `${t} × ${m}`, bon, table: t, facteur: m,
            portes: valeurs.map((v, i) => ({
                v, x0: i / valeurs.length, x1: (i + 1) / valeurs.length, juge: false
            })),
            reglee: false
        };
    }

    // --- Verdicts -------------------------------------------------------------

    franchir(p) {
        this.porte.reglee = true;
        const bonneReponse = p.v === this.porte.bon;
        const q = `${this.porte.question} = ?`;
        if (bonneReponse) {
            this.score += 60;
            this.bouclier = 240;
            this.puissance = Math.min(3, this.puissance + 1);
            this.mot(`${this.porte.question} = ${this.porte.bon} — bouclier rechargé !`, 'ok');
            this.onCorrectAnswer(null, `mult:${this.porte.table}`, {
                points: 20, questionText: q, given: p.v, expected: this.porte.bon
            });
        } else {
            this.secousse = 26;
            this.puissance = 1;
            this.mot(`${this.porte.question} = ${this.porte.bon}, pas ${p.v}`, 'ko');
            this.onWrongAnswer(null, {
                questionText: q, input: p.v, expected: this.porte.bon,
                concept: `mult:${this.porte.table}`, silencieux: true,
                customMessage: `${this.porte.question} = ${this.porte.bon}. Tu as franchi la porte ${p.v}.`
            });
            this.perdreUneVie();
        }
    }

    /** Le mur descend jusqu'au vaisseau sans qu'aucune porte soit franchie. */
    heurterMur() {
        this.porte.reglee = true;
        this.secousse = 26;
        this.mot(`Mur percuté ! ${this.porte.question} = ${this.porte.bon}`, 'ko');
        this.onWrongAnswer(null, {
            questionText: `${this.porte.question} = ?`, input: '(mur percuté)',
            expected: this.porte.bon, concept: `mult:${this.porte.table}`, silencieux: true,
            customMessage: `${this.porte.question} = ${this.porte.bon} : il fallait passer par cette porte-là.`
        });
        this.perdreUneVie();
    }

    perdreUneVie() {
        if (this.bouclier > 0) { this.bouclier = 0; this.mot('Bouclier détruit !', 'ko'); return; }
        this.vies--;
        this.majHud();
        if (this.vies <= 0) {
            this.mot('Vaisseau détruit — nouvelle escadre', 'ko');
            this.vies = this.viesMax;
            this.puissance = 1;
            this.ennemis = []; this.tirsEnnemis = []; this.porte = null;
            this.majHud();
        }
    }

    mot(texte, ton) { this.message = { texte, ton, vie: 140 }; }

    // --- Boucle ---------------------------------------------------------------

    boucle() {
        if (!this.isRunning || !this.canvas || !this.canvas.isConnected) return;
        this.frame++;
        this.avancer();
        this.dessiner();
        this.raf = requestAnimationFrame(this.boucle);
    }

    avancer() {
        const w = this.canvas.width, h = this.canvas.height;
        this.couches.forEach(c => c.etoiles.forEach(s => {
            s.y += s.v; if (s.y > h) { s.y = -2; s.x = Math.random() * w; }
        }));
        this.astres.forEach(a => { a.y += a.v; if (a.y - a.r > h) { a.y = -a.r; a.x = Math.random() * w; } });
        this.planetes.forEach(pl => {
            pl.y += pl.v;
            if (pl.y - pl.r * 2 > h) { pl.y = -pl.r * 2; pl.x = Math.random() * w; }
        });
        this.debris.forEach(d => {
            d.y += d.v; d.a += d.va;
            if (d.y - d.r > h) { d.y = -d.r; d.x = Math.random() * w; }
        });

        if (this.phase !== 'jeu') {
            if (this.message && --this.message.vie <= 0) this.message = null;
            return;
        }

        // Pilotage : le vaisseau suit le doigt avec un peu d'inertie, et
        // s'incline dans le sens du virage — c'est ce roulis qui fait qu'un
        // vaisseau « vole » au lieu de glisser.
        const dx = this.vaisseau.cible - this.vaisseau.x;
        this.vaisseau.x += dx * 0.2;
        this.vaisseau.x = Math.min(Math.max(this.vaisseau.x, 24), w - 24);
        this.vaisseau.roulis += (Math.max(-1, Math.min(1, dx / 60)) - this.vaisseau.roulis) * 0.15;

        // Canon automatique — mais deux fois plus lent pendant qu'on charge.
        const cadence = Math.max(7, 13 - this.puissance * 2) * (this.doigtPose ? 2 : 1);
        if (this.frame % Math.round(cadence) === 0) this.tirerJoueur();

        // Charge : environ une seconde et demie de doigt posé.
        if (this.doigtPose) this.charge = Math.min(1, this.charge + 1 / 90);
        if (this.rayon > 0) { this.rayon--; this.frapperAuRayon(); }

        if (!this.porte && this.frame % 150 === 0) this.lancerVague();
        if (!this.porte && this.frame % this.entrePortes === 0 && this.frame > 60) this.lancerPorte();

        this.majEnnemis();
        this.majTirs();
        this.majPorte();
        this.majBonus();

        this.particules.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.vie--; });
        this.particules = this.particules.filter(p => p.vie > 0);
        if (this.secousse > 0) this.secousse--;
        if (this.bouclier > 0) this.bouclier--;
        if (this.message && --this.message.vie <= 0) this.message = null;
    }

    /** Le tir lourd : une colonne de plasma qui balaie tout devant le vaisseau. */
    lacherRayon() {
        this.rayon = 26;
        this.secousse = 10;
        this.mot('Rayon lourd !', 'ok');
    }

    frapperAuRayon() {
        const demi = 26 + this.puissance * 6;
        this.ennemis.forEach(e => {
            if (!e.vivant || Math.abs(e.x - this.vaisseau.x) > demi || e.y > this.vaisseau.y) return;
            e.pv -= 2;
            if (e.pv <= 0) {
                e.vivant = false;
                this.score += 15;
                this.exploser(e.x, e.y, '#a5f3fc', 20);
            }
        });
        // Le rayon nettoie aussi les projectiles : c'est ce qui en fait une
        // porte de sortie quand on est acculé.
        this.tirsEnnemis.forEach(t => {
            if (Math.abs(t.x - this.vaisseau.x) < demi && t.y < this.vaisseau.y) t.mort = true;
        });
    }

    tirerJoueur() {
        const { x, y } = this.vaisseau;
        const ecarts = this.puissance === 1 ? [0] : this.puissance === 2 ? [-9, 9] : [-13, 0, 13];
        ecarts.forEach(e => this.tirs.push({ x: x + e, y: y - 16, v: 11 }));
    }

    majEnnemis() {
        const h = this.canvas.height;
        this.ennemis.forEach(e => {
            e.t++;
            if (e.t < 0) return;              // il attend son tour dans le serpent
            this.placerEnnemi(e);
            if (--e.tir <= 0 && e.y > 0 && e.y < h * 0.7 && !this.porte) {
                e.tir = 150 + Math.floor(Math.random() * 200);
                // Le tir vise le joueur : c'est ce qui oblige à bouger.
                const dx = this.vaisseau.x - e.x, dy = this.vaisseau.y - e.y;
                const d = Math.max(1, Math.hypot(dx, dy));
                const v = 2.2 + this.niveau * 0.2;
                this.tirsEnnemis.push({ x: e.x, y: e.y + e.taille / 2, vx: dx / d * v, vy: dy / d * v });
            }
            if (e.y > h + 60) e.vivant = false;
        });

        this.tirs.forEach(t => {
            t.y -= t.v;
            for (const e of this.ennemis) {
                if (!e.vivant || t.mort) continue;
                if (Math.abs(t.x - e.x) < e.taille * 0.6 && Math.abs(t.y - e.y) < e.taille * 0.6) {
                    t.mort = true;
                    if (--e.pv <= 0) {
                        e.vivant = false;
                        this.score += 15;
                        this.exploser(e.x, e.y, '#f59e0b', 18);
                        if (Math.random() < 0.12) this.bonus.push({ x: e.x, y: e.y, v: 1.6, genre: Math.random() < 0.5 ? 'arme' : 'vie' });
                    } else this.exploser(e.x, e.y, '#fde68a', 5);
                }
            }
        });
        this.tirs = this.tirs.filter(t => !t.mort && t.y > -20);
        this.ennemis = this.ennemis.filter(e => e.vivant);
        this.majHud();
    }

    majTirs() {
        const h = this.canvas.height, v = this.vaisseau;
        this.tirsEnnemis.forEach(t => {
            t.x += t.vx || 0; t.y += t.vy != null ? t.vy : t.v;
            if (Math.abs(t.x - v.x) < 15 && Math.abs(t.y - v.y) < 17) {
                t.mort = true;
                this.exploser(v.x, v.y, '#f87171', 14);
                this.secousse = 16;
                this.perdreUneVie();
            }
        });
        this.tirsEnnemis = this.tirsEnnemis.filter(t => !t.mort && t.y < h + 20 && t.y > -40
            && t.x > -40 && t.x < this.canvas.width + 40);
    }

    majPorte() {
        const p = this.porte, v = this.vaisseau;
        if (!p) return;
        p.y += 1.7;
        if (!p.reglee && v.y > p.y && v.y < p.y + p.h) {
            const w = this.canvas.width;
            const passe = p.portes.find(o => v.x >= o.x0 * w + 6 && v.x <= o.x1 * w - 6);
            if (passe) this.franchir(passe);
            else this.heurterMur();
        }
        if (p.y > this.canvas.height + 40) this.porte = null;
    }

    majBonus() {
        const h = this.canvas.height, v = this.vaisseau;
        this.bonus.forEach(b => {
            b.y += b.v;
            if (Math.abs(b.x - v.x) < 22 && Math.abs(b.y - v.y) < 22) {
                b.pris = true;
                if (b.genre === 'arme') { this.puissance = Math.min(3, this.puissance + 1); this.mot('Canon amélioré !', 'ok'); }
                else { this.vies = Math.min(this.viesMax + 2, this.vies + 1); this.majHud(); this.mot('Réparation !', 'ok'); }
            }
        });
        this.bonus = this.bonus.filter(b => !b.pris && b.y < h + 20);
    }

    exploser(x, y, couleur, n = 16) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 4;
            this.particules.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vie: 22 + Math.random() * 14, couleur });
        }
    }

    // --- Dessin ---------------------------------------------------------------

    dessiner() {
        const c = this.ctx, w = this.canvas.width, h = this.canvas.height, s = this.secteur;
        c.save();
        if (this.secousse > 0) c.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);

        const fond = c.createLinearGradient(0, 0, 0, h);
        fond.addColorStop(0, s.ciel[0]); fond.addColorStop(1, s.ciel[1]);
        c.fillStyle = fond; c.fillRect(-10, -10, w + 20, h + 20);

        // Astres lointains : de grands disques diffus qui descendent très
        // lentement. Ils donnent l'échelle du secteur.
        this.astres.forEach(a => {
            const g = c.createRadialGradient(a.x, a.y, 1, a.x, a.y, a.r);
            g.addColorStop(0, s.teinte + '55'); g.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = g; c.beginPath(); c.arc(a.x, a.y, a.r, 0, Math.PI * 2); c.fill();
        });

        this.couches.forEach(couche => {
            c.globalAlpha = couche.alpha; c.fillStyle = s.astre;
            couche.etoiles.forEach(e => c.fillRect(e.x, e.y, e.r, e.r * (1 + e.v)));
        });
        c.globalAlpha = 1;

        this.planetes.forEach(pl => this.dessinerPlanete(pl, s));
        c.save();
        c.globalAlpha = 0.5; c.fillStyle = '#0f172a'; c.strokeStyle = s.astre;
        c.lineWidth = 1;
        this.debris.forEach(d => {
            c.save(); c.translate(d.x, d.y); c.rotate(d.a);
            c.beginPath();
            for (let i = 0; i < 6; i++) {
                const ang = i * Math.PI / 3, rr = d.r * (0.7 + ((i * 37) % 10) / 22);
                i ? c.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr)
                    : c.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
            }
            c.closePath(); c.fill(); c.stroke(); c.restore();
        });
        c.restore();

        this.bonus.forEach(b => this.dessinerBonus(b));
        this.ennemis.forEach(e => this.dessinerEnnemi(e));

        c.fillStyle = '#fde047';
        this.tirs.forEach(t => { c.fillRect(t.x - 1.6, t.y - 13, 3.2, 15); });
        c.fillStyle = '#fb7185';
        this.tirsEnnemis.forEach(t => { c.beginPath(); c.arc(t.x, t.y, 4, 0, Math.PI * 2); c.fill(); });

        if (this.rayon > 0) this.dessinerRayon();
        if (this.porte) this.dessinerPorte();

        this.particules.forEach(p => {
            c.globalAlpha = Math.min(1, p.vie / 22); c.fillStyle = p.couleur;
            c.fillRect(p.x - 2, p.y - 2, 4, 4);
        });
        c.globalAlpha = 1;

        this.dessinerVaisseau();
        if (this.message) this.dessinerMessage();
        if (this.phase !== 'jeu' && !this.isDemo) this.dessinerBriefing();
        c.restore();
    }

    /** Une planète : disque ombré, terminateur, et parfois des anneaux. */
    dessinerPlanete(pl, s) {
        const c = this.ctx;
        c.save();
        c.globalAlpha = 0.55;
        if (pl.anneau) {
            c.save();
            c.translate(pl.x, pl.y); c.rotate(pl.incline);
            c.strokeStyle = s.teinte; c.lineWidth = Math.max(2, pl.r * 0.09);
            c.beginPath(); c.ellipse(0, 0, pl.r * 1.75, pl.r * 0.42, 0, 0, Math.PI * 2); c.stroke();
            c.restore();
        }
        const g = c.createRadialGradient(pl.x - pl.r * 0.35, pl.y - pl.r * 0.35, pl.r * 0.15,
            pl.x, pl.y, pl.r);
        g.addColorStop(0, s.astre); g.addColorStop(0.55, s.teinte); g.addColorStop(1, '#020617');
        c.fillStyle = g;
        c.beginPath(); c.arc(pl.x, pl.y, pl.r, 0, Math.PI * 2); c.fill();
        c.restore();
    }

    dessinerEnnemi(e) {
        const c = this.ctx, r = e.taille / 2;
        c.save(); c.translate(e.x, e.y);
        c.shadowColor = 'rgba(244,63,94,.7)'; c.shadowBlur = 12;
        c.fillStyle = '#be123c';
        c.beginPath();
        c.moveTo(0, r); c.lineTo(r, -r * 0.4); c.lineTo(r * 0.4, -r);
        c.lineTo(-r * 0.4, -r); c.lineTo(-r, -r * 0.4); c.closePath(); c.fill();
        c.shadowBlur = 0;
        c.fillStyle = '#fda4af';
        c.beginPath(); c.arc(0, -r * 0.15, r * 0.3, 0, Math.PI * 2); c.fill();
        c.restore();
    }

    dessinerVaisseau() {
        const c = this.ctx, v = this.vaisseau;
        c.save(); c.translate(v.x, v.y); c.rotate(v.roulis * 0.35);
        // Réacteurs : deux flammes qui vacillent, dessinées avant la coque
        // pour qu'elles en sortent au lieu de flotter dessus.
        const f = 10 + Math.random() * 10;
        [-7, 7].forEach(dx => {
            const g = c.createLinearGradient(dx, 10, dx, 10 + f);
            g.addColorStop(0, 'rgba(251,191,36,.95)'); g.addColorStop(1, 'rgba(239,68,68,0)');
            c.fillStyle = g;
            c.beginPath(); c.moveTo(dx - 4, 10); c.lineTo(dx, 10 + f); c.lineTo(dx + 4, 10); c.closePath(); c.fill();
        });
        c.shadowColor = 'rgba(34,211,238,.9)'; c.shadowBlur = 14;
        c.fillStyle = '#22d3ee';
        c.beginPath();
        c.moveTo(0, -22); c.lineTo(9, 2); c.lineTo(18, 12); c.lineTo(6, 10);
        c.lineTo(0, 14); c.lineTo(-6, 10); c.lineTo(-18, 12); c.lineTo(-9, 2);
        c.closePath(); c.fill();
        c.shadowBlur = 0;
        c.fillStyle = '#e0f2fe';
        c.beginPath(); c.ellipse(0, -6, 3.4, 6, 0, 0, Math.PI * 2); c.fill();
        if (this.bouclier > 0) {
            c.strokeStyle = `rgba(34,211,238,${0.35 + 0.3 * Math.sin(this.frame / 6)})`;
            c.lineWidth = 2.4;
            c.beginPath(); c.arc(0, -2, 27, 0, Math.PI * 2); c.stroke();
        }
        // Anneau de charge : il se referme au fur et à mesure, et devient
        // blanc quand le tir lourd est prêt. On sait sans quitter l'action.
        if (this.charge > 0) {
            const pret = this.charge >= 1;
            c.strokeStyle = pret ? '#f0f9ff' : 'rgba(250,204,21,.9)';
            c.lineWidth = pret ? 4 : 3;
            c.beginPath();
            c.arc(0, -2, 21, -Math.PI / 2, -Math.PI / 2 + this.charge * Math.PI * 2);
            c.stroke();
            if (pret) {
                c.fillStyle = `rgba(240,249,255,${0.25 + 0.2 * Math.sin(this.frame / 4)})`;
                c.beginPath(); c.arc(0, -2, 14, 0, Math.PI * 2); c.fill();
            }
        }
        c.restore();
    }

    /** Le rayon lourd : une colonne de plasma qui monte du vaisseau. */
    dessinerRayon() {
        const c = this.ctx, v = this.vaisseau;
        const demi = 26 + this.puissance * 6;
        const k = this.rayon / 26;
        c.save();
        c.globalAlpha = 0.35 + 0.5 * k;
        const g = c.createLinearGradient(v.x - demi, 0, v.x + demi, 0);
        g.addColorStop(0, 'rgba(34,211,238,0)');
        g.addColorStop(0.5, 'rgba(224,242,254,.95)');
        g.addColorStop(1, 'rgba(34,211,238,0)');
        c.fillStyle = g;
        c.fillRect(v.x - demi, 0, demi * 2, v.y - 12);
        c.globalAlpha = 0.9 * k;
        c.fillStyle = '#f0f9ff';
        c.fillRect(v.x - 3, 0, 6, v.y - 12);
        c.restore();
    }

    dessinerBonus(b) {
        const c = this.ctx;
        c.save(); c.translate(b.x, b.y);
        c.rotate(this.frame / 22);
        c.fillStyle = b.genre === 'arme' ? '#a3e635' : '#f472b6';
        c.shadowColor = c.fillStyle; c.shadowBlur = 12;
        c.fillRect(-9, -9, 18, 18);
        c.shadowBlur = 0;
        c.fillStyle = '#0f172a';
        c.font = '900 13px "Inter", system-ui, sans-serif';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.rotate(-this.frame / 22);
        c.fillText(b.genre === 'arme' ? '»' : '+', 0, 1);
        c.restore();
    }

    /** Le mur et ses trois ouvertures, avec la question au-dessus. */
    dessinerPorte() {
        const c = this.ctx, w = this.canvas.width, p = this.porte;
        c.save();
        // La question flotte AU-DESSUS du mur : on la lit en le voyant venir,
        // donc on a le temps de choisir sa trajectoire.
        const qy = p.y - 40;
        if (qy > 0) {
            c.font = `900 ${Math.max(22, Math.min(40, w * 0.085))}px 'Inter', system-ui, sans-serif`;
            c.textAlign = 'center'; c.textBaseline = 'middle';
            c.fillStyle = 'rgba(2,6,23,.7)';
            const lw = c.measureText(`${p.question} = ?`).width;
            c.beginPath(); c.roundRect(w / 2 - lw / 2 - 16, qy - 22, lw + 32, 44, 12); c.fill();
            c.strokeStyle = '#22d3ee'; c.lineWidth = 2; c.stroke();
            c.fillStyle = '#e0f2fe'; c.fillText(`${p.question} = ?`, w / 2, qy);
        }

        const pulse = 0.5 + 0.5 * Math.sin(this.frame / 7);
        p.portes.forEach((o) => {
            const x0 = o.x0 * w, x1 = o.x1 * w, larg = x1 - x0;
            const M = Math.max(9, larg * 0.075);          // épaisseur d'un montant

            // Les MONTANTS : acier brossé, biseau clair en haut, ombre en bas,
            // et une bande d'avertissement rayée — c'est ce qui fait « porte
            // blindée » plutôt que « rectangle ».
            [x0, x1 - M].forEach(mx => {
                const g = c.createLinearGradient(mx, 0, mx + M, 0);
                g.addColorStop(0, '#1e293b'); g.addColorStop(0.45, '#64748b');
                g.addColorStop(0.55, '#475569'); g.addColorStop(1, '#0f172a');
                c.fillStyle = g; c.fillRect(mx, p.y, M, p.h);
                c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(mx, p.y, M, 3);
                c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(mx, p.y + p.h - 3, M, 3);
                // Rivets
                c.fillStyle = 'rgba(226,232,240,.55)';
                for (let ry = p.y + 12; ry < p.y + p.h - 8; ry += 18) {
                    c.beginPath(); c.arc(mx + M / 2, ry, 1.7, 0, Math.PI * 2); c.fill();
                }
            });
            // Bandes d'avertissement en haut et en bas de l'ouverture.
            c.save();
            c.beginPath(); c.rect(x0 + M, p.y, larg - 2 * M, p.h); c.clip();
            c.strokeStyle = 'rgba(250,204,21,.55)'; c.lineWidth = 5;
            for (let s = -p.h; s < larg + p.h; s += 16) {
                c.beginPath(); c.moveTo(x0 + M + s, p.y); c.lineTo(x0 + M + s - 8, p.y + 8); c.stroke();
                c.beginPath(); c.moveTo(x0 + M + s, p.y + p.h); c.lineTo(x0 + M + s - 8, p.y + p.h - 8); c.stroke();
            }
            c.restore();

            // Le champ d'énergie de l'ouverture : un dégradé qui palpite.
            const inX = x0 + M, inW = larg - 2 * M;
            const champ = c.createLinearGradient(0, p.y, 0, p.y + p.h);
            champ.addColorStop(0, `rgba(56,189,248,${0.05 + 0.10 * pulse})`);
            champ.addColorStop(0.5, `rgba(56,189,248,${0.20 + 0.16 * pulse})`);
            champ.addColorStop(1, `rgba(56,189,248,${0.05 + 0.10 * pulse})`);
            c.fillStyle = champ; c.fillRect(inX, p.y + 8, inW, p.h - 16);
            c.strokeStyle = `rgba(125,211,252,${0.55 + 0.35 * pulse})`; c.lineWidth = 2;
            c.strokeRect(inX + 1, p.y + 8, inW - 2, p.h - 16);

            // Le nombre, gravé : ombre portée puis contour clair.
            const cx = (x0 + x1) / 2, cy = p.y + p.h / 2;
            c.font = `900 ${Math.max(22, Math.min(38, w * 0.078))}px 'Inter', system-ui, sans-serif`;
            c.textAlign = 'center'; c.textBaseline = 'middle';
            c.fillStyle = 'rgba(2,6,23,.75)'; c.fillText(String(o.v), cx, cy + 2);
            c.shadowColor = 'rgba(125,211,252,.9)'; c.shadowBlur = 12;
            c.fillStyle = '#f0f9ff'; c.fillText(String(o.v), cx, cy);
            c.shadowBlur = 0;
        });
        c.restore();
    }

    dessinerMessage() {
        const c = this.ctx, w = this.canvas.width, m = this.message;
        c.save();
        c.globalAlpha = Math.min(1, m.vie / 28);
        c.font = `800 ${Math.max(13, Math.min(19, w * 0.04))}px 'Inter', system-ui, sans-serif`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        const lw = c.measureText(m.texte).width;
        const bw = Math.min(w - 20, lw + 30), bh = 34;
        const bx = (w - bw) / 2, by = this.vaisseau.y - 82;
        c.fillStyle = 'rgba(2,6,23,.88)';
        c.beginPath(); c.roundRect(bx, by, bw, bh, 10); c.fill();
        c.strokeStyle = m.ton === 'ok' ? '#22d3ee' : '#f87171'; c.lineWidth = 2; c.stroke();
        c.fillStyle = '#fff'; c.fillText(m.texte, w / 2, by + bh / 2);
        c.restore();
    }

    dessinerBriefing() {
        const c = this.ctx, w = this.canvas.width, h = this.canvas.height;
        c.save();
        c.fillStyle = 'rgba(2,6,23,.8)'; c.fillRect(0, 0, w, h);
        c.textAlign = 'center'; c.textBaseline = 'middle';
        const dispo = w - 28;
        const T = (txt, y, taille, couleur, gras = 900) => {
            let px = Math.round(taille);
            c.font = `${gras} ${px}px 'Inter', system-ui, sans-serif`;
            while (px > 9 && c.measureText(txt).width > dispo) {
                px -= 1; c.font = `${gras} ${px}px 'Inter', system-ui, sans-serif`;
            }
            c.fillStyle = couleur; c.fillText(txt, w / 2, y);
        };
        const u = Math.min(w, h);
        if (this.phase === 'briefing') {
            T('N O V A', h * 0.2, u * 0.1, '#22d3ee');
            T('Glisse pour piloter. Le canon tire tout seul.', h * 0.33, u * 0.05, '#e2e8f0');
            T('Garde le doigt POSÉ : tu charges le rayon lourd', h * 0.41, u * 0.046, '#a5f3fc', 800);
            T('(mais le canon ralentit pendant la charge).', h * 0.47, u * 0.042, '#94a3b8', 700);
            T('Des MURS barrent le secteur :', h * 0.6, u * 0.05, '#fcd34d', 800);
            T('passe par la porte du bon résultat.', h * 0.665, u * 0.05, '#fcd34d', 800);
            T('Bonne porte = bouclier · mauvaise = dégâts', h * 0.78, u * 0.04, '#94a3b8', 700);
        } else {
            T(this.compte > 0 ? String(this.compte) : 'GO !', h * 0.46,
                u * (this.compte > 0 ? 0.26 : 0.18), this.compte > 0 ? '#e2e8f0' : '#22d3ee');
        }
        c.restore();
    }

    // --- Démonstration --------------------------------------------------------

    runDemoSequence() {
        this.startGameLoop();
        this.demoGate = createDemoGate(this.container);
        this.demoCursor = createDemoCursor();
        this.jouerDemo();
    }

    async jouerDemo() {
        const cur = this.demoCursor, gate = this.demoGate;
        const fin = () => { cur.hideBubble(); gate.destroy(); };

        if (!await cur.pause(700) || !this.isRunning) return fin();
        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Le canon tire tout seul : mon doigt ne sert qu\'à piloter. Mais si je le laisse POSÉ, je charge un rayon lourd — et pendant ce temps le canon ralentit.', this.arene);
        this.lancerVague();
        if (!await cur.pause(2400) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        this.lancerPorte();
        const p = this.porte;
        cur.say(`Un mur ! La question est ${p.question}. Trois portes, un seul bon résultat.`, this.arene);
        if (!await cur.pause(2600) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say(`${p.question} = ${p.bon}. Je vise la porte ${p.bon} et je m'y glisse.`, this.arene);
        const cible = p.portes.find(o => o.v === p.bon);
        if (cible) this.vaisseau.cible = (cible.x0 + cible.x1) / 2 * this.canvas.width;
        if (!await cur.pause(DEMO_SPEED.between + 2200) || !this.isRunning) return fin();
        cur.say('Bonne porte : bouclier rechargé et canon renforcé. Mauvaise porte : on encaisse.', this.arene);
        if (!await cur.pause(DEMO_SPEED.between + 1500) || !this.isRunning) return fin();
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

export function engineNova(container, isDemo, params) {
    const jeu = new Nova(container, isDemo, params);
    jeu.start();
    return jeu;
}
