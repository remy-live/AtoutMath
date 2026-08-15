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
// ON ÉCRIT COMME AU TABLEAU, ET C'EST TOUT L'INTÉRÊT :
//
//     2 × 3 + 9        ← on souligne « 2 × 3 » d'UN SEUL TRAIT
//     ___ + 9          ← on passe À LA LIGNE, on recopie le reste, on remplit
//     15
//
// Le trait est continu sous les trois jetons : souligner « 2 », « × » et « 3 »
// séparément donne trois tirets, et trois tirets ne désignent pas un calcul.
// Et le résultat ne se met JAMAIS au bout de la ligne du dessus derrière un
// « = » : ce n'est pas la ligne du dessus qui vaut 6, c'est le morceau souligné.
//
// LES LIGNES PRÉCÉDENTES RESTENT À L'ÉCRAN, en gris. On voit ce qu'on a
// recopié, et l'erreur de recopie — celle qui coûte le plus de points en
// contrôle — devient visible au lieu de se cacher dans une tête.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    tirerExpression, operationPrioritaire, critiquer, reduire, reduirePourEcrire,
    ecrire, terminee
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
                .pr-ligne {
                    display: flex; align-items: flex-end; gap: .3em; flex-wrap: wrap;
                    min-height: 1.5em;
                }
                /* Les lignes déjà faites s'effacent sans disparaître. */
                .pr-ligne--passee { opacity: .42; font-size: .78em; }

                .pr-jeton {
                    padding: 2px 6px; border-radius: 8px; line-height: 1.1;
                    border: 2px solid transparent;
                }
                .pr-jeton--op {
                    cursor: pointer; background: var(--bg-hover); color: var(--primary);
                    border-color: var(--border); transition: .12s;
                }
                .pr-jeton--op:hover { background: var(--primary); color: #fff; }

                /* L'OPÉRATION SOULIGNÉE : UN SEUL TRAIT sous les trois jetons.
                   C'est pour cela qu'ils sont enveloppés ensemble — souligner
                   chacun de son côté donnait trois tirets séparés, et trois
                   tirets ne montrent aucun calcul. */
                .pr-souligne {
                    display: inline-flex; align-items: center; gap: .3em;
                    padding: 0 .1em 3px;
                    border-bottom: 4px solid var(--primary);
                    background: color-mix(in srgb, var(--primary) 14%, transparent);
                    border-radius: 6px 6px 0 0;
                }
                /* Un opérateur ne ressemble à un bouton que TANT QU'IL EN EST
                   UN. Dans le trait, et sur les lignes déjà écrites, il n'y a
                   plus rien à cliquer : c'est de l'écriture, pas un choix. */
                .pr-souligne .pr-jeton,
                .pr-ligne--passee .pr-jeton--op {
                    background: transparent; border-color: transparent;
                    cursor: default; color: inherit;
                }
                .pr-jeton--faux { animation: pr-non .34s ease; }
                @keyframes pr-non { 25% { translate: -6px 0; } 75% { translate: 6px 0; } }

                .pr-trou {
                    width: 2.8em; text-align: center; font: inherit; font-weight: 800;
                    border: none; border-bottom: 3px solid var(--primary);
                    background: color-mix(in srgb, var(--primary) 10%, transparent);
                    color: var(--text-main); padding: 2px; border-radius: 6px 6px 0 0;
                }
                .pr-trou:focus { outline: 2px solid var(--primary); outline-offset: 2px; }

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
        // Chaque ligne écrite, avec l'endroit où elle est soulignée.
        this.lignes = [{ jetons: e.jetons, souligne: null }];
        this.choisi = null;              // l'index de l'opération soulignée
        // La ligne en train de s'écrire : le reste recopié, et un trou.
        this.brouillon = null;
        this.note('Clique sur l\'opération qu\'il faut faire EN PREMIER.');
        this.dessiner();
        return true;
    }

    /** L'état courant : les jetons de la dernière ligne écrite. */
    get courant() { return this.lignes[this.lignes.length - 1].jetons; }

    dessiner() {
        this.cascadeEl.innerHTML = '';
        const dernier = this.lignes.length - 1;
        this.lignes.forEach((l, i) => {
            this.cascadeEl.appendChild(this.ligneHtml(l, {
                passee: i < dernier,
                // On ne clique que sur la dernière ligne, et seulement tant
                // qu'aucune opération n'est encore soulignée.
                cliquable: i === dernier && !this.brouillon
            }));
        });
        if (this.brouillon) this.cascadeEl.appendChild(this.ligneHtml(this.brouillon, {}));
        if (this.scoreEl) {
            this.scoreEl.textContent = `${this.reussies} calcul${this.reussies > 1 ? 's' : ''} mené${this.reussies > 1 ? 's' : ''} au bout`;
        }
        const trou = this.cascadeEl.querySelector('.pr-trou');
        if (trou) trou.focus();
    }

    /**
     * Une ligne de la cascade.
     * @param {{jetons:Object[], souligne:?number}} l
     */
    ligneHtml(l, { passee, cliquable }) {
        const ligne = document.createElement('div');
        ligne.className = 'pr-ligne' + (passee ? ' pr-ligne--passee' : '');

        let k = 0;
        while (k < l.jetons.length) {
            // LES TROIS JETONS SOULIGNÉS TIENNENT DANS UNE SEULE ENVELOPPE :
            // c'est elle qui porte le trait, et il est donc continu.
            if (l.souligne != null && k === l.souligne - 1) {
                const bloc = document.createElement('span');
                bloc.className = 'pr-souligne';
                for (let m = k; m <= l.souligne + 1 && m < l.jetons.length; m++) {
                    bloc.appendChild(this.jetonHtml(l.jetons[m], m, false));
                }
                ligne.appendChild(bloc);
                k = l.souligne + 2;
                continue;
            }
            ligne.appendChild(this.jetonHtml(l.jetons[k], k, cliquable));
            k++;
        }
        return ligne;
    }

    /** Un jeton : un nombre, un opérateur cliquable, ou LE TROU à remplir. */
    jetonHtml(j, k, cliquable) {
        if (j.trou) return this.trouHtml();
        const el = document.createElement('span');
        el.className = 'pr-jeton' + (j.type === 'op' ? ' pr-jeton--op' : '');
        el.textContent = ecrire([j]);
        if (cliquable && j.type === 'op') {
            el.addEventListener('click', () => this.choisir(k, el));
        }
        return el;
    }

    trouHtml() {
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
        return trou;
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
        const ligne = this.lignes[this.lignes.length - 1];
        ligne.souligne = index;
        const p = operationPrioritaire(ligne.jetons);
        // ON PASSE À LA LIGNE : le reste est recopié tel quel, et le résultat
        // ira dans le trou, à la place exacte du calcul souligné.
        this.brouillon = reduirePourEcrire(ligne.jetons, index);
        this.brouillon.souligne = null;
        this.note(`${p.raison} Écris sur la ligne du dessous combien fait `
            + `${p.gauche} ${ecrire([{ type: 'op', op: p.op }])} ${p.droite}.`);
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
        const signe = ecrire([{ type: 'op', op: p.op }]);
        // DANS LE TROU, ON ÉCRIT UN NOMBRE — pas un calcul. Sans ce contrôle,
        // « 2+9 » passait pour une réponse et le reproche devenait absurde :
        // « 8 − 6 ne fait pas 2+9 ».
        if (!/^\d+(\.\d+)?$/.test(brut)) {
            this.note(`Dans le trou, on écrit le RÉSULTAT de ${p.gauche} ${signe} ${p.droite} `
                + '— un seul nombre, pas un calcul.', 'ko');
            trou.value = '';
            trou.focus();
            return false;
        }
        if (Number(brut) !== p.valeur) {
            this.note(`${p.gauche} ${signe} ${p.droite} ne fait pas ${brut.replace('.', ',')}. Recompte.`, 'ko');
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
        this.lignes.push({ jetons: suivant, souligne: null });
        this.brouillon = null;
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
        this.note('Bien. La ligne est recopiée — quelle opération maintenant ?');
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
            await gate.wait(2600);

            for (let tour = 0; tour < 6 && this.isRunning; tour++) {
                const p = operationPrioritaire(this.courant);
                if (!p) break;
                // La dernière ligne EST celle qu'on joue : le brouillon troué
                // n'existe pas encore, on n'a pas encore souligné.
                const ops = [...this.cascadeEl.querySelectorAll('.pr-ligne:last-child .pr-jeton')];
                const cible = ops[p.index];
                cur.say(p.raison, cible || this.cascadeEl);
                await gate.wait(2200);
                if (cible) await cur.tap(cible);
                this.choisir(p.index, cible || document.createElement('span'));
                await gate.wait(900);

                const trou = this.cascadeEl.querySelector('.pr-trou');
                cur.say(`Je souligne, je passe à la ligne, je RECOPIE le reste sans y toucher. `
                    + `Et dans le trou : ${p.gauche} ${ecrire([{ type: 'op', op: p.op }])} `
                    + `${p.droite} = ${p.valeur}.`, trou || this.cascadeEl);
                await gate.wait(2400);
                if (trou) { trou.value = String(p.valeur); this.valider(trou); }
                await gate.wait(1000);
            }
            cur.say('C\'est la recopie qui coûte des points en contrôle, pas la règle.',
                this.cascadeEl);
            await gate.wait(2600);
        } catch (e) { /* démonstration coupée */ }
        fin();
    }
}

export function enginePriorites(container, isDemo, params) {
    const jeu = new Priorites(container, isDemo, params);
    // C'EST L'USINE QUI DÉMARRE LE JEU, pas l'appelant. Le Runner appelle
    // cette fonction et garde l'instance ; il n'appelle jamais « start ». Sans
    // cette ligne, le jeu se construisait, ne dessinait rien, et l'écran
    // restait vide — sans la moindre erreur pour le dire.
    jeu.start();
    return jeu;
}
