// LA FICHE D'UN PARCOURS — le parcours de l'écran, sur papier.
//
// Le professeur a déjà composé sa séance : trois exercices, dans cet ordre,
// avec ces réglages. La fiche n'est que la même chose imprimée — on ne lui
// demande pas de recomposer quoi que ce soit, on lui demande combien de
// questions il veut par étape.
//
// Deux documents, et c'est toute la différence entre un entraînement et une
// évaluation :
//
//   FICHE D'EXERCICES  chaque étape a son titre et sa consigne, les questions
//                      sont numérotées en continu, et les solutions sont en
//                      dernière page.
//   INTERROGATION      pas de consigne (elle a été donnée en classe), un
//                      barème par exercice, et une page solutions qui reste
//                      dans la main du professeur. Les questions y sont plus
//                      espacées : on écrit sur la feuille, pas au brouillon.
//
// Les étapes qui n'existent pas sur papier — un jeu d'arcade, un rapporteur à
// manœuvrer — sont ANNONCÉES comme telles plutôt que silencieusement omises.
// Un professeur qui compte trois exercices et n'en voit que deux se demande
// ce qu'il a raté.

import { hydratePath } from '../core/path.js';
import { getGenerator } from '../core/registry.js';
import { makeRng } from '../core/ids.js';
import { A4, composerFiche, composerSolutions } from '../core/fiche.js';
import { chargerJsPDF } from './printSheet.js';

const ENCRE = { texte: [30, 41, 59], gris: [120, 128, 142], trait: [26, 32, 44], pointille: [172, 180, 195] };

const echapper = (s) => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function mesureur() {
    const c = document.createElement('canvas').getContext('2d');
    return (texte, taille) => {
        c.font = `${taille * 100}px Helvetica, Arial, sans-serif`;
        return c.measureText(texte).width / 100;
    };
}

/**
 * Les étapes du parcours, triées en « imprimables » et « à l'écran seulement ».
 * On ne devine pas : c'est le générateur qui déclare `ecrit`.
 */
export function analyserParcours(chemin) {
    const { steps } = hydratePath(chemin);
    const papier = [], ecran = [];
    for (const s of steps) {
        const gen = s.exercise.generatorId ? getGenerator(s.exercise.generatorId) : null;
        if (gen && gen.ecrit) papier.push({ ...s, generator: gen });
        else ecran.push(s);
    }
    return { papier, ecran, total: steps.length };
}

/** Tire les questions d'une étape, avec les réglages voulus par le professeur. */
function questionsDe(etape, nb) {
    const vus = new Set();
    const out = [];
    for (let essai = 0; out.length < nb && essai < nb * 12; essai++) {
        const item = etape.generator.generate(etape.params, { index: out.length, rng: makeRng() });
        const texte = (item.prompt && item.prompt.text) || '';
        if (vus.has(texte) && essai < nb * 6) continue;
        vus.add(texte);
        out.push({
            texte,
            choix: item.choices ? item.choices.map(c => String(c.label ?? c.value)) : null,
            reponse: formaterReponse(item),
            etape: etape.title
        });
    }
    return out;
}

function formaterReponse(item) {
    if (item.answerKind === 'choice' && item.choices) {
        const bonne = item.choices.find(c => c.correct);
        if (bonne) return String(bonne.label ?? bonne.value);
    }
    return String(item.answer).replace('.', ',');
}

/**
 * Assemble le document : les questions de toutes les étapes, à la suite, avec
 * un intertitre par étape. La numérotation est CONTINUE d'une étape à l'autre
 * — « exercice 2, question 14 » se retrouve d'un coup d'œil quand on corrige.
 */
export function assembler(etapes, quantites, options, mesurer) {
    const questions = [];
    for (const e of etapes) {
        const nb = Math.max(0, quantites[e.stepId] ?? e.nbItems ?? 5);
        if (!nb) continue;
        // L'intertitre est un BLOC de la mise en page, pas une décoration
        // posée après coup : dessiné après, il atterrit sur la première
        // question de sa section.
        questions.push({ titre: true, texte: e.title });
        questions.push(...questionsDe(e, nb));
    }
    // En interrogation, on écrit sur la feuille : il faut de la place.
    const mise = composerFiche(questions, {
        colonnes: options.colonnes,
        avecChoix: options.avecChoix,
        ligneReponse: options.interrogation ? 13 : 7,
        entreQuestions: options.interrogation ? 6 : 4.2
    }, mesurer);
    return { questions, mise };
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
            <div class="fp-controles">
                <label class="fq-case"><input type="checkbox" id="pp-interro"> Mode interrogation</label>
                <label>Colonnes <input type="number" id="pp-cols" class="cfg-input cfg-input--num" min="1" max="3" value="2"></label>
                <label class="fq-case"><input type="checkbox" id="pp-choix"> Proposer les réponses</label>
                <span class="fp-total" id="pp-total"></span>
                <button type="button" class="btn-hint" id="pp-regen">🎲 D'autres questions</button>
                <button type="button" class="btn-hint" id="pp-sol" aria-pressed="false">Voir les solutions</button>
            </div>
            <div class="pp-etapes" id="pp-etapes"></div>
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

function apercuPage(page, k, o, solutions) {
    let html = '';
    for (const b of page.blocs) {
        if (b.titre) {
            html += `<div class="pp-inter" style="left:${b.x * k}px; top:${b.y * k}px; width:${b.largeur * k}px;
                font-size:${o.taille * k * 1.05}px">${echapper(b.lignes.join(' '))}</div>`;
            continue;
        }
        if (!solutions) {
            html += `<div class="fq-num" style="left:${b.x * k}px; top:${b.y * k}px; font-size:${o.taille * k}px">${b.n}.</div>`;
        }
        b.lignes.forEach((ligne, i) => {
            const x = solutions ? b.x : b.texteX;
            html += `<div class="fq-ligne" style="left:${x * k}px; top:${(b.y + i * o.interligne) * k}px;
                width:${(solutions ? b.largeur : b.texteW) * k}px; font-size:${o.taille * k}px">${echapper(ligne)}</div>`;
        });
        if (b.choix) {
            html += `<div class="fq-choix" style="left:${b.texteX * k}px; top:${(b.y + b.lignes.length * o.interligne) * k}px;
                font-size:${o.taille * k * .9}px">${b.choix.map(c => '☐ ' + echapper(c)).join('&nbsp;&nbsp;')}</div>`;
        }
        if (!solutions) {
            html += `<div class="fq-reponse" style="left:${b.texteX * k}px; top:${b.reponseY * k}px; width:${b.texteW * k}px"></div>`;
        }
    }
    return html;
}

export function ouvrirFicheParcours(chemin) {
    const { papier, ecran, total } = analyserParcours(chemin);
    const m = assurerModale();
    const mesurer = mesureur();

    const apercu = m.querySelector('#pp-apercu');
    const interro = m.querySelector('#pp-interro');
    const colsEl = m.querySelector('#pp-cols');
    const choixEl = m.querySelector('#pp-choix');
    const totalEl = m.querySelector('#pp-total');
    const noteEl = m.querySelector('#pp-note');
    const btnSol = m.querySelector('#pp-sol');

    let solutions = false;
    let doc = null;
    const quantites = {};
    papier.forEach(e => { quantites[e.stepId] = Math.max(1, Math.min(40, e.nbItems || 5)); });

    // La liste des étapes, avec le nombre de questions de chacune : c'est le
    // seul réglage propre au parcours, et il ne demande pas d'éditeur de mise
    // en page pour être utile.
    m.querySelector('#pp-etapes').innerHTML = papier.map(e => `
        <label class="pp-etape">
            <span class="pp-etape-nom">${echapper(e.title)}</span>
            <input type="number" class="cfg-input cfg-input--num" data-etape="${e.stepId}"
                min="0" max="40" value="${quantites[e.stepId]}">
            <span class="pp-etape-unite">questions</span>
        </label>`).join('')
        + (ecran.length ? `<div class="pp-ecran">Sur écran seulement : ${ecran.map(e => echapper(e.title)).join(', ')}
             — ${ecran.length > 1 ? 'ces activités demandent' : 'cette activité demande'} de manipuler, elles ne se photocopient pas.</div>` : '');

    m.querySelectorAll('[data-etape]').forEach(inp => {
        inp.oninput = () => {
            quantites[inp.dataset.etape] = Math.max(0, Math.min(40, Number(inp.value) || 0));
            doc = null;
            rendre();
        };
    });

    const options = () => ({
        interrogation: interro.checked,
        colonnes: Math.max(1, Math.min(3, Number(colsEl.value) || 2)),
        avecChoix: choixEl.checked
    });

    const rendre = () => {
        const o = options();
        if (!doc) doc = assembler(papier, quantites, o, mesurer);
        else doc.mise = composerFiche(doc.questions, {
            colonnes: o.colonnes, avecChoix: o.avecChoix,
            ligneReponse: o.interrogation ? 13 : 7,
            entreQuestions: o.interrogation ? 6 : 4.2
        }, mesurer);

        const mise = solutions
            ? composerSolutions(doc.questions.filter(q => !q.titre), { colonnesSolutions: 4 }, mesurer)
            : doc.mise;

        const large = apercu.parentElement.clientWidth || 640;
        const k = Math.min(large, 700) / A4.w;
        apercu.style.width = `${A4.w * k}px`;
        apercu.style.height = `${A4.h * k * mise.pages.length + 12 * Math.max(0, mise.pages.length - 1)}px`;

        const nom = chemin.name || 'Parcours';
        apercu.innerHTML = mise.pages.map((page, i) => `
            <div class="fq-page" style="width:${A4.w * k}px; height:${A4.h * k}px; top:${i * (A4.h * k + 12)}px">
                <div class="fp-entete" style="left:${A4.marge * k}px; right:${A4.marge * k}px; top:${(A4.marge + 1) * k}px;">
                    <b>${echapper(nom)}${solutions ? ' — Solutions' : (o.interrogation ? ' — Interrogation' : '')}</b>
                    <span>Nom : ............  Date : ......</span>
                </div>
                <div class="fp-ligne" style="left:${A4.marge * k}px; right:${A4.marge * k}px; top:${(A4.marge + 9) * k}px;"></div>
                ${apercuPage(page, k, mise.opts, solutions)}
            </div>`).join('');

        const nb = doc.questions.filter(q => !q.titre).length;
        totalEl.textContent = `${nb} question${nb > 1 ? 's' : ''} · ${mise.pages.length} page${mise.pages.length > 1 ? 's' : ''}`;
        noteEl.textContent = o.interrogation
            ? 'Interrogation : pas de consigne imprimée, et de la place pour écrire sous chaque question. La page des solutions reste dans ta main.'
            : `Les ${papier.length} étape${papier.length > 1 ? 's' : ''} imprimable${papier.length > 1 ? 's' : ''} du parcours, dans l'ordre, numérotées en continu.`;
    };

    interro.onchange = rendre;
    colsEl.oninput = rendre;
    choixEl.onchange = rendre;
    m.querySelector('#pp-regen').onclick = () => { doc = null; rendre(); };
    btnSol.onclick = () => {
        solutions = !solutions;
        btnSol.textContent = solutions ? 'Voir les questions' : 'Voir les solutions';
        btnSol.setAttribute('aria-pressed', String(solutions));
        rendre();
    };
    m.querySelector('#pp-fermer').onclick = () => { m.style.display = 'none'; };
    m.querySelector('#pp-dl').onclick = () => telecharger(m, chemin, () => ({ doc, options: options(), mesurer }));

    solutions = false;
    btnSol.textContent = 'Voir les solutions';
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

function entete(pdf, titre, sousTitre, bareme) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.setTextColor(...ENCRE.texte);
    pdf.text(`${titre}${sousTitre ? ' — ' + sousTitre : ''}`, A4.marge, A4.marge + 6);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    pdf.text('Nom : ...........................   Date : ..............',
        A4.w - A4.marge, A4.marge + 6, { align: 'right' });
    pdf.setDrawColor(...ENCRE.trait);
    pdf.setLineWidth(0.4);
    pdf.line(A4.marge, A4.marge + 9, A4.w - A4.marge, A4.marge + 9);
    if (bareme) {
        pdf.setFontSize(8.6);
        pdf.setTextColor(...ENCRE.gris);
        pdf.text(bareme, A4.marge, A4.marge + 14);
    }
    pdf.setFontSize(6.5);
    pdf.setTextColor(160, 165, 175);
    pdf.text('Fiche générée par AtoutMath', A4.w / 2, A4.h - 4, { align: 'center' });
}

function pagePdf(pdf, page, o, solutions) {
    pdf.setTextColor(...ENCRE.texte);
    for (const b of page.blocs) {
        if (b.titre) {
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(o.taille * 2.9);
            pdf.text(b.lignes.join(' '), b.x, b.y + o.taille);
            pdf.setDrawColor(...ENCRE.gris);
            pdf.setLineWidth(0.2);
            pdf.line(b.x, b.y + o.taille + 1.2, b.x + b.largeur, b.y + o.taille + 1.2);
            continue;
        }
        if (!solutions) {
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(o.taille * 2.83);
            pdf.text(`${b.n}.`, b.x, b.y + o.taille);
        }
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(o.taille * 2.83);
        b.lignes.forEach((ligne, i) => {
            pdf.text(ligne, solutions ? b.x : b.texteX, b.y + o.taille + i * o.interligne);
        });
        if (b.choix) {
            pdf.setFontSize(o.taille * 2.5);
            pdf.setTextColor(...ENCRE.gris);
            pdf.text(b.choix.map(c => `☐ ${c}`).join('   '),
                b.texteX, b.y + o.taille + b.lignes.length * o.interligne);
            pdf.setTextColor(...ENCRE.texte);
        }
        if (!solutions) {
            pdf.setDrawColor(...ENCRE.pointille);
            pdf.setLineWidth(0.25);
            pdf.setLineDashPattern([0.7, 1.1], 0);
            pdf.line(b.texteX, b.reponseY, b.texteX + b.texteW, b.reponseY);
            pdf.setLineDashPattern([], 0);
        }
    }
}

function telecharger(modal, chemin, lire) {
    const btn = modal.querySelector('#pp-dl');
    btn.disabled = true;
    const { doc, options, mesurer } = lire();
    if (!doc) { btn.disabled = false; return; }
    chargerJsPDF()
        .then(jsPDF => {
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const nom = chemin.name || 'Parcours';
            const nbQ = doc.questions.filter(q => !q.titre).length;
            const bareme = options.interrogation
                ? `Barème : ${nbQ} question${nbQ > 1 ? 's' : ''}, 1 point chacune.`
                : '';
            doc.mise.pages.forEach((page, i) => {
                if (i) pdf.addPage('a4', 'portrait');
                entete(pdf, nom, options.interrogation ? 'Interrogation' : `page ${i + 1}/${doc.mise.pages.length}`,
                    i === 0 ? bareme : '');
                pagePdf(pdf, page, doc.mise.opts, false);
            });
            const sol = composerSolutions(doc.questions.filter(q => !q.titre), { colonnesSolutions: 4 }, mesurer);
            sol.pages.forEach(page => {
                pdf.addPage('a4', 'portrait');
                entete(pdf, nom, 'Solutions', '');
                pagePdf(pdf, page, sol.opts, true);
            });
            pdf.save(`${nom.replace(/[^\w\-]+/g, '-').toLowerCase()}${options.interrogation ? '-interrogation' : ''}.pdf`);
        })
        .catch(() => window.appConfirm('PDF indisponible',
            'La bibliothèque de PDF n\'a pas pu être chargée (connexion ?). Réessaie une fois en ligne.', null))
        .finally(() => { btn.disabled = false; });
}
