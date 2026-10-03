// SE DÉCONNECTER — ce qui n'existait nulle part.
//
// Rémy : « Tu sais qu'on ne peut même pas se déconnecter ».
//
// C'ÉTAIT VRAI, ET C'ÉTAIT UN TROU COMPLET. Le jeton du professeur ne
// s'effaçait que lorsque le SERVEUR le refusait — après une réinstallation, par
// exemple. Aucun geste volontaire nulle part, ni pour lui, ni pour l'élève. Un
// professeur qui se connecte sur l'ordinateur de la salle informatique y reste
// connecté après la sonnerie, avec ses classes, sa liste et les codes de ses
// trente élèves ouverts au suivant qui s'assied.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// MAIS « EFFACER LE JETON » N'EST PAS UNE DÉCONNEXION.
//
// TROIS CHOSES SE PASSENT MAL SI L'ON SE CONTENTE DE ÇA, et ce fichier n'existe
// que pour elles :
//
//   1. ON JETTERAIT DU TRAVAIL. Le journal pousse ses événements par lots, avec
//      quelques secondes de retard. Un élève qui se déconnecte à la sonnerie
//      perd ses dernières réponses — celles de la fin d'heure, qui sont
//      toujours celles qu'on vient de se donner du mal à trouver. On ENVOIE
//      donc d'abord, et l'on REFUSE de se déconnecter si l'envoi échoue.
//      Il peut passer outre, mais alors on lui dit combien il perd.
//
//   2. LE VERROU DE LA CLASSE RESTERAIT. La consigne, le verrou, la séance
//      imposée et le compte à rebours sont gardés sur l'appareil pour survivre
//      à une coupure réseau. Sans les effacer, l'élève suivant qui s'assied
//      devant la même machine se retrouve verrouillé par une classe dont il ne
//      fait pas partie, avec un compte à rebours qui n'est pas le sien — et
//      personne ne comprend pourquoi.
//
//   3. SE DÉCONNECTER N'EST PAS S'EFFACER. Sur la tablette d'un élève, se
//      déconnecter et se reconnecter ne doit pas coûter quatre mois d'histoire.
//      Sur un poste partagé du CDI, en revanche, il ne faut RIEN laisser au
//      suivant. Ce sont deux gestes différents, et c'est l'élève — ou le
//      professeur à côté de lui — qui sait lequel il veut. On ne le devine pas.

import { journal } from './journal.js';

/**
 * PEUT-ON SE DÉCONNECTER MAINTENANT, ET QU'EST-CE QU'ON PERDRAIT ?
 *
 * Séparé du geste lui-même parce que c'est la DÉCISION qui compte et qu'elle
 * doit pouvoir s'éprouver sans réseau ni navigateur.
 *
 * @param {number} enAttente  combien d'événements n'ont pas encore été envoyés
 * @param {object} [opts] { enTrainDeTravailler:boolean, horsLigne:boolean }
 * @returns {{sur:boolean, pourquoi:string, dire:string, perte:number}}
 */
export function peutSeDeconnecter(enAttente, opts = {}) {
    const n = Math.max(0, Number(enAttente) || 0);

    // ON N'ARRACHE PAS UNE QUESTION EN COURS. Le meneur sait clore proprement —
    // il enregistre ce qui a été fait puis rend la main. Se déconnecter par-
    // dessus perdrait la réponse qu'on est en train de taper.
    if (opts.enTrainDeTravailler) {
        return { sur: false, pourquoi: 'en-plein-travail', perte: n,
            dire: 'Termine ou quitte ton exercice d\'abord : sinon tu perds la réponse '
                + 'que tu es en train d\'écrire.' };
    }
    if (!n) {
        return { sur: true, pourquoi: 'tout-est-envoye', perte: 0,
            dire: 'Tout ton travail est enregistré.' };
    }
    if (opts.horsLigne) {
        return { sur: false, pourquoi: 'hors-ligne', perte: n,
            dire: `Tu es hors ligne, et ${n} réponse${n > 1 ? 's n\'ont' : ' n\'a'} pas encore été `
                + 'envoyée' + (n > 1 ? 's' : '') + '. Attends le réseau, ou déconnecte-toi '
                + 'quand même — mais ce travail-là sera perdu.' };
    }
    return { sur: false, pourquoi: 'reste-a-envoyer', perte: n,
        dire: `${n} réponse${n > 1 ? 's' : ''} ${n > 1 ? 'restent' : 'reste'} à envoyer. `
            + 'On les envoie d\'abord.' };
}

/**
 * COMBIEN DE TRAVAIL N'EST PAS ENCORE PARTI.
 *
 * On ne compte pas les événements marqués `local` : ils ne sont pas destinés au
 * serveur, et les faire figurer dans « 12 réponses à envoyer » ferait renoncer
 * un élève qui n'a en réalité rien à perdre.
 */
export function resteAEnvoyer() {
    try {
        return journal.pending().filter(e => !e.local).length;
    } catch (e) {
        return 0;
    }
}

/**
 * CE QU'IL FAUT EFFACER DE CET APPAREIL, ET DANS QUEL ORDRE.
 *
 * Rendu comme une LISTE plutôt qu'exécuté ici : chaque élément est effacé par
 * le module qui sait le faire, et l'ordre compte — on détache le jeton en
 * dernier, pour que l'envoi final ait encore de quoi s'authentifier.
 *
 * @param {object} [opts] { effacerLeTravail:boolean }
 */
export function ceQuOnEfface(opts = {}) {
    const etapes = [
        { quoi: 'seance', dit: 'la consigne, le verrou, la séance imposée et le chrono' },
        { quoi: 'messages', dit: 'les mots du professeur non lus' }
    ];
    // SE DÉCONNECTER N'EST PAS S'EFFACER — sauf si on le demande. Sur une
    // tablette personnelle, se reconnecter ne doit pas coûter quatre mois
    // d'histoire ; sur un poste partagé, il ne faut rien laisser.
    if (opts.effacerLeTravail) {
        etapes.push({ quoi: 'journal', dit: 'tout le travail enregistré sur cet appareil' });
    }
    // Le jeton en dernier : l'envoi final en a encore besoin.
    etapes.push({ quoi: 'jeton', dit: 'ton identification' });
    return etapes;
}

/**
 * CE QUE LE PROFESSEUR PERD EN SE DÉCONNECTANT : RIEN.
 *
 * Ses classes, ses listes, ses parcours et le travail de ses élèves vivent sur
 * le serveur. C'est vrai, et il faut le dire — sans cette phrase, il hésitera à
 * cliquer, et il restera connecté sur l'ordinateur de la salle informatique.
 */
export const RIEN_A_PERDRE_PROF =
    'Vos classes, vos listes et le travail de vos élèves restent sur le serveur. '
    + 'Vous les retrouverez en vous reconnectant.';
