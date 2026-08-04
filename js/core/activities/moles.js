// Activité « chasse aux taupes ».
//
// Le contenu vient d'un générateur : les taupes portent la bonne réponse ou
// l'un des distracteurs typés de l'item — le jeu sait donc faire travailler
// les fractions ou les aires sans une ligne de plus.
//
// Réécriture du rythme : l'ancienne boucle ajoutait une CHAÎNE de minuteurs à
// chaque nouvelle question sans éteindre la précédente — au fil de la partie,
// les taupes finissaient par clignoter frénétiquement. Ici un seul métronome,
// coupé et relancé proprement, et JUSQU'À TROIS taupes sorties en même temps :
// il faut chercher la bonne, pas cliquer la seule qui dépasse. Le défilement
// se fige pendant qu'une correction est ouverte.

import { regTimeout, regInterval } from '../timers.js';
import { createDemoCursor, DEMO_SPEED } from '../demoPointer.js';

const HOLES = 9;
const SORTIES_MAX = 3;       // taupes visibles en même temps
const DUREE_SORTIE = 2600;   // temps qu'une taupe reste dehors
const CADENCE = 850;         // rythme d'apparition

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let item = null;
    let cursor = null;
    let metronome = null;
    let generation = 0;      // invalide les minuteurs d'une question passée

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
    // Par trou : la valeur affichée et si c'est la bonne réponse.
    const sorties = Array(HOLES).fill(null);

    function toutRentrer() {
        holes.forEach((h, i) => {
            sorties[i] = null;
            h.querySelector('[data-mole]').classList.remove('mole--up', 'mole--ok', 'mole--ko');
        });
    }

    function nextItem() {
        if (destroyed) return;
        generation++;
        if (metronome) { clearInterval(metronome); metronome = null; }
        toutRentrer();
        item = session.next();
        questionEl.innerHTML = item.prompt.html;

        if (session.isDemo) {
            if (!session.frozen) lancerDemo();
            return;
        }
        // Premier trio tout de suite, puis le métronome prend le relais.
        sortir(); sortir();
        metronome = regInterval(() => tic(), CADENCE);
    }

    function tic() {
        if (destroyed || session.locked) return;   // correction ouverte : tout se fige
        sortir();
    }

    function valeursDehors() {
        return sorties.filter(Boolean).map(s => s.value);
    }

    /** Fait sortir une taupe d'un trou libre, bonne réponse ou distracteur. */
    function sortir() {
        const libres = holes.map((_, i) => i).filter(i => !sorties[i]);
        const dehors = sorties.filter(Boolean).length;
        if (!libres.length || dehors >= SORTIES_MAX) return;

        const idx = libres[Math.floor(Math.random() * libres.length)];
        const bonneDejaLa = sorties.some(s => s && s.correct);

        // La bonne réponse sort souvent — mais jamais en double.
        let choix;
        if (!bonneDejaLa && Math.random() < 0.45) {
            choix = { value: String(item.answer), label: item.answer, correct: true };
        } else {
            const distracteurs = (item.choices || [])
                .filter(c => !c.correct && !valeursDehors().includes(String(c.value)));
            if (!distracteurs.length) {
                if (bonneDejaLa) return;
                choix = { value: String(item.answer), label: item.answer, correct: true };
            } else {
                const d = distracteurs[Math.floor(Math.random() * distracteurs.length)];
                choix = { value: String(d.value), label: d.label, correct: false };
            }
        }

        sorties[idx] = choix;
        const mole = holes[idx].querySelector('[data-mole]');
        mole.dataset.val = choix.value;
        mole.innerHTML = String(choix.label);
        mole.classList.remove('mole--ok', 'mole--ko');
        mole.classList.add('mole--up');

        // Chaque taupe a SA durée de sortie, puis rentre — sauf si la partie
        // est figée par une correction (elle attendra la reprise).
        const gen = generation;
        const rentrer = () => {
            if (destroyed || gen !== generation || !sorties[idx] || sorties[idx] !== choix) return;
            if (session.locked) { regTimeout(rentrer, 600); return; }
            sorties[idx] = null;
            mole.classList.remove('mole--up');
        };
        regTimeout(rentrer, DUREE_SORTIE + Math.random() * 700);
    }

    holes.forEach((hole, idx) => {
        hole.onclick = () => {
            if (destroyed || session.isDemo) return;
            const choix = sorties[idx];
            if (!choix) return;
            const mole = hole.querySelector('[data-mole]');

            const result = session.submit(choix.value, { element: hole });
            if (result.ignored) return;

            mole.classList.add(result.correct ? 'mole--ok' : 'mole--ko');
            sorties[idx] = null;   // frappée : elle ne rentrera pas d'elle-même
            // La correction se ferme à la main : l'élève ne doit pas rater
            // l'explication parce qu'une taupe est ressortie.
            result.dismissed.then(() => {
                if (destroyed) return;
                if (result.correct) regTimeout(nextItem, 350);
                else {
                    mole.classList.remove('mole--up', 'mole--ko');
                    // Question toujours en cours : le métronome repart tout seul.
                }
            });
        };
    });

    // Démonstration : de mauvaises taupes sortent, le robot les IGNORE, puis
    // frappe la bonne — c'est le discernement qu'on montre, pas le réflexe.
    async function lancerDemo() {
        if (!cursor) cursor = createDemoCursor();
        const gen = generation;
        // Deux distracteurs sortent d'abord, la bonne ensuite.
        sortir(); sortir();
        if (!await cursor.pause(900) || destroyed || gen !== generation) return;

        let bonIdx = sorties.findIndex(s => s && s.correct);
        if (bonIdx === -1) {
            const libres = holes.map((_, i) => i).filter(i => !sorties[i]);
            bonIdx = libres[Math.floor(Math.random() * libres.length)];
            sorties[bonIdx] = { value: String(item.answer), label: item.answer, correct: true };
            const mole = holes[bonIdx].querySelector('[data-mole]');
            mole.innerHTML = String(item.answer);
            mole.classList.remove('mole--ok', 'mole--ko');
            mole.classList.add('mole--up');
        }
        cursor.say(`La bonne réponse est ${item.answer} : je ne frappe QUE cette taupe-là.`, holes[bonIdx]);
        if (!await cursor.pause(1600) || destroyed || gen !== generation) return;
        if (!await cursor.tap(holes[bonIdx]) || destroyed || gen !== generation) return;
        holes[bonIdx].querySelector('[data-mole]').classList.add('mole--ok');
        if (!await cursor.pause(DEMO_SPEED.between) || destroyed || gen !== generation) return;
        cursor.hideBubble();
        nextItem();
    }

    nextItem();

    return {
        showNext: nextItem,
        showPrevious() { if (session.rewind()) nextItem(); },
        destroy() {
            destroyed = true;
            if (metronome) clearInterval(metronome);
            if (cursor) { cursor.destroy(); cursor = null; }
            container.innerHTML = '';
            session.finish();
        }
    };
}
