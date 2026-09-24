// LA RÉPONSE TAPÉE — un item ne peut pas dire deux choses contraires.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, devant les exercices de calcul littéral : « on ne peut jamais taper la
// réponse, c'est toujours un QCM quel dommage. »
//
// On a donc ouvert la route du clavier — et elle a révélé un défaut que le QCM
// masquait depuis le début. Au QCM, la bonne proposition est la bonne parce
// qu'elle est MARQUÉE bonne : aucune règle ne la relit. Dès que l'élève TAPE la
// même expression, elle passe devant le juge de l'item, et les deux verdicts
// peuvent diverger :
//
//   36x² − 16   la proposition « (6x − 4)(6x + 4) » était cochée juste,
//               la même expression tapée était REFUSÉE — et le juge avait
//               raison : les deux parenthèses gardent un 2.
//
// MESURÉ avant correctif, sur 1 500 questions par barreau : 624 au barreau 2,
// 715 au 3, 404 au 4, 466 au 5, 454 au 6, 413 au 7. Soit 41,6 % des questions
// du chapitre dont la réponse officielle était refusée par l'application
// elle-même.
//
// ── CE QUE CE FICHIER VÉRIFIE, ET POURQUOI C'EST EN DEUX TEMPS ───────────────
//
// 1. LA RÉPONSE S'ÉCRIT AVEC LES TOUCHES QU'ON DONNE. Le pavé de
//    `litteralSaisie` est construit d'après `item.meta` — la lettre, le degré
//    maximal, les parenthèses. Offrir un pavé où la réponse ne PEUT PAS
//    s'écrire serait pire que le QCM : l'élève tape ce qu'il sait et se le voit
//    refuser sans comprendre pourquoi.
//
// 2. LA RÉPONSE EST ACCEPTÉE PAR LE JUGE DE L'ITEM. C'est le point ci-dessus :
//    le même item, deux chemins, un seul verdict.
//
// Les deux se lisent ensemble : un signe manquant au pavé se voit comme une
// touche absente, pas comme un refus — et l'on saurait alors quoi corriger.
//
// ── LA LISTE DES TOUCHES EST RECOPIÉE ICI, ET C'EST VOULU ────────────────────
//
// `litteralSaisie.js` construit son pavé dans le DOM ; l'importer demanderait
// un document. On redit donc la règle, et un test la compare au fichier source
// pour qu'elles ne puissent pas diverger en silence.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeRng } from '../js/core/ids.js';
import { factorisationGenerator } from '../js/core/generators/factorisation.js';
import { developpementGenerator } from '../js/core/generators/developpement.js';

/** Les touches que `litteralSaisie` posera pour cet item. */
function touchesDe(item) {
    const m = item.meta || {};
    const t = [m.lettre || 'x', '²'];
    if ((m.degreMax || 2) >= 3) t.push('³');
    t.push('+', '−');
    if (m.parentheses) t.push('(', ')');
    return t.concat('0123456789'.split(''));
}

/** Les signes de `texte` qu'aucune touche ne sait écrire. */
function signesManquants(texte, touches) {
    // Les touches longues d'abord : `x²` doit se reconnaître avant `x`.
    const par = [...touches].sort((a, b) => b.length - a.length);
    let reste = String(texte).replace(/\s+/g, '');
    const manque = new Set();
    while (reste) {
        const k = par.find(x => reste.startsWith(x));
        if (k) { reste = reste.slice(k.length); continue; }
        manque.add(reste[0]);
        reste = reste.slice(1);
    }
    return [...manque];
}

const CHAPITRES = [
    ['factorisation', factorisationGenerator,
        ['1', '2', '3', '4', '5', '6', '7', 'revision']],
    ['développement', developpementGenerator,
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', 'simple', 'double']]
];

for (const [nom, gen, barreaux] of CHAPITRES) {
    test(`${nom} : la réponse s'écrit avec les touches du pavé`, () => {
        for (const barreau of barreaux) {
            for (let i = 0; i < 300; i++) {
                const it = gen.generate({ barreau }, { rng: makeRng(`t_${barreau}_${i}`) });
                // `answer` est une sentinelle de QCM ('ok') : ce qui s'écrit,
                // c'est `reponsePapier`. Son absence est elle-même le défaut —
                // le champ affichait « ok » à l'élève qui séchait.
                assert.ok(it.reponsePapier,
                    `${nom} barreau ${barreau} : pas de réponse en clair`);
                const manque = signesManquants(it.reponsePapier, touchesDe(it));
                assert.deepEqual(manque, [],
                    `${nom} barreau ${barreau} : « ${it.reponsePapier} » demande `
                    + `${manque.join(' ')}, que le pavé n'a pas`);
            }
        }
    });

    test(`${nom} : le juge de l'item accepte sa propre réponse`, () => {
        for (const barreau of barreaux) {
            for (let i = 0; i < 300; i++) {
                const it = gen.generate({ barreau }, { rng: makeRng(`j_${barreau}_${i}`) });
                assert.ok(it.verifieTexte,
                    `${nom} barreau ${barreau} : aucun juge, la saisie ne peut pas être lue`);
                // Le pavé n'écrit pas d'espace : on soumet exactement ce qu'il
                // produit, pas une version plus lisible que l'élève ne peut pas
                // taper.
                const v = it.verifieTexte(it.reponsePapier.replace(/\s+/g, ''));
                assert.ok(v && v.juste,
                    `${nom} barreau ${barreau} : ${it.prompt.papier} — sa propre réponse `
                    + `« ${it.reponsePapier} » est refusée : ${(v && v.pourquoi) || '?'}`);
            }
        }
    });
}

test('le pavé décrit ici est bien celui que litteralSaisie construit', () => {
    const src = readFileSync(new URL('../js/core/activities/litteralSaisie.js',
        import.meta.url), 'utf8');
    // On ne relit pas tout le fichier : on vérifie que les quatre décisions
    // qui font la liste des touches sont toujours celles-ci. Si l'une change,
    // ce test tombe et `touchesDe` doit être remis d'accord.
    for (const marque of [
        "{ t: lettre,",                     // la lettre
        "{ t: '²',",                        // le carré, toujours
        "{ t: '³',",                        // le cube, sous condition
        "degreMax >= 3",                    // …et sa condition
        "m.parentheses ? [",                // les parenthèses, sous condition
        "'01234'.split('')",                // les chiffres, première rangée
        "'56789'.split('')"                 // …et la seconde
    ]) {
        assert.ok(src.includes(marque),
            `litteralSaisie.js ne contient plus « ${marque} » : la liste des `
            + 'touches a changé, `touchesDe` doit changer avec elle');
    }
});

// ── LES EXERCICES DE LA FEUILLE DOIVENT RESTER TIRABLES ─────────────────────
//
// CE TEST EXISTE PARCE QUE JE LES AVAIS FAIT DISPARAÎTRE.
//
// En corrigeant les réponses inachevées, j'avais contraint les tirages partout
// pour qu'aucun facteur commun ne subsiste. La mesure disait « 0 refus sur
// 12 000 » et elle était exacte — sur ce qu'elle mesurait. Ce qu'elle ne
// mesurait pas, c'est ce qui n'était plus tiré :
//
//   A(x) = (6 − 5x)² − 1           PLUS TIRABLE
//   D(x) = (3x − 2)² − (x + 4)²    PLUS TIRABLE
//
// Deux des quatre exercices de la feuille que Rémy a photographiée, ceux-là
// mêmes dont il a dit « je veux que ce soit hyper progressif pour arriver à
// cela en photo ». Les deux portent un facteur commun, et c'est justement ce
// qui en fait les exercices de FIN de feuille. Les interdire pour que le
// corrigé soit simple, c'est retirer l'exercice.
//
// UNE MESURE QUI NE REGARDE QUE CE QU'ON A CORRIGÉ NE VOIT PAS CE QU'ON A
// CASSÉ. Ce test regarde l'autre côté.

test('les exercices de la feuille de Rémy restent tirables, et finis', () => {
    const CIBLES = [
        ['(6 − 5x)² − 1', '5(1 − x)(7 − 5x)', ['3', 'revision']],
        ['(3x − 2)² − (x + 4)²', '4(x − 3)(2x + 1)', ['4', 'revision']]
    ];
    for (const [enonce, attendue, barreaux] of CIBLES) {
        let trouve = null;
        for (const barreau of barreaux) {
            for (let i = 0; i < 6000 && !trouve; i++) {
                const it = factorisationGenerator.generate({ barreau },
                    { rng: makeRng(`feuille_${barreau}_${i}`) });
                if (it.prompt.papier === `Factoriser : ${enonce}`) trouve = it;
            }
            if (trouve) break;
        }
        assert.ok(trouve, `« ${enonce} » n'est plus tirable : un tirage contraint `
            + 'a retiré un exercice de la feuille');
        assert.equal(trouve.reponsePapier, attendue,
            `« ${enonce} » : la réponse doit aller jusqu'au bout`);
        const v = trouve.verifieTexte(attendue.replace(/\s+/g, ''));
        assert.ok(v && v.juste, `« ${enonce} » : sa propre réponse est refusée`);
    }
});

// ── ET CHAQUE LIGNE DE LA CHAÎNE SE TAPE AUSSI ──────────────────────────────
//
// CE TEST EXISTE PARCE QUE JE N'AVAIS VÉRIFIÉ QUE LA DERNIÈRE LIGNE.
//
// Les deux tests ci-dessus regardent `reponsePapier` — la réponse finale — et
// ils passaient. Mais le pas à pas demande QUATRE lignes avant elle, et la
// première du barreau 3 est « on écrit les deux carrés » : (3 − 4x)² − 1². Ce
// carré-là porte sur une parenthèse et sur un nombre, et le pavé n'avait
// qu'une touche « x² », qui ne savait élever que la lettre.
//
// Résultat mesuré au banc navigateur : « touche manquante : ² ». La PREMIÈRE
// ligne de l'exercice était intapable, et aucun test ne le disait — parce
// qu'aucun test ne regardait ailleurs que la fin.
//
// UNE VÉRIFICATION QUI NE COUVRE QU'UNE PARTIE DU CHEMIN NE COUVRE PAS LE
// CHEMIN.

test('factorisation pas à pas : chaque ligne s\'écrit avec les touches du pavé', () => {
    for (const barreau of ['1', '2', '3', '4', '5', '6', '7']) {
        for (let i = 0; i < 200; i++) {
            const it = factorisationGenerator.generate({ barreau, etapes: 'oui' },
                { rng: makeRng(`pav_${barreau}_${i}`) });
            const touches = touchesDe(it);
            for (const e of it.meta.etapes) {
                const manque = signesManquants(e.montrer, touches);
                assert.deepEqual(manque, [],
                    `barreau ${barreau} — « ${e.titre} » : « ${e.montrer} » demande `
                    + `${manque.join(' ')}, que le pavé n'a pas`);
                // Et le membre de gauche d'un calcul de côté se LIT, il ne se
                // tape pas — mais il doit quand même s'afficher.
                if (e.apart) assert.ok(e.gauche, `barreau ${barreau} : calcul de côté sans gauche`);
            }
        }
    }
});

test('factorisation pas à pas : chaque ligne est acceptée par son juge', () => {
    for (const barreau of ['1', '2', '3', '4', '5', '6', '7']) {
        for (let i = 0; i < 200; i++) {
            const it = factorisationGenerator.generate({ barreau, etapes: 'oui' },
                { rng: makeRng(`jug_${barreau}_${i}`) });
            for (const e of it.meta.etapes) {
                const v = e.verifie(e.montrer.replace(/\s+/g, ''));
                assert.ok(v && v.juste,
                    `barreau ${barreau} — « ${e.titre} » : sa propre ligne `
                    + `« ${e.montrer} » est refusée : ${(v && v.pourquoi) || '?'}`);
            }
        }
    }
});

// ── AUCUN QCM NE SE TRANCHE SUR UN SEUL COEFFICIENT ─────────────────────────
//
// RÉMY : « tes solutions en QCM sont évidentes. On trouve tout de suite ce qui
// ne va pas. »
//
// Il avait raison, et la mesure l'a dit plus précisément que lui :
//
//   · développement, barreaux 1 à 4 : le TERME CONSTANT à lui seul tranchait
//     98 à 100 % des questions. Un chapitre qui enseigne « le facteur
//     multiplie CHAQUE terme » laissait répondre en n'en multipliant qu'un ;
//   · développement, barreau 5 : le TERME EN x, à 100 % ;
//   · factorisation, barreau 1 : la VALEUR EN x = 0 — le seul produit des
//     constantes —, à 100 %. Barreau 7 : 82 %.
//
// UN QCM SE TRANCHE SUR LE CALCUL ENTIER, OU IL N'ENSEIGNE PAS CE CALCUL. Il
// faut donc qu'au moins un leurre s'accorde avec la réponse sur chaque
// vérification courte : si l'on ne peut pas éliminer sur la constante seule,
// il faut aller voir le reste.

import { developpementGenerator as DG } from '../js/core/generators/developpement.js';
import * as PP from '../js/core/maths/polynome.js';
import * as fx from '../js/core/maths/formule.js';

/** Combien de propositions résistent à la vérification du coefficient `deg`. */
function survivants(item, deg) {
    const bon = PP.lireSaisie(item.choices.find(c => c.correct).texte, fx);
    const attendu = PP.coefficients(bon)[deg] || 0;
    return item.choices.filter(c => {
        const p = PP.lireSaisie(c.texte, fx);
        if (!p) return true;
        return (PP.coefficients(p)[deg] || 0) === attendu;
    }).length;
}

test('développement : ni la constante ni le terme en x ne tranchent seuls', () => {
    for (const barreau of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11',
        'simple', 'double']) {
        for (let i = 0; i < 150; i++) {
            const it = DG.generate({ barreau }, { rng: makeRng(`ev_${barreau}_${i}`) });
            assert.equal(it.choices.length, 4,
                `barreau ${barreau} : ${it.choices.length} propositions`);
            for (const deg of [0, 1]) {
                assert.ok(survivants(it, deg) >= 2,
                    `barreau ${barreau} : ${it.prompt.papier} — le coefficient de degré `
                    + `${deg} suffit à trouver la réponse sans faire le reste du calcul`);
            }
        }
    }
});

test('factorisation : le produit des constantes ne tranche pas seul', () => {
    for (const barreau of ['1', '2', '3', '4', '5', '6', '7', 'revision']) {
        for (let i = 0; i < 150; i++) {
            const it = factorisationGenerator.generate({ barreau },
                { rng: makeRng(`ef_${barreau}_${i}`) });
            assert.equal(it.choices.length, 4,
                `barreau ${barreau} : ${it.choices.length} propositions`);
            const bon = PP.lireSaisie(it.choices.find(c => c.correct).texte, fx);
            const k0 = PP.evaluer(bon, { x: 0 });
            const restent = it.choices.filter(c => {
                const p = PP.lireSaisie(c.texte, fx);
                return !p || PP.evaluer(p, { x: 0 }) === k0;
            }).length;
            assert.ok(restent >= 2,
                `barreau ${barreau} : ${it.prompt.papier} — la valeur en x = 0 suffit `
                + 'à trouver la réponse sans jamais développer');
        }
    }
});
