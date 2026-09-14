// LES BONS CHEMINS — à l'écran.
//
// Le noyau (core/bonsChemins.js) tire la grille et tient la règle. Ici on
// dessine, et l'on écoute le doigt.
//
// TROIS PARTIS PRIS.
//
//   · LE CALCUL S'ÉCRIT, SON RÉSULTAT NON. Rémy, banc d'essai : « ne donne pas le
//     résultat du calcul au-dessus ». L'en-tête écrivait « 2 × 4 = 8 · il reste
//     30 à faire », et il avait raison : c'était la moitié de l'exercice donnée.
//     Multiplier de tête au fur et à mesure, et diviser la cible par ce qu'on a
//     déjà, EST le travail — le logiciel le faisait à la place de l'élève, et il
//     ne restait que le déplacement. On écrit donc la SUITE des nombres
//     traversés, « 2 × 4 × 5 », telle qu'elle s'allonge : c'est le relevé de ce
//     qu'on a fait, pas la réponse.
//
//   · ON DIT QUAND C'EST FICHU, SANS DIRE LE PRODUIT. Dès que ce qui est
//     multiplié ne divise plus la cible, aucun chemin ne peut plus aboutir :
//     multiplier n'enlève jamais un facteur. Le taire serait mentir par
//     omission, et l'élève chercherait dix minutes pour rien. Le message nomme
//     donc l'impasse sans faire le calcul.
//
//   · RIEN NE BOUGE QUAND ON CLIQUE. Rémy : « quand on clique dessus ça
//     ragrandit ». La consigne occupait quatre lignes sous la grille et
//     s'effaçait au premier clic : la scène récupérait la place, et la grille
//     grandissait d'un coup sous le doigt. Les deux bandes de texte ont
//     désormais une hauteur FIXE — ce qu'elles disent change, la mise en page
//     jamais.
//
//   · ON REVIENT EN TOUCHANT SA PROPRE TRACE. Toucher une case déjà prise coupe
//     le chemin à cet endroit. Un chemin se cherche en se trompant : tout
//     effacer au cinquième pas découragerait n'importe qui.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    PALIERS, CONSIGNE, genererGrille, traceVide, valeur, voisines, produit, facteurs,
    peutAvancer, avancer, couper, verifier, prochainPas, conseil, decomposer,
    clef, memeCase, estArrivee
} from '../core/bonsChemins.js';

const COMPETENCE = 'num.arith.decomposition';

class BonsChemins extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'bons-chemins');
        this.rng = makeRng(this.params.seed);
        this.palier = PALIERS[this.params.palier] ? this.params.palier : 'moyen';
        this.chemin = [];
    }

    render() {
        this.container.innerHTML = `
            <style>
                .bc-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    width: 100%; height: 100%; padding: 8px 10px 12px; box-sizing: border-box;
                    color: var(--text-main); overflow-y: auto; container-type: size;
                    min-height: 0; user-select: none; -webkit-user-select: none;
                }
                .bc-tete { text-align: center; flex: 0 0 auto; }
                .bc-cible {
                    font-weight: 800; font-size: clamp(17px, 5cqw, 27px); line-height: 1.1;
                }
                .bc-cible b { color: var(--primary); font-size: 1.25em; }
                /* HAUTEUR FIXE, ET UNE SEULE LIGNE. Ce qu'elle dit change à chaque
                   clic ; si elle passait de une à deux lignes, la scène se
                   redimensionnerait sous le doigt. */
                .bc-facteurs {
                    color: var(--text-muted); font-size: clamp(11px, 2.6cqw, 13px);
                    margin-top: 2px; height: 1.5em; line-height: 1.5;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .bc-scene {
                    flex: 1 1 auto; width: 100%; min-height: min(88cqw, 400px, 54cqh);
                    display: flex; align-items: center; justify-content: center;
                }
                .bc-svg { width: 100%; height: 100%; max-width: 460px; touch-action: none; }

                .bc-case { fill: var(--bg-panel); stroke: var(--border); stroke-width: .35; }
                .bc-case--prise { fill: color-mix(in srgb, var(--primary) 22%, var(--bg-panel)); }
                .bc-case--ici { fill: color-mix(in srgb, var(--primary) 42%, var(--bg-panel)); }
                .bc-case--bout { fill: color-mix(in srgb, var(--warning) 26%, var(--bg-panel)); }
                .bc-case--possible { fill: color-mix(in srgb, var(--success) 15%, var(--bg-panel)); }
                .bc-nombre {
                    fill: var(--text-main); font-weight: 800; text-anchor: middle;
                    dominant-baseline: central; pointer-events: none;
                }
                .bc-lettre { fill: var(--warning-fort, var(--warning)); font-weight: 900; }
                /* Le trait passe SOUS les nombres : c'est la trace du chemin,
                   pas un décor qui recouvre ce qu'on doit lire. */
                .bc-trait {
                    fill: none; stroke: var(--primary); stroke-width: 1.4;
                    stroke-linecap: round; stroke-linejoin: round;
                    opacity: .8; pointer-events: none;
                }
                .bc-trait--mort { stroke: var(--danger); }
                .bc-cibleClic { fill: transparent; cursor: pointer; }

                .bc-barre { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; flex: 0 0 auto; }
                .bc-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700;
                    padding: 7px 12px; font-size: .85rem; min-height: 38px;
                }
                /* HAUTEUR FIXE, ET NON « min-height ». C'était LA cause du sursaut :
                   la consigne tenait quatre lignes, le premier clic la remplaçait
                   par du vide, la note retombait à 2,4 em et la scène — qui prend
                   ce qui reste — récupérait deux centimètres d'un coup. La grille
                   grandissait donc sous le doigt qui venait de la toucher. */
                .bc-note {
                    height: 4.2em; overflow-y: auto;
                    text-align: center; font-size: .85rem; line-height: 1.35;
                    color: var(--text-muted); max-width: 620px; flex: 0 0 auto;
                }
                .bc-note--ok { color: var(--success); font-weight: 700; }
                .bc-note--ko { color: var(--danger); font-weight: 600; }

                /* Couché, la grille passe à gauche et le reste à droite : en
                   paysage c'est la hauteur qui manque, jamais la largeur. La
                   requête interroge le PLATEAU — un élément ne peut pas
                   questionner son propre conteneur. */
                @container plateau (max-height: 430px) and (min-width: 560px) {
                    .bc-wrap {
                        display: grid; padding: 6px 10px;
                        grid-template-columns: minmax(0, auto) minmax(190px, 290px);
                        grid-template-rows: min-content minmax(0, 1fr) min-content;
                        align-items: center; justify-items: center; gap: 4px 12px;
                    }
                    .bc-tete { grid-column: 2; grid-row: 1; }
                    .bc-scene { grid-column: 1; grid-row: 1 / 4; min-height: 0; height: 100%; align-self: stretch; }
                    .bc-barre { grid-column: 2; grid-row: 2; }
                    /* Couché, la note est une colonne étroite : il lui faut plus de
                       lignes pour dire la même chose, et la hauteur reste fixe. */
                    .bc-note { grid-column: 2; grid-row: 3; height: 6.8em; }
                }
            </style>
            <div class="bc-wrap">
                <div class="bc-tete">
                    <div class="bc-cible" data-cible></div>
                    <div class="bc-facteurs" data-facteurs></div>
                </div>
                <div class="bc-scene"><svg class="bc-svg" data-svg preserveAspectRatio="xMidYMid meet"></svg></div>
                <div class="bc-barre">
                    <button type="button" class="bc-btn" data-retour>↶ Revenir</button>
                    <button type="button" class="bc-btn" data-effacer>↺ Recommencer</button>
                    <button type="button" class="bc-btn" data-aide>💡 Aide-moi</button>
                    <button type="button" class="bc-btn" data-neuf>Autre grille</button>
                </div>
                <div class="bc-note" data-note></div>
            </div>`;

        this.svg = this.container.querySelector('[data-svg]');
        this.cibleEl = this.container.querySelector('[data-cible]');
        this.facteursEl = this.container.querySelector('[data-facteurs]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.container.querySelector('[data-retour]').onclick = () => this.revenir();
        this.container.querySelector('[data-effacer]').onclick = () => this.effacer();
        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.container.querySelector('[data-neuf]').onclick = () => this.showNext();
    }

    startGameLoop() { this.poser(); }

    poser() {
        const g = genererGrille({ rng: this.rng, palier: this.palier })
            || genererGrille({ rng: this.rng, palier: 'facile' });
        if (!g) return false;
        this.grille = g;
        this.chemin = traceVide(g);
        this.fini = false;
        this.dessiner();
        this.note(CONSIGNE);
        return true;
    }

    showNext() { return this.poser(); }

    effacer() {
        if (this.isDemo || !this.grille) return;
        this.chemin = traceVide(this.grille);
        this.fini = false;
        this.dessiner();
        this.note(this.rappel());
    }

    revenir() {
        if (this.isDemo || this.chemin.length < 2) return;
        this.chemin = this.chemin.slice(0, -1);
        this.fini = false;
        this.dessiner();
        this.note(this.rappel());
    }

    // --- Le dessin ----------------------------------------------------------

    dessiner() {
        const g = this.grille;
        const c = 10;
        this.svg.setAttribute('viewBox', `0 0 ${g.l * c} ${g.h * c}`);
        const ici = this.chemin[this.chemin.length - 1];
        const pris = new Set(this.chemin.map(p => clef(...p)));
        const bilan = verifier(g, this.chemin);
        // Les cases où l'on peut encore aller : c'est la règle des diagonales
        // rendue visible, et elle s'apprend en la voyant plutôt qu'en la lisant.
        const ouvertes = new Set(this.fini ? []
            : voisines(g, ici).filter(v => !pris.has(clef(...v))).map(v => clef(...v)));

        let html = '';
        for (let y = 0; y < g.h; y++) {
            for (let x = 0; x < g.l; x++) {
                const k = clef(x, y);
                const classe = memeCase([x, y], ici) ? 'bc-case--ici'
                    : (pris.has(k) ? 'bc-case--prise'
                        : (estArrivee(g, [x, y]) ? 'bc-case--bout'
                            : (ouvertes.has(k) ? 'bc-case--possible' : '')));
                html += `<rect class="bc-case ${classe}" x="${x * c}" y="${y * c}"
                    width="${c}" height="${c}" rx="${c * 0.1}"></rect>`;
            }
        }

        if (this.chemin.length > 1) {
            const d = this.chemin.map(([x, y], i) => `${i ? 'L' : 'M'}${x * c + c / 2} ${y * c + c / 2}`).join(' ');
            html += `<path class="bc-trait${bilan.mort ? ' bc-trait--mort' : ''}" d="${d}"></path>`;
        }

        for (let y = 0; y < g.h; y++) {
            for (let x = 0; x < g.l; x++) {
                const n = valeur(g, x, y);
                const cx = x * c + c / 2, cy = y * c + c / 2;
                const texte = n === null ? String(g.cases[y][x]) : String(n);
                html += `<text class="bc-nombre${n === null ? ' bc-lettre' : ''}"
                    x="${cx}" y="${cy}" font-size="${c * (n === null ? 0.44 : 0.4)}">${texte}</text>`;
            }
        }
        for (let y = 0; y < g.h; y++) {
            for (let x = 0; x < g.l; x++) {
                html += `<rect class="bc-cibleClic" data-x="${x}" data-y="${y}"
                    x="${x * c}" y="${y * c}" width="${c}" height="${c}"></rect>`;
            }
        }
        this.svg.innerHTML = html;
        this.brancherDoigt();
        this.majTete(bilan);
    }

    /**
     * L'en-tête : la cible, puis LA SUITE DES NOMBRES TRAVERSÉS — et rien de plus.
     *
     * Rémy : « ne donne pas le résultat du calcul au-dessus ». On écrivait
     * « 2 × 4 = 8 · il reste 30 à faire » : le produit et le quotient étaient
     * calculés pour l'élève, c'est-à-dire tout ce qu'il y avait à faire de tête.
     * Le relevé de ce qu'on a traversé, lui, ne donne rien qui ne soit déjà sur
     * la grille — il évite seulement de revenir compter ses propres cases.
     *
     * ON N'ANNONCE LE PRODUIT QU'UNE FOIS ARRIVÉ, quand il n'est plus une aide
     * mais la correction : le chemin est joué, l'élève doit voir ce qu'il vaut.
     */
    majTete(bilan) {
        const g = this.grille;
        this.cibleEl.innerHTML = `Trouve <b>${g.cible}</b>`;
        const f = facteurs(g, this.chemin);
        if (!f.length) {
            // LA DÉCOMPOSITION NE S'AFFICHE PLUS D'OFFICE. Rémy, banc d'essai :
            // « retire les décompositions du nombre ». Écrite sous la cible,
            // elle donnait la moitié du travail avant même d'avoir commencé —
            // et elle occupait la place au moment où il n'y a rien à dire. Elle
            // reste dans « Aide-moi », qui est là pour ça.
            this.facteursEl.textContent = 'Pars du D et clique de case en case.';
            return;
        }
        const suite = f.join(' × ');
        this.facteursEl.textContent = bilan.gagne || estArrivee(g, this.chemin[this.chemin.length - 1])
            ? `${suite} = ${produit(g, this.chemin)}`
            : suite;
    }

    brancherDoigt() {
        if (this.isDemo) return;
        this.svg.querySelectorAll('[data-x]').forEach(el => {
            el.onclick = () => this.jouer([Number(el.dataset.x), Number(el.dataset.y)]);
        });
    }

    jouer(cible) {
        if (this.isDemo || !this.grille) return;
        // Toucher sa propre trace coupe le chemin là : c'est le geste de retour.
        if (this.chemin.some(c => memeCase(c, cible))) {
            this.chemin = couper(this.chemin, cible);
            this.fini = false;
            this.dessiner();
            this.note(this.rappel());
            return;
        }
        if (this.fini) return;
        const v = peutAvancer(this.grille, this.chemin, cible);
        if (!v.ok) { if (v.raison) this.note(v.raison, 'ko'); return; }
        this.chemin = avancer(this.grille, this.chemin, cible);
        const bilan = verifier(this.grille, this.chemin);
        this.dessiner();
        if (bilan.gagne) return this.gagner(bilan);
        if (bilan.mort) return this.note(bilan.message, 'ko');
        if (estArrivee(this.grille, cible)) return this.rater(bilan);
        this.note(this.rappel());
    }

    gagner(bilan) {
        this.fini = true;
        this.dessiner();
        this.note(`✅ ${bilan.message}`, 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Les bons chemins — trouve ${this.grille.cible}`,
            expected: String(this.grille.cible),
            given: facteurs(this.grille, this.chemin).join(' × '),
            points: 10 + facteurs(this.grille, this.chemin).length * 3
        });
        setTimeout(() => { if (this.isRunning) this.showNext(); }, 2400);
    }

    /**
     * Arrivé au A avec le mauvais produit : c'est une VRAIE erreur, elle compte.
     * On ne remet pas le chemin à zéro pour autant — l'élève doit voir ce qu'il
     * a fait pour comprendre où il a divergé.
     */
    rater(bilan) {
        this.note(bilan.message, 'ko');
        this.onWrongAnswer(null, {
            concept: COMPETENCE,
            questionText: `Les bons chemins — trouve ${this.grille.cible}`,
            input: `${facteurs(this.grille, this.chemin).join(' × ')} = ${bilan.produit}`,
            expected: String(this.grille.cible),
            // Le jeu écrit déjà l'explication sous la grille, en toutes lettres
            // et à l'endroit où l'élève regarde : une carte par-dessus la
            // répéterait en cachant la grille dont elle parle.
            silencieux: true
        });
    }

    aider() {
        if (this.isDemo || !this.grille) return;
        this.note(conseil(this.grille, this.chemin));
    }

    montrerSolution() {
        if (!this.grille) return false;
        this.chemin = this.grille.solution.map(c => [...c]);
        this.fini = true;
        this.dessiner();
        this.note('Solution affichée (outil d\'auteur).');
        return true;
    }

    /**
     * CE QU'ON ÉCRIT QUAND IL N'Y A RIEN À SIGNALER.
     *
     * La bande a maintenant une hauteur réservée : la laisser vide creuserait un
     * trou sous la grille. Autant qu'elle porte la règle — et c'est la règle des
     * DIAGONALES qu'on oublie, celle sans laquelle la moitié des cibles paraît
     * introuvable. Tant qu'aucun pas n'est fait, on la donne en entier ; ensuite
     * on n'en garde que ce qui sert encore, dont le geste pour revenir.
     */
    rappel() {
        return this.chemin.length > 1
            ? 'Les diagonales comptent. Pour revenir en arrière, touche une case de ton trait.'
            : CONSIGNE;
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'bc-note' + (ton ? ` bc-note--${ton}` : '');
    }

    // --- La démonstration ---------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.grille) this.poser();
        const g = this.grille;
        if (!await cur.pause(500) || !this.isRunning) return fin();
        cur.say(`Il faut arriver à ${g.cible} en multipliant les nombres traversés. `
            + 'Avant de chercher un chemin au hasard, je casse le nombre en facteurs — '
            + 'le bouton « Aide-moi » le fait pour moi si je bloque.', this.cibleEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        const caseEl = ([x, y]) => this.svg.querySelector(`[data-x="${x}"][data-y="${y}"]`);
        for (let k = 0; k < 3; k++) {
            const pas = prochainPas(g, this.chemin);
            if (!pas || estArrivee(g, pas)) break;
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const n = valeur(g, pas[0], pas[1]);
            const reste = g.cible / produit(g, this.chemin);
            cur.say(k === 0
                ? `Je peux aller sur les huit cases voisines, les DIAGONALES comprises — `
                  + `c'est ce qui rend ce jeu jouable. Je prends le ${n}.`
                : `Il me reste ${reste} à faire, et ${reste} se divise par ${n} : je passe donc par là.`,
            caseEl(pas) || this.svg);
            const el = caseEl(pas);
            if (el && !await cur.tap(el)) return fin();
            this.chemin = avancer(g, this.chemin, pas);
            this.dessiner();
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Et si mon produit ne divise plus la cible, c\'est fini : multiplier '
            + 'n\'enlève jamais un facteur. Je reviens en touchant une case de mon trait.',
        this.container.querySelector('[data-retour]'));
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineBonsChemins(container, isDemo, params) {
    const jeu = new BonsChemins(container, isDemo, params);
    jeu.start();
    return jeu;
}
