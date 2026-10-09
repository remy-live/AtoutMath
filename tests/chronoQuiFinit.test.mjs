// UN COMPTE À REBOURS QUI EXISTE N'EST PAS UN COMPTE À REBOURS QUI TOURNE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « quand j'ai mis un compte à rebours et qu'il arrive à zéro, pour le
// groupe d'après je ne peux plus mettre de compte à rebours ».
//
// LA CAUSE TENAIT DANS UN POINT D'EXCLAMATION. La barre du pilote décidait de
// sa forme avec `!!(ch && ch.finAt)` — « le serveur connaît une date de fin ».
// C'est VRAI POUR TOUJOURS une fois le chrono fini : le serveur garde la date,
// elle passe simplement dans le passé (`api/index.php` ne l'efface que sur un
// « Arrêter » explicite, et il a raison — c'est une trace). Le cadre restait
// donc figé sur « 00:00 / Arrêter », et le champ des minutes avec son bouton
// « Lancer » ne revenait jamais.
//
// ET LA SIGNATURE PORTAIT LE MÊME DÉFAUT, ce qui scellait tout : le battement
// ne refait la barre que si sa signature a changé, et elle contenait la même
// expression. La barre ne pouvait donc pas se refaire, même dix minutes plus
// tard.
//
// ── POURQUOI CETTE ÉPREUVE LIT LA SOURCE ───────────────────────────────────
//
// `ui/espaceClasses.js` touche le document dès qu'on l'importe : sous Node, il
// tombe sur « document is not defined ». La mesure vraie est dans un
// navigateur — `tools/chronoQuiFinit.mjs` lance un chrono d'une minute et
// attend qu'il tombe —, mais elle coûte plus d'une minute et ne se fait pas à
// chaque commit. Celle-ci garde la RÈGLE, et se lit en quelques millisecondes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';
import { sansCommentaires } from './helpers.mjs';

const SRC = sansCommentaires(
    readFileSync(new URL('../js/ui/espaceClasses.js', import.meta.url), 'utf8'));

/** Le corps d'une fonction nommée, pour ne pas mesurer le fichier entier. */
function corpsDe(nom) {
    const i = SRC.indexOf(`function ${nom}(`);
    assert.ok(i > 0, `\`${nom}\` a disparu : la règle est à reporter sur ce qui l'a remplacée`);
    const corps = SRC.slice(i, SRC.indexOf('\n}', i));
    assert.ok(corps.length > 40, `tranche vide pour \`${nom}\` : l'épreuve ne vérifierait rien`);
    return corps;
}

test('LA FORME DE LA BARRE SUIT LE TEMPS QUI RESTE, PAS L\'EXISTENCE D\'UNE DATE', () => {
    // LE DÉFAUT EXACT DE RÉMY. `!!(ch && ch.finAt)` reste vrai après zéro.
    const corps = corpsDe('barrePiloteHtml');
    assert.match(corps, /const enCours = chronoQuiTourne\(ch\)/,
        'la barre décide encore de sa forme sur l\'existence d\'une date de fin : '
        + 'le champ « Lancer » ne reviendra jamais après un zéro');
    assert.doesNotMatch(corps, /!!\(ch && ch\.finAt\)/);
});

test('ET LA SIGNATURE AUSSI — sans quoi la barre ne se refait jamais', () => {
    // LA MOITIÉ QUI SCELLAIT LE DÉFAUT. Corriger la forme sans corriger la
    // signature n'aurait rien changé : le battement ne refait la barre que si
    // la signature a bougé, et elle ne bougeait pas.
    const corps = corpsDe('signatureDuPilote');
    assert.match(corps, /chronoQuiTourne\(ch\)/,
        'la signature ignore la fin du chrono : la barre restera telle quelle');
    assert.doesNotMatch(corps, /!!\(ch && ch\.finAt\)/);
});

test('« IL TOURNE » VEUT DIRE « IL RESTE DU TEMPS »', () => {
    const corps = corpsDe('chronoQuiTourne');
    assert.match(corps, /resteDuChrono\(ch\) > 0/,
        'la règle ne regarde pas le temps restant : elle ne dit donc rien de neuf');
});

test('LES DEUX HORLOGES DISENT LA MÊME SECONDE', () => {
    // LE PIÈGE QUI AURAIT RENDU LA CORRECTION INUTILE UNE FOIS SUR DEUX.
    //
    // Le tic-tac lit l'heure du poste corrigée de `decalageHorloge` — l'heure du
    // serveur, à la seconde. `resteDuChrono` lisait, elle, `vue.direct.maintenant`,
    // datée du dernier battement, donc jusqu'à DIX SECONDES en arrière. Le
    // tic-tac aurait vu zéro, demandé à la barre de reprendre sa forme, et la
    // barre aurait répondu qu'il restait trois secondes — sans rien changer.
    const corps = corpsDe('resteDuChrono');
    assert.match(corps, /Date\.now\(\) \/ 1000\) \+ decalageHorloge/,
        'le temps restant se calcule sur une horloge en retard : le tic-tac et la '
        + 'barre ne verront pas le zéro au même moment');
    assert.doesNotMatch(corps, /vue\.direct && vue\.direct\.maintenant/);
});

test('À ZÉRO, LA BARRE REPREND SA FORME TOUT DE SUITE', () => {
    // Sans cela, le professeur attendrait le battement du serveur — jusqu'à dix
    // secondes devant « 00:00 », sans champ où taper, pendant qu'une classe
    // attend la consigne suivante.
    const corps = SRC.slice(SRC.indexOf('function lancerLeTicTac'),
        SRC.indexOf('function lancerLeBattement'));
    assert.ok(corps.length > 200, 'tranche vide : l\'épreuve ne vérifierait rien');
    assert.match(corps, /if \(reste === 0\)/,
        'le tic-tac ne remarque pas le zéro');
    assert.match(corps, /rafraichirLeDirect\(zone\)/,
        'il le remarque mais ne redemande pas la barre');
});

test('LE CHAMP ET LE BOUTON « LANCER » EXISTENT TOUJOURS — le témoin', () => {
    // LE PIÈGE D'UNE ÉPREUVE QUI GARDE UNE CONDITION : elle reste verte si la
    // chose conditionnée disparaît. Supprimer le formulaire rendrait les cinq
    // épreuves ci-dessus parfaitement vertes, et Rémy n'aurait toujours pas de
    // compte à rebours.
    assert.match(SRC, /id="ec-chrono-min"/, 'le champ des minutes a disparu');
    assert.match(SRC, /data-chrono>Lancer<\/button>/, 'le bouton « Lancer » a disparu');
    assert.match(SRC, /data-chrono-off>Arrêter<\/button>/,
        'le bouton « Arrêter » a disparu : on ne peut plus couper un chrono en cours');
});

test('LA PAUSE À ZÉRO LIT LA MÊME HORLOGE QUE LE RESTE', () => {
    // Même famille, trouvée en corrigeant : `classeEnPause` comparait `finAt` à
    // l'heure du dernier battement. La classe passait donc en pause jusqu'à dix
    // secondes après le zéro que ses élèves voyaient tomber.
    const corps = corpsDe('classeEnPause');
    assert.match(corps, /resteDuChrono\(ch\) === 0/);
    assert.doesNotMatch(corps, /ch\.finAt <= maintenant/);
});
