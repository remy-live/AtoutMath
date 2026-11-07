// AUCUN MODULE DE FICHE NE LIT UNE VALEUR QU'IL PEUT ATTENDRE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Les modules de l'impression forment un CERCLE, et c'est ancien :
//
//     fiches/socle.js → ficheRendu.js → printSheet.js → fiches/<un rendu>
//                    ↖──────────────────────────────────────────┘
//
// Un cercle d'imports ne casse rien par lui-même. Ce qui casse, c'est de LIRE
// une valeur du cercle PENDANT qu'il se referme : la variable est alors dans sa
// zone morte, et le module jette
//
//     ReferenceError: Cannot access 'X' before initialization
//
// ── CE QUE ÇA A COÛTÉ, ET POURQUOI UNE ÉPREUVE ────────────────────────────
//
// Tant que l'entrée du cercle est `printSheet.js` — ce qu'elle est dans
// l'application —, tout se referme dans le bon ordre et PERSONNE NE VOIT RIEN.
// La faute ne se réveille que lorsque l'entrée est un rendu : ce qu'une sonde
// fait naturellement, et ce qu'un module futur fera un jour.
//
// MESURÉ : une sonde qui importait `fiches/axes.js` sans passer par
// `printSheet.js` faisait tomber TOUT le sous-système d'impression. Le message
// désignait à chaque correction un fichier différent — `mots.js`, puis
// `socle.js`, puis `printSheet.js` — et jamais celui qui avait tort, parce que
// le fautif n'est aucun des trois : c'est le SENS d'une flèche d'import.
//
// Une épreuve qui charge chaque rendu EN PREMIER remet la sonde dans la même
// situation, en deux cents millisecondes et sans navigateur.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const FICHES = path.join(ICI, '..', 'js', 'ui', 'fiches');

/**
 * LE CODE SANS SES COMMENTAIRES.
 *
 * Ce dépôt explique chaque décision à l'endroit où elle se prend, donc le
 * commentaire qui interdit une ligne CITE cette ligne mot pour mot. Une garde
 * qui cherche le texte interdit dans le fichier entier trouve alors son propre
 * avertissement et rougit sur un fichier juste — ce qui est arrivé du premier
 * coup, et ce qui aurait fini par faire désactiver la garde.
 *
 * On ne cherche donc que dans ce qui s'exécute.
 */
const sansCommentaires = (src) => src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, '');
const lire = (...bouts) => sansCommentaires(fs.readFileSync(path.join(ICI, ...bouts), 'utf8'));

test('LE CATALOGUE DES RENDUS N\'EST PAS IMPORTÉ PAR CE QUI LE COMPOSE', () => {
    // `ficheRendu.js` a besoin de `RENDUS` — mais DANS DEUX FONCTIONS, donc
    // longtemps après le chargement. L'importer fermait le cercle au pire
    // endroit : `printSheet.js` devait être entièrement évalué depuis
    // l'intérieur de n'importe quel rendu. Une table qu'on DÉPOSE suffit.
    const src = lire('..', 'js', 'ui', 'ficheRendu.js');
    assert.doesNotMatch(src, /import\s*\{[^}]*\bRENDUS\b[^}]*\}\s*from\s*'\.\/printSheet\.js'/,
        'ficheRendu ne doit pas importer RENDUS : c\'est l\'arête à l\'envers du cercle');
    assert.match(src, /export function deposerLesRendus\(/,
        'il doit offrir le dépôt à la place');

    // ET QUELQU'UN DOIT DÉPOSER. Une table jamais remplie ne jette pas : elle
    // rend `undefined` pour chaque clé, et les blocs de grille disparaissent
    // de la feuille en silence — ce qui est exactement le défaut qu'on a mis
    // vingt minutes à trouver, à l'envers.
    const ps = lire('..', 'js', 'ui', 'printSheet.js');
    assert.match(ps, /deposerLesRendus\(RENDUS\)/,
        'printSheet doit déposer sa table dans ficheRendu');
});

test('L\'ENCRE VIT DANS UN MODULE SANS AUCUN IMPORT', () => {
    // C'est ce qui rend sûr le réflexe `const TRAIT = ENCRE.trait` en tête d'un
    // rendu : un module qui n'importe rien est évalué avant tous ceux qui le
    // demandent, et ne peut donc pas être « en cours » quand on le lit.
    const src = lire('..', 'js', 'ui', 'fiches', 'encre.js');
    assert.doesNotMatch(src, /^\s*import\s/m,
        'fiches/encre.js doit rester une FEUILLE : aucun import, jamais');
    assert.match(src, /export const ENCRE = \{/);
});

test('CHAQUE RENDU SE CHARGE SEUL, SANS PASSER PAR printSheet', async () => {
    // L'épreuve qui remet la sonde dans sa situation. Un module de `fiches/`
    // importé EN PREMIER doit s'évaluer sans jeter — c'est-à-dire sans lire
    // quoi que ce soit du cercle en train de se refermer.
    //
    // On les charge chacun dans un processus neuf : dans un seul, le premier
    // import peuple le graphe pour tous les suivants, et l'épreuve ne mesurerait
    // plus que le premier nom de la liste.
    //
    // VUE TOMBER, et pas par `epreuveTombe` : ce défaut-là ne se remet pas en
    // changeant UNE ligne d'UN fichier, puisqu'il demande qu'un cercle existe.
    // On a donc remis l'import à l'envers dans `ficheRendu.js` — la seule arête
    // qui referme le cercle — et relancé cette épreuve seule :
    //
    //     not ok 1 - CHAQUE RENDU SE CHARGE SEUL, SANS PASSER PAR printSheet
    //
    // Elle garde bien ce qu'elle prétend garder.
    const { execFileSync } = await import('node:child_process');
    const modules = fs.readdirSync(FICHES)
        .filter(f => f.endsWith('.js'))
        .sort();
    assert.ok(modules.length >= 8, `${modules.length} module(s) de fiche trouvés`);

    const fautifs = [];
    for (const m of modules) {
        const url = new URL(`../js/ui/fiches/${m}`, import.meta.url).href;
        try {
            // `--input-type=module` : on n'écrit pas de fichier temporaire.
            execFileSync(process.execPath,
                ['--input-type=module', '-e', `await import(${JSON.stringify(url)})`],
                { stdio: 'pipe', timeout: 20000 });
        } catch (e) {
            const sortie = String(e.stderr || e.message);
            // `document is not defined` et consorts : un module de fiche a le
            // droit d'avoir besoin d'un navigateur. Ce qu'il n'a pas le droit
            // d'avoir, c'est une zone morte.
            if (/before initialization/.test(sortie)) {
                fautifs.push(`${m} — ${sortie.split('\n').find(l => /before init/.test(l)).trim()}`);
            }
        }
    }
    assert.deepEqual(fautifs, [],
        'un rendu chargé en premier jette sur une valeur encore en zone morte');
});
