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
const CACHE = 'atoutmath-v512';

const NOYAU = [
    './',
    './index.html',
    './manifest.webmanifest',
    './css/base.css?v=573',
    './css/layout.css?v=573',
    './css/ui.css?v=573',
    './css/games.css?v=573',
    './css/components.css?v=573',
    './css/modules.css?v=573',
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
