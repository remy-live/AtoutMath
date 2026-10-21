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
const CACHE = 'atoutmath-v1015';

const NOYAU = [
    './',
    './index.html',
    './manifest.webmanifest',
    './css/base.css?v=1076',
    './css/layout.css?v=1076',
    './css/ui.css?v=1076',
    './css/games.css?v=1076',
    './css/components.css?v=1076',
    './css/modules.css?v=1076',
    './icones/icon-192.png',
    './icones/icon-512.png',
    // LES BIBLIOTHÈQUES, désormais servies avec l'application. Elles sont dans
    // le NOYAU et non chargées à la demande : c'est hors ligne qu'on en a le
    // plus besoin — le stockage au démarrage, et le PDF quand on prépare une
    // fiche là où le réseau ne suit pas.
    './vendor/localforage/localforage.min.js',
    './vendor/confetti/confetti.browser.js',
    './vendor/jspdf/jspdf.umd.min.js',
    // LE LECTEUR DE QR CODE. Dans le NOYAU et non chargé à la demande, pour la
    // raison qui justifie toute cette liste : on scanne le QR du tableau dans
    // une salle SANS RÉSEAU, et un décodeur qu'il faudrait alors aller
    // chercher serait un décodeur absent le jour où il sert.
    './vendor/jsqr/jsQR.js',
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

/**
 * CE QUE L'ANCIEN CACHE GARDAIT, LE NOUVEAU LE REPREND.
 *
 * ── LE DÉFAUT, ET IL EST MESURÉ ────────────────────────────────────────────
 *
 * RÉMY : « Si je mets à jour atout math et que je réinstalle ça se met bien à
 * jour ». `node tools/sondeMiseAJour.mjs`, sur le chemin exact de sa sœur —
 * une tablette préparée, un dépôt, un rechargement :
 *
 *     tablette préparée      580 fichiers, 91 de js/games/
 *     elle recharge,  à 10 s  19 fichiers  ← le NOYAU, et RIEN d'autre
 *                       15 s 257 fichiers, 2 de js/games/
 *                       40 s 257 fichiers, 2 de js/games/   (le palier)
 *
 * La mise à jour, elle, était PROPRE : c'est bien ce que ce cache nommé par
 * version garantit. Mais la PRÉPARATION était perdue — 91 modules de jeu
 * avant, deux après, et les deux sont `engine.js` et `configUI.js`, c'est-à-
 * dire pas un seul jeu. Le rattrapage de huit secondes d'`index.html` ne range
 * que ce que la page a demandé, et la page d'accueil ne demande pas les jeux.
 *
 * ET LA TABLETTE N'EN AVAIT PAS L'AIR : réseau coupé, le jeu tournait encore —
 * depuis le cache du NAVIGATEUR, que personne ne contrôle. La même sonde,
 * mesurant dix secondes plus tôt, voyait « L'application n'a pas démarré ».
 *
 * ── CE QU'ON FAIT, ET DANS CET ORDRE ──────────────────────────────────────
 *
 * On relit les ADRESSES de l'ancien cache avant de l'effacer, puis on garnit
 * le nouveau avec. Une tablette préparée reste donc préparée, sans un geste.
 *
 * ON EFFACE TOUJOURS AVANT DE REMPLIR, et ce n'est pas un détail : garder les
 * deux caches le temps du remplissage ferait cohabiter deux versions, et le
 * secours hors ligne (`caches.match`, qui cherche dans TOUS les caches)
 * pourrait rendre un fichier de l'ancienne. C'est exactement le défaut « v49 »
 * décrit plus bas, et ce cache par version existe pour l'empêcher. On ne perd
 * rien à effacer d'abord : une mise à jour ne se produit QUE si le réseau
 * vient de servir un `sw.js` neuf — il est donc là pour le remplissage.
 *
 * ET S'IL S'EN VA EN COURS DE ROUTE, la tablette ne le devine pas : c'est le
 * bandeau de `js/ui/prepaPerdue.js` qui le dit, avec le bouton qui refait la
 * préparation. Les deux moitiés sont nécessaires — celle-ci évite le geste,
 * celle-là évite de croire qu'il a eu lieu.
 *
 * ON NE REPREND PAS LES ADRESSES À QUESTION. Les six feuilles de style sont
 * gardées sous le `?v=` de la version précédente ; la nouvelle leur en donne un
 * autre, et `install` vient de les mettre en cache sous celui-là. Reprendre les
 * anciennes clés ajouterait six entrées que personne ne demandera jamais.
 *
 * ET L'ON N'ÉCRIT PAS DE NUMÉRO DE VERSION DANS CE COMMENTAIRE : le rituel
 * compte les `?v=NNN` du fichier et refuse de monter quoi que ce soit s'il en
 * trouve deux différents. Un exemple chiffré ici bloque donc le dépôt, et le
 * message d'erreur accuse `sw.js` sans dire que c'est une phrase.
 */
async function reprendreLAncien() {
    const noms = (await caches.keys()).filter(k => k !== CACHE);
    // LES ADRESSES D'ABORD, L'EFFACEMENT ENSUITE. Après `caches.delete`, il n'y
    // a plus de liste à relire : l'ordre inverse perdrait la préparation pour
    // de bon, et sans rien signaler.
    const liste = [];
    for (const nom of noms) {
        try {
            for (const req of await (await caches.open(nom)).keys()) {
                const u = new URL(req.url);
                if (u.origin !== self.location.origin) continue;
                if (u.search) continue;
                if (u.pathname.includes('/api/')) continue;
                liste.push(u.href);
            }
        } catch (err) { /* un cache illisible n'empêche pas les autres */ }
    }
    await Promise.all(noms.map(k => caches.delete(k)));
    // ON PREND LA MAIN AVANT DE REMPLIR : la page n'a aucune raison d'attendre
    // six cents fichiers pour être pilotée. C'est `waitUntil`, plus bas, qui
    // tient le worker en vie pendant le remplissage.
    await self.clients.claim();
    if (liste.length) await garnir(liste);
    return liste.length;
}

self.addEventListener('activate', (e) => {
    // LE `catch` REPREND LA MAIN QUOI QU'IL ARRIVE. Un worker qui n'appelle pas
    // `clients.claim()` laisse la page sous l'ANCIEN worker jusqu'au prochain
    // chargement : la mise à jour aurait l'air de ne pas être arrivée.
    e.waitUntil(reprendreLAncien().catch(() => self.clients.claim()));
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

    // ── CACHE D'ABORD, DANS LE CACHE DE CETTE VERSION-LÀ ───────────────────
    //
    // CE QUI ÉTAIT ÉCRIT ICI AVANT, ET POURQUOI C'ÉTAIT JUSTE. Le worker allait
    // au réseau pour CHAQUE fichier, en forçant une revalidation :
    //
    //   « `fetch()` passe par le cache HTTP du navigateur, et GitHub Pages sert
    //     ses fichiers avec `max-age=600` : pendant dix minutes après un
    //     déploiement, on pouvait recevoir la page neuve et d'anciens modules.
    //     D'où le symptôme observé : « v49 » affiché en bas de l'écran et
    //     « Activité introuvable », parce que le catalogue était neuf et le
    //     registre des activités périmé. »
    //
    // CETTE CORRECTION RESTE NÉCESSAIRE, et la mesure le dit : AUCUN des 1944
    // `import` de l'application ne porte de `?v=` — seuls les six d'index.html
    // en ont un. L'adresse de `js/core/state.js` ne change donc jamais, et rien
    // n'empêcherait un cache de la servir périmée.
    //
    // CE QUI A CHANGÉ : `CACHE` porte le numéro de version, et le rituel le
    // monte à CHAQUE dépôt — `tools/version.mjs` refuse même de monter quoi que
    // ce soit si index.html et sw.js divergent. Le cache est donc déjà étiqueté
    // par version, et `activate` efface les anciens. On peut y puiser sans
    // jamais rendre du code périmé : un cache ne contient que des fichiers
    // d'UNE version, et il meurt avec elle.
    //
    // ET C'EST PLUS SÛR QU'AVANT, pas seulement plus rapide. Avec une
    // revalidation fichier par fichier, un dépôt qui tombe pendant qu'un élève
    // navigue pouvait encore lui donner un mélange — exactement le défaut de
    // « v49 ». Avec un cache par version, il tourne sur UNE version cohérente,
    // puis bascule d'un bloc quand le nouveau worker prend la main.
    //
    // POURQUOI MAINTENANT : mesuré au navigateur (tools/poidsDuDemarrage.mjs),
    // rouvrir l'application coûtait 382 requêtes réseau, à chaque fois. Rémy :
    // « les élèves sont en réseaux pas en wifi chacun sur sa session connectée
    // en câble rj », et leur profil de navigateur survit d'une session à
    // l'autre — ce cache est donc encore là à l'heure suivante.
    //
    // LA PAGE RESTE AU RÉSEAU D'ABORD, et c'est elle qui tient tout : c'est en
    // la demandant que le navigateur relit `sw.js`, donc découvre qu'une
    // version est arrivée. Servir la PAGE depuis le cache ferait un logiciel
    // qui ne se met plus jamais à jour.
    const page = req.mode === 'navigate';

    // LE REMPLISSAGE, LUI, GARDE LA REVALIDATION. C'est la moitié qui reste
    // indispensable : au premier passage d'une version neuve, le cache HTTP du
    // navigateur contient encore les fichiers de la précédente. Les y prendre
    // sans revalider les figerait pour toute la durée de la version — le défaut
    // de « v49 », en pire, puisqu'il durerait jusqu'au dépôt suivant.
    //
    // `no-cache` ne veut pas dire « ne pas mettre en cache » : le navigateur
    // REVALIDE auprès du serveur, qui répond 304 quand rien n'a changé.
    const demande = new Request(url.href, {
        cache: 'no-cache', credentials: 'same-origin',
        headers: req.headers, redirect: 'follow'
    });

    const duReseau = () =>
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
                if (page) {
                    const accueil = await caches.match('./index.html');
                    if (accueil) return accueil;
                }
                // UNE RÉPONSE, PAS UN REJET. Rejeter la promesse donnait une
                // « Uncaught (in promise) Error: hors ligne » par fichier
                // manquant : le navigateur produit de toute façon une erreur
                // réseau côté page, mais il la produisait EN PLUS d'un
                // tombereau de lignes rouges qui n'apprenaient rien.
                return new Response('', { status: 504, statusText: 'hors ligne' });
            });

    // ON PUISE DANS LE CACHE DE CETTE VERSION, ET PAS DANS « LES CACHES ».
    // `caches.match(req)` cherche dans TOUS les caches, y compris celui d'une
    // version qu'on vient d'effacer — il ne sert qu'au secours hors ligne,
    // jamais au chemin ordinaire. `caches.open(CACHE)` nomme la version.
    e.respondWith(page ? duReseau() : caches.open(CACHE)
        .then(cache => cache.match(req))
        .then(hit => hit || duReseau())
        .catch(() => duReseau()));
});
