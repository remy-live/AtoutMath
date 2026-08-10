// LA VOIX — dire un nombre à haute voix, et rien d'autre.
//
// Un nombre écrit et un nombre DIT ne posent pas le même problème. « Quatre
// mille cinq cents » lu au tableau se recopie ; entendu, il faut le
// reconstruire : combien de milliers, combien de centaines, où sont les zéros.
// C'est exactement la difficulté des grands nombres, et l'écrit la masque.
//
// Ce module n'est qu'une enveloppe autour de la synthèse vocale du
// navigateur. Il existe pour trois raisons, toutes vérifiées à l'usage :
//
//  · la synthèse peut être ABSENTE (navigateur ancien, mode restreint). Un
//    exercice de dictée qui s'ouvre sans voix est un cul-de-sac : il faut
//    pouvoir le savoir AVANT de le proposer.
//  · la liste des voix arrive de façon asynchrone sur Chrome, et souvent vide
//    au premier appel. On attend l'événement plutôt que de parler en anglais.
//  · le débit par défaut est trop rapide pour une dictée de nombres : on ralentit.

const CLE_DEBIT = 'mathbox-voix-debit';

export function voixDisponible() {
    return typeof window !== 'undefined'
        && 'speechSynthesis' in window
        && typeof window.SpeechSynthesisUtterance === 'function';
}

let voixFr = null;
let attente = null;

/**
 * La meilleure voix française disponible.
 *
 * Chrome renvoie une liste VIDE au premier appel puis la remplit : sans
 * l'attente, la première dictée de la séance se dit avec l'accent du système,
 * ce qui rend « quatre-vingts » incompréhensible.
 */
export function preparerVoix() {
    if (!voixDisponible()) return Promise.resolve(null);
    if (voixFr) return Promise.resolve(voixFr);
    if (attente) return attente;

    const choisir = () => {
        const toutes = window.speechSynthesis.getVoices() || [];
        const fr = toutes.filter(v => (v.lang || '').toLowerCase().startsWith('fr'));
        // Une voix locale plutôt qu'une voix distante : elle démarre sans
        // délai réseau, ce qui compte quand on réécoute dix fois de suite.
        voixFr = fr.find(v => v.localService) || fr[0] || null;
        return voixFr;
    };

    if (choisir()) return Promise.resolve(voixFr);
    attente = new Promise((resolve) => {
        const fini = () => { resolve(choisir()); };
        window.speechSynthesis.addEventListener('voiceschanged', fini, { once: true });
        // Filet : certains navigateurs n'émettent jamais l'événement.
        setTimeout(fini, 1200);
    });
    return attente;
}

export function debit() {
    const v = parseFloat(localStorage.getItem(CLE_DEBIT));
    return Number.isFinite(v) && v >= 0.5 && v <= 1.4 ? v : 0.85;
}

export function setDebit(v) {
    try { localStorage.setItem(CLE_DEBIT, String(v)); } catch (e) { /* mode privé */ }
}

/**
 * Dit un texte. Renvoie une promesse résolue à la fin — ou tout de suite si la
 * synthèse est absente, pour que l'appelant n'ait jamais à attendre dans le vide.
 */
export async function parler(texte, options = {}) {
    if (!voixDisponible() || !texte) return false;
    const voix = await preparerVoix();
    return new Promise((resolve) => {
        try {
            window.speechSynthesis.cancel();
            const u = new window.SpeechSynthesisUtterance(String(texte));
            u.lang = 'fr-FR';
            if (voix) u.voice = voix;
            u.rate = options.debit || debit();
            u.pitch = 1;
            u.onend = () => resolve(true);
            u.onerror = () => resolve(false);
            window.speechSynthesis.speak(u);
        } catch (e) { resolve(false); }
    });
}

export function taire() {
    if (voixDisponible()) {
        try { window.speechSynthesis.cancel(); } catch (e) { /* rien à faire */ }
    }
}

/**
 * Le texte à FAIRE DIRE pour un nombre.
 *
 * La synthèse lit « 4500 » correctement, mais lit « 4,5 » comme « quatre
 * virgule cinq » et « 0,25 » comme « zéro virgule vingt-cinq » — ce qui est
 * juste. En revanche elle bute sur les espaces d'unités de milliers : on les
 * retire, sinon « 4 500 » se dit « quatre, cinq cents ».
 */
export function aDire(nombre) {
    return String(nombre).replace(/\s| | /g, '');
}
