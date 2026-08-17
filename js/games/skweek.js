// LE PEINTRE — à l'écran.
//
// (Le jeu s'appelait Skweek, d'après le jeu de Loriciels dont il reprend
// l'idée ; les identifiants internes ont gardé ce nom pour ne pas casser les
// statistiques et les parcours déjà enregistrés. Ce que l'élève lit, lui,
// c'est « Le Peintre ».)
//
// Le noyau (core/skweek.js) porte le sol, la règle du niveau, les
// déplacements et les ennemis. Ici : le décor, la caméra, et les commandes.
//
// QUATRE CHOSES ONT COMMANDÉ CE FICHIER.
//
//   · LA CAMÉRA SUIT LE PEINTRE. Le terrain est plus grand que l'écran dès le
//     niveau 3, et sur un téléphone dès le premier : le monde se déplace sous
//     le personnage, qui reste au centre. Sans cela, il faudrait choisir entre
//     des dalles minuscules et un terrain qu'on ne voit pas.
//   · IL SE JOUE AU DOIGT. Une croix directionnelle posée en bas de l'écran,
//     ET le glissé sur le terrain lui-même : deux gestes pour le même
//     déplacement, parce qu'aucun des deux ne convient à tout le monde.
//   · CHAQUE DALLE SE LIT. Le calcul est écrit dessus, en gros ; la dalle
//     peinte garde son calcul mais change de couleur — l'élève doit pouvoir
//     revenir en arrière du regard et vérifier ce qu'il a trié.
//   · ON VISE SANS AVANCER. Le pas reste calé sur les cases : c'est ce qui
//     fait qu'on trie dalle par dalle, et un déplacement libre casserait
//     l'exercice. Mais on ne tire que devant soi — donc viser un blob
//     obligeait à marcher vers lui, c'est-à-dire à repeindre une dalle qu'on
//     n'avait pas choisie. Le bouton 🎯 (ou MAJ + flèche) tourne la tête, et
//     rien d'autre.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    TROU, BLEUE, ROSE, CASSEE, NIVEAUX, niveauDe, genererNiveau, caseDe,
    deplacer, viser, avancerEnnemis, toucheJoueur, tirer, avancerTirs, avancement, accessibles
} from '../core/skweek.js';

const COMPETENCE = 'num.calc.tri';
const CASE_MAX = 62;             // le côté d'une dalle sur un grand écran
const CASE_LISIBLE = 50;         // en dessous, « 61 − 19 » ne tient plus

class Skweek extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'skweek');
        this.rng = makeRng(this.params.seed);
        this.niveauCourant = Number(this.params.niveau) || 1;
        this.viesDepart = Number(this.params.vies) || 3;
        this.rafId = null;
        this.cote = CASE_MAX;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .sk-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 7px;
                    width: 100%; height: 100%; padding: 6px; box-sizing: border-box;
                    color: var(--text-main); container-type: inline-size; overflow: hidden;
                }
                .sk-tete {
                    display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
                    justify-content: center; font-size: .88rem; flex: 0 0 auto;
                }
                /* LA CONSIGNE EST LE CŒUR DU JEU : elle dit ce qu'on repeint.
                   Elle reste sous les yeux, en couleur, tout le niveau. */
                .sk-regle {
                    font-weight: 900; font-size: clamp(13px, 3cqw, 17px);
                    padding: 4px 14px; border-radius: 999px; color: #fff;
                    background: linear-gradient(135deg, #ec4899, #a855f7);
                    box-shadow: 0 3px 10px rgba(168,85,247,.4);
                }
                .sk-jauge {
                    width: min(42cqw, 190px); height: 11px; border-radius: 999px;
                    background: color-mix(in srgb, var(--text-main) 14%, transparent);
                    overflow: hidden; border: 1.5px solid var(--text-main);
                }
                .sk-jauge > div { height: 100%; background: linear-gradient(90deg, #f472b6, #ec4899); transition: width .2s; }

                /* LA LUCARNE : le monde défile dedans. */
                .sk-vue {
                    position: relative; overflow: hidden; flex: 1 1 auto; min-height: 180px;
                    width: 100%; border-radius: 14px; touch-action: none; user-select: none;
                    border: 3px solid color-mix(in srgb, var(--text-main) 65%, transparent);
                    background:
                        radial-gradient(circle at 30% 15%, rgba(129,140,248,.30), transparent 55%),
                        linear-gradient(160deg, #1e1b4b 0%, #312e81 55%, #1e1b4b 100%);
                    box-shadow: inset 0 0 60px rgba(0,0,0,.55);
                }
                .sk-monde { position: absolute; left: 0; top: 0; will-change: transform; }

                /* LA DALLE. Bleue à trier, rose repeinte, et un vide là où le
                   sol a cédé — on doit voir le trou de loin, c'est lui qui
                   dit « attention, on ne passe plus ». */
                .sk-dalle {
                    position: absolute; box-sizing: border-box;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 900; border-radius: 9px; text-align: center;
                    line-height: 1; letter-spacing: -.02em;
                }
                .sk-dalle--bleue {
                    background: linear-gradient(160deg, #38bdf8 0%, #0284c7 55%, #075985 100%);
                    color: #f0f9ff; border: 2px solid #0c4a6e;
                    box-shadow: inset 0 3px 0 rgba(255,255,255,.35), 0 3px 0 #0c4a6e;
                    text-shadow: 0 1px 2px rgba(0,0,0,.45);
                }
                .sk-dalle--rose {
                    background: linear-gradient(160deg, #fbcfe8 0%, #f472b6 55%, #db2777 100%);
                    color: #500724; border: 2px solid #9d174d;
                    box-shadow: inset 0 3px 0 rgba(255,255,255,.5), 0 3px 0 #9d174d;
                    animation: sk-peint .32s ease;
                }
                @keyframes sk-peint { 40% { scale: 1.18; filter: brightness(1.5); } }
                .sk-dalle--cassee {
                    background: radial-gradient(circle, rgba(0,0,0,.75) 40%, transparent 72%);
                    border: 0; box-shadow: none; animation: sk-tombe .35s ease;
                }
                @keyframes sk-tombe { from { scale: 1; opacity: 1; } to { scale: .55; opacity: 1; } }

                /* LE PEINTRE : une boule rose à deux yeux, qui rebondit en marchant. */
                .sk-heros {
                    position: absolute; border-radius: 50%; z-index: 3;
                    background: radial-gradient(circle at 35% 28%, #fff 0%, #f9a8d4 35%, #ec4899 75%, #be185d 100%);
                    border: 2.5px solid #831843;
                    box-shadow: 0 4px 12px rgba(0,0,0,.45), inset -4px -5px 10px rgba(157,23,77,.55);
                    display: flex; align-items: center; justify-content: center; gap: 12%;
                    transition: left .11s linear, top .11s linear;
                }
                .sk-heros i {
                    width: 20%; height: 26%; border-radius: 50%; background: #1e1b4b;
                    box-shadow: inset 0 -2px 0 rgba(255,255,255,.35);
                }
                /* IL REGARDE OÙ IL VA. Les yeux glissent vers la direction du
                   dernier pas : au doigt, c'est le seul retour qui dit dans
                   quel sens le prochain pas partira. */
                .sk-heros i { transition: translate .12s ease; }
                .sk-heros[data-dir="droite"] i { translate: 26% 0; }
                .sk-heros[data-dir="gauche"] i { translate: -26% 0; }
                .sk-heros[data-dir="haut"] i { translate: 0 -24%; }
                .sk-heros[data-dir="bas"] i { translate: 0 24%; }
                .sk-heros--bond { animation: sk-bond .22s ease; }
                @keyframes sk-bond { 45% { scale: 1.14 .88; } }
                .sk-heros--touche { animation: sk-touche .4s ease 2; }
                @keyframes sk-touche { 50% { filter: brightness(2) saturate(0); } }

                /* L'ENNEMI : un blob vert menaçant, qui pulse. */
                .sk-ennemi {
                    position: absolute; border-radius: 44% 44% 40% 40%; z-index: 2;
                    background: radial-gradient(circle at 36% 30%, #bbf7d0 0%, #4ade80 40%, #15803d 100%);
                    border: 2.5px solid #14532d;
                    box-shadow: 0 3px 9px rgba(0,0,0,.4);
                    display: flex; align-items: center; justify-content: center; gap: 14%;
                    transition: left .16s linear, top .16s linear;
                    animation: sk-pulse .9s ease-in-out infinite alternate;
                }
                .sk-ennemi i { width: 18%; height: 22%; border-radius: 50%; background: #052e16; }
                @keyframes sk-pulse { to { scale: 1.08 .94; } }

                .sk-tir {
                    position: absolute; border-radius: 50%; z-index: 4;
                    background: radial-gradient(circle, #fef9c3 0%, #facc15 55%, transparent 78%);
                    box-shadow: 0 0 12px rgba(250,204,21,.9);
                }

                /* LES COMMANDES TACTILES : une croix, assez grosse pour un
                   pouce, posée SOUS la lucarne pour ne rien recouvrir. */
                .sk-pied { display: flex; gap: 16px; align-items: center; justify-content: center;
                    flex: 0 0 auto; flex-wrap: wrap; }
                .sk-croix { display: grid; grid-template-columns: repeat(3, 46px);
                    grid-template-rows: repeat(3, 40px); gap: 3px; }
                .sk-fleche {
                    border: 0; border-radius: 10px; cursor: pointer; font-size: 1.2rem;
                    background: color-mix(in srgb, var(--text-main) 12%, var(--bg-panel));
                    color: var(--text-main); font-weight: 900; font-family: inherit;
                    -webkit-tap-highlight-color: transparent; touch-action: manipulation;
                }
                .sk-fleche:active { background: var(--primary); color: #fff; scale: .93; }
                .sk-feu {
                    width: 62px; height: 62px; border-radius: 50%; border: 0; cursor: pointer;
                    background: radial-gradient(circle at 34% 30%, #fde68a, #f59e0b 60%, #b45309);
                    color: #451a03; font-weight: 900; font-size: .8rem; font-family: inherit;
                    box-shadow: 0 4px 10px rgba(180,83,9,.5); touch-action: manipulation;
                }
                .sk-feu:active { scale: .9; }
                /* LA VISÉE. Un interrupteur, pas un geste caché : tant qu'il
                   est allumé, les flèches tournent la tête sans faire un pas.
                   Au clavier, Maj + flèche fait la même chose sans mode. */
                .sk-viser {
                    width: 46px; height: 46px; border-radius: 50%; border: 0; cursor: pointer;
                    font-size: 1.1rem; font-family: inherit; touch-action: manipulation;
                    background: color-mix(in srgb, var(--text-main) 12%, var(--bg-panel));
                    -webkit-tap-highlight-color: transparent;
                }
                .sk-viser[aria-pressed="true"] {
                    background: radial-gradient(circle at 35% 30%, #fecaca, #ef4444 65%, #991b1b);
                    box-shadow: 0 0 0 3px rgba(239,68,68,.35);
                }
                /* Le peintre en visée : un halo qui dit qu'un pas ne partira pas. */
                .sk-heros--vise { box-shadow: 0 0 0 3px rgba(239,68,68,.75), 0 4px 12px rgba(0,0,0,.45); }
                .sk-note { min-height: 1.9em; text-align: center; font-size: .84rem;
                    color: var(--text-muted); flex: 0 0 auto; max-width: 640px; }
                .sk-note--ok { color: var(--success, #16a34a); font-weight: 700; }
                .sk-note--ko { color: var(--danger, #dc2626); font-weight: 600; }

                /* Sur un grand écran, la croix n'est pas nécessaire : les
                   flèches du clavier suffisent. Elle reste, mais discrète. */
                @container (min-width: 760px) { .sk-croix { opacity: .55; } }

                .sk-corps {
                    display: flex; flex-direction: column; align-items: center; gap: 7px;
                    flex: 1 1 auto; width: 100%; min-height: 0;
                }
                /* TÉLÉPHONE COUCHÉ : il ne reste plus assez de hauteur pour
                   empiler la lucarne et la croix. On met la croix à côté —
                   sinon elle sort de l'écran et le jeu devient injouable. */
                @media (max-height: 560px) {
                    .sk-corps { flex-direction: row; align-items: stretch; gap: 10px; }
                    .sk-vue { min-height: 0; min-width: 0; }
                    .sk-pied { flex-direction: column; gap: 8px; justify-content: center; }
                    .sk-croix { grid-template-columns: repeat(3, 38px); grid-template-rows: repeat(3, 32px); }
                    .sk-feu { width: 50px; height: 50px; font-size: .72rem; }
                    .sk-note { min-height: 1.3em; font-size: .76rem; }
                    .sk-tete { font-size: .78rem; gap: 8px; }
                }
            </style>
            <div class="sk-wrap">
                <div class="sk-tete">
                    <span class="sk-regle" data-regle></span>
                    <span data-vies></span>
                    <div class="sk-jauge"><div data-jauge></div></div>
                    <span data-pc>0 %</span>
                    <span data-chrono></span>
                </div>
                <div class="sk-corps">
                    <div class="sk-vue" data-vue tabindex="0" aria-label="Terrain du Peintre">
                        <div class="sk-monde" data-monde></div>
                    </div>
                    <div class="sk-pied">
                        <div class="sk-croix">
                            <span></span><button type="button" class="sk-fleche" data-dir="haut">▲</button><span></span>
                            <button type="button" class="sk-fleche" data-dir="gauche">◀</button>
                            <span></span>
                            <button type="button" class="sk-fleche" data-dir="droite">▶</button>
                            <span></span><button type="button" class="sk-fleche" data-dir="bas">▼</button><span></span>
                        </div>
                        <button type="button" class="sk-viser" data-viser
                            aria-pressed="false" title="Tourner sans avancer">🎯</button>
                        <button type="button" class="sk-feu" data-feu>TIR</button>
                    </div>
                </div>
                <div class="sk-note" data-note></div>
            </div>`;
        this.vueEl = this.container.querySelector('[data-vue]');
        this.mondeEl = this.container.querySelector('[data-monde]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.brancherCommandes();

        // On tourne le téléphone : la dalle change de taille, le sol se
        // redessine. Sinon la caméra viserait dans un monde qui n'existe plus.
        this.observateur = new ResizeObserver(() => {
            if (!this.etat) return;
            const t = this.tailleTerrain();
            // Le terrain ne se refait PAS pour quelques pixels : on perdrait la
            // partie en cours. Seule une rotation d'écran, qui change vraiment
            // ce qu'on peut afficher, justifie de reposer un niveau.
            if (t.cols !== this.etat.cols || t.lignes !== this.etat.lignes) return this.poser();
            if (this.coteDalle() !== this.cote) return this.dessinerSol();
            this.cadrer();
        });
        this.observateur.observe(this.vueEl);
    }

    brancherCommandes() {
        this.container.querySelectorAll('[data-dir]').forEach(b => {
            b.onclick = () => this.aller(b.dataset.dir);
        });
        this.container.querySelector('[data-feu]').onclick = () => this.feu();

        // L'INTERRUPTEUR DE VISÉE. Tant qu'il est allumé, les flèches tournent
        // la tête sans faire un pas : on choisit sa direction de tir sans
        // repeindre une dalle qu'on n'avait pas décidé de repeindre.
        this.viseSeulement = false;
        const bViser = this.container.querySelector('[data-viser]');
        bViser.onclick = () => {
            this.viseSeulement = !this.viseSeulement;
            bViser.setAttribute('aria-pressed', String(this.viseSeulement));
            this.herosEl?.classList.toggle('sk-heros--vise', this.viseSeulement);
            this.note(this.viseSeulement
                ? '🎯 Visée : les flèches tournent la tête, elles ne font plus avancer. '
                  + 'Appuie sur TIR, puis rappuie sur 🎯 pour repartir.'
                : 'Les flèches font de nouveau avancer.');
        };

        // Le clavier : flèches et ZQSD, espace pour tirer. MAJ + flèche vise
        // sans avancer — pas de mode à retenir pour qui a un clavier.
        this.surTouche = (e) => {
            if (this.isDemo || !this.isRunning) return;
            const dir = {
                ArrowLeft: 'gauche', ArrowRight: 'droite', ArrowUp: 'haut', ArrowDown: 'bas',
                q: 'gauche', d: 'droite', z: 'haut', s: 'bas'
            }[e.key] || {}[e.key];
            if (dir) { e.preventDefault(); this.aller(dir, e.shiftKey); }
            else if (e.key === ' ') { e.preventDefault(); this.feu(); }
        };
        document.addEventListener('keydown', this.surTouche);

        // LE PEINTRE SUIT LE DOIGT. On touche une dalle voisine, il y va ; on garde
        // le doigt posé et on le promène, il suit dalle par dalle, en tournant
        // la tête vers là où il marche. C'est le geste le plus direct : on
        // désigne la case où l'on veut aller, on ne compose pas une direction.
        // La croix et le clavier restent — trois façons pour trois mains.
        let suit = false;
        const versDalle = (ev) => {
            const r = this.mondeEl.getBoundingClientRect();
            if (!r.width) return null;
            return {
                x: Math.floor((ev.clientX - r.left) / this.cote),
                y: Math.floor((ev.clientY - r.top) / this.cote)
            };
        };
        // Un pas AU PLUS par événement, vers la case visée : un doigt rapide
        // saute des dalles, et le peintre ne doit pas les sauter avec lui — il
        // les repeint une à une, ou s'arrête sur la première qui casse.
        const versLa = (ev) => {
            const but = versDalle(ev);
            if (!but) return;
            const dx = but.x - this.etat.joueur.x, dy = but.y - this.etat.joueur.y;
            if (!dx && !dy) return;
            this.aller(Math.abs(dx) > Math.abs(dy)
                ? (dx > 0 ? 'droite' : 'gauche') : (dy > 0 ? 'bas' : 'haut'));
        };
        this.vueEl.onpointerdown = (ev) => {
            if (this.isDemo || this.finie) return;
            ev.preventDefault();
            suit = true;
            try { this.vueEl.setPointerCapture(ev.pointerId); } catch { /* sans capture */ }
            versLa(ev);
        };
        this.vueEl.onpointermove = (ev) => { if (suit) versLa(ev); };
        const lacher = () => { suit = false; };
        this.vueEl.onpointerup = lacher;
        this.vueEl.onpointercancel = lacher;
    }

    startGameLoop() {
        this.vies = this.viesDepart;
        this.poser();
        this.boucle();
    }

    poser() {
        this.etat = genererNiveau({
            niveau: this.niveauCourant,
            ennemis: this.params.ennemis || 'non',
            ...this.tailleTerrain()
        }, this.rng);
        this.reste = this.etat.secondes;
        this.finie = false;
        this.container.querySelector('[data-regle]').textContent =
            `Repeins ${this.etat.regle.consigne}`;
        this.dessinerSol();
        this.majTete();
        this.note(`Niveau ${this.etat.niveau} — marche sur les dalles qui vérifient la règle. `
            + 'Les autres s\'effritent !');
        return true;
    }

    // --- Le dessin ------------------------------------------------------------

    /**
     * TOUT LE NIVEAU TIENT À L'ÉCRAN — plus de défilement.
     *
     * On ne rétrécit pas les dalles jusqu'à faire entrer dix-neuf colonnes :
     * le calcul qu'une dalle porte EST le jeu, et sous cinquante pixels il ne
     * se lit plus. C'est donc le TERRAIN qui se replie à ce que l'écran peut
     * montrer lisiblement, et la dalle prend ensuite toute la place restante.
     */
    tailleTerrain() {
        const vw = this.vueEl?.clientWidth || 600, vh = this.vueEl?.clientHeight || 420;
        return {
            cols: Math.max(6, Math.floor(vw / CASE_LISIBLE)),
            lignes: Math.max(6, Math.floor(vh / CASE_LISIBLE))
        };
    }

    /** La dalle remplit la vue une fois le terrain choisi. */
    coteDalle() {
        const e = this.etat;
        if (!e || !this.vueEl) return CASE_MAX;
        return Math.max(24, Math.min(CASE_MAX,
            Math.floor(Math.min(this.vueEl.clientWidth / e.cols, this.vueEl.clientHeight / e.lignes))));
    }

    dessinerSol() {
        const e = this.etat;
        const CASE = this.cote = this.coteDalle();
        const k = CASE / CASE_MAX;                 // tout le reste suit la dalle
        this.mondeEl.style.width = `${e.cols * CASE}px`;
        this.mondeEl.style.height = `${e.lignes * CASE}px`;
        let html = '';
        for (let y = 0; y < e.lignes; y++) for (let x = 0; x < e.cols; x++) {
            const c = caseDe(e, x, y);
            if (c.etat === TROU) continue;
            // La dalle du départ est DÉJÀ rose : le peintre se tient dessus. La
            // dessiner en bleu la laisserait bleue pour toujours — majDalle ne
            // repasse que sur les dalles qu'on foule.
            html += `<div class="sk-dalle ${c.etat === ROSE ? 'sk-dalle--rose' : 'sk-dalle--bleue'}"
                data-c="${y * e.cols + x}"
                style="left:${x * CASE + 2}px; top:${y * CASE + 2}px;
                width:${CASE - 4}px; height:${CASE - 4}px;
                font-size:${Math.max(12, Math.round((c.calcul.length > 6 ? 14 : 17) * k))}px">${c.calcul}</div>`;
        }
        const cote = Math.round(CASE * 0.74);
        html += `<div class="sk-heros" data-heros style="width:${cote}px; height:${cote}px">
            <i></i><i></i></div>`;
        this.mondeEl.innerHTML = html;
        this.herosEl = this.mondeEl.querySelector('[data-heros]');
        this.dalles = new Map();
        this.mondeEl.querySelectorAll('[data-c]').forEach(el => this.dalles.set(Number(el.dataset.c), el));
        this.placerHeros();
        this.majMobiles();
    }

    placerHeros() {
        const { x, y } = this.etat.joueur;
        this.herosEl.dataset.dir = this.etat.joueur.dir || 'droite';
        const CASE = this.cote, marge = Math.round(CASE * 0.13);
        this.herosEl.style.left = `${x * CASE + marge}px`;
        this.herosEl.style.top = `${y * CASE + marge}px`;
        this.herosEl.classList.toggle('sk-heros--vise', !!this.viseSeulement);
        this.herosEl.classList.remove('sk-heros--bond');
        void this.herosEl.offsetWidth;
        this.herosEl.classList.add('sk-heros--bond');
        this.cadrer();
    }

    /** LA CAMÉRA : le peintre au centre, sans jamais montrer le vide au-delà. */
    cadrer() {
        const e = this.etat, CASE = this.cote;
        const vw = this.vueEl.clientWidth, vh = this.vueEl.clientHeight;
        const mondeW = e.cols * CASE, mondeH = e.lignes * CASE;
        const cx = e.joueur.x * CASE + CASE / 2, cy = e.joueur.y * CASE + CASE / 2;
        const x = mondeW <= vw ? (vw - mondeW) / 2 : Math.min(0, Math.max(vw - mondeW, vw / 2 - cx));
        const y = mondeH <= vh ? (vh - mondeH) / 2 : Math.min(0, Math.max(vh - mondeH, vh / 2 - cy));
        this.mondeEl.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    }

    /** Les ennemis et les tirs : recréés à chaque pas, ils sont peu nombreux. */
    majMobiles() {
        this.mondeEl.querySelectorAll('.sk-ennemi, .sk-tir').forEach(el => el.remove());
        const CASE = this.cote;
        const marge = Math.round(CASE * 0.145), cote = CASE - 2 * marge;
        const tir = Math.round(CASE * 0.29);
        const frag = document.createDocumentFragment();
        this.etat.ennemis.forEach(en => {
            const el = document.createElement('div');
            el.className = 'sk-ennemi';
            el.style.cssText = `left:${en.x * CASE + marge}px; top:${en.y * CASE + marge}px;
                width:${cote}px; height:${cote}px`;
            el.innerHTML = '<i></i><i></i>';
            frag.appendChild(el);
        });
        this.etat.tirs.forEach(t => {
            const el = document.createElement('div');
            el.className = 'sk-tir';
            el.style.cssText = `left:${t.x * CASE + (CASE - tir) / 2}px;
                top:${t.y * CASE + (CASE - tir) / 2}px;
                width:${tir}px; height:${tir}px`;
            frag.appendChild(el);
        });
        this.mondeEl.appendChild(frag);
    }

    majDalle(x, y) {
        const e = this.etat;
        const el = this.dalles.get(y * e.cols + x);
        if (!el) return;
        const c = caseDe(e, x, y);
        el.classList.toggle('sk-dalle--bleue', c.etat === BLEUE);
        el.classList.toggle('sk-dalle--rose', c.etat === ROSE);
        el.classList.toggle('sk-dalle--cassee', c.etat === CASSEE);
        if (c.etat === CASSEE) el.textContent = '';
    }

    majTete() {
        const e = this.etat;
        const pc = avancement(e);
        this.container.querySelector('[data-vies]').textContent =
            '💗'.repeat(Math.max(0, this.vies)) + '🖤'.repeat(Math.max(0, this.viesDepart - this.vies));
        this.container.querySelector('[data-jauge]').style.width = `${pc}%`;
        this.container.querySelector('[data-pc]').textContent = `${pc} %`;
        this.container.querySelector('[data-chrono]').textContent = `⏱ ${Math.max(0, Math.ceil(this.reste))} s`;
    }

    // --- Jouer ------------------------------------------------------------------

    aller(direction, viseSeulement = false) {
        if (this.isDemo || !this.etat || this.finie) return;
        // VISER, C'EST TOURNER LA TÊTE. Aucun pas, donc aucune dalle repeinte,
        // donc aucune réponse enregistrée : on sort tout de suite.
        if (viseSeulement || this.viseSeulement) {
            viser(this.etat, direction);
            this.placerHeros();
            return;
        }
        const r = deplacer(this.etat, direction);
        if (r.case) this.majDalle(this.etat.joueur.x + (r.casse ? DECAL[direction][0] : 0),
            this.etat.joueur.y + (r.casse ? DECAL[direction][1] : 0));
        this.placerHeros();
        this.majTete();

        // La consigne se dit « les multiples de 3 » : on la met toujours entre
        // guillemets pour que la phrase reste française quel que soit le niveau.
        const demande = `« ${this.etat.regle.consigne} »`;
        const question = (c) => `${c.calcul} fait-il partie de ${demande} ?`;
        if (r.peint) {
            // CHAQUE DALLE REPEINTE EST UN CALCUL TRIÉ JUSTE.
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: question(r.case),
                expected: 'oui', given: 'oui', points: 2
            });
            if (r.gagne) return this.gagne();
        } else if (r.casse) {
            this.note(`💥 ${r.case.calcul} = ${r.case.valeur} : la règle demande ${demande}. `
                + 'La dalle s\'effrite !', 'ko');
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: question(r.case),
                input: 'oui', expected: 'non',
                customMessage: `${r.case.calcul} = ${r.case.valeur}, et ${r.case.valeur} ne fait pas partie de ${demande}.`
            });
        }
    }

    feu() {
        if (this.isDemo || !this.etat || this.finie) return;
        if (this.etat.tirs.length >= 2) return;      // pas de mitraille
        tirer(this.etat);
        this.majMobiles();
    }

    gagne() {
        this.finie = true;
        this.note(`🎉 Niveau ${this.etat.niveau} terminé : tout est rose !`, 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Le Peintre niveau ${this.etat.niveau} — ${this.etat.regle.consigne}`,
            expected: 'sol repeint', given: 'sol repeint',
            points: 15 + this.etat.niveau * 5
        });
        this.niveauCourant = Math.min(NIVEAUX.length, this.niveauCourant + 1);
        setTimeout(() => { if (this.isRunning) this.poser(); }, 1800);
    }

    perdreVie(pourquoi) {
        this.vies--;
        this.majTete();
        if (this.herosEl) {
            this.herosEl.classList.remove('sk-heros--touche');
            void this.herosEl.offsetWidth;
            this.herosEl.classList.add('sk-heros--touche');
        }
        if (this.vies > 0) {
            this.note(`${pourquoi} On recommence le niveau.`, 'ko');
            this.finie = true;
            setTimeout(() => { if (this.isRunning) this.poser(); }, 1500);
            return;
        }
        this.finie = true;
        this.note(`${pourquoi} Plus de vies — on repart du premier niveau.`, 'ko');
        this.vies = this.viesDepart;
        this.niveauCourant = 1;
        setTimeout(() => { if (this.isRunning) this.poser(); }, 1900);
    }

    // --- La cadence ---------------------------------------------------------------

    boucle() {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        let dernier = 0, horlogeEnnemis = 0, horlogeTirs = 0;
        const pas = (t) => {
            this.rafId = requestAnimationFrame(pas);
            if (!this.isRunning || !this.etat || this.finie) { dernier = t; return; }
            const dt = dernier ? (t - dernier) / 1000 : 0;
            dernier = t;
            this.reste -= dt;
            if (this.reste <= 0) return this.perdreVie('⏱ Le temps est écoulé !');

            horlogeEnnemis += dt;
            if (horlogeEnnemis > 0.42) {
                horlogeEnnemis = 0;
                avancerEnnemis(this.etat, this.rng);
                this.majMobiles();
                if (toucheJoueur(this.etat)) return this.perdreVie('👾 Un ennemi t\'a touché !');
            }
            horlogeTirs += dt;
            if (horlogeTirs > 0.09 && this.etat.tirs.length) {
                horlogeTirs = 0;
                avancerTirs(this.etat);
                this.majMobiles();
            }
            this.majTete();
        };
        this.rafId = requestAnimationFrame(pas);
    }

    showNext() { return this.poser(); }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'sk-note' + (ton ? ` sk-note--${ton}` : '');
    }

    // --- La démonstration -----------------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.etat) this.poser();
        if (!await cur.pause(600) || !this.isRunning) return fin();
        cur.say(`La règle est écrite en haut, et elle commande tout : ici, on repeint `
            + `${this.etat.regle.consigne}. Chaque dalle porte un calcul.`,
            this.container.querySelector('[data-regle]'));
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Je ne marche JAMAIS sans avoir lu. Une dalle qui ne vérifie pas la règle '
            + 's\'effrite sous mes pieds — et le terrain qu\'elle emporte ne revient pas.', this.vueEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        // Quelques pas VERS des dalles justes : le robot montre le tri. Il
        // s'arrête une fois devant une dalle piégée pour dire pourquoi il ne
        // la prend pas — c'est là que se joue toute la leçon.
        let piegeMontre = false;
        for (let k = 0; k < 6; k++) {
            const buts = accessibles(this.etat);
            if (!buts.length) break;
            const voisines = Object.keys(DECAL).map(dir => ({
                dir, c: caseDe(this.etat, this.etat.joueur.x + DECAL[dir][0], this.etat.joueur.y + DECAL[dir][1])
            })).filter(v => v.c && v.c.etat === BLEUE);

            // Une dalle piégée à côté : on la montre une fois, puis on l'évite.
            const piege = !piegeMontre && voisines.find(v => !v.c.bonne);
            // Sinon on avance vers la dalle à repeindre la plus proche.
            const but = buts[0];
            const dx = but.x - this.etat.joueur.x, dy = but.y - this.etat.joueur.y;
            const vise = Math.abs(dx) > Math.abs(dy)
                ? (dx > 0 ? 'droite' : 'gauche') : (dy > 0 ? 'bas' : 'haut');
            const bonne = voisines.find(v => v.dir === vise && v.c.bonne) || voisines.find(v => v.c.bonne);
            const choisie = piege || bonne;
            if (!choisie) break;

            if (!await gate.waitTurn() || !this.isRunning) return fin();
            // LA BULLE POINTE LA DALLE DONT ELLE PARLE, pas le terrain : sinon
            // la flèche désigne une dalle voisine et l'élève lit le mauvais calcul.
            const { dir, c } = choisie;
            const el = this.dalles.get((this.etat.joueur.y + DECAL[dir][1]) * this.etat.cols
                + this.etat.joueur.x + DECAL[dir][0]) || this.vueEl;
            cur.say(`${c.calcul} fait ${c.valeur} : ${c.bonne
                ? 'ça vérifie la règle, j\'y vais'
                : 'ça ne la vérifie PAS, je ne marche pas dessus'}.`, el);
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();

            if (c.bonne) {
                const r = deplacer(this.etat, dir);
                if (r.case) this.majDalle(this.etat.joueur.x, this.etat.joueur.y);
                this.placerHeros();
                this.majTete();
            } else piegeMontre = true;
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('On lit, on calcule, PUIS on avance. Le bouton TIR sert aux blobs verts — '
            + 'ils ne se calculent pas, eux — et le 🎯 tourne la tête SANS avancer, pour '
            + 'les viser sans repeindre une dalle au passage.',
        this.container.querySelector('[data-viser]'));
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        if (this.surTouche) { document.removeEventListener('keydown', this.surTouche); this.surTouche = null; }
        if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
        if (this.observateur) { this.observateur.disconnect(); this.observateur = null; }
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

const DECAL = { droite: [1, 0], gauche: [-1, 0], haut: [0, -1], bas: [0, 1] };

export function engineSkweek(container, isDemo, params) {
    const jeu = new Skweek(container, isDemo, params);
    jeu.start();
    return jeu;
}
