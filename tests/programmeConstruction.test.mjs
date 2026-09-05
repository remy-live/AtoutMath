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
    executer, comparer, cleObjet, intersections,
    lireInstruction, lireProgramme
} from '../js/core/programmeConstruction.js';

const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test('LES TREIZE NIVEAUX SE CONSTRUISENT, ET LEUR MODÈLE EST JUSTE', () => {
    // LE MODÈLE EST LE SUJET : on n'écrit pas la figure attendue à la main, on
    // exécute un programme et ce qu'il trace devient la cible. Si le modèle ne
    // construit pas ce qu'il annonce, c'est ici qu'on l'apprend.
    // TROIS NIVEAUX SONT PARTIS — le triangle équilatéral, le losange et le
    // cercle circonscrit. Rémy : « retire le losange et le triangle et le
    // cercle circonscrit. En fait on veut juste un programme facile avec les
    // parallèles perpendiculaires, droite, segment, demi-droite. » Ils étaient
    // les seuls à porter des traits de construction dans leur modèle, donc les
    // seuls à montrer la MÉTHODE avant qu'on l'ait écrite. Une demi-droite les
    // remplace : c'est la troisième notation du chapitre, et elle manquait.
    assert.equal(NIVEAUX.length, 13);
    NIVEAUX.forEach((n, i) => {
        const p = preparerNiveau(i);
        assert.ok(p, `le niveau ${n.id} ne se prépare pas`);
        // Les trois premiers niveaux ne tracent rien : leur figure EST une croix.
        assert.ok(p.attendus.length >= 1 || p.exiges.length >= 1,
            `${n.id} n'exige ni tracé ni point`);
        assert.ok(comparer(p.objets, p.attendus, p.points, p.exiges).ok,
            `${n.id} : le modèle ne se valide pas lui-même`);
        // L'ÉNONCÉ NE DONNE PAS LA MÉTHODE — Rémy : « tu donnes les réponses
        // dans l'énoncé ». La consigne est la même partout et ne nomme aucun
        // des objets à construire ; ce qu'il faut savoir se lit sur la figure.
        assert.ok(!/trace|place|milieu|médiatrice|perpendiculaire|parallèle|cercle de centre/i
            .test(p.dit), `${n.id} : la consigne souffle la méthode — « ${p.dit} »`);
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
    // Et à la fin, toutes les familles ont servi — SAUF UNE, et il faut la
    // nommer plutôt que de la laisser passer : « intersections » n'a plus de
    // niveau à elle depuis que le triangle équilatéral, le losange et le cercle
    // circonscrit sont partis. Le bloc reste offert, parce qu'il sert dès qu'on
    // trace deux cercles et qu'on veut nommer leur croisement ; il n'est
    // simplement plus EXIGÉ par aucune figure du programme facile.
    assert.deepEqual([...vues].sort(),
        ORDRE_FAMILLES.filter(f => f !== 'intersections').sort());
});

test('LES RÉGLAGES OUVRENT ET FERMENT VRAIMENT DES NIVEAUX', () => {
    // Rémy : « on peut avoir ce que l'on veut mettre (segments, parallèles,
    // perpendiculaires, cercles) ». Cocher une famille de moins doit retirer
    // les niveaux qui en dépendent, et EUX SEULS.
    assert.deepEqual(niveauxDisponibles(['points']), [0, 1, 2]);
    // Segments, droites ET demi-droites : les six premiers niveaux, c'est-à-dire
    // le début de sixième en entier.
    assert.deepEqual(niveauxDisponibles(['points', 'traits']), [0, 1, 2, 3, 4, 5]);
    const sansCercle = niveauxDisponibles(ORDRE_FAMILLES.filter(f => f !== 'cercles'));
    NIVEAUX.forEach((n, i) => {
        const aBesoin = preparerNiveau(i).familles.includes('cercles');
        assert.equal(sansCercle.includes(i), !aBesoin, `${n.id} mal filtré sans les cercles`);
    });
    // Sans rien de coché, on ne bride rien : c'est le réglage par défaut.
    assert.equal(niveauxDisponibles([]).length, NIVEAUX.length);
    assert.equal(operationsDe([]).length, Object.keys(OPERATIONS).length);
    assert.equal(operationsDe(['traits']).map(o => o.id).join(','), 'segment,droite,demiDroite');
    assert.equal(operationsDe(['points']).map(o => o.id).join(','), 'points');
});

test('LA MÊME FIGURE PAR UN AUTRE CHEMIN EST ACCEPTÉE', () => {
    // C'EST LA PROMESSE DE L'EXERCICE. « Trace la médiatrice de [AB] » et
    // « place le milieu, puis trace la perpendiculaire » donnent LA MÊME
    // droite. Corriger la rédaction reviendrait à choisir une des deux.
    const n = preparerNiveau('mediatrice');
    const autre = executer([
        { op: 'points', args: ['A', 'B'] },
        { op: 'segment', args: ['A', 'B'] },
        { op: 'milieu', args: ['A', 'B'] },
        { op: 'perpendiculaire', args: ['A', 'B', 'C'] }
    ], n.atlas);
    assert.equal(autre.erreur, null);
    assert.ok(comparer(autre.objets, n.attendus).ok);
});

test('L\'ORDRE DES TRACÉS INDÉPENDANTS EST LIBRE', () => {
    const n = preparerNiveau('triangle');
    const autre = executer([
        { op: 'points', args: ['A', 'B', 'C'] },
        { op: 'segment', args: ['C', 'B'] },
        { op: 'segment', args: ['A', 'C'] },
        { op: 'segment', args: ['B', 'A'] }
    ], n.atlas);
    assert.ok(comparer(autre.objets, n.attendus).ok);
});

test('DEUX CERCLES SE COUPENT EN DEUX POINTS, ET ON LES CRÉE TOUS LES DEUX', () => {
    // Un énoncé honnête dit « l'UN des deux points d'intersection », et l'on
    // crée donc les deux : faire choisir avant de voir serait un pile ou face.
    // Le point non retenu reste un point de construction, comme sur le papier.
    //
    // CE TEST NE PASSE PLUS PAR UN NIVEAU DU CATALOGUE. Il s'appuyait sur le
    // triangle équilatéral, que Rémy a fait retirer avec le losange et le
    // cercle circonscrit ; le MÉCANISME, lui, reste — le bloc « point
    // d'intersection » est toujours offert dès qu'on trace deux cercles. On
    // l'éprouve donc sur une figure écrite ici, ce qui est d'ailleurs plus
    // honnête : c'est le noyau qu'on mesure, pas la liste des niveaux.
    const atlas = { A: { x: 30, y: 55 }, B: { x: 70, y: 55 } };
    const debut = executer([
        { op: 'points', args: ['A', 'B'] },
        { op: 'cercle', args: ['A', 'B'] },
        { op: 'cercle', args: ['B', 'A'] }
    ], atlas);
    const [c1, c2] = debut.objets.map(cleObjet);
    const avecInter = executer([
        { op: 'points', args: ['A', 'B'] },
        { op: 'cercle', args: ['A', 'B'] },
        { op: 'cercle', args: ['B', 'A'] },
        { op: 'intersection', args: [c1, c2] }
    ], atlas);
    const nouveaux = Object.keys(avecInter.points).filter(k => !(k in atlas));
    assert.equal(nouveaux.length, 2, 'deux cercles sécants doivent donner deux points');
    // Et les deux donnent bien un triangle équilatéral : c'est la géométrie qui
    // est en jeu, pas un hasard de nommage.
    nouveaux.forEach(sommet => {
        const p = avecInter.points;
        const cotes = [d(p.A, p.B), d(p.B, p[sommet]), d(p[sommet], p.A)];
        assert.ok(Math.max(...cotes) - Math.min(...cotes) < 1e-9,
            `le sommet ${sommet} ne donne pas un triangle équilatéral`);
    });
    // Les deux sommets sont de part et d'autre de [AB] : lire de quel côté est
    // celui du dessin fait partie du travail.
    const [s1, s2] = nouveaux.map(k => avecInter.points[k]);
    assert.ok((s1.y - 55) * (s2.y - 55) < 0, 'les deux sommets doivent s\'opposer');
});

test('LES TRAITS EN TROP SONT TOLÉRÉS, LES TRACÉS EXIGÉS NE LE SONT PAS', () => {
    // « Laisse tes traits de construction apparents » : un tracé que l'élève a
    // ajouté pour s'aider n'est pas une faute — c'est le dessin OBTENU qu'on
    // juge, pas le chemin pris. Plus aucun niveau ne porte de traits d'aide
    // depuis le retrait des trois constructions au compas ; la tolérance, elle,
    // reste, et c'est l'élève qui s'en sert maintenant.
    const t = preparerNiveau('triangle');
    const enPlus = executer([
        { op: 'points', args: ['A', 'B', 'C'] },
        { op: 'segment', args: ['A', 'B'] },
        { op: 'segment', args: ['B', 'C'] },
        { op: 'segment', args: ['C', 'A'] },
        { op: 'droite', args: ['A', 'B'] }
    ], t.atlas);
    assert.ok(comparer(enPlus.objets, t.attendus).ok, 'un tracé en trop ne doit pas gêner');

    // Mais il manque un côté : ce n'est pas la figure demandée.
    const partiel = executer([
        { op: 'points', args: ['A', 'B', 'C'] },
        { op: 'segment', args: ['A', 'B'] },
        { op: 'segment', args: ['B', 'C'] }
    ], t.atlas);
    const r = comparer(partiel.objets, t.attendus);
    assert.equal(r.ok, false);
    assert.equal(r.manquants.length, 1);
});

test('UN BLOC DONT LES OBJETS MANQUENT LE DIT, ET NOMME CE QUI MANQUE', () => {
    // C'EST LA VRAIE DIFFICULTÉ DE L'EXERCICE : on ne trace pas [AB] avant
    // d'avoir A et B, on ne prend pas le milieu d'un segment qui n'existe pas.
    // « Il manque le point Z » enseigne l'ordre ; « raté » n'enseigne rien.
    const n = preparerNiveau('triangle');
    const r = executer([
        { op: 'points', args: ['A', 'B', 'C'] },
        { op: 'segment', args: ['A', 'Z'] }
    ], n.atlas);
    assert.ok(r.erreur);
    assert.equal(r.erreur.rang, 1);
    assert.match(r.erreur.dit, /le point Z/);

    // Et ce qui suit un bloc bloqué ne s'exécute pas en douce.
    const r2 = executer([
        { op: 'points', args: ['A', 'B', 'C'] },
        { op: 'segment', args: ['A', 'Z'] },
        { op: 'segment', args: ['A', 'B'] }
    ], n.atlas);
    assert.equal(r2.objets.length, 0);
    assert.equal(r2.lignes[2].etat, 'jamais');
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
        { op: 'points', args: ['A', 'B'] },
        { op: 'segment', args: ['A', 'B'] },
        { op: 'segment', args: ['B', 'A'] }
    ], n.atlas);
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
        Object.entries(p.donnes).forEach(([nom, q]) => {
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

// ---------------------------------------------------------------------------
// LA RÉDACTION
//
// Rémy : « je veux qu'il tape et qu'il rédige », et il a donné lui-même les
// phrases acceptables. Ces tests-là les citent : si une seule cessait d'être
// lue, l'exercice cesserait d'être le sien.

test('LES PHRASES DE RÉMY SE LISENT, MOT POUR MOT', () => {
    const dit = (t) => lireInstruction(t, { points: {}, objets: [] });
    // « On commence par un point A. Les phrases acceptables sont "Place un
    // point A". Puis on a deux points A et B : "Place 2 points A et B". […]
    // "Place 3 points A, B et C non alignés". »
    assert.deepEqual(dit('Place un point A').ins, { op: 'points', args: ['A'], nonAlignes: false });
    assert.deepEqual(dit('Place 2 points A et B').ins,
        { op: 'points', args: ['A', 'B'], nonAlignes: false });
    assert.deepEqual(dit('Place 3 points A, B et C non alignés').ins,
        { op: 'points', args: ['A', 'B', 'C'], nonAlignes: true });
});

test('« TOLÉRABLE, DESSINE OU TRACE » — et les accents ne comptent pas', () => {
    // On corrige la GÉOMÉTRIE, pas la langue : faire échouer une construction
    // juste sur un accent apprendrait quelque chose de faux.
    const args = (t) => (lireInstruction(t, { points: {}, objets: [] }).ins || {}).args;
    ['Place 2 points A et B', 'Dessine 2 points A et B', 'Trace 2 points A et B',
        'Pose 2 points A et B', 'place deux points a et b', 'PLACE 2 POINTS A ET B',
        'Place 2 points A, B', 'Place les points A et B', 'Place 2 points A B']
        .forEach(t => assert.deepEqual(args(t), ['A', 'B'], `refusée : « ${t} »`));

    const p = { A: { x: 0, y: 0 }, B: { x: 10, y: 0 } };
    const etat = { points: p, objets: [] };
    ['Trace le segment [AB]', 'trace le segment AB', 'Dessine le segment [A B]',
        'construis le segment [AB]']
        .forEach(t => assert.deepEqual(lireInstruction(t, etat).ins,
            { op: 'segment', args: ['A', 'B'] }, `refusée : « ${t} »`));
});

test('UNE PHRASE À MOITIÉ COMPRISE EST REFUSÉE, ET L\'ON DIT CE QU\'ON ATTEND', () => {
    // ON NE DEVINE JAMAIS : construire sur une supposition ferait une figure
    // que l'élève ne saurait pas expliquer.
    const etat = { points: {}, objets: [] };
    const cercle = lireInstruction('Trace le cercle qui passe par A et B', etat);
    assert.equal(cercle.ins, undefined);
    assert.match(cercle.dit, /CENTRE/);

    const perp = lireInstruction('Trace la perpendiculaire à (AB)', etat);
    assert.equal(perp.ins, undefined);
    assert.match(perp.dit, /passant par/);

    const compte = lireInstruction('Place 2 points A, B et C', etat);
    assert.equal(compte.ins, undefined);
    assert.match(compte.dit, /3/);

    const rien = lireInstruction('fais un beau dessin', etat);
    assert.equal(rien.ins, undefined);
    assert.ok(rien.dit.includes('Place 2 points A et B'));
});

test('« NON ALIGNÉS » SE SIGNALE SANS SE SANCTIONNER', () => {
    // C'est une précision de rédaction, pas une faute de construction : on la
    // dit, on ne la compte pas.
    const sans = lireInstruction('Place 3 points A, B et C', { points: {}, objets: [] });
    assert.ok(sans.ins, 'la phrase reste acceptée');
    assert.match(sans.note, /non alignés/);
    const avec = lireInstruction('Place 3 points A, B et C non alignés', { points: {}, objets: [] });
    assert.equal(avec.note, null);
});

test('UN PROGRAMME ENTIER, TAPÉ À LA MAIN, CONSTRUIT LA FIGURE', () => {
    // Le vrai essai : une rédaction libre, avec ses accents, ses crochets
    // oubliés, et les tournures que chacun écrit à sa façon.
    const n = preparerNiveau('hauteur');
    const texte = [
        '1. Place un point A, un point B et un point C non alignés',
        'Trace le segment [AB]',
        'trace le segment BC',
        'Joins C et A',
        'Trace la droite perpendiculaire à la droite (AB) qui passe par C'
    ].join('\n');
    const lu = lireProgramme(texte, n.atlas);
    lu.lignes.forEach(l => assert.ok(l.vide || l.ok,
        `ligne refusée : ${texte.split('\n')[l.i]} — ${l.dit}`));
    const r = executer(lu.instructions, n.atlas);
    assert.equal(r.erreur, null);
    assert.ok(comparer(r.objets, n.attendus, r.points, n.exiges).ok);
});

test('« PLACE UN POINT A ET UN POINT B » EST COMPRIS', () => {
    // Rémy, capture à l'appui : « ça devrait être compris, ça ». C'est la
    // tournure la plus naturelle — on énumère les points un par un, chacun avec
    // son article — et l'application la refusait, parce que la grammaire
    // n'attendait qu'une seule occurrence du mot « point ».
    const attendu = { op: 'points', args: ['A', 'B'], nonAlignes: false };
    [
        'Place un point A et un point B',
        'place un point A, un point B',
        'Place un point A et le point B',
        'Place un point A et un autre point B'
    ].forEach(phrase => {
        const r = lireInstruction(phrase);
        assert.deepEqual(r.ins, attendu, `${phrase} → ${r.dit}`);
    });
    // Et l'ancienne tournure marche toujours, avec son contrôle du compte.
    assert.deepEqual(lireInstruction('Place 2 points A et B').ins, attendu);
    assert.ok(lireInstruction('Place 3 points A et B').dit,
        'annoncer trois points et en nommer deux reste une faute');
    assert.deepEqual(lireInstruction('place un point A, un point B et un point C non alignés').ins,
        { op: 'points', args: ['A', 'B', 'C'], nonAlignes: true });
});

test('PLUSIEURS FORMULATIONS POUR LE MÊME TRACÉ', () => {
    // Rémy : « n'hésite pas à programmer plusieurs formulations ». On n'écrit
    // pas tous la même phrase, et refuser « Trace la droite passant par A et
    // B » au motif qu'on attendait « (AB) » corrige du français, pas de la
    // géométrie. Ce qu'on exige reste entier : QUEL objet, à partir de QUELS
    // points.
    const cas = [
        [['Trace le segment [AB]', 'Trace le segment d\'extrémités A et B',
            'Trace le segment qui relie A et B', 'Joins A et B', 'Relie A et B'],
        { op: 'segment', args: ['A', 'B'] }],
        [['Trace la droite (AB)', 'Trace la droite passant par A et B',
            'Trace la droite qui passe par A et B'],
        { op: 'droite', args: ['A', 'B'] }],
        [['Trace la demi-droite [AB)', 'Trace la demi-droite d\'origine A passant par B',
            'Trace la demi droite [AB)'],
        { op: 'demiDroite', args: ['A', 'B'] }],
        [['Trace la perpendiculaire à (AB) passant par C',
            'Trace la droite perpendiculaire à la droite (AB) qui passe par C',
            'Trace la perpendiculaire à (AB) en C'],
        { op: 'perpendiculaire', args: ['A', 'B', 'C'] }],
        [['Trace la parallèle à (AB) passant par C',
            'Trace la droite parallèle à (AB) qui passe par C'],
        { op: 'parallele', args: ['A', 'B', 'C'] }]
    ];
    cas.forEach(([phrases, attendu]) => {
        phrases.forEach(ph => {
            const r = lireInstruction(ph);
            assert.deepEqual(r.ins, attendu, `${ph} → ${r.dit}`);
        });
    });
    // ON NE DEVINE TOUJOURS PAS : une phrase incomplète est refusée avec un
    // exemple, jamais interprétée au plus proche.
    assert.ok(lireInstruction('Trace la perpendiculaire à (AB)').dit);
    assert.ok(lireInstruction('Trace la demi-droite').dit);
});

test('LA DEMI-DROITE N\'EST NI UNE DROITE NI UN SEGMENT', () => {
    // [AB) et (AB) se superposent sur la moitié de leur longueur : les
    // confondre ferait accepter l'une pour l'autre, c'est-à-dire noter juste
    // une figure qui n'est pas celle du modèle.
    const atlas = { A: { x: 25, y: 45 }, B: { x: 58, y: 32 } };
    const prog = (op) => executer([{ op: 'points', args: ['A', 'B'] },
        { op, args: ['A', 'B'] }], atlas).objets;
    const [dd] = prog('demiDroite');
    const [dr] = prog('droite');
    const [sg] = prog('segment');
    assert.notEqual(cleObjet(dd), cleObjet(dr));
    assert.notEqual(cleObjet(dd), cleObjet(sg));
    // Elle est définie par son ORIGINE et sa DIRECTION : [AB) et [AC) sont la
    // même demi-droite quand C est plus loin sur le même rayon.
    const loin = executer([
        { op: 'points', args: ['A', 'B', 'C'] },
        { op: 'demiDroite', args: ['A', 'C'] }
    ], { ...atlas, C: { x: 25 + (58 - 25) * 2, y: 45 + (32 - 45) * 2 } }).objets;
    assert.equal(cleObjet(loin[0]), cleObjet(dd));
    // Et le niveau qui la travaille se valide lui-même.
    const n = preparerNiveau('demi-droite');
    assert.ok(comparer(n.objets, n.attendus, n.points, n.exiges).ok);
});

test('LA FIGURE EST CODÉE — angle droit, égalités, parallèles', () => {
    // Rémy, deux fois dans la même passe : « n'oublie pas de coder s'il y a une
    // médiatrice », « là il faut coder ». Ce qui n'est pas codé n'est pas su :
    // un trait qui traverse un segment ne dit pas qu'il le coupe en son milieu
    // ni qu'il lui est perpendiculaire.
    const med = preparerNiveau('mediatrice').objets.find(o => o.codage);
    assert.ok(med, 'la médiatrice doit porter son codage');
    assert.equal(med.codage.type, 'mediatrice');
    // Le milieu du segment, et les deux extrémités : de quoi tracer les deux
    // tirets d'égalité ET le petit carré.
    assert.ok(Math.abs(med.codage.m.x - (med.codage.a.x + med.codage.b.x) / 2) < 1e-9);

    const perp = preparerNiveau('perpendiculaire').objets.find(o => o.codage);
    assert.equal(perp.codage.type, 'angleDroit');
    // Le sommet du petit carré est le PIED de la perpendiculaire : il est sur
    // les deux droites à la fois.
    const { sommet, u, v } = perp.codage;
    assert.ok(Math.abs(u.x * v.x + u.y * v.y) < 1e-9, 'les deux directions sont perpendiculaires');
    const p = preparerNiveau('perpendiculaire').points;
    const aire = (sommet.x - p.A.x) * (p.B.y - p.A.y) - (sommet.y - p.A.y) * (p.B.x - p.A.x);
    assert.ok(Math.abs(aire) < 1e-6, 'le pied doit être sur (AB)');

    const par = preparerNiveau('parallele').objets.find(o => o.codage);
    assert.equal(par.codage.type, 'paralleles');
    assert.ok(par.codage.autre, 'les chevrons se posent sur les DEUX droites');

    // ET AUCUN NIVEAU NE MONTRE PLUS SES TRAITS DE CONSTRUCTION. Rémy : « on ne
    // veut pas la construction, on veut juste ce que l'on a. »
    NIVEAUX.forEach((n, i) => {
        assert.ok(!n.modele.some(x => x.aide), `${n.id} montre encore une aide`);
        const p2 = preparerNiveau(i);
        assert.equal(p2.objets.length, p2.attendus.length,
            `${n.id} trace plus que ce qu'il demande`);
    });
});

test('ON ASSEMBLE AVANT D\'ÉCRIRE, et la banque dit les vraies formulations', async () => {
    // Rémy : « on pourrait commencer par du drag drop pour que l'élève voit
    // bien les formulations ». Rédiger demande deux choses à la fois — trouver
    // la SUITE des tracés, et l'écrire dans la langue du chapitre. Celui qui
    // bute sur la seconde ne peut pas montrer qu'il sait la première.
    const { banqueDePhrases, ordreDeLaBanque, phrasesDuModele } =
        await import('../js/core/programmeConstruction.js');
    for (let i = 0; i < NIVEAUX.length; i++) {
        const niv = preparerNiveau(i);
        const { justes, leurres } = banqueDePhrases(niv);
        // LES PHRASES JUSTES SONT EXACTEMENT LE PROGRAMME MODÈLE : c'est ce
        // qu'on veut lui faire lire dix fois avant qu'il ait à le taper.
        assert.deepEqual(justes, phrasesDuModele(niv));
        assert.equal(justes.length, niv.modele.length);
        // ET ELLES SE RELISENT : le parseur accepte ce que la banque propose.
        const lu = lireProgramme(justes.join('\n'), niv.atlas);
        lu.lignes.forEach((l, k) => assert.ok(l.ok, `${niv.id} : « ${justes[k]} » — ${l.dit}`));
        const r = executer(lu.instructions, niv.atlas);
        assert.ok(comparer(r.objets, niv.attendus, r.points, niv.exiges).ok,
            `${niv.id} : la banque ne construit pas sa propre figure`);
        // AUCUN LEURRE N'EST UNE PHRASE JUSTE — sinon on compterait faux une
        // réponse qu'on vient d'offrir.
        leurres.forEach(p2 => assert.ok(!justes.includes(p2), `${niv.id} : leurre juste`));
    }
});

test('LA BANQUE NE SE MÉLANGE PAS SOUS LE DOIGT', async () => {
    // Elle se redessine à chaque phrase posée : un ordre tiré au hasard
    // déplacerait les étiquettes entre deux clics, ce qui rend l'exercice
    // injouable au doigt.
    const { ordreDeLaBanque, banqueDePhrases } =
        await import('../js/core/programmeConstruction.js');
    const niv = preparerNiveau('triangle');
    const a = ordreDeLaBanque(niv).map(x => x.p);
    const b = ordreDeLaBanque(niv).map(x => x.p);
    assert.deepEqual(a, b);
    // Mais elle EST mélangée : les bonnes phrases ne sont pas rangées en tête,
    // sinon il suffirait de cliquer les premières dans l'ordre.
    const { justes, leurres } = banqueDePhrases(niv);
    assert.equal(a.length, justes.length + leurres.length);
    assert.notDeepEqual(a, [...justes, ...leurres]);
});

test('LE NUMÉRO DE LIGNE N\'EST PAS DE LA GÉOMÉTRIE', () => {
    // Un élève numérote son programme : « 1. Place… ». Refuser la ligne pour
    // cela serait corriger la mise en page.
    const n = preparerNiveau('segment');
    const lu = lireProgramme('1. Place 2 points A et B\n2) Trace le segment [AB]', n.atlas);
    assert.ok(lu.lignes.every(l => l.vide || l.ok));
    assert.equal(lu.instructions.length, 2);
});

test('SANS AVOIR PLACÉ SES POINTS, ON NE TRACE RIEN', () => {
    // C'est la première leçon du chapitre, et elle se mesure : le programme qui
    // saute la ligne « Place… » ne construit pas la figure.
    const n = preparerNiveau('segment');
    const lu = lireProgramme('Trace le segment [AB]', n.atlas);
    const r = executer(lu.instructions, n.atlas);
    assert.ok(r.erreur);
    assert.match(r.erreur.dit, /le point A/);
});

test('ON NE PLACE QUE LES POINTS DE LA FIGURE', () => {
    // « Place un point Z » se lit très bien — c'est une phrase juste — mais
    // cette figure-là ne part pas de Z, et le dire vaut mieux que de dessiner
    // un point de plus.
    const n = preparerNiveau('deux-points');
    assert.ok(lireInstruction('Place un point Z', { points: {}, objets: [] }).ins);
    const r = executer([{ op: 'points', args: ['Z'] }], n.atlas);
    assert.ok(r.erreur);
    assert.match(r.erreur.dit, /2 points/);
});
