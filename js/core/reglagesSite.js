// LES RÉGLAGES DU SITE, TELS QUE LE SERVEUR LES TIENT.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « le mode libre, mets-le en bouton dans ma zone prof (qui est admin
// aussi du coup) ».
//
// POURQUOI CE N'ÉTAIT PAS DÉJÀ LE CAS. Le mode libre vivait dans une constante
// du code, avec une dérogation par `localStorage`. Les deux ne servaient qu'à
// UN navigateur : Rémy pouvait regarder à quoi ressemblerait le mode libre chez
// lui, mais l'allumer pour ses élèves demandait de republier le site. Un
// réglage qui ne franchit pas le réseau n'est pas un réglage de site.
//
// TROIS AUTORITÉS, DANS CET ORDRE, et l'ordre est le fond du sujet :
//
//   1. LA DÉROGATION LOCALE (`atoutmath-mode-libre`). Elle gagne sur tout, et
//      c'est voulu : c'est l'outil de celui qui essaie. On regarde l'écran de
//      l'élève sans changer ce que trente élèves voient.
//   2. LE SERVEUR. C'est le vrai réglage, celui du bouton de la zone
//      professeur, et il vaut pour tout le monde.
//   3. LA CONSTANTE DU CODE. Le repli quand il n'y a pas de serveur du tout —
//      un AtoutMath posé sur une clé USB, un poste hors ligne.
//
// ON GARDE LA DERNIÈRE RÉPONSE. Un élève qui ouvre l'application dans le train
// ne doit pas voir l'interface changer parce que le réseau est absent : on relit
// ce que le serveur avait dit la dernière fois, et l'on ne le remplace qu'en
// ayant mieux. Le réglage n'est pas une donnée sensible — savoir que le
// catalogue est ouvert, c'est ce qu'on apprend en regardant l'écran d'accueil.

// PAS D'IMPORT DE `portail.js` ICI, ET C'EST DÉLIBÉRÉ. `portail.js` a besoin
// de nous (il lit le réglage) ; si nous avions besoin de lui (pour déduire
// l'adresse), les deux modules s'importeraient l'un l'autre. Les modules ES
// savent gérer un cycle, mais il suffit qu'un jour une valeur soit lue au
// chargement plutôt que dans une fonction pour qu'elle arrive vide, sans
// erreur. C'est donc l'APPELANT qui donne l'adresse : il la connaît.

const CLE_CACHE = 'atoutmath-reglages-site';

/** Ce que le serveur a dit la dernière fois, ou `null` s'il n'a jamais parlé. */
let enMemoire = null;

function lireLeCache() {
    try {
        const brut = window.localStorage.getItem(CLE_CACHE);
        return brut ? JSON.parse(brut) : null;
    } catch (e) { return null; }
}

function ecrireLeCache(r) {
    try { window.localStorage.setItem(CLE_CACHE, JSON.stringify(r)); } catch (e) { /* privé */ }
}

/**
 * LE RÉGLAGE DU SERVEUR, SANS ALLER LE CHERCHER.
 *
 * Rend `null` si le serveur n'a jamais répondu — ce qui n'est pas la même chose
 * que « éteint », et l'appelant doit pouvoir faire la différence pour retomber
 * sur sa propre valeur par défaut.
 */
export function reglageSite(nom) {
    if (enMemoire === null) enMemoire = lireLeCache();
    if (!enMemoire || !(nom in enMemoire)) return null;
    return enMemoire[nom];
}

/**
 * DEMANDER AU SERVEUR, UNE FOIS.
 *
 * Appelée au démarrage. Elle ne lève jamais : pas de serveur, pas de réseau,
 * une réponse illisible — dans les trois cas on garde ce qu'on avait, et
 * l'application démarre.
 *
 * @returns {Promise<object|null>} les réglages lus, ou `null` si rien de neuf.
 */
export async function chargerReglagesSite(adresse) {
    const base = String(adresse || '').replace(/\/$/, '');
    if (!base) return null;
    try {
        const r = await fetch(`${base}/reglages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}'
        });
        if (!r.ok) return null;
        const data = await r.json();
        if (!data || typeof data.reglages !== 'object' || !data.reglages) return null;
        enMemoire = data.reglages;
        ecrireLeCache(enMemoire);
        // ON PRÉVIENT : la porte d'entrée est peut-être déjà dessinée quand la
        // réponse arrive. Sans cet avis, le mode libre allumé par le professeur
        // n'apparaîtrait qu'au rechargement suivant.
        try {
            document.dispatchEvent(new CustomEvent('reglages_site', { detail: enMemoire }));
        } catch (e) { /* pas de document : un test sous Node */ }
        return enMemoire;
    } catch (e) {
        return null;
    }
}

/**
 * POSER LE RÉGLAGE SANS REPASSER PAR LE RÉSEAU.
 *
 * Le professeur vient de basculer l'interrupteur : sa propre page doit changer
 * tout de suite, et non à la prochaine visite. Le serveur a déjà répondu, on
 * range sa réponse.
 */
export function noterReglagesSite(r) {
    if (!r || typeof r !== 'object') return;
    enMemoire = { ...(enMemoire || {}), ...r };
    ecrireLeCache(enMemoire);
    try {
        document.dispatchEvent(new CustomEvent('reglages_site', { detail: enMemoire }));
    } catch (e) { /* pas de document */ }
}

/** Pour les épreuves : repartir de zéro. */
export function oublierReglagesSite() {
    enMemoire = null;
    try { window.localStorage.removeItem(CLE_CACHE); } catch (e) { /* privé */ }
}
