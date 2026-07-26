import { state } from './state.js';

export function initImportExport() {
    const modal = document.getElementById('import-export-modal');
    const btnClose = document.getElementById('btn-close-import-export');
    const btnStudentOpen = document.getElementById('btn-open-import-export-student');
    const btnTeacherOpen = document.getElementById('btn-open-import-export-teacher');
    
    const btnExport = document.getElementById('btn-export-data');
    const inputImport = document.getElementById('input-import-data');

    const openModal = () => {
        if(modal) modal.style.display = 'flex';
    };

    if (btnStudentOpen) btnStudentOpen.onclick = openModal;
    if (btnTeacherOpen) btnTeacherOpen.onclick = openModal;
    if (btnClose) btnClose.onclick = () => modal.style.display = 'none';

    if (btnExport) {
        btnExport.onclick = () => {
            let data = {};
            let filename = 'atoutmath_data.json';
            
            if (state.isTeacherMode) {
                // Export teacher paths
                data = {
                    type: 'teacher_paths',
                    version: 1,
                    teacherPaths: state.teacherPaths
                };
                filename = 'mes_parcours_atoutmath.json';
            } else {
                // Export student progress
                data = {
                    type: 'student_progress',
                    version: 1,
                    score: state.score,
                    errorHistory: state.errorHistory,
                    timestamp: Date.now()
                };
                filename = 'ma_progression_atoutmath.json';
            }

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };
    }

    if (inputImport) {
        inputImport.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    
                    if (state.isTeacherMode) {
                        if (data.type === 'teacher_paths') {
                            // Merge paths
                            data.teacherPaths.forEach(importedPath => {
                                // check if exists
                                const exists = state.teacherPaths.find(p => p.id === importedPath.id);
                                if (!exists) {
                                    state.teacherPaths.push(importedPath);
                                }
                            });
                            state.saveTeacherPaths();
                            if(window.renderPathBrowser) window.renderPathBrowser();
                            import('../ui/modal.js').then(m => m.showToast("Parcours importés avec succès !", "success"));
                        } else if (data.type === 'student_progress') {
                            // Teacher importing student data: show analysis dashboard
                            modal.style.display = 'none';
                            showStudentAnalysis(data);
                        } else {
                            import('../ui/modal.js').then(m => m.showAlert("Format de fichier non reconnu pour le mode Professeur."));
                        }
                    } else {
                        // Student mode
                        if (data.type === 'student_progress') {
                            import('../ui/modal.js').then(m => m.showConfirm("Attention, cela va écraser ta progression actuelle. Continuer ?", () => {
                                state.score = data.score || 0;
                                state.errorHistory = data.errorHistory || [];
                                state.addScore(0); // refresh ui
                                state.saveErrors();
                                import('../ui/modal.js').then(m => m.showToast("Progression restaurée !", "success"));
                            }));
                        } else {
                            import('../ui/modal.js').then(m => m.showAlert("Ce fichier ne contient pas de progression élève."));
                        }
                    }
                } catch(err) {
                    console.error(err);
                    import('../ui/modal.js').then(m => m.showAlert("Erreur lors de la lecture du fichier JSON."));
                }
                // Reset input
                inputImport.value = '';
                modal.style.display = 'none';
            };
            reader.readAsText(file);
        };
    }
}

function showStudentAnalysis(studentData) {
    const modal = document.getElementById('student-analysis-modal');
    const content = document.getElementById('student-analysis-content');
    if (!modal || !content) return;

    const date = new Date(studentData.timestamp).toLocaleString();
    const score = studentData.score || 0;
    const errors = studentData.errorHistory || [];
    const uncorrected = errors.filter(e => !e.corrected).length;

    let groupByExo = false;

    const renderErrors = () => {
        let errorHtml = '';
        if (errors.length === 0) {
            errorHtml = '<div style="color:var(--text-muted);">Aucune erreur enregistrée.</div>';
        } else {
            if (groupByExo) {
                // Group by exoTitle
                const grouped = {};
                errors.forEach(err => {
                    if (!grouped[err.exoTitle]) grouped[err.exoTitle] = [];
                    grouped[err.exoTitle].push(err);
                });
                
                errorHtml = '<div style="display:flex; flex-direction:column; gap:15px;">';
                for (const [title, exoErrors] of Object.entries(grouped)) {
                    errorHtml += `
                        <div style="background:var(--bg-hover); border:1px solid var(--border); border-radius:12px; padding:15px;">
                            <h5 style="margin:0 0 10px 0; color:var(--primary); border-bottom:1px solid var(--border); padding-bottom:5px;">${title} <span style="color:var(--text-muted); font-size:0.85rem; font-weight:normal;">(${exoErrors.length} erreurs)</span></h5>
                            <div style="display:flex; flex-direction:column; gap:8px;">
                    `;
                    exoErrors.forEach(err => {
                        const isCor = err.corrected;
                        let detail = '';
                        if (err.questionData && err.questionData.isStandardized) {
                            detail = `A répondu: <b>${err.questionData.input}</b> (Attendu: ${err.questionData.expected})`;
                        } else if(err.userAnswer !== undefined) {
                            detail = `A répondu: <b>${err.userAnswer}</b>`;
                            if(err.questionData && err.questionData.target) {
                                detail += ` (Attendu: ${err.questionData.target})`;
                            }
                        }
                        errorHtml += `
                            <div style="background:var(--bg-panel); border:1px solid var(--border); border-radius:8px; padding:8px; display:flex; justify-content:space-between; align-items:center; opacity:${isCor ? '0.6' : '1'};">
                                <div style="color:var(--text-main); font-size:0.85rem;">${detail} ${isCor ? '<span style="color:var(--success); font-size:0.75rem; border:1px solid var(--success); padding:2px 4px; border-radius:4px; margin-left:10px;">Corrigé</span>' : ''}</div>
                            </div>
                        `;
                    });
                    errorHtml += `</div></div>`;
                }
                errorHtml += '</div>';
            } else {
                // Flat chronological list
                errorHtml = '<div style="display:flex; flex-direction:column; gap:10px;">';
                errors.forEach(err => {
                    const isCor = err.corrected;
                        let detail = '';
                        if (err.questionData && err.questionData.isStandardized) {
                            detail = `A répondu: <b>${err.questionData.input}</b> (Attendu: ${err.questionData.expected})`;
                        } else if(err.userAnswer !== undefined) {
                            detail = `A répondu: <b>${err.userAnswer}</b>`;
                            if(err.questionData && err.questionData.target) {
                                detail += ` (Attendu: ${err.questionData.target})`;
                            }
                        }
                    errorHtml += `
                    <div style="background:var(--bg-panel); border:1px solid var(--border); border-radius:8px; padding:10px; display:flex; justify-content:space-between; align-items:center; opacity:${isCor ? '0.6' : '1'};">
                        <div>
                            <div style="font-weight:bold; color:var(--primary); font-size:0.95rem;">${err.exoTitle} ${isCor ? '<span style="color:var(--success); font-size:0.8rem; border:1px solid var(--success); padding:2px 6px; border-radius:4px; margin-left:10px;">Corrigé</span>' : ''}</div>
                            <div style="color:var(--text-main); font-size:0.85rem;">${detail}</div>
                        </div>
                    </div>`;
                });
                errorHtml += '</div>';
            }
        }
        
        const errListContainer = document.getElementById('student-analysis-err-list');
        if (errListContainer) errListContainer.innerHTML = errorHtml;
    };

    content.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:15px; margin-bottom:20px;">
            <div style="background:var(--bg-app); border:1px solid var(--border); padding:15px; border-radius:12px; text-align:center;">
                <div style="color:var(--text-muted); font-size:0.9rem;">Date de l'export</div>
                <div style="font-weight:bold; color:var(--text-main);">${date}</div>
            </div>
            <div style="background:var(--bg-app); border:1px solid var(--border); padding:15px; border-radius:12px; text-align:center;">
                <div style="color:var(--text-muted); font-size:0.9rem;">Score total</div>
                <div style="font-weight:bold; color:var(--primary); font-size:1.2rem; display:flex; align-items:center; justify-content:center; gap:5px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--warning);">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    ${score}
                </div>
            </div>
            <div style="background:var(--bg-app); border:1px solid var(--border); padding:15px; border-radius:12px; text-align:center;">
                <div style="color:var(--text-muted); font-size:0.9rem;">Erreurs non corrigées</div>
                <div style="font-weight:bold; color:var(--danger); font-size:1.2rem;">${uncorrected}</div>
            </div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <h4 style="margin:0; color:var(--text-main);">Historique détaillé</h4>
            <label style="display:flex; align-items:center; gap:8px; font-size:0.9rem; color:var(--text-muted); cursor:pointer;">
                <input type="checkbox" id="toggle-group-exo">
                Grouper par exercice
            </label>
        </div>
        <div id="student-analysis-err-list" style="max-height:400px; overflow-y:auto; padding-right:10px;">
        </div>
    `;

    renderErrors();
    document.getElementById('toggle-group-exo').onchange = (e) => {
        groupByExo = e.target.checked;
        renderErrors();
    };

    modal.style.display = 'flex';
    document.getElementById('btn-close-student-analysis').onclick = () => modal.style.display = 'none';
}
