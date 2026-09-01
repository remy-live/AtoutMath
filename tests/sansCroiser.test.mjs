// Relier sans croiser : la géométrie, les trois interdits, et la solvabilité.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import '../js/core/activities/index.js';
import { getGenerator } from '../js/core/registry.js';
import { getExerciseById } from '../js/data/catalog.js';
import { RENDUS } from '../js/ui/printSheet.js';
import {
    PALIERS, CONSIGNE, CADRE, LETTRES, genererFigure, verifierTrait, verifierFigure,
    segmentsSeCoupent, segmentTouche, dansRect, carres, croisementsDroits, conseil
} from '../js/core/sansCroiser.js';

const P = (x, y) => ({ x, y });

test('deux segments qui se coupent, et ceux qui ne se coupent pas', () => {
    assert.equal(segmentsSeCoupent(P(0, 0), P(10, 10), P(0, 10), P(10, 0)), true, 'la croix');
    assert.equal(segmentsSeCoupent(P(0, 0), P(10, 0), P(0, 5), P(10, 5)), false, 'parallèles');
    assert.equal(segmentsSeCoupent(P(0, 0), P(10, 0), P(20, 0), P(30, 0)), false, 'alignés mais disjoints');
    // Deux traits SUPERPOSÉS se croisent, du point de vue de l'élève : on ne
    // peut pas repasser sur un trait déjà tracé en prétendant ne pas le couper.
    assert.equal(segmentsSeCoupent(P(0, 0), P(10, 0), P(5, 0), P(15, 0)), true, 'superposés');
    // Un simple contact par une extrémité compte aussi : le trait touche.
    assert.equal(segmentsSeCoupent(P(0, 0), P(10, 0), P(10, 0), P(10, 10)), true, 'bout à bout');
});

test('un segment qui touche un rectangle', () => {
    const r = { x: 10, y: 10, l: 6, h: 6 };
    assert.equal(segmentTouche(P(0, 13), P(30, 13), r), true, 'il le traverse');
    assert.equal(segmentTouche(P(0, 0), P(5, 5), r), false, 'il passe à côté');
    assert.equal(segmentTouche(P(12, 12), P(30, 30), r), true, 'il en part');
    assert.equal(segmentTouche(P(0, 10), P(30, 10), r), true, 'il longe son bord');
    assert.equal(dansRect(P(13, 13), r), true);
    assert.equal(dansRect(P(13, 30), r), false);
});

test('CHAQUE FIGURE A UNE SOLUTION, ET ELLE PASSE LA VÉRIFICATION', () => {
    // C'est le point qui ne se négocie pas : on ne propose jamais une figure
    // impossible. La solution est construite avant l'énoncé, et on la fait
    // repasser par le juge de l'élève — si le juge la refusait, c'est le juge
    // ou le générateur qui aurait tort, et l'élève ne pourrait pas savoir.
    for (const [nom, cfg] of Object.entries(PALIERS)) {
        let obtenues = 0;
        for (let s = 1; s <= 20; s++) {
            const fig = genererFigure({ rng: makeRng(`${nom}-${s}`), palier: nom });
            if (!fig) continue;
            obtenues++;
            assert.equal(fig.lettres.length, cfg.paires, nom);
            assert.equal(fig.bornes.length, cfg.paires * 2, nom);
            const bilan = verifierFigure(fig, fig.solution);
            assert.equal(bilan.fini, true,
                `${nom} graine ${s} : la solution est refusée — ${bilan.raison || bilan.manque}`);
        }
        assert.ok(obtenues >= 15, `${nom} : seulement ${obtenues} figures sur 20`);
    }
});

test('UNE FIGURE OÙ TOUS LES TRAITS DROITS PASSENT N\'EST PAS UN EXERCICE', () => {
    // Le premier générateur traçait des chemins bien séparés puis posait les
    // carrés à leurs bouts : les figures étaient résolubles et NULLES — mesuré,
    // zéro croisement droit sur quatre-vingts figures, chaque paire dans son
    // coin, l'élève reliait à la règle sans rien apprendre. On exige donc que
    // la solution naïve échoue quelque part.
    for (const [nom, cfg] of Object.entries(PALIERS)) {
        for (let s = 1; s <= 12; s++) {
            const fig = genererFigure({ rng: makeRng(`droit-${nom}-${s}`), palier: nom });
            if (!fig) continue;
            assert.ok(croisementsDroits(fig) >= cfg.croisementsMin,
                `${nom} graine ${s} : ${croisementsDroits(fig)} croisement(s), il en faut ${cfg.croisementsMin}`);
        }
    }
});

test('les carrés ne se touchent jamais', () => {
    // Deux carrés collés ne laisseraient pas de place pour glisser un trait
    // entre eux : la figure serait juste et intraçable.
    for (const nom of Object.keys(PALIERS)) {
        for (let s = 1; s <= 10; s++) {
            const fig = genererFigure({ rng: makeRng(`ecart-${nom}-${s}`), palier: nom });
            if (!fig) continue;
            const cs = carres(fig);
            for (let i = 0; i < cs.length; i++) {
                for (let j = i + 1; j < cs.length; j++) {
                    const chevauche = !(cs[i].x + cs[i].l < cs[j].x || cs[j].x + cs[j].l < cs[i].x
                        || cs[i].y + cs[i].h < cs[j].y || cs[j].y + cs[j].h < cs[i].y);
                    assert.equal(chevauche, false, `${nom} graine ${s} : deux carrés se touchent`);
                }
                // Et tout carré est bien DANS le cadre.
                assert.ok(cs[i].x >= CADRE.x && cs[i].y >= CADRE.y
                    && cs[i].x + cs[i].l <= CADRE.x + CADRE.l
                    && cs[i].y + cs[i].h <= CADRE.y + CADRE.h, `${nom} : un carré déborde du cadre`);
            }
        }
    }
});

test('LE REFUS NOMME L\'INTERDIT ENFREINT, IL NE DIT PAS « FAUX »', () => {
    // « Ce n'est pas ça » n'apprend rien. « Ton trait passe sur le carré B »
    // nomme l'obstacle — et c'est justement l'interdit que les élèves oublient.
    const fig = genererFigure({ rng: makeRng('refus'), palier: 'moyen' });
    const A = fig.bornes.filter(b => b.lettre === 'A');
    const B = fig.bornes.filter(b => b.lettre === 'B');

    // Partir d'ailleurs que d'un carré A.
    const ailleurs = verifierTrait(fig, 'A', [P(1, 1), { ...A[1] }]);
    assert.equal(ailleurs.ok, false);
    assert.match(ailleurs.raison, /partir d'un carré A/);

    // Repartir sur le même carré.
    const boucle = verifierTrait(fig, 'A', [{ ...A[0] }, P(A[0].x + 2, A[0].y + 2), { ...A[0] }]);
    assert.equal(boucle.ok, false);
    assert.match(boucle.raison, /même carré/);

    // Sortir du cadre.
    const dehors = verifierTrait(fig, 'A', [{ ...A[0] }, P(-40, -40), { ...A[1] }]);
    assert.equal(dehors.ok, false);
    assert.match(dehors.raison, /sort du cadre/);

    // Passer sur un carré B : le trait droit qui traverse le centre de B.
    const surB = verifierTrait(fig, 'A', [{ ...A[0] }, { ...B[0] }, { ...A[1] }]);
    assert.equal(surB.ok, false);
    assert.match(surB.raison, /passe sur le carré B/);
});

test('UN TRAIT QUI SE CROISE LUI-MÊME EST REFUSÉ', () => {
    // Un cadre nu, deux carrés A éloignés : ainsi le seul reproche possible est
    // le croisement, et le test ne peut pas passer pour une autre raison.
    const fig = {
        cadre: { ...CADRE }, cote: 6,
        bornes: [{ x: 10, y: 10, lettre: 'A', bout: 0 }, { x: 90, y: 68, lettre: 'A', bout: 1 }],
        lettres: ['A'], solution: []
    };
    // Un huit : le premier segment monte, le troisième descend, ils se coupent.
    const huit = [P(10, 10), P(70, 60), P(70, 10), P(10, 60), P(90, 68)];
    const v = verifierTrait(fig, 'A', huit);
    assert.equal(v.ok, false);
    assert.match(v.raison, /croise lui-même/);
    // Le même parcours sans le retour en arrière passe.
    assert.equal(verifierTrait(fig, 'A', [P(10, 10), P(70, 60), P(90, 68)]).ok, true);
});

test('DEUX TRAITS QUI SE CROISENT SONT REFUSÉS, ET LE MESSAGE LE DIT', () => {
    // On fabrique deux traits qui se coupent franchement, dans un cadre nu.
    const fig = {
        cadre: { ...CADRE }, cote: 6,
        bornes: [
            { x: 10, y: 10, lettre: 'A', bout: 0 }, { x: 90, y: 68, lettre: 'A', bout: 1 },
            { x: 90, y: 10, lettre: 'B', bout: 0 }, { x: 10, y: 68, lettre: 'B', bout: 1 }
        ],
        lettres: ['A', 'B'], solution: []
    };
    const traitA = { lettre: 'A', points: [P(10, 10), P(90, 68)] };
    const traitB = [P(90, 10), P(10, 68)];
    const v = verifierTrait(fig, 'B', traitB, [traitA]);
    assert.equal(v.ok, false);
    assert.match(v.raison, /croise le trait A/);
    // Le même trait B seul, sans A posé, passe : c'est bien le croisement qui
    // le refusait, et rien d'autre.
    assert.equal(verifierTrait(fig, 'B', traitB, []).ok, true);
});

test('la figure n\'est finie que si TOUTES les lettres sont reliées', () => {
    const fig = genererFigure({ rng: makeRng('fini'), palier: 'moyen' });
    assert.equal(verifierFigure(fig, []).fini, false);
    const partiel = fig.solution.slice(0, 1);
    const bilan = verifierFigure(fig, partiel);
    assert.equal(bilan.fini, false);
    assert.ok(fig.lettres.includes(bilan.manque));
    assert.equal(verifierFigure(fig, fig.solution).fini, true);
});

test('le conseil rappelle la règle sans montrer le tracé', () => {
    const fig = genererFigure({ rng: makeRng('conseil'), palier: 'moyen' });
    const debut = conseil(fig, []);
    assert.match(debut, /commence/i);
    const milieu = conseil(fig, fig.solution.slice(0, 1));
    assert.match(milieu, /reste/);
    // Aucune coordonnée ne doit fuiter : un conseil qui donne le tracé n'en
    // est pas un.
    assert.equal(/\d+[,.]\d/.test(milieu), false, milieu);
});

test('la même graine redonne exactement la même figure', () => {
    const a = genererFigure({ rng: makeRng('pareil'), palier: 'moyen' });
    const b = genererFigure({ rng: makeRng('pareil'), palier: 'moyen' });
    assert.deepEqual(a.bornes, b.bornes);
    assert.deepEqual(a.solution, b.solution);
});

test('la consigne énonce les TROIS interdits', () => {
    // C'est la seule notice que l'élève lira, et le troisième interdit est
    // celui qu'on oublie.
    assert.match(CONSIGNE, /crois/i);
    assert.match(CONSIGNE, /cadre/i);
    assert.match(CONSIGNE, /carré/i);
    assert.deepEqual(LETTRES.slice(0, 3), ['A', 'B', 'C']);
});

// --- La feuille ---------------------------------------------------------------

test('LE GÉNÉRATEUR DE FICHE POSE DES FIGURES RÉSOLUBLES', () => {
    const gen = getGenerator('logique.sans-croiser');
    assert.ok(gen, 'le générateur doit être enregistré');
    for (const palier of Object.keys(PALIERS)) {
        for (let s = 1; s <= 5; s++) {
            const item = gen.generate({ palier }, { rng: makeRng(`fiche-${palier}-${s}`) });
            const m = item.meta;
            // La figure voyage ENTIÈRE dans meta : la feuille ne recalcule
            // rien, donc elle ne peut pas diverger de l'écran.
            const fig = { cadre: m.cadre, cote: m.cote, bornes: m.bornes, lettres: m.lettres, solution: m.solution };
            assert.equal(verifierFigure(fig, m.solution).fini, true, `${palier} ${s}`);
            assert.equal(m.bornes.length, m.lettres.length * 2);
            assert.ok(item.difficulty >= 1 && item.difficulty <= 4);
        }
    }
});

test('la fiche sait dessiner ces figures', () => {
    const rendu = RENDUS['sans-croiser'];
    assert.ok(rendu, 'le rendu papier doit être déclaré');
    const item = getGenerator('logique.sans-croiser').generate({ palier: 'moyen' }, { rng: makeRng('dessin') });
    const slot = { x: 10, y: 10, w: 70, h: 55 };
    const vide = rendu.previewGrille(item, slot, 3, false);
    const corrige = rendu.previewGrille(item, slot, 3, true);
    // Le cadre plus un carré par borne ; aucun tracé tant qu'on ne corrige pas.
    assert.equal((vide.match(/<rect/g) || []).length, 1 + item.meta.bornes.length);
    assert.equal((vide.match(/<path/g) || []).length, 0, 'la fiche ne montre pas la solution');
    assert.equal((corrige.match(/<path/g) || []).length, item.meta.lettres.length);
    item.meta.lettres.forEach(l => assert.ok(vide.includes(`>${l}<`), `lettre absente : ${l}`));
    // « UNE » solution, pas « LA » : ces figures en ont plusieurs.
    assert.match(rendu.nomSolutions, /^Une solution possible$/,
        'le titre doit rester court : l\'en-tête de la feuille le tronque');
});

test('l\'exercice du catalogue tient debout', () => {
    const exo = getExerciseById('geo-sans-croiser');
    assert.ok(exo, 'l\'exercice doit être au catalogue');
    assert.equal(exo.activityId, 'sans-croiser');
    assert.ok(getGenerator(exo.printGeneratorId), 'son générateur de fiche doit exister');
    assert.ok(RENDUS[exo.printable], 'son rendu papier doit exister');
    const schema = exo.paramSchema.find(p => p.id === 'palier');
    schema.options.forEach(o => {
        assert.ok(PALIERS[o.value], `palier inconnu : ${o.value}`);
        assert.equal(o.label, PALIERS[o.value].label, `le libellé du palier ${o.value} a divergé du noyau`);
    });
});
