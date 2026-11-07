// UN EXERCICE QUI A SON ÉCRAN À LUI N'EST PAS UN JEU POUR AUTANT.
//
// Rémy, revue du catalogue en v878 : « quelques remarques car il y a des choses
// qui ne sont pas des jeux ». Sur les quatre-vingts exercices que le catalogue
// comptait comme jeux, il en a récusé TRENTE-DEUX.
//
// LA DÉDUCTION NE DISAIT PAS CE QU'ON CROYAIT. « Un `activityId` sans
// `generatorId` » se lit « cet exercice a son écran à lui » — ce qui est vrai
// d'un jeu, et tout aussi vrai de la Dictée de Grands Nombres, du Tableau de
// Conversion, de la Rédaction de Thalès ou de Poser une opération. Aucun de ces
// quatre n'est un jeu ; chacun a bien son écran.
//
// MESURÉ : ancienne règle 80, décision de Rémy 48. Le rapport qu'il a collé
// annonçait « Comptés comme jeux : 48 (32 à reporter) » — c'est-à-dire sa revue
// DÉJÀ appliquée dans son navigateur. Le catalogue, lui, en disait 80. Les deux
// disent 48 maintenant, et c'est la vérification qui compte : on retombe sur
// SON chiffre, pas sur un chiffre à nous.
//
// POURQUOI ÉCRIRE LA LISTE ICI. Sans elle, la décision ne vit que dans le champ
// de trente-deux fiches, où un copier-coller la perd sans bruit — et la revue
// suivante redemanderait les mêmes trente-deux cases à cocher. C'est du travail
// de Rémy qu'on protège, pas une règle de code.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exercices } from '../js/data/catalog.js';
import { estJeuCatalogue } from '../js/core/revue.js';

/** Ce que Rémy a récusé le 29 septembre 2026, dans l'ordre de son rapport. */
const PAS_DES_JEUX = [
    'num-amis-de-dix', 'num-canon-complements', 'num-dictee', 'alg-balance',
    'num-virgule', 'calc-prio-relatifs', 'calc-prio-cascade', 'calc-compte-est-bon',
    'calc-poser', 'calc-poser-multiplication', 'calc-labyrinthe', 'calc-vault',
    'calc-arpenteurs', 'log-tasuko', 'calc-pyramide-nombres', 'calc-diviseurs',
    'calc-chantier', 'logi-hexagrille', 'calc-bons-chemins', 'num-problemes',
    'num-proportion-tableau', 'calc-point-a-point', 'frac-samurai', 'frac-pizza',
    'geo-quadri-morph', 'geo-quadrilateres', 'geo-automate', 'geo-thales-redaction',
    'geo-trigo-cotes', 'mes-conversion', 'don-tableau-croise', 'don-tableur'
];

test('LE CATALOGUE DIT CE QU\'IL SAIT AU LIEU DE LE DEVINER', () => {
    // Un champ explicite l'emporte sur la déduction, dans les deux sens : c'est
    // ce qui permet aussi de DÉCLARER un jeu que la déduction manquerait.
    assert.equal(estJeuCatalogue({ activityId: 'x', jeu: false }), false);
    assert.equal(estJeuCatalogue({ activityId: 'x', generatorId: 'g', jeu: true }), true);
    // Et la déduction reste le défaut pour tout ce qui n'a pas été tranché.
    assert.equal(estJeuCatalogue({ activityId: 'x' }), true);
    assert.equal(estJeuCatalogue({ activityId: 'x', generatorId: 'g' }), false);
});

test('LES TRENTE-DEUX QUE RÉMY A RÉCUSÉS LE DISENT DANS LE CATALOGUE', () => {
    const manquants = [];
    for (const id of PAS_DES_JEUX) {
        const e = exercices.find(x => x.id === id);
        assert.ok(e, `${id} doit exister au catalogue`);
        if (e.jeu !== false) manquants.push(id);
    }
    assert.deepEqual(manquants, [],
        'ces exercices ont leur écran à eux, mais ce ne sont pas des jeux — et '
        + 'sans le champ, la revue suivante redemanderait les mêmes cases');
});

test('AUCUN EXERCICE NE CONTREDIT LA DÉDUCTION EN SILENCE', () => {
    // LA PREMIÈRE VERSION DE CETTE ÉPREUVE ÉPINGLAIT UN NOMBRE : « l'écart
    // entre les deux règles vaut 32 ». Elle est tombée dans l'heure — sur
    // l'exercice suivant, `calc-prio-oppose`, qui a lui aussi son écran à lui
    // sans être un jeu. Elle mesurait donc la TAILLE du catalogue autant que la
    // règle, et elle serait tombée à chaque exercice neuf, pour rien.
    //
    // CE QUI NE BOUGE PAS, EN REVANCHE : partout où la déduction et le
    // catalogue divergent, c'est qu'on l'a DIT. Une divergence sans champ
    // explicite serait un exercice dont personne n'a tranché le cas — et c'est
    // exactement ce qu'on veut interdire.
    const muets = exercices.filter(e =>
        estJeuCatalogue(e) !== !!(e.activityId && !e.generatorId)
        && typeof e.jeu !== 'boolean');
    assert.deepEqual(muets.map(e => e.id), [],
        'un exercice ne peut démentir la déduction que par un champ `jeu` écrit');
    // ET LES TRENTE-DEUX NE SONT PLUS COMPTÉS — c'est la conséquence qu'on
    // cherchait, dite sur les exercices eux-mêmes plutôt que sur un total.
    const comptes = PAS_DES_JEUX.filter(id => estJeuCatalogue(exercices.find(x => x.id === id)));
    assert.deepEqual(comptes, [], 'aucun des exercices récusés ne compte encore comme jeu');
});
