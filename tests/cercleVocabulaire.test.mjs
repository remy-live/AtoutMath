// Le vocabulaire du cercle : les mots, les confusions, et la figure.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { makeRng } from '../js/core/ids.js';
import { getGenerator } from '../js/core/registry.js';
import { getExerciseById } from '../js/data/catalog.js';
import { RENDUS } from '../js/ui/printSheet.js';
import { MOTS_CERCLE, cercleVocabulaireGenerator } from '../js/core/generators/cercleVocabulaire.js';
import { tracesDe, surCercle, polyArc, cercleSvg, branchesCroix, CX, CY, R } from '../js/core/cercleFigure.js';

const gen = () => getGenerator('geo.cercle-vocabulaire');
const suite = (n, params = {}) => Array.from({ length: n }, (_, i) =>
    gen().generate(params, { rng: makeRng(`s-${i}`), index: i }));

test('les neuf mots portent chacun leur définition ET leur confusion', () => {
    // `pourquoi` est la phrase du cours ; `contre` est ce qu'on répond à
    // l'élève qui a choisi ce mot-là par erreur. C'est le second qui enseigne.
    assert.equal(MOTS_CERCLE.length, 9);
    const ids = new Set();
    for (const m of MOTS_CERCLE) {
        assert.equal(ids.has(m.id), false, `id en double : ${m.id}`);
        ids.add(m.id);
        assert.ok(m.nom && m.pourquoi && m.contre, m.id);
        assert.ok(m.pourquoi.length > 20, `${m.id} : définition trop courte`);
        assert.equal(typeof m.tirer, 'function', m.id);
    }
    // Tangente et sécante sont de quatrième : elles ne doivent pas tomber dans
    // une série de sixième sans qu'on l'ait demandé.
    assert.deepEqual(MOTS_CERCLE.filter(m => m.avance).map(m => m.id), ['tangente', 'secante']);
});

test('UNE SÉRIE PARCOURT LES MOTS AU LIEU DE LES TIRER', () => {
    // Sur huit questions, un tirage laisse presque toujours un mot de côté et
    // en donne trois fois un autre.
    const mots = MOTS_CERCLE.filter(m => !m.avance).map(m => m.id);
    const vus = suite(mots.length).map(it => it.meta.mot);
    assert.deepEqual([...new Set(vus)].sort(), [...mots].sort());
});

test('UN DIAMÈTRE EST UNE CORDE, ET LE JEU LE RECONNAÎT', () => {
    // C'est le vrai piège du chapitre, et il aurait rendu l'exercice injuste :
    // devant un diamètre, « une corde » n'est pas faux, c'est moins précis.
    // Deux réponses à cela — la question demande le nom LE PLUS PRÉCIS, et
    // l'élève qui répond « corde » s'entend dire qu'il a raison.
    const it = gen().generate({ mots: ['diametre'], sens: 'nommer' },
        { rng: makeRng('diam'), index: 0 });
    assert.equal(it.answer, 'un diamètre');
    assert.match(it.prompt.text, /Que représente le segment \[[A-Z][A-Z]\] \?/);
    const corde = it.choices.find(c => c.value === 'une corde');
    assert.ok(corde, 'la corde doit être proposée : c\'est l\'erreur attendue');
    assert.match(corde.why, /Tu as raison/);
    assert.match(corde.why, /passe par le centre/);
});

test('ON NE DEMANDE JAMAIS DE TROUVER « UNE CORDE » FACE À UN DIAMÈTRE', () => {
    // La question aurait deux bonnes réponses, et l'élève qui désigne le
    // diamètre aurait raison. Trois tracés valent mieux qu'une question fausse.
    for (let i = 0; i < 40; i++) {
        const it = gen().generate({ mots: ['corde'], sens: 'trouver' },
            { rng: makeRng(`corde-${i}`), index: 0 });
        if (it.meta.sens !== 'trouver') continue;
        const types = it.meta.spec.elements.map(e => e.type);
        assert.equal(types.includes('diametre'), false,
            `graine ${i} : un diamètre est proposé face à « une corde » — ${types.join(', ')}`);
    }
});

test('« TROUVER » DÉSIGNE VRAIMENT LE BON TRACÉ', () => {
    for (let i = 0; i < 30; i++) {
        const it = gen().generate({ sens: 'trouver' }, { rng: makeRng(`tr-${i}`), index: i });
        if (it.meta.sens !== 'trouver') continue;
        const spec = it.meta.spec;
        const bonIdx = it.meta.bon;
        assert.ok(bonIdx >= 1 && bonIdx <= spec.elements.length, `graine ${i}`);
        // Le tracé désigné doit être du type qu'on demande.
        const attendu = { arc: 'arc', corde: 'corde', rayon: 'rayon', diametre: 'diametre',
            tangente: 'tangente', secante: 'secante' }[it.meta.mot];
        assert.equal(spec.elements[bonIdx - 1].type, attendu, `graine ${i} : mauvais tracé désigné`);
        // LES TRACÉS SE DÉSIGNENT PAR LEUR NOTATION, pas par un rang. Rémy :
        // « ne mets pas Tracé 1, tracé 2, mets plutôt des [AB] ».
        it.choices.forEach(c => assert.match(c.value, /^(\[[A-Z][A-Z]\]|\([A-Z][A-Z]\)|l'arc [A-Z][A-Z])$/, c.value));
        // Et chaque leurre explique ce qu'il EST : c'est là que ça s'apprend.
        it.choices.filter(c => !c.correct).forEach(c => {
            assert.match(c.why, /, c'est /, c.why);
        });
    }
});

test('les mots « globaux » ne se demandent jamais en mode TROUVER', () => {
    // « Lequel de ces tracés est le disque ? » n'a pas de sens : le disque est
    // la figure entière, pas un trait parmi d'autres.
    for (const mot of ['centre', 'cercle', 'disque']) {
        const it = gen().generate({ mots: [mot], sens: 'trouver' }, { rng: makeRng(mot), index: 0 });
        assert.equal(it.meta.sens, 'nommer', `${mot} devrait basculer en « nommer »`);
    }
});

test('LE DÉCOR NE PORTE JAMAIS LE NOM DE LA RÉPONSE', () => {
    // Un décor qui serait lui aussi « une corde » rendrait l'énoncé faux :
    // « ce qui est tracé en rouge » n'aurait plus de réponse unique — sauf que
    // le décor n'est pas rouge, et que c'est bien le surligné qu'on nomme.
    for (let i = 0; i < 40; i++) {
        const it = gen().generate({ sens: 'nommer' }, { rng: makeRng(`d-${i}`), index: i });
        const spec = it.meta.spec;
        assert.equal(spec.surligne, 0, 'le surligné est toujours le premier élément');
        // Un diamètre dans le décor d'une corde ferait deux cordes sur la figure.
        if (it.meta.mot === 'corde') {
            assert.equal(spec.elements.slice(1).some(e => e.type === 'diametre'), false, `graine ${i}`);
        }
    }
});

test('la figure se dessine, et ses points sont bien sur le cercle', () => {
    const p = surCercle(0);
    assert.ok(Math.abs(p.x - (CX + R)) < 1e-9 && Math.abs(p.y - CY) < 1e-9, 'zéro degré est à droite');
    const haut = surCercle(90);
    assert.ok(haut.y < CY, 'quatre-vingt-dix degrés est EN HAUT, pas en bas');
    // Un arc aplati reste sur le cercle, point par point.
    polyArc(30, 120).forEach(q => {
        assert.ok(Math.abs(Math.hypot(q.x - CX, q.y - CY) - R) < 1e-6, 'un point d\'arc a quitté le cercle');
    });
    // Le disque passe SOUS le reste : c'est un fond, pas un trait.
    const traces = tracesDe({ elements: [{ type: 'disque' }, { type: 'rayon', a: 40 }], surligne: 1 });
    assert.equal(traces[0].k, 'cercle');
    assert.equal(traces[0].plein, true);
    assert.ok(traces.some(t => t.k === 'ligne' && t.fort), 'le rayon surligné doit être marqué fort');
    // UN POINT EST UNE CROIX. Rémy : « je te rappelle qu'un point est
    // représenté par une croix » — c'est la convention du collège, et
    // l'intersection des deux traits EST le point.
    assert.ok(traces.some(t => t.k === 'croix'), 'les points doivent être des croix');
    assert.equal(traces.some(t => t.k === 'point'), false, 'plus aucun disque plein');
    assert.equal(branchesCroix(10, 20, 4).length, 2, 'une croix, ce sont deux segments');
    // Et le centre porte toujours son nom : c'est de lui qu'on parle.
    assert.ok(traces.some(t => t.k === 'texte' && t.t === 'O'));
    assert.match(cercleSvg(traces), /^<svg/);
});

test('LA FEUILLE MONTRE LA MÊME FIGURE QUE L\'ÉCRAN', () => {
    const rendu = RENDUS.cercleVocabulaire;
    assert.ok(rendu, 'le rendu papier doit être déclaré');
    // Un DIAMÈTRE : il faut un tracé, pas un point — le centre surligné n'a
    // pas d'épaisseur de trait, et le test ne mesurerait rien.
    const it = gen().generate({ mots: ['diametre'], sens: 'nommer' },
        { rng: makeRng('papier'), index: 0 });
    // `boiteDe` lit `slot.boite` : un slot plat donnerait des coordonnées NaN.
    const slot = { boite: { x: 10, y: 10, w: 50, h: 58 } };
    const vide = rendu.previewGrille(it, slot, 3, false);
    const corrige = rendu.previewGrille(it, slot, 3, true);
    assert.match(vide, /<svg/);
    // AUCUNE COORDONNÉE NaN : c'est ce qui manquait, et un aperçu tout en NaN
    // passait tous les comptages sans rien dessiner.
    assert.equal(/NaN/.test(vide), false, 'coordonnées NaN dans l\'aperçu');
    // La ligne de réponse est vide sur la fiche, remplie sur le corrigé.
    assert.match(vide, /<i><\/i>/);
    assert.match(corrige, new RegExp(`<i>${it.meta.reponse}</i>`));
    // LE ROUGE DEVIENT UN TRAIT GRAS : un polycopié photocopié n'a pas de
    // couleur, et « ce qui est tracé en rouge » n'aurait plus de référent.
    const epaisseurs = [...vide.matchAll(/stroke-width="([\d.]+)"/g)].map(m => Number(m[1]));
    assert.ok(Math.max(...epaisseurs) > Math.min(...epaisseurs) * 2,
        'le tracé surligné doit être nettement plus épais que les autres');
});

test('l\'exercice du catalogue tient debout', () => {
    const exo = getExerciseById('geo-cercle-vocabulaire');
    assert.ok(exo, 'l\'exercice doit être au catalogue');
    assert.equal(exo.generatorId, 'geo.cercle-vocabulaire');
    assert.ok(RENDUS[exo.printable], 'son rendu papier doit exister');
    // Les mots réglés par défaut existent tous, et excluent la quatrième.
    exo.params.mots.forEach(id => assert.ok(MOTS_CERCLE.some(m => m.id === id), `mot inconnu : ${id}`));
    assert.equal(exo.params.mots.includes('tangente'), false, 'la tangente est de quatrième');
    // Le générateur est bien enregistré sous cet identifiant.
    assert.equal(gen().id, cercleVocabulaireGenerator.id);
});

test('chaque item explique la bonne réponse, pas seulement la donne', () => {
    for (const it of suite(10)) {
        assert.ok(it.explanation && it.explanation.length > 30, it.prompt.text);
        assert.equal(it.hints.length, 3);
        assert.ok(it.choices.some(c => c.correct));
        assert.equal(it.choices.filter(c => c.correct).length, 1);
    }
});

test('LE DÉCOR RESTE DANS LA SÉRIE : pas de tangente en sixième', () => {
    // Le décor puisait dans tout le vocabulaire : une série de sixième
    // affichait des tangentes — un objet que l'élève ne sait pas nommer et
    // qu'on ne lui a pas demandé d'apprendre. Vu à l'écran, corrigé.
    const sixieme = ['centre', 'rayon', 'diametre', 'corde', 'arc', 'cercle', 'disque'];
    for (let i = 0; i < 40; i++) {
        const it = gen().generate({ mots: sixieme }, { rng: makeRng(`six-${i}`), index: i });
        it.meta.spec.elements.forEach(e => {
            assert.equal(['tangente', 'secante'].includes(e.type), false,
                `graine ${i} : « ${e.type} » dans une série de sixième`);
        });
        // Et les propositions non plus ne doivent pas dépasser du programme…
        // sauf en mode « nommer », où tout le vocabulaire sert de leurres :
        // c'est voulu, l'élève doit pouvoir écarter un mot qu'il ne connaît pas
        // encore. Ce qui compte, c'est que la FIGURE reste dans la série.
    }
    // Et quand on demande la quatrième, la tangente revient bien.
    const quatre = Array.from({ length: 12 }, (_, i) =>
        gen().generate({ mots: ['tangente', 'secante', 'corde'] }, { rng: makeRng(`q-${i}`), index: i }));
    assert.ok(quatre.some(it => it.meta.spec.elements.some(e => e.type === 'tangente')));
});
