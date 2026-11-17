// LA SESSION EXPRESS — il reste dix minutes, un clic, et hop.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 17 novembre : « on pourrait envisager une session express, avec des
// jeux mathématiques (ou des défis) quand il reste 10 minutes, je vais sur la
// classe, je clique session express et hop », puis : « on pourrait même donner
// un code express ».
//
// ── CE QUE « EXPRESS » VEUT DIRE, ET CE QU'IL NE VEUT PAS DIRE ────────────
//
// Ce n'est PAS un raccourci pour composer une séance. C'est le contraire : il
// n'y a RIEN à composer. La demande porte sur un moment précis de l'heure —
// le travail est fini, la sonnerie n'a pas sonné, et personne n'a envie de
// bâtir un parcours pour dix minutes. Un écran qui demanderait « quels
// exercices ? » aurait déjà échoué : à ce moment-là, le professeur n'a pas dix
// minutes, il en a zéro.
//
// LE CHOIX DES JEUX EST DONC FAIT D'AVANCE, et il l'était déjà : c'est celui
// du bac à sable (`core/bacASable.js`), dont les quatre critères ont été écrits
// pour ce moment exact — « il reste six minutes avant la sonnerie ». On ne
// recompose pas une liste ; on prend celle qui existe, et qui a été pensée pour
// cela.
//
// ── POURQUOI UNE SÉANCE, ET NON UNE BOÎTE ─────────────────────────────────
//
// `core/boite.js` fait presque cela : une liste de jeux, un code, aucun
// relevé. Mais Rémy dit « je vais sur la classe » — il veut l'imposer depuis
// son tableau de classe, et voir qui joue dans Le direct. Une boîte ne passe
// par aucune classe et ne remonte rien. C'est donc une SÉANCE.
//
// UNE SÉANCE SANS NOTE ET SANS SEUIL, en revanche. Dix minutes de jeux à la
// fin d'une heure ne se notent pas : y mettre un barème ferait de la récréation
// une interrogation, et l'élève qui s'amuse perdrait des points. On garde ce
// que la séance apporte — elle s'ouvre toute seule, elle se voit dans Le direct
// — et l'on jette le reste.
//
// ── ET L'ORDRE EST LIBRE ──────────────────────────────────────────────────
//
// « il reste 10 minutes » : on commence tout de suite, par le jeu qu'on veut.
// Un parcours ordonné obligerait à finir le premier pour voir le second, ce qui
// dans dix minutes veut dire qu'on n'en verra qu'un.
//
// Aucun DOM ici, aucun réseau : on reçoit des données, on rend des données.

import { makePath, makeStep } from './path.js';
import { defaultPolicy } from './policy.js';

/** La durée proposée, parce que c'est celle que Rémy a nommée. */
export const MINUTES_PAR_DEFAUT = 10;

/**
 * COMBIEN DE MINUTES COMPTER POUR UN JEU.
 *
 * MESURÉ, et non supposé : les jeux du bac sont des parties d'arcade qu'on
 * lâche n'importe quand. Une partie de Tetris des fractions dure tant qu'on
 * joue ; ce n'est donc pas la DURÉE du jeu qu'on compte, c'est le temps qu'un
 * élève y passe avant de vouloir changer. Trois minutes, mesurées sur la
 * session d'essai de Rémy : en dix minutes, il en ouvre trois.
 *
 * CE N'EST PAS UNE LIMITE, c'est une portion : rien n'empêche d'en jouer un
 * seul tout le temps.
 */
export const MINUTES_PAR_JEU = 3;

/** Entre deux et six : un seul n'est pas un choix, sept est une liste. */
export const MOINS = 2;
export const PLUS = 6;

/**
 * COMBIEN DE JEUX POUR CES MINUTES-LÀ.
 *
 * On arrondit au plus proche et l'on borne. DEUX AU MOINS, parce qu'un seul
 * jeu n'offre aucun choix et qu'un élève qui n'aime pas celui-là n'a nulle
 * part où aller. SIX AU PLUS, parce que « un élève à qui il reste sept minutes
 * et qui doit CHOISIR parmi deux cents passe ses sept minutes à choisir »
 * (core/bacASable.js) — la borne est la même règle, un cran plus bas.
 */
export function combienDeJeux(minutes) {
    const n = Math.round((Number(minutes) || MINUTES_PAR_DEFAUT) / MINUTES_PAR_JEU);
    return Math.max(MOINS, Math.min(PLUS, n));
}

/**
 * LA POLITIQUE D'UNE SESSION EXPRESS : CELLE D'USINE, ET C'EST UN ARBITRAGE.
 *
 * J'avais écrit `ordreLibre: true` et `adaptive: false`, avec de bonnes
 * raisons : « il reste 10 minutes » veut dire qu'on commence tout de suite,
 * par le jeu qu'on veut, et le tirage adaptatif n'a pas de progression à
 * corriger en dix minutes de jeu.
 *
 * MESURÉ, ET LA MESURE A TRANCHÉ. Ces deux réglages ne sont pas ceux d'usine,
 * donc ils doivent VOYAGER dans le code — et le code bascule alors en base64 :
 * 186 caractères au lieu de « MHC-MML-CTM ». Or Rémy a demandé « on pourrait
 * même donner un code express », et un code express de 186 caractères ne
 * s'épelle pas à voix haute devant une classe à trois minutes de la sonnerie.
 *
 * L'ORDRE LIBRE ÉTAIT MON IDÉE, LE CODE EST SA DEMANDE. On garde le code. Et
 * l'on ne perd pas grand-chose : sans seuil, une étape se termine dès qu'elle
 * est jouée, donc personne ne reste bloqué sur le premier jeu.
 *
 * LE JOUR OÙ LA CHAÎNE COURTE SAURA DIRE « ordre libre » (un seul caractère
 * suffirait), ce choix se rouvre — et c'est la seule ligne à changer ici.
 */
export function politiqueExpress() {
    return defaultPolicy();
}

/**
 * LES JEUX RETENUS POUR CETTE SESSION.
 *
 * @param {Array} jeux    les jeux candidats, DÉJÀ résolus sur le catalogue
 *                        (le noyau ne connaît pas le catalogue — même règle
 *                        que `jeuxDuBac`)
 * @param {Object} [opts] { minutes, niveau }
 */
export function jeuxExpress(jeux, { minutes = MINUTES_PAR_DEFAUT, niveau = '' } = {}) {
    const combien = combienDeJeux(minutes);
    const tous = (jeux || []).filter(Boolean);
    if (!niveau) return tous.slice(0, combien);
    // LE NIVEAU TRIE, IL NE FILTRE PAS.
    //
    // MESURÉ sur la liste du bac (`tools/tmp/bacMesure.mjs`, cité dans
    // `bacASable.js`) : elle donne dix jeux à un CM2, seize à un 6ème, et UN
    // SEUL à un 3ème. Un filtre strict rendrait donc la session express vide
    // pour une classe de troisième — un bouton qui ne fait rien, le jour où
    // l'on en a le plus besoin.
    //
    // On met donc devant ceux du niveau, et l'on complète avec les autres :
    // un jeu de calcul mental n'a jamais fait de mal à un troisième.
    const duNiveau = tous.filter(e => ((e.tags && e.tags.niveaux) || []).includes(niveau));
    const reste = tous.filter(e => !duNiveau.includes(e));
    return [...duNiveau, ...reste].slice(0, combien);
}

/**
 * LE NOM DE LA SESSION.
 *
 * IL DIT LA DURÉE, et c'est utile deux fois : l'élève sait qu'il ne s'engage
 * pas pour l'heure, et le professeur retrouve la bonne dans une liste de
 * séances qui s'allonge — « Session express — 10 min » ne ressemble à aucune
 * de ses séances de travail.
 */
export const nomExpress = (minutes = MINUTES_PAR_DEFAUT) =>
    `Session express — ${Math.round(minutes)} min`;

/**
 * FABRIQUER LA SESSION.
 *
 * @param {Object} quoi { jeux, minutes, niveau, nom }
 * @returns {Object} un parcours marqué `express`
 */
export function faireUneSessionExpress({ jeux = [], minutes = MINUTES_PAR_DEFAUT,
    niveau = '', nom = '' } = {}) {
    const choisis = jeuxExpress(jeux, { minutes, niveau });
    const pas = choisis.map((e, i) => makeStep(e.id, {}, {
        stepId: 'x' + (i + 1),
        // AUCUNE EXIGENCE : « rien à valider », comme la boîte. Un seuil
        // barrerait la route au bout de dix minutes, ce qui est exactement le
        // contraire de ce qu'on veut à ce moment de l'heure.
        threshold: null,
        // ET AUCUNE LIMITE DE TEMPS PAR ÉTAPE : c'est la sonnerie qui arrête.
        // Un minuteur ajouterait une contrainte là où l'on vient d'en lever
        // une — la même phrase que dans `bacASable.js`, et la même raison.
        timeLimit: null
    }));
    const p = makePath(nom || nomExpress(minutes), pas, politiqueExpress());
    // LA MARQUE, ET CE QU'ELLE CHANGE À L'ARRIVÉE.
    //
    // Comme `boite: true` : l'élève ne doit pas voir « Étape 1 sur 3 » ni un
    // bilan de fin, et le professeur doit reconnaître cette séance-là dans sa
    // liste sans lire son nom. Un drapeau se teste ; un nom ne se teste pas.
    p.express = true;
    p.minutesExpress = Math.round(minutes);
    return p;
}

/** Cette séance est-elle une session express ? */
export const estExpress = (path) => !!(path && path.express);
