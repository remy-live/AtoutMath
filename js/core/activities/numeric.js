// Activité « saisie numérique » (pavé).
//
// Nouveau genre de réponse : l'élève produit le nombre au lieu de le
// reconnaître parmi des propositions. C'est didactiquement très différent —
// pas de reconnaissance possible, pas d'élimination — et cela ouvre les
// notions où proposer des choix serait artificiel (aire, périmètre, calcul
// posé). Aucun générateur n'a eu besoin d'être modifié pour en profiter.

import { regTimeout } from '../timers.js';
import { espacerMilliers, FINE } from '../nombres.js';
import { hintBar, wireHint } from './choice.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';

const DIGITS = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];

/**
 * Le pavé porte une VIRGULE, comme tout ce qu'on écrit en français ; JavaScript,
 * lui, rend `0.2`. Le robot cherchait donc une touche « . » qui n'existe pas :
 * il sautait le séparateur en silence et affichait « 0.2 » à l'écran — soit la
 * seule notation que l'élève ne doit jamais écrire.
 */
const enFrancais = (v) => String(v).replace('.', ',');

/**
 * Ce que le robot dit AVANT de taper, et APRÈS avoir validé.
 *
 * Les générateurs fournissent déjà un indice et une explication : ce sont eux
 * qu'il faut faire entendre, pas une phrase creuse. Mais une bulle se lit à
 * 340 ms le mot, plafonnée à quatorze secondes — une explication de trois
 * lignes fige la démonstration si longtemps qu'on la croit plantée. On ne
 * parle donc à voix haute que ce qui tient en une respiration ; au-delà, une
 * phrase courte qui dit la même chose du geste, et l'explication complète
 * reste disponible dans la correction.
 */
const COURT = 110;
const tientEnUneBulle = (t) => typeof t === 'string' && t.trim() && t.trim().length <= COURT;

function phraseDepart(item) {
    const indice = (item.hints || [])[0];
    if (tientEnUneBulle(indice)) return indice.trim();
    return 'Je lis l\'énoncé en entier avant de toucher une touche.';
}

function phraseFin(item) {
    if (tientEnUneBulle(item.explanation)) return item.explanation.trim();
    return 'Je relis mon nombre, puis je valide.';
}

const ICON_BACKSPACE = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M20 5H9l-6 7 6 7h11a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><line x1="17" y1="9" x2="11" y2="15"/><line x1="11" y1="9" x2="17" y2="15"/></svg>`;

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let buffer = '';
    // UN MOT QUAND LA FORME CHANGE. Le QCM qui passe au pavé au milieu de
    // l'exercice surprend : sans un mot, l'élève croit s'être trompé de jeu.
    // Il ne s'affiche qu'une fois — la question suivante n'est plus une
    // surprise.
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

    /**
     * LES OUTILS DE L'EXERCICE — un rappel, jamais une réponse.
     *
     * Rémy, sur Temps / Distance / Vitesse : « on pourrait avoir un bouton
     * schéma et un bouton formule (mais pas valable tout le temps) ».
     *
     * « PAS VALABLE TOUT LE TEMPS » EST LA CLÉ, et c'est pour cela que c'est
     * l'ITEM qui les déclare et non l'activité : un rappel de formule n'a de
     * sens que là où il y a une formule, un schéma que là où il y a une
     * situation à dessiner. Un exercice qui n'en propose pas n'affiche rien.
     *
     * ILS SONT GRATUITS, et c'est un choix. Un indice DIT quelque chose sur la
     * question posée, et se paie donc en points ; ces outils-là remettent
     * l'énoncé en image ou rappellent ce qui est écrit au tableau pour toute
     * la classe. La grandeur cherchée y porte un « ? » : ils ne résolvent rien.
     */
    function barreOutils(item) {
        const outils = (item.meta && item.meta.outils) || [];
        if (!outils.length) return '';
        return `<div class="np-outils">${outils.map((o, i) =>
            `<button type="button" class="np-outil-btn" data-outil-i="${i}"
                aria-expanded="false">${echapperTexte(o.label)}</button>`).join('')}</div>`;
    }

    function brancherOutils(item) {
        const outils = (item.meta && item.meta.outils) || [];
        const boite = container.querySelector('[data-outil]');
        if (!outils.length || !boite) return;
        let ouvert = -1;
        const montrer = (i) => {
            ouvert = i;
            // LE PANNEAU PORTE SON NOM ET SA CROIX. Sur téléphone il recouvre
            // le plateau — le bouton qui l'a ouvert est dessous, et sans cette
            // croix on ne saurait plus comment revenir à la question.
            boite.innerHTML = i < 0 ? '' : `<div class="np-outil-tete">
                <b>${echapperTexte(outils[i].label)}</b>
                <button type="button" class="np-outil-fermer" data-outil-fermer
                    aria-label="Fermer">✕</button></div>${outils[i].html}`;
            boite.hidden = i < 0;
            const croix = boite.querySelector('[data-outil-fermer]');
            if (croix) croix.onclick = () => montrer(-1);
            container.querySelectorAll('[data-outil-i]').forEach(b =>
                b.setAttribute('aria-expanded', String(Number(b.dataset.outilI) === i)));
        };
        container.querySelectorAll('[data-outil-i]').forEach(btn => {
            // Le même bouton referme : deux panneaux ouverts l'un sur l'autre
            // pousseraient le pavé numérique hors de l'écran.
            btn.onclick = () => montrer(ouvert === Number(btn.dataset.outilI)
                ? -1 : Number(btn.dataset.outilI));
        });
    }

    function render(item) {
        const unit = item.meta && item.meta.unit ? item.meta.unit : '';
        // La virgule n'apparaît que si la réponse peut être décimale. Une
        // touche inutilisable sur un périmètre entier n'est pas neutre : elle
        // suggère qu'on attend peut-être des décimales.
        const decimal = item.meta && item.meta.decimal !== undefined
            ? item.meta.decimal
            : !Number.isInteger(Number(item.answer));

        // Deux colonnes dès qu'il y a la place : énoncé et figure à gauche,
        // saisie à droite. En une seule colonne, l'ensemble énoncé + figure +
        // pavé + validation dépassait la hauteur d'écran et imposait un
        // défilement au milieu d'une question.
        container.innerHTML = `
            <div class="numpad-layout">
                <div class="numpad-context">
                    ${avis ? `<div class="numpad-avis">${avis}</div>` : ''}
                    ${item.prompt.html}
                    ${barreOutils(item)}
                    <div class="np-outil" data-outil hidden></div></div>
                <div class="numpad-panel">
                    <div class="numpad-device">
                    <div class="numpad-screen" aria-live="polite">
                        <span class="numpad-value" data-display></span>
                        <span class="numpad-caret" data-caret></span>
                        ${unit ? `<span class="numpad-unit">${unit}</span>` : ''}
                    </div>
                    <div class="numpad" role="group" aria-label="Pavé numérique">
                        ${DIGITS.map(k => key(k)).join('')}
                        ${decimal ? key(',') : '<span class="numpad-blank" aria-hidden="true"></span>'}
                        ${key('0')}
                        <button type="button" class="numpad-key numpad-key--del" data-key="←"
                                aria-label="Effacer le dernier chiffre">${ICON_BACKSPACE}</button>
                        <button type="button" class="numpad-key numpad-key--ok" data-validate>Valider</button>
                    </div>
                    </div>
                    ${hintBar(session)}
                </div>
            </div>`;

        avis = '';
        const display = container.querySelector('[data-display]');
        const screen = container.querySelector('.numpad-screen');
        // LE NOMBRE SE GROUPE SOUS LES DOIGTS. « 62307 » ne s'écrit pas :
        // on écrit « 62 307 », et c'est ce découpage de trois en trois qui
        // permet de LIRE le nombre à voix haute. Un élève de numération qui
        // tape six chiffres à la file et voit « 620307 » ne peut pas se
        // relire — c'est précisément l'erreur qu'on veut lui faire éviter.
        //
        // Seul l'AFFICHAGE est groupé : `buffer` garde les chiffres nus, et
        // c'est lui qu'on envoie à la validation.
        const setBuffer = (v) => {
            buffer = v;
            // UN GROUPE PAR ÉLÉMENT, pas une simple espace fine dans le texte :
            // à la taille de l'écran du pavé, la fine ne se voit pas, et
            // « 1234567 » restait un mur de chiffres. C'est la CSS qui donne
            // au blanc la largeur qu'il faut.
            display.textContent = '';
            espacerMilliers(buffer).split(FINE).forEach(groupe => {
                const g = document.createElement('span');
                g.className = 'numpad-groupe';
                g.textContent = groupe;
                display.appendChild(g);
            });
            screen.classList.toggle('numpad-screen--empty', buffer === '');
        };
        setBuffer('');

        if (session.isDemo) {
            if (!session.frozen) runDemo(enFrancais(item.answer), setBuffer, screen, item);
            return;
        }

        wireHint(container, session);
        brancherOutils(item);

        const validate = () => {
            if (destroyed || buffer === '') return;
            const result = session.submit(buffer, { element: display });
            if (result.ignored) return;

            // L'état se joue sur l'écran entier, pas sur le seul nombre :
            // le retour est ainsi lisible d'un coup d'œil.
            screen.classList.toggle('numpad-screen--ok', result.correct);
            screen.classList.toggle('numpad-screen--ko', !result.correct);

            // La suite attend que l'élève ait fermé la correction.
            result.dismissed.then(() => {
                if (destroyed) return;

                if (result.correct) { renderNext(); return; }

                if (result.revealed) {
                    setBuffer(enFrancais(item.answer));
                    screen.classList.remove('numpad-screen--ko');
                    screen.classList.add('numpad-screen--ok');
                    regTimeout(renderNext, 1600);
                } else {
                    screen.classList.remove('numpad-screen--ko');
                    setBuffer('');
                }
            });
        };

        container.querySelectorAll('[data-key]').forEach(btn => {
            btn.onclick = () => {
                if (session.locked) return;
                const k = btn.dataset.key;
                if (k === '←') setBuffer(buffer.slice(0, -1));
                else if (k === ',') { if (!buffer.includes(',') && buffer !== '') setBuffer(buffer + ','); }
                else if (buffer.length < 7) setBuffer(buffer + k);
            };
        });
        container.querySelector('[data-validate]').onclick = validate;

        // Saisie au clavier physique : indispensable sur poste fixe.
        container.tabIndex = -1;
        container.focus({ preventScroll: true });
        container.onkeydown = (e) => {
            if (session.locked) return;
            if (/^[0-9]$/.test(e.key)) { setBuffer(buffer + e.key); e.preventDefault(); }
            else if (e.key === 'Backspace') { setBuffer(buffer.slice(0, -1)); e.preventDefault(); }
            else if (e.key === ',' || e.key === '.') { if (!buffer.includes(',')) setBuffer(buffer + ','); e.preventDefault(); }
            else if (e.key === 'Enter') { validate(); e.preventDefault(); }
        };
    }

    /**
     * Démonstration : le pointeur tape la réponse touche par touche, puis
     * valide. Le nombre qui apparaissait tout seul à l'écran ne disait pas d'où
     * il venait ; ici on voit le chemin, chiffre après chiffre.
     *
     * ET LE ROBOT PARLE. Il se contentait de taper : on voyait donc le GESTE
     * — appuyer sur 4, puis sur 2 — sans jamais le raisonnement, qui est
     * pourtant tout ce qu'il y a à apprendre. Un élève qui regarde une main
     * composer un numéro n'apprend pas le numéro. Deux conséquences : la
     * démonstration n'expliquait rien, et le bouton « Arrière », qui rappelle
     * les explications précédentes, n'avait rien à rappeler — il paraissait
     * cassé alors qu'il n'y avait simplement pas un mot à revoir.
     */
    async function runDemo(target, setBuffer, screen, item) {
        if (!cursor) cursor = createDemoCursor();
        if (!gate) gate = createDemoGate(container);
        if (!await gate.waitTurn() || destroyed) return;
        if (!await cursor.pause(600) || destroyed) return;

        const contexte = container.querySelector('.numpad-context');
        cursor.say(phraseDepart(item), contexte || container);
        if (!await cursor.pause(DEMO_SPEED.settle) || destroyed) return;

        if (!await gate.waitTurn() || destroyed) return;
        cursor.say(`Je tape ${target} chiffre par chiffre.`, screen);
        if (!await cursor.pause(DEMO_SPEED.press) || destroyed) return;

        for (let i = 0; i < target.length; i++) {
            const touche = container.querySelector(`[data-key="${cssEscape(target[i])}"]`);
            if (touche) {
                if (!await cursor.tap(touche, 420) || destroyed) return;
                touche.classList.add('numpad-key--demo');
                regTimeout(() => touche.classList.remove('numpad-key--demo'), 220);
            }
            setBuffer(target.slice(0, i + 1));
            if (!await cursor.pause(180) || destroyed) return;
        }

        const valider = container.querySelector('[data-validate]');
        if (!await cursor.tap(valider, 480) || destroyed) return;
        screen.classList.add('numpad-screen--ok');

        if (!await gate.waitTurn() || destroyed) return;
        cursor.say(phraseFin(item), screen);
        if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;
        renderNext();
    }

    // UNE QUESTION DÉJÀ TIRÉE PEUT ÊTRE PASSÉE EN ARRIVANT (`opts.item`).
    // C'est ce qui permet au QCM de passer la main au pavé en cours
    // d'exercice : il a fallu générer la question pour savoir si sa réponse
    // était un nombre, et la retirer ici en poserait une autre.
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
            session.finish();
        }
    };
}

// La virgule est une valeur d'attribut légitime mais un sélecteur invalide.
function cssEscape(c) {
    return window.CSS && CSS.escape ? CSS.escape(c) : c.replace(/,/g, '\\,');
}

function key(k) {
    return `<button type="button" class="numpad-key" data-key="${k}">${k}</button>`;
}

const echapperTexte = (s) => String(s == null ? '' : s)
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
