// COMBIEN DE TEMPS DURE CE PARCOURS ?
//
// Rémy : « c'est assez arbitraire la durée tout de même ». Il a raison, et
// c'est pour cela qu'on ne donne jamais un chiffre unique. Deux réponses
// seulement sont honnêtes :
//
//   UNE FOURCHETTE, quand on estime. « 25 à 40 min » dit à la fois l'ordre de
//   grandeur et le fait qu'on ne sait pas mieux. Un « 32 min » aurait la même
//   valeur avec, en plus, l'air d'être vrai.
//
//   UNE MESURE, quand on en a une. Dès qu'un exercice a été joué assez de fois,
//   le journal sait combien de temps une question y prend RÉELLEMENT. Ce n'est
//   plus une estimation : c'est ce que font les élèves, et cela remplace le
//   barème théorique exercice par exercice.
//
// LES ORDRES DE GRANDEUR NE SORTENT PAS D'UN CHAPEAU, mais ils restent des
// ordres de grandeur : un réflexe se répond vite parce que c'est le but même
// d'un réflexe, une notion demande de lire, de poser, de vérifier, et un jeu
// autonome ne se compte pas en questions — on y joue une manche.

// Secondes par question, du plus rapide au plus lent, selon la nature.
//
// DIVISÉES PAR DEUX SUR LE TERRAIN. Rémy, devant un parcours de 900 questions
// annoncé à « 6 h 05 à 13 h 10 » : « je pense que tu exagères sur le temps,
// vraiment, c'est au moins 2 fois trop ». Il voit ses élèves travailler, et
// une estimation qui double la durée réelle ne sert à rien — elle fait
// renoncer à une séance qui tenait.
//
// Ces chiffres restent des ordres de grandeur, et c'est bien pour cela que la
// mesure les remplace dès qu'elle existe : elle, elle ne se discute pas.
export const FOURCHETTES = {
    reflexe: [4, 10],
    notion: [15, 35]
};

/** Un jeu ne se compte pas en questions : on y joue une manche. */
export const MANCHE_DE_JEU = [180, 420];

/** En dessous, la médiane mesurée ne vaut rien : c'est un échantillon. */
export const MINIMUM_MESURES = 6;

/** Un temps de réponse aberrant (l'élève est parti manger) ne compte pas. */
const PLAFOND_REPONSE_MS = 5 * 60 * 1000;

/**
 * Ce que les élèves mettent VRAIMENT, exercice par exercice.
 *
 * @param {Array} tentatives - le journal des tentatives ({exerciseId, msElapsed})
 * @returns {Object} { exoId: { medianeMs, nombre } }
 */
export function mesuresParExercice(tentatives) {
    const parExo = new Map();
    (tentatives || []).forEach(t => {
        const id = t.exerciseId;
        const ms = Number(t.msElapsed);
        if (!id || !Number.isFinite(ms) || ms <= 0 || ms > PLAFOND_REPONSE_MS) return;
        if (!parExo.has(id)) parExo.set(id, []);
        parExo.get(id).push(ms);
    });

    const out = {};
    parExo.forEach((liste, id) => {
        if (liste.length < MINIMUM_MESURES) return;
        // La MÉDIANE et non la moyenne : une seule pause de trois minutes
        // suffirait à doubler une moyenne, et le chiffre serait faux pour tout
        // le monde.
        liste.sort((a, b) => a - b);
        const m = liste.length % 2
            ? liste[(liste.length - 1) / 2]
            : (liste[liste.length / 2 - 1] + liste[liste.length / 2]) / 2;
        out[id] = { medianeMs: m, nombre: liste.length };
    });
    return out;
}

/**
 * La durée d'une étape, en secondes.
 *
 * @param {{nature: string, questions: number}} etape
 * @param {{medianeMs: number}} [mesure]
 * @returns {{min: number, max: number, mesure: boolean}}
 */
export function estimerEtape(etape, mesure) {
    const questions = Math.max(1, Number(etape && etape.questions) || 1);

    if (mesure && mesure.medianeMs > 0) {
        // Autour de la médiane mesurée : les uns vont plus vite, les autres
        // relisent. La fourchette reste large — une médiane n'est pas une
        // promesse.
        const parQuestion = mesure.medianeMs / 1000;
        return {
            min: Math.round(parQuestion * 0.7 * questions),
            max: Math.round(parQuestion * 1.5 * questions),
            mesure: true
        };
    }

    if (etape.nature === 'jeu') {
        return { min: MANCHE_DE_JEU[0], max: MANCHE_DE_JEU[1], mesure: false };
    }

    const [bas, haut] = FOURCHETTES[etape.nature] || FOURCHETTES.notion;
    return { min: bas * questions, max: haut * questions, mesure: false };
}

/**
 * Le parcours entier.
 * @returns {{min, max, mesurees, total}} en secondes, plus le compte d'étapes
 *   dont la durée est mesurée et non estimée.
 */
export function estimerParcours(etapes, mesures = {}) {
    let min = 0, max = 0, mesurees = 0;
    (etapes || []).forEach(e => {
        const d = estimerEtape(e, mesures[e.exerciceId]);
        min += d.min;
        max += d.max;
        if (d.mesure) mesurees++;
    });
    return { min, max, mesurees, total: (etapes || []).length };
}

/** « 25 à 40 min », « 8 min », « 1 h 10 à 1 h 30 ». */
export function direDuree(minSec, maxSec) {
    if (!maxSec) return '';
    const a = enMinutes(minSec), b = enMinutes(maxSec);
    // Une fourchette dont les deux bouts s'arrondissent pareil n'apprend rien
    // de plus qu'un seul chiffre.
    return a === b ? enTexte(a) : `${enTexteCourt(a, b)} à ${enTexte(b)}`;
}

function enMinutes(sec) {
    const m = Math.round(sec / 60);
    if (m <= 10) return m;                 // sous dix minutes, la minute compte
    return Math.round(m / 5) * 5;          // au-delà, arrondir au quart d'heure
}

function enTexte(min) {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60), r = min % 60;
    return r ? `${h} h ${String(r).padStart(2, '0')}` : `${h} h`;
}

/** Le premier terme d'une fourchette : « 45 » dans « 45 à 1 h 10 ». */
function enTexteCourt(a, b) {
    return (a < 60 && b < 60) ? String(a) : enTexte(a);
}

/**
 * Est-ce que ça tient dans une heure de cours ?
 *
 * On juge sur le HAUT de la fourchette : un parcours qui « tient peut-être »
 * ne tient pas. C'est le chiffre dont on a besoin en préparant sa séance.
 */
export function tensionDuree(maxSec) {
    const min = maxSec / 60;
    if (min <= 25) return 'courte';
    if (min <= 55) return 'seance';
    return 'longue';
}

export const PHRASES_TENSION = {
    courte: 'Tient dans une demi-heure.',
    seance: 'Tient dans une heure de cours.',
    longue: 'Déborde d\'une heure de cours.'
};
