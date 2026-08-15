// ÉCRIRE UN NOMBRE EN FRANÇAIS.
//
// « 62307 » ne s'écrit pas. On écrit « 62 307 », par groupes de trois chiffres,
// et ce n'est pas une coquetterie de typographe : c'est la façon dont on LIT un
// grand nombre. L'élève qui doit dire « soixante-deux mille trois cent sept »
// commence par découper de trois en trois — et s'il ne le fait pas, il lit
// « six cent vingt-trois mille sept ». Le découpage EST la leçon de numération.
//
// LA RÈGLE, telle que le programme la donne :
//
//   · la partie entière se groupe par trois EN PARTANT DE LA DROITE :
//     1 000, 62 307, 1 234 567 ;
//   · la partie décimale se groupe par trois EN PARTANT DE LA VIRGULE :
//     3,141 592 6 — les rangs se comptent depuis la virgule dans les deux sens,
//     et grouper à l'envers ferait mentir le tableau de numération ;
//   · le séparateur est une ESPACE FINE INSÉCABLE (U+202F), jamais un point.
//     Insécable, sinon un nombre se coupe en fin de ligne et l'on croit en lire
//     deux. Fine, parce qu'une espace ordinaire fait deux nombres côte à côte.
//
// On ne met JAMAIS de séparateur dans une année, un numéro de page ou un code
// postal — mais aucun de ces trois-là ne passe par ici : ce module ne sert
// qu'aux nombres de calcul.

/** L'espace fine insécable, le séparateur des milliers en français. */
export const FINE = ' ';

/**
 * Un nombre écrit comme on l'écrit à la main.
 *
 * Accepte aussi une saisie EN COURS — « 12 », « 1234, », « 1234,56 » —, parce
 * que c'est le cas d'usage principal : l'élève tape, et son nombre se groupe
 * sous ses doigts. Tout ce qui n'est pas un nombre ressort inchangé : mieux
 * vaut une chaîne intacte qu'une chaîne mutilée par une règle qui ne la
 * concernait pas.
 *
 * @param {string|number} valeur
 * @param {string} [separateur] - l'espace à insérer (une espace ordinaire pour
 *                                les PDF, dont la police ignore la fine)
 */
export function espacerMilliers(valeur, separateur = FINE) {
    const brut = String(valeur ?? '').replace(/[\s  ]/g, '');
    const m = /^([-−+]?)(\d*)([.,]?)(\d*)$/.exec(brut);
    if (!m) return String(valeur ?? '');
    const [, signe, entier, virgule, decimales] = m;
    // « \B(?=(\d{3})+(?!\d)) » : chaque position dont il reste un multiple de
    // trois chiffres à droite — et pas le tout début, d'où le \B.
    const gauche = entier.replace(/\B(?=(\d{3})+(?!\d))/g, separateur);
    const droite = decimales.replace(/(\d{3})(?=\d)/g, `$1${separateur}`);
    return `${signe}${gauche}${virgule}${droite}`;
}

/**
 * La même, pour un texte qui contient des nombres au milieu de mots.
 *
 * « 62307 = 60000 + 300 + 7 » devient « 62 307 = 60 000 + 300 + 7 ». On ne
 * touche qu'aux suites d'au moins CINQ chiffres, plus la partie décimale
 * éventuelle : au-dessous, l'écriture groupée n'apporte rien et « 1000 »
 * espacé au milieu d'une phrase se lit mal.
 *
 * @param {string} texte
 * @param {Object} [o]
 * @param {number} [o.aPartirDe] - longueur minimale de la partie entière
 * @param {string} [o.separateur]
 */
export function espacerDansTexte(texte, { aPartirDe = 4, separateur = FINE } = {}) {
    return String(texte ?? '').replace(/\d+(?:[.,]\d+)?/g, (n) => {
        const entier = n.split(/[.,]/)[0];
        if (entier.length < aPartirDe) return n;
        return espacerMilliers(n, separateur);
    });
}

/**
 * L'inverse : on retire les espaces pour comparer ou pour calculer.
 *
 * Indispensable dès qu'on écrit groupé : une réponse tapée « 62 307 » doit
 * valoir « 62307 », sans quoi l'élève a raison et la machine dit non.
 */
export const sansEspaces = (v) => String(v ?? '').replace(/[\s  ]/g, '');
