// LE CORRIGÉ DU PROFESSEUR N'ÉCRIT PAS « 14|30 ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// TROUVÉ EN REGARDANT UNE FEUILLE, parce qu'on ne peut pas le trouver
// autrement : la page des solutions de « Addition de Fractions » annonçait
// « 1. 14|30   2. 32|30   3. 11|18 ».
//
// LE TUYAU EST LA NOTATION DU PAVÉ : deux cases, un numérateur et un
// dénominateur. À l'écran, personne ne le voit — l'élève tape dans deux cases,
// ou clique une fraction dessinée. Mais `ui/printQuestions.js` imprime la
// VALEUR de la bonne proposition dès que son libellé contient du HTML, et une
// fraction en contient toujours. Le tuyau partait alors tel quel sur la page
// que le professeur pose à côté des copies.
//
// CINQ EXERCICES LE FAISAIENT, et l'un d'eux n'était même pas une fraction :
// la réciproque de Pythagore répondait « 225|225 », qui se lit « AB² = 225 et
// AC² + BC² = 225 ».
//
// ── POURQUOI UNE ÉPREUVE PLUTÔT QUE CINQ CORRECTIONS ──────────────────────
//
// Parce que la sixième s'écrira sans y penser. `reponsePapier` est facultatif,
// son absence ne lève rien, et le défaut ne se voit QUE sur une feuille
// imprimée et regardée. Cette épreuve-ci est le seul endroit où l'oubli coûte
// quelque chose avant qu'une classe ne reçoive la feuille.
//
// ── CE QU'ELLE A COÛTÉ À ÉCRIRE, ET QUI SERT DE LEÇON ─────────────────────
//
// Sa première version répondait « aucun » alors que cinq exercices étaient
// fautifs. `makeItem` pose `reponsePapier: ''` quand le générateur n'en donne
// pas, et `??` laisse passer la chaîne vide : elle lisait donc « rien » au lieu
// de la réponse, et « rien » ne contient pas de tuyau. Une mesure qui ne
// regarde pas ce qu'elle croit regarder répond VERT.

import test from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';

import { exercices } from '../js/data/catalog.js';
import '../js/core/activities/index.js';
import { generateurDeFiche } from '../js/core/registry.js';
import { makeRng } from '../js/core/ids.js';

/**
 * Ce que `ui/printQuestions.js` écrirait sur la page des solutions.
 *
 * On refait son raisonnement, sans le DOM : `reponsePapier` d'abord, sinon le
 * libellé de la bonne proposition, et sa VALEUR si ce libellé est du HTML.
 */
function corrigeDe(item) {
    if (item.reponsePapier) return String(item.reponsePapier);
    if (item.answerKind === 'choice' && item.choices) {
        const bonne = item.choices.find(c => c.correct);
        if (bonne) {
            if (bonne.texte) return String(bonne.texte);
            const brut = String(bonne.label ?? bonne.value ?? '');
            return /[<>]/.test(brut) ? String(bonne.value ?? '') : brut;
        }
    }
    return String(item.answer ?? '');
}

/**
 * EST-CE LA NOTATION DU PAVÉ, ou une barre qui veut dire autre chose ?
 *
 * « UNE BARRE VERTICALE N'EST PAS TOUJOURS UN SÉPARATEUR. » La première
 * version de cette épreuve refusait toute barre, et elle a dénoncé
 * `sec-valeur-absolue`, dont la bonne proposition s'écrit « |x − 1| = 4 » —
 * juste, imprimée telle quelle, et parfaitement lisible. Une épreuve qui crie
 * sur du travail correct finit par être désarmée, et c'est alors tout ce
 * qu'elle gardait qui tombe avec elle.
 *
 * Le séparateur du pavé ne sépare QUE des nombres : « 7|9 », « 3/4|7|4|21|16 ».
 * Dès qu'un morceau porte une lettre, un espace ou un signe d'opération, la
 * barre dit autre chose.
 */
const formeDuPave = (texte) => {
    const t = String(texte);
    if (!t.includes('|')) return false;
    return t.split('|').every(m => /^\d+(?:[/,.]\d+)?$/.test(m.trim()) && m.trim() !== '');
};

test('AUCUN CORRIGÉ N’IMPRIME LA NOTATION À DEUX CASES', () => {
    const fautifs = [];
    for (const exo of exercices) {
        const g = generateurDeFiche(exo);
        if (!g || !g.ecrit || typeof g.generate !== 'function') continue;
        for (let i = 0; i < 8; i++) {
            let item;
            try {
                item = g.generate({ ...(exo.params || {}) },
                    { rng: makeRng(`tuyau-${exo.id}-${i}`), index: i, total: 8 });
            } catch { break; }
            if (!item) break;
            const ecrit = corrigeDe(item);
            if (formeDuPave(ecrit)) {
                fautifs.push(`${exo.id} (${exo.generatorId}) écrirait « ${ecrit} »`);
                break;
            }
        }
    }
    assert.deepEqual(fautifs, [],
        'Ces exercices imprimeraient la notation du pavé sur la page des solutions.\n'
        + 'Le générateur doit poser « reponsePapier » — ce qu’il faut LIRE, quand ce\n'
        + 'n’est pas ce que le pavé reçoit :\n  ' + fautifs.join('\n  '));
});

test('ET LA SONDE REGARDE BIEN LA RÉPONSE, PAS UNE CHAÎNE VIDE', () => {
    // L'ÉPREUVE D'AU-DESSUS A DÉJÀ ÉTÉ VERTE POUR RIEN. `makeItem` pose
    // `reponsePapier: ''`, et la première version lisait cette chaîne vide comme
    // une réponse. Celle-ci garde le lecteur lui-même : sur un item fabriqué de
    // toutes pièces, il doit rendre la valeur, pas le vide.
    assert.equal(corrigeDe({ reponsePapier: '', answer: '14|30' }), '14|30',
        'un « reponsePapier » vide n’est pas une réponse : il faut passer à la suite');
    assert.equal(corrigeDe({ reponsePapier: '14/30', answer: '14|30' }), '14/30',
        'quand le générateur dit ce qu’il faut lire, c’est cela qu’on lit');
    assert.equal(
        corrigeDe({
            answerKind: 'choice', answer: '7|5',
            choices: [{ correct: true, value: '7|5', label: '<span class="fraction">7</span>' }]
        }),
        '7|5',
        'un libellé en HTML ne s’imprime pas : c’est la valeur qui part sur la feuille');

    // ET LA BARRE DE LA VALEUR ABSOLUE N'EST PAS UN SÉPARATEUR.
    assert.equal(formeDuPave('7|9'), true, 'deux nombres séparés : c’est le pavé');
    assert.equal(formeDuPave('3/4|7|4|21|16'), true, 'six cases aussi');
    assert.equal(formeDuPave('|x − 1| = 4'), false,
        'les barres de la valeur absolue encadrent une expression, elles ne séparent rien');
    assert.equal(formeDuPave('14/30'), false, 'une fraction écrite comme il faut n’a pas de barre');
});
