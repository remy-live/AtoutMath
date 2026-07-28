// Identité locale : qui travaille sur ce poste, et depuis quel appareil.
//
// Deux identifiants distincts, tous deux indispensables à la synchro :
//  - profileId : l'élève. Un poste de classe peut en héberger plusieurs.
//  - deviceId  : l'appareil. Permet de savoir d'où vient un événement et de
//                détecter les doublons quand le même élève travaille sur deux
//                machines (maison / école).
//
// Le lien avec le compte serveur (studentId) est stocké dans le profil mais
// reste optionnel : l'application est pleinement fonctionnelle hors ligne et
// sans compte.

import { globalStore } from './store.js';
import { uuid, shortId } from './ids.js';

const KEY_PROFILES = 'profiles';
const KEY_ACTIVE = 'activeProfileId';
const KEY_DEVICE = 'deviceId';

let profiles = [];
let activeProfileId = null;
let deviceId = null;

export function getDeviceId() {
    return deviceId;
}

export function getActiveProfileId() {
    return activeProfileId;
}

export function getActiveProfile() {
    return profiles.find(p => p.id === activeProfileId) || null;
}

export function listProfiles() {
    return profiles.map(p => ({ ...p }));
}

export function namespaceFor(profileId) {
    return `atoutmath:${profileId}`;
}

function makeProfile(name) {
    return {
        id: 'p_' + shortId(8),
        name: name || 'Élève',
        createdAt: Date.now(),
        // Rempli lorsque le profil est rattaché à une classe via l'API PHP.
        remote: null // { studentId, classCode, token, lastSyncAt }
    };
}

async function persist() {
    await globalStore.set(KEY_PROFILES, profiles);
    await globalStore.set(KEY_ACTIVE, activeProfileId);
}

/**
 * Charge (ou crée) l'identité locale. Migre au passage l'ancien stockage
 * global `atoutmath_*` vers un premier profil namespacé.
 * @returns {Promise<{profileId: string, deviceId: string, migrated: boolean}>}
 */
export async function initIdentity() {
    deviceId = await globalStore.get(KEY_DEVICE);
    if (!deviceId) {
        deviceId = 'd_' + uuid();
        await globalStore.set(KEY_DEVICE, deviceId);
    }

    profiles = (await globalStore.get(KEY_PROFILES)) || [];
    activeProfileId = await globalStore.get(KEY_ACTIVE);

    let migrated = false;
    if (profiles.length === 0) {
        const first = makeProfile('Mon profil');
        profiles = [first];
        activeProfileId = first.id;
        migrated = true;
        await persist();
    }

    if (!activeProfileId || !profiles.some(p => p.id === activeProfileId)) {
        activeProfileId = profiles[0].id;
        await persist();
    }

    return { profileId: activeProfileId, deviceId, migrated };
}

export async function createProfile(name) {
    const p = makeProfile(name);
    profiles.push(p);
    await persist();
    document.dispatchEvent(new CustomEvent('profiles_updated'));
    return p;
}

export async function renameProfile(id, name) {
    const p = profiles.find(x => x.id === id);
    if (!p) return;
    p.name = name;
    await persist();
    document.dispatchEvent(new CustomEvent('profiles_updated'));
}

export async function deleteProfile(id) {
    if (profiles.length <= 1) return false; // on garde toujours un profil
    const target = profiles.find(p => p.id === id);
    if (!target) return false;
    profiles = profiles.filter(p => p.id !== id);
    // Efface aussi les données de ce profil.
    const { LocalStore } = await import('./store.js');
    await new LocalStore(namespaceFor(id)).clear();
    if (activeProfileId === id) activeProfileId = profiles[0].id;
    await persist();
    document.dispatchEvent(new CustomEvent('profiles_updated'));
    return true;
}

export async function setActiveProfile(id) {
    if (!profiles.some(p => p.id === id)) return false;
    activeProfileId = id;
    await persist();
    return true;
}

export async function attachRemote(profileId, remote) {
    const p = profiles.find(x => x.id === profileId);
    if (!p) return;
    p.remote = { ...(p.remote || {}), ...remote };
    await persist();
    document.dispatchEvent(new CustomEvent('profiles_updated'));
}
