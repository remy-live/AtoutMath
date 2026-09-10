// LE VERROU DE L'ESPACE PROFESSEUR.
//
// Rémy, une fois le site en ligne : « l'accès prof n'est pas protégé, je ne
// sais pas où m'identifier ».
//
// IL AVAIT RAISON, ET C'ÉTAIT UN VRAI TROU. La bascule « Je suis le
// professeur » retournait un booléen dans le navigateur, sans rien demander à
// personne. N'importe quel élève qui la trouvait — et elle est écrite en toutes
// lettres au bas de la porte d'entrée — obtenait le catalogue entier, le
// constructeur de parcours, les corrigés et les fiches. Ce n'était pas grave
// tant que le logiciel tournait sur l'ordinateur de Rémy ; c'est grave le jour
// où il est en ligne et où trente élèves ont l'adresse.
//
// CE QUI PROTÈGE, C'EST LE SERVEUR, JAMAIS LA PAGE. Un mot de passe comparé en
// JavaScript se lit dans le code source de la page : on demanderait un secret
// pour le publier. On envoie donc les identifiants à `/teacher/login`, qui les
// vérifie contre l'empreinte enregistrée à l'installation et rend un jeton
// signé. C'est le même compte que l'administration `api/admin/` — un seul mot
// de passe pour un seul professeur, à retenir une fois.
//
// ET SI L'ON TRAVAILLE SANS SERVEUR ? Alors il n'y a pas de classe, pas
// d'élève, et personne contre qui se protéger : sur une copie locale ouverte
// depuis un fichier, la bascule reste libre. Le verrou apparaît AVEC le
// serveur, c'est-à-dire exactement quand il devient nécessaire. On ne peut pas
// faire autrement sans mentir : sans serveur, aucun mot de passe n'est
// vérifiable, et un verrou qu'on ne peut pas vérifier n'en est pas un.

import { adresseApiDeduite } from './portail.js';

const CLE = 'atoutmath-prof';

/** Le jeton du professeur, s'il s'est identifié sur cet appareil. */
export function jetonProf() {
    try {
        const brut = localStorage.getItem(CLE);
        if (!brut) return null;
        const j = JSON.parse(brut);
        return j && j.token ? j : null;
    } catch {
        return null;
    }
}

export function nomDuProf() {
    const j = jetonProf();
    return j ? (j.displayName || 'Professeur') : '';
}

export function oublierProf() {
    try { localStorage.removeItem(CLE); } catch { /* rien à oublier */ }
}

/**
 * Y A-T-IL UN SERVEUR EN FACE ? C'est cette question qui décide si le verrou
 * s'applique, et elle se pose au serveur lui-même.
 *
 * On garde la réponse pour la durée de la page : un élève qui bascule vingt
 * fois ne doit pas provoquer vingt requêtes, et l'hébergement ne change pas
 * d'avis en cours de séance.
 */
let serveurConnu = null;
export async function serveurPresent() {
    if (serveurConnu !== null) return serveurConnu;
    try {
        const r = await fetch(adresseApiDeduite() + '/health', {
            method: 'GET', cache: 'no-store',
            signal: AbortSignal.timeout(4000)
        });
        const j = await r.json().catch(() => null);
        serveurConnu = !!(j && j.ok);
    } catch {
        // Pas de serveur, ou pas de réseau. Dans les deux cas on ne peut rien
        // vérifier — et un site en ligne dont l'API est tombée ne doit pas
        // s'ouvrir tout grand pour autant : voir `verrouActif`.
        serveurConnu = false;
    }
    return serveurConnu;
}

/**
 * LE VERROU EST-IL DE MISE ?
 *
 * Oui dès que la page est servie par un serveur web — c'est-à-dire dès qu'elle
 * a une adresse que l'on peut donner à une classe. Non pour un fichier ouvert
 * localement (`file://`), où il n'y a ni classe ni adresse.
 *
 * ON NE SE FIE PAS À `serveurPresent()` POUR CETTE DÉCISION, et c'est
 * délibéré : une API momentanément en panne ouvrirait alors l'espace
 * professeur à tout le monde, exactement au mauvais moment. La présence du
 * serveur sert à VÉRIFIER le mot de passe, pas à décider s'il en faut un.
 */
export function verrouActif() {
    if (typeof window === 'undefined' || !window.location) return false;
    return window.location.protocol === 'http:' || window.location.protocol === 'https:';
}

/**
 * S'identifier. Rend le nom affiché, ou lève une erreur en français.
 */
export async function identifierProf(email, motDePasse) {
    const url = adresseApiDeduite() + '/teacher/login';
    let r;
    try {
        r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: String(email).trim(), password: String(motDePasse) }),
            signal: AbortSignal.timeout(8000)
        });
    } catch {
        throw new Error("Le serveur ne répond pas. Vérifie la connexion.");
    }
    if (r.status === 401) throw new Error('Adresse ou mot de passe incorrect.');
    if (r.status === 429) throw new Error("Trop d'essais. Attends une minute.");
    if (!r.ok) throw new Error('Connexion impossible (code ' + r.status + ').');

    const data = await r.json().catch(() => ({}));
    if (!data.token) throw new Error('Réponse inattendue du serveur.');

    try {
        localStorage.setItem(CLE, JSON.stringify({
            token: data.token,
            teacherId: data.teacherId,
            displayName: data.displayName,
            depuis: Date.now()
        }));
    } catch { /* navigation privée : on reste identifié le temps de la page */ }
    return data.displayName || 'Professeur';
}
