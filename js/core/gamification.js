// Médailles et badges.
//
// Le principe : chaque famille d'exploit se décline en QUATRE paliers —
// bronze, argent, or, platine. Un palier atteint en montre un autre juste à
// côté ; c'est ce qui distingue une récompense d'une collection. Les seuils
// sont espacés d'un facteur trois à quatre : assez proches pour que le palier
// suivant paraisse atteignable, assez loin pour qu'il se mérite.
//
// Ce qu'on récompense, et pourquoi :
//   - les POINTS, parce qu'ils mesurent le travail fourni ;
//   - la MAÎTRISE, parce qu'elle mesure ce qui a été appris — c'est le seul
//     compteur qui distingue « a beaucoup joué » de « sait faire » ;
//   - les ERREURS CORRIGÉES, parce que revenir sur une faute est l'acte qui
//     fait progresser, et qu'il faut le rendre désirable ;
//   - la RÉGULARITÉ (jours de pratique), parce que dix minutes par jour valent
//     mieux qu'une heure le dimanche ;
//   - la SÉRIE, la VITESSE, la CURIOSITÉ, pour le plaisir du jeu.

import { state } from './state.js';

const PALIERS = ['bronze', 'argent', 'or', 'platine'];
const NOM_PALIER = { bronze: 'Bronze', argent: 'Argent', or: 'Or', platine: 'Platine' };
const ICONE_PALIER = { bronze: '🥉', argent: '🥈', or: '🥇', platine: '🏆' };

/**
 * Les familles de médailles.
 * `seuils` est lu dans l'ordre bronze, argent, or, platine.
 * `mesure` nomme le compteur ; `phrase` fabrique la description d'un palier.
 */
export const familles = [
    {
        cle: 'score', titre: 'Trésor', icone: '⭐', seuils: [250, 1000, 3000, 10000],
        phrase: (n) => `Gagner ${format(n)} points.`
    },
    {
        cle: 'maitre', titre: 'Savant', icone: '🎓', seuils: [2, 5, 10, 20],
        phrase: (n) => `Amener ${n} compétences au niveau Expert.`
    },
    {
        cle: 'juste', titre: 'Tireur d\'élite', icone: '✅', seuils: [50, 200, 500, 1500],
        phrase: (n) => `Réussir ${format(n)} questions.`
    },
    {
        cle: 'revanche', titre: 'Revanche', icone: '🔄', seuils: [3, 10, 25, 60],
        phrase: (n) => `Corriger ${n} erreurs de ton carnet.`
    },
    {
        cle: 'assidu', titre: 'Assidu', icone: '⏱️', seuils: [1800, 7200, 21600, 54000],
        phrase: (n) => `Passer ${Math.round(n / 3600) || 0.5} heure${n > 3600 ? 's' : ''} en tout sur les exercices.`
    },
    {
        cle: 'fidele', titre: 'Fidèle', icone: '📅', seuils: [3, 10, 30, 100],
        phrase: (n) => `Travailler ${n} jours différents.`
    },
    {
        cle: 'serie', titre: 'Sans Faute', icone: '🎯', seuils: [10, 25, 60, 150],
        phrase: (n) => `Enchaîner ${n} bonnes réponses d'affilée.`
    },
    {
        cle: 'eclair', titre: 'Éclair', icone: '⚡', seuils: [10, 50, 200, 600],
        phrase: (n) => `Répondre juste en moins de 3 secondes, ${n} fois.`
    },
    {
        cle: 'curieux', titre: 'Explorateur', icone: '🧭', seuils: [3, 8, 16, 30],
        phrase: (n) => `Essayer ${n} exercices différents.`
    }
];

/** Les badges uniques : les moments qu'on ne vit qu'une fois. */
const UNIQUES = {
    first_step: { id: 'first_step', icon: '🌱', title: 'Premier Pas', description: 'Terminer ton tout premier exercice.' },
    flawless: { id: 'flawless', icon: '💯', title: 'Parcours Parfait', description: 'Terminer un parcours complet sans aucune erreur.' },
    marathon: { id: 'marathon', icon: '🏃', title: 'Marathonien', description: 'Atteindre le niveau 5 (500 XP).' },
    mastery: { id: 'mastery', icon: '🏅', title: 'Notion Maîtrisée', description: 'Amener une compétence au niveau Expert.' },
    explorer: { id: 'explorer', icon: '🌍', title: 'Grand Voyageur', description: 'Travailler des compétences dans trois domaines différents.' },
    centurion: { id: 'centurion', icon: '🏛️', title: 'Centurion', description: 'Réussir 500 questions au total.' }
};

/** Le catalogue complet, uniques d'abord puis les familles palier par palier. */
export const badgesCatalog = construireCatalogue();

function construireCatalogue() {
    const cat = { ...UNIQUES };
    for (const f of familles) {
        f.seuils.forEach((seuil, i) => {
            const medal = PALIERS[i];
            const id = `${f.cle}_${medal}`;
            cat[id] = {
                id, medal, famille: f.cle, seuil,
                icon: i === 0 ? f.icone : ICONE_PALIER[medal],
                title: `${f.titre} — ${NOM_PALIER[medal]}`,
                description: f.phrase(seuil)
            };
        });
    }
    return cat;
}

function format(n) {
    return n >= 1000 ? `${n / 1000} 000`.replace('.', ',') : String(n);
}

/** Décerne les paliers atteints d'une famille. */
function decerner(cle, valeur) {
    const f = familles.find(x => x.cle === cle);
    if (!f) return;
    f.seuils.forEach((seuil, i) => {
        if (valeur >= seuil) state.grantBadge(`${cle}_${PALIERS[i]}`);
    });
}

export function initGamificationEngine() {
    document.addEventListener('sequence_completed', (e) => {
        const detail = e.detail;
        if (!detail || !detail.bilan) return;
        const { bilan } = detail;

        state.grantBadge('first_step');

        if (bilan.mode !== 'evaluation' && bilan.totalQuestions > 0
            && bilan.totalReussies === bilan.totalQuestions
            && bilan.premierEssai === bilan.totalQuestions) {
            state.grantBadge('flawless');
        }
    });

    // Le compte des erreurs corrigées est celui du CARNET, pas de la session :
    // corriger trois fautes en trois jours vaut autant que trois d'affilée, et
    // c'est même plutôt mieux.
    document.addEventListener('error_corrected', () => {
        decerner('revanche', state.errorHistory.filter(e => e.corrected).length);
    });

    document.addEventListener('score_updated', () => {
        if (state.score >= 500) state.grantBadge('marathon');
        decerner('score', state.score);
    });

    document.addEventListener('time_updated', () => decerner('assidu', state.timeSpentTotal));

    document.addEventListener('attempts_updated', () => {
        const skills = [...state.masteryMap.values()];
        const expertes = skills.filter(s => s.reliable && s.mastery >= 0.9).length;
        if (expertes >= 1) state.grantBadge('mastery');
        decerner('maitre', expertes);

        const domains = new Set(skills.filter(s => s.attempts >= 3).map(s => s.skillId.split('.')[0]));
        if (domains.size >= 3) state.grantBadge('explorer');

        decerner('juste', state.correctCount);
        if (state.correctCount >= 500) state.grantBadge('centurion');

        // La série, la vitesse, la régularité et la curiosité se lisent d'un
        // seul parcours du journal (voir `computeExploits`).
        const x = state.exploits;
        decerner('serie', x.serie);
        decerner('eclair', x.rapides);
        decerner('fidele', x.jours);
        decerner('curieux', x.exercices);
    });
}

/**
 * Progression d'une famille : le palier acquis, le suivant, et où on en est.
 * L'écran de profil s'en sert pour montrer l'objectif d'après plutôt qu'un
 * simple cadenas.
 */
export function progressionFamilles() {
    const valeurs = valeursCourantes();
    return familles.map(f => {
        const v = valeurs[f.cle] || 0;
        const atteint = f.seuils.filter(s => v >= s).length;
        const suivant = f.seuils[atteint];
        return {
            cle: f.cle, titre: f.titre, icone: f.icone, valeur: v,
            paliers: f.seuils.map((s, i) => ({
                medal: PALIERS[i], seuil: s, acquis: v >= s,
                id: `${f.cle}_${PALIERS[i]}`
            })),
            suivant: suivant || null,
            part: suivant ? Math.min(1, v / suivant) : 1
        };
    });
}

function valeursCourantes() {
    const skills = [...state.masteryMap.values()];
    const x = state.exploits;
    return {
        score: state.score,
        maitre: skills.filter(s => s.reliable && s.mastery >= 0.9).length,
        juste: state.correctCount,
        revanche: state.errorHistory.filter(e => e.corrected).length,
        assidu: state.timeSpentTotal,
        fidele: x.jours,
        serie: x.serie,
        eclair: x.rapides,
        curieux: x.exercices
    };
}
