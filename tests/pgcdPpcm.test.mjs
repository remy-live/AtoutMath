// DÉCOMPOSER, PGCD ET PPCM — l'arithmétique de troisième.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « J'aimerai bien des exercices pour décomposer un nombre et pgcd et
// ppcm niveau 3ème. Des exercices d'application direct et des petits
// problèmes ».
//
// CE QUE CES ÉPREUVES GARDENT :
//
//   1. LES NOMBRES JUSTES. Un exercice d'arithmétique dont une réponse est
//      fausse est pire qu'un exercice absent : l'élève qui a juste est compté
//      faux, et il n'a aucun moyen de le savoir.
//   2. DES COUPLES QUI VALENT LA PEINE. Deux nombres pris au hasard sont
//      premiers entre eux six fois sur dix — PGCD égal à 1, PPCM égal au
//      produit, et le problème des bouquets devient « un bouquet par fleur ».
//   3. LE SENS DE LA RÉPONSE. Un PGCD est plus PETIT que ses deux nombres, un
//      PPCM plus GRAND. C'est la seule vérification qu'un élève de troisième
//      puisse faire seul, et c'est elle qui lui dit qu'il s'est trompé de
//      notion. Si les énoncés eux-mêmes ne la respectaient pas, on lui
//      apprendrait le contraire.
//   4. DES ÉNONCÉS QUI SE LISENT. Mesuré en lisant ce que le générateur
//      produit : « en utilisant toutes ses stylos », « des trousses TOUS
//      IDENTIQUES », « ils sont ensemble de la gare ». Un énoncé mal accordé
//      fait trébucher la lecture au moment précis où l'on demande de lire avec
//      attention.
//   5. UN PETIT BAIN, ET AU DÉBUT. Rémy, une heure après la livraison : « le
//      décomposer pgcd et ppcm est bien trop difficile ! ». C'est la promesse
//      la plus facile à casser de tout le fichier, parce qu'elle ne tient à
//      aucun calcul : il suffit de réordonner `ETAPES`, ou d'ajouter une
//      marche au mauvais endroit, pour qu'un parcours court rejoue les
//      questions de fin de chapitre — sans qu'une seule réponse devienne
//      fausse. Elle est donc gardée par un parcours ENTIER, pas par une
//      lecture de la liste.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import {
    pgcd, ppcm, estPremier, diviseurs, facteursPremiers, facteursGroupes,
    ecrireDecomposition, ecrireAPlat, irreductible, premiersEntreEux,
    pgcdExplique, ppcmExplique, enExposant
} from '../js/core/arithmetique.js';
import { exercices } from '../js/data/catalog.js';
import {
    pgcdPpcmGenerator as G, ETAPES, COUPLES, COUPLES_FACILES, COUPLES_RYTHME,
    COUPLES_A_LISTER, COUPLES_A_MULTIPLIER, COUPLES_EXPOSANT,
    A_DECOMPOSER, A_DECOMPOSER_PETIT, A_ESCALADER, A_DIVISER, A_TESTER,
    PREMIERS_SOUS_30, COMPOSES_SOUS_30
} from '../js/core/generators/pgcdPpcm.js';

// ────────────────────────────────────────── LE NOYAU ────────────────────────

test('LE PGCD ET LE PPCM SONT JUSTES, Y COMPRIS AUX BORDS', () => {
    assert.equal(pgcd(84, 120), 12);
    assert.equal(pgcd(13, 13), 13);
    assert.equal(ppcm(12, 18), 36);
    assert.equal(ppcm(7, 13), 91);
    // PGCD(0 ; 0) N'EXISTE PAS. Rendre 0 ferait diviser par zéro chez
    // l'appelant — `irreductible` le fait, par exemple. Un diviseur commun qui
    // vaut 1 est toujours vrai et ne casse rien en aval.
    assert.equal(pgcd(0, 0), 1);
    assert.equal(ppcm(0, 5), 0);
    // ET LA RELATION QUI LES LIE, sur cent couples : a × b = PGCD × PPCM.
    // C'est la vérification croisée — les deux fonctions ne peuvent pas se
    // tromper ensemble sans qu'elle le dise.
    for (let a = 1; a <= 60; a++) {
        for (let b = 1; b <= 60; b++) {
            assert.equal(pgcd(a, b) * ppcm(a, b), a * b, `${a} et ${b}`);
        }
    }
});

test('LA PRIMALITÉ VA JUSQU\'À LA RACINE — 91 est le piège du chapitre', () => {
    // Qui essaie 2, 3 et 5 et s'arrête là déclare 91 premier. Il faut aller
    // jusqu'à 9, et 7 × 13 tombe en route.
    assert.equal(estPremier(91), false);
    assert.equal(estPremier(97), true);
    assert.equal(estPremier(1), false, '1 n\'est pas premier');
    assert.equal(estPremier(2), true);
    assert.equal(estPremier(0), false);
    // Les premiers jusqu'à 100, comptés : il y en a 25. Un crible qui en
    // trouve 26 a laissé passer 1 ; 24, il a perdu 2.
    const combien = Array.from({ length: 101 }, (_, n) => n).filter(estPremier).length;
    assert.equal(combien, 25, `${combien} premiers jusqu'à 100`);
});

test('LA DÉCOMPOSITION REDONNE LE NOMBRE, TOUJOURS', () => {
    // LA SEULE VÉRIFICATION QUI COMPTE : le produit des facteurs vaut le
    // nombre, et chaque facteur est premier. Comparer à une liste écrite à la
    // main ne garderait que les nombres qu'on y aurait pensés.
    for (let n = 2; n <= 400; n++) {
        const f = facteursPremiers(n);
        assert.equal(f.reduce((p, x) => p * x, 1), n, `${n} mal décomposé`);
        assert.ok(f.every(estPremier), `${n} garde un facteur non premier`);
        // Et dans l'ordre croissant : on descend l'escalier des divisions.
        assert.deepEqual(f, [...f].sort((a, b) => a - b), `${n} est dans le désordre`);
    }
    assert.deepEqual(facteursPremiers(1), [], '1 n\'a aucun facteur premier');
    assert.deepEqual(facteursGroupes(360), [{ p: 2, e: 3 }, { p: 3, e: 2 }, { p: 5, e: 1 }]);
    assert.equal(ecrireDecomposition(360), '2³ × 3² × 5');
    assert.equal(ecrireAPlat(360), '2 × 2 × 2 × 3 × 3 × 5');
    assert.equal(ecrireDecomposition(7), '7', 'un premier s\'écrit tout seul');
});

test('LES DEUX RÈGLES DES EXPOSANTS SE LISENT, ET ELLES SONT JUSTES', () => {
    // Le PGCD garde les facteurs COMMUNS au plus PETIT exposant, le PPCM garde
    // TOUS les facteurs au plus GRAND. Un élève qui ne retient que les
    // communs calcule un PGCD en croyant faire un PPCM : la moitié qu'on
    // oublie est celle du PPCM.
    const lire = (ecrit) => ecrit.split(' × ').reduce((p, m) => {
        const [b, e] = m.split(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/).length > 1
            ? [m.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, ''), '²³⁴⁵⁶⁷⁸⁹'.indexOf(m.slice(-1)) + 2]
            : [m, 1];
        return p * Math.pow(Number(b), e);
    }, 1);
    for (const [a, b] of COUPLES) {
        assert.equal(lire(pgcdExplique(a, b).ecrit), pgcd(a, b), `PGCD ${a} ${b}`);
        assert.equal(lire(ppcmExplique(a, b).ecrit), ppcm(a, b), `PPCM ${a} ${b}`);
    }
    // SANS FACTEUR COMMUN, LA RÉPONSE EST « 1 » — et non une chaîne vide, qui
    // laisserait l'écran dire « PGCD = ».
    assert.equal(pgcdExplique(8, 9).ecrit, '1');
});

test('« PREMIERS ENTRE EUX » NE VEUT PAS DIRE « PREMIERS »', () => {
    // C'est la confusion du chapitre, et elle a sa marche. 8 et 9 sont
    // premiers entre eux, et aucun des deux n'est premier.
    assert.ok(premiersEntreEux(8, 9));
    assert.ok(!estPremier(8) && !estPremier(9));
    assert.ok(!premiersEntreEux(84, 120));
    assert.deepEqual(irreductible(84, 120), [7, 10]);
    assert.ok(premiersEntreEux(...irreductible(84, 120)),
        'une fraction irréductible a un numérateur et un dénominateur premiers entre eux');
});

// ──────────────────────────────────── CE QUE L'EXERCICE DONNE ───────────────

test('CHAQUE COUPLE VAUT LA PEINE D\'ÊTRE DÉCOMPOSÉ', () => {
    // DEUX NOMBRES AU HASARD SONT PREMIERS ENTRE EUX SIX FOIS SUR DIX : le
    // PGCD vaut 1, le PPCM vaut le produit, et l'élève apprend qu'on ne
    // décompose jamais pour rien. Pire, un PGCD de 1 rend le problème des
    // bouquets absurde — « un bouquet par fleur ».
    assert.ok(COUPLES.length >= 15, `${COUPLES.length} couples seulement`);
    for (const [a, b] of COUPLES) {
        assert.ok(pgcd(a, b) > 1, `${a} et ${b} sont premiers entre eux : PGCD = 1`);
        assert.ok(ppcm(a, b) < a * b, `PPCM(${a} ; ${b}) vaut le produit : rien à chercher`);
        assert.ok(a !== b, `${a} et ${b} sont le même nombre`);
    }
    // LES COUPLES DES PROBLÈMES SONT PLUS PETITS. Rémy : « bien trop
    // difficile ». Un problème empile trois difficultés — lire, CHOISIR la
    // notion, calculer — et sur 78 et 117 la troisième mange les deux autres :
    // il faut voir que 39 = 3 × 13 avant de pouvoir se demander si l'on
    // partage ou si l'on attend.
    assert.ok(COUPLES_FACILES.length >= 12, `${COUPLES_FACILES.length} couples faciles`);
    for (const [a, b] of COUPLES_FACILES) {
        assert.ok(pgcd(a, b) > 1, `${a} et ${b} sont premiers entre eux`);
        assert.ok(Math.max(a, b) <= 48, `${a} et ${b} : trop gros pour un problème`);
    }
    // ET LES RYTHMES SE FILTRENT SUR LA RÉPONSE, PAS SUR LES NOMBRES. Mesuré en
    // lisant : « Le car bleu part toutes les 132 minutes » — deux heures douze.
    // La première correction filtrait les NOMBRES de l'énoncé, ce qui n'était
    // pas le bon critère : ce qui doit rester crédible, c'est le TEMPS
    // D'ATTENTE, donc le PPCM. Deux phares de 36 et 48 secondes sont
    // plausibles ; se retrouver au bout de 144 secondes l'est beaucoup moins.
    assert.ok(COUPLES_RYTHME.length >= 10, `${COUPLES_RYTHME.length} rythmes`);
    for (const [a, b] of COUPLES_RYTHME) {
        assert.ok(ppcm(a, b) <= 90, `${a} et ${b} : ${ppcm(a, b)} minutes d'attente`);
    }
    // ET LES TROIS PROBLÈMES Y PUISENT VRAIMENT. L'épreuve ne gardait d'abord
    // que la LISTE : remplacer le nom de la liste par `COUPLES` dans la
    // question la laissait verte, et le car repartait toutes les 132 minutes.
    // `epreuveTombe` l'a dit — une épreuve verte qui ne garde rien donne une
    // assurance qui n'existe pas.
    for (let k = 0; k < 30; k++) {
        for (const marche of ['paquets', 'ensemble', 'carre']) {
            const it = G.generate({ marches: [marche] },
                { rng: makeRng(`${marche}-${k}`), index: k, total: 30 });
            assert.ok(Math.max(...it.meta.nombres) <= 48,
                `${marche} : ${it.meta.nombres} — « ${it.prompt.text} »`);
            if (marche === 'ensemble') {
                assert.ok(Number(it.answer) <= 90,
                    `une attente de ${it.answer} : « ${it.prompt.text} »`);
            }
        }
    }
    // LES LISTES DU PETIT BAIN DISENT CHACUNE LA VÉRITÉ.
    for (const n of A_DECOMPOSER_PETIT) {
        assert.ok(n < 100, `${n} n'est pas un petit nombre`);
        assert.ok(facteursGroupes(n).length >= 2,
            `${n} n'a qu'un seul facteur premier : la décomposition ne montre rien`);
    }
    // LE PLUS PETIT PREMIER DE L'ESCALIER EST DANS LES QUATRE PROPOSÉS, sans
    // quoi la question n'a aucune bonne réponse parmi ses boutons.
    for (const n of A_ESCALADER) {
        assert.ok([2, 3, 5, 7].includes(facteursPremiers(n)[0]),
            `${n} commence par ${facteursPremiers(n)[0]}, qui n'est pas proposé`);
    }
    // CHACUN DES QUATRE CRITÈRES EST LE BON POUR TROIS NOMBRES AU MOINS : si la
    // liste n'avait que des nombres pairs, la marche s'apprendrait par cœur.
    for (const p of [2, 3, 5, 7]) {
        const combien = A_ESCALADER.filter(n => facteursPremiers(n)[0] === p).length;
        assert.ok(combien >= 3, `seulement ${combien} nombre(s) commencent par ${p}`);
    }
    // HUIT DIVISEURS AU PLUS : la liste est écrite EN ENTIER dans l'énoncé, et
    // celle de 60 en compte douze — une ligne et demie de chiffres avant
    // d'arriver à la question.
    for (const n of A_DIVISER) {
        const d = diviseurs(n);
        assert.ok(d.length <= 8, `${n} a ${d.length} diviseurs : l'énoncé devient illisible`);
        assert.ok(d.length >= 4, `${n} n'a que ${d.length} diviseurs : rien à cacher`);
        assert.ok(d.filter(x => x > 2 && x <= 12).length >= 1,
            `${n} : aucun diviseur entre 3 et 12, la bonne réponse serait toujours 2`);
        let dehors = 0;
        for (let x = 2; x <= 12; x++) if (n % x) dehors++;
        assert.ok(dehors >= 3, `${n} : pas assez de leurres pour quatre boutons`);
    }
    for (const [a, b] of COUPLES_A_LISTER) {
        assert.ok(pgcd(a, b) > 1, `${a} et ${b} : PGCD de 1, rien à lire`);
        assert.ok(diviseurs(a).length <= 8 && diviseurs(b).length <= 8,
            `${a} et ${b} : deux listes de diviseurs trop longues`);
    }
    for (const [a, b] of COUPLES_A_MULTIPLIER) {
        assert.ok(pgcd(a, b) > 1, `${a} et ${b} : le PPCM vaut le produit`);
        assert.ok(ppcm(a, b) / Math.min(a, b) <= 8,
            `${a} et ${b} : il faut écrire ${ppcm(a, b) / Math.min(a, b)} multiples avant le PPCM`);
    }
    // ET CHAQUE COUPLE DE LA RÈGLE DES EXPOSANTS EN MONTRE UNE. Sans un nombre
    // premier présent DES DEUX CÔTÉS avec deux exposants DIFFÉRENTS, « le plus
    // petit » et « le plus grand » désignent la même chose et la question ne
    // veut rien dire. 90 = 2 × 3² × 5 et 126 = 2 × 3² × 7 sont dans ce cas, et
    // ce couple a été retiré pour cela.
    for (const [a, b] of COUPLES_EXPOSANT) {
        const ga = facteursGroupes(a), gb = facteursGroupes(b);
        const differents = ga.filter(x => {
            const y = gb.find(z => z.p === x.p);
            return y && y.e !== x.e;
        });
        assert.ok(differents.length >= 1,
            `${a} et ${b} : aucun facteur commun à deux exposants différents`);
    }
    // LES PETITS NOMBRES DE PRIMALITÉ SONT SOUS TRENTE, ET LES DEUX RÉPONSES Y
    // SONT. « 91 est-il premier ? » en question d'ouverture était exactement
    // ce que Rémy a signalé.
    for (const n of PREMIERS_SOUS_30) {
        assert.ok(n < 30 && estPremier(n), `${n} : la table se trompe`);
    }
    for (const n of COMPOSES_SOUS_30) {
        assert.ok(n < 30 && !estPremier(n), `${n} : la table se trompe`);
        assert.notEqual(n, 1, '1 n\'a pas sa place dans la marche qui ouvre la progression');
    }
    // ET LES NOMBRES À DÉCOMPOSER NE SONT JAMAIS PREMIERS : « décompose 97 »
    // n'est pas une question, c'est un malentendu.
    for (const n of A_DECOMPOSER) {
        assert.ok(!estPremier(n), `${n} est premier : il n'y a rien à décomposer`);
        assert.ok(facteursGroupes(n).length >= 2,
            `${n} n'a qu'un seul facteur premier : la règle des exposants ne se voit pas`);
    }
    // LA LISTE DES NOMBRES À TESTER DIT LA VÉRITÉ. Une erreur ici compterait
    // faux un élève qui a raison, sur la question même du piège.
    for (const { n, premier } of A_TESTER) {
        assert.equal(estPremier(n), premier, `${n} : la table se trompe`);
    }
    assert.ok(A_TESTER.some(x => x.premier) && A_TESTER.some(x => !x.premier),
        'tous les nombres à tester donnent la même réponse');
});

test('TOUTES LES MARCHES RÉPONDENT JUSTE — vérifié contre un calcul indépendant', () => {
    // ON NE RELIT PAS LA RÉPONSE DU GÉNÉRATEUR : on recalcule depuis l'énoncé,
    // comme le ferait un élève. Relire ce qu'il a écrit ne garde rien.
    for (const e of ETAPES) {
        for (let k = 0; k < 40; k++) {
            const it = G.generate({ marches: [e.id] },
                { rng: makeRng(`${e.id}-${k}`), index: k, total: 40 });
            const texte = it.prompt.text;
            assert.ok(texte && texte.length > 10, `${e.id} : énoncé vide`);
            assert.ok(it.answer !== undefined && it.answer !== null && it.answer !== '',
                `${e.id} : pas de réponse`);
            assert.equal(it.meta.marche, e.id);

            if (e.id === 'premier') {
                const n = Number(texte.match(/^(\d+)/)[1]);
                assert.equal(it.answer, estPremier(n) ? 'oui' : 'non', `${n}`);
            }
            if (e.id === 'recomposer') {
                assert.equal(ecrireDecomposition(Number(it.answer)),
                    texte.match(/s'écrit (.+?)\. Quel/)[1], 'la décomposition ne redonne pas le nombre');
            }
            if (e.id === 'decomposer') {
                // L'ÉCRITURE À REMPLIR PORTE LE SQUELETTE : on la relit, on
                // remet les exposants donnés en réponse, et le produit doit
                // valoir le nombre de départ. C'est bien ce que l'élève a sous
                // les yeux — la question, elle, ne dit plus que « complète ».
                const ecriture = it.prompt.html.match(/pp-ecriture">([^<]*(?:<[^>]*>[^<]*)*)<\/span>/);
                assert.ok(ecriture, 'l\'écriture à remplir a disparu de l\'énoncé');
                const n = Number(it.prompt.html.match(/pp-ecriture">(\d+) =/)[1]);
                const bases = [...it.prompt.html.matchAll(/(\d+)<sup>/g)].map(m => Number(m[1]));
                const exposants = String(it.answer).split('|').map(Number);
                assert.equal(bases.length, exposants.length, `${n} : autant d'exposants que de bases`);
                assert.equal(bases.reduce((p, b, i) => p * Math.pow(b, exposants[i]), 1), n, `${n}`);
            }
            if (e.id === 'pgcd' || e.id === 'ppcm') {
                const [, a, b] = texte.match(/de (\d+) et (\d+) \?/).map(Number);
                assert.equal(Number(it.answer),
                    e.id === 'pgcd' ? pgcd(a, b) : ppcm(a, b), `${e.id} ${a} ${b}`);
            }
            if (e.id === 'entre-eux') {
                const [, a, b] = texte.match(/^(\d+) et (\d+)/).map(Number);
                assert.equal(it.answer, premiersEntreEux(a, b) ? 'oui' : 'non', `${a} ${b}`);
            }
            if (e.id === 'irreductible') {
                const [, a, b] = texte.match(/fraction (\d+)\/(\d+)/).map(Number);
                assert.equal(it.answer, irreductible(a, b).join('|'), `${a}/${b}`);
            }

            // ── LES MARCHES DU PETIT BAIN ─────────────────────────────────

            if (e.id === 'divisible') {
                const [, n, d] = texte.match(/^(\d+) est-il divisible par (\d+) \?/).map(Number);
                assert.equal(it.answer, n % d === 0 ? 'oui' : 'non', `${n} par ${d}`);
                assert.ok([2, 3, 5, 10].includes(d),
                    `critère de divisibilité par ${d} : il n'est pas au programme`);
            }
            if (e.id === 'qui-divise') {
                const n = Number(texte.match(/divise (\d+) \?/)[1]);
                assert.equal(it.choices.length, 4, `${n} : ${it.choices.length} boutons`);
                // UNE SEULE BONNE RÉPONSE PARMI LES QUATRE, et ce n'est pas
                // acquis : les leurres sont tirés dans 2…12, où se trouvent
                // aussi la plupart des diviseurs.
                const bons = it.choices.filter(c => n % Number(c.value) === 0);
                assert.equal(bons.length, 1,
                    `${n} : ${bons.length} boutons divisent le nombre`);
                assert.equal(bons[0].correct, true, `${n} : le diviseur n'est pas marqué juste`);
            }
            if (e.id === 'liste-diviseurs') {
                const n = Number(texte.match(/diviseurs de (\d+)/)[1]);
                const lus = texte.match(/sont : ([^.]+)\./)[1].split(', ');
                const remis = lus.map(v => (v === '?' ? String(it.answer) : v)).map(Number);
                assert.deepEqual(remis, diviseurs(n),
                    `${n} : la liste remplie n'est pas celle de ses diviseurs`);
                // NI 1 NI LUI-MÊME : tout nombre a ces deux-là, et l'élève le
                // sait avant d'avoir lu la liste.
                assert.notEqual(Number(it.answer), 1, `${n} : on a caché 1`);
                assert.notEqual(Number(it.answer), n, `${n} : on a caché le nombre lui-même`);
            }
            if (e.id === 'premier-petit') {
                const n = Number(texte.match(/^(\d+)/)[1]);
                assert.ok(n < 30, `${n} : ce n'est plus « sous trente »`);
                assert.equal(it.answer, estPremier(n) ? 'oui' : 'non', `${n}`);
            }
            if (e.id === 'par-quoi') {
                const n = Number(texte.match(/divise (\d+) \?/)[1]);
                assert.equal(Number(it.answer), facteursPremiers(n)[0], `${n}`);
                assert.equal(it.choices.length, 4, `${n}`);
                // « LE PLUS PETIT » N'EST PAS UNE TOURNURE : C'EST CE QUI REND
                // LA QUESTION POSSIBLE. 2, 3 et 7 divisent tous les trois 84 ;
                // sans ces trois mots, trois boutons sur quatre sont
                // mathématiquement justes, et l'élève est compté faux en ayant
                // raison.
                //
                // LA GARDE PORTE DONC SUR LES MOTS, et c'est délibéré : retirer
                // « le plus petit » ne rend AUCUNE réponse fausse — le
                // générateur continue de répondre le plus petit facteur, et
                // toutes les épreuves de justesse restent vertes. Le premier
                // essai comptait les boutons marqués justes, ce qui ne gardait
                // rien du tout : `finalizeChoices` n'en marque jamais qu'un.
                const justes = it.choices.filter(c => n % Number(c.value) === 0).length;
                if (justes > 1) {
                    assert.match(texte, /plus petit/,
                        `${n} : ${justes} des quatre nombres proposés le divisent, `
                        + 'et la question ne dit pas lequel on attend');
                }
            }
            if (e.id === 'le-quotient') {
                const [, n, d] = texte.match(/Combien vaut (\d+) ÷ (\d+) \?/).map(Number);
                assert.ok(Number.isInteger(n / d), `${n} ÷ ${d} ne tombe pas juste`);
                assert.equal(Number(it.answer), n / d, `${n} ÷ ${d}`);
                assert.equal(d, facteursPremiers(n)[0],
                    `${n} : on divise par ${d} et non par son plus petit facteur premier`);
            }
            if (e.id === 'decomposer-petit') {
                const n = Number(it.prompt.html.match(/pp-ecriture">(\d+) =/)[1]);
                assert.ok(n < 100, `${n} : ce n'est pas un « petit nombre »`);
            }
            if (e.id === 'pgcd-liste' || e.id === 'ppcm-liste') {
                const [, a, b] = texte.match(/de (\d+) et (\d+) \?/).map(Number);
                const attendu = e.id === 'pgcd-liste' ? pgcd(a, b) : ppcm(a, b);
                assert.equal(Number(it.answer), attendu, `${e.id} ${a} ${b}`);
                // ET LA RÉPONSE EST ÉCRITE DANS LES DEUX LISTES DE L'ÉNONCÉ.
                // C'est TOUTE la promesse de ces deux marches : on y trouve le
                // PGCD et le PPCM en LISANT, sans rien décomposer — elles
                // viennent avant la technique, pas après. Un énoncé qui
                // s'arrêterait trop tôt rendrait la question infaisable par le
                // seul moyen que l'élève possède à ce moment-là.
                const dedans = new RegExp(`(^|[^0-9])${attendu}([^0-9]|$)`);
                assert.ok(dedans.test(texte),
                    `${e.id} : ${attendu} n'apparaît pas dans les listes — « ${texte} »`);
                // ET LES DEUX LISTES RESTENT LISIBLES. Celles de 84 et 120
                // comptent douze et seize termes : deux lignes de chiffres
                // avant d'arriver à la question, sur la marche même qui existe
                // pour être facile.
                (texte.match(/\d+(?:, \d+){2,}/g) || []).forEach(bout => {
                    const combien = bout.split(',').length;
                    assert.ok(combien <= 9,
                        `${e.id} : une liste de ${combien} termes — « ${texte} »`);
                });
            }
            if (e.id === 'exposant') {
                const [, a, b] = texte.match(/^(\d+) = .+ et (\d+) =/).map(Number);
                const p = Number(texte.match(/nombre premier (\d+) \?/)[1]);
                const ea = facteursGroupes(a).find(x => x.p === p).e;
                const eb = facteursGroupes(b).find(x => x.p === p).e;
                assert.notEqual(ea, eb,
                    `${a} et ${b} sur ${p} : les deux exposants sont égaux, la question est vide`);
                const pourPgcd = /le PGCD/.test(texte);
                const garde = pourPgcd ? Math.min(ea, eb) : Math.max(ea, eb);
                const ecrit = garde === 1 ? String(p) : `${p}${enExposant(garde)}`;
                assert.equal(it.answer, ecrit,
                    `${a} et ${b} : le ${pourPgcd ? 'PGCD' : 'PPCM'} garde ${ecrit}`);
            }
        }
    }
});

test('LE SENS DE LA RÉPONSE EST RESPECTÉ — c\'est la seule vérification qu\'un élève peut faire', () => {
    // Un PGCD est plus PETIT que ses deux nombres, un PPCM plus GRAND. C'est
    // ce qui dit à l'élève qu'il s'est trompé de notion, et c'est écrit dans
    // les deux indices. Si un énoncé ne le respectait pas, on lui apprendrait
    // le contraire.
    const PETIT = { paquets: true, pgcd: true, irreductible: true, 'pgcd-liste': true };
    const GRAND = { ensemble: true, carre: true, ppcm: true, 'ppcm-liste': true };
    for (const e of ETAPES) {
        if (!PETIT[e.id] && !GRAND[e.id]) continue;
        for (let k = 0; k < 30; k++) {
            const it = G.generate({ marches: [e.id] },
                { rng: makeRng(`sens-${e.id}-${k}`), index: k, total: 30 });
            // LES DEUX NOMBRES DE LA QUESTION VIENNENT DE `meta`, et non
            // d'une expression régulière sur l'énoncé : celui d'un PGCD porte
            // AUSSI les facteurs des deux décompositions, et les relire au
            // passage rendait « 2 » pour le plus petit nombre de l'énoncé.
            // Toute vérification de bon sens s'effondrait alors.
            const nombres = it.meta.nombres;
            assert.ok(Array.isArray(nombres) && nombres.length === 2,
                `${e.id} : les deux nombres ne voyagent pas dans meta`);
            const rep = Number(String(it.answer).split('|')[0]);
            if (PETIT[e.id]) {
                assert.ok(rep <= Math.min(...nombres.filter(n => n > 1)),
                    `${e.id} : réponse ${rep} plus grande que l'énoncé ${nombres}`);
            } else {
                assert.ok(rep >= Math.max(...nombres),
                    `${e.id} : réponse ${rep} plus petite que l'énoncé ${nombres}`);
            }
        }
    }
});

test('LES ÉNONCÉS SE LISENT — accords compris', () => {
    // MESURÉ en lisant ce que le générateur produisait : « en utilisant toutes
    // ses stylos », « des trousses TOUS IDENTIQUES », « ils sont ensemble de
    // la gare ». Trois fautes dans trois énoncés sur dix.
    // ET LE POINT MÉDIAN EST BANNI. Sur une feuille de MATHÉMATIQUES, « · »
    // est un signe de multiplication : « 110 = 2 × 5 × 11 · 132 » se lit
    // « 11 × 132 ». Vu sur le PDF imprimé, jamais à l'écran — où les deux
    // décompositions vivent dans des blocs séparés.
    const FAUTES = [
        / · /,
        // L'ÉNONCÉ FINIT PAR UN POINT, sans quoi le papier colle la question
        // derrière : « … = 2⁴ × 3 Quel est le PGCD ».
        /[0-9⁰¹²³⁴⁵⁶⁷⁸⁹] Quel est/,
        /toutes ses (stylos|cahiers|bonbons|chocolats)/,
        /tous ses (roses|tulipes|billes)/,
        /trousses TOUS IDENTIQUES/,
        /(bouquets|sachets) TOUTES IDENTIQUES/,
        /carreaux [^.]*toutes posées/,
        /(dalles|briques) [^.]*tous posés/,
        /carreaux [^.]*aucune\./,
        /ensemble de la gare/,
        /undefined|NaN|\[object/
    ];
    for (const e of ETAPES) {
        for (let k = 0; k < 40; k++) {
            const it = G.generate({ marches: [e.id] },
                { rng: makeRng(`mots-${e.id}-${k}`), index: k, total: 40 });
            const tout = `${it.prompt.text} ${it.explanation} ${(it.hints || []).join(' ')}`;
            FAUTES.forEach(re => assert.ok(!re.test(tout),
                `${e.id} : « ${(tout.match(re) || [''])[0]} » dans « ${it.prompt.text} »`));
        }
    }
});

test('LES TROIS COMPÉTENCES SONT DISTINGUÉES — c\'est le diagnostic utile', () => {
    // Un élève qui calcule très bien les deux et qui, devant un problème,
    // prend le PGCD là où il fallait le PPCM a zéro. Son bilan doit le DIRE,
    // sinon le professeur relit « n'a pas acquis le PGCD » pour quelqu'un qui
    // le calcule parfaitement.
    const vues = new Set();
    for (const e of ETAPES) {
        const it = G.generate({ marches: [e.id] }, { rng: makeRng('sk-' + e.id), index: 0, total: 1 });
        vues.add(it.skillId);
    }
    assert.deepEqual([...vues].sort(),
        ['num.arith.decomposition', 'num.arith.pgcd', 'num.arith.ppcm']);
    assert.deepEqual([...G.skills].sort(),
        ['num.arith.decomposition', 'num.arith.pgcd', 'num.arith.ppcm']);
});

test('LES PROBLÈMES SONT MÉLANGÉS, ET LES DEUX NOTIONS Y SONT', () => {
    // Ranger les problèmes de PGCD ensemble puis ceux de PPCM ensemble
    // apprendrait à lire le titre du paragraphe, pas l'énoncé. Le temps C
    // porte donc les deux, et une fiche qui tire dedans doit voir les deux.
    const tempsC = ETAPES.filter(e => e.temps === 'D');
    assert.ok(tempsC.length >= 3, `${tempsC.length} problèmes seulement`);
    const skills = new Set(tempsC.map(e => e.skill));
    assert.ok(skills.has('num.arith.pgcd') && skills.has('num.arith.ppcm'),
        'les problèmes ne travaillent qu\'une des deux notions');
    // ET UNE SÉRIE TIRÉE DANS LE TEMPS C LES DONNE BIEN TOUTES LES DEUX.
    const marches = tempsC.map(e => e.id);
    const vus = new Set();
    for (let k = 0; k < 12; k++) {
        vus.add(G.generate({ marches }, { rng: makeRng('mix' + k), index: k, total: 12 }).skillId);
    }
    assert.equal(vus.size, 2, `une série de douze ne montre qu'une notion : ${[...vus]}`);
});

test('LA MARCHE QUI OUVRE L\'ESCALIER TIRE DANS SA PROPRE LISTE', () => {
    // RÉMY : « Quel est le plus petit nombre premier qui divise 91 ? <- c'est
    // pas facile. Quel est le plus petit nombre premier qui divise 198 ?
    // idem. »
    //
    // Elle tirait dans `A_ESCALADER`, la liste de la marche « décomposer » —
    // celle du HAUT de l'escalier —, où l'on trouve 49, 77, 91 et 119, dont le
    // plus petit facteur est 7 ou 11. Or son aide dit « on essaie dans
    // l'ordre : 2, puis 3, puis 5, puis 7 » : elle décrit un RÉFLEXE, et on la
    // faisait travailler sur les nombres qui mettent ce réflexe en défaut.
    //
    // LA LEÇON « QUAND 2, 3 ET 5 ÉCHOUENT, IL FAUT ESSAYER 7 » N'EST PAS
    // PERDUE : c'est exactement ce que travaille la marche « ce nombre est-il
    // premier ? », deux crans plus loin — et l'épreuve le vérifie aussi, sans
    // quoi on aurait seulement déplacé le trou.
    const vus = new Set();
    for (let k = 0; k < 200; k++) {
        const t = G.generate({ marches: ['par-quoi'] },
            { rng: makeRng('ouvre' + k), index: k, total: 200 }).prompt.text;
        const n = Number(t.match(/divise (\d+)/)[1]);
        assert.ok(n < 100, `${n} a trois chiffres à la première marche de l'escalier`);
        const p = facteursPremiers(n)[0];
        assert.ok([2, 3, 5].includes(p),
            `${n} : son plus petit facteur est ${p}, hors des trois critères appris`);
        vus.add(p);
    }
    // LES TROIS CRITÈRES SERVENT, et pas seulement celui de 2 : une marche qui
    // ne tirerait que des nombres pairs n'apprendrait qu'à regarder le dernier
    // chiffre.
    assert.deepEqual([...vus].sort(), [2, 3, 5]);

    // ET LES NOMBRES DURS SONT AILLEURS, pas disparus.
    const durs = new Set();
    for (let k = 0; k < 120; k++) {
        const t = G.generate({ marches: ['premier'] },
            { rng: makeRng('dur' + k), index: k, total: 120 }).prompt.text;
        const n = Number(t.match(/(\d+) est-il/)[1]);
        if (![2, 3, 5].includes(facteursPremiers(n)[0])) durs.add(n);
    }
    assert.ok(durs.size > 0,
        'plus aucun nombre ne résiste aux critères de 2, 3 et 5 : la leçon a disparu');
});

test('UNE RÉPONSE À PLUSIEURS NOMBRES DÉCLARE SES CASES', () => {
    // LE DÉFAUT QUE CECI GARDE, ET QUI NE DISAIT RIEN. Une réponse « 3|4 » ne
    // fabrique PAS deux champs toute seule : le pavé compte les `[data-trou]`
    // que l'ÉNONCÉ déclare, et n'en allume plusieurs que s'il en trouve plus
    // d'un (`aTrous`, dans core/activities/numeric.js). Sans eux, l'élève n'a
    // qu'un seul écran et devrait y taper « 3|4 » — ce que le pavé ne permet
    // même pas. Rien ne plante, rien ne prévient : la question est simplement
    // impossible. Mesuré en ouvrant l'exercice, pas en relisant le code.
    for (const e of ETAPES) {
        for (let k = 0; k < 20; k++) {
            const it = G.generate({ marches: [e.id] },
                { rng: makeRng(`trous-${e.id}-${k}`), index: k, total: 20 });
            const morceaux = String(it.answer).split('|').length;
            const trous = (it.prompt.html.match(/data-trou=/g) || []).length;
            if (morceaux > 1) {
                assert.equal(trous, morceaux,
                    `${e.id} : ${morceaux} nombres à donner et ${trous} case(s) dans l'énoncé`);
                assert.equal(it.meta.cases, morceaux, `${e.id} : meta.cases`);
            } else {
                assert.equal(trous, 0, `${e.id} : des cases pour une réponse unique`);
            }
        }
    }
});

test('LE PAVÉ N\'OFFRE PAS DE VIRGULE — toutes les réponses sont entières', () => {
    // Une touche qui n'a aucun sens sur une question est une invitation à la
    // faute : l'élève qui la voit se demande ce qu'il a raté.
    for (const e of ETAPES) {
        const it = G.generate({ marches: [e.id] }, { rng: makeRng('dec-' + e.id), index: 0, total: 1 });
        assert.equal(it.meta.decimal, false, e.id);
        // UNE QUESTION FERMÉE N'A PAS DE PAVÉ DU TOUT, donc pas de virgule à
        // offrir : la règle ne la concerne pas. Elle était écrite « sauf oui et
        // non », ce qui était la même chose tant que toute question fermée du
        // fichier était un oui-non — la marche « quel exposant garde-t-on ? »
        // répond « 2³ », et la marche « lequel divise 24 ? » répond par un
        // bouton. On dit donc ce qu'on voulait dire.
        // `continue`, ET NON `return` : écrit `return`, il sortait du test
        // ENTIER à la première marche — qui est une question fermée. L'épreuve
        // restait verte sans avoir rien vérifié du tout.
        if (it.answerKind === 'choice') continue;
        String(it.answer).split('|').forEach(v => {
            assert.ok(Number.isInteger(Number(v)), `${e.id} : réponse non entière « ${v} »`);
        });
    }
});

test('IL Y A UN PETIT BAIN, ET UN PARCOURS COURT N\'EN SORT PAS', () => {
    // ─────────────────────────────────────────────────────────────────────────
    //
    // RÉMY, une heure après la livraison de la première version : « le
    // décomposer pgcd et ppcm est bien trop difficile ! »
    //
    // C'EST LA PROMESSE LA PLUS FACILE À CASSER DE TOUT LE FICHIER, parce
    // qu'elle ne tient à aucun calcul. Déplacer une marche dans `ETAPES`,
    // ajouter la nouvelle à la fin de la liste par commodité, ou réordonner les
    // marches du catalogue : aucune réponse ne devient fausse, aucune épreuve
    // de justesse ne bouge, et un parcours de dix questions rejoue « 91 est-il
    // premier ? » et PPCM(91 ; 143) = 1001.
    //
    // ON LA GARDE DONC PAR UN PARCOURS ENTIER, et non par une lecture de la
    // liste : c'est le chemin de l'élève, et c'est le seul endroit où la
    // promesse existe.
    // ON LIT LA LISTE DU CATALOGUE, et non une copie écrite ici. C'est elle
    // que l'élève joue : une liste recopiée dans l'épreuve garderait l'ordre de
    // l'épreuve, pas celui de l'exercice, et remettre les sept marches d'avant
    // dans `js/data/numeration.js` la laisserait verte.
    const exo = exercices.find(e => e.id === 'num-pgcd-ppcm');
    assert.ok(exo, 'l\'exercice technique a disparu du catalogue');
    const technique = exo.params.marches;
    assert.ok(technique.length >= 15,
        `${technique.length} marches seulement dans l'exercice : l'escalier a été raccourci`);

    const joue = (total) => Array.from({ length: total }, (_, k) =>
        G.generate({ marches: technique }, { rng: makeRng('bain' + k), index: k, total }));

    // DIX QUESTIONS NE SORTENT PAS DES DEUX PREMIERS TEMPS. C'est la longueur
    // d'un exercice ordinaire, et c'est là que la plainte s'est formée.
    const dix = joue(10);
    for (const it of dix) {
        assert.ok(it.meta.temps === 'A' || it.meta.temps === 'B',
            `une question du temps ${it.meta.temps} dans un parcours de dix : ${it.meta.marche}`);
    }
    // ET LA PREMIÈRE QUESTION EST DU TEMPS A, toujours.
    assert.equal(dix[0].meta.temps, 'A', `le parcours ouvre sur « ${dix[0].prompt.text} »`);

    // LES QUATRE PREMIÈRES MARCHES NE PARLENT NI DE DÉCOMPOSITION, NI DE PGCD,
    // NI DE PPCM — on y répond par les tables de multiplication, et rien
    // d'autre. Un énoncé qui les citerait renverrait l'élève à une leçon qu'il
    // n'a pas encore eue.
    const MOTS_D_APRES = /décompos|facteur premier|PGCD|PPCM|exposant|irréductible/i;
    for (const marche of ['divisible', 'qui-divise', 'liste-diviseurs', 'premier-petit']) {
        for (let k = 0; k < 30; k++) {
            const it = G.generate({ marches: [marche] },
                { rng: makeRng(`bain-${marche}-${k}`), index: k, total: 30 });
            const vu = `${it.prompt.text} ${(it.hints || []).join(' ')}`.match(MOTS_D_APRES);
            assert.ok(!vu, `${marche} parle de « ${vu && vu[0]} » : « ${it.prompt.text} »`);
            // ET LES NOMBRES Y RESTENT PETITS : au-delà de cent trente, la
            // table de multiplication ne suffit plus.
            const nombres = (it.prompt.text.match(/\d+/g) || []).map(Number);
            assert.ok(Math.max(...nombres) <= 130,
                `${marche} : ${Math.max(...nombres)} — « ${it.prompt.text} »`);
        }
    }

    // ET LE TEMPS A EST BIEN EN TÊTE DE LA LISTE DU GÉNÉRATEUR, dans l'ordre
    // des temps. `decoupeMarches` partage les questions DANS CET ORDRE : c'est
    // lui, et lui seul, qui fait que dix questions tombent sur le petit bain.
    const temps = ETAPES.map(e => e.temps);
    assert.deepEqual([...temps].sort(), temps,
        `les temps ne se suivent pas dans ETAPES : ${temps.join('')}`);
    assert.equal(temps[0], 'A');
    assert.ok(temps.filter(t => t === 'A').length >= 4,
        'moins de quatre marches dans le petit bain');
});

test('CHAQUE BOUTON PORTE SON PROPRE NOM', () => {
    // LE DÉFAUT QUE CECI GARDE. Les libellés étaient écrits en dur — « Oui »
    // si la valeur vaut « oui », « Non » dans tous les autres cas — du temps où
    // toute question fermée de ce fichier était un oui-non. « Lequel de ces
    // nombres divise 24 ? » en propose quatre : trois boutons sur quatre
    // auraient affiché « Non », et le quatrième aussi.
    //
    // `count: 2` était écrit en dur de la même façon : la question à quatre
    // boutons n'en aurait montré que deux.
    for (const marche of ['qui-divise', 'par-quoi']) {
        for (let k = 0; k < 20; k++) {
            const it = G.generate({ marches: [marche] },
                { rng: makeRng(`btn-${marche}-${k}`), index: k, total: 20 });
            assert.equal(it.choices.length, 4, `${marche} : ${it.choices.length} boutons`);
            const noms = it.choices.map(c => String(c.label));
            assert.equal(new Set(noms).size, 4, `${marche} : des boutons homonymes — ${noms}`);
            noms.forEach(nom => assert.ok(/^\d+$/.test(nom),
                `${marche} : le bouton « ${nom} » ne porte pas sa valeur`));
        }
    }
    // ET LE OUI-NON GARDE SA CAPITALE : « oui » en valeur, « Oui » à l'écran.
    const oui = G.generate({ marches: ['divisible'] },
        { rng: makeRng('btn-oui'), index: 0, total: 1 });
    assert.deepEqual(oui.choices.map(c => c.label).sort(), ['Non', 'Oui']);
});

test('LA MARCHE DES EXPOSANTS COMPTE SUR LA BONNE DES DEUX COMPÉTENCES', () => {
    // Elle fait lire tantôt la règle du PGCD — le plus PETIT exposant, parce
    // qu'il doit diviser les deux —, tantôt celle du PPCM — le plus GRAND,
    // parce qu'il doit en être multiple. Ce sont deux compétences du bilan, et
    // la marche n'en déclare qu'une dans `ETAPES` : sans la faculté de choisir
    // la sienne question par question, la moitié de ses réponses seraient
    // comptées sur l'autre.
    const vus = new Map();
    for (let k = 0; k < 40; k++) {
        const it = G.generate({ marches: ['exposant'] },
            { rng: makeRng('exp' + k), index: k, total: 40 });
        const quoi = /le PGCD/.test(it.prompt.text) ? 'num.arith.pgcd' : 'num.arith.ppcm';
        assert.equal(it.skillId, quoi, `« ${it.prompt.text} » comptée sur ${it.skillId}`);
        vus.set(quoi, (vus.get(quoi) || 0) + 1);
    }
    assert.equal(vus.size, 2, `une série de quarante ne montre qu'une règle : ${[...vus.keys()]}`);
});

test('LES PROBLÈMES SONT VRAIMENT MÊLÉS SUR LA FEUILLE, PAS SEULEMENT DANS LA CONSIGNE', () => {
    // ─────────────────────────────────────────────────────────────────────────
    //
    // L'EXERCICE PROMET : « ils sont MÉLANGÉS exprès : savoir calculer les deux
    // ne sert à rien si l'on ne sait pas lequel l'énoncé demande ». C'était
    // faux, et ça ne se voyait que sur le PDF.
    //
    // `decoupeMarches` partage les questions DANS L'ORDRE de la progression —
    // c'est ce que Rémy a demandé, et c'est juste pour une progression. Mais
    // les trois problèmes n'en sont pas une : une feuille de vingt questions
    // donnait six « paquets » à la file, puis sept « rythmes », puis sept
    // « carrés ». Après deux énoncés de paquets, le troisième se reconnaît sans
    // être lu, et c'est exactement ce que l'exercice existe pour empêcher.
    const exo = exercices.find(e => e.id === 'num-pgcd-ppcm-problemes');
    assert.ok(exo, 'l\'exercice des problèmes a disparu du catalogue');

    const suite = Array.from({ length: 20 }, (_, k) =>
        G.generate(exo.params, { rng: makeRng('mele' + k), index: k, total: 20 }));

    // LES TROIS SITUATIONS APPARAISSENT, et les deux notions avec elles.
    const situations = new Set(suite.map(it => {
        if (/puisse faire \?$/.test(it.prompt.text)) return 'paquets';
        if (/carré/.test(it.prompt.text)) return 'carre';
        return 'ensemble';
    }));
    assert.equal(situations.size, 3, `une série de vingt ne montre que ${[...situations]}`);
    assert.equal(new Set(suite.map(it => it.skillId)).size, 2,
        'une série de vingt problèmes ne travaille qu\'une des deux notions');

    // ET ELLES NE SE SUIVENT PAS PAR BLOCS. Le partage par marches donnerait au
    // plus trois changements de situation sur vingt questions ; un vrai mélange
    // en donne beaucoup plus. Six est bas exprès : on garde le mélange, pas une
    // suite particulière du tirage.
    let changements = 0;
    const type = (it) => (/puisse faire \?$/.test(it.prompt.text) ? 'p'
        : /carré/.test(it.prompt.text) ? 'c' : 'e');
    for (let k = 1; k < suite.length; k++) {
        if (type(suite[k]) !== type(suite[k - 1])) changements++;
    }
    assert.ok(changements >= 6,
        `${changements} changements de situation sur vingt : les problèmes sont par blocs`);
});
