// RÉDUIRE UNE EXPRESSION AVEC DES PUISSANCES — module pur.
//
// Rémy : « j'aimerais bien un exercice pour simplifier une expression littérale
// du genre 3x² + 2x − 12x etc., mets des boutons carrés voire cube. On essaie
// d'être progressif. »
//
// SON EXEMPLE EST TOUTE LA LEÇON. « 3x² + 2x − 12x » a trois termes, et deux
// seulement se regroupent : 2x et −12x font −10x, tandis que 3x² reste seul.
// Non pas parce qu'on ne veut pas, mais parce que x² et x ne sont pas la même
// chose — x vaut 5 quand x = 5, x² en vaut 25. Les additionner reviendrait à
// ajouter des mètres à des mètres carrés.
//
// C'EST LA FAUTE LA PLUS TENACE DU CHAPITRE, et elle a deux visages :
//   · « 3x² + 2x = 5x² » ou « 5x » — on regroupe des degrés différents ;
//   · « x² + x² = x⁴ » — on confond la somme et le produit, parce qu'on se
//     souvient d'une règle sur les exposants sans se souvenir de laquelle.
// Ces deux erreurs sont les pièges de chaque question, et leur explication est
// la leçon elle-même.
//
// ET LA RÉPONSE SE TAPE, elle ne se choisit pas. « Mets des boutons carrés
// voire cube » : c'est une demande d'écriture, pas de reconnaissance. Un élève
// qui reconnaît « 3x² − 10x » parmi quatre lignes n'a pas montré qu'il savait
// l'écrire — or l'écrire est exactement ce qu'on lui demandera au contrôle.
//
// Ni DOM ni horloge : tout se teste sous Node.

/** Le vrai signe moins (U+2212), pas le trait d'union du clavier. */
export const MOINS = '−';

const CHIFFRES_HAUT = '⁰¹²³⁴⁵⁶⁷⁸⁹';
export const exposant = (n) =>
    String(n).split('').map(c => CHIFFRES_HAUT[Number(c)]).join('');

/**
 * LA PARTIE LITTÉRALE D'UN DEGRÉ. `x⁰` n'existe pas dans un cahier de
 * quatrième : le terme constant s'écrit tout court.
 */
export function partDeDegre(lettre, degre) {
    if (degre <= 0) return '';
    if (degre === 1) return lettre;
    return lettre + exposant(degre);
}

/**
 * UN TERME, ÉCRIT COMME AU CAHIER.
 *
 * Trois conventions, trois pièges classiques : le coefficient 1 ne s'écrit
 * pas, le −1 ne garde que son signe, et le 0 fait disparaître le terme.
 */
export function ecrireTerme(coef, lettre, degre) {
    const part = partDeDegre(lettre, degre);
    if (!part) return String(coef);
    if (coef === 0) return '0';
    if (coef === 1) return part;
    if (coef === -1) return MOINS + part;
    return `${coef < 0 ? MOINS : ''}${Math.abs(coef)}${part}`;
}

/**
 * UNE SOMME DE TERMES, avec ses signes bien placés.
 *
 * On n'écrit jamais « 3x² + −10x » : le signe du terme devient celui de
 * l'opération. C'est la même règle que pour les relatifs, et c'est bien la
 * même règle.
 *
 * L'ORDRE EST CELUI DES DEGRÉS DÉCROISSANTS pour la RÉPONSE, mais l'énoncé,
 * lui, garde l'ordre qu'on lui donne : un exercice où les termes arrivent déjà
 * rangés n'apprend pas à les chercher.
 */
export function ecrireSomme(termes, lettre = 'x') {
    const vivants = termes.filter(t => t.coef !== 0);
    if (!vivants.length) return '0';
    return vivants.map((t, i) => {
        if (i === 0) return ecrireTerme(t.coef, lettre, t.degre);
        return ` ${t.coef < 0 ? MOINS : '+'} ${ecrireTerme(Math.abs(t.coef), lettre, t.degre)}`;
    }).join('');
}

/**
 * RÉDUIT : on regroupe ce qui porte le MÊME degré, et rien d'autre.
 *
 * Les degrés décroissants, parce que c'est la forme sous laquelle on relira
 * l'expression toute sa scolarité — et parce qu'une réponse canonique est ce
 * qui permet de corriger sans ambiguïté.
 */
export function reduire(termes) {
    const sacs = new Map();
    for (const t of termes) sacs.set(t.degre, (sacs.get(t.degre) || 0) + t.coef);
    return [...sacs.entries()]
        .map(([degre, coef]) => ({ degre: Number(degre), coef }))
        .filter(t => t.coef !== 0)
        .sort((a, b) => b.degre - a.degre);
}

/**
 * NORMALISER UNE RÉPONSE TAPÉE, pour la comparer sans être tatillon.
 *
 * L'élève écrit avec ce qu'il a sous la main. Refuser « 3x^2-10x » parce qu'il
 * manque un espace et que le moins est un trait d'union serait corriger le
 * clavier au lieu des mathématiques. On accepte donc :
 *
 *   · `x^2`, `x2` et `x²` — les trois façons d'écrire un carré sans touche ² ;
 *   · le trait d'union à la place du vrai signe moins ;
 *   · les espaces, ou leur absence ;
 *   · les majuscules.
 *
 * ON N'ACCEPTE PAS, EN REVANCHE, UN ORDRE DIFFÉRENT NI UNE FORME NON RÉDUITE.
 * « 2x + 3x² » n'est pas « 3x² + 2x » : ranger par degrés décroissants fait
 * partie de ce qu'on apprend. Et rendre l'énoncé tel quel n'est évidemment pas
 * le réduire.
 */
export function normaliser(texte) {
    let t = String(texte == null ? '' : texte).toLowerCase().trim();
    // Les exposants Unicode d'abord : ils vont devenir des chiffres ordinaires.
    t = t.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, c => String(CHIFFRES_HAUT.indexOf(c)));
    // `x^2` et `x**2` s'écrivent comme `x2`.
    t = t.replace(/\^|\*\*/g, '');
    // Tous les traits d'union, tirets et moins Unicode deviennent le même moins.
    t = t.replace(/[-−–—]/g, '-');
    // Le × explicite disparaît : « 3 × x » et « 3x » sont la même chose ici.
    t = t.replace(/[×*·]/g, '');
    t = t.replace(/\s+/g, '');
    // « x1 » est « x » : un exposant 1 ne s'écrit pas, mais l'élève qui l'écrit
    // n'a pas fait d'erreur de mathématiques.
    t = t.replace(/([a-z])1(?![0-9])/g, '$1');
    // Un « + » de tête ne veut rien dire.
    t = t.replace(/^\+/, '');
    return t;
}

/** La réponse tapée dit-elle la même chose que la réponse attendue ? */
export const memeReponse = (donne, attendu) => normaliser(donne) === normaliser(attendu);

/**
 * CE QU'ON AURAIT OBTENU EN REGROUPANT TOUT, degrés confondus — la faute
 * numéro un, celle qu'il faut pouvoir nommer.
 *
 * Le degré retenu est celui du terme le plus haut : c'est ce que fait l'élève
 * qui « range tout dans le plus gros sac ».
 */
export function fauteToutRegrouper(termes, lettre = 'x') {
    const somme = termes.reduce((s, t) => s + t.coef, 0);
    const degre = Math.max(...termes.map(t => t.degre));
    return ecrireSomme([{ coef: somme, degre }], lettre);
}

/**
 * CE QU'ON OBTIENT EN AJOUTANT LES EXPOSANTS — la faute numéro deux.
 *
 * « x² + x² = x⁴ » : on se souvient qu'il existe une règle sur les exposants,
 * et l'on applique celle du PRODUIT à une SOMME. Le distracteur n'a de sens
 * que s'il y a au moins deux termes de même degré à confondre.
 */
export function fauteAjouterExposants(termes, lettre = 'x') {
    const reduits = reduire(termes);
    const parDegre = new Map();
    for (const t of termes) parDegre.set(t.degre, (parDegre.get(t.degre) || 0) + 1);
    const doublon = [...parDegre.entries()].find(([d, n]) => n >= 2 && d >= 1);
    if (!doublon) return null;
    const [d] = doublon;
    const memes = termes.filter(t => t.degre === d);
    // Le coefficient, lui, est bien additionné : c'est justement le mélange
    // des deux règles qui fait la faute.
    const coef = memes.reduce((s, t) => s + t.coef, 0);
    const autres = reduits.filter(t => t.degre !== d);
    // ON ÉCRIT DANS L'ORDRE OÙ UN ÉLÈVE ÉCRIRAIT. Trier par degrés décroissants
    // suffit tant que les degrés diffèrent ; ici le degré fabriqué peut tomber
    // sur celui d'un terme intact — « 3x² » et le « −10x² » de la faute — et le
    // tri laissait alors l'ordre du tableau, qui donnait « −10x² + 3x² ». Un
    // distracteur qu'on n'écrirait jamais ainsi se repère sans réfléchir, et
    // cesse d'être un distracteur. À degré égal, le terme INTACT passe devant :
    // c'est celui que l'élève avait déjà écrit.
    const faux = { coef, degre: d * memes.length, tard: 1 };
    return ecrireSomme(
        [...autres.map(t => ({ ...t, tard: 0 })), faux]
            .sort((a, b) => (b.degre - a.degre) || (a.tard - b.tard)), lettre);
}
