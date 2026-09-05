// LES MARCHES D'UNE PROGRESSION : lesquelles on travaille, et comment elles se
// partagent l'exercice.
//
// Rémy : « il faudrait pouvoir choisir les niveaux par checkbox, avoir un
// nombre de questions que ça change le nombre de questions, et avoir la même
// chose avec un peu le diagramme en barres. »
//
// TROIS QUESTIONS ÉTAIENT DANS UN SEUL MENU — quelles marches, combien de
// questions, comment elles se partagent. Ce qu'on éprouve ici, c'est qu'elles
// sont maintenant séparées, et surtout que LA SOMME EST TOUJOURS JUSTE : une
// question qui tomberait entre deux marches serait une question sans contenu.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
    SANS_GROUPE_MAX, PAR_MARCHE_DEFAUT,
    normaliserMarches, marchesCochees, groupesDeMarches, decoupeMarches, partageEgal,
    ecrireLongueurs, lireLongueurs, poserBorne, marcheAuRang, conseilProgression,
    motsDeCoupe, paramMarches, totalDe
} from '../js/core/progression.js';
import { questionsConseillees } from '../js/core/duree.js';
import { relatifsAdditionGenerator } from '../js/core/generators/relatifsAddition.js';
import { makeRng } from '../js/core/ids.js';

/** Douze marches, trois temps — la forme de « Additionner des relatifs ». */
const DOUZE = Array.from({ length: 12 }, (_, i) => ({
    id: `m${i + 1}`, nom: `${i + 1}. Marche`, groupe: 'ABC'[Math.floor(i / 4)]
}));
const SIX = Array.from({ length: 6 }, (_, i) => ({ id: `n${i + 1}`, nom: `${i + 1}. Niveau` }));

// --- Ce qui est coché ---------------------------------------------------------

test('PAR DÉFAUT, TOUT EST COCHÉ — c\'est ce que disait « progressif »', () => {
    assert.equal(marchesCochees({}, DOUZE).length, 12);
    assert.equal(marchesCochees(null, DOUZE).length, 12);
});

test('L\'ORDRE VIENT DE LA PROGRESSION, jamais de l\'ordre des clics', () => {
    // Cocher la 7 avant la 3 ne veut pas dire qu'on veut la 7 d'abord : une
    // progression est une progression.
    const c = marchesCochees({ marches: ['m7', 'm3', 'm1'] }, DOUZE);
    assert.deepEqual(c.map(m => m.id), ['m1', 'm3', 'm7']);
});

test('TOUT DÉCOCHER NE VIDE PAS L\'EXERCICE', () => {
    // C'est un geste qu'on fait en passant, pour tout recocher ensuite. Un
    // exercice sans aucune marche n'aurait rien à poser.
    assert.equal(marchesCochees({ marches: [] }, DOUZE).length, 12);
    assert.equal(marchesCochees({ marches: ['inconnu'] }, DOUZE).length, 12);
});

test('LES RÉGLAGES D\'AVANT LES CASES SE RELISENT', () => {
    // Un parcours enregistré porte `etape: 'progressif'`, `etape: 'B'` ou
    // l'identifiant d'une marche. Les lire comme « rien de coché » viderait
    // l'exercice ; les ignorer effacerait un choix que le professeur a posé.
    const anc = { cle: 'etape' };
    assert.equal(marchesCochees({ etape: 'progressif' }, DOUZE, anc).length, 12);
    assert.deepEqual(marchesCochees({ etape: 'B' }, DOUZE, anc).map(m => m.id),
        ['m5', 'm6', 'm7', 'm8']);
    assert.deepEqual(marchesCochees({ etape: 'm9' }, DOUZE, anc).map(m => m.id), ['m9']);
    // Et le nouveau nom l'emporte quand les deux sont là.
    assert.deepEqual(marchesCochees({ etape: 'B', marches: ['m1'] }, DOUZE, anc).map(m => m.id),
        ['m1']);
});

test('LES FORMES COURTES DU CODE SONT ACCEPTÉES', () => {
    // Les générateurs écrivent `titre`, `label` ou `temps` selon leur âge : on
    // ne renomme pas treize fichiers pour un seul champ.
    const n = normaliserMarches([{ id: 'a', titre: 'Un' }, { id: 'b', label: 'Deux', temps: 'A' }]);
    assert.deepEqual(n, [{ id: 'a', nom: 'Un', groupe: null }, { id: 'b', nom: 'Deux', groupe: 'A' }]);
});

// --- Les groupes, qui rendent la liste lisible --------------------------------

test('AU-DELÀ DE HUIT MARCHES, LA LISTE SE PLIE EN TEMPS', () => {
    // Rémy : « pour un exercice des nombres relatifs il y a beaucoup d'étapes,
    // ça risque d'être illisible ». Douze cases à la file sur un téléphone, en
    // effet — mais le groupement existe déjà dans le code, et il est
    // pédagogique.
    const g = groupesDeMarches(DOUZE, { A: 'A — même signe' });
    assert.equal(g.length, 3);
    assert.equal(g[0].nom, 'A — même signe');
    assert.equal(g[0].marches.length, 4);
    // SOUS HUIT, AUCUN GROUPE : un pli et un clic pour la même liste.
    assert.equal(groupesDeMarches(SIX), null);
    assert.ok(SANS_GROUPE_MAX >= 6);
    // Et pas de groupe non plus quand le générateur n'en déclare pas — Rémy :
    // « non, pas pour le moment » (on n'en invente pas).
    assert.equal(groupesDeMarches(Array.from({ length: 10 },
        (_, i) => ({ id: `x${i}`, nom: `${i}` }))), null);
});

// --- Le partage ---------------------------------------------------------------

test('LES MARCHES SE PARTAGENT LES QUESTIONS, le reste aux dernières', () => {
    assert.deepEqual(partageEgal(6, 12), [2, 2, 2, 2, 2, 2]);
    assert.deepEqual(partageEgal(4, 12), [3, 3, 3, 3]);
    // Tout donner à la SEULE dernière — ce que faisait `core/pythagore.js` —
    // creusait un trou : dix questions sur six marches y faisaient 1-1-1-1-1-5.
    assert.deepEqual(partageEgal(6, 10), [1, 1, 2, 2, 2, 2]);
    assert.deepEqual(partageEgal(4, 10), [2, 2, 3, 3]);
});

test('LA SOMME EST TOUJOURS LE TOTAL — l\'invariant qui compte', () => {
    // Une question qui tomberait entre deux marches serait une question sans
    // contenu.
    for (let m = 1; m <= 13; m++) {
        for (let n = 1; n <= 50; n++) {
            const liste = Array.from({ length: m }, (_, k) => ({ id: `z${k}`, nom: `${k}` }));
            const somme = decoupeMarches(liste, n, {}).reduce((s, z) => s + z.n, 0);
            assert.equal(somme, n, `${m} marches, ${n} questions`);
        }
    }
});

test('MOINS DE QUESTIONS QUE DE MARCHES : les dernières restent en creux', () => {
    // On ne triche pas. La barre montre les marches sans question, et c'est ce
    // qui dit au professeur qu'il faut rallonger ou décocher.
    const c = decoupeMarches(DOUZE, 10, {});
    assert.equal(c.length, 12, 'les douze restent dans la barre');
    assert.deepEqual(c.map(z => z.n), [...Array(10).fill(1), 0, 0]);
    const mots = (marches, total, params) => motsDeCoupe(decoupeMarches(marches, total, params));
    assert.match(mots(DOUZE, 10, {}), /10 marches sur 12/);
    assert.match(mots(DOUZE, 10, {}), /aucune question/);
    // ET LA PHRASE SUIT LA BORNE. Vider une marche à la main doit s'entendre
    // dans le texte comme cela se voit dans la barre : c'est le défaut qui a
    // fait passer la phrase du couple (marches, total) au découpage.
    const sept = DOUZE.slice(0, 7);
    assert.match(mots(sept, 10, {}), /pour 7 marches/);
    assert.match(mots(sept, 10, { repartitionMarches: '2,0,1,1,2,2,2' }), /6 marches sur 7/);
});

// --- La borne qu'on tire -------------------------------------------------------

test('TIRER UNE BORNE NE CHANGE PAS LE TOTAL', () => {
    // C'est la propriété qui compte, et c'est celle de la frise du QCM : le
    // nombre de questions se règle ailleurs, et lui seul.
    const parts = [2, 2, 2, 2];
    for (let coupe = -3; coupe <= 12; coupe++) {
        const out = poserBorne(parts, 1, coupe);
        assert.equal(out.reduce((s, n) => s + n, 0), 8, `coupe ${coupe}`);
    }
    assert.deepEqual(poserBorne([2, 2, 2, 2], 1, 5), [2, 3, 1, 2]);
    // UNE MARCHE PEUT TOMBER À ZÉRO : elle reste cochée, elle reste dans la
    // barre, et on la remplit en tirant dans l'autre sens. C'est réversible,
    // donc c'est permis — contrairement aux zones de l'aide, qui
    // disparaîtraient avec leur réglage.
    assert.deepEqual(poserBorne([2, 2, 2, 2], 1, 2), [2, 0, 4, 2]);
    // Une borne au bord ne fait rien plutôt que de casser la liste.
    assert.deepEqual(poserBorne([2, 2], 5, 1), [2, 2]);
});

test('UNE RÉPARTITION ÉCRITE SE RELIT, ET SE RECALE', () => {
    // On coche une marche de plus, on raccourcit l'exercice : une répartition
    // écrite hier ne peut pas être crue sur parole.
    assert.deepEqual(lireLongueurs('2,3,1', 3, 6), [2, 3, 1]);
    assert.deepEqual(lireLongueurs('2,3,1', 4, 6), [2, 3, 1, 0], 'une marche de plus');
    assert.deepEqual(lireLongueurs('2,3,1', 3, 10), [2, 3, 5], 'la dernière absorbe l\'écart');
    assert.deepEqual(lireLongueurs('9,9,9', 3, 6), [6, 0, 0], 'et l\'écart peut être négatif');
    assert.equal(lireLongueurs('', 3, 6), null);
    assert.equal(lireLongueurs('auto', 3, 6), null);
    assert.equal(ecrireLongueurs([{ n: 2 }, { n: 0 }, { n: 4 }]), '2,0,4');
    // La somme reste juste dans tous les cas.
    ['1', '1,1', '50,50', '0,0,0'].forEach(txt => {
        assert.equal(lireLongueurs(txt, 4, 12).reduce((s, n) => s + n, 0), 12, txt);
    });
});

// --- La marche de chaque question ---------------------------------------------

test('CHAQUE QUESTION TOMBE SUR SA MARCHE', () => {
    const rangs = (n) => Array.from({ length: n }, (_, i) => marcheAuRang(i, SIX, n, {}));
    assert.deepEqual(rangs(12), ['n1', 'n1', 'n2', 'n2', 'n3', 'n3', 'n4', 'n4', 'n5', 'n5', 'n6', 'n6']);
    assert.deepEqual(rangs(6), ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'], 'six questions : on VISITE');
    // UNE MARCHE VIDE EST SAUTÉE : elle est dans la barre, pas dans l'exercice.
    const p = { repartitionMarches: '2,0,2,2,2,2' };
    const vus = Array.from({ length: 10 }, (_, i) => marcheAuRang(i, SIX, 10, p));
    assert.ok(!vus.includes('n2'), `la marche vide ne doit pas être posée : ${vus.join(' ')}`);
    assert.equal(vus.length, 10);
});

test('SANS LE TOTAL, on retombe sur le compte historique', () => {
    // Une vignette de catalogue, un aperçu papier : la longueur n'existe pas
    // encore. Le pire qui puisse arriver est alors que rien ne change.
    const rangs = Array.from({ length: 8 }, (_, i) => marcheAuRang(i, SIX, 0, {}));
    assert.deepEqual(rangs, ['n1', 'n1', 'n2', 'n2', 'n3', 'n3', 'n4', 'n4']);
    assert.equal(marcheAuRang(0, [], 10, {}), null, 'une liste vide se dit, elle ne se tait pas');
    assert.equal(totalDe({}, {}), 0);
    assert.equal(totalDe({ total: 15 }, { nbQuestions: 20 }), 15, 'la session l\'emporte');
    assert.equal(totalDe({}, { nbQuestions: 20 }), 20, 'le panneau pose nbQuestions');
});

// --- Le conseil, qui ne commande plus -----------------------------------------

test('LE CONSEIL SERT UNE FOIS, À L\'OUVERTURE', () => {
    // Rémy : « avoir un nombre de questions que ça change le nombre de
    // questions ». Il bougeait tout seul ; il ne bouge plus. Ce compte-ci
    // évite seulement de proposer dix questions à douze marches.
    assert.equal(conseilProgression(12), 24);
    assert.equal(conseilProgression(12, 3), 36);
    assert.equal(PAR_MARCHE_DEFAUT, 2);
    assert.equal(questionsConseillees(relatifsAdditionGenerator, {}), 24);
    // Une marche seule ne réclame pas la longueur de tout l'escalier.
    const seule = questionsConseillees(relatifsAdditionGenerator, { etape: 'a1-pastilles-positifs' });
    assert.ok(seule <= 10, `une seule marche ne demande pas ${seule} questions`);
});

// --- Le réglage, et sa présence partout ----------------------------------------

test('le réglage porte sa liste, ses groupes et son mot', () => {
    const p = paramMarches({ marches: DOUZE, groupes: { A: 'A — un' }, mot: 'palier' });
    assert.equal(p.id, 'marches');
    assert.equal(p.type, 'marches');
    // L'accord suit le mot : un palier est masculin, une marche féminine.
    assert.equal(p.label, 'Les paliers travaillés');
    assert.equal(paramMarches({ marches: DOUZE, mot: 'marche' }).label, 'Les marches travaillées');
    assert.deepEqual(p.default, DOUZE.map(m => m.id));
    assert.equal(p.marches.length, 12);
});

test('TOUT GÉNÉRATEUR À PROGRESSION OFFRE SES CASES, ET ELLES MARCHENT', async () => {
    // Le garde-fou : rien n'empêcherait le prochain générateur d'annoncer une
    // progression sans dire quelles marches on peut cocher. Et l'on vérifie que
    // chaque exercice, joué sur la longueur qu'il conseille, PARCOURT bien
    // toutes ses marches — ce que le premier essai ne garantissait pas.
    await import('../js/core/activities/index.js');
    const { allGenerators } = await import('../js/core/registry.js');
    let vus = 0;
    for (const gen of allGenerators()) {
        const param = (gen.params || []).find(p => p.type === 'marches');
        if (!param) continue;
        vus += 1;
        assert.ok(param.marches.length >= 2, `${gen.id} : une seule marche`);
        assert.deepEqual(param.default, param.marches.map(m => m.id),
            `${gen.id} : tout doit être coché par défaut`);

        const defauts = Object.fromEntries((gen.params || [])
            .filter(p => p.default !== undefined).map(p => [p.id, p.default]));
        const total = gen.conseil ? gen.conseil(defauts) : 10;
        const marches = new Set();
        for (let i = 0; i < total; i++) {
            const it = gen.generate({ ...defauts }, { rng: makeRng(`${gen.id}${i}`), index: i, total });
            marches.add(it.meta && (it.meta.etape || it.meta.niveau || it.meta.zoom || it.meta.marche));
        }
        // ON COMPTE CE QUI EST JOUÉ, PAS LE NOMBRE DE VALEURS VUES : certains
        // générateurs ouvrent sur une phase qui n'est PAS une marche (les
        // compléments à UN de « frac.probleme », qui passent avant la
        // progression). Ce qu'on exige, c'est qu'aucune marche cochée ne reste
        // sur le carreau.
        const manquantes = param.marches.map(m => m.id).filter(id => !marches.has(id));
        assert.deepEqual(manquantes, [],
            `${gen.id} : marches jamais jouées en ${total} questions : ${manquantes.join(', ')}`);
    }
    assert.ok(vus >= 13, `seulement ${vus} générateurs à progression`);
});
