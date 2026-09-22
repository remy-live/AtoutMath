// LE DÉLAI ENTRE LA RÉPONSE DE L'ÉLÈVE ET L'ŒIL DU PROFESSEUR.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « peut-on rendre la synchronisation plus réactive entre les postes
// élèves et professeurs ? » — puis, la v777 livrée : « tu ne m'as pas dit ce
// que tu as fait pour augmenter la synchronisation. »
//
// IL AVAIT RAISON DE LE RELEVER. La v777 avait corrigé ce que la synchro
// TRANSPORTE — le direct ignorait sur quel exercice l'élève travaillait tant
// qu'il n'avait pas répondu — et pas sa CADENCE. Je le lui avais écrit en une
// ligne au milieu d'une réponse longue, ce qui revient à ne pas le dire.
//
// MESURÉ (`tools/tmp/delaiReel.mjs`), une réponse entrée au journal de l'élève
// → le chiffre qui bouge sur l'écran du professeur, trois fois :
//
//                     avant                après
//   trois essais      8,0 · 7,0 · 7,0 s    3,0 · 2,0 · 1,9 s
//   médiane           7,0 s                2,0 s
//
// (Au passage : un commentaire du code annonçait « une quinzaine de secondes
// au pire ». La mesure en donnait sept. On garde les chiffres mesurés.)
//
// DEUX MOITIÉS, DEUX TRAITEMENTS DIFFÉRENTS — et c'est tout l'intérêt.
//
//   · LA POUSSÉE DE L'ÉLÈVE attendait quatre secondes à chaque réponse. Ce
//     délai n'est pas inutile : les jeux d'arcade produisent des rafales de
//     plusieurs réponses par seconde, et sans lui chacune partirait seule —
//     trente élèves en rafale sur un hébergement mutualisé font le calcul tout
//     seuls. On ne l'a donc pas raccourci : on a DÉPLACÉ SON BORD. La première
//     réponse après un temps calme part immédiatement, les suivantes sont
//     regroupées comme avant. Le cas courant gagne quatre secondes et ne coûte
//     pas une requête de plus ; le plafond en rafale est inchangé.
//
//   · LE BATTEMENT DU PROFESSEUR passe de dix à cinq secondes. Là, la dépense
//     est réelle et il faut la nommer : chaque battement fait relire au serveur
//     les deux cents derniers événements de chacun des trente élèves. On double
//     ce travail. C'est borné — le direct ne bat que pendant que son onglet est
//     ouvert — et l'on s'arrête là faute d'avoir mesuré la charge du serveur.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const SYNC = lire('js/core/sync.js');
const EC = lire('js/ui/espaceClasses.js');

test('LA PREMIÈRE RÉPONSE APRÈS UN TEMPS CALME PART TOUT DE SUITE', () => {
    assert.match(SYNC, /const depuis = Date\.now\(\) - dernierPush;/);
    assert.match(SYNC, /const attente = depuis >= PUSH_DEBOUNCE_MS \? 0 : PUSH_DEBOUNCE_MS - depuis;/);
    assert.match(SYNC, /pushTimer = setTimeout\(\(\) => \{\s*\n\s*pushTimer = null;\s*\n\s*dernierPush = Date\.now\(\);/);
});

test('MAIS LA RAFALE EST TOUJOURS REGROUPÉE', () => {
    // C'est la moitié qui protège le serveur, et elle ne doit pas disparaître
    // dans l'enthousiasme : le délai est intact, seul son BORD a changé.
    assert.match(SYNC, /const PUSH_DEBOUNCE_MS = 4000;/);
    // Le garde qui empêche deux poussées d'être programmées en même temps.
    assert.match(SYNC, /if \(!isActive\(\) \|\| pushTimer\) return;/);
});

test('ET LE BATTEMENT DU PROFESSEUR EST DESCENDU À CINQ SECONDES', () => {
    assert.match(EC, /const BATTEMENT_MS = 5000;/);
    // Le commentaire doit nommer la dépense, pas seulement le gain : deux cents
    // événements relus par élève et par battement. Sans cela, le prochain qui
    // passera le descendra à une seconde en croyant bien faire.
    const bloc = EC.slice(Math.max(0, EC.indexOf('const BATTEMENT_MS') - 1400),
        EC.indexOf('const BATTEMENT_MS'));
    assert.match(bloc, /deux cents derniers\s*\n?\s*\*?\s*événements de CHACUN des trente élèves/);
});

test('LE BATTEMENT NE TOURNE QUE SOUS LES YEUX DU PROFESSEUR', () => {
    // C'est ce qui borne la dépense : hors du Direct et du Mur, rien ne bat.
    assert.match(EC, /const surUnEcranVivant = vue\.onglet === 'direct' \|\| vue\.onglet === 'mur';/);
    assert.match(EC, /if \(vue\.ou !== 'classe' \|\| !surUnEcranVivant \|\| vue\.occupe\) return;/);
});

test('L\'ÉTAT DE SÉANCE ARRIVE TOUJOURS PLUS VITE DEVANT QUE DERRIÈRE', () => {
    // L'autre sens du tuyau — les consignes du professeur vers l'élève — n'a
    // pas bougé, et il était déjà réglé sur l'attention : dix secondes quand
    // l'onglet est devant l'élève, une minute quand il est derrière.
    assert.match(SYNC, /const SEANCE_VISIBLE_MS = 10 \* 1000;/);
    assert.match(SYNC, /const SEANCE_CACHE_MS = 60 \* 1000;/);
});
