// CE QU'ON LAISSE LIRE AUX MOTEURS DE RECHERCHE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 13 novembre : « comment soumettre http://atout-math.fr à google ? »
//
// Il n'y a plus de formulaire : on prouve qu'on possède le domaine, on dépose
// un plan du site, on demande l'indexation. La marche à suivre est dans
// `docs/referencement.md` ; ces épreuves gardent la moitié qui vit dans le
// dépôt.
//
// ── LA LIGNE QUI COMPTE VRAIMENT EST `?code=` ─────────────────────────────
//
// C'est le lien qu'un élève reçoit pour rejoindre sa classe. Un robot qui
// l'indexerait mettrait le code d'une classe RÉELLE dans un moteur de
// recherche public — c'est-à-dire la seule chose de ce dépôt qu'on ne peut pas
// rattraper après coup. Le jour où quelqu'un réécrira `robots.txt` pour y
// ajouter une ligne, cette épreuve est ce qui l'empêchera d'emporter celle-là.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const SITE = 'https://atout-math.fr';

test('`robots.txt` TIENT LE LIEN DE CLASSE À L\'ÉCART DES MOTEURS', () => {
    const r = lire('robots.txt');
    assert.match(r, /^Disallow: \/\*\?code=$/m,
        'le lien qui sert à rejoindre une classe ne doit pas être indexable');
    // Et l'API, les outils, les dépôts : ce ne sont pas des pages.
    for (const quoi of ['/api/', '/tools/', '/outils/', '/imports/']) {
        assert.ok(r.includes(`Disallow: ${quoi}`), `${quoi} n’est pas écarté`);
    }
    // ON NE FERME PAS LE SITE PAR MÉGARDE. Un `Disallow: /` tout seul — une
    // ligne de plus, un jour de fatigue — rendrait le site invisible sans rien
    // casser nulle part, et personne ne s'en apercevrait avant des mois.
    assert.ok(!/^Disallow: \/$/m.test(r), 'cette ligne interdirait TOUT le site');
    assert.match(r, /^Allow: \/$/m);
    assert.ok(r.includes(`Sitemap: ${SITE}/sitemap.xml`), 'le plan du site n’est pas annoncé');
});

test('LE PLAN DU SITE NE PROMET QUE DES ADRESSES QUI EXISTENT', () => {
    const s = lire('sitemap.xml');
    const urls = [...s.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
    assert.ok(urls.length >= 1, 'le plan du site est vide');
    // UNE APPLICATION D'UNE SEULE PAGE N'A QU'UNE ADRESSE CÔTÉ SERVEUR : tout
    // le reste se construit en JavaScript derrière elle. Promettre
    // « /exercices » ou « /sixieme » remonterait des erreurs dans la Search
    // Console et ferait perdre son temps au robot.
    for (const u of urls) {
        assert.ok(u.startsWith(`${SITE}/`), `« ${u} » ne part pas du site`);
        const apres = u.slice(SITE.length + 1);
        assert.ok(apres === '' || apres.startsWith('?'),
            `« ${u} » promet un chemin que le serveur ne sert pas`);
    }
    // Et le plan ne contredit pas `robots.txt` : une adresse annoncée puis
    // interdite est une contradiction que la Search Console signale.
    assert.ok(!urls.some(u => u.includes('?code=')), 'le plan annonce un lien de classe');
});

test('LA PAGE DIT CE QU\'ELLE EST, ET À QUELLE ADRESSE ELLE COMPTE', () => {
    const H = lire('index.html');
    const desc = /<meta name="description" content="([^"]+)">/.exec(H);
    assert.ok(desc, 'sans description, Google compose un résumé avec le portail '
        + 'de connexion : « Se connecter · J’ai un code »');
    // LA MÊME PHRASE QUE LE MANIFESTE, mot pour mot. Deux endroits qui
    // décrivent la même chose doivent la décrire pareil, sinon l'un des deux
    // dérive et personne ne s'en aperçoit.
    const manifeste = JSON.parse(lire('manifest.webmanifest'));
    assert.equal(desc[1], manifeste.description,
        'la description de la page et celle du manifeste ont divergé');
    // LE CANONIQUE EST ABSOLU ET EN HTTPS : le site répond aux deux adresses,
    // et sans cette ligne Google peut les indexer comme deux sites, qui se
    // partagent alors leur réputation au lieu de l'additionner.
    assert.match(H, new RegExp(`<link rel="canonical" href="${SITE}/">`),
        'le lien canonique manque ou n’est pas l’adresse en HTTPS');
    // ET LA CARTE QU'ON VOIT EN COLLANT LE LIEN. C'est par là que ce logiciel
    // se transmettra entre collègues, bien plus que par une recherche.
    for (const quoi of ['og:title', 'og:description', 'og:url', 'og:image']) {
        assert.ok(H.includes(`property="${quoi}"`), `${quoi} manque`);
    }
});
