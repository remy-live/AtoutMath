// Le Coffre-Fort : plus / moins, et la DICHOTOMIE comme stratégie.
//
// Porté depuis l'ancien projet « Maths » (imports/maths-legacy/games/vault).
// Un code secret entre 1 et N ; chaque proposition répond « c'est plus » ou
// « c'est moins ». Ce qu'on enseigne n'est pas la chance : c'est la recherche
// dichotomique — proposer le milieu de la zone possible élimine la moitié des
// candidats à chaque essai. Le robot de démonstration la déroule en
// l'expliquant coup par coup, bulle à l'appui, avec pause et pas-à-pas.
//
// Chaque coffre est une « question » : ouvert = tentative juste (points selon
// les essais restants), alarme = tentative fausse, avec la stratégie en
// explication. Les indices de parité/multiples de l'original sont conservés.

import { BaseGame } from '../core/BaseGame.js';
import { regTimeout } from '../core/timers.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';

const SKILL = 'num.logique.dichotomie';

class Vault extends BaseGame {
    render() {
        this.maxNumber = parseInt(this.params.maxNumber) || 100;
        this.attempts = parseInt(this.params.attempts) || 10;

        this.container.innerHTML = `
            <style>
                .vault-wrapper {
                    width: 100%; max-width: 400px; margin: 12px auto;
                    background: #2c3e50; padding: 18px; border-radius: 20px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                    font-family: 'Courier New', monospace;
                    border: 4px solid #34495e; box-sizing: border-box;
                    user-select: none; -webkit-user-select: none;
                }
                .vault-header { display: flex; justify-content: space-between; color: #95a5a6; margin-bottom: 12px; font-weight: bold; font-size: 0.9rem; }
                .vault-screen {
                    background: #000; border: 4px solid #555; border-radius: 10px; padding: 12px;
                    margin-bottom: 14px; text-align: center; color: #2ecc71; text-shadow: 0 0 10px #2ecc71;
                    transition: all 0.3s; height: 96px;
                    display: flex; flex-direction: column; justify-content: center;
                }
                .vault-screen.success { background: #2ecc71; color: #fff; text-shadow: none; border-color: #fff; }
                .vault-screen.error { background: #c0392b; color: #fff; text-shadow: none; border-color: #e74c3c; }
                .vault-main { font-size: 2.6rem; font-weight: bold; letter-spacing: 5px; line-height: 1; }
                .vault-sub { font-size: 0.95rem; margin-top: 8px; min-height: 20px; }
                .vault-log {
                    background: rgba(0,0,0,0.25); height: 88px; overflow-y: auto; margin-bottom: 14px;
                    border-radius: 6px; padding: 5px; border: 1px solid #444;
                }
                .vault-log-item { display: flex; justify-content: space-between; padding: 4px 10px; border-bottom: 1px solid rgba(255,255,255,0.08); color: #fff; font-size: .95rem; }
                .vault-log-item.haut small { color: #5dade2; }
                .vault-log-item.bas small { color: #e67e22; }
                .vault-pad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
                .vault-pad button {
                    padding: 12px; font-size: 1.4rem; background: #ecf0f1; border: none;
                    border-bottom: 4px solid #bdc3c7; border-radius: 8px; cursor: pointer;
                    color: #2c3e50; font-weight: bold; transition: all 0.1s; height: 56px;
                }
                .vault-pad button:active { border-bottom-width: 0; transform: translateY(4px); }
                .vault-pad .v-ok { background: #2ecc71; border-color: #27ae60; color: white; }
                .vault-pad .v-del { background: #f1c40f; border-color: #f39c12; color: white; }
            </style>
            <div class="vault-wrapper">
                <div class="vault-header">
                    <div>Essais : <span data-lives>${this.attempts}</span></div>
                    <div>Code entre 1 et ${this.maxNumber}</div>
                </div>
                <div class="vault-screen" data-screen>
                    <div class="vault-main" data-main>_</div>
                    <div class="vault-sub" data-sub>PRÊT</div>
                </div>
                <div class="vault-log" data-log></div>
                <div class="vault-pad" data-pad>
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button type="button" data-k="${n}">${n}</button>`).join('')}
                    <button type="button" class="v-del" data-k="←">⌫</button>
                    <button type="button" data-k="0">0</button>
                    <button type="button" class="v-ok" data-k="OK">OK</button>
                </div>
            </div>`;

        this.ui = {
            lives: this.container.querySelector('[data-lives]'),
            screen: this.container.querySelector('[data-screen]'),
            main: this.container.querySelector('[data-main]'),
            sub: this.container.querySelector('[data-sub]'),
            log: this.container.querySelector('[data-log]')
        };

        this.container.querySelector('[data-pad]').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-k]');
            if (btn) this.touche(btn.dataset.k);
        });

        this.newRound();
    }

    startGameLoop() { /* jeu à événements : rien à animer en continu */ }

    newRound() {
        this.secret = Math.floor(Math.random() * this.maxNumber) + 1;
        this.saisie = '';
        this.restants = this.attempts;
        // Bornes CONNUES d'après les réponses : c'est la zone que la
        // dichotomie resserre, et ce que le robot montre.
        this.borneMin = 1;
        this.borneMax = this.maxNumber;
        this.finDeCoffre = false;
        this.ui.lives.textContent = this.restants;
        this.ui.log.innerHTML = '';
        this.ui.screen.classList.remove('success', 'error');
        this.ecran('_', 'ENTRER CODE');
    }

    ecran(main, sub) {
        this.ui.main.textContent = main;
        if (sub !== undefined) this.ui.sub.textContent = sub;
    }

    touche(k) {
        if (this.finDeCoffre || (this.isDemo && !this.demoTape)) return;
        if (k === '←') {
            this.saisie = this.saisie.slice(0, -1);
            this.ecran(this.saisie || '_');
        } else if (k === 'OK') {
            if (this.saisie !== '') this.proposer(parseInt(this.saisie, 10));
        } else if (this.saisie.length < 4) {
            this.saisie += k;
            this.ecran(this.saisie);
        }
    }

    proposer(valeur) {
        this.saisie = '';
        this.restants--;
        this.ui.lives.textContent = this.restants;

        if (valeur === this.secret) return this.ouvert();

        const plusGrand = valeur < this.secret;
        if (plusGrand) this.borneMin = Math.max(this.borneMin, valeur + 1);
        else this.borneMax = Math.min(this.borneMax, valeur - 1);

        this.ecran('_', plusGrand ? "C'EST PLUS (+)" : "C'EST MOINS (−)");
        const item = document.createElement('div');
        item.className = `vault-log-item ${plusGrand ? 'haut' : 'bas'}`;
        item.innerHTML = `<span>${valeur}</span><small>${plusGrand ? '⬆️ plus grand' : '⬇️ plus petit'}</small>`;
        this.ui.log.insertBefore(item, this.ui.log.firstChild);

        if (this.restants <= 0) return this.alarme();

        // Indices mathématiques de l'original : tous les 3 essais, la parité
        // ou un multiple — une raison de plus de calculer plutôt que deviner.
        const faits = this.attempts - this.restants;
        if (faits % 3 === 0 && !this.isDemo) {
            let indice = this.secret % 2 === 0 ? 'Indice : le code est PAIR' : 'Indice : le code est IMPAIR';
            if (this.maxNumber > 50 && this.secret % 5 === 0) indice = 'Indice : multiple de 5';
            else if (this.maxNumber > 50 && this.secret % 3 === 0) indice = 'Indice : multiple de 3';
            regTimeout(() => { if (!this.finDeCoffre) this.ecran('_', indice); }, 1500);
        }
    }

    ouvert() {
        this.finDeCoffre = true;
        this.ecran(this.secret, 'CODE CORRECT ! 🔓');
        this.ui.screen.classList.add('success');
        const pts = 10 + this.restants * 2;
        this.onCorrectAnswer(null, SKILL, {
            points: pts,
            questionText: `Code secret (1–${this.maxNumber})`,
            given: this.secret,
            expected: this.secret
        });
        // Un coffre ouvert vite agrandit le suivant : la difficulté suit la
        // réussite, comme dans l'original.
        if (this.restants >= this.attempts - 4 && this.maxNumber < 1000) {
            this.maxNumber = Math.min(1000, this.maxNumber * 2);
        }
        regTimeout(() => { if (this.isRunning) this.newRound(); }, 2200);
    }

    alarme() {
        this.finDeCoffre = true;
        this.ecran(this.secret, 'ALARME ! 🚨');
        this.ui.screen.classList.add('error');
        this.onWrongAnswer(null, {
            questionText: `Code secret (1–${this.maxNumber})`,
            input: '(essais épuisés)',
            expected: this.secret,
            concept: SKILL,
            customMessage: `Le code était ${this.secret}. Stratégie gagnante : propose toujours le MILIEU de la zone possible — chaque réponse « plus » ou « moins » élimine la moitié des nombres.`
        });
        regTimeout(() => { if (this.isRunning) this.newRound(); }, 2600);
    }

    /**
     * Démonstration : le robot déroule la recherche dichotomique en tapant
     * réellement sur le clavier du coffre, et explique chaque proposition —
     * la zone possible, le milieu, ce que la réponse élimine.
     */
    async runDemoSequence() {
        const cursor = createDemoCursor();
        this.demoCursor = cursor;
        const gate = createDemoGate(this.container.querySelector('.vault-wrapper') || this.container);
        const fin = () => { cursor.hideBubble(); gate.destroy(); };

        const tape = async (texte) => {
            this.demoTape = true;
            for (const c of String(texte)) {
                const btn = this.container.querySelector(`[data-k="${c}"]`);
                if (!btn || !await cursor.tap(btn, 320)) { this.demoTape = false; return false; }
                this.touche(c);
            }
            const ok = this.container.querySelector('[data-k="OK"]');
            if (!ok || !await cursor.tap(ok, 320)) { this.demoTape = false; return false; }
            // Le tap du curseur est un geste montré, pas un vrai clic : la
            // validation logique s'appelle explicitement.
            this.touche('OK');
            this.demoTape = false;
            return true;
        };

        if (!await cursor.pause(800) || !this.isRunning) return fin();

        while (this.isRunning && this.isDemo) {
            if (this.finDeCoffre) { await cursor.pause(1200); continue; }
            if (!await gate.waitTurn() || !this.isRunning) return fin();

            const milieu = Math.floor((this.borneMin + this.borneMax) / 2);
            const nb = this.borneMax - this.borneMin + 1;
            cursor.say(
                this.borneMin === 1 && this.borneMax === this.maxNumber
                    ? `Le code est entre 1 et ${this.maxNumber}. Je propose le MILIEU : ${milieu}. Quelle que soit la réponse, j'élimine la moitié des ${nb} possibilités.`
                    : `La zone possible est ${this.borneMin}–${this.borneMax} (${nb} nombre${nb > 1 ? 's' : ''}). Milieu : ${milieu}.`,
                this.ui.screen
            );
            const avantMin = this.borneMin, avantMax = this.borneMax;
            this.demoTape = true;
            if (!await tape(milieu)) return fin();
            if (this.finDeCoffre) {
                cursor.say(`Trouvé en ${this.attempts - this.restants} essai${this.attempts - this.restants > 1 ? 's' : ''} ! La dichotomie trouve toujours le code en moins de ${Math.ceil(Math.log2(this.maxNumber)) + 1} essais.`, this.ui.screen);
                if (!await cursor.pause(DEMO_SPEED.between + 1400)) return fin();
                continue;
            }
            const elimines = (avantMax - avantMin + 1) - (this.borneMax - this.borneMin + 1);
            cursor.say(`« ${this.ui.sub.textContent.includes('PLUS (+)') ? "C'est plus" : "C'est moins"} » : j'élimine ${elimines} nombres d'un coup. Reste ${this.borneMin}–${this.borneMax}.`, this.ui.screen);
            if (!await cursor.pause(1600) || !this.isRunning) return fin();
        }
        fin();
    }

    destroy() {
        if (this.demoCursor) { this.demoCursor.destroy(); this.demoCursor = null; }
        super.destroy();
    }
}

export function engineVault(container, isDemo, params) {
    const game = new Vault(container, isDemo, params, 'calc-vault');
    game.start();
    return game;
}
