// Service worker : rend l'application installable et utilisable hors ligne.
//
// Stratégie volontairement simple pour une application sans build :
//   - un NOYAU pré-mis en cache à l'installation (page, feuilles de style,
//     manifeste, icônes) : de quoi démarrer sans réseau ;
//   - pour tout le reste (modules JS chargés à la demande, bibliothèques CDN) :
//     réseau d'abord, copie en cache au passage, et cache en secours quand le
//     réseau manque. Le réseau d'abord garantit qu'un poste connecté reçoit
//     toujours la dernière version — le cache ne sert que hors ligne.
//
// À incrémenter à chaque déploiement pour purger l'ancien cache.
const CACHE = 'atoutmath-v533';

const NOYAU = [
    './',
    './index.html',
    './manifest.webmanifest',
    './css/base.css?v=594',
    './css/layout.css?v=594',
    './css/ui.css?v=594',
    './css/games.css?v=594',
    './css/components.css?v=594',
    './css/modules.css?v=594',
    './icons/icon-192.png',
    './icons/icon-512.png',
    // LES BIBLIOTHÈQUES, désormais servies avec l'application. Elles sont dans
    // le NOYAU et non chargées à la demande : c'est hors ligne qu'on en a le
    // plus besoin — le stockage au démarrage, et le PDF quand on prépare une
    // fiche là où le réseau ne suit pas.
    './vendor/localforage/localforage.min.js',
    './vendor/confetti/confetti.browser.js',
    './vendor/jspdf/jspdf.umd.min.js',
    './vendor/outfit/outfit.css',
    './vendor/outfit/outfit-latin-400-normal.woff2',
    './vendor/outfit/outfit-latin-700-normal.woff2',
    './vendor/outfit/outfit-latin-800-normal.woff2'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE)
            .then(cache => cache.addAll(NOYAU))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

/**
 * GARNIR LE CACHE AVEC CE QUE LA PAGE A RÉELLEMENT CHARGÉ.
 *
 * Un service worker ne voit pas les requêtes faites AVANT son activation :
 * au tout premier passage, les deux cent quarante modules de l'application
 * sont déjà arrivés quand il prend la main, et rien ne les met en cache.
 * Mesuré : 18 entrées après une visite, 267 après deux — et entre les deux,
 * une application hors ligne réduite à une coquille vide.
 *
 * La page nous envoie donc la liste de ce qu'elle a chargé (elle la connaît
 * par `performance`), et on la range. Aucune liste écrite à la main : il n'y a
 * pas d'étape de compilation dans ce projet, et une liste de 248 modules
 * tapée à la main serait fausse dès le premier ajout.
 *
 * ON NE RECOMMENCE PAS À CHAQUE VISITE. Une fois le cache garni, les visites
 * suivantes n'ont rien à ranger : on compare le nombre d'entrées à la liste
 * reçue et l'on ne va chercher que ce qui manque. Et l'on met en cache UNE PAR
 * UNE plutôt qu'avec `addAll` : celui-ci abandonne tout si un seul fichier
 * échoue, ce qui rendrait la mise en cache otage de la première image absente.
 */
async function garnir(liste) {
    const cache = await caches.open(CACHE);
    const deja = new Set((await cache.keys()).map(r => r.url));
    const manquants = [...new Set(liste)].filter(u => !deja.has(u));
    if (!manquants.length) return;
    for (const url of manquants) {
        try {
            const r = await fetch(url, { cache: 'no-cache', credentials: 'same-origin' });
            if (r && r.ok) await cache.put(url, r.clone());
        } catch (e) { /* un fichier manquant n'empêche pas les autres */ }
    }
}

self.addEventListener('message', (e) => {
    const d = e.data;
    if (d && d.type === 'garnir' && Array.isArray(d.liste)) {
        e.waitUntil(garnir(d.liste));
    }
});

self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET') return;
    // L'API de synchronisation ne doit JAMAIS être servie depuis le cache :
    // des données de classe périmées sont pires que pas de données.
    if (new URL(req.url).pathname.includes('/api/')) return;

    // Le « réseau d'abord » ne suffisait PAS à garantir la dernière version.
    //
    // `fetch()` passe par le cache HTTP du navigateur, et GitHub Pages sert
    // ses fichiers avec `max-age=600` : pendant dix minutes après un
    // déploiement, on pouvait recevoir la page neuve et d'anciens modules.
    // Les feuilles de style, elles, portent un `?v=N` qui les renouvelle —
    // d'où le symptôme observé : « v49 » affiché en bas de l'écran et
    // « Activité introuvable », parce que le catalogue était neuf et le
    // registre des activités périmé.
    //
    // `no-cache` ne veut pas dire « ne pas mettre en cache » : le navigateur
    // REVALIDE auprès du serveur, qui répond 304 quand rien n'a changé. Le
    // coût est d'un aller-retour vide, le gain est qu'un poste connecté a
    // toujours le code du jour. Hors ligne, on retombe sur le cache.
    const url = new URL(req.url);
    const demande = url.origin === self.location.origin
        ? new Request(url.href, {
            cache: 'no-cache', credentials: 'same-origin',
            headers: req.headers, redirect: 'follow'
        })
        : req;

    e.respondWith(
        fetch(demande)
            .then(reponse => {
                // Copie en cache au passage (y compris les réponses opaques du
                // CDN : on ne peut pas les lire, mais on peut les resservir).
                if (reponse && (reponse.ok || reponse.type === 'opaque')) {
                    const copie = reponse.clone();
                    caches.open(CACHE).then(cache => cache.put(req, copie));
                }
                return reponse;
            })
            .catch(() => caches.match(req).then(hit =>
                hit || (req.mode === 'navigate' ? caches.match('./index.html') : Promise.reject(new Error('hors ligne')))
            ))
    );
});
