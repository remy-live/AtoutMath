// RELIER LES POINTS — au doigt, sur la grille.
//
// Le noyau (core/relier.js) tire la grille et tient les règles. Ici on dessine
// et on écoute le doigt, avec trois partis pris :
//
//   · ON TRACE EN GLISSANT, comme sur le papier. On pose le doigt sur un point
//     et on avance ; le chemin suit case après case. Demander de toucher les
//     cases une par une ferait de ce jeu un exercice de visée.
//   · ON PEUT AUSSI TOUCHER CASE PAR CASE. Sur une tablette posée à plat, le
//     glissé rate une fois sur trois ; toucher un point puis une case voisine
//     allonge le chemin d'un cran. Les deux gestes mènent au même endroit.
//   · REPASSER SUR UN AUTRE CHEMIN LE COUPE. C'est le geste normal du jeu :
//     on corrige en traçant par-dessus, pas en effaçant d'abord.
//
// LES SYMBOLES NE SONT PAS QU'UNE AFFAIRE D'IMPRIMANTE. La grille peut
// s'afficher avec ses symboles à l'écran aussi : un élève qui distingue mal le
// rouge du vert joue alors exactement le même jeu que les autres.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    genererGrille, bornes, traceVide, poserTrace, occupant, reliee, verifier,
    solutionComplete, prochainPas, conseil, adjacentes, memeCase, clef, CONSIGNE
} from '../core/relier.js';

const COMPETENCE = 'geo.espace.reperage';

/** Les tailles proposées : de la grille qu'on lit d'un coup d'œil à celle qui résiste. */
const TAILLES = {
    petit: { l: 5, h: 5, paires: 3 },
    moyen: { l: 6, h: 6, paires: 4 },
    grand: { l: 7, h: 7, paires: 5 },
    geant: { l: 8, h: 8, paires: 6 }
};

class Relier extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'relier');
        this.rng = makeRng(this.params.seed);
        this.taille = TAILLES[this.params.taille] ? this.params.taille : 'moyen';
        this.marques = this.params.marques || 'couleurs';   // couleurs | symboles | les-deux
        this.reussis = 0;
        this.enCours = -1;          // la paire qu'on est en train de tracer
    }

    render() {
        this.container.innerHTML = `
            <style>
                .rl-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    width: 100%; height: 100%; padding: 8px 10px 12px; box-sizing: border-box;
                    color: var(--text-main); overflow-y: auto; container-type: size;
                    user-select: none; -webkit-user-select: none;
                }
                .rl-tete { text-align: center; flex: 0 0 auto; }
                .rl-titre { font-weight: 800; font-size: clamp(14px, 3.4cqw, 19px); }
                .rl-consigne {
                    color: var(--text-muted); font-size: clamp(11px, 2.6cqw, 13px);
                    line-height: 1.35; max-width: 620px;
                }
                .rl-scene { flex: 1 1 auto; width: 100%; display: flex; align-items: center; justify-content: center; }
                .rl-svg { width: 100%; height: 100%; max-width: 520px; touch-action: none; }

                .rl-case { fill: var(--bg-panel); stroke: var(--border); stroke-width: .6; }
                .rl-case--vide { fill: color-mix(in srgb, var(--danger) 10%, var(--bg-panel)); }
                /* Le trait est GROS : c'est un tuyau qu'on suit des yeux, pas un
                   trait de crayon. Les bouts ronds font les virages sans angle. */
                .rl-trait { fill: none; stroke-linecap: round; stroke-linejoin: round; pointer-events: none; }
                .rl-borne { stroke: var(--bg-panel); stroke-width: 1.2; }
                .rl-symbole {
                    font-weight: 800; text-anchor: middle; dominant-baseline: central;
                    pointer-events: none;
                }
                .rl-cible { fill: transparent; cursor: pointer; }
                .rl-borne--active { stroke: var(--text-main); stroke-width: 2; }

                .rl-barre { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; flex: 0 0 auto; }
                .rl-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700;
                    padding: 7px 12px; font-size: .85rem; min-height: 38px;
                }
                .rl-btn--ok { border-color: var(--primary); background: var(--primary); color: #fff; }
                .rl-compte {
                    font-weight: 800; font-size: .9rem; background: var(--bg-hover);
                    border-radius: 999px; padding: 5px 14px;
                }
                .rl-note {
                    min-height: 2.3em; text-align: center; font-size: .85rem; line-height: 1.35;
                    color: var(--text-muted); max-width: 620px; flex: 0 0 auto;
                }
                .rl-note--ok { color: var(--success); font-weight: 700; }
                .rl-note--ko { color: var(--danger); font-weight: 600; }
            </style>
            <div class="rl-wrap">
                <div class="rl-tete">
                    <div class="rl-titre">Relie les points</div>
                    <div class="rl-consigne" data-consigne></div>
                </div>
                <div class="rl-scene"><svg class="rl-svg" data-svg preserveAspectRatio="xMidYMid meet"></svg></div>
                <div class="rl-barre">
                    <span class="rl-compte" data-compte></span>
                    <button type="button" class="rl-btn rl-btn--ok" data-verifier>✓ Vérifier</button>
                    <button type="button" class="rl-btn" data-marques></button>
                    <button type="button" class="rl-btn" data-aide>💡 Aide-moi</button>
                    <button type="button" class="rl-btn" data-effacer>↺ Tout effacer</button>
                    <button type="button" class="rl-btn" data-neuf>Autre grille</button>
                </div>
                <div class="rl-note" data-note></div>
            </div>`;

        this.svg = this.container.querySelector('[data-svg]');
        this.consigneEl = this.container.querySelector('[data-consigne]');
        this.compteEl = this.container.querySelector('[data-compte]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.btnMarques = this.container.querySelector('[data-marques]');
        this.container.querySelector('[data-verifier]').onclick = () => this.verifier();
        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.container.querySelector('[data-effacer]').onclick = () => this.effacer();
        this.container.querySelector('[data-neuf]').onclick = () => this.showNext();
        this.btnMarques.onclick = () => this.changerMarques();
        this.consigneEl.textContent = CONSIGNE;
    }

    startGameLoop() { this.poser(); }

    // --- Une grille ---------------------------------------------------------

    poser() {
        const t = TAILLES[this.taille];
        this.grille = genererGrille({ ...t, rng: this.rng });
        if (!this.grille) return false;
        this.etat = traceVide(this.grille);
        this.bornes = bornes(this.grille);
        this.fini = false;
        this.dessiner();
        this.note('');
        return true;
    }

    showNext() { return this.poser(); }

    effacer() {
        if (this.isDemo || !this.grille) return;
        this.etat = traceVide(this.grille);
        this.fini = false;
        this.dessiner();
        this.note('');
    }

    changerMarques() {
        const suite = { couleurs: 'les-deux', 'les-deux': 'symboles', symboles: 'couleurs' };
        this.marques = suite[this.marques] || 'couleurs';
        this.dessiner();
    }

    // --- Le dessin ----------------------------------------------------------

    dessiner() {
        const g = this.grille;
        const c = 10;                                   // le côté d'une case, en unités SVG
        this.cote = c;
        this.svg.setAttribute('viewBox', `0 0 ${g.l * c} ${g.h * c}`);
        const bilan = verifier(g, this.etat);
        const trous = new Set(bilan.vides.map(v => clef(...v)));
        const avecCouleur = this.marques !== 'symboles';
        const avecSymbole = this.marques !== 'couleurs';
        const encre = (p) => (avecCouleur ? p.couleur : 'var(--text-main)');

        let html = '';
        for (let y = 0; y < g.h; y++) {
            for (let x = 0; x < g.l; x++) {
                // Une case restée vide alors que tout est relié se signale : sans
                // cela, l'élève relit sa grille dix fois sans voir le trou.
                const vide = this.fini && trous.has(clef(x, y));
                html += `<rect class="rl-case ${vide ? 'rl-case--vide' : ''}"
                    x="${x * c}" y="${y * c}" width="${c}" height="${c}"></rect>`;
            }
        }

        // Les tracés, en gros tuyaux sous les bornes.
        g.paires.forEach(p => {
            const t = this.etat.traces[p.id];
            if (t.length < 2) return;
            const d = t.map(([x, y], i) => `${i ? 'L' : 'M'}${x * c + c / 2} ${y * c + c / 2}`).join(' ');
            html += `<path class="rl-trait" d="${d}" stroke="${encre(p)}"
                stroke-width="${c * 0.42}" opacity="${avecCouleur ? .95 : .55}"></path>`;
        });

        // Les bornes : un disque, et le symbole par-dessus s'il est demandé.
        g.paires.forEach(p => {
            [p.a, p.b].forEach(([x, y]) => {
                const cx = x * c + c / 2, cy = y * c + c / 2;
                html += `<circle class="rl-borne ${p.id === this.enCours ? 'rl-borne--active' : ''}"
                    cx="${cx}" cy="${cy}" r="${c * 0.33}" fill="${encre(p)}"></circle>`;
                if (avecSymbole) {
                    html += `<text class="rl-symbole" x="${cx}" y="${cy}"
                        font-size="${c * 0.42}" fill="${avecCouleur ? '#fff' : 'var(--bg-panel)'}"
                        >${p.symbole}</text>`;
                }
            });
        });

        // Les cibles du doigt, par-dessus tout : une case entière par case.
        for (let y = 0; y < g.h; y++) {
            for (let x = 0; x < g.l; x++) {
                html += `<rect class="rl-cible" data-x="${x}" data-y="${y}"
                    x="${x * c}" y="${y * c}" width="${c}" height="${c}"></rect>`;
            }
        }
        this.svg.innerHTML = html;
        this.brancherDoigt();
        this.majCompte();
        this.btnMarques.textContent = this.marques === 'couleurs' ? '◐ Couleurs'
            : (this.marques === 'les-deux' ? '◑ Couleurs + symboles' : '● Symboles seuls');
    }

    majCompte() {
        const n = this.grille.paires.filter(p => reliee(this.grille, this.etat, p.id)).length;
        const total = this.grille.paires.length;
        const bilan = verifier(this.grille, this.etat);
        this.compteEl.textContent = `${n} / ${total} reliées · ${bilan.vides.length} case`
            + `${bilan.vides.length > 1 ? 's vides' : ' vide'}`;
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
     * On part d'une borne — ou du BOUT d'un chemin déjà tracé, pour le
     * prolonger sans tout refaire. Puis on suit le doigt, case après case.
     */
    commencer(ev, depart) {
        if (this.isDemo || this.fini) return;
        ev.preventDefault();
        const g = this.grille;
        const borne = this.bornes.get(clef(...depart));
        let id = -1, chemin = null;

        if (borne) {
            id = borne.id;
            const p = g.paires[id];
            const t = this.etat.traces[id];
            // Repartir de la borne déjà commencée : on recommence son tracé.
            chemin = [borne.bout === 'a' ? p.a : p.b];
            if (t.length && memeCase(t[0], chemin[0])) chemin = t.slice();
        } else {
            // Le bout libre d'un tracé : on le prolonge.
            const occ = occupant(this.etat, ...depart);
            if (occ < 0) return;
            const t = this.etat.traces[occ];
            if (!memeCase(t[t.length - 1], depart)) {
                // On a touché le MILIEU d'un chemin : on le raccourcit jusque-là.
                const i = t.findIndex(x => memeCase(x, depart));
                this.etat = poserTrace(g, this.etat, occ, t.slice(0, i + 1));
                this.dessiner();
                return;
            }
            id = occ;
            chemin = t.slice();
        }
        if (id < 0) return;

        this.enCours = id;
        const avancer = (e) => {
            const c = this.caseSous(e);
            if (!c) return;
            const dernier = chemin[chemin.length - 1];
            if (memeCase(c, dernier)) return;
            // Revenir en arrière d'une case : on efface, c'est le geste de la gomme.
            if (chemin.length > 1 && memeCase(c, chemin[chemin.length - 2])) {
                chemin.pop();
            } else if (adjacentes(c, dernier)) {
                chemin.push(c);
            } else return;
            this.etat = poserTrace(g, this.etat, id, chemin);
            chemin = this.etat.traces[id].slice();
            this.dessiner();
        };
        const lacher = () => {
            window.removeEventListener('pointermove', avancer);
            window.removeEventListener('pointerup', lacher);
            window.removeEventListener('pointercancel', lacher);
            this.enCours = -1;
            this.dessiner();
            if (verifier(g, this.etat).gagne) this.verifier();
        };
        this.etat = poserTrace(g, this.etat, id, chemin);
        this.dessiner();
        window.addEventListener('pointermove', avancer);
        window.addEventListener('pointerup', lacher);
        window.addEventListener('pointercancel', lacher);
    }

    // --- Vérifier -----------------------------------------------------------

    verifier() {
        if (this.isDemo || !this.grille || this.fini) return;
        const bilan = verifier(this.grille, this.etat);
        if (bilan.gagne) {
            this.fini = true;
            this.reussis++;
            this.note('✅ Toutes les paires sont reliées, et pas une case n\'est restée vide.', 'ok');
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: `Relier les points — grille ${this.grille.l}×${this.grille.h}, `
                    + `${this.grille.paires.length} paires`,
                expected: 'grille remplie', given: 'grille remplie',
                points: 10 + this.grille.paires.length * 3
            });
            setTimeout(() => { if (this.isRunning) this.showNext(); }, 2400);
            return;
        }
        this.fini = true;                    // pour teinter les cases vides
        this.dessiner();
        this.fini = false;
        const quoi = !bilan.toutesReliees
            ? `${bilan.reliees.filter(x => !x).length} paire(s) ne sont pas encore reliées.`
            : `Toutes les paires sont reliées, mais ${bilan.vides.length} case`
                + `${bilan.vides.length > 1 ? 's sont vides' : ' est vide'} — elles sont en rouge. `
                + 'Allonge un chemin pour y passer.';
        this.note(`❌ ${quoi}`, 'ko');
        this.onWrongAnswer(null, {
            concept: COMPETENCE,
            questionText: `Relier les points — ${this.grille.l}×${this.grille.h}`,
            input: 'grille incomplète', expected: 'toutes les paires reliées, aucune case vide',
            customMessage: quoi, silencieux: true
        });
    }

    aider() {
        if (this.isDemo || !this.grille) return;
        this.note(conseil(this.grille, this.etat));
    }

    /** L'outil d'auteur : la grille se remplit d'un coup, pour la relire. */
    montrerSolution() {
        if (!this.grille) return false;
        this.etat = solutionComplete(this.grille);
        this.dessiner();
        this.note('Solution affichée (outil d\'auteur).');
        return true;
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'rl-note' + (ton ? ` rl-note--${ton}` : '');
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
        cur.say('Deux points de même marque, un chemin de l\'un à l\'autre, sans diagonale. '
            + 'Et la règle qu\'on oublie : à la fin, AUCUNE case ne doit rester vide.', this.svg);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        for (let k = 0; k < 2; k++) {
            const pas = prochainPas(this.grille, this.etat);
            if (!pas) break;
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const p = this.grille.paires[pas.id];
            const depart = this.svg.querySelector(`[data-x="${p.a[0]}"][data-y="${p.a[1]}"]`);
            cur.say(k === 0
                ? 'Je pose le doigt sur un point et je glisse : le chemin suit les cases.'
                : 'Je ne cherche pas le chemin le plus court — je cherche celui qui laisse '
                  + 'encore la place aux autres.', depart || this.svg);
            if (depart && !await cur.tap(depart)) return fin();
            // Le tracé se déroule case après case, pour qu'on VOIE le chemin naître.
            for (let i = 2; i <= p.solution.length; i++) {
                this.etat = poserTrace(this.grille, this.etat, pas.id, p.solution.slice(0, i));
                this.dessiner();
                if (!await cur.pause(DEMO_SPEED.press) || !this.isRunning) return fin();
            }
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Si une case reste vide à la fin, ce n\'est pas perdu : il suffit d\'allonger '
            + 'un chemin pour qu\'il y passe. Commence toujours par les coins — un coin n\'a '
            + 'que deux voisines.', this.container.querySelector('[data-verifier]'));
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineRelier(container, isDemo, params) {
    const jeu = new Relier(container, isDemo, params);
    jeu.start();
    return jeu;
}
