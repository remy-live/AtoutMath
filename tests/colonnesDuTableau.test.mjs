// LE TABLEAU DE NUMÉRATION A SEPT COLONNES ÉGALES QUI TIENNENT DANS L'ÉCRAN.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture d'iPhone du 13 octobre : « colonnes qui ne sont pas de même
// largeur ». Mesuré au doigt : 19,2 px d'écart — « unités » 35,2 px,
// « centièmes » 54,4 px. Mesuré après : 45,4 px aux sept.
//
// ── POURQUOI UNE ÉPREUVE SUR LA FEUILLE DE STYLE ──────────────────────────
//
// Les quatre déclarations gardées ici ne se tiennent que l'une par l'autre, et
// chacune se retire SANS RIEN CASSER DE VISIBLE sur l'écran où l'on travaille :
//
// · remettre une largeur par cellule fait taire `table-layout: fixed` — et le
//   tableau redevient inégal, exactement comme sur la capture de Rémy ;
// · remettre une largeur fixe sur la table égalise, mais la fait DÉPASSER :
//   mesuré, elle finissait à x=406,6 dans une fenêtre de 390 px ;
// · retirer `container-type` du cadre ne casse rien à la souris : les `cqi` de
//   l'en-tête tombent alors sur le bloc racine, et c'est au téléphone,
//   quelques semaines plus tard, que « centièmes » déborde de sa colonne ;
// · rendre au panneau son `max-width` rétrécit tout le tableau — 390 px
//   deviennent 358,2 — pour une raison (une circularité de mesure) qu'on ne
//   retrouve pas deux fois.
//
// ── CE QU'ELLE NE REMPLACE PAS ────────────────────────────────────────────
//
// `tools/tmp/essaiColonnes4.mjs` ouvre l'exercice sur quatre largeurs d'écran
// et MESURE les colonnes, le débordement et les mots coupés. C'est lui qui a
// trouvé le défaut et choisi le correctif ; celle-ci garde le correctif choisi,
// et elle est quatre minutes plus rapide.

import test from 'node:test';
import assert from 'node:assert/strict';
import { lireFeuille, corpsDeLaRegle as aideCorps, declare } from './aidesCss.mjs';

// LES DEUX AIDES VIVENT DANS `tests/aidesCss.mjs` DEPUIS QU'ELLES ÉTAIENT
// ÉCRITES TROIS FOIS — ici, dans `sceneDuSprint` et dans `cadreDuTableauCroise`,
// avec, les trois fois, le même commentaire sur le piège de `\b`. Une leçon
// écrite trois fois est une leçon qu'on réapprendra une quatrième.
const CSS = lireFeuille('css/modules.css');
const corpsDeLaRegle = (selecteur) =>
    aideCorps(CSS, selecteur, { ou: 'css/modules.css — le tableau de numération' });

test('AUCUNE CELLULE DU TABLEAU NE DÉCLARE SA LARGEUR', () => {
    // C'est la déclaration qui faisait le défaut de Rémy : sous
    // `table-layout: fixed`, le navigateur répartit à égalité TOUT SEUL, mais
    // seulement si personne ne lui dicte de largeur. L'ancien `width: 3.1em`
    // se résolvait en plus sur la police de chaque cellule — `.66rem` dans un
    // en-tête, `1rem` dans une case —, d'où 33 px d'un côté et 50 de l'autre.
    const cellules = corpsDeLaRegle('.tn-tab th, .tn-tab td');
    assert.ok(!declare(cellules, 'width'),
        'une cellule du tableau de numération déclare de nouveau sa largeur.\n'
        + 'Sous `table-layout: fixed`, cela reprend la répartition au navigateur\n'
        + 'ET fixe la largeur minimale de la table, qui ressortira de l\'écran.\n'
        + 'Rémy : « colonnes qui ne sont pas de même largeur ».\n'
        + `      ${cellules.trim().replace(/\s+/g, ' ').slice(0, 110)}`);
});

test('LA TABLE REMPLIT LA PLACE AU LIEU DE L\'IMPOSER', () => {
    const table = corpsDeLaRegle('.tn-tab');
    assert.ok(declare(table, 'width', '100%'),
        'le tableau de numération ne demande plus `width: 100%`. Avec une largeur\n'
        + 'fixe, les colonnes sont égales mais le tableau sort de l\'écran : mesuré,\n'
        + 'il finissait à x=406,6 dans une fenêtre de 390 px.');
    assert.ok(/\btable-layout\s*:\s*fixed/.test(table),
        '`table-layout: fixed` a disparu : c\'est LUI qui répartit les sept\n'
        + 'colonnes à égalité, et rien d\'autre ne le fait.');
});

test('LES « cqi » DE L\'EN-TÊTE ONT TOUJOURS LEUR CONTENEUR', () => {
    // LA PAIRE EST LE SUJET. Une unité `cqi` sans conteneur ne lève aucune
    // erreur : elle se résout sur le bloc racine. À la souris, personne ne voit
    // rien ; au téléphone, « centièmes » déborde de sa colonne.
    const entete = corpsDeLaRegle('.tn-tab th');
    const cadre = corpsDeLaRegle('.tn-cadre');
    // `/\bcqi\b/` NE MARCHE PAS, et l'erreur est passée inaperçue une fois :
    // dans « 2.7cqi », il n'y a pas de frontière de mot entre le 7 et le c —
    // les deux sont des caractères de mot. L'épreuve tombait alors sur du code
    // sain, en désignant une règle qui contenait pourtant bien ce qu'elle
    // cherchait.
    if (/\d\s*cqi\b/.test(entete)) {
        assert.ok(/container-type\s*:/.test(cadre),
            'l\'en-tête du tableau se mesure en `cqi` mais `.tn-cadre` ne déclare\n'
            + 'plus `container-type` : les `cqi` tombent alors sur le bloc racine,\n'
            + 'sans la moindre erreur, et « centièmes » débordera au téléphone.');
    } else {
        assert.fail(
            'l\'en-tête du tableau ne se mesure plus sur la place disponible.\n'
            + 'À 390 px les colonnes font 45,4 px et « centièmes » en demande 52,4\n'
            + 'à `.66rem` : avec une police fixe, le mot est coupé.\n'
            + `      ${entete.trim().replace(/\s+/g, ' ').slice(0, 110)}`);
    }
});

test('LE PANNEAU QUI PORTE LE TABLEAU A UNE LARGEUR DÉFINIE', () => {
    // `max-width` ne suffit pas, et la raison ne se retrouve pas deux fois : la
    // largeur du panneau viendrait de son contenu, dont la police se mesure sur
    // la largeur du panneau. Le navigateur tranche par le plus petit, et tout
    // rétrécit — 390 px de table devenaient 358,2 px.
    const panneau = corpsDeLaRegle('.np-outil:has(.tn-cadre)');
    assert.ok(declare(panneau, 'width', 'min\\('),
        'le panneau du tableau de numération n\'a plus de largeur définie.\n'
        + 'Il se dimensionnera sur son contenu, dont la police se mesure sur lui :\n'
        + 'le navigateur tranchera par la plus petite et tout rétrécira.');
});
