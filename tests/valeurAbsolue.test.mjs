// |x − a| EST UNE DISTANCE — LES QUATRE LIGNES DE LA FEUILLE DE RÉMY.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, photo d'une feuille de Seconde : « j'aimerai ce style d'exercice ».
//
//     1. Dans chaque cas, représenter l'ensemble des nombres réels x tels que
//        a. |x − 2| = 5        c. |x − 3| ⩽ 1,5
//        b. |x + 4| = 1        d. |x + 2| < 4,5
//
// CES QUATRE LIGNES-LÀ SONT L'ÉPREUVE. Un générateur qui rendrait des ensembles
// plausibles mais faux ne se verrait nulle part : l'écran afficherait quatre
// droites graduées, l'élève en choisirait une, et le logiciel compterait faux
// une réponse juste. On part donc de ce que le professeur a écrit à la main, et
// l'on vérifie que la machine trouve la même chose que lui.
//
// LE RESTE GARDE CE QUI NE SE VOIT PAS :
//
//   · l'échelle tient sa promesse — un barreau n'ajoute qu'une difficulté, et
//     celui qui n'a pas encore vu le piège du plus n'en tire pas ;
//   · les leurres sont des fautes, pas du bruit, et aucun ne coïncide avec la
//     bonne réponse — un QCM dont deux propositions sont justes est insoluble
//     et ne lève aucune erreur.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import {
    MARCHES, tirerValeurAbsolue, solutionDe, solutionTexte, fautesValeurAbsolue,
    barresTexte, enonceTexte, distanceTexte, dessinDe
} from '../js/core/valeursAbsolues.js';

const LE = '⩽', GE = '⩾';

test('LES QUATRE LIGNES DE LA FEUILLE DE RÉMY', () => {
    // a. |x − 2| = 5 : les deux nombres à 5 de 2.
    assert.equal(solutionTexte(solutionDe(2, 5, '=')), '{−3 ; 7}');
    // b. |x + 4| = 1 : le centre est −4, pas 4. C'est LA faute du chapitre.
    assert.equal(barresTexte(-4, true), '|x + 4|');
    // ON N'ÉCRIT JAMAIS |x − −4|, MÊME QUAND ON NE L'A PAS DEMANDÉ.
    //
    // `tools/epreuveTombe.mjs` a pris cette épreuve en faute : on a retiré du
    // code le repli qui écrit le plus pour un centre négatif, et elle est
    // restée verte. Elle ne posait la question qu'avec le drapeau à `true`,
    // c'est-à-dire dans le seul cas où le repli ne sert à rien.
    //
    // OR LE CAS EXISTE : aux barreaux où le signe n'est pas le sujet, le
    // centre est tiré dans [−4 ; 6] et le drapeau reste faux une fois sur
    // deux. Un centre négatif y passe donc par le repli, et sans lui l'élève
    // lirait « |x − −4| » — une écriture qu'aucun manuel ne montre.
    assert.equal(barresTexte(-4, false), '|x + 4|');
    assert.equal(barresTexte(0, false), '|x|');
    assert.equal(solutionTexte(solutionDe(-4, 1, '=')), '{−5 ; −3}');
    // c. |x − 3| ⩽ 1,5 : le segment centré sur 3, rayon 1,5 des deux côtés.
    assert.equal(solutionTexte(solutionDe(3, 1.5, LE)), '[1,5 ; 4,5]');
    // d. |x + 2| < 4,5 : le même, ouvert, centré sur −2.
    assert.equal(solutionTexte(solutionDe(-2, 4.5, '<')), ']−6,5 ; 2,5[');

    // ET L'ÉNONCÉ S'ÉCRIT COMME SUR LA FEUILLE, virgule décimale comprise.
    assert.equal(enonceTexte(2, 5, '=', false), '|x − 2| = 5');
    assert.equal(enonceTexte(-4, 1, '=', true), '|x + 4| = 1');
    assert.equal(enonceTexte(3, 1.5, LE, false), `|x − 3| ${LE} 1,5`);
    assert.equal(enonceTexte(-2, 4.5, '<', true), '|x + 2| < 4,5');
});

test('UNE ÉGALITÉ DONNE DEUX POINTS, PAS UN SEGMENT', () => {
    // C'est la faute qu'on voit le plus, et la raison pour laquelle la réponse
    // est un DESSIN : à l'écrit, « x = −3 ou x = 7 » ne dit pas si l'élève a
    // compris ou résolu deux équations au hasard.
    const p = solutionDe(2, 5, '=');
    assert.equal(p.sorte, 'points');
    assert.deepEqual(p.valeurs, [-3, 7]);
    const d = dessinDe(p);
    assert.equal(d.parts.length, 0, 'rien à tracer entre les deux points');
    assert.deepEqual(d.points, [-3, 7]);

    // ⩾ DONNE LE CONTRAIRE : ce qui est LOIN du centre, donc deux morceaux.
    const e = solutionDe(2, 5, GE);
    assert.equal(e.sorte, 'exterieur');
    assert.equal(solutionTexte(e), ']−∞ ; −3] ∪ [7 ; +∞[');
    assert.equal(dessinDe(e).parts.length, 2, 'deux demi-droites, et un trou au milieu');
});

test('L\'ÉCHELLE TIENT SA PROMESSE : UN BARREAU, UNE DIFFICULTÉ', () => {
    const vus = {};
    for (const m of MARCHES) {
        vus[m.id] = [];
        for (let k = 0; k < 40; k++) {
            vus[m.id].push(tirerValeurAbsolue({ rng: makeRng(`${m.id}-${k}`), marche: m.id }));
        }
    }
    // LE PIÈGE DU PLUS N'ARRIVE PAS AVANT SON BARREAU. Un |x + 3| tiré au
    // barreau 2 mettrait la difficulté du barreau 5 quatre crans trop tôt — et
    // l'échelle ne promettrait plus rien. C'est le centre qu'on regarde, et non
    // l'écriture : un centre négatif s'écrit toujours avec un plus.
    for (const id of ['lire', 'egal', 'large', 'strict']) {
        for (const q of vus[id]) {
            assert.ok(q.centre > 0,
                `barreau « ${id} » : ${q.enonce} a un centre négatif, ce que seul le `
                + 'barreau « plus » travaille');
        }
    }
    for (const q of vus.plus) {
        assert.ok(q.centre < 0, `barreau « plus » : ${q.enonce} devrait écrire |x + a|`);
    }
    // LES DÉCIMAUX N'ARRIVENT QU'AU BARREAU QUI LES ANNONCE.
    for (const id of ['lire', 'egal', 'large', 'strict', 'plus']) {
        for (const q of vus[id]) {
            assert.ok(Number.isInteger(q.rayon),
                `barreau « ${id} » : rayon ${q.rayon}, décimal avant son barreau`);
        }
    }
    for (const q of vus.decimal) {
        assert.ok(!Number.isInteger(q.rayon), `barreau « decimal » : rayon ${q.rayon}`);
    }
    // ET AUCUN ÉNONCÉ, NULLE PART, NE MONTRE DEUX MOINS DE SUITE.
    for (const m of MARCHES) {
        for (const q of vus[m.id]) {
            assert.doesNotMatch(q.enonce, /− ?−/,
                `barreau « ${m.id} » : ${q.enonce} — un centre négatif s'écrit avec un plus`);
        }
    }
    // ET CHAQUE BARREAU TIRE LA RELATION QU'IL ANNONCE.
    for (const q of vus.egal) assert.equal(q.relation, '=');
    for (const q of vus.large) assert.equal(q.relation, LE);
    for (const q of vus.strict) assert.equal(q.relation, '<');
    for (const q of vus.superieur) {
        assert.ok(q.relation === GE || q.relation === '>', q.enonce);
        assert.equal(q.solution.sorte, 'exterieur');
    }
});

test('AUCUN LEURRE NE COÏNCIDE AVEC LA BONNE RÉPONSE', () => {
    // UN QCM DONT DEUX PROPOSITIONS SONT JUSTES EST INSOLUBLE, et rien ne le
    // signale : l'élève clique la bonne, le logiciel compte faux, et l'on
    // cherche le défaut dans l'écran. On compare les ensembles par leur
    // ÉCRITURE, qui est exactement ce que l'élève voit dessiné.
    for (const m of MARCHES) {
        for (let k = 0; k < 40; k++) {
            const q = tirerValeurAbsolue({ rng: makeRng(`leurre-${m.id}-${k}`), marche: m.id });
            const bonne = solutionTexte(q.solution);
            const faux = fautesValeurAbsolue(q).map((f) => solutionTexte(f.sol));
            for (const f of faux) {
                assert.notEqual(f, bonne,
                    `${q.enonce} : un leurre est égal à la bonne réponse (${bonne})`);
            }
            assert.equal(new Set(faux).size, faux.length,
                `${q.enonce} : deux leurres identiques — ${faux.join(' · ')}`);
            assert.ok(faux.length >= 3,
                `${q.enonce} : ${faux.length} leurre(s), il en faut trois pour un QCM`);
        }
    }
});

test('CHAQUE LEURRE PORTE LA PHRASE QUI NOMME LA FAUTE', () => {
    // Un « faux » sans raison n'apprend rien. `activities/choice.js` sert ce
    // `why` à l'élève qui se trompe : c'est la correction, pas un lot de
    // consolation.
    for (const m of MARCHES) {
        const q = tirerValeurAbsolue({ rng: makeRng(`why-${m.id}`), marche: m.id });
        for (const f of fautesValeurAbsolue(q)) {
            assert.ok(typeof f.why === 'string' && f.why.length > 20,
                `${q.enonce} : un leurre sans explication`);
            assert.doesNotMatch(f.why, /undefined|NaN/, `${q.enonce} : ${f.why}`);
        }
    }
});

test('ET LA LECTURE EN DISTANCE EST ÉCRITE AVEC LE BON CENTRE', () => {
    // La phrase qui résout tout le chapitre. Si elle nomme 4 là où le centre
    // est −4, le premier barreau enseigne exactement la faute qu'il combat.
    assert.equal(distanceTexte(-4), 'la distance entre x et −4');
    assert.equal(distanceTexte(2), 'la distance entre x et 2');
    for (let k = 0; k < 30; k++) {
        const q = tirerValeurAbsolue({ rng: makeRng(`lecture-${k}`), marche: 'plus' });
        assert.ok(q.distance.endsWith(String(q.centre).replace('-', '−')),
            `${q.enonce} : ${q.distance}`);
    }
});
