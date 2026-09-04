// LE PATRON DU CUBE — la géométrie du module, sans écran.
//
// Le test central de ce fichier n'éprouve pas « le jeu marche » : il éprouve
// que LE PLIAGE EST JUSTE. Il existe trente-cinq hexominos et onze d'entre eux
// se ferment en cube ; ces deux nombres sont établis de longue date, et le
// module ne les contient nulle part — il les recalcule. S'ils tombent, c'est
// que la simulation de roulement est correcte. Une liste de patrons recopiée à
// la main aurait passé n'importe quel test sans rien démontrer.

import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import {
    HEXOMINOS, PATRONS, FAUX, FAMILLES, ORDRE_FAMILLES, CONSIGNES,
    plier, faceOpposee, opposee, profil, difficulte, polyominos,
    canonique, normaliser, preparerSerie
} from '../js/core/patrons.js';

const cle = ([x, y]) => `${x},${y}`;

// Les deux figures que tout le monde connaît, écrites à la main pour que le
// test ait un point d'appui indépendant de l'énumération.
const CROIX = [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [1, 3]];
const RECTANGLE = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]];
const BANDE = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]];
const ESCALIER = [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]];

test('L\'ÉNUMÉRATION RETROUVE LES NOMBRES CONNUS : 35 hexominos, 11 patrons', () => {
    // Le test qui valide tout le reste. Ces deux nombres ne sont écrits nulle
    // part dans le module : ils sont calculés par croissance puis par pliage.
    assert.equal(HEXOMINOS.length, 35);
    assert.equal(PATRONS.length, 11);
    assert.equal(FAUX.length, 24);
    assert.equal(PATRONS.length + FAUX.length, HEXOMINOS.length);
});

test('les petits polyominos, eux aussi, tombent juste', () => {
    // Une énumération qui se trompe à six cases se trompe souvent avant. Les
    // comptes de polyominos libres sont connus : 1, 1, 2, 5, 12, 35.
    assert.deepEqual([1, 2, 3, 4, 5, 6].map(n => polyominos(n).length), [1, 1, 2, 5, 12, 35]);
});

test('LE RECTANGLE 2 × 3 N\'EST PAS UN PATRON — le piège du chapitre', () => {
    assert.equal(plier(RECTANGLE).ok, false);
    assert.ok(plier(RECTANGLE).doublons.length, 'des cases se recouvrent, et on sait lesquelles');
});

test('la croix latine en est un, et l\'escalier aussi', () => {
    assert.equal(plier(CROIX).ok, true);
    assert.equal(plier(ESCALIER).ok, true, 'le 2-2-2 est le plus déroutant des onze');
    assert.equal(plier(BANDE).ok, false, 'six cases alignées ne se ferment jamais');
});

test('un patron valide use les six faces, une fois chacune', () => {
    PATRONS.forEach(p => {
        const { faces } = plier(p);
        const prises = Object.values(faces).sort();
        assert.equal(prises.length, 6, profil(p));
        assert.deepEqual([...new Set(prises)].sort(), [0, 1, 2, 3, 4, 5], profil(p));
    });
});

test('LES FACES OPPOSÉES VONT PAR PAIRES, et la relation est symétrique', () => {
    assert.equal(opposee(0), 1);
    assert.equal(opposee(1), 0);
    assert.equal(opposee(4), 5);
    PATRONS.forEach(p => {
        const forme = normaliser(p);
        forme.forEach(c => {
            const face = faceOpposee(forme, cle(c));
            assert.ok(face, `pas d'opposée pour ${cle(c)} sur ${profil(p)}`);
            assert.notEqual(face, cle(c), 'une case n\'est pas sa propre opposée');
            assert.equal(faceOpposee(forme, face), cle(c), 'l\'opposée de l\'opposée est soi-même');
        });
    });
});

test('les trois paires d\'opposées partitionnent le patron', () => {
    PATRONS.forEach(p => {
        const forme = normaliser(p);
        const paires = new Set(forme.map(c => [cle(c), faceOpposee(forme, cle(c))].sort().join('|')));
        assert.equal(paires.size, 3, `${profil(p)} : trois paires, pas ${paires.size}`);
    });
});

test('une figure invalide n\'a pas de face opposée', () => {
    assert.equal(faceOpposee(RECTANGLE, '0,0'), null);
});

test('LE PLIAGE NE DÉPEND PAS DE LA CASE DE DÉPART', () => {
    // Le parcours commence sur `cellules[0]`. Si le verdict changeait selon la
    // case choisie, la simulation serait fausse — et l'exercice donnerait des
    // réponses différentes selon l'ordre des cases dans le tableau.
    HEXOMINOS.forEach(h => {
        const attendu = plier(h).ok;
        for (let i = 0; i < h.length; i++) {
            const tourne = [...h.slice(i), ...h.slice(0, i)];
            assert.equal(plier(tourne).ok, attendu, `${profil(h)} : verdict instable`);
        }
    });
});

test('le pliage ne dépend pas non plus de l\'orientation de la feuille', () => {
    // Tourner ou retourner une figure ne change évidemment pas ce qu'elle
    // devient une fois pliée. C'est évident, et c'est exactement pour ça qu'il
    // faut le vérifier : rien dans le code ne le garantit.
    const tourner = (cs) => normaliser(cs.map(([x, y]) => [-y, x]));
    const retourner = (cs) => normaliser(cs.map(([x, y]) => [-x, y]));
    HEXOMINOS.forEach(h => {
        const attendu = plier(h).ok;
        assert.equal(plier(tourner(h)).ok, attendu, `${profil(h)} : rotation`);
        assert.equal(plier(retourner(h)).ok, attendu, `${profil(h)} : symétrie`);
    });
});

test('les onze patrons se rangent dans les familles du collège', () => {
    const par = {};
    PATRONS.forEach(p => { par[profil(p)] = (par[profil(p)] || 0) + 1; });
    assert.deepEqual(par, { '1-4-1': 6, '2-3-1': 3, '3-3': 1, '1-2-2-1': 1 });
});

test('le nom d\'une famille ne dépend pas du sens de lecture', () => {
    // Lu par en bas, « 2-3-1 » s'écrivait « 1-3-2 » : deux noms pour une seule
    // famille, et l'élève à qui l'on dit « c'est un 2-3-1 » ne s'y retrouvait
    // plus.
    const retourner = (cs) => normaliser(cs.map(([x, y]) => [x, -y]));
    HEXOMINOS.forEach(h => assert.equal(profil(retourner(h)), profil(h), profil(h)));
});

test('deux formes identiques à une symétrie près portent le même nom canonique', () => {
    const tourner = (cs) => normaliser(cs.map(([x, y]) => [-y, x]));
    assert.equal(canonique(tourner(CROIX)), canonique(CROIX));
    assert.notEqual(canonique(RECTANGLE), canonique(CROIX));
});

// --- La série de questions --------------------------------------------------

test('UNE SÉRIE NE RÉPOND PAS OUI-NON-OUI-NON', () => {
    // La première version alternait strictement : le compte était juste, mais
    // un élève qui repérait le rythme au deuxième coup répondait sans regarder.
    // On veut l'équilibre SANS la régularité.
    const rythmes = new Set();
    for (let i = 0; i < 40; i++) {
        const q = preparerSerie(makeRng(`serie${i}`), { familles: ['reconnaitre'], combien: 8 });
        const suite = q.map(x => (x.reponse ? 'O' : 'N')).join('');
        assert.equal(suite.split('O').length - 1, 4, `${suite} : quatre patrons attendus`);
        rythmes.add(suite);
    }
    // ON NE PEUT PAS INTERDIRE « ONONONON », ET IL NE FAUT PAS.
    //
    // C'est ce que j'avais écrit, et le test a sauté sur la deuxième graine.
    // Chaque paire est battue indépendamment : la suite alternée sort une fois
    // sur seize, exactement comme n'importe quelle autre. La proscrire
    // reviendrait à truquer le tirage pour qu'il ait l'air aléatoire — le
    // défaut d'origine, à l'envers. Ce qui doit être vrai, c'est que le rythme
    // CHANGE d'une série à l'autre : c'est cela qu'on mesure.
    assert.ok(rythmes.size > 8,
        `seulement ${rythmes.size} rythmes différents sur 40 graines`);
});

test('une série ne s\'attarde pas sur les évidences', () => {
    // Mesuré : les quatre intrus tombaient tous sur des bandes droites, parce
    // que le palier 1 ne contient aucun patron valide. On n'en garde qu'une.
    for (let i = 0; i < 8; i++) {
        const q = preparerSerie(makeRng(`ev${i}`), { familles: ['reconnaitre'], combien: 8 });
        const bandes = q.filter(x => difficulte(x.forme) === 1).length;
        assert.ok(bandes <= 1, `${bandes} bandes droites dans une série de huit`);
    }
});

test('la difficulté monte, et les paliers ne sont pas vides', () => {
    const d = { 1: 0, 2: 0, 3: 0 };
    HEXOMINOS.forEach(h => d[difficulte(h)]++);
    assert.ok(d[1] && d[2] && d[3], `paliers déséquilibrés : ${JSON.stringify(d)}`);
    assert.ok(d[3] >= d[1], 'les formes retorses sont les plus nombreuses');
});

test('chaque question porte une réponse exacte, et le noyau la confirme', () => {
    const q = preparerSerie(makeRng('verif'), { combien: 12 });
    assert.ok(q.length, 'la série n\'est pas vide');
    q.forEach(x => {
        if (x.famille === 'reconnaitre') {
            assert.equal(x.reponse, plier(x.forme).ok);
        } else {
            assert.equal(plier(x.forme).ok, true, 'on ne demande les opposées que sur un patron');
            assert.equal(x.reponse, faceOpposee(x.forme, x.depart));
            assert.ok(x.forme.some(c => cle(c) === x.depart), 'la case de départ est dans la figure');
        }
    });
});

test('les réglages filtrent les familles', () => {
    ORDRE_FAMILLES.forEach(f => assert.ok(FAMILLES[f], `famille ${f} sans libellé`));
    const seul = preparerSerie(makeRng('x'), { familles: ['opposees'], combien: 6 });
    assert.equal(seul.length, 6);
    seul.forEach(q => assert.equal(q.famille, 'opposees'));
});

test('LES CONSIGNES NE DONNENT PAS LA RÉPONSE', () => {
    // Rémy : « tu donnes les réponses dans l'énoncé ». Ni la méthode, ni le
    // nombre de patrons — savoir qu'il y en a onze aiderait à compter plutôt
    // qu'à plier.
    Object.values(CONSIGNES).forEach(c => {
        assert.doesNotMatch(c, /onze|11|opposé[e]?s? sont|il suffit/i);
    });
    assert.match(CONSIGNES.reconnaitre, /plie/i);
});
