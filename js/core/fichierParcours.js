// UN PARCOURS DANS UN FICHIER — pour l'emporter, le ranger, le donner.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « d'ailleurs, on ne peut exporter en fichier juste un parcours. »
//
// ── POURQUOI CE N'EST PAS UN LUXE ──────────────────────────────────────────
//
// Les parcours voyagent par le serveur depuis la v906, et c'est le chemin
// normal. Mais trois choses que le serveur ne fait pas :
//
//   · DONNER UNE SÉANCE À UN COLLÈGUE. Son compte n'est pas celui de Rémy ; la
//     bibliothèque est rangée par professeur, et c'est bien ainsi.
//   · LA GARDER EN DEHORS DU LOGICIEL. Une séance préparée trois heures mérite
//     une copie que Rémy détient, dans son dossier, lisible sans rien lancer.
//   · LA REPRENDRE APRÈS L'AVOIR JETÉE il y a plus de trente jours.
//
// ── CE QUE LE FICHIER CONTIENT, ET POURQUOI IL EST BAVARD ──────────────────
//
// Une enveloppe nommée, datée, versionnée. On aurait pu écrire le parcours nu :
// le jour où un second genre de fichier existera, rien ne les distinguerait, et
// c'est l'importation qui aurait à deviner. Elle ne devine pas, elle LIT.
//
// ET ELLE ACCEPTE QUATRE FORMES À LA LECTURE, parce que Rémy ouvrira le
// fichier, le modifiera peut-être, et qu'un logiciel qui refuse un fichier
// qu'il comprend est un logiciel qui ment : l'enveloppe complète, un tableau
// d'enveloppes, une enveloppe de bibliothèque seule, un parcours nu.

import { normalizePath } from './path.js';
import { cheminDeLEntree } from './entreeParcours.js';

export const GENRE_FICHIER = 'parcours';
export const VERSION_FICHIER = 1;

/**
 * LE NOM DU FICHIER, À PARTIR DU NOM DU PARCOURS.
 *
 * `« Relatifs — 4ᵉ C »` devient `relatifs-4e-c.atoutmath.json`. Les accents et
 * les espaces partent : un nom de fichier qui voyage entre un Mac, un poste de
 * salle sous Windows et une pièce jointe ne garde pas ses accents de la même
 * façon partout, et l'on retrouve un fichier nommé `Relatifs%20%E2%80%94.json`
 * dans un dossier de téléchargements.
 *
 * ON GARDE LE SUFFIXE `.atoutmath.json` : `.json` seul se range au milieu de
 * tout, et un double clic ouvrirait un éditeur de texte sans rien dire d'où il
 * vient.
 */
export function nomDeFichier(nom, quand = null) {
    const base = String(nom == null ? '' : nom)
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        // LES LETTRES EN EXPOSANT NE SE DÉCOMPOSENT PAS en NFD : « 4ᵉ » reste
        // « 4ᵉ ». On les remplace donc nommément, sinon elles tombent dans le
        // filtre d'après et « 4ᵉ C » devient « 4-c ».
        .replace(/ᵉ/g, 'e').replace(/ᵈ/g, 'd').replace(/ᵒ/g, 'o')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);
    const jour = (quand instanceof Date ? quand : new Date()).toISOString().slice(0, 10);
    return `${base || 'parcours'}-${jour}.atoutmath.json`;
}

/**
 * CE QU'ON ÉCRIT DANS LE FICHIER.
 *
 * @param {object[]} entrees des ENVELOPPES de bibliothèque ({ id, name, data… })
 */
export function fichierAEcrire(entrees, quand = null) {
    const liste = (Array.isArray(entrees) ? entrees : [entrees]).filter(Boolean);
    return {
        logiciel: 'AtoutMath',
        genre: GENRE_FICHIER,
        version: VERSION_FICHIER,
        le: (quand instanceof Date ? quand : new Date()).toISOString(),
        parcours: liste.map((e) => {
            // ON ÉCRIT LE PARCOURS, PAS L'ENVELOPPE DE CE NAVIGATEUR.
            //
            // L'enveloppe porte `folderId` et `timestamp`, qui ne veulent rien
            // dire ailleurs : le dossier « Troisièmes » de Rémy n'existe pas
            // chez son collègue, et la date de modification du fichier est
            // celle du fichier. C'est la MÊME erreur que celle qui avait fait
            // descendre des parcours à zéro étape (voir `monterUnParcours`) :
            // l'enveloppe et le parcours ne sont pas la même chose.
            const dedans = cheminDeLEntree(e) || e;
            const p = normalizePath(dedans, e.name || dedans.name || 'Parcours');
            return { ...p, name: e.name || p.name };
        })
    };
}

/**
 * CE QU'ON LIT DANS UN FICHIER — et les quatre formes acceptées.
 *
 * ON NE JETTE JAMAIS LE FICHIER ENTIER POUR UNE LIGNE ABÎMÉE : un fichier de
 * douze parcours dont un seul est cassé en rend onze, et dit lequel manque.
 * « Fichier invalide » devant douze séances préparées serait cruel et faux.
 *
 * @param {string|object} brut le contenu du fichier
 * @returns {{parcours: object[], erreur: string, ecartes: number}}
 */
export function lireLeFichier(brut) {
    let donnees = brut;
    if (typeof brut === 'string') {
        try { donnees = JSON.parse(brut); }
        catch (e) {
            return { parcours: [], ecartes: 0,
                erreur: 'Ce fichier n\'est pas lisible : ce n\'est pas du JSON.' };
        }
    }
    if (!donnees || typeof donnees !== 'object') {
        return { parcours: [], ecartes: 0, erreur: 'Ce fichier ne contient pas de parcours.' };
    }

    // LES QUATRE FORMES, DE LA PLUS EXPLICITE À LA PLUS NUE.
    const candidats = Array.isArray(donnees) ? donnees
        : Array.isArray(donnees.parcours) ? donnees.parcours
            : [donnees];

    const parcours = [];
    let ecartes = 0;
    for (const c of candidats) {
        if (!c || typeof c !== 'object') { ecartes++; continue; }
        const dedans = cheminDeLEntree(c) || c;
        const p = normalizePath(dedans, c.name || dedans.name || 'Parcours');
        // UN PARCOURS SANS AUCUNE ÉTAPE N'EST PAS UN PARCOURS. C'est le signe
        // qu'on lit la mauvaise forme — exactement le défaut qui avait fait
        // descendre des séances vides du serveur, et qui ne s'était vu que
        // chez l'élève. Ici, on le voit tout de suite.
        if (!p || !Array.isArray(p.steps) || !p.steps.length) { ecartes++; continue; }
        parcours.push(p);
    }
    if (!parcours.length) {
        return { parcours: [], ecartes,
            erreur: 'Aucun parcours complet dans ce fichier : les étapes manquent.' };
    }
    return { parcours, ecartes, erreur: '' };
}
