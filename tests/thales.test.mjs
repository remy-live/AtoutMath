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
    thalesGenerator, ORDRE_THALES, ETAPES_THALES, marcheThales, figureThalesSvg,
    egaliteEnColonnes
} from '../js/core/generators/thales.js';
import { getExerciseById, paramSchemaOf } from '../js/data/catalog.js';

const TAILLES = ['AB', 'AC', 'BC', 'AE', 'AD', 'DE'];

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
            assert.ok(Math.abs(f.AE / f.AB - f.AD / f.AC) < 1e-12);
            assert.ok(Math.abs(f.AE / f.AB - f.DE / f.BC) < 1e-12);
            // Et le petit triangle est vraiment plus petit.
            assert.ok(f.AE < f.AB && f.AD < f.AC && f.DE < f.BC);
        }
    }
});

test('le papillon est les emboîtés avec le signe changé', () => {
    const e = pointsThales(1, 0.5);
    const p = pointsThales(-1, 0.5);
    // Même A, mêmes B et C ; E et D sont symétriques par rapport à A.
    assert.deepEqual(e.A, p.A);
    assert.equal(Math.round(e.E.x + p.E.x), Math.round(2 * e.A.x));
    assert.equal(Math.round(e.E.y + p.E.y), Math.round(2 * e.A.y));
    // Emboîtés : E est du même côté que B. Papillon : de l'autre.
    assert.ok((e.E.y - e.A.y) * (e.B.y - e.A.y) > 0);
    assert.ok((p.E.y - p.A.y) * (p.B.y - p.A.y) < 0);
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
    assert.ok(Math.abs(part(egaux, 'E', 'B') - part(egaux, 'D', 'C')) < 1e-9,
        'deux rapports égaux doivent rester égaux sur le dessin');
    const differents = pointsThales(1, 0.25, 0.4);
    assert.ok(part(differents, 'E', 'B') < part(differents, 'D', 'C'),
        'l\'ordre des deux rapports doit être conservé');
    // Et le petit triangle reste visible, même à un rapport minuscule.
    assert.ok(part(pointsThales(1, 0.05), 'E', 'B') > 0.3);
});

test('LA FIGURE D\'UNE RÉCIPROQUE SUIT LES LONGUEURS DONNÉES', () => {
    // Sinon elle dessine (DE) parallèle à (BC) alors que la réponse est « non »,
    // et la figure affirme le contraire du corrigé.
    const f = creerThales({ config: 'emboites', rng: makeRng('recip') });
    const faussee = { ...f, AD: f.AD + 1 };
    const P = pointsReels(faussee);
    const part = (n, S) => Math.hypot(P[n].x - P.A.x, P[n].y - P.A.y)
        / Math.hypot(P[S].x - P.A.x, P[S].y - P.A.y);
    assert.ok(Math.abs(part('E', 'B') - part('D', 'C')) > 1e-6,
        'la figure devrait montrer deux rapports différents');
    assert.equal(sontParalleles(faussee), false);
});

// --- Le théorème et sa réciproque ------------------------------------------------

test('la réciproque compare des FRACTIONS, pas des arrondis', () => {
    // 1/3 n'est pas 0,33 : une comparaison décimale déclarerait parallèle ce
    // qui ne l'est pas.
    assert.ok(sontParalleles({ AE: 1, AB: 3, AD: 2, AC: 6 }));
    assert.equal(sontParalleles({ AE: 1, AB: 3, AD: 0.33, AC: 1 }), false);
    assert.ok(sontParalleles({ AE: 4, AB: 6, AD: 6, AC: 9 }));
    assert.equal(sontParalleles({ AE: 4, AB: 6, AD: 6, AC: 10 }), false);

    const r = rapportsCompares({ AE: 4, AB: 6, AD: 6, AC: 10 });
    assert.equal(r.premier, '2/3');
    assert.equal(r.second, '3/5');
});

test('le calcul donne la longueur exacte, et les trois lignes du cahier', () => {
    for (let i = 0; i < 200; i++) {
        const f = creerThales({ config: 'emboites', rng: makeRng(`c${i}`) });
        if (!f) continue;
        for (const cherche of ['AD', 'AE', 'DE', 'BC']) {
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
    assert.ok(FAUSSES_EGALITES.some(e => e.texte.includes('EB')));
});

test('les longueurs s\'écrivent à la française', () => {
    assert.equal(longueurTexte(7), '7');
    assert.equal(longueurTexte(7.5), '7,5');
    assert.equal(longueurTexte(7.0), '7');
});

// --- Les trois marches -----------------------------------------------------------

test('on ne commence pas par calculer, et l\'on finit par la réciproque', () => {
    // Rémy : « On se fiche si c'est en papillon ou en triangle imbriqué. Ne
    // mets pas cette partie. » La marche « reconnaître la configuration » a
    // donc disparu — nommer la figure ne fait pas partie du chapitre.
    assert.deepEqual(ORDRE_THALES, ['egalite', 'calculer', 'reciproque']);
    ORDRE_THALES.forEach((id, i) => assert.equal(ETAPES_THALES[id].rang, i + 1));
    assert.equal(ETAPES_THALES.configuration, undefined);
    assert.equal(marcheThales('progressif', 0), 'egalite');
    assert.equal(marcheThales('progressif', 3), 'calculer');
    assert.equal(marcheThales('progressif', 6), 'reciproque');
    // Arrivé en haut, on recommence : sinon une fiche de vingt questions en
    // poserait onze fois la même.
    assert.equal(marcheThales('progressif', 9), 'egalite');
    assert.equal(marcheThales('calculer', 0), 'calculer');
    // Un réglage enregistré avant la suppression ne doit pas casser l'exercice.
    assert.equal(marcheThales('configuration', 0), 'egalite');
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
            ['A', 'B', 'C', 'E', 'D'].forEach(n =>
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
            assert.ok(it.meta.points.A && it.meta.points.D);
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
    const degeneree = { ...f, points: { ...f.points, E: { x: f.points.A.x + 3, y: f.points.A.y + 3 } } };
    assert.ok(!figureThalesSvg(degeneree, ['AE']).includes('AE ='),
        'un segment trop court ne porte pas sa cote');
    // Et sur une figure normale, la cote de AE tient bien.
    assert.ok(figureThalesSvg(f, ['AE']).includes('AE ='),
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

// --- LES LETTRES NE TOUCHENT PLUS LES TRAITS ------------------------------------
//
// Rémy : « Les lettres se supperpose aux trait. Ne met pas de rond pour le
// point. »
//
// C'est une propriété GÉOMÉTRIQUE, donc elle se mesure — et c'est la seule
// façon honnête de dire que le défaut est corrigé. Un œil sur trois captures
// d'écran ne prouve rien : la figure change à chaque question, et c'est
// justement pour cela que les décalages écrits à la main finissaient par
// tomber sur un trait.
//
// On relit le SVG produit, on reconstruit la BOÎTE de chaque étiquette à
// partir de son ancrage, et on mesure sa distance à chacun des six segments.

/** Les segments tracés, relus dans le SVG lui-même. */
function segmentsDuSvg(svg) {
    // LES SEGMENTS DE LA FIGURE, PAS CEUX DES COTES. Une double flèche est
    // faite de lignes elle aussi — ligne de cote et lignes d'attache —, et il
    // est NORMAL qu'une étiquette de cote touche la sienne : elle est écrite
    // pour elle. On ne garde donc que les traits de la figure, reconnaissables
    // à leur classe.
    return [...svg.matchAll(
        /<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)" class="(th-[a-z]+)"/g)]
        .filter(m => ['th-droite', 'th-base', 'th-para'].includes(m[5]))
        .map(m => ({ p: { x: +m[1], y: +m[2] }, q: { x: +m[3], y: +m[4] } }));
}

/** Les étiquettes, avec leur boîte réelle — ancrage et ligne de base compris. */
function etiquettesDuSvg(svg) {
    const re = /<text x="([-\d.]+)"\s+y="([-\d.]+)"\s+(?:text-anchor="(\w+)"\s+)?class="th-(nom|cote)"(?:\s+text-anchor="(\w+)")?\s*>([^<]*)<\/text>/g;
    return [...svg.matchAll(re)].map(m => {
        const x = +m[1], y = +m[2];
        const ancre = m[3] || m[5] || 'start';
        const taille = m[4] === 'nom' ? 7 : 6;
        const texte = m[6];
        const large = texte.length * taille * 0.56;
        const gauche = ancre === 'start' ? x : ancre === 'end' ? x - large : x - large / 2;
        // Un texte SVG s'aligne sur le PIED des lettres : la boîte monte
        // au-dessus de la ligne de base, et déborde très peu en dessous.
        return {
            texte, taille,
            x0: gauche, x1: gauche + large,
            y0: y - taille * 0.72, y1: y + taille * 0.2
        };
    });
}

/** Distance d'un point à un segment. */
function distSegment(c, p, q) {
    const dx = q.x - p.x, dy = q.y - p.y;
    const l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((c.x - p.x) * dx + (c.y - p.y) * dy) / l2)) : 0;
    return Math.hypot(c.x - (p.x + t * dx), c.y - (p.y + t * dy));
}

/** Distance d'une boîte à un segment : la plus courte sur son contour et son aire. */
function distBoiteSegment(b, s) {
    let d = Infinity;
    // Un échantillonnage de la boîte suffit et ne peut pas se tromper dans le
    // sens dangereux : il ne déclare jamais « loin » ce qui est traversé.
    for (let i = 0; i <= 8; i++) {
        for (let j = 0; j <= 3; j++) {
            const c = { x: b.x0 + (b.x1 - b.x0) * i / 8, y: b.y0 + (b.y1 - b.y0) * j / 3 };
            d = Math.min(d, distSegment(c, s.p, s.q));
        }
    }
    return d;
}

test('aucune lettre, aucune cote ne se pose sur un trait', () => {
    let pire = Infinity, pireOu = '';
    for (const config of ['emboites', 'papillon']) {
        for (let i = 0; i < 120; i++) {
            const f = creerThales({ config, rng: makeRng(`lettre-${config}-${i}`) });
            if (!f) continue;
            // Le pire cas : TOUTES les cotes écrites en même temps.
            const svg = figureThalesSvg(f, TAILLES);
            const segments = segmentsDuSvg(svg);
            assert.equal(segments.length, 6, 'six segments tracés');
            const etiquettes = etiquettesDuSvg(svg);
            assert.equal(etiquettes.length, 11, `${config}/${i} : 5 lettres + 6 cotes`);
            for (const e of etiquettes) {
                for (const s of segments) {
                    const d = distBoiteSegment(e, s);
                    if (d < pire) { pire = d; pireOu = `${config}/${i} « ${e.texte} »`; }
                }
            }
        }
    }
    // Le trait le plus épais fait 1,5 unité, donc 0,75 de part et d'autre de
    // son axe : au-delà de 1,5 aucune étiquette ne peut le toucher, quelle que
    // soit l'approximation de largeur de police. On mesure aujourd'hui 2,6 au
    // pire — la marge est réelle, pas ajustée au seuil.
    assert.ok(pire > 1.5, `étiquette collée au trait : ${pireOu}, à ${pire.toFixed(2)}`);
});

test('le point n\'a plus de rond, et la figure tient dans sa boîte', () => {
    for (const config of ['emboites', 'papillon']) {
        for (let i = 0; i < 40; i++) {
            const f = creerThales({ config, rng: makeRng(`rond-${config}-${i}`) });
            if (!f) continue;
            const svg = figureThalesSvg(f, TAILLES);
            assert.ok(!svg.includes('<circle'), 'un rond traîne encore sur un point');
            const vb = svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/);
            assert.ok(vb, 'pas de viewBox');
            const [x0, y0, w, h] = vb.slice(1).map(Number);
            for (const e of etiquettesDuSvg(svg)) {
                assert.ok(e.x0 >= x0 - 0.5 && e.x1 <= x0 + w + 0.5,
                    `${config}/${i} : « ${e.texte} » sort du cadre en largeur`);
                assert.ok(e.y0 >= y0 - 0.5 && e.y1 <= y0 + h + 0.5,
                    `${config}/${i} : « ${e.texte} » sort du cadre en hauteur`);
            }
        }
    }
});

// --- LES FRACTIONS EN COLONNE ---------------------------------------------------

test('l\'égalité se dessine en fractions, sans jamais perdre son texte', () => {
    // Rémy : « Ecris les fraction en colonne. » Le TEXTE reste la clé de la
    // réponse — il est comparé à `answer` et enregistré dans le carnet —, le
    // dessin n'est que ce qu'on montre.
    const html = egaliteEnColonnes('AE/AB = AD/AC = DE/BC');
    const lu = html.replace(/<[^>]*>/g, ' ');
    assert.ok(!lu.includes('/'), `une barre oblique traîne encore : ${lu}`);
    ['AE', 'AB', 'AD', 'AC', 'DE', 'BC'].forEach(n =>
        assert.ok(html.includes(`>${n}<`), `${n} manque`));
    assert.equal((html.match(/fraction-num/g) || []).length, 3);
    assert.equal((html.match(/fraction-den/g) || []).length, 3);
    assert.equal((html.match(/th-eg-signe/g) || []).length, 2);

    for (let i = 0; i < 60; i++) {
        const it = thalesGenerator.generate({ etape: 'egalite' },
            { rng: makeRng(`eg${i}`), index: 0 });
        it.choices.forEach(c => {
            assert.match(String(c.value), /^[A-Z]{2}\/[A-Z]{2}( = [A-Z]{2}\/[A-Z]{2}){2}$/,
                'la clé de réponse doit rester du texte');
            assert.ok(String(c.label).includes('fraction-den'), 'la proposition doit être dessinée');
            assert.equal(c.texte, c.value, 'le robot lit le texte, pas le dessin');
        });
        assert.equal(it.answer, it.choices.find(c => c.correct).value);
    }
});
