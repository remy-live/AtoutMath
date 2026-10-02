// LE PAVÉ, QUAND ON NE L'A PAS DEMANDÉ ET QUAND ON L'A DEMANDÉ.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour le prio-bot relatifs pourrait on éventuellement avoir une
// touche qui affiche un pavé numérique avec + - et () mais si on ne demande
// rien ne change pas le design car c'est parfait telle quel ».
//
// La dernière moitié de la phrase est la contrainte, et c'est elle qui décide
// de tout : l'écran ne bouge pas d'un pixel tant que personne n'appuie.
//
// ── POURQUOI ÇA SE GARDE ────────────────────────────────────────────────────
//
// Un élève qui a besoin du pavé en a besoin à CHAQUE question, et il y en a
// seize dans une série. Le lui redemander à chaque fois, c'est le lui refuser.
//
// ── ET POURQUOI PAR APPAREIL, ET NON PAR ÉLÈVE ──────────────────────────────
//
// C'est une façon de SAISIR, pas un réglage pédagogique : elle appartient à la
// machine sur laquelle on tape — un ordinateur sans pavé numérique, une
// tablette tenue à deux mains — et non au profil, qui voyage. Un élève qui
// passe du poste de la salle à celui du fond retrouve le réglage du POSTE, et
// c'est bien ce qu'on veut.
//
// `localStorage` PEUT JETER À LA SIMPLE LECTURE en navigation privée : on avale
// et l'on rend « non ». Le pavé s'ouvre alors à la demande, pour cette séance —
// ce qui est déjà ce qu'on demandait.

// ── DEUX RÉGLAGES, ET C'EST LE MOMENT DE LES NOMMER ENSEMBLE ────────────────
//
// Le premier était le pavé du Prio-Bot. Le second est arrivé le jour même :
// Rémy, devant la marche « écrire » de la symétrie — « là il faudrait encore
// le point d'interrogation qui donne les coordonnées du point et de la
// droite ». Même forme exactement : une touche, rien ne bouge tant qu'on ne
// l'a pas pressée, et l'appareil s'en souvient.
//
// On les range donc au même endroit plutôt que de recopier dix lignes. Deux
// est le moment : à un, c'est prématuré ; à trois, on a déjà deux copies qui
// ont divergé.
export const CLE_PAVE = 'atoutmath.pave.voulu';
export const CLE_ECRITURES = 'atoutmath.ecritures.voulues';

/** Ce réglage a-t-il été demandé sur CET appareil ? */
export function vouluSurCePoste(cle) {
    try { return localStorage.getItem(cle) === '1'; }
    catch (e) { return false; }
}

/** L'élève a-t-il demandé le pavé sur CET appareil ? */
export const paveVoulu = () => vouluSurCePoste(CLE_PAVE);

/**
 * A-t-il demandé à voir COMMENT chaque droite et chaque point s'écrivent ?
 *
 * Ce n'est pas un indice : toutes les droites disent la leur, pas seulement la
 * bonne. Savoir que (d₂) s'écrit « x = 6 » ne dit pas que (d₂) est l'axe
 * cherché — c'est une aide à la LECTURE, comme la calculatrice, et elle ne
 * coûte donc rien à la note.
 */
export const ecrituresVoulues = () => vouluSurCePoste(CLE_ECRITURES);

/**
 * S'en souvenir — ou l'oublier.
 *
 * ON EFFACE LA CLEF PLUTÔT QUE D'ÉCRIRE « 0 » : un réglage absent et un réglage
 * éteint se lisent pareil ici, et une clef qui traîne finit par signifier
 * quelque chose pour quelqu'un d'autre.
 */
export function seSouvenirSurCePoste(cle, oui) {
    try {
        if (oui) localStorage.setItem(cle, '1');
        else localStorage.removeItem(cle);
    } catch (e) { /* on ouvre quand même, on ne s'en souviendra pas */ }
    return !!oui;
}

export const seSouvenirDuPave = (oui) => seSouvenirSurCePoste(CLE_PAVE, oui);
export const seSouvenirDesEcritures = (oui) => seSouvenirSurCePoste(CLE_ECRITURES, oui);

export const POUR_ESSAI = { CLE: CLE_PAVE };
