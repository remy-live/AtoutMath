// Journal d'événements append-only : la source de vérité de la progression.
//
// Pourquoi un journal plutôt que des agrégats (`score: 42`, `errorHistory: []`) ?
// Parce qu'un agrégat ne se fusionne pas. Si l'élève travaille à l'école puis à
// la maison, deux valeurs de `score` s'écrasent l'une l'autre et il faut
// arbitrer. Deux listes d'événements horodatés et identifiés par UUID se
// fusionnent par simple union : l'opération est commutative, idempotente et
// sans perte. Le serveur PHP fait exactement la même chose (INSERT IGNORE).
//
// Corollaire : score, maîtrise, carnet d'erreurs et notes ne sont jamais
// stockés. Ce sont des *projections* recalculées à la lecture
// (voir js/core/projections.js), à l'identique côté client et côté serveur.

import { uuid } from './ids.js';

export const EventTypes = {
    ATTEMPT: 'attempt',                 // une question répondue (juste ou fausse)
    ERROR_RESOLVED: 'error_resolved',   // une erreur du carnet marquée corrigée
    ERROR_DISMISSED: 'error_dismissed', // une erreur retirée du carnet
    RUN_STARTED: 'run_started',
    RUN_FINISHED: 'run_finished',
    STEP_COMPLETED: 'step_completed',
    TIME_SPENT: 'time_spent',
    BADGE_GRANTED: 'badge_granted',
    PATH_ASSIGNED: 'path_assigned',
    // UNE ÉTAPE SOUS CLÉ VIENT D'ÊTRE OUVERTE. C'est un événement du journal
    // comme les autres, et pas un réglage à part : il se synchronise donc tout
    // seul entre les appareils de l'élève, et le professeur voit à quelle heure
    // sa clé a été utilisée — ce qui est exactement ce qu'il veut savoir d'une
    // interrogation. Charge utile : { sel, jusqua }.
    VERROU_OUVERT: 'verrou_ouvert',
    HINT_USED: 'hint_used',
    BONUS: 'bonus',                     // points hors question (migration, récompense)
    SNAPSHOT: 'snapshot'                // agrégat de compactage (voir compact())
};

const STORE_KEY = 'journal';
const COMPACT_THRESHOLD = 4000;   // au-delà, on compacte le plus ancien
const COMPACT_KEEP_DAYS = 120;    // détail conservé sur ~4 mois

export class Journal {
    constructor() {
        this.events = [];
        this.store = null;
        this.profileId = null;
        this.deviceId = null;
        this._saveTimer = null;
        this._dirty = false;
    }

    async load(store, { profileId, deviceId }) {
        this.store = store;
        this.profileId = profileId;
        this.deviceId = deviceId;
        this.events = (await store.get(STORE_KEY, [])) || [];
        // Défense : un journal corrompu ne doit pas empêcher l'app de démarrer.
        if (!Array.isArray(this.events)) this.events = [];
        this.events.sort((a, b) => a.ts - b.ts);
        return this.events.length;
    }

    /**
     * Ajoute un événement au journal.
     * @param {string} type - une valeur de EventTypes
     * @param {Object} payload
     * @returns {Object} l'événement créé
     */
    emit(type, payload = {}) {
        const ev = {
            id: uuid(),
            type,
            ts: Date.now(),
            profileId: this.profileId,
            deviceId: this.deviceId,
            payload,
            synced: false
        };
        this.events.push(ev);
        this._scheduleSave();
        document.dispatchEvent(new CustomEvent('journal_appended', { detail: ev }));
        return ev;
    }

    all() {
        return this.events;
    }

    byType(type) {
        return this.events.filter(e => e.type === type);
    }

    /** Événements pas encore poussés au serveur. */
    pending() {
        return this.events.filter(e => !e.synced);
    }

    markSynced(ids) {
        const set = new Set(ids);
        let changed = false;
        this.events.forEach(e => {
            if (set.has(e.id) && !e.synced) {
                e.synced = true;
                changed = true;
            }
        });
        if (changed) this._scheduleSave();
    }

    /**
     * Fusionne des événements venus d'ailleurs (autre appareil, serveur).
     * Union par id : commutatif, idempotent, sans arbitrage.
     * @returns {number} nombre d'événements réellement ajoutés
     */
    merge(incoming) {
        const known = new Set(this.events.map(e => e.id));
        let added = 0;
        (incoming || []).forEach(ev => {
            if (!ev || !ev.id || known.has(ev.id)) return;
            known.add(ev.id);
            this.events.push({ ...ev, synced: true });
            added++;
        });
        if (added > 0) {
            this.events.sort((a, b) => a.ts - b.ts);
            this._scheduleSave();
            document.dispatchEvent(new CustomEvent('journal_merged', { detail: { added } }));
        }
        return added;
    }

    /**
     * Replie les vieux événements de détail en un unique SNAPSHOT pour borner
     * la taille du journal sans perdre les totaux. Les événements non
     * synchronisés ne sont jamais compactés (ils doivent encore partir).
     */
    compact(now = Date.now()) {
        if (this.events.length < COMPACT_THRESHOLD) return 0;
        const cutoff = now - COMPACT_KEEP_DAYS * 86400000;
        const old = this.events.filter(e => e.ts < cutoff && e.synced && e.type !== EventTypes.SNAPSHOT);
        if (old.length === 0) return 0;

        const agg = { attempts: 0, correct: 0, points: 0, seconds: 0, perSkill: {} };
        old.forEach(e => {
            if (e.type === EventTypes.ATTEMPT) {
                agg.attempts++;
                if (e.payload.correct) agg.correct++;
                agg.points += e.payload.points || 0;
                const sk = e.payload.skillId;
                if (sk) {
                    if (!agg.perSkill[sk]) agg.perSkill[sk] = { attempts: 0, correct: 0, lastTs: 0 };
                    agg.perSkill[sk].attempts++;
                    if (e.payload.correct) agg.perSkill[sk].correct++;
                    agg.perSkill[sk].lastTs = Math.max(agg.perSkill[sk].lastTs, e.ts);
                }
            } else if (e.type === EventTypes.TIME_SPENT) {
                agg.seconds += e.payload.seconds || 0;
            }
        });

        const oldIds = new Set(old.map(e => e.id));
        this.events = this.events.filter(e => !oldIds.has(e.id));
        this.events.push({
            id: uuid(),
            type: EventTypes.SNAPSHOT,
            ts: cutoff,
            profileId: this.profileId,
            deviceId: this.deviceId,
            payload: agg,
            synced: true,
            local: true // un snapshot est local : le serveur garde le détail
        });
        this.events.sort((a, b) => a.ts - b.ts);
        this._scheduleSave();
        return old.length;
    }

    // Sauvegarde différée : une rafale de bonnes réponses ne déclenche
    // qu'une seule écriture disque.
    _scheduleSave() {
        this._dirty = true;
        if (this._saveTimer) return;
        this._saveTimer = setTimeout(() => {
            this._saveTimer = null;
            this.flush();
        }, 400);
    }

    async flush() {
        if (!this.store || !this._dirty) return;
        this._dirty = false;
        await this.store.set(STORE_KEY, this.events);
    }

    async reset() {
        this.events = [];
        this._dirty = true;
        await this.flush();
        document.dispatchEvent(new CustomEvent('journal_merged', { detail: { added: 0, reset: true } }));
    }
}

export const journal = new Journal();

// Filet de sécurité : ne jamais perdre les dernières réponses si l'onglet
// est fermé pendant le délai de sauvegarde différée.
if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => journal.flush());
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') journal.flush();
    });
}
