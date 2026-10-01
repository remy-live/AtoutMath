// Modèle de parcours, version 2.
//
// Avant : une étape était une COPIE PROFONDE de l'exercice du catalogue
// (titre, consigne, tags, schéma de paramètres…), figée au moment du
// glisser-déposer. Trois problèmes : les parcours pesaient lourd, ils ne
// bénéficiaient jamais des corrections apportées au catalogue, et ils étaient
// impossibles à représenter proprement en base de données.
//
// Maintenant : une étape est une RÉFÉRENCE + des surcharges.
//   { stepId, exerciseId, overrides, nbItems, threshold, weight }
// Elle est « hydratée » au lancement en fusionnant avec le catalogue courant.
// Un parcours devient un petit document JSON, versionnable et synchronisable.

import { getExerciseById } from '../data/catalog.js';
import { resolvePolicy, defaultPolicy } from './policy.js';
import { shortId } from './ids.js';
import { questionsConseillees } from './duree.js';
import { getGenerator } from './registry.js';
import { SEUIL_DEFAUT } from './recompenses.js';
import { seuilConseille } from './seuilEtape.js';
import { titreNettoye, texteNettoye, apercuDuMessage, motVide } from './messageEtape.js';

export const PATH_VERSION = 2;

/**
 * LE GENRE D'UNE ÉTAPE — et il n'y en avait pas.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *
 * RÉMY : « dans le parcours ce qui serait sympa c'est de pouvoir caler un
 * message entre les exercices, pour expliquer un peu. »
 *
 * UNE ÉTAPE ÉTAIT TOUJOURS UN EXERCICE, nulle part écrit parce que nulle part
 * mis en doute : `hydratePath` ÉCARTAIT toute étape dont l'exercice est
 * introuvable, et c'était juste — une étape sans exercice ne pouvait être
 * qu'un parcours abîmé ou un exercice renommé.
 *
 * ON NE DEVINE DONC PAS, ON DÉCLARE. Le genre est écrit sur l'étape, et le
 * logiciel ne demande jamais « cette étape a-t-elle un exercice ? » pour en
 * déduire ce qu'elle est : un parcours cassé et un message resteraient
 * indiscernables, et le premier s'afficherait comme le second.
 *
 * UNE ÉTAPE SANS GENRE EST UN EXERCICE. C'est ce qui fait que les milliers de
 * parcours déjà rangés — dans les navigateurs, au serveur, dans les codes
 * dictés — continuent de marcher sans conversion.
 */
export const GENRE_MESSAGE = 'message';

/** Cette étape est-elle un mot du professeur, et non un exercice ? */
export function estUnMessage(step) {
    return !!step && step.genre === GENRE_MESSAGE;
}

/**
 * UN MOT DU PROFESSEUR, À UN RANG DU PARCOURS.
 *
 * ── CE QU'IL NE FAIT PAS, ET C'EST LE PLUS IMPORTANT ─────────────────────
 *
 * Il ne pose AUCUNE question (`nbItems: 0`), donc il n'entre ni dans le total
 * des questions, ni dans le barème, ni dans la note. `weight: 0` ne suffirait
 * pas : `totalWeight` somme `st.weight || 1`, et zéro y vaut un. Ce sont donc
 * `totalItems` et `totalWeight` qui l'écartent nommément.
 *
 * IL N'EST PAS `facultatif`, ET C'EST VOULU. Le meneur SAUTE les étapes
 * facultatives en avançant (voir `endStep`) : marqué facultatif, le message ne
 * s'afficherait jamais. Il se traverse, comme un exercice — simplement, on le
 * traverse en lisant.
 *
 * @param {{titre?:string, texte?:string}} message
 */
export function makeMessage(message = {}, opts = {}) {
    return {
        stepId: opts.stepId || 's_' + shortId(6),
        genre: GENRE_MESSAGE,
        message: {
            titre: titreNettoye(message.titre),
            texte: texteNettoye(message.texte)
        },
        nbItems: 0, threshold: 0, weight: 0,
        bonus: false, facultatif: false
    };
}

/**
 * Le nombre de questions que CET exercice conseille.
 *
 * La même règle vivait déjà dans `shortcodes.js`, sous le nom `telQuel` : deux
 * copies d'un même défaut finissent toujours par diverger, et celle-ci décidait
 * de ce qu'un élève verrait.
 */
export function questionsConseilleesDe(exerciseId) {
    const exo = getExerciseById(exerciseId);
    if (!exo) return 10;
    return questionsConseillees(
        exo.generatorId ? getGenerator(exo.generatorId) : null,
        exo.params || {}, { activite: exo.activityId });
}

export function makeStep(exerciseId, overrides = {}, opts = {}) {
    return {
        stepId: opts.stepId || 's_' + shortId(6),
        exerciseId,
        overrides: { ...overrides },
        // LE COMPTE NATUREL DE L'EXERCICE, PAS DIX POUR TOUT LE MONDE.
        //
        // Rémy : « par défaut propose 20 questions lorsque ce sont des
        // calculs ». C'était déjà le cas quand on passait par le bouton
        // « ajouter », qui calculait le conseil et le passait ici — mais
        // partout ailleurs (un parcours importé, un code élève, une étape
        // fabriquée par du code) le dix en dur reprenait la main. Et comme dix
        // est une valeur VRAIE, le repli `step.nbItems || conseil` du panneau
        // ne se déclenchait jamais : il n'y avait aucun moyen de distinguer
        // « dix, parce que le professeur l'a voulu » de « dix, faute de mieux ».
        //
        // Le conseil vit dans l'exercice : vingt pour un réflexe de calcul,
        // douze pour une grille de mots croisés, quarante pour un duel. On le
        // demande donc ici, une fois pour toutes.
        nbItems: opts.nbItems || questionsConseilleesDe(exerciseId),
        // SEPT SUR DIX PAR DÉFAUT. Rémy : « de base, mets 70 % de bonnes
        // réponses exigées comme réglage par défaut. » L'étape ne demandait
        // rien : « aller au bout » validait un élève qui s'était trompé
        // partout. Voir `seuilConseille` dans core/seuilEtape.js.
        //
        // `null` reste possible et veut dire AUCUNE EXIGENCE — c'est ce dont
        // l'évaluation et les jeux de récompense ont besoin, eux se notent ou
        // se gagnent, ils ne se valident pas. Mais ce n'est plus le défaut :
        // il faut désormais le demander, en décochant le quota.
        threshold: opts.threshold !== undefined
            ? opts.threshold
            : seuilConseille(opts.nbItems || questionsConseilleesDe(exerciseId)),
        // Nom propre à l'étape, quand il apprend quelque chose que le titre de
        // l'exercice ne dit pas — le palier d'un mode apprentissage, par
        // exemple (« Découverte », « Défi »).
        titre: opts.titre || null,
        weight: opts.weight || 1,
        timeLimit: opts.timeLimit || null,
        // Rejeu exact d'une question passée : la graine suffit à la régénérer,
        // on n'a donc jamais besoin de stocker son contenu.
        forceSeed: opts.forceSeed || null,
        // LE TEMPS BORNE, PAS LE NOMBRE. Posé par les exercices que l'élève se
        // donne « pour cinq minutes » : le nombre de questions n'est alors
        // qu'un garde-fou interne, et l'en-tête ne doit pas l'annoncer comme
        // un total à atteindre. Voir `updateProgress` dans le meneur.
        sansTotal: !!opts.sansTotal,
        // UNE ÉTAPE QUI NE SE FERME PAS TOUTE SEULE.
        //
        // RÉMY : « il faudrait que les jeux bacs à sable ne soient pas limités,
        // par exemple le peintre ou nova ça s'arrête trop vite ».
        //
        // Le bac à sable posait `nbItems: 1` pour dire « pas de devoir ici »,
        // et le meneur le lisait comme « une question et c'est fini » : il
        // ferme l'étape dès que le compte est atteint (voir `onAttempt`).
        // MESURÉ sur Nova, le Peintre et Tetris : l'étape se fermait à la
        // PREMIÈRE réussite, sur les trois. Ce n'était donc pas deux jeux, mais
        // tout le bac.
        //
        // `sansTotal` ne suffisait pas : il ne parle que de l'AFFICHAGE du
        // total. Ici c'est l'arrêt lui-même qu'on retire. Ce qui arrête reste :
        // le jeu qui se termine (une partie perdue, un niveau fini), le
        // chronomètre s'il y en a un, et l'élève qui sort.
        sansFin: !!opts.sansFin,
        // UNE ÉTAPE-JEU n'est pas du travail : elle ne compte ni dans les
        // exercices à faire, ni dans la note, et elle ne s'ouvre qu'une fois
        // le travail qui la précède réussi. Voir core/recompenses.js.
        bonus: !!opts.bonus,
        // UNE ÉTAPE FACULTATIVE SE PROPOSE, ELLE NE BARRE PAS LA ROUTE.
        //
        // Rémy : « ce serait cool de pouvoir sélectionner plusieurs exercices
        // pour les rendre non obligatoires ou en récompense. Par contre c'est
        // chronologique : si les 2 premiers sont obligatoires et le 3 et 4 non
        // obligatoires, il faut réussir le 1 et 2 pour ouvrir le 3 et 4 et
        // pouvoir faire le 5. »
        //
        // La règle tient donc en une phrase, et c'est ce qui la rend sûre :
        // une étape s'ouvre quand toutes les étapes OBLIGATOIRES qui la
        // précèdent sont faites. Une facultative n'entre pas dans ce compte —
        // elle s'ouvre en même temps que la suite, et l'élève choisit.
        //
        // Ce n'est pas l'ordre libre, qui ouvre TOUT dès le début : ici l'ordre
        // reste, seule l'obligation tombe.
        facultatif: !!opts.facultatif,
        // UNE ÉTAPE PEUT NE S'OUVRIR QU'EN CLASSE. Rémy : « il ne faut pas
        // vraiment que l'élève ait accès aux interros à la maison, mais il
        // peut très bien avoir accès à la séquence avant mon cours. »
        //
        // Le verrou porte une EMPREINTE de clé, jamais la clé : un parcours
        // voyage dans un lien, et un lien se décode. Voir core/verrou.js.
        verrou: opts.verrou || null,
        // Et l'autre face de la même idée : une étape qui n'existe pas encore.
        // C'est ce qui permet de distribuer la séquence entière d'avance et de
        // la laisser s'ouvrir séance après séance.
        ouvertureLe: opts.ouvertureLe || null
    };
}

export function makePath(name = 'Nouveau parcours', steps = [], policy = null) {
    return {
        id: 'path_' + shortId(8),
        version: PATH_VERSION,
        name,
        policy: policy || defaultPolicy(),
        // Le niveau de réussite qui ouvre les jeux de récompense du parcours.
        bonusSeuil: SEUIL_DEFAUT,
        steps
    };
}

/**
 * Convertit un parcours de n'importe quelle version vers la v2.
 * Les anciens parcours (tableau d'exercices copiés) restent utilisables.
 */
export function normalizePath(raw, name = 'Parcours') {
    if (!raw) return makePath(name);

    // Ancien format : un simple tableau d'étapes-copies.
    if (Array.isArray(raw)) {
        return {
            id: 'path_' + shortId(8),
            version: PATH_VERSION,
            name,
            policy: defaultPolicy(),
            steps: raw.map((s, i) => legacyStep(s, i))
        };
    }

    if (raw.version === PATH_VERSION) {
        return {
            bonusSeuil: SEUIL_DEFAUT,
            ...raw,
            // UN PARCOURS SANS IDENTIFIANT EN REÇOIT UN ICI, ET NULLE PART
            // AILLEURS. Le format v2 recopiait l'objet tel quel : un parcours né
            // sans identifiant en restait dépourvu pour toujours, y compris
            // après enregistrement et rechargement. Voir `state.currentPath` :
            // c'est de là que venaient tous les `null`.
            id: raw.id || 'path_' + shortId(8),
            policy: resolvePolicy(raw.policy),
            steps: (raw.steps || []).map(normalizeStep)
        };
    }

    // Objet { name, data: [...] } tel que stocké par l'ancien navigateur de parcours.
    const steps = Array.isArray(raw.data) ? raw.data : (raw.steps || []);
    return {
        id: raw.id || 'path_' + shortId(8),
        version: PATH_VERSION,
        name: raw.name || name,
        policy: resolvePolicy(raw.policy),
        // LA GRAINE DE REPRISE SURVIT À LA NORMALISATION. C'est elle qui
        // distingue un rattrapage du travail d'origine — dans le code dicté
        // comme dans le journal. La perdre ici, c'est faire du rattrapage une
        // copie exacte de l'original, dont il ramasserait le bilan.
        ...(raw.reprise ? { reprise: raw.reprise } : {}),
        steps: steps.map((s, i) => legacyStep(s, i))
    };
}

function legacyStep(s, i) {
    const p = s.currentParams || s.params || {};
    return {
        stepId: s.stepId || `s_legacy_${i}`,
        exerciseId: s.exerciseId || s.exoId || s.id,
        overrides: stripRuntimeKeys(p),
        nbItems: p.nbQuestions || 10,
        threshold: p.successThreshold !== undefined ? p.successThreshold : null,
        weight: s.weight || 1,
        timeLimit: p.timeLimit || null,
        forceSeed: p.forceSeed || null,
        forceQuestion: p.forceQuestion || null,
        bonus: !!s.bonus,
        facultatif: !!s.facultatif
    };
}

function normalizeStep(s) {
    // UN MESSAGE NE PREND PAS LES DÉFAUTS D'UN EXERCICE. « dix questions, seuil
    // sept » n'a aucun sens sur un mot à lire, et ces valeurs-là se
    // retrouveraient dans le total des questions du parcours.
    if (estUnMessage(s)) {
        return {
            ...s,
            message: {
                titre: titreNettoye((s.message || {}).titre),
                texte: texteNettoye((s.message || {}).texte)
            },
            nbItems: 0, threshold: 0, weight: 0,
            bonus: false, facultatif: false,
            overrides: {}
        };
    }
    return {
        weight: 1, nbItems: 10, threshold: null, timeLimit: null, bonus: false,
        facultatif: false, verrou: null, ouvertureLe: null,
        ...s,
        bonus: !!s.bonus,
        // UN JEU DE RÉCOMPENSE EST FACULTATIF PAR NATURE : il ne se fait pas
        // pour ouvrir la suite, il se gagne. Le dire ici évite d'avoir à y
        // penser partout où l'on compte ce qui barre la route.
        facultatif: !!s.facultatif || !!s.bonus,
        overrides: s.overrides || {}
    };
}

// nbQuestions / successThreshold / timeLimit sont des réglages de déroulement,
// pas des paramètres de contenu : ils vivent au niveau de l'étape.
function stripRuntimeKeys(params) {
    const { nbQuestions, successThreshold, timeLimit, minScore, forceQuestion, forceSeed, ...rest } = params || {};
    return rest;
}

/**
 * Hydrate un parcours : chaque étape est fusionnée avec l'exercice du
 * catalogue pour produire un objet directement exécutable par le runner.
 * Les étapes dont l'exercice a disparu sont écartées (et signalées).
 * @returns {{path:Object, steps:Array, missing:string[]}}
 */
export function hydratePath(path) {
    const normalized = normalizePath(path);
    const missing = [];
    const steps = [];

    for (const step of normalized.steps) {
        // UN MESSAGE N'A PAS D'EXERCICE, ET CE N'EST PAS UNE ÉTAPE ABÎMÉE.
        //
        // C'est ici que tout se jouait : cette boucle écartait silencieusement
        // toute étape dont l'exercice est introuvable, ce qui est le bon geste
        // pour un exercice renommé — et qui aurait fait disparaître le mot du
        // professeur sans un mot, à l'affichage comme à l'impression.
        //
        // ON LE RECONNAÎT AU GENRE, pas à l'absence d'exercice : un parcours
        // vraiment abîmé doit continuer d'être écarté et SIGNALÉ.
        if (estUnMessage(step)) {
            // UN MOT VIDE N'EST PAS UNE ÉTAPE.
            //
            // MESURÉ DANS LA SÉANCE DE RÉMY : son parcours « Relatifs » en
            // portait un, titre et texte vides. L'élève aurait traversé un
            // écran avec une bulle, aucun texte, et « J'ai compris » sous le
            // vide — en cherchant ce qu'il devait comprendre.
            //
            // ÉCARTÉ ICI ET PAS AILLEURS : `hydratePath` est l'endroit où le
            // parcours devient ce que l'élève TRAVERSE. Dans l'atelier, la
            // ligne reste — c'est peut-être un mot que Rémy allait écrire, et
            // la faire disparaître sous ses doigts serait pire que de la
            // laisser.
            if (motVide(step.message)) continue;
            steps.push({
                ...step,
                exercise: null,
                // LE TITRE EST CELUI DE LA LISTE : le fil, la carte et l'atelier
                // demandent tous un nom d'étape, et `apercuDuMessage` en donne
                // un même quand Rémy n'a pas mis de titre.
                title: apercuDuMessage(step.message),
                params: {}
            });
            continue;
        }
        const exo = getExerciseById(step.exerciseId);
        if (!exo) {
            missing.push(step.exerciseId);
            continue;
        }
        steps.push({
            ...step,
            exercise: exo,
            title: step.titre || exo.title,
            params: { ...(exo.params || {}), ...(step.overrides || {}) },
            threshold: step.threshold === null ? step.nbItems : step.threshold
        });
    }

    return { path: normalized, steps, missing };
}

/**
 * Total des poids, pour afficher la répartition du barème dans l'éditeur.
 * Les jeux de récompense en sont exclus : on ne note pas une récompense.
 */
export function totalWeight(path) {
    // ET LES MESSAGES AUSSI : on ne note pas un mot à lire. `weight: 0` ne
    // suffirait PAS — la somme ci-dessous lit `st.weight || 1`, où zéro vaut
    // un. Il faut donc les écarter nommément, et c'est exactement le défaut
    // qu'une relecture ne voit pas : un parcours de deux exercices et d'un
    // message aurait eu un barème sur trois.
    return (path.steps || []).filter(st => !st.bonus && !estUnMessage(st))
        .reduce((s, st) => s + (st.weight || 1), 0) || 1;
}

/** Nombre total de questions d'un parcours — hors jeux de récompense et messages. */
export function totalItems(path) {
    return (path.steps || []).filter(st => !st.bonus && !estUnMessage(st))
        .reduce((s, st) => s + (st.nbItems || 0), 0);
}
