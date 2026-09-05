// LA RÉPARTITION D'UNE PROGRESSION.
//
// Rémy : « quand on a une progression, il faudrait pouvoir choisir aussi la
// répartition non ? »
//
// Ce qu'on éprouve ici tient en deux points, et le second est le vrai :
//
//   1. la marche suit le rythme demandé ;
//   2. LE NOMBRE DE QUESTIONS CONSEILLÉ SUIT AVEC. Un réglage qui changerait
//      seulement le rythme sans allonger l'exercice ne ferait que tronquer la
//      progression plus tôt — c'est exactement le défaut que `core/duree.js` a
//      été écrit pour tuer, et il serait revenu par la porte du réglage.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
    PAR_MARCHE_DEFAUT, PAR_MARCHE_MIN, PAR_MARCHE_MAX,
    parMarcheDe, paramParMarche, rangMarche, conseilProgression
} from '../js/core/progression.js';
import { questionsConseillees } from '../js/core/duree.js';

import { relatifsGenerator, NIVEAUX } from '../js/core/generators/relatifs.js';
import { relatifsAdditionGenerator } from '../js/core/generators/relatifsAddition.js';
import { fracSommeProgressiveGenerator } from '../js/core/generators/fractionsEquivalentes.js';
import { marchePour as marchePrefixes, ORDRE as ORDRE_PREFIXES } from '../js/core/generators/prefixes.js';
import { marcheThales, ORDRE_THALES } from '../js/core/generators/thales.js';

// --- La valeur elle-même ------------------------------------------------------

test('sans réglage, on garde ce qui existait : deux questions par marche', () => {
    assert.equal(parMarcheDe(null), PAR_MARCHE_DEFAUT);
    assert.equal(parMarcheDe({}), PAR_MARCHE_DEFAUT);
    // Un générateur qui en posait trois en dur garde ses trois.
    assert.equal(parMarcheDe({}, 3), 3);
});

test('UNE VALEUR ABSURDE NE CASSE PAS L\'EXERCICE', () => {
    // Un champ vidé à la main, un parcours enregistré avec du texte : la
    // division par zéro donnerait `Infinity` et l'exercice resterait sur la
    // première marche sans jamais rien dire.
    [0, -3, 'x', null, undefined, NaN].forEach(v => {
        assert.equal(parMarcheDe({ parMarche: v }), PAR_MARCHE_DEFAUT, String(v));
    });
    assert.equal(parMarcheDe({ parMarche: 99 }), PAR_MARCHE_MAX);
    assert.equal(parMarcheDe({ parMarche: 1 }), PAR_MARCHE_MIN);
    assert.equal(parMarcheDe({ parMarche: '4' }), 4, 'le DOM ne rend que des chaînes');
});

test('le réglage se déclare en glissière, entre 1 et 6', () => {
    const p = paramParMarche({ marches: 12 });
    assert.equal(p.id, 'parMarche');
    assert.equal(p.type, 'number');
    assert.equal(p.min, PAR_MARCHE_MIN);
    assert.equal(p.max, PAR_MARCHE_MAX);
    assert.equal(p.default, PAR_MARCHE_DEFAUT);
    // Le compte exact, parce que « il en faudra plus » n'est pas une information.
    assert.match(p.aide, /24 questions/);
    // Et l'aide dit que le réglage est sans effet sur une marche isolée : le
    // panneau ne sait pas masquer un réglage, on ne peut que l'écrire.
    assert.match(p.aide, /sans effet/i);
    assert.equal(paramParMarche({ defaut: 3, mot: 'palier' }).label, 'Questions par palier');
});

// --- La marche où l'on est ----------------------------------------------------

test('LA MARCHE SUIT LE RYTHME DEMANDÉ', () => {
    const rangs = (par) => Array.from({ length: 12 }, (_, i) => rangMarche(i, 6, { parMarche: par }));
    assert.deepEqual(rangs(1), [0, 1, 2, 3, 4, 5, 5, 5, 5, 5, 5, 5]);
    assert.deepEqual(rangs(2), [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    assert.deepEqual(rangs(4), [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2]);
});

test('ON NE REDESCEND JAMAIS : arrivé en haut, on y reste', () => {
    // La dernière marche est le sujet du chapitre ; les précédentes le
    // préparaient. Une fin de séance se passe donc en haut de l'escalier.
    for (let i = 20; i < 40; i++) assert.equal(rangMarche(i, 4, { parMarche: 2 }), 3);
});

test('à 1 par marche, la progression se VISITE en autant de questions que de marches', () => {
    const vues = new Set();
    for (let i = 0; i < 6; i++) vues.add(rangMarche(i, 6, { parMarche: 1 }));
    assert.equal(vues.size, 6, 'les six marches en six questions');
});

// --- Le conseil, qui est le vrai sujet ---------------------------------------

test('LE NOMBRE DE QUESTIONS CONSEILLÉ SUIT LA RÉPARTITION', () => {
    assert.equal(conseilProgression(12, { parMarche: 2 }), 24);
    assert.equal(conseilProgression(12, { parMarche: 4 }), 48);
    assert.equal(conseilProgression(12, { parMarche: 1 }), 12);
});

test('SANS CELA, LE RÉGLAGE NE FERAIT QUE TRONQUER LA PROGRESSION', () => {
    // Le cas concret : douze marches, quatre questions chacune. Si le conseil
    // restait à 24, l'élève verrait six marches sur douze — et personne ne le
    // lui dirait, exactement comme le défaut de dix que `duree.js` a corrigé.
    const conseil = questionsConseillees(relatifsAdditionGenerator,
        { etape: 'progressif', parMarche: 4 });
    const derniere = rangMarche(conseil - 1, 12, { parMarche: 4 });
    assert.equal(derniere, 11, `avec ${conseil} questions on doit atteindre la 12e marche`);
});

test('les conseils par défaut ne bougent pas d\'un pouce', () => {
    // La garantie de non-régression : aucun exercice existant ne change de
    // longueur du seul fait qu'un réglage est apparu.
    assert.equal(questionsConseillees(relatifsGenerator, { niveau: 'progressif' }),
        NIVEAUX.length * 2);
    assert.equal(questionsConseillees(relatifsAdditionGenerator, { etape: 'progressif' }), 24);
    // Quatre marches à deux questions font huit ; le défaut de dix reste
    // au-dessus, et c'est lui qu'on garde — le conseil est un plancher.
    assert.equal(questionsConseillees(fracSommeProgressiveGenerator, { niveau: 'progressif' }), 10);
});

test('une marche isolée ne réclame pas la longueur de tout l\'escalier', () => {
    const seule = questionsConseillees(relatifsAdditionGenerator,
        { etape: 'somme-positifs', parMarche: 6 });
    assert.ok(seule <= 10, `une seule marche ne demande pas ${seule} questions`);
});

// --- Les générateurs qui CYCLENT ---------------------------------------------

test('LES PROGRESSIONS QUI RECOMMENCENT EN BAS OBÉISSENT AUSSI', () => {
    // Préfixes et Thalès repartent de la première marche une fois en haut :
    // sur une fiche de vingt questions, plafonner en poserait quinze du même
    // type. Le rythme se règle, le cycle reste.
    assert.equal(marchePrefixes('progressif', 0), ORDRE_PREFIXES[0]);
    assert.equal(marchePrefixes('progressif', 1, { parMarche: 1 }), ORDRE_PREFIXES[1]);
    assert.equal(marchePrefixes('progressif', ORDRE_PREFIXES.length, { parMarche: 1 }),
        ORDRE_PREFIXES[0], 'le cycle recommence');

    assert.equal(marcheThales('progressif', 5, { parMarche: 1 }),
        ORDRE_THALES[5 % ORDRE_THALES.length]);
    // Et sans réglage, le comportement d'origine — trois par marche — tient.
    assert.equal(marcheThales('progressif', 2), ORDRE_THALES[0]);
    assert.equal(marcheThales('progressif', 3), ORDRE_THALES[1]);
});

// --- Le réglage est offert PARTOUT où il y a une progression ------------------

test('TOUT GÉNÉRATEUR QUI ANNONCE UNE PROGRESSION OFFRE LE RÉGLAGE', async () => {
    // C'est la question de Rémy prise au mot : « quand on a une progression ».
    // Un menu qui promet « les 12 marches à la suite » sans dire à quel rythme
    // les parcourt est précisément ce qu'on vient de corriger — et rien
    // n'empêcherait le prochain générateur de refaire le même oubli.
    await import('../js/core/activities/index.js');
    const { allGenerators } = await import('../js/core/registry.js');
    const manquants = [];
    for (const gen of allGenerators()) {
        const params = gen.params || [];
        // « Une progression » se reconnaît de deux façons dans le catalogue :
        // une option nommée `progressif` dans un menu, ou une case à cocher
        // `progressif` (« Commencer plus facile »). Les deux montent par
        // marches, les deux doivent dire à quel rythme.
        const progressif = params.some(p => p.id === 'progressif')
            || params.some(p => (p.options || [])
                .some(o => (o && typeof o === 'object' ? o.value : o) === 'progressif'));
        if (!progressif) continue;
        if (!params.some(p => p.id === 'parMarche')) manquants.push(gen.id);
    }
    assert.deepEqual(manquants, [], 'ces progressions ne disent pas leur rythme');
});
