// LE LABYRINTHE DES NOMBRES — à l'écran.
//
// Le noyau (core/labyrintheNombres.js) tire la grille et tient la règle : le
// nombre de la case dit DE COMBIEN on saute. Ici on dessine, et l'on écoute le
// doigt.
//
// TROIS PARTIS PRIS.
//
//   · ON TOUCHE LA CASE OÙ L'ON VEUT ALLER, pas une croix de direction. Le
//     geste est celui du livre : on pose le doigt là où l'on croit pouvoir
//     atterrir. Si c'est faux, le logiciel dit POURQUOI — « tu es sur un 3, il
//     faut sauter de 3 cases exactement, pas de 2 » — parce que l'erreur de ce
//     jeu est presque toujours la même : compter la case où l'on est.
//
//   · LES SAUTS POSSIBLES SE MONTRENT, ET CELA SE COUPE. Au début, voir les
//     quatre cases atteignables apprend à compter juste ; ensuite, c'est une
//     béquille — le bouton l'enlève, et le labyrinthe redevient celui du livre.
//
//   · LE CHEMIN SE REMBOBINE. Revenir sur sa case précédente efface le dernier
//     saut : un labyrinthe se parcourt en se trompant, et effacer tout pour
//     une erreur au huitième saut découragerait n'importe qui.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    TAILLES, CONSIGNE, genererLabyrinthe, sautsPossibles, traceVide, peutAvancer,
    avancer, verifier, prochainSaut, conseil, valeur, clef, memeCase
} from '../core/labyrintheNombres.js';

const COMPETENCE = 'geo.espace.reperage';

class LabyrintheNombres extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'laby-nombres');
        this.rng = makeRng(this.params.seed);
        this.taille = TAILLES[this.params.taille] ? this.params.taille : 'moyen';
        this.montrerSauts = this.params.montrerSauts !== false;
        this.reussis = 0;
        this.chemin = [];
    }

    render() {
        this.container.innerHTML = `
            <style>
                .ln-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    width: 100%; height: 100%; padding: 8px 10px 12px; box-sizing: border-box;
                    color: var(--text-main); overflow-y: auto; container-type: size;
                    min-height: 0; user-select: none; -webkit-user-select: none;
                }
                .ln-tete { text-align: center; flex: 0 0 auto; }
                .ln-titre { font-weight: 800; font-size: clamp(14px, 3.4cqw, 19px); }
                .ln-consigne {
                    color: var(--text-muted); font-size: clamp(11px, 2.6cqw, 13px);
                    line-height: 1.35; max-width: 640px;
                }
                .ln-scene {
                    flex: 1 1 auto; width: 100%; min-height: min(92cqw, 430px, 58cqh);
                    display: flex; align-items: center; justify-content: center;
                }
                .ln-svg { width: 100%; height: 100%; max-width: 520px; touch-action: none; }

                .ln-case { fill: var(--bg-panel); stroke: var(--border); stroke-width: .5; }
                .ln-case--ici { fill: color-mix(in srgb, var(--primary) 20%, var(--bg-panel)); }
                .ln-case--vue { fill: color-mix(in srgb, var(--primary) 8%, var(--bg-panel)); }
                .ln-case--possible { fill: color-mix(in srgb, var(--success) 16%, var(--bg-panel)); }
                .ln-case--sortie { fill: color-mix(in srgb, var(--warning) 20%, var(--bg-panel)); }
                .ln-nombre {
                    fill: var(--text-main); font-weight: 800; text-anchor: middle;
                    dominant-baseline: central; pointer-events: none;
                }
                .ln-etoile { fill: var(--warning); pointer-events: none; }
                /* Le trait du chemin passe SOUS les nombres : c'est la trace du
                   parcours, pas un décor qui recouvre ce qu'on doit lire. */
                .ln-trait {
                    fill: none; stroke: var(--primary); stroke-width: 1.1;
                    stroke-linecap: round; stroke-linejoin: round;
                    opacity: .75; pointer-events: none;
                }
                /* Le pion est un ANNEAU, pas un disque : la case où l'on est
                   porte un nombre, et c'est celui-là qu'on doit lire pour
                   savoir de combien sauter. Un disque plein le cachait. */
                .ln-pion { fill: none; stroke: var(--primary); pointer-events: none; }
                .ln-cible { fill: transparent; cursor: pointer; }

                .ln-barre { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; flex: 0 0 auto; }
                .ln-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700;
                    padding: 7px 12px; font-size: .85rem; min-height: 38px;
                }
                .ln-btn--on { border-color: var(--primary); color: var(--primary); }
                .ln-compte {
                    font-weight: 800; font-size: .9rem; background: var(--bg-hover);
                    border-radius: 999px; padding: 5px 14px;
                }
                .ln-note {
                    min-height: 2.3em; text-align: center; font-size: .85rem; line-height: 1.35;
                    color: var(--text-muted); max-width: 640px; flex: 0 0 auto;
                }
                .ln-note--ok { color: var(--success); font-weight: 700; }
                .ln-note--ko { color: var(--danger); font-weight: 600; }

                /* Couché, la grille passe à gauche et les commandes à droite :
                   en paysage c'est la hauteur qui manque, jamais la largeur.
                   La requête interroge le PLATEAU, pas cette boîte-ci — un
                   élément ne peut pas questionner son propre conteneur. */
                @container plateau (max-height: 430px) and (min-width: 560px) {
                    .ln-wrap {
                        display: grid; padding: 6px 10px;
                        grid-template-columns: minmax(0, auto) minmax(180px, 270px);
                        grid-template-rows: min-content minmax(0, 1fr) min-content;
                        align-items: center; justify-items: center; gap: 4px 12px;
                    }
                    .ln-tete { grid-column: 2; grid-row: 1; }
                    .ln-scene {
                        grid-column: 1; grid-row: 1 / 4;
                        min-height: 0; height: 100%; align-self: stretch;
                    }
                    .ln-barre { grid-column: 2; grid-row: 2; }
                    .ln-note { grid-column: 2; grid-row: 3; min-height: 1.4em; }
                    .ln-consigne { font-size: 11px; line-height: 1.25; }
                }
            </style>
            <div class="ln-wrap">
                <div class="ln-tete">
                    <div class="ln-titre">Le labyrinthe des nombres</div>
                    <div class="ln-consigne" data-consigne></div>
                </div>
                <div class="ln-scene"><svg class="ln-svg" data-svg preserveAspectRatio="xMidYMid meet"></svg></div>
                <div class="ln-barre">
                    <span class="ln-compte" data-compte></span>
                    <button type="button" class="ln-btn" data-retour>↶ Revenir</button>
                    <button type="button" class="ln-btn" data-sauts></button>
                    <button type="button" class="ln-btn" data-aide>💡 Aide-moi</button>
                    <button type="button" class="ln-btn" data-effacer>↺ Recommencer</button>
                    <button type="button" class="ln-btn" data-neuf>Autre grille</button>
                </div>
                <div class="ln-note" data-note></div>
            </div>`;

        this.svg = this.container.querySelector('[data-svg]');
        this.compteEl = this.container.querySelector('[data-compte]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.btnSauts = this.container.querySelector('[data-sauts]');
        this.container.querySelector('[data-consigne]').textContent = CONSIGNE;
        this.container.querySelector('[data-retour]').onclick = () => this.revenir();
        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.container.querySelector('[data-effacer]').onclick = () => this.effacer();
        this.container.querySelector('[data-neuf]').onclick = () => this.showNext();
        this.btnSauts.onclick = () => {
            this.montrerSauts = !this.montrerSauts;
            this.dessiner();
        };
    }

    startGameLoop() { this.poser(); }

    poser() {
        const t = TAILLES[this.taille];
        this.laby = genererLabyrinthe({ ...t, rng: this.rng });
        if (!this.laby) return false;
        this.chemin = traceVide(this.laby);
        this.fini = false;
        this.dessiner();
        this.note('');
        return true;
    }

    showNext() { return this.poser(); }

    effacer() {
        if (this.isDemo || !this.laby) return;
        this.chemin = traceVide(this.laby);
        this.fini = false;
        this.dessiner();
        this.note('');
    }

    revenir() {
        if (this.isDemo || !this.laby || this.chemin.length < 2) return;
        this.chemin = this.chemin.slice(0, -1);
        this.fini = false;
        this.dessiner();
        this.note('');
    }

    // --- Le dessin ----------------------------------------------------------

    dessiner() {
        const L = this.laby;
        const c = 10;
        this.svg.setAttribute('viewBox', `0 0 ${L.l * c} ${L.h * c}`);
        const ici = this.chemin[this.chemin.length - 1];
        const vus = new Set(this.chemin.map(p => clef(...p)));
        const possibles = new Set(
            (this.montrerSauts && !this.fini ? sautsPossibles(L, ici) : []).map(p => clef(...p)));

        let html = '';
        for (let y = 0; y < L.h; y++) {
            for (let x = 0; x < L.l; x++) {
                const k = clef(x, y);
                const classe = memeCase([x, y], ici) ? 'ln-case--ici'
                    : (possibles.has(k) ? 'ln-case--possible'
                        : (memeCase([x, y], L.sortie) ? 'ln-case--sortie'
                            : (vus.has(k) ? 'ln-case--vue' : '')));
                html += `<rect class="ln-case ${classe}" x="${x * c}" y="${y * c}"
                    width="${c}" height="${c}" rx="${c * 0.12}"></rect>`;
            }
        }

        if (this.chemin.length > 1) {
            const d = this.chemin.map(([x, y], i) => `${i ? 'L' : 'M'}${x * c + c / 2} ${y * c + c / 2}`).join(' ');
            html += `<path class="ln-trait" d="${d}"></path>`;
        }

        for (let y = 0; y < L.h; y++) {
            for (let x = 0; x < L.l; x++) {
                const n = valeur(L, x, y);
                const cx = x * c + c / 2, cy = y * c + c / 2;
                if (!n) {
                    html += etoileSvg(cx, cy, c * 0.32);
                    continue;
                }
                html += `<text class="ln-nombre" x="${cx}" y="${cy}" font-size="${c * 0.46}">${n}</text>`;
            }
        }

        // Le pion : un disque autour du nombre de la case courante, pour qu'on
        // voie d'un coup d'œil D'OÙ l'on saute.
        html += `<circle class="ln-pion" cx="${ici[0] * c + c / 2}" cy="${ici[1] * c + c / 2}"
            r="${c * 0.42}" stroke-width="${c * 0.07}"></circle>`;

        for (let y = 0; y < L.h; y++) {
            for (let x = 0; x < L.l; x++) {
                html += `<rect class="ln-cible" data-x="${x}" data-y="${y}"
                    x="${x * c}" y="${y * c}" width="${c}" height="${c}"></rect>`;
            }
        }
        this.svg.innerHTML = html;
        this.brancherDoigt();
        this.majCompte();
        this.btnSauts.textContent = this.montrerSauts ? '👁 Sauts montrés' : '👁 Sauts cachés';
        this.btnSauts.classList.toggle('ln-btn--on', this.montrerSauts);
    }

    majCompte() {
        const n = this.chemin.length - 1;
        this.compteEl.textContent = `${n} saut${n > 1 ? 's' : ''}`
            + (this.laby.longueur ? ` · le plus court en fait ${this.laby.longueur}` : '');
    }

    brancherDoigt() {
        if (this.isDemo) return;
        this.svg.querySelectorAll('[data-x]').forEach(el => {
            el.onclick = () => this.jouer([Number(el.dataset.x), Number(el.dataset.y)]);
        });
    }

    jouer(cible) {
        if (this.isDemo || this.fini || !this.laby) return;
        const v = peutAvancer(this.laby, this.chemin, cible);
        if (!v.ok) { if (v.raison) this.note(v.raison, 'ko'); return; }
        this.chemin = avancer(this.laby, this.chemin, cible);
        this.dessiner();
        const bilan = verifier(this.laby, this.chemin);
        if (bilan.gagne) { this.gagner(bilan); return; }
        this.note(bilan.bloque ? bilan.message : '', bilan.bloque ? 'ko' : '');
    }

    gagner(bilan) {
        this.fini = true;
        this.reussis++;
        this.dessiner();
        this.note(`✅ ${bilan.message}`, 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Labyrinthe des nombres — grille ${this.laby.l}×${this.laby.h}`,
            expected: `${this.laby.longueur} sauts au minimum`,
            given: `${this.chemin.length - 1} sauts`,
            points: 10 + this.laby.longueur * 2
        });
        setTimeout(() => { if (this.isRunning) this.showNext(); }, 2400);
    }

    aider() {
        if (this.isDemo || !this.laby) return;
        this.note(conseil(this.laby, this.chemin));
    }

    montrerSolution() {
        if (!this.laby) return false;
        this.chemin = this.laby.solution.map(c => [c[0], c[1]]);
        this.fini = true;
        this.dessiner();
        this.note('Solution affichée (outil d\'auteur).');
        return true;
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'ln-note' + (ton ? ` ln-note--${ton}` : '');
    }

    // --- La démonstration ---------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.laby) this.poser();
        if (!await cur.pause(500) || !this.isRunning) return fin();
        cur.say('Le nombre de ma case dit de combien de cases je saute. Je choisis la '
            + 'direction, pas la distance.', this.svg);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        const caseEl = ([x, y]) => this.svg.querySelector(`[data-x="${x}"][data-y="${y}"]`);
        for (let k = 0; k < 3; k++) {
            const suite = prochainSaut(this.laby, this.chemin);
            if (!suite) break;
            const ici = this.chemin[this.chemin.length - 1];
            const n = valeur(this.laby, ici[0], ici[1]);
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            cur.say(k === 0
                ? `Je suis sur un ${n} : je compte ${n} cases, et la PREMIÈRE comptée est celle `
                  + 'juste à côté — pas celle où je suis. C\'est l\'erreur la plus fréquente.'
                : `Sur un ${n}, je saute de ${n}. Avant de partir, je regarde où cela me mène : `
                  + 'certaines cases sont des impasses, tous leurs sauts sortent de la grille.',
            caseEl(ici) || this.svg);
            const cible = caseEl(suite);
            if (cible && !await cur.tap(cible)) return fin();
            this.chemin = avancer(this.laby, this.chemin, suite);
            this.dessiner();
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Et si je me trompe, je reviens sur la case d\'avant : le saut s\'efface.',
            this.container.querySelector('[data-retour]'));
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

/** Une étoile à cinq branches, centrée — la sortie. */
function etoileSvg(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? r * 0.45 : r;
        pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`);
    }
    return `<polygon class="ln-etoile" points="${pts.join(' ')}"></polygon>`;
}

export function engineLabyNombres(container, isDemo, params) {
    const jeu = new LabyrintheNombres(container, isDemo, params);
    jeu.start();
    return jeu;
}
