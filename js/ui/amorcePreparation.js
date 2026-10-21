// LE PAQUET AVANT L'APPLICATION, ET C'EST TOUT L'INTÉRÊT DU PAQUET.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// ── LA MESURE QUI A FAIT ÉCRIRE CE FICHIER, ET QUI M'A DÉMENTI ─────────────
//
// Premier montage : la page de préparation se montait normalement, PUIS
// demandait le paquet. Mesuré, sur une tablette neuve :
//
//     monter la page de préparation, AVANT que le paquet ne soit demandé
//         520 requêtes
//
// `js/core` compte 415 fichiers, et `app.js` importe le catalogue et le
// registre tout en haut : ouvrir `?preparer` traîne l'application entière. Le
// paquet renvoyait ensuite les MÊMES fichiers dans le ZIP.
//
// ET SUR LE VRAI HÉBERGEMENT, C'ÉTAIT PIRE QUE ÇA. Le `.htaccess` active
// `mod_deflate` sur le JavaScript : chez Rémy, ces 520 fichiers arrivent déjà
// compressés. Le paquet AJOUTAIT donc ses 5,7 Mo à ce qui venait d'être
// téléchargé au lieu de le remplacer — il coûtait des octets au lieu d'en
// gagner.
//
// ── D'OÙ CE FICHIER ────────────────────────────────────────────────────────
//
// `index.html` l'appelle AVANT `js/app.js` quand l'adresse porte `?preparer`.
// Rien n'est encore chargé : le paquet arrive le premier, et les cinq cents
// modules sortent ensuite du cache sans toucher au réseau.
//
// MESURÉ APRÈS, une tablette neuve qui ouvre directement `?preparer` :
//
//                        sans le paquet      avec
//     requêtes servies        599             38
//     fichiers en mémoire     584            686
//     modules de jeu           91             91
//     durée                     5 s            6 s
//
// LE GAIN EST EN ALLERS-RETOURS, PAS EN OCTETS, et il faut le dire ainsi : le
// ZIP pèse ce que pèsent les fichiers compressés un par un, à peu de chose
// près. Mais sur le wifi d'une école, ce sont les allers-retours qui coûtent.
//
// ── ET L'ÉCRAN NE RESTE PAS VIDE ───────────────────────────────────────────
//
// Cinq mégaoctets, c'est long, et la leçon est déjà payée dans ce dépôt : « la
// maîtresse regarde un rectangle vide pendant que la tablette travaille, et
// elle a toutes les raisons de croire que c'est cassé ». On pose donc un mot
// AVANT de télécharger, et on le tient au courant.

import { poserLePaquet, leNavigateurSaitLire } from './paquetHorsLigne.js';

/** D'où vient le paquet hors ligne. Voir `api/horslige.php`. */
export const ADRESSE_DU_PAQUET = 'api/horslige.php';

// LA PROMESSE EST GARDÉE ICI, et c'est elle qui empêche le second
// téléchargement : `preparerTablette.js` la redemande une fois sa page montée,
// et reçoit le résultat de celui-ci au lieu d'en lancer un autre.
let enCours = null;

/** Ce que l'amorce a obtenu, ou `null` si elle n'a pas eu lieu. */
export function paquetDejaPose() { return enCours; }

/** Un mot à l'écran pendant que le paquet arrive — et son effacement. */
function motDAttente() {
    // ON REND TOUJOURS LE MÊME OBJET, même sans document : un appelant qui
    // fait `mot.retirer()` sur une fonction jette, et il jetterait dans le
    // `finally` — en masquant l'erreur d'origine.
    const rien = { dire: () => { }, retirer: () => { } };
    if (typeof document === 'undefined' || !document.body) return rien;
    const el = document.createElement('div');
    el.className = 'prep-amorce';
    el.setAttribute('role', 'status');
    // LES STYLES SONT EN LIGNE, ET C'EST VOULU : ce mot doit s'afficher même
    // si les feuilles de style n'ont pas fini d'arriver — c'est précisément le
    // moment où rien n'est encore chargé. `style-src` autorise `unsafe-inline`.
    el.setAttribute('style', 'position:fixed;inset:0;z-index:2147483646;'
        + 'display:flex;align-items:center;justify-content:center;text-align:center;'
        + 'background:#f6f7fb;color:#1a202c;padding:28px;'
        + 'font:17px/1.6 system-ui,-apple-system,sans-serif');
    el.innerHTML = '<div><b style="font-size:1.25rem">Préparation de la tablette</b>'
        + '<p style="margin:14px 0 0" data-amorce-mot>Téléchargement du paquet '
        + '(environ 6&nbsp;Mo)…</p>'
        + '<p style="margin:10px 0 0;color:#64748b;font-size:.95rem">'
        + 'Une seule fois, et cette tablette marchera sans internet.</p></div>';
    document.body.appendChild(el);
    return {
        dire: (texte) => {
            const p = el.querySelector('[data-amorce-mot]');
            if (p) p.textContent = texte;
        },
        retirer: () => el.remove()
    };
}

/**
 * POSE LE PAQUET AVANT QUE QUOI QUE CE SOIT D'AUTRE NE SE CHARGE.
 *
 * LE SERVICE WORKER DOIT ÊTRE LÀ D'ABORD : le paquet écrit dans SON cache, et
 * sur une tablette neuve ce cache n'existe pas encore. On l'enregistre donc
 * ici — `register` sur la même adresse est sans effet s'il l'est déjà, et
 * `index.html` le refera de son côté sans dommage.
 *
 * ET L'ON N'ATTEND PAS INDÉFINIMENT. Un navigateur qui refuse les services
 * workers (contexte non sécurisé, navigation privée stricte) ne résoudrait
 * jamais `ready` : la préparation resterait sur un mot d'attente, pour
 * toujours. Quinze secondes, puis on laisse l'application démarrer et le
 * chemin de secours faire le travail.
 *
 * @returns {Promise<{fichiers:number, octets:number}|null>}
 */
export function poserLePaquetAuDemarrage(adresse) {
    if (enCours) return enCours;
    enCours = (async () => {
        if (!leNavigateurSaitLire()) return null;
        if (typeof navigator === 'undefined' || !navigator.serviceWorker) return null;
        const mot = motDAttente();
        try {
            try { await navigator.serviceWorker.register('sw.js'); } catch (e) { return null; }
            const pret = await Promise.race([
                navigator.serviceWorker.ready.then(() => true),
                new Promise(r => setTimeout(() => r(false), 15000))
            ]);
            if (!pret) return null;
            // ET LA PAGE DOIT ÊTRE PILOTÉE, PAS SEULEMENT LE WORKER ACTIF.
            //
            // MESURÉ : 239 requêtes là où l'on en attendait une poignée. Un
            // worker `activated` ne sert pas encore la page qui vient de
            // l'installer — `ready` ne promet que son existence. Tant que
            // `controller` est nul, chaque module repart au réseau, et le
            // paquet qu'on vient de poser ne sert à rien de ce chargement-ci.
            //
            // `clients.claim()` est appelé dans `activate` (voir sw.js) : il
            // suffit de l'attendre, et l'événement qui le dit est
            // `controllerchange`.
            if (!navigator.serviceWorker.controller) {
                await Promise.race([
                    new Promise(r => navigator.serviceWorker
                        .addEventListener('controllerchange', r, { once: true })),
                    new Promise(r => setTimeout(r, 8000))
                ]);
            }
            return await poserLePaquet(adresse || ADRESSE_DU_PAQUET,
                (faits, total, etape) => {
                    if (etape === 'rangement' && total) {
                        mot.dire(`Mise en mémoire : ${faits} sur ${total} fichiers…`);
                    }
                });
        } catch (e) {
            // ON NE JETTE PAS. Le paquet est un raccourci : sans lui, la
            // préparation reprend le chemin des six cents requêtes, qui marche.
            console.warn('[amorce] paquet hors ligne indisponible :', e.message);
            return null;
        } finally {
            mot.retirer();
        }
    })();
    return enCours;
}
