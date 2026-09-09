// LA SÉANCE PILOTÉE PAR LE PROFESSEUR — côté élève.
//
// Rémy, en une phrase : « vérouiller la partie élève pour qu'il n'ait accès
// qu'a ce que je leur donne, la possibilité d'envoyer un message
// individuellement, d'avoir un vrai contrôle sur ce qu'ils font, pouvoir
// supprimer ou autoriser le saut d'un exercice au cas où un exercice plante et
// empeche la progression. »
//
// Le serveur répond à tout cela par un seul objet — l'état de séance — qu'il
// glisse dans chaque réponse de synchronisation (voir `api/lib/seance.php`).
// Ce module le RANGE et le REND LISIBLE ; il ne dessine rien, et c'est ce qui
// permet de le tester sans navigateur.
//
// IL SURVIT AU RECHARGEMENT, et ce n'est pas un détail. La synchro répond en
// une demi-seconde au mieux ; sans mémoire, un élève qui recharge sa page verrait
// le catalogue entier pendant cette demi-seconde, ce qui est exactement ce que
// le verrou est censé empêcher. L'état est donc relu du stockage local AVANT le
// premier échange, et rafraîchi ensuite.
//
// CE QUE CE VERROU EST, ET CE QU'IL N'EST PAS. Il tient la classe sur le
// travail donné, comme une consigne au tableau. Il ne résiste pas à un élève
// qui ouvre les outils du navigateur — rien de ce qui s'exécute chez lui ne le
// peut. Ce qui est vraiment tenu, c'est le serveur : un élève écarté ne se
// rattache plus, et personne ne lit le travail d'un autre.

import { globalStore } from './store.js';
import { getActiveProfile } from './profile.js';

const CLE = 'seanceDistante';

const VIDE = {
    className: '', classCode: '',
    locked: false, notice: null, blocked: false,
    messages: [], skippable: [], removed: []
};

let etat = { ...VIDE };
let charge = false;

/**
 * Relit ce qu'on savait avant la fermeture de l'onglet.
 *
 * MAIS SEULEMENT SI CE PROFIL EST ENCORE RATTACHÉ À UNE CLASSE. Sans cette
 * condition, un verrou survivait à la classe qui l'avait posé : le professeur
 * essaie l'application sur la tablette d'un élève, se rattache à une classe
 * verrouillée, puis change de profil — et l'appareil reste verrouillé pour
 * toujours, sans serveur pour le rouvrir puisqu'il n'y a plus de jeton. Le
 * verrou appartient au rattachement ; sans rattachement, il n'existe pas.
 */
export async function initSeanceDistante() {
    if (charge) return etat;
    charge = true;
    const profil = getActiveProfile();
    if (!(profil && profil.remote && profil.remote.token)) {
        // On efface aussi ce qui restait : un état orphelin ne doit pas
        // ressusciter si l'on se rattache un jour à une autre classe.
        await globalStore.set(CLE, null).catch(() => {});
        return etat;
    }
    const garde = await globalStore.get(CLE, null);
    if (garde) {
        etat = { ...VIDE, ...garde };
        prevenir();
    }
    return etat;
}

/**
 * Le serveur vient de parler. On garde, on annonce.
 *
 * On annonce MÊME SI RIEN N'A CHANGÉ ? Non : la synchro tourne toutes les cinq
 * minutes et à chaque rafale de réponses, et redessiner la bannière à chaque
 * fois ferait clignoter une consigne que personne n'a touchée. On compare donc
 * le contenu, pas la date.
 */
export function appliquerEtat(nouveau) {
    if (!nouveau || typeof nouveau !== 'object') return etat;
    const avant = JSON.stringify(etat);
    etat = { ...VIDE, ...nouveau };
    globalStore.set(CLE, etat).catch(() => {});
    if (JSON.stringify(etat) !== avant) prevenir();
    return etat;
}

function prevenir() {
    document.dispatchEvent(new CustomEvent('seance_distante', { detail: { ...etat } }));
}

export function etatSeance() {
    return { ...etat };
}

export function estVerrouille() {
    return !!etat.locked;
}

export function estEcarte() {
    return !!etat.blocked;
}

export function consigneDuProf() {
    return etat.notice || '';
}

export function messagesNonLus() {
    return Array.isArray(etat.messages) ? etat.messages.slice() : [];
}

/**
 * L'EXERCICE RETIRÉ DU PARCOURS. Le geste du professeur qui a constaté qu'un
 * exercice plante : il disparaît, comme s'il n'y avait jamais été. C'est plus
 * net que de le laisser en place grisé — un élève de sixième essaierait quand
 * même de cliquer dessus.
 */
export function estRetire(exerciceId) {
    return !!exerciceId && etat.removed.includes(exerciceId);
}

/**
 * LE SAUT AUTORISÉ. L'exercice reste, mais un bouton « passer » apparaît :
 * l'élève qui s'y casse les dents continue son parcours, et l'étape ne compte
 * ni pour ni contre lui — elle n'a aucune tentative, donc aucun poids dans la
 * note (voir `gradeRun`, qui agrège les tentatives et non les étapes).
 */
export function peutSauter(exerciceId) {
    return !!exerciceId && etat.skippable.includes(exerciceId);
}

/** Retire du parcours les étapes que le professeur a supprimées. */
export function filtrerEtapes(etapes) {
    if (!etat.removed.length || !Array.isArray(etapes)) return etapes;
    return etapes.filter(e => !estRetire(e && e.exercise && e.exercise.id));
}

/**
 * « Je l'ai lu. » On l'enlève de la liste tout de suite — l'élève a fermé le
 * message, il ne doit pas le revoir même si le serveur ne répond pas — et l'on
 * prévient le serveur en arrière-plan, pour la coche du professeur.
 */
export async function direLu(ids) {
    const liste = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
    if (!liste.length) return;
    etat = { ...etat, messages: etat.messages.filter(m => !liste.includes(m.id)) };
    globalStore.set(CLE, etat).catch(() => {});
    prevenir();
    try {
        const { apiEleve } = await import('./sync.js');
        await apiEleve('/messages/read', { ids: liste });
    } catch (err) {
        // Le message est lu chez l'élève, et c'est le principal. Le professeur
        // verra « pas encore lu » — un défaut d'affichage, pas une perte.
        console.info('[séance] accusé de lecture reporté :', err.message);
    }
}
