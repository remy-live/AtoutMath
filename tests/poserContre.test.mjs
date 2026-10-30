// UN FLOTTANT NE DOIT JAMAIS SORTIR DE L'ÉCRAN.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, captures à l'appui : « sur le 9, 10, 11 les paramètres ne sont toujours
// pas accessibles. Depuis tout le temps ! »
//
// Le panneau de réglages s'ouvrait. Il tombait simplement SOUS le bas de
// l'écran — et un panneau qu'on ne voit pas ne se distingue pas d'un bouton
// mort. MESURÉ en balayant les huit engrenages d'une fiche
// (`tools/tmp/sondeRoue3.mjs`), panneaux hors de l'écran :
//
//                          avant    après
//   portable 1400×800      5 / 8    0 / 8
//   grand écran 1920×1080  4 / 8    0 / 8
//   paysage court 900×450  7 / 8    0 / 8
//
// Ce n'était donc pas propre aux trois exercices qu'il nomme : ce sont ceux
// dont le panneau est le plus HAUT — leurs réglages sont des listes à cocher,
// 607 px contre 336 pour un exercice ordinaire —, donc les premiers à déborder.
//
// DEUX DÉFAUTS, ET LE SECOND ÉTAIT NÉ D'UNE CORRECTION :
//   1. le repli ne bornait que le HAUT du flottant, jamais son bas ;
//   2. on mesurait sa hauteur avant que `brancherMarches` ne garnisse la frise
//      — ajoutée, elle, quand Rémy avait signalé que cette même frise ne
//      s'affichait pas. Mesuré : le bloc passe de 265 à 340 px après coup.
//
// Ce test tient l'ARITHMÉTIQUE, avec un DOM de fortune. C'est elle qui se
// casse en silence : un flottant mal posé ne fait échouer aucun rendu, il sort
// seulement de l'écran.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { poserContre, MARGE_ECRAN } from '../js/ui/poserContre.js';

// --- UN DOM DE FORTUNE ------------------------------------------------------
// Le flottant a une taille DONNÉE, et l'on peut la faire changer en cours de
// route : c'est tout l'intérêt, puisque le second défaut était précisément une
// taille qui changeait entre la mesure et l'affichage.

function flottant(largeur, hauteur) {
    const el = {
        style: { maxHeight: '', left: '', top: '' },
        taille: { w: largeur, h: hauteur },
        getBoundingClientRect() {
            const l = parseFloat(el.style.left) || 0;
            const t = parseFloat(el.style.top) || 0;
            // La hauteur obéit à `max-height`, comme dans un vrai navigateur :
            // sans cela, le test dirait que le bornage marche alors qu'il ne
            // serait pas appliqué.
            const plafond = parseFloat(el.style.maxHeight);
            const h = plafond ? Math.min(el.taille.h, plafond) : el.taille.h;
            return { left: l, top: t, width: el.taille.w, height: h,
                right: l + el.taille.w, bottom: t + h };
        }
    };
    return el;
}
const cible = (left, top, w = 24, h = 20) =>
    ({ left, top, width: w, height: h, right: left + w, bottom: top + h });

function ecran(w, h) {
    globalThis.window = { innerWidth: w, innerHeight: h };
}
const bas = (el) => el.getBoundingClientRect().bottom;
const haut = (el) => parseFloat(el.style.top);

test('SOUS SON BOUTON QUAND LA PLACE Y EST', () => {
    ecran(1400, 800);
    const f = flottant(224, 300);
    const { dessous } = poserContre(f, cible(500, 100));
    assert.equal(dessous, true);
    assert.equal(haut(f), 126, '120 (bas du bouton) + 6 d\'écart');
    assert.equal(parseFloat(f.style.left), 500);
});

test('AU-DESSUS QUAND IL N\'Y A PLUS LA PLACE EN DESSOUS', () => {
    ecran(1400, 800);
    const f = flottant(224, 300);
    // Bouton à 600 : 620 + 6 + 300 = 926, il ne tient pas sous les 792
    // disponibles. Au-dessus : 600 − 300 − 6 = 294, il tient.
    const { dessous } = poserContre(f, cible(500, 600));
    assert.equal(dessous, false);
    assert.equal(haut(f), 294);
});

test('LE CAS DE RÉMY : NI DESSOUS NI DESSUS, ET POURTANT DANS L\'ÉCRAN', () => {
    // La Loupe sur la Droite, mesurée : engrenage à y = 783..803 sur un écran
    // de 800, panneau de 607 px. Il ne tient ni sous le bouton (il commencerait
    // à 809) ni au-dessus (783 − 607 − 6 = 170… ce qui tient, justement).
    // Prenons donc le cas vraiment impossible : un bouton au milieu.
    ecran(1400, 800);
    const f = flottant(224, 607);
    poserContre(f, cible(978, 400));
    assert.ok(haut(f) >= MARGE_ECRAN, `posé à ${haut(f)}`);
    assert.ok(bas(f) <= 800 - MARGE_ECRAN, `son bas tombe à ${bas(f)} sur 800`);
    // C'EST CETTE LIGNE QUI MANQUAIT : l'ancien code bornait le haut à 8 et
    // laissait le bas à 8 + 607 = 615… ce qui passait. Le défaut se voyait
    // quand le repli « au-dessus » calculait un y plus grand — c'est le test
    // suivant.
});

test('LE REPLI « AU-DESSUS » EST BORNÉ LUI AUSSI', () => {
    // L'ancien code : `Math.max(8, r.top - haut - 6)`. Avec un bouton bas et un
    // panneau un peu moins haut que l'écran, il rendait un y légal pour le haut
    // et illégal pour le bas. C'est exactement ce que Rémy voyait : 245..852
    // sur un écran de 800.
    ecran(1400, 800);
    const f = flottant(224, 607);
    poserContre(f, cible(978, 858));      // bouton sous le bord, feuille défilée
    const ancien = Math.max(8, 858 - 607 - 6);
    assert.equal(ancien, 245, 'la valeur que l\'ancien calcul donnait');
    assert.equal(ancien + 607, 852, 'et son bas, 52 px sous l\'écran');
    assert.ok(bas(f) <= 800 - MARGE_ECRAN,
        `le nouveau le pose à ${haut(f)}..${bas(f)} sur 800`);
});

test('PLUS HAUT QUE L\'ÉCRAN : IL DÉFILE PLUTÔT QUE DE DÉPASSER', () => {
    // Un téléphone posé en paysage : 450 px de haut, panneau de 607.
    ecran(900, 450);
    const f = flottant(224, 607);
    poserContre(f, cible(600, 200));
    assert.equal(f.style.maxHeight, '434px', '450 − deux marges de 8');
    assert.equal(haut(f), MARGE_ECRAN);
    assert.equal(bas(f), 442, 'il occupe l\'écran, et pas un pixel de plus');
});

test('LA HAUTEUR SE LIT APRÈS QUE LA LARGEUR EST POSÉE', () => {
    // LE SECOND DÉFAUT, celui né d'une correction. Tant que `left` n'est pas
    // écrit, un élément `position: fixed` s'étale et paraît plus court qu'il ne
    // sera. Ici on le simule : le flottant grandit dès qu'on lui pose sa
    // gauche, comme le vrai le faisait en se repliant dans sa colonne.
    ecran(1400, 800);
    const f = flottant(224, 532);
    const vraiLeft = Object.getOwnPropertyDescriptor(f.style, 'left');
    Object.defineProperty(f.style, 'left', {
        configurable: true,
        get: () => vraiLeft ? vraiLeft.value : f.style.__left,
        set: (v) => { f.style.__left = v; f.taille.h = 607; }
    });
    poserContre(f, cible(978, 600));
    // 620..? au-dessous ne tient pas (606 + 607 > 792) ; au-dessus : 600 − 607
    // − 6 = −13, ne tient pas non plus. Le rabattage doit donc le ramener.
    assert.ok(bas(f) <= 800 - MARGE_ECRAN, `posé à ${haut(f)}..${bas(f)}`);
    assert.ok(haut(f) >= MARGE_ECRAN);
});

test('IL NE SORT PAS NON PLUS PAR LES CÔTÉS', () => {
    ecran(1400, 800);
    const gauche = flottant(224, 200);
    poserContre(gauche, cible(-40, 100));
    assert.equal(parseFloat(gauche.style.left), MARGE_ECRAN);

    const droite = flottant(224, 200);
    poserContre(droite, cible(1380, 100));
    assert.equal(parseFloat(droite.style.left), 1400 - 224 - MARGE_ECRAN);
});

test('UNE BULLE PRÉFÈRE LE DESSUS, UN PANNEAU LE DESSOUS', () => {
    // Le même calcul sert aux deux, et c'est bien le but : ma première version
    // du placement des infobulles portait EXACTEMENT le défaut de la fiche, et
    // ne se voyait pas parce qu'une bulle est courte.
    ecran(1400, 800);
    const panneau = flottant(224, 200);
    assert.equal(poserContre(panneau, cible(500, 400)).dessous, true);

    const bulle = flottant(180, 34);
    assert.equal(poserContre(bulle, cible(500, 400), { dessousDabord: false }).dessous, false);
    // Mais elle descend quand il n'y a pas la place au-dessus : c'est le repli
    // qui sauve les boutons de la barre du haut.
    const collee = flottant(180, 34);
    assert.equal(poserContre(collee, cible(500, 12), { dessousDabord: false }).dessous, true);
});

test('UNE BULLE NE DÉFILE PAS — ELLE SE REPLIE', () => {
    // Un ascenseur dans une bulle d'aide serait un aveu. Elle se borne en
    // largeur, pas en hauteur : voir `ui/infobulle.js`.
    ecran(390, 844);
    const bulle = flottant(320, 60);
    poserContre(bulle, cible(10, 400), { borner: false });
    assert.equal(bulle.style.maxHeight, '', 'aucune hauteur imposée');
});

test('LE DÉCALAGE SERT À CENTRER, ET SE RABAT COMME LE RESTE', () => {
    // `poserContre` aligne sur le bord GAUCHE ; une bulle se centre sur son
    // bouton, et le dit par `decalageX`.
    ecran(1400, 800);
    const bulle = flottant(180, 34);
    // Bouton de 24 px de large à x=500 : milieu 512, bulle centrée à 422.
    poserContre(bulle, cible(500, 400), { decalageX: 24 / 2 - 180 / 2 });
    assert.equal(parseFloat(bulle.style.left), 422);

    // Et au bord, le rabattage l'emporte sur le centrage.
    const auBord = flottant(180, 34);
    poserContre(auBord, cible(4, 400), { decalageX: 24 / 2 - 180 / 2 });
    assert.equal(parseFloat(auBord.style.left), MARGE_ECRAN);
});
