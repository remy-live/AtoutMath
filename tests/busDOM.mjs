// UN `document` QUI PORTE VRAIMENT LES ÉVÉNEMENTS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// `tests/helpers.mjs` en pose un MUET : son `addEventListener` ne garde rien et
// son `dispatchEvent` rend `true` sans rien appeler. C'est le bon choix pour
// presque tout le dépôt — les modules du noyau ne touchent au DOM que pour
// prévenir, et personne n'écoute sous Node.
//
// MAIS UNE ÉPREUVE QUI MESURE UN ABONNEMENT NE PEUT PAS S'EN CONTENTER. Avec le
// stub muet, « le journal qui arrive prévient les écrans » serait verte quoi
// qu'il arrive, y compris en retirant la ligne qu'elle prétend garder — c'est
// exactement l'épreuve verte qui ne garde rien, et c'est pire que pas
// d'épreuve.
//
// ON L'IMPORTE AVANT TOUT LE RESTE, y compris avant `helpers.mjs` : celui-ci ne
// pose son stub que si `document` est encore indéfini, et les imports d'un
// module ES s'exécutent dans l'ordre où ils sont écrits.

const abonnes = new Map();

globalThis.document = {
    addEventListener(nom, f) {
        if (!abonnes.has(nom)) abonnes.set(nom, []);
        abonnes.get(nom).push(f);
    },
    removeEventListener(nom, f) {
        const l = abonnes.get(nom) || [];
        const i = l.indexOf(f);
        if (i >= 0) l.splice(i, 1);
    },
    dispatchEvent(ev) {
        (abonnes.get(ev && ev.type) || []).slice().forEach(f => f(ev));
        return true;
    },
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    documentElement: { dataset: {}, style: { setProperty() { } } },
    createElement() {
        return { style: {}, classList: { add() { }, remove() { }, toggle() { } }, appendChild() { } };
    }
};

/** Compte les fois où un événement a été émis depuis cet appel. */
export function compteur(...noms) {
    const vus = Object.fromEntries(noms.map(n => [n, 0]));
    noms.forEach(n => document.addEventListener(n, () => { vus[n]++; }));
    return vus;
}
