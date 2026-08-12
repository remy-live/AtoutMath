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
    mesureur, echapper, apercuItems, apercuEntete, entetePdf, pdfItems, ENCRE
} from './ficheRendu.js';

/** Les questions de la fiche, tirées du générateur avec les réglages courants. */
function tirerQuestions(generator, params, nb) {
    const vus = new Set();
    const out = [];
    // On évite les doublons — une fiche qui pose deux fois « 7 × 8 » a l'air
    // bâclée — sans boucler indéfiniment quand le générateur a peu de cas
    // possibles (les compléments à 10, par exemple).
    for (let essai = 0; out.length < nb && essai < nb * 12; essai++) {
        const item = generator.generate(params, { index: out.length, rng: makeRng() });
        const texte = (item.prompt && item.prompt.text) || '';
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
                <button type="button" class="btn-hint" id="fq-voir-sol" aria-pressed="false">Voir les solutions</button>
            </div>
            <div class="fp-controles pp-mep">
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
    const btnSol = modal.querySelector('#fq-voir-sol');
    const modeSol = modal.querySelector('#fq-sol-mode');
    const ouSol = modal.querySelector('#fq-sol-ou');
    const orientEl = modal.querySelector('#fq-orientation');
    const colsEl = modal.querySelector('#fq-colonnes');
    const champsEl = modal.querySelector('#fq-champs');
    const numEl = modal.querySelector('#fq-numeroter');
    const mesurer = mesureur();

    // Le QCM n'a de sens que si le générateur produit des choix : sur un
    // exercice à réponse libre, la case n'aurait rien à cocher.
    const aDesChoix = (generator.answerKinds || []).includes('choice');
    choixEl.parentElement.style.display = aDesChoix ? '' : 'none';
    if (!aDesChoix) choixEl.checked = false;

    let questions = [];
    let solutions = false;

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
        consigne: exo.instruction || '',
        questions,
        colonnes: o.colonnes,
        numeroter: o.numeroter
    }], { avecChoix: o.avecChoix, orientation: o.orientation, champs: o.champs }, mesurer);

    const rendre = () => {
        const o = lire();
        const { nb, modeSolution } = o;
        completer(nb);

        const mise = solutions ? solutionsDe(modeSolution, o.orientation) : composer(o);
        const pg = mise.page || pageDe(o.orientation);

        const large = apercu.parentElement.clientWidth || 640;
        const k = Math.min(large, 720) / pg.w;
        apercu.style.width = `${pg.w * k}px`;
        apercu.style.height = `${pg.h * k * mise.pages.length + 12 * (mise.pages.length - 1)}px`;

        apercu.innerHTML = mise.pages.map((page, i) => `
            <div class="fq-page" style="width:${pg.w * k}px; height:${pg.h * k}px; top:${i * (pg.h * k + 12)}px">
                ${apercuEntete(k, exo.title, solutions ? 'Solutions' : '', null, pg)}
                ${solutions ? apercuSolutions(page, k, mise.opts) : apercuItems(page, k, mise.opts)}
            </div>`).join('');

        const enCol = mise.colonnes && mise.colonnes[0];
        totalEl.textContent = `${nb} questions · ${mise.pages.length} page${mise.pages.length > 1 ? 's' : ''}`
            + (solutions ? '' : ` · ${enCol} colonne${enCol > 1 ? 's' : ''}`);
        const OU = {
            ensemble: 'Les solutions seront ajoutées à la fin du même PDF.',
            separe: 'Les solutions partiront dans un second PDF, à garder pour toi.',
            sans: 'Le PDF ne contiendra que les questions.'
        };
        noteEl.textContent = solutions
            ? 'La page des solutions : à garder pour corriger, ou à distribuer après.'
            : `Les questions viennent des réglages de l'exercice. ${OU[ouSol.value] || ''}`;
    };

    nbEl.oninput = rendre;
    choixEl.onchange = rendre;
    modeSol.onchange = rendre;
    orientEl.onchange = rendre;
    colsEl.onchange = rendre;
    champsEl.onchange = rendre;
    numEl.onchange = rendre;
    ouSol.onchange = rendre;
    modal.querySelector('#fq-regen').onclick = () => { questions = []; rendre(); };
    btnSol.onclick = () => {
        solutions = !solutions;
        btnSol.textContent = solutions ? 'Voir les questions' : 'Voir les solutions';
        btnSol.setAttribute('aria-pressed', String(solutions));
        rendre();
    };
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
            .catch(() => window.appConfirm('PDF indisponible',
                'La bibliothèque de PDF n\'a pas pu être chargée (connexion ?). Réessaie une fois en ligne.', null))
            .finally(() => { btnDl.disabled = false; });
    };

    questions = [];
    solutions = false;
    btnSol.textContent = 'Voir les solutions';
    modal.style.display = 'flex';
    rendre();
}
