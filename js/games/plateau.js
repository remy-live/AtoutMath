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
import { critiquer, defense, nommerCoup, estMat, preparer } from '../core/mat.js';
import { POSITIONS_MAT, FAMILLES_MAT, COMBIEN_MAT } from '../data/matProblemes.js';

// LE SÉLECTEUR DE VARIANTE ︎ N'EST PAS DÉCORATIF.
//
// « ♟ » (U+265F) est le seul symbole d'échecs qu'iOS classe comme ÉMOJI : sans
// rien demander, Safari le rend avec sa police d'émojis, en couleur, et la
// couleur CSS ne s'applique plus. Résultat : les pions blancs sortaient noirs
// sur l'iPhone — huit pions noirs au premier rang des Blancs — alors que tours,
// cavaliers et dames étaient corrects. U+FE0E demande explicitement la
// présentation TEXTE, celle qui obéit à `color`.
const TEXTE = '︎';
const GLYPHES = {
    K: '♚' + TEXTE, Q: '♛' + TEXTE, R: '♜' + TEXTE,
    B: '♝' + TEXTE, N: '♞' + TEXTE, P: '♟' + TEXTE
};

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
            return `<span class="pl-pion ${c}">${p.genre === 'd' ? `<i>${GLYPHES.Q}</i>` : ''}</span>`;
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
            'Chaque pièce a sa marche. Touche une pièce : ses coups s\'allument.',
            'Un pion qui atteint le bout se transforme. Tu choisis en quoi.'
        ]
    }
};

class Plateau extends BaseGame {
    constructor(container, isDemo, params, adaptateur) {
        super(container, isDemo, params, adaptateur.id);
        this.ad = adaptateur;
        // TROIS MODES, et le troisième n'est pas une partie : « exercice »
        // pose une position figée et demande le mat. On le fait vivre DANS le
        // jeu d'échecs plutôt qu'à côté — même damier, mêmes pièces, mêmes
        // coups qui s'allument : ce qui est déjà appris ne se réapprend pas.
        this.mode = ['deux', 'exercice'].includes(this.params.mode) ? this.params.mode : 'ia';
        if (this.mode === 'exercice' && adaptateur.id !== 'echecs') this.mode = 'ia';
        this.exercice = this.mode === 'exercice';
        this.indexProbleme = this.premierIndex();
        this.resolus = 0;
        const [profondeur, fantaisie] = NIVEAUX[adaptateur.id][this.params.niveau] || NIVEAUX[adaptateur.id].moyen;
        this.ia = { profondeur, fantaisie };
        this.rng = makeRng(this.params.seed);
        this.humain = adaptateur.premier;                  // l'humain ouvre toujours
        this.selection = null;
        this.dernier = null;
    }

    /** Où l'on entre dans la progression : au début, ou directement aux mats en deux. */
    premierIndex() {
        const d = this.params.depart;
        if (d === 'deux') return POSITIONS_MAT.findIndex(p => p.coups === 2);
        if (d === 'milieu') return Math.floor(POSITIONS_MAT.length / 3);
        return 0;
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
                    position: relative;
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
                    /* Les pièces remplissent VRAIMENT leur case : à 6.4 elles
                       flottaient au milieu d'un carré trop grand, et sur un
                       téléphone il fallait viser. */
                    font-size: min(8.6cqw, 8.6cqh); line-height: 1;
                    filter: drop-shadow(0 2px 2px rgba(0,0,0,.35));
                    /* Ceinture et bretelles avec le U+FE0E des glyphes : ce
                       réglage dit la même chose au navigateur, en CSS. */
                    font-variant-emoji: text;
                }
                .pl-glyphe--noir { color: #1f2937; }
                .pl-glyphe--blanc {
                    color: #fafaf9;
                    text-shadow: 0 0 2px #1f2937, 0 0 1px #1f2937;
                }

                /* LE CHOIX DE PROMOTION.
                   Il se pose PAR-DESSUS le damier, pas à côté : c'est le seul
                   endroit où le regard est déjà, et sur un téléphone il n'y a
                   de la place nulle part ailleurs. Le voile bloque aussi le
                   damier — tant qu'on n'a pas choisi, il n'y a rien d'autre à
                   faire. */
                .pl-promo {
                    position: absolute; inset: 0; z-index: 6;
                    display: flex; align-items: center; justify-content: center;
                    background: rgba(15, 23, 42, .55); backdrop-filter: blur(2px);
                }
                .pl-promo[hidden] { display: none; }
                .pl-promo-boite {
                    background: var(--bg-panel); border: 1px solid var(--border);
                    border-radius: 14px; box-shadow: var(--shadow-md);
                    padding: 12px 14px; max-width: 94%;
                    display: flex; flex-direction: column; align-items: center; gap: 9px;
                }
                .pl-promo-titre {
                    margin: 0; text-align: center; font-weight: 700;
                    font-size: clamp(11px, 2.8cqw, 15px); color: var(--text-main);
                }
                .pl-promo-choix { display: flex; gap: 7px; flex-wrap: wrap; justify-content: center; }
                .pl-promo-btn {
                    display: flex; flex-direction: column; align-items: center; gap: 1px;
                    padding: 7px 9px; min-width: 62px; cursor: pointer; font: inherit;
                    border: 2px solid var(--border); border-radius: 11px;
                    background: ${co.claire};
                }
                .pl-promo-btn:hover { border-color: #2563eb; transform: translateY(-2px); }
                .pl-promo-btn .pl-glyphe { font-size: clamp(24px, 7cqw, 40px); }
                .pl-promo-btn small { font-size: .7rem; font-weight: 700; color: #3f3222; }

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
                    <div class="pl-promo" data-promo hidden></div>
                </div>
                <p class="pl-note" data-note></p>
            </div>`;

        this.damierEl = this.container.querySelector('[data-damier]');
        this.promoEl = this.container.querySelector('[data-promo]');
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
        if (this.exercice) return this.poserProbleme();
        clearTimeout(this.timerIA);
        this.fermerPromotion();
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

    // --- Le mode exercice ------------------------------------------------------

    poserProbleme(avance = 0) {
        clearTimeout(this.timerIA);
        this.fermerPromotion();
        this.indexProbleme = (this.indexProbleme + avance + POSITIONS_MAT.length) % POSITIONS_MAT.length;
        const p = POSITIONS_MAT[this.indexProbleme];
        this.probleme = p;
        this.famille = FAMILLES_MAT[p.famille];
        this.etat = echecs.fenVersEtat(p.fen);
        this.depart = this.etat;                 // pour revenir en arrière
        this.coupsJoues = 0;
        this.selection = null;
        this.dernier = null;
        this.finie = null;
        this.peindre();
        this.note(`<b>Problème ${this.indexProbleme + 1} / ${COMBIEN_MAT.total}</b> — `
            + `${this.famille.titre}. Les Blancs jouent et matent en `
            + `<b>${p.coups} coup${p.coups > 1 ? 's' : ''}</b>. `
            + 'Touche une pièce blanche, puis sa case d\'arrivée.');
    }

    /**
     * UN COUP D'EXERCICE : on ne le joue que s'il est le bon.
     *
     * On ne dit jamais quel coup il fallait — le chercher EST l'exercice. On
     * dit ce qui manque : pas d'échec du tout, le roi s'échappe par g7, les
     * Noirs parent, ou bien c'est un PAT et l'on a perdu la victoire.
     */
    coupExercice(coup) {
        const restants = this.probleme.coups - this.coupsJoues;
        const texte = nommerCoup(this.etat, coup);
        const verdict = critiquer(this.etat, coup, restants);
        this.selection = null;

        if (verdict.raison !== 'bon') {
            this.peindre();
            this.note(`<b>${texte}</b> — ${this.expliquerMat(verdict)}`, 'ko');
            this.onWrongAnswer(null, {
                concept: 'geo.espace.reperage',
                questionText: `${this.famille.titre} — mat en ${this.probleme.coups}`,
                input: texte, expected: 'le coup qui mate',
                customMessage: this.expliquerMat(verdict).replace(/<[^>]+>/g, '')
            });
            return;
        }

        this.dernier = this.casesDuCoup(coup);
        this.etat = echecs.jouer(this.etat, coup);
        this.coupsJoues++;
        this.onCorrectAnswer(null, 'geo.espace.reperage', {
            questionText: `${this.famille.titre} — coup ${this.coupsJoues}`,
            expected: texte, given: texte, points: 6
        });

        if (estMat(this.etat)) {
            this.finie = { gagnant: 'B', raison: 'échec et mat' };
            this.resolus++;
            this.peindre();
            this.note(`🎉 <b>${texte}</b> — échec et mat ! <br><b>${this.famille.titre}.</b> `
                + this.famille.lecon, 'ok');
            this.onCorrectAnswer(null, 'geo.espace.reperage', {
                questionText: `${this.famille.titre} — mat en ${this.probleme.coups}`,
                expected: this.probleme.solution, given: texte,
                points: 10 + this.probleme.coups * 6
            });
            // On enchaîne : la progression est le cœur du mode exercice.
            this.timerIA = setTimeout(() => {
                if (this.isRunning) this.poserProbleme(1);
            }, 3400);
            return;
        }

        // Mat en deux : les Noirs se défendent — et l'on prend la MEILLEURE
        // défense, celle qui laisse le plus de jeu, pas un abandon.
        const rep = defense(this.etat, this.rng);
        const nomRep = rep ? nommerCoup(this.etat, rep) : null;
        if (rep) {
            this.dernier = this.casesDuCoup(rep);
            this.etat = echecs.jouer(this.etat, rep);
        }
        this.peindre();
        this.note(`✅ <b>${texte}</b> : c'est le bon premier coup. Les Noirs se défendent par `
            + `<b>${nomRep}</b> — maintenant, le mat.`, 'ok');
    }

    /** Ce qui manque, en une phrase. Jamais le coup à jouer. */
    expliquerMat(verdict) {
        switch (verdict.raison) {
        case 'pas-echec':
            return 'ce coup ne donne pas échec. Un mat est toujours un échec dont on ne peut '
                + 'pas sortir : commence par ATTAQUER le roi noir.';
        case 'fuite':
            return `c'est bien un échec, mais le roi noir s'échappe en <b>${verdict.detail}</b>. `
                + 'Un mat ne laisse aucune case libre.';
        case 'parade':
            return `c'est bien un échec, mais les Noirs parent par <b>${verdict.detail}</b> : `
                + 'ils bouchent ou ils prennent. Un mat ne se pare pas.';
        case 'pat':
            return 'attention : les Noirs n\'ont plus AUCUN coup, mais ils ne sont pas en échec. '
                + 'C\'est un PAT — partie nulle. Le pire résultat quand on gagnait.';
        case 'mate-trop-tot':
            return 'ce coup mate tout de suite ; ce problème demande deux coups.';
        case 'defense':
            return `après ce coup, les Noirs tiennent par <b>${verdict.detail}</b> et le mat `
                + 'n\'arrive plus. Un premier coup de mat en deux doit battre TOUTES les '
                + 'réponses, pas seulement la plus naturelle.';
        default:
            return 'ce n\'est pas le mat.';
        }
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
        if (this.promoEl && !this.promoEl.hidden) return;   // on choisit d'abord
        const m = this.ad.module;
        const coups = m.coups(this.etat);

        if (this.ad.destinationSeule) {
            const coup = coups.find(c => { const p = this.ad.caseDe(c); return p && p.x === x && p.y === y; });
            if (coup) this.jouerCoup(coup);
            return;
        }

        // Prendre une pièce à soi la sélectionne (ou re-sélectionne) ; toucher
        // une destination allumée joue.
        const piece = this.etat.cases[y * this.ad.taille + x];
        const mienne = piece && (this.ad.id === 'echecs'
            ? (piece === piece.toUpperCase() ? 'B' : 'N') === this.etat.trait
            : piece.couleur === this.etat.trait);
        if (this.selection) {
            const candidats = coups.filter(c => {
                const de = this.ad.deDe(c), vers = this.ad.versDe(c);
                return de.x === this.selection.x && de.y === this.selection.y
                    && vers.x === x && vers.y === y;
            });
            // Une seule case d'arrivée, QUATRE coups différents : c'est une
            // promotion. Le noyau les propose tous, l'écran doit demander
            // lequel — la sous-promotion en cavalier est parfois le seul coup
            // qui gagne, et c'est justement ce qui la rend intéressante.
            if (candidats.length > 1 && candidats.every(c => c.promotion)) {
                this.demanderPromotion(candidats);
                return;
            }
            if (candidats[0]) { this.selection = null; this.jouerCoup(candidats[0]); return; }
        }
        this.selection = mienne ? { x, y } : null;
        this.peindre();
    }

    // --- La promotion du pion ---------------------------------------------------

    /**
     * Le pion touche le bout : en quoi le transforme-t-on ?
     *
     * Les quatre pièces sont montrées telles qu'elles apparaîtront sur le
     * damier — même glyphe, même couleur. On ne demande pas « Q, R, B ou N » à
     * un élève de sixième : on lui montre la dame, la tour, le fou, le cavalier.
     */
    demanderPromotion(candidats) {
        const blanc = this.etat.trait === 'B';
        const noms = { Q: 'Dame', R: 'Tour', B: 'Fou', N: 'Cavalier' };
        this.promoEl.innerHTML = `
            <div class="pl-promo-boite">
                <p class="pl-promo-titre">Ton pion arrive au bout ! En quoi le transformes-tu ?</p>
                <div class="pl-promo-choix">
                    ${['Q', 'R', 'B', 'N'].filter(p => candidats.some(c => c.promotion === p)).map(p => `
                        <button type="button" class="pl-promo-btn" data-choix="${p}" aria-label="${noms[p]}">
                            <span class="pl-glyphe ${blanc ? 'pl-glyphe--blanc' : 'pl-glyphe--noir'}">${GLYPHES[p]}</span>
                            <small>${noms[p]}</small>
                        </button>`).join('')}
                </div>
                <button type="button" class="pl-btn" data-annule>Annuler</button>
            </div>`;
        this.promoEl.hidden = false;
        this.note('Presque toujours la dame — mais pas toujours : la tour ou le cavalier évitent parfois un pat ou donnent mat.');

        this.promoEl.onpointerdown = (e) => {
            e.preventDefault();
            const b = e.target.closest('[data-choix]');
            // Le voile lui-même et « Annuler » renoncent : le pion reste
            // sélectionné, on peut choisir une autre case.
            if (!b) {
                if (e.target === this.promoEl || e.target.closest('[data-annule]')) this.fermerPromotion();
                return;
            }
            const coup = candidats.find(c => c.promotion === b.dataset.choix);
            this.fermerPromotion();
            if (!coup) return;
            this.selection = null;
            this.note(`Le pion devient <b>${noms[coup.promotion].toLowerCase()}</b>.`);
            this.jouerCoup(coup);
        };
    }

    fermerPromotion() {
        if (!this.promoEl) return;
        this.promoEl.hidden = true;
        this.promoEl.innerHTML = '';
        this.promoEl.onpointerdown = null;
    }

    jouerCoup(coup) {
        if (this.exercice) return this.coupExercice(coup);
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
        this.fermerPromotion();
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
