// LA BOÎTE À JEUX — quelques exercices choisis, un lien, et rien d'autre.
//
// Rémy : « j'aimerai bien faire qqch qui permet en transférant un lien d'avoir
// une sorte d'appli avec des exercices que j'ai choisi sans forcément avoir un
// parcours. Par exemple, j'envoie un lien et les personnes peuvent jouer au
// sudoku ou au ken ken et avec des réglages ultra simplifié. »
//
// CE QUE CE N'EST PAS, ET C'EST TOUT LE SUJET : un parcours. Un parcours est un
// DEVOIR — il a un ordre, un seuil, une note, un bilan, et quelqu'un qui le
// relève. Une boîte n'a rien de tout cela. On l'ouvre, on voit des jeux, on en
// prend un, on le repose. « sans forcément avoir un parcours » : le mot
// important est SANS.
//
// ET PERSONNE NE REGARDE PAR-DESSUS L'ÉPAULE. Rémy, sur ce que la boîte doit
// garder : « personne ne se connecte mais on peut le garder en local storage et
// la personne l'a pour elle, je n'interviens pas ». Donc : aucun compte, aucun
// envoi, aucune trace côté serveur. Ce qui est joué reste dans le navigateur de
// celui qui joue, et n'en sort jamais.
//
// POURQUOI C'EST UN PARCOURS QUAND MÊME, DANS LE CODE. Le lien, le code dicté,
// le QR code, l'affiche à imprimer, la lecture de `?code=` à l'arrivée : tout
// cela existe déjà et fonctionne pour les parcours (`ui/partagerParcours.js`,
// `ui/studentCodeUI.js`). Écrire un second chemin pour transporter une liste
// d'exercices, ce serait tenir deux encodeurs, deux décodeurs et deux fenêtres
// de partage — et la boîte n'aurait aucune des choses que le parcours a mis des
// mois à acquérir (le code de contrôle qui refuse une lettre fausse, l'identité
// dérivée du contenu, l'affiche). Une boîte est donc un parcours qui porte une
// MARQUE, et cette marque change tout ce qui se passe à l'arrivée.
//
// Aucun DOM ici, aucun stockage : on reçoit des données, on rend des données.
// Ce fichier se lit sans navigateur, et ses règles se testent sans en ouvrir un.

import { makePath, makeStep } from './path.js';
import { defaultPolicy } from './policy.js';

/** Le nombre de jeux qu'une boîte peut porter. */
export const MAX_JEUX = 12;

/**
 * LA POLITIQUE D'UNE BOÎTE : on s'entraîne, on ne rend rien.
 *
 * Pas d'évaluation (il n'y a personne pour relever), pas de seuil (rien à
 * valider), pas de note (« je n'interviens pas »). Les aides restent : un jeu
 * auquel on ne peut pas demander d'indice se referme au premier blocage.
 */
export function politiqueDeBoite() {
    return {
        ...defaultPolicy(),
        // `grading: null` est déjà le défaut de l'entraînement, et on l'écrit
        // quand même : dans une boîte, l'absence de note est une DÉCISION, pas
        // un héritage. Le jour où l'entraînement se mettrait à noter, la boîte
        // ne doit pas suivre.
        grading: null,
        // Le tirage adaptatif vise les notions fragiles d'un ÉLÈVE CONNU. Ici
        // personne n'est connu, et il n'y a pas de progression à corriger : le
        // tirage doit être celui du jeu, pas celui d'un profil vide.
        adaptive: false,
        // Aucun ordre imposé : c'est la définition même de la boîte.
        ordreLibre: true
    };
}

/**
 * FABRIQUER UNE BOÎTE.
 *
 * @param {{nom?: string, exercices?: Array<{id: string, overrides?: Object,
 *          nbItems?: number}>}} quoi
 * @returns {Object} un parcours marqué `boite`
 */
export function faireUneBoite({ nom = 'Mes jeux', exercices = [] } = {}) {
    const pas = exercices.slice(0, MAX_JEUX).map((e, i) => makeStep(
        typeof e === 'string' ? e : e.id,
        (typeof e === 'string' ? {} : e.overrides) || {},
        {
            stepId: 'b' + (i + 1),
            nbItems: (typeof e === 'string' ? null : e.nbItems) || undefined,
            // AUCUNE EXIGENCE, ET C'EST EXPRÈS. `threshold: null` veut dire
            // « rien à valider » : la boîte ne barre la route de personne.
            threshold: null
        }
    ));
    const boite = makePath(nom, pas, politiqueDeBoite());
    boite.boite = true;
    return boite;
}

/** Est-ce une boîte à jeux, et non un parcours ? */
export function estUneBoite(path) {
    return !!path && path.boite === true;
}

// --- CE QUE LE JOUEUR A LE DROIT DE RÉGLER -----------------------------------
//
// « avec des réglages ultra simplifié ». Deux boutons, pas un panneau.
//
// ON NE PEUT PAS INVENTER UNE DIFFICULTÉ UNIVERSELLE, et c'est mesuré : sur les
// 216 exercices du catalogue, VINGT-DEUX portent un réglage `difficulte`. Une
// boîte qui afficherait « Facile · Moyen · Difficile » partout mentirait dans
// neuf cas sur dix. On montre donc ce que l'exercice a VRAIMENT, et rien quand
// il n'a rien.
//
// L'ORDRE DE PRÉFÉRENCE ci-dessous n'est pas arbitraire : ce sont les deux
// réglages qu'un joueur comprend sans qu'on lui explique — de quelle force, et
// de quelle taille. Les exemples de Rémy tombent exactement dessus : le Sudoku
// a `difficulte` et `taille`, le Mathdoku `difficulte` et `chiffres`.
const PREFERES = ['difficulte', 'taille', 'niveau', 'chiffres', 'operations'];

/** Deux réglages au plus : au-delà, ce n'est plus « ultra simplifié ». */
export const MAX_REGLAGES_JOUEUR = 2;

// --- ET LE SEUL RÉGLAGE QUI MARCHE POUR LES DEUX CENT SEIZE -------------------
//
// Rémy, pendant la construction : « mais on est d'accord que c'est pour tous les
// exercices ». Oui — et c'est justement ce qui rend `reglagesDuJoueur` insuffisant
// à lui seul : vingt-deux exercices portent une `difficulte`, une poignée une
// `taille`, et les autres n'ont RIEN à proposer au joueur. Une boîte de calcul
// mental n'aurait affiché aucun bouton.
//
// LA LONGUEUR DE LA PARTIE, ELLE, EXISTE PARTOUT, parce qu'elle ne demande rien
// à l'exercice : tout exercice a un nombre de questions conseillé, et il suffit
// de le prendre en deçà ou au-delà. C'est aussi le réglage qu'un joueur veut
// vraiment — « j'ai cinq minutes » ou « j'ai le temps ».
//
// ON PART DU CONSEIL DE L'EXERCICE, ET NON D'UN NOMBRE EN DUR : vingt questions
// pour un réflexe de calcul, deux grilles pour un sudoku. « Court » sur un
// sudoku doit valoir une grille, pas dix.
export const LONGUEURS = [
    { id: 'courte', mot: 'Courte', facteur: 0.5 },
    { id: 'moyenne', mot: 'Moyenne', facteur: 1 },
    { id: 'longue', mot: 'Longue', facteur: 2 }
];

/** La longueur d'usine : celle que l'exercice conseille. */
export const LONGUEUR_DEFAUT = 'moyenne';

/**
 * COMBIEN DE QUESTIONS POUR CETTE LONGUEUR.
 *
 * Jamais moins d'une : la moitié d'une grille de sudoku n'est pas une demi-
 * partie, c'est zéro partie. Et jamais plus de soixante, comme les exercices
 * que l'élève se donne à lui-même (`core/mesExercices.js`) : au-delà ce n'est
 * plus une partie, c'est une punition.
 */
export function questionsSelonLongueur(conseil, longueur) {
    const n = Number(conseil) > 0 ? Number(conseil) : 10;
    const trouve = LONGUEURS.find(l => l.id === longueur);
    const f = trouve ? trouve.facteur : 1;
    return Math.max(1, Math.min(60, Math.round(n * f)));
}

/**
 * LES RÉGLAGES QU'ON PROPOSE AU JOUEUR, À PARTIR DU SCHÉMA DE L'EXERCICE.
 *
 * On ne garde qu'un champ À CHOIX FERMÉ et court : une liste de quatre valeurs
 * fait quatre boutons, qu'on lit d'un coup d'œil. Un nombre libre, une case à
 * cocher au milieu d'un panneau, une liste de quinze entrées : ce sont des
 * réglages de professeur, et ils restent au professeur.
 *
 * @param {Array} schema le schéma de réglages de l'exercice (`paramSchemaOf`)
 * @param {number} [combien] le nombre maximum de réglages rendus
 * @returns {Array} les champs à montrer, dans l'ordre où on les montre
 */
export function reglagesDuJoueur(schema, combien = MAX_REGLAGES_JOUEUR) {
    if (!Array.isArray(schema)) return [];
    // LE CHAMP SE NOMME `id`, PAS `key` — c'est la forme des schémas de ce
    // dépôt (`{ id, type, label, default, options: [{ value, label }] }`), et
    // se tromper de nom ici ne rend pas une erreur : cela rend une liste vide,
    // donc une boîte sans aucun réglage, sans rien pour le dire.
    const court = (champ) => champ.type === 'select' && Array.isArray(champ.options)
        && champ.options.length >= 2 && champ.options.length <= 4;
    const utiles = schema.filter(c => c && c.id && court(c));
    const rang = (c) => {
        const i = PREFERES.indexOf(c.id);
        return i === -1 ? PREFERES.length : i;
    };
    return utiles
        .slice()
        .sort((a, b) => rang(a) - rang(b))
        .filter(c => rang(c) < PREFERES.length)
        .slice(0, Math.max(0, combien));
}

/**
 * L'ÉTIQUETTE DU JOUEUR EST UN MOT, PAS UNE PHRASE.
 *
 * MESURÉ dans le navigateur, sur la carte du Sudoku : les étiquettes du schéma
 * sont écrites POUR LE PROFESSEUR, et elles expliquent — « Tutoriel — presque
 * tout est donné, et le jeu guide », « Facile (candidat unique) », « Difficile
 * (le minimum de cases) ». Chacune prenait une ligne entière, la carte faisait
 * trois écrans, et « ultra simplifié » n'avait plus aucun sens.
 *
 * Ce qui explique est APRÈS : après un tiret cadratin, après une parenthèse,
 * après une virgule. On garde ce qui est avant, et l'on garde tout si ce n'est
 * pas plus long que deux mots — « 4 × 4 (blocs 2×2) » devient « 4 × 4 », ce qui
 * est exactement ce qu'on veut lire sur un bouton.
 *
 * LE PROFESSEUR, LUI, GARDE SES PHRASES : cette fonction ne sert qu'à la boîte.
 */
export function motCourt(etiquette) {
    const t = String(etiquette ?? '').trim();
    if (!t) return '';
    const coupe = t.split(/\s+[—–-]\s+|\s*\(|\s*,\s+|\s*:\s+/)[0].trim();
    return (coupe || t).slice(0, 24);
}

// --- LA MÉMOIRE DE LA BOÎTE, QUI NE SORT PAS DE L'APPAREIL --------------------
//
// « on peut le garder en local storage et la personne l'a pour elle ».
//
// Ce qu'on garde tient en trois choses par jeu : combien de parties, le meilleur
// score, et le dernier réglage choisi. Le dernier réglage est le plus utile des
// trois : il évite de redemander « quelle taille ? » à chaque ouverture, ce qui
// est exactement ce qu'un joueur trouve pénible.
//
// CE QU'ON NE GARDE PAS : ni quand, ni quelles questions, ni quelles erreurs.
// Une boîte n'est pas un carnet de bord, et un jeu qu'on garde pour soi ne
// demande pas de dossier.

/** La clef de rangement d'une boîte. L'identité vient du contenu du code. */
export function clefDeLaBoite(path) {
    return 'mathbox-boite-' + ((path && path.id) || 'sans-nom');
}

/** Une mémoire vide, de la même forme que celle qu'on relit. */
export function memoireVide() {
    return { v: 1, jeux: {} };
}

/**
 * RANGER UNE PARTIE QUI VIENT DE FINIR.
 *
 * Pure : on rend une NOUVELLE mémoire, on ne touche pas celle qu'on reçoit.
 * Le score ne compte que s'il y avait un total — une partie abandonnée en
 * cours de route n'écrase pas un meilleur score.
 *
 * @param {Object} memoire la mémoire relue (ou `memoireVide()`)
 * @param {{exoId: string, reussies?: number, total?: number, reglages?: Object}} partie
 */
export function rangerUnePartie(memoire, partie) {
    const m = memoire && memoire.jeux ? { v: 1, jeux: { ...memoire.jeux } } : memoireVide();
    if (!partie || !partie.exoId) return m;
    const avant = m.jeux[partie.exoId] || { parties: 0, meilleur: null, total: null, reglages: null };
    const compte = Number(partie.total) > 0;
    const mieux = compte && (avant.meilleur === null
        // À TOTAL ÉGAL, LE PLUS GRAND NOMBRE DE RÉUSSITES ; à total différent,
        // la meilleure PART. Sans quoi « 4 sur 4 » perdrait contre « 5 sur 20 ».
        || (partie.reussies / partie.total) > (avant.meilleur / avant.total));
    m.jeux[partie.exoId] = {
        parties: (avant.parties || 0) + 1,
        meilleur: mieux ? Number(partie.reussies) : avant.meilleur,
        total: mieux ? Number(partie.total) : avant.total,
        reglages: partie.reglages ? { ...partie.reglages } : avant.reglages
    };
    return m;
}

/**
 * CE QU'ON ÉCRIT SUR LA CARTE D'UN JEU, sous son nom.
 *
 * Rien tant qu'on n'a pas joué : une carte qui annonce « 0 partie · pas de
 * score » avant la première partie décourage sans rien apprendre.
 */
export function motDeLaCarte(entree) {
    if (!entree || !entree.parties) return '';
    const fois = entree.parties === 1 ? '1 partie' : entree.parties + ' parties';
    if (entree.meilleur === null || entree.meilleur === undefined) return fois;
    return fois + ' · meilleur ' + entree.meilleur + ' sur ' + entree.total;
}
