// LA ZONE DE DÉPÔT DU PARCOURS DESCEND JUSQU'EN BAS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture de l'atelier à l'appui :
//
//   « dans la zone de création de parcours, la zone ou on dragge pourrait aller
//     jusqu'en bas mais le cadre autour des exercices restent tel quel, est ce
//     clair, c'est juste que sous le cadre qui a les exercices du parcours, ca
//     ne réagit pas quand on glisse un exercice »
//
// MESURÉ AVANT (tools/tmp/zoneDeDepot.mjs, 1440 × 900, deux étapes au
// parcours) : le cadre s'arrête à 585 px, la colonne descend à 900. Trois cent
// quinze pixels où l'on amène un exercice, et où `elementFromPoint` ne trouve
// AUCUN écouteur de dépôt. Le professeur lâche, rien ne tombe, et rien ne lui
// dit pourquoi.
//
// MESURÉ APRÈS (tools/tmp/lacherSousLeCadre.mjs), le geste entier, à la
// souris, depuis la bibliothèque : 2 étapes → 3, et le cadre s'allume pendant
// le vol.
//
// ── CE QUE CETTE ÉPREUVE GARDE ─────────────────────────────────────────────
//
// La SÉPARATION, qui est toute la demande : la zone qui accepte n'est plus le
// cadre qui s'allume. Si les deux redevenaient le même élément, de deux
// manières seulement :
//
//   · en rendant le cadre à `dansLaZoneDeDepot` — le défaut revient à
//     l'identique, au doigt comme à la souris ;
//   · en faisant grandir le cadre avec la zone — le défaut part, mais Rémy
//     perd le cadre qu'il voulait « tel quel ».

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sansCommentaires } from './helpers.mjs';
import { lireFeuille, corpsDeLaRegle, declare, valeurDe } from './aidesCss.mjs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

/**
 * Un document minuscule : deux rectangles, et `getElementById` qui les rend.
 *
 * LA ZONE EST PLUS HAUTE QUE LE CADRE, et c'est la seule chose qui compte —
 * c'est la géométrie que Rémy décrit. On reproduit ses mesures : un cadre qui
 * s'arrête à 585, une enveloppe qui descend à 880.
 */
function monterDeuxRectangles({ zone = true } = {}) {
    const cadre = { getBoundingClientRect: () => ({ left: 100, right: 1300, top: 292, bottom: 585, width: 1200, height: 293 }) };
    const enveloppe = { getBoundingClientRect: () => ({ left: 100, right: 1300, top: 258, bottom: 880, width: 1200, height: 622 }) };
    globalThis.document = {
        getElementById: (id) => {
            if (id === 'path-container') return cadre;
            if (id === 'path-collapsible-wrapper') return zone ? enveloppe : null;
            return null;
        }
    };
    return { cadre, enveloppe };
}

const charger = () => import('../js/ui/zoneDeDepotParcours.js');

test('LE VIDE SOUS LE CADRE ACCEPTE LE DÉPÔT', async () => {
    const { dansLaZoneDeDepot } = await charger();
    monterDeuxRectangles();
    // LE POINT DE LA CAPTURE : vingt pixels sous le cadre. C'est là que le
    // professeur lâche, et c'est là que rien ne tombait.
    assert.equal(dansLaZoneDeDepot(700, 605), true,
        'vingt pixels sous le cadre, on doit pouvoir déposer');
    // ET TOUT LE RESTE DE LA COLONNE AVEC : 295 px plus bas, c'est encore oui.
    assert.equal(dansLaZoneDeDepot(700, 879), true);
    // DANS LE CADRE AUSSI, évidemment — la zone le contient.
    assert.equal(dansLaZoneDeDepot(700, 400), true);
});

test('MAIS PAS AU-DELÀ DE LA ZONE', async () => {
    // UNE ZONE QUI ACCEPTE TOUT N'EST PLUS UNE ZONE : on déposerait depuis la
    // bibliothèque sur la bibliothèque, et depuis le volet des réglages.
    const { dansLaZoneDeDepot } = await charger();
    monterDeuxRectangles();
    assert.equal(dansLaZoneDeDepot(700, 890), false, 'sous l\'enveloppe, c\'est dehors');
    assert.equal(dansLaZoneDeDepot(700, 200), false, 'au-dessus aussi');
    assert.equal(dansLaZoneDeDepot(50, 400), false, 'à gauche de la colonne aussi');
    assert.equal(dansLaZoneDeDepot(1400, 400), false);
});

test('SANS ENVELOPPE, ON RETOMBE SUR LE CADRE — jamais sur rien', async () => {
    // Une page plus ancienne, un essai qui ne monte qu'une partie de l'atelier :
    // mieux vaut la zone d'avant que plus de zone du tout. Le dépôt redevient
    // alors ce qu'il était, et il fonctionne.
    const { dansLaZoneDeDepot, laZoneDeDepot } = await charger();
    const { cadre } = monterDeuxRectangles({ zone: false });
    assert.equal(laZoneDeDepot(), cadre);
    assert.equal(dansLaZoneDeDepot(700, 400), true, 'le cadre accepte toujours');
    assert.equal(dansLaZoneDeDepot(700, 605), false, 'et lui seul, faute de mieux');
});

test('UNE ENVELOPPE REPLIÉE N\'EST PAS UNE ZONE', async () => {
    // Sur téléphone, `initPreviewModes` replie l'enveloppe en lui posant
    // `display: none` : son rectangle tombe alors à zéro, et DEUX BORNES ÉGALES
    // disent « dedans » à qui compare bêtement. On déposerait sur un parcours
    // que le professeur ne voit pas.
    const { dansLaZoneDeDepot } = await charger();
    globalThis.document = {
        getElementById: (id) => id === 'path-collapsible-wrapper'
            ? { getBoundingClientRect: () => ({ left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 }) }
            : null
    };
    assert.equal(dansLaZoneDeDepot(0, 0), false);
});

test('LA SOURIS ÉCOUTE SUR LA ZONE ET ALLUME LE CADRE', () => {
    const B = sansCommentaires(lire('js/ui/builder.js'));
    // LES TROIS ÉCOUTEURS SUR LA ZONE : il en faut trois, et c'est `ondrop` qui
    // compte. `ondragover` sans `preventDefault` ferait refuser le dépôt par le
    // navigateur lui-même — un cadre qui s'allume et ne reçoit rien.
    assert.match(B, /const zone = laZoneDeDepot\(\);/);
    assert.match(B, /zone\.ondragover = \(e\) => \{ e\.preventDefault\(\); pathBox\.classList\.add\('drag-over'\); \};/);
    assert.match(B, /zone\.ondrop = \(e\) => handleDrop\(e, pathBox\);/);
    // ET C'EST LE CADRE QUI S'ALLUME, pas la zone : « le cadre autour des
    // exercices restent tel quel ». Une zone qui s'allumerait peindrait
    // trois cents pixels de colonne.
    assert.ok(!/zone\.classList\.add\('drag-over'\)/.test(B),
        'c\'est le cadre qui s\'allume, pas la zone');
    // LE CLIGNOTEMENT : `dragleave` part aussi quand on entre dans un enfant.
    assert.match(B, /if \(!e\.relatedTarget \|\| !zone\.contains\(e\.relatedTarget\)\)/);
});

test('ET LE DOIGT LIT LA MÊME RÈGLE', () => {
    // SI CELLE-CI TOMBAIT, le dépôt au doigt garderait le défaut qu'on vient de
    // corriger à la souris — et Rémy travaille sur tablette. Une règle écrite
    // deux fois finit toujours par ne plus se comporter pareil.
    const N = sansCommentaires(lire('js/ui/navigation.js'));
    assert.match(N, /import \{ dansLaZoneDeDepot \} from '\.\/zoneDeDepotParcours\.js';/);
    assert.match(N, /box\.classList\.toggle\('drag-over', dansLaZoneDeDepot\(e\.clientX, e\.clientY\)\)/);
    assert.match(N, /if \(dragging && dansLaZoneDeDepot\(e\.clientX, e\.clientY\)\) auDepot\(\);/);
    // ET PLUS AUCUNE COMPARAISON AU RECTANGLE DU CADRE : c'était le défaut.
    assert.ok(!/e\.clientY >= r\.top && e\.clientY <= r\.bottom/.test(N),
        'le doigt ne doit plus mesurer sur le cadre');
});

test('L\'ENVELOPPE PREND LA PLACE QUI RESTE, LE CADRE NON', () => {
    const FEUILLE = lireFeuille('css/layout.css');
    const corps = corpsDeLaRegle(FEUILLE, '#path-collapsible-wrapper', { ou: 'css/layout.css' });
    // `flex: 1` SEUL NE SUFFIT PAS : la colonne est une colonne flexible, et
    // sans `flex-direction: column` sur l'enveloppe, le cadre se poserait à
    // côté du bandeau au lieu d'en dessous.
    assert.ok(declare(corps, 'display', 'flex'));
    assert.ok(declare(corps, 'flex-direction', 'column'));
    const f = valeurDe(corps, 'flex');
    assert.ok(f, 'l\'enveloppe n\'a plus de part dans la colonne');
    // GRANDIR OUI, RÉTRÉCIR NON : à vingt étapes, le contenu dépasse la
    // colonne, et un `flex-shrink` de 1 l'écraserait sous sa propre hauteur
    // au lieu de laisser la colonne défiler.
    const m = /^(\d+)\s+(\d+)/.exec(f);
    assert.ok(m, `« ${f} » ne dit pas comment l'enveloppe grandit`);
    assert.ok(Number(m[1]) >= 1, 'l\'enveloppe doit prendre la place qui reste');
    assert.equal(m[2], '0', 'et ne jamais se laisser écraser');

    // LE CADRE, LUI, RESTE TEL QUEL. Mesuré avant ET après : 293 px de haut
    // dans les deux cas. S'il recevait un `flex: 1` à son tour, il se
    // remplirait de la colonne entière — le défaut serait corrigé et la
    // demande trahie.
    const UI = lireFeuille('css/ui.css');
    const cadre = corpsDeLaRegle(UI, '#path-container', { ou: 'css/ui.css' });
    assert.ok(!declare(cadre, 'flex-grow'), 'le cadre ne doit pas grandir');
    assert.ok(!/^\s*flex\s*:\s*[1-9]/m.test(cadre), 'le cadre ne doit pas grandir');
    // ET IL GARDE SA HAUTEUR MINIMALE : c'est elle qui donne un cadre à viser
    // quand le parcours est vide.
    assert.ok(declare(cadre, 'min-height'));
});
