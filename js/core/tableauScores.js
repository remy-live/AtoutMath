// LE TABLEAU DES MEILLEURS SCORES — module pur.
//
// Rémy : « pour le Math Crush, c'est un jeu, ne mets pas la solution des
// opérations 🙂 on peut plutôt faire un certain temps avec des vies et le but
// c'est de faire un méga score. ET on pourrait faire un tableau de Top Score
// dans toute la base de données d'un établissement. »
//
// LE TABLEAU D'ÉTABLISSEMENT N'EXISTE PAS ENCORE, et il serait malhonnête de
// faire semblant : il suppose un serveur, des comptes, une classe rattachée —
// tout ce que l'application ne fait justement pas aujourd'hui, puisqu'elle
// tourne hors ligne. Ce module tient donc le tableau LOCAL, celui des profils
// de ce poste, et il le tient sous la forme exacte qu'un tableau
// d'établissement aurait : une liste d'entrées { qui, score, quand }. Le jour
// où le serveur existera, il n'y aura qu'à verser ses entrées dans la même
// fonction — le classement, lui, sera déjà écrit et déjà testé.
//
// Pur : ni DOM, ni stockage, ni date du jour. Le temps entre par l'argument,
// ce qui rend le classement reproductible dans un test.

/** Combien de lignes un tableau garde. Au-delà, on ne les lit plus. */
export const TAILLE_TABLEAU = 10;

/**
 * UNE SEULE LIGNE PAR JOUEUR, SON MEILLEUR SCORE.
 *
 * C'est ce qui sépare un tableau des records d'un journal de parties. Un élève
 * qui joue vingt fois occuperait sinon les dix lignes à lui seul, et le
 * tableau ne dirait plus rien de la classe — ce qui est pourtant tout son
 * intérêt : on y cherche les AUTRES.
 *
 * À score égal, la plus ANCIENNE entrée gagne : c'est celle qui a établi le
 * record. Battre un record demande de faire mieux, pas de refaire pareil.
 */
export function classer(entrees, taille = TAILLE_TABLEAU) {
    const parJoueur = new Map();
    for (const e of entrees || []) {
        // UN SCORE ABSENT N'EST PAS UN SCORE DE ZÉRO. `Number(null)` vaut 0 et
        // `Number.isFinite(0)` vaut vrai : sans ce garde-fou, une entrée
        // abîmée entrait au tableau à zéro point et volait sa ligne à
        // quelqu'un qui avait joué.
        if (!e || e.score === null || e.score === undefined || e.score === '') continue;
        if (!Number.isFinite(Number(e.score))) continue;
        const cle = String(e.qui || '').trim() || '?';
        const net = { qui: cle, score: Math.max(0, Math.round(Number(e.score))), quand: Number(e.quand) || 0 };
        const vu = parJoueur.get(cle);
        if (!vu || net.score > vu.score || (net.score === vu.score && net.quand < vu.quand)) {
            parJoueur.set(cle, net);
        }
    }
    return [...parJoueur.values()]
        .sort((a, b) => (b.score - a.score) || (a.quand - b.quand) || a.qui.localeCompare(b.qui))
        .slice(0, Math.max(1, taille));
}

/**
 * Le tableau après une partie.
 *
 * @returns {{table: Array, rang: number, record: boolean}}
 *   `rang` vaut 0 si la partie n'entre pas au tableau ; `record` dit si c'est
 *   un record PERSONNEL — le seul dont on peut féliciter quelqu'un sans
 *   risquer de le comparer à plus fort que lui.
 */
export function ajouterScore(entrees, partie, taille = TAILLE_TABLEAU) {
    const avant = (entrees || []).filter(e => e && String(e.qui) === String(partie.qui));
    const mieuxAvant = avant.reduce((m, e) => Math.max(m, Number(e.score) || 0), -1);
    const table = classer([...(entrees || []), partie], taille);
    const i = table.findIndex(e => e.qui === String(partie.qui) && e.score === Math.round(partie.score));
    return {
        table,
        rang: i === -1 ? 0 : i + 1,
        // Un premier score n'est pas « un record battu » : il n'y avait rien à
        // battre. On ne crie pas victoire sur une partie sans adversaire.
        record: mieuxAvant >= 0 && Math.round(partie.score) > mieuxAvant
    };
}

/**
 * LE SCORE D'UNE CHAÎNE — et pourquoi il monte si vite.
 *
 * « Le but, c'est de faire un méga score. » Un méga score suppose que les
 * chiffres puissent s'emballer : dix points par gemme donnent des parties à
 * quatre cents points, ce qui n'emballe personne. Trois leviers, tous les
 * trois sous le contrôle du joueur — sans quoi ce ne serait pas un jeu mais
 * une loterie :
 *
 *   · LA LONGUEUR DE LA CHAÎNE, au carré. Prendre cinq gemmes vaut plus du
 *     double de deux fois deux : c'est ce qui pousse à chercher le grand
 *     tracé au lieu du premier venu, et c'est exactement le calcul mental
 *     qu'on veut faire travailler.
 *   · L'ENCHAÎNEMENT. Chaque réussite d'affilée ajoute un demi-multiplicateur,
 *     jusqu'à ×5. Une erreur le remet à zéro — c'est ce qui rend une erreur
 *     coûteuse SANS punir, et ce qui fait qu'une bonne partie se joue en
 *     restant concentré plutôt qu'en allant vite.
 *   · L'OPÉRATION. Une multiplication vaut le double d'une addition.
 */
export const COMBO_MAX = 5;

export function pointsChaine({ longueur, combo = 0, mode = 'addition' }) {
    const n = Math.max(1, Math.floor(Number(longueur) || 1));
    const base = 10 * n * n;
    const mult = Math.min(COMBO_MAX, 1 + 0.5 * Math.max(0, Math.floor(Number(combo) || 0)));
    return Math.round(base * mult * (mode === 'multiplication' ? 2 : 1));
}

/** Le multiplicateur affiché, celui qui s'applique à la PROCHAINE chaîne. */
export const multiplicateur = (combo) =>
    Math.min(COMBO_MAX, 1 + 0.5 * Math.max(0, Math.floor(Number(combo) || 0)));
