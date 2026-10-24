// UNE VALEUR DE RÉGLAGE QUI N'EXISTE PAS NE DIT PAS QU'ELLE N'EXISTE PAS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// D'OÙ VIENT CETTE ÉPREUVE. Rémy, le 13 octobre, à propos de « Virgule ou
// Fraction ? » : « cocher par défaut » — les millièmes étaient déclarés mais
// partaient décochés. En allant les cocher, j'ai regardé ce que `generate` fait
// d'un rang qu'il ne connaît pas :
//
//     const choisis = (… params.rangs …).filter(r => RANGS[r]);
//
// Il le **jette sans rien dire**, et retombe sur son repli. Écrire
// `'millièmes'` avec son accent, ou `'milliemes '` avec une espace, donnerait
// donc un exercice qui a l'air réglé et qui ne l'est pas : le professeur coche,
// l'élève joue, et personne ne voit jamais un millième. C'est le défaut le plus
// cher de cette famille, parce qu'il ne se manifeste PAS — ni erreur, ni écran
// vide, ni épreuve rouge. Seule une lecture ligne à ligne du générateur le
// trouve, et on ne relit pas un générateur qu'on n'a pas écrit.
//
// CE QUE L'ÉPREUVE MESURE, et ce n'est pas qu'un garde-fou théorique : les
// 205 valeurs de réglage du catalogue ont été lues avant de l'écrire, et
// aucune n'était inventée. Elle ne corrige donc rien aujourd'hui — elle tient
// la porte pour le 226ᵉ exercice, celui qu'on écrira de mémoire.
//
// DEUX CÔTÉS, parce que le défaut peut venir des deux :
//   · l'EXERCICE qui nomme une valeur que son générateur ne déclare pas ;
//   · le GÉNÉRATEUR dont le `default` ne figure pas dans ses propres options.
//
// Le second est plus traître encore : il n'y a alors AUCUN endroit où lire la
// bonne orthographe, puisque celui qui la déclare est celui qui se trompe.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { exercices } from '../js/data/catalog.js';
import { allGenerators, allActivities } from '../js/core/registry.js';

/** Les valeurs qu'un menu déclare — `{ value, label }` ou la chaîne nue. */
function valeursDeclarees(param) {
    if (!param || !Array.isArray(param.options)) return null;
    if (!param.options.length) return null;
    return param.options.map(o => (o && typeof o === 'object' ? o.value : o));
}

/** Les paramètres à choix d'un porteur (générateur ou activité). */
function menusDe(porteur) {
    if (!porteur || !Array.isArray(porteur.params)) return [];
    return porteur.params.filter(p => valeursDeclarees(p));
}

test('AUCUN EXERCICE NE COCHE UNE VALEUR QUE SON GÉNÉRATEUR NE CONNAÎT PAS', () => {
    const parGenerateur = new Map(allGenerators().map(g => [g.id, g]));
    const parActivite = new Map(allActivities().map(a => [a.id, a]));

    const fautifs = [];
    let lues = 0;
    for (const exo of exercices) {
        // Un réglage d'exercice peut viser le générateur OU l'activité : on
        // réunit les deux, sans quoi l'épreuve accuserait tous les réglages
        // d'activité d'être inventés.
        const menus = [
            ...menusDe(parGenerateur.get(exo.generatorId)),
            ...menusDe(parActivite.get(exo.activityId))
        ];
        if (!menus.length) continue;
        // `printParams` règle la feuille imprimée, et il est soumis à la même
        // règle : une valeur inventée y donne une fiche qui n'obéit pas.
        const poses = { ...(exo.params || {}), ...(exo.printParams || {}) };
        for (const [clef, valeur] of Object.entries(poses)) {
            const menu = menus.find(m => m.id === clef);
            if (!menu) continue;                      // un nombre, une case à cocher
            const connues = valeursDeclarees(menu);
            for (const v of (Array.isArray(valeur) ? valeur : [valeur])) {
                lues++;
                if (connues.includes(v)) continue;
                fautifs.push(`  · ${exo.id} — ${clef} = ${JSON.stringify(v)} ; `
                    + `déclarées : ${connues.map(c => JSON.stringify(c)).join(', ')}`);
            }
        }
    }

    // SANS CE SEUIL, L'ÉPREUVE PASSERAIT AU VERT EN NE LISANT RIEN. Elle l'a
    // fait : un import retiré, les générateurs ne s'enregistraient plus, et la
    // sonde a annoncé « 0 valeur lue — aucune valeur inventée ». Une mesure
    // qui ne mesure rien répond « tout va bien » exactement comme un logiciel
    // sain.
    assert.ok(lues > 150,
        `on n'a lu que ${lues} valeur(s) de réglage : la lecture du catalogue ne `
        + 'marche plus, et cette épreuve ne garde donc plus rien.');
    assert.equal(fautifs.length, 0,
        'des exercices cochent des valeurs que leur générateur ne déclare pas.\n'
        + 'Un générateur FILTRE ce qu\'il ne connaît pas — sans erreur, sans écran\n'
        + 'vide : le professeur règle, et rien ne change.\n'
        + fautifs.join('\n'));
});

test('AUCUN MENU NE SE DONNE UN DÉFAUT ABSENT DE SES PROPRES OPTIONS', () => {
    const fautifs = [];
    let lus = 0;
    for (const porteur of [...allGenerators(), ...allActivities()]) {
        for (const menu of menusDe(porteur)) {
            if (menu.default === undefined || menu.default === null) continue;
            const connues = valeursDeclarees(menu);
            for (const v of (Array.isArray(menu.default) ? menu.default : [menu.default])) {
                lus++;
                // Une liste vide est un défaut légitime — « rien de coché » —
                // et `[]` n'a aucune valeur à vérifier.
                if (connues.includes(v)) continue;
                fautifs.push(`  · ${porteur.id} — ${menu.id} : défaut `
                    + `${JSON.stringify(v)} ; déclarées : `
                    + `${connues.map(c => JSON.stringify(c)).join(', ')}`);
            }
        }
    }

    assert.ok(lus > 100,
        `on n'a lu que ${lus} défaut(s) de menu : la lecture ne marche plus.`);
    assert.equal(fautifs.length, 0,
        'des menus se donnent un défaut qui ne figure pas dans leurs options.\n'
        + 'Celui qui cherchera la bonne orthographe la lira là — c\'est-à-dire\n'
        + 'au seul endroit qui se trompe.\n'
        + fautifs.join('\n'));
});

test('LES TROIS RANGS DE « VIRGULE OU FRACTION ? » SONT COCHÉS', () => {
    // RÉMY, le 13 octobre : « cocher par défaut ». Les millièmes existaient
    // depuis le premier jour de cet exercice et ne sortaient jamais.
    //
    // Ce n'est pas le même garde que les deux ci-dessus : ceux-là gardent une
    // ORTHOGRAPHE, celui-ci garde une DÉCISION. Un rang retiré de cette liste
    // ne casse rien — il rend seulement muet un tiers du chapitre, et c'est
    // exactement la situation que Rémy a tranchée.
    const exo = exercices.find(e => e.id === 'num-fraction-decimale');
    assert.ok(exo, 'l\'exercice « Virgule ou Fraction ? » a disparu du catalogue.');
    assert.deepEqual([...(exo.params.rangs || [])].sort(),
        ['centiemes', 'dixiemes', 'milliemes'],
        'les trois rangs doivent partir cochés — Rémy : « cocher par défaut ».');

    const gen = allGenerators().find(g => g.id === 'num.fraction-decimale');
    assert.ok(gen, 'le générateur des fractions décimales a disparu.');
    const menu = gen.params.find(p => p.id === 'rangs');
    assert.deepEqual([...(menu.default || [])].sort(),
        ['centiemes', 'dixiemes', 'milliemes'],
        'le générateur et l\'exercice doivent cocher la même chose : un professeur '
        + 'qui part du générateur verrait sinon un réglage différent du catalogue.');
});
