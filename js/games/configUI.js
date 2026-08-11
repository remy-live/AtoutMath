// Formulaires de configuration.
//
// Le schéma n'est plus recopié dans le catalogue : il est déduit du registre
// (paramètres du générateur + paramètres de l'activité). Ajouter une option à
// un générateur la fait apparaître partout où il est utilisé, sans toucher au
// catalogue ni à cette interface.

import { paramSchemaOf, getExerciseById } from '../data/catalog.js';
import { getGenerator } from '../core/registry.js';
import { MODES, evaluationPolicy, apprentissagePolicy, defaultPolicy, resolvePolicy } from '../core/policy.js';

// --- Champs -----------------------------------------------------------------

/**
 * Une option de schéma est soit une valeur brute, soit `{ value, label }`.
 *
 * Sans libellé, la case à cocher affichait le code interne : un élève lisait
 * « mul », « c10 », « rel » au lieu de « Tables », « Compléments à 10 »,
 * « Relatifs ». Le code, lui, doit rester tel quel — il pilote la génération
 * des questions et se retrouve dans les parcours enregistrés.
 */
function valeurOption(opt) { return (opt && typeof opt === 'object') ? opt.value : opt; }
function libelleOption(opt) { return (opt && typeof opt === 'object') ? opt.label : String(opt); }

/**
 * Un réglage = un libellé court et son contrôle, côte à côte quand la largeur
 * le permet. Les explications passent dans une infobulle sur « ? » plutôt que
 * sous le champ : trois paragraphes d'aide empilés rendaient le panneau
 * illisible et repoussaient les réglages suivants hors de l'écran.
 */
function fieldHtml(param, value, options = {}) {
    const id = `cfg-${param.id}`;
    const wide = param.type === 'multiselect';   // les puces prennent toute la largeur
    let control = '';

    if (param.type === 'multiselect') {
        // Des options toutes courtes — les tables, les nombres de côtés — se
        // rangent en GRILLE de tuiles identiques plutôt qu'en pastilles au fil
        // du texte : les tailles ne dépendent plus du contenu, les colonnes
        // s'alignent, et une table cochée ne pousse plus ses voisines.
        const grille = param.options.every(o => String(libelleOption(o)).length <= 3);
        // Le nombre de colonnes est DIT, pas deviné. `auto-fill` remplissait la
        // largeur avec des tuiles minimales : dix tables tombaient en 6 + 4,
        // une rangée pleine et une rangée orpheline. Une grille qui compte
        // exactement ses options tient sur une ligne quand la place existe, et
        // se replie proprement en deux rangées égales sur un téléphone.
        const cols = grille ? ` style="--cfg-cols: ${param.options.length}"` : '';
        control = `<div class="cfg-chips${grille ? ' cfg-chips--grille' : ''}"${cols}>` + param.options.map(opt => {
            const v = valeurOption(opt);
            const checked = Array.isArray(value) && value.includes(v) ? 'checked' : '';
            // `aide` porte le nom en toutes lettres quand le libellé est un
            // raccourci — « 7 × 8 » dit ce qu'on va calculer, il ne dit pas
            // qu'on travaille les tables. L'infobulle rattrape la nuance sans
            // rallonger la puce.
            const titre = opt && opt.aide ? ` title="${escapeAttr(opt.aide)}"` : '';
            return `<label class="cfg-chip"${titre}>
                <input type="checkbox" data-param="${param.id}" data-kind="multiselect" value="${v}" ${checked}>
                <span>${libelleOption(opt)}</span></label>`;
        }).join('') + `</div>`;
    } else if (param.type === 'number') {
        // UN NOMBRE SE RÈGLE DE TROIS FAÇONS, et il faut les trois : un champ
        // nu obligeait à sélectionner le contenu puis à taper — sur téléphone,
        // c'est faire monter le clavier système pour changer 4 en 5. On garde
        // donc la saisie (la plus rapide pour aller loin), on ajoute deux
        // boutons − / + (le geste évident au doigt) et la molette ou le glissé
        // vertical sur le champ (le geste évident à la souris).
        control = `<div class="cfg-stepper" data-stepper>
            <button type="button" class="cfg-step" data-step="-1" tabindex="-1" aria-label="Diminuer">−</button>
            <input type="number" inputmode="numeric" id="${id}" class="cfg-input cfg-input--num"
                data-param="${param.id}" data-kind="number" value="${value}"
                ${param.min !== undefined ? `min="${param.min}"` : ''} ${param.max !== undefined ? `max="${param.max}"` : ''}>
            <button type="button" class="cfg-step" data-step="1" tabindex="-1" aria-label="Augmenter">+</button>
        </div>`;
    } else if (param.type === 'select') {
        control = `<select id="${id}" class="cfg-input" data-param="${param.id}" data-kind="select">` +
            param.options.map(o => {
                const v = valeurOption(o);
                return `<option value="${v}" ${String(value) === String(v) ? 'selected' : ''}>${libelleOption(o)}</option>`;
            }).join('') +
            `</select>`;
    } else if (param.type === 'checkbox' || param.type === 'bool' || typeof value === 'boolean') {
        // OUI / NON, jamais « true » et « false ».
        //
        // Sans cette branche, un réglage booléen tombait dans le champ texte :
        // l'élève lisait « true », et en tapant dessus il pouvait écrire
        // n'importe quoi — le clavier du téléphone montait pour éditer un mot
        // anglais qui n'a aucun sens dans une salle de classe.
        const oui = value === true || value === 'true';
        control = `<div class="cfg-oui-non" data-param="${param.id}" data-kind="bool" data-valeur="${oui}">
            <button type="button" class="cfg-on ${oui ? 'cfg-on--actif' : ''}" data-bool="true">Oui</button>
            <button type="button" class="cfg-on ${oui ? '' : 'cfg-on--actif'}" data-bool="false">Non</button>
        </div>`;
    } else {
        control = `<input type="text" id="${id}" class="cfg-input" data-param="${param.id}" data-kind="text" value="${value ?? ''}">`;
    }

    // L'explication peut venir du schéma lui-même (`aide`) : un réglage dont le
    // libellé ne suffit pas se documente là où il est défini, pas au point
    // d'appel — sinon l'aide n'existe que dans un seul des trois panneaux.
    return `<div class="cfg-field${wide ? ' cfg-field--wide' : ''}">
        <label class="cfg-label" for="${id}">${param.label}${infoBtn(options.aide || param.aide, options.aideId)}</label>
        ${control}
    </div>`;
}

// Sorti du littéral de gabarit : les apostrophes d'un texte français y sont
// une source d'erreurs de syntaxe silencieuses.
const SCOPE_TIP = "« À toute l'étape » : un seul compte à rebours pour l'ensemble "
    + "des questions. « À chaque question » : il repart à zéro à chaque question, "
    + "et une question non répondue à temps est comptée fausse.";

/** Point d'interrogation portant l'explication ; rien du tout s'il n'y en a pas. */
function infoBtn(aide, id) {
    if (!aide && !id) return '';
    return `<button type="button" class="cfg-info" ${id ? `id="${id}"` : ''}
        data-tip="${aide ? escapeAttr(aide) : ''}" aria-label="Explication">?</button>`;
}

function escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// --- Infobulles -------------------------------------------------------------
//
// L'infobulle vit dans <body> et non à côté de son bouton : les panneaux qui
// la contiennent défilent, et un conteneur qui défile découpe tout ce qui en
// dépasse — le texte se retrouvait tronqué sur la gauche. Positionnée en
// `fixed` et recalée dans la fenêtre, elle ne peut plus être rognée.

let tipEl = null;

function tipNode() {
    if (!tipEl) {
        tipEl = document.createElement('div');
        tipEl.className = 'cfg-tip';
        tipEl.setAttribute('role', 'tooltip');
        document.body.appendChild(tipEl);
    }
    return tipEl;
}

function showTip(btn) {
    const texte = btn.dataset.tip;
    if (!texte) return;
    const el = tipNode();
    el.textContent = texte;
    el.classList.add('cfg-tip--on');

    const b = btn.getBoundingClientRect();
    const t = el.getBoundingClientRect();
    const marge = 8;

    // Centrée sur le bouton, puis ramenée dans la fenêtre si elle déborde.
    let left = b.left + b.width / 2 - t.width / 2;
    left = Math.max(marge, Math.min(left, window.innerWidth - t.width - marge));

    // Au-dessus par défaut ; en dessous s'il n'y a pas la place.
    let top = b.top - t.height - 10;
    if (top < marge) top = b.bottom + 10;

    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
}

function hideTip() {
    if (tipEl) tipEl.classList.remove('cfg-tip--on');
}

/** Survol et focus pour la souris et le clavier, clic pour le tactile. */
function wireTips(root) {
    root.querySelectorAll('.cfg-info').forEach(btn => {
        btn.onmouseenter = () => showTip(btn);
        btn.onmouseleave = hideTip;
        btn.onfocus = () => showTip(btn);
        btn.onblur = hideTip;
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const ouverte = tipEl && tipEl.classList.contains('cfg-tip--on') && tipEl._pour === btn;
            if (ouverte) return hideTip();
            showTip(btn);
            tipNode()._pour = btn;
        };
    });
}

document.addEventListener('click', (e) => { if (!e.target.closest('.cfg-info')) hideTip(); });
// Une infobulle flottante ne suit pas son bouton : on la ferme dès que la
// page bouge sous elle.
window.addEventListener('scroll', hideTip, true);
window.addEventListener('resize', hideTip);

// --- Le pas-à-pas des nombres -----------------------------------------------
//
// Un seul écouteur posé sur <body> sert TOUS les panneaux, présents et à venir
// (réglages avant partie, propriétés d'étape, politique). Les panneaux se
// reconstruisent à chaque ouverture : brancher les champs après chaque rendu
// aurait multiplié les écouteurs sans jamais les retirer.

function borner(input, v) {
    const min = input.min !== '' ? Number(input.min) : -Infinity;
    const max = input.max !== '' ? Number(input.max) : Infinity;
    return Math.max(min, Math.min(max, v));
}

/** Change la valeur ET prévient le panneau : sans `change`, rien n'est retenu. */
function pousser(input, delta) {
    const v = borner(input, (Number(input.value) || 0) + delta);
    if (v === Number(input.value)) return;
    input.value = String(v);
    input.dispatchEvent(new Event('change', { bubbles: true }));
}

// Oui / Non : un seul écouteur délégué, comme les autres commandes du panneau.
document.addEventListener('click', (e) => {
    const b = e.target.closest('.cfg-on');
    if (!b) return;
    e.preventDefault();
    const groupe = b.parentElement;
    groupe.dataset.valeur = b.dataset.bool;
    groupe.querySelectorAll('.cfg-on').forEach(x =>
        x.classList.toggle('cfg-on--actif', x.dataset.bool === b.dataset.bool));
});

document.addEventListener('click', (e) => {
    const btn = e.target.closest('.cfg-step');
    if (!btn) return;
    const input = btn.parentElement.querySelector('input[type="number"]');
    if (input) { e.preventDefault(); pousser(input, Number(btn.dataset.step)); }
});

// La molette : elle ne doit agir que sur un champ SURVOLÉ, jamais emporter la
// page avec elle — d'où le `preventDefault` et le `passive: false`.
document.addEventListener('wheel', (e) => {
    const st = e.target.closest('.cfg-stepper');
    if (!st) return;
    const input = st.querySelector('input[type="number"]');
    if (!input) return;
    e.preventDefault();
    pousser(input, e.deltaY < 0 ? 1 : -1);
}, { passive: false });

// Le glissé vertical sur le champ : le geste du curseur de volume. Utile au
// doigt sur tablette, où viser deux petits boutons est moins naturel que
// pousser le nombre vers le haut.
let glisse = null;
document.addEventListener('pointerdown', (e) => {
    const st = e.target.closest('.cfg-stepper');
    if (!st || e.target.closest('.cfg-step')) return;
    const input = st.querySelector('input[type="number"]');
    if (!input) return;
    glisse = { input, y: e.clientY, depart: Number(input.value) || 0, bouge: false };
});
document.addEventListener('pointermove', (e) => {
    if (!glisse) return;
    const d = Math.round((glisse.y - e.clientY) / 14);   // 14 px = un cran
    if (!d) return;
    glisse.bouge = true;
    const v = borner(glisse.input, glisse.depart + d);
    if (v !== Number(glisse.input.value)) {
        glisse.input.value = String(v);
        glisse.input.dispatchEvent(new Event('change', { bubbles: true }));
    }
});
document.addEventListener('pointerup', () => {
    // Un glissé n'ouvre pas le clavier : sinon il masquerait le nombre qu'on
    // vient de régler au doigt.
    if (glisse && glisse.bouge) glisse.input.blur();
    glisse = null;
});
document.addEventListener('pointercancel', () => { glisse = null; });

function readParams(root, schema) {
    const out = {};
    schema.forEach(param => {
        if (param.type === 'multiselect') {
            const boxes = [...root.querySelectorAll(`[data-param="${param.id}"][data-kind="multiselect"]`)];
            const isNum = typeof valeurOption(param.options[0]) === 'number';
            out[param.id] = boxes.filter(b => b.checked).map(b => (isNum ? Number(b.value) : b.value));
        } else {
            const el = root.querySelector(`[data-param="${param.id}"]`);
            if (!el) return;
            if (el.dataset.kind === 'bool') { out[param.id] = el.dataset.valeur === 'true'; return; }
            const isNum = param.type === 'number'
                || (param.type === 'select' && typeof valeurOption(param.options[0]) === 'number');
            out[param.id] = isNum ? Number(el.value) : el.value;
        }
    });
    return out;
}

// --- Panneau « propriétés d'une étape » (éditeur professeur) ----------------

/**
 * @param {Object} step - étape v2 { exerciseId, overrides, nbItems, threshold, weight, timeLimit }
 * @param {(step:Object)=>void} onSave
 */
export function renderGameConfigUI(step, onSave, containerId = 'builder-config-content') {
    const content = document.getElementById(containerId);
    if (!content) return;

    const exo = getExerciseById(step.exerciseId) || step.exercise || {};
    const schema = paramSchemaOf(exo);
    const current = { ...(exo.params || {}), ...(step.overrides || {}) };

    content.innerHTML = `
        <div class="cfg-header">${exo.title || step.exerciseId}</div>
        ${exo.instruction ? `<p class="cfg-desc">${exo.instruction}</p>` : ''}
        ${schema.length ? `<div class="cfg-group">
            <div class="cfg-group-title">Contenu des questions</div>
            ${schema.map(p => fieldHtml(p, current[p.id] !== undefined ? current[p.id] : p.default)).join('')}
        </div>`
            : '<p class="cfg-empty">Cette activité n\'a pas de paramètre de contenu.</p>'}

        <div class="cfg-group">
            <div class="cfg-group-title">Déroulement de l'étape</div>
            <div class="cfg-field">
                <label class="cfg-label" for="cfg-nbitems">Nombre de questions</label>
                <input type="number" id="cfg-nbitems" class="cfg-input cfg-input--num" min="1" max="50" value="${step.nbItems || 10}">
            </div>
            <div class="cfg-field">
                <label class="cfg-label" for="cfg-threshold">Bonnes réponses exigées
                    ${infoBtn(null, 'cfg-threshold-tip')}</label>
                <input type="number" id="cfg-threshold" class="cfg-input cfg-input--num" min="1" max="50"
                       value="${step.threshold !== null && step.threshold !== undefined ? step.threshold : (step.nbItems || 10)}">
            </div>
            <div class="cfg-field">
                <label class="cfg-label" for="cfg-timelimit">Chronomètre (s)
                    ${infoBtn('0 = aucun chronomètre. Sinon, la durée en secondes.', null)}</label>
                <input type="number" id="cfg-timelimit" class="cfg-input cfg-input--num" min="0" max="600" value="${step.timeLimit || 0}">
            </div>
            <div class="cfg-field" id="cfg-scope-field">
                <label class="cfg-label" for="cfg-timescope">Le chrono s'applique
                    ${infoBtn(SCOPE_TIP, null)}</label>
                <select id="cfg-timescope" class="cfg-input">
                    <option value="etape" ${step.timerScope !== 'question' ? 'selected' : ''}>à toute l'étape</option>
                    <option value="question" ${step.timerScope === 'question' ? 'selected' : ''}>à chaque question</option>
                </select>
            </div>
            <div class="cfg-field">
                <label class="cfg-label" for="cfg-weight">Poids dans la note
                    ${infoBtn('Une étape de poids 2 compte double dans le barème.', null)}</label>
                <input type="number" id="cfg-weight" class="cfg-input cfg-input--num" min="1" max="10" value="${step.weight || 1}">
            </div>
        </div>`;

    // L'explication du seuil est chiffrée avec les valeurs courantes, et suit
    // la saisie : « 7 sur 10 » parle, « seuil » ne dit rien.
    const describeThreshold = () => {
        const tip = document.getElementById('cfg-threshold-tip');
        if (!tip) return;
        const nb = intVal('cfg-nbitems', 10);
        const seuil = Math.min(intVal('cfg-threshold', nb), nb);
        tip.dataset.tip = `L'élève doit réussir ${seuil} question${seuil > 1 ? 's' : ''} sur ${nb} `
            + `pour que l'étape soit validée. En dessous, il rejoue l'étape (en entraînement) `
            + `ou passe à la suivante sans la valider (en évaluation).`;
    };

    // Le choix « à chaque question / à toute l'étape » n'a de sens que s'il y
    // a un chronomètre.
    const toggleScope = () => {
        const field = document.getElementById('cfg-scope-field');
        if (field) field.style.display = intVal('cfg-timelimit', 0) > 0 ? '' : 'none';
    };

    const commit = () => {
        const overrides = readParams(content, schema);
        const nbItems = intVal('cfg-nbitems', 10);
        describeThreshold();
        toggleScope();
        const scope = document.getElementById('cfg-timescope');
        onSave({
            ...step,
            overrides,
            nbItems,
            threshold: Math.min(intVal('cfg-threshold', nbItems), nbItems),
            timeLimit: intVal('cfg-timelimit', 0) || null,
            timerScope: scope ? scope.value : 'etape',
            weight: intVal('cfg-weight', 1)
        });
    };

    describeThreshold();
    toggleScope();
    wireTips(content);
    content.addEventListener('change', commit);
    content.addEventListener('keyup', e => {
        if (e.target.tagName === 'INPUT' && e.target.type === 'number') commit();
    });
}

// --- Réglages avant partie (élève) ------------------------------------------

export function showStudentConfigModal(exo, onStart) {
    const modal = document.getElementById('student-config-modal');
    const content = document.getElementById('student-config-content');
    if (!modal || !content) return onStart({ ...(exo.params || {}) });

    const schema = paramSchemaOf(exo);
    const current = { ...(exo.params || {}) };

    // Travailler sur papier : proposé quand l'exercice s'y prête, c'est-à-dire
    // dans deux cas — une GRILLE déclarée imprimable au catalogue, ou un
    // générateur dont les énoncés se suffisent en texte (`ecrit`). Le bouton
    // ouvre une modale d'aperçu ; les réglages choisis ICI (tables, opérations,
    // difficulté) sont ceux de la fiche, il n'y a pas deux endroits à régler.
    const gen = exo.generatorId ? getGenerator(exo.generatorId) : null;
    const surPapier = exo.printable ? 'grille' : (gen && gen.ecrit ? 'ecrit' : null);
    const impression = surPapier ? `
        <button type="button" class="cfg-print-btn cfg-print-btn--seul" id="btn-print-sheet">
            ${surPapier === 'ecrit' ? '📝 Fiche d\'exercices à imprimer…' : '📄 Travailler sur papier…'}
        </button>` : '';

    content.innerHTML = `
        ${schema.map(p => fieldHtml(p, current[p.id] !== undefined ? current[p.id] : p.default)).join('')}
        <div class="cfg-field">
            <label class="cfg-label" for="cfg-nbitems">Nombre de questions</label>
            <div class="cfg-stepper" data-stepper>
                <button type="button" class="cfg-step" data-step="-1" tabindex="-1" aria-label="Diminuer">−</button>
                <input type="number" inputmode="numeric" id="cfg-nbitems" class="cfg-input cfg-input--num"
                    min="3" max="50" value="${current.nbQuestions || 10}">
                <button type="button" class="cfg-step" data-step="1" tabindex="-1" aria-label="Augmenter">+</button>
            </div>
        </div>
        ${impression}`;

    wireTips(content);
    modal.style.display = 'flex';

    const btnPrint = document.getElementById('btn-print-sheet');
    if (btnPrint) {
        btnPrint.onclick = () => {
            // Les réglages COURANTS de la fenêtre, pas ceux du catalogue : ce
            // que le parent vient de choisir est ce qu'il veut sur la feuille.
            const params = { ...current, ...readParams(content, schema) };
            import('../ui/printSheet.js').then(m => m.ouvrirFicheModal(exo, params));
        };
    }

    document.getElementById('btn-student-config-cancel').onclick = () => { modal.style.display = 'none'; };
    document.getElementById('btn-student-config-start').onclick = () => {
        modal.style.display = 'none';
        onStart({
            ...current,
            ...readParams(content, schema),
            nbQuestions: intVal('cfg-nbitems', 10)
        });
    };
}

// --- Politique du parcours (mode et barème) ---------------------------------

/**
 * Éditeur de politique : c'est ici que le professeur bascule un parcours
 * d'entraînement en évaluation notée. Les deux réglages qui changent tout —
 * nombre d'essais et disponibilité des aides — sont pilotés par le mode, mais
 * restent ajustables.
 */
export function renderPolicyEditor(path, onChange, containerId = 'builder-policy-content') {
    const root = document.getElementById(containerId);
    if (!root) return;

    const p = resolvePolicy(path.policy);
    const isEval = p.mode === MODES.EVALUATION;
    const isLearn = p.mode === MODES.APPRENTISSAGE;
    const g = p.grading || {};

    root.innerHTML = `
        <div class="cfg-modes cfg-modes--3">
            <button type="button" class="cfg-mode ${isLearn ? 'cfg-mode--active' : ''}" data-mode="${MODES.APPRENTISSAGE}">
                <span class="cfg-mode-icon" aria-hidden="true">🌱</span>
                <span class="cfg-mode-title">Apprentissage</span>
                <span class="cfg-mode-desc">Leçon et robot avant de jouer, essais illimités, aides gratuites, bouton « Montre-moi ». Pour découvrir.</span>
            </button>
            <button type="button" class="cfg-mode ${!isEval && !isLearn ? 'cfg-mode--active' : ''}" data-mode="${MODES.ENTRAINEMENT}">
                <span class="cfg-mode-icon" aria-hidden="true">🎯</span>
                <span class="cfg-mode-title">Entraînement</span>
                <span class="cfg-mode-desc">Plusieurs essais, aides, correction immédiate. Sans note.</span>
            </button>
            <button type="button" class="cfg-mode ${isEval ? 'cfg-mode--active' : ''}" data-mode="${MODES.EVALUATION}">
                <span class="cfg-mode-icon" aria-hidden="true">📝</span>
                <span class="cfg-mode-title">Évaluation</span>
                <span class="cfg-mode-desc">Un seul essai, pas d'aide, note et bilan par compétence.</span>
            </button>
        </div>

        <div class="cfg-field">
            <label class="cfg-label" for="cfg-attempts">Essais autorisés par question</label>
            <input type="number" id="cfg-attempts" class="cfg-input" min="1" max="5" value="${p.maxAttemptsPerItem}">
        </div>
        <label class="cfg-check">
            <input type="checkbox" id="cfg-hints" ${p.hints ? 'checked' : ''}>
            Autoriser les indices
        </label>
        <label class="cfg-check">
            <input type="checkbox" id="cfg-adaptive" ${p.adaptive ? 'checked' : ''}>
            Cibler les notions fragiles de l'élève
        </label>

        <div class="cfg-group ${isEval ? '' : 'cfg-group--muted'}">
            <div class="cfg-group-title">Barème</div>
            <label class="cfg-check">
                <input type="checkbox" id="cfg-graded" ${p.grading ? 'checked' : ''}>
                Attribuer une note
            </label>
            <div class="cfg-field">
                <label class="cfg-label" for="cfg-scale">Note sur</label>
                <input type="number" id="cfg-scale" class="cfg-input" min="5" max="100" value="${g.scale || 20}">
            </div>
            <!-- Pleine largeur : les trois règles portent des noms longs, et
                 une liste déroulante large mangeait la colonne du libellé —
                 « Règle de calcul » et son explication s'imprimaient alors un
                 mot par ligne. -->
            <div class="cfg-field cfg-field--wide">
                <label class="cfg-label" for="cfg-rule">Règle de calcul</label>
                <select id="cfg-rule" class="cfg-input">
                    <option value="firstTry" ${g.rule === 'firstTry' ? 'selected' : ''}>Réussite du premier coup</option>
                    <option value="ratio" ${g.rule === 'ratio' ? 'selected' : ''}>Question résolue (essais illimités)</option>
                    <option value="ponderee" ${g.rule === 'ponderee' ? 'selected' : ''}>Pondérée (pénalité par essai et par aide)</option>
                </select>
                <p class="cfg-help">La note est recalculée à partir des réponses enregistrées : modifier le barème met à jour les bilans passés.</p>
            </div>
            <label class="cfg-check">
                <input type="checkbox" id="cfg-show-calc" ${g.showCalculation !== false ? 'checked' : ''}>
                Montrer à l'élève le détail du calcul de sa note
            </label>
        </div>`;

    const baseFor = (mode) => mode === MODES.EVALUATION ? evaluationPolicy()
        : mode === MODES.APPRENTISSAGE ? apprentissagePolicy()
            : defaultPolicy();

    const commit = () => {
        const graded = document.getElementById('cfg-graded').checked;
        const mode = root.querySelector('.cfg-mode--active').dataset.mode;
        const base = baseFor(mode);
        onChange({
            ...base,
            mode,
            maxAttemptsPerItem: intVal('cfg-attempts', base.maxAttemptsPerItem),
            hints: document.getElementById('cfg-hints').checked,
            adaptive: document.getElementById('cfg-adaptive').checked,
            grading: graded ? {
                scale: intVal('cfg-scale', 20),
                rule: document.getElementById('cfg-rule').value,
                penalties: { hint: 0.25, retry: 0.5 },
                arrondi: 0.5,
                showCalculation: document.getElementById('cfg-show-calc').checked
            } : null
        });
    };

    wireTips(root);
    root.querySelectorAll('[data-mode]').forEach(btn => {
        btn.onclick = () => {
            const base = baseFor(btn.dataset.mode);
            // Changer de mode réapplique les défauts du mode : c'est le sens
            // même du réglage, on ne conserve pas les réglages contradictoires.
            onChange(base);
            renderPolicyEditor({ ...path, policy: base }, onChange, containerId);
        };
    });
    root.addEventListener('change', commit);
}

function intVal(id, fallback) {
    const el = document.getElementById(id);
    if (!el) return fallback;
    const n = parseInt(el.value, 10);
    return isNaN(n) ? fallback : n;
}
