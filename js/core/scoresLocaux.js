// LE TABLEAU DES SCORES, RANGÉ QUELQUE PART — la couche de persistance.
//
// `core/tableauScores.js` sait CLASSER ; ce module-ci sait où poser le
// résultat. La séparation n'est pas de la coquetterie : c'est elle qui permet
// de tester le classement sans navigateur, et de brancher un jour le tableau
// d'établissement — « on pourrait faire un tableau de Top Score dans toute la
// base de données d'un établissement », dit Rémy — en ne remplaçant QUE ce
// fichier.
//
// LE STOCKAGE EST GLOBAL, PAS PAR PROFIL. C'est le point important, et il est
// délibéré : un tableau des records n'a d'intérêt que s'il montre les autres.
// Rangé dans l'espace d'un élève, chacun n'y verrait que lui-même, ce qui est
// exactement le contraire de ce qu'on demande. `globalStore` est l'espace
// commun du poste, celui que tous les profils partagent.
//
// CE N'EST PAS ENCORE L'ÉTABLISSEMENT, et il ne faut pas le laisser croire :
// c'est le tableau de CE poste. L'écran le dit en toutes lettres.

import { globalStore } from './store.js';
import { getActiveProfile } from './profile.js';
import { classer, ajouterScore, TAILLE_TABLEAU } from './tableauScores.js';

const cle = (jeu) => `scores:${jeu}`;

/** Le nom sous lequel le joueur courant entre au tableau. */
export function nomDuJoueur() {
    const p = getActiveProfile();
    return (p && String(p.name || '').trim()) || 'Élève';
}

/** Le tableau d'un jeu, déjà classé. Jamais d'exception : au pire, il est vide. */
export async function lireTableau(jeu, taille = TAILLE_TABLEAU) {
    try {
        return classer(await globalStore.get(cle(jeu)), taille);
    } catch {
        // Un stockage indisponible ne doit pas empêcher de JOUER. Le tableau
        // est un agrément ; la partie, elle, doit se dérouler.
        return [];
    }
}

/**
 * Enregistre une partie et rend le tableau qui en résulte.
 *
 * @returns {Promise<{table: Array, rang: number, record: boolean}>}
 */
export async function enregistrerScore(jeu, score, quand = Date.now()) {
    const partie = { qui: nomDuJoueur(), score, quand };
    let avant = [];
    try { avant = (await globalStore.get(cle(jeu))) || []; } catch { avant = []; }
    const r = ajouterScore(avant, partie);
    try {
        // ON RANGE LE TABLEAU CLASSÉ, pas la liste brute qui s'allonge. Une
        // partie par ligne finirait par faire des milliers d'entrées dont
        // neuf cent quatre-vingt-dix-neuf ne s'afficheront jamais.
        await globalStore.set(cle(jeu), r.table);
    } catch { /* on a quand même de quoi afficher le tableau de cette partie */ }
    return r;
}
