// LA PASSERELLE VERS PRONOTE, sans écran.
//
// Ce qu'on éprouve ici tient en une phrase : LA COLONNE NE DOIT JAMAIS SE
// DÉCALER. Une note d'une ligne trop bas est fausse, silencieuse, et fausse
// pour deux élèves à la fois. Tout le reste du module est du confort ; cela,
// c'est la sécurité.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
    lireListe, parNom, noteDe, colonne, enColonne, enTableau, aVerifier
} from '../js/core/pronote.js';

const bilan = (nom, questions, reussite) => ({ nom, questions, reussite });

// --- Lire une liste collée ---------------------------------------------------

test('une liste collée se lit, un nom par ligne', () => {
    const r = lireListe('Dupont Léa\nMartin Hugo\nBernard Inès');
    assert.deepEqual(r.eleves, ['Dupont Léa', 'Martin Hugo', 'Bernard Inès']);
    assert.deepEqual(r.ignorees, []);
});

test('LES COLONNES EN TROP D\'UN EXPORT SONT ÉCARTÉES', () => {
    // Un export porte la classe, un identifiant, une date de naissance. Seule
    // la première colonne est un nom.
    const r = lireListe('Dupont Léa\t4eB\t12345\nMartin Hugo\t4eB\t12346');
    assert.deepEqual(r.eleves, ['Dupont Léa', 'Martin Hugo']);
    const p = lireListe('Dupont Léa;4eB\nMartin Hugo;4eB');
    assert.deepEqual(p.eleves, ['Dupont Léa', 'Martin Hugo']);
});

test('« Dupont, Léa » garde son prénom', () => {
    // La virgule sépare le nom du prénom dans beaucoup d'exports. On ne coupe
    // pas : le prénom fait partie du nom qu'on affiche.
    assert.deepEqual(lireListe('Dupont, Léa\nMartin,Hugo').eleves, ['Dupont Léa', 'Martin Hugo']);
});

test('une ligne d\'en-tête n\'est pas un élève', () => {
    const r = lireListe('Nom\nDupont Léa\nMartin Hugo');
    assert.deepEqual(r.eleves, ['Dupont Léa', 'Martin Hugo']);
    assert.equal(r.ignorees.length, 1);
    // Mais un élève qui s'appellerait « Nomain » en est un.
    assert.deepEqual(lireListe('Nomain Théo').eleves, ['Nomain Théo']);
});

test('ON DIT CE QU\'ON ÉCARTE — un import muet qui perd trois élèves est le pire', () => {
    const r = lireListe('Nom\nDupont Léa\n\n   \n42\nDupont Lea\nMartin Hugo');
    assert.deepEqual(r.eleves, ['Dupont Léa', 'Martin Hugo']);
    // L'en-tête, la ligne de chiffres, et le doublon aux accents près.
    assert.equal(r.ignorees.length, 3, JSON.stringify(r.ignorees));
});

test('un doublon ne rentre qu\'une fois, accents et casse compris', () => {
    const r = lireListe('DUPONT LÉA\ndupont lea\nMartin Hugo');
    assert.deepEqual(r.eleves, ['DUPONT LÉA', 'Martin Hugo']);
});

test('les guillemets d\'un CSV tombent', () => {
    assert.deepEqual(lireListe('"Dupont Léa"\n"Martin Hugo"').eleves, ['Dupont Léa', 'Martin Hugo']);
});

// --- La note -----------------------------------------------------------------

test('la note est le taux de réussite sur le barème', () => {
    assert.equal(noteDe(bilan('X', 20, 0.75)), 15);
    assert.equal(noteDe(bilan('X', 20, 0.75), { sur: 10 }), 7.5);
    assert.equal(noteDe(bilan('X', 8, 1)), 20);
    assert.equal(noteDe(bilan('X', 3, 1 / 3)), 6.7);
    assert.equal(noteDe(bilan('X', 3, 1 / 3), { decimales: 0 }), 7);
});

test('SANS QUESTION, PAS DE NOTE — et surtout pas un zéro', () => {
    // Un zéro est un jugement : « il a composé et il a tout faux ». Une case
    // vide est un fait : « il n'a rien fait ». Écrire l'un pour l'autre serait
    // une faute qui se propagerait dans la moyenne sans que personne la voie.
    assert.equal(noteDe(bilan('X', 0, 0)), null);
    assert.equal(noteDe(null), null);
    // Et un élève qui a tout faux, lui, a bien zéro.
    assert.equal(noteDe(bilan('X', 12, 0)), 0);
});

test('l\'arrondi ne traîne pas de flottant', () => {
    assert.equal(noteDe(bilan('X', 3, 0.1)), 2);
    assert.equal(String(noteDe(bilan('X', 7, 3 / 7))), '8.6');
});

// --- La colonne, et son ordre ------------------------------------------------

test('LA COLONNE SUIT L\'ORDRE ALPHABÉTIQUE DES NOMS', () => {
    // C'est la stratégie retenue avec Rémy : les deux côtés triés par nom se
    // correspondent ligne à ligne.
    const liste = ['Martin Hugo', 'Bernard Inès', 'Dupont Léa'];
    const c = colonne([bilan('Dupont Léa', 10, 1), bilan('Martin Hugo', 10, 0.5),
        bilan('Bernard Inès', 10, 0.8)], liste);
    assert.deepEqual(c.lignes.map(l => l.nom), ['Bernard Inès', 'Dupont Léa', 'Martin Hugo']);
    assert.deepEqual(c.lignes.map(l => l.note), [16, 20, 10]);
});

test('l\'ordre ne dépend ni des accents ni des majuscules', () => {
    const noms = ['Élodie', 'Emile', 'Eva', 'Édouard'];
    const trie = [...noms].sort(parNom);
    assert.deepEqual(trie, ['Édouard', 'Élodie', 'Emile', 'Eva']);
});

test('UN ÉLÈVE QUI N\'A RIEN FAIT LAISSE UNE LIGNE VIDE, pas un zéro', () => {
    const c = colonne([bilan('Dupont Léa', 10, 1)], ['Dupont Léa', 'Martin Hugo']);
    assert.deepEqual(c.lignes.map(l => l.note), [20, null]);
    assert.equal(c.absents, 1);
    assert.equal(enColonne(c.lignes), '20\n');
});

test('LA COLONNE A AUTANT DE LIGNES QUE LA LISTE, toujours', () => {
    // L'invariant qui empêche le décalage : si l'on rendait moins de lignes que
    // d'élèves, tout ce qui suit remonterait d'un cran dans PRONOTE.
    const liste = ['A Un', 'B Deux', 'C Trois', 'D Quatre', 'E Cinq'];
    [[], [bilan('C Trois', 5, 1)], liste.map(n => bilan(n, 4, 0.5))].forEach(bilans => {
        const c = colonne(bilans, liste);
        assert.equal(c.lignes.length, liste.length);
        assert.equal(enColonne(c.lignes).split('\n').length, liste.length);
    });
});

test('CEUX QUI ONT TRAVAILLÉ SANS ÊTRE DANS LA LISTE SONT SIGNALÉS', () => {
    // Un prénom mal orthographié à l'inscription, un élève arrivé en cours
    // d'année : sans ce compte, sa note disparaîtrait sans un mot.
    const c = colonne([bilan('Dupont Léa', 10, 1), bilan('Nouveau Sam', 10, 0.5)],
        ['Dupont Léa', 'Martin Hugo']);
    assert.deepEqual(c.sansListe, ['Nouveau Sam']);
    assert.equal(c.lignes.length, 2, 'la colonne suit la LISTE, pas les bilans');
});

test('un nom écrit autrement retrouve son élève', () => {
    const c = colonne([bilan('DUPONT LEA', 10, 1)], ['Dupont Léa']);
    assert.equal(c.lignes[0].note, 20);
    assert.equal(c.absents, 0);
    assert.deepEqual(c.sansListe, []);
});

test('sans liste, on prend les élèves qui ont travaillé', () => {
    const c = colonne([bilan('Martin Hugo', 4, 1), bilan('Bernard Inès', 4, 0.5)]);
    assert.deepEqual(c.lignes.map(l => l.nom), ['Bernard Inès', 'Martin Hugo']);
});

// --- Les deux sorties ---------------------------------------------------------

test('la colonne à coller ne contient QUE des notes', () => {
    const c = colonne([bilan('Bernard Inès', 10, 0.85), bilan('Dupont Léa', 10, 1)],
        ['Bernard Inès', 'Dupont Léa', 'Martin Hugo']);
    // La virgule décimale française : PRONOTE ne lit pas « 17.5 ».
    assert.equal(enColonne(c.lignes), '17\n20\n');
});

test('LA VIRGULE EST FRANÇAISE', () => {
    const c = colonne([bilan('A Un', 8, 0.9375)], ['A Un']);
    assert.equal(enColonne(c.lignes), '18,8');
    assert.doesNotMatch(enColonne(c.lignes), /\./);
});

test('le tableau de contrôle porte les noms et le nombre de questions', () => {
    const c = colonne([bilan('Dupont Léa', 3, 1)], ['Dupont Léa', 'Martin Hugo']);
    const t = enTableau(c.lignes).split('\n');
    assert.equal(t[0], 'Nom\tNote\tQuestions');
    assert.equal(t[1], 'Dupont Léa\t20\t3', 'on VOIT que le 20 ne pèse que trois questions');
    assert.equal(t[2], 'Martin Hugo\t\t');
});

test('LA PHRASE DE VÉRIFICATION DONNE LES DEUX BORNES', () => {
    // Le décalage d'une ligne est la seule faute grave possible, et elle ne se
    // voit plus une fois collée. Le premier et le dernier nom suffisent à
    // l'attraper.
    const c = colonne([], ['Martin Hugo', 'Bernard Inès', 'Dupont Léa']);
    const p = aVerifier(c.lignes);
    assert.match(p, /3 lignes/);
    assert.match(p, /Bernard Inès/);
    assert.match(p, /Martin Hugo/);
    assert.match(p, /trie par nom/i);
    assert.match(aVerifier([]), /Aucun élève/);
});

test('UN ALLER-RETOUR COMPLET, comme en salle des profs', () => {
    // On colle la liste sortie de PRONOTE, on produit la colonne, et l'on
    // vérifie que chaque note retombe en face du bon nom.
    const colle = 'Nom\tClasse\nZidane Théo\t4eB\nAbadie Léa\t4eB\nMartin Hugo\t4eB\nBernard Inès\t4eB';
    const { eleves } = lireListe(colle);
    assert.equal(eleves.length, 4);

    const bilans = [bilan('Martin Hugo', 20, 0.6), bilan('Abadie Léa', 20, 0.95),
        bilan('Zidane Théo', 20, 0.4)];   // Bernard Inès absente
    const c = colonne(bilans, eleves);

    assert.deepEqual(c.lignes.map(l => l.nom),
        ['Abadie Léa', 'Bernard Inès', 'Martin Hugo', 'Zidane Théo']);
    assert.deepEqual(c.lignes.map(l => l.note), [19, null, 12, 8]);
    assert.equal(enColonne(c.lignes), '19\n\n12\n8');
    assert.equal(c.absents, 1);
});
