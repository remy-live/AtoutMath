// UNE ICÔNE SEULE NE GARDE PAS LA PLACE DU MOT QU'ON LUI A RETIRÉ.
//
// Rémy : « un petit détail les icones ne font pas centrés dans le bouton du
// switch » — celui qui fait passer le catalogue de l'arborescence au clic.
//
// DEUX ESPACES SURVIVAIENT AU LIBELLÉ, et il a fallu les deux pour comprendre :
//
//   · `.btn-toggle svg { margin-right: 5px }` (layout.css) sépare l'icône de
//     son mot — « 🖱 Clic ». Le mot est masqué ici par `font-size: 0`, la
//     marge est restée. MESURÉ : l'icône à −5,00 px du centre ;
//   · le bouton est un `flex` avec `gap: 5px`, et un libellé à `font-size: 0`
//     RESTE UN ÉLÉMENT DE FLEX : sa largeur est nulle, le gap qui le sépare de
//     l'icône ne l'est pas. MESURÉ après la première correction : −2,50 px,
//     soit exactement la moitié — c'est ce demi qui a désigné un espacement
//     PARTAGÉ plutôt qu'une seconde marge.
//
//     avant .................. −5,00 px
//     marge retirée .......... −2,50 px
//     gap retiré .............  0,00 px
//
// CE QUI REND CE DÉFAUT DURABLE : il ne casse rien. Le bouton se clique, son
// infobulle est juste, son `aria-label` aussi. Il n'y a que l'oeil pour le
// voir, et seulement quand deux boutons voisins penchent du même côté.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const UI = readFileSync(new URL('../css/ui.css', import.meta.url), 'utf8');
const LAYOUT = readFileSync(new URL('../css/layout.css', import.meta.url), 'utf8');

/** La règle qui s'applique aux deux boutons Clic / Arbre, sans ses commentaires. */
function regle(selecteur) {
    const nu = UI.replace(/\/\*[\s\S]*?\*\//g, '');
    const i = nu.indexOf(selecteur);
    assert.ok(i >= 0, `la règle « ${selecteur} » doit exister`);
    return nu.slice(i + selecteur.length, nu.indexOf('}', i));
}

test('LE BOUTON SANS LIBELLÉ N\'ESPACE PLUS RIEN', () => {
    const r = regle('.sidebar-top-controls > .desktop-controls .btn-toggle ');
    assert.match(r, /font-size: 0/,
        'c\'est bien le bouton dont on a retiré le mot');
    assert.match(r, /gap: 0/,
        'un libellé de largeur nulle garde son gap : il faut l\'annuler, sinon '
        + 'le centrage répartit l\'icône ET un vide de 5 px');
    assert.match(r, /justify-content: center/);
});

test('ET L\'ICÔNE NE GARDE PAS LA MARGE DE SON MOT', () => {
    const r = regle('.sidebar-top-controls > .desktop-controls .btn-toggle svg ');
    assert.match(r, /margin-right: 0/,
        'la marge vient de `.btn-toggle svg` et sépare l\'icône de son libellé');
    // LE CONTRÔLE DU CONTRÔLE : si cette marge disparaissait un jour de
    // `layout.css`, la ligne ci-dessus deviendrait un remède sans maladie — et
    // l'on ne saurait plus pourquoi elle est là.
    assert.match(LAYOUT.replace(/\/\*[\s\S]*?\*\//g, ''),
        /\.btn-toggle svg \{ margin-right: 5px; \}/,
        'c\'est bien cette marge-là qu\'on annule, et elle sert ailleurs');
});
