// LA BIBLIOTHÈQUE DU QUOTIDIEN — quatre listes, une seule porte.
//
// Rémy : « une liste de blagues mathématiques très courte, une liste de
// citations, une liste de conseil […] et une série de petites énigmes très
// courtes qu'on pourrait suggérer chaque jour. Une centaine de chaque ce serait
// bien, tu les mets au banc de test pour pouvoir les gérer. »
//
// LES QUATRE LISTES SONT DE FORMES DIFFÉRENTES — un conseil est une phrase, une
// citation a un auteur, une énigme a une réponse et un indice. Les uniformiser
// aurait obligé à écrire `{ texte: '…' }` cent fois pour rien, et à inventer un
// auteur aux conseils. On les garde telles quelles, et CE module donne la vue
// commune dont l'écran a besoin : un titre, un texte, une signature, un secret.
//
// `secret` est ce qu'on ne montre pas tout de suite : la réponse d'une énigme.
// C'est la seule différence de comportement entre les quatre genres, et elle
// tient en un champ.

import { CONSEILS } from './conseils.js';
import { BLAGUES } from './blagues.js';
import { CITATIONS } from './citations.js';
import { ENIGMES } from './enigmes.js';
import { GENRES, LIBELLES_GENRE, duJour, prochains, decalagePour } from '../core/quotidien.js';

export { GENRES, LIBELLES_GENRE, decalagePour };

/** Les listes brutes, par genre. */
export const LISTES = {
    conseil: CONSEILS,
    blague: BLAGUES,
    citation: CITATIONS,
    enigme: ENIGMES
};

/** L'emoji de chaque genre — celui du bandeau et celui de la revue. */
export const EMOJIS_GENRE = {
    conseil: '💡',
    blague: '😄',
    citation: '❝',
    enigme: '🧩'
};

/**
 * La vue commune d'une entrée, quel que soit son genre.
 *
 * @returns {{genre, texte, signature: ?string, secret: ?string, indice: ?string,
 *            explication: ?string, figure: ?string, sur: ?boolean,
 *            niveau: ?number}|null}
 */
export function normaliser(genre, entree) {
    if (entree == null) return null;
    if (genre === 'conseil') {
        return { genre, texte: String(entree), signature: null, secret: null, indice: null };
    }
    if (genre === 'blague') {
        return { genre, texte: entree.texte, signature: null, secret: null, indice: null, quoi: entree.quoi || null };
    }
    if (genre === 'citation') {
        // UNE ATTRIBUTION INCERTAINE SE DIT. Voir `data/citations.js` : une
        // phrase fausse attribuée à Einstein, lue en classe, se grave dans
        // trente têtes. « Attribué à » coûte deux mots et évite cela.
        // « ATTRIBUÉ À PROVERBE JAPONAIS » NE SE DIT PAS. Un proverbe n'a pas
        // d'auteur : il n'y a donc rien à attribuer, et la précaution n'a de
        // sens que devant un NOM. Même chose pour une inscription.
        const anonyme = /^(proverbe|inscription|dicton)\b/i.test(entree.auteur);
        const nom = (entree.sur || anonyme) ? entree.auteur : `attribué à ${entree.auteur}`;
        return {
            genre, texte: entree.texte,
            // « Attribué à Albert Einstein » est déjà écrit ainsi dans quelques
            // entrées : on ne le redouble pas.
            signature: /^attribué à /i.test(entree.auteur) ? entree.auteur : nom,
            secret: null, indice: null, sur: !!entree.sur
        };
    }
    return {
        genre, texte: entree.texte, signature: null,
        secret: entree.reponse, indice: entree.indice, niveau: entree.niveau || null,
        // POURQUOI CETTE RÉPONSE-LÀ. Rémy : « pour les énigmes, il faut quand
        // même expliquer la réponse. » Il a raison, et c'est même tout ce qui
        // sépare une énigme d'une devinette : « 15 » ne s'apprend pas, « chaque
        // personne serre 5 mains et chaque poignée est comptée deux fois »
        // s'apprend, et resservira sur les diagonales d'un polygone.
        explication: entree.explication || null,
        // UNE PETITE IMAGE VECTORIELLE, quand l'énoncé décrit une figure.
        // Rémy : « tu peux faire des énigmes à petites images vectorielles ».
        // Elle ne remplace jamais le texte — une énigme doit se lire à voix
        // haute — elle lui évite d'avoir à décrire ce qu'un dessin dit d'un
        // coup d'œil. Voir `data/enigmesFigures.js`.
        figure: entree.figure || null
    };
}

/** L'entrée du jour d'un genre, déjà normalisée. */
export function entreeDuJour(genre, opts = {}) {
    return normaliser(genre, duJour(LISTES[genre], opts));
}

/**
 * TOUT CE QU'ON PROPOSE AUJOURD'HUI, dans l'ordre des genres.
 *
 * L'écran d'accueil n'en montre qu'un à la fois — quatre encarts empilés, c'est
 * un journal, pas un bonjour. Mais l'onglet « Le quotidien » les veut tous, et le
 * professeur qui prépare sa journée aussi.
 */
export function toutDuJour(opts = {}) {
    return GENRES.map(g => entreeDuJour(g, opts)).filter(Boolean);
}

/**
 * LE GENRE DU JOUR, pour l'écran d'accueil.
 *
 * On tourne sur les quatre : un conseil lundi, une blague mardi, une citation
 * mercredi, une énigme jeudi. Quatre encarts empilés seraient un journal ; un
 * seul genre, toujours le même, serait lassant.
 *
 * Le conseil sort DEUX FOIS sur cinq, parce que c'est le seul des quatre qui
 * serve directement à travailler — les trois autres donnent envie, ce qui n'est
 * pas rien, mais ce n'est pas la même chose.
 */
const ROULEMENT = ['conseil', 'blague', 'conseil', 'citation', 'enigme'];

export function genreDuJour(jour) {
    const j = Math.floor(Number(jour) || 0);
    return ROULEMENT[((j % ROULEMENT.length) + ROULEMENT.length) % ROULEMENT.length];
}

/** Les `combien` prochains jours d'un genre — l'aperçu de la revue. */
export function apercu(genre, combien, opts = {}) {
    return prochains(LISTES[genre], combien, opts)
        .map(p => ({ ...p, entree: normaliser(genre, p.entree) }));
}

/** Combien d'entrées par genre : le compte affiché dans la revue. */
export function comptes() {
    return GENRES.map(g => ({ genre: g, libelle: LIBELLES_GENRE[g], n: LISTES[g].length }));
}
