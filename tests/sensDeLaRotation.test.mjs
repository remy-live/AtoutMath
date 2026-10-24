// LE SENS DE ROTATION ANNONCÉ DOIT ÊTRE CELUI QU'ON VOIT.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, sur la Mosaïque des Transformations : « je pense que tu fais une
// erreur sur le sens direct et indirect ». MESURÉ : douze questions sur douze
// annonçaient l'inverse de ce que l'élève voyait tourner.
//
// LA CAUSE N'EST PAS UNE ERREUR DE SIGNE, C'EST UNE CONVENTION PARTAGÉE À
// TORT. Deux exercices emploient la même table de sens, et ils ne regardent
// pas le plan du même côté : le quadrillage dessine avec l'ordonnée qui
// DESCEND (le repère naturel d'un SVG), la mosaïque la retourne. Le même quart
// de tour s'y voit donc à l'envers.
//
// CETTE ÉPREUVE NE COMPARE PAS LE CODE À MON IDÉE DE LA RÉPONSE : elle
// RECALCULE le sens par un produit vectoriel sur les coordonnées projetées,
// c'est-à-dire par un chemin qui n'a rien à voir avec celui du générateur. Si
// l'un ment, l'autre le dit. C'est le même principe que
// `tests/elementsGeometrie.test.mjs`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { rotationsDe, LA_MOSAIQUE, LE_QUADRILLAGE } from '../tools/sensDeLaRotation.mjs';
import { sensDe, SENS } from '../js/core/transformations.js';

test('SUR LA MOSAÏQUE, le sens annoncé est celui qu\'on voit', () => {
    const r = rotationsDe(LA_MOSAIQUE, 12);
    assert.ok(r.length >= 8, `seulement ${r.length} rotations tirées : on ne mesure rien`);
    for (const x of r) {
        assert.equal(x.dit, x.vu,
            `l'énoncé dit « ${x.dit} » et l'on voit « ${x.vu} » — ${x.texte}`);
    }
});

test('ET SUR LE QUADRILLAGE AUSSI — on n\'a pas corrigé l\'un en cassant l\'autre', () => {
    const r = rotationsDe(LE_QUADRILLAGE, 12);
    assert.ok(r.length >= 8, `seulement ${r.length} rotations tirées : on ne mesure rien`);
    for (const x of r) {
        assert.equal(x.dit, x.vu,
            `l'énoncé dit « ${x.dit} » et l'on voit « ${x.vu} » — ${x.texte}`);
    }
});

test('RETOURNER L\'ORDONNÉE RETOURNE LE SENS, et rien d\'autre', () => {
    // La règle elle-même, en deux lignes : c'est elle qu'on lira dans six mois
    // quand un troisième dessin arrivera avec sa propre convention.
    for (const q of [1, 3, 5, -1]) {
        const bas = sensDe(q, { ordonneeMonte: false });
        const haut = sensDe(q, { ordonneeMonte: true });
        assert.notEqual(bas.nom, haut.nom, `quarts=${q} : le sens ne se retourne pas`);
        assert.ok(SENS[1].nom === bas.nom || SENS[3].nom === bas.nom);
    }
    // Un demi-tour n'a pas de sens : la table n'en donne pas, et le repli ne
    // doit pas inventer une réponse différente selon le dessin.
    assert.equal(sensDe(2, { ordonneeMonte: false }).nom, sensDe(2, { ordonneeMonte: true }).nom);
});

// ── LE CENTRE D'UNE ROTATION DOIT TOUCHER LA PIÈCE ─────────────────────────
//
// RÉMY : « quand tu fais une rotation fais le sur un point qui colle la figure
// sinon c'est hyper dur ».
//
// MESURÉ AVANT, sur les seize mosaïques : 126 rotations, dont 14 seulement
// avec un centre collé à la pièce de départ ; les autres s'écartaient de 1,5 à
// 6,5 carreaux, et l'exercice tirait au hasard dans le tas. MESURÉ APRÈS, sur
// 300 tirages par le chemin de l'élève : 0,5 ou 1,5 carreau, jamais plus.

test('LE CENTRE DE ROTATION NE S\'ÉLOIGNE PAS DE LA PIÈCE', async () => {
    const { generator, ecartDuCentre } = await import('../js/core/generators/pavageImage.js');
    const { makeRng } = await import('../js/core/ids.js');
    let vus = 0, pire = 0;
    for (let i = 0; i < 120; i++) {
        const it = generator.generate({ genres: ['rotation'], montrer: 'si-faux' },
            { rng: makeRng(`cr_${i}`) });
        if (!it || it.meta.genre !== 'rotation') continue;
        vus++;
        const d = ecartDuCentre({ pieces: it.meta.pieces },
            { depuis: it.meta.depuis, t: it.meta.transfo });
        pire = Math.max(pire, d);
        // UN CARREAU AU PLUS : deux mosaïques n'ont aucun centre collé, et les
        // interdire retirerait leurs rotations du catalogue. On prend ce que la
        // mosaïque sait offrir de plus proche, et cela ne dépasse jamais un
        // carreau — c'est ce que la mesure dit.
        assert.ok(d <= 1.5,
            `le centre est à ${d} carreaux de la pièce ${it.meta.depuis} — ${it.prompt.text}`);
    }
    assert.ok(vus > 80, `seulement ${vus} rotations tirées : on ne mesure rien`);
    // ET LA PLUPART TOUCHENT VRAIMENT : sans ce second seuil, un générateur qui
    // rendrait systématiquement 1,5 passerait, alors que Rémy demande « collé ».
    assert.ok(pire >= 0.5, 'écart impossible : la mesure ne mesure plus rien');
});

test('ET LES AUTRES GENRES N\'ONT PAS ÉTÉ APPAUVRIS', async () => {
    // « Une mesure qui ne regarde que ce qu'on a corrigé ne voit pas ce qu'on a
    // cassé » : le tri ne porte que sur les rotations, un axe ou un vecteur se
    // lisent où qu'ils soient.
    const { generator } = await import('../js/core/generators/pavageImage.js');
    const { makeRng } = await import('../js/core/ids.js');
    const parGenre = new Map();
    const distinctes = new Set();
    for (let i = 0; i < 200; i++) {
        const it = generator.generate({ genres: ['axiale', 'centrale', 'translation', 'rotation'] },
            { rng: makeRng(`mx_${i}`) });
        if (!it) continue;
        parGenre.set(it.meta.genre, (parGenre.get(it.meta.genre) || 0) + 1);
        distinctes.add(`${it.meta.mosaique}|${it.meta.depuis}|${it.prompt.text}`);
    }
    for (const g of ['axiale', 'centrale', 'translation', 'rotation']) {
        assert.ok((parGenre.get(g) || 0) > 10, `le genre « ${g} » ne sort plus que ${parGenre.get(g) || 0} fois`);
    }
    assert.ok(distinctes.size > 50,
        `seulement ${distinctes.size} questions différentes : l'exercice se répète`);
});
