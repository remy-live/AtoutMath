// LE DÉFI NE COMPTE QU'UNE RÉPONSE PAR QUESTION.
//
// Rémy, 27 novembre : « si on clique deux fois sur la bonne réponse on a deux
// points ». Le chemin de l'élève (un vrai double clic) est gardé par
// `node tools/defiDoubleClic.mjs` ; ce fichier garde le verrou dans la source.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sansCommentaires } from './helpers.mjs';

const SRC = sansCommentaires(fs.readFileSync(new URL('../js/ui/defiUI.js', import.meta.url), 'utf8'));

test('« repondre » SE FERME AU PREMIER APPUI, AVANT DE COMPTER', () => {
    const debut = SRC.indexOf('const repondre = (juste) => {');
    assert.ok(debut > 0, 'repondre introuvable');
    const corps = SRC.slice(debut, SRC.indexOf('\n        };', debut));
    const garde = corps.search(/if \(fini \|\| repondu\) return;/);
    const pose = corps.indexOf('repondu = true;');
    const compte = corps.indexOf('total++');
    assert.ok(garde > 0, 'repondre ne regarde plus si la question a déjà reçu sa réponse');
    assert.ok(pose > garde && pose < compte, 'le verrou doit se poser AVANT de compter le point');
    // Le verrou vit DANS la question : déclaré une fois pour tout le défi, il
    // bloquerait toutes les questions après la première.
    const avant = SRC.slice(Math.max(0, debut - 200), debut);
    assert.match(avant, /let repondu = false;\s*$/, 'le verrou doit être neuf à chaque question');
});
