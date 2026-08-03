// Accès aux exercices en jeu libre.
//
// Deux mécanismes, configurables par le professeur et rangés dans le
// localStorage du POSTE (pas du profil : c'est un réglage de la machine de
// classe, qui vaut pour tous les élèves qui s'y assoient) :
//
//   - « réservés » : exercices qui ne se lancent PAS librement depuis le
//     catalogue — ils n'arrivent que par un parcours ou un code du professeur ;
//   - « progression » : les jeux (activités autonomes : course, Tetris,
//     Math Crush…) se DÉBLOQUENT au fil du travail — chaque palier de bonnes
//     réponses ouvre le jeu suivant. Le jeu devient une récompense d'effort,
//     pas une échappatoire aux exercices.
//
// Les parcours du professeur ignorent ces verrous : c'est lui qui décide.

import { state } from './state.js';
import { getActivity } from './registry.js';
import { exercices } from '../data/catalog.js';

const KEY = 'mathbox-game-access';

const DEFAUTS = {
    // 'libre' : tous les jeux accessibles ; 'progression' : à débloquer.
    mode: 'libre',
    // Bonnes réponses nécessaires pour débloquer chaque jeu supplémentaire.
    unlockStep: 30,
    // Exercices réservés aux parcours du professeur.
    reserved: []
};

export function getAccessConfig() {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? { ...DEFAUTS, ...JSON.parse(raw) } : { ...DEFAUTS };
    } catch (e) {
        return { ...DEFAUTS };
    }
}

export function saveAccessConfig(cfg) {
    try {
        localStorage.setItem(KEY, JSON.stringify({ ...DEFAUTS, ...cfg }));
    } catch (e) { /* mode privé : le réglage ne survivra pas, tant pis */ }
    document.dispatchEvent(new CustomEvent('gameAccess_updated'));
}

/** Un « jeu » au sens du déblocage : une activité autonome. */
export function isGame(exo) {
    const activity = getActivity(exo.activityId);
    return !!(activity && activity.supports && activity.supports.autonomous);
}

/** Les jeux dans l'ordre du catalogue : c'est l'ordre de déblocage. */
function gamesInOrder() {
    return exercices.filter(isGame);
}

/**
 * Statut d'accès d'un exercice en jeu LIBRE (les parcours ne passent pas ici).
 * @returns {{status: 'libre'|'reserve'|'verrouille', manque?: number, requis?: number}}
 */
export function accessOf(exo) {
    const cfg = getAccessConfig();
    if (cfg.reserved.includes(exo.id)) return { status: 'reserve' };

    if (cfg.mode === 'progression' && isGame(exo)) {
        const rang = gamesInOrder().findIndex(g => g.id === exo.id);
        const requis = (rang + 1) * cfg.unlockStep;
        const acquis = state.correctCount || 0;
        if (acquis < requis) {
            return { status: 'verrouille', requis, manque: requis - acquis };
        }
    }
    return { status: 'libre' };
}

/** Phrase à afficher sur une carte verrouillée. */
export function lockLabel(acces) {
    if (acces.status === 'reserve') return 'Réservé au parcours du professeur';
    if (acces.status === 'verrouille') {
        return `Encore ${acces.manque} bonne${acces.manque > 1 ? 's' : ''} réponse${acces.manque > 1 ? 's' : ''} pour débloquer !`;
    }
    return '';
}
