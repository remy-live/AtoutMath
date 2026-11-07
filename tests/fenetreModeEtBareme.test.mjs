// LA FENÊTRE « MODE & BARÈME », SUR L'ÉCRAN DU PROFESSEUR.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture à l'appui : « pourquoi cette fenetre sur l'écran prof sur ordi
// est si étroite ».
//
// MESURÉ (tools/largeurDUneFenetre.mjs), écran de 1440 px :
//
//   le panneau        500 px   — `.modal-panel-md` les pose en dur
//   les marges        940 px   de vide, à gauche et à droite
//   les trois cartes  138 px   chacune
//   « Apprentissage » 7 lignes — « Montre-moi » coupé au tiret
//
// Et sur un téléphone de 390 px, ces mêmes cartes font 267 px : la fenêtre du
// professeur était DEUX FOIS plus serrée que celle de l'élève.
//
// ── CE QUE CETTE ÉPREUVE GARDE ─────────────────────────────────────────────
//
// Elle ne garde pas un nombre, elle garde une INTENTION : une largeur qui
// suive l'écran sans jamais le dépasser, assez pour trois cartes — et des
// réglages simples qui ne s'étirent pas avec elle.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lireFeuille, corpsDeLaRegle, declare, valeurDe } from './aidesCss.mjs';

const FEUILLE = lireFeuille('css/modules.css');

test('LA FENÊTRE PREND LA PLACE QU\'ELLE A, SANS DÉBORDER', () => {
    const corps = corpsDeLaRegle(FEUILLE,
        'html:not(.volet-atelier) #path-policy-modal .glass-panel',
        { ou: 'css/modules.css' });
    const largeur = valeurDe(corps, 'width');
    assert.ok(largeur, 'la fenêtre n\'a plus de largeur à elle');
    // DEUX TERMES, ET IL EN FAUT DEUX : ce qu'on veut, et ce que la vitre
    // permet. Une largeur en dur redonne les 500 px de marbre ; un pourcentage
    // seul donnerait une fenêtre de deux mètres sur un écran de salle des
    // profs.
    const m = /min\((\d+)px,\s*calc\(100vw - (\d+)px\)\)/.exec(largeur);
    assert.ok(m, `la largeur « ${largeur} » ne suit pas la vitre`);
    // TROIS CARTES DE MODE, et les descriptions qui vont avec : sous 800 px
    // elles retombent sous 250 px chacune, c'est-à-dire dans le serré que
    // Rémy a photographié.
    assert.ok(Number(m[1]) >= 800,
        `les trois cartes ne respirent pas dans ${m[1]} px`);
    // ET LES BORDS RESTENT : sur une fenêtre d'ordinateur étroite, le panneau
    // se resserre au lieu de passer sous le cadre.
    assert.ok(Number(m[2]) >= 16, 'le panneau doit garder une marge sur les bords');
});

test('LE VOLET DE L\'ATELIER GARDE LA MAIN', () => {
    // Quand l'atelier est ouvert, une fenêtre remplit le volet entier (voir
    // `html.volet-atelier .modal-overlay .glass-panel` dans css/layout.css).
    // Un sélecteur d'identifiant bat cette règle-là sans le vouloir : la
    // fenêtre se recroquevillerait au milieu d'un cadre fait pour elle.
    assert.ok(FEUILLE.includes('html:not(.volet-atelier) #path-policy-modal .glass-panel'),
        'la règle de largeur doit s\'effacer devant le volet de l\'atelier');
});

test('LES RÉGLAGES SIMPLES NE S\'ÉTIRENT PAS AVEC LA FENÊTRE', () => {
    // LA MÊME LEÇON QUE `#student-config-modal` : « un panneau de 680 px pour
    // trois réglages laissait une trentaine de centimètres de vide entre
    // chaque libellé et son champ : l'œil devait traverser le panneau pour
    // relier les deux. » À 900 px, « Essais autorisés par question » et sa
    // case se retrouvaient séparés de plus de mille pixels.
    const corps = corpsDeLaRegle(FEUILLE,
        '#path-policy-modal .cfg-field:not(.cfg-field--wide):not(.cfg-field--long)',
        { ou: 'css/modules.css' });
    assert.ok(declare(corps, 'max-width'),
        'le libellé et son champ doivent rester côte à côte');
    // ET `--wide` EST ÉPARGNÉ : c'est la liste « Présentation », dont les
    // options sont des phrases entières. Elle a été écrite pour prendre la
    // ligne, et la borner recouperait le texte que cette correction dégage.
    // Le `:not()` est DANS le sélecteur ci-dessus — `corpsDeLaRegle` jette si
    // la règle change de nom —, et rien ne doit borner les champs en bloc.
    assert.ok(!/#path-policy-modal \.cfg-field \{/.test(FEUILLE),
        'la borne ne doit pas s\'appliquer à TOUS les champs');
});
