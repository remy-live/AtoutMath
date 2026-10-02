// ON NE REPOSE PAS LA MÊME QUESTION.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, sur la Table de Pythagore : « sur la table de pythagore, essaie
// d'eviter les mêmes questions ».
//
// MESURÉ AVANT DE CORRIGER — `node tools/repetitionsDUneSerie.mjs
// calc-pythagore --clef reponse --series 2000`, soit deux mille séries de
// vingt questions tirées par une VRAIE session :
//
//   déjà posées, en moyenne   4,57 sur 20
//   séries qui en comptent    99,8 %
//   pire série                10
//   une série, pour voir      12 18 32 12 12 40 5 81 28 64 6 42 90 14 10 10
//                             56 40 90 24
//
// Trois douze, deux dix, deux quarante, deux quatre-vingt-dix. Ce n'était pas
// de la malchance : chaque question partait d'une graine neuve sans jamais
// regarder les précédentes, et quatre-vingt-dix couples possibles pour vingt
// tirages donnent la collision pour règle.
//
// APRÈS : 0,00 en moyenne, 0,3 % des séries, pire série 1.
//
// LA CLEF EST CE QUE L'ÉLÈVE LIT, et c'est la moitié du correctif. Sur la
// Table de Pythagore, le générateur produit « 7 × 6 = ? » et « 6 × 7 = ? » —
// deux items parfaitement différents — tandis que l'écran ne montre que le
// produit : « Où se cache 42 dans la table ? ». Dédoublonner les ÉNONCÉS
// n'aurait donc rien changé là où Rémy voit le défaut. L'activité déclare sa
// clef ; par défaut, c'est l'énoncé.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';
import { ItemSession } from '../js/core/itemSession.js';
import { defaultPolicy } from '../js/core/policy.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

/**
 * UN GÉNÉRATEUR QUI NE SAIT QUE QUATRE QUESTIONS — exprès.
 *
 * Avec un générateur aux quatre-vingt-dix réponses, une épreuve de vingt
 * questions passerait encore sans dédoublonnage, une fois sur cinq cents : une
 * épreuve qui dépend du hasard ne garde rien. Avec quatre questions pour
 * quatre tirages, le défaut est certain et le correctif l'est aussi.
 */
function generateurDe(valeurs) {
    return {
        id: 'essai.repetition',
        generate(params, ctx) {
            const v = valeurs[ctx.rng.int(0, valeurs.length - 1)];
            return {
                seed: ctx.rng.seed,
                generatorId: 'essai.repetition',
                answerKind: 'numeric',
                prompt: { text: `combien vaut ${v} ?`, html: `<div>${v}</div>` },
                answer: v,
                hints: [], explanation: ''
            };
        }
    };
}

/** Une session comme le meneur la monte, sans rien écrire au journal. */
function session(generator, nbItems) {
    return new ItemSession({
        generator, params: {}, policy: { ...defaultPolicy },
        exercise: { id: 'x', title: 'Essai' }, nbItems, sansTrace: true
    });
}

test('QUATRE QUESTIONS POSSIBLES, QUATRE POSÉES : la répétition recule de dix fois', () => {
    // UNE SEULE SÉRIE EST UN COUP DE DÉ, PAS UNE ÉPREUVE — et je l'ai écrite
    // comme ça d'abord. « Quatre valeurs, quatre questions, quatre distinctes »
    // était vert, mais il tombait tout seul une fois sur trente : au quatrième
    // tirage, les douze retirages ont encore (3/4)^12 ≈ 3 % de chances de
    // retomber chaque fois sur du déjà vu. `epreuveTombe.mjs` l'a dit de la
    // manière la plus claire possible — « L'ÉPREUVE EST DÉJÀ ROUGE avant qu'on
    // touche à quoi que ce soit » — sur un dépôt intact.
    //
    // ON MESURE DONC, sur assez de séries pour que la moyenne tienne. Et c'est
    // mieux ainsi : le correctif ne promet pas l'impossible (« jamais deux fois
    // la même »), il promet que ça devienne rare. L'épreuve dit maintenant la
    // même chose que lui.
    const SERIES = 300;
    let repetitions = 0;
    for (let n = 0; n < SERIES; n++) {
        const s = session(generateurDe([11, 22, 33, 44]), 4);
        const lues = [s.next(), s.next(), s.next(), s.next()].map(i => i.prompt.text);
        repetitions += lues.length - new Set(lues).size;
    }
    const moyenne = repetitions / SERIES;
    // Sans dédoublonnage, quatre tirages indépendants dans quatre valeurs
    // répètent 1,44 question par série (mesuré). Avec, 0,15.
    assert.ok(moyenne < 0.5,
        `${moyenne.toFixed(2)} question répétée par série de quatre : le tirage ne regarde pas derrière lui`);
});

test('PLUS DE QUESTIONS QUE L\'EXERCICE N\'EN A : il en pose quand même', () => {
    // LE PIÈGE DE L'AUTRE CÔTÉ. Un exercice réglé sur dix questions mais qui
    // n'en connaît que trois doit en poser dix : chercher « une question
    // neuve » sans jamais abandonner tournerait en rond, et l'élève verrait
    // l'exercice se figer — infiniment pire qu'une question revue.
    const s = session(generateurDe([7, 8, 9]), 10);
    const lues = [];
    for (let i = 0; i < 10; i++) lues.push(s.next().prompt.text);
    assert.equal(lues.length, 10, 'des questions ont manqué');
    assert.ok(lues.every(t => typeof t === 'string' && t.length > 0),
        'une question vide : la session a renoncé à tirer');
    // Les trois sortent, et aucune ne monopolise la série.
    assert.equal(new Set(lues).size, 3);
});

test('LA CLEF DÉCLARÉE PAR L\'ACTIVITÉ L\'EMPORTE — c\'est le cas de Rémy', () => {
    // Deux items DIFFÉRENTS pour le logiciel, une seule question pour l'élève :
    // 7 × 6 et 6 × 7 ne montrent que « 42 ». On rejoue cette forme-là.
    //
    // QUATRE ÉNONCÉS, DEUX RÉSULTATS — et il faut les choisir. Le premier jeu
    // de paires que j'avais écrit, [2,6] [6,2] [3,4] [4,3], fait douze QUATRE
    // FOIS : l'épreuve exigeait alors deux résultats distincts d'un générateur
    // qui n'en connaît qu'un, et accusait le correctif au lieu du jeu d'essai.
    const paires = [[2, 6], [6, 2], [3, 5], [5, 3]];
    const generator = {
        id: 'essai.produit',
        generate(params, ctx) {
            const [a, b] = paires[ctx.rng.int(0, paires.length - 1)];
            return {
                seed: ctx.rng.seed, generatorId: 'essai.produit', answerKind: 'numeric',
                prompt: { text: `${a} × ${b} = ?`, html: '' }, answer: a * b,
                hints: [], explanation: ''
            };
        }
    };

    // SANS LA CLEF : quatre énoncés distincts, donc la session est contente —
    // et l'élève lit deux fois 12 et deux fois 12. C'est exactement le défaut.
    const sansClef = session(generator, 4);
    const enonces = [sansClef.next(), sansClef.next(), sansClef.next(), sansClef.next()];
    assert.equal(new Set(enonces.map(i => i.prompt.text)).size, 4,
        'le dédoublonnage par énoncé devrait suffire pour les énoncés');

    // AVEC LA CLEF que l'activité déclare : deux résultats possibles, deux
    // questions posées, et la troisième n'a plus rien de neuf à offrir.
    const avec = session(generator, 2);
    avec.clefDeQuestion(it => String(it.answer));
    const resultats = [avec.next().answer, avec.next().answer];
    assert.equal(new Set(resultats).size, 2,
        `le même résultat deux fois : ${resultats.join(' et ')}`);
});

test('LA TABLE DE PYTHAGORE DÉCLARE SA CLEF — sinon le correctif ne l\'atteint pas', () => {
    const ACT = lire('js/core/activities/pythagore.js');
    assert.match(ACT, /session\.clefDeQuestion\(it => String\(it\.answer\)\)/);
    // ET AVANT LE PREMIER TIRAGE : déclarée après `renderNext()`, elle
    // arriverait une question trop tard.
    const iClef = ACT.indexOf('clefDeQuestion');
    const iPremier = ACT.indexOf('renderNext();', ACT.indexOf('return {') > 0 ? 0 : 0);
    assert.ok(iClef > 0 && iClef < ACT.lastIndexOf('renderNext();'),
        'la clef se déclare après le premier tirage');
    assert.ok(iPremier > 0);
});

test('UNE GRAINE IMPOSÉE SE REJOUE, même déjà posée', () => {
    // C'EST CE QUI PERMET AU PROFESSEUR DE VOIR CE QUE L'ÉLÈVE A SOUS LES
    // YEUX, et à l'élève de revenir en arrière pendant un test. Si le
    // dédoublonnage s'appliquait à une graine imposée, il retirerait autre
    // chose — c'est-à-dire exactement le contraire de ce qu'on lui demande.
    const s = session(generateurDe([5, 6]), 4);
    const premier = s.next();
    assert.equal(s.rewind(), false, 'une seule question : rien derrière');
    s.next();                                  // la deuxième, forcément l'autre
    assert.equal(s.rewind(), true);
    const rejouee = s.next();
    assert.equal(rejouee.prompt.text, premier.prompt.text,
        'le retour en arrière ne rejoue pas la même question');
    assert.equal(rejouee.seed, premier.seed, 'la graine a changé : ce n\'est plus la question');
});

test('LE RANG NE BOUGE PAS QUAND ON RETIRE — une progression en dépend', () => {
    // `index` dit au générateur où l'on en est : Le Chat Géomètre enchaîne
    // douze figures dans un ordre choisi. Si douze tirages pour la MÊME
    // question portaient douze rangs différents, la progression sauterait des
    // marches sans que personne ne comprenne pourquoi.
    const rangs = [];
    const generator = {
        id: 'essai.rang',
        generate(params, ctx) {
            rangs.push(ctx.index);
            // Toujours la même question : la session va retirer douze fois.
            return {
                seed: ctx.rng.seed, generatorId: 'essai.rang', answerKind: 'numeric',
                prompt: { text: 'toujours la même', html: '' }, answer: 1,
                hints: [], explanation: ''
            };
        }
    };
    const s = session(generator, 2);
    s.next();
    assert.deepEqual(rangs, [0], 'la première question est au rang 0');
    rangs.length = 0;
    s.next();
    assert.ok(rangs.length > 1, 'la session n\'a pas retiré alors que la question est la même');
    assert.deepEqual(new Set(rangs), new Set([1]),
        `les tirages d'une même question portent des rangs différents : ${rangs.join(' ')}`);
});

test('ON RETIRE UN NOMBRE BORNÉ DE FOIS — jamais « jusqu\'à trouver »', () => {
    // Une boucle sans borne sur un générateur qui n'a qu'une question fige
    // l'exercice. On compte les appels : douze au plus, pas l'infini.
    let appels = 0;
    const generator = {
        id: 'essai.unique',
        generate(params, ctx) {
            appels++;
            return {
                seed: ctx.rng.seed, generatorId: 'essai.unique', answerKind: 'numeric',
                prompt: { text: 'l\'unique', html: '' }, answer: 1, hints: [], explanation: ''
            };
        }
    };
    const s = session(generator, 3);
    s.next(); s.next(); s.next();
    assert.ok(appels <= 1 + 12 + 12, `${appels} tirages pour trois questions`);
    assert.ok(appels > 3, 'aucun nouveau tirage : le dédoublonnage ne fait rien');
});

test('UNE CLEF QUI LÈVE NE CASSE PAS LA QUESTION', () => {
    // La clef vient d'une activité. Une question qui ne s'affiche pas coûte
    // infiniment plus cher qu'une question répétée : on avale.
    const s = session(generateurDe([1, 2, 3]), 2);
    s.clefDeQuestion(() => { throw new Error('clef cassée'); });
    const item = s.next();
    assert.ok(item && item.prompt.text, 'la question a disparu avec la clef');
});
