// LA FICHE D'UN PARCOURS — le parcours de l'écran, sur papier.
//
// Le professeur a déjà composé sa séance : trois exercices, dans cet ordre,
// avec ces réglages. La fiche est la même chose imprimée, dans la mise en page
// des manuels : UN EXERCICE = UN BLOC pleine largeur, avec son bandeau
// (« Exercice 1 — Les compléments à 10 »), sa consigne et ses questions —
// jamais deux exercices côte à côte en colonnes. À l'intérieur d'un bloc, les
// questions courtes se rangent d'elles-mêmes à deux ou trois par ligne.
//
// L'ORDRE des blocs se règle au doigt : chaque exercice de la liste se glisse
// plus haut ou plus bas, et la fiche se recompose aussitôt.
//
// Deux documents, et c'est toute la différence entre un entraînement et une
// évaluation :
//
//   FICHE D'EXERCICES  consignes imprimées, questions numérotées en continu,
//                      solutions en dernière page.
//   INTERROGATION      pas de consigne (elle a été donnée en classe), un
//                      barème par exercice, de la place pour ÉCRIRE sous
//                      chaque question, et la page des solutions qui reste
//                      dans la main du professeur.
//
// Les étapes qui n'existent pas sur papier — un jeu d'arcade, un rapporteur à
// manœuvrer — sont ANNONCÉES comme telles plutôt que silencieusement omises.

import { hydratePath } from '../core/path.js';
import { generateurDeFiche } from '../core/registry.js';
import { paramSchemaOf } from '../data/catalog.js';
import { fieldHtml, readParams, wireTips } from '../games/configUI.js';
import { makeRng } from '../core/ids.js';
import { espacerMilliers } from '../core/nombres.js';
import { composerBlocs, composerSolutions, repartirBareme, pageDe, porteUneFraction } from '../core/fiche.js';
import { RENDUS } from './printSheet.js';
/**
 * UN JEU À DÉCOUPER NE SE TIRE QU'À UN EXEMPLAIRE.
 *
 * Rémy : « pour la tour de hanoi, les grenouilles et le parking, pour
 * l'impression, une seule colonne, pas plus, et aussi mettre une seule fois
 * l'exercice. » La feuille du parcours demandait six « grilles » par défaut,
 * comme pour un sudoku : elle sortait six Tours de Hanoï identiques sur deux
 * pages. Une série de sudokus a un sens — on en fait un, puis un autre ; six
 * fois le même plateau à découper n'en a aucun. Le rendu le déclare
 * (`unique`), la feuille et l'engrenage s'y tiennent.
 */
const unExemplaire = (e) => !!(e && e.grille && RENDUS[e.grille] && RENDUS[e.grille].unique);

/** La proportion d'un rendu : une valeur, ou une fonction des grilles. */
const proportionsRendu = (rendu, tire) => (typeof rendu.proportions === 'function'
    ? rendu.proportions((tire || []).map(g => g.item))
    : rendu.proportions);

/**
 * « PLEIN » : LE BLOC PREND LA PAGE — et la fiche de parcours l'ignorait.
 *
 * Rémy, sur les grenouilles, le parking et la Tour de Hanoï : « tu n'as pas
 * profité de l'espace et un seul pour le pdf ».
 *
 * Les trois rendus DÉCLARENT pourtant `proportions: 'plein'`, et la fiche d'un
 * exercice seul le respecte depuis longtemps. Mais dans un PARCOURS, la
 * proportion se lit par `proportions?.h` — or « plein » est une CHAÎNE, et
 * `'plein'.h` vaut `undefined`. Le bloc retombait donc sur le carré par défaut,
 * plafonné à SOIXANTE-DIX-HUIT MILLIMÈTRES : quarante-trois pour cent d'une
 * page de 182 mm. Les nénuphars faisaient huit millimètres, et l'on demandait
 * à l'élève d'y poser une grenouille découpée.
 *
 * On traduit donc « plein » dans ce que la mise en page comprend : aucun
 * plafond de largeur, et un rapport hauteur/largeur égal à celui de la zone
 * utile — le bloc épouse la page au lieu de s'inscrire dans un carré.
 */
const EST_PLEIN = (rendu, tire) => proportionsRendu(rendu, tire) === 'plein';
// La consigne de repli se coupe comme sur la fiche d'un exercice seul : même
// règle, même fonction — deux copies auraient divergé au premier ajustement.
import { premierePhrase } from './printQuestions.js';
// Les réglages qu'on ne règle qu'une fois se rangent derrière un repli.
import { retenirRepli } from './repli.js';
import { brancherFicheDirecte } from './ficheDirecte.js';
import { MODES, resolvePolicy } from '../core/policy.js';
import { chargerJsPDF } from './printSheet.js';
import {
    mesureur, echapper, apercuItems, apercuEntete, entetePdf, pdfItems, pourPdf, ENCRE,
    cartoucheDe, hauteurEntete1, apercuSolutions, pdfSolutions,
    polycopieEnCouleur, modePolycopie, reglerModePolycopie, teindreDoc, poserTeinte, teindreHtml, optionsPolycopie
} from './ficheRendu.js';

/**
 * Les étapes du parcours, triées en « imprimables » et « à l'écran seulement ».
 * On ne devine pas : c'est le générateur qui déclare `ecrit`.
 */
export function analyserParcours(chemin) {
    const { steps } = hydratePath(chemin);
    const papier = [], ecran = [];
    for (const s of steps) {
        const gen = generateurDeFiche(s.exercise);
        // Deux façons d'aller sur le papier, et la seconde manquait : un
        // sudoku, un binairo, un garam n'ont pas de « questions » mais des
        // GRILLES, et ce sont justement les exercices qu'on fait le plus
        // volontiers sur feuille — on y rature, on note ses candidats, on
        // gomme. Ils étaient rangés en « écran seulement », ce qui est faux.
        const grille = s.exercise.printable && RENDUS[s.exercise.printable] ? s.exercise.printable : null;
        // LES RÉGLAGES DU PAPIER PAR-DESSUS CEUX DE L'ÉCRAN. Un exercice peut
        // demander autre chose sur la feuille que dans le jeu — « Poser une
        // multiplication » se joue avec le réglage d'écran mais s'imprime avec
        // `operation: '×'`, que le générateur de fiche est seul à comprendre.
        // Le champ existait, il n'était lu que par la fiche d'UN exercice :
        // dans un parcours, les quatre opérations posées sortaient toutes en
        // additions.
        // LES RÉGLAGES DU PAPIER SONT DES DÉFAUTS, PAS DES ORDRES.
        //
        // Rémy, sur quatre exercices d'affilée : « les paramètres ne
        // fonctionnent pas ». C'était `{...params, ...printParams}` : ce que le
        // professeur venait de choisir dans l'engrenage était systématiquement
        // écrasé par la valeur du catalogue. DIX-SEPT exercices avaient ainsi
        // des réglages morts sur papier — le tableau de conversion, les
        // grenouilles, le parking, la Tour de Hanoï, le mot codé, les mots
        // croisés… On avait bien écrit la consigne « ne répète pas dans
        // `printParams` ce que l'écran règle déjà », mais une consigne qu'on
        // doit tenir à la main finit toujours par lâcher.
        //
        // L'ordre inverse dit la seule chose vraie : le papier propose, le
        // professeur dispose. `printParams` garde tout son sens pour ce que
        // l'écran NE RÈGLE PAS — `operation: '×'`, `miseEnPage: 'empile'` —,
        // qui n'apparaît dans aucun panneau et s'applique donc toujours.
        const params = { ...(s.exercise.printParams || {}), ...(s.params || {}) };
        if (gen && (gen.ecrit || grille)) papier.push({ ...s, params, generator: gen, grille });
        else ecran.push(s);
    }
    return { papier, ecran, total: steps.length };
}

/**
 * LES RÉGLAGES DE CONTENU D'UNE ÉTAPE, tels que la FEUILLE les comprend.
 *
 * On réglait la mise en page — combien de questions, sur combien de colonnes —
 * et rien du contenu : pour changer les tables d'une fiche de multiplications,
 * il fallait ressortir de la fiche, rouvrir l'exercice, régler, et revenir.
 * Ce sont pourtant les réglages qu'on touche le plus.
 *
 * Le catalogue propose un schéma taillé pour l'exercice (`paramSchema`) : on
 * le préfère, il est écrit pour le professeur, avec ses libellés et ses aides.
 * Mais on n'en garde que ce que le GÉNÉRATEUR DE FICHE sait lire — un réglage
 * d'activité (la vitesse du jeu, le chronomètre) n'a aucun effet sur une
 * photocopie, et le montrer là ferait croire le contraire. Quand la feuille a
 * son propre générateur (`printGeneratorId`), ce sont ses réglages à lui qu'on
 * montre : c'est lui qui fait le papier.
 */
function schemaPapier(etape) {
    const params = (etape.generator && etape.generator.params) || [];
    if (!params.length) return [];
    // ON PART DES RÉGLAGES DU GÉNÉRATEUR DE FICHE, PAS DE CEUX DU CATALOGUE.
    //
    // Rémy : « les exercices 8, 9, 10 n'ont pas d'option ». Ils en avaient
    // une, et ce n'était pas la bonne. On croisait les deux listes et l'on ne
    // gardait que l'intersection — si bien qu'un réglage connu du seul
    // générateur de fiche disparaissait. Or c'est précisément celui-là qui
    // décide de la feuille : `sens` (lire les hiéroglyphes ou les écrire),
    // `mode` (placer un point ou lire ses coordonnées), `operation` (poser une
    // addition ou une division). Dix-huit exercices étaient ainsi amputés du
    // réglage qui change tout, et deux d'entre eux n'en montraient plus qu'un.
    //
    // Le catalogue garde son mot à dire : quand il décrit le même réglage, on
    // prend SA version — libellé et aide y sont écrits pour le professeur.
    // `papier: false` retire un réglage qui ne concerne que l'écran — la
    // tolérance du rapporteur, le nombre de propositions : sur une photocopie
    // ce sont des boutons qui ne changent rien.
    const duCatalogue = new Map((paramSchemaOf(etape.exercise) || [])
        .filter(p => p && p.id).map(p => [p.id, p]));
    return params.map(p => duCatalogue.get(p.id) || p).filter(p => p && p.papier !== false);
}

/**
 * LES RÉGLAGES DU CONTENU, LÀ OÙ ON LES CHERCHE.
 *
 * Rémy : « la loupe sur la droite à l'impression en aperçu n'a pas de
 * paramètre ». Elle en avait un — « Le pas de la graduation », que sa propre
 * consigne mentionne — mais il n'existait QUE dans la roue de l'aperçu de page,
 * posée à côté de la feuille. Personne ne va l'y chercher : les réglages d'une
 * étape se règlent dans la LIGNE de l'étape, avec la consigne et le nombre de
 * grilles. Ils sont donc aux deux endroits, avec le même rendu (fieldHtml) et
 * la même relecture (readParams) — deux entrées, un seul traitement, sinon les
 * deux finissent par diverger.
 *
 * Écrit ici, hors de tout gabarit : imbriqué dans le littéral de la liste, il
 * aurait fallu des accents graves à l'intérieur d'accents graves — et le
 * littéral se serait fermé au premier.
 */
function blocContenu(e, id) {
    const sch = schemaPapier(e);
    if (!sch.length) return '';
    const champs = sch.map(p => fieldHtml(p,
        e.params[p.id] !== undefined ? e.params[p.id] : p.default)).join('');
    return '<div class="pp-etape-contenu" data-contenu="' + id + '">'
        + '<span class="pp-etape-sous-titre">Contenu des questions</span>'
        + champs + '</div>';
}

/** Les grilles d'une étape à grilles, tirées comme les questions. */
function grillesDe(etape, nb) {
    const out = [];
    for (let i = 0; i < nb; i++) {
        // `themesExclus` : ce qui a déjà servi dans cette étape. Un générateur
        // qui a des histoires (le logigramme) en change à chaque grille ; les
        // autres n'en tiennent pas compte.
        out.push({
            cle: etape.grille,
            item: etape.generator.generate(etape.params, {
                index: i, rng: makeRng(),
                themesExclus: out.map(g => g.item.meta && g.item.meta.theme).filter(Boolean)
            })
        });
    }
    return out;
}

/** Tire les questions d'une étape, avec les réglages voulus par le professeur. */
function questionsDe(etape, nb) {
    const vus = new Set();
    const out = [];
    for (let essai = 0; out.length < nb && essai < nb * 12; essai++) {
        // `papier: true` : le générateur sait qu'il écrit pour une feuille, et
        // peut poser autre chose que sa question d'écran — voir printQuestions.
        const item = etape.generator.generate(etape.params,
            { index: out.length, rng: makeRng(), papier: true });
        // `papier` : la même question, écrite pour la feuille — sans la
        // consigne répétée devant chaque ligne. À défaut, le texte d'écran.
        const texte = (item.prompt && (item.prompt.papier || item.prompt.text)) || '';
        if (vus.has(texte) && essai < nb * 6) continue;
        vus.add(texte);
        out.push({
            texte,
            // Le tableau de l'énoncé, dessiné par la mise en page.
            tableau: (item.prompt && item.prompt.tableau) || null,
            // LE MÊME PIÈGE QUE POUR LA RÉPONSE, un cran plus loin : le
            // libellé d'une proposition est fait pour l'ÉCRAN. Une fraction y
            // est du HTML — deux span empilés —, et une égalité de Thalès
            // aussi depuis qu'elle s'écrit en colonnes. `formaterReponse` le
            // savait déjà pour la bonne réponse ; la liste du QCM, elle,
            // imprimait « <span class="fraction">… » en toutes lettres.
            choix: item.choices ? item.choices.map(texteDeProposition) : null,
            reponse: formaterReponse(item),
            // Le générateur dit si ses questions portent des fractions : la
            // mise en page les écrira alors en colonne.
            fractions: !!etape.generator.fractions && porteUneFraction(texte, item.answer),
            // L'explication du générateur : c'est elle qui fait la feuille de
            // solutions détaillée, celle qu'on distribue après le contrôle.
            // LA VERSION PAPIER D'ABORD quand elle existe : une correction qui
            // décrit un dessin absent de la feuille n'explique rien.
            explication: item.explicationPapier || item.explanation || ''
        });
    }
    return out;
}

/**
 * Une proposition telle qu'on l'ÉCRIT sur le papier.
 *
 * `texte` d'abord — c'est le champ que les générateurs remplissent quand leur
 * libellé est un dessin —, puis le libellé s'il est en clair, et la valeur
 * sinon : elle, elle est toujours du texte, puisqu'elle sert de clé de réponse.
 */
function texteDeProposition(c) {
    if (c.texte) return String(c.texte);
    const brut = String(c.label ?? c.value ?? '');
    return /[<>]/.test(brut) ? String(c.value ?? '') : brut;
}

function formaterReponse(item) {
    // LA RÉPONSE DU PAPIER N'EST PAS TOUJOURS CELLE DE L'ÉCRAN.
    //
    // L'écran demande UN nombre — c'est ce que rend un pavé numérique. La
    // feuille, elle, peut demander quatre cases d'un tableau de valeurs : le
    // corrigé imprimait alors la dernière, seule, en face d'une question qui en
    // posait quatre. Le générateur écrit donc ce qu'il faut lire, quand ce n'est
    // pas la même chose.
    if (item.reponsePapier) return String(item.reponsePapier);
    if (item.answerKind === 'choice' && item.choices) {
        const bonne = item.choices.find(c => c.correct);
        // LE LIBELLÉ D'UNE RÉPONSE EST FAIT POUR L'ÉCRAN, pas pour le papier :
        // une fraction y est du HTML — deux span empilés — et le corrigé
        // imprimait « 5/7 + 4/7 = <span class="fraction"><span class=… ». Sur
        // le papier, c'est la VALEUR qu'on écrit ; la mise en fraction, la
        // feuille sait la faire toute seule.
        if (bonne) return texteDeProposition(bonne);
    }
    // LES MILLIERS SE GROUPENT DANS LE CORRIGÉ AUSSI. L'énoncé écrit
    // « 92 202 » et le corrigé répondait « 90000 » : deux écritures du même
    // nombre sur la même ligne, dont une que l'on n'accepterait pas d'un
    // élève. `espacerMilliers` laisse intacte toute réponse qui n'est pas un
    // nombre — un mot, une fraction, une expression.
    return espacerMilliers(String(item.answer).replace('.', ','));
}

// --- La modale ------------------------------------------------------------------

function assurerModale() {
    let m = document.getElementById('print-parcours-modal');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'print-parcours-modal';
    m.className = 'modal-overlay modal-overlay--top';
    m.innerHTML = `
        <div class="glass-panel modal-panel-lg fp-panel">
            <h3 class="modal-title">📄 Fiche du parcours</h3>
            <!-- CE QUI NE SE VOIT PAS SUR LA FEUILLE, ET RIEN D'AUTRE.
                 Rémy : « on pourrait améliorer cela en passant par l'apercu
                 plutôt que des options j'ai l'impression que pour la fiche de
                 parcours on fait des doublons ». Le doublon n'était pas entre
                 deux panneaux : il était entre le panneau et la FEUILLE. Le
                 titre est écrit en haut de la page, « Nom : …… » est dessiné à
                 sa place, la case « … / 20 » occupe son coin — et on les
                 réglait par des champs et des cases rangés dans un repli.
                 Ces sept-là se touchent maintenant sur l'aperçu (voir
                 ui/ficheDirecte.js). Ne restent ici que les choses qu'on ne
                 peut pas cliquer parce qu'elles ne sont pas dessinées : le
                 format du papier, l'encre de l'imprimante, les champs
                 remplissables du PDF, l'endroit où va le corrigé. -->
            <div class="fp-controles">
                <label class="fq-case"><input type="checkbox" id="pp-interro"> Mode interrogation</label>
                <label class="fq-case"><input type="checkbox" id="pp-choix"> Proposer les réponses</label>
                <label class="pp-note-sur" id="pp-note-sur-champ">Note sur
                    <input type="number" id="pp-note-sur" class="cfg-input cfg-input--num"
                        min="5" max="100" step="1" value="20"></label>
                <span class="fp-total" id="pp-total"></span>
                <button type="button" class="btn-hint" id="pp-regen">🎲 D'autres questions</button>
                <span class="pp-ecran" id="pp-ecran"></span>
            </div>
            <details class="fp-repli" id="pp-plus">
                <!-- LE REPLI DIT CE QU'IL CONTIENT, REPLIÉ. C'est l'autre
                     moitié du doublon : quand on ne sait pas ce qu'il y a
                     dedans, on l'ouvre — et l'on retrouve des réglages qu'on
                     croyait avoir vus ailleurs. Un résumé vivant (« A4
                     portrait · couleur intense · corrigé à la fin ») répond à
                     la question sans qu'on ait à ouvrir. -->
                <summary>Papier, numéros et corrigé
                    <span class="fp-repli-etat" id="pp-plus-etat"></span></summary>
                <div class="fp-controles pp-mep">
                    <label>Format
                        <select id="pp-orientation" class="cfg-input">
                            <option value="portrait">A4 portrait</option>
                            <option value="paysage">A4 paysage</option>
                        </select></label>
                    <label>Impression
                        <select id="pp-couleur" class="cfg-input"></select></label>
                    <label class="fq-case"><input type="checkbox" id="pp-champs">
                        Champs remplissables (PDF)</label>
                    <label>Numéros
                        <select id="pp-numerotation" class="cfg-input">
                            <option value="continue">Qui se suivent (1, 2, 3… sur toute la feuille)</option>
                            <option value="exercice">Qui repartent à 1 à chaque exercice</option>
                        </select></label>
                    <label class="fq-case" title="Un exercice qui ne tient pas dans le bas de la page commence alors en haut de la suivante, quitte à laisser du blanc.">
                        <input type="checkbox" id="pp-insecable"> Ne pas couper un exercice entre deux pages</label>
                </div>
                <!-- LE CORRIGÉ SE RÈGLE EN UN SEUL ENDROIT.
                     Rémy : « pour la fiche du parcours, j'ai l'impression
                     d'avoir du doublon ». Il y en avait un : « Corrigé — un
                     seul PDF » trônait dans la rangée du haut pendant que
                     « Solutions » et « Colonnes » vivaient dans ce repli
                     nommé, justement, « Papier, numéros ET CORRIGÉ ». Trois
                     réglages du même objet, à deux endroits, dont l'un
                     annonçait l'autre : on ouvrait le repli pour chercher ce
                     qu'on venait de voir en haut. Ils sont maintenant sur la
                     même ligne, et la rangée du haut ne garde que ce qui
                     décide de la FEUILLE. -->
                <div class="fp-controles pp-sol-reglages">
                    <label>Corrigé
                        <select id="pp-sol-ou" class="cfg-input">
                            <option value="ensemble">Un seul PDF, solutions à la fin</option>
                            <option value="separe">Deux PDF séparés</option>
                            <option value="sans">Sans solutions</option>
                        </select></label>
                    <label data-si-corrige>Solutions
                        <select id="pp-sol-mode" class="cfg-input">
                            <option value="ultra">Ultra compact — réponses tassées, barème en couleur</option>
                            <option value="compact">Compact — juste les réponses</option>
                            <option value="normal">Normal — énoncé et réponse</option>
                            <option value="detaille">Détaillé — avec les explications</option>
                        </select></label>
                    <label data-si-corrige>Colonnes
                        <select id="pp-sol-colonnes" class="cfg-input"
                            aria-label="Colonnes de la feuille de solutions">
                            <option value="auto">auto</option>
                            <option value="1">1</option><option value="2">2</option>
                            <option value="3">3</option><option value="4">4</option>
                            <option value="5">5</option><option value="6">6</option>
                        </select></label>
                </div>
            </details>
            <div class="fp-apercu-cadre">
                <div class="fp-apercu fq-apercu" id="pp-apercu"></div>
            </div>
            <div class="fp-note" id="pp-note"></div>
            <div class="modal-actions-center">
                <button type="button" class="btn-toggle glass-btn modal-btn-flex modal-btn-flex--neutral" id="pp-fermer">Fermer</button>
                <button type="button" class="btn-toggle glass-btn primary active modal-btn-flex" id="pp-dl">⬇️ Télécharger le PDF</button>
            </div>
        </div>`;
    document.body.appendChild(m);
    return m;
}

export function ouvrirFicheParcours(chemin) {
    const { papier, ecran, total } = analyserParcours(chemin);
    const m = assurerModale();
    const mesurer = mesureur();

    const apercu = m.querySelector('#pp-apercu');
    const interro = m.querySelector('#pp-interro');
    const choixEl = m.querySelector('#pp-choix');
    const insecEl = m.querySelector('#pp-insecable');
    const totalEl = m.querySelector('#pp-total');
    // LES ACTIVITÉS QUI NE SE PHOTOCOPIENT PAS. Le message vivait au bas de la
    // liste d'exercices ; la liste ayant disparu, il rejoint la ligne d'état,
    // à côté du nombre de pages — c'est là qu'on lit ce que la feuille contient.
    const ecranEl = m.querySelector('#pp-ecran');
    if (ecranEl) {
        ecranEl.textContent = ecran.length
            ? `Sur écran seulement : ${[...new Set(ecran.map(e => e.title))].join(', ')}`
            : '';
    }
    const noteEl = m.querySelector('#pp-note');

    // CE QUI EST ÉCRIT SUR LA FEUILLE VIT ICI, ET SE TOUCHE SUR LA FEUILLE.
    //
    // Le titre par défaut est le nom du parcours — mais « Tout sur papier
    // (72 exercices) » n'est pas ce qu'on écrit en haut d'un contrôle, et il
    // s'efface d'un geste. L'en-tête est à la classe, pas au logiciel : une
    // fiche d'entraînement n'a pas besoin de la classe, un contrôle si.
    const feuille = {
        titre: chemin.name || 'Parcours',
        // LA CONSIGNE DU DEVOIR ENTIER, vide au départ : elle s'ajoute d'un
        // « + Consigne » sur la feuille. Rémy : « ajoute un plus en dessous
        // pour pouvoir mettre des consignes ».
        consigne: '',
        champs: ['nom', 'date'],
        note: false,
        commentaire: false
    };
    const modeSol = m.querySelector('#pp-sol-mode');
    const colSol = m.querySelector('#pp-sol-colonnes');
    const ouSol = m.querySelector('#pp-sol-ou');
    const orientEl = m.querySelector('#pp-orientation');
    const couleurEl = m.querySelector('#pp-couleur');
    retenirRepli(m.querySelector('#pp-plus'), 'parcours');
    const champsEl = m.querySelector('#pp-champs');
    const noteSurEl = m.querySelector('#pp-note-sur');
    const noteSurChamp = m.querySelector('#pp-note-sur-champ');
    const numEl = m.querySelector('#pp-numerotation');

    // LE PARCOURS A DÉJÀ RÉPONDU À DEUX DE CES QUESTIONS. Rémy : « j'ai
    // l'impression que pour la fiche de parcours on fait des doublons ». En
    // voici deux, et ce sont les plus coûteux : le professeur a réglé son
    // parcours en « Évaluation », noté sur 20 — et la fiche rouvrait le débat
    // avec ses propres défauts, si bien qu'un contrôle s'imprimait en fiche
    // d'entraînement à moins d'y repenser. Les réglages du parcours DICTENT
    // donc ceux de la feuille à l'ouverture ; ils restent modifiables ici,
    // parce qu'on imprime parfois un entraînement à partir d'une évaluation.
    const politique = resolvePolicy(chemin.policy);
    interro.checked = politique.mode === MODES.EVALUATION;
    if (interro.checked) feuille.note = true;
    if (politique.grading && politique.grading.scale) {
        noteSurEl.value = String(politique.grading.scale);
    }


    // LES QUESTIONS DÉJÀ TIRÉES, ÉTAPE PAR ÉTAPE.
    //
    // Et l'oubli l'est aussi. Vider toute la table quand on touche UN réglage
    // d'UN exercice retirait au sort les questions des neuf autres : on venait
    // de choisir ses tables de multiplication, et l'exercice de géométrie
    // d'à côté changeait de figure. Seul « D'autres questions », en haut,
    // rebat tout — c'est ce qu'il annonce.
    const blocs = new Map();
    const oublier = (id) => blocs.delete(id);
    const toutOublier = () => blocs.clear();
    let ordre = papier.map(e => e.stepId);
    const quantites = {};
    // LE BARÈME, exercice par exercice. Un point par question est le défaut
    // honnête, mais c'est rarement ce qu'on veut : le sudoku de fin vaut plus
    // que les dix multiplications du début, et c'est au professeur d'en
    // décider — pas au nombre de questions.
    const points = {};
    papier.forEach(e => {
        const n = Math.max(1, Math.min(40, e.nbItems || (e.grille ? 2 : 5)));
        quantites[e.stepId] = unExemplaire(e) ? 1 : (e.grille ? Math.min(6, n) : n);
    });
    // LA MISE EN PAGE, EXERCICE PAR EXERCICE. Pour les questions c'est un
    // nombre de colonnes, pour les grilles un nombre par ligne : dans les deux
    // cas « combien en met-on côte à côte », donc un seul réglage.
    // « auto » convient à la plupart, mais un exercice sait souvent mieux :
    // trois colonnes pour des nombres en lettres, six pour comparer deux
    // fractions. Le professeur garde la main sur le réglage.
    const colonnes = {};
    papier.forEach(e => {
        colonnes[e.stepId] = unExemplaire(e) ? 1 : (e.exercise.colonnesPapier || 'auto');
    });
    // NUMÉROTER, OU NON, EXERCICE PAR EXERCICE. Par défaut oui — c'est ce
    // qu'on attend d'une fiche. Mais six grilles de sudoku appelées « 7. » à
    // « 12. » n'y gagnent rien : ce qu'on écrit dedans n'est pas la réponse à
    // une question numérotée, c'est la grille elle-même.
    const numeroter = {};
    papier.forEach(e => { numeroter[e.stepId] = true; });
    // LA CONSIGNE ÉCRITE, ET MODIFIABLE.
    //
    // Une consigne d'écran et une consigne de feuille ne se ressemblent pas :
    // l'écran peut expliquer, donner un exemple, rappeler le piège — il a la
    // place et l'élève est devant. Sur le papier, la consigne est écrite une
    // fois en tête de l'exercice, elle ne se répète pas à chaque question, et
    // « Écris en chiffres. » suffit. Chaque exercice propose donc la sienne
    // (`consignePapier`), et le professeur la RÉÉCRIT s'il préfère la sienne :
    // c'est sa feuille, pas la nôtre.
    //
    // ET LE REPLI SE COUPE À LA PREMIÈRE PHRASE. Rémy : « pour l'énoncé des
    // puissances de 10, tu as écrit tout cela […] mets juste calcule. De
    // manière générale, un énoncé trop long n'est jamais lu. » Il avait
    // raison, et ce n'était pas l'exercice : c'était CE repli. La fiche d'un
    // exercice seul passe depuis toujours par `premierePhrase` — première
    // phrase, et rien du tout au-delà de 120 caractères, parce que la suite
    // décrit l'ÉCRAN (les touches, les glissements, le bouton d'aide) et n'a
    // rien à faire sur du papier. La fiche de parcours, elle, recopiait
    // l'instruction entière : neuf cents caractères sur les puissances, autant
    // sur les trois exercices suivants. Un pavé en tête d'exercice n'est pas
    // une consigne, c'est un mur — l'élève saute par-dessus et fait ce qu'il
    // croit.
    const consignes = {};
    papier.forEach(e => {
        consignes[e.stepId] = e.exercise.consignePapier !== undefined
            ? e.exercise.consignePapier
            : premierePhrase(e.exercise.instruction || '');
    });
    // LE TITRE IMPRIMÉ EST CELUI DE LA FEUILLE, pas celui du catalogue.
    // « Segment, Droite ou Demi-droite ? » est le nom de l'exercice dans
    // l'application ; en tête d'un contrôle, le professeur écrit ce qu'il veut.
    const titres = {};
    papier.forEach(e => { titres[e.stepId] = e.title; });

    // COUPER OU NON UN EXERCICE ENTRE DEUX PAGES. `undefined` suit le réglage
    // général ; `true` ou `false` est une décision prise sur CET exercice, et
    // elle l'emporte — c'est la règle partout ailleurs dans la fiche.
    const insecables = {};
    // UN JEU À DÉCOUPER NE SE COUPE PAS. Il occupe la page entière : sa
    // bannière restait seule en bas d'une page — titre, consigne, et rien
    // dessous — pendant que le plateau partait sur la suivante en « (suite) ».
    // Une page perdue par jeu, et un corrigé qu'on cherche.
    papier.forEach(e => { if (unExemplaire(e)) insecables[e.stepId] = true; });
    const estInsecable = (id) => insecables[id] ?? insecEl.checked;

    // LES QUESTIONS RÉÉCRITES À LA MAIN, par étape et par rang.
    //
    // On refusait jusqu'ici de toucher à un énoncé : la réponse vient du
    // générateur, et récrire « 7 × 8 = » en « 9 × 8 = » aurait laissé le
    // corrigé répondre 56. La règle tient toujours — c'est pourquoi l'éditeur
    // demande les DEUX ensemble, l'énoncé ET sa réponse. Une feuille dont les
    // solutions mentent est pire qu'une feuille sans solutions.
    const retouches = new Map();          // `${stepId}#${rang}` → {texte, reponse}
    const cleRetouche = (id, rang) => `${id}#${rang}`;

    const parId = new Map(papier.map(e => [e.stepId, e]));

    const totalPoints = () => ordre
        .filter(id => (quantites[id] || 0) > 0)
        .reduce((s, id) => s + (points[id] || 0), 0);

    // TANT QUE LE PROFESSEUR N'Y A PAS TOUCHÉ, le barème se répartit tout seul
    // pour tomber juste sur la note. Dès qu'il corrige une case, le barème
    // devient le sien et on cesse d'y toucher — la ligne d'explication signale
    // alors l'écart avec la note plutôt que de le masquer.
    let baremeTouche = false;
    // LA NOTE SUIT LE BARÈME, ET NON L'INVERSE.
    //
    // Rémy : « c'est le nombre de points = le nombre de questions, c'est le
    // prof qui corrige au besoin pour chaque exercice. »
    //
    // Une interrogation de trente-huit questions se note donc sur trente-huit,
    // et l'avertissement « le barème totalise 38 points pour une note sur 20 »
    // disparaît — il signalait un désaccord que le logiciel créait lui-même.
    // Le professeur reste libre d'écrire « sur 20 » : c'est alors un vrai choix
    // de sa part, et l'écart lui est signalé parce qu'il compte.
    let noteTouchee = false;
    const repartirPoints = () => {
        const sur = Math.max(5, Math.min(100, Number(noteSurEl.value) || 20));
        Object.assign(points, repartirBareme(quantites, sur));
        if (noteTouchee) return;
        const total = Object.values(points).reduce((t, p) => t + p, 0);
        if (total >= 5 && total <= 100) noteSurEl.value = String(total);
    };
    repartirPoints();

    const options = () => {
      const entete = {
        // L'EN-TÊTE N'EST PAS OBLIGATOIRE. Rémy : « l'en-tête pour l'impression
        // ne devrait pas être obligatoire ». Le champ vidé revenait au nom du
        // parcours : le professeur effaçait, et le titre repoussait tout seul —
        // ce qui donne aussi l'impression que la touche d'effacement ne fait
        // rien. Un champ vide veut dire ce qu'il dit : pas de titre sur la
        // feuille. Il est pré-rempli à l'ouverture, donc personne ne perd le
        // titre par accident ; l'effacer est un geste, pas un oubli.
        titre: feuille.titre.trim(),
        consigne: (feuille.consigne || '').trim(),
        // La mesure sert à couper la consigne à la largeur utile : sans elle,
        // une phrase longue déborderait dans la marge.
        mesurer,
        champs: feuille.champs.slice(),
        // LE CARTOUCHE DE CORRECTION. La note se coche d'elle-même sur une
        // interrogation — c'est ce qu'on veut neuf fois sur dix — mais le
        // professeur reste libre de la retirer, ou de mettre une case
        // d'appréciation sur une simple fiche d'entraînement.
        note: feuille.note,
        commentaire: feuille.commentaire,
        noteSur: Math.max(5, Math.min(100, Number(noteSurEl.value) || 20))
      };
      return {
        interrogation: interro.checked,
        avecChoix: choixEl.checked,
        modeSolution: modeSol.value,
        // « auto » laisse le mode décider : cinq colonnes de réponses nues
        // pour corriger vite, une seule quand chaque ligne porte son
        // explication. Le professeur tranche quand ça ne lui va pas.
        colonnesSolutions: colSol.value === 'auto' ? null : Number(colSol.value),
        ouSolution: ouSol.value,
        orientation: orientEl.value,
        champs: champsEl.checked,
        numerotation: numEl.value,
        noteSur: Math.max(5, Math.min(100, Number(noteSurEl.value) || 20)),
        // L'EN-TÊTE EST À LA CLASSE, PAS AU LOGICIEL. Le titre par défaut est le
        // nom du parcours, mais « Tout sur papier (72 exercices) » n'est pas ce
        // qu'on écrit en haut d'un contrôle. Et les champs d'identité varient :
        // une fiche d'entraînement n'a pas besoin de la classe, un contrôle si.
        entete,
        // LA PREMIÈRE PAGE DESCEND DE LA HAUTEUR DU CARTOUCHE, les autres non :
        // le cadre « Note / Commentaire » ne s'imprime qu'une fois, et lui
        // réserver sa bande sur les quatre pages, c'est perdre des questions
        // pour un cadre absent.
        // L'en-tête reçoit AUSSI ce qu'il contient : sans titre, sa bande
        // rétrécit ; sans titre ni identité, elle disparaît. Rémy : « il
        // faudrait aussi pouvoir supprimer carrément la place du titre. »
        enteteH1: hauteurEntete1(pageDe(orientEl.value),
            cartoucheDe(entete, interro.checked), entete)
      };
    };

    // La liste des étapes : le nombre de questions de chacune, ET leur ordre
    // sur la feuille — chaque ligne se glisse plus haut ou plus bas par sa
    // poignée. C'est toute la mise en page : le reste se calcule.
    // Quels tiroirs sont ouverts : la liste est redessinée à chaque réglage,
    // et un tiroir qui se referme sous le doigt est insupportable.
    //
    // TOUT EST REPLIÉ AU DÉPART, GRAND ÉCRAN COMPRIS.
    //
    // Rémy : « pour la fiche du parcours, il faut que toutes les barres
    // draggables d'exercices soient repliées, et surtout moins hautes ».
    //
    // Elles s'ouvraient toutes d'emblée au-dessus de 700 px, au motif que le
    // clic serait de trop sur un ordinateur. Mesuré : cinq exercices faisaient
    // 315 px chacun, soit quinze cents pixels de réglages AVANT d'apercevoir la
    // feuille — et c'est la feuille qu'on vient regarder. Le raisonnement était
    // juste pour deux étapes, faux dès la troisième.
    //
    // Replié, on voit d'un coup la liste entière et l'aperçu ; on ouvre le seul
    // exercice qu'on veut régler, et il se souvient de son état tant que la
    // fiche reste ouverte.
    const CHEVRON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"'
        + ' stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';

    // LES DEUX RÉGLAGES QU'ON TOUCHE LE PLUS : combien, et sur combien de
    // colonnes. On les change au clavier — c'est le plus rapide quand on sait
    // déjà — OU d'un « − » et d'un « + » : essayer trois colonnes puis quatre
    // pour voir laquelle tient, ça se fait au doigt, pas en tapant un chiffre.
    const COLONNES_POSSIBLES = ['auto', 1, 2, 3, 4, 5, 6];
    const bornerNb = (v, plafond) => Math.max(0, Math.min(plafond || 40, Number(v) || 0));
    /** Combien d'exemplaires cet exercice-là accepte : un jeu à découper, un seul. */
    const plafondDe = (id) => (unExemplaire(parId.get(id)) ? 1 : 40);
    /** Et sur combien de colonnes : un plateau à découper prend toute la page. */
    const colonnesPossibles = (id) => (unExemplaire(parId.get(id)) ? [1] : COLONNES_POSSIBLES);

    /** Le pavé « − [champ] + », en HTML — le même partout. */
    const pas = (cible, id, dedans) => `<span class="fp-pas">
        <button type="button" class="fp-pas-btn" data-pas="${cible}" data-pour="${id}"
            data-sens="-1" aria-label="Moins">−</button>
        ${dedans}
        <button type="button" class="fp-pas-btn" data-pas="${cible}" data-pour="${id}"
            data-sens="1" aria-label="Plus">+</button></span>`;

    const changerQuantite = (id, v) => {
        quantites[id] = bornerNb(v, plafondDe(id));
        oublier(id);                         // le nombre change : on retire à neuf, ICI seulement
        if (!baremeTouche) repartirPoints();
        majRoue(id);
        rendre(id);
    };
    const changerColonnes = (id, v) => {
        colonnes[id] = v;
        majRoue(id);
        rendre(id);
    };
    /** Un cran de plus ou de moins, sans jamais sortir de la liste. */
    const crantColonnes = (id, sens) => {
        const possibles = colonnesPossibles(id);
        const i = possibles.findIndex(v => String(v) === String(colonnes[id]));
        const j = Math.max(0, Math.min(possibles.length - 1, (i < 0 ? 0 : i) + sens));
        changerColonnes(id, String(possibles[j]));
    };

    const changerPoints = (id, v) => {
        points[id] = bornerNb(v);
        baremeTouche = true;                 // à partir d'ici, le barème est le sien
        majRoue(id);
        rendre(id);
    };

    /** Brancher les « − » et « + » d'une zone, liste ou panneau. */
    const brancherPas = (zone) => {
        zone.querySelectorAll('[data-pas]').forEach(b => {
            // Un bouton DANS un <label> : sans cela, le clic se propage au
            // label et redonne le focus au champ, ce qui rouvre le clavier
            // logiciel sur une tablette à chaque cran.
            b.onclick = (ev) => {
                ev.preventDefault();
                const id = b.dataset.pour, sens = Number(b.dataset.sens);
                if (b.dataset.pas === 'nb') changerQuantite(id, (quantites[id] || 0) + sens);
                else if (b.dataset.pas === 'pts') changerPoints(id, (points[id] || 0) + sens);
                else crantColonnes(id, sens);
            };
        });
    };

    /**
     * Le panneau ouvert reflète ce qu'on vient de changer AILLEURS.
     *
     * On règle des deux côtés — la liste et l'engrenage —, et deux affichages
     * du même nombre qui divergent valent moins que pas d'affichage du tout :
     * on ne sait plus lequel croire.
     */
    const majRoue = (id) => {
        if (!panneau || panneau.dataset.pour !== id) return;
        const nb = panneau.querySelector('[data-r-nb]');
        const col = panneau.querySelector('[data-r-col]');
        const pts = panneau.querySelector('[data-r-pts]');
        if (nb && nb !== document.activeElement) nb.value = quantites[id];
        if (col) col.value = String(colonnes[id]);
        if (pts && pts !== document.activeElement) pts.value = points[id];
        const bareme = panneau.querySelector('[data-r-bareme]');
        if (bareme) bareme.hidden = !interro.checked;
    };

    /**
     * LA LISTE DES EXERCICES A DISPARU, ET C'EST TOUT LE GAIN.
     *
     * Rémy : « la fiche du parcours est vraiment chargée ». Elle l'était pour
     * une raison qu'on pouvait compter : cent quatre-vingt-dix boutons, vingt
     * et un menus, vingt-trois champs — et la MOITIÉ montrait deux fois la même
     * chose. Au-dessus de l'aperçu vivait une liste des six exercices, avec
     * pour chacun sa consigne, son nombre de questions, ses colonnes, sa case
     * « numéroter » et son barème ; sous l'aperçu, chaque bandeau portait un
     * engrenage qui réglait EXACTEMENT les mêmes choses. Le code lui-même en
     * témoignait : une fonction `majRoue` existait pour resynchroniser les deux
     * affichages, parce que « deux affichages du même nombre qui divergent
     * valent moins que pas d'affichage du tout ».
     *
     * Tout ce que la liste savait faire, la feuille le sait :
     *   · le titre et la consigne se retouchent d'un clic dessus ;
     *   · l'engrenage du bandeau règle questions, colonnes, numérotation,
     *     barème et contenu ;
     *   · l'ordre se change avec les deux flèches du bandeau (ci-dessous).
     *
     * C'est le principe que Rémy avait lui-même posé pour l'en-tête — « en
     * passant par l'aperçu plutôt que des options » — appliqué au dernier
     * endroit qui y échappait.
     */

    /**
     * MONTER OU DESCENDRE UN EXERCICE, depuis son bandeau sur la feuille.
     *
     * Deux flèches et pas un glissé : sur une tablette, tirer un bandeau de
     * trois centimètres à travers une A4 réduite est un geste qu'on rate.
     */
    const deplacer = (id, delta) => {
        const i = ordre.indexOf(id);
        const j = i + delta;
        if (i < 0 || j < 0 || j >= ordre.length) return;
        ordre.splice(j, 0, ordre.splice(i, 1)[0]);
        rendre(id);
    };


    // --- L'ENGRENAGE DU BANDEAU ---------------------------------------------
    //
    // Les réglages d'un exercice vivaient dans la liste de gauche : on réglait
    // d'un côté, on regardait de l'autre, et il fallait à chaque fois retrouver
    // quelle ligne de la liste correspondait au bandeau qu'on avait sous les
    // yeux. Le bouton est donc SUR le bandeau, et son panneau s'ouvre collé à
    // lui — on règle là où l'on regarde.
    //
    // Il ne double PAS la liste : on y met le nécessaire — combien, sur combien
    // de colonnes, numéroté ou non, le barème quand c'est une interrogation.
    // La consigne et l'ordre restent dans la liste, qui les montre TOUS en même
    // temps, ce qu'un panneau collé à un seul bandeau ne peut pas faire.
    //
    // ET LE CONTENU, depuis peu : les tables, le niveau, la difficulté. On ne
    // réglait ici que la mise en page ; pour changer les tables d'une fiche de
    // multiplications il fallait sortir de la fiche, rouvrir l'exercice,
    // régler, revenir — et refaire le tour à chaque essai. Les champs sont
    // ceux du panneau de configuration, pas une copie : `fieldHtml` et
    // `readParams` viennent de games/configUI.js.
    let panneau = null;

    const fermerRoue = () => {
        if (!panneau) return;
        panneau.remove();
        panneau = null;
        document.removeEventListener('pointerdown', surClicDehors, true);
        document.removeEventListener('keydown', surEchap, true);
    };
    function surClicDehors(ev) {
        if (!panneau) return;
        // Ni le panneau lui-même, ni ce qui l'ouvre : sans cette seconde
        // garde, cliquer une autre zone retouchable fermait le panneau puis le
        // rouvrait, et le champ perdait le focus au passage.
        if (panneau.contains(ev.target)) return;
        if (ev.target.closest('[data-reglage], .fx-retouche')) return;
        fermerRoue();
    }
    function surEchap(ev) { if (ev.key === 'Escape') fermerRoue(); }

    // --- RÉCRIRE DIRECTEMENT SUR L'APERÇU -----------------------------------
    //
    // Rémy : « il faudrait aller sur le texte et avoir la possibilité de
    // changer la question ou de la taper en gardant les contraintes de style.
    // […] Il faut que l'aperçu soit modifiable facilement. »
    //
    // On ne rend pas le texte directement éditable dans la page : la feuille
    // est MESURÉE — chaque ligne est placée au millimètre après avoir été
    // découpée à la largeur du bloc — et taper dedans se battrait contre le
    // moteur de mise en page à chaque touche. Le clic ouvre donc un petit
    // éditeur à côté, et le texte retourne par le même chemin que les autres :
    // c'est ce qui garde le style de la feuille sans avoir à le redire.
    //
    // POUR UNE QUESTION, L'ÉNONCÉ ET LA RÉPONSE SE CHANGENT ENSEMBLE. Récrire
    // « 7 × 8 = » en « 9 × 8 = » laisserait sinon le corrigé répondre 56 : une
    // feuille dont les solutions mentent est pire qu'une feuille sans
    // solutions.

    function ouvrirRetouche(cible, quoi) {
        fermerRoue();
        const id = quoi.id;
        const e = parId.get(id);
        if (!e) return;

        const rang = quoi.rang;
        const question = quoi.genre === 'question'
            ? (blocs.get(id) || [])[rang] : null;
        const retouche = quoi.genre === 'question' ? retouches.get(cleRetouche(id, rang)) : null;

        // UNE GRILLE QUI SAIT SE FAIRE RÉCRIRE — et se recorriger toute seule.
        // Elle n'a pas besoin qu'on lui dicte la réponse : elle la RECALCULE.
        const surGrille = question && question.cle && RENDUS[question.cle]
            ? RENDUS[question.cle].retoucheGrille : null;

        const valeurTexte = quoi.genre === 'titre' ? (titres[id] ?? e.title)
            : quoi.genre === 'consigne' ? (consignes[id] || '')
                : (retouche ? retouche.texte
                    : surGrille ? surGrille.lire(question.item)
                        : (question ? question.texte : ''));
        const valeurRep = (quoi.genre === 'question' && !surGrille)
            ? (retouche ? retouche.reponse : (question ? question.reponse : '')) : null;

        const legende = quoi.genre === 'titre' ? 'Titre de l\'exercice'
            : quoi.genre === 'consigne' ? 'Consigne'
                : surGrille ? surGrille.legende : 'Énoncé de la question';

        panneau = document.createElement('div');
        panneau.className = 'pp-roue-panneau pp-retouche';
        panneau.dataset.pour = `retouche:${id}:${quoi.genre}:${rang ?? ''}`;
        panneau.innerHTML = `
            <div class="pp-roue-titre">${echapper(legende)}</div>
            <textarea class="cfg-input pp-retouche-texte" data-t-texte rows="${quoi.genre === 'consigne' ? 4 : 2}"
                >${echapper(valeurTexte)}</textarea>
            ${surGrille ? `
                <div class="pp-retouche-note" data-t-avis>${echapper(surGrille.aide)}</div>`
        : quoi.genre === 'question' ? `
                <div class="pp-roue-sous-titre">Réponse (page des solutions)</div>
                <input type="text" class="cfg-input" data-t-rep value="${echapper(valeurRep || '')}">
                <div class="pp-retouche-note">Change l'énoncé ET sa réponse : le corrigé suit ce
                    que tu écris ici, il ne recalcule rien.</div>` : ''}
            <div class="pp-retouche-actions">
                ${retouche ? '<button type="button" class="pp-retouche-annuler" data-t-defaire>Rétablir</button>' : ''}
                <button type="button" class="pp-roue-autres" data-t-ok>Enregistrer</button>
            </div>`;
        document.body.appendChild(panneau);
        placerPanneau(cible);

        const champ = panneau.querySelector('[data-t-texte]');
        const rep = panneau.querySelector('[data-t-rep]');
        // ON DIT TOUT DE SUITE SI L'ON SAURA CORRIGER. Rémy : « attention à la
        // correction ». Le professeur tape, et sous le champ la feuille lui
        // répond — le résultat qu'elle imprimera, ou qu'elle n'a pas su lire.
        // Découvrir après coup qu'un corrigé est faux, c'est le découvrir
        // devant trente élèves.
        const avis = panneau.querySelector('[data-t-avis]');
        const verifier = () => {
            if (!surGrille || !avis) return true;
            const neuf = surGrille.appliquer(question.item, champ.value.trim());
            avis.textContent = neuf
                ? `✓ Corrigé refait : ${String(neuf.answer).replace('.', ',')}`
                : '✗ Je ne sais pas lire ce calcul — je ne saurais donc pas le corriger.';
            avis.classList.toggle('pp-retouche-note--ko', !neuf);
            avis.classList.toggle('pp-retouche-note--ok', !!neuf);
            return !!neuf;
        };
        if (surGrille) champ.addEventListener('input', verifier);
        const enregistrer = () => {
            if (surGrille && !verifier()) return;      // on ne fige pas un corrigé faux
            const texte = champ.value.trim();
            if (quoi.genre === 'titre') {
                titres[id] = texte || e.title;
                    } else if (quoi.genre === 'consigne') {
                consignes[id] = champ.value;
                    } else {
                retouches.set(cleRetouche(id, rang), { texte, reponse: rep ? rep.value.trim() : '' });
            }
            fermerRoue();
            rendre();
        };
        panneau.querySelector('[data-t-ok]').onclick = enregistrer;
        const defaire = panneau.querySelector('[data-t-defaire]');
        if (defaire) defaire.onclick = () => {
            retouches.delete(cleRetouche(id, rang));
            fermerRoue();
            rendre();
        };
        // Entrée enregistre — sauf dans la consigne, qui peut vouloir un
        // retour à la ligne ; Maj+Entrée y sert à cela partout.
        champ.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); enregistrer(); }
        });
        if (rep) rep.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') { ev.preventDefault(); enregistrer(); }
        });
        champ.focus();
        champ.select();
        document.addEventListener('pointerdown', surClicDehors, true);
        document.addEventListener('keydown', surEchap, true);
    }

    /** Collé à ce qu'on retouche, et rabattu s'il devait sortir de l'écran. */
    function placerPanneau(cible) {
        const r = cible.getBoundingClientRect();
        const large = panneau.offsetWidth, haut = panneau.offsetHeight;
        const x = Math.max(8, Math.min(r.left, window.innerWidth - large - 8));
        const y = r.bottom + 6 + haut > window.innerHeight
            ? Math.max(8, r.top - haut - 6) : r.bottom + 6;
        panneau.style.left = `${x}px`;
        panneau.style.top = `${y}px`;
    }

    function ouvrirRoue(bouton, id) {
        const dejaLa = panneau && panneau.dataset.pour === id;
        fermerRoue();
        if (dejaLa) return;                    // deuxième clic sur la même roue : on referme

        const e = parId.get(id);
        if (!e) return;
        const unite = e.grille ? 'Grilles' : 'Questions';
        const schema = schemaPapier(e);
        panneau = document.createElement('div');
        panneau.className = 'pp-roue-panneau';
        panneau.dataset.pour = id;
        panneau.innerHTML = `
            <div class="pp-roue-titre">${echapper(e.title)}</div>
            <label class="pp-roue-champ">${unite}
                ${pas('nb', id, `<input type="number" class="cfg-input cfg-input--num" data-r-nb
                    min="0" max="${plafondDe(id)}" value="${quantites[id]}">`)}</label>
            <label class="pp-roue-champ">${e.grille ? 'Par ligne' : 'Colonnes'}
                ${pas('col', id, `<select class="cfg-input cfg-input--num" data-r-col>
                    ${colonnesPossibles(id).map(v => `<option value="${v}"
                        ${String(colonnes[id]) === String(v) ? 'selected' : ''}>${v === 'auto' ? 'auto' : v}</option>`).join('')}
                </select>`)}</label>
            <label class="pp-roue-case">
                <input type="checkbox" data-r-num ${numeroter[id] ? 'checked' : ''}> Numéroter</label>
            <label class="pp-roue-case" title="Cet exercice commence alors en haut d'une page plutôt que d'être coupé en deux.">
                <input type="checkbox" data-r-insec ${estInsecable(id) ? 'checked' : ''}> Ne pas couper l'exercice</label>
            <label class="pp-roue-champ" data-r-bareme ${interro.checked ? '' : 'hidden'}>Barème
                ${pas('pts', id, `<input type="number" class="cfg-input cfg-input--num" data-r-pts
                    min="0" max="40" value="${points[id]}">`)}</label>
            ${schema.length ? `<div class="pp-roue-contenu" data-r-contenu>
                <div class="pp-roue-sous-titre">Contenu des questions</div>
                ${schema.map(p => fieldHtml(p,
        e.params[p.id] !== undefined ? e.params[p.id] : p.default)).join('')}
            </div>` : ''}
            <button type="button" class="pp-roue-autres" data-r-neuf>🎲 Autres questions</button>`;
        document.body.appendChild(panneau);

        // COLLÉ À L'ENGRENAGE, et rabattu s'il devait sortir de l'écran : un
        // panneau à moitié hors du cadre ne se règle pas, il se subit.
        const r = bouton.getBoundingClientRect();
        const large = panneau.offsetWidth, haut = panneau.offsetHeight;
        const x = Math.max(8, Math.min(r.left, window.innerWidth - large - 8));
        const y = r.bottom + 6 + haut > window.innerHeight
            ? Math.max(8, r.top - haut - 6) : r.bottom + 6;
        panneau.style.left = `${x}px`;
        panneau.style.top = `${y}px`;

        brancherPas(panneau);
        const nb = panneau.querySelector('[data-r-nb]');
        // Le chemin commun : `changerQuantite` renumérote, répartit le barème
        // et redessine. Ce fut longtemps le seul endroit d'où l'on pouvait
        // régler un exercice sans passer par la liste ; c'est aujourd'hui le
        // seul endroit tout court.
        nb.oninput = () => changerQuantite(id, nb.value);
        // Le rabotage ne s'écrit qu'à la sortie : pendant la frappe, réécrire
        // ce que l'on tape empêche de taper.
        nb.onchange = () => { nb.value = quantites[id]; };
        panneau.querySelector('[data-r-col]').onchange = (ev) => changerColonnes(id, ev.target.value);
        panneau.querySelector('[data-r-num]').onchange = (ev) => {
            numeroter[id] = ev.target.checked;
            rendre(id);
        };
        panneau.querySelector('[data-r-insec]').onchange = (ev) => {
            insecables[id] = ev.target.checked;
            rendre(id);
        };
        const pts = panneau.querySelector('[data-r-pts]');
        pts.oninput = () => {
            points[id] = Math.max(0, Math.min(40, Number(pts.value) || 0));
            baremeTouche = true;             // à partir d'ici, le barème est le sien
            rendre(id);
        };
        panneau.querySelector('[data-r-neuf]').onclick = () => { oublier(id); rendre(id); };

        // LE CONTENU. Un réglage changé retire les questions à neuf : elles ont
        // été tirées avec l'ancien, les garder afficherait des tables qu'on
        // vient de décocher. On écoute `change` — et `input` pour les champs
        // texte et nombre, qui ne l'émettent qu'à la sortie —, et l'on relit
        // TOUT le panneau : un seul chemin, donc jamais deux réglages qui
        // divergent.
        const contenu = panneau.querySelector('[data-r-contenu]');
        if (contenu) {
            wireTips(contenu);
            const relire = () => {
                Object.assign(e.params, readParams(contenu, schema));
                oublier(id);
                rendre(id);
            };
            contenu.addEventListener('change', relire);
            // Les boutons « Oui / Non » n'émettent rien : leur écouteur global
            // ne fait que basculer la classe. On repasse derrière, après lui.
            contenu.addEventListener('click', (ev) => {
                if (ev.target.closest('.cfg-on')) setTimeout(relire, 0);
            });
        }
        nb.focus();
        nb.select();
        document.addEventListener('pointerdown', surClicDehors, true);
        document.addEventListener('keydown', surEchap, true);
    }

    /**
     * REDESSINE LA FEUILLE — et, si l'on vient de régler un exercice précis,
     * le RAMÈNE SOUS LES YEUX.
     *
     * Rémy : « l'engrenage et les flèches sont sans effet ». Éprouvé sur le
     * banc, ils agissent : changer « jusqu'à 1 000 » en « jusqu'à 100 000 »
     * remplace bien les nombres, une flèche échange bien deux exercices. Mais
     * sur SA feuille — cent un exercices, six cents questions —, l'exercice
     * réglé est à trois pages de haut : il change hors du champ de vision, et
     * l'écran, lui, ne bouge pas. Une modification qu'on ne voit pas est une
     * modification qui n'a pas eu lieu.
     *
     * On ne déplace le regard que si l'exercice a QUITTÉ l'écran : ramener de
     * force une chose déjà visible ferait sauter la page à chaque frappe dans
     * le champ du nombre de questions.
     */
    const rendre = (suivre = null) => {
        const o = options();
        // LE PANNEAU SURVIT AU REDESSIN. Il vit sur le corps du document, pas
        // dans l'aperçu : le fermer ici le ferait disparaître au premier
        // réglage qu'on y change — c'est-à-dire toujours.
        //
        // Les questions ne sont retirées que si nécessaire (« D'autres
        // questions », changement de quantité) : changer un réglage de mise en
        // page garde les mêmes questions.
        // Chaque étape ne se retire que si elle a été oubliée, ou s'il lui
        // faut plus de questions qu'elle n'en a.
        ordre.forEach(id => {
            const e = parId.get(id);
            const nb = quantites[id] || 0;
            const deja = blocs.get(id);
            if (deja && deja.length >= nb) return;
            blocs.set(id, nb ? (e.grille ? grillesDe(e, nb) : questionsDe(e, nb)) : []);
        });
        const exos = ordre
            .filter(id => (quantites[id] || 0) > 0)
            .map(id => {
                const e = parId.get(id);
                // Les retouches du professeur passent PAR-DESSUS le tirage :
                // elles ne remplacent pas la question dans la table, elles
                // s'appliquent au moment de composer. Retirer une autre
                // question au sort les emporte donc avec l'ancienne, ce qui
                // est le bon comportement.
                const tire = (blocs.get(id) || []).slice(0, quantites[id]).map((q, rang) => {
                    const r = retouches.get(cleRetouche(id, rang));
                    if (!r) return q;
                    // UNE GRILLE SE RÉCRIT AUTREMENT QU'UNE QUESTION : on ne
                    // remplace pas un texte, on refait l'objet — et sa
                    // correction avec. Rémy : « on ne peut pas changer les
                    // calculs du 33 (attention à la correction) ». C'est le
                    // rendu qui sait le faire, parce que lui seul sait ce que
                    // sa grille veut dire ; s'il n'y arrive pas, il rend `null`
                    // et l'on garde la grille d'origine plutôt que d'imprimer
                    // un corrigé qui ment.
                    if (q.cle && RENDUS[q.cle] && RENDUS[q.cle].retoucheGrille) {
                        const neuf = RENDUS[q.cle].retoucheGrille.appliquer(q.item, r.texte);
                        return neuf ? { ...q, item: neuf, retouchee: true } : q;
                    }
                    return { ...q, texte: r.texte, reponse: r.reponse, retouchee: true };
                });
                // Une grille n'a pas de consigne écrite par le professeur :
                // c'est la règle du jeu, et elle se déduit de la grille tirée.
                const consigneGrille = e.grille && tire.length && RENDUS[e.grille].consigne
                    ? RENDUS[e.grille].consigne(tire.map(g => g.item)) : '';
                // « auto » ne descend pas jusqu'au moteur : c'est son défaut.
                const col = colonnes[id] === 'auto' ? null : Number(colonnes[id]);
                return {
                    // L'IDENTIFIANT VOYAGE AVEC L'EXERCICE : c'est lui que le
                    // bandeau de l'aperçu portera, et sur lequel l'engrenage
                    // ouvrira les bons réglages.
                    id,
                    titre: titres[id] ?? e.title,
                    consigne: o.interrogation ? '' : (e.grille ? consigneGrille : consignes[id]),
                    points: o.interrogation ? (points[id] || null) : null,
                    numeroter: numeroter[id] !== false,
                    insecable: estInsecable(id),
                    questions: e.grille ? [] : tire,
                    grilles: e.grille ? tire : [],
                    colonnes: e.grille ? null : col,
                    // « auto » demande au rendu ce qui lui convient : une grille
                    // remplit la largeur, une rédaction veut deux par ligne.
                    grillesParLigne: e.grille ? (col ?? RENDUS[e.grille].parLigneDefaut ?? null) : null,
                    // Certains blocs demandent plus large que le plafond commun.
                    grilleMax: e.grille
                        ? (EST_PLEIN(RENDUS[e.grille], tire) ? 400
                            : (RENDUS[e.grille].grilleMax ?? null))
                        : null,
                    // Tous les blocs imprimables ne sont pas carrés : une
                    // figure suivie de trois lignes à rédiger est large et
                    // basse. Le rendu déclare sa proportion, la mise en page
                    // la respecte.
                    // La proportion peut être une FONCTION des grilles tirées
                    // (le tableau de conversion la calcule sur son nombre de
                    // lignes) : on la résout ici, pas plus loin.
                    grilleRatio: e.grille
                        ? (proportionsRendu(RENDUS[e.grille], tire)?.h ?? 1) : 1,
                    // « PLEIN » : LA PAGE ENTIÈRE. Ce n'est pas une proportion
                    // — voir `hauteurBloc2` dans core/fiche.js : la hauteur
                    // d'un bloc plein est ce qui RESTE sous son bandeau, et
                    // cela ne se connaît qu'à la mise en page.
                    grillePleine: !!(e.grille && EST_PLEIN(RENDUS[e.grille], tire)),
                    // BLOCS COLLÉS : les cartes du memory se touchent par leur
                    // bordure, dans un parcours comme sur leur fiche seule.
                    // Rémy : « les paires de paires ne sont pas collées, il
                    // faut que cela fasse un bloc ». Une planche de cartes se
                    // découpe d'un trait de massicot, pas paire par paire.
                    blocsColles: !!(e.grille && RENDUS[e.grille].blocsColles),
                    // Un jeu à découper : sa planche de solution prend la page
                    // entière, et sa consigne n'a rien à y faire (voir
                    // `aGrilles`).
                    jeuUnique: unExemplaire(e)
                };
            })
            .filter(x => x.questions.length || x.grilles.length);

        // La feuille de solutions ne porte que ce qui a une réponse écrite :
        // une grille se corrige sur son propre dessin, pas dans une liste.
        const toutes = exos.flatMap(x => x.questions);
        const sections = exos.filter(x => x.questions.length)
            .map(x => ({ titre: x.titre, points: x.points, questions: x.questions, numeroter: x.numeroter }));
        // LES BLOCS SE CORRIGENT SUR LEUR PROPRE DESSIN. Un sudoku rempli, une
        // rédaction écrite : leur solution est une figure, pas une ligne dans
        // une liste. La vue « solutions » est donc en deux temps — la liste des
        // réponses écrites, puis les blocs redessinés avec leur contenu.
        // SUR LE CORRIGÉ, UN JEU À DÉCOUPER N'A PLUS DE CONSIGNE.
        //
        // « DÉCOUPE LES 8 GRENOUILLES et place-les comme sur la vignette
        // Départ » n'apprend rien à qui relit la solution — et ces trois
        // lignes suffisaient à pousser la planche de vignettes, qui prend la
        // page entière, sur la page d'après : on obtenait une page de bandeau
        // seul, puis le corrigé en « (suite) ».
        const aGrilles = exos.filter(x => x.grilles.length)
            .map(x => (x.jeuUnique ? { ...x, consigne: '' } : x));

        // L'APERÇU MONTRE LE DOCUMENT ENTIER, solutions comprises.
        //
        // Il y avait un bouton pour basculer de l'un à l'autre, et c'est une
        // façon de cacher la moitié du travail : on règle la mise en page des
        // questions sans voir ce que devient le corrigé, on télécharge, et on
        // découvre à l'impression. Ici on fait défiler et on voit ce qu'on
        // aura — exactement ce qu'aura le PDF, et dans le même ordre. Si le
        // professeur a choisi « sans solutions », l'aperçu n'en montre pas :
        // c'est la même règle, toujours.
        const avecSolutions = o.ouSolution !== 'sans';
        const mise = composerBlocs(exos, o, mesurer);
        const listeSol = (avecSolutions && toutes.length)
            ? composerSolutions(toutes, { mode: o.modeSolution, orientation: o.orientation, sections,
                numerotation: o.numerotation, colonnesSolutions: o.colonnesSolutions }, mesurer)
            : null;
        const blocsSol = (avecSolutions && aGrilles.length)
            ? composerBlocs(aGrilles, { ...o, solution: true, interrogation: false, enteteH1: 0 }, mesurer)
            : null;
        const pg = mise.page || pageDe(o.orientation);

        const large = apercu.parentElement.clientWidth || 640;
        const k = Math.min(large, 700) / pg.w;
        apercu.style.width = `${pg.w * k}px`;

        const nom = o.entete.titre;
        const note = cartoucheDe(o.entete, o.interrogation);
        // Les pages, dans l'ordre du document : les questions, la liste des
        // réponses, puis les blocs corrigés (le sudoku rempli, la rédaction
        // écrite — leur solution est une figure, pas une ligne dans une liste).
        const vues = [
            // LE TITRE NE DIT QUE LE TITRE. Le logiciel y ajoutait
            // « — Interrogation » : c'est au professeur d'écrire ce qu'est sa
            // feuille, et il l'a déjà fait dans le champ d'en-tête.
            ...mise.pages.map(p => ({ page: p, opts: mise.opts, liste: false, sousTitre: '' })),
            ...(listeSol ? listeSol.pages.map(p => ({
                page: p, opts: listeSol.opts, liste: true, sousTitre: 'Solutions', sol: true
            })) : []),
            ...(blocsSol ? blocsSol.pages.map(p => ({
                page: p, opts: blocsSol.opts, liste: false, sousTitre: 'Solutions', sol: true
            })) : [])
        ];
        apercu.style.height = `${pg.h * k * vues.length + 12 * Math.max(0, vues.length - 1)}px`;
        apercu.innerHTML = teindreHtml(vues.map((v, i) => `
            <div class="fq-page${v.sol ? ' fq-page--sol' : ''}"
                 style="width:${pg.w * k}px; height:${pg.h * k}px; top:${i * (pg.h * k + 12)}px">
                ${apercuEntete(k, nom, v.sousTitre, i === 0 ? note : null, pg,
        v.sol ? { champs: [] } : o.entete)}
                ${v.liste ? apercuSolutions(v.page, k, v.opts)
        : apercuItems(v.page, k, { ...v.opts, reglable: !v.sol, retouchable: !v.sol,
            // L'ordre courant : c'est lui qui grise la flèche du premier et
            // celle du dernier.
            ordre })}
            </div>`).join(''));

        apercu.querySelectorAll('[data-reglage]').forEach(b => {
            b.onclick = (ev) => { ev.stopPropagation(); ouvrirRoue(b, b.dataset.reglage); };
        });

        const nbGrilles = exos.reduce((s, x) => s + x.grilles.length, 0);
        const morceaux = [];
        if (toutes.length) morceaux.push(`${toutes.length} question${toutes.length > 1 ? 's' : ''}`);
        if (nbGrilles) morceaux.push(`${nbGrilles} grille${nbGrilles > 1 ? 's' : ''}`);
        const nbSol = (listeSol ? listeSol.pages.length : 0) + (blocsSol ? blocsSol.pages.length : 0);
        morceaux.push(`${mise.pages.length} page${mise.pages.length > 1 ? 's' : ''}`);
        if (nbSol) morceaux.push(`+ ${nbSol} de solutions`);
        morceaux.push(o.orientation === 'paysage' ? 'paysage' : 'portrait');
        totalEl.textContent = morceaux.join(' · ');

        noteSurChamp.hidden = !o.entete.note;
        const total = totalPoints();
        noteEl.textContent = o.interrogation
            ? `Interrogation : pas de consigne imprimée, un barème par exercice (total ${total} pt${total > 1 ? 's' : ''}), `
              + `et la case « … / ${o.noteSur} » en haut de la première page.`
              + (total === o.noteSur ? '' : ` ⚠️ Le barème totalise ${total} points pour une note sur ${o.noteSur}.`)
            // TOUT SE RÈGLE SUR LA FEUILLE, et il faut le dire une fois : sans
            // cette ligne, l'engrenage et les flèches du bandeau restent des
            // boutons gris qu'on ne remarque qu'en passant dessus.
            : 'Clique un titre, une consigne ou un calcul pour le récrire, l\'engrenage ⚙ d\'un exercice '
                + 'pour ses réglages, ses flèches ▲▼ pour le déplacer.';
        derniers = { exos, toutes, note, total, page: pg, sections, aGrilles };
        // LES FANTÔMES SE REPOSENT APRÈS CHAQUE RENDU : l'aperçu est réécrit
        // en entier à chaque réglage, donc ce qui n'est pas dessiné par lui
        // disparaît. C'est aussi ce qui garantit qu'ils disent toujours la
        // vérité — ils listent ce qui MANQUE à l'instant.
        garnirDirect(feuille);
        if (suivre) ramenerSousLesYeux(suivre);
    };

    /** Ramène le bandeau d'un exercice dans le cadre, s'il en est sorti. */
    function ramenerSousLesYeux(id) {
        const cible = apercu.querySelector(`[data-reglage="${id}"]`);
        const cadre = apercu.closest('.fp-apercu-cadre') || apercu.parentElement;
        if (!cible || !cadre) return;
        const r = cible.getBoundingClientRect(), c = cadre.getBoundingClientRect();
        if (r.top >= c.top + 4 && r.bottom <= c.bottom - 4) return;
        cadre.scrollTop += (r.top - c.top) - c.height * 0.25;
    }

    let derniers = null;

    // L'APERÇU EST LE PANNEAU, pour tout ce qui est dessiné dessus : le titre
    // s'écrit à sa place, un champ d'identité se retire d'un clic, une case
    // fantôme l'ajoute. Voir `ui/ficheDirecte.js`.
    const garnirDirect = brancherFicheDirecte(apercu, {
        lire: () => feuille,
        ecrire: (patch) => { Object.assign(feuille, patch); rendre(); }
    });

    // COCHER « interrogation » COCHE LA NOTE. C'est ce qu'on veut neuf fois sur
    // dix, et l'oublier fait rendre une copie sans endroit où poser le chiffre.
    // Le professeur peut la retirer ensuite d'un clic sur la case : on ne la
    // remet pas de force.
    interro.onchange = () => {
        if (interro.checked) feuille.note = true;
        // Le mode interrogation ne touche qu'aux consignes et au barème : les
        // questions n'ont aucune raison de changer sous les yeux.
        rendre();
    };
    choixEl.onchange = rendre;
    insecEl.onchange = () => rendre();
    // LES RÉGLAGES DU CORRIGÉ DISPARAISSENT QUAND IL N'Y EN A PAS. « Compact —
    // juste les réponses » sur une fiche imprimée « Sans solutions » est une
    // commande qui ne commande rien : la laisser, c'est laisser croire qu'il y
    // aura un corrigé quelque part.
    const etatRepli = m.querySelector('#pp-plus-etat');
    const majRepli = () => {
        m.querySelectorAll('[data-si-corrige]').forEach(el => {
            el.hidden = ouSol.value === 'sans';
        });
        if (!etatRepli) return;
        const corrige = ouSol.value === 'sans' ? 'sans corrigé'
            : (ouSol.value === 'separe' ? 'corrigé à part' : 'corrigé à la fin');
        const encre = couleurEl.selectedOptions[0]
            ? couleurEl.selectedOptions[0].textContent.toLowerCase() : '';
        etatRepli.textContent = [
            orientEl.value === 'paysage' ? 'A4 paysage' : 'A4 portrait',
            encre, corrige
        ].filter(Boolean).join(' · ');
    };

    modeSol.onchange = rendre;
    colSol.onchange = rendre;
    ouSol.onchange = () => { majRepli(); rendre(); };
    orientEl.onchange = () => { majRepli(); rendre(); };
    // Le même interrupteur que sur les autres fiches, et la même mémoire :
    // c'est une propriété de l'imprimante, pas de la feuille.
    couleurEl.innerHTML = optionsPolycopie();
    couleurEl.value = modePolycopie();
    couleurEl.onchange = () => {
        reglerModePolycopie(couleurEl.value);
        poserTeinte(apercu);
        majRepli();
        rendre();
    };
    poserTeinte(apercu);
    majRepli();
    champsEl.onchange = rendre;
    numEl.onchange = rendre;
    noteSurEl.oninput = () => {
        // LA NOTE TAPÉE EST LA SIENNE : on cesse de la recalculer. Sans cela,
        // le premier changement de quantité l'écrasait par le total du barème,
        // et le professeur voyait son « sur 20 » disparaître tout seul.
        noteTouchee = true;
        rendre();
    };
    m.querySelector('#pp-regen').onclick = () => { toutOublier(); rendre(); };

    // TOUT CE QUI SE FAIT SUR L'APERÇU PASSE PAR ICI. L'écouteur est posé sur
    // le cadre, jamais sur les éléments : ceux-ci sont redessinés à chaque
    // rendu, et les rebrancher un par un finissait toujours par en oublier —
    // les deux boutons d'une question étaient d'ailleurs dessinés depuis le
    // début sans que rien ne les écoute.
    apercu.addEventListener('click', (ev) => {
        const neuf = ev.target.closest('[data-q-neuf]');
        const sup = ev.target.closest('[data-q-sup]');
        if (neuf || sup) {
            const btn = neuf || sup;
            const id = btn.dataset.qNeuf || btn.dataset.qSup;
            const rang = Number(btn.dataset.qRang);
            const liste = blocs.get(id);
            if (!liste || !Number.isInteger(rang) || rang < 0 || rang >= liste.length) return;
            if (neuf) {
                // Une seule question change de place : on en tire une, et l'on
                // écarte celles qui sont déjà sur la feuille pour ne pas
                // remplacer une question par sa jumelle.
                const e = parId.get(id);
                for (let essai = 0; essai < 12; essai++) {
                    const [candidate] = questionsDe(e, 1);
                    if (!candidate) break;
                    if (essai < 8 && liste.some((q, i) => i !== rang && q.texte === candidate.texte)) continue;
                    liste[rang] = candidate;
                    break;
                }
            } else {
                liste.splice(rang, 1);
                quantites[id] = Math.max(0, (quantites[id] || 1) - 1);
                if (!baremeTouche) repartirPoints();
                    }
            // Les retouches se rapportaient aux ANCIENNES places : les garder
            // collerait l'énoncé récrit sur une autre question.
            [...retouches.keys()].forEach(c => { if (c.startsWith(`${id}#`)) retouches.delete(c); });
            rendre();
            return;
        }

        // L'ORDRE, SUR LE BANDEAU. Il se réglait dans une liste au-dessus de
        // l'aperçu, qui montrait les mêmes exercices que l'aperçu montrait en
        // dessous — Rémy : « la fiche du parcours est vraiment chargée ».
        const monter = ev.target.closest('[data-monter]');
        if (monter) { deplacer(monter.dataset.monter, -1); return; }
        const descendre = ev.target.closest('[data-descendre]');
        if (descendre) { deplacer(descendre.dataset.descendre, +1); return; }

        const titre = ev.target.closest('[data-titre-exo]');
        if (titre) { ouvrirRetouche(titre, { genre: 'titre', id: titre.dataset.titreExo }); return; }

        const consigne = ev.target.closest('[data-consigne-exo]');
        if (consigne) { ouvrirRetouche(consigne, { genre: 'consigne', id: consigne.dataset.consigneExo }); return; }

        const txt = ev.target.closest('[data-txt-exo]');
        if (txt) {
            ouvrirRetouche(txt, {
                genre: 'question', id: txt.dataset.txtExo, rang: Number(txt.dataset.txtRang)
            });
        }
    });
    // Le panneau vit sur le corps du document : il resterait à l'écran après
    // la fermeture de la fiche, orphelin et sans rien à régler.
    m.querySelector('#pp-fermer').onclick = () => { fermerRoue(); m.style.display = 'none'; };
    m.querySelector('#pp-dl').onclick = () => telecharger(m, chemin, () => ({
        exos: derniers ? derniers.exos : [],
        toutes: derniers ? derniers.toutes : [],
        note: derniers ? derniers.note : null,
        total: derniers ? derniers.total : 0,
        sections: derniers ? derniers.sections : [],
        aGrilles: derniers ? derniers.aGrilles : [],
        options: options(), mesurer
    }));

    m.style.display = 'flex';
    if (!papier.length) {
        apercu.innerHTML = '';
        totalEl.textContent = '';
        noteEl.textContent = total
            ? 'Aucune étape de ce parcours ne se met sur papier : ce sont toutes des activités à manipuler.'
            : 'Ce parcours est vide.';
        return;
    }
    rendre();
}

// --- Le PDF -----------------------------------------------------------------------

/**
 * LE FICHIER — un ou deux, au choix.
 *
 * Un seul PDF avec les solutions à la fin, c'est pratique à archiver ; mais
 * c'est aussi le fichier qu'on envoie par erreur aux élèves avec les réponses
 * dedans. Deux fichiers séparés évitent cette bêtise-là, et se photocopient
 * chacun de leur côté. Le troisième choix — sans solutions — sert quand on
 * corrige au tableau.
 */
function telecharger(modal, chemin, lire) {
    const btn = modal.querySelector('#pp-dl');
    btn.disabled = true;
    const { exos, toutes, note, total, options, mesurer, sections, aGrilles } = lire();
    if (!exos.length) { btn.disabled = false; return; }
    chargerJsPDF()
        .then(jsPDF => {
            // Le titre choisi par le professeur, et le nom du parcours à défaut.
            const nom = (options.entete && options.entete.titre) || chemin.name || 'Parcours';
            const base = nom.replace(/[^\w\-]+/g, '-').toLowerCase();
            const bareme = options.interrogation
                ? `Barème sur ${total} point${total > 1 ? 's' : ''} — ramené à ${options.noteSur}.`
                : '';

            // Le PDF est créé DANS l'orientation demandée, et chaque page
            // ajoutée la répète : une seule page couchée dans un document
            // debout est le genre de détail qui ne se voit qu'à l'impression.
            const sens = options.orientation === 'paysage' ? 'landscape' : 'portrait';
            const neuf = () => teindreDoc(new jsPDF({ orientation: sens, unit: 'mm', format: 'a4' }));

            const pdf = neuf();
            const mise = composerBlocs(exos, options, mesurer);
            mise.pages.forEach((page, i) => {
                if (i) pdf.addPage('a4', sens);
                // Le titre seul, centré ; la pagination descend au pied de
                // page — un « — page 2/4 » collé au titre, c'est le titre qui
                // n'est plus centré.
                entetePdf(pdf, nom, '',
                    i === 0 ? bareme : '', i === 0 ? note : null, mise.page,
                    { ...options.entete,
                      pagination: mise.pages.length > 1 ? `page ${i + 1}/${mise.pages.length}` : '' });
                pdfItems(pdf, page, mise.opts);
            });

            const dessinerSolutions = (doc, premiere) => {
                let posee = false;
                const nouvelle = () => { if (premiere && !posee) { posee = true; return; } doc.addPage('a4', sens); };
                if (toutes.length) {
                    const sol = composerSolutions(toutes,
                        { mode: options.modeSolution, orientation: options.orientation, sections,
                          numerotation: options.numerotation,
                          colonnesSolutions: options.colonnesSolutions }, mesurer);
                    sol.pages.forEach((page) => {
                        nouvelle();
                        // La feuille de solutions est POUR LE PROFESSEUR : elle
                        // n'a pas de « Nom » ni de « Date » à remplir.
                        entetePdf(doc, nom, 'Solutions', '', null, sol.page, { champs: [] });
                        pdfSolutions(doc, page, sol.opts);
                    });
                }
                // Les blocs corrigés : le sudoku rempli, la rédaction écrite.
                if (aGrilles.length) {
                    const bs = composerBlocs(aGrilles,
                        { ...options, solution: true, interrogation: false, enteteH1: 0 }, mesurer);
                    bs.pages.forEach((page) => {
                        nouvelle();
                        entetePdf(doc, nom, 'Solutions', '', null, bs.page, { champs: [] });
                        pdfItems(doc, page, bs.opts);
                    });
                }
            };

            if (options.ouSolution === 'ensemble' && (toutes.length || aGrilles.length)) dessinerSolutions(pdf, false);
            pdf.save(`${base}${options.interrogation ? '-interrogation' : ''}.pdf`);

            if (options.ouSolution === 'separe' && (toutes.length || aGrilles.length)) {
                const solPdf = neuf();
                dessinerSolutions(solPdf, true);
                solPdf.save(`${base}-solutions-${options.modeSolution}.pdf`);
            }
        })
        // UN SEUL MESSAGE POUR DEUX PANNES TRÈS DIFFÉRENTES, c'était trompeur :
        // « la bibliothèque n'a pas pu être chargée » s'affichait aussi quand
        // elle était là et que c'est la FABRICATION de la fiche qui avait
        // échoué. On distingue, et on écrit l'erreur dans la console — c'est la
        // seule chose qui permette ensuite de la corriger.
        .catch((err) => {
            console.error('[fiche] échec du PDF', err);
            const chargee = !!(window.jspdf && window.jspdf.jsPDF);
            import('./modal.js').then(m => m.showAlert(chargee
                ? 'La fiche n\'a pas pu être fabriquée : ' + (err && err.message ? err.message : 'erreur inconnue')
                    + '. Le détail est dans la console (bouton 🐞).'
                : 'Le générateur de PDF n\'a pas pu être chargé. Recharge la page : la bibliothèque '
                    + 'est servie avec l\'application, elle ne dépend d\'aucun site extérieur.'));
        })
        .finally(() => { btn.disabled = false; });
}
