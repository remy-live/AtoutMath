// 2048 — à l'écran.
//
// Le noyau (core/deuxmille.js) porte toute la règle ; ici on écoute les doigts
// et les flèches, on anime, et on fait dire au robot ce qui rend ce jeu
// mathématique : chaque tuile est un DOUBLEMENT, et chaque coup s'anticipe
// (« les deux 8 se retrouvent si je glisse à droite »).
//
// L'apprentissage crédite les puissances de deux : une fusion réussie est un
// doublement énoncé (8 + 8 = 16), une grande tuile atteinte vaut plus.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    grilleVide, glisser, apparaitre, peutJouer, plusGrande, conseiller, direConseil
} from '../core/deuxmille.js';

const COMPETENCE = 'num.calc.doublements';

// Les teintes de l'original, adoucies : la valeur se lit à la couleur avant
// de se lire au nombre.
const TEINTES = {
    2: '#eef2f7', 4: '#e6e0d0', 8: '#f2b179', 16: '#f59563', 32: '#f67c5f',
    64: '#f65e3b', 128: '#edcf72', 256: '#edcc61', 512: '#edc850',
    1024: '#edc53f', 2048: '#edc22e'
};
const SOMBRES = new Set([8, 16, 32, 64]);

class DeuxMille extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'deuxmille');
        this.rng = makeRng(this.params.seed);
        this.objectif = Number(this.params.objectif) || 2048;
        this.meilleures = new Set();   // les paliers déjà crédités cette partie
    }

    render() {
        this.container.innerHTML = `
            <style>
                .dm2-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 10px;
                    width: 100%; height: 100%; padding: 10px; box-sizing: border-box;
                    color: var(--text-main); overflow-y: auto; container-type: inline-size;
                }
                .dm2-tete { display: flex; gap: 14px; align-items: baseline; flex-wrap: wrap; justify-content: center; }
                .dm2-score { font-weight: 900; font-size: 1.15rem; }
                .dm2-obj { color: var(--text-muted); font-size: .85rem; }
                /* LE PLATEAU : un fond de cases immobiles, et par-dessus une
                   couche de tuiles absolues. C'est ce qui permet la GLISSADE :
                   une tuile est un élément qui garde son identité d'un coup à
                   l'autre, et son transform est animé. */
                .dm2-grille {
                    display: grid; gap: 8px; padding: 10px; border-radius: 12px;
                    background: color-mix(in srgb, var(--text-main) 12%, var(--bg-panel));
                    grid-template-columns: repeat(4, 1fr);
                    grid-template-rows: repeat(4, 1fr);
                    width: min(92cqw, 400px); aspect-ratio: 1;
                    box-sizing: border-box; position: relative;
                    touch-action: none; user-select: none;
                }
                /* Les cases du fond : CARRÉES par construction — 4 colonnes et
                   4 rangées de 1fr dans un plateau carré. */
                .dm2-case {
                    border-radius: 8px; background: color-mix(in srgb, var(--text-main) 5%, var(--bg-panel));
                }
                .dm2-tuile {
                    position: absolute; left: 0; top: 0; border-radius: 8px;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 900; will-change: transform;
                    transition: transform .13s ease-in-out;
                }
                .dm2-tuile--pop { animation: dm2-pop .22s ease; }
                @keyframes dm2-pop { from { scale: .4; } }
                .dm2-tuile--fusion { animation: dm2-fusion .26s ease; }
                @keyframes dm2-fusion { 45% { scale: 1.2; } }
                .dm2-barre { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
                .dm2-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700; padding: 7px 13px;
                }
                .dm2-note { min-height: 2.4em; text-align: center; font-size: .88rem;
                    color: var(--text-muted); max-width: 620px; }
                .dm2-note--ok { color: var(--success, #16a34a); font-weight: 700; }
                .dm2-note--ko { color: var(--danger, #dc2626); font-weight: 600; }
            </style>
            <div class="dm2-wrap">
                <div class="dm2-tete">
                    <span class="dm2-score">Score : <span data-score>0</span></span>
                    <span class="dm2-obj">Objectif : la tuile <b data-obj></b></span>
                </div>
                <div class="dm2-grille" data-grille tabindex="0" aria-label="Grille du 2048"></div>
                <div class="dm2-barre">
                    <button type="button" class="dm2-btn" data-aide>💡 Aide-moi</button>
                    <button type="button" class="dm2-btn" data-neuf>↺ Nouvelle partie</button>
                </div>
                <div class="dm2-note" data-note></div>
            </div>`;
        this.grilleEl = this.container.querySelector('[data-grille]');
        this.scoreEl = this.container.querySelector('[data-score]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.container.querySelector('[data-obj]').textContent = String(this.objectif);
        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.container.querySelector('[data-neuf]').onclick = () => this.showNext();
        // Le fond, une fois pour toutes ; les tuiles vivent par-dessus.
        this.grilleEl.innerHTML = Array.from({ length: 16 }, () => '<div class="dm2-case"></div>').join('');
        this.brancherGestes();
        // Les tuiles sont placées en pixels : si le plateau change de taille
        // (rotation d'une tablette), on les repose.
        this.observateur = new ResizeObserver(() => this.replacerTuiles());
        this.observateur.observe(this.grilleEl);
    }

    startGameLoop() { this.poser(); }

    poser() {
        this.grille = grilleVide(4);
        this.grille = apparaitre(this.grille, this.rng).grille;
        this.grille = apparaitre(this.grille, this.rng).grille;
        this.score = 0;
        this.finie = false;
        this.gagnee = false;
        this.meilleures = new Set();
        this.finirAnimation = null;
        // Les tuiles repartent de zéro, une par case pleine.
        this.tuiles = [];
        this.grilleEl.querySelectorAll('.dm2-tuile').forEach(el => el.remove());
        this.grille.forEach((v, i) => { if (v) this.creerTuile(v, i, false); });
        this.scoreEl.textContent = '0';
        this.note('Glisse la grille (doigt, souris ou flèches) : deux tuiles égales fusionnent en leur double.');
        return true;
    }

    // --- Les tuiles -------------------------------------------------------------

    /** La géométrie du plateau, en pixels : d'où viennent left/top des tuiles. */
    geometrie() {
        const w = this.grilleEl.clientWidth || 400;
        const marge = 10, ecart = 8;
        const cote = (w - marge * 2 - ecart * 3) / 4;
        return { marge, ecart, cote };
    }

    placer(el, i) {
        const { marge, ecart, cote } = this.geometrie();
        el.style.width = `${cote}px`;
        el.style.height = `${cote}px`;
        el.style.transform = `translate(${marge + (i % 4) * (cote + ecart)}px, ${marge + Math.floor(i / 4) * (cote + ecart)}px)`;
    }

    habiller(el, v) {
        const teinte = TEINTES[v] || (v > 2048 ? '#3c3a32' : '');
        const clair = v > 2048 || SOMBRES.has(v) ? '#f9f6f2' : '#4a5568';
        const taille = v >= 1024 ? 0.26 : v >= 128 ? 0.32 : 0.4;
        el.style.background = teinte;
        el.style.color = clair;
        el.style.fontSize = `${Math.round(this.geometrie().cote * taille)}px`;
        el.textContent = String(v);
    }

    creerTuile(v, i, pop) {
        const el = document.createElement('div');
        el.className = 'dm2-tuile' + (pop ? ' dm2-tuile--pop' : '');
        this.habiller(el, v);
        this.placer(el, i);
        this.grilleEl.appendChild(el);
        this.tuiles.push({ el, valeur: v, case: i });
        return el;
    }

    replacerTuiles() {
        (this.tuiles || []).forEach(t => { this.placer(t.el, t.case); this.habiller(t.el, t.valeur); });
    }

    // --- Les gestes -----------------------------------------------------------

    brancherGestes() {
        // Le glissé : doigt ou souris, même code. On lit la direction au
        // lever, avec un seuil pour distinguer le glissé du simple toucher.
        let depart = null;
        this.grilleEl.onpointerdown = (e) => { depart = { x: e.clientX, y: e.clientY }; };
        this.grilleEl.onpointerup = (e) => {
            if (!depart) return;
            const dx = e.clientX - depart.x, dy = e.clientY - depart.y;
            depart = null;
            if (Math.hypot(dx, dy) < 22) return;
            const dir = Math.abs(dx) > Math.abs(dy)
                ? (dx > 0 ? 'droite' : 'gauche')
                : (dy > 0 ? 'bas' : 'haut');
            this.jouer(dir);
        };
        this.grilleEl.onkeydown = (e) => {
            const dir = { ArrowLeft: 'gauche', ArrowRight: 'droite', ArrowUp: 'haut', ArrowDown: 'bas' }[e.key];
            if (dir) { e.preventDefault(); this.jouer(dir); }
        };
    }

    jouer(direction) {
        if (this.isDemo || this.finie || !this.grille) return;
        // Un coup rapide pendant la glissade : on termine l'animation en
        // cours d'un claquement de doigts, puis on joue — jamais d'attente,
        // jamais deux animations qui s'emmêlent.
        if (this.finirAnimation) this.finirAnimation();
        const coup = glisser(this.grille, direction);
        if (!coup) { this.note('Rien ne bouge de ce côté : essaie une autre direction.'); return; }
        this.appliquer(coup);
    }

    appliquer(coup) {
        this.score += coup.points;
        const res = apparaitre(coup.grille, this.rng);
        this.grille = res.grille;
        this.scoreEl.textContent = String(this.score);

        // LA GLISSADE. Chaque tuile suit son mouvement du journal ; les deux
        // tuiles d'une fusion voyagent vers la même case, et c'est à
        // L'ARRIVÉE que l'une absorbe l'autre — comme à l'œil nu.
        for (const mv of coup.mouvements) {
            const t = this.tuiles.find(x => x.case === mv.de && !x.enRoute);
            if (!t) continue;
            t.enRoute = true;
            t.case = mv.vers;
            t.el.classList.remove('dm2-tuile--pop', 'dm2-tuile--fusion');
            this.placer(t.el, mv.vers);
        }
        const atterrir = () => {
            if (this.finirAnimation !== atterrir) return;
            this.finirAnimation = null;
            clearTimeout(minuteur);
            // Les fusions : sur chaque case d'arrivée, une tuile survit et
            // double, l'autre disparaît.
            for (const f of coup.fusions) {
                const dessus = this.tuiles.filter(t => t.case === f.case);
                dessus.slice(1).forEach(t => t.el.remove());
                this.tuiles = this.tuiles.filter(t => t.case !== f.case || t === dessus[0]);
                if (dessus[0]) {
                    dessus[0].valeur = f.valeur;
                    this.habiller(dessus[0].el, f.valeur);
                    dessus[0].el.classList.add('dm2-tuile--fusion');
                }
            }
            this.tuiles.forEach(t => { t.enRoute = false; });
            if (res.case >= 0) this.creerTuile(res.valeur, res.case, true);
        };
        this.finirAnimation = atterrir;
        const minuteur = setTimeout(atterrir, 140);

        // CHAQUE FUSION EST UN DOUBLEMENT DIT : c'est là que le jeu devient un
        // exercice — 8 + 8 = 16 énoncé cent fois finit par s'installer.
        if (coup.fusions.length) {
            const f = coup.fusions.reduce((a, b) => a.valeur > b.valeur ? a : b);
            this.note(`${f.valeur / 2} + ${f.valeur / 2} = ${f.valeur}`
                + (coup.fusions.length > 1 ? ` (et ${coup.fusions.length - 1} autre${coup.fusions.length > 2 ? 's' : ''} fusion${coup.fusions.length > 2 ? 's' : ''})` : ''));
            // Les grands paliers se créditent une fois par partie.
            if (f.valeur >= 128 && !this.meilleures.has(f.valeur)) {
                this.meilleures.add(f.valeur);
                this.onCorrectAnswer(null, COMPETENCE, {
                    questionText: `${f.valeur / 2} + ${f.valeur / 2} = ?`,
                    expected: String(f.valeur), given: String(f.valeur),
                    points: Math.round(Math.log2(f.valeur)) * 2
                });
            }
        }

        if (!this.gagnee && plusGrande(this.grille) >= this.objectif) {
            this.gagnee = true;
            this.note(`🏆 La tuile ${this.objectif} est là ! Tu peux continuer, ou repartir de zéro.`, 'ok');
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: `Atteindre la tuile ${this.objectif}`,
                expected: String(this.objectif), given: String(this.objectif),
                points: 25
            });
        } else if (!peutJouer(this.grille)) {
            this.finie = true;
            this.note(`Plus aucun coup possible. Score : ${this.score}, plus grande tuile : ${plusGrande(this.grille)}.`, 'ko');
        }
    }

    aider() {
        if (this.isDemo || this.finie) return;
        this.note(direConseil(conseiller(this.grille)));
    }

    showNext() { return this.poser(); }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'dm2-note' + (ton ? ` dm2-note--${ton}` : '');
    }

    // --- La démonstration -------------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.grille) this.poser();
        if (!await cur.pause(500) || !this.isRunning) return fin();
        cur.say('Toutes les tuiles sont des DOUBLEMENTS : 2, 4, 8, 16… Quand deux tuiles égales se '
            + 'touchent dans le sens du geste, elles fusionnent en leur double.', this.grilleEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        for (let k = 0; k < 5 && peutJouer(this.grille); k++) {
            const c = conseiller(this.grille);
            if (!c) break;
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            cur.say(direConseil(c), this.grilleEl);
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
            const coup = glisser(this.grille, c.direction);
            if (coup) this.appliquer(coup);
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Le secret : ne joue pas au hasard. AVANT de glisser, cherche quelles tuiles vont se '
            + 'retrouver — c\'est du calcul mental déguisé en réflexe.', this.container.querySelector('[data-aide]'));
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        if (this.observateur) { this.observateur.disconnect(); this.observateur = null; }
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineDeuxMille(container, isDemo, params) {
    const jeu = new DeuxMille(container, isDemo, params);
    jeu.start();
    return jeu;
}
