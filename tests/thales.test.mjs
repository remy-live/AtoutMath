import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import '../js/core/activities/index.js';
import {
    CONFIGURATIONS, creerThales, longueurTexte, egaliteThales, FAUSSES_EGALITES,
    sontParalleles, rapportsCompares, calculThales, pointsThales, pointsReels
} from '../js/core/thales.js';
import {
    thalesGenerator, ORDRE_THALES, ETAPES_THALES, marcheThales, figureThalesSvg
} from '../js/core/generators/thales.js';
import { getExerciseById, paramSchemaOf } from '../js/data/catalog.js';

const TAILLES = ['AB', 'AC', 'BC', 'AM', 'AN', 'MN'];

// --- La figure -----------------------------------------------------------------

test('toute figure fabriquée est un vrai triangle, aux longueurs lisibles', () => {
    for (const config of ['emboites', 'papillon']) {
        for (let i = 0; i < 300; i++) {
            const f = creerThales({ config, rng: makeRng(`${config}-${i}`) });
            if (!f) continue;
            // L'INÉGALITÉ TRIANGULAIRE : une figure impossible se voit dès
            // qu'on la dessine, et on ne la dessinerait pas juste.
            assert.ok(f.BC < f.AB + f.AC && f.BC > Math.abs(f.AB - f.AC),
                `${config} : triangle impossible ${f.AB}/${f.AC}/${f.BC}`);
            // AU PLUS UNE DÉCIMALE. Un énoncé de géométrie qui demande
            // d'arrondir n'enseigne plus Thalès, il enseigne la calculatrice.
            TAILLES.forEach(n => assert.ok(
                Math.abs(f[n] * 10 - Math.round(f[n] * 10)) < 1e-9,
                `${config} : ${n} = ${f[n]} n'est pas lisible`));
            // Les trois rapports sont bien égaux — c'est le théorème.
            assert.ok(Math.abs(f.AM / f.AB - f.AN / f.AC) < 1e-12);
            assert.ok(Math.abs(f.AM / f.AB - f.MN / f.BC) < 1e-12);
            // Et le petit triangle est vraiment plus petit.
            assert.ok(f.AM < f.AB && f.AN < f.AC && f.MN < f.BC);
        }
    }
});

test('le papillon est les emboîtés avec le signe changé', () => {
    const e = pointsThales(1, 0.5);
    const p = pointsThales(-1, 0.5);
    // Même A, mêmes B et C ; M et N sont symétriques par rapport à A.
    assert.deepEqual(e.A, p.A);
    assert.equal(Math.round(e.M.x + p.M.x), Math.round(2 * e.A.x));
    assert.equal(Math.round(e.M.y + p.M.y), Math.round(2 * e.A.y));
    // Emboîtés : M est du même côté que B. Papillon : de l'autre.
    assert.ok((e.M.y - e.A.y) * (e.B.y - e.A.y) > 0);
    assert.ok((p.M.y - p.A.y) * (p.B.y - p.A.y) < 0);
});

test('LA FIGURE EST ÉTALÉE, MAIS ELLE NE MENT PAS SUR L\'ORDRE', () => {
    // À un quart, le petit triangle d'un papillon devient un timbre et les
    // lettres se superposent. On étale donc les rapports — par une
    // transformation AFFINE, la même pour les deux côtés, ce qui conserve
    // l'égalité et l'ordre. C'est ce qui permet à la figure d'une réciproque
    // de rester honnête.
    const part = (P, n, S) => Math.hypot(P[n].x - P.A.x, P[n].y - P.A.y)
        / Math.hypot(P[S].x - P.A.x, P[S].y - P.A.y);
    const egaux = pointsThales(1, 0.25, 0.25);
    assert.ok(Math.abs(part(egaux, 'M', 'B') - part(egaux, 'N', 'C')) < 1e-9,
        'deux rapports égaux doivent rester égaux sur le dessin');
    const differents = pointsThales(1, 0.25, 0.4);
    assert.ok(part(differents, 'M', 'B') < part(differents, 'N', 'C'),
        'l\'ordre des deux rapports doit être conservé');
    // Et le petit triangle reste visible, même à un rapport minuscule.
    assert.ok(part(pointsThales(1, 0.05), 'M', 'B') > 0.3);
});

test('LA FIGURE D\'UNE RÉCIPROQUE SUIT LES LONGUEURS DONNÉES', () => {
    // Sinon elle dessine (MN) parallèle à (BC) alors que la réponse est « non »,
    // et la figure affirme le contraire du corrigé.
    const f = creerThales({ config: 'emboites', rng: makeRng('recip') });
    const faussee = { ...f, AN: f.AN + 1 };
    const P = pointsReels(faussee);
    const part = (n, S) => Math.hypot(P[n].x - P.A.x, P[n].y - P.A.y)
        / Math.hypot(P[S].x - P.A.x, P[S].y - P.A.y);
    assert.ok(Math.abs(part('M', 'B') - part('N', 'C')) > 1e-6,
        'la figure devrait montrer deux rapports différents');
    assert.equal(sontParalleles(faussee), false);
});

// --- Le théorème et sa réciproque ------------------------------------------------

test('la réciproque compare des FRACTIONS, pas des arrondis', () => {
    // 1/3 n'est pas 0,33 : une comparaison décimale déclarerait parallèle ce
    // qui ne l'est pas.
    assert.ok(sontParalleles({ AM: 1, AB: 3, AN: 2, AC: 6 }));
    assert.equal(sontParalleles({ AM: 1, AB: 3, AN: 0.33, AC: 1 }), false);
    assert.ok(sontParalleles({ AM: 4, AB: 6, AN: 6, AC: 9 }));
    assert.equal(sontParalleles({ AM: 4, AB: 6, AN: 6, AC: 10 }), false);

    const r = rapportsCompares({ AM: 4, AB: 6, AN: 6, AC: 10 });
    assert.equal(r.premier, '2/3');
    assert.equal(r.second, '3/5');
});

test('le calcul donne la longueur exacte, et les trois lignes du cahier', () => {
    for (let i = 0; i < 200; i++) {
        const f = creerThales({ config: 'emboites', rng: makeRng(`c${i}`) });
        if (!f) continue;
        for (const cherche of ['AN', 'AM', 'MN', 'BC']) {
            const c = calculThales(f, cherche);
            assert.ok(Math.abs(c.valeur - f[cherche]) < 1e-9,
                `${cherche} : ${c.valeur} au lieu de ${f[cherche]}`);
            assert.equal(c.lignes.length, 3);
            assert.ok(c.lignes[0].includes('parallèles'));
            assert.ok(c.lignes[2].includes('cm'));
        }
    }
});

test('les fausses égalités nomment chacune une confusion précise', () => {
    // Un distracteur muet n'apprend rien au carnet d'erreurs.
    assert.ok(FAUSSES_EGALITES.length >= 3);
    const vues = new Set();
    FAUSSES_EGALITES.forEach(e => {
        assert.notEqual(e.texte, egaliteThales(), 'une fausse égalité est la vraie');
        assert.ok(e.pourquoi.length > 40, `« ${e.texte} » : explication trop courte`);
        assert.ok(!vues.has(e.texte), 'deux fausses égalités identiques');
        vues.add(e.texte);
    });
    // La plus fréquente doit y être : le RESTE au lieu du TOUT.
    assert.ok(FAUSSES_EGALITES.some(e => e.texte.includes('MB')));
});

test('les longueurs s\'écrivent à la française', () => {
    assert.equal(longueurTexte(7), '7');
    assert.equal(longueurTexte(7.5), '7,5');
    assert.equal(longueurTexte(7.0), '7');
});

// --- Les quatre marches ----------------------------------------------------------

test('on ne commence pas par calculer, et l\'on finit par la réciproque', () => {
    assert.deepEqual(ORDRE_THALES, ['configuration', 'egalite', 'calculer', 'reciproque']);
    ORDRE_THALES.forEach((id, i) => assert.equal(ETAPES_THALES[id].rang, i + 1));
    assert.equal(marcheThales('progressif', 0), 'configuration');
    assert.equal(marcheThales('progressif', 3), 'egalite');
    assert.equal(marcheThales('progressif', 6), 'calculer');
    assert.equal(marcheThales('progressif', 9), 'reciproque');
    // Arrivé en haut, on recommence : sinon une fiche de vingt questions en
    // poserait onze fois la même.
    assert.equal(marcheThales('progressif', 12), 'configuration');
    assert.equal(marcheThales('calculer', 0), 'calculer');
});

test('chaque question est complète, et sa figure tient dans son cadre', () => {
    for (const marche of ORDRE_THALES) {
        for (let i = 0; i < 60; i++) {
            const it = thalesGenerator.generate({ etape: marche, config: 'melange' },
                { rng: makeRng(`q-${marche}-${i}`), index: 0 });
            assert.ok(it, `${marche} : aucune question`);
            assert.equal(it.meta.etape, marche);
            assert.ok(it.explanation.length > 40, `${marche} : corrigé trop court`);
            assert.ok(it.hints.length >= 2, `${marche} : pas assez d'aides`);
            // La figure est dans l'énoncé HTML, avec ses cinq points nommés.
            assert.ok(it.prompt.html.includes('<svg'), `${marche} : pas de figure`);
            ['A', 'B', 'C', 'M', 'N'].forEach(n =>
                assert.ok(it.prompt.html.includes(`>${n}</text>`), `${marche} : point ${n}`));
            if (it.answerKind === 'choice') {
                assert.equal(it.choices.filter(c => c.correct).length, 1);
                it.choices.filter(c => !c.correct).forEach(c =>
                    assert.ok(c.why && c.why.length > 20, `${marche} : distracteur muet`));
            } else {
                assert.equal(it.answerKind, 'numeric');
                assert.ok(Number.isFinite(it.answer));
            }
            // Le papier doit se suffire à lui-même — la fiche porte la figure,
            // mais l'énoncé doit dire ce qu'on demande.
            assert.ok(it.prompt.papier.length > 20, `${marche} : énoncé papier trop court`);
            // Et la fiche a besoin des points et des longueurs.
            assert.ok(it.meta.points.A && it.meta.points.N);
            TAILLES.forEach(n => assert.ok(it.meta.longueurs[n] > 0));
        }
    }
});

test('« calculer » demande bien une longueur qu\'on peut trouver', () => {
    for (let i = 0; i < 200; i++) {
        const it = thalesGenerator.generate({ etape: 'calculer' },
            { rng: makeRng(`k${i}`), index: 0 });
        // Les trois longueurs de l'énoncé, plus l'inconnue.
        assert.equal(it.meta.cotes.length, 3);
        assert.ok(!it.meta.cotes.includes(it.explanation.split(' ')[0]));
        // La réponse est bien celle du corrigé.
        const m = it.explanation.match(/= ([\d,]+) cm\.$/);
        assert.ok(m, `corrigé sans résultat : ${it.explanation}`);
        assert.equal(Number(m[1].replace(',', '.')), it.answer);
    }
});

test('« la réciproque » dit non à peu près une fois sur deux', () => {
    // Si c'était toujours parallèle, l'élève répondrait « oui » sans calculer.
    let non = 0;
    const total = 300;
    for (let i = 0; i < total; i++) {
        const it = thalesGenerator.generate({ etape: 'reciproque' },
            { rng: makeRng(`r${i}`), index: 0 });
        if (it.choices.find(c => c.correct).value.startsWith('Non')) non++;
    }
    assert.ok(non > total * 0.3 && non < total * 0.7,
        `« non » tombe ${non} fois sur ${total}`);
});

test('le réglage de configuration est respecté', () => {
    for (const config of ['emboites', 'papillon']) {
        const vus = new Set();
        for (let i = 0; i < 40; i++) {
            vus.add(thalesGenerator.generate({ etape: 'progressif', config },
                { rng: makeRng(`cf${i}`), index: i }).meta.config);
        }
        assert.deepEqual([...vus], [config]);
    }
    const melange = new Set();
    for (let i = 0; i < 60; i++) {
        melange.add(thalesGenerator.generate({ etape: 'progressif', config: 'melange' },
            { rng: makeRng(`ml${i}`), index: i }).meta.config);
    }
    assert.equal(melange.size, 2, 'le mélange doit tirer les deux');
});

test('la figure SVG ne porte une cote que là où elle tient', () => {
    const f = creerThales({ config: 'emboites', rng: makeRng('cotes') });
    const nue = figureThalesSvg(f);
    assert.ok(!nue.includes('AB ='), 'aucune cote demandée, aucune écrite');
    const cotee = figureThalesSvg(f, ['AB', 'AC']);
    assert.ok(cotee.includes('AB ='), 'la cote demandée doit être écrite');
    // Une cote sur un segment minuscule se poserait sur la lettre du point.
    // Depuis l'étalement des rapports le cas ne se produit plus tout seul, on
    // le fabrique donc à la main pour vérifier que le garde-fou tient.
    const degeneree = { ...f, points: { ...f.points, M: { x: f.points.A.x + 3, y: f.points.A.y + 3 } } };
    assert.ok(!figureThalesSvg(degeneree, ['AM']).includes('AM ='),
        'un segment trop court ne porte pas sa cote');
    // Et sur une figure normale, la cote de AM tient bien.
    assert.ok(figureThalesSvg(f, ['AM']).includes('AM ='),
        'l\'étalement doit rendre toutes les cotes des figures fabriquées lisibles');
});

// --- Le rangement -----------------------------------------------------------------

test('Thalès est au catalogue, imprimable, avec ses deux réglages', () => {
    const e = getExerciseById('geo-thales');
    assert.ok(e, 'geo-thales manque au catalogue');
    assert.deepEqual(e.skills, ['geo.thales']);
    assert.equal(e.printable, 'thales', 'la fiche doit porter la figure');
    assert.equal(e.params.etape, 'progressif');
    const schema = paramSchemaOf(e);
    assert.ok(schema.find(p => p.id === 'etape').options.length === ORDRE_THALES.length + 1);
    assert.equal(schema.find(p => p.id === 'config').options.length, 3);
    assert.ok(e.instruction.length > 500, 'consigne trop courte');
    assert.ok(/emboîtés/i.test(e.instruction) && /papillon/i.test(e.instruction));
    assert.ok(Object.keys(CONFIGURATIONS).length === 2);
});
