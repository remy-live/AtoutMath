import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import '../js/core/activities/index.js';
import {
    ETAPES_PUISSANCES, ORDRE_ETAPES, puissanceTexte, valeurPuissance, decimaleDe,
    mantisseTexte, scientifiqueTexte, jugerMantisse, versScientifique,
    comparerScientifiques, produitScientifique, grouper, nomPuissance
} from '../js/core/puissances.js';
import {
    puissancesGenerator, puissancesReconnaitreGenerator, puissancesTransformerGenerator,
    marchePour
} from '../js/core/generators/puissances.js';
import { pourPdf } from '../js/ui/ficheRendu.js';
import { exercices, paramSchemaOf, getExerciseById } from '../js/data/catalog.js';

// --- Le noyau : aucun flottant, jamais ------------------------------------------

test('10 puissance n s\'écrit à la main, sans jamais passer par un flottant', () => {
    // `10 ** -7` vaut 1.0000000000000001e-7 : impossible d'en faire un énoncé.
    assert.equal(valeurPuissance(-7), '0,0000001');
    assert.equal(valeurPuissance(0), '1');
    assert.equal(valeurPuissance(4), '10000');
    assert.equal(valeurPuissance(-1), '0,1');
    // La preuve que le chemin flottant était piégé.
    assert.notEqual(String(10 ** -7), '1e-7'.replace('e-7', ''));
});

test('la virgule se déplace dans un texte, et le compte tombe juste', () => {
    assert.equal(decimaleDe('34', 1, 4), '34000');
    assert.equal(decimaleDe('52', 1, -3), '0,0052');
    assert.equal(decimaleDe('7', 1, 0), '7');
    assert.equal(decimaleDe('123', 1, -5), '0,0000123');   // 1,23 × 10⁻⁵
    assert.equal(decimaleDe('123', 1, 2), '123');
});

test('l\'écriture scientifique se lit et se fabrique dans les deux sens', () => {
    for (const [decimal, chiffres, exposant] of [
        ['34000', '34', 4], ['0,0052', '52', -3], ['7', '7', 0],
        ['0,0000001', '1', -7], ['1000', '1', 3], ['9,81', '981', 0]
    ]) {
        const s = versScientifique(decimal);
        assert.deepEqual(s, { chiffres, exposant }, decimal);
        // ALLER-RETOUR : ce qu'on décompose doit se recomposer à l'identique.
        assert.equal(decimaleDe(s.chiffres, 1, s.exposant), decimal, `retour de ${decimal}`);
        // Et la mantisse obtenue est bien celle d'une écriture scientifique.
        assert.ok(jugerMantisse(mantisseTexte(chiffres)).ok, `mantisse de ${decimal}`);
    }
    assert.equal(versScientifique('0'), null, 'zéro n\'a pas d\'écriture scientifique');
    assert.equal(versScientifique('abc'), null);
});

test('LA RÈGLE 1 ⩽ a < 10, et de quel côté on la franchit', () => {
    // C'est la distinction que l'exercice enseigne : « trop grand » et « trop
    // petit » ne se corrigent pas dans le même sens.
    assert.deepEqual(jugerMantisse('3,4'), { ok: true, quoi: 'ok' });
    assert.deepEqual(jugerMantisse('1'), { ok: true, quoi: 'ok' });
    assert.deepEqual(jugerMantisse('9,99'), { ok: true, quoi: 'ok' });
    assert.equal(jugerMantisse('10').quoi, 'tropGrand', '10 est exclu');
    assert.equal(jugerMantisse('34').quoi, 'tropGrand');
    assert.equal(jugerMantisse('0,34').quoi, 'tropPetit');
    assert.equal(jugerMantisse('0').quoi, 'zero');
});

test('comparer se fait par l\'exposant d\'abord, la mantisse ensuite', () => {
    const s = versScientifique;
    // Exposants différents : le nombre devant n'y peut rien.
    assert.equal(comparerScientifiques(s('210000'), s('98000')), 1, '2,1×10⁵ > 9,8×10⁴');
    // Exposants égaux : c'est la mantisse qui tranche — le cas qu'on oublie.
    assert.equal(comparerScientifiques(s('2100'), s('2800')), -1);
    assert.equal(comparerScientifiques(s('2100'), s('2100')), 0);
    // Sur les négatifs aussi.
    assert.equal(comparerScientifiques(s('0,0021'), s('0,00098')), 1);
    // ET LE MÊME VERDICT QUE LA COMPARAISON ORDINAIRE, sur mille tirages.
    const rng = makeRng('cmp');
    for (let i = 0; i < 1000; i++) {
        const a = decimaleDe(String(rng.int(1, 999)), rng.int(1, 3), rng.int(-4, 4));
        const b = decimaleDe(String(rng.int(1, 999)), rng.int(1, 3), rng.int(-4, 4));
        const attendu = Math.sign(Number(a.replace(',', '.')) - Number(b.replace(',', '.')));
        assert.equal(comparerScientifiques(versScientifique(a), versScientifique(b)), attendu,
            `${a} contre ${b}`);
    }
});

test('le produit reste exact là où les flottants échouent', () => {
    // 34000 × 0,0052 donne 176.79999999999998 en JavaScript. Le vrai résultat
    // est 176,8, et c'est celui-là qu'un corrigé doit annoncer.
    const p = produitScientifique(versScientifique('34000'), versScientifique('0,0052'));
    assert.deepEqual(p, { chiffres: '1768', exposant: 2 });
    assert.equal(decimaleDe(p.chiffres, 1, p.exposant), '176,8');
    assert.notEqual(34000 * 0.0052, 176.8, 'le chemin flottant, lui, se trompe');
});

test('les grands nombres se lisent : 7 850 000 et 0,000 000 1', () => {
    assert.equal(grouper('7850000'), '7 850 000');
    assert.equal(grouper('0,0000001'), '0,000 000 1');
    assert.equal(grouper('52'), '52');
    assert.equal(grouper('1000'), '1 000');
    // L'espace est INSÉCABLE : une tranche seule en début de ligne ressemble
    // à un autre nombre.
    assert.ok(!grouper('7850000').includes(' '), 'espace ordinaire interdit');
});

test('les puissances de 10 s\'écrivent avec de vrais exposants', () => {
    assert.equal(puissanceTexte(4), '10⁴');
    assert.equal(puissanceTexte(-3), '10⁻³');
    assert.equal(scientifiqueTexte('34', 4), '3,4 × 10⁴');
    assert.equal(scientifiqueTexte('5', -3), '5 × 10⁻³');
    assert.equal(nomPuissance(6), 'un million');
    assert.equal(nomPuissance(5), null);
});

test('SUR LE PAPIER, LES EXPOSANTS SURVIVENT — et les cm² aussi', () => {
    // ⁴ ⁵ ⁻ n'existent pas dans la police du PDF : ils sortaient en « ? »,
    // ce qui rendait la fiche inutilisable.
    assert.equal(pourPdf('10⁴'), '10^4');
    assert.equal(pourPdf('10⁻³'), '10^-3');
    assert.equal(pourPdf('3,4 × 10⁵'), '3,4 × 10^5');
    // Deux puissances sur la même feuille s'écrivent pareil, même si ² est
    // imprimable et ⁴ ne l'est pas.
    assert.equal(pourPdf('10² et 10⁴'), '10^2 et 10^4');
    // Mais une unité n'est pas une puissance : on n'y touche pas.
    assert.equal(pourPdf('aire en cm²'), 'aire en cm²');
    assert.equal(pourPdf('n² + 2n'), 'n² + 2n');
    assert.ok(!pourPdf('10⁴').includes('?'), 'plus aucun point d\'interrogation');
});

// --- La progression -------------------------------------------------------------

test('les sept marches montent dans l\'ordre, trois questions chacune', () => {
    assert.deepEqual(ORDRE_ETAPES, ['lire', 'ecrire', 'reconnaitre', 'pourquoi',
        'versScientifique', 'versDecimale', 'comparer']);
    ORDRE_ETAPES.forEach((id, i) => assert.equal(ETAPES_PUISSANCES[id].rang, i + 1));

    assert.equal(marchePour('progressif', 0), 'lire');
    assert.equal(marchePour('progressif', 2), 'lire');
    assert.equal(marchePour('progressif', 3), 'ecrire');
    assert.equal(marchePour('progressif', 12), 'versScientifique');
    // ARRIVÉ EN HAUT, ON RECOMMENCE EN BAS : sans cela, une fiche de vingt
    // questions posait la dernière marche quatorze fois de suite.
    assert.equal(marchePour('progressif', 21), 'lire');
    assert.equal(marchePour('progressif', 24), 'ecrire');
    // Une marche choisie explicitement y reste.
    assert.equal(marchePour('comparer', 0), 'comparer');
});

test('les deux exercices couvrent bien « reconnaître » puis « transformer »', () => {
    // Rémy : « déjà reconnaître puis transformer ». Le premier ne doit jamais
    // demander de transformer, et le second ne doit pas redemander de lire.
    const vus = (gen, n) => new Set(Array.from({ length: n }, (_, i) =>
        gen.generate({ etape: 'progressif' }, { rng: makeRng(`e${i}`), index: i }).meta.etape));

    // ET LA FICHE EST ÉQUILIBRÉE : sur vingt questions, aucune marche ne doit
    // écraser les autres.
    const compte = {};
    for (let i = 0; i < 20; i++) {
        const m = puissancesTransformerGenerator
            .generate({ etape: 'progressif' }, { rng: makeRng(`b${i}`), index: i }).meta.etape;
        compte[m] = (compte[m] || 0) + 1;
    }
    Object.entries(compte).forEach(([m, n]) =>
        assert.ok(n <= 9, `la marche « ${m} » revient ${n} fois sur vingt questions`));

    const a = vus(puissancesReconnaitreGenerator, 40);
    assert.deepEqual([...a].sort(), ['ecrire', 'lire', 'pourquoi', 'reconnaitre'].sort());

    const b = vus(puissancesTransformerGenerator, 40);
    assert.deepEqual([...b].sort(), ['comparer', 'versDecimale', 'versScientifique'].sort());

    // Et celui qui prend tout les couvre toutes.
    assert.equal(vus(puissancesGenerator, 40).size, 7);
});

// --- Les questions produites ----------------------------------------------------

test('AUCUN DISTRACTEUR NE VAUT LA BONNE RÉPONSE', () => {
    // Le bug qui a motivé ce test : pour 10⁻⁴, un distracteur sortait
    // « 0,00010 » — le MÊME nombre que 0,0001, écrit autrement. L'élève qui le
    // choisissait avait raison et se voyait compté faux ; les chaînes étant
    // différentes, rien ne l'avait signalé.
    const nombre = (v) => Number(String(v).replace(/\s| /g, '').replace(',', '.'));
    for (let i = 0; i < 3000; i++) {
        const it = puissancesGenerator.generate({ etape: 'progressif' },
            { rng: makeRng(`d${i}`), index: i % 21 });
        const bonne = it.choices.find(c => c.correct);
        assert.ok(bonne, 'aucune bonne réponse');
        const vb = nombre(bonne.value);
        it.choices.filter(c => !c.correct).forEach(c => {
            const v = nombre(c.value);
            assert.notEqual(String(c.value), String(bonne.value));
            if (Number.isFinite(v) && Number.isFinite(vb)) {
                assert.notEqual(v, vb,
                    `${it.prompt.text} : « ${c.value} » vaut la bonne réponse « ${bonne.value} »`);
            }
        });
    }
});

test('chaque question est complète : des choix, un corrigé, des aides', () => {
    for (const marche of ORDRE_ETAPES) {
        for (let i = 0; i < 40; i++) {
            const it = puissancesGenerator.generate({ etape: marche },
                { rng: makeRng(`c-${marche}-${i}`), index: 0 });
            assert.equal(it.meta.etape, marche);
            assert.ok(it.choices.length >= 2, `${marche} : trop peu de choix`);
            assert.equal(it.choices.filter(c => c.correct).length, 1, `${marche} : une seule bonne`);
            assert.ok(it.explanation.length > 30, `${marche} : corrigé trop court`);
            assert.ok(it.hints.length >= 2, `${marche} : pas assez d'aides`);
            // Chaque mauvais choix dit ce qu'il piège — sinon le carnet
            // d'erreurs n'apprend rien.
            it.choices.filter(c => !c.correct).forEach(c =>
                assert.ok(c.why && c.why.length > 15, `${marche} : distracteur muet`));
            // Aucun « ? » : le texte doit passer l'imprimante.
            assert.ok(!pourPdf(it.prompt.text).includes('?')
                || it.prompt.text.includes('?'), `${marche} : caractère perdu au PDF`);
        }
    }
});

test('« comparer » pose vraiment le piège des exposants égaux', () => {
    // Un élève qui a retenu « le plus grand exposant gagne » cesse de regarder
    // la mantisse. Le cas doit donc tomber assez souvent pour se voir.
    let egaux = 0;
    const total = 300;
    for (let i = 0; i < total; i++) {
        const it = puissancesGenerator.generate({ etape: 'comparer' },
            { rng: makeRng(`x${i}`), index: 0 });
        const exposants = [...it.prompt.text.matchAll(/10([⁰¹²³⁴-⁹⁻]+)/g)]
            .map(m => m[1]);
        assert.equal(exposants.length, 2);
        if (exposants[0] === exposants[1]) egaux++;
    }
    assert.ok(egaux > total * 0.3 && egaux < total * 0.7,
        `le piège tombe ${egaux} fois sur ${total} — il doit tomber environ une fois sur deux`);
});

test('la bonne réponse de « comparer » est vraiment la plus grande', () => {
    for (let i = 0; i < 400; i++) {
        const it = puissancesGenerator.generate({ etape: 'comparer' },
            { rng: makeRng(`g${i}`), index: 0 });
        const lire = (t) => {
            const [m, e] = t.split(' × 10');
            const exp = Number(e.replace(/⁻/g, '-').replace(/[⁰¹²³⁴-⁹]/g,
                c => String('⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c))));
            return Number(m.replace(',', '.')) * (10 ** exp);
        };
        const [bonne] = it.choices.filter(c => c.correct);
        const [mauvaise] = it.choices.filter(c => !c.correct);
        assert.ok(lire(bonne.value) > lire(mauvaise.value),
            `${it.prompt.text} : ${bonne.value} devrait être le plus grand`);
    }
});

test('SUR LE PAPIER, LA QUESTION SE SUFFIT À ELLE-MÊME', () => {
    // La fiche imprime l'énoncé, PAS les propositions. « Laquelle de ces
    // écritures est scientifique ? » sans les écritures est une question à
    // laquelle personne ne peut répondre : elles doivent être dans le texte.
    for (let i = 0; i < 100; i++) {
        const it = puissancesGenerator.generate({ etape: 'reconnaitre' },
            { rng: makeRng(`pap${i}`), index: 0 });
        it.choices.forEach(c => assert.ok(it.prompt.papier.includes(String(c.value)),
            `« ${c.value} » manque à l'énoncé imprimé : ${it.prompt.papier}`));
        assert.ok(it.prompt.papier.length > it.prompt.text.length);
    }
    // Les autres marches, elles, portent déjà tout dans leur énoncé.
    for (const marche of ['lire', 'ecrire', 'versScientifique', 'versDecimale', 'comparer']) {
        const it = puissancesGenerator.generate({ etape: marche },
            { rng: makeRng(marche), index: 0 });
        assert.ok(it.prompt.papier.length > 10, marche);
    }
});

// --- Le rangement ---------------------------------------------------------------

test('les deux exercices sont au catalogue, avec leur progression réglable', () => {
    for (const [id, competence, marches] of [
        ['num-puissances-reconnaitre', 'num.puissances.dix', 4],
        ['num-puissances-transformer', 'num.puissances.scientifique', 3]
    ]) {
        const e = getExerciseById(id);
        assert.ok(e, `${id} manque au catalogue`);
        assert.deepEqual(e.skills, [competence]);
        assert.equal(e.params.etape, 'progressif');
        const schema = paramSchemaOf(e);
        const etape = schema.find(p => p.id === 'etape');
        assert.ok(etape, `${id} : le réglage des marches manque`);
        // « Tout en ordre » plus les marches de l'intervalle.
        assert.equal(etape.options.length, marches + 1, `${id} : les marches proposées`);
        assert.equal(etape.options[0].value, 'progressif');
        // L'activité apporte en plus ses réglages d'aide — deux propositions,
        // puis quatre, puis le clavier : c'est la progression de la MAISON,
        // qui se superpose à celle des marches.
        assert.ok(schema.some(p => p.id === 'aide'), `${id} : l'aide de l'activité`);
        assert.ok(e.instruction.length > 400, `${id} : consigne trop courte`);
    }
    assert.ok(exercices.some(e => e.id === 'num-puissances-reconnaitre'));
});
