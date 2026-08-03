// Activité « choix multiples ».
//
// Une seule implémentation pour tous les jeux à propositions cliquables :
// bulles, digicode, boutons, table de Pythagore. La variante ne change que
// l'habillage (classes CSS et contexte affiché autour de la question), jamais
// la logique — essais, aides, correction et traçabilité viennent de
// l'ItemSession.
//
// Cette activité accepte n'importe quel générateur produisant des items
// 'choice' : additions, tables, fractions, décimaux, périmètres… Aucune
// connaissance des notions ici.

import { regTimeout } from '../timers.js';
import { createDemoCursor } from '../demoPointer.js';
import { creerNarrateur } from '../demoNarration.js';
import { demoChoix } from '../demoScript.js';

const VARIANTS = {
    bubbles: { itemClass: 'bubble', containerClass: 'bubble-container' },
    digicode: { itemClass: 'missing-cell', containerClass: 'missing-grid' },
    buttons: { itemClass: 'prio-btn', containerClass: '' },
    // Comparaison : des pastilles rondes géantes donnaient à « < = > » le poids
    // visuel d'une réponse chiffrée. Des tuiles compactes alignées se lisent
    // comme la ligne d'égalité qu'on cherche à compléter.
    signs: { itemClass: 'sign-tile', containerClass: 'sign-row' },
    coords: { itemClass: 'coord-tile', containerClass: 'coord-row' }
};

const DELAYS = { success: 1200, reveal: 1500, pause: 1500 };

export function mount(container, session, opts = {}) {
    const variant = VARIANTS[opts.variant] || VARIANTS.bubbles;
    let destroyed = false;
    // Un seul pointeur pour toute la démonstration : recréé à chaque question,
    // il repartirait du coin de l'écran à chaque fois. Même chose pour la
    // bulle de parole.
    let cursor = null;
    let narrateur = null;

    function renderNext() {
        if (destroyed) return;
        const item = session.next();
        render(item);
    }

    function render(item) {
        const choices = item.choices || [];
        // « 100 000 » ne tient pas dans une bulle prévue pour « 42 ». On adapte
        // la taille du texte à la longueur du contenu plutôt que de le laisser
        // déborder ou se couper.
        const itemsHtml = choices.map((c, i) => `
            <div class="${variant.itemClass} ${lengthClass(c.label)}" role="button" tabindex="0"
                 data-idx="${i}" data-val="${escapeAttr(c.value)}">${c.label}</div>`).join('');

        const wrapped = variant.containerClass
            ? `<div class="${variant.containerClass}">${itemsHtml}</div>`
            : itemsHtml;

        // `context` permet à une variante d'ajouter un support visuel entre
        // l'énoncé et les propositions (table de Pythagore, schéma…).
        const context = opts.context ? opts.context(item) : '';
        container.innerHTML = `${item.prompt.html}${context}${wrapped}${hintBar(session)}`;

        const cells = [...container.querySelectorAll(`[data-idx]`)];

        // Emplacement vide de l'énoncé (comparaisons) : il se remplit avec le
        // signe choisi, quel que soit le geste — clic, dépôt ou démonstration.
        const slot = container.querySelector('.compare-slot');
        const fillSlot = (el, correct) => {
            if (!slot) return;
            slot.textContent = el.textContent;
            slot.classList.add('compare-slot--filled');
            slot.classList.toggle('compare-slot--ok', correct);
            slot.classList.toggle('compare-slot--ko', !correct);
        };

        if (session.isDemo) {
            if (!session.frozen) runDemo(item, cells, slot, fillSlot);
            return;
        }

        wireHint(container, session);

        const answer = (el) => {
            if (destroyed || el.dataset.eliminated === '1') return;
            const value = choices[Number(el.dataset.idx)].value;
            const result = session.submit(value, { element: el });
            if (result.ignored) return;

            styleFeedback(el, result.correct, opts.variant);
            fillSlot(el, result.correct);

            if (!result.correct) el.dataset.eliminated = '1';
            // Les clics restent bloqués tant que la correction est à l'écran :
            // pas de nouvelle tentative au hasard avant de l'avoir lue.
            cells.forEach(c => { c.style.pointerEvents = 'none'; });

            // C'est la FERMETURE du retour qui déclenche la suite, plus un
            // minuteur : l'élève lit à son rythme.
            result.dismissed.then(() => {
                if (destroyed) return;

                if (result.correct) { renderNext(); return; }

                if (result.revealed) {
                    const good = cells[choices.findIndex(c => c.correct)];
                    if (good) {
                        good.classList.add('demo-target');
                        // On corrige l'énoncé sous ses yeux : la ligne se relit
                        // alors juste.
                        fillSlot(good, true);
                    }
                    regTimeout(renderNext, DELAYS.reveal);
                } else {
                    cells.forEach(c => {
                        if (c.dataset.eliminated !== '1') c.style.pointerEvents = '';
                    });
                }
            });
        };

        cells.forEach(el => {
            el.onclick = () => answer(el);
            el.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); answer(el); }
            };
        });

        if (opts.dragToSlot) enableDragToSlot(container, cells, answer);
    }

    /**
     * Démonstration : on montre le RAISONNEMENT, puis le geste.
     *
     * Le geste compte — quand l'exercice se joue au glisser-déposer, c'est lui
     * l'objet de l'apprentissage — mais il ne dit pas pourquoi cette case-là.
     * Le déroulé commenté (méthode, erreur écartée, conclusion) vit dans
     * `demoScript`, commun à toutes les activités à propositions.
     */
    async function runDemo(item, cells, slot, fillSlot) {
        if (!cursor) cursor = createDemoCursor();
        if (session.narration && !narrateur) narrateur = creerNarrateur();

        const fini = await demoChoix({
            narrateur, cursor, item, cellules: cells,
            question: container.querySelector('.game-question'),
            versEmplacement: (opts.dragToSlot && slot) ? slot : null,
            apresChoix: (el) => fillSlot(el, true)
        });
        if (!fini || destroyed) return;
        renderNext();
    }

    renderNext();

    return {
        // Passer d'une question à l'autre sans répondre : utilisé par le
        // chronomètre par question et par la navigation du professeur.
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            if (cursor) { cursor.destroy(); cursor = null; }
            if (narrateur) { narrateur.detruire(); narrateur = null; }
            container.innerHTML = '';
            session.finish();
        }
    };
}

/**
 * Glisser-déposer d'une proposition vers l'emplacement vide de l'énoncé.
 *
 * Implémenté avec les Pointer Events, et non l'API HTML5 drag-and-drop : cette
 * dernière ne fonctionne pas au doigt, or l'application est utilisée sur
 * tablette. Un simple appui reste possible — en dessous du seuil de
 * déplacement, on retombe sur le clic.
 *
 * Geste et manipulation valent ici mieux qu'un clic : déposer le « < » entre
 * les deux fractions, c'est écrire l'inégalité.
 */
function enableDragToSlot(container, cells, answer) {
    const slot = container.querySelector('.compare-slot');
    if (!slot) return;

    const MOVE_THRESHOLD = 8; // px en deçà desquels le geste reste un clic

    cells.forEach(el => {
        el.addEventListener('pointerdown', (event) => {
            if (event.button !== undefined && event.button !== 0) return;
            if (el.dataset.eliminated === '1') return;

            const start = { x: event.clientX, y: event.clientY };
            let dragging = false;
            let ghost = null;
            el.setPointerCapture(event.pointerId);

            const overSlot = (e) => {
                const r = slot.getBoundingClientRect();
                const m = 18; // tolérance : viser exactement la case est pénible au doigt
                return e.clientX >= r.left - m && e.clientX <= r.right + m
                    && e.clientY >= r.top - m && e.clientY <= r.bottom + m;
            };

            const onMove = (e) => {
                const dx = e.clientX - start.x, dy = e.clientY - start.y;
                if (!dragging && Math.hypot(dx, dy) < MOVE_THRESHOLD) return;

                if (!dragging) {
                    dragging = true;
                    ghost = el.cloneNode(true);
                    ghost.classList.add('drag-ghost');
                    const r = el.getBoundingClientRect();
                    ghost.style.width = `${r.width}px`;
                    ghost.style.height = `${r.height}px`;
                    ghost.dataset.originX = String(r.left);
                    ghost.dataset.originY = String(r.top);
                    document.body.appendChild(ghost);
                    el.classList.add('drag-source');
                }
                ghost.style.left = `${Number(ghost.dataset.originX) + dx}px`;
                ghost.style.top = `${Number(ghost.dataset.originY) + dy}px`;
                slot.classList.toggle('compare-slot--hover', overSlot(e));
            };

            const onUp = (e) => {
                el.removeEventListener('pointermove', onMove);
                el.removeEventListener('pointerup', onUp);
                el.removeEventListener('pointercancel', onUp);
                el.classList.remove('drag-source');
                slot.classList.remove('compare-slot--hover');
                if (ghost) ghost.remove();

                if (!dragging) return;          // simple appui : le clic prend le relais
                e.preventDefault();
                if (!overSlot(e)) return;       // déposé à côté : rien ne se passe

                answer(el);   // remplit l'emplacement et valide
            };

            el.addEventListener('pointermove', onMove);
            el.addEventListener('pointerup', onUp);
            el.addEventListener('pointercancel', onUp);
        });
    });
}

function styleFeedback(el, correct, variant) {
    if (correct) {
        el.classList.add('choice--ok');
        el.style.backgroundColor = '#dcfce7';
        el.style.borderColor = 'var(--success)';
    } else {
        el.classList.add('choice--ko');
        if (variant === 'buttons' || variant === 'digicode') {
            el.style.borderColor = 'var(--danger)';
            el.style.color = 'var(--danger)';
        } else {
            el.style.background = 'var(--danger)';
            el.style.color = 'white';
        }
    }
}

// Bouton d'aide : présent seulement si la politique l'autorise et si l'item
// propose des indices. En évaluation, il n'apparaît pas du tout.
export function hintBar(session) {
    if (!session.hintsAvailable) return '';
    return `<div class="hint-bar">
        <button type="button" class="btn-hint" data-hint>
            <span aria-hidden="true">💡</span> Un indice
        </button>
    </div>`;
}

export function wireHint(container, session) {
    const btn = container.querySelector('[data-hint]');
    if (!btn) return;
    btn.onclick = () => {
        const h = session.hint();
        if (!h) { btn.disabled = true; btn.textContent = 'Plus d\'indice'; return; }
        let box = container.querySelector('.hint-text');
        if (!box) {
            box = document.createElement('div');
            box.className = 'hint-text';
            box.setAttribute('role', 'status');
            btn.parentElement.appendChild(box);
        }
        box.textContent = h;
        if (!session.hintsAvailable) { btn.disabled = true; btn.textContent = 'Plus d\'indice'; }
    };
}

function escapeAttr(v) {
    return String(v).replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Classe de taille selon la longueur du libellé (balises HTML exclues). */
function lengthClass(label) {
    const n = String(label).replace(/<[^>]*>/g, '').replace(/\s/g, '').length;
    if (n >= 8) return 'choice--xxl';
    if (n >= 6) return 'choice--xl';
    if (n >= 4) return 'choice--l';
    return '';
}
