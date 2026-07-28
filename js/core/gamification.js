import { state } from './state.js';

export const badgesCatalog = {
    first_step: { id: 'first_step', icon: '🌱', title: 'Premier Pas', description: 'Terminer ton tout premier exercice.' },
    flawless: { id: 'flawless', icon: '🎯', title: 'Sans Faute', description: 'Terminer un parcours complet sans aucune erreur.' },
    speed_demon: { id: 'speed_demon', icon: '⚡', title: 'Éclair', description: 'Répondre juste en moins de 3 secondes en moyenne.' },
    persistent: { id: 'persistent', icon: '🛡️', title: 'Persévérant', description: 'Corriger 3 erreurs de ton carnet.' },
    marathon: { id: 'marathon', icon: '🏃', title: 'Marathonien', description: 'Atteindre le niveau 5 (500 XP).' },
    dedicated: { id: 'dedicated', icon: '⏱️', title: 'Assidu', description: 'Passer plus de 30 minutes au total sur les exercices.' },
    // Récompense la progression réelle plutôt que le volume : c'est le seul
    // signal qui distingue « a beaucoup joué » de « a appris quelque chose ».
    mastery: { id: 'mastery', icon: '🏅', title: 'Notion Maîtrisée', description: 'Amener une compétence au niveau Expert.' },
    explorer: { id: 'explorer', icon: '🧭', title: 'Explorateur', description: 'Travailler des compétences dans trois domaines différents.' }
};

let correctedThisSession = 0;

export function initGamificationEngine() {
    document.addEventListener('sequence_completed', (e) => {
        const detail = e.detail;
        if (!detail || !detail.bilan) return;
        const { bilan, totalTime } = detail;

        state.grantBadge('first_step');

        if (bilan.mode !== 'evaluation' && bilan.totalQuestions > 0) {
            if (bilan.totalReussies === bilan.totalQuestions && bilan.premierEssai === bilan.totalQuestions) {
                state.grantBadge('flawless');
            }
            // `totalTime` est désormais une durée réelle en secondes. L'ancienne
            // version lisait `this.stats.startTime`, qui n'existait pas : la
            // moyenne valait NaN et ce badge ne pouvait jamais tomber.
            const avgMs = bilan.totalQuestions ? (totalTime * 1000) / bilan.totalQuestions : 0;
            if (avgMs > 0 && avgMs < 3000 && bilan.totalReussies === bilan.totalQuestions) {
                state.grantBadge('speed_demon');
            }
        }
    });

    document.addEventListener('error_corrected', () => {
        correctedThisSession++;
        if (correctedThisSession >= 3) state.grantBadge('persistent');
    });

    document.addEventListener('score_updated', () => {
        if (state.score >= 500) state.grantBadge('marathon');
    });

    document.addEventListener('time_updated', () => {
        if (state.timeSpentTotal >= 1800) state.grantBadge('dedicated');
    });

    document.addEventListener('attempts_updated', () => {
        const skills = [...state.masteryMap.values()];
        if (skills.some(s => s.reliable && s.mastery >= 0.9)) state.grantBadge('mastery');

        const domains = new Set(skills.filter(s => s.attempts >= 3).map(s => s.skillId.split('.')[0]));
        if (domains.size >= 3) state.grantBadge('explorer');
    });
}
