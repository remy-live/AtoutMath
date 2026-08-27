// LE MODE ÉCRIT — un exercice de l'écran devenu feuille d'exercices.
//
// Le même générateur qui alimente le jeu alimente ici une fiche : autant de
// questions qu'on veut, numérotées, avec la place pour écrire, et les réponses
// sur la dernière page. C'est le pendant papier du mode robot — l'un montre
// comment on fait, l'autre laisse faire sans écran.
//
// La mise en page est celle des manuels : l'exercice est un BLOC pleine
// largeur avec son bandeau et sa consigne, et ses questions se rangent
// d'elles-mêmes — à deux ou trois par ligne quand elles sont courtes, l'une
// sous l'autre quand elles sont longues. Rien à régler.
//
// Deux choses le rendent utilisable en classe plutôt que joli en démonstration :
//
//  · les questions viennent des RÉGLAGES de l'exercice. Le professeur choisit
//    ses tables, ses opérations, sa difficulté dans le panneau habituel, et la
//    fiche en découle. Il n'y a pas deux catalogues à tenir à jour.
//  · l'aperçu et le PDF partagent la mise en page au millimètre (core/fiche.js
//    place chaque item UNE fois pour les deux). Ce qu'on voit à l'écran est ce
//    qui sort de l'imprimante.

import { generateurDeFiche } from '../core/registry.js';
import { equiperFenetre } from './flottant.js';
// Le détachement est un outil d'auteur : l'interrupteur vit dans la palette.
import { fenetresDetachables } from './debugBar.js';
// Les réglages qu'on ne règle qu'une fois se rangent derrière un repli.
import { retenirRepli } from './repli.js';
import { brancherFicheDirecte } from './ficheDirecte.js';
// LE BLOC « CONTENU », le même que sur la fiche de grilles. Il manquait ici, et
// c'est trente-quatre exercices dont on ne pouvait rien choisir une fois la
// feuille ouverte — ni les tables, ni la difficulté, ni le niveau.
import { monterPanneauContenu } from './panneauContenu.js';
import { paramSchemaOf } from '../data/catalog.js';
import { makeRng } from '../core/ids.js';
import { composerBlocs, composerSolutions, pageDe, porteUneFraction } from '../core/fiche.js';
import { espacerMilliers } from '../core/nombres.js';
import {
    mesureur, echapper, apercuItems, apercuEntete, entetePdf, pdfItems, pourPdf, ENCRE,
    apercuSolutions, pdfSolutions, polycopieEnCouleur, modePolycopie, reglerModePolycopie,
    teindreDoc, poserTeinte, teindreHtml, optionsPolycopie
} from './ficheRendu.js';

// Ancrée ou détachée : le choix se retient, et il est le même pour les deux
// fiches — c'est une préférence de travail, pas une propriété de l'exercice.
const CLE_FENETRE = 'mathbox-fiche-flottante';
const lireModeFenetre = () => {
    try { return localStorage.getItem(`${CLE_FENETRE}-mode`); } catch (e) { return null; }
};
let fenetreFiche = null;

/**
 * La première phrase d'un énoncé, pour amorcer la consigne de la feuille.
 * On s'arrête au premier point : la suite explique l'écran — les touches, les
 * glissements, le bouton d'aide — et n'a rien à faire sur du papier.
 */
export function premierePhrase(texte) {
    const t = String(texte || '').trim();
    if (!t) return '';
    const fin = t.search(/[.!?](\s|$)/);
    const phrase = (fin > 0 ? t.slice(0, fin + 1) : t).trim();
    return phrase.length > 120 ? '' : phrase;
}

/** Les questions de la fiche, tirées du générateur avec les réglages courants. */
function tirerQuestions(generator, params, nb) {
    const vus = new Set();
    const out = [];
    // On évite les doublons — une fiche qui pose deux fois « 7 × 8 » a l'air
    // bâclée — sans boucler indéfiniment quand le générateur a peu de cas
    // possibles (les compléments à 10, par exemple).
    for (let essai = 0; out.length < nb && essai < nb * 12; essai++) {
        const item = generator.generate(params, { index: out.length, rng: makeRng() });
        // `papier` : la même question, écrite pour la feuille — sans la
        // consigne répétée devant chaque ligne. À défaut, le texte d'écran.
        const texte = (item.prompt && (item.prompt.papier || item.prompt.text)) || '';
        if (vus.has(texte) && essai < nb * 6) continue;
        vus.add(texte);
        out.push({
            texte,
            // SUR LE PAPIER, UNE FRACTION S'ÉCRIT EN COLONNE — numérateur sur
            // dénominateur, séparés d'un trait. La barre oblique est une
            // commodité d'écran ; ce n'est pas ce qu'on demande d'écrire à
            // l'élève, et une feuille qui l'imprime enseigne le contraire du
            // cours. Le générateur le déclare (`fractions: true`) ; la fiche
            // du parcours le lisait déjà, celle-ci l'oubliait.
            fractions: !!generator.fractions && porteUneFraction(texte, item.answer),
            // LE MÊME PIÈGE QUE POUR LA RÉPONSE, un cran plus loin : le
            // libellé d'une proposition est fait pour l'ÉCRAN. Une fraction y
            // est du HTML — deux span empilés —, et une égalité de Thalès
            // aussi depuis qu'elle s'écrit en colonnes. `formaterReponse` le
            // savait déjà pour la bonne réponse ; la liste du QCM, elle,
            // imprimait « <span class="fraction">… » en toutes lettres.
            choix: item.choices ? item.choices.map(texteDeProposition) : null,
            reponse: formaterReponse(item),
            // L'explication du générateur : elle ne sert qu'à la feuille de
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
    if (item.answerKind === 'choice' && item.choices) {
        const bonne = item.choices.find(c => c.correct);
        // LE LIBELLÉ D'UNE RÉPONSE EST FAIT POUR L'ÉCRAN, pas pour le papier :
        // une fraction y est du HTML — deux span empilés — et le corrigé
        // imprimait « 5/7 + 4/7 = <span class="fraction"><span class=… ». Sur
        // le papier, c'est la VALEUR qu'on écrit ; la mise en fraction, la
        // feuille sait la faire toute seule.
        if (bonne) return texteDeProposition(bonne);
    }
    // La virgule française : une fiche de mathématiques n'écrit pas « 0.2 ».
    // Et les milliers se groupent, dans le corrigé comme dans l'énoncé : celui-ci
    // écrivait « 92 202 » et celui-là répondait « 90000 ».
    return espacerMilliers(String(item.answer).replace('.', ','));
}

// --- La modale ---------------------------------------------------------------

function assurerModale() {
    let modal = document.getElementById('print-questions-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'print-questions-modal';
    modal.className = 'modal-overlay modal-overlay--top';
    modal.innerHTML = `
        <div class="glass-panel modal-panel-lg fp-panel">
            <h3 class="modal-title">📝 Fiche d'exercices</h3>
            <!-- TROIS QUESTIONS, TOUJOURS DANS LE MÊME ORDRE, et les mêmes que
                 sur la fiche de grilles : QUOI dessus, COMBIEN, SUR QUEL
                 PAPIER. Cette fenêtre-ci sautait la première et portait treize
                 commandes : celle qui laissait le moins choisir ce qu'il y a
                 sur la feuille était celle qui avait le plus de boutons. -->

            <!-- ① QUOI — les réglages de l'exercice, et le seul choix de
                 contenu qui ne vienne pas de lui : proposer les réponses. -->
            <div class="fp-contenu" id="fq-contenu" hidden></div>
            <div class="fp-controles fp-controles--qcm">
                <label class="fq-case"><input type="checkbox" id="fq-choix"> Proposer les réponses (QCM)</label>
            </div>

            <!-- ② COMBIEN -->
            <div class="fp-controles fp-combien">
                <label>Combien
                    <span class="fp-pas">
                        <button type="button" class="fp-pas-btn" data-pas="-2" aria-label="Deux questions de moins">−</button>
                        <input type="number" id="fq-nb" class="cfg-input cfg-input--num" min="4" max="80" value="20">
                        <button type="button" class="fp-pas-btn" data-pas="2" aria-label="Deux questions de plus">+</button>
                    </span></label>
                <span class="fp-total" id="fq-total"></span>
                <button type="button" class="btn-hint" id="fq-regen">🎲 D'autres questions</button>
            </div>

            <!-- ③ SUR QUEL PAPIER — la consigne, le format, les colonnes, la
                 numérotation, le corrigé : des habitudes qu'on prend une fois.
                 Le repli se souvient d'être ouvert. -->
            <details class="fp-repli" id="fq-plus">
                <summary>Papier et corrigé</summary>
            <div class="fp-controles">
                <label class="pp-consigne">Consigne
                    <input type="text" id="fq-consigne" class="cfg-input"
                        placeholder="Écrite en tête de la feuille — facultatif"></label>
                <label>Corrigé
                    <select id="fq-sol-ou" class="cfg-input">
                        <option value="ensemble">Un seul PDF, solutions à la fin</option>
                        <option value="separe">Deux PDF séparés</option>
                        <option value="sans">Sans solutions</option>
                    </select></label>
            </div>
            <div class="fp-controles pp-mep">
                <label>Format
                    <select id="fq-orientation" class="cfg-input">
                        <option value="portrait">A4 portrait</option>
                        <option value="paysage">A4 paysage</option>
                    </select></label>
                <label>Impression
                    <select id="fq-couleur" class="cfg-input"></select></label>
                <label>Colonnes
                    <select id="fq-colonnes" class="cfg-input">
                        <option value="auto">auto</option>
                        <option value="1">1</option><option value="2">2</option>
                        <option value="3">3</option><option value="4">4</option>
                        <option value="5">5</option><option value="6">6</option><option value="6">6</option>
                    </select></label>
                <label>Place pour répondre
                    <select id="fq-lignes-rep" class="cfg-input">
                        <option value="0">Sur la ligne</option>
                        <option value="1">1 ligne dessous</option>
                        <option value="3">3 lignes — « Je sais que… »</option>
                        <option value="5">5 lignes — rédaction complète</option>
                    </select></label>
                <label class="fq-case"><input type="checkbox" id="fq-champs">
                    Champs remplissables (PDF)</label>
                <label class="fq-case"><input type="checkbox" id="fq-numeroter" checked>
                    Numéroter les questions</label>
            </div>
            <div class="fp-controles pp-sol-reglages">
                <label>Solutions
                    <select id="fq-sol-mode" class="cfg-input">
                        <option value="ultra">Ultra compact — réponses tassées, barème en couleur</option>
                        <option value="compact">Compact — juste les réponses</option>
                        <option value="normal">Normal — énoncé et réponse</option>
                        <option value="detaille">Détaillé — avec les explications</option>
                    </select></label>
                <label>Colonnes
                    <select id="fq-sol-colonnes" class="cfg-input"
                        aria-label="Colonnes de la feuille de solutions">
                        <option value="auto">auto</option>
                        <option value="1">1</option><option value="2">2</option>
                        <option value="3">3</option><option value="4">4</option>
                        <option value="5">5</option><option value="6">6</option>
                    </select></label>
            </div>
            </details>
            <div class="fp-apercu-cadre">
                <div class="fp-apercu fq-apercu" id="fq-apercu"></div>
            </div>
            <div class="fp-note" id="fq-note"></div>
            <div class="modal-actions-center">
                <button type="button" class="btn-toggle glass-btn modal-btn-flex modal-btn-flex--neutral" id="fq-fermer">Fermer</button>
                <button type="button" class="btn-toggle glass-btn primary active modal-btn-flex" id="fq-telecharger">⬇️ Télécharger le PDF</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    // Ancrer / détacher, et replier les réglages : les deux commandes vivent
    // dans le titre, comme sur la fiche de grilles.
    fenetreFiche = equiperFenetre(modal, CLE_FENETRE, { peutDetacher: fenetresDetachables });
    return modal;
}

/**
 * Ouvre la fiche écrite d'un exercice.
 * @param {Object} exo    - entrée de catalogue avec un générateur marqué `ecrit`
 * @param {Object} params - réglages courants (tables, opérations, difficulté…)
 * @param {Function} chargerJsPDF
 */
export function ouvrirFicheQuestions(exo, params, chargerJsPDF, opts = {}) {
    // La FICHE peut avoir son propre générateur (`printGeneratorId`) : la
    // virgule se fait glisser à l'écran et s'écrit sur le papier. On passe donc
    // par le même choix que partout ailleurs.
    const generator = generateurDeFiche(exo);
    if (!generator) return;

    // MODIFIABLE SUR PLACE : le bloc « Contenu » écrit dedans, et les questions
    // se retirent avec les nouvelles valeurs. `params` arrivait figé — trois
    // des quatre portes qui mènent ici passent d'ailleurs les valeurs par
    // défaut du catalogue, si bien qu'il n'existait aucun moyen de demander la
    // table de 7 depuis le banc d'essai.
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
    const reglages = { ...(exo.printParams || {}), ...(params || {}) };

    const modal = assurerModale();
    const apercu = modal.querySelector('#fq-apercu');
    const nbEl = modal.querySelector('#fq-nb');
    const choixEl = modal.querySelector('#fq-choix');
    const totalEl = modal.querySelector('#fq-total');
    const noteEl = modal.querySelector('#fq-note');
    const modeSol = modal.querySelector('#fq-sol-mode');
    const colSol = modal.querySelector('#fq-sol-colonnes');
    const ouSol = modal.querySelector('#fq-sol-ou');
    const orientEl = modal.querySelector('#fq-orientation');
    const couleurEl = modal.querySelector('#fq-couleur');
    retenirRepli(modal.querySelector('#fq-plus'), 'questions');
    const colsEl = modal.querySelector('#fq-colonnes');
    const champsEl = modal.querySelector('#fq-champs');
    const numEl = modal.querySelector('#fq-numeroter');
    // L'EN-TÊTE SE RÈGLE SUR LA FEUILLE, ICI AUSSI. Cette fenêtre-là n'offrait
    // AUCUN moyen de changer « Nom : …… / Date : …… » : c'était écrit en dur.
    // Le même geste que sur la fiche de parcours — cliquer le champ pour le
    // retirer, cliquer son fantôme pour l'ajouter — le rend réglable sans
    // ajouter une seule commande au panneau. Le titre, lui, est celui de
    // l'exercice et n'est pas à réécrire ; le cartouche de correction
    // n'appartient qu'aux interrogations, donc à la fiche de parcours.
    const feuille = { champs: ['nom', 'date'] };
    const consigneEl = modal.querySelector('#fq-consigne');
    const lignesRepEl = modal.querySelector('#fq-lignes-rep');
    const mesurer = mesureur();

    // La consigne de la feuille. Celle de l'écran parle de toucher, de glisser
    // et de boutons : sur papier elle n'a aucun sens. On propose donc la
    // première phrase de l'énoncé, et le professeur la réécrit.
    // `consignePapier` d'abord : c'est la consigne écrite POUR LA FEUILLE.
    // La première phrase de l'instruction d'écran est un repli — elle parle
    // souvent du geste (« Trois temps. », « Glisse la virgule »), qui n'a pas
    // de sens sur du papier.
    consigneEl.value = exo.consignePapier || premierePhrase(exo.instruction || '');

    // Le QCM n'a de sens que si le générateur produit des choix : sur un
    // exercice à réponse libre, la case n'aurait rien à cocher.
    const aDesChoix = (generator.answerKinds || []).includes('choice');
    // La RANGÉE entière disparaît, pas seulement l'étiquette : une bande vide
    // entre les réglages et le compteur se voit, et n'explique rien.
    choixEl.closest('.fp-controles').style.display = aDesChoix ? '' : 'none';
    if (!aDesChoix) choixEl.checked = false;

    let questions = [];

    const lire = () => ({
        nb: Math.max(4, Math.min(80, Number(nbEl.value) || 20)),
        avecChoix: choixEl.checked,
        modeSolution: modeSol.value,
        ouSolution: ouSol.value,
        orientation: orientEl.value,
        champs: champsEl.checked,
        numeroter: numEl.checked,
        colonnes: colsEl.value === 'auto' ? null : Number(colsEl.value),
        // LA PLACE POUR RÉDIGER. Un « Je sais que… / or… / donc… » ne tient
        // pas au bout d'une ligne de pointillés : il lui faut trois lignes
        // pleine largeur, et c'est au professeur de le décider — lui seul sait
        // s'il attend un résultat ou un raisonnement.
        lignesReponse: Number(lignesRepEl.value) || 0
    });

    // Le nombre de colonnes de la feuille de solutions n'est pas un réglage à
    // part : il découle du mode. Cinq colonnes de réponses nues pour corriger
    // vite, une seule quand chaque ligne porte son explication.
    const solutionsDe = (mode, orientation) => composerSolutions(questions, {
        mode, orientation,
        colonnesSolutions: colSol.value === 'auto' ? null : Number(colSol.value),
        // Une feuille sans numéros se corrige dans l'ordre : le corrigé
        // n'invente pas une numérotation que la feuille n'a pas.
        sections: numEl.checked ? null : [{ titre: exo.title, questions, numeroter: false }]
    }, mesurer);

    const completer = (nb) => {
        if (questions.length < nb) {
            questions = questions.concat(tirerQuestions(generator, reglages, nb - questions.length));
        }
        questions.length = nb;
    };

    // `ligneReponse` est une HAUTEUR en millimètres : n lignes d'écriture en
    // valent n fois une. Zéro laisse la réponse au bout de l'énoncé.
    const composer = (o) => composerBlocs([{
        titre: exo.title,
        // L'identifiant du bloc : c'est par lui que l'aperçu désigne la
        // question sur laquelle on vient de cliquer.
        id: exo.id || 'fiche',
        consigne: consigneEl.value,
        questions,
        colonnes: o.colonnes,
        numeroter: o.numeroter
    }], {
        avecChoix: o.avecChoix, orientation: o.orientation, champs: o.champs,
        // `lignesReponse` passe AUSSI à la mise en page : c'est elle qui trace
        // les traits, un par ligne demandée. Sans lui, on réservait la hauteur
        // de trois lignes et l'on n'en dessinait qu'une, tout au fond.
        ...(o.lignesReponse
            ? { ligneReponse: 7 * o.lignesReponse, lignesReponse: o.lignesReponse, interrogation: true }
            : {})
    }, mesurer);

    const rendre = () => {
        const o = lire();
        const { nb, modeSolution } = o;
        completer(nb);

        // L'APERÇU MONTRE LE DOCUMENT ENTIER, solutions comprises : on règle
        // la mise en page en voyant CE QU'ON AURA, corrigé compris, au lieu de
        // le découvrir à l'impression. « Sans solutions » les retire de
        // l'aperçu comme du fichier — l'aperçu ne ment jamais sur le PDF.
        const mise = composer(o);
        const sol = o.ouSolution !== 'sans' ? solutionsDe(modeSolution, o.orientation) : null;
        const pg = mise.page || pageDe(o.orientation);

        const large = apercu.parentElement.clientWidth || 640;
        const k = Math.min(large, 720) / pg.w;
        const vues = [
            ...mise.pages.map(page => ({ page, opts: mise.opts, liste: false, sousTitre: '' })),
            ...(sol ? sol.pages.map(page => ({ page, opts: sol.opts, liste: true, sousTitre: 'Solutions' })) : [])
        ];
        apercu.style.width = `${pg.w * k}px`;
        apercu.style.height = `${pg.h * k * vues.length + 12 * Math.max(0, vues.length - 1)}px`;

        apercu.innerHTML = teindreHtml(vues.map((v, i) => `
            <div class="fq-page${v.liste ? ' fq-page--sol' : ''}"
                 style="width:${pg.w * k}px; height:${pg.h * k}px; top:${i * (pg.h * k + 12)}px">
                ${apercuEntete(k, exo.title, v.sousTitre, null, pg, { champs: feuille.champs })}
                ${v.liste ? apercuSolutions(v.page, k, v.opts)
        : apercuItems(v.page, k, { ...v.opts, reglable: true })}
            </div>`).join(''));

        const enCol = mise.colonnes && mise.colonnes[0];
        totalEl.textContent = `${nb} questions · ${mise.pages.length} page${mise.pages.length > 1 ? 's' : ''}`
            + (sol ? ` + ${sol.pages.length} de solutions` : '')
            + ` · ${enCol} colonne${enCol > 1 ? 's' : ''}`;
        const OU = {
            ensemble: 'Les solutions seront ajoutées à la fin du même PDF.',
            separe: 'Les solutions partiront dans un second PDF, à garder pour toi.',
            sans: 'Le PDF ne contiendra que les questions.'
        };
        // « Les questions viennent des réglages de l'exercice » : la phrase
        // servait quand ces réglages étaient ailleurs. Ils sont maintenant en
        // haut de cette fenêtre — la dire encore serait décrire ce qu'on voit.
        noteEl.textContent = OU[ouSol.value] || '';
        // Les fantômes se reposent après chaque rendu : l'aperçu est réécrit
        // en entier, donc ce qu'il ne dessine pas disparaît avec lui.
        garnirDirect(feuille);
    };

    // Seuls les champs d'identité se touchent ici : le titre est celui de
    // l'exercice, et il n'y a pas de cartouche de correction sur une fiche
    // d'entraînement.
    const garnirDirect = brancherFicheDirecte(apercu, {
        lire: () => feuille,
        ecrire: (patch) => { Object.assign(feuille, patch); rendre(); },
        parties: { titre: false, champs: true, cartouche: false }
    });

    consigneEl.oninput = rendre;
    lignesRepEl.onchange = rendre;
    nbEl.oninput = rendre;
    // Le champ dit la vérité : au-delà de quatre-vingts questions, la borne
    // s'applique, et il faut la VOIR s'appliquer.
    nbEl.onchange = () => { nbEl.value = String(lire().nb); rendre(); };
    modal.querySelectorAll('.fp-pas-btn').forEach(b => {
        b.onclick = () => {
            nbEl.value = String(Math.max(4, Math.min(80, lire().nb + Number(b.dataset.pas))));
            rendre();
        };
    });
    choixEl.onchange = rendre;
    modeSol.onchange = rendre;
    colSol.onchange = rendre;
    orientEl.onchange = rendre;
    // LE CHOIX EST GLOBAL, la fiche ne fait que l'afficher et le changer :
    // un professeur qui imprime en noir et blanc le fait pour toutes ses
    // feuilles, pas pour celle-ci seulement.
    couleurEl.innerHTML = optionsPolycopie();
    couleurEl.value = modePolycopie();
    couleurEl.onchange = () => {
        reglerModePolycopie(couleurEl.value);
        poserTeinte(apercu);
        rendre();
    };
    poserTeinte(apercu);
    colsEl.onchange = rendre;
    champsEl.onchange = rendre;
    numEl.onchange = rendre;
    ouSol.onchange = rendre;
    modal.querySelector('#fq-regen').onclick = () => { questions = []; rendre(); };

    // --- ① QUOI : LES RÉGLAGES DE L'EXERCICE, sur la feuille elle-même -------
    //
    // Un réglage changé RETIRE les questions : elles ont été tirées avec
    // l'ancien, et garder des multiplications par 3 sur une fiche réglée en
    // table de 7 ferait mentir l'aperçu.
    monterPanneauContenu(modal.querySelector('#fq-contenu'), {
        exo, schemaCatalogue: paramSchemaOf(exo), generator, reglages,
        onChange: () => { questions = []; rendre(); }
    });

    // --- LES DEUX GESTES SUR UNE QUESTION ------------------------------------
    //
    // On ne retouche pas le TEXTE d'une question : sa réponse vient du
    // générateur, et un énoncé réécrit à la main laisserait le corrigé sur
    // l'ancienne valeur. Deux gestes suffisent, et gardent toujours l'énoncé
    // avec sa réponse :
    //
    //   🎲 EN RETIRER UNE AUTRE À CETTE PLACE — celle-ci ne convient pas
    //     (nombres trop gros, doublon, tournure), on en veut une autre SANS
    //     refaire toute la feuille. C'est le geste qui rend « D'autres
    //     questions » inutile la plupart du temps.
    //   ✕ LA RETIRER — la feuille en compte une de moins, et le champ du
    //     nombre suit : sinon `completer` en remettrait aussitôt une à la
    //     place, et le clic n'aurait l'air de rien faire.
    //
    // L'écouteur est posé sur l'aperçu, pas sur les boutons : ceux-ci sont
    // redessinés à chaque rendu.
    apercu.addEventListener('click', (ev) => {
        const neuf = ev.target.closest('[data-q-neuf]');
        const sup = ev.target.closest('[data-q-sup]');
        const btn = neuf || sup;
        if (!btn) return;
        const rang = Number(btn.dataset.qRang);
        if (!Number.isInteger(rang) || rang < 0 || rang >= questions.length) return;
        if (neuf) {
            const [remplacante] = tirerQuestions(generator, reglages, 1);
            if (remplacante) questions[rang] = remplacante;
        } else {
            questions.splice(rang, 1);
            // La modale borne le nombre à quatre : afficher trois ferait
            // revenir une question au rendu suivant, sans qu'on comprenne.
            nbEl.value = String(Math.max(4, questions.length));
        }
        rendre();
    });
    modal.querySelector('#fq-fermer').onclick = () => { modal.style.display = 'none'; };

    const btnDl = modal.querySelector('#fq-telecharger');
    btnDl.onclick = () => {
        btnDl.disabled = true;
        const o = lire();
        const { nb, modeSolution, ouSolution } = o;
        completer(nb);
        chargerJsPDF()
            .then(jsPDF => {
                const sens = o.orientation === 'paysage' ? 'landscape' : 'portrait';
                const neuf = () => teindreDoc(new jsPDF({ orientation: sens, unit: 'mm', format: 'a4' }));
                const pdf = neuf();
                const mise = composer(o);
                mise.pages.forEach((page, i) => {
                    if (i) pdf.addPage('a4', sens);
                    entetePdf(pdf, exo.title, mise.pages.length > 1 ? `page ${i + 1}/${mise.pages.length}` : '',
                        '', null, mise.page, { champs: feuille.champs });
                    pdfItems(pdf, page, mise.opts);
                });

                // Les solutions : à la suite, dans leur propre fichier, ou pas
                // du tout. Le second fichier existe pour le cas le plus banal
                // de la salle des profs — imprimer les questions en trente
                // exemplaires et le corrigé en un seul.
                const sol = ouSolution === 'sans' ? null : solutionsDe(modeSolution, o.orientation);
                const cible = ouSolution === 'separe' ? neuf() : pdf;
                if (sol) {
                    sol.pages.forEach((page, i) => {
                        // Dans le même document, chaque page de solutions est
                        // une page de plus ; dans un document neuf, la
                        // première existe déjà.
                        if (cible === pdf || i > 0) cible.addPage('a4', sens);
                        entetePdf(cible, exo.title, 'Solutions', '', null, sol.page,
                            { champs: feuille.champs });
                        pdfSolutions(cible, page, sol.opts);
                    });
                }
                pdf.save(`${exo.id}-${nb}-questions.pdf`);
                if (sol && cible !== pdf) cible.save(`${exo.id}-solutions-${modeSolution}.pdf`);
            })
            .catch(() => import('./modal.js').then(m => m.showAlert(
                'Le générateur de PDF n\'a pas pu être chargé. Recharge la page : '
                + 'la bibliothèque est servie avec l\'application, elle ne dépend d\'aucun site extérieur.')))
            .finally(() => { btnDl.disabled = false; });
    };

    questions = [];
    // Le nombre de colonnes que l'exercice sait lui convenir — le professeur
    // reste libre de le changer.
    colsEl.value = exo.colonnesPapier ? String(exo.colonnesPapier) : 'auto';
    // ET LA PLACE POUR ÉCRIRE. Un exercice de vitesse ne se répond pas au bout
    // d'une ligne de pointillés : il faut poser d = v × t, remplacer, calculer,
    // et conclure avec l'unité. Rémy : « place pour les calculs et la réponse ».
    // Le professeur reste libre d'en remettre ou d'en enlever.
    lignesRepEl.value = exo.lignesReponsePapier != null
        ? String(exo.lignesReponsePapier) : '0';
    // De quoi se redessiner quand la fenêtre change de taille : l'aperçu
    // calcule son échelle sur la largeur disponible.
    modal._flotRendre = () => rendre();
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
