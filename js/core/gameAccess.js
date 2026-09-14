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
//     pas une échappatoire aux exercices ;
//   - « parcours » : les jeux s'ouvrent quand le TRAVAIL DU JOUR est fait.
//
// Les parcours du professeur ignorent ces verrous : c'est lui qui décide.
//
// ── POURQUOI UN TROISIÈME MODE
//
// Rémy : « Il faut aussi pouvoir autoriser une zone de jeu si l'élève a fini le
// parcours. »
//
// LE LOGICIEL SAVAIT DÉJÀ QU'UN PARCOURS ÉTAIT FINI — et ce savoir n'arrivait
// pas jusqu'ici. `etatRecompenses()` répond `toutOuvert` depuis longtemps, mais
// il ne servait qu'aux étapes-cadeaux POSÉES DANS le parcours. Le verrou du jeu
// libre, lui, ne connaissait qu'une mesure de l'effort : le compteur cumulé de
// bonnes réponses depuis toujours. Mesuré : un élève dont le parcours du jour
// était fini à 90 % s'entendait dire « Encore 90 bonnes réponses pour
// débloquer ! ». Deux vérités contraires dans le même écran.
//
// « Fini » ne se redéfinit donc PAS ici : c'est `parcoursFini()` dans
// `recompenses.js`, la même règle que la salle de jeux du parcours. Une seconde
// définition du même mot aurait divergé de la première.
//
// LE COMPTEUR CUMULÉ N'ÉTAIT PAS LA BONNE MESURE, et c'est le fond de l'affaire.
// « 90 bonnes réponses » ne dit rien du travail d'aujourd'hui : un élève
// appliqué depuis septembre a tout ouvert en octobre et ne rouvre plus jamais
// rien, tandis qu'un élève qui débute reste devant un mur qu'aucune séance ne
// fait bouger. Le parcours du jour, lui, se referme chaque fois que le
// professeur en donne un nouveau : la récompense se remérite.

import { state } from './state.js';
import { getActivity } from './registry.js';
import { exercices } from '../data/catalog.js';
import { parcoursFini } from './recompenses.js';
import { estRetire } from './seanceDistante.js';

const KEY = 'mathbox-game-access';

const DEFAUTS = {
    // 'libre' : tous les jeux accessibles ; 'progression' : à débloquer au
    // compteur ; 'parcours' : ouverts quand le travail du jour est fait.
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
/**
 * LE PARCOURS DU JOUR EST-IL FINI ?
 *
 * `state.studentPath` est projeté du journal : il porte les étapes, celles qui
 * sont faites et le détail de chacune. C'est exactement ce que
 * `parcoursFini()` attend — on ne recalcule rien, on demande.
 *
 * PAS DE PARCOURS, PAS DE VERROU. Un élève à qui l'on n'a rien donné n'a rien à
 * finir : lui fermer les jeux au motif qu'il n'a pas terminé un travail qui
 * n'existe pas serait une punition sans faute. C'est aussi ce qui rend le mode
 * inoffensif hors séance, à la maison, pendant les vacances.
 */
function monParcoursEstFini() {
    const a = state.studentPath;
    if (!a || !Array.isArray(a.steps) || !a.steps.length) return null;

    // LES ÉTAPES RETIRÉES PAR LE PROFESSEUR NE BARRENT PLUS LA ROUTE.
    //
    // `state.studentPath` est projeté du journal TEL QUEL : personne ne l'a
    // filtré. Le meneur, lui, écarte les exercices que le professeur a retirés
    // de la séance (`filtrerEtapes`) — l'élève ne les voit donc jamais, ne peut
    // pas les faire, et resterait pourtant enfermé dehors à cause d'eux. Le
    // verrou doit regarder le MÊME parcours que celui qu'on lui demande de
    // finir.
    //
    // `state.studentPath` porte des étapes de PARCOURS (`exerciseId`) et non
    // des étapes hydratées (`exercise.id`) : on filtre donc ici plutôt que
    // d'appeler `filtrerEtapes`, qui attend les secondes.
    const vivantes = a.steps.filter(s => !estRetire(s && s.exerciseId));

    // SI LE FILTRE VIDE LE PARCOURS, il n'y a plus de travail à finir — donc
    // rien à verrouiller. La même garde que le meneur, et pour la même raison :
    // un parcours vide n'est pas un parcours.
    if (!vivantes.length) return null;

    return parcoursFini({ ...a, steps: vivantes },
        { completed: a.completed || [], resultats: a.resultats });
}

export function accessOf(exo) {
    const cfg = getAccessConfig();
    if (cfg.reserved.includes(exo.id)) return { status: 'reserve' };

    if (cfg.mode === 'parcours' && isGame(exo)) {
        const fini = monParcoursEstFini();
        // `null` : aucun parcours en cours — on n'invente pas de verrou.
        if (fini === false) return { status: 'attend-parcours' };
        return { status: 'libre' };
    }

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
    // ON DIT CE QU'IL RESTE À FAIRE, ET NON « c'est fermé ». Un verrou qui
    // n'explique pas ce qui l'ouvre se lit comme une panne.
    if (acces.status === 'attend-parcours') return 'Finis ton parcours, et les jeux s\'ouvrent !';
    if (acces.status === 'verrouille') {
        return `Encore ${acces.manque} bonne${acces.manque > 1 ? 's' : ''} réponse${acces.manque > 1 ? 's' : ''} pour débloquer !`;
    }
    return '';
}
