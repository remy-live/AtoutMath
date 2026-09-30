// UNE LIGNE INTERMÉDIAIRE JUSTE DOIT ÊTRE ACCEPTÉE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture à l'appui, sur « Enlever les parenthèses » :
//
//     −(+3) − (−7)
//     « Réécris la ligne SANS parenthèses. Ne la calcule pas encore. »
//     il tape −3+7, bordure rouge : « il me compte faux »
//
// LE JUGE NE JUGEAIT RIEN. `litteralSaisie.validerEtape` lisait `e.verifie` —
// un champ que PERSONNE ne fournit dans tout le dépôt. Le verdict valait
// `false` à tous les coups : TOUTE ligne intermédiaire était refusée, y compris
// celle que l'activité finit par écrire elle-même au bout de trois essais.
//
// POURQUOI AUCUNE ÉPREUVE NE L'AVAIT VU, et c'est le vrai enseignement : le
// juge vivait DANS l'activité, et l'activité touche le document dès qu'on
// l'importe. `node --test` y tombe sur « document is not defined ». Il était
// donc hors d'atteinte de tout ce qui aurait pu le garder, et il a pu rester
// cassé en silence aussi longtemps qu'il a voulu. Il vit maintenant dans
// `core/ligneEtape.js`, où il s'éprouve en deux lignes — et ces deux lignes,
// les voici.
//
// LA SONDE `tools/lignesIntermediaires.mjs` REFAIT LE GESTE AU NAVIGATEUR :
// elle lit l'énoncé, recalcule la ligne, la tape sur le pavé de l'écran et
// vérifie qu'elle est posée dans la chaîne. Les deux se complètent — celle-ci
// garde la règle, celle-là garde le câblage.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { jugerEtape } from '../js/core/ligneEtape.js';
import { makeRng } from '../js/core/ids.js';
import { opposeEnleverGenerator } from '../js/core/generators/oppose.js';

const vrai = (v) => (typeof v === 'object' ? !!v.juste : !!v);

test('LA LIGNE DE LA CAPTURE DE RÉMY EST ACCEPTÉE', () => {
    // −(+3) − (−7) se réécrit −3 + 7. Il a tapé « −3+7 », sans les espaces.
    const e = { montrer: '−3 + 7' };
    assert.ok(vrai(jugerEtape(e, '−3+7')), 'sans les espaces');
    assert.ok(vrai(jugerEtape(e, '−3 + 7')), 'avec les espaces');
    assert.ok(vrai(jugerEtape(e, '-3+7')), 'avec le trait d\'union du clavier');
    // LE « + » DE TÊTE EST FACULTATIF — la réponse de Rémy à la question posée
    // en son temps : « 4 − 5 » et « +4 − 5 » disent la même chose.
    assert.ok(vrai(jugerEtape({ montrer: '4 − 5' }, '+4 − 5')));
    assert.ok(vrai(jugerEtape({ montrer: '+4 − 5' }, '4−5')));
});

test('ET CE QUI EST FAUX RESTE FAUX', () => {
    // Un juge qui dit oui à tout ne vaudrait pas mieux que celui qui disait
    // non à tout : c'est le même défaut, de l'autre côté.
    const e = { montrer: '−3 + 7' };
    assert.ok(!vrai(jugerEtape(e, '3 + 7')), 'le signe du premier terme compte');
    assert.ok(!vrai(jugerEtape(e, '−3 − 7')), 'celui du second aussi');
    assert.ok(!vrai(jugerEtape(e, '4')), 'le résultat n\'est pas la ligne demandée');
    assert.ok(!vrai(jugerEtape(e, '')), 'une ligne vide n\'est pas une réponse');
    assert.ok(!vrai(jugerEtape(e, '   ')), 'des espaces non plus');
    // UNE ÉTAPE SANS LIGNE ATTENDUE NE PEUT PAS ÊTRE JUGÉE, et l'on ne fait
    // pas semblant.
    assert.ok(!vrai(jugerEtape({ titre: 'sans montrer' }, 'quoi que ce soit')));
    assert.ok(!vrai(jugerEtape(null, '−3+7')));
});

test('LE JUGE DE L\'ÉTAPE GARDE LA PRIORITÉ QUAND IL Y EN A UN', () => {
    // Pour le jour où une étape aura plusieurs écritures justes qu'une
    // comparaison de chaînes ne peut pas reconnaître : une factorisation, où
    // (x − 3)(x + 3) et (x + 3)(x − 3) sont tous deux bons.
    const e = { montrer: '(x − 3)(x + 3)', verifie: (t) => ({ juste: /x/.test(t) }) };
    assert.ok(vrai(jugerEtape(e, '(x + 3)(x − 3)')), 'le juge de l\'étape l\'emporte');
    assert.ok(!vrai(jugerEtape(e, '42')));
});

test('ET LES ÉTAPES QUE LE CATALOGUE PRODUIT PASSENT VRAIMENT SON JUGE', () => {
    // L'ÉPREUVE CI-DESSUS TIENT LA RÈGLE, PAS LE CÂBLAGE. Un générateur qui
    // écrirait sa ligne attendue sous un autre nom que `montrer` la ferait
    // passer au vert sans que l'exercice soit jouable — c'est exactement la
    // forme du défaut qu'on vient de corriger. On prend donc les étapes que
    // l'exercice de Rémy produit VRAIMENT, et on les juge.
    for (const marche of ['deuxNombres', 'dedansDabord', 'deuxParentheses']) {
        for (let k = 0; k < 12; k++) {
            const item = opposeEnleverGenerator.generate({ marches: [marche] },
                { rng: makeRng(`etape-${marche}-${k}`), index: 0, total: 8 });
            const etapes = (item.meta || {}).etapes || [];
            assert.ok(etapes.length >= 1,
                `${marche} : aucune ligne intermédiaire à écrire`);
            for (const e of etapes) {
                assert.ok(vrai(jugerEtape(e, String(e.montrer))),
                    `${marche} : la ligne « ${e.montrer} » que le logiciel pose `
                    + 'lui-même est refusée par son propre juge');
                // Et sans les espaces, comme Rémy l'a tapée.
                assert.ok(vrai(jugerEtape(e, String(e.montrer).replace(/\s+/g, ''))),
                    `${marche} : « ${e.montrer} » refusée quand on ôte les espaces`);
            }
        }
    }
});

test('LE JUGE RESTE HORS DE L\'ACTIVITÉ, POUR RESTER ÉPROUVABLE', () => {
    // C'est la raison d'être du fichier, et elle se perd en une ligne : il
    // suffit de recopier la comparaison dans l'activité pour retrouver un juge
    // que `node --test` ne peut plus atteindre.
    const src = readFileSync(new URL('../js/core/activities/litteralSaisie.js',
        import.meta.url), 'utf8');
    assert.match(src, /import \{ jugerEtape \} from '\.\.\/ligneEtape\.js';/,
        'l\'activité doit appeler le juge éprouvable, pas le sien');
    assert.match(src, /const v = jugerEtape\(e, saisie\);/,
        'et c\'est bien lui qui juge la ligne intermédiaire');
});
