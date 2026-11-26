// L'ÉCRITURE SCIENTIFIQUE EN DEUX TEMPS — ce que l'exercice doit tenir.
//
// RÉMY, 26 novembre : « on a 134 × 10⁵, on met d'abord 134 sous forme
// scientifique en laissant le 10⁵, puis après on applique la règle des
// puissances pour avoir à la fin 1,34 × 10⁷ ». Puis, devant la fiche :
// « attention pour l'impression pour les exposants, à bien les mettre, et juste
// quelques pointillés en exposant », et « parfois tes exposants sont un peu
// décalés ».
//
// Ce fichier garde :
//   · LES QUESTIONS — chaque marche a ce qu'elle annonce, et la chaîne est
//     juste au dernier chiffre, sans virgule flottante ;
//   · LE DIAGNOSTIC — la faute de Rémy (garder 10⁵) est nommée sur la ligne 3,
//     un signe faux sur la ligne 2, une multiplication d'exposants aussi ;
//   · LA FEUILLE — l'exposant à trouver en pointillés EN HAUT, et une espace
//     insécable qui ne repousse plus l'exposant d'après.
//
// Le chemin de l'élève — un doigt sur un téléphone — est mesuré par
// `node tools/sondeDeuxTemps.mjs`, pas ici.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sansCommentaires } from './helpers.mjs';
import '../js/core/activities/index.js';
import { getActivity } from '../js/core/registry.js';
import { exercices, estNotable } from '../js/data/catalog.js';
import { CODES_EXERCICES } from '../js/data/codesExercices.js';
import { SKILLS } from '../js/data/skills.js';
import { makeRng } from '../js/core/ids.js';
import { decimaleDe, versScientifique, mantisseTexte, TROU_EN_EXPOSANT } from '../js/core/puissances.js';
import { texteImprime } from '../js/core/fiche.js';
import { pourPdf, morceauxLigne } from '../js/ui/ficheRendu.js';
import {
    MARCHES_DEUX_TEMPS, fabriquer, juger, reponseDe, saisieDe, chaineTexte, indices,
    normaliserMantisse, normaliserExposant
} from '../js/core/scientifiqueDeuxTemps.js';
import { puissancesDeuxTempsGenerator, marchePour } from '../js/core/generators/puissancesDeuxTemps.js';

const lire = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const MARCHES = MARCHES_DEUX_TEMPS.map((m) => m.id);
const REMY = { a: '134', n: 5, mantisse: '1,34', p: 2, final: 7, chiffres: '134' };
const plusPetitQueUn = (a) => /^0,/.test(a);

test('CHAQUE QUESTION EST JUSTE AU DERNIER CHIFFRE, ET A UN PREMIER TEMPS', () => {
    for (const m of MARCHES) {
        const rng = makeRng(`dt-${m}`);
        for (let i = 0; i < 200; i++) {
            const q = fabriquer(rng, m);
            // Le nombre de devant n'est jamais déjà entre 1 et 10 : sinon il n'y
            // aurait pas de premier temps.
            const sc = versScientifique(q.a);
            assert.notEqual(sc.exposant, 0, `${m} : ${q.a} est déjà entre 1 et 10`);
            // La chaîne se refait à partir des chiffres : a = mantisse × 10^p.
            assert.equal(mantisseTexte(sc.chiffres), q.mantisse, `${m} : ${q.a} → ${q.mantisse}`);
            assert.equal(sc.exposant, q.p, `${m} : ${q.a} = ${q.mantisse} × 10^${q.p} ?`);
            assert.equal(decimaleDe(q.chiffres, 1, q.p), q.a);
            assert.equal(q.final, q.p + q.n);
            // Aucune coïncidence qui ferait tomber juste une règle fausse.
            assert.notEqual(q.final, 0);
            assert.notEqual(q.p * q.n, q.final, `${m} : multiplier les exposants tomberait juste`);
            assert.notEqual(Math.abs(q.p), Math.abs(q.n), `${m} : deux exposants égaux rendent la faute indiscernable`);
            assert.ok(!/\./.test(q.a), 'un point décimal dans un énoncé');
        }
    }
});

test('CHAQUE MARCHE A CE QU\'ELLE ANNONCE', () => {
    const tirer = (m) => Array.from({ length: 60 }, (_, i) => fabriquer(makeRng(`m-${m}-${i}`), m));
    for (const q of tirer('entier')) {
        assert.ok(!q.a.includes(',') && q.p > 0 && q.n > 0, `entier : ${q.a} × 10^${q.n}`);
        assert.ok(q.chiffres.length <= 3, `entier : ${q.a} a trop de chiffres significatifs`);
    }
    for (const q of tirer('decimal')) assert.ok(q.a.includes(',') && q.p > 0 && q.n > 0, `décimal : ${q.a}`);
    for (const q of tirer('petit')) assert.ok(plusPetitQueUn(q.a) && q.p < 0 && q.n > 0, `petit : ${q.a}`);
    for (const q of tirer('negatif')) assert.ok(!plusPetitQueUn(q.a) && q.n < 0, `négatif : ${q.a} × 10^${q.n}`);
    for (const q of tirer('tout')) assert.ok(plusPetitQueUn(q.a) && q.n < 0, `tout : ${q.a} × 10^${q.n}`);
    // La première marche est l'exemple même de Rémy.
    assert.equal(chaineTexte(REMY), '134 × 10⁵ = 1,34 × 10² × 10⁵ = 1,34 × 10⁷');
});

test('LA FAUTE DE RÉMY — 1,34 × 10⁵ — EST NOMMÉE SUR LA LIGNE 3', () => {
    const v = juger(REMY, { mantisse: '1,34', p: '2', final: '5' });
    assert.equal(v.juste, false);
    assert.equal(v.ligne, 3);
    assert.match(v.pourquoi, /tu as gardé 10⁵/);
    assert.match(v.pourquoi, /2 \+ 5 = 7/);
    // Multiplier les exposants : c'est le signe × qu'on a sous les yeux.
    assert.match(juger(REMY, { mantisse: '1,34', p: '2', final: '10' }).pourquoi, /AJOUTE les exposants/);
    // Juste, quelle que soit la façon de taper.
    assert.equal(juger(REMY, { mantisse: '1,340', p: '2', final: '7' }).juste, true);
    assert.equal(saisieDe({ mantisse: '1,340', p: '+2', final: '7' }).split('|')[0], '1,34');
    assert.equal(saisieDe({ mantisse: '1,34', p: '2', final: '7' }), reponseDe(REMY));
});

test('LA LIGNE 2 : LE NOMBRE DEVANT, PUIS LE SIGNE DE L\'EXPOSANT', () => {
    assert.match(juger(REMY, { mantisse: '13,4', p: '1', final: '6' }).pourquoi, /^Ligne 2 : 13,4 n'est pas entre 1 et 10/);
    assert.match(juger(REMY, { mantisse: '1,43', p: '2', final: '7' }).pourquoi, /les chiffres de 134 ne changent pas/);
    assert.match(juger(REMY, { mantisse: '1,34', p: '-2', final: '3' }).pourquoi, /134 est plus GRAND que 1/);
    assert.match(juger(REMY, { mantisse: '1,34', p: '3', final: '8' }).pourquoi, /2 rangs/);
    const petit = { a: '0,045', n: 6, mantisse: '4,5', p: -2, final: 4, chiffres: '45' };
    const v = juger(petit, { mantisse: '4,5', p: '2', final: '8' });
    assert.equal(v.ligne, 2);
    assert.match(v.pourquoi, /0,045 est plus PETIT que 1/);
    // Les signes moins s'écrivent avec le vrai signe dans les phrases.
    assert.match(indices(petit)[2], /−2 \+ 6 = 4/);
    assert.equal(normaliserExposant('−2'), '-2');
    assert.equal(normaliserMantisse('04,50'), '4,5');
});

test('LES QUESTIONS MONTENT LES MARCHES DANS L\'ORDRE', () => {
    const vues = Array.from({ length: 15 }, (_, i) => marchePour({}, i, 15));
    assert.deepEqual([...new Set(vues)], MARCHES, 'les marches ne se suivent pas dans l\'ordre');
    const item = puissancesDeuxTempsGenerator.generate({}, { rng: makeRng('it'), index: 0, total: 10 });
    assert.equal(item.answerKind, 'text');
    assert.equal(item.ecritureExacte, true, 'la réponse est une écriture, pas un nombre');
    assert.ok(item.meta.deuxTemps, 'l\'activité ne reçoit pas la question');
    assert.equal(item.answer, reponseDe(item.meta.deuxTemps));
    assert.equal(item.hints.length, 3);
    assert.equal(item.explanation, chaineTexte(item.meta.deuxTemps));
});

test('SUR LA FEUILLE, L\'EXPOSANT À TROUVER EST EN POINTILLÉS EN HAUT', () => {
    // Rémy : « juste quelques pointillés en exposant ».
    const item = puissancesDeuxTempsGenerator.generate({}, { rng: makeRng('papier'), index: 0, total: 10 });
    const papier = item.prompt.papier;
    assert.equal(papier.split(TROU_EN_EXPOSANT).length - 1, 2, 'il faut deux exposants à trouver');
    assert.ok(/10⸱/.test(papier), 'l\'exposant à trouver ne suit pas son 10');
    assert.ok(!/10\s*…/.test(papier), 'un trou sur la ligne après un 10 se lit comme un produit');
    // La fiche le découpe comme un exposant, collé au 10.
    const morceaux = morceauxLigne(texteImprime(papier, item.reponsePapier, item.meta.trouPapier), false);
    assert.ok(morceaux.some((m) => m.haut === TROU_EN_EXPOSANT), 'la fiche ne voit pas l\'exposant à trouver');
    // Les trous du nombre de devant se taillent sur lui, pas sur le corrigé.
    const brut = texteImprime(papier, item.reponsePapier, item.meta.trouPapier);
    const plusLong = Math.max(...(brut.match(/ {3,}/g) || ['']).map((s) => s.length));
    assert.ok(plusLong <= item.meta.deuxTemps.mantisse.length + 6, `trou de ${plusLong} pour « ${item.meta.deuxTemps.mantisse} »`);
    assert.match(item.reponsePapier, /= .* × 10/, 'le corrigé de la feuille ne donne pas la chaîne');
});

test('UNE ESPACE INSÉCABLE NE REPOUSSE PLUS L\'EXPOSANT D\'APRÈS', () => {
    // Rémy : « parfois tes exposants sont un peu décalés ». jsPDF compte
    // l'insécable 2,24 mm et le lecteur la dessine 1,19 (node tools/largeurInsecable.mjs).
    assert.equal(pourPdf('9 330 × 10'), '9 330 × 10');
    assert.equal(pourPdf('62 307'), '62 307');
    // Et la mesure compte les exposants comme le PDF les dessine.
    const RENDU = sansCommentaires(lire('js/ui/ficheRendu.js'));
    const debut = RENDU.indexOf('export function mesureur()');
    const mesure = RENDU.slice(debut, RENDU.indexOf('\n}\n', debut));
    assert.match(mesure, /0\.68 \* c\.measureText\(EXPOSANTS_HAUT/, 'la mesure ne compte plus les exposants comme ils se dessinent');
});

test('L\'ÉCRAN : LES EXPOSANTS EN L\'AIR, ET LA CARTE DE CORRECTION N\'EST PAS EFFACÉE', () => {
    const SRC = sansCommentaires(lire('js/core/activities/scientifiqueDeuxTemps.js'));
    // Une ligne en flex centrait chaque <sup> : le 8 de 10⁸ tombait au niveau des chiffres.
    assert.ok(!/\.sd-expr\s*\{[^}]*display:\s*inline-flex/.test(SRC), 'la ligne est en flex : les exposants tombent');
    // Entre la réponse et la fermeture de la carte, on ne redessine rien.
    const debut = SRC.indexOf('    function valider() {');
    const valider = SRC.slice(debut, SRC.indexOf('result.dismissed.then', debut));
    assert.ok(!/\brender\(\)/.test(valider), 'un render() après la réponse efface la carte de correction');
    assert.ok(!/\b(alert|confirm|prompt)\(/.test(SRC));
});

test('L\'EXERCICE EST INSCRIT, NOTABLE, ET DIT SES DEUX TEMPS', () => {
    const a = getActivity('scientifique-deux-temps');
    assert.ok(a, 'activité absente du registre');
    assert.deepEqual(a.requiresMeta, ['deuxTemps']);
    const ex = exercices.find((e) => e.id === 'num-puissances-deux-temps');
    assert.ok(ex, 'exercice absent du catalogue');
    assert.equal(ex.generatorId, 'num.puissances-deux-temps');
    assert.equal(ex.activityId, 'scientifique-deux-temps');
    assert.equal(CODES_EXERCICES['num-puissances-deux-temps'], 'ES');
    assert.equal(estNotable(ex), true);
    ex.skills.forEach((s) => assert.ok(SKILLS[s], `compétence inconnue « ${s} »`));
    for (const mot of [/deux temps/i, /SANS TOUCHER/, /1,34 × 10² × 10⁵/, /AJOUTE/, /1,34 × 10⁵/, /plus petit que 1/]) {
        assert.ok(mot.test(ex.instruction), `la consigne ne dit rien de ${mot}`);
    }
});
