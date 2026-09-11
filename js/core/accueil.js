// CE QU'ON DIT À L'ÉLÈVE QUAND IL ARRIVE, ET QUAND IL REPART.
//
// Trois moments, un seul mécanisme. Les coder séparément aurait produit trois
// systèmes concurrents qui se marchent dessus — deux modales qui s'ouvrent en
// même temps, un encouragement par-dessus une proposition de révision.
//
//   À LA RECONNEXION  on lui parle de SES erreurs, avec des mots (« le
//                     rapporteur mal placé », « 7 × 8 »), puis on lui propose
//                     une courte révision. Dix questions au plus : au-delà,
//                     ce n'est plus une révision, c'est une punition.
//   UNE FOIS PAR JOUR un conseil ou un encouragement. Une ligne, pas une
//                     modale de plus.
//   APRÈS UN ÉCHEC    quand un exercice est vraiment loupé, on ré-explique et
//                     on redonne un exemple avant de reproposer.
//
// Ce module ne fait que DÉCIDER. Il ne connaît ni le DOM ni le journal : on
// lui passe des faits, il renvoie un message. C'est ce qui permet de tester
// les seuils — et un seuil mal réglé, ici, se paie en découragement.

import { numeroDeJour } from './quotidien.js';
import { entreeDuJour, genreDuJour } from '../data/quotidien.js';

/** Un même jour civil ? C'est ce qui borne « une fois par jour ». */
export function memeJour(a, b) {
    if (!a || !b) return false;
    const x = new Date(a), y = new Date(b);
    return x.getFullYear() === y.getFullYear()
        && x.getMonth() === y.getMonth()
        && x.getDate() === y.getDate();
}

/**
 * CE QU'ON DIT À L'ÉLÈVE CHAQUE JOUR.
 *
 * Il n'y avait ici que sept conseils, et ils tournaient : au bout d'une semaine
 * l'élève les connaissait et ne lisait plus la ligne. Rémy : « on pourrait
 * avoir une liste de blagues mathématiques très courtes, une liste de
 * citations, une liste de conseils […] et une série de petites énigmes très
 * courtes qu'on pourrait suggérer chaque jour. Une centaine de chaque. »
 *
 * Les quatre listes vivent dans `data/`, le tirage dans `core/quotidien.js` —
 * même phrase toute la journée, et rien qui se répète tant que la liste n'est
 * pas épuisée. Ce module ne fait plus que CHOISIR LE GENRE du jour et rendre
 * une ligne prête à lire.
 *
 * `CONSEILS` reste exporté : le carnet et l'écran d'arrivée s'en servent, et
 * c'est bien la même liste — simplement passée de sept entrées à cent.
 */
export { CONSEILS } from '../data/conseils.js';

/**
 * La ligne du jour, tous genres confondus.
 *
 * Une CITATION porte sa signature, une ÉNIGME porte son indice — jamais sa
 * réponse : une énigme dont on lit la réponse en même temps que l'énoncé n'est
 * pas une énigme. L'élève la cherche dans la journée, et la retrouve au banc
 * d'essai du professeur s'il la lui demande.
 */
export function conseilDuJour(maintenant) {
    const jour = numeroDeJour(maintenant);
    const v = entreeDuJour(genreDuJour(jour), { maintenant });
    if (!v) return '';
    if (v.signature) return `« ${v.texte} » — ${v.signature}`;
    if (v.indice) return `${v.texte} (Indice : ${v.indice})`;
    return v.texte;
}

/**
 * Dit une erreur avec des mots, pas avec un identifiant.
 * « 7 × 8 » et « le rapporteur mal placé » se reconnaissent ; « num.mult.table.7 »
 * ne veut rien dire pour personne.
 */
export function direErreur(e) {
    const quoi = (e.questionText || '').trim();
    if (quoi) return quoi.length > 40 ? quoi.slice(0, 38) + '…' : quoi;
    return e.exoTitle || 'une question';
}

export function resumeErreurs(erreurs, max = 3) {
    const vues = new Set();
    const out = [];
    for (const e of erreurs) {
        const t = direErreur(e);
        if (vues.has(t)) continue;
        vues.add(t);
        out.push(t);
        if (out.length >= max) break;
    }
    return out;
}

/**
 * Le message dû à l'arrivée — ou `null` s'il n'y a rien à dire.
 *
 * @param {Object} faits
 * @param {number} faits.maintenant
 * @param {?number} faits.derniereVisite
 * @param {Array} faits.erreurs      - le carnet, déjà filtré des jeux non révisables
 * @param {Array} faits.tentatives   - {ts, correct} des derniers jours
 * @param {number} [faits.maxQuestions] - plafond de la révision proposée
 */
export function messageDArrivee(faits) {
    const {
        maintenant, derniereVisite = null, erreurs = [],
        tentatives = [], maxQuestions = 10
    } = faits || {};

    // Une fois par jour, pas à chaque rechargement de page. Un élève qui
    // revient trois fois dans l'après-midi n'a pas à revoir la même modale.
    if (memeJour(maintenant, derniereVisite)) return null;

    const ouvertes = erreurs.filter(e => !e.corrected);
    const premiere = derniereVisite === null;

    // Ce qu'il a fait la veille : c'est de ça qu'on parle, pas de sa moyenne
    // générale. Une bonne journée doit être vue le lendemain.
    const veille = tentatives.filter(t => t.ts > maintenant - 3 * 86400000);
    const justes = veille.filter(t => t.correct).length;
    const taux = veille.length ? justes / veille.length : null;

    if (premiere) {
        return {
            type: 'bienvenue',
            titre: 'Bienvenue !',
            texte: 'Choisis un exercice qui te tente. Le robot peut le faire devant toi avant que tu essaies, et le bouton d\'indice t\'aide sans jamais donner la réponse.',
            conseil: conseilDuJour(maintenant),
            erreurs: [], revision: null
        };
    }

    if (ouvertes.length >= 2) {
        const noms = resumeErreurs(ouvertes);
        const combien = Math.min(maxQuestions, ouvertes.length);
        // LES TITRES SORTENT DE LA PHRASE.
        //
        // Énumérés au fil du texte, entre guillemets et séparés par des
        // virgules, ils se coupaient n'importe où — « Segment, Droite / ou
        // Demi-droite ? » sur deux lignes, la virgule du titre confondue avec
        // celle de l'énumération. Une liste dit d'un coup d'œil combien il y
        // en a, et chaque titre reste entier.
        return {
            type: 'revision',
            titre: 'On reprend deux ou trois choses ?',
            texte: `La dernière fois, ${noms.length > 1 ? 'ces questions t\'ont' : 'cette question t\'a'} résisté :`,
            liste: noms,
            suite: `Je te propose ${combien} question${combien > 1 ? 's' : ''} pour les revoir — pas plus.`,
            conseil: conseilDuJour(maintenant),
            erreurs: noms,
            revision: { questions: combien }
        };
    }

    if (taux !== null && veille.length >= 5 && taux >= 0.8) {
        return {
            type: 'felicitations',
            titre: 'Belle séance la dernière fois !',
            texte: `${justes} bonnes réponses sur ${veille.length}. Ton carnet d'erreurs est presque vide : `
                + `c'est le moment d'essayer quelque chose d'un cran plus dur.`,
            conseil: conseilDuJour(maintenant),
            erreurs: [], revision: null
        };
    }

    return {
        type: 'conseil',
        titre: 'Bonjour !',
        texte: ouvertes.length === 1
            ? `Il te reste une question à revoir : « ${direErreur(ouvertes[0])} ».`
            : 'Ton carnet d\'erreurs est vide. Belle occasion d\'attaquer quelque chose de neuf.',
        conseil: conseilDuJour(maintenant),
        erreurs: resumeErreurs(ouvertes),
        revision: ouvertes.length === 1 ? { questions: 1 } : null
    };
}

// --- La fin d'un exercice -----------------------------------------------------

/** En dessous de ce taux, on ne passe pas à la suite comme si de rien n'était. */
export const SEUIL_LOUPE = 0.4;
/** Et au-dessus de celui-là, on le dit. */
export const SEUIL_REUSSI = 0.85;

/**
 * Le bilan d'un exercice terminé.
 *
 * Deux garde-fous plutôt qu'un seuil sec :
 *  · il faut au moins 5 réponses. Deux erreurs sur trois questions ne sont pas
 *    un échec, c'est un échantillon ;
 *  · on ne parle d'échec que si l'élève a VRAIMENT répondu. Un exercice quitté
 *    au bout de deux questions ne mérite pas une leçon de morale.
 */
export function bilanExercice({ repondues = 0, justes = 0, titre = '', lecon = '', seuil = SEUIL_LOUPE } = {}) {
    if (repondues < 5) {
        return { verdict: 'court', taux: null, titre: '', texte: '', relancer: false };
    }
    const taux = justes / repondues;

    if (taux < seuil) {
        return {
            verdict: 'loupe', taux, relancer: true,
            titre: 'On reprend calmement.',
            texte: `${justes} bonne${justes > 1 ? 's' : ''} réponse${justes > 1 ? 's' : ''} sur ${repondues}`
                + `${titre ? ` en « ${titre} »` : ''} : ce n'est pas toi, c'est que la règle n'est pas encore posée. `
                + `Relis-la, regarde l'exemple, puis on recommence — cette fois avec le robot si tu veux.`,
            lecon
        };
    }
    if (taux >= SEUIL_REUSSI) {
        return {
            verdict: 'reussi', taux, relancer: false,
            titre: 'Bravo !',
            texte: `${justes} sur ${repondues}${titre ? ` en « ${titre} »` : ''}. C'est acquis : tu peux monter d'un cran.`
        };
    }
    return {
        verdict: 'moyen', taux, relancer: false,
        titre: 'C\'est en train de rentrer.',
        texte: `${justes} sur ${repondues}${titre ? ` en « ${titre} »` : ''}. Encore une série et ce sera solide.`
    };
}
