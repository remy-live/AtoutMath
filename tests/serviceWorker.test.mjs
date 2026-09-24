// LE SERVICE WORKER NE PARLE QUE DE NOS FICHIERS.
//
// RÉMY, console à l'appui, des dizaines de lignes rouges :
//
//   sw.js:131 Uncaught (in promise) TypeError: Failed to execute 'put' on
//   'Cache': Request scheme 'chrome-extension' is unsupported
//   sw.js:125 Fetch API cannot load https://fonts.gstatic.com/… Refused to
//   connect because it violates the document's Content Security Policy
//   sw.js:136 Uncaught (in promise) Error: hors ligne
//
// AUCUNE DE CES REQUÊTES N'EST LA NÔTRE. L'application ne charge rien d'une
// autre origine — `default-src 'self'` le lui interdit, et la police comme les
// bibliothèques sont servies depuis ./vendor. Ce sont les requêtes d'une
// EXTENSION du navigateur, dans l'onglet ; le worker les interceptait, les
// redemandait, et fabriquait ainsi la violation qu'il signalait : le navigateur
// aurait classé la police en `font-src`, un `fetch()` depuis le worker en fait
// un `connect-src`.
//
// ON EXÉCUTE DONC LE VRAI `sw.js`, pas une relecture de son texte. Un test qui
// cherche « url.origin !== » dans le source ne dirait rien de ce que le worker
// FAIT, et c'est ce qu'on a promis de corriger. On lui fabrique un monde — un
// `self`, un `caches`, un `fetch` — et on le regarde répondre.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = fs.readFileSync(path.join(RACINE, 'sw.js'), 'utf8');

const ORIGINE = 'https://atoutmath.example';

/** Une requête, réduite à ce que le worker lui demande. */
class Req {
    constructor(url, init = {}) {
        this.url = String(url);
        this.method = init.method || 'GET';
        this.mode = init.mode || 'cors';
        this.headers = init.headers || {};
        this.cache = init.cache;
        this.credentials = init.credentials;
    }
}
class Rep {
    constructor(corps, init = {}) {
        this.ok = init.status === undefined ? true : init.status >= 200 && init.status < 300;
        this.status = init.status === undefined ? 200 : init.status;
        this.statusText = init.statusText || '';
        this.corps = corps;
        this.type = init.type || 'basic';
    }
    clone() { return new Rep(this.corps, { status: this.status, type: this.type }); }
}

/**
 * MONTER LE WORKER dans un monde de poche. `reseau` dit ce que répond le
 * réseau ; `bac` est le contenu du cache ; `putRate` fait échouer l'écriture,
 * pour vérifier qu'un cache qui refuse ne casse pas la réponse.
 */
function monter({ reseau = () => new Rep('ok'), bac = new Map(), putRate = false } = {}) {
    const journal = { puts: [], fetches: [], rejets: [] };
    const self = {
        location: { origin: ORIGINE },
        listeners: {},
        addEventListener(nom, fn) { (self.listeners[nom] ||= []).push(fn); },
        skipWaiting() {}, clients: { claim() {} }
    };
    // LE CACHE RÉSOUT LES ADRESSES RELATIVES, comme le vrai : le worker demande
    // `caches.match('./index.html')`, et c'est bien la page de notre origine
    // qu'il doit trouver. Un bac qui comparerait les chaînes telles quelles
    // aurait déclaré le repli hors ligne cassé alors qu'il marche.
    const clef = (req) => new URL(String(req.url || req), `${ORIGINE}/`).href;
    const caches = {
        open: async () => ({
            put: async (req, rep) => {
                if (putRate) throw new TypeError('put refusé');
                journal.puts.push(clef(req));
                bac.set(clef(req), rep);
            },
            addAll: async () => {}, keys: async () => []
        }),
        match: async (req) => bac.get(clef(req)) || undefined,
        keys: async () => [], delete: async () => true
    };
    const fetch = async (req) => {
        journal.fetches.push(req);
        const r = reseau(req);
        if (r instanceof Error) throw r;
        return r;
    };
    // eslint-disable-next-line no-new-func
    new Function('self', 'caches', 'fetch', 'Request', 'Response', 'URL', SOURCE)(
        self, caches, fetch, Req, Rep, URL);
    const surFetch = (self.listeners.fetch || [])[0];
    assert.ok(surFetch, 'sw.js n\'écoute plus l\'événement fetch');

    /** Rend `null` si le worker a laissé passer, sinon la promesse rendue. */
    const demander = (url, init) => {
        let rendue = null;
        const ev = { request: new Req(url, init), respondWith: (p) => { rendue = p; } };
        surFetch(ev);
        return rendue;
    };
    return { demander, journal, bac };
}

test('LE WORKER LAISSE PASSER CE QUI N\'EST PAS À NOUS', async () => {
    const { demander, journal } = monter();
    // Les trois cas exacts du journal de Rémy.
    assert.equal(demander('chrome-extension://abcdefg/injecte.js'), null,
        'une requête d\'extension est interceptée : c\'est le « scheme '
        + 'chrome-extension is unsupported » du cache');
    assert.equal(demander('https://fonts.gstatic.com/s/inter/v19/police.woff2'), null,
        'une police d\'une autre origine est redemandée par le worker : c\'est '
        + 'elle qui devient un connect-src et se fait refuser');
    assert.equal(demander('moz-extension://xyz/style.css'), null);
    assert.equal(demander('data:text/plain,bonjour'), null);
    // Et rien de tout cela n'a touché ni au réseau ni au cache.
    assert.deepEqual(journal.fetches, [], 'le worker a redemandé une requête étrangère');
    assert.deepEqual(journal.puts, [], 'le worker a tenté de mettre en cache une requête étrangère');
});

test('LE WORKER S\'OCCUPE BIEN DE NOS FICHIERS, ET PAS DE L\'API', async () => {
    const { demander, journal } = monter();
    // L'API porte des données de classe : périmées, elles sont pires qu'absentes.
    assert.equal(demander(`${ORIGINE}/api/sync.php?classe=3A`), null,
        'l\'API est servie depuis le cache');
    // Un module de l'application, lui, passe par le worker.
    const rendue = demander(`${ORIGINE}/js/core/activities/litteralSaisie.js?v=803`);
    assert.ok(rendue, 'le worker ne répond plus pour nos propres fichiers');
    const rep = await rendue;
    assert.equal(rep.ok, true);
    assert.equal(journal.fetches.length, 1);
    // REVALIDÉ, TOUJOURS : c'est ce qui garantit qu'un poste connecté a le code
    // du jour (voir le commentaire de sw.js).
    assert.equal(journal.fetches[0].cache, 'no-cache');
    assert.equal(journal.puts.length, 1, 'la copie en cache ne se fait plus');
});

test('HORS LIGNE : LE CACHE D\'ABORD, PUIS UNE RÉPONSE — JAMAIS UN REJET', async () => {
    const coupure = () => new Error('réseau coupé');
    // 1. Ce qui est en cache est resservi.
    const bac = new Map([[`${ORIGINE}/css/base.css?v=803`, new Rep('des styles')]]);
    const a = monter({ reseau: coupure, bac });
    assert.equal((await a.demander(`${ORIGINE}/css/base.css?v=803`)).corps, 'des styles');

    // 2. Une navigation retombe sur la page d'accueil mise en cache.
    const bac2 = new Map([[`${ORIGINE}/index.html`, new Rep('la page')]]);
    const b = monter({ reseau: coupure, bac: bac2 });
    const page = await b.demander(`${ORIGINE}/eleve`, { mode: 'navigate' });
    assert.equal(page.corps, 'la page');

    // 3. RIEN NULLE PART : une réponse 504, pas une promesse rejetée. C'est la
    //    ligne « Uncaught (in promise) Error: hors ligne », douze fois dans le
    //    journal de Rémy. Le navigateur signalait déjà l'erreur réseau côté
    //    page ; le rejet n'ajoutait que du rouge.
    const c = monter({ reseau: coupure });
    const vide = await c.demander(`${ORIGINE}/js/introuvable.js`);
    assert.equal(vide.status, 504);
    assert.equal(vide.statusText, 'hors ligne');
});

test('UN CACHE QUI REFUSE D\'ÉCRIRE NE CASSE PAS LA RÉPONSE', async () => {
    // « Cache.put() encountered a network error », vu lui aussi. Rater la
    // COPIE n'est pas rater la réponse : elle est déjà rendue.
    const rejets = [];
    const surRejet = (e) => rejets.push(e);
    process.on('unhandledRejection', surRejet);
    const { demander } = monter({ putRate: true });
    const rep = await demander(`${ORIGINE}/js/app.js?v=803`);
    assert.equal(rep.ok, true, 'la réponse se perd quand le cache refuse');
    await new Promise(r => setTimeout(r, 30));
    process.off('unhandledRejection', surRejet);
    assert.deepEqual(rejets, [], 'une écriture de cache ratée remonte en promesse non traitée');
});
