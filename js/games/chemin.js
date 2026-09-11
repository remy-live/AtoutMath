// LE CHEMIN NUMÉROTÉ — un seul trait, tous les nombres, toutes les cases.
//
// Le jeu de la capture d'écran envoyée par Rémy. Le noyau
// (core/cheminNumerote.js) tire la grille et tient la règle ; ici on dessine
// et l'on écoute le doigt.
//
// LE MÊME GESTE QUE « RELIER LES POINTS », et volontairement : un élève qui
// sait jouer à l'un sait jouer à l'autre sans qu'on lui explique. On pose le
// doigt sur le 1, on glisse ; le chemin suit case après case. Revenir en
// arrière efface — c'est la gomme naturelle, celle qu'on trouve sans qu'on la
// montre. Toucher une case du milieu de son propre chemin le coupe là.
//
// ET ON PEUT AUSSI TOUCHER CASE PAR CASE. Sur une tablette posée à plat, le
// glissé rate une fois sur trois ; toucher la case voisine du bout allonge le
// chemin d'un cran. Les deux gestes mènent au même endroit.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import { memeCase, adjacentes, clef } from '../core/relier.js';
import {
    TAILLES, CONSIGNE, genererParcours, traceVide, repereEn, peutAvancer,
    avancer, couperEn, verifier, conseil, solutionComplete
} from '../core/cheminNumerote.js';

const COMPETENCE = 'geo.espace.reperage';

class CheminNumerote extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'chemin-numerote');
        this.rng = makeRng(this.params.seed);
        this.taille = TAILLES[this.params.taille] ? this.params.taille : 'moyen';
        this.reussis = 0;
        this.trace = traceVide();
    }

    render() {
        this.container.innerHTML = `
            <style>
                .cn-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    width: 100%; height: 100%; padding: 8px 10px 12px; box-sizing: border-box;
                    color: var(--text-main); overflow-y: auto; container-type: size;
                    min-height: 0; user-select: none; -webkit-user-select: none;
                }
                .cn-tete { text-align: center; flex: 0 0 auto; }
                .cn-titre { font-weight: 800; font-size: clamp(14px, 3.4cqw, 19px); }
                .cn-consigne {
                    color: var(--text-muted); font-size: clamp(11px, 2.6cqw, 13px);
                    line-height: 1.35; max-width: 620px;
                }
                /* La grille est carrée : c'est la largeur qui la dimensionne, et
                   il lui faut autant de hauteur. Le plancher cède en paysage,
                   où la zone de jeu ne fait plus que deux cent soixante pixels
                   de haut. */
                .cn-scene {
                    flex: 1 1 auto; width: 100%; min-height: min(92cqw, 430px, 58cqh);
                    display: flex; align-items: center; justify-content: center;
                }
                .cn-svg { width: 100%; height: 100%; max-width: 520px; touch-action: none; }

                .cn-case { fill: var(--bg-panel); stroke: var(--border); stroke-width: .5; }
                .cn-case--vide { fill: color-mix(in srgb, var(--danger) 12%, var(--bg-panel)); }
                /* Le trait est un TUYAU : on le suit des yeux, il passe derrière
                   les nombres, et ses bouts ronds font les virages sans angle. */
                .cn-trait {
                    fill: none; stroke: var(--primary); stroke-linecap: round;
                    stroke-linejoin: round; pointer-events: none; opacity: .85;
                }
                .cn-tete-trait { fill: var(--primary); pointer-events: none; }
                .cn-repere { pointer-events: none; }
                .cn-repere circle { fill: var(--bg-panel); stroke: var(--text-main); }
                .cn-repere--fait circle { stroke: var(--primary); }
                .cn-repere text {
                    fill: var(--text-main); font-weight: 800; text-anchor: middle;
                    dominant-baseline: central;
                }
                .cn-repere--depart circle { fill: color-mix(in srgb, var(--success) 22%, var(--bg-panel)); }
                .cn-repere--arrivee circle { fill: color-mix(in srgb, var(--warning) 22%, var(--bg-panel)); }
                .cn-cible { fill: transparent; cursor: pointer; }

                .cn-barre { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; flex: 0 0 auto; }
                .cn-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700;
                    padding: 7px 12px; font-size: .85rem; min-height: 38px;
                }
                .cn-btn--ok { border-color: var(--primary); background: var(--primary); color: #fff; }
                .cn-compte {
                    font-weight: 800; font-size: .9rem; background: var(--bg-hover);
                    border-radius: 999px; padding: 5px 14px;
                }
                .cn-note {
                    min-height: 2.3em; text-align: center; font-size: .85rem; line-height: 1.35;
                    color: var(--text-muted); max-width: 620px; flex: 0 0 auto;
                }
                .cn-note--ok { color: var(--success); font-weight: 700; }
                .cn-note--ko { color: var(--danger); font-weight: 600; }

                /* COUCHÉ, LA GRILLE PASSE À GAUCHE ET LE RESTE À DROITE.
                   Mesuré au banc, en 667 x 375 : la grille tombait à 142 px de
                   haut — des cases de 28 px, sous le seuil du doigt — et le
                   contenu débordait quand même de soixante pixels sous le bord.
                   C'est la hauteur qui manque en paysage, jamais la largeur.
                   La requête interroge le PLATEAU, et non cette boîte-ci : un
                   élément ne peut pas questionner son propre conteneur. */
                @container plateau (max-height: 430px) and (min-width: 560px) {
                    .cn-wrap {
                        display: grid; padding: 6px 10px;
                        grid-template-columns: minmax(0, auto) minmax(180px, 260px);
                        grid-template-rows: min-content minmax(0, 1fr) min-content;
                        align-items: center; justify-items: center; gap: 4px 12px;
                    }
                    .cn-tete { grid-column: 2; grid-row: 1; }
                    .cn-scene {
                        grid-column: 1; grid-row: 1 / 4;
                        min-height: 0; height: 100%; align-self: stretch;
                    }
                    .cn-barre { grid-column: 2; grid-row: 2; }
                    .cn-note { grid-column: 2; grid-row: 3; min-height: 1.4em; }
                    .cn-consigne { font-size: 11px; line-height: 1.25; }
                }
            </style>
            <div class="cn-wrap">
                <div class="cn-tete">
                    <div class="cn-titre">Le chemin numéroté</div>
                    <div class="cn-consigne" data-consigne></div>
                </div>
                <div class="cn-scene"><svg class="cn-svg" data-svg preserveAspectRatio="xMidYMid meet"></svg></div>
                <div class="cn-barre">
                    <span class="cn-compte" data-compte></span>
                    <button type="button" class="cn-btn cn-btn--ok" data-verifier>✓ Vérifier</button>
                    <button type="button" class="cn-btn" data-aide>💡 Aide-moi</button>
                    <button type="button" class="cn-btn" data-effacer>↺ Tout effacer</button>
                    <button type="button" class="cn-btn" data-neuf>Autre grille</button>
                </div>
                <div class="cn-note" data-note></div>
            </div>`;

        this.svg = this.container.querySelector('[data-svg]');
        this.compteEl = this.container.querySelector('[data-compte]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.container.querySelector('[data-consigne]').textContent = CONSIGNE;
        this.container.querySelector('[data-verifier]').onclick = () => this.verifier();
        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.container.querySelector('[data-effacer]').onclick = () => this.effacer();
        this.container.querySelector('[data-neuf]').onclick = () => this.showNext();
    }

    startGameLoop() { this.poser(); }

    // --- Une grille ---------------------------------------------------------

    poser() {
        const t = TAILLES[this.taille];
        this.grille = genererParcours({ ...t, rng: this.rng });
        if (!this.grille) return false;
        this.trace = traceVide();
        this.fini = false;
        this.dessiner();
        this.note('');
        return true;
    }

    showNext() { return this.poser(); }

    effacer() {
        if (this.isDemo || !this.grille) return;
        this.trace = traceVide();
        this.fini = false;
        this.dessiner();
        this.note('');
    }

    // --- Le dessin ----------------------------------------------------------

    dessiner() {
        const g = this.grille;
        const c = 10;                      // le côté d'une case, en unités SVG
        this.svg.setAttribute('viewBox', `0 0 ${g.l * c} ${g.h * c}`);
        const bilan = verifier(g, this.trace);
        const trous = new Set(this.fini ? bilan.vides.map(v => clef(...v)) : []);
        const faits = this.trace.filter(p => repereEn(g, p[0], p[1])).length;

        let html = '';
        for (let y = 0; y < g.h; y++) {
            for (let x = 0; x < g.l; x++) {
                const vide = trous.has(clef(x, y));
                html += `<rect class="cn-case ${vide ? 'cn-case--vide' : ''}"
                    x="${x * c}" y="${y * c}" width="${c}" height="${c}"></rect>`;
            }
        }

        if (this.trace.length > 1) {
            const d = this.trace.map(([x, y], i) => `${i ? 'L' : 'M'}${x * c + c / 2} ${y * c + c / 2}`).join(' ');
            html += `<path class="cn-trait" d="${d}" stroke-width="${c * 0.44}"></path>`;
        }
        // Le BOUT du chemin se voit : c'est de là qu'on repart, et sans point
        // on cherche où l'on en était.
        if (this.trace.length) {
            const [bx, by] = this.trace[this.trace.length - 1];
            html += `<circle class="cn-tete-trait" cx="${bx * c + c / 2}" cy="${by * c + c / 2}"
                r="${c * 0.15}"></circle>`;
        }

        g.reperes.forEach(r => {
            const cx = r.x * c + c / 2, cy = r.y * c + c / 2;
            const etat = r.n <= faits ? ' cn-repere--fait' : '';
            const role = r.n === 1 ? ' cn-repere--depart'
                : (r.n === g.reperes.length ? ' cn-repere--arrivee' : '');
            html += `<g class="cn-repere${etat}${role}">
                <circle cx="${cx}" cy="${cy}" r="${c * 0.34}" stroke-width="${c * 0.055}"/>
                <text x="${cx}" y="${cy}" font-size="${c * 0.42}">${r.n}</text>
            </g>`;
        });

        for (let y = 0; y < g.h; y++) {
            for (let x = 0; x < g.l; x++) {
                html += `<rect class="cn-cible" data-x="${x}" data-y="${y}"
                    x="${x * c}" y="${y * c}" width="${c}" height="${c}"></rect>`;
            }
        }
        this.svg.innerHTML = html;
        this.brancherDoigt();
        this.majCompte();
    }

    majCompte() {
        const g = this.grille;
        const faits = this.trace.filter(p => repereEn(g, p[0], p[1])).length;
        this.compteEl.textContent = `${faits} / ${g.reperes.length} nombres · `
            + `${this.trace.length} / ${g.l * g.h} cases`;
    }

    // --- Le doigt -----------------------------------------------------------

    caseSous(ev) {
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        if (!el || !el.dataset || el.dataset.x === undefined) return null;
        return [Number(el.dataset.x), Number(el.dataset.y)];
    }

    brancherDoigt() {
        if (this.isDemo) return;
        this.svg.querySelectorAll('[data-x]').forEach(el => {
            el.onpointerdown = (ev) => this.commencer(ev, [Number(el.dataset.x), Number(el.dataset.y)]);
        });
    }

    /**
     * On part du 1, du BOUT du chemin pour le prolonger, ou d'une case déjà
     * tracée pour la couper là. Trois entrées, un seul geste ensuite.
     */
    commencer(ev, depart) {
        if (this.isDemo || this.fini) return;
        ev.preventDefault();
        const g = this.grille;

        if (this.trace.length) {
            const dansLeTrace = this.trace.some(p => memeCase(p, depart));
            const bout = this.trace[this.trace.length - 1];
            if (dansLeTrace && !memeCase(bout, depart)) {
                this.trace = couperEn(this.trace, depart);
                this.dessiner();
                this.note('');
                return;
            }
            if (!dansLeTrace) {
                // Une case libre : on l'ajoute si elle touche le bout, sinon on
                // dit pourquoi. Un refus muet passe pour un bogue.
                const v = peutAvancer(g, this.trace, depart);
                if (!v.ok) { if (v.raison) this.note(v.raison, 'ko'); return; }
                this.trace = avancer(g, this.trace, depart);
                this.dessiner();
                this.note('');
            }
        } else {
            const v = peutAvancer(g, this.trace, depart);
            if (!v.ok) { if (v.raison) this.note(v.raison, 'ko'); return; }
            this.trace = avancer(g, this.trace, depart);
            this.dessiner();
            this.note('');
        }

        const suivre = (e) => {
            const c = this.caseSous(e);
            if (!c) return;
            const avant = this.trace.length;
            const v = peutAvancer(g, this.trace, c);
            if (!v.ok) {
                // Pendant le glissé, on ne commente pas : le doigt passe sur
                // des cases interdites en chemin, et une phrase par case
                // clignoterait sans rien dire.
                return;
            }
            this.trace = avancer(g, this.trace, c);
            if (this.trace.length !== avant) this.dessiner();
        };
        const lacher = () => {
            window.removeEventListener('pointermove', suivre);
            window.removeEventListener('pointerup', lacher);
            window.removeEventListener('pointercancel', lacher);
            this.dessiner();
            if (verifier(g, this.trace).gagne) this.verifier();
        };
        window.addEventListener('pointermove', suivre);
        window.addEventListener('pointerup', lacher);
        window.addEventListener('pointercancel', lacher);
    }

    // --- Vérifier -----------------------------------------------------------

    verifier() {
        if (this.isDemo || !this.grille || this.fini) return;
        const bilan = verifier(this.grille, this.trace);
        const quoi = `Chemin numéroté — grille ${this.grille.l}×${this.grille.h}, `
            + `${this.grille.reperes.length} nombres`;

        if (bilan.gagne) {
            this.fini = true;
            this.reussis++;
            this.note(`✅ ${bilan.message}`, 'ok');
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: quoi,
                expected: 'grille entièrement parcourue', given: 'grille entièrement parcourue',
                points: 10 + this.grille.reperes.length * 2
            });
            setTimeout(() => { if (this.isRunning) this.showNext(); }, 2400);
            return;
        }

        // Les cases oubliées se teintent : sans cela l'élève relit sa grille
        // dix fois sans voir le trou.
        this.fini = true;
        this.dessiner();
        this.fini = false;
        this.note(`❌ ${bilan.message}`, 'ko');
        this.onWrongAnswer(null, {
            concept: COMPETENCE,
            questionText: quoi,
            input: 'chemin incomplet', expected: 'toutes les cases, les nombres dans l\'ordre',
            customMessage: bilan.message, silencieux: true
        });
    }

    aider() {
        if (this.isDemo || !this.grille) return;
        this.note(conseil(this.grille, this.trace));
    }

    /** L'outil d'auteur : la grille se remplit d'un coup, pour la relire. */
    montrerSolution() {
        if (!this.grille) return false;
        this.trace = solutionComplete(this.grille);
        this.dessiner();
        this.note('Solution affichée (outil d\'auteur).');
        return true;
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'cn-note' + (ton ? ` cn-note--${ton}` : '');
    }

    // --- La démonstration ---------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.grille) this.poser();
        if (!await cur.pause(500) || !this.isRunning) return fin();
        cur.say('Un seul chemin, du 1 jusqu\'au dernier nombre, dans l\'ordre — et à la fin, '
            + 'AUCUNE case ne doit rester vide.', this.svg);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        const caseEl = ([x, y]) => this.svg.querySelector(`[data-x="${x}"][data-y="${y}"]`);
        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Je pose le doigt sur le 1 et je glisse : le chemin suit les cases.',
            caseEl(this.grille.solution[0]) || this.svg);
        const depart = caseEl(this.grille.solution[0]);
        if (depart && !await cur.tap(depart)) return fin();

        // Le tracé se déroule case après case, pour qu'on VOIE le chemin naître.
        const jusqua = Math.min(this.grille.solution.length, Math.round(this.grille.solution.length * 0.45));
        for (let i = 1; i < jusqua; i++) {
            this.trace = this.grille.solution.slice(0, i + 1);
            this.dessiner();
            if (!await cur.pause(DEMO_SPEED.press) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Je ne fonce pas au nombre suivant : je regarde les COINS. Un coin n\'a que '
            + 'deux voisines — si le chemin ne le prend pas en passant, il ne pourra plus '
            + 'jamais y aller.', this.svg);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineChemin(container, isDemo, params) {
    const jeu = new CheminNumerote(container, isDemo, params);
    jeu.start();
    return jeu;
}
