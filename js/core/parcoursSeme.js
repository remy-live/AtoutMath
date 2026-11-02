// UN PARCOURS SEMÉ SE RECONNAÎT À SA MARQUE, JAMAIS À SON NOM.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 31 octobre : « Quand je change le nom d'une épreuve ca le duplique ».
//
// MESURÉ, par son chemin à lui : on renomme « Tout sur papier » en « Ma feuille
// de contrôle », on recharge la page, et la bibliothèque en contient DEUX — la
// sienne, et une « Tout sur papier » toute neuve. Le doublon n'apparaît donc
// pas au moment du renommage mais à l'OUVERTURE SUIVANTE, ce qui le rend
// incompréhensible depuis le fauteuil : on renomme, tout va bien, et le
// lendemain matin il y a deux lignes.
//
// LA CAUSE TIENT EN UNE EXPRESSION. Le semeur retrouvait sa feuille avec
// `/^Tout sur papier/`. Un parcours renommé ne répond plus à son nom : il n'est
// plus trouvé, donc il est reposé. Tout ce qui se reconnaît à son nom se perd
// dès qu'on le renomme, et un nom est précisément ce qu'un professeur change.
//
// ── OÙ VIT LA MARQUE, ET POURQUOI PAS AILLEURS ─────────────────────────────
//
// Elle vit DANS LE PARCOURS (`data`), pas dans l'enveloppe de bibliothèque.
//
// Le rapatriement du serveur (`parcoursServeur.js`) reconstruit l'enveloppe à
// partir d'une liste close de champs — { id, name, data, folderId, timestamp }
// — et jette tout le reste. `normalizePath`, lui, recopie le parcours avec
// `...raw`. Une marque posée dans l'enveloppe aurait donc survécu sur le poste
// de Rémy et disparu au premier aller-retour avec le serveur, c'est-à-dire le
// lendemain : le défaut serait revenu en paraissant corrigé.
//
// ── ET LE NOM APPARTIENT AU PROFESSEUR ─────────────────────────────────────
//
// Le contenu se recalcule à chaque démarrage — c'est tout l'intérêt de « Tout
// sur papier », qui doit suivre le catalogue. Le NOM, lui, est à celui qui l'a
// écrit : le remettre d'office annulerait son geste à chaque ouverture, ce qui
// est une autre façon de ne pas pouvoir renommer.

import { cheminDeLEntree } from './entreeParcours.js';

/** La marque d'une entrée de bibliothèque, ou null. */
export function marqueDe(entree) {
    const chemin = cheminDeLEntree(entree);
    return (chemin && chemin.semence) || null;
}

/**
 * POSER OU REMETTRE À JOUR UN PARCOURS SEMÉ.
 *
 * @param {object}  state            l'état (on n'y touche que par ses méthodes)
 * @param {string}  o.semence        la marque, stable : 'papier', 'decouverte'
 * @param {object}  o.parcours       le parcours fraîchement construit
 * @param {RegExp}  [o.motifHistorique] ce à quoi ressemblait son nom AVANT la
 *   marque. Sert deux fois : à ADOPTER la ligne existante d'une bibliothèque
 *   d'avant (sans quoi la correction elle-même ferait un doublon chez Rémy),
 *   et à savoir si le nom est encore celui d'origine ou le sien.
 * @param {boolean} [o.seulementSiAbsent] ne rien récrire s'il est déjà là —
 *   pour un parcours d'exemple, que le professeur a le droit de retoucher.
 * @returns {{quoi: 'cree'|'adopte'|'remis'|'laisse', id: string}}
 */
export function reposerUnParcoursSeme(state, o) {
    const { semence, parcours, motifHistorique = null, seulementSiAbsent = false } = o || {};
    const liste = state.teacherPaths || [];

    let entree = liste.find(p => marqueDe(p) === semence);
    let quoi = 'remis';
    if (!entree && motifHistorique) {
        entree = liste.find(p => motifHistorique.test(String(p.name || '')));
        if (entree) quoi = 'adopte';
    }

    if (!entree) {
        const neuf = state.saveTeacherPath(parcours.name, { ...parcours, semence });
        return { quoi: 'cree', id: neuf.id };
    }
    if (seulementSiAbsent && quoi !== 'adopte') return { quoi: 'laisse', id: entree.id };

    // SON NOM À LUI L'EMPORTE dès qu'il ne ressemble plus au nom semé.
    const dOrigine = motifHistorique
        ? motifHistorique.test(String(entree.name || '')) : true;
    const nom = dOrigine ? parcours.name : String(entree.name);
    state.updateTeacherPath(entree.id, nom, { ...parcours, semence, name: nom });
    return { quoi, id: entree.id };
}
