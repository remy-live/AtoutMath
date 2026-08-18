// TRACER L'IMAGE SUR LE QUADRILLAGE — le générateur et le dessin.
//
// Ce qui se vérifie ici n'est pas « ça marche » mais « ça ne ment jamais » :
// une question dont l'image sortirait de la grille, ou dont la réponse
// attendue ne serait pas celle que le noyau calcule, donnerait tort à un élève
// qui a raison. C'est le seul défaut qu'un exercice corrigé par la machine
// n'a pas le droit d'avoir.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    GENRES, consigneDe, figureAuHasard, imageAttendue, tirerQuestion,
    transfoQuadrillageGenerator as G
} from '../js/core/generators/transfoQuadrillage.js';
import { cleFigure, imageFigure, memeFigure } from '../js/core/transformations.js';
import { droiteDeLAxe, quadrillageSvg, versDessin } from '../js/core/quadrillageSvg.js';

const TIRAGES = 120;

// --- La figure de départ ------------------------------------------------------

test('la figure est d\'un seul tenant, et de la taille demandée', () => {
    for (let i = 0; i < 40; i++) {
        const f = figureAuHasard(makeRng('f' + i), 5, { x0: 1, y0: 1, x1: 8, y1: 8 });
        assert.equal(f.length, 5);
        // Connexe : depuis la première case, on doit toutes les atteindre.
        const vues = new Set([`${f[0].x}|${f[0].y}`]);
        const pile = [f[0]];
        while (pile.length) {
            const p = pile.pop();
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const k = `${p.x + dx}|${p.y + dy}`;
                if (vues.has(k)) continue;
                const v = f.find(q => q.x === p.x + dx && q.y === p.y + dy);
                if (v) { vues.add(k); pile.push(v); }
            }
        }
        assert.equal(vues.size, 5, 'figure en morceaux : elle ne se retient pas');
    }
});

test('la figure reste dans la boîte qu\'on lui donne', () => {
    for (let i = 0; i < 30; i++) {
        const f = figureAuHasard(makeRng('b' + i), 4, { x0: 2, y0: 3, x1: 5, y1: 6 });
        f.forEach(p => {
            assert.ok(p.x >= 2 && p.x <= 5, `x hors boîte : ${p.x}`);
            assert.ok(p.y >= 3 && p.y <= 6, `y hors boîte : ${p.y}`);
        });
    }
});

// --- Ce que le générateur refuse de produire ----------------------------------

test('une image sort-elle du quadrillage ? jamais', () => {
    for (let i = 0; i < TIRAGES; i++) {
        const it = G.generate({}, { rng: makeRng('q' + i), index: i });
        it.meta.image.forEach(p => {
            assert.ok(Number.isInteger(p.x) && Number.isInteger(p.y), 'case hors carreaux');
            assert.ok(p.x >= 0 && p.x < it.meta.largeur, `colonne ${p.x} hors grille`);
            assert.ok(p.y >= 0 && p.y < it.meta.hauteur, `ligne ${p.y} hors grille`);
        });
    }
});

test('l\'image ne chevauche jamais la figure de départ', () => {
    for (let i = 0; i < TIRAGES; i++) {
        const m = G.generate({}, { rng: makeRng('c' + i), index: i }).meta;
        const pris = new Set(m.depart.map(p => `${p.x}|${p.y}`));
        m.image.forEach(p => assert.ok(!pris.has(`${p.x}|${p.y}`),
            'une case appartiendrait aux deux figures'));
    }
});

test('l\'image n\'est jamais la figure de départ elle-même', () => {
    for (let i = 0; i < TIRAGES; i++) {
        const m = G.generate({}, { rng: makeRng('d' + i), index: i }).meta;
        assert.ok(!memeFigure(m.depart, m.image), 'la question n\'aurait plus d\'objet');
    }
});

test('l\'image compte exactement autant de cases que le départ', () => {
    for (let i = 0; i < TIRAGES; i++) {
        const m = G.generate({}, { rng: makeRng('e' + i), index: i }).meta;
        assert.equal(m.image.length, m.depart.length);
    }
});

// --- LA RÉPONSE ATTENDUE EST CELLE DU NOYAU -----------------------------------

test('LA RÉPONSE ENREGISTRÉE EST EXACTEMENT L\'IMAGE CALCULÉE PAR LE NOYAU', () => {
    // Si ces deux-là divergeaient, l'élève aurait beau tracer juste, la
    // correction lui donnerait tort — et rien à l'écran ne le dirait.
    for (let i = 0; i < TIRAGES; i++) {
        const it = G.generate({}, { rng: makeRng('r' + i), index: i });
        assert.equal(it.answer, cleFigure(imageFigure(it.meta.depart, it.meta.transfo)));
        assert.equal(it.answer, cleFigure(imageAttendue(it.meta)));
    }
});

test('l\'ordre des cliques ne change pas la réponse', () => {
    const it = G.generate({}, { rng: makeRng('ordre'), index: 0 });
    const inverse = [...it.meta.image].reverse();
    assert.equal(cleFigure(inverse), it.answer);
    assert.equal(cleFigure([...it.meta.image].sort((a, b) => a.x - b.x)), it.answer);
});

test('une même graine redonne exactement la même question', () => {
    const a = G.generate({}, { rng: makeRng('meme'), index: 0 });
    const b = G.generate({}, { rng: makeRng('meme'), index: 0 });
    assert.equal(a.answer, b.answer);
    assert.equal(a.prompt.text, b.prompt.text);
});

// --- Les réglages -------------------------------------------------------------

test('le réglage « Transformations » est respecté', () => {
    for (const genre of GENRES) {
        for (let i = 0; i < 25; i++) {
            const m = G.generate({ genres: [genre] }, { rng: makeRng(genre + i), index: i }).meta;
            assert.equal(m.genre, genre, `on a demandé ${genre} et reçu ${m.genre}`);
        }
    }
});

test('un réglage vide retombe sur les quatre transformations', () => {
    const vus = new Set();
    for (let i = 0; i < 80; i++) {
        vus.add(G.generate({ genres: [] }, { rng: makeRng('v' + i), index: i }).meta.genre);
    }
    GENRES.forEach(g => assert.ok(vus.has(g), `${g} n'est jamais sorti`));
});

test('SANS LES OBLIQUES, AUCUN AXE À 45° NE SORT', () => {
    // C'est un autre exercice : devant une diagonale on ne compte plus ni
    // lignes ni colonnes, et l'élève de sixième se retrouve sans méthode.
    for (let i = 0; i < 80; i++) {
        const m = G.generate({ genres: ['axiale'], obliques: false },
            { rng: makeRng('o' + i), index: i }).meta;
        assert.ok(['v', 'h'].includes(m.transfo.axe.type), `axe ${m.transfo.axe.type} interdit ici`);
    }
});

test('avec les obliques, les quatre familles d\'axes finissent par sortir', () => {
    const vus = new Set();
    for (let i = 0; i < 200; i++) {
        vus.add(G.generate({ genres: ['axiale'], obliques: true },
            { rng: makeRng('t' + i), index: i }).meta.transfo.axe.type);
    }
    ['v', 'h', 'd', 'a'].forEach(t => assert.ok(vus.has(t), `aucun axe de type ${t}`));
});

test('le quadrillage suit le réglage de taille', () => {
    const p = G.generate({ taille: 'petit' }, { rng: makeRng('p'), index: 0 }).meta;
    const g = G.generate({ taille: 'grand' }, { rng: makeRng('g'), index: 0 }).meta;
    assert.equal(p.largeur, 8);
    assert.equal(p.depart.length, 4);
    assert.equal(g.largeur, 12);
    assert.equal(g.depart.length, 6);
});

test('JAMAIS DE DEMI-TOUR PRÉSENTÉ COMME UNE ROTATION', () => {
    // Un demi-tour EST une symétrie centrale : la question aurait deux
    // réponses justes et n'en compterait qu'une.
    for (let i = 0; i < 60; i++) {
        const m = G.generate({ genres: ['rotation'] }, { rng: makeRng('rot' + i), index: i }).meta;
        assert.ok([1, 3].includes(m.transfo.quarts), `quarts = ${m.transfo.quarts}`);
    }
});

// --- Les mots -----------------------------------------------------------------

test('la consigne nomme la transformation demandée', () => {
    assert.match(consigneDe({ genre: 'axiale', axe: { type: 'v', a: 3 } }), /symétrie d'axe/);
    assert.match(consigneDe({ genre: 'centrale', centre: { x: 1, y: 1 } }), /centre O/);
    assert.match(consigneDe({ genre: 'translation', vecteur: { x: 4, y: -3 } }),
        /4 carreaux vers la droite et 3 vers le haut/);
    assert.match(consigneDe({ genre: 'rotation', centre: { x: 0, y: 0 }, quarts: 3 }),
        /quart de tour vers la droite/);
});

test('chaque question porte une consigne, des indices et une correction', () => {
    for (let i = 0; i < 40; i++) {
        const it = G.generate({}, { rng: makeRng('m' + i), index: i });
        assert.ok(it.prompt.text.length > 20, 'consigne vide');
        assert.ok(it.hints.length >= 3, 'moins de trois indices');
        assert.match(it.explanation, /Elle occupe les cases/);
        assert.equal(it.answerKind, 'grid');
        assert.match(it.skillId, /^geo\.transfo\./);
    }
});

test('l\'énoncé porte sa figure — le carnet d\'erreurs doit pouvoir la remontrer', () => {
    const it = G.generate({}, { rng: makeRng('fig'), index: 0 });
    assert.match(it.prompt.html, /figure-wrap/);
    assert.match(it.prompt.html, /<svg/);
    assert.match(it.prompt.html, /qd-depart/);
});

// --- Le dessin ----------------------------------------------------------------

test('LE DEMI-CARREAU N\'EST APPLIQUÉ QU\'UNE FOIS', () => {
    // La case (3 ; 2) occupe le carré de (3 ; 2) à (4 ; 3) : son centre est en
    // (3,5 ; 2,5). Un axe d'équation x = 3 en cases passe donc par la
    // verticale d'abscisse 3,5 sur le dessin. C'est la seule subtilité du
    // module, et deux conversions différentes déplaceraient l'axe.
    assert.equal(versDessin(3), 3.5);
    assert.deepEqual(droiteDeLAxe({ type: 'v', a: 3 }), { verticale: true, a: 0, b: 3.5 });
    assert.deepEqual(droiteDeLAxe({ type: 'h', a: 2.5 }), { verticale: false, a: 0, b: 3 });
    // Sur une diagonale montante, les deux demi-carreaux se compensent ;
    // sur la descendante, ils s'ajoutent.
    assert.deepEqual(droiteDeLAxe({ type: 'd', a: 4 }), { verticale: false, a: 1, b: 4 });
    assert.deepEqual(droiteDeLAxe({ type: 'a', a: 4 }), { verticale: false, a: -1, b: 5 });
});

test('la droite du dessin passe bien par le milieu de deux cases symétriques', () => {
    // Vérification par le calcul plutôt que par l'œil : le milieu du segment
    // qui joint une case et son image doit tomber SUR la droite tracée.
    const axe = { type: 'v', a: 3.5 };
    const d = droiteDeLAxe(axe);
    const depart = { x: 2, y: 1 };
    const image = { x: 2 * axe.a - depart.x, y: depart.y };
    const milieu = versDessin((depart.x + image.x) / 2);
    assert.equal(milieu, d.b);
});

test('le quadrillage dessiné porte ses carreaux, ses cases et son axe', () => {
    const svg = quadrillageSvg({
        largeur: 6, hauteur: 5,
        figures: [{ cases: [{ x: 1, y: 1 }, { x: 1, y: 2 }], classe: 'qd-depart' }],
        transfo: { genre: 'axiale', axe: { type: 'v', a: 2.5 } }
    });
    // 7 verticales + 6 horizontales pour une grille de 6 × 5.
    assert.equal((svg.match(/qd-grille/g) || []).length, 13);
    assert.equal((svg.match(/qd-depart/g) || []).length, 2);
    assert.equal((svg.match(/qd-axe/g) || []).length, 1);
    assert.match(svg, /qd-marques/);
    assert.ok(!/qd-hit/.test(svg), 'un énoncé figé n\'a pas de cibles cliquables');
});

test('le quadrillage interactif porte une cible par case, et elles passent en dernier', () => {
    const svg = quadrillageSvg({
        largeur: 4, hauteur: 3,
        figures: [{ cases: [{ x: 0, y: 0 }], classe: 'qd-depart' }],
        transfo: { genre: 'centrale', centre: { x: 2, y: 1 } },
        interactive: true
    });
    assert.equal((svg.match(/class="qd-hit"/g) || []).length, 12);
    assert.match(svg, /data-c="3,2"/);
    // Posées avant les figures, les cibles auraient été recouvertes et la
    // moitié de la grille aurait cessé de répondre.
    assert.ok(svg.indexOf('qd-depart') < svg.indexOf('qd-hit'));
    assert.ok(svg.indexOf('qd-marques') < svg.indexOf('qd-hit'));
});

test('le rayon de l\'arc de rotation est en pixels, pas en carreaux', () => {
    // Écrit en carreaux, l'arc était plus petit que le trait qui le dessine :
    // le sens du quart de tour devenait invisible, et la question ambiguë.
    const svg = quadrillageSvg({
        largeur: 6, hauteur: 6, cote: 30,
        transfo: { genre: 'rotation', centre: { x: 2, y: 2 }, quarts: 1 }
    });
    const arc = svg.match(/A (\d+(?:\.\d+)?) /);
    assert.ok(arc, 'aucun arc tracé');
    assert.ok(Number(arc[1]) > 10, `rayon de ${arc[1]} : invisible`);
});

test('deux quadrillages d\'une même page n\'ont pas les mêmes identifiants', () => {
    // Sans préfixe distinct, la flèche du second irait chercher la définition
    // du premier — et sur une feuille imprimée, une seule des deux existe.
    const a = quadrillageSvg({ largeur: 3, hauteur: 3, prefixe: 'un' });
    const b = quadrillageSvg({ largeur: 3, hauteur: 3, prefixe: 'deux' });
    assert.match(a, /id="un-fleche"/);
    assert.match(b, /id="deux-fleche"/);
});

// --- Le tirage ----------------------------------------------------------------

test('un tirage qui ne donne rien de propre rend null, il n\'invente pas', () => {
    // Une grille de 3 × 3 ne peut pas contenir une figure de 5 cases avec sa
    // marge, encore moins son image : il faut le dire, pas le bricoler.
    let nuls = 0;
    for (let i = 0; i < 30; i++) {
        if (!tirerQuestion(makeRng('n' + i), { genre: 'axiale', l: 3, h: 3, cases: 5 })) nuls++;
    }
    assert.equal(nuls, 30);
});

test('même dans un quadrillage trop petit, le générateur rend une question jouable', () => {
    // Le dernier recours est déterministe : mieux vaut un L translaté qu'un
    // item vide qui bloquerait l'élève.
    const it = G.generate({ taille: 'petit' }, { rng: makeRng('secours'), index: 0 });
    assert.ok(it.meta.depart.length >= 4);
    assert.equal(it.answer, cleFigure(imageAttendue(it.meta)));
});
