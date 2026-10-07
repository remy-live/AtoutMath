// LE SITE MESURÉ AVEC LES EN-TÊTES QU'IL AURA VRAIMENT.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture à l'appui : « pourquoi j'ai cela ». Les trois volets de
// l'Atelier — le jeu, l'aperçu papier, le robot — affichaient
// « atout-math.fr refused to connect ». Et rien, dans ce dépôt, n'aurait pu le
// dire.
//
// ── LE TROU, ET IL EST SOUS TOUTES LES AUTRES MESURES ──────────────────────
//
// La politique de sécurité du site est écrite dans `.htaccess`, donc appliquée
// par APACHE, chez l'hébergeur. Le serveur d'essai, lui, est le serveur intégré
// de PHP (`php -S`), QUI N'APPLIQUE PAS `.htaccess`. Toutes les sondes du dépôt
// — y compris celle de bout en bout — tournaient donc sur un site SANS ses
// en-têtes : elles mesuraient quelque chose qui n'existe nulle part.
//
// `frame-ancestors 'none'` interdisait tout encadrement, Y COMPRIS PAR LE SITE
// LUI-MÊME. Quatre fonctions s'encadrent elles-mêmes — l'Atelier (trois
// cadres), le Contrôle qui mesure les débordements sur trois écrans, l'atelier
// de géométrie — et les quatre étaient muettes en ligne depuis le premier jour
// où la politique a été écrite. En essai, tout marchait.
//
// ── DEUX FAUSSES PISTES AVANT LA BONNE, ET ELLES VALENT D'ÊTRE ÉCRITES ─────
//
//   1. POSER L'EN-TÊTE DEPUIS LA SONDE (`page.route` + `route.fulfill`). La
//      mesure de contrôle disait « en-tête bien posé », les trois cadres
//      chargeaient — et ils chargeaient AUSSI avec `frame-ancestors 'none'`.
//      Chromium n'applique pas `frame-ancestors` à une réponse fabriquée par
//      l'interception. Une sonde verte qui ne mesure rien.
//   2. UN ROUTEUR QUI REND `false` pour laisser le serveur intégré servir le
//      fichier : il JETTE les en-têtes que le routeur a posés (mesuré).
//
// LA BONNE : le serveur d'essai sert lui-même les documents HTML avec la
// politique lue dans `.htaccess` (`tools/routeurEssai.php`). Toutes les sondes
// du dépôt en profitent, pas seulement celle-ci — c'était le vrai trou.
//
// Celle-ci ne fait donc plus que deux choses : vérifier que l'en-tête ARRIVE,
// puis ouvrir l'Atelier et regarder si ses trois cadres ont chargé.
//
//   node tools/sousLaVraiePolitique.mjs

import fs from 'node:fs';
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

/** La politique du site, lue là où elle part en production. */
function politiqueDuSite() {
    const h = fs.readFileSync(new URL('../.htaccess', import.meta.url), 'utf8');
    const m = h.match(/Header always set Content-Security-Policy "([^"]+)"/);
    if (!m) throw new Error('aucune politique dans .htaccess — a-t-on lancé tools/csp.mjs ?');
    return m[1];
}

const CSP = politiqueDuSite();
const s = await ouvrirSonde({ largeur: 1400, hauteur: 980 });
let manques = 0;
const dire = (ok, quoi, detail = '') => {
    if (!ok) manques++;
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m'}${quoi}`
        + (detail ? `  — ${detail}` : ''));
};

console.log('\nLE SITE SOUS SA VRAIE POLITIQUE');
console.log('─'.repeat(78));
console.log(`  politique attendue (.htaccess) : ${CSP.length} caractères`);
console.log(`  frame-ancestors = ${(CSP.match(/frame-ancestors ([^;]+)/) || [])[1] || '(absent)'}`);

await s.identifier();
const adresse = `http://127.0.0.1:${s.port}/index.html?auteur=1`;
await s.page.goto(adresse);

// ── ON ÉCARTE LE TRAVAILLEUR DE SERVICE, ET C'EST UNE CORRECTION PAYÉE ────
//
// Première exécution : les trois cadres chargeaient, et la mesure de contrôle
// disait « AUCUN EN-TÊTE REÇU ». Les deux ensemble ne veulent dire qu'une
// chose : la politique n'était posée sur rien. Le travailleur de service sert
// `index.html` DEPUIS SON CACHE, et une requête qu'il satisfait ne passe pas
// par l'interception — donc pas par l'en-tête qu'on ajoute.
//
// SANS CETTE MESURE DE CONTRÔLE, la sonde aurait annoncé trois cadres verts
// sous une politique qu'elle n'avait jamais appliquée : exactement le genre
// d'assurance qui n'existe pas et qu'on paie trois jours plus tard.
await s.page.evaluate(async () => {
    if (navigator.serviceWorker) {
        const r = await navigator.serviceWorker.getRegistrations();
        await Promise.all(r.map(x => x.unregister()));
    }
    if (window.caches) {
        const c = await caches.keys();
        await Promise.all(c.map(x => caches.delete(x)));
    }
});
await s.page.goto(adresse);
await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });

// On vérifie d'abord que l'en-tête ARRIVE VRAIMENT : une sonde qui croit poser
// une politique et ne la pose pas mesure le site nu, c'est-à-dire exactement
// l'erreur qu'elle est là pour fermer.
const posee = await s.page.evaluate(async () => {
    const r = await fetch(location.href, { cache: 'no-store' });
    return r.headers.get('content-security-policy') || '';
});
dire(posee.includes('frame-ancestors'),
    'la politique est bien posée sur le document — la sonde mesure le vrai site',
    posee ? `${posee.length} caractères reçus` : 'AUCUN EN-TÊTE REÇU');

if (await s.page.evaluate(() =>
    document.getElementById('debug-toolbar').classList.contains('dbg--folded'))) {
    await s.page.click('#db-fold');
    await dormir(250);
}

// ── L'ATELIER, SES TROIS CADRES ────────────────────────────────────────────

await s.doitExister('#db-atelier', 'le bouton de l\'Atelier');
await s.page.click('#db-atelier');
await dormir(2500);
await s.doitExister('#atl-jeu', 'le cadre du jeu');
await s.doitExister('#atl-fiche', 'le cadre de l\'aperçu papier');
await s.doitExister('#atl-robot', 'le cadre du robot');

// CE QU'ON MESURE : que le cadre ait CHARGÉ quelque chose. Un cadre refusé
// garde son document vide (« about:blank ») et affiche le message du
// navigateur — « atout-math.fr refused to connect » —, qui n'est PAS dans le
// document : on ne peut pas le lire, seulement constater le vide.
const cadres = await s.page.evaluate(() => ['atl-jeu', 'atl-fiche', 'atl-robot'].map(id => {
    const f = document.getElementById(id);
    let dedans = null;
    try { dedans = f.contentDocument; } catch (e) { dedans = null; }
    return {
        id,
        src: (f.getAttribute('src') || '').slice(0, 40),
        adresse: (() => { try { return f.contentWindow.location.href.slice(0, 40); } catch (e) { return 'refusé'; } })(),
        noeuds: dedans ? dedans.body ? dedans.body.querySelectorAll('*').length : 0 : -1
    };
}));
cadres.forEach(c => dire(c.noeuds > 3,
    `le cadre « ${c.id} » a chargé la page`,
    c.noeuds < 0 ? 'document inaccessible — l\'encadrement est REFUSÉ'
        : `${c.noeuds} nœud(s) · ${c.adresse}`));

await s.photo('#atelier', 'tools/tmp/atelier-sous-politique.png');

console.log('─'.repeat(78));
dire(s.fenetresNatives.length === 0, 'aucune fenêtre native', s.fenetresNatives.join(' | '));
// LES REFUS D'ENCADREMENT NE SONT PAS DES ERREURS DE PAGE : le navigateur les
// écrit dans sa console sans que la page le sache. C'est précisément pourquoi
// il a fallu une capture de Rémy pour l'apprendre.
console.log(`  (pour information : ${s.erreurs.length} erreur(s) de page)`);

console.log(manques
    ? `\x1b[31m${manques} mesure(s) manquent — le site ne ferait pas ça chez Rémy.\x1b[0m`
    : '\x1b[32mSOUS SES VRAIS EN-TÊTES, LE SITE FAIT CE QU\'IL FAIT EN ESSAI.\x1b[0m');

await s.fermer();
process.exit(manques ? 1 : 0);
