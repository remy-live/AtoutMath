// L'organigramme des quadrilatères : la hiérarchie, et ce qu'elle enseigne.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { makeRng } from '../js/core/ids.js';
import { getExerciseById } from '../js/data/catalog.js';
import { getGenerator } from '../js/core/registry.js';
import {
    FAMILLES, FLECHES, POSITIONS, PALIERS, MODES, familleDe, flecheDe, cleFleche,
    ancetres, estToujours, genererOrganigramme, verifierDepot, verifierOrganigramme, conseil,
    traceFleche, posEtiquette, conditionsDe
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
    // DEUX CASES DE DÉPART, quatre conditions : depuis la fiche de Rémy, chaque
    // chemin s'emprunte par les côtés OU par les diagonales.
    const versCarre = FLECHES.filter(f => f.vers === 'carre');
    assert.deepEqual([...new Set(versCarre.map(f => f.de))].sort(), ['losange', 'rectangle']);
    assert.equal(versCarre.length, 4);

    // Et LA CONDITION QUI MANQUE À L'UN EST CELLE QUI DÉFINISSAIT L'AUTRE :
    // c'est cela qu'il faut voir, et c'est vrai des côtés comme des diagonales.
    const dit = (de, vers) => FLECHES.filter(f => f.de === de && f.vers === vers)
        .map(f => f.ajoute).sort();
    assert.deepEqual(dit('rectangle', 'carre'), dit('parallelogramme', 'losange'),
        'du rectangle au carré, il manque exactement ce qui fait un losange');
    assert.deepEqual(dit('losange', 'carre'), dit('parallelogramme', 'rectangle'),
        'du losange au carré, il manque exactement ce qui fait un rectangle');
});

test('LES TREIZE CONDITIONS DE LA FICHE DE RÉMY, et les sept chemins', () => {
    // Rémy : cinq cases de figures, treize cartes de conditions, et plusieurs
    // flèches qui arrivent sur la même case. Ce n'est pas un compte décoratif :
    // un élève qui n'a vu que « côtés opposés parallèles » ne reconnaît pas un
    // parallélogramme quand on lui donne les diagonales — et c'est pourtant
    // celle-là qui tombe dans les exercices.
    assert.equal(FLECHES.length, 13);
    const parChemin = {};
    FLECHES.forEach(f => {
        const k = `${f.de}>${f.vers}`;
        parChemin[k] = (parChemin[k] || 0) + 1;
    });
    assert.deepEqual(parChemin, {
        'quadrilatere>parallelogramme': 3,
        'quadrilatere>rectangle': 1,
        'quadrilatere>losange': 1,
        'parallelogramme>rectangle': 2,
        'parallelogramme>losange': 2,
        'rectangle>carre': 2,
        'losange>carre': 2
    });
    // LES DEUX RACCOURCIS SONT LÀ : ce sont les définitions de sixième, celles
    // qu'on donne avant même de parler de parallélogramme.
    assert.match(FLECHES.find(f => f.de === 'quadrilatere' && f.vers === 'rectangle').ajoute,
        /angles droits/);
    assert.match(FLECHES.find(f => f.de === 'quadrilatere' && f.vers === 'losange').ajoute,
        /quatre côtés égaux/);
});

test('CHAQUE FLÈCHE A SA PROPRE CLEF, sinon une carte en remplit trois', () => {
    // Trois conditions relient le quadrilatère au parallélogramme : sans la
    // voie dans la clef, poser une carte sur l'une les remplissait toutes.
    const clefs = FLECHES.map(cleFleche);
    assert.equal(new Set(clefs).size, 13, 'deux flèches partagent une clef');
    FLECHES.forEach(f => assert.equal(flecheDe(cleFleche(f)), f));
});

test('LES ÉTIQUETTES S\'ÉCHELONNENT, elles ne s\'empilent pas', () => {
    // MESURÉ SUR LE PREMIER JET, qui donnait un trait à chacune des treize
    // conditions : six paires d'étiquettes se chevauchaient et huit débordaient
    // sur les cases. Trois libellés de quarante caractères ne tiennent pas côte
    // à côte dans un intervalle. Elles se lisent donc l'une SOUS l'autre, le
    // long de la même flèche — comme au tableau.
    for (const [de, vers] of [['quadrilatere', 'parallelogramme'],
        ['parallelogramme', 'rectangle'], ['rectangle', 'carre']]) {
        const pos = conditionsDe(de, vers).map(posEtiquette);
        assert.ok(pos.length >= 2, `${de} > ${vers}`);
        for (let i = 0; i < pos.length; i++) {
            for (let j = i + 1; j < pos.length; j++) {
                const d = Math.hypot(pos[i].x - pos[j].x, pos[i].y - pos[j].y);
                assert.ok(d > 5.5, `${de} > ${vers} : deux étiquettes à ${d.toFixed(1)}`);
            }
        }
        // Et aucune ne tombe sur une case.
        pos.forEach(pt => Object.values(POSITIONS).forEach(c => {
            assert.ok(Math.abs(pt.x - c.x) > 6 || Math.abs(pt.y - c.y) > 6,
                `${de} > ${vers} : une étiquette est posée sur une case`);
        }));
    }
});

test('LES RACCOURCIS CONTOURNENT PAR LE BORD', () => {
    // « Trois ou quatre angles droits » saute la case du parallélogramme : un
    // trait droit lui passerait DESSUS.
    const court = FLECHES.find(f => f.de === 'quadrilatere' && f.vers === 'rectangle');
    const t = traceFleche(court);
    assert.equal(t.contourne, true);
    assert.ok(t.points.length > 2, 'un contournement se fait en plusieurs segments');
    const e = posEtiquette(court);
    assert.equal(e.bord, true);
    assert.ok(Math.abs(e.x - POSITIONS.parallelogramme.x) > 20,
        'l\'étiquette du raccourci doit rester loin de la case du milieu');
    // Le contournement de droite passe de l'autre côté.
    const droite = FLECHES.find(f => f.de === 'quadrilatere' && f.vers === 'losange');
    assert.ok(posEtiquette(droite).x > 50 && e.x < 50);
});

test('chaque flèche n\'ajoute QU\'UNE condition, et chaque famille a sa figure', () => {
    // Un organigramme dont une flèche porterait deux conditions n'apprendrait
    // rien : on ne saurait pas laquelle a fait la différence.
    // CINQ FAMILLES, PAS SIX. Rémy : « enlève le trapèze, ce n'est pas au
    // programme » — et le quadrilatère quelconque descend donc directement au
    // parallélogramme.
    assert.equal(FAMILLES.length, 5);
    assert.equal(FAMILLES.some(f => f.id === 'trapeze'), false, 'le trapèze ne doit plus exister');
    assert.equal(FLECHES.length, 13);
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
    for (const cle of ['parallelogramme>rectangle#-1', 'losange>carre#-1']) {
        const v = verifierDepot(o, cle, angleDroit);
        assert.equal(v.ok, true, `« un angle droit » devrait passer en ${cle}`);
        assert.match(v.texteJuste, /deux chemins/);
    }
    // Et elle ne passe pas là où il faut les longueurs.
    assert.equal(verifierDepot(o, 'rectangle>carre#-1', angleDroit).ok, false);
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

// --- LA FICHE PAPIER ----------------------------------------------------------
//
// Rémy l'a demandée pour son PDF : cinq cases, treize flèches, et la liste des
// conditions à reporter. À l'écran on glisse des cartes, sur le papier on écrit
// une lettre — découper treize étiquettes n'est pas une leçon de géométrie.

test('NEUF CONDITIONS POUR TREIZE FLÈCHES, et une lettre peut servir deux fois', () => {
    // « Un angle droit » mène du parallélogramme au rectangle ET du losange au
    // carré. Une liste de treize aurait été plus simple à écrire et FAUSSE à
    // corriger : l'élève qui met la lettre de l'un des deux jumeaux aurait eu
    // juste, et l'exercice aurait eu deux réponses.
    const gen = getGenerator('geo.quadrilateres.organigramme');
    assert.ok(gen, 'le générateur de la fiche doit être enregistré');
    const item = gen.generate({}, { rng: makeRng('fiche-1') });
    const m = item.meta;

    assert.equal(m.liste.length, 9, 'neuf énoncés distincts');
    assert.equal(new Set(m.liste.map(l => l.texte)).size, 9, 'un énoncé en double');
    assert.equal(m.liste.reduce((n, l) => n + l.cles.length, 0), FLECHES.length,
        'les treize flèches doivent toutes être couvertes');
    assert.equal(m.liste.filter(l => l.cles.length === 2).length, 4,
        'quatre conditions servent deux fois');

    // CHAQUE FLÈCHE A SA LETTRE, et c'est bien celle de sa condition.
    FLECHES.forEach(f => {
        const lettre = m.parCle[cleFleche(f)];
        assert.ok(lettre, `${cleFleche(f)} sans lettre`);
        assert.equal(m.liste.find(l => l.lettre === lettre).texte, f.ajoute);
    });
    assert.equal(item.answer.length, FLECHES.length);
    // La consigne prévient : sans cela, l'élève cherche une correspondance
    // une-pour-une et bloque sur la treizième flèche.
    assert.match(item.prompt.text, /DEUX FOIS/);
});

test('LES LETTRES CHANGENT D\'UNE COPIE À L\'AUTRE', () => {
    // Rémy : « l'organigramme des quadrilatères est toujours le même ». Il l'est
    // — c'est une hiérarchie —, mais l'ordre de la liste, lui, se mélange : deux
    // voisins n'ont pas les mêmes lettres aux mêmes endroits.
    const gen = getGenerator('geo.quadrilateres.organigramme');
    const clefs = ['a', 'b', 'c', 'd', 'e', 'f'].map(g => {
        const m = gen.generate({}, { rng: makeRng(`copie-${g}`) }).meta;
        return m.liste.map(l => l.lettre + l.texte).join('|');
    });
    assert.ok(new Set(clefs).size > 1, 'toutes les copies portent le même ordre');
    // Mais la FIGURE, elle, ne bouge pas d'une copie à l'autre.
    const figures = clefs.map(() => FLECHES.map(cleFleche).join(','));
    assert.equal(new Set(figures).size, 1);
});

test('L\'EXERCICE EST IMPRIMABLE, avec son propre générateur', () => {
    const exo = getExerciseById('geo-quadrilateres');
    assert.equal(exo.printable, 'organigramme-quadri');
    assert.equal(exo.printGeneratorId, 'geo.quadrilateres.organigramme');
    // Et l'exercice à l'écran garde le sien : ce sont deux gestes différents.
    assert.equal(exo.activityId, 'quadrilateres');
});
