// LE DÉTAIL D'UN ÉLÈVE, SOUS SA LIGNE DE BILAN.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « le bilan que tu proposes est bien car concis, on pourrait avoir un
// peu de détail par élève si on le souhaite et qu'on clique sur lui ? »
//
// Les deux moitiés de la phrase comptent autant l'une que l'autre. Le tableau
// est bien PARCE QU'il est concis : six colonnes, trente lignes, et l'œil
// trouve en deux secondes qui n'a rien fait. Ajouter trois colonnes le
// détruirait. Le détail se DÉPLIE donc, et seulement là où l'on a cliqué.
//
// ── LE SERVEUR ENVOYAIT DÉJÀ TOUT ───────────────────────────────────────────
//
// `/teacher/report` rend par élève, et depuis toujours : `weakSkills` (jusqu'à
// cinq notions fragiles, avec leur niveau de maîtrise) et `notes` (jusqu'à dix
// séances notées). L'écran n'en affichait aucune. Il n'y avait rien à aller
// chercher — seulement à montrer.
//
// ── CE QUE CE MODULE DÉCIDE, ET POURQUOI IL EST ICI ─────────────────────────
//
// Il ne dessine rien : il décide CE QU'ON DIT, ce qui se mesure sans
// navigateur. Trois questions, trois réponses :
//
//   · y a-t-il quelque chose à montrer ?
//   · dans quel ordre — le plus fragile d'abord ;
//   · et quelle phrase quand il n'y a rien, ce qui est le cas le plus fréquent
//     la première semaine.

import { nomCompetence } from './bilan.js';

/** Sous ce seuil, une notion est dite fragile — c'est celui du serveur. */
const FRAGILE = 0.7;

/**
 * CE QU'ON DÉPLIE SOUS LA LIGNE D'UN ÉLÈVE.
 *
 * @param {Object} ligne une entrée de `students` rendue par `/teacher/report`
 * @returns {{vide:boolean, phrase:string, fragiles:Array, notes:Array}}
 */
export function detailDeLEleve(ligne) {
    const l = ligne || {};
    const fragiles = (Array.isArray(l.weakSkills) ? l.weakSkills : [])
        .filter(w => w && w.skillId)
        // LE PLUS FRAGILE EN PREMIER. Le serveur les rend dans l'ordre où il
        // les a trouvées ; c'est l'ordre de la maîtrise qui dit par quoi
        // commencer.
        .sort((a, b) => (Number(a.mastery) || 0) - (Number(b.mastery) || 0))
        .map(w => ({
            skillId: w.skillId,
            label: nomCompetence(w.skillId),
            niveau: w.level || '',
            // En pourcentage, comme partout ailleurs sur cet écran.
            pourcent: Math.round(100 * (Number(w.mastery) || 0))
        }));

    const notes = (Array.isArray(l.notes) ? l.notes : [])
        .filter(n => n && n.note !== null && n.note !== undefined)
        .map(n => ({
            runId: n.runId || '',
            seance: n.pathName || 'Séance',
            note: Number(n.note),
            sur: Number(n.sur) || 20
        }));

    const questions = Number(l.totalQuestions) || 0;
    const vide = !fragiles.length && !notes.length && !questions;

    return { vide, phrase: phraseDuDetail(l, fragiles, notes, questions), fragiles, notes };
}

/**
 * LA LIGNE QUI RÉSUME LE DÉPLIAGE.
 *
 * ON NE DIT PAS « 0 NOTION FRAGILE » QUAND IL N'Y A RIEN D'ENREGISTRÉ. Les
 * deux se ressemblent dans les données et ne se ressemblent pas du tout dans
 * la salle : l'un est un élève qui va bien, l'autre un élève qui n'est jamais
 * venu. C'est la même confusion que « 0 % de réussite », qu'on a déjà refusé
 * d'écrire sur le résumé de classe.
 *
 * ET « PAS ENCORE ASSEZ » N'EST PAS « RIEN DE FRAGILE ». Le serveur ne retient
 * une notion que lorsqu'elle est `reliable` — assez de questions pour trancher.
 * Un élève qui a fait quatre questions n'a donc aucune notion fragile, ce qui
 * ne veut pas dire qu'il n'en a pas.
 */
function phraseDuDetail(l, fragiles, notes, questions) {
    if (!questions) {
        return l.lastSeenAt
            ? 'Il s\'est connecté, mais rien n\'est encore enregistré.'
            : 'Jamais venu : il n\'y a rien à détailler.';
    }
    const bouts = [];
    if (fragiles.length) {
        bouts.push(`${fragiles.length} notion${fragiles.length > 1 ? 's' : ''} fragile${
            fragiles.length > 1 ? 's' : ''}`);
    } else {
        bouts.push('rien ne ressort comme fragile');
    }
    if (notes.length) {
        bouts.push(`${notes.length} séance${notes.length > 1 ? 's' : ''} notée${
            notes.length > 1 ? 's' : ''}`);
    }
    // Une majuscule au début, un point à la fin : c'est une phrase.
    const texte = bouts.join(', ');
    return texte.charAt(0).toUpperCase() + texte.slice(1) + '.';
}

export const POUR_ESSAI = { FRAGILE };
