// ACTIVITÉ « LE VOCABULAIRE DU CERCLE » — deux façons de répondre.
//
// Rémy, banc d'essai : « on peut aussi envisager de cliquer sur le bon élément
// et aussi de taper la réponse ».
//
// Ce ne sont pas deux habillages du même exercice, ce sont deux marches, et
// l'écart entre elles est ce qu'on apprend :
//
//   CHOISIR   parmi cinq mots, ou parmi les tracés nommés. Il suffit de
//             reconnaître le bon. On peut éliminer, revenir, tenter.
//   RÉPONDRE  seul. Et la façon de le faire dépend de ce qu'on demande —
//             c'est là qu'est toute l'idée :
//               · « Que représente le segment [OA] ? » se répond en ÉCRIVANT
//                 le mot. Reconnaître « un rayon » dans une liste n'est pas
//                 le produire, et c'est le mot qu'on veut installer.
//               · « Lequel est un rayon ? » se répond en CLIQUANT le tracé.
//                 Le nommer dans une liste laisse encore le choix entre trois
//                 étiquettes ; le désigner sur la figure demande de l'avoir
//                 vraiment trouvé.
//
// LA RÉPONSE EST LA MÊME, D'OÙ QU'ELLE VIENNE. Un élève qui a choisi « un
// rayon », un autre qui l'a écrit, un troisième qui a cliqué le bon trait ont
// tous les trois raison, et le journal enregistre la même chose pour les
// trois : sans quoi le carnet d'erreurs compterait trois compétences là où il
// n'y en a qu'une.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { tracesDe, cercleSvg } from '../cercleFigure.js';
// La comparaison des mots vit avec le VOCABULAIRE, pas avec l'écran : c'est une
// règle sur les mots du cercle, et elle se teste sans navigateur.
import { memeMot } from '../generators/cercleVocabulaire.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';

/** Les deux marches, et le préréglage qui les enchaîne. */
export const MARCHES = ['choisir', 'seul'];

/**
 * À la question n sur N, quelle marche ?
 *
 * Le premier tiers avec les propositions, le reste sans. Sur une série de six
 * questions cela fait deux puis quatre : le temps d'installer les mots, puis
 * on les redemande pour de bon. Commencer sans propositions fermerait la porte
 * à l'élève qui découvre le chapitre — il ne peut pas écrire un mot qu'il n'a
 * pas encore lu.
 */
export function marcheDe(mode, rang, total) {
    if (MARCHES.includes(mode)) return mode;
    const n = Math.max(1, total || 10);
    return (rang || 0) / n < 1 / 3 ? 'choisir' : 'seul';
}

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let cursor = null;
    let gate = null;

    let item = null;
    let marche = 'choisir';

    const mode = (opts.mode && MARCHES.includes(opts.mode)) ? opts.mode
        : ((session.params && session.params.reponse) || 'progressive');

    function renderNext() {
        if (destroyed) return;
        item = session.next();
        marche = marcheDe(mode, session.answered || 0, session.nbItems || opts.total || 10);
        render();
    }

    /** « Trouver le tracé » se clique ; « nommer le tracé » s'écrit. */
    function commentRepondre() {
        if (marche === 'choisir') return 'choisir';
        return (item.meta && item.meta.sens === 'trouver') ? 'cliquer' : 'ecrire';
    }

    function render() {
        const m = item.meta;
        const faire = commentRepondre();
        // PLUS GRANDE QUAND ON LA TOUCHE. Huit tracés dans un carré de 260 px
        // laissent moins d'un centimètre entre deux traits voisins : au doigt,
        // on désigne alors le voisin sans l'avoir voulu.
        const svg = cercleSvg(tracesDe(m.spec),
            { taille: faire === 'cliquer' ? 320 : 260, cliquables: faire === 'cliquer' });

        container.innerHTML = `
            <div class="game-question">${echapper(item.prompt.text)}</div>
            <div class="figure-wrap${faire === 'cliquer' ? ' figure-wrap--interactive' : ''} cv-plateau">${svg}</div>
            ${zoneDeReponse(faire)}
            ${hintBar(session)}`;

        if (session.isDemo) {
            if (!session.frozen) runDemo(faire).catch(() => { /* démonstration coupée */ });
            return;
        }
        wireHint(container, session);
        brancher(faire);
    }

    function zoneDeReponse(faire) {
        if (faire === 'choisir') {
            return `<div class="cv-choix">${(item.choices || []).map((c, i) =>
                `<button type="button" class="prio-btn cv-btn" data-i="${i}">${echapper(c.label)}</button>`
            ).join('')}</div>`;
        }
        if (faire === 'cliquer') {
            return '<p class="cv-consigne">Clique sur le bon tracé, directement sur la figure.</p>';
        }
        // PAS D'EXEMPLE DANS LE CHAMP. « un rayon » en filigrane est la réponse
        // d'une question sur deux : on donnerait le mot à celui qui doit le
        // produire, et l'on induirait en erreur celui qui regarde un diamètre.
        return `<div class="cv-ecriture">
            <label class="cv-label" for="cv-champ">Écris le mot qui nomme ce tracé :</label>
            <input id="cv-champ" class="cv-champ" type="text" inputmode="text"
                   autocomplete="off" spellcheck="false" placeholder="…">
            <button type="button" class="kk-btn-valider" data-valider>Valider</button>
        </div>
        <p class="cv-statut" role="status"></p>`;
    }

    function brancher(faire) {
        if (faire === 'choisir') {
            container.querySelectorAll('[data-i]').forEach(btn => {
                btn.onclick = () => {
                    const c = item.choices[Number(btn.dataset.i)];
                    if (c) conclure(c.value, btn);
                };
            });
            return;
        }
        if (faire === 'cliquer') {
            container.querySelectorAll('.cv-hit').forEach(cible => {
                const jouer = () => conclure(valeurDuTrace(Number(cible.dataset.el)), cible);
                cible.addEventListener('click', jouer);
                cible.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jouer(); }
                });
            });
            return;
        }
        const champ = container.querySelector('#cv-champ');
        const valider = () => repondreParEcriture(champ.value);
        champ.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); valider(); } };
        container.querySelector('[data-valider]').onclick = valider;
        champ.focus({ preventScroll: true });
    }

    /**
     * LE TRACÉ CLIQUÉ, DIT COMME L'ITEM LE DIT. L'item attend « [OA] » ; le
     * calque de capture, lui, ne connaît que le rang de l'élément dans la
     * figure. C'est `meta.ecrits` qui fait le pont — et s'il manque, on rend
     * le rang, qui ne vaudra jamais la réponse : mieux vaut une réponse fausse
     * qu'une réponse juste par accident.
     */
    function valeurDuTrace(el) {
        const ecrits = (item.meta && item.meta.ecrits) || null;
        return (ecrits && ecrits[el] !== undefined) ? ecrits[el] : `tracé ${el}`;
    }

    function repondreParEcriture(texte) {
        if (session.locked || destroyed) return;
        if (!texte.trim()) { statut('Écris le mot qui nomme ce tracé.'); return; }
        // ON REND LA RÉPONSE ATTENDUE QUAND C'EST LE MÊME MOT. La session
        // compare des chaînes ; c'est ici que « rayon » et « un rayon » se
        // rejoignent, et nulle part ailleurs — le journal doit enregistrer la
        // même réponse pour les deux.
        conclure(memeMot(texte, item.answer) ? item.answer : texte.trim(), null);
    }

    function conclure(valeur, element) {
        if (session.locked || destroyed) return;
        const result = session.submit(valeur, { element: element || null });
        if (result.ignored) return;

        if (element) element.classList.add(result.correct ? 'cv-juste' : 'cv-faux');
        statut('');

        result.dismissed.then(() => {
            if (destroyed) return;
            if (result.correct) { renderNext(); return; }
            if (result.revealed) { montrerLeBon(); regTimeout(renderNext, 2600); }
            else {
                const champ = container.querySelector('#cv-champ');
                if (champ) { champ.value = ''; champ.focus({ preventScroll: true }); }
            }
        });
    }

    /** Après un échec : on montre le tracé qu'il fallait, ou le mot. */
    function montrerLeBon() {
        const faire = commentRepondre();
        if (faire === 'cliquer' && item.meta && item.meta.bon) {
            const cible = container.querySelector(`.cv-hit[data-el="${item.meta.bon - 1}"]`);
            if (cible) cible.classList.add('cv-bon');
            return;
        }
        statut(`C'était ${item.answer}.`);
    }

    function statut(texte) {
        const el = container.querySelector('.cv-statut');
        if (el) el.textContent = texte;
    }

    // --- La démonstration du robot -------------------------------------------

    async function runDemo(faire) {
        if (!cursor) cursor = createDemoCursor();
        if (!gate) gate = createDemoGate(container);
        const plateau = container.querySelector('.cv-plateau') || container;
        if (!await gate.waitTurn() || destroyed) return;
        if (!await cursor.pause(600) || destroyed) return;

        // LE ROBOT NE VA PAS DROIT À LA RÉPONSE : il dit d'abord les deux
        // questions qui la donnent — d'où part le tracé, et est-il droit ou
        // courbe. Voir la main désigner le bon trait n'apprend pas à le
        // reconnaître ; entendre la règle, si.
        cursor.say('Je regarde OÙ commence et où finit le tracé : au centre ? sur le cercle ?',
            plateau);
        if (!await cursor.pause(DEMO_SPEED.settle) || destroyed) return;

        if (!await gate.waitTurn() || destroyed) return;
        cursor.say('Puis s\'il est DROIT ou COURBE — c\'est ce qui sépare la corde de l\'arc.',
            plateau);
        if (!await cursor.pause(DEMO_SPEED.settle) || destroyed) return;

        if (!await gate.waitTurn() || destroyed) return;
        const cible = faire === 'cliquer'
            ? container.querySelector(`.cv-hit[data-el="${(item.meta.bon || 1) - 1}"]`)
            : (faire === 'ecrire' ? container.querySelector('#cv-champ')
                : container.querySelector('.cv-btn'));
        if (cible && await cursor.tap(cible)) cible.classList.add('cv-juste');
        // En écriture, le robot ÉCRIT : montrer le champ vide et dire la
        // réponse à côté laisserait croire qu'il n'y a rien à taper.
        if (faire === 'ecrire' && cible) cible.value = item.answer;
        cursor.say(item.explanation || `C'est ${item.answer}.`, cible || plateau);
        if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;
        renderNext();
    }

    renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            if (cursor) { cursor.destroy(); cursor = null; }
            if (gate) { gate.destroy(); gate = null; }
            container.innerHTML = '';
            session.finish();
        }
    };
}

const echapper = (s) => String(s == null ? '' : s)
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
