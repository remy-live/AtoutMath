// Fiches à imprimer.
//
// Certains exercices valent autant sur papier qu'à l'écran — les grilles en
// tête : on y rature, on note ses candidats, on gomme. Ce module ouvre une
// modale avec un APERÇU fidèle de la page A4 paysage, puis DESSINE le PDF
// (jsPDF) : traits, cases, étiquettes — pas une capture de page web. Le
// fichier se télécharge directement, les solutions occupent la page 2.
//
// L'aperçu et le PDF partagent la même fonction de mise en page, en
// millimètres : ce qu'on voit est ce qu'on imprime, au facteur d'échelle
// près. Le nombre de grilles se règle en colonnes × lignes — c'est la
// géométrie de la feuille, autant la demander telle quelle.
//
// Le cas par cas est assumé : un exercice s'inscrit en déclarant
// `printable: '<cle>'` au catalogue et en fournissant son dessin de grille ;
// la page, l'en-tête et la page des solutions sont communs.

import { getGenerator, generateurDeFiche } from '../core/registry.js';
import { ficheSvg, refaireSvg, telechargerSvg } from './icones.js';
import { makeRng } from '../core/ids.js';
import { dessinerChemin } from '../core/cheminSvg.js';
import {
    FLECHES as FLECHES_Q, FAMILLES as FAMILLES_Q, POSITIONS as POSITIONS_Q,
    traitsDeCondition as traitsQ, posEtiquette as posEtiquetteQ, cleFleche as cleFlecheQ,
    boiteCondition as boiteCondQ,
    CASE_L as CASE_L_Q, CASE_H as CASE_H_Q,
    COND_L as COND_L_Q, COND_H as COND_H_Q, PLAN_L as PLAN_L_Q, PLAN_H as PLAN_H_Q,
    coinsArrondis as coinsArrondisQ,
    pointeDe as pointeDeQ,
    BANDE_NOM as BANDE_NOM_Q, COULEURS_FAMILLE as COULEURS_Q,
    COULEUR_FIGURE as FIGURE_Q, COULEUR_BANDE as BANDE_Q,
    codageDiagonales as codageDiagQ
} from '../core/quadrilateres.js';
import { pointsDe as pointsDeTrigo } from '../core/trigonometrie.js';
import { sommetsBruts, etendueTriangle, ecrireNombre as ecrireLongueurTri }
    from '../core/perimetreTriangle.js';
import { ETAPES_EXACTES as DISQUE_EXACTES, ecrireNombre as ecrireNombreDisque }
    from '../core/disque.js';
import { MONDE as MONDE_PC, couperAuMonde } from '../core/programmeConstruction.js';
import { ETAPES as ETAPES_RAISONNEMENT, trame as trameRaisonnement } from '../core/raisonnement.js';
// LA SOLUTION DES TROIS CASSE-TÊTE, POSITION PAR POSITION. Rémy : « pour les
// solutions des grenouilles, parking, hanoï, dessine des vignettes des étapes
// pour la correction. » Les noyaux savent jouer la partie parfaite ; la
// feuille n'a plus qu'à la dessiner.
import { etapesBrahma } from '../core/tourBrahma.js';
import { etapesGrenouilles } from '../core/grenouilles.js';
import { etapesParking } from '../core/parking.js';
// `relire` : relit un calcul récrit à la main et refait sa cascade — voir
// `retoucheGrille` du rendu « priorites ».
import { relire as relirePriorites } from '../core/priorites.js';
import { GLYPHES, egyptianSvgCadre, placerGlyphes } from '../core/figures.js';
import { tracesDe, branchesCroix, TAILLE_CROIX } from '../core/cercleFigure.js';
import { pourPdf, texteRiche, polycopieEnCouleur, modePolycopie, reglerModePolycopie,
    optionsPolycopie, teindreDoc, poserTeinte, teindreHtml, encre,
    ficheEnPortrait, reglerFichePortrait, fermerAutreFiche, mesureur
} from './ficheRendu.js';
import { equiperFenetre } from './flottant.js';
// Les réglages qu'on ne règle qu'une fois se rangent derrière un repli.
import { retenirRepli } from './repli.js';
// Le détachement est un outil d'auteur : l'interrupteur vit dans la palette.
import { fenetresDetachables } from './debugBar.js';
import { paramSchemaOf } from '../data/catalog.js';
import {
    ajusterAuCarre, ajusterAuRectangle, insecable, cheminSerpentin,
    boiteDe as boiteCaseDomino, cellulesDe
} from '../core/dominos.js';
import { marqueSvg as marqueSvgRelier } from '../core/relier.js';
import { caseCentrale } from '../core/quadrillageSvg.js';
import { CASES as CASES_HEXA } from '../core/hexagrille.js';
import { R as R_HEXA, SOMMETS as SOMMETS_HEXA, centre as centreHexa,
    repereFleche as repereFlecheHexa, cadreHexagrille } from '../core/hexagrilleFigure.js';
import { placeNoms, ancrageNom, ECART_NOM } from '../core/thales.js';
import { LIGNES_CADRE as LIGNES_CADRE_Q } from '../core/generators/thalesRedactionFiche.js';
import { MC_DEF, disposerMotsCroises } from '../core/dispositionMotsCroises.js';
import { ecrireElement } from '../core/elementSymetrie.js';
import { SENS as SENS_ROTATION } from '../core/transformations.js';
import { pieceSvg, dessinerPiecePdf, direPiece, MENTION_PIECES } from './piecesEchecs.js';
import { INGREDIENTS as INGREDIENTS_FICHE } from '../core/pizza.js';
import { ecrire as ecrireProp } from '../core/proportion.js';
import {
    dessiner as dessinerNoyau, aretesCachees as aretesCacheesNoyau,
    facesVisibles as facesVisiblesNoyau
} from '../core/solides.js';
import { cubesAPeindre, facesCube, boiteDessin } from '../core/cubes.js';
import {
    cotesDe as cotesDePythagore, etapesCalcul as etapesCalculPythagore,
    ligneEnTexte as ligneEnTextePythagore
} from '../core/pythagore.js';
import { boite as boiteTangram } from '../core/tangram.js';
import { THEMES as THEMES_MOTCODE } from '../core/motCode.js';
import {
    construireFigure as construireFigureCodage,
    classesDeLongueur as classesDeLongueurCodage,
    anglesDroitsDe as anglesDroitsDeCodage,
    NOM_TYPE as NOM_TYPE_CODAGE
} from '../core/codage.js';
import {
    contourSecteur as contourSecteurAngle, equerreDe as equerreAngle,
    mesureArc as mesureArcAngle, ancreArc as ancreArcAngle,
    rayonSecteur as rayonSecteurAngle, boiteFigure as boiteFigureAngle,
    HAUTEUR_ETIQUETTE as HAUTEUR_ETIQ_ANGLE, etiquetteDedans as etiqDedansAngle
} from '../core/anglesRemarquables.js';
import { sommets as sommetsAngles } from '../core/anglesRemarquablesSvg.js';
import {
    pointsProjetes as pointsProjetesCodage,
    traitsDeMarque as traitsDeMarqueCodage,
    pointsAngleDroit as pointsAngleDroitCodage
} from '../core/codageSvg.js';
// LES BLOCS SCRATCH VIENNENT DU MÊME MOULE QUE CEUX DE L'ÉCRAN. Rémy : « les
// blocs rendus en PDF ne sont pas les mêmes que les vrais » — ils le sont
// maintenant, parce que la forme n'est plus écrite deux fois.
import {
    U as UBLOC, silhouette, gelule, versSvg as blocVersSvg, versPdf as blocVersPdf,
    largeurTexte as largeurTexteBloc, largeurChamp
} from '../core/blocScratch.js';
// COMBIEN DE GRILLES, ET RIEN D'AUTRE : la disposition se calcule, elle ne se
// règle plus. Le même module sert à placer les blocs et à choisir leur nombre.
import {
    mesuresSlot, choisirDisposition, capaciteMax, coteLisible, dispositionDuRendu,
    dispositionEnColonnes
} from '../core/dispositionFiche.js';
import { monterPanneauContenu } from './panneauContenu.js';
// Poser une opération, c'est ranger des chiffres PAR RANG ; la virgule marque
// une frontière, elle n'est pas un chiffre. Le noyau le dit, la feuille le lit.
import { decimales as decimalesPose, rangsDe as rangsPose, enFrancais } from '../core/poser.js';

// LES FAMILLES DE FICHES. Chacune apporte sa part de `RENDUS` ; le
// catalogue complet est leur réunion, ci-dessous.
import { RENDUS_GRILLES } from './fiches/grilles.js';
import { RENDUS_JEUX } from './fiches/jeux.js';
import { RENDUS_MOTS } from './fiches/mots.js';
import { RENDUS_CASSETETE } from './fiches/casseTete.js';
import { RENDUS_FIGURES } from './fiches/figures.js';
import { RENDUS_THEOREMES } from './fiches/theoremes.js';
import { RENDUS_REPERAGE } from './fiches/reperage.js';
import { RENDUS_NOMBRES } from './fiches/nombres.js';
import { RENDUS_ALGORITHMES } from './fiches/algorithmes.js';
import {
    ENCRE, echapperSheet
} from './fiches/socle.js';

// --- Mise en page (millimètres, A4 paysage) ---------------------------------

// LA PAGE, ORIENTABLE. Le paysage convient à six pendules ou neuf rectangles ;
// un treillis de Garam, plus haut que large, veut du portrait. On échange donc
// la largeur et la hauteur au lieu de figer l'une des deux — tout le reste de
// la mise en page se calcule à partir d'elles.
const PAGE = { w: 297, h: 210, marge: 9, enteteH: 17, piedH: 6 };

function orienterPage(portrait) {
    const grand = Math.max(PAGE.w, PAGE.h), petit = Math.min(PAGE.w, PAGE.h);
    PAGE.w = portrait ? petit : grand;
    PAGE.h = portrait ? grand : petit;
}

/**
 * Positionne `cols × rows` blocs carrés (titre + grille) dans la zone utile.
 * Renvoie des millimètres ; l'aperçu multiplie par son échelle, le PDF les
 * utilise tels quels.
 */
function calculerFiche(cols, rows, colles = false, proportions = null, serrer = false) {
    // BLOCS COLLÉS : les cartes à découper se touchent par leur bordure.
    //
    // Rémy : « pour le memory des tables, COLLE les cartes par leur bordure,
    // les espaces entre sont un enfer pour les découper vite ». Une gouttière
    // oblige à deux coups de ciseaux là où un seul suffit, et à viser au
    // milieu du blanc ; bord à bord, un massicot traverse la page d'un trait
    // et sort toute une colonne de cartes. Le titre du bloc disparaît avec la
    // gouttière : il n'a plus où se poser, et une carte à jouer ne porte pas
    // d'étiquette « Paire 3 ».
    //
    // LES LONGUEURS SE CALCULENT DANS LE NOYAU, pas ici : c'est le même calcul
    // qui sert à CHOISIR la disposition à partir d'un simple « combien ». Deux
    // copies de cette arithmétique, et la taille annoncée au professeur cesse
    // un jour de correspondre à la feuille.
    const { gapX, gapY, titreH, zone, slotW, slotH, board, cote } =
        mesuresSlot(PAGE, cols, rows, colles, proportions);
    const y0 = zone.y;
    const H = zone.h;

    // LES COLONNES SE RESSERRENT SUR LE DESSIN QU'ELLES PORTENT.
    //
    // Rémy, sur les disques et sur les pendules : « il y a trop d'espace entre
    // les colonnes du poly », « laisse moins d'espaces entre les colonnes ».
    //
    // Le blanc ne venait pas de la gouttière — six millimètres — mais de ce qui
    // restait DEDANS. Un bloc carré tient dans le plus petit des deux côtés de
    // son emplacement ; quand c'est la HAUTEUR qui bride (cinq pendules sur
    // trois rangées : 51 mm de large, 49,3 de haut), chaque emplacement garde
    // près de deux millimètres de largeur morte, invisible mais bien là. Avec
    // les gouttières, cela faisait près de huit millimètres entre deux
    // dessins pour six annoncés, et la feuille avait l'air de se disperser.
    //
    // On pose donc les colonnes sur la LARGEUR DU DESSIN, pas sur celle de
    // l'emplacement, et l'on recentre la planche entière : les écarts valent
    // exactement la gouttière, et le reste passe dans les marges, où le blanc
    // ne se remarque pas.
    //
    // ET C'EST LE RENDU QUI LE DEMANDE, jamais la mise en page toute seule.
    // Beaucoup de blocs ne dessinent pas « une figure » : ils remplissent leur
    // boîte — un nombre, un signe égal, une ligne de pointillés qui court
    // jusqu'au bord. Rétrécir la boîte de ceux-là ne resserre rien, cela leur
    // retire de la place : les nombres des pharaons, mesurés avec la règle
    // appliquée d'office, se retrouvaient sur deux colonnes de six centimètres
    // au milieu d'une page de vingt-huit. `serrerColonnes` est donc déclaré
    // par les rendus dont le dessin a une largeur PROPRE, plus étroite que son
    // emplacement — et par eux seuls.
    const large = (colles || !serrer) ? slotW : Math.min(slotW, Math.max(cote || 0, board));
    const x0 = PAGE.marge + Math.max(0, (zone.w - (cols * large + (cols - 1) * gapX)) / 2);
    const pasX = large + gapX;

    const slots = [];
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            const xSlot = x0 + i * pasX;
            const ySlot = y0 + j * (slotH + gapY);
            slots.push({
                titre: { x: xSlot + large / 2, y: ySlot + titreH - 1.2 },
                // Le carré inscrit, pour les grilles carrées…
                x: xSlot + (large - board) / 2,
                y: ySlot + titreH + (slotH - titreH - board) / 2,
                taille: board,
                // … et la boîte complète, pour les treillis larges (Garam) :
                // un emplacement carré y donnerait des cases minuscules.
                boite: { x: xSlot, y: ySlot + titreH, w: large, h: slotH - titreH }
            });
        }
    }
    // Les traits de séparation passent au milieu des gouttières : de quoi les
    // tracer sans redéfinir la mise en page ailleurs.
    const traits = [];
    for (let i = 1; i < cols; i++) {
        const x = x0 + i * pasX - gapX / 2;
        traits.push({ x1: x, y1: y0 - 1, x2: x, y2: y0 + H });
    }
    for (let j = 1; j < rows; j++) {
        const y = y0 + j * (slotH + gapY) - gapY / 2;
        traits.push({ x1: x0 - gapX / 2, y1: y, x2: x0 + cols * pasX - gapX / 2, y2: y });
    }
    return { slots, board, traits };
}

// --- jsPDF, chargé au premier besoin ----------------------------------------

let jsPDFPromise = null;

export function chargerJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (!jsPDFPromise) {
        jsPDFPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            // SERVIE AVEC L'APPLICATION, plus depuis un CDN. Le professeur qui
            // prépare sa fiche derrière le filtre de son établissement voyait
            // « PDF indisponible » sans rien pouvoir y faire — et la fiche est
            // justement ce qu'on emporte quand le réseau n'est pas là.
            s.src = './vendor/jspdf/jspdf.umd.min.js';
            s.onload = () => {
                if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf.jsPDF);
                else { jsPDFPromise = null; reject(new Error('jsPDF illisible')); }
            };
            s.onerror = () => { jsPDFPromise = null; reject(new Error('jsPDF inaccessible')); };
            document.head.appendChild(s);
        });
    }
    return jsPDFPromise;
}

// DEUX DÉCLARATIONS MORTES ONT ÉTÉ RETIRÉES ICI, et c'est le découpage qui les
// a montrées : `DOM_LIGNE` et `fractionEcrite` n'étaient appelées de nulle part.
// Elles se cachaient très bien dans un fichier de seize mille lignes ; dans une
// façade de sept cents, elles n'avaient plus où se mettre. Le vrai code des
// dominos vit dans `fiches/grilles.js`, avec les autres grilles à remplir.

/**
 * LE CATALOGUE DES FICHES — la réunion des familles.
 *
 * Il était ici même, en mille six cent cinquante lignes. Chaque famille
 * porte désormais la sienne, à côté du code qui la dessine : on ne lit plus
 * une entrée à un bout du fichier et son rendu à l'autre.
 */
export const RENDUS = {
    ...RENDUS_GRILLES,
    ...RENDUS_JEUX,
    ...RENDUS_MOTS,
    ...RENDUS_CASSETETE,
    ...RENDUS_FIGURES,
    ...RENDUS_THEOREMES,
    ...RENDUS_REPERAGE,
    ...RENDUS_NOMBRES,
    ...RENDUS_ALGORITHMES,
};

// --- La modale ---------------------------------------------------------------

const CLE_FENETRE = 'mathbox-fiche-flottante';

const lireModeFenetre = () => {
    try { return localStorage.getItem(`${CLE_FENETRE}-mode`); } catch (e) { return null; }
};

let fenetreFiche = null;

function assurerModale() {
    let modal = document.getElementById('print-sheet-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'print-sheet-modal';
    modal.className = 'modal-overlay modal-overlay--top';
    modal.innerHTML = `
        <div class="glass-panel modal-panel-lg fp-panel">
            <h3 class="modal-title">${ficheSvg(22, 'modal-title-ico')} Fiche à imprimer</h3>
            <!-- TROIS QUESTIONS, TOUJOURS DANS LE MÊME ORDRE, et les mêmes
                 sur les deux fiches : QUOI dessus, COMBIEN, SUR QUEL PAPIER.
                 Rémy : « il faut aller au plus clair et au plus simple ». Les
                 deux fenêtres mélangeaient les trois, et celle des questions
                 sautait la première. -->

            <!-- ① QUOI — les réglages de l'exercice, sur la fiche elle-même.
                 Rémy : « peut-on demander des sudokus autres que 6 × 6 pour
                 les PDF ? ». On le pouvait — mais seulement en ressortant de
                 la fiche pour aller régler l'exercice, puis en y revenant. -->
            <div class="fp-contenu" id="fp-contenu" hidden></div>

            <!-- ② COMBIEN — un seul nombre, et la taille qui en découle. -->
            <div class="fp-controles fp-combien">
                <label>Combien
                    <span class="fp-pas">
                        <button type="button" class="fp-pas-btn" data-pas="-1" aria-label="Un de moins">−</button>
                        <input type="number" id="fp-combien" class="cfg-input cfg-input--num" min="1" max="25" value="12">
                        <button type="button" class="fp-pas-btn" data-pas="1" aria-label="Un de plus">+</button>
                    </span></label>
                <span class="fp-total" id="fp-total"></span>
                <button type="button" class="btn-hint" id="fp-regen">${refaireSvg(16)} Autres grilles</button>
                <button type="button" class="btn-hint" id="fp-atelier" style="display:none">♟ Composer mes échiquiers…</button>
                <button type="button" class="btn-hint" id="fp-voir-sol" aria-pressed="false">Voir les solutions</button>
            </div>

            <!-- ③ SUR QUEL PAPIER — le format et la couleur de l'imprimante ne
                 changent pas d'une fiche à l'autre : on les règle une fois. -->
            <details class="fp-repli" id="fp-plus">
                <summary>Papier et impression</summary>
                <div class="fp-controles">
                    <label>Format
                        <select id="fp-orientation" class="cfg-input">
                            <option value="paysage">A4 paysage</option>
                            <option value="portrait">A4 portrait</option>
                        </select></label>
                    <label>Impression
                        <select id="fp-couleur" class="cfg-input"></select></label>
                </div>
            </details>
            <div class="fp-apercu-cadre">
                <div class="fp-apercu" id="fp-apercu"></div>
            </div>
            <div class="fp-note" id="fp-note">Page 1 : les grilles, avec un en-tête Nom / Date.
                Page 2 : les solutions — à garder pour soi ou à donner après.</div>
            <div class="modal-actions-center">
                <button type="button" class="btn-toggle glass-btn modal-btn-flex modal-btn-flex--neutral" id="fp-fermer">Fermer</button>
                <button type="button" class="btn-toggle glass-btn primary active modal-btn-flex" id="fp-telecharger">${telechargerSvg(19)} Télécharger le PDF</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    // Les deux commandes de fenêtre — ancrer/détacher, replier les réglages —
    // sont posées dans le titre une fois pour toutes.
    fenetreFiche = equiperFenetre(modal, CLE_FENETRE, { peutDetacher: fenetresDetachables });
    return modal;
}

// --- Mathdoku ----------------------------------------------------------------

function entetePdf(doc, titre, sousTitre, consigne, mention = '') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...ENCRE.texte);
    doc.text(pourPdf(`${titre}${sousTitre ? ' — ' + sousTitre : ''}`), PAGE.marge, PAGE.marge + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Nom : ..............................    Date : ....................', PAGE.w - PAGE.marge, PAGE.marge + 6, { align: 'right' });
    if (consigne) {
        // Découpée à la largeur de la page : d'un seul tenant, une consigne un
        // peu longue sortait par la droite et se terminait dans le vide.
        //
        // ET ON NE LA COUPE PLUS EN SILENCE. Deux lignes tenaient dans
        // l'en-tête, la troisième était jetée : la consigne du pavage perdait
        // ses derniers mots — « ce que tu cherches est au MILIEU des deux » —
        // c'est-à-dire précisément ce qu'il fallait faire. L'aperçu, lui,
        // affichait la phrase entière ; le défaut ne se voyait qu'à
        // l'impression. On rétrécit donc le texte jusqu'à ce qu'il tienne.
        doc.setTextColor(90, 98, 112);
        const large = PAGE.w - PAGE.marge * 2;
        let lignes = [], taille = 8.6;
        for (const t of [8.6, 8, 7.4, 6.9]) {
            doc.setFontSize(t);
            lignes = doc.splitTextToSize(pourPdf(consigne), large);
            taille = t;
            if (lignes.length <= 2) break;
        }
        doc.setFontSize(taille);
        // Au-delà de deux lignes même rétréci, on le DIT — un « … » vaut mieux
        // qu'une phrase qui s'arrête net au milieu d'une idée.
        if (lignes.length > 2) lignes = [lignes[0], `${lignes[1].trimEnd()} …`];
        lignes.forEach((l, i) => doc.text(l, PAGE.marge, PAGE.marge + 11.6 + i * 3.4));
    }
    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.4);
    doc.line(PAGE.marge, PAGE.marge + 8, PAGE.w - PAGE.marge, PAGE.marge + 8);
    doc.setFontSize(6.5);
    doc.setTextColor(150, 155, 165);
    // LA MENTION DE LICENCE VOYAGE AVEC LA FEUILLE. Un jeu de pièces importé
    // peut être sous CC BY-SA : la citation doit figurer là où le dessin est
    // distribué, c'est-à-dire sur la feuille elle-même, pas seulement dans le
    // code. Elle ne s'affiche que sur les fiches qui montrent des pièces.
    doc.text('Fiche générée par AtoutMath' + (mention ? ` — ${mention}` : ''),
        PAGE.w / 2, PAGE.h - 4, { align: 'center' });
}

function construirePdf(jsPDF, rendu, items, cols, rows, titre = null, sansSolutions = false,
    parPage = 0) {
    // L'ENCRE DU MODE CHOISI EST POSÉE SUR LE DOCUMENT, une fois : les deux
    // cents endroits qui écrivent une couleur n'ont rien à en savoir.
    const doc = teindreDoc(new jsPDF({ orientation: ficheEnPortrait() ? 'portrait' : 'landscape', unit: 'mm', format: 'a4' }));
    const { slots, traits } = calculerFiche(cols, rows, !!rendu.blocsColles,
        typeof rendu.proportions === 'function' ? rendu.proportions(items) : rendu.proportions,
        !!rendu.serrerColonnes);

    // La mention de licence ne s'ajoute qu'aux fiches qui montrent des pièces.
    const avecPieces = rendu === RENDUS.mat || rendu === RENDUS.echiquier;
    // LES FEUILLES, quand le rendu en accepte plusieurs — voir `parPage` dans
    // la modale. Sans pagination, une seule feuille qui porte tout.
    const parFeuille = parPage > 0 ? parPage : items.length || 1;
    const feuilles = Array.from(
        { length: Math.max(1, Math.ceil(items.length / parFeuille)) },
        (_, i) => items.slice(i * parFeuille, (i + 1) * parFeuille));
    const page = (solution, lot, iFeuille) => {
        // LA SECONDE PAGE N'EST PAS TOUJOURS UN CORRIGÉ : celle du memory
        // porte les DOS des cartes, et l'appeler « Solutions » ferait croire
        // à une feuille de réponses qu'on garde pour soi.
        const rang = feuilles.length > 1 ? ` (${iFeuille + 1}/${feuilles.length})` : '';
        entetePdf(doc, titre || rendu.titre,
            (solution ? (rendu.nomSolutions || 'Solutions') : '') + rang,
            solution ? '' : rendu.consigne(items),
            avecPieces ? MENTION_PIECES : '');
        if (rendu.separateurs) {
            doc.setDrawColor(...ENCRE.trait);
            doc.setLineWidth(0.35);
            traits.forEach(t => doc.line(t.x1, t.y1, t.x2, t.y2));
        }
        lot.forEach((item, j) => {
            const i = iFeuille * parFeuille + j;
            const slot = slots[j];
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...ENCRE.texte);
            // « Grille » pour un sudoku, « Planche » pour des dominos : le
            // rendu nomme ses blocs, la modale ne le devine pas.
            const nom = `${rendu.nomBloc || 'Grille'} ${i + 1}`;
            if (rendu.blocsColles) { /* pas d'étiquette sur une carte à découper */ }
            else if (rendu.titreAGauche) doc.text(nom, slot.boite.x, slot.titre.y);
            else doc.text(nom, slot.titre.x, slot.titre.y, { align: 'center' });
            // Le RANG du bloc sur la feuille : certains rendus en tirent leur
            // couleur, pour que deux figures voisines ne soient pas jumelles.
            rendu.pdfGrille(doc, item, slot, solution, null, i, items);
        });
    };

    // LES QUESTIONS D'ABORD, TOUTES LES FEUILLES, PUIS LES CORRIGÉS.
    //
    // Et non « questions, corrigé, questions, corrigé » : on imprime les
    // premières en trente exemplaires et le second en un seul, c'est le geste
    // le plus banal de la salle des profs. Le memory est l'exception qui
    // confirme la règle — ses « solutions » sont les DOS des cartes, qu'on
    // imprime au verso —, et c'est pour cela qu'ils gardent le même ordre :
    // une feuille de dos par feuille de cartes, dans le même rang.
    feuilles.forEach((lot, i) => {
        if (i) doc.addPage('a4', ficheEnPortrait() ? 'portrait' : 'landscape');
        page(false, lot, i);
    });
    // UNE PLANCHE COMPOSÉE À LA MAIN N'A PAS DE CORRIGÉ. La page « Solutions »
    // y recopiait la première à l'identique : une feuille de plus à imprimer,
    // et rien de plus à lire dessus.
    if (!sansSolutions) {
        feuilles.forEach((lot, i) => {
            doc.addPage('a4', ficheEnPortrait() ? 'portrait' : 'landscape');
            page(true, lot, i);
        });
    }
    return doc;
}

/**
 * Ouvre la modale de fiche pour un exercice imprimable.
 * @param {Object} exo    - entrée de catalogue portant `printable`
 * @param {Object} params - réglages courants (chiffres, opérations, difficulté)
 */
export function ouvrirFicheModal(exo, params, atelier = null, opts = {}) {
    // DES GRILLES FAITES À LA MAIN, PAS TIRÉES AU SORT.
    //
    // L'atelier d'échiquiers compose ses diagrammes pièce par pièce : il n'y a
    // pas de générateur derrière, et « d'autres grilles » n'aurait aucun sens
    // — on jetterait ce que le professeur vient de poser. Le reste de la
    // modale ne change pas : c'est le même aperçu, la même mise en page, le
    // même PDF.
    // UN EXERCICE PEUT IMPRIMER AUTRE CHOSE QU'IL NE JOUE.
    //
    // À l'écran, le repérage pose UN point à la fois : c'est ce qu'il faut
    // pour corriger tout de suite. Sur le papier, un repère qui ne porte qu'un
    // point gâche une demi-page, et l'élève passe son temps à retracer des
    // axes. Le même exercice a donc le droit d'avoir un générateur de FICHE
    // distinct — plutôt que de doubler le catalogue d'entrées « à imprimer »
    // que personne ne cherche.
    const generator = atelier ? null : generateurDeFiche(exo);
    const rendu = RENDUS[exo.printable];
    // Deux papiers pour deux natures d'exercice : une GRILLE se dessine (on y
    // rature, on y note ses candidats), une QUESTION s'écrit sur une ligne.
    // Le second cas est de loin le plus fréquent, et n'existait pas.
    if (!rendu) {
        if (atelier) return;
        if (generator && generator.ecrit) {
            import('./printQuestions.js')
                .then(m => m.ouvrirFicheQuestions(exo, { ...(exo.printParams || {}), ...(params || {}) },
                    chargerJsPDF, opts));
        }
        return;
    }
    if (!generator && !atelier) return;

    // UNE FICHE PEUT ÊTRE FAITE POUR UNE ORIENTATION, et le dire.
    //
    // L'orientation est d'ordinaire un choix du professeur, retenu d'une
    // feuille à l'autre. Mais certaines planches n'existent que dans un sens :
    // l'organigramme des quadrilatères est PORTRAIT — huit rangées empilées du
    // quadrilatère au carré — et sorti en paysage il se tasse jusqu'à ce que
    // ses cases ne puissent plus rien recevoir. Mesuré : 84 mm de large sur une
    // page de 279, et des cases de 13 mm où l'on doit écrire « Qui a ses
    // diagonales perpendiculaires ». La fiche impose donc son sens à
    // l'ouverture ; le sélecteur reste là, et le professeur peut toujours en
    // décider autrement.
    if (rendu.portrait && !ficheEnPortrait()) reglerFichePortrait(true);
    // ET LA PAGE PREND CE SENS TOUT DE SUITE. Elle ne le prenait qu'à la fin de
    // l'ouverture, au moment de régler le sélecteur : entre-temps la
    // disposition par défaut se calculait sur une feuille couchée alors que la
    // fiche allait sortir debout — et l'on n'obtenait le bon nombre de blocs
    // qu'en touchant un réglage, n'importe lequel.
    orienterPage(ficheEnPortrait());

    const modal = assurerModale();
    const apercu = modal.querySelector('#fp-apercu');
    const combienEl = modal.querySelector('#fp-combien');
    const totalEl = modal.querySelector('#fp-total');
    const btnSol = modal.querySelector('#fp-voir-sol');

    // Le papier PROPOSE, le professeur DISPOSE — voir `printParcours.js`.
    const reglages = { ...(exo.printParams || {}), ...(params || {}) };
    // Le titre imprimé. « L'échiquier, une grille à deux entrées » est le titre
    // de l'exercice de repérage ; une planche composée à la main n'est pas cet
    // exercice-là, et coiffer la feuille du professeur d'une consigne qu'il
    // n'a pas écrite serait la lui prendre.
    const titreFiche = (atelier && atelier.titre) || rendu.titre;
    let items = [];
    let solutionsVisibles = false;

    // Le rendu sait mieux que la modale comment il tient sur une page : un
    // sudoku va par douze, un logigramme par deux. Il le disait déjà en
    // colonnes et en lignes ; on n'en garde que le PRODUIT — le nombre qu'il
    // conseille — et les bornes.
    //
    // ET L'EXERCICE PEUT LE DIRE MIEUX QUE LUI. Trois exercices partagent le
    // rendu de l'opération posée — l'addition, la multiplication, la division
    // — et Rémy en veut cinq colonnes pour la première, quatre pour les deux
    // autres : un défaut par RENDU ne sait pas l'écrire. `colonnesPapier`, que
    // les fiches de questions lisaient déjà, vaut donc aussi pour les grilles.
    const proportionsStatiques = typeof rendu.proportions === 'function'
        ? rendu.proportions([]) : rendu.proportions;
    const dispo = exo.colonnesPapier > 0
        ? dispositionEnColonnes(exo.colonnesPapier, rendu, PAGE,
            { proportions: proportionsStatiques, colles: !!rendu.blocsColles })
        : dispositionDuRendu(rendu);
    const combienDefaut = Math.max(1, (dispo.cols || 3) * (dispo.rows || 4));
    // PLUSIEURS FEUILLES, QUAND LE RENDU LE PERMET.
    //
    // Rémy, sur le memory : « mets 8 paires ou 16 paires (2 pages du coup) ou
    // 24 paires (3 pages) ». Une fiche de grilles tenait sur UNE page — et
    // pour un jeu à découper c'est une limite arbitraire : les cartes du
    // second feuillet se découpent exactement comme celles du premier.
    //
    // La page reste l'unité : `parPage` est le nombre de blocs qui la
    // remplissent — celui du défaut, choisi pour que la planche soit pleine —,
    // et l'on en empile autant qu'il faut, toutes identiques. La disposition
    // ne se recalcule PAS sur le total : deux feuilles de la même fiche
    // doivent se découper du même coup de massicot.
    const parPage = rendu.plusieursPages ? combienDefaut : capaciteMax(dispo);
    const PAGES_MAX = 6;
    const plafond = rendu.plusieursPages ? parPage * PAGES_MAX : capaciteMax(dispo);
    const lireCombien = () =>
        Math.max(1, Math.min(plafond, Math.round(Number(combienEl.value)) || combienDefaut));
    // LE PROFESSEUR DIT COMBIEN, LA FEUILLE TROUVE COMMENT. Trois colonnes et
    // quatre lignes, c'était à lui de le résoudre ; ce n'est pas sa question.
    // LA PROPORTION D'UN BLOC PEUT DÉPENDRE DE CE QU'IL CONTIENT. Un tableau de
    // conversion à huit lignes n'a pas la même forme qu'un à quatre : une
    // proportion fixe convenait à l'un et écrasait l'autre — c'est ainsi que
    // les questions du tableau suivant venaient s'écrire par-dessus les
    // dernières du précédent. Un rendu peut donc déclarer une fonction, à qui
    // l'on passe les grilles tirées.
    const proportionsDe = () => (typeof rendu.proportions === 'function'
        // `items` peut être encore vide au tout premier appel : le rendu doit
        // alors répondre pour une liste vide, ce que la conversion fait en
        // retombant sur son nombre de lignes par défaut.
        ? rendu.proportions(items)
        : rendu.proportions);
    const disposerPour = (n) => choisirDisposition(Math.min(n, parPage), dispo, PAGE, {
        proportions: proportionsDe(), colles: !!rendu.blocsColles
    });
    /** Les blocs découpés en feuilles pleines, la dernière incomplète. */
    const enPages = (n) => {
        const combien = Math.max(1, Math.ceil(n / parPage));
        return Array.from({ length: combien }, (_, i) => ({
            debut: i * parPage, fin: Math.min(n, (i + 1) * parPage)
        }));
    };

    // Graine fraîche par grille : chaque fiche est différente. Les grilles ne
    // sont RETIRÉES qu'en cas de besoin (plus de cases), jamais régénérées à
    // l'ouverture des solutions — l'aperçu doit montrer les mêmes grilles.
    const completer = (total) => {
        // Les diagrammes de l'atelier sont donnés : on ne complète pas, et on
        // ne rogne pas non plus — la feuille montre ce qui a été composé.
        if (atelier) return;
        while (items.length < total) {
            // On passe au générateur ce qui a DÉJÀ été tiré : un logigramme
            // change alors d'histoire à chaque grille au lieu de resservir la
            // boulangerie trois fois sur la même feuille.
            items.push(generator.generate(reglages, {
                rng: makeRng(), index: items.length,
                // UNE FICHE EST DU PAPIER, et un générateur a le droit de le
                // savoir : la feuille de questions le disait déjà, la feuille
                // de grilles non. C'est ce qui permet à un axe gradué d'y
                // porter trois points nommés là où l'écran n'en pose qu'un.
                papier: true,
                themesExclus: items.map(it => it.meta && it.meta.theme).filter(Boolean)
            }));
        }
        items.length = total;
    };

    // LE CHAMP DOIT DIRE LA VÉRITÉ. Un tableau de proportionnalité ne tient
    // qu'à deux par ligne ; taper « 30 » donne le maximum possible, mais si le
    // champ affiche toujours 30 et que le compte ne bouge pas, on croit
    // l'interface cassée alors qu'elle borne en silence. On réécrit donc la
    // valeur retenue, et les boutons − / + s'éteignent aux bornes.
    const recaler = (n) => {
        if (combienEl.value !== '') combienEl.value = String(n);
        combienEl.max = String(plafond);
        modal.querySelectorAll('.fp-pas-btn').forEach(b => {
            b.disabled = Number(b.dataset.pas) > 0
                ? n >= plafond
                : n <= (rendu.plusieursPages ? parPage : 1);
        });
    };

    const rendre = () => {
        // Une planche composée à la main porte ce qu'on y a posé, ni plus ni
        // moins : c'est le nombre de diagrammes qui commande, pas le champ.
        const n = atelier ? Math.max(1, items.length) : lireCombien();
        if (!atelier) recaler(n);
        const { cols, rows, cote } = disposerPour(n);
        completer(n);
        // « tableaus », « bateaus »… Un pluriel fautif dans une interface de
        // professeur de français-et-maths ne passe pas : le rendu peut donner
        // le sien, sinon on ajoute un « s » (ou rien s'il y en a déjà un).
        const un = rendu.nomBloc || 'Grille';
        const plusieurs = rendu.nomBlocs || (/(au|eu|eau)$/.test(un) ? `${un}x` : `${un}s`);
        // ET LA TAILLE, EN CENTIMÈTRES. C'est la conséquence du nombre, et la
        // seule chose qu'on voulait vraiment savoir en réglant « colonnes » :
        // est-ce que les élèves auront la place d'écrire dedans ?
        totalEl.textContent = `${n} ${(n > 1 ? plusieurs : un).toLowerCase()}`
            + ` · ${coteLisible(cote)}`;

        // L'échelle vient de la place disponible : la page garde son format.
        const large = apercu.parentElement.clientWidth || 720;
        const k = large / PAGE.w;
        const feuilles = enPages(n);
        const hFeuille = PAGE.h * k;
        // UNE FEUILLE OU PLUSIEURS. À une seule, le cadre EST la page — c'est
        // le cas de presque toutes les fiches, et rien ne bouge. À plusieurs,
        // le cadre devient transparent et chaque feuille porte son papier.
        apercu.classList.toggle('fp-apercu--pages', feuilles.length > 1);
        apercu.style.width = `${PAGE.w * k}px`;
        apercu.style.height = `${hFeuille * feuilles.length + 12 * (feuilles.length - 1)}px`;

        const { slots, traits } = calculerFiche(cols, rows, !!rendu.blocsColles, proportionsDe(),
            !!rendu.serrerColonnes);
        const en = PAGE.marge * k;
        const nomBloc = rendu.nomBloc || 'Grille';
        const pageHtml = (feuille, iFeuille) => {
        let html = `
            <div class="fp-entete fp-entete--partage" style="left:${en}px; right:${en}px; top:${(PAGE.marge + 1) * k}px;">
                <b>${titreFiche}${solutionsVisibles ? ' — ' + (rendu.nomSolutions || 'Solutions') : ''}${
    feuilles.length > 1 ? ` (${iFeuille + 1}/${feuilles.length})` : ''}</b>
                <span>Nom : ............  Date : ......</span>
            </div>
            <div class="fp-ligne" style="left:${en}px; right:${en}px; top:${(PAGE.marge + 8) * k}px;"></div>`;
        // La consigne aussi : l'aperçu doit montrer la feuille telle qu'elle
        // sortira de l'imprimante, consigne comprise.
        if (!solutionsVisibles) {
            html += `<div class="fp-consigne" style="left:${en}px; right:${en}px;
                top:${(PAGE.marge + 9.4) * k}px; font-size:${3.03 * k}px">${echapperSheet(rendu.consigne(items))}</div>`;
        }
        if (rendu.separateurs) {
            traits.forEach(t => {
                html += `<div class="fp-separateur" style="left:${t.x1 * k}px; top:${t.y1 * k}px;
                    width:${Math.max(1, (t.x2 - t.x1) * k)}px; height:${Math.max(1, (t.y2 - t.y1) * k)}px"></div>`;
            });
        }
        items.slice(feuille.debut, feuille.fin).forEach((item, j) => {
            const i = feuille.debut + j;
            const slot = slots[j];
            // Centré au-dessus d'une grille carrée ; à gauche pour un bloc
            // large, où le milieu tombe en plein dans le texte de l'énigme.
            html += rendu.blocsColles ? ''
                : rendu.titreAGauche
                ? `<div class="fp-titre fp-titre--gauche" style="left:${slot.boite.x * k}px;
                    width:${slot.boite.w * k}px; top:${(slot.titre.y - 3.6) * k}px;
                    font-size:${Math.max(8, 3.2 * k)}px">${nomBloc} ${i + 1}</div>`
                : `<div class="fp-titre" style="left:${(slot.titre.x - 20) * k}px; width:${40 * k}px; top:${(slot.titre.y - 3.6) * k}px; font-size:${Math.max(8, 3.2 * k)}px">${nomBloc} ${i + 1}</div>`;
            html += rendu.previewGrille(item, slot, k, solutionsVisibles, i, items);
            // ON CHANGE UNE GRILLE EN CLIQUANT DESSUS.
            //
            // « Autres grilles » refait la feuille entière : quand une seule
            // grille ne convient pas — trop facile, un mot qu'on ne veut pas,
            // une position déjà donnée l'an dernier —, on perdait les onze
            // autres pour la remplacer. Le bloc lui-même est donc un bouton.
            if (atelier) return;
            const bo = slot.boite;
            html += `<button type="button" class="fp-bloc" data-bloc="${i}"
                title="Changer cette grille"
                style="left:${bo.x * k}px; top:${(bo.y - 4) * k}px;
                width:${bo.w * k}px; height:${(bo.h + 4) * k}px"><span>${refaireSvg(14)} Autre</span></button>`;
        });
        return html;
        };
        const tout = feuilles.length === 1
            ? pageHtml(feuilles[0], 0)
            : feuilles.map((f, i) => `<div class="fp-feuille" style="top:${
    i * (hFeuille + 12)}px; width:${PAGE.w * k}px; height:${hFeuille}px">${pageHtml(f, i)}</div>`).join('');
        // L'ENCRE DU MODE, POSÉE SUR LA CHAÎNE ELLE-MÊME : c'est la porte
        // unique par où passent toutes les couleurs de l'aperçu.
        apercu.innerHTML = teindreHtml(tout);

        apercu.querySelectorAll('[data-bloc]').forEach(b => {
            b.onclick = () => {
                const i = Number(b.dataset.bloc);
                // On exclut ce que portent les AUTRES blocs, pas celui-ci :
                // sinon la grille qu'on veut changer s'interdit elle-même de
                // revenir, et le tirage se rétrécit à chaque clic.
                items[i] = generator.generate(reglages, {
                    rng: makeRng(), index: i,
                    themesExclus: items
                        .filter((_, j) => j !== i)
                        .map(it => it.meta && it.meta.theme).filter(Boolean)
                });
                rendre();
            };
        });
    };

    combienEl.value = String(combienDefaut);
    combienEl.max = String(plafond);
    // « input » et pas seulement « change » : la feuille suit la frappe, sans
    // qu'il faille sortir du champ pour voir ce qu'on a demandé.
    combienEl.oninput = rendre;
    combienEl.onchange = rendre;
    // LE PAS SUIT LA FEUILLE. Sur une fiche qui se pagine, ajouter un bloc à
    // la fois ouvre une page pour une carte : le bouton avance d'une FEUILLE
    // entière — huit paires de memory —, ce qui est aussi ce que Rémy demande
    // (« 8 paires ou 16 paires ou 24 paires »).
    const pas = rendu.plusieursPages ? parPage : 1;
    modal.querySelectorAll('.fp-pas-btn').forEach(b => {
        b.setAttribute('aria-label', Number(b.dataset.pas) < 0
            ? `${pas} de moins` : `${pas} de plus`);
        b.onclick = () => {
            combienEl.value = String(lireCombien() + Math.sign(Number(b.dataset.pas)) * pas);
            rendre();
        };
    });
    // Une planche d'atelier ne se compte pas depuis cette fenêtre : on y
    // ajoute ou l'on y retire un damier dans l'atelier lui-même.
    modal.querySelector('.fp-combien').classList.toggle('fp-combien--fige', !!atelier);
    // Le choix couleur / noir et blanc : il vaut pour CETTE fiche, et devient
    // le choix par défaut des suivantes. Un professeur qui imprime en noir et
    // blanc le fait pour toute l'année, pas pour une feuille.
    const couleurEl = modal.querySelector('#fp-couleur');
    retenirRepli(modal.querySelector('#fp-plus'), 'grilles');
    // LES QUATRE MODES SONT ÉNUMÉRÉS UNE FOIS, dans ficheRendu.js : trois
    // listes recopiées à la main dériveraient, et un mode absent d'une liste
    // serait un réglage impossible à choisir sur cette fiche-là.
    couleurEl.innerHTML = optionsPolycopie();
    couleurEl.value = modePolycopie();
    couleurEl.onchange = () => {
        reglerModePolycopie(couleurEl.value);
        poserTeinte(modal.querySelector('#fp-apercu'));
        rendre();
    };
    poserTeinte(modal.querySelector('#fp-apercu'));
    // L'ORIENTATION DE LA FEUILLE. Comme la couleur : elle vaut pour celle-ci,
    // et devient le défaut des suivantes.
    const orientEl = modal.querySelector('#fp-orientation');
    orientEl.value = ficheEnPortrait() ? 'portrait' : 'paysage';
    orienterPage(ficheEnPortrait());
    orientEl.onchange = () => {
        reglerFichePortrait(orientEl.value === 'portrait');
        orienterPage(ficheEnPortrait());
        rendre();
    };

    // --- ① QUOI : LES RÉGLAGES DE L'EXERCICE, dans la fiche -----------------
    //
    // Le générateur dit ce qu'il sait faire varier ; le catalogue dit sous
    // quels mots et dans quel ordre. On prenait le premier seulement, et cinq
    // réglages qui changent VRAIMENT la feuille n'y étaient pas réglables :
    // l'histoire d'un logigramme, la difficulté d'un futoshiki, le niveau de
    // Pythagore, le départ d'un mat en un coup, le nombre de termes d'une
    // opération posée. La règle est maintenant dans `core/reglagesFiche.js`,
    // avec les tests qui la tiennent.
    //
    // Rien du tout pour un atelier : les diagrammes y sont composés à la main.
    const contenuEl = modal.querySelector('#fp-contenu');
    if (atelier || !generator) {
        contenuEl.hidden = true;
        contenuEl.innerHTML = '';
    } else {
        monterPanneauContenu(contenuEl, {
            exo, schemaCatalogue: paramSchemaOf(exo), generator, reglages,
            // Un réglage changé RETIRE les grilles : elles ont été tirées avec
            // l'ancien, et garder un sudoku 6 × 6 sur une fiche réglée en 9 × 9
            // ferait mentir l'aperçu.
            onChange: () => { items = []; rendre(); }
        });
    }

    const btnRegen = modal.querySelector('#fp-regen');
    btnRegen.onclick = () => { items = []; rendre(); };
    // Rien à retirer au sort, et rien à corriger : l'atelier n'a ni tirage ni
    // solution. Les deux boutons se cachent plutôt que de ne rien faire.
    btnRegen.style.display = atelier ? 'none' : '';
    btnSol.style.display = atelier ? 'none' : '';

    // L'ATELIER SE TROUVE OÙ L'ON PENSE DÉJÀ À IMPRIMER. Le professeur qui
    // regarde une fiche d'échiquiers tirée au sort est exactement celui qui
    // voudra poser SA position — et il ne le cherchera pas dans un menu.
    // Une planche composée à la main n'a pas de corrigé à produire : promettre
    // une page de solutions qui ne viendra pas serait un mensonge d'interface.
    modal.querySelector('#fp-note').textContent = atelier
        ? 'Une page, avec un en-tête Nom / Date. Reviens à l\'atelier pour ajouter ou retirer un damier.'
        : 'Page 1 : les grilles, avec un en-tête Nom / Date. '
          + 'Page 2 : les solutions — à garder pour soi ou à donner après.';

    const btnAtelier = modal.querySelector('#fp-atelier');
    btnAtelier.style.display = (!atelier && exo.printable === 'echiquier') ? '' : 'none';
    btnAtelier.onclick = () => {
        modal.style.display = 'none';
        import('./echiquierAtelier.js').then(m => m.ouvrirAtelierEchiquier());
    };
    btnSol.onclick = () => {
        solutionsVisibles = !solutionsVisibles;
        btnSol.textContent = solutionsVisibles ? 'Voir les grilles' : 'Voir les solutions';
        btnSol.setAttribute('aria-pressed', String(solutionsVisibles));
        rendre();
    };
    modal.querySelector('#fp-fermer').onclick = () => { modal.style.display = 'none'; };

    const btnDl = modal.querySelector('#fp-telecharger');
    btnDl.onclick = () => {
        btnDl.disabled = true;
        const n = atelier ? Math.max(1, items.length) : lireCombien();
        const { cols, rows } = disposerPour(n);
        chargerJsPDF()
            .then(jsPDF => {
                // Un plateau de jeu vide n'a pas
                // de correction — la page de solutions serait le même plateau,
                // toujours vide, et une feuille de plus à photocopier.
                const doc = construirePdf(jsPDF, rendu, items, cols, rows, titreFiche,
                    !!atelier || !!rendu.sansSolution, rendu.plusieursPages ? parPage : 0);
                doc.save(`${(atelier && atelier.nom) || exo.printable}-${items.length}.pdf`);
            })
            .catch(() => {
                import('./modal.js').then(m => m.showAlert(
                'Le générateur de PDF n\'a pas pu être chargé. Recharge la page : '
                + 'la bibliothèque est servie avec l\'application, elle ne dépend d\'aucun site extérieur.'));
            })
            .finally(() => { btnDl.disabled = false; });
    };

    items = atelier ? atelier.items.slice() : [];
    solutionsVisibles = false;
    btnSol.textContent = 'Voir les solutions';
    // La disposition part du NOMBRE de diagrammes composés : deux échiquiers
    // demandés ne s'impriment pas sur une grille de quatre cases vides. C'est
    // désormais la règle générale, et l'atelier n'a plus de cas à part — il
    // dit seulement que le nombre ne se règle pas ici.
    // De quoi se redessiner quand la fenêtre change de taille : détacher,
    // replier ou tirer le coin change la largeur disponible, et l'aperçu
    // calcule son échelle dessus.
    modal._flotRendre = () => rendre();
    // Une seule fenêtre d'aperçu — voir `fermerAutreFiche`.
    fermerAutreFiche('print-sheet-modal');
    modal.style.display = 'flex';
    // ANCRÉE PAR DÉFAUT, POUR TOUT LE MONDE — Y COMPRIS SOUS LA BARRE DE PASSE.
    // Rémy : « quand la barre de début test (le banc de test), la modale
    // d'impression (PDF) doit être comme avant en prenant une partie de
    // l'écran. » La barre de passe l'ouvrait détachée, au prétexte qu'une
    // modale qui bloque ne peut pas accompagner une passe de cent exercices —
    // c'est la BARRE qu'on a remontée au-dessus de la fiche, pas la fiche
    // qu'on met de côté. `opts.flottant` ne dit donc plus « détache-toi » mais
    // seulement « cette fiche suit l'exercice qu'on regarde ».
    //
    // Le mode détaché ne se restaure QUE si l'interrupteur d'auteur est
    // allumé : sans cela, un seul clic pendant une passe laissait une fenêtre
    // baladeuse à tous ceux qui ouvraient une fiche ensuite.
    fenetreFiche.majDetachable();
    if (fenetresDetachables() && lireModeFenetre() === 'detache') fenetreFiche.detacher();
    else fenetreFiche.ancrer();
    rendre();
}
