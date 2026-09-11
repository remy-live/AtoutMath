// Le bilan en PDF — ce qu'on emporte hors de l'application.
//
// Rémy : « peut-être avoir un bilan […] que l'on peut exporter en PDF, avec le
// tableau en couleur et aussi une phrase par élève ».
//
// ON NE TESTE PAS LE DESSIN ICI — jsPDF a besoin d'un navigateur, et un test
// qui vérifierait des millimètres d'encre casserait au premier réglage de
// mise en page sans rien apprendre. On teste ce qui DÉCIDE du contenu : la
// traduction des caractères que la police ne sait pas écrire, et l'ordre des
// élèves. Le rendu, lui, est mesuré au navigateur.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { lisible, ordonnerEleves, teinteNiveau } from '../js/ui/bilanPdf.js';

test('LA POLICE DU PDF NE SAIT PAS TOUT ÉCRIRE, et on le lui traduit', () => {
    // MESURÉ SUR LE PREMIER TIRAGE : le titre annonçait « Séance de
    // démonstration — 6l A ». La classe s'appelle « 6ᵉ A », et les polices de
    // base de jsPDF n'encodent que le Windows-1252 : l'exposant y devenait un
    // « l ». Un bilan qui se trompe de nom de classe ne se distribue pas.
    assert.equal(lisible('6ᵉ A'), '6e A');
    assert.equal(lisible('1ᵈ 2ʳ 3ᵗ'), '1d 2r 3t');
    // Les guillemets courbes d'un copier-coller, et les espaces fines.
    assert.equal(lisible('l’élève'), "l'élève");
    assert.equal(lisible('“bonjour”'), '"bonjour"');
    assert.equal(lisible('12 %'), '12 %');
    assert.equal(lisible('trois…'), 'trois...');
    assert.equal(lisible('5 − 3'), '5 - 3');
    // LES ACCENTS FRANÇAIS RESTENT : ils sont dans l'encodage, et les traduire
    // rendrait « Elias » au lieu de « Élias ».
    assert.equal(lisible('Élève à côté où ça'), 'Élève à côté où ça');
    assert.equal(lisible('« Aire d\'un rectangle »'), '« Aire d\'un rectangle »');
    // Rien ne plante sur du vide.
    assert.equal(lisible(null), '');
    assert.equal(lisible(undefined), '');
});

test('LES ÉLÈVES SONT RANGÉS DANS L\'ORDRE OÙ ON LES REGARDE', () => {
    // Pas l'ordre alphabétique : un bilan se lit pour décider qui aider lundi,
    // et la seule chose qu'on y cherche doit être en haut. Ceux qui n'ont rien
    // fait passent à la fin — leur problème n'est pas la notion, et les mettre
    // en tête reléguerait derrière eux ceux qui ont travaillé sans y arriver.
    const eleves = [
        { nom: 'Zoé', questions: 40, reussite: 0.9 },
        { nom: 'Bruno', questions: 0, reussite: 0 },
        { nom: 'Ana', questions: 40, reussite: 0.3 },
        { nom: 'Alice', questions: 0, reussite: 0 },
        { nom: 'Marc', questions: 40, reussite: 0.6 }
    ];
    assert.deepEqual(ordonnerEleves(eleves).map(e => e.nom),
        ['Ana', 'Marc', 'Zoé', 'Alice', 'Bruno']);
    assert.deepEqual(ordonnerEleves([]), []);
});

test('CHAQUE NIVEAU A SA TEINTE, ET LE PAPIER A LA SIENNE', () => {
    // Les couleurs de l'écran sont des VARIABLES CSS que jsPDF ne sait pas
    // lire : il faut les réécrire, et pâles — sur du papier, la saturation de
    // l'écran donne une case où ni le texte noir ni le stylo ne passent.
    ['NA', 'EC', 'A', 'E'].forEach(k => {
        const t = teinteNiveau(k);
        assert.equal(t.length, 3, `${k} : teinte mal formée`);
        t.forEach(c => assert.ok(c >= 0 && c <= 255));
        // Assez claire pour qu'on écrive dessus : chaque composante reste haute.
        assert.ok(Math.min(...t) > 180, `${k} : teinte trop sombre (${t.join(',')})`);
    });
    // Les quatre se distinguent : sinon le tableau ne dit plus rien.
    const vues = new Set(['NA', 'EC', 'A', 'E'].map(k => teinteNiveau(k).join(',')));
    assert.equal(vues.size, 4);
    // Un niveau inconnu ne plante pas, il rend du gris neutre.
    assert.equal(teinteNiveau('???').length, 3);
});
