// LA CHUTE DES DÉCIMAUX — encadrer un nombre entre deux graduations.
//
// Rémy : « un [segment] en dessous séparé en 10, exemple 3 jusque 4, ça fait
// dix espaces. Des briques tombent du ciel et il faut les placer entre les
// graduations. Exemple 3,15 le placer entre 3,1 et 3,2 ».
//
// DEUX CHOSES SE VÉRIFIENT ICI, ET AUCUNE N'EST LE DESSIN.
//
// LA PREMIÈRE EST L'ARITHMÉTIQUE. 3,1 + 0,1 ne fait pas 3,2 en virgule
// flottante : il fait 3.3000000000000003. Un jeu d'encadrement qui calcule ses
// graduations en flottants finit par afficher « 3,30000000000004 » au tableau,
// ou par refuser une réponse juste parce que la comparaison tombe du mauvais
// côté d'un milliardième. Tout est donc compté en millièmes entiers, et c'est
// cela qu'on éprouve.
//
// LA SECONDE EST LA QUESTION POSÉE. Une brique tirée PILE sur une graduation
// ne pose pas une question d'encadrement mais une question de convention ;
// l'élève qui se trompe n'a alors rien appris sur les décimaux.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    ecrire, intervalleDe, genererChute, verifierPose, aider, niveauDe,
    NIVEAUX, PAR_UNITE
} from '../js/core/chuteDecimaux.js';

const GRAINES = ['a', 'b', 'c', 'd', 'e', 'f'];
const TOUS = [];
for (const n of NIVEAUX) {
    for (const g of GRAINES) TOUS.push(genererChute({ niveau: n.id, seed: n.id + g }));
}

// ─────────────────────────────────────────────────────────── L'ÉCRITURE ─────

test('ON ÉCRIT AVEC UNE VIRGULE, JAMAIS AVEC UN POINT', () => {
    // C'est le premier reproche qu'un professeur de mathématiques français fait
    // à un logiciel, et il a raison : l'élève recopie ce qu'il voit.
    assert.equal(ecrire(3150), '3,15');
    assert.equal(ecrire(3100), '3,1');
    assert.equal(ecrire(4000), '4');
    assert.equal(ecrire(0), '0');
    assert.equal(ecrire(1), '0,001');
    for (const t of TOUS) {
        for (const g of t.graduations.concat([t.nombre])) {
            assert.ok(!ecrire(g).includes('.'), `« ${ecrire(g)} » contient un point`);
        }
    }
});

test('pas de zéro de remplissage : « 3,1 » et non « 3,100 »', () => {
    // Un zéro inutile fait croire à une précision qui n'existe pas, et sur une
    // graduation il rend illisible ce qui doit se lire d'un coup d'œil.
    assert.equal(ecrire(3100), '3,1');
    assert.equal(ecrire(3120), '3,12');
    assert.equal(ecrire(3000), '3');
});

test('le moins est un vrai signe moins, pas un trait d\'union', () => {
    assert.equal(ecrire(-2700), '−2,7');
    assert.equal(ecrire(-4000), '−4');
});

// ───────────────────────────────────────────── AUCUN FLOTTANT NULLE PART ────

test('LES GRADUATIONS SONT EXACTES, PAS APPROCHÉES', () => {
    // Le piège : 0,1 + 0,1 + 0,1 vaut 0.30000000000000004. En millièmes
    // entiers, la troisième graduation vaut 300, et c'est tout.
    for (const t of TOUS) {
        t.graduations.forEach((g, i) => {
            assert.ok(Number.isInteger(g), `graduation ${i} non entière : ${g}`);
            assert.equal(g, t.debut + i * t.pas);
        });
        assert.equal(t.graduations.length, t.combien + 1);
        assert.equal(t.graduations[t.combien], t.debut + t.longueur);
    }
});

test('dix morceaux, comme demandé', () => {
    for (const t of TOUS) assert.equal(t.combien, 10, `niveau ${t.niveau}`);
});

// ─────────────────────────────────────────────────────── LA BRIQUE TIRÉE ────

test('LA BRIQUE NE TOMBE JAMAIS PILE SUR UNE GRADUATION', () => {
    // « Où placer 3,2 ? » n'est pas une question d'encadrement : c'est une
    // question de convention, à gauche ou à droite de la borne. On ne la pose
    // pas — mais la règle existe quand même (voir `intervalleDe`), sans quoi
    // deux parties du code en inventeraient chacune une.
    for (const t of TOUS) {
        assert.ok(!t.graduations.includes(t.nombre),
            `niveau ${t.niveau} : la brique ${ecrire(t.nombre)} est sur une graduation`);
    }
});

test('la brique est bien dans l\'intervalle annoncé', () => {
    for (const t of TOUS) {
        assert.ok(t.nombre > t.bornes.gauche && t.nombre < t.bornes.droite,
            `${ecrire(t.nombre)} hors de ]${ecrire(t.bornes.gauche)} ; ${ecrire(t.bornes.droite)}[`);
        assert.equal(intervalleDe(t.nombre, t.debut, t.pas, t.combien), t.bonIntervalle);
    }
});

test('l\'intervalle est fermé à gauche, ouvert à droite', () => {
    // 3,2 appartient à [3,2 ; 3,3[, pas à [3,1 ; 3,2[. C'est la convention du
    // collège, et elle doit être écrite une fois pour toutes.
    assert.equal(intervalleDe(3200, 3000, 100, 10), 2);
    assert.equal(intervalleDe(3199, 3000, 100, 10), 1);
    // Hors du segment : personne.
    assert.equal(intervalleDe(2999, 3000, 100, 10), -1);
    assert.equal(intervalleDe(4000, 3000, 100, 10), -1);
});

test('les négatifs se rangent dans le bon sens', () => {
    // −4,7 est à GAUCHE de −4,6 : c'est le piège que le niveau 4 travaille.
    const t = genererChute({ niveau: 4, seed: 'neg' });
    assert.ok(t.debut < 0);
    assert.ok(t.bornes.gauche < t.bornes.droite, 'la borne gauche est la plus petite');
    for (let i = 1; i < t.graduations.length; i++) {
        assert.ok(t.graduations[i] > t.graduations[i - 1], 'les graduations croissent');
    }
});

test('même graine, même brique — une fiche se rejoue', () => {
    const a = genererChute({ niveau: 2, seed: 'pareil' });
    const b = genererChute({ niveau: 2, seed: 'pareil' });
    assert.deepEqual(a, b);
});

// ──────────────────────────────────────────────────────── LA CORRECTION ─────

test('la bonne pose est reconnue, et elle le dit avec les deux bornes', () => {
    const t = genererChute({ niveau: 1, seed: 'juste' });
    const r = verifierPose(t, t.bonIntervalle);
    assert.equal(r.juste, true);
    assert.ok(r.dire.includes(ecrire(t.bornes.gauche)));
    assert.ok(r.dire.includes(ecrire(t.bornes.droite)));
});

test('UNE ERREUR N\'EST PAS « FAUX » : ELLE A UN SENS ET UNE DISTANCE', () => {
    const t = genererChute({ niveau: 1, seed: 'faux' });
    const trop = (t.bonIntervalle + 1) % t.combien;
    const r = verifierPose(t, trop);
    assert.equal(r.juste, false);
    assert.ok(['gauche', 'droite'].includes(r.sens));
    assert.ok(r.dire.length > 20);
});

test('L\'ERREUR LA PLUS FRÉQUENTE EST NOMMÉE, PAS SEULEMENT SIGNALÉE', () => {
    // L'élève qui place 3,15 vers 3,5 lit « 15 » comme un entier et l'oublie
    // derrière la virgule. On la reconnaît à ce qu'elle envoie la brique très
    // loin à droite — et lui répondre « tu t'es trompé d'intervalle » serait
    // exact et sans usage.
    const t = { niveau: 1, debut: 3000, longueur: 1000, pas: 100, combien: 10,
                graduations: [], nombre: 3150, bonIntervalle: 1,
                bornes: { gauche: 3100, droite: 3200 } };
    const r = verifierPose(t, 5);
    assert.equal(r.juste, false);
    assert.ok(/DIXIÈME/.test(r.dire), 'l\'aide doit parler du dixième : ' + r.dire);
});

test('l\'aide monte en trois degrés et ne donne la réponse qu\'en dernier', () => {
    const t = genererChute({ niveau: 1, seed: 'aide' });
    const a0 = aider(t, 0), a1 = aider(t, 1), a2 = aider(t, 2);
    assert.ok(!a0.includes(ecrire(t.bornes.gauche)), 'le premier degré ne donne rien');
    assert.ok(a1.includes(ecrire(t.debut)), 'le second rappelle le segment');
    assert.ok(a2.includes(ecrire(t.bornes.gauche)), 'le dernier place la brique');
});

// ──────────────────────────────────────────────────────────── LES NIVEAUX ───

test('chaque niveau change UNE chose, et il a un titre', () => {
    for (const n of NIVEAUX) {
        assert.ok(n.titre && n.titre.length > 5, `niveau ${n.id} sans titre`);
        assert.equal(niveauDe(n.id).id, n.id);
    }
    // Un niveau inconnu retombe sur le premier plutôt que de casser l'écran.
    assert.equal(niveauDe(99).id, 1);
    assert.equal(niveauDe(undefined).id, 1);
});

test('le niveau 3 travaille bien les centièmes', () => {
    const t = genererChute({ niveau: 3, seed: 'cent' });
    assert.equal(t.pas, 10, 'les graduations vont de centième en centième');
    assert.equal(t.longueur, 100, 'le segment fait un dixième de long');
});

test('PAR_UNITE est bien mille : tout le reste en dépend', () => {
    assert.equal(PAR_UNITE, 1000);
});
