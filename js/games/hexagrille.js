// L'HEXAGRILLE — à l'écran.
//
// Neuf hexagones en losange, les chiffres de 1 à 9 posés une seule fois, et
// des flèches au bord qui donnent la somme de la file qu'elles désignent.
//
// LES CHIFFRES SONT DES JETONS. Comme au carré magique : on prend, on pose, on
// déplace. Pas de faute de frappe, et surtout on VOIT ce qui reste à placer —
// la réserve qui se vide est la moitié du raisonnement, puisque le dernier
// chiffre restant est souvent celui qui débloque tout.
//
// CHAQUE FLÈCHE DIT OÙ ELLE EN EST. Tant qu'une file est incomplète, sa somme
// courante s'écrit à côté de la somme visée ; dès qu'elle est complète et
// juste, la flèche passe au vert. C'est ce retour-là qui remplace le professeur
// qui passe dans les rangs : l'élève sait tout de suite si sa file est bonne,
// sans qu'on lui dise si sa GRILLE l'est.
//
// L'aide ne donne jamais un chiffre nu : elle montre la file où il ne manque
// qu'une case, et la soustraction qui la comble. C'est la méthode, pas la
// réponse.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import { CSS_GLISSER, rendreGlissable } from '../core/glisserDeposer.js';
import {
    CASES, genererHexagrille, estResolue, prochainCoup, filesJustes
} from '../core/hexagrille.js';

const COMPETENCE = 'num.logique.hexagrille';

// La géométrie du dessin, en unités du viewBox. Un hexagone à sommet plat :
// large de 2 R, haut de √3 R, et les colonnes se chevauchent d'un quart.
const R = 30;
const HAUT = Math.sqrt(3) * R;
const PAS_X = 1.5 * R;

// L'ORIGINE LAISSE LA PLACE AUX ÉTIQUETTES. Les sommes se posent en dehors du
// losange — au-dessus pour les colonnes, à gauche pour les descentes et les
// montées : sans cette marge, la somme de la première colonne sortait par le
// haut du dessin, et celle de la première descente venait se poser dessus.
const ORIG_X = 100;
const ORIG_Y = 80;
// CHAQUE FAMILLE A SON RECUL. Deux files qui partent de la MÊME case — la
// descente et la montée s'y croisent — poseraient sinon leurs étiquettes à
// quarante pixels l'une de l'autre, et la ligne « déjà 13 » de la première
// viendrait toucher la somme de la seconde. En éloignant les montées, on écarte
// les deux couronnes d'étiquettes sans toucher au losange.
const RECUL = { 'bas': R + 50, 'bas-droite': R + 52, 'haut-droite': R + 84 };

/** Le centre du dessin pour la case (c, r). */
const centre = (c, r) => ({
    x: ORIG_X + c * PAS_X,
    y: ORIG_Y + (r + c / 2) * HAUT
});

/**
 * Où se pose la flèche d'une file : le vecteur qui la parcourt, et le point de
 * départ de son étiquette — TOUJOURS en amont de la première case, jamais
 * entre deux hexagones.
 */
function repereFleche(f) {
    const a = centre(CASES[f.cases[0]].c, CASES[f.cases[0]].r);
    const b = centre(CASES[f.cases[f.cases.length - 1]].c, CASES[f.cases[f.cases.length - 1]].r);
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const ux = (b.x - a.x) / d, uy = (b.y - a.y) / d;
    const recul = RECUL[f.sens] || R + 52;
    return {
        ux, uy,
        // Le trait : un segment court juste avant la première case, posé sur
        // la même couronne que son étiquette — sinon les deux flèches qui
        // partent d'une même case se croisent la pointe.
        x1: a.x - ux * (recul - 26), y1: a.y - uy * (recul - 26),
        x2: a.x - ux * (recul - 42), y2: a.y - uy * (recul - 42),
        // L'étiquette, encore un peu plus loin sur la même ligne.
        ex: a.x - ux * recul, ey: a.y - uy * recul
    };
}

/** Le contour d'un hexagone à sommet plat, centré à l'origine. */
const CONTOUR = Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 180) * (60 * k);
    return `${(R * Math.cos(a)).toFixed(2)},${(R * Math.sin(a)).toFixed(2)}`;
}).join(' ');

class Hexagrille extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'hexagrille');
        this.rng = makeRng(this.params.seed);
        this.niveau = ['facile', 'moyen', 'difficile'].includes(this.params.niveau)
            ? this.params.niveau : 'facile';
        this.reussies = 0;
        this.aides = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                ${CSS_GLISSER}
                .hx-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 10px;
                    width: 100%; height: 100%; padding: 8px; box-sizing: border-box;
                    color: var(--text-main); overflow-y: auto; container-type: size;
                    user-select: none; -webkit-user-select: none;
                }
                .hx-tete {
                    display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
                    justify-content: center; font-size: .9rem; flex: 0 0 auto;
                }
                .hx-compte { color: var(--text-muted); font-weight: 700; }
                .hx-plateau {
                    flex: 1 1 auto; min-height: 0; width: 100%;
                    display: flex; align-items: center; justify-content: center;
                }
                .hx-svg { width: min(100%, 460px); height: auto; max-height: 100%; touch-action: none; }

                /* UNE CASE DONNÉE EST IMPRIMÉE : fond plein, on n'y touche pas.
                   Une case à trouver est un creux clair. */
                .hx-cell { fill: var(--bg-panel); stroke: var(--border); stroke-width: 1.6; }
                .hx-cell--donnee { fill: color-mix(in srgb, var(--text-main) 14%, transparent); }
                .hx-cell--vide { stroke-dasharray: 4 3; }
                .hx-cell--survol { stroke: var(--primary); stroke-width: 3; }
                .hx-nb {
                    font-weight: 900; font-size: 25px; text-anchor: middle;
                    dominant-baseline: central; pointer-events: none;
                }
                .hx-nb--donnee { fill: var(--text-muted); }
                .hx-nb--pose { fill: var(--primary); }

                /* LES FLÈCHES. Le trait porte la direction, l'étiquette la
                   somme visée — et, tant que la file n'est pas finie, ce qu'on
                   a déjà mis dedans. */
                .hx-fleche { stroke: var(--text-muted); stroke-width: 2.2; fill: none; }
                .hx-fleche--juste { stroke: var(--success, #16a34a); }
                .hx-pointe { fill: var(--text-muted); }
                .hx-pointe--juste { fill: var(--success, #16a34a); }
                .hx-somme {
                    font-weight: 900; font-size: 19px; fill: var(--text-main);
                    text-anchor: middle; dominant-baseline: central;
                }
                .hx-somme--juste { fill: var(--success, #16a34a); }
                .hx-encours { font-size: 13px; fill: var(--text-muted); text-anchor: middle; }
                .hx-cible { fill: transparent; cursor: pointer; }

                /* LA RÉSERVE. Ce qui reste à placer, en toutes lettres : le
                   dernier chiffre disponible débloque souvent la grille. */
                .hx-reserve {
                    display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;
                    flex: 0 0 auto; min-height: 44px;
                }
                .hx-jeton {
                    width: clamp(34px, 9cqw, 46px); height: clamp(34px, 9cqw, 46px);
                    border-radius: 50%; border: 2px solid var(--primary);
                    background: var(--bg-panel); color: var(--primary);
                    font: inherit; font-weight: 900; font-size: clamp(15px, 4cqw, 21px);
                    display: flex; align-items: center; justify-content: center;
                    cursor: grab; -webkit-tap-highlight-color: transparent;
                }
                .hx-jeton--choisi {
                    background: var(--primary); color: #fff;
                    box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 30%, transparent);
                }
                .hx-barre { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; flex: 0 0 auto; }
                .hx-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700; padding: 7px 12px;
                }
                .hx-btn:hover { background: var(--bg-hover); }
                .hx-note {
                    min-height: 2.4em; text-align: center; font-size: .88rem;
                    color: var(--text-muted); max-width: 620px; flex: 0 0 auto;
                }
                .hx-note--ok { color: var(--success, #16a34a); font-weight: 700; }
                .hx-note--ko { color: var(--danger, #dc2626); font-weight: 600; }
                .hx-note b { color: var(--text-main); }

                @container (max-width: 430px) {
                    .hx-btn { padding: 5px 9px; font-size: .82rem; }
                    .hx-note { min-height: 0; font-size: .8rem; }
                    .hx-wrap { gap: 6px; padding: 5px; }
                }
            </style>
            <div class="hx-wrap">
                <div class="hx-tete">
                    <span>Place les chiffres de <b>1 à 9</b></span>
                    <span class="hx-compte" data-compte></span>
                </div>
                <div class="hx-plateau" data-plateau></div>
                <div class="hx-reserve" data-reserve></div>
                <div class="hx-barre">
                    <button type="button" class="hx-btn" data-aide>💡 Aide-moi</button>
                    <button type="button" class="hx-btn" data-effacer>↺ Recommencer</button>
                    <button type="button" class="hx-btn" data-neuf>Autre grille</button>
                </div>
                <p class="hx-note" data-note></p>
            </div>`;

        this.plateauEl = this.container.querySelector('[data-plateau]');
        this.reserveEl = this.container.querySelector('[data-reserve]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.compteEl = this.container.querySelector('[data-compte]');
        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.container.querySelector('[data-effacer]').onclick = () => this.recommencer();
        this.container.querySelector('[data-neuf]').onclick = () => this.poser();
    }

    startGameLoop() { this.poser(); }

    // --- Une grille ----------------------------------------------------------

    poser() {
        this.puzzle = genererHexagrille(this.rng, { niveau: this.niveau });
        this.saisie = this.puzzle.donnees.slice();
        this.choisi = null;
        this.finie = false;
        this.dessiner();
        this.note('Chaque flèche donne la somme de sa file. Cherche une file où il ne manque '
            + 'qu\'UNE case : c\'est une soustraction, et elle en débloque d\'autres.');
        return true;
    }

    recommencer() {
        if (!this.puzzle) return;
        this.saisie = this.puzzle.donnees.slice();
        this.choisi = null;
        this.finie = false;
        this.dessiner();
        this.note('On repart de zéro.');
    }

    // --- Le dessin -----------------------------------------------------------

    dessiner() {
        const P = this.puzzle;
        const justes = new Set(filesJustes(this.saisie, P.fleches));

        // Les hexagones, puis les flèches, puis les cibles du doigt par-dessus.
        const cells = CASES.map(({ c, r, i }) => {
            const { x, y } = centre(c, r);
            const donnee = P.donnees[i] !== 0;
            const v = this.saisie[i];
            return `<g transform="translate(${x.toFixed(1)}, ${y.toFixed(1)})">
                <polygon class="hx-cell${donnee ? ' hx-cell--donnee' : v ? '' : ' hx-cell--vide'}"
                         data-cell="${i}" points="${CONTOUR}"></polygon>
                ${v ? `<text class="hx-nb ${donnee ? 'hx-nb--donnee' : 'hx-nb--pose'}">${v}</text>` : ''}
            </g>`;
        }).join('');

        const fleches = P.fleches.map(f => this.fleche(f, justes.has(f.id))).join('');

        // LE CADRE SE CALCULE, il ne se devine pas : on prend l'enveloppe des
        // hexagones ET des étiquettes, avec une marge. Une constante écrite à
        // la main laissait sortir la somme de la première colonne dès qu'elle
        // passait à deux chiffres.
        const points = [];
        CASES.forEach(({ c, r }) => {
            const { x, y } = centre(c, r);
            points.push([x - R, y - HAUT / 2], [x + R, y + HAUT / 2]);
        });
        P.fleches.forEach(f => {
            const p = repereFleche(f);
            points.push([p.ex - 22, p.ey - 14], [p.ex + 22, p.ey + 26]);
        });
        const minX = Math.min(...points.map(p => p[0])) - 6;
        const minY = Math.min(...points.map(p => p[1])) - 6;
        const W = Math.max(...points.map(p => p[0])) - minX + 6;
        const H = Math.max(...points.map(p => p[1])) - minY + 6;
        this.plateauEl.innerHTML = `
            <svg class="hx-svg" viewBox="${minX.toFixed(0)} ${minY.toFixed(0)} ${W.toFixed(0)} ${H.toFixed(0)}"
                 role="img" aria-label="Hexagrille de neuf cases">
                <defs>
                    <!-- Deux pointes plutôt qu'une : un marqueur ne reprend pas
                         la couleur du trait qui l'appelle, et une flèche verte
                         terminée par une pointe grise se lit « à moitié faite ». -->
                    <marker id="hx-pointe" viewBox="0 0 10 10" refX="8" refY="5"
                            markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" class="hx-pointe"/>
                    </marker>
                    <marker id="hx-pointe-ok" viewBox="0 0 10 10" refX="8" refY="5"
                            markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" class="hx-pointe hx-pointe--juste"/>
                    </marker>
                </defs>
                ${cells}${fleches}
            </svg>`;

        this.plateauEl.querySelectorAll('[data-cell]').forEach(el => {
            el.style.cursor = P.donnees[Number(el.dataset.cell)] ? 'default' : 'pointer';
            el.addEventListener('click', () => this.toucherCase(Number(el.dataset.cell)));
        });

        this.dessinerReserve();
        this.compteEl.textContent = `${this.reussies} grille${this.reussies > 1 ? 's' : ''} réussie${this.reussies > 1 ? 's' : ''}`;
    }

    /** Une flèche : le trait qui entre dans la file, et sa somme en amont. */
    fleche(f, juste) {
        const p = repereFleche(f);
        const pose = f.cases.reduce((t, i) => t + (this.saisie[i] || 0), 0);
        const complete = f.cases.every(i => this.saisie[i]);
        // « déjà 8 » : le total courant de la file, tant qu'elle n'est pas
        // finie. C'est ce qui permet de faire la soustraction sans réadditionner
        // à chaque fois ce qu'on vient de poser.
        const encours = !complete && pose > 0
            ? `<text class="hx-encours" x="${p.ex.toFixed(1)}" y="${(p.ey + 17).toFixed(1)}">déjà ${pose}</text>` : '';

        return `<g>
            <line class="hx-fleche${juste ? ' hx-fleche--juste' : ''}"
                  x1="${p.x1.toFixed(1)}" y1="${p.y1.toFixed(1)}"
                  x2="${p.x2.toFixed(1)}" y2="${p.y2.toFixed(1)}"
                  marker-end="url(#hx-pointe${juste ? '-ok' : ''})"></line>
            <text class="hx-somme${juste ? ' hx-somme--juste' : ''}"
                  x="${p.ex.toFixed(1)}" y="${p.ey.toFixed(1)}">${f.somme}</text>
            ${encours}
        </g>`;
    }

    dessinerReserve() {
        const places = new Set(this.saisie.filter(v => v));
        const restants = [];
        for (let v = 1; v <= 9; v++) if (!places.has(v)) restants.push(v);
        this.reserveEl.innerHTML = restants.map(v =>
            `<button type="button" class="hx-jeton${this.choisi === v ? ' hx-jeton--choisi' : ''}"
                     data-jeton="${v}">${v}</button>`).join('');
        this.reserveEl.querySelectorAll('[data-jeton]').forEach(b => {
            const v = Number(b.dataset.jeton);
            b.onclick = () => { this.choisi = this.choisi === v ? null : v; this.dessinerReserve(); };
            rendreGlissable(b, {
                cibles: '[data-cell]',
                deposer: (cible) => this.deposer(Number(cible.dataset.cell), v),
                zoneRetour: this.reserveEl,
                actif: () => !this.isDemo && !this.finie
            });
        });
    }

    // --- Jouer ---------------------------------------------------------------

    toucherCase(i) {
        if (this.isDemo || this.finie) return;
        if (this.puzzle.donnees[i]) return;           // une case donnée ne bouge pas
        if (this.saisie[i]) {                          // on reprend le chiffre posé
            this.saisie[i] = 0;
            this.choisi = null;
            this.dessiner();
            return;
        }
        if (this.choisi == null) { this.note('Choisis d\'abord un chiffre dans la réserve.'); return; }
        this.deposer(i, this.choisi);
    }

    deposer(i, v) {
        if (this.isDemo || this.finie) return;
        if (this.puzzle.donnees[i]) return;
        // Un chiffre déjà posé ailleurs se DÉPLACE : il n'existe qu'en un
        // exemplaire, et l'élève doit pouvoir se raviser sans tout défaire.
        const ancien = this.saisie.indexOf(v);
        if (ancien >= 0) this.saisie[ancien] = 0;
        this.saisie[i] = v;
        this.choisi = null;
        this.dessiner();
        this.verifier();
    }

    verifier() {
        if (!estResolue(this.saisie, this.puzzle)) {
            const restants = 9 - this.saisie.filter(v => v).length;
            if (restants === 0) {
                this.note('Tous les chiffres sont placés, mais une file au moins ne tombe pas juste. '
                    + 'Regarde les flèches qui ne sont pas vertes.', 'ko');
                this.onWrongAnswer(null, {
                    concept: COMPETENCE,
                    questionText: `Hexagrille (${this.puzzle.fleches.length} flèches)`,
                    input: 'grille complète', expected: 'toutes les files justes',
                    customMessage: 'Une file au moins ne tombe pas juste : reprends celles dont la flèche n\'est pas verte.',
                    silencieux: true
                });
            }
            return;
        }
        this.finie = true;
        this.reussies++;
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Hexagrille (${this.puzzle.fleches.length} flèches, niveau ${this.niveau})`,
            expected: 'grille complète', given: 'grille complète',
            points: 10 + this.puzzle.fleches.length * 2
        });
        this.note('✅ Toutes les files tombent juste. Une autre ?', 'ok');
        this.compteEl.textContent = `${this.reussies} grille${this.reussies > 1 ? 's' : ''} réussie${this.reussies > 1 ? 's' : ''}`;
    }

    // --- L'aide : la MÉTHODE, jamais le chiffre nu ---------------------------

    aider() {
        if (this.isDemo || this.finie) return;
        const coup = prochainCoup(this.saisie, this.puzzle);
        if (!coup) {
            this.note('Aucune file n\'a exactement une case vide pour l\'instant. '
                + 'Place un chiffre dont tu es sûr, ou reprends-en un.');
            return;
        }
        this.aides++;
        const f = coup.file;
        const connus = f.cases.filter(i => this.saisie[i]).map(i => this.saisie[i]);
        this.note(`Regarde la file qui doit faire <b>${f.somme}</b> : il n'y manque qu'une case. `
            + `Tu y as déjà ${connus.join(' + ')} = <b>${connus.reduce((t, v) => t + v, 0)}</b>. `
            + `Il manque donc ${f.somme} − ${connus.reduce((t, v) => t + v, 0)}.`);
        // On surligne la file, on ne remplit pas : le calcul reste à l'élève.
        f.cases.forEach(i => {
            const el = this.plateauEl.querySelector(`[data-cell="${i}"]`);
            if (el) el.classList.add('hx-cell--survol');
        });
    }

    note(html, genre) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html;
        this.noteEl.className = `hx-note${genre ? ` hx-note--${genre}` : ''}`;
    }

    // --- La démonstration ----------------------------------------------------

    async runDemoSequence() {
        this.poser();
        if (!this.cursor) this.cursor = createDemoCursor();
        if (!this.gate) this.gate = createDemoGate(this.container);
        const fin = () => { this.cursor?.hideBubble(); return true; };

        if (!await this.cursor.pause(600)) return fin();
        this.cursor.say('Neuf cases, les chiffres de 1 à 9, chacun une seule fois. '
            + 'Chaque flèche donne la somme de la file qu\'elle désigne.', this.plateauEl);
        if (!await this.cursor.pause(DEMO_SPEED.between + 1200)) return fin();

        // Le robot déroule la grille comme on la résout : toujours la file où
        // il ne manque qu'une case.
        for (let tour = 0; tour < 9; tour++) {
            const coup = prochainCoup(this.saisie, this.puzzle);
            if (!coup) break;
            if (!await this.gate.waitTurn()) return fin();
            const connus = coup.file.cases.filter(i => this.saisie[i]).map(i => this.saisie[i]);
            const somme = connus.reduce((t, v) => t + v, 0);
            this.cursor.say(`Cette file doit faire ${coup.file.somme}. J'y ai déjà `
                + `${connus.join(' + ')} = ${somme}. Il manque ${coup.file.somme} − ${somme} = ${coup.valeur}.`,
            this.plateauEl.querySelector(`[data-cell="${coup.case}"]`) || this.plateauEl);
            if (!await this.cursor.pause(DEMO_SPEED.settle + 600)) return fin();
            this.saisie[coup.case] = coup.valeur;
            this.dessiner();
        }

        if (!await this.gate.waitTurn()) return fin();
        this.cursor.say('Toutes les files tombent juste. On n\'a jamais deviné : '
            + 'chaque case est venue d\'une soustraction.', this.plateauEl);
        await this.cursor.pause(DEMO_SPEED.between + 800);
        return fin();
    }

    destroy() {
        if (this.cursor) { this.cursor.destroy(); this.cursor = null; }
        if (this.gate) { this.gate.destroy(); this.gate = null; }
        super.destroy();
    }
}

export function engineHexagrille(container, isDemo, params) {
    const game = new Hexagrille(container, isDemo, params);
    game.start();
    return game;
}
