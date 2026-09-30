// L'ÉCHELLE DE RÉMY POUR LE MOINS DEVANT LA PARENTHÈSE.
//
// Rémy, après avoir vu ses élèves dessus : « Au départ, je préfèrerais juste
// remplacer (avec QCM éventuellement) −(−4) = ? −(+4) = ? puis −(−4) + (−5) =
// .......... = ; l'élève écrit +4 − 5 et donne le résultat. Puis −(−3+5) =
// −(....) ; l'élève met la réponse. Puis −(−3+5) − (−9−5) = −(....) − (....) =
// .................... Puis avec des priorités opératoires (pour l'instant on
// n'a pas encore fait le produit de nombres négatifs). »
//
// CE QUE CES ÉPREUVES GARDENT, dans l'ordre d'importance :
//
//   · qu'AUCUN barreau n'écrive un produit de deux relatifs — c'est la seule
//     contrainte que Rémy a posée en toutes lettres, et elle porte sur un
//     chapitre pas encore fait ;
//   · que « 4 − 5 » et « +4 − 5 » soient tous deux justes, et que « −1 » ne le
//     soit PAS à la ligne de réécriture : y répondre par le résultat, c'est
//     avoir sauté l'étape que ce barreau existe pour isoler ;
//   · que chaque question soit juste — la valeur annoncée est celle du calcul.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import {
    tirerOppose, reponseJuste, normaliserEcriture, lignesMax
} from '../js/core/opposeParentheses.js';

/** Cent tirages d'un barreau, avec des graines qui ne se ressemblent pas. */
const cent = (niveau) => Array.from({ length: 100 },
    (_, i) => tirerOppose({ rng: makeRng('g' + niveau + '-' + i), niveau }));

/** Ce que vaut vraiment l'énoncé, calculé sans passer par le module éprouvé. */
function valeurDe(enonce) {
    // On repasse par le moteur du navigateur, sur une expression rendue en
    // ASCII : c'est un SECOND chemin, et deux chemins qui tombent d'accord
    // valent mieux qu'un seul qu'on relit.
    const js = enonce.replace(/−/g, '-').replace(/×/g, '*').replace(/\s/g, '');
    // eslint-disable-next-line no-new-func
    return Function('"use strict";return (' + js + ')')();
}

test('CHAQUE BARREAU TIRE CE QUE RÉMY A ÉCRIT', () => {
    // Barreau 1 : « −(−4) », une parenthèse, un nombre signé.
    for (const q of cent(1)) {
        assert.match(q.enonce, /^−\([+−]\d+\)$/, q.enonce);
    }
    // Barreau 2 : « −(−4) + (−5) », deux nombres signés reliés.
    for (const q of cent(2)) {
        assert.match(q.enonce, /^−\([+−]\d+\) [+−] \([+−]\d+\)$/, q.enonce);
    }
    // Barreau 3 : « −(−3 + 5) », une parenthèse qui contient une somme.
    for (const q of cent(3)) {
        assert.match(q.enonce, /^−\(−?\d+ [+−] \d+\)$/, q.enonce);
    }
    // Barreau 4 : deux parenthèses.
    for (const q of cent(4)) {
        assert.match(q.enonce, /^−\(−?\d+ [+−] \d+\) [+−] \(−?\d+ [+−] \d+\)$/, q.enonce);
    }
});

test('AUCUN PRODUIT DE DEUX RELATIFS, À AUCUN BARREAU', () => {
    // La seule contrainte que Rémy a posée en toutes lettres : « pour l'instant
    // on n'a pas encore fait le produit de nombres négatifs ».
    for (const n of [1, 2, 3, 4]) {
        for (const q of cent(n)) {
            assert.doesNotMatch(q.enonce, /[×*÷]/,
                `le barreau ${n} ne multiplie rien : « ${q.enonce} »`);
        }
    }
});

test('LA RÉPONSE ANNONCÉE EST CELLE DU CALCUL', () => {
    for (const n of [1, 2, 3, 4]) {
        for (const q of cent(n)) {
            // `+ 0` RAMÈNE −0 À 0 : `assert.equal` est strict et distingue les
            // deux, ce qui faisait tomber cette épreuve sur « −(8 − 8) » alors
            // que le module avait raison. Le zéro négatif n'existe pas en
            // mathématiques ; il n'a pas à faire échouer une mesure.
            const attendu = valeurDe(q.enonce) + 0;
            assert.equal(Number(normaliserEcriture(q.reponse)) + 0, attendu,
                `« ${q.enonce} » vaut ${attendu}, le module annonce « ${q.reponse} »`);
        }
    }
});

test('CHAQUE TROU A UNE RÉPONSE, ET ELLE EST JUSTE', () => {
    for (const n of [1, 2, 3, 4]) {
        for (const q of cent(n)) {
            const trous = q.lignes.flatMap(l => l.morceaux.filter(m => m.t === 'trou'));
            assert.ok(trous.length >= 1, `le barreau ${n} a au moins un trou`);
            for (const t of trous) {
                assert.ok(t.attendu.length >= 1, 'un trou sans réponse attendue ne se corrige pas');
                assert.ok(reponseJuste(t.montre, t.attendu),
                    `ce qu'on montre à la correction (« ${t.montre} ») doit être accepté`);
            }
        }
    }
});

test('« 4 − 5 » ET « +4 − 5 » SONT JUSTES, « −1 » NE L\'EST PAS', () => {
    // LE CŒUR DE LA DEMANDE. Rémy, à la question posée : les deux écritures,
    // « ce qu'on vérifie, c'est que les parenthèses ont disparu et que les
    // signes sont bons ».
    assert.equal(reponseJuste('4 − 5', ['4 − 5']), true);
    assert.equal(reponseJuste('+4 − 5', ['4 − 5']), true);
    assert.equal(reponseJuste('4-5', ['4 − 5']), true, 'le tiret du clavier vaut le moins');
    assert.equal(reponseJuste('4 - 5', ['4 − 5']), true);
    // ET CE QUI NE DOIT PAS PASSER.
    assert.equal(reponseJuste('−1', ['4 − 5']), false,
        'répondre le RÉSULTAT à la ligne de réécriture, c\'est avoir sauté '
        + 'l\'étape que ce barreau existe pour isoler');
    assert.equal(reponseJuste('4 + 5', ['4 − 5']), false);
    assert.equal(reponseJuste('(4) − 5', ['4 − 5']), false,
        'on enlevait justement les parenthèses');
    assert.equal(reponseJuste('', ['4 − 5']), false, 'un trou vide n\'est pas une réponse');
    assert.equal(reponseJuste('   ', ['4 − 5']), false);
});

test('UN PREMIER TERME NÉGATIF NE FABRIQUE PAS D\'ÉCRITURE ABSURDE', () => {
    // La première version fabriquait la variante « avec + » par concaténation :
    // elle produisait « +−4 − 5 » dès que le premier terme était négatif, une
    // écriture qu'aucun élève ne tapera jamais — donc une des deux réponses
    // acceptées ne servait à rien, en silence.
    for (const q of cent(2)) {
        for (const t of q.lignes[0].morceaux.filter(m => m.t === 'trou')) {
            for (const a of t.attendu) {
                assert.doesNotMatch(a, /\+\s*[−-]/, `écriture absurde attendue : « ${a} »`);
            }
        }
        // Et la réécriture à premier terme négatif reste acceptée telle quelle.
        const attendu = q.lignes[0].morceaux.find(m => m.t === 'trou').attendu;
        assert.equal(reponseJuste(attendu[0], attendu), true);
    }
});

test('LE QCM N\'EXISTE QU\'AU BARREAU 1, ET SES PIÈGES DISENT UNE ERREUR', () => {
    for (const q of cent(1)) {
        assert.equal(q.choix.length, 4);
        assert.equal(q.choix.filter(c => c.juste).length, 1, 'une seule bonne réponse');
        for (const c of q.choix.filter(c => !c.juste)) {
            assert.ok(c.pourquoi && c.pourquoi.length > 20,
                'un piège sans explication n\'apprend rien : il fait seulement perdre');
        }
        // LES QUATRE PROPOSITIONS SONT DISTINCTES. Deux fois le même nombre
        // rendrait la question insoluble — ou juste deux fois.
        assert.equal(new Set(q.choix.map(c => c.v)).size, 4, JSON.stringify(q.choix));
    }
    // Dès le barreau 2 on écrit une ligne : on ne peut pas la proposer en
    // quatre exemplaires sans donner la réponse.
    for (const n of [2, 3, 4]) {
        assert.equal(cent(n)[0].choix, undefined, `pas de QCM au barreau ${n}`);
    }
});

test('LE MÉLANGE NE DÉPEND QUE DE LA GRAINE', () => {
    // Deux élèves sur la même graine doivent voir la même question dans le
    // même ordre : sans cela, « regarde ta ligne 3 » ne veut plus rien dire.
    const a = tirerOppose({ rng: makeRng('pareil'), niveau: 1 });
    const b = tirerOppose({ rng: makeRng('pareil'), niveau: 1 });
    assert.deepEqual(a.choix.map(c => c.v), b.choix.map(c => c.v));
    assert.equal(a.enonce, b.enonce);
});

test('LA FEUILLE SAIT COMBIEN DE LIGNES RÉSERVER', () => {
    assert.equal(lignesMax(1), 1);
    for (const n of [2, 3, 4]) assert.equal(lignesMax(n), 2);
});

test('AUCUNE PARENTHÈSE NE VAUT ZÉRO', () => {
    // « −(8 − 8) » fait écrire « = −(0) = 0 » : juste, et hors sujet. L'opposé
    // de zéro n'apprend pas la règle du signe, et il donne à l'élève l'occasion
    // de se demander si « −0 » s'écrit.
    for (const n of [3, 4]) {
        for (const q of cent(n)) {
            const dedans = [...q.enonce.matchAll(/\(([^)]*)\)/g)].map(m => m[1]);
            for (const d of dedans) {
                const v = Function('"use strict";return (' + d.replace(/−/g, '-') + ')')();
                assert.notEqual(v + 0, 0, `« ${q.enonce} » : la parenthèse « ${d} » vaut 0`);
            }
        }
    }
});
