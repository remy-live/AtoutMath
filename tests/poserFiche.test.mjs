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
import { decimales, enFrancais } from '../js/core/poser.js';

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

// --- LES NOMBRES À VIRGULE ---------------------------------------------------
//
// Rémy : « la multiplication posée à décimales n'existe pas sur le papier —
// oui fais-le ». Elle n'existait pour aucune des quatre opérations : le noyau
// savait poser une virgule depuis toujours, c'est le TIRAGE de la fiche qui ne
// produisait que des entiers, et son DESSIN qui rangeait « 12.5 » en quatre
// cases dont une contenant un point.

/** L'opération exacte, faite en entiers : 94,8 + 15,9 n'est pas 110,69999… */
const exact = (op, ops) => {
    const d = Math.max(...ops.map(decimales));
    const e = ops.map(v => Math.round(v * Math.pow(10, d)));
    const r = op === '+' ? e.reduce((s, x) => s + x, 0) : e[0] - e[1];
    return r / Math.pow(10, d);
};

test('ON DEMANDE DES VIRGULES, ON EN OBTIENT — et sinon, aucune', () => {
    for (const op of ['+', '-', '×']) {
        // Sans réglage : que des entiers, comme avant.
        for (const it of tirer({ operation: op, chiffres: 3 }, 25)) {
            assert.ok(it.meta.operandes.every(v => Number.isInteger(v)),
                `${op} sans réglage : ${it.meta.texte}`);
        }
        // Avec : chaque opération en porte au moins une. Une décimale qui
        // s'évapore — 880 / 10 s'écrit « 88 » — rendait le réglage muet.
        for (const d of [1, 2]) {
            for (const it of tirer({ operation: op, chiffres: 4, decimales: d }, 25)) {
                assert.ok(it.meta.operandes.some(v => decimales(v) > 0),
                    `${op} à ${d} décimale(s) : ${it.meta.texte} n'en porte aucune`);
                assert.ok(it.meta.operandes.every(v => decimales(v) <= d),
                    `${op} : ${it.meta.texte} dépasse ${d} décimale(s)`);
            }
        }
    }
});

test('LES DEUX NOMBRES N\'ONT PAS LE MÊME NOMBRE DE DÉCIMALES — c\'est l\'exercice', () => {
    // « 12,50 + 3,75 » est la même opération avec la difficulté effacée
    // d'avance : l'élève qui aligne sur le bord droit trouve juste. Seul
    // « 12,5 + 3,75 » apprend quelque chose.
    for (const op of ['+', '-', '×']) {
        const tirages = tirer({ operation: op, chiffres: 4, decimales: 2 }, 40);
        const differents = tirages.filter(it => {
            const d = it.meta.operandes.map(decimales);
            return new Set(d).size > 1;
        });
        assert.ok(differents.length >= 10,
            `${op} : seulement ${differents.length} tirages sur 40 opposent deux rangs`);
    }
});

test('la réponse reste juste avec des virgules — sans flottant qui bave', () => {
    for (const op of ['+', '-']) {
        for (const it of tirer({ operation: op, chiffres: 4, decimales: 2 }, 30)) {
            assert.equal(it.answer, exact(op, it.meta.operandes), it.meta.texte);
            // Et rien qui ressemble à 0,30000000000000004 sur la feuille.
            assert.ok(decimales(it.answer) <= 2, `${it.meta.texte} = ${it.answer}`);
        }
    }
});

test('LA MULTIPLICATION COMPTE LES DÉCIMALES DES DEUX FACTEURS — la règle du chapitre', () => {
    for (const it of tirer({ operation: '×', chiffres: 4, decimales: 2 }, 40)) {
        const [a, b] = it.meta.operandes;
        const t = it.meta.table;
        // On multiplie comme si de rien n'était…
        assert.equal(t.produitEntier, t.entiers[0] * t.entiers[1], it.meta.texte);
        // … et la virgule se place à la fin.
        assert.equal(t.decimales, decimales(a) + decimales(b), it.meta.texte);
        assert.equal(it.answer, t.produitEntier / Math.pow(10, t.decimales), it.meta.texte);
    }
});

test('ON NE POSE JAMAIS UNE DIVISION PAR UN DÉCIMAL', () => {
    // À l'école, on commence par déplacer la virgule des DEUX nombres : c'est
    // un autre chapitre, et le noyau refuse à juste titre de le poser.
    for (const j of ['reste', 'dividende', 'centieme']) {
        for (const it of tirer({ operation: '÷', chiffres: 3, jusquOu: j }, 25)) {
            assert.ok(Number.isInteger(it.meta.operandes[1]),
                `${j} : diviseur décimal dans « ${it.meta.texte} »`);
        }
    }
});

test('« dividende à virgule » : la virgule descend, et la division tombe juste', () => {
    for (const it of tirer({ operation: '÷', chiffres: 3, jusquOu: 'dividende' }, 30)) {
        const [a, b] = it.meta.operandes;
        assert.ok(decimales(a) > 0, `pas de virgule au dividende : ${it.meta.texte}`);
        assert.equal(it.meta.table.exacte, true, `${it.meta.texte} laisse un reste`);
        assert.equal(Math.round(it.answer * b * 10) / 10, a, it.meta.texte);
    }
});

test('« poursuivre au centième » : deux décimales, un quotient APPROCHÉ, jamais un reste', () => {
    for (const it of tirer({ operation: '÷', chiffres: 3, jusquOu: 'centieme' }, 30)) {
        const t = it.meta.table;
        // Poursuivre une division qui tombe juste n'a aucun sens : on en force
        // une qui ne tombe pas.
        assert.ok(decimales(it.answer) > 0, `${it.meta.texte} tombe juste`);
        assert.ok(decimales(it.answer) <= 2, `${it.meta.texte} dépasse le centième`);
        assert.equal(t.decimalesQuotient, 2, it.meta.texte);
        // La réponse se dit « ≈ » quand la division ne tombe toujours pas
        // juste au centième, et « = » quand elle tombe avant — 83 ÷ 2 vaut
        // 41,5, pas « environ ». Ce qu'on n'écrit JAMAIS ici, c'est un reste :
        // mélanger les deux façons de répondre est justement la confusion
        // qu'on cherche à éviter en classe.
        assert.equal(/^≈ /.test(it.meta.reponse), !t.exacte, it.meta.reponse);
        assert.ok(!/reste/.test(it.meta.reponse), it.meta.reponse);
    }
});

test('UNE FEUILLE FRANÇAISE ÉCRIT DES VIRGULES, pas des points', () => {
    // `String(12.5)` donne un point, et un point sur une feuille de
    // mathématiques française est une autre notation, que l'élève n'a jamais vue.
    for (const op of ['+', '-', '×', '÷']) {
        for (const it of tirer({ operation: op, chiffres: 4, decimales: 2, jusquOu: 'centieme' }, 20)) {
            assert.ok(!it.meta.texte.includes('.'), it.meta.texte);
            assert.ok(!it.meta.reponse.includes('.'), it.meta.reponse);
            assert.ok(!it.prompt.papier.includes('.'), it.prompt.papier);
        }
    }
    assert.equal(enFrancais(12.5), '12,5');
    assert.equal(enFrancais(12), '12');
});

test('les réglages de l\'écran valent aussi pour la feuille', () => {
    // La case à cocher « Nombres à virgule » de l'écran vaut une décimale…
    for (const it of tirer({ operation: '+', chiffres: 3, decimales: true }, 20)) {
        assert.ok(it.meta.operandes.some(v => decimales(v) === 1), it.meta.texte);
    }
    // … et « Quotient décimal » de la division commande le même exercice que
    // « poursuivre au centième », sans qu'on ait à le redire.
    for (const it of tirer({ operation: '÷', chiffres: 3, decimalesQuotient: 2 }, 20)) {
        assert.equal(it.meta.table.decimalesQuotient, 2, it.meta.texte);
    }
});
