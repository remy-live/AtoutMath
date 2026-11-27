// LA BARRE D'AIDE PREND LA SESSION, PAS LA QUESTION.
//
// Rémy, 27 novembre : « il n'y a pas d'aide pour l'écriture scientifique en
// deux étapes ». Les indices existaient — trois par question —, mais l'écran
// appelait `hintBar(item)` : une question n'a pas de `hintsAvailable`, la barre
// rendait donc une chaîne vide, sans erreur. MESURÉ au navigateur : zéro bouton
// « Un indice » sur quatre écrans écrits de la même façon (deux temps, « Par
// combien ? », le produit de fractions posé, la mosaïque) ; un après.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { sansCommentaires } from './helpers.mjs';

const DOSSIER = new URL('../js/core/activities/', import.meta.url);

test('TOUT ÉCRAN QUI POSE LA BARRE D\'AIDE LUI DONNE LA SESSION', () => {
    const fautes = [];
    let vus = 0;
    for (const f of fs.readdirSync(DOSSIER).filter(n => n.endsWith('.js'))) {
        const src = sansCommentaires(fs.readFileSync(new URL(f, DOSSIER), 'utf8'));
        for (const m of src.matchAll(/\b(hintBar|wireHint)\(([^)]*)\)/g)) {
            if (/export function/.test(src.slice(Math.max(0, m.index - 16), m.index))) continue;
            vus++;
            const args = m[2].split(',').map(a => a.trim());
            const bon = m[1] === 'hintBar' ? args[0] === 'session' : args[1] === 'session';
            if (!bon) fautes.push(`${path.basename(f)} : ${m[0]}`);
        }
    }
    assert.ok(vus > 20, `seulement ${vus} appels trouvés : la recherche ne voit plus rien`);
    assert.deepEqual(fautes, [], 'la barre d\'aide reçoit autre chose que la session : elle restera vide');
});
