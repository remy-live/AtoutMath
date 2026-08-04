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
const CACHE = 'atoutmath-v1';

const NOYAU = [
    './',
    './index.html',
    './manifest.webmanifest',
    './css/base.css?v=27',
    './css/layout.css?v=27',
    './css/ui.css?v=27',
    './css/games.css?v=27',
    './css/components.css?v=27',
    './css/modules.css?v=27',
    './icons/icon-192.png',
    './icons/icon-512.png'
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

    e.respondWith(
        fetch(req)
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
