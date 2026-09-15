// L'EXPLORATEUR DE PARCOURS — retrouver le sien parmi cent.
//
// Rémy : « l'explorateur de parcours va vite avoir ses limites. Il faudrait un
// explorateur avec les derniers parcours édités […] sobre, avec la date de
// modif ».
//
// CE QUI SE VÉRIFIE ICI EST L'ORDRE ET LE COMPTE.
//
// Un explorateur qui se trompe d'ordre est pire qu'une liste alphabétique : on
// croit voir les derniers et on voit autre chose, sans que rien ne le dise. Et
// un compte de questions faux — parce qu'on additionne un Tetris — fait
// paraître un devoir deux fois plus lourd qu'il n'est, ce qui change ce que le
// professeur décide d'en faire.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    quandLisible, instantDe, resumeDeParcours, derniersEdites, chercher, enBref
} from '../js/core/explorateurParcours.js';

const JOUR = 86400000;
const MAINTENANT = new Date('2026-09-15T14:00:00Z').getTime();

const unParcours = (o = {}) => ({
    id: o.id || 'p1',
    name: o.nom || 'Devoir du mardi',
    folderId: o.dossier || 'root',
    timestamp: o.quand === undefined ? MAINTENANT : o.quand,
    data: {
        steps: o.etapes || [
            { stepId: 'a', exerciseId: 'calc-add', titre: 'Additions', nbItems: 8 },
            { stepId: 'b', exerciseId: 'calc-sub', titre: 'Soustractions', nbItems: 6 }
        ],
        policy: { mode: o.mode || 'entrainement' }
    }
});

// ────────────────────────────────────────────────────────── L'ORDRE ─────────

test('LES DERNIERS ÉDITÉS PASSENT DEVANT — c\'est tout l\'objet', () => {
    // La seule chose qu'on sait vraiment d'un parcours qu'on cherche, c'est
    // qu'on y a touché récemment. Trier par nom suppose qu'on se souvienne du
    // nom ; par création, de l'ordre où on les a faits. Ni l'un ni l'autre.
    const l = derniersEdites([
        resumeDeParcours(unParcours({ id: 'vieux', nom: 'Vieux', quand: MAINTENANT - 30 * JOUR })),
        resumeDeParcours(unParcours({ id: 'hier', nom: 'Hier', quand: MAINTENANT - JOUR })),
        resumeDeParcours(unParcours({ id: 'ajd', nom: 'Aujourd\'hui', quand: MAINTENANT }))
    ]);
    assert.deepEqual(l.map(x => x.id), ['ajd', 'hier', 'vieux']);
});

test('UN PARCOURS SANS DATE NE PASSE PAS DEVANT LES AUTRES', () => {
    // Les entrées anciennes n'ont pas toujours d'horodatage. Les traiter comme
    // « maintenant » les mettrait en tête — exactement ce qu'on veut éviter.
    const l = derniersEdites([
        resumeDeParcours(unParcours({ id: 'sans', nom: 'Sans date', quand: null })),
        resumeDeParcours(unParcours({ id: 'vieux', nom: 'Vieux', quand: MAINTENANT - 90 * JOUR }))
    ]);
    assert.deepEqual(l.map(x => x.id), ['vieux', 'sans']);
});

test('à date égale, on range par nom — et pas au hasard', () => {
    // Sans ce second critère, deux parcours enregistrés dans la même seconde
    // changeraient de place à chaque ouverture de l'explorateur.
    const l = derniersEdites([
        resumeDeParcours(unParcours({ id: 'z', nom: 'Zèbre', quand: MAINTENANT })),
        resumeDeParcours(unParcours({ id: 'a', nom: 'Éclair', quand: MAINTENANT }))
    ]);
    assert.deepEqual(l.map(x => x.nom), ['Éclair', 'Zèbre']);
});

test('on peut n\'en prendre que les premiers', () => {
    const tous = Array.from({ length: 20 }, (_, i) =>
        resumeDeParcours(unParcours({ id: 'p' + i, quand: MAINTENANT - i * JOUR })));
    assert.equal(derniersEdites(tous, 8).length, 8);
    assert.equal(derniersEdites(tous).length, 20);
    assert.deepEqual(derniersEdites([], 5), []);
});

// ──────────────────────────────────────────────────────── LE COMPTE ─────────

test('ON NE COMPTE PAS LES JEUX DE RÉCOMPENSE DANS LES QUESTIONS', () => {
    // Un parcours de deux exercices plus un Tetris n'a pas « quinze
    // questions » : le Tetris n'en pose aucune. L'annoncer ferait paraître le
    // travail plus lourd qu'il n'est — et c'est sur ce chiffre que le
    // professeur décide s'il tient dans l'heure.
    const r = resumeDeParcours(unParcours({
        etapes: [
            { stepId: 'a', nbItems: 8, titre: 'Additions' },
            { stepId: 'b', nbItems: 6, titre: 'Soustractions' },
            { stepId: 'jeu', nbItems: 1, titre: 'Math Tetris', bonus: true }
        ]
    }));
    assert.equal(r.questions, 14);
    assert.equal(r.activites, 3, 'le jeu compte comme une activité : c\'en est une');
    assert.equal(r.recompenses, 1);
});

test('la phrase courte dit ce qu\'il y a, et rien de plus', () => {
    assert.equal(enBref({ activites: 5, questions: 59, recompenses: 0 }), '5 activités · 59 questions');
    assert.equal(enBref({ activites: 1, questions: 1, recompenses: 0 }), '1 activité · 1 question');
    assert.equal(enBref({ activites: 3, questions: 20, recompenses: 1 }),
        '3 activités · 20 questions · 1 jeu');
    // Un parcours qui n'est fait que de jeux n'annonce pas « 0 question ».
    assert.equal(enBref({ activites: 2, questions: 0, recompenses: 2 }), '2 activités · 2 jeux');
});

test('ON NOMME LES ACTIVITÉS, ON NE LES CODE PAS', () => {
    // Une étape enregistrée ne porte pas toujours de titre : elle porte un
    // identifiant d'exercice. Afficher « calc-poser-division » dans « ce qu'il
    // contient » serait exactement l'illisible que cet écran défait.
    const sansTitre = resumeDeParcours(
        { id: 'p', name: 'P', data: { steps: [{ exerciseId: 'calc-poser-division' }] } },
        null,
        (id) => (id === 'calc-poser-division' ? { title: 'Poser une division' } : null)
    );
    assert.equal(sansTitre.etapes[0].titre, 'Poser une division');

    // Sans catalogue sous la main, l'identifiant vaut mieux que « Activité » :
    // il dit au moins de quoi il s'agit à qui le reconnaît.
    const sansCatalogue = resumeDeParcours(
        { id: 'p', name: 'P', data: { steps: [{ exerciseId: 'calc-poser-division' }] } });
    assert.equal(sansCatalogue.etapes[0].titre, 'calc-poser-division');

    // Un titre écrit à la main l'emporte sur les deux.
    const aLaMain = resumeDeParcours(
        { id: 'p', name: 'P', data: { steps: [{ exerciseId: 'calc-add', titre: 'Mon titre' }] } },
        null, () => ({ title: 'Additions' }));
    assert.equal(aLaMain.etapes[0].titre, 'Mon titre');
});

test('le détail des étapes suit, pour la flèche', () => {
    const r = resumeDeParcours(unParcours());
    assert.equal(r.etapes.length, 2);
    assert.deepEqual(r.etapes[0], {
        rang: 1, titre: 'Additions', exerciseId: 'calc-add', questions: 8, bonus: false
    });
});

test('un parcours vide ou biscornu ne casse pas l\'explorateur', () => {
    assert.equal(resumeDeParcours({ id: 'x', name: 'Vide', data: {} }).activites, 0);
    assert.equal(resumeDeParcours({ id: 'y', name: 'Rien' }).questions, 0);
    assert.equal(resumeDeParcours({ id: 'z' }).nom, 'Sans nom');
});

// ──────────────────────────────────────────────────── QUAND, EN FRANÇAIS ────

test('« hier », « il y a 3 jours », « le 12 septembre »', () => {
    assert.equal(quandLisible(MAINTENANT, MAINTENANT), 'aujourd\'hui');
    assert.equal(quandLisible(MAINTENANT - JOUR, MAINTENANT), 'hier');
    assert.equal(quandLisible(MAINTENANT - 3 * JOUR, MAINTENANT), 'il y a 3 jours');
    assert.equal(quandLisible(MAINTENANT - 9 * JOUR, MAINTENANT), 'la semaine dernière');
    // `\w` ne contient pas le « û » d'août : les mois français demandent la
    // classe unicode, faute de quoi l'essai échoue une fois par an.
    assert.match(quandLisible(MAINTENANT - 40 * JOUR, MAINTENANT), /^le \d+ \p{L}+$/u);
    assert.equal(quandLisible(MAINTENANT - 40 * JOUR, MAINTENANT), 'le 6 août');
});

test('AU-DELÀ D\'UNE QUINZAINE, LA DATE EXACTE REDEVIENT PLUS PARLANTE', () => {
    // « il y a 34 jours » ne se rapporte à rien. « le 12 août », si.
    assert.ok(!/jours/.test(quandLisible(MAINTENANT - 34 * JOUR, MAINTENANT)));
});

test('LES TROIS FORMES D\'INSTANT DU LOGICIEL SE LISENT TOUTES', () => {
    // Le journal horodate en millisecondes, l'API répond en secondes, la base
    // range des dates SQL. Trois fonctions qui feraient la même chose
    // finiraient par ne plus la faire pareil.
    assert.equal(instantDe(1_700_000_000_000), 1_700_000_000_000);
    assert.equal(instantDe(1_700_000_000), 1_700_000_000_000);
    assert.equal(instantDe('2026-09-15 14:29:03'), new Date('2026-09-15T14:29:03').getTime());
    assert.equal(instantDe(null), null);
    assert.equal(instantDe(''), null);
    assert.equal(instantDe('pas une date'), null);
    assert.equal(instantDe(0), null);
});

// ─────────────────────────────────────────────────────── LA RECHERCHE ───────

test('CHERCHER SANS CONNAÎTRE L\'ORTHOGRAPHE EXACTE', () => {
    // Un professeur qui tape « equations » doit trouver « Équations ».
    const l = [
        resumeDeParcours(unParcours({ id: 'a', nom: 'Équations du premier degré' })),
        resumeDeParcours(unParcours({ id: 'b', nom: 'Fractions du mardi' })),
        resumeDeParcours(unParcours({ id: 'c', nom: 'FRACTIONS — révisions' }))
    ];
    assert.deepEqual(chercher(l, 'equations').map(x => x.id), ['a']);
    assert.deepEqual(chercher(l, 'fractions').map(x => x.id), ['b', 'c']);
    assert.deepEqual(chercher(l, 'FRACTIONS').map(x => x.id), ['b', 'c']);
});

test('les mots se cherchent dans n\'importe quel ordre', () => {
    // « mardi fractions » trouve « Fractions du mardi » : on ne demande pas au
    // professeur de se souvenir de la phrase, seulement de deux mots.
    const l = [resumeDeParcours(unParcours({ id: 'b', nom: 'Fractions du mardi' }))];
    assert.equal(chercher(l, 'mardi fractions').length, 1);
    assert.equal(chercher(l, 'fractions jeudi').length, 0);
});

test('une recherche vide rend tout, elle ne cache rien', () => {
    const l = [resumeDeParcours(unParcours())];
    assert.equal(chercher(l, '').length, 1);
    assert.equal(chercher(l, '   ').length, 1);
    assert.equal(chercher(null, 'x').length, 0);
});
