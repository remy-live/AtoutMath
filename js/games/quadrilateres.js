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
    FAMILLES, FLECHES, POSITIONS, PALIERS, MODES, PLAN_L, PLAN_H,
    COND_L, COND_H,
    familleDe, flecheDe, cleFleche, traitsDeCondition,
    boiteFigure, boiteCondition,
    genererOrganigramme, verifierDepot, verifierOrganigramme, conseil,
    genererProgressif, casesVisibles, verifierEtape, conseilEtape, vignetteDe, pointeDe
} from '../core/quadrilateres.js';
import { ajusterAuRectangle } from '../core/dominos.js';

/**
 * LA TAILLE DU TEXTE D'UNE CARTE — calculée, et non laissée au navigateur.
 *
 * Rémy, devant l'organigramme complet : « c'est carrément illisible ». Mesuré
 * sur un écran d'ordinateur : le plan n'y fait que 368 pixels de large pour
 * treize conditions, chaque case en fait donc soixante, et « diagonales
 * perpendiculaires » s'y écrivait « diagonales perpendic ulaires ». La coupure
 * à l'intérieur du mot évitait bien le débordement — en rendant la carte
 * illisible, ce qui est pire.
 *
 * ON CALCULE DONC LA POLICE, comme pour la planche à découper du PDF, et avec
 * LE MÊME modèle (`ajusterAuRectangle`) : la carte qu'on lit à l'écran et celle
 * qu'on découpe sur la feuille coupent leurs phrases aux mêmes endroits.
 *
 * Le calcul se fait dans le repère de la CASE, en pourcentages de sa largeur —
 * `container-type: inline-size` est déjà posé sur `.qd-cond`, donc `cqw` vaut
 * exactement un centième de la case, quelle que soit la taille de l'écran.
 */
const RAPPORT_COND = COND_H / COND_L;

export function policeCondition(texte) {
    // 86 % DE LA CASE, ET NON 92. Le modèle de largeur de `ajusterAuRectangle`
    // est calibré sur l'Helvetica du PDF ; à l'écran la carte est écrite en
    // GRAS, dans une police d'interface plus large. Mesuré : « diagonales
    // perpendiculaires » calculé pour 92 % débordait quand même de sa case et
    // s'affichait « liagonale ». La marge supplémentaire couvre l'écart entre
    // les deux polices — c'est le prix d'un modèle unique, et il est moins cher
    // qu'un second modèle qui divergerait du premier.
    const m = ajusterAuRectangle(texte, 86, RAPPORT_COND * 88, { max: 40, min: 5 });
    return { cqw: m.taille, lignes: m.lignes };
}

/**
 * LA FENÊTRE SE CALCULE SUR LES BOÎTES, plus sur les points.
 *
 * Chaque objet de l'organigramme a maintenant un RECTANGLE — une figure est
 * carrée, une condition est large et basse —, et les deux n'ont pas la même
 * taille. Une fenêtre calculée sur les centres et élargie d'une demi-case
 * uniforme coupait donc les conditions ; on prend l'enveloppe des boîtes
 * elles-mêmes, ce qui est à la fois plus simple et exact.
 */
function enveloppe(boites) {
    return {
        x1: Math.min(...boites.map(b => b.x1)),
        x2: Math.max(...boites.map(b => b.x2)),
        y1: Math.min(...boites.map(b => b.y1)),
        y2: Math.max(...boites.map(b => b.y2))
    };
}

/**
 * LE PLAN SE RESSERRE SUR CE QUI EST VISIBLE.
 *
 * L'organigramme entier est en PORTRAIT — cent de large, cent quarante de
 * haut, huit rangées. Étalé d'un coup dans une scène de 560 × 320, il donnerait
 * des cases de trente pixels : on ne peut pas y écrire « Qui a ses diagonales
 * se croisant en leur milieu ». C'est la raison d'être du mode progressif, et
 * pas seulement une commodité pédagogique : à chaque étape, deux figures et
 * deux ou trois conditions, et la place existe.
 *
 * L'ORGANIGRAMME ENTIER VIT SUR LE PAPIER. C'est la fiche de Rémy, en A4
 * portrait, avec ses vignettes à découper — voir printSheet.js.
 *
 * ON GARDE LES PROPORTIONS DE LA SCÈNE, pas celles du plan : sinon la fenêtre
 * d'une étape large et basse serait affichée dans un cadre haut et étroit, et
 * les trois quarts resteraient vides.
 */
function fenetre(boites) {
    const e = enveloppe(boites);
    const marge = 3;
    const x0 = e.x1 - marge, x1 = e.x2 + marge;
    const y0 = e.y1 - marge, y1 = e.y2 + marge;
    const w = x1 - x0, h = y1 - y0;
    return { x0, y0, w, h, rapport: w / h, zoom: PLAN_L / w };
}

/** Le plan entier — la fenêtre du mode « placer les noms ». */
const fenetrePleine = () => fenetre([{ x1: 0, x2: PLAN_L, y1: 0, y2: PLAN_H }]);

/** Une position du plan, ramenée en pourcentage de la fenêtre affichée. */
const placer = (p, v) => ({
    gauche: ((p.x - v.x0) / v.w) * 100,
    haut: ((p.y - v.y0) / v.h) * 100
});

/** Une boîte du plan, ramenée en pourcentages de la fenêtre — bord et taille. */
const placerBoite = (b, v) => ({
    gauche: ((b.x1 - v.x0) / v.w) * 100,
    haut: ((b.y1 - v.y0) / v.h) * 100,
    large: ((b.x2 - b.x1) / v.w) * 100,
    haute: ((b.y2 - b.y1) / v.h) * 100
});

/**
 * LES POINTES DE FLÈCHE, EN CARRÉS CSS.
 *
 * Rémy : « celui que je t'ai donné était plus joli. » Les traits n'avaient pas
 * de pointe : on lisait un treillis, pas un organigramme, et le SENS de
 * lecture — du général vers le particulier — se devinait au lieu de se voir.
 *
 * Elles ne se dessinent PAS dans le SVG des traits : celui-ci est étiré
 * (`preserveAspectRatio="none"`), et une pointe y sortirait aplatie dans un
 * sens et étirée dans l'autre. Un triangle de bordures CSS, posé en pourcentage
 * du plan, garde sa forme quelle que soit la fenêtre.
 */
function pointesHtml(traits, v) {
    return traits.map(t => {
        const q = pointeDe(t);
        if (!q) return '';
        const r = placer(q, v);
        // Les segments sont orthogonaux : quatre sens suffisent, et une classe
        // par sens vaut mieux qu'une rotation — les bordures restent nettes.
        const sens = Math.abs(q.uy) > Math.abs(q.ux)
            ? (q.uy > 0 ? 'bas' : 'haut')
            : (q.ux > 0 ? 'droite' : 'gauche');
        return `<i class="qd-pointe qd-pointe--${sens}"
            style="left:${r.gauche.toFixed(2)}%; top:${r.haut.toFixed(2)}%"></i>`;
    }).join('');
}

/** Une polyligne du plan, en points « x,y » de pourcentage. */
const traitEnPoints = (pts, v) => pts
    .map(q => { const r = placer(q, v); return `${r.gauche.toFixed(2)},${r.haut.toFixed(2)}`; })
    .join(' ');

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
                /* LE PLAN REMPLIT LA SCÈNE, il n'a plus de format à lui.
                   L'organigramme est en portrait, mais la FENÊTRE affichée
                   s'ajuste déjà aux proportions de la place disponible — voir
                   rapportScene(). Un aspect-ratio écrit ici en plus déformait
                   tout : mesuré, les cases carrées sortaient en rectangles
                   verticaux et le plan n'occupait que 560 x 320 d'une scène qui
                   en offrait 1140 x 444. */
                /* LE FORMAT VIENT DU CONTENU, écrit en style en ligne par
                   cadrer() : l'organigramme d'une étape est presque carré,
                   l'organigramme entier est en portrait, et un format figé ici
                   gaspillerait la moitié de la place dans l'un des deux cas. */
                .qd-plan { position: relative; width: 100%; margin: 0 auto; }
                .qd-fils { position: absolute; inset: 0; width: 100%; height: 100%; }
                /* LES TRAITS. Plus sombres et plus francs qu'avant : à 40 %
                   d'opacité sur du gris clair, l'organigramme ressemblait à un
                   filigrane. Rémy : « celui que je t'ai donné était plus
                   joli » — sa fiche est tracée au feutre noir. */
                .qd-lien { stroke: var(--text-muted); stroke-width: 1.6; fill: none; opacity: .75; }
                .qd-lien--ouvert { opacity: .9; stroke-dasharray: 3 3; stroke: var(--primary); }
                .qd-lien--fait { stroke: var(--success); opacity: 1; stroke-width: 2; }
                /* LA POINTE DE LA FLÈCHE — un triangle de bordures, posé par sa
                   pointe. Elle dit le SENS de lecture, qui est tout ce qu'un
                   organigramme a de plus qu'un treillis. */
                .qd-pointe {
                    position: absolute; width: 0; height: 0; border: 5px solid transparent;
                    color: var(--text-muted); opacity: .75; pointer-events: none;
                }
                .qd-pointe--bas {
                    border-top: 7px solid currentColor; border-bottom-width: 0;
                    transform: translate(-50%, -100%);
                }
                .qd-pointe--haut {
                    border-bottom: 7px solid currentColor; border-top-width: 0;
                    transform: translate(-50%, 0);
                }
                .qd-pointe--droite {
                    border-left: 7px solid currentColor; border-right-width: 0;
                    transform: translate(-100%, -50%);
                }
                .qd-pointe--gauche {
                    border-right: 7px solid currentColor; border-left-width: 0;
                    transform: translate(0, -50%);
                }

                /* --- Une case de l'organigramme --- */
                /* POSÉE PAR SON COIN, plus par son centre : placerBoite rend
                   déjà le bord et la taille. Le translate(-50%, -50%) d'avant
                   décalait chaque case d'une demi-boîte. */
                .qd-case {
                    position: absolute;
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

                /* LA CASE D'UNE CONDITION — le cœur de la fiche de Rémy.
                   « Un quadrilatère → [Qui a ses côtés opposés parallèles] →
                   Parallélogramme » : la condition est une ÉTAPE du chemin, avec
                   sa boîte, ses deux flèches et sa place. C'est ce qui permet de
                   la découper sur le papier et de la glisser à l'écran. */
                .qd-cond {
                    position: absolute; box-sizing: border-box; overflow: hidden;
                    border-radius: 5px; padding: 1px 2px; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    text-align: center; line-height: 1.05; font-weight: 700;
                    /* LA POLICE SE MESURE SUR LA CASE, pas sur le plateau : une
                       case de condition fait quinze unités de large, et c'est
                       CETTE largeur qui décide si « Qui a deux côtés
                       consécutifs perpendiculaires » tient ou se coupe en
                       trois. Un conteneur par case, et cqw devient la bonne
                       unité. */
                    container-type: inline-size;
                    font-size: clamp(5px, 11cqw, 11px);
                    /* ON NE COUPE PLUS À L'INTÉRIEUR DES MOTS. Rémy, devant
                       l'organigramme complet : « c'est carrément illisible ».
                       Mesuré : « diagonales perpendiculaires » s'écrivait
                       « diagonales perpendic ulaires », et « 2 côtés
                       consécutifs égaux » devenait « consécutif s égaux ». La
                       coupure à l'intérieur d'un mot évitait bien le
                       débordement — en rendant la carte illisible, ce qui est
                       pire. C'est la TAILLE qui doit céder, pas le mot : elle
                       est calculée par case (voir policeCondition), avec le
                       même modèle que la planche à découper du PDF, donc les
                       deux coupent aux mêmes endroits. */
                    overflow-wrap: normal; hyphens: none;
                    border: 1.5px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main);
                    box-shadow: 0 1px 2px rgba(20, 26, 40, .10);
                }
                /* LE TEXTE DANS SON PROPRE ÉLÉMENT : c'est LUI qu'on mesure.
                   Un modèle de largeur ne remplacera jamais la police du
                   navigateur, et c'est ce qui écrivait « diagonales
                   rpendiculai » — le mot débordait des deux côtés d'une case
                   qui le rognait en silence. Voir ajusterCartes(). */
                .qd-cond-t { display: block; }
                /* LA COULEUR DIT LA FAMILLE DE LA PROPRIÉTÉ, et c'est l'idée de
                   Rémy : bleu ce qui parle des CÔTÉS, rouge ce qui parle des
                   DIAGONALES, mauve les deux raccourcis qui descendent
                   directement du quadrilatère. L'élève qui cherche ce qui manque
                   au rectangle pour être un carré sait alors qu'il y a une
                   réponse bleue et une rouge, et que les deux disent la même
                   chose autrement. */
                .qd-cond--cotes {
                    border-color: #6b8fc7;
                    background: color-mix(in srgb, #6b8fc7 26%, var(--bg-panel));
                }
                .qd-cond--diagonales {
                    border-color: #d94a3d;
                    background: color-mix(in srgb, #d94a3d 24%, var(--bg-panel));
                }
                .qd-cond--raccourci {
                    border-color: #b06a9e;
                    background: color-mix(in srgb, #b06a9e 24%, var(--bg-panel));
                }
                .qd-cond--vide {
                    border-style: dashed; font-size: clamp(9px, 2cqw, 16px);
                    color: var(--text-muted);
                    background: color-mix(in srgb, var(--warning) 10%, var(--bg-panel));
                }
                .qd-cond--posee { animation: qd-poser .4s ease-out; }
                @keyframes qd-poser { from { transform: scale(.92); } to { transform: scale(1); } }
                .qd-cond--visee {
                    border-color: var(--primary); border-style: solid;
                    box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 25%, transparent);
                }

                /* --- LE PANNEAU DE L'ÉTAPE : la question, et rien qu'elle --- */
                /* IL A PERDU SES FENTES, ET C'EST TOUT LE CHANGEMENT. Elles sont
                   montées sur les flèches ; il ne reste ici que ce qui ne se
                   dessine pas — la question posée et le nombre de chemins. */
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
            <div class="qd-wrap" lang="fr">
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
            ? `Étape ${this.etape + 1} sur ${this.org.etapes.length} — chaque chemin passe `
                + 'par <b>UNE</b> condition. Pose les cartes qui mènent d\'une figure à l\'autre.'
            : 'L\'organigramme est complet. Relis-le : chaque chemin ajoute une seule condition.';

        // CE QU'ON MONTRE : les figures atteintes, et les conditions qui les
        // relient — celles déjà posées et celles de l'étape en cours. Une case
        // de condition vide sur un chemin qu'on n'a pas encore abordé
        // montrerait la suite de l'exercice.
        const poses = this.pointsPoses();
        const enCours = new Set(e ? e.cles : []);
        const montrees = FLECHES.filter(f => {
            const cle = cleFleche(f);
            return poses[cle] !== undefined || enCours.has(cle);
        });

        const boites = [
            ...visibles.map(id => boiteFigure(id)),
            ...montrees.map(f => boiteCondition(f))
        ];
        const v = fenetre(boites);
        this.cadrer(v);

        // LES TRAITS. Chaque condition en porte deux : ce qui y entre, ce qui en
        // sort. Ils ne se dessinent que si la condition est montrée — sinon on
        // verrait des chemins vers des cases qui n'existent pas encore.
        const traits = montrees.map(f => {
            const t = traitsDeCondition(f);
            const fait = poses[cleFleche(f)] !== undefined;
            const cls = `qd-lien${fait ? ' qd-lien--fait' : ' qd-lien--ouvert'}`;
            return `<polyline class="${cls}" fill="none" vector-effect="non-scaling-stroke"
                    points="${traitEnPoints(t.entrant, v)}"/>
                <polyline class="${cls}" fill="none" vector-effect="non-scaling-stroke"
                    points="${traitEnPoints(t.sortant, v)}"/>`;
        }).join('');

        let html = `<svg class="qd-fils" viewBox="0 0 100 100"
            preserveAspectRatio="none">${traits}</svg>`;
        html += pointesHtml(montrees.flatMap(f => {
            const t = traitsDeCondition(f);
            return [t.entrant, t.sortant];
        }), v);

        for (const fam of FAMILLES) {
            if (!visibles.includes(fam.id)) continue;
            const b = placerBoite(boiteFigure(fam.id), v);
            const neuve = !nouvelles.includes(fam.id);
            const enJeu = e && (fam.id === e.de || fam.id === e.vers);
            html += `<div class="qd-case ${neuve ? 'qd-case--neuve' : ''} ${enJeu ? 'qd-case--jeu' : ''}"
                style="left:${b.gauche}%; top:${b.haut}%;
                    width:${b.large}%; height:${b.haute}%"
                data-case="${fam.id}">
                ${this.figureSvg(fam, true, neuve)}
                <div class="qd-nom">${fam.nom}</div>
            </div>`;
        }

        // LES CASES DE CONDITION — le cœur de la fiche de Rémy.
        //
        // Une condition n'est plus une étiquette collée sur un trait : c'est une
        // CARTE, avec sa boîte, posée SUR le chemin. C'est ce qui permet de la
        // découper sur le papier, de la glisser à l'écran, et de comprendre
        // qu'elle est une étape et non un commentaire.
        for (const f of montrees) {
            const cle = cleFleche(f);
            const b = placerBoite(boiteCondition(f), v);
            const texte = poses[cle];
            const style = `left:${b.gauche}%; top:${b.haut}%; `
                + `width:${b.large}%; height:${b.haute}%`;
            const pol = texte !== undefined ? policeCondition(texte) : null;
            html += texte !== undefined
                ? `<div class="qd-cond qd-cond--${f.famille} qd-cond--posee"
                        style="${style}; font-size:clamp(5px, ${pol.cqw}cqw, 15px)"
                        data-donnee="${enAttribut(texte)}" title="${enAttribut(texte)}"
                        ><span class="qd-cond-t">${pol.lignes.map(enAttribut).join('<br>')}</span></div>`
                : `<div class="qd-cond qd-cond--vide" style="${style}"
                        data-fente="${enAttribut(cle)}" data-depose="1">?</div>`;
        }

        this.planEl.innerHTML = html;
        this.ajusterCartes();
        this.planEl.querySelectorAll('[data-donnee]').forEach(el => {
            el.onclick = () => this.note(el.dataset.donnee);
        });

        this.dessinerEtape(e);
        // PLUS DE CARNET : voir dessinerCarnet().

        // LA PALETTE PORTE LA VIGNETTE. La phrase entière reste en infobulle :
        // ce sont les mêmes mots que dans « Le Quadrilatère qui se Transforme »,
        // et c'est exprès — deux exercices, un seul vocabulaire.
        const restantes = e ? e.cartes.filter(c => !this.posesEtape.includes(c.id)) : [];
        this.cartesEl.innerHTML = restantes.map(c =>
            `<div class="kk-chip" data-carte="${c.id}"
                title="${enAttribut(c.texte)}">${enAttribut(c.court || c.texte)}</div>`).join('');
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
        // LES FENTES SONT MONTÉES SUR LE PLAN, plus ici. Le panneau ne garde
        // que la question et le compte — c'est-à-dire ce qui ne se dessine pas.
        const reste = combien - this.posesEtape.length;
        const dit = combien === 1
            ? 'Pose la vignette sur la flèche.'
            : (reste === combien
                ? `Il y a <b>${combien}</b> chemins : pose une vignette sur chaque flèche.`
                : `Il en reste <b>${reste}</b> sur <b>${combien}</b>.`);
        this.etapeEl.innerHTML = `<div class="qd-etape-titre">Que faut-il ajouter à un
            <b>${A.toLowerCase()}</b> pour qu'il soit un <b>${B.toLowerCase()}</b> ?
            ${dit}</div>`;
    }

    /**
     * LE CARNET : tout ce qui a déjà été trouvé, écrit en clair.
     *
     * Le plan n'en garde que des points verts — c'est ce qui le rend lisible.
     * Mais un organigramme dont on ne peut plus relire les conditions n'est plus
     * une leçon, c'est un dessin. Les deux ensemble font la figure de Rémy :
     * la forme au-dessus, les mots en dessous.
     */
    /**
     * LE CARNET A DISPARU, et c'est le plan qui l'a remplacé.
     *
     * Il existait pour une raison précise : le plan ne gardait des conditions
     * trouvées qu'un point vert, et un organigramme dont on ne peut plus relire
     * les conditions n'est plus une leçon, c'est un dessin. Il fallait donc les
     * réécrire en dessous.
     *
     * Depuis qu'on a repris la fiche de Rémy, chaque condition est une CASE avec
     * sa phrase dedans : le plan se relit tout seul. Le carnet ne faisait plus
     * que répéter, et il prenait cent quatre-vingts pixels de haut — mesuré —
     * sur la seule chose qu'il y ait à regarder. C'est cette place qui manquait
     * pour écrire « Qui a deux côtés consécutifs perpendiculaires » sans le
     * couper en trois.
     */
    dessinerCarnet() { if (this.carnetEl) this.carnetEl.hidden = true; }

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

    /**
     * LE MODE « PLACER LES NOMS » : l'organigramme entier, conditions écrites.
     *
     * C'est la fiche de Rémy telle qu'elle est, avec les treize conditions déjà
     * en place et les cinq noms à retrouver. On y lit la figure comme un plan :
     * « qu'est-ce qui a ses côtés opposés parallèles ? ».
     */
    dessinerNoms() {
        const org = this.org;
        this.etapeEl.hidden = true;
        this.carnetEl.hidden = true;
        this.consigneEl.textContent =
            'Glisse chaque nom dans sa case. On descend en ajoutant une condition à la '
            + 'fois : plus on descend, plus la figure est particulière.';

        const v = fenetrePleine();
        this.cadrer(v);

        const traits = FLECHES.map(f => {
            const t = traitsDeCondition(f);
            return `<polyline class="qd-lien" fill="none" vector-effect="non-scaling-stroke"
                    points="${traitEnPoints(t.entrant, v)}"/>
                <polyline class="qd-lien" fill="none" vector-effect="non-scaling-stroke"
                    points="${traitEnPoints(t.sortant, v)}"/>`;
        }).join('');
        let html = `<svg class="qd-fils" viewBox="0 0 100 100"
            preserveAspectRatio="none">${traits}</svg>`;
        html += pointesHtml(FLECHES.flatMap(f => {
            const t = traitsDeCondition(f);
            return [t.entrant, t.sortant];
        }), v);

        for (const fam of FAMILLES) {
            const b = placerBoite(boiteFigure(fam.id), v);
            const trou = org.trous.includes(fam.id);
            const pose = this.poses[fam.id];
            const juste = pose && verifierDepot(org, fam.id, pose).ok;
            const classe = trou ? (juste ? 'qd-case--juste' : 'qd-case--trou') : '';
            const montre = !trou || juste;
            html += `<div class="qd-case ${classe}"
                style="left:${b.gauche}%; top:${b.haut}%; width:${b.large}%; height:${b.haute}%"
                data-case="${fam.id}" data-depose="${trou && !juste ? '1' : ''}">
                ${this.figureSvg(fam, montre, juste && this.vientDePoser === fam.id)}
                <div class="qd-nom ${montre ? '' : 'qd-nom--vide'}">${montre ? fam.nom : '?'}</div>
            </div>`;
        }

        // LES CONDITIONS SONT ÉCRITES : dans ce mode, ce sont elles qui
        // renseignent. C'est en les lisant qu'on retrouve les noms.
        //
        // MAIS EN VIGNETTE COURTE, ET C'EST LA PLACE QUI TRANCHE. L'organigramme
        // entier est en portrait : sa hauteur borne sa largeur, et sur un écran
        // d'ordinateur le plan ne fait que 368 pixels de large pour treize
        // conditions. Mesuré : « Qui a ses diagonales se croisant en leur
        // milieu » y tenait sur cinq lignes de trois lettres. La phrase entière
        // reste au bout du survol, et c'est le mode progressif — zoomé sur deux
        // figures — qui l'écrit en clair.
        for (const f of FLECHES) {
            const b = placerBoite(boiteCondition(f), v);
            const p = policeCondition(f.court);
            html += `<div class="qd-cond qd-cond--${f.famille}"
                style="left:${b.gauche}%; top:${b.haut}%; width:${b.large}%; height:${b.haute}%;
                    font-size:clamp(4px, ${p.cqw}cqw, 14px)"
                title="${enAttribut(f.ajoute)}"
                ><span class="qd-cond-t">${p.lignes.map(enAttribut).join('<br>')}</span></div>`;
        }

        this.planEl.innerHTML = html;
        this.ajusterCartes();

        const restantes = org.cartes.filter(c => !Object.values(this.poses).some(p => p.id === c.id));
        this.cartesEl.innerHTML = restantes.map(c =>
            `<div class="kk-chip" data-carte="${c.id}">${enAttribut(c.texte)}</div>`).join('');
        this.brancherGlisser();
        this.vientDePoser = null;
    }

    /**
     * LE RAPPORT DE LA SCÈNE, mesuré — pas deviné.
     *
     * La fenêtre s'ajuste aux proportions de la place disponible : sur un
     * ordinateur elle est large et basse, sur un téléphone haute et étroite. Un
     * rapport écrit en dur laisserait un tiers de la scène vide sur l'un des
     * deux, et c'est justement la place qui manque pour écrire les conditions.
     */
    /**
     * LE PLAN PREND LE FORMAT DE CE QU'IL MONTRE — et non l'inverse.
     *
     * C'est la correction qui rend les cases lisibles. Le plan avait un format
     * fixe et la fenêtre s'y pliait : à l'étape 4, le contenu visible tient
     * dans un carré (94 unités sur 99) qu'on affichait dans un cadre une fois
     * trois quarts plus large — on ajoutait donc 75 unités de vide sur les
     * côtés, et les cases ne prenaient plus que la moitié de la place. Mesuré :
     * « Qui a deux côtés consécutifs perpendiculaires » se coupait en trois.
     *
     * Ici c'est le contenu qui commande : le plan reçoit son rapport, et se
     * borne à la place disponible — au plus la largeur de la scène, au plus sa
     * hauteur. Les cases occupent alors tout ce qu'on peut leur donner.
     */
    /**
     * AUCUNE CARTE NE DÉBORDE DE SA CASE — mesuré, pas estimé.
     *
     * `policeCondition` choisit une taille avec le modèle de largeur du noyau,
     * celui de la planche à découper du PDF. Il est calibré sur l'Helvetica de
     * jsPDF ; à l'écran la carte est écrite en GRAS dans la police d'interface,
     * plus large. L'écart est petit — quelques pour cent — et suffisait à faire
     * dépasser « perpendiculaires », le mot le plus long du chapitre, qui se
     * rognait alors des DEUX côtés : « rpendiculai ».
     *
     * On garde le modèle pour COUPER les lignes — c'est lui qui fait que la
     * carte de l'écran et celle du papier se coupent aux mêmes endroits — et
     * l'on demande ensuite au navigateur si ça tient. Tant que non, on descend
     * d'un cran. Deux ou trois tours suffisent, et rien n'est plus à calibrer.
     */
    ajusterCartes() {
        this.planEl.querySelectorAll('.qd-cond').forEach(el => {
            const t = el.querySelector('.qd-cond-t');
            if (!t) return;
            const tient = () => t.scrollWidth <= el.clientWidth - 3
                && t.scrollHeight <= el.clientHeight - 2;
            if (tient()) return;
            let taille = parseFloat(getComputedStyle(el).fontSize) || 11;
            for (let i = 0; i < 16 && !tient() && taille > 5; i++) {
                taille = Math.max(5, taille - Math.max(0.4, taille * 0.07));
                el.style.fontSize = `${taille}px`;
            }
        });
    }

    cadrer(v) {
        this.planEl.style.setProperty('--zoom', v.zoom.toFixed(3));
        this.planEl.style.aspectRatio = v.rapport.toFixed(4);
        this.planEl.style.width = `min(100%, ${(v.rapport * 100).toFixed(2)}cqh)`;
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
            classeVisee: this.progressif ? 'qd-cond--visee' : 'qd-case--visee',
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
