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
import { repereSvg } from '../figures.js';
import { hintBar, wireHint } from './choice.js';

export function mount(container, session) {
    let destroyed = false;

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
            regTimeout(() => {
                if (destroyed || !target) return;
                markPoint(svg, target, 'demo');
                regTimeout(renderNext, 900);
            }, 1600);
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

        const dot = document.createElementNS(ns, 'circle');
        dot.setAttribute('cx', cx);
        dot.setAttribute('cy', cy);
        dot.setAttribute('r', '7');
        dot.setAttribute('class', `rep-mark rep-mark--${kind}`);
        svg.appendChild(dot);

        if (label) {
            const text = document.createElementNS(ns, 'text');
            text.setAttribute('x', String(Number(cx) + 12));
            text.setAttribute('y', String(Number(cy) - 11));
            text.setAttribute('class', `rep-mark-label rep-mark-label--${kind}`);
            text.textContent = label;
            svg.appendChild(text);
        }
    }

    renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            container.innerHTML = '';
            session.finish();
        }
    };
}

function formatCoord(raw) {
    const [x, y] = String(raw).split(',');
    return `(${x} ; ${y})`;
}
