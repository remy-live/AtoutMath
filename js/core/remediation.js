// Remédiation : transformer un constat d'échec en séance de travail.
//
// Quatre points d'entrée, tous produisant un parcours d'entraînement classique
// (donc joué par le même moteur, tracé de la même façon) :
//
//   startAmelioration(bilan)     — le bouton « M'améliorer » du bilan de séance
//   startErrorReview()           — le carnet d'erreurs complet
//   startSkillSession(skillId)   — travailler une compétence précise
//   startRecommendedSession()    — la séance conseillée par le modèle de maîtrise
//
// Le principe commun : chaque question ratée est rejouée À L'IDENTIQUE grâce à
// sa graine, puis suivie d'une question du même type. Refaire exactement la
// question ratée est ce qui permet à l'élève de constater qu'il sait faire ;
// enchaîner sur une variante est ce qui vérifie qu'il a compris, et pas retenu.

import { state } from './state.js';
import { makePath, makeStep } from './path.js';
// LA RÈGLE DU PARCOURS DE RÉVISION VIT À PART, pour qu'une épreuve puisse la
// lire : ce module-ci importe `state.js`, qui a besoin d'un `document`.
import { etapesDAmelioration, firstExerciseForSkill, exerciseForQuestion }
    from './amelioration.js';
import { defaultPolicy } from './policy.js';
import { getExerciseById, estRevisable } from '../data/catalog.js';
import { openErrors } from './projections.js';
import { cleQuestion } from './carnet.js';
import { journal } from './journal.js';
import { skillLabel, prereqChain } from '../data/skills.js';
import { getRecommendations } from './stats.js';

const REVISION_POLICY = {
    ...defaultPolicy(),
    maxAttemptsPerItem: 3,   // en remédiation, on laisse plus de place à l'essai
    hints: true,
    showCorrection: true,
    adaptive: true
};

async function run(path, opts = {}) {
    if (!path.steps.length) return false;
    const { Runner } = await import('./runner.js');
    const runner = new Runner({ path, deviceMode: 'none', ...opts });
    return runner.start();
}

/**
 * LE BOUTON « M'AMÉLIORER » : on ouvre le parcours de révision.
 *
 * IL PORTE LE NOM DE LA SÉANCE D'OÙ IL SORT. « Remédiation » ne disait rien à
 * personne ; « M'améliorer — Avant les vacances » se reconnaît dans une liste
 * et dans un bilan.
 *
 * ET C'EST UN PARCOURS À PART, jamais la séance du professeur : `makePath` lui
 * donne son propre identifiant, donc rien de ce qu'on y fait ne touche aux
 * étapes validées de la séance, ni à la note déjà rendue.
 *
 * ── IL PARAÎT AUSSI EN INTERROGATION, ET C'EST RÉMY QUI L'A TRANCHÉ ────────
 *
 * Il avait posé une règle voisine sur le bilan d'ÉTAPE : « en mode
 * interrogation, il ne faut pas proposer à la fin de refaire l'exercice »
 * (voir `peutRefaire` dans core/runner.js). Celle-là tient toujours, et elle ne
 * s'applique pas ici : le bouton « Refaire pour m'améliorer » rejoue L'ÉTAPE
 * NOTÉE elle-même, alors que « M'améliorer » ouvre un parcours d'entraînement
 * séparé, après que la note est rendue.
 *
 * Posé la question, sa réponse mot pour mot : « oui mais en interrogation ça ne
 * changera pas la note ». Donc pas de condition sur `bilan.mode` ici — et c'est
 * le moment du devoir rendu que l'élève a le plus de raisons de vouloir
 * reprendre. Une épreuve le garde (`tests/mAmeliorer.test.mjs`), parce que
 * c'est exactement le genre de ligne qu'une main pressée « corrigerait » en
 * croyant appliquer l'autre règle.
 */
export function startAmelioration(bilan) {
    const steps = etapesDAmelioration(bilan);
    if (!steps.length) return Promise.resolve(false);
    const nom = (bilan && bilan.pathName)
        ? `M'améliorer — ${bilan.pathName}` : 'M\'améliorer';
    return run(makePath(nom, steps, REVISION_POLICY));
}

/**
 * SÉANCE À PARTIR DU CARNET D'ERREURS.
 *
 * ON RÉVISE DES QUESTIONS, PAS DES LIGNES DE JOURNAL. Le journal identifie une
 * erreur par sa graine, ce qui est juste pour la rejouer et faux pour la
 * compter : un générateur qui tire au hasard produit « 2 + 3 × 4 » sous seize
 * graines différentes. « Réviser 10 questions » construisait alors dix étapes à
 * partir des dix premières clés — c'est-à-dire dix fois le même calcul. On
 * regroupe donc d'abord (voir core/carnet.js), on rejoue UNE graine par
 * question, et l'on solde ensuite TOUTE la famille.
 *
 * @param {number} limite  combien de questions au maximum.
 * @param {object} [opts]
 * @param {Array<string[]>} [opts.familles]  restreint la séance à ces questions
 *   (chaque entrée = les clés de journal d'une même question). Sert au bouton
 *   « Réviser » d'un exercice du carnet.
 * @param {string} [opts.nom]  le titre affiché du parcours de révision.
 */
export function startErrorReview(limite = 6, { familles = null, nom = 'Plan de révisions' } = {}) {
    // Les jeux de pure logique sont écartés : rejouer « une erreur de sudoku »
    // veut dire redonner une grille, ce qui n'a rien à voir avec ce qu'on
    // vient de rater.
    const ouvertes = openErrors(journal.all()).filter(e => estRevisable(e.exerciseId));
    const parCle = new Map(ouvertes.map(e => [e.key, e]));

    const listes = (familles || regrouperFamilles(ouvertes))
        // Une famille peut avoir vieilli entre l'affichage et le clic : on ne
        // garde que ce qui est encore ouvert.
        .map(f => (f || []).filter(k => parCle.has(k)))
        .filter(f => f.length)
        .slice(0, limite);

    const steps = listes.map(f => {
        const err = parCle.get(f[0]);
        const exoId = err.exerciseId && getExerciseById(err.exerciseId)
            ? err.exerciseId
            : firstExerciseForSkill(err.skillId);
        if (!exoId) return null;
        return makeStep(exoId, {}, { nbItems: 2, threshold: 2, forceSeed: err.itemSeed || null });
    });

    const retenues = listes.filter((_, i) => steps[i]);
    const utiles = steps.filter(Boolean);
    if (!utiles.length) return Promise.resolve(false);

    const path = makePath(nom, utiles, REVISION_POLICY);
    // Une question rejouée avec succès sort du carnet — avec ses jumelles.
    return run(path, {
        onExit: () => {
            retenues.forEach(f => {
                const err = parCle.get(f[0]);
                const fixed = state.attemptHistory.some(a =>
                    a.itemSeed && a.itemSeed === err.itemSeed && a.correct && a.attemptIndex === 0);
                if (fixed) f.forEach(cle => state.markErrorCorrected(cle));
            });
            import('../ui/navigation.js').then(m => m.setTopNavMode('profile'));
        }
    });
}

/** Les clés du journal, regroupées par question réellement distincte. */
function regrouperFamilles(ouvertes) {
    const par = new Map();
    const seules = [];
    ouvertes.forEach(e => {
        const cle = cleQuestion(e);
        if (!cle) { seules.push([e.key]); return; }
        if (!par.has(cle)) par.set(cle, []);
        par.get(cle).push(e.key);
    });
    return [...par.values(), ...seules];
}

/**
 * Travaille une compétence. Si elle est très fragile, on insère d'abord son
 * prérequis le plus faible : c'est la différence entre « refaire la même chose
 * en espérant que ça rentre » et remonter à la cause.
 */
export function startSkillSession(skillId, { includePrereq = true } = {}) {
    const steps = [];

    if (includePrereq) {
        const chain = prereqChain(skillId);
        const weakest = chain
            .map(id => ({ id, m: masteryValue(id) }))
            .filter(x => x.m < 0.7)
            .sort((a, b) => a.m - b.m)[0];
        if (weakest) {
            const exoId = firstExerciseForSkill(weakest.id);
            if (exoId) steps.push(makeStep(exoId, {}, { nbItems: 5, threshold: 4 }));
        }
    }

    const exoId = firstExerciseForSkill(skillId);
    if (exoId) steps.push(makeStep(exoId, {}, { nbItems: 8, threshold: 6 }));

    if (!steps.length) return Promise.resolve(false);
    return run(makePath(`Réviser : ${skillLabel(skillId)}`, steps, REVISION_POLICY));
}

/**
 * Séance du jour, construite à partir du modèle de maîtrise.
 *
 * ON PEUT LUI DONNER LA LISTE QU'ON A DÉJÀ MONTRÉE, et c'est le point.
 *
 * Rémy : « Dans ce que tu dois réviser, tu peux mettre un bouton Tout
 * réviser. » Un bouton qui dit « tout » doit faire TOUT CE QUI EST À L'ÉCRAN,
 * et pas une liste refabriquée à côté. Avec un simple nombre, les deux listes
 * se recalculent séparément : mesuré, 68 notions sont recommandées pour un
 * élève qui en voit trois, et `buildRecommendedPreview` écarte en plus celles
 * qui n'ont aucun exercice. Il suffit qu'une notion sans exercice soit en tête
 * pour que l'élève voie les n° 2 et 3 et travaille les n° 1 et 2.
 *
 * @param {number|Array<{skillId:string, reason?:string, exerciseId?:string}>} quoi
 *   un nombre (on recommande nous-mêmes) ou les notions déjà affichées.
 */
export function startRecommendedSession(quoi = 3) {
    const recos = Array.isArray(quoi)
        ? quoi
        : getRecommendations({ niveaux: state.selectedNiveaux, limit: quoi });
    const steps = recos.map(r => {
        const exoId = r.exerciseId || firstExerciseForSkill(r.skillId);
        if (!exoId) return null;
        const nb = r.reason === 'nouveau' ? 6 : 5;
        return makeStep(exoId, {}, { nbItems: nb, threshold: Math.ceil(nb * 0.7) });
    }).filter(Boolean);

    if (!steps.length) return Promise.resolve(false);
    // LE PARCOURS PORTE LE MOT DE L'ÉLÈVE, PAS CELUI DU PROFESSEUR.
    //
    // Le même arbitrage qu'en face, dans `ui/pathView.js` : « “Séance” est le
    // mot du professeur […] et ne doit pas porter le même nom ». Le bouton y
    // avait été corrigé ; le PARCOURS, lui, s'appelait encore « Séance
    // conseillée » — et c'est ce titre-là que l'élève lit en haut de son écran
    // pendant toute la révision, puis sur son bilan. Mesuré : on appuie sur
    // « Tout réviser » et l'on arrive sur « Séance conseillée · Étape 1 sur 3 ».
    return run(makePath('Ce que je dois réviser', steps, REVISION_POLICY));
}

export function buildRecommendedPreview(limit = 3) {
    return getRecommendations({ niveaux: state.selectedNiveaux, limit })
        .filter(r => firstExerciseForSkill(r.skillId))
        .map(r => ({
            ...r,
            label: skillLabel(r.skillId),
            exerciseId: firstExerciseForSkill(r.skillId),
            motif: { remediation: 'Prérequis à consolider', revision: 'À revoir', nouveau: 'Nouveau' }[r.reason]
        }));
}

// --- Utilitaires ------------------------------------------------------------

function masteryValue(skillId) {
    const e = state.masteryMap.get(skillId);
    return e ? e.mastery : 0;
}
