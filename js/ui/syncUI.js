// Interface de synchronisation avec la classe.
//
// Volontairement minimale : adresse du serveur, code de classe, prénom. Pas
// d'adresse e-mail ni de mot de passe — pour des élèves mineurs, le bon niveau
// de données personnelles est le plus bas qui permette au professeur de
// reconnaître ses élèves.

import { joinClass, syncNow, getSyncConfig, isActive } from '../core/sync.js';
import { getActiveProfile } from '../core/profile.js';
import { showAlert } from './modal.js';

export function initSyncUI() {
    const modal = document.getElementById('sync-modal');
    const open = document.getElementById('btn-open-sync');
    if (!modal || !open) return;

    open.onclick = () => { fillForm(); modal.style.display = 'flex'; };

    const close = document.getElementById('btn-close-sync');
    if (close) close.onclick = () => { modal.style.display = 'none'; };

    document.getElementById('btn-sync-join').onclick = async () => {
        const apiUrl = value('sync-api-url');
        const classCode = value('sync-class-code');
        const firstName = value('sync-first-name');
        if (!apiUrl || !classCode || !firstName) {
            return showAlert('Renseigne l\'adresse du serveur, le code de la classe et ton prénom.');
        }
        status('Connexion…');
        try {
            const data = await joinClass({ apiUrl, classCode, firstName });
            status(`Rattaché à « ${data.className} ». Ta progression est maintenant synchronisée.`);
        } catch (err) {
            status('Échec : ' + err.message);
        }
    };

    document.getElementById('btn-sync-now').onclick = async () => {
        if (!isActive()) return showAlert('Rejoins d\'abord une classe.');
        status('Synchronisation…');
        const res = await syncNow({ silent: false });
        status(res ? `${res.pushed} envoyé(s), ${res.pulled} reçu(s).` : 'Réessaie une fois connecté.');
    };

    document.addEventListener('sync_done', (e) => {
        status(`Dernière synchro : ${new Date().toLocaleTimeString()} (${e.detail.pushed} envoyé(s), ${e.detail.pulled} reçu(s)).`);
    });

    fillForm();
}

function fillForm() {
    const cfg = getSyncConfig();
    const profile = getActiveProfile();
    setValue('sync-api-url', cfg.apiUrl || '');
    setValue('sync-first-name', profile ? profile.name : '');
    if (profile && profile.remote) {
        setValue('sync-class-code', profile.remote.classCode || '');
        status(profile.remote.lastSyncAt
            ? `Classe « ${profile.remote.className || profile.remote.classCode} » — dernière synchro le ${new Date(profile.remote.lastSyncAt).toLocaleString()}.`
            : `Classe « ${profile.remote.className || profile.remote.classCode} » — pas encore synchronisé.`);
    } else {
        status('Ce profil n\'est rattaché à aucune classe. Tout fonctionne hors ligne.');
    }
}

function value(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

function setValue(id, v) {
    const el = document.getElementById(id);
    if (el) el.value = v;
}

function status(msg) {
    const el = document.getElementById('sync-status');
    if (el) el.textContent = msg;
}
