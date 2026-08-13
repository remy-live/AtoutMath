// LE FUTOSHIKI — à l'écran.
//
// La grille est dessinée avec ses signes ENTRE les cases, comme sur le papier
// des recueils. On touche une case, puis un chiffre du pavé — le geste des
// sudokus sur téléphone, le seul qui marche à la fois au doigt et à la souris.
// L'aide donne la déduction suivante du journal du solveur ; le robot déroule
// le même journal en montrant les cases.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import { genererFutoshiki, verifierSaisie } from '../core/futoshiki.js';
import { rendreGlissable, CSS_GLISSER } from '../core/glisserDeposer.js';

const COMPETENCE = 'num.logique.futoshiki';

class Futoshiki extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'futoshiki');
        this.rng = makeRng(this.params.seed);
        this.taille = Number(this.params.taille) || 4;
        this.difficulte = this.params.difficulte || 'facile';
        this.reussis = 0;
        this.aidesUtilisees = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                ${CSS_GLISSER}
                .fu-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 12px;
                    width: 100%; height: 100%; padding: 10px; box-sizing: border-box;
                    color: var(--text-main); overflow-y: auto; container-type: inline-size;
                }
                .fu-tete { text-align: center; font-size: .92rem; color: var(--text-muted); max-width: 620px; }
                .fu-grille { display: grid; gap: 0; }
                .fu-case {
                    width: clamp(40px, 13cqw, 62px); aspect-ratio: 1;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 900; font-size: clamp(16px, 4.6cqw, 25px);
                    border: 2px solid var(--text-main); border-radius: 9px;
                    background: var(--bg-panel); cursor: pointer; box-sizing: border-box;
                    user-select: none; -webkit-tap-highlight-color: transparent;
                }
                .fu-case--donnee { background: color-mix(in srgb, var(--text-main) 8%, var(--bg-panel)); cursor: default; }
                .fu-case--choisie { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 30%, transparent); }
                .fu-case--faute { border-color: var(--danger, #dc2626); background: color-mix(in srgb, var(--danger, #dc2626) 14%, var(--bg-panel)); }
                .fu-case--montre { box-shadow: 0 0 0 4px var(--warning, #f59e0b); }
                .fu-signe {
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 900; font-size: clamp(13px, 3.4cqw, 19px); color: var(--text-main);
                }
                .fu-pave { display: flex; gap: 7px; flex-wrap: wrap; justify-content: center; }
                .fu-chiffre {
                    width: 44px; height: 44px; border: 2px solid var(--border); border-radius: 10px;
                    background: var(--bg-panel); color: var(--text-main); font: inherit;
                    font-weight: 900; font-size: 1.1rem; cursor: pointer;
                }
                .fu-barre { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
                .fu-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700; padding: 7px 13px;
                }
                .fu-btn--valider { border-color: var(--primary); background: var(--primary); color: #fff; }
                .fu-note { min-height: 2.6em; text-align: center; font-size: .88rem;
                    color: var(--text-muted); max-width: 620px; }
                .fu-note--ok { color: var(--success, #16a34a); font-weight: 700; }
                .fu-note--ko { color: var(--danger, #dc2626); font-weight: 600; }
            </style>
            <div class="fu-wrap">
                <div class="fu-tete">Chaque chiffre de 1 à <b data-n></b> une fois par ligne et par colonne,
                    en respectant les signes &lt; et &gt;.<br>
                    <small>Touche une case pour faire monter son chiffre, ou glisse un chiffre du pavé dessus.</small></div>
                <div class="fu-grille" data-grille></div>
                <div class="fu-pave" data-pave></div>
                <div class="fu-barre">
                    <button type="button" class="fu-btn" data-aide>💡 Aide-moi</button>
                    <button type="button" class="fu-btn" data-effacer>↺ Effacer</button>
                    <button type="button" class="fu-btn" data-neuf>Autre grille</button>
                    <button type="button" class="fu-btn fu-btn--valider" data-valider>Vérifier</button>
                </div>
                <div class="fu-note" data-note></div>
            </div>`;
        this.grilleEl = this.container.querySelector('[data-grille]');
        this.paveEl = this.container.querySelector('[data-pave]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.container.querySelector('[data-effacer]').onclick = () => this.effacer();
        this.container.querySelector('[data-neuf]').onclick = () => this.showNext();
        this.container.querySelector('[data-valider]').onclick = () => this.valider();
    }

    startGameLoop() { this.poser(); }

    poser() {
        this.puzzle = genererFutoshiki({ taille: this.taille, difficulte: this.difficulte }, this.rng);
        this.saisie = {};
        this.choisie = null;
        this.container.querySelector('[data-n]').textContent = String(this.puzzle.n);
        this.dessiner();
        this.note('');
        return true;
    }

    /** Le signe entre deux cases voisines, s'il existe. */
    signeEntre(a, b) {
        for (const ing of this.puzzle.inegalites) {
            if (ing.petit === a && ing.grand === b) return '<';
            if (ing.petit === b && ing.grand === a) return '>';
        }
        return '';
    }

    dessiner() {
        const { n, donnees } = this.puzzle;
        // La grille alterne cases et gouttières de signes : 2n−1 pistes.
        this.grilleEl.style.gridTemplateColumns =
            Array.from({ length: 2 * n - 1 }, (_, k) => k % 2 ? 'minmax(16px, 24px)' : 'auto').join(' ');
        // Les rangées aussi : sans cela, une gouttière sans signe s'écrase et
        // la grille devient irrégulière.
        this.grilleEl.style.gridTemplateRows =
            Array.from({ length: 2 * n - 1 }, (_, k) => k % 2 ? 'minmax(14px, 20px)' : 'auto').join(' ');
        let html = '';
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const i = r * n + c;
                html += donnees[i]
                    ? `<div class="fu-case fu-case--donnee" data-i="${i}">${donnees[i]}</div>`
                    : `<div class="fu-case" data-i="${i}" role="button" tabindex="0"></div>`;
                if (c + 1 < n) html += `<div class="fu-signe">${this.signeEntre(i, i + 1)}</div>`;
            }
            if (r + 1 < n) {
                for (let c = 0; c < n; c++) {
                    const i = r * n + c;
                    const s = this.signeEntre(i, i + n);
                    // Un signe vertical se lit tourné : < vers le bas devient ∧.
                    html += `<div class="fu-signe">${s === '<' ? '∧' : s === '>' ? '∨' : ''}</div>`;
                    if (c + 1 < n) html += '<div></div>';
                }
            }
        }
        this.grilleEl.innerHTML = html;
        // TOUCHER UNE CASE FAIT MONTER SON CHIFFRE. C'est le geste le plus
        // court : sur une grille de quatre, une case se remplit en quatre
        // touches au pire, et sans jamais quitter la grille des yeux. La case
        // reste choisie au passage, si bien que le pavé écrit directement
        // dedans — et un chiffre du pavé peut aussi se GLISSER sur une case.
        this.grilleEl.querySelectorAll('.fu-case:not(.fu-case--donnee)').forEach(el => {
            el.onclick = () => { this.choisir(el); this.monter(el); };
        });
        this.paveEl.innerHTML = Array.from({ length: n }, (_, v) =>
            `<button type="button" class="fu-chiffre" data-v="${v + 1}">${v + 1}</button>`).join('')
            + '<button type="button" class="fu-chiffre" data-v="0" aria-label="Effacer la case">⌫</button>';
        this.paveEl.querySelectorAll('[data-v]').forEach(b => {
            b.onclick = () => this.ecrire(Number(b.dataset.v));
            rendreGlissable(b, {
                cibles: '.fu-case:not(.fu-case--donnee)',
                deposer: (cible) => this.ecrireCase(Number(cible.dataset.i), Number(b.dataset.v)),
                actif: () => !this.isDemo
            });
        });
    }

    /** Le chiffre suivant : 1, 2, … n, puis vide, et on recommence. */
    monter(el) {
        if (this.isDemo) return;
        const i = Number(el.dataset.i);
        const actuel = Number(this.saisie[i]) || 0;
        this.ecrireCase(i, actuel >= this.puzzle.n ? 0 : actuel + 1);
    }

    /** Écrit une valeur dans une case, ou l'efface si la valeur est zéro. */
    ecrireCase(i, v) {
        const el = this.grilleEl.querySelector(`.fu-case[data-i="${i}"]`);
        if (!el || el.classList.contains('fu-case--donnee')) return;
        el.classList.remove('fu-case--faute');
        if (!v) { delete this.saisie[i]; el.textContent = ''; return; }
        this.saisie[i] = v;
        el.textContent = String(v);
    }

    choisir(el) {
        if (this.isDemo) return;
        this.grilleEl.querySelectorAll('.fu-case--choisie').forEach(c => c.classList.remove('fu-case--choisie'));
        el.classList.add('fu-case--choisie');
        this.choisie = Number(el.dataset.i);
    }

    ecrire(v) {
        if (this.isDemo) return;
        if (this.choisie === null) {
            this.note('Touche une case pour faire monter son chiffre, ou glisse un chiffre dessus.');
            return;
        }
        this.ecrireCase(this.choisie, v);
    }

    effacer() {
        this.saisie = {};
        this.choisie = null;
        this.dessiner();
        this.note('');
    }

    valider() {
        if (this.isDemo) return;
        const bilan = verifierSaisie(this.puzzle, this.saisie);
        this.grilleEl.querySelectorAll('.fu-case--faute').forEach(c => c.classList.remove('fu-case--faute'));
        if (bilan.ok) {
            this.reussis++;
            this.note('✅ La grille respecte tout : chaque chiffre une fois, et tous les signes.', 'ok');
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: `Futoshiki ${this.puzzle.n}×${this.puzzle.n}`,
                expected: 'grille juste', given: 'grille juste',
                points: 12 + this.puzzle.n * 2
            });
            setTimeout(() => { if (this.isRunning) this.poser(); }, 1900);
            return;
        }
        if (bilan.fautes.length) {
            bilan.fautes.forEach(i => this.grilleEl.querySelector(`.fu-case[data-i="${i}"]`)
                ?.classList.add('fu-case--faute'));
            this.note(`❌ ${bilan.fautes.length} case${bilan.fautes.length > 1 ? 's ne collent' : ' ne colle'} pas : `
                + 'vérifie sa ligne, sa colonne, et les signes qui la touchent.', 'ko');
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: `Futoshiki ${this.puzzle.n}×${this.puzzle.n}`,
                input: `${bilan.fautes.length} case(s) fausse(s)`,
                expected: 'chaque chiffre une fois, signes respectés',
                customMessage: 'Une case au moins contredit sa ligne, sa colonne ou un signe.',
                silencieux: true
            });
            return;
        }
        this.note(`Il reste ${bilan.vides} case${bilan.vides > 1 ? 's' : ''} à remplir. `
            + 'Tout ce que tu as écrit est juste, continue.', 'ko');
    }

    prochaine() {
        return this.puzzle.etapes.find(e => Number(this.saisie[e.case]) !== e.valeur);
    }

    aider() {
        if (this.isDemo) return;
        const e = this.prochaine();
        if (!e) { this.note('Tout se déduit de ce que tu as : vérifie ta grille !'); return; }
        this.aidesUtilisees++;
        this.note('Regarde la case qui s\'allume : sa ligne, sa colonne et ses signes '
            + 'ne lui laissent qu\'une seule valeur possible.');
        const el = this.grilleEl.querySelector(`.fu-case[data-i="${e.case}"]`);
        if (el) {
            el.classList.add('fu-case--montre');
            setTimeout(() => el.classList.remove('fu-case--montre'), 2600);
        }
    }

    showNext() { return this.poser(); }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'fu-note' + (ton ? ` fu-note--${ton}` : '');
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
        cur.say('Un signe < dit qui est le plus petit — et surtout, il ÉLIMINE : la case du petit '
            + `côté ne peut pas valoir ${this.puzzle.n}, celle du grand côté ne peut pas valoir 1.`, this.grilleEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        for (const e of this.puzzle.etapes.slice(0, 4)) {
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const el = this.grilleEl.querySelector(`.fu-case[data-i="${e.case}"]`);
            cur.say(`Ici, tout élimine sauf ${e.valeur} : je l'écris.`, el || this.grilleEl);
            if (el && !await cur.tap(el)) return fin();
            this.saisie[e.case] = e.valeur;
            if (el) el.textContent = String(e.valeur);
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('On continue case par case, sans jamais deviner : chaque chiffre écrit rétrécit '
            + 'les possibilités des autres.', this.container.querySelector('[data-aide]'));
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineFutoshiki(container, isDemo, params) {
    const jeu = new Futoshiki(container, isDemo, params);
    jeu.start();
    return jeu;
}
