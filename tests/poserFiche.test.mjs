// « POSE ET EFFECTUE » SUR LE PAPIER — le générateur de la fiche.
//
// Ce qu'on vérifie ici n'est pas le dessin (seul l'œil en juge) mais ce dont
// le dessin dépend : que la réponse annoncée soit la bonne, que le tirage pose
// vraiment la question — une addition sans retenue n'est pas « poser une
// addition », c'est aligner des chiffres — et qu'une soustraction ne descende
// jamais sous zéro.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { poserFicheGenerator as gen } from '../js/core/generators/poserFiche.js';

const tirer = (params, n = 30) => Array.from({ length: n }, () =>
    gen.generate(params, { rng: makeRng(), themesExclus: [] }));

test('la réponse annoncée est la bonne, pour les quatre opérations', () => {
    for (const item of tirer({ operation: '+', chiffres: 3 })) {
        const [a, b] = item.meta.operandes;
        assert.equal(item.answer, a + b, item.meta.texte);
    }
    for (const item of tirer({ operation: '-', chiffres: 3 })) {
        const [a, b] = item.meta.operandes;
        assert.equal(item.answer, a - b, item.meta.texte);
    }
    for (const item of tirer({ operation: '×', chiffres: 3 })) {
        const [a, b] = item.meta.operandes;
        assert.equal(item.meta.table.produitEntier, a * b, item.meta.texte);
    }
    for (const item of tirer({ operation: '÷', chiffres: 3 })) {
        const [a, b] = item.meta.operandes;
        const t = item.meta.table;
        assert.equal(t.quotient, Math.floor(a / b), item.meta.texte);
        assert.equal(t.reste, a % b, item.meta.texte);
        // La vérification qui ne trompe pas : quotient × diviseur + reste.
        assert.equal(t.quotient * b + t.reste, a, item.meta.texte);
    }
});

test('une soustraction posée ne descend jamais sous zéro', () => {
    for (const item of tirer({ operation: '-', chiffres: 4 }, 60)) {
        const [a, b] = item.meta.operandes;
        assert.ok(a > b, `${a} − ${b} : le grand doit être en haut`);
    }
});

test('« garantir une retenue » la garantit vraiment', () => {
    for (const item of tirer({ operation: '+', chiffres: 3, retenue: true }, 40)) {
        assert.ok(item.meta.table.colonnes.some(c => c.retenueSortante > 0),
            `${item.meta.texte} n'a aucune retenue`);
    }
    for (const item of tirer({ operation: '-', chiffres: 3, retenue: true }, 40)) {
        assert.ok(item.meta.table.colonnes.some(c => c.emprunte),
            `${item.meta.texte} n'a aucun emprunt`);
    }
});

test('la division a de quoi montrer sa méthode', () => {
    for (const item of tirer({ operation: '÷', chiffres: 3 }, 40)) {
        const ecrites = item.meta.table.etapes.filter(e => e.ecrit);
        assert.ok(ecrites.length >= 2,
            `${item.meta.texte} : une seule étape, la potence ne montre rien`);
        // Et le reste est TOUJOURS plus petit que le diviseur.
        for (const e of ecrites) {
            assert.ok(e.reste < item.meta.operandes[1],
                `${item.meta.texte} : reste ${e.reste} ≥ diviseur`);
        }
    }
});

test('le reste fait partie de la réponse d\'une division', () => {
    const avec = tirer({ operation: '÷', chiffres: 3 }, 40).find(i => !i.meta.table.exacte);
    if (!avec) return;   // tirage sans reste : rien à vérifier
    assert.match(avec.meta.reponse, /reste \d+/,
        '« 147 ÷ 4 = 36 » est faux tant qu\'on n\'a pas dit « il reste 3 »');
});

test('trois nombres à l\'addition, jamais ailleurs', () => {
    assert.equal(tirer({ operation: '+', chiffres: 2, nombres: 3 }, 5)[0].meta.operandes.length, 3);
    assert.equal(tirer({ operation: '-', chiffres: 2, nombres: 3 }, 5)[0].meta.operandes.length, 2);
});

// --- LE TABLEAU DE CONVERSION SUR LE PAPIER ---------------------------------

import { conversionFicheGenerator } from '../js/core/generators/conversionFiche.js';
import { familleDe } from '../js/core/conversion.js';

const tables = (params, n = 25) => Array.from({ length: n }, () =>
    conversionFicheGenerator.generate(params, { rng: makeRng(), themesExclus: [] }));

test('conversion : chaque nombre tient dans le tableau', () => {
    for (const famille of ['longueur', 'masse', 'capacite']) {
        const n = familleDe(famille).unites.length;
        for (const item of tables({ famille, ecart: 6 })) {
            for (const cv of item.meta.conversions) {
                for (const c of cv.cases) {
                    assert.ok(c.col >= 0 && c.col < n,
                        `${cv.enonce} : le chiffre ${c.chiffre} tombe hors du tableau`);
                }
                // Et les chiffres posés reforment bien le nombre de départ.
                assert.equal(cv.cases.length, String(cv.valeur).replace(/[^0-9]/g, '').length,
                    `${cv.enonce} : il manque des chiffres`);
            }
        }
    }
});

test('conversion : la réponse est juste, et la virgule à sa place', () => {
    for (const item of tables({ famille: 'longueur', decimales: true })) {
        for (const cv of item.meta.conversions) {
            assert.ok(cv.virguleApres >= 0, `${cv.enonce} : pas de colonne d'arrivée`);
            assert.match(cv.complet, /=/);
            // « 13 hm = 1300 m » : la valeur d'arrivée se relit dans le texte.
            assert.ok(cv.complet.includes(String(cv.attendu).replace('.', ',')),
                `${cv.complet} ne contient pas ${cv.attendu}`);
        }
    }
});

test('conversion : pas deux fois la même ligne dans un tableau', () => {
    for (const item of tables({ famille: 'masse', lignes: 6 })) {
        const vues = item.meta.conversions.map(c => c.enonce);
        assert.equal(new Set(vues).size, vues.length, vues.join(' | '));
    }
});
