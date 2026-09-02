// REPÉRER LES CÔTÉS — à l'écran.
//
// Rémy : « on va commencer un exercice sur la trigonométrie où il faut repérer
// le côté adjacent, l'opposé et l'hypoténuse ».
//
// QUATRE PARTIS PRIS.
//
//   · ON CLIQUE LE CÔTÉ SUR LA FIGURE, on ne choisit pas dans une liste de
//     noms. « AB, BC ou AC ? » se résout en comparant trois étiquettes ; le
//     vrai geste est de POSER LE DOIGT sur un segment, et c'est celui-là qu'il
//     faut automatiser. Un élève qui sait cliquer le bon côté saura l'écrire ;
//     l'inverse n'est pas vrai.
//
//   · LA FIGURE TOURNE À CHAQUE QUESTION. C'est la seule protection contre
//     l'apprentissage par l'image : un triangle toujours dessiné l'angle droit
//     en bas à gauche enseigne « adjacent = horizontal », qui s'effondre au
//     premier contrôle. Voir l'en-tête de core/trigonometrie.js.
//
//   · L'HYPOTÉNUSE VIENT EN PREMIER, ET ELLE RESTE À L'ÉCRAN. Une fois
//     trouvée, elle est marquée : c'est le point d'appui à partir duquel les
//     deux autres se déduisent, et le laisser visible fait faire à l'élève le
//     raisonnement qu'on veut lui donner — « l'adjacent, c'est l'autre ».
//
//   · LE REFUS NOMME LA CONFUSION. Prendre l'hypoténuse pour l'adjacent n'est
//     pas la même erreur que confondre adjacent et opposé, et l'on ne répond
//     pas la même chose. C'est tout l'intérêt de faire cet exercice à la
//     machine plutôt que sur une feuille.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    ROLES, LIBELLES, COURTS, tirerTriangle, rolesDe, pointsDe, questionsDe,
    verifier, conseil, laLecon, sommetDroit, sommetVise, memeCote, cotesDe, nomCote
} from '../core/trigonometrie.js';

const COMPETENCE = 'geo.trigo.cotes';

/** Le milieu d'un segment, où se pose son étiquette. */
const milieu = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });

// LE CADRE DE LA FIGURE, en unités du viewBox. Le triangle occupe 0..100 ; la
// marge alentour reçoit les lettres des sommets et les noms des côtés.
const MARGE = 14;
// Ces deux nombres sont AUSSI dans la feuille de style (.tg-nom / .tg-role) :
// le SVG a besoin de la taille pour BORNER le texte, et CSS pour l'afficher.
const TAILLE_NOM = 7;
const TAILLE_ROLE = 5.4;

/** Ramène une coordonnée dans le cadre, en gardant `demi` de place autour. */
const borner = (v, demi) =>
    Math.min(100 + MARGE - demi, Math.max(-MARGE + demi, v));

class Trigonometrie extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'trigonometrie');
        this.rng = makeRng(this.params.seed);
        // « Tourner » se règle : en découverte, une figure droite se lit mieux.
        this.tourner = this.params.tourner !== false;
        this.trouves = {};
    }

    render() {
        this.container.innerHTML = `
            <style>
                .tg-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    width: 100%; height: 100%; padding: 8px 10px 10px; box-sizing: border-box;
                    color: var(--text-main); container-type: size; min-height: 0;
                    user-select: none; -webkit-user-select: none;
                }
                .tg-consigne {
                    text-align: center; flex: 0 0 auto; max-width: 640px; line-height: 1.35;
                    font-size: clamp(12px, 2.8cqw, 15px);
                }
                .tg-consigne b { color: var(--primary); }
                /* LA SCÈNE MESURE LA FIGURE, PAS LE PLATEAU. Un carré calé sur la
                   hauteur du plateau entier se réserverait une place déjà prise
                   par la consigne, les étiquettes et la note. */
                .tg-scene {
                    flex: 1 1 auto; width: 100%; min-height: 0;
                    display: flex; align-items: center; justify-content: center;
                    container-type: size;
                }
                .tg-fig { width: min(100%, 96cqh); aspect-ratio: 1; max-width: 460px; }

                /* --- Le triangle --- */
                .tg-cote {
                    stroke: var(--text-main); stroke-width: 2.4; fill: none;
                    stroke-linecap: round;
                    /* LE TRAIT VISIBLE NE PREND PAS LES CLICS. Il est dessiné
                       APRÈS sa zone de prise, donc au-dessus d'elle : sans
                       cela, viser juste — cliquer pile sur le côté — était le
                       seul geste qui ne marchait pas. Mesuré au navigateur :
                       le clic atteignait .tg-cote, qui n'écoute rien. */
                    pointer-events: none;
                }
                /* LA ZONE QU'ON TOUCHE EST PLUS LARGE QUE LE TRAIT. Un segment de
                   deux pixels ne se vise pas au doigt, et rater sa cible serait
                   compté comme une erreur de géométrie — ce qu'elle n'est pas. */
                .tg-prise { stroke: transparent; stroke-width: 26; fill: none; cursor: pointer; }
                .tg-cote--trouve { stroke: var(--success); stroke-width: 4; }
                .tg-cote--faux { stroke: var(--danger); animation: tg-non .4s ease; }
                @keyframes tg-non { 25% { translate: -4px 0; } 75% { translate: 4px 0; } }
                .tg-fig:not(.tg-fig--fige) .tg-prise:hover + .tg-cote { stroke: var(--primary); }

                .tg-sommet { fill: var(--text-main); }
                /* MESURÉ, ET C'EST LA SURPRISE DU SVG : dans un <text> sous
                   viewBox, « 13px » ne fait pas treize pixels — il fait treize
                   UNITÉS DU REPÈRE, soit un dixième d'une figure haute de 100.
                   Les lettres écrasaient le triangle et « adjacent » sortait du
                   cadre, tronqué en « adjacen ». */
                .tg-nom {
                    font-weight: 800; font-size: 7px; fill: var(--text-main);
                    paint-order: stroke; stroke: var(--bg-panel); stroke-width: 2px;
                }
                /* L'ANGLE DROIT SE DESSINE, IL NE S'ÉCRIT PAS. Le petit carré est
                   la notation que l'élève verra sur toutes ses figures ; un mot
                   « 90° » lui apprendrait à chercher un mot. */
                .tg-droit { stroke: var(--text-muted); stroke-width: 1.6; fill: none; }
                /* L'ANGLE CONSIDÉRÉ est marqué d'un arc coloré : c'est LUI qui
                   décide de tout, et il doit se voir avant la figure. */
                .tg-arc { stroke: var(--primary); stroke-width: 3; fill: none; }
                .tg-arc-fond { fill: color-mix(in srgb, var(--primary) 16%, transparent); }

                /* Le nom du rôle, écrit sur le côté une fois trouvé. */
                .tg-role {
                    font-weight: 800; font-size: 5.4px; fill: var(--success);
                    paint-order: stroke; stroke: var(--bg-panel); stroke-width: 2px;
                }

                .tg-barre { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; flex: 0 0 auto; }
                .tg-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700;
                    padding: 6px 11px; font-size: .82rem; min-height: 34px;
                }
                .tg-note {
                    min-height: 3.2em; text-align: center; font-size: .85rem; line-height: 1.35;
                    color: var(--text-muted); max-width: 660px; flex: 0 0 auto;
                }
                .tg-note--ok { color: var(--success); font-weight: 700; }
                .tg-note--ko { color: var(--danger); font-weight: 600; }

                /* Couché, la figure à gauche et le texte à droite : en paysage
                   c'est la hauteur qui manque. */
                @container plateau (max-height: 470px) and (min-width: 700px) {
                    .tg-wrap {
                        display: grid; grid-template-columns: minmax(0, auto) minmax(220px, 320px);
                        grid-template-rows: min-content minmax(0, 1fr) min-content;
                        align-items: center; justify-items: center; gap: 4px 12px;
                    }
                    .tg-consigne { grid-column: 2; grid-row: 1; }
                    .tg-scene { grid-column: 1; grid-row: 1 / 4; height: 100%; align-self: stretch; }
                    .tg-note { grid-column: 2; grid-row: 2; }
                    .tg-barre { grid-column: 2; grid-row: 3; }
                }
            </style>
            <div class="tg-wrap">
                <div class="tg-consigne" data-consigne></div>
                <div class="tg-scene"><svg class="tg-fig" viewBox="-14 -14 128 128"
                    data-fig role="img"></svg></div>
                <div class="tg-barre">
                    <button type="button" class="tg-btn" data-aide>💡 Aide-moi</button>
                    <button type="button" class="tg-btn" data-neuf>↻ Autre triangle</button>
                </div>
                <div class="tg-note" data-note></div>
            </div>`;

        this.figEl = this.container.querySelector('[data-fig]');
        this.consigneEl = this.container.querySelector('[data-consigne]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.container.querySelector('[data-neuf]').onclick = () => this.poser();
    }

    startGameLoop() { this.poser(); }
    showNext() { return this.poser(); }

    poser() {
        this.triangle = tirerTriangle(this.rng, { tourner: this.tourner });
        this.questions = questionsDe(this.triangle);
        this.rang = 0;
        this.trouves = {};
        this.fini = false;
        this.dessiner();
        this.note('');
        return true;
    }

    get question() { return this.questions[this.rang] || null; }

    // --- Le dessin ----------------------------------------------------------

    dessiner() {
        const t = this.triangle;
        const p = pointsDe(t, 100);
        const D = t.angleDroit, V = t.angleVise;
        const q = this.question;

        this.consigneEl.innerHTML = q
            ? `Dans ce triangle rectangle, clique <b>${LIBELLES[q.role]}</b>`
                + (q.role === ROLES.HYPOTENUSE ? '.'
                    : ` de l'angle marqué en <b>${sommetVise(t)}</b>.`)
            : 'Les trois côtés sont nommés. Regarde bien la figure avant de passer.';

        // LES CÔTÉS, chacun avec sa zone de prise large par-dessous.
        const paires = [[0, 1], [1, 2], [0, 2]];
        const traits = paires.map(([i, j]) => {
            const nom = nomCote(t, i, j);
            const role = Object.keys(this.trouves).find(k => memeCote(this.trouves[k], nom));
            const classe = role ? ' tg-cote--trouve' : '';
            return `<line class="tg-prise" data-cote="${nom}"
                    x1="${p[i].x}" y1="${p[i].y}" x2="${p[j].x}" y2="${p[j].y}"/>
                <line class="tg-cote${classe}" data-trait="${nom}"
                    x1="${p[i].x}" y1="${p[i].y}" x2="${p[j].x}" y2="${p[j].y}"/>`;
        }).join('');

        // L'étiquette du rôle, sur le côté trouvé, poussée vers l'extérieur.
        const centre = {
            x: (p[0].x + p[1].x + p[2].x) / 3,
            y: (p[0].y + p[1].y + p[2].y) / 3
        };
        const etiquettes = paires.map(([i, j]) => {
            const nom = nomCote(t, i, j);
            const role = Object.keys(this.trouves).find(k => memeCote(this.trouves[k], nom));
            if (!role) return '';
            const m = milieu(p[i], p[j]);
            const dx = m.x - centre.x, dy = m.y - centre.y;
            const n = Math.hypot(dx, dy) || 1;
            const mot = COURTS[role];
            // « hypoténuse » est long, et un côté peut passer au bord du cadre :
            // sans borne, le mot sortait du viewBox et se coupait en « adjacen ».
            const demi = mot.length * TAILLE_ROLE * 0.30;
            return `<text class="tg-role" x="${borner(m.x + (dx / n) * 8, demi).toFixed(1)}"
                y="${borner(m.y + (dy / n) * 8, TAILLE_ROLE * 0.7).toFixed(1)}" text-anchor="middle"
                dominant-baseline="central">${mot}</text>`;
        }).join('');

        this.figEl.innerHTML = `${this.marqueDroit(p, D)}${this.marqueAngle(p, V)}
            ${traits}
            ${p.map((c, i) => `<circle class="tg-sommet" cx="${c.x}" cy="${c.y}" r="2.6"/>`).join('')}
            ${p.map((c, i) => this.nomSommet(c, centre, t.sommets[i])).join('')}
            ${etiquettes}`;
        this.figEl.setAttribute('aria-label',
            `Triangle ${t.nom}, rectangle en ${sommetDroit(t)}, angle marqué en ${sommetVise(t)}`);
        this.figEl.classList.toggle('tg-fig--fige', !q);
        this.brancher();
    }

    /** Le nom d'un sommet, poussé DEHORS pour ne pas tomber sur un trait. */
    nomSommet(c, centre, lettre) {
        const dx = c.x - centre.x, dy = c.y - centre.y;
        const n = Math.hypot(dx, dy) || 1;
        return `<text class="tg-nom" x="${borner(c.x + (dx / n) * 7, TAILLE_NOM * 0.6).toFixed(1)}"
            y="${borner(c.y + (dy / n) * 7, TAILLE_NOM * 0.7).toFixed(1)}" text-anchor="middle"
            dominant-baseline="central">${lettre}</text>`;
    }

    /** Le petit carré de l'angle droit — la notation qu'on verra partout. */
    marqueDroit(p, D) {
        const autres = [0, 1, 2].filter(i => i !== D);
        const u = this.versUnitaire(p[D], p[autres[0]]);
        const v = this.versUnitaire(p[D], p[autres[1]]);
        const k = 8;
        const a = { x: p[D].x + u.x * k, y: p[D].y + u.y * k };
        const b = { x: p[D].x + (u.x + v.x) * k, y: p[D].y + (u.y + v.y) * k };
        const c = { x: p[D].x + v.x * k, y: p[D].y + v.y * k };
        return `<path class="tg-droit" d="M${a.x.toFixed(1)} ${a.y.toFixed(1)}
            L${b.x.toFixed(1)} ${b.y.toFixed(1)} L${c.x.toFixed(1)} ${c.y.toFixed(1)}"/>`;
    }

    /** L'arc de l'angle considéré : c'est lui qui décide de tout. */
    marqueAngle(p, V) {
        const autres = [0, 1, 2].filter(i => i !== V);
        const u = this.versUnitaire(p[V], p[autres[0]]);
        const v = this.versUnitaire(p[V], p[autres[1]]);
        const r = 13;
        const a = { x: p[V].x + u.x * r, y: p[V].y + u.y * r };
        const b = { x: p[V].x + v.x * r, y: p[V].y + v.y * r };
        // Le sens de l'arc dépend de l'orientation : le produit vectoriel dit
        // de quel côté tourner, sinon l'arc traverse le triangle.
        const sens = (u.x * v.y - u.y * v.x) > 0 ? 1 : 0;
        return `<path class="tg-arc-fond" d="M${p[V].x.toFixed(1)} ${p[V].y.toFixed(1)}
                L${a.x.toFixed(1)} ${a.y.toFixed(1)}
                A${r} ${r} 0 0 ${sens} ${b.x.toFixed(1)} ${b.y.toFixed(1)} Z"/>
            <path class="tg-arc" d="M${a.x.toFixed(1)} ${a.y.toFixed(1)}
                A${r} ${r} 0 0 ${sens} ${b.x.toFixed(1)} ${b.y.toFixed(1)}"/>`;
    }

    versUnitaire(de, vers) {
        const dx = vers.x - de.x, dy = vers.y - de.y;
        const n = Math.hypot(dx, dy) || 1;
        return { x: dx / n, y: dy / n };
    }

    brancher() {
        if (this.isDemo || this.fini) return;
        this.figEl.querySelectorAll('[data-cote]').forEach(el => {
            el.onclick = () => this.choisir(el.dataset.cote);
        });
    }

    // --- Ce que fait le doigt -----------------------------------------------

    choisir(nom) {
        if (this.isDemo || this.fini) return;
        const q = this.question;
        if (!q) return;
        const v = verifier(this.triangle, q.role, nom);
        if (!v.ok) {
            this.note(v.raison, 'ko');
            const trait = this.figEl.querySelector(`[data-trait="${nom}"]`);
            if (trait) {
                trait.classList.add('tg-cote--faux');
                setTimeout(() => trait.classList.remove('tg-cote--faux'), 500);
            }
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: `${LIBELLES[q.role]} — triangle ${this.triangle.nom}, `
                    + `angle en ${sommetVise(this.triangle)}`,
                given: nom, expected: q.attendu,
                partiel: true, silencieux: true
            });
            return;
        }
        this.trouves[q.role] = q.attendu;
        this.rang += 1;
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `${LIBELLES[q.role]} — triangle ${this.triangle.nom}, `
                + `angle en ${sommetVise(this.triangle)}`,
            expected: q.attendu, given: nom, points: 6, partiel: true
        });
        this.dessiner();
        if (this.rang >= this.questions.length) return this.gagner();
        // ON RAPPELLE L'APPUI QU'ON VIENT DE POSER. L'hypoténuse trouvée, la
        // suite se déduit d'elle — le dire au moment où elle vient d'être
        // marquée, c'est faire faire à l'élève le raisonnement qu'on veut.
        this.note(this.rang === 1
            ? 'Elle est en face de l\'angle droit, et elle ne bougera plus. '
                + 'Les deux autres se lisent maintenant par rapport à l\'angle marqué.'
            : 'Oui. Reste le dernier.', 'ok');
    }

    gagner() {
        this.fini = true;
        this.dessiner();
        this.note(`✅ ${laLecon(this.triangle)}`, 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Repérer les trois côtés — triangle ${this.triangle.nom}`,
            expected: '3 côtés', given: '3 côtés', points: 12
        });
        setTimeout(() => { if (this.isRunning) this.showNext(); }, 3200);
    }

    aider() {
        if (this.isDemo || !this.triangle) return;
        const q = this.question;
        this.note(q ? conseil(this.triangle, q.role) : laLecon(this.triangle));
    }

    montrerSolution() {
        if (!this.triangle) return false;
        this.trouves = { ...rolesDe(this.triangle) };
        this.rang = this.questions.length;
        this.fini = true;
        this.dessiner();
        this.note('Solution affichée (outil d\'auteur).');
        return true;
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'tg-note' + (ton ? ` tg-note--${ton}` : '');
    }

    // --- La démonstration ---------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.triangle) this.poser();
        const t = this.triangle;
        const r = rolesDe(t);
        if (!await cur.pause(500) || !this.isRunning) return fin();
        cur.say('Avant toute formule, il faut savoir QUEL côté est lequel. C\'est là qu\'on '
            + 'se trompe : un cosinus juste appliqué au mauvais côté donne un nombre faux '
            + 'que rien ne rattrape.', this.figEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        const etapes = [
            { role: ROLES.HYPOTENUSE, dit: `Je cherche l'angle droit : il est en ${sommetDroit(t)}. `
                + `L'hypoténuse est le côté d'en face — ${r[ROLES.HYPOTENUSE]}. Elle ne dépend `
                + 'pas de l\'angle qu\'on considère : c\'est mon repère.' },
            { role: ROLES.OPPOSE, dit: `Maintenant l'angle marqué, en ${sommetVise(t)}. Le côté `
                + `opposé ne le touche pas : c'est ${r[ROLES.OPPOSE]}.` },
            { role: ROLES.ADJACENT, dit: 'Et l\'adjacent touche l\'angle SANS être l\'hypoténuse. '
                + `Deux côtés touchent l'angle, l'un est l'hypoténuse — reste ${r[ROLES.ADJACENT]}.` }
        ];
        for (const e of etapes) {
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const cible = this.figEl.querySelector(`[data-trait="${r[e.role]}"]`);
            cur.say(e.dit, cible || this.figEl);
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
            this.trouves[e.role] = r[e.role];
            this.rang += 1;
            this.dessiner();
            if (!await cur.pause(DEMO_SPEED.settle / 2) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Et le triangle suivant sera tourné autrement : c\'est la figure qu\'on lit, '
            + 'pas une image qu\'on reconnaît.', this.figEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineTrigonometrie(container, isDemo, params) {
    const jeu = new Trigonometrie(container, isDemo, params);
    jeu.start();
    return jeu;
}
