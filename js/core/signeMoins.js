// IL N'Y A QU'UN SIGNE MOINS, ET CE N'EST PAS LE TRAIT D'UNION.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// VU À L'ÉCRAN, DANS UNE SEULE PHRASE :
//
//     « On donne f(x) = 2x − 2. On part du point (0 ; -2)… »
//
// Le premier moins est le vrai (U+2212), écrit par la fonction qui compose
// l'expression. Le second est un trait d'union, parce que `${b}` sur le nombre
// −2 rend ce que JavaScript sait rendre. Les deux sont dans la même ligne, à
// vingt caractères l'un de l'autre, et ils n'ont ni la même longueur ni la
// même hauteur : le trait d'union est plus court et posé plus bas.
//
// UN PROFESSEUR DE MATHÉMATIQUES LE VOIT TOUT DE SUITE, et un élève qui recopie
// apprend que le signe moins s'écrit de deux façons.
//
// ── MESURÉ AVANT D'ÉCRIRE CE FICHIER ───────────────────────────────────────
//
// QUATRE exercices sur 244 mêlaient les deux signes dans le même énoncé ou la
// même explication — et trois d'entre eux existaient déjà :
//
//   · « Réduire une expression » : « 3a et −2a donnent a ; 3 et -1 donnent 2 » ;
//   · « Calculer avec des puissances » et sa version pas à pas :
//     « 10⁻⁸ ÷ 10⁻³ = 10^(-8 − (-3)) » — la démonstration juste au-dessus
//     écrivait pourtant « 10^(−8 − (−3)) » avec le bon signe ;
//   · « Tracer une Fonction », celui qui a fait trouver les trois autres.
//
// LES TROIS ANCIENS ONT LA MÊME CAUSE : le fichier possédait DÉJÀ sa fonction
// d'écriture, employée pour la ligne de démonstration et oubliée dans
// l'explication. La règle existait ; elle n'était pas au seul endroit où tout
// le monde passe. C'est le même défaut que `sansPlusFacultatif` a fermé pour
// le « + » facultatif, et la même conclusion : **une correction posée sur un
// seul des chemins qui mènent au même endroit ne ferme rien.**
//
// Elle vit donc ici, une fois, et `tests/catalog.test.mjs` garde pour tout le
// dépôt qu'aucun énoncé n'écrit les deux.

/** Le signe d'écriture d'un relatif isolé : « −3 », « 5 ». */
export const relatif = (n) => (n < 0 ? '−' : '') + Math.abs(n);

/**
 * Un relatif entre parenthèses quand il est NÉGATIF, nu sinon.
 *
 * « 5 + (−6) » se lit, « 5 + −6 » ne se lit pas — et c'est aussi ce qu'on
 * écrit au tableau. Mais « 5 + (6) » est une parenthèse pour rien, qui fait
 * chercher ce qu'elle protège.
 */
export const relatifEnPar = (n) => (n < 0 ? `(−${Math.abs(n)})` : String(n));

/**
 * REMPLACER LES TRAITS D'UNION QUI SERVENT DE SIGNE, dans un texte déjà écrit.
 *
 * Pour les textes composés de plusieurs morceaux dont on ne maîtrise pas tous
 * les auteurs. On ne touche qu'au tiret qui précède un chiffre ET qui suit un
 * début de texte, un blanc ou une ouvrante : « a-t-il », « c'est-à-dire » et
 * « quatre-vingts » n'ont rien à craindre, et « 10-3 » non plus — celui-là est
 * une plage de nombres ou un numéro, pas un relatif.
 */
export function avecLeVraiMoins(texte) {
    return String(texte == null ? '' : texte).replace(/(^|[\s(\[;:=])-(\d)/g, '$1−$2');
}
