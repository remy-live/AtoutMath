// LE PAQUET HORS LIGNE : UNE REQUÊTE AU LIEU DE SIX CENTS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « est ce que le logiciel serait capable de produire soit un apk soit
// un zip que l tablette pourrait télécharger quand elle est en ligne ? » Puis,
// la recommandation faite : « Oui je suis tes recommandations ».
//
// MESURÉ sur le chemin de la maîtresse (`node tools/sondePreparation.mjs`),
// une tablette neuve qui ouvre `?preparer` :
//
//                        sans le paquet      avec
//     requêtes servies        599             38
//     fichiers en mémoire     584            686
//     modules de jeu           91             91
//     durée                     5 s            6 s
//
// Et des deux côtés, réseau coupé : le Tasuko tourne, 0 erreur, 0 fenêtre
// native. Le gain est en allers-retours, non en octets — `mod_deflate`
// compresse déjà le JavaScript servi un par un.
//
// ── CE QUE CETTE ÉPREUVE GARDE ─────────────────────────────────────────────
//
// Le LECTEUR de ZIP, contre un ZIP fabriqué ici même — c'est la seule partie
// qui peut se tromper en silence. Et les deux décisions qui ne se voient pas :
// le type annoncé à chaque fichier, et le fait que le paquet ne se recopie pas
// la liste du NOYAU.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deflateRawSync, crc32 } from 'node:zlib';
import { sansCommentaires } from './helpers.mjs';
import { lireLeZip, gonfler, typeDuFichier, leNavigateurSaitLire }
    from '../js/ui/paquetHorsLigne.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

/**
 * UN VRAI ZIP, FABRIQUÉ ICI, AU MÊME FORMAT QUE CELUI DE `api/horslige.php`.
 *
 * ON NE SE CONTENTE PAS D'UN ZIP TOUT FAIT POSÉ DANS `tests/` : un fichier
 * binaire committé ne dit pas comment il est construit, et le jour où le
 * lecteur se trompe d'un octet, personne ne sait si c'est le lecteur ou le
 * fichier. Ici, les deux côtés sont lisibles.
 */
function fabriquerUnZip(fichiers) {
    const bouts = [];
    let central = Buffer.alloc(0);
    let pos = 0, combien = 0;
    for (const [nom, contenu] of fichiers) {
        const brut = Buffer.from(contenu);
        const comprime = deflateRawSync(brut);
        const stocke = comprime.length >= brut.length;
        const corps = stocke ? brut : comprime;
        const methode = stocke ? 0 : 8;
        const som = crc32(brut);
        const n = Buffer.from(nom, 'utf8');
        const local = Buffer.alloc(30);
        local.write('PK\x03\x04', 0, 'binary');
        local.writeUInt16LE(20, 4); local.writeUInt16LE(0, 6);
        local.writeUInt16LE(methode, 8);
        local.writeUInt32LE(som, 14);
        local.writeUInt32LE(corps.length, 18);
        local.writeUInt32LE(brut.length, 22);
        local.writeUInt16LE(n.length, 26); local.writeUInt16LE(0, 28);
        bouts.push(local, n, corps);
        const c = Buffer.alloc(46);
        c.write('PK\x01\x02', 0, 'binary');
        c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6);
        c.writeUInt16LE(methode, 10);
        c.writeUInt32LE(som, 16);
        c.writeUInt32LE(corps.length, 20);
        c.writeUInt32LE(brut.length, 24);
        c.writeUInt16LE(n.length, 28);
        c.writeUInt32LE(pos, 42);
        central = Buffer.concat([central, c, n]);
        pos += local.length + n.length + corps.length;
        combien++;
    }
    const fin = Buffer.alloc(22);
    fin.write('PK\x05\x06', 0, 'binary');
    fin.writeUInt16LE(combien, 8); fin.writeUInt16LE(combien, 10);
    fin.writeUInt32LE(central.length, 12);
    fin.writeUInt32LE(pos, 16);
    const tout = Buffer.concat([...bouts, central, fin]);
    return tout.buffer.slice(tout.byteOffset, tout.byteOffset + tout.byteLength);
}

test('LE LECTEUR REND EXACTEMENT CE QU\'ON A MIS DANS LE ZIP', async () => {
    // UN GROS COMPRESSIBLE, UN PETIT INCOMPRESSIBLE, ET DES ACCENTS. Les trois
    // cas du vrai paquet : un module de 24 Ko, une police déjà compressée que
    // `deflate` fait GROSSIR (donc stockée telle quelle, méthode 0), et des
    // noms et des contenus en français.
    const gros = 'export const n = 1;\n'.repeat(800);
    const zip = fabriquerUnZip([
        ['js/games/tasuko.js', gros],
        ['js/core/état.js', 'const mot = "préparée à l\'avance";'],
        ['vendor/outfit/a.woff2', 'wOF2\u0000\u0001']
    ]);
    const entrees = lireLeZip(zip);
    assert.equal(entrees.length, 3);
    const parNom = Object.fromEntries(entrees.map(e => [e.nom, e]));
    const texte = async (nom) =>
        new TextDecoder().decode(await gonfler(parNom[nom]));
    assert.equal(await texte('js/games/tasuko.js'), gros);
    assert.equal(await texte('js/core/état.js'), 'const mot = "préparée à l\'avance";');
    // LE PETIT EST STOCKÉ, PAS COMPRESSÉ, et le lecteur doit savoir les deux :
    // un lecteur qui ne gère que `deflate` rend du vide sur les six polices et
    // les trois images, sans erreur.
    assert.equal(parNom['vendor/outfit/a.woff2'].methode, 0);
    assert.equal(await texte('vendor/outfit/a.woff2'), 'wOF2\u0000\u0001');
});

test('UN FICHIER QUI N\'EST PAS UN ZIP SE DIT, IL NE SE DEVINE PAS', () => {
    // LE CAS RÉEL : un hébergement sans PHP rend la SOURCE du script, avec un
    // code 200. Sans un message clair, on part chercher le défaut dans le
    // lecteur alors qu'il est dans l'hébergement.
    const pasUnZip = new TextEncoder().encode('<?php // le serveur n\'exécute rien');
    assert.throws(() => lireLeZip(pasUnZip.buffer), /n'est pas un ZIP/);
});

test('CHAQUE FICHIER EST POSÉ AVEC SON TYPE — sinon rien ne se charge', () => {
    // LE PIÈGE QUI NE SE VOIT QU'HORS LIGNE. Un `.js` rendu sans type donne
    // « Expected a JavaScript module script but the server responded with a
    // MIME type of "" » — et cela n'arrive que sur la tablette d'une classe,
    // le jour où il n'y a plus de réseau pour rattraper.
    assert.match(typeDuFichier('js/games/tasuko.js'), /javascript/);
    assert.match(typeDuFichier('css/base.css'), /text\/css/);
    assert.match(typeDuFichier('vendor/outfit/a.woff2'), /font\/woff2/);
    assert.match(typeDuFichier('icones/icon-192.png'), /image\/png/);
    assert.match(typeDuFichier('js/data/x.JS'), /javascript/, 'l\'extension peut crier');
    assert.equal(typeDuFichier('vendor/jsqr/LICENSE'), 'application/octet-stream');
    // ET LE MODULE L'EMPLOIE VRAIMENT : un `typeDuFichier` juste mais jamais
    // appelé ne garde rien.
    const M = sansCommentaires(lire('js/ui/paquetHorsLigne.js'));
    assert.match(M, /'Content-Type': typeDuFichier\(entree\.nom\)/);
});

test('LE PAQUET EST DEMANDÉ AVANT QUE L\'APPLICATION NE SE CHARGE', () => {
    // SANS CET ORDRE, LE PAQUET COÛTE AU LIEU DE GAGNER, et c'est mesuré :
    // monter la page de préparation prend 520 requêtes à elle seule, parce que
    // `app.js` importe le catalogue et le registre tout en haut. Le paquet
    // arrivait ensuite et renvoyait les mêmes fichiers — chez Rémy, où Apache
    // compresse déjà le JavaScript, c'était des octets en plus pour rien.
    // ON CHERCHE L'IMPORT, PAS LE NOM. `epreuveTombe` a dit « CETTE ÉPREUVE NE
    // GARDE RIEN » au premier jet : le commentaire qui surplombe ces lignes
    // dans `index.html` cite `js/ui/amorcePreparation.js`, et l'épreuve
    // trouvait ce nom-là — ma propre prose — à la place du chargement.
    const H = lire('index.html');
    const amorce = H.indexOf("import('./js/ui/amorcePreparation.js')");
    const appli = H.indexOf("import('./js/app.js')");
    assert.ok(amorce > 0, 'index.html ne charge plus l\'amorce de préparation');
    assert.ok(appli > 0, 'index.html ne charge plus l\'application par import()');
    assert.ok(amorce < appli,
        'l\'application est chargée AVANT le paquet : les 520 fichiers du '
        + 'catalogue repartiront au réseau, et le paquet les renverra');
    // ET L'ANCIENNE BALISE N'EST PLUS LÀ : elle chargerait `app.js` en
    // parallèle de l'amorce, donc avant elle.
    assert.ok(!/<script type="module" src="js\/app\.js">/.test(H),
        'js/app.js est encore chargé par une balise `src` : elle part tout de '
        + 'suite, et l\'amorce ne sert plus à rien');
});

test('L\'APPLICATION DÉMARRE MÊME SI `DOMContentLoaded` EST DÉJÀ PASSÉ', () => {
    // LE DÉFAUT QUE CE GARDE EXISTE POUR EMPÊCHER, et il a eu lieu : en
    // passant d'une balise `<script type="module" src>` à un `import()`
    // dynamique, `app.js` s'est mis à poser son écouteur APRÈS l'événement.
    //
    // Le symptôme ne désigne pas la cause : `__atoutmathDemarre` à `true` —
    // donc le module s'est bien chargé — et `__atoutmathPret` jamais posé. Une
    // page qui a tout téléchargé et qui ne monte rien, sans une ligne rouge.
    const A = sansCommentaires(lire('js/app.js'));
    assert.match(A, /document\.readyState === 'loading'/,
        'app.js parie de nouveau sur `DOMContentLoaded` : chargé par un '
        + 'import() dynamique, il arrivera après l\'événement et ne montera rien');
    assert.match(A, /demarrerLApplication\(\);/);
});

test('ON NE POSE RIEN SANS SAVOIR SI LE NAVIGATEUR SAIT LIRE', () => {
    // MESURÉ AVANT D'ÉCRIRE UNE LIGNE, dans Chromium : `DecompressionStream`
    // est une fonction, en deflate-raw, gzip et deflate. Mais une tablette
    // ancienne ne l'aura pas, et la préparation doit alors retomber sur les
    // six cents requêtes plutôt que de jeter.
    assert.equal(typeof leNavigateurSaitLire(), 'boolean');
    const P = sansCommentaires(lire('js/ui/amorcePreparation.js'));
    assert.match(P, /if \(!leNavigateurSaitLire\(\)\) return null;/,
        'sans ce garde, un navigateur sans DecompressionStream perd la '
        + 'préparation au lieu de la faire autrement');
    assert.match(P, /catch \(e\) \{/,
        'un paquet absent doit faire retomber sur l\'autre chemin, pas jeter');
});

test('LE PAQUET NE RECOPIE PAS LA LISTE DU NOYAU', () => {
    // UNE LISTE RECOPIÉE EST JUSTE LE JOUR OÙ ON L'ÉCRIT. Si `horslige.php`
    // portait sa propre liste, le premier fichier ajouté au NOYAU se
    // retrouverait DEUX FOIS dans le cache — une fois sous `?v=NNN` par
    // `install`, une fois nu par le paquet — et personne ne le verrait.
    const PHP = lire('api/horslige.php');
    assert.match(PHP, /file_get_contents\(RACINE \. '\/sw\.js'\)/,
        'le paquet ne lit plus le NOYAU dans sw.js : sa liste va diverger');
    assert.match(PHP, /const NOYAU = \\\[\(\.\*\?\)\\\];/,
        'le motif qui extrait le NOYAU a changé de forme');
    // ET IL S'ÉCRIT À CÔTÉ AVANT D'ÊTRE RENOMMÉ : vingt-cinq tablettes
    // demandent le paquet dans la même minute, et deux écritures dans le même
    // fichier donnent un ZIP à moitié écrit, servi comme s'il était entier.
    assert.match(PHP, /rename\(\$temporaire, \$paquet\)/,
        'deux tablettes simultanées écriraient dans le même fichier');
});

test('LA PRÉPARATION DEMANDE UNE MÉMOIRE QUE LE SYSTÈME NE VIDE PAS', () => {
    // C'EST LA PARADE AU SEUL VRAI AVANTAGE D'UN APK, et elle tient en un
    // appel : les fichiers d'une application installée ne s'effacent pas quand
    // la place manque, un cache de navigateur si — sur une tablette d'école
    // pleine de photos, un mardi matin.
    //
    // MESURÉ dans la sonde : `persisted()` rend `false` dans un navigateur
    // sans engagement ni installation. C'est pourquoi la préparation demande
    // l'installation EN PREMIER : Chrome accorde le statut durable d'autant
    // plus volontiers que l'application est sur l'écran d'accueil.
    const M = sansCommentaires(lire('js/ui/paquetHorsLigne.js'));
    assert.match(M, /navigator\.storage\.persist\(\)/);
    const P = sansCommentaires(lire('js/ui/preparerTablette.js'));
    assert.match(P, /await demanderUneMemoireDurable\(\)/,
        'la préparation ne demande plus la mémoire durable : le cache peut '
        + 'être vidé par le système sans que personne ne l\'apprenne');
});
