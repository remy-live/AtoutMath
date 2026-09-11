// LES EXERCICES QUE L'ÉLÈVE SE DONNE À LUI-MÊME.
//
// Rémy : « il faudrait dans le parcours pouvoir ajouter des exercices propres
// pour l'élève. On a une rubrique Exercices personnalisés qui permet de
// rajouter des exercices limités par le nombre de questions ou le temps (le
// prof ne les connaît pas car c'est propre à l'élève et enregistré). Et si
// l'élève s'en sort bien, on peut proposer un jeu avec un temps. »
//
// POURQUOI C'EST AUTRE CHOSE QU'UN PARCOURS. Un parcours est un DEVOIR : il
// vient du professeur, il est noté, il se rend. Ce que l'élève se donne ici
// n'est ni l'un ni l'autre — c'est un entraînement qu'il choisit, qu'il borne
// lui-même, et qu'il retrouve la fois suivante. Les deux ne doivent surtout
// pas se confondre : le premier se subit, le second se décide.
//
// ET PERSONNE D'AUTRE NE LE VOIT. La liste vit dans le profil de l'élève, sur
// son appareil ; elle ne part dans aucun code de parcours, elle ne s'exporte
// pas avec les documents du professeur. Ce qui est joué compte évidemment dans
// SA progression — ce serait absurde autrement —, mais le choix des exercices
// lui appartient.
//
// LA LIMITE EST LE CŒUR DU DISPOSITIF. « Dix questions » ou « cinq minutes » :
// borner soi-même son travail, c'est décider de s'y mettre, et savoir quand
// c'est fini. Un entraînement sans fin annoncée ne se commence pas.
//
// Aucun DOM ici, aucun stockage : on reçoit des données, on rend des données.

import { makePath, makeStep } from './path.js';
import { defaultPolicy, MODES } from './policy.js';

/** Les bornes proposées. Rien d'exotique : ce sont celles qu'on utilise. */
export const LIMITES = {
    questions: [5, 10, 15, 20, 30],
    minutes: [2, 3, 5, 10, 15]
};

export const LIMITE_DEFAUT = { type: 'questions', valeur: 10 };

/** Combien de questions au maximum quand la limite est un temps. */
const PLAFOND_AU_TEMPS = 40;

/**
 * La politique d'un entraînement qu'on se donne : on corrige, on aide, on
 * recommence. Ce n'est pas une évaluation — personne ne note personne.
 */
export function politiquePerso() {
    return {
        ...defaultPolicy(),
        mode: MODES.ENTRAINEMENT,
        hints: true,
        showCorrection: true,
        maxAttemptsPerItem: 2,
        grading: null      // on ne note pas ce qu'on se donne à soi-même
    };
}

export function normaliserLimite(limite) {
    const l = limite || {};
    const type = l.type === 'temps' ? 'temps' : 'questions';
    const valeur = Number(l.valeur);
    if (!Number.isFinite(valeur) || valeur <= 0) return { ...LIMITE_DEFAUT };
    // On borne : une limite de trois cents questions n'est pas un entraînement,
    // c'est une punition.
    if (type === 'temps') return { type, valeur: Math.min(60, Math.round(valeur)) };
    return { type, valeur: Math.min(60, Math.round(valeur)) };
}

export function decrireLimite(limite) {
    const l = normaliserLimite(limite);
    return l.type === 'temps'
        ? `${l.valeur} minute${l.valeur > 1 ? 's' : ''}`
        : `${l.valeur} question${l.valeur > 1 ? 's' : ''}`;
}

/**
 * Une entrée de la liste. `exerciseId` suffit : le titre et les réglages se
 * relisent dans le catalogue, sauf ce que l'élève a modifié lui-même.
 */
export function creerExercicePerso({ exerciseId, titre = '', params = {}, limite } = {}) {
    if (!exerciseId) return null;
    return {
        id: 'perso_' + Math.random().toString(36).slice(2, 10),
        exerciseId,
        titre: String(titre || ''),
        params: { ...(params || {}) },
        limite: normaliserLimite(limite),
        cree: null,          // horodaté par la couche qui enregistre
        fois: 0,             // combien de fois joué
        meilleur: null       // meilleur taux de réussite, en pourcentage
    };
}

/** Ajoute sans doublon inutile : même exercice + même limite = déjà là. */
export function ajouter(liste, entree) {
    if (!entree) return liste || [];
    const deja = (liste || []).some(e => e.exerciseId === entree.exerciseId
        && e.limite.type === entree.limite.type && e.limite.valeur === entree.limite.valeur);
    return deja ? (liste || []) : [...(liste || []), entree];
}

export function retirer(liste, id) {
    return (liste || []).filter(e => e.id !== id);
}

/**
 * Range le résultat d'une partie. On garde le MEILLEUR taux, pas le dernier :
 * la liste doit donner envie d'y revenir, pas rappeler le jour où ça s'est mal
 * passé.
 */
export function noterResultat(liste, id, taux) {
    const pct = Math.max(0, Math.min(100, Math.round(Number(taux) * 100)));
    return (liste || []).map(e => (e.id !== id ? e : {
        ...e,
        fois: (e.fois || 0) + 1,
        meilleur: e.meilleur === null || pct > e.meilleur ? pct : e.meilleur
    }));
}

/** L'étape de parcours correspondante : c'est là que la limite prend effet. */
export function enEtape(entree) {
    const l = normaliserLimite(entree.limite);
    return makeStep(entree.exerciseId, entree.params || {}, {
        stepId: `perso_${entree.id}`,
        // Au temps, le nombre de questions ne borne plus rien : c'est le
        // chronomètre qui arrête. On laisse un plafond large pour que la
        // session ne s'arrête pas d'elle-même avant la fin du temps.
        nbItems: l.type === 'temps' ? PLAFOND_AU_TEMPS : l.valeur,
        threshold: 0,
        timeLimit: l.type === 'temps' ? l.valeur * 60 : null,
        // Au temps, l'en-tête ne doit pas annoncer « 0 / 40 » : ce plafond est
        // un garde-fou, pas un devoir.
        sansTotal: l.type === 'temps'
    });
}

/** Le parcours d'un seul exercice — ce que le moteur sait déjà jouer. */
export function enParcours(entree, exercice = null) {
    const nom = entree.titre || (exercice && exercice.title) || 'Mon exercice';
    const path = makePath(nom, [enEtape(entree)], politiquePerso());
    // MARQUÉ PERSONNEL, et c'est ce qui le distingue d'un devoir dans le
    // journal comme à l'écran : pas de note, pas de rendu, pas de professeur.
    path.personnel = true;
    return path;
}

/** Le seuil au-dessus duquel on offre une partie : trois quarts de réussite. */
export const SEUIL_RECOMPENSE = 0.75;

/**
 * A-t-on assez bien travaillé pour mériter le jeu ? On exige aussi un minimum
 * de questions : réussir les deux seules questions posées avant d'abandonner
 * n'est pas une séance de travail.
 */
export function meriteRecompense(bilan, seuil = SEUIL_RECOMPENSE) {
    if (!bilan) return false;
    const posees = bilan.totalQuestions || 0;
    if (posees < 4) return false;
    const taux = bilan.ratioPondere !== undefined
        ? bilan.ratioPondere
        : (posees ? (bilan.totalReussies || 0) / posees : 0);
    return taux >= seuil;
}

/**
 * La partie offerte : un jeu, chronométré, et une seule.
 * @param {string} jeuId - identifiant d'exercice-jeu du catalogue
 * @param {number} minutes
 */
export function parcoursRecompense(jeuId, minutes = 3) {
    const etape = makeStep(jeuId, {}, {
        stepId: 'recompense',
        nbItems: 1,
        threshold: 0,
        timeLimit: Math.max(1, Math.round(minutes)) * 60,
        bonus: true
    });
    const path = makePath('Ta partie', [etape], politiquePerso());
    path.personnel = true;
    return path;
}
