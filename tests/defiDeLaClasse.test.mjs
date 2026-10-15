// LE DÉFI CHRONOMÉTRÉ — ce que l'ardoise doit tenir, sans navigateur.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « je peux lancer un challenge chronométré, le plus de calcul et toute
// la classe participe et au bout du challenge, un tableau de High score […] et
// on reprend la suite des exercices normalement ».
//
// LE SERVEUR EST GARDÉ DE SON CÔTÉ (treize vérifications dans
// `tools/testApi.php`) et l'ÉCRAN l'est par `tools/boutEnBout.mjs`, qui lance
// un vrai défi depuis l'écran du professeur et le joue sur celui de l'élève.
// Ce fichier-ci garde ce qui tient entre les deux : la LECTURE de l'état.
//
// ET C'EST LA CORRECTION D'HORLOGE QUI COMPTE. Le défi décide d'un CLASSEMENT :
// deux ardoises mal réglées donneraient deux minutes de longueurs différentes,
// et le score ne voudrait plus rien dire. La règle existait déjà pour le compte
// à rebours ; elle devait valoir ici aussi, et une règle recopiée est une règle
// qui dérive.

import test from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { appliquerEtat, defiEnCours, tableauDuDefi, ceQueVoitLEleve }
    from '../js/core/seanceDistante.js';
import { lireFeuille, corpsDeLaRegle, valeurDe } from './aidesCss.mjs';

/** Un état de séance comme le serveur l'envoie. */
const unDefi = (o = {}) => ({
    className: '6e B', messages: [], skippable: [], removed: [], calculatrice: [],
    maintenant: 1_800_000_000,
    defi: { exo: 'calc-add', graine: 'abc123', mode: 'qcm',
            debut: 1_800_000_000, fin: 1_800_000_060, ...o.defi },
    defiTableau: o.defiTableau ?? null
});

test('LE DÉFI ARRIVE AVEC SA GRAINE, SON MODE ET SON TEMPS', () => {
    appliquerEtat(unDefi(), 1_800_000_000);
    const d = defiEnCours(1_800_000_000);
    assert.ok(d, 'le défi ne descend pas jusqu\'à l\'ardoise');
    assert.equal(d.exo, 'calc-add');
    assert.equal(d.graine, 'abc123', 'sans graine, chaque élève tire ses propres questions');
    assert.equal(d.reste, 60);
    assert.equal(d.duree, 60);
});

test('LE TEMPS RESTANT SE CORRIGE DE L\'ÉCART DES HORLOGES', () => {
    // L'ARDOISE EST EN AVANCE DE TRENTE SECONDES. Sans correction, elle
    // afficherait trente secondes de moins que celle du voisin — et son élève
    // perdrait un tiers du défi sans comprendre pourquoi.
    appliquerEtat(unDefi(), 1_800_000_030);
    assert.equal(defiEnCours(1_800_000_030).reste, 60,
        'l\'écart entre l\'horloge du serveur et celle d\'ici n\'est pas repris');
    // ET EN RETARD, dans l'autre sens.
    appliquerEtat(unDefi(), 1_799_999_970);
    assert.equal(defiEnCours(1_799_999_970).reste, 60);
});

test('UN DÉFI DONT LA FIN EST PASSÉE N\'EST PLUS UN DÉFI', () => {
    appliquerEtat(unDefi(), 1_800_000_000);
    assert.equal(defiEnCours(1_800_000_061), null,
        'l\'ardoise continuerait à poser des questions après la minute');
});

test('LE TABLEAU NE DESCEND QUE QUAND LE SERVEUR L\'ENVOIE', () => {
    appliquerEtat(unDefi(), 1_800_000_000);
    assert.equal(tableauDuDefi(), null, 'un tableau apparaît pendant le défi');
    appliquerEtat(unDefi({
        defi: { fin: 1_799_999_900 },
        defiTableau: { debut: 1, podium: [{ prenom: 'Zoé', bonnes: 12 }],
                       moi: { rang: 4, bonnes: 7 }, participants: 9 }
    }), 1_800_000_000);
    const t = tableauDuDefi();
    assert.ok(t, 'le tableau ne descend pas');
    // RÉMY A CHOISI « PODIUM + TA PLACE » : le serveur a déjà coupé, l'ardoise
    // ne fait que relayer. Si elle recevait trente lignes, elle les montrerait.
    assert.ok(t.podium.length <= 3);
    assert.equal(t.moi.rang, 4);
});

test('LE PROFESSEUR NE SE LANCE PAS UN DÉFI À LUI-MÊME', () => {
    // Son navigateur a servi à essayer le côté élève et en garde le
    // rattachement — c'est la même règle que pour les mots, et elle est écrite
    // une seule fois, dans `ceQueVoitLEleve`.
    appliquerEtat(unDefi(), 1_800_000_000);
    const vu = ceQueVoitLEleve({ professeur: true });
    assert.equal(vu.defi, null);
    assert.equal(vu.defiTableau, null);
});

test('LE VOILE DU DÉFI PASSE AU-DESSUS DU PLATEAU DE JEU', () => {
    // LE DÉFAUT QUE SEULE LA PHOTO POUVAIT DIRE. À `z-index: 9000`, le voile
    // passait DERRIÈRE `#game-layer` (10000) : le sélecteur répondait « il est
    // là », le compteur montait, tous les contrôles étaient verts — et l'élève
    // voyait son exercice. C'est la famille de défauts la plus chère du dépôt.
    const lire = (f, sel) => corpsDeLaRegle(lireFeuille(f), sel, { ou: f });
    const voile = Number(valeurDe(lire('css/modules.css', '.defi-voile'), 'z-index'));
    const plateau = Number(valeurDe(lire('css/layout.css', '#game-layer'), 'z-index'));
    const pause = Number(valeurDe(lire('css/ui.css', '.moment-pause'), 'z-index'));
    assert.ok(voile > plateau,
        `le voile du défi (${voile}) passe sous le plateau de jeu (${plateau}) : `
        + 'l\'élève verra son exercice pendant tout le défi.');
    // ET SOUS LA PAUSE DU PROFESSEUR : « tout le monde s'arrête » veut dire
    // tout le monde, défi compris.
    assert.ok(voile < pause,
        `le voile du défi (${voile}) couvrirait la pause du professeur (${pause})`);
});

test('LE VOILE PEINT VRAIMENT SON FOND', () => {
    // `--bg-page` N'EXISTE PAS, et un `color-mix` invalide ne peint RIEN : la
    // carte du défi flottait sur l'exercice resté visible. Une faute de frappe
    // dans un nom de variable CSS ne lève aucune erreur — la déclaration est
    // simplement ignorée.
    const voile = corpsDeLaRegle(lireFeuille('css/modules.css'), '.defi-voile',
        { ou: 'css/modules.css' });
    const fond = valeurDe(voile, 'background') || '';
    const jetons = [...fond.matchAll(/var\((--[a-z0-9-]+)\)/g)].map(m => m[1]);
    assert.ok(jetons.length, `le voile n'a pas de fond : « ${fond} »`);
    const base = lireFeuille('css/base.css');
    for (const j of jetons) {
        assert.ok(base.includes(`${j}:`),
            `le voile du défi peint avec « ${j} », qui n'est déclaré nulle part — `
            + 'la règle sera ignorée en silence et l\'exercice restera visible dessous.');
    }
});
