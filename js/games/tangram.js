// LE TANGRAM — à l'écran.
//
// Les sept pièces sont posées à côté de la figure, à leur vraie taille, comme
// sur une table. On les prend au doigt ou à la souris, on les tourne par
// quarts de tour, et le parallélogramme — la seule pièce dont le miroir ne se
// superpose pas — se retourne. Quand une pièce arrive au bon endroit dans la
// bonne orientation, elle se cale toute seule : c'est le clic satisfaisant du
// puzzle en bois, et c'est aussi ce qui rend la victoire vérifiable.
//
// Ce n'est pas un jeu de patience déguisé : chaque pièce annonce sa fraction
// de la figure (1/4, 1/8, 1/16), et la figure terminée pose UNE question
// d'aire. Le tangram sert à voir que deux formes différentes peuvent couvrir
// la même surface — sans cela, il ne resterait qu'un joli casse-tête.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    PIECES, FIGURES, figureDe, pieceDe, retournable, boite, centre,
    sommetsPlaces, piecesPlacees, questionDe
} from '../core/tangram.js';

const COMPETENCE = 'geo.aires.tangram';
const TOLERANCE = 1.6;      // en unités du monde : le rayon du « clic » d'aimant
const MARGE = 1.2;

/** La signature de forme : les sommets vus depuis le centre, à l'ordre près. */
function signature(sommets) {
    const [cx, cy] = centre(sommets);
    return sommets.map(([x, y]) =>
        `${Math.round((x - cx) * 100)},${Math.round((y - cy) * 100)}`).sort().join(' ');
}

/** La réserve : deux rangées de pièces à leur vraie taille, sous la figure. */
const RESERVE = [
    ['grand1', 0, 0], ['grand2', 9, 0],
    ['moyen', 0, 5], ['carre', 5, 5], ['parallelo', 10, 5],
    ['petit1', 13, 5], ['petit2', 16, 5]
];
const RESERVE_L = 18, RESERVE_H = 11;

class Tangram extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'tangram');
        this.rng = makeRng(this.params.seed);
        this.montrerFractions = false;
        this.figureCourante = 0;
        this.reussies = 0;
        this.aides = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .tg-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    width: 100%; height: 100%; padding: 8px; box-sizing: border-box;
                    color: var(--text-main); overflow-y: auto; container-type: inline-size;
                }
                .tg-tete { display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
                    justify-content: center; font-size: .9rem; }
                .tg-nom { font-weight: 900; font-size: clamp(15px, 3.4cqw, 20px);
                    padding: 3px 14px; border-radius: 999px; color: #fff;
                    background: linear-gradient(135deg, #6366f1, #a855f7); }
                .tg-compte { color: var(--text-muted); font-weight: 700; }

                .tg-plateau {
                    width: 100%; max-width: min(96cqw, 560px);
                    background: var(--bg-panel); border: 2px solid var(--border);
                    border-radius: 14px; padding: 4px; box-sizing: border-box;
                    touch-action: none; user-select: none; -webkit-tap-highlight-color: transparent;
                }
                .tg-plateau svg { width: 100%; height: auto; display: block; }

                /* LA SILHOUETTE : l'ombre qu'il faut remplir. */
                .tg-ombre { fill: color-mix(in srgb, var(--text-main) 13%, transparent);
                    stroke: var(--text-main); stroke-width: .18; stroke-linejoin: round; }
                .tg-tapis { fill: color-mix(in srgb, var(--text-main) 5%, transparent);
                    stroke: color-mix(in srgb, var(--text-main) 18%, transparent);
                    stroke-width: .1; stroke-dasharray: .6 .5; }

                .tg-piece { stroke: rgba(0,0,0,.45); stroke-width: .14; stroke-linejoin: round;
                    cursor: grab; }
                .tg-piece--prise { cursor: grabbing; filter: brightness(1.12) drop-shadow(0 .3px .6px rgba(0,0,0,.5)); }
                .tg-piece--posee { cursor: default; }
                .tg-piece--choisie { stroke: var(--primary, #4f46e5); stroke-width: .32; }
                .tg-piece--montre { animation: tg-clignote .9s ease 3; }
                @keyframes tg-clignote { 50% { filter: brightness(1.6); } }
                /* Le calage : la pièce se pose avec un petit rebond. */
                .tg-piece--cale { animation: tg-cale .32s ease; }
                @keyframes tg-cale { 40% { transform: scale(1.06); } }

                .tg-barre { display: flex; gap: 7px; flex-wrap: wrap; justify-content: center; }
                .tg-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700; padding: 7px 12px;
                }
                .tg-btn:disabled { opacity: .4; cursor: default; }
                .tg-btn--fort { border-color: var(--primary); background: var(--primary); color: #fff; }
                .tg-note { min-height: 2.4em; text-align: center; font-size: .87rem;
                    color: var(--text-muted); max-width: 620px; }
                .tg-note--ok { color: var(--success, #16a34a); font-weight: 700; }
                .tg-note--ko { color: var(--danger, #dc2626); font-weight: 600; }

                /* LA QUESTION D'AIRE, une fois la figure montée. */
                .tg-question { display: none; flex-direction: column; gap: 8px; align-items: center;
                    max-width: 560px; text-align: center; }
                .tg-question--vue { display: flex; }
                .tg-enonce { font-weight: 800; font-size: .96rem; }
                .tg-choix { display: flex; gap: 7px; flex-wrap: wrap; justify-content: center; }
                .tg-choix button {
                    border: 2px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 10px; cursor: pointer; font: inherit; font-weight: 700; padding: 8px 14px;
                }
                .tg-choix button:hover { border-color: var(--primary); }
                .tg-choix button.tg-juste { border-color: var(--success, #16a34a);
                    background: color-mix(in srgb, var(--success, #16a34a) 16%, var(--bg-panel)); }
                .tg-choix button.tg-faux { border-color: var(--danger, #dc2626);
                    background: color-mix(in srgb, var(--danger, #dc2626) 14%, var(--bg-panel)); }

                @container (max-width: 430px) {
                    .tg-btn { padding: 6px 9px; font-size: .84rem; }
                    .tg-tete { font-size: .82rem; }
                }
            </style>
            <div class="tg-wrap">
                <div class="tg-tete">
                    <span class="tg-nom" data-nom></span>
                    <span class="tg-compte" data-compte></span>
                </div>
                <div class="tg-plateau" data-plateau></div>
                <div class="tg-barre">
                    <button type="button" class="tg-btn" data-tourner>↻ Tourner</button>
                    <button type="button" class="tg-btn" data-retourner>⇄ Retourner</button>
                    <button type="button" class="tg-btn" data-aide>💡 Aide-moi</button>
                    <button type="button" class="tg-btn" data-recommencer>↺ Recommencer</button>
                    <button type="button" class="tg-btn" data-suivante>Autre figure</button>
                </div>
                <div class="tg-question" data-question>
                    <div class="tg-enonce" data-enonce></div>
                    <div class="tg-choix" data-choix></div>
                </div>
                <div class="tg-note" data-note></div>
            </div>`;
        this.plateauEl = this.container.querySelector('[data-plateau]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.questionEl = this.container.querySelector('[data-question]');
        this.container.querySelector('[data-tourner]').onclick = () => this.tournerChoisie();
        this.container.querySelector('[data-retourner]').onclick = () => this.retournerChoisie();
        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.container.querySelector('[data-recommencer]').onclick = () => this.poser(this.figureCourante);
        this.container.querySelector('[data-suivante]').onclick = () => this.showNext();

        // Le clavier double les boutons : R pour tourner, F pour retourner.
        this.surTouche = (e) => {
            if (this.isDemo || !this.isRunning || !this.choisie) return;
            if (e.key === 'r' || e.key === 'R') { e.preventDefault(); this.tournerChoisie(); }
            if (e.key === 'f' || e.key === 'F') { e.preventDefault(); this.retournerChoisie(); }
        };
        document.addEventListener('keydown', this.surTouche);
    }

    startGameLoop() { this.poser(0); }

    poser(index) {
        this.figureCourante = ((index % FIGURES.length) + FIGURES.length) % FIGURES.length;
        this.figure = FIGURES[this.figureCourante];
        this.finie = false;
        this.choisie = null;

        // Les emplacements à remplir, avec leur signature de forme : une pièce
        // se cale dans N'IMPORTE quel emplacement de même forme, ce qui permet
        // d'échanger les deux grands triangles sans que le jeu s'en offusque.
        this.slots = piecesPlacees(this.figure).map(p => {
            const [cx, cy] = centre(p.sommets);
            return { sig: signature(p.sommets), cx, cy, sommets: p.sommets, pris: false };
        });

        // Les pièces, posées dans la réserve sous la figure.
        const b = boite(this.figure.silhouette);
        this.hFigure = b.y1 - b.y0;
        this.lFigure = b.x1 - b.x0;
        // La réserve est plus large que la plupart des figures : c'est elle qui
        // fixe la largeur du monde, et la figure se centre dedans — sinon un
        // carré resterait collé à gauche avec le vide à sa droite.
        this.mondeL = Math.max(this.lFigure, RESERVE_L) + 2 * MARGE;
        this.decalageFigure = [(this.mondeL - this.lFigure) / 2 - b.x0, MARGE - b.y0];
        const yReserve = MARGE + this.hFigure + 2.2;
        this.mondeH = yReserve + RESERVE_H + MARGE;
        const xReserve = (this.mondeL - RESERVE_L) / 2;

        this.pieces = RESERVE.map(([id, rx, ry]) => ({
            id, quarts: 0, flip: 0,
            dx: xReserve + rx, dy: yReserve + ry,
            posee: false
        }));

        this.container.querySelector('[data-nom]').textContent = this.figure.nom;
        this.dessiner();
        this.majCompte();
        this.cacherQuestion();
        this.note(this.figure.indice);
        return true;
    }

    // --- Le dessin ------------------------------------------------------------

    /** Les sommets d'une pièce, dans le monde du plateau. */
    sommetsDe(p) {
        return sommetsPlaces(p.id, p.quarts, p.flip, p.dx, p.dy);
    }

    /** La silhouette et les traits de découpe, décalés dans le monde. */
    figureDecalee(poly) {
        const [ox, oy] = this.decalageFigure;
        return poly.map(([x, y]) => [x + ox, y + oy]);
    }

    dessiner() {
        const pts = (poly) => poly.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ');
        let svg = `<svg viewBox="0 0 ${this.mondeL.toFixed(2)} ${this.mondeH.toFixed(2)}"
            role="img" aria-label="Tangram : ${this.figure.nom}">`;

        // Le tapis de la réserve : on voit d'un coup d'œil ce qui reste à poser.
        const yR = MARGE + this.hFigure + 1.6;
        svg += `<rect class="tg-tapis" x="${(this.mondeL - RESERVE_L) / 2 - 1}" y="${yR}"
            width="${RESERVE_L + 2}" height="${RESERVE_H + 1.2}" rx="1"></rect>`;

        svg += `<polygon class="tg-ombre" points="${pts(this.figureDecalee(this.figure.silhouette))}"></polygon>`;

        for (const p of this.pieces) {
            svg += this.svgPiece(p);
        }
        svg += '</svg>';
        this.plateauEl.innerHTML = svg;
        this.svgEl = this.plateauEl.querySelector('svg');
        this.brancherGestes();
    }

    svgPiece(p) {
        const def = pieceDe(p.id);
        const som = this.sommetsDe(p);
        const pts = som.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ');
        return `<g data-piece="${p.id}">
            <polygon class="tg-piece${p.posee ? ' tg-piece--posee' : ''}" points="${pts}"
                fill="${def.couleur}"></polygon>
        </g>`;
    }

    majPiece(p) {
        const g = this.svgEl.querySelector(`[data-piece="${p.id}"]`);
        if (!g) return;
        const som = this.sommetsDe(p);
        const poly = g.querySelector('polygon');
        poly.setAttribute('points', som.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' '));
        poly.classList.toggle('tg-piece--posee', p.posee);
        poly.classList.toggle('tg-piece--choisie', this.choisie === p.id && !p.posee);
        // Une pièce posée passe SOUS les autres : on ne la déplace plus.
        if (p.posee && g.parentNode.firstElementChild !== g) {
            const apres = [...g.parentNode.children].find(e => e.tagName !== 'rect' && e.tagName !== 'polygon');
            g.parentNode.insertBefore(g, apres || null);
        }
    }

    // --- Le geste -------------------------------------------------------------

    /** Le point du pointeur, converti dans les coordonnées du dessin. */
    versMonde(e) {
        const r = this.svgEl.getBoundingClientRect();
        return [(e.clientX - r.left) / r.width * this.mondeL,
            (e.clientY - r.top) / r.height * this.mondeH];
    }

    brancherGestes() {
        let prise = null;
        this.svgEl.onpointerdown = (e) => {
            if (this.isDemo || this.finie) return;
            const g = e.target.closest('[data-piece]');
            if (!g) { this.choisir(null); return; }
            const p = this.pieces.find(x => x.id === g.dataset.piece);
            if (!p || p.posee) return;
            e.preventDefault();
            try { this.svgEl.setPointerCapture(e.pointerId); } catch { /* sans capture */ }
            const [mx, my] = this.versMonde(e);
            prise = { p, ox: p.dx - mx, oy: p.dy - my, x0: e.clientX, y0: e.clientY, bouge: false };
            g.querySelector('polygon').classList.add('tg-piece--prise');
            this.choisir(p.id);
            // La pièce prise passe au-dessus des autres.
            g.parentNode.appendChild(g);
        };
        this.svgEl.onpointermove = (e) => {
            if (!prise) return;
            if (Math.hypot(e.clientX - prise.x0, e.clientY - prise.y0) > 4) prise.bouge = true;
            const [mx, my] = this.versMonde(e);
            prise.p.dx = mx + prise.ox;
            prise.p.dy = my + prise.oy;
            this.majPiece(prise.p);
        };
        const lacher = () => {
            if (!prise) return;
            const { p, bouge } = prise;
            prise = null;
            this.svgEl.querySelector(`[data-piece="${p.id}"] polygon`)
                ?.classList.remove('tg-piece--prise');
            if (bouge) this.deposer(p);
            else this.majPiece(p);
        };
        this.svgEl.onpointerup = lacher;
        this.svgEl.onpointercancel = lacher;
    }

    choisir(id) {
        this.choisie = id;
        this.pieces.forEach(p => this.majPiece(p));
        const bouton = this.container.querySelector('[data-retourner]');
        bouton.disabled = !id || !retournable(id);
    }

    /**
     * On lâche la pièce : si elle tombe assez près d'un emplacement de MÊME
     * FORME, elle s'y cale. Sinon elle reste où on l'a posée — un tangram se
     * joue en essayant, pas en devinant.
     */
    deposer(p) {
        const som = this.sommetsDe(p);
        const sig = signature(som);
        const [cx, cy] = centre(som);
        const [ox, oy] = this.decalageFigure;
        const cible = this.slots
            .filter(s => !s.pris && s.sig === sig)
            .map(s => ({ s, d: Math.hypot(s.cx + ox - cx, s.cy + oy - cy) }))
            .sort((a, b) => a.d - b.d)[0];

        if (cible && cible.d <= TOLERANCE) {
            p.dx += cible.s.cx + ox - cx;
            p.dy += cible.s.cy + oy - cy;
            p.posee = true;
            cible.s.pris = true;
            this.choisie = null;
            this.majPiece(p);
            const poly = this.svgEl.querySelector(`[data-piece="${p.id}"] polygon`);
            poly?.classList.remove('tg-piece--cale');
            void poly?.getBoundingClientRect();
            poly?.classList.add('tg-piece--cale');
            this.majCompte();
            if (this.pieces.every(x => x.posee)) return this.gagne();
            this.note('');
            return;
        }
        // Rien à cette place : on garde la pièce dans le cadre.
        p.dx = Math.max(-2, Math.min(this.mondeL + 2, p.dx));
        p.dy = Math.max(-2, Math.min(this.mondeH + 2, p.dy));
        this.majPiece(p);
        if (cible && cible.d <= TOLERANCE * 2.6) {
            this.note('Tu y es presque : approche encore, ou tourne la pièce.');
        }
    }

    tournerChoisie() {
        const p = this.pieces.find(x => x.id === this.choisie);
        if (!p || p.posee || this.isDemo) {
            if (!p) this.note('Touche d\'abord une pièce, puis tourne-la.');
            return;
        }
        this.tourner(p);
    }

    /** On tourne AUTOUR DU CENTRE : la pièce ne s'échappe pas sous le doigt. */
    tourner(p) {
        const [ax, ay] = centre(this.sommetsDe(p));
        p.quarts = (p.quarts + 1) % 4;
        const [bx, by] = centre(this.sommetsDe(p));
        p.dx += ax - bx; p.dy += ay - by;
        this.majPiece(p);
    }

    retournerChoisie() {
        const p = this.pieces.find(x => x.id === this.choisie);
        if (!p || p.posee || this.isDemo) return;
        if (!retournable(p.id)) {
            this.note('Cette pièce est la même dans un miroir : la retourner ne changerait rien. '
                + 'Seul le parallélogramme a besoin d\'être retourné.');
            return;
        }
        const [ax, ay] = centre(this.sommetsDe(p));
        p.flip = p.flip ? 0 : 1;
        const [bx, by] = centre(this.sommetsDe(p));
        p.dx += ax - bx; p.dy += ay - by;
        this.majPiece(p);
    }

    aider() {
        if (this.isDemo || this.finie) return;
        const p = this.pieces.find(x => !x.posee);
        if (!p) return;
        this.aides++;
        // On cherche un emplacement libre que cette pièce peut occuper, puis on
        // l'y met : l'élève voit le geste au lieu de le deviner.
        const emplacement = this.slots.find(s => !s.pris
            && this.orientationsPossibles(p.id).some(o => o.sig === s.sig));
        if (!emplacement) return;
        const o = this.orientationsPossibles(p.id).find(x => x.sig === emplacement.sig);
        p.quarts = o.quarts; p.flip = o.flip;
        const [cx, cy] = centre(this.sommetsDe(p));
        const [ox, oy] = this.decalageFigure;
        p.dx += emplacement.cx + ox - cx;
        p.dy += emplacement.cy + oy - cy;
        p.posee = true;
        emplacement.pris = true;
        this.majPiece(p);
        this.majCompte();
        const poly = this.svgEl.querySelector(`[data-piece="${p.id}"] polygon`);
        poly?.classList.add('tg-piece--montre');
        setTimeout(() => poly?.classList.remove('tg-piece--montre'), 2800);
        this.note(`Je place ${pieceDe(p.id).nom.toLowerCase()} : regarde son orientation, `
            + 'c\'est presque toujours elle qui bloque.');
        if (this.pieces.every(x => x.posee)) this.gagne();
    }

    /** Les huit poses d'une pièce, avec la forme obtenue. */
    orientationsPossibles(id) {
        const out = [];
        for (const flip of retournable(id) ? [0, 1] : [0]) {
            for (let q = 0; q < 4; q++) {
                out.push({ quarts: q, flip, sig: signature(sommetsPlaces(id, q, flip, 0, 0)) });
            }
        }
        return out;
    }

    majCompte() {
        const posees = this.pieces.filter(p => p.posee).length;
        this.container.querySelector('[data-compte]').textContent =
            `${posees} / 7 pièces · figure ${this.figureCourante + 1} sur ${FIGURES.length}`;
    }

    // --- La question d'aire ----------------------------------------------------

    gagne() {
        this.finie = true;
        this.reussies++;
        this.note('🎉 La figure est montée ! Une question avant la suivante.', 'ok');
        this.poserQuestion();
    }

    poserQuestion() {
        const q = questionDe(this.rng);
        this.question = q;
        this.questionEl.classList.add('tg-question--vue');
        this.container.querySelector('[data-enonce]').textContent = q.texte;
        const choixEl = this.container.querySelector('[data-choix]');
        choixEl.innerHTML = this.rng.shuffle([...q.choix])
            .map(c => `<button type="button" data-rep="${c}">${c}</button>`).join('');
        choixEl.querySelectorAll('[data-rep]').forEach(b => {
            b.onclick = () => this.repondre(b, b.dataset.rep);
        });
    }

    repondre(bouton, valeur) {
        if (!this.question) return;
        const q = this.question;
        this.question = null;
        const juste = valeur === q.reponse;
        bouton.classList.add(juste ? 'tg-juste' : 'tg-faux');
        this.container.querySelectorAll('[data-rep]').forEach(b => { b.onclick = null; });
        if (!juste) {
            this.container.querySelector(`[data-rep="${CSS.escape(q.reponse)}"]`)
                ?.classList.add('tg-juste');
        }
        this.note(`${juste ? '✅' : '❌'} ${q.explication}`, juste ? 'ok' : 'ko');
        if (juste) {
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: q.texte, expected: q.reponse, given: valeur,
                points: 12 + this.figureCourante * 2
            });
        } else {
            this.onWrongAnswer(null, {
                concept: COMPETENCE, questionText: q.texte,
                input: valeur, expected: q.reponse, customMessage: q.explication
            });
        }
        setTimeout(() => { if (this.isRunning) this.showNext(); }, 3200);
    }

    cacherQuestion() {
        this.question = null;
        this.questionEl.classList.remove('tg-question--vue');
        this.container.querySelector('[data-choix]').innerHTML = '';
    }

    showNext() { return this.poser(this.figureCourante + 1); }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'tg-note' + (ton ? ` tg-note--${ton}` : '');
    }

    // --- La démonstration ------------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.figure) this.poser(0);
        if (!await cur.pause(500) || !this.isRunning) return fin();
        cur.say('Sept pièces, et toujours les mêmes : deux grands triangles, un moyen, deux petits, '
            + 'un carré et un parallélogramme. Elles remplissent la figure EXACTEMENT, '
            + 'sans trou ni chevauchement.', this.plateauEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Retiens leurs parts, la question de la fin les demande : 1/4 pour un grand '
            + 'triangle, 1/8 pour le carré, 1/16 pour un petit. Le carré et le triangle moyen ont '
            + 'la MÊME aire — des formes différentes, une même surface.', this.plateauEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        // Le robot pose quatre pièces, en disant à chaque fois ce qui compte.
        for (let k = 0; k < 4; k++) {
            const p = this.pieces.find(x => !x.posee);
            if (!p) break;
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const g = this.svgEl.querySelector(`[data-piece="${p.id}"]`);
            cur.say(k === 0
                ? 'Je commence par les grandes pièces : ce sont elles qui décident de tout le reste.'
                : `${pieceDe(p.id).nom} : je le tourne d'abord, PUIS je le pose. `
                    + 'Neuf fois sur dix, une pièce qui ne rentre pas est simplement mal tournée.',
            g || this.plateauEl);
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
            const memoire = this.isDemo;
            this.isDemo = false;      // l'aide est le geste que le robot montre
            this.aider();
            this.isDemo = memoire;
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('À toi : prends une pièce, tourne-la avec ↻, et approche-la du bon endroit — '
            + 'elle se cale toute seule. Seul le parallélogramme se retourne avec ⇄.',
        this.container.querySelector('[data-tourner]'));
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        if (this.surTouche) { document.removeEventListener('keydown', this.surTouche); this.surTouche = null; }
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineTangram(container, isDemo, params) {
    const jeu = new Tangram(container, isDemo, params);
    jeu.start();
    return jeu;
}

export { PIECES, FIGURES };
