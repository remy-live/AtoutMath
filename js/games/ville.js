// LE PLAN DE VILLE — conduire en suivant un itinéraire donné en mots.
//
// Un plan qui NE BOUGE PAS, une voiture qui tourne, et une feuille de route :
// « prends la deuxième à gauche, puis la première à droite ». L'élève conduit
// avec trois commandes — à gauche, tout droit, à droite — au doigt ou aux
// flèches du clavier.
//
// LES TROIS COMMANDES SONT RELATIVES À LA VOITURE, et c'est tout l'exercice.
// Si la flèche gauche envoyait la voiture vers la gauche de l'écran, il n'y
// aurait rien à apprendre : il suffirait de regarder. Ici, quand la voiture
// descend, sa gauche est à DROITE du plan — et c'est précisément ce que
// l'enfant doit finir par voir sans y penser.
//
// La règle vit dans core/ville.js, sans DOM, avec ses tests : plan d'un seul
// tenant, itinéraires sans demi-tour ni repassage, et surtout une feuille de
// route qui, suivie à la lettre, mène vraiment à l'arrivée.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    creerVille, tirerItineraire, decrireItineraire, jugerCoup,
    sortiesRelatives, tourner, sensEntre, CAPS, devant, nomCap
} from '../core/ville.js';

const ANGLES = { N: 0, E: 90, S: 180, O: 270 };

const TAILLES = {
    petit: { cols: 4, rows: 4, virages: 2, label: '4 × 4 — pour commencer' },
    moyen: { cols: 5, rows: 5, virages: 3, label: '5 × 5' },
    grand: { cols: 6, rows: 5, virages: 4, label: '6 × 5 — quatre virages' }
};

// Les destinations. Chacune a son dessin : un plan de ville se lit aux formes
// et aux couleurs, pas à une étiquette qu'il faudrait déchiffrer.
const LIEUX = [
    { id: 'boulangerie', nom: 'la boulangerie', teinte: '#f59e0b', dessin: 'pain' },
    { id: 'ecole', nom: 'l\'école', teinte: '#3b82f6', dessin: 'ecole' },
    { id: 'pharmacie', nom: 'la pharmacie', teinte: '#10b981', dessin: 'croix' },
    { id: 'gare', nom: 'la gare', teinte: '#6366f1', dessin: 'train' },
    { id: 'stade', nom: 'le stade', teinte: '#22c55e', dessin: 'ballon' },
    { id: 'piscine', nom: 'la piscine', teinte: '#06b6d4', dessin: 'vague' },
    { id: 'mairie', nom: 'la mairie', teinte: '#8b5cf6', dessin: 'mairie' },
    { id: 'parc', nom: 'le parc', teinte: '#16a34a', dessin: 'arbre' }
];

const PICTOS = {
    pain: '<path d="M-7 2c0-5 3-8 7-8s7 3 7 8c0 3-3 5-7 5s-7-2-7-5z" /><path d="M-3 -5v9M1 -5v9" stroke-width="1.4" />',
    ecole: '<path d="M-8 3h16M-6 3v-6l6-4 6 4v6" /><path d="M-2 3v-4h4v4" />',
    croix: '<path d="M-2.5 -7h5v4.5H8v5H2.5V7h-5V2.5H-8v-5h5.5z" />',
    train: '<rect x="-7" y="-7" width="14" height="11" rx="2" /><path d="M-7 -2h14M-4 7l-2 3M4 7l2 3" /><rect x="-4" y="4" width="8" height="3" rx="1" />',
    ballon: '<circle cx="0" cy="0" r="7" /><path d="M0 -7l4 3-1.5 5h-5L-4 -4z" />',
    vague: '<path d="M-8 2q4-4 8 0t8 0" /><path d="M-8 6q4-4 8 0t8 0" /><circle cx="3" cy="-5" r="2.5" />',
    mairie: '<path d="M-8 4h16M-7 4v-7M-3 4v-7M3 4v-7M7 4v-7M-9 -7l9-4 9 4z" />',
    arbre: '<path d="M0 7v-5" stroke-width="2.2" /><circle cx="0" cy="-3" r="6" />'
};

class Ville extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'ville');
        this.taille = TAILLES[this.params.taille] || TAILLES.moyen;
        this.capNord = this.params.capNord === true || this.params.capNord === 'true';
        this.rng = makeRng(this.params.seed);
        this.trajets = 0;
        this.reussis = 0;
        this.erreurs = 0;
    }

    // --- Mise en place ---------------------------------------------------------

    render() {
        this.container.innerHTML = `
            <style>
                .vi-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    width: 100%; height: 100%; color: var(--text-main);
                    user-select: none; -webkit-user-select: none;
                }
                /* La FEUILLE DE ROUTE : toutes les consignes d'un coup, celle en
                   cours mise en avant. Les donner une par une masquerait ce qui
                   fait l'exercice — anticiper, et se rendre compte qu'on est
                   allé trop loin. */
                .vi-route {
                    display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
                    justify-content: center; width: 100%; max-width: 680px;
                    font-size: clamp(11px, 2.6cqw, 14px); flex: 0 0 auto;
                }
                .vi-etape {
                    display: flex; align-items: center; gap: 5px;
                    padding: 4px 10px; border-radius: 999px; font-weight: 700;
                    background: var(--bg-hover); color: var(--text-muted);
                    border: 2px solid transparent; transition: .18s;
                }
                .vi-etape--faite { opacity: .45; text-decoration: line-through; }
                .vi-etape--active {
                    background: color-mix(in srgb, var(--primary) 16%, transparent);
                    color: var(--text-main); border-color: var(--primary);
                    transform: scale(1.04);
                }
                .vi-fleche { font-size: 1.05em; line-height: 1; }

                .vi-plan {
                    flex: 1 1 auto; min-height: 0; width: 100%;
                    display: flex; align-items: center; justify-content: center;
                }
                /* Le plan REMPLIT la place disponible. Dimensionné en unités
                   SVG fixes, il restait un timbre au milieu du vide sur un
                   grand écran, et les rues devenaient illisibles sur un
                   petit. */
                .vi-svg { width: 100%; height: 100%; display: block; }

                /* La voiture pivote et se déplace d'une même transition : c'est
                   ce glissement qui fait comprendre qu'elle a tourné, et de
                   quel côté. Sans lui, elle se téléporte et le virage ne se
                   voit pas — donc ne s'apprend pas. */
                .vi-voiture { transition: transform .42s cubic-bezier(.4,.1,.2,1); }
                .vi-voiture--stop { transition: none; }
                .vi-cible { cursor: pointer; }
                .vi-cible:hover circle:last-child { opacity: .5; }

                .vi-cmds {
                    display: flex; gap: 10px; justify-content: center;
                    flex: 0 0 auto; width: 100%;
                }
                .vi-cmd {
                    display: flex; flex-direction: column; align-items: center; gap: 2px;
                    min-width: 74px; padding: 9px 14px; border-radius: 14px;
                    border: 2px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); font: inherit; font-weight: 800;
                    cursor: pointer; -webkit-tap-highlight-color: transparent;
                    box-shadow: 0 3px 0 rgba(15,23,42,.14);
                }
                .vi-cmd:active:not(:disabled) { transform: translateY(3px); box-shadow: none; }
                .vi-cmd:disabled { opacity: .32; cursor: default; }
                .vi-cmd svg { display: block; }
                .vi-cmd-nom { font-size: .72rem; font-weight: 700; color: var(--text-muted); }
                .vi-cmd--go { border-color: var(--primary); color: var(--primary); }

                .vi-note {
                    min-height: 2.6em; text-align: center; width: 100%; max-width: 640px;
                    font-size: clamp(11px, 2.7cqw, 14px); line-height: 1.35;
                    color: var(--text-muted); flex: 0 0 auto;
                }
                .vi-note b { color: var(--text-main); }
                .vi-bulle { display: inline-block; padding: 5px 13px; border-radius: 999px; font-weight: 700; }
                .vi-bulle--ok { background: color-mix(in srgb, var(--success) 20%, transparent); color: var(--success); }
                .vi-bulle--ko { background: color-mix(in srgb, var(--danger) 18%, transparent); color: var(--danger); }

                .vi-haut {
                    display: flex; align-items: center; justify-content: center; gap: 12px;
                    flex-wrap: wrap; width: 100%; flex: 0 0 auto;
                    font-size: clamp(11px, 2.6cqw, 14px); font-weight: 700;
                }
                .vi-score { color: var(--text-muted); }
                .vi-btn {
                    border: 1px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); border-radius: 9px; cursor: pointer;
                    font: inherit; font-weight: 600; font-size: .82rem; padding: 4px 10px;
                }
                .vi-btn:hover { background: var(--bg-hover); }
            </style>
            <div class="vi-wrap">
                <div class="vi-haut">
                    <span data-but></span>
                    <span class="vi-score" data-score></span>
                    <button type="button" class="vi-btn" data-neuf>↺ Autre trajet</button>
                </div>
                <div class="vi-route" data-route></div>
                <div class="vi-plan" data-plan></div>
                <p class="vi-note" data-note></p>
                <div class="vi-cmds">
                    ${this.boutonCmd('gauche', 'À gauche', 'M14 4 L6 12 L14 20 M6 12 H20')}
                    ${this.boutonCmd('tout-droit', 'Tout droit', 'M12 20 V4 M5 11 L12 4 L19 11')}
                    ${this.boutonCmd('droite', 'À droite', 'M10 4 L18 12 L10 20 M18 12 H4')}
                </div>
            </div>`;

        this.planEl = this.container.querySelector('[data-plan]');
        this.routeEl = this.container.querySelector('[data-route]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.butEl = this.container.querySelector('[data-but]');
        this.scoreEl = this.container.querySelector('[data-score]');
        this.container.querySelector('[data-neuf]').addEventListener('click', () => this.nouveauTrajet());
        this.container.querySelectorAll('[data-sens]').forEach(b => {
            b.addEventListener('click', () => this.jouer(b.dataset.sens));
        });

        // Les flèches du clavier, pour qui en a un. ↑ avance, ← et → tournent —
        // du côté de la VOITURE, comme les boutons.
        this.surTouche = (e) => {
            const sens = { ArrowLeft: 'gauche', ArrowUp: 'tout-droit', ArrowRight: 'droite' }[e.key];
            if (!sens || this.isDemo) return;
            e.preventDefault();
            this.jouer(sens);
        };
        document.addEventListener('keydown', this.surTouche);

        this.nouveauTrajet();
    }

    boutonCmd(sens, nom, d) {
        return `<button type="button" class="vi-cmd ${sens === 'tout-droit' ? 'vi-cmd--go' : ''}"
            data-sens="${sens}" aria-label="${nom}">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="${d}" />
            </svg>
            <span class="vi-cmd-nom">${nom}</span>
        </button>`;
    }

    startGameLoop() { /* Au tour par tour : rien à animer en continu. */ }

    // --- Un trajet -------------------------------------------------------------

    nouveauTrajet() {
        const t = this.taille;
        for (let essai = 0; essai < 30; essai++) {
            this.ville = creerVille({ cols: t.cols, rows: t.rows, trous: 0.22, rng: this.rng });
            this.itineraire = tirerItineraire(this.ville, {
                virages: t.virages,
                capDepart: this.capNord ? 'N' : null,
                rng: this.rng
            });
            if (this.itineraire) break;
        }
        if (!this.itineraire) { this.note('Impossible de tracer un trajet ici.', 'ko'); return; }

        this.etapes = decrireItineraire(this.ville, this.itineraire);
        this.lieu = LIEUX[Math.floor(this.rng.next() * LIEUX.length)];
        this.etat = { noeuds: this.itineraire.noeuds, index: 0, cap: this.itineraire.capDepart };
        this.etapeCourante = 0;
        this.fautesTrajet = 0;
        this.trajets++;

        this.dessinerPlan();
        this.majRoute();
        this.majCommandes();
        this.butEl.innerHTML = `🚗 Va jusqu'à <b>${this.lieu.nom}</b>`;
        this.majScore();
        this.note(`La voiture roule vers <b>${nomCap(this.etat.cap)}</b>. `
            + `Les trois boutons sont ceux du CONDUCTEUR, pas ceux de l'écran.`);
    }

    majScore() {
        this.scoreEl.textContent = `${this.reussis} trajet${this.reussis > 1 ? 's' : ''} réussi${this.reussis > 1 ? 's' : ''}`
            + (this.erreurs ? ` · ${this.erreurs} erreur${this.erreurs > 1 ? 's' : ''}` : '');
    }

    // --- Le plan ---------------------------------------------------------------

    dessinerPlan() {
        const v = this.ville;
        const pas = 100;                     // unités SVG entre deux carrefours
        // La marge loge la voiture ET la chaussée aux carrefours du bord :
        // plus courte, la voiture semblait garée hors du plan.
        const marge = 66;
        const w = (v.cols - 1) * pas + marge * 2;
        const h = (v.rows - 1) * pas + marge * 2;
        const px = (x) => marge + x * pas;
        const py = (y) => marge + y * pas;

        // ORDRE DE DESSIN : la chaussée d'abord, les pâtés de maisons PAR-DESSUS.
        // L'inverse — des rues épaisses posées sur les îlots — donnait une
        // dalle sombre où l'on cherchait les rues au lieu de les suivre. Ici,
        // l'asphalte n'apparaît que dans l'espace laissé libre entre les îlots :
        // ce sont bien les bâtiments qui dessinent les rues, comme sur un vrai
        // plan.
        let asphalte = '', bandes = '';
        for (let y = 0; y < v.rows; y++) {
            for (let x = 0; x < v.cols; x++) {
                for (const cap of ['E', 'S']) {
                    const n = devant(x, y, cap);
                    if (n.x >= v.cols || n.y >= v.rows) continue;
                    if (!this.ville.rues.has(this.cleRue({ x, y }, n))) continue;
                    const a = `x1="${px(x)}" y1="${py(y)}" x2="${px(n.x)}" y2="${py(n.y)}"`;
                    asphalte += `<line ${a} stroke="#cbd5e1" stroke-width="40" stroke-linecap="round" />`
                        + `<line ${a} stroke="#9aa8ba" stroke-width="32" stroke-linecap="round" />`;
                    bandes += `<line ${a} stroke="#f8fafc" stroke-width="2.4" stroke-dasharray="9 13" opacity=".9" />`;
                }
            }
        }

        // Les ÎLOTS : les pâtés de maisons entre quatre carrefours. Ils ne
        // servent à rien au jeu et à tout au plan — sans eux, on regarde un
        // graphe ; avec eux, on regarde une ville, et on lit les rues comme
        // des rues.
        let ilots = '';
        for (let y = 0; y + 1 < v.rows; y++) {
            for (let x = 0; x + 1 < v.cols; x++) {
                const g = this.rngIlot(x, y);
                const m = 21;
                const bx = px(x) + m, by = py(y) + m, bw = pas - m * 2, bh = pas - m * 2;
                if (g < 0.22) {
                    ilots += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="9"
                        fill="#bbf7d0" stroke="#fff" stroke-width="3" />
                        <circle cx="${bx + bw * .34}" cy="${by + bh * .38}" r="9" fill="#4ade80" />
                        <circle cx="${bx + bw * .66}" cy="${by + bh * .64}" r="7" fill="#4ade80" />`;
                } else {
                    const teintes = [['#e5e7eb', '#cbd5e1'], ['#ede9e3', '#dcd5cb'],
                        ['#e0e7ff', '#c7d2fe'], ['#fef3c7', '#fde68a']];
                    const [fond, toit] = teintes[Math.floor(g * 4000) % 4];
                    ilots += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="6"
                        fill="${fond}" stroke="#fff" stroke-width="3" />`;
                    // Deux blocs d'immeuble : de loin, ça fait un pâté habité.
                    ilots += `<rect x="${bx + 5}" y="${by + 5}" width="${bw * .42}" height="${bh * .42}" rx="3" fill="${toit}" />`
                        + `<rect x="${bx + bw * .5}" y="${by + bh * .48}" width="${bw * .44}" height="${bh * .46}" rx="3" fill="${toit}" />`;
                }
            }
        }

        // Le départ et l'arrivée.
        const dep = this.itineraire.noeuds[0];
        const arr = this.itineraire.noeuds[this.itineraire.noeuds.length - 1];
        const but = `
            <g transform="translate(${px(arr.x)},${py(arr.y)})">
                <circle r="27" fill="${this.lieu.teinte}" opacity=".18">
                    <animate attributeName="r" values="27;33;27" dur="1.8s" repeatCount="indefinite" />
                </circle>
                <circle r="20" fill="#fff" stroke="${this.lieu.teinte}" stroke-width="3" />
                <g stroke="${this.lieu.teinte}" fill="none" stroke-width="1.8"
                   stroke-linecap="round" stroke-linejoin="round" transform="scale(1.05)">
                    ${PICTOS[this.lieu.dessin]}
                </g>
            </g>`;
        const depart = `<g transform="translate(${px(dep.x)},${py(dep.y)})">
                <circle r="15" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-dasharray="4 5" opacity=".38" />
            </g>`;

        this.planEl.innerHTML = `
            <svg class="vi-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet"
                 role="img" aria-label="Plan de ville">
                <rect width="${w}" height="${h}" rx="16" fill="#dfe5ec" />
                ${asphalte}
                ${bandes}
                ${ilots}
                ${depart}
                ${but}
                <g data-cibles></g>
                <g class="vi-voiture vi-voiture--stop" data-voiture>${this.dessinVoiture()}</g>
            </svg>`;

        this.voitureEl = this.planEl.querySelector('[data-voiture]');
        this.ciblesEl = this.planEl.querySelector('[data-cibles]');
        this.pos = { px, py, pas };
        this.placerVoiture(false);
        this.majCibles();
    }

    /**
     * LES CARREFOURS OÙ L'ON PEUT ALLER, cliquables directement sur le plan.
     *
     * Troisième façon de conduire, à côté des boutons et des flèches : on
     * désigne la rue qu'on veut prendre. Ce n'est pas un raccourci qui
     * contourne l'exercice — il faut toujours avoir compris QUELLE rue est « la
     * deuxième à gauche » — mais c'est le geste naturel devant un plan, et le
     * plus direct au doigt.
     */
    majCibles() {
        if (!this.ciblesEl || !this.pos) return;
        const { px, py } = this.pos;
        const n = this.etat.noeuds[this.etat.index];
        const fini = this.etat.index >= this.etat.noeuds.length - 1;
        const sorties = fini || this.isDemo
            ? {} : sortiesRelatives(this.ville, n.x, n.y, this.etat.cap);
        this.ciblesEl.innerHTML = Object.entries(sorties).map(([sens, c]) => `
            <g class="vi-cible" data-cible="${sens}" transform="translate(${px(c.x)},${py(c.y)})"
               role="button" tabindex="0" aria-label="Aller à ce carrefour">
                <circle r="26" fill="transparent" />
                <circle r="7" fill="#0f172a" opacity=".22">
                    <animate attributeName="opacity" values=".1;.32;.1" dur="2.2s" repeatCount="indefinite" />
                </circle>
            </g>`).join('');
        this.ciblesEl.querySelectorAll('[data-cible]').forEach(g => {
            g.addEventListener('click', () => this.jouer(g.dataset.cible));
        });
    }

    /** Un hasard STABLE par îlot : le plan ne doit pas scintiller au redessin. */
    rngIlot(x, y) {
        const n = Math.sin((x + 1) * 12.9898 + (y + 1) * 78.233) * 43758.5453;
        return n - Math.floor(n);
    }

    cleRue(a, b) {
        return (a.x < b.x || (a.x === b.x && a.y < b.y))
            ? `${a.x},${a.y}|${b.x},${b.y}` : `${b.x},${b.y}|${a.x},${a.y}`;
    }

    /** La voiture, vue de dessus, nez vers le HAUT (cap N = 0°). */
    dessinVoiture() {
        return `
            <g>
                <ellipse cx="0" cy="2" rx="15" ry="24" fill="rgba(15,23,42,.22)" />
                <rect x="-13" y="-22" width="26" height="44" rx="9" fill="#ef4444" />
                <rect x="-13" y="-22" width="26" height="44" rx="9" fill="none" stroke="#b91c1c" stroke-width="1.6" />
                <path d="M-10 -12 h20 l-3 -7 h-14 z" fill="#bfdbfe" />
                <rect x="-9" y="-4" width="18" height="13" rx="3" fill="#7f1d1d" opacity=".55" />
                <path d="M-10 15 h20 l-2 5 h-16 z" fill="#93c5fd" opacity=".8" />
                <circle cx="-8" cy="-19" r="3" fill="#fef3c7" />
                <circle cx="8" cy="-19" r="3" fill="#fef3c7" />
                <rect x="-16" y="-15" width="4" height="9" rx="2" fill="#1f2937" />
                <rect x="12" y="-15" width="4" height="9" rx="2" fill="#1f2937" />
                <rect x="-16" y="8" width="4" height="9" rx="2" fill="#1f2937" />
                <rect x="12" y="8" width="4" height="9" rx="2" fill="#1f2937" />
            </g>`;
    }

    placerVoiture(anime = true) {
        if (!this.voitureEl) return;
        const n = this.etat.noeuds[this.etat.index];
        const { px, py } = this.pos;
        this.voitureEl.classList.toggle('vi-voiture--stop', !anime);
        this.voitureEl.setAttribute('transform',
            `translate(${px(n.x)},${py(n.y)}) rotate(${ANGLES[this.etat.cap]})`);
    }

    // --- La feuille de route ----------------------------------------------------

    majRoute() {
        const ico = { gauche: '↰', droite: '↱' };
        this.routeEl.innerHTML = this.etapes.map((e, i) => {
            const etat = i < this.etapeCourante ? 'faite' : (i === this.etapeCourante ? 'active' : '');
            const texte = e.type === 'arrivee'
                ? (e.rues > 0 ? e.texte : `Tu arrives à ${this.lieu.nom}`)
                : e.texte;
            return `<span class="vi-etape ${etat ? 'vi-etape--' + etat : ''}">
                <span class="vi-fleche">${e.type === 'arrivee' ? '🏁' : ico[e.sens]}</span>${texte}</span>`;
        }).join('');
    }

    /**
     * Quelle consigne est en cours ?
     *
     * L'étape avance quand le virage qu'elle décrit vient d'être pris — pas au
     * carrefour suivant. C'est ce décalage qui permet de dire « tu es allé trop
     * loin » plutôt que « faux ».
     */
    majEtapeCourante() {
        let i = 0, virages = 0;
        let cap = this.itineraire.capDepart;
        for (let k = 0; k < this.etat.index; k++) {
            const a = this.etat.noeuds[k], b = this.etat.noeuds[k + 1];
            const capVers = CAPS.find(c => {
                const d = devant(a.x, a.y, c);
                return d.x === b.x && d.y === b.y;
            });
            if (sensEntre(cap, capVers) !== 'tout-droit') virages++;
            cap = capVers;
        }
        i = Math.min(virages, this.etapes.length - 1);
        this.etapeCourante = i;
    }

    // --- Les commandes ----------------------------------------------------------

    majCommandes() {
        const n = this.etat.noeuds[this.etat.index];
        const sorties = sortiesRelatives(this.ville, n.x, n.y, this.etat.cap);
        const fini = this.etat.index >= this.etat.noeuds.length - 1;
        this.container.querySelectorAll('[data-sens]').forEach(b => {
            // On laisse ACTIVES les directions sans rue : refuser le clic
            // priverait l'élève du seul retour qui compte — « il n'y a pas de
            // rue de ce côté ». Seule l'arrivée éteint tout.
            //
            // Pendant la démonstration non plus : le robot APPUIE sur ces
            // boutons, et le voir presser une touche grisée donne l'impression
            // que rien ne répond. Les vrais clics, eux, sont ignorés plus bas.
            b.disabled = fini;
            b.title = sorties[b.dataset.sens] ? '' : 'Aucune rue de ce côté';
        });
    }

    jouer(sens) {
        // Pendant la démonstration, c'est le robot qui conduit — depuis sa
        // propre boucle. Un clic de spectateur ferait avancer la voiture
        // pendant qu'il explique, et il se retrouverait à commenter un
        // carrefour que la voiture a déjà quitté.
        if (this.isDemo || !this.etat || this.animation) return;
        if (this.etat.index >= this.etat.noeuds.length - 1) return;

        const res = jugerCoup(this.ville, this.etat, sens);
        if (res.ok) {
            this.animation = true;
            this.etat.cap = res.cap;
            this.etat.index++;
            this.placerVoiture(true);
            this.majEtapeCourante();
            this.majRoute();
            this.timerId = setTimeout(() => {
                this.animation = false;
                if (!this.isRunning) return;
                if (this.etat.index >= this.etat.noeuds.length - 1) this.arriver();
                else {
                    this.majCommandes();
                    this.majCibles();
                    this.note(`Tu roules vers <b>${nomCap(this.etat.cap)}</b>. Consigne : <b>${this.consigneTexte()}</b>`);
                }
            }, 460);
            return;
        }

        // --- Une erreur ----------------------------------------------------
        this.erreurs++;
        this.fautesTrajet++;
        this.majScore();
        this.note(res.message, 'ko');
        this.secouer();
        if (!this.isDemo) {
            this.onWrongAnswer(null, {
                concept: 'geo.espace.deplacement',
                questionText: `${this.consigneTexte()} (voiture vers ${nomCap(this.etat.cap)})`,
                input: sens === 'tout-droit' ? 'tout droit' : sens,
                expected: res.bonSens === 'tout-droit' ? 'tout droit' : res.bonSens,
                customMessage: res.message,
                silencieux: true
            });
        }
    }

    consigneTexte() {
        const e = this.etapes[this.etapeCourante];
        if (!e) return '';
        return e.type === 'arrivee'
            ? (e.rues > 0 ? e.texte : `rejoindre ${this.lieu.nom}`)
            : e.texte;
    }

    secouer() {
        if (!this.voitureEl) return;
        this.voitureEl.classList.add('vi-voiture--stop');
        const n = this.etat.noeuds[this.etat.index];
        const { px, py } = this.pos;
        const base = `translate(${px(n.x)},${py(n.y)}) rotate(${ANGLES[this.etat.cap]})`;
        let i = 0;
        const tic = () => {
            if (!this.voitureEl || !this.isRunning) return;
            const d = [4, -4, 3, -2, 0][i];
            this.voitureEl.setAttribute('transform', `${base} translate(${d},0)`);
            if (++i < 5) this.timerSecousse = setTimeout(tic, 55);
        };
        tic();
    }

    arriver() {
        this.reussis++;
        this.etapeCourante = this.etapes.length - 1;
        this.majRoute();
        this.majCommandes();
        this.majCibles();
        this.majScore();
        const parfait = this.fautesTrajet === 0;
        this.note(parfait
            ? `🏁 Arrivé à ${this.lieu.nom} sans une seule erreur. Tu t'es mis à la place du conducteur.`
            : `🏁 Arrivé à ${this.lieu.nom}. ${this.fautesTrajet} erreur${this.fautesTrajet > 1 ? 's' : ''} en route — le prochain trajet sera plus net.`,
            'ok');
        if (!this.isDemo) {
            this.onCorrectAnswer(null, 'geo.espace.deplacement', {
                points: parfait ? 30 : 15,
                questionText: `Itinéraire jusqu'à ${this.lieu.nom} (${this.taille.virages} virages)`,
                given: 'arrivé', expected: 'arrivé'
            });
        }
        this.timerId = setTimeout(() => { if (this.isRunning) this.nouveauTrajet(); }, 2600);
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = ton ? `<span class="vi-bulle vi-bulle--${ton}">${html}</span>` : html;
    }

    // --- Le robot ---------------------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.planEl);
        this.demoGate = gate;
        const fin = () => { cur?.destroy(); gate?.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!await cur.pause(600) || !this.isRunning) return fin();
        // UNE IDÉE PAR BULLE, et des phrases courtes : le robot attend le
        // temps de lire ce qu'il vient de dire (340 ms par mot). Une bulle de
        // vingt-cinq mots fige la démonstration dix secondes — on croit qu'elle
        // a planté, et on la ferme avant le premier virage.
        cur.say('Le plan ne bouge pas. C\'est la voiture qui tourne.', this.planEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say(`Direction ${this.lieu.nom}. D'abord : ${this.consigneTexte().toLowerCase()}.`, this.routeEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        while (this.isRunning && this.etat.index < this.etat.noeuds.length - 1) {
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const ici = this.etat.noeuds[this.etat.index];
            const suivant = this.etat.noeuds[this.etat.index + 1];
            const capVers = CAPS.find(c => {
                const d = devant(ici.x, ici.y, c);
                return d.x === suivant.x && d.y === suivant.y;
            });
            const sens = sensEntre(this.etat.cap, capVers);

            // Le moment qui compte : quand la voiture ne monte pas, on dit à
            // voix haute pourquoi sa gauche n'est pas celle de l'écran.
            if (sens !== 'tout-droit' && this.etat.cap !== 'N') {
                cur.say(`Elle roule vers ${nomCap(this.etat.cap)}. Sa ${sens} est de CE côté.`, this.planEl);
            } else if (sens === 'tout-droit') {
                cur.say('Rien ici : tout droit, et je compte les rues.', this.planEl);
            } else {
                cur.say(`Elle monte : sa ${sens} est celle de l'écran.`, this.planEl);
            }
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();

            const bouton = this.container.querySelector(`[data-sens="${sens}"]`);
            if (bouton && !await cur.tap(bouton)) return fin();
            const res = jugerCoup(this.ville, this.etat, sens);
            if (res.ok) {
                this.etat.cap = res.cap;
                this.etat.index++;
                this.placerVoiture(true);
                this.majEtapeCourante();
                this.majRoute();
            }
            if (!await cur.pause(DEMO_SPEED.press) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Arrivé. Avant chaque virage : dans quel sens roule-t-elle ?', this.planEl);
        if (!await cur.pause(DEMO_SPEED.between)) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        if (this.surTouche) document.removeEventListener('keydown', this.surTouche);
        if (this.timerSecousse) clearTimeout(this.timerSecousse);
        super.destroy();
    }
}

export function engineVille(container, isDemo, params) {
    const jeu = new Ville(container, isDemo, params);
    jeu.start();
    return jeu;
}
