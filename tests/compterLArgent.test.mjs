// COMPTER L'ARGENT — ce qui doit tenir pour qu'on puisse le donner à la classe.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'aimerai bien aussi un exercice où il faut compter l'argent et par
// exemple si j'ai 7 centimes, il faut marquer 0,07 ».
//
// LA PREMIÈRE ÉPREUVE EST SA PHRASE, MOT POUR MOT. Les suivantes gardent les
// deux choses qu'un dessin peut trahir sans rien dire : UN TAS QUI NE VAUT PAS
// CE QU'IL MONTRE — l'élève compterait juste et serait compté faux —, et UN
// DESSIN QUI DÉBORDE DE SA PLANCHE, c'est-à-dire une pièce coupée par le bord.
//
// CE SECOND DÉFAUT, ON L'A EU. La première version rangeait le tas sur une
// grille à pas fixe de 58 unités ; un billet en fait 94. Photographié : le
// billet sortait de la planche, et les pièces se posaient par-dessus. Aucun
// sélecteur ne l'aurait dit — le SVG était là, bien formé, avec le bon nombre
// d'objets.
//
// ET AUSSI : « il faut que les billets et les pièces soit super réalistes stp ».
// Les tailles relatives sont la part de ce mot qu'une épreuve peut tenir — la
// pièce de 5 centimes EST plus grande que celle de 10, et un élève qui
// reconnaît ses pièces aurait raison contre le logiciel.

import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import {
    PIECES, BILLETS, enEuros, enNombre, enMots, rayonDe, rendreEnPieces,
    tasSvg, rangsSvg, question, ETAPES, argentGenerator
} from '../js/core/generators/argent.js';
import '../js/core/activities/index.js';
import { exercices } from '../js/data/catalog.js';

const marche = (id) => ETAPES.find(e => e.id === id);
const unItem = (id, graine = 'g') => argentGenerator.generate(
    { marches: [id] }, { rng: makeRng(`${id}-${graine}`), index: 0, total: 1 });

test('SEPT CENTIMES S\'ÉCRIVENT 0,07 — ET SOIXANTE-DIX, 0,70', () => {
    // LA DEMANDE DE RÉMY, ET SON PIÈGE INVERSE. Les deux sont la même règle
    // lue dans les deux sens, et un élève qui n'a retenu que la première écrit
    // 0,07 pour soixante-dix centimes.
    assert.equal(enEuros(7), '0,07');
    assert.equal(enEuros(70), '0,70');
    assert.equal(enEuros(205), '2,05');
    assert.equal(enEuros(0), '0,00');
    // ET LA RÉPONSE ATTENDUE EST LE NOMBRE, pas la chaîne : c'est elle qu'on
    // compare à ce que l'élève tape. 0,07 vaut sept centièmes, pas sept
    // dixièmes.
    assert.equal(enNombre(7), 0.07);
    assert.equal(enNombre(70), 0.7);
    assert.equal(enNombre(205), 2.05);
});

test('L\'ÉNONCÉ DIT LE MONTANT COMME ON LE DIT EN CLASSE', () => {
    assert.equal(enMots(7), '7 centimes');
    assert.equal(enMots(1), '1 centime');
    assert.equal(enMots(100), '1 euro');
    assert.equal(enMots(200), '2 euros');
    assert.equal(enMots(205), '2 euros et 5 centimes');
});

test('LE TAS REND EXACTEMENT LE MONTANT, ET SE COMPTE À L\'ŒIL', () => {
    // LE DÉFAUT LE PLUS CHER DE TOUT L'EXERCICE : un tas dont la somme ne fait
    // pas le montant compterait FAUX un élève qui a compté JUSTE.
    //
    // ET IL A EXISTÉ. La première version payait le reste en pièces de 1
    // centime et s'arrêtait à quatorze objets : sur les 9800 montants
    // possibles, SEPT rendaient un centime de moins que demandé. Ce n'est pas
    // une épreuve déduite du code, c'est une épreuve écrite sur une mesure.
    const rng = makeRng('exact');
    let plusGros = 0;
    for (let m = 1; m <= 9800; m++) {
        const tas = rendreEnPieces(m, rng, true);
        assert.equal(tas.reduce((s, v) => s + v, 0), m,
            `${m} centimes rendus en ${tas.join(' + ')}`);
        plusGros = Math.max(plusGros, tas.length);
    }
    // UN TAS SE COMPTE À L'ŒIL. Au-delà de douze objets, l'élève échoue par
    // fatigue et non faute de savoir — le hasard en fabriquait dix-neuf.
    assert.ok(plusGros <= 12, `le plus gros tas fait ${plusGros} objets`);
});

test('ON NE REND QUE DES PIÈCES QUI EXISTENT', () => {
    // Un tas de trente centimes fait de trois pièces de 10 apprendrait à
    // compter, pas à payer — et une pièce de 30 centimes n'existe pas.
    //
    // LA LISTE EST RECOPIÉE ICI, EXPRÈS. Construite depuis `PIECES`, l'épreuve
    // se contentait de dire que le générateur rend ce qu'on lui a donné — elle
    // restait verte quand on glissait une pièce de 30 centimes dans la table.
    // `epreuveTombe` l'a attrapée.
    const vraies = new Set([1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]);
    assert.deepEqual([...PIECES, ...BILLETS].filter(v => !vraies.has(v)), [],
        'le générateur connaît une pièce ou un billet qui n\'existe pas');
    const rng = makeRng('existent');
    for (let m = 1; m <= 9800; m += 37) {
        for (const v of rendreEnPieces(m, rng, true)) {
            assert.ok(vraies.has(v), `la pièce de ${v} centimes n'existe pas`);
        }
    }
});

test('LE DESSIN MONTRE TOUT LE TAS, ET PAS UNE PIÈCE DE PLUS', () => {
    // ON COMPTE SUR LE DESSIN, PAS SUR LA LISTE. Une pièce oubliée par le
    // rangement — ou posée deux fois — donnerait un dessin qui ne vaut pas la
    // réponse, et c'est l'élève qui aurait tort. Chaque pièce porte son mot,
    // CENT ou EURO ; chaque billet porte le sien.
    const rng = makeRng('dessin');
    for (let m = 20; m <= 9800; m += 173) {
        const tas = rendreEnPieces(m, rng, true);
        const svg = tasSvg(tas);
        const mots = (svg.match(/>(CENT|EURO)</g) || []).length;
        assert.equal(mots, tas.length,
            `${m} centimes : ${tas.length} objets dans le tas, ${mots} dessinés`);
    }
});

test('LES PIÈCES ONT LEUR VRAIE TAILLE RELATIVE', () => {
    // RÉMY : « il faut que les billets et les pièces soit super réalistes ».
    //
    // LES DEUX INVERSIONS QUE TOUT LE MONDE CONNAÎT : la pièce de 5 centimes
    // est plus grande que celle de 10, et celle de 1 euro plus petite que
    // celle de 2. Un dessin qui dit le contraire est démenti par la poche de
    // l'élève.
    assert.ok(rayonDe(5) > rayonDe(10),
        'la pièce de 5 centimes est dessinée plus petite que celle de 10');
    assert.ok(rayonDe(100) < rayonDe(200),
        'la pièce de 1 euro est dessinée plus grande que celle de 2');
    assert.ok(rayonDe(1) < rayonDe(2) && rayonDe(2) < rayonDe(5),
        'les trois pièces de cuivre ne grandissent pas avec leur valeur');
    assert.ok(rayonDe(10) < rayonDe(20) && rayonDe(20) < rayonDe(50),
        'les trois pièces dorées ne grandissent pas avec leur valeur');
});

test('AUCUN DESSIN NE DÉBORDE DE SA PLANCHE', () => {
    // LE DÉFAUT QUE SEULE LA PHOTO AVAIT DIT, et qu'on garde maintenant sans
    // navigateur : une grille à pas fixe posait un billet de 94 unités dans
    // une case de 58, et le billet sortait par la gauche pendant que les
    // pièces se posaient dessus.
    const rng = makeRng('planche');
    for (let m = 20; m <= 9800; m += 211) {
        const tas = rendreEnPieces(m, rng, true);
        const svg = tasSvg(tas);
        const vue = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
        assert.ok(vue, 'le tas n\'a pas de planche');
        const [L, H] = [Number(vue[1]), Number(vue[2])];
        // Chaque cercle et chaque rectangle, bords compris.
        for (const c of svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)) {
            const [x, y, r] = [Number(c[1]), Number(c[2]), Number(c[3])];
            assert.ok(x - r >= -0.5 && x + r <= L + 0.5 && y - r >= -0.5 && y + r <= H + 0.5,
                `une pièce de rayon ${r} centrée en (${x}, ${y}) sort de la planche ${L}×${H}`);
        }
        for (const b of svg.matchAll(/<rect x="(-?[\d.]+)" y="(-?[\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)) {
            const [x, y, w, h] = [Number(b[1]), Number(b[2]), Number(b[3]), Number(b[4])];
            assert.ok(x >= -0.5 && y >= -0.5 && x + w <= L + 0.5 && y + h <= H + 0.5,
                `un billet de ${w}×${h} posé en (${x}, ${y}) sort de la planche ${L}×${H}`);
        }
    }
});

test('DEUX PIÈCES IDENTIQUES NE PARTAGENT PAS UN IDENTIFIANT', () => {
    // Un `id` déclaré deux fois dans le même SVG ne désigne plus rien de sûr :
    // le navigateur garde le premier, et le second dégradé est muet. Le tas en
    // porte presque toujours deux de la même valeur.
    const svg = tasSvg([200, 200, 200, 2, 2, 500, 500]);
    const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map(m => m[1]);
    assert.ok(ids.length, 'le tas ne déclare aucun dégradé');
    assert.equal(ids.length, new Set(ids).size,
        `le tas déclare deux fois le même identifiant : ${ids.join(', ')}`);
});

test('LE TABLEAU DES RANGS MET LE CHIFFRE DANS SA COLONNE', () => {
    // C'EST LE DESSIN QUI RÉPOND À LA QUESTION. S'il se trompe de colonne, il
    // enseigne la faute qu'il existe pour corriger.
    const chiffres = (svg) => [...svg.matchAll(/font-size="27"[^>]*>(\d)</g)].map(m => m[1]);
    assert.deepEqual(chiffres(rangsSvg(7)), ['0', '0', '7'],
        'sept centimes : le 7 ne va pas aux centièmes');
    assert.deepEqual(chiffres(rangsSvg(70)), ['0', '7', '0'],
        'soixante-dix centimes : le 7 ne va pas aux dixièmes');
    assert.deepEqual(chiffres(rangsSvg(205)), ['2', '0', '5'],
        '2 € et 5 centimes : les trois chiffres ne sont pas à leur rang');
});

test('LES NEUF MARCHES SE JOUENT TOUTES', () => {
    for (const e of ETAPES) {
        const it = unItem(e.id);
        assert.equal(it.meta.marche, e.id, `la marche ${e.id} ne se tire pas`);
        assert.ok(it.prompt.text && it.prompt.html, `${e.id} : énoncé vide`);
        assert.ok(Number.isFinite(it.answer), `${e.id} : réponse non numérique`);
        // LA RÉPONSE DOIT ÊTRE SAISISSABLE : sans ce drapeau, le pavé
        // numérique ne porte pas de virgule et 0,07 ne peut pas s'écrire.
        assert.equal(it.meta.decimal, true,
            `${e.id} : le pavé n'aura pas de virgule, la réponse est intapable`);
        // ET LE SECOND INDICE EST UN DESSIN, celui qui répond sans une phrase.
        assert.match((it.schemas || [])[1] || '', /^<svg /,
            `${e.id} : le second indice n'a pas son tableau de rangs`);
        assert.equal((it.schemas || [])[0], '', `${e.id} : le premier indice porte un dessin`);
    }
});

test('L\'INDICE S\'ACCORDE AVEC LE NOMBRE QU\'IL DIT', () => {
    // « 1 centimes, c'est 1 centièmes » — LU SUR LA PHOTO DE LA CARTE
    // D'INDICE, et par aucun autre moyen : l'indice n'est regardé ni par le
    // harnais de bout en bout, ni par un sélecteur, et une faute d'accord ne
    // lève évidemment aucune erreur. Un indice qui écrit mal la langue perd
    // la confiance de l'élève sur le reste de ce qu'il dit.
    let vuUn = false;
    for (let g = 0; g < 60; g++) {
        const it = unItem('centimes-petits', `accord-${g}`);
        const c = it.meta.centimes;
        const aide = it.hints[1];
        if (c === 1) {
            vuUn = true;
            assert.ok(!/1 centimes|1 centièmes/.test(aide), `l'indice dit « ${aide} »`);
        } else {
            assert.ok(aide.includes(`${c} centimes`) && aide.includes(`${c} centièmes`),
                `l'indice de ${c} centimes dit « ${aide} »`);
        }
    }
    // SANS CE CONTRÔLE, L'ÉPREUVE POURRAIT NE RIEN MESURER : si aucun tirage
    // ne tombait sur un centime, le seul cas qui pose la question ne serait
    // jamais vu, et elle passerait au vert pour cette raison-là.
    assert.ok(vuUn, 'aucun tirage à un centime : l\'épreuve ne mesure pas le singulier');
});

test('LA MARCHE DES DIZAINES NE TIRE QUE DES DIZAINES', () => {
    // C'est elle qui porte le piège inverse — 70 centimes, pas 7. Un tirage
    // qui y glisserait 44 centimes la viderait de son sujet.
    for (let g = 0; g < 30; g++) {
        const c = question(marche('centimes-dizaines'), makeRng(`dix-${g}`)).centimes;
        assert.equal(c % 10, 0, `${c} centimes n'est pas un nombre de dizaines`);
        assert.ok(c >= 10 && c <= 90, `${c} centimes sort de la marche`);
    }
});

test('L\'EXERCICE EST AU CATALOGUE, AVEC SON PAVÉ', () => {
    const exo = exercices.find(e => e.id === 'num-argent');
    assert.ok(exo, 'l\'exercice n\'est pas au catalogue');
    assert.equal(exo.generatorId, 'num.argent');
    // LE PAVÉ NUMÉRIQUE, ET PAS UN QCM : « il faut marquer 0,07 » demande
    // d'ÉCRIRE le zéro qui tient le rang. Choisir entre 0,07 et 0,7 est une
    // question voisine, pas celle-là.
    assert.equal(exo.activityId, 'numpad',
        'l\'exercice ne fait plus TAPER la réponse — c\'était tout le sujet');
});
