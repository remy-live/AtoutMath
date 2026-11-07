// LE CODE DE CLASSE NE PROMET PLUS CE QU'IL NE TIENT PAS.
//
// Le piège, mesuré deux fois : l'écran du professeur affichait le code en gros
// avec un bouton pour le copier, alors que le champ pour le TAPER n'existe chez
// l'élève que si l'inscription libre est allumée — et elle est fermée par
// défaut. Deux décisions justes séparément, une rentrée ratée ensemble.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { etatDuCodeDeClasse, motApresCopie } from '../js/core/codeDeClasse.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('PORTE OUVERTE : le code sert, et l\'écran dit où le taper', () => {
    const e = etatDuCodeDeClasse(true);
    assert.equal(e.ouvert, true);
    assert.equal(e.etiquette, 'code de classe');
    assert.equal(e.quoiFaire, null, 'rien à ouvrir : la porte l\'est déjà');
    // On dit OÙ, parce que c'est la question suivante du professeur.
    assert.match(e.dit, /Je n.ai pas de billet/);
});

test('PORTE FERMÉE : l\'étiquette le dit, et le geste est à côté', () => {
    const e = etatDuCodeDeClasse(false);
    assert.equal(e.ouvert, false);
    assert.match(e.etiquette, /ferm/);
    assert.equal(e.quoiFaire, 'Ouvrir la porte');
    // LA RAISON EST ÉCRITE LÀ OÙ LE CODE EST AFFICHÉ, pas dans un autre écran.
    assert.match(e.dit, /N.OUVRE RIEN/);
    assert.match(e.dit, /billets/);
    // ET L'ON NE DIT PAS QUE C'EST UNE ERREUR : « gardez-la éteinte si votre
    // liste vient de Pronote » est un conseil du logiciel lui-même.
    assert.match(e.dit, /Pronote/);
});

test('ON NE SAIT PAS ENCORE : on ne clignote pas un avertissement faux', () => {
    for (const rien of [null, undefined]) {
        const e = etatDuCodeDeClasse(rien);
        assert.equal(e.ouvert, null);
        assert.equal(e.etiquette, 'code de classe', 'aucune promesse, aucun reproche');
        assert.equal(e.quoiFaire, null);
    }
});

test('CE QU\'ON DIT APRÈS AVOIR COPIÉ dépend de la porte', () => {
    const ouvert = motApresCopie('ABC123', true);
    assert.equal(ouvert.texte, 'Code copié : ABC123');
    assert.equal(ouvert.genre, 'success');

    // Le professeur colle ce code dans son cahier de textes le soir : c'est le
    // dernier moment où l'avertissement sert encore à quelque chose.
    const ferme = motApresCopie('ABC123', false);
    assert.match(ferme.texte, /ABC123/);
    assert.match(ferme.texte, /ferm/);
    assert.equal(ferme.genre, 'info', 'ce n\'est pas un succès : rien ne s\'ouvre');

    // Pendant le chargement, on copie sans rien affirmer.
    assert.equal(motApresCopie('ABC123', null).texte, 'Code copié : ABC123');
});

test('LES DEUX ÉCRANS DU PROFESSEUR EMPLOIENT LA MÊME RÈGLE', () => {
    const EC = lire('js/ui/espaceClasses.js');
    // La carte, dans la liste des classes ; et le sous-titre, à l'intérieur de
    // la classe. S'il n'y en avait qu'un, il suffirait d'entrer dans la classe
    // pour retrouver la promesse qu'on vient de retirer.
    assert.equal((EC.match(/etatDuCodeDeClasse\(/g) || []).length, 2);
    assert.match(EC, /data-inscription-libre="0"[\s\S]{0,120}\$\{esc\(porte\.quoiFaire\)\}/);
    // Et le mot après copie vient de la règle, pas d'une chaîne recopiée.
    assert.match(EC, /motApresCopie\(code,/);
    assert.ok(!/showToast\('Code copié : ' \+ code/.test(EC),
        'l\'ancien message inconditionnel a bien disparu');
});

test('LA PORTE DE L\'ÉLÈVE N\'A PAS ÉTÉ ROUVERTE POUR AUTANT', () => {
    // C'est l'autre moitié de la décision, et elle tient : une porte qui refuse
    // est pire qu'une porte absente — « l'élève tape son prénom trois fois avant
    // de lever la main ». On répare l'écran du PROFESSEUR, pas celui de l'élève.
    const P = lire('js/ui/portailUI.js');
    assert.match(P, /\$\{inscriptionLibre\(\) \? `<details class="portail-repli">/);
});
