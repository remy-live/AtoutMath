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
    mesureur, echapper, apercuItems, apercuEntete, entetePdf, pdfItems, pourPdf, ENCRE
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
        // `papier` : la même question, écrite pour la feuille — sans la
        // consigne répétée devant chaque ligne. À défaut, le texte d'écran.
        const texte = (item.prompt && (item.prompt.papier || item.prompt.text)) || '';
        if (vus.has(texte) && essai < nb * 6) continue;
        vus.add(texte);
        out.push({
            texte,
            choix: item.choices ? item.choices.map(c => String(c.label ?? c.value)) : null,
            reponse: formaterReponse(item),
            // Le générateur dit si ses questions portent des fractions : la
            // mise en page les écrira alors en colonne.
            fractions: !!etape.generator.fractions,
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
            </div>
            <div class="pp-etapes" id="pp-etapes"></div>
            <!-- LA MISE EN PAGE SE RÈGLE AU CONTACT DE L'APERÇU. Format,
                 numérotation, solutions : ce sont les réglages dont on juge
                 l'effet en REGARDANT la feuille. Placés tout en haut du
                 panneau, la liste des exercices les séparait de la seule chose
                 qui permet de les choisir. -->
            <div class="fp-controles pp-mep">
                <label>Format
                    <select id="pp-orientation" class="cfg-input">
                        <option value="portrait">A4 portrait</option>
                        <option value="paysage">A4 paysage</option>
                    </select></label>
                <label class="fq-case"><input type="checkbox" id="pp-champs">
                    Champs remplissables (PDF)</label>
                <label>Numéros
                    <select id="pp-numerotation" class="cfg-input">
                        <option value="continue">Qui se suivent (1, 2, 3… sur toute la feuille)</option>
                        <option value="exercice">Qui repartent à 1 à chaque exercice</option>
                    </select></label>
            </div>
            <div class="fp-controles pp-sol-reglages">
                <label>Solutions
                    <select id="pp-sol-mode" class="cfg-input">
                        <option value="compact">Compact — juste les réponses</option>
                        <option value="normal">Normal — énoncé et réponse</option>
                        <option value="detaille">Détaillé — avec les explications</option>
                    </select></label>
                <label>Colonnes
                    <select id="pp-sol-colonnes" class="cfg-input"
                        aria-label="Colonnes de la feuille de solutions">
                        <option value="auto">auto</option>
                        <option value="1">1</option><option value="2">2</option>
                        <option value="3">3</option><option value="4">4</option>
                        <option value="5">5</option>
                    </select></label>
                <label>Fichier
                    <select id="pp-sol-ou" class="cfg-input">
                        <option value="ensemble">Un seul PDF, solutions à la fin</option>
                        <option value="separe">Deux PDF séparés</option>
                        <option value="sans">Sans solutions</option>
                    </select></label>
            </div>
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
    const listeEl = m.querySelector('#pp-etapes');

    const modeSol = m.querySelector('#pp-sol-mode');
    const colSol = m.querySelector('#pp-sol-colonnes');
    const ouSol = m.querySelector('#pp-sol-ou');
    const orientEl = m.querySelector('#pp-orientation');
    const champsEl = m.querySelector('#pp-champs');
    const noteSurEl = m.querySelector('#pp-note-sur');
    const noteSurChamp = m.querySelector('#pp-note-sur-champ');
    const numEl = m.querySelector('#pp-numerotation');

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
    // « auto » convient à la plupart, mais un exercice sait souvent mieux :
    // trois colonnes pour des nombres en lettres, six pour comparer deux
    // fractions. Le professeur garde la main sur le réglage.
    const colonnes = {};
    papier.forEach(e => { colonnes[e.stepId] = e.exercise.colonnesPapier || 'auto'; });
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
    const consignes = {};
    papier.forEach(e => {
        consignes[e.stepId] = e.exercise.consignePapier !== undefined
            ? e.exercise.consignePapier
            : (e.exercise.instruction || '');
    });
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
        // « auto » laisse le mode décider : cinq colonnes de réponses nues
        // pour corriger vite, une seule quand chaque ligne porte son
        // explication. Le professeur tranche quand ça ne lui va pas.
        colonnesSolutions: colSol.value === 'auto' ? null : Number(colSol.value),
        ouSolution: ouSol.value,
        orientation: orientEl.value,
        champs: champsEl.checked,
        numerotation: numEl.value,
        noteSur: Math.max(5, Math.min(100, Number(noteSurEl.value) || 20))
    });

    // La liste des étapes : le nombre de questions de chacune, ET leur ordre
    // sur la feuille — chaque ligne se glisse plus haut ou plus bas par sa
    // poignée. C'est toute la mise en page : le reste se calcule.
    // Quels tiroirs sont ouverts : la liste est redessinée à chaque réglage,
    // et un tiroir qui se referme sous le doigt est insupportable.
    //
    // Sur grand écran ils s'ouvrent tous d'emblée : le tiroir existe pour
    // épargner la hauteur d'un téléphone, et sur un ordinateur il ne ferait
    // qu'ajouter un clic devant chaque réglage.
    const ouvertes = new Set(
        (typeof window !== 'undefined' && window.innerWidth > 700) ? papier.map(e => e.stepId) : []
    );
    const CHEVRON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"'
        + ' stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';

    const rendreListe = () => {
        listeEl.innerHTML = ordre.map((id, i) => {
            const e = parId.get(id);
            const nom = echapper(e.title);
            // LA LIGNE ET SON TIROIR. Sur un téléphone, les quatre réglages
            // d'une étape à plat prenaient trois rangées chacun : la liste des
            // exercices devenait un mur avant même qu'on voie l'aperçu. Ce
            // qu'on regarde — l'ordre et le nom — reste visible ; ce qu'on
            // règle une fois se déplie d'un chevron. Un <details> le fait sans
            // une ligne de JavaScript, et sur grand écran il s'ouvre tout seul.
            const unite = e.grille ? 'grilles' : 'questions';
            return `
            <details class="pp-etape" data-etape-ligne="${id}" ${ouvertes.has(id) ? 'open' : ''}>
                <summary class="pp-etape-tete">
                    <button type="button" class="pp-grip" data-grip="${id}"
                        title="Glisser pour changer l'ordre sur la feuille"
                        aria-label="Déplacer « ${nom} »">⠿</button>
                    <span class="pp-etape-num">${i + 1}.</span>
                    <span class="pp-etape-nom">${nom}</span>
                    <span class="pp-etape-resume">${quantites[id]} ${unite}</span>
                    <span class="pp-fleches">
                        <button type="button" class="pp-fleche" data-monter="${id}"
                            ${i === 0 ? 'disabled' : ''} title="Monter d'un cran"
                            aria-label="Monter « ${nom} »">▲</button>
                        <button type="button" class="pp-fleche" data-descendre="${id}"
                            ${i === ordre.length - 1 ? 'disabled' : ''} title="Descendre d'un cran"
                            aria-label="Descendre « ${nom} »">▼</button>
                    </span>
                    <span class="pp-chevron" aria-hidden="true">${CHEVRON}</span>
                </summary>
                <div class="pp-etape-reglages">
                    <label class="pp-etape-champ pp-etape-consigne">Consigne
                        <input type="text" class="cfg-input" data-consigne="${id}"
                            value="${echapper(consignes[id] || '')}" maxlength="140"
                            placeholder="(aucune consigne imprimée)"
                            aria-label="Consigne imprimée de « ${nom} »"></label>
                    <label class="pp-etape-champ">${unite === 'grilles' ? 'Grilles' : 'Questions'}
                        <input type="number" class="cfg-input cfg-input--num" data-etape="${id}"
                            min="0" max="40" value="${quantites[id]}"></label>
                    <label class="pp-etape-champ">${e.grille ? 'Par ligne' : 'Colonnes'}
                        <select class="cfg-input" data-colonnes="${id}"
                            aria-label="Mise en page de « ${nom} »">
                            ${['auto', 1, 2, 3, 4, 5, 6].map(v => `<option value="${v}"
                                ${String(colonnes[id]) === String(v) ? 'selected' : ''}>${v === 'auto' ? 'auto' : v}</option>`).join('')}
                        </select></label>
                    <label class="pp-etape-champ pp-etape-case">
                        <input type="checkbox" data-numeroter="${id}"
                            ${numeroter[id] ? 'checked' : ''}> Numéroter</label>
                    <label class="pp-etape-champ pp-etape-pts" ${interro.checked ? '' : 'hidden'}>Barème
                        <input type="number" class="cfg-input cfg-input--num" data-points="${id}"
                            min="0" max="40" value="${points[id]}"
                            aria-label="Points de « ${nom} »"></label>
                </div>
            </details>`;
        }).join('')
            + (ecran.length ? `<div class="pp-ecran">Sur écran seulement : ${[...new Set(ecran.map(e => e.title))].map(echapper).join(', ')}
                 — ${ecran.length > 1 ? 'ces activités demandent' : 'cette activité demande'} de manipuler, elles ne se photocopient pas.</div>` : '');

        listeEl.querySelectorAll('[data-etape]').forEach(inp => {
            inp.oninput = () => {
                quantites[inp.dataset.etape] = Math.max(0, Math.min(40, Number(inp.value) || 0));
                blocs = null;
                if (!baremeTouche) repartirPoints();
                majChiffres();
                rendre();
            };
            // Le rabotage (0 à 40) ne s'écrit dans le champ qu'à la sortie :
            // pendant la frappe, réécrire ce que l'on tape empêche de taper.
            inp.onchange = () => { inp.value = quantites[inp.dataset.etape]; };
        });
        listeEl.querySelectorAll('.pp-etape').forEach(d => {
            d.addEventListener('toggle', () => {
                if (d.open) ouvertes.add(d.dataset.etapeLigne);
                else ouvertes.delete(d.dataset.etapeLigne);
            });
        });
        listeEl.querySelectorAll('[data-consigne]').forEach(inp => {
            // Sans reconstruire la liste : on tape dedans, la feuille suit.
            inp.oninput = () => { consignes[inp.dataset.consigne] = inp.value; rendre(); };
        });
        listeEl.querySelectorAll('[data-numeroter]').forEach(c => {
            c.onchange = () => {
                numeroter[c.dataset.numeroter] = c.checked;
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
            inp.onchange = () => { inp.value = points[inp.dataset.points]; };
        });
        // RAFRAÎCHIR LES CHIFFRES SANS RECONSTRUIRE LA LISTE.
        //
        // Chaque frappe dans « Grilles » ou « Questions » réécrivait tout le
        // HTML de la liste — donc remplaçait le champ en cours de saisie. Le
        // curseur partait au premier chiffre tapé et la valeur revenait à
        // celle du modèle : le champ paraissait impossible à modifier. On ne
        // retouche donc que les textes qui ont bougé, et jamais le champ qu'on
        // est en train de remplir.
        const majChiffres = () => {
            listeEl.querySelectorAll('[data-etape-ligne]').forEach(ligne => {
                const id = ligne.dataset.etapeLigne;
                const e = parId.get(id);
                const resume = ligne.querySelector('.pp-etape-resume');
                if (resume) resume.textContent = `${quantites[id]} ${e && e.grille ? 'grilles' : 'questions'}`;
                const pts = ligne.querySelector('[data-points]');
                if (pts && pts !== document.activeElement) pts.value = points[id];
            });
        };

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
                    consigne: o.interrogation ? '' : (e.grille ? consigneGrille : consignes[id]),
                    points: o.interrogation ? (points[id] || null) : null,
                    numeroter: numeroter[id] !== false,
                    questions: e.grille ? [] : tire,
                    grilles: e.grille ? tire : [],
                    colonnes: e.grille ? null : col,
                    // « auto » demande au rendu ce qui lui convient : une grille
                    // remplit la largeur, une rédaction veut deux par ligne.
                    grillesParLigne: e.grille ? (col ?? RENDUS[e.grille].parLigneDefaut ?? null) : null,
                    // Tous les blocs imprimables ne sont pas carrés : une
                    // figure suivie de trois lignes à rédiger est large et
                    // basse. Le rendu déclare sa proportion, la mise en page
                    // la respecte.
                    grilleRatio: e.grille ? (RENDUS[e.grille].proportions?.h ?? 1) : 1
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
        const aGrilles = exos.filter(x => x.grilles.length);

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
            ? composerBlocs(aGrilles, { ...o, solution: true, interrogation: false }, mesurer)
            : null;
        const pg = mise.page || pageDe(o.orientation);

        const large = apercu.parentElement.clientWidth || 640;
        const k = Math.min(large, 700) / pg.w;
        apercu.style.width = `${pg.w * k}px`;

        const nom = chemin.name || 'Parcours';
        const note = o.interrogation ? { sur: o.noteSur } : null;
        // Les pages, dans l'ordre du document : les questions, la liste des
        // réponses, puis les blocs corrigés (le sudoku rempli, la rédaction
        // écrite — leur solution est une figure, pas une ligne dans une liste).
        const vues = [
            ...mise.pages.map(p => ({
                page: p, opts: mise.opts, liste: false,
                sousTitre: o.interrogation ? 'Interrogation' : ''
            })),
            ...(listeSol ? listeSol.pages.map(p => ({
                page: p, opts: listeSol.opts, liste: true, sousTitre: 'Solutions', sol: true
            })) : []),
            ...(blocsSol ? blocsSol.pages.map(p => ({
                page: p, opts: blocsSol.opts, liste: false, sousTitre: 'Solutions', sol: true
            })) : [])
        ];
        apercu.style.height = `${pg.h * k * vues.length + 12 * Math.max(0, vues.length - 1)}px`;
        apercu.innerHTML = vues.map((v, i) => `
            <div class="fq-page${v.sol ? ' fq-page--sol' : ''}"
                 style="width:${pg.w * k}px; height:${pg.h * k}px; top:${i * (pg.h * k + 12)}px">
                ${apercuEntete(k, nom, v.sousTitre, i === 0 ? note : null, pg)}
                ${v.liste ? apercuSolutions(v.page, k, v.opts) : apercuItems(v.page, k, v.opts)}
            </div>`).join('');

        const nbGrilles = exos.reduce((s, x) => s + x.grilles.length, 0);
        const morceaux = [];
        if (toutes.length) morceaux.push(`${toutes.length} question${toutes.length > 1 ? 's' : ''}`);
        if (nbGrilles) morceaux.push(`${nbGrilles} grille${nbGrilles > 1 ? 's' : ''}`);
        const nbSol = (listeSol ? listeSol.pages.length : 0) + (blocsSol ? blocsSol.pages.length : 0);
        morceaux.push(`${mise.pages.length} page${mise.pages.length > 1 ? 's' : ''}`);
        if (nbSol) morceaux.push(`+ ${nbSol} de solutions`);
        morceaux.push(o.orientation === 'paysage' ? 'paysage' : 'portrait');
        totalEl.textContent = morceaux.join(' · ');

        noteSurChamp.hidden = !o.interrogation;
        const total = totalPoints();
        noteEl.textContent = o.interrogation
            ? `Interrogation : pas de consigne imprimée, un barème par exercice (total ${total} pt${total > 1 ? 's' : ''}), `
              + `et la case « … / ${o.noteSur} » en haut de la première page.`
              + (total === o.noteSur ? '' : ` ⚠️ Le barème totalise ${total} points pour une note sur ${o.noteSur}.`)
            : 'Un bloc par exercice, dans l\'ordre de la liste — glisse la poignée ⠿ pour les réordonner.';
        derniers = { exos, toutes, note, total, page: pg, sections, aGrilles };
    };
    let derniers = null;

    interro.onchange = () => { blocs = null; rendreListe(); rendre(); };
    choixEl.onchange = rendre;
    modeSol.onchange = rendre;
    colSol.onchange = rendre;
    ouSol.onchange = rendre;
    orientEl.onchange = rendre;
    champsEl.onchange = rendre;
    numEl.onchange = rendre;
    noteSurEl.oninput = () => {
        if (!baremeTouche) { repartirPoints(); rendreListe(); }
        rendre();
    };
    m.querySelector('#pp-regen').onclick = () => { blocs = null; rendre(); };
    m.querySelector('#pp-fermer').onclick = () => { m.style.display = 'none'; };
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
    const { exos, toutes, note, total, options, mesurer, sections, aGrilles } = lire();
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
                let posee = false;
                const nouvelle = () => { if (premiere && !posee) { posee = true; return; } doc.addPage('a4', sens); };
                if (toutes.length) {
                    const sol = composerSolutions(toutes,
                        { mode: options.modeSolution, orientation: options.orientation, sections,
                          numerotation: options.numerotation,
                          colonnesSolutions: options.colonnesSolutions }, mesurer);
                    sol.pages.forEach((page) => {
                        nouvelle();
                        entetePdf(doc, nom, 'Solutions', '', null, sol.page);
                        pdfSolutions(doc, page, sol.opts);
                    });
                }
                // Les blocs corrigés : le sudoku rempli, la rédaction écrite.
                if (aGrilles.length) {
                    const bs = composerBlocs(aGrilles,
                        { ...options, solution: true, interrogation: false }, mesurer);
                    bs.pages.forEach((page) => {
                        nouvelle();
                        entetePdf(doc, nom, 'Solutions', '', null, bs.page);
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
