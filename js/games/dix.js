// LES AMIS DE DIX — vider la table par paires.
//
// Le complément à 10 ne se travaille pas comme un calcul parmi d'autres :
// c'est un RÉFLEXE, la brique du calcul mental (8 + 7, c'est 8 + 2 + 5 parce
// qu'on VOIT le 2 qui va avec le 8). Le jeu qui construit un réflexe n'est pas
// celui qui pose des questions : c'est celui qui fait CHERCHER DES PAIRES.
//
// Une table de cartes, toutes visibles. On tape 3, puis 7 : elles s'envolent.
// On tape 4, puis 5 : elles secouent la tête et restent. La table vidée, une
// autre arrive, avec un chiffre de plus si tout est allé vite. Même mécanique
// pour 100 (dizaines rondes) et 1000 (centaines rondes) — c'est le MÊME
// réflexe, décalé d'un rang.
//
// Deux choix qui comptent :
//   · TOUTES LES CARTES SE MARIENT. La table est un multi-ensemble de paires
//     complètes — jamais une carte orpheline qui bloquerait la fin.
//   · UNE PAIRE FAUSSE COÛTE UNE VIE ET S'EXPLIQUE. « 4 + 5 = 9, pas 10 » :
//     l'erreur enregistrée est celle du complément, pas un « raté » anonyme.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';

const COMPETENCE = 'num.complement';

/** Le tirage d'une table : `n` paires dont la somme fait `cible`. */
export function tirerTable(cible, n, rng) {
    const pas = cible === 10 ? 1 : cible / 10;
    const cartes = [];
    for (let k = 0; k < n; k++) {
        const a = rng.int(1, cible / pas - 1) * pas;
        cartes.push(a, cible - a);
    }
    return rng.shuffle(cartes);
}

class AmisDeDix extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'dix');
        this.rng = makeRng(this.params.seed);
        this.cibles = (this.params.cible && this.params.cible.length) ? this.params.cible : [10];
        this.vies = Number(this.params.vies) || 3;
        this.tablesVidees = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .dx-wrap {
                    display: flex; flex-direction: column; gap: 12px; width: 100%; height: 100%;
                    align-items: center; justify-content: flex-start; padding: 10px;
                    box-sizing: border-box; color: var(--text-main); overflow-y: auto;
                    container-type: inline-size;
                }
                .dx-tete { text-align: center; font-size: 1rem; flex: 0 0 auto; }
                .dx-cible { font-size: 1.5rem; font-weight: 900; color: var(--primary); }
                .dx-vies { font-size: 1.05rem; letter-spacing: .1em; }
                .dx-table {
                    display: grid; gap: 9px; justify-content: center; flex: 0 0 auto;
                    grid-template-columns: repeat(var(--dx-cols, 4), minmax(0, 1fr));
                    width: min(100%, calc(var(--dx-cols, 4) * 92px));
                }
                .dx-carte {
                    aspect-ratio: 1; border: 2.5px solid var(--text-main); border-radius: 14px;
                    background: var(--bg-panel); font-weight: 900; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    font-size: clamp(15px, 6.4cqw, 30px); user-select: none;
                    -webkit-tap-highlight-color: transparent; font-family: inherit;
                    color: var(--text-main);
                    transition: transform .1s ease, opacity .25s ease, box-shadow .1s ease;
                }
                .dx-carte:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,.15); }
                .dx-carte--prise {
                    border-color: var(--primary); background: color-mix(in srgb, var(--primary) 16%, var(--bg-panel));
                    box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 35%, transparent);
                }
                .dx-carte--partie { opacity: 0; transform: scale(.4) rotate(14deg); pointer-events: none; }
                .dx-carte--faute { animation: dx-faute .4s ease 2; }
                @keyframes dx-faute { 50% { border-color: var(--danger, #dc2626); transform: translateX(-5px); } }
                .dx-carte--montre { box-shadow: 0 0 0 4px var(--warning, #f59e0b); }
                .dx-note {
                    min-height: 2.4em; text-align: center; font-size: .88rem;
                    color: var(--text-muted); max-width: 620px; flex: 0 0 auto;
                }
                .dx-note--ok { color: var(--success, #16a34a); font-weight: 700; }
                .dx-note--ko { color: var(--danger, #dc2626); font-weight: 600; }
            </style>
            <div class="dx-wrap">
                <div class="dx-tete">
                    Tape deux cartes qui font <span class="dx-cible" data-cible></span>
                    <div class="dx-vies" data-vies></div>
                </div>
                <div class="dx-table" data-table></div>
                <div class="dx-note" data-note></div>
            </div>`;
        this.cibleEl = this.container.querySelector('[data-cible]');
        this.viesEl = this.container.querySelector('[data-vies]');
        this.tableEl = this.container.querySelector('[data-table]');
        this.noteEl = this.container.querySelector('[data-note]');
    }

    startGameLoop() {
        this.viesRestantes = this.vies;
        this.tablesVidees = 0;
        this.poserTable();
    }

    poserTable() {
        this.cible = this.rng.pick(this.cibles);
        // La table grandit avec la réussite : 4 paires, puis 5, puis 6 —
        // jamais plus, au-delà on cherche des yeux au lieu de calculer.
        this.nbPaires = Math.min(6, 4 + this.tablesVidees);
        this.cartes = tirerTable(this.cible, this.nbPaires, this.rng);
        this.prise = null;
        this.cibleEl.textContent = String(this.cible);
        this.majVies();
        const cols = this.cartes.length > 10 ? 4 : (this.cartes.length > 6 ? 4 : 3);
        this.tableEl.style.setProperty('--dx-cols', String(cols));
        this.tableEl.innerHTML = this.cartes.map((v, i) =>
            `<button type="button" class="dx-carte" data-i="${i}" data-v="${v}">${v}</button>`).join('');
        this.tableEl.querySelectorAll('.dx-carte').forEach(b => {
            b.onclick = () => this.taper(b);
        });
        this.note('');
    }

    majVies() {
        this.viesEl.textContent = '❤️'.repeat(this.viesRestantes) + '🖤'.repeat(this.vies - this.viesRestantes);
    }

    taper(carte) {
        if (this.isDemo || !this.isRunning || carte.classList.contains('dx-carte--partie')) return;
        if (this.prise === carte) {
            carte.classList.remove('dx-carte--prise');
            this.prise = null;
            return;
        }
        if (!this.prise) {
            carte.classList.add('dx-carte--prise');
            this.prise = carte;
            return;
        }
        this.jugerPaire(this.prise, carte);
    }

    jugerPaire(a, b) {
        const va = Number(a.dataset.v), vb = Number(b.dataset.v);
        a.classList.remove('dx-carte--prise');
        this.prise = null;
        if (va + vb === this.cible) {
            a.classList.add('dx-carte--partie');
            b.classList.add('dx-carte--partie');
            this.note(`${va} + ${vb} = ${this.cible} ✓`, 'ok');
            this.onCorrectAnswer(b, COMPETENCE, {
                questionText: `${va} + ? = ${this.cible}`,
                expected: String(vb),
                given: String(vb),
                points: this.cible === 10 ? 4 : 6
            });
            const restantes = this.tableEl.querySelectorAll('.dx-carte:not(.dx-carte--partie)').length;
            if (!restantes) {
                this.tablesVidees++;
                setTimeout(() => { if (this.isRunning) this.poserTable(); }, 650);
            }
            return;
        }
        // La paire fausse : on dit le VRAI total, et le complément attendu.
        [a, b].forEach(c => {
            c.classList.add('dx-carte--faute');
            setTimeout(() => c.classList.remove('dx-carte--faute'), 850);
        });
        this.viesRestantes--;
        this.majVies();
        this.note(`❌ ${va} + ${vb} = ${va + vb}, pas ${this.cible}. `
            + `L'ami de ${va}, c'est ${this.cible - va}.`, 'ko');
        this.onWrongAnswer(b, {
            concept: COMPETENCE,
            questionText: `${va} + ? = ${this.cible}`,
            input: String(vb),
            expected: String(this.cible - va),
            customMessage: `${va} + ${vb} = ${va + vb}. Pour aller de ${va} à ${this.cible}, il faut ${this.cible - va}.`
        });
        if (this.viesRestantes <= 0) this.finDePartie();
    }

    finDePartie() {
        this.note(`Partie finie : ${this.tablesVidees} table${this.tablesVidees > 1 ? 's' : ''} vidée${this.tablesVidees > 1 ? 's' : ''}. On repart !`, 'ko');
        this.viesRestantes = this.vies;
        this.tablesVidees = 0;
        setTimeout(() => { if (this.isRunning) this.poserTable(); }, 1400);
    }

    showNext() { this.poserTable(); return true; }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'dx-note' + (ton ? ` dx-note--${ton}` : '');
    }

    // --- La démonstration ---------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.cartes) this.poserTable();
        if (!await cur.pause(500) || !this.isRunning) return fin();
        cur.say(`Je ne cherche pas deux cartes au hasard : j'en choisis UNE, et je calcule ce qui `
            + `lui manque pour faire ${this.cible}.`, this.cibleEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        for (let k = 0; k < 3; k++) {
            const libres = [...this.tableEl.querySelectorAll('.dx-carte:not(.dx-carte--partie)')];
            if (libres.length < 2) break;
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const a = libres[0];
            const va = Number(a.dataset.v);
            const manque = this.cible - va;
            const b = libres.find(c => c !== a && Number(c.dataset.v) === manque);
            if (!b) break;
            cur.say(`${va}… pour aller à ${this.cible}, il manque ${manque}. Je cherche un ${manque}.`, a);
            if (!await cur.tap(a)) return fin();
            a.classList.add('dx-carte--prise');
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
            if (!await cur.tap(b)) return fin();
            a.classList.remove('dx-carte--prise');
            a.classList.add('dx-carte--partie');
            b.classList.add('dx-carte--partie');
            this.note(`${va} + ${manque} = ${this.cible} ✓`, 'ok');
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Toujours dans cet ordre : une carte, LE calcul, puis l\'amie qu\'on cherche. '
            + 'C\'est comme ça que les paires deviennent des réflexes.', this.tableEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineDix(container, isDemo, params) {
    const jeu = new AmisDeDix(container, isDemo, params);
    jeu.start();
    return jeu;
}
