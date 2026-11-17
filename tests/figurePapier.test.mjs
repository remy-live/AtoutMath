// LA FEUILLE PORTE LE DESSIN, ET LE DESSIN PORTE LES MÊMES NOMBRES.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 17 novembre : « et il faut la fiche pdf », puis, à ma question sur ce
// qu'elle devait contenir : « avec des shémas évidemment ».
//
// ── LA DETTE QU'IL SOLDE, ET POURQUOI ELLE COÛTAIT CHER ───────────────────
//
// La feuille écrivait les dimensions en toutes lettres : « Calcule l'AIRE d'un
// triangle : base 7 cm, hauteur 4 cm (côté oblique 5 cm) ». C'était honnête
// tant qu'elle n'avait pas le dessin — et c'est devenu NUISIBLE dès qu'elle
// l'a eu. LA HAUTEUR EST TOUT LE CHAPITRE : « un élève qui prend le côté
// oblique a un calcul juste sur de mauvais nombres » (core/aires.js). Devant
// le mot « hauteur » suivi d'un nombre, cette faute est IMPOSSIBLE. La feuille
// mesurait donc autre chose que l'écran, sans que rien ne le dise.
//
// ── CE QUE CETTE ÉPREUVE GARDE, ET CE QUE L'ŒIL GARDE ─────────────────────
//
// ICI : que le dessin dise les MÊMES nombres que le tirage — ni un de moins
// (une cote oubliée rend la question sans réponse), ni un de plus (un nombre
// qui ne vient pas de `t.dims` est un nombre inventé). Et que deux étiquettes
// ne se posent jamais l'une sur l'autre.
//
// LÀ-BAS, LES YEUX : `node tools/ficheEnPdf.mjs mes-aires --items=6 --echelle=2`
// puis REGARDER l'image. Compter les segments d'un PDF dit qu'il n'est pas
// vide, jamais qu'il est juste — et c'est en regardant qu'on a vu « h = 2 cm »
// et « l = 7 cm » s'écrire l'un sur l'autre, le triangle arrière du prisme en
// trait plein, et « r = 7 cm » posé sur l'ellipse du cylindre.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { planAire, planVolume } from '../js/core/planPapier.js';
import { tirerAire, MARCHES_AIRE, dimensionsEcrites as dimAire } from '../js/core/aires.js';
import { tirerVolume, MARCHES_VOLUME,
    dimensionsEcrites as dimVolume } from '../js/core/volumes.js';
import { airesGenerator } from '../js/core/generators/aires.js';
import { volumesGenerator } from '../js/core/generators/volumes.js';

/** Les nombres d'un texte, dans l'ordre. */
const nombres = (s) => (String(s).match(/\d+(?:[.,]\d+)?/g) || [])
    .map(n => Number(n.replace(',', '.')));

/** Tous les nombres écrits sur un plan. */
const nombresDuPlan = (p) => p.textes.flatMap(t => nombres(t.t));

test('CHAQUE COTE DE L\'ÉNONCÉ EST SUR LE DESSIN, ET RIEN D\'AUTRE', () => {
    // LE LIEN ENTRE L'ÉCRAN ET LE PAPIER EST ICI, et il tient à cette épreuve.
    // Les deux lisent le MÊME tirage (`t.dims`) mais dessinent chacun de leur
    // côté : l'écran en SVG, avec ses couleurs et ses tailles de conteneur ; le
    // papier en lignes brisées. Rien n'oblige les deux à rester d'accord —
    // sauf de vérifier que les NOMBRES, eux, sont les mêmes. Le jour où une
    // marche gagnera une dimension, cette épreuve dira si la feuille l'a vue.
    for (const m of MARCHES_AIRE) {
        for (let k = 0; k < 40; k++) {
            const t = tirerAire(makeRng(`a-${m.id}-${k}`), m.id);
            const vus = nombresDuPlan(planAire(t));
            for (const n of nombres(dimAire(t))) {
                assert.ok(vus.includes(n),
                    `${m.id} : ${n} est dans l'énoncé et pas sur le dessin`);
            }
            // ET AUCUN NOMBRE INVENTÉ : tout ce qui est écrit vient du tirage.
            const dims = Object.values(t.dims).map(Number);
            for (const n of vus) {
                assert.ok(dims.includes(n),
                    `${m.id} : ${n} est écrit sur le dessin et ne vient pas du tirage`);
            }
        }
    }
});

test('ET POUR LES SEPT SOLIDES AUSSI', () => {
    for (const m of MARCHES_VOLUME) {
        for (let k = 0; k < 40; k++) {
            const t = tirerVolume(makeRng(`v-${m.id}-${k}`), m.id);
            const vus = nombresDuPlan(planVolume(t));
            for (const n of nombres(dimVolume(t))) {
                assert.ok(vus.includes(n),
                    `${m.id} : ${n} est dans l'énoncé et pas sur le dessin`);
            }
            const dims = Object.values(t.dims).map(Number);
            for (const n of vus) {
                assert.ok(dims.includes(n),
                    `${m.id} : ${n} est écrit sur le dessin et ne vient pas du tirage`);
            }
        }
    }
});

/**
 * Deux étiquettes se touchent-elles ?
 *
 * ON MESURE DANS LES UNITÉS DU PLAN, avec la même estimation de largeur que
 * `cadreDuPlan` — 0,52 × hauteur par caractère, mesuré sur Helvetica. C'est
 * approché, et c'est assez : on cherche des étiquettes qui se SUPERPOSENT, pas
 * des demi-millimètres.
 */
function boites(p, h = 9) {
    return p.textes.map(t => {
        const w = t.t.length * h * 0.52;
        // L'écart est en hauteurs de texte, et il compte : c'est justement lui
        // qui sépare deux étiquettes voisines.
        const x = t.x + (t.dx || 0) * h;
        const y = t.y + (t.dy || 0) * h;
        const g = t.ancre === 'fin' ? x - w : (t.ancre === 'debut' ? x : x - w / 2);
        return { t: t.t, x0: g, x1: g + w, y0: y - h * 0.8, y1: y + h * 0.25 };
    });
}

test('DEUX COTES NE S\'ÉCRIVENT JAMAIS L\'UNE SUR L\'AUTRE', () => {
    // LE DÉFAUT VU SUR LA FEUILLE IMPRIMÉE : sur un pavé PLAT — 6 × 7 × 2 —,
    // « h = 2 cm » et « l = 7 cm » tombaient au même endroit et s'écrivaient
    // l'un par-dessus l'autre, illisibles tous les deux. L'arête verticale est
    // courte quand la hauteur est petite, et l'arête de fuite part justement de
    // là : les deux milieux se rejoignaient.
    //
    // UNE ÉTIQUETTE POSÉE À UNE COORDONNÉE FIXE FINIT TOUJOURS PAR RENCONTRER
    // QUELQUE CHOSE, parce que le dessin, lui, change à chaque tirage. C'est
    // la leçon de « déborde un peu ! » sur les angles, et elle vaut ici.
    const chocs = [];
    const regarder = (nom, p) => {
        const bs = boites(p);
        for (let i = 0; i < bs.length; i++) {
            for (let j = i + 1; j < bs.length; j++) {
                const a = bs[i], b = bs[j];
                if (a.x1 > b.x0 && b.x1 > a.x0 && a.y1 > b.y0 && b.y1 > a.y0) {
                    chocs.push(`${nom} : « ${a.t} » et « ${b.t} »`);
                }
            }
        }
    };
    for (const m of MARCHES_AIRE) {
        for (let k = 0; k < 60; k++) {
            regarder(m.id, planAire(tirerAire(makeRng(`ca-${m.id}-${k}`), m.id)));
        }
    }
    for (const m of MARCHES_VOLUME) {
        for (let k = 0; k < 60; k++) {
            regarder(m.id, planVolume(tirerVolume(makeRng(`cv-${m.id}-${k}`), m.id)));
        }
    }
    assert.deepEqual(chocs.slice(0, 5), [], `${chocs.length} chevauchement(s)`);
});

/**
 * UN SEGMENT TRAVERSE-T-IL CETTE BOÎTE ?
 *
 * Les quatre côtés de la boîte contre le segment, plus les deux bouts du
 * segment dans la boîte — un segment entièrement dedans ne croise aucun côté.
 * ON RÉTRÉCIT LA BOÎTE D'UN MILLIMÈTRE de chaque côté : une étiquette dont le
 * blanc EFFLEURE un trait se lit très bien, et refuser cela ferait une épreuve
 * qu'on finirait par désarmer.
 */
function traverse(a, b, r) {
    const dedans = (p) => p[0] >= r.x0 && p[0] <= r.x1 && p[1] >= r.y0 && p[1] <= r.y1;
    if (dedans(a) || dedans(b)) return true;
    const d = (x, y, z) => (z[0] - x[0]) * (y[1] - x[1]) - (z[1] - x[1]) * (y[0] - x[0]);
    const seg = (p, q, u, v) => {
        const a1 = d(p, q, u), b1 = d(p, q, v), c1 = d(u, v, p), e1 = d(u, v, q);
        return ((a1 > 0) !== (b1 > 0)) && ((c1 > 0) !== (e1 > 0));
    };
    const c = [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]];
    for (let i = 0; i < 4; i++) if (seg(a, b, c[i], c[(i + 1) % 4])) return true;
    return false;
}

test('AUCUNE COTE NE S\'ÉCRIT SUR UN TRAIT', () => {
    // LA GARDE QUI MANQUAIT, et c'est le défaut qu'on a vu de ses yeux sur la
    // feuille : « 14 cm » écrit SUR le côté du rectangle, « r = 7 cm » posé sur
    // l'ellipse du cylindre, « h = 6 cm » en travers de la génératrice du cône.
    // L'épreuve des chevauchements ne compare que des étiquettes ENTRE ELLES —
    // elle était verte pendant que les trois se produisaient.
    //
    // MESURÉ AVANT D'ÊTRE ÉCRITE (`tools/tmp/compte.mjs`, jeté) : cinq
    // croisements sur 440 tirages au premier jet, tous sur le côté oblique ;
    // deux sur 480 après l'avoir posé perpendiculairement ; zéro une fois la
    // hauteur du prisme sortie du dessin. On n'écrit pas « moins de trois » :
    // une borne avec du mou est une borne qui dérive.
    const fautes = [];
    const regarder = (nom, p) => {
        const bs = boites(p);
        const lignes = [...p.traits, ...p.caches];
        for (const b of bs) {
            // Un millimètre de marge, déjà expliqué dans `traverse`.
            const r = { x0: b.x0 + 0.8, x1: b.x1 - 0.8, y0: b.y0 + 0.6, y1: b.y1 - 0.4 };
            for (const l of lignes) {
                let touche = false;
                for (let i = 0; i < l.length - 1 && !touche; i++) {
                    if (traverse(l[i], l[i + 1], r)) touche = true;
                }
                if (touche) { fautes.push(`${nom} : « ${b.t} » sur un trait`); break; }
            }
        }
    };
    for (const m of MARCHES_AIRE) {
        for (let k = 0; k < 80; k++) {
            regarder(m.id, planAire(tirerAire(makeRng(`ta-${m.id}-${k}`), m.id)));
        }
    }
    for (const m of MARCHES_VOLUME) {
        for (let k = 0; k < 80; k++) {
            regarder(m.id, planVolume(tirerVolume(makeRng(`tv-${m.id}-${k}`), m.id)));
        }
    }
    assert.deepEqual(fautes.slice(0, 5), [], `${fautes.length} cote(s) sur un trait`);
});

test('UN SOLIDE A DES ARÊTES CACHÉES, UNE FIGURE PLANE N\'EN A PAS', () => {
    // CE QUI DISTINGUE UN DESSIN DE SOLIDE D'UN DESSIN DE PATRON. Sans les
    // pointillés, un pavé est un hexagone et un prisme est deux triangles posés
    // l'un sur l'autre — c'est exactement ce qu'on a vu sur la première
    // feuille, où le triangle arrière du prisme sortait en trait plein et sa
    // base traversait le solide de part en part.
    // COMBIEN, ET POURQUOI CE NOMBRE-LÀ. Un solide à faces planes vu en
    // perspective cavalière cache TOUJOURS les trois arêtes d'un seul sommet,
    // celui qui passe derrière la face avant — jamais une, jamais deux. Un
    // solide rond, lui, cache la moitié arrière d'un cercle.
    //
    // « Au moins une » ne gardait rien : le prisme sortait son triangle
    // arrière en trait PLEIN, gardait sa hauteur pointillée, et l'épreuve
    // restait verte sur un dessin illisible.
    const MINIMUM = { pave: 3, cube: 3, prisme: 3, pyramide: 3,
        cylindre: 1, cone: 1, boule: 1 };
    for (const m of MARCHES_VOLUME) {
        const p = planVolume(tirerVolume(makeRng('h' + m.id), m.id));
        assert.ok(p.caches.length >= (MINIMUM[m.id] || 1),
            `${m.id} : ${p.caches.length} arête(s) cachée(s), il en faut ${MINIMUM[m.id]}`);
    }
    // ET LE RECTANGLE N'A NI POINTILLÉ NI ANGLE DROIT : ses quatre angles sont
    // droits, en marquer un dirait que les autres ne le sont pas.
    const r = planAire(tirerAire(makeRng('r'), 'rectangle'));
    assert.equal(r.caches.length, 0);
    assert.equal(r.droits.length, 0);
    // LA HAUTEUR DU TRIANGLE, ELLE, EST EN POINTILLÉS ET PORTE SON ANGLE
    // DROIT : c'est lui qui dit que ce trait n'est pas un côté. Sans lui, le
    // pointillé est un trait de construction quelconque — et la faute que la
    // marche existe pour montrer redevient invisible.
    for (const id of ['triangle', 'parallelogramme']) {
        const p = planAire(tirerAire(makeRng('t' + id), id));
        assert.equal(p.caches.length, 1, `${id} : la hauteur doit être en pointillés`);
        assert.equal(p.droits.length, 1, `${id} : et porter son angle droit`);
    }
});

test('AUCUNE FIGURE N\'EST UNE AIGUILLE NI UNE CRÊPE', () => {
    // VU SUR LA FEUILLE : un prisme de base 3 et de hauteur 8 sortait deux fois
    // et demie plus haut que large ; réduit ensuite au plafond de la case, il
    // faisait treize millimètres de large — une tache où les arêtes, la hauteur
    // pointillée et l'angle droit se croisaient toutes.
    //
    // LE DESSIN MENT DÉJÀ UN PEU, ET C'EST ASSUMÉ : `echelle` plafonne à 26
    // depuis toujours, « un rectangle de 12 sur 2 dessiné à l'échelle fait un
    // trait ». Ce sont les COTES qui disent la vérité.
    const pires = [];
    // ON MESURE LE DESSIN, PAS LA BOÎTE AVEC SES ÉTIQUETTES.
    //
    // Première version : `cadreDuPlan`, qui compte les cotes. Elle ne gardait
    // RIEN, et `epreuveTombe` l'a dit — on retire le plafond de proportions,
    // le prisme redevient une aiguille, et le cadre reste large parce que les
    // étiquettes, elles, gardent leur largeur. On mesurait donc la largeur du
    // texte, pas la forme du solide.
    const cadreDuDessin = (p) => {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const l of [...p.traits, ...p.caches]) {
            for (const [x, y] of l) {
                if (x < x0) x0 = x; if (x > x1) x1 = x;
                if (y < y0) y0 = y; if (y > y1) y1 = y;
            }
        }
        return { w: Math.max(x1 - x0, 0.1), h: Math.max(y1 - y0, 0.1) };
    };
    const regarder = (nom, p) => {
        const c = cadreDuDessin(p);
        const r = c.h / c.w;
        // LES DEUX BORNES NE SONT PAS SYMÉTRIQUES, ET C'EST VOULU. Un
        // rectangle de 14 sur 2 est PLAT par nature, et plat il se lit très
        // bien : ses deux cotes vivent dehors, l'une dessous, l'autre à
        // gauche. Une AIGUILLE, elle, écrase tout dans une seule colonne —
        // les arêtes, la hauteur pointillée et l'angle droit finissent dans la
        // même tache d'encre. Mesuré sur la feuille : 0,16 passe, 2,7 non.
        if (r > 3.2 || r < 0.12) pires.push(`${nom} : ${c.w.toFixed(0)}×${c.h.toFixed(0)}`);
    };
    for (const m of MARCHES_AIRE) {
        for (let k = 0; k < 40; k++) {
            regarder(m.id, planAire(tirerAire(makeRng(`fa-${m.id}-${k}`), m.id)));
        }
    }
    for (const m of MARCHES_VOLUME) {
        for (let k = 0; k < 40; k++) {
            regarder(m.id, planVolume(tirerVolume(makeRng(`fv-${m.id}-${k}`), m.id)));
        }
    }
    // ET LES PIRES CAS SE DEMANDENT, ILS NE S'ATTENDENT PAS.
    //
    // Les tirages aléatoires ne les donnent qu'une fois sur quelques dizaines,
    // et une épreuve qui compte sur la chance passe au vert le jour où le
    // tirage change. Ce sont pourtant ces cas-là qui ont produit le sliver vu
    // sur la feuille : un prisme de base 3 et de hauteur 8, une pyramide de
    // 3 cm de côté et 12 cm de haut.
    const EXTREMES = [
        ['triangle', { marche: 'triangle', quoi: 'aire', unite: 'cm',
            dims: { b: 2, h: 14, oblique: 14 } }, planAire],
        ['parallelogramme', { marche: 'parallelogramme', quoi: 'aire', unite: 'cm',
            dims: { b: 2, h: 14, oblique: 14 } }, planAire],
        ['prisme', { marche: 'prisme', unite: 'cm',
            dims: { b: 3, hb: 8, H: 4 } }, planVolume],
        ['pyramide', { marche: 'pyramide', unite: 'cm',
            dims: { c: 3, h: 12 } }, planVolume]
    ];
    for (const [nom, t, faire] of EXTREMES) regarder(nom + ' (extrême)', faire(t));
    assert.deepEqual(pires.slice(0, 5), [], `${pires.length} figure(s) hors proportions`);
});

test('L\'ÉNONCÉ PAPIER NE RÉCITE PLUS LES DIMENSIONS, ET PORTE LE PLAN', () => {
    // DEUX FOIS LA MÊME MESURE EST PIRE QUE PAS DE DESSIN : l'élève qui lit la
    // phrase n'a plus à regarder la figure, et lire un dessin coté est une
    // moitié du chapitre. C'est pour cela que `enoncePapierDe` a quitté les
    // deux générateurs le jour où le plan est arrivé.
    for (const [gen, marches] of [[airesGenerator, MARCHES_AIRE],
        [volumesGenerator, MARCHES_VOLUME]]) {
        for (const m of marches) {
            const it = gen.generate({ marches: [m.id] },
                { rng: makeRng('pp' + m.id), index: 0, total: 1, papier: true });
            assert.ok(it.prompt.figure, `${m.id} : la feuille n'a pas de dessin`);
            assert.ok(it.prompt.figure.textes.length >= 1,
                `${m.id} : le dessin ne porte aucune cote`);
            // L'ÉNONCÉ NE PORTE PLUS AUCUN NOMBRE : « Calcule l'AIRE de ce
            // rectangle. » — les nombres sont sur la figure, et nulle part
            // ailleurs.
            const dedans = (it.prompt.papier.match(/\d/g) || []).length;
            assert.equal(dedans, 0,
                `${m.id} : l'énoncé papier récite encore des nombres — « ${it.prompt.papier} »`);
        }
    }
});
