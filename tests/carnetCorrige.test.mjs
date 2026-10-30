// LE CARNET D'ERREURS MONTRE LA FIGURE ET LA SOLUTION.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture du carnet d'un élève de 4e à l'appui :
//
//   « c'est pas clair pour les transformations, il faut montrer la figure de
//     base et la solutions. […] Il faut que tant que faire se peut que ce soit
//     visuel pour les explications. »
//
// Sa capture montre, sous une figure muette :
//
//   ta réponse : point:0.5:4.5, attendu : point:4.5:4.5
//   ta réponse : 7|3/8|3/7|4/8|4/8|5, attendu : 8|2/9|2/8|3/9|3/9|4
//
// ── POURQUOI CE DÉFAUT EST LÀ ALORS QU'IL EST DÉJÀ CORRIGÉ ─────────────────
//
// Depuis ea55257, l'activité envoie au journal la version qui se lit. Mais LE
// CARNET REJOUE CE QUI A ÉTÉ ÉCRIT LE JOUR DE L'ERREUR, et les quatre-vingts
// erreurs déjà enregistrées de cet élève portent la forme canonique — elles la
// porteront toujours. Une correction qui ne vaut que pour l'avenir laisse
// l'élève devant l'écran d'hier.
//
// ── CE QUE CETTE ÉPREUVE GARDE ─────────────────────────────────────────────
//
// Que la clé se relise, que la figure du corrigé dise les DEUX réponses, et
// qu'une case juste ne soit jamais peinte en rouge.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sansCommentaires } from './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { pavageGenerator } from '../js/core/generators/pavage.js';
import { transfoQuadrillageGenerator as TQ } from '../js/core/generators/transfoQuadrillage.js';
import { cleElement, elementDepuisLaCle } from '../js/core/elementSymetrie.js';
import { cleFigure, figureDepuisLaCle } from '../js/core/transformations.js';
import { corrigeDe } from '../js/core/visuelQuestion.js';
import { getExerciseById } from '../js/data/catalog.js';
// LE REGISTRE DOIT ÊTRE REMPLI : `corrigeDe` retrouve le générateur par son
// identifiant, et un registre vide rend `null` — c'est-à-dire la même réponse
// qu'un corrigé impossible à fabriquer. L'épreuve passait au vert sur le
// mauvais motif ; cet import la remet devant le bon.
import '../js/core/activities/index.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const compter = (t, motif) => (String(t).match(motif) || []).length;

test('UNE CLÉ ENREGISTRÉE SE RELIT — c\'est ce qui répare le passé', () => {
    // L'ALLER-RETOUR EST LA SEULE VÉRIFICATION QUI NE SE TROMPE PAS D'UN
    // DEMI-CARREAU : `core/elementSymetrie.js` prévient en tête de fichier
    // qu'une droite « écrite x = 4 par la question et lue x = 4,5 par la
    // correction serait un exercice qui donne tort à qui a raison ».
    for (const cle of ['axe:v:7.5', 'axe:h:4.5', 'point:5.5:3.5', 'point:0.5:4.5']) {
        assert.equal(cleElement(elementDepuisLaCle(cle)), cle);
    }
    assert.equal(elementDepuisLaCle('(4 ; 7)'), null, 'ce n\'est pas une clé');
    assert.equal(elementDepuisLaCle(''), null);

    for (const cle of ['7|3/8|3/7|4/8|4/8|5', '0|0', '8|2/9|2']) {
        assert.equal(cleFigure(figureDepuisLaCle(cle)), cle);
    }
    assert.deepEqual(figureDepuisLaCle('n\'importe quoi'), []);
});

test('LA FIGURE DU PAVAGE PORTE LA SOLUTION, LA RÉPONSE, ET LE RESTE EFFACÉ', () => {
    const item = pavageGenerator.generate({ taille: 'moyen' }, { rng: makeRng('cor1') });
    const m = item.meta;
    const faux = m.candidats.find(c => c.id !== m.idJuste);
    const html = pavageGenerator.figureCorrigee(item, { donne: faux });
    // UN SEUL ÉLÉMENT EN VERT, et c'est le bon : deux solutions sur une
    // correction, et l'élève ne sait plus laquelle il fallait trouver. Deux
    // marques par élément — le trait et son nom.
    assert.equal(compter(html, /qd-candidat--juste/g), 2);
    assert.equal(compter(html, /qd-candidat--faux/g), 2);
    // LES AUTRES RESTENT LISIBLES : c'est parmi EUX qu'il fallait choisir.
    assert.equal(compter(html, /qd-candidat--pale/g), (m.candidats.length - 2) * 2);
    // ET LES PIÈCES SONT LÀ — « il faut montrer la figure de base ».
    assert.ok(compter(html, /qd-piece/g) >= m.pieces.length);
});

test('SANS RÉPONSE DE L\'ÉLÈVE, LA SOLUTION SE MONTRE QUAND MÊME', () => {
    // Le carnet peut porter une erreur dont la réponse ne se relit pas — un
    // vieux format, une saisie libre. La correction reste utile : elle dit ce
    // qu'il fallait trouver.
    const item = pavageGenerator.generate({ taille: 'moyen' }, { rng: makeRng('cor2') });
    const html = pavageGenerator.figureCorrigee(item, {});
    assert.equal(compter(html, /qd-candidat--juste/g), 2);
    assert.equal(compter(html, /qd-candidat--faux/g), 0);
});

test('UNE CASE JUSTE N\'EST JAMAIS PEINTE EN ROUGE', () => {
    // LE PIÈGE DE CETTE FIGURE-LÀ : l'élève pose cinq cases, trois sont
    // bonnes. Peindre ses cinq cases en rouge lui dirait que tout est faux —
    // alors que le diagnostic, juste en dessous, lui dit « 3 cases justes ».
    // Deux phrases qui se contredisent sur le même écran.
    const item = TQ.generate({}, { rng: makeRng('cor3') });
    const m = item.meta;
    const donne = [...m.image.slice(0, 3), { x: 0, y: 0 }, { x: 1, y: 0 }];
    const html = TQ.figureCorrigee(item, { donne });
    assert.equal(compter(html, /qd-attendue/g), m.image.length,
        'toute l\'image attendue doit être dessinée');
    assert.equal(compter(html, /qd-en-trop/g), 2,
        'seules les cases EN TROP se peignent en rouge');
    // ET LA FIGURE DE DÉPART RESTE : sans elle, la correction ne dit pas d'où
    // l'on part.
    assert.equal(compter(html, /qd-depart/g), m.depart.length);
});

test('LE CARNET DIT LA RÉPONSE EN FRANÇAIS, MÊME POUR UNE VIEILLE ERREUR', () => {
    // LE CAS DE LA CAPTURE DE RÉMY, refait à l'identique : une erreur
    // enregistrée AVANT la correction, donc en forme canonique.
    //
    // AVEC LES RÉGLAGES DU CATALOGUE, et c'est l'épreuve qui me l'a appris :
    // `corrigeDe` refabrique la question avec CEUX-LÀ, et il refuse de rendre
    // un corrigé si l'énoncé refait n'est pas celui qu'on avait enregistré.
    // Un item tiré avec d'autres réglages n'est pas le cas de l'élève.
    const reglages = getExerciseById('geo-pavage').params;
    const item = pavageGenerator.generate({ ...reglages }, { rng: makeRng('cor4') });
    const m = item.meta;
    const faux = m.candidats.find(c => c.id !== m.idJuste);
    const q = {
        generatorId: 'geo.transfo.pavage', itemSeed: item.seed,
        questionText: item.prompt.text,
        input: cleElement(faux), expected: item.answer
    };
    const c = corrigeDe(q, 'geo-pavage');
    assert.ok(c, 'la correction doit se refabriquer depuis la graine');
    // PLUS UNE SEULE CLÉ SOUS LES YEUX DE L'ÉLÈVE.
    assert.ok(!/^(axe|point):/.test(c.given), `« ${c.given} » est encore une clé`);
    assert.ok(!/^(axe|point):/.test(c.expected), `« ${c.expected} » est encore une clé`);
    // ET CE SONT LES NOMS DE LA FIGURE : sur un quadrillage qui porte quatre
    // droites, « y = 5 » seul ne désigne rien à l'œil.
    assert.match(c.expected, /\(d|O/);
    assert.ok(c.html.includes('qd-candidat--juste'));
});

test('UNE QUESTION QU\'ON NE SAIT PAS REFAIRE NE DONNE PAS DE CORRIGÉ', () => {
    // LA GARANTIE D'AVANT, et elle vaut toujours : si le professeur a changé
    // les réglages de l'exercice, la graine donne une AUTRE question. Un
    // corrigé qui ne correspond pas à l'énoncé serait pire que pas de corrigé.
    const item = pavageGenerator.generate({ taille: 'moyen' }, { rng: makeRng('cor5') });
    const c = corrigeDe({
        generatorId: 'geo.transfo.pavage', itemSeed: item.seed,
        questionText: 'Une question qui n\'est pas celle-là',
        input: 'axe:v:1.5', expected: item.answer
    }, 'geo-pavage');
    assert.equal(c, null);
});

test('ET LA CARTE DU CARNET S\'EN SERT', () => {
    const P = sansCommentaires(lire('js/ui/profileUI.js'));
    assert.match(P, /const corrige = corrigeDe\(q, err\.exoId\);/);
    // LA RÉPONSE LISIBLE PASSE AVANT CELLE DU JOURNAL, et le journal reste le
    // repli : un exercice sans corrigé garde sa carte d'avant.
    assert.match(P, /const donne = \(corrige && corrige\.given\) \|\| q\.input;/);
    assert.match(P, /const attendu = \(corrige && corrige\.expected\) \|\| q\.expected;/);
    // ET LA LÉGENDE EST ÉCRITE, pas seulement colorée : un élève qui distingue
    // mal le vert du rouge lit les deux mots.
    assert.match(P, /error-legende-juste/);
    assert.match(P, /error-legende-faux/);
});
