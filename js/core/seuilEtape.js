// COMBIEN DE QUESTIONS, ET COMBIEN IL FAUT EN RÉUSSIR.
//
// Rémy : « il ne peut pas y avoir plus de bonnes réponses exigées que de
// questions. Quand on est en mode évaluation, pas besoin de bonne réponse
// exigée. On pourrait mettre un double slider ? »
//
// LE PANNEAU POSAIT DEUX RAILS INDÉPENDANTS, de 1 à 50 chacun. Rien n'empêchait
// « 30 bonnes réponses exigées » sous « 10 questions » : le panneau acceptait
// l'absurdité, et le code la rattrapait en douce au moment d'enregistrer, par
// un `Math.min`. Le professeur voyait donc 30, l'étape en gardait 10, et
// personne ne lui disait qu'il venait d'écrire une chose impossible.
//
// LE DOUBLE CURSEUR A RÉGLÉ CELA, PUIS A POSÉ SON PROPRE PROBLÈME. Deux
// poignées sur un rail rendaient bien l'état interdit irreprésentable, mais
// Rémy est revenu dessus : « pour le nombre de questions, il est au bout du
// slide, on peut le modifier, et il n'y a QU'UN bouton sur le slide, actif ou
// non selon la nécessité d'avoir un quota de bonne réponse. »
//
// IL A RAISON, ET LA RAISON EST QUE LES DEUX NOMBRES NE SE RÈGLENT PAS PAREIL.
// La longueur d'une étape, on la SAIT — « je veux dix questions » —, on la
// tape ; on ne la cherche pas en glissant un doigt. Le quota, lui, se cherche :
// « combien puis-je en tolérer ? » est une question de proportion, et c'est
// exactement ce qu'un rail montre. Un nombre tapé, un rail, et un interrupteur
// pour dire s'il y a un quota du tout.
//
// L'ÉTAT INTERDIT RESTE IRREPRÉSENTABLE, autrement : le maximum du rail EST le
// nombre tapé. On ne peut pas exiger onze bonnes réponses sur dix, non parce
// qu'une vérification le refuse, mais parce que le rail s'arrête à dix.
//
// EN ÉVALUATION, IL N'Y A PAS DE SEUIL DU TOUT. Une interrogation ne se
// « valide » pas question par question : elle se note. Exiger 7 sur 10 y
// signifierait « en dessous de 7, tu recommences », ce qui n'existe pas dans un
// devoir surveillé. Le seuil vaut alors `null` — aucune exigence — et la
// deuxième poignée disparaît au lieu de proposer un réglage sans effet.
//
// Module pur : ni DOM, ni état.

import { MAX_QUESTIONS } from './duree.js';

/** Une étape sans question n'existe pas. */
export const MIN_ETAPE = 1;

/** Le maximum du rail : celui du nombre de questions. */
export const MAX_ETAPE = MAX_QUESTIONS;

/**
 * LE NOMBRE DE BONNES RÉPONSES RÉELLEMENT EXIGÉ PAR UNE ÉTAPE.
 *
 * Une seule lecture, partagée par le meneur, la barre de progression et
 * l'abandon — ils écrivaient chacun leur `Math.min(step.threshold,
 * step.nbItems)`, ce qui marchait tant que personne ne changeait d'avis sur ce
 * que vaut un seuil absent.
 *
 * `null` ou `undefined` valent ZÉRO EXIGENCE, et pas « tout réussir » : c'est
 * ce que fait le code depuis toujours (`Math.min(null, n)` vaut 0) et c'est ce
 * dont l'évaluation a besoin. Le commentaire de `makeStep` disait l'inverse.
 */
/**
 * LE SEUIL QU'UNE ÉTAPE PROPOSE QUAND PERSONNE N'EN A CHOISI : SEPT SUR DIX.
 *
 * Rémy : « de base, mets 70 % de bonnes réponses exigées comme réglage par
 * défaut. »
 *
 * L'ÉTAPE NE DEMANDAIT RIEN DU TOUT, et c'était le mauvais défaut. « Aller au
 * bout » valide un élève qui s'est trompé partout — le parcours avance, la
 * carte s'ouvre, et rien ne dit que la notion n'est pas acquise. Sept sur dix
 * est le seuil que les professeurs écrivent d'eux-mêmes : assez haut pour
 * vouloir dire quelque chose, assez bas pour qu'une étourderie ne coûte pas la
 * séance.
 *
 * ON ARRONDIT VERS LE HAUT, ET JAMAIS AU-DELÀ DU TOTAL : sur six questions,
 * 70 % font 4,2, donc cinq — quatre serait 67 %, en dessous de ce qu'on
 * annonce. Sur une seule question, il en faut une.
 */
export const PART_EXIGEE = 0.7;

export function seuilConseille(questions) {
    const n = Math.max(1, Math.floor(Number(questions) || 0));
    return Math.max(1, Math.min(n, Math.ceil(n * PART_EXIGEE)));
}

export function seuilRequis(step) {
    if (!step) return 0;
    const n = Math.max(0, Math.floor(Number(step.nbItems) || 0));
    if (step.threshold === null || step.threshold === undefined) return 0;
    const t = Math.floor(Number(step.threshold) || 0);
    return Math.max(0, Math.min(t, n));
}

/**
 * LES DEUX POIGNÉES APRÈS UN GESTE, toujours dans un état possible.
 *
 * `bouge` dit LAQUELLE des deux le professeur vient de tirer, et c'est ce qui
 * décide qui cède :
 *
 *   · il tire « exigées » vers la droite → elle bute contre « questions ».
 *     Monter le seuil ne doit pas allonger le devoir en douce.
 *   · il tire « questions » vers la gauche, sous le seuil → le seuil SUIT.
 *     Le bloquer laisserait la poignée basse derrière la haute, c'est-à-dire
 *     exactement l'état qu'on veut rendre impossible.
 *
 * @param {{questions:number, exigees:number, bouge?:('questions'|'exigees'), max?:number}} p
 * @returns {{questions:number, exigees:number}}
 */
export function ajusterDuo({ questions, exigees, bouge = 'questions', max = MAX_ETAPE }) {
    const haut = Math.max(MIN_ETAPE, Math.floor(Number(max) || MAX_ETAPE));
    let q = Math.max(MIN_ETAPE, Math.min(haut, Math.floor(Number(questions) || MIN_ETAPE)));
    let e = Math.max(MIN_ETAPE, Math.min(haut, Math.floor(Number(exigees) || MIN_ETAPE)));
    if (e > q) {
        if (bouge === 'questions') e = q;   // le devoir raccourcit, l'exigence suit
        else e = q;                          // l'exigence bute contre le devoir
    }
    return { questions: q, exigees: e };
}

/**
 * CE QU'ON ÉCRIT DANS L'ÉTAPE, selon le mode du parcours.
 *
 * En évaluation, `threshold` vaut `null` : c'est l'absence d'exigence, et non
 * un seuil de zéro que quelqu'un pourrait relire comme « réglé à 0 ».
 */
export function seuilPourMode({ questions, exigees, evaluation = false, quota = true, max = MAX_ETAPE }) {
    const duo = ajusterDuo({ questions, exigees, max });
    return { nbItems: duo.questions, threshold: (evaluation || !quota) ? null : duo.exigees };
}

/**
 * LE QUOTA EST-IL DEMANDÉ ? Une lecture, et une seule, pour toute l'interface.
 *
 * Rémy : « il n'y a qu'un bouton sur le slide, actif ou non selon la nécessité
 * d'avoir un quota de bonne réponse ». C'est un OUI/NON, et il faut le lire
 * dans l'étape telle qu'elle est enregistrée : `threshold` absent veut dire
 * « pas de quota », un nombre veut dire « ce nombre ». Sans cette fonction,
 * chaque panneau redevinait la réponse à sa façon — et l'un d'eux se trompait.
 */
export function quotaDemande(step) {
    return !!step && step.threshold !== null && step.threshold !== undefined;
}

/**
 * LA PHRASE SOUS LE RAIL. C'est elle qui rend le double curseur lisible : deux
 * poignées sans légende se lisent comme un intervalle (« de 7 à 10 »), ce qui
 * n'est pas du tout ce qu'elles disent.
 */
export function phraseDuo({ questions, exigees, evaluation = false, quota = true }) {
    const q = Math.max(MIN_ETAPE, Math.floor(Number(questions) || MIN_ETAPE));
    if (evaluation) {
        return `${q} question${q > 1 ? 's' : ''} — notées, sans seuil à franchir.`;
    }
    // PAS DE QUOTA : L'ÉTAPE SE VALIDE EN ALLANT AU BOUT. Il faut le DIRE, et
    // non laisser un rail éteint le sous-entendre — c'est un choix
    // pédagogique ordinaire (on s'entraîne, on ne trie pas), pas une panne.
    if (!quota) {
        return `${q} question${q > 1 ? 's' : ''} — l'étape se valide en allant au bout.`;
    }
    const duo = ajusterDuo({ questions: q, exigees });
    if (duo.exigees >= duo.questions) {
        return `${duo.questions} question${duo.questions > 1 ? 's' : ''} — il faut TOUT réussir.`;
    }
    // ET RIEN DE PLUS. Rémy : « ne mets pas "2 erreurs tolérées", le prof n'est
    // pas idiot. » La phrase se terminait sur la soustraction qu'elle venait
    // d'écrire — 6 moins 4 — sous couvert de la reformuler. Une interface qui
    // explique ce qu'elle vient de dire prend son lecteur pour quelqu'un qui
    // n'a pas suivi, et fait perdre du temps à celui qui a suivi.
    return `${duo.exigees} bonne${duo.exigees > 1 ? 's' : ''} réponse${duo.exigees > 1 ? 's' : ''} `
        + `exigée${duo.exigees > 1 ? 's' : ''} sur ${duo.questions}.`;
}
