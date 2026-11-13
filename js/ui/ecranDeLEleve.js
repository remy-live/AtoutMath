// L'ÉCRAN DE L'ÉLÈVE : plein écran, et rien d'autre que le travail.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « on peut aussi envisager que ce soit plein écran (en option là où on
// choisit le thème) où l'élève n'a pas accès à son profil ».
//
// DEUX CHOSES EN UNE, ET ELLES VONT ENSEMBLE : une tablette de classe qu'on
// pose devant un élève pour quarante minutes. On veut l'écran entier — la barre
// d'adresse et les onglets mangent la place au moment où l'on en a le plus
// besoin — et on ne veut pas qu'il parte visiter son profil pendant l'exercice.
//
// ── CE QUE CE MODE N'EST PAS ───────────────────────────────────────────────
//
// CE N'EST PAS UN VERROU. Un navigateur se quitte, un onglet se change, et
// aucune page web ne peut l'empêcher — prétendre le contraire serait mentir au
// professeur. C'est un écran RANGÉ : ce qui n'a rien à faire là pendant l'heure
// n'est pas affiché. La différence compte le jour où quelqu'un s'étonnera qu'un
// élève ait réussi à sortir.
//
// ET IL NE S'APPLIQUE JAMAIS AU PROFESSEUR. Rémy règle cela pour ses classes
// depuis sa propre zone ; s'il perdait son onglet « Profil » en l'allumant, il
// l'éteindrait aussitôt et pour de bon. Le mode regarde donc `teacher-mode`
// avant toute chose.
//
// ── POURQUOI LE PLEIN ÉCRAN SE DEMANDE AU PREMIER GESTE ────────────────────
//
// Parce que les navigateurs le refusent autrement. `requestFullscreen` n'est
// accordé que pendant un geste de l'utilisateur ; appelé au chargement, il
// échoue en silence. On attend donc le premier clic ou le premier doigt posé —
// c'est-à-dire le moment où l'élève commence —, puis on ne redemande plus : un
// élève qui SORT du plein écran exprès ne doit pas s'y voir renvoyé à chaque
// clic, ce qui ferait un écran qui se débat.

import { reglageSite } from '../core/reglagesSite.js';
import { basculerPleinEcran, estEnPleinEcran, pleinEcranNatifPossible } from './fullscreen.js';

/** La valeur du réglage de site, telle que le professeur l'a posée. */
export const KIOSQUE = 'kiosque';

/**
 * CE MODE EST-IL DEMANDÉ POUR CET ÉCRAN-CI ?
 *
 * `reglageSite` rend `null` quand le serveur n'a jamais répondu — hors ligne,
 * installation sans serveur — et `null` n'est pas « non » : c'est « on ne sait
 * pas ». Ici les deux mènent au même écran, celui de toujours, et c'est le bon
 * repli : on ne range pas l'écran d'un élève sur une supposition.
 */
export function modeKiosque() {
    if (typeof document === 'undefined') return false;
    if (document.body && document.body.classList.contains('teacher-mode')) return false;
    return reglageSite('ecranDeLEleve') === KIOSQUE;
}

let gesteEcoute = false;

/**
 * Pose (ou retire) le mode sur la page. Appelable autant de fois qu'on veut :
 * les réglages du site arrivent du serveur APRÈS le premier dessin, et c'est
 * normal — on dessine avec ce qu'on sait, puis on corrige.
 */
export function appliquerEcranDeLEleve() {
    if (typeof document === 'undefined' || !document.body) return false;
    const actif = modeKiosque();
    document.body.classList.toggle('ecran-kiosque', actif);
    if (!actif || !pleinEcranNatifPossible() || gesteEcoute) return actif;
    gesteEcoute = true;
    // UNE SEULE FOIS, AU PREMIER GESTE. `once: true` retire l'écouteur tout
    // seul : sans lui, chaque clic rappellerait le plein écran et l'élève qui
    // en sort exprès s'y verrait renvoyé aussitôt.
    const entrer = () => { if (!estEnPleinEcran()) basculerPleinEcran(true); };
    document.addEventListener('pointerdown', entrer, { once: true });
    document.addEventListener('keydown', entrer, { once: true });
    return actif;
}
