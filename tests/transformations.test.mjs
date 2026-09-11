// Les transformations sur quadrillage : tout doit tomber sur un carreau, et
// une question ne doit jamais avoir deux bonnes réponses.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    TRANSFORMATIONS, NOMS, GESTES, TYPES_AXE,
    parAxe, parCentre, parVecteur, parRotation, appliquer, imageFigure,
    memeFigure, surLeQuadrillage, comparer, centreDe,
    transfosEntre, genresEntre, decrire, direVecteur, nommerAxe, ecrireDemi
} from '../js/core/transformations.js';

const L = [{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }, { x: 2, y: 3 }];   // un L
const p = (x, y) => ({ x, y });

test('les quatre transformations sont nommées et gestuées', () => {
    assert.equal(TRANSFORMATIONS.length, 4);
    TRANSFORMATIONS.forEach(t => {
        assert.ok(NOMS[t] && NOMS[t].length > 5, t);
        assert.ok(GESTES[t] && GESTES[t].length > 3, t);
    });
});

// --- Chaque transformation, une par une --------------------------------------

test('la symétrie axiale reflète, dans les quatre directions', () => {
    assert.deepEqual(parAxe(p(1, 5), { type: 'v', a: 3 }), p(5, 5));
    assert.deepEqual(parAxe(p(4, 2), { type: 'h', a: 5 }), p(4, 8));
    // y = x : la diagonale échange les coordonnées.
    assert.deepEqual(parAxe(p(2, 7), { type: 'd', a: 0 }), p(7, 2));
    // y = -x + 10.
    assert.deepEqual(parAxe(p(3, 4), { type: 'a', a: 10 }), p(6, 7));
});

test('un axe entre deux colonnes reste sur le quadrillage', () => {
    // Le cas le plus fréquent d'une fiche : l'axe passe ENTRE deux cases.
    const image = imageFigure(L, { genre: 'axiale', axe: { type: 'v', a: 2.5 } });
    assert.ok(surLeQuadrillage(image), JSON.stringify(image));
    assert.deepEqual(image[0], p(4, 1));
});

test('la symétrie centrale est un demi-tour, et deux demi-tours ne bougent rien', () => {
    const c = p(3, 3);
    assert.deepEqual(parCentre(p(1, 2), c), p(5, 4));
    assert.deepEqual(parCentre(parCentre(p(1, 2), c), c), p(1, 2));
    // Un centre au milieu d'une case : les images restent entières.
    assert.ok(surLeQuadrillage(imageFigure(L, { genre: 'centrale', centre: p(2.5, 2.5) })));
});

test('la translation glisse sans retourner : la figure garde son sens', () => {
    const v = { x: 4, y: -3 };
    const image = imageFigure(L, { genre: 'translation', vecteur: v });
    assert.deepEqual(image[0], p(5, -2));
    // Le sens de parcours est conservé : les écarts entre cases sont les mêmes.
    for (let i = 1; i < L.length; i++) {
        assert.equal(image[i].x - image[i - 1].x, L[i].x - L[i - 1].x);
        assert.equal(image[i].y - image[i - 1].y, L[i].y - L[i - 1].y);
    }
});

test('quatre quarts de tour ramènent au départ, et deux font un demi-tour', () => {
    const c = p(2, 2);
    let q = p(5, 1);
    for (let i = 0; i < 4; i++) q = parRotation(q, c, 1);
    assert.deepEqual(q, p(5, 1));
    // DEUX quarts de tour, c'est exactement la symétrie centrale : c'est
    // pourquoi le demi-tour ne fait jamais partie des réponses proposées.
    assert.deepEqual(parRotation(p(5, 1), c, 2), parCentre(p(5, 1), c));
});

test('appliquer sait faire les quatre, et ne plante pas sans transformation', () => {
    assert.deepEqual(appliquer(p(1, 1), null), p(1, 1));
    assert.deepEqual(appliquer(p(1, 1), { genre: 'inconnue' }), p(1, 1));
    assert.deepEqual(appliquer(p(1, 1), { genre: 'translation', vecteur: { x: 2, y: 2 } }), p(3, 3));
});

// --- Comparer ce que l'élève a posé ------------------------------------------

test('l\'ordre des cases ne compte pas : on demande un dessin, pas une liste', () => {
    assert.ok(memeFigure(L, [...L].reverse()));
    assert.ok(!memeFigure(L, L.slice(1)));
    assert.ok(!memeFigure(L, [...L.slice(1), p(9, 9)]));
    // Une figure qui répète une case est mal formée : ce n'est pas la même.
    assert.ok(!memeFigure([p(1, 1), p(1, 1)], [p(1, 1), p(2, 2)]));
});

test('la correction dit ce qui manque ET ce qui est en trop', () => {
    // « Faux » n'apprend rien ; « il t'en manque deux, et celle-là est en
    // trop » se regarde et se corrige.
    const r = comparer(L, [p(1, 1), p(1, 2), p(7, 7)]);
    assert.equal(r.justes, 2);
    assert.equal(r.oublies.length, 2);
    assert.deepEqual(r.enTrop, [p(7, 7)]);
    assert.deepEqual(comparer(L, L).oublies, []);
    assert.deepEqual(comparer(L, L).enTrop, []);
});

// --- Retrouver la transformation ---------------------------------------------

test('on retrouve la translation qui mène d\'une pièce à l\'autre', () => {
    const t = { genre: 'translation', vecteur: { x: 5, y: 0 } };
    const trouvees = transfosEntre(L, imageFigure(L, t));
    const trans = trouvees.find(x => x.genre === 'translation');
    assert.ok(trans, JSON.stringify(trouvees));
    assert.deepEqual(trans.vecteur, { x: 5, y: 0 });
});

test('on retrouve la symétrie centrale, et son centre', () => {
    const c = p(4, 4);
    const trouvee = transfosEntre(L, imageFigure(L, { genre: 'centrale', centre: c }))
        .find(x => x.genre === 'centrale');
    assert.ok(trouvee);
    assert.deepEqual(trouvee.centre, c);
});

test('on retrouve les axes, y compris les obliques à 45°', () => {
    for (const axe of [{ type: 'v', a: 4 }, { type: 'h', a: 3 }, { type: 'd', a: 1 }, { type: 'a', a: 8 }]) {
        const image = imageFigure(L, { genre: 'axiale', axe });
        const trouvee = transfosEntre(L, image).find(x => x.genre === 'axiale');
        assert.ok(trouvee, `${axe.type} = ${axe.a} : rien trouvé`);
        // Ce n'est pas forcément LE même axe — une figure peut avoir plusieurs
        // symétries —, mais celui qu'on rend doit marcher.
        assert.ok(memeFigure(imageFigure(L, trouvee), image), `${axe.type} : axe faux`);
    }
});

test('on retrouve le quart de tour, dans les deux sens', () => {
    for (const quarts of [1, 3]) {
        const t = { genre: 'rotation', centre: p(3, 3), quarts };
        const image = imageFigure(L, t);
        const trouvee = transfosEntre(L, image).find(x => x.genre === 'rotation');
        assert.ok(trouvee, `${quarts} quart(s) : rien trouvé`);
        assert.ok(memeFigure(imageFigure(L, trouvee), image));
    }
});

test('deux figures étrangères ne sont reliées par rien', () => {
    assert.deepEqual(transfosEntre(L, [p(0, 0), p(5, 5), p(9, 1), p(2, 8)]), []);
    assert.deepEqual(transfosEntre(L, L.slice(1)), [], 'tailles différentes');
    assert.deepEqual(transfosEntre([], []), []);
    assert.deepEqual(transfosEntre(null, L), []);
});

test('UNE FIGURE SYMÉTRIQUE D\'ELLE-MÊME donne plusieurs réponses — et on le sait', () => {
    // Un carré translaté est AUSSI un carré réfléchi. Une question posée
    // là-dessus aurait deux bonnes réponses, et la correction donnerait tort à
    // un élève qui a raison. C'est ce que `genresEntre` permet d'écarter.
    const carre = [p(0, 0), p(1, 0), p(0, 1), p(1, 1)];
    const genres = genresEntre(carre, imageFigure(carre, { genre: 'translation', vecteur: { x: 4, y: 0 } }));
    assert.ok(genres.length > 1, `un carré translaté devrait être ambigu : ${genres}`);

    // Le L, lui, n'a aucune symétrie : le translaté n'est QUE translaté.
    const genresL = genresEntre(L, imageFigure(L, { genre: 'translation', vecteur: { x: 4, y: 0 } }));
    assert.deepEqual(genresL, ['translation']);
});

test('la figure identique à elle-même n\'est pas une question', () => {
    // Zéro déplacement : la translation nulle marche, et la question « par
    // quelle transformation ? » n'a pas de sens. Le générateur doit l'écarter,
    // et pour cela il faut que le cas soit détecté.
    const genres = genresEntre(L, L);
    assert.ok(genres.includes('translation'));
});

// --- Les mots ------------------------------------------------------------------

test('un vecteur se dit avec les mots de la fiche, et l\'ordonnée descend', () => {
    assert.equal(direVecteur({ x: 4, y: 3 }), '4 carreaux vers la droite et 3 vers le bas');
    assert.equal(direVecteur({ x: -1, y: 0 }), '1 carreau vers la gauche');
    assert.equal(direVecteur({ x: 0, y: -2 }), '2 vers le haut');
    assert.equal(direVecteur({ x: 0, y: 0 }), 'aucun déplacement');
});

test('les nombres s\'écrivent en français, virgule comprise', () => {
    assert.equal(ecrireDemi(3), '3');
    assert.equal(ecrireDemi(2.5), '2,5');
    assert.match(nommerAxe({ type: 'v', a: 2.5 }), /x = 2,5/);
    assert.match(nommerAxe({ type: 'd', a: 0 }), /oblique/);
});

test('chaque transformation sait se décrire, sans « undefined »', () => {
    const exemples = [
        { genre: 'axiale', axe: { type: 'h', a: 4 } },
        { genre: 'centrale', centre: p(2.5, 3) },
        { genre: 'translation', vecteur: { x: 2, y: -1 } },
        { genre: 'rotation', centre: p(1, 1), quarts: 3 }
    ];
    exemples.forEach(t => {
        const s = decrire(t);
        assert.ok(s.length > 10, JSON.stringify(t));
        assert.ok(!/undefined|NaN/.test(s), s);
    });
    assert.equal(decrire(null), '');
});

// --- Ce qui doit rester vrai quoi qu'il arrive --------------------------------

test('AUCUNE transformation ne fait sortir du quadrillage', () => {
    // Une image à coordonnées non entières serait impossible à poser : l'élève
    // cliquerait des cases et n'atteindrait jamais la bonne figure.
    const transfos = [
        { genre: 'axiale', axe: { type: 'v', a: 3.5 } },
        { genre: 'axiale', axe: { type: 'h', a: 2 } },
        { genre: 'axiale', axe: { type: 'd', a: 2 } },
        { genre: 'axiale', axe: { type: 'a', a: 7 } },
        { genre: 'centrale', centre: p(2.5, 3.5) },
        { genre: 'translation', vecteur: { x: -3, y: 4 } },
        { genre: 'rotation', centre: p(2, 2), quarts: 1 },
        { genre: 'rotation', centre: p(2.5, 2.5), quarts: 3 }
    ];
    for (const t of transfos) {
        assert.ok(surLeQuadrillage(imageFigure(L, t)), JSON.stringify(t));
    }
});

test('toute transformation conserve la figure : même nombre de cases, aucun doublon', () => {
    const transfos = [
        { genre: 'axiale', axe: { type: 'a', a: 5 } },
        { genre: 'centrale', centre: p(0, 0) },
        { genre: 'translation', vecteur: { x: 7, y: 7 } },
        { genre: 'rotation', centre: p(4, 1), quarts: 1 }
    ];
    for (const t of transfos) {
        const im = imageFigure(L, t);
        assert.equal(im.length, L.length);
        assert.equal(new Set(im.map(q => `${q.x}|${q.y}`)).size, L.length, JSON.stringify(t));
    }
});

test('le centre d\'une figure se pose au demi-carreau', () => {
    assert.deepEqual(centreDe([p(0, 0), p(1, 0)]), p(0.5, 0));
    assert.deepEqual(centreDe([p(0, 0), p(2, 2)]), p(1, 1));
    assert.deepEqual(centreDe([]), p(0, 0));
});

test('les axes déclarés sont ceux que le module sait tracer', () => {
    assert.deepEqual(TYPES_AXE, ['v', 'h', 'd', 'a']);
    TYPES_AXE.forEach(type => {
        assert.ok(nommerAxe({ type, a: 1 }).length > 5, type);
        assert.ok(surLeQuadrillage(imageFigure(L, { genre: 'axiale', axe: { type, a: 1 } })), type);
    });
});
