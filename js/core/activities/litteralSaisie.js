// ÉCRIRE UNE EXPRESSION RÉDUITE — le clavier avec les boutons carré et cube.
//
// Rémy : « mets des boutons carrés voire cube ».
//
// UN CLAVIER, PAS UN QCM, ET C'EST TOUT L'EXERCICE. Reconnaître « 3x² − 10x »
// parmi quatre lignes ne prouve pas qu'on sache l'écrire — or c'est écrire
// qu'on demandera au contrôle, et c'est en écrivant qu'on bute sur les vraies
// questions : où va le signe ? le nombre avant ou après la lettre ? l'exposant
// bouge-t-il quand on additionne ?
//
// UN CLAVIER DÉDIÉ, PAS LE CLAVIER DU SYSTÈME. Sur une tablette, ² et ³
// n'existent tout simplement pas ; sur un ordinateur, ils demandent une
// combinaison que personne ne connaît. Un exercice sur les puissances où l'on
// ne peut pas taper une puissance n'est pas un exercice, c'est une devinette
// sur l'écriture de substitution. Les touches sont donc là, grandes, à côté du
// champ.
//
// LE CLAVIER PHYSIQUE MARCHE AUSSI, et il accepte `x^2` comme `x2` : voir
// `normaliser` dans core/reductionPuissances.js. Un élève qui tape ce qu'il a
// sous les doigts ne doit pas être corrigé sur son clavier.
//
// LE BOUTON x³ N'APPARAÎT QUE QUAND LA QUESTION PEUT EN VOULOIR UN. Offrir une
// touche dont on sait qu'elle donnera une réponse fausse, c'est tendre un
// piège avec l'outil qu'on prête — et l'élève apprend alors à se méfier de
// l'interface plutôt qu'à réfléchir.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';
import { memeReponse, normaliser } from '../reductionPuissances.js';

const echapper = (t) => String(t).replace(/[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let saisie = '';
    let avis = opts.avis || '';
    let cursor = null;
    let gate = null;

    function renderNext() {
        if (destroyed) return;
        const item = session.next();
        if (opts.rendreLaMain && opts.rendreLaMain(item)) return;
        render(item);
    }

    function render(item) {
        const m = item.meta || {};
        const lettre = m.lettre || 'x';
        const degreMax = m.degreMax || 2;
        saisie = '';

        // LES TOUCHES, RANGÉES COMME ON ÉCRIT. La lettre et ses puissances
        // d'abord — c'est ce qui distingue cet exercice —, puis les signes,
        // puis les chiffres. Un pavé numérique en tête aurait fait croire à un
        // calcul.
        const touches = [
            { t: lettre, cls: 'ls-t--lettre' },
            { t: `${lettre}²`, cls: 'ls-t--lettre', dit: 'Le carré' },
            ...(degreMax >= 3 ? [{ t: `${lettre}³`, cls: 'ls-t--lettre', dit: 'Le cube' }] : []),
            { t: '+', cls: 'ls-t--signe' },
            { t: '−', cls: 'ls-t--signe', dit: 'Moins' },
            ...'0123456789'.split('').map(c => ({ t: c, cls: 'ls-t--chiffre' }))
        ];

        const touche = (o) => `<button type="button" class="ls-t ${o.cls}" data-t="${echapper(o.t)}"
            ${o.dit ? `title="${echapper(o.dit)}"` : ''}>${echapper(o.t)}</button>`;

        container.innerHTML = `
            <div class="ls-layout">
                <div class="ls-contexte">
                    ${avis ? `<div class="ls-avis">${avis}</div>` : ''}
                    ${item.prompt.html}
                </div>
                <div class="ls-panel">
                    <div class="ls-champ" aria-live="polite" data-champ>
                        <span class="ls-texte" data-texte></span><span class="ls-curseur"></span>
                    </div>
                    <div class="ls-clavier">${touches.map(touche).join('')}</div>
                    <div class="ls-actions">
                        <button type="button" class="ls-eff" data-eff aria-label="Effacer le dernier signe">⌫</button>
                        <button type="button" class="ls-valider" data-valider disabled>Valider</button>
                    </div>
                    <div class="ls-note" data-note></div>
                    ${hintBar(session)}
                </div>
            </div>`;

        avis = '';
        const champ = container.querySelector('[data-champ]');
        const texteEl = container.querySelector('[data-texte]');
        const btnValider = container.querySelector('[data-valider]');
        const noteEl = container.querySelector('[data-note]');

        const redessiner = () => {
            texteEl.textContent = saisie;
            champ.classList.remove('ls-champ--ok', 'ls-champ--ko');
            champ.classList.toggle('ls-champ--vide', saisie === '');
            noteEl.textContent = '';
            btnValider.disabled = saisie.trim() === '';
        };
        const taper = (t) => { saisie += t; redessiner(); };
        const effacer = () => {
            // ON EFFACE LE SIGNE, PAS LE CARACTÈRE. « x² » se tape d'une
            // touche : l'effacer en deux coups — d'abord le ², puis le x —
            // serait défaire un geste qu'on n'a pas fait.
            saisie = saisie.replace(/(\s*[+−]\s*|[a-zA-Z][⁰¹²³⁴⁵⁶⁷⁸⁹]?|.)$/u, '');
            redessiner();
        };
        redessiner();

        if (session.isDemo) {
            if (!session.frozen) runDemo(item, taper, champ);
            return;
        }

        wireHint(container, session);

        const valider = () => {
            if (destroyed || !saisie.trim()) return;
            const juste = memeReponse(saisie, item.answer);
            // ON SOUMET LA FORME NORMALISÉE quand elle est juste : le journal
            // et le carnet d'erreurs n'ont pas à conserver quinze écritures du
            // même résultat selon que l'élève a mis des espaces ou non.
            const result = session.submit(juste ? String(item.answer) : saisie, { element: champ });
            if (result.ignored) return;

            champ.classList.toggle('ls-champ--ok', result.correct);
            champ.classList.toggle('ls-champ--ko', !result.correct);
            noteEl.textContent = result.correct ? '' : diagnostiquer(saisie, item);

            result.dismissed.then(() => {
                if (destroyed) return;
                if (result.correct) return renderNext();
                if (result.revealed) {
                    saisie = String(item.answer);
                    texteEl.textContent = saisie;
                    champ.classList.remove('ls-champ--ko');
                    champ.classList.add('ls-champ--ok');
                    regTimeout(renderNext, 1800);
                } else {
                    // ON NE VIDE PAS LE CHAMP. L'élève a souvent écrit la
                    // moitié juste ; tout effacer l'oblige à retaper ce qu'il
                    // avait bon, et c'est là qu'il finit par se tromper deux
                    // fois. Il corrige ce qu'il veut avec la touche ⌫.
                    champ.classList.remove('ls-champ--ko');
                }
            });
        };

        container.querySelectorAll('[data-t]').forEach(b => {
            b.onclick = () => { if (!session.locked) taper(b.dataset.t); };
        });
        container.querySelector('[data-eff]').onclick = () => { if (!session.locked) effacer(); };
        btnValider.onclick = valider;

        container.tabIndex = -1;
        container.focus({ preventScroll: true });
        container.onkeydown = (e) => {
            if (session.locked) return;
            if (e.key === 'Enter') { valider(); e.preventDefault(); return; }
            if (e.key === 'Backspace') { effacer(); e.preventDefault(); return; }
            // Le clavier physique accepte tout ce que `normaliser` sait relire :
            // chiffres, lettres, `^`, et le trait d'union comme signe moins.
            if (/^[0-9a-zA-Z+^]$/.test(e.key)) { taper(e.key); e.preventDefault(); }
            else if (e.key === '-') { taper('−'); e.preventDefault(); }
        };
    }

    /**
     * NOMMER L'ERREUR, PAS LA CONSTATER.
     *
     * « Faux » n'apprend rien. Les deux fautes du chapitre voyagent dans
     * l'item (`meta.pieges`) avec leur explication : si l'élève est tombé dans
     * l'une d'elles, on lui dit LAQUELLE. Sinon, on lui rappelle la règle du
     * tri par sacs, qui est la seule règle qu'il y ait.
     */
    function diagnostiquer(donne, item) {
        const pieges = (item.meta && item.meta.pieges) || [];
        const n = normaliser(donne);
        const touche = pieges.find(p => normaliser(p.value) === n);
        if (touche) return touche.why;
        if (normaliser(item.prompt.text.split(':').pop()) === n) {
            return 'C\'est l\'expression de départ, recopiée : il reste quelque chose à regrouper.';
        }
        return 'Range chaque terme dans son sac, puis additionne les nombres de devant — '
            + 'l\'exposant, lui, ne bouge pas.';
    }

    /** La démonstration : le robot trie à voix haute avant d'écrire. */
    async function runDemo(item, taper, champ) {
        if (!cursor) cursor = createDemoCursor();
        if (!gate) gate = createDemoGate(container);
        if (!await gate.waitTurn() || destroyed) return;
        if (!await cursor.pause(600) || destroyed) return;

        const contexte = container.querySelector('.ls-contexte');
        cursor.say('Je range d\'abord chaque terme dans son sac : les carrés avec les carrés, '
            + 'les lettres simples ensemble, les nombres ensemble.', contexte || container);
        if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;

        if (!await gate.waitTurn() || destroyed) return;
        cursor.say('Dans un sac, j\'additionne les nombres de devant. L\'exposant, lui, ne '
            + 'bouge jamais.', container.querySelector('.ls-clavier') || container);
        if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;

        // ON TAPE LA RÉPONSE SIGNE PAR SIGNE, en visant les vraies touches :
        // c'est le geste que l'élève devra refaire, et le voir fait vaut mieux
        // que le voir apparaître.
        for (const c of String(item.answer)) {
            if (destroyed) return;
            const btn = container.querySelector(`[data-t="${CSS.escape(c)}"]`);
            if (btn) { if (!await cursor.tap(btn)) return; }
            taper(c);
            if (!await cursor.pause(DEMO_SPEED.settle / 2) || destroyed) return;
        }

        if (!await gate.waitTurn() || destroyed) return;
        champ.classList.add('ls-champ--ok');
        cursor.say(item.explanation || '', champ);
        if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;
    }

    if (opts.item) render(opts.item); else renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            if (cursor) { cursor.destroy(); cursor = null; }
            if (gate) { gate.destroy(); gate = null; }
            container.onkeydown = null;
            container.innerHTML = '';
        }
    };
}
