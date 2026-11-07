// LES DEUX OUTILS QUI RÉÉCRIVENT DES FICHIERS DOIVENT ÉCRIRE CE QU'ON LEUR DIT.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// `tools/remplacer.mjs` retouche le code ; `tools/epreuveTombe.mjs` y remet un
// défaut pour voir une garde tomber. Les deux font la même chose — échanger un
// texte contre un autre — et les deux tombent dans le même piège.
//
// LE PIÈGE : `String.replace` INTERPRÈTE LE TEXTE DE REMPLACEMENT.
//
//   'abc'.replace('b', '$&')   →  'abc'      et non 'a$&c'
//
// `$&`, `` $` ``, `$'` et `$1` y sont des commandes. Le code de ce dépôt en
// contient — toute ligne qui échappe une expression régulière s'écrit
// `.replace(/…/g, '\\$&')` —, si bien qu'un défaut qui en porte était écrit
// AUTREMENT qu'on ne l'avait demandé.
//
// CE QUE CELA COÛTE, et c'est le 22 octobre qui l'a montré : `epreuveTombe`
// annonçait « l'épreuve RESTE VERTE quand on remet le défaut » sur une garde
// qui tombait parfaitement dès qu'on remettait le défaut à la main. C'est le
// verdict qui fait jeter une garde saine — rendu par l'outil dont tout le dépôt
// dépend pour croire ses gardes.
//
// ── POURQUOI ON RELIT LA SOURCE PLUTÔT QUE DE LANCER LES OUTILS ────────────
//
// Les deux écrivent sur le disque et lisent `process.argv` : les éprouver « en
// vrai » demanderait de leur fabriquer un dépôt. Ce qu'on garde ici est la
// LIGNE qui échange le texte — et, à côté, une démonstration du piège qui ne
// dépend d'aucun fichier. Si quelqu'un réécrit cette ligne avec un `replace`
// nu, l'épreuve tombe, et le commentaire au-dessus dit pourquoi.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sansCommentaires } from './helpers.mjs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('LE PIÈGE EXISTE — on le montre avant de s\'en garder', () => {
    // SANS CETTE DÉMONSTRATION, les deux épreuves suivantes gardent une ligne
    // dont plus personne ne sait pourquoi elle est écrite ainsi — et la
    // première réécriture « plus simple » la perdra.
    const source = 'const x = y.replace(/a/g, 1);';
    const vieux = 'y.replace(/a/g, 1)';
    const neuf = "z.replace(/b/g, '\\\\$&')";

    assert.notEqual(source.replace(vieux, neuf), 'const x = ' + neuf + ';',
        'si `replace` cessait d\'interpréter $&, ces gardes ne garderaient rien');
    assert.ok(source.replace(vieux, neuf).includes('y.replace(/a/g, 1)'),
        '`$&` doit bien se changer en l\'ancien texte — c\'est le défaut');

    // LES DEUX FAÇONS SÛRES, et ce sont celles qu'emploient les outils.
    assert.equal(source.replace(vieux, () => neuf), 'const x = ' + neuf + ';');
    assert.equal(source.split(vieux).join(neuf), 'const x = ' + neuf + ';');
});

test('`epreuveTombe` ÉCRIT LE DÉFAUT QU\'ON LUI DONNE', () => {
    const E = sansCommentaires(lire('tools/epreuveTombe.mjs'));
    assert.match(E, /\.replace\(vieux, \(\) => neuf\)/,
        'le défaut doit passer par une FONCTION de remplacement');
    assert.ok(!/\.replace\(vieux, neuf\)/.test(E),
        'un remplacement nu réécrit $& et fait mentir le verdict');
});

test('`remplacer` ÉCRIT LE TEXTE QU\'ON LUI DONNE', () => {
    const R = sansCommentaires(lire('tools/remplacer.mjs'));
    // Celui-ci était déjà à l'abri, et c'est pour cette raison-là : un
    // `split().join()` ne connaît pas les substitutions.
    assert.match(R, /apres = apres\.split\(vieux\)\.join\(neuf\)/);
    assert.ok(!/apres\.replace\(vieux, neuf\)/.test(R));
});
