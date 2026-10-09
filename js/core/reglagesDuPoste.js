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

// ── IL Y EN A EU DEUX, IL N'EN RESTE QU'UN, ET C'EST INSTRUCTIF ─────────────
//
// Le second réglage était celui des écritures de la symétrie : un bouton « ? »
// sur la marche « écrire », que l'appareil se rappelait d'avoir vu presser.
// Rémy l'a essayé en classe et l'a retiré — « c'est le point ? qui n'est pas
// instinctif, et qui disparaît d'ailleurs quand on clique dessus » : les bulles
// sont maintenant allumées d'emblée, et il n'y a plus rien à se rappeler.
//
// ON SUPPRIME DONC SA CLEF ET SES DEUX FONCTIONS plutôt que de les garder « au
// cas où » : un réglage que personne ne lit est un réglage dont on croira un
// jour qu'il règle quelque chose. La forme générale — `vouluSurCePoste` et
// `seSouvenirSurCePoste` — reste, elle : c'est elle qui a servi deux fois, et
// elle resservira.
//
// (La clef déjà posée chez les élèves qui ont pressé le « ? » ne gêne personne :
// plus rien ne la lit, et `localStorage` n'est pas une base de données qu'on
// migre.)
export const CLE_PAVE = 'atoutmath.pave.voulu';

/** Ce réglage a-t-il été demandé sur CET appareil ? */
export function vouluSurCePoste(cle) {
    try { return localStorage.getItem(cle) === '1'; }
    catch (e) { return false; }
}

/** L'élève a-t-il demandé le pavé sur CET appareil ? */
export const paveVoulu = () => vouluSurCePoste(CLE_PAVE);

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

export const POUR_ESSAI = { CLE: CLE_PAVE };
