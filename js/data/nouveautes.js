// LES NOUVEAUTÉS DU CATALOGUE — de quoi les essayer d'un clic.
//
// Rémy : « dans la barre, j'aimerais bien une option qui permet de tester les
// derniers exercices que tu m'as proposés ». C'est la demande d'un professeur
// qui reçoit du travail par petites vagues : entre deux séances, il ne se
// souvient pas de ce qui vient d'arriver, et retrouver trois exercices neufs
// dans un catalogue de cent est plus long que de les essayer.
//
// POURQUOI UNE LISTE ÉCRITE À LA MAIN, ET NON UNE DATE CALCULÉE.
//
// « Le plus récent » ne se déduit de rien de fiable. L'ordre du fichier ne dit
// rien — on insère un exercice au milieu d'une famille pour qu'il soit près de
// ses voisins. La date des fichiers ne survit pas à un clone du dépôt. Le
// numéro de version change à chaque correction de faute d'orthographe, donc
// il désignerait comme neuf un exercice vieux de six mois qu'on a seulement
// retouché.
//
// Ce qui compte n'est pas « quand le fichier a changé » mais « qu'est-ce que je
// viens de te proposer ». Cela, seul l'auteur le sait, et cela s'écrit.
//
// LA LISTE NE PEUT PAS MENTIR : un test vérifie que chaque identifiant cité
// existe dans le catalogue. Un exercice renommé ou retiré fait échouer la
// suite au lieu de laisser un bouton qui ne mène nulle part.

/**
 * Les vagues, de la plus récente à la plus ancienne.
 *
 * @typedef {Object} Vague
 * @property {string} version - la version de l'application qui l'a apportée
 * @property {string} quoi    - ce qui a été fait, en une phrase, pour Rémy
 * @property {string[]} exos  - les identifiants du catalogue concernés
 */
export const NOUVEAUTES = [
    {
        version: 'v312',
        quoi: 'Le pavage refait : au lieu de nommer la famille de la transformation, '
            + 'on cherche PAR RAPPORT À QUOI. Trois façons de répondre — choisir le nom, '
            + 'cliquer la droite sur le dessin, écrire son équation.',
        exos: ['geo-pavage']
    },
    {
        version: 'v309',
        quoi: 'Les transformations aux carreaux : une figure, une transformation, '
            + 'et l\'élève colorie l\'image case par case. Les deux s\'impriment.',
        exos: ['geo-symetrie-quadrillage', 'geo-transfo-quadrillage']
    },
    {
        version: 'v306',
        quoi: 'La loupe sur la droite graduée : dix intervalles, deux nombres écrits, '
            + 'et l\'abscisse du point marqué d\'une croix à retrouver.',
        exos: ['num-graduations']
    }
];

/** Combien de vagues on montre : au-delà, ce ne sont plus des nouveautés. */
export const VAGUES_MONTREES = 3;

/** Tous les identifiants cités, de la plus récente vague à la plus ancienne. */
export function idsDesNouveautes(vagues = NOUVEAUTES) {
    return vagues.flatMap(v => v.exos);
}
