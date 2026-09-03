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
    posEtiquette, conditionsDe, CASE_L, CASE_H, COND_L, COND_H,
    PLAN_L, PLAN_H, boiteFigure, boiteCondition, traitsDeCondition, POSITIONS_CONDITIONS,
    ETAPES, genererProgressif, casesVisibles, verifierEtape, refusEtape, conseilEtape,
    DIMS_CODAGE, contreExemple,
    vignetteDe
} from '../js/core/quadrilateres.js';
import { PROPRIETES, proprieteDe } from '../js/core/quadriMorph.js';
import {
    construireFigure, classesDeLongueur, anglesDroitsDe, verifierCodage,
    segmentsDe, pointsAngleDe
} from '../js/core/codage.js';
import { ajusterAuRectangle, largeurTexte } from '../js/core/dominos.js';

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
        /4 côtés égaux/);
});

test('CHAQUE FLÈCHE A SA PROPRE CLEF, sinon une carte en remplit trois', () => {
    // Trois conditions relient le quadrilatère au parallélogramme : sans la
    // voie dans la clef, poser une carte sur l'une les remplissait toutes.
    const clefs = FLECHES.map(cleFleche);
    assert.equal(new Set(clefs).size, 13, 'deux flèches partagent une clef');
    FLECHES.forEach(f => assert.equal(flecheDe(cleFleche(f)), f));
});

test('AUCUNE BOÎTE N\'EN TOUCHE UNE AUTRE — la figure de Rémy tient', () => {
    // Rémy a envoyé sa fiche : l'organigramme rempli, le même vide, la planche
    // de vignettes. « Je ne suis pas satisfait de l'organigramme. »
    //
    // CE QUI A CHANGÉ, ET QUI EST LE VRAI SUJET : une condition n'est plus une
    // étiquette collée sur un trait, c'est une CASE — une carte, avec sa boîte,
    // posée SUR le chemin entre deux figures. C'est ce qui permet de la
    // découper sur le papier et de la glisser à l'écran ; « cartes à replacer »
    // ne veut rien dire d'autre.
    //
    // Dix-huit boîtes doivent donc cohabiter sans se toucher : cinq figures et
    // treize conditions. C'est la contrainte qui a fixé le plan en portrait.
    const boites = [
        ...Object.keys(POSITIONS).map(id => ({ nom: id, b: boiteFigure(id) })),
        ...FLECHES.map((f, i) => ({ nom: `C${i} ${f.court}`, b: boiteCondition(f) }))
    ];
    assert.equal(boites.length, 18);

    for (let i = 0; i < boites.length; i++) {
        for (let j = i + 1; j < boites.length; j++) {
            const a = boites[i].b, c = boites[j].b;
            const touche = a.x1 < c.x2 && a.x2 > c.x1 && a.y1 < c.y2 && a.y2 > c.y1;
            assert.equal(touche, false,
                `« ${boites[i].nom} » chevauche « ${boites[j].nom} »`);
        }
    }
    // Et tout tient dans le plan.
    boites.forEach(({ nom, b }) => {
        assert.ok(b.x1 >= 0 && b.x2 <= PLAN_L, `${nom} sort du plan en largeur`);
        assert.ok(b.y1 >= 0 && b.y2 <= PLAN_H, `${nom} sort du plan en hauteur`);
    });
    // Chaque condition a bien sa place déclarée : une de plus dans FLECHES sans
    // sa position, et elles s'empileraient toutes au centre.
    assert.equal(POSITIONS_CONDITIONS.length, FLECHES.length);
});

test('AUCUN TRAIT NE TRAVERSE UNE BOÎTE QU\'IL NE RELIE PAS', () => {
    // C'est ce qui rend la fiche de Rémy lisible, et c'est ce qui manquait :
    // les raccourcis « 3 ou 4 angles droits » et « 4 côtés égaux » vont du haut
    // de l'organigramme jusqu'au rectangle et au losange, tout en bas. Au plus
    // court, ils traverseraient quatre autres cases. Ils longent donc le bord,
    // dans un couloir où l'on n'a posé aucune boîte — exactement comme sur la
    // fiche.
    const boites = [
        ...Object.keys(POSITIONS).map(id => ({ nom: id, b: boiteFigure(id) })),
        ...FLECHES.map((f, i) => ({ nom: 'C' + i, b: boiteCondition(f), f }))
    ];
    const dedans = (p, b) => p.x > b.x1 + 0.3 && p.x < b.x2 - 0.3
        && p.y > b.y1 + 0.3 && p.y < b.y2 - 0.3;
    const coupe = (p, q, b) => {
        for (let t = 0; t <= 1; t += 0.01) {
            if (dedans({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }, b)) return true;
        }
        return false;
    };

    FLECHES.forEach((f, i) => {
        const t = traitsDeCondition(f);
        [t.entrant, t.sortant].forEach(pts => {
            assert.ok(pts.length >= 2, `${f.court} : trait vide`);
            for (let k = 0; k + 1 < pts.length; k++) {
                boites.forEach(x => {
                    if (x.nom === f.de || x.nom === f.vers || x.nom === 'C' + i) return;
                    assert.equal(coupe(pts[k], pts[k + 1], x.b), false,
                        `le trait de « ${f.court} » traverse ${x.nom}`);
                });
            }
        });
    });
});

test('LA COULEUR DIT LA FAMILLE DE LA PROPRIÉTÉ', () => {
    // L'idée de Rémy, reprise telle quelle : bleu ce qui parle des CÔTÉS, rouge
    // ce qui parle des DIAGONALES, mauve les deux raccourcis. Ce n'est pas de
    // la décoration — l'élève qui cherche ce qui manque au rectangle pour être
    // un carré sait qu'il y a une réponse bleue et une rouge, et que les deux
    // disent la même chose autrement.
    FLECHES.forEach(f => {
        assert.ok(['cotes', 'diagonales', 'raccourci'].includes(f.famille),
            `« ${f.ajoute} » : famille « ${f.famille} »`);
        // La couleur ne ment pas sur le contenu.
        if (f.famille === 'diagonales') assert.match(f.ajoute, /diagonale/i);
        if (f.famille === 'cotes') assert.match(f.ajoute, /côté/i);
    });
    // Les deux raccourcis, et eux seuls, partent du quadrilatère sans passer
    // par le parallélogramme.
    const raccourcis = FLECHES.filter(f => f.famille === 'raccourci');
    assert.equal(raccourcis.length, 2);
    raccourcis.forEach(f => {
        assert.equal(f.de, 'quadrilatere');
        assert.ok(['rectangle', 'losange'].includes(f.vers));
    });
});

test('LES LIBELLÉS SONT CEUX DE LA FICHE, au mot près', () => {
    // Ils commencent tous par « Qui a », et ce n'est pas un détail de style :
    // c'est ce qui permet de lire le chemin comme une phrase — « un
    // quadrilatère QUI A ses côtés opposés parallèles est un parallélogramme ».
    // Une étiquette qui dirait « côtés opposés parallèles » ne se lirait pas.
    FLECHES.forEach(f => {
        assert.match(f.ajoute, /^Qui a /, `« ${f.ajoute} » ne commence pas par « Qui a »`);
    });
    const dits = FLECHES.map(f => f.ajoute);
    assert.ok(dits.includes('Qui a ses diagonales se croisant en leur milieu'));
    assert.ok(dits.includes('Qui a deux côtés consécutifs perpendiculaires'));
    assert.ok(dits.includes('Qui a 3 ou 4 angles droits'));
    assert.ok(dits.includes('Qui a 4 côtés égaux'));
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

test('les paliers de NOMS donnent autant de cartes que de trous, et pas une de plus', () => {
    // Une carte en trop transformerait un exercice de classement en exercice
    // d'élimination : ce n'est plus la même chose qu'on travaille.
    for (const nom of ['decouverte', 'noms']) {
        const P = PALIERS[nom];
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

// --- L'ORGANIGRAMME PROGRESSIF ------------------------------------------------
//
// Rémy : « il faut le faire apparaître au fur et à mesure : on part du
// quadrilatère puis le parallélogramme, et on cherche les liens entre les deux
// en posant les cartes ; puis parallélogramme au rectangle, puis parallélogramme
// au losange, puis losange au carré, puis rectangle au carré. Ça ne fait qu'un
// exercice. »

test('LES SEPT ÉTAPES COUVRENT LES TREIZE CONDITIONS, sans en répéter aucune', () => {
    // Une condition oubliée serait une porte que l'élève ne verrait jamais ; une
    // condition demandée deux fois lui ferait croire qu'il s'est trompé.
    const vues = ETAPES.flatMap(e => conditionsDe(e.de, e.vers));
    assert.equal(vues.length, FLECHES.length, 'les treize flèches doivent être couvertes');
    assert.equal(new Set(vues.map(cleFleche)).size, FLECHES.length, 'une flèche demandée deux fois');

    // ET L'ORDRE EST CELUI DE RÉMY, avec les deux raccourcis de sixième glissés
    // juste après l'étape qui fait apparaître leur case d'arrivée : c'est le
    // premier moment où l'on peut les poser.
    assert.deepEqual(ETAPES.map(e => `${e.de}>${e.vers}`), [
        'quadrilatere>parallelogramme',
        'parallelogramme>rectangle', 'quadrilatere>rectangle',
        'parallelogramme>losange', 'quadrilatere>losange',
        'losange>carre', 'rectangle>carre'
    ]);
});

test('LES CASES APPARAISSENT AU FUR ET À MESURE, jamais toutes d\'un coup', () => {
    // C'est la demande de Rémy, et ce n'est pas cosmétique : voir les cinq cases
    // d'emblée, c'est chercher où ranger une carte parmi treize trous — un
    // problème de rangement. En voir deux, c'est répondre à « qu'est-ce qu'un
    // rectangle a de plus qu'un parallélogramme ? » — une question de géométrie.
    assert.deepEqual(casesVisibles(0).sort(), ['parallelogramme', 'quadrilatere']);
    assert.equal(casesVisibles(1).includes('rectangle'), true);
    assert.equal(casesVisibles(1).includes('losange'), false, 'le losange arrive plus tard');
    assert.equal(casesVisibles(2).includes('carre'), false);
    assert.equal(casesVisibles(ETAPES.length - 1).length, 5, 'à la fin, les cinq cases');
    // Et une case n'apparaît jamais avant celle dont elle descend.
    for (let r = 0; r < ETAPES.length; r++) {
        const vues = casesVisibles(r);
        vues.forEach(id => ancetres(id).forEach(a =>
            assert.ok(vues.includes(a), `${id} est visible sans ${a} à l'étape ${r}`)));
    }
});

test('CHAQUE ÉTAPE MÊLE DES INTRUS AUX BONNES CARTES', () => {
    // Sans intrus, une étape à deux fentes et deux cartes se remplirait sans
    // réfléchir : la dernière carte tomberait toute seule.
    for (const [palier, intrus] of [['conditions', 1], ['tout', 3]]) {
        const o = genererProgressif({ rng: makeRng(palier), palier });
        const cartes = o.etapes.filter(e => e.genre === 'condition');
        assert.equal(cartes.length, ETAPES.length, palier);
        let total = 0;
        cartes.forEach(e => {
            total += e.bonnes.length;
            assert.equal(e.cartes.filter(c => c.juste).length, e.bonnes.length, palier);
            assert.equal(e.cartes.length, e.bonnes.length + intrus, `${palier} — ${e.titre}`);
            // UN INTRU NE PORTE JAMAIS LE TEXTE D'UNE BONNE RÉPONSE. « Un angle
            // droit » sert deux fois dans la figure : pris comme intrus là où il
            // est juste, il aurait été refusé à tort.
            e.cartes.filter(c => !c.juste).forEach(c =>
                assert.equal(e.bonnes.includes(c.texte), false, `intrus juste : ${c.texte}`));
            // Et une carte d'étape se pose : elle est acceptée.
            e.cartes.filter(c => c.juste).forEach(c =>
                assert.equal(verifierEtape(e, c).ok, true, `${e.titre} refuse ${c.texte}`));
        });
        assert.equal(total, FLECHES.length, `${palier} : treize conditions en tout`);
    }
});

// --- CODER LA FIGURE, ENTRE DEUX ÉTAPES --------------------------------------
//
// Rémy : « On part du quadrilatère pour aller au parallélogramme. Si l'élève se
// trompe, on recommence. Ensuite, on lui demande de coder le parallélogramme.
// Puis on passe au rectangle. […] On code le rectangle puis après on met les
// vignettes, si l'élève se trompe, il recommence depuis le début. »

test('ON CODE LA FIGURE QU\'ON VIENT DE FAIRE APPARAÎTRE, et une seule fois', () => {
    const o = genererProgressif({ rng: makeRng('codage'), palier: 'conditions' });
    const suite = o.etapes.map(e => e.genre === 'codage' ? `coder:${e.figure}` : `${e.de}>${e.vers}`);
    // ON CODE D'ABORD, ON NOMME ENSUITE. Rémy : « tu affiches le quadrilatère et
    // le parallélogramme […] on code le parallélogramme avec les diagonales.
    // Une fois fait, dans l'organigramme, on a le parallélogramme avec le
    // codage, et là seulement on met les vignettes. »
    assert.deepEqual(suite, [
        'coder:parallelogramme', 'quadrilatere>parallelogramme',
        'coder:rectangle', 'parallelogramme>rectangle',
        'quadrilatere>rectangle',
        'coder:losange', 'parallelogramme>losange',
        'quadrilatere>losange',
        'coder:carre', 'losange>carre',
        'rectangle>carre'
    ]);
    // Le quadrilatère quelconque n'a rien à coder — c'est la seule famille sans
    // propriété à écrire, et c'est précisément ce qui la définit.
    assert.equal(o.etapes.some(e => e.genre === 'codage' && e.figure === 'quadrilatere'), false);
    // Une étape de codage arrive TOUJOURS après celle qui fait apparaître sa
    // case : coder une figure qu'on n'a pas encore atteinte n'aurait pas de sens.
    o.etapes.forEach(e => {
        if (e.genre !== 'codage') return;
        assert.ok(e.vues.includes(e.figure), `${e.figure} codé avant d'apparaître`);
        assert.ok(DIMS_CODAGE[e.figure], `${e.figure} sans dimensions`);
    });
});

test('LA FIGURE À CODER EST BIEN CELLE QU\'ELLE PRÉTEND ÊTRE', () => {
    // Les dimensions sont écrites à la main : une faute de frappe donnerait un
    // « losange » aux quatre côtés inégaux, et l'élève coderait une figure qui
    // ment. On mesure, comme le fait la correction.
    // AVEC LES DIAGONALES : quatre côtés et quatre demi-diagonales, quatre
    // sommets et le centre. C'est ce que Rémy a demandé, et c'est de là que
    // viennent la moitié des vignettes qui suivent.
    const attendus = {
        parallelogramme: { paquets: 4, droits: 0 },
        rectangle: { paquets: 3, droits: 4 },
        losange: { paquets: 3, droits: 1 },
        carre: { paquets: 2, droits: 5 }
    };
    Object.entries(DIMS_CODAGE).forEach(([type, dims]) => {
        const fig = construireFigure(type, dims, 0);
        const cotes = segmentsDe(true), sommets = pointsAngleDe(true);
        assert.equal(classesDeLongueur(fig, cotes).length, attendus[type].paquets, type);
        assert.equal(anglesDroitsDe(fig, sommets).length, attendus[type].droits, type);
        // Et le codage juste se vérifie : c'est le contrat de l'étape.
        const marques = {};
        classesDeLongueur(fig, cotes).forEach((classe, i) => classe.forEach(id => { marques[id] = i + 1; }));
        const angles = {};
        anglesDroitsDe(fig, sommets).forEach(pt => { angles[pt] = true; });
        assert.equal(verifierCodage(fig, { marques, angles }, cotes, sommets).correct, true, type);
    });
});

test('LE CONTRE-EXEMPLE NE DIT JAMAIS UN FAUX', () => {
    // Rémy : « si l'élève se trompe, il faudrait lui montrer un contre-exemple ».
    // Un contre-exemple faux serait pire que pas de contre-exemple du tout : on
    // vérifie donc les DEUX qualités du témoin, pour toutes les erreurs
    // possibles — chaque condition posée sur chaque flèche où elle n'est pas.
    const textes = [...new Set(FLECHES.map(f => f.ajoute))];
    ETAPES.forEach(e => {
        const justes = conditionsDe(e.de, e.vers).map(f => f.ajoute);
        textes.filter(t => !justes.includes(t)).forEach(texte => {
            const c = contreExemple(e.de, e.vers, texte);
            assert.ok(['contre', 'trop-fort', 'ailleurs'].includes(c.genre),
                `genre inconnu pour ${texte} sur ${e.de}>${e.vers}`);
            if (c.genre === 'contre') {
                // Le témoin est un A — sinon il ne dit rien de cette flèche —
                // et n'est pas toujours un B — sinon ce n'est pas un
                // contre-exemple. Et il possède bien la condition, puisque
                // c'est là qu'elle mène.
                assert.ok(estToujours(c.figure, e.de),
                    `${c.figure} n'est pas toujours un ${e.de}`);
                assert.equal(estToujours(c.figure, e.vers), false,
                    `${c.figure} est toujours un ${e.vers} : ce n'est pas un contre-exemple`);
                assert.ok(FLECHES.some(f => f.ajoute === texte && f.vers === c.figure),
                    `${c.figure} n'est pas l'arrivée de « ${texte} »`);
            }
            if (c.genre === 'trop-fort') {
                // On n'affirme « ce n'est pas faux » que si c'est démontré :
                // tout ce à quoi la condition mène est bien un B.
                FLECHES.filter(f => f.ajoute === texte).forEach(f =>
                    assert.ok(estToujours(f.vers, e.vers),
                        `« trop fort » affirmé à tort : un ${f.vers} n'est pas toujours un ${e.vers}`));
            }
            assert.ok(c.dit && c.dit.length > 40, 'un contre-exemple sans phrase');
        });
    });
});

test('ON PEUT SE PASSER DU CODAGE, et il ne reste que les sept étapes de cartes', () => {
    // Le professeur règle : « Coder la figure à chaque étape » se coupe pour une
    // classe qui n'a pas encore vu le codage.
    const o = genererProgressif({ rng: makeRng('sans'), palier: 'conditions', codage: false });
    assert.equal(o.etapes.length, ETAPES.length);
    assert.equal(o.etapes.every(e => e.genre === 'condition'), true);
});

test('LES FENTES D\'UNE ÉTAPE SONT INTERCHANGEABLES', () => {
    // Les trois façons d'être un parallélogramme sont trois flèches distinctes,
    // mais aucune n'est « la première ». Exiger un ordre aurait inventé une
    // difficulté qui n'existe pas en mathématiques : on demande l'ENSEMBLE des
    // conditions qui mènent de A à B.
    const o = genererProgressif({ rng: makeRng('ordre'), palier: 'conditions' });
    const e = o.etapes.find(x => x.genre === 'condition');
    assert.equal(e.bonnes.length, 3, 'trois façons d\'être un parallélogramme');
    e.cartes.filter(c => c.juste).forEach(c =>
        assert.equal(verifierEtape(e, c).ok, true, `${c.texte} devrait passer`));
});

test('LE REFUS NOMME LA VRAIE PLACE DE LA CARTE, et la confusion', () => {
    // Un refus qui dit « non » n'apprend rien. Celui-ci dit d'où vient la carte,
    // puis reprend la phrase écrite pour cette confusion-là.
    const o = genererProgressif({ rng: makeRng('refus'), palier: 'tout' });
    const versRect = o.etapes.find(e => e.de === 'parallelogramme' && e.vers === 'rectangle');
    const r = refusEtape(versRect, 'Qui a ses diagonales perpendiculaires');
    assert.match(r, /parallélogramme au rectangle/);
    assert.match(r, /au losange/, 'le refus doit dire où va vraiment la carte');
    assert.match(r, /PERPENDICULAIRES/, 'et reprendre la phrase qui enseigne');

    // Et la carte qui sert DEUX FOIS est juste aux deux endroits : « un angle
    // droit » mène du parallélogramme au rectangle ET du losange au carré.
    const versCarre = o.etapes.find(e => e.de === 'losange' && e.vers === 'carre');
    [versRect, versCarre].forEach(e => {
        const v = verifierEtape(e, { texte: 'Qui a deux côtés consécutifs perpendiculaires' });
        assert.equal(v.ok, true, `« côtés consécutifs perpendiculaires » devrait passer en ${e.titre}`);
        assert.match(v.texteJuste, /deux chemins/);
    });
    // Mais pas là où il faut les longueurs.
    const rectCarre = o.etapes.find(e => e.de === 'rectangle' && e.vers === 'carre');
    assert.equal(verifierEtape(rectCarre,
        { texte: 'Qui a deux côtés consécutifs perpendiculaires' }).ok, false);
});

test('L\'AIDE DONNE LES TROIS REGISTRES, jamais la réponse', () => {
    // Une condition de cet organigramme se dit toujours par les CÔTÉS, par les
    // ANGLES ou par les DIAGONALES — il n'y a pas de quatrième façon. L'élève
    // qui bloque a presque toujours trouvé un registre et oublié les deux
    // autres : c'est cela qu'il faut lui rendre, pas le mot qui manque.
    const o = genererProgressif({ rng: makeRng('aide'), palier: 'conditions' });
    const e = o.etapes.find(x => x.genre === 'condition');
    const texte = conseilEtape(e, 1);
    assert.match(texte, /CÔTÉS/);
    assert.match(texte, /ANGLES/);
    assert.match(texte, /DIAGONALES/);
    assert.match(texte, /2 conditions/, 'l\'aide dit combien il en reste');
    e.bonnes.forEach(b => assert.equal(texte.includes(b), false, `l\'aide donne la réponse : ${b}`));
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
    // LES PARTIES SE COCHENT : elles s'enchaînent, elles ne se remplacent pas.
    const schema = exo.paramSchema.find(p => p.id === 'parties');
    assert.equal(schema.type, 'multiselect');
    schema.options.forEach(o => {
        assert.ok(PALIERS[o.value], `palier inconnu : ${o.value}`);
        assert.equal(o.label, PALIERS[o.value].label, `le libellé du palier ${o.value} a divergé du noyau`);
    });
    // Le défaut du catalogue reste la construction étape par étape.
    assert.deepEqual(exo.params.parties, ['conditions']);
    assert.ok(MODES.FAMILLES && MODES.PROPRIETES);
});

test('LES PARTIES S\'ENCHAÎNENT DANS L\'ORDRE DE LA LEÇON, pas dans celui des clics', async () => {
    // Rémy : « on a l'étape organigramme que l'on peut mettre ou non et après
    // celle où il faut compléter les propriétés. Dans les paramètres, il faut
    // pouvoir paramétrer les exercices à étape. »
    //
    // L'ordre est celui de `PALIERS` — les noms, la construction guidée, la
    // construction seule, les questions —, et non celui dans lequel on coche :
    // sinon la même leçon se donnerait à l'endroit ou à l'envers selon le sens
    // des clics.
    const { partiesDe } = await import('../js/games/quadrilateres.js');
    assert.deepEqual(partiesDe({ parties: ['questions', 'noms', 'conditions'] }),
        ['noms', 'conditions', 'questions']);
    // Les doublons et les valeurs inconnues tombent.
    assert.deepEqual(partiesDe({ parties: ['noms', 'noms', 'zzz'] }), ['noms']);
    // JAMAIS DE LISTE VIDE : `poser()` lirait `undefined` et l'exercice
    // n'afficherait rien. On retombe sur l'ancien réglage, puis sur le défaut.
    assert.deepEqual(partiesDe({}), ['conditions']);
    assert.deepEqual(partiesDe({ parties: [] }), ['conditions']);
    assert.deepEqual(partiesDe({ parties: 'zzz' }), ['conditions']);
    assert.deepEqual(partiesDe({ palier: 'assembler' }), ['assembler']);
    // Une chaîne seule vaut une case cochée.
    assert.deepEqual(partiesDe({ parties: 'questions' }), ['questions']);
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


// --- LES VIGNETTES DE PROPRIÉTÉS -------------------------------------------------

test('CHAQUE CONDITION A SA VIGNETTE, courte, pour la carte de la palette', () => {
    // Rémy : « pour l'organigramme, j'aimerais aussi inclure les vignettes de
    // propriétés. Exemple : on part du quadrilatère et pour aller au
    // parallélogramme, on glisse la vignette côtés opposés parallèles. »
    //
    // MESURÉ AU NAVIGATEUR, ET C'EST LA RAISON DE LA LONGUEUR MAXIMALE : posées
    // en clair, treize conditions de quarante-cinq caractères donnaient
    // quatorze recouvrements sur un plan de 560 x 320 pixels — « Parallélogramme »
    // disparaissait sous trois d'entre elles. La vignette doit rester courte,
    // et rien dans le code ne le garantit sinon ce test.
    FLECHES.forEach(f => {
        assert.ok(f.court, `${f.de} → ${f.vers} : pas de vignette`);
        // La vignette n'a plus à tenir sur un TRAIT — la condition a sa boîte
        // depuis qu'on a repris la fiche de Rémy. Elle doit encore tenir sur
        // une CARTE de la palette, qu'on lit d'un coup d'œil avant de la poser.
        assert.ok(f.court.length <= 28,
            `« ${f.court} » fait ${f.court.length} caractères — trop long pour une carte`);
        // La vignette résume la phrase — ou lui est égale quand la phrase
        // était déjà une vignette : « un angle droit » ne s'abrège pas.
        assert.ok(f.court.length <= f.ajoute.length,
            `« ${f.court} » est plus long que « ${f.ajoute} »`);
    });
    // On la retrouve depuis la phrase de la fiche, c'est ce dont l'écran se sert.
    assert.equal(vignetteDe('Qui a ses côtés opposés parallèles'),
        'côtés opposés parallèles');
    assert.equal(vignetteDe('Qui a deux côtés consécutifs perpendiculaires'),
        'un angle droit');
    // Une phrase inconnue ne fait pas planter l'écran : elle se rend elle-même.
    assert.equal(vignetteDe('n\'importe quoi'), 'n\'importe quoi');
});

test('LES DEUX EXERCICES PARLENT LA MÊME LANGUE', () => {
    // La carte qu'on glisse sur une figure pour la déformer, dans « Le
    // Quadrilatère qui se Transforme », doit porter EXACTEMENT les mots de
    // celle qu'on pose sur une flèche ici. Deux exercices, un seul vocabulaire
    // — sans quoi l'élève apprend deux listes au lieu d'une notion.
    //
    // C'est le genre d'accord qui se défait tout seul : deux listes recopiées
    // dans deux fichiers, une retouche d'un côté, et personne ne le voit.
    const avecPropriete = FLECHES.filter(f => f.propriete);
    assert.ok(avecPropriete.length >= 9,
        `seulement ${avecPropriete.length} flèches rattachées à une vignette`);

    avecPropriete.forEach(f => {
        const p = proprieteDe(f.propriete);
        assert.ok(p, `${f.court} : propriété « ${f.propriete} » inconnue de quadriMorph`);
        assert.equal(f.court, p.court,
            `« ${f.court} » ici, « ${p.court} » dans l'autre exercice`);
    });

    // Les deux flèches sans équivalent le sont pour une raison, et pas par
    // oubli : ce sont les raccourcis de sixième, que l'autre exercice ne
    // montre pas.
    const sans = FLECHES.filter(f => !f.propriete).map(f => f.court);
    assert.deepEqual([...new Set(sans)].sort(),
        ['2 côtés consécutifs égaux', '3 ou 4 angles droits']);

    // Et toute vignette de l'autre exercice qui décrit un passage du cours se
    // retrouve ici : on n'en a pas perdu en route.
    const ici = new Set(FLECHES.map(f => f.propriete).filter(Boolean));
    PROPRIETES.forEach(p => {
        assert.ok(ici.has(p.id), `« ${p.court} » n'a aucune flèche dans l'organigramme`);
    });
});

test('LA CARTE POSÉE PORTE LES DEUX ÉCRITURES', () => {
    // `court` s'affiche, `texte` juge et se relit. Perdre l'un des deux casse
    // soit la lisibilité du plan, soit le carnet.
    const org = genererProgressif({ rng: makeRng('vign') });
    org.etapes.filter(e => e.genre === 'condition').forEach(e => {
        e.cartes.forEach(c => {
            assert.ok(c.texte, 'une carte sans phrase');
            assert.ok(c.court, `« ${c.texte} » sans vignette`);
            assert.equal(c.court, vignetteDe(c.texte));
        });
        // Et c'est bien la PHRASE qui juge : la vignette « un angle droit » est
        // identique à elle-même sur deux flèches différentes.
        e.bonnes.forEach(b => assert.equal(verifierEtape(e,
            e.cartes.find(c => c.texte === b)).ok, true));
    });
});


// --- LES VIGNETTES À DÉCOUPER -----------------------------------------------
//
// Rémy : « pour l'organigramme, j'aimerais aussi inclure les vignettes de
// propriétés. On part du quadrilatère et pour aller au parallélogramme, on
// glisse la vignette côtés opposés parallèles. » C'est la troisième page de sa
// fiche : le plan vide, puis le plan rempli, puis la planche à découper.

test('UNE CARTE PAR FLÈCHE, ET NON PAR ÉNONCÉ', () => {
    // Neuf énoncés, treize flèches : quatre conditions servent deux fois. Sur
    // le papier des lettres, une même lettre se reporte à deux endroits. Avec
    // des cartes, on ne peut pas coller la même carte deux fois — il en faut
    // donc treize, dont quatre paires de jumelles.
    const gen = getGenerator('geo.quadrilateres.organigramme');
    const item = gen.generate({ vignettes: true }, { rng: makeRng(11), index: 0 });
    assert.equal(item.meta.vignettes.length, FLECHES.length);
    const cles = item.meta.vignettes.map(v => v.cle);
    assert.equal(new Set(cles).size, FLECHES.length, 'deux cartes pour la même flèche');
    // Et les jumelles existent bien : moins de textes distincts que de cartes.
    const textes = new Set(item.meta.vignettes.map(v => v.texte));
    assert.ok(textes.size < FLECHES.length, 'aucune condition ne sert deux fois');
});

test('la carte qu\'on découpe dit ce que dit la carte qu\'on déplace', () => {
    // Le libellé court est celui des cartes de l'écran (`court`, partagé avec
    // quadriMorph) : c'est le même vocabulaire des deux côtés, sinon ce sont
    // deux leçons.
    const gen = getGenerator('geo.quadrilateres.organigramme');
    const item = gen.generate({ vignettes: true }, { rng: makeRng(4), index: 0 });
    item.meta.vignettes.forEach(v => {
        const f = flecheDe(v.cle);
        assert.ok(f, `clé inconnue : ${v.cle}`);
        assert.equal(v.texte, f.court);
        assert.equal(v.famille, f.famille);
    });
});

test('les cartes sont MÉLANGÉES, sinon l\'exercice se fait sans lire', () => {
    // Rangées dans l'ordre du plan, la première carte irait dans la première
    // case. On vérifie qu'au moins un tirage sur dix dérange l'ordre — et non
    // qu'un tirage donné le dérange, ce qui serait un test du hasard.
    const gen = getGenerator('geo.quadrilateres.organigramme');
    const ordre = FLECHES.map(cleFleche).join('|');
    let derangees = 0;
    for (let s = 1; s <= 10; s++) {
        const item = gen.generate({ vignettes: true }, { rng: makeRng(s), index: 0 });
        if (item.meta.vignettes.map(v => v.cle).join('|') !== ordre) derangees++;
    }
    assert.equal(derangees, 10, 'la planche sort dans l\'ordre du plan');
});

test('sans le réglage, la feuille reste celle des lettres', () => {
    const gen = getGenerator('geo.quadrilateres.organigramme');
    const item = gen.generate({}, { rng: makeRng(3), index: 0 });
    assert.equal(item.meta.vignettes, null);
    assert.equal(item.meta.liste.length, 9);
    // Rémy : « et marque : complète avec les phrases suivantes ». La formule
    // dit le TRAVAIL — compléter l'organigramme avec les phrases — là où
    // « reporte la lettre » ne décrivait que le geste de la main.
    assert.match(item.prompt.papier, /Complète avec les phrases suivantes/);
    assert.match(item.prompt.papier, /case colorée/);
});

test('LA CONSIGNE DIT LE GESTE QU\'ON DEMANDE', () => {
    const gen = getGenerator('geo.quadrilateres.organigramme');
    const avec = gen.generate({ vignettes: true }, { rng: makeRng(3), index: 0 });
    assert.match(avec.prompt.papier, /Découpe/);
    assert.doesNotMatch(avec.prompt.papier, /lettre/);
    // Sans les noms, on demande d'abord de nommer les cinq figures.
    const nu = gen.generate({ vignettes: true, noms: false }, { rng: makeRng(3), index: 0 });
    assert.match(nu.prompt.papier, /nom des cinq figures/);
});

test('TOUTES LES CARTES TIENNENT DANS UNE CASE DU PLAN', () => {
    // La mesure est celle de la fiche : une case de 23 × 18,7 mm, telle que la
    // calcule `planVignettes` sur une page A4 portrait. Une carte qui déborde
    // ne se colle pas — et l'on ne s'en aperçoit qu'une fois photocopié.
    const gen = getGenerator('geo.quadrilateres.organigramme');
    const item = gen.generate({ vignettes: true }, { rng: makeRng(7), index: 0 });
    item.meta.vignettes.forEach(v => {
        const m = ajusterAuRectangle(v.texte, 23 - 1.6, 18.69 - 1.6, { max: 4, min: 1.5 });
        assert.ok(m.lignes.length >= 1, v.texte);
        // Le repli doit avoir eu lieu : une carte d'un seul mot très long
        // signalerait que la mesure a renoncé et laissé déborder.
        const plusLong = Math.max(...m.lignes.map(l => largeurTexte(l)));
        assert.ok(plusLong * m.taille <= 23 - 1.6 + 0.01,
            `« ${v.texte} » déborde : ${(plusLong * m.taille).toFixed(1)} mm`);
        assert.ok(m.lignes.length * m.taille * 1.16 <= 18.69 - 1.6 + 0.01,
            `« ${v.texte} » déborde en hauteur`);
    });
});

// --- LA MISE EN SCÈNE : chaque figure arrive QUELQUE PART ----------------------
//
// Rémy : « au départ, il faut montrer l'organigramme vide en entier, faire
// apparaître le quadrilatère, on zoome dessus en laissant visible la case du
// parallélogramme. Puis on fait apparaître le parallélogramme et là la popup
// s'ouvre. Idem pour les autres. »

test('CHAQUE ÉTAPE DE CODAGE SAIT D\'OÙ SA FIGURE DESCEND', async () => {
    // C'est ce qui permet de cadrer sur les DEUX cases — celle qu'on connaît et
    // celle qui arrive. Une figure qui surgit seule au milieu d'un écran ne dit
    // pas d'où elle sort, et c'est justement ce que l'organigramme enseigne.
    const { genererProgressif, estToujours } = await import('../js/core/quadrilateres.js');
    const org = genererProgressif({ rng: makeRng('scene'), palier: 'conditions', codage: true });
    const codages = org.etapes.filter(e => e.genre === 'codage');
    assert.equal(codages.length, 4, 'quatre figures se codent : para, rectangle, losange, carré');
    codages.forEach(e => {
        assert.ok(e.de, `l'étape « ${e.titre} » ne dit pas d'où elle vient`);
        assert.notEqual(e.de, e.figure);
        // La case d'où l'on vient est bien AU-DESSUS dans la hiérarchie : la
        // figure qui arrive en est un cas particulier.
        assert.equal(estToujours(e.figure, e.de), true,
            `${e.figure} devrait être un cas particulier de ${e.de}`);
        // Et les deux cases sont déjà visibles à cette étape-là : on ne peut pas
        // cadrer sur une case qu'on ne dessine pas.
        assert.ok(e.vues.includes(e.de) && e.vues.includes(e.figure),
            `« ${e.titre} » cadre sur des cases absentes du plan`);
    });
});

test('la figure d\'une étape de codage est celle de la flèche qui l\'amène', () => {
    // Le lien entre la mise en scène et le contenu : ce qu'on montre arriver est
    // bien ce qu'on va coder, et ce qu'on va coder est bien l'arrivée de
    // l'étape de conditions qui suit.
    const org = genererProgressif({ rng: makeRng('scene2'), palier: 'conditions', codage: true });
    org.etapes.forEach((e, i) => {
        if (e.genre !== 'codage') return;
        const suivante = org.etapes[i + 1];
        assert.ok(suivante && suivante.genre === 'condition',
            'un codage est toujours suivi de ses conditions');
        assert.equal(suivante.vers, e.figure);
        assert.equal(suivante.de, e.de);
    });
});

// --- LES FLÈCHES ARRONDIES, PARTAGÉES PAR L'ÉCRAN ET LA FEUILLE ---------------
//
// Rémy, deux fois : « améliore les flèches, c'est pas beau une flèche en
// escaliers » (à l'écran), puis « j'aimerais des flèches arrondies » (sur le
// PDF). Le rayon vit dans le noyau pour que les deux supports dessinent la même
// carte — un chiffre recopié d'un fichier à l'autre finit toujours par diverger.

test('UN COIN ARRONDI RESTE DANS LE COIN, et les bouts ne bougent pas', async () => {
    const { coinsArrondis, RAYON_VIRAGE } = await import('../js/core/quadrilateres.js');
    const brise = [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 40 }];
    const doux = coinsArrondis(brise);
    // Les extrémités sont intactes : une flèche part et arrive au même endroit.
    assert.deepEqual(doux[0], brise[0]);
    assert.deepEqual(doux[doux.length - 1], brise[2]);
    // Le sommet anguleux a disparu, remplacé par des points intermédiaires.
    assert.ok(doux.length > 3, 'le virage doit être échantillonné');
    assert.ok(!doux.some(q => q.x === 40 && q.y === 0), 'le coin vif est resté');
    // Et tout le virage tient dans le carré de rayon autour du coin.
    doux.slice(1, -1).forEach(q => {
        assert.ok(Math.abs(q.x - 40) <= RAYON_VIRAGE + 0.01
            && Math.abs(q.y - 0) <= RAYON_VIRAGE + 0.01,
        `le point (${q.x}, ${q.y}) sort du virage`);
    });
});

test('un segment court réduit son rayon au lieu de faire un nœud', async () => {
    const { coinsArrondis } = await import('../js/core/quadrilateres.js');
    // Deux virages à trois unités l'un de l'autre : à rayon plein, ils se
    // mangeraient et le trait repartirait en arrière.
    const doux = coinsArrondis([{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 3 }, { x: 6, y: 3 }]);
    // La ligne ne revient jamais en arrière en x : c'est la signature d'un nœud.
    for (let i = 1; i < doux.length; i++) {
        assert.ok(doux[i].x >= doux[i - 1].x - 1e-9,
            `le trait recule en x à l'étape ${i}`);
    }
});

test('une ligne de moins de trois points n\'a rien à arrondir', async () => {
    const { coinsArrondis } = await import('../js/core/quadrilateres.js');
    assert.deepEqual(coinsArrondis([{ x: 0, y: 0 }, { x: 5, y: 5 }]),
        [{ x: 0, y: 0 }, { x: 5, y: 5 }]);
    assert.deepEqual(coinsArrondis([]), []);
    assert.deepEqual(coinsArrondis(null), []);
});

test('LES CASES DE LA FEUILLE SONT PASTEL : on écrit dedans', async () => {
    // Rémy : « ne mets pas les carrés d'écriture dans les propriétés, car
    // l'élève écrira dans les cases qui ont une couleur pastel. » Le carré blanc
    // parti, le fond devient la surface d'écriture — et personne n'écrit au
    // crayon gris sur un rouge vif.
    const { COULEURS_FAMILLE } = await import('../js/core/quadrilateres.js');
    const clarte = (hex) => {
        const [r, v, b2] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
        return (0.299 * r + 0.587 * v + 0.114 * b2) / 255;
    };
    Object.entries(COULEURS_FAMILLE).forEach(([nom, c]) => {
        assert.ok(clarte(c.fond) > 0.82, `${nom} : fond trop sombre pour écrire dessus`);
        assert.ok(clarte(c.encre) < 0.35, `${nom} : encre trop pâle sur ce fond`);
    });
    // Et les trois teintes restent DISTINCTES : la couleur dit la famille.
    const fonds = Object.values(COULEURS_FAMILLE).map(c => c.fond);
    assert.equal(new Set(fonds).size, 3);
});

test('LA FENÊTRE CONTIENT TOUJOURS CE QU\'ELLE MONTRE', async () => {
    // Rémy : « il faut que là où on colle la vignette, on le voie en entier. »
    // Les deux raccourcis de sixième relient le quadrilatère au losange et au
    // rectangle en sautant une rangée : leur chemin traverse le plan de haut en
    // bas, et la fenêtre — large de 148 unités, haute de 90, centrée sur
    // l'étape — laissait la case à remplir juste au-dessus du bord. Mesuré au
    // navigateur : 8 à 22 pixels de la cible dehors, aux étapes 5 et 8.
    const { boiteFigure, boiteCondition, FLECHES, ETAPES } =
        await import('../js/core/quadrilateres.js');
    const { fenetreDeLEtape } = await import('../js/games/quadrilateres.js');
    ETAPES.forEach(e => {
        const cond = FLECHES.filter(f => f.de === e.de && f.vers === e.vers);
        const boites = [boiteFigure(e.de), boiteFigure(e.vers), ...cond.map(boiteCondition)];
        const v = fenetreDeLEtape(boites, 148);
        boites.forEach(b => {
            assert.ok(b.x1 >= v.x0 - 0.01 && b.x2 <= v.x0 + v.w + 0.01,
                `${e.de} → ${e.vers} : une boîte sort du cadre en largeur`);
            assert.ok(b.y1 >= v.y0 - 0.01 && b.y2 <= v.y0 + v.h + 0.01,
                `${e.de} → ${e.vers} : une boîte sort du cadre en hauteur`);
        });
    });
});

test('LA FENÊTRE NE COUPE AUCUNE CARTE EN DEUX', async () => {
    // Rémy, capture à l'appui : « on ne voit pas le quadrilatère et le
    // parallélogramme ». Le bord haut du cadre tombait AU MILIEU de la rangée
    // de conditions du dessus : on lisait la moitié des lettres, et la case du
    // quadrilatère au-dessus était hors champ. Mesuré au navigateur sur les
    // dix-huit états de l'exercice : SEPT d'entre eux coupaient des cartes, de
    // 2 à 35 pixels — dont exactement celui de sa capture.
    //
    // La règle est binaire : une carte est entièrement dedans ou entièrement
    // dehors. « À cheval sur le bord » est le seul cas interdit.
    const { boiteFigure, boiteCondition, FLECHES, FAMILLES, ETAPES } =
        await import('../js/core/quadrilateres.js');
    const { fenetreDeLEtape } = await import('../js/games/quadrilateres.js');
    const toutes = [...FAMILLES.map(f => boiteFigure(f.id)), ...FLECHES.map(boiteCondition)];
    ETAPES.forEach(e => {
        const cond = FLECHES.filter(f => f.de === e.de && f.vers === e.vers);
        const boites = [boiteFigure(e.de), boiteFigure(e.vers), ...cond.map(boiteCondition)];
        const v = fenetreDeLEtape(boites, 148, toutes);
        const x1 = v.x0 + v.w, y1 = v.y0 + v.h;
        toutes.forEach(b => {
            const touche = b.x2 > v.x0 + 0.01 && b.x1 < x1 - 0.01
                && b.y2 > v.y0 + 0.01 && b.y1 < y1 - 0.01;
            if (!touche) return;
            assert.ok(b.x1 >= v.x0 - 0.01 && b.x2 <= x1 + 0.01,
                `${e.de} → ${e.vers} : une carte est coupée en largeur`);
            assert.ok(b.y1 >= v.y0 - 0.01 && b.y2 <= y1 + 0.01,
                `${e.de} → ${e.vers} : une carte est coupée en hauteur`);
        });
    });
});

// ---------------------------------------------------------------------------
// LES INTRUS
//
// Rémy : « le 1 » — c'est-à-dire affûter les cartes fausses mêlées aux bonnes.

test('ON NE PROPOSE JAMAIS UNE CARTE QUI EST VRAIE', async () => {
    // C'EST UNE CORRECTION, PAS UN RAFFINEMENT. Deux conditions — celles de
    // sixième — restent vraies bien plus bas que leur flèche : un
    // parallélogramme qui a trois angles droits EST un rectangle. Mesuré avant
    // la correction : six couples (étape, intrus) sur cinquante, soit 12 %,
    // étaient des cartes justes proposées comme pièges. L'élève qui les posait
    // lisait « ce n'est pas faux » et se retrouvait compté en erreur, puis
    // renvoyé au début.
    const { genererProgressif, estTropFort } = await import('../js/core/quadrilateres.js');
    for (let i = 0; i < 120; i++) {
        const o = genererProgressif({ rng: makeRng('intrus' + i), palier: 'tout', codage: false });
        o.etapes.filter(e => e.genre === 'condition').forEach(e => {
            e.cartes.filter(c => !c.juste).forEach(c => {
                assert.equal(estTropFort(e.de, e.vers, c.texte), false,
                    `${e.de} → ${e.vers} : « ${c.court} » est vraie et pourtant proposée comme intrus`);
            });
        });
    }
});

test('L\'INTRUS EST UNE JUMELLE — il parle de la même chose', async () => {
    // Mesuré avant : l'intrus tombait sur une condition du même thème 29 % du
    // temps. Les sept autres fois sur dix, l'élève écartait une carte sans
    // rapport, sans réfléchir — un piège qui ne piège personne n'enseigne rien.
    // Les jumelles, elles, sont exactement les confusions que les textes de
    // `piege` nomment : « des diagonales de MÊME LONGUEUR font le rectangle ;
    // des diagonales PERPENDICULAIRES font le losange ».
    const { genererProgressif, themeDe } = await import('../js/core/quadrilateres.js');
    let jumelles = 0, total = 0;
    for (let i = 0; i < 120; i++) {
        const o = genererProgressif({ rng: makeRng('jum' + i), palier: 'conditions', codage: false });
        o.etapes.filter(e => e.genre === 'condition').forEach(e => {
            const themes = new Set(e.bonnes.map(themeDe));
            e.cartes.filter(c => !c.juste).forEach(c => {
                total++;
                if (themes.has(themeDe(c.texte))) jumelles++;
            });
        });
    }
    assert.ok(total > 0);
    // Chaque étape a au moins une jumelle disponible : au palier à UN intrus,
    // c'est donc toujours une jumelle qui sort.
    assert.equal(jumelles, total, `${jumelles}/${total} intrus sont des jumelles`);
});

test('CHAQUE CONDITION A UN THÈME, ET AUCUN THÈME N\'EST SEUL', async () => {
    // Sans cette garantie, une étape pourrait n'avoir aucune jumelle
    // disponible et retomber silencieusement sur un intrus lointain — le
    // défaut qu'on vient de corriger, revenu sans que rien ne le signale.
    const { FLECHES } = await import('../js/core/quadrilateres.js');
    const parTexte = new Map();
    FLECHES.forEach(f => {
        assert.ok(f.theme, `« ${f.court} » n'a pas de thème`);
        // La même condition portée par deux flèches doit porter le même thème.
        if (parTexte.has(f.ajoute)) assert.equal(f.theme, parTexte.get(f.ajoute));
        parTexte.set(f.ajoute, f.theme);
    });
    const parTheme = {};
    parTexte.forEach((theme, texte) => { (parTheme[theme] = parTheme[theme] || []).push(texte); });
    Object.entries(parTheme).forEach(([theme, liste]) => {
        assert.ok(liste.length >= 2, `le thème « ${theme} » n'a qu'une condition : personne à confondre`);
    });
});

test('UNE CARTE TROP FORTE N\'EST PAS COMPTÉE COMME UNE ERREUR', async () => {
    // `contreExemple` disait déjà « ce n'est pas faux, c'est trop fort » ;
    // `verifierEtape` répondait « faux » quand même, et le jeu inscrivait
    // l'erreur au carnet puis renvoyait au début. Les mots et la conséquence se
    // contredisaient.
    const { verifierEtape, contreExemple, FLECHES } = await import('../js/core/quadrilateres.js');
    const etape = { de: 'parallelogramme', vers: 'rectangle',
        bonnes: FLECHES.filter(f => f.de === 'parallelogramme' && f.vers === 'rectangle')
            .map(f => f.ajoute) };
    const trop = 'Qui a 3 ou 4 angles droits';
    assert.equal(contreExemple(etape.de, etape.vers, trop).genre, 'trop-fort');
    const v = verifierEtape(etape, { texte: trop });
    assert.equal(v.ok, false);
    assert.equal(v.tropFort, true);
    // Et une VRAIE faute reste une vraie faute.
    const faux = verifierEtape(etape, { texte: 'Qui a ses diagonales perpendiculaires' });
    assert.equal(faux.ok, false);
    assert.ok(!faux.tropFort);
});
