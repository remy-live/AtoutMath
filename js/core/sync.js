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

const CONFIG_KEY = 'syncConfig';
const PUSH_DEBOUNCE_MS = 8000;
const PERIODIC_MS = 5 * 60 * 1000;
const SEANCE_MS = 20 * 1000;

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

export async function initSync() {
    config = (await globalStore.get(CONFIG_KEY, config)) || config;
    if (!isActive()) return;

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
    // trop long pour un « arrêtez tout, on corrige au tableau ». Une requête
    // par élève toutes les vingt secondes, c'est une lecture indexée : pour
    // trente élèves, moins de deux requêtes par seconde sur l'heure entière.
    setInterval(rafraichirSeance, SEANCE_MS);
    // Et au retour sur l'onglet : c'est le moment où l'élève relève la tête.
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') rafraichirSeance();
    });

    syncNow({ silent: true });
    rafraichirSeance();
}

export function isActive() {
    const profile = getActiveProfile();
    return !!(config.enabled && config.apiUrl && profile && profile.remote && profile.remote.token);
}

function schedulePush() {
    if (!isActive() || pushTimer) return;
    pushTimer = setTimeout(() => { pushTimer = null; syncNow({ silent: true }); }, PUSH_DEBOUNCE_MS);
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
        const res = await apiEleve('/session', {});
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
    return data;
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
