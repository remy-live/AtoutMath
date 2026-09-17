// LA PORTE D'ENTRÉE — ce que l'on voit en arrivant sur le site.
//
// Rémy : « quand on va sur le site, il faut un espace d'identification et une
// zone code. Pour le moment, je ne veux pas encore mettre de mode libre. »
//
// DEUX PORTES, ET RIEN D'AUTRE. L'élève qui arrive rejoint sa classe, ou saisit
// le code que le professeur vient de dicter. Le catalogue des cent
// soixante-sept exercices n'est pas une troisième porte : c'est l'atelier du
// professeur, et un élève qui s'y promène pendant l'heure ne fait pas le
// travail donné.
//
// « POUR LE MOMENT » — d'où un interrupteur et non une suppression. Le mode
// libre existe, il est éteint. Le jour où Rémy voudra l'ouvrir — pour des
// vacances, pour un groupe autonome — c'est une valeur à changer, pas du code à
// réécrire. Et l'on peut l'allumer dans un navigateur pour un essai sans
// republier le site.
//
// CE N'EST PAS UNE SERRURE, et il faut le dire aussi clairement qu'on l'a dit
// du verrou de classe : un élève qui ouvre les outils du navigateur passe
// outre. C'est une PORTE, au sens où l'on dit qu'une salle a une porte — elle
// dit par où l'on entre, elle n'arrête pas qui veut vraiment entrer autrement.
// Ce qui est réellement tenu est du côté du serveur.

import { state } from './state.js';
import { getActiveProfile } from './profile.js';
// Lecture SEULE d'un cache déjà rempli : pas de cycle d'import, et pas de
// requête cachée derrière un appel qui a l'air gratuit.
import { reglageSite } from './reglagesSite.js';

/**
 * LE MODE LIBRE, QUAND IL N'Y A PAS DE SERVEUR DU TOUT.
 *
 * Ce n'est plus LE réglage — c'est le repli. Le vrai vit sur le serveur, et le
 * professeur le tient par un bouton de sa zone (voir `core/reglagesSite.js` et
 * la route `/reglages`). Cette constante ne sert que là où il n'y a personne à
 * qui demander : un AtoutMath posé sur une clé, un poste hors ligne au premier
 * démarrage.
 */
export const MODE_LIBRE = false;

const CLE_ESSAI = 'atoutmath-mode-libre';

/**
 * L'INTERRUPTEUR, ET SES TROIS AUTORITÉS.
 *
 *   1. LA DÉROGATION LOCALE (`atoutmath-mode-libre`) gagne sur tout, et c'est
 *      voulu : c'est l'outil de celui qui essaie. Rémy regarde l'écran de
 *      l'élève sans changer ce que trente élèves voient.
 *   2. LE SERVEUR — le bouton de la zone professeur. C'est le vrai réglage, et
 *      il vaut pour tout le monde.
 *   3. LA CONSTANTE DU CODE, quand le serveur n'a jamais répondu.
 *
 * `reglageSite` ne va PAS sur le réseau : elle lit ce que la dernière réponse a
 * laissé. Cette fonction est appelée à chaque dessin d'écran ; elle doit coûter
 * une lecture de mémoire, pas une requête.
 */
export function modeLibre() {
    try {
        const v = window.localStorage.getItem(CLE_ESSAI);
        if (v === '1') return true;
        if (v === '0') return false;
    } catch (e) { /* stockage refusé : on passe à l'autorité suivante */ }
    const duServeur = reglageSite('modeLibre');
    if (typeof duServeur === 'boolean') return duServeur;
    return MODE_LIBRE;
}

/** L'élève est-il rattaché à une classe sur le serveur ? */
export function estRattache() {
    const p = getActiveProfile();
    return !!(p && p.remote && p.remote.token);
}

/**
 * A-t-il déjà un parcours à faire ?
 *
 * `state.studentPath` ne vaut quelque chose QUE si un parcours a été assigné —
 * il se recalcule depuis le journal et rend `null` sinon. Sa seule présence
 * suffit donc à répondre.
 */
export function aUneSeance() {
    return !!state.studentPath;
}

/**
 * FAUT-IL MONTRER LA PORTE ?
 *
 * Non pour le professeur — c'est son logiciel, il n'a pas à se présenter à sa
 * propre porte. Non si l'élève a déjà de quoi travailler : le rattachement tient
 * d'une séance à l'autre, et redemander son prénom chaque matin serait une
 * marche de plus pour rien. Non enfin si un code est déjà dans l'adresse — le
 * parcours s'ouvre tout seul, la porte n'aurait le temps que de clignoter.
 */
export function portailNecessaire() {
    if (state.isTeacherMode) return false;
    if (estRattache() || aUneSeance()) return false;
    try {
        if (new URLSearchParams(window.location.search).get('code')) return false;
    } catch (e) { /* pas d'URL lisible : on montre la porte */ }
    return true;
}

/**
 * L'ADRESSE DE L'API, DÉDUITE DE CELLE DE LA PAGE.
 *
 * Le dépôt se dépose à la racine : le site élève est à `/`, l'API à `/api`.
 * Servi depuis un sous-dossier (`/atoutmath/`), on suit le même chemin. En
 * développement, la page est sur un port et l'API sur un autre : on garde alors
 * ce que la synchronisation connaît déjà, d'où le paramètre.
 *
 * ELLE VIT DANS LE NOYAU ET NON DANS LA PORTE D'ENTRÉE, parce que le verrou du
 * professeur en a besoin lui aussi — et qu'un module du noyau qui importerait
 * une page d'interface prendrait tout le portail avec lui.
 */
export function adresseApiDeduite(cfgConnue = '') {
    if (cfgConnue) return cfgConnue;
    const base = window.location.pathname.replace(/\/[^/]*$/, '');
    return window.location.origin + (base === '/' ? '' : base) + '/api';
}
