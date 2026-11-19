// LE BAC À SABLE PYTHON — ce qui doit rester vrai pour qu'on ose l'exécuter.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 19 novembre : « et surtout attention que le script ne permet pas
// d'intrusion ».
//
// La vraie mesure est une sonde d'attaque — `tools/intrusionDuBac.mjs` pousse
// chaque porte dans un vrai navigateur, et c'est elle qui a trouvé que la
// première version lisait **4915 éléments de la page du professeur** et les
// clés `atoutmath-prof`, `atoutmath-porte`. Elle coûte une minute.
//
// CE FICHIER-CI EST LE FILET BON MARCHÉ, celui qui tourne quatre fois par
// séance dans `npm test`. Il ne mesure pas le cloisonnement : il garde les
// quatre décisions SANS LESQUELLES le cloisonnement n'existe plus, et dont
// chacune peut être défaite par une ligne distraite.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sansCommentaires } from './helpers.mjs';

const lire = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

/** La politique que `tools/csp.mjs` écrit pour la seule page qui évalue. */
const politiqueDuBac = () => {
    const ht = lire('.htaccess');
    const bloc = (ht.split('<Files "bac-python.html">')[1] || '').split('</Files>')[0];
    const m = /Content-Security-Policy "([^"]+)"/.exec(bloc);
    return m ? m[1] : '';
};

test('LA PAGE DU BAC EST CLOISONNÉE PAR SA POLITIQUE', () => {
    const csp = politiqueDuBac();
    assert.ok(csp, 'aucune politique pour `bac-python.html` dans `.htaccess` — '
        + 'relancer `node tools/csp.mjs --ecrire`');
    // ── POURQUOI DANS L'EN-TÊTE ET NON SUR LA BALISE `iframe` ────────────
    //
    // `sandbox="allow-scripts"` sur la balise cloisonne aussi bien — MAIS une
    // navigation vers un document à origine opaque n'est pas servie par le
    // service worker. Mesuré (`tools/pythonHorsLigne.mjs`) : hors ligne, zéro
    // cadre chargé, bouton « Lancer » mort. Rémy travaille dans un collège où
    // le réseau tombe.
    assert.match(csp, /sandbox allow-scripts/,
        'le bac à sable n’est plus cloisonné : il peut lire la page du professeur');
    // `allow-same-origin` rendrait le cloisonnement décoratif : le document
    // retrouverait notre origine, donc notre DOM et notre stockage.
    assert.ok(!csp.includes('allow-same-origin'),
        '`allow-same-origin` annule tout le cloisonnement');
    assert.match(csp, /frame-ancestors 'self'/,
        'sans cela, n’importe quel site peut encadrer le bac et s’en servir '
        + 'comme d’un évaluateur');
    assert.match(csp, /connect-src 'none'/,
        'le programme d’un élève ne doit pas pouvoir parler au réseau');
    assert.match(csp, /default-src 'none'/);
});

test('ET ELLE EST LA SEULE À AVOIR LE DROIT D’ÉVALUER', () => {
    const ht = lire('.htaccess');
    // TOUTES les politiques du fichier, moins celle du bac : il reste la
    // générale. On ne coupe pas au premier `<Files` — `.htaccess` en contient
    // d'autres, pour la compression et les en-têtes de cache.
    const toutes = [...ht.matchAll(/Content-Security-Policy "([^"]+)"/g)].map((x) => x[1]);
    const generales = toutes.filter((c) => c !== politiqueDuBac());
    assert.equal(generales.length, 1,
        `${generales.length} politique(s) générale(s) au lieu d’une`);
    const m = [null, generales[0]];
    // C'EST LA MOITIÉ DE L'INTÉRÊT DE TOUTE L'OPÉRATION. Une page à part a été
    // fabriquée précisément pour ne pas écrire `'unsafe-eval'` ici : en
    // septembre 2026, le PRÉNOM d'un élève s'exécutait chez le professeur.
    assert.ok(!m[1].includes("'unsafe-eval'"),
        'l’application a retrouvé le droit d’évaluer — c’est exactement la '
        + 'faiblesse que le bac à sable existe pour éviter');
    assert.ok(!m[1].includes('sandbox'),
        'la politique générale ne doit pas être cloisonnée');
    assert.match(politiqueDuBac(), /'unsafe-eval'/,
        'le bac, lui, en a besoin : Skulpt compile le Python en JavaScript');
});

test('LA PAGE DU BAC NE DEMANDE AUCUN FICHIER', () => {
    // ── CE QUE CETTE ÉPREUVE GARDE ───────────────────────────────────────
    //
    // Un document à origine opaque n'est pas un « client » du service worker :
    // ses SOUS-RESSOURCES ne sont pas servies depuis le cache. Mesuré : le
    // document arrivait hors ligne, `Sk` restait absent, « Lancer » était mort.
    //
    // La page ne charge donc rien : son script est écrit dedans, et Skulpt lui
    // est tendu en texte par l'application — qui, elle, passe par le worker.
    // Ajouter un `<script src=…>` ici casserait la salle sans réseau SANS RIEN
    // casser en ligne, c'est-à-dire sans qu'aucune mesure ordinaire le voie.
    const H = lire('bac-python.html');
    const externes = [...H.matchAll(/<(?:script|link|img|iframe)[^>]+(?:src|href)="([^"]+)"/g)]
        .map((m) => m[1]);
    assert.deepEqual(externes, [],
        `la page du bac redemande des fichiers : ${externes.join(', ')} — hors `
        + 'ligne, ils n’arriveront pas');
});

test('LE BAC N’ÉCOUTE QUE LA FENÊTRE QUI L’A POSÉ', () => {
    // `sansCommentaires` : l'en-tête de cette page explique le contrôle en
    // citant son code. Sans nettoyage, l'épreuve se contenterait du
    // commentaire — et resterait verte le jour où la ligne disparaît.
    const S = sansCommentaires(lire('bac-python.html'));
    assert.match(S, /ev\.source !== window\.parent/,
        'n’importe quelle page de la même origine pourrait lui dicter un '
        + 'programme à exécuter');
    assert.match(S, /d\.pour !== 'bac-python'/);
    // On ne répond qu'à une origine nommée : jamais `'*'` dans une réponse.
    assert.ok(!/postMessage\(reponse,\s*'\*'\)/.test(S),
        'une réponse diffusée à `*` sort du cadre');
});

test('ET LA SORTIE D’UN PROGRAMME EST PLAFONNÉE', () => {
    // « La boucle qui ne s'arrête jamais » EST UNE MARCHE DE L'EXERCICE : un
    // élève DOIT pouvoir écrire `while True: print("a")`. Deux secondes de
    // `print`, ce sont des millions de lignes assemblées puis recopiées dans un
    // message — la tablette se fige, et la faute en serait à nous.
    const S = sansCommentaires(lire('bac-python.html'));
    assert.match(S, /PLAFOND/);
    assert.match(S, /execLimit/);
});

test('L’APPLICATION N’ACCEPTE QUE LES RÉPONSES DE SON PROPRE CADRE', () => {
    const S = sansCommentaires(lire('js/core/python/executer.js'));
    assert.match(S, /ev\.source !== cadre\.contentWindow/,
        'sans ce contrôle, n’importe quel message bien formé peut dicter à '
        + 'l’application le résultat d’un exercice');
    assert.ok(!/allow-same-origin/.test(S));
    // Le cadre n'est pas censé être cloisonné par la balise : c'est la
    // politique de la page qui s'en charge, pour la raison dite plus haut.
    assert.ok(!/setAttribute\('sandbox'/.test(S),
        'un `sandbox` sur la balise rend la page introuvable hors ligne');
});

test('L’ÉDITEUR N’OUVRE AUCUNE FENÊTRE NATIVE', () => {
    // Rémy : « tu utilises des alert et prompt, on évite ! »
    for (const f of ['js/core/activities/pythonEditeur.js', 'bac-python.html',
        'js/core/python/executer.js']) {
        const S = sansCommentaires(lire(f));
        const m = /(?<![.\w$])(alert|confirm|prompt)\s*\(/.exec(S);
        assert.ok(!m, `${f} appelle ${m ? m[1] : ''}`);
    }
});
