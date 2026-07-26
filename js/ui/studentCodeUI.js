import { Shortcodes } from '../core/shortcodes.js';
import { exercices } from '../data/catalog.js';
import { showAlert } from './modal.js';
import { state } from '../core/state.js';

export function initStudentCodeUI() {
    const btnSubmitCode = document.getElementById('btn-submit-code');
    if (btnSubmitCode) {
        btnSubmitCode.onclick = () => {
            const input = document.getElementById('student-code-input');
            const code = input.value.trim();
            if (!code) return;
            const sequence = Shortcodes.decodeSequence(code, exercices);
            if (sequence.length === 0) {
                showAlert("Code invalide ou introuvable.");
                return;
            }
            state.setStudentPath(sequence);

            import('../core/sequenceRunner.js').then(module => {
                const runner = new module.SequenceRunner(state.studentPath.steps, 'none');
                runner.isStudentPath = true;
                runner.start();
                document.getElementById('code-modal').style.display = 'none';

                // Hide teacher UI elements
                const sidebar = document.getElementById('sidebar-container');
                const topNav = document.getElementById('top-nav-bar');
                const mainContent = document.getElementById('main-content');
                if (sidebar) sidebar.style.display = 'none';
                if (topNav) topNav.style.display = 'none';
                if (mainContent) mainContent.style.display = 'none';
            });
            input.value = '';
        };
    }

    const btnCloseCode = document.getElementById('btn-close-code');
    if (btnCloseCode) {
        btnCloseCode.onclick = () => {
            document.getElementById('code-modal').style.display = 'none';
        };
    }
}
