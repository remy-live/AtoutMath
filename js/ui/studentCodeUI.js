// Saisie d'un code de parcours donné par le professeur.
//
// Le code encode désormais le parcours complet (étapes, surcharges, politique,
// barème) : un parcours noté partagé par lien arrive chez l'élève avec son
// barème, ce qui était impossible avec l'ancien format à 2 lettres par jeu.

import { Shortcodes } from '../core/shortcodes.js';
import { hydratePath } from '../core/path.js';
import { resolvePolicy, describePolicy } from '../core/policy.js';
import { showAlert, showToast } from './modal.js';
import { state } from '../core/state.js';

export function initStudentCodeUI() {
    const btnSubmit = document.getElementById('btn-submit-code');
    const input = document.getElementById('student-code-input');
    const modal = document.getElementById('code-modal');

    const submit = () => {
        const code = (input.value || '').trim();
        if (!code) return;
        if (!applyCode(code)) {
            showAlert('Code invalide ou parcours introuvable. Vérifie la saisie avec ton professeur.');
            return;
        }
        input.value = '';
        if (modal) modal.style.display = 'none';
    };

    if (btnSubmit) btnSubmit.onclick = submit;
    if (input) input.onkeydown = (e) => { if (e.key === 'Enter') submit(); };

    const btnClose = document.getElementById('btn-close-code');
    if (btnClose) btnClose.onclick = () => { if (modal) modal.style.display = 'none'; };
}

/**
 * Décode un code, l'enregistre comme parcours assigné et le lance.
 * @returns {boolean} succès
 */
export function applyCode(code, { autoStart = true } = {}) {
    const path = Shortcodes.decodePath(code);
    if (!path || !path.steps.length) return false;

    const { steps, missing } = hydratePath(path);
    if (!steps.length) return false;
    if (missing.length) {
        showToast(`${missing.length} activité(s) de ce parcours n'existent plus.`, 'error');
    }

    state.setStudentPath(path.steps, {
        pathId: path.id,
        name: path.name,
        code,
        policy: resolvePolicy(path.policy)
    });

    showToast(`Parcours « ${path.name} » chargé. ${describePolicy(path.policy)}`, 'success', 5000);

    if (autoStart) {
        import('../core/runner.js').then(({ Runner }) => {
            new Runner({ path, deviceMode: 'none', isStudentPath: true }).start();
        });
    } else {
        import('./navigation.js').then(m => m.setTopNavMode('path'));
    }
    return true;
}
