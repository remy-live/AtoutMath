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
const CACHE = 'atoutmath-v758';

const NOYAU = [
    './',
    './index.html',
    './manifest.webmanifest',
    './css/base.css?v=819',
    './css/layout.css?v=819',
    './css/ui.css?v=819',
    './css/games.css?v=819',
    './css/components.css?v=819',
    './css/modules.css?v=819',
    './icones/icon-192.png',
    './icones/icon-512.png',
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

    // ON NE S'OCCUPE QUE DE NOS PROPRES FICHIERS — et c'est un correctif, pas
    // une précaution.
    //
    // RÉMY, console à l'appui : des dizaines de lignes rouges. Trois familles,
    // une seule cause, et la cause n'était PAS dans l'application :
    //
    //   · « Failed to execute 'put' on 'Cache': Request scheme
    //     'chrome-extension' is unsupported » — une extension du navigateur
    //     demande ses propres fichiers dans l'onglet ; notre worker les
    //     interceptait et tentait de les mettre en cache, ce que l'API refuse
    //     pour tout ce qui n'est pas http(s) ;
    //
    //   · « Fetch API cannot load https://fonts.gstatic.com/… Refused to
    //     connect because it violates the document's Content Security
    //     Policy » — la même extension injecte une police Google. Le
    //     navigateur, lui, l'aurait classée en `font-src` ; nous, en la
    //     REDEMANDANT depuis le worker, nous en faisions un `connect-src`,
    //     que la politique interdit à juste titre. Nous fabriquions la
    //     violation que nous signalions ;
    //
    //   · « The FetchEvent resulted in a network error response » et
    //     « Error: hors ligne » — les conséquences des deux premières.
    //
    // L'application ne charge RIEN d'ailleurs : `default-src 'self'` le lui
    // interdit, et les bibliothèques comme la police sont servies depuis
    // ./vendor (voir NOYAU). Une requête d'une autre origine n'est donc jamais
    // la nôtre : on la laisse au navigateur, qui saura la traiter sous la
    // bonne directive — et le journal redevient lisible, ce qui est la
    // condition pour y voir les vraies erreurs.
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    // L'API de synchronisation ne doit JAMAIS être servie depuis le cache :
    // des données de classe périmées sont pires que pas de données.
    if (url.pathname.includes('/api/')) return;

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
    const demande = new Request(url.href, {
        cache: 'no-cache', credentials: 'same-origin',
        headers: req.headers, redirect: 'follow'
    });

    e.respondWith(
        fetch(demande)
            .then(reponse => {
                // Copie en cache au passage. LE `catch` N'EST PAS DÉCORATIF :
                // une écriture de cache peut échouer (quota plein, réponse
                // partielle), et sans lui l'échec remontait en promesse non
                // traitée — « Cache.put() encountered a network error », vu
                // lui aussi dans la console de Rémy. Rater la COPIE n'est pas
                // rater la réponse : elle est déjà rendue.
                if (reponse && reponse.ok) {
                    const copie = reponse.clone();
                    caches.open(CACHE)
                        .then(cache => cache.put(req, copie))
                        .catch(() => { /* le cache est un confort, pas un dû */ });
                }
                return reponse;
            })
            .catch(async () => {
                const hit = await caches.match(req);
                if (hit) return hit;
                if (req.mode === 'navigate') {
                    const page = await caches.match('./index.html');
                    if (page) return page;
                }
                // UNE RÉPONSE, PAS UN REJET. Rejeter la promesse donnait une
                // « Uncaught (in promise) Error: hors ligne » par fichier
                // manquant : le navigateur produit de toute façon une erreur
                // réseau côté page, mais il la produisait EN PLUS d'un
                // tombereau de lignes rouges qui n'apprenaient rien.
                return new Response('', { status: 504, statusText: 'hors ligne' });
            })
    );
});
