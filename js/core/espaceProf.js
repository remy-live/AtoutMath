// CE QUE L'APPLICATION SAIT DEMANDER AU SERVEUR, CÔTÉ PROFESSEUR.
//
// Rémy : « je ne peux rien configurer », « je n'ai rien pour gérer les élèves »,
// « fais moi qqch de classe, de beau, de simple ».
//
// Ce module ne dessine rien. Il ne fait qu'une chose, et il la fait pour tout
// l'espace professeur : parler au serveur, et rendre une réponse qu'on peut
// afficher sans réfléchir. Les écrans, eux, n'ont pas à savoir qu'il existe un
// jeton, un code d'erreur HTTP ou un délai d'attente.
//
// UNE SEULE FAÇON D'ÉCHOUER, ET ELLE EST EN FRANÇAIS. Chaque appel rend soit ce
// qu'on a demandé, soit un objet `{ erreur }` dont le texte est une phrase que
// le professeur peut lire. C'est ce qui manquait le plus : l'écran disait
// « identifiez-vous » pour quatre pannes différentes, et Rémy — qui venait
// justement de s'identifier — n'avait aucun moyen de comprendre.

import { jetonProf, oublierProf } from './verrouProf.js';
import { adresseApiDeduite } from './portail.js';

/** Combien de temps on attend le serveur avant de rendre la main. */
const PATIENCE = 12000;

/**
 * UN APPEL AU SERVEUR, AVEC LE JETON DU PROFESSEUR.
 *
 * @param {string} route  par ex. `/teacher/roster`
 * @param {object} corps  ce qu'on envoie
 * @returns {Promise<object>} la réponse, ou `{ erreur: 'phrase en français' }`
 */
export async function auServeur(route, corps = {}) {
    const j = jetonProf();
    if (!j || !j.token) {
        return { erreur: "Vous n'êtes pas identifié. Repassez en mode élève puis en mode "
            + 'professeur pour retaper votre mot de passe.' };
    }
    let r;
    try {
        r = await fetch(adresseApiDeduite() + route, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + j.token },
            body: JSON.stringify(corps),
            signal: AbortSignal.timeout(PATIENCE)
        });
    } catch (e) {
        return { erreur: 'Le serveur ne répond pas. Vos classes sont intactes — '
            + 'on ne les voit simplement pas d\'ici pour l\'instant.' };
    }

    let data = null;
    try { data = await r.json(); } catch (e) { data = null; }

    // DEUX REFUS QUI SE RESSEMBLENT, ET QU'IL NE FAUT SURTOUT PAS CONFONDRE.
    //
    // Le serveur distingue « jeton manquant » de « jeton invalide », et cette
    // nuance-là vaut une semaine de tâtonnements.
    //
    //   · `bad_token` — le jeton est arrivé et ne vaut rien. C'est le cas après
    //     une réinstallation, qui change le secret de signature : on l'oublie,
    //     et l'on demande de se reconnecter. C'est juste ;
    //   · `no_token` — le serveur n'a RIEN REÇU, alors qu'on vient de l'envoyer.
    //     Le jeton est donc bon : il s'est perdu EN ROUTE. C'est ce que fait
    //     Apache par défaut quand PHP tourne en CGI ou php-fpm — il garde
    //     l'en-tête `Authorization` pour son propre système d'authentification.
    //
    // ON NE JETTE PLUS UN JETON QUI N'A RIEN FAIT. Le confondre avec l'autre
    // cas envoyait Rémy retaper son mot de passe à chaque écran, pour rien : la
    // connexion réussissait (le mot de passe voyage dans le CORPS de la
    // requête), et l'appel suivant échouait encore. Une boucle sans issue, et
    // rien à l'écran pour la comprendre.
    if (r.status === 401 || r.status === 403) {
        const pourquoi = data && data.error;
        if (pourquoi === 'no_token') {
            return { erreur: "Le serveur n'a pas reçu votre identification, alors qu'elle a "
                + 'bien été envoyée : elle se perd entre Apache et PHP. Votre mot de passe '
                + "n'y est pour rien — inutile de le retaper. Ouvrez la page de Santé : la "
                + "ligne « L'en-tête d'autorisation » le dit et explique quoi faire." };
        }
        oublierProf();
        return { erreur: 'Votre connexion a expiré — cela arrive après une réinstallation '
            + 'du site. Repassez en mode élève puis en mode professeur.' };
    }
    if (!r.ok) {
        // Le serveur explique lui-même ce qu'il refuse, et il le fait en
        // français : on n'a rien de mieux à écrire par-dessus.
        return { erreur: (data && data.message) || 'Le serveur a refusé (code ' + r.status + ').' };
    }
    return data || {};
}

/** Les classes du professeur. Rend un tableau, ou `{ erreur }`. */
export async function mesClasses() {
    const d = await auServeur('/teacher/classes', { action: 'list' });
    if (d.erreur) return d;
    return Array.isArray(d.classes) ? d.classes : { erreur: 'Réponse inattendue du serveur.' };
}

/** Créer une classe. Rend la classe créée, ou `{ erreur }`. */
export async function creerClasse(nom, niveau = '') {
    const d = await auServeur('/teacher/classes',
        { action: 'create', name: nom, level: niveau || null });
    if (d.erreur) return d;
    // Le serveur rend expressément celle qu'il vient de créer : la chercher en
    // tête d'une liste triée à la seconde ouvrait parfois la mauvaise.
    return d.creee || { erreur: 'La classe a peut-être été créée : rechargez pour voir.' };
}

export const listeDeClasse = (classId) => auServeur('/teacher/roster', { classId, action: 'list' });
export const apercuDeListe = (classId, texte, codeCommun) =>
    auServeur('/teacher/roster', { classId, action: 'apercu', texte, codeCommun });
export const importerListe = (classId, liste) =>
    auServeur('/teacher/roster', { classId, action: 'importer', liste });
export const nouveauCode = (classId, studentId) =>
    auServeur('/teacher/roster', { classId, action: 'code', studentId });
export const refaireLesCodes = (classId, codeCommun = '') =>
    auServeur('/teacher/roster', { classId, action: 'codes', codeCommun });
export const retirerEleve = (classId, studentId) =>
    auServeur('/teacher/roster', { classId, action: 'retirer', studentId });
export const ecarterEleve = (classId, studentId, blocked) =>
    auServeur('/teacher/roster', { classId, action: 'bloquer', studentId, blocked });

export const leDirect = (classId) => auServeur('/teacher/live', { classId });

export const renommerClasse = (classId, name, level) =>
    auServeur('/teacher/class', { classId, action: 'rename', name, level });
export const mettreEnPause = (classId, locked) =>
    auServeur('/teacher/class', { classId, action: 'lock', locked });
export const poserConsigne = (classId, notice) =>
    auServeur('/teacher/class', { classId, action: 'notice', notice });
export const viderClasse = (classId, confirmation) =>
    auServeur('/teacher/class', { classId, action: 'empty', confirmation });
export const supprimerClasse = (classId, confirmation) =>
    auServeur('/teacher/class', { classId, action: 'delete', confirmation });

export const envoyerUnMot = (classId, body, studentId = '') =>
    auServeur('/teacher/message', { classId, body, studentId });
export const lesMots = (classId) => auServeur('/teacher/message', { classId, action: 'list' });

export const creerUnProfesseur = (displayName, email, password) =>
    auServeur('/teacher/signup', { action: 'create', displayName, email, password });
export const lesProfesseurs = () => auServeur('/teacher/signup', { action: 'list' });
/**
 * @param {string} teacherId
 * @param {'reprendre'|'effacer'} classes  ce qu'on fait de ses classes
 * @param {string} confirmation            'EFFACER', exigé pour `effacer`
 */
export const retirerUnProfesseur = (teacherId, classes = 'reprendre', confirmation = '') =>
    auServeur('/teacher/signup', { action: 'remove', teacherId, classes, confirmation });

/** Les réglages d'exercice d'une classe : saut autorisé, exercice retiré. */
export const lesReglages = (classId) =>
    auServeur('/teacher/override', { classId, action: 'list' });
export const reglerUnExercice = (classId, exerciseId, mode, studentId = '') =>
    auServeur('/teacher/override', { classId, action: 'add', exerciseId, mode, studentId });
export const annulerUnReglage = (classId, overrideId) =>
    auServeur('/teacher/override', { classId, action: 'cancel', overrideId });

/**
 * EST-IL LÀ EN CE MOMENT ?
 *
 * Quatre-vingt-dix secondes, la même valeur que la page d'administration : la
 * synchronisation d'un élève au travail passe toutes les trente secondes, donc
 * trois passages manqués. En dessous, la pastille clignote pour rien ; au-delà,
 * elle reste verte devant une classe partie en récréation.
 *
 * ON COMPARE À L'HEURE DU SERVEUR, pas à celle du navigateur. Une tablette
 * réglée avec dix minutes d'avance déclarerait toute la classe absente.
 */
export const EN_LIGNE_SECONDES = 90;

export function estEnLigne(vu, maintenant) {
    if (!vu || !maintenant) return false;
    return (maintenant - vu) <= EN_LIGNE_SECONDES;
}

/**
 * « vu il y a douze minutes » — et non un horodatage.
 *
 * Le professeur ne veut pas savoir qu'il était là à 14 h 03 : il veut savoir
 * s'il vient de partir ou s'il n'est jamais venu.
 */
export function depuis(vu, maintenant) {
    if (!vu) return 'jamais venu';
    const s = Math.max(0, maintenant - vu);
    if (s < EN_LIGNE_SECONDES) return 'en ligne';
    if (s < 3600) return 'il y a ' + Math.round(s / 60) + ' min';
    if (s < 86400) return 'il y a ' + Math.round(s / 3600) + ' h';
    const j = Math.round(s / 86400);
    return j === 1 ? 'hier' : 'il y a ' + j + ' jours';
}
