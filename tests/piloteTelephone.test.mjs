// LA ZONE « DIRECT » SUR UN TÉLÉPHONE : une colonne, pas une rangée d'onglets.
//
// RÉMY, capture de son iPhone à l'appui : « Sur portable la zone direct est
// moche quand même que faudrait il faire ? »
//
// CE QUI SE MESURE AILLEURS. `tools/piloteAuDoigt.mjs` ouvre l'écran à 390 px,
// ouvre une commande, et compte ce qui fait le désordre : les lignes, les
// bords gauches, et les commandes qui n'ont ni cadre ni fond. C'est lui qui
// prouve que l'écran est rangé. Ici on garde les deux règles qui se défont en
// silence, sans qu'aucune sonde ne tourne.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const CSS = lire('css/ui.css');
const CLASSES = lire('js/ui/espaceClasses.js');

test('LA COLONNE DU TÉLÉPHONE EST DÉCLARÉE APRÈS LA RANGÉE', () => {
    // CE DÉPÔT A DÉJÀ PAYÉ CE PIÈGE-LÀ (voir docs/frictions.md) : une règle
    // ajoutée dans un `@media` PLUS HAUT dans le fichier que la règle de base,
    // à spécificité égale, ne s'applique pas — et l'on cherche le défaut dans
    // le navigateur pendant que la cascade fait exactement ce qu'on lui a
    // demandé. La position relative des deux blocs EST la correction.
    const base = CSS.indexOf('.ec-pilote-onglets {');
    const tel = CSS.indexOf('SUR UN TÉLÉPHONE, CE NE SONT PLUS DES ONGLETS');
    assert.ok(base > 0, 'la rangée d\'onglets existe');
    assert.ok(tel > base,
        'le bloc téléphone doit venir APRÈS la rangée, sinon il ne s\'applique pas');
    // ET IL PORTE BIEN LA COLONNE, à la largeur du téléphone.
    const bloc = CSS.slice(tel, tel + 3400);
    assert.match(bloc, /@media \(max-width: 560px\) \{/);
    assert.match(bloc, /\.ec-pilote-onglets \{\s*\n\s*display: flex; flex-direction: column;/);
    // LE NOM À GAUCHE, L'ÉTAT À DROITE : c'est ce qui met les sept états en
    // colonne, et c'est la seule chose qu'un professeur vient lire d'un coup
    // d'oeil — maison fermée ? bac ouvert ? chrono ?
    assert.match(bloc, /justify-content: space-between;/);
});

test('ET LA LIGNE OUVERTE NE PRÉTEND PLUS ÊTRE UN ONGLET', () => {
    // Mesuré à 390 px avant correction : l'onglet ouvert finissait à 689 px et
    // son panneau commençait à 802 px — 113 px plus bas, et 159 px plus à
    // gauche. Son `margin-bottom: -9px` ne mord sur le filet du panneau que
    // s'il est sur la DERNIÈRE ligne de la rangée ; au milieu du tas, c'est
    // une boîte posée au hasard. On l'annule, et la ligne se marque autrement.
    const tel = CSS.indexOf('SUR UN TÉLÉPHONE, CE NE SONT PLUS DES ONGLETS');
    const bloc = CSS.slice(tel, tel + 5200);
    assert.match(bloc, /\.ec-pilote-onglet--actif \{[^}]*margin-bottom: 0;/);
    assert.match(bloc, /box-shadow: inset 3px 0 0 var\(--primary\);/);
});

test('ON VA VOIR LA COMMANDE QU\'ON VIENT D\'OUVRIR', () => {
    // En colonne, le panneau d'une commande est jusqu'à six lignes plus bas :
    // sur la capture de Rémy, son contenu était déjà sous le bord de l'écran.
    // Un réglage qu'on ouvre et qu'on ne voit pas s'ouvrir se reclique.
    const i = CLASSES.indexOf('if (d.outil !== undefined) {');
    assert.ok(i > 0, 'le gestionnaire existe');
    const bloc = CLASSES.slice(i, i + 1400);
    assert.match(bloc, /const ouvre = vue\.outil !== d\.outil;/);
    assert.match(bloc, /scrollIntoView\(\{ block: 'nearest', behavior: 'smooth' \}\)/);
    // `nearest` ET PAS `start` : sur un ordinateur, où le panneau suit la
    // rangée, la page ne doit pas bouger d'un pixel. Une seule mécanique pour
    // les deux écrans, et pas de réglage.
    assert.ok(!/block: 'start'/.test(bloc));
    // ET ON NE DÉFILE PAS EN REFERMANT : rien ne s'est ouvert à aller voir.
    assert.match(bloc, /if \(ouvre\) \{/);
});
