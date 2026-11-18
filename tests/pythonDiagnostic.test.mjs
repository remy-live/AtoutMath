// LE VÉRIFICATEUR DE PYTHON — ce qu'il doit dire, et ce qu'il ne doit jamais dire.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 18 novembre : « des qcm et après que l'élève tape, l'aider sur
// l'indentation. Être hyper hyper hyper progressif. »
//
// CE QUI SE GARDE ICI tient en deux phrases, et la première pèse plus lourd
// que la seconde :
//
//   · ON NE REFUSE JAMAIS UN PROGRAMME CORRECT. Un vérificateur qui invente
//     une faute envoie l'élève corriger ce qui marchait, et lui apprend que la
//     machine ment. Trois formes ont fait crier le premier jet : la liste
//     écrite sur deux lignes, l'apostrophe française dans un texte, et le
//     commentaire accentué ;
//   · CHAQUE FAUTE PORTE SON NOM. C'est toute la raison d'exister du fichier :
//     mesuré dans Chromium (`tools/tmp/mesurePython.mjs`), Skulpt répond « bad
//     input on line 2 » à quatre fautes entièrement différentes.
//
// La confrontation au VRAI interpréteur, elle, vit dans
// `node tools/pythonDiagnostic.mjs` : une épreuve ne peut pas charger Skulpt.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    diagnostiquer, conseilDuPas, traduireErreur, masquer, lire
} from '../js/core/python/diagnostic.js';
import { pythonPasAPasGenerator, ETAPES } from '../js/core/generators/pythonPasAPas.js';
import { makeRng } from '../js/core/ids.js';

// Les programmes qu'un élève de collège écrira vraiment.
const JUSTES = [
    'print("Bonjour")',
    'a = 5\nprint(a)',
    'n = int(input("Un nombre : "))\nprint(n * 2)',
    'n = 7\nif n > 5:\n    print("grand")\nelse:\n    print("petit")',
    'for i in range(3):\n    print(i)\nprint("fini")',
    'for i in range(3):\n    if i > 1:\n        print(i)\n    print("tour")',
    'def double(x):\n    return 2 * x\nprint(double(5))',
    's = 0\nfor x in [1, 2, 3]:\n    s = s + x\nprint(s)',
    'n = 5\nwhile n > 0:\n    print(n)\n    n = n - 1',
    'if 2 == 2:\n    print("oui")',
    'x = 3\nif x != 4:\n    print("différent")'
];

test('AUCUN PROGRAMME CORRECT N’EST REFUSÉ', () => {
    for (const code of JUSTES) {
        const vu = diagnostiquer(code);
        assert.equal(vu, null,
            `faute inventée sur « ${code.replace(/\n/g, ' ⏎ ')} » : `
            + (vu ? vu.faute + ' — ' + vu.dire : ''));
    }
});

test('LES TROIS FORMES QUI AVAIENT FAIT CRIER LE PREMIER JET', () => {
    // 1. LA LISTE SUR DEUX LIGNES. La seconde est décalée sans que la première
    //    finisse par deux-points — et c'est du Python parfaitement juste : ce
    //    n'est pas une ligne, c'est la SUITE de la précédente. Tant qu'un
    //    crochet est ouvert, Python n'impose aucun décalage.
    assert.equal(diagnostiquer('t = [1,\n     2]\nprint(t)'), null);
    assert.equal(diagnostiquer('print(1 +\n      2)'), null);

    // 2. L'APOSTROPHE FRANÇAISE DANS UN TEXTE. « print("l'eau") » porte un
    //    guillemet simple au milieu de guillemets doubles : la règle du
    //    guillemet dépareillé y voyait deux signes différents. Nos élèves
    //    écrivent en français ; cette forme est la norme, pas l'exception.
    assert.equal(diagnostiquer('print("l\'eau bout à 100 degrés")'), null);

    // 3. LE COMMENTAIRE ACCENTUÉ. Un commentaire est du français ; la règle de
    //    l'accent dans un nom de variable ne doit pas le voir. Et il contient
    //    souvent un « if » ou un « = » qui feraient crier les autres règles.
    assert.equal(diagnostiquer('print(2)   # si x = 3 alors on affiche l\'élève'), null);
    assert.equal(diagnostiquer('# for i in range(3) sans deux-points\nprint(1)'), null);
});

test('UN TEXTE N’EST PAS DU CODE : « masquer » efface ce qu’il y a dedans', () => {
    // SANS ELLE, TOUT LE RESTE SE TROMPE : `print("if x = 3")` contient un
    // « if » sans deux-points et un « = » dans un test.
    assert.equal(masquer('print("if x = 3")').texte, 'print("        ")');
    assert.equal(diagnostiquer('print("if x = 3")'), null);
    // Et le commentaire mange la fin de la ligne, pour que « finit par
    // deux-points » reste vrai derrière un commentaire.
    assert.ok(lire('for i in range(3):  # ma boucle\n    print(i)')[0].ouvre);
});

// ── CHAQUE FAUTE PORTE SON NOM ────────────────────────────────────────────
//
// Les cinq premières sont exactement celles que Skulpt rend indiscernables.
const FAUTIFS = [
    ['for i in range(3):\nprint(i)', 'indentation-manquante'],
    ['print("a")\n    print("b")', 'indentation-en-trop'],
    ['for i in range(3):\n    print(i)\n  print("fin")', 'indentation-bancale'],
    ['for i in range(3)\n    print(i)', 'deux-points-oublies'],
    ['n = 3\nif n = 3:\n    print("oui")', 'un-seul-egal'],
    ['prénom = "Léa"\nprint(prénom)', 'accent-dans-un-nom'],
    ['print("Bonjour"', 'parenthese-oubliee'],
    ['print("a"))', 'parenthese-en-trop'],
    ['t = [1, 2)\nprint(t)', 'parenthese-melangee'],
    ['print("Bonjour\')', 'chaine-ouverte'],
    ['    print("décalé")', 'premiere-ligne-decalee'],
    ['else:\n    print("sans si")', 'suite-sans-debut'],
    ['if 3 > 2:', 'bloc-vide'],
    ['', 'vide'],
    ['\n\n   \n', 'vide']
];

test('CHAQUE FAUTE PORTE SON NOM, ET PAS CELUI DE LA VOISINE', () => {
    for (const [code, attendu] of FAUTIFS) {
        const vu = diagnostiquer(code);
        assert.ok(vu, `rien dit sur « ${code.replace(/\n/g, ' ⏎ ')} »`);
        assert.equal(vu.faute, attendu,
            `« ${code.replace(/\n/g, ' ⏎ ')} » : on a dit « ${vu.faute} »`);
    }
});

test('LA PHRASE DIT LA LIGNE, ET LA SECONDE DIT QUOI FAIRE', () => {
    // UN DIAGNOSTIC SANS NUMÉRO DE LIGNE NE SERT À RIEN sur un programme de
    // dix lignes, et c'est précisément ce que Skulpt oublie la moitié du temps.
    for (const [code] of FAUTIFS) {
        const vu = diagnostiquer(code);
        assert.ok(vu.dire && vu.dire.length > 10, `phrase vide pour ${vu.faute}`);
        assert.ok(vu.aide && vu.aide.length > 10, `aide vide pour ${vu.faute}`);
        assert.ok(Number.isInteger(vu.ligne) && vu.ligne >= 1,
            `ligne absente pour ${vu.faute}`);
        // ET ELLE EST EN FRANÇAIS. Un message anglais qui passerait au travers
        // ramènerait exactement le défaut qu'on corrige.
        assert.ok(!/\b(line|input|error|invalid|unexpected)\b/i.test(vu.dire),
            `message en anglais pour ${vu.faute} : ${vu.dire}`);
    }
});

test('L’INDENTATION MANQUANTE NOMME LES DEUX LIGNES, PAS UNE', () => {
    // C'est la faute n° 1, et la phrase doit faire le lien : ce qui manque à
    // la ligne 2 est la conséquence de ce qui est écrit à la ligne 1. Dire
    // seulement « ligne 2 » laisse chercher la cause au mauvais endroit —
    // c'est exactement l'erreur de Skulpt, qui dit « bad input on line 2 ».
    const vu = diagnostiquer('for i in range(3):\nprint(i)');
    assert.match(vu.dire, /[Ll]igne 1/);
    assert.match(vu.dire, /ligne 2/);
    assert.equal(vu.ligne, 2);
});

test('ON NE SE TROMPE PAS DE LIGNE SUR UN PROGRAMME QUI EN A DIX', () => {
    const code = [
        'total = 0',
        'for i in range(10):',
        '    if i > 4:',
        '        total = total + i',
        '    print(i)',
        'print(total)',
        'moyenne = total / 10',
        'if moyenne > 3:',
        'print("grande")'        // ← ligne 9 : le décalage manque
    ].join('\n');
    const vu = diagnostiquer(code);
    assert.equal(vu.faute, 'indentation-manquante');
    assert.equal(vu.ligne, 9);
});

test('UN BLOC IMBRIQUÉ QUI REDESCEND DE DEUX CRANS RESTE JUSTE', () => {
    // Le retour en arrière sur un niveau EXISTANT est permis, même en sautant
    // un cran : c'est ce qu'on écrit à chaque fin de double boucle.
    assert.equal(diagnostiquer([
        'for i in range(3):',
        '    for j in range(3):',
        '        print(j)',
        'print("fini")'
    ].join('\n')), null);
});

test('LE PAS DE QUATRE ESPACES EST UN CONSEIL, JAMAIS UN REFUS', () => {
    // Python accepte n'importe quelle largeur pourvu qu'elle soit constante :
    // deux espaces est du Python juste, et le refuser serait inventer une
    // faute. Mais quatre est la convention, et un élève qui décale de deux
    // lira de travers le code qu'on lui montrera demain.
    const deux = 'if 2 > 1:\n  print("oui")';
    assert.equal(diagnostiquer(deux), null, 'deux espaces ne doit PAS être refusé');
    assert.ok(conseilDuPas(deux), 'mais il doit être conseillé');
    assert.match(conseilDuPas(deux), /4/);
    assert.equal(conseilDuPas('if 2 > 1:\n    print("oui")'), null);
    assert.equal(conseilDuPas('print(1)'), null);
});

test('LES ERREURS D’EXÉCUTION SONT TRADUITES, ET AUCUNE NE RESTE VIDE', () => {
    const v = traduireErreur("NameError: name 'x' is not defined on line 1");
    assert.match(v.dire, /x/);
    assert.ok(!/NameError|not defined/.test(v.dire));
    assert.match(traduireErreur('ZeroDivisionError: division by zero').dire, /zéro|0/);
    assert.match(traduireErreur('IndexError: list index out of range').aide, /0/);
    // CELLE QU'ON NE CONNAÎT PAS NE DOIT PAS RENDRE DU VIDE : un message
    // d'erreur absent se lit comme un logiciel cassé.
    const inconnue = traduireErreur('SomethingWeirdError: boom on line 4');
    assert.ok(inconnue.dire.length > 10 && inconnue.aide.length > 10);
    assert.ok(!/on line/.test(inconnue.aide), 'le numéro anglais doit être ôté');
});

test('L’ÉNONCÉ NE DÉSIGNE JAMAIS SA PROPRE RÉPONSE', () => {
    // PAYÉE SUR UNE PHOTO D'ÉCRAN, et ni les épreuves ni la sonde ne
    // pouvaient la voir : toutes deux vérifiaient que le programme était
    // AFFICHÉ, pas qu'il ne répondait pas à la question posée.
    //
    // La marche « quelles lignes sont RÉPÉTÉES par la boucle ? » s'affichait
    // avec les lignes 2 et 3 déjà peintes en violet — la seule chose à
    // trouver était donnée. On garde donc que l'énoncé ne porte AUCUN
    // surlignage, sur aucune des treize marches.
    for (const e of ETAPES) {
        for (let k = 0; k < 20; k++) {
            const it = pythonPasAPasGenerator.generate(
                { marches: [e.id], nbQuestions: 1 },
                { rng: makeRng(e.id + '/' + k), index: 0, total: 1 });
            assert.ok(!/py-ligne--montree|py-ligne--fautive/.test(it.prompt.html),
                `la marche « ${e.id} » surligne une ligne de son énoncé`);
        }
    }
});

test('AUCUN ÉNONCÉ PAPIER NE PORTE TROIS ESPACES DE SUITE', () => {
    // VU SUR LA FEUILLE IMPRIMÉE, et invisible partout ailleurs : le moteur
    // de fiche lit trois espaces consécutifs comme un TROU À REMPLIR (voir
    // `trouDe` dans `core/fiche.js`). Les quatre espaces d'indentation
    // devenaient donc la case où l'élève écrit sa réponse — posée au milieu
    // du programme, ligne 3 —, et la question perdait ses pointillés de fin.
    // Cinq questions sur neuf étaient dans ce cas, et tout était vert.
    //
    // La règle vaut pour toute marche future : un énoncé qui doit MONTRER de
    // l'espace le dessine (voir `CRAN_PAPIER`), il ne le laisse pas en blanc.
    for (const e of ETAPES) {
        for (let k = 0; k < 20; k++) {
            const it = pythonPasAPasGenerator.generate(
                { marches: [e.id], nbQuestions: 1 },
                { rng: makeRng(e.id + '~' + k), index: 0, total: 1 });
            const fautives = String(it.prompt.papier).split('\n')
                .filter((l) => / {3,}/.test(l));
            assert.equal(fautives.length, 0,
                `la marche « ${e.id} » pose un trou sur la feuille : `
                + JSON.stringify(fautives[0] || ''));
        }
    }
});

test('LA FEUILLE GARDE LE DÉCALAGE, SANS QUOI TROIS MARCHES N’ONT PLUS DE RÉPONSE', () => {
    // Les marches 11 à 13 demandent QUELLES LIGNES SONT DANS LA BOUCLE. Une
    // feuille où l'indentation aurait été rabotée poserait une question dont
    // la réponse a disparu — et la feuille est le seul endroit où un élève
    // sans tablette lit du Python.
    const it = pythonPasAPasGenerator.generate(
        { marches: ['dans-la-boucle'], nbQuestions: 1 },
        { rng: makeRng('papier-decalage'), index: 0, total: 1 });
    const lignes = String(it.prompt.papier).split('\n');
    const decalees = lignes.filter((l) => /\|\s*\u00b7/.test(l));
    assert.equal(decalees.length, 2,
        'deux lignes doivent être décalées : ' + JSON.stringify(lignes));
});

test('LE TON RESTE CELUI D’UN PROFESSEUR, PAS CELUI D’UN COMPILATEUR', () => {
    // Rémy écrit à des élèves de sixième. Un vérificateur qui dit « syntax
    // error » ou « invalid token » ne leur parle pas — et c'est tout ce qu'on
    // lui reproche, à l'autre.
    for (const [code] of FAUTIFS) {
        const vu = diagnostiquer(code);
        assert.ok(!/\b(syntaxe?|token|parser?|compil)/i.test(vu.dire + vu.aide),
            `jargon dans « ${vu.faute} » : ${vu.dire} / ${vu.aide}`);
    }
});
