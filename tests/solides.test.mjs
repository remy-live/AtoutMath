// Dénombrer sur un solide : ce qui est caché doit l'être pour de bon.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    SOLIDES, construire, aretesDe, projeter, regard, facesVisibles, aretesCachees,
    sommetsCaches, normaleSortante, dessiner, compter, euler, expliquer,
    tirerQuestion, famillesDe, accorder, elider, ASPECTS, FUYANTE
} from '../js/core/solides.js';
import { makeRng } from '../js/core/ids.js';

const tous = () => SOLIDES.map(s => construire(s.id));

test('chaque solide vérifie la relation d\'Euler', () => {
    // S − A + F = 2 sur tout polyèdre convexe. C'est le filet de l'élève, et
    // c'est aussi le nôtre : un solide mal saisi tombe ici, pas en classe.
    tous().forEach(s => {
        const e = euler(s);
        assert.ok(e.verifie, `${s.id} : ${e.S} − ${e.A} + ${e.F} = ${e.valeur} au lieu de 2`);
    });
});

test('les arêtes se déduisent des faces, sans doublon ni oubli', () => {
    tous().forEach(s => {
        // Une arête est un couple de sommets voisins, compté UNE fois.
        const clefs = s.aretes.map(([a, b]) => `${a}-${b}`);
        assert.equal(new Set(clefs).size, clefs.length, `${s.id} : arête en double`);
        // Et dans un solide fermé, chaque arête borde exactement deux faces.
        s.aretes.forEach(([a, b]) => {
            const bordent = s.faces.filter(f => f.some((v, i) =>
                (v === a && f[(i + 1) % f.length] === b) || (v === b && f[(i + 1) % f.length] === a)));
            assert.equal(bordent.length, 2, `${s.id} : l'arête ${a}-${b} borde ${bordent.length} face(s)`);
        });
        // Aucun sommet ne reste en l'air.
        s.sommets.forEach((_, i) => {
            assert.ok(s.aretes.some(([a, b]) => a === i || b === i), `${s.id} : sommet ${i} isolé`);
        });
    });
});

test('les familles annoncées tiennent leur compte', () => {
    // Un prisme à base n : 2n sommets, 3n arêtes, n + 2 faces. Une pyramide :
    // n + 1, 2n, n + 1. C'est le raisonnement qu'on enseigne — le catalogue
    // doit s'y conformer, sinon l'explication mentirait sur le dessin.
    tous().forEach(s => {
        if (s.famille === 'prisme') {
            assert.equal(compter(s, 'sommets'), 2 * s.n, `${s.id} : sommets`);
            assert.equal(compter(s, 'aretes'), 3 * s.n, `${s.id} : arêtes`);
            assert.equal(compter(s, 'faces'), s.n + 2, `${s.id} : faces`);
        }
        if (s.famille === 'pyramide') {
            assert.equal(compter(s, 'sommets'), s.n + 1, `${s.id} : sommets`);
            assert.equal(compter(s, 'aretes'), 2 * s.n, `${s.id} : arêtes`);
            assert.equal(compter(s, 'faces'), s.n + 1, `${s.id} : faces`);
        }
    });
});

test('la perspective est celle du cours : fuyantes à 45°, réduites de moitié', () => {
    assert.equal(FUYANTE.angle, 45);
    assert.equal(FUYANTE.k, 0.5);
    // La face avant est en VRAIE GRANDEUR : un déplacement dans le plan (x, z)
    // ne subit aucune réduction.
    const [x0, y0] = projeter([0, 0, 0]);
    const [x1, y1] = projeter([2, 0, 0]);
    assert.equal(x1 - x0, 2);
    assert.equal(y1 - y0, 0);
    const [, y2] = projeter([0, 0, 3]);
    assert.equal(y2 - y0, -3, 'la hauteur monte à l\'écran, en vraie grandeur');
    // La profondeur, elle, part vers le haut à droite, réduite de moitié.
    const [xf, yf] = projeter([0, 2, 0]);
    assert.ok(Math.abs(xf - 2 * 0.5 * Math.cos(Math.PI / 4)) < 1e-9);
    assert.ok(yf < 0, 'ce qui est derrière se dessine plus haut');
});

test('on regarde le solide d\'AU-DESSUS : le cube montre son dessus, pas son dessous', () => {
    // Le signe de la direction du regard est l'erreur qui ne se voit qu'au
    // dessin : avec l'autre, le cube gardait le même NOMBRE de faces visibles
    // mais montrait sa face du dessous.
    const cube = construire('cube');
    const vues = facesVisibles(cube);
    const dessous = cube.faces.findIndex(f => f.every(i => cube.sommets[i][2] === 0));
    const dessus = cube.faces.findIndex(f => f.every(i => cube.sommets[i][2] > 0));
    assert.ok(vues[dessus], 'le dessus doit se voir');
    assert.ok(!vues[dessous], 'le dessous ne doit pas se voir');
    assert.equal(vues.filter(Boolean).length, 3, 'un cube en cavalière montre trois faces');
    assert.equal(aretesCachees(cube).filter(Boolean).length, 3);
    assert.equal(sommetsCaches(cube).filter(Boolean).length, 1, 'un seul sommet est derrière');
    // Et le sommet caché est bien celui du fond, en bas à gauche.
    const cache = sommetsCaches(cube).findIndex(Boolean);
    const [x, y, z] = cube.sommets[cache];
    assert.ok(y > 0 && z === 0 && x < 0, `sommet caché inattendu : ${x},${y},${z}`);
});

test('la normale sortante ne dépend pas du sens dans lequel la face est écrite', () => {
    // Une face décrite à l'envers passait pour cachée, et l'erreur ne se
    // voyait que sur le dessin. On la retourne donc au besoin.
    tous().forEach(s => {
        s.faces.forEach((f, i) => {
            const n = normaleSortante(s, f);
            const envers = normaleSortante(s, f.slice().reverse());
            assert.ok(n.every((v, k) => Math.abs(v - envers[k]) < 1e-9),
                `${s.id} face ${i} : la normale change de sens avec l'écriture`);
        });
    });
});

test('tout solide a du caché, et jamais tout', () => {
    // Un solide sans pointillés n'apprendrait rien : c'est justement ce qui
    // est derrière qu'on oublie de compter. Et un solide entièrement caché
    // serait un dessin blanc.
    tous().forEach(s => {
        const cachees = aretesCachees(s).filter(Boolean).length;
        assert.ok(cachees > 0, `${s.id} : aucune arête cachée, l'exercice perd son sel`);
        assert.ok(cachees < s.aretes.length, `${s.id} : tout est caché`);
        const vues = facesVisibles(s).filter(Boolean).length;
        assert.ok(vues > 0 && vues < s.faces.length, `${s.id} : ${vues} face(s) visible(s)`);
    });
});

test('le dessin tient dans son cadre, et chaque face a sa pastille', () => {
    tous().forEach(s => {
        const d = dessiner(s, 100, 10);
        assert.equal(d.points.length, s.sommets.length);
        assert.equal(d.centres.length, s.faces.length);
        d.points.forEach(([x, y], i) => {
            assert.ok(x >= 9.9 && x <= 90.1, `${s.id} : sommet ${i} en x=${x}`);
            assert.ok(y >= 9.9 && y <= 90.1, `${s.id} : sommet ${i} en y=${y}`);
        });
        // Deux sommets ne doivent pas se superposer : on doit pouvoir les
        // toucher un par un pour les compter.
        const clefs = d.points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`);
        assert.equal(new Set(clefs).size, clefs.length, `${s.id} : deux sommets au même endroit`);
        // Les pastilles de faces non plus, sinon on ne pourrait pas cocher
        // celle de derrière.
        const cf = d.centres.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`);
        assert.equal(new Set(cf).size, cf.length, `${s.id} : deux pastilles de faces confondues`);
    });
});

test('l\'explication donne le raisonnement, jamais le seul résultat', () => {
    tous().forEach(s => {
        ASPECTS.forEach(a => {
            const t = expliquer(s, a.id);
            assert.ok(t.length > 60, `${s.id}/${a.id} : explication trop courte`);
            assert.ok(!/undefined|NaN/.test(t), `${s.id}/${a.id} : « ${t} »`);
            // Le filet d'Euler est toujours rappelé, avec les vrais nombres.
            const e = euler(s);
            assert.ok(t.includes(`${e.S} − ${e.A} + ${e.F} = 2`), `${s.id}/${a.id} : pas de vérification`);
            // Et le compte annoncé est le bon.
            assert.ok(t.includes(`= ${compter(s, a.id)}`) || t.includes(`: ${compter(s, a.id)}`),
                `${s.id}/${a.id} : le total n'apparaît pas — « ${t} »`);
        });
    });
});

test('le tirage respecte le niveau, et ne répète pas le même solide', () => {
    const rng = makeRng('sol');
    famillesDe('facile').forEach(id => assert.ok(SOLIDES.some(s => s.id === id)));
    assert.ok(famillesDe('facile').length < famillesDe('tous').length);
    let precedent = null;
    for (let k = 0; k < 30; k++) {
        const q = tirerQuestion(rng, { niveau: 'facile', eviter: precedent });
        assert.ok(famillesDe('facile').includes(q.solide.id));
        assert.notEqual(q.solide.id, precedent, 'deux fois de suite le même solide');
        assert.equal(q.reponse, compter(q.solide, q.aspect));
        assert.ok(q.reponse >= 4);
        assert.match(q.question, /Combien/);
        precedent = q.solide.id;
    }
});

test('le même tirage donne la même question', () => {
    const a = tirerQuestion(makeRng('id'), {});
    const b = tirerQuestion(makeRng('id'), {});
    assert.equal(a.solide.id, b.solide.id);
    assert.equal(a.aspect, b.aspect);
    assert.equal(a.reponse, b.reponse);
});

test('le français de l\'exercice est juste', () => {
    // Un accord fautif affiché en permanence sous les yeux d'un élève finit
    // par s'apprendre : dans un exercice de mathématiques comme ailleurs.
    assert.equal(accorder(0, 'aretes'), '0 arête marquée');
    assert.equal(accorder(1, 'aretes'), '1 arête marquée');
    assert.equal(accorder(3, 'aretes'), '3 arêtes marquées');
    assert.equal(accorder(1, 'sommets'), '1 sommet marqué');
    assert.equal(accorder(5, 'sommets'), '5 sommets marqués');
    assert.equal(accorder(2, 'faces'), '2 faces marquées');
    // « de sommets », mais « d'arêtes ».
    assert.equal(elider('arêtes'), "d'arêtes");
    assert.equal(elider('sommets'), 'de sommets');

    // Et la question s'accorde avec le solide : une pyramide en a-t-ELLE.
    const dits = new Set();
    const rng = makeRng('fr');
    for (let k = 0; k < 60; k++) dits.add(tirerQuestion(rng, {}).question);
    dits.forEach(q => {
        assert.ok(!/ de arêtes/.test(q), `élision manquée : « ${q} »`);
        assert.ok(!/^Combien une .* a-t-il/.test(q), `mauvais genre : « ${q} »`);
        assert.ok(!/^Combien un [^e].* a-t-elle/.test(q), `mauvais genre : « ${q} »`);
    });
    assert.ok([...dits].some(q => /a-t-elle/.test(q)), 'aucune pyramide tirée ?');
    assert.ok([...dits].some(q => /d'arêtes/.test(q)));
});
