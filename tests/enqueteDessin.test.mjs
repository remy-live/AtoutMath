// LES DESSINS DE L'ENQUÊTE — 28 octobre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture d'un jeu du commerce à l'appui : « Ce jeu ressemble à l'enquête
// mais l'enquête fait vraiment vieux […] il faudrait qqch de plus visuel ». Il
// a choisi la maquette B — tous les indices en cartes illustrées — et a demandé
// les outils Croix et Notes.
//
// CE QUE CETTE ÉPREUVE GARDE, et chaque ligne ferme un défaut qui ne se verrait
// QUE sur un écran, un jour, par hasard :
//
//   · TOUT CE QUE LE CATALOGUE NOMME A UN DESSIN. Une scène ajoutée demain avec
//     un lieu neuf rendrait un sol vide — et personne ne le saurait avant de
//     l'ouvrir. La liste des scènes et la liste des dessins doivent se
//     correspondre, et c'est une épreuve qui le dit, pas une relecture.
//   · DEUX PIÈCES MITOYENNES NE SE RESSEMBLENT JAMAIS. Deux carrelages jaunes
//     qui se touchent, c'est une seule pièce à l'œil — et l'élève compte alors
//     les cases d'une pièce qui n'existe pas.
//   · CHAQUE TYPE D'INDICE SAIT SE DESSINER. Onze types ; un seul sans symbole
//     donnerait une carte muette au milieu de dix cartes illustrées, et l'élève
//     croirait cet indice-là moins important.
//   · ET LA FLÈCHE D'UNE DIRECTION SE LIT DANS LE SENS DE LA CARTE. Inversée,
//     elle enseigne le contraire de ce que la phrase dit — c'est la seule faute
//     de ce fichier qui serait à la fois invisible et grave.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { SCENES, genererEnquete, NORD, SUD, EST, OUEST } from '../js/core/enquete.js';
import { makeRng } from '../js/core/ids.js';
import {
    SOLS, VISAGES, fondDuLieu, meubleSvg, morceauxDeLIndice, piecesMitoyennes,
    portraitSvg, symboleSvg, tousLesLieux, tousLesReperes, TYPES_DESSINES
} from '../js/core/enqueteDessin.js';

test('TOUT CE QUE LE CATALOGUE NOMME A UN DESSIN', () => {
    for (const lieu of tousLesLieux()) {
        assert.ok(SOLS[lieu], `le lieu « ${lieu} » n'a pas de sol`);
        const fond = fondDuLieu(lieu);
        assert.ok(fond.length > 30 && fond.includes('#'),
            `le sol de « ${lieu} » ne dessine rien : ${fond}`);
    }
    for (const rep of tousLesReperes()) {
        const svg = meubleSvg(rep, 40);
        assert.ok(svg.includes('<svg') && svg.length > 120,
            `le repère « ${rep} » n'a pas de meuble dessiné`);
    }
    // LES HUIT PRÉNOMS, et non ceux de la scène tirée : le générateur pioche
    // dans la liste entière, donc un prénom sans visage sortirait un jour.
    for (const nom of Object.keys(VISAGES)) {
        const svg = portraitSvg(nom, 48);
        assert.ok(svg.includes('<svg') && svg.includes('<circle'),
            `le prénom « ${nom} » n'a pas de visage`);
    }
});

test('ET AUCUN PRÉNOM DU GÉNÉRATEUR N\'EST OUBLIÉ', () => {
    // CE QUE CETTE GARDE EMPÊCHE : qu'on ajoute un neuvième prénom au noyau
    // sans lui dessiner de visage. Le portrait rendrait une chaîne vide, la
    // case resterait blanche, et le jeu paraîtrait cassé sans erreur de page.
    const vus = new Set();
    for (const scene of SCENES) {
        for (let i = 0; i < 40; i++) {
            const e = genererEnquete({ scene, rng: makeRng(`v${scene.id}${i}`) });
            e.noms.forEach(n => vus.add(n));
        }
    }
    for (const nom of vus) {
        assert.ok(VISAGES[nom], `le prénom « ${nom} » est servi sans visage`);
    }
    assert.ok(vus.size >= 5, `seulement ${vus.size} prénoms vus en 120 tirages`);
});

test('DEUX PIÈCES MITOYENNES NE SE RESSEMBLENT JAMAIS', () => {
    for (const scene of SCENES) {
        for (const [a, b] of piecesMitoyennes(scene)) {
            const na = scene.lieux[a], nb = scene.lieux[b];
            assert.notDeepEqual(SOLS[na], SOLS[nb],
                `${scene.id} : « ${na} » et « ${nb} » se touchent et portent le même sol`);
        }
    }
});

test('CHAQUE TYPE D\'INDICE SAIT SE DESSINER', () => {
    const scene = SCENES[2];
    const noms = ['Léa', 'Malik', 'Chloé'];
    const faux = {
        direction: { type: 'direction', a: 0, b: 1, dir: NORD },
        voisin: { type: 'voisin', a: 0, b: 1 },
        pasVoisin: { type: 'pasVoisin', a: 0, b: 1 },
        ecart: { type: 'ecart', a: 0, b: 1, d: 3 },
        memeLieu: { type: 'memeLieu', a: 0, b: 1 },
        pasMemeLieu: { type: 'pasMemeLieu', a: 0, b: 1 },
        dansLieu: { type: 'dansLieu', a: 0, lieu: 'H' },
        pasDansLieu: { type: 'pasDansLieu', a: 0, lieu: 'H' },
        bord: { type: 'bord', a: 0, oui: true },
        pres: { type: 'pres', a: 0, nom: 'le banc', repere: [4, 4] },
        plusPres: { type: 'plusPres', a: 0, b: 1, nom: 'le banc', repere: [4, 4] }
    };
    assert.deepEqual(Object.keys(faux).sort(), [...TYPES_DESSINES].sort(),
        'la liste des types dessinés et celle de l\'épreuve ont divergé');
    for (const [type, ind] of Object.entries(faux)) {
        const m = morceauxDeLIndice(ind, noms, scene);
        assert.ok(m.length >= 2, `« ${type} » ne rend que ${m.length} morceau(x)`);
        for (const x of m) {
            assert.ok(['personne', 'meuble', 'lieu', 'symbole'].includes(x.quoi),
                `« ${type} » : morceau inconnu « ${x.quoi} »`);
            if (x.quoi === 'symbole') {
                const svg = symboleSvg(x);
                assert.ok(svg.includes('<svg') && svg.length > 80,
                    `« ${type} » : le symbole « ${x.valeur} » ne dessine rien`);
            }
            if (x.quoi === 'lieu') {
                assert.ok(x.valeur && x.valeur.length > 2,
                    `« ${type} » : le lieu est vide — on affiche la LETTRE au lieu du nom`);
            }
        }
    }
});

test('ET LA FLÈCHE D\'UNE DIRECTION SE LIT DANS LE SENS DE LA CARTE', () => {
    // « Léa est à l'est de Malik » se dessine MALIK, puis la flèche vers l'est,
    // puis Léa : on part de Malik et l'on va vers l'est. Dans l'autre sens la
    // vignette enseignerait exactement le contraire de la phrase qu'elle
    // accompagne — et l'élève croirait la vignette, qui se lit plus vite.
    const scene = SCENES[2];
    const noms = ['Léa', 'Malik'];
    for (const dir of [NORD, SUD, EST, OUEST]) {
        const m = morceauxDeLIndice({ type: 'direction', a: 0, b: 1, dir }, noms, scene);
        assert.equal(m[0].quoi, 'personne');
        assert.equal(m[0].valeur, noms[1],
            `${dir} : la vignette part de la mauvaise personne`);
        assert.equal(m[2].valeur, noms[0], `${dir} : la vignette n'arrive pas sur la bonne`);
        assert.equal(m[1].valeur, dir, `${dir} : le symbole ne montre pas cette direction`);
    }
});

test('ET TOUTE VIGNETTE PARLE DES MÊMES PERSONNES QUE SA PHRASE', () => {
    // La phrase et la vignette ne doivent jamais nommer des gens différents :
    // c'est la carte que l'élève regarde, c'est la phrase qui fait foi.
    for (const scene of SCENES) {
        for (let i = 0; i < 12; i++) {
            const e = genererEnquete({ scene, rng: makeRng(`p${scene.id}${i}`) });
            for (const ind of e.indices) {
                const m = morceauxDeLIndice(ind, e.noms, e.scene);
                const dits = new Set(m.filter(x => x.quoi === 'personne').map(x => x.valeur));
                const attendus = new Set((ind.parle || []).map(k => e.noms[k]));
                assert.deepEqual([...dits].sort(), [...attendus].sort(),
                    `${scene.id} / ${ind.type} : la vignette et la phrase ne parlent pas `
                    + 'des mêmes personnes');
            }
        }
    }
});
