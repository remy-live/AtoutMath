// LA RÉPARTITION D'UNE PROGRESSION.
//
// Rémy, deux fois. D'abord : « quand on a une progression, il faudrait pouvoir
// choisir aussi la répartition non ? » Puis, devant le premier essai : « pour
// les étapes on ne comprend pas grand-chose, parce que du coup le nombre de
// questions dépend des marches. On pourrait faire comme quand on définit pour
// le QCM à 2, 4 ou libre, avec le même principe. »
//
// CE QU'ON ÉPROUVE ICI TIENT EN UNE PHRASE : le nombre de questions ne dépend
// plus des marches, ce sont les marches qui se partagent les questions. C'est
// le sens de lecture de l'escalier de l'aide (`core/aide.js`, les ZONES), et
// c'est ce que Rémy demande.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
    AUTO, PAR_MARCHE_DEFAUT, PAR_MARCHE_MIN, PAR_MARCHE_MAX,
    repartitionDe, paramRepartition, rangMarche, rangMarcheCyclique,
    decoupeMarches, conseilProgression, repartitionEnMots, totalDe
} from '../js/core/progression.js';
import { questionsConseillees } from '../js/core/duree.js';

import { relatifsGenerator, NIVEAUX } from '../js/core/generators/relatifs.js';
import { relatifsAdditionGenerator } from '../js/core/generators/relatifsAddition.js';
import { fracSommeProgressiveGenerator } from '../js/core/generators/fractionsEquivalentes.js';
import { marchePour as marchePrefixes, ORDRE as ORDRE_PREFIXES } from '../js/core/generators/prefixes.js';
import { marcheThales, ORDRE_THALES } from '../js/core/generators/thales.js';

// --- Ce que le réglage demande ------------------------------------------------

test('LE DÉFAUT EST LE PARTAGE, pas un compte', () => {
    assert.equal(repartitionDe(null), AUTO);
    assert.equal(repartitionDe({}), AUTO);
    assert.equal(repartitionDe({ repartition: 'auto' }), AUTO);
    assert.equal(repartitionDe({ repartition: 3 }), 3);
    assert.equal(repartitionDe({ repartition: '3' }), 3, 'le DOM ne rend que des chaînes');
});

test('L\'ANCIEN NOM SE RELIT ENCORE', () => {
    // Les parcours enregistrés pendant la vie du premier essai portent
    // `parMarche` ; les relire comme « auto » effacerait sans prévenir un
    // réglage que le professeur a posé.
    assert.equal(repartitionDe({ parMarche: 4 }), 4);
    // Mais le nouveau nom l'emporte quand les deux sont là.
    assert.equal(repartitionDe({ parMarche: 4, repartition: 2 }), 2);
});

test('UNE VALEUR ABSURDE RETOMBE SUR LE PARTAGE', () => {
    [0, -3, 'x', NaN].forEach(v => {
        assert.equal(repartitionDe({ repartition: v }), AUTO, String(v));
    });
    assert.equal(repartitionDe({ repartition: 99 }), PAR_MARCHE_MAX);
    assert.equal(repartitionDe({ repartition: 1 }), PAR_MARCHE_MIN);
});

test('le réglage se déclare en échelle, du partage au compte fixe', () => {
    const p = paramRepartition({ marches: 12 });
    assert.equal(p.id, 'repartition');
    assert.equal(p.default, AUTO);
    assert.equal(p.echelle, true);
    assert.deepEqual(p.options.map(o => o.value), [AUTO, 1, 2, 3, 4, 5, 6]);
    assert.match(p.aide, /24 questions/, 'le compte exact, pas « il en faudra plus »');
    assert.match(p.aide, /sans effet/i, 'une marche isolée : le panneau ne sait pas masquer');
});

// --- LE PARTAGE, qui est le sujet ---------------------------------------------

test('EN PARTAGE, LES MARCHES SE DIVISENT L\'EXERCICE', () => {
    const parts = (m, n) => decoupeMarches(m, n, {}).map(z => z.n);
    assert.deepEqual(parts(6, 12), [2, 2, 2, 2, 2, 2]);
    assert.deepEqual(parts(6, 30), [5, 5, 5, 5, 5, 5]);
    assert.deepEqual(parts(4, 12), [3, 3, 3, 3]);
    // LE RESTE VA AUX DERNIÈRES, une question de plus chacune. Tout donner à la
    // seule dernière — ce que faisait `core/pythagore.js` — creusait un trou :
    // dix questions sur six marches y faisaient 1-1-1-1-1-5.
    assert.deepEqual(parts(6, 10), [1, 1, 2, 2, 2, 2]);
    assert.deepEqual(parts(4, 10), [2, 2, 3, 3]);
    // Et la somme est TOUJOURS le total : c'est l'invariant qui garantit
    // qu'aucune question ne tombe dans le vide.
    for (let m = 1; m <= 13; m++) {
        for (let n = 1; n <= 50; n++) {
            const somme = decoupeMarches(m, n, {}).reduce((s, z) => s + z.n, 0);
            assert.equal(somme, n, `${m} marches, ${n} questions`);
        }
    }
});

test('MOINS DE QUESTIONS QUE DE MARCHES : on le dit', () => {
    // On ne peut pas toutes les voir. Plutôt que d'en écraser deux dans une
    // question, on garde les premières — et l'aperçu annonce le compte qu'il
    // faudrait, ce qui est l'information dont le professeur a besoin.
    const c = decoupeMarches(12, 10, {});
    assert.equal(c.length, 10);
    assert.deepEqual(c.map(z => z.n), Array(10).fill(1));
    assert.match(repartitionEnMots(12, 10, {}), /10 marches sur 12/);
    assert.match(repartitionEnMots(12, 10, {}), /faudrait 12/);
});

test('L\'APERÇU DIT LE RÉSULTAT, ET NE SUPPOSE RIEN', () => {
    // C'est la réponse à « on ne comprend pas grand-chose » : un nom ne dit pas
    // ce qu'il produira. Chaque phrase est déduite du découpage.
    assert.equal(repartitionEnMots(12, 24, {}), '24 questions pour 12 marches : 2 questions chacune.');
    assert.match(repartitionEnMots(12, 15, {}), /de 1 à 2 questions chacune/);
    // À compte fixe, on ne voit pas toutes les marches — et l'aperçu ne dit
    // plus « une question chacune », qui était faux : quinze questions à trois
    // par marche en couvrent cinq, à trois chacune.
    const fixe = repartitionEnMots(12, 15, { repartition: 3 });
    assert.match(fixe, /5 marches sur 12/);
    assert.match(fixe, /3 questions chacune/);
    assert.match(fixe, /faudrait 36/);
    // ET LE HAUT DE L'ESCALIER QUI RAMASSE LE RESTE SE DIT AUSSI : à trois par
    // marche sur six marches et trente questions, la dernière en reçoit quinze.
    // C'est voulu, ce n'est pas ce qu'on lit dans « 3 questions par marche ».
    assert.match(repartitionEnMots(6, 30, { repartition: 3 }), /dernière marche en garde 15/);
    // Le mot du chapitre est repris : palier, niveau, cran…
    assert.match(repartitionEnMots(3, 9, {}, 'palier'), /3 paliers/);
});

test('LA MARCHE SUIT LE PARTAGE, question par question', () => {
    const rangs = (m, n) => Array.from({ length: n }, (_, i) => rangMarche(i, m, {}, AUTO, n));
    assert.deepEqual(rangs(6, 12), [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    assert.deepEqual(rangs(6, 6), [0, 1, 2, 3, 4, 5], 'six questions : on VISITE');
    assert.deepEqual(rangs(4, 10), [0, 0, 1, 1, 2, 2, 2, 3, 3, 3]);
    // On ne redescend jamais, et l'on ne dépasse jamais la dernière.
    for (let i = 0; i < 40; i++) assert.ok(rangMarche(i, 4, {}, AUTO, 12) <= 3);
});

test('LE COMPTE FIXE FAIT L\'INVERSE, et c'.concat("'est un choix légitime"), () => {
    // « Je veux trois questions sur chaque marche, quitte à ne pas toutes les
    // voir. » Le total ne commande plus rien : on monte tous les trois.
    const rangs = (n) => Array.from({ length: 12 }, (_, i) => rangMarche(i, 6, { repartition: n }, AUTO, 12));
    assert.deepEqual(rangs(3), [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3]);
    assert.deepEqual(rangs(1), [0, 1, 2, 3, 4, 5, 5, 5, 5, 5, 5, 5]);
});

test('SANS LE TOTAL, on retombe sur le compte historique', () => {
    // Une vignette de catalogue, un aperçu papier : le total est inconnu. Le
    // pire qui puisse arriver est alors que rien ne change — deux questions par
    // marche, ce que tous les générateurs faisaient avant qu'il y ait un
    // réglage.
    const rangs = Array.from({ length: 8 }, (_, i) => rangMarche(i, 6, {}));
    assert.deepEqual(rangs, [0, 0, 1, 1, 2, 2, 3, 3]);
    assert.equal(totalDe({}, {}), 0);
    assert.equal(totalDe({ total: 15 }, {}), 15);
    assert.equal(totalDe({}, { nbQuestions: 20 }), 20, 'le panneau pose nbQuestions');
    assert.equal(totalDe({ total: 15 }, { nbQuestions: 20 }), 15, 'la session l\'emporte');
});

// --- Le conseil, qui ne commande plus ----------------------------------------

test('LE CONSEIL PROPOSE, IL N\'IMPOSE PLUS', () => {
    // C'est tout le changement que Rémy demande. Avant, « 4 par marche » sur
    // douze marches poussait le rail à 48 questions ; maintenant le conseil
    // vaut 24 en partage et le professeur met ce qu'il veut.
    assert.equal(conseilProgression(12, {}), 24);
    assert.equal(conseilProgression(12, { repartition: 4 }), 48);
    assert.equal(conseilProgression(12, { repartition: 1 }), 12);
});

test('les conseils par défaut ne bougent pas d\'un pouce', () => {
    assert.equal(questionsConseillees(relatifsGenerator, { niveau: 'progressif' }),
        NIVEAUX.length * 2);
    assert.equal(questionsConseillees(relatifsAdditionGenerator, { etape: 'progressif' }), 24);
    // Quatre marches à deux questions font huit ; le défaut de dix reste
    // au-dessus, et c'est lui qu'on garde — le conseil est un plancher.
    assert.equal(questionsConseillees(fracSommeProgressiveGenerator, { niveau: 'progressif' }), 10);
});

test('une marche isolée ne réclame pas la longueur de tout l\'escalier', () => {
    const seule = questionsConseillees(relatifsAdditionGenerator,
        { etape: 'somme-positifs', repartition: 6 });
    assert.ok(seule <= 10, `une seule marche ne demande pas ${seule} questions`);
});

// --- Les progressions qui CYCLENT ---------------------------------------------

test('LE CYCLE NE SERT PLUS QU\'AU COMPTE FIXE', () => {
    // Préfixes et Thalès repartaient de la première marche une fois en haut :
    // sur une fiche de vingt questions à compte fixe, plafonner en poserait
    // quinze du même type. En partage, aucune marche ne peut déborder — le
    // défaut que le cycle réparait n'existe plus.
    assert.equal(marchePrefixes('progressif', 0), ORDRE_PREFIXES[0]);
    assert.equal(marchePrefixes('progressif', 1, { repartition: 1 }), ORDRE_PREFIXES[1]);
    assert.equal(marchePrefixes('progressif', ORDRE_PREFIXES.length, { repartition: 1 }),
        ORDRE_PREFIXES[0], 'à compte fixe, le cycle recommence');
    // En partage, la dernière question est sur la DERNIÈRE marche, pas revenue
    // au début.
    const n = ORDRE_PREFIXES.length * 2;
    assert.equal(marchePrefixes('progressif', n - 1, {}, n),
        ORDRE_PREFIXES[ORDRE_PREFIXES.length - 1]);

    // Et sans réglage ni total, le comportement d'origine tient : trois par
    // marche pour Thalès.
    assert.equal(marcheThales('progressif', 2), ORDRE_THALES[0]);
    assert.equal(marcheThales('progressif', 3), ORDRE_THALES[1]);
    assert.equal(rangMarcheCyclique(0, 3, {}, 3), 0);
});

// --- Le réglage est offert PARTOUT où il y a une progression ------------------

test('`marches` ET `conseil` NE PEUVENT PAS DIVERGER', async () => {
    // Le panneau lit `marches(params)` pour dire ce que la répartition va
    // produire ; `duree.js` lit `conseil(params)` pour proposer une longueur.
    // Les deux décrivent le MÊME escalier, et deux déclarations d'une même
    // chose finissent toujours par ne plus dire la même chose — sauf si un test
    // les tient ensemble.
    await import('../js/core/activities/index.js');
    const { allGenerators } = await import('../js/core/registry.js');
    const ecarts = [];
    for (const gen of allGenerators()) {
        if (typeof gen.marches !== 'function' || typeof gen.conseil !== 'function') continue;
        // Sur les réglages par défaut, et avec un compte fixe : là, le conseil
        // vaut exactement marches x compte, sans plancher ni cas particulier.
        const defauts = Object.fromEntries((gen.params || [])
            .filter(p => p.default !== undefined).map(p => [p.id, p.default]));
        for (const par of [1, 2, 3]) {
            const p = { ...defauts, repartition: par };
            const m = gen.marches(p);
            if (m <= 1) continue;
            const attendu = m * par;
            const dit = gen.conseil(p);
            // Certains générateurs ajoutent des questions HORS progression —
            // les compléments à un des problèmes de fractions. Le conseil est
            // alors plus grand, jamais plus petit.
            if (dit < attendu) ecarts.push(`${gen.id} : ${m} marches x ${par} = ${attendu}, conseil ${dit}`);
        }
    }
    assert.deepEqual(ecarts, []);
});

test('TOUT GÉNÉRATEUR QUI ANNONCE UNE PROGRESSION OFFRE LE RÉGLAGE', async () => {
    // Un menu qui promet « les 12 marches à la suite » sans dire comment elles
    // se partagent l'exercice est précisément ce qu'on vient de corriger — et
    // rien n'empêcherait le prochain générateur de refaire le même oubli.
    await import('../js/core/activities/index.js');
    const { allGenerators } = await import('../js/core/registry.js');
    const manquants = [];
    for (const gen of allGenerators()) {
        const params = gen.params || [];
        // « Une progression » se reconnaît de deux façons dans le catalogue :
        // une option nommée `progressif` dans un menu, ou une case à cocher
        // `progressif` (« Commencer plus facile »).
        const progressif = params.some(p => p.id === 'progressif')
            || params.some(p => (p.options || [])
                .some(o => (o && typeof o === 'object' ? o.value : o) === 'progressif'));
        if (!progressif) continue;
        if (!params.some(p => p.id === 'repartition')) manquants.push(gen.id);
        // ET IL DIT COMBIEN IL A DE MARCHES : sans quoi l'aperçu du panneau ne
        // peut rien annoncer, et l'on retombe sur le nom sans le résultat.
        if (typeof gen.marches !== 'function') manquants.push(`${gen.id} (sans marches())`);
    }
    assert.deepEqual(manquants, [], 'ces progressions ne disent pas leur répartition');
});
