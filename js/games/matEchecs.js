// MAT EN UN, MAT EN DEUX — à l'écran.
//
// Le noyau (core/mat.js) porte les problèmes, la recherche et la critique.
// Ici : l'échiquier, le clic, et ce qu'on répond quand ce n'est pas ça.
//
// TROIS PARTIS PRIS.
//
//   · ON NE DIT JAMAIS LE COUP. Un problème d'échecs se cherche ; donner la
//     réponse au premier essai raté supprimerait l'exercice. En revanche on
//     dit toujours CE QUI MANQUE : « ton coup ne donne pas échec », « le roi
//     s'échappe par g7 », « les Noirs n'ont plus de coup mais ne sont pas en
//     échec — c'est un pat, une partie nulle ». C'est ce qui transforme un
//     essai raté en leçon.
//
//   · LES PIÈCES SONT DESSINÉES, pas écrites (ui/piecesEchecs.js). Une
//     pastille marquée « C » se traduit ; un cavalier se reconnaît. Et c'est
//     le même dessin qui part à l'imprimante, donc l'écran ne ment pas sur ce
//     que donnera la fiche.
//
//   · LES COUPS LÉGAUX SE MONTRENT. On clique une pièce, ses destinations
//     s'allument. L'exercice est de trouver le MAT, pas de réviser la marche
//     du cavalier — et un élève qui ne sait pas encore comment se déplace un
//     fou peut quand même chercher un mat, en voyant où il peut aller.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import { coups, jouer, enEchec } from '../core/echecs.js';
import {
    tirerProbleme, estMat, nommerCoup, critiquer, defense, nomCase, PROBLEMES
} from '../core/mat.js';
import { pieceSvg, direPiece } from '../ui/piecesEchecs.js';

const COMPETENCE = 'geo.espace.reperage';

class MatEchecs extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'mat-echecs');
        this.rng = makeRng(this.params.seed);
        this.longueur = Number(this.params.coups) === 2 ? 2 : 1;
        this.montrerCoups = this.params.aideCoups !== false;
        this.resolus = 0;
        this.vus = [];
    }

    render() {
        this.container.innerHTML = `
            <style>
                .me-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    width: 100%; height: 100%; padding: 8px; box-sizing: border-box;
                    color: var(--text-main); container-type: inline-size; overflow-y: auto;
                }
                .me-tete { display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
                    justify-content: center; font-size: .86rem; }
                .me-btn {
                    border: 1px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); border-radius: 9px; cursor: pointer;
                    font: inherit; font-weight: 600; font-size: 13px; padding: 5px 11px;
                }
                .me-btn:hover { background: var(--bg-hover); }
                .me-consigne {
                    font-weight: 800; font-size: clamp(13px, 3.2cqw, 17px); color: #fff;
                    padding: 5px 16px; border-radius: 999px; text-align: center;
                    background: linear-gradient(135deg, #7c3aed, #2563eb);
                }
                .me-theme { font-size: .82rem; color: var(--text-muted); font-style: italic; }

                /* L'ÉCHIQUIER. Un SVG carré : les pièces y sont dessinées, et le
                   même dessin part à l'imprimante. */
                .me-plateau { position: relative; line-height: 0; touch-action: manipulation; }
                .me-plateau svg { display: block; width: 100%; height: auto;
                    -webkit-tap-highlight-color: transparent; user-select: none; }
                .me-case { cursor: pointer; }
                .me-case--choisie { fill: #fde68a !important; }
                .me-cible { fill: rgba(37,99,235,.55); pointer-events: none; }
                .me-prise { fill: none; stroke: rgba(220,38,38,.75); pointer-events: none; }
                .me-echec { fill: rgba(220,38,38,.35) !important; }

                .me-note { min-height: 3.2em; text-align: center; line-height: 1.35;
                    font-size: clamp(12px, 2.9cqw, 15px); color: var(--text-muted);
                    max-width: 560px; }
                .me-note--ok { color: var(--success); font-weight: 700; }
                .me-note--ko { color: var(--danger); font-weight: 600; }
                .me-lecon {
                    max-width: 560px; font-size: clamp(11px, 2.7cqw, 14px);
                    background: color-mix(in srgb, var(--primary) 10%, transparent);
                    border-left: 4px solid var(--primary); border-radius: 8px;
                    padding: 8px 12px; line-height: 1.4;
                }
                .me-lecon[hidden] { display: none; }
            </style>
            <div class="me-wrap">
                <div class="me-tete">
                    <span data-score></span>
                    <button type="button" class="me-btn" data-indice>💡 Aide</button>
                    <button type="button" class="me-btn" data-neuf>↺ Autre problème</button>
                </div>
                <div class="me-consigne" data-consigne></div>
                <div class="me-theme" data-theme></div>
                <div class="me-plateau" data-plateau></div>
                <p class="me-note" data-note></p>
                <div class="me-lecon" data-lecon hidden></div>
            </div>`;
        this.plateauEl = this.container.querySelector('[data-plateau]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.leconEl = this.container.querySelector('[data-lecon]');
        this.container.querySelector('[data-neuf]').addEventListener('click', () => this.poser());
        this.container.querySelector('[data-indice]').addEventListener('click', () => this.aider());
        this.poser();
    }

    startGameLoop() { /* Pas d'horloge : on cherche. */ }
    showNext() { return this.poser(); }

    poser() {
        this.probleme = tirerProbleme({
            rng: this.rng, coups: this.longueur, exclus: this.vus
        });
        this.vus.push(this.probleme.id);
        if (this.vus.length >= PROBLEMES.filter(p => p.coups === this.longueur).length) this.vus = [];
        this.etat = this.probleme.etat;
        this.aJouer = 0;               // combien de coups blancs déjà joués
        this.choisie = null;
        this.fini = false;
        this.leconEl.hidden = true;
        this.dessiner();
        this.note(this.longueur === 1
            ? 'Trouve le coup des Blancs qui met le roi noir échec et mat. Clique une pièce blanche, puis sa case d\'arrivée.'
            : 'Les Blancs jouent et matent en DEUX coups. Trouve le premier : après lui, quelle que soit la réponse des Noirs, le mat doit tomber.');
        return true;
    }

    // --- Le dessin -------------------------------------------------------------

    dessiner() {
        const C = 100 / 8;
        const enEchecRoi = enEchec(this.etat, this.etat.trait);
        const roiTrait = this.etat.trait === 'B' ? 'K' : 'k';
        let d = '';
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const i = y * 8 + x;
                const clair = (x + y) % 2 === 0;
                const classes = ['me-case']
                    .concat(this.choisie === i ? ['me-case--choisie'] : [])
                    .concat(enEchecRoi && this.etat.cases[i] === roiTrait ? ['me-echec'] : []);
                d += `<rect class="${classes.join(' ')}" data-case="${i}"
                    x="${(x * C).toFixed(3)}" y="${(y * C).toFixed(3)}"
                    width="${C.toFixed(3)}" height="${C.toFixed(3)}"
                    fill="${clair ? '#f1f5f9' : '#94a3b8'}"/>`;
            }
        }
        // Les destinations de la pièce choisie : un point sur une case vide, un
        // anneau sur une prise — la distinction se lit sans légende.
        if (this.choisie !== null && this.montrerCoups && !this.fini) {
            this.destinations().forEach(c => {
                const x = (c.vers % 8) * C, y = Math.floor(c.vers / 8) * C;
                d += this.etat.cases[c.vers]
                    ? `<circle class="me-prise" cx="${(x + C / 2).toFixed(3)}" cy="${(y + C / 2).toFixed(3)}"
                        r="${(C * 0.42).toFixed(3)}" stroke-width="${(C * 0.09).toFixed(3)}"/>`
                    : `<circle class="me-cible" cx="${(x + C / 2).toFixed(3)}" cy="${(y + C / 2).toFixed(3)}"
                        r="${(C * 0.15).toFixed(3)}"/>`;
            });
        }
        this.etat.cases.forEach((p, i) => {
            if (!p) return;
            d += pieceSvg(p.toUpperCase(), p === p.toLowerCase(),
                (i % 8) * C, Math.floor(i / 8) * C, C);
        });
        // Les repères : lettres et chiffres, comme dans un repère du plan.
        for (let i = 0; i < 8; i++) {
            d += `<text x="${((i + 0.86) * C).toFixed(2)}" y="${(7.96 * C).toFixed(2)}"
                font-size="${(C * 0.22).toFixed(2)}" fill="#334155">${'abcdefgh'[i]}</text>
                <text x="${(0.06 * C).toFixed(2)}" y="${((i + 0.28) * C).toFixed(2)}"
                font-size="${(C * 0.22).toFixed(2)}" fill="#334155">${8 - i}</text>`;
        }
        this.plateauEl.innerHTML =
            `<svg viewBox="0 0 100 100" style="max-width:min(78cqw, 460px)"
                role="img" aria-label="Échiquier">${d}</svg>`;
        this.plateauEl.querySelectorAll('[data-case]').forEach(el => {
            el.addEventListener('click', () => this.toucher(Number(el.dataset.case)));
        });

        const c = this.container.querySelector('[data-consigne]');
        c.textContent = this.longueur === 1
            ? 'Les Blancs jouent et matent en UN coup'
            : (this.aJouer === 0
                ? 'Les Blancs jouent et matent en DEUX coups'
                : 'Les Noirs ont répondu — matez maintenant');
        this.container.querySelector('[data-theme]').textContent = this.probleme.theme;
        const n = this.resolus;
        this.container.querySelector('[data-score]').textContent =
            `${n} problème${n > 1 ? 's' : ''} résolu${n > 1 ? 's' : ''}`;
    }

    destinations() {
        return coups(this.etat).filter(c => c.de === this.choisie);
    }

    // --- Jouer -------------------------------------------------------------------

    toucher(i) {
        if (this.isDemo || this.fini) return;
        const piece = this.etat.cases[i];
        const aMoi = piece && (piece === piece.toUpperCase()) === (this.etat.trait === 'B');

        if (this.choisie !== null) {
            const coup = this.destinations().find(c => c.vers === i);
            if (coup) return this.jouerCoup(coup);
        }
        if (aMoi) {
            this.choisie = (this.choisie === i) ? null : i;
            this.dessiner();
            return;
        }
        this.choisie = null;
        this.dessiner();
    }

    jouerCoup(coup) {
        const texte = nommerCoup(this.etat, coup);
        const restants = this.longueur - this.aJouer;
        const verdict = critiquer(this.etat, coup, restants);

        if (verdict.raison !== 'bon') {
            this.choisie = null;
            this.dessiner();
            this.note(`<b>${texte}</b> — ${this.expliquer(verdict, restants)}`, 'ko');
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: `${this.probleme.theme} — mat en ${this.longueur}`,
                input: texte, expected: 'le coup qui mate',
                customMessage: this.expliquer(verdict, restants)
            });
            return;
        }

        // Le coup est le bon.
        this.etat = jouer(this.etat, coup);
        this.aJouer++;
        this.choisie = null;
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `${this.probleme.theme} — coup ${this.aJouer}`,
            expected: texte, given: texte, points: 6
        });

        if (estMat(this.etat)) return this.gagne(texte);

        // Mat en deux : les Noirs répondent, et c'est la meilleure défense —
        // celle qui laisse le plus de jeu, pas un abandon.
        const rep = defense(this.etat, this.rng);
        const nomRep = rep ? nommerCoup(this.etat, rep) : null;
        this.etat = jouer(this.etat, rep);
        this.dessiner();
        this.note(`✅ <b>${texte}</b> : c'est le bon premier coup. Les Noirs se défendent par `
            + `<b>${nomRep}</b> — maintenant, le mat.`, 'ok');
    }

    gagne(dernier) {
        this.fini = true;
        this.resolus++;
        this.dessiner();
        this.note(`🎉 <b>${dernier}</b> — échec et mat ! ${this.longueur === 2
            ? 'Le premier coup avait enlevé au roi toutes ses issues.' : ''}`, 'ok');
        this.leconEl.hidden = false;
        this.leconEl.innerHTML = `<b>${this.probleme.theme}.</b> ${this.probleme.lecon}`;
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `${this.probleme.theme} — mat en ${this.longueur}`,
            expected: this.probleme.notations[0], given: dernier,
            points: 10 + this.longueur * 6
        });
    }

    /** Ce qui manque, en une phrase — jamais le coup à jouer. */
    expliquer(verdict, restants) {
        const roiNoir = 'le roi noir';
        switch (verdict.raison) {
        case 'pas-echec':
            return `ce coup ne donne pas échec. Pour mater, il faut d'abord ATTAQUER ${roiNoir} — `
                + 'un mat est toujours un échec dont on ne peut pas sortir.';
        case 'fuite':
            return `c'est bien un échec, mais ${roiNoir} s'échappe en <b>${verdict.detail}</b>. `
                + 'Un mat ne laisse aucune case libre.';
        case 'parade':
            return `c'est bien un échec, mais les Noirs parent par <b>${verdict.detail}</b> : `
                + 'ils bouchent ou ils prennent. Un mat ne se pare pas.';
        case 'pat':
            return 'attention : les Noirs n\'ont plus AUCUN coup, mais ils ne sont pas en échec. '
                + 'C\'est un PAT — partie nulle. Le pire résultat quand on gagnait.';
        case 'mate-trop-tot':
            return 'ce coup mate tout de suite ; le problème demande deux coups.';
        case 'defense':
            return `après ce coup, les Noirs tiennent par <b>${verdict.detail}</b> et le mat `
                + 'n\'arrive plus. Un premier coup de mat en deux doit battre TOUTES les réponses, '
                + 'pas seulement la plus naturelle.';
        default:
            return restants > 1 ? 'ce n\'est pas le bon premier coup.' : 'ce n\'est pas le mat.';
        }
    }

    aider() {
        const p = this.probleme;
        // L'AIDE NE DONNE PAS LE COUP : elle donne le motif et la pièce qui
        // travaille. C'est ce qu'un professeur dit par-dessus l'épaule.
        const coup = p.solutions[0];
        const piece = p.etat.cases[coup.de];
        this.note(`Motif : <b>${p.theme}</b>. La pièce qui fait le travail est `
            + `<b>${direPiece(piece.toUpperCase(), false)}</b>${this.aJouer === 0
                ? ` (en ${nomCase(coup.de)})` : ''}. `
            + 'Cherche le coup qui ne laisse AUCUNE case au roi noir.');
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'me-note' + (ton ? ` me-note--${ton}` : '');
    }

    // --- La démonstration ----------------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        try {
            cur.protegerZone([this.plateauEl]);
            await gate.wait(500);
            cur.say('Les Blancs jouent, et matent. Un mat, c\'est un échec dont le roi ne peut '
                + 'pas sortir : ni fuir, ni parer, ni prendre.', this.plateauEl);
            await gate.wait(3400 * DEMO_SPEED);
            if (!this.isRunning) throw new Error('coupé');

            const coup = this.probleme.solutions[0];
            const texte = nommerCoup(this.etat, coup);
            this.etat = jouer(this.etat, coup);
            this.aJouer = 1;
            this.dessiner();
            cur.say(`${texte}. Regarde les cases autour du roi noir : il n'en reste aucune.`,
                this.plateauEl);
            await gate.wait(3000 * DEMO_SPEED);
            if (!estMat(this.etat) && this.isRunning) {
                const rep = defense(this.etat, this.rng);
                const nomRep = nommerCoup(this.etat, rep);
                this.etat = jouer(this.etat, rep);
                this.dessiner();
                cur.say(`Les Noirs se défendent par ${nomRep} — mais toutes leurs réponses `
                    + 'perdent, c\'est ce qui fait un mat en deux.', this.plateauEl);
                await gate.wait(3000 * DEMO_SPEED);
            }
            cur.say(this.probleme.lecon, this.plateauEl);
            await gate.wait(4200 * DEMO_SPEED);
        } catch (e) { /* démonstration coupée */ }
        cur.destroy(); gate.destroy();
        this.demoCursor = null; this.demoGate = null;
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineMatEchecs(container, isDemo, params) {
    const jeu = new MatEchecs(container, isDemo, params);
    jeu.start();
    return jeu;
}
