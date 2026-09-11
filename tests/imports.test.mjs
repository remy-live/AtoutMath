// LES CHEMINS QUI NE MÈNENT NULLE PART.
//
// Un `import { x } from '../core/access.js'` vers un fichier qui n'existe pas
// ne casse RIEN au chargement des tests : le module fautif n'est simplement
// jamais importé par eux. Il casse l'application, en silence, le jour où
// quelqu'un ouvre l'écran qui s'en sert — et l'on cherche alors la panne dans
// l'écran plutôt que dans une ligne d'en-tête.
//
// Ce test relit TOUS les fichiers du dossier `js` et vérifie trois choses que
// rien d'autre ne vérifie :
//
//   · chaque import relatif désigne un fichier qui existe ;
//   · chaque `href` et chaque `src` de la page désigne un fichier qui existe ;
//   · chaque entrée du service worker désigne un fichier qui existe — une
//     entrée fantôme fait échouer l'installation du cache ENTIER, donc le mode
//     hors ligne, et personne ne s'en aperçoit avant le train.
//
// Il a trouvé sa première panne le jour où il a été écrit.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const RACINE = new URL('..', import.meta.url).pathname;
const lire = (p) => readFileSync(join(RACINE, p), 'utf8');

function fichiersJs(dossier = 'js') {
    const out = [];
    const parcourir = (d) => readdirSync(join(RACINE, d), { withFileTypes: true }).forEach(e => {
        if (e.isDirectory()) parcourir(`${d}/${e.name}`);
        else if (e.name.endsWith('.js')) out.push(`${d}/${e.name}`);
    });
    parcourir(dossier);
    return out;
}

test('CHAQUE IMPORT DÉSIGNE UN FICHIER QUI EXISTE', () => {
    const casses = [];
    let total = 0;
    fichiersJs().forEach(f => {
        const src = lire(f);
        // `from '…'` et `import('…')` : le second est le chargement paresseux,
        // et c'est justement celui qu'aucun test n'exerce jamais.
        for (const m of src.matchAll(/(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g)) {
            total++;
            const cible = resolve(join(RACINE, dirname(f)), m[1]);
            if (!existsSync(cible)) casses.push(`${f} → ${m[1]}`);
        }
    });
    assert.ok(total > 500, `seulement ${total} imports relus : le balayage a raté quelque chose`);
    assert.deepEqual(casses, []);
});

test('la page ne réclame aucun fichier absent', () => {
    const html = lire('index.html');
    const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1])
        .filter(p => !/^(https?:|data:|#|mailto:)/.test(p))
        .map(p => p.split('?')[0]);
    assert.ok(refs.length > 5);
    assert.deepEqual([...new Set(refs)].filter(p => !existsSync(join(RACINE, p))), []);
});

test('LE CACHE HORS LIGNE NE LISTE QUE DES FICHIERS QUI EXISTENT', () => {
    // Une seule entrée fantôme et `cache.addAll()` rejette : le service worker
    // ne s'installe pas, et l'application ne fonctionne plus hors ligne — sans
    // le moindre message.
    const sw = lire('sw.js');
    const listes = [...sw.matchAll(/'\.\/([^']+?)(?:\?v=\d+)?'/g)].map(m => m[1]);
    assert.ok(listes.length > 5);
    assert.deepEqual([...new Set(listes)].filter(p => !existsSync(join(RACINE, p))), []);
});

test('la version des feuilles de style est la même partout', () => {
    // `?v=N` sur une feuille et `?v=N-1` sur une autre, et le navigateur sert
    // un mélange de deux versions : la moitié des correctifs paraissent perdus.
    const versions = new Set();
    ['index.html', 'sw.js'].forEach(f => {
        [...lire(f).matchAll(/\?v=(\d+)/g)].forEach(m => versions.add(m[1]));
    });
    assert.equal(versions.size, 1, `plusieurs versions en vol : ${[...versions].join(', ')}`);
});
