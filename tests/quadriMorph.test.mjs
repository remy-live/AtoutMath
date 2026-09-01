// Le quadrilatère qui se transforme : une propriété est une contrainte.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { makeRng } from '../js/core/ids.js';
import { getExerciseById } from '../js/data/catalog.js';
import { FAMILLES } from '../js/core/quadrilateres.js';
import {
    PROPRIETES, PALIERS, CADRE, proprieteDe, caracteresDe, familleApres, familleDeCaracteres,
    nommerFigure, poserFigure, figureDeDepart, ecarts, genererDefi, poser, cheminDe
} from '../js/core/quadriMorph.js';

const ids = PROPRIETES.map(p => p.id);

/** Toutes les combinaisons de zéro, une ou deux propriétés. */
const combinaisons = () => {
    const out = [[]];
    ids.forEach((a, i) => {
        out.push([a]);
        ids.slice(i + 1).forEach(b => out.push([a, b]));
    });
    return out;
};

test('LA FIGURE OBTENUE EST VRAIMENT CELLE QU\'ON ANNONCE', () => {
    // C'EST LE TEST QUI PORTE TOUT L'EXERCICE. La question posée à l'élève est
    // « que va devenir la figure ? » : si le solveur s'arrêtait à mi-chemin —
    // un trapèze dont les côtés font encore quatorze degrés d'écart, un
    // rectangle dont l'angle n'est droit qu'à deux degrés près —, la bonne
    // réponse serait fausse, et l'élève aurait raison contre le logiciel.
    // On relit donc CHAQUE figure produite, pour chaque combinaison possible.
    const depart = figureDeDepart(makeRng('portant'));
    let vues = 0;
    for (const lot of combinaisons()) {
        const P = poserFigure(depart, lot);
        assert.equal(nommerFigure(P), familleApres(lot),
            `${lot.join(' + ') || '(rien)'} : la figure dessinée n'est pas celle annoncée`);
        vues++;
    }
    assert.ok(vues >= 30, `trop peu de combinaisons éprouvées : ${vues}`);
});

test('LA FIGURE NE TRICHE PAS : elle est le cas GÉNÉRIQUE de sa famille', () => {
    // Un losange qui aurait « l'air » carré rendrait la question injuste :
    // l'élève répondrait « carré » et il aurait raison de le répondre. Le
    // solveur repousse donc tout ce qu'on ne lui a pas demandé, et l'écart doit
    // se VOIR — pas seulement dépasser la tolérance de lecture.
    const depart = figureDeDepart(makeRng('generique'));
    const cas = [
        { lot: ['quatreCotesEgaux'], loin: 'droit', mot: 'un losange ne doit pas avoir l\'air carré' },
        { lot: ['opposesParalleles', 'unAngleDroit'], loin: 'egaux', mot: 'un rectangle n\'est pas un carré' },
        { lot: ['opposesParalleles'], loin: 'droit', mot: 'un parallélogramme n\'a pas d\'angle droit' },
        { lot: ['unePaireParallele'], loin: 'par2', mot: 'un trapèze n\'a qu\'UNE paire parallèle' },
        { lot: [], loin: 'par1', mot: 'le quadrilatère quelconque n\'a aucune paire parallèle' }
    ];
    cas.forEach(({ lot, loin, mot }) => {
        const e = ecarts(poserFigure(depart, lot));
        // 0,12 de sinus fait sept degrés, 0,06 de longueur fait six unités sur
        // cent : au-delà, l'œil tranche sans hésiter.
        const seuil = loin === 'egaux' ? 0.06 : 0.12;
        assert.ok(Math.abs(e[loin]) > seuil, `${mot} (écart ${e[loin].toFixed(3)})`);
    });
});

test('LA FIGURE RESTE DESSINABLE — aucun quadrilatère aplati', () => {
    // Sans garde-fou, la façon la moins coûteuse de rendre deux côtés
    // parallèles est de les faire disparaître : le solveur écrasait la figure
    // jusqu'au segment, et l'élève regardait un trait.
    const depart = figureDeDepart(makeRng('plat'));
    for (const lot of combinaisons()) {
        const P = poserFigure(depart, lot);
        P.forEach(([x, y]) => {
            assert.ok(Number.isFinite(x) && Number.isFinite(y), `${lot} : point invalide`);
            assert.ok(x >= 0 && x <= CADRE && y >= 0 && y <= CADRE, `${lot} : hors cadre`);
        });
        const cotes = P.map((p, i) => {
            const q = P[(i + 1) % 4];
            return Math.hypot(q[0] - p[0], q[1] - p[1]);
        });
        assert.ok(Math.min(...cotes) > 14, `${lot} : un côté de ${Math.min(...cotes).toFixed(1)}`);
    }
});

test('L\'ORDRE DE POSE NE CHANGE PAS LA FIGURE FINALE', () => {
    // La géométrie ne se souvient pas de la chronologie : « diagonales
    // perpendiculaires » puis « côtés opposés parallèles » doit donner un
    // losange, exactement comme l'ordre inverse.
    ids.forEach((a, i) => ids.slice(i + 1).forEach(b => {
        assert.equal(familleApres([a, b]), familleApres([b, a]), `${a} / ${b}`);
    }));
});

test('CE QUI NE DIT RIEN TOUT SEUL LE DIT DANS UN PARALLÉLOGRAMME', () => {
    // C'est la découverte du chapitre, et l'exercice est fait pour elle.
    assert.equal(familleApres(['diagonalesPerpendiculaires']), 'quadrilatere');
    assert.equal(familleApres(['opposesParalleles', 'diagonalesPerpendiculaires']), 'losange');
    assert.equal(familleApres(['diagonalesEgales']), 'quadrilatere');
    assert.equal(familleApres(['opposesParalleles', 'diagonalesEgales']), 'rectangle');
    // Un angle droit tout seul ne fait rien non plus : il faut le parallélogramme.
    assert.equal(familleApres(['unAngleDroit']), 'quadrilatere');
    assert.equal(familleApres(['opposesParalleles', 'unAngleDroit']), 'rectangle');
    // Et l'exercice le DIT, au lieu de laisser croire que le clic a raté.
    ['diagonalesEgales', 'diagonalesPerpendiculaires'].forEach(id =>
        assert.ok(proprieteDe(id).seule.length > 40, id));
});

test('TROIS CHEMINS MÈNENT AU PARALLÉLOGRAMME, et c\'est un théorème', () => {
    ['opposesParalleles', 'cotesOpposesEgaux', 'diagonalesMilieu'].forEach(id =>
        assert.equal(familleApres([id]), 'parallelogramme', id));
    // Les deux qui ne vont pas de soi portent leur mot d'étonnement.
    ['cotesOpposesEgaux', 'diagonalesMilieu'].forEach(id =>
        assert.ok(proprieteDe(id).surprise.length > 40, id));
});

test('AUCUNE IMPASSE : toute combinaison a une figure', () => {
    // Toutes les vignettes sont des propriétés « en plus », et le carré les
    // vérifie toutes : l'élève ne peut jamais se coincer, quoi qu'il pose.
    const depart = figureDeDepart(makeRng('impasse'));
    const P = poserFigure(depart, ids);
    assert.equal(nommerFigure(P), 'carre', 'toutes les propriétés ensemble font le carré');
    // Et la famille ne remonte JAMAIS : une contrainte de plus ne peut que
    // rétrécir. C'est le sens même de l'arbre.
    const rang = (f) => FAMILLES.find(x => x.id === f).rang;
    let etat = { posees: [], points: depart, famille: 'quadrilatere' };
    for (const id of ids) {
        const suite = poser(etat, id);
        assert.ok(rang(suite.famille) >= rang(etat.famille),
            `${id} : la famille est remontée de ${etat.famille} à ${suite.famille}`);
        etat = { ...etat, ...suite };
    }
});

test('le quadrilatère de départ n\'a VRAIMENT rien de particulier', () => {
    // Tiré au hasard, il tombait une fois sur cinq sur deux côtés presque
    // parallèles — et l'élève croyait voir un trapèze avant d'avoir rien posé.
    for (let i = 0; i < 25; i++) {
        const P = figureDeDepart(makeRng('depart' + i));
        assert.equal(nommerFigure(P), 'quadrilatere', `graine ${i}`);
        const e = ecarts(P);
        assert.ok(Math.abs(e.par1) > 0.1 && Math.abs(e.par2) > 0.1, `graine ${i} : trop parallèle`);
    }
});

test('le chemin dans l\'arbre suit ce qu\'on a posé', () => {
    assert.deepEqual(cheminDe([]), ['quadrilatere']);
    assert.deepEqual(cheminDe(['opposesParalleles']), ['quadrilatere', 'parallelogramme']);
    assert.deepEqual(cheminDe(['unePaireParallele', 'opposesParalleles']),
        ['quadrilatere', 'trapeze', 'parallelogramme']);
    // Une propriété qui ne change rien n'ajoute pas de case : on ne descend
    // pas deux fois la même marche.
    assert.deepEqual(cheminDe(['opposesParalleles', 'cotesOpposesEgaux']),
        ['quadrilatere', 'parallelogramme']);
});

test('poser une propriété déjà vraie le DIT au lieu de ne rien faire', () => {
    const depart = figureDeDepart(makeRng('deja'));
    const apres = poser({ posees: ['quatreCotesEgaux'], points: poserFigure(depart, ['quatreCotesEgaux']), famille: 'losange' },
        'opposesParalleles');
    assert.equal(apres.famille, 'losange');
    assert.equal(apres.nouveau, false);
    assert.match(apres.mot, /DÉJÀ/);
});

test('chaque palier offre des vignettes qui existent, et de quoi descendre', () => {
    for (const [nom, P] of Object.entries(PALIERS)) {
        assert.ok(P.cartes.length >= 4, nom);
        P.cartes.forEach(id => assert.ok(proprieteDe(id), `${nom} : vignette inconnue ${id}`));
        assert.ok(P.poses >= 1 && P.poses <= P.cartes.length, nom);
        const defi = genererDefi({ rng: makeRng(nom), palier: nom });
        assert.equal(defi.cartes.length, P.cartes.length);
        assert.equal(nommerFigure(defi.depart), 'quadrilatere', nom);
    }
});

test('la même graine redonne la même figure', () => {
    const a = genererDefi({ rng: makeRng('pareil'), palier: 'chemin' });
    const b = genererDefi({ rng: makeRng('pareil'), palier: 'chemin' });
    assert.deepEqual(a.depart, b.depart);
    assert.deepEqual(a.cartes, b.cartes);
});

test('les quatre caractères décident, et les six familles en découlent', () => {
    // Toute la hiérarchie du collège tient à quatre questions. Si l'une des six
    // familles devenait inatteignable, l'arbre aurait un trou.
    const atteintes = new Set();
    [[], ['unePaireParallele'], ['opposesParalleles'], ['opposesParalleles', 'unAngleDroit'],
        ['quatreCotesEgaux'], ['quatreCotesEgaux', 'unAngleDroit']]
        .forEach(lot => atteintes.add(familleApres(lot)));
    assert.equal(atteintes.size, 6, 'les six familles doivent être atteignables');
    FAMILLES.forEach(f => assert.ok(atteintes.has(f.id), `${f.id} est inatteignable`));
    // Et les caractères se composent sans se contredire.
    const c = caracteresDe(['quatreCotesEgaux', 'unAngleDroit']);
    assert.deepEqual(c, { par1: true, par2: true, egaux: true, droit: true });
    assert.equal(familleDeCaracteres(c), 'carre');
});

test('l\'exercice du catalogue tient debout', () => {
    const exo = getExerciseById('geo-quadri-morph');
    assert.ok(exo, 'l\'exercice doit être au catalogue');
    assert.equal(exo.activityId, 'quadri-morph');
    exo.paramSchema.find(p => p.id === 'palier').options.forEach(o => {
        assert.ok(PALIERS[o.value], `palier inconnu : ${o.value}`);
        assert.equal(o.label, PALIERS[o.value].label, `le libellé de ${o.value} a divergé du noyau`);
    });
});
