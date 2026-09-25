// Saisie d'un code de parcours donné par le professeur.
//
// Le code encode désormais le parcours complet (étapes, surcharges, politique,
// barème) : un parcours noté partagé par lien arrive chez l'élève avec son
// barème, ce qui était impossible avec l'ancien format à 2 lettres par jeu.

import { Shortcodes } from '../core/shortcodes.js';
import { hydratePath } from '../core/path.js';
import { resolvePolicy } from '../core/policy.js';
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
        showToast(`${missing.length} exercice(s) de ce parcours n'existent plus.`, 'error');
    }

    state.setStudentPath(path.steps, {
        pathId: path.id,
        name: path.name,
        code,
        policy: resolvePolicy(path.policy)
    });

    // PAS DE MESSAGE DE CONFIRMATION, ET C'EST UNE SUPPRESSION VOULUE.
    //
    // Rémy, capture de l'écran d'accueil d'un élève : « même le toast est
    // redondant ». Il l'était deux fois. Il annonçait le nom du parcours —
    // que l'écran qui s'ouvre dans la seconde écrit déjà dans son en-tête et
    // sur sa carte — et la règle de la séance, que cette même carte pose
    // juste en dessous (`run-carte-regle`). Cinq secondes de bandeau par-
    // dessus l'écran qu'il recouvrait pour répéter ce qu'il cachait.
    //
    // ET QUAND LA CARTE NE S'OUVRE PAS (`autoStart: false`), l'élève arrive
    // dans « Mon Parcours », qui écrit le nom en tête de section et la règle
    // juste dessous (voir `describePolicy` dans ui/pathView.js). Dans les deux
    // cas, le message ne servait qu'à dire « ça a marché » — ce que l'arrivée
    // du parcours dit mieux que lui.
    //
    // L'AVERTISSEMENT, LUI, RESTE : « 3 exercices de ce parcours n'existent
    // plus » n'est écrit nulle part ailleurs.

    // Le code décodé, l'élève voyait la première question avant d'avoir vu son
    // parcours. Le parcours s'ouvre donc sur SA CARTE, plein écran, et c'est
    // lui qui donne le départ ; s'il préfère attendre, le parcours reste
    // chargé dans « Mon Parcours ».
    import('./navigation.js').then(m => m.setTopNavMode('path'));
    if (autoStart) {
        import('../core/runner.js').then(({ Runner }) => {
            new Runner({ path, deviceMode: 'none', isStudentPath: true }).start();
        });
    }
    return true;
}
