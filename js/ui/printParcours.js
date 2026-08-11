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
import { getGenerator } from '../core/registry.js';
import { makeRng } from '../core/ids.js';
import { A4, composerBlocs, composerSolutions } from '../core/fiche.js';
import { chargerJsPDF } from './printSheet.js';
import {
    mesureur, echapper, apercuItems, apercuEntete, entetePdf, pdfItems, ENCRE
} from './ficheRendu.js';

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
    return String(item.answer).replace('.', ',');
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

export function ouvrirFicheParcours(chemin) {
    const { papier, ecran, total } = analyserParcours(chemin);
    const m = assurerModale();
    const mesurer = mesureur();

    const apercu = m.querySelector('#pp-apercu');
    const interro = m.querySelector('#pp-interro');
    const choixEl = m.querySelector('#pp-choix');
    const totalEl = m.querySelector('#pp-total');
    const noteEl = m.querySelector('#pp-note');
    const btnSol = m.querySelector('#pp-sol');
    const listeEl = m.querySelector('#pp-etapes');

    let solutions = false;
    let blocs = null;           // les questions déjà tirées, par étape
    let ordre = papier.map(e => e.stepId);
    const quantites = {};
    papier.forEach(e => { quantites[e.stepId] = Math.max(1, Math.min(40, e.nbItems || 5)); });
    const parId = new Map(papier.map(e => [e.stepId, e]));

    const options = () => ({
        interrogation: interro.checked,
        avecChoix: choixEl.checked
    });

    // La liste des étapes : le nombre de questions de chacune, ET leur ordre
    // sur la feuille — chaque ligne se glisse plus haut ou plus bas par sa
    // poignée. C'est toute la mise en page : le reste se calcule.
    const rendreListe = () => {
        listeEl.innerHTML = ordre.map((id, i) => {
            const e = parId.get(id);
            return `
            <div class="pp-etape" data-etape-ligne="${id}">
                <button type="button" class="pp-grip" data-grip="${id}"
                    title="Glisser pour changer l'ordre sur la feuille"
                    aria-label="Déplacer « ${echapper(e.title)} »">⠿</button>
                <span class="pp-etape-num">${i + 1}.</span>
                <span class="pp-etape-nom">${echapper(e.title)}</span>
                <input type="number" class="cfg-input cfg-input--num" data-etape="${id}"
                    min="0" max="40" value="${quantites[id]}">
                <span class="pp-etape-unite">questions</span>
            </div>`;
        }).join('')
            + (ecran.length ? `<div class="pp-ecran">Sur écran seulement : ${[...new Set(ecran.map(e => e.title))].map(echapper).join(', ')}
                 — ${ecran.length > 1 ? 'ces activités demandent' : 'cette activité demande'} de manipuler, elles ne se photocopient pas.</div>` : '');

        listeEl.querySelectorAll('[data-etape]').forEach(inp => {
            inp.oninput = () => {
                quantites[inp.dataset.etape] = Math.max(0, Math.min(40, Number(inp.value) || 0));
                blocs = null;
                rendre();
            };
        });
        brancherGlisser();
    };

    // Le glisser-déposer, aux pointer events : il marche au doigt comme à la
    // souris. La ligne saisie suit le pointeur, les autres s'écartent, et on
    // recompose la fiche au lâcher.
    const brancherGlisser = () => {
        listeEl.querySelectorAll('[data-grip]').forEach(grip => {
            grip.onpointerdown = (ev) => {
                ev.preventDefault();
                const id = grip.dataset.grip;
                const ligne = listeEl.querySelector(`[data-etape-ligne="${id}"]`);
                const lignes = () => [...listeEl.querySelectorAll('[data-etape-ligne]')];
                ligne.classList.add('pp-etape--saisie');

                // Les écouteurs vivent sur la FENÊTRE, pas sur la poignée :
                // déplacer la ligne dans le DOM (insertBefore) retire un
                // instant l'élément du document, ce qui ANNULE une capture de
                // pointeur — le glisser mourait au premier réordonnancement.
                const bouger = (e2) => {
                    const autres = lignes().filter(l => l !== ligne);
                    // On insère la ligne saisie avant la première ligne dont le
                    // milieu est sous le pointeur — et seulement si ça change
                    // quelque chose, pour ne pas secouer le DOM à chaque pixel.
                    let cible = null;
                    for (const l of autres) {
                        const r = l.getBoundingClientRect();
                        if (e2.clientY < r.top + r.height / 2) { cible = l; break; }
                    }
                    if (cible && ligne.nextElementSibling !== cible) listeEl.insertBefore(ligne, cible);
                    else if (!cible && autres.length && autres[autres.length - 1].nextElementSibling !== ligne) {
                        autres[autres.length - 1].after(ligne);
                    }
                };
                const lacher = () => {
                    window.removeEventListener('pointermove', bouger);
                    window.removeEventListener('pointerup', lacher);
                    window.removeEventListener('pointercancel', lacher);
                    ligne.classList.remove('pp-etape--saisie');
                    const nouvelOrdre = [...listeEl.querySelectorAll('[data-etape-ligne]')]
                        .map(l => l.dataset.etapeLigne);
                    const change = nouvelOrdre.join() !== ordre.join();
                    ordre = nouvelOrdre;
                    rendreListe();
                    if (change) rendre();
                };
                window.addEventListener('pointermove', bouger);
                window.addEventListener('pointerup', lacher);
                window.addEventListener('pointercancel', lacher);
            };
        });
    };

    const rendre = () => {
        const o = options();
        // Les questions ne sont retirées que si nécessaire (« D'autres
        // questions », changement de quantité) : changer un réglage de mise en
        // page garde les mêmes questions.
        if (!blocs) {
            const tirages = new Map();
            ordre.forEach(id => {
                const e = parId.get(id);
                const nb = quantites[id];
                tirages.set(id, nb ? questionsDe(e, nb) : []);
            });
            blocs = tirages;
        }
        const exos = ordre
            .filter(id => (quantites[id] || 0) > 0)
            .map(id => {
                const e = parId.get(id);
                return {
                    titre: e.title,
                    consigne: o.interrogation ? '' : (e.exercise.instruction || ''),
                    points: o.interrogation ? quantites[id] : null,
                    questions: (blocs.get(id) || []).slice(0, quantites[id])
                };
            })
            .filter(x => x.questions.length);

        const toutes = exos.flatMap(x => x.questions);
        const mise = solutions
            ? composerSolutions(toutes, { colonnesSolutions: 4 }, mesurer)
            : composerBlocs(exos, o, mesurer);

        const large = apercu.parentElement.clientWidth || 640;
        const k = Math.min(large, 700) / A4.w;
        apercu.style.width = `${A4.w * k}px`;
        apercu.style.height = `${A4.h * k * mise.pages.length + 12 * Math.max(0, mise.pages.length - 1)}px`;

        const nom = chemin.name || 'Parcours';
        const sousTitre = solutions ? 'Solutions' : (o.interrogation ? 'Interrogation' : '');
        apercu.innerHTML = mise.pages.map((page, i) => `
            <div class="fq-page" style="width:${A4.w * k}px; height:${A4.h * k}px; top:${i * (A4.h * k + 12)}px">
                ${apercuEntete(k, nom, sousTitre)}
                ${solutions ? apercuSolutions(page, k, mise.opts) : apercuItems(page, k, mise.opts)}
            </div>`).join('');

        totalEl.textContent = `${toutes.length} question${toutes.length > 1 ? 's' : ''} · ${mise.pages.length} page${mise.pages.length > 1 ? 's' : ''}`;
        noteEl.textContent = o.interrogation
            ? 'Interrogation : pas de consigne imprimée, un barème par exercice, et de la place pour écrire. La page des solutions reste dans ta main.'
            : 'Un bloc par exercice, dans l\'ordre de la liste — glisse la poignée ⠿ pour les réordonner.';
        derniers = { exos, toutes };
    };
    let derniers = null;

    interro.onchange = () => { blocs = null; rendre(); };
    choixEl.onchange = rendre;
    m.querySelector('#pp-regen').onclick = () => { blocs = null; rendre(); };
    btnSol.onclick = () => {
        solutions = !solutions;
        btnSol.textContent = solutions ? 'Voir les questions' : 'Voir les solutions';
        btnSol.setAttribute('aria-pressed', String(solutions));
        rendre();
    };
    m.querySelector('#pp-fermer').onclick = () => { m.style.display = 'none'; };
    m.querySelector('#pp-dl').onclick = () => telecharger(m, chemin, () => ({
        exos: derniers ? derniers.exos : [],
        toutes: derniers ? derniers.toutes : [],
        options: options(), mesurer
    }));

    solutions = false;
    btnSol.textContent = 'Voir les solutions';
    m.style.display = 'flex';
    if (!papier.length) {
        listeEl.innerHTML = '';
        apercu.innerHTML = '';
        totalEl.textContent = '';
        noteEl.textContent = total
            ? 'Aucune étape de ce parcours ne se met sur papier : ce sont toutes des activités à manipuler.'
            : 'Ce parcours est vide.';
        return;
    }
    rendreListe();
    rendre();
}

/** La page des solutions en aperçu — l'ancienne mise compacte, en colonnes. */
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

// --- Le PDF -----------------------------------------------------------------------

function pdfSolutions(pdf, page, o) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(o.taille * 2.83);
    pdf.setTextColor(...ENCRE.texte);
    for (const b of page.blocs) {
        b.lignes.forEach((ligne, i) => {
            pdf.text(ligne, b.x, b.y + o.taille + i * o.interligne);
        });
    }
}

function telecharger(modal, chemin, lire) {
    const btn = modal.querySelector('#pp-dl');
    btn.disabled = true;
    const { exos, toutes, options, mesurer } = lire();
    if (!exos.length) { btn.disabled = false; return; }
    chargerJsPDF()
        .then(jsPDF => {
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const nom = chemin.name || 'Parcours';
            const bareme = options.interrogation
                ? `Barème : ${toutes.length} question${toutes.length > 1 ? 's' : ''}, 1 point chacune.`
                : '';
            const mise = composerBlocs(exos, options, mesurer);
            mise.pages.forEach((page, i) => {
                if (i) pdf.addPage('a4', 'portrait');
                entetePdf(pdf, nom, options.interrogation ? 'Interrogation' : `page ${i + 1}/${mise.pages.length}`,
                    i === 0 ? bareme : '');
                pdfItems(pdf, page, mise.opts);
            });
            const sol = composerSolutions(toutes, { colonnesSolutions: 4 }, mesurer);
            sol.pages.forEach(page => {
                pdf.addPage('a4', 'portrait');
                entetePdf(pdf, nom, 'Solutions', '');
                pdfSolutions(pdf, page, sol.opts);
            });
            pdf.save(`${nom.replace(/[^\w\-]+/g, '-').toLowerCase()}${options.interrogation ? '-interrogation' : ''}.pdf`);
        })
        .catch(() => window.appConfirm('PDF indisponible',
            'La bibliothèque de PDF n\'a pas pu être chargée (connexion ?). Réessaie une fois en ligne.', null))
        .finally(() => { btn.disabled = false; });
}
