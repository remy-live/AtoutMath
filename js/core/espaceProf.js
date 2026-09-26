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

/**
 * LA LISTE DES CLASSES A CHANGÉ — que ceux qui la gardent en mémoire l'oublient.
 *
 * `donnerSeance.js` garde la liste quinze secondes pour ne pas la redemander à
 * chaque ouverture du panneau. Ce cache était vidé à la SUPPRESSION d'une
 * classe, et nulle part ailleurs : une classe qu'on venait de créer n'existait
 * pas encore pour le panneau « À qui ce parcours est donné », et rien ne
 * disait pourquoi. On annonce donc le changement, et c'est à ceux qui gardent
 * une copie d'écouter — le noyau n'a pas à connaître leurs caches.
 */
function laListeABouge() {
    if (typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent('classes_updated'));
    }
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
    laListeABouge();
    return d.creee || { erreur: 'La classe a peut-être été créée : rechargez pour voir.' };
}

export const listeDeClasse = (classId) => auServeur('/teacher/roster', { classId, action: 'list' });

/**
 * LES RÉGLAGES DU SITE — ceux qui valent pour tout le monde.
 *
 * Rémy : « le mode libre, mets-le en bouton dans ma zone prof ». Sans argument
 * on lit ; avec, on écrit. La route rend l'état APRÈS écriture, ce qui évite
 * de deviner : c'est le serveur qui dit où l'on en est, pas le bouton.
 */
export const reglagesDuSite = (changements = {}) =>
    auServeur('/teacher/reglages', changements);
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

/**
 * LES SÉANCES D'UNE CLASSE — celles qu'on lui a données, de la plus récente
 * à la plus ancienne.
 *
 * Rémy : « quand je clique sur une classe, il faut pouvoir voir la liste des
 * séances attitrées ». L'information était en base depuis le début ; il
 * manquait la porte pour la lire.
 */
export const seancesDeLaClasse = (classId) =>
    auServeur('/teacher/assign', { classId, action: 'list' });

export const renommerClasse = (classId, name, level) =>
    auServeur('/teacher/class', { classId, action: 'rename', name, level })
        .then(r => { laListeABouge(); return r; });
export const mettreEnPause = (classId, locked) =>
    auServeur('/teacher/class', { classId, action: 'lock', locked });
export const poserConsigne = (classId, notice) =>
    auServeur('/teacher/class', { classId, action: 'notice', notice });
export const viderClasse = (classId, confirmation) =>
    auServeur('/teacher/class', { classId, action: 'empty', confirmation });
export const supprimerClasse = (classId, confirmation) =>
    auServeur('/teacher/class', { classId, action: 'delete', confirmation })
        .then(r => { laListeABouge(); return r; });

/**
 * IMPOSER UNE SÉANCE À LA CLASSE, ou rendre le choix.
 *
 * Rémy : « lorsque les élèves se connectent, j'impose la séance, comme cela ils
 * n'ont rien à lancer ». Un identifiant vide lève l'imposition.
 */
export const imposerLaSeance = (classId, pathId) =>
    auServeur('/teacher/class', { classId, action: 'imposer', pathId: pathId || '' });

/**
 * LE COMPTE À REBOURS, ET CE QU'IL FAIT À ZÉRO.
 *
 * `aZero` vaut 'terminer' (on ramasse les copies) ou 'pause' (on reprend la
 * parole). Zéro minute l'arrête.
 */
export const lancerLeChrono = (classId, minutes, aZero = 'terminer') =>
    auServeur('/teacher/class', { classId, action: 'chrono', minutes, aZero });

export const arreterLeChrono = (classId) =>
    auServeur('/teacher/class', { classId, action: 'chrono', minutes: 0 });

/**
 * OUVRIR OU FERMER LE BAC À SABLE de ceux qui ont fini.
 *
 * Rémy : « un élève qui a fini peut avoir une zone bac à sable avec des jeux ».
 * Il est ouvert par défaut ; ce geste sert à le fermer, pour les heures où
 * celui qui a fini doit relire ou aider son voisin.
 */
export const reglerLeBac = (classId, ferme, minutes = null) =>
    auServeur('/teacher/class', {
        classId, action: 'bac', ferme: !!ferme,
        // ET COMBIEN DE TEMPS IL DURE. Rémy : « un temps, réglé par vous ».
        // `null` ne touche pas à la durée — ouvrir et fermer le bac ne doit pas
        // effacer le quart d'heure qu'on avait posé.
        ...(minutes === null ? {} : { minutes: Math.max(0, Math.min(120, Number(minutes) || 0)) })
    });

export const envoyerUnMot = (classId, body, studentId = '') =>
    auServeur('/teacher/message', { classId, body, studentId });

/**
 * SOUFFLER UN INDICE À UN ÉLÈVE — et à un seul.
 *
 * Rémy : « la possibilité de […] envoyer un indice ».
 *
 * `studentId` n'a pas de valeur par défaut, contrairement au mot, et c'est
 * délibéré : un indice envoyé à toute la classe est une réponse donnée à
 * vingt-cinq élèves qui n'en avaient pas besoin. Le serveur le refuse aussi —
 * on ne compte pas sur l'écran pour tenir une règle.
 */
export const soufflerUnIndice = (classId, body, studentId) =>
    auServeur('/teacher/message', { classId, body, studentId, genre: 'indice' });
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
 * ACCORDER LA CALCULATRICE, EN PLEINE HEURE.
 *
 * RÉMY : « pourrait-on autoriser dans les options l'utilisation de la
 * calculatrice ou le permettre en direct à un groupe ou aux élèves (on pourrait
 * sélectionner dans le direct) », puis : « les deux au choix mais on pourrait le
 * donner que pour certains élèves ».
 *
 * `exerciseId` vaut `'*'` pour TOUTE LA SÉANCE, ou l'identifiant d'un exercice
 * pour celui-là seulement. `eleves` vide veut dire toute la classe.
 *
 * UN SEUL ALLER-RETOUR POUR PLUSIEURS ÉLÈVES : cocher quatre noms puis attendre
 * quatre réponses, c'est quatre occasions qu'une seule échoue sans que le
 * professeur sache laquelle.
 */
export const accorderLaCalculatrice = (classId, exerciseId = '*', eleves = []) =>
    auServeur('/teacher/override', {
        classId, action: 'add', mode: 'calculatrice',
        exerciseId: exerciseId || '*', studentIds: eleves
    });

/** La retirer partout dans cette classe — un geste, pas une ligne à retrouver. */
export const retirerLaCalculatrice = (classId) =>
    auServeur('/teacher/override', { classId, action: 'cancel', mode: 'calculatrice' });

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
