// LES QUATRE SORTES DE MORCEAUX, ET LEURS TROIS LECTEURS.
//
// `morceauxLigne` découpe une ligne d'énoncé en morceaux qui ne se dessinent
// pas pareil : du TEXTE, une FRACTION à deux étages, un « ≈ », un π, un bloc
// d'EXPOSANTS. Trois lecteurs s'en servent — l'aperçu (`ligneHtml`), le PDF
// (`dessinerLigne`) et le texte enrichi (`texteRiche`).
//
// LE MODE DE PANNE EST TOUJOURS LE MÊME, et il a frappé deux fois.
//
// On ajoute une sorte de morceau, on met à jour le lecteur qu'on avait sous la
// main, et l'on oublie les autres. Le lecteur oublié ne PLANTE pas : il fait
// tomber le morceau inconnu dans sa dernière branche — celle des fractions — où
// `m.num` et `m.den` n'existent pas. La feuille affiche alors
// « undefined/undefined », et cela ne se voit que sur l'écran d'un élève.
//
// Rémy l'a signalé deux fois : « souci de undefined », puis, capture à l'appui,
// « j'ai toujours le bug » — la première fois dans le PDF, la seconde dans
// l'aperçu. Ce fichier est là pour qu'il n'ait pas à le signaler une troisième.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import './helpers.mjs';
import { morceauxLigne, apercuItems } from '../js/ui/ficheRendu.js';

const LIGNES = {
    'un exposant':        '3a² + 2a² =',
    'une puissance':      'Combien vaut 10⁴ ?',
    'un π':               'Aire : 25π cm²',
    'une fraction':       '5/7 + 2/3 =',
    'un presque égal':    'x² ≈ 9',
    'tout à la fois':     '25π/4 ≈ 19,6 et 10⁻³ =',
};

test('LE DÉCOUPAGE RECONNAÎT CHAQUE SORTE POUR CE QU\'ELLE EST', () => {
    const kinds = (l) => morceauxLigne(l, true).map(m =>
        m.texte !== undefined ? 'texte'
            : m.presque ? 'presque'
                : m.pi ? 'pi'
                    : m.haut ? 'haut'
                        : 'fraction');

    assert.ok(kinds('3a² + 2a² =').includes('haut'), 'un exposant doit être un exposant');
    assert.ok(!kinds('3a² + 2a² =').includes('fraction'), 'et JAMAIS une fraction');
    assert.ok(kinds('25π cm').includes('pi'));
    assert.ok(kinds('5/7').includes('fraction'), 'une vraie fraction reste une fraction');
    assert.ok(kinds('x ≈ 9').includes('presque'));

    // Et les deux étages d'une vraie fraction sont bien remplis.
    const frac = morceauxLigne('5/7', true).find(m => m.num !== undefined);
    assert.deepEqual([frac.num, frac.den], ['5', '7']);
});

test('L\'APERÇU NE PRODUIT JAMAIS « undefined » — le bug de Rémy', () => {
    for (const [quoi, ligne] of Object.entries(LIGNES)) {
        const page = { items: [{ type: 'q', num: 1, lignes: [ligne],
            texteW: 300, x: 0, y: 0, h: 24, fractions: true }] };
        const html = apercuItems(page, 1, { taille: 11, fractions: true });
        assert.ok(!html.includes('undefined'),
            `${quoi} (« ${ligne} ») sort en undefined dans l'aperçu`);
    }
});

test('L\'APERÇU ÉCRIT π ET LES EXPOSANTS, il ne les efface pas', () => {
    const page = { items: [{ type: 'q', num: 1, lignes: ['Aire : 25π cm² et 10⁴'],
        texteW: 300, x: 0, y: 0, h: 24, fractions: true }] };
    const html = apercuItems(page, 1, { taille: 11, fractions: true });
    assert.match(html, /&#960;|π/, 'le π doit s\'écrire');
    assert.match(html, /<sup/, 'les exposants doivent monter');
    assert.match(html, />2</, 'le carré de « cm² » doit rester un 2');
    assert.match(html, />4</, 'et la puissance 4 un 4');
});

test('LES TROIS LECTEURS CONNAISSENT LES QUATRE SORTES', () => {
    // La garde de fond : un lecteur qui ignore une sorte la fera tomber dans sa
    // branche par défaut, en silence. On vérifie donc que chacun les NOMME.
    const src = fs.readFileSync('js/ui/ficheRendu.js', 'utf8');
    const lecteurs = {
        'ligneHtml':     src.slice(src.indexOf('function ligneHtml'), src.indexOf('const EXPOSANTS_HAUT')),
        'dessinerLigne': src.slice(src.indexOf('function dessinerLigne'), src.indexOf('function ligneHtml')),
        'texteRiche':    src.slice(src.indexOf('export function texteRiche'), src.indexOf('function dessinerLigne')),
    };
    for (const [nom, corps] of Object.entries(lecteurs)) {
        assert.ok(corps.length > 100, `${nom} : découpage du fichier raté`);
        for (const sorte of ['m.pi', 'm.haut', 'm.texte']) {
            assert.ok(corps.includes(sorte),
                `${nom} ne sait pas quoi faire d'un morceau « ${sorte} » — il le prendra pour une fraction`);
        }
    }
});
