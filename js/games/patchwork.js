// LE PATCHWORK — à l'écran.
//
// Rémy, quatre pages d'un magazine de jeux à l'appui : « j'aimerais bien ces
// jeux en français et en rapport avec les maths ». Celui-ci s'appelait
// « Quilt ». La règle et le juge sont dans js/core/patchwork.js ; ici, le geste.
//
// LE GESTE EST DE COLORIER, et c'est tout.
//
// On touche un nombre pour choisir son morceau, puis on peint les cases qui lui
// appartiennent — au clic, ou en glissant le doigt. Toucher une case déjà peinte
// de la couleur choisie la rend blanche : c'est la gomme, et elle ne demande
// aucun bouton de plus. Une case prise à un autre morceau change simplement de
// propriétaire, sans qu'on ait à l'effacer d'abord : refuser ce geste-là
// obligerait à défaire avant de faire, ce qui est exactement ce qu'on ne fait
// pas avec un crayon de couleur.
//
// CE QU'ON NE FAIT PAS : demander de tracer les frontières. Le jeu d'origine se
// joue en traçant des traits entre les cases ; sur un téléphone, viser un trait
// de deux pixels au doigt est un supplice. Colorier vise une case, qui fait
// trente pixels — et le résultat ressemble enfin à un patchwork.
//
// LE CENTRE SE MONTRE QUAND ON A FINI, pas avant. Une croix sur le centre de
// chaque morceau pendant la partie donnerait la moitié de la réponse ; posée à
// la fin, elle explique ce qu'on vient de faire — et c'est là qu'on la regarde.

import { BaseGame } from '../core/BaseGame.js';
import { regTimeout } from '../core/timers.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import { genererPatchwork, verifierPatchwork, solutionDe, symetrieCentrale,
    PALIERS_PATCHWORK } from '../core/patchwork.js';

const COMPETENCE = 'geo.transfo.centre-figure';

// Des couleurs de tissu, assez différentes pour qu'on distingue deux morceaux
// voisins d'un coup d'œil, et assez pâles pour qu'un nombre reste lisible
// dessus. L'ordre est fixe : le même morceau garde sa couleur d'un bout à
// l'autre de la partie.
const TISSUS = [
    '#f3b4b4', '#b9d7f0', '#c8e6b8', '#f6dda6', '#d9c2ea',
    '#a9e0dc', '#f2c39a', '#c6cdf0', '#e8b8d4', '#cfe0a0',
    '#9fd3ee', '#eec9c9', '#bfe3c9', '#e3d2f3', '#f0d9a8'
];

class Patchwork extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'patchwork');
        this.palier = PALIERS_PATCHWORK[this.params.palier] ? this.params.palier : 'facile';
        this.rng = makeRng(this.params.seed || `pw${Date.now()}`);
        this.verifs = 0;
        this.reussies = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .pw-wrap {
                    display: flex; flex-direction: column; align-items: center;
                    gap: clamp(4px, 1.4cqh, 12px);
                    width: 100%; height: 100%; padding: 8px; box-sizing: border-box;
                    color: var(--text-main); container-type: size;
                    user-select: none; -webkit-user-select: none; overflow: hidden;
                }
                .pw-consigne { font-size: clamp(.8rem, 2.4cqh, 1rem); text-align: center; max-width: 46ch; }
                .pw-grille {
                    display: grid; gap: 2px; background: var(--border);
                    padding: 2px; border-radius: 8px;
                    flex: 0 1 auto; min-height: 0;
                }
                .pw-case {
                    background: var(--bg-panel); border-radius: 3px;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 700; font-size: clamp(.9rem, 3.4cqh, 1.6rem);
                    cursor: pointer; position: relative;
                    transition: background .12s ease;
                    width: var(--pw-cote); height: var(--pw-cote);
                }
                .pw-case--nombre { box-shadow: inset 0 0 0 2px rgba(0,0,0,.28); color: #22313f; }
                .pw-case--choisi { box-shadow: inset 0 0 0 3px var(--primary); }
                .pw-case--faute { animation: pw-secoue .3s ease; outline: 2px solid var(--danger); }
                @keyframes pw-secoue {
                    0%, 100% { transform: none; } 25% { transform: translateX(-3px); }
                    75% { transform: translateX(3px); }
                }
                /* LA CROIX DU CENTRE, posée à la fin seulement : pendant la
                   partie elle donnerait la moitie de la reponse. */
                .pw-centre::after {
                    content: ''; position: absolute; width: 10px; height: 10px;
                    border-radius: 50%; background: #22313f; opacity: .75;
                }
                .pw-centre--bord::after { transform: translate(50%, 0); }
                .pw-centre--bas::after { transform: translate(0, 50%); }
                .pw-centre--coin::after { transform: translate(50%, 50%); }
                .pw-barre { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: center; }
                .pw-btn {
                    border: none; border-radius: 999px; padding: 7px 16px;
                    background: var(--primary); color: #fff; font-weight: 700;
                    font-size: clamp(.78rem, 2.2cqh, .95rem); cursor: pointer;
                }
                .pw-btn--doux { background: var(--bg-plateau); color: var(--text-main); }
                .pw-note {
                    min-height: 2.2em; text-align: center; max-width: 52ch;
                    font-size: clamp(.76rem, 2.2cqh, .95rem); line-height: 1.35;
                }
                .pw-note--ko { color: var(--danger-texte); }
                .pw-note--ok { color: var(--success); font-weight: 700; }
            </style>
            <div class="pw-wrap">
                <p class="pw-consigne" data-consigne></p>
                <div class="pw-grille" data-grille></div>
                <div class="pw-barre">
                    <button type="button" class="pw-btn" data-verifier>Vérifier</button>
                    <button type="button" class="pw-btn pw-btn--doux" data-vider>Tout effacer</button>
                </div>
                <p class="pw-note" data-note role="status" aria-live="polite"></p>
            </div>`;

        this.ui = {
            consigne: this.container.querySelector('[data-consigne]'),
            grille: this.container.querySelector('[data-grille]'),
            note: this.container.querySelector('[data-note]')
        };
        this.container.querySelector('[data-verifier]').onclick = () => this.verifier();
        this.container.querySelector('[data-vider]').onclick = () => this.vider();

        // LE GLISSÉ, EN PLUS DU CLIC — c'est le geste du crayon de couleur, et
        // c'est celui qu'on fait naturellement au doigt. `pointerdown` puis
        // `pointerenter` : une seule logique pour la souris et le tactile.
        this.ui.grille.addEventListener('pointerdown', (e) => this.toucher(e, true));
        this.ui.grille.addEventListener('pointerenter', (e) => this.toucher(e, false), true);
        this.ui.grille.addEventListener('pointerover', (e) => {
            if (this.peint) this.toucher(e, false);
        });
        const lacher = () => { this.peint = false; };
        this.ui.grille.addEventListener('pointerup', lacher);
        this.ui.grille.addEventListener('pointercancel', lacher);
        document.addEventListener('pointerup', lacher);
        this._lacher = lacher;
    }

    startGameLoop() { this.nouvelleGrille(); }

    nouvelleGrille() {
        const P = PALIERS_PATCHWORK[this.palier];
        this.g = genererPatchwork({ rng: this.rng, ...P });
        if (!this.g) { this.note('Grille introuvable — on recommence.', 'ko'); return; }
        this.appartenance = new Array(this.g.lignes * this.g.colonnes).fill(null);
        // Le nombre appartient d'office à son morceau : sans cela, il faudrait
        // colorier la case qui porte déjà le nombre, ce qui n'apprend rien.
        this.g.morceaux.forEach(m => { this.appartenance[m.indice] = m.indice; });
        this.choisi = this.g.morceaux[0].indice;
        this.fini = false;
        this.dessiner();
        this.note('Choisis un nombre, puis colorie son morceau.', '');
    }

    couleurDe(indice) {
        const rang = this.g.morceaux.findIndex(m => m.indice === indice);
        return TISSUS[rang % TISSUS.length];
    }

    dessiner() {
        const { lignes, colonnes } = this.g;
        const N = lignes * colonnes;
        const parIndice = new Map(this.g.morceaux.map(m => [m.indice, m]));
        // La case s'adapte à la place : une grille de six colonnes sur un
        // téléphone ne doit pas déborder, et sur un tableau blanc elle a le
        // droit d'être grande.
        const cote = `min(calc((100cqh - 120px) / ${lignes}), calc((100cqw - 40px) / ${colonnes}), 64px)`;
        this.ui.grille.style.setProperty('--pw-cote', cote);
        this.ui.grille.style.gridTemplateColumns = `repeat(${colonnes}, var(--pw-cote))`;

        let html = '';
        for (let i = 0; i < N; i++) {
            const a = this.appartenance[i];
            const m = parIndice.get(i);
            const classes = ['pw-case'];
            if (m) classes.push('pw-case--nombre');
            if (m && m.indice === this.choisi) classes.push('pw-case--choisi');
            const fond = a !== null ? ` style="background:${this.couleurDe(a)}"` : '';
            html += `<div class="${classes.join(' ')}" data-i="${i}"${fond}`
                + (m ? ` role="button" tabindex="0" aria-label="Morceau de ${m.nombre} cases"` : '')
                + `>${m ? m.nombre : ''}</div>`;
        }
        this.ui.grille.innerHTML = html;

        this.majConsigne();
    }

    /**
     * REPEINDRE UNE SEULE CASE, sans refaire la grille.
     *
     * `dessiner()` remplace tout le HTML. Appelé à chaque case coloriée, il
     * DÉTACHE l'élément sous le doigt au milieu du glissé — le navigateur n'a
     * plus d'élément à qui envoyer la suite du geste, et la trace s'arrête à la
     * première case. C'est ce que la mesure a montré : dix-sept cases
     * annoncées non coloriées après en avoir peint dix-huit.
     *
     * On ne refait donc la grille entière que quand sa STRUCTURE change (une
     * nouvelle grille, un effacement complet, un changement de morceau choisi).
     */
    repeindre(i) {
        const el = this.ui.grille.querySelector(`[data-i="${i}"]`);
        if (!el) return;
        const a = this.appartenance[i];
        el.style.background = a !== null ? this.couleurDe(a) : '';
        this.majConsigne();
    }

    /** Ce qu'il reste à faire, écrit au-dessus de la grille. */
    majConsigne() {
        const reste = this.appartenance.filter(a => a === null).length;
        this.ui.consigne.textContent = reste
            ? 'Découpe la grille en morceaux qui ont un centre de symétrie. '
              + 'Le nombre dit combien son morceau a de cases. Il reste '
              + `${reste} case${reste > 1 ? 's' : ''} à colorier.`
            : 'Toutes les cases sont coloriées : vérifie ton découpage.';
    }

    /** Un doigt ou une souris sur une case. `debut` : c'est un appui, pas un passage. */
    toucher(e, debut) {
        if (this.fini || this.isDemo) return;
        const el = e.target && e.target.closest ? e.target.closest('[data-i]') : null;
        if (!el) return;
        const i = Number(el.dataset.i);
        const m = this.g.morceaux.find(x => x.indice === i);

        if (debut) {
            e.preventDefault();
            this.peint = true;
            // UN NOMBRE SE CHOISIT, IL NE SE COLORIE PAS. Toucher un nombre
            // prend son morceau en main ; sans cette règle, on effacerait le
            // nombre qu'on vient de choisir dès le premier appui.
            if (m) { this.choisi = i; this.dessiner(); return; }
        }
        if (m) return;                       // on ne repeint jamais un nombre
        if (this.choisi === null) return;

        const avant = this.appartenance[i];
        // La gomme : retoucher une case de la couleur choisie la rend blanche.
        this.appartenance[i] = (avant === this.choisi && debut) ? null : this.choisi;
        this.repeindre(i);
    }

    vider() {
        if (this.fini) return;
        this.appartenance = this.appartenance.map((a, i) =>
            this.g.morceaux.some(m => m.indice === i) ? i : null);
        this.dessiner();
        this.note('Grille effacée. Les nombres restent.', '');
    }

    verifier() {
        if (this.fini || !this.g) return;
        const bilan = verifierPatchwork(this.g, this.appartenance);
        if (bilan.ok) return this.gagner();

        this.verifs += 1;
        // ON NE DIT QU'UN PROBLÈME À LA FOIS, le premier — ils sont rangés du
        // plus terre-à-terre au plus mathématique (voir `verifierPatchwork`).
        // Trois reproches d'un coup, et l'élève ne sait plus lequel regarder.
        const p = bilan.problemes[0];
        this.note(p.message, 'ko');
        this.secouer(p.cases);
        this.onWrongAnswer(null, {
            questionText: `Patchwork ${this.g.lignes} × ${this.g.colonnes}`,
            input: `découpage refusé (${p.genre})`,
            expected: 'des morceaux qui ont tous un centre de symétrie',
            concept: COMPETENCE,
            customMessage: p.message
        });
    }

    secouer(cases) {
        (cases || []).forEach(i => {
            const el = this.ui.grille.querySelector(`[data-i="${i}"]`);
            if (el) {
                el.classList.add('pw-case--faute');
                regTimeout(() => el.classList.remove('pw-case--faute'), 320);
            }
        });
    }

    gagner() {
        this.fini = true;
        this.reussies += 1;
        this.montrerLesCentres();
        this.note('🏆 Tous les morceaux ont leur centre de symétrie.', 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Patchwork ${this.g.lignes} × ${this.g.colonnes} — `
                + `${this.g.morceaux.length} morceaux`,
            given: 'découpage juste', expected: 'découpage juste',
            points: Math.max(8, 14 - this.verifs * 2)
        });
        regTimeout(() => { if (this.isRunning) { this.verifs = 0; this.nouvelleGrille(); } }, 2800);
    }

    /**
     * LA CROIX DU CENTRE, une fois la grille finie.
     *
     * C'est le moment où l'on comprend ce qu'on vient de faire : pour les aires
     * impaires le point tombe SUR une case, pour les paires il tombe entre deux
     * cases ou à un coin de quatre. Le montrer pendant la partie donnerait la
     * réponse ; le montrer après, c'est la leçon.
     */
    montrerLesCentres() {
        const { lignes, colonnes } = this.g;
        const parMorceau = new Map();
        this.appartenance.forEach((a, i) => {
            if (a === null) return;
            if (!parMorceau.has(a)) parMorceau.set(a, []);
            parMorceau.get(a).push(i);
        });
        for (const [, cases] of parMorceau) {
            const { centre } = symetrieCentrale(cases, lignes, colonnes);
            if (!Number.isInteger(centre.r2) || !Number.isInteger(centre.c2)) continue;
            const r = Math.floor(centre.r2 / 2), c = Math.floor(centre.c2 / 2);
            const el = this.ui.grille.querySelector(`[data-i="${r * colonnes + c}"]`);
            if (!el) continue;
            el.classList.add('pw-centre');
            const surLigne = centre.r2 % 2 === 1, surColonne = centre.c2 % 2 === 1;
            if (surLigne && surColonne) el.classList.add('pw-centre--coin');
            else if (surColonne) el.classList.add('pw-centre--bord');
            else if (surLigne) el.classList.add('pw-centre--bas');
        }
    }

    note(texte, ton) {
        this.ui.note.textContent = texte || '';
        this.ui.note.className = 'pw-note' + (ton ? ` pw-note--${ton}` : '');
    }

    /**
     * LE ROBOT MONTRE LE RAISONNEMENT, pas la solution.
     *
     * Il colorie morceau par morceau, en disant à chaque fois CE QU'IL CHERCHE
     * — « quatre cases, et il faut qu'un demi-tour les remette en place ». Un
     * robot qui remplirait la grille en silence montrerait qu'on peut y arriver,
     * ce que personne ne demandait.
     */
    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => {
            cur.destroy(); gate.destroy();
            this.demoCursor = null; this.demoGate = null;
        };

        if (!this.g) this.nouvelleGrille();
        if (!await cur.pause(500) || !this.isRunning) return fin();

        cur.say('Un morceau doit retomber sur lui-m\u00eame quand on le tourne d\u2019un '
            + 'demi-tour. Le nombre dit combien il a de cases.', this.ui.grille);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        const sol = solutionDe(this.g);
        // ON NE FINIT PAS LA GRILLE À SA PLACE : trois morceaux suffisent à
        // montrer ce qu'on cherche, et le quatrième est à lui.
        for (const m of this.g.morceaux.slice(0, 3)) {
            if (!this.isRunning) return fin();
            this.choisi = m.indice;
            this.dessiner();
            const caseEl = this.ui.grille.querySelector(`[data-i="${m.indice}"]`);
            cur.say(`Celui-ci fait ${m.nombre} case${m.nombre > 1 ? 's' : ''} : je cherche `
                + 'une forme de cette aire-l\u00e0 qui ait un centre.', caseEl);
            if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();
            sol.forEach((a, i) => { if (a === m.indice) this.appartenance[i] = a; });
            this.dessiner();
            if (!await gate.wait(DEMO_SPEED.settle) || !this.isRunning) return fin();
        }
        this.montrerLesCentres();
        cur.say('Le point marque le centre : au milieu d\u2019une case pour une aire impaire, '
            + 'entre deux cases pour une aire paire.', this.ui.grille);
        if (!await gate.wait(DEMO_SPEED.between)) return fin();
        fin();
    }

    destroy() {
        if (this._lacher) document.removeEventListener('pointerup', this._lacher);
        super.destroy();
    }
}

export function enginePatchwork(container, isDemo, params) {
    const game = new Patchwork(container, isDemo, params);
    game.start();
    return game;
}
