// Activité « chasse aux taupes ».
//
// Même mécanique arcade qu'avant, mais le contenu vient d'un générateur : les
// taupes portent la bonne réponse ou l'un des distracteurs typés de l'item.
// Conséquence directe : ce jeu, écrit à l'origine pour les additions et les
// tables, sait désormais faire travailler les fractions ou les aires sans
// qu'une ligne n'y soit ajoutée.

import { regTimeout } from '../timers.js';
import { createDemoCursor, DEMO_SPEED } from '../demoPointer.js';

const HOLES = 9;

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let activeIndex = -1;
    let item = null;
    let cursor = null;

    container.innerHTML = `
        <div class="moles-wrap">
            <div class="moles-question" data-question></div>
            <div class="moles-grid" role="group" aria-label="Grille de taupes">
                ${Array.from({ length: HOLES }, (_, i) => `
                    <button type="button" class="mole-hole" data-hole="${i}" aria-label="Trou ${i + 1}">
                        <span class="mole" data-mole></span>
                    </button>`).join('')}
            </div>
        </div>`;

    const questionEl = container.querySelector('[data-question]');
    const holes = [...container.querySelectorAll('.mole-hole')];

    function nextItem() {
        if (destroyed) return;
        item = session.next();
        questionEl.innerHTML = item.prompt.html;
        pop();
    }

    function wrongValue() {
        const wrong = (item.choices || []).filter(c => !c.correct);
        return wrong.length ? wrong[Math.floor(Math.random() * wrong.length)] : null;
    }

    function pop() {
        if (destroyed) return;
        if (activeIndex !== -1) hide(holes[activeIndex]);

        activeIndex = Math.floor(Math.random() * HOLES);
        const hole = holes[activeIndex];
        const mole = hole.querySelector('[data-mole]');

        const showCorrect = Math.random() > 0.5;
        const choice = showCorrect ? { value: item.answer, label: item.answer } : wrongValue();
        if (!choice) return; // item sans distracteur : rien à afficher

        mole.dataset.val = choice.value;
        mole.innerHTML = String(choice.label);
        mole.classList.add('mole--up');
        mole.classList.remove('mole--ok', 'mole--ko');

        if (session.isDemo) {
            if (session.frozen) return;
            if (showCorrect) runDemo(hole);
            else regTimeout(pop, 1400);
            return;
        }
        regTimeout(pop, 1100 + Math.random() * 900);
    }

    function hide(hole) {
        const mole = hole.querySelector('[data-mole]');
        mole.classList.remove('mole--up');
    }

    // Démonstration : la bonne taupe n'est pas « cliquée » dans l'ombre, elle
    // est visiblement visée puis frappée — sans quoi on voit juste des nombres
    // apparaître et disparaître sans comprendre ce qui compte.
    async function runDemo(hole) {
        if (!cursor) cursor = createDemoCursor();
        if (!await cursor.tap(hole) || destroyed) return;
        if (!await cursor.pause(DEMO_SPEED.settle) || destroyed) return;
        nextItem();
    }

    holes.forEach((hole, idx) => {
        hole.onclick = () => {
            if (destroyed || idx !== activeIndex) return;
            const mole = hole.querySelector('[data-mole]');
            if (!mole.classList.contains('mole--up')) return;

            if (session.isDemo) { nextItem(); return; }

            const result = session.submit(mole.dataset.val, { element: hole });
            if (result.ignored) return;

            mole.classList.add(result.correct ? 'mole--ok' : 'mole--ko');
            // Même en arcade, la correction se ferme à la main : l'élève ne
            // doit pas rater l'explication parce qu'une taupe est ressortie.
            result.dismissed.then(() => {
                if (!destroyed) regTimeout(nextItem, result.correct ? 400 : 200);
            });
        };
    });

    nextItem();

    return {
        showNext: nextItem,
        showPrevious() { if (session.rewind()) nextItem(); },
        destroy() {
            destroyed = true;
            if (cursor) { cursor.destroy(); cursor = null; }
            container.innerHTML = '';
            session.finish();
        }
    };
}
