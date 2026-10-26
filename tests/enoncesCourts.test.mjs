// UN ÉNONCÉ EST UNE QUESTION, PAS UNE LEÇON.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 26 octobre : « de manière générale, les énoncés doivent être plus
// court, vraiment sans exception. On n'a pas à expliquer qu'il faut ranger
// dans l'ordre croissant pour calculer une médiane ».
//
// DEUX CHOSES DANS CETTE PHRASE, et la seconde est la plus coûteuse : un
// énoncé qui donne la méthode ne mesure plus rien. « Range les nombres dans
// l'ordre croissant, puis trouve la médiane » n'est pas une question, c'est la
// correction imprimée au-dessus du blanc.
//
// LA LIGNE DE PARTAGE — et son propre carnet la trace, le même jour : « quand
// on demande la médiane, EN INDICE, il faut dire qu'il faut ranger les nombres
// dans l'ordre croissant ». La méthode appartient à l'INDICE et au ROBOT, qui
// se déplient quand l'élève le demande. L'énoncé, lui, ne se déplie pas.
//
// MESURÉ (`tools/enoncesDuCatalogue.mjs`) sur 794 énoncés de 166 exercices :
// quinze dépassaient 160 caractères, le plus long en faisait 200. Après :
// aucun. Le plafond ci-dessous n'est donc pas un chiffre rond choisi d'avance,
// c'est ce que le catalogue tient une fois nettoyé — et un problème de PPCM,
// qui doit poser deux rythmes et un départ commun, est ce qui le fixe.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { exercices } from '../js/data/catalog.js';
import { getGenerator } from '../js/core/registry.js';
import { makeRng } from '../js/core/ids.js';
import { consigneDe } from '../js/core/generators/transfoQuadrillage.js';

/** Ce qu'un énoncé ne doit pas dépasser, en caractères. Voir l'en-tête. */
const PLAFOND = 160;

const nettoyer = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();

test('AUCUN ÉNONCÉ DU CATALOGUE NE DÉPASSE LE PLAFOND', () => {
    const trop = [];
    let vus = 0;
    for (const exo of exercices) {
        const gen = getGenerator(exo.generatorId);
        if (!gen || typeof gen.generate !== 'function') continue;
        for (let i = 0; i < 6; i++) {
            let it;
            try {
                it = gen.generate({ ...(exo.params || {}) },
                    { rng: makeRng(exo.id + 'enonce' + i), index: i });
            } catch (e) { continue; }
            if (!it || !it.prompt) continue;
            // LES DEUX FORMES, et la seconde est la plus serrée : une colonne
            // de fiche fait 78 mm.
            for (const brut of [it.prompt.text, it.prompt.papier]) {
                const t = nettoyer(brut);
                if (!t) continue;
                vus++;
                if (t.length > PLAFOND) trop.push(`${exo.id} (${t.length}) — ${t.slice(0, 90)}…`);
            }
        }
    }
    // SI LE TIRAGE NE COUVRE PLUS RIEN, l'épreuve passerait au vert sans avoir
    // regardé quoi que ce soit.
    assert.ok(vus > 600, `seulement ${vus} énoncés relevés : le tirage ne couvre plus le catalogue`);
    assert.deepEqual([...new Set(trop)], [],
        `des énoncés dépassent ${PLAFOND} caractères — voir tools/enoncesDuCatalogue.mjs`);
});

test('ET LA MÉDIANE NE DIT PAS COMMENT ON LA CALCULE', () => {
    // L'EXEMPLE QU'IL A DONNÉ LUI-MÊME. La question tient en un mot une fois
    // la série étiquetée : « Tailles (cm) de 8 joueuses : 157 ; … Médiane ? ».
    const exo = exercices.find(e => e.id === 'don-statistiques');
    assert.ok(exo, 'don-statistiques a disparu du catalogue');
    const gen = getGenerator(exo.generatorId);
    const vus = [];
    for (let i = 0; i < 40; i++) {
        const it = gen.generate({ ...(exo.params || {}) },
            { rng: makeRng('mediane' + i), index: i });
        vus.push(nettoyer(it.prompt.text));
    }
    const medianes = vus.filter(t => /médiane/i.test(t));
    assert.ok(medianes.length, 'aucune question de médiane dans quarante tirages');
    for (const t of medianes) {
        assert.doesNotMatch(t, /ordre croissant|range/i,
            `l'énoncé donne la méthode : « ${t} »`);
        assert.ok(t.length <= 110, `énoncé de médiane trop long (${t.length}) : « ${t} »`);
    }
});

test('ET LE QUART DE TOUR NE RÉEXPLIQUE PAS LES AIGUILLES DANS LA QUESTION', () => {
    // « le sens direct (dans le sens inverse des aiguilles d'une montre) » :
    // 139 caractères, et deux fois le mot « sens ». La glose reste dans le
    // TROISIÈME INDICE de la marche, montre en main — un indice se déplie
    // quand l'élève en a besoin, une question non.
    const dit = consigneDe({ genre: 'rotation', quarts: 1 });
    assert.match(dit, /sens (direct|indirect)/, 'le sens n\'est plus nommé du tout');
    assert.doesNotMatch(dit, /aiguilles/,
        'la glose des aiguilles est revenue dans la question');
});
