// LES PRIORITÉS OPÉRATOIRES — à l'écran, ligne après ligne.
//
// Le noyau (core/priorites.js) sait quelle opération est prioritaire et
// pourquoi. Ici : l'expression cliquable, le soulignement, et la ligne qui
// s'écrit dessous.
//
// DEUX GESTES, ET ON NE PASSE PAS AU SECOND SANS AVOIR RÉUSSI LE PREMIER.
// L'élève clique l'opération — elle se souligne — puis il donne son résultat
// dans le trou de la ligne suivante. Fondre les deux en un seul geste ferait
// disparaître la moitié de l'exercice : on saurait qu'il s'est trompé, jamais
// sur quoi.
//
// LA LIGNE PRÉCÉDENTE RESTE À L'ÉCRAN, en gris. C'est tout l'intérêt de la
// présentation en cascade : on voit ce qu'on a recopié, et l'erreur de recopie
// — celle qui coûte le plus de points en contrôle — devient visible au lieu de
// se cacher dans une tête.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    tirerExpression, operationPrioritaire, critiquer, reduire, ecrire, terminee
} from '../core/priorites.js';

const COMPETENCE = 'num.prio';

class Priorites extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'priorites');
        this.rng = makeRng(this.params.seed);
        this.niveau = Math.max(1, Math.min(4, parseInt(this.params.niveau) || 2));
        this.avecParentheses = this.params.parentheses !== false;
        this.reussies = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .pr-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 10px;
                    width: 100%; height: 100%; padding: 10px; box-sizing: border-box;
                    color: var(--text-main); container-type: inline-size; overflow-y: auto;
                }
                .pr-tete {
                    display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
                    justify-content: center; font-size: .9rem;
                }
                .pr-score { font-weight: 800; }
                .pr-btn {
                    border: 1px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); border-radius: 9px; cursor: pointer;
                    font: inherit; font-weight: 600; font-size: 13px; padding: 5px 11px;
                }
                .pr-btn:hover { background: var(--bg-hover); }

                /* LA CASCADE. Chaque ligne sous la précédente, alignée à
                   gauche : c'est la présentation du cahier, et elle rend la
                   recopie vérifiable d'un coup d'œil. */
                .pr-cascade {
                    display: flex; flex-direction: column; gap: 6px;
                    align-items: flex-start; width: 100%; max-width: 560px;
                    font-size: clamp(20px, 6cqw, 34px); font-weight: 700;
                    font-variant-numeric: tabular-nums; padding: 6px 2px;
                }
                .pr-ligne { display: flex; align-items: center; gap: .3em; flex-wrap: wrap; }
                /* Les lignes déjà faites s'effacent sans disparaître. */
                .pr-ligne--passee { opacity: .42; font-size: .78em; }

                .pr-jeton {
                    padding: 2px 6px; border-radius: 8px; line-height: 1.1;
                    border: 2px solid transparent;
                }
                .pr-jeton--op {
                    cursor: pointer; background: var(--bg-hover);
                    border-color: var(--border); transition: .12s;
                }
                .pr-jeton--op:hover { background: var(--primary); color: #fff; }
                /* L'OPÉRATION SOULIGNÉE : le trait sous les trois jetons, comme
                   au tableau. On souligne le calcul entier, pas le seul signe —
                   c'est « 4 × 5 » qu'on va faire, pas « × ». */
                .pr-souligne {
                    border-bottom: 4px solid var(--primary);
                    border-radius: 0; background: color-mix(in srgb, var(--primary) 16%, transparent);
                }
                .pr-jeton--faux { animation: pr-non .34s ease; }
                @keyframes pr-non { 25% { translate: -6px 0; } 75% { translate: 6px 0; } }

                .pr-egal { opacity: .6; }
                .pr-trou {
                    width: 2.6em; text-align: center; font: inherit; font-weight: 800;
                    border: none; border-bottom: 3px dashed var(--primary);
                    background: transparent; color: var(--text-main); padding: 0 2px;
                }
                .pr-trou:focus { outline: none; border-bottom-style: solid; }

                .pr-note {
                    min-height: 2.6em; text-align: center; line-height: 1.35;
                    font-size: clamp(13px, 3cqw, 15px); color: var(--text-muted);
                    max-width: 560px;
                }
                .pr-note--ok { color: var(--success); font-weight: 700; }
                .pr-note--ko { color: var(--danger); font-weight: 700; }
            </style>
            <div class="pr-wrap">
                <div class="pr-tete">
                    <span class="pr-score" data-score></span>
                    <button type="button" class="pr-btn" data-indice>💡 Pourquoi ?</button>
                    <button type="button" class="pr-btn" data-neuf>↺ Autre calcul</button>
                </div>
                <div class="pr-cascade" data-cascade></div>
                <p class="pr-note" data-note></p>
            </div>`;

        this.cascadeEl = this.container.querySelector('[data-cascade]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.scoreEl = this.container.querySelector('[data-score]');
        this.container.querySelector('[data-neuf]').addEventListener('click', () => this.poser());
        this.container.querySelector('[data-indice]').addEventListener('click', () => this.expliquer());
        this.poser();
    }

    startGameLoop() { /* Pas d'horloge : on réfléchit à son rythme. */ }

    poser() {
        const e = tirerExpression({
            rng: this.rng, niveau: this.niveau, parentheses: this.avecParentheses
        });
        this.expression = e;
        this.lignes = [e.jetons];        // ce que l'élève a écrit jusqu'ici
        this.choisi = null;              // l'index de l'opération soulignée
        this.note('Clique sur l\'opération qu\'il faut faire EN PREMIER.');
        this.dessiner();
        return true;
    }

    /** L'état courant : la dernière ligne écrite. */
    get courant() { return this.lignes[this.lignes.length - 1]; }

    dessiner() {
        this.cascadeEl.innerHTML = '';
        this.lignes.forEach((jetons, i) => {
            const derniere = i === this.lignes.length - 1;
            this.cascadeEl.appendChild(this.ligneHtml(jetons, derniere));
        });
        if (this.scoreEl) {
            this.scoreEl.textContent = `${this.reussies} calcul${this.reussies > 1 ? 's' : ''} mené${this.reussies > 1 ? 's' : ''} au bout`;
        }
        const trou = this.cascadeEl.querySelector('.pr-trou');
        if (trou) trou.focus();
    }

    ligneHtml(jetons, active) {
        const ligne = document.createElement('div');
        ligne.className = 'pr-ligne' + (active ? '' : ' pr-ligne--passee');

        // Les trois jetons de l'opération choisie sont soulignés ensemble.
        const dansLeChoix = (k) => this.choisi !== null
            && (k === this.choisi - 1 || k === this.choisi || k === this.choisi + 1);

        jetons.forEach((j, k) => {
            const el = document.createElement('span');
            el.className = 'pr-jeton'
                + (j.type === 'op' ? ' pr-jeton--op' : '')
                + (active && dansLeChoix(k) ? ' pr-souligne' : '');
            el.textContent = ecrire([j]);
            if (active && j.type === 'op' && this.choisi === null) {
                el.addEventListener('click', () => this.choisir(k, el));
            }
            ligne.appendChild(el);
        });

        // Une fois l'opération choisie, la ligne porte son « = » et son trou.
        if (active && this.choisi !== null && !terminee(jetons)) {
            const egal = document.createElement('span');
            egal.className = 'pr-egal';
            egal.textContent = '=';
            ligne.appendChild(egal);
            const trou = document.createElement('input');
            trou.className = 'pr-trou';
            trou.type = 'text';
            trou.inputMode = 'numeric';
            trou.setAttribute('aria-label', 'résultat de l\'opération soulignée');
            // « Entrée » valide, puis le champ disparaît au redessin — ce qui
            // déclenche « blur », donc un second envoi. Ici il tombe dans le
            // vide (l'opération choisie est retombée à null), mais par chance
            // seulement : le verrou le dit au lieu d'en dépendre.
            // Le verrou se pose AVANT l'appel : valider redessine, ce qui
            // retire le champ, ce qui déclenche « blur » — le second envoi
            // partirait pendant que l'affectation attend son retour.
            let rendu = false;
            const valider = () => {
                if (rendu || !trou.value.trim()) return;
                rendu = true;
                if (!this.valider(trou)) rendu = false;
            };
            trou.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') valider(); });
            trou.addEventListener('blur', valider);
            ligne.appendChild(trou);
        }
        return ligne;
    }

    /** L'élève désigne une opération. */
    choisir(index, el) {
        const critique = critiquer(this.courant, index);
        if (critique) {
            el.classList.add('pr-jeton--faux');
            setTimeout(() => el.classList.remove('pr-jeton--faux'), 360);
            this.note(critique, 'ko');
            // Se tromper d'opération est une VRAIE erreur : elle compte, et
            // c'est celle qu'on veut voir dans le carnet.
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: `Quelle opération d'abord dans ${ecrire(this.courant)} ?`,
                input: ecrire([this.courant[index]]),
                expected: ecrire([this.courant[operationPrioritaire(this.courant).index]]),
                customMessage: critique
            });
            return;
        }
        this.choisi = index;
        const p = operationPrioritaire(this.courant);
        this.note(`${p.raison} Maintenant, combien fait ${p.gauche} ${ecrire([{ type: 'op', op: p.op }])} ${p.droite} ?`);
        this.dessiner();
    }

    /**
     * L'élève donne le résultat de l'opération soulignée.
     * @returns {boolean} vrai si la ligne est passée — c'est le verrou du champ.
     */
    valider(trou) {
        if (this.choisi === null) return false;
        const brut = trou.value.trim().replace(',', '.');
        if (!brut) return false;
        const p = operationPrioritaire(this.courant);
        if (Number(brut) !== p.valeur) {
            this.note(`${p.gauche} ${ecrire([{ type: 'op', op: p.op }])} ${p.droite} ne fait pas ${brut}. Recompte.`, 'ko');
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: `${p.gauche} ${p.op} ${p.droite}`,
                input: brut, expected: String(p.valeur),
                customMessage: 'L\'opération choisie était la bonne : c\'est le calcul qu\'il faut refaire.'
            });
            trou.value = '';
            trou.focus();
            return false;
        }

        const suivant = reduire(this.courant, this.choisi, p.valeur);
        this.lignes.push(suivant);
        this.choisi = null;

        if (terminee(suivant)) {
            this.reussies++;
            this.note(`✅ ${this.expression.texte} = ${suivant[0].valeur}. `
                + `${this.expression.etapes} étapes, aucune recopie ratée.`, 'ok');
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: this.expression.texte,
                expected: String(this.expression.resultat),
                given: String(suivant[0].valeur),
                points: 6 + this.expression.etapes * 3
            });
            this.dessiner();
            setTimeout(() => { if (this.isRunning) this.poser(); }, 1900);
            return true;
        }
        this.note('Bien. Recopie faite — quelle opération maintenant ?');
        this.dessiner();
        return true;
    }

    expliquer() {
        const p = operationPrioritaire(this.courant);
        if (!p) return this.note('Il n\'y a plus rien à calculer.');
        if (this.choisi === null) {
            this.note(`${p.raison} Cherche-la dans « ${ecrire(this.courant)} ».`);
        } else {
            this.note(`Il faut calculer ${p.gauche} ${ecrire([{ type: 'op', op: p.op }])} ${p.droite}, `
                + 'puis RECOPIER tout le reste sans y toucher.');
        }
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'pr-note' + (ton ? ` pr-note--${ton}` : '');
    }

    showNext() { return this.poser(); }

    // --- La démonstration -------------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };
        try {
            cur.protegerZone(this.cascadeEl);
            await gate.wait(500);
            cur.say(`Voilà « ${this.expression.texte} ». On ne calcule PAS de gauche à droite.`,
                this.cascadeEl);
            await gate.wait(2600 * DEMO_SPEED);

            for (let tour = 0; tour < 6 && this.isRunning; tour++) {
                const p = operationPrioritaire(this.courant);
                if (!p) break;
                const ops = [...this.cascadeEl.querySelectorAll('.pr-ligne:last-child .pr-jeton')];
                const cible = ops[p.index];
                cur.say(p.raison, cible || this.cascadeEl);
                await gate.wait(2200 * DEMO_SPEED);
                if (cible) await cur.tap(cible);
                this.choisir(p.index, cible || document.createElement('span'));
                await gate.wait(900 * DEMO_SPEED);

                const trou = this.cascadeEl.querySelector('.pr-trou');
                cur.say(`${p.gauche} ${ecrire([{ type: 'op', op: p.op }])} ${p.droite} = ${p.valeur}. `
                    + 'Et je RECOPIE tout le reste sans y toucher.', trou || this.cascadeEl);
                await gate.wait(2400 * DEMO_SPEED);
                if (trou) { trou.value = String(p.valeur); this.valider(trou); }
                await gate.wait(1000 * DEMO_SPEED);
            }
            cur.say('C\'est la recopie qui coûte des points en contrôle, pas la règle.',
                this.cascadeEl);
            await gate.wait(2600 * DEMO_SPEED);
        } catch (e) { /* démonstration coupée */ }
        fin();
    }
}

export function enginePriorites(container, isDemo, params) {
    return new Priorites(container, isDemo, params);
}
