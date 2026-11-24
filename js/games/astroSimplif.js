// ASTRO-SIMPLIF — ce qu'on voit, et ce qu'on touche.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Les règles — fractions, canons, capsules, rapports — sont dans
// `js/core/astroSimplif.js`, qui ne dessine rien. Ici, on les MONTRE : un ciel
// en trois couches d'étoiles, des astéroïdes qui portent une fraction, un
// vaisseau, et une rangée de canons au bas de l'écran.
//
// RÉMY, 24 novembre, en collant le jeu : « c'est ça que tu m'intègres ». Ce
// qu'il avait demandé pour MultiKart vaut ici aussi, et pour la même raison :
// pas de son, tout dans la fenêtre, jouable au téléphone.
//
// ── « TOUT PASSE DANS LA FENÊTRE » ───────────────────────────────────────────
//
// Le fichier reçu était une PAGE : trois bandes collées à la hauteur de la
// fenêtre du navigateur (100dvh), des fenêtres en position fixe par-dessus
// tout. Monté dans le cadre d'un exercice, il aurait recouvert l'en-tête du
// parcours. Ici rien ne sort de `.as-wrap` : la toile se mesure sur SA zone,
// et les tailles de texte se lisent sur le conteneur (unités cqmin).
//
// ── « COMPATIBLE TÉLÉPHONE » ─────────────────────────────────────────────────
//
// 1. ON TOUCHE L'ASTÉROÏDE QU'ON VEUT VISER, et le vaisseau y va. Le canon
//    tire toujours sur la cible marquée par le réticule : sans doigt, c'est la
//    plus menaçante, comme dans le jeu reçu.
// 2. LES CANONS PARTENT AU CONTACT (pointerdown), pas au relâché : un tir qui
//    attend que le doigt se lève a l'air de rater.
// 3. LES FRACTIONS RESTENT LISIBLES. Le jeu reçu fixait leur taille en pixels,
//    entre 15 et 20 : lisible sur un ordinateur, illisible au fond d'une
//    classe sur le tableau. Elles suivent maintenant la taille de l'écran.
//
// ── CE QUI EST PARTI ─────────────────────────────────────────────────────────
//
// LE SON — demandé. Le record gardé dans le navigateur : les statistiques du
// logiciel le font déjà, et pour le professeur. Le CHOIX DU GRADE sur l'écran
// d'accueil : il se règle avec l'exercice, comme tous les réglages — l'écran
// d'accueil ne garde que ce qui regarde l'élève, comment on joue.

import { BaseGame } from '../core/BaseGame.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED, dureeDemo } from '../core/demoPointer.js';
import { meneurDemo } from '../core/meneurDemo.js';
import {
    Mission, GRADES, ALLURES, COULEURS, CRITERES, CAPSULES, BOSS_TOUS_LES, SURCHAUFFE,
    chaineEcrite, cheminAvec
} from '../core/astroSimplif.js';

const COMPETENCE = 'num.frac.simplification';
const POLICE = '"Outfit", "Inter", system-ui, sans-serif';
const borner = (v, a, b) => Math.max(a, Math.min(b, v));
const fracTexte = ([n, d]) => `${n}/${d}`;

class AstroSimplif extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'astro-simplif');
        // LA MISSION AVANCE TOUTE SEULE : une carte de correction qui attend un
        // clic laisserait les astéroïdes tomber derrière elle. La correction
        // s'écrit dans le bandeau du haut, le temps de la lire.
        this.tempsReel = true;
        this.graine = this.params.seed || this.params.graine || 'astro';
        this.cleGrade = GRADES[this.params.grade] ? this.params.grade : 'cadet';
        this.allure = ALLURES[this.params.allure] ? this.params.allure : 'normale';
        // LE NOMBRE DE FRACTIONS EST CELUI DE L'ÉTAPE : « 10 fractions » en
        // haut de l'écran, dix astéroïdes, une note sur dix. Hors parcours, dix.
        this.combien = borner(Math.round(Number(this.params.nbQuestions) || 10), 3, 30);
        this.numero = 0;
        this.phase = 'accueil';
        this.effets = { rayons: [], eclats: [], textes: [] };
        this.etoiles = [];
        this.ecrit = {};
    }

    get canons() { return GRADES[this.cleGrade].canons; }

    render() {
        const g = GRADES[this.cleGrade];
        this.container.innerHTML = `
            <style>
                .as-wrap {
                    position: relative; width: 100%; height: 100%; min-height: 260px;
                    display: flex; flex-direction: column; overflow: hidden;
                    background: #050917; color: #f8fafc; font-family: ${POLICE};
                    container-type: size; user-select: none; -webkit-user-select: none;
                    -webkit-tap-highlight-color: transparent;
                }
                .as-tete {
                    flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between;
                    gap: 6px; padding: 5px clamp(6px, 2cqw, 14px); z-index: 3;
                    background: rgba(8, 13, 30, .96); border-bottom: 1px solid rgba(148, 163, 184, .22);
                    font-size: clamp(11px, 2.6cqmin, 15px); font-weight: 800;
                    font-variant-numeric: tabular-nums;
                }
                .as-groupe { display: flex; align-items: center; gap: 6px; min-width: 0; }
                .as-pastille {
                    padding: 3px 9px; border-radius: 999px; white-space: nowrap;
                    background: rgba(5, 9, 23, .8); border: 1px solid rgba(255, 255, 255, .12);
                }
                .as-pastille small { color: #94a3b8; font-size: .78em; text-transform: uppercase; letter-spacing: .04em; margin-right: 4px; }
                .as-score { color: #fde047; }
                .as-combo { color: #6ee7b7; border-color: rgba(52, 211, 153, .36); background: rgba(52, 211, 153, .12); }
                .as-combo--chaud { color: #fef08a; border-color: #fde047; background: rgba(251, 191, 36, .2); }
                .as-rempart { color: #6ee7b7; letter-spacing: 2px; }
                .as-bouton {
                    border: 1px solid rgba(255, 255, 255, .18); border-radius: 999px;
                    background: rgba(30, 41, 59, .92); color: #f8fafc; font: inherit; font-weight: 800;
                    padding: 4px 11px; cursor: pointer; white-space: nowrap;
                }
                .as-bouton:focus-visible, .as-canon:focus-visible, .as-cta:focus-visible { outline: 3px solid #fde047; outline-offset: 2px; }

                .as-arene { position: relative; flex: 1 1 auto; min-height: 0; touch-action: none; }
                .as-arene canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
                .as-haut {
                    position: absolute; top: 8px; left: 50%; transform: translateX(-50%); z-index: 2;
                    width: 94%; max-width: 760px; display: flex; flex-direction: column;
                    align-items: center; gap: 6px; pointer-events: none;
                }
                .as-effets { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
                .as-effet {
                    padding: 3px 11px; border-radius: 999px; font-weight: 800;
                    font-size: clamp(11px, 2.4cqmin, 14px);
                    background: rgba(15, 23, 42, .9); border: 1.5px solid var(--c, #38bdf8);
                }
                /* LE BANDEAU DIT LA CORRECTION. Il reste assez longtemps pour se
                   lire, puis s'efface : la mission ne s'arrête pas.
                   IL EST EN BAS, SUR LE VAISSEAU, et non en haut comme dans le
                   jeu reçu. Mesuré en paysage sur un téléphone (jeu de 280 de
                   haut) : posé en haut, il couvrait l'astéroïde qu'on venait de
                   viser, c'est-à-dire la fraction même dont il parlait. Sous la
                   ligne de défense, il ne cache que le vaisseau. */
                .as-bas {
                    position: absolute; bottom: 6px; left: 50%; transform: translateX(-50%); z-index: 2;
                    width: 94%; max-width: 760px; display: flex; justify-content: center; pointer-events: none;
                }
                .as-retour {
                    padding: 7px 16px; border-radius: 16px; text-align: center; font-weight: 800;
                    font-size: clamp(12px, 3cqmin, 17px); line-height: 1.3;
                    box-shadow: 0 10px 26px rgba(0, 0, 0, .45);
                    opacity: 0; transform: translateY(6px); transition: opacity .18s, transform .18s;
                }
                .as-retour.as-vu { opacity: 1; transform: none; }
                .as-retour--bien { background: rgba(6, 95, 70, .94); border: 1.5px solid #6ee7b7; color: #ecfdf5; }
                .as-retour--faux { background: rgba(136, 19, 55, .94); border: 1.5px solid #fda4af; color: #ffe4e6; }
                .as-retour--info { background: rgba(30, 58, 138, .94); border: 1.5px solid #93c5fd; color: #eff6ff; }

                .as-dock {
                    flex: 0 0 auto; z-index: 3; display: flex; justify-content: center; gap: clamp(4px, 1.2cqw, 8px);
                    padding: 7px clamp(6px, 2cqw, 14px) 9px;
                    background: rgba(8, 13, 30, .96); border-top: 1px solid rgba(148, 163, 184, .22);
                }
                .as-canon {
                    flex: 1 1 0; min-width: 0; max-width: 130px;
                    height: clamp(40px, 9cqh, 56px); border-radius: 14px;
                    border: 2px solid var(--c); color: #fff; cursor: pointer;
                    background: radial-gradient(circle at 50% 18%, rgba(255, 255, 255, .14), rgba(11, 18, 40, .96));
                    font: inherit; font-weight: 900; font-size: clamp(15px, 4cqmin, 22px);
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, .38); touch-action: manipulation;
                    transition: transform .1s, background .1s;
                }
                .as-canon small { font-size: .5em; font-weight: 800; opacity: .7; }
                .as-dock { position: relative; }
                .as-dock::after {
                    content: 'Canons en surchauffe'; position: absolute; left: 0; bottom: 0; height: 3px;
                    width: calc(var(--chaud, 0) * 100%); background: #fb7185; font-size: 0;
                }
                .as-dock--chaud .as-canon { opacity: .45; filter: saturate(.4); }
                .as-dock--non { animation: as-non .25s; }
                @keyframes as-non { 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
                .as-canon--feu { transform: scale(.93); background: var(--c); color: #050917; }
                @container (max-width: 520px) { .as-canon small { display: none; } }

                /* LES VOILES : accueil, pause et bilan. Ils couvrent le jeu, pas la page. */
                .as-voile {
                    position: absolute; inset: 0; z-index: 6; display: none;
                    align-items: center; justify-content: center; padding: 12px;
                    background: rgba(4, 7, 19, .78); overflow-y: auto;
                }
                .as-voile.as-vu { display: flex; }
                .as-carte {
                    width: 100%; max-width: 600px; max-height: 100%; overflow-y: auto;
                    margin: auto; display: flex; flex-direction: column; gap: 12px;
                    padding: clamp(14px, 4cqmin, 24px);
                    background: linear-gradient(180deg, rgba(22, 33, 66, .97), rgba(10, 15, 34, .98));
                    border: 1px solid rgba(255, 255, 255, .3); border-radius: 22px;
                    box-shadow: 0 24px 60px rgba(0, 0, 0, .58);
                    font-size: clamp(12px, 2.9cqmin, 15px); line-height: 1.45;
                }
                .as-sur { align-self: center; padding: 4px 13px; border-radius: 999px; font-size: .8em; font-weight: 800;
                    text-transform: uppercase; letter-spacing: .05em; color: #7dd3fc;
                    background: rgba(56, 189, 248, .16); border: 1px solid rgba(56, 189, 248, .4); }
                .as-titre {
                    margin: 0; text-align: center; font-weight: 900; line-height: 1.1;
                    font-size: clamp(22px, 7cqmin, 40px); text-wrap: balance;
                    background: linear-gradient(135deg, #fff 15%, #7dd3fc 58%, #fde047 100%);
                    -webkit-background-clip: text; background-clip: text; color: transparent;
                }
                .as-texte { margin: 0; text-align: center; color: #cbd5e1; text-wrap: balance; }
                .as-regles { margin: 0; padding-left: 1.2em; color: #e2e8f0; display: grid; gap: 4px; }
                .as-criteres { display: grid; gap: 6px; }
                .as-critere { display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 12px;
                    background: rgba(12, 19, 42, .8); border: 1px solid rgba(255, 255, 255, .1); }
                .as-critere b:first-child { flex: 0 0 auto; min-width: 3.2em; text-align: center; padding: 3px 6px;
                    border-radius: 999px; color: #050917; background: var(--c); }
                .as-cta {
                    border: 0; border-radius: 999px; padding: 12px 20px; cursor: pointer;
                    font: inherit; font-weight: 900; font-size: 1.08em;
                    background: linear-gradient(135deg, #0284c7, #38bdf8); color: #040816;
                    box-shadow: 0 10px 26px rgba(56, 189, 248, .3);
                }
                .as-cta--second { background: rgba(30, 41, 59, .92); color: #f8fafc; border: 1.5px solid rgba(255, 255, 255, .22); box-shadow: none; }
                .as-cta--ambre { background: linear-gradient(135deg, #f59e0b, #fbbf24); color: #050917; box-shadow: none; }
                .as-cta:disabled { opacity: .6; cursor: default; }
                /* « CONTINUER » RESTE EN VUE. Mesuré en paysage sur un téléphone
                   (844 × 390) : le jeu n'a que 280 de haut, la carte défile, et
                   le bouton qui clôt l'étape était sous le bord. Il colle au bas
                   de la carte, et le reste défile derrière lui. */
                .as-actions {
                    display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
                    position: sticky; bottom: calc(-1 * clamp(14px, 4cqmin, 24px)); z-index: 1;
                    margin: 0 calc(-1 * clamp(14px, 4cqmin, 24px)) calc(-1 * clamp(14px, 4cqmin, 24px));
                    padding: 10px clamp(14px, 4cqmin, 24px) clamp(14px, 4cqmin, 24px);
                    background: linear-gradient(180deg, rgba(10, 15, 34, 0), rgba(10, 15, 34, .98) 35%);
                }
                @container (max-height: 440px) {
                    .as-carte { gap: 8px; padding: 12px 16px; }
                    .as-carte .as-sur { display: none; }
                    .as-chiffre { padding: 4px; }
                    .as-chiffre b { font-size: 1.1em; }
                    .as-cta { padding: 8px 16px; }
                    .as-actions { bottom: -12px; margin: 0 -16px -12px; padding: 8px 16px 12px; }
                    .as-regles { gap: 1px; }
                }
                @container (max-width: 460px) { .as-actions { grid-template-columns: 1fr; } }
                .as-chiffres { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
                .as-chiffre { text-align: center; padding: 8px 4px; border-radius: 12px;
                    background: rgba(12, 19, 42, .85); border: 1px solid rgba(255, 255, 255, .1); }
                .as-chiffre b { display: block; color: #fde047; font-size: 1.35em; font-variant-numeric: tabular-nums; }
                .as-chiffre span { color: #94a3b8; font-size: .82em; font-weight: 700; }
                .as-chaines h4 { margin: 0 0 4px; font-size: .82em; text-transform: uppercase; letter-spacing: .04em; color: #6ee7b7; }
                .as-chaines h4.as-ko { color: #fda4af; }
                .as-puces { display: flex; flex-wrap: wrap; gap: 6px; max-height: 9.5em; overflow-y: auto; }
                .as-puces span { padding: 3px 10px; border-radius: 999px; font-weight: 800; font-size: .92em;
                    font-variant-numeric: tabular-nums; }
                .as-puces--ok span { background: rgba(52, 211, 153, .15); border: 1px solid rgba(52, 211, 153, .4); color: #a7f3d0; }
                .as-puces--ko span { background: rgba(251, 113, 133, .14); border: 1px solid rgba(251, 113, 133, .4); color: #fecdd3; }
                .as-lu { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
                @media (prefers-reduced-motion: reduce) { .as-retour { transition: none; } }
            </style>
            <div class="as-wrap" data-wrap>
                <div class="as-tete">
                    <div class="as-groupe">
                        <button type="button" class="as-bouton" data-pause aria-label="Pause et critères de divisibilité"><svg width="10" height="11" viewBox="0 0 10 11" aria-hidden="true" style="margin-right:5px"><rect x="0" y="0" width="3.4" height="11" rx="1" fill="currentColor"/><rect x="6.6" y="0" width="3.4" height="11" rx="1" fill="currentColor"/></svg>Critères</button>
                    </div>
                    <div class="as-groupe">
                        <span class="as-pastille" data-compte><small>Fraction</small><b>1/${this.combien}</b></span>
                        <span class="as-pastille as-score" data-score><small>Score</small><b>0</b></span>
                        <span class="as-pastille as-combo" data-combo>×1</span>
                        <span class="as-pastille as-rempart" data-rempart hidden></span>
                    </div>
                </div>
                <div class="as-arene" data-arene>
                    <canvas data-toile aria-hidden="true"></canvas>
                    <div class="as-haut">
                        <div class="as-effets" data-effets></div>
                    </div>
                    <div class="as-bas">
                        <div class="as-retour" data-retour role="status" aria-live="polite"></div>
                    </div>
                    <p class="as-lu" data-lu aria-live="polite"></p>
                </div>
                <div class="as-dock" data-dock>
                    ${this.canons.map((d, i) => `<button type="button" class="as-canon" data-canon="${d}"
                        style="--c:${COULEURS[d]}" aria-label="Tirer divisé par ${d}">÷ ${d}<small>touche ${i + 1}</small></button>`).join('')}
                </div>

                <div class="as-voile${this.isDemo ? '' : ' as-vu'}" data-accueil>
                    <div class="as-carte">
                        <span class="as-sur">Fractions · critères de divisibilité</span>
                        <h3 class="as-titre">Astro-Simplif</h3>
                        <p class="as-texte">Chaque astéroïde porte une fraction. Rends-la <b>irréductible</b> avant
                            qu'il n'atteigne ton vaisseau : il explose.</p>
                        <ul class="as-regles">
                            <li>Un canon <b>÷ 2</b>, <b>÷ 3</b>… divise le haut <b>et</b> le bas de la fraction visée.</li>
                            <li>Il ne passe que s'il divise <b>les deux</b>. Sinon il rebondit, et l'astéroïde fait un bond vers toi.</li>
                            <li>Touche un astéroïde pour le viser. Les capsules se ramassent au doigt ou avec le vaisseau.</li>
                            <li>Clavier : touches <b>1</b> à <b>${this.canons.length}</b> pour les canons, <b>← →</b> pour bouger, <b>P</b> pour la pause.</li>
                        </ul>
                        <p class="as-texte" data-programme>Grade ${g.nom} — canons ${this.canons.map((d) => `÷ ${d}`).join(', ')}.
                            ${this.combien} fractions, un astéroïde géant toutes les ${BOSS_TOUS_LES}.</p>
                        <button type="button" class="as-cta" data-decoller>Décoller !</button>
                    </div>
                </div>

                <div class="as-voile" data-pause-voile>
                    <div class="as-carte">
                        <span class="as-sur">Mission en pause</span>
                        <h3 class="as-titre" style="font-size:clamp(20px,5.5cqmin,32px)">Critères de divisibilité</h3>
                        <div class="as-criteres">${this.canons.map((d) =>
        `<div class="as-critere" style="--c:${COULEURS[d]}"><b>÷ ${d}</b><span>${CRITERES[d]}</span></div>`).join('')}</div>
                        <button type="button" class="as-cta" data-reprendre>Reprendre la mission</button>
                    </div>
                </div>

                <div class="as-voile" data-fin>
                    <div class="as-carte">
                        <span class="as-sur">Rapport de mission</span>
                        <h3 class="as-titre" data-fin-titre style="font-size:clamp(20px,6cqmin,34px)"></h3>
                        <p class="as-texte" data-fin-texte></p>
                        <div class="as-chiffres" data-chiffres></div>
                        <div class="as-chaines" data-chaines></div>
                        <div class="as-actions">
                            <button type="button" class="as-cta as-cta--ambre" data-encore data-neuf>Rejouer</button>
                            <button type="button" class="as-cta" data-suite>Continuer</button>
                        </div>
                    </div>
                </div>
            </div>`;

        const q = (s) => this.container.querySelector(s);
        this.el = {
            wrap: q('[data-wrap]'), arene: q('[data-arene]'), toile: q('[data-toile]'),
            retour: q('[data-retour]'), effets: q('[data-effets]'), lu: q('[data-lu]'),
            compte: q('[data-compte] b'), score: q('[data-score] b'), combo: q('[data-combo]'),
            rempart: q('[data-rempart]'), pause: q('[data-pause]'), dock: q('[data-dock]'),
            accueil: q('[data-accueil]'), pauseVoile: q('[data-pause-voile]'), fin: q('[data-fin]'),
            encore: q('[data-encore]'), suite: q('[data-suite]')
        };
        this.ctx = this.el.toile.getContext('2d');
        // CE QUE LA SONDE LIT : où sont les astéroïdes À L'ÉCRAN, et lequel est
        // visé. Elle touche ensuite là où ils sont dessinés, comme un doigt
        // (`node tools/sondeAstro.mjs`).
        this.el.wrap.mesure = () => {
            const m = this.mission, r = this.el.arene.getBoundingClientRect();
            const w = this.el.wrap.getBoundingClientRect();
            return {
                phase: this.phase, faites: m.faites, total: m.total, surchauffe: m.surchauffe,
                haut: r.top - w.top,
                cible: (m.cible() || {}).id || null, canons: this.canons,
                asteroides: m.asteroides.map((a) => {
                    const p = this.ecran(a.x, a.y);
                    return { id: a.id, num: a.num, den: a.den, y: a.y, r: this.rayon(a),
                        x: p.x + r.left - w.left, py: p.y + r.top - w.top };
                })
            };
        };
        this.mesurer();
        this.semerEtoiles();
        this.nouvelleMission(null);
        this.brancher();
        if (typeof ResizeObserver !== 'undefined') {
            this.observateur = new ResizeObserver(() => this.mesurer());
            this.observateur.observe(this.el.arene);
        }
        this.dernier = performance.now();
        this.boucle = (t) => {
            if (!this.isRunning) return;
            const dt = Math.min(0.05, Math.max(0, (t - this.dernier) / 1000));
            this.dernier = t;
            if (this.phase === 'jeu' && !this.gelDemo) {
                this.mission.avancer(dt);
                this.lireEvenements();
            }
            this.animer(dt);
            this.dessiner();
            this.majHud();
            this.raf = requestAnimationFrame(this.boucle);
        };
        this.raf = requestAnimationFrame(this.boucle);
        if (this.isDemo) this.phase = 'jeu';
    }

    /* ─────────────────────────────────────────────────────────────────────
     * LES COMMANDES
     * ───────────────────────────────────────────────────────────────────── */

    brancher() {
        const e = this.el;
        e.wrap.querySelector('[data-decoller]').addEventListener('click', () => this.decoller());
        e.pause.addEventListener('click', () => this.basculerPause());
        e.wrap.querySelector('[data-reprendre]').addEventListener('click', () => this.basculerPause(false));
        e.encore.addEventListener('click', () => this.rejouer());
        e.suite.addEventListener('click', () => this.continuer());

        e.wrap.querySelectorAll('[data-canon]').forEach((b) => {
            b.addEventListener('pointerdown', (ev) => {
                ev.preventDefault();
                if (this.isDemo) return;
                this.tirer(Number(b.dataset.canon));
            });
            // Le clavier active un bouton par « click » : on l'accepte, sans
            // doubler le tir du doigt (pointerdown a déjà empêché le clic).
            b.addEventListener('click', (ev) => {
                if (ev.detail === 0 && !this.isDemo) this.tirer(Number(b.dataset.canon));
            });
        });

        let tenu = false;
        const local = (ev) => {
            const r = e.arene.getBoundingClientRect();
            return { x: ev.clientX - r.left, y: ev.clientY - r.top };
        };
        const surArene = (ev) => {
            if (this.phase !== 'jeu' || this.isDemo) return;
            ev.preventDefault();
            tenu = true;
            const { x, y } = local(ev);
            const m = this.mission;
            // 1. Une capsule sous le doigt : on la ramasse.
            for (const c of m.capsules) {
                const p = this.ecran(c.x, c.y);
                if (Math.hypot(p.x - x, p.y - y) <= this.rCapsule * 2) { m.ramasser(c.id); this.lireEvenements(); return; }
            }
            // 2. Un astéroïde sous le doigt : on le vise.
            for (const a of m.asteroides) {
                const p = this.ecran(a.x, a.y);
                if (Math.hypot(p.x - x, p.y - y) <= this.rayon(a) * 1.3) { m.verrouiller(a.id); return; }
            }
            // 3. Ailleurs : le vaisseau y va.
            m.diriger(x / this.L);
        };
        const glisser = (ev) => {
            if (!tenu || this.phase !== 'jeu' || this.isDemo) return;
            this.mission.diriger(local(ev).x / this.L);
        };
        const lacher = () => { tenu = false; };
        e.arene.addEventListener('pointerdown', surArene);
        e.arene.addEventListener('pointermove', glisser);
        window.addEventListener('pointerup', lacher);
        window.addEventListener('pointercancel', lacher);

        this.surTouche = (ev) => {
            if (!this.isRunning || this.isDemo) return;
            if (ev.target && /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName || '')) return;
            const bas = ev.type === 'keydown';
            const k = (ev.key || '').toLowerCase();
            if ((k === 'p' || k === 'escape') && bas && (this.phase === 'jeu' || this.phase === 'pause')) {
                ev.preventDefault();
                this.basculerPause();
                return;
            }
            if (this.phase !== 'jeu') return;
            if (k === 'arrowleft' || k === 'q') { ev.preventDefault(); this.mission.pousser(bas ? -1 : 0); return; }
            if (k === 'arrowright' || k === 'd') { ev.preventDefault(); this.mission.pousser(bas ? 1 : 0); return; }
            if (bas && !ev.repeat && /^[1-9]$/.test(ev.key)) {
                const d = this.canons[Number(ev.key) - 1];
                if (d) { ev.preventDefault(); this.tirer(d); }
            }
        };
        window.addEventListener('keydown', this.surTouche);
        window.addEventListener('keyup', this.surTouche);
        this.detacher = () => {
            window.removeEventListener('keydown', this.surTouche);
            window.removeEventListener('keyup', this.surTouche);
            window.removeEventListener('pointerup', lacher);
            window.removeEventListener('pointercancel', lacher);
        };
    }

    decoller() {
        this.el.accueil.classList.remove('as-vu');
        this.phase = 'jeu';
        this.dernier = performance.now();
    }

    basculerPause(veut) {
        if (this.phase !== 'jeu' && this.phase !== 'pause') return;
        const enPause = veut === undefined ? this.phase === 'jeu' : veut;
        this.phase = enPause ? 'pause' : 'jeu';
        this.el.pauseVoile.classList.toggle('as-vu', enPause);
        if (enPause) this.mission.pousser(0);
        else this.dernier = performance.now();
    }

    tirer(d) {
        if (this.phase !== 'jeu') return;
        const b = this.el.wrap.querySelector(`[data-canon="${d}"]`);
        if (b) {
            b.classList.add('as-canon--feu');
            clearTimeout(b._tempo);
            b._tempo = setTimeout(() => b.classList.remove('as-canon--feu'), 130);
        }
        const cible = this.mission.cible();
        this.mission.tirer(d);
        this.lireEvenements(cible);
    }

    /* ─────────────────────────────────────────────────────────────────────
     * LE DÉROULÉ
     * ───────────────────────────────────────────────────────────────────── */

    nouvelleMission(fractions) {
        this.numero++;
        this.mission = new Mission({
            grade: this.cleGrade,
            // LA DÉMONSTRATION SE JOUE AU RALENTI : le robot parle, et il lui
            // faut le temps de finir sa phrase avant que l'astéroïde arrive.
            allure: this.isDemo ? 'lente' : this.allure,
            combien: this.combien,
            graine: `${this.graine}-${this.numero}`,
            fractions: this.isDemo ? [{ num: 12, den: 18 }] : fractions
        });
        // LA PREMIÈRE MISSION EST CELLE QUI COMPTE. Celles qu'on relance depuis
        // le bilan sont de l'entraînement : leurs réponses nourrissent le
        // carnet d'erreurs sans s'ajouter aux questions de l'étape, qui
        // afficherait sinon « 14 fractions sur 10 ».
        this.comptee = this.numero === 1;
        this.retenue = null;
        this.effets = { rayons: [], eclats: [], textes: [] };
        this.secousse = 0;
        this.ecrit = {};
        this.el.fin.classList.remove('as-vu');
        this.el.suite.disabled = false;
        this.el.suite.textContent = 'Continuer';
    }

    /**
     * CE QUI VIENT DE SE PASSER, lu dans la mission et montré.
     * `vise` est l'astéroïde qu'on visait au moment du tir : celui qui
     * explose a déjà quitté la mission quand on lit l'événement.
     */
    lireEvenements(vise = null) {
        const m = this.mission;
        const evs = m.evenements.splice(0);
        for (const ev of evs) {
            const a = m.asteroides.find((x) => x.id === ev.id) || (vise && vise.id === ev.id ? vise : null);
            if (ev.type === 'division') {
                this.rayon_(ev.d, a, false);
                this.texte(a, `÷ ${ev.d} → ${ev.num}/${ev.den}`, COULEURS[ev.d]);
                this.eclater(a, COULEURS[ev.d], '#ffffff', 12);
            } else if (ev.type === 'ricochet') {
                this.rayon_(ev.d, a, true);
                if (a) { a.eclair = 0.5; a.teinteEclair = COULEURS[ev.d]; }
                this.dire(ev.message, 'faux', 3600);
            } else if (ev.type === 'surchauffe') {
                this.secouerDock();
            } else if (ev.type === 'tir-vide') {
                this.effets.rayons.push({ d: ev.d, vers: null, vie: 0.2, max: 0.2 });
            } else if (ev.type === 'irreductible') {
                const r = ev.rapport;
                this.rayon_(ev.d, { x: ev.x, y: ev.y, num: 1, den: 1, chaine: [] }, false);
                this.eclater({ x: ev.x, y: ev.y, boss: ev.boss }, '#fde047', COULEURS[ev.d], ev.boss ? 44 : 28);
                this.texte({ x: ev.x, y: ev.y }, `${fracTexte(r.juste)} irréductible ! +${ev.points}`, '#fde047');
                // EXPLOSÉE, MAIS À REVOIR : plus d'un tir a rebondi. On le dit
                // tout de suite, et pas seulement au bilan — sinon l'élève qui
                // mitraille voit l'astéroïde exploser et croit avoir réussi.
                if (r.reussi) this.dire(`Irréductible : ${chaineEcrite(r.chaine)}`, 'bien', 2600);
                else this.dire(`${fracTexte(r.juste)} est irréductible, mais ${r.fautes} tirs ont rebondi : à revoir.`, 'faux', 3400);
                this.rapporter(r);
            } else if (ev.type === 'impact') {
                const r = ev.rapport;
                this.secousse = 0.36;
                this.eclater({ x: ev.x, y: 1 }, '#fb7185', '#fbbf24', 28);
                // LA CORRECTION, ENTIÈRE : d'où l'on partait, où il fallait
                // arriver. « Se simplifiait en 3/4 » sans la fraction de
                // départ ne dit pas laquelle on a laissée passer.
                const ici = `${ev.num}/${ev.den}`;
                const depart = fracTexte(r.depart);
                this.dire(`Impact ! ${depart === ici ? depart : `${depart}, devenue ${ici},`} se simplifiait en ${fracTexte(r.juste)}.`,
                    'faux', 3800);
                this.rapporter(r);
            } else if (ev.type === 'rempart') {
                this.eclater({ x: ev.x, y: 1 }, '#34d399', '#ffffff', 18);
                this.dire('Le rempart a repoussé l\'astéroïde : il te reste une chance.', 'info', 2400);
            } else if (ev.type === 'capsule') {
                this.eclater({ x: ev.x, y: ev.y }, CAPSULES[ev.sorte].couleur, '#ffffff', 16);
                const plus = ev.sorte === 'pgcd' && ev.indice
                    ? ` PGCD = ${ev.indice}.` : (ev.points ? ` Aucune cible : +${ev.points} points.` : '');
                this.dire(CAPSULES[ev.sorte].dit + plus, 'info', 2600);
            } else if (ev.type === 'apparition' && ev.boss) {
                this.dire(`Astéroïde géant en approche : ${ev.num}/${ev.den} !`, 'info', 2400);
            } else if (ev.type === 'fin') {
                setTimeout(() => { if (this.isRunning) this.montrerBilan(); }, this.isDemo ? 0 : 900);
            }
        }
    }

    /**
     * UNE FRACTION = UNE QUESTION, envoyée au parcours.
     *
     * LA RATÉE COMPTE COMME CONSOMMÉE (`attemptIndex: 9`), quel que soit le
     * nombre d'essais que l'étape accorde ailleurs : un astéroïde ne repasse
     * pas, et sans cela une mission de dix fractions avec deux impacts
     * s'arrêterait à « 8 sur 10 » sans jamais finir l'étape. MultiKart a payé
     * la même leçon.
     *
     * LA DERNIÈRE ATTEND. Le parcours ferme l'étape une seconde et demie après
     * la dernière question ; or il reste alors le rapport de mission à lire.
     * On la garde donc en main, et elle part quand l'élève touche « Continuer ».
     */
    rapporter(r) {
        if (this.isDemo) return;
        const dernier = this.mission.faites === this.mission.total;
        const envoi = () => {
            const partiel = !this.comptee;
            const questionText = `Simplifier ${fracTexte(r.depart)}`;
            if (r.reussi) {
                this.onCorrectAnswer(null, COMPETENCE, {
                    questionText, expected: fracTexte(r.juste), given: chaineEcrite(r.chaine), partiel
                });
            } else {
                this.onWrongAnswer(null, {
                    concept: COMPETENCE, questionText,
                    input: fracTexte(r.chaine[r.chaine.length - 1]), expected: fracTexte(r.juste),
                    customMessage: `${fracTexte(r.depart)} se simplifie en ${fracTexte(r.juste)}.`,
                    silencieux: true, partiel, attemptIndex: 9
                });
            }
        };
        if (dernier && this.comptee) this.retenue = envoi; else envoi();
    }

    continuer() {
        if (this.retenue) { const envoi = this.retenue; this.retenue = null; envoi(); }
        this.el.suite.disabled = true;
        this.el.suite.textContent = 'C\'est noté';
    }

    rejouer() {
        const aRevoir = this.aRevoir && this.aRevoir.length ? this.aRevoir : null;
        // On ne perd pas la dernière fraction de la mission comptée en relançant.
        if (this.retenue) this.continuer();
        this.nouvelleMission(aRevoir);
        this.phase = 'jeu';
        this.dernier = performance.now();
        if (aRevoir) this.dire(`Révision : ${aRevoir.length} fraction${aRevoir.length > 1 ? 's' : ''} à refaire.`, 'info', 2400);
    }

    /* ── LE BILAN ──────────────────────────────────────────────────────── */

    /**
     * LE RAPPORT DE MISSION. Le titre dit les fractions avant le score : « 8
     * fractions simplifiées sur 10 » est ce que l'élève emporte. Puis les
     * chaînes, écrites comme au tableau — c'est là qu'on voit ce qu'on a fait.
     */
    montrerBilan() {
        if (this.phase === 'bilan') return;
        this.phase = 'bilan';
        this.el.pauseVoile.classList.remove('as-vu');
        const b = this.mission.bilan();
        this.aRevoir = b.aRevoir;
        if (this.isDemo) return;
        const q = (s) => this.el.fin.querySelector(s);
        const s = b.justes > 1 ? 's' : '';
        q('[data-fin-titre]').textContent = `${b.justes} fraction${s} simplifiée${s} sur ${b.total}`;
        q('[data-fin-texte]').textContent = b.aRevoir.length === 0
            ? 'Mission parfaite : aucune n\'a touché le vaisseau.'
            : (b.aRevoir.length > 1
                ? 'Ces fractions sont à revoir : refais la mission sur elles seules.'
                : 'Cette fraction est à revoir : refais la mission sur elle seule.');
        q('[data-chiffres]').innerHTML = [
            [`${b.score}`, 'points'],
            [`${Math.round(b.precision * 100)} %`, 'de tirs justes'],
            [`${b.meilleureSerie}`, 'à la suite']
        ].map(([v, n]) => `<div class="as-chiffre"><b>${v}</b><span>${n}</span></div>`).join('');
        q('[data-chaines]').innerHTML = (b.aRevoir.length
            ? `<h4 class="as-ko">À revoir</h4><div class="as-puces as-puces--ko">${
                this.mission.rapports.filter((r) => !r.reussi)
                    .map((r) => `<span>${fracTexte(r.depart)} = ${fracTexte(r.juste)}</span>`).join('')}</div>` : '')
            + (b.reussies.length
                ? `<h4 style="margin-top:8px">Chaînes réussies</h4><div class="as-puces as-puces--ok">${
                    b.reussies.map((r) => `<span>${chaineEcrite(r.chaine)}</span>`).join('')}</div>` : '');
        // EN ÉVALUATION, ON NE REJOUE PAS : une interrogation qu'on refait
        // jusqu'à la réussir n'en est plus une.
        this.el.encore.hidden = this.enEvaluation;
        this.el.encore.style.display = this.enEvaluation ? 'none' : '';
        this.el.encore.textContent = b.aRevoir.length ? 'Réviser mes erreurs' : 'Rejouer';
        this.el.fin.classList.add('as-vu');
        this.el.fin.scrollTop = 0;
    }

    /* ── LE TABLEAU DE BORD ────────────────────────────────────────────── */

    poser(cle, valeur, fn) {
        if (this.ecrit[cle] === valeur) return;
        this.ecrit[cle] = valeur;
        fn(valeur);
    }

    majHud() {
        const m = this.mission, e = this.el;
        this.poser('compte', `${Math.min(m.faites + 1, m.total)}/${m.total}`, (v) => { e.compte.textContent = v; });
        this.poser('score', m.score, (v) => { e.score.textContent = String(v); });
        this.poser('combo', m.combo, (v) => {
            e.combo.textContent = `×${v}`;
            e.combo.className = `as-pastille as-combo${v >= 3 ? ' as-combo--chaud' : ''}`;
            e.combo.setAttribute('aria-label', `Combo ${v}`);
        });
        // LA SURCHAUFFE SE VOIT SUR LES CANONS : ils pâlissent et une jauge
        // se remplit. Sans cela, un appui qui ne tire pas a l'air d'un bug.
        this.poser('chaud', Math.ceil(m.surchauffe * 10), (v) => {
            e.dock.classList.toggle('as-dock--chaud', v > 0);
            e.dock.style.setProperty('--chaud', String(v / (SURCHAUFFE * 10)));
        });
        this.poser('rempart', m.remparts, (v) => {
            e.rempart.hidden = v === 0;
            e.rempart.textContent = '🛡'.repeat(v);
            e.rempart.setAttribute('aria-label', `${v} rempart${v > 1 ? 's' : ''}`);
        });
        this.poser('effets', `${Math.ceil(m.stase)}-${Math.ceil(m.double)}`, () => {
            e.effets.innerHTML = (m.stase > 0
                ? `<span class="as-effet" style="--c:${CAPSULES.stase.couleur}">Stase ${Math.ceil(m.stase)} s</span>` : '')
                + (m.double > 0
                    ? `<span class="as-effet" style="--c:${CAPSULES.double.couleur}">Points × 2 — ${Math.ceil(m.double)} s</span>` : '');
        });
        // LES FRACTIONS EN TOUTES LETTRES. Elles ne sont peintes que sur la
        // toile : sans cette ligne, un lecteur d'écran n'entendrait rien.
        const c = m.cible();
        this.poser('lu', c ? `${c.num}/${c.den}` : '', (v) => {
            e.lu.textContent = v ? `Cible : ${v.replace('/', ' sur ')}` : '';
        });
    }

    /** Un canon qu'on presse pendant la surchauffe tremble, et ne tire pas. */
    secouerDock() {
        const d = this.el.dock;
        d.classList.remove('as-dock--non');
        void d.offsetWidth;
        d.classList.add('as-dock--non');
    }

    dire(texte, ton, duree) {
        const el = this.el.retour;
        el.textContent = texte;
        el.className = `as-retour as-retour--${ton} as-vu`;
        clearTimeout(el._tempo);
        el._tempo = setTimeout(() => el.classList.remove('as-vu'), duree);
    }

    /* ─────────────────────────────────────────────────────────────────────
     * LA TOILE
     * ───────────────────────────────────────────────────────────────────── */

    mesurer() {
        const r = this.el.arene.getBoundingClientRect();
        this.L = Math.max(200, Math.floor(r.width));
        this.H = Math.max(160, Math.floor(r.height));
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.el.toile.width = Math.floor(this.L * dpr);
        this.el.toile.height = Math.floor(this.H * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const petit = Math.min(this.L, this.H);
        // L'ÉCHELLE DU VAISSEAU ET DES CAPSULES : celle du jeu reçu sur un
        // écran de 500, qui grandit au tableau et rapetisse au téléphone.
        this.echelle = borner(petit / 480, 0.7, 1.5);
        this.rCapsule = 17 * this.echelle;
        this.rBase = borner(petit * 0.1, 32, 64);
        this.yVaisseau = this.H - Math.max(34, 40 * this.echelle);
        this.ligne = this.yVaisseau - 30 * this.echelle;
    }

    /** Le rayon peint : il fond un peu à chaque division, comme dans le jeu reçu. */
    rayon(a) {
        const etapes = a.chaine ? a.chaine.length - 1 : 0;
        return this.rBase * (a.boss ? 1.3 : 1) * Math.max(0.74, Math.pow(0.88, etapes));
    }

    /** D'une position de mission (0 à 1) à la toile : y = 1, c'est le bas de l'astéroïde sur la ligne. */
    ecran(x, y, r = this.rBase * 0.7) {
        return { x: x * this.L, y: y * (this.ligne - r) };
    }

    semerEtoiles() {
        this.etoiles = [];
        const couches = [[55, 10, 0.8, 1.4, 0.42], [35, 24, 1.2, 2.1, 0.68], [18, 44, 1.8, 2.8, 0.92]];
        let s = 7;
        const alea = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        for (const [n, v, r0, r1, al] of couches) {
            for (let i = 0; i < n; i++) {
                this.etoiles.push({ x: alea(), y: alea(), r: r0 + alea() * (r1 - r0), v, al, ph: alea() * 6.3 });
            }
        }
        this.immobile = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    rayon_(d, a, ricochet) {
        if (!a) return;
        this.effets.rayons.push({ d, vers: { x: a.x, y: a.y, boss: a.boss, chaine: a.chaine }, ricochet, vie: ricochet ? 0.3 : 0.24, max: ricochet ? 0.3 : 0.24 });
    }

    eclater(a, c1, c2, n) {
        if (!a) return;
        const p = this.ecran(a.x, a.y);
        for (let i = 0; i < n; i++) {
            const ang = Math.random() * Math.PI * 2;
            const v = (55 + Math.random() * 220) * this.echelle;
            this.effets.eclats.push({
                x: p.x, y: p.y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v,
                r: (2 + Math.random() * 4) * this.echelle, c: i % 2 ? c2 : c1, vie: 0.4 + Math.random() * 0.35, max: 0.75
            });
        }
    }

    texte(a, t, c) {
        if (!a) return;
        const p = this.ecran(a.x, a.y);
        this.effets.textes.push({ x: p.x, y: p.y - this.rBase * 0.8, t, c, vie: 1.2 });
    }

    animer(dt) {
        const f = this.effets;
        if (!this.immobile) for (const s of this.etoiles) { s.y += (s.v * dt) / this.H; if (s.y > 1) { s.y = 0; s.x = Math.random(); } }
        f.rayons = f.rayons.filter((r) => (r.vie -= dt) > 0);
        f.eclats = f.eclats.filter((p) => { p.x += p.vx * dt; p.y += p.vy * dt; return (p.vie -= dt) > 0; });
        f.textes = f.textes.filter((t) => { t.y -= 30 * dt; return (t.vie -= dt) > 0; });
        for (const a of this.mission.asteroides) if (a.eclair > 0) a.eclair = Math.max(0, a.eclair - dt);
        if (this.secousse > 0) this.secousse = Math.max(0, this.secousse - dt);
        this.temps = (this.temps || 0) + dt;
    }

    dessiner() {
        const c = this.ctx, L = this.L, H = this.H, m = this.mission;
        c.save();
        if (this.secousse > 0 && !this.immobile) c.translate((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);

        const ciel = c.createLinearGradient(0, 0, 0, H);
        ciel.addColorStop(0, '#040816'); ciel.addColorStop(0.55, '#09122b'); ciel.addColorStop(1, '#0e1b3d');
        c.fillStyle = ciel;
        c.fillRect(-10, -10, L + 20, H + 20);
        for (const [rx, ry, rad, col] of [[0.22, 0.28, 0.45, '56,189,248,.11'], [0.78, 0.55, 0.5, '192,132,252,.10'], [0.45, 0.82, 0.4, '52,211,153,.08']]) {
            const R = rad * Math.max(L, H) * 0.55;
            const gr = c.createRadialGradient(L * rx, H * ry, 10, L * rx, H * ry, R);
            gr.addColorStop(0, `rgba(${col})`); gr.addColorStop(1, 'rgba(5,9,23,0)');
            c.fillStyle = gr;
            c.fillRect(0, 0, L, H);
        }
        c.fillStyle = '#e2e8f0';
        for (const s of this.etoiles) {
            c.globalAlpha = s.al * (0.72 + 0.28 * Math.sin(this.temps * 3.5 + s.ph));
            c.beginPath(); c.arc(s.x * L, s.y * H, s.r, 0, Math.PI * 2); c.fill();
        }
        c.globalAlpha = 1;

        // La ligne de défense : celle qu'un astéroïde ne doit pas franchir.
        const gl = c.createLinearGradient(0, 0, L, 0);
        gl.addColorStop(0, 'rgba(251,113,133,0)'); gl.addColorStop(0.5, 'rgba(251,113,133,.55)'); gl.addColorStop(1, 'rgba(251,113,133,0)');
        c.strokeStyle = gl; c.lineWidth = 2; c.setLineDash([10, 8]);
        c.beginPath(); c.moveTo(0, this.ligne); c.lineTo(L, this.ligne); c.stroke();
        c.setLineDash([]);

        const cible = this.phase === 'bilan' ? null : m.cible();
        if (cible && (this.phase === 'jeu' || this.phase === 'pause')) {
            const p = this.ecran(cible.x, cible.y);
            c.save();
            c.strokeStyle = 'rgba(56,189,248,.36)'; c.lineWidth = 2; c.setLineDash([7, 7]);
            c.lineDashOffset = -this.temps * 38;
            c.beginPath(); c.moveTo(m.vaisseau.x * L, this.yVaisseau - 28 * this.echelle); c.lineTo(p.x, p.y); c.stroke();
            c.restore();
        }

        for (const k of m.capsules) this.dessinerCapsule(c, k);
        for (const a of m.asteroides) this.dessinerAsteroide(c, a, a === cible);

        for (const r of this.effets.rayons) {
            const x0 = m.vaisseau.x * L, y0 = this.yVaisseau - 26 * this.echelle;
            let pts;
            if (!r.vers) pts = [[x0, y0], [x0, 0]];
            else {
                const p = this.ecran(r.vers.x, r.vers.y);
                if (r.ricochet) {
                    const cote = x0 <= p.x ? -1 : 1;
                    const rr = this.rayon(r.vers);
                    pts = [[x0, y0], [p.x + cote * rr, p.y], [p.x + cote * (rr + 140 * this.echelle), p.y - 125 * this.echelle]];
                } else pts = [[x0, y0], [p.x, p.y]];
            }
            c.save();
            c.globalAlpha = Math.max(0, r.vie / r.max);
            c.lineCap = 'round';
            for (const [col, w] of [[COULEURS[r.d] || '#38bdf8', 7], ['#ffffff', 2.4]]) {
                c.strokeStyle = col; c.lineWidth = w * this.echelle;
                c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
            }
            c.restore();
        }

        this.dessinerVaisseau(c);

        for (const p of this.effets.eclats) {
            c.globalAlpha = Math.max(0, p.vie / p.max);
            c.fillStyle = p.c;
            c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill();
        }
        c.globalAlpha = 1;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = `900 ${Math.round(15 * this.echelle)}px ${POLICE}`;
        for (const t of this.effets.textes) {
            c.globalAlpha = Math.min(1, t.vie * 1.4);
            c.lineWidth = 4; c.strokeStyle = 'rgba(5,9,23,.85)'; c.strokeText(t.t, t.x, t.y);
            c.fillStyle = t.c; c.fillText(t.t, t.x, t.y);
        }
        c.globalAlpha = 1;
        c.restore();
    }

    dessinerAsteroide(c, a, vise) {
        const r = this.rayon(a);
        const p = this.ecran(a.x, a.y);
        c.save();
        c.translate(p.x, p.y);
        if (vise) {
            c.save();
            c.rotate(this.temps * 1.2);
            c.strokeStyle = '#38bdf8'; c.lineWidth = 2.5; c.setLineDash([12, 8]);
            c.beginPath(); c.arc(0, 0, r + 11, 0, Math.PI * 2); c.stroke();
            c.restore();
        }
        c.save();
        c.rotate(a.rotation);
        const gr = c.createRadialGradient(-r * 0.3, -r * 0.3, 6, 0, 0, r);
        gr.addColorStop(0, a.boss ? '#f59e0b' : '#64748b');
        gr.addColorStop(0.65, a.boss ? '#b45309' : '#334155');
        gr.addColorStop(1, a.boss ? '#451a03' : '#1e293b');
        c.fillStyle = gr;
        c.beginPath();
        for (let i = 0; i < 12; i++) {
            const ang = (i / 12) * Math.PI * 2;
            const k = 0.86 + 0.24 * Math.sin(a.graine * 7.3 + i * 2.9);
            const x = Math.cos(ang) * r * k, y = Math.sin(ang) * r * k;
            if (i) c.lineTo(x, y); else c.moveTo(x, y);
        }
        c.closePath(); c.fill();
        c.strokeStyle = a.boss ? '#fde047' : 'rgba(148,163,184,.45)';
        c.lineWidth = a.boss ? 2.6 : 1.6; c.stroke();
        c.fillStyle = 'rgba(15,23,42,.32)';
        c.beginPath();
        c.arc(-r * 0.42, -r * 0.25, r * 0.14, 0, Math.PI * 2);
        c.arc(r * 0.44, r * 0.28, r * 0.12, 0, Math.PI * 2);
        c.fill();
        c.restore();

        // Le bouclier hexagonal, qui renvoie un tir faux.
        if (a.eclair > 0) {
            c.save();
            c.globalAlpha = Math.min(1, a.eclair * 2.2);
            c.strokeStyle = a.teinteEclair || '#fb7185'; c.lineWidth = 3.5;
            c.beginPath();
            for (let k = 0; k < 6; k++) {
                const ang = (k / 6) * Math.PI * 2;
                const x = Math.cos(ang) * (r + 8), y = Math.sin(ang) * (r + 8);
                if (k) c.lineTo(x, y); else c.moveTo(x, y);
            }
            c.closePath(); c.stroke();
            c.restore();
        }

        // LE MÉDAILLON : la fraction écrite sur un fond sombre, toujours
        // droite — la roche tourne, pas les nombres.
        const ri = r * 0.74;
        c.fillStyle = 'rgba(5,9,23,.9)';
        c.beginPath(); c.arc(0, 0, ri, 0, Math.PI * 2); c.fill();
        const chiffres = Math.max(String(a.num).length, String(a.den).length);
        const taille = Math.max(13, Math.floor(ri * (chiffres >= 3 ? 0.5 : 0.6)));
        c.font = `900 ${taille}px ${POLICE}`;
        c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(String(a.num), 0, -taille * 0.58);
        c.strokeStyle = a.boss ? '#fde047' : '#38bdf8'; c.lineWidth = 2.6; c.lineCap = 'round';
        c.beginPath(); c.moveTo(-ri * 0.6, 0); c.lineTo(ri * 0.6, 0); c.stroke();
        c.fillText(String(a.den), 0, taille * 0.64);

        // L'INDICE DU PGCD, au-dessus : il reste à le casser en canons.
        if (a.indice > 1) {
            const t = `PGCD ${a.indice}`;
            c.font = `900 ${Math.max(11, Math.round(taille * 0.62))}px ${POLICE}`;
            const l = c.measureText(t).width + 14;
            const y = -r - 14;
            c.fillStyle = 'rgba(2,132,199,.95)';
            c.beginPath(); c.roundRect ? c.roundRect(-l / 2, y - 11, l, 22, 11) : c.rect(-l / 2, y - 11, l, 22); c.fill();
            c.fillStyle = '#f0f9ff'; c.fillText(t, 0, y + 0.5);
        }
        c.restore();
    }

    dessinerCapsule(c, k) {
        const p = this.ecran(k.x, k.y);
        const r = this.rCapsule * (1 + Math.sin(this.temps * 7 + k.phase) * 0.08);
        const col = CAPSULES[k.sorte].couleur;
        c.save();
        c.translate(p.x, p.y);
        const gl = c.createRadialGradient(0, 0, 4, 0, 0, r * 1.5);
        gl.addColorStop(0, col); gl.addColorStop(1, 'rgba(5,9,23,0)');
        c.fillStyle = gl; c.beginPath(); c.arc(0, 0, r * 1.5, 0, Math.PI * 2); c.fill();
        c.fillStyle = col; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#050917';
        c.font = `900 ${Math.round(r * 0.6)}px ${POLICE}`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(k.sorte === 'rempart' ? '🛡' : CAPSULES[k.sorte].nom, 0, 0.5);
        c.restore();
    }

    dessinerVaisseau(c) {
        const v = this.mission.vaisseau;
        const s = this.echelle;
        const vitesse = (v.but - v.x);
        c.save();
        c.translate(v.x * this.L, this.yVaisseau);
        c.rotate(borner(vitesse * 1.6, -0.28, 0.28));
        c.scale(s, s);
        const flamme = 14 + Math.sin(this.temps * 45) * 4;
        for (const px of [-11, 11]) {
            const fg = c.createLinearGradient(px, 14, px, 14 + flamme);
            fg.addColorStop(0, '#ffffff'); fg.addColorStop(0.45, '#38bdf8'); fg.addColorStop(1, 'rgba(56,189,248,0)');
            c.fillStyle = fg;
            c.beginPath(); c.moveTo(px - 4.5, 14); c.lineTo(px, 14 + flamme); c.lineTo(px + 4.5, 14); c.closePath(); c.fill();
        }
        const ailes = c.createLinearGradient(-34, 0, 34, 0);
        ailes.addColorStop(0, '#475569'); ailes.addColorStop(0.5, '#cbd5e1'); ailes.addColorStop(1, '#475569');
        c.fillStyle = ailes;
        c.beginPath();
        c.moveTo(0, -14); c.lineTo(34, 16); c.lineTo(14, 18); c.lineTo(0, 12); c.lineTo(-14, 18); c.lineTo(-34, 16);
        c.closePath(); c.fill();
        c.fillStyle = '#38bdf8';
        c.beginPath(); c.arc(-32, 15, 2.6, 0, Math.PI * 2); c.arc(32, 15, 2.6, 0, Math.PI * 2); c.fill();
        const corps = c.createLinearGradient(0, -34, 0, 18);
        corps.addColorStop(0, '#f8fafc'); corps.addColorStop(0.6, '#94a3b8'); corps.addColorStop(1, '#334155');
        c.fillStyle = corps;
        c.beginPath();
        c.moveTo(0, -34); c.quadraticCurveTo(14, -8, 11, 18); c.lineTo(-11, 18); c.quadraticCurveTo(-14, -8, 0, -34);
        c.closePath(); c.fill();
        const vitre = c.createRadialGradient(-2, -10, 1, 0, -7, 11);
        vitre.addColorStop(0, '#bae6fd'); vitre.addColorStop(0.55, '#0284c7'); vitre.addColorStop(1, '#0f172a');
        c.fillStyle = vitre;
        c.beginPath(); c.ellipse(0, -7, 5.5, 11, 0, 0, Math.PI * 2); c.fill();
        // LE REMPART SE VOIT AUTOUR DU VAISSEAU : on sait qu'on l'a sans lire
        // la pastille du haut.
        if (this.mission.remparts > 0) {
            c.strokeStyle = 'rgba(52,211,153,.75)'; c.lineWidth = 2.5;
            c.beginPath(); c.arc(0, -4, 44, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
        }
        c.restore();
    }

    /* ─────────────────────────────────────────────────────────────────────
     * LA DÉMONSTRATION
     * ─────────────────────────────────────────────────────────────────────
     *
     * Une fraction, 12/18, simplifiée en entier — avec un tir faux exprès au
     * milieu : montrer le rebond fait partie de la consigne.
     */
    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const robot = meneurDemo(cur, gate, () => this.isRunning,
            () => { this.demoCursor = null; this.demoGate = null; });
        const fin = () => robot.fin();
        const m = this.mission;
        const canon = (d) => this.el.wrap.querySelector(`[data-canon="${d}"]`);
        const tir = async (d) => {
            while (this.isRunning && m.surchauffe > 0) if (!await robot.pause(60)) return false;
            await cur.tap(canon(d), DEMO_SPEED.move);
            if (!this.isRunning) return false;
            this.tirer(d);
            return robot.pause(DEMO_SPEED.press);
        };

        while (this.isRunning && !m.asteroides[0]) {
            if (!await robot.pause(60)) return fin();
        }
        // On ne fait pas attendre la vignette : l'astéroïde entre déjà dans le ciel.
        m.asteroides[0].y = Math.max(m.asteroides[0].y, 0.1);
        cur.say('12/18 descend. Je dois la rendre irréductible avant qu\'elle me touche.', this.el.arene);
        if (!await robot.attendre(DEMO_SPEED.between)) return fin();

        if (!await robot.tour()) return fin();
        cur.say('12 et 18 sont pairs tous les deux : je tire ÷ 2.', canon(2));
        if (!await robot.attendre(dureeDemo(1200))) return fin();
        if (!await tir(2)) return fin();

        if (!await robot.tour()) return fin();
        cur.say('Il reste 6/9. Si je tire encore ÷ 2…', canon(2));
        if (!await robot.attendre(dureeDemo(1000))) return fin();
        if (!await tir(2)) return fin();
        cur.say('… 9 est impair : le tir rebondit, et l\'astéroïde fait un bond vers moi.', this.el.retour);
        if (!await robot.attendre(DEMO_SPEED.between)) return fin();

        if (!await robot.tour()) return fin();
        const reste = cheminAvec(6, 9, this.canons) || [3];
        cur.say('6 et 9 sont tous deux dans la table de 3 : ÷ 3.', canon(reste[0]));
        if (!await robot.attendre(dureeDemo(1200))) return fin();
        if (!await tir(reste[0])) return fin();
        cur.say('2/3 : plus aucun diviseur commun. Elle est irréductible, l\'astéroïde explose !', this.el.arene);
        await cur.pause(DEMO_SPEED.between);
        fin();
    }

    startGameLoop() { /* tout part de render(), et du bouton « Décoller ! » */ }

    destroy() {
        if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
        if (this.observateur) { this.observateur.disconnect(); this.observateur = null; }
        if (this.el) clearTimeout(this.el.retour._tempo);
        if (this.detacher) this.detacher();
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineAstroSimplif(container, isDemo, params) {
    const jeu = new AstroSimplif(container, isDemo, params);
    jeu.start();
    return jeu;
}
