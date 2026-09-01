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
    traceFleche, posEtiquette, conditionsDe, CASE_L, CASE_H,
    ETAPES, genererProgressif, casesVisibles, verifierEtape, refusEtape, conseilEtape
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

test('COUCHÉ, LES TREIZE ÉTIQUETTES NE SE TOUCHENT PLUS', () => {
    // MESURÉ SUR LA VERSION EN COLONNE, celle que Rémy a jugée « illisible » :
    // trois libellés de quarante caractères ne tiennent pas dans l'intervalle
    // entre deux cases superposées. Couché, chaque condition a son propre trait
    // et son propre point de passage — on vérifie ici qu'aucun de ces treize
    // points n'en touche un autre, ni ne tombe sur une case.
    //
    // Les unités des deux axes n'ont pas la même valeur à l'écran : le plan
    // fait 1,75 fois plus large que haut, donc une unité de x vaut 1,75 unité
    // de y en distance réelle. La mesure en tient compte, sans quoi elle
    // déclarerait sûres des étiquettes empilées à la verticale.
    const RAPPORT = 1.75;
    const pos = FLECHES.map(posEtiquette);
    for (let i = 0; i < pos.length; i++) {
        for (let j = i + 1; j < pos.length; j++) {
            const dx = (pos[i].x - pos[j].x) * RAPPORT, dy = pos[i].y - pos[j].y;
            const d = Math.hypot(dx, dy);
            assert.ok(d > 8, `deux étiquettes à ${d.toFixed(1)} : `
                + `${cleFleche(FLECHES[i])} et ${cleFleche(FLECHES[j])}`);
        }
    }
    // Et aucune ne tombe dans une case. Une case occupe une demi-largeur et une
    // demi-hauteur de part et d'autre de sa position, ramenées aux unités du
    // plan rétréci — voir CASE_L et CASE_H.
    const demiX = (CASE_L / 2) / (100 - CASE_L) * 100;
    const demiY = (CASE_H / 2) / (100 - CASE_H) * 100;
    pos.forEach((pt, i) => Object.entries(POSITIONS).forEach(([nom, c]) => {
        assert.ok(Math.abs(pt.x - c.x) > demiX || Math.abs(pt.y - c.y) > demiY,
            `${cleFleche(FLECHES[i])} : son étiquette est posée sur la case ${nom}`);
    }));
});

test('COUCHÉ, LES RACCOURCIS PASSENT EN LIGNE DROITE', () => {
    // EN COLONNE ILS DEVAIENT CONTOURNER PAR LE BORD : « trois ou quatre angles
    // droits » va du quadrilatère au rectangle en sautant le parallélogramme, et
    // un trait droit lui passait DESSUS. Couché, le rectangle est en haut et le
    // losange en bas : le trait passe très au-dessus, ou très au-dessous, de la
    // case du milieu. C'est un gain réel de la disposition, pas un détail de
    // dessin — trois segments coudés se lisent moins bien qu'une droite.
    const court = FLECHES.find(f => f.de === 'quadrilatere' && f.vers === 'rectangle');
    const t = traceFleche(court);
    assert.equal(t.contourne, false, 'plus de contournement par le bord de la page');

    // Le trait passe-t-il vraiment à côté de la case du parallélogramme ? On
    // échantillonne toute la polyligne, et on mesure l'écart à la case à
    // l'endroit le plus serré. MESURÉ SUR LE TRAIT DROIT : 2,5 unités, soit six
    // pixels sur un écran d'ordinateur — on croyait le voir s'arrêter sur la
    // case. C'est ce qui a fait incurver les deux raccourcis.
    const demiX = (CASE_L / 2) / (100 - CASE_L) * 100;
    const demiY = (CASE_H / 2) / (100 - CASE_H) * 100;
    const par = POSITIONS.parallelogramme;
    const ecart = (fleche) => {
        const pts = traceFleche(fleche).points;
        let pire = Infinity;
        for (let i = 1; i < pts.length; i++) {
            for (let k = 0; k <= 100; k++) {
                const a = pts[i - 1], b = pts[i];
                const x = a.x + (b.x - a.x) * (k / 100), y = a.y + (b.y - a.y) * (k / 100);
                if (Math.abs(x - par.x) > demiX) continue;
                pire = Math.min(pire, Math.abs(y - par.y) - demiY);
            }
        }
        return pire;
    };
    assert.ok(ecart(court) > 12, `le raccourci frôle le parallélogramme à ${ecart(court).toFixed(1)}`);

    // Et les deux raccourcis partent de part et d'autre : l'un vers le haut,
    // l'autre vers le bas.
    const bas = FLECHES.find(f => f.de === 'quadrilatere' && f.vers === 'losange');
    assert.ok(ecart(bas) > 12, `le raccourci du bas frôle à ${ecart(bas).toFixed(1)}`);
    assert.ok(posEtiquette(court).y < 50 && posEtiquette(bas).y > 50);
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
        assert.equal(o.etapes.length, ETAPES.length, palier);
        let total = 0;
        o.etapes.forEach(e => {
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

test('LES FENTES D\'UNE ÉTAPE SONT INTERCHANGEABLES', () => {
    // Les trois façons d'être un parallélogramme sont trois flèches distinctes,
    // mais aucune n'est « la première ». Exiger un ordre aurait inventé une
    // difficulté qui n'existe pas en mathématiques : on demande l'ENSEMBLE des
    // conditions qui mènent de A à B.
    const o = genererProgressif({ rng: makeRng('ordre'), palier: 'conditions' });
    const e = o.etapes[0];
    assert.equal(e.bonnes.length, 3, 'trois façons d\'être un parallélogramme');
    e.cartes.filter(c => c.juste).forEach(c =>
        assert.equal(verifierEtape(e, c).ok, true, `${c.texte} devrait passer`));
});

test('LE REFUS NOMME LA VRAIE PLACE DE LA CARTE, et la confusion', () => {
    // Un refus qui dit « non » n'apprend rien. Celui-ci dit d'où vient la carte,
    // puis reprend la phrase écrite pour cette confusion-là.
    const o = genererProgressif({ rng: makeRng('refus'), palier: 'tout' });
    const versRect = o.etapes.find(e => e.de === 'parallelogramme' && e.vers === 'rectangle');
    const r = refusEtape(versRect, 'les diagonales sont perpendiculaires');
    assert.match(r, /parallélogramme au rectangle/);
    assert.match(r, /au losange/, 'le refus doit dire où va vraiment la carte');
    assert.match(r, /PERPENDICULAIRES/, 'et reprendre la phrase qui enseigne');

    // Et la carte qui sert DEUX FOIS est juste aux deux endroits : « un angle
    // droit » mène du parallélogramme au rectangle ET du losange au carré.
    const versCarre = o.etapes.find(e => e.de === 'losange' && e.vers === 'carre');
    [versRect, versCarre].forEach(e => {
        const v = verifierEtape(e, { texte: 'un angle droit' });
        assert.equal(v.ok, true, `« un angle droit » devrait passer en ${e.titre}`);
        assert.match(v.texteJuste, /deux chemins/);
    });
    // Mais pas là où il faut les longueurs.
    const rectCarre = o.etapes.find(e => e.de === 'rectangle' && e.vers === 'carre');
    assert.equal(verifierEtape(rectCarre, { texte: 'un angle droit' }).ok, false);
});

test('L\'AIDE DONNE LES TROIS REGISTRES, jamais la réponse', () => {
    // Une condition de cet organigramme se dit toujours par les CÔTÉS, par les
    // ANGLES ou par les DIAGONALES — il n'y a pas de quatrième façon. L'élève
    // qui bloque a presque toujours trouvé un registre et oublié les deux
    // autres : c'est cela qu'il faut lui rendre, pas le mot qui manque.
    const o = genererProgressif({ rng: makeRng('aide'), palier: 'conditions' });
    const e = o.etapes[0];
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
