// LE MOINS DEVANT LA PARENTHÈSE, SUR LE PAPIER.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, dans sa revue du catalogue : « Le Moins devant la Parenthèse » ne
// s'imprimait pas. L'exercice portait pourtant DÉJÀ sa consigne papier et ses
// quatre colonnes — il lui manquait seulement un générateur, parce qu'il
// n'existe qu'à l'écran.
//
// Et le moteur savait déjà tout faire : `tirerExpression` prend `avecOppose`,
// `etapesMax` aussi. Il n'y avait rien à écrire, seulement à brancher.
//
// ── CE QUE CES ÉPREUVES TIENNENT ──────────────────────────────────────────
//
// Deux chapitres passent par le même rendu, et c'est là que ça se gâte : une
// feuille d'opposés coiffée du titre des priorités demande à l'élève de
// chercher ce qu'il révise. Le drapeau qui les distingue ne sert QU'À ÇA — il
// n'a aucun autre effet — donc rien ne le rattraperait s'il disparaissait.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prioritesFicheGenerator } from '../js/core/generators/prioritesFiche.js';
import { RENDUS_NOMBRES } from '../js/ui/fiches/nombres.js';
import { MARCHES_OPPOSE } from '../js/core/priorites.js';
import { makeRng } from '../js/core/ids.js';

const tirer = (params, i = 0, total = 8) => prioritesFicheGenerator.generate(params,
    { rng: makeRng(), index: i, total, papier: true, themesExclus: [] });

test('LA FICHE DU MOINS DEVANT LA PARENTHÈSE TIRE BIEN DES OPPOSÉS', () => {
    for (let i = 0; i < 12; i++) {
        const q = tirer({ oppose: true, relatifs: true }, i, 12);
        assert.match(q.meta.texte, /^−\(/,
            `« ${q.meta.texte} » ne commence pas par un moins devant une parenthèse`);
        assert.equal(q.meta.oppose, true);
    }
});

test('SANS LE RÉGLAGE, CE SONT DES PRIORITÉS ORDINAIRES', () => {
    // Un réglage qui ne change rien est un réglage qui ment — et celui-ci
    // décide de quel CHAPITRE est la feuille.
    const sans = Array.from({ length: 12 }, (_, i) => tirer({}, i, 12).meta.texte);
    assert.ok(!sans.every(t => t.startsWith('−(')),
        `sans le réglage, toutes les expressions sont des opposés : ${sans[0]}`);
    assert.equal(tirer({}).meta.oppose, false);
});

test('LES DEUX BARREAUX SORTENT, ET UN BARREAU QUI N\'EXISTE PAS EST RAMENÉ', () => {
    // L'échelle de l'opposé n'a que DEUX crans — « une priorité dedans » et
    // « l'expression entière ». Celle des priorités en a quatre.
    //
    // UN PARCOURS PRÉPARÉ HIER PEUT PORTER UN BARREAU 3 OU 4 : `ANCIEN_NIVEAU`
    // existe précisément pour traduire les réglages d'avant les cases. Le
    // moteur, lui, ramène tout seul un niveau trop haut — mais le `meta`, non :
    // il rapporterait « barreau 4 » au bilan pour une expression du barreau 2,
    // et Rémy lirait que l'élève travaille un cran qu'il n'a jamais vu.
    //
    // (Première version de cette épreuve : elle cochait les deux barreaux de
    // l'opposé et vérifiait qu'on voyait 1 et 2. `epreuveTombe` l'a montrée
    // verte avec le plafond retiré ET avec la mauvaise table de barreaux — la
    // liste cochée bornait déjà tout. Elle ne gardait rien.)
    const vus = new Set();
    for (let i = 0; i < 20; i++) {
        vus.add(tirer({ oppose: true, marches: ['1', '2'] }, i, 20).meta.niveau);
    }
    assert.deepEqual([...vus].sort(), [1, 2], `barreaux vus : ${[...vus].join(', ')}`);

    for (let i = 0; i < 12; i++) {
        const m = tirer({ oppose: true, marches: ['1', '2', '3', '4'] }, i, 12).meta;
        assert.ok(m.niveau <= 2,
            `le meta rapporte le barreau ${m.niveau}, qui n'existe pas sur cette échelle`);
        assert.ok(MARCHES_OPPOSE.some(x => x.id === m.marche),
            `« ${m.marche} » n'est pas un barreau de l'échelle de l'opposé`);
    }
});

test('LA CASCADE DESCEND JUSQU\'AU NOMBRE SEUL', () => {
    // Un opposé est une OPÉRATION : « −(27) » devient « −27 », et c'est une
    // ligne. L'oublier donnerait une cascade à qui il manque sa dernière
    // ligne — et le trou se voit au crayon, pas à l'écran.
    for (let i = 0; i < 10; i++) {
        const m = tirer({ oppose: true }, i, 10).meta;
        assert.equal(m.lignes[0], m.texte, 'la cascade commence par l\'expression');
        // ON COMPARE LES NOMBRES, PAS LEUR ÉCRITURE. Le moteur écrit le moins
        // TYPOGRAPHIQUE « − » (U+2212), `String(-54)` le trait d'union. La
        // première version de cette épreuve tombait là-dessus, sur un code
        // juste — c'est le même piège que la garde du radical, où un motif
        // deviné ne reconnaissait pas le « − » du logiciel.
        const dernier = m.lignes[m.lignes.length - 1].replace(/\u2212/g, '-');
        assert.equal(Number(dernier), m.resultat,
            `« ${m.texte} » finit sur « ${m.lignes[m.lignes.length - 1]} » et non ${m.resultat}`);
        // Et la feuille réserve au moins la place de ce qu'il y a à écrire.
        assert.ok(m.etapesMax >= m.etapes,
            `${m.etapes} étapes à écrire pour ${m.etapesMax} lignes réservées`);
    }
});

test('LE TITRE ET LA CONSIGNE SUIVENT LE CHAPITRE', () => {
    // Deux chapitres par le même rendu. Le drapeau `oppose` du `meta` ne sert
    // QU'À ÇA : rien d'autre ne le lit, donc rien ne le rattraperait.
    const r = RENDUS_NOMBRES.priorites;
    const avec = [{ meta: { oppose: true } }];
    const sans = [{ meta: { oppose: false } }];
    assert.notEqual(r.titre(avec), r.titre(sans),
        'les deux chapitres sortent sous le même titre');
    assert.match(r.titre(avec), /moins devant la parenthèse/i);
    // La phrase de Rémy, mot pour mot — c'est ce qu'il avait écrit dans le
    // `consignePapier` de cet exercice.
    assert.match(r.consigne(avec), /Attention au moins devant la parenthèse\./);
    assert.doesNotMatch(r.consigne(sans), /Attention au moins/);
});

test('LE CATALOGUE BRANCHE L\'EXERCICE SUR CE GÉNÉRATEUR', async () => {
    // Une fiche qui n'est branchée nulle part n'existe pas, et c'est
    // exactement l'état dans lequel Rémy l'a trouvée.
    const { exercices } = await import('../js/data/catalog.js');
    const e = exercices.find(x => x.id === 'calc-prio-oppose');
    assert.equal(e.printable, 'priorites');
    assert.equal(e.printGeneratorId, 'calc.priorites-fiche');
    assert.equal((e.printParams || {}).oppose, true,
        'sans `printParams.oppose`, la feuille imprime des priorités ordinaires');
});
