// L'organigramme des quadrilatères : la hiérarchie, et ce qu'elle enseigne.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { makeRng } from '../js/core/ids.js';
import { getExerciseById } from '../js/data/catalog.js';
import {
    FAMILLES, FLECHES, POSITIONS, PALIERS, MODES, familleDe, flecheDe, cleFleche,
    ancetres, estToujours, genererOrganigramme, verifierDepot, verifierOrganigramme, conseil
} from '../js/core/quadrilateres.js';

test('LA HIÉRARCHIE EST DANS LE BON SENS', () => {
    // C'est la question qui départage ceux qui ont compris : « est-ce qu'un
    // carré est un rectangle ? » Oui. Et un rectangle n'est pas un carré.
    assert.equal(estToujours('carre', 'rectangle'), true, 'tout carré est un rectangle');
    assert.equal(estToujours('carre', 'losange'), true, 'et un losange');
    assert.equal(estToujours('carre', 'parallelogramme'), true);
    assert.equal(estToujours('carre', 'quadrilatere'), true);
    assert.equal(estToujours('rectangle', 'carre'), false, 'l\'inverse est faux');
    assert.equal(estToujours('losange', 'rectangle'), false, 'et un losange n\'est pas un rectangle');
    assert.equal(estToujours('parallelogramme', 'rectangle'), false);
    // Un carré remonte par les DEUX chemins : c'est le cœur de la figure.
    const a = ancetres('carre');
    assert.ok(a.includes('rectangle') && a.includes('losange'));
});

test('LE CARRÉ SE REJOINT PAR DEUX CHEMINS, ET CHACUN AJOUTE CE QUE L\'AUTRE AVAIT', () => {
    // C'est la beauté de l'organigramme, et ce qu'un élève doit emporter.
    const versCarre = FLECHES.filter(f => f.vers === 'carre');
    assert.equal(versCarre.length, 2);
    const parRectangle = versCarre.find(f => f.de === 'rectangle');
    const parLosange = versCarre.find(f => f.de === 'losange');
    // Au rectangle il manque les longueurs, au losange l'angle droit — et ces
    // conditions sont EXACTEMENT celles qui définissaient l'autre.
    assert.equal(parRectangle.ajoute, FLECHES.find(f => f.vers === 'losange').ajoute);
    assert.equal(parLosange.ajoute, FLECHES.find(f => f.vers === 'rectangle').ajoute);
});

test('chaque flèche n\'ajoute QU\'UNE condition, et chaque famille a sa figure', () => {
    // Un organigramme dont une flèche porterait deux conditions n'apprendrait
    // rien : on ne saurait pas laquelle a fait la différence.
    // CINQ FAMILLES, PAS SIX. Rémy : « enlève le trapèze, ce n'est pas au
    // programme » — et le quadrilatère quelconque descend donc directement au
    // parallélogramme.
    assert.equal(FAMILLES.length, 5);
    assert.equal(FAMILLES.some(f => f.id === 'trapeze'), false, 'le trapèze ne doit plus exister');
    assert.equal(FLECHES.length, 5);
    FLECHES.forEach(f => {
        assert.ok(familleDe(f.de) && familleDe(f.vers), cleFleche(f));
        assert.ok(f.ajoute && f.ajoute.length > 5, cleFleche(f));
        assert.equal(/ et | puis |, /.test(f.ajoute), false,
            `${cleFleche(f)} : « ${f.ajoute} » ressemble à deux conditions`);
        assert.ok(f.piege && f.piege.length > 30, `${cleFleche(f)} sans explication d'erreur`);
        // Une flèche descend toujours d'un rang au moins.
        assert.ok(familleDe(f.vers).rang > familleDe(f.de).rang, cleFleche(f));
    });
    FAMILLES.forEach(f => {
        assert.equal(f.figure.length, 4, `${f.id} : un quadrilatère a quatre sommets`);
        assert.ok(POSITIONS[f.id], `${f.id} n'a pas de place dans l'organigramme`);
        f.figure.forEach(([x, y]) => assert.ok(x >= 0 && x <= 100 && y >= 0 && y <= 100));
    });
});

test('LES FIGURES SONT VRAIMENT CE QU\'ELLES PRÉTENDENT', () => {
    // Une case « losange » qui montrerait un parallélogramme quelconque
    // enseignerait le contraire de sa légende. On vérifie la géométrie.
    const cotes = (pts) => pts.map((p, i) => {
        const q = pts[(i + 1) % pts.length];
        return { dx: q[0] - p[0], dy: q[1] - p[1], l: Math.hypot(q[0] - p[0], q[1] - p[1]) };
    });
    const paralleles = (a, b) => Math.abs(a.dx * b.dy - a.dy * b.dx) < 1e-6;
    const perpendiculaires = (a, b) => Math.abs(a.dx * b.dx + a.dy * b.dy) < 1e-6;

    const carre = cotes(familleDe('carre').figure);
    assert.ok(carre.every(c => Math.abs(c.l - carre[0].l) < 1e-6), 'le carré a quatre côtés égaux');
    assert.ok(perpendiculaires(carre[0], carre[1]), 'et un angle droit');

    const losange = cotes(familleDe('losange').figure);
    assert.ok(losange.every(c => Math.abs(c.l - losange[0].l) < 1e-6), 'le losange a quatre côtés égaux');
    assert.equal(perpendiculaires(losange[0], losange[1]), false, 'mais pas d\'angle droit');

    const rect = cotes(familleDe('rectangle').figure);
    assert.ok(perpendiculaires(rect[0], rect[1]), 'le rectangle a un angle droit');
    assert.equal(Math.abs(rect[0].l - rect[1].l) < 1e-6, false, 'mais ce n\'est pas un carré');

    const para = cotes(familleDe('parallelogramme').figure);
    assert.ok(paralleles(para[0], para[2]) && paralleles(para[1], para[3]),
        'le parallélogramme a ses deux paires parallèles');
    assert.equal(perpendiculaires(para[0], para[1]), false, 'sans angle droit');

    const quad = cotes(familleDe('quadrilatere').figure);
    assert.equal(quad.some((c, i) => paralleles(c, quad[(i + 2) % 4])), false,
        'le quadrilatère quelconque n\'a aucune paire parallèle');
});

test('ON PERCE EN PARTANT DU BAS, là où les distinctions se jouent', () => {
    // « Quadrilatère » tout en haut est le seul nom qu'un élève pose sans
    // réfléchir : le retirer d'abord rendrait l'exercice trivial pour
    // commencer et dur pour finir, exactement à l'envers.
    const o = genererOrganigramme({ rng: makeRng('bas'), palier: 'decouverte' });
    assert.deepEqual(o.trous.slice().sort(), ['carre', 'losange', 'rectangle'].sort());
    assert.equal(o.trous.includes('quadrilatere'), false);
});

test('chaque palier donne autant de cartes que de trous, et pas une de plus', () => {
    // Une carte en trop transformerait un exercice de classement en exercice
    // d'élimination : ce n'est plus la même chose qu'on travaille.
    for (const [nom, P] of Object.entries(PALIERS)) {
        const o = genererOrganigramme({ rng: makeRng(nom), palier: nom });
        assert.equal(o.mode, P.mode, nom);
        assert.equal(o.trous.length, P.trous, nom);
        assert.equal(o.cartes.length, o.trous.length, nom);
        // Et l'organigramme se termine en posant les cartes.
        const poses = {};
        o.trous.forEach(t => { poses[t] = o.cartes.find(c => verifierDepot(o, t, c).ok); });
        o.trous.forEach(t => assert.ok(poses[t], `${nom} : aucune carte ne va en ${t}`));
        assert.equal(verifierOrganigramme(o, poses).fini, true, nom);
    }
});

test('UNE CONDITION QUI SERT DEUX FOIS EST JUSTE AUX DEUX ENDROITS', () => {
    // « Un angle droit » mène du parallélogramme au rectangle ET du losange au
    // carré. Refuser l'une des deux enseignerait le contraire de ce que
    // l'organigramme montre — et le jeu le DIT quand cela arrive.
    const o = genererOrganigramme({ rng: makeRng('jumelles'), palier: 'tout' });
    const angleDroit = o.cartes.find(c => flecheDe(c.id).ajoute === 'un angle droit');
    assert.ok(angleDroit, 'la carte « un angle droit » doit être au jeu');
    for (const cle of ['parallelogramme>rectangle', 'losange>carre']) {
        const v = verifierDepot(o, cle, angleDroit);
        assert.equal(v.ok, true, `« un angle droit » devrait passer en ${cle}`);
        assert.match(v.texteJuste, /deux chemins/);
    }
    // Et elle ne passe pas là où il faut les longueurs.
    assert.equal(verifierDepot(o, 'rectangle>carre', angleDroit).ok, false);
});

test('LE REFUS EXPLIQUE LE SENS DE LA HIÉRARCHIE', () => {
    const o = genererOrganigramme({ rng: makeRng('sens'), palier: 'noms' });
    const carteCarre = o.cartes.find(c => c.id === 'carre');
    // Poser « Carré » sur la case du parallélogramme : ce n'est pas absurde,
    // c'est le sens qui est inversé — et c'est cela qu'il faut dire.
    const v = verifierDepot(o, 'parallelogramme', carteCarre);
    assert.equal(v.ok, false);
    assert.match(v.raison, /plus GÉNÉRALE|général/);
    const carteQuad = o.cartes.find(c => c.id === 'quadrilatere');
    const v2 = verifierDepot(o, 'carre', carteQuad);
    assert.equal(v2.ok, false);
    assert.match(v2.raison, /sens|particuli/i);
});

test('le conseil rappelle la règle, jamais la case', () => {
    const o = genererOrganigramme({ rng: makeRng('conseil'), palier: 'noms' });
    const texte = conseil(o, {});
    assert.ok(texte.length > 40);
    FAMILLES.forEach(f => assert.equal(texte.includes(f.nom), false,
        `le conseil nomme « ${f.nom} » : il fait l'exercice à la place de l'élève`));
});

test('la même graine redonne le même organigramme', () => {
    const a = genererOrganigramme({ rng: makeRng('pareil'), palier: 'tout' });
    const b = genererOrganigramme({ rng: makeRng('pareil'), palier: 'tout' });
    assert.deepEqual(a.trous, b.trous);
    assert.deepEqual(a.cartes, b.cartes);
});

test('l\'exercice du catalogue tient debout', () => {
    const exo = getExerciseById('geo-quadrilateres');
    assert.ok(exo, 'l\'exercice doit être au catalogue');
    assert.equal(exo.activityId, 'quadrilateres');
    const schema = exo.paramSchema.find(p => p.id === 'palier');
    schema.options.forEach(o => {
        assert.ok(PALIERS[o.value], `palier inconnu : ${o.value}`);
        assert.equal(o.label, PALIERS[o.value].label, `le libellé du palier ${o.value} a divergé du noyau`);
    });
    assert.ok(MODES.FAMILLES && MODES.PROPRIETES);
});
