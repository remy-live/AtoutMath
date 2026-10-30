// LES TROUS DE LA FEUILLE, ET LA FICHE DE « PLUS PETIT, PLUS GRAND… OU ÉGAL ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture de la fiche à l'appui :
//
//   « tu vois que la présentation à l'impression est curieuse […] Mets juste
//     plutôt le signe inégalité à compléter sur les exercices à imprimers. Et
//     un énoncé du genre encadre à l'unité »
//
// Ce que la feuille imprimait :
//
//     1.  Vrai ou faux : 30 < 21   ..........
//     6.  Encadre 31,6 entre deux entiers qui se suivent : ... < 31,6 < ...
//
// TROIS DÉFAUTS, DONT DEUX QUE LE TEXTE SEUL NE MONTRE PAS. Il a fallu
// REGARDER l'aperçu (tools/tmp/regarderLaFiche.mjs) : les deux premiers se
// lisent dans la chaîne, le troisième ne se voit qu'en pixels.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { texteImprime } from '../js/core/fiche.js';
import { encadrementGenerator } from '../js/core/generators/encadrement.js';
import { makeRng } from '../js/core/ids.js';
import { exercices } from '../js/data/catalog.js';

/** Combien de trous la mise en page dessinera : une suite d'espaces, un trou. */
const trous = (t) => (String(t).match(/ {3,}/g) || []).length;

test('UNE SUITE DE POINTS EST UN SEUL TROU, PAS UN PAR POINT', () => {
    // LE DÉFAUT EXACT QU'IL A VU. « 22 ……… 22 » sortait avec TROIS petites
    // lignes pointillées : le motif remplaçait chaque « … » séparément, et la
    // mise en page dessine un trou par suite d'espaces. L'élève lit alors
    // trois choses à écrire là où on en demande une.
    assert.equal(trous(texteImprime('22 ……… 22', '<')), 1);
    assert.equal(trous(texteImprime('22 … 22', '<')), 1);
    assert.equal(trous(texteImprime('10 h ……………… min', '45')), 1);
    // ET DEUX TROUS RESTENT DEUX TROUS : la règle ne doit pas coller ensemble
    // deux places séparées par du texte.
    assert.equal(trous(texteImprime('Encadre : ……… < 8,8 < ………', '8 < 8,8 < 9')), 2);
});

test('UN TROU PEUT FINIR L\'ÉNONCÉ', () => {
    // « Encadre à l'unité : … < 8,8 < … » laissait le DERNIER « … » imprimé en
    // toutes lettres : le motif exigeait quelque chose derrière, et il n'y a
    // rien derrière une fin de ligne. Trois autres générateurs en souffraient
    // — « Note la figure ci-dessus : …… », « 7/10 = … », la valeur absolue.
    for (const [enonce, reponse] of [
        ['Note la figure ci-dessus : ……', '[AB)'],
        ['7/10 = …', '0,7'],
        ['|−5| se lit : ………………', 'la distance à zéro']
    ]) {
        const t = texteImprime(enonce, reponse);
        assert.equal(trous(t), 1, `« ${enonce} » doit finir par UN trou`);
        assert.ok(!/[…]/.test(t), `« ${enonce} » ne doit plus porter de points de suspension`);
    }
});

test('SUR LE PAPIER, C\'EST LE SIGNE QU\'ON ÉCRIT', () => {
    // À l'écran, deux bulles VRAI/FAUX font le travail ; sur une feuille,
    // l'élève écrivait « vrai » sur une ligne de points et n'écrivait AUCUN
    // signe — alors que le signe EST le geste du chapitre.
    const papier = [];
    for (let i = 0; i < 40; i++) {
        const it = encadrementGenerator.generate({ marches: ['large-strict'] },
            { index: i, total: 40, rng: makeRng('p' + i), papier: true });
        papier.push(it);
    }
    for (const it of papier) {
        assert.match(it.prompt.papier, /^\d+ ……… \d+$/,
            `l'énoncé de papier doit être « a ……… b », reçu « ${it.prompt.papier} »`);
        // ET LE CORRIGÉ RESTE HONNÊTE. C'est pour cela que le générateur rend
        // un AUTRE item quand il écrit pour le papier, au lieu de changer le
        // libellé : un simple habillage aurait imprimé « vrai » sous une
        // question qui demande un signe — le piège de la fiche des formules,
        // « la bonne réponse est =A1+B1 pas 17 ».
        assert.ok(['<', '>', '='].includes(it.answer),
            `la réponse de papier doit être un signe, reçu « ${it.answer} »`);
        const [a, b] = it.prompt.papier.split(' ……… ').map(Number);
        const attendu = a < b ? '<' : a > b ? '>' : '=';
        assert.equal(it.answer, attendu, `${a} ${it.answer} ${b} est faux`);
    }
    // ET LES TROIS SIGNES SORTENT VRAIMENT, le « = » compris : c'est le cas
    // qui apprend quelque chose, et le tirage le sert une fois sur trois.
    const vus = new Set(papier.map(it => it.answer));
    assert.deepEqual([...vus].sort(), ['<', '=', '>']);
});

test('L\'ÉCRAN GARDE SA MARCHE ENTIÈRE — VRAI OU FAUX, ET LES SIGNES LARGES', () => {
    // CE QU'ON NE DOIT PAS PERDRE EN CORRIGEANT LA FEUILLE. Le papier ne
    // distingue plus « < » de « ⩽ » (on complète par <, > ou =) ; l'écran, lui,
    // est l'endroit où cela s'apprend, une question sur trois portant sur deux
    // nombres ÉGAUX — le seul cas où les deux signes ne disent pas la même
    // chose.
    const vus = new Set();
    let egaux = 0;
    for (let i = 0; i < 40; i++) {
        const it = encadrementGenerator.generate({ marches: ['large-strict'] },
            { index: i, total: 40, rng: makeRng('e' + i) });
        assert.match(it.prompt.text, /^Vrai ou faux/);
        assert.ok(['vrai', 'faux'].includes(it.answer));
        (it.prompt.text.match(/[<>⩽⩾]/g) || []).forEach(s => vus.add(s));
        if (it.meta && it.meta.egaux) egaux++;
    }
    assert.ok(vus.has('⩽') || vus.has('⩾'), 'les signes LARGES doivent rester à l\'écran');
    assert.ok(egaux > 5, `trop peu de cas d'égalité à l'écran (${egaux}/40)`);
});

test('ET L\'ÉNONCÉ DE L\'ENCADREMENT EST COURT, SANS CESSER DE DIRE LE RANG', () => {
    // « Encadre 31,6 entre deux entiers qui se suivent : » tenait sur deux
    // lignes, poussait les pointillés à la ligne suivante, et répétait dix
    // fois ce qu'une consigne dit une fois.
    const vus = new Set();
    for (let i = 0; i < 30; i++) {
        const it = encadrementGenerator.generate(
            { marches: ['encadrer-entier', 'encadrer-dizaine', 'encadrer-dixieme'] },
            { index: i, total: 30, rng: makeRng('c' + i), papier: true });
        assert.match(it.prompt.papier,
            /^Encadre (à l'unité|à la dizaine|au dixième) : ……… < [\d,]+ < ………$/,
            `énoncé inattendu : « ${it.prompt.papier} »`);
        vus.add(/^Encadre ([^:]+) :/.exec(it.prompt.papier)[1].trim());
    }
    // LE RANG RESTE DANS CHAQUE LIGNE, et c'est volontaire : une même feuille
    // mêle les trois paliers, donc la consigne de l'exercice ne peut pas le
    // dire pour toutes les questions.
    assert.deepEqual([...vus].sort(), ['au dixième', 'à la dizaine', 'à l\'unité'].sort());
});

test('LA CONSIGNE DE LA FEUILLE DIT CE QU\'ELLE DEMANDE VRAIMENT', () => {
    // Elle annonçait « Réponds par VRAI ou FAUX » du temps où la feuille
    // recopiait les bulles de l'écran. Une consigne fausse coûte plus cher
    // qu'une consigne absente : l'élève la croit.
    const exo = exercices.find(e => e.id === 'num-encadrement');
    assert.ok(exo, 'l\'exercice doit exister');
    assert.ok(!/VRAI ou FAUX/i.test(exo.consignePapier),
        `la consigne parle encore de vrai/faux : « ${exo.consignePapier} »`);
    assert.match(exo.consignePapier, /<, > ou =/);
});
