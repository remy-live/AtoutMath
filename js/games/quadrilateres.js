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
    familleDe, flecheDe, cleFleche, traitsDeCondition, RAYON_VIRAGE,
    boiteFigure, boiteCondition,
    genererOrganigramme, verifierDepot, verifierOrganigramme, conseil,
    genererProgressif, casesVisibles, verifierEtape, refusEtape, conseilEtape, vignetteDe, pointeDe,
    contreExemple, DIMS_CODAGE, genererAssemblage, casesDuRang, figureDansCase,
    conditionsDeCases, genererQuestions
} from '../core/quadrilateres.js';
import {
    construireFigure, verifierCodage, canoniser, segmentsDe, pointsAngleDe, PROPRIETES,
    classesDeLongueur, anglesDroitsDe, codageAttendu
} from '../core/codage.js';
import { codageSvg, jetonSvg, jetonAngleSvg } from '../core/codageSvg.js';
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

/**
 * L'ORGANIGRAMME DESCEND, IL NE RÉTRÉCIT PAS.
 *
 * Rémy : « tu peux descendre l'organigramme sans le dézoomer. »
 *
 * Il décrit un vrai défaut, et mesurable. La fenêtre se calculait sur TOUT ce
 * qui est visible : elle faisait 148 × 70 unités à la première étape et
 * 194 × 154 à la dernière. Or l'échelle vaut la place disponible divisée par la
 * fenêtre — les cases passaient donc de 159 pixels de large à 87, et
 * l'organigramme devenait illisible au moment précis où il devenait riche.
 * Chaque étape franchie punissait l'élève.
 *
 * LA FENÊTRE A DONC UNE TAILLE FIXE, et c'est elle qui se DÉPLACE. Le plan
 * entier vit dans un « monde » posé une fois pour toutes ; la fenêtre est un
 * cadre de taille constante que l'on fait glisser dessus, en transition douce.
 * L'échelle ne change plus jamais : une case fait la même taille à la première
 * étape et à la onzième, et l'on VOIT l'organigramme descendre.
 *
 * QUATRE-VINGT-DIX UNITÉS DE HAUT, ET LE CHIFFRE EST MESURÉ. Quand la scène est
 * plus large que haute — un ordinateur, une tablette — l'échelle vaut la
 * HAUTEUR de la scène divisée par celle de la fenêtre : la largeur de la
 * fenêtre n'y change rien. Une étape ordinaire tient dans 64 unités, les deux
 * raccourcis de sixième en demandent 106 parce qu'ils traversent la figure de
 * haut en bas. À 90, une case fait 181 pixels sur un écran d'ordinateur —
 * mesuré, contre 159 au départ et 87 à l'arrivée dans l'ancienne version.
 *
 * SA LARGEUR, ELLE, ÉPOUSE L'ÉCRAN — et cela ne coûte rien là où c'est gratuit.
 * Sur un écran large, l'échelle ne dépend QUE de la hauteur de la fenêtre :
 * l'élargir jusqu'au plan entier ne rapetisse aucune case (mesuré : le plan
 * passe de 895 à 1283 pixels dans une scène qui en offre 1380, et les cases
 * gardent leurs 181) et l'on gagne de ne JAMAIS couper une carte sur le côté.
 * Sur un téléphone, c'est l'inverse : la largeur commande, et une fenêtre large
 * ramènerait les cases de 67 à 47 pixels — mesuré aussi. On prend donc la
 * largeur qui remplit exactement la scène, entre ces deux bornes. Elle est
 * calculée une fois pour la scène, donc CONSTANTE d'une étape à l'autre : c'est
 * la seule chose que Rémy demande.
 */
/** Le monde : le plan entier, plus une marge, dans lequel la fenêtre glisse. */
const MONDE = { x0: -6, y0: -6, w: PLAN_L + 12, h: PLAN_H + 18 };

/** La plus étroite acceptable : l'étape la plus large fait 142 unités. */
const FEN_MIN = 148;
const FEN_H = 90;

/** Le peu d'air qu'on laisse autour d'une carte qu'on vient d'englober. */
const MARGE_CARTE = 2;

/**
 * TOUTES LES CARTES DU PLAN — les cinq figures et les treize conditions.
 *
 * C'est la liste que la fenêtre consulte pour ne couper personne. On y met les
 * cases VIDES aussi : pendant la construction elles sont dessinées en fantôme,
 * et une case fantôme coupée en deux se voit exactement autant qu'une pleine.
 */
let toutesLesBoites = null;
function boitesDuPlan() {
    if (!toutesLesBoites) {
        toutesLesBoites = [
            ...FAMILLES.map(f => boiteFigure(f.id)),
            ...FLECHES.map(boiteCondition)
        ];
    }
    return toutesLesBoites;
}

/**
 * La fenêtre posée sur un groupe de boîtes : même taille toujours, centrée sur
 * ce qu'on regarde, et retenue aux bords du monde — on ne montre pas du vide.
 */
export function fenetreDeLEtape(boites, largeur, voisines = []) {
    const e = enveloppe(boites);
    // LA FENÊTRE CONTIENT TOUJOURS CE QU'ELLE MONTRE — et c'est un défaut qu'on
    // répare, pas un raffinement.
    //
    // Rémy : « il faut que là où on colle la vignette, on le voie en entier. »
    // La largeur était FIXE : centrée sur les boîtes de l'étape, elle coupait
    // celles qui n'y tenaient pas. Or les deux raccourcis de sixième posent
    // leur case tout au bord du plan — le chemin « quadrilatère → losange »
    // s'étale sur cent quarante unités —, et c'est justement la case où l'on
    // doit déposer sa vignette qui sortait du cadre.
    //
    // On garde donc la largeur demandée comme un PLANCHER, et l'on s'élargit
    // quand il le faut. Ce qu'on y perd — les cases rapetissent — est très
    // inférieur à ce qu'on y gagne : une cible qu'on ne voit pas est une cible
    // qu'on ne vise pas.
    const L = Math.max(FEN_MIN, Math.min(MONDE.w, Math.max(largeur || 0, (e.x2 - e.x1) + 8)));
    // ET LA HAUTEUR SUIT LA MÊME RÈGLE. C'est elle qui coupait, en fait : les
    // deux raccourcis de sixième relient le quadrilatère au losange et au
    // rectangle en sautant une rangée entière — leur chemin traverse le plan de
    // haut en bas —, et la fenêtre, haute de quatre-vingt-dix unités et centrée
    // sur l'étape, laissait la case à remplir juste au-dessus ou juste en
    // dessous du bord. Mesuré : huit à vingt-deux pixels de la cible dehors,
    // aux étapes 5 et 8.
    const H = Math.max(FEN_H, Math.min(MONDE.h, (e.y2 - e.y1) + 8));
    const cx = (e.x1 + e.x2) / 2, cy = (e.y1 + e.y2) / 2;
    const borne = (v, min, max) => Math.max(min, Math.min(max, v));
    let x0 = borne(cx - L / 2, MONDE.x0, MONDE.x0 + MONDE.w - L);
    let y0 = borne(cy - H / 2, MONDE.y0, MONDE.y0 + MONDE.h - H);
    let x1 = x0 + L, y1 = y0 + H;

    // ON NE COUPE AUCUNE CARTE EN DEUX.
    //
    // Rémy, capture à l'appui : « on ne voit pas le quadrilatère et le
    // parallélogramme ». À l'étape « parallélogramme → rectangle », le bord
    // haut de la fenêtre tombait AU MILIEU de la rangée de conditions du
    // dessus : on lisait « Qui a ses côtés » et la moitié basse des lettres,
    // et la case du quadrilatère, juste au-dessus, était hors champ. Une carte
    // à moitié dessinée ne se lit pas et ressemble à un défaut d'affichage ;
    // elle donne surtout l'impression que l'organigramme s'est effacé.
    //
    // La règle est donc binaire : une carte est ENTIÈREMENT dedans ou
    // ENTIÈREMENT dehors. Tout ce qui dépasse d'un bord tire ce bord jusqu'à
    // l'englober — et comme s'élargir peut faire entrer une nouvelle carte, on
    // recommence tant que quelque chose bouge (quatre tours suffisent
    // largement : le plan n'a que huit rangées).
    for (let tour = 0; tour < 4; tour++) {
        let bouge = false;
        for (const b of voisines) {
            // Se toucher par le bord ne compte pas : ce n'est pas une coupure.
            if (b.x2 <= x0 || b.x1 >= x1 || b.y2 <= y0 || b.y1 >= y1) continue;
            if (b.x1 < x0) { x0 = b.x1 - MARGE_CARTE; bouge = true; }
            if (b.x2 > x1) { x1 = b.x2 + MARGE_CARTE; bouge = true; }
            if (b.y1 < y0) { y0 = b.y1 - MARGE_CARTE; bouge = true; }
            if (b.y2 > y1) { y1 = b.y2 + MARGE_CARTE; bouge = true; }
        }
        if (!bouge) break;
    }
    x0 = Math.max(MONDE.x0, x0); x1 = Math.min(MONDE.x0 + MONDE.w, x1);
    y0 = Math.max(MONDE.y0, y0); y1 = Math.min(MONDE.y0 + MONDE.h, y1);

    const w = x1 - x0, h = y1 - y0;
    return { x0, y0, w, h, rapport: w / h, zoom: PLAN_L / w };
}

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

/**
 * LE VIRAGE S'ARRONDIT — Rémy : « améliore les flèches, ce n'est pas beau une
 * flèche en escaliers. Tu n'as qu'à arrondir le dernier virage. »
 *
 * Les chemins sont orthogonaux, et ils doivent le rester : c'est ce qui fait
 * qu'on suit un trait des yeux dans un organigramme chargé, et c'est ainsi que
 * sont tracées les fiches. Ce qui est laid, ce n'est pas l'angle droit du
 * tracé, c'est le COIN VIF — la petite marche qui accroche l'œil à chaque
 * changement de direction. On garde donc les segments droits et l'on adoucit
 * les coins, tous, pas seulement le dernier : un chemin à deux coudes dont un
 * seul serait arrondi serait plus bizarre que deux coins vifs.
 *
 * LE RAYON SE MESURE DANS LE PLAN, PAS SUR L'ÉCRAN. Le SVG des liens est étiré
 * (`preserveAspectRatio="none"`) : un rayon posé en pourcentage donnerait un
 * quart de cercle aplati dans un sens et étiré dans l'autre. On coupe donc les
 * segments en unités de plan — trois unités, jamais plus du tiers du segment,
 * sinon un coude court se mangerait lui-même — et l'on convertit ensuite.
 */

function traitEnChemin(pts, v) {
    if (pts.length < 3) return `M ${traitEnPoints(pts, v).replace(/ /g, ' L ')}`;
    const xy = (q) => { const r = placer(q, v); return `${r.gauche.toFixed(2)},${r.haut.toFixed(2)}`; };
    // Un point avancé de `d` unités de plan depuis `a` vers `b`.
    const vers = (a, b, d) => {
        const dx = b.x - a.x, dy = b.y - a.y;
        const l = Math.hypot(dx, dy) || 1;
        const t = Math.min(d, l / 2) / l;
        return { x: a.x + dx * t, y: a.y + dy * t };
    };
    let out = `M ${xy(pts[0])}`;
    for (let i = 1; i < pts.length - 1; i++) {
        const avant = pts[i - 1], coin = pts[i], apres = pts[i + 1];
        const r = Math.min(RAYON_VIRAGE,
            Math.hypot(coin.x - avant.x, coin.y - avant.y) / 2.2,
            Math.hypot(apres.x - coin.x, apres.y - coin.y) / 2.2);
        out += ` L ${xy(vers(coin, avant, r))} Q ${xy(coin)} ${xy(vers(coin, apres, r))}`;
    }
    return `${out} L ${xy(pts[pts.length - 1])}`;
}

/**
 * POURQUOI CETTE FIGURE N'EST PAS DANS CETTE CASE — et l'on parle de RANG, pas
 * de côté. Les deux cases du milieu ont le même rang : aucune n'est avant
 * l'autre, et c'est la seule chose que l'organigramme dit d'elles.
 */
function refusPlacement(caseId, figureId) {
    const p = familleDe(figureId), c = familleDe(caseId);
    if (p.rang < c.rang) {
        return `${p.nom} est PLUS GÉNÉRAL que ce qui va ici : cette case est plus bas dans `
            + 'l\'organigramme, donc plus particulière. On descend en ajoutant des conditions.';
    }
    return `${p.nom} est plus PARTICULIER que ce qui va ici : il a plus de conditions que la `
        + 'case ne le demande. Cherche-lui une place plus bas.';
}

/** Ce qu'on répond quand une vignette tombe juste, sans répéter la phrase. */
function memeTexteDit(texte) {
    const f = FLECHES.find(x => x.ajoute === texte);
    const ailleurs = FLECHES.filter(x => x.ajoute === texte).length;
    return ailleurs > 1
        ? `Oui. Et retiens que « ${(f.court || texte)} » sert ${ailleurs} fois dans cet `
            + 'organigramme : la même condition ne fait pas la même chose selon d\'où l\'on part.'
        : 'Oui.';
}

const COMPETENCE = 'geo.quadrilateres.familles';

// La couche de jeu est à 10000 : une fenêtre ouverte depuis l'exercice doit
// passer au-dessus, sinon elle s'affiche derrière et personne ne la voit.
const ETAGE_MODALE = 100001;

/**
 * L'OUVERTURE — on montre la carte AVANT de la construire.
 *
 * Rémy : « au départ, il faut montrer l'organigramme vide en entier, faire
 * apparaître le quadrilatère, on zoome dessus en laissant visible la case du
 * parallélogramme. Puis on fait apparaître le parallélogramme, et là la popup
 * s'ouvre pour expliquer que l'on va coder le parallélogramme. Idem pour les
 * autres. »
 *
 * CE QUI MANQUAIT, ET CE N'EST PAS DE L'ORNEMENT. L'exercice s'ouvrait sur la
 * figure à coder, seule au milieu de l'écran, avec une fenêtre par-dessus. On
 * demandait donc de coder un parallélogramme sans avoir jamais montré OÙ l'on
 * était : ni la carte qu'on allait construire, ni la case d'où l'on partait, ni
 * celle où l'on arrivait. « Il faut le faire apparaître au fur et à mesure »,
 * disait déjà Rémy — la construction pas à pas était là, mais elle commençait
 * au deuxième pas.
 *
 * ON REMONTE, ON NE RAPETISSE PAS. Rémy, devant la première version : « ne le
 * mets pas en plein écran, mais pars du bas pour aller vers le haut. » Le plan
 * entier tenait dans la scène, oui — mais réduit au point que « Quadrilatère »
 * débordait de sa case, et qu'aucune des treize fentes ne se lisait. Une carte
 * qu'on montre en entier et qu'on ne peut pas lire n'est pas une carte, c'est
 * une vignette. On la PARCOURT donc, à la taille où elle se lit : on part du
 * bas — là où sont les figures les plus particulières — et l'on remonte jusqu'à
 * la case d'où tout part.
 *
 * CINQ TEMPS, ET CHACUN DIT UNE CHOSE :
 *   1. le bas du plan, vide : voilà le travail, et voilà à quoi ressemble une
 *      case et une fente quand on les voit pour de bon ;
 *   2. on remonte tout en haut : la case la plus large est encore vide ;
 *   3. le quadrilatère arrive dedans — voilà d'où l'on part ;
 *   4. la case du dessous attend — voilà où l'on va, et c'est une question ;
 *   5. le parallélogramme arrive — et c'est LUI qu'on va coder, ce que la
 *      fenêtre explique juste après.
 *
 * ON AVANCE AU BOUTON, PAS AU MINUTEUR. Rémy, devant la première version :
 * « la présentation pour l'organigramme est hyper rapide, utilise un bouton
 * suivant ». Il a raison, et un minuteur n'aurait jamais pu avoir raison : deux
 * secondes sont trop longues pour qui a déjà compris et trop courtes pour qui
 * lit la phrase — et il n'existe aucune durée qui convienne aux deux. Le
 * rythme appartient donc à celui qui regarde, comme la correction de la série
 * de questions. « Passer » reste là pour l'auteur, qui la revoit cent fois.
 */
const OUVERTURE = [
    {
        vues: [], cadre: 'bas',
        dit: 'Voici <b>l\'organigramme des quadrilatères</b> : cinq familles, et les '
            + 'conditions qui mènent de l\'une à l\'autre. Il est vide — on va le '
            + 'construire. Tout en bas, les figures qui demandent le PLUS de conditions.'
    },
    {
        vues: [], cadre: 'duo',
        dit: 'On remonte tout en haut, là où l\'on part : la case la plus large de '
            + 'toutes, et celle qui la suit, sont encore vides.'
    },
    {
        vues: ['quadrilatere'], cadre: 'duo',
        dit: 'On part du <b>quadrilatère</b> : la famille la plus large, celle qui ne '
            + 'demande rien de plus que quatre côtés.'
    },
    {
        vues: ['quadrilatere'], cadre: 'duo',
        dit: 'On descend d\'un cran. La case du dessous attend : qu\'est-ce qu\'un '
            + 'quadrilatère doit avoir <b>en plus</b> pour être un parallélogramme ?'
    },
    {
        vues: ['quadrilatere', 'parallelogramme'], cadre: 'duo',
        dit: 'Et voici le <b>parallélogramme</b>. Avant de dire ce qui y mène, on va '
            + 'écrire ses propriétés sur la figure.'
    }
];

/**
 * LES BORNES DE L'ÉCRITURE AJUSTÉE, en pixels — voir `ajusterEcriture`.
 *
 * Le plancher est celui d'un texte encore lisible sur un téléphone ; le plafond
 * n'est pas une limite technique mais un choix : au-delà, une phrase de deux
 * lignes devient une affiche, et l'on ne lit plus une question, on la subit.
 */
const TAILLE_MIN = 14;
const TAILLE_MAX = 46;

/** De quoi poser un texte dans un attribut sans qu'un guillemet le coupe. */
const enAttribut = (t) => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * LES PARTIES DEMANDÉES, DANS L'ORDRE DE LA LEÇON.
 *
 * L'ordre est celui de `PALIERS`, et il n'est pas alphabétique : c'est celui
 * dans lequel on enseigne — les noms, la construction guidée, la construction
 * seule, les questions. Laisser l'ordre des cases cochées aurait donné une
 * leçon différente selon le sens dans lequel on clique.
 *
 * Un réglage vide ou inconnu ne rend jamais une liste vide : `poser()` lirait
 * `undefined` et l'exercice n'afficherait rien. On retombe alors sur ce que
 * disait l'ancien réglage — `palier` —, puis sur la construction étape par
 * étape, qui est le défaut du catalogue.
 */
/** Les bornes du glissement de la caméra — voir `dureeDuGlissement`. */
const DUREE_GLISSE_MIN = 0.75;
const DUREE_GLISSE_MAX = 1.9;

export function partiesDe(params = {}) {
    const ordre = Object.keys(PALIERS);
    const demandees = Array.isArray(params.parties) ? params.parties
        : (typeof params.parties === 'string' && params.parties ? [params.parties] : []);
    const propres = [...new Set(demandees.filter(x => PALIERS[x]))]
        .sort((a, b) => ordre.indexOf(a) - ordre.indexOf(b));
    if (propres.length) return propres;
    return [PALIERS[params.palier] ? params.palier : 'conditions'];
}

class Organigramme extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'quadrilateres');
        this.rng = makeRng(this.params.seed);
        // LES PARTIES DE L'EXERCICE, DANS L'ORDRE — et c'est Rémy qui a vu
        // qu'elles manquaient : « on a l'étape organigramme que l'on peut
        // mettre ou non et après celle où il faut compléter les propriétés.
        // Dans les paramètres, il faut pouvoir paramétrer les exercices à
        // étape. »
        //
        // LES SIX PALIERS N'ÉTAIENT PAS SIX EXERCICES : ce sont six MOMENTS de
        // la même leçon, et on les donne l'un après l'autre. Placer les noms
        // fait entrer dans la hiérarchie ; la construire étape par étape
        // travaille les définitions ; la reconstruire en entier retire les
        // appuis ; la série de questions vérifie. Un menu déroulant obligeait à
        // choisir UN moment, donc à créer quatre exercices pour donner une
        // leçon — ou à les lancer à la main l'un après l'autre.
        this.parties = partiesDe(this.params);
        this.iPartie = 0;
        this.palier = this.parties[0];
        // DEUX RÉGLAGES POUR L'ÉTAPE PAR ÉTAPE, tous deux demandés par Rémy.
        // `codage` intercale « code la figure » après chaque nouvelle case ;
        // `reprise` dit ce qu'on fait d'une erreur — tout reprendre, ou refaire
        // l'étape. Le défaut est le sien : on recommence depuis le début.
        this.codageDemande = this.params.codage !== false && this.params.codage !== 'non';
        this.reprise = this.params.reprise === 'etape' ? 'etape' : 'debut';
        // Vue une fois, elle ne se rejoue pas — voir `poser`.
        this.ouvertureFaite = false;
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
                /* CODER LA FIGURE PREND LA SCÈNE, et l'organigramme s'efface le
                   temps de l'étape. Deux raisons, et la première est mesurée :
                   coder demande huit zones à viser au doigt, et les partager
                   avec le plan les ramènerait sous vingt pixels. La seconde est
                   de méthode — c'est le geste du tableau : « laisse
                   l'organigramme, regarde CETTE figure ». Il revient aussitôt
                   après, à la même échelle, avec sa case de plus. */
                .qd-coder {
                    display: flex; flex-direction: column; align-items: center;
                    justify-content: center; gap: 4px; width: 100%; height: 100%;
                }
                .qd-coder[hidden] { display: none; }
                /* LA FIGURE PREND LA HAUTEUR, PAS TOUTE LA LARGEUR. Sans borne,
                   un parallélogramme s'étirait sur les 1400 pixels de la scène
                   et sa consigne passait sous le panneau : on code une figure,
                   on ne l'affiche pas en affiche. Le viewBox garde ses
                   proportions dans la boîte, quelle qu'elle soit. */
                .qd-coder-fig {
                    flex: 1 1 auto; min-height: 0; width: min(100%, 520px);
                }
                .qd-coder .cg-svg { width: 100%; height: 100%; display: block; }
                .qd-coder-dit {
                    flex: 0 0 auto; font-size: clamp(10px, 2.2cqw, 13px);
                    color: var(--text-muted); text-align: center;
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
                .qd-plan { position: relative; width: 100%; margin: 0 auto; overflow: hidden; }
                /* LE MONDE — le plan entier, dont la fenêtre ne montre qu'une
                   part. Il ne change jamais de taille : il GLISSE. La transition
                   est ce que Rémy appelle « descendre l'organigramme ». */
                /* LA DURÉE EST ÉCRITE PAR cadrer(), PAS ICI — voir dureeDuGlissement().
                   Celle-ci n'est que le repli si le calcul n'a pas eu lieu. */
                .qd-monde {
                    position: absolute; left: 0; top: 0;
                    transition: transform 1s cubic-bezier(.33, 0, .18, 1);
                }
                @media (prefers-reduced-motion: reduce) {
                    .qd-monde { transition: none !important; }
                }
                .qd-fils { position: absolute; inset: 0; width: 100%; height: 100%; }
                /* LES TRAITS. Plus sombres et plus francs qu'avant : à 40 %
                   d'opacité sur du gris clair, l'organigramme ressemblait à un
                   filigrane. Rémy : « celui que je t'ai donné était plus
                   joli » — sa fiche est tracée au feutre noir. */
                .qd-lien {
                    stroke: var(--text-muted); stroke-width: 1.6; fill: none; opacity: .75;
                    stroke-linejoin: round; stroke-linecap: round;
                }
                .qd-lien--ouvert { opacity: .9; stroke-dasharray: 3 3; stroke: var(--primary); }
                .qd-lien--fait { stroke: var(--success); opacity: 1; stroke-width: 2; }
                /* LE PLAN VIDE DE L'OUVERTURE : les chemins sont là, très pâles.
                   C'est la carte du travail à venir — assez visible pour qu'on
                   voie la forme, assez discrète pour qu'on ne la lise pas comme
                   une réponse déjà donnée. */
                .qd-lien--fantome { opacity: .45; stroke-dasharray: 2 4; }
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
                    box-sizing: border-box; overflow: hidden;
                    border: 1.5px solid var(--border); border-radius: 10px;
                    background: var(--bg-panel);
                    display: flex; flex-direction: column; align-items: stretch;
                }
                /* UNE CASE QUI N'EST PAS ENCORE ATTEINTE N'EST PAS LÀ. Rémy :
                   « il faut le faire apparaître au fur et à mesure ». Elle ne
                   s'efface pas, elle n'existe pas encore — et elle arrive à sa
                   place, sans que le reste bouge, parce que les positions sont
                   fixées d'avance. */
                /* ET ELLE ARRIVE SUR PLACE. Rémy : « c'est bizarre,
                   l'apparition des cartes des quadrilatères. » Elle l'était :
                   l'animation gardait le translate(-50%, -50%) du temps où une
                   case était posée par son CENTRE. Depuis qu'elle est posée par
                   son coin, la carte naissait décalée d'une demi-case vers le
                   haut et vers la gauche, puis sautait à sa place à la dernière
                   image. On grandit donc depuis le centre de la case, sans la
                   déplacer. */
                .qd-case--neuve { animation: qd-venir .45s ease-out; transform-origin: center; }
                @keyframes qd-venir {
                    from { opacity: 0; transform: scale(.72); }
                    to { opacity: 1; transform: scale(1); }
                }
                .qd-case--trou { border-style: dashed; background: color-mix(in srgb, var(--warning) 10%, var(--bg-panel)); }
                .qd-case--visee { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 25%, transparent); }
                .qd-case--juste { border-color: var(--success); background: color-mix(in srgb, var(--success) 12%, var(--bg-panel)); }
                /* LES DEUX CASES DE L'ÉTAPE EN COURS SE DÉTACHENT : c'est entre
                   elles deux que se pose la question, et l'élève doit savoir
                   laquelle regarder sans lire la consigne. */
                .qd-case--jeu { border-color: var(--primary); border-width: 2.5px; }
                /* LE DESSIN PREND LE HAUT DE LA CASE, le nom la bande du bas —
                   c'est la fiche de Rémy, et l'ordre a un sens : on lit la
                   figure d'abord, son nom ensuite. */
                .qd-figure { flex: 1 1 auto; width: 100%; min-height: 0; display: block; padding: 3px; box-sizing: border-box; }
                /* LA MÊME PLUME QUE LA FIGURE CODÉE, et c'est ce qui manquait.
                   Rémy : « le quadrilatère dénote dans le style, ses bords sont
                   très épais. » Il l'était : ce contour-ci vit dans un repère de
                   100 unités avec une plume de 4 (quatre pour cent de la boîte),
                   la figure codée dans un repère de 300 avec une plume de 2,6
                   (moins d'un pour cent). Mesuré à l'écran : sept pixels contre
                   un et demi, dans des cases de même taille. Et comme quatre
                   figures sur cinq finissent codées, c'est le quadrilatère —
                   celui qui ne se code jamais — qui restait seul avec sa grosse
                   plume. On l'aligne sur les autres : même encre, même fond,
                   même épaisseur apparente. */
                .qd-trait {
                    fill: var(--tag-dom-bg, #ccd0f7);
                    stroke: var(--primary); stroke-width: 1.1; stroke-linejoin: round;
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
                /* LE BANDEAU DU NOM. Il a sa couleur — le jaune pâle de la
                   fiche de Rémy — et sa ligne de séparation : c'est ce qui
                   fait qu'on ne le confond pas avec le dessin, et ce qui
                   permet de le laisser VIDE quand c'est à l'élève de nommer. */
                .qd-nom {
                    flex: 0 0 auto; font-weight: 800; text-align: center; white-space: nowrap;
                    font-size: clamp(6px, calc(1.8cqw * var(--zoom, 1)), 15px);
                    line-height: 1.05; padding: 3px 2px; min-height: 1.5em;
                    background: var(--qd-bande, #fff5cc);
                    border-top: 1.5px solid var(--border);
                    display: flex; align-items: center; justify-content: center;
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
                /* LES TROIS COULEURS SONT CELLES DE SA FICHE, relevées dans son
                   PDF : fond saturé et texte BLANC pour les diagonales et les
                   raccourcis, bleu pâle et texte noir pour les côtés. Elles se
                   séparent à trois mètres, ce qu'un camaïeu de pastels ne fait
                   pas — et l'écran montre alors exactement ce que la feuille
                   imprimera en couleur. */
                .qd-cond--cotes {
                    border-color: #7f98b4; background: #b4c7dc; color: #12203a;
                }
                .qd-cond--diagonales {
                    border-color: #c81f1f; background: #ff3838; color: #ffffff;
                }
                .qd-cond--raccourci {
                    border-color: #8d5a74; background: #bf819e; color: #ffffff;
                }
                .qd-cond--vide {
                    border-style: dashed; font-size: clamp(9px, 2cqw, 16px);
                    color: var(--text-muted);
                    background: color-mix(in srgb, var(--warning) 10%, var(--bg-panel));
                }
                /* LA CASE QUI ATTEND SE SIGNALE. Rémy : « quand on passe du
                   parallélogramme au rectangle, il faudrait faire clignoter la
                   case à remplir. » L'organigramme descend d'un cran, les deux
                   figures en jeu s'encadrent — mais la case vide, elle, ne
                   disait rien de plus que les autres, et rien ne montrait OÙ
                   poser. Un battement lent, jamais agressif : c'est un repère,
                   pas une alarme. */
                .qd-cond--vide { animation: qd-attendre 1.6s ease-in-out infinite; }
                /* LES CASES ET LES FENTES DE L'OUVERTURE. Elles ne clignotent
                   pas et ne se touchent pas : à ce moment-là, il n'y a rien à
                   faire — on regarde. Une case qui appelle avant que l'exercice
                   ait commencé enseigne à cliquer, pas à lire. */
                /* DES BORDURES QU'ON VOIT. Rémy : « de base, mets un peu plus
                   foncé les bordures. » Elles étaient au gris des bordures de
                   l'application, encore éclaircies par une demi-opacité : la
                   carte vide se devinait au lieu de se lire, et c'est pourtant
                   elle qu'on montre en premier. */
                .qd-case--fantome, .qd-cond--fantome {
                    border-style: dashed; border-color: var(--text-muted);
                    background: color-mix(in srgb, var(--bg-panel) 55%, transparent);
                    opacity: .8; pointer-events: none; animation: none;
                }
                .qd-cond--fantome {
                    position: absolute; box-sizing: border-box; border-width: 1.5px;
                    border-radius: 8px; display: flex; align-items: center;
                    justify-content: center; color: var(--text-muted);
                    font-size: clamp(9px, 2cqw, 16px); font-weight: 700;
                }
                /* ON PEUT COUPER LA MISE EN SCÈNE. L'auteur la revoit cent fois,
                   et un élève qui recommence l'exercice aussi. */
                .qd-passer {
                    margin-left: 8px; border: 1px solid var(--border); border-radius: 999px;
                    background: var(--bg-panel); color: var(--text-muted);
                    font: inherit; font-size: .72rem; font-weight: 700;
                    padding: 2px 10px; min-height: 24px; cursor: pointer; vertical-align: middle;
                }
                .qd-passer:hover { border-color: var(--primary); color: var(--primary); }
                @keyframes qd-attendre {
                    0%, 100% { border-color: var(--border); box-shadow: none; }
                    50% {
                        border-color: var(--primary);
                        box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 22%, transparent);
                    }
                }
                @media (prefers-reduced-motion: reduce) {
                    .qd-cond--vide { animation: none; border-color: var(--primary); }
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
                /* UNE FIGURE DANS LA PALETTE. Elle n'a pas de nom — c'est tout
                   le propos de la deuxième question : on la reconnaît à son
                   codage. Le carré de la vignette est généreux, parce qu'un
                   codage de 40 pixels ne se lit pas. */
                .qd-cartes .qd-chip-fig {
                    width: clamp(64px, 22cqw, 104px); height: clamp(64px, 22cqw, 104px);
                    padding: 4px; background: var(--bg-app);
                }
                .qd-cartes .qd-chip-fig .cg-svg { width: 100%; height: 100%; }
                .qd-cartes .kk-chip--visee {
                    border-color: var(--primary); border-width: 3px;
                    box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 22%, transparent);
                }
                /* La case vide : un point d'interrogation discret, à la place
                   du dessin qui viendra. */
                .qd-vide-fig {
                    flex: 1 1 auto; display: flex; align-items: center; justify-content: center;
                    color: var(--text-muted); font-weight: 800;
                    font-size: clamp(12px, calc(3cqw * var(--zoom, 1)), 28px);
                }
                /* LES JETONS DE CODAGE SONT DES DESSINS, PAS DES MOTS : ils
                   reprennent le carré de l'exercice « Coder la figure ». La
                   règle du dessus rend la taille au contenu — ce qui convient à
                   « Parallélogramme » et écraserait un petit trait. */
                .qd-cartes .cg-chip {
                    width: clamp(38px, 15cqw, 52px); height: clamp(38px, 15cqw, 52px);
                    padding: 0; justify-content: center;
                }

                .qd-barre { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; flex: 0 0 auto; }
                .qd-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700;
                    padding: 6px 11px; font-size: .82rem; min-height: 34px;
                }
                /* LA QUESTION DE LA TROISIÈME PARTIE. Elle a la place que le
                   plan occupait : c'est elle qu'on lit, et il n'y a rien
                   d'autre à regarder — la carte est derrière son bouton. */
                /* LA TAILLE EST POSÉE EN LIGNE, PAR LA MESURE — voir
                   « ajusterEcriture ». La valeur écrite ici n'est que le point
                   de départ, celle qu'on voit le temps d'une image avant le
                   premier ajustement. */
                /* UN MOT NE SE COUPE PAS. Sans cette ligne, la coupure
                   automatique laissait « parallélogram / me » sur deux lignes
                   au milieu de la question — vu à l'écran, sur téléphone. Et ce
                   n'est pas qu'une affaire de goût : c'est le mot qu'on
                   apprend. Le débordement qu'on laisse ainsi apparaître est
                   justement ce que la mesure surveille, et c'est lui qui fait
                   redescendre la taille. */
                .qd-question {
                    font-size: 1.2rem; font-weight: 800; width: 100%;
                    text-align: center; line-height: 1.3; padding: 4px;
                    box-sizing: border-box; overflow-wrap: normal; hyphens: none;
                }
                /* ON TOURNE LA PAGE QUAND ON A LU. Rémy : « et attend entre
                   chaque réponse ». Le bouton est sous la question, là où l'œil
                   vient de finir sa lecture — et non dans la barre du bas, avec
                   « Voir l'organigramme » et « Recommencer », où il se
                   chercherait. */
                .qd-suite {
                    flex: 0 0 auto; padding-top: 6px; width: 100%;
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                }
                .qd-suite[hidden] { display: none; }
                .qd-pourquoi {
                    font-size: clamp(12px, 2.4cqw, 15px); line-height: 1.35;
                    text-align: center; max-width: 640px; font-weight: 600;
                }
                .qd-pourquoi--ok { color: var(--success); }
                .qd-pourquoi--ko { color: var(--danger); }
                .qd-btn--suite {
                    background: var(--primary); border-color: var(--primary); color: #fff;
                    padding: 9px 18px; font-size: .92rem; min-height: 42px;
                }
                /* LES JETONS DE LA TROISIÈME PARTIE — des mots qu'on LIT et
                   qu'on touche, pas des cartes qu'on glisse. Mesuré sur
                   téléphone : dix pixels d'écriture dans une cible de
                   trente-quatre, au milieu d'un écran vide aux quatre
                   cinquièmes. */
                .qd-cartes--choix { gap: 7px; }
                .qd-cartes--choix .kk-chip {
                    font-size: clamp(13px, 3.6cqw, 18px); padding: 10px 15px;
                    min-height: 44px; cursor: pointer;
                }
                /* CE QUE MONTRE LA CORRECTION : la bonne réponse s'entoure, la
                   nôtre se barre si elle était fausse. Les deux ensemble, parce
                   que « ce n'était pas ça » et « c'était ça » sont deux
                   informations, et la seconde est celle qu'on retient. */
                .qd-cartes--choix .kk-chip--figee { cursor: default; pointer-events: none; }
                .qd-cartes--choix .qd-choix--bon {
                    border-color: var(--success); border-width: 3px;
                    background: color-mix(in srgb, var(--success) 16%, transparent);
                    color: var(--success);
                }
                /* PENDANT LA MISE EN SCÈNE, la rangée des cartes porte les deux
                   boutons : « Suivant » est l'action de cet écran, et une
                   pastille au bout d'une phrase ne se voit pas. */
                .qd-cartes--scene { gap: 10px; align-items: center; }
                .qd-cartes--choix .qd-choix--rate {
                    border-color: var(--danger); background: color-mix(in srgb, var(--danger) 12%, transparent);
                    color: var(--danger); text-decoration: line-through;
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
                <div class="qd-scene">
                    <div class="qd-plan" data-plan><div class="qd-monde" data-monde></div></div>
                    <div class="qd-coder" data-coder hidden></div>
                </div>
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
                    <button type="button" class="qd-btn" data-carte hidden>🗺 Voir l'organigramme</button>
                    <button type="button" class="qd-btn" data-verifier hidden>✓ Vérifier le codage</button>
                    <button type="button" class="qd-btn" data-effacer>↺ Recommencer</button>
                    <button type="button" class="qd-btn" data-aide>💡 Aide-moi</button>
                </div>
                <div class="qd-note" data-note></div>
            </div>`;

        this.planEl = this.container.querySelector('[data-plan]');
        this.mondeEl = this.container.querySelector('[data-monde]');
        this.coderEl = this.container.querySelector('[data-coder]');
        this.etapeEl = this.container.querySelector('[data-etape]');
        this.carnetEl = this.container.querySelector('[data-carnet]');
        this.cartesEl = this.container.querySelector('[data-cartes]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.consigneEl = this.container.querySelector('[data-consigne]');
        this.verifierEl = this.container.querySelector('[data-verifier]');
        this.verifierEl.onclick = () => this.verifierLeCodage();
        this.carteEl = this.container.querySelector('[data-carte]');
        this.carteEl.onclick = () => this.montrerLaCarte();
        this.container.querySelector('[data-effacer]').onclick = () => this.effacer();
        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.surveillerLaScene();
    }

    /**
     * LA SCÈNE CHANGE DE TAILLE, L'ÉCRITURE SUIT.
     *
     * Une taille mesurée une fois est juste une fois. Tourner le téléphone,
     * ouvrir le clavier, redimensionner un volet de l'Atelier : la place change
     * et la phrase resterait à l'ancienne mesure — trop grande, donc coupée, ou
     * trop petite au milieu du vide. Le reste du jeu n'en a pas besoin (il se
     * dimensionne en unités de conteneur, qui suivent d'elles-mêmes) ; seule la
     * phrase ajustée a besoin qu'on la remesure.
     */
    surveillerLaScene() {
        const sc = this.container.querySelector('.qd-scene');
        if (!sc || typeof ResizeObserver !== 'function') return;
        this.veilleScene = new ResizeObserver(() => {
            // `isConnected` : l'observateur survit un instant à la fermeture du
            // jeu, et mesurer un élément détaché rend des zéros — de quoi
            // écrire une taille absurde dans un style qu'on ne reverra pas.
            if (sc.isConnected) this.ajusterEcriture();
        });
        this.veilleScene.observe(sc);
    }

    startGameLoop() { this.poser(); }

    poser() {
        // La partie courante commande le palier : tout le reste du jeu lit
        // `this.palier` et n'a rien à savoir de l'enchaînement.
        this.palier = this.parties[this.iPartie] || this.parties[0];
        // DEUX EXERCICES DANS UN SEUL JEU, et ils ne se ressemblent pas. Placer
        // les NOMS, c'est ranger cinq mots dans une hiérarchie déjà dessinée ;
        // placer les CONDITIONS, c'est construire la hiérarchie elle-même, une
        // flèche après l'autre. Le second se joue donc par étapes.
        const mode = (PALIERS[this.palier] || {}).mode;
        this.assemblage = mode === MODES.ASSEMBLAGE;
        this.questions = mode === MODES.QUESTIONS;
        this.progressif = mode === MODES.PROPRIETES;
        if (this.questions) {
            this.org = genererQuestions({
                rng: this.rng, combien: (PALIERS[this.palier] || {}).combien || 8
            });
            this.iQuestion = 0;
            this.justes = 0;
            this.attente = false;
        } else if (this.assemblage) {
            this.org = genererAssemblage({ rng: this.rng });
            this.placement = {};      // case → figure posée
            this.liens = {};          // clé de flèche → texte posé
        } else if (this.progressif) {
            this.org = genererProgressif({
                rng: this.rng, palier: this.palier, codage: this.codageDemande
            });
            this.etape = 0;
            this.posesEtape = [];
            this.codage = null;
            this.codages = {};
            this.annoncee = null;
            // LA MISE EN SCÈNE. `ouverture` est l'indice du temps qu'on joue,
            // `apparition` le numéro de la dernière étape dont la figure est
            // déjà arrivée dans sa case. Le robot n'en a pas besoin : il a sa
            // propre narration, et deux voix qui parlent en même temps n'en
            // font aucune.
            //
            // L'OUVERTURE NE SE JOUE QU'UNE FOIS. Elle répond à « où suis-je » ;
            // la réponse ne change pas au deuxième organigramme, et l'exercice
            // en enchaîne trois. Les APPARITIONS, elles, se rejouent à chaque
            // fois : elles disent « cette figure-ci arrive ICI », ce qui est le
            // contenu même de la leçon.
            this.ouverture = (this.isDemo || this.ouvertureFaite) ? null : 0;
            this.apparition = null;
            this.vues = [];
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

    /**
     * LA PARTIE SUIVANTE — et l'on repart à la première quand on les a toutes
     * faites. Une leçon en trois parties donnée à une classe rapide doit
     * pouvoir recommencer : le meneur, lui, s'arrête quand il a son compte de
     * questions, et c'est à lui de décider quand cela suffit.
     */
    showNext() {
        this.iPartie = (this.iPartie + 1) % this.parties.length;
        return this.poser();
    }

    /**
     * PASSER À L'ÉTAPE SUIVANTE — l'outil d'auteur, et il ne marchait pas ici.
     *
     * Rémy : « le "passer à la question suivante" sur la barre de debug ne
     * fonctionne pas ; en fait, pour les exercices à étapes, cela ne fonctionne
     * pas. » Mesuré : l'écran ne changeait PAS. Le saut appelait `showNext()`,
     * qui relance ici l'organigramme ENTIER depuis sa première étape ; comme la
     * carte est toujours la même, on retombait sur l'écran qu'on venait de
     * quitter. Impossible, donc, d'aller regarder la septième étape — ce qui
     * est précisément à quoi sert ce bouton.
     *
     * ON REMPLIT L'ÉTAPE AU LIEU DE LA SAUTER, et c'est la seule façon de
     * laisser l'organigramme cohérent : une flèche vide qu'on aurait dépassée
     * resterait vide pour toujours, et l'étape suivante montrerait une carte
     * fausse. On pose donc les bonnes réponses de l'étape — le codage juste, ou
     * les conditions de la flèche — puis on avance.
     *
     * @returns {boolean} faux quand il n'y a plus d'étape : le meneur reprend
     *                    alors son chemin ordinaire et passe à l'exercice suivant.
     */
    sauterEtape() {
        // PAS DE GARDE « ISDEMO » ICI, et c'est voulu : c'est la démonstration
        // elle-même qui s'en sert pour franchir l'étape de codage. La garde
        // vit sur les gestes de l'élève — poser une carte, coder une figure —,
        // là où un robot n'a rien à faire.
        if (!this.org) return false;
        // LA MISE EN SCÈNE EST LA PREMIÈRE CHOSE QU'ON SAUTE. Un auteur qui
        // cherche la septième étape n'a pas à regarder l'ouverture d'abord, et
        // le saut doit franchir quelque chose de visible à chaque appui.
        if (this.ouverture !== null && this.ouverture !== undefined) {
            this.finirOuverture();
            return true;
        }
        const enScene = this.etapeCourante;
        if (enScene && enScene.genre === 'codage' && this.apparition !== enScene.numero) {
            this.apparition = enScene.numero;
            this.dessiner();
            return true;
        }

        // La série de questions : la suivante, sans la compter juste ni fausse.
        if (this.questions) {
            if (this.iQuestion >= this.org.questions.length - 1) return false;
            // On saute PAR-DESSUS l'attente : le saut d'auteur ne lit pas les
            // explications, et une attente laissée en travers figerait les
            // jetons de la question suivante.
            this.attente = false;
            this.iQuestion += 1;
            this.dessiner();
            this.note('Question suivante (saut d\'auteur).');
            return true;
        }

        // La reconstruction : on pose l'élément suivant qui manque — une figure
        // tant qu'il en reste, une flèche ensuite.
        if (this.assemblage) {
            if (!this.phaseVignettes) {
                const fam = FAMILLES.find(f => !this.placement[f.id]);
                if (!fam) return false;
                this.placement[fam.id] = fam.id;
                this.dessiner();
                this.note(`${fam.nom} posé (saut d'auteur).`);
                return true;
            }
            const f = FLECHES.find(x => this.liens[cleFleche(x)] === undefined);
            if (!f) return false;
            this.liens[cleFleche(f)] = f.ajoute;
            this.dessiner();
            if (Object.keys(this.liens).length >= FLECHES.length) return this.gagner() || true;
            this.note('Flèche garnie (saut d\'auteur).');
            return true;
        }

        if (!this.progressif) return false;
        const e = this.etapeCourante;
        if (!e) return false;
        if (e.genre === 'codage') {
            // On code la figure comme il faut : la case doit porter son codage
            // à l'étape suivante, sinon la carte ment.
            const fig = construireFigure(e.figure, e.dims, 0);
            const ids = segmentsDe(true), pts = pointsAngleDe(true);
            const pose = { marques: {}, angles: {} };
            classesDeLongueur(fig, ids).forEach((classe, i) =>
                classe.forEach(id => { pose.marques[id] = i + 1; }));
            anglesDroitsDe(fig, pts).forEach(pt => { pose.angles[pt] = true; });
            this.codages[e.figure] = { fig, ids, pts, pose };
            this.codage = null;
        } else {
            this.trouvees[e.rang] = (e.bonnes || []).slice();
        }
        this.etape += 1;
        this.posesEtape = [];
        this.annoncee = e.numero;   // on ne rouvre pas la fenêtre d'annonce
        if (this.etape >= this.org.etapes.length) { this.gagner(); return true; }
        this.dessiner();
        this.note(`Étape ${this.etape + 1} sur ${this.org.etapes.length} (saut d'auteur).`);
        return true;
    }

    /**
     * LE PLAN DES ÉTAPES — outil d'auteur, et Rémy en a dit le besoin d'une
     * phrase : « c'est où l'exercice sur "un parallélogramme qui a deux côtés
     * consécutifs perpendiculaires est un…" ? Où je l'ai loupé quelque part ?
     * On pourrait avoir dans la barre de debug un bouton qui fait apparaître
     * une ligne sur les étapes. »
     *
     * IL NE L'AVAIT PAS LOUPÉ : cette question-là est la troisième étape de la
     * construction de l'organigramme, et il n'y avait aucun moyen de savoir
     * qu'elle existait sans y arriver — ni de sauter dessus pour la regarder.
     * Onze étapes derrière un seul bouton « suivant », c'est un couloir sans
     * fenêtres.
     *
     * On rend donc ce que le jeu sait de lui-même : la liste de ses étapes,
     * avec leurs vrais titres, et celle où l'on est. Le meneur en fait une
     * ligne cliquable ; le déplacement, lui, repasse par `sauterEtape` et
     * `revenirEtape` — les deux chemins déjà éprouvés — plutôt que par un
     * troisième qui pourrait laisser la carte incohérente.
     *
     * @returns {{courante:number, liste:string[], partie?:string}|null}
     */
    planEtapes() {
        if (!this.org) return null;
        // La partie en cours, quand l'exercice en enchaîne plusieurs : sans
        // elle, « étape 3 sur 11 » ne dit pas de quelle leçon on parle.
        const partie = this.parties.length > 1
            ? `${(PALIERS[this.palier] || {}).label || this.palier} `
                + `(${this.iPartie + 1}/${this.parties.length})`
            : null;
        if (this.progressif) {
            return {
                courante: Math.min(this.etape, this.org.etapes.length - 1),
                liste: this.org.etapes.map(e => e.titre),
                ...(partie ? { partie } : {})
            };
        }
        if (this.questions) {
            return {
                courante: this.iQuestion,
                liste: this.org.questions.map((q, i) => `Question ${i + 1}`),
                ...(partie ? { partie } : {})
            };
        }
        // L'assemblage se remplit case par case et flèche par flèche : ce n'est
        // pas une suite d'étapes nommées, et une liste de dix-huit lignes
        // « figure 4 » n'apprendrait rien à personne.
        return partie ? { courante: 0, liste: [], partie } : null;
    }

    /** Pendant du saut : on recule d'une étape, en la vidant. */
    revenirEtape() {
        if (this.isDemo || !this.org || this.fini) return false;
        if (this.questions) {
            if (this.iQuestion <= 0) return false;
            this.attente = false;
            this.iQuestion -= 1;
            this.dessiner();
            return true;
        }
        if (this.assemblage) {
            if (this.phaseVignettes) {
                const f = [...FLECHES].reverse().find(x => this.liens[cleFleche(x)] !== undefined);
                if (f) { delete this.liens[cleFleche(f)]; this.dessiner(); return true; }
            }
            const fam = [...FAMILLES].reverse().find(x => this.placement[x.id]);
            if (!fam) return false;
            delete this.placement[fam.id];
            this.dessiner();
            return true;
        }
        if (!this.progressif || this.etape <= 0) return false;
        this.etape -= 1;
        this.posesEtape = [];
        const e = this.etapeCourante;
        if (e && e.genre === 'codage') delete this.codages[e.figure];
        else if (e) this.trouvees[e.rang] = [];
        this.annoncee = e ? e.numero : null;
        // On revient sur une étape déjà vue : sa figure est déjà là, on ne la
        // fait pas re-tomber du ciel.
        if (e && e.genre === 'codage') this.apparition = e.numero;
        this.dessiner();
        return true;
    }

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
        if (this.questions) return this.dessinerQuestions();
        if (this.assemblage) return this.dessinerAssemblage();
        if (this.progressif) return this.dessinerProgressif();
        this.dessinerNoms();
    }

    /** Les cinq figures posées : on passe alors aux vignettes. */
    get phaseVignettes() {
        return Object.keys(this.placement || {}).length >= FAMILLES.length;
    }

    /**
     * LA FIGURE TELLE QU'ON LA MONTRE DANS LA PALETTE ET DANS SA CASE : codée.
     *
     * C'est là que le codage de la première question paie. On reconnaît un
     * losange à ses quatre marques identiques et à l'angle droit de ses
     * diagonales, pas à son étiquette — et le quadrilatère quelconque se
     * reconnaît, lui, à ce qu'il n'a AUCUNE marque : c'est sa définition.
     */
    figureCodeeSvg(famId) {
        const dims = DIMS_CODAGE[famId];
        if (!dims) return this.figureSvg(familleDe(famId), true, false);
        const fig = construireFigure(famId, dims, 0);
        const ids = segmentsDe(true), pts = pointsAngleDe(true);
        const pose = { marques: {}, angles: {} };
        classesDeLongueur(fig, ids).forEach((classe, i) =>
            classe.forEach(id => { pose.marques[id] = i + 1; }));
        anglesDroitsDe(fig, pts).forEach(pt => { pose.angles[pt] = true; });
        return codageSvg(fig, { segments: ids, points: pts, pose, interactif: false, nomsSommets: false })
            .replace('class="cg-svg"', 'class="cg-svg qd-figure qd-figure--codee"');
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
    /**
     * LE PLAN NU — cases pleines, cases fantômes, fentes vides, et rien à
     * toucher. C'est le dessin de la mise en scène : l'organigramme tel qu'il
     * SERA, avec ce qui est déjà arrivé.
     *
     * Les cases qu'on n'a pas encore atteintes ne sont pas absentes ici — c'est
     * tout le propos de l'ouverture, montrer la carte entière — mais elles sont
     * VIDES et sans nom : la forme du travail, pas ses réponses.
     */
    dessinerPlanNu(fen, visibles, neuve, avecTravail = false) {
        this.coderEl.hidden = true;
        this.planEl.hidden = false;
        this.verifierEl.hidden = true;
        this.carteEl.hidden = true;
        this.etapeEl.hidden = true;
        this.carnetEl.hidden = true;
        this.cartesEl.className = 'qd-cartes';
        this.cartesEl.innerHTML = '';
        this.cadrer(fen, MONDE);

        // CE QUI EST DÉJÀ POSÉ RESTE POSÉ — et c'est un vrai défaut qu'on répare.
        //
        // Rémy : « quand on arrive à "on code le losange", les vignettes d'avant
        // disparaissent. » Elles disparaissaient pour de bon : cet écran-ci
        // redessinait TOUT en fantôme, conditions comprises, et l'élève voyait
        // son organigramme se vider d'un coup au milieu de l'exercice. Le
        // travail était intact dans les données — il revenait à l'étape
        // suivante —, mais on ne le savait qu'après avoir eu peur.
        const poses = avecTravail ? this.pointsPoses() : {};
        const traits = FLECHES.map(f => {
            const t = traitsDeCondition(f);
            const fait = poses[cleFleche(f)] !== undefined;
            const cls = `qd-lien${fait ? ' qd-lien--fait' : ' qd-lien--fantome'}`;
            return `<path class="${cls}" fill="none" vector-effect="non-scaling-stroke"
                    d="${traitEnChemin(t.entrant, MONDE)}"/>
                <path class="${cls}" fill="none" vector-effect="non-scaling-stroke"
                    d="${traitEnChemin(t.sortant, MONDE)}"/>`;
        }).join('');
        let html = `<svg class="qd-fils" viewBox="0 0 100 100"
            preserveAspectRatio="none">${traits}</svg>`;
        html += pointesHtml(FLECHES.flatMap(f => {
            const t = traitsDeCondition(f);
            return [t.entrant, t.sortant];
        }), MONDE);

        for (const fam of FAMILLES) {
            const b = placerBoite(boiteFigure(fam.id), MONDE);
            const style = `left:${b.gauche}%; top:${b.haut}%; width:${b.large}%; height:${b.haute}%`;
            html += visibles.includes(fam.id)
                ? `<div class="qd-case ${fam.id === neuve ? 'qd-case--neuve' : ''}" style="${style}">
                    ${this.figureSvg(fam, true, fam.id === neuve)}
                    <div class="qd-nom">${fam.nom}</div></div>`
                : `<div class="qd-case qd-case--fantome" style="${style}"></div>`;
        }
        for (const f of FLECHES) {
            const b = placerBoite(boiteCondition(f), MONDE);
            const style = `left:${b.gauche}%; top:${b.haut}%; width:${b.large}%; height:${b.haute}%`;
            const texte = poses[cleFleche(f)];
            if (texte === undefined) {
                html += `<div class="qd-cond qd-cond--fantome" style="${style}">?</div>`;
                continue;
            }
            const pol = policeCondition(texte);
            html += `<div class="qd-cond qd-cond--${f.famille} qd-cond--posee"
                style="${style}; font-size:clamp(5px, ${pol.cqw}cqw, 15px)"
                title="${enAttribut(texte)}"
                ><span class="qd-cond-t">${pol.lignes.map(enAttribut).join('<br>')}</span></div>`;
        }
        this.mondeEl.innerHTML = html;
        this.ajusterCartes();
    }

    /** La fenêtre posée sur deux cases voisines et ce qui les relie. */
    cadreDuo(de, vers) {
        return fenetreDeLEtape([boiteFigure(de), boiteFigure(vers),
            ...FLECHES.filter(f => f.de === de && f.vers === vers).map(boiteCondition)],
        this.largeurFenetre(), boitesDuPlan());
    }

    /**
     * LES DEUX BOUTONS DE LA MISE EN SCÈNE, posés là où sont les cartes.
     *
     * Pas dans la ligne de consigne : « Suivant » est L'ACTION de cet écran, et
     * une petite pastille au bout d'une phrase ne se voit pas. La rangée des
     * cartes est vide pendant la mise en scène — c'est sa place.
     */
    boutonsDeScene(mot, suite, passer = null) {
        this.cartesEl.className = 'qd-cartes qd-cartes--scene';
        this.cartesEl.innerHTML = `
            <button type="button" class="qd-btn qd-btn--suite" data-suivant>${mot}</button>
            ${passer ? '<button type="button" class="qd-passer" data-passer>Passer ▸</button>' : ''}`;
        this.cartesEl.querySelector('[data-suivant]').onclick = suite;
        // ON PEUT COUPER L'OUVERTURE — elle raconte la carte, et qui la connaît
        // n'a pas à la revoir ; l'auteur, lui, la reverrait cent fois. Une
        // APPARITION, non : elle ne dure qu'un clic, et ce clic EST la leçon —
        // « le rectangle arrive ICI ». Deux boutons pour le même geste ne
        // seraient d'ailleurs qu'une hésitation de plus.
        const b = this.cartesEl.querySelector('[data-passer]');
        if (b) b.onclick = passer;
    }

    /** L'un des quatre temps de l'ouverture. On avance au bouton. */
    dessinerOuverture() {
        const beat = OUVERTURE[this.ouverture];
        if (!beat) return this.finirOuverture();
        this.consigneEl.innerHTML = beat.dit;
        const fen = beat.cadre === 'bas'
            // Le bas du plan : le carré et ce qui y mène. C'est là qu'on voit le
            // mieux à quoi ressemblent une case et une fente, parce qu'elles y
            // sont à la taille où l'on travaillera.
            ? fenetreDeLEtape([boiteFigure('carre'), boiteFigure('losange'),
                boiteFigure('rectangle')], this.largeurFenetre(), boitesDuPlan())
            : this.cadreDuo('quadrilatere', 'parallelogramme');
        // La figure qui ARRIVE à ce temps-ci : celle que le temps précédent ne
        // montrait pas encore. C'est elle qui reçoit l'animation d'entrée.
        const avant = this.ouverture > 0 ? OUVERTURE[this.ouverture - 1].vues : [];
        const neuve = beat.vues.find(id => !avant.includes(id)) || null;
        this.dessinerPlanNu(fen, beat.vues, neuve);
        const dernier = this.ouverture >= OUVERTURE.length - 1;
        this.boutonsDeScene(dernier ? 'On code le parallélogramme ▸' : 'Suivant ▸', () => {
            if (this.ouverture === null) return;
            this.ouverture += 1;
            if (this.ouverture >= OUVERTURE.length) this.finirOuverture();
            else this.dessiner();
        }, () => this.finirOuverture());
    }

    /**
     * L'ouverture est finie : le parallélogramme est arrivé, on passe au
     * codage. Son apparition est marquée comme faite — la rejouer aussitôt
     * après l'avoir montrée serait la montrer deux fois.
     */
    finirOuverture() {
        if (this.ouverture === null) return;
        this.ouverture = null;
        this.ouvertureFaite = true;
        const e = this.etapeCourante;
        if (e && e.genre === 'codage') this.apparition = e.numero;
        this.dessiner();
    }

    /**
     * LA FIGURE ARRIVE DANS SA CASE, puis on la code — « idem pour les autres ».
     *
     * On cadre sur la case d'où l'on vient et sur celle qui vient d'apparaître :
     * une figure qui surgit seule au milieu d'un écran ne dit pas d'où elle
     * sort, et c'est justement ce que l'organigramme enseigne.
     */
    montrerApparition(e) {
        const nom = familleDe(e.figure).nom.toLowerCase();
        this.consigneEl.innerHTML = `Le <b>${nom}</b> arrive dans l'organigramme, `
            + `sous le ${familleDe(e.de).nom.toLowerCase()}.`;
        this.dessinerPlanNu(this.cadreDuo(e.de, e.figure), e.vues, e.figure, true);
        this.boutonsDeScene(`On code le ${nom} ▸`, () => {
            if (this.apparition === e.numero) return;
            this.apparition = e.numero;
            this.dessiner();
        });
    }

    dessinerProgressif() {
        const e = this.etapeCourante;
        // L'OUVERTURE PASSE AVANT TOUT — voir OUVERTURE.
        if (this.ouverture !== null && this.ouverture !== undefined) return this.dessinerOuverture();
        // ET CHAQUE FIGURE ARRIVE DANS SA CASE AVANT QU'ON LA CODE. Rémy :
        // « idem pour les autres ». Sans cela, le rectangle apparaissait pour
        // la première fois SEUL, en grand, dans l'écran de codage — c'est-à-dire
        // nulle part : ni dans l'organigramme, ni à côté de la case dont il
        // descend.
        if (e && e.genre === 'codage' && !this.isDemo && this.apparition !== e.numero) {
            return this.montrerApparition(e);
        }
        // LE CODAGE A SON ÉCRAN. Il garde le même conteneur et le même compte
        // d'étapes : c'est la même leçon, vue de l'autre côté.
        if (e && e.genre === 'codage') return this.dessinerCodage(e);
        this.coderEl.hidden = true;
        this.planEl.hidden = false;
        this.verifierEl.hidden = true;
        this.carteEl.hidden = true;

        const visibles = (e && e.vues) || casesVisibles(this.org.etapes.length);
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

        // LA FENÊTRE SUIT L'ÉTAPE, ET NE CHANGE PAS DE TAILLE. On la centre sur
        // les deux cases en jeu et leurs conditions — pas sur tout ce qui est
        // visible : l'organigramme monte au-dessus, et c'est très bien.
        //
        // SAUF À LA FIN, et c'est le seul moment où elle change : l'exercice est
        // terminé, la consigne dit « relis-le », et le relire suppose de le VOIR
        // — les treize conditions et les cinq figures d'un coup. Ce n'est plus
        // une étape, c'est la leçon.
        const v = e
            ? MONDE
            : fenetre([...visibles.map(id => boiteFigure(id)),
                ...montrees.map(f => boiteCondition(f))]);
        this.cadrer(e
            ? fenetreDeLEtape([boiteFigure(e.de), boiteFigure(e.vers),
                ...FLECHES.filter(f => e.cles.includes(cleFleche(f))).map(boiteCondition)],
            this.largeurFenetre(), boitesDuPlan())
            : v, v);

        // LES TRAITS. Chaque condition en porte deux : ce qui y entre, ce qui en
        // sort. Ils ne se dessinent que si la condition est montrée — sinon on
        // verrait des chemins vers des cases qui n'existent pas encore.
        const traits = montrees.map(f => {
            const t = traitsDeCondition(f);
            const fait = poses[cleFleche(f)] !== undefined;
            const cls = `qd-lien${fait ? ' qd-lien--fait' : ' qd-lien--ouvert'}`;
            return `<path class="${cls}" fill="none" vector-effect="non-scaling-stroke"
                    d="${traitEnChemin(t.entrant, v)}"/>
                <path class="${cls}" fill="none" vector-effect="non-scaling-stroke"
                    d="${traitEnChemin(t.sortant, v)}"/>`;
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

        this.mondeEl.innerHTML = html;
        this.ajusterCartes();
        this.mondeEl.querySelectorAll('[data-donnee]').forEach(el => {
            el.onclick = () => this.note(el.dataset.donnee);
        });

        this.dessinerEtape(e);
        // PLUS DE CARNET : voir dessinerCarnet().

        // LA PALETTE PORTE LA VIGNETTE. La phrase entière reste en infobulle :
        // ce sont les mêmes mots que dans « Le Quadrilatère qui se Transforme »,
        // et c'est exprès — deux exercices, un seul vocabulaire.
        const restantes = e ? e.cartes.filter(c => !this.posesEtape.includes(c.id)) : [];
        this.cartesEl.className = 'qd-cartes';
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
     * CODER LA FIGURE QU'ON VIENT DE FAIRE APPARAÎTRE.
     *
     * Rémy : « Ensuite, on lui demande de coder le parallélogramme. […] On code
     * le rectangle puis après on met les vignettes. »
     *
     * L'étape reprend l'exercice « Coder la figure » — mêmes marques, mêmes
     * zones, même correction : on pose les traits sur les côtés de même
     * longueur, le petit carré sur les angles droits. Ce qui change, c'est le
     * MOMENT : la condition qu'on vient de poser sur la flèche est encore
     * fraîche, et coder, c'est la retrouver sur le dessin.
     */
    dessinerCodage(e) {
        this.planEl.hidden = true;
        this.coderEl.hidden = false;
        this.verifierEl.hidden = false;
        this.carteEl.hidden = true;
        this.carnetEl.hidden = true;
        // Les cases vues restent celles de l'étape : au retour au plan, aucune
        // ne doit rejouer son animation d'arrivée.
        this.vues = (e.vues || []).slice();
        if (!this.codage || this.codage.numero !== e.numero) {
            // AVEC LES DIAGONALES. Rémy : « on code le parallélogramme avec les
            // diagonales ». C'est d'elles que parle la moitié des vignettes qui
            // vont suivre — « qui se croisent en leur milieu », « de même
            // longueur », « perpendiculaires » —, et les avoir mesurées AVANT
            // est exactement ce qui rend la vignette évidente.
            this.codage = {
                numero: e.numero,
                fig: construireFigure(e.figure, e.dims, 0),
                ids: segmentsDe(true), pts: pointsAngleDe(true),
                pose: { marques: {}, angles: {} }
            };
        }
        const c = this.codage;
        const nom = familleDe(e.figure).nom.toLowerCase();

        this.consigneEl.innerHTML = `Étape ${this.etape + 1} sur ${this.org.etapes.length} — `
            + `<b>code ce ${nom}</b> : même marque sur les segments de même longueur — `
            + 'les demi-diagonales comprises —, le petit carré sur les angles droits.';
        this.etapeEl.hidden = false;
        this.etapeEl.innerHTML = `<div class="qd-etape-titre">Tu viens de dire ce qui fait un
            <b>${nom}</b>. Écris-le maintenant sur la figure : on tape un côté pour faire
            défiler les marques, ou l'on glisse un symbole depuis la palette.</div>`;

        this.annoncerCodage(e);
        this.coderEl.innerHTML = `<div class="qd-coder-fig">${codageSvg(c.fig, {
            segments: c.ids, points: c.pts, pose: c.pose, interactif: true
        })}</div>`
            + '<div class="qd-coder-dit">Quand tout est marqué, appuie sur « Vérifier le codage ».</div>';

        this.cartesEl.className = 'qd-cartes';
        this.cartesEl.innerHTML = [1, 2, 3, 4].map(n =>
            `<button type="button" class="kk-chip cg-chip" data-chip="${n}"
                aria-label="Marque à ${n === 4 ? 'croix' : `${n} trait${n > 1 ? 's' : ''}`}"
                >${jetonSvg(n)}</button>`).join('')
            + `<button type="button" class="kk-chip cg-chip cg-chip--angle" data-chip="angle"
                aria-label="Angle droit">${jetonAngleSvg()}</button>`
            + `<button type="button" class="kk-chip cg-chip cg-chip--gomme" data-chip=""
                aria-label="Effacer une marque">⌫</button>`;

        this.brancherCodage();
    }

    /**
     * ON PRÉVIENT AVANT DE CODER — Rémy : « tu ouvres une modale pour dire que
     * l'on va coder le parallélogramme ».
     *
     * Ce n'est pas une politesse : l'écran change entièrement de nature —
     * l'organigramme disparaît, une figure seule le remplace, la palette n'est
     * plus la même. Sans un mot, l'élève croit s'être trompé de bouton. La
     * fenêtre dit ce qu'on va faire, POURQUOI on le fait maintenant, et ce qui
     * arrivera après ; on n'annonce qu'une fois par étape.
     */
    async annoncerCodage(e) {
        if (this.isDemo || this.annoncee === e.numero) return;
        this.annoncee = e.numero;
        const nom = familleDe(e.figure).nom.toLowerCase();
        const { showModal } = await import('../ui/modal.js');
        const m = showModal(`On code le ${nom}`, `
            <div style="text-align:center; line-height:1.5">
                <p style="margin:0 0 10px">Le <b>${nom}</b> vient d'apparaître dans
                    l'organigramme. Avant de dire ce qui y mène, on va l'<b>écrire sur la
                    figure</b> : même marque sur les segments de même longueur, petit carré
                    sur les angles droits — <b>les diagonales comprises</b>.</p>
                <p style="margin:0 0 16px; color:var(--text-muted); font-size:.9rem">
                    C'est là qu'on trouve les propriétés. Les vignettes, juste après, ne
                    feront que leur donner un nom — et la figure codée restera dans sa
                    case pendant que tu les poses.</p>
                <button type="button" class="qd-btn qd-modale-ok"
                    style="background:var(--primary); border-color:var(--primary); color:#fff;
                        padding:9px 18px; font-size:.9rem">Je code le ${nom}</button>
            </div>`, { width: '430px', zIndex: ETAGE_MODALE });
        const ok = m.element.querySelector('.qd-modale-ok');
        if (ok) ok.onclick = () => m.close();
    }

    /** Les zones de la figure : au doigt, au clavier, et par glisser. */
    brancherCodage() {
        if (this.isDemo) return;
        const c = this.codage;
        const marques = [1, 2, 3, 4];
        const poserMarque = (id, valeur) => {
            if (valeur) c.pose.marques[id] = valeur; else delete c.pose.marques[id];
            this.dessiner();
        };
        const poserAngle = (pt, actif) => {
            if (actif) c.pose.angles[pt] = true; else delete c.pose.angles[pt];
            this.dessiner();
        };
        this.coderEl.querySelectorAll('.cg-cible--seg').forEach(cible => {
            const defiler = () => {
                const actuel = c.pose.marques[cible.dataset.seg] || 0;
                poserMarque(cible.dataset.seg, actuel >= marques.length ? 0 : actuel + 1);
            };
            cible.onclick = defiler;
            cible.onkeydown = (ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); defiler(); }
            };
        });
        this.coderEl.querySelectorAll('.cg-cible--pt').forEach(cible => {
            const bascule = () => poserAngle(cible.dataset.pt, !c.pose.angles[cible.dataset.pt]);
            cible.onclick = bascule;
            cible.onkeydown = (ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); bascule(); }
            };
        });
        brancherGlisserPalette(this.container, {
            bloque: () => this.fini,
            classeVisee: 'cg-cible--visee',
            cibleSous: (ev) => {
                const el = document.elementFromPoint(ev.clientX, ev.clientY);
                const cible = el && el.closest ? el.closest('.cg-cible') : null;
                if (!cible) return null;
                // Une marque ne se pose pas sur un sommet, un angle droit ne se
                // pose pas sur un côté : la gomme, elle, va partout.
                const chip = document.querySelector('.kk-chip.drag-source');
                const quoi = chip ? chip.dataset.chip : '';
                if (quoi === '') return cible;
                return (quoi === 'angle') === cible.classList.contains('cg-cible--pt') ? cible : null;
            },
            deposer: (cible, chip) => {
                const quoi = chip.dataset.chip;
                if (cible.classList.contains('cg-cible--pt')) poserAngle(cible.dataset.pt, quoi === 'angle');
                else poserMarque(cible.dataset.seg, quoi === '' ? 0 : Number(quoi));
            }
        });
    }

    /**
     * VÉRIFIER LE CODAGE — et ce qui n'est pas fini n'est pas une erreur.
     *
     * Un côté encore nu, ce n'est pas une faute : c'est une phrase inachevée. On
     * le dit, et l'on ne compte rien — sans quoi un élève qui appuie trop tôt
     * ferait tout recommencer pour une distraction.
     */
    verifierLeCodage() {
        if (this.isDemo || this.fini) return;
        const e = this.etapeCourante;
        if (!e || e.genre !== 'codage' || !this.codage) return;
        const c = this.codage;
        const bilan = verifierCodage(c.fig, c.pose, c.ids, c.pts);
        const manque = bilan.problemes.find(p => p.genre === 'manque');
        if (manque) return this.note(manque.message);
        const nom = familleDe(e.figure).nom.toLowerCase();
        if (!bilan.correct) {
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: `Organigramme — coder le ${nom}`,
                input: canoniser(c.pose, c.ids, c.pts),
                expected: (PROPRIETES[e.figure] || []).join(' ; '),
                partiel: true, silencieux: true
            });
            return this.rater(bilan.problemes[0].message);   // le défaut est SUR la figure
        }
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Organigramme — coder le ${nom}`,
            expected: 'codage juste', given: 'codage juste', points: 8, partiel: true
        });
        // Le codage est RANGÉ, et c'est lui qu'on reverra dans la case.
        this.codages[e.figure] = {
            fig: c.fig, ids: c.ids, pts: c.pts,
            pose: { marques: { ...c.pose.marques }, angles: { ...c.pose.angles } }
        };
        this.codage = null;
        this.avancer(`Le ${nom} est codé — ${(PROPRIETES[e.figure] || [])[0]}.`);
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
            // Une étape de codage n'a pas de flèche : elle partage le rang de
            // celle qui l'a amenée, et n'a rien à poser sur le plan.
            if (!x.cles) return;
            const trouvees = this.trouvees[x.rang] || [];
            // Une étape a autant de flèches que de conditions : on garnit les
            // voies dans l'ordre, ce qui suffit — les fentes d'une étape sont
            // interchangeables, et donc les voies aussi.
            trouvees.forEach((texte, i) => { if (x.cles[i]) out[x.cles[i]] = texte; });
        });
        return out;
    }



    /**
     * UNE SÉRIE DE QUESTIONS, LA CARTE À PORTÉE — la troisième question.
     *
     * Rémy : « pour la 3ème question, ce sera une série de questions où on peut
     * rappeler l'organigramme pour voir. »
     *
     * LE PLAN N'EST PAS À L'ÉCRAN, ET C'EST LE POINT. S'il y était, on lirait la
     * réponse sans se poser la question — on ne travaillerait plus rien. Il est
     * derrière un bouton : on essaie d'abord, et l'on va voir quand on ne sait
     * plus. C'est exactement le geste qu'un organigramme doit installer.
     */
    dessinerQuestions() {
        // LA QUESTION PREND LA PLACE DU PLAN, et pas la ligne d'en dessous. Vu
        // à l'écran : posée dans le panneau d'étape, elle se retrouvait tout en
        // bas, avec six cents pixels de vide au-dessus — là où le plan aurait
        // été. Elle vit donc dans la scène, qui est faite pour cela.
        this.planEl.hidden = true;
        this.coderEl.hidden = false;
        this.verifierEl.hidden = true;
        this.carnetEl.hidden = true;
        this.etapeEl.hidden = true;
        this.carteEl.hidden = false;

        const q = this.org.questions[this.iQuestion];
        if (!q) return;
        this.direOuEnEstLaSerie();
        this.coderEl.innerHTML = `<div class="qd-question" data-question>${enAttribut(q.texte)}</div>
            <div class="qd-suite" data-suite hidden>
                <div class="qd-pourquoi" data-pourquoi></div>
                <button type="button" class="qd-btn qd-btn--suite" data-suivante></button>
            </div>`;
        // LES JETONS DE CETTE PARTIE PORTENT DES MOTS QU'ON LIT, pas des cartes
        // qu'on glisse : ils ont leur propre écriture, plus grande, et une
        // hauteur de vraie cible tactile. Voir la règle « --choix ».
        this.cartesEl.className = 'qd-cartes qd-cartes--choix';
        this.cartesEl.innerHTML = q.choix.map((c, i) =>
            `<div class="kk-chip" data-choix="${i}">${enAttribut(c.dit)}</div>`).join('');
        this.cartesEl.querySelectorAll('[data-choix]').forEach(chip => {
            chip.onclick = () => this.repondre(Number(chip.dataset.choix));
        });
        this.coderEl.querySelector('[data-suivante]').onclick = () => this.questionSuivante();
        this.ajusterEcriture();
    }

    /**
     * L'ÉCRITURE S'ADAPTE À LA PLACE DISPONIBLE — et il faut la MESURER.
     *
     * Rémy, sur la dernière partie de l'organigramme : « il faut que l'écriture
     * s'adapte à la place disponible ».
     *
     * MESURÉ SUR TÉLÉPHONE, ET C'ÉTAIT PIRE QUE « PERFECTIBLE » : la question
     * s'écrivait en 16 pixels au milieu d'une scène de 390 × 492 vide à quatre
     * cinquièmes. Elle est la seule chose à lire de l'écran — la carte est
     * derrière son bouton — et elle occupait un vingtième de la place.
     *
     * POURQUOI LES UNITÉS DE CONTENEUR N'Y SUFFISENT PAS. Tout le reste du jeu
     * se dimensionne en `cqw`, et c'est le bon outil pour un dessin : un
     * quadrilatère occupe une fraction connue de sa boîte. Une PHRASE, non — sa
     * hauteur dépend du nombre de lignes qu'elle prendra, donc de sa longueur ET
     * de la largeur disponible, et aucune règle CSS ne sait cela d'avance.
     * « Que faut-il ajouter à un parallélogramme pour qu'il soit un carré ? »
     * tient sur deux lignes à 24 pixels et sur cinq à 40.
     *
     * On cherche donc la plus grande taille qui TIENNE, par dichotomie, en
     * interrogeant la mise en page à chaque essai. Douze tours suffisent à
     * trancher au demi-pixel, et l'on ne les fait qu'aux moments où l'écran
     * change — une nouvelle question, un changement de taille de fenêtre.
     */
    ajusterEcriture() {
        const el = this.coderEl && this.coderEl.querySelector('[data-question]');
        if (!el || !this.questions) return;
        const boite = this.coderEl;
        if (!boite.clientHeight || !boite.clientWidth) return;
        // La place qui reste : la boîte, moins ce qui l'occupe déjà — le bouton
        // « question suivante » quand il est là. Sans ce retrait, la phrase
        // grandissait jusqu'à pousser le bouton hors de l'écran.
        let pris = 0;
        [...boite.children].forEach(c => {
            if (c === el || c.hidden) return;
            pris += c.getBoundingClientRect().height + 6;
        });
        // ON NE REMPLIT PAS JUSQU'AU BORD. Une phrase qui touche le haut et le
        // bas de la scène se lit moins bien qu'une phrase qui respire, et le
        // dernier dixième ne gagne qu'un ou deux pixels de corps.
        const hauteur = Math.max(36, (boite.clientHeight - pris - 6) * 0.92);
        let bas = TAILLE_MIN, haut = TAILLE_MAX;
        for (let garde = 0; garde < 12 && haut - bas > 0.6; garde++) {
            const essai = (bas + haut) / 2;
            el.style.fontSize = `${essai}px`;
            // ON COMPARE LA LARGEUR À LA SIENNE, PAS À CELLE DE LA BOÎTE.
            //
            // La phrase occupe toute la largeur (`width: 100%`) : son
            // `scrollWidth` vaut donc TOUJOURS la largeur de la boîte, et le
            // comparer à « la boîte moins huit pixels » échouait à chaque essai.
            // Mesuré : la dichotomie retombait sur son plancher de quatorze
            // pixels alors que quarante-six tenaient sans peine — trois cent
            // sept pixels de haut dans une scène de quatre cent soixante-dix.
            // Le seul débordement horizontal possible est un MOT plus large que
            // la ligne, et cela se lit sur l'élément lui-même.
            if (el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= hauteur) bas = essai;
            else haut = essai;
        }
        el.style.fontSize = `${bas.toFixed(1)}px`;
    }

    /**
     * ON RÉPOND, PUIS ON ATTEND — et c'est Rémy qui a vu que la seconde moitié
     * manquait : « et attend entre chaque réponse ».
     *
     * LA CORRECTION S'AFFICHAIT SOUS LA QUESTION SUIVANTE. `repondre` avançait
     * le compteur, redessinait l'écran, PUIS posait la note : « ✅ C'est la
     * flèche qui mène du parallélogramme au rectangle » se lisait donc sous
     * « Est-ce que tout losange est un carré ? ». Au mieux on ne la lisait pas,
     * au pire elle répondait à la mauvaise question — et l'explication est
     * précisément ce qu'on vient chercher dans cette partie-là.
     *
     * ON RESTE DONC SUR LA QUESTION : les jetons se figent, le bon s'entoure de
     * vert, celui qu'on a touché à tort se barre de rouge, l'explication
     * s'écrit dessous, et l'on continue quand on veut. Le rythme appartient à
     * celui qui lit, pas à un minuteur : une explication à quatre lignes ne se
     * lit pas dans le même temps qu'un « Oui ».
     */
    repondre(i) {
        // `attente` : on a répondu et l'on n'a pas encore tourné la page. Sans
        // cette garde, un second clic sur un jeton compterait une réponse de
        // plus à la même question.
        if (this.isDemo || this.fini || this.attente) return;
        const q = this.org.questions[this.iQuestion];
        const choix = q.choix[i];
        if (!choix) return;
        const juste = q.bonnes.includes(choix.valeur);
        if (juste) {
            this.justes += 1;
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: q.texte, expected: choix.dit, given: choix.dit,
                points: 6, partiel: true
            });
        } else {
            this.onWrongAnswer(null, {
                concept: COMPETENCE, questionText: q.texte,
                input: choix.dit, expected: q.bonnes.join(' / '),
                partiel: true, silencieux: true
            });
        }
        this.attente = true;
        // CE QU'ON MONTRE SUR LES JETONS. « Il y a deux réponses justes » se dit
        // dans l'explication ; on entoure donc TOUTES les bonnes, pas seulement
        // celle qu'on attendait — sinon la phrase et l'écran se contredisent.
        this.cartesEl.querySelectorAll('[data-choix]').forEach(chip => {
            const k = Number(chip.dataset.choix);
            chip.classList.add('kk-chip--figee');
            if (q.bonnes.includes(q.choix[k].valeur)) chip.classList.add('qd-choix--bon');
            else if (k === i) chip.classList.add('qd-choix--rate');
        });
        // L'EXPLICATION VA SOUS LA QUESTION, PAS DANS LA LIGNE DU BAS.
        //
        // Deux raisons, et la seconde est un défaut. D'abord la lecture : ici
        // l'explication EST le contenu — on vient chercher « pourquoi », pas un
        // score —, et la mettre au pied de l'écran, sous les boutons, la met à
        // l'endroit où l'œil ne va plus. Ensuite : couché — écran bas et large,
        // c'est-à-dire un téléphone tourné ou un petit portable — la ligne du
        // bas est en « display: none » (voir la requête de conteneur), et la
        // correction ne s'affichait alors NULLE PART.
        const derniere = this.iQuestion >= this.org.questions.length - 1;
        const suite = this.coderEl.querySelector('[data-suite]');
        const bouton = this.coderEl.querySelector('[data-suivante]');
        const pourquoi = this.coderEl.querySelector('[data-pourquoi]');
        if (suite && bouton) {
            if (pourquoi) {
                pourquoi.textContent = `${juste ? '✅' : '❌'} ${q.pourquoi}`;
                pourquoi.className = `qd-pourquoi qd-pourquoi--${juste ? 'ok' : 'ko'}`;
            }
            bouton.textContent = derniere ? 'Voir le bilan' : 'Question suivante ▶';
            suite.hidden = false;
            this.direOuEnEstLaSerie();
            // La phrase reprend la place que le bouton vient de prendre.
            this.ajusterEcriture();
            bouton.focus({ preventScroll: true });
        } else {
            // Sans bouton — cas qui ne devrait pas arriver — on ne coince pas
            // l'élève sur une question à laquelle il a répondu.
            this.note(`${juste ? '✅' : '❌'} ${q.pourquoi}`, juste ? 'ok' : 'ko');
            this.questionSuivante();
        }
    }

    /**
     * OÙ EN EST LA SÉRIE — et il faut la redire APRÈS chaque réponse.
     *
     * On reste maintenant sur la question le temps de lire l'explication : le
     * compte de bonnes réponses, écrit au moment où la question s'est affichée,
     * restait donc en retard d'un cran — « 0 juste pour l'instant » à côté d'un
     * « ✅ » tout frais.
     */
    direOuEnEstLaSerie() {
        this.consigneEl.innerHTML = `Question ${this.iQuestion + 1} sur `
            + `${this.org.questions.length} — <b>${this.justes} juste`
            + `${this.justes > 1 ? 's' : ''}</b> pour l'instant. Tu peux rappeler `
            + 'l\'organigramme à tout moment : il est fait pour être consulté.';
    }

    /** La page se tourne : c'est le seul chemin qui fait avancer la série. */
    questionSuivante() {
        if (!this.questions || this.fini) return;
        this.attente = false;
        this.iQuestion += 1;
        if (this.iQuestion >= this.org.questions.length) return this.gagner();
        this.dessiner();
        this.note('');
    }

    /**
     * LA CARTE, RAPPELÉE — l'organigramme entier dans une fenêtre.
     *
     * C'est le plan complet, figures nommées et conditions écrites : celui de la
     * fiche de Rémy. On le dessine dans une fenêtre plutôt qu'à côté de la
     * question pour que le geste reste volontaire — « je vais voir » — et parce
     * qu'à côté, sur un téléphone, il ne resterait de place ni pour l'un ni pour
     * l'autre.
     */
    async montrerLaCarte() {
        if (this.isDemo) return;
        const v = fenetrePleine();
        const traits = FLECHES.map(f => {
            const t = traitsDeCondition(f);
            return `<path class="qd-lien" fill="none" vector-effect="non-scaling-stroke"
                    d="${traitEnChemin(t.entrant, v)}"/>
                <path class="qd-lien" fill="none" vector-effect="non-scaling-stroke"
                    d="${traitEnChemin(t.sortant, v)}"/>`;
        }).join('');
        let dedans = `<svg class="qd-fils" viewBox="0 0 100 100"
            preserveAspectRatio="none">${traits}</svg>`;
        dedans += pointesHtml(FLECHES.flatMap(f => {
            const t = traitsDeCondition(f);
            return [t.entrant, t.sortant];
        }), v);
        for (const fam of FAMILLES) {
            const b = placerBoite(boiteFigure(fam.id), v);
            dedans += `<div class="qd-case" style="left:${b.gauche}%; top:${b.haut}%;
                width:${b.large}%; height:${b.haute}%">
                ${this.figureCodeeSvg(fam.id)}
                <div class="qd-nom">${fam.nom}</div></div>`;
        }
        for (const f of FLECHES) {
            const b = placerBoite(boiteCondition(f), v);
            const p = policeCondition(f.court);
            dedans += `<div class="qd-cond qd-cond--${f.famille}"
                style="left:${b.gauche}%; top:${b.haut}%; width:${b.large}%; height:${b.haute}%;
                    font-size:clamp(4px, ${p.cqw}cqw, 14px)" title="${enAttribut(f.ajoute)}"
                ><span class="qd-cond-t">${p.lignes.map(enAttribut).join('<br>')}</span></div>`;
        }
        const { showModal } = await import('../ui/modal.js');
        const m = showModal('L\'organigramme', `
            <div class="qd-carte-fenetre" style="--zoom:${v.zoom.toFixed(3)};
                aspect-ratio:${v.rapport.toFixed(3)}">${dedans}</div>
            <div style="text-align:center; margin-top:12px">
                <button type="button" class="qd-btn qd-modale-ok"
                    style="background:var(--primary); border-color:var(--primary); color:#fff;
                        padding:9px 18px; font-size:.9rem">Je retourne à la question</button>
            </div>`, { width: '860px', zIndex: ETAGE_MODALE });
        const ok = m.element.querySelector('.qd-modale-ok');
        if (ok) ok.onclick = () => m.close();
    }

    /**
     * L'ORGANIGRAMME VIDE, À REMONTER EN ENTIER — la deuxième question.
     *
     * Rémy : « l'organigramme vide où il faut juste placer les figures codées
     * dans un premier temps […]. Et dans un second temps, on glisse les
     * vignettes pour relier les figures. »
     *
     * DEUX TEMPS, ET LE SECOND DÉPEND DU PREMIER : les conditions attendues sur
     * une flèche se calculent sur la figure que l'élève a POSÉE dans la case, pas
     * sur celle qui « devrait » y être. C'est ce qui permet d'accepter le losange
     * à gauche — « on se fiche que le rectangle soit à gauche ou à droite » — sans
     * refuser ensuite ses bonnes réponses.
     */
    dessinerAssemblage() {
        this.coderEl.hidden = true;
        this.planEl.hidden = false;
        this.verifierEl.hidden = true;
        this.carteEl.hidden = true;
        this.carnetEl.hidden = true;
        this.etapeEl.hidden = false;

        const v = fenetrePleine();
        this.cadrer(v);
        const vignettes = this.phaseVignettes;
        const posees = Object.keys(this.placement).length;

        this.consigneEl.innerHTML = vignettes
            ? 'Relie les figures : glisse sur chaque flèche la condition qui fait passer '
                + 'de la figure du dessus à celle du dessous. <b>Une vignette sert plusieurs fois.</b>'
            : 'Pose chaque figure à sa place dans l\'organigramme. <b>Elles n\'ont plus '
                + 'leur nom</b> : c\'est leur codage qui les dit.';
        this.etapeEl.innerHTML = `<div class="qd-etape-titre">${vignettes
            ? `Les cinq figures sont posées. Il reste <b>${FLECHES.length
                - Object.keys(this.liens).length}</b> flèches à garnir.`
            : `<b>${posees}</b> figure${posees > 1 ? 's' : ''} posée${posees > 1 ? 's' : ''} `
                + `sur ${FAMILLES.length}. On descend du plus général au plus particulier.`}</div>`;

        // LES TRAITS, TOUJOURS TOUS : c'est la carte qu'on reconstruit, et une
        // flèche qui n'apparaîtrait qu'une fois garnie cacherait la question.
        const traits = FLECHES.map(f => {
            const t = traitsDeCondition(f);
            const fait = this.liens[cleFleche(f)] !== undefined;
            const cls = `qd-lien${fait ? ' qd-lien--fait' : ''}`;
            return `<path class="${cls}" fill="none" vector-effect="non-scaling-stroke"
                    d="${traitEnChemin(t.entrant, v)}"/>
                <path class="${cls}" fill="none" vector-effect="non-scaling-stroke"
                    d="${traitEnChemin(t.sortant, v)}"/>`;
        }).join('');
        let html = `<svg class="qd-fils" viewBox="0 0 100 100"
            preserveAspectRatio="none">${traits}</svg>`;
        html += pointesHtml(FLECHES.flatMap(f => {
            const t = traitsDeCondition(f);
            return [t.entrant, t.sortant];
        }), v);

        for (const fam of FAMILLES) {
            const b = placerBoite(boiteFigure(fam.id), v);
            const pose = this.placement[fam.id];
            const style = `left:${b.gauche}%; top:${b.haut}%; width:${b.large}%; height:${b.haute}%`;
            html += `<div class="qd-case ${pose ? 'qd-case--juste' : 'qd-case--trou'}"
                style="${style}" data-case="${fam.id}"
                ${pose || vignettes ? '' : 'data-depose="1"'}>
                ${pose ? this.figureCodeeSvg(pose) : '<div class="qd-vide-fig">?</div>'}
                <div class="qd-nom${pose ? '' : ' qd-nom--vide'}">${pose ? familleDe(pose).nom : '…'}</div>
            </div>`;
        }

        for (const f of FLECHES) {
            const cle = cleFleche(f);
            const b = placerBoite(boiteCondition(f), v);
            const texte = this.liens[cle];
            const style = `left:${b.gauche}%; top:${b.haut}%; `
                + `width:${b.large}%; height:${b.haute}%`;
            if (texte !== undefined) {
                const pol = policeCondition(texte);
                html += `<div class="qd-cond qd-cond--${f.famille} qd-cond--posee"
                    style="${style}; font-size:clamp(5px, ${pol.cqw}cqw, 15px)"
                    data-donnee="${enAttribut(texte)}" title="${enAttribut(texte)}"
                    ><span class="qd-cond-t">${pol.lignes.map(enAttribut).join('<br>')}</span></div>`;
            } else {
                html += `<div class="qd-cond qd-cond--vide" style="${style}"
                    data-fente="${enAttribut(cle)}"
                    ${vignettes ? 'data-depose="1"' : ''}>?</div>`;
            }
        }

        this.mondeEl.innerHTML = html;
        this.ajusterCartes();
        this.mondeEl.querySelectorAll('[data-donnee]').forEach(el => {
            el.onclick = () => this.note(el.dataset.donnee);
        });

        // LA PALETTE CHANGE DE NATURE ENTRE LES DEUX TEMPS : des figures, puis
        // des mots. Les vignettes ne s'épuisent pas — voir `genererAssemblage`.
        this.cartesEl.className = 'qd-cartes';
        this.cartesEl.innerHTML = vignettes
            ? this.org.vignettes.map(t =>
                `<div class="kk-chip" data-vignette="${enAttribut(t)}"
                    title="${enAttribut(t)}">${enAttribut(vignetteDe(t))}</div>`).join('')
            : this.org.figures.filter(id => !Object.values(this.placement).includes(id))
                .map(id => `<div class="kk-chip qd-chip-fig" data-figure="${id}"
                    title="Une figure à placer">${this.figureCodeeSvg(id)}</div>`).join('');
        this.brancherGlisser();
        this.cartesEl.querySelectorAll('[data-figure], [data-vignette]').forEach(chip => {
            chip.onclick = () => this.viser(chip);
        });
    }

    /**
     * UN SIMPLE APPUI SUFFIT, ici comme dans l'étape par étape : on tape la
     * carte, puis la case. Le glisser reste le geste principal ; le tapotement
     * sauve celui qui a raté sa cible trois fois de suite — et il est le seul
     * geste possible au clavier.
     */
    viser(chip) {
        if (this.isDemo || this.fini) return;
        const deja = this.cartesEl.querySelector('.kk-chip--visee');
        if (deja) deja.classList.remove('kk-chip--visee');
        if (deja === chip) { this.visee = null; return; }
        chip.classList.add('kk-chip--visee');
        this.visee = chip;
        this.note('Touche maintenant la case où tu veux la poser.');
    }

    /** Une figure posée dans une case : c'est le RANG qui juge, pas le côté. */
    deposerFigure(caseId, figureId) {
        if (this.isDemo || this.fini || this.placement[caseId]) return;
        const attendu = casesDuRang(figureId);
        if (!attendu.includes(caseId)) {
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: `Organigramme — placer ${familleDe(figureId).nom}`,
                input: familleDe(caseId).nom, expected: attendu.map(x => familleDe(x).nom).join(' ou '),
                partiel: true, silencieux: true
            });
            return this.rater(refusPlacement(caseId, figureId));
        }
        this.placement[caseId] = figureId;
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Organigramme — placer ${familleDe(figureId).nom}`,
            expected: familleDe(figureId).nom, given: familleDe(figureId).nom,
            points: 5, partiel: true
        });
        this.visee = null;
        this.dessiner();
        this.note(this.phaseVignettes
            ? 'Les cinq figures sont en place. Maintenant, relie-les : chaque flèche '
                + 'porte la condition qu\'on AJOUTE en descendant d\'un cran.'
            : `${familleDe(figureId).nom} est à sa place.`, 'ok');
    }

    /** Une vignette posée sur une flèche. Elle ne s'épuise jamais. */
    deposerVignette(cle, texte) {
        if (this.isDemo || this.fini || this.liens[cle] !== undefined) return;
        const f = flecheDe(cle);
        if (!f) return;
        const bonnes = conditionsDeCases(this.placement, f.de, f.vers).map(x => x.ajoute);
        const dejaPosees = FLECHES
            .filter(x => x.de === f.de && x.vers === f.vers && this.liens[cleFleche(x)] !== undefined)
            .map(x => this.liens[cleFleche(x)]);
        const A = figureDansCase(this.placement, f.de);
        const B = figureDansCase(this.placement, f.vers);
        if (!bonnes.includes(texte)) {
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: `Organigramme — ${familleDe(A).nom} → ${familleDe(B).nom}`,
                input: texte, expected: bonnes.join(' / '), partiel: true, silencieux: true
            });
            return this.montrerContreExemple({ de: A, vers: B }, texte,
                refusEtape({ de: A, vers: B }, texte)).then(() => this.rater(''));
        }
        if (dejaPosees.includes(texte)) {
            return this.note('Cette condition est déjà posée sur ce chemin. Il en faut une AUTRE : '
                + 'la même case s\'atteint de plusieurs façons, et ce sont ces façons-là qu\'on '
                + 'cherche.', 'ko');
        }
        this.liens[cle] = texte;
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Organigramme — ${familleDe(A).nom} → ${familleDe(B).nom}`,
            expected: texte, given: texte, points: 6, partiel: true
        });
        this.visee = null;
        this.dessiner();
        if (Object.keys(this.liens).length >= FLECHES.length) return this.gagner();
        this.note(memeTexteDit(texte), 'ok');
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
        this.coderEl.hidden = true;
        this.planEl.hidden = false;
        this.verifierEl.hidden = true;
        this.carteEl.hidden = true;
        this.consigneEl.textContent =
            'Glisse chaque nom dans sa case. On descend en ajoutant une condition à la '
            + 'fois : plus on descend, plus la figure est particulière.';

        const v = fenetrePleine();
        this.cadrer(v);

        const traits = FLECHES.map(f => {
            const t = traitsDeCondition(f);
            return `<path class="qd-lien" fill="none" vector-effect="non-scaling-stroke"
                    d="${traitEnChemin(t.entrant, v)}"/>
                <path class="qd-lien" fill="none" vector-effect="non-scaling-stroke"
                    d="${traitEnChemin(t.sortant, v)}"/>`;
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

        this.mondeEl.innerHTML = html;
        this.ajusterCartes();

        const restantes = org.cartes.filter(c => !Object.values(this.poses).some(p => p.id === c.id));
        this.cartesEl.className = 'qd-cartes';
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
        // LE NOM DE LA FIGURE SE RÉDUIT AUSSI. Vu dans la reconstruction, où
        // l'organigramme entier tient à l'écran : les cases y sont deux fois
        // plus petites qu'à l'étape par étape, et « Parallélogramme » s'y
        // rognait des deux côtés — « rallélogramm ». Le nom d'une figure coupé
        // est pire qu'un nom écrit petit.
        this.mondeEl.querySelectorAll('.qd-nom').forEach(el => {
            let taille = parseFloat(getComputedStyle(el).fontSize) || 12;
            for (let i = 0; i < 14 && el.scrollWidth > el.clientWidth + 1 && taille > 5; i++) {
                taille = Math.max(5, taille - Math.max(0.4, taille * 0.08));
                el.style.fontSize = `${taille}px`;
            }
        });
        this.mondeEl.querySelectorAll('.qd-cond').forEach(el => {
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

    /**
     * LA FENÊTRE ET LE MONDE.
     *
     * `fen` est le cadre — sa taille donne l'échelle, sa position donne ce qu'on
     * voit. `monde` est ce qui glisse dedans : le plan entier en mode progressif,
     * la fenêtre elle-même dans le mode « placer les noms », qui montre tout.
     */
    /**
     * La largeur de fenêtre qui remplit la scène — mesurée, pas devinée. La
     * scène est large et basse sur un ordinateur, haute et étroite sur un
     * téléphone, et une fenêtre écrite en dur gaspillerait la place sur l'un
     * des deux. Voir FEN_MIN.
     */
    largeurFenetre() {
        const sc = this.container.querySelector('.qd-scene');
        const r = sc && sc.getBoundingClientRect();
        if (!r || !r.height) return MONDE.w;
        return (r.width / r.height) * FEN_H;
    }

    cadrer(fen, monde = fen) {
        // LE GLISSEMENT DURE CE QUE LE CHEMIN MÉRITE.
        //
        // Rémy, deux fois : « la présentation pour l'organigramme est hyper
        // rapide » — réglé par un bouton « Suivant » —, puis « ça va un peu
        // vite encore, le scroll de l'organigramme ». C'est un autre défaut :
        // le premier était le RYTHME des temps, celui-ci est la VITESSE de la
        // caméra. Une transition unique de 0,65 s traitait pareillement un
        // petit décalage d'une case et une traversée du plan entier en
        // dézoomant — et cette dernière filait sous les yeux.
        //
        // On mesure donc le chemin : de combien le centre se déplace (rapporté
        // à la diagonale du monde) et de combien le grossissement change. Le
        // plus grand des deux commande, entre 0,75 s pour un pas de côté et
        // 1,9 s pour la traversée. Rien d'inventé : c'est le même geste qu'une
        // caméra qui accompagne, et il se termine en douceur (la courbe
        // décélère fort) parce que ce qui compte est l'arrivée.
        this.mondeEl.style.transitionDuration = this.dureeDuGlissement(fen, monde);
        this.derniereFenetre = { ...fen };
        this.planEl.style.setProperty('--zoom', fen.zoom.toFixed(3));
        this.planEl.style.aspectRatio = fen.rapport.toFixed(4);
        this.planEl.style.width = `min(100%, ${(fen.rapport * 100).toFixed(2)}cqh)`;
        const m = this.mondeEl;
        m.style.width = `${(monde.w / fen.w * 100).toFixed(3)}%`;
        m.style.height = `${(monde.h / fen.h * 100).toFixed(3)}%`;
        // Le pourcentage d'un `translate` se compte sur l'élément lui-même :
        // décaler d'un centième du MONDE, c'est bien avancer d'une unité de plan.
        m.style.transform = `translate(${(-(fen.x0 - monde.x0) / monde.w * 100).toFixed(3)}%,`
            + ` ${(-(fen.y0 - monde.y0) / monde.h * 100).toFixed(3)}%)`;
    }

    /** Combien de temps pour aller de la fenêtre précédente à celle-ci. */
    dureeDuGlissement(fen, monde) {
        // Le réglage système passe avant tout : qui demande moins d'animation
        // n'en veut pas davantage parce qu'elle est jolie.
        const vue = this.container && this.container.ownerDocument.defaultView;
        if (vue && vue.matchMedia && vue.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return '0s';
        }
        const av = this.derniereFenetre;
        // Le tout premier cadrage ne glisse de nulle part : il se pose.
        if (!av) return '0s';
        const diag = Math.hypot(monde.w || 1, monde.h || 1);
        const dep = Math.hypot(
            (fen.x0 + fen.w / 2) - (av.x0 + av.w / 2),
            (fen.y0 + fen.h / 2) - (av.y0 + av.h / 2)
        ) / (diag || 1);
        // Un facteur de grossissement se compare en RAPPORT, pas en écart :
        // passer de ×1 à ×2 et de ×2 à ×4 est le même mouvement pour l'œil.
        const rapport = (fen.zoom || 1) / (av.zoom || 1);
        const gross = Math.abs(Math.log(rapport || 1)) / Math.log(3);
        const part = Math.max(0, Math.min(1, Math.max(dep, gross)));
        return `${(DUREE_GLISSE_MIN + (DUREE_GLISSE_MAX - DUREE_GLISSE_MIN) * part).toFixed(2)}s`;
    }

    /**
     * LE CONTOUR DU QUADRILATÈRE. En pointillé tant que la case est vide — pour
     * qu'on puisse RAISONNER sur la figure au lieu de deviner un mot —, et
     * tracé d'un trait quand le nom vient d'être posé.
     */
    figureSvg(fam, montre, anime) {
        // LA FIGURE CODÉE RESTE DANS SA CASE. Rémy : « une fois fait, dans
        // l'organigramme, on a le parallélogramme avec le codage, et là
        // seulement on met les vignettes. » C'est ce qui donne son sens à
        // l'ordre : l'élève choisit ses vignettes en regardant les marques
        // qu'il vient de poser lui-même, pas de mémoire.
        const code = this.codages && this.codages[fam.id];
        if (code && montre) {
            return codageSvg(code.fig, {
                segments: code.ids, points: code.pts, pose: code.pose,
                interactif: false, nomsSommets: false
            }).replace('class="cg-svg"', 'class="cg-svg qd-figure qd-figure--codee"');
        }
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
            deposer: (cible, chip) => {
                if (this.assemblage) {
                    if (chip.dataset.figure) return this.deposerFigure(cible.dataset.case, chip.dataset.figure);
                    if (chip.dataset.vignette) return this.deposerVignette(cible.dataset.fente, chip.dataset.vignette);
                    return undefined;
                }
                return this.progressif
                    ? this.deposerEtape(chip.dataset.carte)
                    : this.deposer(cible.dataset.case, chip.dataset.carte);
            }
        });
        // LE TAPOTEMENT : on touche la carte, puis la case. C'est le seul geste
        // possible au doigt sur un écran étroit, où la palette et la case ne
        // tiennent pas ensemble à l'écran — et le seul possible au clavier.
        if (this.assemblage) {
            this.mondeEl.querySelectorAll('[data-depose="1"]').forEach(cible => {
                cible.onclick = () => {
                    if (!this.visee) return;
                    const chip = this.visee;
                    if (chip.dataset.figure) this.deposerFigure(cible.dataset.case, chip.dataset.figure);
                    else if (chip.dataset.vignette) this.deposerVignette(cible.dataset.fente, chip.dataset.vignette);
                };
            });
        }
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
        if (!e || e.genre !== 'condition') return;
        const carte = e.cartes.find(c => c.id === carteId);
        if (!carte || this.posesEtape.includes(carteId)) return;

        const v = verifierEtape(e, carte);
        if (!v.ok) {
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: `Organigramme — ${familleDe(e.de).nom} → ${familleDe(e.vers).nom}`,
                input: carte.texte, expected: e.bonnes.join(' / '),
                partiel: true, silencieux: true
            });
            // LA FIGURE AVANT LA RÈGLE : on montre pourquoi, puis on repart.
            this.montrerContreExemple(e, carte.texte, v.raison).then(() => this.rater(''));
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
        this.avancer(v.texteJuste || '');
    }

    /** L'étape suivante, qu'elle demande des vignettes ou un codage. */
    avancer(dit) {
        this.etape += 1;
        this.posesEtape = [];
        this.dessiner();
        if (this.etape >= this.org.etapes.length) return this.gagner();
        this.note(`${dit} ${this.annonce(this.etapeCourante)}`, 'ok');
    }

    annonce(e) {
        if (!e) return '';
        return e.genre === 'codage'
            ? `À toi de coder le ${familleDe(e.figure).nom.toLowerCase()}.`
            : `On passe à la suite : ${familleDe(e.de).nom} → ${familleDe(e.vers).nom}.`;
    }

    /**
     * ON REPART DU DÉBUT.
     *
     * Rémy : « Si l'élève se trompe, on recommence. […] si l'élève se trompe, il
     * recommence depuis le début. »
     *
     * C'est une règle dure, et c'est la sienne : l'organigramme n'est pas une
     * suite d'exercices indépendants, c'est UNE chaîne — chaque case ne veut
     * rien dire sans celles d'au-dessus. La refaire en entier, c'est la relire
     * en entier, et c'est ainsi qu'on la retient. On dit donc d'abord POURQUOI
     * c'est faux — la phrase du refus enseigne —, puis on repart du haut, avec
     * le même organigramme : ce sont les mêmes cartes, dans le même ordre.
     *
     * Le professeur peut adoucir la règle (réglage « Quand on se trompe ») : on
     * refait alors la seule étape ratée.
     */
    /**
     * LE CONTRE-EXEMPLE, AVANT DE REPARTIR.
     *
     * Rémy : « si l'élève se trompe, il faudrait lui montrer un contre-exemple
     * et lui dire qu'il va recommencer. »
     *
     * Une phrase de refus explique ; une FIGURE démontre. « Regarde ce losange :
     * il a bien ses diagonales perpendiculaires, et ce n'est pourtant pas un
     * rectangle » — avec le losange dessiné et codé à côté, il n'y a plus rien à
     * croire sur parole. Le contre-exemple se calcule à partir de
     * l'organigramme lui-même (voir `contreExemple`), il n'est pas écrit à la
     * main : il ne peut donc pas mentir.
     *
     * ET L'ON PRÉVIENT AVANT DE RECOMMENCER. Repartir du haut sans un mot se
     * lit comme une panne ; annoncé, c'est une règle du jeu.
     */
    async montrerContreExemple(e, texte, raison) {
        const c = contreExemple(e.de, e.vers, texte);
        const { showModal } = await import('../ui/modal.js');
        let dessin = '';
        if (c.figure) {
            const fig = construireFigure(c.figure, DIMS_CODAGE[c.figure], 0);
            const ids = segmentsDe(true), pts = pointsAngleDe(true);
            const pose = { marques: {}, angles: {} };
            classesDeLongueur(fig, ids).forEach((classe, i) =>
                classe.forEach(id => { pose.marques[id] = i + 1; }));
            anglesDroitsDe(fig, pts).forEach(p => { pose.angles[p] = true; });
            dessin = `<div style="max-width:260px; margin:0 auto 12px">${codageSvg(fig,
                { segments: ids, points: pts, pose, interactif: false, nomsSommets: false })}</div>`;
        }
        return new Promise(resolve => {
            const titres = {
                contre: 'Un contre-exemple',
                'trop-fort': 'Trop fort pour ici',
                ailleurs: 'Pas au bon départ'
            };
            const m = showModal(titres[c.genre] || 'Regarde bien', `
                <div style="text-align:center; line-height:1.5">
                    <p style="margin:0 0 12px">${enAttribut(raison)}</p>
                    ${dessin}
                    <p style="margin:0 0 16px"><b>${enAttribut(c.dit)}</b></p>
                    <p style="margin:0 0 16px; color:var(--text-muted); font-size:.9rem">
                        ${this.reprise === 'etape'
                    ? 'On refait cette étape.'
                    : 'L\'organigramme est une chaîne : chaque case se lit sur celles du '
                          + 'dessus. <b>On repart donc du début</b>, et on le relit en entier.'}</p>
                    <button type="button" class="qd-btn qd-modale-ok"
                        style="background:var(--primary); border-color:var(--primary); color:#fff;
                            padding:9px 18px; font-size:.9rem">${this.reprise === 'etape'
                    ? 'Je refais l\'étape' : 'Je repars du début'}</button>
                </div>`, { width: '440px', onClose: resolve, zIndex: ETAGE_MODALE });
            const ok = m.element.querySelector('.qd-modale-ok');
            if (ok) ok.onclick = () => m.close();
        });
    }

    rater(pourquoi) {
        this.annoncee = null;
        if (this.assemblage) {
            // ON NE REPART PAS DE ZÉRO ICI, et c'est une autre leçon que
            // l'étape par étape : la reconstruction n'est pas une chaîne, c'est
            // une CARTE. Une figure mal placée ne compromet pas les autres ; on
            // rend la carte à la palette et l'on continue.
            this.visee = null;
            this.dessiner();
            return this.note(`${pourquoi} Reprends cette carte-là.`, 'ko');
        }
        if (this.reprise === 'etape') {
            this.posesEtape = [];
            this.trouvees[this.etapeCourante && this.etapeCourante.rang] = [];
            if (this.codage) this.codage.pose = { marques: {}, angles: {} };
            this.dessiner();
            return this.note(`${pourquoi} On refait cette étape.`, 'ko');
        }
        this.etape = 0;
        this.posesEtape = [];
        this.trouvees = {};
        this.codage = null;
        this.codages = {};
        this.vues = [];
        this.dessiner();
        this.note([pourquoi, '<b>On repart du début.</b> L\'organigramme est une chaîne : '
            + 'chaque case se lit sur celles du dessus, et on la relit en entier.']
            .filter(Boolean).join(' '), 'ko');
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
        // LA SÉRIE DE QUESTIONS NE SE FÉLICITE PAS DE LA MÊME CHOSE : elle n'a
        // rien construit, elle a interrogé. Lui servir « l'organigramme est
        // complet » était faux, et le compte de conditions qu'elle n'a pas
        // posées levait une exception — vu au pilote, pas à l'œil.
        if (this.questions) {
            const n = this.org.questions.length;
            this.note(`✅ ${this.justes} bonne${this.justes > 1 ? 's' : ''} réponse`
                + `${this.justes > 1 ? 's' : ''} sur ${n}. Retiens la forme de la carte : `
                + 'on arrive au carré PAR DEUX CHEMINS, et chacun ajoute ce que l\'autre '
                + 'avait déjà.', 'ok');
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: `Organigramme — série de questions (${this.org.palier})`,
                expected: `${n} questions`, given: `${this.justes} justes`,
                points: 6 + this.justes * 3
            });
            setTimeout(() => { if (this.isRunning) this.showNext(); }, 3500);
            return;
        }
        this.note('✅ L\'organigramme est complet. Retiens la forme : on arrive au carré '
            + 'PAR DEUX CHEMINS, et chacun ajoute ce que l\'autre avait déjà.', 'ok');
        const combien = this.assemblage
            ? FAMILLES.length + FLECHES.length
            : (this.progressif
                ? this.org.etapes.reduce((n, x) => n + (x.bonnes || []).length, 0)
                : this.org.trous.length);
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Organigramme des quadrilatères — ${this.org.palier}`,
            expected: `${combien} conditions`, given: `${combien} conditions`,
            points: 10 + combien * 3
        });
        setTimeout(() => { if (this.isRunning) this.showNext(); }, 3500);
    }

    aider() {
        if (this.isDemo || !this.org) return;
        if (this.questions) {
            return this.note('Va voir la carte : c\'est à cela qu\'elle sert. Un organigramme '
                + 'ne s\'apprend pas par cœur, il se CONSULTE — et à force de le consulter, '
                + 'on finit par le savoir.');
        }
        if (this.assemblage) return this.aiderAssemblage();
        const e = this.etapeCourante;
        // CODER : l'aide dit la propriété, pas les marques. « Les côtés opposés
        // ont la même longueur » se traduit tout seul en deux paires de traits ;
        // dire « mets un trait sur AB » ne s'apprend pas.
        if (e && e.genre === 'codage') {
            return this.note(`Rappelle-toi ce qu'est un ${familleDe(e.figure).nom.toLowerCase()} : `
                + `${(PROPRIETES[e.figure] || []).slice(0, 2).join(', et ')}. `
                + 'Chaque égalité de longueur veut sa marque, chaque angle droit son petit carré.');
        }
        if (e) return this.note(conseilEtape(e, this.posesEtape.length));
        // L'organigramme progressif terminé n'a plus d'étape en cours, et
        // `conseil` interroge des trous qui n'existent que dans l'autre mode.
        if (this.progressif) {
            return this.note('Tout est trouvé. Relis la figure de gauche à droite : chaque '
                + 'flèche ajoute UNE condition, et l\'on arrive au carré par deux chemins.');
        }
        this.note(conseil(this.org, this.poses));
    }

    /** L'aide de la reconstruction : elle donne la MÉTHODE, jamais la case. */
    aiderAssemblage() {
        if (!this.phaseVignettes) {
            const reste = FAMILLES.filter(f => !this.placement[f.id]);
            return this.note('Commence par les deux extrêmes : la figure qui n\'a AUCUNE marque '
                + 'va tout en haut — c\'est le quadrilatère quelconque, celui qui n\'a rien de '
                + 'particulier —, et celle qui en a le plus va tout en bas. '
                + `Il t'en reste ${reste.length} à placer.`);
        }
        const vide = FLECHES.find(f => this.liens[cleFleche(f)] === undefined);
        if (!vide) return this.note('Tout est relié : relis chaque flèche de haut en bas.');
        const A = familleDe(figureDansCase(this.placement, vide.de)).nom.toLowerCase();
        const B = familleDe(figureDansCase(this.placement, vide.vers)).nom.toLowerCase();
        return this.note(`Regarde une flèche vide et demande-toi ce qu'un ${B} a de plus qu'un `
            + `${A}. Une réponse se dit toujours d'une de ces trois façons : par les CÔTÉS, `
            + 'par les ANGLES, ou par les DIAGONALES.');
    }

    montrerSolution() {
        if (!this.org) return false;
        if (this.questions) {
            const q = this.org.questions[this.iQuestion];
            this.note(q ? `Réponse : ${q.bonnes.join(' / ')} (outil d'auteur).` : 'Série finie.');
            return true;
        }
        if (this.assemblage) {
            FAMILLES.forEach(f => { this.placement[f.id] = f.id; });
            FLECHES.forEach(f => { this.liens[cleFleche(f)] = f.ajoute; });
            this.fini = true;
            this.dessiner();
            this.note('Solution affichée (outil d\'auteur).');
            return true;
        }
        if (this.progressif) {
            this.org.etapes.forEach(x => {
                if (x.bonnes) this.trouvees[x.rang] = x.bonnes.slice();
            });
            this.etape = this.org.etapes.length;
            this.posesEtape = [];
            this.codage = null;
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
            // LE CODAGE D'ABORD, PUISQUE C'EST LA PREMIÈRE ÉTAPE — et le robot
            // restait bloqué dessus. Depuis que l'on code avant de nommer,
            // `etapeCourante` est une étape de CODAGE au départ : elle n'a pas
            // de `bonnes`, la boucle ci-dessous ne tournait pas, et la
            // démonstration s'arrêtait sur sa première phrase. On dit ce qu'on
            // y fait, on le fait, et l'on passe aux vignettes — qui sont ce
            // qu'il y a de particulier dans cet exercice.
            if (this.etapeCourante && this.etapeCourante.genre === 'codage') {
                const nom = familleDe(this.etapeCourante.figure).nom.toLowerCase();
                if (!await gate.waitTurn() || !this.isRunning) return fin();
                cur.say(`On commence par CODER la figure : je marque d'un même trait les `
                    + `segments de même longueur, et d'un petit carré les angles droits. `
                    + `Coder un ${nom}, c'est déjà dire ce qu'il est.`, this.coderEl);
                if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
                this.sauterEtape();
            }
            // LA DÉMONSTRATION MONTRE LA PREMIÈRE ÉTAPE EN ENTIER, et pas deux
            // cartes prises au hasard : c'est le fait qu'il y ait PLUSIEURS
            // façons d'être un parallélogramme qui surprend, et il faut les voir
            // arriver toutes les trois pour le comprendre.
            const e = this.etapeCourante;
            if (!e || !e.bonnes) return fin();
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

        // LES DEUX NOUVELLES PARTIES N'ONT PAS DE « TROUS » À MONTRER, et le
        // robot s'y cassait : la reconstruction pose des figures, la série pose
        // des questions. Il a déjà dit l'essentiel — la forme de la carte —,
        // c'est assez pour un aperçu.
        if (!this.org.trous) return fin();
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
        // L'observateur de taille se débranche : laissé en place, il continue de
        // rappeler un ajustement sur un élément détaché à chaque changement de
        // fenêtre, jusqu'au rechargement de la page.
        if (this.veilleScene) { this.veilleScene.disconnect(); this.veilleScene = null; }
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
