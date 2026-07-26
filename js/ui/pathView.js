import { state } from '../core/state.js';

function launchStep(index) {
    import('../core/sequenceRunner.js').then(module => {
        const steps = state.studentPath.steps.slice(index);
        const runner = new module.SequenceRunner(steps, 'none');
        runner.isStudentPath = true;
        runner.start();
    });
}

export function renderStudentPathView() {
    const container = document.getElementById('student-path-container');
    if (!container) return;
    container.innerHTML = '';

    const path = state.studentPath;
    if (!path || !path.steps || path.steps.length === 0) {
        container.innerHTML = '<div class="empty-state-msg">Ton professeur ne t\'a pas encore assigné de parcours. Saisis un code depuis le bouton 🔗 en haut de l\'écran pour en démarrer un !</div>';
        return;
    }

    container.appendChild(Object.assign(document.createElement('div'), { className: 'path-timeline-line' }));

    const firstPendingIndex = path.steps.findIndex(s => !path.completed.includes(s.stepId));

    path.steps.forEach((step, i) => {
        const isDone = path.completed.includes(step.stepId);
        const isCurrent = !isDone && i === firstPendingIndex;
        const isLocked = !isDone && !isCurrent;

        const row = document.createElement('div');
        row.className = 'path-timeline-step' + (isLocked ? ' path-timeline-step--locked' : '');

        const icon = document.createElement('div');
        icon.className = 'path-timeline-icon ' + (isDone ? 'path-timeline-icon--done' : isCurrent ? 'path-timeline-icon--current' : 'path-timeline-icon--locked');
        icon.textContent = isDone ? '✓' : isLocked ? '🔒' : String(i + 1);

        const card = document.createElement('div');
        card.className = 'card card--flush' + (isCurrent ? ' card--current' : '');

        const title = document.createElement('div');
        title.className = 'timeline-step-title' + (isCurrent ? ' timeline-step-title--active' : '');
        title.textContent = step.title;
        card.appendChild(title);

        if (isDone) {
            const status = document.createElement('div');
            status.className = 'timeline-step-status';
            status.textContent = 'Terminé !';
            card.appendChild(status);
        } else if (isCurrent) {
            const btn = document.createElement('button');
            btn.className = 'btn-toggle active';
            btn.textContent = 'Jouer';
            btn.onclick = () => launchStep(i);
            card.appendChild(btn);
        } else {
            const status = document.createElement('div');
            status.className = 'timeline-step-status';
            status.textContent = 'À débloquer';
            card.appendChild(status);
        }

        row.appendChild(icon);
        row.appendChild(card);
        container.appendChild(row);
    });
}

document.addEventListener('studentPath_updated', renderStudentPathView);
