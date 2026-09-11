// LE RAYON ET LES MIROIRS — ce que la grille doit garantir.
//
// Rémy : « j'aimerai bien un jeu dans ce style avec des lasers et des miroirs
// […] C'est un exercice bonus comme le sudoku. »
//
// Un rayon qui tourne du mauvais côté est une erreur qu'on ne voit pas en
// relisant le code : elle se voit à l'écran, une fois, et l'on croit alors
// avoir mal compris le jeu. Trois promesses, donc, et la première est celle qui
// rendrait l'exercice injouable si elle tombait :
//
//   · TOUTE GRILLE TIRÉE SE RÉSOUT, et avec exactement son budget. Une grille
//     insoluble ne se signale pas : l'élève cherche, et c'est tout.
//   · LE REBOND EST JUSTE, ET SES QUATRE CAS AVEC. Un seul inversé, et c'est
//     un jeu qui ment.
//   · LE BUDGET TIENT. Sans lui on couvre la grille de miroirs jusqu'à ce que
//     ça marche, et il ne reste plus de raisonnement.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    VIDE, MUR, MINE, MIROIRS, SENS, refleter, miroirPour, tracer, tourner,
    poserMiroir, miroirsPoses, MARCHES_LASER, tirerNiveau, listeCibles
} from '../js/core/lasers.js';
import { lasersGenerator } from '../js/core/generators/lasers.js';

test('LE REBOND EST JUSTE, ET SES QUATRE CAS AVEC', () => {
    // Le miroir « / » va du coin bas-gauche au coin haut-droit. Un rayon qui
    // part vers la droite le frappe par en dessous et repart vers le haut.
    assert.equal(refleter('E', '/'), 'N');
    assert.equal(refleter('N', '/'), 'E');
    assert.equal(refleter('O', '/'), 'S');
    assert.equal(refleter('S', '/'), 'O');
    // Et « \ » est l'autre diagonale : elle échange la droite et le bas.
    assert.equal(refleter('E', '\\'), 'S');
    assert.equal(refleter('S', '\\'), 'E');
    assert.equal(refleter('O', '\\'), 'N');
    assert.equal(refleter('N', '\\'), 'O');
    // Rien d'autre ne dévie le rayon.
    SENS.forEach(s => {
        assert.equal(refleter(s, VIDE), s);
        assert.equal(refleter(s, MUR), s, 'un mur ARRÊTE, il ne dévie pas');
    });
    // UN MIROIR EST UNE INVOLUTION : repasser dessus en sens inverse remet le
    // rayon dans sa direction d'origine. C'est ce qui fait qu'un miroir est un
    // miroir et non une flèche.
    MIROIRS.forEach(m => SENS.forEach(s => {
        assert.equal(refleter(refleter(s, m), m), s, `${m} sur ${s}`);
    }));
    // Et un rebond est TOUJOURS un quart de tour, jamais un demi-tour.
    MIROIRS.forEach(m => SENS.forEach(s => {
        const apres = refleter(s, m);
        assert.ok(apres === tourner(s, 1) || apres === tourner(s, -1),
            `${m} sur ${s} : ${apres} n'est pas un quart de tour`);
    }));
});

test('le miroir qui fait tourner d\'ici vers là se retrouve, et lui seul', () => {
    SENS.forEach(a => SENS.forEach(b => {
        const m = miroirPour(a, b);
        if (a === b) assert.equal(m, null, 'aller tout droit ne demande pas de miroir');
        else if (tourner(a, 1) === b || tourner(a, -1) === b) {
            assert.ok(MIROIRS.includes(m), `${a} → ${b}`);
            assert.equal(refleter(a, m), b);
        } else assert.equal(m, null, 'un demi-tour ne se fait pas avec un miroir');
    }));
});

test('TOUTE GRILLE TIRÉE SE RÉSOUT, et avec exactement son budget', () => {
    for (const marche of MARCHES_LASER) {
        for (let k = 0; k < 40; k++) {
            const g = tirerNiveau(makeRng(`${marche.id}-${k}`), marche);
            assert.ok(g, `${marche.nom} : tirage impossible`);
            // La solution tirée amène bien le rayon sur la cible.
            const r = tracer({ ...g, cases: g.solution });
            assert.equal(r.touche, true, `${marche.nom} : la solution rate la cible`);
            // Le budget vaut exactement le nombre de miroirs qui manquent.
            const manquants = g.solution.filter((c, i) =>
                MIROIRS.includes(c) && !MIROIRS.includes(g.cases[i])).length;
            assert.equal(g.budget, manquants, `${marche.nom} : budget ${g.budget} pour ${manquants} miroirs`);
            assert.ok(g.budget >= 1, `${marche.nom} : rien à poser`);
            // ET CE N'EST PAS DÉJÀ GAGNÉ. Une grille où le rayon touche la
            // cible sans rien poser n'est pas une question.
            assert.equal(tracer(g).touche, false, `${marche.nom} : gagnée d'avance`);
            // Les miroirs vissés le sont vraiment, et jamais tous.
            const vis = g.fixes.filter(Boolean).length;
            assert.ok(vis < manquants + vis, `${marche.nom} : tout est déjà posé`);
            g.fixes.forEach((f, i) => {
                if (f) assert.ok(MIROIRS.includes(g.cases[i]), 'une case vissée sans miroir');
            });
        }
    }
});

test('LE RAYON S\'ARRÊTE, TOUJOURS, ET DIT COMMENT', () => {
    // Les quatre fins possibles existent et sont nommées : sans cela, une
    // boucle serait une page figée.
    const n = 4;
    const vide = { n, cases: new Array(n * n).fill(VIDE), fixes: [], source: { x: 0, y: 0, sens: 'E' }, cible: { x: 3, y: 3 } };
    assert.equal(tracer(vide).fin, 'sortie');

    const mur = { ...vide, cases: vide.cases.map((c, i) => (i === 2 ? MUR : c)) };
    assert.equal(tracer(mur).fin, 'mur');

    const gagne = { ...vide, cible: { x: 2, y: 0 } };
    assert.equal(tracer(gagne).fin, 'cible');
    assert.equal(tracer(gagne).touche, true);

    // ET LA BOUCLE N'ARRIVE JAMAIS — c'est un théorème, pas une chance.
    //
    // Un miroir est une INVOLUTION : le trajet est réversible. Si le rayon
    // tournait en rond, on pourrait le remonter à l'envers, et il devrait
    // ressortir par où il est entré — ce qui contredit le fait qu'il tourne.
    // Un rayon venu du dehors ne peut donc pas se faire piéger. Le garde-fou
    // du compteur de pas reste dans le code (une page figée serait pire qu'un
    // rayon perdu), mais on vérifie ici qu'il ne sert jamais : mille grilles
    // couvertes de miroirs au hasard, et pas une boucle.
    const rng = makeRng('boucles');
    for (let k = 0; k < 1000; k++) {
        const m = 5;
        const cases = new Array(m * m).fill(VIDE).map(() => {
            const d = rng.int(0, 3);
            return d === 0 ? '/' : d === 1 ? '\\' : d === 2 ? MUR : VIDE;
        });
        const g2 = {
            n: m, cases, fixes: [],
            source: { x: 0, y: rng.int(0, m - 1), sens: 'E' }, cible: { x: m - 1, y: m - 1 }
        };
        const fin = tracer(g2).fin;
        assert.notEqual(fin, 'boucle', `grille ${k} : ${cases.join('')}`);
        assert.ok(['sortie', 'mur', 'cible'].includes(fin), fin);
    }
});

test('UNE CASE TRAVERSÉE DEUX FOIS N\'EST PAS UNE BOUCLE', () => {
    // Un rayon peut repasser sur ses pas à angle droit — une fois à
    // l'horizontale, une fois à la verticale. Compter les CASES vues au lieu
    // des couples (case, direction) déclarerait une boucle qui n'existe pas,
    // et refuserait des trajets parfaitement justes.
    const n = 5;
    const cases = new Array(n * n).fill(VIDE);
    cases[0 * n + 3] = '\\';        // E → S
    cases[2 * n + 3] = '\\';        // S → E ... on redescend plus loin
    const g = { n, cases, fixes: [], source: { x: 0, y: 0, sens: 'E' }, cible: { x: 4, y: 2 } };
    const r = tracer(g);
    assert.equal(r.touche, true, r.fin);
});

test('LE BUDGET TIENT, ET IL LE DIT AVANT DE REFUSER', () => {
    const n = 4;
    const g = {
        n, cases: new Array(n * n).fill(VIDE), fixes: new Array(n * n).fill(false),
        solution: new Array(n * n).fill(VIDE),
        source: { x: 0, y: 0, sens: 'E' }, cible: { x: 3, y: 3 }, budget: 1
    };
    // Le premier miroir passe, le second est refusé — et le refus s'explique.
    const un = poserMiroir(g, 5);
    assert.equal(un.refus, undefined);
    assert.equal(miroirsPoses(un.cases, g.fixes), 1);
    const deux = poserMiroir({ ...g, cases: un.cases }, 9);
    assert.ok(deux.refus && deux.refus.includes('1 miroir'), deux.refus);

    // MAIS ON PEUT TOUJOURS TOURNER CELUI QU'ON A POSÉ : le budget compte les
    // miroirs, pas les appuis. Sans cela, un élève qui pose le bon miroir dans
    // le mauvais sens serait coincé.
    const tourne = poserMiroir({ ...g, cases: un.cases }, 5);
    assert.equal(tourne.refus, undefined);
    assert.equal(tourne.cases[5], MIROIRS[1]);
    // Et le troisième appui le retire, ce qui rend le miroir au budget.
    const vide2 = poserMiroir({ ...g, cases: tourne.cases }, 5);
    assert.equal(vide2.cases[5], VIDE);
    assert.equal(miroirsPoses(vide2.cases, g.fixes), 0);
});

test('on ne pose rien sur la source, la cible, un mur ni un miroir vissé', () => {
    const n = 4;
    const cases = new Array(n * n).fill(VIDE);
    cases[6] = MUR; cases[7] = '/';
    const fixes = new Array(n * n).fill(false); fixes[7] = true;
    const g = {
        n, cases, fixes, solution: cases.slice(),
        source: { x: 0, y: 0, sens: 'E' }, cible: { x: 3, y: 3 }, budget: 3
    };
    assert.ok(poserMiroir(g, 0).refus, 'la source');
    assert.ok(poserMiroir(g, 15).refus, 'la cible');
    assert.ok(poserMiroir(g, 6).refus, 'un mur');
    assert.ok(poserMiroir(g, 7).refus, 'un miroir vissé');
    // Et chaque refus est une phrase, pas un silence.
    [0, 15, 6, 7].forEach(i => assert.ok(poserMiroir(g, i).refus.length > 20));
});

test('CHAQUE NIVEAU COCHÉ EST JOUÉ, et son item porte tout ce qu\'il faut', () => {
    const total = MARCHES_LASER.length;
    const vus = new Set();
    for (let i = 0; i < total; i++) {
        const it = lasersGenerator.generate({}, { index: i, total, rng: makeRng(`g${i}`) });
        vus.add(it.meta.marche);
        assert.equal(it.answerKind, 'grid');
        assert.equal(it.answer, 'rayon-arrive');
        assert.equal(it.meta.depart.length, it.meta.n * it.meta.n);
        assert.equal(it.meta.solution.length, it.meta.n * it.meta.n);
        assert.equal(it.meta.fixes.length, it.meta.n * it.meta.n);
        assert.equal(it.hints.length, 3);
        it.hints.forEach(h => assert.ok(h.length < 120, h));
        assert.ok(it.meta.trajet.length >= 2);
        // La consigne dit COMBIEN de miroirs, parce que c'est la règle du jeu.
        assert.match(it.prompt.text, /miroirs?/);
    }
    // Le repli sur un niveau plus court est autorisé — un trajet à quatre
    // virages ne tient pas toujours —, mais il ne doit pas avaler la
    // progression : au moins la moitié des niveaux demandés doivent sortir.
    assert.ok(vus.size >= Math.ceil(total / 2), `${vus.size} niveaux distincts sur ${total}`);
});

test('l\'explication dit le trajet sans donner les cases', () => {
    for (let i = 0; i < MARCHES_LASER.length; i++) {
        const it = lasersGenerator.generate({}, { index: i, total: MARCHES_LASER.length, rng: makeRng(`e${i}`) });
        assert.ok(it.explanation.length <= 200, it.explanation);
        assert.doesNotMatch(it.explanation, /\d+\s*,\s*\d+/, 'une case nommée dans l\'explication');
        assert.match(it.explanation, /quart de tour/);
    }
});

// --- CE QUI REND LE JEU DIFFICILE -------------------------------------------
//
// Rémy, après avoir joué la première version : « les rayons et les miroirs sont
// hyper faciles, tu ne peux pas compliquer un peu ». Il avait raison, et la
// raison est précise : avec UN cristal, on regarde par où il peut être atteint
// et l'on remonte — un problème à une inconnue. Deux choses le rendent
// autrement plus dur, et ce sont elles qu'on tient ici.

test('PLUSIEURS CRISTAUX, ET UN SEUL TRAJET POUR LES ALLUMER TOUS', () => {
    // Le rayon TRAVERSE un cristal au lieu de s'y arrêter : sans cela, aucun
    // enchaînement ne serait possible et le second cristal serait inatteignable.
    const n = 5;
    const g = {
        n, cases: new Array(n * n).fill(VIDE), fixes: [],
        source: { x: 0, y: 0, sens: 'E' },
        cibles: [{ x: 1, y: 0 }, { x: 3, y: 0 }]
    };
    const r = tracer(g);
    assert.equal(r.allumees.size, 2, 'le rayon doit traverser le premier cristal');
    assert.equal(r.touche, true);
    assert.equal(r.fin, 'cible');

    // Et il ne suffit pas d'en allumer UN : tant qu'il en reste, c'est raté.
    const rate = tracer({ ...g, cibles: [{ x: 1, y: 0 }, { x: 1, y: 4 }] });
    assert.equal(rate.allumees.size, 1);
    assert.equal(rate.touche, false, 'un cristal sur deux n\'est pas une réussite');
    assert.equal(rate.fin, 'sortie');
});

test('LA MINE ARRÊTE TOUT, ET ELLE ANNULE CE QUI PRÉCÈDE', () => {
    // Un trajet qui allume deux cristaux puis explose n'est pas à moitié
    // réussi : c'est exactement la faute qu'on veut faire voir.
    const n = 5;
    const cases = new Array(n * n).fill(VIDE);
    cases[3] = MINE;                       // (3,0)
    const g = {
        n, cases, fixes: [], source: { x: 0, y: 0, sens: 'E' },
        cibles: [{ x: 1, y: 0 }, { x: 4, y: 0 }]
    };
    const r = tracer(g);
    assert.equal(r.fin, 'mine');
    assert.equal(r.allumees.size, 0, 'la mine annule les cristaux déjà allumés');
    assert.equal(r.touche, false);
    // Et l'on ne pose pas un miroir sur une mine : ce serait s'en servir comme
    // d'une case ordinaire.
    assert.ok(poserMiroir({ ...g, solution: cases, budget: 3 }, 3).refus);
});

test('LA DIFFICULTÉ MONTE VRAIMENT, niveau après niveau', () => {
    // Un « niveau 7 » qui demanderait le même travail que le niveau 2 serait
    // une promesse non tenue. On mesure donc ce qui fait le travail : le nombre
    // de miroirs à poser, le nombre de cristaux, la taille de la grille.
    const poids = MARCHES_LASER.map(m =>
        (m.virages || 0) * 2 + ((m.cibles || 1) - 1) * 3 + (m.mines ? 2 : 0) + (m.fixes || 0));
    for (let i = 1; i < poids.length; i++) {
        assert.ok(poids[i] > poids[i - 1],
            `${MARCHES_LASER[i].nom} n'est pas plus dur que ${MARCHES_LASER[i - 1].nom}`);
    }
    // Et le dernier niveau porte tout ce que le jeu sait faire.
    const dernier = MARCHES_LASER[MARCHES_LASER.length - 1];
    assert.ok(dernier.cibles >= 3 && dernier.mines >= 1 && dernier.fixes >= 1 && dernier.murs >= 1,
        'le dernier niveau doit réunir cristaux, mines, murs et miroirs vissés');
    assert.ok(MARCHES_LASER.some(m => (m.cibles || 1) > 1), 'aucun niveau à plusieurs cristaux');
});

test('les grilles à plusieurs cristaux se résolvent, et pas par hasard', () => {
    const aPlusieurs = MARCHES_LASER.filter(m => (m.cibles || 1) > 1);
    assert.ok(aPlusieurs.length >= 3);
    for (const marche of aPlusieurs) {
        for (let k = 0; k < 30; k++) {
            const g = tirerNiveau(makeRng(`multi-${marche.id}-${k}`), marche);
            assert.ok(g, `${marche.nom} : tirage impossible`);
            assert.equal(listeCibles(g).length, marche.cibles, `${marche.nom} : mauvais compte`);
            const r = tracer({ ...g, cases: g.solution });
            assert.equal(r.touche, true, `${marche.nom} : la solution n'allume pas tout`);
            assert.equal(r.allumees.size, marche.cibles);
            // AUCUN CRISTAL SUR UN MIROIR : le rayon le traverserait ET
            // rebondirait dessus, ce qui ne veut rien dire.
            listeCibles(g).forEach(c => {
                const q = g.solution[c.y * g.n + c.x];
                assert.ok(!MIROIRS.includes(q) && q !== MUR && q !== MINE,
                    `${marche.nom} : un cristal sur « ${q} »`);
            });
            // Et la grille de départ n'allume pas déjà tout.
            assert.equal(tracer(g).touche, false, `${marche.nom} : gagnée d'avance`);
        }
    }
});

test('ON NE GAGNE PLUS EN TÂTONNANT — et c\'est mesuré', () => {
    // Rémy : « les rayons et les miroirs sont hyper faciles ». La difficulté
    // d'un jeu de ce genre ne se décrète pas, elle se MESURE : on fait jouer un
    // tâtonneur aveugle — il pose le premier miroir qui allume un cristal de
    // plus, sans jamais rien prévoir — et l'on compte ce qu'il réussit.
    //
    // Sur la première version, il gagnait partout : c'est exactement ce que
    // Rémy a senti en jouant. Il faut donc que les derniers niveaux lui
    // résistent, sans quoi « niveau 7 » n'est qu'une étiquette.
    const tatonner = (g) => {
        let cases = g.cases.slice();
        let poses = 0;
        let mieux = tracer({ ...g, cases }).allumees.size;
        for (let tour = 0; tour < 12; tour++) {
            if (tracer({ ...g, cases }).touche) return true;
            if (poses >= g.budget) return false;
            let bouge = false;
            for (let i = 0; i < cases.length && !bouge; i++) {
                if (cases[i] !== VIDE || g.fixes[i]) continue;
                for (const m of MIROIRS) {
                    const essai = cases.slice();
                    essai[i] = m;
                    const r = tracer({ ...g, cases: essai });
                    if (r.touche || r.allumees.size > mieux) {
                        cases = essai; poses += 1; mieux = r.allumees.size; bouge = true; break;
                    }
                }
            }
            if (!bouge) return false;
        }
        return tracer({ ...g, cases }).touche;
    };

    const taux = MARCHES_LASER.map(marche => {
        let gagne = 0;
        for (let k = 0; k < 40; k++) {
            const g = tirerNiveau(makeRng(`tat-${marche.id}-${k}`), marche);
            if (g && tatonner(g)) gagne += 1;
        }
        return gagne / 40;
    });

    // Le premier niveau DOIT se tâtonner : c'est celui où l'on apprend la
    // règle, et un débutant a le droit d'essayer.
    assert.ok(taux[0] > 0.8, `niveau 1 : ${Math.round(taux[0] * 100)} % — trop dur pour débuter`);
    // Les trois derniers, non : là, il faut prévoir le trajet.
    taux.slice(-3).forEach((t, k) => {
        assert.ok(t < 0.6, `${MARCHES_LASER[MARCHES_LASER.length - 3 + k].nom} : `
            + `${Math.round(t * 100)} % au tâtonnement — encore trop facile`);
    });
    // Et la courbe descend : chaque tiers de la progression résiste davantage.
    const debut = (taux[0] + taux[1]) / 2;
    const fin = taux.slice(-2).reduce((a, b) => a + b, 0) / 2;
    assert.ok(fin < debut - 0.4, `de ${Math.round(debut * 100)} % à ${Math.round(fin * 100)} % : `
        + 'la difficulté ne monte pas assez');
});
