import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { anglesManquantsGenerator as G } from '../js/core/generators/anglesManquants.js';
import {
    RELATIONS, figureSecantes, figurePartage, figureParalleles, mesureArc, ancreArc
} from '../js/core/anglesRemarquables.js';

const tirer = (params, i) => G.generate(params, { rng: makeRng('am' + i), index: i });

test('la réponse est celle que dit la relation, sur la mesure DESSINÉE', () => {
    // Le contrat du chapitre : ce n'est pas le nombre tiré qui compte, c'est
    // l'angle qu'on voit. Si le dessin et l'énoncé divergent d'un degré, la
    // feuille est fausse et personne ne peut le savoir.
    for (let i = 0; i < 300; i++) {
        const m = tirer({}, i).meta;
        if (m.famille === 'chaine') continue;
        const donne = mesureArc(m.figure.arcs.find(a => a.role === 'donne'));
        const cherche = mesureArc(m.figure.arcs.find(a => a.role === 'cherche'));
        assert.equal(m.donne, donne, `${m.famille} : l'énoncé annonce ${m.donne}°, le dessin montre ${donne}°`);
        assert.equal(m.reponse, RELATIONS[m.relation].de(donne),
            `${m.famille} : la règle donne autre chose que la réponse annoncée`);
        assert.equal(m.reponse, cherche,
            `${m.famille} : la réponse ${m.reponse}° n'est pas l'angle dessiné (${cherche}°)`);
    }
});

test('deux angles opposés par le sommet sont bien opposés, pas voisins', () => {
    const f = figureSecantes({ angle: 50, penche: 0 });
    const [donne, cherche] = f.arcs;
    assert.equal(mesureArc(donne), 50);
    assert.equal(mesureArc(cherche), 50);
    // Opposés : leurs bissectrices pointent dans des directions contraires.
    const a = ancreArc(donne), b = ancreArc(cherche);
    assert.ok(a.x * b.x + a.y * b.y < 0, 'les deux secteurs sont du même côté');
});

test('un angle partagé rend exactement son total', () => {
    for (const ouverture of [90, 180, 360]) {
        const f = figurePartage({ ouverture, angle: 37, penche: 11 });
        const somme = f.arcs.reduce((s, a) => s + mesureArc(a), 0);
        assert.equal(somme, ouverture, `le partage de ${ouverture}° ne fait pas le compte`);
        assert.equal(mesureArc(f.arcs[0]), 37);
    }
    // L'équerre n'apparaît QUE sur l'angle droit : ailleurs elle mentirait.
    assert.ok(figurePartage({ ouverture: 90, angle: 30 }).droit);
    assert.equal(figurePartage({ ouverture: 180, angle: 30 }).droit, null);
});

test('correspondants et alternes-internes sont égaux, et à des sommets différents', () => {
    for (const relation of ['correspondants', 'alternes']) {
        const f = figureParalleles({ angle: 62, penche: 8, relation });
        const [donne, cherche] = f.arcs;
        assert.equal(mesureArc(donne), mesureArc(cherche), relation);
        assert.ok(donne.x !== cherche.x || donne.y !== cherche.y,
            `${relation} : les deux angles doivent être à DEUX croisements`);
    }
    // Les deux parallèles sont en pointillés — c'est ce qui les déclare
    // parallèles sans l'écrire.
    const f = figureParalleles({ angle: 62, penche: 0 });
    assert.equal(f.traits.filter(t => t.pointille).length, 2);
});

test('la chaîne passe vraiment par un pas intermédiaire', () => {
    const m = G.generate({ niveau: '2' }, { rng: makeRng('ch'), index: 0 }).meta;
    assert.equal(m.famille, 'chaine');
    assert.equal(m.relais, 180 - m.donne, 'le premier pas est un supplémentaire');
    assert.equal(m.reponse, m.relais, 'le second pas est une égalité');
    // Le relais est DESSINÉ : sans lui, « passe par l'angle ① » ne montre rien.
    assert.ok(m.figure.arcs.some(a => a.role === 'relais'));
});

test('le niveau demandé est celui qu\'on obtient', () => {
    for (const niveau of ['0', '1', '2']) {
        for (let i = 0; i < 30; i++) {
            const m = G.generate({ niveau }, { rng: makeRng('n' + niveau + i), index: i }).meta;
            assert.equal(String(m.niveau), niveau);
        }
    }
    // Mélangé : les trois niveaux apparaissent sur une fiche ordinaire, et
    // dans l'ordre — on ne commence pas une série par la chaîne.
    const niveaux = Array.from({ length: 12 }, (_, i) => tirer({ niveau: 'melange' }, i).meta.niveau);
    assert.deepEqual(niveaux.slice(0, 6), [0, 0, 1, 1, 1, 2]);
});

test('les réglages de relations sont respectés', () => {
    for (let i = 0; i < 40; i++) {
        const m = G.generate({ niveau: '1', familles: ['supplementaires'] },
            { rng: makeRng('f' + i), index: i }).meta;
        assert.equal(m.famille, 'supplementaires');
    }
});

test('aucun distracteur ne vaut la bonne réponse', () => {
    for (let i = 0; i < 200; i++) {
        const it = tirer({}, i);
        const bons = it.choices.filter(c => c.correct);
        assert.equal(bons.length, 1, 'une seule bonne réponse');
        const valeurs = it.choices.map(c => c.value);
        assert.equal(new Set(valeurs).size, valeurs.length, `doublon parmi ${valeurs.join(', ')}`);
    }
});

test('l\'étiquette d\'un petit angle s\'éloigne du sommet', () => {
    // Sinon « 10° » ne tient pas entre les deux côtés : c'est ce qu'on fait à
    // la main, et sans quoi les petits angles sont illisibles.
    const petit = { x: 0, y: 0, de: 0, a: 12 };
    const grand = { x: 0, y: 0, de: 0, a: 80 };
    const d = (p) => Math.hypot(p.x, p.y);
    assert.ok(d(ancreArc(petit)) > d(ancreArc(grand)) * 1.3);
});

test('la figure tient dans son cadre', () => {
    // Les rendus la posent dans un carré : un trait qui en sort déborde sur le
    // bloc voisin de la feuille.
    for (let i = 0; i < 120; i++) {
        const m = tirer({}, i).meta;
        m.figure.traits.forEach(t => {
            [[t.x1, t.y1], [t.x2, t.y2]].forEach(([x, y]) => {
                assert.ok(Math.abs(x) <= 2.2 && Math.abs(y) <= 2.2,
                    `${m.famille} : un trait sort du cadre (${x.toFixed(2)}, ${y.toFixed(2)})`);
            });
        });
    }
});

// --- LE CODAGE DES PARALLÈLES ---------------------------------------------------

test('AUCUNE MARQUE SUR LE TRAIT — le pointillé suffit à dire « parallèles »', () => {
    // Rémy, deux fois : « je ne comprends pas pourquoi tu mets des flèches »,
    // puis « ne mets pas de flèche sur les tracés des valeurs manquantes des
    // angles ». Le chevron est bien le codage des manuels, mais posé sur une
    // droite qui s'arrête au bord du cadre il se lit comme une pointe — et un
    // codage qu'on lit de travers est pire que pas de codage.
    //
    // CE QUI PORTE L'INFORMATION reste : le POINTILLÉ distingue les deux
    // parallèles de la sécante, et la consigne le dit en toutes lettres.
    const vus = new Set();
    for (let k = 0; k < 60; k++) {
        const it = G.generate({}, { rng: makeRng(`chev${k}`), index: k });
        const pointes = (it.prompt.html.match(/ar-chevron|marker-end|polyline class="ar-fleche/g) || []).length;
        assert.equal(pointes, 0,
            `${it.meta.famille} : ${pointes} marque(s) sur le trait`);
        const pointilles = (it.prompt.html.match(/ar-trait--par/g) || []).length;
        // Les parallèles restent distinguables : quand il y en a, elles sont
        // DEUX, et elles seules sont en pointillés.
        assert.ok(pointilles === 0 || pointilles === 2,
            `${it.meta.famille} : ${pointilles} droites en pointillés`);
        vus.add(pointilles > 0);
    }
    // On a bien rencontré les deux cas : des figures à parallèles, et des
    // figures sans. Sinon le test ne prouverait que la moitié de la règle.
    assert.deepEqual([...vus].sort(), [false, true]);
});
