// L'APPROXDOKU — les règles, et ce que le générateur promet.
//
// RÉMY : « et un approxdoku », avec la page d'Erich Friedman en capture.
//
// LA PIÈCE MAÎTRESSE DE CE FICHIER EST SA GRILLE À LUI. Une page publiée, un
// exemple résolu imprimé dessous : c'est un témoin que je n'ai pas fabriqué, et
// il répond à la seule question qui compte avant d'écrire une ligne — « ai-je
// bien lu la règle ? ». Les cinq équations de son exemple doivent être justes
// sous mes règles, et sa grille doit être la seule qui les satisfasse. Si l'un
// des deux tombe, c'est moi qui ai mal lu, pas lui qui s'est trompé.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    evaluerCote, equationJuste, operateursPossibles, permutations,
    compterSolutions, deduitSansDeviner, seChevauchent, chainesPossibles,
    PALIERS, approxdokuGenerator
} from '../js/core/generators/approxdoku.js';

// --- Le témoin publié --------------------------------------------------------

/** L'exemple RÉSOLU de la page de Friedman, relevé sur la capture. */
const FRIEDMAN = [
    [4, 2, 3, 1, 5],
    [3, 4, 1, 5, 2],
    [2, 1, 5, 4, 3],
    [1, 5, 2, 3, 4],
    [5, 3, 4, 2, 1]
];
const chaine = (sens, r, c, L, ops) => ({
    sens, ops,
    cases: Array.from({ length: L }, (_, k) => (sens === 'h' ? { r, c: c + k } : { r: r + k, c }))
});
const EQUATIONS_FRIEDMAN = [
    chaine('h', 0, 1, 4, ['+', '+', '≈']),   // 2+3+1 ≈ 5
    chaine('h', 1, 0, 3, ['≈', '×']),        // 3 ≈ 4×1
    chaine('h', 2, 0, 4, ['÷', '≈', '−']),   // 2÷1 ≈ 5−4
    chaine('h', 3, 2, 2, ['≈']),             // 2 ≈ 3
    chaine('h', 4, 2, 3, ['÷', '≈'])         // 4÷2 ≈ 1
];
const valeursDe = (eq, grille) => eq.cases.map(({ r, c }) => grille[r][c]);

test('LA GRILLE PUBLIÉE PAR FRIEDMAN EST JUSTE SOUS NOS RÈGLES', () => {
    // C'est l'épreuve qui dit si j'ai bien lu sa phrase : « both sides will
    // evaluate to positive integers that differ by 1 ». Si l'une de ses cinq
    // équations était « fausse » chez nous, ce serait notre lecture qui cloche.
    EQUATIONS_FRIEDMAN.forEach((eq, i) => {
        assert.ok(equationJuste(eq.ops, valeursDe(eq, FRIEDMAN)),
            `l'équation ${i} de l'exemple publié est refusée : ${valeursDe(eq, FRIEDMAN).join(' ')}`
            + ` avec ${eq.ops.join(' ')}`);
    });
});

test('ET SA GRILLE EST LA SEULE QUI SATISFASSE SES CINQ ÉQUATIONS', () => {
    // Ce qui éprouve `compterSolutions` contre quelque chose qu'on n'a pas
    // écrit : une énigme publiée a UNE solution, c'est sa définition.
    assert.equal(compterSolutions(5, EQUATIONS_FRIEDMAN, 9, permutations(5), Infinity), 1);
});

test('MAIS ELLE NE SE DÉDUIT PAS SANS DEVINER — ET C\'EST LE TÉMOIN', () => {
    // ─────────────────────────────────────────────────────────────────────
    // CETTE ÉPREUVE EST LE CONTRE-EXEMPLE DE `deduitSansDeviner`, et sans elle
    // on n'aurait aucune preuve que cette fonction sache dire « non ». Une
    // fonction de qualité qui répond toujours « oui » ne filtre rien, et l'on
    // croirait filtrer.
    //
    // ELLE DIT AUSSI QUELQUE CHOSE SUR LE JEU. La grille de Friedman est
    // unique, publiée, et parfaitement valide — elle demande simplement plus
    // que la propagation simple : il faut, à un moment, supposer et voir où ça
    // mène. C'est le contrat normal d'une énigme pour amateur adulte. Les
    // élèves de Rémy n'ont ni ce temps ni cette habitude, et c'est très
    // exactement pour cela que le générateur rejette ces grilles-là.
    // ─────────────────────────────────────────────────────────────────────
    assert.equal(deduitSansDeviner(5, EQUATIONS_FRIEDMAN), false,
        'si même cette grille-là se déduit, la propagation accepte tout');
});

// --- Les règles, une par une -------------------------------------------------

test('les priorités s\'appliquent : × et ÷ avant + et −', () => {
    assert.equal(evaluerCote([2, 3, 4], ['+', '×']), 14);   // 2 + 12, pas 20
    assert.equal(evaluerCote([1, 2, 3], ['+', '×']), 7);    // 1 + 6
    assert.equal(evaluerCote([4, 2, 1], ['÷', '+']), 3);    // 2 + 1
    // De gauche à droite entre opérations de même rang.
    assert.equal(evaluerCote([5, 3, 1], ['−', '−']), 1);
    assert.equal(evaluerCote([8, 2, 2], ['÷', '÷']), 2);
});

test('toute étape doit tomber sur un entier positif', () => {
    assert.equal(evaluerCote([5, 2], ['÷']), null, '5÷2 n\'est pas un entier');
    assert.equal(evaluerCote([2, 5], ['−']), null, '2−5 passe sous zéro');
    assert.equal(evaluerCote([3, 3], ['−']), null, 'un côté ne vaut jamais zéro');
    // ET L'ÉTAPE INTERMÉDIAIRE COMPTE AUTANT QUE LE RÉSULTAT : « 1−5+6 » vaut
    // 2 en passant par −4. Un élève de sixième qui vérifie de gauche à droite
    // tomberait sur un nombre qui n'a pas de sens pour lui — il n'a pas encore
    // vu les relatifs — et croirait s'être trompé.
    assert.equal(evaluerCote([1, 5, 6], ['−', '+']), null,
        'la soustraction passe par −4 avant de remonter');
    assert.equal(evaluerCote([6, 1, 5], ['−', '+']), 10, 'celle-ci ne descend jamais');

    // ─────────────────────────────────────────────────────────────────────
    // ET UN CÔTÉ D'UNE SEULE CASE EST VÉRIFIÉ COMME LES AUTRES.
    //
    // Ces trois lignes-là sont nées d'un défaut que seul `epreuveTombe.mjs` a
    // su montrer : il a refusé de faire tomber cette épreuve quand on retirait
    // le contrôle d'entier positif de la passe ×÷. En cherchant pourquoi, on a
    // trouvé pire à côté — la passe +− ne tournant pas sur une seule valeur,
    // AUCUN contrôle ne s'appliquait, et `evaluerCote([0], [])` valait 0. Donc
    // `0 ≈ 1` était « juste », puisque 0 et 1 se suivent.
    //
    // Une case VIDE vaut `0` dans la grille. Le défaut n'était pas atteignable
    // — l'activité écarte les chaînes à trous avant de les juger — mais il
    // était à une ligne de l'être.
    // ─────────────────────────────────────────────────────────────────────
    assert.equal(evaluerCote([0], []), null, 'une case vide n\'est pas un entier positif');
    assert.equal(equationJuste(['≈'], [0, 1]), false,
        'une chaîne dont une case est vide ne peut pas être « juste »');
    // ET LE CONTRÔLE DE LA PASSE ×÷ N'EST PAS MORT POUR AUTANT : ici le total
    // final vaut 3, donc positif — c'est le PRODUIT intermédiaire qui vaut 0.
    assert.equal(evaluerCote([0, 2, 3], ['×', '+']), null,
        '0×2 vaut 0, et le total qui suit le masque');
});

test('« ≈ » veut dire « à UN près » — l\'égalité parfaite est une FAUTE', () => {
    assert.ok(equationJuste(['≈'], [2, 3]));
    assert.ok(equationJuste(['≈'], [3, 2]));
    assert.equal(equationJuste(['≈'], [3, 3]), false, 'deux côtés égaux sont faux ici');
    assert.equal(equationJuste(['≈'], [3, 5]), false, 'deux d\'écart, ce n\'est pas « à un près »');
    // Sans « ≈ », il n'y a pas d'équation du tout.
    assert.equal(equationJuste(['+'], [2, 3]), false);
});

test('une chaîne porte exactement un « ≈ », et les côtés sont bornés', () => {
    const toutes = operateursPossibles([2, 3, 1, 5], 2);
    assert.ok(toutes.length, 'aucune répartition trouvée sur une chaîne qui en a');
    toutes.forEach(ops => {
        assert.equal(ops.filter(o => o === '≈').length, 1, `deux « ≈ » : ${ops.join(' ')}`);
        const k = ops.indexOf('≈');
        assert.ok(k <= 2 && ops.length - k - 1 <= 2, `un côté déborde : ${ops.join(' ')}`);
    });
    // LA BORNE SERT VRAIMENT : à un opérateur par côté, « a+b+c≈d » disparaît,
    // et c'est ce qui rend le palier Découverte insensible aux priorités.
    operateursPossibles([2, 3, 1, 5], 1).forEach(ops => {
        const k = ops.indexOf('≈');
        assert.ok(k <= 1 && ops.length - k - 1 <= 1, `un côté déborde : ${ops.join(' ')}`);
    });
    assert.ok(operateursPossibles([2, 3, 1, 5], 1).length
        < operateursPossibles([2, 3, 1, 5], 2).length,
    'la borne à 1 ne retire rien, elle ne borne donc rien');
});

test('toute chaîne proposée est VRAIE sur la grille dont elle sort', () => {
    const rng = makeRng('chaines');
    const solution = [[1, 2, 3, 4], [2, 3, 4, 1], [3, 4, 1, 2], [4, 1, 2, 3]];
    const chaines = chainesPossibles(4, solution, 4, 2);
    assert.ok(chaines.length > 20, `seulement ${chaines.length} chaînes trouvées`);
    chaines.forEach(eq => {
        assert.ok(equationJuste(eq.ops, valeursDe(eq, solution)),
            `chaîne fausse proposée : ${valeursDe(eq, solution).join(' ')} / ${eq.ops.join(' ')}`);
        // Les cases se suivent, dans une ligne ou dans une colonne.
        eq.cases.forEach((p, k) => {
            if (!k) return;
            const avant = eq.cases[k - 1];
            const dr = p.r - avant.r, dc = p.c - avant.c;
            assert.deepEqual(eq.sens === 'h' ? [0, 1] : [1, 0], [dr, dc],
                'une chaîne saute une case');
        });
    });
    assert.ok(rng);
});

test('deux chaînes du même sens ne partagent pas une case', () => {
    const a = chaine('h', 0, 0, 3, ['+', '≈']);
    const b = chaine('h', 0, 2, 2, ['≈']);
    const c = chaine('v', 0, 2, 2, ['≈']);
    assert.equal(seChevauchent(a, b), true, 'la case (0,2) est dans les deux');
    assert.equal(seChevauchent(a, c), false, 'un croisement horizontal/vertical est permis');
});

test('le plafond d\'effort du compteur penche du côté PRUDENT', () => {
    // Épuisé, il doit répondre « ce n'est pas unique » — jamais « ça l'est ».
    // Les deux appelants s'en trouvent du bon côté : celui qui ajoute des
    // équations en ajoute une de plus, celui qui en retire en garde une de
    // trop. Un plafond qui pencherait de l'autre côté livrerait des grilles à
    // deux solutions, c'est-à-dire des grilles sans réponse.
    const serre = compterSolutions(5, EQUATIONS_FRIEDMAN, 2, permutations(5), 1);
    assert.equal(serre, 2, 'un budget d\'un seul pas doit rendre « pas unique »');
});

// --- Ce que le générateur promet, sur les cinq paliers -----------------------

const GRILLES_PAR_PALIER = 6;

for (const [nom, P] of Object.entries(PALIERS)) {
    test(`palier « ${nom} » : unique, déductible, et toutes les chaînes vraies`, () => {
        const perms = permutations(P.n);
        for (let i = 0; i < GRILLES_PAR_PALIER; i++) {
            const item = approxdokuGenerator.generate({ palier: nom },
                { rng: makeRng(`ap-${nom}-${i}`), index: i });
            const { n, solution, equations } = item.meta;
            assert.equal(n, P.n, `${nom} : mauvaise taille`);

            // Un carré latin.
            for (let r = 0; r < n; r++) {
                assert.equal(new Set(solution[r]).size, n, `${nom} #${i} : ligne ${r} répète`);
                assert.equal(new Set(solution.map(l => l[r])).size, n,
                    `${nom} #${i} : colonne ${r} répète`);
            }

            // Chaque chaîne est vraie sur la solution annoncée. Sans cela, la
            // grille n'a pas de réponse du tout — et l'élève chercherait une
            // faute qui n'est pas la sienne.
            equations.forEach(eq => {
                assert.ok(equationJuste(eq.ops, valeursDe(eq, solution)),
                    `${nom} #${i} : chaîne fausse sur sa propre solution`);
                assert.equal(eq.ops.filter(o => o === '≈').length, 1);
                const k = eq.ops.indexOf('≈');
                assert.ok(k <= P.maxOpsParCote && eq.ops.length - k - 1 <= P.maxOpsParCote,
                    `${nom} #${i} : un côté dépasse ${P.maxOpsParCote} opération(s)`);
                assert.ok(eq.cases.length >= 2 && eq.cases.length <= P.longueurMax,
                    `${nom} #${i} : chaîne de ${eq.cases.length} cases`);
            });

            // Aucun chevauchement dans le même sens.
            equations.forEach((a, k) => equations.slice(k + 1).forEach(b => {
                assert.equal(seChevauchent(a, b), false,
                    `${nom} #${i} : deux chaînes se partagent une case`);
            }));

            // UNE SEULE SOLUTION — vérifié SANS PLAFOND, pour que le budget du
            // générateur ne puisse pas cacher une grille à deux réponses.
            assert.equal(compterSolutions(n, equations, 2, perms, Infinity), 1,
                `${nom} #${i} : la grille n'a pas exactement une solution`);

            // ET ELLE SE DÉDUIT SANS JAMAIS DEVINER. C'est la promesse qui
            // sépare cet Approxdoku de celui de Friedman, dont l'exemple
            // publié échoue à cette même mesure (voir plus haut).
            assert.ok(deduitSansDeviner(n, equations),
                `${nom} #${i} : cette grille ne se finit qu'en essayant`);

            // AUCUN INDICE N'EST DONNÉ : toutes les cases sont vides au départ,
            // ce sont les chaînes seules qui pincent la grille.
            assert.equal(item.meta.donnees, undefined,
                'l\'Approxdoku ne donne pas d\'indice — ce serait un autre jeu');
            assert.equal(item.answer, solution.map(l => l.join('')).join('|'));
        }
    });
}

test('LE PALIER DÉCOUVERTE NE POSE JAMAIS LA QUESTION DES PRIORITÉS', () => {
    // ─────────────────────────────────────────────────────────────────────
    // C'est sa raison d'être. Un élève de sixième qui n'a pas encore vu les
    // priorités opératoires doit pouvoir jouer : aucun côté du « ≈ » ne porte
    // deux opérations. Le jour où ce palier laisserait passer « 2+3×4 », il
    // enseignerait ce que le cours n'a pas encore dit.
    //
    // CE N'EST PAS `maxOpsParCote` QUI LE GARANTIT ICI, ET JE LE CROYAIS.
    // `epreuveTombe.mjs` a refusé de faire tomber cette épreuve quand on
    // dérégle cette borne — parce qu'à `longueurMax: 3`, une chaîne a au plus
    // deux opérateurs dont l'un est le « ≈ » : il n'en reste qu'un à répartir,
    // et aucun côté ne peut en porter deux. La borne est VRAIE mais INERTE à
    // ce palier ; c'est la LONGUEUR qui tient la promesse.
    //
    // L'épreuve se laisse donc abîmer là où ça compte : on allonge les chaînes.
    // (`maxOpsParCote` n'est réellement actif qu'au palier Difficile — voir le
    // commentaire de `PALIERS`.)
    // ─────────────────────────────────────────────────────────────────────
    assert.ok(PALIERS.decouverte.longueurMax <= 3,
        'au-delà de trois cases, un côté peut porter deux opérations');
    for (let i = 0; i < 8; i++) {
        const item = approxdokuGenerator.generate({ palier: 'decouverte' },
            { rng: makeRng(`dec-${i}`), index: i });
        item.meta.equations.forEach(eq => {
            const k = eq.ops.indexOf('≈');
            assert.ok(k <= 1, `${eq.ops.join(' ')} : deux opérations à gauche`);
            assert.ok(eq.ops.length - k - 1 <= 1, `${eq.ops.join(' ')} : deux opérations à droite`);
        });
    }
});

test('l\'exercice a de quoi remplir l\'onglet « Un exemple »', () => {
    // L'épreuve qui a rattrapé le `prompt.hint` du Strimko — une clef que rien
    // ne lit, donc un conseil qui n'arrive jamais sur l'écran.
    const item = approxdokuGenerator.generate({},
        { rng: makeRng('exemple'), index: 0 });
    assert.ok(item.hints.length >= 2, 'pas d\'indice à montrer');
    assert.ok(item.explanation && item.explanation.length > 20, 'pas d\'explication');
    assert.ok(item.prompt.text && item.prompt.text.length > 10);
});
