// LE LOGIGRAMME — la grille de déduction, à l'écran.
//
// Le noyau (core/logigramme.js) fabrique l'énigme, garantit qu'elle a UNE
// solution et qu'on peut l'atteindre sans jamais deviner, et tient le journal
// des déductions. Ici on dessine la grille, on écoute les clics, et on se sert
// de ce journal pour deux choses qui font toute la valeur de l'exercice :
//
//   · L'AIDE DONNE LA DÉDUCTION SUIVANTE, pas la réponse. « Regarde l'indice 3 :
//     il te dit que cette case est barrée. » L'élève garde le raisonnement ;
//     on ne lui rend que le fil qu'il avait perdu.
//   · LE ROBOT REJOUE L'ÉNIGME dans l'ordre où elle se démonte, en disant à
//     chaque case POURQUOI on l'écrit. C'est la seule façon de montrer qu'un
//     logigramme se résout, au lieu de se deviner.
//
// La croix et le rond sont ceux du papier, et le geste est le même : on clique
// une case, elle passe de vide à barrée, puis à cochée. Un élève qui a fait un
// logigramme ici sait en faire un sur une feuille.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    genererLogigramme, niveauDe, creerEtats, lire, verifierSaisie,
    etiquette, INCONNU, OUI, NON
} from '../core/logigramme.js';

const COMPETENCE = 'num.logique.logigramme';

class Logigramme extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'logigramme');
        this.rng = makeRng(this.params.seed);
        this.niveau = Number(this.params.niveau) || 1;
        // L'aide mécanique : poser un rond barre le reste de sa ligne et de sa
        // colonne. C'est le geste que l'élève apprend d'abord ; une fois qu'il
        // le sait, le faire à la main trente fois n'apprend plus rien.
        this.auto = this.params.auto !== false;
        this.reussis = 0;
        this.aidesUtilisees = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .lg-wrap {
                    display: flex; flex-direction: column; gap: 8px; width: 100%; height: 100%;
                    color: var(--text-main); overflow-y: auto; align-items: center;
                }
                .lg-tete {
                    text-align: center; flex: 0 0 auto; max-width: 640px;
                    font-size: clamp(12px, 2.8cqw, 15px);
                }
                .lg-tete b { font-size: clamp(14px, 3.2cqw, 18px); }
                .lg-corps {
                    display: flex; gap: clamp(10px, 3cqw, 22px); align-items: flex-start;
                    justify-content: center; flex-wrap: wrap; width: 100%;
                }
                /* LES INDICES SE COCHENT. On les relit dix fois ; savoir lesquels
                   ont déjà servi est la moitié du travail d'organisation. */
                .lg-indices {
                    list-style: none; margin: 0; padding: 0; flex: 1 1 260px;
                    max-width: 380px; display: flex; flex-direction: column; gap: 5px;
                }
                .lg-indice {
                    display: flex; gap: 7px; align-items: flex-start; cursor: pointer;
                    background: var(--bg-panel); border: 1px solid var(--border);
                    border-radius: 9px; padding: 6px 9px; text-align: left;
                    font-size: clamp(11px, 2.5cqw, 13.5px); line-height: 1.35;
                    -webkit-tap-highlight-color: transparent;
                }
                .lg-indice--fait { opacity: .48; text-decoration: line-through; }
                .lg-indice--vise { border-color: var(--primary); box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 25%, transparent); }
                .lg-indice-num { font-weight: 800; color: var(--primary); flex: 0 0 auto; }

                .lg-grille { flex: 0 0 auto; }
                .lg-table { border-collapse: collapse; }
                .lg-table td, .lg-table th { padding: 0; }
                .lg-case {
                    border: 1px solid var(--border); cursor: pointer; text-align: center;
                    background: var(--bg-panel); font-weight: 800; user-select: none;
                    -webkit-tap-highlight-color: transparent; line-height: 1;
                }
                .lg-case--vide:hover { background: var(--bg-hover); }
                .lg-case--non { color: var(--danger, #dc2626); }
                .lg-case--oui { color: var(--success, #16a34a); background: color-mix(in srgb, var(--success, #16a34a) 12%, var(--bg-panel)); }
                .lg-case--faute { animation: lg-faute .5s ease 3; }
                @keyframes lg-faute { 50% { background: color-mix(in srgb, var(--danger, #dc2626) 45%, var(--bg-panel)); } }
                .lg-case--montre { box-shadow: inset 0 0 0 3px var(--primary); }
                /* Le trait épais sépare deux catégories : sans lui, la grille
                   n'est qu'un damier et l'œil s'y perd. */
                .lg-case--bordG { border-left-width: 2.5px; border-left-color: var(--text-main); }
                .lg-case--bordH { border-top-width: 2.5px; border-top-color: var(--text-main); }
                .lg-th {
                    font-size: clamp(8px, 1.9cqw, 11px); font-weight: 700; color: var(--text-muted);
                    white-space: nowrap;
                }
                .lg-th--col { writing-mode: vertical-rl; transform: rotate(180deg); text-align: left; padding: 3px 0 !important; }
                .lg-th--lig { text-align: right; padding-right: 5px !important; max-width: 92px;
                    overflow: hidden; text-overflow: ellipsis; }
                .lg-th--cat { font-weight: 800; color: var(--text-main); }

                .lg-barre { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; flex: 0 0 auto; }
                .lg-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700;
                    font-size: .84rem; padding: 7px 14px;
                }
                .lg-btn:hover:not(:disabled) { background: var(--bg-hover); }
                .lg-btn--valider { border-color: var(--primary); background: var(--primary); color: #fff; }
                .lg-note {
                    min-height: 2.4em; text-align: center; font-size: .86rem;
                    color: var(--text-muted); max-width: 640px; flex: 0 0 auto; padding: 0 8px;
                }
                .lg-note--ok { color: var(--success, #16a34a); font-weight: 700; }
                .lg-note--ko { color: var(--danger, #dc2626); font-weight: 600; }
                .lg-case-svg { display: block; margin: auto; }
            </style>
            <div class="lg-wrap">
                <div class="lg-tete" data-tete></div>
                <div class="lg-corps">
                    <ol class="lg-indices" data-indices></ol>
                    <div class="lg-grille" data-grille></div>
                </div>
                <div class="lg-barre">
                    <button type="button" class="lg-btn" data-aide>💡 Aide-moi</button>
                    <button type="button" class="lg-btn" data-effacer>↺ Effacer</button>
                    <button type="button" class="lg-btn" data-neuf>Autre énigme</button>
                    <button type="button" class="lg-btn lg-btn--valider" data-valider>Vérifier</button>
                </div>
                <div class="lg-note" data-note></div>
            </div>`;

        this.teteEl = this.container.querySelector('[data-tete]');
        this.indicesEl = this.container.querySelector('[data-indices]');
        this.grilleEl = this.container.querySelector('[data-grille]');
        this.noteEl = this.container.querySelector('[data-note]');

        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.container.querySelector('[data-effacer]').onclick = () => this.effacer();
        this.container.querySelector('[data-neuf]').onclick = () => this.showNext();
        this.container.querySelector('[data-valider]').onclick = () => this.valider();
    }

    startGameLoop() { this.poser(); }

    // --- Une énigme ---------------------------------------------------------

    poser() {
        this.puzzle = genererLogigramme(
            { niveau: this.niveau, theme: this.params.theme || null }, this.rng);
        this.n = this.puzzle.categories[0].valeurs.length;
        this.saisie = creerEtats(this.puzzle.categories.length, this.n);
        this.faits = new Set();
        this.dessiner();
        this.note('');
        return true;
    }

    effacer() {
        this.saisie = creerEtats(this.puzzle.categories.length, this.n);
        this.peindre();
        this.note('');
    }

    /**
     * LA DISPOSITION DU LOGIGRAMME, celle du papier : les colonnes portent les
     * catégories 1, 2, 3… ; les lignes portent le sujet en haut, puis les
     * catégories en ordre INVERSE. C'est ce qui donne l'escalier — et chaque
     * couple de catégories n'apparaît qu'une fois.
     */
    plan() {
        const nc = this.puzzle.categories.length;
        const colonnes = [];
        for (let c = 1; c < nc; c++) colonnes.push(c);
        const lignes = [0];
        for (let r = nc - 1; r >= 2; r--) lignes.push(r);
        return { colonnes, lignes };
    }

    dessiner() {
        const p = this.puzzle;
        this.teteEl.innerHTML = `<b>${echapper(p.titre)}</b> — ${echapper(p.decor)}<br>
            <span style="color:var(--text-muted)">Barre les cases impossibles, coche les certaines.</span>`;
        this.indicesEl.innerHTML = p.indices.map((ind, k) => `
            <li class="lg-indice" data-ind="${k}">
                <span class="lg-indice-num">${k + 1}.</span>
                <span>${echapper(ind.texte)}</span>
            </li>`).join('');
        this.indicesEl.querySelectorAll('[data-ind]').forEach(li => {
            li.onclick = () => li.classList.toggle('lg-indice--fait');
        });

        const { colonnes, lignes } = this.plan();
        const cote = this.coteCase(colonnes.length);
        const cats = p.categories;
        let html = '<table class="lg-table"><tr><th></th><th></th>';
        colonnes.forEach((c, ci) => {
            html += `<th class="lg-th lg-th--cat" colspan="${this.n}"
                style="border-left:${ci ? '2.5px solid var(--text-main)' : '0'}">${echapper(cats[c].label)}</th>`;
        });
        html += '</tr><tr><th></th><th></th>';
        colonnes.forEach((c, ci) => {
            for (let j = 0; j < this.n; j++) {
                html += `<th class="lg-th lg-th--col" style="height:${Math.max(52, cote * 3.4)}px;
                    ${ci && j === 0 ? 'border-left:2.5px solid var(--text-main);' : ''}">${echapper(etiquette(cats[c], j))}</th>`;
            }
        });
        html += '</tr>';

        lignes.forEach((r, ri) => {
            for (let i = 0; i < this.n; i++) {
                html += '<tr>';
                if (i === 0) {
                    html += `<th class="lg-th lg-th--cat" rowspan="${this.n}"
                        style="writing-mode:vertical-rl; transform:rotate(180deg)">${echapper(cats[r].label)}</th>`;
                }
                html += `<th class="lg-th lg-th--lig">${echapper(etiquette(cats[r], i))}</th>`;
                colonnes.forEach((c, ci) => {
                    for (let j = 0; j < this.n; j++) {
                        const actif = r !== c && this.paireVisible(r, c);
                        const bords = (ci && j === 0 ? ' lg-case--bordG' : '') + (ri && i === 0 ? ' lg-case--bordH' : '');
                        html += actif
                            ? `<td class="lg-case lg-case--vide${bords}" data-r="${r}" data-i="${i}"
                                 data-c="${c}" data-j="${j}"
                                 style="width:${cote}px; height:${cote}px; font-size:${cote * 0.62}px"></td>`
                            : `<td style="width:${cote}px; height:${cote}px; background:var(--bg-app);
                                 border:1px solid var(--border);${bords ? 'border-left-width:2.5px;' : ''}"></td>`;
                    }
                });
                html += '</tr>';
            }
        });
        this.grilleEl.innerHTML = html + '</table>';
        this.grilleEl.querySelectorAll('.lg-case').forEach(td => {
            td.onclick = () => this.cliquer(td);
        });
        this.peindre();
    }

    /** Un couple de catégories n'est dessiné qu'UNE fois : au-dessus de la diagonale. */
    paireVisible(r, c) { return r === 0 || c < r; }

    coteCase(nbBlocs) {
        const large = this.container.clientWidth || 700;
        const dispo = Math.max(240, Math.min(large - 300, 520));
        return Math.max(17, Math.min(34, Math.floor(dispo / (nbBlocs * this.n))));
    }

    cliquer(td) {
        if (this.isDemo) return;
        const { r, i, c, j } = td.dataset;
        const val = lire(this.saisie, +r, +i, +c, +j);
        const suivant = val === INCONNU ? NON : (val === NON ? OUI : INCONNU);
        this.poserCase(+r, +i, +c, +j, suivant);
        this.peindre();
    }

    /** Écrit une case, et — si l'aide mécanique est active — les croix qui suivent. */
    poserCase(a, i, b, j, val) {
        const m = this.saisie[a < b ? `${a}|${b}` : `${b}|${a}`];
        const mettre = (x, y, v) => { if (a < b) m[x][y] = v; else m[y][x] = v; };
        mettre(i, j, val);
        if (val !== OUI || !this.auto) return;
        for (let k = 0; k < this.n; k++) {
            if (k !== j && lire(this.saisie, a, i, b, k) === INCONNU) mettre(i, k, NON);
            if (k !== i && lire(this.saisie, a, k, b, j) === INCONNU) mettre(k, j, NON);
        }
    }

    peindre() {
        this.grilleEl.querySelectorAll('.lg-case').forEach(td => {
            const v = lire(this.saisie, +td.dataset.r, +td.dataset.i, +td.dataset.c, +td.dataset.j);
            td.classList.toggle('lg-case--vide', v === INCONNU);
            td.classList.toggle('lg-case--non', v === NON);
            td.classList.toggle('lg-case--oui', v === OUI);
            td.innerHTML = v === NON ? CROIX : (v === OUI ? ROND : '');
        });
    }

    // --- Aider, vérifier ----------------------------------------------------

    /** La déduction suivante que l'élève n'a pas encore posée. */
    prochaineEtape() {
        for (const e of this.puzzle.etapes) {
            if (lire(this.saisie, e.a, e.i, e.b, e.j) === INCONNU) return e;
        }
        return null;
    }

    aider() {
        if (this.isDemo) return;
        const e = this.prochaineEtape();
        if (!e) { this.note('Tout ce qui pouvait se déduire est déjà écrit : vérifie ta grille !'); return; }
        this.aidesUtilisees++;
        const cats = this.puzzle.categories;
        const ou = `${etiquette(cats[e.a], e.i)} / ${etiquette(cats[e.b], e.j)}`;
        this.note(`Regarde la case <b>${echapper(ou)}</b> : ${echapper(e.raison)}. `
            + `On peut donc y mettre ${e.val === OUI ? 'un rond' : 'une croix'}.`);
        // On MONTRE la case sans la remplir : la déduction reste à l'élève.
        const td = this.caseEl(e);
        if (td) {
            td.classList.add('lg-case--montre');
            setTimeout(() => td.classList.remove('lg-case--montre'), 2600);
            td.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    }

    caseEl(e) {
        return this.grilleEl.querySelector(`[data-r="${e.a}"][data-i="${e.i}"][data-c="${e.b}"][data-j="${e.j}"]`)
            || this.grilleEl.querySelector(`[data-r="${e.b}"][data-i="${e.j}"][data-c="${e.a}"][data-j="${e.i}"]`);
    }

    valider() {
        if (this.isDemo) return;
        const bilan = verifierSaisie(this.puzzle, this.saisie);
        if (bilan.ok) {
            this.reussis++;
            this.note('✅ Toute la grille est juste. ' + this.direSolution(), 'ok');
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: `Logigramme : ${this.puzzle.titre}`,
                expected: this.direSolution(),
                given: 'grille juste',
                points: 15 + this.niveau * 5
            });
            return;
        }
        if (bilan.fautes.length) {
            bilan.fautes.slice(0, 6).forEach(f => {
                const td = this.caseEl({ a: f.a, i: f.i, b: f.b, j: f.j });
                if (td) { td.classList.add('lg-case--faute'); setTimeout(() => td.classList.remove('lg-case--faute'), 1600); }
            });
            this.note(`❌ ${bilan.fautes.length} case${bilan.fautes.length > 1 ? 's' : ''} ne peu${bilan.fautes.length > 1 ? 'vent' : 't'} pas être là. `
                + 'Reprends les indices un par un : chacun doit rester vrai.', 'ko');
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: `Logigramme : ${this.puzzle.titre}`,
                input: `${bilan.fautes.length} case(s) fausse(s)`,
                expected: this.direSolution(),
                customMessage: 'Une case au moins contredit un indice. Relis-les un par un.',
                silencieux: true
            });
            return;
        }
        this.note(`La grille n'est pas finie : il manque ${bilan.attendus - bilan.poses} `
            + `case${bilan.attendus - bilan.poses > 1 ? 's' : ''} cochée${bilan.attendus - bilan.poses > 1 ? 's' : ''}. `
            + 'Tout ce que tu as écrit est juste, continue.', 'ko');
    }

    direSolution() {
        const cats = this.puzzle.categories;
        return this.puzzle.solution.map(e =>
            cats.map((c, k) => k === 0 ? c.valeurs[e[k]] : etiquette(c, e[k])).join(' · ')
        ).join(' ; ');
    }

    showNext() { return this.poser(); }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'lg-note' + (ton ? ` lg-note--${ton}` : '');
    }

    // --- La démonstration ---------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.puzzle) this.poser();
        if (!await cur.pause(500) || !this.isRunning) return fin();

        cur.say('Un logigramme se résout SANS jamais deviner : chaque case s\'écrit parce qu\'un indice '
            + 'ou la grille l\'oblige. Regarde.', this.teteEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        // On rejoue le journal du solveur : c'est l'ordre dans lequel l'énigme
        // se démonte, et chaque pas porte sa raison.
        const etapes = this.puzzle.etapes.slice(0, 14);
        for (const e of etapes) {
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const td = this.caseEl(e);
            const cats = this.puzzle.categories;
            const ou = `${etiquette(cats[e.a], e.i)} / ${etiquette(cats[e.b], e.j)}`;
            cur.say(`${ou} : ${e.raison}.`, td || this.grilleEl);
            if (td && !await cur.tap(td)) return fin();
            this.poserCase(e.a, e.i, e.b, e.j, e.val);
            this.peindre();
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('On continue ainsi jusqu\'à ce que chaque ligne ait son rond. '
            + 'Si tu bloques, le bouton « Aide-moi » te donne la déduction suivante — '
            + 'la raison, pas la réponse.', this.container.querySelector('[data-aide]'));
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

const CROIX = '<svg class="lg-case-svg" viewBox="0 0 24 24" width="70%" height="70%" fill="none" '
    + 'stroke="currentColor" stroke-width="3.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const ROND = '<svg class="lg-case-svg" viewBox="0 0 24 24" width="74%" height="74%" fill="none" '
    + 'stroke="currentColor" stroke-width="3.4"><circle cx="12" cy="12" r="7.5"/></svg>';

const echapper = (t) => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export function engineLogigramme(container, isDemo, params) {
    const jeu = new Logigramme(container, isDemo, params);
    jeu.start();
    return jeu;
}
