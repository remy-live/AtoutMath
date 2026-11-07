// UN APERÇU NE SE MONTRE PAS AVANT D'ÊTRE À SA TAILLE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « dans le choisi un exercice c'est tout gros et après ça prend la
// bonne taille, idem pour l'aperçu quand on passe la souris ».
//
// MESURÉ, avant correction, au navigateur (tools/tmp/sondeGrossissement.mjs,
// relevé toutes les 40 ms) :
//
//   · fenêtre « Choisir un exercice » — « La Chasse aux Zéros » s'affiche en
//     358 × 763 dans un cadre de 358 × 300, soit ×2,54, et reste ainsi 240 ms ;
//     « Des Lettres aux Chiffres » ×2,53 ; « Amis de 10 » ×2,07 ;
//   · vignette de survol — le jeu part à 324 × 224 (l'échelle 0,4 du CSS) et
//     saute à 460 × 318 au bout d'un quart de seconde, la boîte passant de
//     340 à 460 px de large sous le curseur.
//
// APRÈS : sur sept exercices essayés, 0 ms passée à la mauvaise taille, et UNE
// SEULE taille montrée du début à la fin — plus aucun saut.
//
// LA CAUSE ÉTAIT LA MÊME AUX TROIS ENDROITS : on montrait avant d'avoir mesuré,
// et l'on mesurait à 260 ms parce que ce nombre était rond. Les jeux dessinent
// en moins de 50 ms ; on n'avait donc aucune raison d'attendre.
//
// Ce fichier tient ce qui se déferait en silence : l'ordre (mesurer, puis
// montrer) et le garde-fou de la seconde mesure.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const sansCommentaires = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const AP = sansCommentaires(lire('js/ui/apercuTiroir.js'));
const CX = sansCommentaires(lire('js/ui/choisirExercice.js'));
const RE = sansCommentaires(lire('js/ui/reglagesEtape.js'));

test('ON MESURE À LA PREMIÈRE IMAGE, PAS À UN DÉLAI ROND', () => {
    // `requestAnimationFrame` et non `setTimeout(…, 260)` : on regarde à chaque
    // image si le jeu a dessiné quelque chose. C'est TOUT le correctif — un
    // délai fixe est soit trop court (on mesure un plateau vide) soit trop long
    // (on montre un jeu de travers), et il n'existe aucune valeur qui soit les
    // deux à la fois pour cent soixante-douze exercices.
    assert.match(AP, /export function ajusterDesQueDessine\(\{ ajuster, montrer, vivant = \(\) => true \}\)/);
    assert.match(AP, /surLaProchaineImage\(essai\);/);
    assert.ok(!/setTimeout\(ajuster, 260\)/.test(CX), 'la fenêtre de choix n\'attend plus 260 ms');
    assert.ok(!/setTimeout\(ajuster, 260\)/.test(RE), 'les réglages d\'étape non plus');
});

test('ON NE RÉVÈLE QU\'APRÈS AVOIR POSÉ L\'ÉCHELLE', () => {
    // L'ordre est le fond du sujet : `reveler()` n'est appelé que dans la
    // branche où `ajuster()` a rendu une mesure, ou au renoncement.
    const f = AP.slice(AP.indexOf('export function ajusterDesQueDessine'),
        AP.indexOf('const essai = (t) =>') + 420);
    assert.match(f, /premiere = ajuster\(\);\s*\n\s*if \(premiere\) \{ reveler\(\); return; \}/);
});

test('UN JEU QUI NE DESSINE JAMAIS NE CACHE PAS LE CADRE POUR TOUJOURS', () => {
    // Le plafond est un abandon, pas un délai : sans lui, un exercice sans
    // aperçu laisserait un trou blanc que rien ne viendrait remplir.
    assert.match(AP, /const PLAFOND_PREMIERE_IMAGE = 600;/);
    assert.match(AP, /if \(t - debut < PLAFOND_PREMIERE_IMAGE\) \{ surLaProchaineImage\(essai\); return; \}\s*\n\s*reveler\(\);/);
});

test('LA SECONDE MESURE NE REPOSE RIEN SI ELLE N\'A RIEN TROUVÉ', () => {
    // C'est elle qui faisait sauter la vignette : elle reposait une échelle
    // identique à 3 % près. « Le Symétrique aux Carreaux » a besoin d'elle —
    // il déplie son quadrillage après sa première image — mais les onze autres
    // jeux essayés n'en ont pas besoin, et payaient le saut.
    assert.match(AP, /const presqueEgal = \(a, b\) =>/);
    assert.match(AP, /if \(proche && presqueEgal\(ech, proche\.ech\) && presqueEgal\(l, proche\.l\)/);
    assert.match(AP, /t\.style\.transform = avant;\s*\n\s*return proche;/);
    // Et la retouche passe bien la mesure précédente, sans quoi la garde ci-dessus
    // ne servirait à rien.
    assert.match(AP, /ajuster\(premiere\);/);
    assert.match(CX, /proche\s*\n?\s*\}\),/);
    assert.match(RE, /proche\s*\n?\s*\}\),/);
});

test('LES TROIS APERÇUS SE CACHENT PENDANT LA MESURE', () => {
    // `visibility`, et surtout pas `display` : une boîte `display: none` n'a
    // pas de dimensions, or c'est exactement ce qu'on vient mesurer.
    assert.match(AP, /b\.style\.visibility = 'hidden';/);
    assert.match(AP, /montrer: \(\) => \{ b\.style\.visibility = ''; \}/);
    assert.match(CX, /cadre\.style\.visibility = 'hidden';/);
    assert.match(CX, /montrer: \(\) => \{ cadre\.style\.visibility = ''; \}/);
    assert.match(RE, /cadre\.style\.visibility = 'hidden';/);
    assert.ok(!/style\.display = 'none'[^;]*;\s*\n\s*ajusterDesQueDessine/.test(AP));
});

test('UN APERÇU ABANDONNÉ NE REDIMENSIONNE PAS SON SUCCESSEUR', () => {
    // Le professeur descend sa liste et en ouvre dix en deux secondes. Sans
    // jeton, la retouche du troisième — qui arrive à 700 ms — retomberait sur
    // le neuvième et lui poserait l'échelle d'un autre jeu.
    assert.match(AP, /vivant: \(\) => monJeton === jeton,/);
    assert.match(CX, /vivant: \(\) => monTour === tour,/);
    assert.match(RE, /vivant: \(\) => monTour === tour,/);
    assert.match(AP, /if \(!vivant\(\)\) return;/);
});

test('LA FENÊTRE DE CHOIX TUE LE JEU QU\'ELLE REMPLACE', () => {
    // `launchPreview` coupe les minuteurs déclarés par `regInterval` ; les jeux
    // historiques ouvrent les leurs directement et y survivaient. Vider la
    // toile ne les arrête pas : ils continuent de rafraîchir un plateau démonté,
    // une erreur par seconde dans la console jusqu'au rechargement. La vignette
    // du catalogue avait déjà rencontré cela (`tuerLInstance`).
    assert.match(CX, /const tuer = \(\) => \{/);
    assert.match(CX, /h\.destroy === 'function'/);
    assert.match(CX, /montre = exo\.id;\s*\n\s*tuer\(\);/);
    // Et quand la fenêtre se referme, personne ne reste à tourner derrière.
    assert.match(CX, /onClose: \(\) => \{[\s\S]{0,260}tour\+\+; tuer\(\);/);
});
