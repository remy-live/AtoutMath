// Le Samouraï des Fractions : rendre une fraction irréductible.
//
// Porté depuis l'ancien projet (imports/maths-legacy/games/fractions). On
// décompose le numérateur et le dénominateur en produits (36/48 = 12×3 / 12×4),
// puis on BARRE le facteur commun d'un coup de sabre — le geste même de la
// simplification écrite au tableau. Cinq rangs de samouraï : divisieur simple
// (tables de 2, 5, 10), décomposition libre, grands nombres en plusieurs
// étapes, pièges (fractions déjà irréductibles → bouclier), puis le chrono.
//
// Chaque fraction menée à l'irréductible est une réussite sur la compétence
// num.frac.simplification ; chaque erreur est expliquée (mauvais diviseur,
// produit faux, piège manqué). Le robot cherche le facteur commun à voix
// haute, remplit la décomposition, barre les facteurs — pause et pas-à-pas.

import { BaseGame } from '../core/BaseGame.js';
import { regTimeout } from '../core/timers.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';

const SKILL = 'num.frac.simplification';

const NIVEAUX = {
    1: { nom: "L'Apprenti", mode: 'simple', facteurs: [2, 5, 10], pieges: false, chrono: false },
    2: { nom: 'Le Forgeron', mode: 'decompose', facteurs: [2, 3, 4, 5, 6, 8, 9], pieges: false, chrono: false },
    3: { nom: 'Le Voyageur', mode: 'decompose', facteurs: [6, 8, 9, 10, 12, 15, 20], pieges: false, chrono: false },
    4: { nom: 'Le Gardien', mode: 'decompose', facteurs: [3, 4, 5, 6, 7, 8, 9], pieges: true, chrono: false },
    5: { nom: 'Maître Samouraï', mode: 'decompose', facteurs: [2, 3, 4, 5, 6, 7, 8, 9, 11, 12], pieges: true, chrono: true }
};

const pgcd = (a, b) => b === 0 ? a : pgcd(b, a % b);

class FracSamurai extends BaseGame {
    render() {
        this.level = Math.min(5, Math.max(1, parseInt(this.params.startLevel) || 1));
        this.goal = parseInt(this.params.goal) || 4;
        this.score = 0;
        this.victoires = 0;

        this.container.innerHTML = `
            <style>
                .sam-wrap { height: 100%; display: flex; flex-direction: column; background: linear-gradient(160deg, #1a1a2e, #2d1b36); font-family: 'Outfit', sans-serif; overflow: auto; }
                .sam-top { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; color: #fff; flex-wrap: wrap; gap: 6px; }
                .sam-rang { font-weight: 900; font-size: 1.1rem; color: #fcc419; }
                .sam-score { font-weight: 700; }
                .sam-prog { height: 6px; background: rgba(255,255,255,.12); margin: 0 16px; border-radius: 3px; overflow: hidden; }
                .sam-prog-fill { height: 100%; width: 0; background: #fcc419; transition: width .4s; }
                .sam-timer { height: 8px; background: rgba(255,255,255,.12); margin: 8px 16px 0; border-radius: 4px; overflow: hidden; display: none; }
                .sam-timer-bar { height: 100%; width: 100%; background: linear-gradient(90deg, #ff6b6b, #fcc419); }
                .sam-card { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); border-radius: 16px; margin: 14px 16px; padding: 18px 12px; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; transition: transform .08s, border-color .3s; min-height: 220px; }
                .sam-eq { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; justify-content: center; }
                .sam-frac { display: flex; flex-direction: column; align-items: center; gap: 4px; }
                .sam-num, .sam-den { font-size: 2rem; font-weight: 900; color: #fff; display: flex; align-items: center; gap: 6px; }
                .sam-bar { width: 100%; min-width: 56px; height: 4px; background: #fff; border-radius: 2px; }
                .sam-egal { font-size: 2rem; color: #fcc419; font-weight: 900; }
                .sam-mini { width: 54px; height: 46px; font-size: 1.3rem; text-align: center; border-radius: 8px; border: 2px solid rgba(255,255,255,.3); background: rgba(0,0,0,.3); color: #fff; font-weight: 700; }
                .sam-mini:focus { outline: none; border-color: #fcc419; }
                .sam-fois { color: #aaa; font-size: 1.3rem; }
                .sam-msg { min-height: 1.6em; font-size: 1.02rem; font-weight: 700; text-align: center; padding: 0 10px; }
                .sam-msg.ok { color: #51cf66; } .sam-msg.ko { color: #ff6b6b; } .sam-msg.info { color: #74c0fc; }
                .sam-controls { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
                .sam-btn { border: none; border-radius: 10px; padding: 12px 22px; font-size: 1.05rem; font-weight: 900; cursor: pointer; box-shadow: 0 3px 0 rgba(0,0,0,.4); font-family: inherit; }
                .sam-btn:active { transform: translateY(3px); box-shadow: none; }
                .sam-ok { background: #fcc419; color: #1a1a2e; }
                .sam-shield { background: #364fc7; color: #fff; }
                .sam-input1 { width: 90px; height: 50px; font-size: 1.5rem; text-align: center; border-radius: 10px; border: 2px solid rgba(255,255,255,.3); background: rgba(0,0,0,.3); color: #fff; font-weight: 900; }
                .sam-input1:focus { outline: none; border-color: #fcc419; }
                .sam-facteur { padding: 0 4px; position: relative; }
                .sam-cible { cursor: pointer; border-radius: 6px; }
                .sam-cible:hover { background: rgba(252,196,25,.25); }
                .sam-barre { color: #888; }
                .sam-barre::after { content: ''; position: absolute; left: -4px; right: -4px; top: 50%; height: 4px; background: #ff6b6b; border-radius: 2px; transform: rotate(-18deg); box-shadow: 0 0 8px #ff6b6b; }
            </style>
            <div class="sam-wrap">
                <div class="sam-top">
                    <span>⚔️ Samouraï des Fractions</span>
                    <span class="sam-rang" data-rang></span>
                    <span class="sam-score">Score : <b data-score>0</b></span>
                </div>
                <div class="sam-prog"><div class="sam-prog-fill" data-prog></div></div>
                <div class="sam-timer" data-timer><div class="sam-timer-bar" data-timer-bar></div></div>
                <div class="sam-card" data-card>
                    <div class="sam-eq" data-eq></div>
                    <div class="sam-msg" data-msg></div>
                    <div class="sam-controls" data-controls></div>
                </div>
            </div>`;

        this.ui = {
            rang: this.container.querySelector('[data-rang]'),
            score: this.container.querySelector('[data-score]'),
            prog: this.container.querySelector('[data-prog]'),
            timer: this.container.querySelector('[data-timer]'),
            timerBar: this.container.querySelector('[data-timer-bar]'),
            card: this.container.querySelector('[data-card]'),
            eq: this.container.querySelector('[data-eq]'),
            msg: this.container.querySelector('[data-msg]'),
            controls: this.container.querySelector('[data-controls]')
        };

        // Entrée = le bouton principal, comme au clavier d'une calculatrice.
        this.onKey = (e) => {
            if (e.key === 'Enter' && !this.isDemo) {
                const btn = this.container.querySelector('.sam-ok');
                if (btn) btn.click();
            }
        };
        document.addEventListener('keydown', this.onKey);
        this.majTete();
    }

    startGameLoop() {
        this.nouvelleFraction();
    }

    majTete() {
        this.ui.rang.textContent = `Niv ${this.level} — ${NIVEAUX[this.level].nom}`;
        this.ui.score.textContent = this.score;
        this.ui.prog.style.width = (this.victoires / this.goal * 100) + '%';
        this.ui.timer.style.display = NIVEAUX[this.level].chrono ? 'block' : 'none';
    }

    message(txt, cls) {
        this.ui.msg.textContent = txt;
        this.ui.msg.className = 'sam-msg ' + (cls || '');
    }

    secousse() {
        this.ui.card.style.transform = 'translateX(10px)';
        regTimeout(() => { if (this.ui.card) this.ui.card.style.transform = 'translateX(-10px)'; }, 60);
        regTimeout(() => { if (this.ui.card) this.ui.card.style.transform = ''; }, 120);
    }

    // --- Tirage -------------------------------------------------------------

    nouvelleFraction() {
        if (!this.isRunning) return;
        clearInterval(this.timerInterval);
        const cfg = NIVEAUX[this.level];
        this.estIrreductible = false;

        if (cfg.pieges && Math.random() < 0.3) {
            // Piège : deux nombres premiers entre eux — il n'y a RIEN à couper.
            this.estIrreductible = true;
            const premiers = [2, 3, 5, 7, 11, 13, 17, 19];
            let p1 = premiers[Math.floor(Math.random() * premiers.length)];
            let p2 = premiers[Math.floor(Math.random() * premiers.length)];
            while (p1 === p2) p2 = premiers[Math.floor(Math.random() * premiers.length)];
            if (Math.random() > 0.5) { p1 = Math.floor(Math.random() * 15) + 4; p2 = p1 + 1; }
            this.num = p1; this.den = p2;
        } else {
            const f = cfg.facteurs[Math.floor(Math.random() * cfg.facteurs.length)];
            let m1 = Math.floor(Math.random() * 9) + 2;
            let m2 = Math.floor(Math.random() * 9) + 2;
            while (m1 === m2) m2 += 1;
            if (Math.random() > 0.6) { m1 *= 2; m2 *= 2; }
            this.num = f * m1;
            this.den = f * m2;
        }
        if (this.num > this.den) [this.num, this.den] = [this.den, this.num];
        this.fractionDepart = `${this.num}/${this.den}`;

        this.montrerSaisie();
        if (cfg.chrono && !this.isDemo) this.lancerChrono();
    }

    montrerSaisie() {
        const cfg = NIVEAUX[this.level];
        this.message('');
        if (cfg.mode === 'simple') {
            this.ui.eq.innerHTML = `
                <div class="sam-frac"><div class="sam-num">${this.num}</div><div class="sam-bar"></div><div class="sam-den">${this.den}</div></div>`;
            this.ui.controls.innerHTML = `
                <input type="number" class="sam-input1" data-simple placeholder="?" autocomplete="off">
                <button type="button" class="sam-btn sam-ok" data-couper>⚔️ Couper</button>`;
            this.ui.controls.querySelector('[data-couper]').onclick = () => this.verifierSimple();
            this.message('Trouve un diviseur commun aux deux nombres.', 'info');
            if (!this.isDemo) regTimeout(() => this.ui.controls.querySelector('[data-simple]')?.focus(), 60);
        } else {
            this.ui.eq.innerHTML = `
                <div class="sam-frac"><div class="sam-num">${this.num}</div><div class="sam-bar"></div><div class="sam-den">${this.den}</div></div>
                <div class="sam-egal">=</div>
                <div class="sam-frac">
                    <div class="sam-num"><input class="sam-mini" data-n1 type="number"><span class="sam-fois">×</span><input class="sam-mini" data-n2 type="number"></div>
                    <div class="sam-bar"></div>
                    <div class="sam-den"><input class="sam-mini" data-d1 type="number"><span class="sam-fois">×</span><input class="sam-mini" data-d2 type="number"></div>
                </div>`;
            let html = `<button type="button" class="sam-btn sam-ok" data-verifier>⚔️ Vérifier</button>`;
            if (cfg.pieges) html += `<button type="button" class="sam-btn sam-shield" data-bouclier>🛡️ Irréductible</button>`;
            this.ui.controls.innerHTML = html;
            this.ui.controls.querySelector('[data-verifier]').onclick = () => this.verifierDecomposition();
            const bouclier = this.ui.controls.querySelector('[data-bouclier]');
            if (bouclier) bouclier.onclick = () => this.utiliserBouclier();
            this.message('Décompose chaque nombre pour faire apparaître un facteur commun.', 'info');
            if (!this.isDemo) regTimeout(() => this.ui.eq.querySelector('[data-n1]')?.focus(), 60);
        }
    }

    // --- Validation ---------------------------------------------------------

    verifierSimple() {
        const inp = this.ui.controls.querySelector('[data-simple]');
        const val = parseInt(inp.value, 10);
        if (!val) return;
        if (val > 1 && this.num % val === 0 && this.den % val === 0) {
            this.facteurCommun = val;
            this.phaseSabre(val, this.num / val, val, this.den / val);
        } else {
            this.message(`${val} ne divise pas les deux nombres à la fois.`, 'ko');
            this.secousse();
            this.onWrongAnswer(null, {
                questionText: `Simplifier ${this.fractionDepart}`,
                input: val, expected: `un diviseur commun de ${this.num} et ${this.den}`,
                concept: SKILL,
                customMessage: `${val} n'est pas un diviseur commun : il faut un nombre qui divise ${this.num} ET ${this.den}. Pense aux tables : ${this.num} et ${this.den} y apparaissent-ils tous les deux ?`
            });
            inp.value = ''; inp.focus();
        }
    }

    verifierDecomposition() {
        if (this.estIrreductible) {
            this.message('Piège ! Elle est déjà irréductible : il fallait le bouclier 🛡️.', 'ko');
            this.secousse();
            this.score = Math.max(0, this.score - 5);
            this.majTete();
            this.onWrongAnswer(null, {
                questionText: `Simplifier ${this.fractionDepart}`,
                input: 'décomposition', expected: 'irréductible',
                concept: SKILL,
                customMessage: `${this.num} et ${this.den} n'ont aucun diviseur commun (à part 1) : la fraction ${this.fractionDepart} est déjà irréductible. Quand rien ne se simplifie, lève le bouclier !`
            });
            return;
        }
        const lire = (sel) => parseInt(this.ui.eq.querySelector(sel).value, 10);
        const n1 = lire('[data-n1]'), n2 = lire('[data-n2]'), d1 = lire('[data-d1]'), d2 = lire('[data-d2]');
        if (!n1 || !n2 || !d1 || !d2) return;

        if (n1 * n2 !== this.num || d1 * d2 !== this.den) {
            const faux = n1 * n2 !== this.num
                ? `${n1} × ${n2} = ${n1 * n2}, pas ${this.num}` : `${d1} × ${d2} = ${d1 * d2}, pas ${this.den}`;
            this.message('Erreur de calcul dans la décomposition.', 'ko');
            this.secousse();
            this.onWrongAnswer(null, {
                questionText: `Décomposer ${this.fractionDepart}`,
                input: `${n1}×${n2} / ${d1}×${d2}`, expected: `${this.num} en haut, ${this.den} en bas`,
                concept: SKILL,
                customMessage: `${faux}. Chaque produit doit redonner exactement le nombre de départ.`
            });
            return;
        }
        let f = null;
        if (n1 === d1 || n1 === d2) f = n1;
        else if (n2 === d1 || n2 === d2) f = n2;

        if (f && f > 1) {
            this.facteurCommun = f;
            this.phaseSabre(n1, n2, d1, d2);
        } else {
            this.message('Calcul juste, mais aucun facteur en double : rien à barrer !', 'ko');
            this.secousse();
            this.onWrongAnswer(null, {
                questionText: `Décomposer ${this.fractionDepart}`,
                input: `${n1}×${n2} / ${d1}×${d2}`, expected: 'le même facteur en haut et en bas',
                concept: SKILL,
                customMessage: `Les produits sont justes, mais on ne peut barrer que ce qui apparaît EN HAUT ET EN BAS. Cherche une décomposition où le même nombre figure au numérateur et au dénominateur — ici, ${pgcd(this.num, this.den)} marche.`
            });
        }
    }

    utiliserBouclier() {
        if (this.estIrreductible) {
            this.message(`Bien vu ! ${this.fractionDepart} est irréductible.`, 'ok');
            this.reussite(15, `${this.fractionDepart} reconnue irréductible`);
        } else {
            this.message('Non : on peut encore simplifier !', 'ko');
            this.secousse();
            this.score = Math.max(0, this.score - 5);
            this.majTete();
            this.onWrongAnswer(null, {
                questionText: `Simplifier ${this.fractionDepart}`,
                input: 'bouclier (irréductible)', expected: `simplifier par ${pgcd(this.num, this.den)}`,
                concept: SKILL,
                customMessage: `${this.num} et ${this.den} sont tous les deux divisibles par ${pgcd(this.num, this.den)} : la fraction se simplifie encore. Le bouclier ne sert que quand il n'y a AUCUN diviseur commun.`
            });
        }
    }

    // --- Le coup de sabre ---------------------------------------------------

    phaseSabre(n1, n2, d1, d2) {
        clearInterval(this.timerInterval);
        this.ui.controls.innerHTML = '';
        this.message('Coupe les deux facteurs identiques !', 'ok');
        const rend = (v) => v === this.facteurCommun
            ? `<span class="sam-facteur sam-cible" data-cible>${v}</span>`
            : `<span class="sam-facteur">${v}</span>`;
        this.ui.eq.innerHTML = `
            <div class="sam-frac" style="opacity:.5"><div class="sam-num">${this.num}</div><div class="sam-bar"></div><div class="sam-den">${this.den}</div></div>
            <div class="sam-egal">=</div>
            <div class="sam-frac">
                <div class="sam-num">${rend(n1)}<span class="sam-fois">×</span>${rend(n2)}</div>
                <div class="sam-bar"></div>
                <div class="sam-den">${rend(d1)}<span class="sam-fois">×</span>${rend(d2)}</div>
            </div>`;
        this.barres = 0;
        this.ui.eq.querySelectorAll('[data-cible]').forEach(el => {
            el.onclick = () => this.sabrer(el);
        });
    }

    sabrer(el) {
        if (el.classList.contains('sam-barre')) return;
        el.classList.add('sam-barre');
        el.classList.remove('sam-cible');
        this.barres++;
        if (this.barres >= 2) regTimeout(() => this.finDeManche(), 600);
    }

    finDeManche() {
        if (!this.isRunning) return;
        this.num /= this.facteurCommun;
        this.den /= this.facteurCommun;
        if (pgcd(this.num, this.den) === 1) {
            this.message(`Terminé ! ${this.fractionDepart} = ${this.num}/${this.den}, irréductible.`, 'ok');
            this.reussite(10, `${this.fractionDepart} → ${this.num}/${this.den}`);
        } else {
            this.message('Bien ! Mais ce n\'est pas fini : simplifie encore.', 'info');
            regTimeout(() => {
                if (!this.isRunning) return;
                this.montrerSaisie();
                if (NIVEAUX[this.level].chrono && !this.isDemo) this.lancerChrono();
            }, 1400);
        }
    }

    reussite(pts, resume) {
        const points = pts * this.level;
        this.score += points;
        this.victoires++;
        this.onCorrectAnswer(null, SKILL, {
            points,
            questionText: `Simplifier ${this.fractionDepart}`,
            given: resume, expected: resume
        });
        this.ui.card.style.borderColor = '#51cf66';
        const monte = this.victoires >= this.goal && this.level < 5;
        if (monte) {
            this.level++;
            this.victoires = 0;
            this.message(`⚔️ Tu deviens ${NIVEAUX[this.level].nom} !`, 'ok');
        }
        this.majTete();
        regTimeout(() => {
            if (!this.isRunning) return;
            this.ui.card.style.borderColor = '';
            this.nouvelleFraction();
        }, monte ? 2000 : 1400);
    }

    lancerChrono() {
        clearInterval(this.timerInterval);
        let l = 100;
        this.ui.timerBar.style.width = '100%';
        this.timerInterval = setInterval(() => {
            l -= 0.25;
            this.ui.timerBar.style.width = l + '%';
            if (l <= 0) {
                clearInterval(this.timerInterval);
                this.message('Temps écoulé !', 'ko');
                this.onWrongAnswer(null, {
                    questionText: `Simplifier ${this.fractionDepart}`,
                    input: '(trop lent)', expected: `simplifier par ${this.estIrreductible ? '— (irréductible)' : pgcd(this.num, this.den)}`,
                    concept: SKILL,
                    customMessage: this.estIrreductible
                        ? `Le chrono a sonné. ${this.fractionDepart} était un piège : déjà irréductible, il fallait vite lever le bouclier.`
                        : `Le chrono a sonné. Astuce de rapidité : teste d'abord les petits diviseurs (2 si les deux sont pairs, 5 s'ils finissent par 0 ou 5).`
                });
                regTimeout(() => { if (this.isRunning) this.nouvelleFraction(); }, 1400);
            }
        }, 50);
    }

    // --- Robot : il cherche le facteur commun à voix haute -------------------

    async runDemoSequence() {
        this.nouvelleFraction();
        const cursor = createDemoCursor();
        this.demoCursor = cursor;
        const gate = createDemoGate(this.ui.card);
        const fin = () => { cursor.hideBubble(); gate.destroy(); };

        if (!await cursor.pause(1200) || !this.isRunning) return fin();

        while (this.isRunning && this.isDemo) {
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const g = pgcd(this.num, this.den);
            const cfg = NIVEAUX[this.level];

            if (this.estIrreductible) {
                cursor.say(`${this.num}/${this.den} : je cherche un diviseur commun… ${this.num} et ${this.den} n'en ont AUCUN. C'est un piège : la fraction est déjà irréductible, je lève le bouclier !`, this.ui.eq);
                if (!await cursor.pause(2600) || !this.isRunning) return fin();
                const bouclier = this.ui.controls.querySelector('[data-bouclier]');
                if (!bouclier || !await cursor.tap(bouclier, 320)) return fin();
                this.utiliserBouclier();
            } else if (cfg.mode === 'simple') {
                cursor.say(`${this.num}/${this.den} : les deux nombres sont dans la table de ${g}. Je coupe par ${g}.`, this.ui.eq);
                if (!await cursor.pause(2200) || !this.isRunning) return fin();
                const inp = this.ui.controls.querySelector('[data-simple]');
                if (!inp || !await cursor.tap(inp, 260)) return fin();
                inp.value = g;
                const btn = this.ui.controls.querySelector('[data-couper]');
                if (!btn || !await cursor.tap(btn, 320)) return fin();
                this.verifierSimple();
            } else {
                cursor.say(`${this.num}/${this.den} : le facteur commun est ${g}, car ${this.num} = ${g} × ${this.num / g} et ${this.den} = ${g} × ${this.den / g}. J'écris la décomposition.`, this.ui.eq);
                if (!await cursor.pause(2800) || !this.isRunning) return fin();
                const valeurs = [['[data-n1]', g], ['[data-n2]', this.num / g], ['[data-d1]', g], ['[data-d2]', this.den / g]];
                for (const [sel, v] of valeurs) {
                    const inp = this.ui.eq.querySelector(sel);
                    if (!inp || !await cursor.tap(inp, 220)) return fin();
                    inp.value = v;
                }
                const btn = this.ui.controls.querySelector('[data-verifier]');
                if (!btn || !await cursor.tap(btn, 320)) return fin();
                this.verifierDecomposition();
            }

            // Phase sabre éventuelle : barrer les deux facteurs identiques.
            if (!this.estIrreductible) {
                if (!await cursor.pause(900) || !this.isRunning) return fin();
                const cibles = [...this.ui.eq.querySelectorAll('[data-cible]')];
                if (cibles.length) {
                    cursor.say(`Le ${this.facteurCommun} est en haut ET en bas : je le barre des deux côtés — il se simplifie.`, this.ui.eq);
                    if (!await cursor.pause(1600) || !this.isRunning) return fin();
                    for (const c of cibles.slice(0, 2)) {
                        if (!await cursor.tap(c, 300)) return fin();
                        this.sabrer(c);
                    }
                }
            }
            if (!await cursor.pause(DEMO_SPEED.between + 800) || !this.isRunning) return fin();
        }
        fin();
    }

    destroy() {
        if (this.demoCursor) { this.demoCursor.destroy(); this.demoCursor = null; }
        document.removeEventListener('keydown', this.onKey);
        super.destroy();
    }
}

export function engineFracSamurai(container, isDemo, params) {
    const game = new FracSamurai(container, isDemo, params, 'frac-samurai');
    game.start();
    return game;
}
