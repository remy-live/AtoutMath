// LES DEUX JEUX DU 27 OCTOBRE — les allumettes à déplacer, et la traversée.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « fais allumettes, la traversée ».
//
// CE QUE CETTE ÉPREUVE GARDE, et pourquoi chacune des deux promesses est
// l'inverse de l'autre :
//
//   · LES ALLUMETTES DOIVENT AVOIR UNE SEULE RÉPARATION. Deux, et l'élève qui
//     trouve l'autre est compté faux sans qu'on puisse le lui expliquer —
//     c'est le défaut du kakuro à deux solutions, corrigé la veille.
//   · LA TRAVERSÉE NE DOIT PAS ÊTRE UNIQUE. Plusieurs chemins mènent à
//     l'autre rive, et les compter faux serait absurde. Ce qui se garde ici,
//     c'est l'EXISTENCE : un scénario insoluble est un piège, et rien dans
//     l'énoncé ne permettrait à l'élève de s'en douter.
//
// ── ON NE DEMANDE RIEN AU TÉMOIN ────────────────────────────────────────────
//
// Les deux vérifications sont refaites À LA MAIN ici, avec leur propre lecture
// des sept segments et leur propre rejeu des traversées. C'est la leçon du
// 26 octobre, payée sur les gratte-ciel : une épreuve qui vérifie une valeur
// avec la fonction qui l'a produite ne mesure rien du tout — les deux côtés de
// l'égalité bougent ensemble, et le vert ne veut plus rien dire.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { exercices } from '../js/data/catalog.js';
import { getGenerator } from '../js/core/registry.js';
import { makeRng } from '../js/core/ids.js';
import { evaluate } from '../js/core/items.js';
import { SCENARIOS } from '../js/core/generators/traversee.js';

const LES_DEUX = ['logi-allumettes-egalite', 'logi-traversee'];

/** Quelques items d'un exercice, avec ses réglages du catalogue. */
function tirer(id, combien = 6, params = null) {
    const exo = exercices.find(e => e.id === id);
    assert.ok(exo, `${id} a disparu du catalogue`);
    const gen = getGenerator(exo.generatorId);
    assert.ok(gen, `${id} : générateur non enregistré`);
    return Array.from({ length: combien }, (_, i) =>
        gen.generate(params || { ...(exo.params || {}) }, { rng: makeRng(id + i), index: i }));
}

/** Toutes les combinaisons de réglages d'un exercice. */
function reglagesDe(id) {
    const exo = exercices.find(e => e.id === id);
    const gen = getGenerator(exo.generatorId);
    let out = [{}];
    for (const p of gen.params || []) {
        if (p.type !== 'select' || !p.options) continue;
        const suivant = [];
        for (const base of out) for (const o of p.options) suivant.push({ ...base, [p.id]: o.value });
        out = suivant;
    }
    return out.map(c => ({ ...(exo.params || {}), ...c }));
}

// ── LA LECTURE DES SEPT SEGMENTS, REFAITE ICI ───────────────────────────────
//
// Écrite à la main depuis le dessin d'un réveil, et NON importée du
// générateur : c'est tout l'intérêt. Si la table du générateur se trompait
// d'un bit, la sienne et la mienne ne diraient pas la même chose.
//
//   segment 0 haut · 1 haut-droite · 2 bas-droite · 3 bas
//           4 bas-gauche · 5 haut-gauche · 6 milieu
const DESSINS = {
    0: [0, 1, 2, 3, 4, 5], 1: [1, 2], 2: [0, 1, 3, 4, 6], 3: [0, 1, 2, 3, 6],
    4: [1, 2, 5, 6], 5: [0, 2, 3, 5, 6], 6: [0, 2, 3, 4, 5, 6], 7: [0, 1, 2],
    8: [0, 1, 2, 3, 4, 5, 6], 9: [0, 1, 2, 3, 5, 6]
};
const MASQUES = Object.fromEntries(Object.entries(DESSINS)
    .map(([d, segs]) => [segs.reduce((m, s) => m | (1 << s), 0), Number(d)]));

/** Relit un plateau à la main : les trois nombres, le signe, et si c'est vrai. */
function lireAMain(cellules, nombres, op) {
    const signe = cellules[op].m;
    if (signe !== 0b01 && signe !== 0b11) return null;
    const valeurs = [];
    for (const n of nombres) {
        let texte = '';
        for (let k = 0; k < n.long; k++) {
            const d = MASQUES[cellules[n.debut + k].m];
            if (d === undefined) return null;
            texte += String(d);
        }
        if (n.long > 1 && texte[0] === '0') return null;
        valeurs.push(Number(texte));
    }
    const [a, b, c] = valeurs;
    return { a, b, c, plus: signe === 0b11, vraie: (signe === 0b11 ? a + b : a - b) === c };
}

/** Tous les plateaux obtenus en déplaçant UNE allumette. Refait à la main. */
function tousLesDeplacements(cellules) {
    const out = [];
    const taille = (c) => (c.t === 'o' ? 2 : 7);
    for (let i = 0; i < cellules.length; i++) {
        if (cellules[i].t === '=') continue;
        for (let s = 0; s < taille(cellules[i]); s++) {
            if (!(cellules[i].m & (1 << s))) continue;
            for (let j = 0; j < cellules.length; j++) {
                if (cellules[j].t === '=') continue;
                for (let d = 0; d < taille(cellules[j]); d++) {
                    if (i === j && s === d) continue;
                    const apres = cellules.map(c => ({ ...c }));
                    apres[i].m &= ~(1 << s);
                    if (apres[j].m & (1 << d)) continue;
                    apres[j].m |= (1 << d);
                    out.push(apres);
                }
            }
        }
    }
    return out;
}

test('LES DEUX SONT AU CATALOGUE, AVEC LEUR ÉCRAN ET LEUR PAPIER', () => {
    for (const id of LES_DEUX) {
        const exo = exercices.find(e => e.id === id);
        assert.ok(exo, `${id} a disparu du catalogue`);
        assert.ok(getGenerator(exo.generatorId), `${id} : générateur non enregistré`);
        assert.ok(exo.printable, `${id} ne s'imprime pas`);
        assert.ok(exo.instruction && exo.instruction.length > 80,
            `${id} : pas d'explication de la règle dans la fiche`);
    }
});

test('L\'ÉNIGME DES ALLUMETTES EST FAUSSE, ET SA RÉPARATION EST VRAIE', () => {
    for (const reglages of reglagesDe('logi-allumettes-egalite')) {
        for (const it of tirer('logi-allumettes-egalite', 4, reglages)) {
            const { cellules, nombres, op, solution } = it.meta;
            const avant = lireAMain(cellules, nombres, op);
            assert.ok(avant, `${JSON.stringify(reglages)} : l'énigme ne se lit pas`);
            assert.equal(avant.vraie, false,
                `l'énigme ${avant.a} ? ${avant.b} = ${avant.c} est déjà vraie — rien à faire`);
            const apres = lireAMain(solution, nombres, op);
            assert.ok(apres, 'la solution ne se lit pas comme des chiffres');
            assert.equal(apres.vraie, true,
                `la solution ${apres.a} ? ${apres.b} = ${apres.c} n'est pas vraie`);
            // ET LE NOMBRE D'ALLUMETTES NE CHANGE PAS : on en DÉPLACE une, on
            // n'en ajoute ni n'en retire. C'est toute la règle du jeu.
            const compter = (cs) => cs.reduce((n, c) =>
                n + (c.t === '=' ? 0 : [...Array(7).keys()].filter(s => c.m & (1 << s)).length), 0);
            assert.equal(compter(solution), compter(cellules),
                'la solution n\'a pas le même nombre d\'allumettes que l\'énigme');
        }
    }
});

test('ET IL N\'Y A QU\'UNE SEULE RÉPARATION POSSIBLE', () => {
    // LE DÉFAUT QUE CETTE GARDE TIENT : deux réparations, et l'élève qui
    // trouve l'autre est compté faux. `evaluate` compare à UNE réponse
    // attendue, il n'existe aucun crochet pour en accepter plusieurs.
    for (const reglages of reglagesDe('logi-allumettes-egalite')) {
        for (const it of tirer('logi-allumettes-egalite', 4, reglages)) {
            const { cellules, nombres, op } = it.meta;
            const bonnes = tousLesDeplacements(cellules)
                .filter(apres => {
                    const lu = lireAMain(apres, nombres, op);
                    return lu && lu.vraie;
                });
            // Plusieurs déplacements peuvent donner le MÊME dessin final ;
            // ce qui compte, c'est le nombre de dessins distincts.
            const distincts = new Set(bonnes.map(cs => cs.map(c =>
                (c.t === '=' ? 'e' : c.m)).join('.')));
            assert.equal(distincts.size, 1,
                `${JSON.stringify(reglages)} : ${distincts.size} réparations possibles`);
        }
    }
});

test('« DES ADDITIONS SEULEMENT » NE MONTRE JAMAIS DE SOUSTRACTION', () => {
    // UN RÉGLAGE QUI MENT EST PIRE QU'UN RÉGLAGE ABSENT. Mesuré : en partant
    // d'une addition, le geste qui la cassait pouvait emporter la barre
    // verticale du +, et « 5 − 5 = 18 » arrivait sous une promesse
    // d'additions.
    for (const format of ['court', 'moyen', 'long']) {
        for (const it of tirer('logi-allumettes-egalite', 6, { format, signe: 'plus' })) {
            const avant = lireAMain(it.meta.cellules, it.meta.nombres, it.meta.op);
            const apres = lireAMain(it.meta.solution, it.meta.nombres, it.meta.op);
            assert.ok(avant.plus, `${format} : l'énigme montre une soustraction`);
            assert.ok(apres.plus, `${format} : la réparation est une soustraction`);
        }
    }
});

test('LA RÉPONSE ATTENDUE EST CELLE QUE L\'ÉCRAN ENVERRA', () => {
    // LE DÉFAUT QUI COMPTERAIT FAUX UN ÉLÈVE QUI A RAISON, et qui ne se voit
    // nulle part ailleurs : l'activité écrit le plateau d'une façon, le
    // générateur l'attend d'une autre.
    for (const it of tirer('logi-allumettes-egalite', 6)) {
        const envoye = 'a' + it.meta.solution
            .map(c => (c.t === '=' ? 'e' : String(c.m))).join('.');
        assert.equal(it.answer, envoye, 'l\'écran et le générateur n\'écrivent pas pareil');
        assert.ok(evaluate(it, envoye).correct, 'la bonne réponse est comptée fausse');
        assert.ok(!evaluate(it, envoye + '.9').correct, 'n\'importe quoi est compté juste');
    }
    for (const it of tirer('logi-traversee', 4)) {
        assert.equal(it.answer, 'traverse');
        assert.ok(evaluate(it, 'traverse').correct, 'la réussite est comptée fausse');
    }
});

test('CHAQUE TRAVERSÉE A UNE SOLUTION, ET ELLE RESPECTE LES RÈGLES', () => {
    // CE QUI SE GARDE ICI EST L'EXISTENCE, pas l'unicité. Un scénario
    // insoluble est un piège : rien dans l'énoncé ne permettrait à l'élève de
    // s'en douter, et il chercherait jusqu'à se décourager.
    //
    // ON REJOUE LE CHEMIN À LA MAIN, coup par coup, contre les règles telles
    // qu'elles sont écrites dans le scénario — sans rien demander au solveur
    // qui l'a trouvé.
    for (const reglages of reglagesDe('logi-traversee')) {
        for (const it of tirer('logi-traversee', 4, reglages)) {
            const { passagers, places, passeur, lourds, interdits, chemin, minimum } = it.meta;
            assert.ok(minimum > 0, `${it.meta.titre} : aucune solution trouvée`);
            assert.equal(chemin.length, minimum, 'le chemin ne fait pas le compte annoncé');

            let gauche = new Set(passagers.map((_, i) => i));
            let barqueAGauche = true;
            chemin.forEach((pris, tour) => {
                const ou = `${it.meta.titre}, traversée ${tour + 1}`;
                assert.ok(pris.length >= 1 && pris.length <= places,
                    `${ou} : ${pris.length} passagers pour ${places} places`);
                // Tout le monde doit être du côté de la barque pour embarquer.
                for (const k of pris) {
                    assert.equal(gauche.has(k), barqueAGauche,
                        `${ou} : ${passagers[k].nom} n'est pas du bon côté`);
                }
                if (passeur >= 0) {
                    assert.ok(pris.includes(passeur), `${ou} : le passeur n'est pas à bord`);
                }
                const gros = pris.filter(k => lourds.includes(passagers[k].id)).length;
                assert.ok(gros === 0 || (gros === 1 && pris.length === 1),
                    `${ou} : la barque porte un adulte avec quelqu'un`);

                for (const k of pris) {
                    if (barqueAGauche) gauche.delete(k); else gauche.add(k);
                }
                barqueAGauche = !barqueAGauche;

                // ET PERSONNE NE SE MANGE : sur la rive sans surveillance,
                // aucune des paires interdites ne doit se trouver réunie.
                const rives = [[...gauche], passagers.map((_, i) => i).filter(i => !gauche.has(i))];
                rives.forEach(rive => {
                    const garde = passeur >= 0
                        ? rive.includes(passeur)
                        : rive.some(k => lourds.includes(passagers[k].id));
                    if (garde) return;
                    const ids = rive.map(k => passagers[k].id);
                    for (const [a, b] of interdits) {
                        assert.ok(!(ids.includes(a) && ids.includes(b)),
                            `${ou} : ${a} et ${b} restent seuls`);
                    }
                });
            });
            assert.equal(gauche.size, 0, `${it.meta.titre} : il reste quelqu'un sur la rive`);
        }
    }
});

test('ET AUCUN SCÉNARIO DU FICHIER N\'EST INSOLUBLE', () => {
    // MÊME CEUX QU'AUCUN RÉGLAGE NE SERT AUJOURD'HUI : un scénario ajouté
    // demain hériterait du doute, et c'est maintenant qu'on le lève.
    for (const [cle, sc] of Object.entries(SCENARIOS)) {
        assert.ok(sc.passagers.length >= 3, `${cle} : pas assez de passagers`);
        assert.ok(sc.places >= 2, `${cle} : une barque d'une place ne traverse pas`);
        assert.ok(sc.pourquoi && sc.pourquoi.length > 10, `${cle} : la règle n'est pas dite`);
        assert.ok(['classique', 'famille'].includes(sc.famille),
            `${cle} : famille « ${sc.famille} » inconnue des réglages`);
    }
});

test('ET LE RÉGLAGE LE PLUS FACILE EST BIEN CELUI PAR DÉFAUT', () => {
    // Sa phrase du 26, qu'il n'a pas eu à répéter : « avec des grilles
    // faciles ». Un élève qui ouvre un jeu neuf doit le RÉUSSIR la première
    // fois, sinon il ne l'ouvre pas une seconde.
    const ae = exercices.find(e => e.id === 'logi-allumettes-egalite');
    assert.equal(ae.params.format, 'court', 'les allumettes n\'ouvrent pas sur la plus courte');
    assert.equal(ae.params.signe, 'plus', 'les allumettes ouvrent sur les soustractions');
    const tv = exercices.find(e => e.id === 'logi-traversee');
    assert.equal(tv.params.scenario, 'classique', 'la traversée n\'ouvre pas sur la classique');
});

test('ET LES DEUX SE FABRIQUENT SANS SE FAIRE ATTENDRE', () => {
    // MÊME GARDE QUE POUR LES SIX JEUX DE LA VEILLE, et pour la même raison :
    // une graine sur quarante qui explose fait passer `npm test` de quatre
    // minutes à vingt-cinq. Douze graines par réglage, et c'est le TOTAL qu'on
    // mesure — une garde qui échantillonne deux graines est aveugle à la queue
    // de la distribution, c'est-à-dire au seul défaut qu'on ait vu ici.
    const BUDGETS = { 'logi-allumettes-egalite': 4000, 'logi-traversee': 3000 };
    for (const id of LES_DEUX) {
        const t = performance.now();
        for (const reglages of reglagesDe(id)) tirer(id, 12, reglages);
        const dt = Math.round(performance.now() - t);
        assert.ok(dt < BUDGETS[id], `${id} : ${dt} ms, au-delà des ${BUDGETS[id]} ms permises`);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// LA GÉOMÉTRIE DES ALLUMETTES — 27 octobre.
//
// RÉMY, capture à l'appui : « fais des vraies allumettre et les horizontals en
// haut et en bas sont un peu decales ».
//
// IL AVAIT RAISON, ET LA CAUSE ÉTAIT LE FORMAT DE LA CASE. Les bâtons étaient
// dessinés en pourcentages de leur zone de toucher — horizontaux de 12 % à
// 88 % de leur largeur, verticaux débordant de 34 % de leur hauteur — donc
// deux repères différents et des coins qui ne se ferment pas. Et la case était
// en 1 / 2,5, alors qu'un chiffre à sept allumettes DE MÊME LONGUEUR est
// exactement deux fois plus haut que large : aucun réglage de marge ne pouvait
// rattraper cela.
//
// CES GARDES TIENNENT LE DESSIN À SA PROMESSE : sept longueurs égales, une
// zone de toucher par bâton, et pas une qui empiète sur sa voisine.

import {
    L as ALLU_L, T as ALLU_T, LONG as ALLU_LONG, JEU as ALLU_JEU,
    EMPLACEMENTS, ZONES, VUE,
    baton, batonsDuSigne
} from '../js/core/allumettesDessin.js';

/** Le centre d'un bâton, en pourcentage de la vue. */
function centreDansLaVue(e) {
    const { corps } = baton(e);
    return {
        x: (corps.x + corps.w / 2 - VUE.x) / VUE.w * 100,
        y: (corps.y + corps.h / 2 - VUE.y) / VUE.h * 100
    };
}

test('les sept allumettes d\'un chiffre ont la même longueur et le même jeu aux coins', () => {
    const longueurs = EMPLACEMENTS.map(e => {
        const { corps } = baton(e);
        return Math.round(Math.max(corps.w, corps.h) * 1e6) / 1e6;
    });
    assert.equal(new Set(longueurs).size, 1,
        `sept allumettes, ${new Set(longueurs).size} longueurs : ${longueurs.join(', ')}`);
    assert.equal(longueurs[0], ALLU_LONG);
    // ET CHACUNE EST POSÉE À ÉGALE DISTANCE DES DEUX COINS QU'ELLE RELIE.
    //
    // Sans cette moitié-là, la garde ne gardait RIEN : la longueur vient de
    // `LONG`, donc elle est la même par construction et aucun défaut de
    // placement ne la ferait tomber. `epreuveTombe` l'a dit avant qu'on la
    // croie. Ce qui se vérifie vraiment, c'est la POSITION : un bâton décalé
    // d'un cheveu rouvre le coin, et c'est exactement ce que Rémy a vu.
    for (const e of EMPLACEMENTS) {
        if (e.sens === 'h') {
            assert.equal(e.x, ALLU_JEU, `le bâton ${e.i} ne part pas du bon jeu`);
            assert.equal(ALLU_L - (e.x + ALLU_LONG), ALLU_JEU,
                `le bâton ${e.i} ne finit pas au bon jeu`);
            assert.ok([0, ALLU_L, 2 * ALLU_L].includes(e.y),
                `le bâton ${e.i} n'est pas sur une des trois lignes`);
        } else {
            const demi = e.y < ALLU_L ? 0 : ALLU_L;
            assert.equal(e.y - demi, ALLU_JEU, `le bâton ${e.i} ne part pas du bon jeu`);
            assert.equal(demi + ALLU_L - (e.y + ALLU_LONG), ALLU_JEU,
                `le bâton ${e.i} ne finit pas au bon jeu`);
            assert.ok([0, ALLU_L].includes(e.x),
                `le bâton ${e.i} n'est pas sur un des deux montants`);
        }
    }
    // ET LA CASE EST DEUX FOIS PLUS HAUTE QUE LARGE : c'est la CONDITION pour
    // que les sept soient égales, et c'est elle qui manquait — la case était
    // en 1 / 2,5. La vue ajoute la demi-épaisseur dont les bâtons dépassent,
    // plus un pixel de jeu de chaque côté ; on les retire pour retrouver la
    // boîte des centres.
    const MARGE = 2;
    assert.equal(VUE.w - ALLU_T - MARGE, ALLU_L);
    assert.equal(VUE.h - ALLU_T - MARGE, 2 * ALLU_L);
});

test('le signe et le « = » emploient les mêmes allumettes', () => {
    for (const quoi of ['+', '=']) {
        for (const e of batonsDuSigne(quoi)) {
            const { corps } = baton(e);
            assert.equal(Math.round(Math.max(corps.w, corps.h) * 1e6) / 1e6, ALLU_LONG,
                `une allumette du « ${quoi} » n'a pas la longueur des autres`);
        }
    }
});

test('chaque zone de toucher contient son bâton, et lui seul', () => {
    for (const e of EMPLACEMENTS) {
        const c = centreDansLaVue(e);
        for (const autre of EMPLACEMENTS) {
            const z = ZONES[autre.i];
            const dedans = c.x >= z.gauche && c.x <= z.droite
                && c.y >= z.haut && c.y <= z.bas;
            if (autre.i === e.i) {
                assert.ok(dedans,
                    `le bâton ${e.i} tombe hors de sa zone (${c.x.toFixed(1)} ; `
                        + `${c.y.toFixed(1)})`);
            } else {
                // Une frontière partagée ne compte pas : on exige seulement
                // qu'un centre ne soit pas À L'INTÉRIEUR d'une zone étrangère.
                const dedansStrict = c.x > z.gauche && c.x < z.droite
                    && c.y > z.haut && c.y < z.bas;
                assert.ok(!dedansStrict,
                    `le bâton ${e.i} tombe dans la zone du ${autre.i}`);
            }
        }
    }
});

test('les zones pavent la case sans se recouvrir ni laisser de trou', () => {
    const toutes = EMPLACEMENTS.map(e => ZONES[e.i]);
    for (let i = 0; i < toutes.length; i++) {
        for (let j = i + 1; j < toutes.length; j++) {
            const a = toutes[i], b = toutes[j];
            const croise = a.gauche < b.droite && b.gauche < a.droite
                && a.haut < b.bas && b.haut < a.bas;
            assert.ok(!croise, `les zones ${i} et ${j} se recouvrent`);
        }
    }
    // Elles couvrent la case du haut au bas : un toucher au ras du bord doit
    // agir, pas tomber dans un couloir mort.
    const aire = toutes.reduce((t, z) =>
        t + (z.droite - z.gauche) * (z.bas - z.haut), 0);
    assert.ok(Math.abs(aire - 10000) < 1,
        `les zones couvrent ${(aire / 100).toFixed(1)} % de la case`);
});

test('aucune allumette ne déborde de la vue', () => {
    const tous = EMPLACEMENTS.concat(batonsDuSigne('+'), batonsDuSigne('='));
    for (const e of tous) {
        const { corps, tete } = baton(e);
        for (const r of [corps, tete]) {
            assert.ok(r.x >= VUE.x - 1e-9 && r.y >= VUE.y - 1e-9,
                `une allumette sort de la vue en haut à gauche`);
            assert.ok(r.x + r.w <= VUE.x + VUE.w + 1e-9
                && r.y + r.h <= VUE.y + VUE.h + 1e-9,
                `une allumette sort de la vue en bas à droite`);
        }
        // La tête est À UN BOUT du corps, jamais au milieu.
        const auBout = (tete.x === corps.x && tete.y === corps.y)
            || (tete.x + tete.w === corps.x + corps.w
                && tete.y + tete.h === corps.y + corps.h);
        assert.ok(auBout, 'une tête d\'allumette n\'est pas à un bout');
    }
});
