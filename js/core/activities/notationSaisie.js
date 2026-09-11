// Activité « composer la notation » — la dernière marche de l'escalier de
// « segment, droite ou demi-droite ».
//
// L'élève ne choisit plus parmi quatre écritures : il POSE les deux symboles,
// un par extrémité, autour de deux points déjà nommés :
//
//        ⟦ ? ⟧  A  B  ⟦ ? ⟧
//
// Deux décisions au lieu d'une reconnaissance, et surtout deux réponses qu'on
// peut juger séparément — « ton crochet de gauche est juste, c'est la fin qui
// ne va pas ». Un QCM ne sait dire que « non ».
//
// Les règles (composition, vérification, diagnostic) vivent dans
// core/notationSaisie.js, sans DOM. Ici, l'écran.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';
import { GAUCHES, DROITES, SYMBOLES, composer, diagnostic } from '../notationSaisie.js';

const ditDe = (s) => (SYMBOLES.find(x => x.s === s) || {}).dit || '';

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let gauche = null;
    let droite = null;
    // UN MOT QUAND LA FORME CHANGE : l'exercice qui passait en propositions
    // demande soudain d'écrire. Sans une phrase, on croit s'être trompé de jeu.
    let avis = opts.avis || '';
    let cursor = null;
    let gate = null;

    function renderNext() {
        if (destroyed) return;
        const item = session.next();
        // L'escalier a pu redescendre : le QCM reprend la main, et cette
        // activité s'efface. Voir `rendreLaMain` dans choice.js.
        if (opts.rendreLaMain && opts.rendreLaMain(item)) return;
        render(item);
    }

    function render(item) {
        const m = item.meta || {};
        const a = m.a || 'A';
        const b = m.b || 'B';
        gauche = null;
        droite = null;

        const touche = (s) => `<button type="button" class="nt-touche" data-sym="${s}"
            title="${ditDe(s)}"><span class="nt-sym">${s}</span></button>`;

        container.innerHTML = `
            <div class="nt-layout">
                <div class="nt-contexte">
                    ${avis ? `<div class="nt-avis">${avis}</div>` : ''}
                    ${item.prompt.html}
                </div>
                <div class="nt-panel">
                    <div class="nt-ecriture" aria-live="polite" data-ecriture>
                        <button type="button" class="nt-fente" data-fente="gauche"
                                aria-label="Symbole du côté de ${a}">?</button>
                        <span class="nt-point">${a}</span>
                        <span class="nt-point">${b}</span>
                        <button type="button" class="nt-fente" data-fente="droite"
                                aria-label="Symbole du côté de ${b}">?</button>
                    </div>
                    <div class="nt-claviers">
                        <div class="nt-clavier">
                            <div class="nt-cote">Du côté de ${a}</div>
                            ${GAUCHES.map(touche).join('')}
                        </div>
                        <div class="nt-clavier">
                            <div class="nt-cote">Du côté de ${b}</div>
                            ${DROITES.map(touche).join('')}
                        </div>
                    </div>
                    <button type="button" class="nt-valider" data-valider disabled>Valider</button>
                    <div class="nt-note" data-note></div>
                    ${hintBar(session)}
                </div>
            </div>`;

        avis = '';
        const fentes = {
            gauche: container.querySelector('[data-fente="gauche"]'),
            droite: container.querySelector('[data-fente="droite"]')
        };
        const btnValider = container.querySelector('[data-valider]');
        const noteEl = container.querySelector('[data-note]');
        const ecritureEl = container.querySelector('[data-ecriture]');

        // `poser(null)` REDESSINE sans rien changer : c'est ce qu'on appelle
        // après avoir vidé une fente à la main. Sans ce cas, le `else` de la
        // ligne suivante écrasait le symbole de droite, et vider la gauche
        // effaçait les deux.
        const poser = (s) => {
            if (s !== null && s !== undefined) {
                if (GAUCHES.includes(s)) gauche = s; else droite = s;
            }
            fentes.gauche.textContent = gauche || '?';
            fentes.droite.textContent = droite || '?';
            fentes.gauche.classList.toggle('nt-fente--pleine', !!gauche);
            fentes.droite.classList.toggle('nt-fente--pleine', !!droite);
            ecritureEl.classList.remove('nt-ecriture--ok', 'nt-ecriture--ko');
            noteEl.textContent = '';
            btnValider.disabled = !(gauche && droite);
        };

        if (session.isDemo) {
            if (!session.frozen) runDemo(item, a, b, poser, ecritureEl);
            return;
        }

        wireHint(container, session);

        const valider = () => {
            if (destroyed || !gauche || !droite) return;
            const saisie = composer(gauche, a, b, droite);
            const d = diagnostic(saisie, item.answer);
            const result = session.submit(saisie, { element: ecritureEl });
            if (result.ignored) return;

            ecritureEl.classList.toggle('nt-ecriture--ok', result.correct);
            ecritureEl.classList.toggle('nt-ecriture--ko', !result.correct);
            // CE QUI EST JUSTE RESTE VERT. Tout invalider quand une seule
            // extrémité cloche efface le fait que l'élève a compris la moitié
            // de la règle — et c'est la moitié sur laquelle il faut s'appuyer.
            fentes.gauche.classList.toggle('nt-fente--juste', !!d.gaucheJuste);
            fentes.droite.classList.toggle('nt-fente--juste', !!d.droiteJuste);
            fentes.gauche.classList.toggle('nt-fente--faux', d.gaucheJuste === false);
            fentes.droite.classList.toggle('nt-fente--faux', d.droiteJuste === false);
            noteEl.textContent = d.message || '';

            result.dismissed.then(() => {
                if (destroyed) return;
                if (result.correct) return renderNext();
                if (result.revealed) {
                    const bon = String(item.answer);
                    fentes.gauche.textContent = bon[0];
                    fentes.droite.textContent = bon[bon.length - 1];
                    ecritureEl.classList.remove('nt-ecriture--ko');
                    ecritureEl.classList.add('nt-ecriture--ok');
                    regTimeout(renderNext, 1800);
                } else {
                    ecritureEl.classList.remove('nt-ecriture--ko');
                    // On efface SEULEMENT ce qui est faux : refaire poser un
                    // symbole déjà juste, c'est demander de rejouer ce qu'on a
                    // réussi, et l'élève finit par tout retaper au hasard.
                    if (d.gaucheJuste === false) gauche = null;
                    if (d.droiteJuste === false) droite = null;
                    poser(null);
                }
            });
        };

        container.querySelectorAll('[data-sym]').forEach(btn => {
            btn.onclick = () => { if (!session.locked) poser(btn.dataset.sym); };
        });
        // Taper la fente la vide : on se ravise sans avoir à reposer l'autre.
        Object.entries(fentes).forEach(([cote, el]) => {
            el.onclick = () => {
                if (session.locked) return;
                if (cote === 'gauche') gauche = null; else droite = null;
                poser(null);
            };
        });
        btnValider.onclick = valider;

        // Le clavier physique : les quatre symboles s'y trouvent, et c'est le
        // geste naturel sur un poste fixe.
        container.tabIndex = -1;
        container.focus({ preventScroll: true });
        container.onkeydown = (e) => {
            if (session.locked) return;
            if ([...GAUCHES, ...DROITES].includes(e.key)) { poser(e.key); e.preventDefault(); }
            else if (e.key === 'Enter') { valider(); e.preventDefault(); }
        };
    }

    /**
     * La démonstration : le robot DIT la règle avant de poser chaque symbole.
     * Le montrer poser deux caractères sans un mot n'apprendrait que le geste.
     */
    async function runDemo(item, a, b, poser, ecritureEl) {
        if (!cursor) cursor = createDemoCursor();
        if (!gate) gate = createDemoGate(container);
        if (!await gate.waitTurn() || destroyed) return;
        if (!await cursor.pause(600) || destroyed) return;

        const bon = String(item.answer);
        const g = bon[0], d = bon[bon.length - 1];
        const contexte = container.querySelector('.nt-contexte');

        cursor.say('Je regarde chaque bout du trait séparément : est-ce qu\'il s\'arrête, '
            + 'ou est-ce qu\'il continue ?', contexte || container);
        if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;

        for (const [sym, cote, point] of [[g, 'gauche', a], [d, 'droite', b]]) {
            if (!await gate.waitTurn() || destroyed) return;
            cursor.say(`Du côté de ${point}, ${ditDe(sym)} : je pose ${sym}.`,
                container.querySelector(`[data-fente="${cote}"]`) || container);
            const btn = container.querySelector(`[data-sym="${sym}"]`);
            if (btn && !await cursor.tap(btn)) return;
            poser(sym);
            if (!await cursor.pause(DEMO_SPEED.settle) || destroyed) return;
        }

        if (!await gate.waitTurn() || destroyed) return;
        ecritureEl.classList.add('nt-ecriture--ok');
        cursor.say(`Ça donne ${bon}. ${item.explanation || ''}`.trim(), ecritureEl);
        if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;
    }

    // UNE QUESTION DÉJÀ TIRÉE PEUT ÊTRE PASSÉE EN ARRIVANT (`opts.item`) :
    // c'est ce qui permet au QCM de passer la main en cours d'exercice. Il a
    // fallu générer la question pour savoir qu'elle se composait ; la retirer
    // ici en poserait une autre, et l'élève verrait la sienne disparaître.
    if (opts.item) render(opts.item); else renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            if (cursor) { cursor.destroy(); cursor = null; }
            if (gate) { gate.destroy(); gate = null; }
            container.onkeydown = null;
            container.innerHTML = '';
        }
    };
}
