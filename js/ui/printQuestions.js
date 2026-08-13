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

import { getGenerator } from '../core/registry.js';
import { makeRng } from '../core/ids.js';
import { composerBlocs, composerSolutions, pageDe } from '../core/fiche.js';
import {
    mesureur, echapper, apercuItems, apercuEntete, entetePdf, pdfItems, pourPdf, ENCRE
} from './ficheRendu.js';

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
            choix: item.choices ? item.choices.map(c => String(c.label ?? c.value)) : null,
            reponse: formaterReponse(item),
            // L'explication du générateur : elle ne sert qu'à la feuille de
            // solutions détaillée, celle qu'on distribue après le contrôle.
            explication: item.explanation || ''
        });
    }
    return out;
}

function formaterReponse(item) {
    if (item.answerKind === 'choice' && item.choices) {
        const bonne = item.choices.find(c => c.correct);
        if (bonne) return String(bonne.label ?? bonne.value);
    }
    // La virgule française : une fiche de mathématiques n'écrit pas « 0.2 ».
    return String(item.answer).replace('.', ',');
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
            <div class="fp-controles">
                <label>Questions
                    <input type="number" id="fq-nb" class="cfg-input cfg-input--num" min="4" max="80" value="20"></label>
                <label class="fq-case"><input type="checkbox" id="fq-choix"> Proposer les réponses (QCM)</label>
                <span class="fp-total" id="fq-total"></span>
                <button type="button" class="btn-hint" id="fq-regen">🎲 D'autres questions</button>
            </div>
            <!-- Les réglages de mise en page au contact de l'aperçu : ce
                 sont ceux dont on juge l'effet en REGARDANT la feuille. -->
            <div class="fp-controles pp-mep">
                <label class="pp-consigne">Consigne
                    <input type="text" id="fq-consigne" class="cfg-input"
                        placeholder="Écrite en tête de la feuille — facultatif"></label>
                <label>Format
                    <select id="fq-orientation" class="cfg-input">
                        <option value="portrait">A4 portrait</option>
                        <option value="paysage">A4 paysage</option>
                    </select></label>
                <label>Colonnes
                    <select id="fq-colonnes" class="cfg-input">
                        <option value="auto">auto</option>
                        <option value="1">1</option><option value="2">2</option>
                        <option value="3">3</option><option value="4">4</option>
                        <option value="5">5</option><option value="6">6</option>
                    </select></label>
                <label class="fq-case"><input type="checkbox" id="fq-champs">
                    Champs remplissables (PDF)</label>
                <label class="fq-case"><input type="checkbox" id="fq-numeroter" checked>
                    Numéroter les questions</label>
            </div>
            <div class="fp-controles pp-sol-reglages">
                <label>Solutions
                    <select id="fq-sol-mode" class="cfg-input">
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
                        <option value="5">5</option>
                    </select></label>
                <label>Fichier
                    <select id="fq-sol-ou" class="cfg-input">
                        <option value="ensemble">Un seul PDF, solutions à la fin</option>
                        <option value="separe">Deux PDF séparés</option>
                        <option value="sans">Sans solutions</option>
                    </select></label>
            </div>
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
    return modal;
}

function apercuSolutions(page, k, o) {
    let html = '';
    for (const b of page.blocs) {
        b.lignes.forEach((ligne, i) => {
            html += `<div class="fq-ligne" style="left:${b.x * k}px; top:${(b.y + i * o.interligne) * k}px;
                width:${b.largeur * k}px; font-size:${o.taille * k}px">${echapper(ligne)}</div>`;
        });
    }
    return html;
}

function pdfSolutions(pdf, page, o) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(o.taille * 2.83);
    pdf.setTextColor(...ENCRE.texte);
    for (const b of page.blocs) {
        b.lignes.forEach((ligne, i) => {
            pdf.text(pourPdf(ligne), b.x, b.y + o.taille + i * o.interligne);
        });
    }
}

/**
 * Ouvre la fiche écrite d'un exercice.
 * @param {Object} exo    - entrée de catalogue avec un générateur marqué `ecrit`
 * @param {Object} params - réglages courants (tables, opérations, difficulté…)
 * @param {Function} chargerJsPDF
 */
export function ouvrirFicheQuestions(exo, params, chargerJsPDF) {
    const generator = getGenerator(exo.generatorId);
    if (!generator) return;

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
    const colsEl = modal.querySelector('#fq-colonnes');
    const champsEl = modal.querySelector('#fq-champs');
    const numEl = modal.querySelector('#fq-numeroter');
    const consigneEl = modal.querySelector('#fq-consigne');
    const mesurer = mesureur();

    // La consigne de la feuille. Celle de l'écran parle de toucher, de glisser
    // et de boutons : sur papier elle n'a aucun sens. On propose donc la
    // première phrase de l'énoncé, et le professeur la réécrit.
    consigneEl.value = premierePhrase(exo.instruction || '');

    // Le QCM n'a de sens que si le générateur produit des choix : sur un
    // exercice à réponse libre, la case n'aurait rien à cocher.
    const aDesChoix = (generator.answerKinds || []).includes('choice');
    choixEl.parentElement.style.display = aDesChoix ? '' : 'none';
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
        colonnes: colsEl.value === 'auto' ? null : Number(colsEl.value)
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
            questions = questions.concat(tirerQuestions(generator, params, nb - questions.length));
        }
        questions.length = nb;
    };

    const composer = (o) => composerBlocs([{
        titre: exo.title,
        consigne: consigneEl.value,
        questions,
        colonnes: o.colonnes,
        numeroter: o.numeroter
    }], { avecChoix: o.avecChoix, orientation: o.orientation, champs: o.champs }, mesurer);

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

        apercu.innerHTML = vues.map((v, i) => `
            <div class="fq-page${v.liste ? ' fq-page--sol' : ''}"
                 style="width:${pg.w * k}px; height:${pg.h * k}px; top:${i * (pg.h * k + 12)}px">
                ${apercuEntete(k, exo.title, v.sousTitre, null, pg)}
                ${v.liste ? apercuSolutions(v.page, k, v.opts) : apercuItems(v.page, k, v.opts)}
            </div>`).join('');

        const enCol = mise.colonnes && mise.colonnes[0];
        totalEl.textContent = `${nb} questions · ${mise.pages.length} page${mise.pages.length > 1 ? 's' : ''}`
            + (sol ? ` + ${sol.pages.length} de solutions` : '')
            + ` · ${enCol} colonne${enCol > 1 ? 's' : ''}`;
        const OU = {
            ensemble: 'Les solutions seront ajoutées à la fin du même PDF.',
            separe: 'Les solutions partiront dans un second PDF, à garder pour toi.',
            sans: 'Le PDF ne contiendra que les questions.'
        };
        noteEl.textContent = `Les questions viennent des réglages de l'exercice. ${OU[ouSol.value] || ''}`;
    };

    consigneEl.oninput = rendre;
    nbEl.oninput = rendre;
    choixEl.onchange = rendre;
    modeSol.onchange = rendre;
    colSol.onchange = rendre;
    orientEl.onchange = rendre;
    colsEl.onchange = rendre;
    champsEl.onchange = rendre;
    numEl.onchange = rendre;
    ouSol.onchange = rendre;
    modal.querySelector('#fq-regen').onclick = () => { questions = []; rendre(); };
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
                const neuf = () => new jsPDF({ orientation: sens, unit: 'mm', format: 'a4' });
                const pdf = neuf();
                const mise = composer(o);
                mise.pages.forEach((page, i) => {
                    if (i) pdf.addPage('a4', sens);
                    entetePdf(pdf, exo.title, mise.pages.length > 1 ? `page ${i + 1}/${mise.pages.length}` : '',
                        '', null, mise.page);
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
                        entetePdf(cible, exo.title, 'Solutions', '', null, sol.page);
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
    modal.style.display = 'flex';
    rendre();
}
