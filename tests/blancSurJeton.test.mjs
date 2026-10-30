// Le blanc ne se pose que sur les jetons faits pour le porter.
//
// POURQUOI CE TEST LANCE UN OUTIL AU LIEU DE REFAIRE SA LECTURE. La règle tient
// en une phrase mais sa vérification lit six feuilles de style, sépare les
// commentaires du code, suit la cascade des cinq thèmes et distingue
// `var(--danger)` de `var(--danger-fond)`. Réécrire tout cela ici en ferait une
// seconde version, qui se démoderait sans qu'on le sache — et c'est le premier
// des deux qu'on lirait le jour d'un désaccord. L'outil est donc la référence,
// et ce test dit seulement : « il passe ».
//
// CE QU'IL GARDE. Le 27 septembre, cette règle a trouvé VINGT-SIX endroits où
// du blanc était posé sur `--accent`, `--danger`, `--success` ou `--warning` :
// la taupe du jeu de rapidité (2,14), les cases de la table de Pythagore
// (2,54 et 3,76), la pastille du carnet d'erreurs (3,76), l'œil de l'alarme du
// direct (2,15), et trois boutons dont le dégradé finissait sur le bleu ciel —
// lisibles à gauche, illisibles à droite.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('AUCUNE RÈGLE NE POSE DU BLANC SUR UNE COULEUR VIVE', () => {
    let sortie = '';
    let code = 0;
    try {
        sortie = execFileSync(process.execPath, ['tools/blancSurJeton.mjs'],
            { encoding: 'utf8' });
    } catch (e) {
        sortie = String(e.stdout || '') + String(e.stderr || '');
        code = e.status === undefined ? 1 : e.status;
    }
    assert.equal(code, 0, 'tools/blancSurJeton.mjs a trouvé un défaut :\n' + sortie);
    assert.match(sortie, /aucune — le blanc ne se pose que sur les jetons faits pour lui/);
    // ET LA FAMILLE DES JETONS DE FOND TIENT SA PROMESSE, dans les cinq thèmes :
    // c'est l'autre moitié de la règle, et la seule qui la rende applicable.
    assert.ok(!/RATÉ\s+--/.test(sortie),
        'un jeton de fond ne porte plus le blanc :\n' + sortie);
});
