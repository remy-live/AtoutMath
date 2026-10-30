// LE CARNET D'ERREURS DES DEUX EXERCICES DE TRANSFORMATION.
//
// RÉMY, deux captures à l'appui : « deux explications compliqués et fausses.
// C'est dans le "Mes erreurs" ».
//
//     Par rapport à quoi la pièce B est-elle le symétrique de la pièce C ?
//     — ta réponse : axe:v:8.5, attendu : axe:v:5.5
//
//     Colorie l'image de la figure bleue par la translation que montre la
//     flèche rouge. — ta réponse : 7|3/8|3/7|4/8|4/8|5,
//     attendu : 8|2/9|2/8|3/9|3/9|4 · 1 case juste, 4 oubliées, 4 en trop.
//
// DEUX GRIEFS, ET LE SECOND EST LE PLUS GRAVE. Les chaînes sont les formes
// CANONIQUES, celles qui jugent : illisibles, d'accord — mais surtout, leurs
// NOMBRES NE SONT PAS CEUX DE L'ÉLÈVE. `axe:v:8.5` désigne la droite que la
// figure nomme « (d₁) x = 9 », et `point:5.5:3.5` celle qu'elle nomme
// « O₁ (6 ; 6) » : l'ordonnée n'est pas décalée d'un demi, elle est retournée.
//
// CE QUI SE MESURE AILLEURS. `tools/carnetDesTransformations.mjs` imprime les
// phrases côte à côte, et `tools/carteDuCarnet.mjs` joue faux dans un vrai
// navigateur puis photographie la carte : lui seul prouve que le texte ARRIVE
// jusqu'à l'écran. Ici on garde les règles qui se défont en silence.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { readFileSync } from 'node:fs';
import { makeRng } from '../js/core/ids.js';
import {
    cleFigure, comparer, decalageEntre, direLeDecalage
} from '../js/core/transformations.js';
import {
    direLesCases, imageAttendue, transfoQuadrillageGenerator as QUAD
} from '../js/core/generators/transfoQuadrillage.js';
import { cleElement, direElement, ecrireElement } from '../js/core/elementSymetrie.js';
import { pavageGenerator } from '../js/core/generators/pavage.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

// ─────────────────────────────── LA MÊME FIGURE, POSÉE AILLEURS ─────────────

const lireCases = (s) => s.split('/').map(c => {
    const [x, y] = c.split('|').map(Number);
    return { x, y };
});

test('LE DÉCALAGE DE LA CAPTURE DE RÉMY SE RETROUVE', () => {
    // Ses deux chaînes, telles qu'elles étaient sur la carte. Son élève avait
    // colorié LA BONNE FIGURE, un carreau trop à gauche et un carreau trop bas.
    const sienne = lireCases('7|3/8|3/7|4/8|4/8|5');
    const voulue = lireCases('8|2/9|2/8|3/9|3/9|4');
    assert.deepEqual(decalageEntre(voulue, sienne), { dx: -1, dy: 1 });
    // ET LE COMPTE DE CASES, LUI, NE VOIT RIEN : c'est pour cela que la phrase
    // était fausse sans être inexacte.
    const bilan = comparer(voulue, sienne);
    assert.equal(bilan.justes, 1);
    assert.equal(bilan.oublies.length, 4);
    assert.equal(bilan.enTrop.length, 4);
});

test('un dessin qui n\'est pas un glissement ne se dit pas décalé', () => {
    const a = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }];
    // Une case déplacée toute seule : la forme a changé, il n'y a pas d'écart
    // à annoncer, et l'inventer serait pire que le compte de cases.
    assert.equal(decalageEntre(a, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 1 }]), null);
    // Une figure retournée n'est pas une figure glissée.
    assert.equal(decalageEntre(a, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }]), null);
    // Pas le même nombre de cases : on ne compare pas.
    assert.equal(decalageEntre(a, [{ x: 0, y: 0 }]), null);
    // ET LA MÊME FIGURE À LA MÊME PLACE N'EST PAS « DÉCALÉE DE ZÉRO » : il n'y
    // a rien à dire sur sa place, et « posée 0 carreau trop à gauche » serait
    // une phrase absurde sous une réponse fausse.
    assert.equal(decalageEntre(a, a.slice()), null);
});

test('L\'ÉCART SE DIT COMME UNE FAUTE, PAS COMME UNE CONSIGNE', () => {
    assert.equal(direLeDecalage({ dx: -1, dy: 1 }), '1 carreau trop à gauche et 1 trop bas');
    assert.equal(direLeDecalage({ dx: 3, dy: -2 }), '3 carreaux trop à droite et 2 trop haut');
    assert.equal(direLeDecalage({ dx: 0, dy: -1 }), '1 trop haut');
});

// ──────────────────────────── LES CASES, DITES COMME ON LES DÉSIGNE ─────────

test('LES CASES SE COMPTENT À PARTIR DE 1, EN COLONNE PUIS LIGNE', () => {
    // La case d'indice (7 ; 3) est la huitième colonne, la quatrième ligne —
    // c'est ce que le quadrillage annonce lui-même aux lecteurs d'écran
    // (« Colonne 8, ligne 4 »), et ce que la correction écrit déjà.
    assert.equal(direLesCases(lireCases('7|3')), '(8 ; 4)');
    assert.equal(direLesCases(lireCases('8|2/9|2/8|3')), '(9 ; 3), (10 ; 3), (9 ; 4)');
    // RANGÉES DANS LE SENS DE LA LECTURE, quel que soit l'ordre des clics : la
    // carte du carnet ne doit pas dépendre de la main de l'élève.
    assert.equal(direLesCases([{ x: 5, y: 2 }, { x: 1, y: 0 }]), '(2 ; 1), (6 ; 3)');
    assert.equal(direLesCases([]), '');
});

test('ET LA CORRECTION COMPTE COMME LE CARNET — une seule vérité', () => {
    // Si l'explication et la carte comptaient les colonnes autrement l'une de
    // l'autre, l'une des deux mentirait, et l'on ne saurait pas laquelle.
    const item = QUAD.generate({ genres: ['translation'], taille: 'moyen' },
        { rng: makeRng('une-verite'), index: 0 });
    const dites = direLesCases(imageAttendue(item.meta));
    assert.ok(item.explanation.includes(dites),
        `l'explication « ${item.explanation} » devrait contenir « ${dites} »`);
});

// ─────────────────────── L'ÉLÉMENT DE SYMÉTRIE, DIT POUR ÊTRE LU ────────────

test('L\'ÉLÉMENT SE DIT AVEC LE NOMBRE QUE L\'ÉLÈVE LIT', () => {
    const h = 10;
    // En coordonnées de CASE, `axe:v:8.5` ; dans le repère de l'élève, x = 9.
    const droite = { genre: 'axe', axe: { type: 'v', a: 8.5 } };
    assert.equal(cleElement(droite), 'axe:v:8.5');
    assert.equal(direElement(h, droite, []), 'x = 9');
    // Et pour un point, l'ordonnée n'est pas décalée d'un demi : elle est
    // RETOURNÉE. C'est le défaut que la carte montrait sans le dire.
    const centre = { genre: 'point', centre: { x: 5.5, y: 3.5 } };
    assert.equal(cleElement(centre), 'point:5.5:3.5');
    assert.equal(direElement(h, centre, []), '(6 ; 6)');
    // LA PHRASE EST CELLE DE `ecrireElement` — celle que la bulle de l'exercice
    // affiche déjà au survol de chaque droite. Deux écritures de la même droite
    // finiraient par diverger.
    assert.equal(direElement(h, droite, []), ecrireElement(h, droite));
});

test('ET ELLE NOMME LE CANDIDAT QUAND IL EST SUR LE DESSIN', () => {
    const h = 10;
    const droite = { genre: 'axe', axe: { type: 'v', a: 8.5 } };
    const candidats = [
        { genre: 'axe', axe: { type: 'v', a: 8.5 }, nom: '(d₁)' },
        { genre: 'axe', axe: { type: 'v', a: 5.5 }, nom: '(d₄)' }
    ];
    assert.equal(direElement(h, droite, candidats), '(d₁) x = 9');
    // La carte du carnet refabrique la figure depuis la graine, et cette figure
    // porte les noms : « (d₁) x = 9 » se retrouve donc à l'œil, ce que « x = 9 »
    // seul ne permet pas sur un quadrillage qui porte quatre droites.
    assert.equal(direElement(h, candidats[1], candidats), '(d₄) x = 6');
    // UNE RÉPONSE ÉCRITE QUI NE DÉSIGNE AUCUN CANDIDAT N'A PAS DE NOM : on
    // n'en invente pas, et elle s'écrit toute seule.
    assert.equal(direElement(h, { genre: 'axe', axe: { type: 'v', a: 2.5 } }, candidats), 'x = 3');
    assert.equal(direElement(h, null, candidats), '');
});

test('sur un vrai item, la carte dit ce que la figure porte', () => {
    const item = pavageGenerator.generate({ taille: 'moyen' }, { rng: makeRng('carte') });
    const m = item.meta;
    const juste = m.candidats.find(c => c.id === m.idJuste);
    const phrase = direElement(m.hauteur, m.bon, m.candidats);
    assert.ok(phrase.startsWith(juste.nom), `« ${phrase} » devrait commencer par ${juste.nom}`);
    assert.ok(phrase.includes(ecrireElement(m.hauteur, m.bon)));
    // ET SURTOUT : plus aucune trace de la forme qui juge.
    assert.ok(!/axe:|point:/.test(phrase), phrase);
    assert.ok(/axe:|point:/.test(item.answer), 'la forme canonique, elle, ne change pas');
});

// ────────────────── CE QUE LES DEUX ACTIVITÉS ENVOIENT AU JOURNAL ───────────
//
// Le texte est juste, encore faut-il qu'il PARTE. `opts.dire` est la seule
// porte entre une activité et le carnet (voir `core/itemSession.js`) : sans
// elle, c'est la clé canonique qui voyage, et c'est exactement la capture de
// Rémy. Ces deux règles ne se voient pas tomber autrement qu'en relisant la
// source — une épreuve d'unité ne monte pas une activité.

test('« TRACER L\'IMAGE » ENVOIE LES CASES EN FRANÇAIS', () => {
    const src = lire('js/core/activities/quadrillage.js');
    assert.match(src, /dire: \{ given: direLesCases\(posees\), expected: direLesCases\(attendue\) \}/);
    // ET LE DIAGNOSTIC REGARDE LA FORME AVANT DE COMPTER LES CASES.
    assert.match(src, /const glisse = decalageEntre\(attendue, posees\);/);
    assert.match(src, /Ta figure a la bonne forme/);
});

test('« PAR RAPPORT À QUOI ? » ENVOIE L\'ÉLÉMENT EN FRANÇAIS', () => {
    const src = lire('js/core/activities/symetrieElement.js');
    assert.match(src, /given: direElement\(m\.hauteur, donne, m\.candidats\)/);
    assert.match(src, /expected: direElement\(m\.hauteur, m\.bon, m\.candidats\)/);
    // LES DEUX CHAMPS VOYAGENT ENSEMBLE OU PAS DU TOUT : sans réponse lisible,
    // le carnet comparerait une phrase à une clé.
    assert.match(src, /dire: donne \? \{/);
});

test('et la forme qui JUGE n\'a pas changé', () => {
    // On a ajouté une seconde écriture, on n'a pas touché à la première : toute
    // la correction, tout le carnet déjà enregistré et toutes les épreuves en
    // dépendent.
    assert.equal(cleFigure([{ x: 8, y: 2 }, { x: 9, y: 2 }]), '8|2/9|2');
    assert.equal(cleElement({ genre: 'axe', axe: { type: 'h', a: 3.5 } }), 'axe:h:3.5');
});
