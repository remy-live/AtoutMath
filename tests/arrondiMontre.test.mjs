// L'ARRONDI, MONTRÉ ET NOMMÉ.
//
// Rémy, 28 novembre : « au dixième, et on regarde le chiffre des centièmes »,
// puis « j'ai des élèves qui galèrent un peu, il faut leur montrer
// visuellement ». Le chemin de l'élève (indice dessiné, correction dessinée)
// est gardé par `node tools/sondeArrondiMontre.mjs` ; ce fichier garde les
// règles du dessin et des mots.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import './helpers.mjs';
import { sansCommentaires } from './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { RANGS, ORDRE_SORTES, expliquer, indicesDe } from '../js/core/arrondi.js';
import { dessinsDeLArrondi, placeEntreLesVoisins, milieuDe } from '../js/core/arrondiDessin.js';
import { arrondiGenerator as G } from '../js/core/generators/arrondi.js';

const t = (rang, sorte, entier, chiffres) => ({ rang, sorte, n: { entier, chiffres } });

test('LA CORRECTION NOMME LE CHIFFRE QU\'ON REGARDE, DANS LES MOTS DE LA CLASSE', () => {
    assert.match(expliquer(t('dixieme', 'arrondi', 87, [5, 5, 2])), /Au dixième, on regarde le chiffre des centièmes : c'est 5/);
    assert.match(expliquer(t('unite', 'arrondi', 19, [2, 8])), /on regarde le chiffre des dixièmes : c'est 2/);
    assert.match(expliquer(t('centieme', 'arrondi', 2, [6, 7, 5])), /chiffre des millièmes : c'est 5/);
    // Par défaut, le chiffre suivant ne décide de rien : on ne l'envoie pas
    // chercher une règle là où il n'y a qu'à couper.
    assert.doesNotMatch(indicesDe(t('dixieme', 'defaut', 3, [0, 7, 8]))[0], /décide/);
    assert.match(indicesDe(t('dixieme', 'arrondi', 3, [0, 7, 8]))[0], /chiffre des centièmes/);
});

test('LA LOUPE PLACE LE NOMBRE SANS FLOTTANT, ET SON MILIEU S\'ÉCRIT JUSTE', () => {
    assert.equal(placeEntreLesVoisins(t('dixieme', 'arrondi', 87, [5, 5, 2])), 0.5 + 0.02);
    assert.equal(milieuDe(t('dixieme', 'arrondi', 87, [5, 5, 2])), '87,55');
    assert.equal(milieuDe(t('unite', 'arrondi', 19, [2, 8])), '19,5');
    assert.equal(milieuDe(t('dixieme', 'exces', 9, [9, 7])), '9,95');
});

test('TROIS DESSINS D\'INDICE ET UN DE CORRECTION, À CHAQUE RANG ET CHAQUE MOT', () => {
    for (const r of RANGS) {
        for (const sorte of ORDRE_SORTES) {
            const it = G.generate({ marches: [r.id], sortes: [sorte] }, { rng: makeRng(`${r.id}-${sorte}`), index: 0 });
            assert.equal(it.schemas.length, 3, `${r.id}/${sorte} : ${it.schemas.length} dessin(s) d'indice`);
            for (const s of it.schemas) assert.match(s, /<svg[^>]*arr-svg/);
            assert.match(it.meta.schemaCorrection, /arr-fleche/, `${r.id}/${sorte} : la correction n'a pas sa flèche`);
            // LE CERCLE ORANGE POUR L'ARRONDI SEUL : par défaut et par excès, le
            // chiffre suivant ne décide de rien.
            const entoure = /arr-decide/.test(it.meta.schemaCorrection);
            assert.equal(entoure, sorte === 'arrondi', `${r.id}/${sorte} : cercle ${entoure ? 'en trop' : 'absent'}`);
        }
    }
});

test('« 3,0 » ET NON « 3 » DANS CE QU\'ON LIT', () => {
    const it = G.generate({ marches: ['dixieme'], sortes: ['defaut'] }, { rng: makeRng('zero'), index: 0 });
    const d = dessinsDeLArrondi(t('dixieme', 'defaut', 3, [0, 7, 8]));
    assert.match(d.correction, />3,0</, 'la loupe écrit « 3 » au lieu de « 3,0 »');
    assert.match(expliquer(t('dixieme', 'defaut', 3, [0, 7, 8])), /: 3,0\./);
    assert.ok(it.meta.reponseLisible && it.meta.reponseLisible.includes(','), '« Montre-moi » lirait la réponse sans son rang');
});

test('LA CARTE « CE N\'EST PAS ÇA » PORTE LE DESSIN DE LA CORRECTION', () => {
    const SRC = sansCommentaires(fs.readFileSync(new URL('../js/core/itemSession.js', import.meta.url), 'utf8'));
    assert.match(SRC, /schema: \(!encore && this\.policy\.correction !== 'reponse'\s*&& this\.item\.meta && this\.item\.meta\.schemaCorrection\) \|\| null/,
        'la correction ne transmet plus le dessin à la carte');
});

test('L\'ENCADREMENT A SA LOUPE : DES « ? » À L\'INDICE, LES VOISINS À LA CORRECTION', async () => {
    const { dessinsDeLEncadrement } = await import('../js/core/arrondiDessin.js');
    const d = dessinsDeLEncadrement('19,97', 'dixieme', ['19,9', '20']);
    assert.doesNotMatch(d.indice, />19,9<|>20</, 'l\'indice donne les voisins, c\'est-à-dire la réponse');
    assert.match(d.indice, />\?</);
    // Les bornes s'écrivent comme dans les propositions de l'exercice.
    assert.match(d.correction, />19,9</);
    assert.match(d.correction, />20</);
    assert.doesNotMatch(d.correction, />20,0</);
    const { getGenerator } = await import('../js/core/registry.js');
    await import('../js/core/activities/index.js');
    const g = getGenerator('num.encadrement');
    for (const m of ['encadrer-entier', 'encadrer-dixieme']) {
        const it = g.generate({ marches: [m] }, { rng: makeRng(m), index: 0 });
        assert.ok(it.schemas && it.schemas[1], `${m} : pas de dessin au second indice`);
        assert.ok(it.meta.schemaCorrection, `${m} : pas de dessin à la correction`);
    }
});
