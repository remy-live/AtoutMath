// LES CROISÉS DU CALCUL — à l'écran.
//
// Rémy, quatre pages d'un magazine de jeux à l'appui : « j'aimerais bien ces
// jeux en français et en rapport avec les maths ». Celui-ci s'appelait « Cross
// Wits ». La règle et le juge sont dans js/core/croises.js.
//
// LE GESTE EST DE POSER UN JETON. On touche un chiffre du plateau, puis la case
// où on le veut ; retoucher une case posée reprend son jeton. Deux touchers,
// jamais de glissé : sur un téléphone, faire glisser un chiffre de trois
// millimètres jusqu'à une case de huit demande une précision qu'on n'a pas
// debout dans une salle de classe.
//
// LES SIGNES NE BOUGENT PAS, et c'est délibéré. On ne demande pas de retrouver
// le « + » : un jeu où le signe manque est un jeu où l'on ne peut pas commencer,
// parce qu'aucune case ne dit rien tant que le signe n'est pas là.

import { BaseGame } from '../core/BaseGame.js';
import { regTimeout } from '../core/timers.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import { genererCroise, verifierCroise, solutionCroise, PALIERS_CROISES }
    from '../core/croises.js';

const COMPETENCE = 'num.logique.croises';

class Croises extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'croises');
        this.palier = PALIERS_CROISES[this.params.palier] ? this.params.palier : 'facile';
        this.rng = makeRng(this.params.seed || `cx${Date.now()}`);
        this.verifs = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .cx-wrap {
                    display: flex; flex-direction: column; align-items: center;
                    gap: clamp(6px, 2cqh, 16px);
                    width: 100%; height: 100%; padding: 8px; box-sizing: border-box;
                    color: var(--text-main); container-type: size;
                    user-select: none; -webkit-user-select: none; overflow: hidden;
                }
                .cx-consigne { font-size: clamp(.78rem, 2.3cqh, 1rem); text-align: center; max-width: 50ch; }
                .cx-grille { display: grid; gap: 4px; flex: 0 0 auto; }
                .cx-case {
                    width: var(--cx-cote); height: var(--cx-cote);
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 700; font-size: clamp(.9rem, 3.6cqh, 1.7rem);
                    border-radius: 6px;
                }
                .cx-case--vide { visibility: hidden; }
                .cx-case--signe { color: var(--text-muted); }
                .cx-case--fixe { background: var(--bg-plateau); color: var(--text-main); }
                .cx-case--trou {
                    background: var(--bg-panel); border: 2px dashed var(--border);
                    cursor: pointer; color: var(--text-main);
                }
                .cx-case--pose { background: #cfe3f7; border-style: solid; color: #22313f; }
                .cx-case--faute { animation: cx-secoue .3s ease; outline: 2px solid var(--danger); }
                @keyframes cx-secoue {
                    0%, 100% { transform: none; } 25% { transform: translateX(-3px); }
                    75% { transform: translateX(3px); }
                }
                .cx-plateau { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
                .cx-jeton {
                    min-width: var(--cx-cote); height: var(--cx-cote);
                    border: none; border-radius: 6px; background: #f6dda6; color: #22313f;
                    font-weight: 700; font-size: clamp(.9rem, 3.4cqh, 1.6rem); cursor: pointer;
                }
                .cx-jeton--choisi { outline: 3px solid var(--primary); }
                .cx-jeton--parti { opacity: .25; cursor: default; }
                .cx-barre { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
                .cx-btn {
                    border: none; border-radius: 999px; padding: 7px 16px;
                    background: var(--primary); color: #fff; font-weight: 700;
                    font-size: clamp(.78rem, 2.2cqh, .95rem); cursor: pointer;
                }
                .cx-btn--doux { background: var(--bg-plateau); color: var(--text-main); }
                .cx-note {
                    min-height: 2.2em; text-align: center; max-width: 52ch;
                    font-size: clamp(.74rem, 2.2cqh, .95rem); line-height: 1.35;
                }
                .cx-note--ko { color: var(--danger-texte); }
                .cx-note--ok { color: var(--success); font-weight: 700; }
            </style>
            <div class="cx-wrap">
                <p class="cx-consigne" data-consigne></p>
                <div class="cx-grille" data-grille></div>
                <div class="cx-plateau" data-plateau></div>
                <div class="cx-barre">
                    <button type="button" class="cx-btn" data-verifier>Vérifier</button>
                    <button type="button" class="cx-btn cx-btn--doux" data-vider>Tout reprendre</button>
                </div>
                <p class="cx-note" data-note role="status" aria-live="polite"></p>
            </div>`;
        this.ui = {
            consigne: this.container.querySelector('[data-consigne]'),
            grille: this.container.querySelector('[data-grille]'),
            plateau: this.container.querySelector('[data-plateau]'),
            note: this.container.querySelector('[data-note]')
        };
        this.container.querySelector('[data-verifier]').onclick = () => this.verifier();
        this.container.querySelector('[data-vider]').onclick = () => this.vider();
        this.ui.grille.onclick = (e) => {
            const el = e.target.closest('[data-i]');
            if (el) this.toucherCase(Number(el.dataset.i));
        };
        this.ui.plateau.onclick = (e) => {
            const el = e.target.closest('[data-j]');
            if (el) this.choisirJeton(Number(el.dataset.j));
        };
    }

    startGameLoop() { this.nouvelleCroix(); }

    nouvelleCroix() {
        this.g = genererCroise({ rng: this.rng, ...PALIERS_CROISES[this.palier] });
        if (!this.g) { this.note('Croix introuvable — on recommence.', 'ko'); return; }
        // `pose` : la case → le rang du jeton posé dessus. On garde le RANG et
        // non le chiffre : deux jetons peuvent porter le même chiffre, et il
        // faut pouvoir reprendre celui qu'on a posé, pas son jumeau.
        this.pose = new Map();
        this.choisi = null;
        this.fini = false;
        this.dessiner();
        this.note('Place les chiffres pour que la ligne ET la colonne soient vraies.', '');
    }

    dessiner() {
        const cote = 'min(calc((100cqh - 190px) / 5), calc((100cqw - 40px) / 5), 58px)';
        this.ui.grille.style.setProperty('--cx-cote', cote);
        this.ui.plateau.style.setProperty('--cx-cote', cote);
        this.ui.grille.style.gridTemplateColumns = 'repeat(5, var(--cx-cote))';

        let html = '';
        for (let i = 0; i < 25; i++) {
            const contenu = this.g.cases.get(i);
            if (contenu === undefined) { html += '<div class="cx-case cx-case--vide"></div>'; continue; }
            const trou = this.g.aTrouver.includes(i);
            if (!trou) {
                const signe = !/^[1-9]$/.test(contenu);
                html += `<div class="cx-case ${signe ? 'cx-case--signe' : 'cx-case--fixe'}">`
                    + `${contenu}</div>`;
                continue;
            }
            const rang = this.pose.get(i);
            const mis = rang !== undefined ? this.g.jetons[rang] : '';
            html += `<div class="cx-case cx-case--trou${mis ? ' cx-case--pose' : ''}" `
                + `data-i="${i}" role="button" tabindex="0" `
                + `aria-label="${mis ? 'Case, ' + mis : 'Case vide'}">${mis}</div>`;
        }
        this.ui.grille.innerHTML = html;

        const poses = new Set(this.pose.values());
        this.ui.plateau.innerHTML = this.g.jetons.map((j, k) => {
            const parti = poses.has(k);
            return `<button type="button" class="cx-jeton${parti ? ' cx-jeton--parti' : ''}`
                + `${this.choisi === k ? ' cx-jeton--choisi' : ''}" data-j="${k}"`
                + `${parti ? ' disabled' : ''}>${j}</button>`;
        }).join('');

        const reste = this.g.aTrouver.length - this.pose.size;
        this.ui.consigne.textContent = reste
            ? `Place les chiffres pour que la ligne ET la colonne soient vraies. `
              + `Il reste ${reste} chiffre${reste > 1 ? 's' : ''} à poser.`
            : 'Tout est posé : vérifie tes deux calculs.';
    }

    choisirJeton(k) {
        if (this.fini || this.isDemo) return;
        if ([...this.pose.values()].includes(k)) return;
        this.choisi = this.choisi === k ? null : k;
        this.dessiner();
    }

    toucherCase(i) {
        if (this.fini || this.isDemo) return;
        // Une case occupée rend son jeton : c'est la gomme, et elle ne demande
        // aucun bouton de plus.
        if (this.pose.has(i)) { this.pose.delete(i); this.dessiner(); return; }
        if (this.choisi === null) {
            this.note('Choisis d\u2019abord un chiffre en bas.', '');
            return;
        }
        this.pose.set(i, this.choisi);
        this.choisi = null;
        this.dessiner();
    }

    vider() {
        if (this.fini) return;
        this.pose = new Map();
        this.choisi = null;
        this.dessiner();
        this.note('Tous les chiffres sont revenus en bas.', '');
    }

    verifier() {
        if (this.fini || !this.g) return;
        const pose = {};
        this.pose.forEach((rang, i) => { pose[i] = this.g.jetons[rang]; });
        const bilan = verifierCroise(this.g, pose);
        if (bilan.ok) return this.gagner();

        this.verifs += 1;
        const p = bilan.problemes[0];
        this.note(p.message, 'ko');
        (p.cases || []).forEach(i => {
            const el = this.ui.grille.querySelector(`[data-i="${i}"]`);
            if (el) {
                el.classList.add('cx-case--faute');
                regTimeout(() => el.classList.remove('cx-case--faute'), 320);
            }
        });
        this.onWrongAnswer(null, {
            questionText: 'Les Croisés du Calcul',
            input: p.genre === 'vides' ? 'croix incomplète' : 'une égalité fausse',
            expected: 'deux égalités vraies',
            concept: COMPETENCE,
            customMessage: p.message
        });
    }

    gagner() {
        this.fini = true;
        this.note('🏆 Les deux calculs tombent juste.', 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: 'Les Croisés du Calcul',
            given: 'deux égalités vraies', expected: 'deux égalités vraies',
            points: Math.max(8, 14 - this.verifs * 2)
        });
        regTimeout(() => { if (this.isRunning) { this.verifs = 0; this.nouvelleCroix(); } }, 2600);
    }

    note(texte, ton) {
        this.ui.note.textContent = texte || '';
        this.ui.note.className = 'cx-note' + (ton ? ` cx-note--${ton}` : '');
    }

    /**
     * LE ROBOT MONTRE PAR OÙ COMMENCER, et c'est tout ce qui compte ici : la
     * case du CROISEMENT, qui appartient aux deux calculs. Un robot qui poserait
     * les cinq jetons dans l'ordre montrerait qu'il connaît la réponse, ce que
     * personne ne lui demandait.
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
        if (!this.g) this.nouvelleCroix();
        if (!await cur.pause(500) || !this.isRunning) return fin();

        const croisement = this.g.rangee * 5 + this.g.colonne;
        cur.say('Cette case-là est dans la ligne ET dans la colonne : son chiffre sert '
            + 'aux deux calculs. C\u2019est par elle qu\u2019on commence.',
        this.ui.grille.querySelector(`[data-i="${croisement}"]`) || this.ui.grille);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        const sol = solutionCroise(this.g);
        const deux = this.g.aTrouver.slice(0, 2);
        for (const i of deux) {
            const k = this.g.jetons.findIndex((j, n) =>
                j === sol[i] && ![...this.pose.values()].includes(n));
            if (k < 0) continue;
            this.pose.set(i, k);
            this.dessiner();
            cur.say(`Je pose le ${sol[i]} : la ligne devient vraie de ce côté-là.`,
                this.ui.grille.querySelector(`[data-i="${i}"]`));
            if (!await gate.wait(DEMO_SPEED.settle) || !this.isRunning) return fin();
        }
        cur.say('À toi : il ne reste plus qu\u2019à essayer les chiffres qui restent, '
            + 'en regardant si le calcul tombe juste.', this.ui.plateau);
        if (!await gate.wait(DEMO_SPEED.between)) return fin();
        fin();
    }

    destroy() {
        if (this.demoCursor) { this.demoCursor.destroy(); this.demoCursor = null; }
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineCroises(container, isDemo, params) {
    const game = new Croises(container, isDemo, params);
    game.start();
    return game;
}
