// LE QUADRILATÈRE QUI SE TRANSFORME.
//
// Rémy : « on a un quadrilatère qui n'a rien de particulier, et on a des
// vignettes que l'on peut faire glisser sur le quadrilatère du genre côté
// opposé parallèle, et on voit le quadrilatère se transformer en absorbant la
// nouvelle propriété et on doit deviner ce que ça va devenir. Cela peut être
// très progressif avec l'organigramme qui apparaît au fur et à mesure. »
//
// TROIS TEMPS, ET L'ORDRE COMPTE :
//   1. on CHOISIT une vignette et on la lâche sur la figure ;
//   2. on DIT ce qu'elle va devenir — avant que rien ne bouge ;
//   3. la figure se déforme, et l'on voit si l'on avait raison.
//
// Deviner AVANT est tout l'exercice : l'animation devient la CORRECTION, pas
// la question. Si la figure bougeait d'abord, il n'y aurait plus qu'à lire le
// résultat, et l'on aurait fabriqué un exercice de reconnaissance de plus.
//
// LE CODAGE SE GAGNE AU PASSAGE. Chaque propriété posée reste sur la figure
// sous sa forme de géomètre — flèches de parallélisme, traits d'égalité, petit
// carré d'angle droit. L'élève apprend le codage sans qu'on le lui enseigne :
// c'est la mémoire de ce qu'il a posé.
//
// Les règles — les propriétés, la déformation, le nom de ce qui est dessiné —
// vivent dans core/quadriMorph.js, testées sans navigateur.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { brancherGlisserPalette } from '../core/activities/paletteDrag.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import { FAMILLES, POSITIONS, FLECHES, ancetres } from '../core/quadrilateres.js';
import {
    PALIERS, CADRE, proprieteDe, genererDefi, poser, cheminDe
} from '../core/quadriMorph.js';

const COMPETENCE = 'geo.quadrilateres.familles';
const DUREE_MORPH = 900;

const nomFamille = (id) => (FAMILLES.find(f => f.id === id) || {}).nom || id;

class QuadriMorph extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'quadri-morph');
        this.rng = makeRng(this.params.seed);
        this.palier = PALIERS[this.params.palier] ? this.params.palier : 'decouverte';
        this.phase = 'choisir';       // choisir → deviner → montrer
        this.carte = null;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .qm-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 10px;
                    width: 100%; height: 100%; padding: 10px 12px 12px; box-sizing: border-box;
                    color: var(--text-main); container-type: inline-size; min-height: 0;
                    overflow-y: auto;
                }
                .qm-consigne { font-weight: 800; font-size: 1.02rem; text-align: center; }
                .qm-corps {
                    display: flex; gap: 16px; align-items: flex-start; justify-content: center;
                    width: 100%; flex-wrap: wrap;
                }
                /* LA FIGURE À GAUCHE, L'ARBRE À DROITE. Les deux doivent rester
                   visibles ENSEMBLE : c'est en regardant l'un qu'on comprend
                   l'autre, et l'élève qui doit faire défiler pour passer de la
                   figure à sa place dans l'arbre a perdu le lien. */
                .qm-scene { flex: 0 1 300px; min-width: 230px; max-width: 300px; }
                .qm-arbre { flex: 0 1 300px; min-width: 210px; }
                .qm-fig { width: 100%; height: auto; display: block;
                    background: var(--bg-panel); border: 1px solid var(--border);
                    border-radius: 16px; }
                .qm-fig--visee { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(99,102,241,.25); }
                .qm-nom {
                    text-align: center; font-weight: 800; font-size: 1.05rem; margin-top: 6px;
                    color: var(--primary); min-height: 1.4em;
                }

                /* LES VIGNETTES. Du texte, pas des pastilles : « les diagonales
                   se coupent en leur milieu » ne tient pas dans un carré de 56
                   pixels, et c'est la règle globale des jetons. */
                .qm-cartes { display: flex; flex-wrap: wrap; gap: 7px; justify-content: center;
                    width: 100%; max-width: 660px; }
                .qm-cartes .kk-chip {
                    width: auto; height: auto; min-height: 0; padding: 8px 13px;
                    border-radius: 12px; font-size: .84rem; font-weight: 700; line-height: 1.25;
                    background: var(--bg-panel); border: 2px solid var(--border);
                    color: var(--text-main); cursor: grab; max-width: 220px; text-align: center;
                }
                .qm-cartes .kk-chip:hover { border-color: var(--primary); }
                .qm-chip--posee { opacity: .45; pointer-events: none; border-style: dashed; }

                .qm-noms { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
                .qm-nom-btn {
                    padding: 9px 16px; border-radius: 12px; border: 2px solid var(--border);
                    background: var(--bg-panel); color: var(--text-main);
                    font: inherit; font-weight: 800; cursor: pointer;
                }
                .qm-nom-btn:hover { border-color: var(--primary); }
                .qm-nom-btn--juste { border-color: var(--success); background: rgba(22,163,74,.12); }
                .qm-nom-btn--faux { border-color: var(--danger); background: rgba(220,38,38,.1); }

                .qm-note { min-height: 2.6em; text-align: center; font-size: .88rem;
                    line-height: 1.4; color: var(--text-muted); max-width: 620px; }
                .qm-note--ok { color: var(--success); font-weight: 700; }
                .qm-note--ko { color: var(--danger); font-weight: 600; }
                .qm-barre { display: flex; gap: 7px; flex-wrap: wrap; justify-content: center; }
                .qm-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700;
                    padding: 7px 12px; font-size: .85rem; min-height: 38px;
                }

                /* L'ARBRE QUI POUSSE. Une case grise tant qu'on n'y est pas
                   passé, en couleur dès qu'on l'atteint : c'est l'élève qui
                   construit la carte qu'il devra lire dans l'autre exercice. */
                .qm-case {
                    fill: var(--bg-panel); stroke: var(--border); stroke-width: 1.2;
                    transition: fill .4s ease, stroke .4s ease;
                }
                .qm-case--vue { fill: #eef2ff; stroke: #6366f1; stroke-width: 2; }
                .qm-case--ici { fill: #fef3c7; stroke: #f59e0b; stroke-width: 3; }
                .qm-etiq { font-size: 5.2px; font-weight: 800; fill: var(--text-muted); }
                .qm-etiq--vue { fill: var(--text-main); }
                .qm-fleche { stroke: var(--border); stroke-width: 1.1; fill: none;
                    transition: stroke .4s ease; }
                .qm-fleche--vue { stroke: #6366f1; stroke-width: 2.2; }

                /* EN COLONNE, LES DEUX SE SERRENT. Empilés à leur taille de
                   bureau, la figure et l'arbre prenaient tout l'écran d'un
                   téléphone et repoussaient les vignettes sous le pli : on ne
                   voyait plus ce sur quoi il fallait agir. L'arbre cède le
                   plus — c'est un repère, pas la zone de travail. */
                @container (max-width: 640px) {
                    .qm-corps { flex-direction: column; align-items: center; gap: 6px; }
                    .qm-scene { flex: 0 0 auto; width: min(230px, 72%); max-width: 230px; }
                    .qm-arbre { flex: 0 0 auto; width: min(190px, 62%); }
                    .qm-cartes .kk-chip { font-size: .78rem; padding: 7px 10px; }
                    .qm-nom { font-size: .95rem; margin-top: 2px; }
                }
            </style>
            <div class="qm-wrap">
                <div class="qm-consigne" data-consigne></div>
                <div class="qm-corps">
                    <div class="qm-scene">
                        <div data-figure></div>
                        <div class="qm-nom" data-famille></div>
                    </div>
                    <div class="qm-arbre" data-arbre></div>
                </div>
                <div data-zone></div>
                <div class="qm-note" data-note></div>
                <div class="qm-barre">
                    <button type="button" class="qm-btn" data-recommencer>↺ Repartir d'un quadrilatère</button>
                    <button type="button" class="qm-btn" data-neuf>Autre figure</button>
                </div>
            </div>`;

        this.consigneEl = this.container.querySelector('[data-consigne]');
        this.figEl = this.container.querySelector('[data-figure]');
        this.familleEl = this.container.querySelector('[data-famille]');
        this.arbreEl = this.container.querySelector('[data-arbre]');
        this.zoneEl = this.container.querySelector('[data-zone]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.container.querySelector('[data-recommencer]').onclick = () => this.recommencer();
        this.container.querySelector('[data-neuf]').onclick = () => this.showNext();
    }

    startGameLoop() { this.poserDefi(); }

    showNext() { return this.poserDefi(); }

    poserDefi() {
        this.defi = genererDefi({ rng: this.rng, palier: this.palier });
        this.phase = 'choisir';
        this.carte = null;
        this.dessiner();
        this.note('Choisis une propriété et pose-la sur la figure. Avant qu\'elle ne bouge, '
            + 'tu diras ce qu\'elle va devenir.');
        return true;
    }

    recommencer() {
        if (this.isDemo || !this.defi) return;
        this.defi = { ...this.defi, points: this.defi.depart, posees: [], famille: 'quadrilatere' };
        this.phase = 'choisir';
        this.carte = null;
        this.dessiner();
        this.note('On repart du quadrilatère quelconque.');
    }

    // --- Le dessin ------------------------------------------------------------

    dessiner() {
        this.figEl.innerHTML = figureSvg(this.defi.points, this.defi.posees);
        this.familleEl.textContent = this.defi.posees.length
            ? nomFamille(this.defi.famille) : 'Quadrilatère quelconque';
        this.arbreEl.innerHTML = arbreSvg(cheminDe(this.defi.posees), this.defi.famille);
        this.dessinerZone();
    }

    dessinerZone() {
        if (this.phase === 'deviner') {
            const prop = proprieteDe(this.carte);
            this.consigneEl.textContent = `Tu poses « ${prop.nom} ». Que va devenir la figure ?`;
            this.zoneEl.innerHTML = `<div class="qm-noms">${FAMILLES.map(f =>
                `<button type="button" class="qm-nom-btn" data-fam="${f.id}">${f.nom}</button>`
            ).join('')}</div>`;
            this.zoneEl.querySelectorAll('[data-fam]').forEach(b => {
                b.onclick = () => this.deviner(b.dataset.fam, b);
            });
            return;
        }
        const reste = this.defi.aPoser - this.defi.posees.length;
        this.consigneEl.textContent = reste > 0
            ? `Pose une propriété sur la figure — encore ${reste} à poser.`
            : 'Bravo : tu as descendu l\'arbre. Passe à une autre figure.';
        this.zoneEl.innerHTML = `<div class="qm-cartes">${this.defi.cartes.map(id => {
            const p = proprieteDe(id);
            const posee = this.defi.posees.includes(id);
            // LE NOM COURT SUR LA VIGNETTE, LE NOM ENTIER DANS LA QUESTION.
            // Huit vignettes de deux lignes prenaient quatre rangées et
            // poussaient la note hors de l'écran ; et de toute façon la phrase
            // complète est relue au moment où l'on demande ce que la figure va
            // devenir — c'est là qu'elle compte.
            return `<button type="button" class="kk-chip${posee ? ' qm-chip--posee' : ''}"
                data-carte="${id}" title="${echapper(p.nom)}"
                ${posee ? 'disabled' : ''}>${echapper(p.court)}</button>`;
        }).join('')}</div>`;
        this.brancherCartes();
    }

    brancherCartes() {
        if (this.isDemo) return;
        this.zoneEl.querySelectorAll('[data-carte]').forEach(chip => {
            chip.onclick = () => this.choisir(chip.dataset.carte);
        });
        // ET ON PEUT LA GLISSER, comme Rémy l'a demandé : le geste de POSER une
        // propriété SUR la figure dit ce que le clic ne dit pas — que la
        // propriété va dans la figure, et non à côté.
        brancherGlisserPalette(this.container, {
            classeVisee: 'qm-fig--visee',
            bloque: () => this.phase !== 'choisir',
            cibleSous: (e) => {
                const el = document.elementFromPoint(e.clientX, e.clientY);
                return (el && el.closest('.qm-fig')) || null;
            },
            deposer: (cible, chip) => this.choisir(chip.dataset.carte)
        });
    }

    choisir(id) {
        if (this.isDemo || this.phase !== 'choisir') return;
        if (!id || this.defi.posees.includes(id)) return;
        this.carte = id;
        this.phase = 'deviner';
        this.dessinerZone();
        this.note('Regarde la figure et la propriété : de quelle famille va-t-elle devenir ?');
    }

    deviner(famille, bouton) {
        if (this.isDemo || this.phase !== 'deviner') return;
        const suite = poser(this.defi, this.carte);
        const juste = famille === suite.famille;
        this.phase = 'montrer';

        bouton.classList.add(juste ? 'qm-nom-btn--juste' : 'qm-nom-btn--faux');
        if (!juste) {
            const bon = this.zoneEl.querySelector(`[data-fam="${suite.famille}"]`);
            if (bon) bon.classList.add('qm-nom-btn--juste');
        }
        const detail = `${nomFamille(this.defi.famille)} + « ${proprieteDe(this.carte).nom} »`;
        if (juste) {
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: detail, expected: nomFamille(suite.famille), given: nomFamille(famille),
                points: 12
            });
        } else {
            this.onWrongAnswer(null, {
                concept: COMPETENCE, questionText: detail,
                input: nomFamille(famille), expected: nomFamille(suite.famille), silencieux: true
            });
        }

        // LA DÉFORMATION EST LA CORRECTION. On la joue dans tous les cas — c'est
        // en la voyant qu'on comprend pourquoi on avait tort, et le mot qui
        // suit ne fait que nommer ce qu'on vient de voir.
        this.animer(this.defi.points, suite.points, suite.posees, () => {
            this.defi = { ...this.defi, ...suite };
            this.dessiner();
            this.phase = 'choisir';
            this.dessinerZone();
            this.note(`${juste ? '✅ ' : '❌ '}${juste ? 'Oui : ' : 'C\'était '}`
                + `${nomFamille(suite.famille).toLowerCase()}. ${suite.mot}`, juste ? 'ok' : 'ko');
        });
    }

    /**
     * LA FIGURE SE DÉFORME, elle ne saute pas. C'est TOUT l'intérêt de
     * l'exercice : voir les sommets glisser jusqu'à ce que la contrainte soit
     * satisfaite. Une interpolation droite entre les deux états suffit — et
     * vaut mieux que le chemin du solveur, qui zigzague.
     */
    animer(de, vers, posees, fin) {
        if (this.isDemo || typeof requestAnimationFrame !== 'function') { fin(); return; }
        const t0 = performance.now();
        const pas = (t) => {
            const k = Math.min(1, (t - t0) / DUREE_MORPH);
            // Un départ et une arrivée doux : la figure « se pose » au lieu de
            // s'arrêter net.
            const a = k < 0.5 ? 2 * k * k : 1 - ((-2 * k + 2) ** 2) / 2;
            const P = de.map((p, i) => [
                p[0] + (vers[i][0] - p[0]) * a,
                p[1] + (vers[i][1] - p[1]) * a
            ]);
            this.figEl.innerHTML = figureSvg(P, posees, { pendant: true });
            if (k < 1) requestAnimationFrame(pas);
            else fin();
        };
        requestAnimationFrame(pas);
    }

    note(texte, genre) {
        this.noteEl.textContent = texte || '';
        this.noteEl.className = 'qm-note' + (genre ? ` qm-note--${genre}` : '');
    }

    // --- La démonstration du robot ---------------------------------------------

    async runDemoSequence() {
        const cursor = createDemoCursor();
        const gate = createDemoGate(this.container);
        this.demoCursor = cursor;
        if (!await gate.waitTurn()) return;
        cursor.say('Une propriété, ce n\'est pas une étiquette : c\'est une CONTRAINTE.',
            this.figEl);
        if (!await cursor.pause(DEMO_SPEED.settle)) return;
        if (!await gate.waitTurn()) return;
        cursor.say('Je la pose sur la figure, et la figure se déforme pour la respecter.',
            this.zoneEl);
        if (!await cursor.pause(DEMO_SPEED.settle)) return;
        if (!await gate.waitTurn()) return;
        cursor.say('Chaque propriété en plus RÉTRÉCIT la famille. C\'est ça, l\'arbre.',
            this.arbreEl);
        await cursor.pause(DEMO_SPEED.between);
    }
}

// --- La figure, avec le codage du géomètre -------------------------------------

/**
 * LE CODAGE EST LA MÉMOIRE DE CE QU'ON A POSÉ. Flèches sur les côtés
 * parallèles, traits sur les côtés de même longueur, petit carré dans l'angle
 * droit : c'est la notation du collège, et l'élève l'apprend ici sans qu'on la
 * lui enseigne — parce qu'elle DIT quelque chose dont il a besoin.
 */
export function figureSvg(P, posees = [], { pendant = false } = {}) {
    const T = (v) => Math.round(v * 100) / 100;
    const d = P.map((p, i) => `${i ? 'L' : 'M'}${T(p[0])} ${T(p[1])}`).join(' ') + ' Z';
    const c = caracteresVus(posees);
    let marques = '';

    // Les diagonales, quand une vignette parle d'elles.
    if (posees.some(id => id.startsWith('diagonales'))) {
        marques += `<path d="M${T(P[0][0])} ${T(P[0][1])} L${T(P[2][0])} ${T(P[2][1])}"
            stroke="#9467bd" stroke-width="0.8" stroke-dasharray="3 2" fill="none"/>`
            + `<path d="M${T(P[1][0])} ${T(P[1][1])} L${T(P[3][0])} ${T(P[3][1])}"
            stroke="#9467bd" stroke-width="0.8" stroke-dasharray="3 2" fill="none"/>`;
    }
    // Les flèches de parallélisme : une sur la première paire, deux sur la seconde.
    if (c.par1) marques += chevrons(P, 0) + chevrons(P, 2);
    if (c.par2) marques += chevrons(P, 1, 2) + chevrons(P, 3, 2);
    // Les traits d'égalité.
    if (c.egaux) marques += [0, 1, 2, 3].map(i => barres(P, i, 1)).join('');
    else if (c.opposes) marques += barres(P, 0, 1) + barres(P, 2, 1) + barres(P, 1, 2) + barres(P, 3, 2);
    // Le petit carré de l'angle droit, en A.
    if (c.droit) marques += angleDroit(P);

    return `<svg class="qm-fig${pendant ? ' qm-fig--pendant' : ''}" viewBox="0 0 ${CADRE} ${CADRE}"
        role="img" aria-label="quadrilatère">
        <path d="${d}" fill="rgba(99,102,241,.10)" stroke="#4338ca" stroke-width="1.6"
            stroke-linejoin="round"/>
        ${marques}
        ${P.map((p, i) => `<text x="${T(p[0] + (p[0] < 50 ? -4.5 : 4.5))}"
            y="${T(p[1] + (p[1] < 50 ? -3.5 : 5.5))}" font-size="6" font-weight="800"
            fill="#1a202c" text-anchor="middle">${'ABCD'[i]}</text>`).join('')}
    </svg>`;
}

/** Ce que le codage doit montrer, d'après ce qui a été posé. */
function caracteresVus(posees) {
    const c = { par1: false, par2: false, egaux: false, droit: false, opposes: false };
    posees.forEach(id => {
        if (id === 'unePaireParallele') c.par1 = true;
        if (id === 'opposesParalleles') { c.par1 = true; c.par2 = true; }
        if (id === 'quatreCotesEgaux') c.egaux = true;
        if (id === 'cotesOpposesEgaux') c.opposes = true;
        if (id === 'unAngleDroit') c.droit = true;
    });
    return c;
}

/** Un ou deux chevrons au milieu du côté i, pointés dans son sens. */
function chevrons(P, i, combien = 1) {
    const A = P[i], B = P[(i + 1) % 4];
    // AU TIERS DU CÔTÉ, PAS AU MILIEU : les traits d'égalité s'écrivent au
    // milieu, et les deux marques se chevauchaient — un enchevêtrement rouge et
    // vert où l'on ne lisait plus ni l'un ni l'autre.
    const mx = A[0] + (B[0] - A[0]) * 0.34, my = A[1] + (B[1] - A[1]) * 0.34;
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
    const ux = (B[0] - A[0]) / L, uy = (B[1] - A[1]) / L;
    let out = '';
    for (let k = 0; k < combien; k++) {
        const cx = mx - ux * (k * 2.6), cy = my - uy * (k * 2.6);
        out += `<path d="M${(cx - ux * 2 - uy * 2).toFixed(2)} ${(cy - uy * 2 + ux * 2).toFixed(2)}
            L${cx.toFixed(2)} ${cy.toFixed(2)}
            L${(cx - ux * 2 + uy * 2).toFixed(2)} ${(cy - uy * 2 - ux * 2).toFixed(2)}"
            fill="none" stroke="#2ca02c" stroke-width="1" stroke-linecap="round"/>`;
    }
    return out;
}

/** Un ou deux petits traits en travers du côté i : la marque d'égalité. */
function barres(P, i, combien = 1) {
    const A = P[i], B = P[(i + 1) % 4];
    const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
    const ux = (B[0] - A[0]) / L, uy = (B[1] - A[1]) / L;
    let out = '';
    for (let k = 0; k < combien; k++) {
        const cx = mx + ux * (k * 2.2 - (combien - 1) * 1.1);
        const cy = my + uy * (k * 2.2 - (combien - 1) * 1.1);
        out += `<path d="M${(cx - uy * 2.4).toFixed(2)} ${(cy + ux * 2.4).toFixed(2)}
            L${(cx + uy * 2.4).toFixed(2)} ${(cy - ux * 2.4).toFixed(2)}"
            stroke="#d62728" stroke-width="1" stroke-linecap="round"/>`;
    }
    return out;
}

/** Le petit carré de l'angle droit, posé dans le sommet A. */
function angleDroit(P) {
    const [A, B, , D] = P;
    const u = unite(A, B), v = unite(A, D), t = 6;
    return `<path d="M${(A[0] + u[0] * t).toFixed(2)} ${(A[1] + u[1] * t).toFixed(2)}
        L${(A[0] + (u[0] + v[0]) * t).toFixed(2)} ${(A[1] + (u[1] + v[1]) * t).toFixed(2)}
        L${(A[0] + v[0] * t).toFixed(2)} ${(A[1] + v[1] * t).toFixed(2)}"
        fill="none" stroke="#e07b00" stroke-width="1.1"/>`;
}

function unite(A, B) {
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
    return [(B[0] - A[0]) / L, (B[1] - A[1]) / L];
}

// --- L'arbre qui pousse ---------------------------------------------------------

/**
 * L'ORGANIGRAMME SE DESSINE À MESURE. Rémy : « cela peut être très progressif
 * avec l'organigramme qui apparaît au fur et à mesure ».
 *
 * Toutes les cases sont là dès le début — en gris pâle, éteintes : l'élève doit
 * voir qu'il y a un chemin, sans savoir encore lequel il prendra. Ce sont les
 * cases VISITÉES qui s'allument, et les flèches qui les relient. À la fin, il a
 * construit lui-même la carte qu'il lira dans l'autre exercice.
 */
export function arbreSvg(chemin, ici) {
    // LA LIGNÉE, PAS SEULEMENT LES ÉTAPES POSÉES. En lâchant « côtés opposés
    // parallèles » sur un quadrilatère quelconque, on saute directement au
    // parallélogramme — mais on est PASSÉ par le trapèze, qu'on le veuille ou
    // non : un parallélogramme EST un trapèze. L'arbre doit le montrer, sans
    // quoi il laisserait croire qu'il existe un raccourci.
    const vues = new Set([...chemin, ici, ...ancetres(ici)]);
    const W = 100, H = 102;
    let d = '';

    FLECHES.forEach(f => {
        const a = POSITIONS[f.de], b = POSITIONS[f.vers];
        if (!a || !b) return;
        const suivie = vues.has(f.de) && vues.has(f.vers);
        d += `<path class="qm-fleche${suivie ? ' qm-fleche--vue' : ''}"
            d="M${a.x} ${a.y + 5.5} L${b.x} ${b.y - 6}"/>`;
    });

    FAMILLES.forEach(f => {
        const p = POSITIONS[f.id];
        if (!p) return;
        const etat = f.id === ici ? ' qm-case--ici' : (vues.has(f.id) ? ' qm-case--vue' : '');
        d += `<rect class="qm-case${etat}" x="${p.x - 15}" y="${p.y - 5.5}"
            width="30" height="11" rx="3"/>`
            + `<text class="qm-etiq${vues.has(f.id) ? ' qm-etiq--vue' : ''}" x="${p.x}"
            y="${p.y}" text-anchor="middle" dominant-baseline="central">${f.nom}</text>`;
    });

    return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="auto" role="img"
        aria-label="l'arbre des quadrilatères">${d}</svg>`;
}

const echapper = (s) => String(s == null ? '' : s)
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function engineQuadriMorph(container, isDemo, params) {
    const jeu = new QuadriMorph(container, isDemo, params);
    jeu.start();
    return jeu;
}
