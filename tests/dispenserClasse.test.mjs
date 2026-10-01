// DISPENSER TOUTE LA CLASSE : le message qui demandait l'impossible, et le
// geste le plus fort rendu discret.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// DEUX MALADRESSES DU MÊME BLOC, trouvées en lisant cet écran pour répondre à
// Rémy (« si un élève galère trop, je peux enlever un exercice ? ») :
//
//   · le message d'erreur disait « Écrivez l'identifiant de l'exercice »
//     alors que le champ libre était devenu une LISTE DÉROULANTE. On n'y écrit
//     plus rien : le message demandait un geste impossible, ce qui est pire
//     qu'un message absent. Il est resté là parce qu'aucun test ne lit une
//     phrase — c'est écrit en toutes lettres en tête de `espaceClasses.js`.
//
//   · « Le retirer » fait disparaître l'exercice pour TOUTE la classe, et
//     vivait en bouton DISCRET à côté de « Autoriser le saut » en bouton
//     plein, sans confirmation et sans dire sa portée. Le geste le plus fort
//     de l'écran était le moins annoncé.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SRC = readFileSync(new URL('../js/ui/espaceClasses.js', import.meta.url), 'utf8');

test('LE MESSAGE NE DEMANDE PLUS D\'ÉCRIRE DANS UNE LISTE DÉROULANTE', () => {
    assert.ok(!SRC.includes('Écrivez l\\\'identifiant de l\\\'exercice'),
        'le champ est un <select> : on n\'y écrit pas');
    // ET IL DIT LES DEUX FAÇONS D'AVOIR UN EXERCICE SOUS LA MAIN — sans quoi
    // le professeur relit la liste vide sans savoir quoi en faire.
    assert.match(SRC, /Aucun exercice sous la main : imposez une séance, ou attendez/);
});

test('LE GESTE LE PLUS FORT DIT SA PORTÉE, DANS SON LIBELLÉ', () => {
    assert.match(SRC, /data-retire\n?[\s\S]{0,300}>Le retirer pour tous<\/button>/,
        '« Le retirer » tout court ne disait pas qu\'il vaut pour les trente');
    // Et il est MARQUÉ : la même allure que « Autoriser le saut » laissait
    // croire à deux gestes de même poids.
    assert.match(SRC, /class="ec-bouton ec-bouton--rouge" data-retire/);
});

test('ET IL DEMANDE CONFIRMATION, EN DISANT QUE C\'EST RÉVERSIBLE', () => {
    const bloc = SRC.slice(SRC.indexOf('if (d.saut !== undefined || d.retire !== undefined)'));
    const corps = bloc.slice(0, 2600);
    assert.match(corps, /showConfirm\(/, 'le retrait se confirme');
    assert.match(corps, /disparaîtra de la séance pour/, 'et la fenêtre dit ce qui va se passer');
    assert.match(corps, /reste au bilan/, 'le travail déjà fait n\'est pas perdu');
    assert.match(corps, /annuler ce réglage juste en dessous/, 'et c\'est réversible');
    // LE SAUT, LUI, NE SE CONFIRME PAS : il ouvre une porte, il ne retire
    // rien. Une confirmation de plus sur un geste anodin apprend aux gens à
    // confirmer sans lire.
    assert.match(corps, /if \(d\.retire !== undefined\) \{[\s\S]{0,200}showConfirm/,
        'la confirmation ne vise QUE le retrait');
});

test('ET ANNULER NE GÈLE PAS L\'ÉCRAN', () => {
    // `showConfirm` ne rappelait QU'À LA CONFIRMATION : annuler refermait sans
    // rien dire, et un `await` sur une promesse que personne ne résout gèle
    // tous les autres gestes de l'écran, en silence et pour toujours.
    //
    // CORRIGÉ À LA SOURCE, et non à l'appel : `showConfirm` accepte désormais
    // un `onCancel`, posé sur le `onClose` de la fenêtre. Les TROIS façons de
    // dire non — le bouton, la croix, le clic à côté — referment par le même
    // chemin ; les traiter une par une, c'est en oublier une, et c'est
    // toujours celle-là que le professeur emploie.
    const bloc = SRC.slice(SRC.indexOf('if (d.saut !== undefined || d.retire !== undefined)'));
    assert.match(bloc.slice(0, 3000), /onCancel: \(\) => repondre\(false\)/,
        'l\'appel demande à être prévenu du refus');

    const modal = readFileSync(new URL('../js/ui/modal.js', import.meta.url), 'utf8');
    const confirm = modal.slice(modal.indexOf('export function showConfirm'));
    assert.match(confirm.slice(0, 3200),
        /onClose: \(\) => \{ if \(!repondu && opts\.onCancel\) opts\.onCancel\(\); \}/,
        'et la fenêtre prévient, quel que soit le chemin de sortie');
    // ET PAS APRÈS UNE CONFIRMATION : sinon l'appelant recevrait les deux
    // réponses pour un seul geste.
    assert.match(confirm.slice(0, 3200), /repondu = true;\n\s*modal\.close\(\);/);
});
