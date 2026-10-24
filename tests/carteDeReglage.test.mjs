// UNE NOTE DE CARTE SE COMPTE EN CARACTÈRES, PAS EN IDÉES.
//
// Rémy, devant la première version du réglage du signe : « hyper écrasé
// verticalement non ? ».
//
// MESURÉ AVANT (téléphone 390 px, panneau des Paramètres d'affichage) :
//
//     Marque des points        notes de 22/25/25 caractères → 2 lignes → 125 px
//     Signe de multiplication  notes de 47/98/93            → 4/7/9    → 196 px
//
// Une fois et demie plus haut pour dire trois fois moins. La carte fait 86 px
// de large dans un panneau à trois colonnes : une douzaine de caractères par
// ligne, et rien ne raccourcit une note trop longue — elle empile des lignes.
//
// CE QUI DEMANDE UNE PHRASE VA DANS LE PARAGRAPHE DU BLOC, qui prend toute la
// largeur. Cette épreuve garde la règle pour les cartes qui existent et pour
// celles qu'on écrira.
//
// MESURÉ APRÈS : 125 px contre 125 px — les deux blocs à la même hauteur.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SIGNES_FOIS, NOTE_MAX } from '../js/core/signeFois.js';

test('AUCUNE NOTE DE CARTE NE DÉBORDE DE SA COLONNE', () => {
    for (const s of SIGNES_FOIS) {
        assert.ok(s.aide.length <= NOTE_MAX,
            `« ${s.aide} » fait ${s.aide.length} caractères pour ${NOTE_MAX} `
            + 'au plus : dans une carte de 86 px, chaque tranche de douze '
            + 'caractères ajoute une ligne, et la carte monte. Ce qui est trop '
            + 'long se dit dans le paragraphe du bloc.');
    }
});

test('ET LES CARTES DE LA MARQUE DES POINTS NON PLUS — C\'EST L\'ÉTALON', () => {
    // ON LIT LA SOURCE : `MARQUES_POINT` vit dans `js/app.js`, qui touche au
    // `document` dès qu'on l'importe. L'épreuve tomberait sur « document is
    // not defined » au lieu de dire ce qu'elle mesure.
    const APP = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
    const bloc = APP.slice(APP.indexOf('const MARQUES_POINT = ['));
    const notes = [...bloc.slice(0, bloc.indexOf('];')).matchAll(/aide: '((?:[^'\\]|\\.)*)'/g)]
        .map(m => m[1].replace(/\\'/g, '\''));
    assert.equal(notes.length, 3, 'les trois marques sont bien lues');
    for (const n of notes) {
        assert.ok(n.length <= NOTE_MAX,
            `« ${n} » fait ${n.length} caractères pour ${NOTE_MAX} au plus`);
    }
});

test('LE LONG RESTE DIT, MAIS DANS LE PARAGRAPHE DU BLOC', () => {
    // RACCOURCIR NE DOIT PAS VOULOIR DIRE PERDRE. Ce que la carte de
    // l'astérisque ne peut plus porter — d'où vient cette notation — a été
    // déplacé dans le paragraphe, pas jeté.
    const APP = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
    assert.match(APP, /L'astérisque est celle du tableur/,
        'la provenance de l\'astérisque se dit encore quelque part');
});
