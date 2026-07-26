import { state } from '../core/state.js';
import { exercices } from '../data/catalog.js';
import { setTopNavMode } from './navigation.js';
import { badgesCatalog } from '../core/gamification.js';

export function initProfileUI() {
    function updateErrorsView() {
// ... [keeping existing logic, wait I need to specify the replacement block correctly] ...
        const container = document.getElementById('error-log-container');
        const btnStart = document.getElementById('btn-start-revision');
        const toggleGroup = document.getElementById('profile-group-exo');
        
        if (!container) return;

        const errors = state.errorHistory;
        if (errors.length === 0) {
            container.innerHTML = `<div class="empty-state-msg">Bravo ! Tu n'as aucune erreur en attente de révision.</div>`;
            if (btnStart) btnStart.style.display = 'none';
            return;
        }

        const uncorrected = errors.filter(e => !e.corrected);
        if (btnStart) btnStart.style.display = uncorrected.length > 0 ? 'block' : 'none';

        const isGrouped = toggleGroup ? toggleGroup.checked : true;

        let html = '';
        
        const renderDetail = (err) => {
            if (err.questionData && err.questionData.isStandardized) {
                let text = `Pour <b>${err.questionData.questionText}</b>, tu as répondu <b>${err.questionData.input}</b> au lieu de <b>${err.questionData.expected}</b>.`;
                if (err.questionData.customMessage) text += ` ${err.questionData.customMessage}`;
                return text;
            }
            // Legacy fallback
            let detail = '';
            if (err.questionData.op === '+' || err.questionData.op === 'x' || err.questionData.op === '-') {
                const qd = err.questionData;
                detail = `Tu as répondu <b>${err.userAnswer}</b> au lieu de <b>${qd.target || qd.ans}</b> pour : <b>${qd.a || qd.t} ${qd.op} ${qd.b || qd.m}</b>`;
            } else if (err.questionData.op === 'x_missing') {
                const qd = err.questionData;
                detail = `Tu as répondu <b>${err.userAnswer}</b> au lieu de <b>${qd.missingFactor}</b> pour le facteur manquant de : <b>${qd.product}</b>`;
            } else if (err.questionData.tx) {
                detail = `Tu as cliqué sur <b>(${err.userAnswer.replace(',', ';')})</b> au lieu de la cible <b>(${err.questionData.tx};${err.questionData.ty})</b>`;
            } else if (err.questionData.eq) {
                detail = `Priorité fausse pour <b>${err.questionData.eq}</b> (Tu as cliqué sur ${err.userAnswer})`;
            }
            return detail;
        };

        const renderDeleteBtn = (err) => `
            <button class="btn-icon" onclick="window.removeErrorFromLog('${err.id}')" title="Supprimer de l'historique" style="color:var(--danger);">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
            </button>
        `;

        const renderCorBadge = () => `<span class="error-badge-corrected">Corrigé</span>`;

        if (isGrouped) {
            const grouped = {};
            errors.forEach(err => {
                if (!grouped[err.exoTitle]) grouped[err.exoTitle] = [];
                grouped[err.exoTitle].push(err);
            });
            
            for (const [title, exoErrors] of Object.entries(grouped)) {
                html += `
                <div class="error-group-card">
                    <h4 class="error-group-title">${title} <span>(${exoErrors.length} erreurs)</span></h4>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                `;
                exoErrors.forEach(err => {
                    const isCor = err.corrected;
                    html += `
                        <div class="error-item-card ${isCor ? 'corrected' : ''}">
                            <div>
                                <div class="error-item-detail">${renderDetail(err)} ${isCor ? renderCorBadge() : ''}</div>
                            </div>
                            ${isCor ? renderDeleteBtn(err) : ''}
                        </div>
                    `;
                });
                html += `</div></div>`;
            }
        } else {
            errors.forEach(err => {
                const isCor = err.corrected;
                html += `
                <div class="error-flat-card ${isCor ? 'corrected' : ''}">
                    <div>
                        <div class="error-flat-title">${err.exoTitle} ${isCor ? renderCorBadge() : ''}</div>
                        <div class="error-item-detail">${renderDetail(err)}</div>
                    </div>
                    ${isCor ? renderDeleteBtn(err) : ''}
                </div>
                `;
            });
        }
        container.innerHTML = html;
        
        // Add listener if not added yet
        if (toggleGroup && !toggleGroup.hasAttribute('data-listened')) {
            toggleGroup.addEventListener('change', updateErrorsView);
            toggleGroup.setAttribute('data-listened', 'true');
        }
    }

    document.addEventListener('errors_updated', updateErrorsView);
    window.removeErrorFromLog = (id) => { state.removeError(id); };

    const btnStartRev = document.getElementById('btn-start-revision');
    if (btnStartRev) {
        btnStartRev.onclick = () => {
            const uncorrected = state.errorHistory.filter(e => !e.corrected);
            if (uncorrected.length === 0) return;

            // Generate a path from the errors
            const revisionPath = uncorrected.map((err, index) => {
                const exoDef = exercices.find(e => e.id === err.exoId);
                const gameType = exoDef ? exoDef.gameType : 'mental';
                return {
                    stepId: 'rev_' + err.id,
                    exoId: err.exoId,
                    title: `Révision: ${err.exoTitle}`,
                    gameType: gameType,
                    currentParams: {
                        nbQuestions: 3, // require 3 successes
                        successThreshold: 3,
                        forceQuestion: err.questionData
                    },
                    errorId: err.id // custom property to know which error this fixes
                };
            });

            // Start sequence
            import('../core/sequenceRunner.js').then(module => {
                const runner = new module.SequenceRunner(revisionPath, 'none');

                // Override finishSequence to mark errors as corrected
                const originalFinish = runner.finishSequence.bind(runner);
                runner.finishSequence = () => {
                    // Mark all errors in this run as corrected
                    revisionPath.forEach(step => {
                        state.markErrorCorrected(step.errorId);
                    });
                    originalFinish();

                    // Hook into the close button created by originalFinish
                    const closeBtn = document.getElementById('btn-close-seq');
                    if (closeBtn) {
                        const originalClick = closeBtn.onclick;
                        closeBtn.onclick = (e) => {
                            if (originalClick) originalClick(e);
                            setTopNavMode('profile');
                        };
                    }
                };

                runner.start();
            });
        };
    }

    function updateProfileView() {
        const level = Math.floor(state.score / 100) + 1;
        const xpInLevel = state.score % 100;
        const xpToNext = 100;
        const progressPct = (xpInLevel / xpToNext) * 100;
        
        let rank = "Apprenti Mathématicien";
        if (level >= 3) rank = "Calculateur Averti";
        if (level >= 5) rank = "Expert des Chiffres";
        if (level >= 10) rank = "Génie des Maths";
        
        const formatTime = (secs) => {
            if (!secs) return "0s";
            const h = Math.floor(secs / 3600);
            const m = Math.floor((secs % 3600) / 60);
            const s = secs % 60;
            return (h>0 ? `${h}h ` : '') + (m>0 ? `${m}m ` : '') + `${s}s`;
        };
        const totalTimeStr = formatTime(state.timeSpentTotal);

        const levelEl = document.getElementById('profile-level');
        if (levelEl) {
            levelEl.innerHTML = `
                <div style="font-size:1.2rem; font-weight:bold; color:var(--text-main);">${rank} <span style="color:var(--primary);">(Niveau ${level})</span></div>
                <div style="margin-top:10px; background:var(--bg-app); border-radius:10px; height:10px; width:100%; max-width:300px; overflow:hidden; border:1px solid var(--border);">
                    <div style="background:var(--primary); height:100%; width:${progressPct}%; transition:width 0.5s ease;"></div>
                </div>
                <div style="font-size:0.8rem; color:var(--text-muted); margin-top:5px; margin-bottom:10px;">${xpInLevel} / ${xpToNext} XP avant le niveau ${level+1}</div>
                <div style="font-size:0.95rem; color:var(--text-main); border-top: 1px dashed var(--border); padding-top:10px; max-width:300px;">
                    ⏱️ <b>Temps total :</b> <span style="color:var(--primary); font-weight:bold;">${totalTimeStr}</span>
                </div>
            `;
        }
    }

    function renderBadges() {
        const cc = document.getElementById('profile-badges-container');
        if (!cc) return;
        cc.innerHTML = '';
        
        const grid = document.createElement('div');
        grid.style = "display:grid; grid-template-columns:repeat(auto-fill, minmax(120px, 1fr)); gap:15px;";
        
        for (const [badgeId, badgeDef] of Object.entries(badgesCatalog)) {
            const unlocked = !!state.badges[badgeId];
            
            grid.innerHTML += `
                <div style="background:var(--bg-panel); border:1px solid ${unlocked ? 'var(--primary)' : 'var(--border)'}; padding:15px 10px; border-radius:12px; text-align:center; opacity:${unlocked ? '1' : '0.5'}; filter:${unlocked ? 'none' : 'grayscale(100%)'}; display:flex; flex-direction:column; gap:5px; position:relative;" title="${badgeDef.description}">
                    <div style="font-size:2.5rem; margin-bottom:5px;">${badgeDef.icon}</div>
                    <div style="font-weight:bold; font-size:0.9rem; color:var(--text-main);">${badgeDef.title}</div>
                    ${!unlocked ? '<div style="position:absolute; top:-5px; right:-5px; background:var(--bg-app); border:1px solid var(--border); border-radius:50%; width:20px; height:20px; display:flex; justify-content:center; align-items:center; font-size:0.7rem;">🔒</div>' : ''}
                </div>
            `;
        }
        cc.appendChild(grid);
    }

    document.addEventListener('score_updated', () => {
        document.querySelectorAll('.score-display').forEach(el => el.textContent = '⭐ ' + state.score);
        updateProfileView();
    });

    document.addEventListener('badges_updated', () => {
        renderBadges();
    });

    // Initial render
    updateErrorsView();
    renderBadges();
}
