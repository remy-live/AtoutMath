// LE PROGRAMME DOIT FAIRE CE QU'ON DEMANDE, PAS SEULEMENT L'AFFICHER.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 19 novembre, capture à l'appui. « Ajoute la ligne qui affiche leur
// SOMME. Le programme doit écrire 14. » Il écrit `print(14)`, et le logiciel
// répond que c'est juste : « ça dit bon... ».
//
// Il me l'avait déjà dit une fois, sur l'École du Tableur : « la bonne réponse
// est =A1+B1 pas 17 ». Même phrase, même faute de ma part.
//
// ── CETTE ÉPREUVE A DEUX MOITIÉS, ET LA SECONDE PÈSE PLUS LOURD ──────────
//
// 1. LA TRICHERIE EST REFUSÉE — c'est ce que Rémy a demandé.
// 2. AUCUN PROGRAMME JUSTE N'EST REFUSÉ — et c'est la moitié dangereuse.
//    Une exigence trop étroite se met à noter la FAÇON D'ÉCRIRE : elle
//    refuserait `print(b + a)`, ou un espace en moins, et l'élève apprendrait
//    que la machine ment. C'est exactement ce que le premier jet voulait
//    éviter en ne jugeant que la sortie.
//
// La seconde moitié est donc la plus longue : pour chaque marche, plusieurs
// écritures correctes, et pas une ne doit être accusée.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { exigenceNonTenue, aUneExigence } from '../js/core/python/exigences.js';
import { pythonEcrireGenerator, ETAPES } from '../js/core/generators/pythonPasAPas.js';

const tirer = (marche, k = 0) => pythonEcrireGenerator.generate({ marches: [marche] },
    { rng: makeRng(`${marche}/ex/${k}`), index: 0, total: 1 });

/* ── CE QUI DOIT ÊTRE REFUSÉ ─────────────────────────────────────────────
 *
 * Chaque ligne est un programme qui AFFICHE EXACTEMENT CE QU'IL FAUT et qui
 * saute pourtant l'exercice.
 */
const TRICHERIES = {
    'une-ligne': ['a = 7\nb = 7\nprint(14)', 'a = 7\nb = 7\nprint("14")'],
    'deux-lignes': ['print(15)'],
    'petit-programme': ['print(0)\nprint(1)\nprint(2)'],
    'fonction-appel': ['def double(x):\n    return 2 * x\n\nprint(10)'],
    'fonction-retour': ['def triple(x):\n    return 12\n\nprint(triple(4))'],
    'fonction-ecrire': ['print(16)'],
    'dessin-carre': ['import turtle\nt = turtle.Turtle()\nt.forward(90)\nt.left(90)\n'
        + 't.forward(90)\nt.left(90)\nt.forward(90)\nt.left(90)\nt.forward(90)\nt.left(90)'],
    'dessin-polygone': ['import turtle\nt = turtle.Turtle()\nt.forward(80)\nt.left(120)\n'
        + 't.forward(80)\nt.left(120)\nt.forward(80)\nt.left(120)'],
    'dessin-fonction': ['import turtle\nt = turtle.Turtle()\nfor i in range(4):\n'
        + '    t.forward(70)\n    t.left(90)\nfor i in range(4):\n'
        + '    t.forward(100)\n    t.left(90)']
};

/* ── CE QUI NE DOIT JAMAIS ÊTRE REFUSÉ ───────────────────────────────────
 *
 * Plusieurs écritures correctes par marche, y compris les tournures auxquelles
 * on ne pense pas en écrivant la règle : l'ordre inversé, les espaces en
 * moins, le nom de variable choisi autrement.
 */
const JUSTES = {
    'une-ligne': ['a = 7\nb = 7\nprint(a + b)', 'a = 7\nb = 7\nprint(b + a)',
        'a = 7\nb = 7\nprint(a+b)', 'a = 7\nb = 7\ns = a + b\nprint(s + 0)',
        'a = 7\nb = 7\nprint( a  +  b )'],
    'deux-lignes': ['n = 15\nprint(n)', 'n=15\nprint( n )', 'n = 15\nprint(n + 0)'],
    'petit-programme': ['for i in range(3):\n    print(i)',
        'for truc in range(3):\n    print(truc)'],
    'fonction-appel': ['def double(x):\n    return 2 * x\n\nprint(double(5))',
        'def double(x):\n    return 2 * x\n\nr = double(5)\nprint(r + 0)\nprint(double(0))'],
    'fonction-retour': ['def triple(x):\n    return 3 * x\n\nprint(triple(4))',
        'def triple(x):\n    return x * 3\n\nprint(triple(4))',
        'def triple(x):\n    return x + x + x\n\nprint(triple(4))'],
    'fonction-ecrire': ['def aire(L, l):\n    return L * l\n\nprint(aire(8, 2))',
        'def aire(a, b):\n    return b * a\n\nprint(aire(8, 2))'],
    'dessin-carre': ['import turtle\nt = turtle.Turtle()\nfor i in range(4):\n'
        + '    t.forward(90)\n    t.left(90)'],
    'dessin-polygone': ['import turtle\nt = turtle.Turtle()\nfor k in range(3):\n'
        + '    t.forward(80)\n    t.left(120)'],
    'dessin-fonction': ['import turtle\nt = turtle.Turtle()\ndef carre(cote):\n'
        + '    for i in range(4):\n        t.forward(cote)\n        t.left(90)\n\n'
        + 'carre(70)\ncarre(100)',
    'import turtle\nt = turtle.Turtle()\ndef figure(n):\n    for i in range(4):\n'
        + '        t.forward(n)\n        t.left(90)\n\nfigure(70)\nfigure(100)']
};

test('LA SORTIE JUSTE SANS LE TRAVAIL EST REFUSÉE', () => {
    const passees = [];
    for (const [marche, programmes] of Object.entries(TRICHERIES)) {
        const meta = tirer(marche).meta;
        for (const p of programmes) {
            if (!exigenceNonTenue(marche, p, meta)) {
                passees.push(`${marche} : « ${p.split('\n').pop()} » passe`);
            }
        }
    }
    assert.deepEqual(passees, [],
        'un programme qui affiche la bonne chose sans la calculer est accepté — '
        + 'Rémy, 19 novembre : « ça dit bon... »');
});

test('ET AUCUN PROGRAMME JUSTE N’EST REFUSÉ', () => {
    // ── LA MOITIÉ DANGEREUSE ─────────────────────────────────────────────
    //
    // Refuser une solution correcte apprend à l'élève que la machine ment, et
    // c'est irrattrapable. Une exigence doit donc être la plus LARGE qui
    // sépare encore la tricherie du travail.
    const refuses = [];
    for (const [marche, programmes] of Object.entries(JUSTES)) {
        const meta = tirer(marche).meta;
        for (const p of programmes) {
            const m = exigenceNonTenue(marche, p, meta);
            if (m) refuses.push(`${marche} : « ${p.replace(/\n/g, ' ⏎ ')} » → ${m.dire}`);
        }
    }
    assert.deepEqual(refuses, []);
});

test('ET « UN PETIT PROGRAMME » EXIGE CE QUE SA PROPRE QUESTION DEMANDE', () => {
    // ── DEUX QUESTIONS SOUS UN SEUL NOM ──────────────────────────────────
    //
    // Cette marche tire soit une boucle, soit un « si … sinon ». L'exigence
    // doit donc suivre LA QUESTION POSÉE, pas la marche : demander une boucle
    // sous un « si … sinon » refuserait une réponse juste. C'est la raison du
    // `meta.solution` dans la règle, et c'est ce que cette épreuve garde.
    const avecBoucle = [...Array(20).keys()].map((k) => tirer('petit-programme', k))
        .find((it) => /\bfor\b/.test(it.meta.solution));
    const avecSi = [...Array(20).keys()].map((k) => tirer('petit-programme', k))
        .find((it) => /\bif\b/.test(it.meta.solution));
    assert.ok(avecBoucle && avecSi, 'la marche ne tire plus ses deux formes');

    assert.ok(!exigenceNonTenue('petit-programme', 'for i in range(3):\n    print(i)',
        avecBoucle.meta), 'la boucle est refusée sous une question de boucle');
    assert.ok(exigenceNonTenue('petit-programme', 'print(0)\nprint(1)\nprint(2)',
        avecBoucle.meta), 'trois print passent pour une boucle');

    const siSinon = 'n = 6\nif n > 4:\n    print("grand")\nelse:\n    print("petit")';
    assert.ok(!exigenceNonTenue('petit-programme', siSinon, avecSi.meta),
        'un « si … sinon » juste est refusé');
    assert.ok(exigenceNonTenue('petit-programme', 'print("grand")', avecSi.meta),
        'afficher le mot sans choisir passe');
});

test('LA SOLUTION DU CATALOGUE PASSE, SUR TOUS LES TIRAGES', () => {
    // La solution qu'on imprime sur la feuille de corrigé DOIT satisfaire
    // l'exigence : sinon le professeur distribue une réponse que le logiciel
    // refuse.
    const fautifs = [];
    for (const e of ETAPES.filter((x) => x.ecrire && aUneExigence(x.id))) {
        for (let k = 0; k < 20; k++) {
            const it = tirer(e.id, k);
            const m = exigenceNonTenue(e.id, it.meta.solution, it.meta);
            if (m) { fautifs.push(`${e.id} (tirage ${k}) : ${m.dire}`); break; }
        }
    }
    assert.deepEqual(fautifs, []);
});

test('LE RAPPEL « DOIT AFFICHER » DISPARAÎT QUAND IL SUFFIRAIT DE LE RECOPIER', async () => {
    // ── CE QUE LA CAPTURE DE RÉMY MONTRAIT AUSSI ─────────────────────────
    //
    // Sous son éditeur, un bandeau annonçait « TON PROGRAMME DOIT AFFICHER :
    // 14 » — juste au-dessus du champ où il a tapé `print(14)`. C'est la même
    // règle que ce dépôt s'était déjà donnée sur le tableur : « on ne dit plus
    // attendu : 17 sous une question qui demande une formule ».
    const { sansCommentaires } = await import('./helpers.mjs');
    const { readFileSync } = await import('node:fs');
    const S = sansCommentaires(readFileSync(
        new URL('../js/core/activities/pythonEditeur.js', import.meta.url), 'utf8'));
    assert.match(S, /!aUneExigence\(item\.meta\.marche\)/,
        'le rappel « doit afficher » s’affiche encore sous une question dont il '
        + 'donne la réponse');
});

test('ET LES MARCHES SANS EXIGENCE N’EN INVENTENT PAS', () => {
    // Un trait, un angle, un mot dans un trou : il n'y a rien à exiger de
    // plus que le résultat, et une règle de trop refuserait du travail juste.
    for (const m of ['un-mot', 'le-decalage', 'dessin-trait', 'dessin-angle',
        'sortie-boucle', 'sortie-tant-que', 'sortie-deux-lignes']) {
        assert.ok(!aUneExigence(m), `${m} porte une exigence qui ne lui sert à rien`);
    }
});
