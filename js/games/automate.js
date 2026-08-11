// L'AUTOMATE — l'élève tient le rôle de l'ordinateur.
//
// Le programme est déjà écrit, en blocs façon Scratch. Personne ne demande de
// l'améliorer ni de le compléter : il faut l'EXÉCUTER, bloc après bloc, en
// déplaçant le robot sur le quadrillage. Le bloc en cours s'allume — c'est le
// compteur ordinal, rendu visible —, et quand la boucle repart, l'élève voit
// l'allumage REMONTER dans le programme.
//
// C'est ce saut arrière qui justifie l'exercice. Un enfant qui empile des blocs
// jusqu'à ce que « ça marche » peut très bien n'avoir jamais compris qu'une
// boucle revient en arrière : il croit qu'elle recopie le corps plus bas. Ici,
// il ne peut pas l'ignorer, parce que c'est lui qui remonte.
//
// Les règles — le déroulé, le jugement d'un geste, le tirage des programmes —
// vivent dans core/automate.js, testées sans navigateur.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    tirerProgramme, derouler, jugerGeste, jugerArrivee, direBloc,
    devant, nomCap, tourner, PALIERS, palierPour, TAILLES_NIVEAU
} from '../core/automate.js';

const SKILL = 'geo.espace.programme';
const ANGLES = { N: 0, E: 90, S: 180, O: 270 };

const MODES = {
    guide: { surligneur: true, prediction: false },
    seul: { surligneur: false, prediction: false },
    arrivee: { surligneur: false, prediction: true }
};

class Automate extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'automate');
        this.niveau = TAILLES_NIVEAU[this.params.niveau] ? this.params.niveau : 'moyen';
        // « progressif » : le jeu conduit lui-même l'élève de palier en palier
        // et ANNONCE chaque changement. Les trois modes figés restent, pour le
        // professeur qui veut poser toute une classe sur la même marche.
        this.mode = MODES[this.params.mode] ? this.params.mode : 'progressif';
        this.palierIndex = -1;
        this.rng = makeRng(this.params.seed);
        this.reussis = 0;
        this.erreurs = 0;
    }

    // Pendant la démonstration, on montre TOUJOURS le mode guidé : le robot
    // explique le bloc allumé et la boucle qui remonte, ce qui n'aurait aucun
    // sens sans surligneur — ni en mode prédiction, où il n'y a rien à exécuter.
    get reglage() {
        if (this.isDemo) return MODES.guide;
        if (this.mode === 'progressif') return palierPour(this.reussis).palier;
        return MODES[this.mode];
    }

    /** Le niveau de programme à tirer : celui du palier, ou celui des réglages. */
    get niveauCourant() {
        return this.mode === 'progressif' ? palierPour(this.reussis).palier.niveau : this.niveau;
    }

    // --- Mise en place ---------------------------------------------------------

    render() {
        this.container.innerHTML = `
            <style>
                .au-wrap {
                    position: relative;
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    width: 100%; height: 100%; color: var(--text-main);
                    user-select: none; -webkit-user-select: none;
                }
                .au-haut {
                    display: flex; align-items: center; justify-content: center; gap: 12px;
                    flex-wrap: wrap; width: 100%; flex: 0 0 auto;
                    font-size: clamp(11px, 2.6cqw, 14px); font-weight: 700;
                }
                .au-score { color: var(--text-muted); }
                .au-btn {
                    border: 1px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); border-radius: 9px; cursor: pointer;
                    font: inherit; font-weight: 600; font-size: .82rem; padding: 4px 10px;
                }
                .au-btn:hover { background: var(--bg-hover); }

                /* Le programme À GAUCHE, le quadrillage à droite — et l'un
                   au-dessus de l'autre dès que l'écran se rétrécit. Les deux
                   doivent rester visibles ENSEMBLE : lire le bloc puis chercher
                   le robot en faisant défiler, c'est perdre le fil à chaque
                   pas. */
                .au-corps {
                    flex: 1 1 auto; min-height: 0; width: 100%;
                    display: flex; gap: 12px; align-items: stretch; justify-content: center;
                }
                .au-prog {
                    flex: 0 1 240px; min-width: 150px; max-width: 300px;
                    /* Le panneau épouse le programme au lieu de s'étirer sur
                       toute la hauteur : un programme de quatre blocs dans une
                       colonne vide de 700 px a l'air d'un bogue. */
                    align-self: center; max-height: 100%;
                    overflow-y: auto; padding: 6px;
                    background: var(--bg-app); border: 1px solid var(--border);
                    border-radius: 12px;
                    display: flex; flex-direction: column; gap: 4px;
                }
                .au-plan { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; justify-content: center; }
                .au-svg { width: 100%; height: 100%; display: block; }
                @media (max-width: 620px), (orientation: portrait) {
                    .au-corps { flex-direction: column; align-items: center; }
                    .au-prog {
                        flex: 0 0 auto; max-width: 100%; width: 100%; max-height: 34%;
                        flex-direction: row; flex-wrap: wrap; align-items: flex-start;
                    }
                }

                /* LES BLOCS. Les couleurs de Scratch, parce que ce sont celles
                   que l'élève retrouvera : bleu pour bouger, jaune pour
                   contrôler, vert pour agir. */
                .au-bloc {
                    display: flex; align-items: center; gap: 5px;
                    padding: 5px 9px; border-radius: 7px; color: #fff;
                    font-weight: 700; font-size: clamp(10px, 2.3cqw, 13px);
                    line-height: 1.25; box-shadow: 0 1px 0 rgba(0,0,0,.22);
                }
                .au-bloc--mvt { background: #3b7ddd; }
                .au-bloc--action { background: #22a06b; }
                .au-bloc--ctrl { background: #d9932a; }
                .au-bloc b { font-size: 1.1em; }
                /* Le bloc allumé : c'est le compteur ordinal, la notion même
                   qu'on veut rendre visible. Il ne peut pas être discret. */
                .au-bloc--actif {
                    outline: 3px solid #0f172a; outline-offset: 1px;
                    animation: au-pulse 1.15s ease-in-out infinite;
                }
                @keyframes au-pulse {
                    50% { filter: brightness(1.28) drop-shadow(0 0 7px rgba(15,23,42,.5)); }
                }
                .au-bloc--fait { opacity: .5; }
                .au-c { display: flex; flex-direction: column; }
                /* Le C de « répéter » : la barre de gauche montre d'un coup
                   d'œil ce qui est DANS la boucle et ce qui n'y est pas. */
                .au-dedans {
                    margin-left: 9px; padding-left: 9px; border-left: 7px solid #d9932a;
                    display: flex; flex-direction: column; gap: 4px; padding-block: 4px;
                }
                .au-pied { margin-left: 9px; height: 8px; width: 46px;
                    background: #d9932a; border-radius: 0 0 7px 7px; }
                .au-tour {
                    margin-left: auto; background: rgba(0,0,0,.28); border-radius: 999px;
                    padding: 1px 7px; font-size: .82em; white-space: nowrap;
                }

                .au-cmds { display: flex; gap: 9px; justify-content: center; flex: 0 0 auto; flex-wrap: wrap; }
                .au-cmd {
                    display: flex; flex-direction: column; align-items: center; gap: 1px;
                    min-width: 72px; padding: 8px 12px; border-radius: 13px;
                    border: 2px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); font: inherit; font-weight: 800;
                    cursor: pointer; -webkit-tap-highlight-color: transparent;
                    box-shadow: 0 3px 0 rgba(15,23,42,.14);
                }
                .au-cmd:active:not(:disabled) { transform: translateY(3px); box-shadow: none; }
                .au-cmd:disabled { opacity: .3; cursor: default; }
                .au-cmd-nom { font-size: .7rem; font-weight: 700; color: var(--text-muted); }
                /* Le raccourci clavier, écrit sur le bouton : sans quoi il
                   n'existe que pour qui a pensé à l'essayer. Caché au doigt,
                   où il n'y a pas de clavier à annoncer. */
                /* LA CARTE DE PALIER. Posée sur le jeu, pas à côté : on ne
                   change pas les règles dans un coin de l'écran. */
                .au-annonce {
                    position: absolute; inset: 0; z-index: 5;
                    display: flex; align-items: center; justify-content: center;
                    background: color-mix(in srgb, var(--bg-app) 78%, transparent);
                    backdrop-filter: blur(3px);
                    animation: au-fondu .22s ease-out;
                }
                @keyframes au-fondu { from { opacity: 0; } }
                .au-annonce-carte {
                    max-width: min(420px, 88%); text-align: center;
                    background: var(--bg-panel); border: 1px solid var(--border);
                    border-radius: 16px; padding: 20px 22px; box-shadow: var(--shadow-lg);
                }
                .au-annonce-rang {
                    font-size: .74rem; font-weight: 800; letter-spacing: .04em;
                    text-transform: uppercase; color: var(--primary);
                }
                .au-annonce-carte h3 { margin: 4px 0 8px; font-size: 1.25rem; }
                .au-annonce-carte p { margin: 0 0 16px; line-height: 1.4; color: var(--text-muted); }
                .au-annonce-ok {
                    border: none; border-radius: 10px; padding: 9px 22px; cursor: pointer;
                    background: var(--primary); color: #fff; font: inherit; font-weight: 800;
                }
                .au-cmd-touche {
                    font: inherit; font-size: .64rem; font-weight: 800; line-height: 1.5;
                    min-width: 1.5em; text-align: center;
                    padding: 0 5px; border-radius: 5px; margin-top: 2px;
                    background: var(--bg-hover); color: var(--text-muted);
                    border: 1px solid var(--border);
                }
                @media (pointer: coarse) { .au-cmd-touche { display: none; } }
                .au-cmd--frappe { transform: translateY(3px); box-shadow: none; }

                .au-robot { transition: transform .38s cubic-bezier(.4,.1,.2,1); }
                .au-robot--stop { transition: none; }
                /* Tout ce qui est POSÉ sur le quadrillage laisse passer le
                   doigt : sans ça, le point de direction, la pastille ou le
                   robot lui-même avalent le clic, et la case qu'ils recouvrent
                   devient injouable. C'est justement la case qu'on vise le
                   plus souvent. */
                [data-cibles], [data-marques], [data-trace], .au-robot { pointer-events: none; }
                .au-case { cursor: pointer; }
                .au-case:hover rect { fill: rgba(59,125,221,.14); }

                .au-note {
                    min-height: 2.5em; text-align: center; width: 100%; max-width: 640px;
                    font-size: clamp(11px, 2.7cqw, 14px); line-height: 1.35;
                    color: var(--text-muted); flex: 0 0 auto;
                }
                .au-note b { color: var(--text-main); }
                .au-bulle { display: inline-block; padding: 5px 13px; border-radius: 999px; font-weight: 700; }
                .au-bulle--ok { background: color-mix(in srgb, var(--success) 20%, transparent); color: var(--success); }
                .au-bulle--ko { background: color-mix(in srgb, var(--danger) 18%, transparent); color: var(--danger); }
            </style>
            <div class="au-wrap">
                <div class="au-haut">
                    <span data-but></span>
                    <span class="au-score" data-score></span>
                    <button type="button" class="au-btn" data-neuf>↺ Autre programme</button>
                </div>
                <div class="au-corps">
                    <div class="au-prog" data-prog></div>
                    <div class="au-plan" data-plan></div>
                </div>
                <div class="au-cmds" data-cmds>
                    ${this.boutonCmd('gauche', 'tourner à gauche',
        'M3 3v6h6M3.5 15.5a9 9 0 1 0 2.1-9.4L3 8.5', '←')}
                    ${this.boutonCmd('pose', 'poser', '', 'espace')}
                    ${this.boutonCmd('droite', 'tourner à droite',
        'M21 3v6h-6M20.5 15.5a9 9 0 1 1-2.1-9.4L21 8.5', '→')}
                </div>
                <p class="au-note" data-note></p>
            </div>`;

        this.progEl = this.container.querySelector('[data-prog]');
        this.planEl = this.container.querySelector('[data-plan]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.butEl = this.container.querySelector('[data-but]');
        this.scoreEl = this.container.querySelector('[data-score]');
        this.cmdsEl = this.container.querySelector('[data-cmds]');
        this.container.querySelector('[data-neuf]').addEventListener('click', () => this.nouveauProgramme());
        this.container.querySelectorAll('[data-geste]').forEach(b => {
            b.addEventListener('click', () => this.jouer({ type: b.dataset.geste }));
        });

        // Les flèches du clavier tournent le robot, l'espace pose une marque.
        // Avancer, non : il faut DÉSIGNER la case d'arrivée, sinon on n'a rien
        // compté — et compter les cases est tout l'exercice.
        this.surTouche = (e) => {
            if (this.isDemo) return;
            if (e.key === 'ArrowUp') { e.preventDefault(); this.avancerDUneCase(); return; }
            const g = { ArrowLeft: 'gauche', ArrowRight: 'droite', ' ': 'pose' }[e.key];
            if (!g) return;
            e.preventDefault();
            this.pasComptes = 0;                 // on change d'avis : le compte repart
            this.jouer({ type: g });
            const b = this.container.querySelector(`[data-geste="${g}"]`);
            if (b) { b.classList.add('au-cmd--frappe'); setTimeout(() => b.classList.remove('au-cmd--frappe'), 170); }
        };
        document.addEventListener('keydown', this.surTouche);

        this.nouveauProgramme();
    }

    /**
     * UNE FLÈCHE DROITE NE VEUT PAS DIRE « TOURNE ».
     *
     * Les boutons portaient ← et → : le geste qu'ils annoncent est « va à
     * gauche », alors qu'ils font pivoter le robot SUR PLACE. C'est exactement
     * la confusion que l'exercice cherche à défaire — se déplacer n'est pas
     * s'orienter. Les flèches sont donc circulaires, et la touche du clavier
     * qui fait la même chose est écrite dessous : elle existait déjà, mais
     * rien ne la disait, donc personne ne s'en servait.
     */
    boutonCmd(geste, nom, d, touche = '') {
        const dessin = d
            ? `<path d="${d}" />`
            : '<circle cx="12" cy="12" r="6" fill="currentColor" stroke="none" />';
        return `<button type="button" class="au-cmd" data-geste="${geste}" aria-label="${nom}">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                ${dessin}
            </svg>
            <span class="au-cmd-nom">${nom}</span>
            ${touche ? `<kbd class="au-cmd-touche">${touche}</kbd>` : ''}
        </button>`;
    }

    startGameLoop() { /* Au rythme de l'élève : rien à animer en continu. */ }

    // --- Un programme ----------------------------------------------------------

    /**
     * L'ANNONCE DU PALIER — le changement se DIT avant de se produire.
     *
     * Éteindre le surligneur sans prévenir, c'est retirer une aide en silence :
     * l'élève croit à une panne, cherche ce qui ne s'allume plus, et se trompe
     * pour une raison qui n'a rien à voir avec le programme. La carte s'affiche
     * donc entre deux programmes, dit ce qui change et pourquoi, et attend
     * qu'on l'ait lue.
     */
    annoncerPalier(index, apres) {
        const p = PALIERS[index];
        if (!p) return apres();
        const carte = document.createElement('div');
        carte.className = 'au-annonce';
        carte.innerHTML = `
            <div class="au-annonce-carte">
                <div class="au-annonce-rang">Étape ${index + 1} sur ${PALIERS.length}</div>
                <h3>${p.titre}</h3>
                <p>${p.annonce}</p>
                <button type="button" class="au-annonce-ok">C'est parti !</button>
            </div>`;
        this.container.querySelector('.au-wrap').appendChild(carte);
        const fermer = () => { carte.remove(); apres(); };
        carte.querySelector('.au-annonce-ok').addEventListener('click', fermer);
        // Une carte oubliée à l'écran bloquerait le jeu : elle se ferme aussi
        // toute seule, assez tard pour avoir été lue.
        this.timerAnnonce = setTimeout(() => { if (carte.isConnected) fermer(); }, 9000);
    }

    nouveauProgramme() {
        // Le programme est tiré et DESSINÉ d'abord, la carte se pose dessus :
        // annoncer sur un écran vide donnait l'impression d'un jeu qui n'a pas
        // fini de charger, et l'élève n'a rien à lire derrière la carte s'il
        // n'y a rien.
        this.tirerEtAfficher();
        if (this.mode === 'progressif' && !this.isDemo) {
            const { index } = palierPour(this.reussis);
            if (index !== this.palierIndex) {
                this.palierIndex = index;
                this.annoncerPalier(index, () => { });
            }
        }
    }

    tirerEtAfficher() {
        const t = tirerProgramme(this.niveauCourant, this.rng);
        this.grille = t.grille;
        this.depart = t.depart;
        this.programme = t.programme;
        this.deroule = t.deroule;
        this.k = 0;
        this.etat = { ...t.depart, marques: [] };
        this.angleRobot = undefined;        // nouveau plan, nouvelle orientation
        this.pasComptes = 0;
        this.fautes = 0;

        this.dessinerPlan();
        this.dessinerProgramme();
        this.majBandeau();
        this.majCommandes();
        this.majSurligneur();
        this.note(this.reglage.prediction
            ? `Lis tout le programme dans ta tête, puis touche la case où le robot <b>arrive</b>.`
            : `Tu es l'ordinateur. Le robot regarde vers <b>${nomCap(this.etat.cap)}</b>. `
              + `Pour « avancer », touche la case d'arrivée — ou appuie sur <b>↑</b>, une case par appui.`);
    }

    majBandeau() {
        this.butEl.innerHTML = this.reglage.prediction
            ? '🤖 Où arrive le robot ?'
            : `🤖 Exécute le programme — pas ${Math.min(this.k + 1, this.deroule.pas.length)} sur ${this.deroule.pas.length}`;
        this.scoreEl.textContent = `${this.reussis} programme${this.reussis > 1 ? 's' : ''} réussi${this.reussis > 1 ? 's' : ''}`
            + (this.erreurs ? ` · ${this.erreurs} erreur${this.erreurs > 1 ? 's' : ''}` : '');
    }

    // --- Le programme à l'écran -------------------------------------------------

    dessinerProgramme() {
        this.progEl.innerHTML = this.programme.map((b, i) => this.blocHtml(b, [i])).join('');
    }

    blocHtml(b, chemin) {
        const id = chemin.join('-');
        if (b.type === 'repete') {
            return `<div class="au-c">
                <div class="au-bloc au-bloc--ctrl" data-bloc="${id}">
                    🔁 répéter <b>${b.n}</b> fois
                    <span class="au-tour" data-tour="${id}" hidden></span>
                </div>
                <div class="au-dedans">${b.corps.map((c, i) => this.blocHtml(c, [...chemin, i])).join('')}</div>
                <div class="au-pied"></div>
            </div>`;
        }
        const cat = b.type === 'pose' ? 'action' : 'mvt';
        const ico = { avance: '⬆', droite: '↻', gauche: '↺', pose: '⬤' }[b.type] || '';
        return `<div class="au-bloc au-bloc--${cat}" data-bloc="${id}">${ico} ${direBloc(b)}</div>`;
    }

    /**
     * ALLUME LE BLOC EN COURS — et affiche le tour de boucle.
     *
     * C'est la moitié de l'exercice. Sans ce repère, « répéter 3 fois » reste
     * une formule ; avec lui, on VOIT l'allumage remonter d'un cran chaque fois
     * que le corps se termine, et le compteur passer de 1 à 2 puis à 3.
     */
    majSurligneur() {
        this.progEl.querySelectorAll('[data-bloc]').forEach(el => {
            el.classList.remove('au-bloc--actif', 'au-bloc--fait');
        });
        this.progEl.querySelectorAll('[data-tour]').forEach(el => { el.hidden = true; });
        const p = this.deroule.pas[this.k];
        if (!p || !this.reglage.surligneur) return;

        const el = this.progEl.querySelector(`[data-bloc="${p.chemin.join('-')}"]`);
        el?.classList.add('au-bloc--actif');
        // Le compteur de tours, sur l'en-tête de la boucle qui l'entoure.
        p.tours.forEach((t, prof) => {
            const cheminBoucle = p.chemin.slice(0, prof + 1).join('-');
            const badge = this.progEl.querySelector(`[data-tour="${cheminBoucle}"]`);
            if (badge) {
                badge.textContent = `tour ${t.tour} / ${t.total}`;
                badge.hidden = false;
            }
        });
    }

    // --- Le quadrillage ---------------------------------------------------------

    dessinerPlan() {
        const g = this.grille;
        const pas = 100, marge = 12;
        const W = g.cols * pas + marge * 2;
        const H = g.rows * pas + marge * 2;
        const cx = (x) => marge + x * pas + pas / 2;
        const cy = (y) => marge + y * pas + pas / 2;

        let cases = '';
        for (let y = 0; y < g.rows; y++) {
            for (let x = 0; x < g.cols; x++) {
                const clair = (x + y) % 2 === 0;
                cases += `<g class="au-case" data-x="${x}" data-y="${y}" role="button"
                             aria-label="case ${x + 1}, ${y + 1}">
                    <rect x="${marge + x * pas}" y="${marge + y * pas}" width="${pas}" height="${pas}"
                          fill="${clair ? '#eef2f7' : '#e2e8f0'}" stroke="#cbd5e1" stroke-width="1.5" />
                </g>`;
            }
        }
        // La case de départ, marquée : elle sert de repère quand la boucle
        // ramène le robot sur ses pas.
        const d = this.depart;
        const depart = `<rect x="${marge + d.x * pas + 12}" y="${marge + d.y * pas + 12}"
            width="${pas - 24}" height="${pas - 24}" rx="10" fill="none"
            stroke="#94a3b8" stroke-width="3" stroke-dasharray="7 7" />`;

        this.planEl.innerHTML = `
            <svg class="au-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"
                 role="img" aria-label="Quadrillage du robot">
                <rect width="${W}" height="${H}" rx="14" fill="#f8fafc" />
                ${cases}
                ${depart}
                <g data-trace fill="none" stroke="#3b7ddd" stroke-width="7" opacity=".38"
                   stroke-linecap="round" stroke-linejoin="round"></g>
                <g data-cibles></g>
                <g data-marques></g>
                <g class="au-robot au-robot--stop" data-robot>${this.dessinRobot()}</g>
            </svg>`;

        this.robotEl = this.planEl.querySelector('[data-robot]');
        this.traceEl = this.planEl.querySelector('[data-trace]');
        this.marquesEl = this.planEl.querySelector('[data-marques]');
        this.ciblesEl = this.planEl.querySelector('[data-cibles]');
        this.pos = { cx, cy, pas };
        // L'écouteur est posé UNE fois sur le conteneur, pas à chaque
        // programme : `dessinerPlan` est rappelé à chaque tirage, et un
        // `addEventListener` ici empilerait les gestionnaires — au dixième
        // programme, un clic vaudrait dix coups.
        if (!this.planBranche) {
            this.planBranche = true;
            this.planEl.addEventListener('pointerdown', (e) => {
                const c = e.target.closest('[data-x]');
                if (!c || this.isDemo) return;
                e.preventDefault();
                this.jouer({ type: 'case', x: Number(c.dataset.x), y: Number(c.dataset.y) });
            });
        }
        this.placerRobot(false);
    }

    /** Le robot, vu de dessus, nez vers le HAUT (cap N = 0°). */
    dessinRobot() {
        return `
            <g>
                <ellipse cx="0" cy="4" rx="27" ry="27" fill="rgba(15,23,42,.16)" />
                <rect x="-26" y="-26" width="52" height="52" rx="14" fill="#64748b" />
                <rect x="-26" y="-26" width="52" height="52" rx="14" fill="none" stroke="#334155" stroke-width="3" />
                <rect x="-17" y="-19" width="34" height="22" rx="7" fill="#0f172a" />
                <circle cx="-8" cy="-8" r="4.4" fill="#5eead4" />
                <circle cx="8" cy="-8" r="4.4" fill="#5eead4" />
                <rect x="-11" y="9" width="22" height="8" rx="4" fill="#334155" />
                <path d="M0 -38 L11 -26 L-11 -26 Z" fill="#f59e0b" stroke="#b45309" stroke-width="2.5"
                      stroke-linejoin="round" />
                <rect x="-32" y="-9" width="6" height="18" rx="3" fill="#334155" />
                <rect x="26" y="-9" width="6" height="18" rx="3" fill="#334155" />
            </g>`;
    }

    /**
     * AVANCER À LA FLÈCHE DU HAUT, une case par appui.
     *
     * Désigner la case d'arrivée du doigt reste la manière naturelle sur
     * tablette, mais au clavier c'est une acrobatie : on a les deux mains sur
     * les flèches et il faut lâcher pour viser une case. Une flèche du haut
     * qui avance d'UNE case répond à « avancer de 2 » en deux appuis — donc en
     * comptant, ce qui est exactement ce que l'exercice demande. Rien n'est
     * validé avant le dernier appui : c'est la case d'arrivée, et elle seule,
     * qui est soumise au juge.
     */
    avancerDUneCase() {
        if (!this.deroule || this.animation) return;
        const pas = this.deroule.pas[this.k];
        const bloc = pas && pas.bloc;
        const v = devant(this.etat.x, this.etat.y, this.etat.cap);
        // Hors du plan : on le dit plutôt que de compter dans le vide.
        if (v.x < 0 || v.y < 0 || v.x >= this.grille.cols || v.y >= this.grille.rows) {
            this.note('Le robot sortirait du plan : ce n\'est pas par là.', 'ko');
            return;
        }
        // Le bloc allumé ne demande pas d'avancer : on soumet quand même la
        // case, pour que le juge donne SA phrase — « le bloc dit tourner ».
        if (!bloc || bloc.type !== 'avance') {
            this.pasComptes = 0;
            this.jouer({ type: 'case', x: v.x, y: v.y });
            return;
        }

        const n = (this.pasComptes || 0) + 1;
        if (n >= bloc.n) {
            this.pasComptes = 0;
            this.jouer({ type: 'case', x: pas.apres.x, y: pas.apres.y });
            return;
        }
        this.pasComptes = n;
        this.note(`${n} case${n > 1 ? 's' : ''}… continue de compter.`);
        this.marquerCompte(n);
    }

    /** Le repère du comptage en cours : jusqu'où on a avancé, sans valider. */
    marquerCompte(n) {
        if (!this.ciblesEl) return;
        const { cx, cy } = this.pos;
        let p = { x: this.etat.x, y: this.etat.y };
        const pts = [];
        for (let i = 0; i < n; i++) {
            p = devant(p.x, p.y, this.etat.cap);
            pts.push(`<circle cx="${cx(p.x)}" cy="${cy(p.y)}" r="9" fill="none"
                              stroke="var(--primary)" stroke-width="3" opacity=".85" />
                      <text x="${cx(p.x)}" y="${cy(p.y) + 5}" text-anchor="middle"
                            font-size="14" font-weight="800" fill="var(--primary)">${i + 1}</text>`);
        }
        this.ciblesEl.innerHTML = pts.join('');
    }

    /**
     * L'ANGLE EST CUMULÉ, jamais recalculé modulo 360.
     *
     * En repartant à chaque fois de l'angle absolu du cap, « tourner à gauche »
     * depuis le nord donnait 0° → 270° : le robot faisait trois quarts de tour
     * PAR LA DROITE pour un quart de tour à gauche. Sur un exercice dont tout
     * l'objet est de distinguer sa gauche de celle de l'écran, c'est le pire
     * mensonge possible — le robot montrait le contraire de ce qu'on lui
     * demandait. On suit donc le chemin le plus court, en mémorisant l'angle
     * réellement parcouru.
     */
    angleVers(cap) {
        const vise = ANGLES[cap];
        if (this.angleRobot === undefined) { this.angleRobot = vise; return vise; }
        // L'écart ramené dans ]-180, 180] : le quart de tour, dans le bon sens.
        let d = (vise - (this.angleRobot % 360) + 540) % 360 - 180;
        if (d === -180) d = 180;
        this.angleRobot += d;
        return this.angleRobot;
    }

    placerRobot(anime = true) {
        if (!this.robotEl) return;
        const { cx, cy } = this.pos;
        this.robotEl.classList.toggle('au-robot--stop', !anime);
        this.robotEl.setAttribute('transform',
            `translate(${cx(this.etat.x)},${cy(this.etat.y)}) rotate(${this.angleVers(this.etat.cap)})`);
    }

    /**
     * LES CASES DROIT DEVANT, en mode guidé.
     *
     * On montre la DIRECTION, jamais la distance : tous les points sont posés,
     * et c'est à l'élève de compter jusqu'à celui du bloc. Un seul point, sur
     * la bonne case, répondrait à sa place.
     */
    majCibles() {
        if (!this.ciblesEl) return;
        this.ciblesEl.innerHTML = '';
        const p = this.deroule.pas[this.k];
        if (!this.reglage.surligneur || !p || p.bloc.type !== 'avance' || this.isDemo) return;
        const { cx, cy } = this.pos;
        let n = { x: this.etat.x, y: this.etat.y };
        let html = '';
        for (let i = 0; i < 8; i++) {
            n = devant(n.x, n.y, this.etat.cap);
            if (n.x < 0 || n.y < 0 || n.x >= this.grille.cols || n.y >= this.grille.rows) break;
            html += `<circle cx="${cx(n.x)}" cy="${cy(n.y)}" r="12" fill="#3b7ddd" opacity=".3" />`;
        }
        this.ciblesEl.innerHTML = html;
    }

    majMarques() {
        if (!this.marquesEl) return;
        const { cx, cy } = this.pos;
        this.marquesEl.innerHTML = this.etat.marques.map(m => `
            <circle cx="${cx(m.x)}" cy="${cy(m.y)}" r="17" fill="#22a06b" opacity=".85" />
            <circle cx="${cx(m.x)}" cy="${cy(m.y)}" r="17" fill="none" stroke="#0f766e" stroke-width="3" />`).join('');
    }

    /** Le chemin parcouru : c'est lui qui rend la boucle VISIBLE, en dessin. */
    tracerVers(a, b) {
        if (!this.traceEl) return;
        const { cx, cy } = this.pos;
        const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l.setAttribute('x1', cx(a.x)); l.setAttribute('y1', cy(a.y));
        l.setAttribute('x2', cx(b.x)); l.setAttribute('y2', cy(b.y));
        this.traceEl.appendChild(l);
    }

    majCommandes() {
        const p = this.deroule.pas[this.k];
        const fini = !p || this.reglage.prediction;
        this.cmdsEl.querySelectorAll('[data-geste]').forEach(b => {
            // On laisse les boutons ACTIFS même quand ils ne conviennent pas :
            // les griser dirait quel bloc est en cours, et c'est justement ce
            // qu'on demande de lire.
            b.disabled = fini;
        });
        this.cmdsEl.hidden = this.reglage.prediction;
    }

    // --- Le jeu -----------------------------------------------------------------

    jouer(geste) {
        if (this.isDemo || this.animation || !this.deroule) return;

        if (this.reglage.prediction) {
            if (geste.type !== 'case') return;
            return this.jugerPrediction(geste);
        }
        if (this.k >= this.deroule.pas.length) return;

        const res = jugerGeste(this.deroule, this.k, geste);
        if (res.ok) return this.avancer();

        this.erreurs++;
        this.fautes++;
        this.majBandeau();
        this.note(res.message, 'ko');
        this.secouer();
        this.onWrongAnswer(null, {
            concept: SKILL,
            questionText: `${direBloc(this.deroule.pas[this.k].bloc)} (robot vers ${nomCap(this.etat.cap)})`,
            input: geste.type === 'case' ? `case ${geste.x + 1},${geste.y + 1}` : geste.type,
            expected: direBloc(this.deroule.pas[this.k].bloc),
            customMessage: res.message,
            silencieux: true
        });
    }

    avancer() {
        const p = this.deroule.pas[this.k];
        const avant = { x: this.etat.x, y: this.etat.y };
        this.animation = true;
        this.etat = { x: p.apres.x, y: p.apres.y, cap: p.apres.cap, marques: p.apres.marques.map(m => ({ ...m })) };
        if (avant.x !== this.etat.x || avant.y !== this.etat.y) this.tracerVers(avant, this.etat);
        this.placerRobot(true);
        this.majMarques();
        this.k++;
        this.majBandeau();
        this.majSurligneur();
        this.majCibles();

        this.timerId = setTimeout(() => {
            this.animation = false;
            if (!this.isRunning) return;
            if (this.k >= this.deroule.pas.length) return this.reussir();
            this.majCommandes();
            const suivant = this.deroule.pas[this.k];
            const tour = suivant.tours[suivant.tours.length - 1];
            this.note(this.reglage.surligneur
                ? `Bloc suivant : <b>${direBloc(suivant.bloc)}</b>${tour ? ` — tour <b>${tour.tour}</b> sur ${tour.total}` : ''}.`
                : `Fait. À toi de trouver où on en est dans le programme.`);
        }, 400);
    }

    jugerPrediction(geste) {
        const r = jugerArrivee(this.deroule, geste);
        if (!r.ok) {
            this.erreurs++;
            this.fautes++;
            this.majBandeau();
            this.note(r.message, 'ko');
            this.onWrongAnswer(null, {
                concept: SKILL,
                questionText: `Où arrive le robot après ce programme (${this.deroule.pas.length} pas) ?`,
                input: `case ${geste.x + 1},${geste.y + 1}`,
                expected: `case ${this.deroule.fin.x + 1},${this.deroule.fin.y + 1}`,
                customMessage: r.message, silencieux: true
            });
            return;
        }
        // On rejoue le programme sous ses yeux : la bonne réponse mérite d'être
        // VUE se dérouler, sinon on ne sait pas pourquoi on avait raison.
        this.rejouer(() => this.reussir());
    }

    rejouer(apres, i = 0) {
        if (!this.isRunning) return;
        const p = this.deroule.pas[i];
        if (!p) return apres?.();
        const avant = { x: this.etat.x, y: this.etat.y };
        this.etat = { x: p.apres.x, y: p.apres.y, cap: p.apres.cap, marques: p.apres.marques.map(m => ({ ...m })) };
        if (avant.x !== this.etat.x || avant.y !== this.etat.y) this.tracerVers(avant, this.etat);
        this.placerRobot(i > 0);
        this.majMarques();
        this.k = i + 1;
        this.majSurligneur();
        this.timerId = setTimeout(() => this.rejouer(apres, i + 1), 420);
    }

    reussir() {
        this.reussis++;
        this.k = this.deroule.pas.length;
        this.majBandeau();
        this.majSurligneur();
        this.majCibles();
        this.majCommandes();
        const parfait = this.fautes === 0;
        const boucle = this.programme.some(b => b.type === 'repete');
        this.note(parfait
            ? `🏁 Programme exécuté sans une seule erreur.${boucle ? ' La boucle ne t\'a pas piégé.' : ''}`
            : `🏁 Programme terminé, avec ${this.fautes} erreur${this.fautes > 1 ? 's' : ''}. Le prochain sera plus net.`,
            'ok');
        this.onCorrectAnswer(null, SKILL, {
            points: parfait ? 30 : 15,
            questionText: `Exécuter un programme de ${this.deroule.pas.length} pas${boucle ? ' avec boucle' : ''}`,
            given: 'exécuté', expected: 'exécuté'
        });
        this.timerId = setTimeout(() => { if (this.isRunning) this.nouveauProgramme(); }, 2600);
    }

    secouer() {
        if (!this.robotEl) return;
        this.robotEl.classList.add('au-robot--stop');
        const { cx, cy } = this.pos;
        const base = `translate(${cx(this.etat.x)},${cy(this.etat.y)}) rotate(${this.angleRobot ?? ANGLES[this.etat.cap]})`;
        let i = 0;
        const tic = () => {
            if (!this.robotEl || !this.isRunning) return;
            const d = [5, -5, 3, -2, 0][i];
            this.robotEl.setAttribute('transform', `${base} translate(${d},0)`);
            if (++i < 5) this.timerSecousse = setTimeout(tic, 55);
        };
        tic();
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = ton ? `<span class="au-bulle au-bulle--${ton}">${html}</span>` : html;
    }

    // --- Le robot ---------------------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur?.destroy(); gate?.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!await cur.pause(600) || !this.isRunning) return fin();
        cur.say('Le programme est écrit. C\'est toi l\'ordinateur.', this.progEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Le bloc allumé, c\'est où on en est.', this.progEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        let bouclePresentee = false;
        while (this.isRunning && this.k < this.deroule.pas.length && this.k < 9) {
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const p = this.deroule.pas[this.k];
            const tour = p.tours[p.tours.length - 1];

            // Le moment qui vaut le détour : la boucle qui repart en arrière.
            if (tour && tour.tour === 2 && !bouclePresentee) {
                bouclePresentee = true;
                cur.say('La boucle remonte ! Tour 2 sur ' + tour.total + '.', this.progEl);
                if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
            } else if (p.bloc.type === 'avance') {
                cur.say(`Avancer de ${p.bloc.n}. Je compte devant le robot.`, this.planEl);
            } else if (p.bloc.type === 'pose') {
                cur.say('Poser : le robot ne bouge pas.', this.planEl);
            } else {
                cur.say(`Sa ${p.bloc.type} à lui, pas celle de l'écran.`, this.planEl);
            }
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();

            // Le curseur montre VRAIMENT le geste : la case pour avancer, le
            // bouton pour tourner.
            if (p.bloc.type === 'avance') {
                const c = this.planEl.querySelector(`[data-x="${p.apres.x}"][data-y="${p.apres.y}"]`);
                if (c && !await cur.tap(c)) return fin();
            } else {
                const b = this.cmdsEl.querySelector(`[data-geste="${p.bloc.type}"]`);
                if (b && !await cur.tap(b)) return fin();
            }
            this.avancerDemo();
            if (!await cur.pause(DEMO_SPEED.press) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('À toi : lis le bloc, puis fais-le.', this.progEl);
        if (!await cur.pause(DEMO_SPEED.between)) return fin();
        fin();
    }

    /** Le pas du robot pendant la démonstration : sans minuterie ni notation. */
    avancerDemo() {
        const p = this.deroule.pas[this.k];
        if (!p) return;
        const avant = { x: this.etat.x, y: this.etat.y };
        this.etat = { x: p.apres.x, y: p.apres.y, cap: p.apres.cap, marques: p.apres.marques.map(m => ({ ...m })) };
        if (avant.x !== this.etat.x || avant.y !== this.etat.y) this.tracerVers(avant, this.etat);
        this.placerRobot(true);
        this.majMarques();
        this.k++;
        this.majBandeau();
        this.majSurligneur();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        if (this.timerAnnonce) clearTimeout(this.timerAnnonce);
        if (this.surTouche) document.removeEventListener('keydown', this.surTouche);
        if (this.timerSecousse) clearTimeout(this.timerSecousse);
        super.destroy();
    }
}

export function engineAutomate(container, isDemo, params) {
    const jeu = new Automate(container, isDemo, params);
    jeu.start();
    return jeu;
}
