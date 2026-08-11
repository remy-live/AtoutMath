import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { normaliser, motsDe, chercher, correspond, decouper, preparer } from '../js/core/recherche.js';
import { exercices } from '../js/data/catalog.js';
import '../js/core/activities/index.js';

const F = (titre, chemin = [], niveaux = [], motsCles = [], texte = '') =>
    ({ titre, chemin, niveaux, motsCles, texte });

const CATALOGUE = [
    F('Duel de Fractions', ['Numérique', 'Fractions'], ['6ème'], []),
    F('Addition de Fractions', ['Numérique', 'Fractions'], ['5ème'], []),
    F('La Pizzeria des Fractions', ['Numérique', 'Fractions'], ['6ème', '5ème'], ['jeu'],
        'Une commande arrive : garnis la pizza selon les fractions demandées.'),
    F('Dixièmes et Centièmes', ['Numérique', 'Numération'], ['6ème'], []),
    F('Le Plan de Ville', ['Géométrique', 'Géométrie dans l\'espace'], ['CM2', '6ème'], ['jeu']),
    F('Échecs', ['Numérique', 'Logique'], ['CM2', '6ème'], ['jeu', 'deux joueurs'])
];

test('normaliser retire accents, apostrophes et ponctuation', () => {
    assert.equal(normaliser('Géométrie'), 'geometrie');
    assert.equal(normaliser('Dixièmes et Centièmes'), 'dixiemes et centiemes');
    assert.equal(normaliser("L'École"), 'l ecole');
    assert.equal(normaliser('Échecs'), 'echecs');
    assert.equal(normaliser('  À  Peu   Près ! '), 'a peu pres');
    assert.equal(normaliser(null), '');
});

test('une requête se coupe en mots, sans doublon', () => {
    assert.deepEqual(motsDe('fraction 6ème'), ['fraction', '6eme']);
    assert.deepEqual(motsDe('jeu jeu'), ['jeu']);
    assert.deepEqual(motsDe('   '), []);
});

test('on trouve SANS taper les accents', () => {
    // Le vrai cas : un clavier de téléphone, et personne ne s'arrête pour
    // chercher l'accent aigu.
    assert.ok(chercher(CATALOGUE, 'geometrie').length, 'geometrie ne trouve rien');
    assert.equal(chercher(CATALOGUE, 'echecs')[0].fiche.titre, 'Échecs');
    assert.equal(chercher(CATALOGUE, 'dixiemes')[0].fiche.titre, 'Dixièmes et Centièmes');
});

test('le titre passe avant le domaine', () => {
    // « pizzeria » est un titre, « fractions » un domaine partagé : le titre gagne.
    const r = chercher(CATALOGUE, 'pizz');
    assert.equal(r[0].fiche.titre, 'La Pizzeria des Fractions');
});

test('un titre qui COMMENCE par le mot passe devant un titre qui le contient', () => {
    const r = chercher(CATALOGUE, 'duel').map(x => x.fiche.titre);
    assert.equal(r[0], 'Duel de Fractions');
});

test('à pertinence égale, le titre le plus court est le plus précis', () => {
    const r = chercher(CATALOGUE, 'fractions').map(x => x.fiche.titre);
    // Les trois exercices « Fractions » sortent ; le plus court en tête.
    assert.equal(r[0], 'Duel de Fractions');
    assert.ok(r.includes('Addition de Fractions'));
    assert.ok(r.includes('La Pizzeria des Fractions'));
});

test('ajouter un mot RESSERRE la liste', () => {
    const large = chercher(CATALOGUE, 'fractions');
    const serre = chercher(CATALOGUE, 'fractions 5eme');
    assert.ok(serre.length < large.length, 'le second mot n\'a rien filtré');
    serre.forEach(r => assert.ok(r.fiche.niveaux.includes('5ème')));
});

test('un mot qui ne s\'accroche à rien écarte la fiche', () => {
    assert.equal(chercher(CATALOGUE, 'fractions zzzz').length, 0);
    assert.equal(correspond(CATALOGUE[0], 'fractions zzzz'), false);
});

test('la consigne sert de dernier recours, jamais de raccourci', () => {
    // « pizza » n'est dans aucun titre — mais dans la consigne de la Pizzeria.
    const r = chercher(CATALOGUE, 'pizza');
    assert.equal(r[0].fiche.titre, 'La Pizzeria des Fractions');
    // Et un mot de titre reste devant un mot de consigne : « fractions » est
    // dans le titre de trois exercices ET dans la consigne de la Pizzeria.
    assert.ok(chercher(CATALOGUE, 'fractions')[0].score > r[0].score);
});

test('on cherche aussi par niveau, par domaine et par mot-clé', () => {
    assert.ok(chercher(CATALOGUE, 'cm2').length >= 2);
    assert.ok(chercher(CATALOGUE, 'logique').some(r => r.fiche.titre === 'Échecs'));
    assert.ok(chercher(CATALOGUE, 'jeu').length >= 3);
    assert.ok(chercher(CATALOGUE, 'deux joueurs').some(r => r.fiche.titre === 'Échecs'));
});

test('un mot de la même famille suffit', () => {
    // Le dossier s'appelle « Géométrique » : taper « geometrie » doit marcher.
    // C'est le mot que le professeur a en tête, pas celui de l'arborescence.
    const r = chercher(CATALOGUE, 'geometrie').map(x => x.fiche.titre);
    assert.ok(r.includes('Le Plan de Ville'), 'geometrie ne retrouve pas le dossier Géométrique');
    // Et dans l'autre sens.
    assert.ok(chercher(CATALOGUE, 'geometrique').length);
});

test('la famille reste un DERNIER recours, jamais un raccourci', () => {
    // « fractionnement » est de la famille de « Fractions », mais un exercice
    // qui contient vraiment le mot doit rester devant.
    const r = chercher(CATALOGUE, 'fraction');
    assert.ok(r[0].score > 50, 'un mot réellement écrit doit valoir plus qu\'une racine');
    // Quatre lettres communes ne font pas une famille : « peri » ne suffit pas.
    assert.equal(chercher(CATALOGUE, 'periode').length, 0);
    // Et un mot court ne se rapproche de rien : sinon « aire » attraperait tout.
    assert.equal(chercher(CATALOGUE, 'plaf').length, 0);
});

test('une requête vide ne propose rien, mais ne filtre rien non plus', () => {
    assert.deepEqual(chercher(CATALOGUE, ''), []);
    assert.equal(correspond(CATALOGUE[0], ''), true);
    assert.equal(correspond(CATALOGUE[0], '   '), true);
});

test('le nombre de suggestions est plafonné', () => {
    assert.ok(chercher(CATALOGUE, 'fractions', { max: 2 }).length <= 2);
});

test('le surlignage rend le titre d\'ORIGINE, accents compris', () => {
    const m = decouper('Dixièmes et Centièmes', 'dixiemes');
    assert.equal(m.map(x => x.texte).join(''), 'Dixièmes et Centièmes',
        'le titre reconstitué doit être exactement l\'original');
    assert.equal(m[0].fort, true);
    assert.equal(m[0].texte, 'Dixièmes', 'l\'accent doit rester dans la partie surlignée');
});

test('le surlignage marque tous les mots de la requête', () => {
    const m = decouper('Addition de Fractions', 'add fract');
    const forts = m.filter(x => x.fort).map(x => x.texte);
    assert.deepEqual(forts, ['Add', 'Fract']);
    assert.equal(m.map(x => x.texte).join(''), 'Addition de Fractions');
});

test('sans requête, le titre revient d\'un seul bloc non surligné', () => {
    const m = decouper('Échecs', '');
    assert.deepEqual(m, [{ texte: 'Échecs', fort: false }]);
});

test('une fiche préparée d\'avance donne le même résultat', () => {
    const prets = CATALOGUE.map(preparer);
    assert.deepEqual(
        chercher(prets, 'pizz').map(r => r.fiche.titre),
        chercher(CATALOGUE, 'pizz').map(r => r.fiche.titre)
    );
});

// --- Sur le VRAI catalogue ---------------------------------------------------

test('le catalogue réel répond aux recherches qu\'on tapera vraiment', () => {
    const fiches = exercices.map(e => preparer({
        id: e.id, titre: e.title,
        chemin: e.tags.chemin || [], niveaux: e.tags.niveaux || [],
        motsCles: [], texte: e.instruction || ''
    }));
    const attendus = [
        ['pizza', 'frac-pizza'],
        ['echecs', 'logi-echecs'],
        ['ville', 'geo-ville'],
        ['othello', 'logi-othello'],
        ['dames', 'logi-dames'],
        ['rapporteur', 'geo-angles-mesurer'],
        // « Taupes des Tables » COMMENCE par le mot : il passe devant
        // « Chasse aux Taupes », qui ne fait que le contenir. C'est la règle,
        // et c'est le bon classement.
        ['taupes', 'calc-moles-tables']
    ];
    for (const [requete, id] of attendus) {
        const r = chercher(fiches, requete);
        assert.ok(r.length, `« ${requete} » ne trouve rien`);
        assert.equal(r[0].fiche.id, id, `« ${requete} » ne met pas ${id} en tête`);
    }
    // Les deux exercices de taupes sortent bien tous les deux.
    const taupes = chercher(fiches, 'taupes', { max: 20 }).map(r => r.fiche.id);
    assert.ok(taupes.includes('calc-arcade-moles'), 'Chasse aux Taupes manque à l\'appel');
});

test('aucun titre du catalogue ne devient introuvable par son propre nom', () => {
    const fiches = exercices.map(e => preparer({
        id: e.id, titre: e.title,
        chemin: e.tags.chemin || [], niveaux: e.tags.niveaux || [],
        motsCles: [], texte: e.instruction || ''
    }));
    const perdus = [];
    for (const f of fiches) {
        const r = chercher(fiches, f.titre, { max: 50 });
        if (!r.some(x => x.fiche.id === f.id)) perdus.push(f.titre);
    }
    assert.deepEqual(perdus, []);
});
