import { state } from './state.js';

export const badgesCatalog = {
    flawless: {
        id: 'flawless',
        icon: '🎯',
        title: 'Sans Faute',
        description: 'Terminer un parcours complet sans aucune erreur.'
    },
    speed_demon: {
        id: 'speed_demon',
        icon: '⚡',
        title: 'Éclair',
        description: 'Répondre très rapidement (moins de 3 secondes en moyenne).'
    },
    persistent: {
        id: 'persistent',
        icon: '🛡️',
        title: 'Persévérant',
        description: 'Corriger avec succès 3 erreurs de l\'historique.'
    },
    marathon: {
        id: 'marathon',
        icon: '🏃',
        title: 'Marathonien',
        description: 'Atteindre le Niveau 5 (500 XP).'
    },
    first_step: {
        id: 'first_step',
        icon: '🌱',
        title: 'Premier Pas',
        description: 'Terminer ton tout premier exercice.'
    },
    dedicated: {
        id: 'dedicated',
        icon: '⏱️',
        title: 'Assidu',
        description: 'Passer plus de 30 minutes au total sur les exercices.'
    }
};

let sessionCorrectedErrors = 0;

export function initGamificationEngine() {
    // Écoute les séquences terminées
    document.addEventListener('sequence_completed', (e) => {
        const stats = e.detail; 
        
        if (!stats) return;

        // Badge First Step
        state.grantBadge('first_step');

        if (!stats.isRevision) {
            // Badge Flawless
            if (stats.totalErrors === 0 && stats.stepCount >= 1) {
                state.grantBadge('flawless');
            }

            // Badge Speed Demon
            const avgTime = (stats.totalTime * 1000) / (stats.stats.totalQuestions || 1);
            if (avgTime > 0 && avgTime < 3000 && stats.totalErrors === 0) {
                state.grantBadge('speed_demon');
            }
        }
    });

    // Écoute les corrections d'erreurs
    document.addEventListener('error_corrected', () => {
        sessionCorrectedErrors++;
        if (sessionCorrectedErrors >= 3) {
            state.grantBadge('persistent');
        }
    });

    // Écoute l'évolution du score (XP)
    document.addEventListener('score_updated', () => {
        if (state.score >= 500) {
            state.grantBadge('marathon');
        }
    });

    // Écoute l'évolution du temps
    document.addEventListener('time_updated', () => {
        // 30 minutes = 1800 secondes
        if (state.timeSpentTotal >= 1800) {
            state.grantBadge('dedicated');
        }
    });
}
