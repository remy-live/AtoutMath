// LA FRISE DES ÉTAPES EST UN INDICATEUR, PAS UNE RANGÉE DE BOUTONS.
//
// Rémy, capture d'iPhone à l'appui : « même les carrés des étapes sont hyper
// gros en haut et moche du coup ».
//
// IL VOYAIT UN DÉFAUT QUE SON ÉLÈVE N'A PAS, et c'est ce qui rend le cas
// intéressant. Une étape est un trait de 8 px de haut. Mais en APERÇU DE
// PROFESSEUR la frise devient pilotable, ses dix traits deviennent des
// `<button>`, et le plancher tactile de 44 px — écrit pour de vrais boutons —
// les gonflait chacun à 44 px. La bande passait de 26 à 53 px ; l'élève, lui,
// a toujours vu des traits.
//
// LA CIBLE, ELLE, RESTE GRANDE. `.fil-pas::before` porte une zone de prise qui
// déborde du trait sans rien ajouter au dessin. Mesuré dans le navigateur, en
// refaisant le geste : 48 px de haut, pour un plancher de 44.
//
// POURQUOI ELLE DÉBORDE VERS LE BAS ET NON DES DEUX CÔTÉS : la frise touche le
// haut de l'écran. Une zone symétrique gaspillait la moitié de sa hauteur hors
// de la page — et la première mesure, qui testait ±16 px en supposant la
// symétrie, condamnait une cible parfaitement correcte.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const MODULES = readFileSync(new URL('../css/modules.css', import.meta.url), 'utf8');
const JEUX = readFileSync(new URL('../css/games.css', import.meta.url), 'utf8');

test('LE PLANCHER DE 44 px NE S\'APPLIQUE PAS À LA FRISE', () => {
    const plancher = /#game-layer button:not\(([^{]*)\) \{\s*min-height: 44px;/.exec(MODULES);
    assert.ok(plancher, 'le plancher tactile des boutons de jeu doit exister');
    assert.match(plancher[1], /\.fil-pas/,
        'la frise doit être exclue du plancher : ses traits ne sont pas des boutons');

    // ET LES AUTRES EXCLUSIONS RESTENT. Un `:not()` se rallonge facilement, et
    // le jour où quelqu'un le réécrit, ce sont les cases de grille et les
    // touches de pavé qui reprennent 44 px de haut — le défaut d'origine.
    ['game-icon-btn', 'btn-carre', 'case', 'cell', 'touche'].forEach(c =>
        assert.match(plancher[1], new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
            `l'exclusion « ${c} » ne doit pas disparaître`));
});

test('LA ZONE DE PRISE FAIT 44 px SANS AGRANDIR LE TRAIT', () => {
    // Le dessin : 8 px, et il ne bouge pas.
    assert.match(JEUX, /\.fil-pas \{[^}]*height: 8px/,
        'un trait de frise fait 8 px — c\'est un indicateur');
    // La prise : ce qui déborde. `inset` dit les quatre côtés ; on vérifie que
    // le total atteint le plancher, et qu'il ne va PAS chercher en haut ce qui
    // n'y est pas.
    const prise = /\.fil--pilotable \.fil-pas::before \{ inset: (-?\d+)px 0 (-?\d+)px 0; \}/
        .exec(MODULES);
    assert.ok(prise, 'la zone de prise débordante doit être déclarée, et asymétrique');
    const haut = -Number(prise[1]), bas = -Number(prise[2]);
    assert.ok(haut + 8 + bas >= 44,
        `la prise fait ${haut + 8 + bas} px, il en faut 44`);
    assert.ok(haut <= 8,
        'elle ne doit presque pas déborder vers le HAUT : la frise touche le bord '
        + 'de l\'écran, et ce qui sort de la page ne se touche pas');

    // ET ELLE DOIT ÊTRE DEVANT. Mesuré par le geste : sans cela, la partie
    // débordante passait SOUS l'en-tête du jeu — qui vient après dans le
    // document — et le navigateur répondait « autre chose ». Agrandir une
    // cible sans regarder ce qui la couvre, c'est déplacer le défaut.
    assert.match(MODULES, /\.fil--pilotable \{ position: relative; z-index: \d+; \}/,
        'la frise pilotable doit passer devant l\'en-tête, sinon sa prise est couverte');
});
