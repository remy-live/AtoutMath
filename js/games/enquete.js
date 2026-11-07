// L'ENQUÊTE — à l'écran.
//
// Le noyau (core/enquete.js) fabrique la scène, garantit qu'elle a UNE seule
// solution, et sait dire quelle est la déduction suivante. Ici on dessine le
// plan, on écoute les clics, et on tient la conversation.
//
// LE GESTE EST CELUI DU PLATEAU DE JEU : on prend un personnage, on le pose sur
// une case. On le reprend en cliquant dessus. Rien à taper, rien à faire
// glisser — au doigt sur une tablette comme à la souris.
//
// DEUX TEMPS, ET LE SECOND N'EST PAS DE LA DÉCORATION. On place d'abord tout le
// monde ; on répond ensuite à la question. Placer, c'est déduire ; répondre,
// c'est LIRE LE PLAN — reconnaître dans quel lieu tombe une case. Beaucoup
// d'élèves savent faire le premier et butent sur le second, et l'on ne s'en
// apercevrait pas si la grille juste valait réponse juste.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import { meneurDemo } from '../core/meneurDemo.js';
import {
    genererEnquete, SCENES, laQuestion,
    verifierSaisie, prochaineDeduction, lieuDe
} from '../core/enquete.js';
// LES DESSINS VIENNENT DU NOYAU, en bloc : l'écran les pose, une épreuve les
// compte sans navigateur. C'est ce qui permet de garder que chaque lieu a un
// sol, chaque repère un meuble, chaque prénom un visage.
import {
    fondDuLieu, meubleSvg, morceauxDeLIndice, portraitSvg, symboleSvg
} from '../core/enqueteDessin.js';

const COMPETENCE = 'num.logique.enquete';

/**
 * LA BARRE D'OUTILS, dans l'ordre de la capture de Rémy.
 *
 * Quatre MODES et une ACTION. Les modes sont exclusifs ; « Aide » ne reste pas
 * allumée. L'ordre n'est pas indifférent : « Placer » au milieu, c'est le
 * pouce qui y tombe, et c'est l'outil qu'on emploie neuf fois sur dix.
 */
const OUTILS = [
    ['notes', '✎', 'Notes'],
    ['croix', '✕', 'Croix'],
    ['placer', '✓', 'Placer'],
    ['effacer', '⌫', 'Effacer'],
    ['aide', '💡', 'Aide']
];

class Enquete extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'enquete');
        this.rng = makeRng(this.params.seed);
        this.niveau = Number(this.params.niveau) || 1;
        this.reussis = 0;
        this.aidesUtilisees = 0;
    }

    /** La scène du niveau demandé. */
    scenePourLeNiveau() {
        const i = Math.min(SCENES.length - 1, Math.max(0, this.niveau - 1));
        return SCENES[i];
    }

    render() {
        this.container.innerHTML = `
            <style>
                /* ═══════════════════════════════════════════════════════════
                   L'ENQUÊTE, REDESSINÉE — 28 octobre.

                   Rémy, capture d'un jeu du commerce à l'appui : « Ce jeu
                   ressemble à l'enquête mais l'enquête fait vraiment vieux
                   […] il faudrait qqch de plus visuel ». Trois maquettes lui
                   ont été soumises ; il a choisi la B — « tous les indices,
                   en cartes » — et a demandé en plus les outils Croix et
                   Notes que son jeu a et que nous n'avions pas.

                   LES COULEURS DES SOLS SONT POSÉES EN DUR et ne suivent pas
                   le thème : un parquet est brun et de l'herbe est verte dans
                   les deux thèmes, comme la rivière de La Traversée. Elles
                   vivent dans « core/enqueteDessin.js », avec les meubles et
                   les visages, pour qu'une épreuve puisse les compter sans
                   navigateur.
                   ═══════════════════════════════════════════════════════════ */
                .eq-wrap {
                    display: flex; flex-direction: column; gap: 10px; width: 100%; height: 100%;
                    padding: 10px; box-sizing: border-box; color: var(--text-main);
                    overflow-y: auto; container-type: inline-size;
                }
                .eq-histoire {
                    font-size: .95rem; line-height: 1.45; max-width: 780px; margin: 0 auto;
                    text-align: center;
                }
                .eq-histoire b { color: #c2410c; }
                .eq-corps {
                    display: flex; gap: 18px; flex-wrap: wrap;
                    align-items: flex-start; justify-content: center;
                }
                .eq-colonneGauche { display: flex; flex-direction: column; align-items: center; }

                /* LA BARRE AU-DESSUS DU PLAN : la légende du cadre orange, et la
                   rose des vents. ELLE EST DEHORS, ET C'EST MESURÉ : posée dans
                   un coin de la carte, la rose cachait une case — et une case
                   cachée, dans cette énigme, c'est une hypothèse qu'on ne peut
                   plus éliminer. */
                .eq-planTete {
                    display: flex; align-items: center; justify-content: space-between;
                    gap: 10px; margin-bottom: 5px; width: 100%;
                }
                .eq-legende {
                    display: flex; align-items: center; gap: 5px;
                    font-size: .68rem; font-weight: 600; color: var(--text-muted);
                }
                .eq-cadre-objet {
                    width: 13px; height: 13px; flex: 0 0 auto;
                    border: 2.5px solid #ea580c; border-radius: 3px;
                    background: rgba(234, 88, 12, .12);
                }
                .eq-rose { width: 34px; height: 34px; flex: 0 0 auto; }

                /* LE PLAN NE S'ÉTIRE PAS, ET IL A FALLU LE MESURER POUR LE VOIR.
                   Rémy : « l'écart n'est pas égal ». Les cases faisaient bien
                   78 × 78, mais les écarts valaient 16,9 px entre les colonnes
                   et 2 px entre les rangées : les colonnes étaient déclarées en
                   auto, et une grille distribue sa largeur restante aux pistes
                   auto. Un quadrillage qui n'est pas carré dans un exercice de
                   repérage, c'est le comble. D'où une largeur de case FIXE,
                   déclarée une fois, dont tout le reste dépend. */
                .eq-planBoite {
                    --eq-case: clamp(46px, 16cqw, 76px);
                    display: grid; grid-template-columns: auto auto; gap: 2px 4px;
                    width: max-content;
                }
                .eq-colonnes { display: grid; }
                .eq-rangees { display: grid; }
                .eq-tete {
                    display: flex; align-items: center; justify-content: center;
                    font-size: .78rem; font-weight: 800; color: var(--text-muted);
                }
                .eq-carte {
                    display: grid; position: relative;
                    border: 3px solid #3d2f22; border-radius: 10px; overflow: hidden;
                    box-shadow: 0 6px 18px -10px rgba(20, 16, 10, .55);
                }
                .eq-case {
                    width: var(--eq-case); aspect-ratio: 1;
                    position: relative; cursor: pointer; border: 0; padding: 0;
                    display: flex; align-items: center; justify-content: center;
                }
                /* LE QUADRILLAGE INTÉRIEUR EST FIN, LES MURS SONT ÉPAIS : c'est ce
                   qui fait lire une PIÈCE et non vingt-cinq carreaux. */
                .eq-case::after {
                    content: ''; position: absolute; inset: 0; pointer-events: none;
                    border-right: 1px solid rgba(61, 47, 34, .16);
                    border-bottom: 1px solid rgba(61, 47, 34, .16);
                }
                .eq-mur-d { box-shadow: inset -2.5px 0 0 #3d2f22; }
                .eq-mur-b { box-shadow: inset 0 -2.5px 0 #3d2f22; }
                .eq-mur-d.eq-mur-b { box-shadow: inset -2.5px 0 0 #3d2f22, inset 0 -2.5px 0 #3d2f22; }
                @media (hover: hover) {
                    .eq-case:hover::after { border-color: #c2410c; }
                }
                .eq-case:focus-visible { outline: 3px solid #1d4ed8; outline-offset: -3px; }

                /* L'ÉTIQUETTE DU LIEU, posée comme sur un plan d'architecte. Elle
                   évite les cases qui portent un meuble ou quelqu'un : un nom
                   écrit sur une horloge, et l'on ne voit plus ni l'un ni l'autre. */
                .eq-tag {
                    position: absolute; left: 50%; bottom: 3px; transform: translateX(-50%);
                    background: #fff; border: 1px solid #cbb9a3; border-radius: 6px;
                    padding: 1px 5px; font-size: .56rem; font-weight: 700; color: #3d2f22;
                    white-space: nowrap; z-index: 4; pointer-events: none;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, .14);
                }
                /* EN HAUT DE LA PIÈCE quand un meuble occupe sa ligne du bas.
                   LA RÈGLE PASSE APRÈS « .eq-tag », ET C'EST TOUT LE SUJET :
                   écrite avant, « bottom: 3px » revenait par la règle suivante,
                   l'étiquette portait alors « top » ET « bottom », et s'étirait du
                   haut au bas de la case en un grand rectangle blanc. */
                .eq-tag--haut { bottom: auto; top: 3px; }
                .eq-meuble { position: absolute; inset: 9%; z-index: 3; pointer-events: none; }
                .eq-meuble svg { width: 100%; height: 100%; }
                /* QUAND QUELQU'UN SE TIENT SUR LE REPÈRE, le meuble se range dans
                   un coin AU-DESSUS du portrait. Vu sur la capture : Léa posée
                   sur l'horloge la faisait disparaître — et l'indice « plus près
                   de l'horloge » devenait invérifiable à l'œil, alors que c'est
                   exactement ce qu'on demande de vérifier. */
                .eq-case--habitee .eq-meuble {
                    inset: auto auto 2px 2px; width: 34%; height: 34%; z-index: 6;
                    filter: drop-shadow(0 0 2px #fff) drop-shadow(0 0 2px #fff);
                }
                /* UN SEUL LISERÉ AUTOUR DE LA PIÈCE ENTIÈRE. Un liseré par case
                   donnait cinq cadres en file, ce qui se lit comme cinq pièces. */
                .eq-cadre {
                    position: absolute; z-index: 2; pointer-events: none;
                    border: 3px solid #ea580c; border-radius: 5px;
                    background: rgba(234, 88, 12, .10);
                }
                .eq-pion { position: absolute; inset: 7%; z-index: 5; pointer-events: none; }
                .eq-pion svg { width: 100%; height: 100%; }
                .eq-case--faute .eq-pion svg { outline: 3px solid #be123c; border-radius: 13px; }
                /* LA CROIX ET LES NOTES — les deux outils que Rémy a demandés le
                   28 octobre. La croix dit « ce n'est pas ici », la note dit
                   « peut-être ici » : l'élève pouvait seulement écrire ce qu'il
                   avait conclu, jamais ce qu'il avait éliminé. Sur le papier il
                   rature depuis toujours. */
                .eq-croix {
                    position: absolute; inset: 0; z-index: 5; pointer-events: none;
                    display: flex; align-items: center; justify-content: center;
                    color: #be123c; font-size: 1.5rem; font-weight: 800; opacity: .6;
                }
                .eq-notes {
                    position: absolute; left: 3px; top: 3px; right: 3px; z-index: 5;
                    display: flex; flex-wrap: wrap; gap: 2px; pointer-events: none;
                }
                .eq-notes svg { width: 18px; height: 18px; opacity: .72;
                    border-radius: 5px; box-shadow: 0 0 0 1px rgba(15, 23, 42, .25); }

                .eq-cote { flex: 1 1 320px; min-width: 272px; max-width: 470px; }
                .eq-titre-liste {
                    font-weight: 800; font-size: .74rem; letter-spacing: .08em;
                    text-transform: uppercase; color: var(--text-muted); margin: 10px 0 6px;
                }

                /* LES PORTRAITS. Une pastille de texte est un champ de
                   formulaire ; un visage est quelqu'un — et l'élève doit dire
                   « Jade est au nord de Noé », donc il faut qu'il les voie. */
                .eq-pions { display: flex; flex-wrap: wrap; gap: 7px; justify-content: center; }
                .eq-chip {
                    display: flex; flex-direction: column; align-items: center; gap: 2px;
                    border: 0; background: none; padding: 0; cursor: pointer;
                    font: inherit; font-size: .64rem; font-weight: 700;
                    color: var(--text-main); min-height: 44px;
                }
                .eq-chip svg { border-radius: 13px; box-shadow: 0 1px 3px rgba(15, 23, 42, .25); }
                .eq-chip--pris svg { opacity: .34; }
                .eq-chip--choisi svg { outline: 3px solid #ea580c; outline-offset: 1px; }
                .eq-chip:focus-visible svg { outline: 3px solid #1d4ed8; outline-offset: 2px; }

                /* LA BARRE D'OUTILS : quatre modes et une aide. Les quatre modes
                   sont EXCLUSIFS et le mode courant est en noir — un outil dont
                   on ne voit pas qu'il est actif fait croire à une panne au
                   premier toucher. */
                .eq-outils { display: flex; gap: 6px; margin-top: 10px; }
                .eq-outil {
                    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
                    padding: 7px 0 5px; border: 1.5px solid var(--border); border-radius: 12px;
                    background: var(--bg-panel); color: var(--text-main);
                    font: inherit; font-size: .62rem; font-weight: 700; cursor: pointer;
                    min-height: 44px;
                }
                .eq-outil span { font-size: .95rem; line-height: 1; }
                .eq-outil--on { background: #16233a; border-color: #16233a; color: #fff; }
                .eq-outil:focus-visible { outline: 3px solid #1d4ed8; outline-offset: 2px; }

                /* LES CARTES D'INDICE — la maquette B, choisie par Rémy. Chaque
                   indice porte les VISAGES dont il parle et le symbole de ce
                   qu'il dit : on le lit d'un coup d'œil au lieu de le déchiffrer.
                   Un toucher le grise, comme on raye une ligne sur le papier. */
                .eq-indices { display: flex; flex-direction: column; gap: 6px; }
                .eq-indice {
                    display: flex; align-items: center; gap: 8px; width: 100%;
                    background: var(--bg-panel); border: 1.5px solid var(--border);
                    border-radius: 14px; padding: 7px 10px; cursor: pointer;
                    font: inherit; font-size: .8rem; line-height: 1.3; text-align: left;
                    color: var(--text-main); min-height: 44px;
                }
                .eq-indice--use { opacity: .45; }
                .eq-indice--vise { border-color: #eab308; background: #fef9c3; color: #422006; }
                .eq-indice:focus-visible { outline: 3px solid #1d4ed8; outline-offset: 2px; }
                .eq-vignette { display: flex; align-items: center; gap: 3px; flex: 0 0 auto; }
                .eq-vignette svg { border-radius: 8px; }
                .eq-vignette .eq-tagi {
                    background: #fff; border: 1px solid #cbb9a3; border-radius: 6px;
                    padding: 1px 4px; font-size: .56rem; font-weight: 700; color: #3d2f22;
                    white-space: nowrap;
                }
                .eq-vignette .eq-meubleI {
                    background: #f1f5f9; border-radius: 8px; display: block;
                }

                .eq-boutons { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
                .eq-bouton {
                    border: none; border-radius: 12px; padding: 11px 16px; font: inherit;
                    font-weight: 800; cursor: pointer; background: var(--bg-panel);
                    color: var(--text-main); border: 1.5px solid var(--border);
                    min-height: 44px;
                }
                .eq-bouton--fort { background: #16233a; color: #fff; border-color: #16233a; }
                .eq-bouton:focus-visible { outline: 3px solid #1d4ed8; outline-offset: 2px; }
                .eq-note { min-height: 2.6em; font-size: .9rem; line-height: 1.4; margin-top: 8px; }
                .eq-note--ok { color: var(--success-texte, #15803d); font-weight: 700; }
                .eq-note--ko { color: var(--warning-texte, #b45309); }
                .eq-question {
                    margin-top: 10px; padding: 10px 12px; border-radius: 12px;
                    background: #fffbeb; border: 2px solid #fbbf24; font-size: .92rem;
                    color: #422006;
                }
                @container (max-width: 680px) {
                    .eq-corps { flex-direction: column; align-items: center; }
                    .eq-cote { width: 100%; max-width: 100%; }
                }
            </style>
            <div class="eq-wrap">
                <div class="eq-histoire" data-histoire></div>
                <div class="eq-corps">
                    <div class="eq-colonneGauche">
                        <div class="eq-planTete">
                            <span class="eq-legende"><i class="eq-cadre-objet"></i>
                                <span data-legende></span></span>
                            <span data-rose></span>
                        </div>
                        <div class="eq-planBoite">
                            <div></div>
                            <div class="eq-colonnes" data-colonnes></div>
                            <div class="eq-rangees" data-rangees></div>
                            <div class="eq-carte" data-carte></div>
                        </div>
                    </div>
                    <div class="eq-cote">
                        <p class="eq-titre-liste">Qui était là</p>
                        <div class="eq-pions" data-pions></div>
                        <div class="eq-outils" data-outils></div>
                        <p class="eq-titre-liste">Les indices</p>
                        <div class="eq-indices" data-indices></div>
                        <div class="eq-boutons">
                            <button type="button" class="eq-bouton eq-bouton--fort"
                                data-verifier>Vérifier le plan</button>
                            <button type="button" class="eq-bouton" data-effacer>Tout enlever</button>
                            <button type="button" class="eq-bouton" data-neuf>↺ Autre enquête</button>
                        </div>
                        <div class="eq-note" data-note></div>
                        <div data-final></div>
                    </div>
                </div>
            </div>`;


        const prendre = (q) => this.container.querySelector(q);
        this.carteEl = prendre('[data-carte]');
        this.colonnesEl = prendre('[data-colonnes]');
        this.rangeesEl = prendre('[data-rangees]');
        this.legendeEl = prendre('[data-legende]');
        this.roseEl = prendre('[data-rose]');
        this.indicesEl = prendre('[data-indices]');
        this.pionsEl = prendre('[data-pions]');
        this.outilsEl = prendre('[data-outils]');
        this.noteEl = prendre('[data-note]');
        this.finalEl = prendre('[data-final]');
        this.histoireEl = prendre('[data-histoire]');
        // LA DÉMONSTRATION ET LES ÉPREUVES CHERCHENT ENCORE `planEl` : c'est la
        // carte, qui porte les cases. On garde le nom plutôt que de le changer
        // dans quatre endroits dont un robot.
        this.planEl = this.carteEl;

        prendre('[data-verifier]').onclick = () => this.verifier();
        prendre('[data-effacer]').onclick = () => this.effacer();
        prendre('[data-neuf]').onclick = () => this.poser();

        this.poser();
    }

    startGameLoop() { /* rien à animer : l'enquête attend l'élève */ }

    // ─────────────────────────────────────────────────────── une enquête ────

    poser() {
        this.enquete = genererEnquete({ scene: this.scenePourLeNiveau(), rng: this.rng });
        this.saisie = this.enquete.noms.map(() => null);
        this.choisi = null;
        this.vise = -1;
        this.gagne = false;
        this.outil = 'placer';
        /** Les cases barrées, et les « peut-être ici » — le brouillon de l'élève. */
        this.croix = new Set();
        this.notes = new Map();
        /** Les indices qu'il a rayés en les employant. */
        this.usés = new Set();
        this.finalEl.innerHTML = '';
        this.note('');
        this.dessiner();
    }

    /**
     * TOUT ENLEVER — le plan ET le brouillon.
     *
     * On ne touche PAS aux indices rayés : ce que l'élève a lu, il l'a lu. Le
     * bouton remet le plan à blanc, pas sa mémoire.
     */
    effacer() {
        if (this.gagne) return;
        this.saisie = this.enquete.noms.map(() => null);
        this.choisi = null;
        this.croix = new Set();
        this.notes = new Map();
        this.finalEl.innerHTML = '';
        this.note('');
        this.dessiner();
    }

    note(texte, ton = '') {
        this.noteEl.className = 'eq-note' + (ton ? ' eq-note--' + ton : '');
        this.noteEl.textContent = texte;
    }

    /** Le personnage posé sur cette case, ou -1. */
    quiEstEn(r, c) {
        return this.saisie.findIndex(s => s && s.r === r && s.c === c);
    }

    /**
     * LA ROSE DES VENTS, dessinée — et non « N ↑ · S ↓ · O ← · E → » en gris
     * de 11 px, qui était la façon la plus discrète possible de dire la seule
     * convention sans laquelle aucun indice de direction ne se lit.
     */
    roseSvg() {
        return '<svg class="eq-rose" viewBox="0 0 40 40" role="img"'
            + ' aria-label="Le nord est en haut">'
            + '<circle cx="20" cy="20" r="18" fill="#fffaf0" stroke="#3d2f22" stroke-width="2"/>'
            + '<path d="M20 9 L24 21 L20 23 L16 21 Z" fill="#c2410c"/>'
            + '<path d="M20 35 L16 23 L20 21 L24 23 Z" fill="#8a7461"/>'
            + '<text x="20" y="8.5" text-anchor="middle" font-family="system-ui"'
            + ' font-size="9" font-weight="800" fill="#3d2f22">N</text></svg>';
    }

    /**
     * OÙ POSER L'ÉTIQUETTE DE CHAQUE PIÈCE, et sa boîte.
     *
     * L'étiquette va dans la case du BAS la plus proche du milieu, mais jamais
     * sur un meuble : première maquette, « le hall » était posé sur l'horloge
     * et l'on ne voyait plus ni l'un ni l'autre. L'étiquette nomme le lieu, le
     * meuble est un acteur de l'énigme — les deux doivent se voir.
     */
    repererLesPieces(scene) {
        const n = scene.taille;
        const tags = {}, boites = {};
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
            const k = scene.plan[r][c];
            if (tags[k]) continue;
            const cases = [];
            for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
                if (scene.plan[i][j] === k) cases.push([i, j]);
            }
            boites[k] = {
                r0: Math.min(...cases.map(x => x[0])), r1: Math.max(...cases.map(x => x[0])),
                c0: Math.min(...cases.map(x => x[1])), c1: Math.max(...cases.map(x => x[1]))
            };
            // L'ÉTIQUETTE VA EN BAS DE LA PIÈCE — SAUF SI UN MEUBLE Y TRAÎNE.
            //
            // Mesuré au doigt par `tools/enqueteAuDoigt.mjs` : « les vestiaires »
            // fait 75 px de large pour une case de 55, si bien qu'une étiquette
            // posée sur une case LIBRE débordait quand même sur le banc de la
            // case d'à côté. Choisir la case ne suffit donc pas : il faut
            // changer de BORD. Le haut de la pièce est libre, et une étiquette
            // en haut se lit aussi bien.
            // LE MEUBLE COMPTE S'IL EST DANS CETTE PIÈCE-LÀ. Testé sur la ligne
            // entière du plan, le banc des vestiaires chassait aussi l'étiquette
            // du gymnase, qui est à côté et n'a rien demandé.
            const sansMeuble = (ligne) => !cases.some(([r2, c2]) => r2 === ligne
                && scene.reperes.some(x => x.case[0] === r2 && x.case[1] === c2));
            const haut = !sansMeuble(boites[k].r1) && sansMeuble(boites[k].r0);
            const ligne = haut ? boites[k].r0 : boites[k].r1;
            const surLaLigne = cases.filter(x => x[0] === ligne).map(x => x[1]);
            const mil = (surLaLigne[0] + surLaLigne[surLaLigne.length - 1]) / 2;
            const occupe = (c2) => scene.reperes.some(x => x.case[0] === ligne && x.case[1] === c2);
            const libres = surLaLigne.filter(c2 => !occupe(c2));
            const choix = (libres.length ? libres : surLaLigne)
                .sort((a, b) => Math.abs(a - mil) - Math.abs(b - mil))[0];
            tags[k] = { cle: `${ligne}.${choix}`, haut };
        }
        return { tags, boites };
    }

    /** La vignette d'un indice : les visages, les meubles, les symboles. */
    vignetteHtml(indice, taille) {
        const e = this.enquete;
        return '<span class="eq-vignette">' + morceauxDeLIndice(indice, e.noms, e.scene)
            .map(m => {
                if (m.quoi === 'personne') return portraitSvg(m.valeur, taille);
                if (m.quoi === 'meuble') {
                    return meubleSvg(m.valeur, taille).replace('<svg ', '<svg class="eq-meubleI" ');
                }
                if (m.quoi === 'lieu') return `<span class="eq-tagi">${m.valeur}</span>`;
                return symboleSvg(m);
            }).join('') + '</span>';
    }

    dessiner() {
        const e = this.enquete;
        const n = e.scene.taille;

        this.histoireEl.innerHTML = laQuestion(e).replace(
            e.scene.lieux[e.lieuDeLObjet],
            `<b>${e.scene.lieux[e.lieuDeLObjet]}</b>`);
        this.roseEl.innerHTML = this.roseSvg();
        this.legendeEl.textContent = `le lieu où l'on a retrouvé ${e.objet}`;

        // LES NUMÉROS DE RANGÉE ET DE COLONNE RESTENT, et ce n'est pas de la
        // décoration : le message d'erreur parle de rangées et de colonnes
        // (« deux personnes sont dans la même rangée »). Sans les numéros,
        // l'élève doit compter du regard ce qu'on lui reproche.
        this.colonnesEl.style.gridTemplateColumns = `repeat(${n}, var(--eq-case))`;
        this.colonnesEl.innerHTML = Array.from({ length: n },
            (_, c) => `<div class="eq-tete">${c + 1}</div>`).join('');
        this.rangeesEl.style.gridTemplateRows = `repeat(${n}, var(--eq-case))`;
        this.rangeesEl.innerHTML = Array.from({ length: n },
            (_, r) => `<div class="eq-tete">${r + 1}</div>`).join('');

        const { tags, boites } = this.repererLesPieces(e.scene);
        this.carteEl.style.gridTemplateColumns = `repeat(${n}, var(--eq-case))`;
        this.carteEl.innerHTML = '';
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const L = lieuDe(e.scene, { r, c });
                const nomLieu = e.scene.lieux[L];
                const d = document.createElement('button');
                d.type = 'button';
                d.className = 'eq-case'
                    + (c + 1 < n && lieuDe(e.scene, { r, c: c + 1 }) !== L ? ' eq-mur-d' : '')
                    + (r + 1 < n && lieuDe(e.scene, { r: r + 1, c }) !== L ? ' eq-mur-b' : '');
                d.style.background = fondDuLieu(nomLieu);
                d.dataset.r = r; d.dataset.c = c;
                d.setAttribute('aria-label', `rangée ${r + 1}, colonne ${c + 1}, ${nomLieu}`);

                if (tags[L].cle === `${r}.${c}`) {
                    d.insertAdjacentHTML('beforeend', '<span class="eq-tag'
                        + (tags[L].haut ? ' eq-tag--haut' : '') + `">${nomLieu}</span>`);
                }
                const rep = e.scene.reperes.find(x => x.case[0] === r && x.case[1] === c);
                if (rep) {
                    d.insertAdjacentHTML('beforeend',
                        `<span class="eq-meuble">${meubleSvg(rep.nom, 40)}</span>`);
                }
                const cle = `${r}.${c}`;
                const notes = this.notes.get(cle);
                if (notes && notes.size) {
                    d.insertAdjacentHTML('beforeend', '<span class="eq-notes">'
                        + [...notes].map(k => portraitSvg(e.noms[k], 18)).join('') + '</span>');
                }
                if (this.croix.has(cle)) {
                    d.insertAdjacentHTML('beforeend', '<span class="eq-croix">✕</span>');
                }
                const qui = this.quiEstEn(r, c);
                if (qui >= 0) {
                    d.classList.add('eq-case--habitee');
                    d.insertAdjacentHTML('beforeend',
                        `<span class="eq-pion">${portraitSvg(e.noms[qui], 60)}</span>`);
                }
                d.onclick = () => this.cliquerCase(r, c);
                this.carteEl.appendChild(d);
            }
        }
        const b = boites[e.lieuDeLObjet];
        const cadre = document.createElement('div');
        cadre.className = 'eq-cadre';
        cadre.style.left = `${b.c0 / n * 100}%`;
        cadre.style.top = `${b.r0 / n * 100}%`;
        cadre.style.width = `${(b.c1 - b.c0 + 1) / n * 100}%`;
        cadre.style.height = `${(b.r1 - b.r0 + 1) / n * 100}%`;
        this.carteEl.appendChild(cadre);

        this.pionsEl.innerHTML = '';
        e.noms.forEach((nom, k) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'eq-chip'
                + (this.saisie[k] ? ' eq-chip--pris' : '')
                + (this.choisi === k ? ' eq-chip--choisi' : '');
            btn.innerHTML = portraitSvg(nom, 52) + `<span>${nom}</span>`;
            btn.setAttribute('aria-pressed', this.choisi === k ? 'true' : 'false');
            btn.onclick = () => { this.choisi = this.choisi === k ? null : k; this.dessiner(); };
            this.pionsEl.appendChild(btn);
        });

        this.outilsEl.innerHTML = '';
        for (const [cle, icone, nom] of OUTILS) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'eq-outil' + (this.outil === cle ? ' eq-outil--on' : '');
            btn.innerHTML = `<span aria-hidden="true">${icone}</span>${nom}`;
            btn.onclick = () => {
                // « AIDE » EST UNE ACTION, PAS UN MODE : elle ne reste pas
                // allumée, elle donne la déduction suivante et s'éteint.
                if (cle === 'aide') { this.aider(); return; }
                this.outil = cle;
                this.dessiner();
            };
            this.outilsEl.appendChild(btn);
        }

        this.indicesEl.innerHTML = '';
        e.indices.forEach((ind, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'eq-indice' + (this.usés.has(i) ? ' eq-indice--use' : '')
                + (i === this.vise ? ' eq-indice--vise' : '');
            btn.innerHTML = this.vignetteHtml(ind, 30)
                + `<span>${ind.dit(e.noms)}</span>`;
            btn.onclick = () => {
                if (this.usés.has(i)) this.usés.delete(i); else this.usés.add(i);
                this.dessiner();
            };
            this.indicesEl.appendChild(btn);
        });
    }

    /**
     * UN TOUCHER SUR UNE CASE, SELON L'OUTIL EN MAIN.
     *
     * Rémy, 28 octobre : « Oui, Croix et Notes ». Jusque-là l'élève ne pouvait
     * écrire que ce qu'il avait CONCLU ; il ne pouvait pas écrire ce qu'il
     * avait ÉLIMINÉ, alors qu'on résout cette énigme en éliminant. Sur le
     * papier, il rature depuis toujours.
     */
    cliquerCase(r, c) {
        if (this.gagne || this.isDemo) return;
        const cle = `${r}.${c}`;
        const occupant = this.quiEstEn(r, c);

        if (this.outil === 'effacer') {
            if (occupant >= 0) this.saisie[occupant] = null;
            this.croix.delete(cle);
            this.notes.delete(cle);
            this.dessiner();
            return;
        }
        if (this.outil === 'croix') {
            // ON NE BARRE PAS UNE CASE OCCUPÉE : on y a posé quelqu'un, donc on
            // ne pense pas que c'est impossible. La croix serait un message
            // contradictoire, et l'élève croirait à une panne.
            if (occupant >= 0) { this.note('Cette case est occupée : enlève la personne d\'abord.', 'ko'); return; }
            if (this.croix.has(cle)) this.croix.delete(cle); else this.croix.add(cle);
            this.notes.delete(cle);
            this.dessiner();
            return;
        }
        if (this.outil === 'notes') {
            if (this.choisi === null) { this.note('Choisis d\'abord qui tu notes ici.', 'ko'); return; }
            const s = this.notes.get(cle) || new Set();
            if (s.has(this.choisi)) s.delete(this.choisi); else s.add(this.choisi);
            if (s.size) this.notes.set(cle, s); else this.notes.delete(cle);
            this.croix.delete(cle);
            this.dessiner();
            return;
        }

        // « PLACER » — le geste d'origine, inchangé.
        if (this.choisi === null) {
            if (occupant >= 0) { this.saisie[occupant] = null; this.dessiner(); }
            return;
        }
        if (occupant >= 0) this.saisie[occupant] = null;
        this.saisie[this.choisi] = { r, c };
        // POSER QUELQU'UN EFFACE LES BROUILLONS DE LA CASE : une croix sous un
        // visage dirait le contraire de ce qu'on vient de faire.
        this.croix.delete(cle);
        this.notes.delete(cle);
        this.choisi = null;
        this.vise = -1;
        this.dessiner();
    }

    // ───────────────────────────────────────────────────────── corriger ────

    verifier() {
        if (this.isDemo || this.gagne) return;
        const e = this.enquete;
        const v = verifierSaisie(e, this.saisie);
        this.planEl.querySelectorAll('.eq-case--faute')
            .forEach(x => x.classList.remove('eq-case--faute'));

        if (v.reglesCassees.length) {
            this.note('❌ ' + v.reglesCassees[0]
                + ' La règle est : un seul personnage par rangée, un seul par colonne.', 'ko');
            return;
        }
        if (!v.complet) {
            const reste = this.saisie.filter(s => !s).length;
            this.note(`Il reste ${reste} personne${reste > 1 ? 's' : ''} à placer.`, 'ko');
            return;
        }
        if (!v.juste) {
            v.fautes.forEach(k => {
                const c = this.saisie[k];
                this.planEl.querySelector(`.eq-case[data-r="${c.r}"][data-c="${c.c}"]`)
                    ?.classList.add('eq-case--faute');
            });
            // ON NE DIT PAS COMBIEN SONT FAUSSES, ET C'EST DÉLIBÉRÉ.
            //
            // Le compte se retourne contre l'exercice : il s'essaie. On déplace
            // un pion, on revalide, le compte baisse — et l'on a résolu la
            // grille au chaud, sans lire un seul indice. On renvoie donc à
            // l'indice contredit, c'est-à-dire au raisonnement.
            const d = prochaineDeduction(e, this.saisie);
            this.note('❌ Ce placement contredit au moins un indice. ' + d.texte, 'ko');
            this.vise = Number.isInteger(d.indice) ? d.indice : -1;
            this.dessiner();
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: `Enquête — ${e.scene.titre}`,
                input: 'placement contredit', expected: 'tous les indices respectés',
                customMessage: 'Un indice au moins n\'est pas respecté.',
                silencieux: true
            });
            return;
        }

        this.note('✅ Tout le monde est à sa place, et aucun indice n\'est contredit.', 'ok');
        this.demanderLeCoupable();
    }

    /**
     * LE SECOND TEMPS : LIRE LE PLAN.
     *
     * La grille est juste ; reste à dire QUI. C'est une lecture de carte — dans
     * quel lieu tombe cette case ? — et c'est une compétence à part entière,
     * que l'on raterait complètement si la grille juste valait réponse juste.
     */
    demanderLeCoupable() {
        const e = this.enquete;
        this.finalEl.innerHTML = `
            <div class="eq-question">
                <p style="margin:0 0 8px">On a retrouvé <b>${e.objet}</b> dans
                   <b>${e.scene.lieux[e.lieuDeLObjet]}</b>. Qui était seul là-bas&nbsp;?</p>
                <div class="eq-pions" data-reponses></div>
            </div>`;
        const zone = this.finalEl.querySelector('[data-reponses]');
        e.noms.forEach((nom, k) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'eq-chip';
            b.textContent = nom;
            b.onclick = () => this.repondre(k);
            zone.appendChild(b);
        });
    }

    repondre(k) {
        if (this.gagne) return;
        const e = this.enquete;
        if (k !== e.coupable) {
            this.note(`❌ Regarde où ${e.noms[k]} se trouve : ce n'est pas `
                + `${e.scene.lieux[e.lieuDeLObjet]}.`, 'ko');
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: laQuestion(e),
                input: e.noms[k], expected: e.noms[e.coupable],
                customMessage: 'Le lieu de la case ne correspond pas.',
                silencieux: true
            });
            return;
        }
        this.gagne = true;
        this.reussis++;
        this.note(`✅ C'est ${e.noms[k]} — la seule personne dans `
            + `${e.scene.lieux[e.lieuDeLObjet]}. Enquête bouclée.`, 'ok');
        this.finalEl.innerHTML = '';
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: laQuestion(e),
            expected: e.noms[e.coupable], given: e.noms[k],
            points: 10 + e.scene.taille * 4
        });
        setTimeout(() => { if (this.isRunning) this.poser(); }, 2200);
    }

    /**
     * L'AIDE DONNE LA DÉDUCTION SUIVANTE, PAS LA RÉPONSE.
     *
     * Le noyau cherche le plus PETIT paquet d'indices qui suffise à placer
     * quelqu'un, et l'aide se contente de le nommer et de le surligner. L'élève
     * garde le raisonnement ; on ne lui rend que le fil qu'il avait perdu.
     */
    aider() {
        if (this.isDemo || this.gagne) return;
        this.aidesUtilisees++;
        const d = prochaineDeduction(this.enquete, this.saisie);
        this.note('💡 ' + d.texte);
        this.vise = Number.isInteger(d.indice) && d.indice >= 0 ? d.indice : -1;
        this.dessiner();
    }

    // ─────────────────────────────────────────────────────── le robot ──────

    async runDemoSequence() {
        const cur = createDemoCursor();
        const gate = createDemoGate();
        this.demoCursor = cur;
        this.demoGate = gate;
        const robot = meneurDemo(cur, gate, () => this.isRunning, () => { this.demoCursor = null; this.demoGate = null; });
        const fin = () => robot.fin();
        const e = this.enquete;

        cur.say('Un objet a disparu. Chacun était quelque part — un seul par rangée, '
            + 'un seul par colonne.', this.histoireEl);
        if (!await robot.pause(DEMO_SPEED.between)) return fin();

        // « On ne devine jamais : on élimine » était la leçon ; la démonstration qui suit
        // montre l'élimination indice par indice, elle n'a pas besoin qu'on l'annonce.
        cur.say('Les indices sont tous VRAIS : ensemble, ils ne laissent qu\'une seule disposition.',
            this.indicesEl);
        if (!await robot.pause(DEMO_SPEED.between)) return fin();

        for (let tour = 0; tour < e.noms.length; tour++) {
            if (!await robot.tour()) return fin();
            const d = prochaineDeduction(e, this.saisie);
            if (d.degre !== 'force') break;
            this.vise = Number.isInteger(d.indice) ? d.indice : -1;
            this.dessiner();
            cur.say(d.texte, this.indicesEl);
            if (!await robot.pause(DEMO_SPEED.settle)) return fin();
            const cell = e.solution[d.personnage];
            const el = this.planEl.querySelector(`.eq-case[data-r="${cell.r}"][data-c="${cell.c}"]`);
            if (el && !await cur.tap(el)) return fin();
            this.saisie[d.personnage] = { r: cell.r, c: cell.c };
            this.dessiner();
            if (!await robot.pause(DEMO_SPEED.settle)) return fin();
        }

        if (!await robot.tour()) return fin();
        cur.say(`Tout le monde est placé. Reste à lire le plan : qui est dans `
            + `${e.scene.lieux[e.lieuDeLObjet]} ? C'est ${e.noms[e.coupable]}.`, this.planEl);
        if (!await robot.pause(DEMO_SPEED.between)) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineEnquete(container, isDemo, params) {
    const jeu = new Enquete(container, isDemo, params);
    jeu.start();
    return jeu;
}
