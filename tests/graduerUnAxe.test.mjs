// GRADUER UN AXE — sa page « Ordre · Axe », exercices 13 et 15.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY envoie une page de ses fiches et demande : « on a ce genre d'exercice ? »
// Deux de ses trois colonnes étaient couvertes — « La Loupe sur la Droite » LIT
// une abscisse, « Le Dessin Gradué » POSE un point. La troisième ne l'était
// pas : GRADUER.
//
// CE QUE CES ÉPREUVES GARDENT, et pourquoi chacune a été écrite :
//
//   · LA QUESTION EST POSSIBLE. C'est le défaut qu'on a mesuré en la jouant :
//     avec `answerKind: 'choice'`, le pavé laisse la place aux propositions et
//     NE S'AFFICHE PAS. Les trois cases étaient dessinées, elles portaient leur
//     `data-trou`, et il n'y avait aucun moyen d'écrire dedans. Rien ne plante,
//     rien ne prévient.
//   · LES TROIS MARCHES SONT TROIS ZOOMS DIFFÉRENTS. L'ordre des arguments de
//     `marcheAuRang` est (index, marches) ; je l'avais à l'envers, et les trois
//     marches dessinaient le même axe des dixièmes. Rien ne plantait là non
//     plus.
//   · LES CASES NE SE RECOUVRENT PAS. C'est la photo qui l'a dit : une case au
//     cran 9 passait par-dessus l'étiquette du bord droit.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { graduerAxeGenerator as G } from '../js/core/generators/graduerAxe.js';

const MARCHES = ['dixiemes', 'centiemes', 'milliemes'];
const item = (marche, i) => G.generate({ marches: [marche] },
    { rng: makeRng(`ga-${marche}-${i}`), index: 0, total: 3 });

test('LA QUESTION EST POSSIBLE : trois cases, et le pavé pour y écrire', () => {
    for (const m of MARCHES) {
        for (let i = 0; i < 12; i++) {
            const it = item(m, i);
            const ou = `${m} #${i}`;
            // TROIS SOURCES QUI DOIVENT DIRE LA MÊME CHOSE : les morceaux de
            // la réponse, les `[data-trou]` de l'énoncé, et `meta.cases`. Le
            // pavé, lui, COMPTE les trous du HTML.
            assert.equal(String(it.answer).split('|').length, 3,
                `${ou} : la réponse n’a pas trois morceaux`);
            assert.equal((it.prompt.html.match(/data-trou=/g) || []).length, 3,
                `${ou} : il n’y a pas trois cases dans l’énoncé`);
            assert.equal(it.meta.cases, 3, `${ou} : les cases ne sont pas déclarées`);
            // LE PAVÉ NE S'AFFICHE QUE SUR `numeric`. Avec `choice`, les
            // propositions prennent toute la place et l'élève n'a rien pour
            // écrire : la question devient impossible, sans un mot.
            assert.equal(it.answerKind, 'numeric',
                `${ou} : avec « choice », le pavé disparaît derrière les propositions`);
            // ET LA VIRGULE EST SUR LE PAVÉ : sans elle, il n’y a rien à écrire.
            assert.equal(it.meta.decimal, true, `${ou} : pas de virgule au pavé`);
            // LE CORRIGÉ IMPRIMÉ NE MONTRE PAS LA FORME INTERNE.
            assert.ok(!String(it.reponsePapier).includes('|'),
                `${ou} : le corrigé imprime « ${it.reponsePapier} »`);
        }
    }
});

test('LES TROIS MARCHES SONT TROIS ZOOMS, ET CHACUNE SE RECONNAÎT À SES BOUTS', () => {
    const pas = new Set();
    for (const m of MARCHES) {
        for (let i = 0; i < 12; i++) {
            const it = item(m, i);
            pas.add(it.meta.pas);
            // LE BOUT GAUCHE MONTRE LA PROFONDEUR DU ZOOM. Un axe des centièmes
            // qui irait de 6 à 6,1 s'écrit « 6 » et « 6,1 » : exactement un axe
            // des dixièmes vu de loin, et l'élève reconnaît le zoom aux nombres
            // des bouts avant de compter quoi que ce soit.
            const attendu = { dixiemes: 0, centiemes: 1, milliemes: 2 }[m];
            const decimales = (String(it.meta.debut).split('.')[1] || '').length;
            assert.equal(decimales, attendu,
                `${m} : l’axe commence à ${it.meta.debut}, qui ne montre pas son zoom`);
        }
    }
    assert.equal(pas.size, 3,
        'les trois marches doivent donner trois pas différents — avec les '
        + 'arguments de `marcheAuRang` à l’envers, elles dessinaient toutes '
        + 'l’axe des dixièmes, et rien ne le disait');
});

test('LES CASES NE RECOUVRENT NI LES BOUTS NI LEURS VOISINES', () => {
    for (const m of MARCHES) {
        for (let i = 0; i < 20; i++) {
            const { crans } = item(m, i).meta;
            const ou = `${m} #${i} (${crans.join(', ')})`;
            // PAS AUX CRANS 0, 1, 9 NI 10 : une case y passe par-dessus
            // l'étiquette du bout. Mesuré sur la photo — « 9,19 » recouvrait le
            // « 9,2 » du bord droit, et les deux devenaient illisibles.
            assert.ok(crans[0] >= 2 && crans[crans.length - 1] <= 8,
                `${ou} : une case touche un bout de l’axe`);
            // DEUX CRANS D'ÉCART AU MOINS : à un cran, deux cases de millièmes
            // se chevauchent.
            for (let k = 1; k < crans.length; k++) {
                assert.ok(crans[k] - crans[k - 1] >= 2,
                    `${ou} : deux cases voisines se chevauchent`);
            }
        }
    }
});

test('LES TROIS FAUTES DU CHAPITRE SONT DANS LES PROPOSITIONS', () => {
    let vues = 0;
    for (const m of ['centiemes', 'milliemes']) {
        for (let i = 0; i < 10; i++) {
            const it = item(m, i);
            const bonnes = (it.choices || []).filter(c => c.correct);
            assert.equal(bonnes.length, 1, `${m} #${i} : pas une seule bonne réponse`);
            assert.equal(bonnes[0].value, it.answer);
            // AUCUN DISTRACTEUR NE VAUT LA BONNE RÉPONSE. Les fautes se
            // rejoignent parfois d'elles-mêmes, et une proposition en double
            // rend la question injuste.
            const vals = (it.choices || []).map(c => String(c.value));
            assert.equal(new Set(vals).size, vals.length,
                `${m} #${i} : deux propositions identiques`);
            // ET AUCUNE ÉTIQUETTE NE MONTRE LA FORME INTERNE : « 8,14|8,17 »
            // est ce que le pavé envoie, pas ce qu’un élève lit sur un bouton.
            (it.choices || []).forEach(c => assert.ok(!String(c.label).includes('|'),
                `${m} #${i} : une proposition montre « ${c.label} »`));
            // LA FAUTE D'ÉCHELLE EST LÀ — celle qui compte juste et compte à
            // l'échelle du dessus. C'est LA faute de ce chapitre.
            const pourquoi = (it.choices || []).map(c => c.why || '').join(' ');
            assert.match(pourquoi, /l'échelle non|échelle/,
                `${m} #${i} : la faute d’échelle n’est pas proposée`);
            assert.match(pourquoi, /INTERVALLES/,
                `${m} #${i} : la faute des traits comptés n’est pas proposée`);
            vues += 1;
        }
    }
    assert.ok(vues >= 20, `seulement ${vues} questions examinées`);
});

test('ET LA FEUILLE SAIT QUOI DESSINER', () => {
    // LE RENDU IMPRIMÉ LIT `meta` : les crans où poser une case, les valeurs du
    // corrigé, et de quoi retrouver la géométrie de l'axe. Sans l'un d'eux, la
    // feuille sort des axes vides — ce qui est, mot pour mot, une feuille
    // impossible à faire.
    const it = item('milliemes', 0);
    for (const clef of ['crans', 'valeurs', 'debut', 'fin', 'rang', 'intervalles']) {
        assert.ok(it.meta[clef] !== undefined, `la feuille n’a pas « ${clef} »`);
    }
    assert.equal(it.meta.crans.length, it.meta.valeurs.length);
    // ET `rang` EST LU PAR LA FEUILLE : la table des zooms de `nombres.js`
    // s'arrête aux centièmes, et une table à allonger à la main est une table
    // qu'on oublie.
    assert.equal(it.meta.rang, 3);
});
