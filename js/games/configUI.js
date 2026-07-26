export function renderGameConfigUI(stepOrExo, onSaveCallback, containerId = 'builder-config-content') {
    const content = document.getElementById(containerId);
    if (!content) return;

    content.style.textAlign = 'left';
    content.style.paddingTop = '0';

    const params = stepOrExo.currentParams || stepOrExo.defaultParams || {};
    const nbQ = params.nbQuestions || 10;
    const successThresh = params.successThreshold || nbQ;

    let html = `<div style="font-weight:bold; font-size:1.1rem; color:var(--primary); margin-bottom: 15px;">${stepOrExo.title}</div>`;

    // Render schema specific parameters
    if (stepOrExo.paramSchema && stepOrExo.paramSchema.length > 0) {
        stepOrExo.paramSchema.forEach(param => {
            html += `<div style="margin-bottom: 20px;">`;
            html += `<div style="font-weight:600; margin-bottom:10px; color:var(--text-main);">${param.label} :</div>`;
            
            const currentValue = params[param.id] !== undefined ? params[param.id] : param.default;
            
            if (param.type === 'multiselect') {
                html += `<div style="display:flex; flex-wrap:wrap; gap:10px;">`;
                param.options.forEach(opt => {
                    const isChecked = (Array.isArray(currentValue) && currentValue.includes(opt)) ? 'checked' : '';
                    html += `<label style="display:flex; align-items:center; gap:5px; background:var(--bg-app); padding:8px 12px; border-radius:8px; border:1px solid var(--border); cursor:pointer;">
                        <input type="checkbox" class="schema-cb-${param.id}" data-param-id="${param.id}" value="${opt}" ${isChecked}>
                        <span>${opt}</span>
                    </label>`;
                });
                html += `</div>`;
            } else if (param.type === 'number') {
                html += `<input type="number" class="schema-input-${param.id}" data-param-id="${param.id}" value="${currentValue}" min="${param.min || ''}" max="${param.max || ''}" style="width:100%; padding:10px 15px; border-radius:12px; border:2px solid var(--border); background:var(--bg-app); font-size:1.1rem; color:var(--text-main); font-family:inherit; outline:none;">`;
            } else if (param.type === 'select') {
                html += `<select class="schema-input-${param.id}" data-param-id="${param.id}" style="width:100%; padding:10px 15px; border-radius:12px; border:2px solid var(--border); background:var(--bg-app); font-size:1.1rem; color:var(--text-main); font-family:inherit; outline:none;">`;
                param.options.forEach(opt => {
                    const isSelected = currentValue === opt ? 'selected' : '';
                    html += `<option value="${opt}" ${isSelected}>${opt}</option>`;
                });
                html += `</select>`;
            }
            html += `</div>`;
        });
    }

    // Common parameters
    html += `
        <div style="display:flex; flex-direction:column; gap:15px; border-top:1px solid var(--border); padding-top:20px; margin-top:10px;">
            <div>
                <div style="font-weight:600; margin-bottom:5px; color:var(--text-main);">Nombre de questions :</div>
                <input type="number" id="config-nbq" value="${nbQ}" min="1" max="50" style="width:100%; padding:10px 15px; border-radius:12px; border:2px solid var(--border); background:var(--bg-app); font-size:1.1rem; color:var(--text-main); font-family:inherit; transition:0.2s; outline:none;">
            </div>
            <div>
                <div style="font-weight:600; margin-bottom:5px; color:var(--text-main);">Réussites requises pour valider :</div>
                <input type="number" id="config-success" value="${successThresh}" min="1" max="50" style="width:100%; padding:10px 15px; border-radius:12px; border:2px solid var(--border); background:var(--bg-app); font-size:1.1rem; color:var(--text-main); font-family:inherit; transition:0.2s; outline:none;">
                <div style="font-size:0.85rem; color:var(--text-muted); margin-top:8px; line-height:1.4;">Nombre de bonnes réponses nécessaires pour passer à l'exercice suivant.</div>
            </div>
        </div>
    `;

    content.innerHTML = html;

    // Save Logic
    const saveConfig = () => {
        const newParams = { ...params };
        newParams.nbQuestions = parseInt(document.getElementById('config-nbq').value) || 10;
        newParams.successThreshold = parseInt(document.getElementById('config-success').value) || newParams.nbQuestions;

        if (stepOrExo.paramSchema) {
            stepOrExo.paramSchema.forEach(param => {
                if (param.type === 'multiselect') {
                    const checkboxes = document.querySelectorAll('.schema-cb-' + param.id);
                    // Parse as number if option type is number, otherwise string
                    const isNum = typeof param.options[0] === 'number';
                    newParams[param.id] = Array.from(checkboxes).filter(cb => cb.checked).map(cb => isNum ? parseInt(cb.value) : cb.value);
                } else {
                    const el = document.querySelector('.schema-input-' + param.id);
                    if (el) {
                        const val = el.value;
                        const isNum = param.type === 'number' || (param.type === 'select' && typeof param.options[0] === 'number');
                        newParams[param.id] = isNum ? Number(val) : val;
                    }
                }
            });
        }
        onSaveCallback(newParams);
    };

    // Attach listeners
    content.addEventListener('change', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
            saveConfig();
        }
    });
    content.addEventListener('keyup', (e) => {
        if (e.target.tagName === 'INPUT' && e.target.type === 'number') {
            saveConfig();
        }
    });
}

export function showStudentConfigModal(exo, onStartCallback) {
    const modal = document.getElementById('student-config-modal');
    const content = document.getElementById('student-config-content');
    const btnCancel = document.getElementById('btn-student-config-cancel');
    const btnStart = document.getElementById('btn-student-config-start');
    
    if (!modal || !content) return;

    const params = exo.defaultParams || {};
    let html = '';

    // Render schema specific parameters ONLY
    if (exo.paramSchema && exo.paramSchema.length > 0) {
        exo.paramSchema.forEach(param => {
            html += `<div style="margin-bottom: 15px;">`;
            html += `<div style="font-weight:600; margin-bottom:8px; color:var(--text-main);">${param.label} :</div>`;
            
            const currentValue = params[param.id] !== undefined ? params[param.id] : param.default;
            
            if (param.type === 'multiselect') {
                html += `<div style="display:flex; flex-wrap:wrap; gap:10px;">`;
                param.options.forEach(opt => {
                    const isChecked = (Array.isArray(currentValue) && currentValue.includes(opt)) ? 'checked' : '';
                    html += `<label style="display:flex; align-items:center; gap:5px; background:var(--bg-app); padding:8px 12px; border-radius:8px; border:1px solid var(--border); cursor:pointer;">
                        <input type="checkbox" class="student-schema-cb-${param.id}" data-param-id="${param.id}" value="${opt}" ${isChecked}>
                        <span>${opt}</span>
                    </label>`;
                });
                html += `</div>`;
            } else if (param.type === 'number') {
                html += `<input type="number" class="student-schema-input-${param.id}" data-param-id="${param.id}" value="${currentValue}" min="${param.min || ''}" max="${param.max || ''}" style="width:100%; padding:10px 15px; border-radius:12px; border:2px solid var(--border); background:var(--bg-app); font-size:1.1rem; color:var(--text-main); font-family:inherit; outline:none;">`;
            } else if (param.type === 'select') {
                html += `<select class="student-schema-input-${param.id}" data-param-id="${param.id}" style="width:100%; padding:10px 15px; border-radius:12px; border:2px solid var(--border); background:var(--bg-app); font-size:1.1rem; color:var(--text-main); font-family:inherit; outline:none;">`;
                param.options.forEach(opt => {
                    const isSelected = currentValue === opt ? 'selected' : '';
                    html += `<option value="${opt}" ${isSelected}>${opt}</option>`;
                });
                html += `</select>`;
            }
            html += `</div>`;
        });
    }

    content.innerHTML = html;
    modal.style.display = 'flex';

    const getParams = () => {
        const newParams = { ...params };
        if (exo.paramSchema) {
            exo.paramSchema.forEach(param => {
                if (param.type === 'multiselect') {
                    const checkboxes = document.querySelectorAll('.student-schema-cb-' + param.id);
                    const isNum = typeof param.options[0] === 'number';
                    newParams[param.id] = Array.from(checkboxes).filter(cb => cb.checked).map(cb => isNum ? parseInt(cb.value) : cb.value);
                } else {
                    const el = document.querySelector('.student-schema-input-' + param.id);
                    if (el) {
                        const val = el.value;
                        const isNum = param.type === 'number' || (param.type === 'select' && typeof param.options[0] === 'number');
                        newParams[param.id] = isNum ? Number(val) : val;
                    }
                }
            });
        }
        return newParams;
    };

    // Events
    btnCancel.onclick = () => {
        modal.style.display = 'none';
    };

    btnStart.onclick = () => {
        modal.style.display = 'none';
        onStartCallback(getParams());
    };
}
