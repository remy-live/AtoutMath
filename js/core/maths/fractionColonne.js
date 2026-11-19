// UNE FRACTION S'ÉCRIT EN COLONNE, PARTOUT ET SANS EXCEPTION.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 19 novembre : « pour la trigonométrie dans les réponses utilise des
// fractions en colonne d'ailleurs, JE NE VEUX QUE DES FRACTIONS EN COLONNES. »
//
// Et il l'avait déjà demandé le 3 novembre, pour une autre activité : « dans la
// réponse montre moi donner la fraction sous forme de fraction colonne »
// (cité dans `js/core/activities/choice.js`). Une demande qui revient deux fois
// n'est pas une préférence d'affichage : c'est une règle du logiciel, et une
// règle n'existe que si quelque chose la garde.
//
// ── POURQUOI CE N'EST PAS DE LA COQUETTERIE ──────────────────────────────
//
// « CA/BC » n'est pas une fraction : c'est une division tapée à la machine.
// Un élève de troisième écrit le numérateur AU-DESSUS d'un trait et le
// dénominateur DESSOUS — c'est ce qu'il voit au tableau, c'est ce qu'on attend
// sur sa copie, et c'est sous cette forme qu'il reconnaîtra un rapport
// trigonométrique le jour du brevet. Lui montrer l'autre écriture pendant
// l'entraînement lui apprend à reconnaître la mauvaise.
//
// ── CE QUE MESURE LE DÉPÔT, LE 19 NOVEMBRE ───────────────────────────────
//
// Soixante-quatre exercices écrivent une barre oblique quelque part. La
// plupart l'écrivent DÉJÀ en colonne — tout le chapitre des fractions sort du
// `<span class="fraction">`. Restaient une dizaine d'exercices où la barre
// s'écrit à la main, dont la trigonométrie, qui est celui que Rémy a vu.
//
// ── LE BALISAGE EST REPRIS AU CARACTÈRE PRÈS, ET C'EST NÉCESSAIRE ────────
//
// `js/core/activities/choice.js` reconnaît une fraction par une expression
// régulière qui exige LITTÉRALEMENT `<span class="fraction">` suivi de
// `<span class="fraction-num">` — c'est elle qui décide qu'une proposition
// tient dans un rond plutôt que dans une carte. `js/core/apercuChoix.js` fait
// le chemin inverse pour l'aperçu du professeur et pour la feuille imprimée.
// Six feuilles de style surchargent ces classes par chapitre. On n'invente
// donc aucune classe : on réutilise, et l'on n'ajoute rien dessus.

const ECHAPPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const echapper = (t) => String(t).replace(/[&<>"]/g, (c) => ECHAPPES[c]);

/**
 * LA FRACTION EMPILÉE. Les deux étages sont ÉCHAPPÉS : ce sont des valeurs,
 * jamais du balisage.
 */
export const fractionColonne = (haut, bas) => '<span class="fraction">'
    + `<span class="fraction-num">${echapper(haut)}</span>`
    + `<span class="fraction-den">${echapper(bas)}</span></span>`;

// CE QUI RESSEMBLE À UNE FRACTION, ET CE QUI N'EN EST PAS UNE.
//
// Le motif n'attrape qu'un numérateur et un dénominateur SIMPLES : un nombre
// (décimal admis, virgule ou point) ou un nom de côté en lettres majuscules —
// « AB », « EF », « x ». C'est exactement ce qu'on écrit en collège, et c'est
// ce qui laisse tranquilles les trois choses qu'il ne faut SURTOUT pas
// toucher :
//
//   · « (DE) // (CB) », les droites parallèles de Thalès — deux barres, et le
//     motif en exige une seule, encadrée d'espaces facultatifs mais pas d'une
//     autre barre ;
//   · « 12 km/h », une unité composée : le dénominateur « h » est en
//     minuscules, et une unité ne s'empile pas au tableau ;
//   · « g6/3/1/2/5 », la sérialisation d'une grille de sudoku, qui voyage dans
//     `answer` et ne s'affiche jamais — trois barres de suite, donc écartée.
const COTE = String.raw`(?:\d+(?:[.,]\d+)?)|(?:[A-Z]['′]?[A-Z]?['′]?)`;
const FRACTION = new RegExp(
    '(^|[\\s(=≈<>+×÷−-])(' + COTE + ')\\s*/\\s*(' + COTE + ')(?![\\w/.,])', 'g');

/**
 * ÉCRIT EN COLONNE LES FRACTIONS D'UN TEXTE ORDINAIRE.
 *
 * Tout ce qui n'est pas une fraction est ÉCHAPPÉ : la fonction rend du HTML à
 * partir d'un texte, et c'est elle qui décide de ce qui devient du balisage.
 * Un générateur peut donc lui passer sa phrase telle qu'il la pense —
 * « sin(F) = DE / EF » — sans se demander ce qui doit être protégé.
 *
 * @param {string} texte
 * @returns {string} du HTML
 */
export function enColonnes(texte) {
    const t = String(texte == null ? '' : texte);
    let sortie = '', reste = 0;
    FRACTION.lastIndex = 0;
    let m;
    while ((m = FRACTION.exec(t)) !== null) {
        sortie += echapper(t.slice(reste, m.index)) + echapper(m[1])
            + fractionColonne(m[2], m[3]);
        reste = m.index + m[0].length;
    }
    return sortie + echapper(t.slice(reste));
}

/** Y a-t-il encore une fraction écrite EN LIGNE dans ce texte ? */
export const porteUneFractionEnLigne = (texte) => {
    FRACTION.lastIndex = 0;
    return FRACTION.test(String(texte == null ? '' : texte));
};

// ── CE QU'UN LIBELLÉ DE PROPOSITION A LE DROIT DE CONTENIR ───────────────
//
// `js/core/activities/choice.js` pose ses libellés par `innerHTML` depuis
// toujours : une proposition PEUT porter du balisage, et c'est ainsi que les
// fractions du chapitre s'empilent. `numeric.js`, lui, échappait tout — d'où
// « sin(F) = DE / EF » en trigonométrie, écrit à plat.
//
// ON NE PASSE PAS NUMERIC.JS EN `innerHTML` BRUT POUR AUTANT. Les libellés
// viennent des générateurs du dépôt, donc du code qu'on écrit ; mais une
// activité qui pose n'importe quel balisage reçu est une porte qu'on ouvre
// sans raison. On échappe tout, puis ON REND LEUR FORME aux seules balises
// dont on a besoin : la fraction empilée et l'exposant. La liste est courte
// exprès, et chaque ajout devra s'écrire ici.
// LES GUILLEMETS SONT ÉCHAPPÉS EUX AUSSI — `"` devient `&quot;` —, donc le
// motif doit chercher la forme ÉCHAPPÉE au complet. Premier jet : je cherchais
// `&lt;span class="fraction"&gt;` avec de vrais guillemets. Il ne trouvait
// jamais rien, et tous les libellés sortaient à plat — c'est-à-dire
// exactement ce qu'on venait de corriger, sans qu'aucune erreur ne le dise.
const RENDUES = [
    [/&lt;span class=&quot;fraction&quot;&gt;/g, '<span class="fraction">'],
    [/&lt;span class=&quot;fraction-num&quot;&gt;/g, '<span class="fraction-num">'],
    [/&lt;span class=&quot;fraction-den&quot;&gt;/g, '<span class="fraction-den">'],
    [/&lt;sup&gt;/g, '<sup>'],
    [/&lt;\/span&gt;/g, '</span>'],
    [/&lt;\/sup&gt;/g, '</sup>']
];

/**
 * LE HTML D'UN TEXTE À MONTRER — et c'est ICI que la règle devient vraie
 * pour tout le catalogue d'un coup.
 *
 * DEUX CAS, ET UN SEUL POINT D'ENTRÉE :
 *
 *   · le texte porte DÉJÀ une fraction empilée (tout le chapitre des
 *     fractions sort du `<span class="fraction">`) : on lui rend sa forme et
 *     l'on ne touche à rien d'autre ;
 *   · le texte est ordinaire et porte une barre oblique — « sin(F) = DE / EF » :
 *     on l'empile.
 *
 * POURQUOI PAS LES DEUX À LA FOIS : empiler À L'INTÉRIEUR d'un balisage déjà
 * posé demanderait de savoir où commencent et finissent les balises, c'est-à-
 * dire d'écrire un analyseur de HTML en expression régulière. Les deux cas ne
 * se rencontrent pas — un générateur qui empile le fait partout, un générateur
 * qui écrit à plat aussi — et quand ils se rencontreront, c'est le premier qui
 * gagne : rien ne se perd, une fraction reste à plat.
 *
 * ON LA POSE DANS LA COUCHE D'AFFICHAGE, PAS DANS LES GÉNÉRATEURS. Rémy veut
 * la règle PARTOUT ; écrite ici, elle vaut pour les soixante-quatre exercices
 * qui écrivent une barre oblique, y compris ceux qu'on n'a pas encore écrits.
 * Et `explanation` reste du TEXTE : c'est lui qui part dans le PDF, dans le
 * carnet d'erreurs et dans la voix, où une balise n'aurait aucun sens.
 */
export function afficherEnColonnes(texte) {
    const t = String(texte == null ? '' : texte);
    return t.includes('class="fraction"') ? htmlDeLibelle(t) : enColonnes(t);
}

/**
 * LE HTML D'UN LIBELLÉ DE PROPOSITION.
 *
 * @param {string} libelle tel que le générateur l'a écrit
 * @returns {string} du HTML sûr : tout échappé, sauf la fraction et l'exposant
 */
export function htmlDeLibelle(libelle) {
    let t = echapper(String(libelle == null ? '' : libelle));
    for (const [motif, vrai] of RENDUES) t = t.replace(motif, vrai);
    // UNE BALISE FERMANTE RENDUE SANS SON OUVRANTE CASSE LA PAGE : si le
    // compte n'y est pas, on renonce et l'on rend le texte échappé. Mieux vaut
    // une fraction à plat qu'un bouton qui avale la moitié de l'écran.
    const ouvrants = (t.match(/<span|<sup/g) || []).length;
    const fermants = (t.match(/<\/span>|<\/sup>/g) || []).length;
    return ouvrants === fermants ? t : echapper(String(libelle == null ? '' : libelle));
}
