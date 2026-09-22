// « LE MODE ET BARÈME NE FAIT PAS DOUBLON AVEC LES PARAMÈTRES ? »
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « est ce que dans la zone prof le mode et barème ne fait pas doublon
// avec les paramètres, ne fait aucune modification ».
//
// DEUX ACCUSATIONS, ET IL FALLAIT LES SÉPARER.
//
// « NE FAIT AUCUNE MODIFICATION » — non, c'est faux, et la sonde
// `tools/tmp/modeEtBareme.mjs` l'a mesuré dans l'application, en cliquant
// vraiment :
//
//   avant : mode entrainement · 2 essais · aides oui · note — · ordre imposé
//   après : mode evaluation   · 3 essais · aides non · note 20 · ordre libre
//
// …et le bandeau du parcours s'est réécrit tout seul : « Évaluation : une
// seule réponse par question, sans aide. Noté sur 20. L'ordre des exercices
// est libre. » Cinq réglages changés d'un clic, et l'écran qui le redit.
//
// « FAIT DOUBLON » — oui, mais pas là où on le croit. Le doublon n'était pas
// dans ce que font les deux panneaux : il était dans leurs SIGNES.
//
//   · le bouton voisin portait un ENGRENAGE, qui veut dire « réglages »
//     partout et dans toutes les applications ;
//   · son infobulle annonçait « mode de la séance » ;
//   · et le panneau qu'il ouvre — « Donner ce parcours » — ne contient aucun
//     mode : des classes, des élèves, une date d'ouverture, rien d'autre.
//
// Deux boutons côte à côte promettaient le même réglage, un seul l'avait. Ce
// test tient les deux bouts : qu'un seul bouton parle de mode, et que celui
// qui n'en a pas ne le promette plus.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const html = lire('index.html');

/** L'infobulle et le nom lu à voix haute d'un bouton de la barre. */
function bouton(id) {
    const m = new RegExp(`<button id="${id}"[^>]*>`).exec(html);
    assert.ok(m, `bouton absent : ${id}`);
    const t = /title="([^"]*)"/.exec(m[0]);
    const a = /aria-label="([^"]*)"/.exec(m[0]);
    return { balise: m[0], title: t ? t[1] : '', aria: a ? a[1] : '' };
}

test('UN SEUL BOUTON DE LA BARRE PROMET UN MODE', () => {
    // Nuance qui compte : un bouton a le droit de NOMMER le mode pour dire
    // qu'il est ailleurs — c'est même ce qui répare le malentendu. Ce qu'on
    // interdit, c'est de le promettre sans l'avoir. On sépare donc les deux :
    // une mention suivie d'un renvoi est une indication, pas une promesse.
    const barre = ['btn-path-policy', 'btn-donner-classe', 'btn-test-sequence',
        'btn-generate-code', 'btn-fiche-parcours', 'btn-presentation', 'btn-outils-prof'];
    const RENVOI = /mode[^.]*(se règlent?|voisine|Mode & barème)/i;
    const promettent = barre.filter(id => {
        const t = bouton(id).title;
        return /mode/i.test(t) && !RENVOI.test(t);
    });
    assert.deepEqual(promettent, ['btn-path-policy'],
        `boutons qui promettent un mode : ${promettent.join(', ')}`);
});

test('ET « DONNER » NE PORTE PLUS L\'ENGRENAGE DES RÉGLAGES', () => {
    const b = bouton('btn-donner-classe');
    // L'engrenage de Lucide se reconnaît à son cercle central de rayon 3 et à
    // son long contour à douze dents. C'est lui que Rémy a lu « paramètres ».
    assert.ok(!/circle cx="12" cy="12" r="3"/.test(b.balise),
        'le bouton « donner » porte encore un engrenage');
    assert.match(b.aria, /[Dd]onner/);
    // Et l'infobulle dit où se règle le reste, au lieu de le promettre.
    assert.match(b.title, /icône voisine|Mode & barème|mode et le barème/i);
});

test('LE PANNEAU « DONNER » NE CONTIENT AUCUN MODE — C\'ÉTAIT LA PROMESSE DE TROP', () => {
    // Si un jour on y ajoute vraiment un mode, ce test tombe, et c'est très
    // bien : il faudra alors décider lequel des deux boutons le porte.
    const src = lire('js/ui/donnerSeance.js');
    const formulaire = src.slice(src.indexOf('showModal(\'Donner ce parcours\''),
        src.indexOf('ds-actions'));
    assert.ok(!/evaluation|entrainement|apprentissage/i.test(formulaire),
        'un mode s\'est glissé dans le panneau « Donner »');
});

test('« MODE & BARÈME », LUI, CHANGE VRAIMENT LA POLITIQUE', () => {
    // La sonde l'a mesuré à l'écran ; ici on tient le mécanisme, qui est ce
    // qui rendrait le panneau inerte s'il se cassait : choisir un mode
    // REMPLACE les réglages liés, il ne se contente pas de poser une étiquette.
    const src = lire('js/games/configUI.js');
    const bloc = src.slice(src.indexOf('export function renderPolicyEditor'));
    assert.match(bloc, /data-mode="\$\{MODES\.EVALUATION\}"/);
    // Le bouton de mode appelle bien `onChange` — sans quoi rien ne remonte au
    // parcours, et le panneau serait exactement la décoration que Rémy
    // soupçonnait.
    assert.match(bloc, /onChange\(/);
});

test('ET LE BANDEAU DU PARCOURS DIT CE QUI A CHANGÉ', () => {
    // « Évaluation : une seule réponse par question, sans aide. Noté sur 20.
    // L'ordre des exercices est libre. » C'est la phrase qui prouve au
    // professeur que son clic est arrivé quelque part.
    const pol = lire('js/core/policy.js');
    assert.match(pol, /export function describePolicy/);
    assert.match(pol, /ordre des exercices est libre/);
    assert.match(pol, /Noté sur/);
});
