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
import { composerBlocs, composerSolutions, repartirBareme, pageDe } from '../core/fiche.js';
import { RENDUS } from './printSheet.js';
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
        // Deux façons d'aller sur le papier, et la seconde manquait : un
        // sudoku, un binairo, un garam n'ont pas de « questions » mais des
        // GRILLES, et ce sont justement les exercices qu'on fait le plus
        // volontiers sur feuille — on y rature, on note ses candidats, on
        // gomme. Ils étaient rangés en « écran seulement », ce qui est faux.
        const grille = s.exercise.printable && RENDUS[s.exercise.printable] ? s.exercise.printable : null;
        if (gen && (gen.ecrit || grille)) papier.push({ ...s, generator: gen, grille });
        else ecran.push(s);
    }
    return { papier, ecran, total: steps.length };
}

/** Les grilles d'une étape à grilles, tirées comme les questions. */
function grillesDe(etape, nb) {
    const out = [];
    for (let i = 0; i < nb; i++) {
        out.push({ cle: etape.grille, item: etape.generator.generate(etape.params, { index: i, rng: makeRng() }) });
    }
    return out;
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
            // L'explication du générateur : c'est elle qui fait la feuille de
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
                <label class="pp-note-sur" id="pp-note-sur-champ">Note sur
                    <input type="number" id="pp-note-sur" class="cfg-input cfg-input--num"
                        min="5" max="100" step="1" value="20"></label>
                <span class="fp-total" id="pp-total"></span>
                <button type="button" class="btn-hint" id="pp-regen">🎲 D'autres questions</button>
                <button type="button" class="btn-hint" id="pp-sol" aria-pressed="false">Voir les solutions</button>
            </div>
            <div class="fp-controles pp-mep">
                <label>Format
                    <select id="pp-orientation" class="cfg-input">
                        <option value="portrait">A4 portrait</option>
                        <option value="paysage">A4 paysage</option>
                    </select></label>
                <label class="fq-case"><input type="checkbox" id="pp-champs">
                    Champs remplissables (PDF)</label>
            </div>
            <div class="fp-controles pp-sol-reglages">
                <label>Solutions
                    <select id="pp-sol-mode" class="cfg-input">
                        <option value="compact">Compact — juste les réponses</option>
                        <option value="normal">Normal — énoncé et réponse</option>
                        <option value="detaille">Détaillé — avec les explications</option>
                    </select></label>
                <label>Fichier
                    <select id="pp-sol-ou" class="cfg-input">
                        <option value="ensemble">Un seul PDF, solutions à la fin</option>
                        <option value="separe">Deux PDF séparés</option>
                        <option value="sans">Sans solutions</option>
                    </select></label>
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

    const modeSol = m.querySelector('#pp-sol-mode');
    const ouSol = m.querySelector('#pp-sol-ou');
    const orientEl = m.querySelector('#pp-orientation');
    const champsEl = m.querySelector('#pp-champs');
    const noteSurEl = m.querySelector('#pp-note-sur');
    const noteSurChamp = m.querySelector('#pp-note-sur-champ');

    let solutions = false;
    let blocs = null;           // les questions déjà tirées, par étape
    let ordre = papier.map(e => e.stepId);
    const quantites = {};
    // LE BARÈME, exercice par exercice. Un point par question est le défaut
    // honnête, mais c'est rarement ce qu'on veut : le sudoku de fin vaut plus
    // que les dix multiplications du début, et c'est au professeur d'en
    // décider — pas au nombre de questions.
    const points = {};
    papier.forEach(e => {
        const n = Math.max(1, Math.min(40, e.nbItems || (e.grille ? 2 : 5)));
        quantites[e.stepId] = e.grille ? Math.min(6, n) : n;
    });
    // LA MISE EN PAGE, EXERCICE PAR EXERCICE. Pour les questions c'est un
    // nombre de colonnes, pour les grilles un nombre par ligne : dans les deux
    // cas « combien en met-on côte à côte », donc un seul réglage.
    const colonnes = {};
    papier.forEach(e => { colonnes[e.stepId] = 'auto'; });
    const parId = new Map(papier.map(e => [e.stepId, e]));

    const totalPoints = () => ordre
        .filter(id => (quantites[id] || 0) > 0)
        .reduce((s, id) => s + (points[id] || 0), 0);

    // TANT QUE LE PROFESSEUR N'Y A PAS TOUCHÉ, le barème se répartit tout seul
    // pour tomber juste sur la note. Dès qu'il corrige une case, le barème
    // devient le sien et on cesse d'y toucher — la ligne d'explication signale
    // alors l'écart avec la note plutôt que de le masquer.
    let baremeTouche = false;
    const repartirPoints = () => {
        const sur = Math.max(5, Math.min(100, Number(noteSurEl.value) || 20));
        Object.assign(points, repartirBareme(quantites, sur));
    };
    repartirPoints();

    const options = () => ({
        interrogation: interro.checked,
        avecChoix: choixEl.checked,
        modeSolution: modeSol.value,
        ouSolution: ouSol.value,
        orientation: orientEl.value,
        champs: champsEl.checked,
        noteSur: Math.max(5, Math.min(100, Number(noteSurEl.value) || 20))
    });

    // La liste des étapes : le nombre de questions de chacune, ET leur ordre
    // sur la feuille — chaque ligne se glisse plus haut ou plus bas par sa
    // poignée. C'est toute la mise en page : le reste se calcule.
    const rendreListe = () => {
        listeEl.innerHTML = ordre.map((id, i) => {
            const e = parId.get(id);
            const nom = echapper(e.title);
            return `
            <div class="pp-etape" data-etape-ligne="${id}">
                <button type="button" class="pp-grip" data-grip="${id}"
                    title="Glisser pour changer l'ordre sur la feuille"
                    aria-label="Déplacer « ${nom} »">⠿</button>
                <span class="pp-etape-num">${i + 1}.</span>
                <span class="pp-etape-nom">${nom}</span>
                <span class="pp-fleches">
                    <button type="button" class="pp-fleche" data-monter="${id}"
                        ${i === 0 ? 'disabled' : ''} title="Monter d'un cran"
                        aria-label="Monter « ${nom} »">▲</button>
                    <button type="button" class="pp-fleche" data-descendre="${id}"
                        ${i === ordre.length - 1 ? 'disabled' : ''} title="Descendre d'un cran"
                        aria-label="Descendre « ${nom} »">▼</button>
                </span>
                <span class="pp-etape-nb">
                    <input type="number" class="cfg-input cfg-input--num" data-etape="${id}"
                        min="0" max="40" value="${quantites[id]}">
                    <span class="pp-etape-unite">${e.grille ? 'grilles' : 'questions'}</span>
                </span>
                <span class="pp-etape-cols">
                    <select class="cfg-input" data-colonnes="${id}"
                        title="${e.grille ? 'Grilles par ligne' : 'Colonnes de questions'}"
                        aria-label="Mise en page de « ${nom} »">
                        ${['auto', 1, 2, 3, 4, 5, 6].map(v => `<option value="${v}"
                            ${String(colonnes[id]) === String(v) ? 'selected' : ''}>${v === 'auto' ? 'auto' : v}</option>`).join('')}
                    </select>
                    <span class="pp-etape-unite">${e.grille ? '/ ligne' : 'col.'}</span>
                </span>
                <span class="pp-etape-pts" ${interro.checked ? '' : 'hidden'}>
                    <input type="number" class="cfg-input cfg-input--num" data-points="${id}"
                        min="0" max="40" value="${points[id]}"
                        title="Barème de cet exercice" aria-label="Points de « ${nom} »">
                    <span class="pp-etape-unite">pts</span>
                </span>
            </div>`;
        }).join('')
            + (ecran.length ? `<div class="pp-ecran">Sur écran seulement : ${[...new Set(ecran.map(e => e.title))].map(echapper).join(', ')}
                 — ${ecran.length > 1 ? 'ces activités demandent' : 'cette activité demande'} de manipuler, elles ne se photocopient pas.</div>` : '');

        listeEl.querySelectorAll('[data-etape]').forEach(inp => {
            inp.oninput = () => {
                quantites[inp.dataset.etape] = Math.max(0, Math.min(40, Number(inp.value) || 0));
                blocs = null;
                if (!baremeTouche) { repartirPoints(); rendreListe(); }
                rendre();
            };
        });
        listeEl.querySelectorAll('[data-colonnes]').forEach(sel => {
            sel.onchange = () => {
                colonnes[sel.dataset.colonnes] = sel.value;
                rendre();
            };
        });
        listeEl.querySelectorAll('[data-points]').forEach(inp => {
            inp.oninput = () => {
                points[inp.dataset.points] = Math.max(0, Math.min(40, Number(inp.value) || 0));
                baremeTouche = true;     // à partir d'ici, le barème est le sien
                rendre();
            };
        });
        // Les flèches font le même travail que le glisser, sans geste : c'est
        // le chemin sûr sur un téléphone, où une liste qui défile et un
        // élément qu'on traîne se disputent le même doigt.
        const deplacer = (id, delta) => {
            const i = ordre.indexOf(id);
            const j = i + delta;
            if (i < 0 || j < 0 || j >= ordre.length) return;
            ordre.splice(j, 0, ordre.splice(i, 1)[0]);
            rendreListe();
            rendre();
        };
        listeEl.querySelectorAll('[data-monter]').forEach(b => {
            b.onclick = () => deplacer(b.dataset.monter, -1);
        });
        listeEl.querySelectorAll('[data-descendre]').forEach(b => {
            b.onclick = () => deplacer(b.dataset.descendre, +1);
        });
        brancherGlisser();
    };

    // Le glisser-déposer.
    //
    // Deux chemins, et c'est délibéré. À la SOURIS, les pointer events
    // suffisent. AU DOIGT, on passe par les évènements tactiles bruts :
    // Safari mobile ne renonce à faire défiler la page que si `touchmove`
    // est annulé, et tant qu'il croit à un défilement il émet un
    // `pointercancel` qui tue le glisser au premier millimètre. `touch-action:
    // none` ne suffit pas dans un panneau qui défile — c'est exactement le
    // cas ici.
    //
    // Les écouteurs vivent sur le DOCUMENT, jamais sur la poignée : déplacer
    // la ligne saisie (insertBefore) la retire un instant du document, ce qui
    // annulerait une capture de pointeur.
    const brancherGlisser = () => {
        listeEl.querySelectorAll('[data-grip]').forEach(grip => {
            const debut = (id) => {
                const ligne = listeEl.querySelector(`[data-etape-ligne="${id}"]`);
                if (!ligne) return null;
                ligne.classList.add('pp-etape--saisie');
                return {
                    // On insère la ligne saisie avant la première ligne dont le
                    // milieu est sous le doigt — et seulement si ça change
                    // quelque chose, pour ne pas secouer le DOM à chaque pixel.
                    bouger(clientY) {
                        const autres = [...listeEl.querySelectorAll('[data-etape-ligne]')]
                            .filter(l => l !== ligne);
                        let cible = null;
                        for (const l of autres) {
                            const r = l.getBoundingClientRect();
                            if (clientY < r.top + r.height / 2) { cible = l; break; }
                        }
                        if (cible && ligne.nextElementSibling !== cible) listeEl.insertBefore(ligne, cible);
                        else if (!cible && autres.length && autres[autres.length - 1].nextElementSibling !== ligne) {
                            autres[autres.length - 1].after(ligne);
                        }
                    },
                    lacher() {
                        ligne.classList.remove('pp-etape--saisie');
                        const nouvelOrdre = [...listeEl.querySelectorAll('[data-etape-ligne]')]
                            .map(l => l.dataset.etapeLigne);
                        const change = nouvelOrdre.join() !== ordre.join();
                        ordre = nouvelOrdre;
                        rendreListe();
                        if (change) rendre();
                    }
                };
            };

            grip.addEventListener('touchstart', (ev) => {
                if (ev.touches.length !== 1) return;
                ev.preventDefault();          // pas de défilement, pas de pointercancel
                const ctrl = debut(grip.dataset.grip);
                if (!ctrl) return;
                const bouger = (e2) => {
                    if (e2.cancelable) e2.preventDefault();
                    ctrl.bouger(e2.touches[0].clientY);
                };
                const lacher = () => {
                    document.removeEventListener('touchmove', bouger, { passive: false });
                    document.removeEventListener('touchend', lacher);
                    document.removeEventListener('touchcancel', lacher);
                    ctrl.lacher();
                };
                document.addEventListener('touchmove', bouger, { passive: false });
                document.addEventListener('touchend', lacher);
                document.addEventListener('touchcancel', lacher);
            }, { passive: false });

            grip.onpointerdown = (ev) => {
                // Le doigt est déjà servi par le chemin tactile ci-dessus :
                // le laisser passer ici lancerait deux glissers concurrents.
                if (ev.pointerType === 'touch') return;
                ev.preventDefault();
                const ctrl = debut(grip.dataset.grip);
                if (!ctrl) return;
                const bouger = (e2) => ctrl.bouger(e2.clientY);
                const lacher = () => {
                    document.removeEventListener('pointermove', bouger);
                    document.removeEventListener('pointerup', lacher);
                    document.removeEventListener('pointercancel', lacher);
                    ctrl.lacher();
                };
                document.addEventListener('pointermove', bouger);
                document.addEventListener('pointerup', lacher);
                document.addEventListener('pointercancel', lacher);
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
                tirages.set(id, nb ? (e.grille ? grillesDe(e, nb) : questionsDe(e, nb)) : []);
            });
            blocs = tirages;
        }
        const exos = ordre
            .filter(id => (quantites[id] || 0) > 0)
            .map(id => {
                const e = parId.get(id);
                const tire = (blocs.get(id) || []).slice(0, quantites[id]);
                // Une grille n'a pas de consigne écrite par le professeur :
                // c'est la règle du jeu, et elle se déduit de la grille tirée.
                const consigneGrille = e.grille && tire.length && RENDUS[e.grille].consigne
                    ? RENDUS[e.grille].consigne(tire.map(g => g.item)) : '';
                // « auto » ne descend pas jusqu'au moteur : c'est son défaut.
                const col = colonnes[id] === 'auto' ? null : Number(colonnes[id]);
                return {
                    titre: e.title,
                    consigne: o.interrogation ? '' : (e.grille ? consigneGrille : (e.exercise.instruction || '')),
                    points: o.interrogation ? (points[id] || null) : null,
                    questions: e.grille ? [] : tire,
                    grilles: e.grille ? tire : [],
                    colonnes: e.grille ? null : col,
                    grillesParLigne: e.grille ? col : null
                };
            })
            .filter(x => x.questions.length || x.grilles.length);

        // La feuille de solutions ne porte que ce qui a une réponse écrite :
        // une grille se corrige sur son propre dessin, pas dans une liste.
        const toutes = exos.flatMap(x => x.questions);
        const sections = exos.filter(x => x.questions.length)
            .map(x => ({ titre: x.titre, points: x.points, questions: x.questions }));
        const mise = solutions
            ? composerSolutions(toutes, { mode: o.modeSolution, orientation: o.orientation, sections }, mesurer)
            : composerBlocs(exos, o, mesurer);
        const pg = mise.page || pageDe(o.orientation);

        const large = apercu.parentElement.clientWidth || 640;
        const k = Math.min(large, 700) / pg.w;
        apercu.style.width = `${pg.w * k}px`;
        apercu.style.height = `${pg.h * k * mise.pages.length + 12 * Math.max(0, mise.pages.length - 1)}px`;

        const nom = chemin.name || 'Parcours';
        const sousTitre = solutions ? 'Solutions' : (o.interrogation ? 'Interrogation' : '');
        const note = (o.interrogation && !solutions) ? { sur: o.noteSur } : null;
        apercu.innerHTML = mise.pages.map((page, i) => `
            <div class="fq-page" style="width:${pg.w * k}px; height:${pg.h * k}px; top:${i * (pg.h * k + 12)}px">
                ${apercuEntete(k, nom, sousTitre, i === 0 ? note : null, pg)}
                ${solutions ? apercuSolutions(page, k, mise.opts) : apercuItems(page, k, mise.opts)}
            </div>`).join('');

        const nbGrilles = exos.reduce((s, x) => s + x.grilles.length, 0);
        const morceaux = [];
        if (toutes.length) morceaux.push(`${toutes.length} question${toutes.length > 1 ? 's' : ''}`);
        if (nbGrilles) morceaux.push(`${nbGrilles} grille${nbGrilles > 1 ? 's' : ''}`);
        morceaux.push(`${mise.pages.length} page${mise.pages.length > 1 ? 's' : ''}`);
        morceaux.push(o.orientation === 'paysage' ? 'paysage' : 'portrait');
        totalEl.textContent = morceaux.join(' · ');

        noteSurChamp.hidden = !o.interrogation;
        const total = totalPoints();
        noteEl.textContent = o.interrogation
            ? `Interrogation : pas de consigne imprimée, un barème par exercice (total ${total} pt${total > 1 ? 's' : ''}), `
              + `et la case « … / ${o.noteSur} » en haut de la première page.`
              + (total === o.noteSur ? '' : ` ⚠️ Le barème totalise ${total} points pour une note sur ${o.noteSur}.`)
            : 'Un bloc par exercice, dans l\'ordre de la liste — glisse la poignée ⠿ pour les réordonner.';
        derniers = { exos, toutes, note, total, page: pg, sections };
    };
    let derniers = null;

    interro.onchange = () => { blocs = null; rendreListe(); rendre(); };
    choixEl.onchange = rendre;
    modeSol.onchange = rendre;
    ouSol.onchange = rendre;
    orientEl.onchange = rendre;
    champsEl.onchange = rendre;
    noteSurEl.oninput = () => {
        if (!baremeTouche) { repartirPoints(); rendreListe(); }
        rendre();
    };
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
        note: derniers ? derniers.note : null,
        total: derniers ? derniers.total : 0,
        sections: derniers ? derniers.sections : [],
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
            pdf.text(pourPdf(ligne), b.x, b.y + o.taille + i * o.interligne);
        });
    }
}

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
    const { exos, toutes, note, total, options, mesurer, sections } = lire();
    if (!exos.length) { btn.disabled = false; return; }
    chargerJsPDF()
        .then(jsPDF => {
            const nom = chemin.name || 'Parcours';
            const base = nom.replace(/[^\w\-]+/g, '-').toLowerCase();
            const bareme = options.interrogation
                ? `Barème sur ${total} point${total > 1 ? 's' : ''} — ramené à ${options.noteSur}.`
                : '';

            // Le PDF est créé DANS l'orientation demandée, et chaque page
            // ajoutée la répète : une seule page couchée dans un document
            // debout est le genre de détail qui ne se voit qu'à l'impression.
            const sens = options.orientation === 'paysage' ? 'landscape' : 'portrait';
            const neuf = () => new jsPDF({ orientation: sens, unit: 'mm', format: 'a4' });

            const pdf = neuf();
            const mise = composerBlocs(exos, options, mesurer);
            mise.pages.forEach((page, i) => {
                if (i) pdf.addPage('a4', sens);
                entetePdf(pdf, nom, options.interrogation ? 'Interrogation' : `page ${i + 1}/${mise.pages.length}`,
                    i === 0 ? bareme : '', i === 0 ? note : null, mise.page);
                pdfItems(pdf, page, mise.opts);
            });

            const dessinerSolutions = (doc, premiere) => {
                const sol = composerSolutions(toutes,
                    { mode: options.modeSolution, orientation: options.orientation, sections }, mesurer);
                sol.pages.forEach((page, i) => {
                    if (!premiere || i) doc.addPage('a4', sens);
                    entetePdf(doc, nom, sol.pages.length > 1 ? `Solutions ${i + 1}/${sol.pages.length}` : 'Solutions',
                        '', null, sol.page);
                    pdfSolutions(doc, page, sol.opts);
                });
            };

            if (options.ouSolution === 'ensemble' && toutes.length) dessinerSolutions(pdf, false);
            pdf.save(`${base}${options.interrogation ? '-interrogation' : ''}.pdf`);

            if (options.ouSolution === 'separe' && toutes.length) {
                const solPdf = neuf();
                dessinerSolutions(solPdf, true);
                solPdf.save(`${base}-solutions-${options.modeSolution}.pdf`);
            }
        })
        .catch(() => window.appConfirm('PDF indisponible',
            'La bibliothèque de PDF n\'a pas pu être chargée (connexion ?). Réessaie une fois en ligne.', null))
        .finally(() => { btn.disabled = false; });
}
