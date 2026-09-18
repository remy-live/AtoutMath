// « J'AI PERDU MON CODE » — réimprimer UN billet, sans en changer.
//
// Ce qui existait : « Imprimer les billets », qui sort les trente d'un coup, et
// « code », qui en TIRE UN NOUVEAU — donc qui invalide l'ancien billet et
// oblige à tout réexpliquer à l'élève. Or le code n'est pas perdu : il est
// écrit dans la colonne d'à côté, sous les yeux du professeur. Ce qui manque,
// c'est le bout de papier.
//
// Un billet seul tient sur un tiers de page. Il se redonne en passant dans les
// rangs, il ne dérange pas les vingt-neuf autres, et il ne touche à rien.
//
// Le comportement complet est vérifié au navigateur
// (tools/tmp/verifBillet.mjs) : la page s'ouvre, elle ne contient qu'un
// billet, c'est le bon, et le code est le même qu'avant. Ici on tient le
// CÂBLAGE, que rien d'autre ne signalerait s'il se défaisait.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('../js/ui/espaceClasses.js', import.meta.url), 'utf8');
/** Sans les commentaires : on teste des règles, pas des intentions. */
const NET = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('CHAQUE ÉLÈVE A SON BOUTON « billet »', () => {
    assert.match(NET, /data-billet="\$\{esc\(e\.id\)\}"/,
        'le bouton porte l\'identifiant de SON élève');
    assert.match(NET, /Réimprimer CE billet, sans changer son code/,
        'l\'infobulle dit ce qui le distingue de « code »');
});

test('…et il est branché', () => {
    // Le clic est délégué : un bouton absent du sélecteur ne fait rien, en
    // silence. C'est exactement le genre de défaut qu'aucun test d'exécution
    // ne voit et qu'aucune erreur ne signale.
    // Le fichier contient plusieurs `closest` : c'est celui qui énumère les
    // boutons de l'espace classes qu'on veut, repéré par un voisin sûr.
    const depart = NET.indexOf('[data-nouvelle-classe]');
    assert.ok(depart > 0, 'le sélecteur de délégation est trouvable');
    const selecteur = NET.slice(depart - 200, depart + 1200);
    assert.match(selecteur, /\[data-billet\]/, 'le sélecteur de délégation le connaît');
    assert.match(NET, /if \(d\.billet\) return imprimerLesBillets\(\[d\.billet\]\);/);
});

test('L\'IMPRESSION SAIT NE SORTIR QU\'UN BILLET', () => {
    assert.match(NET, /function imprimerLesBillets\(seulement\)/);
    assert.match(NET, /const gardes = new Set\(seulement\);/);
    assert.match(NET, /eleves = eleves\.filter\(e => gardes\.has\(e\.id\)\);/);
    // ET SANS ARGUMENT, ELLE LES SORT TOUS : le bouton d'en haut ne change pas.
    assert.match(NET, /if \(seulement && seulement\.length\)/,
        'la sélection est facultative');
});

test('la page dit ce qu\'elle est, et rassure', () => {
    // Un professeur qui réimprime un billet se demande s'il vient de casser
    // quelque chose. La page le lui dit avant qu'il ait à le demander.
    assert.match(NET, /Billet de \$\{esc\(eleves\[0\]\.prenom\)\}/);
    assert.match(NET, /l\\?'ancien billet reste valable/);
});
