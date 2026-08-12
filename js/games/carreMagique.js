// LE CARRÉ MAGIQUE — à l'écran.
//
// La grille, la somme affichée en gros, et des cases à remplir au clavier.
// L'aide donne la DÉDUCTION suivante — la ligne où il ne manque qu'une case
// et la soustraction qui la comble — jamais la valeur seule. Le robot déroule
// le même journal, dans l'ordre où le carré se démonte.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import { genererCarreMagique, verifierSaisie, lignesDe } from '../core/carreMagique.js';

const COMPETENCE = 'num.logique.carre-magique';

class CarreMagique extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'carre-magique');
        this.rng = makeRng(this.params.seed);
        this.reussis = 0;
        this.aidesUtilisees = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .cm-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 12px;
                    width: 100%; height: 100%; padding: 10px; box-sizing: border-box;
                    color: var(--text-main); overflow-y: auto; container-type: inline-size;
                }
                .cm-tete { text-align: center; font-size: .95rem; }
                .cm-somme { font-size: 1.5rem; font-weight: 900; color: var(--primary); }
                .cm-grille {
                    display: grid; gap: 0; border: 2.5px solid var(--text-main); border-radius: 8px;
                    overflow: hidden;
                }
                .cm-case {
                    width: clamp(52px, 17cqw, 84px); aspect-ratio: 1;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 900; font-size: clamp(17px, 5cqw, 27px);
                    border: 1px solid var(--text-main); box-sizing: border-box;
                    background: var(--bg-panel);
                }
                .cm-case--donnee { background: color-mix(in srgb, var(--text-main) 7%, var(--bg-panel)); }
                .cm-case input {
                    width: 100%; height: 100%; border: 0; text-align: center;
                    font: inherit; background: color-mix(in srgb, #fcd34d 20%, var(--bg-panel));
                    color: var(--text-main); outline: none;
                }
                .cm-case--montre { box-shadow: inset 0 0 0 3.5px var(--primary); }
                .cm-case--faute input { background: color-mix(in srgb, var(--danger, #dc2626) 22%, var(--bg-panel)); }
                .cm-barre { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
                .cm-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700; padding: 7px 13px;
                }
                .cm-btn--valider { border-color: var(--primary); background: var(--primary); color: #fff; }
                .cm-note { min-height: 2.6em; text-align: center; font-size: .88rem;
                    color: var(--text-muted); max-width: 620px; }
                .cm-note--ok { color: var(--success, #16a34a); font-weight: 700; }
                .cm-note--ko { color: var(--danger, #dc2626); font-weight: 600; }
            </style>
            <div class="cm-wrap">
                <div class="cm-tete">Toutes les lignes, colonnes et diagonales font
                    <span class="cm-somme" data-somme></span></div>
                <div class="cm-grille" data-grille></div>
                <div class="cm-barre">
                    <button type="button" class="cm-btn" data-aide>💡 Aide-moi</button>
                    <button type="button" class="cm-btn" data-effacer>↺ Effacer</button>
                    <button type="button" class="cm-btn" data-neuf>Autre carré</button>
                    <button type="button" class="cm-btn cm-btn--valider" data-valider>Vérifier</button>
                </div>
                <div class="cm-note" data-note></div>
            </div>`;
        this.grilleEl = this.container.querySelector('[data-grille]');
        this.sommeEl = this.container.querySelector('[data-somme]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.container.querySelector('[data-effacer]').onclick = () => this.effacer();
        this.container.querySelector('[data-neuf]').onclick = () => this.showNext();
        this.container.querySelector('[data-valider]').onclick = () => this.valider();
    }

    startGameLoop() { this.poser(); }

    poser() {
        this.puzzle = genererCarreMagique(this.params, this.rng);
        this.sommeEl.textContent = String(this.puzzle.somme);
        this.dessiner();
        this.note('');
        return true;
    }

    dessiner() {
        const p = this.puzzle;
        this.grilleEl.style.gridTemplateColumns = `repeat(${p.n}, auto)`;
        this.grilleEl.innerHTML = p.cases.map((v, i) => p.trous.includes(i)
            ? `<div class="cm-case" data-i="${i}"><input type="number" inputmode="numeric"
                aria-label="case à compléter" data-saisie="${i}"></div>`
            : `<div class="cm-case cm-case--donnee" data-i="${i}">${v}</div>`).join('');
    }

    effacer() {
        this.grilleEl.querySelectorAll('[data-saisie]').forEach(inp => { inp.value = ''; });
        this.grilleEl.querySelectorAll('.cm-case--faute').forEach(c => c.classList.remove('cm-case--faute'));
        this.note('');
    }

    saisie() {
        const s = {};
        this.grilleEl.querySelectorAll('[data-saisie]').forEach(inp => {
            s[Number(inp.dataset.saisie)] = inp.value === '' ? null : Number(inp.value);
        });
        return s;
    }

    valider() {
        if (this.isDemo) return;
        const bilan = verifierSaisie(this.puzzle, this.saisie());
        this.grilleEl.querySelectorAll('.cm-case--faute').forEach(c => c.classList.remove('cm-case--faute'));
        if (bilan.ok) {
            this.reussis++;
            this.note(`✅ Le carré est magique : chaque ligne fait bien ${this.puzzle.somme}.`, 'ok');
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: `Carré magique ${this.puzzle.n}×${this.puzzle.n} (somme ${this.puzzle.somme})`,
                expected: 'carré complet', given: 'carré complet',
                points: 10 + this.puzzle.trous.length * 2
            });
            setTimeout(() => { if (this.isRunning) this.poser(); }, 1900);
            return;
        }
        if (bilan.fautes.length) {
            bilan.fautes.forEach(i => this.grilleEl.querySelector(`.cm-case[data-i="${i}"]`)
                ?.classList.add('cm-case--faute'));
            this.note(`❌ ${bilan.fautes.length} case${bilan.fautes.length > 1 ? 's' : ''} en trop ou en moins : `
                + `refais la somme de leur ligne, elle doit faire ${this.puzzle.somme}.`, 'ko');
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: `Carré magique ${this.puzzle.n}×${this.puzzle.n}`,
                input: `${bilan.fautes.length} case(s) fausse(s)`,
                expected: `somme ${this.puzzle.somme} partout`,
                customMessage: `Une ligne au moins ne fait pas ${this.puzzle.somme}. Vérifie ligne par ligne.`,
                silencieux: true
            });
            return;
        }
        this.note(`Il reste ${bilan.vides} case${bilan.vides > 1 ? 's' : ''} vide${bilan.vides > 1 ? 's' : ''}. `
            + 'Tout ce que tu as écrit est juste, continue.', 'ko');
    }

    /** La prochaine déduction que l'élève n'a pas encore écrite. */
    prochaine() {
        const s = this.saisie();
        return this.puzzle.etapes.find(e => s[e.case] === null || s[e.case] === undefined
            ? s[e.case] !== this.puzzle.cases[e.case] : Number(s[e.case]) !== this.puzzle.cases[e.case]);
    }

    aider() {
        if (this.isDemo) return;
        const e = this.prochaine();
        if (!e) { this.note('Tout ce qui peut se déduire est écrit : vérifie ton carré !'); return; }
        this.aidesUtilisees++;
        // La LIGNE, la soustraction — pas la valeur toute seule.
        this.note(`Regarde la case qui s'allume : ${e.raison}.`);
        const el = this.grilleEl.querySelector(`.cm-case[data-i="${e.case}"]`);
        if (el) {
            el.classList.add('cm-case--montre');
            setTimeout(() => el.classList.remove('cm-case--montre'), 2600);
        }
    }

    showNext() { return this.poser(); }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'cm-note' + (ton ? ` cm-note--${ton}` : '');
    }

    // --- La démonstration -------------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.puzzle) this.poser();
        if (!await cur.pause(500) || !this.isRunning) return fin();
        cur.say(`Un carré magique se résout toujours pareil : je cherche une ligne où il ne manque `
            + `qu'UNE case, et je la trouve par une soustraction depuis ${this.puzzle.somme}.`, this.sommeEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        for (const e of this.puzzle.etapes.slice(0, 4)) {
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const el = this.grilleEl.querySelector(`.cm-case[data-i="${e.case}"]`);
            cur.say(`${e.raison}.`, el || this.grilleEl);
            if (el && !await cur.tap(el)) return fin();
            const inp = el && el.querySelector('input');
            if (inp) inp.value = String(e.valeur);
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Chaque case écrite débloque une nouvelle ligne à une seule case : on continue '
            + 'jusqu\'au bout, sans jamais deviner.', this.container.querySelector('[data-aide]'));
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineCarreMagique(container, isDemo, params) {
    const jeu = new CarreMagique(container, isDemo, params);
    jeu.start();
    return jeu;
}
