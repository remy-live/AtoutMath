import { exercices } from '../data/catalog.js';
import { state } from '../core/state.js';
import { Shortcodes } from '../core/shortcodes.js';

export function initBuilder() {
    const pathBox = document.getElementById('path-container');
    
    pathBox.ondragover = (e) => { 
        e.preventDefault(); 
        pathBox.classList.add('drag-over'); 
    };
    
    pathBox.ondragleave = () => {
        pathBox.classList.remove('drag-over');
    };
    
    pathBox.ondrop = (e) => {
        e.preventDefault(); 
        pathBox.classList.remove('drag-over');
        
        const id = e.dataTransfer.getData('text/plain');
        const reorderIdx = e.dataTransfer.getData('text/reorder');
        
        if (reorderIdx !== "") {
            const fromIdx = parseInt(reorderIdx, 10);
            let toIdx = state.currentPath.length;
            const steps = Array.from(pathBox.querySelectorAll('.path-step'));
            for (let i = 0; i < steps.length; i++) {
                const rect = steps[i].getBoundingClientRect();
                if (e.clientY < rect.top + rect.height / 2) {
                    toIdx = i;
                    break;
                }
            }
            
            if (fromIdx !== toIdx) {
                const item = state.currentPath.splice(fromIdx, 1)[0];
                if (fromIdx < toIdx) toIdx--;
                state.currentPath.splice(toIdx, 0, item);
                renderTeacherPath();
            }
        } else if (id) {
            const exo = exercices.find(ex => ex.id === id);
            if (exo) { 
                const stepObj = { 
                    ...exo, 
                    stepId: Date.now() + Math.random().toString(),
                    currentParams: exo.defaultParams ? JSON.parse(JSON.stringify(exo.defaultParams)) : null
                };
                state.currentPath.push(stepObj); 
                renderTeacherPath(); 
            }
        }
    };
    
    window.removeStep = removeStep;
    window.selectStep = selectStep;

    // Collapsible path logic on mobile
    const toggleHeader = document.getElementById('path-header-toggle');
    const toggleIcon = document.getElementById('path-toggle-icon');
    const collapsWrapper = document.getElementById('path-collapsible-wrapper');
    
    if (toggleHeader && collapsWrapper && toggleIcon) {
        toggleHeader.addEventListener('click', () => {
            if (document.body.classList.contains('mobile-view')) {
                if (collapsWrapper.style.display === 'none') {
                    collapsWrapper.style.display = 'block';
                    toggleIcon.style.transform = 'rotate(180deg)';
                } else {
                    collapsWrapper.style.display = 'none';
                    toggleIcon.style.transform = 'rotate(0deg)';
                }
            }
        });
    }

    // --- Preview Triple Switch Logic ---
    state.previewDeviceMode = 'mobile'; // Default
    const btnTest = document.getElementById('btn-test-sequence');
    const previewBtns = document.querySelectorAll('.preview-mode-btn');

    previewBtns.forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            // Update active state
            previewBtns.forEach(b => {
                b.classList.remove('active');
                b.style.background = 'transparent';
                b.style.color = 'var(--text-muted)';
            });
            btn.classList.add('active');
            btn.style.background = 'var(--primary)';
            btn.style.color = 'white';
            
            // Set mode
            state.previewDeviceMode = btn.id.replace('preview-mode-', '');
            // 'desktop' translates to 'none' for launchTest
        };
    });

    const launchTest = (mode) => {
        if (state.currentPath.length === 0) {
            alert("Ajoutez au moins une activité à votre parcours pour pouvoir le tester.");
            return;
        }
        import('../core/sequenceRunner.js').then(module => {
            if (document.body.classList.contains('mobile-view')) mode = 'none';
            const runner = new module.SequenceRunner(state.currentPath, mode);
            runner.start();
        });
    };

    window.launchSingleTest = (index) => {
        if (index < 0 || index >= state.currentPath.length) return;
        import('../core/sequenceRunner.js').then(module => {
            let m = state.previewDeviceMode === 'desktop' ? 'none' : state.previewDeviceMode;
            if (document.body.classList.contains('mobile-view')) m = 'none';
            const runner = new module.SequenceRunner([state.currentPath[index]], m);
            runner.start();
        });
    };

    if (btnTest) {
        btnTest.onclick = () => {
            const m = state.previewDeviceMode === 'desktop' ? 'none' : state.previewDeviceMode;
            launchTest(m);
        };
    }

    const btnCode = document.getElementById('btn-generate-code');
    if (btnCode) {
        btnCode.onclick = () => {
            if (state.currentPath.length === 0) {
                alert("Ajoutez au moins une activité pour générer un code.");
                return;
            }
            const code = Shortcodes.encodeSequence(state.currentPath);
            btnCode.textContent = code;
            btnCode.style.background = "#0f172a";
            btnCode.style.transform = "scale(1.1)";
            setTimeout(() => {
                btnCode.textContent = "🔗 Code Élève";
                btnCode.style.background = "var(--success)";
                btnCode.style.transform = "scale(1)";
            }, 5000);
        };
    }

    state.currentPathId = null;
    const pathNameInput = document.getElementById('path-name-input');
    
    window.autoSavePath = () => {
        if (!pathNameInput) return;
        const name = pathNameInput.value.trim() || 'Mon Parcours';
        if (!state.currentPathId) {
            if (state.currentPath.length > 0) {
                const newPath = state.saveTeacherPath(name, JSON.parse(JSON.stringify(state.currentPath)));
                state.currentPathId = newPath.id;
            }
        } else {
            state.updateTeacherPath(state.currentPathId, name, JSON.parse(JSON.stringify(state.currentPath)));
        }
    };

    if (pathNameInput) {
        pathNameInput.onclick = (e) => e.stopPropagation();
        pathNameInput.oninput = window.autoSavePath;
    }

    const btnNewPath = document.getElementById('btn-new-path');
    if (btnNewPath) {
        btnNewPath.onclick = () => {
            state.currentPath = [];
            state.currentPathId = null;
            if (pathNameInput) pathNameInput.value = 'Nouveau Parcours';
            renderTeacherPath();
        };
    }

    const btnOpenBrowser = document.getElementById('btn-open-path-browser');
    const modalBrowser = document.getElementById('path-browser-modal');
    if (btnOpenBrowser && modalBrowser) {
        btnOpenBrowser.onclick = () => {
            renderPathBrowser();
            modalBrowser.style.display = 'flex';
        };
        document.getElementById('btn-close-path-browser').onclick = () => {
            modalBrowser.style.display = 'none';
        };
    }
}

export function renderTeacherPath() {
    const pathBox = document.getElementById('path-container');
    const oldSteps = pathBox.querySelectorAll('.path-step'); 
    oldSteps.forEach(s => s.remove());
    
    const badge = document.getElementById('path-count-badge');
    if (badge) badge.textContent = state.currentPath.length;
    
    const msg = pathBox.querySelector('.empty-msg');
    if(state.currentPath.length === 0) { msg.style.display = 'block'; return; }
    msg.style.display = 'none';

    state.currentPath.forEach((step, index) => {
        const row = document.createElement('div'); 
        row.className = 'path-step';
        row.draggable = true;
        
        row.ondragstart = (e) => {
            e.dataTransfer.setData('text/reorder', index);
            row.style.opacity = '0.5';
        };
        row.ondragend = () => {
            row.style.opacity = '1';
        };

        row.onclick = () => selectStep(step.stepId);
        row.style.cursor = 'pointer';

        row.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap: nowrap; width: 100%;">
                <div style="font-weight:bold; font-size:1.1rem; color:var(--text-main); display:flex; gap:10px; align-items:center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    <span style="color:var(--text-muted); cursor:grab;">☰</span> ${index + 1}. ${step.title} 
                    <span style="font-size:0.8rem; background:var(--bg-app); padding:2px 6px; border-radius:4px; border:1px solid var(--border); color:var(--primary); font-family:monospace;">${Shortcodes.encodeSequence([step])}</span>
                </div>
                <div style="display:flex; gap:10px; flex-shrink: 0;">
                    <button class="btn-icon" onclick="event.stopPropagation(); window.launchSingleTest(${index})" title="Aperçu">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button class="btn-icon" onclick="event.stopPropagation(); selectStep('${step.stepId}')" title="Propriétés">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    </button>
                    <button class="btn-icon" onclick="event.stopPropagation(); removeStep('${step.stepId}')" style="color:var(--danger);" title="Supprimer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    </button>
                </div>
            </div>
        `;
        pathBox.appendChild(row);
    });
    
    if (window.autoSavePath) window.autoSavePath();
}

export function removeStep(stepId) { 
    const idx = state.currentPath.findIndex(s => s.stepId === stepId);
    if (idx !== -1) {
        state.currentPath.splice(idx, 1); 
        renderTeacherPath(); 
    }
}

export function selectStep(stepId) {
    const step = state.currentPath.find(s => s.stepId === stepId);
    if (!step) return;

    const panel = document.getElementById('builder-properties-panel');
    if (!panel) return;

    panel.innerHTML = `
        <button id="mob-close-props" style="display:none; position:absolute; top:15px; right:15px; background:var(--bg-app); border:1px solid var(--border); border-radius:50%; width:36px; height:36px; justify-content:center; align-items:center; z-index:100; cursor:pointer;" onclick="document.getElementById('builder-properties-panel').classList.remove('mob-open')">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
            <svg style="color:var(--primary);" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <h3 style="margin: 0; color: var(--text-main); font-size:1.2rem;">Propriétés</h3>
        </div>
        <div id="builder-config-content"></div>
    `;

    panel.classList.add('mob-open');
    if (document.body.classList.contains('mobile-view')) {
        const closeBtn = document.getElementById('mob-close-props');
        if(closeBtn) closeBtn.style.display = 'flex';
    }

    const contentBox = document.getElementById('builder-config-content');

    if(window.showGameConfigUI) {
        window.showGameConfigUI(step, (newParams) => {
            step.currentParams = newParams;
        });
    }
}

    const btnNewFolder = document.getElementById('btn-new-folder');
    if (btnNewFolder && !btnNewFolder.onclick) {
        btnNewFolder.onclick = () => {
            state.addTeacherFolder("Nouveau Dossier");
            renderPathBrowser();
        };
    }

    window.renameFolder = (id, el) => {
        state.renameTeacherFolder(id, el.textContent.trim());
    };
    window.renamePath = (id, el) => {
        state.updateTeacherPath(id, el.textContent.trim(), null);
    };

export function renderPathBrowser() {
    const listContainer = document.getElementById('path-browser-list');
    if (!listContainer) return;
    
    window.loadTeacherPath = (id) => {
        const p = state.teacherPaths.find(x => x.id === id);
        if (p) {
            state.currentPathId = p.id;
            state.currentPath = JSON.parse(JSON.stringify(p.data));
            const pathNameInput = document.getElementById('path-name-input');
            if (pathNameInput) pathNameInput.value = p.name || 'Mon Parcours';
            renderTeacherPath();
            document.getElementById('path-browser-modal').style.display = 'none';
        }
    };

    window.deleteTeacherPath = (id) => {
        window.appConfirm("Suppression", "Supprimer ce parcours définitivement ?", () => {
            state.removeTeacherPath(id);
            renderPathBrowser();
        });
    };

    window.deleteTeacherFolder = (id) => {
        window.appConfirm("Suppression de dossier", "Supprimer ce dossier (les parcours seront déplacés à la racine) ?", () => {
            state.removeTeacherFolder(id);
            renderPathBrowser();
        });
    };

    window.dragPathStart = (e, id) => {
        e.dataTransfer.setData('text/plain', id);
        e.target.style.opacity = '0.5';
    };
    window.dragPathEnd = (e) => {
        e.target.style.opacity = '1';
        renderPathBrowser(); // Re-render to clear any hover effects
    };
    window.dragFolderOver = (e) => {
        e.preventDefault();
        e.currentTarget.style.border = '2px dashed var(--primary)';
    };
    window.dragFolderLeave = (e) => {
        e.currentTarget.style.border = '1px solid var(--border)';
    };
    window.dropOnFolder = (e, folderId) => {
        e.preventDefault();
        e.currentTarget.style.border = '1px solid var(--border)';
        const pathId = e.dataTransfer.getData('text/plain');
        if (pathId) {
            state.moveTeacherPath(pathId, folderId);
            renderPathBrowser();
        }
    };

    let html = '';

    // Render Folders
    if (state.teacherFolders) {
        state.teacherFolders.forEach(f => {
            const folderPaths = state.teacherPaths.filter(p => p.folderId === f.id);
            html += `
            <div style="background:var(--bg-panel); border:1px solid var(--border); border-radius:12px; padding:15px; margin-bottom:10px; transition:border 0.2s;"
                 ondragover="window.dragFolderOver(event)" ondragleave="window.dragFolderLeave(event)" ondrop="window.dropOnFolder(event, '${f.id}')">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <svg style="color:var(--primary);" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                        <div contenteditable="true" onblur="window.renameFolder('${f.id}', this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}" style="font-weight:bold; color:var(--text-main); font-size:1.2rem; outline:none; border-bottom:1px dashed var(--border);">${f.name}</div>
                    </div>
                    <button class="btn-icon" style="color:var(--danger);" onclick="window.deleteTeacherFolder('${f.id}')" title="Supprimer Dossier">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    </button>
                </div>
                <div style="display:flex; flex-direction:column; gap:10px; padding-left:20px; min-height:20px;">
            `;
            if (folderPaths.length === 0) {
                html += `<div style="color:var(--text-muted); font-size:0.9rem; font-style:italic;">Dossier vide (glissez des parcours ici)</div>`;
            }
            folderPaths.forEach(p => html += renderPathItem(p));
            html += `</div></div>`;
        });
    }

    // Render Root Paths
    const rootPaths = state.teacherPaths.filter(p => !p.folderId || p.folderId === 'root');
    if (rootPaths.length > 0 || (state.teacherFolders && state.teacherFolders.length > 0)) {
        html += `
        <div style="padding:15px; margin-bottom:10px; border:1px solid transparent; transition:border 0.2s; border-radius:12px;"
             ondragover="window.dragFolderOver(event)" ondragleave="window.dragFolderLeave(event)" ondrop="window.dropOnFolder(event, 'root')">
            <div style="font-weight:bold; color:var(--text-main); font-size:1.1rem; margin-bottom:10px;">Parcours (Racine)</div>
            <div style="display:flex; flex-direction:column; gap:10px;">
        `;
        rootPaths.forEach(p => html += renderPathItem(p));
        html += `</div></div>`;
    }

    if (state.teacherPaths.length === 0 && (!state.teacherFolders || state.teacherFolders.length === 0)) {
        html = '<div style="color:var(--text-muted); text-align:center;">Aucun parcours ni dossier sauvegardé.</div>';
    }

    listContainer.innerHTML = html;
}

function renderPathItem(p) {
    const date = new Date(p.timestamp).toLocaleDateString();
    return `
    <div draggable="true" ondragstart="window.dragPathStart(event, '${p.id}')" ondragend="window.dragPathEnd(event)"
         style="background:var(--bg-app); border:1px solid var(--border); border-radius:8px; padding:12px; display:flex; justify-content:space-between; align-items:center; cursor:grab;">
        <div>
            <div contenteditable="true" onblur="window.renamePath('${p.id}', this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}" style="font-weight:bold; color:var(--text-main); font-size:1rem; outline:none; border-bottom:1px dashed var(--border); display:inline-block;">${p.name}</div>
            <div style="color:var(--text-muted); font-size:0.85rem;">${p.data.length} activités • Modifié le ${date}</div>
        </div>
        <div style="display:flex; gap:10px;">
            <button class="btn-icon" style="color:var(--primary); padding:4px;" onclick="window.shareTeacherPath('${p.id}')" title="Partager">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            </button>
            <button class="btn-toggle glass-btn primary" style="padding:4px 8px; font-size:0.85rem;" onclick="window.loadTeacherPath('${p.id}')">Charger</button>
            <button class="btn-icon" style="color:var(--danger); padding:4px;" onclick="window.deleteTeacherPath('${p.id}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
            </button>
        </div>
    </div>
    `;
}

window.shareTeacherPath = (id) => {
    const p = state.teacherPaths.find(x => x.id === id);
    if (!p) return;
    const shortcode = Shortcodes.encodeSequence(p.data);
    const link = window.location.origin + window.location.pathname + "?code=" + shortcode;
    
    // Copy to clipboard
    navigator.clipboard.writeText(link).then(() => {
        alert("Lien de partage copié dans le presse-papier !\\n\\nCode : " + shortcode);
    }).catch(() => {
        alert("Voici votre lien de partage :\\n" + link);
    });
};
