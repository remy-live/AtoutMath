// Activité « attraper le bon nombre » : des disques sortent des trous.
//
// LE NOM DU FICHIER DIT ENCORE `moles`, ET LE JEU NE DIT PLUS « taupe ».
// Rémy, en regardant le robot : « Ce n'est pas des taupes, mets "Je touche
// ici" ». Ce n'en est pas, en effet — ce qui sort du trou est un disque coloré
// portant un nombre —, et les deux exercices s'appellent maintenant « Attrape
// le Résultat » et « Attrape le Produit ». L'identifiant d'activité, le nom du
// fichier et les classes CSS restent `moles` : personne ne les lit, et les
// renommer casserait les descripteurs pour rien.
//
// Le contenu vient d'un générateur : les disques portent la bonne réponse ou
// l'un des distracteurs typés de l'item — le jeu sait donc faire travailler
// les fractions ou les aires sans une ligne de plus.
//
// Réécriture du rythme : l'ancienne boucle ajoutait une CHAÎNE de minuteurs à
// chaque nouvelle question sans éteindre la précédente — au fil de la partie,
// les disques finissaient par clignoter frénétiquement. Ici un seul métronome,
// coupé et relancé proprement, et JUSQU'À TROIS disques sortis en même temps :
// il faut chercher le bon, pas cliquer le seul qui dépasse. Le défilement
// se fige pendant qu'une correction est ouverte.

import { regTimeout, regInterval } from '../timers.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';

const HOLES = 9;
const SORTIES_MAX = 3;       // disques visibles en même temps
const DUREE_SORTIE = 2600;   // temps qu'un disque reste dehors
const CADENCE = 850;         // rythme d'apparition

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let item = null;
    let cursor = null;
    let gate = null;
    let metronome = null;
    let generation = 0;      // invalide les minuteurs d'une question passée

    container.innerHTML = `
        <div class="moles-wrap">
            <div class="moles-question" data-question></div>
            <div class="moles-grid" role="group" aria-label="Grille des nombres">
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
    // LE TROU QUE LE ROBOT TIENT — et lui seul ne redescend pas.
    //
    // Mesuré à l'aperçu : un disque reste dehors 2 600 ms, et la démonstration
    // met 900 ms à laisser sortir les distracteurs, puis 1 600 ms à dire « je
    // touche ici ». Le doigt arrivait donc À LA SECONDE où le bon disque
    // replongeait, et le robot désignait un trou vide en annonçant la réponse.
    // Pendant qu'il explique, ce qu'il montre doit rester visible.
    let tenu = -1;

    function toutRentrer() {
        tenu = -1;
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

    /** Fait sortir un disque d'un trou libre, bonne réponse ou distracteur. */
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

        // Chaque disque a SA durée de sortie, puis rentre — sauf si la partie
        // est figée par une correction (elle attendra la reprise).
        const gen = generation;
        const rentrer = () => {
            if (destroyed || gen !== generation || !sorties[idx] || sorties[idx] !== choix) return;
            if (idx === tenu) return;   // le robot est en train de le montrer
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
            // l'explication parce qu'un disque est ressorti.
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

    // Démonstration : de mauvais disques sortent, le robot les IGNORE, puis
    // frappe la bonne — c'est le discernement qu'on montre, pas le réflexe.
    async function lancerDemo() {
        if (!cursor) cursor = createDemoCursor();
        if (!gate) gate = createDemoGate(container);
        if (!await gate.waitTurn() || destroyed) return;
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
        tenu = bonIdx;
        // « CE N'EST PAS DES TAUPES, METS "JE TOUCHE ICI" » — Rémy, en regardant
        // le robot. Il a raison, et c'est un défaut d'ÉCRAN autant que de mot :
        // rien ne sort d'un trou, on voit des ronds gris et un rond bleu qui
        // porte un nombre. Le robot parlait d'un animal que personne n'a sous
        // les yeux, et « je ne frappe QUE cette taupe-là » demandait de deviner
        // laquelle. Il montre ce qu'il fait, avec le mot du geste : il touche,
        // et il touche ICI — la bulle pointe le rond dont elle parle.
        cursor.say(`La bonne réponse est ${item.answer} : je touche ici.`, holes[bonIdx]);
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
            if (gate) { gate.destroy(); gate = null; }
            container.innerHTML = '';
            session.finish();
        }
    };
}
