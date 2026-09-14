// L'ENQUÊTE — à l'écran.
//
// Le noyau (core/enquete.js) fabrique la scène, garantit qu'elle a UNE seule
// solution, et sait dire quelle est la déduction suivante. Ici on dessine le
// plan, on écoute les clics, et on tient la conversation.
//
// LE GESTE EST CELUI DU PLATEAU DE JEU : on prend un personnage, on le pose sur
// une case. On le reprend en cliquant dessus. Rien à taper, rien à faire
// glisser — au doigt sur une tablette comme à la souris.
//
// DEUX TEMPS, ET LE SECOND N'EST PAS DE LA DÉCORATION. On place d'abord tout le
// monde ; on répond ensuite à la question. Placer, c'est déduire ; répondre,
// c'est LIRE LE PLAN — reconnaître dans quel lieu tombe une case. Beaucoup
// d'élèves savent faire le premier et butent sur le second, et l'on ne s'en
// apercevrait pas si la grille juste valait réponse juste.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    genererEnquete, SCENES, phrasesDesIndices, laQuestion,
    verifierSaisie, prochaineDeduction, lieuDe
} from '../core/enquete.js';

const COMPETENCE = 'num.logique.enquete';

/** Une couleur par lieu — douce, lisible, et distincte en noir et blanc. */
const TEINTES = ['#e0e7ff', '#fef3c7', '#dcfce7', '#fae8ff', '#ffe4e6', '#cffafe'];

class Enquete extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'enquete');
        this.rng = makeRng(this.params.seed);
        this.niveau = Number(this.params.niveau) || 1;
        this.reussis = 0;
        this.aidesUtilisees = 0;
    }

    /** La scène du niveau demandé. */
    scenePourLeNiveau() {
        const i = Math.min(SCENES.length - 1, Math.max(0, this.niveau - 1));
        return SCENES[i];
    }

    render() {
        this.container.innerHTML = `
            <style>
                .eq-wrap {
                    display: flex; flex-direction: column; gap: 10px; width: 100%; height: 100%;
                    padding: 10px; box-sizing: border-box; color: var(--text-main);
                    overflow-y: auto; container-type: inline-size;
                }
                .eq-histoire {
                    font-size: .95rem; line-height: 1.45; max-width: 780px; margin: 0 auto;
                    text-align: center;
                }
                .eq-histoire b { color: var(--accent, #4f46e5); }
                .eq-corps {
                    display: flex; gap: 16px; flex-wrap: wrap;
                    align-items: flex-start; justify-content: center;
                }
                .eq-plan { display: grid; gap: 2px; flex: none; }
                .eq-tete {
                    display: flex; align-items: center; justify-content: center;
                    font-size: .78rem; font-weight: 800; color: var(--text-muted);
                }
                .eq-legende {
                    font-size: .72rem; color: var(--text-muted); text-align: center;
                    margin-top: 6px; max-width: 380px;
                }
                .eq-cadre-objet {
                    display: inline-block; width: .8em; height: .8em; vertical-align: -1px;
                    border: 3px solid #f59e0b; border-radius: 3px;
                }
                .eq-case {
                    width: clamp(46px, 15cqw, 78px); aspect-ratio: 1;
                    border-radius: 6px; position: relative; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    border: 2px solid transparent; transition: border-color .12s;
                }
                .eq-case:hover { border-color: var(--accent, #4f46e5); }
                .eq-case--objet { box-shadow: inset 0 0 0 3px #f59e0b; }
                .eq-lieu-nom {
                    position: absolute; top: 2px; left: 4px; font-size: .63rem;
                    color: #334155; opacity: .9; pointer-events: none; font-weight: 700;
                }
                .eq-repere {
                    position: absolute; bottom: 2px; right: 4px; font-size: .56rem;
                    color: #334155; opacity: .8; pointer-events: none; text-align: right;
                    max-width: 90%;
                }
                .eq-pion {
                    background: #1e293b; color: #fff; border-radius: 999px;
                    padding: 3px 9px; font-weight: 700; font-size: .78rem; white-space: nowrap;
                }
                .eq-case--faute .eq-pion { background: #dc2626; }
                .eq-cote { flex: 1 1 300px; min-width: 260px; max-width: 460px; }
                .eq-titre-liste {
                    font-weight: 800; font-size: .82rem; letter-spacing: .04em;
                    text-transform: uppercase; color: var(--text-muted); margin: 0 0 6px;
                }
                .eq-indices { margin: 0 0 12px; padding-left: 1.3em; font-size: .92rem; line-height: 1.5; }
                .eq-indices li { margin-bottom: 3px; }
                .eq-indices li.eq-vise {
                    background: #fef08a; border-radius: 4px; padding: 1px 4px; margin-left: -4px;
                }
                .eq-pions { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
                .eq-chip {
                    border: 2px solid #cbd5e1; background: var(--surface, #fff); color: var(--text-main);
                    border-radius: 999px; padding: 5px 13px; font: inherit; font-weight: 700;
                    font-size: .85rem; cursor: pointer;
                }
                .eq-chip--pris { opacity: .38; }
                .eq-chip--choisi { border-color: var(--accent, #4f46e5); background: #eef2ff; color: #312e81; }
                .eq-boutons { display: flex; flex-wrap: wrap; gap: 8px; }
                .eq-bouton {
                    border: none; border-radius: 8px; padding: 8px 15px; font: inherit;
                    font-weight: 700; cursor: pointer; background: #e2e8f0; color: #0f172a;
                }
                .eq-bouton--fort { background: var(--accent, #4f46e5); color: #fff; }
                .eq-note { min-height: 2.6em; font-size: .92rem; line-height: 1.4; margin-top: 8px; }
                .eq-note--ok { color: #15803d; font-weight: 700; }
                .eq-note--ko { color: #b45309; }
                .eq-question {
                    margin-top: 10px; padding: 10px 12px; border-radius: 10px;
                    background: #fffbeb; border: 2px solid #fbbf24; font-size: .95rem;
                }
                .eq-rose { text-align: center; font-size: .7rem; color: var(--text-muted); }
                @container (max-width: 620px) { .eq-corps { flex-direction: column; align-items: center; } }
            </style>
            <div class="eq-wrap">
                <div class="eq-histoire" data-histoire></div>
                <div class="eq-rose">N ↑ &nbsp;·&nbsp; S ↓ &nbsp;·&nbsp; O ← &nbsp;·&nbsp; E →</div>
                <div class="eq-corps">
                    <div>
                        <div class="eq-plan" data-plan></div>
                        <p class="eq-legende" data-legende></p>
                    </div>
                    <div class="eq-cote">
                        <p class="eq-titre-liste">Les indices</p>
                        <ol class="eq-indices" data-indices></ol>
                        <p class="eq-titre-liste">Qui était là</p>
                        <div class="eq-pions" data-pions></div>
                        <div class="eq-boutons">
                            <button type="button" class="eq-bouton eq-bouton--fort" data-verifier>Vérifier</button>
                            <button type="button" class="eq-bouton" data-aide>Un indice de plus</button>
                            <button type="button" class="eq-bouton" data-effacer>Tout enlever</button>
                            <button type="button" class="eq-bouton" data-neuf>↺ Autre enquête</button>
                        </div>
                        <div class="eq-note" data-note></div>
                        <div data-final></div>
                    </div>
                </div>
            </div>`;

        this.planEl = this.container.querySelector('[data-plan]');
        this.legendeEl = this.container.querySelector('[data-legende]');
        this.indicesEl = this.container.querySelector('[data-indices]');
        this.pionsEl = this.container.querySelector('[data-pions]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.finalEl = this.container.querySelector('[data-final]');
        this.histoireEl = this.container.querySelector('[data-histoire]');

        this.container.querySelector('[data-verifier]').onclick = () => this.verifier();
        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.container.querySelector('[data-effacer]').onclick = () => this.effacer();
        this.container.querySelector('[data-neuf]').onclick = () => this.poser();

        this.poser();
    }

    startGameLoop() { /* rien à animer : l'enquête attend l'élève */ }

    // ─────────────────────────────────────────────────────── une enquête ────

    poser() {
        this.enquete = genererEnquete({ scene: this.scenePourLeNiveau(), rng: this.rng });
        this.saisie = this.enquete.noms.map(() => null);
        this.choisi = null;
        this.vise = -1;
        this.gagne = false;
        this.finalEl.innerHTML = '';
        this.note('');
        this.dessiner();
    }

    effacer() {
        if (this.gagne) return;
        this.saisie = this.enquete.noms.map(() => null);
        this.choisi = null;
        this.finalEl.innerHTML = '';
        this.note('');
        this.dessiner();
    }

    note(texte, ton = '') {
        this.noteEl.className = 'eq-note' + (ton ? ' eq-note--' + ton : '');
        this.noteEl.textContent = texte;
    }

    /** Le personnage posé sur cette case, ou -1. */
    quiEstEn(r, c) {
        return this.saisie.findIndex(s => s && s.r === r && s.c === c);
    }

    dessiner() {
        const e = this.enquete;
        const n = e.scene.taille;
        const lettres = Object.keys(e.scene.lieux);

        this.histoireEl.innerHTML = laQuestion(e).replace(
            e.scene.lieux[e.lieuDeLObjet],
            `<b>${e.scene.lieux[e.lieuDeLObjet]}</b>`);

        // LES NUMÉROS DE RANGÉE ET DE COLONNE SONT AFFICHÉS, et ce n'est pas de
        // la décoration. La règle du jeu parle de rangées et de colonnes ; le
        // message d'erreur aussi (« deux personnes sont dans la même
        // rangée »). Sans les numéros, l'élève doit compter du regard pour
        // vérifier ce qu'on lui reproche — et se replaçer dans un quadrillage
        // est précisément une des choses qu'il vient apprendre ici.
        this.planEl.style.gridTemplateColumns = `auto repeat(${n}, auto)`;
        this.planEl.innerHTML = '';
        const coin = document.createElement('div');
        coin.className = 'eq-tete';
        this.planEl.appendChild(coin);
        for (let c = 0; c < n; c++) {
            const t = document.createElement('div');
            t.className = 'eq-tete';
            t.textContent = String(c + 1);
            this.planEl.appendChild(t);
        }
        for (let r = 0; r < n; r++) {
            const t = document.createElement('div');
            t.className = 'eq-tete';
            t.style.paddingRight = '4px';
            t.textContent = String(r + 1);
            this.planEl.appendChild(t);
            for (let c = 0; c < n; c++) {
                const L = lieuDe(e.scene, { r, c });
                const d = document.createElement('div');
                d.className = 'eq-case';
                d.style.background = TEINTES[lettres.indexOf(L) % TEINTES.length];
                d.dataset.r = r; d.dataset.c = c;
                // LE NOM DU LIEU SUR CHAQUE CASE, et non une seule fois au
                // milieu de la zone. Un élève qui cherche « est-ce que cette
                // case-là est dans le couloir ? » ne doit pas avoir à suivre
                // des yeux une frontière de couleur : la case le dit.
                const voisinGauche = c > 0 && lieuDe(e.scene, { r, c: c - 1 }) === L;
                const voisinHaut = r > 0 && lieuDe(e.scene, { r: r - 1, c }) === L;
                if (!voisinGauche && !voisinHaut) {
                    const nom = document.createElement('span');
                    nom.className = 'eq-lieu-nom';
                    nom.textContent = e.scene.lieux[L];
                    d.appendChild(nom);
                }
                const rep = e.scene.reperes.find(x => x.case[0] === r && x.case[1] === c);
                if (rep) {
                    const s = document.createElement('span');
                    s.className = 'eq-repere';
                    s.textContent = '📌 ' + rep.nom;
                    d.appendChild(s);
                }
                if (L === e.lieuDeLObjet) d.classList.add('eq-case--objet');
                const qui = this.quiEstEn(r, c);
                if (qui >= 0) {
                    const p = document.createElement('span');
                    p.className = 'eq-pion';
                    p.textContent = e.noms[qui];
                    d.appendChild(p);
                }
                d.onclick = () => this.cliquerCase(r, c);
                this.planEl.appendChild(d);
            }
        }

        this.legendeEl.innerHTML = `<span class="eq-cadre-objet"></span> `
            + `le cadre orange marque ${e.scene.lieux[e.lieuDeLObjet]}, o\u00f9 l'on a retrouv\u00e9 `
            + `${e.objet}.`;

        this.indicesEl.innerHTML = phrasesDesIndices(e)
            .map((p, i) => `<li${i === this.vise ? ' class="eq-vise"' : ''}>${p}</li>`).join('');

        this.pionsEl.innerHTML = '';
        e.noms.forEach((nom, k) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'eq-chip'
                + (this.saisie[k] ? ' eq-chip--pris' : '')
                + (this.choisi === k ? ' eq-chip--choisi' : '');
            b.textContent = nom;
            b.onclick = () => { this.choisi = this.choisi === k ? null : k; this.dessiner(); };
            this.pionsEl.appendChild(b);
        });
    }

    cliquerCase(r, c) {
        if (this.gagne || this.isDemo) return;
        const occupant = this.quiEstEn(r, c);
        if (this.choisi === null) {
            // Rien en main : on reprend ce qui est là.
            if (occupant >= 0) { this.saisie[occupant] = null; this.dessiner(); }
            return;
        }
        // Quelqu'un en main : il se pose, et déloge l'occupant s'il y en a un.
        if (occupant >= 0) this.saisie[occupant] = null;
        this.saisie[this.choisi] = { r, c };
        this.choisi = null;
        this.vise = -1;
        this.dessiner();
    }

    // ───────────────────────────────────────────────────────── corriger ────

    verifier() {
        if (this.isDemo || this.gagne) return;
        const e = this.enquete;
        const v = verifierSaisie(e, this.saisie);
        this.planEl.querySelectorAll('.eq-case--faute')
            .forEach(x => x.classList.remove('eq-case--faute'));

        if (v.reglesCassees.length) {
            this.note('❌ ' + v.reglesCassees[0]
                + ' La règle est : un seul personnage par rangée, un seul par colonne.', 'ko');
            return;
        }
        if (!v.complet) {
            const reste = this.saisie.filter(s => !s).length;
            this.note(`Il reste ${reste} personne${reste > 1 ? 's' : ''} à placer.`, 'ko');
            return;
        }
        if (!v.juste) {
            v.fautes.forEach(k => {
                const c = this.saisie[k];
                this.planEl.querySelector(`.eq-case[data-r="${c.r}"][data-c="${c.c}"]`)
                    ?.classList.add('eq-case--faute');
            });
            // ON NE DIT PAS COMBIEN SONT FAUSSES, ET C'EST DÉLIBÉRÉ.
            //
            // Le compte se retourne contre l'exercice : il s'essaie. On déplace
            // un pion, on revalide, le compte baisse — et l'on a résolu la
            // grille au chaud, sans lire un seul indice. On renvoie donc à
            // l'indice contredit, c'est-à-dire au raisonnement.
            const d = prochaineDeduction(e, this.saisie);
            this.note('❌ Ce placement contredit au moins un indice. ' + d.texte, 'ko');
            this.vise = Number.isInteger(d.indice) ? d.indice : -1;
            this.dessiner();
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: `Enquête — ${e.scene.titre}`,
                input: 'placement contredit', expected: 'tous les indices respectés',
                customMessage: 'Un indice au moins n\'est pas respecté.',
                silencieux: true
            });
            return;
        }

        this.note('✅ Tout le monde est à sa place, et aucun indice n\'est contredit.', 'ok');
        this.demanderLeCoupable();
    }

    /**
     * LE SECOND TEMPS : LIRE LE PLAN.
     *
     * La grille est juste ; reste à dire QUI. C'est une lecture de carte — dans
     * quel lieu tombe cette case ? — et c'est une compétence à part entière,
     * que l'on raterait complètement si la grille juste valait réponse juste.
     */
    demanderLeCoupable() {
        const e = this.enquete;
        this.finalEl.innerHTML = `
            <div class="eq-question">
                <p style="margin:0 0 8px">On a retrouvé <b>${e.objet}</b> dans
                   <b>${e.scene.lieux[e.lieuDeLObjet]}</b>. Qui était seul là-bas&nbsp;?</p>
                <div class="eq-pions" data-reponses></div>
            </div>`;
        const zone = this.finalEl.querySelector('[data-reponses]');
        e.noms.forEach((nom, k) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'eq-chip';
            b.textContent = nom;
            b.onclick = () => this.repondre(k);
            zone.appendChild(b);
        });
    }

    repondre(k) {
        if (this.gagne) return;
        const e = this.enquete;
        if (k !== e.coupable) {
            this.note(`❌ Regarde où ${e.noms[k]} se trouve : ce n'est pas `
                + `${e.scene.lieux[e.lieuDeLObjet]}.`, 'ko');
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: laQuestion(e),
                input: e.noms[k], expected: e.noms[e.coupable],
                customMessage: 'Le lieu de la case ne correspond pas.',
                silencieux: true
            });
            return;
        }
        this.gagne = true;
        this.reussis++;
        this.note(`✅ C'est ${e.noms[k]} — la seule personne dans `
            + `${e.scene.lieux[e.lieuDeLObjet]}. Enquête bouclée.`, 'ok');
        this.finalEl.innerHTML = '';
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: laQuestion(e),
            expected: e.noms[e.coupable], given: e.noms[k],
            points: 10 + e.scene.taille * 4
        });
        setTimeout(() => { if (this.isRunning) this.poser(); }, 2200);
    }

    /**
     * L'AIDE DONNE LA DÉDUCTION SUIVANTE, PAS LA RÉPONSE.
     *
     * Le noyau cherche le plus PETIT paquet d'indices qui suffise à placer
     * quelqu'un, et l'aide se contente de le nommer et de le surligner. L'élève
     * garde le raisonnement ; on ne lui rend que le fil qu'il avait perdu.
     */
    aider() {
        if (this.isDemo || this.gagne) return;
        this.aidesUtilisees++;
        const d = prochaineDeduction(this.enquete, this.saisie);
        this.note('💡 ' + d.texte);
        this.vise = Number.isInteger(d.indice) && d.indice >= 0 ? d.indice : -1;
        this.dessiner();
    }

    // ─────────────────────────────────────────────────────── le robot ──────

    async runDemoSequence() {
        const cur = createDemoCursor();
        const gate = createDemoGate();
        this.demoCursor = cur;
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };
        const e = this.enquete;

        cur.say('Un objet a disparu. Chacun était quelque part — un seul par rangée, '
            + 'un seul par colonne.', this.histoireEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        cur.say('Les indices sont tous VRAIS, et ensemble ils ne laissent qu\'une seule '
            + 'disposition possible. On ne devine jamais : on élimine.', this.indicesEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        for (let tour = 0; tour < e.noms.length; tour++) {
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const d = prochaineDeduction(e, this.saisie);
            if (d.degre !== 'force') break;
            this.vise = Number.isInteger(d.indice) ? d.indice : -1;
            this.dessiner();
            cur.say(d.texte, this.indicesEl);
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
            const cell = e.solution[d.personnage];
            const el = this.planEl.querySelector(`.eq-case[data-r="${cell.r}"][data-c="${cell.c}"]`);
            if (el && !await cur.tap(el)) return fin();
            this.saisie[d.personnage] = { r: cell.r, c: cell.c };
            this.dessiner();
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say(`Tout le monde est placé. Reste à lire le plan : qui est dans `
            + `${e.scene.lieux[e.lieuDeLObjet]} ? C'est ${e.noms[e.coupable]}.`, this.planEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineEnquete(container, isDemo, params) {
    const jeu = new Enquete(container, isDemo, params);
    jeu.start();
    return jeu;
}
