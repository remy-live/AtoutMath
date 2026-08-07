// NOVA — shoot'em up vertical, façon Tyrian.
//
// Un vrai jeu d'arcade, pas un exercice déguisé : tir automatique, vagues
// d'ennemis en formation, tirs adverses à esquiver, explosions, bonus. On
// joue pour jouer.
//
// Le calcul entre par TROIS chemins :
//   - les PORTES : un mur blindé barre le secteur, trois ouvertures
//     numérotées, une question en grand — on répond en pilotant ;
//   - les CONVOIS CODÉS : trois transports blindés traversent le haut de
//     l'écran, chacun porte un nombre, un seul est le bon résultat. Le canon
//     étant automatique, VISER c'est SE PLACER : on répond en se glissant
//     sous le bon transport. Les coques encaissent plusieurs impacts, si bien
//     qu'une balle perdue ne compte pas — seule la destruction est un choix.
//   - le GARDIEN, qui ferme chaque secteur : invulnérable au canon, il lâche
//     des sphères numérotées toutes identiques sous une consigne — « abats
//     les multiples de 3, évite les autres ». Comme le canon tire seul,
//     abattre c'est se placer dessous et éviter c'est changer de colonne :
//     la même seconde demande un calcul ET une décision opposée à l'autre.
//
// Entre deux secteurs, l'ATELIER dépense les CRÉDITS gagnés : canon, coque,
// bombes, aimant à bonus, blindage. Un bonus ramassé s'évapore à la première
// faute ; un équipement acheté reste. C'est ce qui récompense la durée.
//
// L'arsenal du joueur tient en un doigt, mais il a trois étages :
//   - le canon automatique (piloter suffit) ;
//   - le RAYON LOURD : garder le doigt posé le charge, le relâcher le tire —
//     et pendant la charge le canon ordinaire ralentit ;
//   - la BOMBE NOVA : ramassée en bonus, déclenchée d'une DOUBLE TAPE — une
//     onde qui balaie tout l'écran quand on est submergé.
//
// La difficulté MONTE : deux épreuves, puis le Gardien, puis le secteur
// suivant — vagues plus denses, tirs plus vifs et appareils nouveaux :
// chasseurs, plongeurs kamikazes, blindés à tir en éventail, tireurs d'élite
// qui campent en haut, intercepteurs qui traversent à l'horizontale, pondeuses
// qui se scindent en mourant. Et un appareil PERCUTÉ fait des dégâts : rester
// immobile n'est plus une option.
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

// Nombre d'épreuves de calcul (portes ou convois) avant que le GARDIEN du
// secteur ne se présente. Deux : assez pour installer le rythme, assez peu
// pour que le boss ne se fasse pas attendre.
const EPREUVES_PAR_SECTEUR = 2;

/**
 * Les DUELS du Gardien.
 *
 * Le boss ne se tire pas dessus : il est invulnérable et lâche des sphères
 * numérotées, toutes identiques. Une consigne dit lesquelles abattre — et
 * comme le canon est automatique, ABATTRE c'est SE PLACER dessous, ÉVITER
 * c'est changer de colonne. Le même doigt, la même question, deux réponses
 * opposées : c'est tout le duel.
 *
 * `test(n)` dit si la sphère est une cible ; tout le reste est une mine.
 */
const DUELS = [
    { libelle: 'les nombres PAIRS', test: n => n % 2 === 0 },
    { libelle: 'les nombres IMPAIRS', test: n => n % 2 === 1 },
    { libelle: 'les multiples de 5', test: n => n % 5 === 0 },
    { libelle: 'les multiples de 10', test: n => n % 10 === 0 },
    { libelle: 'les nombres plus grands que 50', test: n => n > 50 }
];

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
        this.convoi = null;
        this.boss = null;
        this.orbes = [];
        this.atelier = null;
        this.portail = null;           // l'anneau qui mène à la Faille
        this.faille = null;            // l'épreuve bonus en cours
        this.failleFaite = false;      // une seule faille par secteur
        this.epreuves = 0;             // épreuves réglées dans ce secteur
        this.prochainCalc = 'porte';   // portes et convois alternent
        this.message = null;
        this.bouclier = 0;
        this.puissance = 1;
        this.bombes = 1;               // une bombe NOVA de départ, pour l'apprendre

        // L'ÉQUIPEMENT, acheté à l'atelier entre deux secteurs. Il survit aux
        // erreurs, contrairement à `puissance` : c'est la différence entre un
        // ramassage et un investissement.
        this.credits = 0;              // monnaie de l'atelier (≠ score)
        this.canonBase = 1;            // niveau de canon garanti après une faute
        this.aimant = 0;               // les bonus viennent au vaisseau
        this.blindage = 0;             // bouclier offert à chaque nouveau secteur
        this.novaOnde = null;
        this.multi = 0;                // frames restantes de score doublé
        this.dernierTap = 0;
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
        this.astuceDite = false;       // le rappel des gestes, une seule fois
        // …et son RÉGLAGE.
        //
        // LES DEUX ZONES SONT LA VALEUR PAR DÉFAUT. Elles ont d'abord été
        // livrées derrière un bouton laissé sur « tir auto » : autant dire
        // qu'elles n'existaient pas — personne ne va chercher une pastille de
        // douze pixels dans le bandeau pour découvrir une mécanique dont on ne
        // lui a pas parlé.
        //
        // Et elles valent mieux que le tir permanent : NE PAS tirer devient
        // une décision. Devant un mur ou un Gardien, abattre la mauvaise
        // chose coûte cher ; pouvoir se faufiler sans tirer donne enfin une
        // réponse au « je ne suis pas sûr ». « ⚡ tir auto » reste à un appui
        // pour qui préfère l'ancien comportement.
        this.tirManuel = true;
        try {
            const choix = localStorage.getItem('nova-tir');
            if (choix) this.tirManuel = choix === 'doigt';
        } catch (e) { /* mode privé */ }

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
                .nv-bombes { color: #fcd34d; font-size: .95rem; flex-shrink: 0; letter-spacing: 1px; }
                .nv-credits { color: #67e8f9; font-weight: 800; font-size: .85rem; flex-shrink: 0;
                    font-variant-numeric: tabular-nums; }
                .nv-score { color: #fcd34d; font-weight: 900; font-size: 1rem; flex-shrink: 0;
                    font-variant-numeric: tabular-nums; }
                .nv-tir { pointer-events: auto; flex-shrink: 0; cursor: pointer;
                    background: rgba(15,23,42,.75); border: 1.5px solid #38bdf8; color: #bae6fd;
                    border-radius: 999px; padding: 3px 9px; font-size: .72rem; font-weight: 800;
                    font-family: inherit; white-space: nowrap; }
                .nv-tir:active { transform: translateY(1px); }
            </style>
            <div class="nv-arene">
                <canvas class="nv-canvas"></canvas>
                <div class="nv-hud">
                    <div class="nv-secteur" data-secteur></div>
                    <button type="button" class="nv-tir" data-tir
                        title="Mode de tir : automatique, ou seulement quand le doigt touche l'écran"></button>
                    <div class="nv-vies" data-vies></div>
                    <div class="nv-bombes" data-bombes title="Bombes NOVA — double-tape pour déclencher"></div>
                    <div class="nv-credits" data-credits title="Crédits — à dépenser à l'atelier entre deux secteurs">⬢ 0</div>
                    <div class="nv-score" data-score>0</div>
                </div>
            </div>`;

        this.arene = this.container.querySelector('.nv-arene');
        this.canvas = this.container.querySelector('.nv-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ui = {
            vies: this.container.querySelector('[data-vies]'),
            score: this.container.querySelector('[data-score]'),
            secteur: this.container.querySelector('[data-secteur]'),
            bombes: this.container.querySelector('[data-bombes]'),
            credits: this.container.querySelector('[data-credits]'),
            tir: this.container.querySelector('[data-tir]')
        };
        // Le bouton vit DANS l'arène : sans arrêter la propagation, l'appui
        // qui change le mode de tir pilotait aussi le vaisseau, et deux appuis
        // rapides déclenchaient une bombe.
        if (this.ui.tir) {
            this.ui.tir.addEventListener('pointerdown', e => e.stopPropagation());
            this.ui.tir.addEventListener('click', e => { e.stopPropagation(); this.basculerTir(); });
        }
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
        if (this.ui.score) this.ui.score.textContent = this.score + (this.multi > 0 ? ' ×2' : '');
        if (this.ui.secteur) this.ui.secteur.textContent = `Secteur ${this.niveau + 1} · ${this.secteur.nom}`;
        if (this.ui.bombes) this.ui.bombes.textContent = '✹'.repeat(Math.max(0, this.bombes));
        if (this.ui.credits) this.ui.credits.textContent = '⬢ ' + this.credits;
        if (this.ui.tir) this.ui.tir.textContent = this.tirManuel ? '✋ deux zones' : '⚡ tir auto';
    }

    basculerTir() {
        this.tirManuel = !this.tirManuel;
        try { localStorage.setItem('nova-tir', this.tirManuel ? 'doigt' : 'auto'); } catch (e) { /* mode privé */ }
        this.majHud();
        this.mot(this.tirManuel
            ? 'Deux zones : en bas on pilote, on remonte le doigt et ça tire.'
            : 'Tir automatique : le doigt ne sert qu\'à piloter.', 'ok');
    }

    /**
     * DEUX ZONES, une seule main.
     *
     * En mode « ✋ deux zones », l'écran se coupe en deux à hauteur du
     * vaisseau : le doigt posé EN BAS ne fait que piloter — on se faufile
     * sans tirer, ce qui compte pour un duel de Gardien ou un mur, où abattre
     * la mauvaise chose coûte cher. Remonter un peu le doigt met le canon en
     * marche, sans lâcher le pilotage. Aucun bouton posé sur le jeu, et le
     * geste reste continu.
     */
    ligneDeTir() {
        const h = this.canvas ? this.canvas.height : 600;
        const y = this.vaisseau ? this.vaisseau.y : h * 0.85;
        return y - Math.max(30, h * 0.07);
    }

    doigtEnZoneDeTir() {
        return this.doigtPose && this.doigtY != null && this.doigtY < this.ligneDeTir();
    }

    /**
     * Tous les gains passent ici : le multiplicateur ×2 s'applique d'un coup,
     * et chaque point marqué vaut aussi un CRÉDIT. Le score raconte la partie,
     * les crédits achètent le vaisseau — et les dépenser n'efface pas l'exploit.
     */
    gagner(pts) {
        const gain = this.multi > 0 ? pts * 2 : pts;
        this.score += gain;
        this.credits += gain;
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

    /**
     * L'écran titre ATTEND. Il s'enchaînait tout seul au bout de 2,8 s : le
     * temps de lire « glisse pour piloter », le décompte était déjà passé. Un
     * briefing qui explique quatre mécaniques ne se lit pas au chronomètre —
     * c'est au joueur de dire quand il a fini.
     */
    lancerBriefing() {
        this.phase = 'briefing';
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
            const p0 = pos(e);

            // L'écran titre part au doigt, pas au chronomètre. On accepte
            // l'appui PARTOUT : sur un téléphone, viser un rectangle de 44 px
            // pour commencer à jouer est une brimade.
            if (this.phase === 'briefing') { this.decompte(3); return; }
            // L'atelier : chaque offre est une zone, plus le bouton de départ.
            if (this.phase === 'atelier') { this.toucherAtelier(p0); return; }
            if (this.phase !== 'jeu') return;

            depart = p0; bouge = 0;
            this.vaisseau.cible = depart.x;
            this.doigtPose = true;
            this.doigtY = p0.y;
            // DOUBLE TAPE = bombe NOVA. Le seul geste qui restait libre : un
            // appui simple pilote, un appui long charge, deux appuis brefs
            // déclenchent l'onde. Rien à viser — c'est l'arme de panique.
            const maintenant = performance.now();
            if (maintenant - this.dernierTap < 320 && this.phase === 'jeu') this.declencherNova();
            this.dernierTap = maintenant;
        };
        this.onMove = (e) => {
            if (!this.isRunning || !depart) return;
            const p = pos(e);
            bouge = Math.max(bouge, Math.abs(p.x - depart.x));
            this.vaisseau.cible = p.x;
            this.doigtY = p.y;
        };
        this.onUp = () => {
            depart = null;
            this.doigtPose = false;
            this.doigtY = null;
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
    /**
     * Le GENRE d'une vague : quatre familles d'appareils, qui arrivent avec
     * les secteurs. On les reconnaît à la silhouette avant de connaître leur
     * comportement — c'est la grammaire du shmup :
     *   - CHASSEUR (rouge)   : la base, tir simple visé ;
     *   - PLONGEUR (orange)  : ne tire jamais, se cale sur toi puis PIQUE —
     *                          c'est lui qui interdit de rester immobile ;
     *   - BLINDÉ (violet)    : lent, encaisse, tire en éventail, lâche
     *                          toujours un bonus en mourant ;
     *   - TIREUR (vert)      : campe en haut de l'écran et mitraille, puis
     *                          repart. On va le chercher, ou on subit.
     *   - INTERCEPTEUR (bleu): traverse l'écran à l'HORIZONTALE, très vite,
     *                          sans tirer. Il coupe la route, littéralement.
     *   - PONDEUSE (rose)    : grosse, molle — mais elle se SCINDE en deux
     *                          petits chasseurs quand on la crève. La tuer au
     *                          mauvais moment, c'est s'en créer deux.
     */
    lancerVague() {
        const w = this.canvas.width;
        const genres = ['chasseur'];
        if (this.niveau >= 1) genres.push('plongeur', 'intercepteur');
        if (this.niveau >= 2) genres.push('blinde', 'tireur');
        if (this.niveau >= 3) genres.push('pondeuse', 'chasseur');   // densité et nouveauté
        const genre = genres[Math.floor(Math.random() * genres.length)];

        const figures = ['descente', 'zigzag', 'boucle', 'carrousel', 'pique', 'serpent'];
        const figure = genre === 'blinde' ? 'descente'
            : genre === 'tireur' ? 'zigzag'
                : figures[Math.floor(Math.random() * figures.length)];
        const n = genre === 'blinde' ? 2
            : genre === 'pondeuse' ? 2
                : genre === 'intercepteur' ? 2 + Math.floor(Math.random() * 2)
                    : genre === 'plongeur' ? 2 + Math.floor(this.niveau / 2)
                        : figure === 'carrousel' ? 6 : 3 + Math.floor(Math.random() * 3);
        const taille = (genre === 'blinde' ? 1.5 : genre === 'pondeuse' ? 1.35 : 1)
            * Math.max(22, Math.min(34, w * 0.075));
        const marge = taille * 1.8;
        const large = w - 2 * marge;
        const sens = Math.random() < 0.5 ? 1 : -1;
        const vitesse = (genre === 'blinde' ? 0.45 : genre === 'pondeuse' ? 0.5 : 0.9)
            + this.niveau * 0.1;
        const base = marge + Math.random() * large;
        // L'intercepteur entre par un CÔTÉ, à une hauteur tirée dans la moitié
        // basse : c'est là qu'il gêne, juste au-dessus du vaisseau.
        const couloir = this.canvas.height * (0.42 + Math.random() * 0.33);

        for (let i = 0; i < n; i++) {
            const part = n === 1 ? 0.5 : i / (n - 1);
            const retard = figure === 'serpent' ? i * 26
                : genre === 'intercepteur' ? i * 40
                    : figure === 'carrousel' ? 0 : i * 10;
            this.ennemis.push({
                genre, figure, part, sens, retard, taille, base, large, marge,
                t: -retard,
                pv: genre === 'blinde' ? 4 + this.niveau
                    : genre === 'pondeuse' ? 3 + Math.floor(this.niveau / 2)
                        : 1 + Math.floor(this.niveau / 2),
                vitesse,
                x: base, y: -taille,
                couloir: couloir + i * taille * 1.6,
                mode: 'vol',                       // le plongeur passera en 'pique'
                tir: 70 + Math.floor(Math.random() * 150),
                vivant: true
            });
        }
    }

    /**
     * La pondeuse crevée se scinde : deux petits chasseurs partent en biais.
     * On les crée à la main plutôt que par `lancerVague` — ils n'ont ni
     * chorégraphie ni formation, juste une trajectoire d'éclat.
     */
    scinder(mere) {
        [-1, 1].forEach(sens => {
            this.ennemis.push({
                genre: 'chasseur', figure: 'descente', part: 0.5, sens,
                retard: 0, taille: mere.taille * 0.55, base: mere.x,
                large: mere.large, marge: mere.marge,
                t: 0, pv: 1, vitesse: 1.5,
                x: mere.x, y: mere.y, eclat: { vx: sens * 1.9, vy: 1.5 },
                mode: 'vol', tir: 90 + Math.floor(Math.random() * 90), vivant: true
            });
        });
    }

    /** Position d'un appareil selon sa chorégraphie et son âge. */
    placerEnnemi(e) {
        const w = this.canvas.width, h = this.canvas.height;

        // Les éclats d'une pondeuse ne suivent rien : ils partent en biais.
        if (e.eclat) { e.x += e.eclat.vx; e.y += e.eclat.vy; e.eclat.vy += 0.02; return; }

        // L'INTERCEPTEUR traverse à l'horizontale, très vite, sans tirer :
        // il barre le couloir au lieu de le mitrailler. On l'esquive par le
        // haut ou par le bas, pas en reculant.
        if (e.genre === 'intercepteur') {
            const v = 5.5 + this.niveau * 0.4;
            e.x = (e.sens > 0 ? -e.taille : w + e.taille) + e.sens * v * e.t;
            e.y = e.couloir + Math.sin(e.t / 22) * 14;
            if (e.x < -e.taille * 2 || e.x > w + e.taille * 2) e.vivant = false;
            return;
        }

        // Le PLONGEUR ne suit pas une figure : il se cale sur le joueur, se
        // fige un instant — c'est l'avertissement — puis pique tout droit.
        // Trois temps lisibles : on a le droit de l'esquiver, pas de l'ignorer.
        if (e.genre === 'plongeur') {
            if (e.mode === 'vol') {
                e.y = -e.taille + e.t * e.vitesse * 1.1;
                e.x += (this.vaisseau.x - e.x) * 0.045;
                if (e.y > h * (0.2 + e.part * 0.12)) { e.mode = 'visee'; e.pause = 26; }
            } else if (e.mode === 'visee') {
                if (--e.pause <= 0) e.mode = 'pique';
            } else {
                e.y += 7 + this.niveau * 0.5;
            }
            return;
        }

        const t = e.t * e.vitesse;
        const col = e.marge + e.part * e.large;

        // Le TIREUR s'arrête en haut de l'écran, mitraille, puis repart : la
        // figure calcule sa descente, le plafond la borne, et passé son tour
        // de garde il reprend sa route.
        if (e.genre === 'tireur') {
            const plafond = h * 0.22 + Math.sin(t / 30 + e.part * 9) * 12;
            const yFigure = -e.taille + t;
            e.y = e.t > 560 ? plafond + (e.t - 560) * 1.6 : Math.min(yFigure, plafond);
            e.x = col + Math.sin(t / 34) * (e.large * 0.22) * e.sens;
            return;
        }

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

    /**
     * Le CONVOI CODÉ : le calcul au bout du canon.
     *
     * Trois transports blindés patrouillent le haut de l'écran, chacun porte
     * un nombre, et la consigne s'affiche : « Abats 7 × 6 ». Le canon étant
     * automatique, viser c'est SE PLACER sous le bon transport — la mécanique
     * du jeu et la réponse à la question sont le même geste.
     *
     * Les coques encaissent plusieurs impacts : une balle qui érafle un
     * mauvais transport ne compte pas, seule sa DESTRUCTION est une réponse.
     * C'est ce qui rend le tir automatique compatible avec une question.
     */
    lancerConvoi() {
        const w = this.canvas.width, h = this.canvas.height;
        const t = this.tables[Math.floor(Math.random() * this.tables.length)];
        const m = 2 + Math.floor(Math.random() * 9);
        const bon = t * m;
        const leurres = new Set();
        [t * (m - 1), t * (m + 1), t + m, bon + t, bon - t].filter(v => v > 0 && v !== bon)
            .forEach(v => leurres.add(v));
        const valeurs = [bon, ...[...leurres].sort(() => Math.random() - 0.5).slice(0, 2)]
            .sort(() => Math.random() - 0.5);

        const sens = Math.random() < 0.5 ? 1 : -1;
        const ecart = Math.max(120, w / 2.8);
        this.convoi = {
            question: `${t} × ${m}`, bon, table: t,
            t: 0, duree: 1400, reglee: false, sens,
            largeurBoucle: ecart * valeurs.length,
            ships: valeurs.map((v, i) => ({
                v, pv: 5, max: 5, vivant: true,
                x: sens > 0 ? -60 - i * ecart : w + 60 + i * ecart,
                y: h * (0.14 + 0.05 * (i % 2)),
                phase: Math.random() * 6.28
            }))
        };
    }

    // --- Le GARDIEN du secteur ------------------------------------------------

    /**
     * Le duel de fin de secteur.
     *
     * Le Gardien est INVULNÉRABLE au canon : les tirs se perdent sur son
     * champ. Il lâche des sphères numérotées, toutes identiques — seul le
     * nombre les distingue. Une consigne dit lesquelles abattre :
     *
     *     DÉTRUIS les multiples de 3    ·    ÉVITE les autres
     *
     * Comme le canon tire tout seul, ABATTRE c'est SE PLACER dessous et
     * ÉVITER c'est changer de colonne. Le même doigt, la même seconde, deux
     * décisions opposées — et entre les deux, un calcul. Une bonne sphère
     * entame la coque du Gardien ; une mine abattue la lui répare et secoue
     * l'écran ; une mine touchée coûte une vie.
     *
     * Le premier Gardien pose toujours « les nombres PAIRS » : on apprend la
     * règle du duel sur la plus simple, on la varie ensuite.
     */
    lancerBoss() {
        const w = this.canvas.width;
        const t = this.tables[Math.floor(Math.random() * this.tables.length)];
        const familles = this.niveau === 0 ? [DUELS[0]]
            : [...DUELS, { libelle: `les multiples de ${t}`, test: n => n % t === 0, table: t }];
        const regle = familles[Math.floor(Math.random() * familles.length)];

        const pv = 10 + this.niveau * 4;
        this.boss = {
            regle, pv, max: pv,
            x: w / 2, y: -120, t: 0,
            fautes: 0,                       // mines abattues (2 enregistrées max)
            cadence: 60,                     // frames entre deux sphères
            prochainTir: 200,
            reglee: false, sortie: 0
        };
        this.mot('GARDIEN DE SECTEUR !', 'ko');
        this.secousse = 22;
    }

    /** Un nombre à deux chiffres qui vérifie (ou non) la règle du duel. */
    nombreDuel(regle, cible) {
        for (let i = 0; i < 80; i++) {
            const n = 2 + Math.floor(Math.random() * 98);
            if (regle.test(n) === cible) return n;
        }
        return cible ? 2 : 3;
    }

    majBoss() {
        const b = this.boss, h = this.canvas.height, w = this.canvas.width, v = this.vaisseau;
        if (!b) return;
        b.t++;

        // Entrée par le haut, puis balancement lent : il occupe le ciel — mais
        // sous le bandeau de consigne, qui doit rester lisible en permanence.
        const perchoir = h * 0.27;
        b.y += (perchoir - b.y) * 0.03;
        b.x = w / 2 + Math.sin(b.t / 95) * (w * 0.24);

        if (b.reglee) {
            b.sortie++;
            b.y -= 2.4;
            if (b.sortie > 90) { this.boss = null; this.orbes = []; }
            return;
        }

        // Les sphères, de plus en plus vite à mesure qu'il encaisse.
        const cadence = Math.max(26, b.cadence - Math.round((1 - b.pv / b.max) * 30) - this.niveau * 3);
        if (b.t > 60 && b.t % cadence === 0) {
            const cible = Math.random() < 0.5;
            this.orbes.push({
                x: 34 + Math.random() * (w - 68), y: b.y + 26,
                v: 1.5 + this.niveau * 0.15 + Math.random() * 0.5,
                n: this.nombreDuel(b.regle, cible),
                r: Math.max(17, Math.min(24, w * 0.055)),
                a: Math.random() * 6.28
            });
        }

        // Et il tire, quand même : trois traits en éventail, assez lents pour
        // être lus, assez fréquents pour interdire de camper.
        // En démonstration il ne tire pas : le robot expliquerait la règle
        // pendant que l'escadre se fait détruire, et le duel s'arrêterait au
        // milieu de la phrase.
        if (--b.prochainTir <= 0 && !this.isDemo) {
            b.prochainTir = Math.max(70, 170 - this.niveau * 14);
            const dx = v.x - b.x, dy = v.y - b.y;
            const a0 = Math.atan2(dy, dx);
            [-0.28, 0, 0.28].forEach(da => {
                const s = 2.6 + this.niveau * 0.2;
                this.tirsEnnemis.push({
                    x: b.x, y: b.y + 30,
                    vx: Math.cos(a0 + da) * s, vy: Math.sin(a0 + da) * s
                });
            });
        }

        // Les tirs du joueur ricochent sur le champ : il faut les sphères.
        this.tirs.forEach(t => {
            if (t.mort || t.y > b.y + 44 || t.y < b.y - 44 || Math.abs(t.x - b.x) > 70) return;
            t.mort = true;
            b.eclat = 8;
            this.particules.push({
                x: t.x, y: t.y, vx: (Math.random() - 0.5) * 2, vy: 1.5,
                vie: 10, couleur: '#67e8f9'
            });
        });
        if (b.eclat > 0) b.eclat--;
    }

    majOrbes() {
        const b = this.boss, h = this.canvas.height, v = this.vaisseau;
        this.orbes.forEach(o => {
            o.y += o.v; o.a += 0.03;

            // Abattue par le canon.
            if (b && !b.reglee) {
                for (const t of this.tirs) {
                    if (t.mort) continue;
                    if (Math.abs(t.x - o.x) < o.r && Math.abs(t.y - o.y) < o.r) {
                        t.mort = true; o.mort = true;
                        this.eclaterOrbe(o);
                        break;
                    }
                }
            }
            // Percutée : une mine fait mal, une cible manquée ne fait rien.
            if (!o.mort && Math.hypot(o.x - v.x, o.y - v.y) < o.r + 13) {
                o.mort = true;
                if (b && !b.regle.test(o.n) && !this.isDemo) {
                    this.exploser(o.x, o.y, '#f87171', 18);
                    this.secousse = 18;
                    this.perdreUneVie();
                } else {
                    this.exploser(o.x, o.y, '#a5f3fc', 8);
                }
            }
        });
        this.tirs = this.tirs.filter(t => !t.mort);
        this.orbes = this.orbes.filter(o => !o.mort && o.y < h + 40);
    }

    /** Une sphère abattue : c'est une RÉPONSE à la règle du duel. */
    eclaterOrbe(o) {
        const b = this.boss;
        const q = `${o.n} — ${b.regle.libelle} ?`;
        if (b.regle.test(o.n)) {
            b.pv--;
            this.gagner(20);
            this.exploser(o.x, o.y, '#fcd34d', 20);
            if (b.pv <= 0) this.vaincreBoss();
        } else {
            b.pv = Math.min(b.max, b.pv + 1);
            this.secousse = 16;
            this.puissance = this.canonBase;
            this.exploser(o.x, o.y, '#f43f5e', 16);
            this.mot(`${o.n} n'est pas dans ${b.regle.libelle} — le Gardien se répare`, 'ko');
            // On n'enregistre que les DEUX premières : au canon automatique,
            // une mine effleurée en manœuvre n'est pas une erreur de calcul,
            // et un carnet noyé sous vingt lignes ne se relit pas.
            if (b.fautes++ < 2) {
                this.onWrongAnswer(null, {
                    questionText: q, input: `${o.n} abattu`, expected: b.regle.libelle,
                    concept: b.regle.table ? `mult:${b.regle.table}` : 'num:multiples',
                    silencieux: true,
                    customMessage: `Consigne : abattre ${b.regle.libelle}. ${o.n} n'en fait pas partie.`
                });
            }
        }
    }

    vaincreBoss() {
        const b = this.boss;
        b.reglee = true;
        b.sortie = 0;
        this.gagner(200);
        this.secousse = 30;
        this.orbes.forEach(o => { o.mort = true; this.exploser(o.x, o.y, '#fde68a', 8); });
        for (let i = 0; i < 5; i++) {
            regTimeout(() => {
                if (this.isRunning && this.boss) {
                    this.exploser(this.boss.x + (Math.random() - 0.5) * 90,
                        this.boss.y + (Math.random() - 0.5) * 60, '#fb923c', 22);
                }
            }, i * 130);
        }
        this.mot('GARDIEN ABATTU !', 'ok');
        this.onCorrectAnswer(null, b.regle.table ? `mult:${b.regle.table}` : 'num:multiples', {
            points: 30,
            questionText: `Gardien : abattre ${b.regle.libelle}`,
            given: b.regle.libelle, expected: b.regle.libelle
        });
        // L'atelier s'ouvre une fois les explosions retombées.
        regTimeout(() => { if (this.isRunning) this.ouvrirAtelier(); }, 1400);
    }

    /** Le Gardien tient trop longtemps : il repart, le secteur ne change pas. */
    fuirBoss() {
        const b = this.boss;
        b.reglee = true;
        b.sortie = 0;
        this.puissance = this.canonBase;
        this.mot(`Le Gardien se retire… il fallait abattre ${b.regle.libelle}`, 'ko');
        this.onWrongAnswer(null, {
            questionText: `Gardien : abattre ${b.regle.libelle}`,
            input: '(Gardien non abattu)', expected: b.regle.libelle,
            concept: b.regle.table ? `mult:${b.regle.table}` : 'num:multiples',
            silencieux: true,
            customMessage: `Il fallait abattre ${b.regle.libelle} et laisser passer les autres sphères.`
        });
        this.epreuves = 0;
    }

    // --- L'atelier, entre deux secteurs ---------------------------------------

    /**
     * On ne change pas de secteur en passant une porte : on l'ouvre en
     * abattant son Gardien, et le voyage marque une escale. L'atelier dépense
     * les CRÉDITS gagnés — un équipement acheté ici ne se perd plus, alors
     * qu'un bonus ramassé s'évapore à la première faute. C'est ce qui donne
     * un sens à « bien jouer longtemps ».
     */
    ouvrirAtelier() {
        const n = this.niveau;
        const catalogue = [
            { id: 'canon', titre: 'CANON +1', desc: 'Un tir de plus, pour toujours', prix: 140 + n * 70 },
            { id: 'coque', titre: 'COQUE +1', desc: 'Une vie de plus, pour toujours', prix: 190 + n * 80 },
            { id: 'nova', titre: 'SOUTE ✹✹', desc: 'Deux bombes NOVA', prix: 110 + n * 40 },
            { id: 'aimant', titre: 'AIMANT', desc: 'Les bonus viennent à toi', prix: 170 + n * 50 },
            { id: 'blindage', titre: 'BLINDAGE', desc: 'Bouclier à chaque secteur', prix: 210 + n * 60 }
        ].filter(o => !(o.id === 'aimant' && this.aimant)
            && !(o.id === 'blindage' && this.blindage)
            && !(o.id === 'canon' && this.canonBase >= 3));

        this.phase = 'atelier';
        this.atelier = {
            offres: catalogue.sort(() => Math.random() - 0.5).slice(0, 3),
            zones: [], achats: []
        };
    }

    toucherAtelier(p) {
        const a = this.atelier;
        if (!a) return;
        const z = a.zones.find(z => p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h);
        if (!z) return;
        if (z.id === 'partir') { this.quitterAtelier(); return; }
        const offre = a.offres.find(o => o.id === z.id);
        if (!offre || a.achats.includes(offre.id)) return;
        if (this.credits < offre.prix) { this.mot('Pas assez de crédits ⬢', 'ko'); return; }
        this.credits -= offre.prix;
        a.achats.push(offre.id);
        this.appliquerAmelioration(offre.id);
        this.majHud();
    }

    appliquerAmelioration(id) {
        switch (id) {
            case 'canon':
                this.canonBase = Math.min(3, this.canonBase + 1);
                this.puissance = Math.max(this.puissance, this.canonBase);
                break;
            case 'coque':
                this.viesMax++; this.vies++;
                break;
            case 'nova':
                this.bombes = Math.min(5, this.bombes + 2);
                break;
            case 'aimant': this.aimant = 1; break;
            case 'blindage': this.blindage = 1; break;
        }
    }

    quitterAtelier() {
        this.atelier = null;
        this.boss = null;
        this.orbes = [];
        this.niveau++;
        this.epreuves = 0;
        this.portail = null;
        this.faille = null;
        this.failleFaite = false;
        this.frame = 0;
        this.ennemis = []; this.tirsEnnemis = [];
        this.puissance = Math.max(this.puissance, this.canonBase);
        if (this.blindage) this.bouclier = 600;
        this.phase = 'jeu';
        this.majHud();
        this.mot(`Cap sur ${this.secteur.nom} !`, 'ok');
    }

    // --- La FAILLE : l'épreuve bonus ------------------------------------------

    /**
     * Un anneau de lumière traverse le secteur. On peut l'ignorer — il ne
     * coûte rien, il ne fait rien. Mais s'y glisser ouvre la FAILLE : une
     * parenthèse sans ennemis, sans canon, où il ne reste qu'UN geste et UNE
     * question.
     *
     * Des nombres tombent. Consigne : ATTRAPER les multiples de la table, et
     * ÉVITER tous les autres. C'est l'exact contraire du réflexe du jeu —
     * ailleurs on évite tout, ici il faut aller CHERCHER certaines choses — et
     * comme le canon est coupé, il n'y a aucun intermédiaire entre le calcul
     * et la main : on décide avec le corps.
     *
     * On n'y perd pas de vie : une faille est un cadeau, pas un piège. On y
     * perd sa CHAÎNE, et donc les crédits qu'on serait allé chercher.
     */
    lancerPortail() {
        const w = this.canvas.width;
        const t = this.tables[Math.floor(Math.random() * this.tables.length)];
        const lw = Math.max(120, Math.min(w * 0.46, 260));
        this.failleFaite = true;
        this.portail = {
            table: t, lw, y: -70, v: 1.9,
            x: lw / 2 + 12 + Math.random() * Math.max(1, w - lw - 24)
        };
        this.mot(`Une FAILLE ×${t} s'ouvre — traverse l'anneau !`, 'ok');
    }

    majPortail() {
        const p = this.portail, h = this.canvas.height, v = this.vaisseau;
        if (!p) return;
        p.y += p.v;
        if (Math.abs(p.y - v.y) < 30 && Math.abs(p.x - v.x) < p.lw / 2) {
            this.portail = null;
            this.entrerFaille(p.table);
            return;
        }
        if (p.y > h + 70) { this.portail = null; this.mot('La faille se referme…', 'ko'); }
    }

    entrerFaille(table) {
        // Les bonus au sol aussi : dans une faille où la consigne est
        // « n'attrape QUE les multiples », un objet à ramasser qui traîne
        // envoie exactement le message contraire.
        this.ennemis = []; this.tirsEnnemis = []; this.tirs = []; this.bonus = [];
        // Les nombres apparaissent SOUS le bandeau de consigne : nés en haut de
        // l'écran, ils passaient une bonne seconde cachés derrière lui, et
        // c'est du temps de lecture volé sur le seul indice qui compte.
        const plafond = 34 + Math.max(38, Math.min(this.canvas.width, this.canvas.height) * 0.085) + 16;
        this.faille = {
            table, t: 0, duree: 780, plafond,
            pris: 0, rates: 0, chaine: 0, meilleure: 0, fautes: 0,
            nombres: [], prochain: 24
        };
        this.secousse = 18;
        this.mot(`FAILLE : attrape les multiples de ${table}, évite les autres !`, 'ok');
    }

    /** Un nombre à attraper (multiple) ou à esquiver — d'apparence identique. */
    nombreFaille(table, multiple) {
        if (multiple) return table * (2 + Math.floor(Math.random() * 11));
        // Un voisin PROCHE d'un multiple : c'est là que se joue la table.
        // Un nombre tiré au hasard serait souvent écarté sans réfléchir.
        const base = table * (2 + Math.floor(Math.random() * 11));
        const ecart = [1, 2, 1, 2, 3][Math.floor(Math.random() * 5)] * (Math.random() < 0.5 ? -1 : 1);
        const n = base + ecart;
        return n % table === 0 || n < 2 ? base + 1 : n;
    }

    majFaille() {
        const f = this.faille, w = this.canvas.width, h = this.canvas.height, v = this.vaisseau;
        if (!f) return;
        f.t++;

        if (--f.prochain <= 0 && f.t < f.duree - 90) {
            f.prochain = Math.max(16, 32 - this.niveau * 2);
            const r = Math.max(17, Math.min(25, w * 0.055));
            f.nombres.push({
                x: r + 8 + Math.random() * Math.max(1, w - 2 * r - 16), y: f.plafond, age: 0,
                v: 2.1 + this.niveau * 0.16 + Math.random() * 0.6, r, a: Math.random() * 6.28,
                n: this.nombreFaille(f.table, Math.random() < 0.5)
            });
        }

        f.nombres.forEach(o => {
            o.y += o.v; o.a += 0.05; o.age = (o.age || 0) + 1;
            if (o.mort || Math.hypot(o.x - v.x, o.y - v.y) > o.r + 14) return;
            o.mort = true;
            const bon = o.n % f.table === 0;
            const q = `${o.n} est-il un multiple de ${f.table} ?`;
            if (bon) {
                f.pris++; f.chaine++;
                f.meilleure = Math.max(f.meilleure, f.chaine);
                this.gagner(15 * Math.min(5, f.chaine));
                this.exploser(o.x, o.y, '#fcd34d', 18);
                this.onCorrectAnswer(null, `mult:${f.table}`, {
                    points: 10, questionText: q, given: 'oui', expected: 'oui'
                });
            } else {
                f.rates++; f.chaine = 0;
                this.secousse = 14;
                this.exploser(o.x, o.y, '#f43f5e', 16);
                this.mot(`${o.n} n'est pas dans la table de ${f.table} — chaîne perdue`, 'ko');
                // Deux fautes enregistrées au plus, comme pour le Gardien : au
                // milieu d'une esquive, la troisième n'apprend plus rien.
                if (f.fautes++ < 2 && !this.isDemo) {
                    this.onWrongAnswer(null, {
                        questionText: q, input: 'attrapé', expected: 'non',
                        concept: `mult:${f.table}`, silencieux: true,
                        customMessage: `${o.n} n'est pas un multiple de ${f.table} : dans la faille, il fallait l'éviter.`
                    });
                }
            }
        });
        f.nombres = f.nombres.filter(o => !o.mort && o.y < h + 40);

        if (f.t >= f.duree) this.finirFaille();
    }

    finirFaille() {
        const f = this.faille;
        const parfait = f.rates === 0 && f.pris >= 3;
        // `gagner` verse le score ET les crédits : une seule source, sinon on
        // paie deux fois la même prise sans que le compte tombe juste.
        const avant = this.credits;
        this.gagner(f.pris * 20 + (parfait ? 60 : 0));
        const verse = this.credits - avant;
        if (parfait) {
            this.bombes = Math.min(5, this.bombes + 1);
            this.mot(`FAILLE PARFAITE ! ${f.pris} multiples de ${f.table}, aucune erreur · ⬢ ${verse} + une bombe ✹`, 'ok');
        } else {
            this.mot(`Faille refermée : ${f.pris} multiples de ${f.table} attrapés, ${f.rates} erreur${f.rates > 1 ? 's' : ''} · ⬢ ${verse}`, f.rates ? 'ko' : 'ok');
        }
        this.faille = null;
        this.majHud();
    }

    // --- Bombe NOVA -----------------------------------------------------------

    declencherNova() {
        if (this.novaOnde) return;
        if (this.bombes < 1) { this.mot('Pas de bombe NOVA — cherche le bonus ✹', 'ko'); return; }
        this.bombes--;
        this.majHud();
        this.secousse = 20;
        this.novaOnde = { r: 10 };
        this.mot('NOVA !', 'ok');
    }

    /**
     * L'onde grandit depuis le vaisseau et efface ce qu'elle touche : les
     * appareils, leurs tirs — mais PAS les transports du convoi : une bombe
     * ne répond pas à une question de calcul à ta place.
     */
    majNova() {
        const o = this.novaOnde;
        if (!o) return;
        o.r += 16;
        const v = this.vaisseau;
        this.ennemis.forEach(e => {
            if (e.vivant && Math.hypot(e.x - v.x, e.y - v.y) < o.r) {
                e.vivant = false;
                this.gagner(10);
                this.exploser(e.x, e.y, '#fcd34d', 16);
            }
        });
        this.tirsEnnemis.forEach(t => {
            if (Math.hypot(t.x - v.x, t.y - v.y) < o.r) t.mort = true;
        });
        if (o.r > Math.hypot(this.canvas.width, this.canvas.height)) this.novaOnde = null;
    }

    // --- Verdicts -------------------------------------------------------------

    franchir(p) {
        this.porte.reglee = true;
        const bonneReponse = p.v === this.porte.bon;
        const q = `${this.porte.question} = ?`;
        this.epreuves++;
        if (bonneReponse) {
            this.gagner(60);
            this.bouclier = 240;
            this.puissance = Math.min(3, this.puissance + 1);
            this.mot(`${this.porte.question} = ${this.porte.bon} — passage ouvert !`, 'ok');
            this.onCorrectAnswer(null, `mult:${this.porte.table}`, {
                points: 20, questionText: q, given: p.v, expected: this.porte.bon
            });
        } else {
            this.secousse = 26;
            this.puissance = this.canonBase;
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
        this.epreuves++;
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
            this.puissance = this.canonBase;
            this.ennemis = []; this.tirsEnnemis = []; this.porte = null; this.convoi = null;
            this.portail = null;
            // Le Gardien, lui, ne profite pas du naufrage : il se retire et le
            // secteur sera à refaire. Sans ça on relançait un duel à mi-vie.
            if (this.boss && !this.boss.reglee) this.fuirBoss();
            this.orbes = [];
            this.majHud();
        }
    }

    mot(texte, ton) { this.message = { texte, ton, vie: 140 }; }

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

        // Canon — deux fois plus lent pendant qu'on charge le rayon lourd.
        // En mode « au doigt », le canon se tait dès qu'on lâche l'écran, et
        // ne ralentit pas : tenir le doigt, c'est déjà tirer.
        // Dans la faille, il ne tire pas du tout : rien à détruire, seulement
        // à choisir.
        const ralenti = this.doigtPose && !this.tirManuel;
        const cadence = Math.max(7, 13 - this.puissance * 2) * (ralenti ? 2 : 1);
        const canonPret = !this.faille && (!this.tirManuel || this.doigtEnZoneDeTir());
        if (canonPret && this.frame % Math.round(cadence) === 0) this.tirerJoueur();

        // Charge : environ une seconde et demie de doigt posé.
        if (this.doigtPose) this.charge = Math.min(1, this.charge + 1 / 90);
        if (this.rayon > 0) { this.rayon--; this.frapperAuRayon(); }

        // Les vagues se resserrent avec les secteurs : c'est LA vis de
        // difficulté — on ne meurt pas parce qu'un ennemi est fort, on meurt
        // parce qu'on n'a plus de place. Pendant une épreuve (mur, convoi,
        // Gardien), elles s'arrêtent : l'écran doit rester lisible.
        // Les deux gestes qu'on ne devine pas — le rayon lourd et la bombe —
        // ne sont plus écrits sur l'écran titre : ils s'annoncent une fois, en
        // vol, quand le joueur a déjà le doigt sur l'écran. Une consigne
        // arrive toujours mieux au moment où elle sert.
        if (this.niveau === 0 && this.frame === 200 && !this.astuceDite) {
            this.astuceDite = true;
            this.mot(this.tirManuel
                ? 'Doigt EN BAS : tu pilotes sans tirer. Remonte-le : ça tire.'
                : 'Doigt POSÉ : rayon lourd · DOUBLE TAPE : bombe ✹', 'ok');
        }
        if (this.niveau === 0 && this.frame === 620 && this.tirManuel) {
            this.mot('Doigt POSÉ longtemps : rayon lourd · DOUBLE TAPE : bombe ✹', 'ok');
        }

        const calme = !this.porte && !this.convoi && !this.boss && !this.faille;
        const entreVagues = Math.max(78, 150 - this.niveau * 9);
        if (calme && this.frame % entreVagues === 0) this.lancerVague();
        // L'anneau de la Faille passe UNE fois par secteur, à mi-chemin entre
        // deux épreuves : jamais pendant un mur ou un duel, où l'écran est
        // déjà plein.
        if (calme && !this.portail && !this.failleFaite && this.epreuves >= 1
            && this.frame % this.entrePortes === Math.round(this.entrePortes / 2)) {
            this.lancerPortail();
        }
        if (calme && this.frame % this.entrePortes === 0 && this.frame > 60) {
            // Deux épreuves par secteur, puis le Gardien : c'est lui, et lui
            // seul, qui ouvre le secteur suivant.
            if (this.epreuves >= EPREUVES_PAR_SECTEUR) this.lancerBoss();
            else if (this.prochainCalc === 'porte') { this.lancerPorte(); this.prochainCalc = 'convoi'; }
            else { this.lancerConvoi(); this.prochainCalc = 'porte'; }
        }

        this.majEnnemis();
        this.majTirs();
        this.majPorte();
        this.majConvoi();
        if (this.portail) this.majPortail();
        if (this.faille) this.majFaille();
        if (this.boss) {
            this.majBoss();
            if (this.boss && !this.boss.reglee && this.boss.t > 3400) this.fuirBoss();
        }
        if (this.orbes.length) this.majOrbes();
        this.majBonus();
        this.majNova();

        this.particules.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.vie--; });
        this.particules = this.particules.filter(p => p.vie > 0);
        if (this.secousse > 0) this.secousse--;
        if (this.bouclier > 0) this.bouclier--;
        if (this.multi > 0) { if (--this.multi === 0) this.majHud(); }
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
                this.gagner(15);
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

    /** Un tir ennemi vers un angle donné (0 = droit sur le joueur). */
    tirEnnemi(e, ecart = 0) {
        if (this.tirsEnnemis.length > 46) return;   // l'écran doit rester lisible
        const dx = this.vaisseau.x - e.x, dy = this.vaisseau.y - e.y;
        const a = Math.atan2(dy, dx) + ecart;
        const v = 2.5 + this.niveau * 0.22;
        this.tirsEnnemis.push({
            x: e.x, y: e.y + e.taille / 2,
            vx: Math.cos(a) * v, vy: Math.sin(a) * v
        });
    }

    majEnnemis() {
        const h = this.canvas.height, v = this.vaisseau;
        this.ennemis.forEach(e => {
            e.t++;
            if (e.t < 0) return;              // il attend son tour dans le serpent
            this.placerEnnemi(e);

            // Chaque genre a son tir : c'est la personnalité de l'appareil.
            // (Le plongeur, lui, EST son tir.)
            if (--e.tir <= 0 && e.y > 0 && e.y < h * 0.7
                && !this.porte && !this.convoi && !this.boss && e.genre !== 'intercepteur') {
                if (e.genre === 'blinde') {
                    e.tir = 120 + Math.floor(Math.random() * 90);
                    [-0.35, 0, 0.35].forEach(a => this.tirEnnemi(e, a));
                } else if (e.genre === 'tireur') {
                    e.tir = 60 + Math.floor(Math.random() * 70);
                    [-0.1, 0.1].forEach(a => this.tirEnnemi(e, a));
                } else if (e.genre !== 'plongeur') {
                    e.tir = 110 + Math.floor(Math.random() * 160);
                    this.tirEnnemi(e);
                }
            }

            // PERCUTER un appareil fait mal — aux deux. Sans cette règle, on
            // pouvait traverser une vague en spectateur ; c'est elle qui rend
            // le pilotage obligatoire.
            if (e.y > 0 && Math.hypot(e.x - v.x, e.y - v.y) < e.taille / 2 + 13) {
                e.vivant = false;
                this.exploser(e.x, e.y, '#fb923c', 20);
                this.secousse = 18;
                this.perdreUneVie();
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
                        this.gagner(e.genre === 'blinde' ? 40 : e.genre === 'pondeuse' ? 35
                            : e.genre === 'tireur' ? 25 : e.genre === 'intercepteur' ? 30 : 15);
                        this.exploser(e.x, e.y, '#f59e0b', 18);
                        // La pondeuse crevée se scinde : deux petits partent
                        // en biais. Elle se tue tôt, ou pas au-dessus de soi.
                        if (e.genre === 'pondeuse' && !e.eclat) this.scinder(e);
                        // Le blindé lâche TOUJOURS quelque chose : il coûte
                        // cher à percer, il doit payer.
                        if (e.genre === 'blinde' || Math.random() < 0.13) this.lacherBonus(e.x, e.y);
                    } else this.exploser(e.x, e.y, '#fde68a', 5);
                }
            }
        });
        this.tirs = this.tirs.filter(t => !t.mort && t.y > -20);
        this.ennemis = this.ennemis.filter(e => e.vivant);
        this.majHud();
    }

    /** Tire un bonus au sort — les rares sont rares. */
    lacherBonus(x, y) {
        const r = Math.random();
        const genre = r < 0.3 ? 'arme' : r < 0.5 ? 'bouclier' : r < 0.7 ? 'vie'
            : r < 0.87 ? 'nova' : 'x2';
        this.bonus.push({ x, y, v: 1.6, genre });
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

    majConvoi() {
        const cv = this.convoi;
        if (!cv) return;
        const w = this.canvas.width;
        cv.t++;
        const vitesse = 1.15 + this.niveau * 0.07;

        cv.ships.forEach(s => {
            if (!s.vivant) return;
            s.x += cv.sens * vitesse;
            s.y += Math.sin((this.frame + s.phase * 60) / 38) * 0.25;
            // La boucle : sorti d'un côté, un transport revient de l'autre —
            // la question repasse tant qu'elle n'est pas réglée.
            if (cv.sens > 0 && s.x > w + 70) s.x -= cv.largeurBoucle + w + 140;
            if (cv.sens < 0 && s.x < -70) s.x += cv.largeurBoucle + w + 140;
        });

        // Impacts des tirs du joueur sur les coques.
        this.tirs.forEach(t => {
            for (const s of cv.ships) {
                if (!s.vivant || t.mort || s.y < 0) continue;
                if (Math.abs(t.x - s.x) < 30 && Math.abs(t.y - s.y) < 18) {
                    t.mort = true;
                    if (--s.pv <= 0) { s.vivant = false; this.abattreTransport(s); }
                    else this.exploser(t.x, t.y, '#fde68a', 4);
                }
            }
        });
        this.tirs = this.tirs.filter(t => !t.mort);

        // Personne d'abattu à temps : la question est comptée manquée, sans
        // perte de vie — l'inaction coûte le canon, pas la peau.
        if (!cv.reglee && cv.t > cv.duree) {
            cv.reglee = true;
            this.epreuves++;
            this.puissance = this.canonBase;
            this.mot(`Le convoi s'échappe… ${cv.question} = ${cv.bon}`, 'ko');
            this.onWrongAnswer(null, {
                questionText: `${cv.question} = ?`, input: '(convoi échappé)',
                expected: cv.bon, concept: `mult:${cv.table}`, silencieux: true,
                customMessage: `Il fallait abattre le transporteur ${cv.bon} : ${cv.question} = ${cv.bon}.`
            });
        }
        if (cv.reglee) {
            // Les survivants fuient vers le haut.
            cv.ships.forEach(s => { if (s.vivant) s.y -= 3; });
            if (cv.t > cv.duree || cv.ships.every(s => !s.vivant || s.y < -40)) this.convoi = null;
        }
    }

    /** Un transport détruit : c'est une RÉPONSE. */
    abattreTransport(s) {
        const cv = this.convoi;
        this.exploser(s.x, s.y, '#f59e0b', 26);
        const q = `${cv.question} = ?`;
        this.epreuves++;
        if (s.v === cv.bon) {
            cv.reglee = true;
            cv.t = cv.duree;                       // les autres s'en vont
            this.gagner(80);
            this.multi = 600;                      // dix secondes de score ×2
            this.lacherBonus(s.x, s.y);
            this.mot(`${cv.question} = ${cv.bon} — score ×2 !`, 'ok');
            this.onCorrectAnswer(null, `mult:${cv.table}`, {
                points: 20, questionText: q, given: s.v, expected: cv.bon
            });
        } else {
            this.secousse = 20;
            this.puissance = 1;
            this.mot(`${s.v} était un leurre… ${cv.question} = ${cv.bon}`, 'ko');
            this.onWrongAnswer(null, {
                questionText: q, input: s.v, expected: cv.bon,
                concept: `mult:${cv.table}`, silencieux: true,
                customMessage: `${cv.question} = ${cv.bon}. Tu as abattu le transporteur ${s.v}.`
            });
            this.perdreUneVie();
        }
        this.majHud();
    }

    majBonus() {
        const h = this.canvas.height, v = this.vaisseau;
        this.bonus.forEach(b => {
            b.y += b.v;
            // AIMANT : l'équipement qui change la façon de jouer plutôt que
            // les chiffres — on ne renonce plus à un bonus pour esquiver.
            if (this.aimant) {
                b.x += (v.x - b.x) * 0.06;
                if (b.y > v.y - 220) b.y += (v.y - b.y) * 0.05;
            }
            if (Math.abs(b.x - v.x) < 22 && Math.abs(b.y - v.y) < 22) {
                b.pris = true;
                switch (b.genre) {
                    case 'arme':
                        this.puissance = Math.min(3, this.puissance + 1);
                        this.mot('Canon amélioré !', 'ok'); break;
                    case 'bouclier':
                        this.bouclier = 480;
                        this.mot('Bouclier !', 'ok'); break;
                    case 'nova':
                        this.bombes = Math.min(5, this.bombes + 1);
                        this.mot('Bombe NOVA — double-tape pour tout balayer', 'ok'); break;
                    case 'x2':
                        this.multi = 720;
                        this.mot('Score ×2 pendant 12 secondes !', 'ok'); break;
                    default:
                        this.vies = Math.min(this.viesMax + 2, this.vies + 1);
                        this.mot('Réparation !', 'ok');
                }
                this.majHud();
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
        if (this.portail) this.dessinerPortail();
        if (this.faille) this.dessinerFaille();
        if (this.porte) this.dessinerPorte();
        if (this.convoi) this.dessinerConvoi();
        if (this.boss) this.dessinerBoss();
        this.orbes.forEach(o => this.dessinerOrbe(o));
        if (this.novaOnde) this.dessinerNova();

        this.particules.forEach(p => {
            c.globalAlpha = Math.min(1, p.vie / 22); c.fillStyle = p.couleur;
            c.fillRect(p.x - 2, p.y - 2, 4, 4);
        });
        c.globalAlpha = 1;

        this.dessinerVaisseau();
        // La frontière se montre pendant qu'on touche l'écran — et d'office
        // au début de chaque secteur : une mécanique qui n'apparaît qu'une
        // fois le doigt posé ne s'apprend que par accident.
        if (this.tirManuel && this.phase === 'jeu' && (this.doigtPose || this.frame < 300)) {
            this.dessinerZones();
        }
        if (this.message) this.dessinerMessage();
        if (this.phase === 'atelier') this.dessinerAtelier();
        else if (this.phase !== 'jeu' && !this.isDemo) this.dessinerBriefing();
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

    /** Quatre silhouettes, quatre couleurs : on lit la menace avant le tir. */
    dessinerEnnemi(e) {
        const c = this.ctx, r = e.taille / 2;
        c.save(); c.translate(e.x, e.y);

        if (e.genre === 'plongeur') {
            // Flèche orange pointée vers le bas ; elle clignote pendant la
            // visée — c'est l'avertissement qu'elle va piquer.
            const alerte = e.mode === 'visee' && Math.floor(this.frame / 4) % 2 === 0;
            c.shadowColor = 'rgba(251,146,60,.8)'; c.shadowBlur = 12;
            c.fillStyle = alerte ? '#fff7ed' : '#f97316';
            c.beginPath();
            c.moveTo(0, r * 1.1); c.lineTo(r * 0.7, -r * 0.6); c.lineTo(0, -r * 0.2);
            c.lineTo(-r * 0.7, -r * 0.6); c.closePath(); c.fill();
            if (e.mode === 'pique') {
                c.shadowBlur = 0; c.globalAlpha = 0.55; c.fillStyle = '#fdba74';
                c.beginPath(); c.moveTo(-r * 0.3, -r * 0.5); c.lineTo(0, -r * 1.8); c.lineTo(r * 0.3, -r * 0.5);
                c.closePath(); c.fill();
            }
        } else if (e.genre === 'blinde') {
            // Coque large, plaques apparentes, liseré de points de vie.
            c.shadowColor = 'rgba(168,85,247,.65)'; c.shadowBlur = 14;
            c.fillStyle = '#6d28d9';
            c.beginPath(); c.roundRect(-r, -r * 0.62, r * 2, r * 1.24, r * 0.3); c.fill();
            c.shadowBlur = 0;
            c.strokeStyle = 'rgba(233,213,255,.5)'; c.lineWidth = 2;
            c.beginPath(); c.moveTo(-r * 0.45, -r * 0.62); c.lineTo(-r * 0.45, r * 0.62);
            c.moveTo(r * 0.45, -r * 0.62); c.lineTo(r * 0.45, r * 0.62); c.stroke();
            c.fillStyle = '#ddd6fe';
            c.beginPath(); c.arc(0, 0, r * 0.26, 0, Math.PI * 2); c.fill();
            const part = Math.max(0, e.pv / (4 + this.niveau));
            c.fillStyle = '#f0abfc';
            c.fillRect(-r * 0.8, r * 0.75, r * 1.6 * part, 3);
        } else if (e.genre === 'intercepteur') {
            // Fer de lance bleu, couché dans le sens de la course : sa forme
            // dit sa vitesse, et le sillage dit d'où il vient.
            c.rotate(e.sens > 0 ? 0 : Math.PI);
            c.shadowColor = 'rgba(56,189,248,.85)'; c.shadowBlur = 16;
            c.fillStyle = '#0284c7';
            c.beginPath();
            c.moveTo(r * 1.15, 0); c.lineTo(-r * 0.5, r * 0.62);
            c.lineTo(-r * 0.15, 0); c.lineTo(-r * 0.5, -r * 0.62);
            c.closePath(); c.fill();
            c.shadowBlur = 0;
            c.globalAlpha = 0.45; c.fillStyle = '#7dd3fc';
            c.fillRect(-r * 2.4, -r * 0.13, r * 1.9, r * 0.26);
            c.globalAlpha = 1;
            c.fillStyle = '#e0f2fe';
            c.beginPath(); c.arc(r * 0.35, 0, r * 0.2, 0, Math.PI * 2); c.fill();
        } else if (e.genre === 'pondeuse') {
            // Coque rose bombée, deux poches visibles : on VOIT ce qui sortira.
            c.shadowColor = 'rgba(244,114,182,.7)'; c.shadowBlur = 14;
            c.fillStyle = '#be185d';
            c.beginPath(); c.ellipse(0, 0, r, r * 0.78, 0, 0, Math.PI * 2); c.fill();
            c.shadowBlur = 0;
            c.fillStyle = '#fbcfe8';
            [-0.45, 0.45].forEach(k => {
                c.beginPath(); c.arc(r * k, r * 0.22, r * 0.24, 0, Math.PI * 2); c.fill();
            });
            c.strokeStyle = 'rgba(251,207,232,.55)'; c.lineWidth = 2;
            c.beginPath(); c.ellipse(0, 0, r * 0.7, r * 0.5, 0, 0, Math.PI * 2); c.stroke();
        } else if (e.genre === 'tireur') {
            // Raie manta verte, ailes en courbe : la forme la plus « vivante ».
            c.shadowColor = 'rgba(74,222,128,.7)'; c.shadowBlur = 12;
            c.fillStyle = '#16a34a';
            c.beginPath();
            c.moveTo(0, r * 0.8);
            c.quadraticCurveTo(r * 1.2, 0, 0, -r * 0.8);
            c.quadraticCurveTo(-r * 1.2, 0, 0, r * 0.8);
            c.closePath(); c.fill();
            c.shadowBlur = 0;
            c.fillStyle = '#bbf7d0';
            c.beginPath(); c.arc(0, 0, r * 0.24, 0, Math.PI * 2); c.fill();
        } else {
            c.shadowColor = 'rgba(244,63,94,.7)'; c.shadowBlur = 12;
            c.fillStyle = '#be123c';
            c.beginPath();
            c.moveTo(0, r); c.lineTo(r, -r * 0.4); c.lineTo(r * 0.4, -r);
            c.lineTo(-r * 0.4, -r); c.lineTo(-r, -r * 0.4); c.closePath(); c.fill();
            c.shadowBlur = 0;
            c.fillStyle = '#fda4af';
            c.beginPath(); c.arc(0, -r * 0.15, r * 0.3, 0, Math.PI * 2); c.fill();
        }
        c.restore();
    }

    /** Les transports du convoi et la consigne en bandeau. */
    dessinerConvoi() {
        const c = this.ctx, w = this.canvas.width, cv = this.convoi;
        // La consigne : la question, et le geste attendu.
        c.save();
        c.font = `900 ${Math.max(20, Math.min(34, w * 0.07))}px 'Inter', system-ui, sans-serif`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        const txt = `Abats ${cv.question}`;
        const lw = c.measureText(txt).width;
        const by = 46;
        c.fillStyle = 'rgba(2,6,23,.72)';
        c.beginPath(); c.roundRect(w / 2 - lw / 2 - 16, by - 21, lw + 32, 42, 12); c.fill();
        c.strokeStyle = '#fbbf24'; c.lineWidth = 2; c.stroke();
        c.fillStyle = '#fef3c7'; c.fillText(txt, w / 2, by);

        cv.ships.forEach(s => {
            if (!s.vivant) return;
            c.save(); c.translate(s.x, s.y);
            // Barge blindée : coque ambre, hublot sombre, le nombre en clair.
            c.shadowColor = 'rgba(245,158,11,.7)'; c.shadowBlur = 12;
            c.fillStyle = '#b45309';
            c.beginPath(); c.roundRect(-30, -16, 60, 32, 9); c.fill();
            c.shadowBlur = 0;
            c.strokeStyle = 'rgba(253,230,138,.8)'; c.lineWidth = 2; c.stroke();
            // Moteurs
            c.fillStyle = 'rgba(253,224,71,.8)';
            const fl = 4 + Math.random() * 5;
            [[-31, 0], [31, 0]].forEach(([mx]) => {
                c.beginPath();
                c.moveTo(mx, -5); c.lineTo(mx + (mx > 0 ? fl : -fl), 0); c.lineTo(mx, 5);
                c.closePath(); c.fill();
            });
            c.fillStyle = '#1c1207';
            c.beginPath(); c.roundRect(-20, -11, 40, 22, 7); c.fill();
            c.fillStyle = '#fef3c7';
            c.font = '900 17px "Inter", system-ui, sans-serif';
            c.textAlign = 'center'; c.textBaseline = 'middle';
            c.fillText(String(s.v), 0, 1);
            // Jauge de coque : on voit qu'on entame, donc qu'on s'engage.
            if (s.pv < s.max) {
                c.fillStyle = 'rgba(2,6,23,.6)'; c.fillRect(-22, 19, 44, 4);
                c.fillStyle = '#fbbf24'; c.fillRect(-22, 19, 44 * (s.pv / s.max), 4);
            }
            c.restore();
        });
        c.restore();
    }

    /** L'onde NOVA : deux anneaux qui balaient l'écran. */
    dessinerNova() {
        const c = this.ctx, v = this.vaisseau, o = this.novaOnde;
        c.save();
        c.strokeStyle = 'rgba(253,224,71,.9)'; c.lineWidth = 7;
        c.beginPath(); c.arc(v.x, v.y, o.r, 0, Math.PI * 2); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2;
        c.beginPath(); c.arc(v.x, v.y, Math.max(1, o.r - 14), 0, Math.PI * 2); c.stroke();
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
        const STYLE = {
            arme: ['#a3e635', '»'], vie: ['#f472b6', '+'],
            bouclier: ['#38bdf8', '◍'], nova: ['#fcd34d', '✹'], x2: ['#c084fc', '×2']
        };
        const [couleur, glyphe] = STYLE[b.genre] || STYLE.vie;
        c.save(); c.translate(b.x, b.y);
        c.rotate(this.frame / 22);
        c.fillStyle = couleur;
        c.shadowColor = couleur; c.shadowBlur = 12;
        c.fillRect(-9, -9, 18, 18);
        c.shadowBlur = 0;
        c.fillStyle = '#0f172a';
        c.font = `900 ${glyphe.length > 1 ? 10 : 13}px "Inter", system-ui, sans-serif`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.rotate(-this.frame / 22);
        c.fillText(glyphe, 0, 1);
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

    /** Le Gardien : une forteresse, sa jauge de coque, et la CONSIGNE. */
    dessinerBoss() {
        const c = this.ctx, w = this.canvas.width, b = this.boss;
        const R = Math.max(52, Math.min(96, w * 0.2));

        c.save();
        c.translate(b.x, b.y);

        // Le champ qui absorbe les tirs : il ne devient visible qu'au moment
        // où il en encaisse un. C'est ce qui fait comprendre « inutile ».
        if (b.eclat > 0) {
            c.globalAlpha = b.eclat / 12;
            c.strokeStyle = '#67e8f9'; c.lineWidth = 3;
            c.beginPath(); c.ellipse(0, 0, R * 1.15, R * 0.7, 0, 0, Math.PI * 2); c.stroke();
            c.globalAlpha = 1;
        }

        // Coque : un fer de hache sombre, deux nacelles, un œil central.
        c.shadowColor = 'rgba(217,70,239,.75)'; c.shadowBlur = 22;
        c.fillStyle = '#1e1b4b';
        c.beginPath();
        c.moveTo(0, R * 0.62); c.lineTo(R * 0.95, R * 0.1); c.lineTo(R * 0.62, -R * 0.5);
        c.lineTo(-R * 0.62, -R * 0.5); c.lineTo(-R * 0.95, R * 0.1);
        c.closePath(); c.fill();
        c.shadowBlur = 0;
        c.strokeStyle = '#a21caf'; c.lineWidth = 3; c.stroke();

        [-1, 1].forEach(s => {
            c.fillStyle = '#4c1d95';
            c.beginPath(); c.roundRect(s * R * 0.55 - R * 0.16, -R * 0.42, R * 0.32, R * 0.62, 6); c.fill();
            c.fillStyle = '#f0abfc';
            c.beginPath(); c.arc(s * R * 0.55, R * 0.1, R * 0.07, 0, Math.PI * 2); c.fill();
        });

        const pulse = 0.7 + Math.sin(b.t / 9) * 0.3;
        const oeil = c.createRadialGradient(0, 0, 2, 0, 0, R * 0.34);
        oeil.addColorStop(0, '#fdf4ff');
        oeil.addColorStop(0.5, b.reglee ? '#f97316' : '#d946ef');
        oeil.addColorStop(1, 'rgba(0,0,0,0)');
        c.globalAlpha = pulse; c.fillStyle = oeil;
        c.beginPath(); c.arc(0, 0, R * 0.34, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 1;

        // Jauge de coque, sous la carène.
        const jw = R * 1.5, part = Math.max(0, b.pv / b.max);
        c.fillStyle = 'rgba(2,6,23,.75)';
        c.beginPath(); c.roundRect(-jw / 2, R * 0.72, jw, 8, 4); c.fill();
        c.fillStyle = part > 0.5 ? '#f0abfc' : part > 0.25 ? '#fbbf24' : '#f87171';
        c.beginPath(); c.roundRect(-jw / 2, R * 0.72, jw * part, 8, 4); c.fill();
        c.restore();

        if (b.reglee) return;

        // La CONSIGNE, en bandeau : c'est elle qu'on relit à chaque sphère.
        c.save();
        c.textAlign = 'center'; c.textBaseline = 'middle';
        // Sous le HUD, jamais dessus : la consigne se relit à chaque sphère,
        // et le nom du secteur ne doit pas disparaître pour autant.
        const by = 92;
        const t1 = `ABATS ${b.regle.libelle.toUpperCase()}`;
        const t2 = 'ÉVITE toutes les autres sphères';
        const dispo = w - 40;
        // Les règles longues (« les nombres plus grands que 50 ») doivent
        // tenir sur un téléphone : on rétrécit jusqu'à ce qu'elles rentrent.
        let grand = Math.max(15, Math.min(23, w * 0.05));
        c.font = `900 ${grand}px 'Inter', system-ui, sans-serif`;
        while (grand > 10 && c.measureText(t1).width > dispo) {
            grand -= 1; c.font = `900 ${grand}px 'Inter', system-ui, sans-serif`;
        }
        const l1 = c.measureText(t1).width;
        let petit = Math.max(11, Math.min(15, w * 0.034));
        c.font = `700 ${petit}px 'Inter', system-ui, sans-serif`;
        while (petit > 9 && c.measureText(t2).width > dispo) {
            petit -= 1; c.font = `700 ${petit}px 'Inter', system-ui, sans-serif`;
        }
        const l2 = c.measureText(t2).width;
        const bw = Math.min(w - 16, Math.max(l1, l2) + 32);
        c.fillStyle = 'rgba(2,6,23,.82)';
        c.beginPath(); c.roundRect(w / 2 - bw / 2, by - 26, bw, 56, 12); c.fill();
        c.strokeStyle = '#d946ef'; c.lineWidth = 2; c.stroke();
        c.fillStyle = '#f5d0fe';
        c.font = `900 ${grand}px 'Inter', system-ui, sans-serif`;
        c.fillText(t1, w / 2, by - 8);
        c.fillStyle = '#fca5a5';
        c.font = `700 ${petit}px 'Inter', system-ui, sans-serif`;
        c.fillText(t2, w / 2, by + 14);
        c.restore();
    }

    /**
     * Une sphère du Gardien. Elles sont TOUTES identiques — même métal, même
     * halo : seul le nombre dit s'il faut tirer ou s'écarter. Les teinter
     * selon la règle rendrait le duel muet.
     */
    dessinerOrbe(o) {
        const c = this.ctx;
        c.save();
        c.translate(o.x, o.y);
        c.shadowColor = 'rgba(148,163,184,.8)'; c.shadowBlur = 12;
        const g = c.createRadialGradient(-o.r * 0.35, -o.r * 0.35, o.r * 0.15, 0, 0, o.r);
        g.addColorStop(0, '#f8fafc'); g.addColorStop(0.55, '#94a3b8'); g.addColorStop(1, '#334155');
        c.fillStyle = g;
        c.beginPath(); c.arc(0, 0, o.r, 0, Math.PI * 2); c.fill();
        c.shadowBlur = 0;
        c.strokeStyle = 'rgba(15,23,42,.8)'; c.lineWidth = 2;
        c.beginPath(); c.arc(0, 0, o.r, 0, Math.PI * 2); c.stroke();
        c.rotate(Math.sin(o.a) * 0.12);
        c.fillStyle = '#0f172a';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = `900 ${Math.round(o.r * 1.05)}px 'Inter', system-ui, sans-serif`;
        c.fillText(String(o.n), 0, 1);
        c.restore();
    }

    /**
     * La frontière des deux zones. Elle n'apparaît QUE pendant que le doigt
     * est posé : une ligne permanente en travers du ciel serait un meuble de
     * plus dans un écran déjà chargé. Le côté actif s'allume.
     */
    dessinerZones() {
        const c = this.ctx, w = this.canvas.width;
        const y = this.ligneDeTir();
        const tire = this.doigtEnZoneDeTir();
        c.save();
        // Sans le doigt (rappel de début de secteur), la frontière s'estompe
        // doucement plutôt que de rester plantée là.
        if (!this.doigtPose) c.globalAlpha = Math.min(1, (300 - this.frame) / 90);
        c.setLineDash([10, 9]);
        c.lineWidth = 2;
        c.strokeStyle = tire ? 'rgba(252,211,77,.75)' : 'rgba(148,163,184,.45)';
        c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();
        c.setLineDash([]);
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = `900 ${Math.max(10, Math.round(w * 0.028))}px 'Inter', system-ui, sans-serif`;
        c.fillStyle = tire ? 'rgba(252,211,77,.9)' : 'rgba(148,163,184,.5)';
        c.fillText('▲ TIRER', w / 2, y - 14);
        c.fillStyle = tire ? 'rgba(148,163,184,.5)' : 'rgba(103,232,249,.9)';
        c.fillText('PILOTER ▼', w / 2, y + 16);
        c.restore();
    }

    /** L'anneau : une bouche de lumière qu'on traverse, ou qu'on laisse passer. */
    dessinerPortail() {
        const c = this.ctx, p = this.portail;
        const rx = p.lw / 2, ry = Math.max(22, p.lw * 0.16);
        const pulse = 0.75 + Math.sin(this.frame / 7) * 0.25;
        c.save();
        c.translate(p.x, p.y);

        // Le cœur : un vortex violet, pas un simple halo bleu — c'est la même
        // couleur que la faille où il mène.
        const g = c.createRadialGradient(0, 0, ry * 0.15, 0, 0, rx);
        g.addColorStop(0, 'rgba(237,233,254,.55)');
        g.addColorStop(0.4, 'rgba(139,92,246,.35)');
        g.addColorStop(1, 'rgba(139,92,246,0)');
        c.fillStyle = g;
        c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.fill();

        // Trois anneaux emboîtés qui tournent : la bouche « aspire ».
        for (let i = 0; i < 3; i++) {
            const k = 1 - i * 0.26;
            const av = (this.frame / (18 + i * 9)) % (Math.PI * 2);
            c.save();
            c.globalAlpha = 0.35 + i * 0.2;
            c.strokeStyle = i === 0 ? '#a78bfa' : '#67e8f9';
            c.lineWidth = 4 - i;
            c.setLineDash([rx * 0.32, rx * 0.16]);
            c.lineDashOffset = -av * rx * 0.4;
            c.beginPath(); c.ellipse(0, 0, rx * k, ry * k, 0, 0, Math.PI * 2); c.stroke();
            c.restore();
        }

        c.shadowColor = 'rgba(167,139,250,.95)'; c.shadowBlur = 26 * pulse;
        c.strokeStyle = '#ddd6fe'; c.lineWidth = 4;
        c.setLineDash([]);
        c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.stroke();
        c.shadowBlur = 0;

        // Deux chevrons vers le bas : l'anneau se traverse, il ne se contourne
        // pas. Sans eux, on le prenait pour un obstacle de plus.
        c.strokeStyle = 'rgba(237,233,254,.75)'; c.lineWidth = 2.5;
        [-1, 1].forEach(d => {
            c.beginPath();
            c.moveTo(d * rx * 0.5, -ry * 0.32);
            c.lineTo(d * rx * 0.34, 0);
            c.lineTo(d * rx * 0.5, ry * 0.32);
            c.stroke();
        });

        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = '#f5f3ff';
        c.font = `900 ${Math.round(ry * 0.8)}px 'Inter', system-ui, sans-serif`;
        c.fillText(`FAILLE ×${p.table}`, 0, 1);
        c.restore();
    }

    /**
     * La faille : la consigne en haut, la jauge de temps, la chaîne en cours,
     * et les nombres qui tombent. Les nombres sont TOUS IDENTIQUES — même
     * forme, même couleur, même lueur. Le seul indice, c'est le nombre : si la
     * bonne réponse se voyait à la couleur, il n'y aurait plus de calcul.
     */
    dessinerFaille() {
        const c = this.ctx, w = this.canvas.width, h = this.canvas.height, f = this.faille;
        const u = Math.min(w, h);
        const t = f.t;

        c.save();
        // --- Le décor de la faille ------------------------------------------
        // Un voile violet suffisait à dire « on est ailleurs », mais pas à le
        // faire ressentir. On est maintenant DANS un tunnel : un dégradé qui
        // se resserre vers un cœur lumineux, des anneaux qui défilent vers le
        // joueur, et des filaments qui filent sur les côtés.
        const cx = w / 2, cy = h * 0.32;
        const voile = c.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.9);
        voile.addColorStop(0, 'rgba(129,90,240,.42)');
        voile.addColorStop(0.45, 'rgba(59,24,130,.5)');
        voile.addColorStop(1, 'rgba(12,4,32,.72)');
        c.fillStyle = voile; c.fillRect(0, 0, w, h);

        // Les anneaux du tunnel : ils naissent au cœur et grandissent.
        c.save();
        c.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            const p = ((t / 90) + i / 6) % 1;
            const r = p * Math.max(w, h) * 0.75;
            c.globalAlpha = 0.35 * (1 - p);
            c.strokeStyle = '#a78bfa';
            c.beginPath(); c.ellipse(cx, cy, r, r * 0.62, 0, 0, Math.PI * 2); c.stroke();
        }
        c.restore();

        // Filaments : de fines traînées qui accélèrent en s'éloignant du cœur.
        c.save();
        c.strokeStyle = 'rgba(196,181,253,.35)'; c.lineWidth = 1.5;
        for (let i = 0; i < 14; i++) {
            const a = (i / 14) * Math.PI * 2 + t / 260;
            const d0 = ((t * (1.6 + (i % 4) * 0.5)) % (u * 0.9)) + u * 0.12;
            const d1 = d0 + u * 0.09;
            c.globalAlpha = 0.5 * (1 - d0 / (u * 1.1));
            c.beginPath();
            c.moveTo(cx + Math.cos(a) * d0, cy + Math.sin(a) * d0 * 0.7);
            c.lineTo(cx + Math.cos(a) * d1, cy + Math.sin(a) * d1 * 0.7);
            c.stroke();
        }
        c.restore();

        // --- Les nombres ----------------------------------------------------
        f.nombres.forEach(o => {
            c.save();
            c.globalAlpha = Math.min(1, (o.age || 12) / 12);   // apparition en fondu
            c.translate(o.x, o.y);

            // Une traînée derrière chaque éclat : on voit d'où il vient, donc
            // où il va — c'est ce qui rend l'esquive lisible.
            c.save();
            c.globalAlpha *= 0.3;
            const tg = c.createLinearGradient(0, -o.r * 3.2, 0, 0);
            tg.addColorStop(0, 'rgba(167,139,250,0)');
            tg.addColorStop(1, 'rgba(196,181,253,.85)');
            c.fillStyle = tg;
            c.beginPath();
            c.moveTo(-o.r * 0.42, 0); c.lineTo(0, -o.r * 3.2); c.lineTo(o.r * 0.42, 0);
            c.closePath(); c.fill();
            c.restore();

            c.rotate(Math.sin(o.a) * 0.18);
            // Un halo qui bat, puis le cristal : deux facettes claires en haut,
            // deux sombres en bas, et un liseré blanc. Tous identiques — le
            // nombre reste le seul indice.
            c.shadowColor = 'rgba(167,139,250,.95)'; c.shadowBlur = 18 + Math.sin(o.a * 2) * 5;
            const g = c.createLinearGradient(-o.r, -o.r, o.r, o.r);
            g.addColorStop(0, '#faf5ff'); g.addColorStop(0.45, '#c4b5fd');
            g.addColorStop(0.75, '#8b5cf6'); g.addColorStop(1, '#4c1d95');
            c.fillStyle = g;
            c.beginPath();
            c.moveTo(0, -o.r); c.lineTo(o.r, 0); c.lineTo(0, o.r); c.lineTo(-o.r, 0);
            c.closePath(); c.fill();
            c.shadowBlur = 0;
            // Facette claire, en haut à gauche.
            c.fillStyle = 'rgba(255,255,255,.35)';
            c.beginPath();
            c.moveTo(0, -o.r); c.lineTo(-o.r, 0); c.lineTo(0, 0); c.closePath(); c.fill();
            c.strokeStyle = 'rgba(237,233,254,.9)'; c.lineWidth = 2;
            c.beginPath();
            c.moveTo(0, -o.r); c.lineTo(o.r, 0); c.lineTo(0, o.r); c.lineTo(-o.r, 0);
            c.closePath(); c.stroke();

            c.fillStyle = '#1e1b4b';
            c.textAlign = 'center'; c.textBaseline = 'middle';
            c.font = `900 ${Math.round(o.r * 0.9)}px 'Inter', system-ui, sans-serif`;
            c.fillText(String(o.n), 0, 1);
            c.restore();
        });

        // Le bandeau de consigne : il ne disparaît jamais. Une règle qu'on
        // doit se rappeler est une règle qu'on applique mal.
        const bh = Math.max(38, u * 0.085);
        const bandeau = c.createLinearGradient(0, 34, 0, 34 + bh);
        bandeau.addColorStop(0, 'rgba(49,20,110,.94)');
        bandeau.addColorStop(1, 'rgba(12,6,32,.94)');
        c.fillStyle = bandeau;
        c.beginPath(); c.roundRect(8, 34, w - 16, bh, 14); c.fill();
        c.save();
        c.shadowColor = 'rgba(167,139,250,.8)'; c.shadowBlur = 12;
        c.strokeStyle = '#c4b5fd'; c.lineWidth = 2; c.stroke();
        c.restore();
        c.textAlign = 'center'; c.textBaseline = 'middle';
        let px = Math.max(11, Math.min(17, w * 0.036));
        const txt = `ATTRAPE les multiples de ${f.table}  ·  ÉVITE tous les autres`;
        c.font = `900 ${px}px 'Inter', system-ui, sans-serif`;
        while (px > 9 && c.measureText(txt).width > w - 40) {
            px -= 1; c.font = `900 ${px}px 'Inter', system-ui, sans-serif`;
        }
        c.fillStyle = '#ede9fe';
        c.fillText(txt, w / 2, 34 + bh * 0.36);
        c.font = `800 ${Math.round(px * 0.85)}px 'Inter', system-ui, sans-serif`;
        // La chaîne PULSE quand elle monte : le seul retour qui dit « continue ».
        if (f.chaine > 1) {
            const bat = 1 + Math.max(0, 0.25 - (t % 24) / 96);
            c.save();
            c.translate(w / 2, 34 + bh * 0.75); c.scale(bat, bat);
            c.fillStyle = '#fcd34d';
            c.fillText(`chaîne ×${Math.min(5, f.chaine)} · ${f.pris} attrapés`, 0, 0);
            c.restore();
        } else {
            c.fillStyle = '#a5b4fc';
            c.fillText(`${f.pris} attrapés`, w / 2, 34 + bh * 0.75);
        }

        // La jauge de temps, collée sous le bandeau — et qui vire à l'ambre
        // sur les trois dernières secondes.
        const reste = Math.max(0, 1 - f.t / f.duree);
        const jy = 34 + bh + 5;
        c.fillStyle = 'rgba(148,163,184,.25)';
        c.beginPath(); c.roundRect(10, jy, w - 20, 5, 3); c.fill();
        c.fillStyle = reste < 0.22 ? '#fbbf24' : '#a78bfa';
        c.beginPath(); c.roundRect(10, jy, Math.max(3, (w - 20) * reste), 5, 3); c.fill();
        c.restore();
    }

    /**
     * L'atelier : trois offres, un bouton de départ. Dessiné au canevas comme
     * le reste — pas de DOM à poser sur un canevas plein écran, et les
     * rectangles servent AUSSI de zones tactiles (`zones`).
     */
    dessinerAtelier() {
        const c = this.ctx, w = this.canvas.width, h = this.canvas.height, a = this.atelier;
        if (!a) return;
        a.zones = [];

        c.save();
        c.fillStyle = 'rgba(2,6,23,.9)'; c.fillRect(0, 0, w, h);
        c.textAlign = 'center'; c.textBaseline = 'middle';

        const u = Math.min(w, h);
        c.fillStyle = '#22d3ee';
        c.font = `900 ${Math.round(u * 0.075)}px 'Inter', system-ui, sans-serif`;
        c.fillText('ATELIER ORBITAL', w / 2, h * 0.11);
        c.fillStyle = '#67e8f9';
        c.font = `800 ${Math.round(u * 0.05)}px 'Inter', system-ui, sans-serif`;
        c.fillText(`⬢ ${this.credits} crédits`, w / 2, h * 0.185);

        const marge = Math.max(14, w * 0.06);
        const cw = w - marge * 2;
        const ch = Math.min(88, h * 0.115);
        const ecart = ch + Math.max(10, h * 0.022);
        const y0 = h * 0.26;

        a.offres.forEach((o, i) => {
            const y = y0 + i * ecart;
            const achete = a.achats.includes(o.id);
            const abordable = this.credits >= o.prix;
            a.zones.push({ id: o.id, x: marge, y, w: cw, h: ch });

            c.fillStyle = achete ? 'rgba(34,197,94,.18)'
                : abordable ? 'rgba(30,41,59,.95)' : 'rgba(30,41,59,.5)';
            c.beginPath(); c.roundRect(marge, y, cw, ch, 14); c.fill();
            c.strokeStyle = achete ? '#22c55e' : abordable ? '#38bdf8' : '#475569';
            c.lineWidth = 2; c.stroke();

            c.textAlign = 'left';
            c.fillStyle = achete ? '#86efac' : abordable ? '#e0f2fe' : '#64748b';
            c.font = `900 ${Math.round(u * 0.045)}px 'Inter', system-ui, sans-serif`;
            c.fillText(o.titre, marge + 16, y + ch * 0.34);
            c.fillStyle = achete ? '#4ade80' : abordable ? '#94a3b8' : '#475569';
            c.font = `600 ${Math.round(u * 0.033)}px 'Inter', system-ui, sans-serif`;
            c.fillText(o.desc, marge + 16, y + ch * 0.68);

            c.textAlign = 'right';
            c.fillStyle = achete ? '#22c55e' : abordable ? '#fcd34d' : '#64748b';
            c.font = `900 ${Math.round(u * 0.042)}px 'Inter', system-ui, sans-serif`;
            c.fillText(achete ? '✔ INSTALLÉ' : `⬢ ${o.prix}`, marge + cw - 16, y + ch / 2);
            c.textAlign = 'center';
        });

        // Le bouton de départ, toujours en bas et toujours actif : on peut
        // repartir sans rien acheter, et garder ses crédits pour la suite.
        const bh = Math.min(58, h * 0.08);
        const by = Math.min(h - bh - 18, y0 + a.offres.length * ecart + h * 0.03);
        const bw = Math.min(cw, u * 0.72);
        a.zones.push({ id: 'partir', x: (w - bw) / 2, y: by, w: bw, h: bh });
        const battement = 0.82 + Math.sin(this.frame / 14) * 0.18;
        c.globalAlpha = battement;
        c.fillStyle = '#0891b2';
        c.beginPath(); c.roundRect((w - bw) / 2, by, bw, bh, 16); c.fill();
        c.globalAlpha = 1;
        c.strokeStyle = '#a5f3fc'; c.lineWidth = 2; c.stroke();
        c.fillStyle = '#ecfeff';
        c.font = `900 ${Math.round(u * 0.05)}px 'Inter', system-ui, sans-serif`;
        c.fillText('DÉCOLLAGE ▶', w / 2, by + bh / 2);
        c.restore();
    }

    dessinerMessage() {
        const c = this.ctx, w = this.canvas.width, m = this.message;
        c.save();
        c.globalAlpha = Math.min(1, m.vie / 28);
        c.textAlign = 'center'; c.textBaseline = 'middle';
        // Rétrécir jusqu'à ce que ça rentre. Les messages du Gardien sont
        // longs (« 25 n'est pas dans les nombres PAIRS… ») et se retrouvaient
        // coupés des DEUX côtés : la boîte se bornait à `w - 20`, mais le
        // texte, lui, débordait tranquillement.
        let px = Math.max(13, Math.min(19, w * 0.04));
        const dispo = w - 44;
        c.font = `800 ${px}px 'Inter', system-ui, sans-serif`;
        while (px > 9 && c.measureText(m.texte).width > dispo) {
            px -= 1; c.font = `800 ${px}px 'Inter', system-ui, sans-serif`;
        }
        const lw = c.measureText(m.texte).width;
        const bw = Math.min(w - 20, lw + 30), bh = 34;
        const bx = (w - bw) / 2, by = this.vaisseau.y - 82;
        c.fillStyle = 'rgba(2,6,23,.88)';
        c.beginPath(); c.roundRect(bx, by, bw, bh, 10); c.fill();
        c.strokeStyle = m.ton === 'ok' ? '#22d3ee' : '#f87171'; c.lineWidth = 2; c.stroke();
        c.fillStyle = '#fff'; c.fillText(m.texte, w / 2, by + bh / 2);
        c.restore();
    }

    /**
     * L'écran titre : TROIS DESSINS, trois mots.
     *
     * Il portait douze lignes de règles — le mur, le convoi, le Gardien, la
     * faille, l'atelier, le rayon lourd, la bombe. Personne ne lit douze
     * lignes avant de jouer, et surtout pas l'enfant qui veut appuyer sur
     * START : le briefing exhaustif ne servait qu'à me rassurer.
     *
     * Ne restent que les trois choses qu'on ne peut pas deviner en dix
     * secondes de jeu : comment on pilote, ce qui fait mal, et le fait que les
     * portes se choisissent par le CALCUL. Tout le reste — Gardien, faille,
     * atelier — s'annonce au moment où ça arrive, avec un bandeau qui ne
     * disparaît pas, et le robot en fait la démonstration complète pour qui
     * veut la voir.
     */
    dessinerBriefing() {
        const c = this.ctx, w = this.canvas.width, h = this.canvas.height;
        c.save();
        c.fillStyle = 'rgba(2,6,23,.86)'; c.fillRect(0, 0, w, h);
        c.textAlign = 'center'; c.textBaseline = 'middle';
        const u = Math.min(w, h);
        const T = (txt, x, y, taille, couleur, gras = 900, dispo = w - 28) => {
            let px = Math.max(9, Math.round(taille));
            c.font = `${gras} ${px}px 'Inter', system-ui, sans-serif`;
            while (px > 9 && c.measureText(txt).width > dispo) {
                px -= 1; c.font = `${gras} ${px}px 'Inter', system-ui, sans-serif`;
            }
            c.fillStyle = couleur; c.fillText(txt, x, y);
        };

        if (this.phase !== 'briefing') {
            T(this.compte > 0 ? String(this.compte) : 'GO !', w / 2, h * 0.46,
                u * (this.compte > 0 ? 0.26 : 0.18), this.compte > 0 ? '#e2e8f0' : '#22d3ee');
            c.restore();
            return;
        }

        T('N O V A', w / 2, h * 0.105, u * 0.115, '#22d3ee');
        T('Un jeu de tir où l\'on répond en SE PLAÇANT.', w / 2, h * 0.165, u * 0.038, '#94a3b8', 700);

        // Trois FICHES, pas trois dessins posés à côté de trois phrases.
        // Sans cadre, l'image d'une consigne se retrouvait à hauteur du texte
        // de la suivante : les trois se mélangeaient et rien ne se lisait.
        // Chaque fiche est une boîte : son dessin à gauche, ses mots à droite,
        // et une gouttière que rien ne franchit.
        const enLigne = w > h * 0.95 && w > 620;
        const vignettes = [
            {
                dessin: (x, y, s) => this.iconePilotage(x, y, s), mot: 'GLISSE',
                // La consigne dit le mode RÉELLEMENT actif : annoncer « le
                // canon tire tout seul » alors que le doigt en bas ne tire
                // pas, c'est promettre l'inverse de ce qui va se passer.
                sous: this.tirManuel ? 'en bas tu pilotes, plus haut ça tire' : 'le canon tire tout seul',
                couleur: '#7dd3fc'
            },
            { dessin: (x, y, s) => this.iconeDanger(x, y, s), mot: 'ÉVITE', sous: 'les vaisseaux et leurs tirs', couleur: '#fda4af' },
            { dessin: (x, y, s) => this.iconePorte(x, y, s), mot: 'CALCULE', sous: 'passe par le bon résultat', couleur: '#fcd34d' }
        ];

        const fiche = (x, y, fw, fh, teinte) => {
            c.save();
            c.fillStyle = 'rgba(15,23,42,.72)';
            c.beginPath(); c.roundRect(x, y, fw, fh, Math.min(16, fh * 0.22)); c.fill();
            c.strokeStyle = teinte + '66'; c.lineWidth = 1.5; c.stroke();
            c.restore();
        };

        if (enLigne) {
            const fw = Math.min(w / 3 - 16, 280);
            const fh = Math.min(h * 0.42, 260);
            const y0 = h * 0.24;
            vignettes.forEach((v, i) => {
                const cx = w * (0.5 / 3 + i / 3);
                fiche(cx - fw / 2, y0, fw, fh, v.couleur);
                const s = Math.min(fw * 0.28, fh * 0.22);
                v.dessin(cx, y0 + fh * 0.32, s);
                T(v.mot, cx, y0 + fh * 0.68, u * 0.05, v.couleur, 900, fw - 20);
                T(v.sous, cx, y0 + fh * 0.85, u * 0.032, '#cbd5e1', 700, fw - 20);
            });
        } else {
            const marge = Math.max(12, w * 0.05);
            const fw = w - marge * 2;
            const fh = Math.min(h * 0.15, 108);
            const ecart = fh + Math.max(8, h * 0.018);
            const y0 = h * 0.215;
            // La colonne du dessin est RÉSERVÉE : le texte commence après, quoi
            // qu'il arrive. C'est ce qui manquait — les trois portes du
            // troisième dessin venaient buter dans le mot « CALCULE ».
            const colDessin = Math.min(fh * 0.9, fw * 0.3);
            vignettes.forEach((v, i) => {
                const y = y0 + i * ecart;
                fiche(marge, y, fw, fh, v.couleur);
                const s = Math.min(colDessin * 0.42, fh * 0.34);
                v.dessin(marge + colDessin / 2, y + fh / 2, s);
                const xt = marge + colDessin + 10;
                const dispo = fw - colDessin - 22;
                c.textAlign = 'left';
                T(v.mot, xt, y + fh * 0.36, u * 0.055, v.couleur, 900, dispo);
                T(v.sous, xt, y + fh * 0.68, u * 0.036, '#cbd5e1', 700, dispo);
                c.textAlign = 'center';
            });
        }

        // Le bouton START. Il ne sert pas à viser — l'appui est accepté
        // partout — mais à DIRE qu'on attend le joueur, et non l'inverse.
        const bw = Math.min(w - 60, u * 0.62), bh = Math.min(64, h * 0.09);
        const bx = (w - bw) / 2, by = h * 0.80;
        const battement = 0.75 + Math.sin(this.frame / 13) * 0.25;
        c.save();
        c.globalAlpha = battement;
        c.fillStyle = '#0e7490';
        c.beginPath(); c.roundRect(bx, by, bw, bh, 16); c.fill();
        c.globalAlpha = 1;
        c.strokeStyle = '#67e8f9'; c.lineWidth = 2.5; c.stroke();
        c.fillStyle = '#ecfeff';
        c.font = `900 ${Math.round(u * 0.058)}px 'Inter', system-ui, sans-serif`;
        c.fillText('▶ START', w / 2, by + bh / 2);
        c.restore();
        T('Le reste s\'explique en jeu, au moment où ça arrive.', w / 2, h * 0.93, u * 0.032, '#64748b', 700);
        c.restore();
    }

    /*
     * Les trois pictogrammes de l'écran titre.
     *
     * Chacun tient STRICTEMENT dans le carré [-s, s] : c'est ce qui permet à
     * la mise en page de leur réserver une colonne et de garantir qu'aucun ne
     * viendra mordre sur le texte voisin.
     */

    /** Le vaisseau, et la trace du doigt qui le déplace de gauche à droite. */
    iconePilotage(x, y, s) {
        const c = this.ctx;
        c.save(); c.translate(x, y);
        // La trace, avec une pointe à chaque bout : c'est elle qui dit
        // « de gauche à droite », pas le vaisseau.
        c.strokeStyle = 'rgba(125,211,252,.7)'; c.lineWidth = Math.max(2, s * 0.1);
        c.setLineDash([s * 0.16, s * 0.2]);
        c.beginPath(); c.moveTo(-s * 0.78, s * 0.7); c.lineTo(s * 0.78, s * 0.7); c.stroke();
        c.setLineDash([]);
        c.fillStyle = 'rgba(125,211,252,.85)';
        [-1, 1].forEach(d => {
            c.beginPath();
            c.moveTo(d * s, s * 0.7); c.lineTo(d * s * 0.72, s * 0.5); c.lineTo(d * s * 0.72, s * 0.9);
            c.closePath(); c.fill();
        });
        // Le vaisseau : coque centrale et deux ailerons, pour qu'on lise un
        // engin et non une flèche.
        c.fillStyle = '#0ea5e9';
        c.beginPath();
        c.moveTo(-s * 0.62, s * 0.28); c.lineTo(-s * 0.24, -s * 0.1);
        c.lineTo(-s * 0.3, s * 0.34); c.closePath(); c.fill();
        c.beginPath();
        c.moveTo(s * 0.62, s * 0.28); c.lineTo(s * 0.24, -s * 0.1);
        c.lineTo(s * 0.3, s * 0.34); c.closePath(); c.fill();
        c.fillStyle = '#7dd3fc';
        c.beginPath();
        c.moveTo(0, -s * 0.78); c.lineTo(s * 0.3, s * 0.34); c.lineTo(0, s * 0.14);
        c.lineTo(-s * 0.3, s * 0.34); c.closePath(); c.fill();
        c.fillStyle = '#fde047';
        c.fillRect(-s * 0.05, -s * 0.98, s * 0.1, s * 0.24);
        c.restore();
    }

    /** Un appareil ennemi, dans un panneau d'interdiction. */
    iconeDanger(x, y, s) {
        const c = this.ctx;
        c.save(); c.translate(x, y);
        // L'appareil : nez vers le BAS, deux ailes — la silhouette de ce qui
        // fonce sur le joueur. Barré d'une flèche, on lisait une coche verte.
        c.fillStyle = '#ef4444';
        c.beginPath();
        c.moveTo(0, s * 0.66); c.lineTo(s * 0.32, -s * 0.16); c.lineTo(-s * 0.32, -s * 0.16);
        c.closePath(); c.fill();
        c.fillStyle = '#f87171';
        [-1, 1].forEach(d => {
            c.beginPath();
            c.moveTo(d * s * 0.72, -s * 0.5); c.lineTo(d * s * 0.2, -s * 0.28);
            c.lineTo(d * s * 0.2, s * 0.1); c.closePath(); c.fill();
        });
        c.fillStyle = '#fecaca';
        c.beginPath(); c.arc(0, -s * 0.22, s * 0.12, 0, Math.PI * 2); c.fill();
        // Le panneau. Trait plus fin que l'appareil : il l'entoure, il ne
        // l'efface pas.
        c.strokeStyle = '#fda4af'; c.lineWidth = Math.max(2.5, s * 0.09);
        c.beginPath(); c.arc(0, 0, s * 0.92, 0, Math.PI * 2); c.stroke();
        c.beginPath();
        c.moveTo(-s * 0.65, -s * 0.65); c.lineTo(s * 0.65, s * 0.65); c.stroke();
        c.restore();
    }

    /** Le mur, sa question, et la seule porte qui s'ouvre. */
    iconePorte(x, y, s) {
        const c = this.ctx;
        c.save(); c.translate(x, y);
        c.textAlign = 'center'; c.textBaseline = 'middle';

        // La question, en haut du carré.
        c.fillStyle = '#e2e8f0';
        c.font = `900 ${Math.round(s * 0.38)}px 'Inter', system-ui, sans-serif`;
        c.fillText('5 × 3', 0, -s * 0.72);

        const lw = s * 0.58, lh = s * 0.66, ecart = lw + s * 0.1;
        [['12', false], ['15', true], ['18', false]].forEach(([n, bonne], i) => {
            const px = (i - 1) * ecart;
            c.fillStyle = bonne ? 'rgba(250,204,21,.3)' : 'rgba(148,163,184,.14)';
            c.beginPath(); c.roundRect(px - lw / 2, -s * 0.28, lw, lh, s * 0.1); c.fill();
            c.strokeStyle = bonne ? '#facc15' : '#64748b'; c.lineWidth = bonne ? 2.5 : 1.5;
            c.stroke();
            c.fillStyle = bonne ? '#fef08a' : '#94a3b8';
            c.font = `900 ${Math.round(s * 0.34)}px 'Inter', system-ui, sans-serif`;
            c.fillText(n, px, s * 0.05);
        });
        // Le vaisseau qui monte vers la bonne porte : la consigne devient un
        // geste, pas une phrase.
        c.fillStyle = '#7dd3fc';
        c.beginPath();
        c.moveTo(0, s * 0.5); c.lineTo(s * 0.16, s * 0.86); c.lineTo(-s * 0.16, s * 0.86);
        c.closePath(); c.fill();
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
        cur.say('Bonne porte : bouclier et canon renforcé. Deux épreuves comme celle-là, et le Gardien du secteur se présente.', this.arene);
        if (!await cur.pause(DEMO_SPEED.between + 1600) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        this.porte = null;
        this.lancerConvoi();
        const cv = this.convoi;
        cur.say(`Un CONVOI ! On me demande ${cv.question} : je me place sous le transporteur ${cv.bon} et le canon fait le reste. Abattre un leurre coûte cher.`, this.arene);
        const bonShip = cv.ships.find(s => s.v === cv.bon);
        const suivre = setInterval(() => {
            if (bonShip && bonShip.vivant && this.isRunning) this.vaisseau.cible = bonShip.x;
        }, 120);
        if (!await cur.pause(DEMO_SPEED.between + 4200) || !this.isRunning) { clearInterval(suivre); return fin(); }
        clearInterval(suivre);

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Et si je suis submergé : une DOUBLE TAPE déclenche la bombe NOVA, qui balaie tout l\'écran.', this.arene);
        this.declencherNova();
        if (!await cur.pause(DEMO_SPEED.between + 1800) || !this.isRunning) return fin();

        // Le GARDIEN : la mécanique la plus neuve, donc celle qui mérite le
        // plus d'explications. On la montre en trois temps — la consigne, la
        // bonne sphère, la mine — parce qu'elle inverse le réflexe du jeu :
        // ici, ne PAS tirer est parfois la bonne réponse.
        if (!await gate.waitTurn() || !this.isRunning) return fin();
        this.convoi = null;
        this.lancerBoss();
        const b = this.boss;
        cur.say(`Le GARDIEN ferme le secteur. Mon canon ne lui fait rien : il faut abattre ses sphères — mais seulement ${b.regle.libelle}.`, this.arene);
        if (!await cur.pause(DEMO_SPEED.between + 3000) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Le canon tire tout seul : me placer SOUS une sphère, c\'est décider de l\'abattre. M\'écarter, c\'est la laisser passer.', this.arene);
        const viser = setInterval(() => {
            if (!this.isRunning || !this.boss) return;
            // Le robot se cale sous la première sphère à ABATTRE, et s'écarte
            // des autres : le geste dit la règle mieux qu'une phrase.
            const cible = this.orbes.find(o => b.regle.test(o.n));
            if (cible) this.vaisseau.cible = cible.x;
            else if (this.orbes.length) {
                const gene = this.orbes[0];
                this.vaisseau.cible = gene.x < this.canvas.width / 2
                    ? Math.min(this.canvas.width - 30, gene.x + 130)
                    : Math.max(30, gene.x - 130);
            }
        }, 100);
        if (!await cur.pause(DEMO_SPEED.between + 5200) || !this.isRunning) { clearInterval(viser); return fin(); }
        clearInterval(viser);

        // La FAILLE : elle INVERSE le jeu. Partout ailleurs on évite tout ;
        // ici il faut aller CHERCHER certains nombres. On la montre en deux
        // temps — l'anneau, puis la règle en action — et on laisse le robot
        // esquiver sous les yeux du joueur.
        if (!await gate.waitTurn() || !this.isRunning) return fin();
        this.boss = null; this.orbes = [];
        this.lancerPortail();
        const pt = this.portail;
        cur.say(`Cet anneau, c'est une FAILLE. Rien ne m'oblige à la prendre — mais dedans, il n'y a plus d'ennemis : juste des nombres, et la table de ${pt.table}.`, this.arene);
        const versAnneau = setInterval(() => {
            if (this.isRunning && this.portail) this.vaisseau.cible = this.portail.x;
        }, 100);
        if (!await cur.pause(DEMO_SPEED.between + 2600) || !this.isRunning) { clearInterval(versAnneau); return fin(); }
        clearInterval(versAnneau);
        if (!this.faille && this.isRunning) this.entrerFaille(pt.table);

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say(`Ici mon canon est coupé : j'ATTRAPE les multiples de ${pt.table} et j'ESQUIVE tous les autres. Attraper un nombre qui n'est pas dans la table casse ma chaîne.`, this.arene);
        const trier = setInterval(() => {
            if (!this.isRunning || !this.faille) return;
            const f = this.faille, w = this.canvas.width;
            // Le robot vise le multiple le plus bas ; s'il n'y en a pas, il
            // s'écarte franchement du premier intrus. Le geste dit la règle.
            const bons = f.nombres.filter(o => o.n % f.table === 0 && o.y < this.vaisseau.y);
            if (bons.length) {
                this.vaisseau.cible = bons.sort((a, b) => b.y - a.y)[0].x;
            } else if (f.nombres.length) {
                const gene = f.nombres.sort((a, b) => b.y - a.y)[0];
                this.vaisseau.cible = gene.x < w / 2
                    ? Math.min(w - 30, gene.x + 140) : Math.max(30, gene.x - 140);
            }
        }, 100);
        if (!await cur.pause(DEMO_SPEED.between + 5200) || !this.isRunning) { clearInterval(trier); return fin(); }
        clearInterval(trier);

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Une faille sans faute rapporte des crédits ⬢ et une bombe ✹. Et à l\'ATELIER, ces crédits achètent un canon, une coque ou un bouclier — ça, ça se garde.', this.arene);
        if (!await cur.pause(DEMO_SPEED.between + 2600) || !this.isRunning) return fin();
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
