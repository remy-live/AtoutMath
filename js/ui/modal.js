export function showToast(message, type = 'success', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        // Le placement est entièrement dans la feuille de style : centré et
        // au-dessus de la barre du bas sur téléphone, en bas à droite ailleurs.
        document.body.appendChild(container);
    }
    container.style.display = 'flex';

    const toast = document.createElement('div');
    const isError = type === 'error';
    const bg = isError ? 'var(--danger)' : 'var(--success)';
    
    const iconSuccess = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    const iconError = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    
    const icon = isError ? iconError : iconSuccess;
    
    toast.innerHTML = `<div style="display:flex; align-items:center; gap:10px;"><span style="flex:0 0 auto; line-height:0;">${icon}</span><span style="font-weight:600; min-width:0;">${message}</span></div>`;
    toast.style = `background: ${bg}; color: white; padding: 12px 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); min-width: min(200px, 100%);`;
    
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = '0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

export function showModal(title, contentHTML, options = {}) {
    const overlay = document.createElement('div');
    // AU-DESSUS DE QUOI ? 9999 SUFFISAIT TANT QU'ON RESTAIT DANS LA PAGE.
    //
    // La couche de jeu (`#game-layer`) est à 10000 : une fenêtre ouverte DEPUIS
    // un exercice se rangeait donc DERRIÈRE lui. Mesuré sur l'organigramme —
    // le contre-exemple était bien dans le document, avec son texte et son
    // dessin, et personne ne pouvait le voir. Un appelant qui sait qu'il est
    // dans la couche de jeu passe donc son étage.
    const etage = options.zIndex || 9999;
    overlay.style = `position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:${etage}; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(4px); animation: fadeIn 0.2s ease;`;
    
    const width = options.width || '500px';
    
    const modal = document.createElement('div');
    modal.style = `background: var(--bg-panel); border: 1px solid var(--border); border-radius: 16px; width: 90%; max-width: ${width}; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.2); animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); overflow: hidden;`;
    
    let headerHTML = '';
    if (title) {
        headerHTML = `
            <div style="padding: 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: var(--bg-app);">
                <h3 style="margin: 0; font-size: 1.2rem; color: var(--text-main);">${title}</h3>
                <button class="modal-close-btn" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted);">&times;</button>
            </div>
        `;
    }
    
    modal.innerHTML = `
        ${headerHTML}
        <div style="padding: 20px; overflow-y: auto; flex-grow: 1;">
            ${contentHTML}
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    const closeBtn = modal.querySelector('.modal-close-btn');
    const close = () => {
        overlay.style.opacity = '0';
        overlay.style.transition = '0.2s ease';
        setTimeout(() => overlay.remove(), 200);
        if (options.onClose) options.onClose();
    };
    
    if (closeBtn) closeBtn.onclick = close;
    overlay.onclick = (e) => {
        if (e.target === overlay) close();
    };
    
    return {
        close,
        element: modal
    };
}

export function showAlert(message) {
    const contentHTML = `
        <div style="text-align:center; padding:10px 0;">
            <p style="font-size:1.1rem; color:var(--text-main); margin-bottom:20px;">${message}</p>
            <button class="alert-ok-btn" style="background:var(--primary); color:white; border:none; padding:10px 20px; border-radius:8px; font-size:1rem; cursor:pointer; font-family:inherit;">OK</button>
        </div>
    `;
    const modal = showModal('Attention', contentHTML, { width: '400px' });
    
    const okBtn = modal.element.querySelector('.alert-ok-btn');
    if (okBtn) {
        okBtn.onclick = () => modal.close();
    }
}

export function showConfirm(message, onConfirm) {
    const contentHTML = `
        <div style="text-align:center; padding:10px 0;">
            <p style="font-size:1.1rem; color:var(--text-main); margin-bottom:20px;">${message}</p>
            <div style="display:flex; justify-content:center; gap:10px;">
                <button class="confirm-cancel-btn" style="background:var(--bg-app); color:var(--text-main); border:1px solid var(--border); padding:10px 20px; border-radius:8px; font-size:1rem; cursor:pointer; font-family:inherit;">Annuler</button>
                <button class="confirm-ok-btn" style="background:var(--danger); color:white; border:none; padding:10px 20px; border-radius:8px; font-size:1rem; cursor:pointer; font-family:inherit;">Confirmer</button>
            </div>
        </div>
    `;
    const modal = showModal('Confirmation', contentHTML, { width: '400px' });
    
    const cancelBtn = modal.element.querySelector('.confirm-cancel-btn');
    const okBtn = modal.element.querySelector('.confirm-ok-btn');
    
    if (cancelBtn) cancelBtn.onclick = () => modal.close();
    if (okBtn) {
        okBtn.onclick = () => {
            modal.close();
            if (onConfirm) onConfirm();
        };
    }
}
