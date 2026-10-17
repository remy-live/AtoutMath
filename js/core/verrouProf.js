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
import { copieDEssai } from './copieDEssai.js';

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
    // UNE COPIE D'ESSAI PUBLIÉE SANS SERVEUR EST LA TROISIÈME SITUATION, et
    // elle n'existait pas quand cette fonction a été écrite. Elle est en
    // `https:` comme un vrai site, mais il n'y a PERSONNE pour vérifier un mot
    // de passe — et rien à protéger non plus : aucune base, aucun élève,
    // aucune classe. Le verrou y fermerait l'atelier sans rien garder.
    //
    // La marque n'est écrite que par le workflow de publication, jamais dans
    // le dépôt : voir `copieDEssai`, qui dit pourquoi c'est ce qui rend la
    // dérogation sûre.
    if (copieDEssai()) return false;
    return window.location.protocol === 'http:' || window.location.protocol === 'https:';
}

/**
 * CE QUE VEUT DIRE UN REFUS, EN FRANÇAIS ET SANS NUMÉRO.
 *
 * Rémy, capture d'un collègue à qui il faisait essayer le site :
 * « Connexion impossible (code 405) ». Le numéro ne dit rien à personne, et
 * surtout il ne dit pas LA chose qu'il fallait savoir : ce n'était pas un
 * mauvais mot de passe, c'était qu'il n'y avait aucun serveur à cette adresse.
 *
 * 404 ET 405 SONT LA SIGNATURE D'UNE COPIE SANS SERVEUR. `adresseApiDeduite`
 * fabrique l'adresse de l'API à côté de celle de la page ; sur un hébergement
 * de fichiers statiques — GitHub Pages, par exemple — il n'y a pas de PHP
 * pour répondre : le POST tombe sur un chemin qui n'existe pas (404), ou sur
 * un hébergeur qui n'accepte que la lecture (405). Le mot de passe n'a alors
 * jamais été vérifié par personne, et il faut le dire — autant pour rassurer
 * que pour orienter vers la bonne adresse.
 *
 * ON NE REND PAS LE NUMÉRO POUR LES CAS QU'ON SAIT NOMMER, et on le garde pour
 * les autres : un code inconnu est justement ce qu'il faut pouvoir me citer.
 */
export function pourquoiPasEntre(status) {
    if (status === 401) return 'Adresse ou mot de passe incorrect.';
    if (status === 403) return "Ce compte n'a pas le droit d'entrer ici.";
    if (status === 429) return "Trop d'essais. Attends une minute.";
    if (status === 404 || status === 405 || status === 501) {
        return "Cette copie du site n'a pas de serveur : elle sert à essayer les "
            + "exercices, pas à ouvrir l'espace professeur. Le mot de passe n'a "
            + "été envoyé nulle part. Ouvrez le site à son adresse en ligne.";
    }
    if (status >= 500) return 'Le serveur a eu un problème. Réessayez dans un instant.';
    return 'Connexion impossible (code ' + status + ').';
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
    if (!r.ok) throw new Error(pourquoiPasEntre(r.status));

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
