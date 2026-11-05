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
import { hintBar, wireHint } from './choice.js';
import { createDemoCursor, DEMO_SPEED } from '../demoPointer.js';
import { meneurDemo } from '../meneurDemo.js';

/** Le barème : cent points, moins huit par degré d'écart. */
export function pointsDe(ecart) {
    return Math.max(0, 100 - 8 * Math.abs(ecart));
}

/** Ce qu'on dit à l'élève, selon l'écart. Jamais « faux ». */
export function motDeLEcart(ecart) {
    const e = Math.abs(ecart);
    if (e === 0) return 'PILE POIL ! Au degré près.';
    if (e <= 2) return 'À un cheveu près.';
    if (e <= 5) return 'Tu n\'es pas loin !';
    if (e <= 10) return 'Pas mal — affine ton repère.';
    if (e <= 20) return 'Un peu loin. Compare à l\'angle droit.';
    return 'Très loin. Regarde si l\'angle est plus ouvert ou plus fermé qu\'un droit.';
}

/** Le sommet et le rayon du dessin, en unités de la vue SVG. */
const O = { x: 310, y: 205 };
const RAYON = 168;
const RAYON_SECTEUR = 92;

/** Un point du cercle, en degrés trigonométriques (l'axe y de SVG descend). */
const surLeCercle = (deg, r) => ({
    x: O.x + Math.cos(deg * Math.PI / 180) * r,
    y: O.y - Math.sin(deg * Math.PI / 180) * r
});

/**
 * Le chemin d'un secteur, du départ et sur `ouverture` degrés.
 *
 * `sweep-flag` VAUT ZÉRO, et ce n'est pas un détail : l'axe y de SVG descend,
 * donc le sens trigonométrique s'y dessine en « négatif ». Avec 1, tous les
 * secteurs seraient le complément de celui qu'on veut — un angle de 60°
 * s'afficherait à 300°, et l'exercice entier mentirait.
 */
export function cheminSecteur(depart, ouverture, r) {
    const a = surLeCercle(depart, r);
    const b = surLeCercle(depart + ouverture, r);
    // DEUX DRAPEAUX, ET LES DEUX DÉPENDENT DU SIGNE. L'écart entre le pari et
    // l'angle vrai est NÉGATIF quand on a parié trop bas : l'arc se parcourt
    // alors dans l'autre sens, et un `sweep` figé à zéro dessinerait le
    // complément — c'est-à-dire la part qu'on n'a PAS ratée. De même, c'est la
    // VALEUR ABSOLUE qui décide du grand arc.
    const grand = Math.abs(ouverture) > 180 ? 1 : 0;
    const sens = ouverture < 0 ? 1 : 0;
    return `M ${O.x} ${O.y} L ${a.x.toFixed(1)} ${a.y.toFixed(1)} `
        + `A ${r} ${r} 0 ${grand} ${sens} ${b.x.toFixed(1)} ${b.y.toFixed(1)} Z`;
}

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
                    <svg class="ea-dessin" viewBox="0 0 620 410" role="img"
                         aria-label="Un angle à estimer" data-ea-dessin></svg>
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
        const m = item.meta;
        const svg = container.querySelector('[data-ea-dessin]');
        if (!svg) return;
        const cote = (deg, classe, r = RAYON) => {
            const p = surLeCercle(deg, r);
            return `<line class="${classe}" x1="${O.x}" y1="${O.y}" `
                + `x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}"/>`;
        };
        let dedans = '';
        // LE PAPIER : des points, jamais un quadrillage. Un quadrillage
        // donnerait des directions à 45° et l'on mesurerait la géométrie au
        // lieu de l'œil.
        for (let y = 18; y < 410; y += 26) {
            for (let x = 18; x < 620; x += 26) {
                dedans += `<circle class="ea-grain" cx="${x}" cy="${y}" r="1.2"/>`;
            }
        }
        dedans += `<path class="ea-secteur" d="${cheminSecteur(m.depart, m.angle, RAYON_SECTEUR)}"/>`;
        dedans += `<path class="ea-arc" d="${cheminSecteur(m.depart, m.angle, RAYON_SECTEUR)}"/>`;
        dedans += cote(m.depart, 'ea-cote');
        dedans += cote(m.depart + m.angle, 'ea-cote');

        if (paris !== null) {
            const ecart = paris - m.angle;
            // L'ÉCART HACHURÉ entre le vrai et le pari : c'est la part de
            // camembert qu'on a ratée, et elle se regarde.
            dedans += `<path class="ea-ecart" d="${
                cheminSecteur(m.depart + m.angle, ecart, 142)}"/>`;
            dedans += cote(m.depart + paris, 'ea-pariCote', RAYON - 30);
            // LA PASTILLE DE L'ÉCART RESTE DANS LE CADRE. À cinq degrés les
            // deux traits se touchent presque : le nombre posé entre eux
            // devient illisible, d'où le rayon plus grand. Mais un angle qui
            // pointe vers le haut l'envoyait alors HORS de la vue, et la seule
            // chose qu'on voulait montrer était la seule qu'on ne voyait pas.
            const brut = surLeCercle(m.depart + m.angle + ecart / 2, RAYON + 34);
            const mi = {
                x: Math.max(36, Math.min(584, brut.x)),
                y: Math.max(26, Math.min(384, brut.y))
            };
            dedans += `<g class="ea-bulle" transform="translate(${mi.x.toFixed(1)} ${mi.y.toFixed(1)})">
                <rect x="-30" y="-17" width="60" height="34" rx="11"/>
                <text x="0" y="7" text-anchor="middle">${Math.abs(ecart)}°</text></g>`;
            const dans = surLeCercle(m.depart + m.angle / 2, RAYON_SECTEUR * .62);
            dedans += `<text class="ea-vrai" x="${dans.x.toFixed(1)}" y="${
                (dans.y + 7).toFixed(1)}" text-anchor="middle">${m.angle}°</text>`;
        } else {
            const dans = surLeCercle(m.depart + m.angle / 2, RAYON_SECTEUR * .62);
            dedans += `<text class="ea-mystere" x="${dans.x.toFixed(1)}" y="${
                (dans.y + 9).toFixed(1)}" text-anchor="middle">?</text>`;
        }
        dedans += `<circle class="ea-sommet" cx="${O.x}" cy="${O.y}" r="8.5"/>`;
        dedans += `<circle class="ea-sommetBlanc" cx="${O.x}" cy="${O.y}" r="3.4"/>`;
        svg.innerHTML = dedans;
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
        const pts = pointsDe(ecart);
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
