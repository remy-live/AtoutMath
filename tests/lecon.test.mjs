// LA LEÇON MISE EN PAGE — et la seule chose qu'on ne peut pas se permettre.
//
// Rémy, capture d'un téléphone à l'appui : « quand tu vois l'explication, ça
// donne pas envie de lire, il faut une belle mise en page, du retour à la
// ligne, de la couleur ».
//
// Le texte n'était pas en cause : les cent vingt et une leçons SONT structurées
// — capitales pour la règle, « MÊME SIGNE : » pour ouvrir un cas, calculs en
// exemple. Tout partait dans un seul paragraphe et ressortait en pavé.
//
// Ces tests gardent les deux moitiés : qu'on RETROUVE bien la structure, et
// surtout qu'on ne PERDE rien en la retrouvant. Un découpage qui avale un mot
// d'une leçon est pire que pas de découpage — l'élève lirait une phrase fausse
// sans jamais savoir pourquoi elle ne veut rien dire.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { decouperLecon, morceaux, texteDe, LONGUEUR_PARAGRAPHE } from '../js/core/lecon.js';
import { SKILLS } from '../js/data/skills.js';

const LECONS = Object.values(SKILLS).map(s => s.lesson).filter(Boolean);
const sansEspaces = (t) => String(t).replace(/\s+/g, '');

test('AUCUNE LEÇON NE PERD UN MOT EN CHEMIN', () => {
    // Le test qui compte. Sur les cent vingt et une leçons du logiciel, le
    // texte reconstitué depuis les blocs doit être le texte d'origine — aux
    // deux-points des intertitres près, qui deviennent une mise en forme.
    assert.ok(LECONS.length > 100, `seulement ${LECONS.length} leçons : le corpus a fondu`);
    for (const l of LECONS) {
        const rendu = decouperLecon(l).map(b => (b.titre || '') + texteDe(b)).join(' ');
        assert.equal(sansEspaces(rendu).replace(/:/g, ''), sansEspaces(l).replace(/:/g, ''),
            `texte perdu dans : « ${l.slice(0, 60)}… »`);
    }
});

test('on retrouve les cas que l\'auteur a écrits', () => {
    const l = 'La distance à zéro s\'appelle sa VALEUR ABSOLUE. MÊME SIGNE : on ajoute '
        + 'et on garde le signe — (−3) + (−4) = −7. SIGNES DIFFÉRENTS : on retire la plus '
        + 'petite de la plus grande.';
    const blocs = decouperLecon(l);
    const cas = blocs.filter(b => b.genre === 'cas');
    assert.deepEqual(cas.map(c => c.titre), ['MÊME SIGNE', 'SIGNES DIFFÉRENTS']);
    // Le corps du cas ne reprend pas son titre : il est déjà écrit au-dessus.
    assert.ok(!texteDe(cas[0]).includes('MÊME SIGNE'));
});

test('les capitales et les calculs se distinguent du texte ordinaire', () => {
    const m = morceaux('On garde le signe — (−3) + (−4) = −7, sa VALEUR ABSOLUE vaut 7.');
    assert.ok(m.some(x => x.genre === 'calcul' && x.texte.includes('= −7')),
        'le calcul n\'est pas repéré');
    assert.ok(m.some(x => x.genre === 'fort' && x.texte === 'VALEUR ABSOLUE'),
        'la règle en capitales n\'est pas repérée');
});

test('UN NOMBRE SEUL N\'EST PAS UN CALCUL', () => {
    // Sans cette précaution, une leçon qui cite une date ou un effectif
    // ressemblerait à un cours de calcul : « en 2024 » encadré comme une
    // formule, et l'élève chercherait ce qu'il faut en faire.
    const m = morceaux('Il y a 30 élèves dans la classe et 12 tables.');
    assert.equal(m.filter(x => x.genre === 'calcul').length, 0);
});

test('les capitales coupées par une apostrophe ne se fragmentent pas', () => {
    // « UN TASUKO N'EST PAS UNE CHASSE » sortait en trois morceaux gras séparés
    // par du maigre, parce qu'un mot de moins de trois lettres n'ouvre pas une
    // suite de capitales — à raison — mais peut très bien se trouver AU MILIEU.
    const m = morceaux('UN TASUKO N\'EST PAS UNE CHASSE AUX ADDITIONS, c\'est un découpage.');
    const forts = m.filter(x => x.genre === 'fort');
    assert.equal(forts.length, 1, `${forts.length} morceaux gras au lieu d'un seul`);
    assert.ok(forts[0].texte.includes('N\'EST PAS'));
});

test('LE MUR DE TEXTE EST COUPÉ, ET JAMAIS AU MILIEU D\'UNE PHRASE', () => {
    // C'est le reproche de départ : quinze lignes d'un bloc. On coupe en
    // paragraphes lisibles — mais une phrase tranchée en deux serait pire que
    // le mur, alors la limite cède devant elle.
    for (const l of LECONS) {
        const blocs = decouperLecon(l);
        for (const b of blocs) {
            const t = texteDe(b).trim();
            // Un paragraphe ne dépasse la limite que s'il ne contient qu'UNE
            // phrase — auquel cas il n'y avait rien à couper.
            if (t.length > LONGUEUR_PARAGRAPHE * 1.6) {
                const nb = (t.match(/[.!?]\s+\S/g) || []).length;
                assert.ok(nb <= 1,
                    `paragraphe de ${t.length} caractères et ${nb + 1} phrases : « ${t.slice(0, 70)}… »`);
            }
            // Et il ne commence jamais par une ponctuation orpheline.
            assert.ok(!/^[.,;:!?»]/.test(t), `paragraphe orphelin : « ${t.slice(0, 40)}… »`);
        }
    }
});

test('une leçon vide ne fabrique pas de bloc vide', () => {
    assert.deepEqual(decouperLecon(''), []);
    assert.deepEqual(decouperLecon('   '), []);
    assert.deepEqual(decouperLecon(null), []);
    assert.deepEqual(decouperLecon(undefined), []);
});
