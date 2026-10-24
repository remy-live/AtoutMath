// LES QUATRE FAMILLES DE BOUTONS ÉTIRÉS, ET CE QUI LES A REMISES D'APLOMB.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, le 13 octobre : « oui, à corriger ». La question posée était celle des
// 43 boutons « nettement plus hauts que larges » que `tools/boutonsEtires.mjs`
// signalait — pas des ovales, et jamais signalés par lui.
//
// ── CE QUE LA MESURE A APPRIS, ET QUI A CHANGÉ LES CORRECTIONS ──────────────
//
// L'outil confondait DEUX causes sous un seul mot, et la distinction décide de
// la correction :
//
//     hauteur ≈ 44 px   → c'est LE PLANCHER TACTILE qui étire. Le jeu déclare
//                         une largeur, reçoit une hauteur qu'il n'a pas
//                         demandée, et personne ne le sait.
//     hauteur > 44 px   → c'est LE JEU. Sa feuille dit souvent pourquoi, et
//                         l'on a failli « corriger » une cible du jeu des
//                         Diviseurs qui porte simplement deux lignes empilées.
//
// Sur les 53 signalés : 32 par le plancher, 21 par leur jeu.
//
// ── ET LE PLANCHER NE SE ROGNE JAMAIS ──────────────────────────────────────
//
// 44 px est la pulpe d'un index, et c'est la règle qui — contournée — a produit
// les ovales que Rémy a signalés DEUX fois. Aucune des quatre corrections ne
// descend sous 44 : on ÉLARGIT, ou le jeu DÉCLARE que sa hauteur est sa mise
// en page (`btn-carre`), ce que le plancher prévoit noir sur blanc.
//
// ── CE QUE CHACUNE GARDE ────────────────────────────────────────────────────
//
// Ces quatre épreuves lisent la SOURCE, et pas un écran, pour une raison
// mesurée : un bouton trop étroit s'affiche parfaitement. Rien ne rougit, rien
// ne déborde, aucune erreur de page — seul le doigt d'un élève de sixième rate
// la touche, et cela ne se mesure pas depuis ici. Trois des quatre valeurs
// n'ont d'ailleurs jamais été signalées en un an.

import test from 'node:test';
import assert from 'node:assert/strict';
import { lireFeuille, corpsDeLaRegle, declare, valeurDe } from './aidesCss.mjs';

test('LE PAVÉ DU DUEL REND SA PLACE AU COULOIR', () => {
    // MESURÉ sur 390 × 844, avant et après : la touche passe de 27,3 × 74 à
    // 31,1 × 58, et le terrain de 394,8 à 426,8 px — trente-deux pixels rendus
    // au jeu. Rémy les demandait deux fois : « une seule rangée de chiffres et
    // tout le reste le plateau de jeu ».
    //
    // LA RÈGLE SE LIT DANS LE DERNIER BLOC QUI LA FIXE, et c'est le piège de
    // ce fichier : la hauteur du pavé est posée à trois endroits, et une
    // requête de conteneur n'ajoute aucune spécificité — seul l'ordre tranche.
    // La feuille le dit elle-même : « CE BLOC VIENT EN DERNIER ».
    const jeu = lireFeuille('js/games/duel.js');
    const pave = corpsDeLaRegle(jeu, '.du-pave, .du-tables', {
        apres: '@container plateau (max-width: 560px)', ou: 'js/games/duel.js' });

    const hauteur = valeurDe(pave, 'height');
    assert.ok(hauteur, 'le pavé du téléphone ne fixe plus sa hauteur.');
    const plafond = Number((hauteur.match(/,\s*(\d+)px\s*\)/) || [])[1]);
    assert.ok(plafond <= 58,
        `le pavé du Duel plafonne à ${plafond} px de haut au lieu de 58.\n`
        + '      Onze touches sur 390 px ne font que 31 px de large : à 74 px de\n'
        + '      haut, la touche est 2,4 fois plus haute que large, et le couloir\n'
        + '      où circule la balle perd trente-deux pixels par camp.');
    assert.ok(plafond >= 44,
        `le pavé du Duel plafonne à ${plafond} px : sous le plancher tactile de 44.`);

    // SEIZE POUR CENT DU CLAVIER PARTAIT EN AIR, et c'est là qu'étaient les six
    // pixels manquants : `clamp(2px, .8cqh, 6px)` se mesure sur la HAUTEUR du
    // conteneur, qui vaut 736 px sur un téléphone debout — donc le plafond.
    const espace = valeurDe(pave, 'gap');
    assert.ok(espace && /^\d/.test(espace) && parseFloat(espace) <= 3,
        `l'espace entre les touches du Duel vaut « ${espace} ».\n`
        + '      Dix espaces de 6 px prennent 59 px des 370 que le pavé a en\n'
        + '      largeur, c\'est-à-dire aux touches, qui sont déjà les plus\n'
        + '      étroites du catalogue.');
});

test('LE JETON DES ANAGRAMMES A LA TAILLE DE LA CASE OÙ IL TOMBE', () => {
    // MESURÉ : case 29 × 33,4 et jeton 29 × 44 AVANT ; les deux à 29 × 33,4
    // APRÈS. Les deux se dessinent sur la même variable — ils doivent
    // coïncider, puisque le jeton va se poser dans la case —, mais le plancher
    // tactile épargne tout bouton dont le nom contient « case » et ne pouvait
    // pas devenir « jeton » : il cassait donc UNE SEULE des deux moitiés.
    //
    // C'est exactement le défaut que `btn-carre` existe pour clore, et le
    // plancher l'écrit : « btn-carre remplace la devinette par une
    // DÉCLARATION ».
    const jeu = lireFeuille('js/games/anagrammes.js');
    assert.match(jeu, /class="an-jeton btn-carre/,
        'le jeton des Anagrammes ne déclare plus `btn-carre`.\n'
        + '      Le plancher tactile lui rendra 44 px de haut pendant que sa case\n'
        + '      en gardera 33 : un jeton plus haut que la case où il doit tomber.');

    // ET LA CASE ET LE JETON CONTINUENT DE PARTAGER LEUR VARIABLE. Sans cela,
    // la déclaration ci-dessus ne garantirait plus rien : deux tailles libres
    // se mettraient d'accord par hasard, puis cesseraient.
    const jeton = corpsDeLaRegle(jeu, '.an-jeton', { ou: 'js/games/anagrammes.js' });
    assert.ok(declare(jeton, 'width', 'var\\(--an-cote\\)'),
        'le jeton ne se dimensionne plus sur --an-cote, la variable de la case.');
});

test('LES BOUTONS DE PAS DE L\'HORLOGE SONT CARRÉS DE 44 PX', () => {
    // LE DÉSACCORD ÉTAIT ÉCRIT, et c'est le plus net des quatre : la règle du
    // téléphone demande un carré de 26 px, le plancher lui en donne 44 de
    // haut. Le bouton n'était donc ni ce que le style demandait, ni ce que le
    // plancher voulait.
    //
    // « − une heure » s'appuie dix fois de suite pour régler une pendule :
    // déclarer `btn-carre` rendrait un carré de 26 px, c'est-à-dire la cible
    // que le plancher existe pour empêcher. On suit le plancher.
    //
    // MESURÉ après coup sur 390 × 844 : quatre boutons de 44 × 44, bord droit
    // à 368 px des 390, aucun défilement horizontal.
    const css = lireFeuille('css/modules.css');
    const pas = corpsDeLaRegle(css, '.hg-pas-btn', {
        apres: '@media (max-width: 480px) and (pointer: coarse)', ou: 'css/modules.css' });
    assert.ok(declare(pas, 'width', '44px') && declare(pas, 'height', '44px'),
        `les boutons de pas de l'horloge ne sont plus 44 × 44 : « ${pas.trim()} ».\n`
        + '      Ils retombent à 26 px de large pour 44 de haut — sous la pulpe\n'
        + '      d\'un index, sur une commande qu\'on appuie dix fois de suite.');
});

test('LA CLEF DU MOT CODÉ RESTE UNE CIBLE TOUCHABLE', () => {
    // CE QUE LA MESURE A DIT, et qui a changé la correction : le rapport de
    // forme de cette clef NE SE CORRIGE PAS.
    //
    //     24 px de large →  24 × 44    = 1,83×
    //     34 px          →  34 × 46,6  = 1,37×
    //     36 px          →  36 × 49,2  = 1,37×
    //
    // La clef porte la lettre ET son numéro dessous, dont la taille s'écrit
    // `calc(var(--mk-c) * .34)` : le numéro grandit avec la lettre, et la
    // forme est la même à toutes les tailles. 1,37 EST la forme d'une lettre
    // avec son numéro sous elle.
    //
    // On ne garde donc pas un rapport — on garde la CIBLE : 24 px de large
    // était sous la pulpe d'un index, et c'est par cette clef qu'on choisit la
    // lettre à poser.
    const jeu = lireFeuille('js/games/motCode.js');
    const clef = corpsDeLaRegle(jeu, '.mk-clef', { ou: 'js/games/motCode.js' });
    const cote = valeurDe(clef, '--mk-c');
    assert.ok(cote, 'la clef du Mot Codé ne déclare plus sa taille.');
    const plancher = Number((cote.match(/clamp\(\s*(\d+)px/) || [])[1]);
    assert.ok(plancher >= 36,
        `la clef du Mot Codé descend à ${plancher} px de large au lieu de 36.\n`
        + '      Vingt lettres à 36 + 3 px tiennent en deux rangées, comme à 24 :\n'
        + '      l\'élargir ne coûte RIEN et double la surface de la cible.');
});
