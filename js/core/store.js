// Couche de persistance : une seule interface, plusieurs implémentations.
//
//   LocalStore   → localforage (IndexedDB), namespacé par profil
//   MemoryStore  → repli si aucun stockage n'est disponible
//   SyncingStore → local + file d'attente vers l'API PHP (voir js/core/sync.js)
//
// Aucun module métier n'appelle localforage directement : c'est ce qui permet
// de brancher le backend plus tard sans toucher au reste de l'application.

const memoryFallback = new Map();

function hasLocalforage() {
    return typeof localforage !== 'undefined';
}

function hasLocalStorage() {
    try {
        const k = '__atoutmath_probe__';
        window.localStorage.setItem(k, '1');
        window.localStorage.removeItem(k);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Stockage clé/valeur namespacé. Les clés réelles sont préfixées par le
 * namespace (ex: `atoutmath:p_ab12:journal`) pour que plusieurs élèves
 * puissent partager le même poste sans mélanger leurs données.
 */
export class LocalStore {
    constructor(namespace) {
        this.namespace = namespace;
        // localforage est chargé depuis un CDN : en salle de classe sans réseau
        // il peut manquer. On dégrade proprement plutôt que de tout perdre.
        this.backend = hasLocalforage() ? 'localforage' : (hasLocalStorage() ? 'localstorage' : 'memory');
    }

    _k(key) {
        return `${this.namespace}:${key}`;
    }

    async get(key, fallback = null) {
        const full = this._k(key);
        try {
            if (this.backend === 'localforage') {
                const v = await localforage.getItem(full);
                return v === null || v === undefined ? fallback : v;
            }
            if (this.backend === 'localstorage') {
                const raw = window.localStorage.getItem(full);
                return raw === null ? fallback : JSON.parse(raw);
            }
        } catch (e) {
            console.warn('[store] lecture impossible', full, e);
        }
        return memoryFallback.has(full) ? memoryFallback.get(full) : fallback;
    }

    async set(key, value) {
        const full = this._k(key);
        memoryFallback.set(full, value);
        try {
            if (this.backend === 'localforage') return await localforage.setItem(full, value);
            if (this.backend === 'localstorage') return window.localStorage.setItem(full, JSON.stringify(value));
        } catch (e) {
            // Quota dépassé ou mode privé : on garde au moins la session en mémoire.
            console.warn('[store] écriture impossible', full, e);
        }
    }

    async remove(key) {
        const full = this._k(key);
        memoryFallback.delete(full);
        try {
            if (this.backend === 'localforage') return await localforage.removeItem(full);
            if (this.backend === 'localstorage') return window.localStorage.removeItem(full);
        } catch (e) {
            console.warn('[store] suppression impossible', full, e);
        }
    }

    async keys() {
        const prefix = `${this.namespace}:`;
        try {
            if (this.backend === 'localforage') {
                const all = await localforage.keys();
                return all.filter(k => k.startsWith(prefix)).map(k => k.slice(prefix.length));
            }
            if (this.backend === 'localstorage') {
                return Object.keys(window.localStorage)
                    .filter(k => k.startsWith(prefix))
                    .map(k => k.slice(prefix.length));
            }
        } catch (e) {
            console.warn('[store] listing impossible', e);
        }
        return [...memoryFallback.keys()].filter(k => k.startsWith(prefix)).map(k => k.slice(prefix.length));
    }

    async clear() {
        const ks = await this.keys();
        await Promise.all(ks.map(k => this.remove(k)));
    }
}

// Store non namespacé, pour les données transverses au poste
// (liste des profils, identifiant d'appareil, réglages de synchro).
export const globalStore = new LocalStore('atoutmath');
