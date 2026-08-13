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
import { state } from '../state.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';

/**
 * Ce que le robot dit avant de choisir, et après avoir choisi.
 *
 * On fait entendre l'indice et l'explication que le générateur fournit déjà —
 * c'est le raisonnement de l'exercice, pas une phrase de remplissage. Mais une
 * bulle se lit à 340 ms le mot : une explication de trois lignes fige la
 * démonstration au point qu'on la croit plantée. On ne dit donc à voix haute
 * que ce qui tient en une respiration ; le texte long reste dans la
 * correction, où l'élève le lit à son rythme.
 */
const COURT = 110;
const tientEnUneBulle = (t) => typeof t === 'string' && t.trim() && t.trim().length <= COURT;

function phraseDepart(item) {
    const indice = (item.hints || [])[0];
    if (tientEnUneBulle(indice)) return indice.trim();
    return 'Je lis la question en entier avant de regarder les réponses.';
}

function phraseFin(item, el) {
    if (tientEnUneBulle(item.explanation)) return item.explanation.trim();
    const r = (el.textContent || '').trim();
    return r && r.length <= 22 ? `La réponse est ${r}.` : 'C\'est celle-là.';
}

const VARIANTS = {
    bubbles: { itemClass: 'bubble', containerClass: 'bubble-container' },
    digicode: { itemClass: 'missing-cell', containerClass: 'missing-grid' },
    buttons: { itemClass: 'prio-btn', containerClass: '' },
    // Comparaison : des pastilles rondes géantes donnaient à « < = > » le poids
    // visuel d'une réponse chiffrée. Des tuiles compactes alignées se lisent
    // comme la ligne d'égalité qu'on cherche à compléter.
    signs: { itemClass: 'sign-tile', containerClass: 'sign-row' },
    coords: { itemClass: 'coord-tile', containerClass: 'coord-row' },
    // Des cartes, pour les réponses qui sont des PHRASES : « 17 billes
    // rouges », « il en reste 4 ». Voir `estLong` plus bas — on n'y passe que
    // quand c'est nécessaire.
    cartes: { itemClass: 'choice-carte', containerClass: 'choice-cartes' }
};

const DELAYS = { success: 1200, reveal: 1500, pause: 1500 };

export function mount(container, session, opts = {}) {
    const variant = VARIANTS[opts.variant] || VARIANTS.bubbles;
    let destroyed = false;
    // Un seul pointeur pour toute la démonstration : recréé à chaque question,
    // il repartirait du coin de l'écran à chaque fois.
    let cursor = null;
    let gate = null;

    function renderNext() {
        if (destroyed) return;
        const item = session.next();
        render(item);
    }

    function render(item) {
        const choices = item.choices || [];
        // BULLES OU CARTES ? Une bulle ronde est parfaite pour « 42 » et
        // ridicule pour « 17 billes rouges » : le texte se recroqueville ou
        // déborde. Dès qu'une seule proposition est longue, tout le groupe
        // passe en cartes rectangulaires posées deux par deux. On ne le décide
        // pas exercice par exercice — c'est le CONTENU qui le décide, donc ça
        // reste juste le jour où un générateur allonge ses libellés.
        const habillage = (variant === VARIANTS.bubbles && choices.some(c => estLong(c.label)))
            ? VARIANTS.cartes : variant;
        // « 100 000 » ne tient pas dans une bulle prévue pour « 42 ». On adapte
        // la taille du texte à la longueur du contenu plutôt que de le laisser
        // déborder ou se couper.
        const itemsHtml = choices.map((c, i) => `
            <div class="${habillage.itemClass} ${lengthClass(c.label)}" role="button" tabindex="0"
                 data-idx="${i}" data-val="${escapeAttr(c.value)}">${c.label}</div>`).join('');

        // Le nombre de propositions est passé à la mise en page : c'est lui
        // qui décide de la taille des bulles pour qu'elles tiennent TOUTES SUR
        // UNE LIGNE. Trois en haut et une orpheline en dessous, c'est laid, et
        // surtout ça suggère un groupement qui n'existe pas.
        const wrapped = habillage.containerClass
            ? `<div class="${habillage.containerClass}" style="--n:${choices.length}">${itemsHtml}</div>`
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
            if (!session.frozen) runDemo(cells, choices, slot, fillSlot, item);
            return;
        }

        wireHint(container, session);
        // « Montre-moi » sur les choix : en plus du texte, la bonne case
        // s'illumine — l'élève n'a plus qu'à faire le geste dessus.
        wireShowMe(container, session, {
            highlight: () => {
                const good = cells[choices.findIndex(c => c.correct)];
                if (good) good.classList.add('demo-target');
            }
        });

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
     * Démonstration : on montre le GESTE, pas seulement la bonne case.
     *
     * Quand l'exercice se joue au glisser-déposer, c'est ce geste qui est
     * l'objet de l'apprentissage — le voir sauter d'une question à l'autre
     * n'apprenait rien. Le pointeur va donc chercher la tuile, la traîne
     * jusqu'à l'emplacement vide et l'y dépose, puis on laisse la ligne
     * complétée à l'écran le temps de la relire.
     */
    async function runDemo(cells, choices, slot, fillSlot, item) {
        const el = cells[choices.findIndex(c => c.correct)];
        if (!el) { regTimeout(renderNext, DEMO_SPEED.between); return; }

        if (!cursor) cursor = createDemoCursor();
        if (!gate) gate = createDemoGate(container);
        if (!await gate.waitTurn() || destroyed) return;
        if (!await cursor.pause(600) || destroyed) return;

        // LE ROBOT DIT POURQUOI. Il se contentait de poser le doigt sur la
        // bonne case : montrer LAQUELLE est juste sans dire pourquoi n'apprend
        // rien à qui ne le savait pas déjà — et l'élève qui suit la
        // démonstration est exactement celui-là. Accessoirement, « Arrière »
        // rappelle les explications passées : sans une seule explication, il
        // n'avait rien à rappeler et semblait cassé.
        cursor.say(phraseDepart(item), container.querySelector('.question-prompt') || container);
        if (!await cursor.pause(DEMO_SPEED.settle) || destroyed) return;
        if (!await gate.waitTurn() || destroyed) return;

        const fait = (opts.dragToSlot && slot)
            ? await cursor.dragFromTo(el, slot)
            : await cursor.tap(el);
        if (!fait || destroyed) return;

        el.classList.add('demo-target');
        fillSlot(el, true);

        if (!await gate.waitTurn() || destroyed) return;
        cursor.say(phraseFin(item, el), el);
        if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;
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
            if (gate) { gate.destroy(); gate = null; }
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

// Barre d'aide : l'indice (si la politique l'autorise et si l'item en
// propose) et, en mode apprentissage, le bouton « Montre-moi » — l'aide
// maximale : la réponse est révélée et expliquée, puis l'élève fait le geste
// lui-même. En évaluation, rien de tout cela n'apparaît.

/** « Montre-moi » disponible ? Pas en démo, pas sur les grilles (le
 *  vérificateur et les indices de zone y jouent déjà ce rôle). */
function canShowMe(session) {
    return !!(session.policy && session.policy.showMe && !session.isDemo
        && session.current && session.current.answerKind !== 'grid');
}

/** La réponse sous sa forme lisible par l'élève. */
function answerLabelOf(item) {
    if (item.choices) {
        const good = item.choices.find(c => c.correct);
        if (good) return String(good.label !== undefined ? good.label : good.value);
    }
    if (item.answerKind === 'point' && item.meta && item.meta.x !== undefined) {
        return `(${item.meta.x} ; ${item.meta.y})`;
    }
    return String(item.answer);
}

export function hintBar(session) {
    const showMe = canShowMe(session);
    if (!session.hintsAvailable && !showMe) return '';
    return `<div class="hint-bar"><div class="hint-btns">
        ${session.hintsAvailable ? `<button type="button" class="btn-hint" data-hint>
            <span aria-hidden="true">💡</span> Un indice
        </button>` : ''}
        ${showMe ? `<button type="button" class="btn-hint btn-showme" data-showme>
            <span aria-hidden="true">🤝</span> Montre-moi
        </button>` : ''}
    </div></div>`;
}

export function wireHint(container, session) {
    wireShowMe(container, session);
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
            btn.parentElement.parentElement.appendChild(box);
        }
        box.textContent = h;
        if (!session.hintsAvailable) { btn.disabled = true; btn.textContent = 'Plus d\'indice'; }
    };
}

/**
 * « Montre-moi » : révèle la réponse et son explication, sans répondre à la
 * place de l'élève — c'est encore lui qui clique, tape ou place. L'usage est
 * tracé comme une aide (gratuite en apprentissage).
 *
 * Deux réglages pour les activités où « la réponse » n'est pas le bon secours :
 *   - `message(item)` remplace le texte. Sur le rapporteur, annoncer « la
 *     réponse est 20 » ne sert à rien — l'énoncé la donne déjà — alors que
 *     montrer le GESTE, puis inviter à lire la graduation, est tout l'exercice.
 *   - `enPage` affiche ce texte SOUS les commandes plutôt qu'en carte posée
 *     sur le plateau : une aide qui recouvre l'animation qu'elle commente ne
 *     s'explique pas elle-même.
 *
 * @param {{highlight?:()=>void, message?:(item:Object)=>string, enPage?:boolean}} [opts]
 */
export function wireShowMe(container, session, opts = {}) {
    const btn = container.querySelector('[data-showme]');
    if (!btn) return;
    btn.onclick = () => {
        const item = session.current;
        if (!item || session.locked) return;
        btn.disabled = true;
        // Révéler vaut tous les indices : en entraînement, les points de la
        // question s'en ressentent ; en apprentissage (pénalité nulle), non.
        session.hintIndex = Math.max(session.hintIndex, (item.hints || []).length, 2);
        state.noteHintUsed();
        const msg = opts.message
            ? opts.message(item)
            : `La réponse est « ${answerLabelOf(item)} ». À toi de la jouer !`;
        if (opts.enPage) {
            let box = container.querySelector('.hint-text');
            if (!box) {
                box = document.createElement('div');
                box.className = 'hint-text';
                box.setAttribute('role', 'status');
                btn.parentElement.parentElement.appendChild(box);
            }
            box.textContent = msg;
        } else {
            document.dispatchEvent(new CustomEvent('game_feedback', {
                detail: { kind: 'hint', msg, misconception: item.explanation || null }
            }));
        }
        if (opts.highlight) opts.highlight();
    };
}

function escapeAttr(v) {
    return String(v).replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Le texte visible d'un libellé, balises et espaces multiples retirés. */
function texteNu(label) {
    return String(label).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Un libellé assez long pour qu'une bulle ronde ne convienne plus.
 *
 * Deux critères, parce qu'ils ne disent pas la même chose : au-delà de neuf
 * caractères, ça ne tient plus dans un rond ; et dès qu'il y a un espace, on
 * lit une PHRASE — « 17 billes » — qui appelle un rectangle, même courte.
 */
/**
 * Une bulle ronde tient « 42 », pas « 12 345 ».
 *
 * Le seuil se déduit de la mise en page : quatre bulles sur une ligne font
 * environ soixante-quinze pixels de large sur un téléphone, soit cinq
 * caractères lisibles. Au-delà, on passe aux cartes rectangulaires posées deux
 * par deux — c'est la règle convenue, et elle vaut aussi pour les nombres, pas
 * seulement pour les phrases.
 */
function estLong(label) {
    const t = texteNu(label);
    return t.length > 5 || /\s/.test(t);
}

/** Classe de taille selon la longueur du libellé (balises HTML exclues). */
function lengthClass(label) {
    const n = String(label).replace(/<[^>]*>/g, '').replace(/\s/g, '').length;
    if (n >= 8) return 'choice--xxl';
    if (n >= 6) return 'choice--xl';
    if (n >= 4) return 'choice--l';
    return '';
}
