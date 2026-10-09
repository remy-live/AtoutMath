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
import { readFileSync } from 'node:fs';
import './helpers.mjs';
import {
    SANS_GROUPE_MAX, PAR_MARCHE_DEFAUT,
    normaliserMarches, marchesCochees, groupesDeMarches, decoupeMarches, partageEgal,
    ecrireLongueurs, lireLongueurs, poserBorne, marcheAuRang, conseilProgression,
    cleParMarche, lireParMarche, ecrireParMarche, valeurParMarche,
    motsDeCoupe, paramMarches, totalDe
,
    PLIER_AU_DELA} from '../js/core/progression.js';
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

test('AUCUN `meta` NE PORTE DE CODE — le défaut qui ne plante pas', async () => {
    // Rémy : « un bug qui traîne pour l'ascenseur ». L'écran affichait
    // « Étape function rang(n) { return n === 1 ? '1er' : `${n}e`; }1 / 6 ».
    //
    // LA VARIABLE AVAIT DISPARU, LA FONCTION AVAIT PRIS SA PLACE. `rang` était
    // le rang de la marche du temps du menu ; la migration vers les cases l'a
    // supprimée, et la FONCTION `rang` déclarée en haut du même fichier a
    // silencieusement pris le relais. `rang + 1` a stringifié son code source.
    //
    // RIEN N'A PLANTÉ, ET C'EST TOUT LE PROBLÈME. La question se jouait, la
    // réponse était juste, seule une étiquette montrait du JavaScript à un
    // élève de cinquième. Aucun test ne regardait les `meta` : ils ne servent
    // « qu'à » l'affichage, donc personne ne les gardait — c'est justement là
    // qu'une faute peut vivre longtemps.
    await import('../js/core/activities/index.js');
    const { allGenerators } = await import('../js/core/registry.js');
    const suspect = (v) => {
        if (typeof v === 'function') return 'une fonction';
        const t = String(v);
        if (/\bfunction\b|=>|\breturn\b|\[object Object\]|undefined|NaN/.test(t)) {
            return t.slice(0, 60);
        }
        return '';
    };
    for (const gen of allGenerators()) {
        const defauts = Object.fromEntries((gen.params || [])
            .filter(p => p.default !== undefined).map(p => [p.id, p.default]));
        for (let i = 0; i < 6; i++) {
            let it;
            try {
                it = gen.generate({ ...defauts },
                    { rng: makeRng(`${gen.id}meta${i}`), index: i, total: 12 });
            } catch { continue; }   // un générateur qui refuse ces réglages-là
            const meta = (it && it.meta) || {};
            // ON NE REGARDE QUE LES FEUILLES SIMPLES : un `meta` porte parfois
            // l'objet entier du tirage (l'égalité, le calcul), et ses branches
            // sont du domaine du générateur, pas de l'affichage.
            Object.entries(meta).forEach(([k, v]) => {
                if (v === null || typeof v === 'object') return;
                const quoi = suspect(v);
                assert.equal(quoi, '', `${gen.id} : meta.${k} vaut « ${quoi} »`);
            });
        }
    }
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
            // `marche` D'ABORD, ET C'EST UNE CORRECTION. `etape`, `niveau`,
            // `zoom` sont les noms que chaque générateur donnait à son cran
            // AVANT les cases ; `marche` est celui que pose la frise, et c'est
            // le seul dont on sait qu'il porte l'identifiant d'une marche.
            // Mesuré sur `calc.priorites-fiche`, qui expose les deux : son
            // `meta.niveau` est le NOMBRE 2 — il sert à la feuille — quand
            // l'identifiant de la marche est la CHAÎNE « 2 ». Lu dans l'ancien
            // ordre, le test déclarait les quatre marches jamais jouées alors
            // qu'elles l'étaient toutes. On compare donc en chaînes, et on
            // regarde `marche` en premier.
            const m = it.meta || {};
            const cran = m.marche ?? m.etape ?? m.niveau ?? m.zoom;
            if (cran !== undefined && cran !== null) marches.add(String(cran));
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

// --- UN RÉGLAGE QUI CHANGE D'UNE MARCHE À L'AUTRE ---------------------------

test('LA TABLE PAR MARCHE FAIT L\'ALLER-RETOUR', () => {
    const table = { thermometre: 'choix', ecriture: 'saisie' };
    assert.equal(ecrireParMarche(table), 'thermometre:choix,ecriture:saisie');
    assert.deepEqual(lireParMarche(ecrireParMarche(table)), table);
    // Rien d'écrit n'est pas une erreur : c'est l'état de départ.
    assert.deepEqual(lireParMarche(''), {});
    assert.deepEqual(lireParMarche(undefined), {});
    // Une table déjà en objet — un parcours relu, une valeur posée à la main.
    assert.deepEqual(lireParMarche({ a: 'x', b: '' }), { a: 'x' });
    // Ce qui ne ressemble à rien ne devient pas une clé vide.
    assert.deepEqual(lireParMarche(':choix,,thermometre:'), {});
});

test('TROIS SOURCES, ET LA MARCHE PASSE DEVANT', () => {
    // Rémy : « pour réponse à saisir ou 4 réponses, il faut que ce soit
    // spécifique à la zone ». La marche nommée l'emporte ; le réglage
    // d'exercice sert de socle aux autres ; le défaut du générateur ferme la
    // marche. C'est cet ordre qui fait qu'un exercice sans frise se comporte
    // exactement comme avant.
    const params = { reponse: 'choix', reponseParMarche: 'pastilles:saisie' };
    assert.equal(valeurParMarche(params, 'reponse', 'pastilles', 'saisie'), 'saisie');
    assert.equal(valeurParMarche(params, 'reponse', 'ecriture', 'saisie'), 'choix');
    assert.equal(valeurParMarche({}, 'reponse', 'ecriture', 'saisie'), 'saisie');
    // Le nom du réglage se compose ici, et nulle part ailleurs.
    assert.equal(cleParMarche('reponse'), 'reponseParMarche');
});

test('LE GÉNÉRATEUR SUIT LA TABLE, MARCHE PAR MARCHE', async () => {
    // C'est la seule vérification qui compte : le panneau peut bien dessiner ce
    // qu'il veut, c'est ici que l'élève reçoit — ou non — ses quatre
    // propositions. Le test tire les douze questions d'une progression réglée
    // moitié au clavier, moitié au choix, et regarde ce qui SORT.
    const { relatifsGenerator } = await import('../js/core/generators/relatifs.js');
    const params = {
        marches: ['ascenseur-positif', 'ascenseur-sous-sol', 'thermometre',
            'pastilles', 'ecriture', 'chaine'],
        nbQuestions: 12,
        reponseParMarche: 'ascenseur-positif:choix,ascenseur-sous-sol:choix,'
            + 'thermometre:choix,pastilles:saisie,ecriture:saisie,chaine:saisie'
    };
    const vus = {};
    for (let i = 0; i < 12; i++) {
        const it = relatifsGenerator.generate(params, { index: i, total: 12, rng: makeRng(`r${i}`) });
        vus[it.meta.niveau] = it.answerKind;
        // UNE QUESTION À CHOISIR A DES PROPOSITIONS, et une question au clavier
        // n'en a pas : le genre de réponse et la liste doivent dire la même
        // chose, sinon l'écran montre un pavé sous quatre boutons.
        assert.equal(Array.isArray(it.choices), it.answerKind === 'choice',
            `${it.meta.niveau} : le genre de réponse et les propositions divergent`);
    }
    assert.deepEqual(vus, {
        'ascenseur-positif': 'choice', 'ascenseur-sous-sol': 'choice', thermometre: 'choice',
        pastilles: 'numeric', ecriture: 'numeric', chaine: 'numeric'
    });
});

test('SANS TABLE, RIEN NE CHANGE POUR PERSONNE', async () => {
    // La garde qui protège les seize exercices à progression : un réglage
    // ajouté pour deux d'entre eux ne doit rien déplacer chez les quatorze
    // autres, ni chez ces deux-là tant que personne n'a touché la frise.
    const { relatifsGenerator } = await import('../js/core/generators/relatifs.js');
    const nature = (params) => Array.from({ length: 12 }, (_, i) =>
        relatifsGenerator.generate({ ...params, nbQuestions: 12 },
            { index: i, total: 12, rng: makeRng(`s${i}`) }).answerKind);
    assert.deepEqual(new Set(nature({})), new Set(['numeric']));
    assert.deepEqual(new Set(nature({ reponse: 'choix' })), new Set(['choice']));
});

// ── CE QUE LE PANNEAU DOIT MONTRER ──────────────────────────────────────────
//
// RÉMY, devant les barreaux du développement regroupés : « pas mal de choses
// ne vont pas. Déjà pas de numéro avant les exercices, et au sein d'un
// exercice il faut pouvoir sélectionner les étapes un peu comme ce qui
// existait déjà — là on doit choisir un cran, ce n'est pas cohérent, je
// pourrais vouloir qu'un type de développement. Mais du coup tu peux faire un
// bouton réglage express pour avoir tout, et cela se répartit équitablement
// entre le nombre de questions. »
//
// Trois demandes, trois garde-fous. Les pixels se mesurent au navigateur
// (tools/tmp/expressEtUneCase.mjs) ; ici on garde les décisions.

test('ONZE MARCHES S\'OUVRENT, DOUZE SE REPLIENT', async () => {
    // DEUX DEMANDES QUI SE CONTREDISENT, et c'est le nombre qui tranche :
    // « pour un exercice des nombres relatifs il y a beaucoup d'étapes, ça
    // risque d'être illisible » (douze, treize) contre « je pourrais vouloir
    // qu'un type de développement » (onze, en deux temps). Replié d'entrée, un
    // groupe ne laissait qu'un geste : prendre le temps entier.
    assert.equal(typeof PLIER_AU_DELA, 'number');
    await import('../js/core/activities/index.js');
    const { allGenerators } = await import('../js/core/registry.js');
    const taille = (id) => {
        const g = allGenerators().find(x => x.id === id);
        const p = (g.params || []).find(q => q && q.type === 'marches');
        assert.ok(p, `${id} n'a plus de cases à cocher`);
        return p.marches.length;
    };
    assert.ok(taille('lit.developpement') <= PLIER_AU_DELA,
        'les onze barreaux du développement se replieraient : on ne verrait '
        + 'que les deux temps, et l\'unité de choix serait le temps');
    assert.ok(taille('num.relatifs.addition') > PLIER_AU_DELA,
        'les douze marches des relatifs s\'ouvriraient en entier — « ça risque '
        + 'd\'être illisible »');
});

test('LE PANNEAU NUMÉROTE LES TEMPS ET OFFRE LE RÉGLAGE EXPRESS', () => {
    // LE PANNEAU SE DESSINE DANS LE DOM : on lit sa source, faute de
    // navigateur ici. Ce qu'on garde, ce sont les trois choses dont l'ABSENCE
    // était le défaut.
    const src = readFileSync(new URL('../js/games/configUI.js', import.meta.url), 'utf8');
    // 1. Le rang des marches dans l'en-tête d'un temps — « n° 1 à 5 ».
    assert.match(src, /cfg-groupe-rangs/,
        'l\'en-tête d\'un temps ne porte plus le rang de ses marches');
    assert.match(src, /n° \$\{a\} à \$\{b\}/,
        'le rang ne s\'écrit plus comme une plage');
    // 2. Le bouton express, et ce qui le distingue de « Tout cocher ».
    assert.match(src, /data-equitable="1"/,
        'le bouton « Tout, à parts égales » a disparu');
    assert.match(src, /à parts égales/,
        'le bouton express ne dit plus ce qu\'il fait');
    // 3. Et il REMET LE PARTAGE À ZÉRO — c'est la moitié que « Tout cocher »
    //    ne faisait pas : qui avait tiré une borne gardait son partage sur
    //    mesure sans que rien ne le dise.
    const i = src.indexOf('btn.dataset.equitable');
    assert.ok(i > 0, 'le bouton express ne touche plus au partage');
    const suite = src.slice(i, i + 400);
    assert.match(suite, /data-repartition-marches/,
        'le bouton express ne vide plus le partage sur mesure');
    assert.match(suite, /\.value = ''/,
        'le partage sur mesure n\'est pas remis à égalité');
    // 4. Le repli suit le nombre de marches, pas une constante écrite ici.
    assert.match(src, /liste\.length > PLIER_AU_DELA/,
        'le repli ne suit plus le nombre de marches');
});

test('COCHER UN SEUL BARREAU NE JOUE QUE CELUI-LÀ', async () => {
    // « je pourrais vouloir qu'un type de développement ». C'est le cœur de la
    // demande : l'unité de choix est la MARCHE, pas le temps.
    const { developpementGenerator } = await import('../js/core/generators/developpement.js');
    for (const seul of ['1', '7', '11']) {
        const joues = [];
        for (let i = 0; i < 6; i++) {
            joues.push(String(developpementGenerator.generate({ marches: [seul] },
                { rng: makeRng(`seul_${seul}_${i}`), index: i, total: 6 }).meta.marche));
        }
        assert.deepEqual([...new Set(joues)], [seul],
            `coché seul, le barreau ${seul} n'est pas le seul joué`);
    }
    // Et deux cochés se partagent les questions, sans en oublier un.
    const deux = [];
    for (let i = 0; i < 8; i++) {
        deux.push(String(developpementGenerator.generate({ marches: ['3', '9'] },
            { rng: makeRng(`deux_${i}`), index: i, total: 8 }).meta.marche));
    }
    assert.deepEqual([...new Set(deux)].sort(), ['3', '9'],
        'deux barreaux cochés : l\'un des deux ne sort jamais');
});

test('LA CASE D\'UN TEMPS SUIT SES MARCHES', () => {
    // RÉMY : « quand dans les options on décoche double distributivité, il
    // faut que la case de double distributivité soit décochée aussi ».
    //
    // MESURÉ au navigateur : après le clic, les cinq marches passaient bien à
    // zéro et la case du temps gardait sa marque « tout ». Elle était calculée
    // UNE FOIS, au dessin du panneau, et plus jamais — le panneau ne se
    // redessine pas à chaque clic. La case affichait donc le contraire de ce
    // qu'elle commandait.
    const src = readFileSync(new URL('../js/games/configUI.js', import.meta.url), 'utf8');
    assert.match(src, /function majCasesDeTemps/,
        'la remise à jour des cases de temps a disparu');
    // Elle est appelée dans les DEUX sens : en cliquant le temps, et en
    // cochant une marche à la main — c'est le même défaut vu par l'autre bout.
    const clic = src.indexOf('cases.forEach(c => { c.checked = tout; });');
    assert.ok(clic > 0, 'le bouton de groupe ne coche plus ses marches');
    assert.match(src.slice(clic, clic + 200), /majCasesDeTemps/,
        'cocher un temps entier ne met plus sa case à jour');
    assert.match(src, /dataset\.kind !== 'multiselect'[\s\S]{0,260}majCasesDeTemps/,
        'cocher UNE marche ne met plus à jour le temps qui la contient');
    // Et le compte écrit à côté suit : il mentait de la même façon.
    assert.match(src, /\$\{coches\}\/\$\{dedans\.length\}/,
        'le compte « 5/5 » ne se met plus à jour');
});

test('LES DEUX CHAPITRES DE SECONDE ONT LEURS CASES', async () => {
    // RÉMY : « il y a pas mal de jeux où ce sont des étapes, et il faudrait
    // pouvoir faire les check box comme pour le calcul littéral, tu ne penses
    // pas ? » — mesuré à ce moment-là : 27 générateurs offraient les cases, et
    // les deux plus longues progressions de Seconde étaient restées sur un
    // menu à choix unique, c'est-à-dire sur l'outil qui ne sait exprimer AUCUN
    // des choix qu'un professeur fait vraiment : « les trois premiers », « les
    // divisions seulement », « tout sauf les priorités ».
    await import('../js/core/activities/index.js');
    const { allGenerators } = await import('../js/core/registry.js');
    const cases = (id) => {
        const g = allGenerators().find(x => x.id === id);
        assert.ok(g, `${id} a disparu du registre`);
        const p = (g.params || []).find(q => q && q.type === 'marches');
        assert.ok(p, `${id} n'offre pas de cases à cocher`);
        return p;
    };
    const fr = cases('nb.calculFractions');
    assert.equal(fr.marches.length, 13, 'douze barreaux et la question du devoir');
    // « CALCULER PUIS DIRE L'ENSEMBLE » EST UN BARREAU, pas un mode à part :
    // c'est la question du devoir, celle qui vient après les douze.
    assert.ok(fr.marches.some(m => m.id === 'ensemble'),
        'la question du devoir n\'est plus une case');
    const rc = cases('nb.racines');
    assert.equal(rc.marches.length, 8);
});

test('LES PARCOURS D\'HIER SE RELISENT DANS LES DEUX CHAPITRES', async () => {
    const { calculFractionsGenerator } = await import('../js/core/generators/calculFractions.js');
    const { racinesGenerator } = await import('../js/core/generators/racines.js');
    // « Révision — les quatre opérations » couvrait les huit premiers ; la
    // clef du groupe EST cette valeur, donc elle se relit.
    const huit = [0, 1, 2, 3, 4, 5, 6, 7].map(i => calculFractionsGenerator
        .generate({ barreau: 'revision' }, { rng: makeRng(`cfr${i}`), index: i, total: 8 })
        .meta.barreau);
    assert.deepEqual(huit, [1, 2, 3, 4, 5, 6, 7, 8]);
    // Et « Révision — les barreaux 1 à 4 » des racines.
    const quatre = [0, 1, 2, 3].map(i => racinesGenerator
        .generate({ barreau: 'revision' }, { rng: makeRng(`rcr${i}`), index: i, total: 4 })
        .meta.barreau);
    assert.deepEqual(quatre, [1, 2, 3, 4]);
    // Un barreau seul reste un barreau seul.
    for (const r of [1, 5, 9, 12]) {
        const it = calculFractionsGenerator.generate({ barreau: String(r) },
            { rng: makeRng(`cfu${r}`), index: 2, total: 8 });
        assert.equal(it.meta.barreau, r, `le barreau ${r} joue autre chose`);
    }
    // Et « calculer puis dire l'ensemble » aussi, qui n'est plus un mode.
    const ens = calculFractionsGenerator.generate({ barreau: 'ensemble' },
        { rng: makeRng('cfe'), index: 0, total: 4 });
    assert.equal(ens.meta.marche, 'ensemble');
    assert.match(String(ens.prompt.papier || ''), /ensemble/i);
});


// --- UN ANCIEN RÉGLAGE N'EST PAS TOUJOURS UNE MARCHE -------------------------

test('UN PLAFOND, UN DÉPART : deux anciens réglages qui ne nomment pas UNE marche', () => {
    const liste = ['1', '2', '3', '4'].map(id => ({ id, nom: id }));
    const ids = (params, ancien) => marchesCochees(params, liste, ancien).map(m => m.id);

    // 1. LE PLAFOND. « Difficulté 3 » aux priorités opératoires ne voulait pas
    //    dire « le niveau 3 » : le générateur montait de 1 à 3 au fil des
    //    questions. Le relire comme UNE marche donnerait au professeur le
    //    contraire de ce qu'il avait réglé — les questions les plus dures, et
    //    elles seules, là où il avait demandé une montée.
    assert.deepEqual(ids({ niveau: '3' }, { cle: 'niveau', jusqua: true }), ['1', '2', '3']);

    // 2. ET C'EST PARFOIS UNE CASE À CÔTÉ QUI EN DÉCIDE. Aux priorités,
    //    « Commencer plus facile » faisait de `niveau` un plafond ; décochée,
    //    le même nombre désignait une difficulté et une seule. Deux parcours
    //    enregistrés qui portent le même `niveau: 3` ne se relisent donc pas
    //    de la même façon.
    const casePriorites = { cle: 'niveau', jusqua: (p) => !!(p && p.progressif) };
    assert.deepEqual(ids({ niveau: '3', progressif: true }, casePriorites), ['1', '2', '3']);
    assert.deepEqual(ids({ niveau: '3' }, casePriorites), ['3']);

    // 3. LE DÉPART, qui est le plafond à l'envers. « Commencer au niveau 3 »
    //    chez le Chat Géomètre voulait dire « la 3 et toute la suite » — la
    //    boucle repassait même par la première ensuite.
    assert.deepEqual(ids({ depart: '3' }, { cle: 'depart', depuis: true }), ['3', '4']);

    // 4. ET LES CASES, QUAND IL Y EN A, L'EMPORTENT TOUJOURS : un réglage
    //    d'hier ne doit pas revenir par-dessus un choix d'aujourd'hui.
    assert.deepEqual(ids({ marches: ['2'], niveau: '4', depart: '1' },
        { cle: 'niveau', jusqua: true }), ['2']);
});

test('LE PANNEAU COCHE CE QUE LE GÉNÉRATEUR JOUE', async () => {
    // LE MENSONGE QU'ON VIENT DE CORRIGER. Le panneau lisait `reglages.marches`
    // et, ne le trouvant pas, prenait le défaut du réglage — c'est-à-dire TOUT
    // coché. Un exercice réglé AVANT les cases porte pourtant encore
    // `niveau: 2` ou `depart: 3`, que le générateur traduit très bien : on
    // lisait donc « les quatre niveaux travaillés » au-dessus d'un exercice qui
    // n'en jouait qu'un, et le simple fait d'enregistrer sans rien toucher
    // changeait l'exercice.
    const { valeurDeChamp } = await import('../js/games/configUI.js');
    const param = paramMarches({
        marches: ['1', '2', '3', '4'].map(id => ({ id, nom: id })),
        mot: 'niveau', ancien: { cle: 'niveau', jusqua: true }
    });
    assert.deepEqual(valeurDeChamp(param, {}), ['1', '2', '3', '4'], 'rien de réglé : tout');
    assert.deepEqual(valeurDeChamp(param, { niveau: '2' }), ['1', '2'],
        'un ancien plafond ne se voit pas dans les cases');
    assert.deepEqual(valeurDeChamp(param, { marches: ['4'] }), ['4']);
    // Et un réglage ordinaire garde la règle ordinaire.
    assert.equal(valeurDeChamp({ id: 'grands', default: false }, {}), false);
    assert.equal(valeurDeChamp({ id: 'grands', default: false }, { grands: true }), true);
});

test('LES PRIORITÉS OPÉRATOIRES MONTENT PAR CASES, ÉCRAN ET PAPIER', async () => {
    // Rémy : « fais tout, ce serait le plus cohérent non ? »
    const { prioriteGenerator } = await import('../js/core/generators/calcul.js');
    const { prioritesFicheGenerator } = await import('../js/core/generators/prioritesFiche.js');

    const suite = (g, params, total) => Array.from({ length: total }, (_, i) =>
        String(g.generate(params, { rng: makeRng(`prio${i}`), index: i, total }).meta.marche));

    assert.deepEqual(suite(prioriteGenerator, { mode: 'resultat' }, 8),
        ['1', '1', '2', '2', '3', '3', '4', '4']);
    assert.deepEqual([...new Set(suite(prioriteGenerator, { marches: ['4'] }, 6))], ['4']);

    // SUR LA FEUILLE, TOUS LES CALCULS GARDENT LA MÊME HAUTEUR. Donner à chacun
    // le compte exact de ses étapes écrit la réponse en creux : trois lignes
    // vides diraient « il reste trois opérations », et le calcul d'à côté n'en
    // aurait que deux. Le maximum se prend donc sur le plus haut niveau COCHÉ,
    // pas sur l'expression tirée.
    const page = Array.from({ length: 12 }, (_, i) => prioritesFicheGenerator.generate(
        {}, { rng: makeRng(`fiche${i}`), index: i, total: 12 }).meta);
    assert.equal(new Set(page.map(m => m.etapesMax)).size, 1,
        'les blocs de la feuille n\'ont pas tous la même hauteur');
    assert.ok(page.some(m => m.etapes < page[0].etapesMax),
        'aucun calcul plus court que la place réservée : la hauteur trahit le compte');
    assert.deepEqual([...new Set(page.map(m => m.marche))], ['1', '2', '3', '4']);
});

test('UNE CARTE QUI RÉÉCRIT SON PANNEAU N\'EFFACE PAS LA PROGRESSION', async () => {
    // `paramSchemaOf` REMPLACE, il ne complète pas — et c'est délibéré : « un
    // schéma de catalogue n'est pas un sous-ensemble à compléter, c'est un
    // choix ». La conséquence l'est moins : une carte qui recopiait à la main
    // le menu « Niveau » de son générateur continuait de l'afficher après que
    // ce menu est devenu une colonne de cases. Mesuré au moment de la bascule :
    // deux cartes sur quarante et une — le Logigramme et « Compter sur un
    // solide » — montraient l'ancien menu, et leur feuille comme leur écran
    // restaient sur un niveau du début à la fin.
    const { exercices } = await import('../js/data/catalog.js');
    await import('../js/core/activities/index.js');
    const { getGenerator } = await import('../js/core/registry.js');
    const muettes = [];
    for (const e of exercices) {
        if (!e.paramSchema || !e.generatorId) continue;
        const g = getGenerator(e.generatorId);
        if (!g || !(g.params || []).some(p => p.type === 'marches')) continue;
        if (!e.paramSchema.some(p => p.type === 'marches')) muettes.push(e.id);
    }
    assert.deepEqual(muettes, [],
        `ces cartes cachent la progression de leur générateur : ${muettes.join(', ')}`);
});

test('LE LOGIGRAMME ET LES SOLIDES MONTENT AUSSI À L\'ÉCRAN', async () => {
    // Ces deux-là ne passent PAS par un générateur à l'écran : l'activité mène
    // son propre jeu et lisait `params.niveau` une seule fois, au démarrage.
    // Les cases n'auraient alors servi qu'au papier.
    const { LISTE_MARCHES: LOGI } = await import('../js/core/generators/logigramme.js');
    const { LISTE_MARCHES: SOLI } = await import('../js/core/generators/solides.js');
    for (const [src, liste] of [['games/logigramme.js', LOGI], ['games/solides.js', SOLI]]) {
        const txt = readFileSync(new URL(`../js/${src}`, import.meta.url), 'utf8');
        assert.match(txt, /marcheAuRang\(this\.poses\+\+/,
            `${src} : le niveau ne suit pas les questions posées`);
        assert.ok(!/this\.niveau = [^\n]*this\.params\.niveau/.test(txt),
            `${src} : le niveau est encore figé au démarrage`);
        assert.ok(liste.length >= 3, `${src} : la liste des marches ne s'exporte plus`);
    }
});
