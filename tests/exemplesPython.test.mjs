// UN EXEMPLE SOUS L'INDICE — et il ne doit jamais ÊTRE la réponse.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 19 novembre : « pour Python, je pense qu'il faut que tu montres un
// exemple dans l'indice ».
//
// ── CE QUI SE GARDE ICI ──────────────────────────────────────────────────
//
// Un exemple est le milieu étroit entre deux façons de ne servir à rien :
//
//   · « le mot qui affiche s'écrit en cinq lettres » n'apprend rien à qui ne
//     l'a jamais vu écrit ;
//   · « Écris : print("Merci") » lui donne sa réponse et le dispense de
//     comprendre.
//
// Entre les deux : la même tournure, SUR D'AUTRES VALEURS. L'élève reconnaît
// la forme et doit encore la transposer — c'est là qu'il apprend.
//
// CE FICHIER GARDE CE MILIEU. Un exemple qui glisserait vers la réponse ne
// casserait rien : les épreuves resteraient vertes, l'exercice marcherait, et
// il ne mesurerait simplement plus rien. C'est le genre de défaut qu'on ne
// voit jamais, parce qu'il ressemble à un succès.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { pythonEcrireGenerator, ETAPES } from '../js/core/generators/pythonPasAPas.js';

const MARCHES = ETAPES.filter((e) => e.ecrire).map((e) => e.id);

/** Le texte d'un schéma, balises et entités retirées. */
const texteDe = (html) => String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"').replace(/&#39;/g, '\'')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();

/** Un code, ramené à sa forme comparable : sans blancs, sans numéros. */
const nu = (code) => String(code || '').replace(/\s+/g, '');

const tirer = (marche, k) => pythonEcrireGenerator.generate({ marches: [marche] },
    { rng: makeRng(`${marche}/ex/${k}`), index: 0, total: 1 });

test('CHAQUE MARCHE OÙ L’ÉLÈVE TAPE MONTRE UN EXEMPLE SOUS SON PREMIER INDICE', () => {
    const sans = [];
    for (const m of MARCHES) {
        const it = tirer(m, 0);
        const s = (it.schemas || [])[0];
        // ET IL DOIT PORTER DU CODE, pas une phrase : `py-bloc` est le bloc
        // que `codeHtml` fabrique. Un exemple en prose serait un troisième
        // indice déguisé.
        if (!s || !/py-bloc/.test(s)) sans.push(`${m} : ${s ? 'sans code' : 'aucun exemple'}`);
    }
    assert.deepEqual(sans, [],
        'une marche n’a pas d’exemple sous son indice — Rémy, 19 novembre : '
        + '« il faut que tu montres un exemple dans l’indice »');
});

test('ET L’EXEMPLE SUIT LE PREMIER INDICE, PAS UN AUTRE', () => {
    // `schemas[i]` se pose sous `hints[i]` : un décalage d'un cran mettrait
    // l'exemple sous la mauvaise phrase, et `aideExercice` l'a déjà payé une
    // fois sur les figures.
    for (const m of MARCHES) {
        const it = tirer(m, 0);
        assert.ok((it.hints || []).length >= 1, `${m} n’a pas d’indice`);
        assert.ok((it.schemas || []).length <= it.hints.length,
            `${m} : plus d’exemples que d’indices`);
    }
});

test('L’EXEMPLE N’EST JAMAIS LE PROGRAMME ATTENDU', () => {
    // ── LE DÉFAUT QUI RESSEMBLE À UN SUCCÈS ──────────────────────────────
    //
    // Un exemple qui tombe sur la solution se recopie, et l'élève passe la
    // marche sans l'avoir montée. Rien ne le signale : la réponse est juste.
    const fautifs = [];
    for (const m of MARCHES) {
        for (let k = 0; k < 25; k++) {
            const it = tirer(m, k);
            const ex = nu(texteDe((it.schemas || [])[0]));
            const sol = nu(it.meta.solution || '');
            if (!ex || !sol) continue;
            // L'exemple porte son étiquette « Par exemple » ; on compare ce
            // qui reste au programme solution, blancs retirés.
            const code = ex.replace(/^Parexemple/, '').replace(/affiche.*$/, '');
            if (code.includes(sol) || sol.includes(code)) {
                fautifs.push(`${m} (tirage ${k}) : l’exemple est la solution`);
                break;
            }
        }
    }
    assert.deepEqual(fautifs, []);
});

test('NI LA SORTIE ATTENDUE', () => {
    // Pour les marches « écris ce que ça affiche », l'exemple montre un
    // programme ET ce qu'il affiche. Si cette sortie-là était celle de la
    // question, l'élève n'aurait qu'à la recopier.
    const fautifs = [];
    for (const m of MARCHES) {
        for (let k = 0; k < 25; k++) {
            const it = tirer(m, k);
            const attendue = String(it.meta.sortieAttendue || '').trim();
            if (!attendue) continue;
            const montre = texteDe((it.schemas || [])[0]);
            const apres = (montre.split('affiche')[1] || '').trim();
            if (!apres) continue;
            if (nu(apres) === nu(attendue)) {
                fautifs.push(`${m} (tirage ${k}) : l’exemple affiche « ${attendue} »`);
                break;
            }
        }
    }
    assert.deepEqual(fautifs, []);
});

test('ET L’ÉDITEUR PROPOSE BIEN UN INDICE', async () => {
    // ── LE DÉFAUT TROUVÉ EN ALLANT POSER LES EXEMPLES ────────────────────
    //
    // L'ÉDITEUR PYTHON N'AVAIT AUCUN BOUTON « Un indice ». Les quatre autres
    // activités de saisie en ont un — `rangerLeMot`, `notationSaisie`,
    // `litteralSaisie`, `egaliteFleches` —, celle-ci était partie sans. Les
    // indices étaient écrits, rangés dans l'item, et INATTEIGNABLES : l'élève
    // coincé n'avait que le bouton « Lancer ».
    //
    // Rien ne le signalait : les items portaient leurs `hints`, les épreuves
    // des générateurs étaient vertes, et l'exercice marchait. Un exercice sans
    // aide marche très bien — pour qui n'en a pas besoin.
    const { sansCommentaires } = await import('./helpers.mjs');
    const { readFileSync } = await import('node:fs');
    const S = sansCommentaires(readFileSync(
        new URL('../js/core/activities/pythonEditeur.js', import.meta.url), 'utf8'));
    assert.match(S, /hintBar\(session\)/, 'l’éditeur n’affiche pas la barre d’indice');
    assert.match(S, /wireHint\(container, session\)/,
        'la barre est affichée mais son bouton n’est branché à rien');
});

test('ET LE POLYGONE NE TIRE JAMAIS QUATRE CÔTÉS', () => {
    // ── POURQUOI CE CAS A SA PROPRE ÉPREUVE ──────────────────────────────
    //
    // L'indice du polygone montre en exemple le CARRÉ — « 360 ÷ 4 = 90 » —,
    // parce que c'est la figure que l'élève vient de tracer à la marche
    // précédente, et que c'est le cas où la division tombe le plus juste.
    // Tirer quatre dans la question ferait de cet exemple la réponse, à la
    // longueur du côté près. Les deux épreuves ci-dessus ne le verraient pas :
    // les programmes ne seraient pas identiques, seulement interchangeables.
    for (let k = 0; k < 60; k++) {
        const it = tirer('dessin-polygone', k);
        const n = Number((it.meta.solution.match(/range\((\d+)\)/) || [0, 0])[1]);
        assert.notEqual(n, 4,
            'le polygone a tiré un carré, que son propre indice donne en exemple');
        assert.ok(Number.isInteger(360 / n), `360 ÷ ${n} n’est pas entier`);
    }
});
