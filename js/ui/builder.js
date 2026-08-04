// Éditeur de parcours (mode professeur).
//
// Deux changements de fond par rapport à la version précédente :
//
//  1. Une étape est une RÉFÉRENCE (`exerciseId` + surcharges), plus une copie
//     profonde de l'exercice. Les parcours enregistrés suivent donc les
//     corrections du catalogue, pèsent quelques centaines d'octets et sont
//     directement envoyables à une base de données.
//  2. Le parcours porte une POLITIQUE : entraînement ou évaluation notée.
//
// Sur la forme : plus de `window.xxx` appelés depuis des attributs `onclick`
// dans des chaînes HTML. Les gestionnaires sont posés en JS, ce qui supprime
// une dizaine de globales et rend l'échappement des données non négociable.

import { exercices, getExerciseById } from '../data/catalog.js';
import { state } from '../core/state.js';
import { Shortcodes } from '../core/shortcodes.js';
import { makeStep, normalizePath, totalItems } from '../core/path.js';
import { resolvePolicy, isEvaluation, describePolicy } from '../core/policy.js';
import { renderGameConfigUI, renderPolicyEditor } from '../games/configUI.js';
import { showToast, showAlert } from './modal.js';

let selectedStepId = null;

// --- Initialisation ---------------------------------------------------------

export function initBuilder() {
    const pathBox = document.getElementById('path-container');
    if (!pathBox) return;

    if (!state.currentPath.policy) state.currentPath.policy = resolvePolicy(null);

    pathBox.ondragover = (e) => { e.preventDefault(); pathBox.classList.add('drag-over'); };
    pathBox.ondragleave = () => pathBox.classList.remove('drag-over');
    pathBox.ondrop = (e) => handleDrop(e, pathBox);

    initNameInput();
    initPreviewModes();
    initToolbar();
    initPathBrowser();
    initPolicyPanel();
    initPresentationMode();
    initGameAccessPanel();
    renderTeacherPath();
}

// --- Accès aux jeux (libre / réservé / à débloquer) -------------------------

function initGameAccessPanel() {
    const btn = document.getElementById('btn-game-access');
    if (!btn) return;
    btn.onclick = async () => {
        const { getAccessConfig, saveAccessConfig, isGame } = await import('../core/gameAccess.js');
        openGameAccessModal(getAccessConfig(), saveAccessConfig, isGame);
    };
}

function openGameAccessModal(cfg, save, isGame) {
    let overlay = document.getElementById('game-access-modal');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'game-access-modal';
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';

    const parDomaine = new Map();
    exercices.forEach(exo => {
        const dom = exo.tags.chemin[0];
        if (!parDomaine.has(dom)) parDomaine.set(dom, []);
        parDomaine.get(dom).push(exo);
    });

    const listeHtml = [...parDomaine.entries()].map(([dom, exos]) => `
        <div class="access-group">
            <div class="access-group-title">${escapeHtml(dom)}</div>
            ${exos.map(exo => `
                <label class="cfg-check access-row">
                    <input type="checkbox" data-reserved="${escapeHtml(exo.id)}"
                        ${cfg.reserved.includes(exo.id) ? 'checked' : ''}>
                    ${escapeHtml(exo.title)}${isGame(exo) ? ' <span class="access-tag-jeu">jeu</span>' : ''}
                </label>`).join('')}
        </div>`).join('');

    overlay.innerHTML = `
        <div class="glass-panel modal-panel-md">
            <div class="modal-header">
                <h3 class="modal-title">🔐 Accès aux jeux</h3>
                <button class="modal-close-btn" id="btn-close-game-access" aria-label="Fermer">&times;</button>
            </div>
            <p class="modal-text">Réglage enregistré sur CE poste : il s'applique au jeu libre de tous les
                élèves qui l'utilisent. Les parcours et les codes que vous donnez ne sont jamais bloqués.</p>

            <div class="cfg-group">
                <div class="cfg-group-title">Jeux à débloquer</div>
                <label class="cfg-check">
                    <input type="radio" name="access-mode" value="libre" ${cfg.mode !== 'progression' ? 'checked' : ''}>
                    Tous les jeux sont accessibles librement
                </label>
                <label class="cfg-check">
                    <input type="radio" name="access-mode" value="progression" ${cfg.mode === 'progression' ? 'checked' : ''}>
                    Les jeux se débloquent avec le travail de l'élève
                </label>
                <div class="cfg-field">
                    <label class="cfg-label" for="access-step">Bonnes réponses par jeu débloqué</label>
                    <input type="number" id="access-step" class="cfg-input cfg-input--num" min="5" max="500" value="${cfg.unlockStep}">
                </div>
            </div>

            <div class="cfg-group">
                <div class="cfg-group-title">Exercices réservés (jamais en jeu libre)</div>
                <div class="access-list">${listeHtml}</div>
            </div>

            <div class="modal-actions-center">
                <button id="btn-access-save" class="btn-toggle glass-btn primary active modal-btn-flex modal-btn-flex--primary">Enregistrer</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#btn-close-game-access').onclick = () => overlay.remove();
    overlay.querySelector('#btn-access-save').onclick = () => {
        const mode = overlay.querySelector('[name="access-mode"]:checked').value;
        const step = parseInt(overlay.querySelector('#access-step').value, 10) || 30;
        const reserved = [...overlay.querySelectorAll('[data-reserved]:checked')]
            .map(cb => cb.dataset.reserved);
        save({ mode, unlockStep: step, reserved });
        overlay.remove();
        showToast('Réglages d\'accès enregistrés.', 'success');
    };
}

// --- Mode présentation (classe) ---------------------------------------------
//
// Pour projeter le parcours au tableau : la carte des mondes à gauche, et un
// aperçu PERMANENT de l'étape choisie à droite — cliquer sur un monde change
// l'exercice montré, sans quitter la vue d'ensemble.

function initPresentationMode() {
    const btn = document.getElementById('btn-presentation');
    if (!btn) return;
    btn.onclick = async () => {
        if (!state.currentPath.steps.length) {
            showAlert('Ajoutez au moins une activité pour lancer la présentation.');
            return;
        }
        const [{ buildWorldMap }, { hydratePath }] = await Promise.all([
            import('./pathView.js'), import('../core/path.js')
        ]);
        const { steps } = hydratePath(state.currentPath);
        openPresentation(steps, buildWorldMap);
    };
}

function openPresentation(steps, buildWorldMap) {
    let overlay = document.getElementById('presentation-modal');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'presentation-modal';
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    overlay.innerHTML = `
        <div class="glass-panel modal-panel-lg" style="width: 94vw; max-width: 1280px; height: 90vh; display: flex; flex-direction: column;">
            <div class="modal-header">
                <h3 class="modal-title">🗺️ ${escapeHtml(state.currentPath.name || 'Parcours')}</h3>
                <button class="modal-close-btn" id="btn-close-presentation" aria-label="Fermer">&times;</button>
            </div>
            <div class="presentation-body">
                <div class="presentation-map"></div>
                <div class="presentation-preview">
                    <div class="presentation-preview-title" id="presentation-title"></div>
                    <div class="presentation-preview-canvas" id="presentation-canvas"></div>
                </div>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    const canvas = overlay.querySelector('#presentation-canvas');
    const titre = overlay.querySelector('#presentation-title');

    const montrer = async (i) => {
        const step = steps[i];
        if (!step) return;
        titre.textContent = `${i + 1}. ${step.title}`;
        overlay.querySelectorAll('.world-node').forEach((n, j) =>
            n.classList.toggle('world-node--current', j === i));
        const { launchPreview } = await import('../games/engine.js');
        launchPreview(step.exercise, canvas, step.params);
    };

    const map = buildWorldMap(steps, {
        allUnlocked: true,
        onNodeClick: (i) => montrer(i)
    });
    overlay.querySelector('.presentation-map').appendChild(map);

    overlay.querySelector('#btn-close-presentation').onclick = async () => {
        const [{ clearEngines }, { destroyAllDemoCursors }] = await Promise.all([
            import('../core/timers.js'), import('../core/demoPointer.js')
        ]);
        clearEngines();
        destroyAllDemoCursors();
        overlay.remove();
    };

    montrer(0);
}

function handleDrop(e, pathBox) {
    e.preventDefault();
    pathBox.classList.remove('drag-over');

    const reorderIdx = e.dataTransfer.getData('text/reorder');
    const exerciseId = e.dataTransfer.getData('text/plain');
    const steps = state.currentPath.steps;

    if (reorderIdx !== '') {
        const from = parseInt(reorderIdx, 10);
        let to = steps.length;
        const rows = [...pathBox.querySelectorAll('.path-step')];
        for (let i = 0; i < rows.length; i++) {
            const rect = rows[i].getBoundingClientRect();
            if (e.clientY < rect.top + rect.height / 2) { to = i; break; }
        }
        if (from !== to) {
            const item = steps.splice(from, 1)[0];
            if (from < to) to--;
            steps.splice(to, 0, item);
            renderTeacherPath();
        }
        return;
    }

    if (exerciseId && getExerciseById(exerciseId)) {
        addStep(exerciseId);
    }
}

export function addStep(exerciseId) {
    const exo = getExerciseById(exerciseId);
    if (!exo) return;
    const step = makeStep(exerciseId, {}, { nbItems: 10, threshold: 7 });
    state.currentPath.steps.push(step);
    renderTeacherPath();
    selectStep(step.stepId);
}

// --- Rendu de la liste d'étapes ---------------------------------------------

export function renderTeacherPath() {
    const pathBox = document.getElementById('path-container');
    if (!pathBox) return;

    pathBox.querySelectorAll('.path-step').forEach(el => el.remove());

    const steps = state.currentPath.steps;
    const badge = document.getElementById('path-count-badge');
    if (badge) badge.textContent = steps.length;

    const emptyMsg = pathBox.querySelector('.empty-msg');
    if (emptyMsg) emptyMsg.style.display = steps.length === 0 ? 'block' : 'none';

    const policy = resolvePolicy(state.currentPath.policy);
    const summary = document.getElementById('path-summary');
    if (summary) {
        summary.textContent = steps.length
            ? `${steps.length} activité${steps.length > 1 ? 's' : ''} • ${totalItems(state.currentPath)} questions • ${describePolicy(policy)}`
            : '';
        summary.classList.toggle('path-summary--eval', isEvaluation(policy));
    }

    steps.forEach((step, index) => pathBox.appendChild(stepRow(step, index, policy)));
    autoSavePath();
}

function stepRow(step, index, policy) {
    const exo = getExerciseById(step.exerciseId);
    const row = document.createElement('div');
    row.className = 'path-step' + (step.stepId === selectedStepId ? ' path-step--selected' : '');
    row.draggable = true;
    row.dataset.stepId = step.stepId;

    row.ondragstart = (e) => { e.dataTransfer.setData('text/reorder', index); row.style.opacity = '0.5'; };
    row.ondragend = () => { row.style.opacity = '1'; };
    row.onclick = () => selectStep(step.stepId);

    if (!exo) {
        row.classList.add('path-step--broken');
        row.innerHTML = `<div class="path-step-title">${index + 1}. Exercice introuvable
            <code>${escapeHtml(step.exerciseId)}</code></div>`;
        const del = iconButton('Supprimer', ICONS.trash, 'danger');
        del.onclick = (e) => { e.stopPropagation(); removeStep(step.stepId); };
        row.appendChild(del);
        return row;
    }

    // Une SEULE ligne par étape : titre tronqué, règle en abrégé, actions.
    // Le détail complet reste lisible dans le panneau de propriétés — la
    // colonne du milieu, elle, doit montrer beaucoup d'étapes d'un coup d'œil.
    const head = document.createElement('div');
    head.className = 'path-step-head';

    const title = document.createElement('div');
    title.className = 'path-step-title';
    title.innerHTML = `<span class="path-step-grip" aria-hidden="true">☰</span>`
        + `<span class="path-step-name">${index + 1}. ${escapeHtml(exo.title)}</span>`;
    title.title = exo.title;
    head.appendChild(title);

    const seuil = step.threshold ?? step.nbItems;
    const details = [`${seuil}/${step.nbItems}`];
    if (step.timeLimit) details.push(`⏱ ${step.timeLimit}s`);
    if (policy.grading && step.weight > 1) details.push(`×${step.weight}`);

    const rule = document.createElement('span');
    rule.className = 'path-step-rule';
    rule.title = `${seuil} bonne${seuil > 1 ? 's' : ''} réponse${seuil > 1 ? 's' : ''} exigée${seuil > 1 ? 's' : ''} sur ${step.nbItems}`
        + (step.timeLimit ? ` • chronomètre ${step.timeLimit} s` : '')
        + (policy.grading && step.weight > 1 ? ` • poids ×${step.weight} dans la note` : '');
    rule.textContent = details.join(' • ');
    head.appendChild(rule);

    const actions = document.createElement('div');
    actions.className = 'path-step-actions';

    const preview = iconButton('Aperçu', ICONS.eye);
    preview.onclick = (e) => { e.stopPropagation(); testStep(index); };

    const props = iconButton('Propriétés', ICONS.gear);
    props.onclick = (e) => { e.stopPropagation(); selectStep(step.stepId); };

    const dup = iconButton('Dupliquer', ICONS.copy);
    dup.onclick = (e) => { e.stopPropagation(); duplicateStep(step.stepId); };

    const del = iconButton('Supprimer', ICONS.trash, 'danger');
    del.onclick = (e) => { e.stopPropagation(); removeStep(step.stepId); };

    [preview, props, dup, del].forEach(b => actions.appendChild(b));
    head.appendChild(actions);
    row.appendChild(head);

    return row;
}

// --- Sélection et propriétés ------------------------------------------------

export function selectStep(stepId) {
    const step = state.currentPath.steps.find(s => s.stepId === stepId);
    if (!step) return;
    selectedStepId = stepId;

    const panel = document.getElementById('builder-properties-panel');
    if (!panel) return;

    panel.innerHTML = `
        <button id="mob-close-props" class="props-close" aria-label="Fermer les propriétés">✕</button>
        <h3 class="props-title">Propriétés de l'étape</h3>
        <div id="builder-config-content"></div>`;
    panel.classList.add('mob-open');

    const close = document.getElementById('mob-close-props');
    if (close) close.onclick = () => panel.classList.remove('mob-open');

    renderGameConfigUI(step, (updated) => {
        const i = state.currentPath.steps.findIndex(s => s.stepId === stepId);
        if (i !== -1) {
            state.currentPath.steps[i] = updated;
            renderTeacherPath();
        }
    });

    document.querySelectorAll('.path-step').forEach(el => {
        el.classList.toggle('path-step--selected', el.dataset.stepId === stepId);
    });
}

export function removeStep(stepId) {
    state.currentPath.steps = state.currentPath.steps.filter(s => s.stepId !== stepId);
    if (selectedStepId === stepId) selectedStepId = null;
    renderTeacherPath();
}

export function duplicateStep(stepId) {
    const steps = state.currentPath.steps;
    const i = steps.findIndex(s => s.stepId === stepId);
    if (i === -1) return;
    const clone = { ...steps[i], stepId: makeStep(steps[i].exerciseId).stepId, overrides: { ...steps[i].overrides } };
    steps.splice(i + 1, 0, clone);
    renderTeacherPath();
}

// --- Politique du parcours --------------------------------------------------

function initPolicyPanel() {
    const btn = document.getElementById('btn-path-policy');
    const modal = document.getElementById('path-policy-modal');
    if (!btn || !modal) return;

    btn.onclick = () => {
        renderPolicyEditor(state.currentPath, (policy) => {
            state.currentPath.policy = policy;
            renderTeacherPath();
        });
        modal.style.display = 'flex';
    };
    const close = document.getElementById('btn-close-path-policy');
    if (close) close.onclick = () => { modal.style.display = 'none'; };
}

// --- Barre d'outils ---------------------------------------------------------

function initNameInput() {
    const input = document.getElementById('path-name-input');
    if (!input) return;
    input.onclick = (e) => e.stopPropagation();
    input.oninput = () => {
        state.currentPath.name = input.value.trim() || 'Mon Parcours';
        autoSavePath();
    };
}

function initPreviewModes() {
    state.previewDeviceMode = 'mobile';
    document.querySelectorAll('.preview-mode-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.preview-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.previewDeviceMode = btn.id.replace('preview-mode-', '');
        };
    });

    const toggleHeader = document.getElementById('path-header-toggle');
    const wrapper = document.getElementById('path-collapsible-wrapper');
    const icon = document.getElementById('path-toggle-icon');
    if (toggleHeader && wrapper && icon) {
        toggleHeader.addEventListener('click', () => {
            if (!document.body.classList.contains('mobile-view')) return;
            const hidden = wrapper.style.display === 'none';
            wrapper.style.display = hidden ? 'block' : 'none';
            icon.style.transform = hidden ? 'rotate(180deg)' : 'rotate(0deg)';
        });
    }
}

function previewMode() {
    if (document.body.classList.contains('mobile-view')) return 'none';
    return state.previewDeviceMode === 'desktop' ? 'none' : state.previewDeviceMode;
}

async function runPath(path, deviceMode, startIndex = 0) {
    const { Runner } = await import('../core/runner.js');
    new Runner({
        path,
        deviceMode,
        startIndex,
        // Le professeur teste son parcours : il doit pouvoir circuler entre les
        // activités sans avoir à les réussir une par une.
        allowStepNavigation: true
    }).start();
}

// L'aperçu d'une étape ouvre le parcours complet positionné sur celle-ci,
// plutôt qu'un parcours réduit : le professeur peut ainsi enchaîner sur les
// activités voisines pour vérifier la progression.
function testStep(index) {
    if (!state.currentPath.steps[index]) return;
    runPath(state.currentPath, previewMode(), index);
}

function initToolbar() {
    const btnTest = document.getElementById('btn-test-sequence');
    if (btnTest) {
        btnTest.onclick = () => {
            if (!state.currentPath.steps.length) {
                showAlert('Ajoutez au moins une activité pour tester le parcours.');
                return;
            }
            runPath(state.currentPath, previewMode());
        };
    }

    const btnCode = document.getElementById('btn-generate-code');
    if (btnCode) {
        btnCode.onclick = async () => {
            if (!state.currentPath.steps.length) {
                showAlert('Ajoutez au moins une activité pour générer un code.');
                return;
            }
            const code = Shortcodes.encodePath(state.currentPath);
            try {
                await navigator.clipboard.writeText(Shortcodes.shareUrl(state.currentPath));
                showToast('Lien copié dans le presse-papier !', 'success');
            } catch (e) {
                showAlert(`Code du parcours :\n\n${code}`);
            }
        };
    }

    const btnNew = document.getElementById('btn-new-path');
    if (btnNew) {
        btnNew.onclick = () => {
            state.currentPath = { id: null, version: 2, name: 'Nouveau parcours', policy: resolvePolicy(null), steps: [] };
            state.currentPathId = null;
            selectedStepId = null;
            const input = document.getElementById('path-name-input');
            if (input) input.value = state.currentPath.name;
            renderTeacherPath();
        };
    }
}

export function autoSavePath() {
    if (!state.currentPath.steps.length && !state.currentPathId) return;
    const snapshot = JSON.parse(JSON.stringify(state.currentPath));
    if (!state.currentPathId) {
        const saved = state.saveTeacherPath(state.currentPath.name, snapshot);
        state.currentPathId = saved.id;
    } else {
        state.updateTeacherPath(state.currentPathId, state.currentPath.name, snapshot);
    }
}

// --- Navigateur de parcours -------------------------------------------------

function initPathBrowser() {
    const btnOpen = document.getElementById('btn-open-path-browser');
    const modal = document.getElementById('path-browser-modal');
    if (btnOpen && modal) {
        btnOpen.onclick = () => { renderPathBrowser(); modal.style.display = 'flex'; };
        const close = document.getElementById('btn-close-path-browser');
        if (close) close.onclick = () => { modal.style.display = 'none'; };
    }

    const btnFolder = document.getElementById('btn-new-folder');
    if (btnFolder) {
        btnFolder.onclick = () => { state.addTeacherFolder('Nouveau dossier'); renderPathBrowser(); };
    }
}

export function renderPathBrowser() {
    const list = document.getElementById('path-browser-list');
    if (!list) return;
    list.innerHTML = '';

    (state.teacherFolders || []).forEach(folder => {
        list.appendChild(folderBlock(folder));
    });

    const rootPaths = state.teacherPaths.filter(p => !p.folderId || p.folderId === 'root');
    const rootBlock = document.createElement('div');
    rootBlock.className = 'path-browser-root';
    rootBlock.ondragover = dragOver;
    rootBlock.ondragleave = dragLeave;
    rootBlock.ondrop = (e) => dropOnFolder(e, 'root');
    rootBlock.innerHTML = '<div class="path-browser-root-title">Parcours (racine)</div>';
    rootPaths.forEach(p => rootBlock.appendChild(pathItem(p)));
    list.appendChild(rootBlock);

    if (!state.teacherPaths.length && !(state.teacherFolders || []).length) {
        list.innerHTML = '<div class="empty-state-msg">Aucun parcours enregistré.</div>';
    }
}

function folderBlock(folder) {
    const box = document.createElement('div');
    box.className = 'path-folder';
    box.ondragover = dragOver;
    box.ondragleave = dragLeave;
    box.ondrop = (e) => dropOnFolder(e, folder.id);

    const head = document.createElement('div');
    head.className = 'path-folder-head';

    const name = document.createElement('div');
    name.className = 'path-folder-name';
    name.contentEditable = 'true';
    name.textContent = folder.name;
    name.onblur = () => state.renameTeacherFolder(folder.id, name.textContent.trim());
    name.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); name.blur(); } };

    const del = iconButton('Supprimer le dossier', ICONS.trash, 'danger');
    del.onclick = () => window.appConfirm('Suppression', 'Supprimer ce dossier ? Les parcours reviennent à la racine.', () => {
        state.removeTeacherFolder(folder.id);
        renderPathBrowser();
    });

    head.append(name, del);
    box.appendChild(head);

    const inner = document.createElement('div');
    inner.className = 'path-folder-body';
    const paths = state.teacherPaths.filter(p => p.folderId === folder.id);
    if (!paths.length) inner.innerHTML = '<div class="path-folder-empty">Dossier vide (glissez des parcours ici)</div>';
    paths.forEach(p => inner.appendChild(pathItem(p)));
    box.appendChild(inner);
    return box;
}

function pathItem(p) {
    const normalized = normalizePath(p.data, p.name);
    const policy = resolvePolicy(normalized.policy);
    const row = document.createElement('div');
    row.className = 'path-browser-item';
    row.draggable = true;
    row.ondragstart = (e) => { e.dataTransfer.setData('text/plain', p.id); row.style.opacity = '0.5'; };
    row.ondragend = () => { row.style.opacity = '1'; };

    const info = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'path-browser-name';
    name.contentEditable = 'true';
    name.textContent = p.name;
    name.onblur = () => state.updateTeacherPath(p.id, name.textContent.trim(), null);
    name.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); name.blur(); } };

    const sub = document.createElement('div');
    sub.className = 'path-browser-sub';
    sub.textContent = `${normalized.steps.length} activités • ${isEvaluation(policy) ? 'Évaluation' : 'Entraînement'} • ${new Date(p.timestamp).toLocaleDateString()}`;

    info.append(name, sub);

    const actions = document.createElement('div');
    actions.className = 'path-browser-actions';

    const share = iconButton('Partager', ICONS.share, 'primary');
    share.onclick = async () => {
        try {
            await navigator.clipboard.writeText(Shortcodes.shareUrl(normalized));
            showToast('Lien de partage copié !', 'success');
        } catch (e) {
            showAlert(`Code : ${Shortcodes.encodePath(normalized)}`);
        }
    };

    const load = document.createElement('button');
    load.className = 'btn-toggle glass-btn primary btn-toggle--sm';
    load.textContent = 'Charger';
    load.onclick = () => {
        state.currentPathId = p.id;
        state.currentPath = normalizePath(p.data, p.name);
        selectedStepId = null;
        const input = document.getElementById('path-name-input');
        if (input) input.value = state.currentPath.name;
        renderTeacherPath();
        document.getElementById('path-browser-modal').style.display = 'none';
    };

    const del = iconButton('Supprimer', ICONS.trash, 'danger');
    del.onclick = () => window.appConfirm('Suppression', 'Supprimer ce parcours définitivement ?', () => {
        state.removeTeacherPath(p.id);
        renderPathBrowser();
    });

    actions.append(share, load, del);
    row.append(info, actions);
    return row;
}

function dragOver(e) { e.preventDefault(); e.currentTarget.classList.add('drop-target'); }
function dragLeave(e) { e.currentTarget.classList.remove('drop-target'); }
function dropOnFolder(e, folderId) {
    e.preventDefault();
    e.currentTarget.classList.remove('drop-target');
    const pathId = e.dataTransfer.getData('text/plain');
    if (pathId && state.teacherPaths.some(p => p.id === pathId)) {
        state.moveTeacherPath(pathId, folderId);
        renderPathBrowser();
    }
}

// --- Utilitaires ------------------------------------------------------------

const ICONS = {
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>'
};

function iconButton(title, paths, variant) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-icon' + (variant ? ` btn-icon--${variant}` : '');
    btn.title = title;
    btn.setAttribute('aria-label', title);
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
    return btn;
}

function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
