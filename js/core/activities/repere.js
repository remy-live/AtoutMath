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
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';
import { meneurDemo } from '../meneurDemo.js';

export function mount(container, session) {
    let destroyed = false;
    let cursor = null;
    let gate = null;
    /** Le pavé, quand la question demande d'écrire au lieu de pointer. */
    let releve = null;

    /**
     * UNE QUESTION QUI SE REMPLIT, DANS UN EXERCICE QUI SE CLIQUE.
     *
     * ─────────────────────────────────────────────────────────────────────
     *
     * RÉMY : « pour tracer une fonction, ce serait bien de pouvoir aussi
     * avoir des questions avec remplissage de tableau ».
     *
     * LE TABLEAU DE VALEURS EST L'ÉTAPE QU'ON SAUTE. Pour tracer, on calcule
     * d'abord f(−2), f(−1), f(0)… et c'est ce calcul-là qui se travaille ;
     * l'exercice ne posait que le POINT, c'est-à-dire ce qui vient après.
     * Sur la feuille imprimée le tableau existait déjà — à l'écran, non.
     *
     * UN TABLEAU NE SE POINTE PAS : il s'écrit, case par case. C'est le pavé
     * qui sait faire cela (plusieurs trous, une réponse « a|b|c »), et le
     * mécanisme est celui du QCM qui passe au clavier — même contrat,
     * `rendreLaMain` compris. On ne le réécrit donc pas.
     */
    const auPave = (item) => !!(item && item.meta && item.meta.cases);

    function renderNext() {
        if (destroyed) return;
        const item = session.next();
        if (auPave(item)) { passerAuPave(item); return; }
        render(item);
    }

    /** Le pavé prend la main pour les questions à cases. */
    async function passerAuPave(item) {
        const mod = await import('./numeric.js');
        if (destroyed) return;
        if (cursor) { cursor.destroy(); cursor = null; }
        if (gate) { gate.destroy(); gate = null; }
        releve = mod.mount(container, session, { item, rendreLaMain });
    }

    /**
     * ET LE REPÈRE REPREND LA MAIN à la question suivante qui se pointe.
     *
     * Le pavé appelle ceci avant chaque question ; `true` veut dire « arrête-
     * toi là ». Sans cela, une marche « tableau » au milieu de l'exercice
     * laisserait le clavier pour tout le reste, et l'on placerait des points
     * en tapant leurs coordonnées — ce qui n'est pas l'exercice.
     */
    function rendreLaMain(item) {
        if (destroyed) return false;
        if (auPave(item)) return false;
        if (releve && releve.destroy) releve.destroy();
        releve = null;
        render(item);
        return true;
    }

    function render(item) {
        const { max, relatifs } = item.meta;
        // Une boîte de mise en page autour des trois morceaux : le plateau est
        // le CONTENEUR des requêtes de taille, et un élément ne peut pas
        // interroger son propre conteneur. Sans elle, la règle qui met le
        // repère à côté de l'énoncé en paysage ne s'appliquerait jamais.
        container.innerHTML = `
            <div class="rep-layout">
                ${item.prompt.html}
                <div class="figure-wrap figure-wrap--interactive">
                    ${repereSvg({ max, relatifs, interactive: true })}
                </div>
                ${hintBar(session)}
            </div>`;

        const svg = container.querySelector('svg');
        const target = svg.querySelector(`.rep-hit[data-c="${item.answer}"]`);

        if (session.isDemo) {
            if (!session.frozen) runDemo(svg, target, item);
            return;
        }

        wireHint(container, session);

        const answer = (hit) => {
            if (destroyed) return;
            const result = session.submit(hit.dataset.c, { element: hit });
            if (result.ignored) return;

            // La grille se fige : plus de survol collé au doigt sur le nœud
            // qu'on vient de toucher, plus de second appui pendant la
            // correction. Voir `.rep-svg--repondu`.
            svg.classList.add('rep-svg--repondu');
            if (result.correct) markPoint(svg, hit, 'ok');
            else markPoint(svg, hit, 'ko', formatCoord(hit.dataset.c));

            // Enchaînement à la fermeture de la correction, pas sur minuteur.
            result.dismissed.then(() => {
                if (destroyed) return;
                if (result.correct) { renderNext(); return; }
                if (result.revealed) {
                    if (target) markPoint(svg, target, 'demo', formatCoord(item.answer));
                    regTimeout(renderNext, 1800);
                    return;
                }
                // ── IL LUI RESTE UN ESSAI : ON ROUVRE LA GRILLE ────────────
                //
                // RÉMY : « pour l'exercice placer un point. Si l'élève se
                // trompe, on ne peut plus cliquer, en fait l'exercice bloque ».
                //
                // IL AVAIT RAISON À LA LETTRE. La grille se fige au moment de
                // la réponse — c'est voulu, un doigt posé sur un nœud ne doit
                // pas répondre deux fois pendant la correction — et rien ne la
                // rouvrait. Deux chemins sortaient d'ici : juste, on passe à la
                // question suivante ; la correction révélée, on la montre puis
                // on passe. Le TROISIÈME — faux, mais il reste un essai —
                // n'était écrit nulle part, et c'est le plus fréquent des trois
                // en entraînement, où la politique accorde deux essais.
                //
                // MESURÉ AVANT : 36 cibles, 0 cliquable, et cela ne changeait
                // plus. L'élève restait devant « Place le point B (5 ; 3) »
                // sans rien pouvoir toucher.
                //
                // ON EFFACE SA CROIX ROUGE EN ROUVRANT. Elle a fait son travail
                // pendant la correction — « tu as cliqué en (2 ; 3) » est ce
                // qui fait comprendre l'inversion —, et la garder empilerait
                // une croix par essai sur un repère qu'il faut relire.
                svg.classList.remove('rep-svg--repondu');
                svg.querySelectorAll('.rep-mark--ko, .rep-mark-label--ko')
                    .forEach(n => n.remove());
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

        // Une croix, comme sur la fiche imprimée et comme au tableau : elle
        // désigne le nœud du quadrillage au lieu de le recouvrir.
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
    async function runDemo(svg, target, item) {
        if (!target) { regTimeout(renderNext, DEMO_SPEED.between); return; }
        if (!cursor) cursor = createDemoCursor();
        if (!gate) gate = createDemoGate(container);
        const robot = meneurDemo(cursor, gate, () => !destroyed, null, { rangementSeul: true });
        if (!await robot.tour()) return;
        if (!await robot.pause(600)) return;

        // La règle de lecture, DITE avant le geste. Le pointeur allait droit au
        // point : on voyait où, jamais comment — or « d'abord l'abscisse, puis
        // l'ordonnée » est exactement ce qui s'oublie.
        cursor.say(phraseDepart(item), container.querySelector('.figure-wrap') || container);
        if (!await robot.pause(DEMO_SPEED.settle)) return;

        if (!await robot.tour()) return;
        if (!await robot.toucher(target)) return;
        markPoint(svg, target, 'demo');

        if (!await robot.tour()) return;
        cursor.say(phraseFin(item), target);
        if (!await robot.pause(DEMO_SPEED.between)) return;
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
            // LE PAVÉ MEURT AVEC NOUS, sans quoi il garderait ses minuteurs et
            // sa session ouverte derrière un exercice fermé.
            if (releve && releve.destroy) { releve.destroy(); releve = null; }
            container.innerHTML = '';
            session.finish();
        }
    };
}

function formatCoord(raw) {
    const [x, y] = String(raw).split(',');
    return `(${x} ; ${y})`;
}

/**
 * Ce que le robot dit. L'indice et l'explication du générateur d'abord — c'est
 * le raisonnement de l'exercice ; une phrase de secours ensuite, quand ils sont
 * trop longs pour une bulle (on lit à 340 ms le mot : trois lignes figent la
 * démonstration au point qu'on la croit plantée).
 */
const COURT = 110;
const tientEnUneBulle = (t) => typeof t === 'string' && t.trim() && t.trim().length <= COURT;

function phraseDepart(item) {
    const indice = (item.hints || [])[0];
    if (tientEnUneBulle(indice)) return indice.trim();
    return 'On lit d\'abord l\'abscisse, en marchant sur l\'axe horizontal.';
}

function phraseFin(item) {
    if (tientEnUneBulle(item.explanation)) return item.explanation.trim();
    return `Puis l'ordonnée, en montant : ${formatCoord(item.answer)}.`;
}
