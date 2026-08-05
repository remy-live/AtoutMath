// Ninja des Nombres : trancher les bons calculs.
//
// Porté depuis l'ancien projet (imports/maths-legacy/games/ninja). Un nombre
// CIBLE s'affiche ; des fruits montent en cloche, chacun portant un calcul
// (8 + 4, 15 − 3, 3 × 4…). On tranche d'un geste ceux qui font exactement la
// cible — et on laisse retomber les autres. C'est la lecture RAPIDE des
// écritures d'un nombre : le cœur du calcul mental.
//
// Chaque coup de lame est une tentative : trancher un bon calcul réussit,
// trancher un mauvais est expliqué (« 8 + 3 = 11, pas 12 »), laisser tomber
// un bon calcul coûte une vie. Le robot montre le geste : il laisse passer un
// intrus en le disant, puis tranche un bon calcul en le lisant à voix haute.

import { BaseGame } from '../core/BaseGame.js';
import { regTimeout } from '../core/timers.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';

const SKILL = 'num.calc.decomposition';

// Rythme du jeu : durée de vol d'un fruit (en images à 60/s) et intervalle
// entre deux lancers. Un fruit doit rester en l'air le temps de LIRE son
// calcul et de décider — l'ancien réglage le faisait monter et retomber en
// deux secondes et demie, ce qui transformait un exercice de calcul en
// exercice de réflexes.
const RYTHMES = {
    lent: { vol: 420, entre: 240 },
    normal: { vol: 330, entre: 190 },
    rapide: { vol: 240, entre: 140 }
};

const COULEURS = ['ninja-melon', 'ninja-orange', 'ninja-berry'];

class Ninja extends BaseGame {
    render() {
        this.cibleMax = Math.max(8, Math.min(60, parseInt(this.params.cibleMax) || 20));
        this.viesMax = parseInt(this.params.lives) || 3;
        this.rythme = RYTHMES[this.params.rythme] || RYTHMES.lent;
        this.vies = this.viesMax;
        this.score = 0;
        this.serie = 0;         // bons calculs tranchés sur la cible en cours
        this.fruits = [];
        this.trace = [];
        this.frame = 0;
        this.dernier = { x: 0, y: 0 };

        this.container.innerHTML = `
            <style>
                .ninja-arene { position: relative; width: 100%; height: 100%; overflow: hidden;
                    background: linear-gradient(160deg, #312e81, #1e1b4b 60%, #0f172a);
                    touch-action: none; user-select: none; -webkit-user-select: none; }
                .ninja-hud { position: absolute; top: 10px; left: 0; width: 100%; display: flex;
                    justify-content: center; align-items: center; gap: 14px; z-index: 20; pointer-events: none; }
                .ninja-cible { background: #fff; color: #1e1b4b; font-size: 2rem; font-weight: 900;
                    min-width: 74px; height: 64px; display: flex; align-items: center; justify-content: center;
                    border-radius: 16px; box-shadow: 0 6px 18px rgba(0,0,0,.4); padding: 0 12px; }
                .ninja-info { color: #c7d2fe; font-weight: 700; font-size: .9rem; max-width: 40%; }
                .ninja-vies { color: #f87171; font-size: 1.3rem; letter-spacing: 2px; }
                .ninja-score { color: #fcd34d; font-weight: 900; font-size: 1.1rem; }
                .ninja-canvas { position: absolute; inset: 0; z-index: 10; pointer-events: none; }
                .ninja-item { position: absolute; left: 0; top: 0;
                    width: var(--ninja-taille, 96px); height: var(--ninja-taille, 96px);
                    border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    font-weight: 900; font-size: var(--ninja-police, 1.15rem); color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,.5);
                    box-shadow: inset -6px -8px 14px rgba(0,0,0,.3), 0 6px 14px rgba(0,0,0,.35);
                    pointer-events: none; z-index: 5; white-space: nowrap; }
                .ninja-melon { background: radial-gradient(circle at 32% 28%, #4ade80, #15803d); }
                .ninja-orange { background: radial-gradient(circle at 32% 28%, #fdba74, #c2410c); }
                .ninja-berry { background: radial-gradient(circle at 32% 28%, #c4b5fd, #6d28d9); }
                .ninja-item.demo-target { box-shadow: 0 0 18px 6px #fcd34d, inset -6px -8px 14px rgba(0,0,0,.3); }
                .ninja-part { position: absolute; left: 0; top: 0; pointer-events: none; z-index: 6; }
                .ninja-flottant { position: absolute; font-weight: 900; font-size: 1.5rem; z-index: 25;
                    pointer-events: none; text-shadow: 2px 2px 0 rgba(0,0,0,.5); }
                .ninja-item.perime { opacity: .28; filter: grayscale(1); }
                /* L'explication d'une erreur reste DANS le jeu, sur une ligne
                   sous le compteur : la carte de correction pleine largeur
                   couvrait un tiers de l'écran au milieu d'une partie qui
                   continue, et devenait illisible. */
                .ninja-mot { position: absolute; top: 84px; left: 50%; transform: translateX(-50%);
                    max-width: min(92%, 460px); z-index: 22; pointer-events: none;
                    background: rgba(15, 23, 42, .92); color: #fff; border: 1px solid rgba(255,255,255,.18);
                    border-radius: 14px; padding: 7px 14px; font-size: .86rem; font-weight: 700;
                    line-height: 1.35; text-align: center; opacity: 0; transition: opacity .25s; }
                .ninja-mot.on { opacity: 1; }
                .ninja-mot.ko { border-color: #f87171; }
                .ninja-mot.ok { border-color: #4ade80; }
            </style>
            <div class="ninja-arene" data-arene>
                <div class="ninja-hud">
                    <span class="ninja-vies" data-vies></span>
                    <div class="ninja-cible" data-cible>?</div>
                    <span class="ninja-score">⭐ <span data-score>0</span></span>
                </div>
                <div class="ninja-mot" data-mot></div>
                <canvas class="ninja-canvas"></canvas>
            </div>`;

        this.arene = this.container.querySelector('[data-arene]');
        this.canvas = this.container.querySelector('.ninja-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ui = {
            cible: this.container.querySelector('[data-cible]'),
            score: this.container.querySelector('[data-score]'),
            vies: this.container.querySelector('[data-vies]'),
            mot: this.container.querySelector('[data-mot]')
        };

        this.dimensionner();
        this.onResize = () => this.dimensionner();
        window.addEventListener('resize', this.onResize);

        const glisser = (e) => {
            if (!this.isRunning || this.isDemo) return;
            if (e.cancelable) e.preventDefault();
            const src = e.touches && e.touches.length ? e.touches[0] : e;
            const rect = this.arene.getBoundingClientRect();
            this.lame(src.clientX - rect.left, src.clientY - rect.top);
        };
        this.arene.addEventListener('mousemove', glisser);
        this.arene.addEventListener('touchmove', glisser, { passive: false });

        this.majVies();
        this.nouvelleCible();
    }

    dimensionner() {
        if (!this.canvas) return;
        const w = this.arene.clientWidth || 800;
        this.canvas.width = w;
        this.canvas.height = this.arene.clientHeight || 500;
        // Un fruit de 96 px sur un téléphone de 390, c'est le quart de la
        // largeur : deux fruits se recouvraient et le calcul devenait
        // illisible. La taille suit l'écran, la police suit la taille.
        this.taille = Math.round(Math.max(66, Math.min(96, w * 0.23)));
        this.arene.style.setProperty('--ninja-taille', this.taille + 'px');
        this.arene.style.setProperty('--ninja-police',
            Math.max(.72, Math.min(1.15, this.taille / 84)).toFixed(2) + 'rem');
    }

    majVies() { this.ui.vies.textContent = '❤'.repeat(Math.max(0, this.vies)); }

    nouvelleCible() {
        // Les fruits encore en l'air ont été lancés pour l'ANCIENNE cible :
        // ils sont mis hors jeu. Sans cela, « 1 + 14 » lancé pour la cible 15
        // était jugé sur la cible 8 — annoncé « 1 + 14 = 8 » et compté faux.
        this.fruits.forEach(f => { f.perime = true; f.el.classList.add('perime'); });
        this.cible = Math.floor(Math.random() * (this.cibleMax - 5)) + 6;
        this.serie = 0;
        this.ui.cible.textContent = this.cible;
    }

    /**
     * Un mot dans le jeu, à la place de la carte de correction.
     *
     * Le jeu ne s'arrête pas quand on se trompe : une carte pleine largeur
     * posée par-dessus une partie qui continue est illisible. Le message
     * s'affiche donc sur une ligne sous le compteur, et s'efface tout seul.
     */
    mot(texte, ton) {
        if (!this.ui.mot) return;
        this.ui.mot.textContent = texte;
        this.ui.mot.className = 'ninja-mot on ' + (ton || '');
        clearTimeout(this.motTimer);
        this.motTimer = setTimeout(() => {
            if (this.ui.mot) this.ui.mot.classList.remove('on');
        }, 3200);
    }

    // --- Fabrique des calculs ------------------------------------------------

    equationPour(valeur) {
        const tirage = Math.random();
        if (tirage < 0.4) {
            const a = Math.floor(Math.random() * (valeur - 1)) + 1;
            return { txt: `${a} + ${valeur - a}`, valeur };
        }
        if (tirage < 0.8) {
            const a = valeur + Math.floor(Math.random() * 10) + 1;
            return { txt: `${a} − ${a - valeur}`, valeur };
        }
        const diviseurs = [];
        for (let d = 2; d <= Math.sqrt(valeur); d++) if (valeur % d === 0) diviseurs.push(d);
        if (diviseurs.length) {
            const d = diviseurs[Math.floor(Math.random() * diviseurs.length)];
            return { txt: `${d} × ${valeur / d}`, valeur };
        }
        return { txt: `${valeur - 1} + 1`, valeur };
    }

    lancerFruit() {
        const w = this.arene.clientWidth, h = this.arene.clientHeight;
        const bon = Math.random() > 0.5;
        let valeur = this.cible;
        if (!bon) {
            valeur = this.cible + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 5) + 1);
            if (valeur < 2) valeur = this.cible + 2;
        }
        const eq = this.equationPour(valeur);

        const el = document.createElement('div');
        el.className = `ninja-item ${COULEURS[Math.floor(Math.random() * COULEURS.length)]}`;
        el.innerHTML = `<span>${eq.txt}</span>`;
        this.arene.appendChild(el);

        // Physique déduite du RÉSULTAT voulu : le fruit doit rester en l'air
        // `vol` images et culminer aux deux tiers de l'arène, quelle que soit
        // la taille de l'écran. De la durée T et de la hauteur H on tire
        // g = 8H/T² et v = gT/2 — un vol lent et ample, où on a le temps de
        // lire le calcul, au lieu de la fusée d'avant.
        const T = this.rythme.vol * (0.9 + Math.random() * 0.2);
        const H = Math.max(160, (h - this.taille) * 0.66);
        const g = 8 * H / (T * T);

        // On tire plusieurs positions et on garde la plus ÉLOIGNÉE des fruits
        // déjà en l'air : deux fruits superposés cachent leurs calculs, et
        // c'est le calcul qu'on vient lire.
        const marge = 8, dispo = Math.max(40, w - this.taille - 2 * marge);
        let x = marge + Math.random() * dispo, meilleure = -1;
        for (let essai = 0; essai < 8; essai++) {
            const cand = marge + Math.random() * dispo;
            const ecart = this.fruits.length
                ? Math.min(...this.fruits.map(o => Math.abs(o.x - cand))) : Infinity;
            if (ecart > meilleure) { meilleure = ecart; x = cand; }
            if (ecart > this.taille * 1.15) break;
        }
        this.fruits.push({
            el, txtEl: el.querySelector('span'),
            txt: eq.txt, valeur, bon, cible: this.cible,
            tranche: false, perime: false, age: 0,
            x, y: h,
            // Dérive latérale FAIBLE : à 0,002 les fruits convergeaient vers
            // le centre (155 px sur un vol) et finissaient superposés, chacun
            // masquant le calcul de l'autre.
            vx: (w / 2 - x) * 0.0004 + (Math.random() - 0.5) * 0.18,
            vy: -(g * T / 2),
            g,
            rot: 0, vRot: Math.random() * 0.35 - 0.175
        });
    }

    // --- Boucle --------------------------------------------------------------

    startGameLoop() {
        this.boucle();
    }

    boucle() {
        if (!this.isRunning) return;
        this.frame++;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.frame % this.rythme.entre === 0 || (this.frame === 30 && !this.fruits.length)) this.lancerFruit();
        this.avancerFruits();
        this.dessinerLame();

        this.rafId = requestAnimationFrame(() => this.boucle());
    }

    avancerFruits() {
        const h = this.arene.clientHeight, w = this.arene.clientWidth;
        for (let i = this.fruits.length - 1; i >= 0; i--) {
            const f = this.fruits[i];
            f.x += f.vx; f.y += f.vy; f.vy += f.g; f.rot += f.vRot; f.age++;
            f.el.style.transform = `translate(${f.x}px, ${f.y}px) rotate(${f.rot}deg)`;
            // Le fruit tourne, le CALCUL reste droit : c'est lui qu'on vient
            // lire, et un « 26 − 6 » penché de 70° ne se déchiffre plus.
            if (f.txtEl) f.txtEl.style.transform = `rotate(${-f.rot}deg)`;

            const dehors = f.y > h + 200 || f.x < -220 || f.x > w + 220 || f.age > 1600;
            if (!dehors) continue;

            // Un BON calcul retombé sans être tranché : occasion manquée.
            // Un fruit périmé (cible changée entre-temps) ne compte pas.
            if (f.bon && !f.tranche && !f.perime && f.y > h && !this.isDemo) this.calculRate(f);
            f.el.remove();
            this.fruits.splice(i, 1);
        }
    }

    lame(x, y) {
        this.trace.push({ x, y });
        if (this.trace.length > 8) this.trace.shift();
        const vitesse = Math.abs(x - this.dernier.x) + Math.abs(y - this.dernier.y);
        this.dernier = { x, y };
        if (vitesse < 2) return;

        for (let i = this.fruits.length - 1; i >= 0; i--) {
            const f = this.fruits[i];
            if (f.tranche) continue;
            const d = Math.hypot(f.x + this.taille / 2 - x, f.y + this.taille / 2 - y);
            if (d < this.taille * 0.66) this.trancher(f, i);
        }
    }

    dessinerLame() {
        if (this.trace.length < 2) return;
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.lineWidth = 6; ctx.strokeStyle = '#fff';
        ctx.shadowBlur = 15; ctx.shadowColor = '#22d3ee';
        ctx.moveTo(this.trace[0].x, this.trace[0].y);
        for (let i = 1; i < this.trace.length; i++) ctx.lineTo(this.trace[i].x, this.trace[i].y);
        ctx.stroke();
        ctx.shadowBlur = 0;
        this.trace.forEach(p => { p.vie = (p.vie ?? 8) - 1; });
        this.trace = this.trace.filter(p => (p.vie ?? 8) > 0);
    }

    // --- Verdicts ------------------------------------------------------------

    trancher(f, index) {
        f.tranche = true;
        this.debris(f, -1); this.debris(f, 1);
        f.el.remove();
        this.fruits.splice(index, 1);

        // Fruit lancé pour une cible désormais périmée : ni point ni reproche.
        if (f.perime) return;

        if (f.bon) {
            this.score += 10;
            this.serie++;
            this.flottant(f.x, f.y, '+10', '#fcd34d');
            this.onCorrectAnswer(null, SKILL, {
                points: 10,
                questionText: `${f.txt} = ${f.cible} ?`,
                given: f.txt, expected: `${f.cible}`
            });
            if (this.serie >= 4) {
                this.nouvelleCible();
                this.mot(`Nouvelle cible : ${this.cible}`, 'ok');
            }
        } else {
            this.score = Math.max(0, this.score - 5);
            this.flottant(f.x, f.y, '−5', '#f87171');
            // Message DANS le jeu (`mot`), pas de carte de correction : la
            // partie continue pendant qu'on lit.
            this.mot(`${f.txt} = ${f.valeur}, pas ${f.cible} — calcule avant de trancher !`, 'ko');
            this.onWrongAnswer(null, {
                questionText: `${f.txt} = ${f.cible} ?`,
                input: `tranché ${f.txt}`, expected: `un calcul qui fait ${f.cible}`,
                concept: SKILL, silencieux: true,
                customMessage: `${f.txt} = ${f.valeur}, pas ${f.cible} : ce fruit-là devait retomber. Calcule AVANT de trancher !`
            });
        }
        this.ui.score.textContent = this.score;
    }

    calculRate(f) {
        this.vies--;
        this.majVies();
        this.flottant(f.x, Math.min(f.y, this.arene.clientHeight - 60), 'Raté !', '#f87171');
        this.mot(`${f.txt} = ${f.cible} : il fallait le trancher !`, 'ko');
        this.onWrongAnswer(null, {
            questionText: `${f.txt} = ${f.cible} ?`,
            input: '(laissé tomber)', expected: `trancher ${f.txt}`,
            concept: SKILL, silencieux: true,
            customMessage: `${f.txt} = ${f.cible} : c'était un bon calcul, il fallait le trancher avant qu'il retombe.`
        });
        if (this.vies <= 0) {
            this.mot('Plus de vies — on repart !', 'ko');
            this.vies = this.viesMax;
            regTimeout(() => { if (this.isRunning) { this.majVies(); this.nouvelleCible(); } }, 1600);
        }
    }

    // --- Habillage -----------------------------------------------------------

    debris(f, sens) {
        const el = document.createElement('div');
        el.className = f.el.className.replace('ninja-item', 'ninja-part');
        const T = this.taille;
        el.style.width = `${T}px`; el.style.height = `${T / 2}px`;
        el.style.borderRadius = sens === 1 ? `0 0 ${T / 2}px ${T / 2}px` : `${T / 2}px ${T / 2}px 0 0`;
        this.arene.appendChild(el);
        el.animate([
            { transform: `translate(${f.x}px, ${f.y + (sens === 1 ? T / 2 : 0)}px) rotate(${f.rot}deg)`, opacity: 1 },
            { transform: `translate(${f.x + sens * 60}px, ${f.y + 130}px) rotate(${f.rot + sens * 35}deg)`, opacity: 0 }
        ], { duration: 600, fill: 'forwards' });
        regTimeout(() => el.remove(), 620);
    }

    flottant(x, y, texte, couleur) {
        const el = document.createElement('div');
        el.className = 'ninja-flottant';
        el.textContent = texte;
        el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.color = couleur;
        this.arene.appendChild(el);
        el.animate([
            { transform: 'translateY(0) scale(1)', opacity: 1 },
            { transform: 'translateY(-50px) scale(1.4)', opacity: 0 }
        ], { duration: 800, fill: 'forwards' });
        regTimeout(() => el.remove(), 820);
    }

    // --- Robot : il calcule à voix haute, tranche ou laisse tomber -----------

    ancre(x, y) {
        const rect = this.arene.getBoundingClientRect();
        const el = document.createElement('div');
        el.style.cssText = `position:fixed;width:1px;height:1px;pointer-events:none;left:${rect.left + x}px;top:${rect.top + y}px;`;
        document.body.appendChild(el);
        return el;
    }

    async runDemoSequence() {
        this.startGameLoop();
        const cursor = createDemoCursor();
        this.demoCursor = cursor;
        const gate = createDemoGate(this.arene);
        this.demoGate = gate;

        if (!await cursor.pause(1000) || !this.isRunning) return;
        cursor.say(`La cible est ${this.cible} : je tranche UNIQUEMENT les calculs qui font ${this.cible}.`, this.ui.cible);
        if (!await cursor.pause(2200) || !this.isRunning) return;

        while (this.isRunning && this.isDemo) {
            // Un fruit dans la zone lisible : à moins d'une seconde de son
            // sommet. Le seuil se déduit de SA gravité — la physique dépend
            // désormais du rythme choisi et de la hauteur de l'écran.
            const f = this.fruits.find(x => !x.tranche && !x.perime
                && Math.abs(x.vy) < x.g * 60 && x.y < this.arene.clientHeight - 120);
            if (!f) { if (!await cursor.pause(300)) return; continue; }
            if (!await gate.waitTurn() || !this.isRunning) return;

            if (f.bon) {
                f.el.classList.add('demo-target');
                cursor.say(`${f.txt} = ${f.cible} : c'est la cible, je tranche !`, f.el);
                if (!await cursor.pause(1400) || !this.isRunning) return;
                // Le geste : la lame traverse le fruit de part en part.
                const a1 = this.ancre(f.x - 50, f.y + this.taille / 2 + 40);
                const a2 = this.ancre(f.x + this.taille + 50, f.y - 10);
                await cursor.moveTo(a1, 300);
                await cursor.moveTo(a2, 260);
                a1.remove(); a2.remove();
                if (!this.isRunning) return;
                const idx = this.fruits.indexOf(f);
                if (idx !== -1) this.trancher(f, idx);
                if (!await cursor.pause(DEMO_SPEED.between) || !this.isRunning) return;
            } else {
                cursor.say(`${f.txt} = ${f.valeur} : ce n'est PAS ${f.cible}, je le laisse retomber.`, f.el);
                if (!await cursor.pause(1900) || !this.isRunning) return;
                f.tranche = true;   // le robot ne le re-commente pas
                f.el.style.opacity = '0.55';
            }
        }
    }

    destroy() {
        if (this.demoCursor) { this.demoCursor.destroy(); this.demoCursor = null; }
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        clearTimeout(this.motTimer);
        window.removeEventListener('resize', this.onResize);
        super.destroy();
    }
}

export function engineNinja(container, isDemo, params) {
    const game = new Ninja(container, isDemo, params, 'calc-ninja');
    game.start();
    return game;
}
