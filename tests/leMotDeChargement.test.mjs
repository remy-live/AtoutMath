// CE QU'ON VOIT PENDANT QUE ÇA CHARGE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// MESURÉ sur un téléphone, cache vide : premier pixel peint à 100 ms, mais
// `document.body.innerText` encore VIDE à 200 ms ET à 600 ms. Premier texte
// lisible entre 600 et 1 200 ms, application prête à 1 062 ms. Coût : 308
// requêtes, 241 fichiers JavaScript, 4,8 Mo — et c'est mesuré EN LOCAL.
//
// En salle informatique, sur le Wi-Fi d'un collège partagé par vingt-cinq
// postes qui démarrent à la même minute, 308 requêtes ne coûtent pas une
// seconde. L'élève de 6ᵉ croit que « ça ne marche pas », il recharge, et les
// 308 requêtes recommencent.
//
// APRÈS, mesuré au même endroit : « AtoutMath se charge… » lisible dès 200 ms.
//
// CE BLOC NE REND PAS L'APPLICATION PLUS RAPIDE, et il ne faut pas le croire :
// il rend l'attente compréhensible. Le vrai chantier — découper les 241
// modules — reste entier.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('IL EST DANS LA PAGE, AVANT TOUT SCRIPT DE MODULE', () => {
    const i = HTML.indexOf('id="chargement"');
    assert.ok(i > 0, 'aucun écran de chargement');
    // S'il arrivait après le premier `<script type="module">`, il ne servirait
    // à rien : c'est justement ce script-là qu'on attend.
    const premierModule = HTML.indexOf('<script type="module"');
    assert.ok(premierModule === -1 || i < premierModule,
        'l\'écran de chargement arrive après le premier module');
});

test('SON STYLE EST DANS LA BALISE, PAS DANS UNE FEUILLE', () => {
    // UNE FEUILLE EXTERNE EST UNE REQUÊTE DE PLUS — et c'est précisément celle
    // qui n'est pas encore arrivée au moment où l'on a besoin d'afficher ceci.
    // Un écran de chargement qui attend son CSS ne sert à rien.
    const bloc = HTML.slice(HTML.indexOf('<div id="chargement"'),
        HTML.indexOf('</script>', HTML.indexOf('id="chargement"')));
    assert.match(bloc, /style="position:fixed/);
    assert.ok(!/<link[^>]*chargement/.test(HTML));
    // Et il dit quelque chose : un rond qui tourne sans phrase ne distingue
    // pas « ça charge » de « c'est cassé ».
    assert.match(bloc, /AtoutMath se charge/);
});

test('IL SE RETIRE DU DOCUMENT, IL NE DEVIENT PAS TRANSPARENT', () => {
    // Un voile invisible reste un voile : il intercepte les clics, et
    // l'application paraîtrait morte au lieu de paraître lente.
    const bloc = HTML.slice(HTML.indexOf('id="chargement"'));
    assert.match(bloc, /bloc\.remove\(\)/);
    assert.match(bloc, /pointerEvents = 'none'/);
    assert.match(bloc, /addEventListener\('atoutmath_pret'/);
});

test('ET IL A UN FILET — sinon une panne devient un écran éternel', () => {
    // Si un module tombe, `atoutmath_pret` ne vient jamais. Rester devant un
    // écran de chargement est PIRE que l'écran blanc qu'on répare, parce que
    // celui-là ment : il promet que ça arrive.
    const bloc = HTML.slice(HTML.indexOf('id="chargement"'));
    const m = /setTimeout\(retirer, (\d+)\)/.exec(bloc);
    assert.ok(m, 'aucun filet : une panne laisse l\'écran de chargement à vie');
    const delai = Number(m[1]);
    assert.ok(delai >= 5000 && delai <= 30000,
        `le filet tombe à ${delai} ms — trop tôt il clignote, trop tard il ment`);
});

test('LE DRAPEAU QU\'IL ATTEND EXISTE VRAIMENT', () => {
    // `atoutmath_pret` est émis par `js/app.js`. Si on le renommait là-bas,
    // l'écran de chargement ne partirait plus qu'au bout du filet — quinze
    // secondes de gris pour rien, sans la moindre erreur nulle part.
    const APP = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
    assert.match(APP, /new CustomEvent\('atoutmath_pret'\)/);
});

test('ET IL NE PARLE PAS PAR-DESSUS L\'APPLICATION', () => {
    // `aria-live="polite"` et non `assertive` : un lecteur d'écran doit dire
    // « ça charge » sans couper ce qu'il est en train de lire, et surtout ne
    // pas répéter l'annonce quand l'application prend la main.
    const bloc = HTML.slice(HTML.indexOf('<div id="chargement"'), HTML.indexOf('id="chargement-barre"'));
    assert.match(bloc, /aria-live="polite"/);
    assert.match(bloc, /role="status"/);
    // Et l'animation se tait pour qui la refuse.
    assert.match(HTML.slice(HTML.indexOf('id="chargement"')),
        /prefers-reduced-motion: reduce/);
});
