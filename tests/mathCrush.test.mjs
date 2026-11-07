import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { readFileSync } from 'node:fs';
import {
    OPERATIONS, operationDe, valeurChaine, expressionChaine, depasse, disposerPlateau
} from '../js/core/mathCrush.js';

test('une chaîne vaut sa somme ou son produit, selon le mode', () => {
    assert.equal(valeurChaine([3, 4, 5], 'addition'), 12);
    assert.equal(valeurChaine([3, 4, 5], 'multiplication'), 60);
    // Une chaîne vide ne vaut PAS l'élément neutre : afficher « produit : 1 »
    // avant d'avoir touché la moindre case n'aurait aucun sens.
    assert.equal(valeurChaine([], 'addition'), 0);
    assert.equal(valeurChaine([], 'multiplication'), 0);
    assert.equal(valeurChaine([7], 'multiplication'), 7);
});

test('l\'expression écrit le CALCUL, signe compris', () => {
    // Rémy : « pour la cible, on ne sait pas si on doit additionner ou
    // multiplier ». C'est ici que ça se règle : on ne montre plus un total nu.
    assert.equal(expressionChaine([3, 4], 'addition'), '3 + 4 = 7');
    assert.equal(expressionChaine([3, 4], 'multiplication'), '3 × 4 = 12');
    assert.equal(expressionChaine([5], 'addition'), '5 = 5');
    assert.equal(expressionChaine([], 'addition'), '');
});

test('un mode inconnu retombe sur l\'addition plutôt que de casser', () => {
    assert.equal(operationDe('bidon'), OPERATIONS.addition);
    assert.equal(valeurChaine([2, 3], undefined), 5);
});

test('le dépassement ne se signale qu\'à partir de deux cases', () => {
    // Une première case plus grande que la cible arrive tout le temps ; la
    // peindre en rouge dès le premier doigt posé ferait clignoter le plateau.
    assert.equal(depasse([9], 5, 'addition'), false);
    assert.equal(depasse([3, 4], 5, 'addition'), true);
    assert.equal(depasse([2, 3], 5, 'addition'), false, 'pile la cible n\'est pas un dépassement');
    assert.equal(depasse([3, 4], 12, 'multiplication'), false);
    assert.equal(depasse([5, 4], 12, 'multiplication'), true);
    assert.equal(depasse([], 5, 'addition'), false);
});

test('le plateau est centré dans ce qui reste sous le bandeau', () => {
    // Rémy : « c'est bizarre comment apparaît le plateau ». Il ne l'était plus
    // dès lors qu'on cesse de réserver cent pixels quelle que soit la hauteur.
    const P = disposerPlateau(800, 600, 6, 7);
    assert.ok(P.cote > 0);
    assert.equal(P.w, P.cote * 6);
    assert.equal(P.h, P.cote * 7);
    // Centré horizontalement, au pixel près.
    assert.ok(Math.abs((P.x + P.w / 2) - 400) <= 1);
    // Et il tient : rien ne déborde de la boîte.
    assert.ok(P.x >= 0 && P.y >= P.bandeau);
    assert.ok(P.x + P.w <= 800 && P.y + P.h <= 600);
});

test('le bandeau suit la hauteur au lieu d\'être fixe, et reste borné', () => {
    const petit = disposerPlateau(400, 300, 6, 7);
    const grand = disposerPlateau(1400, 1000, 6, 7);
    assert.ok(petit.bandeau < grand.bandeau, 'le bandeau ne suit pas la hauteur');
    assert.ok(petit.bandeau >= 64, 'le bandeau devient illisible');
    assert.ok(grand.bandeau <= 128, 'le bandeau mange le plateau');
});

test('le plateau tient dans toutes les boîtes qu\'on peut lui donner', () => {
    // Téléphone debout, téléphone couché, tablette, bureau : dans les quatre,
    // les cases restent carrées et rien ne sort du cadre.
    for (const [w, h] of [[360, 640], [640, 360], [820, 1180], [1280, 720], [1920, 1080]]) {
        const P = disposerPlateau(w, h, 6, 7);
        assert.ok(P.x >= 0, `${w}×${h} : déborde à gauche`);
        assert.ok(P.x + P.w <= w, `${w}×${h} : déborde à droite`);
        assert.ok(P.y >= P.bandeau, `${w}×${h} : monte sur le bandeau`);
        assert.ok(P.y + P.h <= h, `${w}×${h} : déborde en bas`);
    }
});

// ─── LA CARTE DE FIN A UNE SORTIE ───────────────────────────────────────────
//
// RÉMY, capture à l'appui : « là ca bloque, on peut appuyer sur la croix mais
// il faudrait un bouton quitter ou recommencer ».
//
// La carte de fin est PEINTE DANS LE CANEVAS : le sablier, les points, le
// meilleur enchaînement, le tableau des scores. Tout y est, et rien n'y répond.
// La seule sortie était la croix rouge de l'entête, en haut à droite de
// l'écran — hors du regard de celui qui vient de finir.
//
// CE QUE CES ÉPREUVES GARDENT. La partie dure soixante secondes de vraie
// horloge : la sonde qui l'attend (tools/finDeMathCrush.mjs) ne tourne pas à
// chaque commit. On garde donc ici ce qui se défait en silence — la règle qui
// cache les boutons, l'accord avec la croix de l'entête, et la remise à zéro.

const crush = readFileSync(new URL('../js/games/math_crush.js', import.meta.url), 'utf8');

test('LES DEUX BOUTONS DE LA FIN EXISTENT, ET ILS SE CACHENT PENDANT LA PARTIE', () => {
    assert.match(crush, /data-rejouer>↺ Rejouer</, 'le bouton « Rejouer » a disparu');
    assert.match(crush, /data-quitter>Quitter</, 'le bouton « Quitter » a disparu');

    // CELLE-CI A ÉTÉ MESURÉE AVANT D'ÊTRE ÉCRITE, et c'est tout son intérêt :
    // au premier tour de sonde, les deux boutons s'affichaient DÈS LA PREMIÈRE
    // SECONDE de la partie. `display: flex` posé par une classe bat le `hidden`
    // du navigateur, qui n'est qu'un `display: none` de feuille par défaut —
    // et `rejouer()` ne les refermait pas davantage.
    assert.match(crush, /\.mc-fin\[hidden\] \{ display: none; \}/,
        'sans cette règle, les boutons de fin s\'affichent pendant toute la partie');

    // 44 px : le plancher tactile de l'application. Ces boutons sont dans
    // #game-layer, donc la règle globale les vise ; on l'écrit quand même ici,
    // parce qu'un bouton de fin de partie se touche au doigt sur tablette.
    assert.match(crush, /\.mc-fin-btn \{[^}]*min-height: 44px/,
        'les boutons de fin passent sous le plancher tactile');
});

test('« QUITTER » PASSE PAR LA CROIX QUI EXISTE, ET ELLE EXISTE', () => {
    // On ne refait pas la sortie, on prend celle qui est là : la croix de
    // l'entête sait déjà tout ce qu'il faut faire en quittant un exercice.
    // MAIS LES DEUX MOITIÉS VIVENT DANS DEUX FICHIERS : un identifiant renommé
    // dans index.html et pas ici donne un bouton muet, sans aucune erreur.
    assert.match(crush, /getElementById\('btn-close-game'\)/,
        '« Quitter » ne passe plus par la croix de l\'entête');
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    assert.ok(html.includes('id="btn-close-game"'),
        'la croix de l\'entête a changé d\'identifiant : « Quitter » ne ferme plus rien');
});

test('« REJOUER » REMET À ZÉRO CE QU\'UNE PARTIE USE', () => {
    const debut = crush.indexOf('    rejouer() {');
    assert.notEqual(debut, -1, 'la méthode rejouer() a disparu');
    const corps = crush.slice(debut, crush.indexOf('\n    }', debut));
    // `finEnvoyee` GARDE LE RENDEZ-VOUS du tableau des scores : oublié ici, le
    // second score ne serait jamais enregistré, et l'élève qui rejoue pour
    // battre son record jouerait pour rien.
    for (const champ of ['score', 'vies', 'timeLeft', 'meilleurCombo', 'finEnvoyee']) {
        assert.ok(corps.includes('this.' + champ + ' ='),
            `rejouer() ne remet pas ${champ} à zéro`);
    }
    assert.match(corps, /this\.initGrid\(\)/, 'rejouer() garde la grille de la partie finie');
    assert.match(corps, /this\.startGameLoop\(\)/, 'rejouer() ne relance pas la boucle');
    assert.match(corps, /this\.finEl\.hidden = true/, 'rejouer() laisse la carte de fin à l\'écran');
});
