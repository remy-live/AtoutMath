// LE HASHI — à l'écran.
//
// Rémy : « je voulais le hashi ».
//
// LE GESTE EST LE JEU. Sur papier on trace un trait d'une île à l'autre ; ici
// on touche les deux îles, ou l'on glisse de l'une vers l'autre, et le pont
// passe de rien à un, puis à deux, puis à rien. Pas de bouton « double pont »,
// pas de menu : c'est le même geste répété, comme la case d'un mots croisés
// qu'on retouche jusqu'à la bonne lettre.
//
// ON NE PEUT PAS TRICHER AVEC LA GÉOMÉTRIE. Le noyau ne connaît que les arêtes
// POSSIBLES — entre deux îles consécutives d'une même ligne ou colonne — et le
// jeu ne propose rien d'autre. Un élève ne peut donc jamais tracer un pont qui
// traverse une île : cette faute-là n'existe pas, et il reste les trois vraies
// règles à comprendre.
//
// CE QUI EST FINI SE VOIT. Une île dont le compte est atteint verdit, une île
// qui déborde rougit. C'est l'information que l'on relit vingt fois pendant une
// partie ; la faire chercher dans une note en bas d'écran serait la cacher.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    creerHashi, saisieVide, degres, estResoluHashi, diagnostic, qualiteHashi,
    TAILLES_HASHI
} from '../core/hashi.js';

const COMPETENCE = 'num.logique.hashi';

class Hashi extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'hashi');
        this.graine = this.params.seed || 'hashi';
        this.taille = TAILLES_HASHI[this.params.taille] ? this.params.taille : 'moyen';
        this.difficulte = ['facile', 'moyen', 'difficile'].includes(this.params.difficulte)
            ? this.params.difficulte : 'moyen';
        this.verifs = 0;
        this.soufflees = new Set();
    }

    render() {
        this.container.innerHTML = `
            <style>
                .hs-wrap {
                    display: flex; flex-direction: column; align-items: center;
                    gap: clamp(4px, 1.4cqh, 10px);
                    width: 100%; height: 100%; padding: 6px; box-sizing: border-box;
                    color: var(--text-main); container-type: size;
                    user-select: none; -webkit-user-select: none; overflow: hidden;
                }
                .hs-consigne {
                    margin: 0; text-align: center; text-wrap: balance;
                    font-size: clamp(.72rem, 1.7cqh, .95rem); color: var(--text-soft, #6b7280);
                }
                .hs-corps {
                    flex: 1 1 0; min-height: 0; width: 100%;
                    display: flex; align-items: center; justify-content: center;
                    container-type: size;
                }
                /* LE PLATEAU EST BLANC, comme la grille des mots croisés : c'est
                   un objet de papier, et un thème coloré rendrait les îles et
                   les ponts indiscernables. */
                .hs-plateau {
                    background: #fff; border-radius: 10px; padding: 6px;
                    box-shadow: 0 2px 14px rgba(15, 23, 42, .16);
                    touch-action: none;
                }
                .hs-arete { stroke: transparent; stroke-width: 14; cursor: pointer; }
                .hs-pont { stroke: #1f2937; stroke-linecap: round; pointer-events: none; }
                .hs-pont--vise { stroke: #f59e0b; }
                .hs-ile {
                    fill: #fff; stroke: #1f2937; stroke-width: 2; cursor: pointer;
                }
                .hs-ile--fini { fill: #d8f3e3; stroke: #1f7a4d; }
                .hs-ile--trop { fill: #fde2e2; stroke: #c53030; }
                .hs-ile--vise { stroke: #f59e0b; stroke-width: 4; }
                .hs-n {
                    font-weight: 800; fill: #1f2937; text-anchor: middle;
                    pointer-events: none; dominant-baseline: central;
                }
                .hs-n--fini { fill: #1f7a4d; }
                .hs-n--trop { fill: #c53030; }
                .hs-barre { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
                .hs-btn {
                    padding: 6px 12px; border-radius: 999px; border: 1px solid var(--border);
                    background: var(--bg-panel); color: var(--text-main);
                    font: inherit; font-weight: 700; font-size: clamp(.75rem, 1.5cqh, .9rem);
                    cursor: pointer;
                }
                .hs-note { margin: 0; min-height: 1.2em; text-align: center;
                    font-size: clamp(.75rem, 1.6cqh, .95rem); }
                .hs-note--ok { color: var(--success, #16a34a); font-weight: 700; }
                .hs-note--ko { color: var(--danger, #dc2626); font-weight: 700; }
            </style>
            <div class="hs-wrap" data-wrap>
                <p class="hs-consigne">Relie les îles par des ponts droits. Le chiffre dit
                    combien de ponts arrivent sur l'île. <b>Deux ponts au plus</b> entre deux
                    îles, jamais de croisement, et tout doit tenir <b>d'un seul tenant</b>.</p>
                <div class="hs-corps"><div class="hs-plateau" data-plateau></div></div>
                <div class="hs-barre">
                    <button type="button" class="hs-btn" data-aide>💡 Un pont</button>
                    <button type="button" class="hs-btn" data-effacer>↺ Effacer</button>
                    <button type="button" class="hs-btn" data-neuf>Nouvelle grille</button>
                    <button type="button" class="hs-btn" data-verifier>Vérifier</button>
                </div>
                <p class="hs-note" data-note></p>
            </div>`;

        this.wrapEl = this.container.querySelector('[data-wrap]');
        this.plateauEl = this.container.querySelector('[data-plateau]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.container.querySelector('[data-effacer]').onclick = () => this.effacer();
        this.container.querySelector('[data-neuf]').onclick = () => this.poser();
        this.container.querySelector('[data-verifier]').onclick = () => this.verifier();
    }

    startGameLoop() { this.poser(); }
    showNext() { return this.poser(); }

    // --- Une grille -----------------------------------------------------------

    poser() {
        this.compteur = (this.compteur || 0) + 1;
        this.g = creerHashi({
            taille: this.taille, difficulte: this.difficulte,
            rng: makeRng(`${this.graine}-${this.compteur}`)
        });
        this.val = saisieVide(this.g);
        this.soufflees = new Set();
        this.vise = null;
        this.fini = false;
        this.dessiner();
        const q = qualiteHashi(this.g);
        this.note(`${q.iles} îles. Touche deux îles voisines pour poser un pont, `
            + 'encore une fois pour le doubler, encore une fois pour l\'enlever.');
        return true;
    }

    effacer() {
        if (this.isDemo || this.fini) return;
        this.val = saisieVide(this.g);
        this.vise = null;
        this.dessiner();
        this.note('');
    }

    // --- Le dessin ------------------------------------------------------------

    dessiner() {
        const g = this.g;
        const U = 40;                                   // une case, en unités du viewBox
        // ON CADRE SUR LES ÎLES, pas sur la grille nominale : le tirage laisse
        // presque toujours une bande vide, et la dessiner rapetisse tout.
        const xs = g.iles.map(i => i.x), ys = g.iles.map(i => i.y);
        const x1 = Math.min(...xs), y1 = Math.min(...ys);
        const W = (Math.max(...xs) - x1 + 1) * U, H = (Math.max(...ys) - y1 + 1) * U;
        const cx = (x) => (x - x1 + 0.5) * U, cy = (y) => (y - y1 + 0.5) * U;
        const R = U * 0.34, E = U * 0.16;
        const d = degres(g, this.val);

        let svg = '';
        // Les ponts d'abord : les îles passent par-dessus et masquent les bouts.
        g.aretes.forEach((e, i) => {
            const n = this.val[i];
            if (!n) return;
            const A = g.iles[e.a], B = g.iles[e.b];
            const vise = this.soufflees.has(i) ? ' hs-pont--vise' : '';
            const traits = n === 2
                ? (e.dir === 'h'
                    ? [[cx(A.x), cy(A.y) - E, cx(B.x), cy(B.y) - E], [cx(A.x), cy(A.y) + E, cx(B.x), cy(B.y) + E]]
                    : [[cx(A.x) - E, cy(A.y), cx(B.x) - E, cy(B.y)], [cx(A.x) + E, cy(A.y), cx(B.x) + E, cy(B.y)]])
                : [[cx(A.x), cy(A.y), cx(B.x), cy(B.y)]];
            traits.forEach(([x1, y1, x2, y2]) => {
                svg += `<line class="hs-pont${vise}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
                    stroke-width="${U * 0.09}"/>`;
            });
        });
        // Les zones sensibles : larges, invisibles, et par-dessus les traits.
        g.aretes.forEach((e, i) => {
            const A = g.iles[e.a], B = g.iles[e.b];
            svg += `<line class="hs-arete" data-arete="${i}"
                x1="${cx(A.x)}" y1="${cy(A.y)}" x2="${cx(B.x)}" y2="${cy(B.y)}"/>`;
        });
        g.iles.forEach((il, k) => {
            const etat = d[k] > il.n ? 'trop' : (d[k] === il.n ? 'fini' : '');
            const vise = this.vise === k ? ' hs-ile--vise' : '';
            svg += `<circle class="hs-ile${etat ? ` hs-ile--${etat}` : ''}${vise}"
                data-ile="${k}" cx="${cx(il.x)}" cy="${cy(il.y)}" r="${R}"/>`;
            svg += `<text class="hs-n${etat ? ` hs-n--${etat}` : ''}"
                x="${cx(il.x)}" y="${cy(il.y)}" font-size="${R * 1.25}">${il.n}</text>`;
        });

        this.plateauEl.innerHTML = `<svg viewBox="0 0 ${W} ${H}" data-svg
            style="width: min(94cqw, calc(94cqh * ${(W / H).toFixed(4)})); height: auto; display: block">
            ${svg}</svg>`;

        this.plateauEl.querySelectorAll('[data-ile]').forEach(c => {
            c.onclick = () => this.toucherIle(Number(c.dataset.ile));
        });
        // TOUCHER LE PONT LUI-MÊME est le geste le plus court quand il existe
        // déjà : on ne repasse pas par ses deux îles pour l'effacer.
        this.plateauEl.querySelectorAll('[data-arete]').forEach(l => {
            l.onclick = () => this.cycler(Number(l.dataset.arete));
        });
    }

    // --- Poser un pont ---------------------------------------------------------

    /** L'arête entre deux îles, si elle existe. */
    areteEntre(a, b) {
        return this.g.aretes.findIndex(e => (e.a === a && e.b === b) || (e.a === b && e.b === a));
    }

    toucherIle(k) {
        if (this.isDemo || this.fini) return;
        if (this.vise === null) { this.vise = k; this.dessiner(); return; }
        if (this.vise === k) { this.vise = null; this.dessiner(); return; }
        const i = this.areteEntre(this.vise, k);
        if (i < 0) {
            // Pas voisines : on ne refuse pas, on DÉPLACE la visée. Refuser
            // ferait croire à une panne ; déplacer est ce que l'élève voulait
            // neuf fois sur dix.
            this.vise = k;
            this.dessiner();
            this.note('Ces deux îles-là ne se voient pas : un pont va tout droit, sans '
                + 'passer par-dessus une autre île.');
            return;
        }
        this.vise = null;
        this.cycler(i);
    }

    /** Rien → un pont → deux ponts → rien. */
    cycler(i) {
        if (this.isDemo || this.fini) return;
        if (this.soufflees.has(i)) {
            this.note('Ce pont-là t\'a été donné : il ne bouge plus.');
            return;
        }
        const suivant = (this.val[i] + 1) % 3;
        if (suivant > 0) {
            const barre = this.g.croise[i].find(j => this.val[j] > 0);
            if (barre !== undefined) {
                // ON MONTRE LE CROISEMENT AU LIEU DE L'INTERDIRE EN SILENCE.
                this.note('Impossible : un pont passe déjà en travers. Deux ponts ne se '
                    + 'croisent jamais.', 'ko');
                return;
            }
        }
        this.val[i] = suivant;
        this.vise = null;
        this.dessiner();
        this.note('');
        if (estResoluHashi(this.g, this.val)) this.gagner();
    }

    // --- Aider et vérifier -----------------------------------------------------

    /**
     * UN PONT DE LA SOLUTION, choisi là où il manque — et il se verrouille.
     * Donner un pont déjà posé ne servirait à rien ; en donner un qu'on peut
     * ensuite effacer par mégarde non plus.
     */
    aider() {
        if (this.isDemo || this.fini) return;
        const manquants = this.g.aretes
            .map((e, i) => i)
            .filter(i => this.val[i] !== this.g.solution[i]);
        if (!manquants.length) { this.note('Tout est déjà juste — il ne manque rien.'); return; }
        const i = manquants[0];
        const e = this.g.aretes[i];
        this.val[i] = this.g.solution[i];
        this.soufflees.add(i);
        // Un pont donné peut en contredire un autre, posé à tort : on l'enlève.
        this.g.croise[i].forEach(j => { if (this.val[i] && this.val[j]) this.val[j] = 0; });
        this.dessiner();
        const n = this.g.solution[i];
        this.note(n
            ? `Entre l'île ${this.g.iles[e.a].n} et l'île ${this.g.iles[e.b].n} : `
                + `${n === 2 ? 'deux ponts' : 'un pont'}. Regarde ce que cela force autour.`
            : 'Ici, aucun pont — c\'est une déduction aussi utile que les autres.');
        if (estResoluHashi(this.g, this.val)) this.gagner();
    }

    verifier() {
        if (this.isDemo || this.fini) return;
        this.verifs++;
        if (estResoluHashi(this.g, this.val)) return this.gagner();
        const d = diagnostic(this.g, this.val);
        const MOTS = {
            croisement: (n) => `${n} pont${n > 1 ? 's se croisent' : ' en croise un autre'}.`,
            trop: (n) => `${n} île${n > 1 ? 's ont' : ' a'} trop de ponts.`,
            manque: (n) => `${n} île${n > 1 ? 's attendent' : ' attend'} encore des ponts.`,
            morceaux: () => 'Les comptes sont bons, mais la carte est en plusieurs morceaux : '
                + 'on doit pouvoir aller de n\'importe quelle île à n\'importe quelle autre.'
        };
        this.note(MOTS[d.quoi](d.n), 'ko');
    }

    gagner() {
        if (this.fini) return;
        this.fini = true;
        this.vise = null;
        this.dessiner();
        const q = qualiteHashi(this.g);
        this.note(`✅ ${q.iles} îles reliées, ${q.ponts} ponts — et tout d'un seul tenant.`, 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Hashi ${this.g.largeur}×${this.g.hauteur} (${this.difficulte})`,
            expected: 'grille complète', given: 'grille complète',
            points: Math.max(10, 45 - this.soufflees.size * 5 - this.verifs * 2)
        });
    }

    note(html, ton) {
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'hs-note' + (ton ? ` hs-note--${ton}` : '');
    }

    // --- La démonstration ------------------------------------------------------

    /**
     * Le robot montre PAR OÙ COMMENCER, qui est toute la méthode du hashi : par
     * l'île qui ne laisse aucun choix. Une île dont le chiffre vaut le double du
     * nombre de ses voisines prend deux ponts partout — on n'a rien à décider,
     * et ces ponts-là en décident d'autres.
     */
    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.g) this.poser();
        if (!await cur.pause(500) || !this.isRunning) return fin();

        const g = this.g;
        const par = g.iles.map((_, k) => g.aretes.filter(e => e.a === k || e.b === k).length);
        cur.say('Trois règles : le chiffre dit combien de ponts arrivent, jamais plus de deux '
            + 'entre deux îles, et aucun croisement. On ne commence pas n\'importe où.',
        this.plateauEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        // L'île la plus contrainte : celle où le chiffre sature ses voisines.
        let k = 0, mieux = -1;
        g.iles.forEach((il, j) => {
            const marge = 2 * par[j] - il.n;
            if (mieux < 0 || marge < mieux) { mieux = marge; k = j; }
        });
        this.vise = k; this.dessiner();
        cur.say(`Celle-ci demande ${g.iles[k].n} ponts et n'a que ${par[k]} voisine`
            + `${par[k] > 1 ? 's' : ''} : ${mieux === 0 ? 'il n\'y a aucun choix, deux ponts partout'
                : 'presque aucun choix'}. C'est par là qu'on entre.`, this.plateauEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        const miennes = g.aretes.map((e, i) => i).filter(i => g.aretes[i].a === k || g.aretes[i].b === k);
        for (const i of miennes) {
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            this.val[i] = g.solution[i];
            this.dessiner();
            if (!await cur.pause(DEMO_SPEED.press)) return fin();
        }
        this.vise = null; this.dessiner();
        cur.say('Et voilà : cette île est finie, elle verdit. Chaque pont posé en interdit '
            + 'd\'autres — c\'est comme cela que la grille se déplie, sans jamais essayer.',
        this.plateauEl);
        await cur.pause(DEMO_SPEED.between);
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineHashi(container, isDemo, params) {
    const game = new Hashi(container, isDemo, params);
    game.start();
    return game;
}
