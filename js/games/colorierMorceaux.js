// COLORIER UNE GRILLE EN MORCEAUX — l'écran que deux jeux partagent.
//
// Le Patchwork et Les Serpents posent la même question à l'élève : « donne
// chaque case à l'un des morceaux annoncés ». Ce qui change, c'est la RÈGLE du
// morceau — avoir un centre de symétrie, ou être un chemin mince — et rien
// d'autre : le geste, la peinture, la gomme, le bouton « Vérifier », la
// démonstration du robot sont identiques.
//
// ON NE RECOPIE DONC PAS L'ÉCRAN. Deux copies d'un même écran, c'est deux
// endroits où corriger le jour où le glissé au doigt se comporte mal sur un
// téléphone — et un des deux qu'on oubliera. Le jeu apporte sa grille, son juge
// et ses mots ; l'écran ne sait rien du reste.
//
// LE GESTE EST DE COLORIER, et c'est tout. On touche l'étiquette d'un morceau
// pour le choisir, puis on peint ses cases — au clic, ou en glissant le doigt.
// Toucher une case déjà peinte de la couleur choisie la rend blanche : c'est la
// gomme, et elle ne demande aucun bouton de plus. Une case prise à un autre
// morceau change simplement de propriétaire : refuser ce geste obligerait à
// défaire avant de faire, ce qu'on ne fait pas avec un crayon de couleur.
//
// CE QU'ON NE FAIT PAS : demander de tracer les frontières. Les deux jeux
// d'origine se jouent en traçant des traits entre les cases ; viser un trait de
// deux pixels au doigt est un supplice. Colorier vise une case, qui en fait
// trente.

import { BaseGame } from '../core/BaseGame.js';
import { regTimeout } from '../core/timers.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';

// Des couleurs de tissu, assez différentes pour qu'on distingue deux morceaux
// voisins d'un coup d'œil, et assez pâles pour qu'un nombre reste lisible
// dessus. L'ordre est fixe : un morceau garde sa couleur d'un bout à l'autre.
export const TISSUS = [
    '#f3b4b4', '#b9d7f0', '#c8e6b8', '#f6dda6', '#d9c2ea',
    '#a9e0dc', '#f2c39a', '#c6cdf0', '#e8b8d4', '#cfe0a0',
    '#9fd3ee', '#eec9c9', '#bfe3c9', '#e3d2f3', '#f0d9a8'
];

export const STYLE_COLORIER = `
    .cm-wrap {
        display: flex; flex-direction: column; align-items: center;
        gap: clamp(4px, 1.4cqh, 12px);
        width: 100%; height: 100%; padding: 8px; box-sizing: border-box;
        color: var(--text-main); container-type: size;
        user-select: none; -webkit-user-select: none; overflow: hidden;
    }
    .cm-consigne { font-size: clamp(.78rem, 2.3cqh, 1rem); text-align: center; max-width: 52ch; }
    .cm-grille {
        display: grid; gap: 2px; background: var(--border);
        padding: 2px; border-radius: 8px; flex: 0 1 auto; min-height: 0;
    }
    .cm-case {
        background: var(--bg-panel); border-radius: 3px;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: clamp(.72rem, 2.8cqh, 1.25rem);
        cursor: pointer; position: relative; transition: background .12s ease;
        width: var(--cm-cote); height: var(--cm-cote); color: #22313f;
    }
    .cm-case--tete { box-shadow: inset 0 0 0 2px rgba(0,0,0,.28); }
    .cm-case--choisi { box-shadow: inset 0 0 0 3px var(--primary); }
    .cm-case--faute { animation: cm-secoue .3s ease; outline: 2px solid var(--danger); }
    @keyframes cm-secoue {
        0%, 100% { transform: none; } 25% { transform: translateX(-3px); }
        75% { transform: translateX(3px); }
    }
    /* La marque posée APRES la victoire — un point, une fleche — n'existe pas
       pendant la partie : elle donnerait la moitie de la reponse. */
    .cm-marque::after {
        content: ''; position: absolute; width: 10px; height: 10px;
        border-radius: 50%; background: #22313f; opacity: .75;
    }
    .cm-marque--bord::after { transform: translate(50%, 0); }
    .cm-marque--bas::after { transform: translate(0, 50%); }
    .cm-marque--coin::after { transform: translate(50%, 50%); }
    .cm-barre { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: center; }
    .cm-btn {
        border: none; border-radius: 999px; padding: 7px 16px;
        background: var(--primary); color: #fff; font-weight: 700;
        font-size: clamp(.78rem, 2.2cqh, .95rem); cursor: pointer;
    }
    .cm-btn--doux { background: var(--bg-plateau); color: var(--text-main); }
    .cm-note {
        min-height: 2.2em; text-align: center; max-width: 54ch;
        font-size: clamp(.74rem, 2.2cqh, .95rem); line-height: 1.35;
    }
    .cm-note--ko { color: var(--danger-texte); }
    .cm-note--ok { color: var(--success); font-weight: 700; }
`;

/**
 * L'ÉCRAN COMMUN. Un jeu qui en hérite fournit :
 *
 *   · `competence` — l'identifiant de compétence nourri par ses réussites ;
 *   · `fabriquerGrille()` → { lignes, colonnes, morceaux: [{ cases, indice,
 *     etiquette, valeur }] } — `indice` est la case qui porte l'étiquette ;
 *   · `juger(grille, appartenance)` → { ok, problemes: [{ message, cases }] } ;
 *   · `consigneDe(reste)` → la phrase du haut ;
 *   · `nomDeLaQuestion()` → ce qu'on écrit au carnet d'erreurs ;
 *   · `solutionDe(grille)` → une solution, pour le robot ;
 *   · `decorerLaVictoire()` — facultatif, ce qu'on montre une fois fini ;
 *   · `motsDuRobot()` → { ouverture, parMorceau(m), conclusion }.
 */
export class JeuAColorier extends BaseGame {
    render() {
        this.container.innerHTML = `
            <style>${STYLE_COLORIER}</style>
            <div class="cm-wrap">
                <p class="cm-consigne" data-consigne></p>
                <div class="cm-grille" data-grille></div>
                <div class="cm-barre">
                    <button type="button" class="cm-btn" data-verifier>Vérifier</button>
                    <button type="button" class="cm-btn cm-btn--doux" data-vider>Tout effacer</button>
                </div>
                <p class="cm-note" data-note role="status" aria-live="polite"></p>
            </div>`;
        this.ui = {
            consigne: this.container.querySelector('[data-consigne]'),
            grille: this.container.querySelector('[data-grille]'),
            note: this.container.querySelector('[data-note]')
        };
        this.container.querySelector('[data-verifier]').onclick = () => this.verifier();
        this.container.querySelector('[data-vider]').onclick = () => this.vider();

        // LE GLISSÉ, EN PLUS DU CLIC — c'est le geste du crayon de couleur, et
        // celui qu'on fait naturellement au doigt. `pointerdown` puis
        // `pointerover` : une seule logique pour la souris et le tactile.
        this.ui.grille.addEventListener('pointerdown', (e) => this.toucher(e, true));
        this.ui.grille.addEventListener('pointerover', (e) => {
            if (this.peint) this.toucher(e, false);
        });
        const lacher = () => { this.peint = false; };
        this.ui.grille.addEventListener('pointerup', lacher);
        this.ui.grille.addEventListener('pointercancel', lacher);
        document.addEventListener('pointerup', lacher);
        this._lacher = lacher;
        this.verifs = 0;
    }

    startGameLoop() { this.nouvelleGrille(); }

    nouvelleGrille() {
        this.g = this.fabriquerGrille();
        if (!this.g) { this.note('Grille introuvable — on recommence.', 'ko'); return; }
        this.appartenance = new Array(this.g.lignes * this.g.colonnes).fill(null);
        // L'étiquette appartient d'office à son morceau : la colorier
        // n'apprendrait rien, et l'oublier ferait un refus incompréhensible.
        this.g.morceaux.forEach(m => { this.appartenance[m.indice] = m.indice; });
        this.choisi = this.g.morceaux[0].indice;
        this.fini = false;
        this.dessiner();
        this.note('Choisis un nombre, puis colorie son morceau.', '');
    }

    couleurDe(indice) {
        const rang = this.g.morceaux.findIndex(m => m.indice === indice);
        return TISSUS[rang % TISSUS.length];
    }

    dessiner() {
        const { lignes, colonnes } = this.g;
        const N = lignes * colonnes;
        const parIndice = new Map(this.g.morceaux.map(m => [m.indice, m]));
        // La case s'adapte à la place : une grille de sept colonnes sur un
        // téléphone ne doit pas déborder, et sur un tableau blanc elle a le
        // droit d'être grande.
        const cote = `min(calc((100cqh - 120px) / ${lignes}), `
            + `calc((100cqw - 40px) / ${colonnes}), 64px)`;
        this.ui.grille.style.setProperty('--cm-cote', cote);
        this.ui.grille.style.gridTemplateColumns = `repeat(${colonnes}, var(--cm-cote))`;

        let html = '';
        for (let i = 0; i < N; i++) {
            const a = this.appartenance[i];
            const m = parIndice.get(i);
            const classes = ['cm-case'];
            if (m) classes.push('cm-case--tete');
            if (m && m.indice === this.choisi) classes.push('cm-case--choisi');
            const fond = a !== null ? ` style="background:${this.couleurDe(a)}"` : '';
            html += `<div class="${classes.join(' ')}" data-i="${i}"${fond}`
                + (m ? ` role="button" tabindex="0" aria-label="Morceau ${m.etiquette}"` : '')
                + `>${m ? m.etiquette : ''}</div>`;
        }
        this.ui.grille.innerHTML = html;
        this.majConsigne();
    }

    /**
     * REPEINDRE UNE SEULE CASE, sans refaire la grille.
     *
     * `dessiner()` remplace tout le HTML. Appelé à chaque case coloriée, il
     * DÉTACHE l'élément sous le doigt au milieu du glissé — le navigateur n'a
     * plus d'élément à qui envoyer la suite du geste, et la trace s'arrête à la
     * première case. Mesuré : dix-sept cases annoncées non coloriées après en
     * avoir peint dix-huit.
     */
    repeindre(i) {
        const el = this.ui.grille.querySelector(`[data-i="${i}"]`);
        if (!el) return;
        const a = this.appartenance[i];
        el.style.background = a !== null ? this.couleurDe(a) : '';
        this.majConsigne();
    }

    majConsigne() {
        const reste = this.appartenance.filter(a => a === null).length;
        this.ui.consigne.textContent = this.consigneDe(reste);
    }

    /** Un doigt ou une souris sur une case. `debut` : un appui, pas un passage. */
    toucher(e, debut) {
        if (this.fini || this.isDemo) return;
        const el = e.target && e.target.closest ? e.target.closest('[data-i]') : null;
        if (!el) return;
        const i = Number(el.dataset.i);
        const m = this.g.morceaux.find(x => x.indice === i);

        if (debut) {
            e.preventDefault();
            this.peint = true;
            // UNE ÉTIQUETTE SE CHOISIT, ELLE NE SE COLORIE PAS. Sans cette
            // règle, on effacerait le nombre qu'on vient de choisir.
            if (m) { this.choisi = i; this.dessiner(); return; }
        }
        if (m) return;
        if (this.choisi === null) return;

        const avant = this.appartenance[i];
        // La gomme : retoucher une case de la couleur choisie la rend blanche.
        this.appartenance[i] = (avant === this.choisi && debut) ? null : this.choisi;
        this.repeindre(i);
    }

    vider() {
        if (this.fini) return;
        this.appartenance = this.appartenance.map((a, i) =>
            this.g.morceaux.some(m => m.indice === i) ? i : null);
        this.dessiner();
        this.note('Grille effacée. Les nombres restent.', '');
    }

    verifier() {
        if (this.fini || !this.g) return;
        const bilan = this.juger(this.g, this.appartenance);
        if (bilan.ok) return this.gagner();

        this.verifs += 1;
        // ON NE DIT QU'UN PROBLÈME À LA FOIS, le premier — les juges les rangent
        // du plus terre-à-terre au plus mathématique. Trois reproches d'un coup,
        // et l'élève ne sait plus lequel regarder.
        const p = bilan.problemes[0];
        this.note(p.message, 'ko');
        this.secouer(p.cases);
        this.onWrongAnswer(null, {
            questionText: this.nomDeLaQuestion(),
            input: `découpage refusé (${p.genre})`,
            expected: this.attenduDit ? this.attenduDit() : 'un découpage qui suit la règle',
            concept: this.competence,
            customMessage: p.message
        });
    }

    secouer(cases) {
        (cases || []).forEach(i => {
            const el = this.ui.grille.querySelector(`[data-i="${i}"]`);
            if (el) {
                el.classList.add('cm-case--faute');
                regTimeout(() => el.classList.remove('cm-case--faute'), 320);
            }
        });
    }

    gagner() {
        this.fini = true;
        if (this.decorerLaVictoire) this.decorerLaVictoire();
        this.note(this.motDeVictoire(), 'ok');
        this.onCorrectAnswer(null, this.competence, {
            questionText: this.nomDeLaQuestion(),
            given: 'découpage juste', expected: 'découpage juste',
            points: Math.max(8, 14 - this.verifs * 2)
        });
        regTimeout(() => {
            if (this.isRunning) { this.verifs = 0; this.nouvelleGrille(); }
        }, 2800);
    }

    note(texte, ton) {
        this.ui.note.textContent = texte || '';
        this.ui.note.className = 'cm-note' + (ton ? ` cm-note--${ton}` : '');
    }

    /**
     * LE ROBOT MONTRE LE RAISONNEMENT, pas la solution.
     *
     * Il colorie TROIS morceaux, en disant à chaque fois ce qu'il CHERCHE. Un
     * robot qui remplirait la grille en silence montrerait qu'on peut y
     * arriver, ce que personne ne demandait — et il finirait le travail de
     * l'élève, ce que personne ne voulait.
     */
    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => {
            cur.destroy(); gate.destroy();
            this.demoCursor = null; this.demoGate = null;
        };

        if (!this.g) this.nouvelleGrille();
        if (!await cur.pause(500) || !this.isRunning) return fin();
        const mots = this.motsDuRobot();

        cur.say(mots.ouverture, this.ui.grille);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        const sol = this.solutionDe(this.g);
        for (const m of this.g.morceaux.slice(0, 3)) {
            if (!this.isRunning) return fin();
            this.choisi = m.indice;
            this.dessiner();
            const caseEl = this.ui.grille.querySelector(`[data-i="${m.indice}"]`);
            cur.say(mots.parMorceau(m), caseEl);
            if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();
            sol.forEach((a, i) => { if (a === m.indice) this.appartenance[i] = a; });
            this.dessiner();
            if (!await gate.wait(DEMO_SPEED.settle) || !this.isRunning) return fin();
        }
        if (this.decorerLaVictoire) this.decorerLaVictoire();
        cur.say(mots.conclusion, this.ui.grille);
        if (!await gate.wait(DEMO_SPEED.between)) return fin();
        fin();
    }

    destroy() {
        if (this._lacher) document.removeEventListener('pointerup', this._lacher);
        if (this.demoCursor) { this.demoCursor.destroy(); this.demoCursor = null; }
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}
