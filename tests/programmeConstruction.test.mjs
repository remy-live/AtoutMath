// LE PROGRAMME DE CONSTRUCTION.
//
// Rémy : « j'aimerais bien un exercice où on a un tracé (points, segments,
// cercle) et il faut faire le programme de construction. »
//
// CE QUE CES TESTS PROTÈGENT, c'est la promesse de l'exercice : on juge la
// FIGURE, pas la rédaction. Un test qui vérifierait qu'un programme donné rend
// un texte donné figerait une formulation — exactement ce que la conception
// refuse. On vérifie donc que des programmes DIFFÉRENTS aboutissant à la même
// figure sont tous acceptés, et qu'une figure incomplète ne l'est pas.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    NIVEAUX, FAMILLES, OPERATIONS, ORDRE_FAMILLES,
    preparerNiveau, niveauxDisponibles, operationsDe,
    executer, comparer, cleObjet, intersections
} from '../js/core/programmeConstruction.js';

const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test('LES DOUZE NIVEAUX SE CONSTRUISENT, ET LEUR MODÈLE EST JUSTE', () => {
    // LE MODÈLE EST LE SUJET : on n'écrit pas la figure attendue à la main, on
    // exécute un programme et ce qu'il trace devient la cible. Si le modèle ne
    // construit pas ce qu'il annonce, c'est ici qu'on l'apprend.
    assert.equal(NIVEAUX.length, 12);
    NIVEAUX.forEach((n, i) => {
        const p = preparerNiveau(i);
        assert.ok(p, `le niveau ${n.id} ne se prépare pas`);
        assert.ok(p.attendus.length >= 1, `${n.id} n'exige aucun tracé`);
        assert.ok(comparer(p.objets, p.attendus).ok, `${n.id} : le modèle ne se valide pas lui-même`);
        // La consigne parle à un élève : elle n'est pas une étiquette.
        assert.ok(p.dit.length > 30, `${n.id} : la consigne est trop courte pour dire quoi faire`);
    });
});

test('LA PROGRESSION N\'INTRODUIT PAS DEUX MOTS À LA FOIS', () => {
    // Rémy : « sois progressif dans la difficulté ». Un niveau qui demanderait
    // deux familles nouvelles d'un coup ne dirait pas laquelle a manqué.
    const vues = new Set();
    NIVEAUX.forEach((n, i) => {
        const f = preparerNiveau(i).familles;
        const neuves = f.filter(x => !vues.has(x));
        assert.ok(neuves.length <= 1,
            `le niveau ${n.id} introduit ${neuves.length} familles nouvelles : ${neuves.join(', ')}`);
        f.forEach(x => vues.add(x));
    });
    // Et à la fin, toutes les familles ont servi : aucune n'est décorative.
    assert.deepEqual([...vues].sort(), [...ORDRE_FAMILLES].sort());
});

test('LES RÉGLAGES OUVRENT ET FERMENT VRAIMENT DES NIVEAUX', () => {
    // Rémy : « on peut avoir ce que l'on veut mettre (segments, parallèles,
    // perpendiculaires, cercles) ». Cocher une famille de moins doit retirer
    // les niveaux qui en dépendent, et EUX SEULS.
    assert.deepEqual(niveauxDisponibles(['traits']), [0, 1]);
    const sansCercle = niveauxDisponibles(ORDRE_FAMILLES.filter(f => f !== 'cercles'));
    NIVEAUX.forEach((n, i) => {
        const aBesoin = preparerNiveau(i).familles.includes('cercles');
        assert.equal(sansCercle.includes(i), !aBesoin, `${n.id} mal filtré sans les cercles`);
    });
    // Sans rien de coché, on ne bride rien : c'est le réglage par défaut.
    assert.equal(niveauxDisponibles([]).length, NIVEAUX.length);
    assert.equal(operationsDe([]).length, Object.keys(OPERATIONS).length);
    assert.equal(operationsDe(['traits']).map(o => o.id).join(','), 'segment,droite');
});

test('LA MÊME FIGURE PAR UN AUTRE CHEMIN EST ACCEPTÉE', () => {
    // C'EST LA PROMESSE DE L'EXERCICE. « Trace la médiatrice de [AB] » et
    // « place le milieu, puis trace la perpendiculaire » donnent LA MÊME
    // droite. Corriger la rédaction reviendrait à choisir une des deux.
    const n = preparerNiveau('mediatrice');
    const autre = executer([
        { op: 'segment', args: ['A', 'B'] },
        { op: 'milieu', args: ['A', 'B'] },
        { op: 'perpendiculaire', args: ['A', 'B', 'C'] }
    ], n.depart);
    assert.equal(autre.erreur, null);
    assert.ok(comparer(autre.objets, n.attendus).ok);
});

test('L\'ORDRE DES TRACÉS INDÉPENDANTS EST LIBRE', () => {
    const n = preparerNiveau('triangle');
    const autre = executer([
        { op: 'segment', args: ['C', 'B'] },
        { op: 'segment', args: ['A', 'C'] },
        { op: 'segment', args: ['B', 'A'] }
    ], n.depart);
    assert.ok(comparer(autre.objets, n.attendus).ok);
});

test('DEUX CERCLES SE COUPENT EN DEUX POINTS, ET IL FAUT CHOISIR LE BON', () => {
    // Un énoncé honnête dit « l'UN des deux points d'intersection », et l'on
    // crée donc les deux : faire choisir avant de voir serait un pile ou face.
    //
    // MAIS L'EXERCICE MONTRE UNE FIGURE, et les deux sommets n'en donnent pas
    // la même : l'un pointe au-dessus de [AB], l'autre au-dessous. Les deux
    // triangles sont équilatéraux — c'est le test qui l'établit — et un seul
    // est celui du dessin. Lire de quel côté est le sommet fait donc partie du
    // travail, ce qui est exactement ce qu'on demande à un élève qui reproduit
    // une figure. Le point non retenu reste un point de construction, comme sur
    // le papier.
    const n = preparerNiveau('equilateral');
    const debut = executer([
        { op: 'cercle', args: ['A', 'B'] },
        { op: 'cercle', args: ['B', 'A'] }
    ], n.depart);
    const [c1, c2] = debut.objets.map(cleObjet);
    const avecInter = executer([
        { op: 'cercle', args: ['A', 'B'] },
        { op: 'cercle', args: ['B', 'A'] },
        { op: 'intersection', args: [c1, c2] }
    ], n.depart);
    const nouveaux = Object.keys(avecInter.points).filter(k => !(k in n.depart));
    assert.equal(nouveaux.length, 2, 'deux cercles sécants doivent donner deux points');

    const reussis = nouveaux.filter(sommet => {
        const p = avecInter.points;
        // Les DEUX sont équilatéraux : c'est bien la géométrie qui est en jeu,
        // pas un hasard de nommage.
        const cotes = [d(p.A, p.B), d(p.B, p[sommet]), d(p[sommet], p.A)];
        assert.ok(Math.max(...cotes) - Math.min(...cotes) < 1e-9,
            `le sommet ${sommet} ne donne pas un triangle équilatéral`);
        const complet = executer([
            { op: 'cercle', args: ['A', 'B'] },
            { op: 'cercle', args: ['B', 'A'] },
            { op: 'intersection', args: [c1, c2] },
            { op: 'segment', args: ['A', 'B'] },
            { op: 'segment', args: ['B', sommet] },
            { op: 'segment', args: [sommet, 'A'] }
        ], n.depart);
        return comparer(complet.objets, n.attendus).ok;
    });
    assert.equal(reussis.length, 1,
        'un seul des deux sommets doit rendre LA figure montrée');
});

test('LES TRAITS DE CONSTRUCTION SONT TOLÉRÉS, LES TRACÉS EXIGÉS NE LE SONT PAS', () => {
    // « Laisse tes traits de construction apparents » : les deux cercles qui
    // donnent le triangle équilatéral sont la preuve du travail, pas une faute.
    const n = preparerNiveau('equilateral');
    assert.ok(n.objets.length > n.attendus.length, 'le modèle devrait tracer des aides');
    assert.ok(comparer(n.objets, n.attendus).ok, 'les aides ne doivent pas gêner');

    // Mais il manque un côté : ce n'est pas la figure demandée.
    const t = preparerNiveau('triangle');
    const partiel = executer([
        { op: 'segment', args: ['A', 'B'] },
        { op: 'segment', args: ['B', 'C'] }
    ], t.depart);
    const r = comparer(partiel.objets, t.attendus);
    assert.equal(r.ok, false);
    assert.equal(r.manquants.length, 1);
});

test('UN BLOC DONT LES OBJETS MANQUENT LE DIT, ET NOMME CE QUI MANQUE', () => {
    // C'EST LA VRAIE DIFFICULTÉ DE L'EXERCICE : on ne trace pas [AB] avant
    // d'avoir A et B, on ne prend pas le milieu d'un segment qui n'existe pas.
    // « Il manque le point Z » enseigne l'ordre ; « raté » n'enseigne rien.
    const n = preparerNiveau('triangle');
    const r = executer([{ op: 'segment', args: ['A', 'Z'] }], n.depart);
    assert.ok(r.erreur);
    assert.equal(r.erreur.rang, 0);
    assert.match(r.erreur.dit, /le point Z/);

    // Et ce qui suit un bloc bloqué ne s'exécute pas en douce.
    const r2 = executer([
        { op: 'segment', args: ['A', 'Z'] },
        { op: 'segment', args: ['A', 'B'] }
    ], n.depart);
    assert.equal(r2.objets.length, 0);
    assert.equal(r2.lignes[1].etat, 'jamais');
});

test('DEUX TRACÉS IDENTIQUES ONT LA MÊME CLÉ, QUEL QUE SOIT LE CHEMIN', () => {
    // C'est le cœur de la correction. [AB] tracé depuis A puis B, ou depuis B
    // puis A, est LE MÊME segment ; sans cette normalisation on corrigerait la
    // façon d'écrire au lieu de la figure.
    const p = { A: { x: 0, y: 0 }, B: { x: 10, y: 0 }, C: { x: 5, y: 0 } };
    const s1 = OPERATIONS.segment.trace(p, ['A', 'B']);
    const s2 = OPERATIONS.segment.trace(p, ['B', 'A']);
    assert.equal(cleObjet(s1), cleObjet(s2));
    // Une droite se moque de ses deux points témoins, tant qu'elle est la même.
    const d1 = OPERATIONS.droite.trace(p, ['A', 'B']);
    const d2 = OPERATIONS.droite.trace(p, ['C', 'B']);
    assert.equal(cleObjet(d1), cleObjet(d2));
    // Mais un segment n'est pas la droite qui le porte.
    assert.notEqual(cleObjet(s1), cleObjet(d1));
});

test('LE MÊME TRACÉ POSÉ DEUX FOIS NE COMPTE QU\'UNE FOIS', () => {
    // Retracer un trait est inutile, pas fautif — et la comparaison doit rester
    // une comparaison d'ENSEMBLES.
    const n = preparerNiveau('segment');
    const r = executer([
        { op: 'segment', args: ['A', 'B'] },
        { op: 'segment', args: ['B', 'A'] }
    ], n.depart);
    assert.equal(r.objets.length, 1);
});

test('UN SEGMENT S\'ARRÊTE À SES BOUTS', () => {
    // Deux segments dont les DROITES se croisent hors des segments n'ont pas de
    // point d'intersection — et le dire évite de construire sur du vent.
    const s1 = { genre: 'segment', a: { x: 0, y: 0 }, b: { x: 4, y: 0 } };
    const s2 = { genre: 'segment', a: { x: 10, y: -5 }, b: { x: 10, y: 5 } };
    assert.equal(intersections(s1, s2).length, 0);
    const d2 = { genre: 'droite', a: { x: 10, y: -5 }, b: { x: 10, y: 5 } };
    assert.equal(intersections({ genre: 'droite', a: s1.a, b: s1.b }, d2).length, 1);
});

test('LES FIGURES TIENNENT DANS LE MONDE', () => {
    // Une figure qui sortirait du cadre serait tronquée à l'écran, et l'élève
    // corrigerait un dessin qu'il ne voit pas en entier.
    NIVEAUX.forEach((n, i) => {
        const p = preparerNiveau(i);
        Object.entries(p.depart).forEach(([nom, q]) => {
            assert.ok(q.x >= 0 && q.x <= 100 && q.y >= 0 && q.y <= 70,
                `${n.id} : le point donné ${nom} est hors du monde`);
        });
    });
});

test('CHAQUE BLOC SAIT SE DIRE EN FRANÇAIS', () => {
    // Le libellé EST la leçon : c'est la phrase que l'élève doit apprendre à
    // écrire, avec ses crochets et ses parenthèses.
    assert.equal(OPERATIONS.segment.libelle(['A', 'B']), 'Trace le segment [AB]');
    assert.equal(OPERATIONS.droite.libelle(['A', 'B']), 'Trace la droite (AB)');
    assert.equal(OPERATIONS.cercle.libelle(['A', 'B']),
        'Trace le cercle de centre A passant par B');
    assert.equal(OPERATIONS.perpendiculaire.libelle(['A', 'B', 'C']),
        'Trace la perpendiculaire à (AB) passant par C');
    Object.values(OPERATIONS).forEach(op => {
        const faux = op.libelle(['A', 'B', 'C']);
        assert.ok(faux && faux.length > 10, `${op.id} n'a pas de libellé`);
        assert.ok(FAMILLES.some(f => f.id === op.famille), `${op.id} n'a pas de famille connue`);
    });
});
