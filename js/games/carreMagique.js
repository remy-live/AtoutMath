// LE CARRÉ MAGIQUE — à l'écran.
//
// La grille, la somme affichée en gros, et LES NOMBRES MANQUANTS EN JETONS
// qu'on fait glisser dans les cases. C'est la forme classique de l'exercice —
// « place les nombres de 1 à 9 pour que… » — et c'est aussi celle qui fait le
// moins d'histoires : pas de faute de frappe, on essaie une case, on déplace,
// on recommence. Le simple appui reste possible : un jeton, puis une case.
// L'aide donne la DÉDUCTION suivante — la ligne où il ne manque qu'une case
// et la soustraction qui la comble — jamais la valeur seule. Le robot déroule
// le même journal, dans l'ordre où le carré se démonte.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import { CSS_GLISSER, rendreGlissable } from '../core/glisserDeposer.js';
import { genererCarreMagique, verifierSaisie, lignesDe } from '../core/carreMagique.js';

const COMPETENCE = 'num.logique.carre-magique';

class CarreMagique extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'carre-magique');
        this.rng = makeRng(this.params.seed);
        this.reussis = 0;
        this.aidesUtilisees = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                ${CSS_GLISSER}
                .cm-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 12px;
                    width: 100%; height: 100%; padding: 10px; box-sizing: border-box;
                    /* « size » : le carré doit se borner à la HAUTEUR autant
                       qu'à la largeur — voir la disposition en deux colonnes
                       des écrans couchés, plus bas. */
                    color: var(--text-main); overflow-y: auto; container-type: size;
                }
                .cm-tete { text-align: center; font-size: .95rem; }
                .cm-somme { font-size: 1.5rem; font-weight: 900; color: var(--primary); }
                /* LE CARRÉ EST UN TABLEAU DE SOMMES, pas une grille de trous.
                   Le total de chaque rangée s'écrit au bout, en direct : c'est
                   lui qui dit si l'on approche, et c'est par lui qu'on trouve la
                   case manquante. Sans ces totaux, l'élève additionne de tête,
                   se trompe, et croit que sa case est fausse. */
                .cm-plateau {
                    display: grid; gap: 4px; padding: 6px; border-radius: 14px;
                    background: color-mix(in srgb, var(--text-main) 12%, transparent);
                }
                .cm-case {
                    width: clamp(48px, 16cqw, 78px); aspect-ratio: 1;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 900; font-size: clamp(17px, 5cqw, 27px);
                    border-radius: 9px; box-sizing: border-box; background: var(--bg-panel);
                    color: var(--text-main); border: 0; font-family: inherit;
                    -webkit-tap-highlight-color: transparent;
                }
                /* Une case DONNÉE est imprimée : fond plein, on n'y touche pas.
                   Une case à trouver est un creux clair, cerné de pointillés. */
                .cm-case--donnee {
                    background: color-mix(in srgb, var(--text-main) 82%, transparent);
                    color: var(--bg-panel);
                }
                .cm-case--trou {
                    background: var(--bg-panel); cursor: pointer;
                    border: 2.5px dashed color-mix(in srgb, var(--primary) 45%, transparent);
                }
                .cm-case--trou:hover { border-color: var(--primary); }
                .cm-case--choisie {
                    border-style: solid; border-color: var(--primary);
                    box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 28%, transparent);
                }
                .cm-case--montre { box-shadow: 0 0 0 4px var(--warning, #f59e0b); }
                .cm-case--faute { border-color: var(--danger, #dc2626);
                    background: color-mix(in srgb, var(--danger, #dc2626) 15%, var(--bg-panel)); }

                /* Le total d'une rangée : gris tant qu'elle est incomplète,
                   vert quand elle tombe juste, rouge quand elle dépasse. */
                .cm-total {
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 800; font-size: clamp(12px, 3.4cqw, 17px);
                    color: var(--text-muted); border-radius: 9px;
                    background: color-mix(in srgb, var(--bg-panel) 55%, transparent);
                }
                .cm-total--ok { color: var(--success, #16a34a);
                    background: color-mix(in srgb, var(--success, #16a34a) 18%, transparent); }
                .cm-total--ko { color: var(--danger, #dc2626);
                    background: color-mix(in srgb, var(--danger, #dc2626) 15%, transparent); }
                .cm-total--cible { color: var(--primary); font-weight: 900; }

                /* LE PAVÉ MAISON. Le clavier de l'iPhone recouvrait le carré et
                   les boutons : on ne voyait plus ce qu'on remplissait. */
                /* LA RÉSERVE : les nombres qui manquent, en vrac, à poser. Elle
                   est cernée en pointillés parce qu'elle est aussi la ZONE DE
                   RETOUR — on y ramène un jeton mal placé. */
                .cm-reserve {
                    display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;
                    max-width: 420px; min-height: 52px; padding: 6px 10px;
                    border: 2px dashed var(--border); border-radius: 12px;
                }
                .cm-jeton {
                    min-width: 46px; height: 46px; padding: 0 8px; border-radius: 11px;
                    display: inline-flex; align-items: center; justify-content: center;
                    border: 2px solid var(--primary); font: inherit; font-weight: 900;
                    font-size: 1.15rem; cursor: pointer; color: var(--text-main);
                    background: color-mix(in srgb, var(--primary) 12%, var(--bg-panel));
                    box-shadow: 0 2px 0 rgba(15,23,42,.14);
                    -webkit-tap-highlight-color: transparent;
                }
                .cm-jeton--choisi { outline: 3px solid var(--primary); outline-offset: 2px; }
                .cm-jeton--place { display: none; }
                .cm-reserve--vide::after {
                    content: 'Tous les jetons sont posés.'; color: var(--text-muted);
                    font-size: .84rem; align-self: center;
                }
                .cm-barre { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
                .cm-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700; padding: 7px 13px;
                }
                .cm-btn--valider { border-color: var(--primary); background: var(--primary); color: #fff; }
                .cm-note { min-height: 2.6em; text-align: center; font-size: .88rem;
                    color: var(--text-muted); max-width: 620px; }
                .cm-note--ok { color: var(--success, #16a34a); font-weight: 700; }
                .cm-note--ko { color: var(--danger, #dc2626); font-weight: 600; }

                /* TÉLÉPHONE COUCHÉ : empilés, le carré et sa réserve sortent de
                   l'écran — on ne pouvait plus atteindre les jetons, donc plus
                   jouer du tout. Le carré passe à gauche, tout le reste à
                   droite, et les cases se bornent à la hauteur disponible. */
                @container (max-height: 470px) {
                    .cm-wrap {
                        display: grid; gap: 6px 16px;
                        grid-template-columns: auto minmax(0, 1fr);
                        grid-template-areas:
                            "tete    tete"
                            "plateau reserve"
                            "plateau barre"
                            "plateau note";
                        align-content: center; align-items: center; justify-items: center;
                    }
                    .cm-tete { grid-area: tete; }
                    .cm-plateau { grid-area: plateau; }
                    .cm-reserve { grid-area: reserve; max-width: none; min-height: 0; }
                    .cm-barre { grid-area: barre; }
                    .cm-note { grid-area: note; min-height: 0; font-size: .8rem; }
                    .cm-case { width: min(56px, 11cqh); font-size: min(20px, 5cqh); }
                    .cm-jeton { min-width: 38px; height: 38px; font-size: 1rem; }
                    .cm-btn { padding: 5px 10px; font-size: .84rem; }
                }
            </style>
            <div class="cm-wrap">
                <div class="cm-tete">Toutes les lignes, colonnes et diagonales font
                    <span class="cm-somme" data-somme></span></div>
                <div class="cm-plateau" data-grille></div>
                <div class="cm-reserve" data-reserve></div>
                <div class="cm-barre">
                    <button type="button" class="cm-btn" data-aide>💡 Aide-moi</button>
                    <button type="button" class="cm-btn" data-effacer>↺ Effacer</button>
                    <button type="button" class="cm-btn" data-neuf>Autre carré</button>
                    <button type="button" class="cm-btn cm-btn--valider" data-valider>Vérifier</button>
                </div>
                <div class="cm-note" data-note></div>
            </div>`;
        this.grilleEl = this.container.querySelector('[data-grille]');
        this.reserveEl = this.container.querySelector('[data-reserve]');
        this.sommeEl = this.container.querySelector('[data-somme]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.container.querySelector('[data-effacer]').onclick = () => this.effacer();
        this.container.querySelector('[data-neuf]').onclick = () => this.showNext();
        this.container.querySelector('[data-valider]').onclick = () => this.valider();
    }

    startGameLoop() { this.poser(); }

    poser() {
        this.puzzle = genererCarreMagique(this.params, this.rng);
        this.sommeEl.textContent = String(this.puzzle.somme);
        this.dessiner();
        this.note('');
        return true;
    }

    dessiner() {
        const p = this.puzzle;
        this.valeurs = {};
        this.choisie = null;
        // n colonnes de cases, plus une colonne de totaux ; n rangées, plus
        // une rangée de totaux et le coin qui rappelle la somme visée.
        this.grilleEl.style.gridTemplateColumns = `repeat(${p.n}, auto) auto`;
        let html = '';
        for (let r = 0; r < p.n; r++) {
            for (let c = 0; c < p.n; c++) {
                const i = r * p.n + c;
                html += p.trous.includes(i)
                    ? `<button type="button" class="cm-case cm-case--trou" data-i="${i}"
                         aria-label="case à compléter"></button>`
                    : `<div class="cm-case cm-case--donnee" data-i="${i}">${p.cases[i]}</div>`;
            }
            html += `<div class="cm-total" data-tot="l${r}"></div>`;
        }
        for (let c = 0; c < p.n; c++) html += `<div class="cm-total" data-tot="c${c}"></div>`;
        html += `<div class="cm-total cm-total--cible" data-tot="cible">${p.somme}</div>`;
        this.grilleEl.innerHTML = html;
        this.grilleEl.querySelectorAll('.cm-case--trou').forEach(el => {
            el.onclick = () => this.deposerChoisi(el);
        });
        this.garnirReserve();
        this.majTotaux();
    }

    /**
     * LES NOMBRES QUI MANQUENT, en vrac.
     *
     * On les mélange : rangés dans l'ordre, ils désigneraient les cases par
     * leur place dans la réserve, et l'élève poserait sans calculer.
     */
    garnirReserve() {
        const p = this.puzzle;
        this.jetons = [];
        this.jetonChoisi = null;
        this.reserveEl.innerHTML = '';
        const valeurs = this.rng.shuffle(p.trous.map(i => p.cases[i]));
        valeurs.forEach((v, k) => {
            const el = document.createElement('button');
            el.type = 'button';
            el.className = 'cm-jeton';
            el.textContent = String(v);
            el.dataset.v = String(v);
            el.dataset.k = String(k);
            el.onclick = () => this.choisirJeton(el);
            rendreGlissable(el, {
                cibles: '.cm-case--trou',
                deposer: (cible) => this.poserJeton(el, cible),
                retirer: () => this.rendreJeton(el),
                zoneRetour: this.reserveEl,
                actif: () => !this.isDemo,
                marquerGlissement: (v) => { this.vientDeGlisser = v; }
            });
            this.reserveEl.appendChild(el);
            this.jetons.push(el);
        });
        this.majReserve();
    }

    majReserve() {
        const restants = this.jetons.filter(j => !j.dataset.pose);
        restants.forEach(j => j.classList.remove('cm-jeton--place'));
        this.reserveEl.classList.toggle('cm-reserve--vide', restants.length === 0);
    }

    choisirJeton(el) {
        if (this.isDemo || this.vientDeGlisser) return;
        const deja = el === this.jetonChoisi;
        this.jetons.forEach(j => j.classList.remove('cm-jeton--choisi'));
        this.jetonChoisi = deja ? null : el;
        if (this.jetonChoisi) {
            el.classList.add('cm-jeton--choisi');
            this.note('Touche maintenant la case où ce nombre doit aller.');
        }
    }

    /** Un appui sur une case : elle reçoit le jeton choisi, ou rend le sien. */
    deposerChoisi(cible) {
        if (this.isDemo) return;
        if (this.jetonChoisi) { this.poserJeton(this.jetonChoisi, cible); return; }
        // Pas de jeton en main : la case rend le sien à la réserve.
        const i = Number(cible.dataset.i);
        const pose = this.jetons.find(j => Number(j.dataset.pose) === i);
        if (pose) this.rendreJeton(pose);
        else this.note('Prends d\'abord un nombre dans la réserve, puis touche sa case.');
    }

    poserJeton(el, cible) {
        if (this.isDemo) return;
        const i = Number(cible.dataset.i);
        // La case était occupée : son jeton retourne à la réserve.
        const occupant = this.jetons.find(j => Number(j.dataset.pose) === i);
        if (occupant && occupant !== el) this.rendreJeton(occupant, true);

        el.dataset.pose = String(i);
        el.classList.add('cm-jeton--place');
        el.classList.remove('cm-jeton--choisi');
        if (this.jetonChoisi === el) this.jetonChoisi = null;
        this.valeurs[i] = Number(el.dataset.v);
        cible.textContent = el.dataset.v;
        cible.classList.remove('cm-case--faute');
        this.majReserve();
        this.majTotaux();
        this.note('');
    }

    rendreJeton(el, silencieux) {
        const i = Number(el.dataset.pose);
        if (!Number.isFinite(i)) return;
        delete el.dataset.pose;
        el.classList.remove('cm-jeton--place');
        delete this.valeurs[i];
        const cible = this.grilleEl.querySelector(`.cm-case[data-i="${i}"]`);
        if (cible) { cible.textContent = ''; cible.classList.remove('cm-case--faute'); }
        this.majReserve();
        this.majTotaux();
        if (!silencieux) this.note('');
    }

    /** Le total de chaque rangée, en direct : c'est l'outil de résolution. */
    majTotaux() {
        const p = this.puzzle;
        const val = (i) => p.trous.includes(i)
            ? (this.valeurs[i] === undefined ? null : this.valeurs[i]) : p.cases[i];
        const poser = (clef, cases) => {
            const el = this.grilleEl.querySelector(`[data-tot="${clef}"]`);
            if (!el) return;
            const vals = cases.map(val);
            const somme = vals.reduce((t, v) => t + (v || 0), 0);
            const complet = vals.every(v => v !== null);
            el.textContent = complet || somme ? String(somme) : '';
            el.classList.toggle('cm-total--ok', complet && somme === p.somme);
            el.classList.toggle('cm-total--ko', complet && somme !== p.somme);
        };
        for (let r = 0; r < p.n; r++) {
            poser(`l${r}`, Array.from({ length: p.n }, (_, c) => r * p.n + c));
        }
        for (let c = 0; c < p.n; c++) {
            poser(`c${c}`, Array.from({ length: p.n }, (_, r) => r * p.n + c));
        }
    }

    effacer() {
        this.valeurs = {};
        this.grilleEl.querySelectorAll('.cm-case--trou').forEach(el => {
            el.textContent = '';
            el.classList.remove('cm-case--faute');
        });
        (this.jetons || []).forEach(j => {
            delete j.dataset.pose;
            j.classList.remove('cm-jeton--place', 'cm-jeton--choisi');
        });
        this.jetonChoisi = null;
        this.majReserve();
        this.majTotaux();
        this.note('');
    }

    saisie() {
        const s = {};
        this.puzzle.trous.forEach(i => {
            s[i] = this.valeurs[i] === undefined ? null : this.valeurs[i];
        });
        return s;
    }

    valider() {
        if (this.isDemo) return;
        const bilan = verifierSaisie(this.puzzle, this.saisie());
        this.grilleEl.querySelectorAll('.cm-case--faute').forEach(c => c.classList.remove('cm-case--faute'));
        if (bilan.ok) {
            this.reussis++;
            this.note(`✅ Le carré est magique : chaque ligne fait bien ${this.puzzle.somme}.`, 'ok');
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: `Carré magique ${this.puzzle.n}×${this.puzzle.n} (somme ${this.puzzle.somme})`,
                expected: 'carré complet', given: 'carré complet',
                points: 10 + this.puzzle.trous.length * 2
            });
            setTimeout(() => { if (this.isRunning) this.poser(); }, 1900);
            return;
        }
        if (bilan.fautes.length) {
            bilan.fautes.forEach(i => this.grilleEl.querySelector(`.cm-case[data-i="${i}"]`)
                ?.classList.add('cm-case--faute'));
            this.note(`❌ ${bilan.fautes.length} case${bilan.fautes.length > 1 ? 's' : ''} en trop ou en moins : `
                + `refais la somme de leur ligne, elle doit faire ${this.puzzle.somme}.`, 'ko');
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: `Carré magique ${this.puzzle.n}×${this.puzzle.n}`,
                input: `${bilan.fautes.length} case(s) fausse(s)`,
                expected: `somme ${this.puzzle.somme} partout`,
                customMessage: `Une ligne au moins ne fait pas ${this.puzzle.somme}. Vérifie ligne par ligne.`,
                silencieux: true
            });
            return;
        }
        this.note(`Il reste ${bilan.vides} case${bilan.vides > 1 ? 's' : ''} vide${bilan.vides > 1 ? 's' : ''}. `
            + 'Tout ce que tu as écrit est juste, continue.', 'ko');
    }

    /** La prochaine déduction que l'élève n'a pas encore écrite. */
    prochaine() {
        const s = this.saisie();
        return this.puzzle.etapes.find(e => s[e.case] === null || s[e.case] === undefined
            ? s[e.case] !== this.puzzle.cases[e.case] : Number(s[e.case]) !== this.puzzle.cases[e.case]);
    }

    aider() {
        if (this.isDemo) return;
        const e = this.prochaine();
        if (!e) { this.note('Tout ce qui peut se déduire est écrit : vérifie ton carré !'); return; }
        this.aidesUtilisees++;
        // La LIGNE, la soustraction — pas la valeur toute seule.
        this.note(`Regarde la case qui s'allume : ${e.raison}.`);
        const el = this.grilleEl.querySelector(`.cm-case[data-i="${e.case}"]`);
        if (el) {
            el.classList.add('cm-case--montre');
            setTimeout(() => el.classList.remove('cm-case--montre'), 2600);
        }
    }

    showNext() { return this.poser(); }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'cm-note' + (ton ? ` cm-note--${ton}` : '');
    }

    // --- La démonstration -------------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.puzzle) this.poser();
        if (!await cur.pause(500) || !this.isRunning) return fin();
        cur.say(`Un carré magique se résout toujours pareil : je cherche une ligne où il ne manque `
            + `qu'UNE case, et je la trouve par une soustraction depuis ${this.puzzle.somme}.`, this.sommeEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        for (const e of this.puzzle.etapes.slice(0, 4)) {
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const el = this.grilleEl.querySelector(`.cm-case[data-i="${e.case}"]`);
            cur.say(`${e.raison}.`, el || this.grilleEl);
            // Le robot va CHERCHER le jeton, puis le pose : c'est le geste
            // que l'élève devra faire, pas une valeur qui apparaît.
            const jeton = (this.jetons || []).find(j => !j.dataset.pose
                && Number(j.dataset.v) === e.valeur);
            if (jeton && el) {
                if (!await cur.dragFromTo(jeton, el)) return fin();
                jeton.dataset.pose = String(e.case);
                jeton.classList.add('cm-jeton--place');
                el.textContent = String(e.valeur);
                this.valeurs[e.case] = e.valeur;
                this.majReserve();
                this.majTotaux();
            } else if (el && !await cur.tap(el)) { return fin(); }
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Chaque case écrite débloque une nouvelle ligne à une seule case : on continue '
            + 'jusqu\'au bout, sans jamais deviner.', this.container.querySelector('[data-aide]'));
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineCarreMagique(container, isDemo, params) {
    const jeu = new CarreMagique(container, isDemo, params);
    jeu.start();
    return jeu;
}
