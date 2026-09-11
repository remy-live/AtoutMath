// L'HEXAGRILLE — à l'écran.
//
// Neuf hexagones en losange, les chiffres de 1 à 9 posés une seule fois, et
// des flèches au bord qui donnent la somme de la file qu'elles désignent.
//
// LES CHIFFRES SONT DES JETONS. Comme au carré magique : on prend, on pose, on
// déplace. Pas de faute de frappe, et surtout on VOIT ce qui reste à placer —
// la réserve qui se vide est la moitié du raisonnement, puisque le dernier
// chiffre restant est souvent celui qui débloque tout.
//
// CHAQUE FLÈCHE DIT OÙ ELLE EN EST. Tant qu'une file est incomplète, sa somme
// courante s'écrit à côté de la somme visée ; dès qu'elle est complète et
// juste, la flèche passe au vert. C'est ce retour-là qui remplace le professeur
// qui passe dans les rangs : l'élève sait tout de suite si sa file est bonne,
// sans qu'on lui dise si sa GRILLE l'est.
//
// L'aide ne donne jamais un chiffre nu : elle montre la file où il ne manque
// qu'une case, et la soustraction qui la comble. C'est la méthode, pas la
// réponse.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import { CSS_GLISSER, rendreGlissable } from '../core/glisserDeposer.js';
import {
    CASES, genererHexagrille, estResolue, prochainCoup, filesJustes
} from '../core/hexagrille.js';
// LA GÉOMÉTRIE VIT DANS LE NOYAU, parce que la FEUILLE la dessine aussi.
// Rémy : « Pas de pdf » pour l'Hexagrille. Lui en donner un imposait de
// partager le placement : recopié ici et là-bas, il aurait fini par diverger.
import { R, centre, CONTOUR, repereFleche, cadreHexagrille }
    from '../core/hexagrilleFigure.js';

const COMPETENCE = 'num.logique.hexagrille';


class Hexagrille extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'hexagrille');
        this.rng = makeRng(this.params.seed);
        this.niveau = ['facile', 'moyen', 'difficile'].includes(this.params.niveau)
            ? this.params.niveau : 'facile';
        this.reussies = 0;
        this.aides = 0;
        // La file qu'on a demandé de voir : aucune au départ.
        this.fileVue = null;
    }

    render() {
        this.container.innerHTML = `
            <style>
                ${CSS_GLISSER}
                .hx-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 10px;
                    width: 100%; height: 100%; padding: 8px; box-sizing: border-box;
                    color: var(--text-main); overflow-y: auto; container-type: size;
                    user-select: none; -webkit-user-select: none;
                }
                .hx-tete {
                    display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
                    justify-content: center; font-size: .9rem; flex: 0 0 auto;
                }
                .hx-compte { color: var(--text-muted); font-weight: 700; }
                .hx-plateau {
                    flex: 1 1 auto; min-height: 0; width: 100%;
                    display: flex; align-items: center; justify-content: center;
                }
                .hx-svg { width: min(100%, 460px); height: auto; max-height: 100%; touch-action: none; }

                /* UNE CASE DONNÉE EST IMPRIMÉE : fond plein, on n'y touche pas.
                   Une case à trouver est un creux clair. */
                .hx-cell { fill: var(--bg-panel); stroke: var(--border); stroke-width: 1.6; }
                .hx-cell--donnee { fill: color-mix(in srgb, var(--text-main) 14%, transparent); }
                .hx-cell--vide { stroke-dasharray: 4 3; }
                .hx-cell--survol { stroke: var(--primary); stroke-width: 3; }
                .hx-nb {
                    font-weight: 900; font-size: 25px; text-anchor: middle;
                    dominant-baseline: central; pointer-events: none;
                }
                .hx-nb--donnee { fill: var(--text-muted); }
                .hx-nb--pose { fill: var(--primary); }

                /* LES FLÈCHES. Le trait porte la direction, l'étiquette la
                   somme visée — et, tant que la file n'est pas finie, ce qu'on
                   a déjà mis dedans. */
                .hx-fleche { stroke: var(--text-muted); stroke-width: 2.2; fill: none; }
                .hx-fleche--juste { stroke: var(--success, #16a34a); }
                .hx-pointe { fill: var(--text-muted); }
                .hx-pointe--juste { fill: var(--success, #16a34a); }
                .hx-somme {
                    font-weight: 900; font-size: 19px; fill: var(--text-main);
                    text-anchor: middle; dominant-baseline: central;
                }
                .hx-somme--juste { fill: var(--success, #16a34a); }
                .hx-cible { fill: transparent; cursor: pointer; }

                /* LA FILE DÉSIGNÉE PAR UN NOMBRE. On appuie sur la somme, sa
                   file s'allume : deux ou trois cases sur neuf, c'est bien
                   plus lisible que de suivre un trait des yeux. */
                .hx-file { cursor: pointer; }
                .hx-file-zone { fill: transparent; stroke: transparent; stroke-width: 30; }
                .hx-fleche--vue { stroke: var(--primary); stroke-width: 3.4; }
                .hx-pointe--vue { fill: var(--primary); }
                .hx-pointe--juste { fill: var(--success, #16a34a); }
                .hx-somme--vue { fill: var(--primary); }
                .hx-cell--eclairee {
                    fill: color-mix(in srgb, var(--primary) 16%, var(--bg-panel));
                    stroke: var(--primary); stroke-width: 3;
                }

                /* LA RÉSERVE. Ce qui reste à placer, en toutes lettres : le
                   dernier chiffre disponible débloque souvent la grille. */
                .hx-reserve {
                    display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;
                    flex: 0 0 auto; min-height: 44px;
                }
                .hx-jeton {
                    width: clamp(34px, 9cqw, 46px); height: clamp(34px, 9cqw, 46px);
                    border-radius: 50%; border: 2px solid var(--primary);
                    background: var(--bg-panel); color: var(--primary);
                    font: inherit; font-weight: 900; font-size: clamp(15px, 4cqw, 21px);
                    display: flex; align-items: center; justify-content: center;
                    cursor: grab; -webkit-tap-highlight-color: transparent;
                }
                .hx-jeton--choisi {
                    background: var(--primary); color: #fff;
                    box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 30%, transparent);
                }
                .hx-barre { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; flex: 0 0 auto; }
                .hx-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700; padding: 7px 12px;
                }
                .hx-btn:hover { background: var(--bg-hover); }
                .hx-note {
                    min-height: 2.4em; text-align: center; font-size: .88rem;
                    color: var(--text-muted); max-width: 620px; flex: 0 0 auto;
                }
                .hx-note--ok { color: var(--success, #16a34a); font-weight: 700; }
                .hx-note--ko { color: var(--danger, #dc2626); font-weight: 600; }
                .hx-note b { color: var(--text-main); }

                @container (max-width: 430px) {
                    .hx-btn { padding: 5px 9px; font-size: .82rem; }
                    .hx-note { min-height: 0; font-size: .8rem; }
                    .hx-wrap { gap: 6px; padding: 5px; }
                }
            </style>
            <div class="hx-wrap">
                <div class="hx-tete">
                    <span>Place les chiffres de <b>1 à 9</b></span>
                    <span class="hx-compte" data-compte></span>
                </div>
                <div class="hx-plateau" data-plateau></div>
                <div class="hx-reserve" data-reserve></div>
                <div class="hx-barre">
                    <button type="button" class="hx-btn" data-aide>💡 Aide-moi</button>
                    <button type="button" class="hx-btn" data-effacer>↺ Recommencer</button>
                    <button type="button" class="hx-btn" data-neuf>Autre grille</button>
                </div>
                <p class="hx-note" data-note></p>
            </div>`;

        this.plateauEl = this.container.querySelector('[data-plateau]');
        this.reserveEl = this.container.querySelector('[data-reserve]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.compteEl = this.container.querySelector('[data-compte]');
        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.container.querySelector('[data-effacer]').onclick = () => this.recommencer();
        this.container.querySelector('[data-neuf]').onclick = () => this.poser();
    }

    startGameLoop() { this.poser(); }

    // --- Une grille ----------------------------------------------------------

    poser() {
        this.puzzle = genererHexagrille(this.rng, { niveau: this.niveau });
        this.saisie = this.puzzle.donnees.slice();
        this.choisi = null;
        this.fileVue = null;
        this.finie = false;
        this.dessiner();
        this.note('Chaque flèche donne la somme de sa file — appuie sur un nombre pour voir '
            + 'quelles cases il compte. Cherche une file où il ne manque qu\'UNE case : '
            + 'c\'est une soustraction, et elle en débloque d\'autres.');
        return true;
    }

    recommencer() {
        if (!this.puzzle) return;
        this.saisie = this.puzzle.donnees.slice();
        this.choisi = null;
        this.finie = false;
        this.dessiner();
        this.note('On repart de zéro.');
    }

    // --- Le dessin -----------------------------------------------------------

    dessiner() {
        const P = this.puzzle;
        const justes = new Set(filesJustes(this.saisie, P.fleches));

        // Les hexagones, puis les flèches, puis les cibles du doigt par-dessus.
        const filVue = P.fleches.find(f => f.id === this.fileVue);
        const eclairees = new Set(filVue ? filVue.cases : []);
        const cells = CASES.map(({ c, r, i }) => {
            const { x, y } = centre(c, r);
            const donnee = P.donnees[i] !== 0;
            const v = this.saisie[i];
            return `<g transform="translate(${x.toFixed(1)}, ${y.toFixed(1)})">
                <polygon class="hx-cell${donnee ? ' hx-cell--donnee' : v ? '' : ' hx-cell--vide'}${eclairees.has(i) ? ' hx-cell--eclairee' : ''}"
                         data-cell="${i}" points="${CONTOUR}"></polygon>
                ${v ? `<text class="hx-nb ${donnee ? 'hx-nb--donnee' : 'hx-nb--pose'}">${v}</text>` : ''}
            </g>`;
        }).join('');

        const fleches = P.fleches.map(f => this.fleche(f, justes.has(f.id))).join('');

        // Le cadre se calcule dans le noyau : voir `cadreHexagrille`.
        const cadre = cadreHexagrille(P.fleches);
        const minX = cadre.x, minY = cadre.y, W = cadre.w, H = cadre.h;
        this.plateauEl.innerHTML = `
            <svg class="hx-svg" viewBox="${minX.toFixed(0)} ${minY.toFixed(0)} ${W.toFixed(0)} ${H.toFixed(0)}"
                 role="img" aria-label="Hexagrille de neuf cases">
                <defs>
                    <!-- Deux pointes plutôt qu'une : un marqueur ne reprend pas
                         la couleur du trait qui l'appelle, et une flèche verte
                         terminée par une pointe grise se lit « à moitié faite ». -->
                    <marker id="hx-pointe" viewBox="0 0 10 10" refX="8" refY="5"
                            markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" class="hx-pointe"/>
                    </marker>
                    <marker id="hx-pointe-ok" viewBox="0 0 10 10" refX="8" refY="5"
                            markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" class="hx-pointe hx-pointe--juste"/>
                    </marker>
                    <marker id="hx-pointe-vu" viewBox="0 0 10 10" refX="8" refY="5"
                            markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" class="hx-pointe hx-pointe--vue"/>
                    </marker>
                </defs>
                ${cells}${fleches}
            </svg>`;

        this.plateauEl.querySelectorAll('[data-cell]').forEach(el => {
            el.style.cursor = P.donnees[Number(el.dataset.cell)] ? 'default' : 'pointer';
            el.addEventListener('click', () => this.toucherCase(Number(el.dataset.cell)));
        });
        this.plateauEl.querySelectorAll('[data-file]').forEach(el => {
            el.addEventListener('click', () => {
                // Un second appui éteint : on ne reste pas coincé sur une file.
                this.fileVue = this.fileVue === el.dataset.file ? null : el.dataset.file;
                this.dessiner();
            });
        });

        this.dessinerReserve();
        this.compteEl.textContent = `${this.reussies} grille${this.reussies > 1 ? 's' : ''} réussie${this.reussies > 1 ? 's' : ''}`;
    }

    /**
     * Une flèche : le trait qui entre dans la file, et sa somme au départ.
     *
     * IL N'Y A PLUS DE « DÉJÀ 8 ». Le total courant de chaque file s'écrivait
     * sous sa somme : il n'y avait plus qu'à soustraire deux nombres qu'on
     * avait sous les yeux, sans jamais additionner les cases. Rémy : « enlève
     * le déjà 7 ou déjà 8, c'est trop simple. » Additionner sa file est
     * précisément le travail que l'hexagrille demande.
     *
     * ELLE S'ÉCLAIRE AU DOIGT, en revanche. Sur huit flèches qui partent
     * toutes du même côté, savoir LAQUELLE désigne quoi demandait de suivre le
     * trait des yeux à travers le losange. Un appui sur le nombre allume sa
     * file entière — et c'est un geste de lecture, pas un indice : il ne dit
     * rien qui ne soit déjà dessiné.
     */
    fleche(f, juste) {
        const p = repereFleche(f);
        const vue = this.fileVue === f.id;
        const etat = vue ? '--vue' : juste ? '--juste' : '';
        const pointe = vue ? '-vu' : juste ? '-ok' : '';
        return `<g class="hx-file" data-file="${f.id}">
            <line class="hx-file-zone"
                  x1="${p.x1.toFixed(1)}" y1="${p.y1.toFixed(1)}"
                  x2="${p.x2.toFixed(1)}" y2="${p.y2.toFixed(1)}"></line>
            <circle class="hx-file-zone" cx="${p.ex.toFixed(1)}" cy="${p.ey.toFixed(1)}" r="17"></circle>
            <line class="hx-fleche${etat ? ' hx-fleche' + etat : ''}"
                  x1="${p.x1.toFixed(1)}" y1="${p.y1.toFixed(1)}"
                  x2="${p.x2.toFixed(1)}" y2="${p.y2.toFixed(1)}"
                  marker-end="url(#hx-pointe${pointe})"></line>
            <text class="hx-somme${etat ? ' hx-somme' + etat : ''}"
                  x="${p.ex.toFixed(1)}" y="${p.ey.toFixed(1)}">${f.somme}</text>
        </g>`;
    }

    dessinerReserve() {
        const places = new Set(this.saisie.filter(v => v));
        const restants = [];
        for (let v = 1; v <= 9; v++) if (!places.has(v)) restants.push(v);
        this.reserveEl.innerHTML = restants.map(v =>
            `<button type="button" class="btn-carre hx-jeton${this.choisi === v ? ' hx-jeton--choisi' : ''}"
                     data-jeton="${v}">${v}</button>`).join('');
        this.reserveEl.querySelectorAll('[data-jeton]').forEach(b => {
            const v = Number(b.dataset.jeton);
            b.onclick = () => { this.choisi = this.choisi === v ? null : v; this.dessinerReserve(); };
            rendreGlissable(b, {
                cibles: '[data-cell]',
                deposer: (cible) => this.deposer(Number(cible.dataset.cell), v),
                zoneRetour: this.reserveEl,
                actif: () => !this.isDemo && !this.finie
            });
        });
    }

    // --- Jouer ---------------------------------------------------------------

    toucherCase(i) {
        if (this.isDemo || this.finie) return;
        if (this.puzzle.donnees[i]) return;           // une case donnée ne bouge pas
        if (this.saisie[i]) {                          // on reprend le chiffre posé
            this.saisie[i] = 0;
            this.choisi = null;
            this.dessiner();
            return;
        }
        if (this.choisi == null) { this.note('Choisis d\'abord un chiffre dans la réserve.'); return; }
        this.deposer(i, this.choisi);
    }

    deposer(i, v) {
        if (this.isDemo || this.finie) return;
        if (this.puzzle.donnees[i]) return;
        // Un chiffre déjà posé ailleurs se DÉPLACE : il n'existe qu'en un
        // exemplaire, et l'élève doit pouvoir se raviser sans tout défaire.
        const ancien = this.saisie.indexOf(v);
        if (ancien >= 0) this.saisie[ancien] = 0;
        this.saisie[i] = v;
        this.choisi = null;
        this.dessiner();
        this.verifier();
    }

    verifier() {
        if (!estResolue(this.saisie, this.puzzle)) {
            const restants = 9 - this.saisie.filter(v => v).length;
            if (restants === 0) {
                this.note('Tous les chiffres sont placés, mais une file au moins ne tombe pas juste. '
                    + 'Regarde les flèches qui ne sont pas vertes.', 'ko');
                this.onWrongAnswer(null, {
                    concept: COMPETENCE,
                    questionText: `Hexagrille (${this.puzzle.fleches.length} flèches)`,
                    input: 'grille complète', expected: 'toutes les files justes',
                    customMessage: 'Une file au moins ne tombe pas juste : reprends celles dont la flèche n\'est pas verte.',
                    silencieux: true
                });
            }
            return;
        }
        this.finie = true;
        this.reussies++;
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Hexagrille (${this.puzzle.fleches.length} flèches, niveau ${this.niveau})`,
            expected: 'grille complète', given: 'grille complète',
            points: 10 + this.puzzle.fleches.length * 2
        });
        this.note('✅ Toutes les files tombent juste. Une autre ?', 'ok');
        this.compteEl.textContent = `${this.reussies} grille${this.reussies > 1 ? 's' : ''} réussie${this.reussies > 1 ? 's' : ''}`;
    }

    // --- L'aide : la MÉTHODE, jamais le chiffre nu ---------------------------

    aider() {
        if (this.isDemo || this.finie) return;
        const coup = prochainCoup(this.saisie, this.puzzle);
        if (!coup) {
            this.note('Aucune file n\'a exactement une case vide pour l\'instant. '
                + 'Place un chiffre dont tu es sûr, ou reprends-en un.');
            return;
        }
        this.aides++;
        const f = coup.file;
        const connus = f.cases.filter(i => this.saisie[i]).map(i => this.saisie[i]);
        this.note(`Regarde la file qui doit faire <b>${f.somme}</b> : il n'y manque qu'une case. `
            + `Tu y as déjà ${connus.join(' + ')} = <b>${connus.reduce((t, v) => t + v, 0)}</b>. `
            + `Il manque donc ${f.somme} − ${connus.reduce((t, v) => t + v, 0)}.`);
        // On surligne la file, on ne remplit pas : le calcul reste à l'élève.
        f.cases.forEach(i => {
            const el = this.plateauEl.querySelector(`[data-cell="${i}"]`);
            if (el) el.classList.add('hx-cell--survol');
        });
    }

    note(html, genre) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html;
        this.noteEl.className = `hx-note${genre ? ` hx-note--${genre}` : ''}`;
    }

    // --- La démonstration ----------------------------------------------------

    async runDemoSequence() {
        this.poser();
        if (!this.cursor) this.cursor = createDemoCursor();
        if (!this.gate) this.gate = createDemoGate(this.container);
        const fin = () => { this.cursor?.hideBubble(); return true; };

        if (!await this.cursor.pause(600)) return fin();
        this.cursor.say('Neuf cases, les chiffres de 1 à 9, chacun une seule fois. '
            + 'Chaque flèche donne la somme de la file qu\'elle désigne.', this.plateauEl);
        if (!await this.cursor.pause(DEMO_SPEED.between + 1200)) return fin();

        // Le robot déroule la grille comme on la résout : toujours la file où
        // il ne manque qu'une case.
        for (let tour = 0; tour < 9; tour++) {
            const coup = prochainCoup(this.saisie, this.puzzle);
            if (!coup) break;
            if (!await this.gate.waitTurn()) return fin();
            const connus = coup.file.cases.filter(i => this.saisie[i]).map(i => this.saisie[i]);
            const somme = connus.reduce((t, v) => t + v, 0);
            this.cursor.say(`Cette file doit faire ${coup.file.somme}. J'y ai déjà `
                + `${connus.join(' + ')} = ${somme}. Il manque ${coup.file.somme} − ${somme} = ${coup.valeur}.`,
            this.plateauEl.querySelector(`[data-cell="${coup.case}"]`) || this.plateauEl);
            if (!await this.cursor.pause(DEMO_SPEED.settle + 600)) return fin();
            this.saisie[coup.case] = coup.valeur;
            this.dessiner();
        }

        if (!await this.gate.waitTurn()) return fin();
        this.cursor.say('Toutes les files tombent juste. On n\'a jamais deviné : '
            + 'chaque case est venue d\'une soustraction.', this.plateauEl);
        await this.cursor.pause(DEMO_SPEED.between + 800);
        return fin();
    }

    destroy() {
        if (this.cursor) { this.cursor.destroy(); this.cursor = null; }
        if (this.gate) { this.gate.destroy(); this.gate = null; }
        super.destroy();
    }
}

export function engineHexagrille(container, isDemo, params) {
    const game = new Hexagrille(container, isDemo, params);
    game.start();
    return game;
}
