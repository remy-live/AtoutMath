// LES ÉTAPES D'UN CALCUL NUMÉRIQUE — le juge de chaque ligne.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, sur les trois chapitres où le calcul tient en plusieurs lignes :
// « oui fais les ».
//
// C'EST LE FRÈRE DE `maths/etapes.js`, et il existe pour une raison précise :
// celui-là compare des POLYNÔMES, ce qui ne dit rien de √80 ni de 7/12. Ici on
// compare des VALEURS EXACTES (n/d)√r — voir `maths/valeurExacte.js` —, et
// l'égalité y est une égalité d'entiers, jamais une comparaison de flottants.
//
// ── POURQUOI L'ÉGALITÉ NE SUFFIT PAS, ICI NON PLUS ──────────────────────────
//
// Une chaîne est une suite d'ÉGALITÉS : toutes ses lignes valent la même
// chose. Un juge qui ne regarde que la valeur accepterait donc la dernière
// ligne à la place de la première, et l'étape qu'on vient d'ajouter serait
// sautable — c'est-à-dire inexistante. Du côté des polynômes, `poidsEcrit`
// compte les feuilles ; ici, chaque étape dit ce que sa FORME doit avoir :
//
//   · `carresSortis`    sous chaque racine, plus aucun carré — c'est le geste
//                       du chapitre des racines, et √20 ne passe plus pour 2√5 ;
//   · `carresDedans`    au contraire, un carré doit RESTER écrit : la ligne
//                       « √(36 × 2) » montre la décomposition, et 6√2 est la
//                       ligne d'APRÈS ;
//   · `termesMin`       autant de termes écrits que la ligne attendue — on ne
//                       réunit pas avant l'étape qui le demande ;
//   · `denomEgaux`      toutes les fractions écrites ont le même dénominateur,
//                       ce qui est exactement la première ligne d'une somme ;
//   · `sansRacineEnBas` plus de racine au dénominateur.
//
// Ni DOM ni horloge : tout se teste sous Node.

import * as fx from './formule.js';
import {
    lireExacte, memeR, valeurDe, sansCarre, radicandesEcrits, termesEcrits,
    commePuissance, memePuissance
} from './valeurExacte.js';
import { squelette } from './etapes.js';

/** L'arbre d'une saisie, ou `null` si elle ne se lit pas. */
function arbreDe(saisie) {
    const t = String(saisie == null ? '' : saisie).replace(/\s+/g, '');
    if (!t) return null;
    try { return fx.analyser(t); } catch (e) { return null; }
}

/** Les dénominateurs ÉCRITS, au premier niveau de chaque terme. */
function denominateursEcrits(n, out = []) {
    if (!n || typeof n !== 'object') return out;
    if (n.sorte === 'quotient' || n.sorte === 'division') {
        const v = valeurDe(n.bas);
        out.push(v && v.r === 1 && v.d === 1 ? v.n : null);
    }
    Object.values(n).forEach(v => {
        if (Array.isArray(v)) v.forEach(x => denominateursEcrits(x, out));
        else denominateursEcrits(v, out);
    });
    return out;
}

/**
 * LES NOMBRES LITTÉRALEMENT ÉCRITS, triés — et c'est la mesure de « on
 * regroupe, on ne calcule pas encore ».
 *
 * (4 × 2) × √(5 × 6) écrit 4, 2, 5, 6 ; 8√30 écrit 8 et 30. Les deux valent la
 * même chose, et c'est bien le problème : sans ce compte, la ligne d'arrivée
 * passerait à la place de la ligne de départ et l'étape serait sautable.
 *
 * L'ORDRE NE COMPTE PAS, et c'est voulu : √(6 × 5) × (2 × 4) est la même ligne
 * que (4 × 2) × √(5 × 6). Corriger l'ordre des facteurs enseignerait à recopier
 * une forme plutôt qu'à calculer.
 */
function nombresEcrits(n, out = []) {
    if (!n || typeof n !== 'object') return out;
    if (n.sorte === 'nombre') { out.push(Number(n.v)); return out; }
    Object.values(n).forEach(v => {
        if (Array.isArray(v)) v.forEach(x => nombresEcrits(x, out));
        else nombresEcrits(v, out);
    });
    return out;
}
const memeListe = (a, b) => a.length === b.length
    && [...a].sort((x, y) => x - y).every((v, i) => v === [...b].sort((x, y) => x - y)[i]);

/** Y a-t-il une racine SOUS une barre de fraction ? */
function racineEnBas(n) {
    if (!n || typeof n !== 'object') return false;
    if ((n.sorte === 'quotient' || n.sorte === 'division')
        && radicandesEcrits(n.bas).length) return true;
    return Object.values(n).some(v => (Array.isArray(v)
        ? v.some(racineEnBas) : racineEnBas(v)));
}

/**
 * Donne à chaque étape son juge, à partir de ce qu'elle attend.
 *
 * Chaque étape porte `montrer` — la ligne telle qu'on l'écrirait au tableau —
 * et, s'il le faut, une ou plusieurs exigences de forme. Tout le reste se
 * DÉDUIT de `montrer` : le juge ne peut donc pas se mettre à démentir la
 * correction, puisqu'ils lisent la même chaîne.
 */
export function garnirEtapesNombres(etapes) {
    return etapes.map(e => {
        const attendu = lireExacte(e.montrer, fx);
        const arbreAttendu = arbreDe(e.montrer);
        // LA MÊME LIGNE, VUE COMME UNE PUISSANCE. Au-delà de 2⁵³ un entier
        // n'est plus exact — 10⁹ × 10⁹ vaut 10¹⁸ —, et `valeurDe` rend alors
        // `null` plutôt qu'une approximation. On compare donc aussi les
        // exposants, ce qui est de toute façon ce qu'un professeur regarde :
        // Rémy, en rouge sur sa fiche, « TU ÉCRIRAS LE CALCUL ! »
        const puissanceAttendue = arbreAttendu ? commePuissance(arbreAttendu) : null;
        const termesMin = e.termesMin === false ? 0
            : (arbreAttendu ? termesEcrits(arbreAttendu) : 0);
        const nombresAttendus = arbreAttendu ? nombresEcrits(arbreAttendu) : [];
        return {
            titre: e.titre,
            montrer: e.montrer,
            // LE MOULE DE LA LIGNE — voir `squelette` dans maths/etapes.js.
            // Rémy, devant une étape et un champ vide : « je ne comprends pas
            // ce qu'il faut faire ». Le titre dit le GESTE, le moule dit la
            // FORME : √(…) ou □ × □√□ + □√□. Il se déduit de la réponse
            // attendue, donc il ne peut pas la démentir.
            modele: e.modele || squelette(e.montrer),
            aide: e.aide || '',
            note: !!e.note,
            gauche: e.gauche || '',
            // Le pavé de cette ligne : ce qu'elle peut demander de taper.
            racine: e.racine !== false,
            fraction: !!e.fraction,
            multiplication: !!e.multiplication,
            parentheses: !!e.parentheses,
            verifie: (saisie) => {
                const arbre = arbreDe(saisie);
                if (!arbre) {
                    return { juste: false,
                        pourquoi: 'Je n\'arrive pas à lire cette ligne. Écris-la avec '
                            + 'les touches.' };
                }
                const lu = valeurDe(arbre);
                const lue = commePuissance(arbre);
                if (!lu && !lue) {
                    return { juste: false,
                        pourquoi: 'Cette écriture ne se calcule pas : vérifie les '
                            + 'parenthèses et les signes.' };
                }
                // L'UNE OU L'AUTRE SUFFIT, et les deux sont EXACTES : la
                // valeur quand elle tient dans un entier sûr, l'exposant
                // quand elle n'y tient plus.
                const parValeur = !!(attendu && lu && memeR(lu, attendu));
                const parExposant = memePuissance(lue, puissanceAttendue);
                if (!parValeur && !parExposant) {
                    return { juste: false,
                        pourquoi: 'Cette ligne ne vaut pas la précédente. Une chaîne '
                            + 'd\'égalités garde la même valeur d\'un bout à l\'autre.' };
                }
                // ── LA VALEUR Y EST : RESTE LA FORME ────────────────────
                const rads = radicandesEcrits(arbre);
                if (e.carresSortis && rads.some(r => r === null || !sansCarre(r))) {
                    return { juste: false,
                        pourquoi: 'C\'est bien égal, mais il reste un carré sous une '
                            + 'racine : on le sort avant d\'aller plus loin.' };
                }
                if (e.carresDedans && !rads.some(r => r !== null && !sansCarre(r))) {
                    return { juste: false,
                        pourquoi: 'Ici on MONTRE le carré sous la racine, on ne le sort '
                            + 'pas encore : c\'est la ligne d\'après.' };
                }
                if (termesMin > 1 && termesEcrits(arbre) < termesMin) {
                    return { juste: false,
                        pourquoi: `On attend ${termesMin} termes à cette ligne : c'est `
                            + 'déjà réduit, et c\'est la ligne d\'APRÈS.' };
                }
                if (e.denomEgaux) {
                    const d = denominateursEcrits(arbre).filter(x => x !== null);
                    if (d.length < 2 || new Set(d).size !== 1) {
                        return { juste: false,
                            pourquoi: 'À cette ligne, les deux fractions doivent porter '
                                + 'le MÊME dénominateur.' };
                    }
                }
                if (e.memesNombres && !memeListe(nombresEcrits(arbre), nombresAttendus)) {
                    return { juste: false,
                        pourquoi: 'À cette ligne on REGROUPE, on ne calcule pas encore : '
                            + 'on doit retrouver les mêmes nombres que dans l\'énoncé.' };
                }
                if (e.avecRacine && !rads.length) {
                    return { juste: false,
                        pourquoi: 'La racine est encore là à cette ligne : on calcule '
                            + 'd\'abord ce qui est SOUS la barre.' };
                }
                if (e.sansRacineEnBas && racineEnBas(arbre)) {
                    return { juste: false,
                        pourquoi: 'Il reste une racine au dénominateur : c\'est elle '
                            + 'qu\'on fait disparaître à cette ligne.' };
                }
                return { juste: true };
            }
        };
    });
}
