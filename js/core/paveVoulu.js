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

const CLE = 'atoutmath.pave.voulu';

/** L'élève a-t-il demandé le pavé sur CET appareil ? */
export function paveVoulu() {
    try { return localStorage.getItem(CLE) === '1'; }
    catch (e) { return false; }
}

/**
 * S'en souvenir — ou l'oublier.
 *
 * ON EFFACE LA CLEF PLUTÔT QUE D'ÉCRIRE « 0 » : un réglage absent et un réglage
 * éteint se lisent pareil ici, et une clef qui traîne finit par signifier
 * quelque chose pour quelqu'un d'autre.
 */
export function seSouvenirDuPave(oui) {
    try {
        if (oui) localStorage.setItem(CLE, '1');
        else localStorage.removeItem(CLE);
    } catch (e) { /* on ouvre quand même le pavé, on ne s'en souviendra pas */ }
    return !!oui;
}

export const POUR_ESSAI = { CLE };
