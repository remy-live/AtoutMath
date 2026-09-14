// LE SLITHERLINK — à l'écran.
//
// Un quadrillage de points, des chiffres dans les cases, et une seule boucle à
// tracer. On touche un segment : il devient trait, puis croix, puis rien —
// le geste des recueils de puzzles, où l'on barre ce dont on est sûr que la
// boucle ne passe pas. Le glissé trace à la chaîne, pour aller vite au doigt.
//
// Deux choses se mettent à jour en direct, parce qu'elles portent tout
// l'apprentissage : chaque chiffre passe au vert dès qu'il a son compte et au
// rouge dès qu'on en met trop, et le message dit où en est la boucle
// (ouverte, coupée en deux, refermée). L'élève voit son raisonnement, pas
// seulement son dessin.
//
// L'aide donne LE pas suivant, avec sa raison — la même que celle du robot.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    VIDE, clefH, clefV, genererSlitherlink, cotesTraces, verifier, prochainPas, tailleDe
} from '../core/slitherlink.js';

const COMPETENCE = 'num.logique.slitherlink';
const PAS = 44;          // le côté d'une case, en unités du dessin
const MARGE = 24;

class Slitherlink extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'slitherlink');
        this.rng = makeRng(this.params.seed);
        this.tailleId = this.params.taille || 'moyen';
        this.difficulte = this.params.difficulte || 'moyen';
        this.reussies = 0;
        this.aides = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .sl-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 10px;
                    width: 100%; height: 100%; padding: 10px; box-sizing: border-box;
                    /* « size » : la grille doit se borner à la hauteur autant
                       qu'à la largeur — c'est la hauteur qui manque dès qu'on
                       couche le téléphone. */
                    color: var(--text-main); overflow-y: auto; container-type: size;
                }
                .sl-tete { text-align: center; font-size: .9rem; color: var(--text-muted); max-width: 640px; }
                .sl-plateau {
                    /* « --sl-ratio » (largeur / hauteur de la grille) vient du
                       jeu : les grilles ne sont pas toutes carrées, et une
                       borne en hauteur ne se traduit en largeur qu'avec lui. */
                    width: 100%; max-width: min(96cqw, 620px, 72cqh * var(--sl-ratio, 1));
                    background: var(--bg-panel); border: 2px solid var(--border);
                    border-radius: 14px; padding: 6px; box-sizing: border-box;
                    touch-action: none; user-select: none; -webkit-tap-highlight-color: transparent;
                }
                .sl-plateau svg { width: 100%; height: auto; display: block; }

                /* SEULE la zone de touche reçoit le doigt. Un trait « invisible »
                   reste peint aux yeux de SVG : sans cela il intercepte le clic
                   et rien ne se trace. */
                .sl-point, .sl-arete, .sl-croix, .sl-chiffre { pointer-events: none; }

                .sl-point { fill: color-mix(in srgb, var(--text-main) 70%, transparent); }
                .sl-chiffre {
                    font-weight: 900; text-anchor: middle; dominant-baseline: central;
                    fill: var(--text-main); font-family: inherit; pointer-events: none;
                }
                /* LE CHIFFRE SE COLORE : vert quand il a son compte, rouge
                   quand on lui en donne trop. C'est le retour immédiat qui
                   fait qu'on apprend en traçant. */
                .sl-chiffre--fait { fill: var(--success, #16a34a); }
                .sl-chiffre--trop { fill: var(--danger, #dc2626); }

                .sl-arete {
                    stroke: transparent; stroke-width: 6; stroke-linecap: round;
                    transition: stroke .12s;
                }
                .sl-arete--trait { stroke: var(--primary, #4f46e5); }
                .sl-arete--faute { stroke: var(--danger, #dc2626); }
                /* La croix note « la boucle ne passe pas ici ». Elle doit se
                   voir sans écraser le tracé : c'est une note de travail. */
                .sl-croix { stroke: color-mix(in srgb, var(--text-main) 40%, transparent);
                    stroke-width: 2.4; stroke-linecap: round; opacity: 0; transition: opacity .12s; }
                .sl-croix--vue { opacity: .75; }
                .sl-clic { fill: transparent; cursor: pointer; }
                .sl-clic:hover + .sl-arete:not(.sl-arete--trait) {
                    stroke: color-mix(in srgb, var(--primary, #4f46e5) 35%, transparent);
                }
                .sl-montre { animation: sl-clignote 1s ease 3; }
                @keyframes sl-clignote { 50% { stroke: var(--warning, #f59e0b); stroke-width: 9; } }

                .sl-barre { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
                .sl-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700; padding: 7px 13px;
                }
                .sl-btn--valider { border-color: var(--primary); background: var(--primary); color: #fff; }
                .sl-note { min-height: 2.6em; text-align: center; font-size: .88rem;
                    color: var(--text-muted); max-width: 640px; }
                .sl-note--ok { color: var(--success, #16a34a); font-weight: 700; }
                .sl-note--ko { color: var(--danger, #dc2626); font-weight: 600; }

                /* Sur un téléphone, chaque pixel de largeur est un pixel de
                   côté en plus : on rend au plateau les marges du cadre. */
                @container (max-width: 430px) {
                    .sl-tete { font-size: .82rem; }
                    .sl-btn { padding: 6px 10px; font-size: .86rem; }
                    .sl-wrap { padding: 6px 2px; gap: 8px; }
                    .sl-plateau { max-width: 100cqw; padding: 2px; }
                }
                /* TÉLÉPHONE COUCHÉ : empilés, la grille et les boutons sortent
                   de l'écran. On met la grille à gauche et tout le reste à
                   droite — rien à faire défiler pour atteindre « Vérifier ». */
                @media (max-height: 560px) {
                    .sl-wrap {
                        display: grid; grid-template-columns: auto minmax(0, 1fr);
                        grid-template-rows: auto auto auto; align-items: center;
                        gap: 6px 14px; align-content: center;
                    }
                    .sl-plateau { grid-area: 1 / 1 / 4 / 2;
                        max-width: min(52cqw, 94cqh * var(--sl-ratio, 1)); }
                    .sl-tete { grid-area: 1 / 2; font-size: .8rem; }
                    .sl-barre { grid-area: 2 / 2; }
                    .sl-note { grid-area: 3 / 2; min-height: 2em; font-size: .82rem; }
                }
            </style>
            <div class="sl-wrap">
                <div class="sl-tete">Trace <b>une seule boucle fermée</b> qui ne se croise jamais.
                    Un chiffre dit combien de ses quatre côtés en font partie.
                    Touche un segment : trait, puis croix, puis rien.</div>
                <div class="sl-plateau" data-plateau></div>
                <div class="sl-barre">
                    <button type="button" class="sl-btn" data-aide>💡 Aide-moi</button>
                    <button type="button" class="sl-btn" data-effacer>↺ Effacer</button>
                    <button type="button" class="sl-btn" data-neuf>Autre grille</button>
                    <button type="button" class="sl-btn sl-btn--valider" data-valider>Vérifier</button>
                </div>
                <div class="sl-note" data-note></div>
            </div>`;
        this.plateauEl = this.container.querySelector('[data-plateau]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.container.querySelector('[data-effacer]').onclick = () => this.effacer();
        this.container.querySelector('[data-neuf]').onclick = () => this.showNext();
        this.container.querySelector('[data-valider]').onclick = () => this.valider();
    }

    startGameLoop() { this.poser(); }

    poser() {
        this.puzzle = genererSlitherlink({ taille: this.tailleId, difficulte: this.difficulte }, this.rng);
        if (!this.puzzle) {                       // filet : une taille sûre
            this.puzzle = genererSlitherlink({ taille: 'petit', difficulte: 'facile' }, this.rng);
        }
        this.h = new Uint8Array(this.puzzle.solution.h.length);
        this.v = new Uint8Array(this.puzzle.solution.v.length);
        this.dessiner();
        this.note('');
        return true;
    }

    // --- Le dessin ------------------------------------------------------------

    dessiner() {
        const { cols, lignes, indices } = this.puzzle;
        const W = cols * PAS + 2 * MARGE, H = lignes * PAS + 2 * MARGE;
        const px = (x) => MARGE + x * PAS, py = (y) => MARGE + y * PAS;
        let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grille de Slitherlink">`;

        // Les chiffres, sous les segments : c'est le trait qui doit ressortir.
        for (let y = 0; y < lignes; y++) for (let x = 0; x < cols; x++) {
            const k = indices[y * cols + x];
            if (k === VIDE) continue;
            svg += `<text class="sl-chiffre" data-k="${y * cols + x}" font-size="${PAS * 0.5}"
                x="${px(x) + PAS / 2}" y="${py(y) + PAS / 2}">${k}</text>`;
        }

        // Chaque segment : une croix (cachée), le trait, et une zone de touche
        // large — au doigt, viser trois pixels de ligne est impossible.
        const segment = (type, i, x1, y1, x2, y2) => {
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, r = PAS * 0.11;
            const large = type === 'h' ? PAS * 0.44 : PAS * 0.44;
            const [rx, ry, rw, rh] = type === 'h'
                ? [x1 + 4, my - large, PAS - 8, large * 2]
                : [mx - large, y1 + 4, large * 2, PAS - 8];
            return `<g data-seg="${type}${i}">
                <rect class="sl-clic" data-type="${type}" data-i="${i}"
                    x="${rx}" y="${ry}" width="${rw}" height="${rh}"></rect>
                <!-- Le retrait de trois unités se prend DANS LE SENS DU SEGMENT :
                     appliqué sur x aux deux bouts d'un segment vertical, il
                     rentrait le haut vers la droite et le bas vers la gauche —
                     et le trait penchait. -->
                <line class="sl-arete" data-arete
                    x1="${type === 'h' ? x1 + 3 : x1}" y1="${type === 'h' ? y1 : y1 + 3}"
                    x2="${type === 'h' ? x2 - 3 : x2}" y2="${type === 'h' ? y2 : y2 - 3}"></line>
                <path class="sl-croix" data-croix
                    d="M ${mx - r} ${my - r} L ${mx + r} ${my + r} M ${mx + r} ${my - r} L ${mx - r} ${my + r}"></path>
            </g>`;
        };
        for (let y = 0; y <= lignes; y++) for (let x = 0; x < cols; x++) {
            svg += segment('h', clefH(cols, x, y), px(x), py(y), px(x + 1), py(y));
        }
        for (let y = 0; y < lignes; y++) for (let x = 0; x <= cols; x++) {
            svg += segment('v', clefV(cols, x, y), px(x), py(y), px(x), py(y + 1));
        }

        // Les points par-dessus : ce sont eux le quadrillage.
        for (let y = 0; y <= lignes; y++) for (let x = 0; x <= cols; x++) {
            svg += `<circle class="sl-point" cx="${px(x)}" cy="${py(y)}" r="${PAS * 0.075}"></circle>`;
        }
        svg += '</svg>';
        // Les proportions de la grille, pour que la feuille de style puisse la
        // borner en hauteur (voir `--sl-ratio`).
        this.plateauEl.style.setProperty('--sl-ratio', (W / H).toFixed(4));
        this.plateauEl.innerHTML = svg;
        this.svgEl = this.plateauEl.querySelector('svg');
        this.brancherGestes();
        this.rafraichir();
    }

    /**
     * LE SEGMENT VISÉ. On ne demande pas au navigateur quel élément est sous le
     * doigt : on cherche le segment dont le MILIEU est le plus proche. Sur un
     * téléphone, une grille 10×8 donne des côtés de vingt-cinq pixels, et viser
     * un rectangle de cette taille au doigt est impossible ; là, toute la bande
     * autour d'un segment le désigne, et seul le cœur d'une case ne fait rien.
     */
    segmentVise(clientX, clientY) {
        const r = this.svgEl.getBoundingClientRect();
        if (!r.width) return null;
        const { cols, lignes } = this.puzzle;
        const W = cols * PAS + 2 * MARGE;
        const ux = (clientX - r.left) / r.width * W;
        const uy = (clientY - r.top) / r.height * (lignes * PAS + 2 * MARGE);
        const cx = (ux - MARGE) / PAS, cy = (uy - MARGE) / PAS;

        let meilleur = null;
        const voir = (type, x, y, mx, my) => {
            if (x < 0 || y < 0) return;
            if (type === 'h' ? (x >= cols || y > lignes) : (x > cols || y >= lignes)) return;
            const d = Math.hypot(cx - mx, cy - my);
            if (!meilleur || d < meilleur.d) {
                meilleur = { d, type, i: type === 'h' ? clefH(cols, x, y) : clefV(cols, x, y) };
            }
        };
        // Les segments des quatre côtés de la case touchée, et de ses voisines.
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const x = Math.floor(cx) + dx, y = Math.floor(cy) + dy;
            voir('h', x, y, x + 0.5, y);
            voir('h', x, y + 1, x + 0.5, y + 1);
            voir('v', x, y, x, y + 0.5);
            voir('v', x + 1, y, x + 1, y + 0.5);
        }
        // Au-delà d'un demi-côté, l'élève ne visait aucun segment.
        return meilleur && meilleur.d <= 0.46 ? meilleur : null;
    }

    /**
     * LE GESTE : un appui bascule le segment, et le glissé continue sur les
     * suivants avec la MÊME marque. Tracer une boucle segment par segment au
     * doigt serait décourageant ; là, on suit le chemin d'un trait.
     */
    brancherGestes() {
        let marque = null;
        const poser = (vise, forcee) => {
            if (!vise) return;
            const tab = vise.type === 'h' ? this.h : this.v;
            const val = forcee === undefined ? (tab[vise.i] + 1) % 3 : forcee;
            if (tab[vise.i] === val) return;
            tab[vise.i] = val;
            this.majSegment(vise.type, vise.i);
            this.rafraichir();
        };
        this.svgEl.onpointerdown = (e) => {
            if (this.isDemo) return;
            const vise = this.segmentVise(e.clientX, e.clientY);
            if (!vise) return;
            e.preventDefault();
            // La capture garde le glissé même si le doigt sort du SVG. Elle
            // refuse un pointeur qu'elle ne connaît pas : le geste doit
            // continuer quand même, pas s'interrompre là.
            try { this.svgEl.setPointerCapture(e.pointerId); } catch { /* sans capture */ }
            const tab = vise.type === 'h' ? this.h : this.v;
            marque = (tab[vise.i] + 1) % 3;
            poser(vise, marque);
        };
        this.svgEl.onpointermove = (e) => {
            if (marque === null || this.isDemo) return;
            poser(this.segmentVise(e.clientX, e.clientY), marque);
        };
        const lacher = () => { marque = null; };
        this.svgEl.onpointerup = lacher;
        this.svgEl.onpointercancel = lacher;
        this.svgEl.onpointerleave = lacher;
    }

    majSegment(type, i) {
        const g = this.svgEl.querySelector(`[data-seg="${type}${i}"]`);
        if (!g) return;
        const val = (type === 'h' ? this.h : this.v)[i];
        g.querySelector('[data-arete]').classList.toggle('sl-arete--trait', val === 1);
        g.querySelector('[data-croix]').classList.toggle('sl-croix--vue', val === 2);
    }

    /** Les chiffres se colorent, et le message dit où en est la boucle. */
    rafraichir() {
        const { cols, lignes, indices } = this.puzzle;
        for (let y = 0; y < lignes; y++) for (let x = 0; x < cols; x++) {
            const k = indices[y * cols + x];
            if (k === VIDE) continue;
            const el = this.svgEl.querySelector(`.sl-chiffre[data-k="${y * cols + x}"]`);
            if (!el) continue;
            const c = cotesTraces(this.h, this.v, cols, x, y);
            el.classList.toggle('sl-chiffre--fait', c === k);
            el.classList.toggle('sl-chiffre--trop', c > k);
        }
    }

    effacer() {
        if (this.isDemo) return;
        this.h.fill(0); this.v.fill(0);
        this.dessiner();
        this.note('');
    }

    valider() {
        if (this.isDemo) return;
        const bilan = verifier(this.puzzle, this.h, this.v);
        if (bilan.gagne) {
            this.reussies++;
            this.note('✅ Une seule boucle fermée, et tous les chiffres comptés juste. Bravo !', 'ok');
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: `Slitherlink ${this.puzzle.cols}×${this.puzzle.lignes} (${this.puzzle.difficulte})`,
                expected: 'boucle unique', given: 'boucle unique',
                points: 14 + Math.round(this.puzzle.cols * this.puzzle.lignes / 8)
            });
            setTimeout(() => { if (this.isRunning) this.poser(); }, 2000);
            return;
        }
        // On dit CE QUI cloche, dans l'ordre où l'élève doit s'en occuper.
        let quoi;
        if (bilan.fautifs.length) {
            quoi = `${bilan.fautifs.length} chiffre${bilan.fautifs.length > 1 ? 's ont' : ' a'} `
                + 'trop de côtés tracés (ils sont en rouge).';
        } else if (bilan.boucle.croisement) {
            quoi = 'Un point porte trois segments ou plus : la boucle s\'y croiserait.';
        } else if (!bilan.boucle.total) {
            quoi = 'Rien n\'est encore tracé : commence par les chiffres extrêmes, 0 et 3.';
        } else if (!bilan.boucle.fermee) {
            quoi = 'Le tracé n\'est pas refermé : quelque part, un chemin s\'arrête en cul-de-sac.';
        } else if (!bilan.boucle.unique) {
            quoi = 'Il y a plusieurs boucles séparées, et il n\'en faut qu\'une.';
        } else {
            quoi = `Il manque des côtés à ${bilan.manquants} chiffre${bilan.manquants > 1 ? 's' : ''}.`;
        }
        this.note(`❌ ${quoi}`, 'ko');
        this.onWrongAnswer(null, {
            concept: COMPETENCE,
            questionText: `Slitherlink ${this.puzzle.cols}×${this.puzzle.lignes}`,
            input: 'tracé incomplet', expected: 'une seule boucle fermée',
            customMessage: quoi,
            silencieux: true
        });
    }

    aider() {
        if (this.isDemo) return;
        const pas = prochainPas(this.puzzle, this.h, this.v);
        if (!pas) { this.note('Tout est déjà décidé : vérifie ta grille !'); return; }
        this.aides++;
        this.note(`💡 ${pas.raison}`);
        pas.aretes.forEach(a => {
            const g = this.svgEl.querySelector(`[data-seg="${a.type}${a.i}"] [data-arete]`);
            if (!g) return;
            g.classList.add('sl-montre');
            setTimeout(() => g.classList.remove('sl-montre'), 3200);
        });
    }

    showNext() { return this.poser(); }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'sl-note' + (ton ? ` sl-note--${ton}` : '');
    }

    // --- La démonstration -----------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.puzzle) this.poser();
        if (!await cur.pause(500) || !this.isRunning) return fin();
        cur.say('Le but tient en une phrase : UNE seule boucle fermée, qui ne se croise jamais '
            + 'et ne se touche jamais. Les chiffres disent combien de côtés de leur case '
            + 'la boucle emprunte.', this.plateauEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('On ne devine jamais. On barre d\'une croix tout côté dont on est SÛR que la '
            + 'boucle ne passe pas : une croix vaut autant qu\'un trait.', this.plateauEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        // Six pas réels, chacun avec sa raison : c'est le raisonnement de
        // l'élève, pas une solution qui tombe du ciel.
        for (let k = 0; k < 6; k++) {
            const pas = prochainPas(this.puzzle, this.h, this.v);
            if (!pas) break;
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const premier = pas.aretes[0];
            const el = this.svgEl.querySelector(`[data-seg="${premier.type}${premier.i}"] .sl-clic`);
            cur.say(pas.raison, el || this.plateauEl);
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
            pas.aretes.forEach(a => {
                (a.type === 'h' ? this.h : this.v)[a.i] = pas.action === 'trait' ? 1 : 2;
                this.majSegment(a.type, a.i);
            });
            this.rafraichir();
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Et quand on cale, le bouton « Aide-moi » ne donne pas la réponse : il donne '
            + 'LA raison du pas suivant.', this.container.querySelector('[data-aide]'));
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineSlitherlink(container, isDemo, params) {
    const jeu = new Slitherlink(container, isDemo, params);
    jeu.start();
    return jeu;
}

export { tailleDe };
