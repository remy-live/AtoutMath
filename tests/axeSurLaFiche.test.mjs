// LES DROITES GRADUÉES SUR LE PAPIER — les règles qui se tiennent sous Node.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, dans sa revue du catalogue :
//
//   sec-valeur-absolue  « présente-le sous forme de tableau pour avoir la même
//                        taille à gauche et la place à droite. Tu peux dessiner
//                        l'axe avec ou sans valeur pour l'impression »
//   sec-union-inter     « présente en tableau et dessine les axes »
//
// ── CE QUI EST ICI, ET CE QUI EST DANS LA SONDE ───────────────────────────
//
// Une fiche est un DESSIN : qu'il y ait vraiment des traits sur la feuille,
// que l'axe remplisse la place à droite, que l'énoncé soit à la hauteur de sa
// droite — tout cela se mesure dans un navigateur, et c'est le travail de
// `tools/ficheAxes.mjs`.
//
// Ce qui se tient ici, ce sont les RÈGLES du plan, qui sont du calcul pur et
// qui ont toutes coûté quelque chose :
//
//   · sur le papier on écrit TOUS les entiers — une droite de 1 à 11 où seul
//     « 1 » est écrit ne permet pas de poser une borne ;
//   · une valeur qui tombe ENTRE deux graduations va sur une seconde ligne —
//     « −7 −6,5 −6 » se touchaient sur le corrigé ;
//   · le barreau 8 emporte sa solution, parce que son dessin est l'ÉNONCÉ ;
//   · et le barreau 1 ne s'imprime pas sur une fiche d'axes, parce que sa
//     réponse n'est pas un dessin.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planDAxe } from '../js/core/generators/intervalles.js';
import { valeurAbsolueGenerator } from '../js/core/generators/valeurAbsolue.js';
import { solutionTexte } from '../js/core/valeursAbsolues.js';
import { makeRng } from '../js/core/ids.js';

const UN = [{ a: 2, b: 5, ea: true, eb: false }];
const ecrits = (p) => p.nombres.map(n => n.v).sort((a, b) => a - b);

test('SUR LE PAPIER, TOUS LES ENTIERS SONT ÉCRITS', () => {
    // À l'écran, deux repères suffisent : l'axe se LIT. Sur la feuille, l'élève
    // TRACE, et il doit poser une borne au bon endroit.
    const ecran = planDAxe(UN, {});
    const papier = planDAxe(UN, { tousLesEntiers: true });
    assert.ok(papier.nombres.length > ecran.nombres.length,
        `papier ${papier.nombres.length} nombre(s), écran ${ecran.nombres.length}`);
    // Tous les entiers de la fenêtre, sans trou : c'est ce qui en fait des
    // repères. Un sur deux ne servirait qu'à moitié.
    const entiers = ecrits(papier).filter(Number.isInteger);
    for (let v = entiers[0]; v <= entiers[entiers.length - 1]; v++) {
        assert.ok(entiers.includes(v), `l'entier ${v} manque sur la droite du papier`);
    }
});

test('UN AXE VIDE PORTE LES MÊMES REPÈRES QUE CELUI QU\'ON LIT', () => {
    // L'axe où l'élève trace sa réponse est gradué comme ceux du dessus, sans
    // quoi il recopierait une LONGUEUR au lieu de lire une borne.
    // LA MÊME FENÊTRE DES DEUX CÔTÉS — c'est la condition de la règle, pas un
    // détail du montage : deux axes de fenêtres différentes porteraient des
    // nombres différents sans que rien ne soit cassé. (Première version de
    // cette épreuve : elle tombait là-dessus, et elle avait raison de tomber.)
    const FEN = { min: 1, max: 6, pas: 320 / 5 };
    const plein = planDAxe(UN, { fenetre: FEN, tousLesEntiers: true });
    const vide = planDAxe([], {
        fenetre: FEN, tousLesEntiers: true, bornesEnPlus: [2, 5]
    });
    assert.deepEqual(ecrits(vide).filter(Number.isInteger),
        ecrits(plein).filter(Number.isInteger),
        'l\'axe vide et l\'axe tracé doivent porter les mêmes nombres');
    assert.equal(vide.parts.length, 0, 'mais l\'axe vide ne trace rien');
});

test('UNE VALEUR ENTRE DEUX GRADUATIONS PART SUR LA SECONDE LIGNE', () => {
    // « −7  −6,5  −6 » se touchaient sur le corrigé de |x + 2| < 4,5, parce que
    // la feuille écrit tous les entiers ET les bornes.
    const p = planDAxe([{ a: -6.5, b: 2.5, ea: false, eb: false }],
        { tousLesEntiers: true });
    const decales = p.nombres.filter(n => n.entre).map(n => n.v).sort((a, b) => a - b);
    assert.deepEqual(decales, [-6.5, 2.5]);
    assert.ok(p.nombres.filter(n => Number.isInteger(n.v)).every(n => !n.entre),
        'un entier tombe sur sa graduation : il reste sur la première ligne');
});

test('UN POINT DÉCIMAL SE DÉCALE COMME UNE BORNE DÉCIMALE', () => {
    // Deux règles pour un même encombrement finiraient par diverger.
    const p = planDAxe([], { points: [-6.5, -5.5], tousLesEntiers: true,
        fenetre: { min: -8, max: -4, pas: 320 / 4 } });
    const pts = p.nombres.filter(n => n.gras);
    assert.ok(pts.length >= 2, `${pts.length} point(s) nommés`);
    assert.ok(pts.every(n => n.entre), 'un point à −6,5 s\'écrit sur la seconde ligne');
});

// ── LE GÉNÉRATEUR, CÔTÉ PAPIER ─────────────────────────────────────────────

const tirer = (marche, papier) => valeurAbsolueGenerator.generate(
    { marches: [marche] },
    { rng: makeRng(), index: 0, total: 1, papier, themesExclus: [] });

test('LE BARREAU 8 EMPORTE SA SOLUTION ET SE DÉCLARE DONNÉE', () => {
    // Son dessin est l'ÉNONCÉ — « écris la condition qui décrit l'ensemble
    // dessiné ». Sans `solution` dans le meta, la fiche n'avait rien à
    // dessiner ; sans `donnee`, elle sortait un axe VIDE sous cette question,
    // c'est-à-dire la question privée de sa donnée.
    const q = tirer('inverse', true);
    assert.equal(q.meta.marche, 'inverse');
    assert.ok(q.meta.solution, 'le barreau 8 doit porter sa solution');
    assert.equal(q.meta.donnee, true, 'et dire que ce dessin est l\'énoncé');
    assert.ok(q.meta.reponse, 'et la condition attendue, pour le corrigé');
    // L'ÉNONCÉ PAPIER NE DONNE PLUS L'ENSEMBLE ÉCRIT : il renvoie au dessin.
    // L'écrire revenait à faire la moitié du travail — il n'y avait plus qu'à
    // traduire deux crochets, sans jamais regarder un axe.
    //
    // ON COMPARE À `solutionTexte`, PAS À UN MOTIF. La première version
    // cherchait `/[[\]]\s*-?\d/`, et `epreuveTombe` l'a vue rester VERTE avec
    // le défaut remis : un ensemble de points s'écrit « {−6 ; 4} » entre
    // ACCOLADES, et le signe moins est le « − » typographique, que `-?\d` ne
    // reconnaît pas. Une épreuve qui devine la forme de ce qu'elle interdit
    // n'interdit que la forme qu'elle a devinée.
    assert.ok(!q.prompt.papier.includes(solutionTexte(q.meta.solution)),
        `l'énoncé papier écrit la réponse : « ${q.prompt.papier} »`);
});

test('LE BARREAU 1 NE S\'IMPRIME PAS SUR UNE FICHE D\'AXES', () => {
    // « |x − 5| se lit : ? » est un choix entre quatre phrases : sa réponse
    // n'est pas un dessin, et sur la fiche sa moitié droite restait BLANCHE.
    // Une ligne qu'on ne peut pas remplir occupe quand même sa place.
    const papier = tirer('lire', true);
    assert.ok(papier.meta.solution,
        'sur le papier, le barreau 1 rend une question à DESSINER');

    // ET IL EXISTE TOUJOURS À L'ÉCRAN, où ses quatre phrases ont un sens.
    const ecran = tirer('lire', false);
    assert.equal(ecran.meta.marche, 'lire');
    assert.ok(!ecran.meta.solution, 'à l\'écran, c\'est bien la question de lecture');
});
