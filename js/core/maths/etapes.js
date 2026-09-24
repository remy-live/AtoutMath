// LES ÉTAPES D'UNE CHAÎNE D'ÉGALITÉS — le juge de chaque ligne.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour le a−b réduit, c'est pas clair, il faudrait l'écrire d'abord
// totalement en ligne non factorisé puis réduire. » Puis, sur le
// développement : « on peut proposer une ligne pour pouvoir le taper. »
//
// Les deux chapitres de calcul littéral écrivent la même chose : la trace du
// tableau, une suite de « = … », chacune avec ce qu'on vient de faire.
// Factoriser et développer sont le même geste dans les deux sens ; leurs
// chaînes se jugent donc de la même façon, et ce fichier est cette façon.
//
// IL NE SAIT RIEN DES DEUX CHAPITRES. Il reçoit ce qu'une étape attend, et
// rend de quoi juger ce qu'on tape — les barreaux, eux, restent chez eux.

import * as fx from './formule.js';
import * as P from './polynome.js';

/**
 * Donne à chaque étape son juge, à partir de ce qu'elle attend.
 *
 * ON COMPARE DES POLYNÔMES, comme pour la réponse entière : « 3 + x » dit la
 * même chose que « x + 3 », et corriger l'ordre des termes enseignerait à
 * recopier une forme plutôt qu'à calculer.
 *
 * L'OPPOSÉ A SON MESSAGE À LUI, et il le mérite. Mathématiquement, a = 6 − 5x
 * et a = 5x − 6 conduisent tous deux à une factorisation juste — les deux
 * facteurs changent de signe ensemble. Mais l'énoncé ÉCRIT (6 − 5x)², et la
 * convention du chapitre est de lire a tel quel ; surtout, laisser passer
 * l'opposé casserait la suite, où a − b et a + b sont attendus dans ce
 * sens-là. On refuse donc, mais en disant laquelle des deux erreurs c'est.
 */
/**
 * Combien de signes une écriture porte — nombres et lettres comptés à la
 * feuille de l'arbre.
 *
 * C'EST LA MESURE DE « SANS RÉDUIRE ». Une ligne de la chaîne est une
 * ÉGALITÉ : (6 − 5x − 1)(6 − 5x + 1) et (5 − 5x)(7 − 5x) valent la même
 * chose, et le juge des polynômes accepterait donc la seconde là où l'on
 * demande la première. L'étape « sans rien réduire » serait sautable, et
 * c'est précisément l'étape que Rémy a demandé d'ajouter : « il faudrait
 * l'écrire d'abord totalement en ligne non factorisé puis réduire ».
 *
 * On compte donc les FEUILLES. Six pour la ligne non réduite, quatre pour la
 * réduite : la seconde ne passe plus à la place de la première. Le compte
 * n'est pas une empreinte — (6 + 1 − 5x)(6 − 1 − 5x) a le même poids et
 * passe, ce qui est juste : l'ordre des termes n'est pas une faute.
 */
export function poidsEcrit(arbre) {
    let n = 0;
    const voir = (x) => {
        if (!x || typeof x !== 'object') return;
        if (x.sorte === 'nombre' || x.sorte === 'lettre' || x.sorte === 'brut') { n++; return; }
        Object.values(x).forEach(v => {
            if (Array.isArray(v)) v.forEach(voir); else voir(v);
        });
    };
    voir(arbre);
    return n;
}

/**
 * LE SQUELETTE D'UNE LIGNE : sa FORME, sans ses nombres.
 *
 * RÉMY, devant fac-3 pas à pas, l'énoncé (9 − 6x)² − 25 à l'écran, la ligne
 * « On écrit les deux carrés » en cours et le champ vide : « je ne comprends
 * pas ce qu'il faut faire ».
 *
 * Le titre dit le GESTE, il ne dit pas la FORME — et c'est la forme qui
 * manque quand on est devant un champ vide. « On écrit les deux carrés » ne
 * dit pas qu'on attend quelque chose comme (…)² − □² ; l'élève, lui, ne peut
 * pas le deviner, et il est bloqué non par la mathématique mais par la
 * consigne.
 *
 * ON MONTRE DONC LE MOULE, ET RIEN DE PLUS. Les parenthèses et les puissances
 * restent — ce sont elles, la forme —, les nombres deviennent des cases. Le
 * squelette de (9 − 6x)² − 5² est (…)² − □² : il dit tout ce qu'il faut pour
 * commencer et ne donne aucune réponse.
 *
 * UN MOULE, PAS UNE CORRECTION : ce qui est entre parenthèses se replie en un
 * seul « … », faute de quoi (…  − …)² livrerait le nombre de termes.
 */
export function squelette(texte) {
    let t = String(texte == null ? '' : texte);
    // Les parenthèses, de la plus intérieure à la plus extérieure.
    for (let tour = 0; tour < 8 && /\([^()]*\)/.test(t); tour++) {
        t = t.replace(/\([^()]*\)/g, '(\u2026)');
    }
    // Ce qui reste de nombres et de lettres devient une case. Les exposants
    // écrits en chiffres hauts ne sont pas des caractères de ce jeu-là : ils
    // survivent, et c'est voulu — le carré fait partie de la forme.
    return t.replace(/[0-9A-Za-z]+/g, '\u25a1');
}

export function garnirEtapes(etapes) {
    return etapes.map(e => {
        // Le poids attendu se LIT sur la réponse de l'étape : aucun nombre
        // écrit à la main, donc rien à remettre d'accord quand un barreau
        // change.
        let poidsMin = 0;
        if (e.sansReduire) {
            try { poidsMin = poidsEcrit(fx.analyser(e.montrer)); } catch (err) { poidsMin = 0; }
        }
        return {
            titre: e.titre,
            formeProduit: !!e.formeProduit,
            gauche: e.gauche || '',
            apart: !!e.apart,
            note: !!e.note,
            montrer: e.montrer,
            // LE MOULE DE LA LIGNE — voir `squelette`. Une étape peut le poser
            // elle-même si sa forme se dit mieux autrement ; sinon il se
            // déduit de la réponse attendue, donc il ne peut pas se démentir.
            modele: e.modele || (e.note ? '' : squelette(e.montrer)),
            aide: e.aide || '',
            parentheses: !!e.parentheses,
            verifie: (saisie) => {
                let arbre = null;
                try {
                    arbre = fx.analyser(String(saisie).replace(/\s+/g, '')
                        .replace(/(x)(\d)/g, '$1^$2'));
                } catch (err) { arbre = null; }
                const lu = P.lireSaisie(saisie, fx);
                if (!lu) {
                    return { juste: false,
                        pourquoi: 'Je n\'arrive pas à lire cette expression. Écris-la '
                            + 'avec les touches.' };
                }
                const attendu = P.lireSaisie(e.montrer, fx);
                if (attendu && P.egaux(lu, attendu)) {
                    // UNE LIGNE QUI DEMANDE UN PRODUIT SE JUGE SUR SA FORME,
                    // PAS SUR SON POIDS.
                    //
                    // « (x + 4)² = (x + 4)(x + 4) » est la première ligne du
                    // barreau du carré, et c'est elle qui fait apparaître les
                    // quatre produits. Le compte des signes n'y sert à rien :
                    // la réponse réduite, x² + 8x + 16, en porte CINQ contre
                    // quatre — elle passait donc à la place de la ligne
                    // qu'elle est censée venir après. Ce qu'on demande ici
                    // n'est pas « plus long », c'est « un produit ».
                    if (e.formeProduit && arbre) {
                        const t = arbre.sorte === 'groupe' ? arbre.dedans : arbre;
                        if (t.sorte !== 'produit' && t.sorte !== 'puissance') {
                            return { juste: false,
                                pourquoi: 'On attend ici un PRODUIT — deux parenthèses '
                                    + 'multipliées —, pas une somme.' };
                        }
                    }
                    if (poidsMin && arbre && poidsEcrit(arbre) < poidsMin) {
                        return { juste: false,
                            pourquoi: 'C\'est déjà réduit — et c\'est la ligne d\'APRÈS. '
                                + 'Ici on recopie tout, sans rien regrouper.' };
                    }
                    return { juste: true };
                }
                if (attendu && P.egaux(lu, P.opposeP(attendu))) {
                    return { juste: false,
                        pourquoi: 'C\'est l\'OPPOSÉ de ce qu\'on cherche : tous les signes '
                            + 'sont à l\'envers. Relis l\'énoncé et recopie-le tel quel.' };
                }
                return { juste: false, pourquoi: e.aide || '' };
            }
        };
    });
}
