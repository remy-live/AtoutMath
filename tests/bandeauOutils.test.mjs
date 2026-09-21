// LA BANDE QUI NOMME LES ICÔNES.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « bonne idée pour le bandeau ».
//
// CE QUI L'A MOTIVÉE. En refaisant le trajet d'un professeur neuf — parcours
// vide jusqu'à « Donné à 1 classe — 6 élèves », huit gestes
// (`tools/tmp/trajetSeance2.mjs`) — huit boutons d'icône à l'écran, et pas un
// mot sur aucun. L'infobulle existe, mais elle demande un survol : sur la
// tablette d'une salle de classe, il n'y en a pas.
//
// MESURÉ après (`tools/tmp/voirBandeau.mjs`) :
//
//                        nommés / visibles   hauteur
//   parcours vide            5 / 5            132 px
//   parcours rempli         11 / 11           209 px
//   téléphone 390           11 / 11           316 px
//   après « J'ai compris »   absent            —
//   au rechargement          absent            —
//
// « nommés = visibles » à chaque fois, et l'accord est vérifié nom par nom :
// la bande dit exactement ce qui est à l'écran, ni plus ni moins.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const B = lire('js/ui/bandeauOutils.js');
const CSS = lire('css/components.css');

test('LA LÉGENDE SE CONSTRUIT À PARTIR DES BOUTONS, JAMAIS À LA MAIN', () => {
    // C'est LA décision du module. Une légende écrite à la main est juste le
    // jour où on l'écrit et fausse au premier bouton renommé — cette semaine,
    // deux l'ont été (« Voir son exercice », « son écran »).
    assert.match(B, /\.querySelectorAll\('\.toolbar-icon-btn'\)/);
    assert.match(B, /b\.getAttribute\('aria-label'\) \|\| ''/);
    // Et l'icône est CLONÉE du vrai bouton : deux dessins à tenir d'accord
    // finiraient par ne plus l'être.
    assert.match(B, /svg\.cloneNode\(true\)/);
    // Aucun nom d'outil en dur : s'il y en avait un, il vivrait sa vie.
    assert.ok(!/Choisir un exercice|Nouveau parcours|Code Élève/.test(B),
        'un nom d\'outil écrit en dur dans la légende : il divergera');
});

test('ELLE NE NOMME QUE CE QUI EST À L\'ÉCRAN', () => {
    // Sur un parcours vide, sept outils sont cachés : les nommer désignerait
    // des boutons introuvables, ce qui est pire que se taire.
    assert.match(B, /\.filter\(b => !b\.hidden && b\.offsetParent !== null\)/);
    // Un bouton sans `aria-label` est sauté, pas baptisé « Bouton ».
    assert.match(B, /\.filter\(o => o\.nom\);/);
});

test('ELLE SE REFAIT QUAND LES OUTILS APPARAISSENT', () => {
    // Posée une seule fois au démarrage, elle nommerait éternellement cinq
    // outils sur douze. `renderTeacherPath` vient justement de montrer ou de
    // cacher les sept autres : c'est là qu'il faut la refaire.
    const BU = lire('js/ui/builder.js');
    assert.match(BU, /import \{ poserLeBandeauDesOutils \} from '\.\/bandeauOutils\.js';/);
    assert.match(BU, /majBarreSelection\(\);[\s\S]{0,400}?poserLeBandeauDesOutils\(\);\s*\n\s*autoSavePath\(\);/);
    // Et elle se pose APRÈS `outilsDuParcours`, sinon elle lirait l'état d'avant.
    assert.ok(BU.indexOf('outilsDuParcours(steps.length > 0)')
        < BU.indexOf('poserLeBandeauDesOutils()'));
});

test('ELLE PART POUR DE BON', () => {
    // Un bandeau d'aide qui revient est un bandeau qu'on apprend à ignorer,
    // puis à détester. Mesuré : absent après le clic, absent au rechargement.
    assert.match(B, /const CLEF = 'atoutmath-bandeau-outils';/);
    assert.match(B, /if \(congedie\(\)\) \{ if \(ancienne\) ancienne\.remove\(\); return; \}/);
    assert.match(B, /compris\.onclick = \(\) => \{ congedier\(\); bande\.remove\(\); \};/);
    // Le mode privé ne doit pas faire tomber le rendu du parcours avec lui.
    assert.match(B, /try \{ return localStorage\.getItem\(CLEF\) === 'vu'; \} catch \(e\) \{ return false; \}/);
    assert.match(B, /try \{ localStorage\.setItem\(CLEF, 'vu'\); \} catch \(e\)/);
});

test('AU DOIGT, LA LÉGENDE EST DU TEXTE — ET C\'EST CE QUI LA REND TENABLE', () => {
    // Une ligne cliquable au doigt réclame ses 44 px, règle de la maison.
    // MESURÉ sur 390 × 844, onze lignes à 44 px : 650 px, les trois quarts de
    // l'écran pour une note qu'on lit une fois. On ne rogne pas la règle, on
    // retire le geste : les vrais boutons sont à 44 px juste au-dessus, et ce
    // sont eux qu'on veut apprendre à viser. 650 → 316 px.
    assert.match(B, /window\.matchMedia\('\(pointer: coarse\)'\)\.matches;/);
    assert.match(B, /if \(!auDoigt\) \{\s*\n\s*li\.classList\.add\('bandeau-outils-item--cliquable'\);\s*\n\s*li\.onclick = \(\) => bouton\.click\(\);/);
    // Et rien ne laisse croire qu'on peut cliquer : le curseur et le survol
    // ne viennent qu'avec la classe.
    assert.match(CSS, /\.bandeau-outils-item--cliquable \{ cursor: pointer; \}/);
    assert.ok(!/\.bandeau-outils-item \{[^}]*cursor: pointer/.test(CSS));
    // Le plancher tactile reste sur ce qui se clique vraiment.
    assert.match(CSS, /@media \(pointer: coarse\) \{[\s\S]{0,300}?\.bandeau-outils-compris \{ min-height: 44px; \}/);
    // Deux colonnes sur un téléphone : onze noms en colonne unique font une
    // page de défilement avant d'atteindre le parcours.
    assert.match(CSS, /\.bandeau-outils-liste \{ grid-template-columns: repeat\(2, 1fr\); gap: 4px 10px; \}/);
});

test('ELLE NE PEUT PAS APPARAÎTRE CHEZ L\'ÉLÈVE', () => {
    // Elle n'est appelée que depuis `renderTeacherPath`, et la barre qu'elle
    // lit vit dans `#builder-view`, qui est `teacher-only`. Deux verrous, et
    // le second est dans le HTML : on le garde sous surveillance.
    const BU = lire('js/ui/builder.js');
    assert.equal((BU.match(/poserLeBandeauDesOutils\(\)/g) || []).length, 1);
    assert.match(lire('index.html'), /<div id="builder-view" class="teacher-only">/);
});
