// LES INTERVALLES DE SECONDE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « on va faire des exercices de seconde. Premier type : placer des
// nombres dans le bon ensemble de nombres et aussi sur les intervalles, sur un
// axe, avec inégalité, union et intersection, il faut toujours un support
// visuel. » Puis : « il faut faire toutes les possibilités et aussi savoir
// écrire avec les signes inférieurs ou égal et le bon côté du crochet. » Puis :
// « oui rajoute le niveau seconde ».
//
// MESURÉ sur trente questions tirées (`tools/tmp/voirIntervalles.mjs`) :
//
//   huit sens de traduction sortent      oui, les huit
//   questions sans aucun dessin          0 / 30
//   bonnes réponses par question         exactement 1, partout
//   propositions identiques              3 / 30  →  0 / 30 (voir plus bas)
//
// Et joué dans la vraie application (`tools/tmp/jouerIntervalles.mjs`) : le
// panneau de réglages s'ouvre avec les deux paramètres, la question s'affiche
// avec son axe, et les propositions-dessins font 324 × 55 — lisibles.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TAGS } from '../js/data/tags.js';
import { exercices } from '../js/data/catalog.js';
import { codeCourt } from '../js/core/shortcodes.js';
import {
    intervalleTexte, inegaliteTexte, phraseTexte, axeHtml, intervallesGenerator
} from '../js/core/generators/intervalles.js';
import { makeRng } from '../js/core/ids.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

// ── LE NIVEAU ───────────────────────────────────────────────────────────────

test('LE LYCÉE COMMENCE, ET IL EST EN DERNIER', () => {
    assert.equal(TAGS.NIVEAU.SECONDE, '2nde');
    const ordre = Object.values(TAGS.NIVEAU);
    assert.equal(ordre[ordre.length - 1], '2nde');
    assert.ok(ordre.indexOf('3ème') < ordre.indexOf('2nde'));
});

test('ET PLUS PERSONNE NE RECOPIE LA LISTE DES NIVEAUX', () => {
    // `ui/choisirExercice` était le SEUL endroit à l'écrire à la main. La
    // Seconde y serait apparue en dernier — après le repli — au lieu d'être à
    // sa place. Une liste recopiée est une liste qui finit par mentir.
    const C = lire('js/ui/choisirExercice.js');
    assert.match(C, /const ordre = Object\.values\(TAGS\.NIVEAU\);/);
    assert.ok(!/'CM2', '6ème'/.test(C));
});

test('LES TROIS EXERCICES SONT AU CATALOGUE, AVEC LEUR CODE DICTABLE', () => {
    const miens = exercices.filter(e => (e.tags.niveaux || []).includes('2nde'));
    assert.equal(miens.length, 3);
    miens.forEach(e => {
        assert.equal(e.tags.chemin[1], 'Ensembles et intervalles');
        // PAS DE I, PAS DE O, PAS DE Q : ces codes se DICTENT en classe.
        // J'avais écrit IV, IC, ID — silencieusement invalides : la lettre de
        // contrôle rend null, `codeCourt` rend la chaîne vide, et les trois
        // exercices « partageaient » ce vide.
        const c = codeCourt(e.id);
        assert.ok(c.length === 3, `${e.id} : code « ${c} »`);
        assert.ok(!/[IOQ]/.test(c), `${e.id} : ${c} contient une lettre qui s'entend mal`);
    });
});

// ── LES TROIS ÉCRITURES ─────────────────────────────────────────────────────

test('LES CROCHETS SONT DU BON CÔTÉ — C\'EST LA DEMANDE', () => {
    assert.equal(intervalleTexte({ a: 2, b: 5, ea: true, eb: false }), '[2 ; 5[');
    assert.equal(intervalleTexte({ a: 2, b: 5, ea: false, eb: true }), ']2 ; 5]');
    assert.equal(intervalleTexte({ a: 2, b: 5, ea: true, eb: true }), '[2 ; 5]');
    assert.equal(intervalleTexte({ a: 2, b: 5, ea: false, eb: false }), ']2 ; 5[');
});

test('ET LE CROCHET DE L\'INFINI EST TOUJOURS OUVERT', () => {
    // La seule règle du chapitre qui ne souffre aucune exception.
    assert.equal(intervalleTexte({ a: null, b: 3, ea: false, eb: true }), ']−∞ ; 3]');
    assert.equal(intervalleTexte({ a: 0, b: null, ea: true, eb: false }), '[0 ; +∞[');
    // Jamais de crochet fermé du côté de l'infini, quoi qu'on lui passe.
    assert.ok(!/\[−∞/.test(intervalleTexte({ a: null, b: 3, ea: true, eb: true })));
    assert.ok(!/∞\]/.test(intervalleTexte({ a: 0, b: null, ea: true, eb: true })));
});

test('« INFÉRIEUR OU ÉGAL » S\'ÉCRIT ⩽, ET IL PREND LA BORNE', () => {
    // Rémy : « savoir écrire avec les signes inférieurs ou égal ». Et c'est le
    // ⩽ du programme français, pas le ≤ anglo-saxon.
    assert.equal(inegaliteTexte({ a: 2, b: 5, ea: true, eb: false }), '2 ⩽ x < 5');
    assert.equal(inegaliteTexte({ a: 2, b: 5, ea: false, eb: true }), '2 < x ⩽ 5');
    assert.equal(inegaliteTexte({ a: null, b: 3, ea: false, eb: true }), 'x ⩽ 3');
    assert.equal(inegaliteTexte({ a: null, b: 3, ea: false, eb: false }), 'x < 3');
    assert.equal(inegaliteTexte({ a: 0, b: null, ea: true, eb: false }), 'x ⩾ 0');
    assert.equal(inegaliteTexte({ a: 0, b: null, ea: false, eb: false }), 'x > 0');
});

test('LA PHRASE DU MANUEL DIT « INCLUS » OU « EXCLU »', () => {
    assert.equal(phraseTexte({ a: -5, b: 7, ea: false, eb: true }),
        'x est un réel compris entre -5 exclu et 7 inclus');
    assert.equal(phraseTexte({ a: null, b: 2, ea: false, eb: false }),
        'x est un réel strictement inférieur à 2');
});

// ── LE DESSIN ───────────────────────────────────────────────────────────────

test('LE CROCHET FERMÉ REGARDE VERS L\'INTÉRIEUR, L\'OUVERT LUI TOURNE LE DOS', () => {
    // C'est le cœur du dessin, et ce qui ne se lit pas dans une capture.
    // Un crochet fermé à GAUCHE a ses bras vers la DROITE (dx positif) ;
    // ouvert, vers la gauche. On lit les tracés.
    const ferme = axeHtml([{ a: 2, b: 5, ea: true, eb: false }]);
    const ouvert = axeHtml([{ a: 2, b: 5, ea: false, eb: false }]);
    assert.notEqual(ferme, ouvert);
    // Les bras mesurent neuf pixels — mesuré à l'écran, six ne se distinguait
    // pas entre deux propositions voisines.
    assert.match(lire('js/core/generators/intervalles.js'), /const d = ferme \? sens \* 9 : -sens \* 9;/);
});

test('UNE DEMI-DROITE PORTE UNE FLÈCHE, PAS UN CROCHET', () => {
    const versLaDroite = axeHtml([{ a: 1, b: null, ea: true, eb: false }]);
    assert.match(versLaDroite, /<svg/);
    // La flèche de l'intervalle, au bout : c'est ce qui dit « ça continue ».
    assert.ok((versLaDroite.match(/<path/g) || []).length > 5);
});

// ── LES QUESTIONS ───────────────────────────────────────────────────────────

const tirer = (n, params = { sens: 'toutes', forme: 'les-deux' }) =>
    Array.from({ length: n }, (_, i) =>
        intervallesGenerator.generate(params, { rng: makeRng(2000 + i) }));

test('AUCUNE QUESTION SANS SUPPORT VISUEL — LA CONTRAINTE DE RÉMY', () => {
    // « il faut toujours un support visuel ». Quand la question PART de l'axe
    // il est dans l'énoncé ; quand elle y ARRIVE, les propositions sont des
    // axes. MESURÉ : 0 question sur 30 sans le moindre dessin.
    tirer(30).forEach(it => {
        const tout = (it.prompt.html || '') + it.choices.map(c => c.label).join('');
        assert.match(tout, /<svg/, `${it.meta.de} → ${it.meta.vers} : pas de dessin`);
    });
});

test('TOUTES LES TRADUCTIONS SORTENT', () => {
    // « il faut faire toutes les possibilités ».
    const vus = new Set(tirer(60).map(it => `${it.meta.de}→${it.meta.vers}`));
    ['inegalite→intervalle', 'inegalite→axe', 'intervalle→inegalite',
        'intervalle→axe', 'axe→intervalle', 'axe→inegalite',
        'phrase→intervalle', 'phrase→axe'].forEach(s =>
        assert.ok(vus.has(s), `jamais vu : ${s}`));
});

test('UNE SEULE BONNE RÉPONSE, ET AUCUNE PROPOSITION EN DOUBLE', () => {
    // MESURÉ : 3 questions sur 30 portaient DEUX PROPOSITIONS IDENTIQUES, dont
    // l'une marquée fausse. Toujours le même cas — une demi-droite dont on
    // demande l'inégalité : la faute « infini fermé » change l'écriture de
    // l'intervalle mais PAS celle de l'inégalité, `x ⩽ 3` des deux côtés.
    // Comparer les objets ne pouvait pas le voir ; on compare l'étiquette.
    tirer(60).forEach(it => {
        assert.equal(it.choices.filter(c => c.correct).length, 1);
        const vues = it.choices.map(c => c.label);
        assert.equal(new Set(vues).size, vues.length,
            `${it.meta.de} → ${it.meta.vers} : deux propositions identiques`);
    });
});

test('CHAQUE LEURRE DIT QUELLE FAUTE IL EST', () => {
    // Un « faux » sans diagnostic n'apprend rien. Les quatre fautes réelles :
    // crochet à l'envers, ouvert pour fermé, bornes échangées, infini fermé.
    tirer(30).forEach(it => {
        it.choices.filter(c => !c.correct).forEach(c =>
            assert.ok(c.why && c.why.length > 20,
                `${it.meta.de} → ${it.meta.vers} : un leurre sans explication`));
    });
});

test('LE RÉGLAGE « DEMI-DROITES » NE SERT QUE DES DEMI-DROITES', () => {
    tirer(20, { sens: 'toutes', forme: 'demi' }).forEach(it => {
        assert.match(it.explanation, /infini n'est pas un nombre/);
    });
});

test('ET « ÉCRIRE L\'INTERVALLE » NE DEMANDE QUE ÇA', () => {
    tirer(20, { sens: 'intervalle', forme: 'les-deux' }).forEach(it => {
        assert.equal(it.meta.vers, 'intervalle');
        assert.equal(it.skillId, 'nb.intervalle.ecrire');
    });
});

test('LA CONSIGNE EST UNE PHRASE, PAS DEUX MORCEAUX COLLÉS', () => {
    // Ma première version fabriquait « Cet intervalle se lit : Quelle droite
    // graduée ? » — du français d'automate.
    tirer(20).forEach(it => {
        assert.match(it.prompt.html, /correspond à (cette|cet) /);
        assert.ok(!/se lit\s*:/.test(it.prompt.html));
    });
});
