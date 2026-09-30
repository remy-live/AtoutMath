// UN MOINS QUI N'A RIEN À SA GAUCHE N'EST PAS UNE SOUSTRACTION.
//
// Rémy : « les élèves galèrent aux exercices −(−3+5×6)−(−7). Comment les
// aider ? Peut-être commencer par remplacer +(−3), puis faire −(−3+7) en les
// guidant sur les parenthèses puis faire les priorités opératoires » — puis,
// devant l'échelle proposée : « oui et je pense qu'il faut être progressif ».
//
// CETTE EXPRESSION-LÀ N'ÉTAIT PAS TIRABLE. Toutes les formes du moteur
// commencent par un nombre ou par une parenthèse ouvrante ; un moins appliqué à
// un GROUPE n'existait pas. Le professeur qui la récrivait dans une fiche
// obtenait un corrigé refusé, sans savoir pourquoi.
//
// CE QUE LE MOTEUR SAIT MAINTENANT, et l'ordre est toute la leçon :
//
//     −(−3 + 5 × 6) − (−7)
//   = −(−3 + 30) − (−7)      les priorités DEDANS
//   = −(27) − (−7)           la parenthèse devient un nombre
//   = −27 − (−7)             le moins prend l'opposé
//   = −20
//
// L'ÉLÈVE NE PEUT PAS « DISTRIBUER LE MOINS » AVANT D'AVOIR CALCULÉ DEDANS, et
// ce n'est pas une règle ajoutée : c'est l'ordre existant qui l'impose. Tant
// qu'il reste une parenthèse, `groupeInterieur` la sert en premier ; l'opposé
// n'a un nombre sous la main qu'après. C'est exactement la faute que Rémy
// voulait empêcher — « 3 − 5 × 6 » —, et elle est devenue impossible.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    lire, ecrire, etapes, tirerExpression, operationPrioritaire, critiquer,
    reduire, etapesMax
} from '../js/core/priorites.js';
import { makeRng } from '../js/core/ids.js';
import { readFileSync } from 'node:fs';

const OPTS = { relatifs: true };
const cascade = (texte) => {
    const j = lire(texte);
    assert.ok(j, `« ${texte} » doit se lire`);
    const l = etapes(j, OPTS);
    assert.ok(l, `« ${texte} » doit se résoudre`);
    return l.map(x => ecrire(x.jetons));
};

test('L\'EXPRESSION DE RÉMY SE LIT ET SE RÉSOUT', () => {
    assert.deepEqual(cascade('-(-3+5*6)-(-7)'), [
        '−(−3 + 5 × 6) − (−7)',
        '−(−3 + 30) − (−7)',
        '−(27) − (−7)',
        '−27 − (−7)',
        '−20'
    ]);
});

test('LA PARENTHÈSE D\'UN OPPOSÉ SURVIT À SON CONTENU', () => {
    // MESURÉ AVANT : la cascade écrivait « −27 − (−7) » DEUX FOIS de suite. Le
    // nettoyage réduisait « (27) » en « 27 » dès le calcul du groupe, si bien
    // que le moins s'appliquait à l'ÉCRITURE avant de s'appliquer au calcul :
    // l'élève voyait « −27 » apparaître sans avoir rien fait, puis une ligne
    // qui ne changeait rien. C'est la ligne « −(27) » qui montre le geste.
    const l = cascade('-(-3+7)');
    assert.deepEqual(l, ['−(−3 + 7)', '−(4)', '−4']);
    // Et une parenthèse ordinaire, elle, disparaît toujours.
    assert.deepEqual(cascade('(4+5)-2'), ['(4 + 5) − 2', '9 − 2', '7']);
});

test('ON NE PEUT PAS APPLIQUER LE MOINS AVANT D\'AVOIR CALCULÉ DEDANS', () => {
    const j = lire('-(-3+5*6)-(-7)');
    // L'opération prioritaire est la multiplication, pas l'opposé.
    const p = operationPrioritaire(j, OPTS);
    assert.equal(p.op, '×', 'la priorité est DANS la parenthèse');
    // Et cliquer l'opposé le dit avec le geste, pas avec la règle.
    const iOppose = j.findIndex(x => x.type === 'u');
    assert.ok(iOppose >= 0);
    assert.match(critiquer(j, iOppose, OPTS), /calcule d'abord ce qu'il y a dedans/,
        'c\'est la faute que Rémy voulait empêcher : « 3 − 5 × 6 »');
});

test('L\'OPPOSÉ EMPORTE SA PARENTHÈSE, NI PLUS NI MOINS', () => {
    // TROIS LARGEURS SE CÔTOIENT dans `largeurOperation`, et se tromper
    // n'affiche aucune erreur : cela efface un voisin, et la ligne suivante est
    // fausse en silence. On vérifie donc les deux formes de l'opposé.
    const surGroupe = lire('-(27)-(-7)');
    const p1 = operationPrioritaire(surGroupe, OPTS);
    assert.equal(ecrire(reduire(surGroupe, p1.index, p1.valeur)), '−27 − (−7)',
        'quatre jetons remplacés : le moins, la parenthèse, le nombre, la parenthèse');
    const surNombre = lire('-(-7)');
    const p2 = operationPrioritaire(surNombre, OPTS);
    assert.equal(ecrire(reduire(surNombre, p2.index, p2.valeur)), '7',
        'deux jetons remplacés : le moins et le nombre');
});

test('L\'ÉCHELLE MONTE D\'UNE DIFFICULTÉ PAR BARREAU', () => {
    // CHAQUE BARREAU AJOUTE UNE CHOSE, ET UNE SEULE. Deux crans qui enseignent
    // la même chose ne sont pas une progression — MESURÉ à l'écran, le barreau
    // 2 tirait « −(−8 × 7) », c'est-à-dire ce que le barreau 3 apporte.
    const tire = (niveau, k) => tirerExpression({
        rng: makeRng(`echelle-${niveau}-${k}`), niveau, avecOppose: true
    });
    for (let k = 0; k < 40; k++) {
        const un = tire(1, k).texte;
        assert.doesNotMatch(un, /[×÷]/,
            'le barreau 1 ne multiplie pas : « −6 × (−7) » est le produit de deux '
            + 'relatifs, un autre chapitre');
        const deux = tire(2, k).texte;
        assert.doesNotMatch(deux, /[×÷]/,
            'le barreau 2 porte sur la parenthèse, pas sur les priorités');
        assert.match(deux, /^−\(/, 'et il commence toujours par un opposé');
        const trois = tire(3, k).texte;
        assert.match(trois, /[×÷]/,
            'le barreau 3 a TOUJOURS une priorité à trancher, sinon il ne porte '
            + 'pas son nom une fois sur deux');
        const quatre = tire(4, k).texte;
        //  NE TRAVERSE PAS LES PARENTHÈSES DES NÉGATIFS : la première
        // version de ce motif refusait « −(−3 − (−9) × (−6)) + (−5) », qui est
        // pourtant exactement la forme attendue. C'était l'épreuve qui avait
        // tort, pas le tirage.
        assert.match(quatre, /^−\(.*[×÷].*\) [+−] \(−\d+\)$/,
            'et le barreau 4 est la forme que Rémy écrit au tableau');
    }
});

test('ET LA FEUILLE RÉSERVE LE BON NOMBRE DE LIGNES', () => {
    // Une cascade tronquée se voit au crayon et pas à l'écran : la dernière
    // ligne n'a simplement plus où s'écrire.
    assert.equal(etapesMax({ niveau: 1, avecOppose: true }), 1);
    assert.equal(etapesMax({ niveau: 2, avecOppose: true }), 2);
    assert.equal(etapesMax({ niveau: 3, avecOppose: true }), 3);
    assert.equal(etapesMax({ niveau: 4, avecOppose: true }), 4);
});

test('LE RESTE DU MOTEUR N\'A PAS BOUGÉ', () => {
    // « Une mesure qui ne regarde que ce qu'on a corrigé ne voit pas ce qu'on a
    // cassé » : ce moteur sert trois exercices et la fiche imprimée.
    assert.deepEqual(cascade('3+4*5'), ['3 + 4 × 5', '3 + 20', '23']);
    assert.deepEqual(cascade('5-(-3+2)'), ['5 − (−3 + 2)', '5 − (−1)', '6']);
    const ordinaire = tirerExpression({ rng: makeRng('temoin'), niveau: 3, relatifs: true });
    assert.doesNotMatch(ordinaire.texte, /^−\(/,
        'sans le réglage, aucune expression ne commence par un opposé');
});

test('CE QUE LE MOTEUR SAIT RÉDUIRE, L\'ÉCRAN DOIT LE RENDRE CLIQUABLE', () => {
    // Rémy : « −(−4) il demande de cliquer sur une opération mais ça ne va pas,
    // ça ne fait rien ».
    //
    // MESURÉ AU NAVIGATEUR : sur « − (−4) », les deux jetons sortaient en
    // `.pr-jeton` nus, sans `--op`, donc sans gestionnaire de clic. L'écran
    // réclamait un clic et n'offrait rien à cliquer. L'élève n'était pas en
    // train de se tromper : il était arrêté.
    //
    // LA CAUSE TIENT EN UN MOT MANQUANT. Le jeton `u` — le moins unaire — avait
    // été ajouté au MOTEUR sans l'être à la MAIN qui le montre. Les épreuves du
    // moteur passaient donc toutes au vert sur un exercice injouable : elles
    // regardaient `etapes()`, jamais l'écran.
    //
    // D'OÙ CETTE ÉPREUVE-CI, qui relie les deux : tout type de jeton que le
    // moteur sait réduire doit être proposé au clic. Ajouter demain un jeton
    // réductible sans toucher `jetonHtml` la fera tomber.
    const AGISSANTS = ['op', 'p', 'u'];
    const JEU = readFileSync(new URL('../js/games/priorites.js', import.meta.url), 'utf8');
    const ligne = (JEU.match(/const agissant = .*/) || [''])[0];
    assert.ok(ligne, 'la ligne qui décide de ce qui se clique existe toujours');
    for (const t of AGISSANTS) {
        assert.ok(ligne.includes(`'${t}'`),
            `le jeton « ${t} » est réductible par le moteur : il doit être cliquable`);
    }

    // ET LE MOTEUR SAIT BIEN LE RÉDUIRE, pour que l'épreuve ci-dessus garde
    // quelque chose de vrai et non une liste écrite à la main.
    const j = lire('-(-4)');
    assert.ok(j.some(x => x.type === 'u'), '« −(−4) » porte bien un moins unaire');
    assert.deepEqual(cascade('-(-4)'), ['−(−4)', '4']);
});
