// L'ALLURE D'UN EXERCICE CHRONOMÉTRÉ — et le cran qui manquait au bout.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, trois fois sur le même sujet :
//
//   1. « c'est hyper rapide au départ ! ralentis » — le vol de la balle passe
//      de 2 800 à 4 200 ms ;
//   2. « comment régler la durée sur chaque question ? » — l'allure devient un
//      réglage, et `core/allure.js` la pose pour les trois jeux à la fois ;
//   3. « il faudrait aussi pour les exercices à chrono rajouter encore une
//      option qui est plus lente que le plus bas ».
//
// À CHAQUE FOIS, LE CRAN LE PLUS LENT AVAIT ÉTÉ CALIBRÉ SUR CE QU'UN ADULTE
// TROUVE LENT. Ce fichier garde ce qui a été appris : il y a un cran au-delà
// de « Tranquille », il se SENT, et le menu l'offre partout où l'allure se
// règle — y compris dans les listes écrites à part, qui sont le vrai piège.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ALLURES, allureDe, PARAM_ALLURE } from '../js/core/allure.js';
import { RYTHMES } from '../js/core/duel.js';

test('IL Y A UN CRAN PLUS LENT QUE LE PLUS LENT', () => {
    assert.ok(ALLURES.ralenti > ALLURES.tranquille,
        `« ralenti » (${ALLURES.ralenti}) n'est pas plus lent que « tranquille » `
        + `(${ALLURES.tranquille})`);
});

test('ET IL SE SENT — un cran qu\'on ne perçoit pas n\'est pas un cran', () => {
    // L'écart jusqu'à « Tranquille » doit être du même ordre que celui qui
    // sépare « Tranquille » de « Normale », sans quoi on aurait ajouté une
    // ligne au menu plutôt qu'un palier à l'échelle.
    const neuf = ALLURES.ralenti / ALLURES.tranquille;
    const ancien = ALLURES.tranquille / ALLURES.normale;
    assert.ok(neuf >= ancien * 0.7,
        `le nouveau palier vaut ×${neuf.toFixed(2)} quand le précédent vaut `
        + `×${ancien.toFixed(2)} : il ne se sentira pas`);
});

test('LE MENU L\'OFFRE, et il est en tête — du plus lent au plus rapide', () => {
    const vals = PARAM_ALLURE.options.map(o => o.value);
    assert.equal(vals[0], 'ralenti', `l'ordre du menu est ${vals.join(' → ')}`);
    // ET CHAQUE ENTRÉE DU MENU DOIT EXISTER DANS LA TABLE : une option qui ne
    // correspond à aucun facteur se choisit sans rien changer, et c'est le
    // genre de panne qu'on ne voit jamais — l'ancien réglage « rythme » du
    // Ninja a vécu ainsi, sans être lu.
    for (const v of vals) {
        assert.ok(ALLURES[v], `l'option « ${v} » ne vaut aucun facteur`);
        assert.equal(allureDe({ allure: v }), ALLURES[v]);
    }
});

test('LES LISTES ÉCRITES À PART L\'OFFRENT AUSSI', () => {
    // LE VRAI PIÈGE EST LÀ. Trois exercices n'emploient pas `PARAM_ALLURE` :
    // ils ont leur propre `<select>`, avec leurs propres mots, parce que leur
    // aide parle de leur mécanique — un astéroïde qui descend, une balle qui
    // accélère. Ajouter le cran dans la table commune sans toucher à ces
    // listes l'aurait rendu inatteignable là où Rémy le demande.
    const fichiers = ['js/data/numeration.js', 'js/data/calcul.js'];
    for (const f of fichiers) {
        const src = readFileSync(f, 'utf8');
        const listes = src.match(/options: \[[\s\S]*?\]/g) || [];
        for (const l of listes) {
            if (!/value: 'tranquille'/.test(l)) continue;
            assert.match(l, /value: 'ralenti'/,
                `${f} : une liste d'allure n'offre pas le cran « ralenti »\n${l.slice(0, 200)}`);
        }
    }
});

test('LE DUEL AUSSI, et ses trois nombres bougent ensemble', () => {
    assert.ok(RYTHMES.ralenti, 'le duel n\'a pas de rythme « ralenti »');
    assert.ok(RYTHMES.ralenti.depart > RYTHMES.tranquille.depart,
        'le départ n\'est pas plus lent');
    // UN DÉPART LENT SUIVI D'UNE ACCÉLÉRATION BRUTALE REDONNE LE MÊME
    // SENTIMENT : c'est écrit dans `core/duel.js`, et c'est pour cela que le
    // plancher et la pente comptent autant que le départ.
    assert.ok(RYTHMES.ralenti.minimum > RYTHMES.tranquille.minimum,
        'le plancher n\'a pas suivi : la balle finira aussi vite');
    assert.ok(RYTHMES.ralenti.acceleration > RYTHMES.tranquille.acceleration,
        'la pente n\'a pas suivi : la balle y arrivera aussi vite');
});
