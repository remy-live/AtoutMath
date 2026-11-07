// AUCUN CARACTÈRE NE DOIT DEVENIR « ? » SUR LA FEUILLE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Le défaut que Rémy n'a PAS signalé, et qui était le plus grave de sa revue
// du poly : « |x − 5| ⩽ 1 » s'imprimait « |x - 5| ? 1 ». Le dépôt écrit le ⩽
// français partout ; la table des symboles du PDF ne connaissait que le ≤
// anglo-saxon, et le filet de sécurité de `pourPdf` remplaçait le signe par un
// point d'interrogation.
//
// EN CHERCHANT LES AUTRES, treize : ℕ ℤ ℚ ℝ — l'exercice sur les ensembles
// imprimait « ? — les rationnels » —, ∪ ∩ ∅ ∉ — « I ∩ J » devenait « I ? J »,
// la question posée à l'envers —, ① ②, et les exposants ⁺ ⁿ ˟.
//
// ── POURQUOI UNE ÉPREUVE, ET POURQUOI CELLE-CI ────────────────────────────
//
// Un « ? » au milieu d'une inégalité ne casse rien : la feuille sort, elle a
// le bon nombre de lignes, et toutes les autres épreuves sont vertes. Rien ne
// le voit, sauf un œil posé sur la bonne ligne du PDF — c'est-à-dire personne.
//
// CETTE ÉPREUVE EST UN FILET, PAS UNE LISTE. Elle ne vérifie pas que ⩽ est
// dans la table : elle BALAIE le catalogue entier en mode papier et exige zéro
// perte. Un exercice neuf qui emploiera un caractère de plus la fera tomber le
// jour où il arrive, et non six mois plus tard sur une feuille d'élève.
//
// Le balayage est celui de `tools/caracteresPerdus.mjs`, qui l'exporte : deux
// copies de ce parcours finiraient par ne plus chercher la même chose.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { caracteresPerdus } from '../tools/caracteresPerdus.mjs';

test('RIEN NE DEVIENT « ? » QUAND LE CATALOGUE PASSE SUR LE PAPIER', () => {
    // Quatre tirages par exercice : assez pour traverser les barreaux d'un
    // générateur à échelle, et l'épreuve tient en une seconde.
    const { perdus, tires } = caracteresPerdus(4);
    assert.ok(tires > 400, `${tires} questions tirées seulement`);
    if (perdus.size) {
        const dit = [...perdus.entries()]
            .sort((a, b) => b[1].n - a[1].n)
            .map(([c, f]) => `« ${c} » U+${c.codePointAt(0).toString(16).toUpperCase()}`
                + ` (${f.n} fois, ${[...f.exos].slice(0, 3).join(', ')})`)
            .join(' · ');
        assert.fail(`${perdus.size} caractère(s) s'impriment en « ? » : ${dit}`
            + ' — les ajouter à `SYMBOLE` ou à `HORS_TABLE` dans `js/ui/ficheRendu.js`,'
            + ' puis relancer `node tools/caracteresPerdus.mjs`');
    }
});
