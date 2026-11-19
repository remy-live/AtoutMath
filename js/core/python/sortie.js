// CE QUI COMPTE COMME « LA MÊME SORTIE » — et la forme qu'on donne à juger.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 19 novembre : il a lu « Que va afficher ce programme ? » et tapé
// « 54321 » sur une seule ligne, puis « 5 / 4 / 3 / 2 / 1 » une par ligne.
// Pour cet exercice, LA MISE EN PAGE EST LA RÉPONSE : `print` va à la ligne à
// chaque fois, et savoir cela est précisément ce qu'on mesure.
//
// ── POURQUOI UN SÉPARATEUR VISIBLE, ET PAS LE SAUT DE LIGNE ──────────────
//
// MESURÉ, et c'est la découverte qui a fait écrire ce fichier : le comparateur
// du noyau (`sameAnswer`, dans `core/items.js`) retire les blancs d'une
// réponse quand ce qui reste est un NOMBRE. La règle est juste et elle a sa
// raison — « 62 307 » et « 62307 » sont le même nombre, et les élèves écrivent
// les grands nombres par groupes de trois. Mais appliquée à une sortie
// multiligne, elle ramène « 1\n2\n3 » à « 123 » : le logiciel déclarait donc
// JUSTE une réponse écrite tout sur une ligne, c'est-à-dire exactement la
// faute qu'on veut faire voir.
//
// On ne touche pas à cette règle — elle sert partout ailleurs. On soumet au
// jugement une forme que le retrait des blancs ne peut pas écraser : les
// lignes séparées par « / ». « 1 / 2 / 3 » n'est pas un nombre, donc ses
// espaces restent, donc il ne vaut plus « 123 ».
//
// ── ET UNE SEULE NORMALISATION POUR LES DEUX USAGES ──────────────────────
//
// `sortieJuste` et `canoniqueSortie` DOIVENT s'accorder : si l'activité
// déclarait juste ce que le meneur compte faux, l'élève verrait « c'est
// exactement ça » puis perdrait son point. La seconde est donc écrite à partir
// de la première, et non à côté.

/**
 * La sortie, nettoyée : fins de ligne unifiées, espaces de bout de ligne
 * retirés, dernières lignes vides supprimées.
 *
 * ON PARDONNE CES TROIS-LÀ ET RIEN D'AUTRE. Un élève dont le programme est
 * juste mais qui a laissé une espace derrière « Bonjour » a écrit un programme
 * juste ; lui répondre « faux » sur un caractère invisible, c'est lui
 * apprendre à se méfier. Le reste est strict, et c'est voulu : « bonjour »
 * n'est pas « Bonjour », et « 7 » n'est pas « 7.0 ». Python ne pardonne pas
 * non plus, et c'est Python qu'on apprend.
 *
 * LES ESPACES DE DÉBUT DE LIGNE SONT PARDONNÉS AUSSI, et pour une raison
 * mesurée : le comparateur du noyau, lui, ébarbe la réponse entière avant de
 * juger. En n'ébarbant que la FIN des lignes, on déclarait « faux » une
 * réponse que le meneur comptait ensuite JUSTE — l'élève lisait « ce n'est pas
 * ce que ce programme affiche », puis gagnait son point. Deux avis sur la même
 * réponse, c'est pire que le mauvais avis.
 */
export function lignesDeSortie(texte) {
    return String(texte == null ? '' : texte)
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((l) => l.trim())
        .join('\n')
        .replace(/\n+$/, '')
        .split('\n');
}

/** La forme qu'on donne à juger au meneur — voir l'en-tête. */
export const canoniqueSortie = (texte) => lignesDeSortie(texte).join(' / ');

/** Ce qu'il fallait afficher a-t-il été affiché ? */
export const sortieJuste = (sortie, attendue) =>
    canoniqueSortie(sortie) === canoniqueSortie(attendue);
