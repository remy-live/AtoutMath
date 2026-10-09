// L'ENQUÊTE — ce qu'on ne peut pas se permettre de rater.
//
// Rémy : « Connais tu aussi le jeu murdoku », puis « ne l'appelle pas comme
// cela ». Le mécanisme est repris, le nom et les grilles ne le sont pas.
//
// UNE GRILLE À DEUX SOLUTIONS EST PIRE QU'INUTILE. L'élève trouve une réponse
// juste, le logiciel la refuse, et il apprend que son raisonnement ne vaut
// rien — exactement le contraire de ce qu'on veut lui enseigner. C'est donc la
// première chose qu'on vérifie, et on la vérifie par ÉNUMÉRATION COMPLÈTE, pas
// par sondage : tous les placements possibles, sur toutes les scènes, sur des
// dizaines de tirages.
//
// LA SECONDE CHOSE EST LE FRANÇAIS. « au ouest de Ismaël », « plus près de le
// tableau » : des fautes qu'aucun test de logique ne verrait, et que l'élève
// lirait. Un logiciel d'école n'a pas le droit d'en écrire.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    SCENES, genererEnquete, compterSolutions, permutations, tousLesPlacements,
    phrasesDesIndices, laQuestion, verifierSaisie, prochaineDeduction,
    lieuDe, distance, sontVoisins, estAuBord, estDansLaDirection,
    deL, dePrenom, NORD, SUD, EST, OUEST
} from '../js/core/enquete.js';

const GRAINES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

/** Toutes les énigmes de toutes les scènes, fabriquées une fois. */
const TOUTES = [];
for (const scene of SCENES) {
    for (const seed of GRAINES) {
        TOUTES.push({ scene, seed, e: genererEnquete({ scene, seed }) });
    }
}

// ───────────────────────────────────────────────── LA GARANTIE CENTRALE ─────

test('CHAQUE ÉNIGME N\'A QU\'UNE SEULE SOLUTION', () => {
    // Vérifié par énumération complète : 36 placements à trois personnages,
    // 576 à quatre, 14 400 à cinq. Aucun sondage, aucune confiance.
    for (const { scene, seed, e } of TOUTES) {
        const combien = compterSolutions(scene, e.indices, scene.taille, 5);
        assert.equal(combien, 1,
            `${scene.id}/${seed} : ${combien} solutions au lieu d'une`);
    }
});

test('la solution annoncée satisfait tous ses indices', () => {
    for (const { scene, seed, e } of TOUTES) {
        e.indices.forEach((ind, k) => {
            assert.ok(ind.teste(e.solution),
                `${scene.id}/${seed} : l'indice n° ${k + 1} est faux pour la solution`);
        });
    }
});

test('un personnage par rangée, un par colonne — sans exception', () => {
    for (const { scene, seed, e } of TOUTES) {
        const rangees = e.solution.map(c => c.r);
        const colonnes = e.solution.map(c => c.c);
        assert.equal(new Set(rangees).size, scene.taille, `${scene.id}/${seed} rangées`);
        assert.equal(new Set(colonnes).size, scene.taille, `${scene.id}/${seed} colonnes`);
    }
});

test('AUCUN INDICE N\'EST DE TROP', () => {
    // Un indice inutile n'est pas neutre : il allonge la lecture, dilue
    // l'attention, et fait croire à l'élève qu'il a raté quelque chose. Après
    // minimisation, retirer n'importe lequel doit rouvrir la grille.
    for (const { scene, seed, e } of TOUTES) {
        for (let k = 0; k < e.indices.length; k++) {
            const sans = e.indices.filter((_, j) => j !== k);
            assert.ok(compterSolutions(scene, sans, scene.taille, 2) >= 2,
                `${scene.id}/${seed} : l'indice n° ${k + 1} ne sert à rien`);
        }
    }
});

// ──────────────────────────────────────────────── LA QUESTION POSÉE ─────────

test('UN SEUL PERSONNAGE PARTAGE LE LIEU DE L\'OBJET', () => {
    // Sans cela, « qui était seul là-bas ? » aurait deux réponses justes — et
    // l'on retomberait dans le défaut qu'on vient précisément de fermer.
    for (const { scene, seed, e } of TOUTES) {
        const dedans = e.solution
            .map((cell, k) => (lieuDe(scene, cell) === e.lieuDeLObjet ? k : -1))
            .filter(k => k >= 0);
        assert.deepEqual(dedans, [e.coupable],
            `${scene.id}/${seed} : ${dedans.length} personne(s) dans le lieu de l'objet`);
    }
});

test('AUCUN INDICE NE VEND LA MÈCHE', () => {
    // « Léa est dans les vestiaires » alors que l'objet est dans les vestiaires :
    // un indice vrai, minimal, et qui clôt l'enquête en une ligne. Mesuré : il
    // est sorti dès la première grille tirée sur la scène à cinq.
    for (const { scene, seed, e } of TOUTES) {
        for (const ind of e.indices) {
            // NI DANS UN SENS NI DANS L'AUTRE. « X est dans le préau » donne le
            // coupable en une ligne ; « X n'est pas dans le préau », répété
            // pour tous sauf un, le donne aussi — par élimination, et sans
            // qu'on ait placé personne. Mesuré sur la scène à trois.
            const parleDuLieu = (ind.type === 'dansLieu' || ind.type === 'pasDansLieu')
                && ind.lieu === e.lieuDeLObjet;
            assert.ok(!parleDuLieu,
                `${scene.id}/${seed} : « ${ind.dit(e.noms)} » parle du lieu de l'objet`);
        }
    }
});

// ─────────────────────────────────────────────────────── LE FRANÇAIS ────────

test('« DE LE TABLEAU » ET « AU OUEST » NE SE DISENT PAS', () => {
    const fautes = [
        / de le /i, / de les /i, /\bau ouest\b/i, /\bau est\b/i,
        / de I[a-zé]/, / de A[a-zé]/, / de É/, /\bde de\b/i
    ];
    for (const { scene, seed, e } of TOUTES) {
        for (const phrase of phrasesDesIndices(e).concat([laQuestion(e)])) {
            for (const f of fautes) {
                assert.ok(!f.test(phrase),
                    `${scene.id}/${seed} : « ${phrase} » (motif ${f})`);
            }
            assert.ok(/[.?]$/.test(phrase.trim()), `« ${phrase} » ne finit pas par un point`);
        }
    }
});

test('les contractions, une par une', () => {
    assert.equal(deL('le tableau'), 'du tableau');
    assert.equal(deL('les vestiaires'), 'des vestiaires');
    assert.equal(deL('la photocopieuse'), 'de la photocopieuse');
    assert.equal(deL("l'horloge"), "de l'horloge");
    assert.equal(dePrenom('Malik'), 'de Malik');
    assert.equal(dePrenom('Ismaël'), "d'Ismaël");
    assert.equal(dePrenom('Anaïs'), "d'Anaïs");
    assert.equal(dePrenom('Élodie'), "d'Élodie");
});

// ──────────────────────────────────────────────────── LA GÉOMÉTRIE ──────────

test('le nord est en haut, l\'ouest à gauche', () => {
    const haut = { r: 0, c: 2 }, bas = { r: 3, c: 2 };
    const gauche = { r: 1, c: 0 }, droite = { r: 1, c: 3 };
    assert.ok(estDansLaDirection(haut, bas, NORD));
    assert.ok(estDansLaDirection(bas, haut, SUD));
    assert.ok(estDansLaDirection(gauche, droite, OUEST));
    assert.ok(estDansLaDirection(droite, gauche, EST));
    assert.ok(!estDansLaDirection(haut, bas, SUD));
});

test('on ne marche pas en diagonale', () => {
    // Deux cases à droite et une en bas font TROIS pas, pas un. C'est
    // exactement la confusion que l'exercice doit lever.
    assert.equal(distance({ r: 0, c: 0 }, { r: 1, c: 2 }), 3);
    assert.ok(!sontVoisins({ r: 0, c: 0 }, { r: 1, c: 1 }), 'la diagonale n\'est pas un côté');
    assert.ok(sontVoisins({ r: 0, c: 0 }, { r: 0, c: 1 }));
});

test('le bord est bien le bord', () => {
    assert.ok(estAuBord({ r: 0, c: 2 }, 4));
    assert.ok(estAuBord({ r: 3, c: 2 }, 4));
    assert.ok(!estAuBord({ r: 1, c: 1 }, 4));
});

test('l\'énumération compte ce qu\'elle doit compter', () => {
    assert.equal(permutations(3).length, 6);
    assert.equal(tousLesPlacements(3).length, 36);
    assert.equal(tousLesPlacements(4).length, 576);
    // Et chaque placement respecte bien la règle.
    for (const p of tousLesPlacements(4)) {
        assert.equal(new Set(p.map(c => c.r)).size, 4);
        assert.equal(new Set(p.map(c => c.c)).size, 4);
    }
});

// ────────────────────────────────────────────────────── LA CORRECTION ───────

test('la solution est reconnue juste, une faute est reconnue fausse', () => {
    const e = TOUTES[8].e;
    const bon = verifierSaisie(e, e.solution);
    assert.ok(bon.juste && bon.complet && !bon.fautes.length);

    const faux = e.solution.map(c => ({ ...c }));
    [faux[0], faux[1]] = [faux[1], faux[0]];
    const v = verifierSaisie(e, faux);
    assert.ok(!v.juste);
    assert.deepEqual(v.fautes.sort(), [0, 1]);
});

test('LES DEUX RÈGLES DE BASE SE DISENT AVANT TOUT LE RESTE', () => {
    // « Tu as mis deux personnes dans la même rangée » se voit sans rien
    // déduire, et c'est l'erreur qu'on fait en plaçant vite. On la nomme
    // toujours en premier, y compris quand le reste est faux aussi.
    const e = TOUTES[8].e;
    const saisie = e.noms.map(() => null);
    saisie[0] = { r: 0, c: 0 };
    saisie[1] = { r: 0, c: 1 };
    const v = verifierSaisie(e, saisie);
    assert.ok(v.reglesCassees.some(t => /rangée/.test(t)));
    assert.equal(prochaineDeduction(e, saisie).degre, 'regle');

    saisie[1] = { r: 1, c: 0 };
    assert.ok(verifierSaisie(e, saisie).reglesCassees.some(t => /colonne/.test(t)));
});

test('l\'aide ne donne jamais de case, et se tait quand tout est posé', () => {
    for (const { e } of TOUTES.slice(0, 9)) {
        const fini = prochaineDeduction(e, e.solution);
        assert.equal(fini.degre, 'fini');

        const vide = prochaineDeduction(e, e.noms.map(() => null));
        assert.ok(['force', 'restreint', 'continuer'].includes(vide.degre), vide.degre);
        // ON NE DIT NI RANGÉE NI COLONNE. L'aide nomme les indices à relire ;
        // si elle lâchait des coordonnées, elle donnerait la réponse.
        assert.ok(!/rangée \d|colonne \d|case \(/.test(vide.texte), vide.texte);
    }
});

test('L\'AIDE CHERCHE LE PAS LE PLUS COURT, PAS N\'IMPORTE LEQUEL', () => {
    // Avec TOUS les indices, chaque personnage est forcé — c'est la définition
    // d'une solution unique. Une aide qui répondrait « la place de Malik est
    // décidée » ne dirait donc rien de plus que « cette grille se résout » :
    // vrai, et parfaitement inutile. Elle doit nommer le PLUS PETIT paquet
    // d'indices qui suffise, et ce paquet doit réellement suffire.
    const { e } = TOUTES[9];
    const d = prochaineDeduction(e, e.noms.map(() => null));
    if (d.degre !== 'force') return;   // scène où rien ne se place en ≤ 4 indices
    assert.ok(d.indices.length >= 1 && d.indices.length <= 4);
    const paquet = d.indices.map(k => e.indices[k]);
    const possibles = tousLesPlacements(e.scene.taille)
        .filter(p => paquet.every(i => i.teste(p)));
    const cible = e.solution[d.personnage];
    assert.ok(possibles.every(p => p[d.personnage].r === cible.r
        && p[d.personnage].c === cible.c),
        'le paquet annoncé doit vraiment forcer la case de ce personnage');
});

test('une aide sur un placement impossible le dit, au lieu de s\'obstiner', () => {
    const e = TOUTES[8].e;
    const saisie = e.noms.map((_, k) => ({ r: k, c: k }));
    // Ce placement respecte les deux règles mais ne peut satisfaire les
    // indices : l'aide doit renvoyer à la case fautive, pas chercher un pas
    // suivant qui n'existe pas.
    const d = prochaineDeduction(e, saisie);
    assert.ok(['contredit', 'impossible', 'force', 'restreint', 'fini'].includes(d.degre),
        d.degre);
    assert.ok(d.texte.length > 20);
});

// ───────────────────────────────────────────────────── REPRODUCTIBLE ────────

test('même graine, même enquête — c\'est ce qui rend une fiche rejouable', () => {
    const a = genererEnquete({ scene: SCENES[1], seed: 'pareil' });
    const b = genererEnquete({ scene: SCENES[1], seed: 'pareil' });
    assert.deepEqual(a.solution, b.solution);
    assert.deepEqual(a.noms, b.noms);
    assert.deepEqual(phrasesDesIndices(a), phrasesDesIndices(b));
    assert.equal(a.coupable, b.coupable);
});

test('les scènes sont bien formées', () => {
    for (const sc of SCENES) {
        assert.equal(sc.plan.length, sc.taille, sc.id + ' : hauteur du plan');
        for (const ligne of sc.plan) {
            assert.equal(ligne.length, sc.taille, sc.id + ' : largeur du plan');
            for (const lettre of ligne) {
                assert.ok(sc.lieux[lettre], `${sc.id} : la lettre « ${lettre} » n'a pas de nom`);
            }
        }
        // Chaque lieu nommé doit exister sur le plan : un nom jamais employé
        // apparaîtrait dans un indice désignant un lieu introuvable.
        for (const lettre of Object.keys(sc.lieux)) {
            assert.ok(sc.plan.join('').includes(lettre),
                `${sc.id} : « ${sc.lieux[lettre]} » n'est nulle part sur le plan`);
        }
        for (const rep of sc.reperes) {
            assert.ok(rep.case[0] < sc.taille && rep.case[1] < sc.taille,
                `${sc.id} : le repère « ${rep.nom} » est hors du plan`);
        }
    }
});
