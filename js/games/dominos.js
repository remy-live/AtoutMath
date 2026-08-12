// LES DOMINOS — la chaîne où chaque question touche sa réponse, à l'écran.
//
// Le noyau (core/dominos.js) monte la chaîne et garantit qu'il n'y a qu'une
// façon d'arriver au bout. Ici on pose les pièces sur la table, on écoute les
// clics, et on tient les deux promesses qui font l'intérêt de ce jeu :
//
//   · IL EST AUTO-CORRECTIF. Rien à « vérifier » à la fin : une pièce qui ne
//     va pas ne se pose pas, et quand la réserve est vide, c'est fini. L'élève
//     n'a besoin de personne pour savoir qu'il a réussi.
//   · IL SE JOUE AU DOIGT. On touche une pièce de la réserve, elle rejoint la
//     chaîne. Pas de glissé : sur une tablette posée en travers d'une table,
//     le glissé est ce qui rate.
//
// L'aide et le robot disent tous deux la MÊME chose, et jamais la réponse
// nue : « le bout ouvert demande 7 × 8, donc je cherche 56 à gauche d'une
// pièce ». C'est la méthode qu'on veut laisser à l'élève, pas la pièce.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    DEPART, ARRIVEE, pieceSuivante, boutOuvert, posePossible,
    direJoint, direErreur, reserveMelangee
} from '../core/dominos.js';
import { chaineDepuisGenerateur, sourceDe } from '../core/generators/dominos.js';

const COMPETENCE = 'num.logique.dominos';

class Dominos extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'dominos');
        this.rng = makeRng(this.params.seed);
        this.source = sourceDe(this.params.source);
        this.nbPieces = Number(this.params.pieces) || 9;
        this.reussis = 0;
        this.aidesUtilisees = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .dm-wrap {
                    display: flex; flex-direction: column; gap: 10px; width: 100%; height: 100%;
                    align-items: center; padding: 8px 10px 12px; box-sizing: border-box;
                    color: var(--text-main); overflow-y: auto; container-type: inline-size;
                }
                .dm-tete { text-align: center; font-size: .95rem; flex: 0 0 auto; }
                .dm-tete b { font-size: 1.05rem; }
                .dm-consigne { color: var(--text-muted); font-size: .84rem; }

                /* LA CHAÎNE. Elle se replie ligne par ligne : douze dominos ne
                   tiennent pas côte à côte sur un téléphone, et une chaîne qui
                   sort de l'écran ne se relit pas. */
                .dm-chaine, .dm-reserve {
                    display: flex; flex-wrap: wrap; justify-content: center;
                    gap: 6px; width: 100%; flex: 0 0 auto;
                }
                .dm-chaine { min-height: 54px; align-content: flex-start; }
                .dm-titre-zone {
                    align-self: flex-start; font-size: .78rem; font-weight: 700;
                    color: var(--text-muted); letter-spacing: .04em; text-transform: uppercase;
                }

                /* LA PIÈCE. Deux moitiés, un trait au milieu, et une encoche
                   d'accroche à chaque bout : c'est ce qui la fait lire comme un
                   domino et non comme un bouton coupé en deux. */
                .dm-piece {
                    display: flex; align-items: stretch; border: 2px solid var(--text-main);
                    border-radius: 8px; background: var(--bg-panel); overflow: hidden;
                    font-weight: 700; min-height: 44px; user-select: none;
                    -webkit-tap-highlight-color: transparent;
                }
                .dm-demi {
                    display: flex; align-items: center; justify-content: center;
                    padding: 5px 9px; text-align: center; line-height: 1.15;
                    font-size: clamp(11px, 2.4cqw, 15px);
                }
                .dm-demi--g { background: color-mix(in srgb, #7dd3fc 22%, var(--bg-panel)); min-width: 46px; }
                .dm-demi--d { background: color-mix(in srgb, #fcd34d 20%, var(--bg-panel)); min-width: 56px; }
                .dm-demi + .dm-demi { border-left: 2px solid var(--text-main); }
                .dm-demi--bout { font-weight: 900; letter-spacing: .05em; font-size: clamp(9px, 1.9cqw, 12px); }

                .dm-piece--reserve { cursor: pointer; }
                .dm-piece--reserve:hover { box-shadow: 0 3px 10px rgba(0,0,0,.16); transform: translateY(-2px); }
                .dm-piece--reserve { transition: transform .12s ease, box-shadow .12s ease; }
                .dm-piece--posee { animation: dm-pose .32s ease; }
                @keyframes dm-pose { from { transform: scale(.8); opacity: .3; } }
                .dm-piece--faute { animation: dm-faute .45s ease 2; }
                @keyframes dm-faute {
                    50% { border-color: var(--danger, #dc2626); transform: translateX(-4px) rotate(-2deg); }
                }
                .dm-piece--montre { box-shadow: 0 0 0 4px var(--primary); }
                /* Le bout ouvert : c'est là qu'il faut regarder, et l'élève qui
                   cherche sa pièce le perd de vue une fois sur deux. */
                .dm-piece--bout .dm-demi--d {
                    background: color-mix(in srgb, var(--primary) 26%, var(--bg-panel));
                }

                .dm-barre { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; flex: 0 0 auto; }
                .dm-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700;
                    padding: 7px 13px;
                }
                .dm-note {
                    min-height: 2.6em; text-align: center; font-size: .86rem;
                    color: var(--text-muted); max-width: 640px; flex: 0 0 auto; padding: 0 8px;
                }
                .dm-note--ok { color: var(--success, #16a34a); font-weight: 700; }
                .dm-note--ko { color: var(--danger, #dc2626); font-weight: 600; }
            </style>
            <div class="dm-wrap">
                <div class="dm-tete" data-tete></div>
                <div class="dm-titre-zone">La chaîne</div>
                <div class="dm-chaine" data-chaine></div>
                <div class="dm-titre-zone">La réserve</div>
                <div class="dm-reserve" data-reserve></div>
                <div class="dm-barre">
                    <button type="button" class="dm-btn" data-aide>💡 Aide-moi</button>
                    <button type="button" class="dm-btn" data-recommencer>↺ Recommencer</button>
                    <button type="button" class="dm-btn" data-neuf>Autre jeu</button>
                </div>
                <div class="dm-note" data-note></div>
            </div>`;

        this.teteEl = this.container.querySelector('[data-tete]');
        this.chaineEl = this.container.querySelector('[data-chaine]');
        this.reserveEl = this.container.querySelector('[data-reserve]');
        this.noteEl = this.container.querySelector('[data-note]');

        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.container.querySelector('[data-recommencer]').onclick = () => this.recommencer();
        this.container.querySelector('[data-neuf]').onclick = () => this.showNext();
    }

    startGameLoop() { this.poser(); }

    // --- Un jeu de dominos --------------------------------------------------

    poser() {
        const voulu = Math.max(3, this.nbPieces - 1);
        this.chaine = chaineDepuisGenerateur(this.source.id, this.params.sourceParams || {}, voulu, this.rng);
        this.recommencer();
        return true;
    }

    recommencer() {
        // La pièce DÉPART est déjà sur la table : la chercher n'apprendrait
        // rien, elle ne porte aucun calcul.
        this.posees = 1;
        this.reserve = reserveMelangee(this.chaine, this.rng);
        this.teteEl.innerHTML = `<b>Dominos — ${echapper(this.source.label)}</b><br>
            <span class="dm-consigne">Le bout ouvert de la chaîne pose une question :
            trouve la pièce qui porte sa réponse à gauche.</span>`;
        this.dessiner();
        this.note('');
    }

    /** Une pièce, telle qu'elle se lit sur la table. */
    pieceHtml(piece, classes) {
        const bout = (t) => t === DEPART || t === ARRIVEE;
        const demi = (t, cote) => `<span class="dm-demi dm-demi--${cote}${bout(t) ? ' dm-demi--bout' : ''}">${echapper(t)}</span>`;
        return `<div class="dm-piece ${classes}" data-piece="${piece.id}">
            ${demi(piece.gauche, 'g')}${demi(piece.droite, 'd')}</div>`;
    }

    dessiner() {
        const posees = this.chaine.pieces.slice(0, this.posees);
        this.chaineEl.innerHTML = posees
            .map((p, i) => this.pieceHtml(p, 'dm-piece--posee' + (i === posees.length - 1 ? ' dm-piece--bout' : '')))
            .join('');
        this.reserveEl.innerHTML = this.reserve
            .map(id => this.pieceHtml(this.chaine.pieces[id], 'dm-piece--reserve'))
            .join('');
        this.reserveEl.querySelectorAll('[data-piece]').forEach(el => {
            el.onclick = () => this.jouer(Number(el.dataset.piece), el);
        });
    }

    // --- Poser une pièce ----------------------------------------------------

    jouer(id, el) {
        if (this.isDemo || !this.chaine) return;
        if (!posePossible(this.chaine, this.posees, id)) return this.refuser(id, el);
        this.accepter(id);
    }

    accepter(id) {
        const piece = this.chaine.pieces[id];
        const couple = piece.couple;
        this.reserve = this.reserve.filter(x => x !== id);
        this.posees++;
        this.dessiner();

        // CHAQUE PIÈCE POSÉE EST UN CALCUL JUSTE, et c'est la notion empruntée
        // qu'on crédite — un élève qui enchaîne des dominos de tables travaille
        // ses tables, pas une compétence « dominos ».
        if (couple) {
            this.onCorrectAnswer(null, this.chaine.skillId || COMPETENCE, {
                questionText: couple.q,
                expected: couple.r,
                given: couple.r,
                points: 5
            });
        }

        if (this.posees >= this.chaine.pieces.length) {
            this.reussis++;
            this.note('✅ La chaîne est complète et la dernière pièce porte ARRIVÉE : '
                + 'tout est juste, et tu n\'avais besoin de personne pour le savoir.', 'ok');
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: `Dominos — ${this.source.label} (${this.chaine.pieces.length} pièces)`,
                expected: 'chaîne complète',
                given: 'chaîne complète',
                points: 10 + this.chaine.couples.length * 2
            });
        } else {
            this.note(`Bien : ${couple ? `${echapper(couple.q)} fait ${echapper(couple.r)}` : ''}. `
                + `Il reste ${this.reserve.length} pièce${this.reserve.length > 1 ? 's' : ''}.`);
        }
    }

    refuser(id, el) {
        if (el) { el.classList.add('dm-piece--faute'); setTimeout(() => el.classList.remove('dm-piece--faute'), 900); }
        const raison = direErreur(this.chaine, this.posees, id);
        this.note('❌ ' + echapper(raison), 'ko');
        this.onWrongAnswer(el, {
            concept: this.chaine.skillId || COMPETENCE,
            questionText: boutOuvert(this.chaine, this.posees),
            input: this.chaine.pieces[id] ? String(this.chaine.pieces[id].gauche) : '?',
            expected: this.chaine.pieces[pieceSuivante(this.chaine, this.posees)]?.gauche,
            customMessage: raison
        });
    }

    // --- Aider --------------------------------------------------------------

    aider() {
        if (this.isDemo || !this.chaine) return;
        const id = pieceSuivante(this.chaine, this.posees);
        if (id === null) { this.note('La chaîne est finie : il n\'y a plus rien à poser.'); return; }
        this.aidesUtilisees++;
        // ON DIT LE CHEMIN, ON NE MONTRE PAS LA PIÈCE. L'élève garde le
        // calcul ; on ne lui rend que la question qu'il fallait se poser.
        this.note(echapper(direJoint(this.chaine, id)));
        const tete = this.chaineEl.lastElementChild;
        if (tete) {
            tete.classList.add('dm-piece--montre');
            setTimeout(() => tete.classList.remove('dm-piece--montre'), 2400);
        }
    }

    showNext() { return this.poser(); }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'dm-note' + (ton ? ` dm-note--${ton}` : '');
    }

    elementReserve(id) {
        return this.reserveEl.querySelector(`[data-piece="${id}"]`);
    }

    // --- La démonstration ---------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.chaine) this.poser();
        if (!await cur.pause(500) || !this.isRunning) return fin();
        cur.say('Une pièce porte une question à droite et la réponse d\'une AUTRE question à gauche. '
            + 'On ne cherche donc jamais au hasard.', this.teteEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        // IL CONTINUE LA CHAÎNE EN COURS, là où l'élève en est : c'est SA
        // partie qu'il faut débloquer, pas une autre.
        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Je lis le bout ouvert de la chaîne — c\'est une question.',
            this.chaineEl.lastElementChild || this.chaineEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        for (let k = 0; k < 4 && this.posees < this.chaine.pieces.length; k++) {
            const id = pieceSuivante(this.chaine, this.posees);
            if (id === null) break;
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const el = this.elementReserve(id);
            cur.say(direJoint(this.chaine, id), el || this.reserveEl);
            if (el && !await cur.tap(el)) return fin();
            this.accepter(id);
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('On continue ainsi jusqu\'à la pièce ARRIVÉE. Si la réserve est vide en même temps, '
            + 'c\'est que tout était juste — personne n\'a besoin de te le dire.',
            this.container.querySelector('[data-aide]'));
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

const echapper = (t) => String(t ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export function engineDominos(container, isDemo, params) {
    const jeu = new Dominos(container, isDemo, params);
    jeu.start();
    return jeu;
}
