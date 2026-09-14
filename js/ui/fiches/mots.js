// LES MOTS — anagrammes, grilles croisées, codes.
//
// Une tranche de `printSheet.js`, découpée par `tools/decouperPrintSheet.mjs`.
// Tout ce qui est ici n'est utilisé QUE par les exercices de cette famille ;
// ce qui sert à plusieurs vit dans `socle.js`.

import {
    ENCRE, POINTE, boiteDe, echapperSheet
} from './socle.js';
import { MC_DEF, disposerMotsCroises } from '../../core/dispositionMotsCroises.js';
import { NOM_TYPE as NOM_TYPE_CODAGE, anglesDroitsDe as anglesDroitsDeCodage, classesDeLongueur as classesDeLongueurCodage, construireFigure as construireFigureCodage } from '../../core/codage.js';
import { THEMES as THEMES_MOTCODE } from '../../core/motCode.js';
import { encre, pourPdf } from '../ficheRendu.js';
import { pointsAngleDroit as pointsAngleDroitCodage, pointsProjetes as pointsProjetesCodage, traitsDeMarque as traitsDeMarqueCodage } from '../../core/codageSvg.js';
import { silhouette } from '../../core/blocScratch.js';

/** « un losange » -> « Un losange » : le mot se pose sous la figure. */
const nomTypeCodage = (type) => {
    const n = NOM_TYPE_CODAGE[type] || '';
    return n.charAt(0).toUpperCase() + n.slice(1);
};

// --- LES ANAGRAMMES SUR PAPIER ------------------------------------------------
//
// Une ligne par mot : les lettres mélangées à gauche, la définition, puis
// autant de cases que de lettres. Les cases FONT l'exercice — sans elles on ne
// sait pas quand on a fini, et « RACER » pourrait donner « CRAER ».

function geoAnagrammes(item, slot) {
    const b = boiteDe(slot);
    const lignes = item.meta.lignes || [];
    const n = Math.max(1, lignes.length);
    const hLigne = Math.min(16, (b.h - 2) / n);
    // La case doit rester lisible même sur le mot le plus long de la feuille.
    const maxLettres = Math.max(4, ...lignes.map(l => l.mot.length));
    const colMelange = b.w * 0.26;
    const largeurCases = Math.min(b.w * 0.42, maxLettres * hLigne * 0.52);
    const cote = largeurCases / maxLettres;
    // UN SEUL CORPS POUR TOUTES LES DÉFINITIONS DE L'EXERCICE : celui de la
    // plus longue. Calculé ligne par ligne, « Six faces carrées identiques »
    // s'écrivait deux fois plus gros que la définition d'à côté, et la colonne
    // avait l'air bricolée. C'est la même raison qui aligne les « = » de la
    // fiche des pharaons : sur une feuille, l'irrégularité se voit avant le
    // contenu.
    const tailleDef = lignes.reduce((mini, l) => Math.min(mini, tailleDefinition(
        hLigne,
        Math.max(10, b.w * 0.74 - MARGE_DEF - cote * l.mot.length - 3),
        String(l.def || '').length
    )), hLigne * 0.30);
    return { b, lignes, hLigne, colMelange, cote, maxLettres, tailleDef,
        avecDef: item.meta.avecDef !== false };
}

/**
 * LES LETTRES MÉLANGÉES TIENNENT DANS LEUR COLONNE. Écrites à taille fixe, un
 * mot de douze lettres débordait sur la définition d'à côté — deux textes
 * superposés, illisibles tous les deux. La taille suit donc la longueur.
 *
 * Rémy : « pour l'anagramme, c'est qu'en PDF le mot mélangé et la définition
 * se superposent ». Deux erreurs de mesure se cumulaient. La largeur d'une
 * lettre d'abord : 0,66 em vaut pour du texte courant, mais un mélange est
 * tout en CAPITALES GRASSES — un M fait 0,83 em, un O 0,78 —, et il faut y
 * ajouter l'interlettrage de 0,08 em qui aère la suite. La marge ensuite : il
 * n'y en avait aucune, si bien qu'un mot « qui tient tout juste » venait
 * toucher la définition. AVANCE couvre les deux, MARGE_DEF sépare.
 */
const AVANCE_MELANGE = 0.80;

const MARGE_DEF = 3;

/**
 * LA DÉFINITION TIENT DANS SA LIGNE, ET NE MORD PAS SUR LA SUIVANTE.
 *
 * Rémy : « en anagramme, il y a toujours un souci de présentation ». Sur une
 * feuille de parcours, où le bloc est plus étroit, « Deux droites qui ne se
 * croisent jamais, même très loin » demandait trois lignes dans une place qui
 * n'en offrait que deux : la définition débordait sur le mot d'en dessous, et
 * deux textes se superposaient.
 *
 * Le corps se DÉDUIT de la place. Un texte de n signes écrit au corps t occupe
 * à peu près n × t / 2 en longueur ; il lui faut donc n × t / (2 × largeur)
 * lignes, chacune haute de 1,15 t. Poser que ce produit tient dans la hauteur
 * offerte donne directement t — une racine carrée, et plus aucune surprise.
 */
function tailleDefinition(hLigne, largeur, n) {
    const t = Math.sqrt(hLigne * 0.86 * Math.max(10, largeur) / (0.575 * Math.max(8, n)));
    return Math.max(1.9, Math.min(hLigne * 0.30, t));
}

/** La largeur qui reste à la définition, une fois le mélange et les cases posés. */
function largeurDefinition(g, ligne) {
    return Math.max(10, g.b.w - g.colMelange - MARGE_DEF - g.cote * ligne.mot.length - 3);
}

function tailleMelange(g, ligne) {
    const large = g.hLigne * 0.42;
    const tenu = (g.colMelange - MARGE_DEF)
        / Math.max(4, ligne.melange.length * AVANCE_MELANGE);
    return Math.max(g.hLigne * 0.2, Math.min(large, tenu));
}

function anagrammesPreviewHtml(item, slot, k, solution) {
    const g = geoAnagrammes(item, slot);
    const T = (v) => (v * k).toFixed(2);
    let html = '';
    g.lignes.forEach((l, i) => {
        const y = g.b.y + i * g.hLigne;
        html += `<div class="fx-ana-mel" style="left:${T(g.b.x)}px; top:${T(y + g.hLigne * 0.18)}px;
            width:${T(g.colMelange)}px; font-size:${T(tailleMelange(g, l))}px">${echapperSheet(l.melange)}</div>`;
        if (g.avecDef) {
            const largeurDef = largeurDefinition(g, l);
            html += `<div class="fx-ana-def" style="left:${T(g.b.x + g.colMelange + MARGE_DEF)}px;
                top:${T(y)}px; width:${T(largeurDef)}px; height:${T(g.hLigne)}px;
                font-size:${T(g.tailleDef)}px">${echapperSheet(l.def)}</div>`;
        }
        const x0 = g.b.x + g.b.w - g.cote * l.mot.length;
        for (let c = 0; c < l.mot.length; c++) {
            html += `<div class="fx-ana-case" style="left:${T(x0 + c * g.cote)}px;
                top:${T(y + g.hLigne * 0.12)}px; width:${T(g.cote)}px; height:${T(g.cote)}px;
                font-size:${T(g.cote * 0.62)}px">${solution ? l.mot[c] : ''}</div>`;
        }
    });
    return html;
}

function dessinerAnagrammesPdf(doc, item, slot, solution, champ) {
    const g = geoAnagrammes(item, slot);
    g.lignes.forEach((l, i) => {
        const y = g.b.y + i * g.hLigne;
        doc.setFont('helvetica', 'bold');
        // LA MÊME TAILLE QU'À L'APERÇU. Elle valait « × 2,5 », une échelle
        // sans rapport avec le millimètre : le PDF écrivait plus petit que
        // l'aperçu, et c'est l'aperçu qui décidait des largeurs. 1 pt vaut
        // 0,3528 mm — c'est la conversion qu'emploie déjà le reste du module.
        const taille = tailleMelange(g, l);
        doc.setFontSize(taille / 0.3528);
        doc.setTextColor(...ENCRE.texte);
        doc.text(pourPdf(l.melange), g.b.x, y + g.hLigne * 0.55,
            { baseline: 'middle', charSpace: taille * 0.08 });

        if (g.avecDef) {
            doc.setFont('helvetica', 'normal');
            const largeur = largeurDefinition(g, l);
            const taille = g.tailleDef;
            doc.setFontSize(taille / 0.3528);
            doc.setTextColor(...ENCRE.gris);
            const morceaux = doc.splitTextToSize(pourPdf(l.def), largeur);
            // Le paragraphe est CENTRÉ dans sa ligne, du haut vers le bas : au
            // milieu, deux lignes débordaient d'un demi-interligne de chaque
            // côté et venaient toucher les voisines.
            const interligne = taille * 1.15;
            const haut = y + (g.hLigne - morceaux.length * interligne) / 2 + taille * 0.85;
            morceaux.forEach((part, j) => {
                doc.text(part, g.b.x + g.colMelange + MARGE_DEF, haut + j * interligne);
            });
        }

        const x0 = g.b.x + g.b.w - g.cote * l.mot.length;
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.35);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(Math.min(13, g.cote * 1.4));
        doc.setTextColor(...ENCRE.texte);
        for (let c = 0; c < l.mot.length; c++) {
            const x = x0 + c * g.cote, yc = y + g.hLigne * 0.12;
            doc.rect(x, yc, g.cote, g.cote, 'S');
            if (solution) {
                doc.text(l.mot[c], x + g.cote / 2, yc + g.cote / 2,
                    { align: 'center', baseline: 'middle' });
            } else if (champ) {
                champ(x + g.cote * 0.1, yc + g.cote * 0.1, g.cote * 0.8, g.cote * 0.8);
            }
        }
    });
}

// --- LES MOTS CROISÉS SUR PAPIER ----------------------------------------------
//
// La mise en page du journal : la grille, puis les définitions rangées en
// « Horizontalement » et « Verticalement ». Une grille par page — à deux, un
// 15 × 18 tombe sous trois millimètres par case.

function geoMotsCroises(item, slot) {
    const b = boiteDe(slot);
    const m = item.meta;
    return { b, m, ...disposerMotsCroises(b, m, m.defs) };
}

function motsCroisesPreviewHtml(item, slot, k, solution) {
    const g = geoMotsCroises(item, slot);
    const T = (v) => (v * k).toFixed(2);
    const offertes = new Map((g.m.offertes || []).map(o => [`${o.x},${o.y}`, o.lettre]));
    let html = '';
    for (let y = 0; y < g.m.hauteur; y++) {
        for (let x = 0; x < g.m.largeur; x++) {
            const c = g.m.cases[y][x];
            const X = g.x + x * g.cote, Y = g.y + y * g.cote;
            // ON NE DESSINE RIEN DU TOUT SUR UNE CASE MUETTE.
            //
            // Rémy : « les cases qui ne servent pas, ne les mets juste pas, on
            // ne doit voir que la grille des mots ». Elles étaient noircies —
            // un gâchis d'encre —, puis hachurées — moins d'encre, mais autant
            // de bruit. Or elles ne portent AUCUNE information : ce qui compte,
            // c'est la silhouette des mots, et elle se dessine toute seule dès
            // qu'on laisse le blanc autour. C'est la grille des mots croisés
            // « à l'américaine », celle des grilles de vacances.
            if (c === null) continue;
            const donnee = offertes.get(`${x},${y}`);
            const lettre = solution ? c : (donnee || '');
            const num = (g.m.numeros && g.m.numeros[`${x},${y}`]) || '';
            html += `<div class="fx-mc-case" style="left:${T(X)}px; top:${T(Y)}px;
                width:${T(g.cote)}px; height:${T(g.cote)}px; font-size:${T(g.cote * 0.6)}px">
                ${num ? `<span class="fx-mc-num" style="font-size:${T(g.cote * 0.3)}px">${num}</span>` : ''}
                ${echapperSheet(lettre)}</div>`;
        }
    }
    html += listeDefsHtml(g, k);
    return html;
}

/**
 * Les définitions, là où la disposition les a mises.
 *
 * ELLES COULENT, ELLES NE SE POSENT PLUS UNE PAR UNE. Rémy : « pour les mots
 * croisés, les définitions se superposent ». Chaque définition était placée à
 * un pas fixe fois son rang — et « Du même côté de la sécante, à la même place
 * sur chaque droite. (14) » tient sur deux lignes. La suivante lui passait
 * dessus, et l'on ne lisait plus ni l'une ni l'autre. On donne maintenant des
 * boîtes au navigateur, qui empile dedans mieux qu'aucun calcul de notre part.
 *
 * EN DESSOUS : deux boîtes côte à côte, une par liste. À CÔTÉ : une seule
 * boîte, les deux listes l'une sous l'autre — et c'est la RÉSERVE calculée
 * pour la première qui dit où commence la seconde, pour que le PDF, qui n'a
 * pas de navigateur, tombe au même endroit.
 */
function listeDefsHtml(g, k) {
    const T = (v) => (v * k).toFixed(2);
    const d = g.defs;
    // LES DÉFINITIONS OCCUPENT LEUR COLONNE. La grille est bornée par sa
    // largeur et ne peut pas grandir ; la colonne de texte, elle, restait
    // remplie à six pour cent. La mise en page dit maintenant de combien
    // grossir (voir `core/dispositionMotsCroises.js`).
    const M = d.mesures || MC_DEF;
    const bloc = (titre, liste, x, y) => `
        <div class="fx-mc-col" style="left:${T(x)}px; top:${T(y)}px;
            width:${T(d.largeur)}px; font-size:${T(M.corps)}px;
            line-height:${(M.pas / M.corps).toFixed(2)}">
            <div class="fx-mc-titre" style="font-size:${T(M.titre)}px;
                height:${T(M.apresTitre)}px; line-height:${T(M.titre * 1.2)}px">${titre}</div>
            ${liste.map(x2 => `<div class="fx-mc-def"><b>${x2.num}.</b> `
        + `${echapperSheet(x2.def)} (${x2.longueur})</div>`).join('')}
        </div>`;
    if (d.colonnes === 2) {
        return bloc('Horizontalement', g.m.horizontales, d.x, d.y)
            + bloc('Verticalement', g.m.verticales, d.x2, d.y);
    }
    return bloc('Horizontalement', g.m.horizontales, d.x, d.y)
        + bloc('Verticalement', g.m.verticales, d.x,
            d.y + d.hHoriz + M.entreListes);
}

/** Les mêmes définitions, écrites par jsPDF. */
function dessinerDefsPdf(doc, g) {
    const d = g.defs;
    // Le même grossissement qu'à l'aperçu : c'est le calcul de la mise en page
    // qui le donne, et les deux rendus le lisent au même endroit.
    const M = d.mesures || MC_DEF;
    const bloc = (titre, liste, x, y) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(M.titre / 0.3528);
        doc.setTextColor(...ENCRE.texte);
        doc.text(pourPdf(titre), x, y + M.titre);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(M.corps / 0.3528);
        doc.setTextColor(...ENCRE.gris);
        let ligne = y + M.apresTitre + M.corps;
        liste.forEach(def => {
            const morceaux = doc.splitTextToSize(
                pourPdf(`${def.num}. ${def.def} (${def.longueur})`), d.largeur - 1);
            doc.text(morceaux, x, ligne);
            ligne += morceaux.length * M.pas;
        });
    };
    if (d.colonnes === 2) {
        bloc('Horizontalement', g.m.horizontales, d.x, d.y);
        bloc('Verticalement', g.m.verticales, d.x2, d.y);
    } else {
        bloc('Horizontalement', g.m.horizontales, d.x, d.y);
        bloc('Verticalement', g.m.verticales, d.x,
            d.y + d.hHoriz + M.entreListes);
    }
}

// --- LE MOT CODÉ SUR PAPIER ---------------------------------------------------
//
// La grille en haut, la CLÉ en bas : autant de petites cases numérotées qu'il y
// a de lettres dans la grille, et l'élève écrit dedans la lettre qu'il a
// trouvée. Sans cette clé, il retient de tête que le 14 est un E et se trompe
// trois lignes plus bas ; avec elle, il écrit une fois et relit vingt fois. Le
// professeur, lui, corrige la clé et la grille suit.

/** Combien de cases de clé tiennent sur une ligne, et où tout se pose. */
function geoMotCode(item, slot) {
    const b = boiteDe(slot);
    const m = item.meta;
    const n = m.lettres.length;
    // LA CLÉ D'ABORD : c'est elle qui a une taille imposée — une case où l'on
    // écrit une lettre à la main ne descend pas sous cinq millimètres. Ce qui
    // reste va à la grille, qui sait se réduire.
    //
    // ET SUR UNE SEULE RANGÉE. Rémy : « mets toute la ligne de lettres à
    // trouver sur une seule ligne ». La case se calculait sur la MOITIÉ des
    // numéros — donc pour deux rangées —, et l'on obtenait quinze cases puis
    // quatre, une rangée bancale sous la grille. Deux gains d'un coup : la clé
    // se lit d'un trait, comme l'alphabet qu'elle est, et les seize
    // millimètres que la seconde rangée prenait reviennent à la grille, que
    // Rémy voulait « plus grande ». Le plancher de cinq millimètres tient
    // encore à vingt-six numéros sur un bloc pleine largeur : on n'écrit pas
    // une lettre à la main dans moins que cela.
    const coteCle = Math.max(5, Math.min(9, (b.w - 2) / Math.max(9, n)));
    const parLigne = Math.min(n, Math.max(1, Math.floor((b.w - 2) / coteCle)));
    const lignesCle = Math.ceil(n / parLigne);
    // Chaque rangée de clé porte sa case ET son numéro écrit dessous.
    const hCle = lignesCle * coteCle * 1.5 + 5;
    const dispoH = b.h - hCle - 2;
    const cote = Math.max(3, Math.min((b.w - 2) / m.largeur, dispoH / m.hauteur));
    const w = cote * m.largeur, h = cote * m.hauteur;
    return {
        b, m, cote, coteCle, parLigne, lignesCle,
        x: b.x + (b.w - w) / 2, y: b.y + (dispoH - h) / 2, w, h,
        // La clé est CENTRÉE sous la grille, qui l'est aussi : alignée à
        // gauche, elle donnait une page qui penche.
        xCle: b.x + (b.w - Math.min(n, parLigne) * coteCle) / 2,
        yCle: b.y + dispoH + 2
    };
}

/**
 * LES FLÈCHES DE L'ANNEAU, rangées par case.
 *
 * Elles disent où commence chaque mot et dans quel sens il se lit : c'est ce
 * qui remplace les définitions d'un mot croisé, et sans elles la grille de
 * Rémy n'est qu'un cadre de numéros muets.
 */
function flechesDe(m) {
    return new Map((m.fleches || []).map(f => [`${f.x},${f.y}`, f.type]));
}

/** Le tracé d'une flèche dans une case, en coordonnées 0..1. */
// DE VRAIES FLÈCHES. Rémy : « dessine de plus jolies flèches ». C'étaient trois
// segments — une hampe et deux barres obliques —, qui se lisaient comme un
// oiseau à cinq millimètres et se cassaient à la photocopie : les deux barres
// de la pointe s'y détachaient de la hampe.
//
// Une flèche se dessine d'un seul CHEMIN FERMÉ : la hampe est un rectangle, la
// pointe un triangle, et le tout est REMPLI. Un aplat de deux millimètres reste
// un aplat après trois générations de photocopie, là où trois traits fins
// deviennent trois traits gris.
//
// Les coordonnées sont dans une case unité (0…1), comme avant.
const HAMPE = 0.085;           // demi-épaisseur de la hampe

const AILE = 0.2;              // demi-envergure de la pointe

/**
 * Le chemin d'une flèche, d'un point de départ vers un point d'arrivée.
 * Les deux seules directions utiles ici sont « vers la droite » et « vers le
 * bas » ; on les fabrique par la même fonction pour qu'elles se ressemblent
 * exactement — deux dessins écrits séparément finissent toujours par différer.
 */
/**
 * LA FLÈCHE REND SES POINTS, PAS SON DESSIN.
 *
 * Elle rendait une chaîne SVG — « M 0.16 0.42 L … Z » —, ce qui allait très
 * bien à l'aperçu, qui la pose telle quelle dans un `<path d>`. Le PDF, lui,
 * était resté à la version d'AVANT, celle où une flèche n'était qu'une paire
 * de segments : il écrivait `traitsFleche(type).forEach(([a, b]) => …)`.
 *
 * DÉSTRUCTURER UNE CHAÎNE NE LÈVE AUCUNE ERREUR. `[a, b]` sur « M 0.16… »
 * donne le CARACTÈRE `'M'` et une espace ; `'M' * cote` vaut `NaN`, et jsPDF
 * s'arrête sur « Invalid arguments passed to jsPDF.line ». C'est le bug que
 * Rémy a rapporté : plus aucune fiche de parcours contenant un Mot Codé ne
 * sortait — et le message ne parlait ni de flèche, ni de mot codé.
 *
 * Les deux rendus partent maintenant des MÊMES POINTS, chacun les mettant en
 * forme à sa façon. Une flèche ne peut plus être dessinée d'un côté et pas de
 * l'autre : il n'y a plus deux descriptions à tenir d'accord.
 *
 * @returns {Array<[number, number]>} les sept sommets, en fraction de case
 */
function pointsFleche(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    const L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L;          // le sens de la flèche
    const nx = -uy, ny = ux;                 // sa perpendiculaire
    const bx = x1 - ux * POINTE, by = y1 - uy * POINTE;   // la base de la pointe
    return [
        [x0 + nx * HAMPE, y0 + ny * HAMPE],
        [bx + nx * HAMPE, by + ny * HAMPE],
        [bx + nx * AILE, by + ny * AILE],
        [x1, y1],
        [bx - nx * AILE, by - ny * AILE],
        [bx - nx * HAMPE, by - ny * HAMPE],
        [x0 - nx * HAMPE, y0 - ny * HAMPE]
    ];
}

/** Les mêmes points, pour l'attribut `d` d'un `<path>`. */
const cheminFleche = (pts) => 'M ' + pts
    .map(([x, y]) => `${x.toFixed(3)} ${y.toFixed(3)}`).join(' L ') + ' Z';

const CHEMINS_FLECHE = {
    droite: [pointsFleche(0.16, 0.5, 0.84, 0.5)],
    bas: [pointsFleche(0.5, 0.16, 0.5, 0.84)]
};

// Sur une case d'angle, les deux flèches ne se superposent pas : centrées
// toutes les deux, elles se croisent en une étoile qu'on ne lit plus. Chacune
// dans sa moitié, comme les deux départs distincts qu'elles annoncent.
const CHEMINS_COIN = [
    pointsFleche(0.30, 0.28, 0.86, 0.28),
    pointsFleche(0.28, 0.30, 0.28, 0.86)
];

function traitsFleche(type) {
    if (type === 'coin') return CHEMINS_COIN;
    return CHEMINS_FLECHE[type] || [];
}

/** La place d'une case de clé, la i-ème (0 en tête). */
function poseCle(g, i) {
    const l = Math.floor(i / g.parLigne), c = i % g.parLigne;
    return { x: g.xCle + c * g.coteCle, y: g.yCle + 5 + l * g.coteCle * 1.5 };
}

function motCodePreviewHtml(item, slot, k, solution) {
    const g = geoMotCode(item, slot);
    const T = (v) => (v * k).toFixed(2);
    const donnees = new Set(g.m.donnees);
    const fleches = flechesDe(g.m);
    let html = '';
    for (let y = 0; y < g.m.hauteur; y++) {
        for (let x = 0; x < g.m.largeur; x++) {
            const c = g.m.cases[y][x];
            const X = g.x + x * g.cote, Y = g.y + y * g.cote;
            // LA CASE MUETTE PORTE SA FLÈCHE : dans un anneau, c'est elle qui
            // dit où commence le mot suivant et dans quel sens il se lit.
            if (c === null) {
                const type = fleches.get(`${x},${y}`);
                if (!type) continue;      // le centre de l'anneau reste blanc
                const traits = traitsFleche(type)
                    .map(pts => `<path d="${cheminFleche(pts)}"/>`).join('');
                html += `<div class="fx-mk-noire" style="left:${T(X)}px; top:${T(Y)}px;
                    width:${T(g.cote)}px; height:${T(g.cote)}px">
                    <svg viewBox="0 0 1 1" preserveAspectRatio="none" class="fx-mk-fl">${traits}</svg>
                    </div>`;
                continue;
            }
            // LA GRILLE RESTE VIDE. Rémy : « pour les mots codés, ne remplis
            // surtout pas la grille, l'élève va se débrouiller (surtout sur le
            // pdf) ». Les lettres du mot de départ étaient recopiées dans
            // toutes les cases qui portaient leur numéro : un quart de la
            // grille arrivait déjà faite, et le premier geste de l'exercice —
            // reporter la clé numéro par numéro — était fait à la place de
            // l'élève. La clé, sous la grille, donne le mot de départ ; c'est
            // de là qu'on part, et c'est tout ce qu'il faut.
            const lettre = solution ? c : '';
            html += `<div class="fx-mk-case" style="left:${T(X)}px; top:${T(Y)}px;
                width:${T(g.cote)}px; height:${T(g.cote)}px; font-size:${T(g.cote * 0.5)}px">
                <span class="fx-mk-num" style="font-size:${T(g.cote * 0.32)}px">${g.m.numeros[y][x]}</span>
                ${echapperSheet(lettre)}</div>`;
        }
    }
    html += `<div class="fx-mc-titre" style="left:${T(g.b.x)}px; top:${T(g.yCle)}px;
        width:${T(g.b.w)}px; text-align:center; font-size:${T(3.2)}px">La clé — une lettre par numéro</div>`;
    g.m.lettres.forEach((_, i) => {
        const num = i + 1;
        const lettre = g.m.parNumero[num];
        const donne = donnees.has(lettre);
        const p = poseCle(g, i);
        html += `<div class="fx-mc-case${donne ? ' fx-mk-donnee' : ''}"
            style="left:${T(p.x)}px; top:${T(p.y)}px; width:${T(g.coteCle)}px;
            height:${T(g.coteCle)}px; font-size:${T(g.coteCle * 0.6)}px">${
    echapperSheet(solution || donne ? lettre : '')}</div>`;
        html += `<div class="fx-mc-cle-num" style="left:${T(p.x)}px;
            top:${T(p.y + g.coteCle + 0.3)}px; width:${T(g.coteCle)}px;
            font-size:${T(g.coteCle * 0.42)}px">${num}</div>`;
    });
    return html;
}

function dessinerMotCodePdf(doc, item, slot, solution, champ) {
    const g = geoMotCode(item, slot);
    const donnees = new Set(g.m.donnees);
    const fleches = flechesDe(g.m);

    for (let y = 0; y < g.m.hauteur; y++) for (let x = 0; x < g.m.largeur; x++) {
        const c = g.m.cases[y][x];
        const X = g.x + x * g.cote, Y = g.y + y * g.cote;
        // LA CASE MUETTE PORTE SA FLÈCHE. En GRIS CLAIR, et non en noir : un
        // anneau compte une case muette par mot, et un aplat noir par case,
        // c'est une cartouche de toner par classe et une photocopie baveuse.
        // Le CENTRE de l'anneau, lui, reste blanc — c'est la place de la
        // consigne, pas une case.
        if (c === null) {
            const type = fleches.get(`${x},${y}`);
            if (!type) continue;
            doc.setFillColor(221, 226, 234);
            doc.rect(X, Y, g.cote, g.cote, 'F');
            // LA MÊME FLÈCHE PLEINE QU'À L'ÉCRAN, et non deux traits : c'est
            // le même polygone, tracé point par point. `doc.lines` veut des
            // DÉPLACEMENTS depuis le point de départ, pas des coordonnées.
            doc.setFillColor(90, 104, 126);
            traitsFleche(type).forEach(pts => {
                const abs = pts.map(([px, py]) => [X + px * g.cote, Y + py * g.cote]);
                const pas = abs.slice(1).map(([px, py], i) =>
                    [px - abs[i][0], py - abs[i][1]]);
                doc.lines(pas, abs[0][0], abs[0][1], [1, 1], 'F', true);
            });
            continue;
        }
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.22);
        doc.rect(X, Y, g.cote, g.cote, 'S');
        // LE NUMÉRO EST DANS UN COIN, PAS AU MILIEU : le milieu appartient à la
        // lettre qu'on va écrire par-dessus, et un chiffre gris sous un stylo
        // se lit encore.
        // EN HAUT À GAUCHE, comme sur une grille de journal. Rémy : « pour le
        // chiffre, mets-le en haut à gauche dans la case. » Centré en haut, il
        // se retrouvait pile au-dessus de la lettre à écrire : deux signes sur
        // le même axe, et le chiffre disparaissait sous le crayon.
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(Math.max(3.6, g.cote * 0.9));
        doc.setTextColor(...ENCRE.gris);
        doc.text(String(g.m.numeros[y][x]), X + g.cote * 0.11, Y + g.cote * 0.33,
            { align: 'left' });

        // La grille reste VIDE sur la feuille : voir l'aperçu ci-dessus.
        const lettre = solution ? c : '';
        if (lettre) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(Math.min(12, g.cote * 1.5));
            doc.setTextColor(...(solution && !donnees.has(c) ? [47, 133, 90] : ENCRE.texte));
            doc.text(lettre, X + g.cote / 2, Y + g.cote * 0.88, { align: 'center' });
        } else if (champ) {
            champ(X + g.cote * 0.15, Y + g.cote * 0.38, g.cote * 0.7, g.cote * 0.56);
        }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...ENCRE.texte);
    doc.text(pourPdf('La clé — une lettre par numéro'), g.b.x + g.b.w / 2, g.yCle + 3,
        { align: 'center' });

    g.m.lettres.forEach((_, i) => {
        const num = i + 1;
        const lettre = g.m.parNumero[num];
        const donne = donnees.has(lettre);
        const p = poseCle(g, i);
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(donne ? 0.5 : 0.25);
        doc.rect(p.x, p.y, g.coteCle, g.coteCle, 'S');
        if (solution || donne) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(Math.min(12, g.coteCle * 1.6));
            doc.setTextColor(...(solution && !donne ? [47, 133, 90] : ENCRE.texte));
            doc.text(lettre, p.x + g.coteCle / 2, p.y + g.coteCle * 0.72, { align: 'center' });
        } else if (champ) {
            champ(p.x + g.coteCle * 0.12, p.y + g.coteCle * 0.12,
                g.coteCle * 0.76, g.coteCle * 0.76);
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(Math.max(4.4, g.coteCle * 1.1));
        doc.setTextColor(...ENCRE.gris);
        doc.text(String(num), p.x + g.coteCle / 2, p.y + g.coteCle + 2.6, { align: 'center' });
    });
    doc.setTextColor(...ENCRE.texte);
}

function dessinerMotsCroisesPdf(doc, item, slot, solution, champ) {
    const g = geoMotsCroises(item, slot);
    const offertes = new Map((g.m.offertes || []).map(o => [`${o.x},${o.y}`, o.lettre]));

    for (let y = 0; y < g.m.hauteur; y++) for (let x = 0; x < g.m.largeur; x++) {
        const X = g.x + x * g.cote, Y = g.y + y * g.cote;
        // Rien sur une case muette : seule la silhouette des mots se voit.
        if (g.m.cases[y][x] === null) continue;
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.22);
        doc.rect(X, Y, g.cote, g.cote, 'S');

        const num = g.m.numeros && g.m.numeros[`${x},${y}`];
        if (num) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(Math.max(3.6, g.cote * 0.9));
            doc.setTextColor(...ENCRE.gris);
            doc.text(String(num), X + g.cote * 0.12, Y + g.cote * 0.36);
        }
        const donnee = offertes.get(`${x},${y}`);
        const lettre = solution ? g.m.cases[y][x] : (donnee || '');
        if (lettre) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(Math.min(12, g.cote * 1.7));
            doc.setTextColor(...ENCRE.texte);
            doc.text(lettre, X + g.cote / 2, Y + g.cote * 0.62, { align: 'center' });
        } else if (champ) {
            champ(X + g.cote * 0.1, Y + g.cote * 0.1, g.cote * 0.8, g.cote * 0.8);
        }
    }

    dessinerDefsPdf(doc, g);
}

// --- LES MOTS CACHÉS -----------------------------------------------------------
//
// La grille prend la hauteur de la page, la liste des mots se range à côté.
// Une grille par feuille : à deux, les lettres tombent sous quatre millimètres
// et l'on ne cherche plus des mots, on plisse les yeux.
//
// SUR LA CORRECTION, on ne redessine pas la grille en couleur — on éteint les
// lettres de bourrage et l'on trace un trait d'un bout à l'autre de chaque mot.
// C'est exactement le geste qu'on demande à l'élève, et ça se photocopie.

/** La largeur dont dispose la liste quand elle passe sous la grille. */
const empileLargeur = (b) => b.w;

function geoMots(item, slot) {
    const m = item.meta;
    const b = slot.boite;
    // La colonne des indices : large quand elle porte des définitions, étroite
    // quand elle ne porte que les mots.
    const seulsMots = m.indices === 'mots';
    // Ce dont la colonne a BESOIN — son plancher, pas sa part.
    const listeMin = seulsMots
        ? Math.max(34, Math.min(b.w * 0.20, 58))
        : Math.max(58, Math.min(b.w * 0.42, 118));

    // DEUX DISPOSITIONS, ET ON GARDE CELLE QUI DONNE LA PLUS GRANDE GRILLE.
    //
    // Toujours à côté, le bloc d'une fiche composée — presque carré — donnait
    // une grille bornée par sa largeur amputée de la colonne de mots, avec
    // quatre centimètres de blanc au-dessus ET au-dessous. C'est exactement ce
    // qu'on voyait : une grille perdue au milieu de sa page.
    const coteA = Math.max(10, Math.min(b.w - listeMin - 8, b.h));

    // LE RESTE DE LA LARGEUR EST À LA COLONNE DE MOTS.
    //
    // Rémy : « quand la grille est toute seule sans colonne, on peut la faire
    // un peu plus grande et mettre les mots à trouver à droite de la grille. »
    // Les mots sont bien à droite — mais MESURÉ sur une grille seule en
    // paysage : la case, carrée, bute sur la HAUTEUR de la page (164,6 mm) et
    // ne peut plus grandir, pendant que la colonne prenait 20 % de la largeur
    // et laissait CINQ CENTIMÈTRES de papier blanc à sa droite. La grille est
    // déjà à son maximum ; c'est la colonne qui doit prendre le reste, et les
    // mots qui doivent enfin s'écrire gros — ce sont eux qu'on relit à chaque
    // lettre trouvée.
    const listeW = Math.max(listeMin, b.w - coteA - 8);
    // Empilée : les mots passent SOUS la grille, sur plusieurs colonnes.
    const parCol = Math.max(3, Math.ceil(m.mots.length / (seulsMots ? 3 : 2)));
    // EMPILÉE, LA LISTE S'ÉCRIT PLUS PETIT — et la grille prend ce qu'elle
    // rend. Rémy : « tu peux écrire les mots à trouver un peu plus petit et
    // rendre la grille un peu plus grande ». Sous la grille, la liste n'a pas
    // besoin d'être franche : elle tient sur trois colonnes larges, et c'est la
    // GRILLE qu'on regarde de loin. L'interligne suit le corps au lieu d'être
    // un nombre écrit à part — deux chiffres à tenir d'accord finissent
    // toujours par diverger.
    const tailleEmpile = seulsMots ? 9.5 : 8;
    const ligneEmpile = tailleEmpile * 0.3528 * 1.5;
    const listeH = parCol * ligneEmpile + 2;
    const coteB = Math.max(10, Math.min(b.w, b.h - listeH - 3));
    const empile = coteB > coteA + 2;
    const cote = empile ? coteB : coteA;
    const cell = cote / m.taille;

    // L'ensemble est centré : collée à gauche, la grille laissait cinq
    // centimètres de blanc à droite, comme une feuille mal cadrée.
    const x0 = empile
        ? b.x + Math.max(0, (b.w - cote) / 2)
        : b.x + Math.max(0, (b.w - cote - 8 - listeW) / 2);
    const y0 = empile ? b.y : b.y + (b.h - cote) / 2;
    // LA TAILLE DES MOTS À CHERCHER, CALCULÉE UNE FOIS POUR LES DEUX RENDUS.
    //
    // Rémy : « les mots à chercher sont écrits très petit ». Ils l'étaient
    // deux fois : neuf points sur le PDF, et dans l'aperçu une taille déduite
    // de la hauteur disponible qui tombait à six. Or ces mots-là, on les relit
    // à chaque lettre trouvée — c'est la ligne la plus lue de la feuille.
    //
    // Une liste de mots seuls peut être franche ; des définitions, plus
    // longues, tiennent un cran en dessous. En POINTS, comme le PDF ; l'aperçu
    // convertit.
    // ET LA TAILLE SUIT LA COLONNE. Une colonne deux fois plus large ne sert à
    // rien si les mots y restent écrits en 11,5 : on remplit la largeur avec le
    // MOT LE PLUS LONG, et l'on plafonne — passé vingt points, une liste de dix
    // mots ne tient plus en hauteur, et l'on ne lit pas mieux pour autant.
    const leMotLePlusLong = Math.max(...indicesMots(m).map(l => l.length), 1);
    const tailleQuiTient = (largeur) =>
        (largeur - 4) / Math.max(1, leMotLePlusLong * 0.3528 * 0.62);
    const plancher = seulsMots ? 11.5 : 8.5;
    const taille = empile ? tailleEmpile
        : Math.max(plancher, Math.min(seulsMots ? 20 : 13, tailleQuiTient(listeW)));
    // LE NOMBRE DE COLONNES SUIT LE MOT LE PLUS LONG, pas un chiffre décidé
    // d'avance. Trois colonnes fixes convenaient à « ANGLE » et « SOMME » ;
    // « DENOMINATEUR » débordait sur sa voisine et les deux devenaient
    // illisibles — juste à l'endroit qu'on relit à chaque lettre trouvée.
    const largeurMot = leMotLePlusLong * taille * 0.3528 * 0.62 + 4;
    const colonnesTient = Math.max(1, Math.floor((empileLargeur(b) || b.w) / largeurMot));
    return {
        m, b, cell, cote, empile, taille,
        listeW: empile ? b.w : listeW,
        listeColonnes: empile
            ? Math.max(1, Math.min(seulsMots ? 3 : 2, colonnesTient)) : 1,
        x0, y0,
        listeX: empile ? b.x : x0 + cote + 8,
        listeY: empile ? y0 + cote + 3 : y0,
        listeH: empile ? listeH : cote
    };
}

/** Le centre d'une case, en millimètres — la même pour l'aperçu et le PDF. */
const centreMot = (g, x, y) => ({
    cx: g.x0 + (x + 0.5) * g.cell,
    cy: g.y0 + (y + 0.5) * g.cell
});

/** Les lignes de la colonne d'indices, dans l'ordre où elles s'impriment. */
function indicesMots(m) {
    if (m.indices === 'definitions') return m.mots.map((w, i) => `${i + 1}. ${w.def}`);
    if (m.indices === 'les-deux') return m.mots.map(w => `${w.mot} — ${w.def}`);
    return m.mots.map(w => w.mot);
}

function motsPreviewHtml(item, slot, k, solution) {
    const g = geoMots(item, slot);
    const m = g.m;
    // Les cases occupées par un mot : sur la correction, seules celles-là
    // restent noires.
    const dedans = new Set();
    if (solution) {
        m.mots.forEach(w => {
            for (let i = 0; i < w.longueur; i++) dedans.add(`${w.x + w.dx * i},${w.y + w.dy * i}`);
        });
    }

    const T = (v) => (v * k).toFixed(2);
    let svg = '';
    m.grille.forEach((ligne, y) => {
        ligne.forEach((lettre, x) => {
            const c = centreMot(g, x, y);
            const chaude = !solution || dedans.has(`${x},${y}`);
            svg += `<text x="${T(c.cx)}" y="${T(c.cy)}" text-anchor="middle"
                dominant-baseline="central" font-size="${T(g.cell * 0.62)}"
                font-weight="${chaude ? 700 : 400}"
                fill="${chaude ? '#1a202c' : '#c3c8d2'}">${lettre}</text>`;
        });
    });
    if (solution) {
        m.mots.forEach(w => {
            const a = centreMot(g, w.x, w.y);
            const z = centreMot(g, w.x + w.dx * (w.longueur - 1), w.y + w.dy * (w.longueur - 1));
            svg += `<line x1="${T(a.cx)}" y1="${T(a.cy)}" x2="${T(z.cx)}" y2="${T(z.cy)}"
                stroke="#e11d48" stroke-width="${T(g.cell * 0.44)}" stroke-linecap="round"
                opacity="0.26"/>`;
        });
    } else {
        // Le cadre : sans lui, une grille de lettres flotte au milieu du papier.
        svg += `<rect x="${T(g.x0)}" y="${T(g.y0)}" width="${T(g.cote)}" height="${T(g.cote)}"
            fill="none" stroke="#1a202c" stroke-width="${T(0.45)}"/>`;
    }

    let html = `<svg class="fx-mc-svg" style="left:0; top:0; width:100%; height:100%">${svg}</svg>`;
    const lignes = indicesMots(m);
    html += `<div class="fx-mc-liste" style="left:${g.listeX * k}px; top:${g.listeY * k}px;
        width:${g.listeW * k}px; height:${g.listeH * k}px;
        column-count:${g.listeColonnes}; column-gap:${4 * k}px;
        font-weight:${m.indices === 'mots' ? 800 : 600};
        font-size:${g.taille * 0.3528 * k}px; line-height:${g.taille * 0.53 * k}px">`
        + lignes.map(l => `<div>${echapperSheet(l)}</div>`).join('') + '</div>';
    return html;
}

function dessinerMotsPdf(doc, item, slot, solution) {
    const g = geoMots(item, slot);
    const m = g.m;
    const dedans = new Set();
    if (solution) {
        m.mots.forEach(w => {
            for (let i = 0; i < w.longueur; i++) dedans.add(`${w.x + w.dx * i},${w.y + w.dy * i}`);
        });
    }

    if (solution) {
        // Le trait D'ABORD, les lettres par-dessus : l'inverse barrerait le mot
        // au lieu de le désigner.
        // Assez large pour désigner, assez clair pour qu'on lise la lettre au
        // travers : à pleine case, deux mots qui se croisent font une tache.
        doc.setDrawColor(249, 205, 216);
        doc.setLineWidth(g.cell * 0.46);
        m.mots.forEach(w => {
            const a = centreMot(g, w.x, w.y);
            const z = centreMot(g, w.x + w.dx * (w.longueur - 1), w.y + w.dy * (w.longueur - 1));
            doc.line(a.cx, a.cy, z.cx, z.cy);
        });
        doc.setLineWidth(0.4);
    } else {
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.45);
        doc.rect(g.x0, g.y0, g.cote, g.cote, 'S');
    }

    doc.setFontSize(Math.max(5, Math.min(g.cell * 2.1, 13)));
    m.grille.forEach((ligne, y) => {
        ligne.forEach((lettre, x) => {
            const c = centreMot(g, x, y);
            const chaude = !solution || dedans.has(`${x},${y}`);
            doc.setFont('helvetica', chaude ? 'bold' : 'normal');
            doc.setTextColor(...(chaude ? ENCRE.texte : [196, 201, 210]));
            doc.text(lettre, c.cx, c.cy + g.cell * 0.22, { align: 'center' });
        });
    });

    const lignes = indicesMots(m);
    const taille = g.taille;
    doc.setFont('helvetica', m.indices === 'mots' ? 'bold' : 'normal');
    doc.setFontSize(taille);
    doc.setTextColor(...ENCRE.texte);
    // EN COLONNES QUAND LA LISTE EST SOUS LA GRILLE. Une seule colonne y
    // aurait tiré huit mots sur toute la hauteur laissée libre, ou débordé.
    const colW = (g.listeW - 4 * (g.listeColonnes - 1)) / g.listeColonnes;
    const parCol = Math.ceil(lignes.length / g.listeColonnes);
    const interligne = taille * 0.53;
    let col = 0;
    let y = g.listeY + taille * 0.5;
    let dansLaColonne = 0;
    // Chaque indice est découpé à la largeur de sa colonne : une définition
    // d'un seul tenant sortait par la droite de la feuille.
    lignes.forEach(l => {
        if (dansLaColonne >= parCol && col < g.listeColonnes - 1) {
            col++; dansLaColonne = 0; y = g.listeY + taille * 0.5;
        }
        dansLaColonne++;
        doc.splitTextToSize(pourPdf(l), colW).forEach(part => {
            if (y > g.listeY + g.listeH) return;
            doc.text(part, g.listeX + col * (colW + 4), y);
            y += interligne;
        });
        y += interligne * 0.55;
    });
}

// --- CODER UNE FIGURE, SUR LE PAPIER ------------------------------------------
//
// L'exercice de codage est né pour l'ecran, mais c'est sur une feuille qu'il
// se fait depuis toujours : on trace les marques au crayon, on les efface, on
// recommence. Le meme noyau sert les deux — la figure est projetee dans la
// boite du bloc au lieu de la zone du SVG, et les marques se dessinent avec
// les memes fonctions de geometrie. Une figure imprimee est donc exactement
// celle de l'ecran.

const CODAGE_PIED = 5;   // la bande du bas, ou se nomme la figure

function geoCodage(item, slot) {
    const b = boiteDe(slot);
    const m = item.meta;
    const fig = construireFigureCodage(m.type, m.dims, m.rotation);
    const cadre = { x: b.x, y: b.y, w: b.w, h: Math.max(10, b.h - CODAGE_PIED) };
    const pad = Math.min(cadre.w, cadre.h) * 0.15;
    const P = pointsProjetesCodage(fig, { ...cadre, pad });
    const L = Math.max(1.2, Math.min(cadre.w, cadre.h) * 0.035);
    return { b, fig, P, L, cadre, ids: m.segments, pts: m.points,
        avecDiagonales: m.avecDiagonales !== false };
}

/** Ce qu'il y a a tracer : des traits, des points, des mots. */
function tracesCodage(g, solution) {
    const { P, fig, L, ids, pts } = g;
    const traits = [];
    const gras = [];
    ['AB', 'BC', 'CD', 'DA'].forEach(id => gras.push([P[id[0]], P[id[1]]]));
    if (g.avecDiagonales) {
        traits.push([P.A, P.C]);
        traits.push([P.B, P.D]);
    }

    const marques = [];
    if (solution) {
        classesDeLongueurCodage(fig, ids).forEach((classe, i) => {
            classe.forEach(id => {
                traitsDeMarqueCodage(P[id[0]], P[id[1]], i + 1, L).forEach(t => marques.push(t));
            });
        });
        anglesDroitsDeCodage(fig, pts).forEach(nom => {
            const [b1, b2] = BRAS_CODAGE[nom];
            marques.push(pointsAngleDroitCodage(P[nom], P[b1], P[b2], L * 1.7));
        });
    }

    const noms = ['A', 'B', 'C', 'D'].map(n => {
        const dx = P[n].x - P.O.x, dy = P[n].y - P.O.y;
        const d = Math.hypot(dx, dy) || 1;
        return { t: n, x: P[n].x + (dx / d) * L * 2.4, y: P[n].y + (dy / d) * L * 2.4 };
    });
    if (g.avecDiagonales) noms.push({ t: 'O', x: P.O.x - L * 1.9, y: P.O.y + L * 2.2 });

    return { traits, gras, marques, noms };
}

const BRAS_CODAGE = { A: ['B', 'D'], B: ['C', 'A'], C: ['D', 'B'], D: ['A', 'C'], O: ['A', 'B'] };

function codagePreviewHtml(item, slot, k, solution) {
    const g = geoCodage(item, slot);
    const t = tracesCodage(g, solution);
    const T = (v) => (v * k).toFixed(2);
    const ligne = ([a, b], w, couleur) => `<line x1="${T(a.x)}" y1="${T(a.y)}" x2="${T(b.x)}" `
        + `y2="${T(b.y)}" stroke="${couleur}" stroke-width="${(w * k).toFixed(2)}" stroke-linecap="round"/>`;
    let dedans = t.traits.map(seg => ligne(seg, 0.28, '#8a90a0')).join('');
    dedans += t.gras.map(seg => ligne(seg, 0.5, '#1a202c')).join('');
    dedans += t.marques.map(m => (m.length === 3
        ? `<path d="M ${T(m[0].x)} ${T(m[0].y)} L ${T(m[1].x)} ${T(m[1].y)} L ${T(m[2].x)} ${T(m[2].y)}"
             fill="none" stroke="#1a202c" stroke-width="${(0.42 * k).toFixed(2)}"/>`
        : ligne(m, 0.55, '#1a202c'))).join('');
    dedans += ['A', 'B', 'C', 'D'].map(n => `<circle cx="${T(g.P[n].x)}" cy="${T(g.P[n].y)}"
        r="${(0.5 * k).toFixed(2)}" fill="#1a202c"/>`).join('');
    if (g.avecDiagonales) {
        dedans += `<circle cx="${T(g.P.O.x)}" cy="${T(g.P.O.y)}" r="${(0.5 * k).toFixed(2)}" fill="#1a202c"/>`;
    }
    dedans += t.noms.map(n => `<text x="${T(n.x)}" y="${T(n.y)}" fill="#1a202c"
        font-size="${(3.1 * k).toFixed(2)}" font-weight="700" text-anchor="middle"
        dominant-baseline="middle" font-family="Helvetica, Arial, sans-serif">${n.t}</text>`).join('');
    dedans += `<text x="${T(g.b.x + g.b.w / 2)}" y="${T(g.b.y + g.b.h - 1.2)}" fill="#6e7684"
        font-size="${(3 * k).toFixed(2)}" text-anchor="middle"
        font-family="Helvetica, Arial, sans-serif">${nomTypeCodage(item.meta.type)}</text>`;
    return `<svg style="position:absolute; left:0; top:0; width:100%; height:100%;
        overflow:visible; pointer-events:none">${dedans}</svg>`;
}

function dessinerCodagePdf(doc, item, slot, solution) {
    const g = geoCodage(item, slot);
    const t = tracesCodage(g, solution);

    doc.setDrawColor(...ENCRE.grille);
    doc.setLineWidth(0.28);
    t.traits.forEach(([a, b]) => doc.line(a.x, a.y, b.x, b.y));

    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.5);
    t.gras.forEach(([a, b]) => doc.line(a.x, a.y, b.x, b.y));

    doc.setLineWidth(0.45);
    t.marques.forEach(m => {
        if (m.length === 3) {
            doc.line(m[0].x, m[0].y, m[1].x, m[1].y);
            doc.line(m[1].x, m[1].y, m[2].x, m[2].y);
        } else {
            doc.line(m[0].x, m[0].y, m[1].x, m[1].y);
        }
    });

    doc.setFillColor(...ENCRE.trait);
    ['A', 'B', 'C', 'D'].concat(g.avecDiagonales ? ['O'] : [])
        .forEach(n => doc.circle(g.P[n].x, g.P[n].y, 0.5, 'F'));

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...ENCRE.texte);
    t.noms.forEach(n => doc.text(n.t, n.x, n.y, { align: 'center', baseline: 'middle' }));

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...ENCRE.gris);
    doc.text(pourPdf(nomTypeCodage(item.meta.type)),
        g.b.x + g.b.w / 2, g.b.y + g.b.h - 1.2, { align: 'center' });
}

export const RENDUS_MOTS = {
    codage: {
        titre: 'Coder les figures',
        consigne: () => 'CODE CHAQUE FIGURE. Pose la MÊME marque — un trait, deux traits, trois '
            + 'traits, une croix — sur les segments qui ont la même longueur, et le petit carré '
            + 'de l\'angle droit là où l\'angle est droit. Les diagonales comptent pour deux '
            + 'segments chacune, coupés au point O. Une marque affirme une égalité : deux '
            + 'segments de longueurs différentes ne peuvent pas porter la même.',
        previewGrille: codagePreviewHtml,
        pdfGrille: dessinerCodagePdf,
        nomBloc: 'Figure', nomBlocs: 'figures',
        disposition: { cols: 3, rows: 2, maxCols: 4, maxRows: 3 },
        parLigneDefaut: 3
    },
    anagrammes: {
        titre: 'Anagrammes du vocabulaire',
        consigne: (items) => {
            const avecDef = items[0] && items[0].meta.avecDef !== false;
            const commun = 'REMETS LES LETTRES DANS L\'ORDRE. Chaque suite de lettres cache un mot '
                + 'de mathématiques : écris-le dans les cases, une lettre par case.';
            return avecDef
                ? `${commun} La définition est là pour te guider — relis-la une fois le mot trouvé.`
                : `${commun} Aucune définition ici : ce sont les lettres seules qui doivent parler.`;
        },
        previewGrille: anagrammesPreviewHtml,
        pdfGrille: dessinerAnagrammesPdf,
        nomBloc: 'Liste', nomBlocs: 'listes',
        titreAGauche: true,
        disposition: { cols: 1, rows: 1, maxCols: 2, maxRows: 2 },
        parLigneDefaut: 1
    },
    motcode: {
        titre: 'Mot codé du vocabulaire',
        consigne: (items) => 'CHAQUE LETTRE EST REMPLACÉE PAR UN NUMÉRO, le même partout dans '
            + 'la grille. Les mots se lisent en anneau autour du cadre : une flèche marque le '
            + 'début de chacun et le sens dans lequel il se lit. LA CLÉ, sous la grille, '
            + 'COMMENCE PAR UN MOT — ses lettres sont déjà posées partout où leur numéro '
            + 'reparaît, et c\'est de là qu\'on part. Retrouve les autres — deux numéros '
            + 'différents ne cachent jamais la même lettre — et '
            + 'reporte chaque trouvaille dans la clé. Tous les mots sont du vocabulaire du cours'
            + (items && items[0] && items[0].meta && THEMES_MOTCODE[items[0].meta.theme]
                ? ` (${THEMES_MOTCODE[items[0].meta.theme].toLowerCase()})` : '') + '.',
        previewGrille: motCodePreviewHtml,
        pdfGrille: dessinerMotCodePdf,
        nomBloc: 'Grille', nomBlocs: 'grilles',
        titreAGauche: true,
        // Une grille par page : la clé prend déjà deux rangées, et à deux
        // grilles les cases tombent sous trois millimètres.
        //
        // C'ÉTAIT VRAI DE CE PLAFOND-LÀ, ET L'EXERCICE PEUT LE LEVER. Rémy,
        // après relecture : « mets deux colonnes par défaut ». Ce que dit
        // `colonnesPapier` sur l'exercice l'emporte sur ce que le rendu a
        // mesuré une fois — c'est le professeur qui a la feuille sous les yeux.
        disposition: { cols: 1, rows: 1, maxCols: 1, maxRows: 1 },
        parLigneDefaut: 1
    },
    motscroises: {
        titre: 'Mots croisés du vocabulaire',
        consigne: () => 'REMPLIS LA GRILLE. Chaque définition donne un mot du cours ; le nombre '
            + 'entre parenthèses est son nombre de lettres. Commence par ceux dont tu es sûr : '
            + 'chaque mot trouvé donne une lettre à ceux qui le croisent, et c\'est là toute '
            + 'l\'aide dont tu disposes.',
        previewGrille: motsCroisesPreviewHtml,
        pdfGrille: dessinerMotsCroisesPdf,
        nomBloc: 'Grille', nomBlocs: 'grilles',
        titreAGauche: true,
        // UNE GRILLE PAR PAGE : à deux, un 15 × 18 tombe sous trois millimètres
        // par case, et les définitions ne tiennent plus.
        disposition: { cols: 1, rows: 1, maxCols: 1, maxRows: 1 },
        parLigneDefaut: 1
    },
    motscaches: {
        titre: 'Mots cachés du vocabulaire',
        consigne: (items) => {
            const m = (items[0] && items[0].meta) || {};
            // LA CONSIGNE COMMENCE PAR CE QU'IL FAUT FAIRE. Le reste est du
            // mode d'emploi : un élève qui lit trois lignes avant de savoir
            // ce qu'on lui demande a déjà décroché.
            const commun = 'TROUVE LES MOTS CACHÉS. Ils se lisent dans tous les sens : '
                + 'horizontalement, verticalement, en diagonale — et parfois à l\'envers. '
                + 'Entoure chacun dans la grille.';
            if (m.indices === 'definitions') {
                return `${commun} Ici les mots ne sont pas donnés : chaque définition en `
                    + 'désigne un seul. Écris-le sur la ligne, puis va le chercher.';
            }
            // COMBIEN DE LETTRES SONT DU BRUIT. Rémy le veut écrit : dans une
            // grille serrée, savoir qu'il ne reste que douze lettres au hasard
            // change la façon de chercher — presque tout ce qu'on voit fait
            // partie d'un mot. C'est une information de jeu, pas une
            // statistique.
            const n = Number(m.aleatoires);
            const bruit = Number.isFinite(n)
                ? ` Dans cette grille, ${n} lettre${n > 1 ? 's' : ''} seulement `
                    + `${n > 1 ? 'ont été tirées' : 'a été tirée'} au hasard.`
                : '';
            if (m.indices === 'les-deux') {
                return `${commun} La définition est là pour que le mot veuille dire quelque `
                    + 'chose — relis-la une fois le mot trouvé.' + bruit;
            }
            return commun + bruit;
        },
        previewGrille: motsPreviewHtml,
        pdfGrille: dessinerMotsPdf,
        nomBloc: 'Grille',
        titreAGauche: true,
        // UNE GRILLE PAR PAGE. À deux, un 12 × 12 tombe sous quatre millimètres
        // par lettre : on ne cherche plus des mots, on plisse les yeux.
        // (Ce défaut cède devant `colonnesPapier` : Rémy en veut deux.)
        disposition: { cols: 1, rows: 1, maxCols: 1, maxRows: 1 },
        parLigneDefaut: 1
    },
};
