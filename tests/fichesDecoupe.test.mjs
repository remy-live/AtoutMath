// LE CATALOGUE DES FICHES TIENT DEBOUT APRÈS LE DÉCOUPAGE.
//
// `printSheet.js` faisait seize mille lignes ; il a été coupé par famille
// (`js/ui/fiches/`, voir `tools/decouperPrintSheet.mjs`). Un tel découpage a un
// mode de panne bien à lui, et c'est le pire qui soit : une famille qui APPELLE
// une fonction sans l'importer se compile parfaitement, passe les tests qui ne
// la touchent pas, et n'échoue qu'à l'ouverture d'un exercice précis — peut-être
// devant une classe.
//
// Ce fichier ferme cette porte. Il ne vérifie pas des dessins : il vérifie que
// CHAQUE ENTRÉE DU CATALOGUE EST COMPLÈTE, c'est-à-dire que les fonctions
// qu'elle annonce existent vraiment. Une référence perdue au découpage rend
// `undefined` — et c'est exactement ce qu'on regarde.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import './helpers.mjs';
import { RENDUS, chargerJsPDF, ouvrirFicheModal } from '../js/ui/printSheet.js';
import { exercices } from '../js/data/catalog.js';

// Les champs d'une entrée qui DOIVENT être des fonctions si présents.
const FONCTIONS = ['previewGrille', 'pdfGrille', 'consigne', 'titre', 'apercuSolution',
    'pdfSolution', 'proportions', 'colonnes', 'hauteurMin', 'nbBlocs'];

test('CHAQUE FICHE ANNONCE DES FONCTIONS QUI EXISTENT VRAIMENT', () => {
    const cles = Object.keys(RENDUS);
    assert.ok(cles.length >= 70, `le catalogue n'a plus que ${cles.length} entrées`);

    for (const [cle, rendu] of Object.entries(RENDUS)) {
        assert.ok(rendu && typeof rendu === 'object', `« ${cle} » n'est pas un rendu`);
        // Le cœur : dessiner l'aperçu et dessiner le PDF.
        assert.equal(typeof rendu.previewGrille, 'function',
            `« ${cle} » n'a pas d'aperçu — une référence perdue au découpage ?`);
        assert.equal(typeof rendu.pdfGrille, 'function',
            `« ${cle} » ne sait pas se dessiner en PDF`);
        for (const champ of FONCTIONS) {
            if (rendu[champ] === undefined) continue;
            if (typeof rendu[champ] === 'function') continue;
            // Certains champs acceptent aussi un nombre ou un objet ; on ne
            // s'inquiète que d'un `undefined` déguisé.
            assert.notEqual(rendu[champ], null, `« ${cle} ».${champ} vaut null`);
        }
    }
});

test('TOUT EXERCICE « printable » DU CATALOGUE TROUVE SON RENDU', () => {
    // C'est le lien qui casse en silence : un exercice déclare
    // `printable: 'garam'`, et si l'entrée a disparu d'une famille, le bouton
    // « fiche » ouvre une fenêtre vide.
    const manquants = exercices
        .filter(e => e.printable)
        .filter(e => !RENDUS[e.printable])
        .map(e => `${e.id} → ${e.printable}`);
    assert.deepEqual(manquants, [], 'des exercices imprimables n\'ont plus de rendu');
});

test('LA PORTE D\'ENTRÉE DU MODULE N\'A PAS RÉTRÉCI', () => {
    // Trois noms, et trois seulement, sortent de `printSheet.js` — le reste de
    // l'application n'a jamais eu besoin d'autre chose. `chargerJsPDF` a
    // déménagé au socle pendant le découpage : elle doit rester visible ici.
    assert.equal(typeof chargerJsPDF, 'function');
    assert.equal(typeof ouvrirFicheModal, 'function');
    assert.equal(typeof RENDUS, 'object');
});

test('AUCUNE FAMILLE NE DÉCLARE DEUX FOIS LE MÊME NOM', () => {
    // Deux copies d'une fonction, c'est deux comportements qui divergeront au
    // premier réglage — le défaut que le découpage devait justement empêcher.
    const re = /^(?:export\s+)?(?:async\s+)?(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=)/;
    const ou = new Map();
    const dossier = new URL('../js/ui/fiches/', import.meta.url);
    for (const f of fs.readdirSync(dossier).filter(x => x.endsWith('.js'))) {
        for (const l of fs.readFileSync(new URL(f, dossier), 'utf8').split('\n')) {
            const m = l.match(re);
            if (!m) continue;
            const nom = m[1] || m[2];
            ou.set(nom, [...(ou.get(nom) || []), f]);
        }
    }
    const doubles = [...ou].filter(([, f]) => f.length > 1)
        .map(([n, f]) => `${n} : ${f.join(', ')}`);
    assert.deepEqual(doubles, [], 'des noms sont déclarés dans deux familles');
});
