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
