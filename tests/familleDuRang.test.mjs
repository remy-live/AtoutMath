// « 8. DIVISER ET LE ... » — DE QUOI EST-IL LE HUITIÈME ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, devant les résultats de recherche : « pourquoi j'ai des noms
// d'exercices avec un numéro devant du genre 8. Diviser et le ... »
//
// Vingt exercices portent un rang dans leur titre : les douze barreaux des
// fractions, les huit des racines. Ce rang dit une place dans UNE échelle. Dans
// l'arbre, le dossier au-dessus dit laquelle ; à plat — en recherche — rien ne
// le disait, et le mot « diviser » ramène à lui seul « 7. Diviser par un
// entier », « 8. Diviser par une fraction » ET « 8. Diviser, et le dénominateur
// qu'on rend entier ».
//
// CE QUE CES ÉPREUVES GARDENT, et ce qu'elles ne peuvent pas garder. La mise en
// page — la famille au-dessus du titre, la rangée qui ne grandit pas — se
// mesure dans un navigateur, et c'est `tools/famillesNumerotees.mjs` qui le
// fait. Ici, on garde les trois choses qui se perdent en silence :
//
//   1. la RÈGLE : un titre numéroté a une famille, et elle est lisible ;
//   2. le CATALOGUE : aucun titre numéroté n'y échappe — c'est cette épreuve
//      qui attrapera la prochaine famille numérotée mal rangée ;
//   3. la VUE qui la demande : une seule, celle qui montre les exercices hors
//      de leur dossier. Rendue partout, elle écrirait « Fractions » douze fois
//      sous un dossier qui s'appelle « Fractions ».

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { exercices } from '../js/data/catalog.js';
import { familleSiNumerote, TITRE_NUMEROTE } from '../js/core/rangement.js';
import { lireFeuille, corpsDeLaRegle, declare } from './aidesCss.mjs';

const lire = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

const exo = (title, chemin) => ({ id: 'x', title, tags: { chemin } });

test('UN TITRE NUMÉROTÉ REND SA FAMILLE, UN AUTRE NE REND RIEN', () => {
    assert.equal(familleSiNumerote(exo('8. Diviser par une fraction',
        ['Numérique', 'Fractions'])), 'Fractions');
    assert.equal(familleSiNumerote(exo('12. Une fraction de fractions',
        ['Numérique', 'Fractions'])), 'Fractions', 'un rang à deux chiffres compte aussi');
    // SANS RANG, PAS DE PASTILLE. « Le Chasseur de Diviseurs » se nomme tout
    // seul : lui coller « Numérique » devant n'ajouterait rien et prendrait la
    // place du titre.
    assert.equal(familleSiNumerote(exo('Le Chasseur de Diviseurs',
        ['Numérique', 'Divisibilité'])), '');
    // Un nombre qui n'est pas un rang : il faut le point ET l'espace.
    assert.equal(familleSiNumerote(exo('1000 et des poussières', ['A', 'B'])), '');
    assert.equal(familleSiNumerote(exo('3.14 ou presque', ['A', 'B'])), '');
});

test('LE DOMAINE SEUL NE RÉPOND PAS À LA QUESTION, ON REND DONC LE VIDE', () => {
    // « Numérique · 8. Diviser… » ne dit pas de quelle échelle 8 est le rang :
    // le domaine en contient plusieurs. Mieux vaut rien qu'un mot qui occupe la
    // place de la réponse sans la donner — et l'épreuve du catalogue, plus bas,
    // exige qu'aucun exercice réel ne tombe dans ce cas.
    assert.equal(familleSiNumerote(exo('8. Diviser par une fraction', ['Numérique'])), '');
    assert.equal(familleSiNumerote(exo('8. Diviser par une fraction', [])), '');
    assert.equal(familleSiNumerote({ id: 'x', title: '8. Sans étiquettes' }), '');
    assert.equal(familleSiNumerote(null), '');
});

test('AUCUN TITRE NUMÉROTÉ DU CATALOGUE N\'EST SANS FAMILLE', () => {
    const numérotés = exercices.filter((e) => TITRE_NUMEROTE.test(e.title || ''));
    // SANS CE PLANCHER, L'ÉPREUVE RÉPOND « TOUT VA BIEN » EN NE LISANT RIEN.
    // Vingt titres numérotés au 14 octobre 2026 : douze barreaux de fractions,
    // huit de racines. En dessous de dix-huit, ce balayage ne couvre plus les
    // deux familles, et c'est l'épreuve qu'il faut relire — pas le catalogue.
    assert.ok(numérotés.length >= 18,
        `seulement ${numérotés.length} titre(s) numéroté(s) lus : le balayage ne mesure plus rien`);
    const sans = numérotés.filter((e) => !familleSiNumerote(e)).map((e) => `${e.id} « ${e.title} »`);
    assert.deepEqual(sans, [],
        'ces exercices portent un rang que rien ne rattache à une échelle : '
        + 'leur `tags.chemin` s\'arrête au domaine');
    // ET C'EST BIEN PARCE QU'IL Y EN A PLUSIEURS QUE LE RANG SEUL NE SUFFIT
    // PAS : avec une seule famille numérotée, « 8. » n'aurait jamais été
    // ambigu, et cette pastille n'aurait pas lieu d'être.
    const familles = new Set(numérotés.map((e) => familleSiNumerote(e)));
    assert.ok(familles.size >= 2, `une seule famille numérotée (${[...familles]})`);
});

test('UNE SEULE VUE DEMANDE LA FAMILLE : CELLE QUI MONTRE LES EXERCICES À PLAT', () => {
    const nav = lire('js/ui/navigation.js');
    // Les appels, et pas la déclaration de la fonction : on écarte le morceau
    // précédé de « function ».
    const bouts = nav.split('createLibraryItem(');
    const appels = bouts.slice(1)
        .filter((_, i) => !/function\s+$/.test(bouts[i]))
        .map((s) => s.slice(0, 60));
    assert.ok(appels.length >= 3,
        `${appels.length} appel(s) à createLibraryItem : l'épreuve ne voit plus les trois vues`);
    const avec = appels.filter((a) => a.includes('horsDossier'));
    assert.equal(avec.length, 1,
        'la famille se demande UNE fois — sous un dossier nommé « Fractions », '
        + 'douze lignes « Fractions » ne répondent à aucune question');

    // ET C'EST LA BONNE VUE. Un `horsDossier` posé sur l'arbre passerait le
    // compte ci-dessus sans rien résoudre.
    const drill = nav.indexOf('export function renderDrilldown');
    assert.notEqual(drill, -1, 'renderDrilldown a changé de nom');
    const branche = nav.indexOf('if (state.searchQuery', drill);
    assert.notEqual(branche, -1, 'la branche « recherche » a disparu de renderDrilldown');
    assert.ok(nav.slice(branche, branche + 900).includes('horsDossier: true'),
        'la liste à plat de la recherche n\'est plus celle qui demande la famille');
});

test('LA PILE GARDE L\'ELLIPSE, ET LA RANGÉE SA HAUTEUR', () => {
    const css = lireFeuille(new URL('../css/components.css', import.meta.url));
    const pile = corpsDeLaRegle(css, '.exo-item-texte', { ou: 'components.css' });
    assert.ok(declare(pile, 'flex-direction', 'column'),
        'la famille doit se poser AU-DESSUS du titre : mesuré à côté, « Racines '
        + 'carrées » laissait 90 px de titre sur 269 et trois lignes sur vingt y '
        + 'perdaient leur premier mot');
    // `min-width: 0` N'EST PAS UNE COQUETTERIE : sans lui, un enfant de boîte
    // flexible refuse de descendre sous la largeur de son texte, et
    // `text-overflow: ellipsis` ne coupe plus rien — la ligne déborde.
    assert.ok(declare(pile, 'min-width', '0'), 'sans min-width: 0, l\'ellipse ne coupe plus');

    const rangee = corpsDeLaRegle(lireFeuille(new URL('../css/ui.css', import.meta.url)),
        '.exo-list-item', { ou: 'ui.css' });
    assert.ok(declare(rangee, 'height', '44px'),
        'deux lignes de texte dans la rangée, et c\'est sa hauteur fixe qui garde '
        + 'la colonne régulière — « une sensation d\'oppression » venait de '
        + 'rangées de 50 à 79 px');
});
