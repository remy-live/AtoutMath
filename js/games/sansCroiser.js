// RELIER SANS CROISER — à l'écran.
//
// Le noyau (core/sansCroiser.js) tire la figure, garantit qu'elle a une
// solution et tient les trois interdits. Ici on dessine, et l'on écoute le doigt.
//
// TROIS PARTIS PRIS.
//
//   · ON TRACE À MAIN LEVÉE, PAS DE CASE EN CASE. Le damier n'a servi qu'au
//     générateur ; l'élève ne le voit jamais. Le geste est celui du crayon sur
//     la fiche — on pose le doigt sur un carré, on contourne, on arrive. Un
//     jeu de cases aurait été plus simple à écrire et aurait changé l'exercice :
//     c'est la MAIN qui doit anticiper, pas un curseur.
//
//   · LE REFUS ARRIVE AU RELÂCHEMENT, PAS EN COURS DE TRACÉ. Interrompre le
//     doigt dès qu'il frôle un carré donne une sensation de logiciel qui
//     chicane, et empêche de se reprendre. On laisse tracer, et l'on dit à la
//     fin CE QUI cloche — « ton trait passe sur le carré B » — en effaçant le
//     trait fautif seul.
//
//   · UN TRAIT POSÉ SE REPREND D'UN TOUCHER. Toucher un trait déjà tracé
//     l'efface. Ce jeu se cherche en se trompant : le trait C ne passe plus
//     parce que le trait A est mal placé, et il faut pouvoir défaire A sans
//     tout recommencer.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    PALIERS, CONSIGNE, COULEURS, genererFigure, carres, verifierTrait, verifierFigure,
    dansRect, conseil
} from '../core/sansCroiser.js';

const COMPETENCE = 'geo.espace.reperage';

class SansCroiser extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'sans-croiser');
        this.rng = makeRng(this.params.seed);
        this.palier = PALIERS[this.params.palier] ? this.params.palier : 'moyen';
        this.traits = [];
        this.encours = null;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .sx-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    width: 100%; height: 100%; padding: 8px 10px 12px; box-sizing: border-box;
                    color: var(--text-main); overflow-y: auto; container-type: size;
                    min-height: 0; user-select: none; -webkit-user-select: none;
                }
                .sx-tete { text-align: center; flex: 0 0 auto; }
                .sx-titre { font-weight: 800; font-size: clamp(14px, 3.4cqw, 19px); }
                .sx-consigne {
                    color: var(--text-muted); font-size: clamp(11px, 2.5cqw, 13px);
                    line-height: 1.35; max-width: 660px;
                }
                /* LA SCÈNE A UNE HAUTEUR FIXE, ET C'EST UNE CORRECTION.
                   Rémy : « quand on clique sur là où il faut tracer, ça se
                   ragrandit un peu ». Mesuré sur iPhone 375 : au relâchement,
                   le message de refus passe à deux lignes, son bloc gagne 4 px,
                   et la scène — qui se partageait la hauteur restante avec lui
                   — les lui rendait. La figure changeait donc de taille sous le
                   doigt, en plein tracé. Une scène qui ne se laisse plus
                   prendre sa place ne bouge plus : c'est la page qui défile si
                   le message est long. */
                .sx-scene {
                    /* flex 1 0 auto : elle GRANDIT si la place est là — sur un
                       grand écran la figure doit remplir —, mais elle ne
                       RÉTRÉCIT jamais. C'est le rétrécissement seul qui faisait
                       bouger la figure. */
                    flex: 1 0 auto; width: 100%; min-height: min(72cqw, 380px, 56cqh);
                    display: flex; align-items: center; justify-content: center;
                }
                .sx-svg { width: 100%; height: 100%; max-width: 620px; touch-action: none; cursor: crosshair; }

                .sx-cadre { fill: var(--bg-panel); stroke: var(--text-main); stroke-width: .7; }
                .sx-carre { stroke: var(--text-main); stroke-width: .5; }
                .sx-lettre {
                    font-weight: 900; text-anchor: middle; dominant-baseline: central;
                    pointer-events: none; fill: #1a202c;
                }
                .sx-trait {
                    fill: none; stroke-width: 1.3; stroke-linecap: round; stroke-linejoin: round;
                    cursor: pointer;
                }
                .sx-encours { fill: none; stroke-width: 1.3; stroke-linecap: round;
                    stroke-linejoin: round; opacity: .65; pointer-events: none; }

                .sx-barre { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; flex: 0 0 auto; }
                .sx-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700;
                    padding: 7px 12px; font-size: .85rem; min-height: 38px;
                }
                /* LE BANDEAU DU MESSAGE A UNE HAUTEUR ARRÊTÉE, et c'est lui la
                   vraie cause du « ça se ragrandit ». Il passait de une à deux
                   lignes quand le refus s'affichait, prenait 4 px à l'espace
                   libre, et la scène — qui grandit avec cet espace — les
                   rendait : la figure bougeait sous le doigt. Une hauteur fixe
                   ne prend jamais rien à personne. Trois lignes suffisent aux
                   refus ; le conseil, plus long, se fait défiler, et c'est
                   celui-là qu'on a demandé exprès. */
                .sx-note {
                    height: 3.6em; overflow-y: auto; text-align: center;
                    font-size: .85rem; line-height: 1.35;
                    color: var(--text-muted); max-width: 660px; flex: 0 0 auto;
                }
                .sx-note--ok { color: var(--success); font-weight: 700; }
                .sx-note--ko { color: var(--danger); font-weight: 600; }

                /* Couché, le cadre passe à gauche et les commandes à droite :
                   en paysage c'est la hauteur qui manque, jamais la largeur.
                   La requête interroge le PLATEAU — un élément ne peut pas
                   questionner son propre conteneur. */
                @container plateau (max-height: 430px) and (min-width: 560px) {
                    .sx-wrap {
                        display: grid; padding: 6px 10px;
                        grid-template-columns: minmax(0, auto) minmax(170px, 250px);
                        grid-template-rows: min-content minmax(0, 1fr) min-content;
                        align-items: center; justify-items: center; gap: 4px 12px;
                    }
                    .sx-tete { grid-column: 2; grid-row: 1; }
                    .sx-scene { grid-column: 1; grid-row: 1 / 4; min-height: 0; height: 100%;
                        align-self: stretch; flex: 1 1 auto; }
                    .sx-barre { grid-column: 2; grid-row: 2; }
                    .sx-note { grid-column: 2; grid-row: 3; height: 5.2em; }
                    .sx-consigne { font-size: 11px; line-height: 1.25; }
                }
            </style>
            <div class="sx-wrap">
                <div class="sx-tete">
                    <div class="sx-titre">Relier sans croiser</div>
                    <div class="sx-consigne" data-consigne></div>
                </div>
                <div class="sx-scene"><svg class="sx-svg" data-svg preserveAspectRatio="xMidYMid meet"></svg></div>
                <div class="sx-barre">
                    <button type="button" class="sx-btn" data-effacer>↺ Tout effacer</button>
                    <button type="button" class="sx-btn" data-aide>💡 Aide-moi</button>
                    <button type="button" class="sx-btn" data-neuf>Autre figure</button>
                </div>
                <div class="sx-note" data-note></div>
            </div>`;

        this.svg = this.container.querySelector('[data-svg]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.container.querySelector('[data-consigne]').textContent = CONSIGNE;
        this.container.querySelector('[data-effacer]').onclick = () => this.effacer();
        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.container.querySelector('[data-neuf]').onclick = () => this.showNext();
        this.brancherDoigt();
    }

    startGameLoop() { this.poser(); }

    poser() {
        this.fig = genererFigure({ rng: this.rng, palier: this.palier })
            || genererFigure({ rng: this.rng, palier: 'moyen' });
        if (!this.fig) return false;
        this.traits = [];
        this.encours = null;
        this.fini = false;
        this.dessiner();
        this.note('');
        return true;
    }

    showNext() { return this.poser(); }

    effacer() {
        if (this.isDemo || !this.fig) return;
        this.traits = [];
        this.encours = null;
        this.fini = false;
        this.dessiner();
        this.note('');
    }

    // --- Le dessin ----------------------------------------------------------

    couleurDe(lettre) {
        return COULEURS[this.fig.lettres.indexOf(lettre) % COULEURS.length];
    }

    dessiner() {
        const f = this.fig;
        const c = f.cadre;
        this.svg.setAttribute('viewBox', `${c.x - 2} ${c.y - 2} ${c.l + 4} ${c.h + 4}`);
        let html = `<rect class="sx-cadre" x="${c.x}" y="${c.y}" width="${c.l}" height="${c.h}" rx="1"></rect>`;

        for (const t of this.traits) {
            html += `<path class="sx-trait" data-trait="${t.lettre}" d="${chemin(t.points)}"
                stroke="${this.couleurDe(t.lettre)}"></path>`;
        }
        if (this.encours && this.encours.points.length > 1) {
            html += `<path class="sx-encours" d="${chemin(this.encours.points)}"
                stroke="${this.couleurDe(this.encours.lettre)}"></path>`;
        }

        // Les carrés PAR-DESSUS les traits : ce sont des obstacles, ils doivent
        // se voir même quand un trait passe à côté.
        for (const k of carres(f)) {
            const fait = this.traits.some(t => t.lettre === k.lettre);
            html += `<rect class="sx-carre" x="${k.x}" y="${k.y}" width="${k.l}" height="${k.h}" rx=".6"
                fill="${this.couleurDe(k.lettre)}" opacity="${fait ? 0.95 : 0.5}"
                data-borne="${k.lettre}"></rect>`;
            html += `<text class="sx-lettre" x="${k.x + k.l / 2}" y="${k.y + k.h / 2}"
                font-size="${k.l * 0.62}">${k.lettre}</text>`;
        }
        this.svg.innerHTML = html;
        this.brancherTraits();
    }

    brancherTraits() {
        if (this.isDemo) return;
        this.svg.querySelectorAll('[data-trait]').forEach(el => {
            el.onclick = (e) => {
                e.stopPropagation();
                this.traits = this.traits.filter(t => t.lettre !== el.dataset.trait);
                this.fini = false;
                this.dessiner();
                this.note(`Trait ${el.dataset.trait} effacé.`);
            };
        });
    }

    /** Les coordonnées du doigt, dans le repère du dessin. */
    pointDe(e) {
        const r = this.svg.getBoundingClientRect();
        const c = this.fig.cadre;
        const vbL = c.l + 4, vbH = c.h + 4;
        // preserveAspectRatio="xMidYMid meet" : l'échelle est la même en x et
        // en y, et le reste est du vide centré. Sans en tenir compte, le trait
        // se décalerait dès que le cadre n'occupe pas tout le SVG.
        const k = Math.min(r.width / vbL, r.height / vbH);
        const x0 = r.left + (r.width - vbL * k) / 2;
        const y0 = r.top + (r.height - vbH * k) / 2;
        return { x: (e.clientX - x0) / k + c.x - 2, y: (e.clientY - y0) / k + c.y - 2 };
    }

    brancherDoigt() {
        if (this.isDemo) return;
        const svg = this.svg;
        svg.onpointerdown = (e) => {
            if (this.fini || !this.fig) return;
            const p = this.pointDe(e);
            const depart = carres(this.fig).find(k => dansRect(p, k));
            if (!depart) return;
            if (this.traits.some(t => t.lettre === depart.lettre)) {
                this.note(`La lettre ${depart.lettre} est déjà reliée — touche son trait pour l'effacer.`);
                return;
            }
            svg.setPointerCapture(e.pointerId);
            this.encours = { lettre: depart.lettre, points: [{ x: p.x, y: p.y }] };
            this.note('');
        };
        svg.onpointermove = (e) => {
            if (!this.encours) return;
            const p = this.pointDe(e);
            const dernier = this.encours.points[this.encours.points.length - 1];
            // On ne garde un point que tous les deux millimètres de dessin :
            // sinon un trait fait mille segments, et la vérification croisée
            // devient quadratique pour rien.
            if (Math.hypot(p.x - dernier.x, p.y - dernier.y) < 1.2) return;
            this.encours.points.push({ x: p.x, y: p.y });
            this.dessiner();
        };
        const fin = (e) => {
            if (!this.encours) return;
            if (e && e.pointerId !== undefined && svg.hasPointerCapture(e.pointerId)) {
                svg.releasePointerCapture(e.pointerId);
            }
            const t = this.encours;
            this.encours = null;
            this.terminer(t);
        };
        svg.onpointerup = fin;
        svg.onpointercancel = fin;
    }

    terminer(trait) {
        const v = verifierTrait(this.fig, trait.lettre, trait.points, this.traits);
        if (!v.ok) {
            this.dessiner();
            this.note(v.raison, 'ko');
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: `Relier sans croiser — le trait ${trait.lettre}`,
                input: v.raison, expected: 'un trait qui respecte les trois interdits',
                partiel: true,
                // Le jeu écrit déjà le motif du refus sous la figure, à
                // l'endroit où l'élève regarde : une carte par-dessus le
                // répéterait en cachant la figure dont elle parle.
                silencieux: true
            });
            return;
        }
        this.traits.push(trait);
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Relier sans croiser — le trait ${trait.lettre}`,
            expected: 'relié', given: 'relié', points: 6, partiel: true
        });
        this.dessiner();
        const bilan = verifierFigure(this.fig, this.traits);
        if (bilan.fini) return this.gagner();
        this.note(conseil(this.fig, this.traits));
    }

    gagner() {
        this.fini = true;
        this.note(`✅ Les ${this.fig.lettres.length} paires sont reliées, sans un seul croisement.`, 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Relier sans croiser — ${this.fig.lettres.length} paires`,
            expected: this.fig.lettres.join(' '), given: this.fig.lettres.join(' '),
            points: 10 + this.fig.lettres.length * 4
        });
        setTimeout(() => { if (this.isRunning) this.showNext(); }, 2400);
    }

    aider() {
        if (this.isDemo || !this.fig) return;
        this.note(conseil(this.fig, this.traits));
    }

    montrerSolution() {
        if (!this.fig) return false;
        this.traits = this.fig.solution.map(t => ({ lettre: t.lettre, points: t.points.map(p => ({ ...p })) }));
        this.fini = true;
        this.dessiner();
        this.note('Solution affichée (outil d\'auteur).');
        return true;
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'sx-note' + (ton ? ` sx-note--${ton}` : '');
    }

    // --- La démonstration ---------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.fig) this.poser();
        if (!await cur.pause(500) || !this.isRunning) return fin();
        cur.say('Trois interdits : les traits ne se croisent pas, ils ne sortent pas du cadre, '
            + 'et ils ne passent pas sur un carré. Le troisième est celui qu\'on oublie — un '
            + 'carré n\'est pas une étiquette, c\'est un obstacle.', this.svg);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        for (let k = 0; k < 2 && k < this.fig.solution.length; k++) {
            const t = this.fig.solution[k];
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            cur.say(k === 0
                ? `Je commence par ${t.lettre}, et je CONTOURNE au lieu de couper droit : `
                  + 'un trait qui file tout droit referme le cadre derrière lui.'
                : `Pour ${t.lettre}, je regarde d'abord de quel côté du trait précédent sont `
                  + 'mes deux carrés. S\'ils ne sont pas du même côté, c\'est le trait d\'avant '
                  + 'qui est à refaire.', this.svg);
            this.traits.push({ lettre: t.lettre, points: t.points.map(p => ({ ...p })) });
            this.dessiner();
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Et si un trait me gêne, je le touche : il s\'efface, et je le refais autrement.',
            this.container.querySelector('[data-effacer]'));
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

/** Un tracé SVG lisse : des segments droits, mais aux coins arrondis. */
function chemin(points) {
    return points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
}

export function engineSansCroiser(container, isDemo, params) {
    const jeu = new SansCroiser(container, isDemo, params);
    jeu.start();
    return jeu;
}
