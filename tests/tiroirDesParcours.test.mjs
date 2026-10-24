// LA BARRE DE GAUCHE : UN CLIC CHARGE, UN DOUBLE-CLIC RENOMME, ET UN DOSSIER
// SE REPLIE.
//
// Rémy : « on pourrait replier des répertoires ? Je préfèrerais un double clic
// sur le nom dans la barre de gauche pour changer le nom et un simple clic
// pour charger le parcours, car là on clique souvent sur le titre pour changer
// le nom et on ne comprend pas pourquoi cela ne charge pas ».
//
// ── CE QUE LA MESURE A TROUVÉ EN PLUS DE CE QU'ON CHERCHAIT ─────────────────
//
// En refaisant son geste à la souris, la sonde a buté sur DEUX défauts qui
// n'avaient rien à voir avec le double-clic et que personne ne cherchait :
//
//   1. RENOMMER PUIS ROUVRIR PERDAIT LE NOM. Le nom est écrit à deux endroits
//      — `entree.name`, ce que montre la liste, et `entree.data.name`, le nom
//      rangé DANS le parcours. Renommer n'écrivait que le premier, et
//      `normalizePath` répand `...raw` : rouvrir le parcours ressortait
//      l'ancien nom, que la sauvegarde automatique recopiait aussitôt dans
//      l'entrée. Mesuré : « Gamma » → « Gamma renommé » → rouvert → « Gamma ».
//
//   2. LE PLI NE REPLIAIT RIEN. `.path-folder-body` porte `display: flex`, qui
//      l'emporte sur l'attribut `hidden` du navigateur. Le corps gardait
//      `hidden = true` et restait affiché : le dossier replié perdait 5 px sur
//      107. Une sonde qui lisait la PROPRIÉTÉ voyait le pli ; l'œil ne le
//      voyait pas. Après correction : 107 px → 40 px.
//
// MESURÉ APRÈS, au navigateur (tools/tiroirParcours.mjs) : clic sur le titre →
// le parcours se charge et l'on ne renomme pas ; double-clic → le nom devient
// modifiable, tout sélectionné ; Échap remet le nom d'avant sans rien
// enregistrer ; le dossier se replie, dit « 3 parcours », et se rouvre.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';
import { state } from '../js/core/state.js';

const BUILDER = readFileSync(new URL('../js/ui/builder.js', import.meta.url), 'utf8');
const MODULES = readFileSync(new URL('../css/modules.css', import.meta.url), 'utf8');

test('RENOMMER ÉCRIT LE NOM AUX DEUX ENDROITS QUI LE PORTENT', () => {
    state.teacherPaths = [{
        id: 'p1', name: 'Gamma', folderId: 'root', timestamp: 1,
        data: { name: 'Gamma', version: 3, steps: [] }
    }];
    state.updateTeacherPath('p1', 'Gamma renommé', null);
    const p = state.teacherPaths[0];
    assert.equal(p.name, 'Gamma renommé', 'la liste montre le nouveau nom');
    assert.equal(p.data.name, 'Gamma renommé',
        'et le parcours lui-même le porte : sinon le rouvrir ressort l\'ancien, '
        + 'que la sauvegarde automatique recopie ensuite dans la liste');
});

test('UN ANCIEN PARCOURS, TABLEAU D\'ÉTAPES, NE SE CASSE PAS AU RENOMMAGE', () => {
    // Le format d'origine rangeait les étapes dans un TABLEAU nu. Lui poser un
    // `.name` ne servirait à rien et laisserait une propriété sur un tableau,
    // que `JSON.stringify` perd en silence à la sauvegarde suivante.
    state.teacherPaths = [{ id: 'p2', name: 'Vieux', folderId: 'root', timestamp: 1,
        data: [{ exerciseId: 'calc-add' }] }];
    state.updateTeacherPath('p2', 'Vieux renommé', null);
    assert.equal(state.teacherPaths[0].name, 'Vieux renommé');
    assert.ok(Array.isArray(state.teacherPaths[0].data), 'le tableau reste un tableau');
    assert.equal(state.teacherPaths[0].data.name, undefined);
});

test('REPLIER UN DOSSIER NE LE FAIT PAS REMONTER EN TÊTE DE LISTE', () => {
    state.teacherFolders = [{ id: 'f1', name: 'Sixième', timestamp: 1000 }];
    state.setFolderReplie('f1', true);
    assert.equal(state.teacherFolders[0].replie, true);
    assert.equal(state.teacherFolders[0].timestamp, 1000,
        'l\'explorateur trie sur cette date : un dossier qu\'on ouvre pour '
        + 'regarder ne doit pas passer pour un dossier qu\'on a travaillé');
    state.setFolderReplie('f1', false);
    assert.equal(state.teacherFolders[0].replie, false, 'et il se déplie');
    // Un dossier inconnu ne fait rien tomber : la vue peut être en retard sur
    // les données, par exemple après une suppression sur un autre appareil.
    assert.doesNotThrow(() => state.setFolderReplie('fantome', true));
});

test('LE NOM N\'EST MODIFIABLE QU\'APRÈS UN DOUBLE-CLIC', () => {
    // ON LIT LA SOURCE : ce comportement vit dans des gestionnaires d'événement
    // attachés à des éléments du DOM, que ce harnais ne rend pas. Le navigateur
    // le mesure (tools/tiroirParcours.mjs) ; l'épreuve garde la règle.
    //
    // ET ON NE VISE PAS UN NOM DE VARIABLE. Une première version de cette
    // épreuve cherchait `name.contentEditable = 'true'` : elle passait au vert
    // quand on remettait le défaut sous un autre nom (`el.`). Ce qu'on garde,
    // c'est la RÈGLE — il n'y a qu'un seul endroit où le nom devient
    // modifiable, et il est à l'intérieur du double-clic.
    const depuis = BUILDER.slice(BUILDER.indexOf('function nomRenommable'));
    const corps = depuis.slice(0, depuis.indexOf('\nfunction '));
    assert.ok(corps.includes('ondblclick'), 'la fonction est bien celle qu\'on croit');

    const passages = [...corps.matchAll(/contentEditable = 'true'/g)].map(m => m.index);
    assert.equal(passages.length, 1,
        `le nom ne devient modifiable qu'en UN endroit ; ${passages.length} trouvé(s)`);
    assert.ok(passages[0] > corps.indexOf('ondblclick'),
        'et cet endroit est APRÈS le double-clic : posé à la création, il '
        + 'remettrait le curseur de saisie là où Rémy attend un chargement');
    assert.match(corps, /contentEditable = 'true';\s*\n\s*el\.focus\(\);/,
        'le double-clic donne le curseur dans la foulée');
});

test('ET LE CLIC SUR LE TITRE CHARGE LE PARCOURS', () => {
    // LA LIGNE EXACTE QUI FAISAIT LE DÉFAUT : le nom était exclu du clic qui
    // ouvre. Les boutons, eux, gardent leur rôle propre.
    assert.doesNotMatch(BUILDER, /closest\('\.path-browser-name, \.path-browser-actions'\)/,
        'le nom ne s\'exclut plus du clic qui ouvre');
    assert.match(BUILDER, /closest\('\.path-browser-actions'\)\) return;/,
        'partager et supprimer ne sont toujours pas ouvrir');
});

test('LE CORPS D\'UN DOSSIER REPLIÉ DISPARAÎT VRAIMENT', () => {
    // `display: flex` l'emporte sur l'attribut `hidden`, qui n'est qu'une règle
    // du navigateur. Sans cette ligne, `hidden` est posé et rien ne se replie.
    assert.match(MODULES, /\.path-folder-body\[hidden\] \{ display: none; \}/,
        'sinon le pli se voit dans le code et pas à l\'écran');
});

test('LE POINTILLÉ NE PROMET PLUS UN CHAMP DE SAISIE AU REPOS', () => {
    assert.match(MODULES, /\.path-browser-name:hover, \.path-browser-name\[contenteditable="true"\]/,
        'il ne se montre qu\'au survol et pendant l\'édition');
    assert.doesNotMatch(MODULES,
        /\.path-browser-name \{[^}]*border-bottom: 1px dashed var\(--border\)/,
        'et plus jamais en permanence');
});
