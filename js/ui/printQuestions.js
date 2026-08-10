// LE MODE ÉCRIT — un exercice de l'écran devenu feuille d'exercices.
//
// Le même générateur qui alimente le jeu alimente ici une fiche : autant de
// questions qu'on veut, numérotées, avec la place pour écrire, et les réponses
// sur la dernière page. C'est le pendant papier du mode robot — l'un montre
// comment on fait, l'autre laisse faire sans écran.
//
// Deux choses le rendent utilisable en classe plutôt que joli en démonstration :
//
//  · les questions viennent des RÉGLAGES de l'exercice. Le professeur choisit
//    ses tables, ses opérations, sa difficulté dans le panneau habituel, et la
//    fiche en découle. Il n'y a pas deux catalogues à tenir à jour.
//  · l'aperçu et le PDF partagent la mise en page au millimètre (core/fiche.js
//    coupe les lignes UNE fois pour les deux). Ce qu'on voit à l'écran est ce
//    qui sort de l'imprimante — y compris les débordements, qu'on voit donc
//    avant de photocopier trente exemplaires.

import { getGenerator } from '../core/registry.js';
import { makeRng } from '../core/ids.js';
import { A4, composerFiche, composerSolutions } from '../core/fiche.js';

const ENCRE = { texte: [30, 41, 59], gris: [120, 128, 142], trait: [26, 32, 44], pointille: [172, 180, 195] };

/**
 * Mesure la largeur d'un texte en millimètres, avec les métriques Helvetica.
 *
 * Un canevas hors écran suffit : sa police par défaut est la même famille que
 * celle du PDF, et l'aperçu peut donc se calculer SANS attendre le chargement
 * de jsPDF — donc hors ligne, et instantanément à chaque changement de réglage.
 */
function mesureur() {
    const c = document.createElement('canvas').getContext('2d');
    // `taille` est le CORPS de la police, en millimètres — la même grandeur
    // que celle passée à jsPDF (à la conversion points près). L'aperçu doit
    // donc afficher exactement `taille × k` pixels, et dans la MÊME police :
    // mesurer en Helvetica pour afficher en Outfit produisait des lignes qui
    // débordaient sur la colonne voisine. On travaille à 100× pour limiter les
    // arrondis du moteur de mesure.
    return (texte, taille) => {
        c.font = `${taille * 100}px Helvetica, Arial, sans-serif`;
        return c.measureText(texte).width / 100;
    };
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
        const texte = (item.prompt && item.prompt.text) || '';
        if (vus.has(texte) && essai < nb * 6) continue;
        vus.add(texte);
        out.push({
            texte,
            sous: (item.prompt && item.prompt.sub) || '',
            choix: item.choices ? item.choices.map(c => String(c.label ?? c.value)) : null,
            reponse: formaterReponse(item)
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

// --- Aperçu HTML -------------------------------------------------------------

function apercuPage(page, k, options, avecSolutions) {
    let html = '';
    for (const b of page.blocs) {
        if (!avecSolutions) {
            html += `<div class="fq-num" style="left:${b.x * k}px; top:${b.y * k}px; font-size:${options.taille * k}px">${b.n}.</div>`;
        }
        b.lignes.forEach((ligne, i) => {
            const x = avecSolutions ? b.x : b.texteX;
            html += `<div class="fq-ligne" style="left:${x * k}px; top:${(b.y + i * options.interligne) * k}px;
                width:${(avecSolutions ? b.largeur : b.texteW) * k}px;
                font-size:${options.taille * k}px">${echapper(ligne)}</div>`;
        });
        if (b.choix) {
            const y = b.y + b.lignes.length * options.interligne;
            html += `<div class="fq-choix" style="left:${b.texteX * k}px; top:${y * k}px;
                font-size:${options.taille * k * .9}px">${b.choix.map(c => '☐ ' + echapper(c)).join('&nbsp;&nbsp;')}</div>`;
        }
        if (!avecSolutions) {
            html += `<div class="fq-reponse" style="left:${b.texteX * k}px; top:${b.reponseY * k}px;
                width:${b.texteW * k}px"></div>`;
        }
    }
    return html;
}

const echapper = (s) => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// --- PDF ---------------------------------------------------------------------

function entete(doc, titre, sousTitre, consigne) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...ENCRE.texte);
    doc.text(`${titre}${sousTitre ? ' — ' + sousTitre : ''}`, A4.marge, A4.marge + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text('Nom : ...........................   Date : ..............',
        A4.w - A4.marge, A4.marge + 6, { align: 'right' });
    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.4);
    doc.line(A4.marge, A4.marge + 9, A4.w - A4.marge, A4.marge + 9);
    if (consigne) {
        doc.setFontSize(8.8);
        doc.setTextColor(...ENCRE.gris);
        doc.text(doc.splitTextToSize(consigne, A4.w - A4.marge * 2).slice(0, 2), A4.marge, A4.marge + 14);
    }
    doc.setFontSize(6.5);
    doc.setTextColor(160, 165, 175);
    doc.text('Fiche générée par AtoutMath', A4.w / 2, A4.h - 4, { align: 'center' });
}

function pointilles(doc, x, y, largeur) {
    doc.setDrawColor(...ENCRE.pointille);
    doc.setLineWidth(0.25);
    doc.setLineDashPattern([0.7, 1.1], 0);
    doc.line(x, y, x + largeur, y);
    doc.setLineDashPattern([], 0);
}

function pagePdf(doc, page, options, avecSolutions) {
    doc.setTextColor(...ENCRE.texte);
    for (const b of page.blocs) {
        if (!avecSolutions) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(options.taille * 2.83);
            doc.text(`${b.n}.`, b.x, b.y + options.taille);
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(options.taille * 2.83);
        b.lignes.forEach((ligne, i) => {
            doc.text(ligne, avecSolutions ? b.x : b.texteX, b.y + options.taille + i * options.interligne);
        });
        if (b.choix) {
            doc.setFontSize(options.taille * 2.5);
            doc.setTextColor(...ENCRE.gris);
            doc.text(b.choix.map(c => `☐ ${c}`).join('   '),
                b.texteX, b.y + options.taille + b.lignes.length * options.interligne);
            doc.setTextColor(...ENCRE.texte);
        }
        if (!avecSolutions) pointilles(doc, b.texteX, b.reponseY, b.texteW);
    }
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
                <label>Colonnes
                    <input type="number" id="fq-cols" class="cfg-input cfg-input--num" min="1" max="3" value="2"></label>
                <label class="fq-case"><input type="checkbox" id="fq-choix"> Proposer les réponses (QCM)</label>
                <span class="fp-total" id="fq-total"></span>
                <button type="button" class="btn-hint" id="fq-regen">🎲 D'autres questions</button>
                <button type="button" class="btn-hint" id="fq-voir-sol" aria-pressed="false">Voir les solutions</button>
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
    const colsEl = modal.querySelector('#fq-cols');
    const choixEl = modal.querySelector('#fq-choix');
    const totalEl = modal.querySelector('#fq-total');
    const noteEl = modal.querySelector('#fq-note');
    const btnSol = modal.querySelector('#fq-voir-sol');
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
        colonnes: Math.max(1, Math.min(3, Number(colsEl.value) || 2)),
        avecChoix: choixEl.checked
    });

    const completer = (nb) => {
        if (questions.length < nb) {
            questions = questions.concat(tirerQuestions(generator, params, nb - questions.length));
        }
        questions.length = nb;
    };

    const rendre = () => {
        const { nb, colonnes, avecChoix } = lire();
        completer(nb);

        const mise = solutions
            ? composerSolutions(questions, { colonnesSolutions: 4 }, mesurer)
            : composerFiche(questions, { colonnes, avecChoix }, mesurer);

        const large = apercu.parentElement.clientWidth || 640;
        const k = Math.min(large, 720) / A4.w;
        apercu.style.width = `${A4.w * k}px`;
        apercu.style.height = `${A4.h * k * mise.pages.length + 12 * (mise.pages.length - 1)}px`;

        const consigne = solutions ? '' : (exo.instruction || '');
        apercu.innerHTML = mise.pages.map((page, i) => `
            <div class="fq-page" style="width:${A4.w * k}px; height:${A4.h * k}px; top:${i * (A4.h * k + 12)}px">
                <div class="fp-entete" style="left:${A4.marge * k}px; right:${A4.marge * k}px; top:${(A4.marge + 1) * k}px;">
                    <b>${echapper(exo.title)}${solutions ? ' — Solutions' : ''}</b>
                    <span>Nom : ............  Date : ......</span>
                </div>
                <div class="fp-ligne" style="left:${A4.marge * k}px; right:${A4.marge * k}px; top:${(A4.marge + 9) * k}px;"></div>
                ${(!solutions && i === 0 && consigne) ? `<div class="fq-consigne" style="left:${A4.marge * k}px;
                    width:${(A4.w - A4.marge * 2) * k}px; top:${(A4.marge + 11) * k}px; font-size:${Math.max(7, 3 * k)}px">${echapper(consigne)}</div>` : ''}
                ${apercuPage(page, k, mise.opts, solutions)}
            </div>`).join('');

        totalEl.textContent = `${nb} questions · ${mise.pages.length} page${mise.pages.length > 1 ? 's' : ''}`;
        noteEl.textContent = solutions
            ? 'La page des solutions : à garder pour corriger, ou à distribuer après.'
            : `Les questions viennent des réglages de l'exercice. La dernière page du PDF donne les réponses.`;
    };

    nbEl.oninput = rendre;
    colsEl.oninput = rendre;
    choixEl.onchange = rendre;
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
        const { nb, colonnes, avecChoix } = lire();
        completer(nb);
        chargerJsPDF()
            .then(jsPDF => {
                const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                const mise = composerFiche(questions, { colonnes, avecChoix }, mesurer);
                mise.pages.forEach((page, i) => {
                    if (i) doc.addPage('a4', 'portrait');
                    entete(doc, exo.title, mise.pages.length > 1 ? `page ${i + 1}/${mise.pages.length}` : '',
                        i === 0 ? exo.instruction : '');
                    pagePdf(doc, page, mise.opts, false);
                });
                const sol = composerSolutions(questions, { colonnesSolutions: 4 }, mesurer);
                sol.pages.forEach((page) => {
                    doc.addPage('a4', 'portrait');
                    entete(doc, exo.title, 'Solutions', '');
                    pagePdf(doc, page, sol.opts, true);
                });
                doc.save(`${exo.id}-${nb}-questions.pdf`);
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
