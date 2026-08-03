// Activité « placer un point dans un repère ».
//
// Remplace l'ancien quadrillage de cases. Le rendu est un SVG : il porte son
// propre système de coordonnées, donc il ne s'écrase pas dans un conteneur
// centré, et les cibles cliquables tombent exactement sur les nœuds du repère.
//
// Sur une erreur, on affiche les coordonnées du point cliqué : voir « tu as
// cliqué en (2 ; 3) » à côté de la cible (3 ; 2) est ce qui fait comprendre
// l'inversion, bien mieux qu'un « faux ».

import { regTimeout } from '../timers.js';
import { repereSvg, marqueurPoint } from '../figures.js';
import { hintBar, wireHint } from './choice.js';
import { createDemoCursor, DEMO_SPEED } from '../demoPointer.js';
import { creerNarrateur } from '../demoNarration.js';
import { direLaMethode, direLaConclusion } from '../demoScript.js';

export function mount(container, session) {
    let destroyed = false;
    let cursor = null;
    let narrateur = null;

    function renderNext() {
        if (destroyed) return;
        render(session.next());
    }

    function render(item) {
        const { max, relatifs } = item.meta;
        container.innerHTML = `
            ${item.prompt.html}
            <div class="figure-wrap figure-wrap--interactive">
                ${repereSvg({ max, relatifs, interactive: true })}
            </div>
            ${hintBar(session)}`;

        const svg = container.querySelector('svg');
        const target = svg.querySelector(`.rep-hit[data-c="${item.answer}"]`);

        if (session.isDemo) {
            if (!session.frozen) runDemo(svg, target);
            return;
        }

        wireHint(container, session);

        const answer = (hit) => {
            if (destroyed) return;
            const result = session.submit(hit.dataset.c, { element: hit });
            if (result.ignored) return;

            if (result.correct) markPoint(svg, hit, 'ok');
            else markPoint(svg, hit, 'ko', formatCoord(hit.dataset.c));

            // Enchaînement à la fermeture de la correction, pas sur minuteur.
            result.dismissed.then(() => {
                if (destroyed) return;
                if (result.correct) { renderNext(); return; }
                if (result.revealed) {
                    if (target) markPoint(svg, target, 'demo', formatCoord(item.answer));
                    regTimeout(renderNext, 1800);
                }
            });
        };

        svg.querySelectorAll('.rep-hit').forEach(hit => {
            hit.addEventListener('click', () => answer(hit));
            hit.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); answer(hit); }
            });
        });
    }

    // Le marqueur est ajouté au SVG plutôt que positionné en absolu : il suit
    // automatiquement l'échelle de la figure.
    function markPoint(svg, hit, kind, label) {
        const cx = hit.getAttribute('cx');
        const cy = hit.getAttribute('cy');
        const ns = 'http://www.w3.org/2000/svg';

        // Même marque que les points tracés par les figures : le point que
        // l'élève pose doit s'écrire comme celui qu'on lui montre.
        const marque = document.createElementNS(ns, 'g');
        marque.innerHTML = marqueurPoint(Number(cx), Number(cy), '', 8);
        const groupe = marque.firstElementChild;
        groupe.classList.add('rep-mark', `rep-mark--${kind}`);
        svg.appendChild(groupe);

        if (label) {
            const text = document.createElementNS(ns, 'text');
            text.setAttribute('x', String(Number(cx) + 12));
            text.setAttribute('y', String(Number(cy) - 11));
            text.setAttribute('class', `rep-mark-label rep-mark-label--${kind}`);
            text.textContent = label;
            svg.appendChild(text);
        }
    }

    // Démonstration : le pointeur parcourt le repère jusqu'au nœud cherché.
    // Voir le trajet, c'est voir qu'on lit d'abord l'abscisse puis l'ordonnée.
    async function runDemo(svg, target) {
        if (!target) { regTimeout(renderNext, DEMO_SPEED.between); return; }
        if (!cursor) cursor = createDemoCursor();
        if (session.narration && !narrateur) narrateur = creerNarrateur();
        const enonce = container.querySelector('.game-question');

        if (!await direLaMethode(narrateur, session.current, enonce) || destroyed) return;
        if (!await cursor.pause(narrateur ? 250 : 600) || destroyed) return;
        if (!await cursor.tap(target) || destroyed) return;
        markPoint(svg, target, 'demo');
        if (narrateur) {
            if (!await direLaConclusion(narrateur, session.current, target) || destroyed) return;
        } else if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;
        renderNext();
    }

    renderNext();

    return {
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

function formatCoord(raw) {
    const [x, y] = String(raw).split(',');
    return `(${x} ; ${y})`;
}
