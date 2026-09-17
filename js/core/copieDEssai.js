// CETTE COPIE-CI EST-ELLE UNE COPIE D'ESSAI SANS SERVEUR ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'aimerai pouvoir tester sur github, tant pis pour la zone admin
// juste dessus on peut la sauter, j'ai besoin de tester en ligne. »
//
// LE PROBLÈME QU'IL FALLAIT RÉSOUDRE. GitHub Pages sert des fichiers, et rien
// d'autre : pas de PHP, donc pas d'API. Or `verrouActif()` ferme l'espace
// professeur dès que la page est servie en `http:`/`https:` — délibérément, et
// pour une bonne raison écrite là-bas : une API momentanément en panne ne doit
// PAS ouvrir l'espace professeur à tout le monde, exactement au mauvais moment.
//
// Sur GitHub Pages, les deux se rencontrent : la page est en `https:`, donc le
// verrou est de mise, et il n'y a aucun serveur pour vérifier le mot de passe.
// L'atelier serait donc fermé — c'est-à-dire l'écran même que Rémy veut
// essayer.
//
// LA MARQUE N'EST PAS DANS LE DÉPÔT, ET C'EST TOUTE LA SÛRETÉ DE L'AFFAIRE.
// Ce module ne cherche pas un réglage ni une constante : il cherche une balise
// `<meta>` que SEUL le workflow de publication GitHub Pages écrit, au moment de
// composer la copie. Le `index.html` du dépôt ne la porte pas ; le paquet
// déposé sur l'hébergement ne la porte pas ; la copie d'essai la porte. Le vrai
// site ne peut donc pas hériter de la dérogation par distraction — il faudrait
// écrire la balise à la main dans le dépôt, et une épreuve le refuse
// (tests/copieDEssai.test.mjs).
//
// CE QUE LA DÉROGATION OUVRE, ET CE QU'ELLE N'OUVRE PAS. Elle ouvre l'atelier :
// le catalogue, la construction de parcours, les aperçus, les jeux. Elle
// n'ouvre aucune donnée, parce qu'il n'y en a aucune — pas de serveur, pas de
// base, pas d'élève, pas de classe. Tout ce qu'on y fait vit dans le navigateur
// de celui qui l'ouvre, et n'en sort pas.

const MARQUE = 'atoutmath-copie-essai';

/**
 * @param {Document} [doc]
 * @returns {boolean} vrai seulement sur une copie d'essai publiée sans serveur.
 */
export function copieDEssai(doc = (typeof document !== 'undefined' ? document : null)) {
    try {
        return !!(doc && doc.querySelector && doc.querySelector(`meta[name="${MARQUE}"]`));
    } catch (e) {
        return false;
    }
}

/** Le nom de la balise, pour que le workflow et les épreuves parlent du même. */
export const MARQUE_ESSAI = MARQUE;

/**
 * L'ÉLÈVE D'ESSAI — celui qui n'existe nulle part.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RÉMY : « je n'ai rien de générique id password, mode élève/prof pour github,
 * le but étant de tester ».
 *
 * CE QUI MANQUAIT. J'avais ouvert la porte du professeur et laissé celle de
 * l'élève fermée. Or les deux portes de l'écran d'accueil — « Je me connecte »
 * et « J'ai un code de séance » — demandent toutes deux le serveur : sur une
 * copie sans API, aucune ne s'ouvre. La moitié du logiciel était donc
 * inaccessible sur la copie faite pour l'essayer.
 *
 * ON NE FABRIQUE PAS UN IDENTIFIANT GÉNÉRIQUE, ET C'EST DÉLIBÉRÉ. Un couple
 * « eleve / 0000 » écrit quelque part serait un identifiant de plus à taper, à
 * retenir, et surtout à retrouver un jour dans le vrai site. On entre d'un
 * clic : il n'y a rien à vérifier, puisqu'il n'y a personne pour vérifier.
 *
 * COMMENT ÇA MARCHE. `estRattache()` ne regarde qu'une chose : le profil local
 * porte-t-il un jeton ? On lui en pose un — `essai-local`, qui ne ressemble à
 * aucun vrai jeton et n'ouvre rien nulle part — et la porte s'efface. La
 * synchronisation, elle, ne part pas : `isActive()` exige EN PLUS une adresse
 * d'API configurée, et il n'y en a pas. Aucune requête, aucun bruit.
 *
 * @param {string} prenom  le prénom affiché ; c'est celui qu'on verra partout.
 */
export async function entrerCommeEleveDEssai(prenom = 'Camille') {
    const { getActiveProfileId, attachRemote, renameProfile } = await import('./profile.js');
    const id = getActiveProfileId();
    await attachRemote(id, {
        studentId: 'essai-local',
        token: 'essai-local',
        classCode: 'ESSAI',
        className: 'Classe d\'essai',
        firstName: prenom,
        login: 'essai',
        cursor: 0,
        lastSyncAt: null,
        // Pour qui lirait ce profil plus tard en se demandant d'où il sort.
        essai: true
    });
    await renameProfile(id, prenom);
    return prenom;
}
