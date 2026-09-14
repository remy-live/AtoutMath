// LES NOUVEAUTÉS — DÉDUITES DU CATALOGUE, PLUS RECOPIÉES À CÔTÉ.
//
// Rémy : « je pense que quand tu crées un exercice, il faut que tu inclues la
// date dans son descripteur, voire un historique ». Il a raison, et c'est
// meilleur que ce qu'il y avait : une liste écrite à part, à côté du catalogue.
//
// CE QUI CLOCHAIT DANS LA LISTE À PART. Elle DOUBLE une information : le même
// exercice existait à deux endroits, sous deux formes, et rien n'obligeait les
// deux à rester d'accord. Un exercice renommé laissait un identifiant orphelin ;
// un exercice ajouté sans qu'on pense à la liste n'apparaissait jamais. Il avait
// fallu un test rien que pour vérifier que la copie ne mentait pas — le signe
// qu'on avait rangé l'information au mauvais endroit.
//
// LA DATE VIT DONC SUR L'EXERCICE, là où on l'écrit :
//
//     { id: 'geo-pavage', cree: '2026-08-18', … }
//
// Elle ne peut plus se désynchroniser : elle EST le descripteur. Et le tri par
// date se calcule, il ne se maintient pas.
//
// LES DATES DES CENT TROIS EXERCICES EXISTANTS N'ONT PAS ÉTÉ INVENTÉES : elles
// ont été relevées dans l'historique du dépôt — la date du premier commit où
// chaque identifiant apparaît. C'est la vraie date, pas une estimation.
//
// L'HISTORIQUE, LUI, NE SE RETROUVE PAS. Savoir QUAND un fichier a changé est
// mécanique ; savoir si ce changement MÉRITE d'être raconté ne l'est pas. Les
// révisions ne s'écrivent donc qu'à partir d'aujourd'hui, à la main, et
// seulement quand l'exercice CHANGE DE NATURE — pas pour une faute
// d'orthographe. Un historique qu'on remplit trois fois puis qu'on oublie est
// pire que pas d'historique : il fait croire que les entrées vides n'ont jamais
// bougé.

import { exercices } from './catalog.js';

/** Combien de journées de livraison on montre. Au-delà, ce n'est plus neuf. */
export const JOURNEES_MONTREES = 3;

const EST_UNE_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** La date qui classe un exercice : sa dernière révision, sinon sa création. */
export function dateDeReference(exo) {
    if (!exo) return null;
    const revues = (exo.revisions || [])
        .map(r => r && r.date)
        .filter(d => EST_UNE_DATE.test(d || ''))
        .sort();
    const derniere = revues[revues.length - 1];
    const cree = EST_UNE_DATE.test(exo.cree || '') ? exo.cree : null;
    if (derniere && (!cree || derniere > cree)) return derniere;
    return cree;
}

/** Ce qu'on raconte de cet exercice : sa dernière révision, ou sa création. */
export function quoiDeNeuf(exo) {
    const d = dateDeReference(exo);
    if (!d) return null;
    const rev = (exo.revisions || []).find(r => r && r.date === d);
    return rev ? { date: d, quoi: rev.quoi, revise: true } : { date: d, quoi: null, revise: false };
}

/**
 * Les nouveautés, groupées par JOURNÉE de livraison, de la plus récente à la
 * plus ancienne.
 *
 * Par jour et non par version : une même vague de travail se termine souvent en
 * plusieurs versions — on corrige un défaut deux minutes après avoir livré —, et
 * Rémy ne reçoit pas des versions, il reçoit des journées.
 *
 * @param {Array} [liste] - le catalogue, ou un jeu d'essai
 * @param {number} [journees]
 * @returns {Array<{date: string, entrees: Array<{exo, quoi, revise}>}>}
 */
export function vaguesDuCatalogue(liste = exercices, journees = JOURNEES_MONTREES) {
    const parJour = new Map();
    for (const exo of liste) {
        const neuf = quoiDeNeuf(exo);
        if (!neuf) continue;
        if (!parJour.has(neuf.date)) parJour.set(neuf.date, []);
        parJour.get(neuf.date).push({ exo, quoi: neuf.quoi, revise: neuf.revise });
    }
    return [...parJour.entries()]
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .slice(0, journees)
        .map(([date, entrees]) => ({
            date,
            // Les exercices REVUS d'abord : eux seuls portent une phrase qui dit
            // ce qui a changé, et c'est elle qu'on est venu lire.
            entrees: [...entrees].sort((a, b) => (b.revise ? 1 : 0) - (a.revise ? 1 : 0))
        }));
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « 18 août 2026 » — une date se lit, elle ne se déchiffre pas. */
export function direLaDate(iso) {
    if (!EST_UNE_DATE.test(iso || '')) return '';
    const [a, m, j] = iso.split('-').map(Number);
    if (!MOIS[m - 1]) return '';
    return `${j === 1 ? '1er' : j} ${MOIS[m - 1]} ${a}`;
}
