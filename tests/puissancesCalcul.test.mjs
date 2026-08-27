// CALCULER AVEC DES PUISSANCES — les trois règles, et leur raison.
//
// Rémy : « calculer avec des puissances ». Sa fiche y consacre une page, avec
// la même consigne en rouge à chaque exercice : « TU ÉCRIRAS LE CALCUL ! » Ce
// que ces tests gardent, c'est la faute universelle du chapitre — multiplier
// les exposants dans un produit, parce que le signe × est écrit sous les yeux
// de l'élève.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { puissanceTexte } from '../js/core/puissances.js';
import {
    ETAPES, ORDRE, puissance, puissanceCalcul, marchePour, puissancesCalculGenerator as G
} from '../js/core/generators/puissancesCalcul.js';

const item = (params = {}, index = 0, cle = 'pc') =>
    G.generate(params, { rng: makeRng(`${cle}-${index}`), index });

/** L'exposant d'une écriture « 10⁵ » ou « 2³ », relu depuis la chaîne. */
const HAUT = '⁰¹²³⁴⁵⁶⁷⁸⁹';
function exposantDe(texte) {
    const s = String(texte);
    let n = '', signe = 1;
    for (const c of s) {
        if (c === '⁻') signe = -1;
        else if (HAUT.includes(c)) n += String(HAUT.indexOf(c));
    }
    return n === '' ? null : signe * Number(n);
}

// --- L'écriture ---------------------------------------------------------------

test('une puissance s\'écrit avec un VRAI exposant, lisible partout', () => {
    assert.equal(puissance(2, 5), '2⁵');
    assert.equal(puissance(10, 12), '10¹²');
    assert.equal(puissance(10, -3), '10⁻³');
    // « TU ÉCRIRAS LE CALCUL ! » : l'exposant lui-même s'écrit comme un calcul.
    assert.equal(puissanceCalcul(10, 3, '+', 2), '10³⁺²');
    assert.equal(puissanceCalcul(10, 8, '-', 3), '10⁸⁻³');
});

test('la relecture d\'un exposant est fidèle — c\'est l\'outil des tests suivants', () => {
    assert.equal(exposantDe('10⁵'), 5);
    assert.equal(exposantDe('10⁻⁷'), -7);
    assert.equal(exposantDe('2¹²'), 12);
});

// --- Les trois règles -----------------------------------------------------------

test('LE PRODUIT AJOUTE LES EXPOSANTS', () => {
    for (let i = 0; i < 20; i++) {
        const it = item({ etape: 'produit' }, i);
        const [a, b] = it.prompt.papier.split(' × ').map(exposantDe);
        assert.equal(exposantDe(it.answer), a + b, it.prompt.papier);
        assert.match(it.explanation, /AJOUTE/);
    }
});

test('LE QUOTIENT SOUSTRAIT LES EXPOSANTS', () => {
    for (let i = 0; i < 20; i++) {
        const it = item({ etape: 'quotient' }, i);
        const [a, b] = it.prompt.papier.split(' ÷ ').map(exposantDe);
        assert.equal(exposantDe(it.answer), a - b, it.prompt.papier);
        assert.match(it.explanation, /SOUSTRAIT/);
    }
});

test('LA PUISSANCE DE PUISSANCE MULTIPLIE LES EXPOSANTS', () => {
    for (let i = 0; i < 20; i++) {
        const it = item({ etape: 'puissanceDePuissance' }, i);
        // « (10⁴)³ » : le premier exposant est dans la parenthèse, le second
        // dehors — la relecture les concatène, on découpe donc à la fermante.
        const [dedans, dehors] = it.prompt.papier.split(')');
        assert.equal(exposantDe(it.answer), exposantDe(dedans) * exposantDe(dehors),
            it.prompt.papier);
        assert.match(it.explanation, /MULTIPLIE/);
    }
});

test('LES EXPOSANTS NÉGATIFS N\'AJOUTENT AUCUNE RÈGLE', () => {
    // Ils ne font qu'appliquer les mêmes avec des relatifs.
    for (let i = 0; i < 20; i++) {
        const p = item({ etape: 'produitRelatif' }, i);
        const [a, b] = p.prompt.papier.split(' × ').map(exposantDe);
        assert.equal(exposantDe(p.answer), a + b, p.prompt.papier);
        assert.ok(a < 0 || b < 0, `${p.prompt.papier} n'a aucun exposant négatif`);

        const q = item({ etape: 'quotientRelatif' }, i);
        const [c, d] = q.prompt.papier.split(' ÷ ').map(exposantDe);
        assert.equal(exposantDe(q.answer), c - d, q.prompt.papier);
        assert.ok(c < 0 && d < 0, `${q.prompt.papier} devrait avoir deux exposants négatifs`);
    }
});

test('L\'INVERSE CHANGE LE SIGNE DE L\'EXPOSANT', () => {
    for (let i = 0; i < 15; i++) {
        const it = item({ etape: 'inverse' }, i);
        // ET L'ÉNONCÉ NE PORTE PAS DE BARRE OBLIQUE. Sur le papier, une
        // fraction s'écrit en colonne : « 1 / 10⁴ » enseignerait le contraire
        // du cours. On dit « l'inverse de », qui est le mot du chapitre.
        assert.ok(!/\d\s*\/\s*\d/.test(it.prompt.papier), it.prompt.papier);
        assert.match(it.prompt.papier, /inverse/i);
        const depart = exposantDe(it.prompt.papier);
        assert.equal(exposantDe(it.answer), -depart, it.prompt.papier);
    }
});

// --- Les fautes du chapitre -----------------------------------------------------

test('LA FAUTE UNIVERSELLE EST TOUJOURS PROPOSÉE : multiplier les exposants', () => {
    // Elle n'est pas de l'étourderie : le signe × est écrit sous les yeux de
    // l'élève, et il l'applique à ce qu'il voit. Le distracteur doit donc être
    // là à chaque question du produit, et son explication doit le NOMMER.
    for (let i = 0; i < 20; i++) {
        const it = item({ etape: 'produit' }, i);
        const [a, b] = it.prompt.papier.split(' × ').map(exposantDe);
        if (a * b === a + b) continue;           // 2² × 2² : les deux coïncident
        const piege = it.choices.find(c => exposantDe(c.value) === a * b);
        assert.ok(piege, `${it.prompt.papier} : ${puissanceTexte(a * b)} n'est pas proposé`);
        assert.match(piege.why, /AJOUTE/);
    }
});

test('(−3)² ET −3² : la parenthèse décide, et le piège le dit', () => {
    let avec = 0, sans = 0;
    for (let i = 0; i < 30; i++) {
        const it = item({ etape: 'carreNegatif' }, i);
        const parenthese = it.prompt.papier.startsWith('(');
        if (parenthese) { avec++; assert.ok(it.answer > 0, it.prompt.papier); }
        else { sans++; assert.ok(it.answer < 0, it.prompt.papier); }
        // L'opposé est toujours proposé : c'est LA faute.
        const oppose = it.choices.find(c => c.value === -it.answer);
        assert.ok(oppose, `${it.prompt.papier} : l'opposé n'est pas proposé`);
        assert.match(oppose.why, /parenthèse|Sans parenthèse/i);
        // Et les étiquettes portent le vrai signe moins.
        it.choices.forEach(c => assert.ok(!String(c.label).includes('-'),
            `étiquette au trait d'union : ${c.label}`));
    }
    assert.ok(avec >= 5 && sans >= 5, `les deux écritures doivent tomber : ${avec} / ${sans}`);
});

test('IL FAUT LA MÊME BASE — et la question dont la réponse est « on ne peut pas »', () => {
    // 2³ × 5³ ne se met pas sous la forme d'une seule puissance : la règle
    // compte des facteurs ÉGAUX. Sans cette marche, l'élève ajoute les
    // exposants partout — et d'autant plus volontiers qu'ils sont ici les mêmes.
    let impossibles = 0, possibles = 0;
    for (let i = 0; i < 30; i++) {
        const it = item({ etape: 'memeBase' }, i);
        const [g, d] = it.prompt.papier.replace(' = ', '').split(' × ');
        const memes = g[0] === d[0];
        if (memes) {
            possibles++;
            assert.equal(exposantDe(it.answer), exposantDe(g) + exposantDe(d), it.prompt.papier);
        } else {
            impossibles++;
            assert.equal(it.answer, 'On ne peut pas simplifier', it.prompt.papier);
            assert.match(it.explanation, /DIFFÉRENTES/);
        }
    }
    assert.ok(impossibles >= 5 && possibles >= 5,
        `les deux cas doivent tomber : ${impossibles} impossibles, ${possibles} possibles`);
});

// --- La progression ---------------------------------------------------------------

test('NEUF MARCHES, EN TROIS TEMPS, et le sens des règles arrive avant les règles', () => {
    assert.equal(ORDRE.length, 9);
    assert.deepEqual(ETAPES.slice(0, 2).map(e => e.temps), ['A', 'A']);
    assert.equal(ETAPES[0].id, 'valeur', 'on installe ce QU\'EST une puissance en premier');
    ETAPES.forEach((e, i) => assert.equal(e.rang, i + 1, `${e.id} mal rangé`));
    ['A', 'B', 'C'].forEach(t => {
        const liste = ETAPES.filter(e => e.temps === t).map(e => e.id);
        for (let i = 0; i < 12; i++) {
            assert.ok(liste.includes(marchePour(t, i)), `le temps ${t} sort de ses marches`);
        }
    });
});

test('CHAQUE QUESTION A QUATRE PROPOSITIONS, TOUTES DIFFÉRENTES', () => {
    // Les fautes se rejoignent d'elles-mêmes : pour 10² × 10², ajouter et
    // multiplier les exposants donnent tous deux 10⁴.
    for (let i = 0; i < 150; i++) {
        const it = item({}, i);
        assert.equal(it.choices.length, 4, `question ${i} : ${it.choices.length} propositions`);
        const vues = it.choices.map(c => String(c.value));
        assert.equal(new Set(vues).size, 4, `question ${i} : deux propositions identiques`);
        assert.equal(it.choices.find(c => c.correct).value, it.answer);
    }
});

test('un item porte tout ce qu\'il faut pour jouer, corriger et imprimer', () => {
    for (let i = 0; i < 27; i++) {
        const it = item({}, i);
        assert.equal(it.skillId, 'num.puissances.regles');
        assert.ok(it.prompt.papier && it.prompt.papier.length > 2, 'rien à imprimer');
        assert.ok(!/<[a-z]/i.test(it.prompt.papier), 'du HTML sur la feuille');
        assert.ok(!/\d\s*\/\s*\d/.test(it.prompt.papier), 'une barre de fraction sur la feuille');
        assert.ok(it.explanation.length > 20, 'corrigé muet');
        assert.ok(it.hints.length >= 1, 'pas d\'indice');
    }
});

test('la même graine rend la même question', () => {
    const a = G.generate({}, { rng: makeRng('rejeu'), index: 13 });
    const b = G.generate({}, { rng: makeRng('rejeu'), index: 13 });
    assert.equal(a.prompt.text, b.prompt.text);
    assert.equal(a.answer, b.answer);
});
