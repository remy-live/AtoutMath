// UNE GRILLE NE SE POSE PAS SUR LE CLAVIER, QUELLE QUE SOIT LA PLACE.
//
// Rémy, capture d'un téléphone : la grille de mots croisés chevauche la
// définition au-dessus ET le pavé de lettres en dessous.
//
// CE DÉFAUT AVAIT DÉJÀ ÉTÉ CORRIGÉ UNE FOIS, et c'est ce qui rend le cas
// instructif. Le commentaire du jeu le raconte : « le corps ne recevait que
// 189 px de haut pour une grille de dix-sept rangées », et la correction avait
// repris quatre-vingts pixels à ce qui n'est pas la grille. Elle suffisait à la
// grille du jour. Mais UN BUDGET SE DÉPASSE : dès que la place manque à
// nouveau, la grille ressortait de son emplacement, et comme ses cases portent
// `position: relative`, elle passait DEVANT ses voisines.
//
// MESURÉ SUR HUIT CONDITIONS, la seule qui le reproduisait est le téléphone
// COUCHÉ : corps de 118 px, grille de 259 px, débordement de 141 — trente et un
// par-dessus la définition, cinquante-quatre par-dessus le clavier, neuf
// par-dessus les boutons. Le bloc qui allège l'écran ne regardait que la
// LARGEUR ; un téléphone couché fait 804 px de large et n'y entrait pas.
//
// LA CORRECTION EST DONC EN DEUX TEMPS, et seul le premier est une garantie :
//
//   · `overflow: auto` sur le corps — le pire cas devient un DÉFILEMENT, et la
//     grille ne peut plus rien peindre hors de son emplacement, dans aucune
//     condition, y compris celles que je n'ai pas su énumérer ;
//   · la cure d'allègement s'applique aussi quand c'est la HAUTEUR qui manque,
//     pour que ce pire cas arrive le plus rarement possible.
//
// `safe center` N'EST PAS UN DÉTAIL : un enfant centré qui déborde sort des
// DEUX côtés, et le côté du haut n'est pas atteignable au défilement — la
// première rangée de la grille serait perdue, ce qui est pire que le défaut.
//
// APRÈS, sur les huit conditions : zéro pixel peint hors de l'emplacement.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const JEU = readFileSync(new URL('../js/games/motsCroises.js', import.meta.url), 'utf8');

const bloc = (selecteur) => {
    const m = new RegExp(`\\${selecteur} \\{([^}]*)\\}`).exec(JEU);
    return m ? m[1] : '';
};

test('LE CORPS RETIENT CE QUI DÉBORDE', () => {
    const corps = bloc('.mc-corps');
    assert.ok(corps, 'le bloc .mc-corps doit exister');
    assert.match(corps, /overflow:\s*auto/,
        'sans cela, une grille trop grande se peint par-dessus le clavier — '
        + 'mesuré : 54 px de recouvrement sur un téléphone couché');
});

test('CE QUI DÉBORDE RESTE ATTEIGNABLE', () => {
    const corps = bloc('.mc-corps');
    // Le centrage « sûr » : il centre tant que ça tient, et s'aligne au début
    // dès que ça ne tient plus. Un centrage ordinaire perdrait le haut de la
    // grille hors de portée du défilement.
    assert.match(corps, /align-items:\s*safe center/,
        'un centrage ordinaire rend la première rangée inatteignable');
    assert.match(corps, /justify-content:\s*safe center/,
        'et la première colonne aussi');
});

test('L\'ÉCRAN S\'ALLÈGE AUSSI QUAND C\'EST LA HAUTEUR QUI MANQUE', () => {
    // La cure — définition plus petite, boutons plus serrés, note discrète,
    // plancher de case à 11 px — ne regardait que la largeur. Un téléphone
    // couché fait 804 px de large : il n'entrait dans aucune de ces règles, et
    // c'est la seule condition qui reproduisait la capture.
    const requete = /@container \(([^{]*)\) \{\s*\.mc-indice/.exec(JEU);
    assert.ok(requete, 'le bloc d\'allègement doit exister et commencer par .mc-indice');
    assert.match(requete[1], /max-width:\s*520px/, 'il garde son cas étroit');
    assert.match(requete[1], /max-height:\s*\d+px/,
        'et il doit aussi s\'appliquer quand la hauteur manque — c\'est le cas '
        + 'du téléphone couché, large mais sans hauteur');
    assert.match(requete[1], /\bor\b/,
        'les deux conditions valent chacune pour elle-même, pas ensemble');
});
