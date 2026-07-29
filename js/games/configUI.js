// Formulaires de configuration.
//
// Le schéma n'est plus recopié dans le catalogue : il est déduit du registre
// (paramètres du générateur + paramètres de l'activité). Ajouter une option à
// un générateur la fait apparaître partout où il est utilisé, sans toucher au
// catalogue ni à cette interface.

import { paramSchemaOf, getExerciseById } from '../data/catalog.js';
import { MODES, evaluationPolicy, defaultPolicy, resolvePolicy } from '../core/policy.js';

// --- Champs -----------------------------------------------------------------

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
        control = `<div class="cfg-chips">` + param.options.map(opt => {
            const checked = Array.isArray(value) && value.includes(opt) ? 'checked' : '';
            return `<label class="cfg-chip">
                <input type="checkbox" data-param="${param.id}" data-kind="multiselect" value="${opt}" ${checked}>
                <span>${opt}</span></label>`;
        }).join('') + `</div>`;
    } else if (param.type === 'number') {
        control = `<input type="number" id="${id}" class="cfg-input cfg-input--num" data-param="${param.id}" data-kind="number"
            value="${value}" ${param.min !== undefined ? `min="${param.min}"` : ''} ${param.max !== undefined ? `max="${param.max}"` : ''}>`;
    } else if (param.type === 'select') {
        control = `<select id="${id}" class="cfg-input" data-param="${param.id}" data-kind="select">` +
            param.options.map(o => `<option value="${o}" ${String(value) === String(o) ? 'selected' : ''}>${o}</option>`).join('') +
            `</select>`;
    } else {
        control = `<input type="text" id="${id}" class="cfg-input" data-param="${param.id}" data-kind="text" value="${value ?? ''}">`;
    }

    return `<div class="cfg-field${wide ? ' cfg-field--wide' : ''}">
        <label class="cfg-label" for="${id}">${param.label}${infoBtn(options.aide, options.aideId)}</label>
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

/**
 * Infobulles : au survol pour la souris, au clic pour le tactile — où le
 * survol n'existe pas.
 */
function wireTips(root) {
    root.querySelectorAll('.cfg-info').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            const ouvert = btn.classList.contains('cfg-info--open');
            root.querySelectorAll('.cfg-info--open').forEach(b => b.classList.remove('cfg-info--open'));
            btn.classList.toggle('cfg-info--open', !ouvert);
        };
    });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.cfg-info')) {
            root.querySelectorAll('.cfg-info--open').forEach(b => b.classList.remove('cfg-info--open'));
        }
    });
}

function readParams(root, schema) {
    const out = {};
    schema.forEach(param => {
        if (param.type === 'multiselect') {
            const boxes = [...root.querySelectorAll(`[data-param="${param.id}"][data-kind="multiselect"]`)];
            const isNum = typeof param.options[0] === 'number';
            out[param.id] = boxes.filter(b => b.checked).map(b => (isNum ? Number(b.value) : b.value));
        } else {
            const el = root.querySelector(`[data-param="${param.id}"]`);
            if (!el) return;
            const isNum = param.type === 'number' || (param.type === 'select' && typeof param.options[0] === 'number');
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
        ${schema.length ? schema.map(p => fieldHtml(p, current[p.id] !== undefined ? current[p.id] : p.default)).join('')
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

    content.innerHTML = `
        ${schema.map(p => fieldHtml(p, current[p.id] !== undefined ? current[p.id] : p.default)).join('')}
        <div class="cfg-field">
            <label class="cfg-label" for="cfg-nbitems">Nombre de questions</label>
            <input type="number" id="cfg-nbitems" class="cfg-input cfg-input--num" min="3" max="50" value="${current.nbQuestions || 10}">
        </div>`;

    wireTips(content);
    modal.style.display = 'flex';

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
    const g = p.grading || {};

    root.innerHTML = `
        <div class="cfg-modes">
            <button type="button" class="cfg-mode ${!isEval ? 'cfg-mode--active' : ''}" data-mode="${MODES.ENTRAINEMENT}">
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
            <div class="cfg-field">
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

    const commit = () => {
        const graded = document.getElementById('cfg-graded').checked;
        const mode = root.querySelector('.cfg-mode--active').dataset.mode;
        const base = mode === MODES.EVALUATION ? evaluationPolicy() : defaultPolicy();
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
            const mode = btn.dataset.mode;
            const base = mode === MODES.EVALUATION ? evaluationPolicy() : defaultPolicy();
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
