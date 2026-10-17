// L'ÉCRAN DES DINGBATS — une scène, un champ, et rien d'autre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'aimerais bien un jeu de dingbats ».
//
// ── CE QUE CET ÉCRAN NE FAIT PAS, ET POURQUOI ──────────────────────────────
//
// PAS DE QCM. Quatre propositions tueraient le jeu : on reconnaît la bonne sans
// avoir lu la disposition, et l'on n'apprend rien. Un dingbat se RÉSOUT ou ne se
// résout pas ; l'élève écrit ce qu'il lit.
//
// PAS DE PAVÉ DE TOUCHES. On répond en français : c'est le clavier du système
// qu'il faut, celui que l'élève sait déjà employer. `meta.saisieSeule` le dit
// (voir `core/aide.js`), et aucun escalier d'aide ne descend vers un QCM.
//
// LE JUGE EST GÉNÉREUX SUR LA FORME ET STRICT SUR LE FOND. `core/dingbat.js`
// enlève les accents, les articles et les pluriels : « racine carree » passe,
// « la racine carrée » aussi. Mais « droites perpendiculaires » ne passe pas
// pour « droites parallèles », et c'est exactement ce que le jeu enseigne.
//
// ── LA SCÈNE EST DU HTML, PAS UNE IMAGE ────────────────────────────────────
//
// Elle vient de `dessiner()`, qui rend une CHAÎNE : le même dessin s'éprouve
// sous Node, se lit par un lecteur d'écran, et suit le thème du poste. Cent
// images auraient été cent fichiers à refaire le jour où une couleur change.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { createDemoCursor, createDemoGate } from '../demoPointer.js';
import { meneurDemo } from '../meneurDemo.js';
import { eteindreSansPerdreLeFoyer } from '../foyerDeLaSaisie.js';

const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let cursor = null;
    let item = null;
    let repondu = false;

    function renderNext() {
        if (destroyed) return;
        item = session.next();
        if (!item) return;
        repondu = false;
        render();
    }

    function render() {
        const m = item.meta || {};
        container.innerHTML = `
            <div class="dingbat-layout">
                <div class="dg-consigne">${item.prompt.html || esc(item.prompt.text)}</div>
                <div class="dg-cadre">${m.dessin || ''}</div>
                <div class="dg-reponse">
                    <label class="dg-label" for="dg-champ">Ta réponse</label>
                    <input id="dg-champ" class="dg-champ" type="text" autocomplete="off"
                           autocapitalize="off" spellcheck="false"
                           placeholder="écris ce que tu lis…"
                           aria-label="Ce que tu lis dans le dessin">
                    <button type="button" class="dg-valider" data-valider disabled>Valider</button>
                </div>
                <p class="dg-note" role="status"></p>
                ${hintBar(session)}
            </div>`;

        if (session.frozen) return;
        if (session.isDemo) { runDemo(); return; }

        brancher();
        wireHint(container, session);
    }

    const champEl = () => container.querySelector('#dg-champ');
    const btnEl = () => container.querySelector('[data-valider]');
    const noteEl = () => container.querySelector('.dg-note');

    function brancher() {
        const champ = champEl();
        const btn = btnEl();
        if (!champ || !btn) return;

        const majBouton = () => {
            // LE BOUTON S'ÉTEINT SANS EMPORTER LE FOYER — voir
            // `core/foyerDeLaSaisie.js`. Ici le foyer est sur le CHAMP, pas sur
            // le conteneur, donc le défaut du Jardin et d'« Enlever les
            // parenthèses » ne peut pas se produire ; on passe par la règle
            // commune quand même, pour que ce ne soit pas à relire au cas par
            // cas le jour où cet écran changera.
            eteindreSansPerdreLeFoyer(btn, !champ.value.trim(), champ, session.locked);
        };
        champ.addEventListener('input', () => {
            majBouton();
            const n = noteEl();
            if (n) n.textContent = '';
            champ.classList.remove('dg-champ--ko');
        });
        champ.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); valider(); }
        });
        btn.onclick = valider;
        majBouton();
        champ.focus({ preventScroll: true });
    }

    function valider() {
        if (destroyed || repondu || session.locked) return;
        const champ = champEl();
        const saisie = champ ? champ.value.trim() : '';
        if (!saisie) return;

        const verdict = item.verifieTexte ? item.verifieTexte(saisie) : null;
        const bon = !!(verdict && verdict.juste);

        const result = session.submit(bon ? String(item.answer) : saisie, { element: champ });
        if (result.ignored) return;
        repondu = true;

        if (champ) champ.classList.toggle('dg-champ--ko', !result.correct);

        // ON NE DONNE PAS LA RÉPONSE TANT QU'IL LUI RESTE UN ESSAI — la règle
        // de `core/itemSession.js`. `result.done` dit que les essais sont
        // épuisés ; avant cela, on efface et l'on relance.
        result.dismissed.then(() => {
            if (destroyed) return;
            if (result.correct) {
                montrerLesAutresEcritures();
                regTimeout(renderNext, 1400);
                return;
            }
            if (result.done || result.revealed) {
                montrerLaReponse();
                regTimeout(renderNext, 2600);
                return;
            }
            // Il lui reste un essai : on efface ce qui était faux plutôt que de
            // le laisser corriger une lettre dans une réponse entièrement à
            // côté — ce n'est pas une expression à retoucher, c'est une autre
            // lecture à trouver.
            repondu = false;
            if (champ) {
                champ.value = '';
                champ.classList.remove('dg-champ--ko');
                champ.focus({ preventScroll: true });
            }
            const btn = btnEl();
            if (btn) eteindreSansPerdreLeFoyer(btn, true, champ, session.locked);
            const n = noteEl();
            if (n) n.textContent = 'Ce n\'est pas cela. Regarde encore la DISPOSITION des mots.';
        });
    }

    /**
     * APRÈS UNE BONNE RÉPONSE, ON MONTRE LES AUTRES ÉCRITURES ACCEPTÉES.
     *
     * L'élève qui a écrit « proba » a eu juste — et il doit apprendre que cela
     * s'écrit « probabilité ». Un jeu de vocabulaire qui accepte sans jamais
     * montrer la forme complète enseigne l'à-peu-près.
     */
    function montrerLesAutresEcritures() {
        const n = noteEl();
        const m = item.meta || {};
        if (!n || !m.dingbat) return;
        n.textContent = `On écrit : ${m.dingbat.reponse}.`;
    }

    function montrerLaReponse() {
        const n = noteEl();
        const m = item.meta || {};
        if (!n || !m.dingbat) return;
        const champ = champEl();
        if (champ) {
            champ.value = m.dingbat.reponse;
            champ.classList.remove('dg-champ--ko');
            champ.classList.add('dg-champ--donnee');
        }
        n.textContent = m.dingbat.explication || '';
    }

    // --- La démonstration -----------------------------------------------------
    //
    // ELLE MONTRE LE RAISONNEMENT, PAS LA RÉPONSE. Le pointeur désigne d'abord
    // le MOT, puis ce qui l'entoure — c'est l'ordre dans lequel on résout un
    // dingbat, et c'est la seule chose qu'une démonstration puisse enseigner ici.

    async function runDemo() {
        const m = item.meta || {};
        if (!m.dingbat) return;
        if (!cursor) cursor = createDemoCursor();
        const gate = createDemoGate(container.querySelector('.dingbat-layout') || container);
        const vivant = () => !destroyed;
        const robot = meneurDemo(cursor, gate, vivant, null, { garderPointeur: true });
        const fin = () => robot.fin();

        const scene = container.querySelector('.dg-cadre');
        const champ = champEl();

        if (!await robot.attendre(500)) return fin();
        if (!await robot.dire('Un dingbat ne se lit pas : il se REGARDE.', scene)) return fin();
        if (!await robot.toucher(scene, 700)) return fin();
        if (!await robot.dire('D\'abord le mot. Ensuite, la façon dont il est posé.', scene)) return fin();
        if (!await robot.attendre(900)) return fin();
        if (!await robot.dire(m.dingbat.aide || 'Regarde la disposition.', scene)) return fin();
        if (!await robot.attendre(1100)) return fin();
        if (champ) {
            if (!await robot.toucher(champ, 600)) return fin();
            champ.value = m.dingbat.reponse;
        }
        if (!await robot.dire(`Et l'on écrit : ${m.dingbat.reponse}.`, champ || scene)) return fin();
        if (!await robot.attendre(1200)) return fin();
        fin();
    }

    // DEUX QUESTIONS SONT « LA MÊME » QUAND C'EST LE MÊME DINGBAT. Sans cela, le
    // tirage au sort en répète sur une série longue — le défaut que Rémy avait
    // signalé sur la Table de Pythagore, et que `session.clefDeQuestion` a été
    // écrite pour fermer.
    if (session.clefDeQuestion) {
        session.clefDeQuestion(it => (it.meta && it.meta.dingbat ? it.meta.dingbat.id : ''));
    }

    renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },

        /** Le corrigé, pour celui qui met au point — voir `#db-solution`. */
        montrerSolution() {
            if (!item || !item.meta || !item.meta.dingbat) return false;
            montrerLaReponse();
            return true;
        },

        destroy() {
            destroyed = true;
            if (cursor) { cursor.destroy(); cursor = null; }
            container.innerHTML = '';
            session.finish();
        }
    };
}
