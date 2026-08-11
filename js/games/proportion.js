// LE TABLEAU DE PROPORTIONNALITÉ — on tape dans les cases, comme au cahier.
//
// Un tableau à compléter doit se manipuler comme un tableau : on touche la
// case, on écrit dedans, on passe à la suivante. Pas de liste de propositions à
// côté, pas de champ de saisie unique en bas de l'écran — c'est DANS la case
// que le nombre doit apparaître, sinon on perd le lien entre la valeur et sa
// colonne, qui est tout ce qu'on travaille.
//
// Le clavier de l'application est un pavé, et pas le clavier du système :
// sur un téléphone, le clavier natif recouvre la moitié de l'écran, donc le
// tableau — et l'élève tape sans voir ce qu'il complète.
//
// LE BOUTON « MONTRER LE LIEN » affiche le coefficient et la colonne de
// l'unité. C'est l'outil du chapitre, pas une triche : ce qu'on veut installer,
// c'est le réflexe de le chercher. Les règles, le tirage et le diagnostic des
// erreurs vivent dans core/proportion.js, testés sans navigateur.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    tirerTableau, attendu, colonnesCompletes, verifierCase, termine,
    expliquer, ecrire, lire, titreLigne, direContexte, IDS_NIVEAUX
} from '../core/proportion.js';
import { boutonAide, majBoutonAide } from '../ui/gameChrome.js';
import { suivreDefilement } from '../ui/defilement.js';

const SKILL = 'num.proportion.tableau';

class Proportion extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'proportion');
        this.niveau = IDS_NIVEAUX.includes(this.params.niveau) ? this.params.niveau : 'facile';
        this.rng = makeRng(this.params.seed);
        this.reussis = 0;
        this.erreurs = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .pr-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 9px;
                    width: 100%; height: 100%; color: var(--text-main); overflow-y: auto;
                    user-select: none; -webkit-user-select: none;
                }
                .pr-haut {
                    display: flex; align-items: center; justify-content: center; gap: 10px;
                    flex-wrap: wrap; width: 100%; flex: 0 0 auto;
                    font-size: clamp(11px, 2.6cqw, 14px); font-weight: 700;
                }
                .pr-score { color: var(--text-muted); font-weight: 600; }
                .pr-btn {
                    border: 1px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); border-radius: 9px; cursor: pointer;
                    font: inherit; font-weight: 600; font-size: .82rem; padding: 4px 10px;
                }
                .pr-btn:hover { background: var(--bg-hover); }
                .pr-consigne {
                    text-align: center; max-width: 560px; flex: 0 0 auto;
                    font-size: clamp(12px, 3cqw, 15px); line-height: 1.35; color: var(--text-muted);
                }

                /* LE TABLEAU. Il défile horizontalement plutôt que de se
                   comprimer : cinq colonnes écrasées sur un téléphone
                   deviennent illisibles, et un tableau illisible ne se lit
                   plus par colonnes — donc n'apprend plus rien. */
                .pr-cadre { width: 100%; overflow-x: auto; flex: 0 0 auto; padding: 2px; }
                .pr-tab {
                    border-collapse: separate; border-spacing: 0; margin: 0 auto;
                    background: var(--bg-panel); border-radius: 14px; overflow: hidden;
                    box-shadow: var(--shadow-sm); border: 2px solid var(--border);
                }
                .pr-tab th, .pr-tab td {
                    border-right: 1px solid var(--border); border-bottom: 1px solid var(--border);
                    padding: 0; text-align: center;
                }
                .pr-tab tr:last-child td, .pr-tab tr:last-child th { border-bottom: none; }
                .pr-tab th:last-child, .pr-tab td:last-child { border-right: none; }
                .pr-entete {
                    background: var(--bg-app); font-weight: 800; text-align: left !important;
                    padding: 10px 12px !important; white-space: nowrap;
                    font-size: clamp(11px, 2.6cqw, 14px); min-width: 118px;
                }
                /* Sur un écran étroit, l'en-tête cède la place aux colonnes :
                   c'est le tableau qu'on lit, pas son intitulé. Cinq colonnes
                   entrent alors sans défilement. */
                @media (max-width: 430px) {
                    .pr-entete { min-width: 92px; padding: 8px 8px !important; white-space: normal; }
                }
                .pr-case {
                    min-width: clamp(52px, 15cqw, 86px); height: clamp(46px, 11cqw, 62px);
                    font-size: clamp(15px, 3.6cqw, 21px); font-weight: 700;
                    color: var(--text-main);
                }
                .pr-trou {
                    cursor: pointer; color: var(--primary);
                    background: color-mix(in srgb, var(--primary) 9%, transparent);
                    -webkit-tap-highlight-color: transparent;
                }
                .pr-trou:hover { background: color-mix(in srgb, var(--primary) 17%, transparent); }
                /* La case en cours d'écriture : un liseré épais À L'INTÉRIEUR,
                   pour ne pas décaler la grille d'un pixel à chaque
                   déplacement. */
                .pr-trou--actif {
                    box-shadow: inset 0 0 0 3px var(--primary);
                    background: color-mix(in srgb, var(--primary) 20%, transparent);
                }
                .pr-trou--juste {
                    color: var(--success); background: color-mix(in srgb, var(--success) 16%, transparent);
                    box-shadow: inset 0 0 0 2px var(--success);
                }
                .pr-trou--faux { animation: pr-non .35s; }
                @keyframes pr-non {
                    25% { transform: translateX(-5px); } 75% { transform: translateX(5px); }
                }
                .pr-vide::after { content: '?'; opacity: .45; }
                .pr-curseur::after {
                    content: ''; display: inline-block; width: 2px; height: 1em;
                    background: var(--primary); margin-left: 1px;
                    animation: pr-clign 1s steps(2) infinite; vertical-align: -.13em;
                }
                @keyframes pr-clign { 50% { opacity: 0; } }
                /* La colonne repère : celle qui est complète, donc celle qui
                   donne le lien. On la désigne, on ne la laisse pas chercher. */
                .pr-repere { background: color-mix(in srgb, var(--warning) 14%, transparent); }

                /* LE LIEN, replié par défaut. */
                .pr-aide-barre { display: flex; justify-content: center; width: 100%; flex: 0 0 auto; }
                .pr-lien {
                    width: 100%; max-width: 560px; flex: 0 0 auto;
                    background: var(--bg-app); border: 1px solid var(--border);
                    border-radius: 14px; padding: 11px 13px;
                    font-size: clamp(12px, 2.9cqw, 15px); line-height: 1.5;
                }
                .pr-lien[hidden] { display: none; }
                .pr-lien b { color: var(--primary); }
                .pr-lien-ligne { display: flex; gap: 8px; align-items: baseline; padding: 2px 0; }
                .pr-puce {
                    flex: 0 0 auto; width: 19px; height: 19px; border-radius: 50%;
                    background: var(--primary); color: #fff; font-size: .7rem; font-weight: 800;
                    display: flex; align-items: center; justify-content: center;
                }

                /* LE PAVÉ. Le clavier du système recouvrirait le tableau. */
                .pr-pave {
                    display: grid; grid-template-columns: repeat(5, 1fr);
                    gap: clamp(5px, 1.4cqw, 9px); width: 100%; max-width: 420px; flex: 0 0 auto;
                }
                .pr-touche {
                    padding: clamp(9px, 2.4cqw, 14px) 0; border-radius: 12px;
                    border: 2px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); font: inherit; font-weight: 800;
                    font-size: clamp(15px, 3.6cqw, 20px); cursor: pointer;
                    box-shadow: 0 3px 0 rgba(15,23,42,.12);
                    -webkit-tap-highlight-color: transparent;
                }
                .pr-touche:active { transform: translateY(3px); box-shadow: none; }
                .pr-touche--ok { border-color: var(--success); color: var(--success); }
                .pr-touche--eff { border-color: var(--warning); color: var(--warning); }

                .pr-note {
                    min-height: 2.6em; text-align: center; width: 100%; max-width: 580px;
                    font-size: clamp(11px, 2.7cqw, 14px); line-height: 1.4;
                    color: var(--text-muted); flex: 0 0 auto;
                }
                .pr-note b { color: var(--text-main); }
                .pr-bulle { display: inline-block; padding: 6px 14px; border-radius: 14px; font-weight: 700; }
                .pr-bulle--ok { background: color-mix(in srgb, var(--success) 20%, transparent); color: var(--success); }
                .pr-bulle--ko { background: color-mix(in srgb, var(--danger) 18%, transparent); color: var(--danger); }
            </style>
            <div class="pr-wrap">
                <div class="pr-haut">
                    <span data-titre></span>
                    <span class="pr-score" data-score></span>
                    <button type="button" class="pr-btn" data-neuf>↺ Autre tableau</button>
                </div>
                <p class="pr-consigne" data-consigne></p>
                <div class="pr-cadre"><table class="pr-tab" data-tab></table></div>
                <div class="pr-aide-barre">${boutonAide('le lien')}</div>
                <div class="pr-lien" data-lien hidden></div>
                <div class="pr-pave" data-pave></div>
                <p class="pr-note" data-note></p>
            </div>`;

        this.titreEl = this.container.querySelector('[data-titre]');
        this.scoreEl = this.container.querySelector('[data-score]');
        this.consigneEl = this.container.querySelector('[data-consigne]');
        this.tabEl = this.container.querySelector('[data-tab]');
        suivreDefilement(this.container.querySelector('.pr-cadre'));
        this.lienEl = this.container.querySelector('[data-lien]');
        this.paveEl = this.container.querySelector('[data-pave]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.voirEl = this.container.querySelector('[data-aide]');
        this.container.querySelector('[data-neuf]').addEventListener('click', () => this.nouveauTableau());
        this.voirEl.addEventListener('click', () => this.basculerLien());

        this.dessinerPave();

        // Le clavier physique, pour qui en a un : c'est le geste naturel
        // devant un tableau sur ordinateur.
        this.surTouche = (e) => {
            if (this.isDemo || this.actif == null) return;
            if (/^[0-9]$/.test(e.key)) { e.preventDefault(); this.taper(e.key); }
            else if (e.key === ',' || e.key === '.') { e.preventDefault(); this.taper(','); }
            else if (e.key === 'Backspace') { e.preventDefault(); this.effacer(); }
            else if (e.key === 'Enter') { e.preventDefault(); this.valider(); }
            else if (e.key === 'Tab') { e.preventDefault(); this.suivant(); }
        };
        document.addEventListener('keydown', this.surTouche);

        this.nouveauTableau();
    }

    startGameLoop() { /* Au rythme de l'élève : rien à animer en continu. */ }

    // --- Un tableau -------------------------------------------------------------

    nouveauTableau() {
        this.t = tirerTableau(this.niveau, this.rng);
        this.saisies = this.t.trous.map(() => null);   // valeurs validées
        this.brouillon = this.t.trous.map(() => '');   // ce qui est en train d'être tapé
        this.faits = this.t.trous.map(() => false);
        this.fautes = 0;
        this.lienOuvert = false;
        this.actif = 0;

        this.titreEl.innerHTML = `📊 Complète le tableau`;
        this.consigneEl.textContent = direContexte(this.t);
        this.lienEl.hidden = true;
        this.lienEl.innerHTML = '';
        majBoutonAide(this.voirEl, 'le lien', false);
        this.majScore();
        this.dessinerTableau();
        this.note('Touche une case bleue, puis tape le nombre. La colonne surlignée est complète : c\'est elle qui donne le lien.');
    }

    majScore() {
        this.scoreEl.textContent = `${this.reussis} tableau${this.reussis > 1 ? 'x' : ''} rempli${this.reussis > 1 ? 's' : ''}`
            + (this.erreurs ? ` · ${this.erreurs} erreur${this.erreurs > 1 ? 's' : ''}` : '');
    }

    /** L'index du trou occupant une case, ou -1. */
    trouDe(col, ligne) {
        return this.t.trous.findIndex(x => x.col === col && x.ligne === ligne);
    }

    dessinerTableau() {
        const t = this.t;
        const repere = colonnesCompletes(t)[0];
        const ligne = (nom) => {
            const cases = t.a.map((_, col) => {
                const k = this.trouDe(col, nom);
                const marque = col === repere ? ' pr-repere' : '';
                if (k < 0) {
                    const v = nom === 'a' ? t.a[col] : t.b[col];
                    return `<td class="pr-case${marque}">${ecrire(v)}</td>`;
                }
                return `<td class="pr-case pr-trou${marque}" data-trou="${k}"
                            role="button" tabindex="0" aria-label="case à compléter"></td>`;
            }).join('');
            return `<tr><th class="pr-entete">${titreLigne(t, nom)}</th>${cases}</tr>`;
        };
        this.tabEl.innerHTML = `<tbody>${ligne('a')}${ligne('b')}</tbody>`;
        this.tabEl.querySelectorAll('[data-trou]').forEach(td => {
            td.addEventListener('click', () => this.choisir(Number(td.dataset.trou)));
        });
        this.majCases();
    }

    /** Repeint le contenu des trous, sans reconstruire le tableau. */
    majCases() {
        this.tabEl.querySelectorAll('[data-trou]').forEach(td => {
            const k = Number(td.dataset.trou);
            const fait = this.faits[k];
            const texte = fait ? ecrire(this.saisies[k]) : this.brouillon[k];
            td.textContent = texte;
            td.classList.toggle('pr-trou--actif', !fait && k === this.actif);
            td.classList.toggle('pr-trou--juste', fait);
            td.classList.toggle('pr-vide', !fait && !texte && k !== this.actif);
            td.classList.toggle('pr-curseur', !fait && k === this.actif);
        });
    }

    choisir(k) {
        if (this.isDemo || this.faits[k]) return;
        this.actif = k;
        this.majCases();
    }

    /** La case non remplie suivante, en tournant. */
    suivant() {
        const n = this.t.trous.length;
        for (let d = 1; d <= n; d++) {
            const k = (this.actif + d) % n;
            if (!this.faits[k]) { this.actif = k; this.majCases(); return; }
        }
    }

    // --- La saisie ---------------------------------------------------------------

    dessinerPave() {
        const touches = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', ','];
        this.paveEl.innerHTML = touches.map(c =>
            `<button type="button" class="pr-touche" data-t="${c}">${c}</button>`).join('')
            + `<button type="button" class="pr-touche pr-touche--eff" data-t="eff" aria-label="Effacer">⌫</button>`
            + `<button type="button" class="pr-touche pr-touche--ok" data-t="ok" aria-label="Valider"
                       style="grid-column: span 3">✓ Valider</button>`;
        this.paveEl.querySelectorAll('[data-t]').forEach(b => {
            b.addEventListener('click', () => {
                if (this.isDemo) return;
                const c = b.dataset.t;
                if (c === 'eff') this.effacer();
                else if (c === 'ok') this.valider();
                else this.taper(c);
            });
        });
    }

    taper(c) {
        if (this.actif == null || this.faits[this.actif]) return;
        const b = this.brouillon[this.actif];
        // Une seule virgule, et pas plus de deux décimales : on ne laisse pas
        // écrire un nombre qui ne peut pas être la réponse.
        if (c === ',' && b.includes(',')) return;
        if (c === ',' && !b) return;
        if (b.includes(',') && b.split(',')[1].length >= 2 && c !== ',') return;
        if (b.replace(',', '').length >= 6) return;
        this.brouillon[this.actif] = b + c;
        this.majCases();
    }

    effacer() {
        if (this.actif == null || this.faits[this.actif]) return;
        this.brouillon[this.actif] = this.brouillon[this.actif].slice(0, -1);
        this.majCases();
    }

    valider() {
        if (this.actif == null || this.faits[this.actif]) return;
        const k = this.actif;
        const trou = this.t.trous[k];
        const tape = this.brouillon[k];
        const v = lire(tape);
        const r = verifierCase(this.t, trou, v);

        if (r.ok) {
            this.saisies[k] = v;
            this.faits[k] = true;
            this.majCases();
            if (termine(this.t, this.saisies)) return this.reussir();
            this.suivant();
            this.note('✅ Juste. Case suivante.', 'ok');
            return;
        }

        this.erreurs++;
        this.fautes++;
        this.majScore();
        const td = this.tabEl.querySelector(`[data-trou="${k}"]`);
        if (td) {
            td.classList.add('pr-trou--faux');
            this.timerId = setTimeout(() => td.classList.remove('pr-trou--faux'), 380);
        }
        this.brouillon[k] = '';
        this.majCases();
        // L'erreur additive mérite qu'on ouvre le lien : c'est exactement ce
        // qu'elle ignore.
        const pousse = r.faute === 'additif' && !this.lienOuvert
            ? ' <b>Ouvre l\'aide : elle donne le coefficient.</b>' : '';
        this.note(r.message + pousse, 'ko');
        this.onWrongAnswer(td, {
            concept: SKILL,
            questionText: `${titreLigne(this.t, trou.ligne)} pour ${ecrire(trou.ligne === 'a' ? this.t.b[trou.col] : this.t.a[trou.col])} (coefficient ${ecrire(this.t.coef)})`,
            input: tape || '(vide)',
            expected: ecrire(attendu(this.t, trou)),
            customMessage: r.message,
            silencieux: true
        });
    }

    reussir() {
        this.reussis++;
        this.actif = null;
        this.majCases();
        this.majScore();
        const parfait = this.fautes === 0;
        this.note(parfait
            ? `🏁 Tableau complet, sans une erreur. Coefficient : <b>× ${ecrire(this.t.coef)}</b>.`
            : `🏁 Tableau complet. Coefficient : <b>× ${ecrire(this.t.coef)}</b> — c'est lui qu'il fallait trouver en premier.`,
            'ok');
        this.onCorrectAnswer(null, SKILL, {
            points: parfait ? 25 : 12,
            questionText: `Compléter un tableau de proportionnalité (${this.t.trous.length} cases, coefficient ${ecrire(this.t.coef)})`,
            given: 'complété', expected: 'complété'
        });
        this.timerId = setTimeout(() => { if (this.isRunning) this.nouveauTableau(); }, 3200);
    }

    // --- Le lien ------------------------------------------------------------------

    /**
     * LE COEFFICIENT ET LA COLONNE DE L'UNITÉ.
     *
     * Deux chemins, pas un. Le coefficient est le plus rapide ; le retour à
     * l'unité est le plus sûr, et c'est le seul qui reste praticable quand le
     * coefficient tombe mal. Montrer les deux, c'est dire qu'il y a plusieurs
     * façons de raisonner — ce qui est vrai, et rarement dit.
     */
    basculerLien() {
        if (!this.t) return;
        this.lienOuvert = !this.lienOuvert;
        this.lienEl.hidden = !this.lienOuvert;
        majBoutonAide(this.voirEl, 'le lien', this.lienOuvert);
        if (!this.lienOuvert || this.lienEl.innerHTML) return;

        const t = this.t;
        const ref = colonnesCompletes(t)[0];
        const lignes = [
            `Une colonne est complète : <b>${ecrire(t.a[ref])} → ${ecrire(t.b[ref])}</b>.`,
            `On passe de la ligne du haut à celle du bas en multipliant par <b>${ecrire(t.b[ref])} ÷ ${ecrire(t.a[ref])} = ${ecrire(t.coef)}</b>. C'est le coefficient, et il est le MÊME dans toutes les colonnes.`,
            `Autre chemin, toujours possible : pour <b>1</b>, la ligne du bas vaut <b>${ecrire(t.unitaire)}</b>. On multiplie ensuite par ce qu'on veut.`,
            `Pour remonter du bas vers le haut, on divise par ${ecrire(t.coef)}.`
        ];
        this.lienEl.innerHTML = lignes.map((l, i) =>
            `<div class="pr-lien-ligne"><span class="pr-puce">${i + 1}</span><span>${l}</span></div>`).join('');
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = ton ? `<span class="pr-bulle pr-bulle--${ton}">${html}</span>` : html;
    }

    // --- Le robot -------------------------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur?.destroy(); gate?.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!await cur.pause(600) || !this.isRunning) return fin();
        cur.say('Un tableau de proportionnalité. Il manque des cases.', this.tabEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Surtout : on ne compte pas de colonne en colonne.', this.tabEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        // Le geste central : chercher le lien avant de calculer.
        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Je cherche d\'abord le lien entre les deux lignes.', this.voirEl);
        if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
        if (!await cur.tap(this.voirEl)) return fin();
        this.basculerLien();
        if (!await cur.pause(DEMO_SPEED.press) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say(`Le coefficient est ${ecrire(this.t.coef)}. Le même partout.`, this.lienEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        // Une case remplie sous les yeux, du choix jusqu'à la validation.
        const k = 0;
        const trou = this.t.trous[k];
        const td = this.tabEl.querySelector(`[data-trou="${k}"]`);
        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Je touche la case, puis je tape.', td || this.tabEl);
        if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
        if (td && !await cur.tap(td)) return fin();
        this.actif = k;
        this.majCases();

        for (const c of ecrire(attendu(this.t, trou)).split('')) {
            const b = this.paveEl.querySelector(`[data-t="${c}"]`);
            if (b && !await cur.tap(b)) return fin();
            this.brouillon[k] += c;
            this.majCases();
        }
        const ok = this.paveEl.querySelector('[data-t="ok"]');
        if (ok && !await cur.tap(ok)) return fin();
        this.saisies[k] = attendu(this.t, trou);
        this.faits[k] = true;
        this.suivant();
        this.majCases();
        if (!await cur.pause(DEMO_SPEED.press) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('À toi. Cherche le coefficient, puis multiplie.', this.tabEl);
        if (!await cur.pause(DEMO_SPEED.between)) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        if (this.surTouche) document.removeEventListener('keydown', this.surTouche);
        super.destroy();
    }
}

export function engineProportion(container, isDemo, params) {
    const jeu = new Proportion(container, isDemo, params);
    jeu.start();
    return jeu;
}
