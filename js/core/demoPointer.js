// Curseur de démonstration.
//
// Une démonstration muette n'enseigne rien. Jusqu'ici, les activités se
// contentaient de marquer la bonne réponse puis d'enchaîner : sur la
// comparaison de nombres, on voyait les questions défiler sans jamais voir le
// geste — ni le signe saisi, ni le glisser-déposer qui est pourtant TOUT ce que
// l'exercice demande d'apprendre.
//
// Ce module fournit un pointeur visible, que les activités déplacent, font
// appuyer et font glisser. Ce qui compte n'est pas qu'il aille au bon endroit,
// mais qu'on ait le temps de suivre son trajet : les durées sont volontairement
// lentes, à hauteur d'un geste humain montré à un élève.
//
// Il est en `position: fixed` sur le `body` : les mêmes appels fonctionnent
// dans la vignette d'une carte, dans le simulateur du professeur et en plein
// écran, sans que l'activité ait à savoir où elle est montée.

import { regTimeout } from './timers.js';

export const DEMO_SPEED = {
    move: 750,      // trajet d'un point à un autre
    press: 260,     // enfoncement
    settle: 520,    // temps de lecture après un appui
    drag: 1050,     // un glissement se montre plus lentement qu'un déplacement
    between: 1500   // pause avant la question suivante
};

/**
 * Crée un pointeur. À détruire avec `destroy()` — ou, plus simplement, en
 * laissant `clearEngines()` faire son travail : toutes les attentes passent par
 * `regTimeout`, donc une démonstration interrompue ne laisse rien en vol.
 */
export function createDemoCursor() {
    const el = document.createElement('div');
    el.className = 'demo-cursor';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <path d="M5 2.5 L5 19 L9.2 15.2 L11.9 21.2 L14.6 20 L12 14.2 L18 14 Z"
                  fill="#111827" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round"/>
        </svg><span class="demo-cursor-halo"></span>`;
    document.body.appendChild(el);

    let destroyed = false;
    let ghost = null;
    // Les attentes en cours, pour les dénouer à la destruction : une promesse
    // jamais résolue retiendrait indéfiniment la fonction qui l'attend.
    const pending = new Set();

    function wait(ms) {
        if (destroyed) return Promise.resolve(false);
        return new Promise(resolve => {
            const done = (ok) => { pending.delete(done); resolve(ok); };
            pending.add(done);
            regTimeout(() => done(!destroyed), ms);
        });
    }

    function place(x, y, ms) {
        el.style.transitionDuration = `${ms}ms`;
        el.style.transform = `translate(${x}px, ${y}px)`;
    }

    function centerOf(target) {
        const r = target.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    return {
        get destroyed() { return destroyed; },

        /** Amène le pointeur au centre de l'élément et attend d'y être. */
        async moveTo(target, ms = DEMO_SPEED.move) {
            if (destroyed || !target) return false;
            const { x, y } = centerOf(target);
            // Premier positionnement : sans transition, sinon le pointeur
            // traverse l'écran depuis son coin d'origine.
            if (!el.dataset.placed) {
                el.dataset.placed = '1';
                place(x, y, 0);
                el.classList.add('demo-cursor--visible');
                return wait(220);
            }
            place(x, y, ms);
            return wait(ms);
        },

        /** Appui visible : halo qui se referme sur le point. */
        async press() {
            if (destroyed) return false;
            el.classList.add('demo-cursor--pressed');
            return wait(DEMO_SPEED.press);
        },

        async release() {
            if (destroyed) return false;
            el.classList.remove('demo-cursor--pressed');
            return wait(160);
        },

        /** Appui complet sur un élément : trajet, enfoncement, relâchement. */
        async tap(target, ms) {
            if (!await this.moveTo(target, ms)) return false;
            if (!await this.press()) return false;
            return this.release();
        },

        /**
         * Saisit une tuile, la fait glisser jusqu'à la cible et la dépose.
         * Le fantôme est le clone que l'élève verra sous son doigt : c'est le
         * même artifice que le glisser-déposer réel, pour que la démonstration
         * montre exactement le geste attendu.
         */
        async dragFromTo(source, target, ms = DEMO_SPEED.drag) {
            if (destroyed || !source || !target) return false;
            if (!await this.moveTo(source)) return false;
            if (!await this.press()) return false;

            const r = source.getBoundingClientRect();
            ghost = source.cloneNode(true);
            ghost.classList.add('drag-ghost', 'drag-ghost--demo');
            ghost.style.width = `${r.width}px`;
            ghost.style.height = `${r.height}px`;
            ghost.style.left = `${r.left}px`;
            ghost.style.top = `${r.top}px`;
            ghost.style.setProperty('transition-duration', `${ms}ms`, 'important');
            document.body.appendChild(ghost);
            source.classList.add('drag-source');

            // Un `reflow` sépare la pose du déplacement : sans lui, le
            // navigateur regroupe les deux et le fantôme apparaît déjà arrivé.
            void ghost.offsetWidth;

            const to = centerOf(target);
            ghost.style.left = `${to.x - r.width / 2}px`;
            ghost.style.top = `${to.y - r.height / 2}px`;
            target.classList.add('compare-slot--hover');
            place(to.x, to.y, ms);

            if (!await wait(ms + 120)) return false;

            target.classList.remove('compare-slot--hover');
            source.classList.remove('drag-source');
            if (ghost) { ghost.remove(); ghost = null; }
            await this.release();
            return !destroyed;
        },

        /** Pause de lecture, interruptible comme le reste. */
        pause(ms = DEMO_SPEED.settle) { return wait(ms); },

        destroy() {
            destroyed = true;
            pending.forEach(done => done(false));
            pending.clear();
            if (ghost) { ghost.remove(); ghost = null; }
            el.remove();
        }
    };
}
