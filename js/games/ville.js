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
    sortiesRelatives, tourner, sensEntre, CAPS, devant, nomCap, aLieu
} from '../core/ville.js';

const ANGLES = { N: 0, E: 90, S: 180, O: 270 };
// Les trois crans du volant, du plus à gauche au plus à droite.
const SENS = ['gauche', 'tout-droit', 'droite'];

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
                /* UNE CONSIGNE PAR LIGNE. En pastilles côte à côte, les
                   consignes se lisaient comme une phrase continue et il
                   fallait deviner où l'une finissait ; surtout, « Avance »
                   flottait tout seul au début alors qu'il fait partie de
                   CHAQUE consigne — on avance, PUIS on tourne. Chaque ligne
                   porte donc l'ordre entier. */
                .vi-route {
                    display: flex; flex-direction: column; align-items: stretch; gap: 4px;
                    width: 100%; max-width: 480px;
                    font-size: clamp(11px, 2.6cqw, 14px); flex: 0 0 auto;
                }
                .vi-etape {
                    display: flex; align-items: center; gap: 7px;
                    padding: 5px 12px; border-radius: 10px; font-weight: 700;
                    background: var(--bg-hover); color: var(--text-muted);
                    border: 2px solid transparent; transition: .18s;
                }
                .vi-etape--faite { opacity: .45; text-decoration: line-through; }
                .vi-etape--active {
                    background: color-mix(in srgb, var(--primary) 16%, transparent);
                    color: var(--text-main); border-color: var(--primary);
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
                /* Le volant est braqué : le bouton reste enfoncé. Sans cette
                   marque, rien ne dit que la rotation est ACQUISE et qu'il ne
                   reste qu'à avancer. */
                .vi-cmd--braque {
                    background: color-mix(in srgb, var(--primary) 18%, transparent);
                    border-color: var(--primary); color: var(--primary);
                    box-shadow: none; transform: translateY(3px);
                }

                /* RIEN SOUS LE PLAN. Une ligne de commentaire posée sous la
                   ville répétait la consigne déjà surlignée au-dessus et
                   poussait le plan vers le haut : deux endroits où lire la
                   même chose, et un plan plus petit. Il ne reste que le
                   retour d'erreur — irremplaçable, lui —, remonté au-dessus
                   du plan, et qui ne prend de place que s'il a quelque chose
                   à dire. */
                .vi-note {
                    text-align: center; width: 100%; max-width: 640px;
                    font-size: clamp(11px, 2.7cqw, 14px); line-height: 1.35;
                    color: var(--text-muted); flex: 0 0 auto;
                }
                .vi-note:empty { display: none; }
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
                <p class="vi-note" data-note></p>
                <div class="vi-plan" data-plan></div>
                <div class="vi-cmds">
                    ${this.boutonCmd('gauche', 'Tourner à gauche',
        'M3 3v6h6M3.5 15.5a9 9 0 1 0 2.1-9.4L3 8.5')}
                    ${this.boutonCmd('avance', 'Avance', 'M12 20 V4 M5 11 L12 4 L19 11')}
                    ${this.boutonCmd('droite', 'Tourner à droite',
        'M21 3v6h-6M20.5 15.5a9 9 0 1 1-2.1-9.4L21 8.5')}
                </div>
            </div>`;

        this.planEl = this.container.querySelector('[data-plan]');
        this.routeEl = this.container.querySelector('[data-route]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.butEl = this.container.querySelector('[data-but]');
        this.scoreEl = this.container.querySelector('[data-score]');
        this.container.querySelector('[data-neuf]').addEventListener('click', () => this.nouveauTrajet());
        this.container.querySelectorAll('[data-sens]').forEach(b => {
            b.addEventListener('click', () => this.commande(b.dataset.sens));
        });

        // Les flèches du clavier, pour qui en a un. ↑ avance, ← et → tournent —
        // du côté de la VOITURE, comme les boutons.
        this.surTouche = (e) => {
            const sens = { ArrowLeft: 'gauche', ArrowUp: 'avance', ArrowRight: 'droite' }[e.key];
            if (!sens || this.isDemo) return;
            e.preventDefault();
            this.commande(sens);
        };
        document.addEventListener('keydown', this.surTouche);

        this.nouveauTrajet();
    }

    boutonCmd(sens, nom, d) {
        return `<button type="button" class="vi-cmd ${sens === 'avance' ? 'vi-cmd--go' : ''}"
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
            this.ville = creerVille({ cols: t.cols, rows: t.rows, trous: 0.16, rng: this.rng });
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
        this.braquage = 0;
        this.angleVoiture = ANGLES[this.itineraire.capDepart];
        this.etapeCourante = 0;
        this.fautesTrajet = 0;
        this.trajets++;

        this.dessinerPlan();
        this.majRoute();
        this.majCommandes();
        this.butEl.innerHTML = `🚗 Va jusqu'<b>${aLieu(this.lieu.nom)}</b>`;
        this.majScore();
        this.note('');
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
        // TROIS PASSES, et l'ordre n'est pas un détail. Dessiner chaque rue
        // complète (trottoir puis chaussée) l'une après l'autre faisait passer
        // le trottoir clair de la rue suivante PAR-DESSUS la chaussée de la
        // précédente : à chaque carrefour apparaissait une encoche claire, et
        // les croisements avaient l'air rapiécés. Tous les trottoirs d'abord,
        // toutes les chaussées ensuite, les bandes en dernier : le carrefour
        // devient une seule nappe d'asphalte.
        const traits = [];
        for (let y = 0; y < v.rows; y++) {
            for (let x = 0; x < v.cols; x++) {
                for (const cap of ['E', 'S']) {
                    const n = devant(x, y, cap);
                    if (n.x >= v.cols || n.y >= v.rows) continue;
                    if (!this.ville.rues.has(this.cleRue({ x, y }, n))) continue;
                    traits.push({ x1: px(x), y1: py(y), x2: px(n.x), y2: py(n.y) });
                }
            }
        }
        const coord = (t) => `x1="${t.x1}" y1="${t.y1}" x2="${t.x2}" y2="${t.y2}"`;
        const trottoirs = traits.map(t =>
            `<line ${coord(t)} stroke="#cbd5e1" stroke-width="40" stroke-linecap="round" />`).join('');
        const chaussees = traits.map(t =>
            `<line ${coord(t)} stroke="#9aa8ba" stroke-width="32" stroke-linecap="round" />`).join('');
        // La bande blanche s'ARRÊTE avant le carrefour, comme sur une vraie
        // route : c'est elle qui, en traversant les croisements, y dessinait
        // une croix blanche et les salissait. On raccourcit donc la ligne
        // elle-même plutôt que de ruser avec les tirets.
        const recul = 24;
        const bandes = traits.map(t => {
            const dx = Math.sign(t.x2 - t.x1) * recul, dy = Math.sign(t.y2 - t.y1) * recul;
            return `<line x1="${t.x1 + dx}" y1="${t.y1 + dy}" x2="${t.x2 - dx}" y2="${t.y2 - dy}"
                stroke="#f8fafc" stroke-width="2.4" stroke-dasharray="9 12" opacity=".85" />`;
        }).join('');
        const asphalte = trottoirs + chaussees;

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
                <g data-trace fill="none" stroke="#ef4444" stroke-width="9"
                   stroke-linecap="round" stroke-linejoin="round" opacity=".75"></g>
                ${depart}
                ${but}
                <g data-cibles></g>
                <g class="vi-voiture vi-voiture--stop" data-voiture>${this.dessinVoiture()}</g>
            </svg>`;

        this.voitureEl = this.planEl.querySelector('[data-voiture]');
        this.ciblesEl = this.planEl.querySelector('[data-cibles]');
        this.traceEl = this.planEl.querySelector('[data-trace]');
        this.pos = { px, py, pas };
        this.placerVoiture(false);
        this.majCibles();
    }

    /**
     * LE CHEMIN PARCOURU, tracé rue après rue derrière la voiture.
     *
     * Ce n'est pas une décoration. Sans lui, un élève qui s'est trompé deux
     * carrefours plus tôt ne voit qu'une voiture au mauvais endroit ; avec lui,
     * il voit le trait revenir sur lui-même, ou tourner trop tôt, et il
     * comprend OÙ ça a dérapé — pas seulement que c'est raté.
     *
     * Chaque tronçon se dessine à la vitesse de la voiture : le trait sort de
     * dessous elle au lieu d'apparaître d'un bloc.
     */
    tracerTroncon(a, b, anime = true) {
        if (!this.traceEl) return;
        const { px, py, pas } = this.pos;
        const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l.setAttribute('x1', px(a.x)); l.setAttribute('y1', py(a.y));
        l.setAttribute('x2', px(b.x)); l.setAttribute('y2', py(b.y));
        this.traceEl.appendChild(l);
        if (!anime) return;
        l.style.strokeDasharray = pas;
        l.style.strokeDashoffset = pas;
        requestAnimationFrame(() => {
            l.style.transition = 'stroke-dashoffset .42s cubic-bezier(.4,.1,.2,1)';
            l.style.strokeDashoffset = '0';
        });
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
        // Un repère BLANC, comme un marquage au sol : la pastille sombre qu'on
        // avait avant se lisait comme une tache sur la chaussée, et il y en
        // avait trois par carrefour.
        this.ciblesEl.innerHTML = Object.entries(sorties).map(([sens, c]) => `
            <g class="vi-cible" data-cible="${sens}" transform="translate(${px(c.x)},${py(c.y)})"
               role="button" tabindex="0" aria-label="Aller à ce carrefour">
                <circle r="26" fill="transparent" />
                <circle r="11" fill="none" stroke="#f8fafc" stroke-width="2.6" opacity=".7" />
                <circle r="4.5" fill="#f8fafc" opacity=".9">
                    <animate attributeName="r" values="3.5;5.5;3.5" dur="2.2s" repeatCount="indefinite" />
                </circle>
            </g>`).join('');
        // Désigner une rue sur le plan reste possible, mais passe par le volant
        // comme le reste : la voiture braque D'ABORD, puis s'engage. Sans ce
        // détour elle se serait mise à changer de cap par téléportation dans le
        // seul cas où l'on montre du doigt — deux règles pour un même geste.
        this.ciblesEl.querySelectorAll('[data-cible]').forEach(g => {
            g.addEventListener('click', () => {
                const voulu = SENS.indexOf(g.dataset.cible) - 1;
                if (this.animation || voulu < -1) return;
                this.angleVoiture += (voulu - this.braquage) * 90;
                this.braquage = voulu;
                this.placerVoiture(true);
                this.timerVirage = setTimeout(() => {
                    if (this.isRunning) this.commande('avance');
                }, voulu === 0 ? 0 : 260);
            });
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

    /** Le cap vers lequel la voiture POINTE, volant compris. */
    capVise() {
        return tourner(this.etat.cap, SENS[this.braquage + 1]);
    }

    placerVoiture(anime = true) {
        if (!this.voitureEl) return;
        const n = this.etat.noeuds[this.etat.index];
        const { px, py } = this.pos;
        this.voitureEl.classList.toggle('vi-voiture--stop', !anime);
        // L'angle est CUMULÉ, jamais recalculé modulo 360 : recalculer donnerait
        // 270° là où l'on vient de braquer à −90°, et la voiture ferait trois
        // quarts de tour à l'écran pour un quart de volant.
        this.voitureEl.setAttribute('transform',
            `translate(${px(n.x)},${py(n.y)}) rotate(${this.angleVoiture})`);
    }

    // --- La feuille de route ----------------------------------------------------

    /**
     * LA FEUILLE DE ROUTE, une consigne complète par ligne.
     *
     * « Avance » n'est pas une étape : c'est la moitié de chaque étape. Isolé
     * en tête de liste, il donnait l'impression qu'on avançait une fois pour
     * toutes, puis qu'on ne faisait plus que tourner — alors qu'entre deux
     * virages on roule, et que c'est en roulant qu'on compte les rues. Chaque
     * ligne porte donc l'ordre entier : « Avance puis prends la deuxième à
     * gauche. »
     */
    lignesRoute() {
        const lignes = [];
        for (const e of this.etapes) {
            if (e.type === 'depart') continue;          // fondu dans « Avance puis… »
            if (e.type === 'tourner') {
                // Rang 0 : la rue ne fait que tourner, il n'y a rien à compter
                // et surtout rien à avancer — « Avance puis tourne tout de
                // suite » se contredit en six mots.
                lignes.push({
                    ico: e.sens === 'gauche' ? '↰' : '↱',
                    texte: e.rang < 1
                        ? `La rue tourne à ${e.sens} : suis-la.`
                        : `Avance puis ${e.texte.charAt(0).toLowerCase()}${e.texte.slice(1)}.`
                });
            } else {
                lignes.push({
                    ico: '🏁',
                    texte: e.rues > 0 ? `${e.texte}.` : `Tu arrives ${aLieu(this.lieu.nom)}.`
                });
            }
        }
        return lignes;
    }

    majRoute() {
        // La ligne en cours : « Avance » et le premier virage ne font plus
        // qu'une consigne, donc l'étape 0 et l'étape 1 allument la même ligne.
        const active = Math.max(0, this.etapeCourante - 1);
        this.routeEl.innerHTML = this.lignesRoute().map((l, i) => {
            const etat = i < active ? 'faite' : (i === active ? 'active' : '');
            return `<span class="vi-etape ${etat ? 'vi-etape--' + etat : ''}">
                <span class="vi-fleche">${l.ico}</span>${l.texte}</span>`;
        }).join('');
    }

    /**
     * Quelle consigne est en cours ?
     *
     * L'étape avance quand le virage qu'elle décrit vient d'être pris — pas au
     * carrefour suivant. C'est ce décalage qui permet de dire « tu es allé trop
     * loin » plutôt que « faux ».
     *
     * Tant que la voiture n'a pas bougé, c'est « Avance » qui est allumé : la
     * première chose à faire n'est pas de chercher un virage, c'est de partir.
     */
    majEtapeCourante() {
        if (this.etat.index === 0) { this.etapeCourante = 0; return; }
        let virages = 0;
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
        // +1 : la feuille de route commence par « Avance ».
        this.etapeCourante = Math.min(virages + 1, this.etapes.length - 1);
    }

    // --- Les commandes ----------------------------------------------------------

    majCommandes() {
        const fini = this.etat.index >= this.etat.noeuds.length - 1;
        this.container.querySelectorAll('[data-sens]').forEach(b => {
            const s = b.dataset.sens;
            // Le volant a trois crans : au bout, le bouton s'éteint. « Avance »
            // reste toujours actif — même vers une rue qui n'existe pas, car
            // « il n'y a pas de rue de ce côté » est le retour qui apprend le
            // plus, et le refuser en silence n'apprend rien.
            b.disabled = fini || (s === 'gauche' && this.braquage <= -1)
                || (s === 'droite' && this.braquage >= 1);
            b.classList.toggle('vi-cmd--braque',
                (s === 'gauche' && this.braquage < 0) || (s === 'droite' && this.braquage > 0));
        });
    }

    /**
     * TOURNER N'EST PAS AVANCER.
     *
     * Les trois boutons faisaient tous rouler la voiture : choisir « à gauche »
     * l'envoyait dans la rue de gauche, et c'était jugé sur-le-champ. Or ce
     * qu'on travaille ici, c'est justement le geste de se mettre à la place du
     * conducteur — et ce geste-là, c'est TOURNER LE VOLANT. Le séparer de
     * l'avance donne à l'élève ce qui lui manquait : voir où la voiture pointe
     * AVANT de s'engager, et se reprendre si ce n'est pas ce qu'il voulait.
     * Une rotation ne coûte rien et ne compte pas comme une réponse ; seul
     * « Avance » engage.
     */
    commande(action) {
        if (this.isDemo || !this.etat || this.animation) return;
        if (this.etat.index >= this.etat.noeuds.length - 1) return;
        if (action === 'avance') { this.jouer(SENS[this.braquage + 1]); return; }

        // Le volant a TROIS crans : à gauche, tout droit, à droite. Au-delà on
        // ferait demi-tour, ce qu'aucun itinéraire ne demande — et une voiture
        // qui peut tourner en rond n'aide personne à compter les rues.
        const vise = this.braquage + (action === 'gauche' ? -1 : 1);
        if (vise < -1 || vise > 1) return;
        this.angleVoiture += (vise - this.braquage) * 90;
        this.braquage = vise;
        this.placerVoiture(true);
        this.majCommandes();
        this.note('');
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
            this.avancer(res);
            this.timerId = setTimeout(() => {
                this.animation = false;
                if (!this.isRunning) return;
                if (this.etat.index >= this.etat.noeuds.length - 1) this.arriver();
                else {
                    this.majCommandes();
                    this.majCibles();
                    this.note('');
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

    /** Un pas accepté : la voiture glisse, le trait la suit, la feuille avance. */
    avancer(res) {
        const de = this.etat.noeuds[this.etat.index];
        this.etat.cap = res.cap;
        this.etat.index++;
        // Le volant se remet droit : au carrefour suivant, « à gauche » veut
        // dire la gauche de la voiture telle qu'elle arrive.
        this.braquage = 0;
        this.tracerTroncon(de, this.etat.noeuds[this.etat.index]);
        this.placerVoiture(true);
        this.majEtapeCourante();
        this.majRoute();
    }

    consigneTexte() {
        const e = this.etapes[this.etapeCourante];
        if (!e) return '';
        return e.type === 'arrivee'
            ? (e.rues > 0 ? e.texte : `rejoindre ${this.lieu.nom}`)
            : e.texte;
    }

    /** La consigne d'APRÈS : ce qu'on cherche pendant qu'on avance. */
    consigneSuivante() {
        const e = this.etapes[this.etapeCourante + 1];
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
        const base = `translate(${px(n.x)},${py(n.y)}) rotate(${this.angleVoiture})`;
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
            ? `🏁 Arrivé ${aLieu(this.lieu.nom)} sans une seule erreur. Tu t'es mis à la place du conducteur.`
            : `🏁 Arrivé ${aLieu(this.lieu.nom)}. ${this.fautesTrajet} erreur${this.fautesTrajet > 1 ? 's' : ''} en route — le prochain trajet sera plus net.`,
            'ok');
        if (!this.isDemo) {
            this.onCorrectAnswer(null, 'geo.espace.deplacement', {
                points: parfait ? 30 : 15,
                questionText: `Itinéraire jusqu'${aLieu(this.lieu.nom)} (${this.taille.virages} virages)`,
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
        cur.say(`Direction : ${this.lieu.nom}. On avance, puis ${this.consigneSuivante().toLowerCase()}.`, this.routeEl);
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

            // Le robot BRAQUE d'abord, puis avance — dans cet ordre, parce que
            // c'est l'ordre que l'élève devra reproduire. Le voir tourner le
            // volant et attendre montre que la rotation seule ne fait rien
            // avancer : c'est là que se joue « la gauche de qui ? ».
            if (sens !== 'tout-droit') {
                const volant = this.container.querySelector(`[data-sens="${sens}"]`);
                if (volant && !await cur.tap(volant)) return fin();
                this.angleVoiture += sens === 'gauche' ? -90 : 90;
                this.braquage = sens === 'gauche' ? -1 : 1;
                this.placerVoiture(true);
                this.majCommandes();
                if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
            }
            const go = this.container.querySelector('[data-sens="avance"]');
            if (go && !await cur.tap(go)) return fin();
            const res = jugerCoup(this.ville, this.etat, sens);
            if (res.ok) this.avancer(res);
            this.majCommandes();
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
        if (this.timerVirage) clearTimeout(this.timerVirage);
        super.destroy();
    }
}

export function engineVille(container, isDemo, params) {
    const jeu = new Ville(container, isDemo, params);
    jeu.start();
    return jeu;
}
