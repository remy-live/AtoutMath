// UNE PASTILLE RONDE DÉCLARE SA TAILLE — sinon le doigt la change en ovale.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, DEUX FOIS. Le 8 octobre : « sur iPhone, les retenues font des ovales ».
// Le 13 : « y a pas un souci sur les retenues, elle devrait pas être ronde ».
// Le même défaut, dans un autre exercice — la correction du 8 avait été posée
// sur UN des deux chemins qui mènent au même endroit.
//
// ── LA RÈGLE, ET POURQUOI ELLE NE PEUT PAS SE DEVINER ─────────────────────
//
// `css/modules.css` pose un plancher de 44 px à tout bouton de la couche de
// jeu — la pulpe d'un index — SAUF à ceux qui déclarent `btn-carre`, dont le
// sens réel est « ma taille est la mienne ». Un bouton large (« Annuler »,
// 100 × 44) y gagne ; un bouton de 18 px de large y devient deux fois et demie
// plus haut que large, et un rayon de 50 % sur ce rectangle fait l'ovale.
//
// La liste des exceptions est écrite en `:not()` dans la feuille de style :
// elle ne peut pas deviner qu'un rond de retenue est rond. C'est donc au JEU
// de le dire, et c'est ce que cette épreuve garde.
//
// ── CE QU'ELLE NE REMPLACE PAS ────────────────────────────────────────────
//
// `node tools/boutonsEtires.mjs` ouvre les quatre-vingts activités sur un
// téléphone et MESURE chaque bouton : 1 902 mesurés, zéro ovale au 13 octobre.
// C'est lui qui trouve les nouveaux cas ; celle-ci garde ceux qu'on connaît,
// et elle est quatre minutes plus rapide.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * Les boutons MINUSCULES des jeux : ceux dont la largeur se compte en
 * dizaines de pixels, et que le plancher tactile déformerait.
 *
 * Chaque ligne dit : le fichier, le nom de la classe, et ce que c'est — parce
 * qu'un échec doit nommer l'objet, pas une chaîne de caractères.
 */
const PASTILLES = [
    ['js/games/poserOperation.js', 'po-rond', 'le rond de retenue d\'une opération posée'],
    ['js/games/poserLongue.js', 'pl-rond', 'les ronds de retenue d\'une division posée'],
    ['js/core/activities/produitPose.js', 'pp-jeton', 'les facteurs cliquables d\'un produit'],
    ['js/games/mastermind.js', 'mm-jeton', 'les jetons du Mastermind'],
    ['js/games/hexagrille.js', 'hx-jeton', 'les jetons de l\'Hexagrille'],
    ['js/games/poserOperation.js', 'po-marque',
        'les retenues ecrites au crayon d\'une soustraction posee']
];

test('CHAQUE PASTILLE DE JEU DÉCLARE « btn-carre »', () => {
    const manquants = [];
    for (const [fichier, classe, quoi] of PASTILLES) {
        const source = readFileSync(fichier, 'utf8');
        // On cherche l'endroit où la classe est POSÉE sur un bouton — une
        // affectation de `className` ou un `class="…"` — et l'on exige que
        // `btn-carre` y soit. Chercher `btn-carre` n'importe où dans le
        // fichier ne garderait rien : il pourrait être sur un autre bouton.
        // ON LIT L'AFFECTATION ENTIERE, PAS UNE LIGNE.
        //
        // La version d'avant filtrait les LIGNES contenant a la fois la
        // classe et le mot « class ». Un ternaire ecrit sur trois lignes —
        // `rond.className =` sur la premiere, la classe sur la troisieme —
        // la faisait crier « n'est plus pose dans ce fichier » sur un bouton
        // parfaitement declare. Une garde qui tombe sur une mise en forme ne
        // garde pas ce qu'elle annonce : elle apprend a reformater pour la
        // faire taire.
        const plat = source.replace(/\s+/g, ' ');
        const poses = [
            // `className = …`, mais aussi `const classes = [ … ]` : deux jeux
            // sur cinq construisent leur liste dans un tableau avant de la
            // joindre, et `class\\w*` les prend tous les deux.
            ...[...plat.matchAll(/class\w*\s*=\s*([^;]*);/g)].map(m => m[1]),
            ...[...plat.matchAll(/classList\.add\(([^)]*)\)/g)].map(m => m[1]),
            ...[...plat.matchAll(/class="([^"]*)"/g)].map(m => m[1])
        ].filter(s => s.includes(classe));
        assert.ok(poses.length, `« ${classe} » n'est plus posé dans ${fichier}`);
        if (!poses.some(s => s.includes('btn-carre'))) {
            manquants.push(`  · ${quoi}\n      ${fichier} — « ${classe} » sans « btn-carre »`);
        }
    }
    assert.equal(manquants.length, 0,
        'des pastilles de jeu ne déclarent pas leur taille : au doigt, le plancher\n'
        + 'de 44 px les étirera en ovales (Rémy, deux fois : « les retenues font des\n'
        + 'ovales », « elle devrait pas être ronde ») —\n' + manquants.join('\n'));
});

test('LE PLANCHER TACTILE ÉPARGNE TOUJOURS « btn-carre »', () => {
    // L'épreuve ci-dessus ne vaut que si l'exception existe encore. Si la
    // feuille de style cessait de nommer `btn-carre`, toutes les déclarations
    // des jeux deviendraient décoratives — et l'épreuve resterait verte en ne
    // gardant plus rien.
    const css = readFileSync('css/modules.css', 'utf8');
    const regle = css.split('\n').find(l =>
        l.includes('#game-layer button:not(') && l.includes('min-height') === false);
    assert.ok(regle, 'la règle du plancher tactile a disparu de css/modules.css');
    assert.ok(regle.includes(':not(.btn-carre)'),
        'le plancher tactile n\'épargne plus `btn-carre` : toutes les pastilles\n'
        + `des jeux redeviendront des ovales.\n      ${regle.trim().slice(0, 120)}`);
});
