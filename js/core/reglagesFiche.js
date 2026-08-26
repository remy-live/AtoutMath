// LES RÉGLAGES QUI ONT COURS SUR DU PAPIER.
//
// Un exercice déclare ses boutons à deux endroits : le GÉNÉRATEUR dit ce qu'il
// sait faire varier, le CATALOGUE dit ce que le professeur a le droit de
// toucher et sous quels mots. La fiche à imprimer ne prenait que le premier.
//
// Conséquence, mesurée avant d'être corrigée : cinq réglages changeaient
// vraiment la feuille sans être réglables depuis la feuille — l'histoire d'un
// logigramme, la difficulté d'un futoshiki, le niveau de Pythagore, le départ
// d'un mat en un coup, le nombre de termes d'une opération posée. Et le cas de
// Pythagore était à l'envers pour de bon : l'aperçu montrait deux boutons que
// le catalogue cache exprès, et cachait le seul qu'il propose.
//
// La règle tient en une phrase : la fiche montre CE QUE VOIT LE PROFESSEUR,
// c'est-à-dire exactement la liste du panneau de configuration.
//
// Reste le tri, qui est l'autre moitié du travail. Un réglage est du CONTENU
// ou de l'ÉCRAN, et seul le premier a sa place sur une fiche : la tolérance du
// rapporteur, le passage au clavier, les faces colorées d'un solide, le nombre
// de propositions n'existent pas sur une photocopie. Affichés quand même, ce
// sont des boutons qui ne changent rien à ce qu'on imprime. `papier: false` le
// dit en clair, dans la déclaration du réglage — pas dans une liste tenue à
// part, qui dériverait.
//
// Module pur : ni DOM, ni catalogue, ni générateur. On lui passe des tableaux.

/** Ce réglage a-t-il cours sur du papier ? Oui, sauf mention contraire. */
export const surPapier = (p) => !!p && p.papier !== false;

/**
 * Ce réglage a-t-il un sens AVEC LES AUTRES RÉGLAGES COURANTS ?
 *
 * « Diviseur (division) », « Combien de nombres (addition) », « Tables (si ×
 * ou ÷) » : les libellés portaient la condition entre parenthèses, faute de
 * pouvoir la dire au programme. Un bouton qui ne fait rien tant qu'on n'a pas
 * choisi la bonne opération est un bouton qu'il faut essayer pour comprendre —
 * et sur une fiche, l'essayer ne montre rien, puisque rien ne change.
 *
 * `visibleSi` le dit, et le bouton disparaît au lieu de mentir.
 */
export const aSonMot = (p, reglages) => !p.visibleSi || !!p.visibleSi(reglages || {});

/**
 * Les réglages à offrir sur la fiche d'un exercice.
 *
 * @param {Object} opts
 * @param {Array}  opts.schemaCatalogue   - `paramSchemaOf(exo)` : ce que le professeur voit à l'écran
 * @param {Array}  opts.paramsGenerateur  - les réglages du générateur QUI FAIT LA FEUILLE
 * @param {boolean} opts.ficheDistincte   - la feuille a son propre générateur (`printGeneratorId`)
 * @param {Object} [opts.reglages]        - les valeurs courantes, pour les réglages conditionnels
 * @returns {Array} les réglages, dans l'ordre où on les montre
 */
export function reglagesDeFiche({ schemaCatalogue = [], paramsGenerateur = [], ficheDistincte = false,
    reglages = null } = {}) {
    // Le tri conditionnel n'a lieu que si l'on nous donne les valeurs
    // courantes : sans elles, on ne peut pas décider, et cacher par défaut
    // ferait disparaître des réglages bien réels.
    const garder = (p) => p && p.id && surPapier(p) && (reglages === null || aSonMot(p, reglages));

    // UNE FEUILLE QUI TIRE SES QUESTIONS AILLEURS N'A PAS LES MÊMES BOUTONS.
    // Un puissance 4 se joue contre l'ordinateur à l'écran et s'imprime en
    // grilles vides : « niveau de l'ordinateur » n'a rien à faire sur la
    // feuille, et « combien de colonnes » n'existe qu'elle. Le catalogue ne
    // parle pas de cette feuille-là ; on ne lui fait pas dire.
    if (ficheDistincte) return (paramsGenerateur || []).filter(garder);

    // SINON, CE QUE VOIT LE PROFESSEUR, ET RIEN D'AUTRE.
    //
    // `paramSchemaOf` donne déjà la bonne liste dans les deux cas : le schéma
    // écrit à la main dans le catalogue quand il y en a un, sinon les réglages
    // du générateur et de l'activité. C'est le chemin que suivait le panneau
    // de configuration ; la fiche, elle, repartait des réglages du GÉNÉRATEUR,
    // et les deux listes ne disaient pas la même chose.
    //
    // Elles se trompaient chacune dans un sens, et le cas de Pythagore montrait
    // les deux à la fois : le catalogue n'offre qu'un « Niveau », la fiche
    // montrait « Chercher » et « Énoncé » — deux boutons que l'auteur avait
    // décidé de ne pas donner — et cachait le seul qu'il proposait. Un schéma
    // de catalogue n'est pas un sous-ensemble à compléter : c'est un choix, et
    // le compléter revient à le défaire.
    return (schemaCatalogue || []).filter(garder);
}

/**
 * Les valeurs de départ d'une fiche : les réglages courants, complétés par les
 * défauts du schéma. Un réglage jamais touché doit valoir son défaut, sinon le
 * bouton affiche une valeur que le générateur ne reçoit pas.
 */
export function valeursDeDepart(schema, reglages = {}) {
    const out = { ...reglages };
    (schema || []).forEach(p => {
        if (p && p.id && out[p.id] === undefined && p.default !== undefined) out[p.id] = p.default;
    });
    return out;
}
