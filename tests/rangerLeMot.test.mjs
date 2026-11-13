// RANGER, ET LE MOT APPARAÎT — sa page « Ordre · Axe », exercice 17.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « on place les points, on range les abscisses dans l'ordre, et les
// lettres donnent un mot. C'est un exercice qui se corrige tout seul : si le
// mot ne sort pas, l'élève le sait avant le professeur. »
//
// TOUT L'EXERCICE REPOSE SUR TROIS PROPRIÉTÉS DU TIRAGE, et aucune des trois ne
// fait planter quoi que ce soit quand elle tombe :
//
//   · DES ABSCISSES DEUX À DEUX DISTINCTES. Les droites se chevauchent exprès,
//     donc deux points PEUVENT valoir le même nombre — et alors la question n'a
//     pas une réponse mais deux, sans que rien ne le signale. C'est le défaut
//     le plus cher de l'exercice.
//   · TOUTES LES DROITES PORTENT DES POINTS, ET AUCUNE N'EN PORTE PLUS DE LA
//     MOITIÉ. Une droite vide n'est qu'un décor ; une droite qui porte tout
//     sauf un point ne demande qu'UNE comparaison difficile dans toute la
//     question.
//   · LE MOT NE SE LIT PAS DROITE PAR DROITE. Si parcourir les droites de haut
//     en bas, chacune de gauche à droite, donne déjà le mot, alors l'élève qui
//     n'a rien lu le trouve aussi — et l'exercice ne mesure plus rien.
//
// Et une quatrième, qui n'est pas du tirage : LE GESTE. Rémy a choisi « Toucher
// les points dans l'ordre » parmi trois ; cela suppose `answerKind: 'text'`,
// parce que l'activité envoie les lettres touchées sous forme de chaîne. Avec
// « choice », c'est un QCM qui s'affiche et l'on ne touche plus rien.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { rangerLeMotGenerator as G } from '../js/core/generators/rangerLeMot.js';

const MARCHES = [['deux', 4, 2], ['trois', 5, 3], ['melees', 6, 3]];
const item = (marche, i) => G.generate({ marches: [marche] },
    { rng: makeRng(`rlm-${marche}-${i}`), index: 0, total: 3 });

test('LA QUESTION A UNE SEULE RÉPONSE : les abscisses sont deux à deux distinctes', () => {
    for (const [m] of MARCHES) {
        for (let i = 0; i < 30; i++) {
            const it = item(m, i);
            const xs = it.meta.points.map(p => p.abscisse);
            const ou = `${m} #${i} (${xs.join(' ; ')})`;
            assert.equal(new Set(xs).size, xs.length,
                `${ou} : deux points ont la même abscisse, donc deux rangements justes`);
            // ET AUCUNE N'A DÉRIVÉ : `0 + 3 * 0.1` vaut 0,30000000000000004, et
            // ce nombre-là s'imprimerait tel quel sur la feuille.
            xs.forEach(x => {
                const dec = (String(x).split('.')[1] || '').length;
                assert.ok(dec <= 3, `${ou} : l’abscisse ${x} a ${dec} décimales`);
            });
        }
    }
});

test('LE RANGEMENT DES ABSCISSES DONNE LE MOT, LETTRE POUR LETTRE', () => {
    for (const [m] of MARCHES) {
        for (let i = 0; i < 30; i++) {
            const it = item(m, i);
            const ou = `${m} #${i}`;
            // C'EST LA PROMESSE DE L'EXERCICE, et elle se vérifie en refaisant
            // le travail de l'élève : ranger, puis lire les lettres.
            const lu = [...it.meta.points]
                .sort((a, b) => a.abscisse - b.abscisse)
                .map(p => p.lettre).join('');
            assert.equal(lu, it.meta.mot, `${ou} : rangé, on lit « ${lu} »`);
            assert.equal(it.answer, it.meta.mot, `${ou} : la réponse n’est pas le mot`);
            // ET `meta.ordre` DIT LA MÊME CHOSE, en nombres : c'est lui que la
            // feuille imprime dans le corrigé et que l'écran relit à l'élève.
            assert.equal(it.meta.ordre.length, it.meta.mot.length,
                `${ou} : ${it.meta.ordre.length} abscisses pour ${it.meta.mot.length} lettres`);
            const nombres = it.meta.ordre.map(s => Number(String(s).replace(',', '.')));
            for (let k = 1; k < nombres.length; k++) {
                assert.ok(nombres[k] > nombres[k - 1],
                    `${ou} : « ${it.meta.ordre.join(' < ')} » n’est pas croissant`);
            }
        }
    }
});

test('LE MOT NE SE LIT NI DROITE PAR DROITE, NI À L’OEIL', () => {
    // SOIXANTE TIRAGES PAR MARCHE, ET C'EST MESURÉ, PAS CHOISI. En retirant les
    // deux gardes du générateur et en tirant 1200 questions : 13 laissaient lire
    // le mot droite par droite (1 %) et 84 le laissaient ranger à l'oeil (7 %).
    // À trente tirages par marche, l'épreuve restait VERTE avec le défaut remis
    // — c'est-à-dire qu'elle donnait une assurance qui n'existait pas. Un défaut
    // rare demande un échantillon, pas une intention.
    for (const [m] of MARCHES) {
        for (let i = 0; i < 60; i++) {
            const it = item(m, i);
            // LA LECTURE LIGNE PAR LIGNE : de haut en bas, chacune de gauche à
            // droite. C'est l'élève qui lit la feuille comme un texte.
            const naif = [...it.meta.points]
                .sort((a, b) => (a.axe - b.axe) || (a.cran - b.cran))
                .map(p => p.lettre).join('');
            assert.notEqual(naif, it.meta.mot,
                `${m} #${i} : « ${naif} » se lit droite par droite, et c’est le mot`);
            // ET LE RANGEMENT À L'OEIL : le point dessiné le plus à gauche
            // d'abord, toutes droites confondues. C'est LA faute que plusieurs
            // échelles existent pour attraper ; si elle donne le mot, l'exercice
            // ne mesure plus rien du tout.
            const alOeil = [...it.meta.points]
                .sort((a, b) => (a.cran - b.cran) || (a.axe - b.axe))
                .map(p => p.lettre).join('');
            assert.notEqual(alOeil, it.meta.mot,
                `${m} #${i} : « ${alOeil} » se range à l’oeil, et c’est le mot`);
        }
    }
});

test('CHAQUE DROITE PORTE DES POINTS, ET AUCUNE N’EN PORTE PLUS DE LA MOITIÉ', () => {
    for (const [m, lettres, droites] of MARCHES) {
        for (let i = 0; i < 30; i++) {
            const it = item(m, i);
            const ou = `${m} #${i}`;
            assert.equal(it.meta.axes.length, droites, `${ou} : pas ${droites} droites`);
            assert.equal(it.meta.points.length, lettres, `${ou} : pas ${lettres} points`);
            const parAxe = it.meta.axes.map((_, k) =>
                it.meta.points.filter(p => p.axe === k).length);
            assert.ok(parAxe.every(c => c >= 1),
                `${ou} : une droite est vide (${parAxe.join('+')}) — c’est un décor`);
            assert.ok(Math.max(...parAxe) <= Math.ceil(lettres / 2),
                `${ou} : une droite porte ${Math.max(...parAxe)} points sur ${lettres}`);
        }
    }
});

test('LES DROITES SE CHEVAUCHENT, SINON ON RANGE SANS RIEN LIRE', () => {
    for (const [m] of MARCHES) {
        const it = item(m, 0);
        const axes = it.meta.axes;
        // DEUX DROITES AU MOINS PARTAGENT UN MORCEAU. Avec une droite de 0 à 1
        // et une de 100 à 150, tous les points de la première précèdent tous
        // ceux de la seconde : on range par droite, sans lire une abscisse.
        let chevauche = false;
        for (let a = 0; a < axes.length; a++) {
            for (let b = a + 1; b < axes.length; b++) {
                if (axes[a].min < axes[b].max && axes[b].min < axes[a].max) chevauche = true;
            }
        }
        assert.ok(chevauche, `${m} : aucune paire de droites ne se chevauche`);
        // ET CHACUNE A DIX INTERVALLES ÉGAUX — la règle du chapitre.
        axes.forEach((a, k) => {
            const large = Number((a.max - a.min).toFixed(9));
            assert.equal(large, Number((a.pas * it.meta.intervalles).toFixed(9)),
                `${m} droite ${k} : ${large} ne fait pas ${it.meta.intervalles} pas de ${a.pas}`);
        });
    }
});

test('LE GESTE EST LE TOUCHER, DONC LA RÉPONSE EST UNE CHAÎNE', () => {
    for (const [m] of MARCHES) {
        const it = item(m, 1);
        // AVEC « choice », C'EST UN QCM QUI S'AFFICHE et l'on ne touche plus
        // les points de l'énoncé. Rémy avait trois gestes au choix et a répondu
        // « Toucher les points dans l'ordre » : c'est `text`.
        assert.equal(it.answerKind, 'text',
            `${m} : avec « ${it.answerKind} », on ne touche plus les points`);
        assert.equal(typeof it.answer, 'string');
        assert.match(it.answer, /^[A-Z]+$/, `${m} : la réponse « ${it.answer} » n’est pas un mot`);
        // ET LE CORRIGÉ IMPRIMÉ DIT LES DEUX : les abscisses rangées ET le mot.
        assert.ok(String(it.reponsePapier).includes(it.meta.mot),
            `${m} : le corrigé n’écrit pas le mot`);
        assert.ok(String(it.reponsePapier).includes('<'),
            `${m} : le corrigé ne montre pas le rangement`);
    }
});

test('LES TROIS FAUTES SONT DANS LES PROPOSITIONS, ET CHACUNE EST UN VRAI MOT DE FAUTE', () => {
    let vues = 0;
    const fautesVues = new Set();
    for (const [m] of MARCHES) {
        for (let i = 0; i < 12; i++) {
            const it = item(m, i);
            const ou = `${m} #${i}`;
            const bonnes = (it.choices || []).filter(c => c.correct);
            assert.equal(bonnes.length, 1, `${ou} : pas une seule bonne réponse`);
            assert.equal(bonnes[0].value, it.answer);
            const vals = (it.choices || []).map(c => String(c.value));
            assert.equal(new Set(vals).size, vals.length,
                `${ou} : deux propositions identiques`);
            // CHAQUE PROPOSITION EST FAITE DES MÊMES LETTRES. Un bouton qui
            // porte des lettres étrangères au dessin se raye sans réfléchir,
            // et la question devient plus facile qu'elle n'est.
            const trier = (s) => s.split('').sort().join('');
            vals.forEach(v => assert.equal(trier(v), trier(it.answer),
                `${ou} : la proposition « ${v} » n’est pas faite des lettres du dessin`));
            // AU MOINS UNE FAUTE NOMMÉE PAR QUESTION, ET LES TROIS SUR
            // L'ENSEMBLE. On n'exige pas les trois à chaque fois, et c'est une
            // épreuve qui a été resserrée APRÈS l'avoir vue échouer pour une
            // mauvaise raison : deux fautes différentes donnent parfois le même
            // mot — ranger à l'oeil et lire ligne par ligne coïncident quand les
            // points tombent ainsi —, et le leurre en double est alors supprimé
            // avec son explication. Exiger les trois, c'était épingler une
            // forme ; ce qui compte est la RÈGLE : aucune proposition n'est
            // gratuite, et les trois fautes se rencontrent toutes.
            const pourquoi = (it.choices || []).map(c => c.why || '').join(' ');
            const nommees = [/droite par droite/, /à l'oeil/, /du plus grand au plus petit/]
                .filter(r => r.test(pourquoi));
            assert.ok(nommees.length >= 1,
                `${ou} : aucune proposition ne nomme la faute qu’elle incarne`);
            nommees.forEach(r => fautesVues.add(String(r)));
            vues += 1;
        }
    }
    assert.ok(vues >= 36, `seulement ${vues} questions examinées`);
    assert.equal(fautesVues.size, 3,
        `seules ${fautesVues.size} des trois fautes se rencontrent sur ${vues} questions`);
});

test('ET LA FEUILLE SAIT QUOI DESSINER', () => {
    // LE RENDU IMPRIMÉ LIT `meta` : les droites avec leurs bouts, chaque point
    // avec sa droite, son cran et sa lettre, le rangement et le mot pour le
    // corrigé. Sans l'un d'eux, la feuille sort des droites nues — ce qui est,
    // mot pour mot, une feuille impossible à faire. C'est arrivé trois fois.
    for (const [m] of MARCHES) {
        const it = item(m, 2);
        for (const clef of ['axes', 'points', 'mot', 'definition', 'ordre', 'intervalles']) {
            assert.ok(it.meta[clef] !== undefined, `${m} : la feuille n’a pas « ${clef} »`);
        }
        it.meta.axes.forEach((a, k) => {
            for (const clef of ['min', 'pas', 'max']) {
                assert.ok(a[clef] !== undefined, `${m} droite ${k} : « ${clef} » manque`);
            }
        });
        it.meta.points.forEach((p, k) => {
            for (const clef of ['lettre', 'axe', 'cran', 'abscisse']) {
                assert.ok(p[clef] !== undefined, `${m} point ${k} : « ${clef} » manque`);
            }
            assert.ok(p.axe >= 0 && p.axe < it.meta.axes.length,
                `${m} point ${k} : la droite ${p.axe} n’existe pas`);
            assert.ok(p.cran >= 0 && p.cran <= it.meta.intervalles,
                `${m} point ${k} : le cran ${p.cran} sort de la droite`);
            // ET L'ABSCISSE EST BIEN CELLE DE CE CRAN SUR CETTE DROITE : si les
            // deux divergent, le dessin montre un point et la correction en
            // attend un autre, sans que rien ne plante.
            const a = it.meta.axes[p.axe];
            const attendu = Number((a.min + p.cran * a.pas).toFixed(6));
            assert.equal(Number(p.abscisse.toFixed(6)), attendu,
                `${m} point ${k} : dessiné au cran ${p.cran} mais noté ${p.abscisse}`);
        });
        // LA DÉFINITION EST CE QU'ON LIT QUAND C'EST JUSTE : sans elle, la
        // récompense de l'exercice est un mot sans sens.
        assert.ok(String(it.meta.definition).length > 5,
            `${m} : « ${it.meta.mot} » n’a pas de définition`);
    }
});
