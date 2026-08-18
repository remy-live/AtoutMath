// ANNULER, REFAIRE.
//
// Monter un parcours, c'est essayer : on verse un chapitre entier, on regarde,
// on en retire la moitié, on change d'avis. Sans retour en arrière, chaque
// essai coûte trop cher pour être tenté — et un « Nouveau parcours » cliqué de
// travers efface une demi-heure de travail sans rien demander.
//
// Une pile d'ÉTATS COMPLETS, et non une liste d'actions inversables. Un
// parcours pèse quelques kilo-octets ; inverser chaque geste demanderait
// d'écrire — et de tenir juste — l'inverse de chacun, ce qui est exactement le
// genre de code qui se désaccorde à la première fonctionnalité suivante.
//
// Le module est pur : il ne connaît ni le parcours, ni le DOM. On lui donne
// des états, il les rend.

/** Au-delà, la pile mange de la mémoire pour des retours que personne ne fait. */
const PROFONDEUR = 60;

function cloner(etat) {
    return JSON.parse(JSON.stringify(etat));
}

function memeEtat(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * @param {*} etatInitial
 * @param {{max?: number}} [options]
 */
export function creerHistorique(etatInitial, { max = PROFONDEUR } = {}) {
    let pile = [cloner(etatInitial)];
    let curseur = 0;

    return {
        /**
         * Retenir un nouvel état.
         *
         * Un état identique au précédent n'est PAS retenu : l'appelant nous
         * appelle après chaque rendu, et un rendu se déclenche aussi quand on
         * choisit une étape — sans quoi il faudrait dix « annuler » pour
         * défaire un seul ajout.
         *
         * @returns {boolean} vrai si quelque chose a été retenu
         */
        enregistrer(etat) {
            if (memeEtat(etat, pile[curseur])) return false;
            // On repart de l'état courant : ce qui avait été annulé puis
            // remplacé par autre chose n'est plus rattrapable, comme partout.
            pile = pile.slice(0, curseur + 1);
            pile.push(cloner(etat));
            if (pile.length > max) pile.shift();
            curseur = pile.length - 1;
            return true;
        },

        /** @returns {*|null} l'état d'avant, ou `null` s'il n'y en a pas. */
        annuler() {
            if (curseur === 0) return null;
            curseur--;
            return cloner(pile[curseur]);
        },

        /** @returns {*|null} l'état qu'on venait d'annuler, ou `null`. */
        refaire() {
            if (curseur >= pile.length - 1) return null;
            curseur++;
            return cloner(pile[curseur]);
        },

        peutAnnuler() { return curseur > 0; },
        peutRefaire() { return curseur < pile.length - 1; },

        /** L'état courant, tel que la pile le connaît. */
        courant() { return cloner(pile[curseur]); },

        /** Repartir de zéro — au chargement d'un autre parcours, par exemple. */
        reinitialiser(etat) {
            pile = [cloner(etat)];
            curseur = 0;
        },

        taille() { return pile.length; }
    };
}
