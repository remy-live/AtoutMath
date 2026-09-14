// LE POLYCOPIÉ D'ÉQUATIONS. Rémy : « Tu peux faire un polycopé d'équations.
// Plusieurs colonnes et 3 lignes de pointillés en dessous. »
//
// Trois promesses, et aucune ne se voit à l'œil nu sur une feuille imprimée :
// que les équations soient les MÊMES que celles du jeu, que la solution soit
// toujours entière, et que le corrigé tienne dans les trois lignes réservées.

import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import { balanceFicheGenerator as G, redactionEquation } from '../js/core/generators/balanceFiche.js';
import { NIVEAUX, pese, etatInitial } from '../js/core/balance.js';
import { getExerciseById } from '../js/data/catalog.js';
// Le registre se remplit par effet de bord : sans cet import, `getGenerator`
// ne connaît aucun générateur et la fiche paraîtrait absente.
import '../js/core/activities/index.js';
import { generateurDeFiche, aUneFichePapier } from '../js/core/registry.js';

test('LA BALANCE A UNE FICHE, et c\'est ce générateur-là', () => {
    const exo = getExerciseById('alg-balance');
    assert.ok(exo, 'l\'exercice existe');
    // La balance n'a AUCUN générateur d'écran — elle a une activité. Sans
    // `printGeneratorId`, le catalogue conclurait « pas de fiche » et le bouton
    // d'impression n'apparaîtrait jamais.
    assert.equal(exo.printGeneratorId, 'alg.equation-fiche');
    assert.equal((generateurDeFiche(exo) || {}).id, 'alg.equation-fiche');
    assert.equal(aUneFichePapier(exo), true);
    // Rémy : « plusieurs colonnes et 3 lignes de pointillés en dessous ».
    assert.ok(exo.colonnesPapier >= 2, 'plusieurs colonnes');
    assert.equal(exo.lignesReponsePapier, 3);
    assert.ok(exo.consignePapier && exo.consignePapier.length > 10);
});

test('CHAQUE ÉQUATION EST VRAIE, et sa solution est entière', () => {
    for (let i = 0; i < 260; i++) {
        const it = G.generate({}, { rng: makeRng('eq' + i), index: i % 13, total: 13 });
        const { a, b, c, d } = it.meta.equation;
        const x = it.answer;
        assert.equal(Number.isInteger(x), true, `${it.prompt.papier} : x = ${x}`);
        assert.ok(x > 0, `${it.prompt.papier} : x doit être positif`);
        // L'égalité tient pour de bon — on la pèse comme la balance le fait.
        const etat = etatInitial({ a, b, c, d });
        assert.equal(pese(etat.g, x), pese(etat.d, x), `${it.prompt.papier} n'est pas vraie`);
        // Le membre de droite pèse : sinon le plateau porterait un ballon seul,
        // et l'équation demanderait du négatif des deux côtés.
        assert.ok(pese(etat.d, x) >= 1, `${it.prompt.papier} : droite vide`);
    }
});

test('L\'ÉQUATION S\'ÉCRIT COMME AU TABLEAU — « 5x − 5 », jamais « 5x + -5 »', () => {
    for (let i = 0; i < 120; i++) {
        const it = G.generate({}, { rng: makeRng('sy' + i), index: i % 13, total: 13 });
        assert.doesNotMatch(it.prompt.papier, /\+ ?-|-\d.*x/,
            `« ${it.prompt.papier} » : le signe appartient à l'opération`);
        assert.match(it.prompt.papier, /=/);
        // La question EST l'équation : « Résous » vit dans la consigne de la
        // fiche, et le répéter vingt fois volerait la moitié de chaque colonne.
        assert.doesNotMatch(it.prompt.papier, /[Rr]ésous/);
    }
});

test('LE CORRIGÉ TIENT DANS LES TROIS LIGNES RÉSERVÉES', () => {
    // Une feuille de solutions plus longue que la place laissée sur la feuille
    // d'exercices ne se compare plus ligne à ligne — et c'est la comparaison
    // qui corrige.
    for (let i = 0; i < 200; i++) {
        const it = G.generate({}, { rng: makeRng('r' + i), index: i % 13, total: 13 });
        const l = it.meta.redaction;
        // TROIS LIGNES ÉCRITES AU MAXIMUM, ET C'EST POURQUOI RÉMY EN DEMANDE
        // TROIS. La première ligne du corrigé est l'équation de départ — elle
        // est DÉJÀ imprimée en tête de la question, l'élève ne la recopie pas.
        // Restent au pire trois gestes : rassembler les boîtes, régler les
        // poids, partager. Mesuré sur les treize formes : « 4x + 1 = 2x + 13 »
        // est le cas le plus long, et il en écrit exactement trois.
        assert.ok(l.length >= 2 && l.length <= 4,
            `${it.prompt.papier} : ${l.length - 1} lignes à écrire pour 3 réservées`);
        assert.equal(l[0], it.prompt.papier, 'le corrigé repart de l\'équation');
        // La dernière ligne donne la valeur, et c'est la réponse attendue.
        assert.match(l[l.length - 1], new RegExp(`^x = ${it.answer}\\b`),
            `${it.prompt.papier} → ${l[l.length - 1]}`);
        // AUCUNE LIGNE EN DOUBLE : « x − 6 = 1 » écrivait « x = 7 » deux fois,
        // ce qui donnait à lire une quatrième étape qui n'existe pas.
        assert.equal(new Set(l.map(t => t.split('   ')[0])).size, l.length,
            `${it.prompt.papier} : une ligne répétée`);
    }
});

test('LE CORRIGÉ RASSEMBLE LES BOÎTES AVANT DE PARTAGER', () => {
    // C'est l'ordre que la balance impose par un refus — « 2x + 5 = 17 » ne se
    // partage pas tant que le 5 est là. Le papier ne peut pas dire le contraire.
    for (let i = 0; i < 40; i++) {
        const it = G.generate({}, { rng: makeRng('o' + i), index: 7 + (i % 6), total: 13 });
        const l = it.meta.redaction;
        const iPartage = l.findIndex(t => t.includes('partage'));
        const iBoites = l.findIndex(t => t.includes('x des deux côtés'));
        if (iPartage >= 0 && iBoites >= 0) {
            assert.ok(iBoites < iPartage, `${it.prompt.papier} : partagé avant de rassembler`);
        }
    }
});

test('LES TREIZE FORMES DU JEU SONT CELLES DE LA FICHE', () => {
    // Un second tirage « pour le papier » ferait deux exercices qui se
    // ressemblent au lieu d'un exercice avec deux faces.
    const marches = G.params[0].marches;
    assert.equal(marches.length, NIVEAUX.length);
    marches.forEach((m, i) => assert.ok(m.nom.includes(NIVEAUX[i].titre), m.nom));
    // Et chaque marche produit bien SA forme.
    NIVEAUX.forEach((n, i) => {
        const it = G.generate({}, { rng: makeRng('m' + i), index: i, total: NIVEAUX.length });
        assert.equal(it.meta.titre, n.titre);
    });
});

test('LA RÉDACTION D\'UNE ÉQUATION À POIDS MANQUANTS DIT « on ajoute »', () => {
    // « x − 5 = 3 » demande le geste que les autres n'exigent jamais : AJOUTER
    // des deux côtés. C'est celui qui manque le jour du contrôle.
    const l = redactionEquation({ a: 1, b: -5, c: 0, d: 3 });
    assert.match(l[1], /on ajoute 5 des deux côtés/);
    assert.match(l[l.length - 1], /^x = 8\b/);
});
