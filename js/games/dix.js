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
        // LES CARTES QUI BOUGENT. Rémy : « on pourrait faire, après quelques
        // questions, le même type mais les cases bougent et rebondissent sur
        // l'écran ».
        //
        // Ce n'est pas un habillage. Sur une table immobile, un élève finit par
        // ne plus calculer du tout : il RETIENT où sont les cartes, et cherche
        // des yeux la case qu'il a repérée tout à l'heure. Dès qu'elles
        // dérivent, la mémoire de position ne sert plus à rien — il ne reste
        // que « quel nombre va avec celui-là ». C'est le même exercice, débarrassé
        // de sa béquille.
        this.mouvement = ['jamais', 'apres', 'toujours'].includes(this.params.mouvement)
            ? this.params.mouvement : 'apres';
        this.flotte = [];
        this.rafId = null;
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
                /* LA TABLE QUI DÉRIVE. Les cartes quittent la grille et se
                   placent au pixel près : on les anime par leur position, et
                   non par une transformation — celle-ci reste aux états (prise,
                   partie, faute), qui s'en servent pour leurs animations. */
                .dx-table--mouvante {
                    display: block; position: relative; width: 100%;
                    height: min(58cqh, 420px); flex: 1 1 auto; min-height: 220px;
                    border: 2px dashed color-mix(in srgb, var(--text-main) 18%, transparent);
                    border-radius: 16px; overflow: hidden;
                }
                .dx-table--mouvante .dx-carte {
                    position: absolute; aspect-ratio: auto;
                    width: var(--dx-cote, 62px); height: var(--dx-cote, 62px);
                    font-size: clamp(15px, 5.4cqw, 26px);
                    transition: opacity .25s ease, box-shadow .1s ease;
                }
                .dx-table--mouvante .dx-carte:hover { transform: none; }
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

    /** La table dérive-t-elle sur cette manche ? */
    get enMouvement() {
        if (this.mouvement === 'jamais') return false;
        if (this.mouvement === 'toujours') return true;
        // Deux tables immobiles pour installer le geste, puis ça bouge.
        return this.tablesVidees >= 2;
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
        this.tableEl.classList.toggle('dx-table--mouvante', this.enMouvement);
        if (this.enMouvement) this.lancerDerive();
        else this.arreterDerive();
        this.note(this.enMouvement && this.tablesVidees === 2
            ? 'Attention : les cartes se mettent à bouger ! C\'est le même jeu — '
              + 'mais on ne peut plus retenir où elles sont.' : '');
    }

    // --- La dérive ------------------------------------------------------------

    /** Place les cartes au hasard, leur donne une vitesse, et démarre. */
    lancerDerive() {
        this.arreterDerive();
        const boite = this.tableEl.getBoundingClientRect();
        const W = boite.width || 320, H = boite.height || 260;
        // La carte se dimensionne sur le plateau : à douze cartes sur un
        // téléphone, 62 px les feraient se chevaucher en permanence.
        const cote = Math.max(40, Math.min(66, Math.sqrt(W * H / (this.cartes.length * 4.2))));
        this.tableEl.style.setProperty('--dx-cote', `${Math.round(cote)}px`);
        // La vitesse monte doucement : la troisième table dérive à peine, et
        // l'on ne se retrouve jamais à courir après une carte.
        const v = 0.22 + Math.min(0.5, (this.tablesVidees - 2) * 0.09);
        // ON PART D'UNE GRILLE, PAS DU HASARD PUR. Tiré au sort, un jeu de six
        // cartes en pose régulièrement trois l'une sur l'autre dès la première
        // image : on croit à un bogue, et la carte du dessous est intouchable.
        // Une grille lâche, secouée d'un peu de désordre, les sépare d'emblée —
        // la dérive fera le reste.
        const n = this.cartes.length;
        const colsD = Math.max(1, Math.round(Math.sqrt(n * (W / Math.max(1, H)))));
        const lignesD = Math.ceil(n / colsD);
        const caseW = W / colsD, caseH = H / lignesD;
        this.flotte = [...this.tableEl.querySelectorAll('.dx-carte')].map((el, k) => {
            const angle = this.rng.int(0, 359) * Math.PI / 180;
            const cx = (k % colsD) * caseW + caseW / 2;
            const cy = Math.floor(k / colsD) * caseH + caseH / 2;
            const jitter = (t) => this.rng.int(-Math.max(0, Math.floor(t)), Math.max(0, Math.floor(t)));
            return {
                el,
                x: Math.max(0, Math.min(W - cote, cx - cote / 2 + jitter((caseW - cote) / 2))),
                y: Math.max(0, Math.min(H - cote, cy - cote / 2 + jitter((caseH - cote) / 2))),
                vx: Math.cos(angle) * v, vy: Math.sin(angle) * v
            };
        });
        this.flotte.forEach(c => { c.el.style.left = `${c.x}px`; c.el.style.top = `${c.y}px`; });
        this.dernier = performance.now();
        const pas = (t) => {
            if (!this.isRunning || !this.enMouvement) { this.rafId = null; return; }
            const dt = Math.min(50, t - this.dernier);
            this.dernier = t;
            const r = this.tableEl.getBoundingClientRect();
            const maxX = Math.max(0, r.width - cote), maxY = Math.max(0, r.height - cote);
            for (const c of this.flotte) {
                // Une carte appariée s'efface : elle cesse de dériver, sinon on
                // verrait un fantôme rebondir dans le coin de l'écran.
                if (c.el.classList.contains('dx-carte--partie')) continue;
                c.x += c.vx * dt; c.y += c.vy * dt;
                if (c.x <= 0) { c.x = 0; c.vx = Math.abs(c.vx); }
                if (c.x >= maxX) { c.x = maxX; c.vx = -Math.abs(c.vx); }
                if (c.y <= 0) { c.y = 0; c.vy = Math.abs(c.vy); }
                if (c.y >= maxY) { c.y = maxY; c.vy = -Math.abs(c.vy); }
            }
            // ELLES REBONDISSENT AUSSI ENTRE ELLES. Sans cela, deux cartes
            // finissent par se superposer et l'une devient intouchable — on
            // perd une vie sur un jeu qu'on jouait juste.
            const vivantes = this.flotte.filter(c => !c.el.classList.contains('dx-carte--partie'));
            for (let i = 0; i < vivantes.length; i++) {
                for (let j = i + 1; j < vivantes.length; j++) {
                    const a = vivantes[i], b = vivantes[j];
                    const dx = (b.x - a.x), dy = (b.y - a.y);
                    const d = Math.hypot(dx, dy);
                    if (d >= cote * 0.98 || d === 0) continue;
                    const ux = dx / d, uy = dy / d;
                    const chevauche = (cote * 0.98 - d) / 2;
                    a.x -= ux * chevauche; a.y -= uy * chevauche;
                    b.x += ux * chevauche; b.y += uy * chevauche;
                    // Échange des vitesses le long de l'axe du choc : c'est le
                    // rebond d'une bille, et il se lit tout de suite.
                    const va = a.vx * ux + a.vy * uy, vb = b.vx * ux + b.vy * uy;
                    a.vx += (vb - va) * ux; a.vy += (vb - va) * uy;
                    b.vx += (va - vb) * ux; b.vy += (va - vb) * uy;
                }
            }
            for (const c of vivantes) {
                c.x = Math.max(0, Math.min(maxX, c.x));
                c.y = Math.max(0, Math.min(maxY, c.y));
                c.el.style.left = `${Math.round(c.x)}px`;
                c.el.style.top = `${Math.round(c.y)}px`;
            }
            this.rafId = requestAnimationFrame(pas);
        };
        this.rafId = requestAnimationFrame(pas);
    }

    arreterDerive() {
        if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
        this.flotte = [];
        this.tableEl.style.removeProperty('--dx-cote');
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
        this.arreterDerive();
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineDix(container, isDemo, params) {
    const jeu = new AmisDeDix(container, isDemo, params);
    jeu.start();
    return jeu;
}
