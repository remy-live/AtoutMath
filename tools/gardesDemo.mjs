// L'ÉCHAFAUDAGE DES DÉMONSTRATIONS, MESURÉ — pour que la dette ne revienne pas
// en silence.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// POURQUOI CET OUTIL EXISTE, ET IL A ÉTÉ PAYÉ CHER.
//
// La migration des 674 gardes vers `core/meneurDemo.js` a cassé cinq fichiers,
// et AUCUN harnais ne l'a vu :
//
//   · `node --check` passe — `robot.tour()` est une expression parfaitement
//     valide, même quand `robot` n'existe nulle part ;
//   · `npm test` passe — 4 641 épreuves, aucune n'ouvre une démonstration ;
//   · la seule chose qui l'a vu est `tools/robotsMuets.mjs`, qui ouvre les
//     222 robots dans un vrai navigateur : **19 erreurs de page contre 0 avant**.
//     Trente-cinq minutes de mesure.
//
// LA CAUSE était bête et elle se voit à la lecture : un fichier peut avoir
// DEUX fonctions de démonstration, et la migration n'a déclaré le meneur que
// dans la première tout en réécrivant les gardes des deux. Les secondes
// lisaient un `robot` hors de leur portée.
//
// TRENTE-CINQ MINUTES POUR UNE QUESTION QUI SE LIT DANS LA SOURCE. C'est
// exactement la friction qu'on note et qu'on ferme : cet outil répond en deux
// cents millisecondes, et `tests/gardesDemo.test.mjs` l'appelle à chaque
// `npm test`.
//
//   node tools/gardesDemo.mjs             # le compte, et les défauts
//   node tools/gardesDemo.mjs --compte    # juste les chiffres
//
// IL NE REMPLACE PAS LE NAVIGATEUR. Il dit qu'une garde est bien branchée ; il
// ne dit pas qu'une démonstration explique quelque chose. `robotsMuets.mjs`
// reste le juge de cela.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const COMPTE = process.argv.includes('--compte');

export function fichiersJs(racine = 'js') {
    const out = [];
    (function marcher(d) {
        for (const f of readdirSync(d)) {
            const p = join(d, f);
            if (statSync(p).isDirectory()) marcher(p);
            else if (f.endsWith('.js')) out.push(p);
        }
    })(racine);
    return out;
}

/**
 * LES LIGNES COUVERTES PAR UN `const robot = …`, par comptage d'accolades.
 *
 * On remonte jusqu'à l'ouverture du bloc qui contient la déclaration, puis on
 * redescend jusqu'à sa fermeture. C'est grossier — une accolade dans une chaîne
 * ou un commentaire fausse le compte — mais TOUJOURS DU BON CÔTÉ : au pire on
 * couvre trop, donc on signale trop peu de suspects, jamais un faux coupable.
 * Et comme chaque suspect est NOMMÉ avec son fichier et sa ligne, on le relit.
 */
function porteeDesMeneurs(lignes) {
    const couvertes = new Set();
    lignes.forEach((l, i) => {
        if (!/^\s*const robot = meneurDemo\(/.test(l)) return;
        let niveau = 0, debut = i;
        for (let j = i; j >= 0; j--) {
            for (const c of [...lignes[j]].reverse()) {
                if (c === '}') niveau++;
                else if (c === '{') { if (niveau === 0) { debut = j; j = -1; break; } niveau--; }
            }
        }
        niveau = 0;
        for (let j = debut; j < lignes.length; j++) {
            for (const c of lignes[j]) {
                if (c === '{') niveau++;
                else if (c === '}') niveau--;
            }
            couvertes.add(j);
            if (niveau === 0 && j > debut) break;
        }
    });
    return couvertes;
}

/** L'ancienne forme : le pointeur ou la barre appelés sans passer par le meneur. */
const ANCIENNE = /if \(!await (cur|cursor|curseur|gate|barre)\??\.[a-zA-Z]+\(/;

/**
 * UNE VARIABLE LUE DANS SA ZONE MORTE.
 *
 * `const robot = meneurDemo(cur, gate, vivant, …)` posé AVANT
 * `const vivant = () => …` : `const` n'est pas remonté, et la démonstration
 * meurt sur « Cannot access 'vivant' before initialization ».
 *
 * Mesuré dans `js/games/tetris.js` : UNE démonstration sur 223, et seul le
 * navigateur l'a vue. C'est la même famille que le meneur hors de portée —
 * `node --check` passe, l'erreur est à l'exécution — donc la même réponse :
 * on la lit dans la source.
 *
 * On ne regarde que les identifiants NUS passés en troisième argument : une
 * fonction fléchée écrite sur place (`() => this.isRunning`) ne peut pas être
 * dans sa zone morte.
 */
function zoneMorte(lignes) {
    const fautifs = [];
    lignes.forEach((l, i) => {
        const m = /const robot = meneurDemo\([^,]+,\s*[^,]+,\s*([A-Za-z_$][\w$]*)\s*[,)]/.exec(l);
        if (!m) return;
        const nom = m[1];
        if (nom === 'null' || nom === 'undefined') return;
        const declaree = lignes.findIndex(x =>
            new RegExp(`(const|let|var|function)\\s+${nom}\\b`).test(x));
        if (declaree > i) fautifs.push({ ligne: i + 1, nom, declaree: declaree + 1 });
    });
    return fautifs;
}

export function mesurerGardesDemo() {
    const pas = new Map();
    const horsPortee = [];
    const anciennes = [];
    const zonesMortes = [];
    let fichiers = 0;

    for (const p of fichiersJs('js')) {
        // Le meneur lui-même CITE l'ancienne forme dans son en-tête, pour
        // expliquer ce qu'il remplace. Un outil qui s'accuserait lui-même de ce
        // qu'il documente serait bruyant et finirait ignoré.
        if (p.endsWith('meneurDemo.js')) continue;
        const src = readFileSync(p, 'utf8');
        if (!/\brobot\.[a-z]|if \(!await (cur|cursor|curseur|gate|barre)/.test(src)) continue;
        fichiers++;
        const lignes = src.split('\n');
        const couvertes = porteeDesMeneurs(lignes);
        zoneMorte(lignes).forEach(z => zonesMortes.push({ fichier: p, ...z }));

        lignes.forEach((l, i) => {
            if (/^\s*(\/\/|\*|\/\*)/.test(l)) return;    // un commentaire n'exécute rien
            const m = /if \(!await robot\.([a-zA-Z]+)\(/.exec(l);
            if (m) pas.set(m[1], (pas.get(m[1]) || 0) + 1);
            if (/\brobot\.[a-z]/.test(l) && !couvertes.has(i)) {
                horsPortee.push({ fichier: p, ligne: i + 1, texte: l.trim() });
            }
            // `demoPointer.js` est le pointeur : ses propres `await this.moveTo`
            // ne sont pas des gardes de démonstration.
            if (!p.endsWith('demoPointer.js') && ANCIENNE.test(l)) {
                anciennes.push({ fichier: p, ligne: i + 1, texte: l.trim() });
            }
        });
    }
    return { pas, horsPortee, anciennes, zonesMortes, fichiers };
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const { pas, horsPortee, anciennes, zonesMortes, fichiers } = mesurerGardesDemo();
    const total = [...pas.values()].reduce((a, b) => a + b, 0);

    console.log(`${total} gardes de démonstration dans ${fichiers} fichiers`);
    if (!COMPTE) {
        [...pas].sort((a, b) => b[1] - a[1])
            .forEach(([nom, n]) => console.log(`  ${String(n).padStart(4)}  robot.${nom}()`));
    }

    if (horsPortee.length) {
        console.log(`\n\x1b[31m${horsPortee.length} garde(s) LISENT UN MENEUR HORS DE LEUR PORTÉE\x1b[0m`);
        console.log('C\'est une ReferenceError à l\'exécution — pas au chargement. La démonstration');
        console.log('meurt à son premier pas, et rien d\'autre ne le dit.');
        horsPortee.slice(0, 20).forEach(h => console.log(`  ${h.fichier}:${h.ligne}  ${h.texte.slice(0, 64)}`));
    }
    if (anciennes.length) {
        console.log(`\n\x1b[33m${anciennes.length} garde(s) de l'ancienne forme\x1b[0m`);
        console.log('Elles marchent, mais elles refont à la main ce que le meneur porte :');
        console.log('la vie du jeu, et le rangement qui ne doit se faire qu\'une fois.');
        anciennes.slice(0, 20).forEach(a => console.log(`  ${a.fichier}:${a.ligne}  ${a.texte.slice(0, 64)}`));
    }

    if (zonesMortes.length) {
        console.log(`\n\x1b[31m${zonesMortes.length} meneur(s) lisent une variable AVANT sa déclaration\x1b[0m`);
        console.log('Une declaration const n\'est pas remontee : la demonstration meurt sur');
        console.log('« Cannot access … before initialization », et seulement à l\'exécution.');
        zonesMortes.forEach(z => console.log(
            `  ${z.fichier}:${z.ligne}  « ${z.nom} » est déclaré ligne ${z.declaree}`));
    }

    if (!horsPortee.length && !anciennes.length && !zonesMortes.length) {
        console.log('\n\x1b[32mToutes les gardes passent par le meneur, et toutes sont dans sa portée.\x1b[0m');
    }
    process.exit(horsPortee.length || zonesMortes.length ? 1 : 0);
}
