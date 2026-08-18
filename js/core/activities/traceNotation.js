// Activité « construire le trait » — l'écriture est donnée, l'élève DESSINE.
//
// Rémy, devant les quatre vignettes de « Quel dessin représente (DF) ? » :
// « un peu bête comme question ; il faudrait plutôt cliquer sur des bouts de
// droite pour faire apparaître le schéma ».
//
// L'écran est une droite coupée en trois par les deux points nommés. Chaque
// morceau s'allume ou s'éteint d'un doigt :
//
//        ←———— avant ————[A]———— entre ————[B]———— après ————→
//
// Ce qui est allumé se dessine plein et noir, ce qui est éteint reste en
// pointillé pâle — on voit donc TOUJOURS les trois morceaux possibles, et le
// trait qu'on est en train de construire par-dessus. Une flèche marque un
// bout qui file, rien ne marque un bout qui s'arrête.
//
// Les règles (ce que vaut un tracé, ce qu'il représente) vivent dans
// core/trace.js, sans DOM. Ici, l'écran.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';
import { MORCEAUX, traceVide, traceDe, ecritureDe, verifierTrace, roleDuMorceau } from '../trace.js';

// La géométrie du dessin, en unités du viewBox.
const W = 320, H = 120, Y = 66;
const XA = 108, XB = 212, BORD = 14;

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let trace = traceVide();
    let avis = opts.avis || '';
    let cursor = null;
    let gate = null;

    function renderNext() {
        if (destroyed) return;
        const item = session.next();
        if (opts.rendreLaMain && opts.rendreLaMain(item)) return;
        render(item);
    }

    /** Le dessin : trois morceaux, deux croix, et les flèches des bouts ouverts. */
    function svg(gauche, droite) {
        const seg = (nom, x1, x2, fleche) => `
            <g class="tn-morceau" data-morceau="${nom}">
                <line class="tn-fond" x1="${x1}" y1="${Y}" x2="${x2}" y2="${Y}"/>
                <line class="tn-plein" x1="${x1}" y1="${Y}" x2="${x2}" y2="${Y}"/>
                ${fleche ? `<polygon class="tn-fleche" points="${fleche}"/>` : ''}
                <rect class="tn-cible" x="${Math.min(x1, x2)}" y="${Y - 26}"
                      width="${Math.abs(x2 - x1)}" height="52"/>
            </g>`;
        const pointeG = `${BORD - 10},${Y} ${BORD + 2},${Y - 7} ${BORD + 2},${Y + 7}`;
        const pointeD = `${W - BORD + 10},${Y} ${W - BORD - 2},${Y - 7} ${W - BORD - 2},${Y + 7}`;
        const croix = (x, nom) => `
            <g class="tn-pt">
                <line x1="${x - 6}" y1="${Y - 6}" x2="${x + 6}" y2="${Y + 6}"/>
                <line x1="${x - 6}" y1="${Y + 6}" x2="${x + 6}" y2="${Y - 6}"/>
                <text class="tn-nom" x="${x}" y="${Y - 16}" text-anchor="middle">${nom}</text>
            </g>`;
        return `
        <svg class="tn-svg" viewBox="0 0 ${W} ${H}" role="img"
             aria-label="Le trait à construire, en trois morceaux">
            ${seg('avant', BORD, XA, pointeG)}
            ${seg('entre', XA, XB, null)}
            ${seg('apres', XB, W - BORD, pointeD)}
            ${croix(XA, gauche)}
            ${croix(XB, droite)}
        </svg>`;
    }

    function render(item) {
        const m = item.meta || {};
        // Les lettres DESSINÉES ne sont pas forcément dans l'ordre de
        // l'écriture : [BA) se trace avec A à gauche comme n'importe quel
        // autre objet, et c'est bien là tout le piège de l'origine.
        const gauche = m.gauche || m.a || 'A';
        const droite = m.droite || m.b || 'B';
        trace = traceVide();

        container.innerHTML = `
            <div class="tn-layout">
                <div class="tn-contexte">
                    ${avis ? `<div class="tn-avis">${avis}</div>` : ''}
                    ${item.prompt.html}
                </div>
                <div class="tn-panel">
                    <div class="tn-scene" data-scene>${svg(gauche, droite)}</div>
                    <div class="tn-lecture" aria-live="polite" data-lecture>&nbsp;</div>
                    <button type="button" class="tn-valider" data-valider>Valider</button>
                    <div class="tn-note" data-note></div>
                    ${hintBar(session)}
                </div>
            </div>`;

        avis = '';
        const sceneEl = container.querySelector('[data-scene]');
        const lectureEl = container.querySelector('[data-lecture]');
        const noteEl = container.querySelector('[data-note]');
        const btnValider = container.querySelector('[data-valider]');

        /** Repeindre : ce qui est allumé, et ce que le trait se trouve désigner. */
        const peindre = () => {
            MORCEAUX.forEach(nom => {
                const g = sceneEl.querySelector(`[data-morceau="${nom}"]`);
                if (g) g.classList.toggle('tn-morceau--pris', !!trace[nom]);
            });
            sceneEl.classList.remove('tn-scene--ok', 'tn-scene--ko');
            noteEl.textContent = '';
            // ON LIT LE TRAIT À VOIX HAUTE, en direct. C'est le retour qui fait
            // comprendre la notation : on bouge un morceau, le nom change.
            const e = ecritureDe(trace, gauche, droite);
            lectureEl.textContent = e ? `Tu as tracé ${e}` : ' ';
            lectureEl.classList.toggle('tn-lecture--vide', !e);
        };

        if (session.isDemo) {
            if (!session.frozen) runDemo(item, gauche, droite, peindre, sceneEl, lectureEl);
            return;
        }

        wireHint(container, session);

        const valider = () => {
            if (destroyed) return;
            const bilan = verifierTrace(trace, String(item.answer), gauche, droite);
            // Un tracé qui ne désigne rien N'EST PAS UNE RÉPONSE : on le dit et
            // l'on rend la main, sans compter une erreur. Compter faux un élève
            // qui n'a pas fini de dessiner, c'est noter sa lenteur.
            if (bilan.obtenu === null) { noteEl.textContent = bilan.message; return; }

            const result = session.submit(bilan.obtenu, { element: sceneEl });
            if (result.ignored) return;
            sceneEl.classList.toggle('tn-scene--ok', result.correct);
            sceneEl.classList.toggle('tn-scene--ko', !result.correct);
            noteEl.textContent = bilan.message;

            result.dismissed.then(() => {
                if (destroyed) return;
                if (result.correct) return renderNext();
                if (result.revealed) {
                    // On MONTRE le bon tracé avant de passer : voir la réponse
                    // se dessiner vaut mieux que la lire.
                    trace = traceAttendue(String(item.answer), gauche, droite);
                    peindre();
                    sceneEl.classList.add('tn-scene--ok');
                    lectureEl.textContent = `C'est ${item.answer}`;
                    regTimeout(renderNext, 2000);
                } else {
                    peindre();
                }
            });
        };

        sceneEl.querySelectorAll('[data-morceau]').forEach(g => {
            g.addEventListener('click', () => {
                if (session.locked) return;
                const nom = g.dataset.morceau;
                trace = { ...trace, [nom]: !trace[nom] };
                peindre();
            });
        });
        btnValider.onclick = valider;
        peindre();
    }

    /** Le tracé qui correspond à une écriture — pour la correction et le robot. */
    function traceAttendue(ecriture, gauche, droite) {
        const lettres = ecriture.replace(/[^A-Z]/g, '');
        const type = ecriture.startsWith('(') ? 'droite'
            : ecriture.endsWith(']') ? 'segment' : 'demi-droite';
        return traceDe(type, lettres[0], lettres[1], gauche);
    }

    /** Le robot construit le trait morceau par morceau, en disant pourquoi. */
    async function runDemo(item, gauche, droite, peindre, sceneEl, lectureEl) {
        if (!cursor) cursor = createDemoCursor();
        if (!gate) gate = createDemoGate(container);
        if (!await gate.waitTurn() || destroyed) return;
        if (!await cursor.pause(600) || destroyed) return;

        const bon = traceAttendue(String(item.answer), gauche, droite);
        const contexte = container.querySelector('.tn-contexte');
        cursor.say(`Je dois tracer ${item.answer}. Je regarde ce que disent les deux symboles : `
            + 'un crochet arrête le trait, une parenthèse le laisse filer.', contexte || container);
        if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;

        for (const nom of MORCEAUX) {
            if (!bon[nom]) continue;
            if (!await gate.waitTurn() || destroyed) return;
            const g = sceneEl.querySelector(`[data-morceau="${nom}"]`);
            cursor.say(`Je prends ${roleDuMorceau(nom, gauche, droite)}.`, g || sceneEl);
            trace = { ...trace, [nom]: true };
            peindre();
            if (!await cursor.pause(DEMO_SPEED.settle) || destroyed) return;
        }
        if (!await gate.waitTurn() || destroyed) return;
        cursor.say(`Et ce que j'ai tracé s'écrit ${item.answer}.`, lectureEl || sceneEl);
        await cursor.pause(DEMO_SPEED.between);
    }

    // UNE QUESTION DÉJÀ TIRÉE PEUT ÊTRE PASSÉE EN ARRIVANT (`opts.item`) :
    // c'est ce qui permet au QCM de passer la main. Il a fallu générer la
    // question pour savoir qu'elle se traçait ; la retirer ici en poserait une
    // autre, et l'élève verrait la sienne disparaître avant d'y avoir touché.
    if (opts.item) render(opts.item); else renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            if (cursor) { cursor.destroy(); cursor = null; }
            if (gate) { gate.destroy(); gate = null; }
            container.innerHTML = '';
        }
    };
}
