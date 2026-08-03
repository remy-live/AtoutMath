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
    explorer: { id: 'explorer', icon: '🧭', title: 'Explorateur', description: 'Travailler des compétences dans trois domaines différents.' },

    // Médailles de points : quatre métaux, un objectif toujours en vue —
    // quand le bronze est acquis, l'argent est déjà affiché à côté.
    score_bronze: { id: 'score_bronze', icon: '🥉', medal: 'bronze', title: 'Médaille de Bronze', description: 'Gagner 250 points.' },
    score_argent: { id: 'score_argent', icon: '🥈', medal: 'argent', title: 'Médaille d\'Argent', description: 'Gagner 1 000 points.' },
    score_or: { id: 'score_or', icon: '🥇', medal: 'or', title: 'Médaille d\'Or', description: 'Gagner 3 000 points.' },
    score_diamant: { id: 'score_diamant', icon: '💎', medal: 'diamant', title: 'Médaille de Diamant', description: 'Gagner 10 000 points.' },

    // Médailles de maîtrise : le pendant « qualité » des médailles de points.
    maitre_bronze: { id: 'maitre_bronze', icon: '🎓', medal: 'bronze', title: 'Savant de Bronze', description: 'Maîtriser 2 compétences au niveau Expert.' },
    maitre_argent: { id: 'maitre_argent', icon: '🎓', medal: 'argent', title: 'Savant d\'Argent', description: 'Maîtriser 5 compétences au niveau Expert.' },
    maitre_or: { id: 'maitre_or', icon: '🎓', medal: 'or', title: 'Savant d\'Or', description: 'Maîtriser 10 compétences au niveau Expert.' },

    // Régularité et bravoure.
    comeback: { id: 'comeback', icon: '🔄', title: 'Revanche', description: 'Corriger 10 erreurs de ton carnet.' },
    grand_jeu: { id: 'grand_jeu', icon: '🎮', title: 'Grand Joueur', description: 'Réussir 100 questions au total.' },
    centurion: { id: 'centurion', icon: '🏛️', title: 'Centurion', description: 'Réussir 500 questions au total.' }
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
        if (correctedThisSession >= 10) state.grantBadge('comeback');
    });

    document.addEventListener('score_updated', () => {
        if (state.score >= 500) state.grantBadge('marathon');
        // Médailles de points, du bronze au diamant.
        if (state.score >= 250) state.grantBadge('score_bronze');
        if (state.score >= 1000) state.grantBadge('score_argent');
        if (state.score >= 3000) state.grantBadge('score_or');
        if (state.score >= 10000) state.grantBadge('score_diamant');
    });

    document.addEventListener('time_updated', () => {
        if (state.timeSpentTotal >= 1800) state.grantBadge('dedicated');
    });

    document.addEventListener('attempts_updated', () => {
        const skills = [...state.masteryMap.values()];
        const expertes = skills.filter(s => s.reliable && s.mastery >= 0.9).length;
        if (expertes >= 1) state.grantBadge('mastery');
        if (expertes >= 2) state.grantBadge('maitre_bronze');
        if (expertes >= 5) state.grantBadge('maitre_argent');
        if (expertes >= 10) state.grantBadge('maitre_or');

        const domains = new Set(skills.filter(s => s.attempts >= 3).map(s => s.skillId.split('.')[0]));
        if (domains.size >= 3) state.grantBadge('explorer');

        if (state.correctCount >= 100) state.grantBadge('grand_jeu');
        if (state.correctCount >= 500) state.grantBadge('centurion');
    });
}
