// LA DICTÉE DE NOMBRES — on entend, on écrit.
//
// Un nombre écrit se recopie ; un nombre ENTENDU se reconstruit. « Quatre-vingt
// mille douze » oblige à décider seul où sont les milliers et combien de zéros
// il faut poser, et c'est exactement la difficulté des grands nombres que
// l'écrit escamote.
//
// Trois choix qui font la différence entre un exercice et une punition :
//
//   ON PEUT RÉÉCOUTER AUTANT QU'ON VEUT. Une dictée dont on n'entend pas un
//   morceau ne mesure plus rien. Le nombre de réécoutes est simplement noté.
//   ON RALENTIT SI ON VEUT. Le débit par défaut de la synthèse est trop rapide
//   pour un nombre à six chiffres.
//   ON MONTRE LE NOMBRE EN LETTRES à la correction, jamais avant : c'est là
//   qu'on voit ce qu'on avait mal entendu.
//
// Si la synthèse vocale n'existe pas sur l'appareil, l'exercice le DIT et
// bascule sur les lettres écrites — un exercice qui s'ouvre muet est un
// cul-de-sac.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import { spellInteger, formatFr } from '../core/numberWords.js';
import { voixDisponible, preparerVoix, parler, taire, aDire, debit, setDebit } from '../core/voix.js';

const PALIERS = {
    milliers: { label: 'Jusqu\'à 99 999', min: 1000, max: 99999 },
    grands: { label: 'Jusqu\'à 999 999', min: 10000, max: 999999 },
    millions: { label: 'Jusqu\'aux millions', min: 100000, max: 9999999 }
};

class Dictee extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'dictee');
        this.palier = PALIERS[this.params.palier] ? this.params.palier : 'milliers';
        this.rng = makeRng(this.params.seed);
        this.score = 0;
        this.poses = 0;
        this.ecoutes = 0;
        this.muet = !voixDisponible();
    }

    render() {
        this.container.innerHTML = `
            <style>
                .di-wrap {
                    display: flex; flex-direction: column; align-items: center;
                    justify-content: center; gap: 14px; height: 100%; width: 100%;
                    color: var(--text-main); user-select: none; -webkit-user-select: none;
                }
                .di-consigne { font-weight: 700; font-size: clamp(14px, 3.4cqw, 20px); text-align: center; }
                .di-haut-parleur {
                    width: clamp(96px, 26cqw, 168px); height: clamp(96px, 26cqw, 168px);
                    border-radius: 50%; border: none; cursor: pointer;
                    background: linear-gradient(160deg, var(--primary), var(--primary-hover));
                    color: #fff; font-size: clamp(38px, 11cqw, 70px);
                    box-shadow: 0 6px 0 rgba(0,0,0,.22), 0 10px 24px rgba(15,23,42,.22);
                    transition: transform .12s;
                }
                .di-haut-parleur:active { transform: translateY(4px); box-shadow: 0 2px 0 rgba(0,0,0,.22); }
                .di-haut-parleur--parle { animation: di-onde 1s ease-in-out infinite; }
                @keyframes di-onde { 50% { box-shadow: 0 6px 0 rgba(0,0,0,.22), 0 0 0 16px color-mix(in srgb, var(--primary) 22%, transparent); } }
                /* Sans voix, le nombre s'écrit EN LETTRES : l'exercice change
                   de nature mais reste faisable. Un écran muet sans issue,
                   non. */
                .di-lettres {
                    font-size: clamp(17px, 4.4cqw, 30px); font-weight: 800;
                    text-align: center; max-width: 620px; line-height: 1.3;
                }
                .di-barre { display: flex; gap: 9px; align-items: center; flex-wrap: wrap; justify-content: center; }
                .di-btn {
                    border: 1px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); border-radius: 9px; cursor: pointer;
                    font: inherit; font-weight: 600; font-size: 13px; padding: 6px 12px;
                }
                .di-btn:hover { background: var(--bg-hover); }
                .di-btn--on { border-color: var(--primary); color: var(--primary); }
                .di-champ {
                    font-size: clamp(24px, 7cqw, 44px); font-weight: 900;
                    letter-spacing: 2px; min-width: 5ch; text-align: center;
                    padding: 6px 18px; border-radius: 12px;
                    border: 3px solid var(--border); background: var(--bg-panel);
                    font-variant-numeric: tabular-nums;
                }
                .di-champ--juste { border-color: var(--success); color: var(--success); }
                .di-champ--faux { border-color: var(--danger); color: var(--danger); }
                .di-pave { display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; width: min(330px, 88cqw); }
                .di-touche {
                    padding: 11px 0; border-radius: 10px; border: 2px solid var(--border);
                    background: var(--bg-panel); color: var(--text-main);
                    font-size: 1.1rem; font-weight: 800; font-family: inherit; cursor: pointer;
                }
                .di-touche:active { transform: scale(.94); }
                .di-note { min-height: 3em; text-align: center; max-width: 620px;
                    font-size: clamp(12px, 2.8cqw, 15px); line-height: 1.35; color: var(--text-muted); }
                .di-note b { color: var(--text-main); }
                .di-fin { display: inline-block; padding: 5px 13px; border-radius: 999px; font-weight: 700; }
                .di-fin--ok { background: color-mix(in srgb, var(--success) 20%, transparent); color: var(--success); }
                .di-fin--ko { background: color-mix(in srgb, var(--danger) 18%, transparent); color: var(--danger); }
            </style>
            <div class="di-wrap">
                <div class="di-consigne">${this.muet
                    ? 'Ton appareil n\'a pas de voix : lis le nombre en lettres et écris-le en chiffres.'
                    : 'Écoute le nombre, puis écris-le en chiffres.'}</div>
                ${this.muet
                    ? '<div class="di-lettres" data-lettres></div>'
                    : '<button type="button" class="di-haut-parleur" data-ecouter aria-label="Écouter le nombre">🔊</button>'}
                <div class="di-barre">
                    ${this.muet ? '' : '<button type="button" class="di-btn" data-lent>🐢 Plus lentement</button>'}
                    <span data-score></span>
                </div>
                <div class="di-champ" data-champ>?</div>
                <div class="di-pave">
                    ${['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '⌫', 'OK'].map(k =>
            `<button type="button" class="di-touche${k === 'OK' ? ' di-touche--ok' : ''}" data-touche="${k}">${k}</button>`).join('')}
                </div>
                <p class="di-note" data-note></p>
            </div>`;

        this.champ = this.container.querySelector('[data-champ]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.scoreEl = this.container.querySelector('[data-score]');
        this.lettresEl = this.container.querySelector('[data-lettres]');
        this.btnEcouter = this.container.querySelector('[data-ecouter]');

        if (this.btnEcouter) this.btnEcouter.addEventListener('click', () => this.dire());
        const lent = this.container.querySelector('[data-lent]');
        if (lent) lent.addEventListener('click', () => {
            const v = debit() <= 0.7 ? 0.85 : 0.6;
            setDebit(v);
            lent.classList.toggle('di-btn--on', v < 0.8);
            lent.textContent = v < 0.8 ? '🐢 Lent' : '🐢 Plus lentement';
            this.dire();
        });
        this.container.querySelectorAll('[data-touche]').forEach(t => {
            t.addEventListener('click', () => this.frappe(t.dataset.touche));
        });
        this.surTouche = (e) => {
            if (!this.isRunning || this.isDemo) return;
            if (/^[0-9]$/.test(e.key)) this.frappe(e.key);
            else if (e.key === 'Backspace') this.frappe('⌫');
            else if (e.key === 'Enter') this.frappe('OK');
            else return;
            e.preventDefault();
        };
        document.addEventListener('keydown', this.surTouche);

        // PLUTÔT MUET QU'ANGLAIS. La synthèse existe sur presque tous les
        // appareils, mais pas toujours avec une voix française : le nombre se
        // disait alors avec l'accent du système, et « quatre-vingt-treize mille »
        // devenait inaudible. Dès qu'on sait qu'aucune voix française n'est
        // installée, on bascule sur la lecture en lettres, qui fait le même
        // exercice sans faire semblant.
        if (!this.muet) preparerVoix().then(v => { if (!v) this.sansVoix(); });
        this.question();
    }

    startGameLoop() { /* Au rythme de l'élève : rien à animer. */ }

    question() {
        const p = PALIERS[this.palier];
        this.valeur = this.rng.int(p.min, p.max);
        this.saisie = '';
        this.ecoutesQuestion = 0;
        this.champ.className = 'di-champ';
        this.peindre();
        this.majScore();
        if (this.lettresEl) this.lettresEl.textContent = spellInteger(this.valeur);
        this.note(this.muet
            ? 'Écris ce nombre en chiffres.'
            : 'Appuie sur le haut-parleur pour entendre le nombre. Tu peux le réécouter autant de fois que tu veux.');
        if (!this.muet && !this.isDemo) this.dire();
    }

    /** Aucune voix française : le haut-parleur cède la place au nombre en lettres. */
    sansVoix() {
        if (this.muet || !this.container.isConnected) return;
        this.muet = true;
        taire();
        const consigne = this.container.querySelector('.di-consigne');
        if (consigne) {
            consigne.textContent = 'Aucune voix française n\'est installée sur cet appareil : '
                + 'lis le nombre en lettres et écris-le en chiffres.';
        }
        if (this.btnEcouter) {
            const lettres = document.createElement('div');
            lettres.className = 'di-lettres';
            lettres.setAttribute('data-lettres', '');
            this.btnEcouter.replaceWith(lettres);
            this.lettresEl = lettres;
            this.btnEcouter = null;
        }
        const lent = this.container.querySelector('[data-lent]');
        if (lent) lent.remove();
        if (this.lettresEl && this.valeur) this.lettresEl.textContent = spellInteger(this.valeur);
        this.note('Écris ce nombre en chiffres.');
    }

    async dire() {
        if (this.muet || !this.valeur) return;
        this.ecoutes++;
        this.ecoutesQuestion++;
        if (this.btnEcouter) this.btnEcouter.classList.add('di-haut-parleur--parle');
        await parler(aDire(this.valeur));
        if (this.btnEcouter) this.btnEcouter.classList.remove('di-haut-parleur--parle');
    }

    frappe(k) {
        if (!this.isRunning || this.fige) return;
        if (k === '⌫') this.saisie = this.saisie.slice(0, -1);
        else if (k === 'OK') return this.valider();
        else if (this.saisie.length < 8) this.saisie += k;
        this.peindre();
    }

    peindre() {
        this.champ.textContent = this.saisie === '' ? '?' : formatFr(Number(this.saisie));
    }

    valider() {
        if (this.saisie === '') return;
        const donne = Number(this.saisie);
        const juste = donne === this.valeur;
        this.poses++;
        this.fige = true;
        taire();

        if (juste) {
            this.score++;
            this.champ.classList.add('di-champ--juste');
            this.note(`✅ <b>${formatFr(this.valeur)}</b> — ${spellInteger(this.valeur)}`, 'ok');
            this.onCorrectAnswer(null, 'num.ecriture.lettres', {
                points: this.ecoutesQuestion <= 1 ? 15 : 10,
                questionText: `Dictée : ${spellInteger(this.valeur)}`,
                given: String(donne), expected: this.valeur
            });
        } else {
            this.champ.classList.add('di-champ--faux');
            // La correction montre le nombre EN LETTRES à côté des chiffres :
            // c'est la comparaison des deux qui révèle ce qu'on avait mal
            // entendu — un millier pris pour une centaine, un zéro oublié.
            this.note(`On avait dit <b>${spellInteger(this.valeur)}</b>, qui s'écrit <b>${formatFr(this.valeur)}</b>. `
                + `Tu as écrit ${formatFr(donne)}.`, 'ko');
            this.onWrongAnswer(null, {
                concept: 'num.ecriture.lettres',
                questionText: `Dictée : ${spellInteger(this.valeur)}`,
                input: String(donne), expected: this.valeur,
                customMessage: `${spellInteger(this.valeur)} s'écrit ${formatFr(this.valeur)}.`,
                silencieux: true
            });
        }
        this.majScore();
        this.timerId = setTimeout(() => {
            this.fige = false;
            if (this.isRunning) this.question();
        }, juste ? 1500 : 3200);
    }

    majScore() {
        if (this.scoreEl) {
            this.scoreEl.textContent = `${this.score} / ${this.poses}`
                + (this.ecoutes > this.poses ? ` · ${this.ecoutes} écoutes` : '');
        }
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = ton ? `<span class="di-fin di-fin--${ton}">${html}</span>` : html;
    }

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!await cur.pause(600) || !this.isRunning) return fin();
        cur.say('Ici, le nombre n\'est pas écrit : il est DIT. Il faut le reconstruire — combien de milliers, combien de centaines, et surtout où sont les zéros.', this.container);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        if (this.btnEcouter) {
            cur.say('J\'appuie sur le haut-parleur. On peut réécouter autant de fois qu\'on veut : une dictée dont on n\'entend pas un morceau ne mesure rien.', this.btnEcouter);
            if (!await cur.tap(this.btnEcouter)) return fin();
            await this.dire();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say(`J'ai entendu « ${spellInteger(this.valeur)} ». Je pose donc ${formatFr(this.valeur)}.`, this.champ);
        if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();

        for (const c of String(this.valeur)) {
            const t = this.container.querySelector(`[data-touche="${c}"]`);
            if (t && !await cur.tap(t)) return fin();
            this.frappe(c);
        }
        const ok = this.container.querySelector('[data-touche="OK"]');
        if (ok && !await cur.tap(ok)) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('La correction montre le nombre en lettres À CÔTÉ des chiffres : c\'est en comparant les deux qu\'on voit ce qu\'on avait mal entendu.', this.container);
        if (!await cur.pause(DEMO_SPEED.between)) return fin();
        fin();
    }

    destroy() {
        taire();
        if (this.surTouche) document.removeEventListener('keydown', this.surTouche);
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineDictee(container, isDemo, params) {
    const jeu = new Dictee(container, isDemo, params);
    jeu.start();
    return jeu;
}
