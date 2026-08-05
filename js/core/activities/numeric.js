// Activité « saisie numérique » (pavé).
//
// Nouveau genre de réponse : l'élève produit le nombre au lieu de le
// reconnaître parmi des propositions. C'est didactiquement très différent —
// pas de reconnaissance possible, pas d'élimination — et cela ouvre les
// notions où proposer des choix serait artificiel (aire, périmètre, calcul
// posé). Aucun générateur n'a eu besoin d'être modifié pour en profiter.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';

const DIGITS = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];

const ICON_BACKSPACE = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M20 5H9l-6 7 6 7h11a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><line x1="17" y1="9" x2="11" y2="15"/><line x1="11" y1="9" x2="17" y2="15"/></svg>`;

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let buffer = '';
    let cursor = null;
    let gate = null;

    function renderNext() {
        if (destroyed) return;
        render(session.next());
    }

    function render(item) {
        const unit = item.meta && item.meta.unit ? item.meta.unit : '';
        // La virgule n'apparaît que si la réponse peut être décimale. Une
        // touche inutilisable sur un périmètre entier n'est pas neutre : elle
        // suggère qu'on attend peut-être des décimales.
        const decimal = item.meta && item.meta.decimal !== undefined
            ? item.meta.decimal
            : !Number.isInteger(Number(item.answer));

        // Deux colonnes dès qu'il y a la place : énoncé et figure à gauche,
        // saisie à droite. En une seule colonne, l'ensemble énoncé + figure +
        // pavé + validation dépassait la hauteur d'écran et imposait un
        // défilement au milieu d'une question.
        container.innerHTML = `
            <div class="numpad-layout">
                <div class="numpad-context">${item.prompt.html}</div>
                <div class="numpad-panel">
                    <div class="numpad-device">
                    <div class="numpad-screen" aria-live="polite">
                        <span class="numpad-value" data-display></span>
                        <span class="numpad-caret" data-caret></span>
                        ${unit ? `<span class="numpad-unit">${unit}</span>` : ''}
                    </div>
                    <div class="numpad" role="group" aria-label="Pavé numérique">
                        ${DIGITS.map(k => key(k)).join('')}
                        ${decimal ? key(',') : '<span class="numpad-blank" aria-hidden="true"></span>'}
                        ${key('0')}
                        <button type="button" class="numpad-key numpad-key--del" data-key="←"
                                aria-label="Effacer le dernier chiffre">${ICON_BACKSPACE}</button>
                        <button type="button" class="numpad-key numpad-key--ok" data-validate>Valider</button>
                    </div>
                    </div>
                    ${hintBar(session)}
                </div>
            </div>`;

        const display = container.querySelector('[data-display]');
        const screen = container.querySelector('.numpad-screen');
        const setBuffer = (v) => {
            buffer = v;
            display.textContent = buffer;
            screen.classList.toggle('numpad-screen--empty', buffer === '');
        };
        setBuffer('');

        if (session.isDemo) {
            if (!session.frozen) runDemo(String(item.answer), setBuffer, screen);
            return;
        }

        wireHint(container, session);

        const validate = () => {
            if (destroyed || buffer === '') return;
            const result = session.submit(buffer, { element: display });
            if (result.ignored) return;

            // L'état se joue sur l'écran entier, pas sur le seul nombre :
            // le retour est ainsi lisible d'un coup d'œil.
            screen.classList.toggle('numpad-screen--ok', result.correct);
            screen.classList.toggle('numpad-screen--ko', !result.correct);

            // La suite attend que l'élève ait fermé la correction.
            result.dismissed.then(() => {
                if (destroyed) return;

                if (result.correct) { renderNext(); return; }

                if (result.revealed) {
                    setBuffer(String(item.answer));
                    screen.classList.remove('numpad-screen--ko');
                    screen.classList.add('numpad-screen--ok');
                    regTimeout(renderNext, 1600);
                } else {
                    screen.classList.remove('numpad-screen--ko');
                    setBuffer('');
                }
            });
        };

        container.querySelectorAll('[data-key]').forEach(btn => {
            btn.onclick = () => {
                if (session.locked) return;
                const k = btn.dataset.key;
                if (k === '←') setBuffer(buffer.slice(0, -1));
                else if (k === ',') { if (!buffer.includes(',') && buffer !== '') setBuffer(buffer + ','); }
                else if (buffer.length < 7) setBuffer(buffer + k);
            };
        });
        container.querySelector('[data-validate]').onclick = validate;

        // Saisie au clavier physique : indispensable sur poste fixe.
        container.tabIndex = -1;
        container.focus({ preventScroll: true });
        container.onkeydown = (e) => {
            if (session.locked) return;
            if (/^[0-9]$/.test(e.key)) { setBuffer(buffer + e.key); e.preventDefault(); }
            else if (e.key === 'Backspace') { setBuffer(buffer.slice(0, -1)); e.preventDefault(); }
            else if (e.key === ',' || e.key === '.') { if (!buffer.includes(',')) setBuffer(buffer + ','); e.preventDefault(); }
            else if (e.key === 'Enter') { validate(); e.preventDefault(); }
        };
    }

    /**
     * Démonstration : le pointeur tape la réponse touche par touche, puis
     * valide. Le nombre qui apparaissait tout seul à l'écran ne disait pas d'où
     * il venait ; ici on voit le chemin, chiffre après chiffre.
     */
    async function runDemo(target, setBuffer, screen) {
        if (!cursor) cursor = createDemoCursor();
        if (!gate) gate = createDemoGate(container);
        if (!await gate.waitTurn() || destroyed) return;
        if (!await cursor.pause(600) || destroyed) return;

        for (let i = 0; i < target.length; i++) {
            const touche = container.querySelector(`[data-key="${cssEscape(target[i])}"]`);
            if (touche) {
                if (!await cursor.tap(touche, 420) || destroyed) return;
                touche.classList.add('numpad-key--demo');
                regTimeout(() => touche.classList.remove('numpad-key--demo'), 220);
            }
            setBuffer(target.slice(0, i + 1));
            if (!await cursor.pause(180) || destroyed) return;
        }

        const valider = container.querySelector('[data-validate]');
        if (!await cursor.tap(valider, 480) || destroyed) return;
        screen.classList.add('numpad-screen--ok');

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
            container.onkeydown = null;
            container.innerHTML = '';
            session.finish();
        }
    };
}

// La virgule est une valeur d'attribut légitime mais un sélecteur invalide.
function cssEscape(c) {
    return window.CSS && CSS.escape ? CSS.escape(c) : c.replace(/,/g, '\\,');
}

function key(k) {
    return `<button type="button" class="numpad-key" data-key="${k}">${k}</button>`;
}
