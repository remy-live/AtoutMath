// Synchronisation avec le serveur (API PHP, voir le dossier api/).
//
// Principe : LOCAL-FIRST. L'application fonctionne intégralement hors ligne ;
// le serveur n'est jamais une dépendance de rendu. La synchro se contente de
// pousser les événements non encore envoyés et de fusionner ceux des autres
// appareils.
//
// C'est possible uniquement parce que la progression est un journal
// append-only d'événements identifiés par UUID : la fusion est une union, donc
// commutative et idempotente. Aucun conflit à arbitrer entre « la maison » et
// « l'école », dans n'importe quel ordre de connexion.
//
// Ce que le serveur reçoit : des événements. Ce qu'il ne reçoit jamais : une
// note ou un score calculés par le navigateur — il les recalcule lui-même.

import { journal } from './journal.js';
import { globalStore } from './store.js';
import { getActiveProfile, getDeviceId, attachRemote, getActiveProfileId } from './profile.js';
import { appliquerEtat } from './seanceDistante.js';
import { ceQuOnVoit } from './ecran.js';

const CONFIG_KEY = 'syncConfig';
const PUSH_DEBOUNCE_MS = 4000;
const PERIODIC_MS = 5 * 60 * 1000;

// L'ONGLET AU PREMIER PLAN N'A PAS LE MÊME BESOIN QUE CELUI QU'ON A QUITTÉ.
//
// Rémy : « Les mots envoyés ne le sont pas en temps réels ».
//
// Dix secondes quand l'élève a l'application sous les yeux : c'est le délai
// au-delà duquel « arrêtez tout, on corrige au tableau » arrive après que la
// classe a déjà tourné la page. Une minute quand l'onglet est en arrière-plan :
// il n'y a personne pour lire, et trente onglets oubliés ne doivent pas
// travailler le serveur pour rien.
//
// CE QUE ÇA COÛTE, puisque c'est la vraie question sur un hébergement mutualisé :
// trente élèves au travail font trois requêtes par seconde, et chacune est une
// lecture indexée qui ne touche à rien. C'est moins qu'une page d'accueil.
const SEANCE_VISIBLE_MS = 10 * 1000;
const SEANCE_CACHE_MS = 60 * 1000;

let config = { apiUrl: '', enabled: false };
let pushTimer = null;
let inFlight = false;

export function getSyncConfig() {
    return { ...config };
}

export async function setSyncConfig(next) {
    config = { ...config, ...next };
    await globalStore.set(CONFIG_KEY, config);
    document.dispatchEvent(new CustomEvent('sync_config_updated'));
    return config;
}

/**
 * LES BOUCLES NE S'INSTALLAIENT JAMAIS POUR UN ÉLÈVE QUI VENAIT DE SE CONNECTER.
 *
 * Rémy : « Les mots envoyés ne le sont pas en temps réels ». Ils ne l'étaient pas
 * du tout — ils n'arrivaient JAMAIS dans la session où l'élève s'était connecté.
 *
 * `initSync()` tourne au démarrage de l'application. À cet instant l'élève n'est
 * pas encore rattaché : `isActive()` est faux, la fonction rendait la main, et
 * AUCUN écouteur ni AUCUN minuteur n'était posé. L'élève se connectait ensuite
 * par la porte ; `loginEleve` faisait une synchro unique et s'arrêtait là. Plus
 * rien ne partait, plus rien n'arrivait, jusqu'au rechargement de la page — où
 * tout se remettait à marcher, ce qui rendait le défaut introuvable à la main.
 *
 * MESURÉ AVANT CORRECTION, sur un vrai serveur : le professeur envoie un mot,
 * `/session` le rend immédiatement quand on l'interroge à la main, et l'élève ne
 * le voit pas au bout de trente secondes. Le serveur était innocent depuis le
 * début.
 *
 * On appelle donc `initSync()` À NOUVEAU après chaque rattachement, et la
 * fonction se garde d'installer deux fois ses boucles.
 */
let boucles = false;

export async function initSync() {
    config = (await globalStore.get(CONFIG_KEY, config)) || config;
    if (!isActive() || boucles) return;
    boucles = true;

    // On pousse peu après une réponse (le temps qu'une rafale se termine),
    // à intervalle régulier, et systématiquement quand l'onglet passe en
    // arrière-plan — le moment où l'élève ferme son ordinateur.
    document.addEventListener('journal_appended', schedulePush);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') syncNow({ silent: true });
    });
    window.addEventListener('online', () => syncNow({ silent: true }));
    setInterval(() => syncNow({ silent: true }), PERIODIC_MS);

    // L'ÉTAT DE SÉANCE SE DEMANDE PLUS SOUVENT QUE LE JOURNAL NE S'ENVOIE.
    // Cinq minutes, c'est le bon rythme pour des événements — c'est beaucoup
    // trop long pour un « arrêtez tout, on corrige au tableau ».
    //
    // LE RYTHME SUIT L'ATTENTION : dix secondes quand l'onglet est devant
    // l'élève, une minute quand il est derrière. Un seul minuteur court, qui
    // décide à chaque tour — deux minuteurs qu'on allume et qu'on éteint se
    // seraient dédoublés au premier aller-retour d'onglet.
    let dernier = 0;
    setInterval(() => {
        const attendu = document.visibilityState === 'visible'
            ? SEANCE_VISIBLE_MS : SEANCE_CACHE_MS;
        if (Date.now() - dernier < attendu) return;
        dernier = Date.now();
        rafraichirSeance();
    }, 2000);
    // Et au retour sur l'onglet : c'est le moment où l'élève relève la tête.
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') { dernier = Date.now(); rafraichirSeance(); }
    });

    syncNow({ silent: true });
    rafraichirSeance();
}

export function isActive() {
    const profile = getActiveProfile();
    return !!(config.enabled && config.apiUrl && profile && profile.remote && profile.remote.token);
}

/**
 * LA PREMIÈRE RÉPONSE PART TOUT DE SUITE ; LA RAFALE ATTEND.
 *
 * Rémy : « peut-on rendre la synchronisation plus réactive entre les postes
 * élèves et professeurs ? »
 *
 * MESURÉ (`tools/tmp/delaiReel.mjs`), réponse de l'élève → chiffre qui bouge
 * sur l'écran du professeur : 8,0 s · 7,0 s · 7,0 s. Quatre de ces secondes
 * étaient ce délai-ci, appliqué À CHAQUE réponse.
 *
 * LE DÉLAI N'ÉTAIT PAS INUTILE pour autant : les jeux d'arcade produisent des
 * rafales — plusieurs réponses par seconde — et sans lui chacune partirait
 * seule. C'est ce qui aurait rendu dangereux de le raccourcir bêtement : sur
 * l'hébergement mutualisé de Rémy, trente élèves en rafale font le calcul
 * tout seuls.
 *
 * ON NE RACCOURCIT DONC PAS LE DÉLAI, ON DÉPLACE SON BORD. La première réponse
 * après un temps calme part IMMÉDIATEMENT ; les suivantes sont regroupées
 * comme avant, une poussée par `PUSH_DEBOUNCE_MS` au plus. Le cas courant — un
 * élève qui répond toutes les quinze secondes — gagne quatre secondes et ne
 * coûte pas une requête de plus. Le cas de la rafale ne coûte rien de plus non
 * plus : le plafond est le même.
 */
let dernierPush = 0;

function schedulePush() {
    if (!isActive() || pushTimer) return;
    const depuis = Date.now() - dernierPush;
    const attente = depuis >= PUSH_DEBOUNCE_MS ? 0 : PUSH_DEBOUNCE_MS - depuis;
    pushTimer = setTimeout(() => {
        pushTimer = null;
        dernierPush = Date.now();
        syncNow({ silent: true });
    }, attente);
}

/**
 * UN APPEL À L'API AVEC LE JETON DE L'ÉLÈVE.
 *
 * Exporté parce que l'état de séance a deux besoins que la synchro ne couvre
 * pas : dire « j'ai lu ce mot », et redemander l'état tout de suite quand le
 * professeur vient de verrouiller. Passer par ici plutôt que par un `fetch`
 * ailleurs garde en un seul endroit l'adresse du serveur et le jeton.
 */
export async function apiEleve(chemin, corps) {
    const profile = getActiveProfile();
    if (!isActive()) throw new Error('Pas de classe rattachée.');
    return api(chemin, corps, profile.remote.token);
}

/**
 * L'ÉTAT DE SÉANCE, TOUT DE SUITE.
 *
 * La synchro le porte déjà, mais elle attend huit secondes après une réponse et
 * ne part pas si le journal est vide. Quand le professeur verrouille sa classe
 * au milieu de l'heure, il veut que ça se voie : on interroge donc la route
 * dédiée, qui ne touche à rien et ne coûte qu'une lecture.
 */
export async function rafraichirSeance() {
    if (!isActive() || !navigator.onLine) return null;
    try {
        // CE QU'IL A SOUS LES YEUX PART AVEC LE BATTEMENT DE CŒUR.
        //
        // Rémy : « on ne peut jamais vraiment voir l'écran de l'élève, juste son
        // exercice, car c'est créé de façon aléatoire. » La réponse tenait en
        // une graine — encore fallait-il la faire voyager, et l'on ne voulait ni
        // une requête de plus ni un événement de journal de plus (voir
        // `ecran.js`, qui explique les deux refus).
        //
        // CETTE REQUÊTE-CI PARTAIT LE CORPS VIDE, toutes les dix secondes, pour
        // demander « le professeur a-t-il verrouillé ? ». Elle repart avec le
        // relevé dedans : le même nombre de requêtes, quelques dizaines
        // d'octets de plus, et le professeur voit la question.
        const res = await apiEleve('/session', { ecran: ceQuOnVoit() });
        return res && res.session ? appliquerEtat(res.session) : null;
    } catch (err) {
        console.info('[sync] état de séance indisponible :', err.message);
        return null;
    }
}

async function api(path, body, token) {
    const res = await fetch(config.apiUrl.replace(/\/$/, '') + path, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: 'Bearer ' + token } : {})
        },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${detail.slice(0, 200)}`);
    }
    return res.json();
}

/**
 * Rattache le profil local à une classe. Le professeur distribue un code de
 * classe ; l'élève saisit son prénom. Aucune adresse e-mail, aucun mot de
 * passe : c'est le minimum de données personnelles pour un usage scolaire.
 */
export async function joinClass({ apiUrl, classCode, firstName }) {
    await setSyncConfig({ apiUrl, enabled: true });
    const data = await api('/join', {
        classCode: String(classCode).trim().toUpperCase(),
        firstName: String(firstName).trim(),
        deviceId: getDeviceId()
    });
    await attachRemote(getActiveProfileId(), {
        studentId: data.studentId,
        token: data.token,
        classCode: data.classCode,
        className: data.className,
        lastSyncAt: null
    });
    // Le verrou s'applique AVANT la première synchro : si la classe est déjà
    // verrouillée, l'élève ne doit pas voir le catalogue le temps d'un aller-retour.
    if (data.session) appliquerEtat(data.session);
    await syncNow({ silent: false });
    // LE RATTACHEMENT RÉVEILLE LES BOUCLES. Sans cette ligne, l'élève qui
    // vient d'entrer n'envoie plus rien et ne reçoit plus rien jusqu'au
    // rechargement de sa page : voir le préambule d'`initSync`.
    await initSync();
    return data;
}

/**
 * SE CONNECTER AVEC SON IDENTIFIANT ET SON CODE — la liste du professeur.
 *
 * Rémy : « pour la connexion, fais aussi une connexion avec identifiant et code
 * élève, je fournirai la liste. »
 *
 * DEUX CHAMPS, PAS TROIS : le code de la classe n'est pas demandé, l'identifiant
 * suffit à retrouver l'élève. Et contrairement à `joinClass`, l'élève ne se
 * DÉCLARE pas — il est reconnu. Le prénom vient du serveur, celui que le
 * professeur a écrit sur sa liste.
 */
export async function loginEleve({ apiUrl, login, code }) {
    await setSyncConfig({ apiUrl, enabled: true });
    const data = await api('/login', {
        login: String(login).trim(),
        code: String(code).trim().toUpperCase(),
        deviceId: getDeviceId()
    });
    await attachRemote(getActiveProfileId(), {
        studentId: data.studentId,
        token: data.token,
        classCode: data.classCode,
        className: data.className,
        // LE PRÉNOM VENAIT DÉJÀ DU SERVEUR, ET ON LE JETAIT. `/login` le rend
        // depuis toujours ; personne ne le rangeait. L'élève voyait donc
        // « Tu travailles comme Mon profil » — le nom par défaut du profil
        // local — et rien, nulle part, ne lui confirmait qu'il travaillait bien
        // sous son nom. Sur un poste partagé, c'est la seule question qui
        // compte avant de commencer.
        firstName: data.firstName || '',
        login: String(login).trim(),
        lastSyncAt: null
    });
    // ET ON RENOMME LE PROFIL LOCAL. Le prénom rangé dans `remote` ne se voit
    // qu'à l'endroit qui pense à le lire ; le nom du profil, lui, est déjà
    // affiché partout où l'application dit « qui travaille ».
    if (data.firstName) {
        const { renameProfile } = await import('./profile.js');
        await renameProfile(getActiveProfileId(), data.firstName);
    }
    if (data.session) appliquerEtat(data.session);
    await syncNow({ silent: true });
    // LE RATTACHEMENT RÉVEILLE LES BOUCLES. Sans cette ligne, l'élève qui
    // vient d'entrer n'envoie plus rien et ne reçoit plus rien jusqu'au
    // rechargement de sa page : voir le préambule d'`initSync`.
    await initSync();
    return data;
}

/**
 * SE DÉCONNECTER — le geste qui n'existait pas.
 *
 * Rémy : « Tu sais qu'on ne peut même pas se déconnecter ».
 *
 * ON ENVOIE D'ABORD, ET C'EST TOUT L'ORDRE DE CETTE FONCTION. Le journal pousse
 * par lots avec quelques secondes de retard ; se détacher d'abord jetterait les
 * dernières réponses — celles de la fin d'heure, qui sont toujours celles qu'on
 * vient de se donner du mal à trouver. On garde donc le jeton jusqu'au bout :
 * sans lui, l'envoi final n'aurait plus de quoi s'authentifier.
 *
 * `force` sert au cas hors ligne, où l'on ne PEUT pas sauver : on part quand
 * même, mais seulement après avoir dit à l'élève combien il perd (voir
 * `peutSeDeconnecter` dans core/deconnexion.js).
 *
 * @param {object} [opts] { force:boolean, effacerLeTravail:boolean }
 * @returns {Promise<{parti:boolean, reste:number}>}
 */
export async function deconnecterEleve({ force = false, effacerLeTravail = false } = {}) {
    const reste = () => journal.pending().filter(e => !e.local).length;

    if (isActive() && reste()) {
        try { await syncNow({ silent: true }); } catch (e) { /* on mesure après */ }
    }
    if (reste() && !force) return { parti: false, reste: reste() };

    // La classe s'oublie AVANT le jeton : `oublierLaClasse` n'a besoin de rien
    // d'autre que du stockage, et si la suite échoue, mieux vaut un appareil
    // déverrouillé et encore identifié que l'inverse.
    const { oublierLaClasse } = await import('./seanceDistante.js');
    await oublierLaClasse();

    if (effacerLeTravail) {
        // SE DÉCONNECTER N'EST PAS S'EFFACER : on ne vient ici que si l'élève
        // — ou le professeur à côté de lui, sur un poste partagé — l'a demandé.
        try {
            const { LocalStore } = await import('./store.js');
            const { namespaceFor } = await import('./profile.js');
            await new LocalStore(namespaceFor(getActiveProfileId())).clear();
        } catch (e) { /* un stockage récalcitrant n'empêche pas de partir */ }
    }

    await attachRemote(getActiveProfileId(), {
        studentId: null, token: null, classCode: null, className: null,
        login: null, cursor: 0, lastSyncAt: null
    });
    await setSyncConfig({ enabled: false });
    document.dispatchEvent(new CustomEvent('eleve_deconnecte'));
    return { parti: true, reste: 0 };
}

/**
 * Un aller-retour de synchronisation.
 * @returns {Promise<{pushed:number, pulled:number}|null>}
 */
export async function syncNow({ silent = false } = {}) {
    if (!isActive() || inFlight || !navigator.onLine) return null;
    inFlight = true;

    const profile = getActiveProfile();
    try {
        await journal.flush();
        // On borne l'envoi : une première synchro après des semaines hors ligne
        // ne doit pas produire une requête de plusieurs mégaoctets.
        const pending = journal.pending().filter(e => !e.local).slice(0, 500);
        const cursor = (profile.remote && profile.remote.cursor) || 0;

        const res = await api('/sync', {
            deviceId: getDeviceId(),
            cursor,
            events: pending.map(stripLocalFields)
        }, profile.remote.token);

        if (res.accepted && res.accepted.length) journal.markSynced(res.accepted);
        const pulled = journal.merge(res.events || []);
        await journal.flush();

        await attachRemote(profile.id, { cursor: res.cursor, lastSyncAt: Date.now() });

        // Ce que le professeur pilote : verrou, consigne, mots, déblocages.
        if (res.session) appliquerEtat(res.session);

        if (res.assignments) {
            document.dispatchEvent(new CustomEvent('assignments_received', { detail: res.assignments }));
        }

        const result = { pushed: pending.length, pulled };
        document.dispatchEvent(new CustomEvent('sync_done', { detail: result }));
        if (!silent) {
            const { showToast } = await import('../ui/modal.js');
            showToast(`Synchronisé : ${result.pushed} envoyé(s), ${result.pulled} reçu(s).`, 'success');
        }
        return result;
    } catch (err) {
        // UN JETON REFUSÉ N'EST PAS UNE COUPURE DE RÉSEAU, et les confondre
        // coûtait une heure de travail à un élève.
        //
        // Hors ligne, se taire est la bonne réponse : le réseau reviendra, les
        // événements partiront. Mais quand le serveur répond 401 `bad_token` —
        // le professeur a renouvelé les billets, l'élève a été retiré de la
        // classe, la classe a été archivée —, il ne reviendra JAMAIS. L'élève
        // continuait de travailler, la pastille restait discrète, et rien de ce
        // qu'il faisait ne pouvait plus être envoyé. Il ne l'apprenait qu'en
        // constatant, le lendemain, que le professeur n'avait rien reçu.
        //
        // ON NE JETTE PAS SON TRAVAIL POUR AUTANT : le journal est local et
        // reste intact. On enlève le rattachement mort, on rouvre la porte, et
        // ce qui est en attente repartira sous le nouveau billet.
        if (/HTTP 401/.test(err.message) && /bad_token|no_token/.test(err.message)) {
            console.warn('[sync] le serveur ne reconnaît plus ce billet');
            try {
                const { oublierLaClasse } = await import('./seanceDistante.js');
                await oublierLaClasse();
                await attachRemote(getActiveProfileId(), {
                    studentId: null, token: null, classCode: null, className: null,
                    login: null, cursor: 0, lastSyncAt: null
                });
                await setSyncConfig({ enabled: false });
            } catch (e) { /* un stockage récalcitrant ne doit pas masquer le mot */ }
            document.dispatchEvent(new CustomEvent('billet_perime'));
            try {
                const { majPortail } = await import('../ui/portailUI.js');
                majPortail();
            } catch (e) { /* la porte se redessinera au prochain écran */ }
            return null;
        }
        // Hors ligne ou serveur indisponible : ce n'est pas une erreur
        // applicative, les événements restent en attente pour plus tard.
        console.info('[sync] report de la synchronisation :', err.message);
        document.dispatchEvent(new CustomEvent('sync_failed', { detail: err.message }));
        if (!silent) {
            const { showAlert } = await import('../ui/modal.js');
            showAlert(`Synchronisation impossible pour l'instant.\n${err.message}`);
        }
        return null;
    } finally {
        inFlight = false;
    }
}

function stripLocalFields(e) {
    const { synced, local, migrated, ...rest } = e;
    return rest;
}
