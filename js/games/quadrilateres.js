// L'ORGANIGRAMME DES QUADRILATÈRES — à l'écran.
//
// Rémy : « J'aime l'organigramme avec les cartes à replacer. Il faut des choses
// visuelles quitte à avoir des animations. »
//
// QUATRE PARTIS PRIS.
//
//   · LA FIGURE SE DESSINE QUAND LA CARTE TOMBE JUSTE. C'est l'animation qui
//     compte, et elle n'est pas décorative : le contour du quadrilatère se
//     TRACE, côté par côté, à l'endroit exact où l'élève vient de poser le nom.
//     Il voit alors ce qu'il a nommé. Une case qui se contenterait de verdir
//     dirait « juste » ; celle-ci dit « voilà à quoi ça ressemble ».
//
//   · LES CASES VIDES MONTRENT DÉJÀ LEUR FIGURE EN POINTILLÉ. Sans cela,
//     l'exercice serait un pur jeu de mémoire — six mots, six trous. Avec le
//     contour, l'élève peut RAISONNER sur ce qu'il voit : celui-ci a un angle
//     droit, celui-là quatre côtés égaux. C'est de la géométrie, pas du
//     par-cœur.
//
//   · LES DEUX FLÈCHES QUI MÈNENT AU CARRÉ SONT LE CŒUR DE LA FIGURE. On y
//     arrive du rectangle en ajoutant les longueurs, du losange en ajoutant
//     l'angle droit — chaque chemin apporte ce que l'autre avait déjà. Le
//     plateau les met côte à côte pour qu'on ne puisse pas ne pas le voir.
//
//   · ON GLISSE AU DOIGT, avec la machinerie de palette déjà écrite pour le
//     Mathdoku et le Binairo. Même fantôme, même visée, même dépôt : un élève
//     qui sait jouer à l'un sait jouer à celui-ci.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { brancherGlisserPalette } from '../core/activities/paletteDrag.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    FAMILLES, FLECHES, POSITIONS, PALIERS, MODES, CASE_L, CASE_H,
    familleDe, flecheDe, cleFleche, traceFleche, posEtiquette,
    genererOrganigramme, verifierDepot, verifierOrganigramme, conseil,
    genererProgressif, casesVisibles, verifierEtape, conseilEtape
} from '../core/quadrilateres.js';

/**
 * OÙ SE POSE UNE CASE DANS LE PLAN — la même règle qu'à l'impression.
 *
 * Une case est CENTRÉE sur sa position, donc le plan se rétrécit d'une
 * demi-case de chaque côté avant d'y placer quoi que ce soit. Sans cela le
 * quadrilatère, qui est à x = 0, sortirait du plan par la moitié de sa
 * largeur — et le carré, à x = 100, par l'autre.
 */
// UNE CASE EST CENTRÉE SUR SA POSITION, donc la moitié dépasse de chaque côté :
// le plan entier va de -demiX à 100 + demiX, et non de 0 à 100. C'est ce qui
// permet au quadrilatère d'être à x = 0 et au carré à x = 100.
const DEMI_X = (CASE_L / 2) / (100 - CASE_L) * 100;
const DEMI_Y = (CASE_H / 2) / (100 - CASE_H) * 100;
const PLEINE_L = 100 + 2 * DEMI_X;
const PLEINE_H = 100 + 2 * DEMI_Y;

/**
 * LE PLAN SE RESSERRE SUR CE QUI EST VISIBLE.
 *
 * À la première étape il n'y a que deux cases, et les réserver au coin d'un
 * plan dimensionné pour cinq laissait les trois quarts de la place vides, avec
 * deux vignettes minuscules et trois flèches écrasées dans huit unités
 * d'intervalle. Mesuré : les cases faisaient 106 pixels de large sur un plan
 * de 560, et les trois voies du parallélogramme se croisaient en un pâté.
 *
 * La fenêtre s'ajuste donc aux cases présentes, et tout grandit d'autant. Le
 * plan se dézoome au fur et à mesure que l'organigramme s'étend — ce qui est
 * exactement ce que raconte l'exercice.
 *
 * ELLE GARDE LES PROPORTIONS DU PLAN ENTIER, sans quoi la figure se déformerait
 * d'une étape à l'autre : un losange dessiné large à l'étape 4 et étroit à
 * l'étape 6 n'est plus le même losange.
 */
function fenetre(ids) {
    const pts = ids.map(id => POSITIONS[id]);
    let x0 = Math.min(...pts.map(q => q.x)) - DEMI_X;
    let x1 = Math.max(...pts.map(q => q.x)) + DEMI_X;
    let y0 = Math.min(...pts.map(q => q.y)) - DEMI_Y;
    let y1 = Math.max(...pts.map(q => q.y)) + DEMI_Y;
    let w = x1 - x0, h = y1 - y0;
    if (w / h > PLEINE_L / PLEINE_H) {
        const nh = w * PLEINE_H / PLEINE_L, c = (y0 + y1) / 2;
        y0 = c - nh / 2; h = nh;
    } else {
        const nw = h * PLEINE_L / PLEINE_H, c = (x0 + x1) / 2;
        x0 = c - nw / 2; w = nw;
    }
    return { x0, y0, w, h, zoom: PLEINE_L / w };
}

/** Le plan entier : la fenêtre de repli, et celle du mode « placer les noms ». */
const FENETRE_PLEINE = { x0: -DEMI_X, y0: -DEMI_Y, w: PLEINE_L, h: PLEINE_H, zoom: 1 };

/** Une position du plan, ramenée en pourcentage de la fenêtre affichée. */
const placer = (p, v) => ({
    gauche: ((p.x - v.x0) / v.w) * 100,
    haut: ((p.y - v.y0) / v.h) * 100
});

/** Le point d'une condition trouvée : au passage de sa voie. */
const placerPoint = (f, v) => {
    const q = placer(posEtiquette(f), v);
    return { x: q.gauche, y: q.haut };
};

const COMPETENCE = 'geo.quadrilateres.familles';

/** De quoi poser un texte dans un attribut sans qu'un guillemet le coupe. */
const enAttribut = (t) => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');

class Organigramme extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'quadrilateres');
        this.rng = makeRng(this.params.seed);
        this.palier = PALIERS[this.params.palier] ? this.params.palier : 'noms';
        this.poses = {};
    }

    render() {
        this.container.innerHTML = `
            <style>
                .qd-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 6px;
                    width: 100%; height: 100%; padding: 6px 10px 10px; box-sizing: border-box;
                    color: var(--text-main); overflow-y: auto; container-type: size;
                    min-height: 0; user-select: none; -webkit-user-select: none;
                }
                .qd-consigne {
                    text-align: center; color: var(--text-muted); flex: 0 0 auto;
                    font-size: clamp(11px, 2.5cqw, 13px); line-height: 1.3; max-width: 660px;
                }
                /* LE PLAN SE MESURE SUR LA SCÈNE, PAS SUR LE PLATEAU. Rémy, banc
                   d'essai iPhone : « l'organigramme écrase l'énoncé et le noms
                   carrés rectangles ». Mesuré sur un 375 x 634 : le plan faisait
                   370 pixels de haut dans une scène qui n'en offrait que 300, et
                   comme la scène centre son contenu, il débordait des deux
                   côtés. Il se calait sur la hauteur du PLATEAU ENTIER, consigne,
                   cartes et boutons compris : il se réservait donc une part
                   d'une place déjà prise.

                   La scène devient un conteneur de taille, et le plan se mesure
                   sur elle : sa largeur ne dépasse ni la place disponible, ni
                   1,75 fois la hauteur — donc sa hauteur ne dépasse jamais la
                   hauteur offerte. */
                .qd-scene {
                    flex: 1 1 auto; width: 100%; min-height: 110px;
                    display: flex; align-items: center; justify-content: center;
                    container-type: size;
                }
                /* COUCHÉ, ET C'EST TOUT LE PROPOS. Rémy, devant la version en
                   colonne : « illisible. Il faut faire mieux, on peut imaginer
                   le lire à l'horizontal ». Le quadrilatère à gauche, le carré à
                   droite, le rectangle et le losange au milieu l'un au-dessus de
                   l'autre : les deux chemins qui mènent au carré se voient d'un
                   coup d'œil, et les flèches ont enfin de la longueur. */
                .qd-plan {
                    position: relative; width: min(100%, 168cqh); aspect-ratio: 1.75;
                    max-width: 560px;
                }
                .qd-fils { position: absolute; inset: 0; width: 100%; height: 100%; }
                .qd-lien { stroke: var(--text-muted); stroke-width: 1.4; fill: none; opacity: .4; }
                .qd-lien--ouvert { opacity: .85; stroke-dasharray: 3 3; stroke: var(--primary); }
                .qd-lien--fait { stroke: var(--success); opacity: 1; stroke-width: 2; }

                /* --- Une case de l'organigramme --- */
                .qd-case {
                    position: absolute; transform: translate(-50%, -50%);
                    box-sizing: border-box;
                    border: 1.5px solid var(--border); border-radius: 10px;
                    background: var(--bg-panel); padding: 3px 2px 2px;
                    display: flex; flex-direction: column; align-items: center; gap: 1px;
                }
                /* UNE CASE QUI N'EST PAS ENCORE ATTEINTE N'EST PAS LÀ. Rémy :
                   « il faut le faire apparaître au fur et à mesure ». Elle ne
                   s'efface pas, elle n'existe pas encore — et elle arrive à sa
                   place, sans que le reste bouge, parce que les positions sont
                   fixées d'avance. */
                .qd-case--neuve { animation: qd-venir .45s ease-out; }
                @keyframes qd-venir {
                    from { opacity: 0; transform: translate(-50%, -50%) scale(.6); }
                    to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                }
                .qd-case--trou { border-style: dashed; background: color-mix(in srgb, var(--warning) 10%, var(--bg-panel)); }
                .qd-case--visee { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 25%, transparent); }
                .qd-case--juste { border-color: var(--success); background: color-mix(in srgb, var(--success) 12%, var(--bg-panel)); }
                /* LES DEUX CASES DE L'ÉTAPE EN COURS SE DÉTACHENT : c'est entre
                   elles deux que se pose la question, et l'élève doit savoir
                   laquelle regarder sans lire la consigne. */
                .qd-case--jeu { border-color: var(--primary); border-width: 2.5px; }
                .qd-figure { width: 70%; aspect-ratio: 1.35; display: block; }
                .qd-trait {
                    fill: color-mix(in srgb, var(--primary) 12%, transparent);
                    stroke: var(--text-main); stroke-width: 4; stroke-linejoin: round;
                }
                /* LE CONTOUR SE TRACE : le pointillé vaut la longueur du
                   périmètre entier, et en ramenant le décalage à zéro le trait
                   se dessine côté après côté, comme à la règle. */
                .qd-trait--anime {
                    stroke-dasharray: var(--tour); stroke-dashoffset: var(--tour);
                    animation: qd-tracer .75s ease-out forwards;
                }
                @keyframes qd-tracer { to { stroke-dashoffset: 0; } }
                .qd-trait--fantome { stroke: var(--border); stroke-dasharray: 6 6; fill: none; }
                /* LE NOM GRANDIT AVEC LA CASE. Sans le facteur de zoom, deux
                   cases deux fois plus grosses gardaient un nom de la même
                   taille, perdu au milieu. */
                /* LE NOM GRANDIT AVEC LA CASE, ET IL TIENT DEDANS. Une case
                   fait 16 % de la largeur du plan ; « Parallélogramme », quinze
                   caractères en gras, en demande à peu près neuf fois la taille
                   de sa police. D'où 16/9, soit 1,7 unité de largeur de plan —
                   mesuré à 2, le mot débordait sur la case voisine et les deux
                   noms se chevauchaient. Le repli sur deux lignes n'est là que
                   pour les écrans très étroits ; à cette taille il ne se
                   déclenche pas. */
                /* LE NOM DÉBORDE UN PEU DE SA CASE, ET C'EST VOULU. Deux
                   tentatives ont échoué avant celle-ci : à 2 unités de largeur
                   de plan, « Parallélogramme » débordait jusque sur la case
                   voisine ; réduit pour tenir dedans, il se coupait en
                   « Parallélogra / mme ». Un nom de figure coupé au milieu d'un
                   mot est pire qu'un nom qui dépasse. Il ne se coupe donc plus,
                   et déborde de quelques pixels dans l'intervalle — qui en
                   mesure cinquante-huit entre deux cases voisines. */
                .qd-nom {
                    font-weight: 800; text-align: center; white-space: nowrap;
                    font-size: clamp(6px, calc(1.8cqw * var(--zoom, 1)), 15px);
                    line-height: 1.05; min-height: 1.1em;
                }
                .qd-nom--vide { color: var(--text-muted); font-weight: 600; }

                /* --- Une étiquette de flèche (mode « placer les noms ») --- */
                .qd-etiq {
                    position: absolute; transform: translate(-50%, -50%);
                    min-width: 22%; max-width: 32%; box-sizing: border-box;
                    border: 1.5px dashed var(--border); border-radius: 8px;
                    background: var(--bg-panel); padding: 3px 5px; text-align: center;
                    font-size: clamp(7px, 1.9cqw, 11px); line-height: 1.15; font-weight: 700;
                    color: var(--text-muted);
                }
                .qd-etiq--pose { border-style: solid; color: var(--text-main); }
                .qd-etiq--juste { border-color: var(--success); background: color-mix(in srgb, var(--success) 14%, var(--bg-panel)); color: var(--text-main); }
                .qd-etiq--visee { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 25%, transparent); }

                /* LA PASTILLE D'UNE CONDITION TROUVÉE. Le texte ne revient JAMAIS
                   sur le plan — c'est ce qui le rendait illisible. Une flèche
                   remplie porte un point vert qu'on tape pour relire sa
                   condition dans le bandeau du bas. */
                .qd-point {
                    position: absolute; transform: translate(-50%, -50%);
                    width: 13px; height: 13px; border-radius: 50%; cursor: pointer;
                    border: 2px solid var(--success); box-sizing: border-box;
                    background: color-mix(in srgb, var(--success) 35%, var(--bg-panel));
                }
                .qd-point--neuf { animation: qd-venir .45s ease-out; }

                /* --- LE PANNEAU DE L'ÉTAPE : la question, en toutes lettres --- */
                /* C'EST ICI QUE LES CONDITIONS SE LISENT, et plus sur le plan.
                   Une condition fait quarante caractères ; posée sur une flèche
                   elle recouvre une case, et treize d'entre elles se recouvrent
                   entre elles. Dans un panneau qui prend toute la largeur, elles
                   tiennent sur une ligne chacune. */
                .qd-etape {
                    flex: 0 0 auto; width: 100%; max-width: 660px;
                    display: flex; flex-direction: column; gap: 4px;
                }
                /* UN DISPLAY DE CLASSE BAT L'ATTRIBUT HIDDEN — la règle du
                   navigateur qui masque les éléments cachés a moins de poids
                   qu'une classe. Sans cette ligne, le panneau de la dernière
                   étape restait affiché sur l'organigramme terminé, avec ses
                   fentes à moitié pleines. Mesuré. */
                .qd-etape[hidden], .qd-carnet[hidden] { display: none; }
                .qd-etape-titre {
                    text-align: center; font-weight: 800; line-height: 1.25;
                    font-size: clamp(11px, 2.6cqw, 14px);
                }
                .qd-etape-titre b { color: var(--primary); }
                .qd-fentes { display: flex; flex-direction: column; gap: 4px; }
                .qd-fente {
                    min-height: 30px; border-radius: 9px; box-sizing: border-box;
                    border: 2px dashed var(--border);
                    background: color-mix(in srgb, var(--warning) 8%, var(--bg-panel));
                    display: flex; align-items: center; justify-content: center;
                    padding: 4px 8px; text-align: center; line-height: 1.2;
                    font-size: clamp(10px, 2.3cqw, 13px); color: var(--text-muted);
                }
                .qd-fente--visee { border-color: var(--primary); border-style: solid; box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 25%, transparent); }
                .qd-fente--pleine {
                    border-style: solid; border-color: var(--success); font-weight: 700;
                    color: var(--text-main);
                    background: color-mix(in srgb, var(--success) 12%, var(--bg-panel));
                    animation: qd-poser .4s ease-out;
                }
                @keyframes qd-poser { from { transform: scale(.94); } to { transform: scale(1); } }

                /* LE CARNET : tout ce qui a déjà été trouvé, en clair. Sans lui
                   l'organigramme construit ne se relirait nulle part — le plan
                   n'en garde que des points verts. */
                /* LE CARNET NE MANGE PAS LE PLAN. Mesuré : laissé libre de
                   grandir, il faisait tomber le plan de 560 x 320 pixels à
                   58 x 33 au bout des sept étapes — l'organigramme construit
                   disparaissait au moment précis où il devenait complet. Il
                   garde donc un quart de la hauteur, et défile dedans. */
                .qd-carnet {
                    width: 100%; max-width: 660px; flex: 0 1 auto;
                    min-height: 0; max-height: 25%;
                    overflow-y: auto; text-align: left;
                    font-size: clamp(10px, 2.2cqw, 13px); line-height: 1.35;
                }
                .qd-carnet h4 {
                    margin: 6px 0 2px; font-size: 1em; color: var(--primary);
                }
                .qd-carnet ul { margin: 0; padding-left: 18px; }

                /* --- Les cartes --- */
                .qd-cartes {
                    display: flex; flex-wrap: wrap; gap: 5px; justify-content: center;
                    flex: 0 0 auto; max-width: 640px;
                }
                /* LES JETONS DU MATHDOKU SONT CARRÉS, CEUX-CI PORTENT DES MOTS.
                   La règle globale « .kk-chip » impose 56 px de côté — faite
                   pour un chiffre — et « Parallélogramme » s'y chevauchait,
                   illisible. On garde la CLASSE, parce que c'est elle que la
                   machinerie de glisser reconnaît, et on rend la taille au
                   contenu. */
                .qd-cartes .kk-chip {
                    width: auto; height: auto; flex: 0 0 auto; white-space: nowrap;
                    border: 1.5px solid var(--primary); border-radius: 9px; cursor: grab;
                    background: var(--bg-panel); color: var(--text-main);
                    font-weight: 700; padding: 7px 11px; font-size: clamp(10px, 2.2cqw, 13px);
                    touch-action: none; min-height: 34px; display: inline-flex; align-items: center;
                }
                .qd-cartes .kk-chip--pris { opacity: .25; pointer-events: none; }

                .qd-barre { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; flex: 0 0 auto; }
                .qd-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700;
                    padding: 6px 11px; font-size: .82rem; min-height: 34px;
                }
                .qd-note {
                    min-height: 2.2em; text-align: center; font-size: .82rem; line-height: 1.3;
                    color: var(--text-muted); max-width: 660px; flex: 0 0 auto;
                }
                .qd-note--ok { color: var(--success); font-weight: 700; }
                .qd-note--ko { color: var(--danger); font-weight: 600; }

                /* Couché, le plan à gauche et les cartes à droite : en paysage
                   c'est la hauteur qui manque. La requête interroge le PLATEAU,
                   pas cette boîte — un élément ne peut pas questionner son
                   propre conteneur. */
                @container plateau (max-height: 470px) and (min-width: 760px) {
                    .qd-wrap {
                        display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 380px);
                        grid-template-rows: min-content minmax(0, 1fr) min-content min-content;
                        align-items: center; justify-items: center; gap: 3px 10px; padding: 4px 8px;
                    }
                    .qd-consigne { grid-column: 2; grid-row: 1; }
                    .qd-scene { grid-column: 1; grid-row: 1 / 5; height: 100%; align-self: stretch; }
                    .qd-etape, .qd-carnet { grid-column: 2; grid-row: 2; align-self: stretch; }
                    .qd-cartes { grid-column: 2; grid-row: 3; }
                    .qd-barre { grid-column: 2; grid-row: 4; }
                    .qd-note { grid-column: 2; grid-row: 4; display: none; }
                }
            </style>
            <div class="qd-wrap">
                <div class="qd-consigne" data-consigne></div>
                <div class="qd-scene"><div class="qd-plan" data-plan></div></div>
                <div class="qd-etape" data-etape hidden></div>
                <div class="qd-carnet" data-carnet hidden></div>
                <div class="qd-cartes" data-cartes></div>
                <!-- PAS DE BOUTON « AUTRE ORGANIGRAMME ». Rémy : « enlève autre
                     organigramme ». Il ne servait à rien qui manque : l'exercice
                     enchaîne tout seul trois secondes après le dernier dépôt, et
                     l'organigramme suivant est le MÊME dessin avec d'autres trous
                     — en changer avant d'avoir fini, c'est seulement recommencer,
                     ce que le bouton d'à côté fait déjà. Sur un téléphone il
                     prenait en plus une ligne entière de la hauteur. -->
                <div class="qd-barre">
                    <button type="button" class="qd-btn" data-effacer>↺ Recommencer</button>
                    <button type="button" class="qd-btn" data-aide>💡 Aide-moi</button>
                </div>
                <div class="qd-note" data-note></div>
            </div>`;

        this.planEl = this.container.querySelector('[data-plan]');
        this.etapeEl = this.container.querySelector('[data-etape]');
        this.carnetEl = this.container.querySelector('[data-carnet]');
        this.cartesEl = this.container.querySelector('[data-cartes]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.consigneEl = this.container.querySelector('[data-consigne]');
        this.container.querySelector('[data-effacer]').onclick = () => this.effacer();
        this.container.querySelector('[data-aide]').onclick = () => this.aider();
    }

    startGameLoop() { this.poser(); }

    poser() {
        // DEUX EXERCICES DANS UN SEUL JEU, et ils ne se ressemblent pas. Placer
        // les NOMS, c'est ranger cinq mots dans une hiérarchie déjà dessinée ;
        // placer les CONDITIONS, c'est construire la hiérarchie elle-même, une
        // flèche après l'autre. Le second se joue donc par étapes.
        this.progressif = (PALIERS[this.palier] || {}).mode === MODES.PROPRIETES;
        if (this.progressif) {
            this.org = genererProgressif({ rng: this.rng, palier: this.palier });
            this.etape = 0;
            this.posesEtape = [];
            this.trouvees = {};   // clé d'étape → les textes trouvés, pour le carnet
        } else {
            this.org = genererOrganigramme({ rng: this.rng, palier: this.palier });
            this.poses = {};
        }
        this.fini = false;
        this.dessiner();
        this.note('');
        return true;
    }

    showNext() { return this.poser(); }

    effacer() {
        if (this.isDemo || !this.org) return;
        this.poser();
    }

    /** L'étape en cours, ou null hors du mode progressif. */
    get etapeCourante() {
        if (!this.progressif || !this.org) return null;
        return this.org.etapes[this.etape] || null;
    }

    // --- Le dessin ----------------------------------------------------------

    dessiner() {
        if (this.progressif) return this.dessinerProgressif();
        this.dessinerNoms();
    }

    /**
     * LE PLAN — les cases atteintes, et rien de plus.
     *
     * Rémy : « il faut le faire apparaître au fur et à mesure, on part du
     * quadrilatère puis le parallélogramme ». Les cases non atteintes ne sont
     * pas grisées, elles ne sont pas là : l'organigramme se construit sous les
     * yeux de l'élève au lieu de s'offrir tout fait. Et comme les positions
     * sont fixées d'avance, chacune arrive à SA place sans que le reste bouge.
     */
    dessinerProgressif() {
        const e = this.etapeCourante;
        const visibles = casesVisibles(this.etape);
        const nouvelles = this.vues || [];
        this.vues = visibles.slice();

        this.consigneEl.innerHTML = e
            ? `Étape ${this.etape + 1} sur ${this.org.etapes.length} — chaque flèche ajoute `
                + '<b>UNE</b> condition. Trouve toutes celles qui mènent d\'une case à l\'autre.'
            : 'L\'organigramme est complet. Relis-le : chaque flèche ajoute une seule condition.';

        const v = fenetre(visibles);
        this.planEl.style.setProperty('--zoom', v.zoom.toFixed(3));
        let html = `<svg class="qd-fils" viewBox="${v.x0} ${v.y0} ${v.w} ${v.h}"
            preserveAspectRatio="none">
            ${FLECHES.map(f => this.lienSvg(f, visibles, e)).join('')}</svg>`;

        for (const fam of FAMILLES) {
            if (!visibles.includes(fam.id)) continue;
            const p = placer(POSITIONS[fam.id], v);
            const neuve = !nouvelles.includes(fam.id);
            const enJeu = e && (fam.id === e.de || fam.id === e.vers);
            html += `<div class="qd-case ${neuve ? 'qd-case--neuve' : ''} ${enJeu ? 'qd-case--jeu' : ''}"
                style="left:${p.gauche}%; top:${p.haut}%;
                    width:${CASE_L * v.zoom}%; height:${CASE_H * v.zoom}%"
                data-case="${fam.id}">
                ${this.figureSvg(fam, true, neuve)}
                <div class="qd-nom">${fam.nom}</div>
            </div>`;
        }

        // Une condition trouvée devient un POINT sur sa flèche, jamais un texte :
        // c'est le texte qui rendait le plan illisible. On le tape pour le relire
        // dans le bandeau du bas.
        for (const [cle, texte] of Object.entries(this.pointsPoses())) {
            const f = flecheDe(cle);
            if (!f) continue;
            const m = placerPoint(f, v);
            html += `<div class="qd-point" style="left:${m.x}%; top:${m.y}%"
                data-donnee="${enAttribut(texte)}" title="${enAttribut(texte)}"></div>`;
        }
        this.planEl.innerHTML = html;
        this.planEl.querySelectorAll('[data-donnee]').forEach(el => {
            el.onclick = () => this.note(el.dataset.donnee);
        });

        this.dessinerEtape(e);
        this.dessinerCarnet();

        const restantes = e ? e.cartes.filter(c => !this.posesEtape.includes(c.id)) : [];
        this.cartesEl.innerHTML = restantes.map(c =>
            `<div class="kk-chip" data-carte="${c.id}">${c.texte}</div>`).join('');
        this.brancherGlisser();
        // UN SIMPLE APPUI SUFFIT, et c'est particulier à ce mode : les fentes
        // d'une étape sont interchangeables, donc viser l'une d'elles ne veut
        // rien dire. Faire glisser un libellé de quarante caractères jusqu'à la
        // bonne barre serait une gymnastique sans objet. Le glisser reste
        // possible — il est plus naturel au doigt —, mais il n'est plus requis.
        if (!this.isDemo) {
            this.cartesEl.querySelectorAll('[data-carte]').forEach(el => {
                el.onclick = () => this.deposerEtape(el.dataset.carte);
            });
        }
    }

    /** Le panneau de l'étape : la question posée, et les fentes où l'on répond. */
    dessinerEtape(e) {
        if (!e) { this.etapeEl.hidden = true; return; }
        this.etapeEl.hidden = false;
        const A = familleDe(e.de).nom, B = familleDe(e.vers).nom;
        const combien = e.bonnes.length;
        const fentes = [];
        for (let i = 0; i < combien; i++) {
            const carte = this.posesEtape[i] && e.cartes.find(c => c.id === this.posesEtape[i]);
            fentes.push(carte
                ? `<div class="qd-fente qd-fente--pleine">${carte.texte}</div>`
                : `<div class="qd-fente" data-fente="${i}" data-depose="1">…</div>`);
        }
        this.etapeEl.innerHTML = `<div class="qd-etape-titre">Que faut-il ajouter à un
            <b>${A.toLowerCase()}</b> pour qu'il soit un <b>${B.toLowerCase()}</b> ?
            ${combien > 1 ? `Il y a <b>${combien}</b> réponses.` : 'Il y a une réponse.'}</div>
            <div class="qd-fentes">${fentes.join('')}</div>`;
    }

    /**
     * LE CARNET : tout ce qui a déjà été trouvé, écrit en clair.
     *
     * Le plan n'en garde que des points verts — c'est ce qui le rend lisible.
     * Mais un organigramme dont on ne peut plus relire les conditions n'est plus
     * une leçon, c'est un dessin. Les deux ensemble font la figure de Rémy :
     * la forme au-dessus, les mots en dessous.
     */
    dessinerCarnet() {
        const faites = this.org.etapes.filter(x => (this.trouvees[x.rang] || []).length);
        if (!faites.length) { this.carnetEl.hidden = true; return; }
        this.carnetEl.hidden = false;
        this.carnetEl.innerHTML = faites.map(x =>
            `<h4>${familleDe(x.de).nom} → ${familleDe(x.vers).nom}</h4>
             <ul>${(this.trouvees[x.rang] || []).map(t => `<li>${t}</li>`).join('')}</ul>`
        ).join('');
        this.carnetEl.scrollTop = this.carnetEl.scrollHeight;
    }

    /** Les conditions déjà trouvées, rangées par flèche — une par voie. */
    pointsPoses() {
        const out = {};
        this.org.etapes.forEach(x => {
            const trouvees = this.trouvees[x.rang] || [];
            // Une étape a autant de flèches que de conditions : on garnit les
            // voies dans l'ordre, ce qui suffit — les fentes d'une étape sont
            // interchangeables, et donc les voies aussi.
            trouvees.forEach((texte, i) => { if (x.cles[i]) out[x.cles[i]] = texte; });
        });
        return out;
    }

    /** L'ancien mode : placer les cinq NOMS dans un organigramme déjà tracé. */
    dessinerNoms() {
        const org = this.org;
        this.etapeEl.hidden = true;
        this.carnetEl.hidden = true;
        this.consigneEl.textContent =
            'Glisse chaque nom dans sa case. On avance en ajoutant une condition à la fois : '
            + 'la case la plus à droite est la plus particulière.';

        const v = FENETRE_PLEINE;
        this.planEl.style.setProperty('--zoom', '1');
        let html = `<svg class="qd-fils" viewBox="${v.x0} ${v.y0} ${v.w} ${v.h}"
            preserveAspectRatio="none">
            ${FLECHES.map(f => this.lienSvg(f, null, null)).join('')}</svg>`;

        for (const fam of FAMILLES) {
            const p = placer(POSITIONS[fam.id], v);
            const trou = org.trous.includes(fam.id);
            const pose = this.poses[fam.id];
            const juste = pose && verifierDepot(org, fam.id, pose).ok;
            const classe = trou ? (juste ? 'qd-case--juste' : 'qd-case--trou') : '';
            const montre = !trou || juste;
            html += `<div class="qd-case ${classe}"
                style="left:${p.gauche}%; top:${p.haut}%; width:${CASE_L}%; height:${CASE_H}%"
                data-case="${fam.id}" data-depose="${trou && !juste ? '1' : ''}">
                ${this.figureSvg(fam, montre, juste && this.vientDePoser === fam.id)}
                <div class="qd-nom ${montre ? '' : 'qd-nom--vide'}">${montre ? fam.nom : '?'}</div>
            </div>`;
        }
        this.planEl.innerHTML = html;

        const restantes = org.cartes.filter(c => !Object.values(this.poses).some(p => p.id === c.id));
        this.cartesEl.innerHTML = restantes.map(c =>
            `<div class="kk-chip" data-carte="${c.id}">${c.texte}</div>`).join('');
        this.brancherGlisser();
        this.vientDePoser = null;
    }

    /**
     * Le trait d'une condition.
     *
     * LE TRACÉ VIENT DU NOYAU, il n'est pas recalculé ici : la fiche papier
     * dessine le même organigramme, et un élève qui a la feuille sous les yeux
     * et l'exercice à l'écran ne doit pas voir deux figures différentes.
     * Voir `traceFleche` dans core/quadrilateres.js.
     *
     * Un trait n'apparaît QUE si ses deux cases sont là : une flèche vers une
     * case qu'on n'a pas encore atteinte montrerait la suite de l'exercice.
     */
    lienSvg(f, visibles, etape) {
        if (visibles && !(visibles.includes(f.de) && visibles.includes(f.vers))) return '';
        const cle = cleFleche(f);
        const fait = this.progressif && !!this.pointsPoses()[cle];
        const ouvert = etape && f.de === etape.de && f.vers === etape.vers && !fait;
        const d = traceFleche(f).points.map(p => `${p.x},${p.y}`).join(' ');
        return `<polyline class="qd-lien ${fait ? 'qd-lien--fait' : ''} ${ouvert ? 'qd-lien--ouvert' : ''}"
            fill="none" points="${d}" vector-effect="non-scaling-stroke"></polyline>`;
    }

    /**
     * LE CONTOUR DU QUADRILATÈRE. En pointillé tant que la case est vide — pour
     * qu'on puisse RAISONNER sur la figure au lieu de deviner un mot —, et
     * tracé d'un trait quand le nom vient d'être posé.
     */
    figureSvg(fam, montre, anime) {
        const pts = fam.figure.map(p => p.join(',')).join(' ');
        const tour = perimetre(fam.figure);
        const classe = montre ? (anime ? 'qd-trait qd-trait--anime' : 'qd-trait') : 'qd-trait qd-trait--fantome';
        return `<svg class="qd-figure" viewBox="0 0 100 90" preserveAspectRatio="xMidYMid meet">
            <polygon class="${classe}" points="${pts}" style="--tour:${tour.toFixed(1)}"></polygon>
        </svg>`;
    }

    brancherGlisser() {
        if (this.isDemo) return;
        brancherGlisserPalette(this.container, {
            classeVisee: this.progressif ? 'qd-fente--visee' : 'qd-case--visee',
            bloque: () => this.fini,
            cibleSous: (e) => {
                const el = document.elementFromPoint(e.clientX, e.clientY);
                const cible = el && el.closest('[data-depose="1"]');
                return cible || null;
            },
            deposer: (cible, chip) => (this.progressif
                ? this.deposerEtape(chip.dataset.carte)
                : this.deposer(cible.dataset.case, chip.dataset.carte))
        });
    }

    /**
     * UNE CARTE POSÉE DANS L'ÉTAPE EN COURS.
     *
     * On ne regarde pas SUR QUELLE FENTE elle tombe, et c'est voulu : les trois
     * façons d'être un parallélogramme sont trois flèches distinctes, mais
     * aucune n'est « la première ». Exiger un ordre aurait inventé une
     * difficulté qui n'existe pas en mathématiques.
     */
    deposerEtape(carteId) {
        if (this.isDemo || this.fini) return;
        const e = this.etapeCourante;
        if (!e) return;
        const carte = e.cartes.find(c => c.id === carteId);
        if (!carte || this.posesEtape.includes(carteId)) return;

        const v = verifierEtape(e, carte);
        if (!v.ok) {
            this.note(v.raison, 'ko');
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: `Organigramme — ${familleDe(e.de).nom} → ${familleDe(e.vers).nom}`,
                input: carte.texte, expected: e.bonnes.join(' / '),
                partiel: true, silencieux: true
            });
            return;
        }
        this.posesEtape.push(carteId);
        this.trouvees[e.rang] = (this.trouvees[e.rang] || []).concat(carte.texte);
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Organigramme — ${familleDe(e.de).nom} → ${familleDe(e.vers).nom}`,
            expected: carte.texte, given: carte.texte, points: 6, partiel: true
        });

        if (this.posesEtape.length < e.bonnes.length) {
            this.dessiner();
            this.note(v.texteJuste || 'Oui — et il en reste.', 'ok');
            return;
        }

        // L'ÉTAPE EST FINIE : la case suivante apparaît, et l'on enchaîne.
        this.etape += 1;
        this.posesEtape = [];
        this.dessiner();
        if (this.etape >= this.org.etapes.length) return this.gagner();
        const suivante = this.etapeCourante;
        this.note(`${v.texteJuste || ''} On passe à la suite : ${familleDe(suivante.de).nom} → `
            + `${familleDe(suivante.vers).nom}.`, 'ok');
    }

    deposer(caseId, carteId) {
        if (this.isDemo || this.fini) return;
        const carte = this.org.cartes.find(c => c.id === carteId);
        if (!carte) return;
        const v = verifierDepot(this.org, caseId, carte);
        if (!v.ok) {
            this.note(v.raison || 'Ce n\'est pas là.', 'ko');
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: `Organigramme — case ${familleDe(caseId).nom}`,
                input: carte.texte, expected: familleDe(caseId).nom,
                partiel: true, silencieux: true
            });
            return;
        }
        this.poses[caseId] = carte;
        this.vientDePoser = caseId;
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Organigramme — case ${familleDe(caseId).nom}`,
            expected: carte.texte, given: carte.texte, points: 6, partiel: true
        });
        this.dessiner();
        const bilan = verifierOrganigramme(this.org, this.poses);
        if (bilan.fini) return this.gagner();
        this.note(v.texteJuste || '', v.texteJuste ? 'ok' : '');
    }

    gagner() {
        this.fini = true;
        this.note('✅ L\'organigramme est complet. Retiens la forme : on arrive au carré '
            + 'PAR DEUX CHEMINS, et chacun ajoute ce que l\'autre avait déjà.', 'ok');
        const combien = this.progressif
            ? this.org.etapes.reduce((n, x) => n + x.bonnes.length, 0)
            : this.org.trous.length;
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Organigramme des quadrilatères — ${this.org.palier}`,
            expected: `${combien} conditions`, given: `${combien} conditions`,
            points: 10 + combien * 3
        });
        setTimeout(() => { if (this.isRunning) this.showNext(); }, 3500);
    }

    aider() {
        if (this.isDemo || !this.org) return;
        const e = this.etapeCourante;
        if (e) return this.note(conseilEtape(e, this.posesEtape.length));
        // L'organigramme progressif terminé n'a plus d'étape en cours, et
        // `conseil` interroge des trous qui n'existent que dans l'autre mode.
        if (this.progressif) {
            return this.note('Tout est trouvé. Relis la figure de gauche à droite : chaque '
                + 'flèche ajoute UNE condition, et l\'on arrive au carré par deux chemins.');
        }
        this.note(conseil(this.org, this.poses));
    }

    montrerSolution() {
        if (!this.org) return false;
        if (this.progressif) {
            this.org.etapes.forEach(x => { this.trouvees[x.rang] = x.bonnes.slice(); });
            this.etape = this.org.etapes.length;
            this.posesEtape = [];
        } else {
            this.org.trous.forEach(t => {
                this.poses[t] = this.org.cartes.find(c => verifierDepot(this.org, t, c).ok);
            });
        }
        this.fini = true;
        this.dessiner();
        this.note('Solution affichée (outil d\'auteur).');
        return true;
    }


    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'qd-note' + (ton ? ` qd-note--${ton}` : '');
    }

    // --- La démonstration ---------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.org) this.poser();
        if (!await cur.pause(500) || !this.isRunning) return fin();
        cur.say('Cet organigramme n\'est pas une liste : les familles s\'EMBOÎTENT. On part du '
            + 'quadrilatère, à gauche, et chaque flèche avance d\'un cran en ajoutant UNE seule '
            + 'condition. Tout ce qui est à droite est aussi tout ce qui est à gauche.', this.planEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (this.progressif) {
            // LA DÉMONSTRATION MONTRE LA PREMIÈRE ÉTAPE EN ENTIER, et pas deux
            // cartes prises au hasard : c'est le fait qu'il y ait PLUSIEURS
            // façons d'être un parallélogramme qui surprend, et il faut les voir
            // arriver toutes les trois pour le comprendre.
            const e = this.etapeCourante;
            if (!e) return fin();
            for (let k = 0; k < e.bonnes.length; k++) {
                if (!await gate.waitTurn() || !this.isRunning) return fin();
                cur.say(k === 0
                    ? `Je cherche ce qu\'un ${familleDe(e.vers).nom.toLowerCase()} a de plus qu\'un `
                      + `${familleDe(e.de).nom.toLowerCase()}. Il y a ${e.bonnes.length} réponses : `
                      + 'par les côtés, par les angles, ou par les diagonales.'
                    : 'Et j\'en cherche une autre — la même case peut s\'atteindre de plusieurs '
                      + 'façons, et c\'est justement ce qu\'il faut retenir.', this.etapeEl);
                this.trouvees[e.rang] = (this.trouvees[e.rang] || []).concat(e.bonnes[k]);
                this.posesEtape.push((e.cartes.find(c => c.texte === e.bonnes[k]) || {}).id);
                this.dessiner();
                if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
            }
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            cur.say('L\'étape est finie, et la case suivante apparaît. On continue ainsi jusqu\'au '
                + 'carré — où l\'on arrive PAR DEUX CHEMINS, depuis le rectangle et depuis le '
                + 'losange. Chacun apporte ce que l\'autre avait déjà.', this.planEl);
            if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
            return fin();
        }

        for (let k = 0; k < 2 && k < this.org.trous.length; k++) {
            const caseId = this.org.trous[this.org.trous.length - 1 - k];
            const carte = this.org.cartes.find(c => verifierDepot(this.org, caseId, c).ok);
            if (!carte) break;
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            cur.say(k === 0
                ? 'Je commence par la GAUCHE, la case la plus générale : c\'est celle qui n\'a '
                  + 'encore aucune condition.'
                : 'Puis j\'avance. À chaque cran, je me demande ce qui a été AJOUTÉ — et '
                  + 'rien de plus.', this.planEl.querySelector(`[data-case="${caseId}"]`) || this.planEl);
            this.poses[caseId] = carte;
            this.vientDePoser = caseId;
            this.dessiner();
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Et regarde la droite : on arrive au carré depuis le rectangle ET depuis le '
            + 'losange. Chaque chemin ajoute ce que l\'autre avait déjà — c\'est pour cela '
            + 'qu\'un carré est à la fois un rectangle et un losange.', this.planEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }


    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

/** Le périmètre du contour, pour que l'animation de tracé fasse le tour juste. */
function perimetre(pts) {
    let t = 0;
    for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        t += Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    return t;
}

export function engineQuadrilateres(container, isDemo, params) {
    const jeu = new Organigramme(container, isDemo, params);
    jeu.start();
    return jeu;
}
