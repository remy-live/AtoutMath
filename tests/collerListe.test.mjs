// COLLER UNE LISTE TELLE QU'ELLE SORT DE PRONOTE.
//
// Rémy : « ce serait cool de pouvoir coller le fichier de pronote qui comprend
// plein de colonnes dans le presse-papier et tu me le présentes sous forme de
// tableau où tu sélectionnes intelligemment les colonnes ». Puis, décisif :
// « en première ligne j'ai le nombre d'élèves ».
//
// CE QUI SE VÉRIFIE ICI TIENT SUR SON VRAI FICHIER.
//
// Il l'a envoyé, et c'est lui qui sert d'épreuve principale : vingt-deux
// colonnes, séparées par des tabulations, à moitié vides, avec des guillemets
// autour de tout ce qui contient une espace — et surtout TROIS PIÈGES qu'aucun
// exemple fabriqué n'aurait contenus :
//
//   · « DEMI-PENSIONNAIRE AU TICKET » dans la colonne Régime,
//   · « LCA LATIN » dans une colonne Option,
//   · « Mme DELFOUR CORGAS SANDRA » en professeur principal.
//
// Ce sont des colonnes en capitales, donc des noms de famille parfaits pour une
// devinette naïve. Si l'une d'elles gagne, la classe de Rémy s'appelle
// « DEMI-PENSIONNAIRE AU TICKET ».

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    analyserCollage, elevesDepuisChoix, enListeNormalisee, separateurDe,
    decouper, longueurDuPreambule, estUnEnTete, ressembleAUnNom, ressembleAUnCode
} from '../js/core/collerListe.js';

// Le vrai export, tel que Rémy l'a collé — tabulations comprises.
const T = '\t';
const PRONOTE = [
    ['Élève', 'Né(e) le', 'Classe de rattachement', 'Groupes', 'Projet d\'accompagnement',
     'Entrée', 'Sortie', 'Régime', 'Professeur principal', 'Tuteur',
     'Option 1', 'Option 2', 'Option 3', 'Option 4'].join(T),
    ['"ANDRIANTSITOHAINA Tiffany"', '06/28/2013', '', '"4EME B_ESP 4B, 4EME B_ESP 4B_08/09/2026, 4EME B_LATINISTES"',
     '', '09/01/2026', '', '"DEMI-PENSIONNAIRE AU TICKET"', '"Mme DELFOUR CORGAS SANDRA"', '',
     '"ANGLAIS LV1"', '"ESPAGNOL LV2"', '"LCA LATIN"', ''].join(T),
    ['"BA Maryam"', '03/14/2013', '', '"4EME B_ESP 4B"', '', '09/01/2026', '',
     '"DEMI-PENSIONNAIRE AU TICKET"', '"Mme DELFOUR CORGAS SANDRA"', '',
     '"ANGLAIS LV1"', '"ESPAGNOL LV2"', '"LCA LATIN"', ''].join(T),
    ['"NGUYÊN Maëlle"', '11/02/2012', '', '"4EME B_ESP 4B"', '', '09/01/2026', '',
     '"EXTERNE"', '"Mme DELFOUR CORGAS SANDRA"', '',
     '"ANGLAIS LV1"', '"ESPAGNOL LV2"', '', ''].join(T),
    ['"O\'CONNOR Liam"', '01/09/2013', '', '"4EME B_ESP 4B"', '', '09/01/2026', '',
     '"DEMI-PENSIONNAIRE AU TICKET"', '"Mme DELFOUR CORGAS SANDRA"', '',
     '"ANGLAIS LV1"', '', '"LCA LATIN"', ''].join(T)
].join('\n');

// ────────────────────────────────── LE FICHIER DE RÉMY, TEL QUEL ────────────

test('LE VRAI EXPORT DE PRONOTE DONNE LES QUATRE ÉLÈVES, ET RIEN D\'AUTRE', () => {
    const a = analyserCollage(PRONOTE);
    const { eleves, ecartees } = elevesDepuisChoix(a);
    assert.deepEqual(eleves.map(e => e.nom), [
        'ANDRIANTSITOHAINA Tiffany', 'BA Maryam', 'NGUYÊN Maëlle', 'O\'CONNOR Liam'
    ]);
    assert.deepEqual(ecartees, []);
});

test('LA COLONNE « Élève » EST RECONNUE, ET ELLE PORTE NOM ET PRÉNOM ENSEMBLE', () => {
    const a = analyserCollage(PRONOTE);
    assert.equal(a.colonnes[0].role, 'nomComplet');
    assert.equal(a.colonnes[0].titre, 'Élève');
});

test('AUCUNE COLONNE EN CAPITALES NE SE FAIT PASSER POUR UN NOM', () => {
    // Le piège du vrai fichier. « DEMI-PENSIONNAIRE AU TICKET », « LCA LATIN » :
    // des capitales, des espaces, des traits d'union — un nom de famille
    // parfait pour une devinette qui ne regarde que la forme. Si l'une gagne,
    // la classe s'appelle « DEMI-PENSIONNAIRE AU TICKET ».
    const a = analyserCollage(PRONOTE);
    const retenues = a.colonnes.filter(c => c.role !== 'ignore');
    assert.deepEqual(retenues.map(c => c.titre), ['Élève'],
        'colonnes retenues : ' + retenues.map(c => `${c.titre}=${c.role}`).join(', '));
});

test('les tabulations sont trouvées toutes seules', () => {
    assert.equal(separateurDe(PRONOTE), '\t');
    assert.equal(analyserCollage(PRONOTE).separateur, '\t');
});

test('les dates américaines de Pronote ne passent pas pour des élèves', () => {
    // « 06/28/2013 » — mois d'abord. Une colonne de dates ne doit jamais être
    // proposée comme un nom, quel que soit l'ordre jour/mois.
    const a = analyserCollage(PRONOTE);
    assert.equal(a.colonnes[1].role, 'ignore');
});

// ───────────────────────────── LA PREMIÈRE LIGNE QUI N'EST PAS UN ÉLÈVE ─────

test('LE NOMBRE D\'ÉLÈVES EN PREMIÈRE LIGNE NE DEVIENT PAS UN ÉLÈVE', () => {
    // Rémy : « en première ligne j'ai le nombre d'élèves ». Lue comme une ligne
    // de données, elle fabrique un élève nommé « 30 » — qu'il faut ensuite aller
    // supprimer sans comprendre d'où il sort.
    const a = analyserCollage('30\n' + PRONOTE);
    const { eleves } = elevesDepuisChoix(a);
    assert.equal(eleves.length, 4);
    assert.ok(!eleves.some(e => e.nom === '30'), eleves.map(e => e.nom).join(', '));
    assert.deepEqual(a.preambule, ['30']);
});

test('un préambule de plusieurs lignes se retire aussi', () => {
    const a = analyserCollage('Collège Jean Moulin\nClasse 4B\n28\n' + PRONOTE);
    assert.equal(a.preambule.length, 3);
    assert.equal(elevesDepuisChoix(a).eleves.length, 4);
});

test('UNE LISTE D\'UNE SEULE COLONNE N\'EST PAS UN PRÉAMBULE', () => {
    // Le repli qui protège le cas le plus simple : trente noms, un par ligne.
    // Pris pour un préambule, le fichier entier disparaîtrait.
    const a = analyserCollage('MARTIN Léa\nDURAND Paul\nROUX Théo');
    assert.deepEqual(a.preambule, []);
    assert.equal(elevesDepuisChoix(a).eleves.length, 3);
});

test('longueurDuPreambule compte des lignes maigres, pas des mots connus', () => {
    // La règle est géométrique : on n'a pas à connaître le mot « effectif »
    // pour écarter la ligne qui le porte.
    assert.equal(longueurDuPreambule([['30'], ['a', 'b', 'c'], ['d', 'e', 'f']], 3), 1);
    assert.equal(longueurDuPreambule([['a', 'b', 'c'], ['d', 'e', 'f']], 3), 0);
});

// ──────────────────────────────────────────── LES AUTRES FORMES ─────────────

test('le point-virgule d\'Excel français marche toujours', () => {
    const a = analyserCollage('NOM;Prénom;Identifiant\nMARTIN;Léa;lea.martin\nDURAND;Paul;paul.durand');
    const { eleves } = elevesDepuisChoix(a);
    assert.deepEqual(eleves.map(e => e.nom), ['MARTIN Léa', 'DURAND Paul']);
    assert.deepEqual(eleves.map(e => e.login), ['lea.martin', 'paul.durand']);
});

test('sans aucun en-tête, on devine sur le contenu', () => {
    const a = analyserCollage('MARTIN;Léa\nDURAND;Paul\nROUX;Théo');
    assert.equal(a.entete, null);
    assert.deepEqual(elevesDepuisChoix(a).eleves.map(e => e.nom),
        ['MARTIN Léa', 'DURAND Paul', 'ROUX Théo']);
});

test('UNE CELLULE ENTRE GUILLEMETS QUI CONTIENT LE SÉPARATEUR RESTE ENTIÈRE', () => {
    // Sans cela, la ligne se décale d'une colonne — et d'une seule ligne, ce
    // qui met une date dans les prénoms sur un élève au hasard. On ne le voit
    // qu'en classe.
    assert.deepEqual(decouper('"MARTIN, Jean";Léa;x', ';'), ['MARTIN, Jean', 'Léa', 'x']);
    assert.deepEqual(decouper('a;"il a dit ""non""";c', ';'), ['a', 'il a dit "non"', 'c']);
});

test('le code du billet est repris quand il y en a un', () => {
    const a = analyserCollage('NOM;Prénom;Code\nMARTIN;Léa;VPYW\nDURAND;Paul;VPYW');
    const { eleves } = elevesDepuisChoix(a);
    assert.deepEqual(eleves.map(e => e.code), ['VPYW', 'VPYW']);
});

// ──────────────────────────────────── ON NE JETTE RIEN EN SILENCE ───────────

test('UNE LIGNE ÉCARTÉE REVIENT AVEC SA RAISON', () => {
    // Un import qui avale une ligne sans le dire est un import qu'on ne peut
    // pas vérifier — et le professeur ne s'aperçoit qu'un élève manque que le
    // jour où l'élève le dit.
    const a = analyserCollage('NOM;Prénom\nMARTIN;Léa\nMARTIN;Léa\n;\nDURAND;Paul');
    const { eleves, ecartees } = elevesDepuisChoix(a);
    assert.deepEqual(eleves.map(e => e.nom), ['MARTIN Léa', 'DURAND Paul']);
    assert.equal(ecartees.length, 2);
    assert.ok(ecartees.some(e => /déjà/.test(e.pourquoi)), JSON.stringify(ecartees));
    assert.ok(ecartees.some(e => /aucun nom/.test(e.pourquoi)), JSON.stringify(ecartees));
});

// ─────────────────────────── C'EST LE PROFESSEUR QUI DÉCIDE, AU FINAL ───────

test('LE CHOIX DU PROFESSEUR L\'EMPORTE SUR LA DEVINETTE', () => {
    // C'est ce qui rend la devinette acceptable : elle n'est pas sûre, mais
    // elle est visible et corrigeable en un clic. Ici, il décide que la colonne
    // « Groupes » porte les noms — on l'applique sans discuter.
    const a = analyserCollage(PRONOTE);
    const choix = a.colonnes.map(() => 'ignore');
    choix[3] = 'nomComplet';
    const { eleves } = elevesDepuisChoix(a, choix);
    assert.equal(eleves[0].nom, '4EME B_ESP 4B, 4EME B_ESP 4B_08/09/2026, 4EME B_LATINISTES');
});

test('la liste normalisée est celle que le serveur sait relire', () => {
    const a = analyserCollage(PRONOTE);
    const { eleves } = elevesDepuisChoix(a);
    const texte = enListeNormalisee(eleves);
    assert.equal(texte.split('\n').length, 4);
    assert.match(texte.split('\n')[1], /^BA Maryam;;$/);
});

// ───────────────────────────────────────── LES BRIQUES, UNE PAR UNE ─────────

test('un en-tête se reconnaît à ses mots, même partiellement inconnus', () => {
    assert.equal(estUnEnTete(['Élève', 'Né(e) le', 'Régime', 'Option 1']), true);
    assert.equal(estUnEnTete(['MARTIN', 'Léa', 'lea.martin']), false);
});

test('« Mme DELFOUR CORGAS SANDRA » n\'est pas un nom de famille', () => {
    // Une civilité en tête suffit à la distinguer : les capitales seules ne
    // font pas un nom d'élève.
    assert.equal(ressembleAUnNom('Mme DELFOUR CORGAS SANDRA'), false);
    assert.equal(ressembleAUnNom('ANDRIANTSITOHAINA'), true);
    assert.equal(ressembleAUnNom('O\'CONNOR'), true);
    assert.equal(ressembleAUnNom('VAN DEN BERG'), true);
});

test('un code de billet a quatre signes au moins, et une lettre', () => {
    assert.equal(ressembleAUnCode('VPYW'), true);
    assert.equal(ressembleAUnCode('4KP2'), true);
    assert.equal(ressembleAUnCode('2013'), false, 'une année n\'est pas un code');
    assert.equal(ressembleAUnCode('AB'), false);
});

test('un fichier vide ne casse rien', () => {
    const a = analyserCollage('');
    assert.deepEqual(a.lignes, []);
    assert.deepEqual(elevesDepuisChoix(a).eleves, []);
    assert.deepEqual(elevesDepuisChoix(analyserCollage(null)).eleves, []);
});
