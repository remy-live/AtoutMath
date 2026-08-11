// Activité « Table de Pythagore » inversée : du résultat vers la case.
//
// L'ancienne version montrait la table remplie avec une case « ? » et des
// bulles de réponses — donner le produit quand la table est sous les yeux
// n'apprend rien. Ici, c'est le RÉSULTAT qui est donné (42) et la table est
// VIDE : l'élève clique une case dont ligne × colonne fait 42. Toutes les
// décompositions valides sont acceptées (6×7 comme 7×6) — c'est précisément
// le travail de décomposition que la table de Pythagore enseigne.
//
// La table ne déborde jamais : elle se dimensionne sur la largeur ET la
// hauteur disponibles (unités de conteneur), l'en-tête compris.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let cursor = null;
    let item = null;

    function renderNext() {
        if (destroyed) return;
        item = session.next();
        render();
    }

    function cible() { return Number(item.answer); }

    function render() {
        const t = cible();

        let cells = '<div class="pyt-cell pyt-cell--tete">×</div>';
        for (let c = 1; c <= 10; c++) cells += `<div class="pyt-cell pyt-cell--tete">${c}</div>`;
        for (let r = 1; r <= 10; r++) {
            cells += `<div class="pyt-cell pyt-cell--tete">${r}</div>`;
            for (let c = 1; c <= 10; c++) {
                cells += `<button type="button" class="pyt-cell pyt-case" data-r="${r}" data-c="${c}"
                    aria-label="${r} fois ${c}"></button>`;
            }
        }

        container.innerHTML = `
            <div class="pyt-layout">
                <div class="game-question pyt-question">Où se cache <b class="pyt-cible">${t}</b> dans la table ?</div>
                <div class="pyt-sous">Clique une case : sa ligne × sa colonne doit faire ${t}.</div>
                <div class="pyt-board" role="group" aria-label="Table de Pythagore vide">${cells}</div>
                ${hintBar(session)}
            </div>`;

        if (session.frozen) return;
        if (session.isDemo) { runDemo(); return; }

        container.querySelectorAll('.pyt-case').forEach(el => {
            el.onclick = () => cliquer(el);
        });
        wireHint(container, session);
    }

    function cliquer(el) {
        if (destroyed || session.locked) return;
        const r = Number(el.dataset.r), c = Number(el.dataset.c);
        const produit = r * c;
        const juste = produit === cible();

        // Toute décomposition valide est acceptée : on soumet la réponse
        // canonique quand la case convient, le produit cliqué sinon — le
        // carnet d'erreurs enregistre alors ce que l'élève a réellement cru.
        const result = session.submit(juste ? item.answer : String(produit), { element: el });
        if (result.ignored) return;

        el.classList.add(juste ? 'pyt-case--ok' : 'pyt-case--ko');
        el.textContent = produit;
        if (juste) marquerDecompositions();
        result.dismissed.then(() => {
            if (destroyed) return;
            if (result.correct) { regTimeout(renderNext, 900); return; }
            if (result.revealed) {
                marquerDecompositions();
                regTimeout(renderNext, 2200);
            } else {
                // Nouvel essai : la case fautive garde son produit affiché —
                // c'est une information gagnée.
            }
        });
    }

    /** Révèle TOUTES les cases qui font la cible : 42 = 6×7 = 7×6. */
    function marquerDecompositions() {
        const t = cible();
        container.querySelectorAll('.pyt-case').forEach(el => {
            const p = Number(el.dataset.r) * Number(el.dataset.c);
            if (p === t) {
                el.classList.add('pyt-case--ok');
                el.textContent = p;
            }
        });
    }

    // Le robot cherche comme on cherche : il lit la cible, énonce une
    // décomposition, suit la ligne puis la colonne, et clique la case.
    async function runDemo() {
        const t = cible();
        const m = item.meta || {};
        const r = m.t || 2, c = m.m || Math.max(1, Math.round(t / (m.t || 2)));
        if (!cursor) cursor = createDemoCursor();
        // La bulle se pose AUTOUR de la grille, jamais dessus : elle
        // couvrait la ligne de chiffres sur laquelle porte l'explication.
        cursor.protegerZone(container.querySelector('.pyt-board'));
        const gate = createDemoGate(container.querySelector('.pyt-layout') || container);
        const fin = () => { cursor?.hideBubble(); gate?.destroy(); };

        if (!await cursor.pause(800) || destroyed) return fin();
        if (!await gate.waitTurn() || destroyed) return fin();

        const caseCible = container.querySelector(`.pyt-case[data-r="${r}"][data-c="${c}"]`);
        cursor.say(`${t}… je le connais dans la table de ${r} : ${r} × ${c} = ${t}. Ligne ${r}, colonne ${c}.`,
            container.querySelector('.pyt-cible'));
        if (!await cursor.pause(2400) || destroyed) return fin();
        if (!caseCible || !await cursor.tap(caseCible, 900) || destroyed) return fin();
        caseCible.classList.add('pyt-case--ok');
        caseCible.textContent = t;
        marquerDecompositions();
        cursor.say(r === c
            ? `${t} = ${r} × ${r} est sur la DIAGONALE des carrés : c'est sa seule case dans la table.`
            : `Et ${t} a un jumeau de l'autre côté de la diagonale : ${c} × ${r}. Les deux cases sont justes.`,
            caseCible);
        if (!await cursor.pause(DEMO_SPEED.between + 1200) || destroyed) return fin();
        fin();
        renderNext();
    }

    renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            if (cursor) { cursor.destroy(); cursor = null; }
            container.innerHTML = '';
            session.finish();
        }
    };
}
