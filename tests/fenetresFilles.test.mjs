// AUCUN GESTIONNAIRE D'ATTRIBUT, NULLE PART — LA CSP VOYAGE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CE QU'ON A MESURÉ (tools/fenetresFilles.mjs, témoin sans en-tête à l'appui) :
// une fenêtre ouverte par window.open('') HÉRITE de la CSP de son ouvreur.
// Notre script-src n'a pas 'unsafe-inline' — seulement 'self' et des
// empreintes, qui ne couvrent PAS les gestionnaires d'attribut.
//
// DEUX BOUTONS « Imprimer » VIVAIENT AINSI : celui des billets de la classe et
// celui de l'affiche d'un parcours. Tous deux MORTS chez Rémy et VIVANTS chez
// nous, parce que le serveur d'essai ne pose pas l'en-tête. C'est le genre de
// défaut qui attend l'imprimante du collège pour se montrer, et qu'aucune
// mesure faite en local ne peut trouver.
//
// POURQUOI CETTE ÉPREUVE EST STATIQUE ET NON AU NAVIGATEUR. La mesure au
// navigateur existe (l'outil nommé ci-dessus, avec son témoin) ; elle coûte
// trois secondes et un Chromium. Ce qui doit tourner à CHAQUE commit, c'est la
// règle : pas un seul `onclick=` dans le code. Les deux se complètent, et
// l'outil est nommé ici pour qu'on sache où le trouver.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { gestionnairesInline } from '../tools/fenetresFilles.mjs';

const racine = new URL('..', import.meta.url).pathname;

function fichiersJs(dossier = 'js') {
    const sortie = [];
    for (const e of readdirSync(racine + dossier)) {
        const rel = `${dossier}/${e}`;
        if (statSync(racine + rel).isDirectory()) sortie.push(...fichiersJs(rel));
        else if (e.endsWith('.js')) sortie.push(rel);
    }
    return sortie;
}

test('PAS UN SEUL GESTIONNAIRE D\'ATTRIBUT DANS js/', () => {
    const sources = Object.fromEntries(
        fichiersJs().map((f) => [f, readFileSync(racine + f, 'utf8')]));
    const faits = gestionnairesInline(sources);
    assert.deepEqual(faits, [],
        'la CSP les refuse : brancher depuis l\'ouvreur, qui est de même origine.\n'
        + faits.map((f) => `  ${f.fichier}:${f.ligne}  ${f.texte}`).join('\n'));
});

test('ET LE DÉTECTEUR NE SE TROMPE PAS SUR LES MOTS QUI COMMENCENT PAR « on »', () => {
    // MA PREMIÈRE VERSION CHERCHAIT `on` SUIVI DE LETTRES, et elle a désigné
    // quatre lignes qui n'ont rien à voir : `{ only = 'tout' }` dans le
    // catalogue, `let onglet = 'consigne'` dans l'aide d'un exercice. Un
    // détecteur qui crie au loup se fait désactiver au troisième cri.
    const faux = {
        'faux.js': [
            "export function f(list, { only = 'tout' } = {}) {}",
            "let onglet = 'consigne';",
            "el.onclick = () => f();",
            "const once = 'oui';"
        ].join('\n')
    };
    assert.deepEqual(gestionnairesInline(faux), []);

    // Et il voit ce qu'il doit voir, dans les deux sortes de guillemets.
    const vrais = { 'vrai.js': '<button onclick="print()">a</button>\n<i onmouseover=\'x()\'>b</i>' };
    assert.equal(gestionnairesInline(vrais).length, 2);
});

test('LA CSP DU SITE N\'AUTORISE TOUJOURS PAS LE SCRIPT INLINE', () => {
    // SI ELLE LE FAISAIT UN JOUR, la règle ci-dessus deviendrait inutile — et
    // surtout, le site aurait perdu sa protection principale sans que personne
    // ne l'ait voulu. On préfère l'apprendre ici.
    const h = readFileSync(racine + '.htaccess', 'utf8');
    const csp = (h.match(/Header always set Content-Security-Policy "([^"]+)"/) || [])[1] || '';
    assert.ok(csp, 'la CSP est bien posée dans .htaccess');
    const scriptSrc = (csp.match(/script-src ([^;]+)/) || [])[1] || '';
    assert.ok(!scriptSrc.includes("'unsafe-inline'"),
        'script-src sans unsafe-inline : c\'est pourquoi aucun onclick= ne tient');
    assert.ok(!scriptSrc.includes("'unsafe-hashes'"),
        'et sans unsafe-hashes, qui est précisément ce qui ferait vivre un onclick=');
});
