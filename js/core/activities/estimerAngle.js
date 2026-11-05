// « À VUE D'ŒIL » — l'écran où l'on parie sur la mesure d'un angle.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 5 novembre : « j'aimerai bien un exercice où l'élève doit deviner la
// mesure d'un angle et plus il est proche, plus il a de points […] Il faut que
// ce soit joli et fun ».
//
// ── CE QUE L'ÉCRAN NE MONTRE PAS, ET C'EST LE PLUS IMPORTANT ───────────────
//
//   · AUCUNE GRADUATION, aucun quadrillage, aucun repère d'angle. Un fond
//     quadrillé donnerait des directions à 45° et l'on ne mesurerait plus
//     l'œil, mais la géométrie.
//   · AUCUN RETOUR AVANT LE PARI. Le nombre ne s'accompagne d'aucun trait qui
//     bougerait avec lui : sinon on ajusterait jusqu'à ce que ça colle, et
//     l'exercice deviendrait un jeu d'adresse au lieu d'un exercice
//     d'estimation. C'est la seule raison pour laquelle on n'a pas mis de
//     curseur, qui serait pourtant plus agréable.
//
// ── CE QU'IL MONTRE APRÈS, ET POURQUOI ─────────────────────────────────────
//
// Le pari s'affiche EN POINTILLÉ par-dessus l'angle vrai, et l'écart est
// hachuré entre les deux. On VOIT son erreur au lieu de la lire : cinq degrés
// de trop, ce n'est pas « 5 », c'est cette mince part de camembert — et c'est
// ce qui construit le repère pour la fois suivante.
//
// ── DEUX COMPTES SÉPARÉS, ET C'EST VOULU ───────────────────────────────────
//
//   · LES POINTS sont continus : cent si l'on tombe pile, huit de moins par
//     degré d'écart. C'est ce qui rend le jeu motivant, et c'est ce qui
//     alimentera le tableau de la classe.
//   · LA RÉUSSITE est franche : ±5° par défaut (réglage `tolerance`). Un
//     barème continu n'est pas une maîtrise, et le bilan d'un professeur
//     rempli de demi-réussites ne se lit pas.

import { regTimeout } from '../timers.js';
import {
    VUE, dessinDeLAngle, motDeLEcart, pointsDeLEcart
} from '../anglesDessin.js';
import { hintBar, wireHint } from './choice.js';
import { createDemoCursor, DEMO_SPEED } from '../demoPointer.js';
import { meneurDemo } from '../meneurDemo.js';

// LE BARÈME, LES PHRASES ET LE DESSIN VIVENT DANS LE NOYAU, et c'est une
// nécessité : LE DÉFI DE LA CLASSE montre le même angle et compte les mêmes
// points. Deux copies dériveraient, et le jour où l'une corrige un drapeau
// d'arc sans l'autre, les trente élèves du défi estiment autre chose que ce
// que l'exercice leur a appris.
export { cheminSecteur, motDeLEcart } from '../anglesDessin.js';
export { pointsDeLEcart as pointsDe } from '../anglesDessin.js';

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let cursor = null;
    let item = null;
    let pari = 45;
    let repondu = false;
    let total = 0;

    function renderNext() {
        if (destroyed) return;
        item = session.next();
        // ON REPART DE QUARANTE-CINQ À CHAQUE QUESTION, et non du pari
        // précédent : garder le dernier nombre souffle une réponse, et deux
        // angles voisins se suivent parfois.
        pari = 45;
        repondu = false;
        render();
    }

    function render() {
        const m = item.meta;
        container.innerHTML = `
            <div class="ea-layout">
                <div class="game-question ea-question">Combien mesure cet angle ?</div>
                <div class="ea-scene">
                    <svg class="ea-dessin" viewBox="0 0 ${VUE.largeur} ${VUE.hauteur}"
                         role="img" aria-label="Un angle à estimer" data-ea-dessin></svg>
                    <div class="ea-total" data-ea-total>${total} pts</div>
                </div>
                <div class="ea-verdict" data-ea-verdict hidden></div>
                <div class="ea-pari" data-ea-pari>
                    <button type="button" class="ea-pm" data-ea-pas="-10"
                        aria-label="Dix degrés de moins">−10</button>
                    <button type="button" class="ea-pm" data-ea-pas="-1"
                        aria-label="Un degré de moins">−1</button>
                    <div class="ea-champ">
                        <b data-ea-valeur>${pari}°</b>
                        <span>ton pari</span>
                    </div>
                    <button type="button" class="ea-pm" data-ea-pas="1"
                        aria-label="Un degré de plus">+1</button>
                    <button type="button" class="ea-pm" data-ea-pas="10"
                        aria-label="Dix degrés de plus">+10</button>
                </div>
                <button type="button" class="ea-go" data-ea-go>Je parie !</button>
                ${hintBar(session)}
            </div>`;
        dessiner(null);
        brancher();
        wireHint(container, session);
    }

    /** Dessine l'angle, et le pari par-dessus si l'on a déjà parié. */
    function dessiner(paris) {
        const svg = container.querySelector('[data-ea-dessin]');
        if (svg) svg.innerHTML = dessinDeLAngle(item.meta, paris);
    }

    function brancher() {
        container.querySelectorAll('[data-ea-pas]').forEach(b => {
            b.onclick = () => bouger(Number(b.dataset.eaPas));
        });
        const go = container.querySelector('[data-ea-go]');
        if (go) go.onclick = parier;
        // LES FLÈCHES DU CLAVIER AUSSI : au tableau, Rémy n'a pas toujours la
        // souris en main. Entrée parie.
        container.querySelectorAll('.ea-layout').forEach(el => { el.tabIndex = -1; });
        clavier = (e) => {
            if (destroyed) return;
            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') bouger(1);
            else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') bouger(-1);
            else if (e.key === 'PageUp') bouger(10);
            else if (e.key === 'PageDown') bouger(-10);
            else if (e.key === 'Enter') { if (!repondu) parier(); }
            else return;
            e.preventDefault();
        };
        document.addEventListener('keydown', clavier);
    }
    let clavier = null;

    function bouger(pas) {
        if (repondu) return;
        pari = Math.max(1, Math.min(359, pari + pas));
        const el = container.querySelector('[data-ea-valeur]');
        if (el) el.textContent = `${pari}°`;
    }

    function parier() {
        if (repondu || !item) return;
        repondu = true;
        const m = item.meta;
        const ecart = pari - m.angle;
        const pts = pointsDeLEcart(ecart);
        total += pts;
        dessiner(pari);

        const juste = Math.abs(ecart) <= m.tolerance;
        const v = container.querySelector('[data-ea-verdict]');
        if (v) {
            v.hidden = false;
            v.className = `ea-verdict ea-verdict--${
                Math.abs(ecart) <= 2 ? 'pile' : juste ? 'bien' : 'loin'}`;
            v.innerHTML = `
                <div class="ea-pastille">+${pts}<small>points</small></div>
                <p><b>${motDeLEcart(ecart)}</b><br>
                   Tu as dit <b>${pari}°</b>, c'était <b>${m.angle}°</b>.</p>`;
        }
        const t = container.querySelector('[data-ea-total]');
        if (t) t.textContent = `${total} pts`;
        const pariEl = container.querySelector('[data-ea-pari]');
        if (pariEl) pariEl.hidden = true;
        const go = container.querySelector('[data-ea-go]');
        if (go) go.hidden = true;

        // ON SOUMET LA BONNE RÉPONSE QUAND ON EST DANS LA TOLÉRANCE, et le
        // pari sinon : le verdict de la session reste une comparaison exacte,
        // et c'est l'activité qui applique la tolérance. Même contrat que le
        // rapporteur (`activities/angles.js`).
        //
        // ET L'ON PASSE NOTRE PROPRE PHRASE EN DIAGNOSTIC. Sans elle, la carte
        // de correction annonce « CE N'EST PAS ÇA », qui est exactement ce
        // qu'on ne veut pas dire ici : ON N'EST PAS JUSTE OU FAUX QUAND ON
        // ESTIME, on est plus ou moins près. Un élève à sept degrés a bien
        // travaillé ; lui répondre « ce n'est pas ça » lui apprend qu'estimer
        // ne sert à rien.
        const res = session.submit(juste ? item.answer : String(pari), {
            misconception: `${motDeLEcart(ecart)} Tu as dit ${pari}°, `
                + `c'était ${m.angle}° — ${Math.abs(ecart)}° d'écart.`,
            dire: { given: `${pari}°`, expected: `${m.angle}°` }
        });
        if (res && res.ignored) return;
        // ON ENCHAÎNE QUAND L'ÉLÈVE A FERMÉ LE RETOUR, pas sur un minuteur :
        // c'est le contrat des activités, et cela laisse le temps de regarder
        // son écart aussi longtemps qu'on veut.
        if (res && res.dismissed && typeof res.dismissed.then === 'function') {
            res.dismissed.then(() => { if (!destroyed) renderNext(); });
        } else {
            regTimeout(() => { if (!destroyed) renderNext(); }, juste ? 1700 : 2600);
        }
    }

    /**
     * LE ROBOT MONTRE COMMENT ON S'Y PREND, et non la réponse.
     *
     * Il dit à voix haute le geste qui fait tout l'exercice : chercher
     * l'angle droit d'abord, puis affiner. Un robot qui taperait directement
     * la bonne valeur n'enseignerait rien — il prouverait seulement qu'on
     * peut gagner.
     */
    async function montrer() {
        const m = item.meta;
        const robot = meneurDemo(session, container);
        cursor = cursor || createDemoCursor(container);
        const fin = () => { if (cursor) { cursor.destroy(); cursor = null; } };
        cursor.say(m.angle < 90
            ? 'Je cherche d\'abord l\'angle droit : celui-ci est PLUS FERMÉ qu\'un coin de feuille.'
            : m.angle <= 180
                ? 'Je cherche d\'abord l\'angle droit : celui-ci est PLUS OUVERT qu\'un coin de feuille.'
                : 'Celui-ci dépasse l\'angle plat : je regarde ce qui MANQUE pour un tour entier.',
            container.querySelector('.ea-dessin'));
        if (!await robot.pause(2600)) return fin();
        const vise = Math.round(m.angle / 10) * 10;
        cursor.say(`Je dirais « dans les ${vise}° ». Je monte mon pari jusque-là.`,
            container.querySelector('.ea-champ'));
        if (!await robot.pause(2000)) return fin();
        while (pari < vise - 9 && !destroyed) {
            bouger(10);
            if (!await robot.pause(220)) return fin();
        }
        while (pari < vise && !destroyed) {
            bouger(1);
            if (!await robot.pause(90)) return fin();
        }
        if (destroyed) return fin();
        const bouton = container.querySelector('[data-ea-go]');
        if (bouton && !await cursor.tap(bouton, 800)) return fin();
        if (!bouton) parier();
        cursor.say('Et l\'on voit l\'écart : c\'est lui qui construit le repère pour la fois d\'après.',
            container.querySelector('.ea-dessin'));
        if (!await robot.pause(DEMO_SPEED.between + 1400)) return fin();
        fin();
    }

    renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        runDemo: montrer,
        destroy() {
            destroyed = true;
            if (clavier) document.removeEventListener('keydown', clavier);
            if (cursor) { cursor.destroy(); cursor = null; }
            container.innerHTML = '';
            session.finish();
        }
    };
}
