// UN APERÇU NE SE MET PAS EN TRAVERS D'UN GLISSER-DÉPOSER.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « l'aperçu ne s'éteint pas quand on prend l'exercice pour le dragger
// et le dropper du coup c'est bloquant ».
//
// L'ENCHAÎNEMENT, MESURÉ (tools/tmp/sondeGlisser2.mjs, qui déclenche un vrai
// glisser-déposer du navigateur et relève l'état de la vignette toutes les
// 50 ms depuis `dragstart` jusqu'à `dragend`) :
//
//   1. le curseur entre sur la rangée : un minuteur de 500 ms est armé ;
//   2. le professeur appuie et tire avant qu'il n'ait sonné. `dragstart`
//      fermait la vignette — qui n'était pas encore ouverte — et NE DÉSARMAIT
//      PAS le minuteur ;
//   3. pendant un glisser-déposer HTML5, le navigateur cesse d'envoyer les
//      événements de souris : le `mouseleave` de la rangée n'arrive jamais ;
//   4. à 500 ms, la vignette s'ouvre EN PLEIN GLISSER, à droite de la rangée —
//      c'est-à-dire par-dessus la colonne du parcours — et plus rien ne la
//      referme, puisque c'était `mouseleave` qui s'en chargeait ;
//   5. elle est `z-index: 10000` et `pointer-events: auto` : le dépôt lui
//      arrive dessus. L'exercice n'entre pas dans le parcours.
//
// APRÈS : sur les deux cas (vignette déjà ouverte, minuteur encore en course),
// 0 relevé avec la vignette ouverte pendant le glisser, l'exercice entre dans
// le parcours, et le survol suivant remonte normalement.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const sansCommentaires = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const AP = sansCommentaires(lire('js/ui/apercuTiroir.js'));
const NAV = sansCommentaires(lire('js/ui/navigation.js'));

test('UN INTERRUPTEUR, PAS UNE FERMETURE DE PLUS', () => {
    // Fermer à `dragstart` ne suffisait pas et ne suffira jamais : ce qu'il
    // faut, c'est que rien ne puisse OUVRIR tant que le geste dure. Le garde
    // est donc dans `montrerApercu`, par où tout le monde passe.
    assert.match(AP, /export function glissementEnCours\(oui\) \{/);
    assert.match(AP, /enGlissement = !!oui;\s*\n\s*if \(enGlissement\) fermerApercu\(\{ force: true \}\);/);
    const debut = AP.slice(AP.indexOf('export async function montrerApercu'),
        AP.indexOf('export async function montrerApercu') + 220);
    assert.match(debut, /if \(enGlissement\) return;/);
});

test('LE MINUTEUR DE SURVOL EST DÉSARMÉ QUAND LE GLISSER COMMENCE', () => {
    // C'est LE défaut : `fermerApercu` ne fermait rien puisque rien n'était
    // ouvert, et le minuteur, lui, continuait de courir.
    const ds = NAV.slice(NAV.indexOf('item.ondragstart'), NAV.indexOf('item.ondragend'));
    assert.match(ds, /clearTimeout\(hoverTimer\);/);
    assert.match(ds, /glissementEnCours\(true\);/);
});

test('`dragend` REND L\'APERÇU AU SURVOL', () => {
    // Sans lui, l'interrupteur resterait sur « on » et plus aucun aperçu ne
    // s'ouvrirait jusqu'au rechargement — une panne bien pire que celle qu'on
    // répare. `dragend` arrive toujours, qu'on ait déposé ou renoncé.
    assert.match(NAV, /item\.ondragend = \(\) => \{ glissementEnCours\(false\); \};/);
    // Et un filet sur le document, pour les glissers qui finissent ailleurs.
    assert.match(AP, /document\.addEventListener\('dragend', \(\) => glissementEnCours\(false\), true\);/);
    assert.match(AP, /document\.addEventListener\('drop', \(\) => glissementEnCours\(false\), true\);/);
});

test('ON DÉSARME AVANT DE RÉARMER LE MINUTEUR DE SURVOL', () => {
    // Deux `mouseenter` de suite sans `mouseleave` entre les deux perdaient la
    // poignée du premier minuteur : plus personne ne pouvait l'annuler, et il
    // ouvrait la vignette une demi-seconde plus tard, hors de tout survol.
    // Trouvé sous la sonde, qui synthétise un `mouseenter`.
    const me = NAV.slice(NAV.indexOf('item.onmouseenter'), NAV.indexOf('item.onmouseleave'));
    assert.match(me, /clearTimeout\(hoverTimer\);\s*\n\s*hoverTimer = setTimeout/);
});
