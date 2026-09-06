// L'ATELIER DU PRODUIT DE FRACTIONS — décomposer, barrer, calculer.
//
// Rémy, après avoir essayé le QCM : « je trouve que multiplier des fractions en
// barrant en diagonale n'est pas clair, il faut pouvoir décomposer les nombres,
// mais un QCM ce n'est pas terrible. »
//
// TROIS PROMESSES TIENNENT CET ATELIER, et ce sont elles qu'on vérifie ici.
//
// LA PREMIÈRE, et rien ne compte plus : LA VALEUR NE CHANGE JAMAIS. Décomposer
// 33 en 3 × 11 ne change pas le produit ; barrer un 11 en haut et un 11 en bas
// non plus, puisque c'est diviser le haut et le bas par le même nombre. Un
// atelier où un geste légal changerait la valeur enseignerait une fausseté, et
// l'élève n'aurait aucun moyen de s'en apercevoir.
//
// LA DEUXIÈME : LA MARCHE NE MENT PAS. « Barrer ce qui est déjà écrit » doit
// vraiment se finir en barrant, sans aucune décomposition — sinon le réglage
// est un mot sur un bouton.
//
// LA TROISIÈME : ON N'IMPOSE PAS LA DÉCOMPOSITION ATTENDUE. 45 = 5 × 9 et
// 45 = 3 × 15 sont tous deux justes ; refuser le second parce qu'il sort de la
// table de Pythagore compterait faux un élève qui a raison.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { pgcd } from '../js/core/fractionsEquivalentes.js';
import {
    etatInitial, decomposer, barrer, resultat, valeur, estFini, barragePossible,
    tousHaut, tousBas, decompositions, tirerProduitPose, etapesPose,
    MARCHES_POSE, PYTHAGORE_MAX
} from '../js/core/produitPose.js';
import { makeRng } from '../js/core/ids.js';

const REMY = { a: 33, b: 22, c: 45, d: 25 };

/**
 * UN ÉLÈVE QUI SAIT FAIRE, joué en machine.
 *
 * Il barre tant qu'il peut ; quand il ne peut plus mais que ça se simplifie
 * encore, il ouvre le nombre qu'il faut. C'est ce qui permet de compter les
 * décompositions qu'une question exige VRAIMENT.
 *
 * IL CHOISIT LA DIAGONALE LA MOINS CHÈRE, et ce n'est pas un raffinement. Le
 * premier jet prenait la première paire venue : devant « 10/8 × 5/70 » il
 * voyait 10 et 8 (2 en commun), ouvrait les deux, puis devait encore ouvrir
 * 70 — trois décompositions là où UNE suffit, puisque 10 divise 70. Il aurait
 * fait échouer une marche qui, elle, disait vrai. Un élève regarde d'abord si
 * un nombre est déjà un facteur de l'autre ; le solveur aussi.
 */
function resoudre(etat) {
    let e = etat, decoupes = 0;
    for (let tour = 0; tour < 40; tour++) {
        const coup = barragePossible(e);
        if (coup) { e = barrer(e, coup.haut.id, coup.bas.id).etat; continue; }
        if (estFini(e)) return { etat: e, decoupes, fini: true };

        // Toutes les diagonales qui donnent quelque chose, la moins chère
        // d'abord : ouvrir un seul nombre vaut mieux qu'en ouvrir deux.
        const paires = [];
        for (const h of tousHaut(e).filter(t => !t.barre)) {
            for (const b of tousBas(e).filter(t => !t.barre)) {
                const g = pgcd(h.v, b.v);
                if (g < 2) continue;
                paires.push({ h, b, g, cout: (h.v === g ? 0 : 1) + (b.v === g ? 0 : 1) });
            }
        }
        if (!paires.length) return { etat: e, decoupes, fini: estFini(e) };
        paires.sort((x, y) => x.cout - y.cout || y.g - x.g);
        const { h, b, g } = paires[0];
        if (h.v !== g) { e = decomposer(e, h.id, g, h.v / g).etat; decoupes++; }
        if (b.v !== g) { e = decomposer(e, b.id, g, b.v / g).etat; decoupes++; }
    }
    return { etat: e, decoupes, fini: estFini(e) };
}

/**
 * EXISTE-T-IL UN CHEMIN EN AU PLUS `budget` DÉCOMPOSITIONS ?
 *
 * C'est ce que la marche promet — pas « mon heuristique en trouve un ». La
 * nuance a compté : le solveur glouton ci-dessus prend la plus grosse diagonale
 * d'abord et met trois décompositions à finir « 10/3 × 15/90 », alors que deux
 * suffisent (90 = 10 × 9, puis 15 = 3 × 5). Il aurait fait échouer une marche
 * qui disait vrai.
 *
 * On explore donc toutes les diagonales, on mémorise ce qu'on a déjà vu, et
 * l'on s'arrête dès qu'un chemin tient dans le budget.
 */
function cheminEn(etat, budget, vus = new Set()) {
    let e = etat;
    let coup;
    while ((coup = barragePossible(e))) e = barrer(e, coup.haut.id, coup.bas.id).etat;
    if (estFini(e)) return true;
    if (budget <= 0) return false;
    const clef = budget + '|'
        + tousHaut(e).filter(t => !t.barre).map(t => t.v).sort((x, y) => x - y).join(',')
        + '/' + tousBas(e).filter(t => !t.barre).map(t => t.v).sort((x, y) => x - y).join(',');
    if (vus.has(clef)) return false;
    vus.add(clef);
    for (const h of tousHaut(e).filter(t => !t.barre)) {
        for (const b of tousBas(e).filter(t => !t.barre)) {
            const g = pgcd(h.v, b.v);
            if (g < 2) continue;
            const cout = (h.v === g ? 0 : 1) + (b.v === g ? 0 : 1);
            if (cout > budget) continue;
            let apres = e;
            if (h.v !== g) apres = decomposer(apres, h.id, g, h.v / g).etat;
            const bb = tousBas(apres).find(t => t.id === b.id);
            if (bb.v !== g) apres = decomposer(apres, bb.id, g, bb.v / g).etat;
            if (cheminEn(apres, budget - cout, vus)) return true;
        }
    }
    return false;
}

// --- L'invariant -----------------------------------------------------------------

test('LA VALEUR NE CHANGE JAMAIS — décomposer et barrer ne font que réécrire', () => {
    for (const marche of MARCHES_POSE.map(m => m.id)) {
        for (let i = 0; i < 120; i++) {
            const p = tirerProduitPose(makeRng(`v${marche}${i}`), { marche });
            const depart = etatInitial(p);
            const avant = valeur(depart);
            const { etat } = resoudre(depart);
            assert.deepEqual(valeur(etat), avant,
                `${p.a}/${p.b} × ${p.c}/${p.d} : la valeur a bougé`);
            // Et l'écriture courante vaut toujours la même chose que le départ.
            const r = resultat(etat);
            assert.equal(r.n * avant.d, r.d * avant.n,
                `${r.n}/${r.d} ne vaut plus ${avant.n}/${avant.d}`);
        }
    }
});

test('L\'EXEMPLE DE RÉMY se joue jusqu\'au bout : 33/22 × 45/25 = 27/10', () => {
    let e = etatInitial(REMY);
    assert.deepEqual(resultat(e), { n: 1485, d: 550 });

    // 33 = 3 × 11 et 22 = 2 × 11, puis on barre les onze.
    e = decomposer(e, tousHaut(e)[0].id, 3, 11).etat;
    e = decomposer(e, tousBas(e)[0].id, 2, 11).etat;
    const h11 = tousHaut(e).find(t => t.v === 11);
    const b11 = tousBas(e).find(t => t.v === 11);
    e = barrer(e, h11.id, b11.id).etat;
    assert.deepEqual(resultat(e), { n: 135, d: 50 });
    assert.equal(estFini(e), false, 'il reste les cinq à barrer');

    // 45 = 9 × 5 et 25 = 5 × 5, puis on barre un cinq.
    e = decomposer(e, tousHaut(e).find(t => t.v === 45).id, 9, 5).etat;
    e = decomposer(e, tousBas(e).find(t => t.v === 25).id, 5, 5).etat;
    const h5 = tousHaut(e).find(t => t.v === 5 && !t.barre);
    const b5 = tousBas(e).find(t => t.v === 5 && !t.barre);
    e = barrer(e, h5.id, b5.id).etat;

    assert.deepEqual(resultat(e), { n: 27, d: 10 });
    assert.equal(estFini(e), true);
    // BARRER N'EFFACE PAS : les quatre nombres barrés sont toujours écrits.
    // Quatre décompositions ont porté les quatre jetons de départ à huit, et
    // deux barrages en ont rayé quatre — rien n'a disparu de la page.
    assert.equal([...tousHaut(e), ...tousBas(e)].length, 8);
    assert.equal([...tousHaut(e), ...tousBas(e)].filter(t => t.barre).length, 4);
});

// --- Ce qui est permis, et ce qui ne l'est pas ------------------------------------

test('BARRER EXIGE L\'ÉGALITÉ STRICTE, pas un facteur commun', () => {
    // Barrer 6 avec 3 sous prétexte que 3 divise 6 escamote la moitié du geste :
    // il resterait un 2 en haut que personne n'a écrit. Pour barrer, il faut
    // d'abord décomposer — et c'est toute la leçon.
    const e = etatInitial({ a: 6, b: 5, c: 7, d: 3 });
    const h6 = tousHaut(e).find(t => t.v === 6);
    const b3 = tousBas(e).find(t => t.v === 3);
    const r = barrer(e, h6.id, b3.id);
    assert.equal(r.ok, false);
    assert.match(r.pourquoi, /décompose/);
    // Deux nombres étrangers : la raison n'est pas la même, et elle le dit.
    const b5 = tousBas(e).find(t => t.v === 5);
    assert.match(barrer(e, h6.id, b5.id).pourquoi, /rien en commun/);
    // Et l'état n'a pas bougé : un refus ne modifie rien.
    assert.deepEqual(resultat(e), { n: 42, d: 15 });
});

test('DÉCOMPOSER PAR 1 N\'EST PAS DÉCOMPOSER', () => {
    // « 33 = 1 × 33 » est vrai et ne fait rien avancer : on tournerait en rond
    // sans que rien ne l'arrête.
    const e = etatInitial(REMY);
    const id = tousHaut(e)[0].id;
    const r = decomposer(e, id, 1, 33);
    assert.equal(r.ok, false);
    assert.match(r.pourquoi, /1/);
    // Un produit faux est refusé en NOMMANT le produit obtenu : « 2 × 3 = 6, et
    // pas 33 » se relit, « faux » ne se relit pas.
    const f = decomposer(e, id, 2, 3);
    assert.equal(f.ok, false);
    assert.match(f.pourquoi, /2 × 3 = 6/);
});

test('ON N\'IMPOSE PAS LA DÉCOMPOSITION ATTENDUE', () => {
    // 45 = 5 × 9 est celle de la table ; 45 = 3 × 15 est juste aussi. Refuser
    // la seconde compterait faux un élève qui a raison — la table de Pythagore
    // est une aide, pas une règle.
    const e = etatInitial(REMY);
    const id = tousHaut(e).find(t => t.v === 45).id;
    assert.equal(decomposer(e, id, 5, 9).ok, true);
    assert.equal(decomposer(e, id, 9, 5).ok, true);
    assert.equal(decomposer(e, id, 3, 15).ok, true, '3 × 15 = 45 est juste');
    assert.equal(decomposer(e, id, 15, 3).ok, true);
    // La table, elle, ne montre que ce qui tient dedans.
    assert.deepEqual(decompositions(45), [[5, 9], [9, 5]]);
    assert.deepEqual(decompositions(33), [[3, 11], [11, 3]]);
    assert.deepEqual(decompositions(13), [], 'un nombre premier n’a pas de case');
    decompositions(99).forEach(([x, y]) => {
        assert.ok(x <= PYTHAGORE_MAX && y <= PYTHAGORE_MAX);
    });
});

test('UN NOMBRE BARRÉ NE SE TOUCHE PLUS', () => {
    let e = etatInitial({ a: 3, b: 5, c: 7, d: 3 });
    const h = tousHaut(e).find(t => t.v === 3);
    const b = tousBas(e).find(t => t.v === 3);
    e = barrer(e, h.id, b.id).etat;
    assert.equal(barrer(e, h.id, b.id).ok, false);
    assert.match(decomposer(e, h.id, 3, 1).pourquoi, /barré|1/);
    assert.equal(estFini(e), true);
    assert.deepEqual(resultat(e), { n: 7, d: 5 });
});

// --- Le tirage ---------------------------------------------------------------------

test('LA MARCHE NE MENT PAS sur le nombre de décompositions', () => {
    // LE DÉFAUT QUI A MOTIVÉ CE TEST. Construire les nombres à partir d'un
    // facteur partagé ne suffit pas : le tirage sortait « 3/6 × 8/3 » sur la
    // marche « barrer ce qui est déjà écrit ». On barre bien les deux 3 — et il
    // reste 8/6, qui se simplifie encore, par une décomposition que la marche
    // promettait de ne pas demander. Le hasard avait ajouté un facteur commun
    // par accident.
    for (const m of MARCHES_POSE) {
        for (let i = 0; i < 200; i++) {
            const p = tirerProduitPose(makeRng(`m${m.id}${i}`), { marche: m.id });
            const depart = etatInitial(p);
            assert.ok(resoudre(depart).fini,
                `${p.a}/${p.b} × ${p.c}/${p.d} (${m.id}) : ne se finit pas`);
            assert.ok(cheminEn(depart, m.decompositions),
                `${p.a}/${p.b} × ${p.c}/${p.d} (${m.id}) : aucun chemin en `
                + `${m.decompositions} décomposition${m.decompositions > 1 ? 's' : ''}`);
        }
    }
});

test('LES NOMBRES RESTENT À DEUX CHIFFRES, et la question reste une question', () => {
    for (const m of MARCHES_POSE) {
        for (let i = 0; i < 200; i++) {
            const p = tirerProduitPose(makeRng(`n${m.id}${i}`), { marche: m.id });
            [p.a, p.b, p.c, p.d].forEach(v => {
                assert.ok(v >= 2 && v <= 99, `${v} : au-delà, c’est une division`);
            });
            // UNE FRACTION QUI VAUT 1 N'EST PAS UNE QUESTION : le tirage
            // sortait « 4/4 × 9/32 ». L'élève barre, il a raison, il n'a rien
            // appris.
            assert.notEqual(p.a, p.b);
            assert.notEqual(p.c, p.d);
            // Le résultat reste une fraction : « = 3 » n'a plus de barre.
            assert.ok(p.reponse.d >= 2, `${p.reponse.n}/${p.reponse.d} n’est pas une fraction`);
            assert.equal(pgcd(p.reponse.n, p.reponse.d), 1, 'la réponse doit être irréductible');
            // Et le brut vaut bien la même chose que la réponse.
            assert.equal(p.brut.n * p.reponse.d, p.brut.d * p.reponse.n);
            assert.equal(p.brut.n, p.a * p.c);
            assert.equal(p.brut.d, p.b * p.d);
        }
    }
});

test('L\'INDICE DIT LA RÈGLE, jamais le résultat', () => {
    for (const m of MARCHES_POSE) {
        const p = tirerProduitPose(makeRng(`h${m.id}`), { marche: m.id });
        const e = etapesPose(p);
        assert.equal(e.length, 3);
        const tout = e.join(' ');
        assert.doesNotMatch(tout, new RegExp(`${p.reponse.n}\\s*/\\s*${p.reponse.d}`));
        assert.match(e[1], /barre/);
    }
});

// --- Le rangement --------------------------------------------------------------------

test('l\'atelier est au catalogue, avec son activité et son chapitre', async () => {
    await import('../js/core/activities/index.js');
    const { getExerciseById } = await import('../js/data/catalog.js');
    const { getGenerator } = await import('../js/core/registry.js');
    const { CODES_EXERCICES } = await import('../js/data/codesExercices.js');
    const { CHAPITRES } = await import('../js/data/chapitres.js');

    const e = getExerciseById('frac-produit-pose');
    assert.ok(e, 'frac-produit-pose manque au catalogue');
    assert.equal(e.activityId, 'produit-pose');
    assert.equal(CODES_EXERCICES['frac-produit-pose'], 'BF');
    assert.ok(e.instruction.length > 600, 'consigne trop courte pour un atelier');

    const g = getGenerator('frac.produit-pose');
    assert.ok(g, 'le générateur n’est pas inscrit');
    // L'ACTIVITÉ CONSTRUIT SON ÉTAT DE DÉPART DEPUIS LE META : les quatre
    // nombres voyagent avec l'item, pas dans une variable du jeu. C'est ce qui
    // rend la question rejouable à l'identique depuis sa graine.
    const it = g.generate(e.params, { rng: makeRng('cat'), index: 0, total: 12 });
    assert.ok(it.meta.produit, 'l’item doit porter les quatre nombres');
    ['a', 'b', 'c', 'd'].forEach(k => assert.ok(it.meta.produit[k] >= 2));
    const r = resultat(etatInitial(it.meta.produit));
    const [n, d] = it.answer.split('/').map(Number);
    assert.equal(r.n * d, r.d * n, 'la réponse annoncée ne vaut pas le produit');

    assert.ok(CHAPITRES.some(c => c.skills.includes('num.frac.multiplication')));
});
