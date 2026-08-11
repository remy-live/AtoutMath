// LES JEUX DE PLATEAU — Othello, Dames, Échecs, sur un seul plateau.
//
// Trois jeux, une seule mécanique d'écran : un damier, des pièces, on touche
// la sienne puis sa destination (ou directement une case, à l'Othello). Tout
// ce qui diffère — la taille, les pièces, les couleurs du bois, la façon de
// choisir un coup — tient dans un ADAPTATEUR d'une trentaine de lignes par
// jeu. Les règles, elles, vivent dans core/othello.js, core/dames.js et
// core/echecs.js, testées sans navigateur (les échecs au perft).
//
// À DEUX ou CONTRE L'ORDINATEUR. L'adversaire artificiel est le négamax
// partagé de core/ia.js ; sa difficulté se règle en deux nombres — la
// profondeur (ce qu'il voit venir) et la fantaisie (sa probabilité de jouer
// au hasard). C'est la fantaisie qui fait un adversaire BATTABLE : une IA qui
// ne se trompe jamais n'apprend rien à personne.
//
// RIEN N'EST ENREGISTRÉ au carnet, comme pour le duel : une partie de dames
// n'est pas une suite de questions, et à deux sur une tablette les coups de
// l'un pollueraient les statistiques de l'autre.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import { meilleurCoup } from '../core/ia.js';
import * as othello from '../core/othello.js';
import * as dames from '../core/dames.js';
import * as echecs from '../core/echecs.js';

const GLYPHES = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };

// La difficulté : profondeur de calcul et part de hasard, par jeu — un coup
// d'échecs coûte bien plus cher à explorer qu'un coup de dames.
const NIVEAUX = {
    othello: { facile: [1, .5], moyen: [3, .12], fort: [4, 0] },
    dames: { facile: [1, .5], moyen: [3, .1], fort: [5, 0] },
    echecs: { facile: [1, .5], moyen: [2, .08], fort: [3, 0] }
};

const ADAPTATEURS = {
    othello: {
        id: 'othello', module: othello, taille: 8, premier: 'N',
        noms: { N: 'Noirs', B: 'Blancs' },
        couleurs: { claire: '#2f9e63', foncee: '#2a8f58', bord: '#1c5e3a' },
        jouable: () => true,
        // À l'Othello, un coup est une CASE : pas de pièce à choisir d'abord.
        destinationSeule: true,
        pieceHtml(p) {
            if (!p) return '';
            return `<span class="pl-disque ${p === 'N' ? 'pl-disque--noir' : 'pl-disque--blanc'}"></span>`;
        },
        caseDe: (c) => c.passe ? null : { x: c.x, y: c.y },
        verdict(t) {
            if (!t.score) return '';
            return `${t.score.N} pions noirs contre ${t.score.B} blancs.`;
        },
        bulles: [
            'Un pion posé ENCADRE : tout ce qui est entre deux de mes pions devient à moi.',
            'Les coins ne se reprennent jamais. Vise-les, refuse leurs voisines.'
        ]
    },
    dames: {
        id: 'dames', module: dames, taille: 10, premier: 'B',
        noms: { B: 'Blancs', N: 'Noirs' },
        couleurs: { claire: '#f0d9b5', foncee: '#b58863', bord: '#7a5432' },
        jouable: (x, y) => (x + y) % 2 === 1,
        deDe: (c) => c.de, versDe: (c) => c.vers,
        pieceHtml(p) {
            if (!p) return '';
            const c = p.couleur === 'B' ? 'pl-pion--blanc' : 'pl-pion--noir';
            return `<span class="pl-pion ${c}">${p.genre === 'd' ? '<i>♛</i>' : ''}</span>`;
        },
        verdict(t) { return t.raison === 'plus de coup possible' ? 'Plus aucun coup possible.' : ''; },
        bulles: [
            'La prise est OBLIGATOIRE — et on prend le plus possible.',
            'Le pion prend aussi en arrière. Au bout du damier, il devient dame : elle vole.'
        ]
    },
    echecs: {
        id: 'echecs', module: echecs, taille: 8, premier: 'B',
        noms: { B: 'Blancs', N: 'Noirs' },
        couleurs: { claire: '#f0d9b5', foncee: '#b58863', bord: '#7a5432' },
        jouable: () => true,
        // Les coups d'échecs parlent en index 0..63 : on traduit ici, pas
        // dans le plateau.
        deDe: (c) => ({ x: c.de % 8, y: Math.floor(c.de / 8) }),
        versDe: (c) => ({ x: c.vers % 8, y: Math.floor(c.vers / 8) }),
        pieceHtml(p) {
            if (!p) return '';
            const blanche = p === p.toUpperCase();
            return `<span class="pl-glyphe ${blanche ? 'pl-glyphe--blanc' : 'pl-glyphe--noir'}">${GLYPHES[p.toUpperCase()]}</span>`;
        },
        verdict(t) { return t.raison === 'échec et mat' ? 'Échec et mat.' : `Partie nulle : ${t.raison}.`; },
        bulles: [
            'Le but n\'est pas de tout prendre : c\'est le roi adverse.',
            'Chaque pièce a sa marche. Touche une pièce : ses coups s\'allument.'
        ]
    }
};

class Plateau extends BaseGame {
    constructor(container, isDemo, params, adaptateur) {
        super(container, isDemo, params, adaptateur.id);
        this.ad = adaptateur;
        this.mode = this.params.mode === 'deux' ? 'deux' : 'ia';
        const [profondeur, fantaisie] = NIVEAUX[adaptateur.id][this.params.niveau] || NIVEAUX[adaptateur.id].moyen;
        this.ia = { profondeur, fantaisie };
        this.rng = makeRng(this.params.seed);
        this.humain = adaptateur.premier;                  // l'humain ouvre toujours
        this.selection = null;
        this.dernier = null;
    }

    // --- Mise en place ---------------------------------------------------------

    render() {
        const n = this.ad.taille;
        const co = this.ad.couleurs;
        this.container.innerHTML = `
            <style>
                .pl-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 7px;
                    width: 100%; height: 100%; color: var(--text-main);
                    user-select: none; -webkit-user-select: none;
                }
                .pl-haut {
                    display: flex; align-items: center; justify-content: center; gap: 10px;
                    flex-wrap: wrap; width: 100%; flex: 0 0 auto;
                    font-size: clamp(11px, 2.6cqw, 14px); font-weight: 700;
                }
                .pl-tour { display: flex; align-items: center; gap: 6px; }
                .pl-jeton { width: 14px; height: 14px; border-radius: 50%; border: 2px solid #334155; }
                .pl-btn {
                    border: 1px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); border-radius: 9px; cursor: pointer;
                    font: inherit; font-weight: 600; font-size: .82rem; padding: 4px 10px;
                }
                .pl-btn:hover { background: var(--bg-hover); }

                .pl-scene {
                    flex: 1 1 auto; min-height: 0; width: 100%;
                    display: flex; align-items: center; justify-content: center;
                }
                /* Le damier est un CARRÉ borné par la place disponible, sans
                   calcul : aspect-ratio fait le travail dans les deux sens. */
                /* Colonnes ET rangées en 1fr. Sans la seconde ligne, les
                   rangées se dimensionnent au CONTENU : une case vide
                   s'écrase, une case avec pièce s'étire — les cases n'étaient
                   carrées que peuplées. */
                .pl-damier {
                    aspect-ratio: 1; max-width: 100%; max-height: 100%;
                    display: grid;
                    grid-template-columns: repeat(${n}, 1fr);
                    grid-template-rows: repeat(${n}, 1fr);
                    border: 6px solid ${co.bord}; border-radius: 10px;
                    box-shadow: var(--shadow-md); touch-action: manipulation;
                    width: min(100cqw, 92cqh);
                }
                .pl-case {
                    position: relative; border: 0; padding: 0; margin: 0;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; font: inherit; min-width: 0; min-height: 0;
                    -webkit-tap-highlight-color: transparent;
                }
                .pl-case--claire { background: ${co.claire}; }
                .pl-case--foncee { background: ${co.foncee}; }
                .pl-case--derniere::after {
                    content: ''; position: absolute; inset: 0;
                    background: rgba(250, 204, 21, .32); pointer-events: none;
                }
                .pl-case--choisie::after {
                    content: ''; position: absolute; inset: 0;
                    box-shadow: inset 0 0 0 3px #2563eb; pointer-events: none;
                }
                .pl-case--echec::after {
                    content: ''; position: absolute; inset: 0;
                    background: rgba(239, 68, 68, .45); pointer-events: none;
                }
                /* Une destination possible : le point discret des applications
                   d'échecs — assez visible pour guider, trop petit pour jouer
                   à sa place. */
                .pl-case--but::before {
                    content: ''; position: absolute; width: 30%; height: 30%;
                    border-radius: 50%; background: rgba(15, 23, 42, .3);
                    pointer-events: none; z-index: 2;
                }
                .pl-case--but:has(.pl-pion)::before, .pl-case--but:has(.pl-glyphe)::before,
                .pl-case--but:has(.pl-disque)::before {
                    width: 86%; height: 86%; background: none;
                    border: 4px solid rgba(15, 23, 42, .35);
                }

                .pl-disque {
                    width: 82%; height: 82%; border-radius: 50%;
                    box-shadow: 0 2px 4px rgba(0,0,0,.4);
                }
                .pl-disque--noir { background: radial-gradient(circle at 32% 30%, #475569, #0b1120 70%); }
                .pl-disque--blanc { background: radial-gradient(circle at 32% 30%, #ffffff, #cbd5e1 70%); }

                .pl-pion {
                    width: 78%; height: 78%; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 2px 4px rgba(0,0,0,.45), inset 0 -4px 0 rgba(0,0,0,.25);
                }
                .pl-pion--blanc { background: radial-gradient(circle at 34% 30%, #ffffff, #d7dbe2 72%); }
                .pl-pion--noir { background: radial-gradient(circle at 34% 30%, #56637a, #101828 72%); }
                .pl-pion i {
                    font-style: normal; font-size: clamp(10px, 2.6cqw, 22px); line-height: 1;
                }
                .pl-pion--blanc i { color: #a16207; }
                .pl-pion--noir i { color: #fbbf24; }

                .pl-glyphe {
                    font-size: min(6.4cqw, 6.4cqh); line-height: 1;
                    filter: drop-shadow(0 2px 2px rgba(0,0,0,.35));
                }
                .pl-glyphe--noir { color: #1f2937; }
                .pl-glyphe--blanc {
                    color: #fafaf9;
                    text-shadow: 0 0 2px #1f2937, 0 0 1px #1f2937;
                }

                .pl-note {
                    min-height: 2.4em; text-align: center; width: 100%; max-width: 640px;
                    font-size: clamp(11px, 2.7cqw, 14px); line-height: 1.35;
                    color: var(--text-muted); flex: 0 0 auto;
                }
                .pl-note b { color: var(--text-main); }
                .pl-bulle { display: inline-block; padding: 5px 13px; border-radius: 999px; font-weight: 700; }
                .pl-bulle--ok { background: color-mix(in srgb, var(--success) 20%, transparent); color: var(--success); }
                .pl-bulle--ko { background: color-mix(in srgb, var(--danger) 18%, transparent); color: var(--danger); }
            </style>
            <div class="pl-wrap">
                <div class="pl-haut">
                    <span class="pl-tour"><span class="pl-jeton" data-jeton></span><span data-tour></span></span>
                    <span data-score></span>
                    <button type="button" class="pl-btn" data-neuf>↺ Nouvelle partie</button>
                </div>
                <div class="pl-scene">
                    <div class="pl-damier" data-damier role="grid" aria-label="${this.ad.id}"></div>
                </div>
                <p class="pl-note" data-note></p>
            </div>`;

        this.damierEl = this.container.querySelector('[data-damier]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.tourEl = this.container.querySelector('[data-tour]');
        this.jetonEl = this.container.querySelector('[data-jeton]');
        this.scoreEl = this.container.querySelector('[data-score]');
        this.container.querySelector('[data-neuf]').addEventListener('click', () => this.nouvellePartie());

        const cases = [];
        for (let y = 0; y < n; y++) {
            for (let x = 0; x < n; x++) {
                const claire = (x + y) % 2 === 0;
                cases.push(`<button type="button" class="pl-case ${claire ? 'pl-case--claire' : 'pl-case--foncee'}"
                    data-x="${x}" data-y="${y}" aria-label="case ${String.fromCharCode(97 + x)}${n - y}"></button>`);
            }
        }
        this.damierEl.innerHTML = cases.join('');
        this.damierEl.addEventListener('pointerdown', (e) => {
            const b = e.target.closest('[data-x]');
            if (!b || this.isDemo) return;
            e.preventDefault();
            this.toucher(Number(b.dataset.x), Number(b.dataset.y));
        });

        this.nouvellePartie();
    }

    startGameLoop() { /* Au tour par tour : rien à animer en continu. */ }

    nouvellePartie() {
        clearTimeout(this.timerIA);
        this.etat = this.ad.module.initial();
        this.selection = null;
        this.dernier = null;
        this.finie = null;
        this.peindre();
        const contre = this.mode === 'ia'
            ? `Tu joues les <b>${this.ad.noms[this.humain]}</b> contre l'ordinateur.`
            : 'À deux sur le même écran : chacun joue à son tour.';
        this.note(`${contre} ${this.ad.destinationSeule ? 'Touche une case allumée.' : 'Touche une pièce, puis sa destination.'}`);
    }

    // --- L'affichage -----------------------------------------------------------

    caseEl(x, y) {
        return this.damierEl.querySelector(`[data-x="${x}"][data-y="${y}"]`);
    }

    peindre() {
        const n = this.ad.taille;
        const m = this.ad.module;
        const enEchecRoi = this.ad.id === 'echecs' && !this.finie && echecs.enEchec(this.etat)
            ? this.etat.cases.indexOf(this.etat.trait === 'B' ? 'K' : 'k') : -1;

        for (let y = 0; y < n; y++) {
            for (let x = 0; x < n; x++) {
                const el = this.caseEl(x, y);
                const i = y * n + x;
                el.innerHTML = this.ad.jouable(x, y) ? this.ad.pieceHtml(this.etat.cases[i]) : '';
                el.classList.toggle('pl-case--derniere',
                    !!this.dernier && (this.dernier.some(k => k === i)));
                el.classList.toggle('pl-case--echec', i === enEchecRoi);
                el.classList.remove('pl-case--choisie', 'pl-case--but');
            }
        }
        // Les destinations possibles : depuis la sélection, ou toutes les
        // cases jouables à l'Othello.
        if (!this.finie && this.tourHumain()) {
            const coups = m.coups(this.etat);
            if (this.ad.destinationSeule) {
                for (const c of coups) {
                    const p = this.ad.caseDe(c);
                    if (p) this.caseEl(p.x, p.y).classList.add('pl-case--but');
                }
            } else if (this.selection) {
                this.caseEl(this.selection.x, this.selection.y).classList.add('pl-case--choisie');
                for (const c of coups) {
                    const de = this.ad.deDe(c);
                    if (de.x === this.selection.x && de.y === this.selection.y) {
                        const vers = this.ad.versDe(c);
                        this.caseEl(vers.x, vers.y).classList.add('pl-case--but');
                    }
                }
            }
        }
        this.majBandeau();
    }

    majBandeau() {
        const trait = this.etat.trait;
        this.jetonEl.style.background = trait === 'B' || (this.ad.id === 'othello' && trait === 'B')
            ? '#f8fafc' : '#0f172a';
        if (this.ad.id === 'othello') {
            const s = othello.score(this.etat);
            this.scoreEl.textContent = `⚫ ${s.N} — ${s.B} ⚪`;
        } else if (this.ad.id === 'dames') {
            const pieces = this.etat.cases.filter(Boolean);
            this.scoreEl.textContent = `⚪ ${pieces.filter(p => p.couleur === 'B').length} — ${pieces.filter(p => p.couleur === 'N').length} ⚫`;
        } else {
            this.scoreEl.textContent = echecs.enEchec(this.etat) && !this.finie ? 'Échec !' : '';
        }
        this.tourEl.textContent = this.finie ? 'Partie finie'
            : this.mode === 'ia'
                ? (this.tourHumain() ? 'À toi de jouer' : 'L\'ordinateur réfléchit…')
                : `Aux ${this.ad.noms[trait]}`;
    }

    // --- Le jeu ----------------------------------------------------------------

    tourHumain() {
        return this.mode === 'deux' || this.etat.trait === this.humain;
    }

    toucher(x, y) {
        if (this.finie || !this.tourHumain()) return;
        const m = this.ad.module;
        const coups = m.coups(this.etat);

        if (this.ad.destinationSeule) {
            const coup = coups.find(c => { const p = this.ad.caseDe(c); return p && p.x === x && p.y === y; });
            if (coup) this.jouerCoup(coup);
            return;
        }

        // Prendre une pièce à soi la sélectionne (ou re-sélectionne) ; toucher
        // une destination allumée joue. Les promotions d'échecs vont à la
        // dame — le choix du cavalier attendra qu'un élève le demande.
        const piece = this.etat.cases[y * this.ad.taille + x];
        const mienne = piece && (this.ad.id === 'echecs'
            ? (piece === piece.toUpperCase() ? 'B' : 'N') === this.etat.trait
            : piece.couleur === this.etat.trait);
        if (this.selection) {
            const coup = coups.find(c => {
                const de = this.ad.deDe(c), vers = this.ad.versDe(c);
                return de.x === this.selection.x && de.y === this.selection.y
                    && vers.x === x && vers.y === y && (!c.promotion || c.promotion === 'Q');
            });
            if (coup) { this.selection = null; this.jouerCoup(coup); return; }
        }
        this.selection = mienne ? { x, y } : null;
        this.peindre();
    }

    jouerCoup(coup) {
        const m = this.ad.module;
        this.dernier = this.casesDuCoup(coup);
        this.etat = m.jouer(this.etat, coup);
        this.finie = m.terminee(this.etat);
        this.peindre();

        if (this.finie) return this.annoncerFin();
        if (coup.passe) this.note('Pas de coup possible : le tour passe.');
        // Pendant la démonstration, c'est le ROBOT qui joue les deux camps,
        // depuis sa propre boucle : la riposte automatique jouerait par-dessus
        // lui, et deux coups partiraient de la même position.
        if (!this.isDemo && this.mode === 'ia' && !this.tourHumain()) {
            // Un délai court : l'ordinateur qui répond dans la milliseconde
            // donne l'impression de ne pas avoir regardé le coup qu'on vient
            // de jouer.
            this.timerIA = setTimeout(() => this.jouerIA(), 420);
        }
    }

    casesDuCoup(coup) {
        const n = this.ad.taille;
        if (coup.passe) return [];
        if (this.ad.id === 'othello') return [coup.y * n + coup.x];
        if (this.ad.id === 'echecs') return [coup.de, coup.vers];
        return [coup.de.y * n + coup.de.x, coup.vers.y * n + coup.vers.x];
    }

    jouerIA() {
        if (!this.isRunning || this.finie) return;
        const r = meilleurCoup(this.ad.module, this.etat, { ...this.ia, rng: this.rng });
        if (!r) return;
        this.jouerCoup(r.coup);
    }

    annoncerFin() {
        const t = this.finie;
        const detail = this.ad.verdict(t) || '';
        if (t.gagnant === null) {
            this.note(`🤝 Partie nulle. ${detail}`, 'ok');
        } else if (this.mode === 'ia') {
            const gagne = t.gagnant === this.humain;
            this.note(gagne ? `🏆 Gagné ! ${detail}` : `L'ordinateur l'emporte. ${detail}`, gagne ? 'ok' : 'ko');
        } else {
            this.note(`🏆 Les ${this.ad.noms[t.gagnant]} l'emportent. ${detail}`, 'ok');
        }
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = ton ? `<span class="pl-bulle pl-bulle--${ton}">${html}</span>` : html;
    }

    // --- Le robot ---------------------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.damierEl);
        this.demoGate = gate;
        const fin = () => { cur?.destroy(); gate?.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!await cur.pause(600) || !this.isRunning) return fin();
        for (const b of this.ad.bulles) {
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            cur.say(b, this.damierEl);
            if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        }

        // L'ordinateur contre lui-même, quelques coups : on voit la partie
        // respirer avant d'y toucher.
        for (let i = 0; i < 6 && !this.finie && this.isRunning; i++) {
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const r = meilleurCoup(this.ad.module, this.etat, { profondeur: 1, rng: this.rng });
            if (!r) break;
            const cible = this.casesDuCoup(r.coup)[this.ad.id === 'othello' ? 0 : 1];
            const el = cible != null && this.caseEl(cible % this.ad.taille, Math.floor(cible / this.ad.taille));
            if (el && !await cur.tap(el)) return fin();
            this.jouerCoup(r.coup);
            if (!await cur.pause(DEMO_SPEED.press) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('À toi : chaque coup se prépare un coup d\'avance.', this.damierEl);
        if (!await cur.pause(DEMO_SPEED.between)) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        clearTimeout(this.timerIA);
        super.destroy();
    }
}

const fabrique = (id) => (container, isDemo, params) => {
    const jeu = new Plateau(container, isDemo, params, ADAPTATEURS[id]);
    jeu.start();
    return jeu;
};

export const engineOthello = fabrique('othello');
export const engineDames = fabrique('dames');
export const engineEchecs = fabrique('echecs');
